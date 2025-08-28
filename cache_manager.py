"""
Redis 캐싱 관리자
자주 사용되는 데이터를 캐싱하여 성능 향상
"""
import json
import hashlib
import logging
from datetime import datetime, timedelta
from typing import Any, Optional, Union
import redis

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CacheManager:
    """Redis 캐싱 관리자"""
    
    def __init__(self, redis_url: str = 'redis://localhost:6379/0'):
        try:
            self.redis_client = redis.from_url(redis_url)
            self.redis_client.ping()  # 연결 테스트
            logger.info("✅ Redis 연결 성공")
        except Exception as e:
            logger.error(f"❌ Redis 연결 실패: {e}")
            self.redis_client = None
    
    def _generate_cache_key(self, prefix: str, *args, **kwargs) -> str:
        """캐시 키 생성"""
        # 인자들을 문자열로 변환하여 해시 생성
        key_parts = [prefix] + [str(arg) for arg in args]
        
        # 키워드 인자들을 정렬하여 일관된 키 생성
        if kwargs:
            sorted_kwargs = sorted(kwargs.items())
            key_parts.extend([f"{k}:{v}" for k, v in sorted_kwargs])
        
        key_string = "|".join(key_parts)
        return hashlib.md5(key_string.encode()).hexdigest()
    
    def set_cache(self, key: str, value: Any, expire_seconds: int = 3600) -> bool:
        """캐시에 데이터 저장"""
        if not self.redis_client:
            return False
        
        try:
            # JSON 직렬화 가능한 데이터만 캐싱
            serialized_value = json.dumps(value, default=str)
            self.redis_client.setex(key, expire_seconds, serialized_value)
            logger.debug(f"💾 캐시 저장: {key} (만료: {expire_seconds}초)")
            return True
        except Exception as e:
            logger.error(f"❌ 캐시 저장 실패: {key} - {e}")
            return False
    
    def get_cache(self, key: str) -> Optional[Any]:
        """캐시에서 데이터 조회"""
        if not self.redis_client:
            return None
        
        try:
            cached_data = self.redis_client.get(key)
            if cached_data:
                value = json.loads(cached_data)
                logger.debug(f"📖 캐시 히트: {key}")
                return value
            else:
                logger.debug(f"❌ 캐시 미스: {key}")
                return None
        except Exception as e:
            logger.error(f"❌ 캐시 조회 실패: {key} - {e}")
            return None
    
    def delete_cache(self, key: str) -> bool:
        """캐시 삭제"""
        if not self.redis_client:
            return False
        
        try:
            result = self.redis_client.delete(key)
            if result:
                logger.debug(f"🗑️ 캐시 삭제: {key}")
            return bool(result)
        except Exception as e:
            logger.error(f"❌ 캐시 삭제 실패: {key} - {e}")
            return False
    
    def clear_pattern(self, pattern: str) -> int:
        """패턴에 맞는 캐시들 삭제"""
        if not self.redis_client:
            return 0
        
        try:
            keys = self.redis_client.keys(pattern)
            if keys:
                deleted_count = self.redis_client.delete(*keys)
                logger.info(f"🗑️ 패턴 캐시 삭제: {pattern} - {deleted_count}개")
                return deleted_count
            return 0
        except Exception as e:
            logger.error(f"❌ 패턴 캐시 삭제 실패: {pattern} - {e}")
            return 0
    
    def get_cache_stats(self) -> dict:
        """캐시 통계 정보"""
        if not self.redis_client:
            return {"error": "Redis 연결 없음"}
        
        try:
            info = self.redis_client.info()
            stats = {
                "redis_version": info.get("redis_version", "unknown"),
                "connected_clients": info.get("connected_clients", 0),
                "used_memory_human": info.get("used_memory_human", "unknown"),
                "total_commands_processed": info.get("total_commands_processed", 0),
                "keyspace_hits": info.get("keyspace_hits", 0),
                "keyspace_misses": info.get("keyspace_misses", 0),
                "total_keys": sum(int(db.get("keys", 0)) for db in info.values() if isinstance(db, dict) and "keys" in db)
            }
            
            # 캐시 히트율 계산
            total_requests = stats["keyspace_hits"] + stats["keyspace_misses"]
            if total_requests > 0:
                hit_rate = (stats["keyspace_hits"] / total_requests) * 100
                stats["cache_hit_rate"] = f"{hit_rate:.2f}%"
            else:
                stats["cache_hit_rate"] = "0.00%"
            
            return stats
        except Exception as e:
            logger.error(f"❌ 캐시 통계 조회 실패: {e}")
            return {"error": str(e)}

# 전역 캐시 매니저 인스턴스
cache_manager = CacheManager()

