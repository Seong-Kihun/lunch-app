# 🚀 Lunch App 종합 개발자 가이드

## 📋 목차
1. [프로젝트 개요](#프로젝트-개요)
2. [시스템 아키텍처](#시스템-아키텍처)
3. [개발 환경 설정](#개발-환경-설정)
4. [코드 구조](#코드-구조)
5. [API 문서](#api-문서)
6. [데이터베이스](#데이터베이스)
7. [보안](#보안)
8. [성능 최적화](#성능-최적화)
9. [배포](#배포)
10. [모니터링](#모니터링)
11. [문제 해결](#문제-해결)
12. [개발 도구](#개발-도구)

---

## 🎯 프로젝트 개요

### **Lunch App이란?**
- **목적**: 직장인들의 점심 약속을 쉽게 만들고 관리할 수 있는 모바일 앱
- **기술 스택**: React Native (프론트엔드) + Flask (백엔드) + SQLite/PostgreSQL (데이터베이스)
- **주요 기능**: 파티 생성, 식당 검색, 일정 관리, 친구 관리, 포인트 시스템

### **핵심 특징**
- 🍽️ **점심 파티 관리**: 간편한 파티 생성 및 참석 관리
- 🏪 **식당 정보**: 리뷰, 평점, 위치 정보 제공
- 👥 **친구 시스템**: 동료들과의 연결 및 관리
- 📅 **일정 관리**: 개인 일정 및 그룹 일정 통합 관리
- 🏆 **포인트 시스템**: 활동 기반 포인트 및 배지 시스템

---

## 🏗️ 시스템 아키텍처

### **전체 구조**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Native  │    │   Flask API     │    │   Database      │
│   (Frontend)    │◄──►│   (Backend)     │◄──►│   (SQLite/      │
│                 │    │                 │    │    PostgreSQL)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Expo/         │    │   Redis Cache   │    │   File Storage  │
│   Metro         │    │   (Optional)    │    │   (Logs,        │
│   Bundler       │    │                 │    │    Backups)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **백엔드 아키텍처**
```
app.py (메인 애플리케이션)
├── Blueprints (API 모듈)
│   ├── api/users.py (사용자 관리)
│   ├── api/parties.py (파티 관리)
│   ├── api/schedules.py (일정 관리)
│   ├── api/restaurants_v2.py (식당 관리)
│   ├── api/points_api.py (포인트 시스템)
│   └── auth/routes.py (인증)
├── Models (데이터 모델)
│   ├── auth/models.py (사용자, 인증)
│   ├── models/app_models.py (애플리케이션 모델)
│   └── models/schedule_models.py (일정 모델)
├── Utils (유틸리티)
│   ├── utils/logger.py (로깅)
│   ├── utils/error_monitor.py (에러 모니터링)
│   └── cache_manager.py (캐시 관리)
└── Extensions (확장)
    └── extensions.py (SQLAlchemy, Flask 확장)
```

---

## 🛠️ 개발 환경 설정

### **필수 요구사항**
- Python 3.8+
- Node.js 16+
- React Native CLI
- Expo CLI
- Git

### **백엔드 설정**
```bash
# 1. 저장소 클론
git clone <repository-url>
cd lunch-app

# 2. 가상환경 생성
python -m venv venv
source venv/bin/activate  # Linux/Mac
# 또는
venv\Scripts\activate     # Windows

# 3. 의존성 설치
pip install -r requirements.txt

# 4. 환경변수 설정
cp env_template.txt .env
# .env 파일 편집

# 5. 데이터베이스 초기화
python -c "from app import app, db; app.app_context().push(); db.create_all()"

# 6. 서버 실행
python app.py
```

### **프론트엔드 설정**
```bash
# 1. 프론트엔드 디렉토리로 이동
cd lunch_app_frontend

# 2. 의존성 설치
npm install

# 3. Expo 개발 서버 실행
npx expo start
```

### **개발 도구 설정**
```bash
# 1. 보안 감사
python security_audit.py

# 2. 성능 모니터링
python performance_dashboard.py

# 3. 데이터베이스 최적화
python database_optimization.py

# 4. API 테스트
python test_api_endpoints.py
```

---

## 📁 코드 구조

### **백엔드 구조**
```
project/
├── app.py                 # 메인 Flask 애플리케이션
├── requirements.txt       # Python 의존성
├── .env                  # 환경변수 (생성 필요)
├── api/                  # API Blueprint들
│   ├── users.py          # 사용자 관리 API
│   ├── parties.py        # 파티 관리 API
│   ├── schedules.py      # 일정 관리 API
│   ├── restaurants_v2.py # 식당 관리 API
│   └── points_api.py     # 포인트 시스템 API
├── auth/                 # 인증 시스템
│   ├── __init__.py
│   ├── models.py         # 사용자, 인증 모델
│   └── routes.py         # 인증 API
├── models/               # 데이터 모델
│   ├── app_models.py     # 애플리케이션 모델
│   └── schedule_models.py # 일정 모델
├── utils/                # 유틸리티
│   ├── logger.py         # 로깅 시스템
│   └── error_monitor.py  # 에러 모니터링
├── extensions.py         # Flask 확장
├── cache_manager.py      # 캐시 관리
└── lunch_app_frontend/   # React Native 프론트엔드
    ├── App.js            # 메인 앱 컴포넌트
    ├── screens/          # 화면 컴포넌트들
    ├── components/       # 재사용 가능한 컴포넌트
    ├── services/         # API 서비스
    ├── hooks/            # React Hook들
    └── utils/            # 유틸리티 함수들
```

### **프론트엔드 구조**
```
lunch_app_frontend/
├── App.js                # 메인 앱 컴포넌트
├── screens/              # 화면 컴포넌트들
│   ├── Home/             # 홈 화면
│   ├── Party/            # 파티 관련 화면
│   ├── MyPage/           # 마이페이지
│   └── Restaurant/       # 식당 관련 화면
├── components/           # 재사용 가능한 컴포넌트
│   ├── common/           # 공통 컴포넌트
│   └── schedule/         # 일정 관련 컴포넌트
├── services/             # API 서비스
│   ├── apiClient.js      # API 클라이언트
│   └── userService.js    # 사용자 서비스
├── hooks/                # React Hook들
│   ├── useScheduleQuery.js # 일정 쿼리 훅
│   └── usePartyQuery.js    # 파티 쿼리 훅
├── utils/                # 유틸리티 함수들
│   ├── colors.js         # 색상 테마
│   ├── globalStyles.js   # 전역 스타일
│   └── networkUtils.js   # 네트워크 유틸리티
└── theme/                # 테마 시스템
    └── colors.js         # 색상 정의
```

---

## 📚 API 문서

### **인증 API**
```http
POST /api/auth/magic-link
Content-Type: application/json

{
  "email": "user@koica.go.kr"
}
```

```http
GET /api/auth/test-login/{employee_id}
```

### **사용자 API**
```http
GET /api/users/profile
Authorization: Bearer <token>

GET /api/users/activity-stats
Authorization: Bearer <token>

GET /api/users/dashboard
Authorization: Bearer <token>
```

### **파티 API**
```http
GET /api/parties
Authorization: Bearer <token>

POST /api/parties
Content-Type: application/json
Authorization: Bearer <token>

{
  "title": "점심 파티",
  "restaurant_name": "맛있는 식당",
  "party_date": "2024-09-08",
  "party_time": "12:00",
  "max_members": 4
}
```

### **일정 API**
```http
GET /api/schedules?start_date=2024-01-01&end_date=2024-12-31&employee_id=1
Authorization: Bearer <token>

POST /api/schedules
Content-Type: application/json
Authorization: Bearer <token>

{
  "title": "개인 일정",
  "start_time": "2024-09-08T10:00:00",
  "end_time": "2024-09-08T11:00:00",
  "employee_id": 1
}
```

### **식당 API**
```http
GET /api/restaurants
Authorization: Bearer <token>

GET /api/restaurants/search?query=맛집
Authorization: Bearer <token>

POST /api/restaurants
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "새로운 식당",
  "address": "서울시 강남구",
  "category": "한식"
}
```

---

## 🗄️ 데이터베이스

### **주요 테이블**

#### **users (사용자)**
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    department VARCHAR(100),
    position VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### **parties (파티)**
```sql
CREATE TABLE parties (
    id INTEGER PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    restaurant_name VARCHAR(200),
    restaurant_address TEXT,
    party_date DATE NOT NULL,
    party_time TIME NOT NULL,
    meeting_location VARCHAR(200),
    max_members INTEGER DEFAULT 4,
    description TEXT,
    host_employee_id VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (host_employee_id) REFERENCES users(employee_id)
);
```

#### **party_members (파티 멤버)**
```sql
CREATE TABLE party_members (
    id INTEGER PRIMARY KEY,
    party_id INTEGER NOT NULL,
    employee_id VARCHAR(50) NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (party_id) REFERENCES parties(id),
    FOREIGN KEY (employee_id) REFERENCES users(employee_id)
);
```

### **데이터베이스 최적화**
```bash
# 인덱스 생성
python database_optimization.py

# 데이터 정합성 검사
python data_integrity_check.py

# 백업 생성
cp lunch_app.db backup/lunch_app_$(date +%Y%m%d).db
```

---

## 🔒 보안

### **보안 설정**
```bash
# 보안 감사 실행
python security_audit.py

# 보안 점수 확인 (70점 이상 목표)
# 취약점 수정 후 재실행
```

### **환경변수 보안**
```bash
# .env 파일 설정
SECRET_KEY=<강력한-랜덤-키>
JWT_SECRET_KEY=<강력한-랜덤-키>
FLASK_ENV=production
DEBUG=false
```

### **보안 체크리스트**
- [ ] 강력한 SECRET_KEY 설정
- [ ] 강력한 JWT_SECRET_KEY 설정
- [ ] 프로덕션 환경 설정
- [ ] 디버그 모드 비활성화
- [ ] HTTPS 설정
- [ ] CORS 도메인 제한
- [ ] 보안 쿠키 설정

---

## ⚡ 성능 최적화

### **백엔드 최적화**
```bash
# 성능 모니터링
python performance_dashboard.py

# 데이터베이스 최적화
python database_optimization.py

# 캐시 최적화
python cache_optimization.py
```

### **프론트엔드 최적화**
- 컴포넌트 분할 및 모듈화
- 이미지 최적화
- 번들 크기 최적화
- 메모리 누수 방지

### **성능 지표**
- API 응답시간: < 500ms
- 데이터베이스 쿼리: < 100ms
- 메모리 사용률: < 80%
- CPU 사용률: < 70%

---

## 🚀 배포

### **개발 환경 배포**
```bash
# 배포 스크립트 실행
python deploy.py

# 서버 시작
python app.py
```

### **프로덕션 배포**
```bash
# 1. 환경변수 설정
export FLASK_ENV=production
export SECRET_KEY=<강력한-키>
export JWT_SECRET_KEY=<강력한-키>

# 2. Gunicorn으로 실행
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app

# 3. Nginx 설정 (선택사항)
# HTTPS 설정 및 리버스 프록시
```

### **배포 체크리스트**
- [ ] 보안 감사 통과 (70점 이상)
- [ ] 모든 테스트 통과
- [ ] 환경변수 설정 완료
- [ ] 데이터베이스 백업
- [ ] 로그 설정 확인

---

## 📊 모니터링

### **헬스체크**
```http
GET /health
```

### **성능 모니터링**
```bash
# 실시간 성능 모니터링
python performance_dashboard.py

# 지속적인 모니터링 (5분)
python -c "from performance_dashboard import PerformanceMonitor; monitor = PerformanceMonitor(); monitor.monitor_continuous(5, 10)"
```

### **에러 모니터링**
```bash
# 에러 통계 확인
curl http://localhost:5000/api/errors/stats

# 최근 에러 확인
curl http://localhost:5000/api/errors/recent
```

### **로그 모니터링**
```bash
# 실시간 로그 확인
tail -f logs/app.log

# 에러 로그 확인
tail -f logs/error.log
```

---

## 🔧 문제 해결

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

### **디버깅 도구**
```bash
# API 테스트
python test_api_endpoints.py

# 데이터 정합성 검사
python data_integrity_check.py

# 성능 분석
python performance_dashboard.py

# 보안 감사
python security_audit.py
```

---

## 🛠️ 개발 도구

### **자동화 스크립트**
```bash
# 전체 시스템 점검
python deploy.py

# 데이터베이스 최적화
python database_optimization.py

# 보안 감사
python security_audit.py

# 성능 모니터링
python performance_dashboard.py

# 캐시 최적화
python cache_optimization.py
```

### **개발 환경 도구**
- **로깅**: `utils/logger.py` - 구조화된 로깅
- **에러 모니터링**: `utils/error_monitor.py` - 실시간 에러 추적
- **캐시 관리**: `cache_manager.py` - Redis 캐시 관리
- **성능 모니터링**: `performance_dashboard.py` - 실시간 성능 추적

### **테스트 도구**
- **API 테스트**: `test_api_endpoints.py`
- **성능 테스트**: `test_performance.py`
- **데이터 정합성**: `data_integrity_check.py`
- **보안 감사**: `security_audit.py`

---

## 📞 지원 및 문의

### **문제 발생 시**
1. 로그 파일 확인: `logs/`
2. 성능 모니터링 실행: `python performance_dashboard.py`
3. 데이터 정합성 확인: `python data_integrity_check.py`
4. API 테스트 실행: `python test_api_endpoints.py`
5. 보안 감사 실행: `python security_audit.py`

### **긴급 상황 대응**
1. 서비스 중단 시: `systemctl restart lunch-app`
2. 데이터 손실 시: 백업에서 복구
3. 보안 침해 시: 즉시 서비스 중단 및 조사

---

## 🎯 개발 가이드라인

### **코딩 스타일**
- Python: PEP 8 준수
- JavaScript: ESLint 설정 준수
- React Native: 함수형 컴포넌트 우선 사용

### **커밋 메시지**
```
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정
style: 코드 스타일 변경
refactor: 코드 리팩토링
test: 테스트 추가/수정
chore: 빌드 프로세스 또는 보조 도구 변경
```

### **브랜치 전략**
- `main`: 프로덕션 브랜치
- `develop`: 개발 브랜치
- `feature/*`: 기능 개발 브랜치
- `hotfix/*`: 긴급 수정 브랜치

---

## 🚀 다음 단계

### **단기 목표 (1-2주)**
1. Redis 설치 및 캐시 시스템 활성화
2. API 응답시간 최적화 (현재 3.1초 → 500ms 이하)
3. 메모리 사용량 최적화 (현재 92.2% → 80% 이하)

### **중기 목표 (1-2개월)**
1. E2E 테스트 구축
2. 자동화된 CI/CD 파이프라인
3. 실시간 알림 시스템 구축

### **장기 목표 (3-6개월)**
1. 마이크로서비스 아키텍처 전환
2. 머신러닝 기반 추천 시스템
3. 다국어 지원

---

**🎉 이 가이드를 따라하면 Lunch App을 성공적으로 개발하고 운영할 수 있습니다!**

**Happy Coding! 🚀**
