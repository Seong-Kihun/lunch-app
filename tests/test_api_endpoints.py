#!/usr/bin/env python3
"""
API 엔드포인트 테스트 스크립트
개선된 API들의 동작을 검증합니다.
"""

import requests
import sys
from datetime import datetime

# 서버 설정
BASE_URL = "http://localhost:5000"
TEST_HEADERS = {
    "Content-Type": "application/json",
    "Authorization": "Bearer test-token"  # 테스트용 토큰
}

def test_endpoint(method, endpoint, data=None, expected_status=200):
    """API 엔드포인트 테스트"""
    url = f"{BASE_URL}{endpoint}"
    
    try:
        if method.upper() == "GET":
            response = requests.get(url, headers=TEST_HEADERS, timeout=10)
        elif method.upper() == "POST":
            response = requests.post(url, headers=TEST_HEADERS, json=data, timeout=10)
        elif method.upper() == "PUT":
            response = requests.put(url, headers=TEST_HEADERS, json=data, timeout=10)
        elif method.upper() == "DELETE":
            response = requests.delete(url, headers=TEST_HEADERS, timeout=10)
        else:
            print(f"❌ 지원하지 않는 HTTP 메서드: {method}")
            return False
        
        status_ok = response.status_code == expected_status
        status_icon = "✅" if status_ok else "❌"
        
        print(f"{status_icon} {method.upper()} {endpoint}")
        print(f"   Status: {response.status_code} (expected: {expected_status})")
        
        if not status_ok:
            print(f"   Response: {response.text[:200]}...")
        
        return status_ok
        
    except requests.exceptions.ConnectionError:
        print(f"❌ {method.upper()} {endpoint}")
        print(f"   Error: 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인하세요.")
        return False
    except Exception as e:
        print(f"❌ {method.upper()} {endpoint}")
        print(f"   Error: {str(e)}")
        return False

def test_health_check():
    """헬스체크 테스트"""
    print("\n🏥 헬스체크 테스트")
    print("=" * 50)
    
    success = test_endpoint("GET", "/health")
    return success

def test_user_apis():
    """사용자 API 테스트"""
    print("\n👤 사용자 API 테스트")
    print("=" * 50)
    
    endpoints = [
        ("GET", "/api/users/profile"),
        ("GET", "/api/users/activity-stats"),
        ("GET", "/api/users/dashboard"),
        ("GET", "/api/users/appointments"),
        ("GET", "/api/users/points"),
        ("GET", "/api/users/badges"),
    ]
    
    success_count = 0
    for method, endpoint in endpoints:
        if test_endpoint(method, endpoint, expected_status=401):  # 인증 필요로 401 예상
            success_count += 1
    
    print(f"\n📊 사용자 API 테스트 결과: {success_count}/{len(endpoints)} 성공")
    return success_count == len(endpoints)

def test_party_apis():
    """파티 API 테스트"""
    print("\n🎉 파티 API 테스트")
    print("=" * 50)
    
    endpoints = [
        ("GET", "/api/parties"),
        ("POST", "/api/parties", {"title": "테스트 파티", "restaurant_name": "테스트 식당"}),
    ]
    
    success_count = 0
    for method, endpoint, *data in endpoints:
        test_data = data[0] if data else None
        if test_endpoint(method, endpoint, test_data, expected_status=401):  # 인증 필요로 401 예상
            success_count += 1
    
    print(f"\n📊 파티 API 테스트 결과: {success_count}/{len(endpoints)} 성공")
    return success_count == len(endpoints)

def test_auth_apis():
    """인증 API 테스트"""
    print("\n🔐 인증 API 테스트")
    print("=" * 50)
    
    endpoints = [
        ("POST", "/api/auth/magic-link", {"email": "test@koica.go.kr"}),
        ("GET", "/api/auth/test-login/1"),  # 테스트 로그인
    ]
    
    success_count = 0
    for method, endpoint, *data in endpoints:
        test_data = data[0] if data else None
        if test_endpoint(method, endpoint, test_data):
            success_count += 1
    
    print(f"\n📊 인증 API 테스트 결과: {success_count}/{len(endpoints)} 성공")
    return success_count == len(endpoints)

def test_schedule_apis():
    """일정 API 테스트"""
    print("\n📅 일정 API 테스트")
    print("=" * 50)
    
    endpoints = [
        ("GET", "/api/schedules"),
        ("GET", "/api/personal_schedules/1"),  # 호환성 엔드포인트
    ]
    
    success_count = 0
    for method, endpoint in endpoints:
        if test_endpoint(method, endpoint, expected_status=401):  # 인증 필요로 401 예상
            success_count += 1
    
    print(f"\n📊 일정 API 테스트 결과: {success_count}/{len(endpoints)} 성공")
    return success_count == len(endpoints)

def main():
    """메인 테스트 함수"""
    print("🚀 API 엔드포인트 테스트 시작")
    print(f"⏰ 테스트 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🌐 서버 URL: {BASE_URL}")
    
    # 서버 연결 확인
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        print(f"✅ 서버 연결 성공 (Status: {response.status_code})")
    except requests.exceptions.ConnectionError:
        print("❌ 서버에 연결할 수 없습니다.")
        print("   서버를 먼저 실행해주세요: python app.py")
        sys.exit(1)
    except Exception as e:
        print(f"❌ 서버 연결 오류: {str(e)}")
        sys.exit(1)
    
    # 테스트 실행
    test_results = []
    
    test_results.append(("헬스체크", test_health_check()))
    test_results.append(("사용자 API", test_user_apis()))
    test_results.append(("파티 API", test_party_apis()))
    test_results.append(("인증 API", test_auth_apis()))
    test_results.append(("일정 API", test_schedule_apis()))
    
    # 결과 요약
    print("\n" + "=" * 60)
    print("📋 테스트 결과 요약")
    print("=" * 60)
    
    total_tests = len(test_results)
    passed_tests = sum(1 for _, result in test_results if result)
    
    for test_name, result in test_results:
        status_icon = "✅" if result else "❌"
        print(f"{status_icon} {test_name}")
    
    print(f"\n🎯 전체 결과: {passed_tests}/{total_tests} 테스트 통과")
    
    if passed_tests == total_tests:
        print("🎉 모든 테스트가 성공했습니다!")
        return 0
    else:
        print("⚠️ 일부 테스트가 실패했습니다. 로그를 확인해주세요.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
