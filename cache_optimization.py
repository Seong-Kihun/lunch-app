#!/usr/bin/env python3
"""
캐시 시스템 최적화 스크립트
Redis 캐시 성능을 분석하고 최적화합니다.
"""

import sys
import os
import time
import json
from datetime import datetime, timedelta

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from cache_manager import cache_manager
from extensions import db
from app import app

class CacheOptimizer:
    def __init__(self):
        self.cache_stats = {
            'hits': 0,
            'misses': 0,
            'sets': 0,
            'deletes': 0,
            'errors': 0
        }
        self.performance_data = []
    
    def test_cache_connection(self):
        """캐시 연결 테스트"""
        print("🔗 캐시 연결 테스트...")
        
        if cache_manager.redis_client:
            try:
                # 연결 테스트
                start_time = time.time()
                cache_manager.redis_client.ping()
                response_time = (time.time() - start_time) * 1000
                
                print(f"   ✅ Redis 연결 성공 (응답시간: {response_time:.1f}ms)")
                
                # 기본 정보 수집
                info = cache_manager.redis_client.info()
                print(f"   📊 Redis 버전: {info.get('redis_version', 'Unknown')}")
                print(f"   💾 사용 메모리: {info.get('used_memory_human', 'Unknown')}")
                print(f"   🔑 키 개수: {info.get('db0', {}).get('keys', 0)}")
                
                return True
            except Exception as e:
                print(f"   ❌ Redis 연결 실패: {e}")
                return False
        else:
            print("   ⚠️ Redis가 오프라인 모드입니다.")
            return False
    
    def test_cache_performance(self):
        """캐시 성능 테스트"""
        print("\n⚡ 캐시 성능 테스트...")
        
        if not cache_manager.redis_client:
            print("   ⚠️ Redis가 연결되지 않아 테스트를 건너뜁니다.")
            return
        
        test_data = {
            'string': 'test_string_value',
            'number': 12345,
            'list': [1, 2, 3, 4, 5],
            'dict': {'key1': 'value1', 'key2': 'value2'}
        }
        
        # SET 성능 테스트
        set_times = []
        for i in range(100):
            key = f"test_key_{i}"
            start_time = time.time()
            cache_manager.set(key, test_data, ttl=60)
            set_time = (time.time() - start_time) * 1000
            set_times.append(set_time)
            self.cache_stats['sets'] += 1
        
        avg_set_time = sum(set_times) / len(set_times)
        print(f"   📝 SET 평균 시간: {avg_set_time:.2f}ms")
        
        # GET 성능 테스트
        get_times = []
        for i in range(100):
            key = f"test_key_{i}"
            start_time = time.time()
            result = cache_manager.get(key)
            get_time = (time.time() - start_time) * 1000
            get_times.append(get_time)
            
            if result:
                self.cache_stats['hits'] += 1
            else:
                self.cache_stats['misses'] += 1
        
        avg_get_time = sum(get_times) / len(get_times)
        hit_rate = self.cache_stats['hits'] / (self.cache_stats['hits'] + self.cache_stats['misses']) * 100
        print(f"   📖 GET 평균 시간: {avg_get_time:.2f}ms")
        print(f"   🎯 캐시 히트율: {hit_rate:.1f}%")
        
        # DELETE 성능 테스트
        delete_times = []
        for i in range(100):
            key = f"test_key_{i}"
            start_time = time.time()
            cache_manager.delete(key)
            delete_time = (time.time() - start_time) * 1000
            delete_times.append(delete_time)
            self.cache_stats['deletes'] += 1
        
        avg_delete_time = sum(delete_times) / len(delete_times)
        print(f"   🗑️ DELETE 평균 시간: {avg_delete_time:.2f}ms")
        
        # 성능 데이터 저장
        self.performance_data.append({
            'timestamp': datetime.now().isoformat(),
            'avg_set_time': avg_set_time,
            'avg_get_time': avg_get_time,
            'avg_delete_time': avg_delete_time,
            'hit_rate': hit_rate
        })
    
    def analyze_cache_patterns(self):
        """캐시 사용 패턴 분석"""
        print("\n📊 캐시 사용 패턴 분석...")
        
        if not cache_manager.redis_client:
            print("   ⚠️ Redis가 연결되지 않아 분석을 건너뜁니다.")
            return
        
        try:
            # 키 패턴 분석
            all_keys = cache_manager.redis_client.keys('*')
            key_patterns = {}
            
            for key in all_keys:
                key_str = key.decode('utf-8') if isinstance(key, bytes) else key
                pattern = key_str.split(':')[0] if ':' in key_str else 'root'
                key_patterns[pattern] = key_patterns.get(pattern, 0) + 1
            
            print("   🔑 키 패턴 분포:")
            for pattern, count in sorted(key_patterns.items(), key=lambda x: x[1], reverse=True):
                print(f"      {pattern}: {count}개")
            
            # TTL 분석
            ttl_analysis = {'no_ttl': 0, 'short_ttl': 0, 'medium_ttl': 0, 'long_ttl': 0}
            
            for key in all_keys[:100]:  # 샘플링
                ttl = cache_manager.redis_client.ttl(key)
                if ttl == -1:
                    ttl_analysis['no_ttl'] += 1
                elif ttl < 300:  # 5분 미만
                    ttl_analysis['short_ttl'] += 1
                elif ttl < 3600:  # 1시간 미만
                    ttl_analysis['medium_ttl'] += 1
                else:
                    ttl_analysis['long_ttl'] += 1
            
            print("   ⏰ TTL 분포 (샘플 100개):")
            print(f"      TTL 없음: {ttl_analysis['no_ttl']}개")
            print(f"      짧은 TTL (<5분): {ttl_analysis['short_ttl']}개")
            print(f"      중간 TTL (5분-1시간): {ttl_analysis['medium_ttl']}개")
            print(f"      긴 TTL (>1시간): {ttl_analysis['long_ttl']}개")
            
        except Exception as e:
            print(f"   ❌ 패턴 분석 실패: {e}")
            self.cache_stats['errors'] += 1
    
    def generate_optimization_recommendations(self):
        """최적화 권장사항 생성"""
        print("\n💡 최적화 권장사항...")
        
        recommendations = []
        
        # 히트율 기반 권장사항
        if self.cache_stats['hits'] + self.cache_stats['misses'] > 0:
            hit_rate = self.cache_stats['hits'] / (self.cache_stats['hits'] + self.cache_stats['misses']) * 100
            
            if hit_rate < 50:
                recommendations.append("🎯 캐시 히트율이 낮습니다. 캐시 키 전략을 재검토하세요.")
            elif hit_rate > 90:
                recommendations.append("✅ 캐시 히트율이 우수합니다.")
            else:
                recommendations.append("📈 캐시 히트율이 양호합니다. 추가 최적화 여지가 있습니다.")
        
        # 성능 기반 권장사항
        if self.performance_data:
            latest_data = self.performance_data[-1]
            
            if latest_data['avg_get_time'] > 10:
                recommendations.append("⚡ GET 응답시간이 느립니다. Redis 설정을 최적화하세요.")
            
            if latest_data['avg_set_time'] > 20:
                recommendations.append("📝 SET 응답시간이 느립니다. 데이터 크기를 줄이거나 배치 처리를 고려하세요.")
        
        # 일반적인 권장사항
        recommendations.extend([
            "🔧 Redis 메모리 사용량을 모니터링하세요.",
            "⏰ 적절한 TTL을 설정하여 메모리 누수를 방지하세요.",
            "🗂️ 키 네이밍 컨벤션을 일관성 있게 유지하세요.",
            "📊 캐시 사용 패턴을 정기적으로 분석하세요."
        ])
        
        for i, rec in enumerate(recommendations, 1):
            print(f"   {i}. {rec}")
        
        return recommendations
    
    def create_cache_config_template(self):
        """캐시 설정 템플릿 생성"""
        print("\n📋 캐시 설정 템플릿 생성...")
        
        config_template = """# Redis 캐시 최적화 설정
# .env 파일에 추가하세요

# Redis 연결 설정
REDIS_URL=redis://localhost:6379/0
REDIS_MAX_CONNECTIONS=20
REDIS_SOCKET_TIMEOUT=5
REDIS_SOCKET_CONNECT_TIMEOUT=2

# 캐시 TTL 설정 (초)
CACHE_DEFAULT_TTL=3600          # 기본 TTL: 1시간
CACHE_USER_TTL=1800             # 사용자 데이터: 30분
CACHE_RESTAURANT_TTL=7200       # 식당 데이터: 2시간
CACHE_PARTY_TTL=900             # 파티 데이터: 15분
CACHE_SCHEDULE_TTL=600          # 일정 데이터: 10분

# 캐시 키 패턴
CACHE_KEY_PREFIX=lunch_app
CACHE_KEY_SEPARATOR=:

# 성능 최적화
CACHE_COMPRESSION=true
CACHE_SERIALIZATION=json
CACHE_POOL_SIZE=10

# 모니터링
CACHE_MONITORING=true
CACHE_LOG_LEVEL=INFO
"""
        
        with open('cache_config_template.env', 'w', encoding='utf-8') as f:
            f.write(config_template)
        
        print("✅ 캐시 설정 템플릿이 cache_config_template.env에 생성되었습니다.")
    
    def run_optimization(self):
        """전체 최적화 실행"""
        print("🚀 캐시 시스템 최적화 시작")
        print("=" * 50)
        
        # 연결 테스트
        cache_connected = self.test_cache_connection()
        
        if cache_connected:
            # 성능 테스트
            self.test_cache_performance()
            
            # 패턴 분석
            self.analyze_cache_patterns()
        
        # 권장사항 생성
        recommendations = self.generate_optimization_recommendations()
        
        # 설정 템플릿 생성
        self.create_cache_config_template()
        
        # 결과 요약
        print("\n📋 최적화 결과 요약")
        print("=" * 50)
        print(f"🔗 캐시 연결: {'✅ 성공' if cache_connected else '❌ 실패'}")
        print(f"📊 캐시 통계:")
        print(f"   • 히트: {self.cache_stats['hits']}회")
        print(f"   • 미스: {self.cache_stats['misses']}회")
        print(f"   • 설정: {self.cache_stats['sets']}회")
        print(f"   • 삭제: {self.cache_stats['deletes']}회")
        print(f"   • 오류: {self.cache_stats['errors']}회")
        
        if self.performance_data:
            latest = self.performance_data[-1]
            print(f"⚡ 성능 지표:")
            print(f"   • GET 평균: {latest['avg_get_time']:.2f}ms")
            print(f"   • SET 평균: {latest['avg_set_time']:.2f}ms")
            print(f"   • 히트율: {latest['hit_rate']:.1f}%")
        
        print(f"\n💡 권장사항: {len(recommendations)}개 생성됨")
        
        return cache_connected

def main():
    """메인 함수"""
    optimizer = CacheOptimizer()
    
    try:
        success = optimizer.run_optimization()
        
        if success:
            print("\n🎉 캐시 최적화가 완료되었습니다!")
            return 0
        else:
            print("\n⚠️ Redis 연결에 문제가 있습니다. 설정을 확인하세요.")
            return 1
            
    except Exception as e:
        print(f"\n❌ 최적화 중 오류 발생: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
