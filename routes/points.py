"""
포인트 API
"""

from flask import Blueprint

# 포인트 Blueprint 생성
points_bp = Blueprint('points', __name__, url_prefix='/api/points')

@points_bp.route('/')
def points_home():
    """포인트 API 홈"""
    return {'message': '포인트 API가 정상적으로 작동하고 있습니다.'}
