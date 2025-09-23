# 🚀 반복 일정 시스템 개선 가이드

## 📋 개요

이 문서는 앱의 반복 일정 시스템을 **"백엔드는 똑똑한 공장, 프론트엔드는 충실한 창구"** 철학으로 개선한 내용을 설명합니다.

## 🎯 핵심 개선 사항

### 1. 백엔드 재건축 (The Single Source of Truth)
- **데이터베이스 모델 재설계**: 반복 규칙 기반 마스터 일정 + 예외 처리
- **API 엔드포인트 재설계**: 기간별 일정 조회, CRUD, 예외 처리
- **서비스 레이어**: 복잡한 반복 일정 계산을 백엔드에서 처리

### 2. 프론트엔드 단순화 (Delegate and Display)
- **React Query 도입**: 자동 데이터 관리 및 캐싱
- **Context 제거**: 복잡한 상태 관리 로직 완전 제거
- **API 기반**: 백엔드에서 계산된 결과만 표시

## 🏗️ 새로운 아키텍처

### 백엔드 구조
```
models/
├── schedule_models.py          # 새로운 데이터베이스 모델
├── PersonalSchedule            # 반복 규칙을 저장하는 마스터 일정
└── ScheduleException          # 특정 날짜의 예외 처리

services/
└── schedule_service.py        # 반복 일정 계산 및 관리 서비스

api/
└── schedules.py               # 새로운 API 엔드포인트
```

### 프론트엔드 구조
```
hooks/
└── useScheduleQuery.js        # React Query 기반 일정 관리 훅

services/
└── apiClient.js               # 백엔드 API 클라이언트

screens/
└── Home/
    └── HomeScreen.js          # 새로운 HomeScreen (React Query 사용)
```

## 🔧 설치 및 설정

### 1. 백엔드 설정
```bash
# 새로운 모델 테이블 생성
python migrate_schedule_models.py

# 서버 실행
python app.py
```

### 2. 프론트엔드 설정
```bash
# React Query 설치 (이미 설치됨)
npm install @tanstack/react-query

# 앱 실행
npm start
```

## 📱 사용법

### 1. 일정 생성
```javascript
import { useCreateSchedule } from '../hooks/useScheduleQuery';

const createScheduleMutation = useCreateSchedule();

// 일정 생성
const handleCreate = async () => {
    const scheduleData = {
        employee_id: '1',
        title: '점심 약속',
        start_date: '2024-01-15',
        time: '12:00',
        is_recurring: true,
        recurrence_type: 'weekly',
        recurrence_interval: 1
    };
    
    await createScheduleMutation.mutateAsync(scheduleData);
};
```

### 2. 일정 조회
```javascript
import { useMonthSchedules } from '../hooks/useScheduleQuery';

const { data: schedules, isLoading, error } = useMonthSchedules(employeeId, monthDate);
```

### 3. 일정 수정/삭제
```javascript
import { useUpdateSchedule, useDeleteSchedule } from '../hooks/useScheduleQuery';

const updateScheduleMutation = useUpdateSchedule();
const deleteScheduleMutation = useDeleteSchedule();

// 모든 반복 일정 수정
await updateScheduleMutation.mutateAsync({ scheduleId: 1, updateData: { title: '새 제목' } });

// 모든 반복 일정 삭제
await deleteScheduleMutation.mutateAsync(1);
```

### 4. 예외 처리 (이 날짜만 수정/삭제)
```javascript
import { useCreateScheduleException } from '../hooks/useScheduleQuery';

const createExceptionMutation = useCreateScheduleException();

// 특정 날짜만 수정
await createExceptionMutation.mutateAsync({
    scheduleId: 1,
    exceptionData: {
        exception_date: '2024-01-20',
        is_modified: true,
        new_title: '이 날짜만 다른 제목',
        new_time: '13:00'
    }
});

// 특정 날짜만 삭제
await createExceptionMutation.mutateAsync({
    scheduleId: 1,
    exceptionData: {
        exception_date: '2024-01-20',
        is_deleted: true
    }
});
```

