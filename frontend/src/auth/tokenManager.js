/**
 * 인증 토큰 관리 클래스
 * JWT 토큰의 저장, 검증, 갱신을 담당합니다.
 */

class TokenManager {
    constructor() {
        this.ACCESS_TOKEN_KEY = 'lunch_app_access_token';
        this.REFRESH_TOKEN_KEY = 'lunch_app_refresh_token';
        this.USER_INFO_KEY = 'lunch_app_user_info';
    }

    /**
     * 액세스 토큰 저장
     * @param {string} token - JWT 액세스 토큰
     */
    setAccessToken(token) {
        localStorage.setItem(this.ACCESS_TOKEN_KEY, token);
    }

    /**
     * 액세스 토큰 조회
     * @returns {string|null} JWT 액세스 토큰
     */
    getAccessToken() {
        return localStorage.getItem(this.ACCESS_TOKEN_KEY);
    }

    /**
     * 리프레시 토큰 저장
     * @param {string} token - JWT 리프레시 토큰
     */
    setRefreshToken(token) {
        localStorage.setItem(this.REFRESH_TOKEN_KEY, token);
    }

    /**
     * 리프레시 토큰 조회
     * @returns {string|null} JWT 리프레시 토큰
     */
    getRefreshToken() {
        return localStorage.getItem(this.REFRESH_TOKEN_KEY);
    }

    /**
     * 사용자 정보 저장
     * @param {Object} userInfo - 사용자 정보 객체
     */
    setUserInfo(userInfo) {
        localStorage.setItem(this.USER_INFO_KEY, JSON.stringify(userInfo));
    }

    /**
     * 사용자 정보 조회
     * @returns {Object|null} 사용자 정보 객체
     */
    getUserInfo() {
        const userInfo = localStorage.getItem(this.USER_INFO_KEY);
        return userInfo ? JSON.parse(userInfo) : null;
    }

    /**
     * 인증 상태 확인
     * @returns {boolean} 인증 여부
     */
    isAuthenticated() {
        const token = this.getAccessToken();
        if (!token) return false;

        try {
            // JWT 토큰 디코딩하여 만료 시간 확인
            const payload = this.decodeJWT(token);
            const currentTime = Math.floor(Date.now() / 1000);
            return payload.exp > currentTime;
        } catch (error) {
            console.error('토큰 검증 실패:', error);
            return false;
        }
    }

    /**
     * JWT 토큰 디코딩
     * @param {string} token - JWT 토큰
     * @returns {Object} 디코딩된 페이로드
     */
    decodeJWT(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                atob(base64)
                    .split('')
                    .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
            );
            return JSON.parse(jsonPayload);
        } catch (error) {
            throw new Error('JWT 토큰 디코딩 실패');
        }
    }

    /**
     * 토큰 만료 시간 확인
     * @returns {number} 만료까지 남은 시간 (초)
     */
    getTokenExpirationTime() {
        const token = this.getAccessToken();
        if (!token) return 0;

        try {
            const payload = this.decodeJWT(token);
            const currentTime = Math.floor(Date.now() / 1000);
            return Math.max(0, payload.exp - currentTime);
        } catch (error) {
            return 0;
        }
    }

    /**
     * 토큰 자동 갱신 필요 여부 확인
     * @returns {boolean} 갱신 필요 여부
     */
    needsRefresh() {
        const expirationTime = this.getTokenExpirationTime();
        // 5분 이내에 만료되면 갱신 필요
        return expirationTime > 0 && expirationTime < 300;
    }

    /**
     * 모든 인증 정보 삭제
     */
    clearAuth() {
        localStorage.removeItem(this.ACCESS_TOKEN_KEY);
        localStorage.removeItem(this.REFRESH_TOKEN_KEY);
        localStorage.removeItem(this.USER_INFO_KEY);
    }

    /**
     * 로그아웃 처리
     */
    logout() {
        this.clearAuth();
        // 로그인 페이지로 리다이렉트
        window.location.href = '/login';
    }

    /**
     * 인증 헤더 생성
     * @returns {Object} Authorization 헤더가 포함된 객체
     */
    getAuthHeaders() {
        const token = this.getAccessToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }
}

// 싱글톤 인스턴스 생성
const tokenManager = new TokenManager();

export default tokenManager;
