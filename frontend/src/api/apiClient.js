/**
 * API 클라이언트 클래스
 * 백엔드 API와의 통신을 담당합니다.
 */

import tokenManager from '../auth/tokenManager';

class ApiClient {
    constructor(baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000') {
        this.baseURL = baseURL;
        this.defaultHeaders = {
            'Content-Type': 'application/json',
        };
    }

    /**
     * HTTP 요청 실행
     * @param {string} endpoint - API 엔드포인트
     * @param {Object} options - 요청 옵션
     * @returns {Promise<Object>} 응답 데이터
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const headers = {
            ...this.defaultHeaders,
            ...tokenManager.getAuthHeaders(),
            ...options.headers,
        };

        const config = {
            ...options,
            headers,
        };

        try {
            const response = await fetch(url, config);
            
            // 응답이 JSON인지 확인
            const contentType = response.headers.get('content-type');
            const isJson = contentType && contentType.includes('application/json');
            
            let data;
            if (isJson) {
                data = await response.json();
            } else {
                data = await response.text();
            }

            // 인증 오류 처리
            if (response.status === 401) {
                tokenManager.logout();
                throw new Error('인증이 필요합니다. 다시 로그인해주세요.');
            }

            // 토큰 갱신 필요 시 자동 갱신
            if (response.status === 403 && tokenManager.needsRefresh()) {
                await this.refreshToken();
                // 원래 요청 재시도
                return this.request(endpoint, options);
            }

            if (!response.ok) {
                throw new Error(data.error || data.message || `HTTP ${response.status} 오류`);
            }

            return data;
        } catch (error) {
            console.error('API 요청 실패:', error);
            throw error;
        }
    }

    /**
     * GET 요청
     * @param {string} endpoint - API 엔드포인트
     * @param {Object} params - 쿼리 파라미터
     * @returns {Promise<Object>} 응답 데이터
     */
    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        
        return this.request(url, { method: 'GET' });
    }

    /**
     * POST 요청
     * @param {string} endpoint - API 엔드포인트
     * @param {Object} data - 요청 데이터
     * @returns {Promise<Object>} 응답 데이터
     */
    async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    /**
     * PUT 요청
     * @param {string} endpoint - API 엔드포인트
     * @param {Object} data - 요청 데이터
     * @returns {Promise<Object>} 응답 데이터
     */
    async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    /**
     * DELETE 요청
     * @param {string} endpoint - API 엔드포인트
     * @returns {Promise<Object>} 응답 데이터
     */
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    /**
     * 파일 업로드
     * @param {string} endpoint - API 엔드포인트
     * @param {FormData} formData - 파일 데이터
     * @returns {Promise<Object>} 응답 데이터
     */
    async upload(endpoint, formData) {
        const headers = {
            ...tokenManager.getAuthHeaders(),
            // Content-Type은 FormData가 자동으로 설정
        };

        return this.request(endpoint, {
            method: 'POST',
            headers,
            body: formData,
        });
    }

    /**
     * 토큰 갱신
     * @returns {Promise<boolean>} 갱신 성공 여부
     */
    async refreshToken() {
        try {
            const refreshToken = tokenManager.getRefreshToken();
            if (!refreshToken) {
                throw new Error('리프레시 토큰이 없습니다.');
            }

            const response = await this.request('/api/auth/refresh', {
                method: 'POST',
                body: JSON.stringify({ refresh_token: refreshToken }),
            });

            if (response.access_token) {
                tokenManager.setAccessToken(response.access_token);
                if (response.refresh_token) {
                    tokenManager.setRefreshToken(response.refresh_token);
                }
                return true;
            }

            return false;
        } catch (error) {
            console.error('토큰 갱신 실패:', error);
            tokenManager.logout();
            return false;
        }
    }

    /**
     * 인증 상태 확인
     * @returns {boolean} 인증 여부
     */
    isAuthenticated() {
        return tokenManager.isAuthenticated();
    }

    /**
     * 사용자 정보 조회
     * @returns {Object|null} 사용자 정보
     */
    getUserInfo() {
        return tokenManager.getUserInfo();
    }
}

// 싱글톤 인스턴스 생성
const apiClient = new ApiClient();

export default apiClient;
