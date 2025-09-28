/**
 * 통합 API 클라이언트
 * 통합 네트워크 관리자를 사용하여 안정적이고 일관된 API 통신을 제공합니다.
 * 프로덕션 환경에서 안정적으로 작동하도록 설계되었습니다.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
// 오프라인 모드 제거 - 프로덕션 환경 최적화

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
      
      // 오프라인 모드 제거 - 프로덕션 환경 최적화
      
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
        
        // 프로덕션 환경 - 오프라인 모드 제거
        
        // 마지막 시도가 아니면 재시도
        if (attempt < this.retryAttempts) {
          const delay = this.retryDelay * attempt; // 지수적 백오프
          console.log(`⏳ [UnifiedApiClient] ${delay}ms 후 재시도...`);
          
          // 백엔드 데이터베이스 오류의 경우 재시도 간격을 늘림
          const actualDelay = error.message.includes('데이터베이스') ? delay * 2 : delay;
          if (actualDelay !== delay) {
            console.log(`⏳ [UnifiedApiClient] 데이터베이스 오류로 인한 연장 대기: ${actualDelay}ms`);
          }
          
          await new Promise(resolve => setTimeout(resolve, actualDelay));
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
      if (response.status === 500) {
        if (errorMessage.includes('Table') && errorMessage.includes('already defined')) {
          console.warn('⚠️ [UnifiedApiClient] 백엔드 데이터베이스 스키마 오류 감지');
          errorMessage = '서버 데이터베이스 스키마 문제가 발생했습니다. 관리자에게 문의해주세요.';
        } else {
          console.warn('⚠️ [UnifiedApiClient] 백엔드 서버 내부 오류 감지');
          errorMessage = '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
        }
      }
      
      const error = this.createDetailedError(new Error(errorMessage), response.url, 'GET');
      throw error;
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
    
    // 프로덕션 환경 - 단순화된 에러 분류
    if (originalError.message.includes('Network request failed')) {
      error.type = 'NETWORK_ERROR';
      error.userMessage = '네트워크 연결을 확인해주세요.';
    } else if (originalError.message.includes('timeout')) {
      error.type = 'TIMEOUT_ERROR';
      error.userMessage = '서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.';
    } else if (originalError.message.includes('401')) {
      error.type = 'AUTH_ERROR';
      error.userMessage = '인증이 필요합니다. 다시 로그인해주세요.';
    } else if (originalError.message.includes('423') || originalError.message.includes('계정이 잠겨있습니다')) {
      error.type = 'ACCOUNT_LOCKED';
      error.userMessage = '계정이 잠겨있습니다. 보안을 위해 잠시 후 다시 시도해주세요.';
    } else if (originalError.message.includes('500')) {
      error.type = 'SERVER_ERROR';
      error.userMessage = '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
    } else if (originalError.message.includes('비밀번호가 올바르지 않습니다')) {
      error.type = 'INVALID_CREDENTIALS';
      error.userMessage = '이메일 또는 비밀번호가 올바르지 않습니다.';
    } else {
      error.type = 'UNKNOWN_ERROR';
      error.userMessage = '요청 처리 중 오류가 발생했습니다.';
    }
    
    return error;
  }

  /**
   * GET 요청 (오프라인 모드 지원)
   */
  async get(endpoint, params = {}) {
    try {
      // 프로덕션 환경 - 직접 API 호출
      return await this.executeRequest(endpoint, { method: 'GET', params });
    } catch (error) {
      console.error(`❌ [UnifiedApiClient] GET 요청 실패: ${endpoint}`, error);
      throw error;
    }
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
   * 백엔드 API 상태 분석 및 대응 전략
   */
  async analyzeBackendStatus() {
    try {
      const serverURL = await this.getServerURL();
      console.log(`🔍 [UnifiedApiClient] 백엔드 API 상태 분석 시작: ${serverURL}`);
      
      const analysis = {
        serverReachable: false,
        apiEndpointsWorking: false,
        authenticationWorking: false,
        databaseHealthy: false,
        issues: [],
        recommendations: []
      };
      
      // 1단계: 서버 기본 연결성 확인 - 더 관대한 테스트
      try {
        const response = await this.fetchWithTimeout(serverURL, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          timeout: 8000 // 타임아웃 증가
        });
        
        // 200, 400, 404 등은 서버가 살아있음을 의미
        if (response.status < 500) {
          analysis.serverReachable = true;
          console.log(`✅ [UnifiedApiClient] 서버 기본 연결성 확인됨: ${response.status}`);
          
          if (response.status !== 200) {
            analysis.issues.push(`서버 루트 응답 상태: ${response.status} (정상적으로 작동 중)`);
          }
        } else {
          analysis.issues.push(`서버 응답 상태: ${response.status}`);
        }
      } catch (error) {
        // 타임아웃이나 연결 실패 시에도 API 엔드포인트가 작동할 수 있음
        console.warn('⚠️ [UnifiedApiClient] 서버 루트 연결 실패:', error.message);
        
        // 타임아웃은 서버가 느리게 응답하는 것일 수 있으므로 치명적이지 않음
        if (error.message.includes('timeout')) {
          analysis.issues.push('서버 루트 응답이 느립니다. API 엔드포인트는 정상 작동할 수 있습니다.');
        } else {
          analysis.issues.push(`서버 루트 연결 실패: ${error.message}`);
        }
      }
      
      // 2단계: API 엔드포인트 상태 확인 - 데이터베이스 스키마 오류 감지
      const apiEndpoints = [
        { path: '/api/auth/login', method: 'POST', critical: true },
        { path: '/api/restaurants', method: 'GET', critical: false },
        { path: '/api/users/profile', method: 'GET', critical: false },
        { path: '/dev/schedules', method: 'GET', critical: false } // 일정 API 추가
      ];
      
      let workingEndpoints = 0;
      let databaseErrors = 0;
      
      for (const endpoint of apiEndpoints) {
        try {
          const response = await this.fetchWithTimeout(`${serverURL}${endpoint.path}`, {
            method: endpoint.method,
            headers: { 'Content-Type': 'application/json' },
            timeout: 8000
          });
          
          // 200, 400, 401, 403 등은 엔드포인트가 존재함을 의미
          if (response.status < 500) {
            workingEndpoints++;
            console.log(`✅ [UnifiedApiClient] API 엔드포인트 확인됨: ${endpoint.path} (${response.status})`);
          } else if (response.status === 500) {
            databaseErrors++;
            analysis.issues.push(`API 엔드포인트 ${endpoint.path} 데이터베이스 오류: ${response.status}`);
            console.warn(`⚠️ [UnifiedApiClient] API 엔드포인트 데이터베이스 오류 (${endpoint.path}): ${response.status}`);
          } else {
            analysis.issues.push(`API 엔드포인트 ${endpoint.path} 서버 오류: ${response.status}`);
          }
        } catch (error) {
          analysis.issues.push(`API 엔드포인트 ${endpoint.path} 접근 실패: ${error.message}`);
          console.warn(`⚠️ [UnifiedApiClient] API 엔드포인트 확인 실패 (${endpoint.path}):`, error.message);
        }
      }
      
      analysis.apiEndpointsWorking = workingEndpoints > 0;
      analysis.databaseHealthy = databaseErrors === 0;
      
      // 3단계: 인증 시스템 상태 확인 - 계정 잠금 상태도 확인
      try {
        const response = await this.fetchWithTimeout(`${serverURL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'test@test.com', password: 'test123' }),
          timeout: 10000
        });
        
        // 400, 401, 423 등은 인증 시스템이 작동 중임을 의미
        if (response.status < 500) {
          analysis.authenticationWorking = true;
          console.log(`✅ [UnifiedApiClient] 인증 시스템 확인됨: ${response.status}`);
          
          // 계정 잠금 상태 확인
          if (response.status === 423) {
            analysis.issues.push('계정 잠금 상태가 감지되었습니다.');
            analysis.recommendations.push('계정이 잠겨있습니다. 보안을 위해 잠시 후 다시 시도하거나 관리자에게 문의해주세요.');
          } else if (response.status === 400) {
            analysis.issues.push('API 엔드포인트 접근에 문제가 있습니다.');
            analysis.recommendations.push('API 엔드포인트 설정을 확인해주세요.');
          } else if (response.status === 401) {
            analysis.recommendations.push('인증 시스템이 정상적으로 작동하고 있습니다.');
          }
        } else {
          analysis.issues.push(`인증 시스템 서버 오류: ${response.status}`);
        }
      } catch (error) {
        analysis.issues.push(`인증 시스템 접근 실패: ${error.message}`);
        console.warn('⚠️ [UnifiedApiClient] 인증 시스템 확인 실패:', error.message);
      }
      
      // 4단계: 권장사항 생성 - 데이터베이스 오류 특화
      if (analysis.serverReachable && analysis.apiEndpointsWorking && analysis.authenticationWorking && analysis.databaseHealthy) {
        analysis.recommendations.push('백엔드 API가 정상적으로 작동하고 있습니다.');
      } else {
        if (!analysis.serverReachable) {
          analysis.recommendations.push('서버 연결 문제가 있습니다. 네트워크 상태를 확인해주세요.');
        }
        if (!analysis.apiEndpointsWorking) {
          analysis.recommendations.push('API 엔드포인트에 접근할 수 없습니다. 백엔드 서버 상태를 확인해주세요.');
        }
        if (!analysis.authenticationWorking) {
          analysis.recommendations.push('인증 시스템에 문제가 있습니다. 계정 잠금 상태를 확인해주세요.');
        }
        if (!analysis.databaseHealthy) {
          analysis.recommendations.push('데이터베이스 스키마에 문제가 있습니다. 백엔드 관리자에게 문의해주세요.');
        }
      }
      
      console.log('📊 [UnifiedApiClient] 백엔드 상태 분석 완료:', analysis);
      return analysis;
      
    } catch (error) {
      console.error('❌ [UnifiedApiClient] 백엔드 상태 분석 실패:', error);
      return {
        serverReachable: false,
        apiEndpointsWorking: false,
        authenticationWorking: false,
        databaseHealthy: false,
        issues: [`분석 실패: ${error.message}`],
        recommendations: ['백엔드 서버에 심각한 문제가 있습니다. 관리자에게 문의해주세요.']
      };
    }
  }

  /**
   * 스마트 헬스 체크 - 백엔드 상태 분석 기반
   */
  async healthCheck() {
    try {
      const analysis = await this.analyzeBackendStatus();
      
      // 백엔드가 부분적으로라도 작동하면 건강한 것으로 간주
      const isHealthy = analysis.serverReachable || analysis.apiEndpointsWorking || analysis.authenticationWorking;
      
      if (isHealthy) {
        console.log('✅ [UnifiedApiClient] 스마트 헬스 체크 성공 - 백엔드 부분 작동 중');
      } else {
        console.error('❌ [UnifiedApiClient] 스마트 헬스 체크 실패 - 백엔드 완전 불가');
      }
      
      return isHealthy;
    } catch (error) {
      console.error('❌ [UnifiedApiClient] 스마트 헬스 체크 실패:', error);
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
