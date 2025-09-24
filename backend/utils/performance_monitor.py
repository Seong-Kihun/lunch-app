"""
성능 모니터링 시스템
API 응답 시간, 데이터베이스 쿼리 성능, 메모리 사용량을 모니터링합니다.
"""

import time
import psutil
import threading
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from functools import wraps
from collections import defaultdict, deque
import logging

logger = logging.getLogger(__name__)

class PerformanceMonitor:
    """성능 모니터링 클래스"""
    
    def __init__(self, max_records: int = 1000):
        self.max_records = max_records
        self.api_times = deque(maxlen=max_records)
        self.db_queries = deque(maxlen=max_records)
        self.memory_usage = deque(maxlen=max_records)
        self.error_logs = deque(maxlen=max_records)
        self.lock = threading.Lock()
        
        # 모니터링 시작
        self._start_monitoring()
    
    def _start_monitoring(self):
        """시스템 모니터링 시작"""
        def monitor_system():
            while True:
                try:
                    # 메모리 사용량 기록
                    memory_info = psutil.virtual_memory()
                    self.record_memory_usage({
                        'timestamp': datetime.utcnow().isoformat(),
                        'total': memory_info.total,
                        'available': memory_info.available,
                        'percent': memory_info.percent,
                        'used': memory_info.used,
                        'free': memory_info.free
                    })
                    
                    time.sleep(60)  # 1분마다 체크
                except Exception as e:
                    logger.error(f"시스템 모니터링 오류: {e}")
                    time.sleep(60)
        
        monitor_thread = threading.Thread(target=monitor_system, daemon=True)
        monitor_thread.start()
    
    def record_api_time(self, endpoint: str, method: str, duration: float, status_code: int, 
                       user_id: str = None, error: str = None):
        """API 응답 시간 기록"""
        with self.lock:
            record = {
                'timestamp': datetime.utcnow().isoformat(),
                'endpoint': endpoint,
                'method': method,
                'duration': duration,
                'status_code': status_code,
                'user_id': user_id,
                'error': error
            }
            self.api_times.append(record)
    
    def record_db_query(self, query: str, duration: float, rows_affected: int = 0, 
                       error: str = None):
        """데이터베이스 쿼리 성능 기록"""
        with self.lock:
            record = {
                'timestamp': datetime.utcnow().isoformat(),
                'query': query[:200] + '...' if len(query) > 200 else query,
                'duration': duration,
                'rows_affected': rows_affected,
                'error': error
            }
            self.db_queries.append(record)
    
    def record_memory_usage(self, memory_info: Dict[str, Any]):
        """메모리 사용량 기록"""
        with self.lock:
            self.memory_usage.append(memory_info)
    
    def record_error(self, error_type: str, error_message: str, endpoint: str = None, 
                    user_id: str = None, stack_trace: str = None):
        """에러 기록"""
        with self.lock:
            record = {
                'timestamp': datetime.utcnow().isoformat(),
                'error_type': error_type,
                'error_message': error_message,
                'endpoint': endpoint,
                'user_id': user_id,
                'stack_trace': stack_trace
            }
            self.error_logs.append(record)
    
    def get_api_performance_stats(self, hours: int = 24) -> Dict[str, Any]:
        """API 성능 통계 조회"""
        with self.lock:
            cutoff_time = datetime.utcnow() - timedelta(hours=hours)
            recent_records = [
                record for record in self.api_times
                if datetime.fromisoformat(record['timestamp']) >= cutoff_time
            ]
            
            if not recent_records:
                return {'error': '데이터 없음'}
            
            # 기본 통계
            durations = [record['duration'] for record in recent_records]
            avg_duration = sum(durations) / len(durations)
            max_duration = max(durations)
            min_duration = min(durations)
            
            # 상태 코드별 통계
            status_codes = defaultdict(int)
            for record in recent_records:
                status_codes[record['status_code']] += 1
            
            # 엔드포인트별 통계
            endpoint_stats = defaultdict(lambda: {'count': 0, 'total_time': 0, 'avg_time': 0})
            for record in recent_records:
                endpoint = record['endpoint']
                endpoint_stats[endpoint]['count'] += 1
                endpoint_stats[endpoint]['total_time'] += record['duration']
                endpoint_stats[endpoint]['avg_time'] = (
                    endpoint_stats[endpoint]['total_time'] / endpoint_stats[endpoint]['count']
                )
            
            # 에러 통계
            error_count = len([record for record in recent_records if record['error']])
            
            return {
                'total_requests': len(recent_records),
                'avg_duration': round(avg_duration, 3),
                'max_duration': round(max_duration, 3),
                'min_duration': round(min_duration, 3),
                'status_codes': dict(status_codes),
                'endpoint_stats': dict(endpoint_stats),
                'error_count': error_count,
                'error_rate': round(error_count / len(recent_records) * 100, 2)
            }
    
    def get_db_performance_stats(self, hours: int = 24) -> Dict[str, Any]:
        """데이터베이스 성능 통계 조회"""
        with self.lock:
            cutoff_time = datetime.utcnow() - timedelta(hours=hours)
            recent_queries = [
                record for record in self.db_queries
                if datetime.fromisoformat(record['timestamp']) >= cutoff_time
            ]
            
            if not recent_queries:
                return {'error': '데이터 없음'}
            
            # 기본 통계
            durations = [record['duration'] for record in recent_queries]
            avg_duration = sum(durations) / len(durations)
            max_duration = max(durations)
            min_duration = min(durations)
            
            # 느린 쿼리 (1초 이상)
            slow_queries = [record for record in recent_queries if record['duration'] > 1.0]
            
            # 에러 통계
            error_count = len([record for record in recent_queries if record['error']])
            
            return {
                'total_queries': len(recent_queries),
                'avg_duration': round(avg_duration, 3),
                'max_duration': round(max_duration, 3),
                'min_duration': round(min_duration, 3),
                'slow_queries': len(slow_queries),
                'slow_query_rate': round(len(slow_queries) / len(recent_queries) * 100, 2),
                'error_count': error_count,
                'error_rate': round(error_count / len(recent_queries) * 100, 2)
            }
    
    def get_memory_stats(self, hours: int = 24) -> Dict[str, Any]:
        """메모리 사용량 통계 조회"""
        with self.lock:
            cutoff_time = datetime.utcnow() - timedelta(hours=hours)
            recent_memory = [
                record for record in self.memory_usage
                if datetime.fromisoformat(record['timestamp']) >= cutoff_time
            ]
            
            if not recent_memory:
                return {'error': '데이터 없음'}
            
            # 메모리 사용률 통계
            percentages = [record['percent'] for record in recent_memory]
            avg_percent = sum(percentages) / len(percentages)
            max_percent = max(percentages)
            min_percent = min(percentages)
            
            # 현재 메모리 상태
            current_memory = recent_memory[-1] if recent_memory else {}
            
            return {
                'avg_usage_percent': round(avg_percent, 2),
                'max_usage_percent': round(max_percent, 2),
                'min_usage_percent': round(min_percent, 2),
                'current_usage': current_memory,
                'total_records': len(recent_memory)
            }
    
    def get_error_stats(self, hours: int = 24) -> Dict[str, Any]:
        """에러 통계 조회"""
        with self.lock:
            cutoff_time = datetime.utcnow() - timedelta(hours=hours)
            recent_errors = [
                record for record in self.error_logs
                if datetime.fromisoformat(record['timestamp']) >= cutoff_time
            ]
            
            if not recent_errors:
                return {'error': '데이터 없음'}
            
            # 에러 타입별 통계
            error_types = defaultdict(int)
            for record in recent_errors:
                error_types[record['error_type']] += 1
            
            # 엔드포인트별 에러 통계
            endpoint_errors = defaultdict(int)
            for record in recent_errors:
                if record['endpoint']:
                    endpoint_errors[record['endpoint']] += 1
            
            return {
                'total_errors': len(recent_errors),
                'error_types': dict(error_types),
                'endpoint_errors': dict(endpoint_errors),
                'recent_errors': recent_errors[-10:]  # 최근 10개 에러
            }
    
    def get_overall_stats(self, hours: int = 24) -> Dict[str, Any]:
        """전체 성능 통계 조회"""
        return {
            'api_performance': self.get_api_performance_stats(hours),
            'db_performance': self.get_db_performance_stats(hours),
            'memory_stats': self.get_memory_stats(hours),
            'error_stats': self.get_error_stats(hours),
            'timestamp': datetime.utcnow().isoformat()
        }
    
    def clear_old_records(self, days: int = 7):
        """오래된 기록 정리"""
        with self.lock:
            cutoff_time = datetime.utcnow() - timedelta(days=days)
            
            # API 기록 정리
            self.api_times = deque([
                record for record in self.api_times
                if datetime.fromisoformat(record['timestamp']) >= cutoff_time
            ], maxlen=self.max_records)
            
            # DB 쿼리 기록 정리
            self.db_queries = deque([
                record for record in self.db_queries
                if datetime.fromisoformat(record['timestamp']) >= cutoff_time
            ], maxlen=self.max_records)
            
            # 메모리 기록 정리
            self.memory_usage = deque([
                record for record in self.memory_usage
                if datetime.fromisoformat(record['timestamp']) >= cutoff_time
            ], maxlen=self.max_records)
            
            # 에러 기록 정리
            self.error_logs = deque([
                record for record in self.error_logs
                if datetime.fromisoformat(record['timestamp']) >= cutoff_time
            ], maxlen=self.max_records)

