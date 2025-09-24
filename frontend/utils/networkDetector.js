// 네트워크 감지 및 서버 URL 자동 설정 유틸리티

import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * 현재 네트워크 환경에 맞는 서버 URL을 동적으로 감지합니다.
 * @returns {string} 서버 URL
 */
export const detectServerURL = () => {
  // 프로덕션 환경인 경우
  if (!__DEV__) {
    return 'https://lunch-app-backend-ra12.onrender.com';
  }

  try {
    // 1. Expo Constants에서 debuggerHost 확인
    if (Constants.manifest && Constants.manifest.debuggerHost) {
      const debuggerHost = Constants.manifest.debuggerHost.split(':')[0];
      console.log('🔍 [NetworkDetector] Expo debuggerHost 감지:', debuggerHost);
      return `http://${debuggerHost}:5000`;
    }

    // 2. Expo Constants 2.x 방식
    if (Constants.expoConfig && Constants.expoConfig.hostUri) {
      const hostUri = Constants.expoConfig.hostUri.split(':')[0];
      console.log('🔍 [NetworkDetector] Expo hostUri 감지:', hostUri);
      return `http://${hostUri}:5000`;
    }

    // 2.5. Expo Constants에서 LAN IP 감지
    if (Constants.expoConfig && Constants.expoConfig.debuggerHost) {
      const debuggerHost = Constants.expoConfig.debuggerHost.split(':')[0];
      console.log('🔍 [NetworkDetector] Expo debuggerHost 감지:', debuggerHost);
      return `http://${debuggerHost}:5000`;
    }

    // 3. Metro bundler의 기본 IP들 시도 (더 포괄적인 범위)
    const commonIPs = [
      '192.168.1.1',
      '192.168.0.1', 
      '192.168.45.177', // 현재 백엔드가 실행 중인 IP
      '10.0.0.1',
      '172.16.0.1',
      '172.20.10.1', // iPhone 핫스팟
      '172.30.1.43', // 이전에 사용되던 IP
      '192.168.43.1', // Android 핫스팟
      'localhost',
      '127.0.0.1'
    ];

    // 4. 플랫폼별 기본값
    if (Platform.OS === 'web') {
      return 'http://localhost:5000';
    }

    // 5. 기본값으로 localhost 사용
    console.warn('⚠️ [NetworkDetector] 네트워크 자동 감지 실패, localhost 사용');
    return 'http://localhost:5000';

  } catch (error) {
    console.error('❌ [NetworkDetector] 서버 URL 감지 중 오류:', error);
    return 'http://localhost:5000';
  }
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
  
  // localhost
  urls.push('http://localhost:5000');
  urls.push('http://127.0.0.1:5000');
  
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
