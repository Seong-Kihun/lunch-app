"""
제안 관리 API
"""

from flask import Blueprint
from auth.middleware import check_authentication

# 제안 관리 Blueprint 생성
proposals_bp = Blueprint('proposals', __name__, url_prefix='/proposals')

# 인증 미들웨어는 UnifiedBlueprintManager에서 중앙 관리됨

@proposals_bp.route('/')
def proposals_home():
    """제안 관리 API 홈"""
    return {'message': '제안 관리 API가 정상적으로 작동하고 있습니다.'}
