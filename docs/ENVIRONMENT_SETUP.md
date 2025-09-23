# 🔧 환경 설정 가이드

## 📋 필수 환경변수 설정

프로젝트 루트에 `.env` 파일을 생성하고 다음 내용을 추가하세요:

```bash
# ===========================================
# 🔐 보안 설정 (필수)
# ===========================================
SECRET_KEY=your-super-secret-key-change-this-in-production-2024
JWT_SECRET_KEY=your-jwt-secret-key-change-this-in-production-2024

# ===========================================
# 🗄️ 데이터베이스 설정
# ===========================================
DATABASE_URL=sqlite:///instance/site.db

# ===========================================
# 🔴 Redis 설정 (선택사항)
# ===========================================
REDIS_URL=redis://localhost:6379/0
# Redis 없이 개발하려면:
# OFFLINE_MODE=true

# ===========================================
# 🌍 환경 설정
# ===========================================
FLASK_ENV=development
ENV=development

# ===========================================
# 📧 이메일 설정 (선택사항)
# ===========================================
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=true
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
```

## 🚀 빠른 시작

### 1. 기본 설정 (최소한의 설정)
```bash
# .env 파일 생성
echo "SECRET_KEY=dev-secret-key-2024" > .env
echo "JWT_SECRET_KEY=dev-jwt-secret-2024" >> .env
echo "FLASK_ENV=development" >> .env
echo "OFFLINE_MODE=true" >> .env
```

### 2. Redis와 함께 사용 (성능 향상)
```bash
# Redis 설치 (Windows)
# Chocolatey 사용: choco install redis
# 또는 Docker 사용: docker run -d -p 6379:6379 redis:alpine

# .env에 추가
echo "REDIS_URL=redis://localhost:6379/0" >> .env
echo "OFFLINE_MODE=false" >> .env
```

## 🔒 보안 주의사항

- **프로덕션 환경에서는 반드시 강력한 보안 키 사용**
- `.env` 파일은 절대 Git에 커밋하지 마세요
- 기본값 보안 키는 개발 환경에서만 사용하세요

## 🐛 문제 해결

### Redis 연결 실패
```bash
# Redis 없이 개발하려면
echo "OFFLINE_MODE=true" >> .env
```

### 데이터베이스 오류
```bash
# SQLite 파일 권한 확인
ls -la instance/site.db
# 필요시 삭제 후 재생성
rm instance/site.db
python app.py
```
