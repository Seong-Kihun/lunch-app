/**
 * 파티 서비스
 * 파티 관련 API 호출을 담당합니다.
 */

import apiClient from '../api/apiClient';

class PartyService {
    /**
     * 파티 목록 조회
     * @param {Object} params - 쿼리 파라미터
     * @returns {Promise<Object>} 파티 목록
     */
    async getParties(params = {}) {
        try {
            const response = await apiClient.get('/api/parties/', params);
            return response;
        } catch (error) {
            console.error('파티 목록 조회 실패:', error);
            throw error;
        }
    }

    /**
     * 파티 상세 정보 조회
     * @param {number} partyId - 파티 ID
     * @returns {Promise<Object>} 파티 상세 정보
     */
    async getParty(partyId) {
        try {
            const response = await apiClient.get(`/api/parties/${partyId}`);
            return response;
        } catch (error) {
            console.error('파티 상세 조회 실패:', error);
            throw error;
        }
    }

    /**
     * 파티 생성
     * @param {Object} partyData - 파티 데이터
     * @returns {Promise<Object>} 생성된 파티 정보
     */
    async createParty(partyData) {
        try {
            const response = await apiClient.post('/api/parties/', partyData);
            return response;
        } catch (error) {
            console.error('파티 생성 실패:', error);
            throw error;
        }
    }

    /**
     * 파티 참여
     * @param {number} partyId - 파티 ID
     * @returns {Promise<Object>} 참여 결과
     */
    async joinParty(partyId) {
        try {
            const response = await apiClient.post(`/api/parties/parties/${partyId}/join`);
            return response;
        } catch (error) {
            console.error('파티 참여 실패:', error);
            throw error;
        }
    }

    /**
     * 파티 나가기
     * @param {number} partyId - 파티 ID
     * @returns {Promise<Object>} 나가기 결과
     */
    async leaveParty(partyId) {
        try {
            const response = await apiClient.post(`/api/parties/parties/${partyId}/leave`);
            return response;
        } catch (error) {
            console.error('파티 나가기 실패:', error);
            throw error;
        }
    }

    /**
     * 내 파티 목록 조회
     * @param {string} employeeId - 직원 ID
     * @returns {Promise<Object>} 내 파티 목록
     */
    async getMyParties(employeeId) {
        try {
            const response = await apiClient.get('/api/parties/my_parties', { employee_id: employeeId });
            return response;
        } catch (error) {
            console.error('내 파티 목록 조회 실패:', error);
            throw error;
        }
    }

    /**
     * 파티 수정
     * @param {number} partyId - 파티 ID
     * @param {Object} updateData - 수정할 데이터
     * @returns {Promise<Object>} 수정 결과
     */
    async updateParty(partyId, updateData) {
        try {
            const response = await apiClient.put(`/api/parties/parties/${partyId}`, updateData);
            return response;
        } catch (error) {
            console.error('파티 수정 실패:', error);
            throw error;
        }
    }

    /**
     * 파티 삭제
     * @param {number} partyId - 파티 ID
     * @returns {Promise<Object>} 삭제 결과
     */
    async deleteParty(partyId) {
        try {
            const response = await apiClient.delete(`/api/parties/parties/${partyId}`);
            return response;
        } catch (error) {
            console.error('파티 삭제 실패:', error);
            throw error;
        }
    }
}

// 싱글톤 인스턴스 생성
const partyService = new PartyService();

export default partyService;



