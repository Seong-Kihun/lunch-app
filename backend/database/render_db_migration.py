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
        
        expected_columns = len(required_columns) - 1  # id 제외
        logger.info(f"🎉 restaurant 테이블 마이그레이션 완료: {success_count}/{expected_columns} 컬럼 처리됨")
        # 모든 컬럼이 처리되었으면 성공 (id 제외한 모든 컬럼)
        return success_count >= expected_columns
        
    except Exception as e:
        logger.error(f"restaurant 테이블 마이그레이션 실패: {e}")
        return False
    finally:
        if conn:
            conn.close()

def migrate_party_table():
    """party 테이블 마이그레이션"""
    conn = get_database_connection()
    if not conn:
        logger.error("데이터베이스 연결을 생성할 수 없습니다.")
        return False
    
    try:
        cursor = conn.cursor()
        
        # party 테이블이 존재하는지 확인
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'party'
            )
        """)
        
        table_exists = cursor.fetchone()[0]
        logger.info(f"party 테이블 존재 여부: {table_exists}")
        
        if not table_exists:
            logger.warning("party 테이블이 존재하지 않습니다. 테이블을 생성합니다.")
            # party 테이블 생성 (모든 컬럼 포함)
            cursor.execute("""
                CREATE TABLE party (
                    id SERIAL PRIMARY KEY,
                    host_employee_id INTEGER NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    restaurant_name VARCHAR(255),
                    restaurant_address TEXT,
                    party_date DATE,
                    party_time TIME,
                    meeting_location VARCHAR(255),
                    max_members INTEGER DEFAULT 4,
                    is_from_match BOOLEAN DEFAULT FALSE,
                    description TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            logger.info("✅ party 테이블이 생성되었습니다.")
        else:
            # 기존 테이블의 현재 컬럼들 확인
            cursor.execute("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = 'party'
                ORDER BY ordinal_position
            """)
            existing_columns = {row[0]: row for row in cursor.fetchall()}
            logger.info(f"기존 party 테이블 컬럼들: {list(existing_columns.keys())}")
        
        # 필요한 컬럼들 정의 (완전한 스키마)
        required_columns = {
            'id': 'SERIAL PRIMARY KEY',
            'host_employee_id': 'INTEGER NOT NULL',
            'title': 'VARCHAR(255) NOT NULL',
            'restaurant_name': 'VARCHAR(255)',
            'restaurant_address': 'TEXT',
            'party_date': 'DATE',
            'party_time': 'TIME',
            'meeting_location': 'VARCHAR(255)',
            'max_members': 'INTEGER DEFAULT 4',
            'is_from_match': 'BOOLEAN DEFAULT FALSE',
            'description': 'TEXT',
            'created_at': 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
        }
        
        success_count = 0
        for column_name, column_definition in required_columns.items():
            if column_name == 'id':
                # PRIMARY KEY는 건너뛰기
                success_count += 1
                continue
                
            if add_column_if_not_exists(cursor, 'party', column_name, column_definition):
                success_count += 1
        
        expected_columns = len(required_columns) - 1  # id 제외
        logger.info(f"🎉 party 테이블 마이그레이션 완료: {success_count}/{expected_columns} 컬럼 처리됨")
        # 모든 컬럼이 처리되었으면 성공 (id 제외한 모든 컬럼)
        return success_count >= expected_columns
        
    except Exception as e:
        logger.error(f"party 테이블 마이그레이션 실패: {e}")
        return False
    finally:
        if conn:
            conn.close()

def migrate_personal_schedules_table():
    """personal_schedules 테이블 마이그레이션"""
    conn = get_database_connection()
    if not conn:
        logger.error("데이터베이스 연결을 생성할 수 없습니다.")
        return False
    
    try:
        cursor = conn.cursor()
        
        # personal_schedules 테이블이 존재하는지 확인
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'personal_schedules'
            )
        """)
        
        table_exists = cursor.fetchone()[0]
        logger.info(f"personal_schedules 테이블 존재 여부: {table_exists}")
        
        if not table_exists:
            logger.warning("personal_schedules 테이블이 존재하지 않습니다. 테이블을 생성합니다.")
            # personal_schedules 테이블 생성 (모든 컬럼 포함)
            cursor.execute("""
                CREATE TABLE personal_schedules (
                    id SERIAL PRIMARY KEY,
                    employee_id INTEGER NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    start_date DATE,
                    schedule_date DATE,
                    time TIME,
                    restaurant VARCHAR(255),
                    location VARCHAR(255),
                    description TEXT,
                    is_recurring BOOLEAN DEFAULT FALSE,
                    recurrence_type VARCHAR(50),
                    recurrence_interval INTEGER,
                    recurrence_end_date DATE,
                    master_schedule_id INTEGER,
                    created_by INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            logger.info("✅ personal_schedules 테이블이 생성되었습니다.")
        else:
            # 기존 테이블의 현재 컬럼들 확인
            cursor.execute("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = 'personal_schedules'
                ORDER BY ordinal_position
            """)
            existing_columns = {row[0]: row for row in cursor.fetchall()}
            logger.info(f"기존 personal_schedules 테이블 컬럼들: {list(existing_columns.keys())}")
        
        # 필요한 컬럼들 정의 (완전한 스키마)
        required_columns = {
            'id': 'SERIAL PRIMARY KEY',
            'employee_id': 'INTEGER NOT NULL',
            'title': 'VARCHAR(255) NOT NULL',
            'start_date': 'DATE',
            'schedule_date': 'DATE',
            'time': 'TIME',
            'restaurant': 'VARCHAR(255)',
            'location': 'VARCHAR(255)',
            'description': 'TEXT',
            'is_recurring': 'BOOLEAN DEFAULT FALSE',
            'recurrence_type': 'VARCHAR(50)',
            'recurrence_interval': 'INTEGER',
            'recurrence_end_date': 'DATE',
            'master_schedule_id': 'INTEGER',
            'created_by': 'INTEGER',
            'created_at': 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
            'updated_at': 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
        }
        
        success_count = 0
        for column_name, column_definition in required_columns.items():
            if column_name == 'id':
                # PRIMARY KEY는 건너뛰기
                success_count += 1
                continue
                
            if add_column_if_not_exists(cursor, 'personal_schedules', column_name, column_definition):
                success_count += 1
        
        expected_columns = len(required_columns) - 1  # id 제외
        logger.info(f"🎉 personal_schedules 테이블 마이그레이션 완료: {success_count}/{expected_columns} 컬럼 처리됨")
        # 모든 컬럼이 처리되었으면 성공 (id 제외한 모든 컬럼)
        return success_count >= expected_columns
        
    except Exception as e:
        logger.error(f"personal_schedules 테이블 마이그레이션 실패: {e}")
        return False
    finally:
        if conn:
            conn.close()

def migrate_users_table():
    """users 테이블에 비밀번호 관련 컬럼 추가"""
    if not PSYCOPG2_AVAILABLE:
        logger.warning("psycopg2가 설치되지 않았습니다. users 테이블 마이그레이션을 건너뜁니다.")
        return False
        
    try:
        conn = get_database_connection()
        if not conn:
            logger.error("데이터베이스 연결 실패")
            return False
        
        cursor = conn.cursor()
        
        logger.info("users 테이블 존재 여부: True")
        
        # 기존 컬럼 확인
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users'
        """)
        
        existing_columns = [row[0] for row in cursor.fetchall()]
        logger.info(f"기존 users 테이블 컬럼들: {existing_columns}")
        
        # 추가할 컬럼들
        new_columns = [
            ('password_hash', 'VARCHAR(255)', True),
            ('last_password_change', 'TIMESTAMP', True),
            ('failed_login_attempts', 'INTEGER DEFAULT 0', False),
            ('account_locked_until', 'TIMESTAMP', True)
        ]
        
        for column_name, column_type, nullable in new_columns:
            if column_name in existing_columns:
                logger.info(f"✅ users.{column_name} 컬럼이 이미 존재합니다.")
                continue
            
            try:
                add_column_query = f"ALTER TABLE users ADD COLUMN {column_name} {column_type}"
                if not nullable:
                    add_column_query += " NOT NULL"
                
                cursor.execute(add_column_query)
                logger.info(f"✅ users.{column_name} 컬럼이 추가되었습니다.")
                
            except Exception as e:
                logger.warning(f"⚠️ users.{column_name} 컬럼 추가 실패: {e}")
        
        # 기존 사용자들의 failed_login_attempts를 0으로 설정
        try:
            cursor.execute("UPDATE users SET failed_login_attempts = 0 WHERE failed_login_attempts IS NULL")
            logger.info("✅ 기존 사용자들의 failed_login_attempts 기본값 설정 완료")
        except Exception as e:
            logger.warning(f"⚠️ failed_login_attempts 기본값 설정 실패: {e}")
        
        cursor.close()
        conn.close()
        
        logger.info("🎉 users 테이블 마이그레이션 완료")
        return True
        
    except Exception as e:
        logger.error(f"❌ users 테이블 마이그레이션 실패: {e}")
        return False

def migrate_all_tables():
    """모든 테이블 마이그레이션 실행"""
    if not PSYCOPG2_AVAILABLE:
        logger.warning("psycopg2가 설치되지 않았습니다. 마이그레이션을 건너뜁니다.")
        return False
        
    logger.info("🚀 Render PostgreSQL 데이터베이스 마이그레이션 시작...")
    
    # 각 테이블 마이그레이션 실행
    migration_results = []
    
    # users 테이블 마이그레이션 (비밀번호 컬럼 추가)
    users_result = migrate_users_table()
    migration_results.append(("users", users_result))
    
    # restaurant 테이블 마이그레이션
    restaurant_result = migrate_restaurant_table()
    migration_results.append(("restaurant", restaurant_result))
    
    # party 테이블 마이그레이션
    party_result = migrate_party_table()
    migration_results.append(("party", party_result))
    
    # personal_schedules 테이블 마이그레이션
    personal_schedules_result = migrate_personal_schedules_table()
    migration_results.append(("personal_schedules", personal_schedules_result))
    
    # 결과 확인
    successful_migrations = sum(1 for _, result in migration_results if result)
    total_migrations = len(migration_results)
    
    if successful_migrations == total_migrations:
        logger.info("✅ 모든 마이그레이션이 성공적으로 완료되었습니다!")
        return True
    else:
        failed_tables = [name for name, result in migration_results if not result]
        logger.error(f"❌ 마이그레이션 실패 테이블: {failed_tables}")
        return False

if __name__ == '__main__':
    # Render 환경에서만 실행
    if os.environ.get('RENDER'):
        migrate_all_tables()
    else:
        logger.info("로컬 환경에서는 마이그레이션을 건너뜁니다.")
