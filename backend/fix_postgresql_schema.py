#!/usr/bin/env python3
"""
PostgreSQL 데이터베이스 스키마 수정 스크립트
비밀번호 인증 필드들을 추가합니다.
"""

import os
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def fix_postgresql_schema():
    """PostgreSQL 데이터베이스에 비밀번호 인증 필드들을 추가합니다."""
    
    # Render PostgreSQL 연결 정보
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("❌ DATABASE_URL 환경변수가 설정되지 않았습니다.")
        return False
    
    # PostgreSQL URL 확인
    if not database_url.startswith('postgresql://'):
        print(f"❌ PostgreSQL URL이 아닙니다: {database_url}")
        return False
    
    print(f"🔧 PostgreSQL 스키마 수정 시작: {database_url[:20]}...")
    
    try:
        # PostgreSQL 연결
        conn = psycopg2.connect(database_url)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        print("✅ PostgreSQL 데이터베이스에 연결되었습니다.")
        
        # users 테이블의 현재 컬럼 확인
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position
        """)
        existing_columns = [row[0] for row in cursor.fetchall()]
        print(f"기존 users 테이블 컬럼: {existing_columns}")
        
        # 비밀번호 인증 필드들 추가
        password_fields = [
            ("password_hash", "VARCHAR(255)"),
            ("last_password_change", "TIMESTAMP"),
            ("failed_login_attempts", "INTEGER DEFAULT 0"),
            ("account_locked_until", "TIMESTAMP")
        ]
        
        for field_name, field_type in password_fields:
            if field_name not in existing_columns:
                try:
                    alter_sql = f"ALTER TABLE users ADD COLUMN {field_name} {field_type}"
                    cursor.execute(alter_sql)
                    print(f"✅ {field_name} 컬럼을 추가했습니다.")
                except Exception as e:
                    print(f"⚠️ {field_name} 컬럼 추가 중 오류: {e}")
            else:
                print(f"ℹ️ {field_name} 컬럼이 이미 존재합니다.")
        
        # 업데이트된 컬럼 목록 확인
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position
        """)
        updated_columns = [row[0] for row in cursor.fetchall()]
        print(f"업데이트된 users 테이블 컬럼: {updated_columns}")
        
        # inquiries 테이블이 존재하는지 확인하고 없으면 생성
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'inquiries'
            )
        """)
        inquiries_exists = cursor.fetchone()[0]
        
        if not inquiries_exists:
            print("inquiries 테이블을 생성합니다...")
            cursor.execute("""
                CREATE TABLE inquiries (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id),
                    name VARCHAR(100) NOT NULL,
                    email VARCHAR(120) NOT NULL,
                    subject VARCHAR(200) NOT NULL,
                    message TEXT NOT NULL,
                    status VARCHAR(20) DEFAULT 'pending',
                    priority VARCHAR(20) DEFAULT 'normal',
                    category VARCHAR(50) DEFAULT 'general',
                    answer TEXT,
                    answered_by VARCHAR(100),
                    answered_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            print("✅ inquiries 테이블을 생성했습니다.")
        else:
            print("ℹ️ inquiries 테이블이 이미 존재합니다.")
        
        print("🎉 PostgreSQL 스키마 수정이 완료되었습니다!")
        
        # 스키마 수정 후 초기 데이터 생성
        print("🔧 초기 데이터 생성을 시작합니다...")
        try:
            from backend.database.init_db import create_initial_data
            create_initial_data()
            print("✅ 초기 데이터 생성이 완료되었습니다.")
        except Exception as e:
            print(f"⚠️ 초기 데이터 생성 중 오류 발생: {e}")
            print("앱은 계속 실행됩니다.")
        
        return True
        
    except Exception as e:
        print(f"❌ PostgreSQL 스키마 수정 실패: {e}")
        return False
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    print("PostgreSQL 스키마 수정 시작...")
    success = fix_postgresql_schema()
    if success:
        print("🎉 PostgreSQL 스키마 수정이 성공적으로 완료되었습니다!")
    else:
        print("💥 PostgreSQL 스키마 수정에 실패했습니다.")