# 캐싱 데코레이터
def cache_result(prefix: str, expire_seconds: int = 3600):
    """함수 결과를 캐싱하는 데코레이터"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            # 캐시 키 생성
            cache_key = cache_manager._generate_cache_key(prefix, *args, **kwargs)
            
            # 캐시에서 조회 시도
            cached_result = cache_manager.get_cache(cache_key)
            if cached_result is not None:
                return cached_result
            
            # 캐시에 없으면 함수 실행
            result = func(*args, **kwargs)
            
            # 결과를 캐시에 저장
            cache_manager.set_cache(cache_key, result, expire_seconds)
            
            return result
        return wrapper
    return decorator

# 특정 데이터 타입별 캐싱 함수들
def cache_user_data(user_id: str, data: dict, expire_seconds: int = 1800) -> bool:
    """사용자 데이터 캐싱 (30분)"""
    key = f"user:{user_id}"
    return cache_manager.set_cache(key, data, expire_seconds)

def get_cached_user_data(user_id: str) -> Optional[dict]:
    """캐시된 사용자 데이터 조회"""
    key = f"user:{user_id}"
    return cache_manager.get_cache(key)

def cache_party_list(party_type: str, data: list, expire_seconds: int = 900) -> bool:
    """파티 목록 캐싱 (15분)"""
    key = f"parties:{party_type}"
    return cache_manager.set_cache(key, data, expire_seconds)

def get_cached_party_list(party_type: str) -> Optional[list]:
    """캐시된 파티 목록 조회"""
    key = f"parties:{party_type}"
    return cache_manager.get_cache(key)

def cache_recommendations(data: dict, expire_seconds: int = 3600) -> bool:
    """추천 데이터 캐싱 (1시간)"""
    key = "recommendations:lunch"
    return cache_manager.set_cache(key, data, expire_seconds)

def get_cached_recommendations() -> Optional[dict]:
    """캐시된 추천 데이터 조회"""
    key = "recommendations:lunch"
    return cache_manager.get_cache(key)

def clear_user_cache(user_id: str) -> bool:
    """사용자 관련 캐시 삭제"""
    pattern = f"user:{user_id}*"
    return cache_manager.clear_pattern(pattern) > 0

def clear_party_cache() -> bool:
    """파티 관련 캐시 삭제"""
    pattern = "parties:*"
    return cache_manager.clear_pattern(pattern) > 0

def clear_all_cache() -> bool:
    """모든 캐시 삭제"""
    if not cache_manager.redis_client:
        return False
    
    try:
        cache_manager.redis_client.flushdb()
        logger.info("🗑️ 모든 캐시 삭제 완료")
        return True
    except Exception as e:
        logger.error(f"❌ 전체 캐시 삭제 실패: {e}")
        return False

# 캐시 상태 확인 엔드포인트용 함수
def get_cache_status() -> dict:
    """캐시 상태 정보 반환"""
    return {
        "status": "success",
        "cache_manager": "available" if cache_manager.redis_client else "unavailable",
        "stats": cache_manager.get_cache_stats() if cache_manager.redis_client else {},
        "timestamp": datetime.now().isoformat()
    }

# 개발 환경에서 테스트용 함수
if __name__ == '__main__':
    print("🧪 캐시 매니저 테스트")
    
    # 기본 캐싱 테스트
    test_data = {"message": "Hello Cache!", "timestamp": datetime.now().isoformat()}
    
    # 캐시 저장
    cache_key = "test:basic"
    if cache_manager.set_cache(cache_key, test_data, 60):
        print("✅ 캐시 저장 성공")
        
        # 캐시 조회
        cached_data = cache_manager.get_cache(cache_key)
        if cached_data:
            print(f"✅ 캐시 조회 성공: {cached_data}")
        else:
            print("❌ 캐시 조회 실패")
        
        # 캐시 삭제
        if cache_manager.delete_cache(cache_key):
            print("✅ 캐시 삭제 성공")
        else:
            print("❌ 캐시 삭제 실패")
    else:
        print("❌ 캐시 저장 실패")
    
    # 데코레이터 테스트
    @cache_result("test_function", 60)
    def test_function(x: int, y: int) -> int:
        print(f"🔧 함수 실행: {x} + {y}")
        return x + y
    
    # 첫 번째 실행 (캐시 미스)
    result1 = test_function(5, 3)
    print(f"첫 번째 실행 결과: {result1}")
    
    # 두 번째 실행 (캐시 히트)
    result2 = test_function(5, 3)
    print(f"두 번째 실행 결과: {result2}")
    
    # 캐시 통계 출력
    stats = cache_manager.get_cache_stats()
    print(f"캐시 통계: {stats}")
