/**
 * 인증 관련 커스텀 훅
 * 컴포넌트에서 인증 상태와 관련 함수들을 쉽게 사용할 수 있도록 합니다.
 */

import { useState, useEffect, useCallback } from 'react';
import authService from '../auth/authService';
import tokenManager from '../auth/tokenManager';

const useAuth = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // 인증 상태 확인
    const checkAuth = useCallback(async () => {
        try {
            const isValid = tokenManager.isAuthenticated();
            if (isValid) {
                const userInfo = tokenManager.getUserInfo();
                setUser(userInfo);
                setIsAuthenticated(true);
            } else {
                setUser(null);
                setIsAuthenticated(false);
            }
        } catch (error) {
            console.error('인증 상태 확인 실패:', error);
            setUser(null);
            setIsAuthenticated(false);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // 로그인
    const login = useCallback(async (email) => {
        try {
            setIsLoading(true);
            const response = await authService.requestMagicLink(email);
            return response;
        } catch (error) {
            console.error('로그인 실패:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, []);

    // 매직링크 검증
    const verifyMagicLink = useCallback(async (token) => {
        try {
            setIsLoading(true);
            const response = await authService.verifyMagicLink(token);
            await checkAuth(); // 인증 상태 재확인
            return response;
        } catch (error) {
            console.error('매직링크 검증 실패:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [checkAuth]);

    // 테스트 로그인
    const testLogin = useCallback(async (employeeId) => {
        try {
            setIsLoading(true);
            const response = await authService.testLogin(employeeId);
            await checkAuth(); // 인증 상태 재확인
            return response;
        } catch (error) {
            console.error('테스트 로그인 실패:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [checkAuth]);

    // 로그아웃
    const logout = useCallback(async () => {
        try {
            setIsLoading(true);
            await authService.logout();
            setUser(null);
            setIsAuthenticated(false);
        } catch (error) {
            console.error('로그아웃 실패:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // 프로필 조회
    const getProfile = useCallback(async () => {
        try {
            const profile = await authService.getProfile();
            setUser(profile.user || profile);
            return profile;
        } catch (error) {
            console.error('프로필 조회 실패:', error);
            throw error;
        }
    }, []);

    // 프로필 업데이트
    const updateProfile = useCallback(async (profileData) => {
        try {
            const response = await authService.updateProfile(profileData);
            await checkAuth(); // 인증 상태 재확인
            return response;
        } catch (error) {
            console.error('프로필 업데이트 실패:', error);
            throw error;
        }
    }, [checkAuth]);

    // 토큰 갱신
    const refreshToken = useCallback(async () => {
        try {
            const success = await authService.refreshToken();
            if (success) {
                await checkAuth();
            }
            return success;
        } catch (error) {
            console.error('토큰 갱신 실패:', error);
            return false;
        }
    }, [checkAuth]);

    // 인증이 필요한 API 호출
    const withAuth = useCallback(async (apiCall) => {
        return await authService.withAuth(apiCall);
    }, []);

    // 초기 인증 상태 확인
    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    // 토큰 만료 시간 모니터링
    useEffect(() => {
        if (!isAuthenticated) return;

        const checkTokenExpiration = () => {
            const expirationTime = tokenManager.getTokenExpirationTime();
            if (expirationTime <= 0) {
                // 토큰이 만료된 경우 로그아웃
                logout();
            } else if (tokenManager.needsRefresh()) {
                // 토큰 갱신 필요
                refreshToken();
            }
        };

        // 1분마다 토큰 상태 확인
        const interval = setInterval(checkTokenExpiration, 60000);
        
        return () => clearInterval(interval);
    }, [isAuthenticated, logout, refreshToken]);

    return {
        isAuthenticated,
        user,
        isLoading,
        login,
        verifyMagicLink,
        testLogin,
        logout,
        getProfile,
        updateProfile,
        refreshToken,
        withAuth,
        checkAuth,
    };
};

export default useAuth;



