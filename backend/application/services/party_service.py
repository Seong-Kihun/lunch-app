#!/usr/bin/env python3
"""
파티 서비스
파티 관련 비즈니스 로직을 담당하는 서비스 계층입니다.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, date, time

from backend.application.unit_of_work import UnitOfWork
from backend.application.repositories import PartyRepository, UserRepository, PartyMemberRepository
from backend.core.entities import Party
from backend.core.value_objects import RestaurantInfo, PartyTime
from backend.core.exceptions import PartyDomainError, ValidationError
from backend.infrastructure.unit_of_work_impl import get_unit_of_work
# import structlog
# logger = structlog.get_logger()

# 임시 로거 (structlog 설치 후 교체)
import logging
logger = logging.getLogger(__name__)


class PartyService:
    """파티 비즈니스 서비스"""
    
    def __init__(self, uow: Optional[UnitOfWork] = None):
        self._uow = uow or get_unit_of_work()
    
    def create_party(
        self, 
        host_employee_id: str, 
        party_data: Dict[str, Any]
    ) -> Party:
        """파티 생성 - 트랜잭션 경계 명확"""
        logger.info("파티 생성 시작", host_employee_id=host_employee_id)
        
        with self._uow as uow:
            try:
                # 1. 사용자 존재 확인
                user = uow.users.find_by_employee_id(host_employee_id)
                if not user:
                    raise ValidationError(f"존재하지 않는 사용자: {host_employee_id}")
                
                # 2. 도메인 엔티티 생성
                party = self._create_party_entity(host_employee_id, party_data, user.id.value)
                
                # 3. 저장
                saved_party = uow.parties.save(party)
                
                logger.info("파티 생성 완료", party_id=saved_party.id.value if saved_party.id else None, host_user_id=user.id.value)
                return saved_party
                
            except Exception as e:
                logger.error("파티 생성 실패", host_employee_id=host_employee_id, error=str(e))
                raise
    
    def join_party(self, party_id: int, user_employee_id: str) -> bool:
        """파티 참가"""
        logger.info("파티 참가 시작", party_id=party_id, user_employee_id=user_employee_id)
        
        with self._uow as uow:
            try:
                # 1. 파티 존재 확인
                party = uow.parties.find_by_id(party_id)
                if not party:
                    raise ValidationError(f"파티 ID {party_id}를 찾을 수 없습니다")
                
                # 2. 사용자 존재 확인
                user = uow.users.find_by_employee_id(user_employee_id)
                if not user:
                    raise ValidationError(f"존재하지 않는 사용자: {user_employee_id}")
                
                # 3. 참가 가능 여부 확인
                if not self._can_join_party(party, user.id.value, uow):
                    raise PartyDomainError("파티에 참가할 수 없습니다")
                
                # 4. 파티 멤버 추가
                from backend.core.entities.party_member import PartyMember
                from backend.core.value_objects.party_id import PartyId
                from backend.core.value_objects.user_id import UserId
                party_member = PartyMember.create(
                    party_id=PartyId(party_id),
                    user_id=UserId(user.id.value)
                )
                
                uow.party_members.save(party_member)
                
                logger.info("파티 참가 완료", party_id=party_id, user_id=user.id.value)
                return True
                
            except Exception as e:
                logger.error("파티 참가 실패", party_id=party_id, user_employee_id=user_employee_id, error=str(e))
                raise
    
    def leave_party(self, party_id: int, user_employee_id: str) -> bool:
        """파티 탈퇴"""
        logger.info("파티 탈퇴 시작", party_id=party_id, user_employee_id=user_employee_id)
        
        with self._uow as uow:
            try:
                # 1. 사용자 존재 확인
                user = uow.users.find_by_employee_id(user_employee_id)
                if not user:
                    raise ValidationError(f"존재하지 않는 사용자: {user_employee_id}")
                
                # 2. 파티 멤버십 확인
                party_member = uow.party_members.find_by_party_and_user(party_id, user.id)
                if not party_member:
                    raise ValidationError("파티 멤버가 아닙니다")
                
                # 3. 호스트는 탈퇴 불가
                if party_member.is_host:
                    raise PartyDomainError("호스트는 파티를 탈퇴할 수 없습니다. 파티를 취소하세요.")
                
                # 4. 파티 멤버 삭제
                success = uow.party_members.delete(party_id, user.id)
                
                logger.info("파티 탈퇴 완료", party_id=party_id, user_id=user.id)
                return success
                
            except Exception as e:
                logger.error("파티 탈퇴 실패", party_id=party_id, user_employee_id=user_employee_id, error=str(e))
                raise
    
    def cancel_party(self, party_id: int, host_employee_id: str) -> bool:
        """파티 취소"""
        logger.info("파티 취소 시작", party_id=party_id, host_employee_id=host_employee_id)
        
        with self._uow as uow:
            try:
                # 1. 파티 존재 확인
                party = uow.parties.find_by_id(party_id)
                if not party:
                    raise ValidationError(f"파티 ID {party_id}를 찾을 수 없습니다")
                
                # 2. 호스트 권한 확인
                user = uow.users.find_by_employee_id(host_employee_id)
                if not user or user.id != party.host_user_id:
                    raise PartyDomainError("파티 호스트만 취소할 수 있습니다")
                
                # 3. 도메인 로직으로 취소
                party.cancel()
                
                # 4. 업데이트된 파티 저장
                uow.parties.save(party)
                
                logger.info("파티 취소 완료", party_id=party_id, host_user_id=user.id)
                return True
                
            except Exception as e:
                logger.error("파티 취소 실패", party_id=party_id, host_employee_id=host_employee_id, error=str(e))
                raise
    
    def get_user_parties(self, user_employee_id: str) -> Dict[str, Any]:
        """사용자 파티 목록 조회"""
        logger.info("사용자 파티 목록 조회", user_employee_id=user_employee_id)
        
        with self._uow as uow:
            try:
                # 1. 사용자 존재 확인
                user = uow.users.find_by_employee_id(user_employee_id)
                if not user:
                    raise ValidationError(f"존재하지 않는 사용자: {user_employee_id}")
                
                # 2. 호스트한 파티 조회
                hosted_parties = uow.parties.find_by_host(user.id)
                
                # 3. 참가한 파티 조회
                participated_parties = uow.party_members.find_by_user(user.id)
                
                # 4. 참가한 파티의 상세 정보 조회
                participated_party_details = []
                for membership in participated_parties:
                    party = uow.parties.find_by_id(membership.party_id)
                    if party:
                        participated_party_details.append({
                            'party': party,
                            'membership': membership
                        })
                
                result = {
                    'hosted_parties': hosted_parties,
                    'participated_parties': participated_party_details,
                    'total_hosted': len(hosted_parties),
                    'total_participated': len(participated_party_details)
                }
                
                logger.info("사용자 파티 목록 조회 완료", 
                           user_id=user.id, 
                           hosted_count=len(hosted_parties),
                           participated_count=len(participated_party_details))
                
                return result
                
            except Exception as e:
                logger.error("사용자 파티 목록 조회 실패", user_employee_id=user_employee_id, error=str(e))
                raise
    
    def get_available_parties(self, user_employee_id: str, limit: int = 10) -> List[Party]:
        """참가 가능한 파티 목록 조회"""
        logger.info("참가 가능한 파티 목록 조회", user_employee_id=user_employee_id)
        
        with self._uow as uow:
            try:
                # 1. 사용자 존재 확인
                user = uow.users.find_by_employee_id(user_employee_id)
                if not user:
                    raise ValidationError(f"존재하지 않는 사용자: {user_employee_id}")
                
                # 2. 참가 가능한 파티 조회
                available_parties = uow.parties.find_available_parties(user.id, limit)
                
                logger.info("참가 가능한 파티 목록 조회 완료", 
                           user_id=user.id, 
                           available_count=len(available_parties))
                
                return available_parties
                
            except Exception as e:
                logger.error("참가 가능한 파티 목록 조회 실패", user_employee_id=user_employee_id, error=str(e))
                raise
    
    def update_party(self, party_id: int, host_employee_id: str, update_data: Dict[str, Any]) -> Party:
        """파티 정보 수정"""
        logger.info("파티 정보 수정 시작", party_id=party_id, host_employee_id=host_employee_id)
        
        with self._uow as uow:
            try:
                # 1. 파티 존재 확인
                party = uow.parties.find_by_id(party_id)
                if not party:
                    raise ValidationError(f"파티 ID {party_id}를 찾을 수 없습니다")
                
                # 2. 호스트 권한 확인
                user = uow.users.find_by_employee_id(host_employee_id)
                if not user or user.id != party.host_user_id:
                    raise PartyDomainError("파티 호스트만 수정할 수 있습니다")
                
                # 3. 수정 가능 여부 확인
                if not party.can_be_modified_by(user.id):
                    raise PartyDomainError("수정할 수 없는 파티입니다")
                
                # 4. 도메인 로직으로 수정
                self._update_party_entity(party, update_data)
                
                # 5. 업데이트된 파티 저장
                updated_party = uow.parties.save(party)
                
                logger.info("파티 정보 수정 완료", party_id=party_id, host_user_id=user.id)
                return updated_party
                
            except Exception as e:
                logger.error("파티 정보 수정 실패", party_id=party_id, host_employee_id=host_employee_id, error=str(e))
                raise
    
    def _create_party_entity(self, host_employee_id: str, party_data: Dict[str, Any], host_user_id: int) -> Party:
        """파티 도메인 엔티티 생성"""
        # RestaurantInfo 생성
        restaurant = RestaurantInfo(
            name=party_data['restaurant_name'],
            address=party_data.get('restaurant_address')
        )
        
        # Party 도메인 엔티티 생성
        party = Party.create(
            host_user_id=host_user_id,
            title=party_data['title'],
            restaurant=restaurant,
            party_date=party_data['party_date'],
            party_time=party_data['party_time'],
            max_members=party_data.get('max_members', 4),
            description=party_data.get('description')
        )
        
        return party
    
    def _can_join_party(self, party: Party, user_id: int, uow: UnitOfWork) -> bool:
        """파티 참가 가능 여부 확인"""
        # 1. 파티가 활성화되어 있는지
        if not party.is_active:
            return False
        
        # 2. 파티가 과거가 아닌지
        if party.is_past():
            return False
        
        # 3. 이미 멤버인지 확인
        existing_membership = uow.party_members.find_by_party_and_user(party.id, user_id)
        if existing_membership:
            return False
        
        # 4. 호스트인지 확인
        if party.is_host(user_id):
            return False
        
        # 5. 파티가 가득 찼는지 확인
        current_member_count = uow.party_members.count_by_party(party.id)
        if party.is_full(current_member_count):
            return False
        
        return True
    
    def _update_party_entity(self, party: Party, update_data: Dict[str, Any]) -> None:
        """파티 도메인 엔티티 수정"""
        if 'title' in update_data:
            party.update_title(update_data['title'])
        
        if 'description' in update_data:
            party.update_description(update_data['description'])
        
        if 'max_members' in update_data:
            party.update_max_members(update_data['max_members'])
        
        if 'restaurant_name' in update_data or 'restaurant_address' in update_data:
            # RestaurantInfo 업데이트
            new_restaurant = party.restaurant.with_updated_info(
                name=update_data.get('restaurant_name', party.restaurant.name),
                address=update_data.get('restaurant_address', party.restaurant.address)
            )
            party.update_restaurant(new_restaurant)


class PartyQueryService:
    """파티 쿼리 서비스 - 복합 쿼리 담당"""
    
    def __init__(self, uow: Optional[UnitOfWork] = None):
        self._uow = uow or get_unit_of_work()
    
    def get_party_statistics(self, user_employee_id: str) -> Dict[str, Any]:
        """사용자 파티 통계 조회"""
        with self._uow as uow:
            try:
                user = uow.users.find_by_employee_id(user_employee_id)
                if not user:
                    raise ValidationError(f"존재하지 않는 사용자: {user_employee_id}")
                
                # 복합 쿼리를 통한 통계 조회
                stats = uow.party_queries.get_party_statistics(user.id)
                
                return stats
                
            except Exception as e:
                logger.error("파티 통계 조회 실패", user_employee_id=user_employee_id, error=str(e))
                raise
    
    def get_upcoming_parties_with_details(self, limit: int = 10) -> List[Dict[str, Any]]:
        """상세 정보가 포함된 다가오는 파티 목록"""
        with self._uow as uow:
            try:
                parties = uow.party_queries.find_upcoming_parties_with_restaurant_info(limit)
                return parties
                
            except Exception as e:
                logger.error("상세 정보 포함 다가오는 파티 조회 실패", error=str(e))
                raise
