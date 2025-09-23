import { SERVER_URL } from '../config/config';
import { apiClient } from '../utils/apiClient';

/**
 * 일정 관련 API 클라이언트
 * 백엔드의 "똑똑한 공장"과 통신
 */

class ScheduleAPI {
    constructor() {
        this.baseURL = `${SERVER_URL}/api/schedules`;
    }

    /**
     * 특정 기간의 모든 일정을 가져오기
     * @param {string} employeeId - 사용자 ID
     * @param {string} startDate - 시작 날짜 (YYYY-MM-DD)
     * @param {string} endDate - 종료 날짜 (YYYY-MM-DD)
     * @returns {Promise<Object>} 일정 데이터
     */
    async getSchedules(employeeId, startDate, endDate) {
        try {
            // 개발 환경에서는 개발용 API 사용
            const devBaseURL = this.baseURL.replace('/api/schedules', '/dev/schedules');
            const response = await fetch(
                `${devBaseURL}?employee_id=${employeeId}&start_date=${startDate}&end_date=${endDate}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    redirect: 'follow' // 리다이렉트 자동 처리
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || '일정 조회에 실패했습니다');
            }

            return data.data;
        } catch (error) {
            console.error('일정 조회 API 오류:', error);
            throw error;
        }
    }

    /**
     * 새로운 일정 생성 (반복 일정 포함)
     * @param {Object} scheduleData - 일정 데이터
     * @returns {Promise<Object>} 생성된 일정
     */
    async createSchedule(scheduleData) {
        try {
            // 개발용 API 사용
            const devBaseURL = this.baseURL.replace('/api/schedules', '/dev/schedules');
            const response = await apiClient.post(devBaseURL, scheduleData);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || '일정 생성에 실패했습니다');
            }

            return data.data;
        } catch (error) {
            console.error('일정 생성 API 오류:', error);
            throw error;
        }
    }

    /**
     * 마스터 일정 수정 (모든 반복 일정 수정)
     * @param {number} scheduleId - 일정 ID
     * @param {Object} updateData - 수정할 데이터
     * @returns {Promise<boolean>} 성공 여부
     */
    async updateSchedule(scheduleId, updateData) {
        try {
            // 개발 환경에서는 개발용 API 사용
            const devBaseURL = this.baseURL.replace('/api/schedules', '/dev/schedules');
            const response = await fetch(`${devBaseURL}/${scheduleId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData),
                redirect: 'follow' // 리다이렉트 자동 처리
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || '일정 수정에 실패했습니다');
            }

            return true;
        } catch (error) {
            console.error('일정 수정 API 오류:', error);
            throw error;
        }
    }

    /**
     * 마스터 일정 삭제 (모든 반복 일정 삭제)
     * @param {number} scheduleId - 일정 ID
     * @returns {Promise<boolean>} 성공 여부
     */
    async deleteSchedule(scheduleId) {
        try {
            // 개발 환경에서는 개발용 API 사용
            const devBaseURL = this.baseURL.replace('/api/schedules', '/dev/schedules');
            const response = await fetch(`${devBaseURL}/${scheduleId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                redirect: 'follow' // 리다이렉트 자동 처리
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || '일정 삭제에 실패했습니다');
            }

            return true;
        } catch (error) {
            console.error('일정 삭제 API 오류:', error);
            throw error;
        }
    }

    /**
     * 일정 예외 생성 (이 날짜만 수정/삭제)
     * @param {number} scheduleId - 마스터 일정 ID
     * @param {Object} exceptionData - 예외 데이터
     * @returns {Promise<Object>} 생성된 예외
     */
    async createException(scheduleId, exceptionData) {
        try {
            const response = await fetch(`${this.baseURL}/${scheduleId}/exceptions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(exceptionData),
                redirect: 'follow' // 리다이렉트 자동 처리
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || '일정 예외 생성에 실패했습니다');
            }

            return data.data;
        } catch (error) {
            console.error('일정 예외 생성 API 오류:', error);
            throw error;
        }
    }

    /**
     * 일정 예외 삭제
     * @param {number} scheduleId - 마스터 일정 ID
     * @param {number} exceptionId - 예외 ID
     * @returns {Promise<boolean>} 성공 여부
     */
    async deleteException(scheduleId, exceptionId) {
        try {
            const response = await fetch(`${this.baseURL}/${scheduleId}/exceptions/${exceptionId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                redirect: 'follow' // 리다이렉트 자동 처리
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || '일정 예외 삭제에 실패했습니다');
            }

            return true;
        } catch (error) {
            console.error('일정 예외 삭제 API 오류:', error);
            throw error;
        }
    }
}

// 싱글톤 인스턴스 생성
const scheduleAPI = new ScheduleAPI();

export default scheduleAPI;
