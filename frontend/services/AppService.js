/**
 * 통합 앱 서비스 - 모든 API 호출과 상태 관리를 중앙화
 * 기존의 복잡한 다중 시스템을 단일 서비스로 통합
 */

class AppService {
  constructor() {
    this.baseURL = 'https://lunch-app-backend-ra12.onrender.com'
    this.retryCount = 3
    this.retryDelay = 1000
    this.timeout = 10000
  }

  /**
   * 통합 요청 메서드 - 모든 API 호출의 단일 진입점
   */
  async request(endpoint, options = {}) {
    const {
      method = 'GET',
      data = null,
      headers = {},
      retries = this.retryCount
    } = options

    const url = `${this.baseURL}${endpoint}`
    
    // 기본 헤더 설정
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...headers
    }

    // 인증 토큰 추가
    const token = await this.getAuthToken()
    if (token) {
      defaultHeaders.Authorization = `Bearer ${token}`
    }

    const requestOptions = {
      method,
      headers: defaultHeaders,
      timeout: this.timeout
    }

    if (data && method !== 'GET') {
      requestOptions.body = JSON.stringify(data)
    }

    try {
      console.log(`🚀 [AppService] ${method} ${endpoint}`)
      
      const response = await this.fetchWithRetry(url, requestOptions, retries)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`)
      }

      console.log(`✅ [AppService] ${method} ${endpoint} 성공`)
      return {
        success: true,
        data: result.data || result,
        message: result.message
      }

    } catch (error) {
      console.error(`❌ [AppService] ${method} ${endpoint} 실패:`, error.message)
      
      // 에러 타입별 처리
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('네트워크 연결을 확인해주세요')
      }
      
      if (error.message.includes('401')) {
        await this.handleAuthError()
        throw new Error('인증이 필요합니다')
      }
      
      throw error
    }
  }

  /**
   * 재시도 로직이 포함된 fetch
   */
  async fetchWithRetry(url, options, retries) {
    for (let i = 0; i < retries; i++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), this.timeout)
        
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        return response
        
      } catch (error) {
        if (i === retries - 1) throw error
        
        console.log(`🔄 [AppService] 재시도 ${i + 1}/${retries}`)
        await this.delay(this.retryDelay * (i + 1))
      }
    }
  }

  /**
   * 인증 토큰 가져오기
   */
  async getAuthToken() {
    try {
      const { authManager } = await import('./AuthManager')
      return authManager.getAccessToken()
    } catch {
      return null
    }
  }

  /**
   * 인증 오류 처리
   */
  async handleAuthError() {
    try {
      const { authManager } = await import('./AuthManager')
      await authManager.logout()
    } catch {
      // 인증 관리자가 없으면 무시
    }
  }

  /**
   * 지연 함수
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // 편의 메서드들
  async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' })
  }

  async post(endpoint, data, options = {}) {
    return this.request(endpoint, { ...options, method: 'POST', data })
  }

  async put(endpoint, data, options = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', data })
  }

  async delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' })
  }
}

// 싱글톤 인스턴스
const appService = new AppService()
export default appService
