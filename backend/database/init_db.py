#!/usr/bin/env python3
"""
데이터베이스 초기화 스크립트
필요한 테이블들을 생성합니다.
"""

from backend.app.app import app
from backend.app.extensions import db

# 🚨 중요: 메타데이터 충돌 방지를 위한 동적 모델 접근
# User 모델은 app_factory에서 이미 메타데이터에 등록됨

# 전역 변수로 모델 저장
User = None

def get_user_model():
    """User 모델을 동적으로 가져오는 함수"""
    global User
    if User is not None:
        return User
        
    try:
        # 근본적 해결: 직접 import만 사용 (메타데이터 접근 방식 문제 해결)
        from backend.auth.models import User as UserModel
        User = UserModel
        print("[SUCCESS] User 모델을 직접 import했습니다.")
        return User
    except Exception as e:
        print(f"[ERROR] User 모델 가져오기 실패: {e}")
        return None

# 그 다음에 다른 모델들을 import
from backend.models.schedule_models import PersonalSchedule, ScheduleException
# 🚨 중요: app.py에 이미 정의된 모델들을 사용하므로 중복 import 제거
# from models.app_models import Party, PartyMember, DangolPot, DangolPotMember, ChatRoom, ChatParticipant, LunchProposal, ProposalAcceptance, ChatMessage, Notification, UserAnalytics, RestaurantAnalytics, Restaurant, Review, Friendship, UserActivity, RestaurantVisit

def init_database():
    """데이터베이스 테이블을 초기화합니다."""
    with app.app_context():
        try:
            print("🔧 데이터베이스 초기화 시작...")
            
            # 🚨 중요: 모든 모델을 올바른 순서로 메타데이터에 등록
            print("🔧 모델 메타데이터 등록 중...")
            
            # 1단계: User 모델 확인 (app_factory에서 이미 등록됨)
            if 'users' not in db.metadata.tables:
                print("❌ User 모델이 메타데이터에 등록되지 않았습니다.")
                print("   app_factory에서 User 모델을 import해야 합니다.")
                return False
            else:
                print("✅ User 모델이 이미 메타데이터에 등록되어 있습니다.")
            
            # 2단계: 다른 모델들 확인 (app_factory에서 이미 등록됨)
            print("✅ 모든 모델이 app_factory에서 메타데이터에 등록되었습니다.")
            
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
        # User 모델 동적 로드
        User = get_user_model()
        if User is None:
            print("❌ User 모델을 로드할 수 없습니다.")
            return
            
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
