#!/usr/bin/env python3
"""
사용자 도메인 엔티티
순수 도메인 로직만 포함하며 외부 의존성이 없습니다.
"""

from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime
import hashlib
import secrets
import bcrypt

from backend.core.exceptions import ValidationError, UserDomainError
from backend.core.value_objects.user_id import UserId


@dataclass
class User:
    """사용자 도메인 엔티티"""
    
    id: Optional[UserId]  # 내부 ID (데이터베이스에서 설정)
    employee_id: str
    email: str
    nickname: str
    password_hash: Optional[str] = None
    is_active: bool = True
    created_at: Optional[datetime] = field(default_factory=datetime.utcnow)
    
    def __post_init__(self):
        """생성 후 검증"""
        self._validate()
    
    @classmethod
    def create(
        cls,
        employee_id: str,
        email: str,
        nickname: str,
        password: Optional[str] = None
    ) -> 'User':
        """사용자 생성 팩토리 메서드"""
        password_hash = None
        if password:
            password_hash = cls._hash_password(password)
        
        return cls(
            id=None,  # 데이터베이스에서 설정됨
            employee_id=employee_id,
            email=email,
            nickname=nickname,
            password_hash=password_hash,
            is_active=True
        )
    
    def _validate(self):
        """도메인 검증 규칙"""
        if not self.employee_id or len(self.employee_id.strip()) == 0:
            raise ValidationError("직원 ID는 필수입니다")
        
        if not self.email or len(self.email.strip()) == 0:
            raise ValidationError("이메일은 필수입니다")
        
        if not self._is_valid_email(self.email):
            raise ValidationError("올바른 이메일 형식이 아닙니다")
        
        if not self.nickname or len(self.nickname.strip()) == 0:
            raise ValidationError("닉네임은 필수입니다")
        
        if len(self.nickname) < 2:
            raise ValidationError("닉네임은 최소 2자 이상이어야 합니다")
        
        if len(self.nickname) > 20:
            raise ValidationError("닉네임은 최대 20자까지 가능합니다")
    
    @staticmethod
    def _is_valid_email(email: str) -> bool:
        """이메일 형식 검증"""
        import re
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None
    
    @staticmethod
    def _hash_password(password: str) -> str:
        """비밀번호 해싱"""
        if not password:
            raise ValidationError("비밀번호는 필수입니다")
        
        if len(password) < 8:
            raise ValidationError("비밀번호는 최소 8자 이상이어야 합니다")
        
        # BCrypt로 해싱
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')
    
    def verify_password(self, password: str) -> bool:
        """비밀번호 검증"""
        if not self.password_hash:
            return False
        
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))
    
    def change_password(self, new_password: str) -> None:
        """비밀번호 변경"""
        self.password_hash = self._hash_password(new_password)
    
    def update_nickname(self, new_nickname: str) -> None:
        """닉네임 수정"""
        if not new_nickname or len(new_nickname.strip()) == 0:
            raise ValidationError("닉네임은 필수입니다")
        
        if len(new_nickname) < 2:
            raise ValidationError("닉네임은 최소 2자 이상이어야 합니다")
        
        if len(new_nickname) > 20:
            raise ValidationError("닉네임은 최대 20자까지 가능합니다")
        
        self.nickname = new_nickname.strip()
    
    def update_email(self, new_email: str) -> None:
        """이메일 수정"""
        if not new_email or len(new_email.strip()) == 0:
            raise ValidationError("이메일은 필수입니다")
        
        if not self._is_valid_email(new_email):
            raise ValidationError("올바른 이메일 형식이 아닙니다")
        
        self.email = new_email.strip()
    
    def activate(self) -> None:
        """사용자 활성화"""
        if self.is_active:
            raise UserDomainError("이미 활성화된 사용자입니다")
        
        self.is_active = True
    
    def deactivate(self) -> None:
        """사용자 비활성화"""
        if not self.is_active:
            raise UserDomainError("이미 비활성화된 사용자입니다")
        
        self.is_active = False
    
    def is_admin(self) -> bool:
        """관리자 여부 확인"""
        # 간단한 구현 - 실제로는 역할 기반 시스템 사용
        admin_employee_ids = ['ADMIN001', 'ADMIN002']
        return self.employee_id in admin_employee_ids
    
    def can_modify_user(self, target_user: 'User') -> bool:
        """다른 사용자 정보 수정 권한 확인"""
        # 본인 또는 관리자만 수정 가능
        return self.id == target_user.id or self.is_admin()
    
    def get_display_name(self) -> str:
        """표시용 이름 반환"""
        return self.nickname
    
    def is_new_user(self) -> bool:
        """신규 사용자 여부 확인 (7일 이내 가입)"""
        if not self.created_at:
            return False
        
        from datetime import timedelta
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        return self.created_at >= seven_days_ago
    
    def get_account_age_days(self) -> int:
        """계정 생성 후 경과 일수"""
        if not self.created_at:
            return 0
        
        delta = datetime.utcnow() - self.created_at
        return delta.days
    
    def __str__(self) -> str:
        """문자열 표현"""
        return f"User(employee_id={self.employee_id}, nickname={self.nickname})"
    
    def __repr__(self) -> str:
        """디버그용 문자열 표현"""
        return f"User(id={self.id}, employee_id={self.employee_id}, nickname={self.nickname}, is_active={self.is_active})"
