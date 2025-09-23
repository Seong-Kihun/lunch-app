/**
 * 식당 서비스
 * 식당 관련 API 호출을 담당합니다.
 */

import apiClient from '../api/apiClient';

class RestaurantService {
    /**
     * 식당 목록 조회
     * @param {Object} params - 쿼리 파라미터
     * @returns {Promise<Object>} 식당 목록
     */
    async getRestaurants(params = {}) {
        try {
            const response = await apiClient.get('/api/v2/restaurants/', params);
            return response;
        } catch (error) {
            console.error('식당 목록 조회 실패:', error);
            throw error;
        }
    }

    /**
     * 식당 상세 정보 조회
     * @param {number} restaurantId - 식당 ID
     * @returns {Promise<Object>} 식당 상세 정보
     */
    async getRestaurant(restaurantId) {
        try {
            const response = await apiClient.get(`/api/v2/restaurants/${restaurantId}`);
            return response;
        } catch (error) {
            console.error('식당 상세 조회 실패:', error);
            throw error;
        }
    }

    /**
     * 식당 카테고리 조회
     * @returns {Promise<Object>} 카테고리 목록
     */
    async getCategories() {
        try {
            const response = await apiClient.get('/api/v2/restaurants/categories');
            return response;
        } catch (error) {
            console.error('카테고리 조회 실패:', error);
            throw error;
        }
    }

    /**
     * 근처 식당 조회
     * @param {Object} params - 위치 정보
     * @returns {Promise<Object>} 근처 식당 목록
     */
    async getNearbyRestaurants(params) {
        try {
            const response = await apiClient.get('/api/v2/restaurants/nearby', params);
            return response;
        } catch (error) {
            console.error('근처 식당 조회 실패:', error);
            throw error;
        }
    }

    /**
     * 식당 방문 기록 추가
     * @param {number} restaurantId - 식당 ID
     * @param {Object} visitData - 방문 데이터
     * @returns {Promise<Object>} 방문 기록 결과
     */
    async addRestaurantVisit(restaurantId, visitData) {
        try {
            const response = await apiClient.post(`/api/v2/restaurants/${restaurantId}/visits`, visitData);
            return response;
        } catch (error) {
            console.error('식당 방문 기록 추가 실패:', error);
            throw error;
        }
    }

    /**
     * 식당 리뷰 추가
     * @param {number} restaurantId - 식당 ID
     * @param {Object} reviewData - 리뷰 데이터
     * @returns {Promise<Object>} 리뷰 추가 결과
     */
    async addRestaurantReview(restaurantId, reviewData) {
        try {
            const response = await apiClient.post(`/api/v2/restaurants/${restaurantId}/reviews`, reviewData);
            return response;
        } catch (error) {
            console.error('식당 리뷰 추가 실패:', error);
            throw error;
        }
    }

    /**
     * 식당 리뷰 조회
     * @param {number} restaurantId - 식당 ID
     * @returns {Promise<Object>} 리뷰 목록
     */
    async getRestaurantReviews(restaurantId) {
        try {
            const response = await apiClient.get(`/api/v2/restaurants/${restaurantId}/reviews`);
            return response;
        } catch (error) {
            console.error('식당 리뷰 조회 실패:', error);
            throw error;
        }
    }

    /**
     * 식당 추천 토글
     * @param {number} restaurantId - 식당 ID
     * @returns {Promise<Object>} 추천 토글 결과
     */
    async toggleRestaurantRecommend(restaurantId) {
        try {
            const response = await apiClient.post(`/api/v2/restaurants/${restaurantId}/recommend`);
            return response;
        } catch (error) {
            console.error('식당 추천 토글 실패:', error);
            throw error;
        }
    }

    /**
     * 식당 저장 토글
     * @param {number} restaurantId - 식당 ID
     * @returns {Promise<Object>} 저장 토글 결과
     */
    async toggleRestaurantSave(restaurantId) {
        try {
            const response = await apiClient.post(`/api/v2/restaurants/${restaurantId}/save`);
            return response;
        } catch (error) {
            console.error('식당 저장 토글 실패:', error);
            throw error;
        }
    }

    /**
     * 식당 통계 조회
     * @returns {Promise<Object>} 식당 통계
     */
    async getRestaurantStats() {
        try {
            const response = await apiClient.get('/api/v2/restaurants/stats');
            return response;
        } catch (error) {
            console.error('식당 통계 조회 실패:', error);
            throw error;
        }
    }
}

// 싱글톤 인스턴스 생성
const restaurantService = new RestaurantService();

export default restaurantService;



