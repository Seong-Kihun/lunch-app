#!/usr/bin/env python3
"""
Render PostgreSQL 데이터베이스 마이그레이션 스크립트
렌더 배포 시 자동으로 실행되어 데이터베이스 스키마를 수정합니다.
"""

import os
import sys
import logging

# 조건부 import - Render 환경에서만 psycopg2 사용
try:
    import psycopg2  # type: ignore
    from psycopg2 import sql  # type: ignore
    from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT  # type: ignore
    PSYCOPG2_AVAILABLE = True
except ImportError:
    psycopg2 = None
    sql = None
    ISOLATION_LEVEL_AUTOCOMMIT = None
    PSYCOPG2_AVAILABLE = False

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_database_connection():
    """데이터베이스 연결 생성"""
    if not PSYCOPG2_AVAILABLE:
        logger.error("psycopg2가 설치되지 않았습니다. PostgreSQL 연결을 사용할 수 없습니다.")
        return None
        
    try:
        # Render 환경변수에서 데이터베이스 URL 가져오기
        database_url = os.environ.get('DATABASE_URL')
        if not database_url:
            logger.error("DATABASE_URL 환경변수가 설정되지 않았습니다.")
            return None
        
        # PostgreSQL 연결
        conn = psycopg2.connect(database_url)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        return conn
    except Exception as e:
        logger.error(f"데이터베이스 연결 실패: {e}")
        return None

def check_column_exists(cursor, table_name, column_name):
    """컬럼이 존재하는지 확인"""
    try:
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = %s AND column_name = %s
        """, (table_name, column_name))
        return cursor.fetchone() is not None
    except Exception as e:
        logger.error(f"컬럼 존재 확인 실패: {e}")
        return False

def add_column_if_not_exists(cursor, table_name, column_name, column_definition):
    """컬럼이 없으면 추가"""
    try:
        if not check_column_exists(cursor, table_name, column_name):
            # 컬럼 정의에서 DEFAULT 값 추출
            if 'DEFAULT' in column_definition:
                alter_query = f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_definition}"
            else:
                alter_query = f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_definition}"
            
            cursor.execute(alter_query)
            logger.info(f"✅ {table_name}.{column_name} 컬럼이 추가되었습니다.")
            return True
        else:
            logger.info(f"✅ {table_name}.{column_name} 컬럼이 이미 존재합니다.")
            return True
    except Exception as e:
        logger.error(f"❌ {table_name}.{column_name} 컬럼 추가 실패: {e}")
        return False

def migrate_restaurant_table():
    """restaurant 테이블 마이그레이션"""
    conn = get_database_connection()
    if not conn:
        logger.error("데이터베이스 연결을 생성할 수 없습니다.")
        return False
    
    try:
        cursor = conn.cursor()
        
        # restaurant 테이블이 존재하는지 확인
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'restaurant'
            )
        """)
        
        table_exists = cursor.fetchone()[0]
        logger.info(f"restaurant 테이블 존재 여부: {table_exists}")
        
        if not table_exists:
            logger.warning("restaurant 테이블이 존재하지 않습니다. 테이블을 생성합니다.")
            # restaurant 테이블 생성 (모든 컬럼 포함)
            cursor.execute("""
                CREATE TABLE restaurant (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    address TEXT,
                    category VARCHAR(100),
                    rating FLOAT DEFAULT 0.0,
                    total_reviews INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            logger.info("✅ restaurant 테이블이 생성되었습니다.")
        else:
            # 기존 테이블의 현재 컬럼들 확인
            cursor.execute("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = 'restaurant'
                ORDER BY ordinal_position
            """)
            existing_columns = {row[0]: row for row in cursor.fetchall()}
            logger.info(f"기존 restaurant 테이블 컬럼들: {list(existing_columns.keys())}")
        
        # 필요한 컬럼들 정의 (완전한 스키마)
        required_columns = {
            'id': 'SERIAL PRIMARY KEY',
            'name': 'VARCHAR(255) NOT NULL',
            'address': 'TEXT',
            'category': 'VARCHAR(100)',
            'rating': 'FLOAT DEFAULT 0.0',
            'total_reviews': 'INTEGER DEFAULT 0',
            'created_at': 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
        }
        
        success_count = 0
        for column_name, column_definition in required_columns.items():
            if column_name == 'id':
                # PRIMARY KEY는 건너뛰기
                success_count += 1
                continue
                
            if add_column_if_not_exists(cursor, 'restaurant', column_name, column_definition):
                success_count += 1
        
        logger.info(f"🎉 restaurant 테이블 마이그레이션 완료: {success_count}/{len(required_columns)-1} 컬럼 처리됨")
        return success_count == len(required_columns) - 1  # id 제외
        
    except Exception as e:
        logger.error(f"restaurant 테이블 마이그레이션 실패: {e}")
        return False
    finally:
        if conn:
            conn.close()

def migrate_all_tables():
    """모든 테이블 마이그레이션 실행"""
    if not PSYCOPG2_AVAILABLE:
        logger.warning("psycopg2가 설치되지 않았습니다. 마이그레이션을 건너뜁니다.")
        return False
        
    logger.info("🚀 Render PostgreSQL 데이터베이스 마이그레이션 시작...")
    
    # restaurant 테이블 마이그레이션
    if migrate_restaurant_table():
        logger.info("✅ 모든 마이그레이션이 성공적으로 완료되었습니다!")
        return True
    else:
        logger.error("❌ 마이그레이션 중 오류가 발생했습니다.")
        return False

if __name__ == '__main__':
    # Render 환경에서만 실행
    if os.environ.get('RENDER'):
        migrate_all_tables()
    else:
        logger.info("로컬 환경에서는 마이그레이션을 건너뜁니다.")
