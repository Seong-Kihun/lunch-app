#!/usr/bin/env python3
"""
Render 프로덕션 환경 테스트 스크립트
실제 Render 서버에서 API 테스트를 수행합니다.
"""

import requests
import time
import json
from datetime import datetime

class RenderProductionTester:
    def __init__(self, base_url):
        self.base_url = base_url
        self.session = requests.Session()
        self.test_results = []
        
    def log_test(self, test_name, success, message, response_time=None):
        """테스트 결과 로깅"""
        status = "✅" if success else "❌"
        time_str = f" ({response_time:.1f}ms)" if response_time else ""
        print(f"{status} {test_name}: {message}{time_str}")
        
        self.test_results.append({
            'test_name': test_name,
            'success': success,
            'message': message,
            'response_time': response_time,
            'timestamp': datetime.now().isoformat()
        })
    
    def test_health_check(self):
        """헬스 체크 테스트"""
        print("\n🏥 헬스 체크 테스트")
        
        try:
            start_time = time.time()
            response = self.session.get(f"{self.base_url}/health")
            response_time = (time.time() - start_time) * 1000
            
            if response.status_code == 200:
                self.log_test("헬스 체크", True, f"응답: {response.status_code}", response_time)
                return True
            else:
                self.log_test("헬스 체크", False, f"응답: {response.status_code}", response_time)
                return False
                
        except Exception as e:
            self.log_test("헬스 체크", False, f"오류: {str(e)}")
            return False
    
    def test_root_endpoint(self):
        """루트 엔드포인트 테스트"""
        print("\n🌐 루트 엔드포인트 테스트")
        
        try:
            start_time = time.time()
            response = self.session.get(f"{self.base_url}/")
            response_time = (time.time() - start_time) * 1000
            
            if response.status_code == 200:
                self.log_test("루트 엔드포인트", True, f"응답: {response.status_code}", response_time)
                return True
            else:
                self.log_test("루트 엔드포인트", False, f"응답: {response.status_code}", response_time)
                return False
                
        except Exception as e:
            self.log_test("루트 엔드포인트", False, f"오류: {str(e)}")
            return False
    
    def test_api_endpoints(self):
        """API 엔드포인트 테스트"""
        print("\n🔗 API 엔드포인트 테스트")
        
        endpoints = [
            ("/api/users/profile", "사용자 프로필 API"),
            ("/api/parties/", "파티 목록 API"),
            ("/api/v2/restaurants/", "식당 목록 API"),
            ("/api/schedules/", "일정 관리 API"),
            ("/api/auth/magic-link", "매직링크 API")
        ]
        
        results = []
        
        for endpoint, name in endpoints:
            try:
                start_time = time.time()
                response = self.session.get(f"{self.base_url}{endpoint}")
                response_time = (time.time() - start_time) * 1000
                
                if response.status_code in [200, 401, 400]:  # 정상적인 응답 코드들
                    self.log_test(name, True, f"응답: {response.status_code}", response_time)
                    results.append(True)
                else:
                    self.log_test(name, False, f"응답: {response.status_code}", response_time)
                    results.append(False)
                    
            except Exception as e:
                self.log_test(name, False, f"오류: {str(e)}")
                results.append(False)
        
        return all(results)
    
    def test_database_connection(self):
        """데이터베이스 연결 테스트 (간접적)"""
        print("\n🗄️ 데이터베이스 연결 테스트")
        
        try:
            # 매직링크 API를 통해 데이터베이스 연결 테스트
            start_time = time.time()
            response = self.session.post(f"{self.base_url}/api/auth/magic-link", 
                                       json={"email": "test@example.com"})
            response_time = (time.time() - start_time) * 1000
            
            if response.status_code == 200:
                self.log_test("데이터베이스 연결", True, "매직링크 API 정상 응답", response_time)
                return True
            else:
                self.log_test("데이터베이스 연결", False, f"매직링크 API 응답: {response.status_code}", response_time)
                return False
                
        except Exception as e:
            self.log_test("데이터베이스 연결", False, f"오류: {str(e)}")
            return False
    
    def test_performance(self):
        """성능 테스트"""
        print("\n⚡ 성능 테스트")
        
        endpoints = ["/", "/health", "/api/v2/restaurants/"]
        response_times = []
        
        for endpoint in endpoints:
            try:
                start_time = time.time()
                response = self.session.get(f"{self.base_url}{endpoint}")
                response_time = (time.time() - start_time) * 1000
                response_times.append(response_time)
                
            except Exception as e:
                print(f"⚠️ {endpoint} 성능 테스트 실패: {e}")
        
        if response_times:
            avg_time = sum(response_times) / len(response_times)
            max_time = max(response_times)
            min_time = min(response_times)
            
            self.log_test("성능 테스트", True, 
                         f"평균: {avg_time:.1f}ms, 최대: {max_time:.1f}ms, 최소: {min_time:.1f}ms")
            return True
        else:
            self.log_test("성능 테스트", False, "모든 엔드포인트 테스트 실패")
            return False
    
    def run_all_tests(self):
        """모든 테스트 실행"""
        print("🚀 Render 프로덕션 환경 테스트 시작")
        print(f"테스트 대상: {self.base_url}")
        print("=" * 60)
        
        # 테스트 실행
        tests = [
            self.test_health_check,
            self.test_root_endpoint,
            self.test_api_endpoints,
            self.test_database_connection,
            self.test_performance
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            if test():
                passed += 1
        
        # 결과 요약
        print("\n" + "=" * 60)
        print("📊 테스트 결과 요약")
        print("=" * 60)
        print(f"총 테스트: {total}")
        print(f"성공: {passed} ✅")
        print(f"실패: {total - passed} ❌")
        print(f"성공률: {(passed/total)*100:.1f}%")
        
        # 실패한 테스트 목록
        failed_tests = [result for result in self.test_results if not result['success']]
        if failed_tests:
            print("\n❌ 실패한 테스트:")
            for test in failed_tests:
                print(f"  - {test['test_name']}: {test['message']}")
        
        # 결과 저장
        with open('render_test_results.json', 'w', encoding='utf-8') as f:
            json.dump(self.test_results, f, ensure_ascii=False, indent=2)
        
        print(f"\n📁 상세 결과가 render_test_results.json에 저장되었습니다.")
        
        return passed == total

def main():
    """메인 실행 함수"""
    # Render 서버 URL (실제 URL로 변경 필요)
    base_url = "https://lunch-app-backend-ra12.onrender.com"
    
    print("🔍 Render 프로덕션 환경 테스트")
    print("=" * 60)
    print(f"서버 URL: {base_url}")
    print("=" * 60)
    
    tester = RenderProductionTester(base_url)
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 모든 테스트가 성공했습니다!")
        return 0
    else:
        print("\n⚠️ 일부 테스트가 실패했습니다. 로그를 확인하세요.")
        return 1

if __name__ == "__main__":
    import sys
    sys.exit(main())