## 🔄 데이터 흐름

### 1. 일정 생성
```
프론트엔드 → 백엔드 API → 데이터베이스 저장 → React Query 캐시 무효화 → 자동 갱신
```

### 2. 일정 조회
```
프론트엔드 → React Query → 백엔드 API → 반복 일정 계산 + 예외 적용 → 프론트엔드 표시
```

### 3. 일정 수정/삭제
```
프론트엔드 → 백엔드 API → 데이터베이스 업데이트 → React Query 캐시 무효화 → 자동 갱신
```

## 🎨 UI 개선 사항

### 1. 달력 표시
- **자동 마킹**: 백엔드에서 계산된 일정을 자동으로 달력에 표시
- **반복 표시**: 반복 일정임을 명확하게 표시
- **예외 표시**: 수정/삭제된 날짜를 시각적으로 구분

### 2. 일정 목록
- **날짜별 그룹화**: 백엔드에서 그룹화된 데이터를 그대로 표시
- **반복 배지**: 반복 일정임을 명확하게 표시
- **로딩 상태**: 데이터 로딩 중 사용자에게 피드백 제공

## 🚀 성능 개선

### 1. 백엔드
- **쿼리 최적화**: 필요한 데이터만 조회
- **캐싱**: 자주 사용되는 계산 결과 캐싱
- **배치 처리**: 여러 일정을 한 번에 처리

### 2. 프론트엔드
- **React Query**: 자동 캐싱 및 백그라운드 갱신
- **메모이제이션**: 불필요한 리렌더링 방지
- **지연 로딩**: 필요한 데이터만 로드

## 🧪 테스트

### 1. 백엔드 테스트
```bash
# 마이그레이션 테스트
python migrate_schedule_models.py

# API 테스트
curl -X GET "http://localhost:5000/api/schedules/?employee_id=1&start_date=2024-01-01&end_date=2024-01-31"
```

### 2. 프론트엔드 테스트
```bash
# 앱 실행
npm start

# 일정 생성/수정/삭제 테스트
# 달력 마킹 테스트
# 반복 일정 표시 테스트
```

## 🔍 문제 해결

### 1. 일반적인 문제들
- **일정이 표시되지 않음**: 백엔드 API 응답 확인, React Query 캐시 확인
- **반복 일정 계산 오류**: 백엔드 로그 확인, 데이터베이스 스키마 확인
- **UI 업데이트 지연**: React Query 캐시 무효화 확인

### 2. 디버깅 팁
- **백엔드 로그**: 일정 계산 과정 상세 로그
- **프론트엔드 로그**: React Query 상태 및 API 호출 로그
- **네트워크 탭**: API 요청/응답 확인

## 📈 향후 개선 계획

### 1. 단기 계획
- [ ] 기존 일정 데이터 마이그레이션 완료
- [ ] 모든 일정 관련 화면에 새로운 시스템 적용
- [ ] 사용자 피드백 수집 및 개선

### 2. 장기 계획
- [ ] 고급 반복 규칙 지원 (매월 첫째 주, 마지막 주 등)
- [ ] 일정 충돌 감지 및 해결
- [ ] 팀 일정 동기화
- [ ] 모바일 푸시 알림

## 🤝 기여 방법

1. **이슈 리포트**: 버그나 개선 사항 발견 시 이슈 생성
2. **코드 리뷰**: PR에 대한 코드 리뷰 참여
3. **문서 개선**: README나 코드 주석 개선
4. **테스트**: 새로운 기능에 대한 테스트 케이스 작성

## 📞 지원

문제가 발생하거나 질문이 있으면:
1. **이슈 생성**: GitHub 이슈에 상세한 설명과 함께 생성
2. **로그 첨부**: 오류 발생 시 관련 로그 첨부
3. **재현 단계**: 문제를 재현할 수 있는 단계별 설명 제공

---

**🎉 새로운 반복 일정 시스템을 통해 더 안정적이고 강력한 일정 관리가 가능합니다!**

