/**
 * 인증 서비스 클래스
 * 로그인, 로그아웃, 회원가입 등 인증 관련 기능을 제공합니다.
 */

import apiClient from '../api/apiClient';
import tokenManager from './tokenManager';

class AuthService {
    /**
     * 매직링크 로그인 요청
     * @param {string} email - 이메일 주소
     * @returns {Promise<Object>} 응답 데이터
     */
    async requestMagicLink(email) {
        try {
            const response = await apiClient.post('/api/auth/magic-link', { email });
            return response;
        } catch (error) {
            console.error('매직링크 요청 실패:', error);
            throw error;
        }
    }

    /**
     * 매직링크 검증
     * @param {string} token - 매직링크 토큰
     * @returns {Promise<Object>} 응답 데이터
     */
    async verifyMagicLink(token) {
        try {
            const response = await apiClient.post('/api/auth/verify-link', { token });
            
            if (response.access_token) {
                // 토큰 저장
                tokenManager.setAccessToken(response.access_token);
                if (response.refresh_token) {
                    tokenManager.setRefreshToken(response.refresh_token);
                }
                
                // 사용자 정보 저장
                if (response.user) {
                    tokenManager.setUserInfo(response.user);
                }
            }
            
            return response;
        } catch (error) {
            console.error('매직링크 검증 실패:', error);
            throw error;
        }
    }

    /**
     * 테스트 로그인 (개발용)
     * @param {string} employeeId - 직원 ID
     * @returns {Promise<Object>} 응답 데이터
     */
    async testLogin(employeeId) {
        try {
            const response = await apiClient.get(`/api/auth/test-login/${employeeId}`);
            
            if (response.access_token) {
                tokenManager.setAccessToken(response.access_token);
                if (response.user) {
                    tokenManager.setUserInfo(response.user);
                }
            }
            
            return response;
        } catch (error) {
            console.error('테스트 로그인 실패:', error);
            throw error;
        }
    }

    /**
     * 사용자 프로필 조회
     * @returns {Promise<Object>} 사용자 프로필
     */
    async getProfile() {
        try {
            const response = await apiClient.get('/api/api/users/profile');
            return response;
        } catch (error) {
            console.error('프로필 조회 실패:', error);
            throw error;
        }
    }

    /**
     * 사용자 프로필 업데이트
     * @param {Object} profileData - 프로필 데이터
     * @returns {Promise<Object>} 응답 데이터
     */
    async updateProfile(profileData) {
        try {
            const response = await apiClient.put('/api/api/users/profile', profileData);
            return response;
        } catch (error) {
            console.error('프로필 업데이트 실패:', error);
            throw error;
        }
    }

    /**
     * 로그아웃
     * @returns {Promise<void>}
     */
    async logout() {
        try {
            // 서버에 로그아웃 요청
            await apiClient.post('/api/auth/logout');
        } catch (error) {
            console.error('로그아웃 요청 실패:', error);
        } finally {
            // 클라이언트에서 토큰 삭제
            tokenManager.logout();
        }
    }

    /**
     * 토큰 갱신
     * @returns {Promise<boolean>} 갱신 성공 여부
     */
    async refreshToken() {
        return await apiClient.refreshToken();
    }

    /**
     * 인증 상태 확인
     * @returns {boolean} 인증 여부
     */
    isAuthenticated() {
        return tokenManager.isAuthenticated();
    }

    /**
     * 현재 사용자 정보 조회
     * @returns {Object|null} 사용자 정보
     */
    getCurrentUser() {
        return tokenManager.getUserInfo();
    }

    /**
     * 인증이 필요한 API 호출을 위한 헬퍼
     * @param {Function} apiCall - API 호출 함수
     * @returns {Promise<Object>} API 응답
     */
    async withAuth(apiCall) {
        if (!this.isAuthenticated()) {
            throw new Error('인증이 필요합니다. 로그인해주세요.');
        }
        
        try {
            return await apiCall();
        } catch (error) {
            if (error.message.includes('인증이 필요합니다')) {
                // 토큰 갱신 시도
                const refreshed = await this.refreshToken();
                if (refreshed) {
                    return await apiCall();
                }
            }
            throw error;
        }
    }
}

// 싱글톤 인스턴스 생성
const authService = new AuthService();

export default authService;



