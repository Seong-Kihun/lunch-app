#!/usr/bin/env python3
"""
렌더 PostgreSQL 데이터베이스에 password_hash 컬럼 추가 마이그레이션
근본적 해결책: 로컬과 프로덕션 환경 간 스키마 일치
"""

import os
import sys
from datetime import datetime
import logging

# 조건부 import - 렌더 환경에서만 psycopg2 사용
try:
    import psycopg2  # type: ignore
    PSYCOPG2_AVAILABLE = True
except ImportError:
    psycopg2 = None
    PSYCOPG2_AVAILABLE = False

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_render_database_connection():
    """렌더 PostgreSQL 데이터베이스 연결"""
    if not PSYCOPG2_AVAILABLE:
        logger.error("psycopg2가 설치되지 않았습니다. PostgreSQL 연결을 사용할 수 없습니다.")
        return None
        
    try:
        # 환경변수에서 렌더 데이터베이스 URL 가져오기
        database_url = os.getenv('DATABASE_URL')
        
        if not database_url:
            logger.error("DATABASE_URL 환경변수가 설정되지 않았습니다.")
            return None
            
        logger.info(f"데이터베이스 연결 시도: {database_url[:50]}...")
        
        # psycopg2 연결 생성
        conn = psycopg2.connect(database_url)
        conn.autocommit = True  # 자동 커밋 활성화
        
        logger.info("✅ 렌더 PostgreSQL 데이터베이스 연결 성공")
        return conn
        
    except Exception as e:
        logger.error(f"❌ 렌더 데이터베이스 연결 실패: {e}")
        return None

def check_column_exists(cursor, table_name, column_name):
    """컬럼 존재 여부 확인"""
    try:
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = %s AND column_name = %s
        """, (table_name, column_name))
        
        result = cursor.fetchone()
        return result is not None
        
    except Exception as e:
        logger.error(f"컬럼 존재 여부 확인 실패: {e}")
        return False

def add_password_columns_to_users_table():
    """users 테이블에 비밀번호 관련 컬럼 추가"""
    try:
        logger.info("🚀 렌더 PostgreSQL users 테이블 마이그레이션 시작...")
        
        conn = get_render_database_connection()
        if not conn:
            return False
            
        cursor = conn.cursor()
        
        # 기존 테이블 구조 확인
        cursor.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'users'
            ORDER BY ordinal_position
        """)
        
        existing_columns = cursor.fetchall()
        existing_column_names = [col[0] for col in existing_columns]
        
        logger.info(f"기존 users 테이블 컬럼들: {existing_column_names}")
        
        # 추가할 컬럼들 정의
        new_columns = [
            {
                'name': 'password_hash',
                'type': 'VARCHAR(255)',
                'nullable': True,
                'default': None
            },
            {
                'name': 'last_password_change',
                'type': 'TIMESTAMP',
                'nullable': True,
                'default': None
            },
            {
                'name': 'failed_login_attempts',
                'type': 'INTEGER',
                'nullable': True,
                'default': '0'
            },
            {
                'name': 'account_locked_until',
                'type': 'TIMESTAMP',
                'nullable': True,
                'default': None
            }
        ]
        
        # 각 컬럼 추가
        for column in new_columns:
            column_name = column['name']
            column_type = column['type']
            nullable = column['nullable']
            default = column['default']
            
            if column_name in existing_column_names:
                logger.info(f"✅ users.{column_name} 컬럼이 이미 존재합니다.")
                continue
                
            try:
                # 컬럼 추가 쿼리 생성
                add_column_query = f"ALTER TABLE users ADD COLUMN {column_name} {column_type}"
                
                if not nullable:
                    add_column_query += " NOT NULL"
                    
                if default:
                    add_column_query += f" DEFAULT {default}"
                
                logger.info(f"컬럼 추가 쿼리: {add_column_query}")
                cursor.execute(add_column_query)
                
                logger.info(f"✅ users.{column_name} 컬럼 추가 성공")
                
            except Exception as e:
                logger.error(f"❌ users.{column_name} 컬럼 추가 실패: {e}")
                continue
        
        # 기존 사용자들의 failed_login_attempts를 0으로 설정
        try:
            cursor.execute("""
                UPDATE users 
                SET failed_login_attempts = 0 
                WHERE failed_login_attempts IS NULL
            """)
            logger.info("✅ 기존 사용자들의 failed_login_attempts 기본값 설정 완료")
        except Exception as e:
            logger.warning(f"⚠️ failed_login_attempts 기본값 설정 실패: {e}")
        
        # 최종 테이블 구조 확인
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'users'
            ORDER BY ordinal_position
        """)
        
        final_columns = cursor.fetchall()
        logger.info(f"최종 users 테이블 구조:")
        for col in final_columns:
            logger.info(f"  - {col[0]}: {col[1]} ({'NULL' if col[2] == 'YES' else 'NOT NULL'})")
        
        cursor.close()
        conn.close()
        
        logger.info("🎉 렌더 PostgreSQL users 테이블 마이그레이션 완료")
        return True
        
    except Exception as e:
        logger.error(f"❌ 렌더 PostgreSQL 마이그레이션 실패: {e}")
        return False

def validate_migration():
    """마이그레이션 검증"""
    try:
        logger.info("🔍 마이그레이션 결과 검증 중...")
        
        conn = get_render_database_connection()
        if not conn:
            return False
            
        cursor = conn.cursor()
        
        # password_hash 컬럼 존재 확인
        if check_column_exists(cursor, 'users', 'password_hash'):
            logger.info("✅ password_hash 컬럼 존재 확인")
        else:
            logger.error("❌ password_hash 컬럼이 존재하지 않습니다")
            return False
        
        # 테스트 쿼리 실행
        cursor.execute("SELECT COUNT(*) FROM users")
        user_count = cursor.fetchone()[0]
        logger.info(f"✅ 사용자 테이블 접근 가능: {user_count}명의 사용자")
        
        cursor.close()
        conn.close()
        
        logger.info("✅ 마이그레이션 검증 완료")
        return True
        
    except Exception as e:
        logger.error(f"❌ 마이그레이션 검증 실패: {e}")
        return False

def main():
    """메인 실행 함수"""
    try:
        logger.info("=" * 60)
        logger.info("렌더 PostgreSQL 비밀번호 컬럼 마이그레이션 시작")
        logger.info("=" * 60)
        
        # psycopg2 사용 가능 여부 확인
        if not PSYCOPG2_AVAILABLE:
            logger.warning("psycopg2가 설치되지 않았습니다. 로컬 환경에서는 마이그레이션을 건너뜁니다.")
            logger.info("렌더 환경에서는 정상적으로 작동할 것입니다.")
            return True
        
        # 1. 마이그레이션 실행
        migration_success = add_password_columns_to_users_table()
        
        if not migration_success:
            logger.error("❌ 마이그레이션 실패")
            return False
        
        # 2. 검증
        validation_success = validate_migration()
        
        if validation_success:
            logger.info("🎉 렌더 PostgreSQL 마이그레이션 성공!")
            logger.info("이제 로그인 기능이 정상적으로 작동할 것입니다.")
        else:
            logger.error("❌ 마이그레이션 검증 실패")
            
        return validation_success
        
    except Exception as e:
        logger.error(f"❌ 마이그레이션 실행 중 오류: {e}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
