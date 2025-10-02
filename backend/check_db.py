#!/usr/bin/env python3
"""
데이터베이스 테이블 확인 스크립트
"""

import sqlite3
import os

def check_database_tables():
    """데이터베이스 테이블 확인"""
    
    db_path = 'instance/lunch_app.db'
    
    if not os.path.exists(db_path):
        print(f"데이터베이스 파일이 존재하지 않습니다: {db_path}")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 테이블 목록 조회
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        
        print(f"데이터베이스 테이블 목록:")
        for table in tables:
            print(f"  - {table[0]}")
        
        # personal_schedules 테이블 확인
        if any('personal_schedules' in table[0] for table in tables):
            print("personal_schedules 테이블이 존재합니다.")
            
            # 테이블 구조 확인
            cursor.execute("PRAGMA table_info(personal_schedules)")
            columns = cursor.fetchall()
            print(f"personal_schedules 테이블 구조:")
            for col in columns:
                print(f"  - {col[1]} ({col[2]})")
                
        else:
            print("personal_schedules 테이블이 존재하지 않습니다.")
            
        conn.close()
        return True
        
    except Exception as e:
        print(f"데이터베이스 확인 중 오류: {e}")
        return False

if __name__ == '__main__':
    check_database_tables()
