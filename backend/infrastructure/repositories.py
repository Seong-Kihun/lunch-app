#!/usr/bin/env python3
"""
Repository 구현체
SQLAlchemy를 사용한 실제 Repository 구현입니다.
"""

from typing import Any
from datetime import datetime, date
from sqlalchemy.orm import Session
from sqlalchemy import text

from backend.application.repositories import (
    EntityNotFoundError
)
from backend.core.entities import Party
from backend.infrastructure.models import (
    PartyModel, UserModel, PartyMemberModel
)
from backend.infrastructure.mappers import (
    PartyMapper, UserMapper, PartyMemberMapper
)
# import structlog
# logger = structlog.get_logger()

# 임시 로거 (structlog 설치 후 교체)
import logging
logger = logging.getLogger(__name__)


class SQLPartyRepository:
    """SQL 기반 파티 저장소 구현"""

    def __init__(self, session: Session):
        self._session = session
        self._mapper = PartyMapper()

    def save(self, party: Party) -> Party:
        """파티 저장"""
        try:
            # 도메인 엔티티를 DB 모델로 변환
            party_model = self._mapper.to_model(party)

            if party.id is None:
                # 새 파티 생성
                self._session.add(party_model)
                self._session.flush()  # ID 생성

                # 도메인 엔티티에 ID 설정
                party.set_id(party_model.id)
            else:
                # 기존 파티 업데이트
                existing_model = self._session.get(PartyModel, party.id.value)
                if existing_model is None:
                    raise EntityNotFoundError(f"파티 ID {party.id.value}를 찾을 수 없습니다")

                # 필드 업데이트
                existing_model.title = party.title
                existing_model.host_user_id = party.host_user_id
                existing_model.restaurant_name = party.restaurant.name
                existing_model.restaurant_address = party.restaurant.address
                existing_model.party_date = party.party_time.date
                existing_model.party_time = party.party_time.time
                existing_model.max_members = party.max_members
                existing_model.description = party.description
                existing_model.is_active = party.is_active
                existing_model.updated_at = datetime.utcnow()

            logger.debug("파티 저장 완료", party_id=party.id.value if party.id else None)
            return party

        except Exception as e:
            logger.error("파티 저장 실패", error=str(e))
            self._session.rollback()
            raise

    def find_by_id(self, party_id: int) -> Party | None:
        """ID로 파티 조회"""
        try:
            party_model = self._session.get(PartyModel, party_id)
            if party_model is None:
                return None

            return self._mapper.to_entity(party_model)

        except Exception as e:
            logger.error("파티 조회 실패", party_id=party_id, error=str(e))
            raise

    def find_by_host(self, host_user_id: int) -> list[Party]:
        """호스트별 파티 조회"""
        try:
            party_models = self._session.query(PartyModel).filter(
                PartyModel.host_user_id == host_user_id
            ).order_by(PartyModel.created_at.desc()).all()

            return [self._mapper.to_entity(model) for model in party_models]

        except Exception as e:
            logger.error("호스트별 파티 조회 실패", host_user_id=host_user_id, error=str(e))
            raise

    def find_upcoming(self, limit: int = 10) -> list[Party]:
        """다가오는 파티 조회"""
        try:
            today = date.today()
            party_models = self._session.query(PartyModel).filter(
                PartyModel.party_date >= today,
                PartyModel.is_active == True
            ).order_by(PartyModel.party_date.asc()).limit(limit).all()

            return [self._mapper.to_entity(model) for model in party_models]

        except Exception as e:
            logger.error("다가오는 파티 조회 실패", error=str(e))
            raise

    def find_by_date_range(self, start_date: date, end_date: date) -> list[Party]:
        """날짜 범위로 파티 조회"""
        try:
            party_models = self._session.query(PartyModel).filter(
                PartyModel.party_date >= start_date,
                PartyModel.party_date <= end_date,
                PartyModel.is_active == True
            ).order_by(PartyModel.party_date.asc()).all()

            return [self._mapper.to_entity(model) for model in party_models]

        except Exception as e:
            logger.error("날짜 범위 파티 조회 실패",
                        start_date=start_date, end_date=end_date, error=str(e))
            raise

    def find_by_restaurant(self, restaurant_name: str) -> list[Party]:
        """식당별 파티 조회"""
        try:
            party_models = self._session.query(PartyModel).filter(
                PartyModel.restaurant_name.ilike(f"%{restaurant_name}%"),
                PartyModel.is_active == True
            ).order_by(PartyModel.party_date.desc()).all()

            return [self._mapper.to_entity(model) for model in party_models]

        except Exception as e:
            logger.error("식당별 파티 조회 실패", restaurant_name=restaurant_name, error=str(e))
            raise

    def find_available_parties(self, user_id: int, limit: int = 10) -> list[Party]:
        """참가 가능한 파티 조회"""
        try:
            # 사용자가 이미 참가한 파티 제외
            subquery = self._session.query(PartyMemberModel.party_id).filter(
                PartyMemberModel.user_id == user_id
            ).subquery()

            party_models = self._session.query(PartyModel).filter(
                PartyModel.is_active == True,
                PartyModel.party_date >= date.today(),
                ~PartyModel.id.in_(subquery),
                PartyModel.host_user_id != user_id  # 자신이 호스트인 파티 제외
            ).order_by(PartyModel.party_date.asc()).limit(limit).all()

            return [self._mapper.to_entity(model) for model in party_models]

        except Exception as e:
            logger.error("참가 가능한 파티 조회 실패", user_id=user_id, error=str(e))
            raise

    def delete(self, party_id: int) -> bool:
        """파티 삭제"""
        try:
            party_model = self._session.get(PartyModel, party_id)
            if party_model is None:
                return False

            # 관련 파티 멤버도 삭제
            self._session.query(PartyMemberModel).filter(
                PartyMemberModel.party_id == party_id
            ).delete()

            self._session.delete(party_model)
            logger.debug("파티 삭제 완료", party_id=party_id)
            return True

        except Exception as e:
            logger.error("파티 삭제 실패", party_id=party_id, error=str(e))
            self._session.rollback()
            raise

    def count_by_host(self, host_user_id: int) -> int:
        """호스트별 파티 수 조회"""
        try:
            count = self._session.query(PartyModel).filter(
                PartyModel.host_user_id == host_user_id
            ).count()

            return count

        except Exception as e:
            logger.error("호스트별 파티 수 조회 실패", host_user_id=host_user_id, error=str(e))
            raise

    def exists(self, party_id: int) -> bool:
        """파티 존재 여부 확인"""
        try:
            return self._session.query(PartyModel).filter(
                PartyModel.id == party_id
            ).first() is not None

        except Exception as e:
            logger.error("파티 존재 여부 확인 실패", party_id=party_id, error=str(e))
            raise


