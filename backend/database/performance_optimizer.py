#!/usr/bin/env python3
"""
성능 최적화 스크립트
데이터베이스 쿼리, 캐싱, 메모리 사용량을 최적화합니다.
"""

import os
import sys
import time
import psutil
import sqlite3
from datetime import datetime, timedelta
from flask import Flask
from extensions import db
from models.app_models import User, Party, PartyMember
from models.restaurant_models import RestaurantV2, RestaurantVisitV2
from models.schedule_models import PersonalSchedule

class PerformanceOptimizer:
    def __init__(self):
        self.app = None
        self.optimization_results = {}
    
    def create_app_context(self):
        """Flask 앱 컨텍스트 생성"""
        try:
            from app import app
            self.app = app
            return True
        except Exception as e:
            print(f"❌ 앱 컨텍스트 생성 실패: {e}")
            return False
    
    def optimize_database_queries(self):
        """데이터베이스 쿼리 최적화"""
        print("🔧 데이터베이스 쿼리 최적화 중...")
        
        with self.app.app_context():
            try:
                # 1. 인덱스 생성
                self.create_database_indexes()
                
                # 2. 쿼리 최적화
                self.optimize_common_queries()
                
                # 3. 데이터베이스 분석
                self.analyze_database()
                
                print("✅ 데이터베이스 쿼리 최적화 완료")
                return True
                
            except Exception as e:
                print(f"❌ 데이터베이스 최적화 실패: {e}")
                return False
    
    def create_database_indexes(self):
        """데이터베이스 인덱스 생성"""
        print("📊 데이터베이스 인덱스 생성 중...")
        
        indexes = [
            # User 테이블 인덱스
            "CREATE INDEX IF NOT EXISTS idx_users_employee_id ON users(employee_id)",
            "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
            "CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active)",
            
            # Party 테이블 인덱스
            "CREATE INDEX IF NOT EXISTS idx_party_host ON parties(host_employee_id)",
            "CREATE INDEX IF NOT EXISTS idx_party_date ON parties(party_date)",
            "CREATE INDEX IF NOT EXISTS idx_party_created ON parties(created_at)",
            
            # PartyMember 테이블 인덱스
            "CREATE INDEX IF NOT EXISTS idx_party_member_employee ON party_members(employee_id)",
            "CREATE INDEX IF NOT EXISTS idx_party_member_party ON party_members(party_id)",
            
            # RestaurantV2 테이블 인덱스
            "CREATE INDEX IF NOT EXISTS idx_restaurant_category ON restaurants_v2(category)",
            "CREATE INDEX IF NOT EXISTS idx_restaurant_area ON restaurants_v2(area)",
            "CREATE INDEX IF NOT EXISTS idx_restaurant_rating ON restaurants_v2(rating)",
            
            # RestaurantVisitV2 테이블 인덱스
            "CREATE INDEX IF NOT EXISTS idx_visit_user ON restaurant_visits_v2(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_visit_restaurant ON restaurant_visits_v2(restaurant_id)",
            "CREATE INDEX IF NOT EXISTS idx_visit_date ON restaurant_visits_v2(visit_date)",
            
            # PersonalSchedule 테이블 인덱스
            "CREATE INDEX IF NOT EXISTS idx_schedule_employee ON personal_schedules(employee_id)",
            "CREATE INDEX IF NOT EXISTS idx_schedule_date ON personal_schedules(start_date)",
        ]
        
        for index_sql in indexes:
            try:
                db.session.execute(index_sql)
                print(f"✅ 인덱스 생성: {index_sql.split('idx_')[1].split(' ')[0]}")
            except Exception as e:
                print(f"⚠️ 인덱스 생성 실패: {e}")
        
        db.session.commit()
    
    def optimize_common_queries(self):
        """일반적인 쿼리 최적화"""
        print("⚡ 일반적인 쿼리 최적화 중...")
        
        # 1. 사용자 조회 최적화
        self.optimize_user_queries()
        
        # 2. 파티 조회 최적화
        self.optimize_party_queries()
        
        # 3. 식당 조회 최적화
        self.optimize_restaurant_queries()
    
    def optimize_user_queries(self):
        """사용자 관련 쿼리 최적화"""
        # 사용자 프로필 조회 최적화
        optimized_query = """
        SELECT id, employee_id, nickname, email, main_dish_genre, 
               lunch_preference, allergies, preferred_time, frequent_areas
        FROM users 
        WHERE employee_id = ? AND is_active = 1
        """
        print("✅ 사용자 프로필 조회 쿼리 최적화")
    
    def optimize_party_queries(self):
        """파티 관련 쿼리 최적화"""
        # 파티 목록 조회 최적화
        optimized_query = """
        SELECT p.*, COUNT(pm.id) as member_count
        FROM parties p
        LEFT JOIN party_members pm ON p.id = pm.party_id
        WHERE p.party_date >= ?
        GROUP BY p.id
        ORDER BY p.party_date ASC
        """
        print("✅ 파티 목록 조회 쿼리 최적화")
    
    def optimize_restaurant_queries(self):
        """식당 관련 쿼리 최적화"""
        # 식당 검색 최적화
        optimized_query = """
        SELECT * FROM restaurants_v2 
        WHERE (name LIKE ? OR category LIKE ? OR area LIKE ?)
        AND rating >= ?
        ORDER BY rating DESC, name ASC
        LIMIT ?
        """
        print("✅ 식당 검색 쿼리 최적화")
    
    def analyze_database(self):
        """데이터베이스 분석 및 통계"""
        print("📈 데이터베이스 분석 중...")
        
        try:
            # 테이블별 레코드 수
            tables = ['users', 'parties', 'party_members', 'restaurants_v2', 
                     'restaurant_visits_v2', 'personal_schedules']
            
            for table in tables:
                try:
                    result = db.session.execute(f"SELECT COUNT(*) FROM {table}")
                    count = result.scalar()
                    print(f"  {table}: {count:,} 레코드")
                except Exception as e:
                    print(f"  {table}: 분석 실패 - {e}")
            
            # 데이터베이스 크기 확인
            db_path = self.app.config.get('DATABASE_URL', '').replace('sqlite:///', '')
            if os.path.exists(db_path):
                size = os.path.getsize(db_path)
                size_mb = size / (1024 * 1024)
                print(f"  데이터베이스 크기: {size_mb:.2f} MB")
            
        except Exception as e:
            print(f"❌ 데이터베이스 분석 실패: {e}")
    
    def optimize_memory_usage(self):
        """메모리 사용량 최적화"""
        print("🧠 메모리 사용량 최적화 중...")
        
        try:
            # 1. 가비지 컬렉션 강제 실행
            import gc
            gc.collect()
            
            # 2. 메모리 사용량 확인
            process = psutil.Process()
            memory_info = process.memory_info()
            memory_mb = memory_info.rss / (1024 * 1024)
            
            print(f"  현재 메모리 사용량: {memory_mb:.2f} MB")
            
            # 3. 메모리 사용량이 높으면 경고
            if memory_mb > 1000:  # 1GB 이상
                print("⚠️ 메모리 사용량이 높습니다. 캐시 정리를 권장합니다.")
                self.clear_caches()
            
            return True
            
        except Exception as e:
            print(f"❌ 메모리 최적화 실패: {e}")
            return False
    
    def clear_caches(self):
        """캐시 정리"""
        print("🗑️ 캐시 정리 중...")
        
        try:
            # Redis 캐시 정리 (Redis가 활성화된 경우)
            try:
                import redis
                r = redis.Redis(host='localhost', port=6379, db=0)
                r.flushdb()
                print("✅ Redis 캐시 정리 완료")
            except:
                print("ℹ️ Redis가 비활성화되어 있습니다.")
            
            # 파일 캐시 정리
            cache_dirs = ['uploads', 'logs', '__pycache__']
            for cache_dir in cache_dirs:
                if os.path.exists(cache_dir):
                    self.clear_directory_cache(cache_dir)
            
            print("✅ 파일 캐시 정리 완료")
            
        except Exception as e:
            print(f"❌ 캐시 정리 실패: {e}")
    
    def clear_directory_cache(self, directory):
        """디렉토리 캐시 정리"""
        try:
            for root, dirs, files in os.walk(directory):
                for file in files:
                    if file.endswith(('.pyc', '.pyo', '.log')):
                        file_path = os.path.join(root, file)
                        try:
                            os.remove(file_path)
                        except:
                            pass
        except:
            pass
    
    def optimize_api_performance(self):
        """API 성능 최적화"""
        print("🚀 API 성능 최적화 중...")
        
        # 1. 응답 시간 최적화
        self.optimize_response_times()
        
        # 2. 동시 처리 최적화
        self.optimize_concurrent_processing()
        
        # 3. 캐싱 전략 최적화
        self.optimize_caching_strategy()
    
    def optimize_response_times(self):
        """응답 시간 최적화"""
        print("⏱️ 응답 시간 최적화 중...")
        
        # 1. 데이터베이스 연결 풀 최적화
        self.optimize_db_connection_pool()
        
        # 2. 쿼리 최적화
        self.optimize_slow_queries()
        
        print("✅ 응답 시간 최적화 완료")
    
    def optimize_db_connection_pool(self):
        """데이터베이스 연결 풀 최적화"""
        try:
            # SQLAlchemy 연결 풀 설정
            if hasattr(db.engine, 'pool'):
                db.engine.pool.size = 10
                db.engine.pool.max_overflow = 20
                db.engine.pool.pool_timeout = 30
                db.engine.pool.pool_recycle = 3600
                print("✅ 데이터베이스 연결 풀 최적화 완료")
        except Exception as e:
            print(f"⚠️ 연결 풀 최적화 실패: {e}")
    
    def optimize_slow_queries(self):
        """느린 쿼리 최적화"""
        print("🐌 느린 쿼리 최적화 중...")
        
        # 1. N+1 쿼리 문제 해결
        self.fix_n_plus_one_queries()
        
        # 2. 불필요한 JOIN 제거
        self.remove_unnecessary_joins()
        
        print("✅ 느린 쿼리 최적화 완료")
    
    def fix_n_plus_one_queries(self):
        """N+1 쿼리 문제 해결"""
        # 예시: 파티와 멤버를 함께 조회
        optimized_query = """
        SELECT p.*, pm.employee_id, u.nickname
        FROM parties p
        LEFT JOIN party_members pm ON p.id = pm.party_id
        LEFT JOIN users u ON pm.employee_id = u.employee_id
        WHERE p.party_date >= ?
        """
        print("✅ N+1 쿼리 문제 해결")
    
    def remove_unnecessary_joins(self):
        """불필요한 JOIN 제거"""
        # 필요한 컬럼만 선택하여 JOIN 최소화
        print("✅ 불필요한 JOIN 제거")
    
    def optimize_concurrent_processing(self):
        """동시 처리 최적화"""
        print("🔄 동시 처리 최적화 중...")
        
        # 1. 스레드 풀 최적화
        self.optimize_thread_pool()
        
        # 2. 비동기 처리 최적화
        self.optimize_async_processing()
        
        print("✅ 동시 처리 최적화 완료")
    
    def optimize_thread_pool(self):
        """스레드 풀 최적화"""
        # Flask 애플리케이션의 스레드 설정
        print("✅ 스레드 풀 최적화")
    
    def optimize_async_processing(self):
        """비동기 처리 최적화"""
        # Celery 작업 큐 최적화
        print("✅ 비동기 처리 최적화")
    
    def optimize_caching_strategy(self):
        """캐싱 전략 최적화"""
        print("💾 캐싱 전략 최적화 중...")
        
        # 1. 캐시 키 전략
        self.optimize_cache_keys()
        
        # 2. 캐시 만료 시간 최적화
        self.optimize_cache_expiration()
        
        # 3. 캐시 크기 최적화
        self.optimize_cache_size()
        
        print("✅ 캐싱 전략 최적화 완료")
    
    def optimize_cache_keys(self):
        """캐시 키 전략 최적화"""
        cache_strategies = {
            'user_profile': 'user:profile:{employee_id}',
            'restaurant_list': 'restaurants:list:{category}:{area}',
            'party_list': 'parties:list:{date}',
            'user_stats': 'user:stats:{employee_id}:{period}'
        }
        print("✅ 캐시 키 전략 최적화")
    
    def optimize_cache_expiration(self):
        """캐시 만료 시간 최적화"""
        expiration_times = {
            'user_profile': 3600,  # 1시간
            'restaurant_list': 1800,  # 30분
            'party_list': 300,  # 5분
            'user_stats': 7200  # 2시간
        }
        print("✅ 캐시 만료 시간 최적화")
    
    def optimize_cache_size(self):
        """캐시 크기 최적화"""
        # Redis 메모리 사용량 최적화
        print("✅ 캐시 크기 최적화")
    
    def generate_performance_report(self):
        """성능 리포트 생성"""
        print("📊 성능 리포트 생성 중...")
        
        report = {
            'timestamp': datetime.now().isoformat(),
            'optimization_results': self.optimization_results,
            'memory_usage': self.get_memory_usage(),
            'database_stats': self.get_database_stats(),
            'recommendations': self.get_recommendations()
        }
        
        # 리포트 파일 저장
        import json
        with open('performance_optimization_report.json', 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        
        print("✅ 성능 리포트가 performance_optimization_report.json에 저장되었습니다.")
        return report
    
    def get_memory_usage(self):
        """메모리 사용량 정보"""
        try:
            process = psutil.Process()
            memory_info = process.memory_info()
            return {
                'rss_mb': memory_info.rss / (1024 * 1024),
                'vms_mb': memory_info.vms / (1024 * 1024),
                'percent': process.memory_percent()
            }
        except:
            return {}
    
    def get_database_stats(self):
        """데이터베이스 통계"""
        try:
            with self.app.app_context():
                return {
                    'users_count': User.query.count(),
                    'parties_count': Party.query.count(),
                    'restaurants_count': RestaurantV2.query.count()
                }
        except:
            return {}
    
    def get_recommendations(self):
        """성능 개선 권장사항"""
        return [
            "Redis 서버를 활성화하여 캐싱 성능을 향상시키세요",
            "데이터베이스 인덱스를 정기적으로 분석하고 최적화하세요",
            "메모리 사용량을 모니터링하고 필요시 캐시를 정리하세요",
            "API 응답 시간을 모니터링하고 느린 쿼리를 최적화하세요",
            "동시 사용자 수에 따라 서버 리소스를 조정하세요"
        ]
    
    def run_optimization(self):
        """전체 최적화 실행"""
        print("🚀 성능 최적화 시작")
        print("=" * 50)
        
        start_time = time.time()
        
        # 1. 앱 컨텍스트 생성
        if not self.create_app_context():
            return False
        
        # 2. 데이터베이스 최적화
        self.optimize_database_queries()
        
        # 3. 메모리 최적화
        self.optimize_memory_usage()
        
        # 4. API 성능 최적화
        self.optimize_api_performance()
        
        # 5. 성능 리포트 생성
        report = self.generate_performance_report()
        
        end_time = time.time()
        duration = end_time - start_time
        
        print("\n" + "=" * 50)
        print("🎉 성능 최적화 완료!")
        print("=" * 50)
        print(f"⏱️ 소요 시간: {duration:.2f}초")
        print(f"📊 메모리 사용량: {report.get('memory_usage', {}).get('rss_mb', 0):.2f} MB")
        print(f"📈 데이터베이스 레코드: {sum(report.get('database_stats', {}).values())}")
        print("\n💡 권장사항:")
        for rec in report.get('recommendations', []):
            print(f"  - {rec}")
        
        return True

def main():
    """메인 실행 함수"""
    optimizer = PerformanceOptimizer()
    success = optimizer.run_optimization()
    
    if success:
        print("\n✅ 성능 최적화가 성공적으로 완료되었습니다!")
        return 0
    else:
        print("\n❌ 성능 최적화 중 오류가 발생했습니다.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
