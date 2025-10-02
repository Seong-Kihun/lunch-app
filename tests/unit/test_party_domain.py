#!/usr/bin/env python3
"""
파티 도메인 로직 단위 테스트
핵심 비즈니스 로직의 테스트 커버리지를 70% 이상 달성합니다.
"""

import pytest
from datetime import datetime, date, time, timedelta
from backend.core.entities.party import Party, PartyId
from backend.core.value_objects.restaurant_info import RestaurantInfo
from backend.core.value_objects.party_time import PartyTime
from backend.core.exceptions import PartyDomainError


class TestPartyId:
    """파티 ID 값 객체 테스트"""
    
    def test_party_id_creation_success(self):
        """파티 ID 생성 성공"""
        party_id = PartyId(value=1)
        assert party_id.value == 1
    
    def test_party_id_validation_negative(self):
        """파티 ID 음수 검증"""
        with pytest.raises(ValueError, match="파티 ID는 양수여야 합니다"):
            PartyId(value=-1)
    
    def test_party_id_validation_zero(self):
        """파티 ID 0 검증"""
        with pytest.raises(ValueError, match="파티 ID는 양수여야 합니다"):
            PartyId(value=0)
    
    def test_party_id_immutability(self):
        """파티 ID 불변성 테스트"""
        party_id = PartyId(value=1)
        # dataclass(frozen=True)로 불변 객체
        with pytest.raises(AttributeError):
            party_id.value = 2


class TestRestaurantInfo:
    """식당 정보 값 객체 테스트"""
    
    def test_restaurant_info_creation_success(self):
        """식당 정보 생성 성공"""
        restaurant = RestaurantInfo(
            name="맛있는 식당",
            address="서울시 강남구"
        )
        assert restaurant.name == "맛있는 식당"
        assert restaurant.address == "서울시 강남구"
    
    def test_restaurant_info_name_required(self):
        """식당명 필수 검증"""
        with pytest.raises(ValueError, match="식당명은 필수입니다"):
            RestaurantInfo(name="")
    
    def test_restaurant_info_name_whitespace_only(self):
        """식당명 공백만 있는 경우"""
        with pytest.raises(ValueError, match="식당명은 필수입니다"):
            RestaurantInfo(name="   ")
    
    def test_restaurant_info_optional_address(self):
        """식당 주소 선택적"""
        restaurant = RestaurantInfo(name="맛있는 식당")
        assert restaurant.name == "맛있는 식당"
        assert restaurant.address is None
    
    def test_restaurant_info_immutability(self):
        """식당 정보 불변성"""
        restaurant = RestaurantInfo(name="맛있는 식당")
        with pytest.raises(AttributeError):
            restaurant.name = "다른 식당"


class TestPartyTime:
    """파티 시간 값 객체 테스트"""
    
    def test_party_time_creation_success(self):
        """파티 시간 생성 성공"""
        party_time = PartyTime(
            date=date(2024, 1, 15),
            time=time(12, 30)
        )
        assert party_time.date == date(2024, 1, 15)
        assert party_time.time == time(12, 30)
    
    def test_party_time_past_date_validation(self):
        """과거 날짜 검증"""
        yesterday = date.today() - timedelta(days=1)
        with pytest.raises(ValueError, match="파티 날짜는 미래여야 합니다"):
            PartyTime(date=yesterday, time=time(12, 30))
    
    def test_party_time_today_allowed(self):
        """오늘 날짜는 허용"""
        today = date.today()
        party_time = PartyTime(date=today, time=time(12, 30))
        assert party_time.date == today
    
    def test_party_time_business_hours_validation(self):
        """영업시간 검증"""
        # 점심시간 (11:00-15:00) 외 시간
        with pytest.raises(ValueError, match="파티 시간은 점심시간"):
            PartyTime(
                date=date.today() + timedelta(days=1),
                time=time(9, 0)  # 아침
            )
    
    def test_party_time_valid_lunch_hours(self):
        """유효한 점심시간"""
        valid_times = [time(11, 0), time(12, 30), time(14, 30), time(15, 0)]
        for valid_time in valid_times:
            party_time = PartyTime(
                date=date.today() + timedelta(days=1),
                time=valid_time
            )
            assert party_time.time == valid_time


