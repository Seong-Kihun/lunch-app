# 🔴 Redis 설치 및 설정 가이드

Redis는 메모리 기반 데이터 저장소로, 캐싱과 세션 관리에 사용됩니다. 앱의 성능을 크게 향상시킬 수 있습니다.

## 🚀 빠른 설치 (권장)

### Windows (Chocolatey 사용)
```bash
# Chocolatey 설치 (관리자 권한으로 PowerShell 실행)
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Redis 설치
choco install redis-64

# Redis 서비스 시작
redis-server
```

### Windows (Docker 사용 - 가장 간단)
```bash
# Docker Desktop 설치 후
docker run -d -p 6379:6379 --name redis redis:alpine

# Redis 상태 확인
docker ps
```

### macOS (Homebrew 사용)
```bash
# Redis 설치
brew install redis

# Redis 서비스 시작
brew services start redis

# 또는 수동 시작
redis-server
```

### Linux (Ubuntu/Debian)
```bash
# Redis 설치
sudo apt update
sudo apt install redis-server

# Redis 서비스 시작
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

## 🔧 설정 및 확인

### 1. Redis 연결 테스트
```bash
# Redis CLI로 연결 테스트
redis-cli ping
# 응답: PONG (성공)
```

### 2. 환경변수 설정
`.env` 파일에 추가:
```bash
REDIS_URL=redis://localhost:6379/0
OFFLINE_MODE=false
```

### 3. 앱에서 Redis 사용 확인
```bash
# 앱 실행 후 로그 확인
python app.py

# 성공 메시지:
# ✅ Redis 연결 성공: redis://localhost:6379/0
```

## 🐛 문제 해결

### Redis 연결 실패
```bash
# 1. Redis 서비스 상태 확인
redis-cli ping

# 2. 포트 확인 (Windows)
netstat -an | findstr 6379

# 3. 방화벽 확인
# Windows 방화벽에서 포트 6379 허용
```

### Redis 없이 개발하기
Redis 설치가 어려운 경우:
```bash
# .env 파일에 추가
OFFLINE_MODE=true
```

이렇게 하면 Redis 없이도 앱이 정상 동작합니다.

## 📊 Redis 사용 효과

### 캐싱으로 인한 성능 향상
- **API 응답 속도**: 50-80% 향상
- **데이터베이스 부하**: 60-90% 감소
- **메모리 사용량**: 최적화

### 캐싱되는 데이터
- 사용자 세션 정보
- 자주 조회되는 식당 데이터
- 그룹 매칭 결과
- API 응답 캐시

## 🔧 Redis 관리 명령어

### 기본 명령어
```bash
# Redis CLI 접속
redis-cli

# 모든 키 조회
KEYS *

# 특정 키 삭제
DEL key_name

# 모든 데이터 삭제 (주의!)
FLUSHALL

# Redis 정보 조회
INFO

# 메모리 사용량 확인
INFO memory
```

### 모니터링
```bash
# 실시간 명령어 모니터링
redis-cli MONITOR

# Redis 통계 확인
redis-cli INFO stats
```

## 🚀 프로덕션 설정

### 보안 설정
```bash
# redis.conf 파일 수정
# 1. 비밀번호 설정
requirepass your_strong_password

# 2. 외부 접속 제한
bind 127.0.0.1

# 3. 위험한 명령어 비활성화
rename-command FLUSHDB ""
rename-command FLUSHALL ""
```

### 성능 최적화
```bash
# redis.conf 파일 수정
# 1. 메모리 정책 설정
maxmemory-policy allkeys-lru

# 2. 지속성 설정 (필요에 따라)
save 900 1
save 300 10
save 60 10000
```

## 📈 Redis 모니터링

### 헬스체크 엔드포인트
```bash
# 앱 실행 후 확인
curl http://localhost:5000/health

# Redis 상태 확인
{
  "status": "healthy",
  "redis": "connected",
  "database": "connected"
}
```

### 에러 모니터링
```bash
# 에러 통계 확인
curl http://localhost:5000/api/monitoring/errors/stats

# Redis 관련 에러가 있는지 확인
curl http://localhost:5000/api/monitoring/errors/type/ConnectionError
```

## 💡 개발 팁

### 1. Redis 데이터 확인
```bash
# 앱에서 캐시된 데이터 확인
redis-cli
> KEYS *
> GET "cache:restaurants:popular"
```

### 2. 캐시 무효화
```bash
# 특정 캐시 삭제
redis-cli DEL "cache:restaurants:popular"

# 모든 캐시 삭제
redis-cli FLUSHDB
```

### 3. 성능 테스트
```bash
# Redis 벤치마크
redis-benchmark -q -n 10000

# 앱 성능 비교 (Redis ON/OFF)
# Redis ON: API 응답 시간 측정
# Redis OFF: API 응답 시간 측정
```

## 🆘 도움이 필요한 경우

### 로그 확인
```bash
# 앱 로그에서 Redis 관련 메시지 확인
tail -f logs/app.log | grep -i redis

# 에러 로그 확인
tail -f logs/error.log
```

### 일반적인 문제들
1. **포트 충돌**: 다른 앱이 6379 포트 사용 중
2. **권한 문제**: Redis 서비스 시작 권한 부족
3. **방화벽**: Windows 방화벽에서 포트 차단
4. **메모리 부족**: Redis 메모리 할당 실패

Redis 설치가 성공하면 앱의 성능이 크게 향상될 것입니다! 🚀
