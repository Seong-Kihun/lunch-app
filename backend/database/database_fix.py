#!/usr/bin/env python3
"""
데이터베이스 초기화 및 수정 스크립트
근본적인 데이터베이스 문제를 해결합니다.
"""

import os
import sys
import sqlite3
from pathlib import Path
from flask import Flask
from backend.app.extensions import db
from backend.models.app_models import *
from backend.auth.models import *

def create_app_context():
    """Flask 앱 컨텍스트 생성"""
    try:
        from backend.app.app import app
        return app
    except Exception as e:
        print(f"❌ 앱 컨텍스트 생성 실패: {e}")
        return None

def check_database_connection():
    """데이터베이스 연결 확인"""
    print("🔍 데이터베이스 연결 확인 중...")
    
    try:
        # 데이터베이스 파일 경로 확인
        db_path = "instance/lunch_app.db"
        if not os.path.exists(db_path):
            print(f"❌ 데이터베이스 파일이 존재하지 않습니다: {db_path}")
            return False
        
        # SQLite 연결 테스트
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        conn.close()
        
        print(f"✅ 데이터베이스 연결 성공: {db_path}")
        print(f"📊 발견된 테이블 수: {len(tables)}")
        
        if tables:
            print("📋 테이블 목록:")
            for table in tables:
                print(f"  - {table[0]}")
        
        return True
        
    except Exception as e:
        print(f"❌ 데이터베이스 연결 실패: {e}")
        return False

def fix_database_permissions():
    """데이터베이스 파일 권한 수정"""
    print("🔧 데이터베이스 파일 권한 수정 중...")
    
    try:
        db_path = "instance/lunch_app.db"
        
        # 파일 권한 확인 및 수정
        if os.path.exists(db_path):
            # 읽기/쓰기 권한 확인
            if os.access(db_path, os.R_OK) and os.access(db_path, os.W_OK):
                print("✅ 데이터베이스 파일 권한 정상")
                return True
            else:
                print("⚠️ 데이터베이스 파일 권한 문제 발견")
                # Windows에서는 chmod가 작동하지 않으므로 파일을 다시 생성
                return recreate_database_file()
        else:
            print("❌ 데이터베이스 파일이 존재하지 않습니다")
            return create_database_file()
            
    except Exception as e:
        print(f"❌ 데이터베이스 권한 수정 실패: {e}")
        return False

def recreate_database_file():
    """데이터베이스 파일 재생성"""
    print("🔄 데이터베이스 파일 재생성 중...")
    
    try:
        db_path = "instance/lunch_app.db"
        
        # 기존 파일 백업
        if os.path.exists(db_path):
            backup_path = f"{db_path}.backup"
            os.rename(db_path, backup_path)
            print(f"📁 기존 파일 백업: {backup_path}")
        
        # 새 데이터베이스 파일 생성
        conn = sqlite3.connect(db_path)
        conn.close()
        
        print(f"✅ 데이터베이스 파일 생성 완료: {db_path}")
        return True
        
    except Exception as e:
        print(f"❌ 데이터베이스 파일 재생성 실패: {e}")
        return False

def create_database_file():
    """새 데이터베이스 파일 생성"""
    print("🆕 새 데이터베이스 파일 생성 중...")
    
    try:
        # instance 디렉토리 생성
        os.makedirs("instance", exist_ok=True)
        
        # 데이터베이스 파일 생성
        db_path = "instance/lunch_app.db"
        conn = sqlite3.connect(db_path)
        conn.close()
        
        print(f"✅ 새 데이터베이스 파일 생성 완료: {db_path}")
        return True
        
    except Exception as e:
        print(f"❌ 새 데이터베이스 파일 생성 실패: {e}")
        return False

def initialize_database_schema(app):
    """데이터베이스 스키마 초기화"""
    print("🏗️ 데이터베이스 스키마 초기화 중...")
    
    try:
        with app.app_context():
            # 모든 테이블 생성
            db.create_all()
            print("✅ 데이터베이스 스키마 초기화 완료")
            
            # 테이블 목록 확인
            inspector = db.inspect(db.engine)
            tables = inspector.get_table_names()
            print(f"📊 생성된 테이블 수: {len(tables)}")
            
            if tables:
                print("📋 생성된 테이블 목록:")
                for table in tables:
                    print(f"  - {table}")
            
            return True
            
    except Exception as e:
        print(f"❌ 데이터베이스 스키마 초기화 실패: {e}")
        return False

