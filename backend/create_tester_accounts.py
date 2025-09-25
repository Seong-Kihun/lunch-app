#!/usr/bin/env python3
"""
테스터 계정 생성 및 관리 스크립트
실제 회원가입을 통한 테스터 계정 생성
"""

import os
import sys
import requests
import json
from datetime import datetime

# 프로젝트 루트를 Python 경로에 추가
project_root = os.path.dirname(os.path.abspath(__file__))
backend_path = os.path.join(project_root, 'backend')
sys.path.insert(0, backend_path)

# 서버 URL 설정
RENDER_SERVER_URL = "https://lunch-app-backend-ra12.onrender.com"
LOCAL_SERVER_URL = "http://localhost:5000"

def get_server_url():
    """서버 URL 결정"""
    # Render 서버가 사용 가능한지 확인
    try:
        response = requests.get(f"{RENDER_SERVER_URL}/health", timeout=5)
        if response.status_code == 200:
            return RENDER_SERVER_URL
    except:
        pass
    
    # 로컬 서버 사용
    return LOCAL_SERVER_URL

def create_tester_account(server_url, tester_data):
    """테스터 계정 생성"""
    try:
        print(f"🔧 테스터 계정 생성 중: {tester_data['nickname']}")
        
        # 회원가입 API 호출
        response = requests.post(f"{server_url}/api/auth/register", 
                               json=tester_data, 
                               headers={'Content-Type': 'application/json'})
        
        if response.status_code == 201:
            print(f"✅ 테스터 계정 생성 성공: {tester_data['nickname']}")
            return True
        else:
            print(f"❌ 테스터 계정 생성 실패: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ 테스터 계정 생성 오류: {e}")
        return False

def login_tester_account(server_url, email, password):
    """테스터 계정 로그인"""
    try:
        print(f"🔧 테스터 계정 로그인 중: {email}")
        
        # 로그인 API 호출
        response = requests.post(f"{server_url}/api/auth/login", 
                               json={'email': email, 'password': password}, 
                               headers={'Content-Type': 'application/json'})
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 테스터 계정 로그인 성공: {email}")
            print(f"   Access Token: {data.get('access_token', 'N/A')[:20]}...")
            return data.get('access_token')
        else:
            print(f"❌ 테스터 계정 로그인 실패: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ 테스터 계정 로그인 오류: {e}")
        return None

def main():
    """메인 함수"""
    print("🚀 테스터 계정 생성 및 관리 시스템")
    print("=" * 50)
    
    # 서버 URL 결정
    server_url = get_server_url()
    print(f"🌐 사용할 서버: {server_url}")
    
    # 테스터 계정 데이터
    tester_accounts = [
        {
            'email': 'tester1@koica.go.kr',
            'password': 'Test123!@#',
            'nickname': '테스터1',
            'employee_id': 'TEST001',
            'agreements': {
                'service_terms': True,
                'privacy_policy': True
            }
        },
        {
            'email': 'tester2@koica.go.kr',
            'password': 'Test123!@#',
            'nickname': '테스터2',
            'employee_id': 'TEST002',
            'agreements': {
                'service_terms': True,
                'privacy_policy': True
            }
        },
        {
            'email': 'tester3@koica.go.kr',
            'password': 'Test123!@#',
            'nickname': '테스터3',
            'employee_id': 'TEST003',
            'agreements': {
                'service_terms': True,
                'privacy_policy': True
            }
        },
        {
            'email': 'tester4@koica.go.kr',
            'password': 'Test123!@#',
            'nickname': '테스터4',
            'employee_id': 'TEST004',
            'agreements': {
                'service_terms': True,
                'privacy_policy': True
            }
        },
        {
            'email': 'tester5@koica.go.kr',
            'password': 'Test123!@#',
            'nickname': '테스터5',
            'employee_id': 'TEST005',
            'agreements': {
                'service_terms': True,
                'privacy_policy': True
            }
        }
    ]
    
    print(f"\n📝 {len(tester_accounts)}개의 테스터 계정을 생성합니다...")
    
    success_count = 0
    created_accounts = []
    
    for i, account_data in enumerate(tester_accounts, 1):
        print(f"\n--- 테스터 계정 {i}/{len(tester_accounts)} ---")
        
        # 계정 생성
        if create_tester_account(server_url, account_data):
            success_count += 1
            created_accounts.append(account_data)
            
            # 로그인 테스트
            token = login_tester_account(server_url, account_data['email'], account_data['password'])
            if token:
                print(f"   ✅ 로그인 테스트 성공")
            else:
                print(f"   ⚠️ 로그인 테스트 실패")
    
    print(f"\n🎉 테스터 계정 생성 완료!")
    print(f"   성공: {success_count}/{len(tester_accounts)}")
    
    if created_accounts:
        print(f"\n📋 생성된 테스터 계정 정보:")
        for account in created_accounts:
            print(f"   - {account['nickname']} ({account['email']}) - {account['employee_id']}")
    
    print(f"\n💡 테스터 계정 사용 방법:")
    print(f"   1. 앱에서 회원가입 버튼 클릭")
    print(f"   2. 위의 이메일과 비밀번호로 로그인")
    print(f"   3. 실제 사용자처럼 앱 기능 테스트")

if __name__ == "__main__":
    main()
