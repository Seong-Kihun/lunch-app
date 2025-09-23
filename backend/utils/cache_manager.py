"""
캐시 관리 시스템
Redis를 사용한 캐싱 시스템을 제공합니다.
"""

import json
import pickle
from datetime import datetime, timedelta
from typing import Any, Optional, Union
import redis
from flask import current_app

class CacheManager:
    """캐시 관리 클래스"""
    
    def __init__(self, redis_url='redis://localhost:6379/0', default_ttl=3600):
        self.redis_url = redis_url
        self.default_ttl = default_ttl
        self.redis_client = None
        self._connect()
    
    def _connect(self):
        """Redis 연결"""
        try:
            self.redis_client = redis.from_url(self.redis_url, decode_responses=True)
            # 연결 테스트
            self.redis_client.ping()
            print("✅ Redis 연결 성공")
        except Exception as e:
            print(f"❌ Redis 연결 실패: {e}")
            self.redis_client = None
    
    def _get_key(self, key: str, namespace: str = 'default') -> str:
        """캐시 키 생성"""
        return f"{namespace}:{key}"
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None, namespace: str = 'default') -> bool:
        """캐시 저장"""
        if not self.redis_client:
            return False
        
        try:
            cache_key = self._get_key(key, namespace)
            ttl = ttl or self.default_ttl
            
            # JSON 직렬화 시도
            try:
                serialized_value = json.dumps(value, ensure_ascii=False)
            except (TypeError, ValueError):
                # JSON 직렬화 실패 시 pickle 사용
                serialized_value = pickle.dumps(value)
            
            result = self.redis_client.setex(cache_key, ttl, serialized_value)
            return result
        except Exception as e:
            print(f"캐시 저장 실패: {e}")
            return False
    
    def get(self, key: str, namespace: str = 'default') -> Optional[Any]:
        """캐시 조회"""
        if not self.redis_client:
            return None
        
        try:
            cache_key = self._get_key(key, namespace)
            value = self.redis_client.get(cache_key)
            
            if value is None:
                return None
            
            # JSON 역직렬화 시도
            try:
                return json.loads(value)
            except (TypeError, ValueError):
                # JSON 역직렬화 실패 시 pickle 사용
                return pickle.loads(value)
        except Exception as e:
            print(f"캐시 조회 실패: {e}")
            return None
    
    def delete(self, key: str, namespace: str = 'default') -> bool:
        """캐시 삭제"""
        if not self.redis_client:
            return False
        
        try:
            cache_key = self._get_key(key, namespace)
            result = self.redis_client.delete(cache_key)
            return result > 0
        except Exception as e:
            print(f"캐시 삭제 실패: {e}")
            return False
    
    def exists(self, key: str, namespace: str = 'default') -> bool:
        """캐시 존재 여부 확인"""
        if not self.redis_client:
            return False
        
        try:
            cache_key = self._get_key(key, namespace)
            return self.redis_client.exists(cache_key) > 0
        except Exception as e:
            print(f"캐시 존재 확인 실패: {e}")
            return False
    
    def expire(self, key: str, ttl: int, namespace: str = 'default') -> bool:
        """캐시 만료 시간 설정"""
        if not self.redis_client:
            return False
        
        try:
            cache_key = self._get_key(key, namespace)
            return self.redis_client.expire(cache_key, ttl)
        except Exception as e:
            print(f"캐시 만료 시간 설정 실패: {e}")
            return False
    
    def get_ttl(self, key: str, namespace: str = 'default') -> int:
        """캐시 남은 시간 조회"""
        if not self.redis_client:
            return -1
        
        try:
            cache_key = self._get_key(key, namespace)
            return self.redis_client.ttl(cache_key)
        except Exception as e:
            print(f"캐시 TTL 조회 실패: {e}")
            return -1
    
    def clear_namespace(self, namespace: str = 'default') -> bool:
        """네임스페이스 전체 삭제"""
        if not self.redis_client:
            return False
        
        try:
            pattern = f"{namespace}:*"
            keys = self.redis_client.keys(pattern)
            if keys:
                return self.redis_client.delete(*keys) > 0
            return True
        except Exception as e:
            print(f"네임스페이스 삭제 실패: {e}")
            return False
    
    def get_stats(self) -> dict:
        """캐시 통계 조회"""
        if not self.redis_client:
            return {"error": "Redis 연결 없음"}
        
        try:
            info = self.redis_client.info()
            return {
                "connected": True,
                "used_memory": info.get("used_memory_human", "0B"),
                "connected_clients": info.get("connected_clients", 0),
                "total_commands_processed": info.get("total_commands_processed", 0),
                "keyspace_hits": info.get("keyspace_hits", 0),
                "keyspace_misses": info.get("keyspace_misses", 0),
                "hit_rate": self._calculate_hit_rate(info)
            }
        except Exception as e:
            return {"error": f"통계 조회 실패: {e}"}
    
    def _calculate_hit_rate(self, info: dict) -> float:
        """히트율 계산"""
        hits = info.get("keyspace_hits", 0)
        misses = info.get("keyspace_misses", 0)
        total = hits + misses
        return (hits / total * 100) if total > 0 else 0.0

