"""
포인트 API
"""

from flask import Blueprint

# 포인트 Blueprint 생성
points_bp = Blueprint('points', __name__)  # url_prefix는 UnifiedBlueprintManager에서 설정

# 인증 미들웨어는 UnifiedBlueprintManager에서 중앙 관리됨

@points_bp.route('/')
def points_home():
    """포인트 API 홈"""
    return {'message': '포인트 API가 정상적으로 작동하고 있습니다.'}
