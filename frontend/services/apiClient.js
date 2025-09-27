/**
 * 통합 API 클라이언트
 * 모든 API 요청을 중앙에서 관리하는 단일 진실의 원천
 */

import authManager from './AuthManager';
import networkManager from './NetworkManager';

// API 응답 타입
export const API_RESPONSE_TYPE = {
  SUCCESS: 'success',
  ERROR: 'error',
  VALIDATION_ERROR: 'validation_error',
  AUTH_ERROR: 'auth_error',
  NETWORK_ERROR: 'network_error'
};

// HTTP 메서드
export const HTTP_METHOD = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
  PATCH: 'PATCH'
};

// API 설정
const API_CONFIG = {
  TIMEOUT: 30000, // 30초
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1초
  RETRY_BACKOFF_FACTOR: 2,
  CONTENT_TYPE: 'application/json'
};

class ApiClient {
  constructor() {
    this.baseURL = null;
    this.isInitialized = false;
    this.requestQueue = [];
    this.activeRequests = new Map();
    this.retryCount = new Map();
    
    console.log('🔗 [ApiClient] 인스턴스 생성됨');
  }

  /**
   * API 클라이언트 초기화
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('✅ [ApiClient] 이미 초기화됨');
      return;
    }

    try {
      console.log('🚀 [ApiClient] 초기화 시작...');
      
      // 네트워크 매니저에서 서버 URL 가져오기
      this.baseURL = await networkManager.getServerURL();
      
      this.isInitialized = true;
      console.log('✅ [ApiClient] 초기화 완료:', this.baseURL);
      
    } catch (error) {
      console.error('❌ [ApiClient] 초기화 실패:', error);
      throw error;
    }
  }

  /**
   * 기본 헤더 생성
   */
  getDefaultHeaders() {
    return {
      'Content-Type': API_CONFIG.CONTENT_TYPE,
      'Accept': API_CONFIG.CONTENT_TYPE,
      'X-Requested-With': 'XMLHttpRequest'
    };
  }

  /**
   * 인증 헤더 생성
   */
  getAuthHeaders() {
    const authHeaders = {};
    
    // AuthManager에서 인증 헤더 가져오기
    const authToken = authManager.getAccessToken();
    if (authToken) {
      authHeaders['Authorization'] = `Bearer ${authToken}`;
    }
    
    return authHeaders;
  }

  /**
   * 요청 헤더 생성
   */
  buildHeaders(customHeaders = {}) {
    return {
      ...this.getDefaultHeaders(),
      ...this.getAuthHeaders(),
      ...customHeaders
    };
  }

