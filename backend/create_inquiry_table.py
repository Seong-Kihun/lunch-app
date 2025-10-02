#!/usr/bin/env python3
"""
문의사항 테이블 생성 스크립트
"""

import sqlite3
import os

def create_inquiry_table():
    """문의사항 테이블 생성"""

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
        cursor.execute("PRAGMA table_info(inquiries)")
        columns = [column[1] for column in cursor.fetchall()]
        print(f"기존 inquiries 컬럼: {columns}")

        if 'inquiries' not in [table[0] for table in cursor.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]:
            print("inquiries 테이블을 생성합니다...")

            # 문의사항 테이블 생성
            cursor.execute("""
                CREATE TABLE inquiries (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name VARCHAR(50) NOT NULL,
                    email VARCHAR(120) NOT NULL,
                    subject VARCHAR(200) NOT NULL,
                    message TEXT NOT NULL,
                    status VARCHAR(20) DEFAULT 'pending',
                    priority VARCHAR(20) DEFAULT 'normal',
                    category VARCHAR(50),
                    answer TEXT,
                    answered_by VARCHAR(50),
                    answered_at DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    user_id INTEGER,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            """)

            print("✅ inquiries 테이블 생성 완료")
        else:
            print("ℹ️ inquiries 테이블이 이미 존재합니다")

        # 변경사항 저장
        conn.commit()

        # 업데이트된 테이블 구조 확인
        cursor.execute("PRAGMA table_info(inquiries)")
        updated_columns = [column[1] for column in cursor.fetchall()]
        print(f"업데이트된 inquiries 컬럼: {updated_columns}")

        print("✅ 문의사항 테이블 설정 완료")
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
    print("문의사항 테이블 생성 시작...")
    success = create_inquiry_table()
    if success:
        print("🎉 문의사항 테이블 생성이 성공적으로 완료되었습니다!")
    else:
        print("💥 문의사항 테이블 생성에 실패했습니다.")
