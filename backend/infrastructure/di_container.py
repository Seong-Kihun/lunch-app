#!/usr/bin/env python3
"""
의존성 주입 컨테이너
서비스와 Repository 간의 의존성을 관리합니다.
"""

from typing import Any, TypeVar
import threading

T = TypeVar('T')


class DIContainer:
    """의존성 주입 컨테이너"""

    def __init__(self):
        self._services: dict[str, Any] = {}
        self._factories: dict[str, callable] = {}
        self._singletons: dict[str, Any] = {}
        self._thread_local = threading.local()

    def register_singleton(self, interface: str, implementation: Any) -> None:
        """싱글톤 서비스 등록"""
        self._services[interface] = implementation
        self._singletons[interface] = implementation

    def register_factory(self, interface: str, factory: callable) -> None:
        """팩토리 서비스 등록"""
        self._factories[interface] = factory

    def register_instance(self, interface: str, instance: Any) -> None:
        """인스턴스 서비스 등록"""
        self._services[interface] = instance

    def get(self, interface: str) -> Any:
        """서비스 조회"""
        # 1. 이미 등록된 인스턴스 확인
        if interface in self._services:
            return self._services[interface]

        # 2. 팩토리로 생성
        if interface in self._factories:
            instance = self._factories[interface]()
            self._services[interface] = instance
            return instance

        raise ValueError(f"Service not registered: {interface}")

    def get_singleton(self, interface: str) -> Any:
        """싱글톤 서비스 조회"""
        if interface in self._singletons:
            return self._singletons[interface]

        if interface in self._factories:
            instance = self._factories[interface]()
            self._singletons[interface] = instance
            return instance

        raise ValueError(f"Singleton service not registered: {interface}")

    def get_scoped(self, interface: str) -> Any:
        """스코프 서비스 조회 (요청당 하나의 인스턴스)"""
        # 스레드 로컬 저장소 사용
        if not hasattr(self._thread_local, 'scoped_services'):
            self._thread_local.scoped_services = {}

        if interface in self._thread_local.scoped_services:
            return self._thread_local.scoped_services[interface]

        if interface in self._factories:
            instance = self._factories[interface]()
            self._thread_local.scoped_services[interface] = instance
            return instance

        raise ValueError(f"Scoped service not registered: {interface}")

    def clear_scoped(self) -> None:
        """스코프 서비스 정리"""
        if hasattr(self._thread_local, 'scoped_services'):
            self._thread_local.scoped_services.clear()

    def is_registered(self, interface: str) -> bool:
        """서비스 등록 여부 확인"""
        return interface in self._services or interface in self._factories

    def unregister(self, interface: str) -> None:
        """서비스 등록 해제"""
        self._services.pop(interface, None)
        self._factories.pop(interface, None)
        self._singletons.pop(interface, None)

        if hasattr(self._thread_local, 'scoped_services'):
            self._thread_local.scoped_services.pop(interface, None)


class ServiceProvider:
    """서비스 제공자 인터페이스"""

    def get_service(self, service_type: type[T]) -> T:
        """서비스 조회"""
        ...


class ContainerServiceProvider(ServiceProvider):
    """컨테이너 기반 서비스 제공자"""

    def __init__(self, container: DIContainer):
        self._container = container

    def get_service(self, service_type: type[T]) -> T:
        """서비스 조회"""
        return self._container.get(service_type.__name__)


# 전역 DI 컨테이너
_container = DIContainer()


def get_container() -> DIContainer:
    """전역 DI 컨테이너 반환"""
    return _container


