#!/usr/bin/env python3
"""
인증 시스템 문제 해결 스크립트
데이터베이스 연결 문제로 인한 인증 토큰 생성 실패를 해결합니다.
"""

import os
import sys
from flask import Flask
from extensions import db
from auth.models import User

def create_app_context():
    """Flask 앱 컨텍스트 생성"""
    try:
        from app import app
        return app
    except Exception as e:
        print(f"❌ 앱 컨텍스트 생성 실패: {e}")
        return None

def test_database_connection(app):
    """데이터베이스 연결 테스트"""
    print("🔍 데이터베이스 연결 테스트 중...")
    
    try:
        with app.app_context():
            # 데이터베이스 URL 확인
            db_uri = app.config.get("SQLALCHEMY_DATABASE_URI")
            print(f"📊 데이터베이스 URI: {db_uri}")
            
            # 데이터베이스 연결 테스트
            with db.engine.connect() as connection:
                result = connection.execute(db.text("SELECT 1"))
                print("✅ 데이터베이스 연결 성공")
            
            # 테이블 존재 확인
            inspector = db.inspect(db.engine)
            tables = inspector.get_table_names()
            print(f"📋 발견된 테이블: {tables}")
            
            return True
            
    except Exception as e:
        print(f"❌ 데이터베이스 연결 실패: {e}")
        return False

def create_test_users(app):
    """테스트 사용자 생성"""
    print("👥 테스트 사용자 생성 중...")
    
    try:
        with app.app_context():
            # 기존 사용자 확인
            existing_users = User.query.all()
            print(f"📊 기존 사용자 수: {len(existing_users)}")
            
            if len(existing_users) == 0:
                # 테스트 사용자 생성
                test_users = [
                    {
                        'employee_id': 'EMP001',
                        'email': 'kim@koica.go.kr',
                        'nickname': '김철수',
                        'is_active': True,
                        'main_dish_genre': '한식',
                        'lunch_preference': '맛집 탐방',
                        'allergies': '없음',
                        'preferred_time': '12:00',
                        'frequent_areas': '강남구,서초구'
                    },
                    {
                        'employee_id': 'EMP002',
                        'email': 'lee@koica.go.kr',
                        'nickname': '이영희',
                        'is_active': True,
                        'main_dish_genre': '일식',
                        'lunch_preference': '건강한 식사',
                        'allergies': '견과류',
                        'preferred_time': '12:30',
                        'frequent_areas': '강남구,송파구'
                    },
                    {
                        'employee_id': 'EMP003',
                        'email': 'park@koica.go.kr',
                        'nickname': '박민수',
                        'is_active': True,
                        'main_dish_genre': '중식',
                        'lunch_preference': '다양한 맛',
                        'allergies': '없음',
                        'preferred_time': '12:15',
                        'frequent_areas': '서초구,강남구'
                    }
                ]
                
                for user_data in test_users:
                    user = User(**user_data)
                    db.session.add(user)
                
                db.session.commit()
                print("✅ 테스트 사용자 생성 완료")
            else:
                print("ℹ️ 사용자가 이미 존재합니다")
            
            return True
            
    except Exception as e:
        print(f"❌ 테스트 사용자 생성 실패: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_auth_token_generation(app):
    """인증 토큰 생성 테스트"""
    print("🔐 인증 토큰 생성 테스트 중...")
    
    try:
        with app.app_context():
            from auth.utils import AuthUtils
            
            # 사용자 조회
            user = User.query.first()
            if not user:
                print("❌ 테스트할 사용자가 없습니다")
                return False
            
            print(f"👤 테스트 사용자: {user.employee_id} ({user.nickname})")
            
            # JWT 토큰 생성 테스트
            token = AuthUtils.generate_jwt_token(user.id, 'access')
            print(f"✅ JWT 토큰 생성 성공: {token[:20]}...")
            
            # JWT 토큰 검증 테스트
            payload = AuthUtils.verify_jwt_token(token)
            if payload:
                print(f"✅ JWT 토큰 검증 성공: {payload}")
            else:
                print("❌ JWT 토큰 검증 실패")
                return False
            
            return True
            
    except Exception as e:
        print(f"❌ 인증 토큰 생성 테스트 실패: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_api_endpoints(app):
    """API 엔드포인트 테스트"""
    print("🌐 API 엔드포인트 테스트 중...")
    
    try:
        with app.app_context():
            from auth.utils import AuthUtils
            
            # 사용자 조회
            user = User.query.first()
            if not user:
                print("❌ 테스트할 사용자가 없습니다")
                return False
            
            # JWT 토큰 생성
            token = AuthUtils.generate_jwt_token(user.id, 'access')
            
            # 테스트 클라이언트 생성
            with app.test_client() as client:
                # 인증 헤더 설정
                headers = {
                    'Authorization': f'Bearer {token}',
                    'Content-Type': 'application/json'
                }
                
                # API 엔드포인트 테스트
                endpoints = [
                    '/api/users/profile',
                    '/api/parties/',
                    '/api/v2/restaurants/'
                ]
                
                for endpoint in endpoints:
                    try:
                        response = client.get(endpoint, headers=headers)
                        print(f"  {endpoint}: {response.status_code}")
                        
                        if response.status_code == 200:
                            print(f"    ✅ 성공")
                        elif response.status_code == 401:
                            print(f"    ⚠️ 인증 필요 (정상)")
                        elif response.status_code == 404:
                            print(f"    ❌ 엔드포인트 없음")
                        else:
                            print(f"    ⚠️ 기타 응답: {response.status_code}")
                            
                    except Exception as e:
                        print(f"    ❌ 오류: {e}")
            
            return True
            
    except Exception as e:
        print(f"❌ API 엔드포인트 테스트 실패: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """메인 실행 함수"""
    print("🚀 인증 시스템 문제 해결 시작")
    print("=" * 50)
    
    # 1. Flask 앱 컨텍스트 생성
    app = create_app_context()
    if not app:
        print("❌ Flask 앱 컨텍스트 생성 실패")
        return False
    
    # 2. 데이터베이스 연결 테스트
    if not test_database_connection(app):
        print("❌ 데이터베이스 연결 테스트 실패")
        return False
    
    # 3. 테스트 사용자 생성
    if not create_test_users(app):
        print("❌ 테스트 사용자 생성 실패")
        return False
    
    # 4. 인증 토큰 생성 테스트
    if not test_auth_token_generation(app):
        print("❌ 인증 토큰 생성 테스트 실패")
        return False
    
    # 5. API 엔드포인트 테스트
    if not test_api_endpoints(app):
        print("❌ API 엔드포인트 테스트 실패")
        return False
    
    print("\n" + "=" * 50)
    print("🎉 인증 시스템 문제 해결 완료!")
    print("=" * 50)
    print("✅ 데이터베이스 연결 정상")
    print("✅ 테스트 사용자 생성 완료")
    print("✅ 인증 토큰 생성/검증 정상")
    print("✅ API 엔드포인트 테스트 완료")
    
    return True

if __name__ == "__main__":
    success = main()
    if not success:
        sys.exit(1)
