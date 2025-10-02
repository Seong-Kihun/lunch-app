#!/usr/bin/env python3
"""
Repository 인터페이스 정의
도메인 엔티티만 반환하며 인프라 계층의 구현 세부사항을 숨깁니다.
"""

from typing import Optional, Protocol, Any
from datetime import datetime, date

from backend.core.entities import Party


class PartyRepository(Protocol):
    """파티 저장소 인터페이스 - 도메인 엔티티만 반환"""

    def save(self, party: Party) -> Party:
        """파티 저장"""
        ...

    def find_by_id(self, party_id: int) -> Party | None:
        """ID로 파티 조회"""
        ...

    def find_by_host(self, host_user_id: int) -> list[Party]:
        """호스트별 파티 조회"""
        ...

    def find_upcoming(self, limit: int = 10) -> list[Party]:
        """다가오는 파티 조회"""
        ...

    def find_by_date_range(self, start_date: date, end_date: date) -> list[Party]:
        """날짜 범위로 파티 조회"""
        ...

    def find_by_restaurant(self, restaurant_name: str) -> list[Party]:
        """식당별 파티 조회"""
        ...

    def find_available_parties(self, user_id: int, limit: int = 10) -> list[Party]:
        """참가 가능한 파티 조회"""
        ...

    def delete(self, party_id: int) -> bool:
        """파티 삭제"""
        ...

    def count_by_host(self, host_user_id: int) -> int:
        """호스트별 파티 수 조회"""
        ...

    def exists(self, party_id: int) -> bool:
        """파티 존재 여부 확인"""
        ...


class UserRepository(Protocol):
    """사용자 저장소 인터페이스"""

    def save(self, user: 'User') -> 'User':
        """사용자 저장"""
        ...

    def find_by_id(self, user_id: int) -> Optional['User']:
        """ID로 사용자 조회"""
        ...

    def find_by_employee_id(self, employee_id: str) -> Optional['User']:
        """직원 ID로 사용자 조회"""
        ...

    def find_by_email(self, email: str) -> Optional['User']:
        """이메일로 사용자 조회"""
        ...

    def find_active_users(self, limit: int = 100) -> list['User']:
        """활성 사용자 조회"""
        ...

    def find_by_nickname(self, nickname: str) -> list['User']:
        """닉네임으로 사용자 조회"""
        ...

    def delete(self, user_id: int) -> bool:
        """사용자 삭제"""
        ...

    def exists(self, user_id: int) -> bool:
        """사용자 존재 여부 확인"""
        ...

    def count_active_users(self) -> int:
        """활성 사용자 수 조회"""
        ...


class PartyMemberRepository(Protocol):
    """파티 멤버 저장소 인터페이스"""

    def save(self, party_member: 'PartyMember') -> 'PartyMember':
        """파티 멤버 저장"""
        ...

    def find_by_party(self, party_id: int) -> list['PartyMember']:
        """파티별 멤버 조회"""
        ...

    def find_by_user(self, user_id: int) -> list['PartyMember']:
        """사용자별 참가 파티 조회"""
        ...

    def find_by_party_and_user(self, party_id: int, user_id: int) -> Optional['PartyMember']:
        """특정 파티의 특정 사용자 멤버십 조회"""
        ...

    def delete(self, party_id: int, user_id: int) -> bool:
        """파티 멤버 삭제 (탈퇴)"""
        ...

    def count_by_party(self, party_id: int) -> int:
        """파티별 멤버 수 조회"""
        ...

    def is_member(self, party_id: int, user_id: int) -> bool:
        """파티 멤버 여부 확인"""
        ...


class RestaurantRepository(Protocol):
    """식당 저장소 인터페이스"""

    def save(self, restaurant: 'Restaurant') -> 'Restaurant':
        """식당 저장"""
        ...

    def find_by_id(self, restaurant_id: int) -> Optional['Restaurant']:
        """ID로 식당 조회"""
        ...

    def find_by_name(self, name: str) -> list['Restaurant']:
        """이름으로 식당 조회"""
        ...

    def find_by_address(self, address: str) -> list['Restaurant']:
        """주소로 식당 조회"""
        ...

    def find_popular(self, limit: int = 10) -> list['Restaurant']:
        """인기 식당 조회"""
        ...

    def search(self, query: str, limit: int = 20) -> list['Restaurant']:
        """식당 검색"""
        ...


