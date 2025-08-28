"""
Redis 캐싱 관리자
자주 사용되는 데이터를 캐싱하여 성능 향상
"""
import json
import hashlib
import logging
import os
from datetime import datetime, timedelta
from typing import Any, Optional, Union

# Redis import
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    redis = None

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CacheManager:
    """Redis 캐싱 관리자"""
    
    def __init__(self, redis_url: Optional[str] = None):
        self.redis_client = None
        
        # 환경변수에서 Redis URL 가져오기
        if not redis_url:
            redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
        
        if REDIS_AVAILABLE:
            try:
                self.redis_client = redis.from_url(redis_url)
                # 연결 테스트
                self.redis_client.ping()
                logger.info(f"✅ Redis 연결 성공: {redis_url}")
            except Exception as e:
                logger.error(f"❌ Redis 연결 실패: {e}")
                logger.error(f"   Redis URL: {redis_url}")
                logger.error("   환경변수 REDIS_URL을 확인하거나 Redis 서비스를 시작하세요")
                self.redis_client = None
        else:
            logger.error("❌ Redis 패키지가 설치되지 않았습니다")
            logger.error("   pip install redis를 실행하세요")
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
            logger.warning("⚠️ Redis가 연결되지 않아 캐싱을 건너뜁니다")
            return False
        
        try:
            # JSON 직렬화 가능한 데이터만 캐싱
            serialized_value = json.dumps(value, default=str)
            self.redis_client.setex(key, expire_seconds, serialized_value)
            logger.debug(f"💾 Redis 캐시 저장: {key} (만료: {expire_seconds}초)")
            return True
        except Exception as e:
            logger.error(f"❌ Redis 캐시 저장 실패: {key} - {e}")
            return False
    
    def get_cache(self, key: str) -> Optional[Any]:
        """캐시에서 데이터 조회"""
        if not self.redis_client:
            logger.warning("⚠️ Redis가 연결되지 않아 캐시를 조회할 수 없습니다")
            return None
        
        try:
            cached_data = self.redis_client.get(key)
            if cached_data:
                value = json.loads(cached_data)
                logger.debug(f"📖 Redis 캐시 히트: {key}")
                return value
            else:
                logger.debug(f"❌ Redis 캐시 미스: {key}")
                return None
        except Exception as e:
            logger.error(f"❌ Redis 캐시 조회 실패: {key} - {e}")
            return None
    
    def delete_cache(self, key: str) -> bool:
        """캐시 삭제"""
        if not self.redis_client:
            logger.warning("⚠️ Redis가 연결되지 않아 캐시를 삭제할 수 없습니다")
            return False
        
        try:
            result = self.redis_client.delete(key)
            if result:
                logger.debug(f"🗑️ Redis 캐시 삭제: {key}")
            return bool(result)
        except Exception as e:
            logger.error(f"❌ Redis 캐시 삭제 실패: {key} - {e}")
            return False
    
    def clear_pattern(self, pattern: str) -> int:
        """패턴에 맞는 캐시들 삭제"""
        if not self.redis_client:
            logger.warning("⚠️ Redis가 연결되지 않아 패턴 캐시를 삭제할 수 없습니다")
            return 0
        
        try:
            keys = self.redis_client.keys(pattern)
            if keys:
                deleted_count = self.redis_client.delete(*keys)
                logger.info(f"🗑️ Redis 패턴 캐시 삭제: {pattern} - {deleted_count}개")
                return deleted_count
            return 0
        except Exception as e:
            logger.error(f"❌ Redis 패턴 캐시 삭제 실패: {pattern} - {e}")
            return 0
    
    def get_cache_stats(self) -> dict:
        """캐시 통계 정보"""
        if not self.redis_client:
            return {
                'status': 'disconnected',
                'message': 'Redis가 연결되지 않았습니다'
            }
        
        try:
            info = self.redis_client.info()
            return {
                'status': 'connected',
                'redis_version': info.get('redis_version', 'unknown'),
                'used_memory_human': info.get('used_memory_human', 'unknown'),
                'connected_clients': info.get('connected_clients', 0),
                'total_commands_processed': info.get('total_commands_processed', 0)
            }
        except Exception as e:
            return {
                'status': 'error',
                'message': str(e)
            }

# 전역 캐시 매니저 인스턴스
cache_manager = CacheManager()

def cache_result(expire_seconds: int = 3600):
    """함수 결과를 캐싱하는 데코레이터"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            # 캐시 키 생성
            cache_key = cache_manager._generate_cache_key(
                f"func:{func.__name__}", 
                *args, 
                **kwargs
            )
            
            # 캐시에서 결과 조회 시도
            cached_result = cache_manager.get_cache(cache_key)
            if cached_result is not None:
                return cached_result
            
            # 함수 실행
            result = func(*args, **kwargs)
            
            # 결과를 캐시에 저장
            cache_manager.set_cache(cache_key, result, expire_seconds)
            
            return result
        return wrapper
    return decorator

# 특정 데이터 타입별 캐싱 헬퍼 함수들
def cache_user_data(user_id: int, data: Any, expire_seconds: int = 1800):
    """사용자 데이터 캐싱"""
    key = f"user:{user_id}"
    return cache_manager.set_cache(key, data, expire_seconds)

def get_cached_user_data(user_id: int) -> Optional[Any]:
    """사용자 데이터 캐시 조회"""
    key = f"user:{user_id}"
    return cache_manager.get_cache(key)

def cache_party_list(party_type: str, data: Any, expire_seconds: int = 900):
    """파티 목록 캐싱"""
    key = f"parties:{party_type}"
    return cache_manager.set_cache(key, data, expire_seconds)

def get_cached_party_list(party_type: str) -> Optional[Any]:
    """파티 목록 캐시 조회"""
    key = f"parties:{party_type}"
    return cache_manager.get_cache(key)

def cache_recommendations(date: str, data: Any, expire_seconds: int = 3600):
    """추천 데이터 캐싱"""
    key = f"recommendations:{date}"
    return cache_manager.set_cache(key, data, expire_seconds)

def get_cached_recommendations(date: str) -> Optional[Any]:
    """추천 데이터 캐시 조회"""
    key = f"recommendations:{date}"
    return cache_manager.get_cache(key)
