#!/usr/bin/env python3
"""
파티 도메인 엔티티
순수 도메인 로직만 포함하며 외부 의존성이 없습니다.
"""

from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime, date, time

from backend.core.value_objects.restaurant_info import RestaurantInfo
from backend.core.value_objects.party_time import PartyTime
from backend.core.value_objects.party_id import PartyId
from backend.core.exceptions import PartyDomainError


@dataclass
class Party:
    """파티 도메인 엔티티 - 순수 도메인 로직만"""
    
    id: Optional[PartyId]  # 내부 ID (데이터베이스에서 설정)
    host_user_id: int
    title: str
    restaurant: RestaurantInfo
    party_time: PartyTime
    max_members: int = 4
    description: Optional[str] = None
    is_active: bool = True
    created_at: datetime = field(default_factory=datetime.utcnow)
    
    def __setattr__(self, name, value):
        """속성 설정 허용"""
        object.__setattr__(self, name, value)
    
    def __post_init__(self):
        """생성 후 검증"""
        self._validate()
    
    @classmethod
    def create(
        cls,
        host_user_id: int,
        title: str,
        restaurant: RestaurantInfo,
        party_date: date,
        party_time: time,
        max_members: int = 4,
        description: Optional[str] = None
    ) -> 'Party':
        """파티 생성 팩토리 메서드"""
        return cls(
            id=None,  # 데이터베이스에서 설정됨
            host_user_id=host_user_id,
            title=title,
            restaurant=restaurant,
            party_time=PartyTime(date=party_date, time=party_time),
            max_members=max_members,
            description=description,
            is_active=True
        )
    
    def _validate(self):
        """도메인 검증 규칙"""
        if not self.title or len(self.title.strip()) == 0:
            raise ValueError("파티 제목은 필수입니다")
        
        if self.max_members < 2:
            raise ValueError("최소 참석자 수는 2명입니다")
        
        if self.max_members > 10:
            raise ValueError("최대 참석자 수는 10명입니다")
        
        if self.host_user_id <= 0:
            raise ValueError("호스트 사용자 ID는 양수여야 합니다")
    
    def is_full(self, current_member_count: int) -> bool:
        """파티가 가득 찼는지 확인"""
        return current_member_count >= self.max_members
    
    def can_join(self, current_member_count: int) -> bool:
        """참가 가능한지 확인"""
        if not self.is_active:
            raise PartyDomainError("취소된 파티에는 참가할 수 없습니다")
        
        return not self.is_full(current_member_count)
    
    def update_title(self, new_title: str):
        """파티 제목 수정"""
        if not new_title or len(new_title.strip()) == 0:
            raise ValueError("파티 제목은 필수입니다")
        
        self.title = new_title.strip()
    
    def update_description(self, new_description: Optional[str]):
        """파티 설명 수정"""
        self.description = new_description
    
    def update_max_members(self, new_max_members: int):
        """최대 참석자 수 수정"""
        if new_max_members < 2:
            raise ValueError("최소 참석자 수는 2명입니다")
        
        if new_max_members > 10:
            raise ValueError("최대 참석자 수는 10명입니다")
        
        self.max_members = new_max_members
    
    def update_restaurant(self, new_restaurant: RestaurantInfo):
        """식당 정보 수정"""
        self.restaurant = new_restaurant
    
    def cancel(self):
        """파티 취소"""
        if not self.is_active:
            raise PartyDomainError("이미 취소된 파티입니다")
        
        self.is_active = False
    
    def reactivate(self):
        """파티 재활성화"""
        if self.is_active:
            raise PartyDomainError("이미 활성화된 파티입니다")
        
        self.is_active = True
    
    def is_past(self) -> bool:
        """과거 파티인지 확인"""
        now = datetime.now()
        party_datetime = datetime.combine(self.party_time.date, self.party_time.time)
        return party_datetime < now
    
    def is_upcoming(self) -> bool:
        """다가오는 파티인지 확인"""
        return not self.is_past() and self.is_active
    
    def can_be_modified(self) -> bool:
        """파티 수정 가능한지 확인"""
        return self.is_active and not self.is_past()
    
    def get_remaining_slots(self, current_member_count: int) -> int:
        """남은 참석 가능 인원 수"""
        if not self.is_active:
            return 0
        
        return max(0, self.max_members - current_member_count)
    
    def is_host(self, user_id: int) -> bool:
        """호스트인지 확인"""
        return self.host_user_id == user_id
    
    def set_id(self, party_id: int):
        """파티 ID 설정 (데이터베이스에서 호출)"""
        self.id = PartyId(party_id)
    
    def can_be_cancelled_by(self, user_id: int) -> bool:
        """사용자가 취소할 수 있는지 확인"""
        return self.is_host(user_id) and self.is_active and not self.is_past()
    
    def can_be_modified_by(self, user_id: int) -> bool:
        """사용자가 수정할 수 있는지 확인"""
        return self.is_host(user_id) and self.can_be_modified()
    
    def is_valid(self) -> bool:
        """엔티티의 현재 상태가 유효한지 확인"""
        try:
            self._validate()
            return True
        except ValueError:
            return False
