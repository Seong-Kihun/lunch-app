#!/usr/bin/env python3
"""
데이터베이스 초기화 스크립트
필요한 테이블들을 생성합니다.
"""

from app import app, db

# 🚨 중요: User 모델을 가장 먼저 import하여 'users' 테이블을 먼저 생성
from models.app_models import User

# 그 다음에 다른 모델들을 import
from models.schedule_models import PersonalSchedule, ScheduleException
# 🚨 중요: app.py에 이미 정의된 모델들을 사용하므로 중복 import 제거
# from models.app_models import Party, PartyMember, DangolPot, DangolPotMember, ChatRoom, ChatParticipant, LunchProposal, ProposalAcceptance, ChatMessage, Notification, UserAnalytics, RestaurantAnalytics, Restaurant, Review, Friendship, UserActivity, RestaurantVisit

def init_database():
    """데이터베이스 테이블을 초기화합니다."""
    with app.app_context():
        try:
            print("🔧 데이터베이스 초기화 시작...")
            
            # 🚨 중요: 모든 모델을 올바른 순서로 메타데이터에 등록
            print("🔧 모델 메타데이터 등록 중...")
            
            # 1단계: User 모델 등록
            if 'users' not in db.metadata.tables:
                User.__table__.create(db.engine, checkfirst=True)
                print("✅ User 모델이 메타데이터에 등록되었습니다.")
            else:
                print("✅ User 모델이 이미 메타데이터에 등록되어 있습니다.")
            
            # 2단계: PersonalSchedule, ScheduleException 모델 등록
            if 'personal_schedules' not in db.metadata.tables:
                PersonalSchedule.__table__.create(db.engine, checkfirst=True)
                print("✅ PersonalSchedule 모델이 메타데이터에 등록되었습니다.")
            if 'schedule_exceptions' not in db.metadata.tables:
                ScheduleException.__table__.create(db.engine, checkfirst=True)
                print("✅ ScheduleException 모델이 메타데이터에 등록되었습니다.")
            
            # 3단계: Party, PartyMember 모델 등록
            if 'party' not in db.metadata.tables:
                from app import Party
                Party.__table__.create(db.engine, checkfirst=True)
                print("✅ Party 모델이 메타데이터에 등록되었습니다.")
            if 'party_member' not in db.metadata.tables:
                from app import PartyMember
                PartyMember.__table__.create(db.engine, checkfirst=True)
                print("✅ PartyMember 모델이 메타데이터에 등록되었습니다.")
            
            # 4단계: DangolPot, DangolPotMember 모델 등록
            if 'dangol_pot' not in db.metadata.tables:
                from app import DangolPot
                DangolPot.__table__.create(db.engine, checkfirst=True)
                print("✅ DangolPot 모델이 메타데이터에 등록되었습니다.")
            if 'dangol_pot_member' not in db.metadata.tables:
                from app import DangolPotMember
                DangolPotMember.__table__.create(db.engine, checkfirst=True)
                print("✅ DangolPotMember 모델이 메타데이터에 등록되었습니다.")
            
            print("✅ 모든 모델이 메타데이터에 등록되었습니다.")
            
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
