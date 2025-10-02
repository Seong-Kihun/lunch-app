"""
포인트 API
"""

from flask import Blueprint
from auth.middleware import check_authentication

# 포인트 Blueprint 생성
points_bp = Blueprint('points', __name__, url_prefix='/points')

# 인증 미들웨어 적용
@points_bp.before_request
def _points_guard():
    return check_authentication()

@points_bp.route('/')
def points_home():
    """포인트 API 홈"""
    return {'message': '포인트 API가 정상적으로 작동하고 있습니다.'}
