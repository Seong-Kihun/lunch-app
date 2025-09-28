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
  
  // 현재 설정 버전 (설정 변경 시 증가) - 하드코딩된 IP 제거
  CONFIG_VERSION: '2.0.0'
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
   * 서버 URL 자동 감지 - 강력한 Fallback 시스템
   */
  async detectServerURL(environment) {
    console.log(`🔍 [NetworkConfig] 서버 URL 감지 시작 - 환경: ${environment}`);
    
    // 1단계: 동적 IP 우선 감지 (개발 환경)
    if (environment === 'development') {
      const dynamicIPs = await this.detectDynamicIPs();
      console.log(`🔍 [NetworkConfig] 동적 IP 감지 완료: ${dynamicIPs.length}개`);
      
      for (const url of dynamicIPs) {
        const isWorking = await this.testConnectionWithRetry(url);
        if (isWorking) {
          console.log(`✅ [NetworkConfig] 동적 IP 연결 성공: ${url}`);
          return url;
        }
      }
    }
    
    // 2단계: 기본 URL 목록 테스트
    let urls = [...CONFIG.SERVER_URLS[environment]];
    console.log(`🔍 [NetworkConfig] 기본 URL 목록 테스트: ${urls.length}개`);
    
    for (const url of urls) {
      const isWorking = await this.testConnectionWithRetry(url);
      if (isWorking) {
        console.log(`✅ [NetworkConfig] 기본 URL 연결 성공: ${url}`);
        return url;
      }
    }
    
    // 3단계: 강력한 Fallback - 모든 가능한 IP 범위 스캔
    console.log(`🔍 [NetworkConfig] 강력한 Fallback 시작...`);
    const fallbackURL = await this.performComprehensiveScan();
    if (fallbackURL) {
      console.log(`✅ [NetworkConfig] Fallback 스캔 성공: ${fallbackURL}`);
      return fallbackURL;
    }
    
    console.log(`❌ [NetworkConfig] 모든 서버 연결 실패`);
    return null;
  }

  /**
   * 재시도가 포함된 연결 테스트
   */
  async testConnectionWithRetry(url, maxRetries = 2) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔍 [NetworkConfig] 연결 테스트 (${attempt}/${maxRetries}): ${url}`);
        const isWorking = await this.testConnection(url);
        if (isWorking) {
          return true;
        }
        
        if (attempt < maxRetries) {
          console.log(`⏳ [NetworkConfig] 재시도 대기 중... (${attempt}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.log(`❌ [NetworkConfig] 연결 테스트 실패 (${attempt}/${maxRetries}): ${url} - ${error.message}`);
      }
    }
    return false;
  }

  /**
   * 포괄적인 네트워크 스캔
   */
  async performComprehensiveScan() {
    console.log(`🔍 [NetworkConfig] 포괄적인 네트워크 스캔 시작...`);
    
    // 현재 감지된 IP를 기준으로 스캔
    const baseIP = await this.getCurrentNetworkBase();
    if (baseIP) {
      console.log(`🔍 [NetworkConfig] 기준 IP: ${baseIP}`);
      
      // 같은 서브넷의 다른 IP들 스캔
      const subnetIPs = this.generateSubnetIPs(baseIP);
      console.log(`🔍 [NetworkConfig] 서브넷 IP 생성: ${subnetIPs.length}개`);
      
      for (const ip of subnetIPs) {
        const url = `http://${ip}:5000`;
        const isWorking = await this.testConnection(url);
        if (isWorking) {
          console.log(`✅ [NetworkConfig] 서브넷 스캔 성공: ${url}`);
          return url;
        }
      }
    }
    
    // 일반적인 네트워크 범위 스캔
    const commonRanges = [
      '192.168.0', '192.168.1', '192.168.2',
      '10.0.0', '10.0.1', '10.1.1',
      '172.16.0', '172.20.10'
    ];
    
    for (const range of commonRanges) {
      console.log(`🔍 [NetworkConfig] 네트워크 범위 스캔: ${range}.x`);
      
      for (let i = 1; i <= 10; i++) {
        const ip = `${range}.${i}`;
        const url = `http://${ip}:5000`;
        
        const isWorking = await this.testConnection(url);
        if (isWorking) {
          console.log(`✅ [NetworkConfig] 범위 스캔 성공: ${url}`);
          return url;
        }
      }
    }
    
    return null;
  }

  /**
   * 현재 네트워크 기준 IP 추출
   */
  async getCurrentNetworkBase() {
    try {
      if (Constants.expoConfig?.hostUri) {
        const ip = Constants.expoConfig.hostUri.split(':')[0];
        const parts = ip.split('.');
        if (parts.length === 4) {
          return `${parts[0]}.${parts[1]}.${parts[2]}`;
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 서브넷 IP 생성
   */
  generateSubnetIPs(baseIP) {
    const ips = [];
    for (let i = 1; i <= 254; i++) {
      ips.push(`${baseIP}.${i}`);
    }
    return ips;
  }

  /**
   * 동적 IP 감지 (개발 환경용) - 강화된 버전
   */
  async detectDynamicIPs() {
    const dynamicIPs = [];
    
    try {
      console.log('🔍 [NetworkConfig] 동적 IP 감지 시작...');
      
      // 1. Expo Constants에서 IP 감지 (최신 방식)
      if (Constants.expoConfig?.hostUri) {
        const ip = Constants.expoConfig.hostUri.split(':')[0];
        dynamicIPs.push(`http://${ip}:5000`);
        console.log(`🔍 [NetworkConfig] Expo hostUri 감지: ${ip}`);
      }
      
      if (Constants.manifest?.debuggerHost) {
        const ip = Constants.manifest.debuggerHost.split(':')[0];
        dynamicIPs.push(`http://${ip}:5000`);
        console.log(`🔍 [NetworkConfig] Expo debuggerHost 감지: ${ip}`);
      }
      
      // 2. 현재 네트워크의 일반적인 IP 범위 스캔
      const networkRanges = [
        // 192.168.0.x (일반적인 홈/오피스 네트워크)
        '192.168.0.1', '192.168.0.31', '192.168.0.100', '192.168.0.101', '192.168.0.102',
        // 192.168.1.x (일반적인 홈 네트워크)
        '192.168.1.1', '192.168.1.100', '192.168.1.101', '192.168.1.102',
        // 10.0.0.x (기업 네트워크)
        '10.0.0.1', '10.0.0.100', '10.0.0.101',
        // 172.16.x.x (기업 네트워크)
        '172.16.0.1', '172.16.0.100', '172.20.10.1'
      ];
      
      networkRanges.forEach(ip => {
        dynamicIPs.push(`http://${ip}:5000`);
      });
      
      // 3. 중복 제거
      const uniqueIPs = [...new Set(dynamicIPs)];
      
      console.log(`🔍 [NetworkConfig] 동적 IP 감지 완료: ${uniqueIPs.length}개`);
      console.log(`🔍 [NetworkConfig] 감지된 IP들:`, uniqueIPs.slice(0, 5)); // 처음 5개만 로그
      
      return uniqueIPs;
    } catch (error) {
      console.warn('🔍 [NetworkConfig] 동적 IP 감지 실패:', error);
      return [];
    }
  }

  /**
   * 서버 연결 테스트 - 근본적 해결책
   */
  async testConnection(url) {
    try {
      console.log(`🔍 [NetworkConfig] 연결 테스트 시작: ${url}`);
      
      // 1. 기본 연결 테스트
      const basicTest = await this.performBasicConnectionTest(url);
      if (basicTest) {
        console.log(`✅ [NetworkConfig] 기본 연결 테스트 성공: ${url}`);
        return true;
      }
      
      // 2. 대체 엔드포인트 테스트
      const alternativeTest = await this.performAlternativeConnectionTest(url);
      if (alternativeTest) {
        console.log(`✅ [NetworkConfig] 대체 연결 테스트 성공: ${url}`);
        return true;
      }
      
      // 3. 포트 스캔 테스트 (로컬 서버용)
      if (url.includes('localhost') || url.includes('127.0.0.1') || url.includes('192.168.')) {
        const portTest = await this.performPortScanTest(url);
        if (portTest) {
          console.log(`✅ [NetworkConfig] 포트 스캔 테스트 성공: ${url}`);
          return true;
        }
      }
      
      console.log(`❌ [NetworkConfig] 모든 연결 테스트 실패: ${url}`);
      return false;
    } catch (error) {
      console.log(`❌ [NetworkConfig] 연결 테스트 예외: ${url} - ${error.message}`);
      return false;
    }
  }

  /**
   * 기본 연결 테스트
   */
  async performBasicConnectionTest(url) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${url}/api/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'LunchApp/1.0'
        }
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * 대체 엔드포인트 테스트
   */
  async performAlternativeConnectionTest(url) {
    const alternativeEndpoints = [
      '/health',
      '/api/health',
      '/',
      '/status'
    ];
    
    for (const endpoint of alternativeEndpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch(`${url}${endpoint}`, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'Accept': 'application/json'
          }
        });
        
        clearTimeout(timeoutId);
        if (response.ok) {
          console.log(`✅ [NetworkConfig] 대체 엔드포인트 성공: ${url}${endpoint}`);
          return true;
        }
      } catch (error) {
        continue;
      }
    }
    return false;
  }

  /**
   * 포트 스캔 테스트 (로컬 서버용)
   */
  async performPortScanTest(url) {
    try {
      // URL에서 호스트와 포트 추출
      const urlObj = new URL(url);
      const host = urlObj.hostname;
      const port = urlObj.port || '5000';
      
      console.log(`🔍 [NetworkConfig] 포트 스캔 테스트: ${host}:${port}`);
      
      // 간단한 TCP 연결 테스트 시뮬레이션
      // 실제로는 fetch를 통해 연결 가능성 확인
      const testUrl = `http://${host}:${port}/`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      const response = await fetch(testUrl, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'Accept': '*/*'
        }
      });
      
      clearTimeout(timeoutId);
      return response.status < 500; // 5xx 에러가 아니면 연결 가능
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
