import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { getUserProfile, updateUserProfile } from '../services/userService';
import { getUserData, storeUserData, clearAllTokens } from '../utils/secureStorage';
import { RENDER_SERVER_URL } from '../components/common/Utils';

const UserContext = createContext();

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

      // 사용자 프로필 로드
    const loadUserProfile = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            
            // 먼저 로컬 저장소에서 사용자 데이터 확인
            const localUserData = await getUserData();
            if (localUserData) {
                setUser(localUserData);
            }
            
            // 개발/프로덕션 환경 통일: 실제 인증 시스템 사용
            console.log('🔧 실제 인증 시스템 사용');
            
            // 로컬 저장소에서 토큰 확인
            const accessToken = await getAccessToken();
            if (!accessToken) {
                console.log('❌ 인증 토큰이 없습니다. 로그인이 필요합니다.');
                setIsLoading(false);
                return;
            }
            
            try {
                console.log(`🔗 사용자 프로필 API 호출: ${RENDER_SERVER_URL}/api/auth/profile`);
                
                const response = await fetch(`${RENDER_SERVER_URL}/api/auth/profile`, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${accessToken}`,
                        'Cache-Control': 'no-cache',
                    },
                    method: 'GET',
                });
                
                console.log('📡 API 응답 상태:', response.status);
            
                if (response.ok) {
                    const userData = await response.json();
                    console.log('✅ 사용자 프로필 API 호출 성공:', userData);
                    
                    const userProfile = {
                        id: userData.user?.id || '1',
                        employee_id: userData.user?.employee_id || '1',
                        nickname: userData.user?.nickname || '사용자',
                        name: userData.user?.nickname || '사용자',
                        email: userData.user?.email || 'user@example.com',
                        department: '개발팀',
                        foodPreferences: userData.user?.food_preferences?.split(',') || ['한식', '중식'],
                        lunchStyle: ['맛집 탐방', '새로운 메뉴 도전'],
                        allergies: userData.user?.allergies ? [userData.user.allergies] : ['없음'],
                        preferredTime: userData.user?.preferred_time || '12:00',
                        join_date: '2023-01-15'
                    };
                    setUser(userProfile);
                    await storeUserData(userProfile);
                    console.log('✅ 사용자 프로필 설정 완료');
                } else if (response.status === 401) {
                    console.log('❌ 인증 토큰이 만료되었습니다. 로그인이 필요합니다.');
                    await clearAllTokens();
                    setUser(null);
                } else {
                    throw new Error(`사용자 프로필 API 호출 실패: ${response.status}`);
                }
            } catch (error) {
                console.error('❌ 사용자 프로필 API 호출 실패:', error);
                console.log('🔄 로그인이 필요합니다.');
                setUser(null);
            }
            setIsLoading(false);
            return;
    }, []);

  // 사용자 프로필 업데이트
  const updateUser = useCallback(async (profileData) => {
    try {
      setError(null);
      const response = await updateUserProfile(profileData);
      
      if (response.user) {
        setUser(response.user);
        await storeUserData(response.user);
        return response;
      }
    } catch (err) {
      console.error('프로필 업데이트 실패:', err);
      setError(err.message);
      throw err;
    }
  }, []);

  // 사용자 로그아웃
  const logout = useCallback(async () => {
    try {
      await clearAllTokens();
      setUser(null);
      setError(null);
    } catch (err) {
      console.error('로그아웃 실패:', err);
    }
  }, []);

  // 사용자 데이터 새로고침
  const refreshUser = useCallback(async () => {
    await loadUserProfile();
  }, [loadUserProfile]);

  // 에러 초기화
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 초기 로드
  useEffect(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  const value = {
    user,
    isLoading,
    error,
    loadUserProfile,
    updateUser,
    logout,
    refreshUser,
    clearError,
    isAuthenticated: !!user
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};
