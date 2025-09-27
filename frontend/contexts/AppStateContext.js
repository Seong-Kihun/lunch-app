/**
 * 통합 앱 상태 관리 Context
 * 모든 전역 상태를 중앙에서 관리하는 단일 진실의 원천
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useReducer } from 'react';
import AsyncStorage from '@react-native-async-storage/asyncStorage';

// 앱 상태 타입
export const APP_STATE = {
  INITIALIZING: 'initializing',
  READY: 'ready',
  ERROR: 'error',
  OFFLINE: 'offline',
  MAINTENANCE: 'maintenance'
};

// 상태 액션 타입
export const STATE_ACTION = {
  SET_APP_STATE: 'SET_APP_STATE',
  SET_USER_DATA: 'SET_USER_DATA',
  SET_NETWORK_STATUS: 'SET_NETWORK_STATUS',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  UPDATE_CACHE: 'UPDATE_CACHE',
  CLEAR_CACHE: 'CLEAR_CACHE',
  SET_OFFLINE_DATA: 'SET_OFFLINE_DATA',
  SET_LAST_SYNC: 'SET_LAST_SYNC'
};

// 저장소 키
const STORAGE_KEYS = {
  APP_STATE: 'app_state_data',
  USER_PREFERENCES: 'user_preferences',
  CACHE_DATA: 'cache_data',
  OFFLINE_DATA: 'offline_data',
  LAST_SYNC: 'last_sync_timestamp'
};

// 초기 상태
const initialState = {
  // 앱 상태
  appState: APP_STATE.INITIALIZING,
  isLoading: false,
  error: null,
  
  // 사용자 데이터
  currentUser: null,
  userPreferences: {
    theme: 'light',
    language: 'ko',
    notifications: true,
    autoSync: true
  },
  
  // 네트워크 상태
  networkStatus: {
    isConnected: false,
    isOnline: false,
    connectionType: null
  },
  
  // 캐시 및 동기화
  cache: {
    schedules: {},
    restaurants: {},
    users: {},
    parties: {}
  },
  
  // 오프라인 데이터
  offlineData: {
    schedules: [],
    restaurants: [],
    lastModified: null
  },
  
  // 동기화 상태
  syncStatus: {
    lastSync: null,
    isSyncing: false,
    syncError: null,
    pendingChanges: []
  },
  
  // 앱 설정
  settings: {
    version: '1.0.0',
    buildNumber: '1',
    lastUpdated: null,
    debugMode: __DEV__
  }
};

// 상태 리듀서
function appStateReducer(state, action) {
  switch (action.type) {
    case STATE_ACTION.SET_APP_STATE:
      return {
        ...state,
        appState: action.payload
      };
      
    case STATE_ACTION.SET_USER_DATA:
      return {
        ...state,
        currentUser: action.payload
      };
      
    case STATE_ACTION.SET_NETWORK_STATUS:
      return {
        ...state,
        networkStatus: {
          ...state.networkStatus,
          ...action.payload
        }
      };
      
    case STATE_ACTION.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      };
      
    case STATE_ACTION.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        appState: APP_STATE.ERROR
      };
      
    case STATE_ACTION.CLEAR_ERROR:
      return {
        ...state,
        error: null,
        appState: state.appState === APP_STATE.ERROR ? APP_STATE.READY : state.appState
      };
      
    case STATE_ACTION.UPDATE_CACHE:
      return {
        ...state,
        cache: {
          ...state.cache,
          [action.payload.key]: {
            ...state.cache[action.payload.key],
            ...action.payload.data,
            lastUpdated: Date.now()
          }
        }
      };
      
    case STATE_ACTION.CLEAR_CACHE:
      return {
        ...state,
        cache: {
          schedules: {},
          restaurants: {},
          users: {},
          parties: {}
        }
      };
      
    case STATE_ACTION.SET_OFFLINE_DATA:
      return {
        ...state,
        offlineData: {
          ...state.offlineData,
          ...action.payload,
          lastModified: Date.now()
        }
      };
      
    case STATE_ACTION.SET_LAST_SYNC:
      return {
        ...state,
        syncStatus: {
          ...state.syncStatus,
          lastSync: action.payload
        }
      };
      
    default:
      return state;
  }
}

// Context 생성
const AppStateContext = createContext({
  // 상태
  ...initialState,
  
  // 액션
  setAppState: () => {},
  setUserData: () => {},
  setNetworkStatus: () => {},
  setLoading: () => {},
  setError: () => {},
  clearError: () => {},
  updateCache: () => {},
  clearCache: () => {},
  setOfflineData: () => {},
  setLastSync: () => {},
  
  // 유틸리티
  isReady: () => {},
  isOnline: () => {},
  getCacheData: () => {},
  saveToStorage: () => {},
  loadFromStorage: () => {},
  resetAppState: () => {}
});

// Provider 컴포넌트
export const AppStateProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appStateReducer, initialState);
  const [isInitialized, setIsInitialized] = useState(false);

  // 액션 함수들
  const setAppState = useCallback((appState) => {
    dispatch({ type: STATE_ACTION.SET_APP_STATE, payload: appState });
  }, []);

  const setUserData = useCallback((userData) => {
    dispatch({ type: STATE_ACTION.SET_USER_DATA, payload: userData });
  }, []);

  const setNetworkStatus = useCallback((networkStatus) => {
    dispatch({ type: STATE_ACTION.SET_NETWORK_STATUS, payload: networkStatus });
  }, []);

  const setLoading = useCallback((isLoading) => {
    dispatch({ type: STATE_ACTION.SET_LOADING, payload: isLoading });
  }, []);

  const setError = useCallback((error) => {
    dispatch({ type: STATE_ACTION.SET_ERROR, payload: error });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: STATE_ACTION.CLEAR_ERROR });
  }, []);

  const updateCache = useCallback((key, data) => {
    dispatch({ 
      type: STATE_ACTION.UPDATE_CACHE, 
      payload: { key, data } 
    });
  }, []);

  const clearCache = useCallback(() => {
    dispatch({ type: STATE_ACTION.CLEAR_CACHE });
  }, []);

  const setOfflineData = useCallback((offlineData) => {
    dispatch({ type: STATE_ACTION.SET_OFFLINE_DATA, payload: offlineData });
  }, []);

  const setLastSync = useCallback((timestamp) => {
    dispatch({ type: STATE_ACTION.SET_LAST_SYNC, payload: timestamp });
  }, []);

  // 유틸리티 함수들
  const isReady = useCallback(() => {
    return state.appState === APP_STATE.READY && !state.isLoading;
  }, [state.appState, state.isLoading]);

  const isOnline = useCallback(() => {
    return state.networkStatus.isOnline && state.networkStatus.isConnected;
  }, [state.networkStatus]);

  const getCacheData = useCallback((key, maxAge = 5 * 60 * 1000) => {
    const cacheItem = state.cache[key];
    if (!cacheItem) return null;
    
    const age = Date.now() - (cacheItem.lastUpdated || 0);
    if (age > maxAge) return null;
    
    return cacheItem;
  }, [state.cache]);

  // 저장소 작업
  const saveToStorage = useCallback(async (key, data) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
      console.log(`💾 [AppState] 저장 완료: ${key}`);
    } catch (error) {
      console.error(`❌ [AppState] 저장 실패 (${key}):`, error);
    }
  }, []);

  const loadFromStorage = useCallback(async (key, defaultValue = null) => {
    try {
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
      console.error(`❌ [AppState] 로드 실패 (${key}):`, error);
      return defaultValue;
    }
  }, []);

  const resetAppState = useCallback(async () => {
    try {
      // 저장소 정리
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.APP_STATE),
        AsyncStorage.removeItem(STORAGE_KEYS.CACHE_DATA),
        AsyncStorage.removeItem(STORAGE_KEYS.OFFLINE_DATA)
      ]);
      
      // 상태 초기화
      dispatch({ type: STATE_ACTION.SET_APP_STATE, payload: APP_STATE.INITIALIZING });
      dispatch({ type: STATE_ACTION.CLEAR_ERROR });
      dispatch({ type: STATE_ACTION.CLEAR_CACHE });
      
      console.log('🧹 [AppState] 상태 초기화 완료');
    } catch (error) {
      console.error('❌ [AppState] 상태 초기화 실패:', error);
    }
  }, []);

  // 앱 상태 초기화
  const initializeAppState = useCallback(async () => {
    try {
      console.log('🚀 [AppState] 앱 상태 초기화 시작...');
      setLoading(true);

      // 저장된 데이터 로드
      const [
        savedAppState,
        userPreferences,
        cacheData,
        offlineData,
        lastSync
      ] = await Promise.all([
        loadFromStorage(STORAGE_KEYS.APP_STATE),
        loadFromStorage(STORAGE_KEYS.USER_PREFERENCES),
        loadFromStorage(STORAGE_KEYS.CACHE_DATA),
        loadFromStorage(STORAGE_KEYS.OFFLINE_DATA),
        loadFromStorage(STORAGE_KEYS.LAST_SYNC)
      ]);

      // 저장된 상태 복원
      if (savedAppState) {
        setAppState(savedAppState.appState || APP_STATE.READY);
      }

      if (userPreferences) {
        dispatch({
          type: STATE_ACTION.UPDATE_CACHE,
          payload: { key: 'userPreferences', data: userPreferences }
        });
      }

      if (cacheData) {
        dispatch({
          type: STATE_ACTION.UPDATE_CACHE,
          payload: { key: 'cache', data: cacheData }
        });
      }

      if (offlineData) {
        setOfflineData(offlineData);
      }

      if (lastSync) {
        setLastSync(lastSync);
      }

      setAppState(APP_STATE.READY);
      console.log('✅ [AppState] 앱 상태 초기화 완료');

    } catch (error) {
      console.error('❌ [AppState] 초기화 실패:', error);
      setError(error.message);
    } finally {
      setLoading(false);
      setIsInitialized(true);
    }
  }, [loadFromStorage, setLoading, setAppState, setError, setOfflineData, setLastSync]);

  // 상태 변경 시 저장소에 저장
  useEffect(() => {
    if (isInitialized) {
      const saveState = async () => {
        await saveToStorage(STORAGE_KEYS.APP_STATE, {
          appState: state.appState,
          userPreferences: state.userPreferences,
          lastUpdated: Date.now()
        });
      };
      
      saveState();
    }
  }, [state.appState, state.userPreferences, isInitialized, saveToStorage]);

  // 캐시 변경 시 저장소에 저장
  useEffect(() => {
    if (isInitialized && Object.keys(state.cache).length > 0) {
      saveToStorage(STORAGE_KEYS.CACHE_DATA, state.cache);
    }
  }, [state.cache, isInitialized, saveToStorage]);

  // 오프라인 데이터 변경 시 저장소에 저장
  useEffect(() => {
    if (isInitialized && state.offlineData.lastModified) {
      saveToStorage(STORAGE_KEYS.OFFLINE_DATA, state.offlineData);
    }
  }, [state.offlineData, isInitialized, saveToStorage]);

  // 동기화 시간 저장
  useEffect(() => {
    if (isInitialized && state.syncStatus.lastSync) {
      saveToStorage(STORAGE_KEYS.LAST_SYNC, state.syncStatus.lastSync);
    }
  }, [state.syncStatus.lastSync, isInitialized, saveToStorage]);

  // 초기화
  useEffect(() => {
    initializeAppState();
  }, [initializeAppState]);

  // Context 값
  const contextValue = {
    // 상태
    ...state,
    
    // 액션
    setAppState,
    setUserData,
    setNetworkStatus,
    setLoading,
    setError,
    clearError,
    updateCache,
    clearCache,
    setOfflineData,
    setLastSync,
    
    // 유틸리티
    isReady,
    isOnline,
    getCacheData,
    saveToStorage,
    loadFromStorage,
    resetAppState,
    
    // 상수
    APP_STATE,
    STATE_ACTION
  };

  return (
    <AppStateContext.Provider value={contextValue}>
      {children}
    </AppStateContext.Provider>
  );
};

// Hook for using app state context
export const useAppState = () => {
  const context = useContext(AppStateContext);
  
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  
  return context;
};

// 앱 상태 표시 컴포넌트
export const AppStateIndicator = ({ style }) => {
  const { appState, isLoading, error } = useAppState();

  const getStatusInfo = () => {
    switch (appState) {
      case APP_STATE.INITIALIZING:
        return { icon: '🔄', text: '초기화 중...', color: '#F59E0B' };
      case APP_STATE.READY:
        return { icon: '✅', text: '준비됨', color: '#10B981' };
      case APP_STATE.ERROR:
        return { icon: '❌', text: '오류', color: '#EF4444' };
      case APP_STATE.OFFLINE:
        return { icon: '📴', text: '오프라인', color: '#6B7280' };
      case APP_STATE.MAINTENANCE:
        return { icon: '🔧', text: '점검 중', color: '#F59E0B' };
      default:
        return { icon: '❓', text: '알 수 없음', color: '#6B7280' };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <View style={[styles.statusIndicator, style]}>
      <Text style={styles.statusIcon}>{statusInfo.icon}</Text>
      <Text style={[styles.statusText, { color: statusInfo.color }]}>
        {isLoading ? '로딩 중...' : statusInfo.text}
      </Text>
      {error && (
        <Text style={styles.errorText} numberOfLines={1}>
          {error}
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
  errorText: {
    fontSize: 10,
    color: '#EF4444',
    marginLeft: 4,
    flex: 1,
  },
};

export default AppStateContext;
