"""
통합 인증 미들웨어
모든 API에서 일관된 인증 처리를 위한 중앙화된 인증 시스템
"""

import os
import hashlib
from functools import wraps
from flask import request, jsonify
from typing import Any
from collections.abc import Callable

from backend.auth.utils import AuthUtils

class UnifiedAuthMiddleware:
    """통합 인증 미들웨어 클래스"""

    def __init__(self):
        self.dev_token = 'dev-token-12345'
        self.is_development = os.getenv('FLASK_ENV') == 'development'
        self.debug_mode = os.getenv('FLASK_DEBUG') == 'True'

        # 인증 통계
        self.auth_stats = {
            'total_requests': 0,
            'successful_auths': 0,
            'failed_auths': 0,
            'dev_token_usage': 0,
            'jwt_token_usage': 0
        }

    def log_auth_attempt(self, endpoint: str, success: bool, auth_type: str = 'unknown'):
        """인증 시도 로깅"""
        if self.debug_mode:
            status = "✅ SUCCESS" if success else "❌ FAILED"
            print(f"🔐 [UnifiedAuth] {status} - {auth_type} - {endpoint}")

        # 통계 업데이트
        self.auth_stats['total_requests'] += 1
        if success:
            self.auth_stats['successful_auths'] += 1
            if auth_type == 'dev':
                self.auth_stats['dev_token_usage'] += 1
            elif auth_type == 'jwt':
                self.auth_stats['jwt_token_usage'] += 1
        else:
            self.auth_stats['failed_auths'] += 1

    def validate_auth_header(self, auth_header: str) -> tuple[bool, str, str]:
        """인증 헤더 검증"""
        if not auth_header:
            return False, "missing", "Authorization header missing"

        if not auth_header.startswith('Bearer '):
            return False, "invalid_format", "Invalid authorization header format"

        try:
            token = auth_header.split(' ')[1]
            if not token:
                return False, "empty_token", "Empty token"

            return True, "valid", token
        except IndexError:
            return False, "invalid_format", "Invalid authorization header format"

    def handle_dev_token(self, token: str, endpoint: str) -> tuple[bool, Any | None, str]:
        """개발용 토큰 처리"""
        if not self.is_development:
            self.log_auth_attempt(endpoint, False, 'dev')
            return False, None, "Development token not allowed in production"

        if token != self.dev_token:
            self.log_auth_attempt(endpoint, False, 'dev')
            return False, None, "Invalid development token"

        try:
            # 개발용 사용자 조회 또는 생성
            from backend.auth.models import User

            user = User.query.filter_by(employee_id='1').first()
            if not user:
                # 개발용 사용자 생성
                user = User(
                    employee_id='1',
                    email='dev@example.com',
                    nickname='개발자',
                    is_active=True
                )
                from backend.app.extensions import db
                db.session.add(user)
                db.session.commit()
                print(f"🔧 [UnifiedAuth] 개발용 사용자 생성됨: {user.employee_id}")

            self.log_auth_attempt(endpoint, True, 'dev')
            return True, user, "Development authentication successful"

        except Exception as e:
            self.log_auth_attempt(endpoint, False, 'dev')
            return False, None, f"Development authentication failed: {str(e)}"

    def handle_jwt_token(self, token: str, endpoint: str) -> tuple[bool, Any | None, str]:
        """JWT 토큰 처리"""
        try:
            # JWT 토큰 검증
            payload = AuthUtils.verify_jwt_token(token)
            if not payload:
                self.log_auth_attempt(endpoint, False, 'jwt')
                return False, None, "Invalid or expired JWT token"

            # 토큰 타입 확인
            if payload.get('token_type') != 'access':
                self.log_auth_attempt(endpoint, False, 'jwt')
                return False, None, "Invalid token type"

            # 토큰 무효화 여부 확인
            token_hash = hashlib.sha256(token.encode()).hexdigest()
            if AuthUtils.is_token_revoked(token_hash):
                self.log_auth_attempt(endpoint, False, 'jwt')
                return False, None, "Token has been revoked"

            # 사용자 조회
            from backend.auth.models import User
            user = User.query.get(payload['user_id'])
            if not user or not user.is_active:
                self.log_auth_attempt(endpoint, False, 'jwt')
                return False, None, "User not found or inactive"

            self.log_auth_attempt(endpoint, True, 'jwt')
            return True, user, "JWT authentication successful"

        except Exception as e:
            self.log_auth_attempt(endpoint, False, 'jwt')
            return False, None, f"JWT authentication failed: {str(e)}"

    def authenticate(self, endpoint: str = None) -> tuple[bool, Any | None, str]:
        """통합 인증 처리"""
        if not endpoint:
            endpoint = request.endpoint or 'unknown'

        # 인증 헤더 검증
        auth_header = request.headers.get('Authorization')
        is_valid, error_type, token_or_error = self.validate_auth_header(auth_header)

        if not is_valid:
            self.log_auth_attempt(endpoint, False, 'header')
            return False, None, token_or_error

        token = token_or_error

        # 개발용 토큰 확인
        if self.is_development and token == self.dev_token:
            return self.handle_dev_token(token, endpoint)

        # JWT 토큰 처리
        return self.handle_jwt_token(token, endpoint)

    def get_auth_stats(self) -> dict[str, Any]:
        """인증 통계 반환"""
        return {
            **self.auth_stats,
            'success_rate': (
                self.auth_stats['successful_auths'] / self.auth_stats['total_requests'] * 100
                if self.auth_stats['total_requests'] > 0 else 0
            ),
            'is_development': self.is_development,
            'debug_mode': self.debug_mode
        }

    def reset_auth_stats(self):
        """인증 통계 초기화"""
        self.auth_stats = {
            'total_requests': 0,
            'successful_auths': 0,
            'failed_auths': 0,
            'dev_token_usage': 0,
            'jwt_token_usage': 0
        }

