"""
API Blueprint
"""

from flask import Blueprint

# API Blueprint 생성
api_bp = Blueprint('api', __name__, url_prefix='/api')

@api_bp.route('/')
def api_home():
    """API 홈"""
    return {'message': 'API 서버가 정상적으로 작동하고 있습니다.'}
