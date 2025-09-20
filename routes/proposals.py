"""
제안 관리 API
"""

from flask import Blueprint
from auth.middleware import check_authentication

# 제안 관리 Blueprint 생성
proposals_bp = Blueprint('proposals', __name__, url_prefix='/api/proposals')

# 인증 미들웨어 적용
@proposals_bp.before_request
def _proposals_guard():
    return check_authentication()

@proposals_bp.route('/')
def proposals_home():
    """제안 관리 API 홈"""
    return {'message': '제안 관리 API가 정상적으로 작동하고 있습니다.'}