# 전역 인증 미들웨어 인스턴스
unified_auth = UnifiedAuthMiddleware()

def require_auth(allow_public: bool = False):
    """
    인증이 필요한 API를 위한 데코레이터
    
    Args:
        allow_public: 공개 API인 경우 True (인증 없이 접근 가능)
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # 공개 API인 경우 인증 건너뛰기
            if allow_public:
                return f(*args, **kwargs)

            # 인증 처리
            success, user, message = unified_auth.authenticate()

            if not success:
                return jsonify({
                    'error': 'Authentication failed',
                    'message': message,
                    'endpoint': request.endpoint
                }), 401

            # request 객체에 사용자 정보 추가
            request.current_user = user

            return f(*args, **kwargs)

        return decorated_function
    return decorator

def optional_auth():
    """
    선택적 인증 데코레이터
    인증이 있으면 사용자 정보를 설정하고, 없어도 API 호출 허용
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # 인증 시도 (실패해도 계속 진행)
            success, user, message = unified_auth.authenticate()

            if success:
                request.current_user = user
            else:
                request.current_user = None

            return f(*args, **kwargs)

        return decorated_function
    return decorator

def dev_only():
    """
    개발 환경에서만 접근 가능한 API를 위한 데코레이터
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not unified_auth.is_development:
                return jsonify({
                    'error': 'Development only endpoint',
                    'message': 'This endpoint is only available in development mode'
                }), 403

            return f(*args, **kwargs)

        return decorated_function
    return decorator

def admin_only():
    """
    관리자만 접근 가능한 API를 위한 데코레이터
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # 먼저 인증 확인
            success, user, message = unified_auth.authenticate()

            if not success:
                return jsonify({
                    'error': 'Authentication required',
                    'message': message
                }), 401

            # 관리자 권한 확인
            if not hasattr(user, 'is_admin') or not user.is_admin:
                return jsonify({
                    'error': 'Admin access required',
                    'message': 'This endpoint requires administrator privileges'
                }), 403

            request.current_user = user
            return f(*args, **kwargs)

        return decorated_function
    return decorator

# Blueprint용 인증 가드 함수
def auth_guard(allow_public: bool = False):
    """
    Blueprint의 before_request에서 사용하는 인증 가드 함수
    
    Args:
        allow_public: 공개 API인 경우 True
    """
    def guard_function():
        if allow_public:
            return None

        success, user, message = unified_auth.authenticate()

        if not success:
            return jsonify({
                'error': 'Authentication failed',
                'message': message,
                'endpoint': request.endpoint
            }), 401

        request.current_user = user
        return None

    return guard_function

# 인증 상태 확인 헬퍼 함수
def get_current_user():
    """현재 인증된 사용자 정보 반환"""
    return getattr(request, 'current_user', None)

def is_authenticated():
    """인증 상태 확인"""
    return get_current_user() is not None

def get_user_id():
    """현재 사용자의 ID 반환"""
    user = get_current_user()
    return user.id if user else None

def get_employee_id():
    """현재 사용자의 직원 ID 반환"""
    user = get_current_user()
    return user.employee_id if user else None
