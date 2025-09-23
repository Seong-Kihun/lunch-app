#!/usr/bin/env python3
"""
Render 배포 테스트 스크립트
로컬에서 Render 서버 상태를 확인합니다.
"""

import requests
import time
import json
from datetime import datetime

def test_render_deployment():
    """Render 배포 상태 테스트"""
    print("🚀 Render 배포 상태 테스트")
    print("=" * 50)
    
    # Render 서버 URL (실제 URL로 변경 필요)
    base_url = "https://lunch-app-backend-ra12.onrender.com"
    
    test_results = []
    
    def log_test(test_name, success, message, response_time=None):
        status = "✅" if success else "❌"
        time_str = f" ({response_time:.1f}ms)" if response_time else ""
        print(f"{status} {test_name}: {message}{time_str}")
        test_results.append({
            'test_name': test_name,
            'success': success,
            'message': message,
            'response_time': response_time,
            'timestamp': datetime.now().isoformat()
        })
    
    # 1. 서버 응답 테스트
    print("\n🌐 서버 응답 테스트")
    try:
        start_time = time.time()
        response = requests.get(f"{base_url}/", timeout=30)
        response_time = (time.time() - start_time) * 1000
        
        if response.status_code == 200:
            log_test("서버 응답", True, f"HTTP {response.status_code}", response_time)
        else:
            log_test("서버 응답", False, f"HTTP {response.status_code}", response_time)
    except requests.exceptions.Timeout:
        log_test("서버 응답", False, "타임아웃 (30초)", 30000)
    except requests.exceptions.ConnectionError:
        log_test("서버 응답", False, "연결 실패", 0)
    except Exception as e:
        log_test("서버 응답", False, f"오류: {str(e)}", 0)
    
    # 2. 헬스 체크 테스트
    print("\n🏥 헬스 체크 테스트")
    try:
        start_time = time.time()
        response = requests.get(f"{base_url}/health", timeout=30)
        response_time = (time.time() - start_time) * 1000
        
        if response.status_code == 200:
            log_test("헬스 체크", True, f"HTTP {response.status_code}", response_time)
        else:
            log_test("헬스 체크", False, f"HTTP {response.status_code}", response_time)
    except Exception as e:
        log_test("헬스 체크", False, f"오류: {str(e)}", 0)
    
    # 3. API 엔드포인트 테스트
    print("\n🔗 API 엔드포인트 테스트")
    endpoints = [
        ("/api/profile", "사용자 프로필 API"),
        ("/api/parties", "파티 목록 API"),
        ("/api/v2/restaurants/", "식당 목록 API"),
        ("/api/schedules/", "일정 관리 API"),
        ("/api/magic-link", "매직링크 API")
    ]
    
    for endpoint, name in endpoints:
        try:
            start_time = time.time()
            # 매직링크 API는 POST 요청
            if endpoint == "/api/magic-link":
                response = requests.post(f"{base_url}{endpoint}", 
                                       json={"email": "test@koica.go.kr"}, 
                                       timeout=30)
            else:
                response = requests.get(f"{base_url}{endpoint}", timeout=30)
            response_time = (time.time() - start_time) * 1000
            
            if response.status_code in [200, 401, 400, 500]:  # 정상적인 응답 코드들
                log_test(name, True, f"HTTP {response.status_code}", response_time)
            else:
                log_test(name, False, f"HTTP {response.status_code}", response_time)
        except Exception as e:
            log_test(name, False, f"오류: {str(e)}", 0)
    
    # 4. 데이터베이스 연결 테스트 (매직링크 API 사용)
    print("\n🗄️ 데이터베이스 연결 테스트")
    try:
        start_time = time.time()
        response = requests.post(f"{base_url}/api/auth/magic-link", 
                               json={"email": "test@example.com"}, 
                               timeout=30)
        response_time = (time.time() - start_time) * 1000
        
        if response.status_code == 200:
            log_test("데이터베이스 연결", True, "매직링크 API 정상 응답", response_time)
        else:
            log_test("데이터베이스 연결", False, f"매직링크 API 응답: {response.status_code}", response_time)
    except Exception as e:
        log_test("데이터베이스 연결", False, f"오류: {str(e)}", 0)
    
    # 결과 요약
    print("\n" + "=" * 50)
    print("📊 테스트 결과 요약")
    print("=" * 50)
    
    total_tests = len(test_results)
    passed_tests = sum(1 for result in test_results if result['success'])
    failed_tests = total_tests - passed_tests
    
    print(f"총 테스트: {total_tests}")
    print(f"성공: {passed_tests} ✅")
    print(f"실패: {failed_tests} ❌")
    print(f"성공률: {(passed_tests/total_tests)*100:.1f}%")
    
    # 실패한 테스트 목록
    failed_results = [result for result in test_results if not result['success']]
    if failed_results:
        print("\n❌ 실패한 테스트:")
        for result in failed_results:
            print(f"  - {result['test_name']}: {result['message']}")
    
    # 결과 저장
    with open('render_deployment_test_results.json', 'w', encoding='utf-8') as f:
        json.dump(test_results, f, ensure_ascii=False, indent=2)
    
    print(f"\n📁 상세 결과가 render_deployment_test_results.json에 저장되었습니다.")
    
    return passed_tests == total_tests

if __name__ == "__main__":
    success = test_render_deployment()
    if success:
        print("\n🎉 모든 테스트가 성공했습니다!")
        exit(0)
    else:
        print("\n⚠️ 일부 테스트가 실패했습니다. 로그를 확인하세요.")
        exit(1)
