#!/usr/bin/env python3
"""
새로운 데이터베이스 파일 생성 스크립트
기존 데이터베이스 파일을 삭제하고 새로 생성합니다.
"""

import os
import sys
import sqlite3
from pathlib import Path

def create_fresh_database():
    """새로운 데이터베이스 파일 생성"""
    print("🆕 새로운 데이터베이스 파일 생성 중...")
    
    try:
        # instance 디렉토리 생성
        instance_dir = Path("instance")
        instance_dir.mkdir(exist_ok=True)
        print(f"📁 디렉토리 생성: {instance_dir.absolute()}")
        
        # 기존 데이터베이스 파일 삭제
        db_path = instance_dir / "lunch_app.db"
        if db_path.exists():
            db_path.unlink()
            print(f"🗑️ 기존 파일 삭제: {db_path}")
        
        # 새 데이터베이스 파일 생성
        conn = sqlite3.connect(str(db_path))
        conn.close()
        print(f"✅ 새 데이터베이스 파일 생성: {db_path.absolute()}")
        
        # 파일 권한 확인
        if db_path.exists():
            print(f"✅ 파일 존재 확인: {db_path.absolute()}")
            print(f"📊 파일 크기: {db_path.stat().st_size} bytes")
        else:
            print("❌ 파일 생성 실패")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ 데이터베이스 파일 생성 실패: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_database_access():
    """데이터베이스 접근 테스트"""
    print("🧪 데이터베이스 접근 테스트 중...")
    
    try:
        db_path = Path("instance/lunch_app.db")
        
        # 읽기/쓰기 테스트
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # 테이블 생성 테스트
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS test_table (
                id INTEGER PRIMARY KEY,
                name TEXT
            )
        """)
        
        # 데이터 삽입 테스트
        cursor.execute("INSERT INTO test_table (name) VALUES (?)", ("test",))
        
        # 데이터 조회 테스트
        cursor.execute("SELECT * FROM test_table")
        result = cursor.fetchone()
        
        conn.commit()
        conn.close()
        
        print("✅ 데이터베이스 접근 테스트 성공")
        print(f"📊 테스트 결과: {result}")
        
        return True
        
    except Exception as e:
        print(f"❌ 데이터베이스 접근 테스트 실패: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """메인 실행 함수"""
    print("🚀 새로운 데이터베이스 생성 시작")
    print("=" * 50)
    
    # 1. 새 데이터베이스 파일 생성
    if not create_fresh_database():
        print("❌ 데이터베이스 파일 생성 실패")
        return False
    
    # 2. 데이터베이스 접근 테스트
    if not test_database_access():
        print("❌ 데이터베이스 접근 테스트 실패")
        return False
    
    print("\n" + "=" * 50)
    print("🎉 새로운 데이터베이스 생성 완료!")
    print("=" * 50)
    print("✅ 데이터베이스 파일 생성 완료")
    print("✅ 데이터베이스 접근 테스트 성공")
    print("✅ 파일 권한 정상")
    
    return True

if __name__ == "__main__":
    success = main()
    if not success:
        sys.exit(1)
