"""
모니터링 API 엔드포인트
프로덕션 환경에서 시스템 상태를 모니터링할 수 있는 API를 제공합니다.
"""

from flask import Blueprint, jsonify, request
from datetime import datetime, timedelta
import json
import os
from .production_monitor import monitor, get_monitoring_dashboard

# 모니터링 Blueprint 생성
monitoring_bp = Blueprint('monitoring', __name__, url_prefix='/monitoring')

@monitoring_bp.route('/dashboard', methods=['GET'])
def get_dashboard():
    """모니터링 대시보드 데이터 조회"""
    try:
        dashboard_data = get_monitoring_dashboard()
        return jsonify({
            'success': True,
            'data': dashboard_data
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'대시보드 데이터 조회 실패: {str(e)}'
        }), 500

@monitoring_bp.route('/metrics', methods=['GET'])
def get_metrics():
    """상세 메트릭 데이터 조회"""
    try:
        metrics = monitor.get_metrics_summary()
        return jsonify({
            'success': True,
            'data': metrics
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'메트릭 데이터 조회 실패: {str(e)}'
        }), 500

@monitoring_bp.route('/alerts', methods=['GET'])
def get_alerts():
    """현재 알림 상태 조회"""
    try:
        alerts = monitor.check_alerts()
        return jsonify({
            'success': True,
            'data': {
                'alerts': alerts,
                'alert_count': len(alerts),
                'timestamp': datetime.now().isoformat()
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'알림 데이터 조회 실패: {str(e)}'
        }), 500

@monitoring_bp.route('/health', methods=['GET'])
def health_check():
    """시스템 헬스 체크"""
    try:
        metrics = monitor.get_metrics_summary()
        alerts = monitor.check_alerts()
        
        # 헬스 상태 결정
        health_status = 'healthy'
        if alerts:
            health_status = 'warning' if len(alerts) < 3 else 'critical'
        
        return jsonify({
            'success': True,
            'data': {
                'status': health_status,
                'timestamp': datetime.now().isoformat(),
                'uptime': 'N/A',  # 실제로는 서버 시작 시간으로 계산
                'version': '1.0.0',
                'metrics': {
                    'total_api_calls': metrics['total_api_calls'],
                    'active_users': metrics['active_users'],
                    'error_rate': metrics['error_rate'],
                    'avg_response_time': metrics['avg_response_time']
                },
                'alerts': alerts
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'헬스 체크 실패: {str(e)}'
        }), 500

@monitoring_bp.route('/export', methods=['POST'])
def export_metrics():
    """메트릭 데이터 내보내기"""
    try:
        data = request.get_json() or {}
        filename = data.get('filename')
        
        exported_file = monitor.export_metrics(filename)
        
        return jsonify({
            'success': True,
            'message': '메트릭이 성공적으로 내보내졌습니다.',
            'data': {
                'filename': exported_file,
                'timestamp': datetime.now().isoformat()
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'메트릭 내보내기 실패: {str(e)}'
        }), 500

@monitoring_bp.route('/reset', methods=['POST'])
def reset_metrics():
    """메트릭 데이터 초기화"""
    try:
        monitor.reset_metrics()
        
        return jsonify({
            'success': True,
            'message': '메트릭이 성공적으로 초기화되었습니다.',
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'메트릭 초기화 실패: {str(e)}'
        }), 500

@monitoring_bp.route('/config', methods=['GET'])
def get_config():
    """모니터링 설정 조회"""
    try:
        config = {
            'enabled': monitor.enabled,
            'thresholds': monitor.thresholds,
            'timestamp': datetime.now().isoformat()
        }
        
        return jsonify({
            'success': True,
            'data': config
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'설정 조회 실패: {str(e)}'
        }), 500

@monitoring_bp.route('/config', methods=['POST'])
def update_config():
    """모니터링 설정 업데이트"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': '설정 데이터가 필요합니다.'
            }), 400
        
        # 임계값 업데이트
        if 'thresholds' in data:
            for key, value in data['thresholds'].items():
                if key in monitor.thresholds:
                    monitor.thresholds[key] = value
        
        # 모니터링 활성화/비활성화
        if 'enabled' in data:
            monitor.enabled = bool(data['enabled'])
        
        return jsonify({
            'success': True,
            'message': '설정이 성공적으로 업데이트되었습니다.',
            'data': {
                'enabled': monitor.enabled,
                'thresholds': monitor.thresholds,
                'timestamp': datetime.now().isoformat()
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'설정 업데이트 실패: {str(e)}'
        }), 500

@monitoring_bp.route('/realtime', methods=['GET'])
def get_realtime_data():
    """실시간 모니터링 데이터 조회"""
    try:
        # 최근 1시간 데이터
        now = datetime.now()
        one_hour_ago = now - timedelta(hours=1)
        
        # 최근 에러 (최대 20개)
        recent_errors = list(monitor.recent_errors)[-20:]
        
        # 최근 느린 요청 (최대 10개)
        recent_slow_requests = list(monitor.slow_requests)[-10:]
        
        # 현재 시간대 통계
        current_hour = now.hour
        hourly_stats = monitor.metrics['hourly_stats'].get(current_hour, {})
        
        realtime_data = {
            'timestamp': now.isoformat(),
            'current_hour_stats': hourly_stats,
            'recent_errors': recent_errors,
            'recent_slow_requests': recent_slow_requests,
            'active_users': len(monitor.metrics['user_activities']),
            'total_calls_today': sum(monitor.metrics['daily_stats'].get(now.date(), {}).values())
        }
        
        return jsonify({
            'success': True,
            'data': realtime_data
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'실시간 데이터 조회 실패: {str(e)}'
        }), 500
