"""
성능 최적화 유틸리티
데이터베이스 쿼리, 캐싱, 응답시간을 최적화합니다.
"""

import time
from functools import wraps
from typing import Any
from collections.abc import Callable
from sqlalchemy.orm import joinedload, selectinload
import logging

logger = logging.getLogger(__name__)

class PerformanceOptimizer:
    """성능 최적화 클래스"""

    def __init__(self):
        self.query_cache = {}
        self.cache_ttl = 300  # 5분 캐시
        self.slow_query_threshold = 1000  # 1초 이상 쿼리 경고

    def optimize_query(self, query, use_joinedload=True, use_selectinload=False):
        """SQLAlchemy 쿼리 최적화"""
        try:
            # joinedload로 N+1 문제 해결
            if use_joinedload and hasattr(query, 'options'):
                # 자주 사용되는 관계들 미리 로드
                query = query.options(
                    joinedload('*')  # 모든 관계 미리 로드
                )

            # selectinload로 대량 데이터 최적화
            if use_selectinload and hasattr(query, 'options'):
                query = query.options(
                    selectinload('*')
                )

            return query
        except Exception as e:
            logger.warning(f"쿼리 최적화 실패: {e}")
            return query

    def cache_result(self, key: str, result: Any, ttl: int = None):
        """결과 캐싱"""
        if ttl is None:
            ttl = self.cache_ttl

        self.query_cache[key] = {
            'result': result,
            'timestamp': time.time(),
            'ttl': ttl
        }

    def get_cached_result(self, key: str) -> Any | None:
        """캐시된 결과 조회"""
        if key not in self.query_cache:
            return None

        cached = self.query_cache[key]
        if time.time() - cached['timestamp'] > cached['ttl']:
            del self.query_cache[key]
            return None

        return cached['result']

    def clear_cache(self, pattern: str = None):
        """캐시 클리어"""
        if pattern:
            keys_to_remove = [k for k in self.query_cache.keys() if pattern in k]
            for key in keys_to_remove:
                del self.query_cache[key]
        else:
            self.query_cache.clear()

# 전역 성능 최적화 인스턴스
perf_optimizer = PerformanceOptimizer()

def measure_performance(func_name: str = None):
    """성능 측정 데코레이터"""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            result = func(*args, **kwargs)
            execution_time = (time.time() - start_time) * 1000  # ms

            name = func_name or func.__name__

            # 느린 함수 경고
            if execution_time > perf_optimizer.slow_query_threshold:
                logger.warning(f"느린 함수 감지: {name} - {execution_time:.2f}ms")

            # 성능 로깅
            logger.info(f"함수 실행시간: {name} - {execution_time:.2f}ms")

            return result
        return wrapper
    return decorator

def optimize_database_query(query, **kwargs):
    """데이터베이스 쿼리 최적화"""
    return perf_optimizer.optimize_query(query, **kwargs)

def cache_query_result(key: str, ttl: int = None):
    """쿼리 결과 캐싱 데코레이터"""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # 캐시 키 생성
            cache_key = f"{func.__name__}_{hash(str(args) + str(kwargs))}"

            # 캐시에서 결과 조회
            cached_result = perf_optimizer.get_cached_result(cache_key)
            if cached_result is not None:
                logger.info(f"캐시 히트: {func.__name__}")
                return cached_result

            # 캐시 미스 - 함수 실행
            result = func(*args, **kwargs)

            # 결과 캐싱
            perf_optimizer.cache_result(cache_key, result, ttl)
            logger.info(f"캐시 저장: {func.__name__}")

            return result
        return wrapper
    return decorator

def batch_process(items: list[Any], batch_size: int = 100, process_func: Callable = None):
    """배치 처리로 메모리 사용량 최적화"""
    if not process_func:
        return items

    results = []
    for i in range(0, len(items), batch_size):
        batch = items[i:i + batch_size]
        batch_result = process_func(batch)
        results.extend(batch_result)

    return results

def optimize_json_response(data: Any) -> Any:
    """JSON 응답 최적화"""
    from utils.json_encoder import convert_to_serializable

    # 데이터를 직렬화 가능한 형태로 변환
    optimized_data = convert_to_serializable(data)

    # 불필요한 데이터 제거
    if isinstance(optimized_data, dict):
        # None 값 제거
        optimized_data = {k: v for k, v in optimized_data.items() if v is not None}

        # 빈 문자열 제거
        optimized_data = {k: v for k, v in optimized_data.items() if v != ""}

    return optimized_data

def get_performance_stats() -> dict[str, Any]:
    """성능 통계 조회"""
    return {
        'cache_size': len(perf_optimizer.query_cache),
        'cache_ttl': perf_optimizer.cache_ttl,
        'slow_query_threshold': perf_optimizer.slow_query_threshold,
        'cached_keys': list(perf_optimizer.query_cache.keys())
    }

def clear_performance_cache():
    """성능 캐시 클리어"""
    perf_optimizer.clear_cache()
    logger.info("성능 캐시가 클리어되었습니다.")
