import { getServerURL } from '../utils/networkUtils';
import { 
  storeAccessToken, 
  storeRefreshToken, 
  storeUserData,
  clearAllTokens,
  getRefreshToken
} from '../utils/secureStorage';

// 동적 서버 URL 가져오기
const getApiBaseUrl = async () => {
  try {
    return await getServerURL();
  } catch (error) {
    console.error('❌ [AuthService] 서버 URL 가져오기 실패:', error);
    return __DEV__ ? 'http://localhost:5000' : 'https://lunch-app-backend-ra12.onrender.com';
  }
};

/**
 * API 요청 헬퍼 함수
 */
const apiRequest = async (endpoint, options = {}) => {
  try {
    const baseURL = await getApiBaseUrl();
    const url = `${baseURL}${endpoint}`;
    
    console.log(`🔗 [API] 호출 시작: ${url}`);
    console.log(`🔗 [API] 요청 옵션:`, {
      method: options.method || 'GET',
      headers: options.headers,
      body: options.body ? 'JSON 데이터' : '없음'
    });
    
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };
    
    const response = await fetch(url, {
      ...defaultOptions,
      ...options
    });
    
    console.log(`🔗 [API] 응답 상태: ${response.status} ${response.statusText}`);
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error(`❌ [API] 오류 응답:`, data);
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }
    
    console.log(`✅ [API] 응답 성공:`, data);
    return data;
  } catch (error) {
    console.error(`❌ [API] 요청 실패 (${endpoint}):`, error);
    console.error(`❌ [API] 오류 상세:`, {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    throw error;
  }
};

/**
 * 인증이 필요한 API 요청 헬퍼 함수
 */
const authenticatedApiRequest = async (endpoint, options = {}, accessToken) => {
  try {
    // 액세스 토큰 확인
    if (!accessToken) {
      throw new Error('액세스 토큰이 없습니다.');
    }
    
    const authOptions = {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${accessToken}`
      }
    };
    
    return await apiRequest(endpoint, authOptions);
  } catch (error) {
    console.error(`인증 API 요청 실패 (${endpoint}):`, error);
    throw error;
  }
};

/**
 * 매직링크 이메일 발송
 */
export const sendMagicLink = async (email) => {
  try {
    console.log('🔗 [MagicLink] 매직링크 발송 시작:', email);
    
    const data = await apiRequest('/api/auth/magic-link', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
    
    console.log('✅ [MagicLink] 매직링크 발송 성공:', data);
    return data;
  } catch (error) {
    console.error('❌ [MagicLink] 매직링크 발송 실패:', error);
    console.error('❌ [MagicLink] 오류 상세:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    throw error;
  }
};

/**
 * 사용자 회원가입
 */
export const registerUser = async (userData, tempToken) => {
  try {
    const data = await apiRequest('/auth/register', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tempToken}`
      },
      body: JSON.stringify(userData)
    });
    
    // 토큰과 사용자 데이터 저장
    if (data.access_token && data.refresh_token) {
      await storeAccessToken(data.access_token);
      await storeRefreshToken(data.refresh_token);
      await storeUserData(data.user);
      
      console.log('회원가입 완료 및 토큰 저장 성공');
    }
    
    return data;
  } catch (error) {
    console.error('회원가입 실패:', error);
    throw error;
  }
};

/**
 * 액세스 토큰 갱신
 */
export const refreshAccessToken = async () => {
  try {
    const refreshToken = await getRefreshToken();
    
    if (!refreshToken) {
      throw new Error('리프레시 토큰이 없습니다.');
    }
    
    const data = await apiRequest('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken })
    });
    
    // 새로운 액세스 토큰 저장
    if (data.access_token) {
      await storeAccessToken(data.access_token);
      console.log('액세스 토큰 갱신 성공');
    }
    
    return data;
  } catch (error) {
    console.error('액세스 토큰 갱신 실패:', error);
    throw error;
  }
};

/**
 * 로그아웃
 */
export const logout = async () => {
  try {
    const refreshToken = await getRefreshToken();
    
    if (refreshToken) {
      // 서버에 로그아웃 요청
      await apiRequest('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken })
      });
    }
    
    // 로컬 토큰들 삭제
    await clearAllTokens();
    
    console.log('로그아웃 완료');
    return true;
  } catch (error) {
    console.error('로그아웃 실패:', error);
    // 서버 요청이 실패해도 로컬 토큰은 삭제
    await clearAllTokens();
    throw error;
  }
};

/**
 * 사용자 프로필 조회
 */
export const getUserProfile = async () => {
  try {
    const data = await authenticatedApiRequest('/auth/profile');
    return data;
  } catch (error) {
    console.error('프로필 조회 실패:', error);
    throw error;
  }
};

/**
 * 사용자 프로필 수정
 */
export const updateUserProfile = async (profileData) => {
  try {
    const data = await authenticatedApiRequest('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
    
    // 업데이트된 사용자 데이터 저장
    if (data.user) {
      await storeUserData(data.user);
    }
    
    return data;
  } catch (error) {
    console.error('프로필 수정 실패:', error);
    throw error;
  }
};

/**
 * 계정 삭제
 */
export const deleteAccount = async () => {
  try {
    const data = await authenticatedApiRequest('/auth/delete-account', {
      method: 'DELETE'
    });
    
    // 계정 삭제 후 로컬 토큰들 삭제
    await clearAllTokens();
    
    return data;
  } catch (error) {
    console.error('계정 삭제 실패:', error);
    throw error;
  }
};

/**
 * 토큰 자동 갱신 (백그라운드에서 실행)
 */
export const autoRefreshToken = async (accessToken) => {
  try {
    // 액세스 토큰이 만료되었는지 확인
    if (!accessToken) {
      return false;
    }
    
    // JWT 토큰 디코딩하여 만료 시간 확인
    const payload = JSON.parse(atob(accessToken.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    
    // 만료 5분 전에 갱신
    if (payload.exp < (currentTime + 300)) {
      console.log('토큰 자동 갱신 시작');
      await refreshAccessToken();
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('토큰 자동 갱신 실패:', error);
    return false;
  }
};

/**
 * 네트워크 상태 확인
 */
export const checkNetworkStatus = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      timeout: 5000
    });
    
    return response.ok;
  } catch (error) {
    console.error('네트워크 상태 확인 실패:', error);
    return false;
  }
};

/**
 * 인증 상태 확인
 */
export const checkAuthStatus = async () => {
  try {
    // 저장된 토큰들 확인
    const { hasAccessToken, hasRefreshToken, isAccessTokenExpired } = await import('../utils/secureStorage').then(m => m.checkStoredTokens());
    
    if (!hasAccessToken && !hasRefreshToken) {
      return { isAuthenticated: false, needsLogin: true };
    }
    
    if (hasAccessToken && !isAccessTokenExpired) {
      return { isAuthenticated: true, needsLogin: false };
    }
    
    if (hasRefreshToken && isAccessTokenExpired) {
      // 토큰 갱신 시도
      try {
        await refreshAccessToken();
        return { isAuthenticated: true, needsLogin: false };
      } catch (error) {
        return { isAuthenticated: false, needsLogin: true };
      }
    }
    
    return { isAuthenticated: false, needsLogin: true };
  } catch (error) {
    console.error('인증 상태 확인 실패:', error);
    return { isAuthenticated: false, needsLogin: true };
  }
};

export default {
  sendMagicLink,
  registerUser,
  refreshAccessToken,
  logout,
  getUserProfile,
  updateUserProfile,
  deleteAccount,
  autoRefreshToken,
  checkNetworkStatus,
  checkAuthStatus
};