# 성능 모니터링 데코레이터
def monitor_performance(endpoint: str = None):
    """API 성능 모니터링 데코레이터"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            error = None
            status_code = 200
            
            try:
                result = func(*args, **kwargs)
                return result
            except Exception as e:
                error = str(e)
                status_code = 500
                raise
            finally:
                duration = time.time() - start_time
                performance_monitor.record_api_time(
                    endpoint=endpoint or func.__name__,
                    method='POST',  # 기본값, 실제로는 request.method 사용
                    duration=duration,
                    status_code=status_code,
                    error=error
                )
        
        return wrapper
    return decorator

# 전역 성능 모니터 인스턴스
performance_monitor = PerformanceMonitor()

def setup_development_monitoring(app):
    """개발 환경용 성능 모니터링 설정"""
    try:
        # Flask 앱에 성능 모니터링 설정
        app.performance_monitor = performance_monitor
        
        # 개발 환경에서만 활성화
        if app.config.get('ENV') == 'development' or app.config.get('FLASK_ENV') == 'development':
            print("[SUCCESS] 개발 환경 성능 모니터링이 활성화되었습니다.")
        else:
            print("[INFO] 프로덕션 환경: 성능 모니터링이 제한적으로 활성화됩니다.")
        
        return True
    except Exception as e:
        print(f"[WARNING] 성능 모니터링 설정 실패: {e}")
        return False