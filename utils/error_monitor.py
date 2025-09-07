"""
에러 모니터링 시스템
개발 및 디버깅에 유용한 에러 추적 기능을 제공합니다.
"""

import json
import os
import traceback
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from collections import defaultdict, deque
from dataclasses import dataclass, asdict
from utils.logger import logger

@dataclass
class ErrorEvent:
    """에러 이벤트 데이터 클래스"""
    timestamp: str
    error_type: str
    error_message: str
    stack_trace: str
    context: Dict[str, Any]
    severity: str  # 'low', 'medium', 'high', 'critical'
    endpoint: Optional[str] = None
    user_id: Optional[str] = None
    request_id: Optional[str] = None

class ErrorMonitor:
    """에러 모니터링 클래스"""
    
    def __init__(self, max_errors: int = 1000):
        self.max_errors = max_errors
        self.errors = deque(maxlen=max_errors)
        self.error_counts = defaultdict(int)
        self.error_patterns = defaultdict(int)
        self.recent_errors = deque(maxlen=100)  # 최근 100개 에러
        
        # 에러 파일 저장 경로
        self.error_log_path = 'logs/errors.json'
        self.ensure_log_directory()
    
    def ensure_log_directory(self):
        """로그 디렉토리 생성"""
        if not os.path.exists('logs'):
            os.makedirs('logs')
    
    def record_error(self, error: Exception, context: Dict[str, Any] = None, 
                    severity: str = 'medium', endpoint: str = None, 
                    user_id: str = None, request_id: str = None):
        """에러 기록"""
        if context is None:
            context = {}
        
        error_event = ErrorEvent(
            timestamp=datetime.now().isoformat(),
            error_type=type(error).__name__,
            error_message=str(error),
            stack_trace=traceback.format_exc(),
            context=context,
            severity=severity,
            endpoint=endpoint,
            user_id=user_id,
            request_id=request_id
        )
        
        # 에러 저장
        self.errors.append(error_event)
        self.recent_errors.append(error_event)
        
        # 통계 업데이트
        self.error_counts[error_event.error_type] += 1
        self.error_patterns[error_event.error_message] += 1
        
        # 로그 기록
        logger.error(f"Error recorded: {error_event.error_type}", 
                    error_type=error_event.error_type,
                    error_message=error_event.error_message,
                    severity=severity,
                    endpoint=endpoint,
                    user_id=user_id)
        
        # 파일에 저장 (개발용)
        if os.getenv('FLASK_ENV') == 'development':
            self.save_error_to_file(error_event)
    
    def save_error_to_file(self, error_event: ErrorEvent):
        """에러를 파일에 저장"""
        try:
            error_data = asdict(error_event)
            
            # 기존 에러 로그 읽기
            existing_errors = []
            if os.path.exists(self.error_log_path):
                try:
                    with open(self.error_log_path, 'r', encoding='utf-8') as f:
                        existing_errors = json.load(f)
                except (json.JSONDecodeError, FileNotFoundError):
                    existing_errors = []
            
            # 새 에러 추가
            existing_errors.append(error_data)
            
            # 최근 1000개만 유지
            if len(existing_errors) > 1000:
                existing_errors = existing_errors[-1000:]
            
            # 파일에 저장
            with open(self.error_log_path, 'w', encoding='utf-8') as f:
                json.dump(existing_errors, f, ensure_ascii=False, indent=2)
                
        except Exception as e:
            logger.error(f"Failed to save error to file: {e}")
    
    def get_error_stats(self) -> Dict[str, Any]:
        """에러 통계 반환"""
        total_errors = len(self.errors)
        recent_errors_count = len(self.recent_errors)
        
        # 최근 1시간 내 에러 수
        one_hour_ago = datetime.now() - timedelta(hours=1)
        recent_errors_1h = [
            e for e in self.recent_errors 
            if datetime.fromisoformat(e.timestamp) > one_hour_ago
        ]
        
        # 심각도별 에러 수
        severity_counts = defaultdict(int)
        for error in self.recent_errors:
            severity_counts[error.severity] += 1
        
        return {
            'total_errors': total_errors,
            'recent_errors_count': recent_errors_count,
            'recent_errors_1h': len(recent_errors_1h),
            'error_types': dict(self.error_counts),
            'top_error_patterns': dict(sorted(
                self.error_patterns.items(), 
                key=lambda x: x[1], 
                reverse=True
            )[:10]),
            'severity_breakdown': dict(severity_counts),
            'last_error_time': self.recent_errors[-1].timestamp if self.recent_errors else None
        }
    
    def get_recent_errors(self, limit: int = 20) -> List[Dict[str, Any]]:
        """최근 에러 목록 반환"""
        return [asdict(error) for error in list(self.recent_errors)[-limit:]]
    
    def get_errors_by_type(self, error_type: str) -> List[Dict[str, Any]]:
        """특정 타입의 에러 목록 반환"""
        return [asdict(error) for error in self.errors if error.error_type == error_type]
    
    def get_errors_by_severity(self, severity: str) -> List[Dict[str, Any]]:
        """특정 심각도의 에러 목록 반환"""
        return [asdict(error) for error in self.errors if error.severity == severity]
    
    def clear_errors(self):
        """에러 기록 초기화"""
        self.errors.clear()
        self.recent_errors.clear()
        self.error_counts.clear()
        self.error_patterns.clear()
        logger.info("Error monitor cleared")
    
    def export_errors(self, filepath: str = None) -> str:
        """에러 데이터 내보내기"""
        if filepath is None:
            filepath = f'logs/error_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
        
        export_data = {
            'export_timestamp': datetime.now().isoformat(),
            'total_errors': len(self.errors),
            'error_stats': self.get_error_stats(),
            'errors': [asdict(error) for error in self.errors]
        }
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, ensure_ascii=False, indent=2)
        
        logger.info(f"Errors exported to {filepath}")
        return filepath

