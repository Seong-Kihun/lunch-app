/**
 * 통합 인증 Context
 * 새로운 AuthManager와 기존 AuthContext를 통합한 전역 인증 상태 관리
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import authManager, { AUTH_STATUS } from '../services/AuthManager';

// 기존 AUTH_STATES와 새로운 AUTH_STATUS 통합
export const AUTH_STATES = {
  LOADING: AUTH_STATUS.AUTHENTICATING,
  UNAUTHENTICATED: AUTH_STATUS.UNAUTHENTICATED,
  AUTHENTICATED: AUTH_STATUS.AUTHENTICATED,
  REGISTERING: 'registering' // 기존 호환성 유지
};

// Context 생성
const AuthContext = createContext({
  // 상태
  authState: AUTH_STATES.LOADING,
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  
  // 액션
  login: () => {},
  logout: () => {},
  refreshToken: () => {},
  clearError: () => {},
  
  // 기존 호환성
  enterRegistrationMode: () => {},
  handleLoginSuccess: () => {},
  handleRegistrationSuccess: () => {},
  handleLogout: () => {},
  setAuthError: () => {},
  setIsLoading: () => {}
});

// Provider 컴포넌트
export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState(AUTH_STATES.LOADING);
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // AuthManager 상태 변화 핸들러
  const handleAuthStatusChange = useCallback((newStatus) => {
    console.log('🔄 [AuthContext] 인증 상태 변경:', newStatus);
    
    // AuthManager의 상태를 AuthContext에 동기화
    setAuthState(newStatus.status);
    setUser(newStatus.user);
    setIsAuthenticated(newStatus.isAuthenticated);
    setError(null); // 상태 변경 시 에러 클리어
    
    // 전역 변수 동기화
    if (newStatus.isAuthenticated && newStatus.user) {
      global.currentUser = newStatus.user;
      global.myEmployeeId = newStatus.user.employee_id;
    } else {
      global.currentUser = null;
      global.myEmployeeId = null;
    }
    
    console.log('✅ [AuthContext] 상태 동기화 완료:', {
      authState: newStatus.status,
      isAuthenticated: newStatus.isAuthenticated,
      user: newStatus.user?.nickname,
      globalUser: global.currentUser?.nickname
    });
  }, []);

  // 인증 관리자 초기화
  const initializeAuth = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🚀 [AuthContext] 인증 시스템 초기화 시작');
      await authManager.initialize();
      console.log('✅ [AuthContext] 인증 시스템 초기화 완료');
    } catch (error) {
      console.error('❌ [AuthContext] 인증 시스템 초기화 실패:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 로그인 함수
  const login = useCallback(async (credentials) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔐 [AuthContext] 로그인 시도');
      const result = await authManager.login(credentials);
      console.log('✅ [AuthContext] 로그인 성공');
      return result;
    } catch (error) {
      console.error('❌ [AuthContext] 로그인 실패:', error);
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 로그아웃 함수
  const logout = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🚪 [AuthContext] 로그아웃 시도');
      await authManager.logout();
      console.log('✅ [AuthContext] 로그아웃 완료');
    } catch (error) {
      console.error('❌ [AuthContext] 로그아웃 실패:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 토큰 갱신 함수
  const refreshToken = useCallback(async () => {
    try {
      console.log('🔄 [AuthContext] 토큰 갱신 시도');
      const newToken = await authManager.refreshAccessToken();
      console.log('✅ [AuthContext] 토큰 갱신 성공');
      return newToken;
    } catch (error) {
      console.error('❌ [AuthContext] 토큰 갱신 실패:', error);
      setError(error.message);
      throw error;
    }
  }, []);

  // 에러 클리어 함수
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 기존 호환성 함수들
  const enterRegistrationMode = useCallback(() => {
    setAuthState(AUTH_STATES.REGISTERING);
    setError(null);
  }, []);

  const handleLoginSuccess = useCallback((userData, accessToken, refreshToken) => {
    console.log('✅ [AuthContext] 로그인 성공 처리:', userData.nickname);
    
    // 사용자 정보와 토큰 설정
    setUser(userData);
    setAccessToken(accessToken);
    setRefreshToken(refreshToken);
    
    // 인증 상태를 AUTHENTICATED로 변경
    setAuthState(AUTH_STATES.AUTHENTICATED);
    setError(null);
    
    console.log('✅ [AuthContext] 인증 상태 변경됨:', AUTH_STATES.AUTHENTICATED);
  }, [setUser, setAccessToken, setRefreshToken, setAuthState]);

  const handleRegistrationSuccess = useCallback((userData, accessToken, refreshToken) => {
    // AuthManager를 통해 처리되므로 여기서는 상태만 동기화
    console.log('✅ [AuthContext] 회원가입 성공 처리:', userData.nickname);
    setError(null);
  }, []);

  const handleLogout = useCallback(async () => {
    await logout();
  }, [logout]);

  const setAuthError = useCallback((errorMessage) => {
    setError(errorMessage);
  }, []);

  // Context 값
  const contextValue = {
    // 상태
    authState,
    user,
    isAuthenticated,
    isLoading,
    error,
    
    // 액션
    login,
    logout,
    refreshToken,
    clearError,
    
    // 기존 호환성
    enterRegistrationMode,
    handleLoginSuccess,
    handleRegistrationSuccess,
    handleLogout,
    setAuthError,
    setIsLoading,
    
    // 상수
    AUTH_STATES
  };

  // 초기화 및 리스너 설정
  useEffect(() => {
    let unsubscribe;
    
    const setupAuth = async () => {
      try {
        // 리스너 등록
        unsubscribe = authManager.addStatusListener(handleAuthStatusChange);
        
        // 초기화
        await initializeAuth();
        
      } catch (error) {
        console.error('❌ [AuthContext] 초기 설정 실패:', error);
        setError(error.message);
      }
    };

    setupAuth();

    // 정리
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [handleAuthStatusChange, initializeAuth]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook for using auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

// 인증 상태 표시 컴포넌트
export const AuthStatusIndicator = ({ style, showText = true, showIcon = true }) => {
  const { 
    authState, 
    isAuthenticated, 
    user, 
    isLoading 
  } = useAuth();

  if (isLoading) {
    return (
      <View style={[styles.statusIndicator, style]}>
        {showIcon && <Text style={styles.statusIcon}>🔄</Text>}
        {showText && <Text style={styles.statusText}>인증 중...</Text>}
      </View>
    );
  }

  const getStatusIcon = () => {
    if (isAuthenticated) return '✅';
    if (authState === AUTH_STATES.REGISTERING) return '📝';
    return '❌';
  };

  const getStatusText = () => {
    if (isAuthenticated) return user ? `${user.nickname}님` : '인증됨';
    if (authState === AUTH_STATES.REGISTERING) return '회원가입';
    return '로그인 필요';
  };

  const getStatusColor = () => {
    if (isAuthenticated) return '#10B981';
    if (authState === AUTH_STATES.REGISTERING) return '#3B82F6';
    return '#EF4444';
  };

  return (
    <View style={[styles.statusIndicator, style]}>
      {showIcon && <Text style={styles.statusIcon}>{getStatusIcon()}</Text>}
      {showText && (
        <Text style={[styles.statusText, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>
      )}
    </View>
  );
};

// 인증이 필요한 컴포넌트를 위한 HOC
export const withAuth = (WrappedComponent) => {
  return function AuthenticatedComponent(props) {
    const { isAuthenticated, isLoading } = useAuth();
    
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>인증 확인 중...</Text>
        </View>
      );
    }
    
    if (!isAuthenticated) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>로그인이 필요합니다</Text>
        </View>
      );
    }
    
    return <WrappedComponent {...props} />;
  };
};

// 스타일 정의
const styles = {
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  statusIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
  },
};

export default AuthContext;
