// 날짜 관련 유틸리티 함수들

// 한국 시간 기준으로 오늘 날짜를 가져오는 함수
export const getKoreanToday = () => {
    try {
        // 현재 시간
        const now = new Date();
        
        // 더 간단하고 정확한 방법으로 한국 시간 계산
        // 현재 로컬 시간을 사용하되, 한국 시간대 오프셋을 고려
        const koreanOffset = 9 * 60; // 한국은 UTC+9 (분 단위)
        const localOffset = now.getTimezoneOffset(); // 로컬 시간대 오프셋 (분 단위)
        const totalOffset = koreanOffset + localOffset; // 총 오프셋
        
        // 한국 시간으로 변환
        const koreanTime = new Date(now.getTime() + (totalOffset * 60 * 1000));
        
        // 오늘 날짜 (시간은 00:00:00으로 설정)
        const koreanToday = new Date(koreanTime.getFullYear(), koreanTime.getMonth(), koreanTime.getDate(), 0, 0, 0, 0);
        
        console.log('🔍 [Utils] getKoreanToday:', {
            now: now.toISOString(),
            koreanTime: koreanTime.toISOString(),
            koreanToday: koreanToday.toISOString().split('T')[0],
            dayOfWeek: koreanToday.getDay(),
            weekday: ['일', '월', '화', '수', '목', '금', '토'][koreanToday.getDay()]
        });
        
        return koreanToday;
    } catch (error) {
        console.error('🔍 [Utils] getKoreanToday 에러:', error);
        
        // 에러 발생 시 현재 로컬 시간 사용 (fallback)
        const fallbackTime = new Date();
        fallbackTime.setHours(0, 0, 0, 0);
        
        console.log('🔍 [Utils] getKoreanToday fallback:', fallbackTime.toISOString().split('T')[0]);
        return fallbackTime;
    }
};

export const toKoreanDateString = (date) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
        return '';
    }
    return date.toLocaleDateString('ko-KR');
};

export const toLocalDateString = (date) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
        return '';
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// 네비게이션 유틸리티 함수
export const safeNavigateToTab = (navigation, tabName, screenName, params, keepCurrentTab = false) => {
    try {
        if (keepCurrentTab) {
            navigation.navigate(screenName, params);
        } else {
            // 각 탭의 기본 스크린 매핑
            const tabDefaultScreens = {
                '홈': 'HomeScreen',
                '맛집': 'RestaurantsList',
                '파티': 'PartiesScreen',
                '소통': 'ChatList',
                '친구': 'FriendMain'
            };

            const defaultScreen = tabDefaultScreens[tabName];
            
            if (defaultScreen) {
                // 1단계: 해당 탭의 기본 스크린으로 먼저 이동
                navigation.navigate(tabName, { screen: defaultScreen });
                
                // 2단계: 약간의 지연 후 원하는 스크린으로 이동
                setTimeout(() => {
                    try {
                        navigation.navigate(tabName, { screen: screenName, params });
                    } catch (error) {
                        console.warn('Utils safeNavigateToTab: 2단계 네비게이션 실패:', error);
                        // fallback으로 직접 이동 시도
                        try {
                            navigation.navigate(tabName, { screen: screenName, params });
                        } catch (fallbackError) {
                            console.error('Utils safeNavigateToTab: 모든 네비게이션 방법 실패:', fallbackError);
                        }
                    }
                }, 150);
            } else {
                // 기본 스크린이 정의되지 않은 경우 직접 이동
                navigation.navigate(tabName, { screen: screenName, params });
            }
        }
    } catch (error) {
        console.error('네비게이션 오류:', error);
        // 에러 발생 시 직접 이동 시도
        try {
            navigation.navigate(screenName, params);
        } catch (fallbackError) {
            console.error('fallback 네비게이션도 실패:', fallbackError);
        }
    }
};

// 전역 변수들
import dynamicConfig from '../../config/dynamicConfig';

// 개발 환경 감지
const isDevelopment = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV === 'development';

// 동적 서버 URL (초기화 후 사용)
let dynamicServerURL = null;

// 서버 URL 초기화 함수
const initializeServerURL = async () => {
    if (dynamicServerURL) {
        return dynamicServerURL;
    }

    try {
        // 동적 서버 URL 감지 사용
        const { getServerURL } = await import('../../utils/networkUtils');
        dynamicServerURL = await getServerURL();
        
        console.log('🔧 [Utils] 동적 서버 URL 설정:', dynamicServerURL);
        console.log('🔧 [Utils] 개발 환경:', isDevelopment);
        
        return dynamicServerURL;
    } catch (error) {
        console.error('❌ [Utils] 서버 URL 초기화 실패:', error);
        // fallback
        dynamicServerURL = 'https://lunch-app-backend-ra12.onrender.com';
        return dynamicServerURL;
    }
};

// 서버 URL 가져오기 (비동기)
export const getServerURL = async () => {
    return await initializeServerURL();
};

// 기존 호환성을 위한 동기 함수 (기본값)
export const RENDER_SERVER_URL = 'https://lunch-app-backend-ra12.onrender.com';

// 환경별 API 경로 설정
export const API_PREFIX = __DEV__ ? '/dev' : '/api';

// API URL 생성 헬퍼 함수
export const getApiUrl = (endpoint) => {
    // endpoint가 이미 /로 시작하는 경우 제거
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return `${RENDER_SERVER_URL}${API_PREFIX}/${cleanEndpoint}`;
};

// 네트워크 변경 시 설정 리셋
export const resetNetworkConfig = () => {
    dynamicConfig.reset();
    dynamicServerURL = null;
    console.log('🔄 [Utils] 네트워크 설정 리셋됨');
};

// 현재 사용자 ID를 가져오는 함수
export const getMyEmployeeId = () => {
    try {
        // global.currentUser에서 employee_id 가져오기
        if (global.currentUser && global.currentUser.employee_id) {
            return global.currentUser.employee_id;
        }
        
        // fallback: 기본값
        console.warn('🔍 [Utils] global.currentUser에서 employee_id를 찾을 수 없음, 기본값 사용');
        return 'default_id';
    } catch (error) {
        console.error('🔍 [Utils] getMyEmployeeId 오류:', error);
        return 'default_id';
    }
};
