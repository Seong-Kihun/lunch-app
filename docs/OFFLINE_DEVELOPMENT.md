# 🍟 오프라인 개발 가이드

맥도날드나 카페 같은 공공 WiFi에서 개발할 때 발생하는 네트워크 문제를 해결하는 가이드입니다.

## 🚨 발생하는 문제들

1. **Redis 연결 실패** - 로컬 Redis 서버에 연결할 수 없음
2. **Expo CLI 네트워크 오류** - Expo 서버에 연결 실패
3. **Celery 의존성 문제** - 백그라운드 작업 시스템 오류

## 🔧 해결 방법

### 1. 자동 설정 (권장)

```bash
# 오프라인 환경 설정
python start_offline.py

# 백엔드만 시작
python start_offline.py backend

# 프론트엔드만 시작  
python start_offline.py frontend
```

### 2. 수동 설정

#### 환경변수 설정
```bash
# Windows PowerShell
$env:OFFLINE_MODE="true"
$env:FLASK_ENV="development"

# 또는 .env 파일 생성
copy offline.env .env
```

#### 백엔드 시작
```bash
python app.py
```

#### 프론트엔드 시작
```bash
cd lunch_app_frontend
npx expo start --offline
```

## 📋 오프라인 모드에서 비활성화되는 기능들

- ✅ **정상 작동**: 기본 API, 데이터베이스, 인증
- ❌ **비활성화**: Redis 캐싱, Celery 백그라운드 작업, 실시간 알림

## 🛠️ 개발 팁

### 1. 네트워크 문제 해결
- 공공 WiFi에서 포트 제한이 있을 수 있음
- `--offline` 플래그로 네트워크 의존성 최소화

### 2. 성능 최적화
- Redis 없이도 개발 가능하도록 캐시 매니저 개선
- 오프라인 모드에서 경고 메시지 최소화

### 3. 디버깅
- 로그에서 "오프라인 모드" 메시지 확인
- 캐시 관련 경고는 무시해도 됨

## 🔄 온라인 모드로 복구

개발 환경으로 돌아갈 때:

```bash
# 환경변수 제거
$env:OFFLINE_MODE="false"

# 또는 .env 파일 삭제
del .env

# 정상 모드로 재시작
python app.py
```

## 📞 문제 해결

### Expo CLI 오류
```bash
# 캐시 클리어
npx expo start --clear

# 오프라인 모드
npx expo start --offline
```

### Redis 연결 오류
- 오프라인 모드에서는 자동으로 비활성화됨
- 경고 메시지는 무시해도 됨

### Celery 오류
- 오프라인 모드에서는 자동으로 비활성화됨
- 백그라운드 작업은 온라인 모드에서만 사용

## 🎯 권장 개발 워크플로우

1. **오프라인 환경에서**: 기본 기능 개발 및 테스트
2. **온라인 환경에서**: 캐싱, 백그라운드 작업, 실시간 기능 테스트
3. **프로덕션 배포 전**: 모든 기능 통합 테스트

---

💡 **팁**: 맥도날드에서 개발할 때는 핫스팟을 사용하는 것도 좋은 방법입니다!
