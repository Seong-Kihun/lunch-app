#!/usr/bin/env python3
"""
데이터베이스 초기화 스크립트
필요한 테이블들을 생성합니다.
"""

# 🚨 중요: 모델 import 순서가 매우 중요합니다!
# 1단계: User 모델을 가장 먼저 import하여 'users' 테이블을 먼저 생성
from auth.models import User

# 2단계: 데이터베이스 객체 import
from extensions import db

# 3단계: Flask 앱 import (모델 정의 후)
from app import app

# 4단계: 스케줄 모델 import
from models.schedule_models import PersonalSchedule, ScheduleException

print("🔧 모델 import 순서:")
print("   1. User 모델 ✅")
print("   2. 데이터베이스 객체 ✅")
print("   3. Flask 앱 ✅")
print("   4. 스케줄 모델 ✅")

def init_database():
    """데이터베이스 테이블을 초기화합니다."""
    with app.app_context():
        try:
            print("🔧 데이터베이스 초기화 시작...")
            
            # 모든 테이블 삭제 (기존 데이터 초기화)
            db.drop_all()
            print("✅ 기존 테이블 삭제 완료")
            
            # 모든 테이블 생성
            db.create_all()
            print("✅ 새 테이블 생성 완료")
            
            # 기본 사용자 생성
            create_default_users()
            print("✅ 기본 사용자 생성 완료")
            
            print("🎉 데이터베이스 초기화 완료!")
            
        except Exception as e:
            print(f"❌ 데이터베이스 초기화 실패: {e}")
            import traceback
            traceback.print_exc()

def create_default_users():
    """기본 사용자들을 생성합니다."""
    try:
        # 가상 사용자 데이터
        default_users = [
            {
                'email': 'kim@example.com',
                'nickname': '김철수',
                'employee_id': '1'
            },
            {
                'email': 'lee@example.com',
                'nickname': '이영희',
                'employee_id': '2'
            },
            {
                'email': 'park@example.com',
                'nickname': '박민수',
                'employee_id': '3'
            }
        ]
        
        for user_data in default_users:
            user = User(**user_data)
            db.session.add(user)
        
        db.session.commit()
        print(f"✅ {len(default_users)}명의 기본 사용자 생성 완료")
        
    except Exception as e:
        print(f"❌ 기본 사용자 생성 실패: {e}")
        db.session.rollback()

if __name__ == '__main__':
    init_database()
