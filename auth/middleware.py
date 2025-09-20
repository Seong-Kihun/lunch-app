"""
인증 미들웨어 공통 함수
"""
from flask import request, jsonify
from functools import wraps

def check_authentication():
    """공통 인증 검사 함수"""
    from auth.utils import AuthUtils
    
    # 인증 헤더 확인
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return jsonify({'error': 'Authorization header missing'}), 401
    
    try:
        # Bearer 토큰 추출
        token = auth_header.split(' ')[1]
        
        # JWT 토큰 검증
        payload = AuthUtils.verify_jwt_token(token)
        if not payload:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        # 토큰 타입 확인
        if payload.get('token_type') != 'access':
            return jsonify({'error': 'Invalid token type'}), 401
        
        # 사용자 조회
        from auth.models import User as AuthUser
        user = AuthUser.query.get(payload['user_id'])
        if not user or not user.is_active:
            return jsonify({'error': 'User not found or inactive'}), 401
        
        # request 객체에 사용자 정보 추가
        request.current_user = user
        return None  # 인증 성공
        
    except (IndexError, KeyError):
        return jsonify({'error': 'Invalid authorization header format'}), 401
    except Exception as e:
        return jsonify({'error': 'Authentication failed'}), 401

def require_auth_decorator(f):
    """인증이 필요한 엔드포인트용 데코레이터"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_result = check_authentication()
        if auth_result:
            return auth_result
        return f(*args, **kwargs)
    return decorated_function

def optional_auth():
    """선택적 인증 (토큰이 있으면 검증, 없으면 통과)"""
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        request.current_user = None
        return None
    
    return check_authentication()
