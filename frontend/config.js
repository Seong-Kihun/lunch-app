// API 설정
// 주의: getServerURL은 비동기 함수이므로 여기서는 사용하지 않음
// 대신 컴포넌트에서 useUnifiedNetwork 훅을 사용하거나 동적으로 가져와야 함

// 개발 환경 감지 (더 안전한 방법)
const isDevelopment = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV === 'development';

// 기본 서버 URL (폴백용)
const DEFAULT_SERVER_URL = isDevelopment 
  ? 'https://lunch-app-backend-ra12.onrender.com' 
  : 'https://lunch-app-backend-ra12.onrender.com';

// 동적 서버 URL을 가져오는 함수
export const getDynamicServerURL = async () => {
  try {
    const { getServerURL } = await import('./utils/networkUnifiedManager');
    return getServerURL();
  } catch (error) {
    console.warn('⚠️ [Config] 동적 서버 URL 가져오기 실패, 기본 URL 사용:', error);
    return DEFAULT_SERVER_URL;
  }
};

// 기본 설정
const DEFAULT_LOCATION = {
  latitude: 37.5665,
  longitude: 126.9780,
};

const SEARCH_RADIUS = 1000; // 1km 

// 디버깅을 위한 로그
console.log('🔧 [Config] 기본 서버 URL:', DEFAULT_SERVER_URL);
console.log('🔧 [Config] 개발 환경:', isDevelopment);
console.log('🔧 [Config] unifiedApiClient 사용을 권장합니다');

// named export
export { DEFAULT_LOCATION, SEARCH_RADIUS };

// default export
export default {
  DEFAULT_LOCATION,
  SEARCH_RADIUS
}; 