def configure_services() -> None:
    """서비스 구성"""
    from backend.infrastructure.unit_of_work_impl import (
        SQLUnitOfWorkFactory, SQLTransactionManager
    )
    from backend.infrastructure.infrastructure_repositories import (
        SQLPartyRepository, SQLUserRepository, SQLPartyMemberRepository
    )
    from backend.application.services import PartyService, UserService
    from backend.infrastructure.mappers import mapper_registry

    # Unit of Work 팩토리 등록
    _container.register_singleton(
        'UnitOfWorkFactory',
        SQLUnitOfWorkFactory()
    )

    # 트랜잭션 매니저 등록
    _container.register_singleton(
        'TransactionManager',
        SQLTransactionManager()
    )

    # Repository 팩토리 등록
    def create_party_repository():
        from backend.app.extensions import db
        return SQLPartyRepository(db.session)

    def create_user_repository():
        from backend.app.extensions import db
        return SQLUserRepository(db.session)

    def create_party_member_repository():
        from backend.app.extensions import db
        return SQLPartyMemberRepository(db.session)

    _container.register_factory('PartyRepository', create_party_repository)
    _container.register_factory('UserRepository', create_user_repository)
    _container.register_factory('PartyMemberRepository', create_party_member_repository)

    # Service 팩토리 등록
    def create_party_service():
        uow = _container.get_singleton('UnitOfWorkFactory').create()
        return PartyService(uow)

    def create_user_service():
        uow = _container.get_singleton('UnitOfWorkFactory').create()
        return UserService(uow)

    _container.register_factory('PartyService', create_party_service)
    _container.register_factory('UserService', create_user_service)

    # 매퍼 레지스트리 등록
    _container.register_singleton('MapperRegistry', mapper_registry)


# 편의 함수들
def get_service(service_type: type[T]) -> T:
    """서비스 조회 헬퍼 함수"""
    return _container.get(service_type.__name__)


def get_singleton(service_type: type[T]) -> T:
    """싱글톤 서비스 조회 헬퍼 함수"""
    return _container.get_singleton(service_type.__name__)


def get_scoped(service_type: type[T]) -> T:
    """스코프 서비스 조회 헬퍼 함수"""
    return _container.get_scoped(service_type.__name__)


def register_service(service_type: type[T], instance: T) -> None:
    """서비스 등록 헬퍼 함수"""
    _container.register_instance(service_type.__name__, instance)


def register_factory(service_type: type[T], factory: callable) -> None:
    """팩토리 등록 헬퍼 함수"""
    _container.register_factory(service_type.__name__, factory)


# 데코레이터를 이용한 의존성 주입
def inject(service_type: type[T]):
    """의존성 주입 데코레이터"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            service = get_service(service_type)
            return func(service, *args, **kwargs)
        return wrapper
    return decorator


# 컨텍스트 매니저를 이용한 스코프 관리
class ServiceScope:
    """서비스 스코프 컨텍스트 매니저"""

    def __init__(self, container: DIContainer):
        self._container = container

    def __enter__(self):
        return self._container

    def __exit__(self, exc_type, exc_val, exc_tb):
        self._container.clear_scoped()


def get_service_scope() -> ServiceScope:
    """서비스 스코프 반환"""
    return ServiceScope(_container)


# 애플리케이션 시작 시 서비스 구성
def initialize_di_container() -> None:
    """DI 컨테이너 초기화"""
    configure_services()


# 테스트용 헬퍼
class TestDIContainer(DIContainer):
    """테스트용 DI 컨테이너"""

    def register_mock(self, interface: str, mock_instance: Any) -> None:
        """모크 서비스 등록"""
        self.register_instance(interface, mock_instance)

    def reset(self) -> None:
        """컨테이너 리셋"""
        self._services.clear()
        self._factories.clear()
        self._singletons.clear()
        self.clear_scoped()


def get_test_container() -> TestDIContainer:
    """테스트용 DI 컨테이너 반환"""
    return TestDIContainer()


if __name__ == "__main__":
    # DI 컨테이너 사용 예시
    initialize_di_container()

    # 서비스 조회
    party_service = get_service(PartyService)
    user_service = get_service(UserService)

    print("DI 컨테이너 초기화 완료")
    print(f"PartyService: {party_service}")
    print(f"UserService: {user_service}")
