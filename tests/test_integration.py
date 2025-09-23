"""
전체 시스템 통합 테스트
모든 채팅 기능을 종합적으로 테스트합니다.
"""

import requests
import json
import time
import threading
from datetime import datetime
import socketio

# 테스트 설정
BASE_URL = 'http://192.168.45.177:5000'
DEV_BASE_URL = f'{BASE_URL}/dev'

class ChatIntegrationTester:
    """채팅 통합 테스트 클래스"""
    
    def __init__(self):
        self.results = {
            'total_tests': 0,
            'passed_tests': 0,
            'failed_tests': 0,
            'test_details': []
        }
        self.sio = None
        self.websocket_connected = False
    
    def log_test(self, test_name, success, message, duration=None):
        """테스트 결과 로깅"""
        self.results['total_tests'] += 1
        if success:
            self.results['passed_tests'] += 1
            status = "✅ PASS"
        else:
            self.results['failed_tests'] += 1
            status = "❌ FAIL"
        
        log_message = f"{status} {test_name}"
        if duration:
            log_message += f" ({duration:.3f}s)"
        log_message += f": {message}"
        
        print(log_message)
        self.results['test_details'].append({
            'test_name': test_name,
            'success': success,
            'message': message,
            'duration': duration,
            'timestamp': datetime.now().isoformat()
        })
    
    def test_api_endpoint(self, method, url, data=None, expected_status=200, test_name=None):
        """API 엔드포인트 테스트"""
        start_time = time.time()
        try:
            if method.upper() == 'GET':
                response = requests.get(url)
            elif method.upper() == 'POST':
                response = requests.post(url, json=data)
            elif method.upper() == 'PUT':
                response = requests.put(url, json=data)
            elif method.upper() == 'DELETE':
                response = requests.delete(url)
            else:
                raise ValueError(f"지원하지 않는 HTTP 메서드: {method}")
            
            duration = time.time() - start_time
            success = response.status_code == expected_status
            
            if not test_name:
                test_name = f"{method} {url}"
            
            self.log_test(
                test_name,
                success,
                f"Status: {response.status_code}, Expected: {expected_status}",
                duration
            )
            
            return response.json() if response.content else {}
            
        except Exception as e:
            duration = time.time() - start_time
            self.log_test(
                test_name or f"{method} {url}",
                False,
                f"Exception: {str(e)}",
                duration
            )
            return {}
    
    def test_database_schema(self):
        """데이터베이스 스키마 테스트"""
        print("\n=== 데이터베이스 스키마 테스트 ===")
        
        # 기본 채팅 API 테스트
        self.test_api_endpoint(
            'GET', f'{DEV_BASE_URL}/chats/1',
            test_name="채팅 목록 조회"
        )
        
        # 메시지 조회 테스트
        self.test_api_endpoint(
            'GET', f'{DEV_BASE_URL}/chat/messages/custom/1641',
            test_name="메시지 조회"
        )
    
    def test_chat_apis(self):
        """채팅 API 테스트"""
        print("\n=== 채팅 API 테스트 ===")
        
        # 메시지 전송 테스트
        message_data = {
            'chat_type': 'custom',
            'chat_id': 1641,
            'sender_id': '1',
            'content': '통합 테스트 메시지입니다! 🚀',
            'message_type': 'text'
        }
        
        response = self.test_api_endpoint(
            'POST', f'{DEV_BASE_URL}/chat/send',
            data=message_data,
            test_name="메시지 전송"
        )
        
        if response.get('success'):
            message_id = response.get('message_id')
            
            # 메시지 읽음 처리 테스트
            self.test_api_endpoint(
                'POST', f'{DEV_BASE_URL}/chat/messages/{message_id}/read',
                data={'user_id': '1'},
                test_name="메시지 읽음 처리"
            )
            
            # 메시지 반응 테스트
            self.test_api_endpoint(
                'POST', f'{DEV_BASE_URL}/chat/messages/{message_id}/reaction',
                data={
                    'user_id': '1',
                    'reaction_type': 'like'
                },
                test_name="메시지 반응 추가"
            )
            
            # 메시지 수정 테스트
            self.test_api_endpoint(
                'PUT', f'{DEV_BASE_URL}/chat/messages/{message_id}',
                data={
                    'user_id': '1',
                    'content': '수정된 통합 테스트 메시지입니다! ✏️'
                },
                test_name="메시지 수정"
            )
    
    def test_file_management(self):
        """파일 관리 시스템 테스트"""
        print("\n=== 파일 관리 시스템 테스트 ===")
        
        # 저장소 정보 조회
        self.test_api_endpoint(
            'GET', f'{DEV_BASE_URL}/files/storage/info',
            test_name="저장소 정보 조회"
        )
        
        # 파일 정리
        self.test_api_endpoint(
            'POST', f'{DEV_BASE_URL}/files/cleanup',
            data={'max_age_hours': 1},
            test_name="파일 정리"
        )
    
    def test_notification_system(self):
        """알림 시스템 테스트"""
        print("\n=== 알림 시스템 테스트 ===")
        
        # 알림 타입 조회
        self.test_api_endpoint(
            'GET', f'{DEV_BASE_URL}/notifications/types',
            test_name="알림 타입 조회"
        )
        
        # 테스트 알림 전송
        notification_data = {
            'user_id': '1',
            'notification_type': 'system',
            'title': '통합 테스트 알림',
            'message': '이것은 통합 테스트용 알림입니다! 🔔',
            'chat_type': 'test',
            'chat_id': 1
        }
        
        response = self.test_api_endpoint(
            'POST', f'{DEV_BASE_URL}/notifications/send',
            data=notification_data,
            test_name="알림 전송"
        )
        
        if response.get('success'):
            # 사용자 알림 목록 조회
            self.test_api_endpoint(
                'GET', f'{DEV_BASE_URL}/notifications/user/1?limit=10',
                test_name="사용자 알림 목록 조회"
            )
            
            # 읽지 않은 알림 수 조회
            self.test_api_endpoint(
                'GET', f'{DEV_BASE_URL}/notifications/user/1/unread-count',
                test_name="읽지 않은 알림 수 조회"
            )
            
            # 알림 설정 조회
            self.test_api_endpoint(
                'GET', f'{DEV_BASE_URL}/notifications/settings/1',
                test_name="알림 설정 조회"
            )
    
    def test_optimized_apis(self):
        """최적화된 API 테스트"""
        print("\n=== 최적화된 API 테스트 ===")
        
        # 최적화된 메시지 조회
        self.test_api_endpoint(
            'GET', f'{BASE_URL}/api/optimized/chat/messages/custom/1641?limit=20',
            test_name="최적화된 메시지 조회"
        )
        
        # 최적화된 읽지 않은 메시지 수 조회
        self.test_api_endpoint(
            'GET', f'{BASE_URL}/api/optimized/chat/unread-count/1?chat_type=custom&chat_id=1641',
            test_name="최적화된 읽지 않은 메시지 수 조회"
        )
        
        # 최적화된 채팅방 목록 조회
        self.test_api_endpoint(
            'GET', f'{BASE_URL}/api/optimized/chat/rooms/1?limit=10',
            test_name="최적화된 채팅방 목록 조회"
        )
        
        # 메시지 검색
        self.test_api_endpoint(
            'GET', f'{BASE_URL}/api/optimized/chat/search?q=테스트&user_id=1&limit=10',
            test_name="메시지 검색"
        )
        
        # 성능 통계 조회
        self.test_api_endpoint(
            'GET', f'{BASE_URL}/api/optimized/chat/performance/stats?hours=1',
            test_name="성능 통계 조회"
        )
    
    def test_websocket_connection(self):
        """WebSocket 연결 테스트"""
        print("\n=== WebSocket 연결 테스트 ===")
        
        try:
            self.sio = socketio.Client()
            
            @self.sio.on('connect')
            def on_connect():
                self.websocket_connected = True
                self.log_test(
                    "WebSocket 연결",
                    True,
                    "WebSocket 서버에 성공적으로 연결되었습니다."
                )
            
            @self.sio.on('disconnect')
            def on_disconnect():
                self.websocket_connected = False
                self.log_test(
                    "WebSocket 연결 해제",
                    True,
                    "WebSocket 연결이 해제되었습니다."
                )
            
            @self.sio.on('new_message')
            def on_new_message(data):
                self.log_test(
                    "WebSocket 메시지 수신",
                    True,
                    f"새 메시지 수신: {data.get('message', '')[:50]}..."
                )
            
            # WebSocket 연결 시도
            start_time = time.time()
            self.sio.connect(BASE_URL)
            duration = time.time() - start_time
            
            if self.websocket_connected:
                # 테스트 메시지 전송
                test_data = {
                    'chat_type': 'custom',
                    'chat_id': 1641,
                    'user_id': '1',
                    'user_nickname': '테스터',
                    'message': 'WebSocket 테스트 메시지입니다!'
                }
                
                self.sio.emit('send_message', test_data)
                time.sleep(1)  # 메시지 처리 대기
                
                # 타이핑 상태 테스트
                typing_data = {
                    'chat_type': 'custom',
                    'chat_id': 1641,
                    'user_id': '1',
                    'user_nickname': '테스터'
                }
                
                self.sio.emit('typing_start', typing_data)
                time.sleep(0.5)
                self.sio.emit('typing_stop', typing_data)
                time.sleep(0.5)
                
                # 연결 해제
                self.sio.disconnect()
                time.sleep(1)
                
                self.log_test(
                    "WebSocket 전체 테스트",
                    True,
                    "WebSocket 연결, 메시지 전송, 타이핑 상태 테스트 완료",
                    duration
                )
            else:
                self.log_test(
                    "WebSocket 연결",
                    False,
                    "WebSocket 서버에 연결할 수 없습니다.",
                    duration
                )
                
        except Exception as e:
            self.log_test(
                "WebSocket 연결",
                False,
                f"WebSocket 연결 중 오류 발생: {str(e)}"
            )
    
    def test_performance(self):
        """성능 테스트"""
        print("\n=== 성능 테스트 ===")
        
        # 동시 요청 테스트
        def make_request():
            try:
                response = requests.get(f'{DEV_BASE_URL}/chats/1')
                return response.status_code == 200
            except:
                return False
        
        # 10개의 동시 요청
        start_time = time.time()
        threads = []
        results = []
        
        for i in range(10):
            thread = threading.Thread(target=lambda: results.append(make_request()))
            threads.append(thread)
            thread.start()
        
        for thread in threads:
            thread.join()
        
        duration = time.time() - start_time
        success_count = sum(results)
        
        self.log_test(
            "동시 요청 테스트",
            success_count >= 8,  # 80% 이상 성공
            f"10개 요청 중 {success_count}개 성공, 소요시간: {duration:.3f}초",
            duration
        )
        
        # 응답 시간 테스트
        start_time = time.time()
        response = requests.get(f'{DEV_BASE_URL}/chats/1')
        duration = time.time() - start_time
        
        self.log_test(
            "응답 시간 테스트",
            duration < 2.0,  # 2초 미만
            f"응답 시간: {duration:.3f}초",
            duration
        )
    
    def run_all_tests(self):
        """모든 테스트 실행"""
        print("🚀 채팅 시스템 통합 테스트 시작")
        print("=" * 50)
        
        start_time = time.time()
        
        # 각 테스트 실행
        self.test_database_schema()
        self.test_chat_apis()
        self.test_file_management()
        self.test_notification_system()
        self.test_optimized_apis()
        self.test_websocket_connection()
        self.test_performance()
        
        total_duration = time.time() - start_time
        
        # 결과 출력
        print("\n" + "=" * 50)
        print("📊 테스트 결과 요약")
        print("=" * 50)
        print(f"총 테스트 수: {self.results['total_tests']}")
        print(f"성공한 테스트: {self.results['passed_tests']}")
        print(f"실패한 테스트: {self.results['failed_tests']}")
        print(f"성공률: {(self.results['passed_tests'] / self.results['total_tests'] * 100):.1f}%")
        print(f"총 소요 시간: {total_duration:.3f}초")
        
        if self.results['failed_tests'] == 0:
            print("\n🎉 모든 테스트가 성공적으로 완료되었습니다!")
        else:
            print(f"\n⚠️ {self.results['failed_tests']}개의 테스트가 실패했습니다.")
        
        # 상세 결과 저장
        with open('test_results.json', 'w', encoding='utf-8') as f:
            json.dump(self.results, f, ensure_ascii=False, indent=2)
        
        print(f"\n📄 상세 결과가 'test_results.json'에 저장되었습니다.")
        
        return self.results

if __name__ == "__main__":
    tester = ChatIntegrationTester()
    results = tester.run_all_tests()
