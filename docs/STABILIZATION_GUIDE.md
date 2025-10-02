# 🚀 앱 안정화 가이드

## 📋 개선 완료 사항

### ✅ 1. Python 런타임 버전 표준화
- **문제**: Render(3.13.4)와 Dockerfile(3.12.7) 버전 불일치
- **해결**: 모든 환경을 Python 3.12.7로 통일
- **영향**: eventlet/greenlet 등 네트워킹 라이브러리 안정성 확보

### ✅ 2. 실행 엔트리포인트 단일화
- **문제**: Dockerfile이 존재하지 않는 `app.py` 실행 시도
- **해결**: Render와 동일한 `gunicorn --config gunicorn.conf.py backend.app.wsgi:app` 사용
- **영향**: 모든 환경에서 일관된 실행 방식 보장

### ✅ 3. WebSocket 전략 결정
- **문제**: eventlet worker 설정했지만 Socket.IO가 None으로 설정
- **해결**: 안정성을 위해 sync worker로 변경 (WebSocket 비활성화)
- **영향**: 예측 불가능한 WebSocket 오류 제거

### ✅ 4. Import 경로 시정
- **문제**: `from auth.routes` 직접 import로 런타임 오류 발생
- **해결**: `from backend.auth.routes` 네임스페이스 일관성 확보
- **영향**: ImportError 방지 및 모듈 구조 명확화

### ✅ 5. CORS 설정 개선
- **문제**: 웹용 포트 3000만 허용하여 모바일 앱 차단
- **해결**: Expo(19006), Metro(8081) 등 모든 개발 서버 포트 포함
- **영향**: 웹과 모바일 개발 환경 모두 지원

### ✅ 6. 데이터베이스 설정 강화
- **문제**: PostgreSQL URL 스킴 불일치, 마이그레이션 파이프라인 부재
- **해결**: 
  - `postgres://` → `postgresql+psycopg2://` 자동 변환
  - 헬스체크 엔드포인트 추가 (`/healthz`, `/healthz/db`, `/healthz/full`)
  - 데이터베이스 URL 유효성 검증
- **영향**: 프로덕션 배포 시 데이터베이스 연결 안정성 확보

### ✅ 7. 프론트엔드 패키지 정리
- **문제**: 루트 레벨 package.json 중복으로 설치 혼선
- **해결**: 루트 package.json/package-lock.json 제거
- **영향**: 의존성 관리 명확화 및 설치 오류 방지

### ✅ 8. 로깅/헬스체크 시스템 구축
- **문제**: 시스템 상태 모니터링 부재
- **해결**: 
  - 구조화된 JSON 로깅 시스템
  - 다단계 헬스체크 엔드포인트
  - 데이터베이스 연결 상태 모니터링
- **영향**: 운영 중 문제 조기 발견 및 디버깅 효율성 향상

## 🛠️ 개발 환경 설정

### 1. 환경 변수 설정
```bash
# docs/env_template.txt를 .env로 복사
cp docs/env_template.txt .env

# 필요한 값들 수정
# - SECRET_KEY: 강력한 랜덤 문자열
# - JWT_SECRET_KEY: JWT 서명용 키
# - DATABASE_URL: 데이터베이스 연결 문자열
# - ALLOWED_ORIGINS: CORS 허용 오리진 (쉼표로 구분)
```

### 2. 백엔드 실행
```bash
# 개발 환경
cd backend
python -m backend.run_server --env dev

# 프로덕션 환경 (Render)
gunicorn --config gunicorn.conf.py backend.app.wsgi:app
```

### 3. 프론트엔드 실행
```bash
# 모바일 앱 (Expo)
cd frontend
npm start

# 웹 앱
cd frontend
npm run web
```

## 🔍 헬스체크 엔드포인트

### 기본 헬스체크
```bash
curl http://localhost:5000/healthz
```

### 데이터베이스 상태 확인
```bash
curl http://localhost:5000/healthz/db
```

### 전체 시스템 상태
```bash
curl http://localhost:5000/healthz/full
```

## 🚨 문제 해결

### 1. ImportError 발생 시
- 모든 import는 `backend.` 네임스페이스 사용
- `from auth.routes` → `from backend.auth.routes`

### 2. CORS 오류 발생 시
- `ALLOWED_ORIGINS` 환경 변수에 클라이언트 URL 추가
- 개발 서버 포트 확인 (웹: 3000, Expo: 19006, Metro: 8081)

### 3. 데이터베이스 연결 오류 시
- `DATABASE_URL` 형식 확인 (SQLite: `sqlite:///`, PostgreSQL: `postgresql+psycopg2://`)
- 헬스체크 엔드포인트로 연결 상태 확인

### 4. WebSocket 관련 오류 시
- 현재 WebSocket 비활성화 상태
- 실시간 기능이 필요하면 `gunicorn.conf.py`에서 `worker_class = "eventlet"`로 변경

## 📊 모니터링

### 로그 확인
```bash
# 애플리케이션 로그
tail -f logs/app.log

# 에러 로그
tail -f logs/error.log
```

### 성능 모니터링
- 헬스체크 엔드포인트를 통한 시스템 상태 모니터링
- 구조화된 JSON 로그를 통한 디버깅

## 🎯 다음 단계

1. **실시간 기능 필요 시**: WebSocket 활성화 및 Socket.IO 구현
2. **성능 최적화**: Redis 캐시 시스템 활용
3. **보안 강화**: Rate limiting, CSRF 보호 등
4. **테스트 자동화**: CI/CD 파이프라인 구축

---

**이 가이드는 근본적이고 장기적인 해결책을 제공합니다. 임시 조치가 아닌 아키텍처 레벨에서의 안정화를 목표로 합니다.**
