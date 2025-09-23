import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import scheduleAPI from '../services/apiClient';

/**
 * 일정 데이터를 관리하는 React Query 훅
 * 백엔드의 "똑똑한 공장"과 통신하여 데이터를 자동으로 관리
 */

/**
 * 특정 기간의 일정을 조회하는 훅
 * @param {string} employeeId - 사용자 ID
 * @param {string} startDate - 시작 날짜 (YYYY-MM-DD)
 * @param {string} endDate - 종료 날짜 (YYYY-MM-DD)
 * @param {Object} options - 추가 옵션
 * @returns {Object} React Query 결과
 */
export const useSchedules = (employeeId, startDate, endDate, options = {}) => {
    console.log('🔍 [useSchedules] 훅 호출:', {
        employeeId,
        startDate,
        endDate,
        enabled: !!(employeeId && startDate && endDate)
    });
    
    return useQuery({
        queryKey: ['schedules', employeeId, startDate, endDate],
        queryFn: async () => {
            console.log('🔍 [useSchedules] API 호출 시작:', { employeeId, startDate, endDate });
            const result = await scheduleAPI.getSchedules(employeeId, startDate, endDate);
            console.log('🔍 [useSchedules] API 호출 결과:', result);
            return result;
        },
        enabled: !!(employeeId && startDate && endDate),
        staleTime: 5 * 60 * 1000, // 5분
        cacheTime: 10 * 60 * 1000, // 10분
        retry: 1, // 재시도 횟수 제한
        retryDelay: 1000, // 재시도 간격
        refetchOnWindowFocus: false, // 윈도우 포커스 시 자동 새로고침 비활성화
        ...options,
    });
};

/**
 * 일정 생성 뮤테이션 훅
 * @returns {Object} React Query 뮤테이션 결과
 */
export const useCreateSchedule = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: (scheduleData) => scheduleAPI.createSchedule(scheduleData),
        onSuccess: (data, variables) => {
            console.log('✅ 일정 생성 성공:', data);
            
            // 관련된 모든 일정 쿼리를 무효화하여 자동 갱신
            queryClient.invalidateQueries(['schedules']);
            
            // 성공 알림 (필요시)
            // Alert.alert('성공', '일정이 생성되었습니다');
        },
        onError: (error, variables) => {
            console.error('❌ 일정 생성 실패:', error);
            
            // 에러 알림 (필요시)
            // Alert.alert('오류', '일정 생성에 실패했습니다');
        },
    });
};

/**
 * 일정 수정 뮤테이션 훅 (모든 반복 일정 수정)
 * @returns {Object} React Query 뮤테이션 결과
 */
export const useUpdateSchedule = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: ({ scheduleId, updateData }) => 
            scheduleAPI.updateSchedule(scheduleId, updateData),
        onSuccess: (data, variables) => {
            console.log('✅ 일정 수정 성공:', variables.scheduleId);
            
            // 관련된 모든 일정 쿼리를 무효화하여 자동 갱신
            queryClient.invalidateQueries(['schedules']);
            
            // 성공 알림 (필요시)
            // Alert.alert('성공', '일정이 수정되었습니다');
        },
        onError: (error, variables) => {
            console.error('❌ 일정 수정 실패:', error);
            
            // 에러 알림 (필요시)
            // Alert.alert('오류', '일정 수정에 실패했습니다');
        },
    });
};

/**
 * 일정 삭제 뮤테이션 훅 (모든 반복 일정 삭제)
 * @returns {Object} React Query 뮤테이션 결과
 */
export const useDeleteSchedule = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: (scheduleId) => scheduleAPI.deleteSchedule(scheduleId),
        onSuccess: (data, scheduleId) => {
            console.log('✅ 일정 삭제 성공:', scheduleId);
            
            // 관련된 모든 일정 쿼리를 무효화하여 자동 갱신
            queryClient.invalidateQueries(['schedules']);
            
            // 성공 알림 (필요시)
            // Alert.alert('성공', '일정이 삭제되었습니다');
        },
        onError: (error, scheduleId) => {
            console.error('❌ 일정 삭제 실패:', error);
            
            // 에러 알림 (필요시)
            // Alert.alert('오류', '일정 삭제에 실패했습니다');
        },
    });
};

/**
 * 일정 예외 생성 뮤테이션 훅 (이 날짜만 수정/삭제)
 * @returns {Object} React Query 뮤테이션 결과
 */
