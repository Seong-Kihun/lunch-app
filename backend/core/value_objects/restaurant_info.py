#!/usr/bin/env python3
"""
식당 정보 값 객체
불변 객체로 식당의 기본 정보를 관리합니다.
"""

from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class RestaurantInfo:
    """식당 정보 값 객체"""
    
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    rating: Optional[float] = None
    cuisine_type: Optional[str] = None
    
    def __post_init__(self):
        """생성 후 검증"""
        if not self.name or len(self.name.strip()) == 0:
            raise ValueError("식당명은 필수입니다")
    
    def with_updated_info(self, name: Optional[str] = None, address: Optional[str] = None) -> 'RestaurantInfo':
        """업데이트된 정보로 새 인스턴스 반환"""
        return RestaurantInfo(
            name=name if name is not None else self.name,
            address=address if address is not None else self.address
        )
        
        if self.rating is not None and (self.rating < 0 or self.rating > 5):
            raise ValueError("평점은 0-5 사이여야 합니다")
        
        if self.phone is not None and not self._is_valid_phone(self.phone):
            raise ValueError("올바른 전화번호 형식이 아닙니다")
    
    def _is_valid_phone(self, phone: str) -> bool:
        """전화번호 형식 검증"""
        # 간단한 전화번호 형식 검증 (실제로는 더 정교한 검증 필요)
        phone_digits = ''.join(filter(str.isdigit, phone))
        return len(phone_digits) >= 10 and len(phone_digits) <= 15
    
    @property
    def display_name(self) -> str:
        """표시용 식당명"""
        return self.name.strip()
    
    @property
    def has_address(self) -> bool:
        """주소 정보가 있는지 확인"""
        return self.address is not None and len(self.address.strip()) > 0
    
    @property
    def has_phone(self) -> bool:
        """전화번호 정보가 있는지 확인"""
        return self.phone is not None and len(self.phone.strip()) > 0
    
    @property
    def has_rating(self) -> bool:
        """평점 정보가 있는지 확인"""
        return self.rating is not None
    
    def with_updated_info(
        self,
        name: Optional[str] = None,
        address: Optional[str] = None,
        phone: Optional[str] = None,
        rating: Optional[float] = None,
        cuisine_type: Optional[str] = None
    ) -> 'RestaurantInfo':
        """정보 업데이트된 새 인스턴스 반환"""
        return RestaurantInfo(
            name=name if name is not None else self.name,
            address=address if address is not None else self.address,
            phone=phone if phone is not None else self.phone,
            rating=rating if rating is not None else self.rating,
            cuisine_type=cuisine_type if cuisine_type is not None else self.cuisine_type
        )