class ReviewRepository(Protocol):
    """리뷰 저장소 인터페이스"""

    def save(self, review: 'Review') -> 'Review':
        """리뷰 저장"""
        ...

    def find_by_id(self, review_id: int) -> Optional['Review']:
        """ID로 리뷰 조회"""
        ...

    def find_by_restaurant(self, restaurant_id: int, limit: int = 10) -> list['Review']:
        """식당별 리뷰 조회"""
        ...

    def find_by_user(self, user_id: int, limit: int = 10) -> list['Review']:
        """사용자별 리뷰 조회"""
        ...

    def find_recent(self, limit: int = 20) -> list['Review']:
        """최근 리뷰 조회"""
        ...

    def get_average_rating(self, restaurant_id: int) -> float | None:
        """식당 평균 평점 조회"""
        ...


# 복합 쿼리 인터페이스
class PartyQueryRepository(Protocol):
    """파티 복합 쿼리 저장소 인터페이스"""

    def find_parties_with_member_count(self, limit: int = 10) -> list[dict[str, Any]]:
        """멤버 수가 포함된 파티 목록 조회"""
        ...

    def find_parties_by_user_participation(self, user_id: int) -> list[dict[str, Any]]:
        """사용자 참여 파티 조회 (상세 정보 포함)"""
        ...

    def find_upcoming_parties_with_restaurant_info(self, limit: int = 10) -> list[dict[str, Any]]:
        """식당 정보가 포함된 다가오는 파티 조회"""
        ...

    def get_party_statistics(self, user_id: int) -> dict[str, Any]:
        """사용자 파티 통계 조회"""
        ...


# 저장소 팩토리 인터페이스
class RepositoryFactory(Protocol):
    """저장소 팩토리 인터페이스"""

    def create_party_repository(self) -> PartyRepository:
        """파티 저장소 생성"""
        ...

    def create_user_repository(self) -> UserRepository:
        """사용자 저장소 생성"""
        ...

    def create_party_member_repository(self) -> PartyMemberRepository:
        """파티 멤버 저장소 생성"""
        ...

    def create_restaurant_repository(self) -> RestaurantRepository:
        """식당 저장소 생성"""
        ...

    def create_review_repository(self) -> ReviewRepository:
        """리뷰 저장소 생성"""
        ...

    def create_party_query_repository(self) -> PartyQueryRepository:
        """파티 복합 쿼리 저장소 생성"""
        ...


# 저장소 예외 정의
class RepositoryError(Exception):
    """저장소 기본 예외"""
    pass


class EntityNotFoundError(RepositoryError):
    """엔티티를 찾을 수 없는 예외"""
    pass


class DuplicateEntityError(RepositoryError):
    """중복 엔티티 예외"""
    pass


class RepositoryConstraintError(RepositoryError):
    """저장소 제약조건 위반 예외"""
    pass


# 저장소 메타데이터 인터페이스
class RepositoryMetadata(Protocol):
    """저장소 메타데이터 인터페이스"""

    def get_entity_count(self) -> int:
        """엔티티 수 조회"""
        ...

    def get_last_updated(self) -> datetime | None:
        """마지막 업데이트 시간 조회"""
        ...

    def get_statistics(self) -> dict[str, Any]:
        """저장소 통계 조회"""
        ...

    def health_check(self) -> bool:
        """저장소 상태 확인"""
        ...


# 저장소 캐시 인터페이스
class RepositoryCache(Protocol):
    """저장소 캐시 인터페이스"""

    def get(self, key: str) -> Any | None:
        """캐시에서 값 조회"""
        ...

    def set(self, key: str, value: Any, ttl: int = 300) -> None:
        """캐시에 값 저장"""
        ...

    def delete(self, key: str) -> None:
        """캐시에서 값 삭제"""
        ...

    def clear(self) -> None:
        """캐시 전체 삭제"""
        ...

    def invalidate_pattern(self, pattern: str) -> None:
        """패턴에 맞는 캐시 삭제"""
        ...