def create_initial_data(app):
    """초기 데이터 생성"""
    print("📝 초기 데이터 생성 중...")
    
    try:
        with app.app_context():
            # 사용자 데이터 확인
            user_count = User.query.count()
            print(f"👥 기존 사용자 수: {user_count}")
            
            if user_count == 0:
                print("📝 테스트 사용자 생성 중...")
                
                # 테스트 사용자 생성
                test_users = [
                    {
                        'employee_id': 'EMP001',
                        'email': 'kim@koica.go.kr',
                        'nickname': '김철수',
                        'is_active': True
                    },
                    {
                        'employee_id': 'EMP002',
                        'email': 'lee@koica.go.kr',
                        'nickname': '이영희',
                        'is_active': True
                    },
                    {
                        'employee_id': 'EMP003',
                        'email': 'park@koica.go.kr',
                        'nickname': '박민수',
                        'is_active': True
                    }
                ]
                
                for user_data in test_users:
                    user = User(**user_data)
                    db.session.add(user)
                
                db.session.commit()
                print("✅ 테스트 사용자 생성 완료")
            else:
                print("ℹ️ 사용자 데이터가 이미 존재합니다")
            
            return True
            
    except Exception as e:
        print(f"❌ 초기 데이터 생성 실패: {e}")
        return False

def test_database_operations(app):
    """데이터베이스 작업 테스트"""
    print("🧪 데이터베이스 작업 테스트 중...")
    
    try:
        with app.app_context():
            # 사용자 조회 테스트
            users = User.query.limit(5).all()
            print(f"✅ 사용자 조회 테스트 성공: {len(users)}명")
            
            # 사용자 생성 테스트
            test_user = User(
                employee_id='TEST001',
                email='test@example.com',
                nickname='테스트사용자',
                is_active=True
            )
            db.session.add(test_user)
            db.session.commit()
            print("✅ 사용자 생성 테스트 성공")
            
            # 사용자 삭제 테스트
            db.session.delete(test_user)
            db.session.commit()
            print("✅ 사용자 삭제 테스트 성공")
            
            return True
            
    except Exception as e:
        print(f"❌ 데이터베이스 작업 테스트 실패: {e}")
        return False

def main():
    """메인 실행 함수"""
    print("🚀 데이터베이스 문제 해결 시작")
    print("=" * 50)
    
    # 1. 데이터베이스 연결 확인
    if not check_database_connection():
        print("❌ 데이터베이스 연결 확인 실패")
        return False
    
    # 2. 데이터베이스 권한 수정
    if not fix_database_permissions():
        print("❌ 데이터베이스 권한 수정 실패")
        return False
    
    # 3. Flask 앱 컨텍스트 생성
    app = create_app_context()
    if not app:
        print("❌ Flask 앱 컨텍스트 생성 실패")
        return False
    
    # 4. 데이터베이스 스키마 초기화
    if not initialize_database_schema(app):
        print("❌ 데이터베이스 스키마 초기화 실패")
        return False
    
    # 5. 초기 데이터 생성
    if not create_initial_data(app):
        print("❌ 초기 데이터 생성 실패")
        return False
    
    # 6. 데이터베이스 작업 테스트
    if not test_database_operations(app):
        print("❌ 데이터베이스 작업 테스트 실패")
        return False
    
    print("\n" + "=" * 50)
    print("🎉 데이터베이스 문제 해결 완료!")
    print("=" * 50)
    print("✅ 데이터베이스 연결 정상")
    print("✅ 데이터베이스 스키마 초기화 완료")
    print("✅ 초기 데이터 생성 완료")
    print("✅ 데이터베이스 작업 테스트 성공")
    
    return True

if __name__ == "__main__":
    success = main()
    if not success:
        sys.exit(1)
