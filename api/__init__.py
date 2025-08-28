"""
API Blueprint 패키지
Flask Blueprint를 사용하여 API를 모듈화합니다.
"""

from flask import Blueprint

# API Blueprint 생성
api_bp = Blueprint('api', __name__, url_prefix='/api')

# 하위 Blueprint들을 import하고 등록
from . import auth, parties, dangolpots, schedules, users

def init_app(app):
    """Flask 앱에 API Blueprint를 등록"""
    app.register_blueprint(api_bp)
