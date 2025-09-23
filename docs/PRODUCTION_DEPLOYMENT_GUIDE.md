# 🚀 프로덕션 배포 가이드

## 📋 개요
이 가이드는 Lunch App을 프로덕션 환경에 안전하게 배포하기 위한 단계별 지침을 제공합니다.

## 🔧 필수 환경변수 설정

### **보안 관련 (필수)**
```bash
# Flask 보안 키 (반드시 변경 필요!)
SECRET_KEY=your-super-secret-production-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here

# 환경 설정
FLASK_ENV=production
ENV=production
```

### **데이터베이스 설정**
```bash
# SQLite (개발용)
DATABASE_URL=sqlite:///lunch_app.db

# PostgreSQL (프로덕션 권장)
DATABASE_URL=postgresql://username:password@localhost:5432/lunch_app_prod
```

### **Redis 캐시 설정**
```bash
# Redis 연결 (성능 향상을 위해 권장)
REDIS_URL=redis://localhost:6379/0
OFFLINE_MODE=false
```

### **Celery 백그라운드 작업**
```bash
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/2
```

### **이메일 서비스 (선택사항)**
```bash
# Gmail SMTP
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

## 🛠️ 배포 단계

### **1단계: 서버 환경 준비**
```bash
# Python 3.8+ 설치 확인
python --version

# 가상환경 생성
python -m venv venv
source venv/bin/activate  # Linux/Mac
# 또는
venv\Scripts\activate     # Windows

# 의존성 설치
pip install -r requirements.txt
```

### **2단계: 데이터베이스 설정**
```bash
# SQLite 사용 시 (간단한 배포)
# 별도 설정 불필요

# PostgreSQL 사용 시 (권장)
sudo apt-get install postgresql postgresql-contrib
sudo -u postgres createdb lunch_app_prod
```

### **3단계: Redis 설치 (권장)**
```bash
# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Windows (Docker 권장)
docker run -d -p 6379:6379 redis:alpine
```

### **4단계: 환경변수 설정**
```bash
# .env 파일 생성
cp .env.example .env

# 환경변수 편집
nano .env
```

### **5단계: 애플리케이션 실행**
```bash
# 개발 모드
python app.py

# 프로덕션 모드 (Gunicorn 권장)
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

## 🔒 보안 체크리스트

### **✅ 필수 보안 설정**
- [ ] `SECRET_KEY`를 강력한 랜덤 값으로 설정
- [ ] `JWT_SECRET_KEY`를 강력한 랜덤 값으로 설정
- [ ] `FLASK_ENV=production` 설정
- [ ] 데이터베이스 비밀번호 강화
- [ ] Redis 비밀번호 설정 (선택사항)

### **✅ 네트워크 보안**
- [ ] 방화벽 설정 (필요한 포트만 개방)
- [ ] HTTPS 설정 (Nginx + Let's Encrypt 권장)
- [ ] CORS 설정 검토

### **✅ 모니터링 설정**
- [ ] 로그 파일 위치 확인
- [ ] 에러 모니터링 활성화
- [ ] 성능 모니터링 설정

## 📊 성능 최적화

### **데이터베이스 최적화**
```bash
# 인덱스 생성 (자동으로 실행됨)
python -c "from app import app; from extensions import db; app.app_context().push(); db.create_all()"
```

### **캐시 최적화**
```bash
# Redis 캐시 테스트
python cache_optimization.py
```

### **성능 모니터링**
```bash
# 성능 대시보드 실행
python performance_dashboard.py
```

## 🚨 문제 해결

### **일반적인 문제들**

#### **1. Blueprint 등록 실패**
```bash
# 해결방법: 모델 import 경로 확인
grep -r "from models.app_models import" api/
```

#### **2. 데이터베이스 연결 실패**
```bash
# 해결방법: DATABASE_URL 확인
echo $DATABASE_URL
```

#### **3. Redis 연결 실패**
```bash
# 해결방법: Redis 서비스 상태 확인
redis-cli ping
```

#### **4. 메모리 부족**
```bash
# 해결방법: 시스템 리소스 확인
python test_performance.py
```

## 📈 모니터링 및 유지보수

### **일일 체크리스트**
- [ ] 애플리케이션 상태 확인 (`/health` 엔드포인트)
- [ ] 로그 파일 검토
- [ ] 성능 지표 확인
- [ ] 에러 발생 여부 확인

### **주간 체크리스트**
- [ ] 데이터베이스 백업
- [ ] 로그 파일 정리
- [ ] 성능 리포트 생성
- [ ] 보안 업데이트 확인

### **월간 체크리스트**
- [ ] 전체 시스템 점검
- [ ] 성능 최적화 검토
- [ ] 보안 감사
- [ ] 백업 복원 테스트

## 🔄 백업 및 복구

### **데이터베이스 백업**
```bash
# SQLite 백업
cp lunch_app.db backup/lunch_app_$(date +%Y%m%d).db

# PostgreSQL 백업
pg_dump lunch_app_prod > backup/lunch_app_$(date +%Y%m%d).sql
```

### **복구 절차**
```bash
# SQLite 복구
cp backup/lunch_app_20240907.db lunch_app.db

# PostgreSQL 복구
psql lunch_app_prod < backup/lunch_app_20240907.sql
```

## 📞 지원 및 문의

### **문제 발생 시**
1. 로그 파일 확인: `logs/`
2. 성능 모니터링 실행: `python performance_dashboard.py`
3. 데이터 정합성 확인: `python data_integrity_check.py`
4. API 테스트 실행: `python test_api_endpoints.py`

### **긴급 상황 대응**
1. 서비스 중단 시: `systemctl restart lunch-app`
2. 데이터 손실 시: 백업에서 복구
3. 보안 침해 시: 즉시 서비스 중단 및 조사

---

## 🎯 성공적인 배포를 위한 핵심 포인트

1. **보안 우선**: 모든 보안 설정을 완료한 후 배포
2. **단계적 배포**: 개발 → 스테이징 → 프로덕션 순서로 진행
3. **모니터링 필수**: 배포 후 지속적인 모니터링
4. **백업 준비**: 배포 전 백업 전략 수립
5. **롤백 계획**: 문제 발생 시 빠른 롤백 준비

**🚀 성공적인 배포를 위해 이 가이드를 단계별로 따라해주세요!**
