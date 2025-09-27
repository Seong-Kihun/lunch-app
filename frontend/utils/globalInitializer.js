import { COLORS } from '../theme/colors';

// 전역 변수 초기화 함수
export const initializeGlobalVariables = () => {
    // 전역 테마 변수 초기화
    global.currentColors = COLORS.light;
    global.colors = COLORS.light;
    global.isDarkMode = false;
    
    // 전역 일정 변수 초기화
    global.newPersonalSchedule = null;
    global.updatedPersonalSchedule = null;
    global.deletedPersonalSchedule = null;
    global.newPartySchedule = null;
    
    // 전역 새로고침 플래그 초기화
    global.forceRefreshHome = false;
    global.forceRefreshTimestamp = null;
    
    // 전역 사용자 정보 초기화 (프로덕션 환경에서는 기본값 설정하지 않음)
    global.myEmployeeId = null; // 실제 인증된 사용자 ID만 사용
    global.authToken = null;
    
    console.log('✅ 전역 변수 초기화 완료');
};
