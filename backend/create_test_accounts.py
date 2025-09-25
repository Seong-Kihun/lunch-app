#!/usr/bin/env python3
"""
테스터 계정 생성 도구
실제 테스터들이 사용할 수 있는 계정을 생성합니다.
"""

import os
import sys
import getpass
from datetime import datetime

# 프로젝트 루트를 Python 경로에 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app.app_factory import create_app
from backend.app.extensions import db
from backend.auth.models import User

def create_test_account():
    """테스터 계정 생성"""
    app = create_app()
    
    with app.app_context():
        print("🧪 테스터 계정 생성 도구")
        print("=" * 50)
        
        # 사용자 입력 받기
        email = input("이메일 주소 (예: tester1@koica.go.kr): ").strip()
        if not email.endswith('@koica.go.kr'):
            print("❌ KOICA 이메일 주소만 사용 가능합니다.")
            return False
        
        nickname = input("닉네임 (2-8자): ").strip()
        if len(nickname) < 2 or len(nickname) > 8:
            print("❌ 닉네임은 2-8자로 입력해주세요.")
            return False
        
        password = getpass.getpass("비밀번호 (최소 8자): ")
        if len(password) < 8:
            print("❌ 비밀번호는 최소 8자 이상이어야 합니다.")
            return False
        
        confirm_password = getpass.getpass("비밀번호 확인: ")
        if password != confirm_password:
            print("❌ 비밀번호가 일치하지 않습니다.")
            return False
        
        # 중복 확인
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            print(f"❌ 이미 존재하는 이메일입니다: {email}")
            return False
        
        existing_nickname = User.query.filter_by(nickname=nickname).first()
        if existing_nickname:
            print(f"❌ 이미 사용 중인 닉네임입니다: {nickname}")
            return False
        
        try:
            # 사용자 생성
            user = User(
                email=email,
                nickname=nickname,
                employee_id=f"test_{datetime.now().strftime('%Y%m%d%H%M%S')}"
            )
            user.set_password(password)
            
            db.session.add(user)
            db.session.commit()
            
            print(f"✅ 테스터 계정 생성 완료!")
            print(f"   이메일: {email}")
            print(f"   닉네임: {nickname}")
            print(f"   직원 ID: {user.employee_id}")
            print(f"   로그인 방법: 비밀번호")
            
            return True
            
        except Exception as e:
            print(f"❌ 계정 생성 실패: {e}")
            db.session.rollback()
            return False

def list_test_accounts():
    """테스터 계정 목록 조회"""
    app = create_app()
    
    with app.app_context():
        print("📋 테스터 계정 목록")
        print("=" * 50)
        
        users = User.query.filter(User.employee_id.like('test_%')).all()
        
        if not users:
            print("등록된 테스터 계정이 없습니다.")
            return
        
        for user in users:
            print(f"이메일: {user.email}")
            print(f"닉네임: {user.nickname}")
            print(f"직원 ID: {user.employee_id}")
            print(f"로그인 방법: {user.login_method}")
            print(f"생성일: {user.created_at}")
            print("-" * 30)

def main():
    """메인 함수"""
    print("🔧 테스터 계정 관리 도구")
    print("1. 테스터 계정 생성")
    print("2. 테스터 계정 목록 조회")
    print("3. 종료")
    
    while True:
        choice = input("\n선택하세요 (1-3): ").strip()
        
        if choice == '1':
            create_test_account()
        elif choice == '2':
            list_test_accounts()
        elif choice == '3':
            print("👋 프로그램을 종료합니다.")
            break
        else:
            print("❌ 잘못된 선택입니다. 1-3 중에서 선택해주세요.")

if __name__ == "__main__":
    main()
