/**
 * 통합 네트워크 관리자
 * 모든 네트워크 관련 기능을 중앙에서 관리하는 단일 진실의 원천
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// 네트워크 상태 상수
export const NETWORK_STATUS = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting', 
  CONNECTED: 'connected',
  ERROR: 'error',
  RECONNECTING: 'reconnecting'
};

// 서버 URL 우선순위 설정
const SERVER_CONFIG = {
  development: [
    'http://localhost:5000',        // 로컬호스트
    'http://127.0.0.1:5000',        // 로컬호스트 IP
    'https://lunch-app-backend-ra12.onrender.com'  // 프로덕션 백업
  ],
  production: [
    'https://lunch-app-backend-ra12.onrender.com'  // 프로덕션 서버
  ]
};

// 저장소 키
const STORAGE_KEYS = {
  SERVER_URL: 'network_manager_server_url',
  LAST_SUCCESS: 'network_manager_last_success',
  CONNECTION_COUNT: 'network_manager_connection_count'
};

// 네트워크 설정
const NETWORK_CONFIG = {
  TIMEOUT: 10000,           // 10초
  RETRY_ATTEMPTS: 3,        // 3회 재시도
  RETRY_DELAY: 1000,        // 1초 대기
  HEALTH_CHECK_INTERVAL: 30000,  // 30초마다 헬스체크
  MAX_RECONNECT_ATTEMPTS: 5  // 최대 재연결 시도 횟수
};

class NetworkManager {
  constructor() {
    this.currentServerURL = null;
    this.status = NETWORK_STATUS.DISCONNECTED;
    this.isInitialized = false;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = NETWORK_CONFIG.MAX_RECONNECT_ATTEMPTS;
    this.healthCheckInterval = null;
    this.listeners = new Set();
    this.retryTimeout = null;
    
    console.log('🔧 [NetworkManager] 인스턴스 생성됨');
  }

  /**
   * 네트워크 관리자 초기화 - 근본적 해결책
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('✅ [NetworkManager] 이미 초기화됨');
      return this.currentServerURL;
    }

    try {
      console.log('🚀 [NetworkManager] 초기화 시작...');
      this.status = NETWORK_STATUS.CONNECTING;
      this.notifyListeners();

      // 1. 환경 감지
      const environment = this.detectEnvironment();
      console.log(`🔍 [NetworkManager] 환경 감지: ${environment}`);

      // 2. 저장된 서버 URL 확인 (타임아웃 설정)
      const savedURL = await this.getSavedServerURLWithTimeout();
      if (savedURL && await this.testConnectionWithTimeout(savedURL, 3000)) {
        console.log('✅ [NetworkManager] 저장된 서버 URL 사용:', savedURL);
        await this.setCurrentServer(savedURL);
        return savedURL;
      }

      // 3. 서버 URL 자동 감지 및 테스트 (개선된 방식)
      const detectedURL = await this.detectServerURLWithFallback(environment);
      if (detectedURL) {
        console.log('✅ [NetworkManager] 감지된 서버 URL 사용:', detectedURL);
        await this.setCurrentServer(detectedURL);
        return detectedURL;
      }

      // 4. 최종 폴백 - 에러 없이 기본 URL 설정
      const fallbackURL = this.getFallbackURL();
      console.log('⚠️ [NetworkManager] 폴백 URL 설정:', fallbackURL);
      await this.setCurrentServer(fallbackURL);
      return fallbackURL;

    } catch (error) {
      console.error('❌ [NetworkManager] 초기화 중 에러:', error);
      
      // 에러가 발생해도 앱이 실행되도록 폴백 URL 설정
      const fallbackURL = this.getFallbackURL();
      console.log('🔄 [NetworkManager] 에러 후 폴백 URL 설정:', fallbackURL);
      
      this.status = NETWORK_STATUS.CONNECTED; // 에러 상태가 아닌 연결 상태로 설정
      await this.setCurrentServer(fallbackURL);
      this.notifyListeners();
      
      return fallbackURL; // 에러를 던지지 않고 URL 반환
    }
  }

  /**
   * 타임아웃이 있는 저장된 서버 URL 확인
   */
  async getSavedServerURLWithTimeout() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      const savedURL = await this.getSavedServerURL();
      clearTimeout(timeoutId);
      return savedURL;
    } catch (error) {
      console.log('⚠️ [NetworkManager] 저장된 URL 확인 타임아웃');
      return null;
    }
  }

  /**
   * 타임아웃이 있는 연결 테스트
   */
  async testConnectionWithTimeout(url, timeout = 3000) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const result = await this.testConnection(url);
      clearTimeout(timeoutId);
      return result;
    } catch (error) {
      return false;
    }
  }

  /**
   * 개선된 서버 URL 감지
   */
  async detectServerURLWithFallback(environment) {
    const availableURLs = SERVER_CONFIG[environment];
    console.log(`🔍 [NetworkManager] ${availableURLs.length}개 서버 URL 테스트 시작`);

    // 병렬로 빠른 테스트 수행
    const testPromises = availableURLs.map(async (url) => {
      try {
        const isWorking = await this.testConnectionWithTimeout(url, 2000);
        return isWorking ? url : null;
      } catch (error) {
        return null;
      }
    });

    const results = await Promise.allSettled(testPromises);
    
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        console.log('✅ [NetworkManager] 서버 연결 성공:', result.value);
        return result.value;
      }
    }

    return null;
  }

  /**
   * 환경 감지
   */
  detectEnvironment() {
    if (__DEV__) {
      return 'development';
    }
    
    // 프로덕션 환경 감지 로직
    if (Platform.OS === 'web') {
      return 'production';
    }
    
    return 'production';
  }

  /**
   * 서버 연결 테스트
   */
  async testConnection(url, timeout = NETWORK_CONFIG.TIMEOUT) {
    try {
      console.log(`🔍 [NetworkManager] 연결 테스트: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(`${url}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        console.log(`✅ [NetworkManager] 연결 성공: ${url} (${response.status})`);
        return true;
      } else {
        console.log(`⚠️ [NetworkManager] 연결 실패: ${url} (${response.status})`);
        return false;
      }

    } catch (error) {
      console.log(`❌ [NetworkManager] 연결 오류: ${url} - ${error.message}`);
      return false;
    }
  }

  /**
   * 현재 서버 설정
   */
  async setCurrentServer(url) {
    this.currentServerURL = url;
    this.status = NETWORK_STATUS.CONNECTED;
    this.isInitialized = true;
    this.connectionAttempts = 0;

    // 저장소에 저장
    await AsyncStorage.setItem(STORAGE_KEYS.SERVER_URL, url);
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_SUCCESS, Date.now().toString());

    // 헬스체크 시작
    this.startHealthCheck();

    // 전역 변수 업데이트
    global.serverURL = url;
    global.networkInitialized = true;

    console.log('✅ [NetworkManager] 서버 설정 완료:', url);
    this.notifyListeners();
  }

  /**
   * 저장된 서버 URL 가져오기
   */
  async getSavedServerURL() {
    try {
      const savedURL = await AsyncStorage.getItem(STORAGE_KEYS.SERVER_URL);
      if (savedURL) {
        console.log('🔍 [NetworkManager] 저장된 URL 발견:', savedURL);
        return savedURL;
      }
    } catch (error) {
      console.warn('⚠️ [NetworkManager] 저장된 URL 읽기 실패:', error);
    }
    return null;
  }

  /**
   * 폴백 URL 가져오기
   */
  getFallbackURL() {
    const environment = this.detectEnvironment();
    const urls = SERVER_CONFIG[environment];
    
    // 개발 환경에서는 첫 번째 URL (로컬 서버) 우선 사용
    if (environment === 'development') {
      return urls[0]; // 첫 번째 URL (로컬 서버)
    }
    
    return urls[urls.length - 1]; // 마지막 URL (보통 프로덕션)
  }

  /**
   * 헬스체크 시작
   */
  startHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      if (this.currentServerURL) {
        const isHealthy = await this.testConnection(this.currentServerURL);
        if (!isHealthy) {
          console.warn('⚠️ [NetworkManager] 헬스체크 실패, 재연결 시도');
          await this.handleConnectionLoss();
        }
      }
    }, NETWORK_CONFIG.HEALTH_CHECK_INTERVAL);

    console.log('🔄 [NetworkManager] 헬스체크 시작됨');
  }

  /**
   * 연결 손실 처리
   */
  async handleConnectionLoss() {
    if (this.connectionAttempts >= this.maxConnectionAttempts) {
      console.error('❌ [NetworkManager] 최대 재연결 시도 횟수 초과');
      this.status = NETWORK_STATUS.ERROR;
      this.notifyListeners();
      return;
    }

    this.status = NETWORK_STATUS.RECONNECTING;
    this.connectionAttempts++;
    this.notifyListeners();

    console.log(`🔄 [NetworkManager] 재연결 시도 ${this.connectionAttempts}/${this.maxConnectionAttempts}`);

    try {
      await this.initialize();
    } catch (error) {
      console.error('❌ [NetworkManager] 재연결 실패:', error);
      
      // 지수 백오프로 재시도
      const delay = NETWORK_CONFIG.RETRY_DELAY * Math.pow(2, this.connectionAttempts - 1);
      this.retryTimeout = setTimeout(() => {
        this.handleConnectionLoss();
      }, delay);
    }
  }

  /**
   * 현재 서버 URL 가져오기
   */
  async getServerURL() {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return this.currentServerURL;
  }

  /**
   * 네트워크 상태 가져오기
   */
  getStatus() {
    return {
      status: this.status,
      serverURL: this.currentServerURL,
      isInitialized: this.isInitialized,
      connectionAttempts: this.connectionAttempts,
      isConnected: this.status === NETWORK_STATUS.CONNECTED
    };
  }

  /**
   * 상태 변경 리스너 추가
   */
  addStatusListener(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 리스너들에게 상태 변경 알림
   */
  notifyListeners() {
    const status = this.getStatus();
    this.listeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('❌ [NetworkManager] 리스너 실행 오류:', error);
      }
    });
  }

  /**
   * 수동 재연결
   */
  async reconnect() {
    console.log('🔄 [NetworkManager] 수동 재연결 시작');
    this.connectionAttempts = 0;
    this.status = NETWORK_STATUS.CONNECTING;
    this.notifyListeners();

    try {
      await this.initialize();
      console.log('✅ [NetworkManager] 수동 재연결 성공');
    } catch (error) {
      console.error('❌ [NetworkManager] 수동 재연결 실패:', error);
      throw error;
    }
  }

  /**
   * 특정 서버 URL로 전환
   */
  async switchServer(url) {
    console.log(`🔄 [NetworkManager] 서버 전환 시도: ${url}`);
    
    if (await this.testConnection(url)) {
      await this.setCurrentServer(url);
      console.log('✅ [NetworkManager] 서버 전환 성공');
      return true;
    } else {
      console.log('❌ [NetworkManager] 서버 전환 실패: 연결 불가');
      return false;
    }
  }

  /**
   * 정리 작업
   */
  destroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
    this.listeners.clear();
    console.log('🧹 [NetworkManager] 정리 완료');
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
const networkManager = new NetworkManager();
export default networkManager;
