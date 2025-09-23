import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// 토큰 키 상수
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
  AUTH_STATUS: 'auth_status'
};

// 보안 등급별 저장소 선택
const getSecureStorage = (isHighSecurity = false) => {
  return isHighSecurity ? SecureStore : AsyncStorage;
};

/**
 * 토큰 저장
 * @param {string} key - 저장할 키
 * @param {string} value - 저장할 값
 * @param {boolean} isHighSecurity - 높은 보안이 필요한지 여부
 */
export const storeToken = async (key, value, isHighSecurity = false) => {
  try {
    const storage = getSecureStorage(isHighSecurity);
    
    if (isHighSecurity) {
      await storage.setItemAsync(key, value);
    } else {
      await storage.setItem(key, value);
    }
    
    console.log(`토큰 저장 성공: ${key}`);
    return true;
  } catch (error) {
    console.error(`토큰 저장 실패: ${key}`, error);
    return false;
  }
};

/**
 * 토큰 조회
 * @param {string} key - 조회할 키
 * @param {boolean} isHighSecurity - 높은 보안이 필요한지 여부
 */
export const getToken = async (key, isHighSecurity = false) => {
  try {
    const storage = getSecureStorage(isHighSecurity);
    
    let value;
    if (isHighSecurity) {
      value = await storage.getItemAsync(key);
    } else {
      value = await storage.getItem(key);
    }
    
    return value;
  } catch (error) {
    console.error(`토큰 조회 실패: ${key}`, error);
    return null;
  }
};

/**
 * 토큰 삭제
 * @param {string} key - 삭제할 키
 * @param {boolean} isHighSecurity - 높은 보안이 필요한지 여부
 */
export const removeToken = async (key, isHighSecurity = false) => {
  try {
    const storage = getSecureStorage(isHighSecurity);
    
    if (isHighSecurity) {
      await storage.deleteItemAsync(key);
    } else {
      await storage.removeItem(key);
    }
    
    console.log(`토큰 삭제 성공: ${key}`);
    return true;
  } catch (error) {
    console.error(`토큰 삭제 실패: ${key}`, error);
    return false;
  }
};

/**
 * 모든 토큰 삭제 (로그아웃 시 사용)
 */
export const clearAllTokens = async () => {
  try {
    // 보안 저장소의 토큰들 삭제
    await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
    
    // 일반 저장소의 토큰들 삭제
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.ACCESS_TOKEN,
      STORAGE_KEYS.USER_DATA,
      STORAGE_KEYS.AUTH_STATUS
    ]);
    
    console.log('모든 토큰 삭제 완료');
    return true;
  } catch (error) {
    console.error('토큰 삭제 실패', error);
    return false;
  }
};

/**
 * 액세스 토큰 저장 (메모리 + 일반 저장소)
 */
export const storeAccessToken = async (token) => {
  try {
    // 전역 변수 사용 제거 - Context 기반으로 변경
    // global.accessToken = token;
    
    // 백업용으로 일반 저장소에도 저장
    await storeToken(STORAGE_KEYS.ACCESS_TOKEN, token, false);
    
    return true;
  } catch (error) {
    console.error('액세스 토큰 저장 실패', error);
    return false;
  }
};

/**
 * 액세스 토큰 조회 (메모리 우선)
 */
export const getAccessToken = async () => {
  try {
    // 전역 변수 사용 제거 - Context 기반으로 변경
    // 메모리에서 먼저 조회
    // if (global.accessToken) {
    //   return global.accessToken;
    // }
    
    // 메모리에 없으면 저장소에서 조회
    const token = await getToken(STORAGE_KEYS.ACCESS_TOKEN, false);
    if (token) {
      // global.accessToken = token;
      return token;
    }
    
    return null;
  } catch (error) {
    console.error('액세스 토큰 조회 실패', error);
    return null;
  }
};

/**
 * 리프레시 토큰 저장 (보안 저장소)
 */
export const storeRefreshToken = async (token) => {
  return await storeToken(STORAGE_KEYS.REFRESH_TOKEN, token, true);
};

/**
 * 리프레시 토큰 조회 (보안 저장소)
 */
export const getRefreshToken = async () => {
  return await getToken(STORAGE_KEYS.REFRESH_TOKEN, true);
};

/**
 * 사용자 데이터 저장
 */
export const storeUserData = async (userData) => {
  try {
    const jsonValue = JSON.stringify(userData);
    await storeToken(STORAGE_KEYS.USER_DATA, jsonValue, false);
    return true;
  } catch (error) {
    console.error('사용자 데이터 저장 실패', error);
    return false;
  }
};

/**
 * 사용자 데이터 조회
 */
export const getUserData = async () => {
  try {
    const jsonValue = await getToken(STORAGE_KEYS.USER_DATA, false);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    console.error('사용자 데이터 조회 실패', error);
    return null;
  }
};

/**
 * 인증 상태 저장
 */
export const storeAuthStatus = async (status) => {
  return await storeToken(STORAGE_KEYS.AUTH_STATUS, status, false);
};

/**
 * 인증 상태 조회
 */
export const getAuthStatus = async () => {
  return await getToken(STORAGE_KEYS.AUTH_STATUS, false);
};

/**
 * 토큰 만료 시간 확인
 */
export const isTokenExpired = (token) => {
  if (!token) return true;
  
  try {
    // JWT 토큰 디코딩 (헤더와 페이로드만)
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    
    const payload = JSON.parse(jsonPayload);
    const currentTime = Math.floor(Date.now() / 1000);
    
    // 만료 시간 5분 전에 만료된 것으로 간주
    return payload.exp < (currentTime + 300);
  } catch (error) {
    console.error('토큰 만료 시간 확인 실패', error);
    return true;
  }
};

/**
 * 저장된 토큰들의 상태 확인
 */
export const checkStoredTokens = async () => {
  try {
    const accessToken = await getAccessToken();
    const refreshToken = await getRefreshToken();
    const userData = await getUserData();
    
    return {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      hasUserData: !!userData,
      isAccessTokenExpired: isTokenExpired(accessToken),
      accessToken,
      refreshToken,
      userData
    };
  } catch (error) {
    console.error('저장된 토큰 상태 확인 실패', error);
    return {
      hasAccessToken: false,
      hasRefreshToken: false,
      hasUserData: false,
      isAccessTokenExpired: true,
      accessToken: null,
      refreshToken: null,
      userData: null
    };
  }
};

export default {
  STORAGE_KEYS,
  storeToken,
  getToken,
  removeToken,
  clearAllTokens,
  storeAccessToken,
  getAccessToken,
  storeRefreshToken,
  getRefreshToken,
  storeUserData,
  getUserData,
  storeAuthStatus,
  getAuthStatus,
  isTokenExpired,
  checkStoredTokens
};
