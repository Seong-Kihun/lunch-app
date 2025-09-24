// 네트워크 초기화 및 연결 관리 유틸리티

import { detectServerURL, checkNetworkConnection, getAvailableServerURLs } from './networkDetector';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NETWORK_CONFIG_KEY = 'network_config';
const SERVER_URL_KEY = 'server_url';

class NetworkInitializer {
  constructor() {
    this.currentServerURL = null;
    this.isInitialized = false;
    this.retryCount = 0;
    this.maxRetries = 3;
  }

  /**
   * 네트워크 초기화
   */
  async initialize() {
    try {
      console.log('🔧 [NetworkInitializer] 네트워크 초기화 시작...');
      
      // 1. 저장된 서버 URL 확인
      const savedURL = await this.getSavedServerURL();
      if (savedURL) {
        console.log('🔍 [NetworkInitializer] 저장된 서버 URL 사용:', savedURL);
        this.currentServerURL = savedURL;
        
        // 저장된 URL이 여전히 작동하는지 확인
        const isWorking = await this.testConnection(savedURL);
        if (isWorking) {
          console.log('✅ [NetworkInitializer] 저장된 서버 URL 연결 성공');
          this.isInitialized = true;
          return;
        } else {
          console.log('⚠️ [NetworkInitializer] 저장된 서버 URL 연결 실패, 새로 감지 시도');
        }
      }

      // 2. 자동 감지된 URL 사용
      const detectedURL = detectServerURL();
      console.log('🔍 [NetworkInitializer] 자동 감지된 서버 URL:', detectedURL);
      
      const isDetectedWorking = await this.testConnection(detectedURL);
      if (isDetectedWorking) {
        console.log('✅ [NetworkInitializer] 자동 감지된 서버 URL 연결 성공');
        this.currentServerURL = detectedURL;
        await this.saveServerURL(detectedURL);
        this.isInitialized = true;
        return;
      }

      // 3. 사용 가능한 URL 목록에서 시도
      console.log('🔍 [NetworkInitializer] 사용 가능한 URL 목록에서 시도...');
      const availableURLs = getAvailableServerURLs();
      
      // 현재 백엔드가 실행 중인 IP를 우선적으로 시도
      const priorityURLs = [
        'https://lunch-app-backend-ra12.onrender.com' // Render 서버 우선 사용
      ];
      
      // 우선순위 URL들을 먼저 시도
      for (const url of priorityURLs) {
        if (availableURLs.includes(url)) {
          console.log(`🔍 [NetworkInitializer] 우선순위 URL 테스트 중: ${url}`);
          const isWorking = await this.testConnection(url);
          if (isWorking) {
            console.log(`✅ [NetworkInitializer] 우선순위 URL 연결 성공: ${url}`);
            this.currentServerURL = url;
            await this.saveServerURL(url);
            this.isInitialized = true;
            return;
          } else {
            console.log(`❌ [NetworkInitializer] 우선순위 URL 연결 실패: ${url}`);
          }
        }
      }
      
      // 나머지 URL들 시도
      for (const url of availableURLs) {
        if (!priorityURLs.includes(url)) {
          console.log(`🔍 [NetworkInitializer] URL 테스트 중: ${url}`);
          const isWorking = await this.testConnection(url);
          if (isWorking) {
            console.log(`✅ [NetworkInitializer] 연결 성공: ${url}`);
            this.currentServerURL = url;
            await this.saveServerURL(url);
            this.isInitialized = true;
            return;
          } else {
            console.log(`❌ [NetworkInitializer] 연결 실패: ${url}`);
          }
        }
      }

      // 4. 모든 시도 실패
      console.error('❌ [NetworkInitializer] 모든 서버 URL 연결 실패');
      this.isInitialized = false;
      
    } catch (error) {
      console.error('❌ [NetworkInitializer] 초기화 중 오류:', error);
      this.isInitialized = false;
    }
  }

  /**
   * 서버 연결 테스트
   */
  async testConnection(url) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5초 타임아웃

      const response = await fetch(`${url}/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log(`⏰ [NetworkInitializer] 연결 타임아웃: ${url}`);
      } else {
        console.log(`❌ [NetworkInitializer] 연결 실패: ${url} - ${error.message}`);
      }
      return false;
    }
  }

  /**
   * 저장된 서버 URL 가져오기
   */
  async getSavedServerURL() {
    try {
      return await AsyncStorage.getItem(SERVER_URL_KEY);
    } catch (error) {
      console.warn('⚠️ [NetworkInitializer] 저장된 서버 URL 읽기 실패:', error);
      return null;
    }
  }

  /**
   * 서버 URL 저장
   */
  async saveServerURL(url) {
    try {
      await AsyncStorage.setItem(SERVER_URL_KEY, url);
      console.log('💾 [NetworkInitializer] 서버 URL 저장됨:', url);
    } catch (error) {
      console.warn('⚠️ [NetworkInitializer] 서버 URL 저장 실패:', error);
    }
  }

  /**
   * 현재 서버 URL 가져오기
   */
  getCurrentServerURL() {
    return this.currentServerURL;
  }

  /**
   * 초기화 상태 확인
   */
  isReady() {
    return this.isInitialized && this.currentServerURL !== null;
  }

  /**
   * 네트워크 재초기화
   */
  async reinitialize() {
    console.log('🔄 [NetworkInitializer] 네트워크 재초기화...');
    this.isInitialized = false;
    this.currentServerURL = null;
    await this.initialize();
  }

  /**
   * 수동으로 서버 URL 설정
   */
  async setServerURL(url) {
    try {
      console.log(`🔧 [NetworkInitializer] 수동 서버 URL 설정: ${url}`);
      
      const isWorking = await this.testConnection(url);
      if (isWorking) {
        this.currentServerURL = url;
        await this.saveServerURL(url);
        this.isInitialized = true;
        console.log('✅ [NetworkInitializer] 수동 서버 URL 설정 성공');
        return true;
      } else {
        console.log('❌ [NetworkInitializer] 수동 서버 URL 연결 실패');
        return false;
      }
    } catch (error) {
      console.error('❌ [NetworkInitializer] 수동 서버 URL 설정 중 오류:', error);
      return false;
    }
  }

  /**
   * 네트워크 상태 정보 가져오기
   */
  getNetworkInfo() {
    return {
      isInitialized: this.isInitialized,
      currentServerURL: this.currentServerURL,
      availableURLs: getAvailableServerURLs(),
      retryCount: this.retryCount
    };
  }
}

// 싱글톤 인스턴스 생성
const networkInitializer = new NetworkInitializer();

export default networkInitializer;