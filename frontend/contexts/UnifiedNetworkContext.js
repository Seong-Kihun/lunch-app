/**
 * 통합 네트워크 Context
 * 단순하고 안정적인 네트워크 상태 관리
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import unifiedNetworkManager, { NETWORK_STATUS } from '../utils/networkUnifiedManager';

// Context 생성
const UnifiedNetworkContext = createContext({
  // 상태
  status: NETWORK_STATUS.DISCONNECTED,
  serverURL: null,
  isConnected: false,
  isInitialized: false,
  
  // 액션
  reconnect: () => {},
  getServerURL: () => {},
  
  // 로딩 상태
  isLoading: false,
  error: null
});

// Provider 컴포넌트
export const UnifiedNetworkProvider = ({ children }) => {
  const [networkState, setNetworkState] = useState({
    status: NETWORK_STATUS.DISCONNECTED,
    serverURL: null,
    isConnected: false,
    isInitialized: false
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // 네트워크 상태 업데이트 핸들러
  const handleNetworkStateChange = useCallback((newState) => {
    console.log('🔄 [UnifiedNetworkContext] 네트워크 상태 변경:', newState);
    setNetworkState(newState);
    setError(null); // 상태 변경 시 에러 클리어
  }, []);

  // 네트워크 초기화 - 단순하고 안정적
  const initializeNetwork = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🚀 [UnifiedNetworkContext] 네트워크 초기화 시작');
      
      // 타임아웃 설정 (10초)
      const initPromise = unifiedNetworkManager.initialize();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('네트워크 초기화 타임아웃')), 10000)
      );
      
      await Promise.race([initPromise, timeoutPromise]);
      console.log('✅ [UnifiedNetworkContext] 네트워크 초기화 완료');
      
    } catch (error) {
      console.warn('⚠️ [UnifiedNetworkContext] 네트워크 초기화 실패, 폴백 모드:', error.message);
      
      // 에러를 치명적이지 않게 처리
      setError(null);
      
      // 폴백 상태로 설정
      setNetworkState({
        status: NETWORK_STATUS.CONNECTED,
        serverURL: 'https://lunch-app-backend-ra12.onrender.com',
        isConnected: true,
        isInitialized: true
      });
      
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 재연결 함수
  const reconnect = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔄 [UnifiedNetworkContext] 재연결 시작');
      await unifiedNetworkManager.reconnect();
      console.log('✅ [UnifiedNetworkContext] 재연결 완료');
    } catch (error) {
      console.warn('⚠️ [UnifiedNetworkContext] 재연결 실패:', error.message);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 서버 URL 가져오기
  const getServerURL = useCallback(() => {
    return unifiedNetworkManager.getServerURL();
  }, []);

  // Context 값
  const contextValue = {
    // 상태
    ...networkState,
    isLoading,
    error,
    
    // 액션
    reconnect,
    getServerURL,
    initializeNetwork,
    
    // 상수
    NETWORK_STATUS
  };

  // 초기화 및 리스너 설정
  useEffect(() => {
    let unsubscribe;
    
    const setupNetwork = async () => {
      try {
        // 리스너 등록
        unsubscribe = unifiedNetworkManager.addListener(handleNetworkStateChange);
        
        // 초기화
        await initializeNetwork();
        
      } catch (error) {
        console.warn('⚠️ [UnifiedNetworkContext] 초기 설정 실패 (폴백 모드):', error);
        
        // 폴백 상태 설정
        setNetworkState({
          status: NETWORK_STATUS.CONNECTED,
          serverURL: 'https://lunch-app-backend-ra12.onrender.com',
          isConnected: true,
          isInitialized: true
        });
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
    <UnifiedNetworkContext.Provider value={contextValue}>
      {children}
    </UnifiedNetworkContext.Provider>
  );
};

// Hook
export const useUnifiedNetwork = () => {
  const context = useContext(UnifiedNetworkContext);
  if (!context) {
    throw new Error('useUnifiedNetwork must be used within a UnifiedNetworkProvider');
  }
  return context;
};

// 기본 내보내기
export default UnifiedNetworkContext;
