#!/usr/bin/env python3
"""
SQL 기반 Unit of Work 구현
Flask-SQLAlchemy를 사용한 실제 Unit of Work 구현체입니다.
"""

from typing import Any
from contextlib import contextmanager
from backend.application.unit_of_work import (
    UnitOfWork, UnitOfWorkBase, TransactionManager
)
from backend.application.repositories import PartyRepository, UserRepository, PartyMemberRepository
from backend.infrastructure.repositories import SQLPartyRepository, SQLUserRepository, SQLPartyMemberRepository
from backend.app.extensions import db
# import structlog
# logger = structlog.get_logger()

# 임시 로거 (structlog 설치 후 교체)
import logging
logger = logging.getLogger(__name__)


class SQLTransactionManager(TransactionManager):
    """SQL 기반 트랜잭션 매니저"""

    def __init__(self):
        super().__init__()
        self._db_session = db.session

    def begin(self) -> None:
        """SQL 트랜잭션 시작"""
        super().begin()
        logger.debug("SQL 트랜잭션 시작", level=self.get_transaction_level())

    def commit(self) -> None:
        """SQL 트랜잭션 커밋"""
        super().commit()
        if self._active_transactions == 0:
            self._db_session.commit()
            logger.debug("SQL 트랜잭션 커밋 완료")

    def rollback(self) -> None:
        """SQL 트랜잭션 롤백"""
        super().rollback()
        if self._active_transactions == 0:
            self._db_session.rollback()
            logger.debug("SQL 트랜잭션 롤백 완료")

    def end(self) -> None:
        """SQL 트랜잭션 종료"""
        super().end()
        if self._active_transactions == 0:
            self._db_session.close()
            logger.debug("SQL 세션 종료")


class SQLUnitOfWork(UnitOfWorkBase):
    """SQL 기반 Unit of Work 구현"""

    def __init__(self, transaction_manager: SQLTransactionManager | None = None):
        if transaction_manager is None:
            transaction_manager = SQLTransactionManager()

        super().__init__(transaction_manager)
        self._transaction_manager: SQLTransactionManager = transaction_manager
        self._parties: PartyRepository | None = None
        self._users: UserRepository | None = None
        self._party_members: PartyMemberRepository | None = None

    @property
    def parties(self) -> PartyRepository:
        """파티 저장소 반환"""
        if self._parties is None:
            self._parties = SQLPartyRepository(self._transaction_manager._db_session)
        return self._parties

    @property
    def users(self) -> UserRepository:
        """사용자 저장소 반환"""
        if self._users is None:
            self._users = SQLUserRepository(self._transaction_manager._db_session)
        return self._users

    @property
    def party_members(self) -> PartyMemberRepository:
        """파티 멤버 저장소 반환"""
        if self._party_members is None:
            self._party_members = SQLPartyMemberRepository(self._transaction_manager._db_session)
        return self._party_members

    def _do_commit(self) -> None:
        """실제 SQL 커밋 수행"""
        try:
            self._transaction_manager._db_session.commit()
            logger.info("Unit of Work 커밋 성공")
        except Exception as e:
            logger.error("Unit of Work 커밋 실패", error=str(e))
            self._transaction_manager._db_session.rollback()
            raise

    def _do_rollback(self) -> None:
        """실제 SQL 롤백 수행"""
        try:
            self._transaction_manager._db_session.rollback()
            logger.info("Unit of Work 롤백 성공")
        except Exception as e:
            logger.error("Unit of Work 롤백 실패", error=str(e))
            raise

    def _do_flush(self) -> None:
        """실제 SQL 플러시 수행"""
        try:
            self._transaction_manager._db_session.flush()
            logger.debug("Unit of Work 플러시 성공")
        except Exception as e:
            logger.error("Unit of Work 플러시 실패", error=str(e))
            raise

    def get_session_stats(self) -> dict[str, Any]:
        """세션 통계 정보 반환"""
        session = self._transaction_manager._db_session

        return {
            'is_active': self.is_active(),
            'is_committed': self.is_committed(),
            'is_rolled_back': self.is_rolled_back(),
            'transaction_level': self._transaction_manager.get_transaction_level(),
            'session_dirty': len(session.dirty),
            'session_new': len(session.new),
            'session_deleted': len(session.deleted),
        }


class SQLUnitOfWorkFactory:
    """SQL Unit of Work 팩토리"""

    def __init__(self, transaction_manager: SQLTransactionManager | None = None):
        self._transaction_manager = transaction_manager

    def create(self) -> SQLUnitOfWork:
        """새로운 SQL Unit of Work 인스턴스 생성"""
        return SQLUnitOfWork(self._transaction_manager)

    def create_with_new_transaction(self) -> SQLUnitOfWork:
        """새로운 트랜잭션으로 Unit of Work 생성"""
        new_transaction_manager = SQLTransactionManager()
        return SQLUnitOfWork(new_transaction_manager)


# 전역 팩토리 인스턴스
unit_of_work_factory = SQLUnitOfWorkFactory()


def get_unit_of_work() -> UnitOfWork:
    """Unit of Work 인스턴스 반환"""
    return unit_of_work_factory.create()


def get_unit_of_work_with_new_transaction() -> UnitOfWork:
    """새로운 트랜잭션으로 Unit of Work 인스턴스 반환"""
    return unit_of_work_factory.create_with_new_transaction()


# 편의 함수들
@contextmanager
def transaction():
    """트랜잭션 컨텍스트 매니저"""
    uow = get_unit_of_work_with_new_transaction()
    with uow:
        yield uow


@contextmanager
def read_only_transaction():
    """읽기 전용 트랜잭션 컨텍스트 매니저"""
    uow = get_unit_of_work_with_new_transaction()
    with uow:
        # 읽기 전용 트랜잭션은 자동으로 롤백
        try:
            yield uow
        finally:
            if not uow.is_committed():
                uow.rollback()


# 테스트용 헬퍼 함수들
class TestUnitOfWork(SQLUnitOfWork):
    """테스트용 Unit of Work - 실제 커밋하지 않음"""

    def _do_commit(self) -> None:
        """테스트에서는 실제 커밋하지 않음"""
        logger.debug("테스트 모드: 실제 커밋 건너뜀")
        # 테스트에서는 flush만 수행
        self._do_flush()

    def _do_rollback(self) -> None:
        """테스트에서는 실제 롤백하지 않음"""
        logger.debug("테스트 모드: 실제 롤백 건너뜀")


def get_test_unit_of_work() -> TestUnitOfWork:
    """테스트용 Unit of Work 반환"""
    test_transaction_manager = SQLTransactionManager()
    return TestUnitOfWork(test_transaction_manager)


if __name__ == "__main__":
    # Unit of Work 사용 예시
    with transaction() as uow:
        # 여러 Repository 작업을 하나의 트랜잭션으로 처리
        user = uow.users.find_by_employee_id("EMP001")
        if user:
            # 파티 생성 로직
            # party = uow.parties.save(party_data)
            pass

        # 자동으로 커밋됨 (예외 발생 시 롤백)
