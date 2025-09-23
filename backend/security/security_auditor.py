"""
보안 감사 및 취약점 스캔 시스템
SQL 인젝션, XSS, CSRF 등 주요 보안 위협 감지 및 방어
"""
import logging
import re
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from flask import request, current_app, g
from sqlalchemy import text
import hashlib
import secrets

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SecurityAuditor:
    """보안 감사 시스템"""
    
    def __init__(self, app, db):
        self.app = app
        self.db = db
        self.security_events = []
        self.threat_patterns = self._load_threat_patterns()
        self.rate_limit_store = {}
        
        # 보안 설정
        self.security_config = {
            'max_login_attempts': 5,
            'lockout_duration': 300,  # 5분
            'session_timeout': 3600,  # 1시간
            'password_min_length': 8,
            'require_special_chars': True,
            'max_request_size': 10 * 1024 * 1024  # 10MB
        }
    
    def _load_threat_patterns(self) -> Dict[str, List[str]]:
        """위협 패턴 로드"""
        return {
            'sql_injection': [
                r"(\b(union|select|insert|update|delete|drop|create|alter)\b)",
                r"(\b(or|and)\b\s+\d+\s*[=<>])",
                r"(--|#|/\*|\*/)",
                r"(\bxp_|sp_|exec\b)",
                r"(\bwaitfor\b)",
                r"(\bdelay\b)"
            ],
            'xss': [
                r"(<script[^>]*>.*?</script>)",
                r"(javascript:)",
                r"(on\w+\s*=)",
                r"(<iframe[^>]*>)",
                r"(<object[^>]*>)",
                r"(<embed[^>]*>)"
            ],
            'csrf': [
                r"(<img[^>]*src\s*=\s*['\"]?[^'\"]*csrf[^'\"]*['\"]?)",
                r"(<form[^>]*action\s*=\s*['\"]?[^'\"]*csrf[^'\"]*['\"]?)"
            ],
            'path_traversal': [
                r"(\.\./|\.\.\\)",
                r"(/etc/passwd|/etc/shadow)",
                r"(c:\\windows\\system32)",
                r"(%2e%2e%2f|%2e%2e%5c)"
            ],
            'command_injection': [
                r"(\b(cmd|powershell|bash|sh)\s+[^a-zA-Z0-9\s])",
                r"(\|\s*[^a-zA-Z0-9\s]|\&\s*[^a-zA-Z0-9\s])",
                r"(`[^`]*`)",
                r"(\$\{[^}]*\})",
                r"(\b(net|ipconfig|whoami|dir|ls)\s+[^a-zA-Z0-9\s])"
            ]
        }
    
    def setup_security_middleware(self):
        """보안 미들웨어 설정"""
        
        @self.app.before_request
        def security_check():
            """요청 전 보안 검사"""
            g.security_start_time = datetime.now()
            
            # 개발 환경에서는 보안 검사 완전히 건너뛰기
            if current_app.config.get('ENV') == 'development' or current_app.debug:
                return None
            
            # 요청 크기 검사
            if request.content_length and request.content_length > self.security_config['max_request_size']:
                self._log_security_event('request_size_limit_exceeded', {
                    'size': request.content_length,
                    'limit': self.security_config['max_request_size']
                })
                return {'error': '요청 크기가 제한을 초과했습니다.'}, 413
            
            # 개발용 API는 보안 검사 건너뛰기
            if not request.path.startswith('/dev/'):
                # 위협 패턴 검사
                threat_detected = self._scan_request_for_threats(request)
                if threat_detected:
                    self._log_security_event('threat_detected', {
                        'threat_type': threat_detected['type'],
                        'pattern': threat_detected['pattern'],
                        'ip': request.remote_addr
                    })
                    return {'error': '보안 위협이 감지되었습니다.'}, 403
            
            # Rate limiting 검사
            if not self._check_rate_limit(request):
                self._log_security_event('rate_limit_exceeded', {
                    'ip': request.remote_addr,
                    'endpoint': request.endpoint
                })
                return {'error': '요청 빈도가 제한을 초과했습니다.'}, 429
        
        @self.app.after_request
        def security_logging(response):
            """응답 후 보안 로깅"""
            if hasattr(g, 'security_start_time'):
                duration = (datetime.now() - g.security_start_time).total_seconds()
                
                # 느린 요청 감지
                if duration > 5.0:  # 5초 이상
                    self._log_security_event('slow_request', {
                        'endpoint': request.endpoint,
                        'duration': duration,
                        'ip': request.remote_addr
                    })
                
                # 에러 응답 감지
                if response.status_code >= 400:
                    self._log_security_event('error_response', {
                        'endpoint': request.endpoint,
                        'status_code': response.status_code,
                        'ip': request.remote_addr
                    })
            
            return response
    
    def _scan_request_for_threats(self, request) -> Optional[Dict[str, Any]]:
        """요청에서 위협 패턴 스캔"""
        # 개발 환경에서는 보안 검사 건너뛰기
        if self.app.config.get('DEBUG', False):
            return None
        
        # 허용된 경로들은 보안 검사 건너뛰기
        allowed_paths = ['/health', '/api/auth/magic-link', '/api/auth/verify']
        if any(request.path.startswith(path) for path in allowed_paths):
            return None
            
        # 요청 URL 검사 (더 정교한 검사)
        url = request.url.lower()
        for threat_type, patterns in self.threat_patterns.items():
            for pattern in patterns:
                if re.search(pattern, url, re.IGNORECASE):
                    # False positive 필터링
                    if self._is_false_positive(url, threat_type, pattern):
                        continue
                    return {
                        'type': threat_type,
                        'pattern': pattern,
                        'url': url
                    }
        
        # 요청 데이터 검사 (JSON만)
        if request.is_json and request.get_json():
            data = request.get_json()
            threat = self._scan_json_for_threats(data)
            if threat and not self._is_false_positive(str(data), threat['type'], threat['pattern']):
                return threat
        
        return None
    
    def _is_false_positive(self, content: str, threat_type: str, pattern: str) -> bool:
        """False positive 필터링"""
        # 일반적인 false positive 패턴들
        false_positive_patterns = {
            'command_injection': [
                r'chat_type=custom&chat_id=\d+',  # 채팅 ID 파라미터
                r'user_id=\d+',  # 사용자 ID 파라미터
                r'limit=\d+',  # 페이지네이션 파라미터
                r'start_date=\d{4}-\d{2}-\d{2}',  # 날짜 파라미터
                r'end_date=\d{4}-\d{2}-\d{2}',  # 날짜 파라미터
                r'q=테스트',  # 검색 쿼리
                r'category=한식',  # 카테고리 파라미터
                r'area=강남구',  # 지역 파라미터
            ],
            'sql_injection': [
                r'employee_id=EMP\d+',  # 직원 ID
                r'party_id=\d+',  # 파티 ID
                r'restaurant_id=\d+',  # 식당 ID
            ],
            'xss': [
                r'nickname=[가-힣]+',  # 한글 닉네임
                r'title=[가-힣\s]+',  # 한글 제목
            ]
        }
        
        # 해당 위협 타입의 false positive 패턴 확인
        if threat_type in false_positive_patterns:
            for fp_pattern in false_positive_patterns[threat_type]:
                if re.search(fp_pattern, content, re.IGNORECASE):
                    return True
        
        # 일반적인 안전한 패턴들
        safe_patterns = [
            r'^[a-zA-Z0-9가-힣\s\-_\.]+$',  # 안전한 문자열
            r'^\d+$',  # 숫자만
            r'^\d{4}-\d{2}-\d{2}$',  # 날짜 형식
            r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',  # 이메일 형식
        ]
        
        for safe_pattern in safe_patterns:
            if re.match(safe_pattern, content.strip()):
                return True
        
        return False
    
    def _check_threat_patterns(self, value: str, context: str) -> Optional[Dict[str, str]]:
        """특정 값에서 위협 패턴 검사"""
        if not isinstance(value, str):
            return None
        
        for threat_type, patterns in self.threat_patterns.items():
            for pattern in patterns:
                if re.search(pattern, value, re.IGNORECASE):
                    return {
                        'type': threat_type,
                        'pattern': pattern,
                        'context': context,
                        'value': value[:100]  # 값의 처음 100자만
                    }
        
        return None
    
    def _scan_json_for_threats(self, data: Any, path: str = '') -> Optional[Dict[str, str]]:
        """JSON 데이터에서 위협 패턴 재귀적 스캔"""
        if isinstance(data, dict):
            for key, value in data.items():
                current_path = f"{path}.{key}" if path else key
                threat = self._scan_json_for_threats(value, current_path)
                if threat:
                    return threat
        elif isinstance(data, list):
            for i, value in enumerate(data):
                current_path = f"{path}[{i}]"
                threat = self._scan_json_for_threats(value, current_path)
                if threat:
                    return threat
        elif isinstance(data, str):
            threat = self._check_threat_patterns(data, f'JSON: {path}')
            if threat:
                return threat
        
        return None
    
    def _check_rate_limit(self, request) -> bool:
        """Rate limiting 검사"""
        try:
            client_ip = request.remote_addr
            endpoint = request.endpoint
            current_time = datetime.now()
            
            # 클라이언트별 요청 기록
            if client_ip not in self.rate_limit_store:
                self.rate_limit_store[client_ip] = {}
            
            if endpoint not in self.rate_limit_store[client_ip]:
                self.rate_limit_store[client_ip][endpoint] = []
            
            # 오래된 요청 기록 제거 (1분 이전)
            cutoff_time = current_time - timedelta(minutes=1)
            self.rate_limit_store[client_ip][endpoint] = [
                req_time for req_time in self.rate_limit_store[client_ip][endpoint]
                if req_time > cutoff_time
            ]
            
            # 현재 요청 추가
            self.rate_limit_store[client_ip][endpoint].append(current_time)
            
            # Rate limit 검사 (분당 최대 60회)
            if len(self.rate_limit_store[client_ip][endpoint]) > 60:
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Rate limiting 검사 실패: {e}")
            return True  # 오류 시 허용
    
    def _log_security_event(self, event_type: str, details: Dict[str, Any]):
        """보안 이벤트 로깅"""
        try:
            event = {
                'timestamp': datetime.now().isoformat(),
                'event_type': event_type,
                'ip_address': request.remote_addr,
                'user_agent': request.headers.get('User-Agent', 'Unknown'),
                'endpoint': request.endpoint,
                'method': request.method,
                'url': request.url,
                'details': details
            }
            
            self.security_events.append(event)
            
            # 로그 파일에 기록
            logger.warning(f"[ALERT] 보안 이벤트: {event_type} - {details}")
            
            # 데이터베이스에 저장 (선택사항)
            self._save_security_event_to_db(event)
            
        except Exception as e:
            logger.error(f"❌ 보안 이벤트 로깅 실패: {e}")
    
    def _save_security_event_to_db(self, event: Dict[str, Any]):
        """보안 이벤트를 데이터베이스에 저장"""
        try:
            # 보안 이벤트 테이블이 있는지 확인하고 저장
            # 실제 구현에서는 데이터베이스 스키마에 맞게 수정 필요
            pass
        except Exception as e:
            logger.debug(f"보안 이벤트 DB 저장 스킵: {e}")
    
    def get_security_report(self) -> Dict[str, Any]:
        """보안 보고서 생성"""
        try:
            current_time = datetime.now()
            recent_events = [
                event for event in self.security_events
                if datetime.fromisoformat(event['timestamp']) > current_time - timedelta(hours=24)
            ]
            
            # 위협 타입별 통계
            threat_stats = {}
            for event in recent_events:
                event_type = event['event_type']
                threat_stats[event_type] = threat_stats.get(event_type, 0) + 1
            
            # IP별 위협 통계
            ip_threats = {}
            for event in recent_events:
                ip = event['ip_address']
                if ip not in ip_threats:
                    ip_threats[ip] = {'count': 0, 'types': set()}
                ip_threats[ip]['count'] += 1
                ip_threats[ip]['types'].add(event['event_type'])
            
            # IP별 위협 타입을 리스트로 변환
            for ip in ip_threats:
                ip_threats[ip]['types'] = list(ip_threats[ip]['types'])
            
            report = {
                'timestamp': current_time.isoformat(),
                'total_events_24h': len(recent_events),
                'threat_statistics': threat_stats,
                'ip_threats': ip_threats,
                'recent_events': recent_events[-10:],  # 최근 10개 이벤트
                'security_config': self.security_config
            }
            
            return report
            
        except Exception as e:
            logger.error(f"❌ 보안 보고서 생성 실패: {e}")
            return {'error': str(e)}
    
    def validate_password_strength(self, password: str) -> Dict[str, Any]:
        """비밀번호 강도 검증"""
        try:
            validation_result = {
                'is_valid': True,
                'score': 0,
                'issues': [],
                'recommendations': []
            }
            
            # 길이 검사
            if len(password) < self.security_config['password_min_length']:
                validation_result['is_valid'] = False
                validation_result['issues'].append(f"비밀번호는 최소 {self.security_config['password_min_length']}자 이상이어야 합니다.")
            
            # 특수문자 포함 검사
            if self.security_config['require_special_chars']:
                if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
                    validation_result['is_valid'] = False
                    validation_result['issues'].append("특수문자를 포함해야 합니다.")
            
            # 대문자 포함 검사
            if not re.search(r'[A-Z]', password):
                validation_result['issues'].append("대문자를 포함하는 것을 권장합니다.")
            
            # 소문자 포함 검사
            if not re.search(r'[a-z]', password):
                validation_result['issues'].append("소문자를 포함하는 것을 권장합니다.")
            
            # 숫자 포함 검사
            if not re.search(r'\d', password):
                validation_result['issues'].append("숫자를 포함하는 것을 권장합니다.")
            
            # 점수 계산
            validation_result['score'] = min(100, len(password) * 2 + 
                                          (10 if re.search(r'[!@#$%^&*(),.?":{}|<>]', password) else 0) +
                                          (10 if re.search(r'[A-Z]', password) else 0) +
                                          (10 if re.search(r'[a-z]', password) else 0) +
                                          (10 if re.search(r'\d', password) else 0))
            
            # 권장사항 생성
            if validation_result['score'] < 50:
                validation_result['recommendations'].append("비밀번호를 더 복잡하게 만드세요.")
            elif validation_result['score'] < 80:
                validation_result['recommendations'].append("비밀번호 강도를 더 높이세요.")
            else:
                validation_result['recommendations'].append("강력한 비밀번호입니다!")
            
            return validation_result
            
        except Exception as e:
            logger.error(f"❌ 비밀번호 강도 검증 실패: {e}")
            return {'error': str(e)}
    
    def generate_csrf_token(self) -> str:
        """CSRF 토큰 생성"""
        try:
            token = secrets.token_urlsafe(32)
            return token
        except Exception as e:
            logger.error(f"❌ CSRF 토큰 생성 실패: {e}")
            return hashlib.sha256(f"{datetime.now().isoformat()}{secrets.randbelow(1000)}".encode()).hexdigest()
    
    def validate_csrf_token(self, token: str, stored_token: str) -> bool:
        """CSRF 토큰 검증"""
        try:
            return token == stored_token
        except Exception as e:
            logger.error(f"❌ CSRF 토큰 검증 실패: {e}")
            return False