class SQLUserRepository:
    """SQL 기반 사용자 저장소 구현"""

    def __init__(self, session: Session):
        self._session = session
        self._mapper = UserMapper()

    def save(self, user):
        """사용자 저장"""
        try:
            user_model = self._mapper.to_model(user)

            if user.id is None:
                self._session.add(user_model)
                self._session.flush()
                user.id = user_model.id
            else:
                existing_model = self._session.get(UserModel, user.id)
                if existing_model is None:
                    raise EntityNotFoundError(f"사용자 ID {user.id}를 찾을 수 없습니다")

                # 필드 업데이트
                existing_model.email = user.email
                existing_model.nickname = user.nickname
                existing_model.is_active = user.is_active
                existing_model.updated_at = datetime.utcnow()

            logger.debug("사용자 저장 완료", user_id=user.id)
            return user

        except Exception as e:
            logger.error("사용자 저장 실패", error=str(e))
            self._session.rollback()
            raise

    def find_by_id(self, user_id: int):
        """ID로 사용자 조회"""
        try:
            user_model = self._session.get(UserModel, user_id)
            if user_model is None:
                return None

            return self._mapper.to_entity(user_model)

        except Exception as e:
            logger.error("사용자 조회 실패", user_id=user_id, error=str(e))
            raise

    def find_by_employee_id(self, employee_id: str):
        """직원 ID로 사용자 조회"""
        try:
            user_model = self._session.query(UserModel).filter(
                UserModel.employee_id == employee_id
            ).first()

            if user_model is None:
                return None

            return self._mapper.to_entity(user_model)

        except Exception as e:
            logger.error("직원 ID로 사용자 조회 실패", employee_id=employee_id, error=str(e))
            raise

    def find_by_email(self, email: str):
        """이메일로 사용자 조회"""
        try:
            user_model = self._session.query(UserModel).filter(
                UserModel.email == email
            ).first()

            if user_model is None:
                return None

            return self._mapper.to_entity(user_model)

        except Exception as e:
            logger.error("이메일로 사용자 조회 실패", email=email, error=str(e))
            raise

    def find_active_users(self, limit: int = 100):
        """활성 사용자 조회"""
        try:
            user_models = self._session.query(UserModel).filter(
                UserModel.is_active == True
            ).order_by(UserModel.created_at.desc()).limit(limit).all()

            return [self._mapper.to_entity(model) for model in user_models]

        except Exception as e:
            logger.error("활성 사용자 조회 실패", error=str(e))
            raise

    def find_by_nickname(self, nickname: str):
        """닉네임으로 사용자 조회"""
        try:
            user_models = self._session.query(UserModel).filter(
                UserModel.nickname.ilike(f"%{nickname}%")
            ).all()

            return [self._mapper.to_entity(model) for model in user_models]

        except Exception as e:
            logger.error("닉네임으로 사용자 조회 실패", nickname=nickname, error=str(e))
            raise

    def delete(self, user_id: int) -> bool:
        """사용자 삭제"""
        try:
            user_model = self._session.get(UserModel, user_id)
            if user_model is None:
                return False

            self._session.delete(user_model)
            logger.debug("사용자 삭제 완료", user_id=user_id)
            return True

        except Exception as e:
            logger.error("사용자 삭제 실패", user_id=user_id, error=str(e))
            self._session.rollback()
            raise

    def exists(self, user_id: int) -> bool:
        """사용자 존재 여부 확인"""
        try:
            return self._session.query(UserModel).filter(
                UserModel.id == user_id
            ).first() is not None

        except Exception as e:
            logger.error("사용자 존재 여부 확인 실패", user_id=user_id, error=str(e))
            raise

    def count_active_users(self) -> int:
        """활성 사용자 수 조회"""
        try:
            count = self._session.query(UserModel).filter(
                UserModel.is_active == True
            ).count()

            return count

        except Exception as e:
            logger.error("활성 사용자 수 조회 실패", error=str(e))
            raise


