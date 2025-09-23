/**
 * API 클라이언트 유틸리티
 * 모든 API 호출에 개발용 토큰을 자동으로 적용합니다.
 */

import { apiRequest, getAuthHeaders } from '../config/config';

/**
 * API 요청 래퍼 함수
 * 개발 환경에서는 자동으로 개발용 토큰을 적용합니다.
 */
export const apiClient = {
  /**
   * GET 요청
   */
  async get(url, options = {}) {
    return await apiRequest(url, {
      method: 'GET',
      ...options
    });
  },

  /**
   * POST 요청
   */
  async post(url, data = null, options = {}) {
    return await apiRequest(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        ...options.headers
      },
      body: data ? JSON.stringify(data) : undefined,
      ...options
    });
  },

  /**
   * PUT 요청
   */
  async put(url, data = null, options = {}) {
    return await apiRequest(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        ...options.headers
      },
      body: data ? JSON.stringify(data) : undefined,
      ...options
    });
  },

  /**
   * DELETE 요청
   */
  async delete(url, options = {}) {
    return await apiRequest(url, {
      method: 'DELETE',
      ...options
    });
  },

  /**
   * PATCH 요청
   */
  async patch(url, data = null, options = {}) {
    return await apiRequest(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        ...options.headers
      },
      body: data ? JSON.stringify(data) : undefined,
      ...options
    });
  }
};

/**
 * 기존 fetch 호출을 apiClient로 변환하는 헬퍼 함수들
 */
export const fetchWithAuth = apiRequest;

/**
 * 개발용 토큰이 적용된 fetch 함수
 * 기존 코드와의 호환성을 위해 제공됩니다.
 */
export const devFetch = async (url, options = {}) => {
  return await apiRequest(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers
    }
  });
};

export default apiClient;
