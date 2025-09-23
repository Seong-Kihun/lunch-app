# Render 배포 가이드

## 🚀 Render 배포 설정

### 1. Render 서비스 생성

1. **Web Service** 생성
2. **Build Command**: `pip install -r requirements.txt`
3. **Start Command**: `gunicorn app:app`

### 2. 필수 환경변수 설정

Render 대시보드에서 다음 환경변수들을 설정해야 합니다:

#### 🔐 보안 관련 (필수)
```env
SECRET_KEY=your-super-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here
FLASK_ENV=production
ENV=production
```

#### 🗄️ 데이터베이스 (자동 설정됨)
```env
DATABASE_URL=postgresql://...  # Render에서 자동으로 제공
```

#### 🔧 선택적 설정
```env
# Redis (선택사항 - 캐싱용)
REDIS_URL=redis://...  # Redis 서비스 연결 시

# Celery (선택사항 - 백그라운드 작업용)
CELERY_BROKER_URL=redis://...  # Redis 서비스 연결 시
CELERY_RESULT_BACKEND=redis://...  # Redis 서비스 연결 시

# 캐시 경고 숨기기 (Redis 없을 때)
OFFLINE_MODE=true
```

### 3. 보안 키 생성

다음 명령어로 안전한 키를 생성할 수 있습니다:

```bash
python -c "import secrets; print('SECRET_KEY=' + secrets.token_urlsafe(32))"
python -c "import secrets; print('JWT_SECRET_KEY=' + secrets.token_urlsafe(32))"
```

### 4. Render 설정 단계

1. **Render 대시보드** → **Your Service** → **Environment**
2. **Add Environment Variable** 클릭
3. 다음 변수들을 하나씩 추가:

| 변수명 | 값 | 설명 |
|--------|-----|------|
| `SECRET_KEY` | `생성된-시크릿-키` | Flask 세션 암호화 |
| `JWT_SECRET_KEY` | `생성된-JWT-키` | JWT 토큰 서명 |
| `FLASK_ENV` | `production` | 프로덕션 모드 |
| `ENV` | `production` | 환경 설정 |
| `OFFLINE_MODE` | `true` | Redis 없을 때 경고 숨김 |

### 5. PostgreSQL 데이터베이스

Render는 자동으로 PostgreSQL 데이터베이스를 제공합니다:
- `DATABASE_URL` 환경변수가 자동으로 설정됩니다
- `psycopg2-binary` 드라이버가 requirements.txt에 포함되어 있습니다

### 6. 배포 후 확인

배포가 완료되면 다음을 확인하세요:

1. **헬스체크**: `https://your-app.onrender.com/health`
2. **API 테스트**: `https://your-app.onrender.com/api/auth/test-login/1`

### 7. 문제 해결

#### 데이터베이스 연결 오류
- `DATABASE_URL`이 자동으로 설정되었는지 확인
- PostgreSQL 서비스가 활성화되어 있는지 확인

#### 보안 키 오류
- `SECRET_KEY`와 `JWT_SECRET_KEY`가 설정되었는지 확인
- 키가 충분히 복잡한지 확인 (32자 이상)

#### Redis 관련 경고
- Redis가 필요하지 않다면 `OFFLINE_MODE=true` 설정
- Redis가 필요하다면 별도 Redis 서비스 생성 후 URL 설정

### 8. 성능 최적화

#### 메모리 사용량 최적화
- Render 무료 플랜: 512MB RAM
- 필요시 유료 플랜으로 업그레이드

#### 응답 시간 최적화
- 데이터베이스 쿼리 최적화
- 캐싱 전략 구현 (Redis 사용 시)

### 9. 모니터링

Render 대시보드에서 다음을 모니터링하세요:
- **Logs**: 실시간 로그 확인
- **Metrics**: CPU, 메모리 사용량
- **Uptime**: 서비스 가용성

### 10. 자동 배포

GitHub 연동 시:
- `main` 브랜치에 푸시하면 자동 배포
- Pull Request 생성 시 미리보기 배포 가능

---

## 📋 체크리스트

- [ ] Web Service 생성 완료
- [ ] Build Command 설정: `pip install -r requirements.txt`
- [ ] Start Command 설정: `gunicorn app:app`
- [ ] SECRET_KEY 환경변수 설정
- [ ] JWT_SECRET_KEY 환경변수 설정
- [ ] FLASK_ENV=production 설정
- [ ] ENV=production 설정
- [ ] PostgreSQL 데이터베이스 연결 확인
- [ ] 헬스체크 엔드포인트 테스트
- [ ] API 엔드포인트 테스트

---

## 🆘 지원

문제가 발생하면:
1. Render 로그 확인
2. 환경변수 설정 재확인
3. 데이터베이스 연결 상태 확인
4. 필요시 Render 지원팀에 문의
