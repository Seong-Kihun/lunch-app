#!/usr/bin/env python3
"""
데이터베이스 최적화 스크립트
인덱스 생성, 쿼리 최적화, 성능 분석을 수행합니다.
"""

import sys
import os
import time
from datetime import datetime

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.app.extensions import db
# 레거시 import 제거 - CLI에서 create_app() 사용
from backend.auth.models import User, Friendship
from backend.models.app_models import Party, PartyMember, Restaurant, Review, UserActivity

class DatabaseOptimizer:
    def __init__(self):
        self.optimization_results = []
        self.start_time = datetime.now()

    def log(self, message, level="INFO"):
        """최적화 로그 기록"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] {level}: {message}"
        self.optimization_results.append(log_entry)
        print(log_entry)

    def analyze_table_sizes(self):
        """테이블 크기 분석"""
        self.log("📊 테이블 크기 분석 중...")

        with app.app_context():
            tables = [
                ('users', User),
                ('parties', Party),
                ('party_members', PartyMember),
                ('restaurants', Restaurant),
                ('reviews', Review),
                ('friendships', Friendship),
                ('user_activities', UserActivity)
            ]

            for table_name, model in tables:
                try:
                    count = model.query.count()
                    self.log(f"   📋 {table_name}: {count:,}개 레코드")
                except Exception as e:
                    self.log(f"   ❌ {table_name}: 분석 실패 - {e}", "ERROR")

    def create_indexes(self):
        """성능 향상을 위한 인덱스 생성"""
        self.log("🔧 인덱스 생성 중...")

        with app.app_context():
            indexes_to_create = [
                # User 테이블 인덱스
                "CREATE INDEX IF NOT EXISTS idx_users_employee_id ON users(employee_id)",
                "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",

                # Party 테이블 인덱스
                "CREATE INDEX IF NOT EXISTS idx_parties_host_employee_id ON parties(host_employee_id)",
                "CREATE INDEX IF NOT EXISTS idx_parties_party_date ON parties(party_date)",
                "CREATE INDEX IF NOT EXISTS idx_parties_restaurant_name ON parties(restaurant_name)",

                # PartyMember 테이블 인덱스
                "CREATE INDEX IF NOT EXISTS idx_party_members_employee_id ON party_members(employee_id)",
                "CREATE INDEX IF NOT EXISTS idx_party_members_party_id ON party_members(party_id)",

                # Restaurant 테이블 인덱스
                "CREATE INDEX IF NOT EXISTS idx_restaurants_name ON restaurants(name)",
                "CREATE INDEX IF NOT EXISTS idx_restaurants_category ON restaurants(category)",

                # Review 테이블 인덱스
                "CREATE INDEX IF NOT EXISTS idx_reviews_restaurant_id ON reviews(restaurant_id)",
                "CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id)",
                "CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating)",

                # Friendship 테이블 인덱스
                "CREATE INDEX IF NOT EXISTS idx_friendships_requester_id ON friendships(requester_id)",
                "CREATE INDEX IF NOT EXISTS idx_friendships_receiver_id ON friendships(receiver_id)",
                "CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status)",

                # UserActivity 테이블 인덱스
                "CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id)",
                "CREATE INDEX IF NOT EXISTS idx_user_activities_activity_type ON user_activities(activity_type)",
                "CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON user_activities(created_at)"
            ]

            created_count = 0
            failed_count = 0

            for index_sql in indexes_to_create:
                try:
                    db.session.execute(db.text(index_sql))
                    created_count += 1
                    index_name = index_sql.split("idx_")[1].split(" ")[0]
                    self.log(f"   ✅ 인덱스 생성: {index_name}")
                except Exception as e:
                    failed_count += 1
                    self.log(f"   ❌ 인덱스 생성 실패: {e}", "ERROR")

            db.session.commit()
            self.log(f"📊 인덱스 생성 결과: {created_count}개 성공, {failed_count}개 실패")

    def analyze_query_performance(self):
        """쿼리 성능 분석"""
        self.log("⚡ 쿼리 성능 분석 중...")

        with app.app_context():
            # 성능 테스트 쿼리들
            test_queries = [
                ("사용자 조회 (employee_id)", lambda: User.query.filter_by(employee_id=1).first()),
                ("파티 목록 조회", lambda: Party.query.filter_by(host_employee_id=1).all()),
                ("파티 멤버 조회", lambda: PartyMember.query.filter_by(employee_id=1).all()),
                ("식당 검색", lambda: Restaurant.query.filter(Restaurant.name.like('%식당%')).all()),
                ("리뷰 조회", lambda: Review.query.filter_by(restaurant_id=1).all()),
                ("친구 목록 조회", lambda: Friendship.query.filter_by(requester_id=1).all()),
                ("사용자 활동 조회", lambda: UserActivity.query.filter_by(user_id=1).all())
            ]

            query_results = []

            for query_name, query_func in test_queries:
                try:
                    start_time = time.time()
                    result = query_func()
                    execution_time = (time.time() - start_time) * 1000  # ms

                    result_count = len(result) if isinstance(result, list) else (1 if result else 0)
                    query_results.append((query_name, execution_time, result_count, "성공"))

                    self.log(f"   ⚡ {query_name}: {execution_time:.2f}ms ({result_count}개 결과)")

                except Exception as e:
                    query_results.append((query_name, 0, 0, f"실패: {str(e)[:50]}"))
                    self.log(f"   ❌ {query_name}: 실패 - {e}", "ERROR")

            # 성능 통계
            successful_queries = [q for q in query_results if q[3] == "성공"]
            if successful_queries:
                avg_time = sum(q[1] for q in successful_queries) / len(successful_queries)
                max_time = max(q[1] for q in successful_queries)
                min_time = min(q[1] for q in successful_queries)

                self.log("📊 쿼리 성능 통계:")
                self.log(f"   평균 실행시간: {avg_time:.2f}ms")
                self.log(f"   최대 실행시간: {max_time:.2f}ms")
                self.log(f"   최소 실행시간: {min_time:.2f}ms")

                # 느린 쿼리 식별
                slow_queries = [q for q in successful_queries if q[1] > 100]  # 100ms 이상
                if slow_queries:
                    self.log(f"⚠️ 느린 쿼리 ({len(slow_queries)}개):")
                    for query_name, exec_time, _, _ in slow_queries:
                        self.log(f"   • {query_name}: {exec_time:.2f}ms")

    def optimize_database_settings(self):
        """데이터베이스 설정 최적화"""
        self.log("⚙️ 데이터베이스 설정 최적화 중...")

        with app.app_context():
            # SQLite 최적화 설정
            optimization_queries = [
                "PRAGMA journal_mode=WAL",  # Write-Ahead Logging
                "PRAGMA synchronous=NORMAL",  # 성능과 안전성의 균형
                "PRAGMA cache_size=10000",  # 캐시 크기 증가
                "PRAGMA temp_store=MEMORY",  # 임시 테이블을 메모리에 저장
                "PRAGMA mmap_size=268435456",  # 256MB 메모리 맵핑
                "PRAGMA optimize"  # 쿼리 최적화
            ]

            for query in optimization_queries:
                try:
                    db.session.execute(db.text(query))
                    self.log(f"   ✅ 설정 적용: {query}")
                except Exception as e:
                    self.log(f"   ❌ 설정 실패: {query} - {e}", "ERROR")

            db.session.commit()

    def vacuum_database(self):
        """데이터베이스 정리 및 압축"""
        self.log("🧹 데이터베이스 정리 중...")

        with app.app_context():
            try:
                # VACUUM 실행 (SQLite)
                db.session.execute(db.text("VACUUM"))
                db.session.commit()
                self.log("   ✅ VACUUM 완료 - 데이터베이스 압축 및 정리")

                # 통계 업데이트
                db.session.execute(db.text("ANALYZE"))
                db.session.commit()
                self.log("   ✅ ANALYZE 완료 - 쿼리 최적화 통계 업데이트")

            except Exception as e:
                self.log(f"   ❌ 데이터베이스 정리 실패: {e}", "ERROR")

    def generate_optimization_report(self):
        """최적화 리포트 생성"""
        self.log("📋 최적화 리포트 생성 중...")

        end_time = datetime.now()
        duration = end_time - self.start_time

        report = {
            "optimization_info": {
                "start_time": self.start_time.isoformat(),
                "end_time": end_time.isoformat(),
                "duration_seconds": duration.total_seconds(),
                "status": "completed"
            },
            "results": self.optimization_results,
            "recommendations": [
                "정기적인 VACUUM 실행 (주 1회)",
                "쿼리 성능 모니터링",
                "인덱스 사용률 분석",
                "데이터베이스 크기 모니터링"
            ]
        }

        # 리포트 파일 저장
        report_file = f"database_optimization_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w', encoding='utf-8') as f:
            import json
            json.dump(report, f, indent=2, ensure_ascii=False)

        self.log(f"✅ 최적화 리포트 저장: {report_file}")
        return report_file

    def run_optimization(self):
        """전체 최적화 프로세스 실행"""
        self.log("🚀 데이터베이스 최적화 시작")
        self.log("=" * 50)

        try:
            # 1. 테이블 크기 분석
            self.analyze_table_sizes()

            # 2. 인덱스 생성
            self.create_indexes()

            # 3. 데이터베이스 설정 최적화
            self.optimize_database_settings()

            # 4. 쿼리 성능 분석
            self.analyze_query_performance()

            # 5. 데이터베이스 정리
            self.vacuum_database()

            # 6. 리포트 생성
            report_file = self.generate_optimization_report()

            self.log("🎉 데이터베이스 최적화 완료!")
            self.log("=" * 50)
            self.log("📋 최적화 결과:")
            self.log("   ✅ 인덱스 생성 완료")
            self.log("   ✅ 쿼리 성능 분석 완료")
            self.log("   ✅ 데이터베이스 설정 최적화 완료")
            self.log("   ✅ 데이터베이스 정리 완료")
            self.log(f"   📄 상세 리포트: {report_file}")

            return True

        except Exception as e:
            self.log(f"❌ 최적화 중 오류 발생: {e}", "ERROR")
            return False

def main():
    """메인 함수"""
    print("🚀 데이터베이스 최적화 도구")
    print("=" * 50)

    optimizer = DatabaseOptimizer()

    try:
        success = optimizer.run_optimization()

        if success:
            print("\n🎉 데이터베이스 최적화가 성공적으로 완료되었습니다!")
            return 0
        else:
            print("\n❌ 최적화 중 문제가 발생했습니다.")
            return 1

    except Exception as e:
        print(f"\n❌ 예상치 못한 오류: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
