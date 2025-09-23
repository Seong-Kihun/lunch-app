import { getServerURL } from '../utils/networkUtils';
import { 
  storeUserData,
  getAccessToken
} from '../utils/secureStorage';

/**
 * API 요청 헬퍼 함수
 */
const apiRequest = async (endpoint, options = {}) => {
  try {
    const baseURL = await getServerURL();
    const url = `${baseURL}${endpoint}`;
    
    console.log(`🔗 API 호출 시작: ${url}`);
    
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
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API 요청 실패 (${endpoint}):`, error);
    throw error;
  }
};

/**
 * 인증이 필요한 API 요청 헬퍼 함수
 */
const authenticatedApiRequest = async (endpoint, options = {}) => {
  try {
    const accessToken = await getAccessToken();
    
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
 * 사용자 프로필 조회
 */
export const getUserProfile = async () => {
  try {
    // 개발 환경에서는 개발용 API 사용
    const isDevelopment = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV === 'development';
    
    if (isDevelopment) {
      // 개발용 API 사용 (인증 없이)
      const data = await apiRequest('/dev/users/1');
      return { user: data };
    } else {
      // 프로덕션에서는 인증된 API 사용
      const data = await authenticatedApiRequest('/api/users/profile');
      // 로컬에 사용자 데이터 저장
      await storeUserData(data.user);
      return data;
    }
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
    const data = await authenticatedApiRequest('/api/users/profile', {
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
 * 사용자 활동 통계 조회
 */
export const getUserActivityStats = async (period = 'month') => {
  try {
    const data = await authenticatedApiRequest(`/api/users/activity-stats?period=${period}`);
    return data;
  } catch (error) {
    console.error('활동 통계 조회 실패:', error);
    throw error;
  }
};

/**
 * 사용자 약속 목록 조회
 */
export const getUserAppointments = async (status = 'all', page = 1, limit = 20) => {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    
    if (status !== 'all') {
      params.append('status', status);
    }
    
    const data = await authenticatedApiRequest(`/api/users/appointments?${params}`);
    return data;
  } catch (error) {
    console.error('약속 목록 조회 실패:', error);
    throw error;
  }
};

/**
 * 사용자 약속 상세 조회
 */
export const getAppointmentDetail = async (appointmentId) => {
  try {
    const data = await authenticatedApiRequest(`/api/users/appointments/${appointmentId}`);
    return data;
  } catch (error) {
    console.error('약속 상세 조회 실패:', error);
    throw error;
  }
};

/**
 * 약속 메모리얼 플래그 설정
 */
export const setAppointmentMemorable = async (appointmentId, memorable) => {
  try {
    const data = await authenticatedApiRequest(`/api/users/appointments/${appointmentId}/memorable`, {
      method: 'PUT',
      body: JSON.stringify({ memorable })
    });
    return data;
  } catch (error) {
    console.error('메모리얼 플래그 설정 실패:', error);
    throw error;
  }
};

/**
 * 약속 취소
 */
export const cancelAppointment = async (appointmentId) => {
  try {
    const data = await authenticatedApiRequest(`/api/users/appointments/${appointmentId}`, {
      method: 'DELETE'
    });
    return data;
  } catch (error) {
    console.error('약속 취소 실패:', error);
    throw error;
  }
};

/**
 * 사용자 포인트 정보 조회
 */
export const getUserPoints = async () => {
  try {
    const data = await authenticatedApiRequest('/api/users/points');
    return data;
  } catch (error) {
    console.error('포인트 정보 조회 실패:', error);
    throw error;
  }
};

/**
 * 사용자 포인트 히스토리 조회
 */
export const getUserPointsHistory = async (page = 1, limit = 20) => {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    
    const data = await authenticatedApiRequest(`/api/users/points/history?${params}`);
    return data;
  } catch (error) {
    console.error('포인트 히스토리 조회 실패:', error);
    throw error;
  }
};

/**
 * 사용자 배지 목록 조회
 */
export const getUserBadges = async () => {
  try {
    const data = await authenticatedApiRequest('/api/users/badges');
    return data;
  } catch (error) {
    console.error('배지 목록 조회 실패:', error);
    throw error;
  }
};

/**
 * 사용자 알림 설정 조회
 */
export const getUserNotificationSettings = async () => {
  try {
    const data = await authenticatedApiRequest('/api/users/notification-settings');
    return data;
  } catch (error) {
    console.error('알림 설정 조회 실패:', error);
    throw error;
  }
};

/**
 * 사용자 알림 설정 수정
 */
export const updateUserNotificationSettings = async (settings) => {
  try {
    const data = await authenticatedApiRequest('/api/users/notification-settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
    return data;
  } catch (error) {
    console.error('알림 설정 수정 실패:', error);
    throw error;
  }
};

export default {
  getUserProfile,
  updateUserProfile,
  getUserActivityStats,
  getUserAppointments,
  getAppointmentDetail,
  setAppointmentMemorable,
  cancelAppointment,
  getUserPoints,
  getUserPointsHistory,
  getUserBadges,
  getUserNotificationSettings,
  updateUserNotificationSettings
};
