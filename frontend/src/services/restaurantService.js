/**
 * 식당 서비스
 * 식당 관련 API 호출을 담당합니다.
 * 통합 API 클라이언트를 사용하여 안정적인 네트워크 통신을 제공합니다.
 */

import appService from '../services/AppService'class RestaurantService {
    /**
     * 식당 목록 조회
     * @param {Object} params - 쿼리 파라미터
     * @returns {Promise<Object>} 식당 목록
     */
    async getRestaurants(params = {}) {
        try {
            console.log('🔍 [RestaurantService] 식당 목록 조회 시작:', params);
            const response = await appService.'/api/v2/restaurants/', params);
            console.log('✅ [RestaurantService] 식당 목록 조회 성공:', response?.restaurants?.length || 0, '개');
            return response;
        } catch (error) {
            console.error('❌ [RestaurantService] 식당 목록 조회 실패:', error);
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
            const response = await appService.`/api/v2/restaurants/${restaurantId}`);
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
            const response = await appService.'/api/v2/restaurants/categories');
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
            const response = await appService.'/api/v2/restaurants/nearby', params);
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
            const response = await appService.'/api/v2/restaurants/stats');
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



