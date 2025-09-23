"""
프로덕션 환경 모니터링 시스템
API 성능, 에러, 사용자 활동을 실시간으로 모니터링합니다.
"""

import time
import json
import logging
from datetime import datetime, timedelta
from flask import request, g
from functools import wraps
from collections import defaultdict, deque
import threading
import os

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ProductionMonitor:
    def __init__(self):
        self.metrics = {
            'api_calls': defaultdict(int),
            'response_times': defaultdict(list),
            'error_counts': defaultdict(int),
            'user_activities': defaultdict(int),
            'endpoint_usage': defaultdict(int),
            'hourly_stats': defaultdict(lambda: defaultdict(int)),
            'daily_stats': defaultdict(lambda: defaultdict(int))
        }
        self.recent_errors = deque(maxlen=100)
        self.slow_requests = deque(maxlen=50)
        self.lock = threading.Lock()
        
        # 알림 임계값 설정
        self.thresholds = {
            'max_response_time': 5000,  # 5초
            'max_error_rate': 0.1,     # 10%
            'max_concurrent_users': 1000
        }
        
        # 모니터링 활성화 여부
        self.enabled = os.getenv('MONITORING_ENABLED', 'true').lower() == 'true'
        
    def record_api_call(self, endpoint, method, response_time, status_code, user_id=None):
        """API 호출 기록"""
        if not self.enabled:
            return
            
        with self.lock:
            key = f"{method} {endpoint}"
            
            # 기본 통계
            self.metrics['api_calls'][key] += 1
            self.metrics['response_times'][key].append(response_time)
            self.metrics['endpoint_usage'][endpoint] += 1
            
            # 시간별 통계
            hour = datetime.now().hour
            self.metrics['hourly_stats'][hour]['api_calls'] += 1
            self.metrics['hourly_stats'][hour]['total_response_time'] += response_time
            
            # 일별 통계
            today = datetime.now().date()
            self.metrics['daily_stats'][today]['api_calls'] += 1
            self.metrics['daily_stats'][today]['total_response_time'] += response_time
            
            # 사용자 활동 기록
            if user_id:
                self.metrics['user_activities'][user_id] += 1
            
            # 에러 기록
            if status_code >= 400:
                self.metrics['error_counts'][key] += 1
                self.recent_errors.append({
                    'timestamp': datetime.now().isoformat(),
                    'endpoint': endpoint,
                    'method': method,
                    'status_code': status_code,
                    'response_time': response_time,
                    'user_id': user_id
                })
            
            # 느린 요청 기록
            if response_time > self.thresholds['max_response_time']:
                self.slow_requests.append({
                    'timestamp': datetime.now().isoformat(),
                    'endpoint': endpoint,
                    'method': method,
                    'response_time': response_time,
                    'user_id': user_id
                })
    
    def get_metrics_summary(self):
        """메트릭 요약 정보 반환"""
        with self.lock:
            summary = {
                'timestamp': datetime.now().isoformat(),
                'total_api_calls': sum(self.metrics['api_calls'].values()),
                'unique_endpoints': len(self.metrics['api_calls']),
                'active_users': len(self.metrics['user_activities']),
                'recent_errors': len(self.recent_errors),
                'slow_requests': len(self.slow_requests),
                'top_endpoints': self._get_top_endpoints(),
                'error_rate': self._calculate_error_rate(),
                'avg_response_time': self._calculate_avg_response_time(),
                'hourly_stats': dict(self.metrics['hourly_stats']),
                'recent_errors_list': list(self.recent_errors)[-10:],
                'slow_requests_list': list(self.slow_requests)[-10:]
            }
            return summary
    
    def _get_top_endpoints(self, limit=10):
        """가장 많이 호출된 엔드포인트 반환"""
        sorted_endpoints = sorted(
            self.metrics['api_calls'].items(),
            key=lambda x: x[1],
            reverse=True
        )
        return sorted_endpoints[:limit]
    
    def _calculate_error_rate(self):
        """전체 에러율 계산"""
        total_calls = sum(self.metrics['api_calls'].values())
        total_errors = sum(self.metrics['error_counts'].values())
        return total_errors / total_calls if total_calls > 0 else 0
    
    def _calculate_avg_response_time(self):
        """평균 응답시간 계산"""
        all_times = []
        for times in self.metrics['response_times'].values():
            all_times.extend(times)
        return sum(all_times) / len(all_times) if all_times else 0
    
    def check_alerts(self):
        """알림 조건 확인"""
        alerts = []
        
        # 응답시간 알림
        avg_time = self._calculate_avg_response_time()
        if avg_time > self.thresholds['max_response_time']:
            alerts.append({
                'type': 'high_response_time',
                'message': f'평균 응답시간이 {avg_time:.2f}ms로 임계값을 초과했습니다.',
                'value': avg_time,
                'threshold': self.thresholds['max_response_time']
            })
        
        # 에러율 알림
        error_rate = self._calculate_error_rate()
        if error_rate > self.thresholds['max_error_rate']:
            alerts.append({
                'type': 'high_error_rate',
                'message': f'에러율이 {error_rate:.2%}로 임계값을 초과했습니다.',
                'value': error_rate,
                'threshold': self.thresholds['max_error_rate']
            })
        
        # 최근 에러 알림
        if len(self.recent_errors) > 50:
            alerts.append({
                'type': 'too_many_errors',
                'message': f'최근 에러가 {len(self.recent_errors)}개로 많습니다.',
                'value': len(self.recent_errors),
                'threshold': 50
            })
        
        return alerts
    
    def export_metrics(self, filename=None):
        """메트릭을 파일로 내보내기"""
        if not filename:
            filename = f"metrics_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        with self.lock:
            export_data = {
                'export_time': datetime.now().isoformat(),
                'metrics': dict(self.metrics),
                'recent_errors': list(self.recent_errors),
                'slow_requests': list(self.slow_requests),
                'summary': self.get_metrics_summary()
            }
            
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(export_data, f, ensure_ascii=False, indent=2)
            
            logger.info(f"메트릭이 {filename}에 저장되었습니다.")
            return filename
    
    def reset_metrics(self):
        """메트릭 초기화"""
        with self.lock:
            self.metrics = {
                'api_calls': defaultdict(int),
                'response_times': defaultdict(list),
                'error_counts': defaultdict(int),
                'user_activities': defaultdict(int),
                'endpoint_usage': defaultdict(int),
                'hourly_stats': defaultdict(lambda: defaultdict(int)),
                'daily_stats': defaultdict(lambda: defaultdict(int))
            }
            self.recent_errors.clear()
            self.slow_requests.clear()
            logger.info("메트릭이 초기화되었습니다.")

