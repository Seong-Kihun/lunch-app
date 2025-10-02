#!/usr/bin/env python3
"""
도메인 엔티티와 데이터베이스 모델 간의 매핑
도메인 계층과 인프라 계층 간의 변환을 담당합니다.
"""

from typing import Optional
from datetime import datetime, date, time

from backend.core.entities import Party, User, PartyMember
from backend.core.value_objects import RestaurantInfo, PartyTime, PartyId, UserId, PartyMemberId
from backend.infrastructure.models import (
    PartyModel, UserModel, PartyMemberModel, RestaurantModel, ReviewModel
)


class PartyMapper:
    """파티 도메인 엔티티와 DB 모델 간의 매핑"""
    
    def to_entity(self, model: PartyModel) -> Party:
        """DB 모델을 도메인 엔티티로 변환"""
        # PartyTime 값 객체 생성
        party_time = PartyTime(
            date=model.party_date,
            time=model.party_time
        )
        
        # RestaurantInfo 값 객체 생성
        restaurant = RestaurantInfo(
            name=model.restaurant_name,
            address=model.restaurant_address
        )
        
        # Party 도메인 엔티티 생성
        party = Party(
            id=PartyId(model.id) if model.id else None,
            host_user_id=model.host_user_id,
            title=model.title,
            restaurant=restaurant,
            party_time=party_time,
            max_members=model.max_members,
            description=model.description,
            is_active=model.is_active,
            created_at=model.created_at
        )
        
        return party
    
    def to_model(self, entity: Party) -> PartyModel:
        """도메인 엔티티를 DB 모델로 변환"""
        model = PartyModel(
            id=entity.id.value if entity.id else None,
            host_user_id=entity.host_user_id,
            title=entity.title,
            restaurant_name=entity.restaurant.name,
            restaurant_address=entity.restaurant.address,
            party_date=entity.party_time.date,
            party_time=entity.party_time.time,
            max_members=entity.max_members,
            description=entity.description,
            is_active=entity.is_active,
            created_at=entity.created_at or datetime.utcnow()
        )
        
        return model


class UserMapper:
    """사용자 도메인 엔티티와 DB 모델 간의 매핑"""
    
    def to_entity(self, model: UserModel) -> User:
        """DB 모델을 도메인 엔티티로 변환"""
        user = User(
            id=UserId(model.id) if model.id else None,
            employee_id=model.employee_id,
            email=model.email,
            nickname=model.nickname,
            is_active=model.is_active,
            created_at=model.created_at
        )
        
        return user
    
    def to_model(self, entity: User) -> UserModel:
        """도메인 엔티티를 DB 모델로 변환"""
        model = UserModel(
            id=entity.id.value if entity.id else None,
            employee_id=entity.employee_id,
            email=entity.email,
            nickname=entity.nickname,
            is_active=entity.is_active,
            created_at=entity.created_at or datetime.utcnow()
        )
        
        return model


class PartyMemberMapper:
    """파티 멤버 도메인 엔티티와 DB 모델 간의 매핑"""
    
    def to_entity(self, model: PartyMemberModel) -> PartyMember:
        """DB 모델을 도메인 엔티티로 변환"""
        party_member = PartyMember(
            id=PartyMemberId(model.id) if model.id else None,
            party_id=PartyId(model.party_id),
            user_id=UserId(model.user_id),
            joined_at=model.joined_at,
            is_host=model.is_host
        )
        
        return party_member
    
    def to_model(self, entity: PartyMember) -> PartyMemberModel:
        """도메인 엔티티를 DB 모델로 변환"""
        model = PartyMemberModel(
            id=entity.id.value if entity.id else None,
            party_id=entity.party_id.value,
            user_id=entity.user_id.value,
            joined_at=entity.joined_at or datetime.utcnow(),
            is_host=entity.is_host
        )
        
        return model


class RestaurantMapper:
    """식당 도메인 엔티티와 DB 모델 간의 매핑"""
    
    def to_entity(self, model: RestaurantModel) -> RestaurantInfo:
        """DB 모델을 도메인 엔티티로 변환"""
        restaurant = RestaurantInfo(
            name=model.name,
            address=model.address,
            phone=model.phone,
            rating=model.rating,
            cuisine_type=model.cuisine_type
        )
        
        return restaurant
    
    def to_model(self, entity: RestaurantInfo) -> RestaurantModel:
        """도메인 엔티티를 DB 모델로 변환"""
        model = RestaurantModel(
            id=None,  # RestaurantInfo는 ID를 가지지 않음
            name=entity.name,
            address=entity.address,
            phone=entity.phone,
            cuisine_type=entity.cuisine_type,
            rating=entity.rating,
            description=None,  # RestaurantInfo에 없는 필드
            is_active=True,  # 기본값
            created_at=datetime.utcnow()
        )
        
        return model


class ReviewMapper:
    """리뷰 도메인 엔티티와 DB 모델 간의 매핑"""
    
    def to_entity(self, model: ReviewModel) -> dict:
        """DB 모델을 도메인 엔티티로 변환 (딕셔너리 형태)"""
        review = {
            'id': model.id,
            'user_id': model.user_id,
            'party_id': model.party_id,
            'restaurant_id': model.restaurant_id,
            'rating': model.rating,
            'comment': model.comment,
            'created_at': model.created_at
        }
        
        return review
    
    def to_model(self, entity: dict) -> ReviewModel:
        """도메인 엔티티를 DB 모델로 변환"""
        model = ReviewModel(
            id=entity.get('id'),
            user_id=entity.get('user_id'),
            party_id=entity.get('party_id'),
            restaurant_id=entity.get('restaurant_id'),
            rating=entity.get('rating'),
            comment=entity.get('comment'),
            created_at=entity.get('created_at') or datetime.utcnow()
        )
        
        return model


class MapperRegistry:
    """매퍼 레지스트리 - 매퍼 인스턴스 관리"""
    
    def __init__(self):
        self._mappers = {
            'party': PartyMapper(),
            'user': UserMapper(),
            'party_member': PartyMemberMapper(),
            'restaurant': RestaurantMapper(),
            'review': ReviewMapper(),
        }
    
    def get_mapper(self, entity_type: str):
        """매퍼 인스턴스 반환"""
        mapper = self._mappers.get(entity_type)
        if mapper is None:
            raise ValueError(f"Unknown entity type: {entity_type}")
        return mapper
    
    def register_mapper(self, entity_type: str, mapper):
        """새로운 매퍼 등록"""
        self._mappers[entity_type] = mapper


# 전역 매퍼 레지스트리
mapper_registry = MapperRegistry()


def get_mapper(entity_type: str):
    """매퍼 인스턴스 반환 헬퍼 함수"""
    return mapper_registry.get_mapper(entity_type)


def register_mapper(entity_type: str, mapper):
    """매퍼 등록 헬퍼 함수"""
    mapper_registry.register_mapper(entity_type, mapper)
