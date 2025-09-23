// 서버 설정 - 개발 환경에서는 네트워크 IP 사용
const getServerUrl = () => {
    // 개발 환경에서는 네트워크 IP 사용
    if (__DEV__) {
        return 'http://172.30.1.43:5000'; // 네트워크 IP
    }
    
    // 프로덕션 환경
    return 'https://lunch-app-backend-ra12.onrender.com';
};

export const SERVER_URL = getServerUrl();
export const RENDER_SERVER_URL = getServerUrl();

// 🚨 중요: 개발 환경에서도 실제 API 호출 (테스트를 위해)
export const IS_DEVELOPMENT = false; // 개발 환경에서도 API 호출 활성화

// API 설정
export const API_BASE_URL = RENDER_SERVER_URL;

// 개발용 인증 토큰 (개발 환경에서만 사용)
export const DEV_AUTH_TOKEN = __DEV__ ? 'dev-token-12345' : null;

// API 요청 헤더 생성 함수
export const getAuthHeaders = () => {
    if (__DEV__ && DEV_AUTH_TOKEN) {
        return {
            'Authorization': `Bearer ${DEV_AUTH_TOKEN}`,
            'Content-Type': 'application/json'
        };
    }
    return {
        'Content-Type': 'application/json'
    };
};

// API 요청 래퍼 함수 (자동으로 개발용 토큰 적용)
export const apiRequest = async (url, options = {}) => {
    const headers = {
        ...getAuthHeaders(),
        ...options.headers
    };
    
    const response = await fetch(url, {
        ...options,
        headers
    });
    
    return response;
};

// 디버깅용 로그
console.log('🔧 [Config] 서버 URL 설정:', SERVER_URL);
console.log('🔧 [Config] 개발 환경:', __DEV__);
console.log('🔧 [Config] 개발용 토큰:', DEV_AUTH_TOKEN ? '사용' : '미사용');

// 기타 설정
export const APP_CONFIG = {
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    debug: process.env.NODE_ENV === 'development'
};
