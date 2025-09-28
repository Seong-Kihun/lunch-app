/**
 * 통합 API 클라이언트
 * 통합 네트워크 관리자를 사용하여 안정적이고 일관된 API 통신을 제공합니다.
 * 프로덕션 환경에서 안정적으로 작동하도록 설계되었습니다.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

class UnifiedApiClient {
  constructor() {
    this.isInitialized = false;
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1초
    this.timeout = 10000; // 10초로 단축 (프로덕션 환경 최적화)
    this.requestQueue = [];
    this.isProcessingQueue = false;
    
    console.log('🔗 [UnifiedApiClient] 인스턴스 생성됨');
  }

  /**
   * API 클라이언트 초기화
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('✅ [UnifiedApiClient] 이미 초기화됨');
      return;
    }

    try {
      console.log('🚀 [UnifiedApiClient] 초기화 시작...');
      
      // 네트워크 관리자 초기화 대기
      await this.waitForNetworkInitialization();
      
      this.isInitialized = true;
      console.log('✅ [UnifiedApiClient] 초기화 완료');
      
    } catch (error) {
      console.error('❌ [UnifiedApiClient] 초기화 실패:', error);
      throw error;
    }
  }

  /**
   * 네트워크 초기화 대기
   */
  async waitForNetworkInitialization(timeout = 10000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const { getServerURL } = await import('../utils/networkUnifiedManager');
        const serverURL = getServerURL();
        
        if (serverURL && serverURL !== 'undefined') {
          console.log('✅ [UnifiedApiClient] 네트워크 초기화 완료:', serverURL);
          return serverURL;
        }
        
        // 500ms 대기 후 재시도
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.warn('⚠️ [UnifiedApiClient] 네트워크 초기화 대기 중 오류:', error);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    throw new Error('네트워크 초기화 타임아웃');
  }

  /**
   * 서버 URL 가져오기 (안전한 방식)
   */
  async getServerURL() {
    try {
      const { getServerURL } = await import('../utils/networkUnifiedManager');
      const serverURL = getServerURL();
      
      if (!serverURL || serverURL === 'undefined') {
        throw new Error('유효하지 않은 서버 URL');
      }
      
      return serverURL;
    } catch (error) {
      console.error('❌ [UnifiedApiClient] 서버 URL 가져오기 실패:', error);
      
      // 폴백 URL 반환
      const fallbackURL = __DEV__ 
        ? 'https://lunch-app-backend-ra12.onrender.com'
        : 'https://lunch-app-backend-ra12.onrender.com';
      
      console.log('🔧 [UnifiedApiClient] 폴백 URL 사용:', fallbackURL);
      return fallbackURL;
    }
  }

  /**
   * 인증 헤더 생성 (동적 import로 순환 참조 방지)
   */
  async getAuthHeaders() {
    const authHeaders = {};
    
    try {
      // AuthManager를 동적으로 import하여 순환 참조 방지
      const { default: authManager } = await import('./AuthManager');
      const accessToken = authManager.getAccessToken();
      if (accessToken) {
        authHeaders['Authorization'] = `Bearer ${accessToken}`;
        console.log('🔐 [UnifiedApiClient] 인증 헤더 생성됨');
      } else {
        console.warn('⚠️ [UnifiedApiClient] 액세스 토큰이 없음');
      }
    } catch (error) {
      console.warn('⚠️ [UnifiedApiClient] 인증 헤더 생성 실패:', error);
    }
    
    return authHeaders;
  }

  /**
   * 기본 헤더 생성
   */
  async getDefaultHeaders() {
    const authHeaders = await this.getAuthHeaders();
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...authHeaders
    };
  }

  /**
   * 요청 실행 (재시도 로직 포함)
   */
  async executeRequest(endpoint, options = {}) {
    const { method = 'GET', body, headers = {}, params = {} } = options;
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        console.log(`🔗 [UnifiedApiClient] 요청 시도 ${attempt}/${this.retryAttempts}: ${method} ${endpoint}`);
        
        const serverURL = await this.getServerURL();
        const url = this.buildURL(serverURL, endpoint, params);
        const requestHeaders = {
          ...(await this.getDefaultHeaders()),
          ...headers
        };
        
        const requestOptions = {
          method,
          headers: requestHeaders,
          timeout: this.timeout
        };
        
        if (body && method !== 'GET') {
          requestOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
        }
        
        console.log(`🔧 [UnifiedApiClient] 요청 URL: ${url}`);
        console.log(`🔧 [UnifiedApiClient] 요청 옵션:`, {
          method: requestOptions.method,
          headers: Object.keys(requestOptions.headers),
          hasBody: !!requestOptions.body
        });
        
        const response = await this.fetchWithTimeout(url, requestOptions);
        
        // 응답 로깅
        console.log(`📡 [UnifiedApiClient] 응답 상태: ${response.status}`);
        
        // 응답 처리
        const data = await this.processResponse(response);
        
        if (attempt > 1) {
          console.log(`✅ [UnifiedApiClient] 재시도 성공 (${attempt}번째 시도)`);
        }
        
        return data;
        
      } catch (error) {
        console.error(`❌ [UnifiedApiClient] 요청 실패 (${attempt}/${this.retryAttempts}):`, error);
        
        // 마지막 시도가 아니면 재시도
        if (attempt < this.retryAttempts) {
          const delay = this.retryDelay * attempt; // 지수적 백오프
          console.log(`⏳ [UnifiedApiClient] ${delay}ms 후 재시도...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // 모든 재시도 실패 시 에러 던지기
        throw this.createDetailedError(error, endpoint, method);
      }
    }
  }

  /**
   * URL 생성
   */
  buildURL(serverURL, endpoint, params = {}) {
    let url = `${serverURL}${endpoint}`;
    
    if (Object.keys(params).length > 0) {
      const queryString = new URLSearchParams(params).toString();
      url += `?${queryString}`;
    }
    
    return url;
  }

  /**
   * 타임아웃이 있는 fetch
   */
  async fetchWithTimeout(url, options) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`요청 타임아웃 (${this.timeout}ms)`);
      }
      
      throw error;
    }
  }

  /**
   * 응답 처리
   */
  async processResponse(response) {
    // 응답 타입 확인
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    
    let data;
    if (isJson) {
      try {
        data = await response.json();
      } catch (error) {
        console.warn('⚠️ [UnifiedApiClient] JSON 파싱 실패:', error);
        data = await response.text();
      }
    } else {
      data = await response.text();
    }
    
    // HTTP 상태 코드 처리
    if (!response.ok) {
      let errorMessage = data?.message || data?.error || `HTTP ${response.status} 오류`;
      
      // 백엔드 데이터베이스 오류에 대한 특별 처리
      if (response.status === 500 && errorMessage.includes('Table') && errorMessage.includes('already defined')) {
        console.warn('⚠️ [UnifiedApiClient] 백엔드 데이터베이스 스키마 오류 감지, 재시도 권장');
        errorMessage = '서버 데이터베이스 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      }
      
      throw new Error(errorMessage);
    }
    
    // 인증 오류 처리 (동적 import로 순환 참조 방지)
    if (response.status === 401) {
      console.log('🔐 [UnifiedApiClient] 인증 오류 - 로그아웃 처리');
      try {
        const { default: authManager } = await import('./AuthManager');
        await authManager.logout();
      } catch (error) {
        console.warn('⚠️ [UnifiedApiClient] 로그아웃 처리 실패:', error);
      }
      throw new Error('인증이 필요합니다. 다시 로그인해주세요.');
    }
    
    return data;
  }

  /**
   * 상세한 에러 생성
   */
  createDetailedError(originalError, endpoint, method) {
    const error = new Error(originalError.message || 'API 요청 실패');
    
    // 에러 메타데이터 추가
    error.metadata = {
      endpoint,
      method,
      timestamp: new Date().toISOString(),
      retryAttempts: this.retryAttempts,
      originalError: originalError.message
    };
    
    // 네트워크 관련 에러 분류
    if (originalError.message.includes('Network request failed')) {
      error.type = 'NETWORK_ERROR';
      error.userMessage = '네트워크 연결을 확인해주세요.';
    } else if (originalError.message.includes('timeout')) {
      error.type = 'TIMEOUT_ERROR';
      error.userMessage = '서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.';
    } else if (originalError.message.includes('401')) {
      error.type = 'AUTH_ERROR';
      error.userMessage = '인증이 필요합니다. 다시 로그인해주세요.';
    } else if (originalError.message.includes('Table') && originalError.message.includes('already defined')) {
      error.type = 'DATABASE_ERROR';
      error.userMessage = '서버 데이터베이스 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
    } else if (originalError.message.includes('500')) {
      error.type = 'SERVER_ERROR';
      error.userMessage = '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
    } else {
      error.type = 'UNKNOWN_ERROR';
      error.userMessage = '요청 처리 중 오류가 발생했습니다.';
    }
    
    return error;
  }

  /**
   * GET 요청
   */
  async get(endpoint, params = {}) {
    return this.executeRequest(endpoint, { method: 'GET', params });
  }

  /**
   * POST 요청
   */
  async post(endpoint, body = {}, headers = {}) {
    return this.executeRequest(endpoint, { method: 'POST', body, headers });
  }

  /**
   * PUT 요청
   */
  async put(endpoint, body = {}, headers = {}) {
    return this.executeRequest(endpoint, { method: 'PUT', body, headers });
  }

  /**
   * DELETE 요청
   */
  async delete(endpoint, headers = {}) {
    return this.executeRequest(endpoint, { method: 'DELETE', headers });
  }

  /**
   * 파일 업로드
   */
  async upload(endpoint, formData) {
    const headers = {
      ...(await this.getAuthHeaders()),
      // Content-Type은 FormData가 자동으로 설정
    };
    
    return this.executeRequest(endpoint, {
      method: 'POST',
      body: formData,
      headers
    });
  }

  /**
   * 스마트 헬스 체크 - 실제 API 엔드포인트 사용
   */
  async healthCheck() {
    try {
      const serverURL = await this.getServerURL();
      console.log(`🔍 [UnifiedApiClient] 스마트 헬스 체크 시작: ${serverURL}`);
      
      // 1단계: 전용 헬스 체크 엔드포인트 시도
      const dedicatedEndpoints = ['/health', '/api/health', '/api/health/status'];
      
      for (const endpoint of dedicatedEndpoints) {
        try {
          console.log(`🔍 [UnifiedApiClient] 전용 헬스 체크 시도: ${serverURL}${endpoint}`);
          const response = await this.fetchWithTimeout(`${serverURL}${endpoint}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            timeout: 5000 // 헬스 체크는 빠르게
          });
          
          if (response.ok) {
            console.log(`✅ [UnifiedApiClient] 전용 헬스 체크 성공: ${endpoint}`);
            return true;
          }
        } catch (endpointError) {
          console.warn(`⚠️ [UnifiedApiClient] 전용 헬스 체크 실패 (${endpoint}):`, endpointError.message);
          continue;
        }
      }
      
      // 2단계: 실제 API 엔드포인트로 연결성 테스트
      const apiTestEndpoints = [
        '/api/auth/status',  // 인증 상태 확인 (가장 가벼운 엔드포인트)
        '/api/restaurants',  // 레스토랑 목록 (일반적으로 존재)
        '/api/users/profile' // 사용자 프로필 (존재할 가능성 높음)
      ];
      
      for (const endpoint of apiTestEndpoints) {
        try {
          console.log(`🔍 [UnifiedApiClient] API 연결성 테스트: ${serverURL}${endpoint}`);
          const response = await this.fetchWithTimeout(`${serverURL}${endpoint}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            timeout: 8000
          });
          
          // 200, 401, 403 등은 서버가 살아있음을 의미
          if (response.status < 500) {
            console.log(`✅ [UnifiedApiClient] API 연결성 테스트 성공: ${endpoint} (${response.status})`);
            return true;
          }
        } catch (endpointError) {
          console.warn(`⚠️ [UnifiedApiClient] API 연결성 테스트 실패 (${endpoint}):`, endpointError.message);
          continue;
        }
      }
      
      // 3단계: 최종 폴백 - 서버 URL 자체의 연결성 테스트
      try {
        console.log(`🔍 [UnifiedApiClient] 최종 폴백 테스트: ${serverURL}`);
        const response = await this.fetchWithTimeout(serverURL, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        });
        
        console.log(`✅ [UnifiedApiClient] 최종 폴백 테스트 성공: ${response.status}`);
        return true;
      } catch (fallbackError) {
        console.warn(`⚠️ [UnifiedApiClient] 최종 폴백 테스트 실패:`, fallbackError.message);
      }
      
      console.error('❌ [UnifiedApiClient] 모든 헬스 체크 방법 실패');
      return false;
    } catch (error) {
      console.error('❌ [UnifiedApiClient] 헬스 체크 실패:', error);
      return false;
    }
  }

  /**
   * 데이터베이스 상태 체크
   */
  async checkDatabaseStatus() {
    try {
      console.log('🔍 [UnifiedApiClient] 데이터베이스 상태 체크 시작');
      
      // 간단한 API 호출로 데이터베이스 상태 확인
      const response = await this.get('/api/health/database');
      
      return {
        isHealthy: true,
        response,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ [UnifiedApiClient] 데이터베이스 상태 체크 실패:', error);
      
      return {
        isHealthy: false,
        error: error.message,
        isDatabaseError: error.message.includes('Table') && error.message.includes('already defined'),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 네트워크 상태 정보
   */
  async getNetworkStatus() {
    try {
      const serverURL = await this.getServerURL();
      const isHealthy = await this.healthCheck();
      const databaseStatus = await this.checkDatabaseStatus();
      
      return {
        serverURL,
        isHealthy: isHealthy && databaseStatus.isHealthy,
        isInitialized: this.isInitialized,
        databaseStatus,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        serverURL: null,
        isHealthy: false,
        isInitialized: this.isInitialized,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
const unifiedApiClient = new UnifiedApiClient();
export default unifiedApiClient;