class TestParty:
    """파티 도메인 엔티티 테스트"""
    
    def test_party_creation_success(self):
        """파티 생성 성공"""
        party = Party.create(
            host_user_id=1,
            title="점심 모임",
            restaurant=RestaurantInfo("맛있는 식당", "서울시 강남구"),
            party_time=PartyTime(
                date=date.today() + timedelta(days=1),
                time=time(12, 30)
            )
        )
        
        assert party.host_user_id == 1
        assert party.title == "점심 모임"
        assert party.restaurant.name == "맛있는 식당"
        assert party.max_members == 4  # 기본값
        assert party.is_active is True  # 기본값
    
    def test_party_creation_with_custom_values(self):
        """사용자 정의 값으로 파티 생성"""
        party = Party.create(
            host_user_id=1,
            title="점심 모임",
            restaurant=RestaurantInfo("맛있는 식당"),
            party_time=PartyTime(
                date=date.today() + timedelta(days=1),
                time=time(12, 30)
            ),
            max_members=6,
            description="친구들과 함께하는 점심"
        )
        
        assert party.max_members == 6
        assert party.description == "친구들과 함께하는 점심"
    
    def test_party_title_validation_empty(self):
        """파티 제목 빈 값 검증"""
        with pytest.raises(ValueError, match="파티 제목은 필수입니다"):
            Party.create(
                host_user_id=1,
                title="",
                restaurant=RestaurantInfo("맛있는 식당"),
                party_time=PartyTime(
                    date=date.today() + timedelta(days=1),
                    time=time(12, 30)
                )
            )
    
    def test_party_title_validation_whitespace(self):
        """파티 제목 공백만 있는 경우"""
        with pytest.raises(ValueError, match="파티 제목은 필수입니다"):
            Party.create(
                host_user_id=1,
                title="   ",
                restaurant=RestaurantInfo("맛있는 식당"),
                party_time=PartyTime(
                    date=date.today() + timedelta(days=1),
                    time=time(12, 30)
                )
            )
    
    def test_party_max_members_validation_minimum(self):
        """최소 참석자 수 검증"""
        with pytest.raises(ValueError, match="최소 참석자 수는 2명입니다"):
            Party.create(
                host_user_id=1,
                title="점심 모임",
                restaurant=RestaurantInfo("맛있는 식당"),
                party_time=PartyTime(
                    date=date.today() + timedelta(days=1),
                    time=time(12, 30)
                ),
                max_members=1
            )
    
    def test_party_max_members_validation_maximum(self):
        """최대 참석자 수 검증"""
        with pytest.raises(ValueError, match="최대 참석자 수는 10명입니다"):
            Party.create(
                host_user_id=1,
                title="점심 모임",
                restaurant=RestaurantInfo("맛있는 식당"),
                party_time=PartyTime(
                    date=date.today() + timedelta(days=1),
                    time=time(12, 30)
                ),
                max_members=11
            )
    
    def test_party_max_members_boundary_values(self):
        """참석자 수 경계값 테스트"""
        # 최소값 (2명)
        party_min = Party.create(
            host_user_id=1,
            title="점심 모임",
            restaurant=RestaurantInfo("맛있는 식당"),
            party_time=PartyTime(
                date=date.today() + timedelta(days=1),
                time=time(12, 30)
            ),
            max_members=2
        )
        assert party_min.max_members == 2
        
        # 최대값 (10명)
        party_max = Party.create(
            host_user_id=1,
            title="점심 모임",
            restaurant=RestaurantInfo("맛있는 식당"),
            party_time=PartyTime(
                date=date.today() + timedelta(days=1),
                time=time(12, 30)
            ),
            max_members=10
        )
        assert party_max.max_members == 10
    
    def test_party_is_full(self):
        """파티 가득 참 확인"""
        party = Party.create(
            host_user_id=1,
            title="점심 모임",
            restaurant=RestaurantInfo("맛있는 식당"),
            party_time=PartyTime(
                date=date.today() + timedelta(days=1),
                time=time(12, 30)
            ),
            max_members=4
        )
        
        # 4명이면 가득 참
        assert party.is_full(4) is True
        # 3명이면 가득 차지 않음
        assert party.is_full(3) is False
    
    def test_party_can_join(self):
        """파티 참가 가능 확인"""
        party = Party.create(
            host_user_id=1,
            title="점심 모임",
            restaurant=RestaurantInfo("맛있는 식당"),
            party_time=PartyTime(
                date=date.today() + timedelta(days=1),
                time=time(12, 30)
            ),
            max_members=4
        )
        
        # 3명이면 참가 가능
        assert party.can_join(3) is True
        # 4명이면 참가 불가능
        assert party.can_join(4) is False
    
    def test_party_update_title(self):
        """파티 제목 수정"""
        party = Party.create(
            host_user_id=1,
            title="점심 모임",
            restaurant=RestaurantInfo("맛있는 식당"),
            party_time=PartyTime(
                date=date.today() + timedelta(days=1),
                time=time(12, 30)
            )
        )
        
        party.update_title("새로운 점심 모임")
        assert party.title == "새로운 점심 모임"
    
    def test_party_update_title_validation(self):
        """파티 제목 수정 검증"""
        party = Party.create(
            host_user_id=1,
            title="점심 모임",
            restaurant=RestaurantInfo("맛있는 식당"),
            party_time=PartyTime(
                date=date.today() + timedelta(days=1),
                time=time(12, 30)
            )
        )
        
        with pytest.raises(ValueError, match="파티 제목은 필수입니다"):
            party.update_title("")
    
    def test_party_cancel(self):
        """파티 취소"""
        party = Party.create(
            host_user_id=1,
            title="점심 모임",
            restaurant=RestaurantInfo("맛있는 식당"),
            party_time=PartyTime(
                date=date.today() + timedelta(days=1),
                time=time(12, 30)
            )
        )
        
        party.cancel()
        assert party.is_active is False
    
    def test_party_cancel_already_cancelled(self):
        """이미 취소된 파티 재취소"""
        party = Party.create(
            host_user_id=1,
            title="점심 모임",
            restaurant=RestaurantInfo("맛있는 식당"),
            party_time=PartyTime(
                date=date.today() + timedelta(days=1),
                time=time(12, 30)
            )
        )
        
        party.cancel()
        
        with pytest.raises(PartyDomainError, match="이미 취소된 파티입니다"):
            party.cancel()
    
    def test_party_is_past(self):
        """과거 파티 확인"""
        # 과거 파티
        past_party = Party.create(
            host_user_id=1,
            title="과거 파티",
            restaurant=RestaurantInfo("맛있는 식당"),
            party_time=PartyTime(
                date=date.today() - timedelta(days=1),
                time=time(12, 30)
            )
        )
        
        # 현재 시간을 과거로 설정하여 테스트
        past_party.created_at = datetime.now() - timedelta(days=2)
        assert past_party.is_past() is True
        
        # 미래 파티
        future_party = Party.create(
            host_user_id=1,
            title="미래 파티",
            restaurant=RestaurantInfo("맛있는 식당"),
            party_time=PartyTime(
                date=date.today() + timedelta(days=1),
                time=time(12, 30)
            )
        )
        assert future_party.is_past() is False


