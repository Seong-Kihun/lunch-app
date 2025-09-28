/**
 * 통합 인증 관리자
 * 로그인, 로그아웃, 토큰 관리, 사용자 세션을 중앙에서 관리하는 단일 진실의 원천
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { AUTH_STATES } from '../contexts/AuthContext';

// AuthContext의 AUTH_STATES 사용 (통일화)
export const AUTH_STATUS = {
  ...AUTH_STATES,
  AUTHENTICATING: 'authenticating',
  REFRESHING: 'refreshing',
  ERROR: 'error'
};

// 저장소 키
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'auth_manager_access_token',
  REFRESH_TOKEN: 'auth_manager_refresh_token',
  USER_DATA: 'auth_manager_user_data',
  LOGIN_TIMESTAMP: 'auth_manager_login_timestamp',
  TOKEN_EXPIRES_AT: 'auth_manager_token_expires_at'
};

// 인증 설정
const AUTH_CONFIG = {
  TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000, // 5분 전에 토큰 갱신
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1초
  TOKEN_EXPIRY_BUFFER: 30 * 1000 // 30초 버퍼
};

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.accessToken = null;
    this.refreshToken = null;
    this.status = AUTH_STATUS.UNAUTHENTICATED;
    this.isInitialized = false;
    this.listeners = new Set();
    this.refreshTimer = null;
    this.retryCount = 0;
    
    // 인스턴스 고유 ID 생성
    this.instanceId = Math.random().toString(36).substr(2, 9);
    console.log(`🔧 [AuthManager] 인스턴스 생성됨 (ID: ${this.instanceId})`);
    
    console.log('🔐 [AuthManager] 인스턴스 생성됨');
  }

  /**
   * 인증 관리자 초기화
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('✅ [AuthManager] 이미 초기화됨');
      return this.status;
    }

    try {
      console.log('🚀 [AuthManager] 초기화 시작...');
      this.status = AUTH_STATUS.AUTHENTICATING;
      this.notifyListeners();

      // 저장된 토큰 확인
      await this.loadStoredTokens();
      
      if (this.accessToken && this.currentUser) {
        // 토큰 유효성 확인
        if (await this.validateToken()) {
          console.log('✅ [AuthManager] 저장된 토큰으로 인증 완료');
          this.status = AUTH_STATUS.AUTHENTICATED;
          this.startTokenRefreshTimer();
        } else {
          console.log('⚠️ [AuthManager] 저장된 토큰 만료, 갱신 시도');
          if (this.refreshToken) {
            await this.refreshAccessToken();
          } else {
            await this.logout();
          }
        }
      } else {
        console.log('🔍 [AuthManager] 저장된 인증 정보 없음');
        this.status = AUTH_STATUS.UNAUTHENTICATED;
      }

      this.isInitialized = true;
      this.notifyListeners();
      console.log('✅ [AuthManager] 초기화 완료');
      return this.status;

    } catch (error) {
      console.error('❌ [AuthManager] 초기화 실패:', error);
      this.status = AUTH_STATUS.ERROR;
      this.notifyListeners();
      throw error;
    }
  }

  /**
   * 저장된 토큰 로드
   */
  async loadStoredTokens() {
    try {
      const [accessToken, refreshToken, userData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN),
        AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN),
        AsyncStorage.getItem(STORAGE_KEYS.USER_DATA)
      ]);

      if (accessToken && userData) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.currentUser = JSON.parse(userData);
        console.log('📱 [AuthManager] 저장된 토큰 로드됨');
      }
    } catch (error) {
      console.warn('⚠️ [AuthManager] 저장된 토큰 로드 실패:', error);
    }
  }

  /**
   * 토큰 저장
   */
  async storeTokens(accessToken, refreshToken, userData) {
    try {
      const expiresAt = this.calculateTokenExpiry(accessToken);
      
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken),
        AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken || ''),
        AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData)),
        AsyncStorage.setItem(STORAGE_KEYS.LOGIN_TIMESTAMP, Date.now().toString()),
        AsyncStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRES_AT, expiresAt.toString())
      ]);

      console.log('💾 [AuthManager] 토큰 저장 완료');
    } catch (error) {
      console.error('❌ [AuthManager] 토큰 저장 실패:', error);
      throw error;
    }
  }

  /**
   * 토큰 만료 시간 계산
   */
  calculateTokenExpiry(token) {
    try {
      // JWT 토큰 디코딩 (클라이언트 사이드)
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000; // 밀리초로 변환
    } catch (error) {
      console.warn('⚠️ [AuthManager] 토큰 만료 시간 계산 실패:', error);
      return Date.now() + (24 * 60 * 60 * 1000); // 24시간 기본값
    }
  }

  /**
   * 로그인 처리
   */
  async login(credentials) {
    try {
      console.log('🔐 [AuthManager] 로그인 시도 시작');
      this.status = AUTH_STATUS.AUTHENTICATING;
      this.notifyListeners();

      // 서버 URL 가져오기 - 통합 시스템 사용
      const { getServerURL } = await import('../utils/networkUnifiedManager');
      const serverURL = getServerURL();

      // 로그인 API 호출
      const response = await fetch(`${serverURL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '로그인에 실패했습니다');
      }

      if (!data.access_token || !data.user) {
        throw new Error('서버에서 유효하지 않은 응답을 받았습니다');
      }

      // 토큰 및 사용자 정보 저장
      await this.storeTokens(data.access_token, data.refresh_token, data.user);
      
      // 인스턴스 상태 업데이트
      this.accessToken = data.access_token;
      this.refreshToken = data.refresh_token;
      this.currentUser = data.user;
      this.status = AUTH_STATUS.AUTHENTICATED;
      this.retryCount = 0;

      // 토큰 갱신 타이머 시작
      this.startTokenRefreshTimer();

      // 전역 변수 업데이트 (레거시 호환성)
      global.currentUser = data.user;

      // 인증 상태를 AUTHENTICATED로 설정
      this.status = AUTH_STATUS.AUTHENTICATED;
      this.isAuthenticated = true;
      this.user = data.user;

      console.log('✅ [AuthManager] 로그인 성공:', data.user.nickname);
      
      // 리스너가 없는 경우 경고
      if (this.listeners.size === 0) {
        console.warn('⚠️ [AuthManager] 로그인 성공했지만 리스너가 등록되지 않음!');
        console.warn('⚠️ [AuthManager] AuthContext가 제대로 초기화되지 않았을 수 있습니다.');
      }
      
      this.notifyListeners();
      
      return {
        user: data.user,
        accessToken: data.access_token,
        refreshToken: data.refresh_token
      };

    } catch (error) {
      console.error('❌ [AuthManager] 로그인 실패:', error);
      this.status = AUTH_STATUS.ERROR;
      this.notifyListeners();
      throw error;
    }
  }

  /**
   * 로그아웃 처리
   */
  async logout() {
    try {
      console.log('🚪 [AuthManager] 로그아웃 시작');

      // 토큰 갱신 타이머 정지
      this.stopTokenRefreshTimer();

      // 서버에 로그아웃 요청 (선택적)
      if (this.accessToken) {
        try {
          const { getServerURL } = await import('../utils/networkUtils');
          const serverURL = await getServerURL();
          
          await fetch(`${serverURL}/api/auth/logout`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json',
            }
          });
        } catch (error) {
          console.warn('⚠️ [AuthManager] 서버 로그아웃 요청 실패:', error);
        }
      }

      // 저장된 토큰 삭제
      await this.clearStoredTokens();

      // 인스턴스 상태 초기화
      this.currentUser = null;
      this.accessToken = null;
      this.refreshToken = null;
      this.status = AUTH_STATUS.UNAUTHENTICATED;

      // 전역 변수 초기화 (레거시 호환성)
      global.currentUser = null;

      console.log('✅ [AuthManager] 로그아웃 완료');
      this.notifyListeners();

    } catch (error) {
      console.error('❌ [AuthManager] 로그아웃 실패:', error);
      throw error;
    }
  }

  /**
   * 저장된 토큰 삭제
   */
  async clearStoredTokens() {
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN),
        AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN),
        AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA),
        AsyncStorage.removeItem(STORAGE_KEYS.LOGIN_TIMESTAMP),
        AsyncStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRES_AT)
      ]);
      console.log('🧹 [AuthManager] 저장된 토큰 삭제 완료');
    } catch (error) {
      console.warn('⚠️ [AuthManager] 토큰 삭제 실패:', error);
    }
  }

  /**
   * 액세스 토큰 갱신
   */
  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('리프레시 토큰이 없습니다');
    }

    try {
      console.log('🔄 [AuthManager] 토큰 갱신 시도');
      this.status = AUTH_STATUS.REFRESHING;
      this.notifyListeners();

      const { getServerURL } = await import('../utils/networkUtils');
      const serverURL = await getServerURL();

      const response = await fetch(`${serverURL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.refreshToken}`,
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '토큰 갱신에 실패했습니다');
      }

      // 새 토큰 저장
      await this.storeTokens(data.access_token, data.refresh_token || this.refreshToken, this.currentUser);
      
      this.accessToken = data.access_token;
      if (data.refresh_token) {
        this.refreshToken = data.refresh_token;
      }

      this.status = AUTH_STATUS.AUTHENTICATED;
      this.retryCount = 0;

      console.log('✅ [AuthManager] 토큰 갱신 성공');
      this.notifyListeners();
      
      return data.access_token;

    } catch (error) {
      console.error('❌ [AuthManager] 토큰 갱신 실패:', error);
      
      // 갱신 실패 시 로그아웃
      await this.logout();
      throw error;
    }
  }

  /**
   * 토큰 유효성 검증
   */
  async validateToken() {
    if (!this.accessToken) {
      return false;
    }

    try {
      const expiresAt = this.calculateTokenExpiry(this.accessToken);
      const now = Date.now();
      const bufferTime = AUTH_CONFIG.TOKEN_EXPIRY_BUFFER;
      
      // 토큰이 만료되었거나 곧 만료될 예정인지 확인
      if (now >= (expiresAt - bufferTime)) {
        console.log('⚠️ [AuthManager] 토큰 만료됨 또는 곧 만료 예정');
        return false;
      }

      return true;
    } catch (error) {
      console.warn('⚠️ [AuthManager] 토큰 검증 실패:', error);
      return false;
    }
  }

  /**
   * 토큰 갱신 타이머 시작
   */
  startTokenRefreshTimer() {
    this.stopTokenRefreshTimer();

    const checkToken = async () => {
      try {
        if (this.status === AUTH_STATUS.AUTHENTICATED && this.accessToken) {
          const expiresAt = this.calculateTokenExpiry(this.accessToken);
          const now = Date.now();
          const timeUntilExpiry = expiresAt - now;

          // 갱신 임계값에 도달했으면 토큰 갱신
          if (timeUntilExpiry <= AUTH_CONFIG.TOKEN_REFRESH_THRESHOLD) {
            console.log('🔄 [AuthManager] 토큰 갱신 필요, 자동 갱신 시작');
            await this.refreshAccessToken();
          }
        }
      } catch (error) {
        console.error('❌ [AuthManager] 자동 토큰 갱신 실패:', error);
      }
    };

    // 1분마다 토큰 상태 확인
    this.refreshTimer = setInterval(checkToken, 60000);
    console.log('⏰ [AuthManager] 토큰 갱신 타이머 시작됨');
  }

  /**
   * 토큰 갱신 타이머 정지
   */
  stopTokenRefreshTimer() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
      console.log('⏹️ [AuthManager] 토큰 갱신 타이머 정지됨');
    }
  }

  /**
   * 현재 인증 상태 가져오기
   */
  getAuthStatus() {
    return {
      status: this.status,
      user: this.currentUser,
      isAuthenticated: this.status === AUTH_STATUS.AUTHENTICATED,
      isInitialized: this.isInitialized,
      accessToken: this.accessToken
    };
  }

  /**
   * 현재 사용자 정보 가져오기
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * 액세스 토큰 가져오기
   */
  getAccessToken() {
    return this.accessToken;
  }

  /**
   * 인증된 API 요청을 위한 헤더 가져오기
   */
  getAuthHeaders() {
    if (!this.accessToken) {
      return {};
    }
    
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * 상태 변경 리스너 추가
   */
  addStatusListener(listener) {
    console.log('🔧 [AuthManager] 리스너 추가:', {
      listenersCount: this.listeners.size,
      newListenerType: typeof listener
    });
    this.listeners.add(listener);
    console.log('✅ [AuthManager] 리스너 추가 완료:', {
      listenersCount: this.listeners.size
    });
    return () => {
      console.log('🗑️ [AuthManager] 리스너 제거');
      this.listeners.delete(listener);
    };
  }

  /**
   * 리스너들에게 상태 변경 알림
   */
  notifyListeners() {
    const authStatus = this.getAuthStatus();
    console.log('🔔 [AuthManager] 리스너들에게 상태 변경 알림:', {
      status: authStatus.status,
      isAuthenticated: authStatus.isAuthenticated,
      user: authStatus.user?.nickname,
      listenersCount: this.listeners.size
    });
    
    this.listeners.forEach((listener, index) => {
      try {
        console.log(`🔔 [AuthManager] 리스너 ${index} 호출 중...`);
        listener(authStatus);
        console.log(`✅ [AuthManager] 리스너 ${index} 호출 완료`);
      } catch (error) {
        console.error(`❌ [AuthManager] 리스너 ${index} 실행 오류:`, error);
      }
    });
  }

  /**
   * 정리 작업
   */
  destroy() {
    this.stopTokenRefreshTimer();
    this.listeners.clear();
    console.log('🧹 [AuthManager] 정리 완료');
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
const authManager = new AuthManager();
export default authManager;
