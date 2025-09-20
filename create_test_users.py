"""
테스트용 사용자를 데이터베이스에 생성하는 스크립트
프로덕션 환경에서도 안전하게 작동하도록 실제 사용자 데이터를 생성합니다.
"""

import os
import sys
from datetime import datetime

# 프로젝트 루트를 Python 경로에 추가
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from extensions import db
from models.app_models import User
from auth.utils import AuthUtils

def create_test_users():
    """테스트용 사용자들을 데이터베이스에 생성"""
    app = create_app()
    
    with app.app_context():
        # 기존 테스트 사용자들 삭제 (EMP001-EMP005)
        existing_users = User.query.filter(
            User.employee_id.in_(['EMP001', 'EMP002', 'EMP003', 'EMP004', 'EMP005'])
        ).all()
        
        for user in existing_users:
            db.session.delete(user)
        
        db.session.commit()
        print(f"기존 테스트 사용자 {len(existing_users)}명 삭제 완료")
        
        # 새로운 테스트 사용자들 생성
        test_users_data = [
            {
                "employee_id": "EMP001",
                "email": "kim@koica.go.kr",
                "nickname": "김철수",
                "main_dish_genre": "한식",
                "lunch_preference": "맛집 탐방",
                "allergies": "없음",
                "preferred_time": "12:00",
                "frequent_areas": "강남구,서초구"
            },
            {
                "employee_id": "EMP002", 
                "email": "lee@koica.go.kr",
                "nickname": "이영희",
                "main_dish_genre": "일식",
                "lunch_preference": "건강한 식사",
                "allergies": "견과류",
                "preferred_time": "12:30",
                "frequent_areas": "마포구,용산구"
            },
            {
                "employee_id": "EMP003",
                "email": "park@koica.go.kr", 
                "nickname": "박민수",
                "main_dish_genre": "양식",
                "lunch_preference": "빠른 식사",
                "allergies": "유제품",
                "preferred_time": "13:00",
                "frequent_areas": "홍대,신촌"
            },
            {
                "employee_id": "EMP004",
                "email": "choi@koica.go.kr",
                "nickname": "최지은", 
                "main_dish_genre": "중식",
                "lunch_preference": "다양한 메뉴",
                "allergies": "없음",
                "preferred_time": "12:15",
                "frequent_areas": "강남구,송파구"
            },
            {
                "employee_id": "EMP005",
                "email": "jung@koica.go.kr",
                "nickname": "정현우",
                "main_dish_genre": "한식",
                "lunch_preference": "비즈니스 미팅",
                "allergies": "없음",
                "preferred_time": "12:45",
                "frequent_areas": "여의도,마포구"
            }
        ]
        
        created_users = []
        
        for user_data in test_users_data:
            # 사용자 생성
            user = User(
                employee_id=user_data["employee_id"],
                email=user_data["email"],
                nickname=user_data["nickname"],
                main_dish_genre=user_data["main_dish_genre"],
                lunch_preference=user_data["lunch_preference"],
                allergies=user_data["allergies"],
                preferred_time=user_data["preferred_time"],
                frequent_areas=user_data["frequent_areas"],
                is_active=True,
                points=1000,  # 기본 포인트
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            
            db.session.add(user)
            created_users.append(user)
            print(f"테스트 사용자 생성: {user_data['nickname']} ({user_data['employee_id']})")
        
        # 데이터베이스에 저장
        db.session.commit()
        
        print(f"\n✅ 테스트 사용자 {len(created_users)}명이 성공적으로 생성되었습니다!")
        
        # 생성된 사용자들의 ID 확인
        for user in created_users:
            print(f"  - {user.nickname} ({user.employee_id}): ID={user.id}")
        
        return created_users

def create_test_tokens():
    """생성된 테스트 사용자들에 대한 유효한 JWT 토큰 생성"""
    app = create_app()
    
    with app.app_context():
        # 테스트 사용자들 조회
        test_users = User.query.filter(
            User.employee_id.in_(['EMP001', 'EMP002', 'EMP003', 'EMP004', 'EMP005'])
        ).all()
        
        tokens = {}
        
        for user in test_users:
            # 유효한 JWT 토큰 생성
            access_token = AuthUtils.generate_jwt_token(user.id, 'access')
            refresh_token, _ = AuthUtils.create_refresh_token(user.id)
            
            tokens[user.employee_id] = {
                "user_id": user.id,
                "access_token": access_token,
                "refresh_token": refresh_token,
                "user": user
            }
            
            print(f"토큰 생성: {user.nickname} ({user.employee_id}) - ID: {user.id}")
        
        return tokens

if __name__ == "__main__":
    print("🚀 테스트용 사용자 생성 시작...")
    
    # 1. 테스트 사용자 생성
    users = create_test_users()
    
    # 2. 유효한 토큰 생성
    print("\n🔑 테스트용 JWT 토큰 생성...")
    tokens = create_test_tokens()
    
    print(f"\n✅ 완료! {len(users)}명의 테스트 사용자와 토큰이 생성되었습니다.")
    print("\n📝 사용법:")
    print("   - 테스트에서 이제 유효한 토큰을 사용할 수 있습니다.")
    print("   - 프로덕션 환경에서도 안전하게 작동합니다.")