# 개발 환경에서 테스트용 함수
if __name__ == '__main__':
    print("🧪 보안 감사 시스템 테스트")
    
    # Mock 객체로 테스트
    class MockApp:
        pass
    
    class MockDB:
        pass
    
    # 테스트 실행
    mock_app = MockApp()
    mock_db = MockDB()
    
    security_auditor = SecurityAuditor(mock_app, mock_db)
    
    # 위협 패턴 테스트
    test_inputs = [
        "'; DROP TABLE users; --",
        "<script>alert('XSS')</script>",
        "../../../etc/passwd",
        "admin' OR '1'='1"
    ]
    
    for test_input in test_inputs:
        threat = security_auditor._check_threat_patterns(test_input, 'test')
        if threat:
            print(f"[ALERT] 위협 감지: {threat['type']} - {test_input}")
        else:
            print(f"✅ 안전: {test_input}")
    
    # 비밀번호 강도 테스트
    password_result = security_auditor.validate_password_strength("Weak123!")
    print(f"비밀번호 검증 결과: {password_result}")
    
    # CSRF 토큰 테스트
    csrf_token = security_auditor.generate_csrf_token()
    print(f"CSRF 토큰: {csrf_token}")
    
    # 보안 보고서 테스트
    security_report = security_auditor.get_security_report()
    print(f"보안 보고서: {security_report}")
