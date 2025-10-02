#!/usr/bin/env python3
"""
사용자 서비스
사용자 관련 비즈니스 로직을 담당하는 서비스 계층입니다.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime

from backend.application.unit_of_work import UnitOfWork
from backend.application.repositories import UserRepository
from backend.core.exceptions import ValidationError, UserDomainError
from backend.infrastructure.unit_of_work_impl import get_unit_of_work
# import structlog
# logger = structlog.get_logger()

# 임시 로거 (structlog 설치 후 교체)
import logging
logger = logging.getLogger(__name__)


class UserService:
    """사용자 비즈니스 서비스"""
    
    def __init__(self, uow: Optional[UnitOfWork] = None):
        self._uow = uow or get_unit_of_work()
    
    def create_user(self, user_data: Dict[str, Any]):
        """사용자 생성"""
        logger.info("사용자 생성 시작", employee_id=user_data.get('employee_id'))
        
        with self._uow as uow:
            try:
                # 1. 중복 확인
                if uow.users.find_by_employee_id(user_data['employee_id']):
                    raise ValidationError(f"이미 존재하는 직원 ID: {user_data['employee_id']}")
                
                if uow.users.find_by_email(user_data['email']):
                    raise ValidationError(f"이미 존재하는 이메일: {user_data['email']}")
                
                # 2. 도메인 엔티티 생성
                from backend.core.entities.user import User
                user = User.create(
                    employee_id=user_data['employee_id'],
                    email=user_data['email'],
                    nickname=user_data['nickname'],
                    password=user_data.get('password')
                )
                
                # 3. 저장
                saved_user = uow.users.save(user)
                
                logger.info("사용자 생성 완료", user_id=saved_user.id, employee_id=saved_user.employee_id)
                return saved_user
                
            except Exception as e:
                logger.error("사용자 생성 실패", employee_id=user_data.get('employee_id'), error=str(e))
                raise
    
    def authenticate_user(self, employee_id: str, password: str):
        """사용자 인증"""
        logger.info("사용자 인증 시작", employee_id=employee_id)
        
        with self._uow as uow:
            try:
                # 1. 사용자 조회
                user = uow.users.find_by_employee_id(employee_id)
                if not user:
                    logger.warning("존재하지 않는 사용자", employee_id=employee_id)
                    return None
                
                # 2. 비밀번호 확인
                if not user.verify_password(password):
                    logger.warning("비밀번호 불일치", employee_id=employee_id)
                    return None
                
                # 3. 활성화 상태 확인
                if not user.is_active:
                    logger.warning("비활성화된 사용자", employee_id=employee_id)
                    return None
                
                logger.info("사용자 인증 성공", user_id=user.id, employee_id=employee_id)
                return user
                
            except Exception as e:
                logger.error("사용자 인증 실패", employee_id=employee_id, error=str(e))
                raise
    
    def update_user_profile(self, employee_id: str, update_data: Dict[str, Any]):
        """사용자 프로필 수정"""
        logger.info("사용자 프로필 수정 시작", employee_id=employee_id)
        
        with self._uow as uow:
            try:
                # 1. 사용자 존재 확인
                user = uow.users.find_by_employee_id(employee_id)
                if not user:
                    raise ValidationError(f"존재하지 않는 사용자: {employee_id}")
                
                # 2. 이메일 중복 확인 (다른 사용자와 중복되지 않는지)
                if 'email' in update_data and update_data['email'] != user.email:
                    existing_user = uow.users.find_by_email(update_data['email'])
                    if existing_user and existing_user.id != user.id:
                        raise ValidationError(f"이미 사용 중인 이메일: {update_data['email']}")
                
                # 3. 도메인 로직으로 수정
                if 'nickname' in update_data:
                    user.update_nickname(update_data['nickname'])
                
                if 'email' in update_data:
                    user.update_email(update_data['email'])
                
                # 4. 업데이트된 사용자 저장
                updated_user = uow.users.save(user)
                
                logger.info("사용자 프로필 수정 완료", user_id=updated_user.id, employee_id=employee_id)
                return updated_user
                
            except Exception as e:
                logger.error("사용자 프로필 수정 실패", employee_id=employee_id, error=str(e))
                raise
    
    def change_password(self, employee_id: str, current_password: str, new_password: str) -> bool:
        """비밀번호 변경"""
        logger.info("비밀번호 변경 시작", employee_id=employee_id)
        
        with self._uow as uow:
            try:
                # 1. 사용자 존재 확인
                user = uow.users.find_by_employee_id(employee_id)
                if not user:
                    raise ValidationError(f"존재하지 않는 사용자: {employee_id}")
                
                # 2. 현재 비밀번호 확인
                if not user.verify_password(current_password):
                    raise ValidationError("현재 비밀번호가 올바르지 않습니다")
                
                # 3. 새 비밀번호로 변경
                user.change_password(new_password)
                
                # 4. 업데이트된 사용자 저장
                uow.users.save(user)
                
                logger.info("비밀번호 변경 완료", user_id=user.id, employee_id=employee_id)
                return True
                
            except Exception as e:
                logger.error("비밀번호 변경 실패", employee_id=employee_id, error=str(e))
                raise
    
    def deactivate_user(self, employee_id: str, admin_employee_id: str) -> bool:
        """사용자 비활성화 (관리자만 가능)"""
        logger.info("사용자 비활성화 시작", employee_id=employee_id, admin_employee_id=admin_employee_id)
        
        with self._uow as uow:
            try:
                # 1. 관리자 권한 확인 (간단한 구현)
                admin_user = uow.users.find_by_employee_id(admin_employee_id)
                if not admin_user or not admin_user.is_admin():
                    raise UserDomainError("관리자 권한이 필요합니다")
                
                # 2. 대상 사용자 조회
                user = uow.users.find_by_employee_id(employee_id)
                if not user:
                    raise ValidationError(f"존재하지 않는 사용자: {employee_id}")
                
                # 3. 도메인 로직으로 비활성화
                user.deactivate()
                
                # 4. 업데이트된 사용자 저장
                uow.users.save(user)
                
                logger.info("사용자 비활성화 완료", user_id=user.id, employee_id=employee_id)
                return True
                
            except Exception as e:
                logger.error("사용자 비활성화 실패", employee_id=employee_id, error=str(e))
                raise
    
    def get_user_by_employee_id(self, employee_id: str):
        """직원 ID로 사용자 조회"""
        with self._uow as uow:
            try:
                user = uow.users.find_by_employee_id(employee_id)
                return user
                
            except Exception as e:
                logger.error("사용자 조회 실패", employee_id=employee_id, error=str(e))
                raise
    
    def get_user_by_id(self, user_id: int):
        """ID로 사용자 조회"""
        with self._uow as uow:
            try:
                user = uow.users.find_by_id(user_id)
                return user
                
            except Exception as e:
                logger.error("사용자 조회 실패", user_id=user_id, error=str(e))
                raise
    
    def search_users(self, query: str, limit: int = 20):
        """사용자 검색"""
        logger.info("사용자 검색 시작", query=query)
        
        with self._uow as uow:
            try:
                # 닉네임으로 검색
                users = uow.users.find_by_nickname(query)
                
                # 결과 제한
                if limit and len(users) > limit:
                    users = users[:limit]
                
                logger.info("사용자 검색 완료", query=query, result_count=len(users))
                return users
                
            except Exception as e:
                logger.error("사용자 검색 실패", query=query, error=str(e))
                raise
    
    def get_active_users(self, limit: int = 100):
        """활성 사용자 목록 조회"""
        with self._uow as uow:
            try:
                users = uow.users.find_active_users(limit)
                return users
                
            except Exception as e:
                logger.error("활성 사용자 목록 조회 실패", error=str(e))
                raise
    
    def get_user_statistics(self, employee_id: str) -> Dict[str, Any]:
        """사용자 통계 조회"""
        logger.info("사용자 통계 조회 시작", employee_id=employee_id)
        
        with self._uow as uow:
            try:
                user = uow.users.find_by_employee_id(employee_id)
                if not user:
                    raise ValidationError(f"존재하지 않는 사용자: {employee_id}")
                
                # 기본 통계 정보
                stats = {
                    'user_id': user.id,
                    'employee_id': user.employee_id,
                    'nickname': user.nickname,
                    'email': user.email,
                    'is_active': user.is_active,
                    'created_at': user.created_at.isoformat() if user.created_at else None,
                    'last_login': None,  # 실제로는 로그인 이력 테이블에서 조회
                }
                
                logger.info("사용자 통계 조회 완료", user_id=user.id, employee_id=employee_id)
                return stats
                
            except Exception as e:
                logger.error("사용자 통계 조회 실패", employee_id=employee_id, error=str(e))
                raise


class UserAuthenticationService:
    """사용자 인증 전용 서비스"""
    
    def __init__(self, uow: Optional[UnitOfWork] = None):
        self._uow = uow or get_unit_of_work()
    
    def login(self, employee_id: str, password: str) -> Dict[str, Any]:
        """로그인"""
        logger.info("로그인 시도", employee_id=employee_id)
        
        with self._uow as uow:
            try:
                # 1. 사용자 인증
                user = uow.users.find_by_employee_id(employee_id)
                if not user:
                    raise ValidationError("존재하지 않는 사용자입니다")
                
                if not user.verify_password(password):
                    raise ValidationError("비밀번호가 올바르지 않습니다")
                
                if not user.is_active:
                    raise ValidationError("비활성화된 계정입니다")
                
                # 2. 로그인 성공 정보 반환
                login_result = {
                    'success': True,
                    'user_id': user.id,
                    'employee_id': user.employee_id,
                    'nickname': user.nickname,
                    'email': user.email,
                    'login_time': datetime.utcnow().isoformat()
                }
                
                logger.info("로그인 성공", user_id=user.id, employee_id=employee_id)
                return login_result
                
            except ValidationError:
                logger.warning("로그인 실패 - 인증 오류", employee_id=employee_id)
                raise
            except Exception as e:
                logger.error("로그인 실패", employee_id=employee_id, error=str(e))
                raise
    
    def logout(self, employee_id: str) -> bool:
        """로그아웃"""
        logger.info("로그아웃", employee_id=employee_id)
        # 실제로는 토큰 무효화 등의 작업 수행
        return True
    
    def validate_token(self, token: str):
        """토큰 검증"""
        # JWT 토큰 검증 로직
        # 실제로는 JWT 서비스와 연동
        pass
