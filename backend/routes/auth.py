"""
인증 API
"""

from flask import Blueprint

# 인증 Blueprint 생성
auth_bp = Blueprint('auth', __name__, url_prefix='/auth')

@auth_bp.route('/')
def auth_home():
    """인증 API 홈"""
    return {'message': '인증 API가 정상적으로 작동하고 있습니다.'}