class SQLPartyMemberRepository:
    """SQL 기반 파티 멤버 저장소 구현"""

    def __init__(self, session: Session):
        self._session = session
        self._mapper = PartyMemberMapper()

    def save(self, party_member):
        """파티 멤버 저장"""
        try:
            party_member_model = self._mapper.to_model(party_member)

            if party_member.id is None:
                self._session.add(party_member_model)
                self._session.flush()
                party_member.id = party_member_model.id

            logger.debug("파티 멤버 저장 완료", party_member_id=party_member.id)
            return party_member

        except Exception as e:
            logger.error("파티 멤버 저장 실패", error=str(e))
            self._session.rollback()
            raise

    def find_by_party(self, party_id: int):
        """파티별 멤버 조회"""
        try:
            member_models = self._session.query(PartyMemberModel).filter(
                PartyMemberModel.party_id == party_id
            ).order_by(PartyMemberModel.joined_at.asc()).all()

            return [self._mapper.to_entity(model) for model in member_models]

        except Exception as e:
            logger.error("파티별 멤버 조회 실패", party_id=party_id, error=str(e))
            raise

    def find_by_user(self, user_id: int):
        """사용자별 참가 파티 조회"""
        try:
            member_models = self._session.query(PartyMemberModel).filter(
                PartyMemberModel.user_id == user_id
            ).order_by(PartyMemberModel.joined_at.desc()).all()

            return [self._mapper.to_entity(model) for model in member_models]

        except Exception as e:
            logger.error("사용자별 참가 파티 조회 실패", user_id=user_id, error=str(e))
            raise

    def find_by_party_and_user(self, party_id: int, user_id: int):
        """특정 파티의 특정 사용자 멤버십 조회"""
        try:
            member_model = self._session.query(PartyMemberModel).filter(
                PartyMemberModel.party_id == party_id,
                PartyMemberModel.user_id == user_id
            ).first()

            if member_model is None:
                return None

            return self._mapper.to_entity(member_model)

        except Exception as e:
            logger.error("파티-사용자 멤버십 조회 실패",
                        party_id=party_id, user_id=user_id, error=str(e))
            raise

    def delete(self, party_id: int, user_id: int) -> bool:
        """파티 멤버 삭제 (탈퇴)"""
        try:
            member_model = self._session.query(PartyMemberModel).filter(
                PartyMemberModel.party_id == party_id,
                PartyMemberModel.user_id == user_id
            ).first()

            if member_model is None:
                return False

            self._session.delete(member_model)
            logger.debug("파티 멤버 삭제 완료", party_id=party_id, user_id=user_id)
            return True

        except Exception as e:
            logger.error("파티 멤버 삭제 실패",
                        party_id=party_id, user_id=user_id, error=str(e))
            self._session.rollback()
            raise

    def count_by_party(self, party_id: int) -> int:
        """파티별 멤버 수 조회"""
        try:
            count = self._session.query(PartyMemberModel).filter(
                PartyMemberModel.party_id == party_id
            ).count()

            return count

        except Exception as e:
            logger.error("파티별 멤버 수 조회 실패", party_id=party_id, error=str(e))
            raise

    def is_member(self, party_id: int, user_id: int) -> bool:
        """파티 멤버 여부 확인"""
        try:
            return self._session.query(PartyMemberModel).filter(
                PartyMemberModel.party_id == party_id,
                PartyMemberModel.user_id == user_id
            ).first() is not None

        except Exception as e:
            logger.error("파티 멤버 여부 확인 실패",
                        party_id=party_id, user_id=user_id, error=str(e))
            raise


