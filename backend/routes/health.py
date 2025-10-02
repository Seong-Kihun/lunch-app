"""
헬스체크 및 시스템 상태 API
"""

from flask import Blueprint, jsonify
from backend.app.extensions import db
from backend.utils.logging import info, error
import os
import time

health_bp = Blueprint('health', __name__)

@health_bp.route('/healthz', methods=['GET'])
def health_check():
    """기본 헬스체크 엔드포인트"""
    try:
        return jsonify({
            'status': 'healthy',
            'timestamp': time.time(),
            'version': '1.0.0'
        }), 200
    except Exception as e:
        error(f"헬스체크 실패: {e}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': time.time()
        }), 500

@health_bp.route('/healthz/db', methods=['GET'])
def database_health_check():
    """데이터베이스 연결 상태 확인"""
    try:
        # 데이터베이스 연결 테스트
        db.session.execute('SELECT 1')
        
        # 데이터베이스 URL 정보 (민감한 정보는 제거)
        db_url = os.getenv('DATABASE_URL', 'Not set')
        if db_url.startswith('postgresql://'):
            db_type = 'PostgreSQL'
        elif db_url.startswith('sqlite://'):
            db_type = 'SQLite'
        else:
            db_type = 'Unknown'
        
        return jsonify({
            'status': 'healthy',
            'database': {
                'type': db_type,
                'connected': True,
                'url_masked': db_url.split('@')[-1] if '@' in db_url else 'Local file'
            },
            'timestamp': time.time()
        }), 200
        
    except Exception as e:
        error(f"데이터베이스 헬스체크 실패: {e}")
        return jsonify({
            'status': 'unhealthy',
            'database': {
                'connected': False,
                'error': str(e)
            },
            'timestamp': time.time()
        }), 500

@health_bp.route('/healthz/full', methods=['GET'])
def full_health_check():
    """전체 시스템 상태 확인"""
    try:
        # 데이터베이스 상태
        db_status = 'healthy'
        db_error = None
        try:
            db.session.execute('SELECT 1')
        except Exception as e:
            db_status = 'unhealthy'
            db_error = str(e)
        
        # 환경 변수 확인
        required_env_vars = ['SECRET_KEY', 'JWT_SECRET_KEY']
        missing_env_vars = [var for var in required_env_vars if not os.getenv(var)]
        
        # CORS 설정 확인
        allowed_origins = os.getenv('ALLOWED_ORIGINS', '').split(',')
        cors_configured = len([o for o in allowed_origins if o.strip()]) > 0
        
        return jsonify({
            'status': 'healthy' if db_status == 'healthy' and not missing_env_vars else 'degraded',
            'timestamp': time.time(),
            'components': {
                'database': {
                    'status': db_status,
                    'error': db_error
                },
                'environment': {
                    'missing_vars': missing_env_vars,
                    'cors_configured': cors_configured
                },
                'python_version': os.getenv('PYTHON_VERSION', 'Unknown'),
                'flask_env': os.getenv('FLASK_ENV', 'Unknown')
            }
        }), 200
        
    except Exception as e:
        error(f"전체 헬스체크 실패: {e}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': time.time()
        }), 500