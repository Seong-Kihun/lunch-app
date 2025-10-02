#!/usr/bin/env python3
"""
Unit of Work 패턴 구현
트랜잭션 경계를 명확히 관리하고 여러 Repository 작업을 하나의 트랜잭션으로 묶습니다.
"""

from typing import Protocol, TypeVar, Any
from contextlib import contextmanager

T = TypeVar('T')

class UnitOfWork(Protocol):
    """Unit of Work 인터페이스 - 트랜잭션 경계 관리"""

    @property
    def parties(self):
        """파티 저장소"""
        ...

    @property
    def users(self):
        """사용자 저장소"""
        ...

    @property
    def party_members(self):
        """파티 멤버 저장소"""
        ...

    def __enter__(self) -> 'UnitOfWork':
        """컨텍스트 매니저 진입 - 트랜잭션 시작"""
        ...

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        """컨텍스트 매니저 종료 - 트랜잭션 커밋/롤백"""
        ...

    def commit(self) -> None:
        """트랜잭션 커밋"""
        ...

    def rollback(self) -> None:
        """트랜잭션 롤백"""
        ...

    def flush(self) -> None:
        """트랜잭션 플러시 (커밋 없이 DB에 반영)"""
        ...


class UnitOfWorkFactory(Protocol):
    """Unit of Work 팩토리 인터페이스"""

    def create(self) -> UnitOfWork:
        """새로운 Unit of Work 인스턴스 생성"""
        ...


class TransactionManager:
    """트랜잭션 매니저 - 트랜잭션 상태 관리"""

    def __init__(self):
        self._active_transactions = 0
        self._transaction_stack = []

    @contextmanager
    def transaction(self):
        """트랜잭션 컨텍스트 매니저"""
        self.begin()
        try:
            yield
            self.commit()
        except Exception:
            self.rollback()
            raise
        finally:
            self.end()

    def begin(self) -> None:
        """트랜잭션 시작"""
        self._active_transactions += 1
        self._transaction_stack.append({
            'level': self._active_transactions,
            'started_at': self._get_current_time()
        })

    def commit(self) -> None:
        """트랜잭션 커밋"""
        if self._active_transactions == 0:
            raise RuntimeError("활성화된 트랜잭션이 없습니다")

        if self._transaction_stack:
            self._transaction_stack.pop()

        self._active_transactions = max(0, self._active_transactions - 1)

    def rollback(self) -> None:
        """트랜잭션 롤백"""
        if self._active_transactions == 0:
            raise RuntimeError("활성화된 트랜잭션이 없습니다")

        if self._transaction_stack:
            self._transaction_stack.pop()

        self._active_transactions = max(0, self._active_transactions - 1)

    def end(self) -> None:
        """트랜잭션 종료"""
        self._active_transactions = max(0, self._active_transactions - 1)
        if self._transaction_stack:
            self._transaction_stack.pop()

    def is_active(self) -> bool:
        """활성화된 트랜잭션이 있는지 확인"""
        return self._active_transactions > 0

    def get_transaction_level(self) -> int:
        """현재 트랜잭션 레벨 반환"""
        return self._active_transactions

    def _get_current_time(self) -> float:
        """현재 시간 반환 (테스트용)"""
        import time
        return time.time()


class UnitOfWorkBase:
    """Unit of Work 기본 구현 클래스"""

    def __init__(self, transaction_manager: TransactionManager):
        self._transaction_manager = transaction_manager
        self._repositories = {}
        self._is_committed = False
        self._is_rolled_back = False

    def __enter__(self) -> 'UnitOfWorkBase':
        """컨텍스트 매니저 진입"""
        self._transaction_manager.begin()
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        """컨텍스트 매니저 종료"""
        try:
            if exc_type is None and not self._is_rolled_back:
                self.commit()
            elif exc_type is not None:
                self.rollback()
        finally:
            self._transaction_manager.end()

    def commit(self) -> None:
        """트랜잭션 커밋"""
        if self._is_committed:
            raise RuntimeError("이미 커밋된 트랜잭션입니다")

        if self._is_rolled_back:
            raise RuntimeError("롤백된 트랜잭션은 커밋할 수 없습니다")

        self._do_commit()
        self._is_committed = True

    def rollback(self) -> None:
        """트랜잭션 롤백"""
        if self._is_committed:
            raise RuntimeError("이미 커밋된 트랜잭션은 롤백할 수 없습니다")

        if self._is_rolled_back:
            return  # 이미 롤백됨

        self._do_rollback()
        self._is_rolled_back = True

    def flush(self) -> None:
        """트랜잭션 플러시"""
        if self._is_committed or self._is_rolled_back:
            raise RuntimeError("완료된 트랜잭션은 플러시할 수 없습니다")

        self._do_flush()

    def _do_commit(self) -> None:
        """실제 커밋 로직 - 하위 클래스에서 구현"""
        raise NotImplementedError("하위 클래스에서 구현해야 합니다")

    def _do_rollback(self) -> None:
        """실제 롤백 로직 - 하위 클래스에서 구현"""
        raise NotImplementedError("하위 클래스에서 구현해야 합니다")

    def _do_flush(self) -> None:
        """실제 플러시 로직 - 하위 클래스에서 구현"""
        raise NotImplementedError("하위 클래스에서 구현해야 합니다")

    def is_committed(self) -> bool:
        """커밋되었는지 확인"""
        return self._is_committed

    def is_rolled_back(self) -> bool:
        """롤백되었는지 확인"""
        return self._is_rolled_back

    def is_active(self) -> bool:
        """활성화된 트랜잭션인지 확인"""
        return not self._is_committed and not self._is_rolled_back


class UnitOfWorkError(Exception):
    """Unit of Work 관련 예외"""
    pass


class TransactionAlreadyCommittedError(UnitOfWorkError):
    """이미 커밋된 트랜잭션 예외"""
    pass


class TransactionAlreadyRolledBackError(UnitOfWorkError):
    """이미 롤백된 트랜잭션 예외"""
    pass


class NoActiveTransactionError(UnitOfWorkError):
    """활성화된 트랜잭션이 없는 예외"""
    pass
