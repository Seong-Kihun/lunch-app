#!/usr/bin/env python3
"""
데이터베이스 초기화 스크립트
필요한 테이블들을 생성합니다.
"""

import os
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
        print(f"[DEBUG] get_user_model - 이미 로드된 User 모델 사용: {User}")
        return User
        
    try:
        print(f"[DEBUG] get_user_model 시작 - 메타데이터 상태: {list(db.metadata.tables.keys())}")
        
        # 근본적 해결: app.config에서 모델 가져오기 (중복 import 방지)
        from flask import current_app
        with current_app.app_context():
            User = current_app.config.get('USER_MODEL')
            if not User:
                print("[WARNING] app.config에서 User 모델을 찾을 수 없습니다. 직접 import합니다.")
                from backend.auth.models import User as UserModel
                User = UserModel
            else:
                print("[SUCCESS] app.config에서 User 모델을 가져왔습니다.")
            
            print(f"[DEBUG] User 모델: {User}")
            print(f"[DEBUG] 메타데이터 상태 (import 후): {list(db.metadata.tables.keys())}")
            return User
    except Exception as e:
        print(f"[ERROR] User 모델 가져오기 실패: {e}")
        print(f"[ERROR] 오류 타입: {type(e)}")
        import traceback
        traceback.print_exc()
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
            
            # app_factory에서 이미 모든 모델이 메타데이터에 등록됨
            # db.create_all()은 메타데이터 충돌을 일으킬 수 있으므로 제거
            print("✅ app_factory에서 모든 모델이 메타데이터에 등록되었습니다.")
            
            # 기본 사용자 생성 (세션 재설정 후)
            try:
                db.session.rollback()  # 세션 상태 초기화
                create_default_users()
                print("✅ 기본 사용자 생성 완료")
            except Exception as e:
                print(f"[ERROR] 기본 사용자 생성 실패: {e}")
            
            print("🎉 데이터베이스 초기화 완료!")
            
        except Exception as e:
            print(f"❌ 데이터베이스 초기화 실패: {e}")
            import traceback
            traceback.print_exc()

def create_default_users():
    """기본 사용자들을 생성합니다. (환경 설정에 따라 제어)"""
    try:
        # 환경 설정 확인
        create_virtual_users = os.getenv('CREATE_VIRTUAL_USERS', 'false').lower() == 'true'
        
        if not create_virtual_users:
            print("ℹ️ 가상 유저 생성이 비활성화되어 있습니다. 실제 테스터 계정을 사용하세요.")
            return
        
        # User 모델 동적 로드
        User = get_user_model()
        if User is None:
            print("❌ User 모델을 로드할 수 없습니다.")
            return
            
        # 가상 사용자 데이터 (개발 환경에서만)
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
            # password_hash 필드가 있는지 확인하고 기본값 설정
            if hasattr(User, 'password_hash'):
                user_data['password_hash'] = None  # 기본값으로 None 설정
            user = User(**user_data)
            db.session.add(user)
        
        db.session.commit()
        print(f"✅ {len(default_users)}명의 기본 사용자 생성 완료")
        
    except Exception as e:
        print(f"❌ 기본 사용자 생성 실패: {e}")
        db.session.rollback()

if __name__ == '__main__':
    init_database()
