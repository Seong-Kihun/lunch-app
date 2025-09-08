"""
일정 관리 API
"""

from flask import Blueprint

# 일정 관리 Blueprint 생성
schedules_bp = Blueprint('schedules', __name__, url_prefix='/api/schedules')

@schedules_bp.route('/')
def schedules_home():
    """일정 관리 API 홈"""
    return {'message': '일정 관리 API가 정상적으로 작동하고 있습니다.'}