  /**
   * URL 빌드
   */
  buildURL(endpoint) {
    if (!this.baseURL) {
      throw new Error('API 클라이언트가 초기화되지 않았습니다');
    }
    
    // endpoint가 이미 완전한 URL인 경우
    if (endpoint.startsWith('http')) {
      return endpoint;
    }
    
    // 상대 경로인 경우 baseURL과 결합
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${this.baseURL}${cleanEndpoint}`;
  }

  /**
   * 요청 옵션 빌드
   */
  buildRequestOptions(method, data = null, options = {}) {
    const requestOptions = {
      method,
      headers: this.buildHeaders(options.headers),
      ...options
    };

    // 요청 본문 처리
    if (data && (method === HTTP_METHOD.POST || method === HTTP_METHOD.PUT || method === HTTP_METHOD.PATCH)) {
      if (data instanceof FormData) {
        // FormData인 경우 Content-Type을 자동으로 설정하도록 제거
        delete requestOptions.headers['Content-Type'];
        requestOptions.body = data;
      } else if (typeof data === 'object') {
        requestOptions.body = JSON.stringify(data);
      } else {
        requestOptions.body = data;
      }
    }

    return requestOptions;
  }

  /**
   * 응답 처리
   */
  async processResponse(response, endpoint) {
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    
    let data;
    try {
      if (isJson) {
        data = await response.json();
      } else {
        data = await response.text();
      }
    } catch (error) {
      console.error(`❌ [ApiClient] 응답 파싱 실패 (${endpoint}):`, error);
      throw new Error('응답을 파싱할 수 없습니다');
    }

    // 성공 응답
    if (response.ok) {
      console.log(`✅ [ApiClient] 요청 성공 (${endpoint}):`, {
        status: response.status,
        dataType: isJson ? 'JSON' : 'Text'
      });
      return {
        type: API_RESPONSE_TYPE.SUCCESS,
        data,
        status: response.status,
        headers: response.headers
      };
    }

    // 에러 응답 처리
    return this.handleErrorResponse(response, data, endpoint);
  }

  /**
   * 에러 응답 처리
   */
  handleErrorResponse(response, data, endpoint) {
    const errorInfo = {
      type: API_RESPONSE_TYPE.ERROR,
      status: response.status,
      message: data?.message || data?.error || `HTTP ${response.status} 오류`,
      endpoint,
      data
    };

    // 인증 오류
    if (response.status === 401) {
      errorInfo.type = API_RESPONSE_TYPE.AUTH_ERROR;
      console.error(`🔐 [ApiClient] 인증 오류 (${endpoint}):`, errorInfo);
      
      // 자동 로그아웃 처리
      authManager.logout().catch(error => {
        console.error('❌ [ApiClient] 자동 로그아웃 실패:', error);
      });
    }
    // 네트워크 오류
    else if (response.status >= 500) {
      errorInfo.type = API_RESPONSE_TYPE.NETWORK_ERROR;
      console.error(`🌐 [ApiClient] 서버 오류 (${endpoint}):`, errorInfo);
    }
    // 클라이언트 오류
    else if (response.status >= 400) {
      errorInfo.type = API_RESPONSE_TYPE.VALIDATION_ERROR;
      console.error(`⚠️ [ApiClient] 클라이언트 오류 (${endpoint}):`, errorInfo);
    }

    return errorInfo;
  }

  /**
   * 재시도 로직
   */
  async retryRequest(endpoint, requestOptions, retryCount = 0) {
    if (retryCount >= API_CONFIG.MAX_RETRIES) {
      throw new Error(`최대 재시도 횟수(${API_CONFIG.MAX_RETRIES})를 초과했습니다`);
    }

    const delay = API_CONFIG.RETRY_DELAY * Math.pow(API_CONFIG.RETRY_BACKOFF_FACTOR, retryCount);
    console.log(`🔄 [ApiClient] 재시도 ${retryCount + 1}/${API_CONFIG.MAX_RETRIES} (${delay}ms 대기)`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    return this.makeRequest(endpoint, requestOptions, retryCount + 1);
  }

  /**
   * 실제 요청 실행
   */
  async makeRequest(endpoint, requestOptions, retryCount = 0) {
    const url = this.buildURL(endpoint);
    const requestId = `${requestOptions.method}_${endpoint}_${Date.now()}`;
    
    // 중복 요청 방지
    if (this.activeRequests.has(requestId)) {
      console.log(`🔄 [ApiClient] 중복 요청 감지, 대기 중 (${endpoint})`);
      return this.activeRequests.get(requestId);
    }

    const requestPromise = this.executeRequest(url, requestOptions, endpoint, retryCount);
    this.activeRequests.set(requestId, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      this.activeRequests.delete(requestId);
    }
  }

  /**
   * 요청 실행
   */
  async executeRequest(url, requestOptions, endpoint, retryCount) {
    console.log(`🔗 [ApiClient] 요청 시작: ${requestOptions.method} ${endpoint}`);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

      const response = await fetch(url, {
        ...requestOptions,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      return await this.processResponse(response, endpoint);
      
    } catch (error) {
      console.error(`❌ [ApiClient] 요청 실패 (${endpoint}):`, error);
      
      // 네트워크 오류 시 재시도
      if (error.name === 'AbortError' || error.message.includes('fetch')) {
        if (retryCount < API_CONFIG.MAX_RETRIES) {
          return this.retryRequest(endpoint, requestOptions, retryCount);
        }
      }
      
      throw {
        type: API_RESPONSE_TYPE.NETWORK_ERROR,
        message: error.message || '네트워크 오류가 발생했습니다',
        endpoint,
        originalError: error
      };
    }
  }

  /**
   * GET 요청
   */
  async get(endpoint, params = {}, options = {}) {
    await this.initialize();
    
    // 쿼리 파라미터 추가
    if (Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams(params);
      endpoint += `?${searchParams.toString()}`;
    }
    
    const requestOptions = this.buildRequestOptions(HTTP_METHOD.GET, null, options);
    return this.makeRequest(endpoint, requestOptions);
  }

  /**
   * POST 요청
   */
  async post(endpoint, data = null, options = {}) {
    await this.initialize();
    
    const requestOptions = this.buildRequestOptions(HTTP_METHOD.POST, data, options);
    return this.makeRequest(endpoint, requestOptions);
  }

  /**
   * PUT 요청
   */
  async put(endpoint, data = null, options = {}) {
    await this.initialize();
    
    const requestOptions = this.buildRequestOptions(HTTP_METHOD.PUT, data, options);
    return this.makeRequest(endpoint, requestOptions);
  }

  /**
   * DELETE 요청
   */
  async delete(endpoint, options = {}) {
    await this.initialize();
    
    const requestOptions = this.buildRequestOptions(HTTP_METHOD.DELETE, null, options);
    return this.makeRequest(endpoint, requestOptions);
  }

  /**
   * PATCH 요청
   */
  async patch(endpoint, data = null, options = {}) {
    await this.initialize();
    
    const requestOptions = this.buildRequestOptions(HTTP_METHOD.PATCH, data, options);
    return this.makeRequest(endpoint, requestOptions);
  }

  /**
   * 파일 업로드
   */
  async upload(endpoint, file, additionalData = {}) {
    await this.initialize();
    
    const formData = new FormData();
    formData.append('file', file);
    
    // 추가 데이터 추가
    Object.keys(additionalData).forEach(key => {
      formData.append(key, additionalData[key]);
    });
    
    const requestOptions = this.buildRequestOptions(HTTP_METHOD.POST, formData);
    return this.makeRequest(endpoint, requestOptions);
  }

  /**
   * 다운로드
   */
  async download(endpoint, filename = null) {
    await this.initialize();
    
    const requestOptions = this.buildRequestOptions(HTTP_METHOD.GET);
    
    try {
      const url = this.buildURL(endpoint);
      const response = await fetch(url, requestOptions);
      
      if (!response.ok) {
        throw new Error(`다운로드 실패: ${response.status}`);
      }
      
      const blob = await response.blob();
      
      // 파일명 추출
      if (!filename) {
        const contentDisposition = response.headers.get('content-disposition');
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="(.+)"/);
          if (filenameMatch) {
            filename = filenameMatch[1];
          }
        }
      }
      
      return { blob, filename };
      
    } catch (error) {
      console.error(`❌ [ApiClient] 다운로드 실패 (${endpoint}):`, error);
      throw error;
    }
  }

  /**
   * 요청 통계 가져오기
   */
  getStats() {
    return {
      activeRequests: this.activeRequests.size,
      retryCount: this.retryCount.size,
      isInitialized: this.isInitialized,
      baseURL: this.baseURL
    };
  }

  /**
   * 정리 작업
   */
  destroy() {
    // 모든 활성 요청 취소
    this.activeRequests.clear();
    this.requestQueue = [];
    this.retryCount.clear();
    
    console.log('🧹 [ApiClient] 정리 완료');
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
const apiClient = new ApiClient();
export default apiClient;