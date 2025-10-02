#!/usr/bin/env python3
"""
데이터베이스 쿼리 최적화
성능 향상을 위한 쿼리 최적화 유틸리티
"""

from functools import wraps
import time
from sqlalchemy import text
from sqlalchemy.orm import joinedload
from backend.app.extensions import db

class QueryOptimizer:
    """쿼리 최적화 클래스"""

    @staticmethod
    def add_indexes():
        """필요한 인덱스 추가 - 애플리케이션 컨텍스트 내에서만 실행"""
        from flask import current_app

        # 애플리케이션 컨텍스트가 없으면 건너뜀
        try:
            with current_app.app_context():
                indexes = [
                    # 사용자 관련 인덱스
                    "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
                    "CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at)",

                    # 파티 관련 인덱스
                    "CREATE INDEX IF NOT EXISTS idx_party_creator_id ON party(creator_id)",
                    "CREATE INDEX IF NOT EXISTS idx_party_created_at ON party(created_at)",
                    "CREATE INDEX IF NOT EXISTS idx_party_status ON party(status)",

                    # 일정 관련 인덱스
                    "CREATE INDEX IF NOT EXISTS idx_schedules_user_id ON schedules(user_id)",
                    "CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules(date)",
                    "CREATE INDEX IF NOT EXISTS idx_personal_schedules_user_id ON personal_schedules(user_id)",

                    # 친구 관계 인덱스
                    "CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id)",
                    "CREATE INDEX IF NOT EXISTS idx_friendships_receiver ON friendships(receiver_id)",
                    "CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status)",

                    # 채팅 관련 인덱스
                    "CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id)",
                    "CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at)",
                ]

                for index_sql in indexes:
                    db.session.execute(text(index_sql))
                db.session.commit()
                print("[SUCCESS] 데이터베이스 인덱스 추가 완료")
                return True

        except Exception as e:
            print(f"[ERROR] 인덱스 추가 실패: {e}")
            try:
                db.session.rollback()
            except:
                pass
            return False

    @staticmethod
    def optimize_relationship_loading():
        """관계 로딩 최적화 설정"""
        return {
            'lazy': 'select',
            'cascade': 'save-update, merge',
            'back_populates': True
        }

    @staticmethod
    def get_eager_loading_options(model_class, relationships: list[str]):
        """Eager loading 옵션 생성"""
        options = []

        for rel in relationships:
            if hasattr(model_class, rel):
                options.append(joinedload(getattr(model_class, rel)))

        return options

def optimize_query(func):
    """쿼리 최적화 데코레이터"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()

        try:
            result = func(*args, **kwargs)

            # 쿼리 실행 시간 로깅
            execution_time = time.time() - start_time
            if execution_time > 1.0:  # 1초 이상 걸리는 쿼리
                print(f"[WARNING] 느린 쿼리 감지: {func.__name__} - {execution_time:.3f}s")

            return result

        except Exception as e:
            execution_time = time.time() - start_time
            print(f"[ERROR] 쿼리 실행 실패: {func.__name__} - {execution_time:.3f}s - {str(e)}")
            raise

    return wrapper

def paginate_query(query, page: int = 1, per_page: int = 20):
    """쿼리 페이지네이션"""
    try:
        total = query.count()
        items = query.offset((page - 1) * per_page).limit(per_page).all()

        return {
            'items': items,
            'total': total,
            'page': page,
            'per_page': per_page,
            'pages': (total + per_page - 1) // per_page,
            'has_next': page * per_page < total,
            'has_prev': page > 1
        }
    except Exception as e:
        print(f"[ERROR] 페이지네이션 실패: {e}")
        return {
            'items': [],
            'total': 0,
            'page': page,
            'per_page': per_page,
            'pages': 0,
            'has_next': False,
            'has_prev': False
        }

class DatabaseAnalyzer:
    """데이터베이스 분석기"""

    @staticmethod
    def analyze_performance():
        """성능 분석"""
        try:
            # 테이블 크기 분석
            table_sizes = db.session.execute(text("""
                SELECT 
                    schemaname,
                    tablename,
                    attname,
                    n_distinct,
                    correlation
                FROM pg_stats 
                WHERE schemaname = 'public'
                ORDER BY tablename, attname
            """)).fetchall()

            # 인덱스 사용률 분석
            index_usage = db.session.execute(text("""
                SELECT 
                    schemaname,
                    tablename,
                    indexname,
                    idx_tup_read,
                    idx_tup_fetch
                FROM pg_stat_user_indexes
                ORDER BY idx_tup_read DESC
            """)).fetchall()

            return {
                'table_stats': [dict(row._mapping) for row in table_sizes],
                'index_usage': [dict(row._mapping) for row in index_usage],
                'timestamp': time.time()
            }

        except Exception as e:
            print(f"[ERROR] 성능 분석 실패: {e}")
            return {'error': str(e)}

def create_database_indexes():
    """필요한 데이터베이스 인덱스 생성"""
    optimizer = QueryOptimizer()
    return optimizer.add_indexes()

def analyze_database_performance():
    """데이터베이스 성능 분석"""
    analyzer = DatabaseAnalyzer()
    return analyzer.analyze_performance()
