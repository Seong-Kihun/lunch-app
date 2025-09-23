#!/usr/bin/env python3
"""
성능 모니터링 도구
쿼리 실행 시간, 메모리 사용량, 응답 시간 등을 추적
"""
import time
import psutil
import logging
from functools import wraps
from flask import request, g, current_app
from sqlalchemy import event
from sqlalchemy.engine import Engine

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PerformanceMonitor:
    """성능 모니터링 클래스"""
    
    def __init__(self):
        self.query_times = []
        self.response_times = []
        self.memory_usage = []
        self.slow_queries = []  # 100ms 이상 걸린 쿼리
        
    def start_request_monitoring(self):
        """요청 시작 시 모니터링 시작"""
        g.start_time = time.time()
        g.start_memory = psutil.Process().memory_info().rss / 1024 / 1024  # MB
        
    def end_request_monitoring(self, response):
        """요청 종료 시 모니터링 완료"""
        if hasattr(g, 'start_time'):
            response_time = time.time() - g.start_time
            self.response_times.append(response_time)
            
            # 응답 시간이 1초 이상이면 경고
            if response_time > 1.0:
                logger.warning(f"🐌 느린 응답 감지: {request.endpoint} - {response_time:.3f}초")
            
            # 메모리 사용량 변화
            if hasattr(g, 'start_memory'):
                end_memory = psutil.Process().memory_info().rss / 1024 / 1024
                memory_diff = end_memory - g.start_memory
                self.memory_usage.append(memory_diff)
                
                if abs(memory_diff) > 10:  # 10MB 이상 변화
                    logger.info(f"💾 메모리 사용량 변화: {memory_diff:+.1f}MB")
        
        return response
    
    def record_query_time(self, query_time, sql, params):
        """쿼리 실행 시간 기록"""
        self.query_times.append(query_time)
        
        # 느린 쿼리 기록 (100ms 이상)
        if query_time > 0.1:
            self.slow_queries.append({
                'sql': sql,
                'params': params,
                'time': query_time,
                'endpoint': request.endpoint if request else 'unknown'
            })
            logger.warning(f"🐌 느린 쿼리 감지: {query_time:.3f}초 - {sql[:100]}...")
    
    def get_performance_stats(self):
        """성능 통계 반환"""
        if not self.query_times:
            return "아직 쿼리 실행 기록이 없습니다."
        
        avg_query_time = sum(self.query_times) / len(self.query_times)
        max_query_time = max(self.query_times)
        total_queries = len(self.query_times)
        
        avg_response_time = sum(self.response_times) / len(self.response_times) if self.response_times else 0
        max_response_time = max(self.response_times) if self.response_times else 0
        
        avg_memory_diff = sum(self.memory_usage) / len(self.memory_usage) if self.memory_usage else 0
        
        stats = {
            '쿼리 통계': {
                '총 쿼리 수': total_queries,
                '평균 실행 시간': f"{avg_query_time:.3f}초",
                '최대 실행 시간': f"{max_query_time:.3f}초",
                '느린 쿼리 수': len(self.slow_queries)
            },
            '응답 시간 통계': {
                '평균 응답 시간': f"{avg_response_time:.3f}초",
                '최대 응답 시간': f"{max_response_time:.3f}초",
                '총 요청 수': len(self.response_times)
            },
            '메모리 통계': {
                '평균 메모리 변화': f"{avg_memory_diff:+.1f}MB",
                '총 모니터링 횟수': len(self.memory_usage)
            }
        }
        
        return stats

# 전역 성능 모니터 인스턴스
performance_monitor = PerformanceMonitor()

def monitor_performance(f):
    """함수 성능 모니터링 데코레이터"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        start_time = time.time()
        start_memory = psutil.Process().memory_info().rss / 1024 / 1024
        
        try:
            result = f(*args, **kwargs)
            return result
        finally:
            execution_time = time.time() - start_time
            end_memory = psutil.Process().memory_info().rss / 1024 / 1024
            memory_diff = end_memory - start_memory
            
            # 성능 로깅
            if execution_time > 0.5:  # 500ms 이상
                logger.info(f"⏱️ 함수 실행 시간: {f.__name__} - {execution_time:.3f}초")
            
            if abs(memory_diff) > 5:  # 5MB 이상 변화
                logger.info(f"💾 메모리 변화: {f.__name__} - {memory_diff:+.1f}MB")
    
    return decorated_function

def setup_sqlalchemy_monitoring(db):
    """SQLAlchemy 쿼리 모니터링 설정"""
    
    @event.listens_for(Engine, "before_cursor_execute")
    def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        conn.info.setdefault('query_start_time', []).append(time.time())
    
    @event.listens_for(Engine, "after_cursor_execute")
    def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        total = time.time() - conn.info['query_start_time'].pop()
        
        # 쿼리 실행 시간 기록
        performance_monitor.record_query_time(total, statement, parameters)
        
        # 느린 쿼리 상세 로깅
        if total > 0.1:  # 100ms 이상
            logger.warning(f"🐌 느린 쿼리 상세:")
            logger.warning(f"   SQL: {statement}")
            logger.warning(f"   파라미터: {parameters}")
            logger.warning(f"   실행 시간: {total:.3f}초")
            logger.warning(f"   엔드포인트: {request.endpoint if request else 'unknown'}")

def get_performance_endpoint():
    """성능 통계를 반환하는 엔드포인트"""
    stats = performance_monitor.get_performance_stats()
    return {
        'status': 'success',
        'data': stats,
        'timestamp': time.time()
    }

# 개발 환경에서만 활성화되는 성능 모니터링
def setup_development_monitoring(app):
    """개발 환경용 성능 모니터링 설정"""
    if app.config.get('DEBUG', False):
        logger.info("🔍 개발 환경 성능 모니터링 활성화")
        
        # 요청 시작/종료 모니터링
        app.before_request(performance_monitor.start_request_monitoring)
        app.after_request(performance_monitor.end_request_monitoring)
        
        # 성능 통계 엔드포인트 추가
        @app.route('/debug/performance', methods=['GET'])
        def debug_performance():
            return get_performance_endpoint()
        
        logger.info("✅ 성능 모니터링 설정 완료")
        logger.info("📊 성능 통계 확인: GET /debug/performance")

# 사용 예시
if __name__ == '__main__':
    print("🧪 성능 모니터링 도구 테스트")
    
    # 모니터링 테스트
    @monitor_performance
    def test_function():
        import time
        time.sleep(0.1)  # 100ms 대기
        return "테스트 완료"
    
    # 테스트 실행
    result = test_function()
    print(f"테스트 결과: {result}")
    
    # 성능 통계 출력
    stats = performance_monitor.get_performance_stats()
    print(f"성능 통계: {stats}")
