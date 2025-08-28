#!/usr/bin/env python3
"""
데이터베이스 초기화 스크립트
필요한 테이블들을 생성합니다.
"""

from app import app, db
from models.schedule_models import PersonalSchedule, ScheduleException

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
        # 가상 사용자 데이터 (User 모델이 없으므로 건너뜀)
        print("ℹ️ User 모델이 없어 기본 사용자 생성을 건너뜁니다.")
        
    except Exception as e:
        print(f"❌ 기본 사용자 생성 실패: {e}")
        db.session.rollback()

if __name__ == '__main__':
    init_database()
