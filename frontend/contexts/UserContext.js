import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { getUserProfile, updateUserProfile } from '../services/userService';
import { getUserData, storeUserData, clearAllTokens } from '../utils/secureStorage';
import { RENDER_SERVER_URL, getApiUrl } from '../components/common/Utils';

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
            
            // 개발 모드에서는 가상 유저 API 사용
            if (__DEV__) {
                console.log('🔧 개발 환경: 가상 유저 API 사용');
                
                // 재시도 로직 추가
                let retryCount = 0;
                const maxRetries = 3;
                
                while (retryCount < maxRetries) {
                    try {
                        console.log(`🔗 API 호출 시작 (시도 ${retryCount + 1}/${maxRetries}):`, `${RENDER_SERVER_URL}/dev/users/1`);
                        
                        // 타임아웃 설정 (30초로 증가)
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => {
                            console.log('⏰ API 호출 타임아웃');
                            controller.abort();
                        }, 30000);
                        
                        const response = await fetch(getApiUrl('users/1'), {
                            signal: controller.signal,
                            headers: {
                                'Content-Type': 'application/json',
                                'Accept': 'application/json',
                                'Cache-Control': 'no-cache',
                            },
                            method: 'GET',
                        });
                        
                        clearTimeout(timeoutId);
                        console.log('📡 API 응답 상태:', response.status);
                    
                        if (response.ok) {
                            const userData = await response.json();
                            const defaultUserData = {
                                id: '1',
                                employee_id: '1',
                                nickname: userData.nickname,
                                name: userData.nickname,
                                email: 'user1@example.com',
                                department: '개발팀',
                                foodPreferences: userData.foodPreferences,
                                lunchStyle: userData.lunchStyle,
                                allergies: userData.allergies,
                                preferredTime: userData.preferredTime,
                                join_date: '2023-01-15'
                            };
                            setUser(defaultUserData);
                            await storeUserData(defaultUserData);
                            console.log('✅ 가상 유저 API 호출 성공');
                            break; // 성공하면 루프 종료
                        } else {
                            throw new Error(`가상 유저 API 호출 실패: ${response.status}`);
                        }
                    } catch (error) {
                        console.error(`❌ 가상 유저 API 호출 실패 (시도 ${retryCount + 1}):`, error);
                        console.error('❌ 에러 타입:', error.name);
                        console.error('❌ 에러 메시지:', error.message);
                        
                        retryCount++;
                        if (retryCount >= maxRetries) {
                            console.log('🔄 최대 재시도 횟수 초과 - 기본 사용자 데이터로 폴백');
                            break;
                        } else {
                            console.log(`⏳ ${retryCount * 3}초 후 재시도...`);
                            await new Promise(resolve => setTimeout(resolve, retryCount * 3000));
                        }
                    }
                }
                
                // 모든 재시도가 실패한 경우 기본 데이터 사용
                if (retryCount >= maxRetries) {
                    console.log('🔄 기본 사용자 데이터로 폴백');
                    
                    // 기본값 사용
                    const defaultUserData = {
                        id: '1',
                        employee_id: '1',
                        nickname: '김철수',
                        name: '김철수',
                        email: 'user1@example.com',
                        department: '개발팀',
                        foodPreferences: ['한식', '중식'],
                        lunchStyle: ['맛집 탐방', '새로운 메뉴 도전'],
                        allergies: ['없음'],
                        preferredTime: '12:00',
                        join_date: '2023-01-15'
                    };
                    setUser(defaultUserData);
                    await storeUserData(defaultUserData);
                }
                setIsLoading(false);
                return;
            }
            
            // 프로덕션 모드에서만 API 호출
            try {
                // 타임아웃 설정 (10초)
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);
                
                const response = await getUserProfile();
                clearTimeout(timeoutId);
                
                if (response.user) {
                    setUser(response.user);
                    await storeUserData(response.user);
                    console.log('✅ 프로덕션 API 호출 성공');
                }
            } catch (err) {
                console.error('API 호출 실패, 기본 데이터 사용:', err);
                console.log('🔄 기본 사용자 데이터로 폴백');
                
                // API 실패 시에도 기본 데이터 사용
                const defaultUserData = {
                    id: 'KOICA001',
                    employee_id: 'KOICA001',
                    nickname: '김코이카',
                    name: '김코이카',
                    email: 'koica@example.com',
                    department: '개발팀',
                    lunch_preference: '한식, 중식, 일식',
                    allergies: '없음',
                    preferred_time: '12:00',
                    join_date: '2023-01-15'
                };
                setUser(defaultUserData);
                await storeUserData(defaultUserData);
            }
        } catch (err) {
            console.error('사용자 프로필 로드 실패:', err);
            setError(err.message);
            
            // 에러 시에도 기본 데이터 사용
            const defaultUserData = {
                id: 'KOICA001',
                employee_id: 'KOICA001',
                nickname: '김코이카',
                name: '김코이카',
                email: 'koica@example.com',
                department: '개발팀',
                lunch_preference: '한식, 중식, 일식',
                allergies: '없음',
                preferred_time: '12:00',
                join_date: '2023-01-15'
            };
            setUser(defaultUserData);
            await storeUserData(defaultUserData);
        } finally {
            setIsLoading(false);
        }
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