# 전역 에러 모니터 인스턴스
error_monitor = ErrorMonitor()

# 편의 함수들
def record_error(error: Exception, **kwargs):
    """에러 기록 편의 함수"""
    error_monitor.record_error(error, **kwargs)

def get_error_dashboard_data() -> Dict[str, Any]:
    """에러 대시보드 데이터 반환"""
    return {
        'stats': error_monitor.get_error_stats(),
        'recent_errors': error_monitor.get_recent_errors(10),
        'critical_errors': error_monitor.get_errors_by_severity('critical'),
        'high_errors': error_monitor.get_errors_by_severity('high')
    }

# Flask 에러 핸들러 통합
def setup_flask_error_handlers(app):
    """Flask 앱에 에러 핸들러 설정"""
    
    @app.errorhandler(404)
    def handle_404(error):
        record_error(error, severity='low', endpoint=request.endpoint)
        return jsonify({
            'error': 'Not Found',
            'message': '요청한 리소스를 찾을 수 없습니다.',
            'status_code': 404
        }), 404
    
    @app.errorhandler(500)
    def handle_500(error):
        record_error(error, severity='critical', endpoint=request.endpoint)
        return jsonify({
            'error': 'Internal Server Error',
            'message': '서버 내부 오류가 발생했습니다.',
            'status_code': 500
        }), 500
    
    @app.errorhandler(Exception)
    def handle_generic_error(error):
        # 404, 500은 위에서 처리되므로 다른 에러들만 처리
        if not hasattr(error, 'code') or error.code not in [404, 500]:
            record_error(error, severity='high', endpoint=request.endpoint)
        
        return jsonify({
            'error': 'Unexpected Error',
            'message': '예상치 못한 오류가 발생했습니다.',
            'status_code': 500
        }), 500

# 에러 모니터링 API 엔드포인트
def create_error_monitoring_routes(app):
    """에러 모니터링 API 엔드포인트 생성"""
    
    @app.route('/api/monitoring/errors/stats')
    def get_error_stats():
        """에러 통계 API"""
        return jsonify(error_monitor.get_error_stats())
    
    @app.route('/api/monitoring/errors/recent')
    def get_recent_errors():
        """최근 에러 목록 API"""
        limit = request.args.get('limit', 20, type=int)
        return jsonify(error_monitor.get_recent_errors(limit))
    
    @app.route('/api/monitoring/errors/type/<error_type>')
    def get_errors_by_type(error_type):
        """특정 타입의 에러 목록 API"""
        return jsonify(error_monitor.get_errors_by_type(error_type))
    
    @app.route('/api/monitoring/errors/severity/<severity>')
    def get_errors_by_severity(severity):
        """특정 심각도의 에러 목록 API"""
        return jsonify(error_monitor.get_errors_by_severity(severity))
    
    @app.route('/api/monitoring/errors/dashboard')
    def get_error_dashboard():
        """에러 대시보드 데이터 API"""
        return jsonify(get_error_dashboard_data())
    
    @app.route('/api/monitoring/errors/export')
    def export_errors():
        """에러 데이터 내보내기 API"""
        filepath = error_monitor.export_errors()
        return jsonify({
            'message': 'Errors exported successfully',
            'filepath': filepath
        })
    
    @app.route('/api/monitoring/errors/clear', methods=['POST'])
    def clear_errors():
        """에러 기록 초기화 API"""
        error_monitor.clear_errors()
        return jsonify({'message': 'Errors cleared successfully'})

# 데코레이터
def monitor_errors(severity: str = 'medium'):
    """에러 모니터링 데코레이터"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                record_error(e, severity=severity, endpoint=func.__name__)
                raise
        return wrapper
    return decorator

# 모듈 export
__all__ = [
    'ErrorMonitor', 'ErrorEvent', 'error_monitor',
    'record_error', 'get_error_dashboard_data',
    'setup_flask_error_handlers', 'create_error_monitoring_routes',
    'monitor_errors'
]
