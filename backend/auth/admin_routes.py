"""
관리자용 인증 관련 라우트
계정 잠금 해제, 사용자 관리 등의 기능을 제공합니다.
"""

from flask import Blueprint, request, jsonify, current_app
from .models import User, db
from datetime import datetime, timedelta
import re

admin_bp = Blueprint('admin_auth', __name__, url_prefix='/api/admin')

@admin_bp.route('/unlock-account/<email>', methods=['POST'])
def unlock_account(email):
    """특정 계정의 잠금을 해제합니다."""
    try:
        # 이메일 형식 검증
        if not re.match(r'^[a-zA-Z0-9._%+-]+@koica\.go\.kr$', email):
            return jsonify({'error': '올바른 KOICA 이메일 주소를 입력해주세요.'}), 400
        
        # 사용자 조회
        user = User.query.filter_by(email=email.lower()).first()
        
        if not user:
            return jsonify({'error': '존재하지 않는 사용자입니다.'}), 404
        
        # 계정 잠금 해제
        user.unlock_account()
        db.session.commit()
        
        current_app.logger.info(f'관리자에 의해 계정 잠금 해제됨: {email}')
        
        return jsonify({
            'message': f'{email} 계정의 잠금이 해제되었습니다.',
            'email': email,
            'unlocked_at': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f'계정 잠금 해제 실패: {str(e)}')
        return jsonify({
            'error': '계정 잠금 해제 중 오류가 발생했습니다.',
            'details': str(e)
        }), 500

@admin_bp.route('/account-status/<email>', methods=['GET'])
def get_account_status(email):
    """특정 계정의 상태를 확인합니다."""
    try:
        # 이메일 형식 검증
        if not re.match(r'^[a-zA-Z0-9._%+-]+@koica\.go\.kr$', email):
            return jsonify({'error': '올바른 KOICA 이메일 주소를 입력해주세요.'}), 400
        
        # 사용자 조회
        user = User.query.filter_by(email=email.lower()).first()
        
        if not user:
            return jsonify({'error': '존재하지 않는 사용자입니다.'}), 404
        
        # 계정 상태 정보
        is_locked = user.is_account_locked()
        locked_until = user.account_locked_until.isoformat() if user.account_locked_until else None
        failed_attempts = user.failed_login_attempts or 0
        
        return jsonify({
            'email': email,
            'is_locked': is_locked,
            'locked_until': locked_until,
            'failed_login_attempts': failed_attempts,
            'last_login': user.last_login_date.isoformat() if user.last_login_date else None,
            'is_active': user.is_active
        }), 200
        
    except Exception as e:
        current_app.logger.error(f'계정 상태 조회 실패: {str(e)}')
        return jsonify({
            'error': '계정 상태 조회 중 오류가 발생했습니다.',
            'details': str(e)
        }), 500

@admin_bp.route('/reset-login-attempts/<email>', methods=['POST'])
def reset_login_attempts(email):
    """특정 계정의 로그인 실패 횟수를 초기화합니다."""
    try:
        # 이메일 형식 검증
        if not re.match(r'^[a-zA-Z0-9._%+-]+@koica\.go\.kr$', email):
            return jsonify({'error': '올바른 KOICA 이메일 주소를 입력해주세요.'}), 400
        
        # 사용자 조회
        user = User.query.filter_by(email=email.lower()).first()
        
        if not user:
            return jsonify({'error': '존재하지 않는 사용자입니다.'}), 404
        
        # 로그인 실패 횟수 초기화
        user.reset_failed_attempts()
        db.session.commit()
        
        current_app.logger.info(f'관리자에 의해 로그인 실패 횟수 초기화됨: {email}')
        
        return jsonify({
            'message': f'{email} 계정의 로그인 실패 횟수가 초기화되었습니다.',
            'email': email,
            'reset_at': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f'로그인 실패 횟수 초기화 실패: {str(e)}')
        return jsonify({
            'error': '로그인 실패 횟수 초기화 중 오류가 발생했습니다.',
            'details': str(e)
        }), 500

@admin_bp.route('/list-locked-accounts', methods=['GET'])
def list_locked_accounts():
    """잠금된 계정 목록을 조회합니다."""
    try:
        # 현재 잠금된 계정들 조회
        locked_users = User.query.filter(
            User.account_locked_until.isnot(None),
            User.account_locked_until > datetime.utcnow()
        ).all()
        
        locked_accounts = []
        for user in locked_users:
            locked_accounts.append({
                'email': user.email,
                'nickname': user.nickname,
                'employee_id': user.employee_id,
                'locked_until': user.account_locked_until.isoformat(),
                'failed_login_attempts': user.failed_login_attempts or 0,
                'last_login': user.last_login_date.isoformat() if user.last_login_date else None
            })
        
        return jsonify({
            'locked_accounts': locked_accounts,
            'count': len(locked_accounts),
            'checked_at': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f'잠금된 계정 목록 조회 실패: {str(e)}')
        return jsonify({
            'error': '잠금된 계정 목록 조회 중 오류가 발생했습니다.',
            'details': str(e)
        }), 500