# 채팅 관련 캐시 매니저
class ChatCacheManager(CacheManager):
    """채팅 전용 캐시 매니저"""
    
    def __init__(self):
        super().__init__()
        self.namespace = 'chat'
    
    def cache_messages(self, chat_type: str, chat_id: int, messages: list, ttl: int = 1800):
        """메시지 목록 캐시"""
        key = f"messages:{chat_type}:{chat_id}"
        return self.set(key, messages, ttl)
    
    def get_cached_messages(self, chat_type: str, chat_id: int) -> Optional[list]:
        """캐시된 메시지 목록 조회"""
        key = f"messages:{chat_type}:{chat_id}"
        return self.get(key)
    
    def cache_user_online_status(self, user_id: str, status: bool, ttl: int = 300):
        """사용자 온라인 상태 캐시"""
        key = f"user_online:{user_id}"
        return self.set(key, status, ttl)
    
    def get_user_online_status(self, user_id: str) -> Optional[bool]:
        """사용자 온라인 상태 조회"""
        key = f"user_online:{user_id}"
        return self.get(key)
    
    def cache_chat_room_info(self, chat_type: str, chat_id: int, room_info: dict, ttl: int = 3600):
        """채팅방 정보 캐시"""
        key = f"room_info:{chat_type}:{chat_id}"
        return self.set(key, room_info, ttl)
    
    def get_cached_chat_room_info(self, chat_type: str, chat_id: int) -> Optional[dict]:
        """캐시된 채팅방 정보 조회"""
        key = f"room_info:{chat_type}:{chat_id}"
        return self.get(key)
    
    def cache_unread_count(self, user_id: str, chat_type: str, chat_id: int, count: int, ttl: int = 300):
        """읽지 않은 메시지 수 캐시"""
        key = f"unread_count:{user_id}:{chat_type}:{chat_id}"
        return self.set(key, count, ttl)
    
    def get_cached_unread_count(self, user_id: str, chat_type: str, chat_id: int) -> Optional[int]:
        """캐시된 읽지 않은 메시지 수 조회"""
        key = f"unread_count:{user_id}:{chat_type}:{chat_id}"
        return self.get(key)
    
    def invalidate_chat_cache(self, chat_type: str, chat_id: int):
        """채팅 관련 캐시 무효화"""
        patterns = [
            f"messages:{chat_type}:{chat_id}",
            f"room_info:{chat_type}:{chat_id}",
            f"unread_count:*:{chat_type}:{chat_id}"
        ]
        
        for pattern in patterns:
            try:
                keys = self.redis_client.keys(pattern) if self.redis_client else []
                if keys:
                    self.redis_client.delete(*keys)
            except Exception as e:
                print(f"캐시 무효화 실패 ({pattern}): {e}")

# 전역 캐시 매니저 인스턴스
cache_manager = CacheManager()
chat_cache_manager = ChatCacheManager()