/**
 * 통합된 네트워크 설정 관리
 * 모든 네트워크 관련 설정을 중앙에서 관리합니다.
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 설정 상수
const CONFIG = {
  // 서버 URL 목록 (우선순위 순)
  SERVER_URLS: {
    development: [
      'http://192.168.45.177:5000',   // 현재 실행 중인 서버 IP
      'http://localhost:5000',        // 로컬호스트 (가장 안정적)
      'http://127.0.0.1:5000',        // 로컬호스트 IP
      'https://lunch-app-backend-ra12.onrender.com'  // 프로덕션 백업
    ],
    production: [
      'https://lunch-app-backend-ra12.onrender.com'  // 프로덕션 서버
    ]
  },
  
  // 네트워크 설정
  NETWORK: {
    TIMEOUT: 10000,  // 10초
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000  // 1초
  },
  
  // 저장소 키
  STORAGE_KEYS: {
    SERVER_URL: 'network_config_server_url',
    LAST_SUCCESS: 'network_config_last_success',
    CONFIG_VERSION: 'network_config_version'
  },
  
  // 현재 설정 버전 (설정 변경 시 증가)
  CONFIG_VERSION: '1.0.0'
};

class NetworkConfig {
  constructor() {
    this.currentServerURL = null;
    this.isInitialized = false;
    this.configVersion = CONFIG.CONFIG_VERSION;
  }

  /**
   * 네트워크 설정 초기화
   */
  async initialize() {
    try {
      console.log('🔧 [NetworkConfig] 네트워크 설정 초기화 시작');
      
      // 1. 환경 감지
      const environment = this.detectEnvironment();
      console.log(`🔧 [NetworkConfig] 환경 감지: ${environment}`);
      
      // 2. 저장된 설정 확인
      const savedConfig = await this.loadSavedConfig();
      if (savedConfig && this.isConfigValid(savedConfig)) {
        console.log('🔧 [NetworkConfig] 저장된 설정 사용:', savedConfig.serverURL);
        this.currentServerURL = savedConfig.serverURL;
        this.isInitialized = true;
        return savedConfig.serverURL;
      }
      
      // 3. 서버 URL 자동 감지
      const detectedURL = await this.detectServerURL(environment);
      if (detectedURL) {
        console.log('🔧 [NetworkConfig] 서버 URL 감지 성공:', detectedURL);
        await this.saveConfig(detectedURL);
        this.currentServerURL = detectedURL;
        this.isInitialized = true;
        return detectedURL;
      }
      
      // 4. 기본값 사용
      const defaultURL = this.getDefaultURL(environment);
      console.log('🔧 [NetworkConfig] 기본 URL 사용:', defaultURL);
      this.currentServerURL = defaultURL;
      this.isInitialized = true;
      return defaultURL;
      
    } catch (error) {
      console.error('❌ [NetworkConfig] 초기화 실패:', error);
      const fallbackURL = this.getDefaultURL('development');
      this.currentServerURL = fallbackURL;
      this.isInitialized = true;
      return fallbackURL;
    }
  }

  /**
   * 환경 감지
   */
  detectEnvironment() {
    if (__DEV__) {
      return 'development';
    }
    return 'production';
  }

  /**
   * 저장된 설정 로드
   */
  async loadSavedConfig() {
    try {
      const serverURL = await AsyncStorage.getItem(CONFIG.STORAGE_KEYS.SERVER_URL);
      const lastSuccess = await AsyncStorage.getItem(CONFIG.STORAGE_KEYS.LAST_SUCCESS);
      const version = await AsyncStorage.getItem(CONFIG.STORAGE_KEYS.CONFIG_VERSION);
      
      if (serverURL && lastSuccess && version === this.configVersion) {
        return {
          serverURL,
          lastSuccess: parseInt(lastSuccess),
          version
        };
      }
      return null;
    } catch (error) {
      console.error('❌ [NetworkConfig] 저장된 설정 로드 실패:', error);
      return null;
    }
  }

  /**
   * 설정 유효성 검사
   */
  isConfigValid(config) {
    if (!config.serverURL || !config.lastSuccess) {
      return false;
    }
    
    // 24시간 이내의 설정만 유효
    const now = Date.now();
    const lastSuccess = config.lastSuccess;
    const twentyFourHours = 24 * 60 * 60 * 1000;
    
    return (now - lastSuccess) < twentyFourHours;
  }

  /**
   * 서버 URL 자동 감지
   */
  async detectServerURL(environment) {
    let urls = [...CONFIG.SERVER_URLS[environment]];
    
    // 개발 환경에서는 동적 IP 감지 추가
    if (environment === 'development') {
      const dynamicIPs = await this.detectDynamicIPs();
      urls = [...dynamicIPs, ...urls]; // 동적 IP를 우선순위로 설정
    }
    
    for (const url of urls) {
      try {
        console.log(`🔍 [NetworkConfig] 서버 연결 테스트: ${url}`);
        const isWorking = await this.testConnection(url);
        if (isWorking) {
          console.log(`✅ [NetworkConfig] 서버 연결 성공: ${url}`);
          return url;
        }
      } catch (error) {
        console.log(`❌ [NetworkConfig] 서버 연결 실패: ${url} - ${error.message}`);
      }
    }
    
    return null;
  }

  /**
   * 동적 IP 감지 (개발 환경용)
   */
  async detectDynamicIPs() {
    const dynamicIPs = [];
    
    try {
      // Expo Constants에서 IP 감지
      if (Constants.manifest?.debuggerHost) {
        const ip = Constants.manifest.debuggerHost.split(':')[0];
        dynamicIPs.push(`http://${ip}:5000`);
      }
      
      if (Constants.expoConfig?.hostUri) {
        const ip = Constants.expoConfig.hostUri.split(':')[0];
        dynamicIPs.push(`http://${ip}:5000`);
      }
      
      // 일반적인 로컬 네트워크 IP 범위
      const commonIPs = [
        '192.168.1.1', '192.168.0.1', '192.168.1.100', '192.168.0.100',
        '10.0.0.1', '10.0.0.100', '172.16.0.1', '172.20.10.1'
      ];
      
      commonIPs.forEach(ip => {
        dynamicIPs.push(`http://${ip}:5000`);
      });
      
      console.log(`🔍 [NetworkConfig] 동적 IP 감지: ${dynamicIPs.length}개`);
      return dynamicIPs;
    } catch (error) {
      console.warn('🔍 [NetworkConfig] 동적 IP 감지 실패:', error);
      return [];
    }
  }

  /**
   * 서버 연결 테스트
   */
  async testConnection(url) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.NETWORK.TIMEOUT);
      
      const response = await fetch(`${url}/api/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * 기본 URL 반환
   */
  getDefaultURL(environment) {
    const urls = CONFIG.SERVER_URLS[environment];
    return urls[0];
  }

  /**
   * 설정 저장
   */
  async saveConfig(serverURL) {
    try {
      const now = Date.now();
      await AsyncStorage.setItem(CONFIG.STORAGE_KEYS.SERVER_URL, serverURL);
      await AsyncStorage.setItem(CONFIG.STORAGE_KEYS.LAST_SUCCESS, now.toString());
      await AsyncStorage.setItem(CONFIG.STORAGE_KEYS.CONFIG_VERSION, this.configVersion);
      console.log('✅ [NetworkConfig] 설정 저장 완료');
    } catch (error) {
      console.error('❌ [NetworkConfig] 설정 저장 실패:', error);
    }
  }

  /**
   * 현재 서버 URL 반환
   */
  getCurrentServerURL() {
    if (!this.isInitialized) {
      console.warn('⚠️ [NetworkConfig] 아직 초기화되지 않음');
      return this.getDefaultURL('development');
    }
    return this.currentServerURL;
  }

  /**
   * 서버 URL 강제 설정
   */
  async setServerURL(url) {
    try {
      const isWorking = await this.testConnection(url);
      if (isWorking) {
        await this.saveConfig(url);
        this.currentServerURL = url;
        console.log('✅ [NetworkConfig] 서버 URL 설정 완료:', url);
        return true;
      } else {
        console.error('❌ [NetworkConfig] 서버 연결 실패:', url);
        return false;
      }
    } catch (error) {
      console.error('❌ [NetworkConfig] 서버 URL 설정 실패:', error);
      return false;
    }
  }

  /**
   * 설정 초기화
   */
  async reset() {
    try {
      await AsyncStorage.removeItem(CONFIG.STORAGE_KEYS.SERVER_URL);
      await AsyncStorage.removeItem(CONFIG.STORAGE_KEYS.LAST_SUCCESS);
      await AsyncStorage.removeItem(CONFIG.STORAGE_KEYS.CONFIG_VERSION);
      this.currentServerURL = null;
      this.isInitialized = false;
      console.log('🔄 [NetworkConfig] 설정 초기화 완료');
    } catch (error) {
      console.error('❌ [NetworkConfig] 설정 초기화 실패:', error);
    }
  }
}

// 싱글톤 인스턴스
const networkConfig = new NetworkConfig();

// 기본 내보내기
export default networkConfig;

// 유틸리티 함수들
export const getServerURL = () => networkConfig.getCurrentServerURL();
export const initializeNetwork = () => networkConfig.initialize();
export const setServerURL = (url) => networkConfig.setServerURL(url);
export const resetNetworkConfig = () => networkConfig.reset();
