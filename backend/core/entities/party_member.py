#!/usr/bin/env python3
"""
파티 멤버 도메인 엔티티
순수 도메인 로직만 포함하며 외부 의존성이 없습니다.
"""

from dataclasses import dataclass
from typing import Optional
from datetime import datetime

from backend.core.exceptions import ValidationError, PartyDomainError
from backend.core.value_objects.party_member_id import PartyMemberId
from backend.core.value_objects.user_id import UserId
from backend.core.value_objects.party_id import PartyId


@dataclass
class PartyMember:
    """파티 멤버 도메인 엔티티"""
    
    id: Optional[PartyMemberId]  # 내부 ID (데이터베이스에서 설정)
    party_id: PartyId
    user_id: UserId
    joined_at: Optional[datetime] = None
    is_host: bool = False
    
    def __post_init__(self):
        """생성 후 검증"""
        self._validate()
        
        # joined_at이 없으면 현재 시간으로 설정
        if self.joined_at is None:
            self.joined_at = datetime.utcnow()
    
    @classmethod
    def create(
        cls,
        party_id: PartyId,
        user_id: UserId,
        is_host: bool = False
    ) -> 'PartyMember':
        """파티 멤버 생성 팩토리 메서드"""
        return cls(
            id=None,  # 데이터베이스에서 설정됨
            party_id=party_id,
            user_id=user_id,
            is_host=is_host,
            joined_at=datetime.utcnow()
        )
    
    def _validate(self):
        """도메인 검증 규칙"""
        if not self.party_id:
            raise ValidationError("유효한 파티 ID가 필요합니다")
        
        if not self.user_id:
            raise ValidationError("유효한 사용자 ID가 필요합니다")
    
    def is_host_member(self) -> bool:
        """호스트 멤버인지 확인"""
        return self.is_host
    
    def is_regular_member(self) -> bool:
        """일반 멤버인지 확인"""
        return not self.is_host
    
    def can_leave_party(self) -> bool:
        """파티를 떠날 수 있는지 확인"""
        # 호스트는 탈퇴할 수 없음 (파티 취소해야 함)
        return not self.is_host
    
    def get_membership_duration_days(self) -> int:
        """멤버십 지속 일수"""
        if not self.joined_at:
            return 0
        
        delta = datetime.utcnow() - self.joined_at
        return delta.days
    
    def is_new_member(self) -> bool:
        """신규 멤버 여부 확인 (1일 이내 가입)"""
        if not self.joined_at:
            return False
        
        from datetime import timedelta
        one_day_ago = datetime.utcnow() - timedelta(days=1)
        return self.joined_at >= one_day_ago
    
    def __str__(self) -> str:
        """문자열 표현"""
        member_type = "호스트" if self.is_host else "멤버"
        return f"PartyMember(party_id={self.party_id}, user_id={self.user_id}, {member_type})"
    
    def __repr__(self) -> str:
        """디버그용 문자열 표현"""
        return f"PartyMember(id={self.id}, party_id={self.party_id}, user_id={self.user_id}, is_host={self.is_host})"