class SQLPartyQueryRepository:
    """SQL 기반 파티 복합 쿼리 저장소 구현"""

    def __init__(self, session: Session):
        self._session = session

    def find_parties_with_member_count(self, limit: int = 10) -> list[dict[str, Any]]:
        """멤버 수가 포함된 파티 목록 조회"""
        try:
            query = text("""
                SELECT 
                    p.id,
                    p.title,
                    p.restaurant_name,
                    p.party_date,
                    p.party_time,
                    p.max_members,
                    COUNT(pm.id) as member_count,
                    p.created_at
                FROM party p
                LEFT JOIN party_member pm ON p.id = pm.party_id
                WHERE p.is_active = true
                GROUP BY p.id, p.title, p.restaurant_name, p.party_date, p.party_time, p.max_members, p.created_at
                ORDER BY p.party_date ASC
                LIMIT :limit
            """)

            result = self._session.execute(query, {"limit": limit})
            return [dict(row._mapping) for row in result]

        except Exception as e:
            logger.error("멤버 수 포함 파티 조회 실패", error=str(e))
            raise

    def find_parties_by_user_participation(self, user_id: int) -> list[dict[str, Any]]:
        """사용자 참여 파티 조회 (상세 정보 포함)"""
        try:
            query = text("""
                SELECT 
                    p.id,
                    p.title,
                    p.restaurant_name,
                    p.party_date,
                    p.party_time,
                    p.max_members,
                    pm.is_host,
                    pm.joined_at,
                    u.nickname as host_nickname
                FROM party p
                JOIN party_member pm ON p.id = pm.party_id
                JOIN users u ON p.host_user_id = u.id
                WHERE pm.user_id = :user_id
                ORDER BY p.party_date DESC
            """)

            result = self._session.execute(query, {"user_id": user_id})
            return [dict(row._mapping) for row in result]

        except Exception as e:
            logger.error("사용자 참여 파티 조회 실패", user_id=user_id, error=str(e))
            raise

    def find_upcoming_parties_with_restaurant_info(self, limit: int = 10) -> list[dict[str, Any]]:
        """식당 정보가 포함된 다가오는 파티 조회"""
        try:
            query = text("""
                SELECT 
                    p.id,
                    p.title,
                    p.restaurant_name,
                    p.restaurant_address,
                    p.party_date,
                    p.party_time,
                    p.max_members,
                    p.description,
                    u.nickname as host_nickname,
                    COUNT(pm.id) as member_count
                FROM party p
                JOIN users u ON p.host_user_id = u.id
                LEFT JOIN party_member pm ON p.id = pm.party_id
                WHERE p.is_active = true 
                  AND p.party_date >= CURRENT_DATE
                GROUP BY p.id, p.title, p.restaurant_name, p.restaurant_address, 
                         p.party_date, p.party_time, p.max_members, p.description, u.nickname
                ORDER BY p.party_date ASC, p.party_time ASC
                LIMIT :limit
            """)

            result = self._session.execute(query, {"limit": limit})
            return [dict(row._mapping) for row in result]

        except Exception as e:
            logger.error("식당 정보 포함 다가오는 파티 조회 실패", error=str(e))
            raise

    def get_party_statistics(self, user_id: int) -> dict[str, Any]:
        """사용자 파티 통계 조회"""
        try:
            query = text("""
                SELECT 
                    COUNT(DISTINCT p.id) as hosted_parties,
                    COUNT(DISTINCT pm.party_id) as joined_parties,
                    COUNT(DISTINCT CASE WHEN p.party_date >= CURRENT_DATE THEN p.id END) as upcoming_hosted,
                    COUNT(DISTINCT CASE WHEN p.party_date >= CURRENT_DATE THEN pm.party_id END) as upcoming_joined
                FROM users u
                LEFT JOIN party p ON u.id = p.host_user_id AND p.is_active = true
                LEFT JOIN party_member pm ON u.id = pm.user_id
                WHERE u.id = :user_id
            """)

            result = self._session.execute(query, {"user_id": user_id}).first()
            return dict(result._mapping) if result else {}

        except Exception as e:
            logger.error("사용자 파티 통계 조회 실패", user_id=user_id, error=str(e))
            raise
