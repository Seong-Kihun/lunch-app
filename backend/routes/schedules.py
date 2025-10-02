"""
일정 관리 API
"""

from flask import Blueprint
from auth.middleware import check_authentication

# 일정 관리 Blueprint 생성
schedules_bp = Blueprint('schedules', __name__, url_prefix='/schedules')

# 인증 미들웨어는 UnifiedBlueprintManager에서 중앙 관리됨

@schedules_bp.route('/')
def schedules_home():
    """일정 관리 API 홈"""
    return {'message': '일정 관리 API가 정상적으로 작동하고 있습니다.'}
