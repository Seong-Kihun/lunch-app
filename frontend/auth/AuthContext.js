import React, { createContext, useContext, useState, useEffect } from 'react';
import { checkAuthStatus, autoRefreshToken } from '../services/authService';
import { getUserData, getAccessToken } from '../utils/secureStorage';

// 인증 컨텍스트 생성
const AuthContext = createContext();

// 인증 상태 상수
export const AUTH_STATES = {
  LOADING: 'loading',
  AUTHENTICATED: 'authenticated',
  UNAUTHENTICATED: 'unauthenticated',
  REGISTERING: 'registering'
};

// 인증 컨텍스트 프로바이더
export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState(AUTH_STATES.LOADING);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // 인증 상태 초기화
  useEffect(() => {
    initializeAuth();
  }, []);

  // 토큰 자동 갱신 인터벌 설정
  useEffect(() => {
    if (authState === AUTH_STATES.AUTHENTICATED) {
      const interval = setInterval(async () => {
        try {
          await autoRefreshToken();
        } catch (error) {
          console.log('토큰 자동 갱신 실패:', error);
          // 토큰 갱신 실패 시 로그아웃 처리
          handleLogout();
        }
      }, 5 * 60 * 1000); // 5분마다 체크

      return () => clearInterval(interval);
    }
  }, [authState]);

  // 인증 상태 초기화 함수
  const initializeAuth = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 개발 모드에서도 실제 인증 시스템 사용 (프로덕션 환경과 동일)
      console.log('🔧 실제 인증 시스템 사용');

      // 저장된 토큰들 확인
      const authStatus = await checkAuthStatus();
      
      if (authStatus.isAuthenticated) {
        // 사용자 데이터 가져오기
        const userData = await getUserData();
        if (userData) {
          setUser(userData);
          setAuthState(AUTH_STATES.AUTHENTICATED);
          
          // 실제 인증된 사용자만 global.currentUser에 설정
          global.currentUser = {
            employee_id: userData.employee_id,
            nickname: userData.nickname || userData.name
          };
          global.myEmployeeId = userData.employee_id;
          console.log('✅ [AuthContext] 실제 인증된 사용자 정보 설정:', global.currentUser);
        } else {
          setAuthState(AUTH_STATES.UNAUTHENTICATED);
          // 사용자 정보가 없으면 global 변수 초기화
          global.currentUser = null;
          global.myEmployeeId = null;
        }
      } else {
        setAuthState(AUTH_STATES.UNAUTHENTICATED);
        // 인증되지 않았으면 global 변수 초기화
        global.currentUser = null;
        global.myEmployeeId = null;
      }
    } catch (error) {
      console.error('인증 상태 초기화 실패:', error);
      setError(error.message);
      setAuthState(AUTH_STATES.UNAUTHENTICATED);
    } finally {
      setIsLoading(false);
    }
  };

  // 로그인 성공 처리
  const handleLoginSuccess = async (userData, accessToken, refreshToken) => {
    try {
      setUser(userData);
      setAuthState(AUTH_STATES.AUTHENTICATED);
      setError(null);
    } catch (error) {
      console.error('로그인 성공 처리 실패:', error);
      setError(error.message);
    }
  };

  // 회원가입 모드 진입
  const enterRegistrationMode = () => {
    setAuthState(AUTH_STATES.REGISTERING);
    setError(null);
  };

  // 회원가입 성공 처리
  const handleRegistrationSuccess = async (userData, accessToken, refreshToken) => {
    try {
      setUser(userData);
      setAuthState(AUTH_STATES.AUTHENTICATED);
      setError(null);
    } catch (error) {
      console.error('회원가입 성공 처리 실패:', error);
      setError(error.message);
    }
  };

  // 로그아웃 처리
  const handleLogout = async () => {
    try {
      // 사용자 데이터와 인증 상태를 즉시 초기화
      setUser(null);
      setAuthState(AUTH_STATES.UNAUTHENTICATED);
      setError(null);
      
      // global 변수 초기화
      global.currentUser = null;
      global.myEmployeeId = null;
      console.log('✅ [AuthContext] 로그아웃 시 global 변수 초기화');
      
      // 로컬 상태도 정리
      setIsLoading(false);
    } catch (error) {
      console.error('로그아웃 처리 실패:', error);
      // 에러가 발생해도 강제로 로그아웃 상태로 설정
      setUser(null);
      setAuthState(AUTH_STATES.UNAUTHENTICATED);
      setError(null);
      setIsLoading(false);
      
      // 에러 발생 시에도 global 변수 초기화
      global.currentUser = null;
      global.myEmployeeId = null;
    }
  };

  // 사용자 정보 업데이트
  const updateUser = (updatedUserData) => {
    setUser(updatedUserData);
  };

  // 에러 설정
  const setAuthError = (errorMessage) => {
    setError(errorMessage);
  };

  // 에러 초기화
  const clearError = () => {
    setError(null);
  };

  // 컨텍스트 값
  const contextValue = {
    // 상태
    authState,
    user,
    isLoading,
    error,
    
    // 액션
    handleLoginSuccess,
    enterRegistrationMode,
    handleRegistrationSuccess,
    handleLogout,
    updateUser,
    setAuthError,
    clearError,
    
    // 유틸리티
    isAuthenticated: authState === AUTH_STATES.AUTHENTICATED,
    isRegistering: authState === AUTH_STATES.REGISTERING,
    isUnauthenticated: authState === AUTH_STATES.UNAUTHENTICATED
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// 인증 컨텍스트 사용 훅
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth는 AuthProvider 내에서 사용되어야 합니다.');
  }
  return context;
};

// 인증 상태 확인 훅
export const useAuthState = () => {
  const { authState, isLoading, error } = useAuth();
  return { authState, isLoading, error };
};

// 사용자 정보 훅
export const useUser = () => {
  const { user, updateUser } = useAuth();
  return { user, updateUser };
};

export default AuthContext;
