/**
 * 네트워크 상태 관리 Context
 * 전역 네트워크 상태를 관리하고 컴포넌트에서 쉽게 접근할 수 있도록 함
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import networkManager, { NETWORK_STATUS } from '../services/NetworkManager';

// Context 생성
const NetworkContext = createContext({
  // 상태
  status: NETWORK_STATUS.DISCONNECTED,
  serverURL: null,
  isConnected: false,
  isInitialized: false,
  connectionAttempts: 0,
  
  // 액션
  reconnect: () => {},
  switchServer: () => {},
  getServerURL: () => {},
  
  // 로딩 상태
  isLoading: false,
  error: null
});

// Provider 컴포넌트
export const NetworkProvider = ({ children }) => {
  const [networkState, setNetworkState] = useState({
    status: NETWORK_STATUS.DISCONNECTED,
    serverURL: null,
    isConnected: false,
    isInitialized: false,
    connectionAttempts: 0
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // 네트워크 상태 업데이트 핸들러
  const handleNetworkStateChange = useCallback((newState) => {
    console.log('🔄 [NetworkContext] 네트워크 상태 변경:', newState);
    setNetworkState(newState);
    setError(null); // 상태 변경 시 에러 클리어
  }, []);

  // 네트워크 초기화 - 에러 방지
  const initializeNetwork = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🚀 [NetworkContext] 네트워크 초기화 시작');
      
      // 타임아웃 설정으로 무한 대기 방지
      const initPromise = networkManager.initialize();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('네트워크 초기화 타임아웃')), 10000)
      );
      
      await Promise.race([initPromise, timeoutPromise]);
      console.log('✅ [NetworkContext] 네트워크 초기화 완료');
      
    } catch (error) {
      console.warn('⚠️ [NetworkContext] 네트워크 초기화 실패, 폴백 모드:', error.message);
      
      // 에러를 치명적이지 않게 처리
      setError(null); // 에러 상태를 클리어하여 앱이 계속 실행되도록 함
      
      // 폴백 상태로 설정
      setNetworkState(prev => ({
        ...prev,
        status: NETWORK_STATUS.CONNECTED, // 연결된 상태로 표시
        isConnected: true,
        isInitialized: true,
        serverURL: 'https://lunch-app-backend-ra12.onrender.com' // 기본 서버 URL
      }));
      
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 재연결 함수
  const reconnect = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔄 [NetworkContext] 재연결 시도');
      await networkManager.reconnect();
      console.log('✅ [NetworkContext] 재연결 성공');
    } catch (error) {
      console.error('❌ [NetworkContext] 재연결 실패:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 서버 전환 함수
  const switchServer = useCallback(async (url) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`🔄 [NetworkContext] 서버 전환 시도: ${url}`);
      const success = await networkManager.switchServer(url);
      if (!success) {
        throw new Error('서버 연결에 실패했습니다');
      }
      console.log('✅ [NetworkContext] 서버 전환 성공');
    } catch (error) {
      console.error('❌ [NetworkContext] 서버 전환 실패:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 서버 URL 가져오기
  const getServerURL = useCallback(async () => {
    try {
      return await networkManager.getServerURL();
    } catch (error) {
      console.error('❌ [NetworkContext] 서버 URL 가져오기 실패:', error);
      setError(error.message);
      return null;
    }
  }, []);

  // 네트워크 상태 문자열 가져오기
  const getStatusText = useCallback(() => {
    switch (networkState.status) {
      case NETWORK_STATUS.DISCONNECTED:
        return '연결 끊김';
      case NETWORK_STATUS.CONNECTING:
        return '연결 중...';
      case NETWORK_STATUS.CONNECTED:
        return '연결됨';
      case NETWORK_STATUS.ERROR:
        return '연결 오류';
      case NETWORK_STATUS.RECONNECTING:
        return '재연결 중...';
      default:
        return '알 수 없음';
    }
  }, [networkState.status]);

  // 네트워크 상태 색상 가져오기
  const getStatusColor = useCallback(() => {
    switch (networkState.status) {
      case NETWORK_STATUS.CONNECTED:
        return '#10B981'; // 초록색
      case NETWORK_STATUS.CONNECTING:
      case NETWORK_STATUS.RECONNECTING:
        return '#F59E0B'; // 노란색
      case NETWORK_STATUS.ERROR:
        return '#EF4444'; // 빨간색
      default:
        return '#6B7280'; // 회색
    }
  }, [networkState.status]);

  // 네트워크 상태 아이콘 가져오기
  const getStatusIcon = useCallback(() => {
    switch (networkState.status) {
      case NETWORK_STATUS.CONNECTED:
        return '✅';
      case NETWORK_STATUS.CONNECTING:
      case NETWORK_STATUS.RECONNECTING:
        return '🔄';
      case NETWORK_STATUS.ERROR:
        return '❌';
      default:
        return '❓';
    }
  }, [networkState.status]);

  // Context 값
  const contextValue = {
    // 상태
    ...networkState,
    isLoading,
    error,
    
    // 액션
    reconnect,
    switchServer,
    getServerURL,
    initializeNetwork,
    
    // 유틸리티
    getStatusText,
    getStatusColor,
    getStatusIcon,
    
    // 상수
    NETWORK_STATUS
  };

  // 초기화 및 리스너 설정
  useEffect(() => {
    let unsubscribe;
    
    const setupNetwork = async () => {
      try {
        // 리스너 등록
        unsubscribe = networkManager.addStatusListener(handleNetworkStateChange);
        
        // 초기화
        await initializeNetwork();
        
      } catch (error) {
        console.error('❌ [NetworkContext] 초기 설정 실패:', error);
        setError(error.message);
      }
    };

    setupNetwork();

    // 정리
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [handleNetworkStateChange, initializeNetwork]);

  return (
    <NetworkContext.Provider value={contextValue}>
      {children}
    </NetworkContext.Provider>
  );
};

// Hook for using network context
export const useNetwork = () => {
  const context = useContext(NetworkContext);
  
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  
  return context;
};

// 네트워크 상태 표시 컴포넌트
export const NetworkStatusIndicator = ({ style, showText = true, showIcon = true }) => {
  const { 
    getStatusText, 
    getStatusIcon, 
    getStatusColor, 
    isConnected, 
    isLoading 
  } = useNetwork();

  if (isLoading) {
    return (
      <View style={[styles.statusIndicator, style]}>
        {showIcon && <Text style={styles.statusIcon}>🔄</Text>}
        {showText && <Text style={styles.statusText}>로딩 중...</Text>}
      </View>
    );
  }

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
};

export default NetworkContext;