class TestPartyDomainIntegrations:
    """파티 도메인 통합 테스트"""
    
    def test_party_lifecycle(self):
        """파티 생명주기 테스트"""
        # 1. 파티 생성
        party = Party.create(
            host_user_id=1,
            title="점심 모임",
            restaurant=RestaurantInfo("맛있는 식당"),
            party_time=PartyTime(
                date=date.today() + timedelta(days=1),
                time=time(12, 30)
            ),
            max_members=4
        )
        
        assert party.is_active is True
        assert party.can_join(0) is True
        
        # 2. 참석자 추가
        assert party.can_join(1) is True
        assert party.can_join(2) is True
        assert party.can_join(3) is True
        
        # 3. 파티 가득 참
        assert party.is_full(4) is True
        assert party.can_join(4) is False
        
        # 4. 파티 취소
        party.cancel()
        assert party.is_active is False
        
        # 5. 취소된 파티에는 참가 불가
        with pytest.raises(PartyDomainError, match="취소된 파티에는 참가할 수 없습니다"):
            party.can_join(1)
    
    def test_party_business_rules(self):
        """파티 비즈니스 규칙 테스트"""
        # 같은 날 같은 시간에 여러 파티 생성 가능 (호스트가 다르면)
        party1 = Party.create(
            host_user_id=1,
            title="파티 1",
            restaurant=RestaurantInfo("식당 A"),
            party_time=PartyTime(
                date=date.today() + timedelta(days=1),
                time=time(12, 0)
            )
        )
        
        party2 = Party.create(
            host_user_id=2,
            title="파티 2",
            restaurant=RestaurantInfo("식당 B"),
            party_time=PartyTime(
                date=date.today() + timedelta(days=1),
                time=time(12, 0)
            )
        )
        
        assert party1.host_user_id != party2.host_user_id
        assert party1.is_active is True
        assert party2.is_active is True


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
