"""
헬스체크 및 시스템 상태 확인 엔드포인트
"""

from flask import Blueprint, jsonify
from backend.app.extensions import db
import os
import sys
from datetime import datetime

health_bp = Blueprint('health', __name__, url_prefix='')

@health_bp.route('/health', methods=['GET'])
def health_check():
    """
    기본 헬스체크 엔드포인트
    """
    try:
        # 기본 시스템 정보
        system_info = {
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'version': '1.0.0',
            'environment': os.getenv('FLASK_ENV', 'development'),
            'python_version': sys.version,
            'platform': sys.platform
        }
        
        return jsonify(system_info), 200
        
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500

@health_bp.route('/health/detailed', methods=['GET'])
def detailed_health_check():
    """
    상세 헬스체크 엔드포인트 (데이터베이스 연결 포함)
    """
    try:
        health_status = {
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'checks': {}
        }
        
        # 데이터베이스 연결 확인
        try:
            # 간단한 쿼리로 데이터베이스 연결 테스트
            db.session.execute('SELECT 1')
            health_status['checks']['database'] = {
                'status': 'healthy',
                'message': 'Database connection successful'
            }
        except Exception as e:
            health_status['checks']['database'] = {
                'status': 'unhealthy',
                'message': f'Database error: {str(e)}'
            }
        
        # 환경 변수 확인
        required_env_vars = ['DATABASE_URL', 'JWT_SECRET_KEY']
        missing_vars = []
        for var in required_env_vars:
            if not os.getenv(var):
                missing_vars.append(var)
        
        health_status['checks']['environment'] = {
            'status': 'healthy' if not missing_vars else 'unhealthy',
            'message': 'All required environment variables present' if not missing_vars else f'Missing: {", ".join(missing_vars)}'
        }
        
        # 전체 상태 결정
        all_healthy = all(
            check['status'] == 'healthy' 
            for check in health_status['checks'].values()
        )
        
        if not all_healthy:
            health_status['status'] = 'degraded'
        
        return jsonify(health_status), 200 if all_healthy else 503
        
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500

@health_bp.route('/health/ready', methods=['GET'])
def readiness_check():
    """
    준비 상태 확인 엔드포인트 (Kubernetes 등에서 사용)
    """
    try:
        # 데이터베이스 연결 확인
        db.session.execute('SELECT 1')
        
        return jsonify({
            'status': 'ready',
            'timestamp': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'not_ready',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 503
