from flask import Blueprint, request, jsonify, current_app
from datetime import datetime, timedelta
import re
from backend.config.auth_config import AuthConfig

# 인증 블루프린트 생성
auth_bp = Blueprint('auth', __name__, url_prefix='/auth')


@auth_bp.route('/test-login/<employee_id>', methods=['GET'])
def test_login(employee_id):
    """개발/테스트용 임시 로그인 (프로덕션에서는 제거)"""
    try:
        from .models import User
        from .utils import AuthUtils
        
        # 테스트용 사용자 조회
        user = User.query.filter_by(employee_id=employee_id).first()
        
        if not user:
            return jsonify({'error': f'사용자를 찾을 수 없습니다: {employee_id}'}), 404
        
        # 액세스 토큰과 리프레시 토큰 발급
        access_token = AuthUtils.generate_jwt_token(user.id, 'access')
        refresh_token, _ = AuthUtils.create_refresh_token(user.id)
        
        return jsonify({
            'type': 'test_login',
            'user': user.to_dict(),
            'access_token': access_token,
            'refresh_token': refresh_token,
            'message': '테스트 로그인 성공'
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"테스트 로그인 실패: {str(e)}")
        import traceback
        current_app.logger.error(f"테스트 로그인 오류 상세: {traceback.format_exc()}")
        return jsonify({
            'error': '서버 오류가 발생했습니다.',
            'details': str(e),
            'type': type(e).__name__
        }), 500


@auth_bp.route('/login', methods=['POST'])
def login_with_password():
    """아이디/비밀번호로 로그인"""
    from .models import User
    from .utils import AuthUtils
    
    try:
        data = request.get_json()
        
        if not data or 'email' not in data or 'password' not in data:
            return jsonify({'error': '이메일과 비밀번호가 필요합니다.'}), 400
        
        email = data['email'].strip().lower()
        password = data['password']
        
        # 이메일 형식 검증
        if not re.match(r'^[a-zA-Z0-9._%+-]+@koica\.go\.kr$', email):
            return jsonify({'error': 'KOICA 이메일 주소만 사용 가능합니다.'}), 400
        
        # 사용자 조회
        user = User.query.filter_by(email=email).first()
        
        if not user:
            return jsonify({'error': '존재하지 않는 사용자입니다.'}), 401
        
        # 계정 잠금 확인
        if user.is_account_locked():
            return jsonify({'error': '계정이 잠겨있습니다. 잠시 후 다시 시도해주세요.'}), 423
        
        # 비밀번호 검증
        if not user.check_password(password):
            # 실패한 로그인 시도 기록
            user.increment_failed_attempts()
            from .models import db
            db.session.commit()
            
            return jsonify({'error': '비밀번호가 올바르지 않습니다.'}), 401
        
        # 로그인 성공 - 실패 횟수 초기화
        user.reset_failed_attempts()
        user.last_login_date = datetime.utcnow()
        
        # 토큰 생성
        access_token = AuthUtils.generate_jwt_token(user.id, 'access')
        refresh_token, _ = AuthUtils.create_refresh_token(user.id)
        
        from .models import db
        db.session.commit()
        
        return jsonify({
            'message': '로그인 성공',
            'user': user.to_dict(),
            'access_token': access_token,
            'refresh_token': refresh_token
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"비밀번호 로그인 실패: {str(e)}")
        return jsonify({
            'error': '서버 오류가 발생했습니다.',
            'details': str(e),
            'type': type(e).__name__
        }), 500

@auth_bp.route('/change-password', methods=['POST'])
def change_password():
    """비밀번호 변경"""
    from .models import User, db
    from .utils import AuthUtils
    
    try:
        # 인증 확인
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': '인증이 필요합니다.'}), 401
        
        token = auth_header.split(' ')[1]
        payload = AuthUtils.verify_jwt_token(token)
        
        if not payload or payload.get('token_type') != 'access':
            return jsonify({'error': '유효하지 않은 토큰입니다.'}), 401
        
        user_id = payload.get('user_id')
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': '사용자를 찾을 수 없습니다.'}), 404
        
        data = request.get_json()
        
        if not data or 'current_password' not in data or 'new_password' not in data:
            return jsonify({'error': '현재 비밀번호와 새 비밀번호가 필요합니다.'}), 400
        
        current_password = data['current_password']
        new_password = data['new_password']
        
        # 현재 비밀번호 확인
        if not user.check_password(current_password):
            return jsonify({'error': '현재 비밀번호가 올바르지 않습니다.'}), 401
        
        # 새 비밀번호 유효성 검사
        if len(new_password) < 8:
            return jsonify({'error': '비밀번호는 최소 8자 이상이어야 합니다.'}), 400
        
        # 비밀번호 변경
        user.set_password(new_password)
        db.session.commit()
        
        return jsonify({'message': '비밀번호가 성공적으로 변경되었습니다.'}), 200
        
    except Exception as e:
        current_app.logger.error(f"비밀번호 변경 실패: {str(e)}")
        return jsonify({
            'error': '서버 오류가 발생했습니다.',
            'details': str(e),
            'type': type(e).__name__
        }), 500

@auth_bp.route('/register', methods=['POST'])
def register_user():
    """신규 사용자 회원가입"""
    # 지연 import로 순환 참조 방지
    from .models import User, db
    from .utils import AuthUtils
    
    try:
        data = request.get_json()
        
        # 필수 필드 검증
        if not data:
            return jsonify({'error': '요청 데이터가 없습니다.'}), 400
        
        email = data.get('email', '').strip()
        password = data.get('password', '').strip()
        
        if not email:
            return jsonify({'error': '이메일이 필요합니다.'}), 400
        
        if not password:
            return jsonify({'error': '비밀번호가 필요합니다.'}), 400
        
        if len(password) < 8:
            return jsonify({'error': '비밀번호는 8자 이상이어야 합니다.'}), 400
        
        # 이메일 형식 검증
        if not email.endswith('@koica.go.kr'):
            return jsonify({'error': 'KOICA 이메일 주소를 사용해주세요.'}), 400
        
        # 이메일 중복 확인
        if User.query.filter_by(email=email).first():
            return jsonify({'error': '이미 사용 중인 이메일입니다.'}), 400
        
        # 사용자 생성 (닉네임은 이메일에서 자동 생성)
        nickname = email.split('@')[0]  # 이메일 아이디 부분을 닉네임으로 사용
        employee_id = AuthUtils.generate_employee_id()
        
        user = User(
            email=email,
            nickname=nickname,
            employee_id=employee_id
        )
        
        # 비밀번호 설정
        user.set_password(password)
        
        db.session.add(user)
        db.session.commit()
        
        # 토큰 발급
        access_token = AuthUtils.generate_jwt_token(user.id, 'access')
        refresh_token, _ = AuthUtils.create_refresh_token(user.id)
        
        return jsonify({
            'message': '회원가입이 완료되었습니다.',
            'user': user.to_dict(),
            'access_token': access_token,
            'refresh_token': refresh_token
        }), 201
        
    except Exception as e:
        current_app.logger.error(f"회원가입 실패: {str(e)}")
        import traceback
        current_app.logger.error(f"회원가입 오류 상세: {traceback.format_exc()}")
        return jsonify({
            'error': '서버 오류가 발생했습니다.',
            'details': str(e),
            'type': type(e).__name__
        }), 500

@auth_bp.route('/refresh', methods=['POST'])
def refresh_access_token():
    """액세스 토큰 갱신"""
    # 지연 import로 순환 참조 방지
    from .utils import AuthUtils
    
    try:
        data = request.get_json()
        
        if not data or 'refresh_token' not in data:
            return jsonify({'error': '리프레시 토큰이 필요합니다.'}), 400
        
        refresh_token = data['refresh_token']
        
        # 리프레시 토큰 검증
        user = AuthUtils.verify_refresh_token(refresh_token)
        
        if not user:
            return jsonify({'error': '유효하지 않거나 만료된 리프레시 토큰입니다.'}), 401
        
        # 새로운 액세스 토큰 발급
        new_access_token = AuthUtils.generate_jwt_token(user.id, 'access')
        
        return jsonify({
            'access_token': new_access_token,
            'message': '토큰이 갱신되었습니다.'
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"토큰 갱신 실패: {str(e)}")
        import traceback
        current_app.logger.error(f"토큰 갱신 오류 상세: {traceback.format_exc()}")
        return jsonify({
            'error': '서버 오류가 발생했습니다.',
            'details': str(e),
            'type': type(e).__name__
        }), 500

@auth_bp.route('/logout', methods=['POST'])
def logout():
    """로그아웃"""
    # 지연 import로 순환 참조 방지
    from .utils import AuthUtils
    
    try:
        data = request.get_json()
        
        if not data or 'refresh_token' not in data:
            return jsonify({'error': '리프레시 토큰이 필요합니다.'}), 400
        
        refresh_token = data['refresh_token']
        
        # 리프레시 토큰 무효화
        if AuthUtils.revoke_refresh_token(refresh_token):
            return jsonify({'message': '로그아웃 되었습니다.'}), 200
        else:
            return jsonify({'error': '유효하지 않은 토큰입니다.'}), 400
            
    except Exception as e:
        current_app.logger.error(f"로그아웃 실패: {str(e)}")
        import traceback
        current_app.logger.error(f"로그아웃 오류 상세: {traceback.format_exc()}")
        return jsonify({
            'error': '서버 오류가 발생했습니다.',
            'details': str(e),
            'type': type(e).__name__
        }), 500

@auth_bp.route('/profile', methods=['GET'])
def get_profile():
    """사용자 프로필 조회"""
    # 지연 import로 순환 참조 방지
    from .utils import require_auth
    
    @require_auth
    def protected_profile():
        try:
            user = request.current_user
            return jsonify({
                'user': user.to_dict(),
                'message': '프로필 조회 성공'
            }), 200
            
        except Exception as e:
            current_app.logger.error(f"프로필 조회 실패: {str(e)}")
            import traceback
            current_app.logger.error(f"프로필 조회 오류 상세: {traceback.format_exc()}")
            return jsonify({
                'error': '서버 오류가 발생했습니다.',
                'details': str(e),
                'type': type(e).__name__
            }), 500
    
    return protected_profile()

@auth_bp.route('/profile', methods=['PUT'])
def update_profile():
    """사용자 프로필 수정"""
    # 지연 import로 순환 참조 방지
    from .utils import require_auth
    from .models import User, db
    
    @require_auth
    def protected_update():
        try:
            user = request.current_user
            data = request.get_json()
            
            if 'nickname' in data:
                nickname = data['nickname'].strip()
                
                # 입력값 검증
                if len(nickname) < 2 or len(nickname) > 8:
                    return jsonify({'error': '닉네임은 2~8자로 입력해주세요.'}), 400
                
                if not re.match(r'^[a-zA-Z0-9가-힣]+$', nickname):
                    return jsonify({'error': '닉네임에는 특수문자를 사용할 수 없습니다.'}), 400
                
                # 닉네임 중복 확인 (자신 제외)
                existing_user = User.query.filter_by(nickname=nickname).first()
                if existing_user and existing_user.id != user.id:
                    return jsonify({'error': '이미 사용 중인 닉네임입니다.'}), 400
                
                user.nickname = nickname
            
            if 'profile_image' in data:
                user.profile_image = data['profile_image']
            
            user.updated_at = datetime.utcnow()
            db.session.commit()
            
            return jsonify({
                'user': user.to_dict(),
                'message': '프로필이 수정되었습니다.'
            }), 200
            
        except Exception as e:
            current_app.logger.error(f"프로필 수정 실패: {str(e)}")
            import traceback
            current_app.logger.error(f"프로필 수정 오류 상세: {traceback.format_exc()}")
            return jsonify({
                'error': '서버 오류가 발생했습니다.',
                'details': str(e),
                'type': type(e).__name__
            }), 500
    
    return protected_update()

@auth_bp.route('/delete-account', methods=['DELETE'])
def delete_account():
    """계정 삭제"""
    # 지연 import로 순환 참조 방지
    from .utils import require_auth
    from .models import db
    
    @require_auth
    def protected_delete():
        try:
            user = request.current_user
            
            # 사용자 관련 데이터 삭제 (실제로는 비식별화 처리 권장)
            # 여기서는 간단하게 삭제 처리
            
            # 리프레시 토큰들 무효화
            for refresh_token in user.refresh_tokens:
                refresh_token.is_revoked = True
            
            # 사용자 비활성화
            user.is_active = False
            db.session.commit()
            
            return jsonify({'message': '계정이 성공적으로 삭제되었습니다.'}), 200
            
        except Exception as e:
            current_app.logger.error(f"계정 삭제 실패: {str(e)}")
            import traceback
            current_app.logger.error(f"계정 삭제 오류 상세: {traceback.format_exc()}")
            return jsonify({
                'error': '서버 오류가 발생했습니다.',
                'details': str(e),
                'type': type(e).__name__
            }), 500
    
    return protected_delete()

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """비밀번호 재설정 요청"""
    from .models import User, db
    from .utils import AuthUtils
    from .email_service import EmailService
    
    try:
        data = request.get_json()
        
        if not data or 'email' not in data:
            return jsonify({'error': '이메일이 필요합니다.'}), 400
        
        email = data['email'].strip().lower()
        
        # 이메일 형식 검증
        if not email.endswith('@koica.go.kr'):
            return jsonify({'error': 'KOICA 이메일 주소를 사용해주세요.'}), 400
        
        # 사용자 조회
        user = User.query.filter_by(email=email).first()
        
        if not user:
            # 보안을 위해 존재하지 않는 이메일이어도 성공 메시지 반환
            return jsonify({
                'message': '비밀번호 재설정 이메일을 발송했습니다.',
                'success': True
            }), 200
        
        # 임시 비밀번호 생성
        import secrets
        import string
        temp_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(8))
        
        # 사용자 비밀번호를 임시 비밀번호로 변경
        user.set_password(temp_password)
        db.session.commit()
        
        # 이메일 발송
        try:
            email_service = EmailService()
            email_service.send_password_reset_email(
                to_email=email,
                temp_password=temp_password,
                user_name=user.nickname
            )
        except Exception as e:
            current_app.logger.error(f"비밀번호 재설정 이메일 발송 실패: {str(e)}")
            # 이메일 발송 실패해도 성공으로 처리 (보안상)
        
        return jsonify({
            'message': '비밀번호 재설정 이메일을 발송했습니다.',
            'success': True
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"비밀번호 재설정 요청 실패: {str(e)}")
        return jsonify({
            'error': '서버 오류가 발생했습니다.',
            'success': False
        }), 500

# 에러 핸들러
@auth_bp.errorhandler(404)
def not_found(error):
    return jsonify({'error': '인증 엔드포인트를 찾을 수 없습니다.'}), 404

@auth_bp.errorhandler(500)
def internal_error(error):
    return jsonify({'error': '인증 서버 오류가 발생했습니다.'}), 500
