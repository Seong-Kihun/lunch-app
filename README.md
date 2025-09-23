# 🍽️ Lunch App - 정리된 프로젝트 구조

점심 약속 관리 및 식당 추천 애플리케이션

## 📁 프로젝트 구조

```
lunch_app_organized/
├── backend/                 # 백엔드 서버 (Flask)
│   ├── app/                # Flask 애플리케이션
│   ├── api/                # API 엔드포인트
│   ├── auth/               # 인증 시스템
│   ├── models/             # 데이터베이스 모델
│   ├── routes/             # 라우트 정의
│   ├── services/           # 비즈니스 로직
│   ├── utils/              # 유틸리티 함수
│   ├── config/             # 설정 파일
│   ├── database/           # 데이터베이스 관련
│   ├── monitoring/         # 모니터링
│   ├── security/           # 보안
│   ├── realtime/           # 실시간 통신
│   ├── migrations/         # 데이터베이스 마이그레이션
│   ├── requirements.txt    # Python 의존성
│   └── alembic.ini         # 데이터베이스 마이그레이션 설정
│
├── frontend/               # 프론트엔드 앱 (React Native/Expo)
│   ├── App.js             # 메인 앱 컴포넌트
│   ├── index.js           # 앱 진입점
│   ├── package.json       # Node.js 의존성
│   ├── app.json           # Expo 설정
│   ├── components/        # 재사용 가능한 컴포넌트
│   ├── screens/           # 화면 컴포넌트
│   ├── services/          # API 서비스
│   ├── utils/             # 유틸리티
│   ├── auth/              # 인증 관련
│   ├── config/            # 설정
│   ├── theme/             # 테마
│   ├── hooks/             # 커스텀 훅
│   ├── contexts/          # React Context
│   └── assets/            # 이미지, 아이콘 등
│
├── docs/                  # 프로젝트 문서
│   ├── guides/            # 가이드 문서
│   └── *.md              # 각종 문서들
│
├── scripts/               # 유틸리티 스크립트
│   └── maintenance/       # 유지보수 스크립트
│
├── data/                  # 데이터 파일
│   ├── databases/         # 데이터베이스 파일
│   ├── exports/           # 내보내기 파일
│   ├── backups/           # 백업 파일
│   ├── uploads/           # 업로드 파일
│   └── logs/              # 로그 파일
│
├── tests/                 # 테스트 코드
│   ├── backend/           # 백엔드 테스트
│   ├── frontend/          # 프론트엔드 테스트
│   └── integration/       # 통합 테스트
│
├── deployment/            # 배포 관련
│   ├── docker-compose.yml
│   ├── Dockerfile
│   └── render.yaml
│
├── .env.render           # 환경변수
├── .gitignore            # Git 무시 파일
├── package.json          # 루트 패키지 설정
└── README.md             # 이 파일
```

## 🚀 빠른 시작

### 백엔드 실행
```bash
cd backend
pip install -r requirements.txt
python app.py
```

### 프론트엔드 실행
```bash
cd frontend
npm install
npm start
```

## 📋 주요 기능

- **사용자 인증**: 로그인/회원가입
- **식당 관리**: 식당 검색, 추천, 리뷰
- **파티 관리**: 점심 파티 생성, 참여, 관리
- **실시간 채팅**: 파티원들과의 소통
- **일정 관리**: 개인 일정 및 파티 일정
- **포인트 시스템**: 활동 기반 포인트 적립
- **친구 관리**: 동료와의 연결

## 🛠️ 기술 스택

### 백엔드
- Python 3.13
- Flask
- SQLAlchemy
- PostgreSQL/SQLite
- Redis (캐싱)
- Celery (백그라운드 작업)

### 프론트엔드
- React Native
- Expo
- React Navigation
- React Query
- Socket.io (실시간 통신)

## 📝 개발 가이드

자세한 개발 가이드는 `docs/` 폴더를 참고하세요:
- `docs/DEVELOPER_GUIDE.md` - 개발자 가이드
- `docs/MOBILE_DEVELOPMENT_GUIDE.md` - 모바일 개발 가이드
- `docs/PRODUCTION_DEPLOYMENT_GUIDE.md` - 프로덕션 배포 가이드

## 🔧 환경 설정

1. 환경변수 파일 복사:
   ```bash
   cp .env.render .env
   ```

2. 데이터베이스 초기화:
   ```bash
   cd backend
   python database_init.py
   ```

3. 의존성 설치:
   ```bash
   # 백엔드
   cd backend
   pip install -r requirements.txt
   
   # 프론트엔드
   cd frontend
   npm install
   ```

## 📊 프로젝트 통계

- **총 파일 수**: 396개 (node_modules, __pycache__ 제외)
- **백엔드 파일**: Python 파일들
- **프론트엔드 파일**: React Native/JavaScript 파일들
- **문서 파일**: Markdown 문서들
- **설정 파일**: 환경설정 및 배포 파일들

## 🎯 정리 완료

이 프로젝트는 기존의 복잡한 구조에서 깔끔하고 체계적인 구조로 완전히 정리되었습니다:

1. **백엔드**: 모든 서버 관련 코드가 `backend/` 폴더에 체계적으로 정리
2. **프론트엔드**: 모바일 앱 코드가 `frontend/` 폴더에 정리
3. **문서**: 모든 문서가 `docs/` 폴더에 정리
4. **스크립트**: 유틸리티 스크립트가 `scripts/` 폴더에 정리
5. **데이터**: 모든 데이터 파일이 `data/` 폴더에 정리
6. **테스트**: 테스트 코드가 `tests/` 폴더에 정리

이제 프로젝트를 더 쉽게 이해하고 유지보수할 수 있습니다! 🎉
