#!/usr/bin/env python3
"""
User 모델에 비밀번호 필드 추가 스크립트
기존 데이터베이스에 새로운 컬럼을 추가합니다.
"""

import sqlite3
import os
from datetime import datetime

def update_user_schema():
    """User 테이블에 비밀번호 관련 필드 추가"""
    
    # 데이터베이스 경로
    db_path = os.path.join(os.path.dirname(__file__), 'instance', 'lunch_app.db')
    
    if not os.path.exists(db_path):
        print(f"데이터베이스 파일이 존재하지 않습니다: {db_path}")
        return False
    
    try:
        # 데이터베이스 연결
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("데이터베이스 연결 성공")
        
        # 기존 테이블 구조 확인
        cursor.execute("PRAGMA table_info(users)")
        columns = [column[1] for column in cursor.fetchall()]
        print(f"기존 컬럼: {columns}")
        
        # 새로운 컬럼들 추가
        new_columns = [
            ("password_hash", "VARCHAR(255)"),
            ("last_password_change", "DATETIME"),
            ("failed_login_attempts", "INTEGER DEFAULT 0"),
            ("account_locked_until", "DATETIME")
        ]
        
        for column_name, column_type in new_columns:
            if column_name not in columns:
                try:
                    cursor.execute(f"ALTER TABLE users ADD COLUMN {column_name} {column_type}")
                    print(f"✅ {column_name} 컬럼 추가 성공")
                except sqlite3.Error as e:
                    print(f"❌ {column_name} 컬럼 추가 실패: {e}")
            else:
                print(f"ℹ️ {column_name} 컬럼이 이미 존재합니다")
        
        # 기존 사용자들의 failed_login_attempts를 0으로 설정
        cursor.execute("UPDATE users SET failed_login_attempts = 0 WHERE failed_login_attempts IS NULL")
        
        # 변경사항 저장
        conn.commit()
        
        # 업데이트된 테이블 구조 확인
        cursor.execute("PRAGMA table_info(users)")
        updated_columns = [column[1] for column in cursor.fetchall()]
        print(f"업데이트된 컬럼: {updated_columns}")
        
        print("✅ User 테이블 스키마 업데이트 완료")
        return True
        
    except sqlite3.Error as e:
        print(f"❌ 데이터베이스 오류: {e}")
        return False
    except Exception as e:
        print(f"❌ 예상치 못한 오류: {e}")
        return False
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    print("User 모델 스키마 업데이트 시작...")
    success = update_user_schema()
    if success:
        print("🎉 스키마 업데이트가 성공적으로 완료되었습니다!")
    else:
        print("💥 스키마 업데이트에 실패했습니다.")
