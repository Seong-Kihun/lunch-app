/**
 * 통합 네트워크 관리자
 * 모든 네트워크 관련 기능을 하나의 시스템으로 통합
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 네트워크 상태 상수
export const NETWORK_STATUS = {
  CONNECTED: 'connected',
  CONNECTING: 'connecting',
  DISCONNECTED: 'disconnected',
  ERROR: 'error'
};

// 통합 설정
const UNIFIED_CONFIG = {
  // 서버 URL 우선순위
  SERVER_URLS: {
    development: [
      'https://lunch-app-backend-ra12.onrender.com',  // 프로덕션 서버 우선
      'http://localhost:5000',
      'http://127.0.0.1:5000'
    ],
    production: [
      'https://lunch-app-backend-ra12.onrender.com'
    ]
  },
  
  // 네트워크 설정
  NETWORK: {
    TIMEOUT: 5000,  // 5초로 단축
    RETRY_ATTEMPTS: 2,  // 재시도 횟수 감소
    RETRY_DELAY: 1000
  },
  
  // 저장소 키
  STORAGE_KEYS: {
    SERVER_URL: 'unified_network_server_url',
    LAST_SUCCESS: 'unified_network_last_success',
    CONFIG_VERSION: 'unified_network_version'
  },
  
  // 설정 버전
  CONFIG_VERSION: '3.0.0'
};

class UnifiedNetworkManager {
  constructor() {
    this.currentServerURL = null;
    this.status = NETWORK_STATUS.DISCONNECTED;
    this.isInitialized = false;
    this.listeners = [];
    
    console.log('🔧 [UnifiedNetworkManager] 인스턴스 생성됨');
  }

  /**
   * 통합 초기화 - 간단하고 안정적
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('✅ [UnifiedNetworkManager] 이미 초기화됨');
      return this.currentServerURL;
    }

    try {
      console.log('🚀 [UnifiedNetworkManager] 초기화 시작...');
      this.status = NETWORK_STATUS.CONNECTING;
      this.notifyListeners();

      // 1. 환경 감지
      const environment = this.detectEnvironment();
      console.log(`🔍 [UnifiedNetworkManager] 환경: ${environment}`);

      // 2. 저장된 URL 확인 (빠른 타임아웃)
      const savedURL = await this.getSavedURLWithTimeout(1000);
      if (savedURL && await this.quickTest(savedURL)) {
        console.log('✅ [UnifiedNetworkManager] 저장된 URL 사용:', savedURL);
        await this.setServerURL(savedURL);
        return savedURL;
      }

      // 3. 기본 URL 목록에서 빠른 테스트
      const urls = UNIFIED_CONFIG.SERVER_URLS[environment];
      for (const url of urls) {
        if (await this.quickTest(url)) {
          console.log('✅ [UnifiedNetworkManager] URL 연결 성공:', url);
          await this.setServerURL(url);
          return url;
        }
      }

      // 4. 최종 폴백
      const fallbackURL = urls[0]; // 첫 번째 URL을 폴백으로 사용
      console.log('⚠️ [UnifiedNetworkManager] 폴백 URL 설정:', fallbackURL);
      await this.setServerURL(fallbackURL);
      return fallbackURL;

    } catch (error) {
      console.error('❌ [UnifiedNetworkManager] 초기화 에러:', error);
      
      // 에러가 발생해도 앱이 실행되도록 폴백 설정
      const fallbackURL = UNIFIED_CONFIG.SERVER_URLS.development[0];
      await this.setServerURL(fallbackURL);
      return fallbackURL;
    }
  }

  /**
   * 환경 감지
   */
  detectEnvironment() {
    return __DEV__ ? 'development' : 'production';
  }

  /**
   * 타임아웃이 있는 저장된 URL 확인
   */
  async getSavedURLWithTimeout(timeout = 1000) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const savedURL = await AsyncStorage.getItem(UNIFIED_CONFIG.STORAGE_KEYS.SERVER_URL);
      clearTimeout(timeoutId);
      
      return savedURL;
    } catch (error) {
      return null;
    }
  }

  /**
   * 빠른 연결 테스트
   */
  async quickTest(url) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(`${url}/api/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * 서버 URL 설정
   */
  async setServerURL(url) {
    this.currentServerURL = url;
    this.status = NETWORK_STATUS.CONNECTED;
    this.isInitialized = true;
    
    // 저장
    try {
      await AsyncStorage.setItem(UNIFIED_CONFIG.STORAGE_KEYS.SERVER_URL, url);
      await AsyncStorage.setItem(UNIFIED_CONFIG.STORAGE_KEYS.LAST_SUCCESS, Date.now().toString());
    } catch (error) {
      console.warn('⚠️ [UnifiedNetworkManager] URL 저장 실패:', error);
    }
    
    this.notifyListeners();
    console.log('✅ [UnifiedNetworkManager] 서버 URL 설정 완료:', url);
  }

  /**
   * 현재 서버 URL 반환
   */
  getServerURL() {
    return this.currentServerURL || UNIFIED_CONFIG.SERVER_URLS.development[0];
  }

  /**
   * 리스너 추가
   */
  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * 리스너들에게 알림
   */
  notifyListeners() {
    const state = {
      status: this.status,
      serverURL: this.currentServerURL,
      isConnected: this.status === NETWORK_STATUS.CONNECTED,
      isInitialized: this.isInitialized
    };
    
    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.warn('⚠️ [UnifiedNetworkManager] 리스너 에러:', error);
      }
    });
  }

  /**
   * 재연결
   */
  async reconnect() {
    console.log('🔄 [UnifiedNetworkManager] 재연결 시작...');
    this.isInitialized = false;
    return await this.initialize();
  }
}

// 싱글톤 인스턴스
const unifiedNetworkManager = new UnifiedNetworkManager();

// 기본 내보내기
export default unifiedNetworkManager;

// 유틸리티 함수들
export const initializeNetwork = () => unifiedNetworkManager.initialize();
export const getServerURL = () => unifiedNetworkManager.getServerURL();
export const reconnectNetwork = () => unifiedNetworkManager.reconnect();
export const addNetworkListener = (callback) => unifiedNetworkManager.addListener(callback);