export const useCreateScheduleException = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: ({ scheduleId, exceptionData }) => 
            scheduleAPI.createException(scheduleId, exceptionData),
        onSuccess: (data, variables) => {
            console.log('✅ 일정 예외 생성 성공:', data);
            
            // 관련된 모든 일정 쿼리를 무효화하여 자동 갱신
            queryClient.invalidateQueries(['schedules']);
            
            // 성공 알림 (필요시)
            // Alert.alert('성공', '일정 예외가 생성되었습니다');
        },
        onError: (error, variables) => {
            console.error('❌ 일정 예외 생성 실패:', error);
            
            // 에러 알림 (필요시)
            // Alert.alert('오류', '일정 예외 생성에 실패했습니다');
        },
    });
};

/**
 * 일정 예외 삭제 뮤테이션 훅
 * @returns {Object} React Query 뮤테이션 결과
 */
export const useDeleteScheduleException = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: ({ scheduleId, exceptionId }) => 
            scheduleAPI.deleteException(scheduleId, exceptionId),
        onSuccess: (data, variables) => {
            console.log('✅ 일정 예외 삭제 성공:', variables.exceptionId);
            
            // 관련된 모든 일정 쿼리를 무효화하여 자동 갱신
            queryClient.invalidateQueries(['schedules']);
            
            // 성공 알림 (필요시)
            // Alert.alert('성공', '일정 예외가 삭제되었습니다');
        },
        onError: (error, variables) => {
            console.error('❌ 일정 예외 삭제 실패:', error);
            
            // 에러 알림 (필요시)
            // Alert.alert('오류', '일정 예외 삭제에 실패했습니다');
        },
    });
};

/**
 * 일정 데이터를 달력 형식으로 변환하는 유틸리티 함수
 * @param {Array} schedulesData - API에서 받은 일정 데이터
 * @returns {Object} 달력에 필요한 형식으로 변환된 데이터
 */
export const transformSchedulesForCalendar = (schedulesData) => {
    if (!schedulesData || !Array.isArray(schedulesData)) {
        return {
            appointments: [],
            markedDates: {},
            allEvents: {}
        };
    }
    
    const appointments = [];
    const markedDates = {};
    const allEvents = {};
    
    schedulesData.forEach(dateGroup => {
        const { date, events } = dateGroup;
        
        if (events && events.length > 0) {
            // appointments 배열에 추가
            appointments.push({
                date: date,
                events: events
            });
            
            // 일정 종류에 따른 색상 결정
            const getScheduleColor = (events) => {
                // 랜덤런치가 있는지 확인
                const hasRandomLunch = events.some(event => 
                    event.type === 'random_lunch' || 
                    event.is_from_match || 
                    event.title?.includes('랜덤') ||
                    event.title?.includes('🍽️')
                );
                
                // 파티가 있는지 확인
                const hasParty = events.some(event => 
                    event.type === 'party' || 
                    event.party_id
                );
                
                // 기타일정이 있는지 확인
                const hasPersonalSchedule = events.some(event => 
                    event.type === 'personal_schedule' || 
                    event.master_schedule_id
                );
                
                // 우선순위: 랜덤런치 > 파티 > 기타일정
                if (hasRandomLunch) return '#FFD700'; // 노랑
                if (hasParty) return '#3B82F6'; // 파랑
                if (hasPersonalSchedule) return '#666666'; // 회색
                
                return '#666666'; // 기본값
            };
            
            const scheduleColor = getScheduleColor(events);
            
            // markedDates에 마킹 추가
            markedDates[date] = {
                selected: true,
                selectedColor: scheduleColor,
                selectedTextColor: '#FFFFFF' // 흰 글자
            };
            
            // allEvents에 이벤트 추가
            allEvents[date] = events;
        }
    });
    
    return {
        appointments,
        markedDates,
        allEvents
    };
};

/**
 * 월별 일정 조회를 위한 헬퍼 훅
 * @param {string} employeeId - 사용자 ID
 * @param {Date} monthDate - 조회할 월의 날짜
 * @returns {Object} React Query 결과
 */
export const useMonthSchedules = (employeeId, monthDate) => {
    // 월의 시작과 끝 날짜 계산
    const startDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const endDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    return useSchedules(employeeId, startDateStr, endDateStr);
};
