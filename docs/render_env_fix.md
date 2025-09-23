# 🚀 Render 프로덕션 환경 수정 가이드

## 🔧 Render 환경변수 수정 필요

### 1. Redis URL 수정
현재 Redis URL이 PostgreSQL로 잘못 설정되어 있습니다.

**현재 (잘못됨):**
```
REDIS_URL=postgresql://lunch_app_user:Shk9JTB2hhArJJgZ0T78ayASltneCGWy@dpg-d2odvn6r433s73csqhog-a.singapore-postgres.render.com/lunch_app_db_15zl
```

**수정해야 할 값:**
```
REDIS_URL=redis://localhost:6379/0
```

### 2. 추가 환경변수 설정
Render 대시보드에서 다음 환경변수들을 추가/수정하세요:

```
# CORS 설정
ALLOWED_ORIGINS=https://your-frontend-domain.com,http://localhost:3000

# Celery 설정 (Redis 사용 안함)
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/2

# 로깅 설정
LOG_LEVEL=INFO
LOG_FILE=logs/app.log

# 성능 설정
MAX_CONTENT_LENGTH=16777216
UPLOAD_FOLDER=uploads
```

## 📋 Render에서 환경변수 수정 방법

1. **Render 대시보드 접속**
   - https://dashboard.render.com
   - 로그인 후 프로젝트 선택

2. **환경변수 탭 클릭**
   - 좌측 메뉴에서 "Environment" 클릭

3. **REDIS_URL 수정**
   - REDIS_URL 찾기
   - 값 변경: `redis://localhost:6379/0`

4. **서비스 재배포**
   - "Manual Deploy" 클릭
   - "Deploy latest commit" 선택

## 🔍 API 404 오류 해결

현재 `/api/users/profile`이 404를 반환하는 이유는 Blueprint 등록 문제입니다.

### 해결 방법:
1. **코드 수정 완료됨** ✅
   - `api/__init__.py`에서 users Blueprint 등록 추가
   - Blueprint 이름 충돌 해결

2. **Render에 재배포 필요**
   - 수정된 코드를 Git에 푸시
   - Render에서 자동 재배포 또는 수동 재배포

## 🚀 배포 후 테스트

### 1. 서비스 상태 확인
```bash
# Render 서비스 URL로 테스트
curl https://your-app-name.onrender.com/health
```

### 2. API 엔드포인트 테스트
```bash
# 사용자 프로필 API 테스트
curl https://your-app-name.onrender.com/api/users/profile
```

### 3. 데이터베이스 연결 확인
- Render 로그에서 "데이터베이스 연결 성공" 메시지 확인
- PostgreSQL 연결 상태 확인

## 📊 예상 결과

수정 후 예상되는 결과:
- ✅ `/api/users/profile` 200 응답 (인증 필요)
- ✅ 다른 API 엔드포인트 정상 작동
- ✅ 데이터베이스 연결 안정화
- ✅ Redis 경고 메시지 제거

## 🎯 다음 단계

1. **즉시**: Render 환경변수 수정
2. **5분 후**: 서비스 재배포 완료
3. **10분 후**: API 테스트 실행
4. **15분 후**: 전체 시스템 정상 작동 확인