# 전역 모니터 인스턴스
monitor = ProductionMonitor()

def monitor_api_call(f):
    """API 호출 모니터링 데코레이터"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not monitor.enabled:
            return f(*args, **kwargs)
        
        start_time = time.time()
        user_id = getattr(request, 'current_user', {}).get('employee_id') if hasattr(request, 'current_user') else None
        
        try:
            result = f(*args, **kwargs)
            response_time = (time.time() - start_time) * 1000  # ms로 변환
            
            # 응답 상태 코드 추출
            status_code = 200
            if hasattr(result, 'status_code'):
                status_code = result.status_code
            elif isinstance(result, tuple) and len(result) > 1:
                status_code = result[1]
            
            # 메트릭 기록
            endpoint = request.endpoint or request.path
            method = request.method
            monitor.record_api_call(endpoint, method, response_time, status_code, user_id)
            
            return result
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            endpoint = request.endpoint or request.path
            method = request.method
            
            # 에러 기록
            monitor.record_api_call(endpoint, method, response_time, 500, user_id)
            
            logger.error(f"API 호출 중 에러 발생: {endpoint} - {str(e)}")
            raise
    
    return decorated_function

def get_monitoring_dashboard():
    """모니터링 대시보드 데이터 반환"""
    return {
        'summary': monitor.get_metrics_summary(),
        'alerts': monitor.check_alerts(),
        'timestamp': datetime.now().isoformat()
    }
