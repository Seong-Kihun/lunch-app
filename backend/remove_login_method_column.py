#!/usr/bin/env python3
"""
User 테이블에서 login_method 컬럼 제거 스크립트
매직링크 인증 방식을 완전히 제거합니다.
"""

import sqlite3
import os
from datetime import datetime

def remove_login_method_column():
    """User 테이블에서 login_method 컬럼 제거"""

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

        # login_method 컬럼이 존재하는지 확인
        if 'login_method' in columns:
            print("login_method 컬럼을 제거합니다...")
            
            # SQLite에서는 ALTER TABLE DROP COLUMN을 직접 지원하지 않으므로
            # 새 테이블을 생성하고 데이터를 복사하는 방식 사용
            cursor.execute("""
                CREATE TABLE users_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email VARCHAR(120) UNIQUE NOT NULL,
                    nickname VARCHAR(50) UNIQUE NOT NULL,
                    employee_id VARCHAR(20) UNIQUE NOT NULL,
                    created_at DATETIME,
                    updated_at DATETIME,
                    is_active BOOLEAN,
                    points INTEGER,
                    profile_image VARCHAR(255),
                    gender VARCHAR(10),
                    age_group VARCHAR(20),
                    main_dish_genre VARCHAR(100),
                    lunch_preference VARCHAR(200),
                    allergies VARCHAR(200),
                    preferred_time VARCHAR(50),
                    food_preferences VARCHAR(200),
                    frequent_areas VARCHAR(200),
                    notification_settings VARCHAR(200),
                    total_points INTEGER,
                    current_level INTEGER,
                    current_badge VARCHAR(50),
                    consecutive_login_days INTEGER,
                    last_login_date DATE,
                    matching_status VARCHAR(20),
                    match_request_time DATETIME,
                    password_hash VARCHAR(255),
                    last_password_change DATETIME,
                    failed_login_attempts INTEGER,
                    account_locked_until DATETIME
                )
            """)
            
            # 기존 데이터를 새 테이블로 복사 (login_method 제외)
            cursor.execute("""
                INSERT INTO users_new (
                    id, email, nickname, employee_id, created_at, updated_at, is_active,
                    points, profile_image, gender, age_group, main_dish_genre, lunch_preference,
                    allergies, preferred_time, food_preferences, frequent_areas, notification_settings,
                    total_points, current_level, current_badge, consecutive_login_days, last_login_date,
                    matching_status, match_request_time, password_hash, last_password_change,
                    failed_login_attempts, account_locked_until
                )
                SELECT 
                    id, email, nickname, employee_id, created_at, updated_at, is_active,
                    points, profile_image, gender, age_group, main_dish_genre, lunch_preference,
                    allergies, preferred_time, food_preferences, frequent_areas, notification_settings,
                    total_points, current_level, current_badge, consecutive_login_days, last_login_date,
                    matching_status, match_request_time, password_hash, last_password_change,
                    failed_login_attempts, account_locked_until
                FROM users
            """)
            
            # 기존 테이블 삭제
            cursor.execute("DROP TABLE users")
            
            # 새 테이블을 users로 이름 변경
            cursor.execute("ALTER TABLE users_new RENAME TO users")
            
            print("✅ login_method 컬럼 제거 완료")
        else:
            print("ℹ️ login_method 컬럼이 존재하지 않습니다")

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
    print("User 모델에서 login_method 컬럼 제거 시작...")
    success = remove_login_method_column()
    if success:
        print("🎉 login_method 컬럼 제거가 성공적으로 완료되었습니다!")
    else:
        print("💥 login_method 컬럼 제거에 실패했습니다.")
