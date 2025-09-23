# 🚀 개발자 가이드

밥플떼기 앱 개발을 위한 종합 가이드입니다.

## 📋 목차
- [빠른 시작](#빠른-시작)
- [개발 도구](#개발-도구)
- [모니터링](#모니터링)
- [문제 해결](#문제-해결)

## 🚀 빠른 시작

### 1. 환경 설정
```bash
# 1. 환경변수 설정
cp .env.template .env
# .env 파일을 열어서 필요한 값들 수정

# 2. 가상환경 활성화
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

# 3. 의존성 설치
pip install -r requirements.txt
```

### 2. 서버 실행
```bash
# 백엔드 서버 시작
python app.py

# 프론트엔드 시작 (새 터미널)
cd lunch_app_frontend
npm start
```

### 3. 확인
- 백엔드: http://localhost:5000
- 프론트엔드: Expo 앱에서 확인
- 헬스체크: http://localhost:5000/health

## 🔧 개발 도구

### 📊 로깅 시스템
```python
from utils.logger import logger, time_it

# 기본 로깅
logger.info("사용자 로그인", user_id="123", action="login")

# 성능 측정
with time_it("데이터베이스 쿼리"):
    result = db.query(User).all()

# API 호출 로깅 (데코레이터)
@log_api_call
def my_api_endpoint():
    return jsonify({"status": "success"})
```

### 📈 에러 모니터링
```python
from utils.error_monitor import record_error, monitor_errors

# 에러 기록
try:
    risky_operation()
except Exception as e:
    record_error(e, severity='high', context={'user_id': '123'})

# 에러 모니터링 데코레이터
@monitor_errors(severity='medium')
def my_function():
    # 함수 내용
    pass
```

### 🔍 모니터링 API
```bash
# 에러 통계
curl http://localhost:5000/api/monitoring/errors/stats

# 최근 에러 목록
curl http://localhost:5000/api/monitoring/errors/recent

# 에러 대시보드
curl http://localhost:5000/api/monitoring/errors/dashboard

# 헬스체크
curl http://localhost:5000/health
```

## 📊 모니터링

### 로그 파일 위치
```
logs/
├── app.log          # 전체 앱 로그 (JSON 형식)
├── error.log        # 에러 전용 로그
└── errors.json      # 에러 이벤트 데이터
```

### 로그 레벨 설정
```bash
# .env 파일에서 설정
LOG_LEVEL=DEBUG      # 개발용
LOG_LEVEL=INFO       # 프로덕션용
```

### 실시간 로그 모니터링
```bash
# 앱 로그 실시간 확인
tail -f logs/app.log

# 에러 로그만 확인
tail -f logs/error.log

# 특정 키워드 필터링
tail -f logs/app.log | grep -i "error"
```

## 🔴 Redis 설정 (선택사항)

### 빠른 설치
```bash
# Docker 사용 (권장)
docker run -d -p 6379:6379 --name redis redis:alpine

# 또는 Chocolatey (Windows)
choco install redis-64
```

### Redis 없이 개발
```bash
# .env 파일에 추가
OFFLINE_MODE=true
```

자세한 내용은 [REDIS_SETUP_GUIDE.md](REDIS_SETUP_GUIDE.md) 참조

## 🐛 문제 해결

### 일반적인 문제들

#### 1. 순환 import 에러
```
❌ 일정 관리 Blueprint 등록 실패: cannot import name 'schedules_bp'
```
**해결**: 이미 해결됨. 지연 import 사용

#### 2. SQLAlchemy 인스턴스 에러
```
⚠️ 인증 시스템 초기화 실패: The current Flask app is not registered
```
**해결**: 이미 해결됨. 단일 db 인스턴스 사용

#### 3. Redis 연결 실패
```
WARNING:cache_manager:⚠️ Redis 연결 실패
```
**해결**: 
```bash
# .env 파일에 추가
OFFLINE_MODE=true
```

#### 4. 포트 충돌
```
OSError: [Errno 48] Address already in use
```
**해결**:
```bash
# 포트 사용 중인 프로세스 확인
netstat -an | findstr 5000
# 프로세스 종료 후 재시작
```

### 디버깅 도구

#### 1. 에러 모니터링 대시보드
```bash
# 브라우저에서 접속
http://localhost:5000/api/monitoring/errors/dashboard
```

#### 2. 성능 모니터링
```python
from utils.logger import performance_monitor

# 성능 측정
with performance_monitor.time_it("데이터베이스 쿼리"):
    result = expensive_operation()
```

#### 3. API 테스트
```bash
# API 엔드포인트 테스트
curl http://localhost:5000/api/test

# 헬스체크
curl http://localhost:5000/health
```

## 📱 프론트엔드 개발

### 네트워크 설정
```javascript
// 자동 IP 감지 (개발용)
import { getServerURL } from './utils/networkUtils';

const serverURL = await getServerURL();
// 결과: http://192.168.1.100:5000 (자동 감지)
```

### 에러 처리
```javascript
import { handleApiError, withErrorHandling } from './utils/errorHandler';

// API 호출 시 에러 처리
const fetchData = async () => {
    try {
        const response = await fetch(`${serverURL}/api/data`);
        return await response.json();
    } catch (error) {
        handleApiError(error, '데이터 조회', fetchData);
    }
};
```

## 🔧 개발 팁

### 1. 로그 활용
```python
# 개발 중 유용한 로그
logger.debug("변수 값 확인", variable=my_var)
logger.info("사용자 액션", user_id=user.id, action="login")
logger.warning("예상 가능한 문제", issue="low_memory")
```

### 2. 성능 최적화
```python
# 데이터베이스 쿼리 최적화
from utils.logger import time_it

with time_it("복잡한 쿼리"):
    result = db.session.query(User).join(Profile).all()
```

### 3. 에러 추적
```python
# 에러 발생 시 컨텍스트 정보 포함
try:
    process_user_data(user_id)
except Exception as e:
    record_error(e, 
                severity='high',
                context={'user_id': user_id, 'operation': 'data_processing'})
```

## 📚 추가 자료

- [환경 설정 가이드](ENVIRONMENT_SETUP.md)
- [Redis 설치 가이드](REDIS_SETUP_GUIDE.md)
- [API 문서](API_DOCUMENTATION.md) (추후 생성)

## 🆘 도움이 필요한 경우

### 로그 확인
```bash
# 최신 에러 확인
tail -20 logs/error.log

# 특정 시간대 로그 확인
grep "2024-01-15 14:" logs/app.log
```

### 에러 통계 확인
```bash
curl http://localhost:5000/api/monitoring/errors/stats | jq
```

### 성능 문제 진단
```bash
# 메모리 사용량 확인
curl http://localhost:5000/health | jq '.memory'

# API 응답 시간 확인
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:5000/api/test
```

이제 개발 환경이 완벽하게 설정되었습니다! 🎉
