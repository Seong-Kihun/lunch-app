// API 설정
import { getServerURL } from './utils/networkUnifiedManager';

// 개발 환경 감지 (더 안전한 방법)
const isDevelopment = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV === 'development';

// 서버 URL - 통합 네트워크 관리자 사용
const RENDER_SERVER_URL = getServerURL();

// 기본 설정
const DEFAULT_LOCATION = {
  latitude: 37.5665,
  longitude: 126.9780,
};

const SEARCH_RADIUS = 1000; // 1km 

// 디버깅을 위한 로그
console.log('🔧 [Config] 서버 URL 설정:', RENDER_SERVER_URL);
console.log('🔧 [Config] 개발 환경:', isDevelopment);

// named export
export { RENDER_SERVER_URL, DEFAULT_LOCATION, SEARCH_RADIUS };

// default export
export default {
  RENDER_SERVER_URL,
  DEFAULT_LOCATION,
  SEARCH_RADIUS
}; 