// 네트워크 감지 및 서버 URL 자동 설정 유틸리티

import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * 현재 네트워크 환경에 맞는 서버 URL을 동적으로 감지합니다.
 * @returns {string} 서버 URL
 */
export const detectServerURL = () => {
  // 개발 환경에서는 강제로 로컬 서버 사용
  if (__DEV__) {
    console.log('🔧 [NetworkDetector] 개발 환경: 로컬 서버 강제 사용');
    return 'http://192.168.45.177:5000';
  }

  // 프로덕션 환경인 경우
  return 'https://lunch-app-backend-ra12.onrender.com';
};

/**
 * 네트워크 연결 상태를 확인합니다.
 * @returns {Promise<boolean>} 연결 가능 여부
 */
export const checkNetworkConnection = async () => {
  try {
    const serverURL = detectServerURL();
    const response = await fetch(`${serverURL}/health`, {
      method: 'GET',
      timeout: 5000
    });
    return response.ok;
  } catch (error) {
    console.warn('⚠️ [NetworkDetector] 네트워크 연결 확인 실패:', error);
    return false;
  }
};

/**
 * 사용 가능한 서버 URL 목록을 반환합니다.
 * @returns {Array<string>} 서버 URL 목록
 */
export const getAvailableServerURLs = () => {
  const urls = [];
  
  // Render 서버
  urls.push('https://lunch-app-backend-ra12.onrender.com');
  
  // Expo debuggerHost
  if (Constants.manifest && Constants.manifest.debuggerHost) {
    const debuggerHost = Constants.manifest.debuggerHost.split(':')[0];
    urls.push(`http://${debuggerHost}:5000`);
  }
  
  // Expo hostUri
  if (Constants.expoConfig && Constants.expoConfig.hostUri) {
    const hostUri = Constants.expoConfig.hostUri.split(':')[0];
    urls.push(`http://${hostUri}:5000`);
  }
  
  // 일반적인 로컬 IP들
  const commonIPs = [
    '192.168.1.1',
    '192.168.0.1',
    '10.0.0.1',
    '172.16.0.1',
    '172.20.10.1',
    '192.168.43.1'
  ];
  
  commonIPs.forEach(ip => {
    urls.push(`http://${ip}:5000`);
  });
  
  return [...new Set(urls)]; // 중복 제거
};

export default {
  detectServerURL,
  checkNetworkConnection,
  getAvailableServerURLs
};
