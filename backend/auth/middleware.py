"""
인증 미들웨어 공통 함수
"""
from flask import request, jsonify
from functools import wraps

def check_authentication():
    """공통 인증 검사 함수"""
    from auth.utils import AuthUtils
    import os

    # 인증 헤더 확인
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return jsonify({'error': 'Authorization header missing'}), 401

    try:
        # Bearer 토큰 추출
        token = auth_header.split(' ')[1]

        # 개발용 토큰 확인 (개발 환경에서만)
        if os.getenv('FLASK_ENV') == 'development' and token == 'dev-token-12345':
            # 개발용 사용자 조회 (employee_id=1)
            from auth.models import User as AuthUser
            user = AuthUser.query.filter_by(employee_id='1').first()
            if not user:
                # 개발용 사용자 생성
                user = AuthUser(
                    employee_id='1',
                    email='dev@example.com',
                    nickname='개발자',
                    is_active=True
                )
                from auth.models import db
                db.session.add(user)
                db.session.commit()

            request.current_user = user
            return None  # 인증 성공

        # 일반 JWT 토큰 검증
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
    except Exception:
        return jsonify({'error': 'Authentication failed'}), 401

def dev_auth_required(f):
    """개발용 인증이 필요한 API를 위한 데코레이터"""
    from functools import wraps
    from flask import request
    import os

    @wraps(f)
    def decorated_function(*args, **kwargs):
        # 개발 환경에서는 개발용 토큰으로 인증 우회
        if os.getenv('FLASK_ENV') == 'development':
            auth_header = request.headers.get('Authorization')
            if auth_header and 'dev-token-12345' in auth_header:
                # 개발용 사용자 설정
                from auth.models import User
                user = User.query.filter_by(employee_id='1').first()
                if not user:
                    user = User(
                        employee_id='1',
                        email='dev@example.com',
                        nickname='개발자',
                        is_active=True
                    )
                    from auth.models import db
                    db.session.add(user)
                    db.session.commit()

                request.current_user = user
                return f(*args, **kwargs)

        # 일반 인증 확인
        auth_result = check_authentication()
        if auth_result:
            return auth_result

        return f(*args, **kwargs)
    return decorated_function

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
