/**
 * 파티 서비스
 * 파티 관련 API 호출을 담당합니다.
 * 통합 API 클라이언트를 사용하여 안정적인 네트워크 통신을 제공합니다.
 */

import appService from '../services/AppService'class PartyService {
    /**
     * 파티 목록 조회
     * @param {Object} params - 쿼리 파라미터
     * @returns {Promise<Object>} 파티 목록
     */
    async getParties(params = {}) {
        try {
            console.log('🔍 [PartyService] 파티 목록 조회 시작:', params);
            const response = await appService.'/api/parties/', params);
            console.log('✅ [PartyService] 파티 목록 조회 성공:', response?.parties?.length || 0, '개');
            return response;
        } catch (error) {
            console.error('❌ [PartyService] 파티 목록 조회 실패:', error);
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
            console.log('🔍 [PartyService] 파티 상세 조회 시작:', partyId);
            const response = await appService.get(`/api/parties/${partyId}`);
            console.log('✅ [PartyService] 파티 상세 조회 성공');
            return response;
        } catch (error) {
            console.error('❌ [PartyService] 파티 상세 조회 실패:', error);
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
            console.log('🔍 [PartyService] 파티 생성 시작:', partyData);
            const response = await appService.'/api/parties/', partyData);
            console.log('✅ [PartyService] 파티 생성 성공:', response?.id);
            return response;
        } catch (error) {
            console.error('❌ [PartyService] 파티 생성 실패:', error);
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
            console.log('🔍 [PartyService] 파티 참여 시작:', partyId);
            const response = await appService.post(`/api/parties/${partyId}/join`);
            console.log('✅ [PartyService] 파티 참여 성공');
            return response;
        } catch (error) {
            console.error('❌ [PartyService] 파티 참여 실패:', error);
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
            console.log('🔍 [PartyService] 파티 나가기 시작:', partyId);
            const response = await appService.post(`/api/parties/${partyId}/leave`);
            console.log('✅ [PartyService] 파티 나가기 성공');
            return response;
        } catch (error) {
            console.error('❌ [PartyService] 파티 나가기 실패:', error);
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
            console.log('🔍 [PartyService] 내 파티 목록 조회 시작:', employeeId);
            const response = await appService.'/api/parties/my_parties', { employee_id: employeeId });
            console.log('✅ [PartyService] 내 파티 목록 조회 성공:', response?.parties?.length || 0, '개');
            return response;
        } catch (error) {
            console.error('❌ [PartyService] 내 파티 목록 조회 실패:', error);
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
            console.log('🔍 [PartyService] 파티 수정 시작:', partyId, updateData);
            const response = await appService.put(`/api/parties/${partyId}`, updateData);
            console.log('✅ [PartyService] 파티 수정 성공');
            return response;
        } catch (error) {
            console.error('❌ [PartyService] 파티 수정 실패:', error);
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
            console.log('🔍 [PartyService] 파티 삭제 시작:', partyId);
            const response = await appService.get(`/api/parties/${partyId}`);
            console.log('✅ [PartyService] 파티 삭제 성공');
            return response;
        } catch (error) {
            console.error('❌ [PartyService] 파티 삭제 실패:', error);
            throw error;
        }
    }
}

// 싱글톤 인스턴스 생성
const partyService = new PartyService();

export default partyService;



