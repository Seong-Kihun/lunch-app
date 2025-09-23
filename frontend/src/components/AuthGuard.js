/**
 * 인증 가드 컴포넌트
 * 인증이 필요한 페이지를 보호합니다.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import tokenManager from '../auth/tokenManager';
import authService from '../auth/authService';

const AuthGuard = ({ children, fallback = null }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                // 토큰 유효성 확인
                const isValid = tokenManager.isAuthenticated();
                
                if (isValid) {
                    // 토큰이 유효하면 사용자 정보 확인
                    try {
                        await authService.getProfile();
                        setIsAuthenticated(true);
                    } catch (error) {
                        console.error('사용자 정보 확인 실패:', error);
                        // 프로필 조회 실패 시 로그아웃
                        tokenManager.logout();
                        setIsAuthenticated(false);
                    }
                } else {
                    setIsAuthenticated(false);
                }
            } catch (error) {
                console.error('인증 확인 실패:', error);
                setIsAuthenticated(false);
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, []);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            // 인증되지 않은 경우 로그인 페이지로 리다이렉트
            navigate('/login', { replace: true });
        }
    }, [isAuthenticated, isLoading, navigate]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return fallback || (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-700 mb-4">인증이 필요합니다</h2>
                    <p className="text-gray-600 mb-4">이 페이지에 접근하려면 로그인이 필요합니다.</p>
                    <button
                        onClick={() => navigate('/login')}
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    >
                        로그인하기
                    </button>
                </div>
            </div>
        );
    }

    return children;
};

export default AuthGuard;



