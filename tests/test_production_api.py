"""
프로덕션 환경 API 테스트 스크립트
실제 사용자 시나리오로 API를 테스트합니다.
"""

import requests
import json
import time
from test_data.production_test_users import (
    PRODUCTION_TEST_USERS, 
    TEST_SCENARIOS, 
    get_auth_headers, 
    get_test_user
)

# 테스트 설정
BASE_URL = "http://localhost:5000"  # 로컬 테스트용
# BASE_URL = "https://lunch-app-backend-ra12.onrender.com"  # 프로덕션 테스트용

class ProductionAPITester:
    def __init__(self, base_url=BASE_URL):
        self.base_url = base_url
        self.session = requests.Session()
        self.test_results = []
        
    def log_test(self, test_name, success, message, response_time=None):
        """테스트 결과 로깅"""
        result = {
            "test_name": test_name,
            "success": success,
            "message": message,
            "timestamp": time.time(),
            "response_time": response_time
        }
        self.test_results.append(result)
        
        status = "✅" if success else "❌"
        print(f"{status} {test_name}: {message}")
        if response_time:
            print(f"   응답시간: {response_time:.2f}ms")
    
    def test_authentication_required(self):
        """인증이 필요한 API 테스트"""
        print("\n🔐 인증 필수 API 테스트")
        
        # 인증 없이 API 호출 시도
        test_endpoints = [
            "/api/users/profile",
            "/api/parties/",
            "/api/optimized/chat/rooms/1",
            "/api/v2/restaurants/",
            "/api/schedules/"
        ]
        
        for endpoint in test_endpoints:
            try:
                start_time = time.time()
                response = self.session.get(f"{self.base_url}{endpoint}")
                response_time = (time.time() - start_time) * 1000
                
                if response.status_code == 401:
                    self.log_test(f"인증 필수 - {endpoint}", True, "401 Unauthorized 반환", response_time)
                else:
                    self.log_test(f"인증 필수 - {endpoint}", False, f"예상: 401, 실제: {response.status_code}", response_time)
                    
            except Exception as e:
                self.log_test(f"인증 필수 - {endpoint}", False, f"오류: {str(e)}")
    
    def test_public_endpoints(self):
        """공개 엔드포인트 테스트"""
        print("\n🌐 공개 엔드포인트 테스트")
        
        public_endpoints = [
            "/",
            "/api/auth/magic-link",  # POST 요청이지만 공개
        ]
        
        for endpoint in public_endpoints:
            try:
                start_time = time.time()
                if endpoint == "/api/auth/magic-link":
                    response = self.session.post(
                        f"{self.base_url}{endpoint}",
                        json={"email": "test@koica.go.kr"},
                        headers={"Content-Type": "application/json"}
                    )
                else:
                    response = self.session.get(f"{self.base_url}{endpoint}")
                response_time = (time.time() - start_time) * 1000
                
                if response.status_code in [200, 400]:  # 400도 정상 (잘못된 요청)
                    self.log_test(f"공개 엔드포인트 - {endpoint}", True, f"응답: {response.status_code}", response_time)
                else:
                    self.log_test(f"공개 엔드포인트 - {endpoint}", False, f"예상: 200/400, 실제: {response.status_code}", response_time)
                    
            except Exception as e:
                self.log_test(f"공개 엔드포인트 - {endpoint}", False, f"오류: {str(e)}")
    
    def test_user_scenarios(self):
        """실제 사용자 시나리오 테스트"""
        print("\n👥 사용자 시나리오 테스트")
        
        # 실제 사용자 데이터 사용 (하드코딩된 테스트 사용자 제거)
        # TODO: 실제 프로덕션 환경의 사용자 데이터로 교체 필요
        print("⚠️ 테스트 사용자 데이터가 제거되었습니다. 실제 사용자 인증이 필요합니다.")
        return
        
        # 시나리오 1: 사용자 프로필 조회
        try:
            start_time = time.time()
            response = self.session.get(
                f"{self.base_url}/api/users/profile",
                headers=headers
            )
            response_time = (time.time() - start_time) * 1000
            
            if response.status_code == 200:
                self.log_test("사용자 프로필 조회", True, "프로필 조회 성공", response_time)
            else:
                self.log_test("사용자 프로필 조회", False, f"응답: {response.status_code}", response_time)
                
        except Exception as e:
            self.log_test("사용자 프로필 조회", False, f"오류: {str(e)}")
        
        # 시나리오 2: 식당 목록 조회 (인증 필요)
        try:
            start_time = time.time()
            response = self.session.get(
                f"{self.base_url}/api/v2/restaurants/",
                headers=headers
            )
            response_time = (time.time() - start_time) * 1000
            
            if response.status_code == 200:
                self.log_test("식당 목록 조회", True, "식당 목록 조회 성공", response_time)
            else:
                self.log_test("식당 목록 조회", False, f"응답: {response.status_code}", response_time)
                
        except Exception as e:
            self.log_test("식당 목록 조회", False, f"오류: {str(e)}")
    
    def test_api_performance(self):
        """API 성능 테스트"""
        print("\n⚡ API 성능 테스트")
        
        # 간단한 엔드포인트들의 응답시간 측정
        endpoints = [
            "/",
            "/api/v2/restaurants/",
        ]
        
        for endpoint in endpoints:
            times = []
            for i in range(5):  # 5번 테스트
                try:
                    start_time = time.time()
                    response = self.session.get(f"{self.base_url}{endpoint}")
                    response_time = (time.time() - start_time) * 1000
                    times.append(response_time)
                except Exception as e:
                    self.log_test(f"성능 테스트 - {endpoint}", False, f"오류: {str(e)}")
                    break
            
            if times:
                avg_time = sum(times) / len(times)
                max_time = max(times)
                min_time = min(times)
                
                self.log_test(
                    f"성능 테스트 - {endpoint}", 
                    True, 
                    f"평균: {avg_time:.2f}ms, 최대: {max_time:.2f}ms, 최소: {min_time:.2f}ms"
                )
    
    def run_all_tests(self):
        """모든 테스트 실행"""
        print("🚀 프로덕션 환경 API 테스트 시작")
        print(f"테스트 대상: {self.base_url}")
        print("=" * 50)
        
        # 테스트 실행
        self.test_authentication_required()
        self.test_public_endpoints()
        self.test_user_scenarios()
        self.test_api_performance()
        
        # 결과 요약
        self.print_summary()
    
    def print_summary(self):
        """테스트 결과 요약"""
        print("\n" + "=" * 50)
        print("📊 테스트 결과 요약")
        print("=" * 50)
        
        total_tests = len(self.test_results)
        successful_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - successful_tests
        
        print(f"총 테스트: {total_tests}")
        print(f"성공: {successful_tests} ✅")
        print(f"실패: {failed_tests} ❌")
        print(f"성공률: {(successful_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ 실패한 테스트:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test_name']}: {result['message']}")
        
        # 결과를 파일로 저장
        with open("test_results_production.json", "w", encoding="utf-8") as f:
            json.dump(self.test_results, f, ensure_ascii=False, indent=2)
        print(f"\n📁 상세 결과가 test_results_production.json에 저장되었습니다.")

if __name__ == "__main__":
    # 로컬 테스트
    print("로컬 환경 테스트")
    local_tester = ProductionAPITester("http://localhost:5000")
    local_tester.run_all_tests()
    
    # 프로덕션 테스트 (선택사항)
    # print("\n프로덕션 환경 테스트")
    # prod_tester = ProductionAPITester("https://lunch-app-backend-ra12.onrender.com")
    # prod_tester.run_all_tests()
