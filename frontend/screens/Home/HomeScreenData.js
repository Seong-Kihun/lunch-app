import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getKoreanToday } from '../../components/common/Utils';
import scheduleAPI from '../../services/apiClient';
import { useMemo, useCallback } from 'react';
import { COLORS } from '../../utils/colors';

/**
 * 🚨 중요: React Query 기반 홈 화면 데이터 관리
 * 백엔드에서 일정 데이터를 가져와서 프론트엔드 상태로 변환
 */

export const useHomeData = () => {
    const today = getKoreanToday();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;

    const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${new Date(currentYear, currentMonth, 0).getDate()}`;

    console.log('🔧 [HomeScreenData] useHomeData 호출됨');
    console.log('👤 [HomeScreenData] 사용자 ID:', global.myEmployeeId || '1');
    console.log('📅 [HomeScreenData] 조회 기간:', startDate, '~', endDate);

    const { data: schedules, isLoading, error, refetch } = useQuery({
        queryKey: ['schedules', global.myEmployeeId || '1', startDate, endDate],
        queryFn: async () => {
            console.log('🔧 [HomeScreenData] API 호출 시작');
            try {
                const result = await scheduleAPI.getSchedules(
                    global.myEmployeeId || '1',
                    startDate,
                    endDate
                );
                console.log('✅ [HomeScreenData] API 호출 성공:', result);
                return result;
            } catch (error) {
                console.error('❌ [HomeScreenData] API 호출 실패:', error);
                throw error;
            }
        },
        staleTime: 5 * 60 * 1000, // 5분
        gcTime: 10 * 60 * 1000, // 10분
        retry: 3, // 재시도 3회
        retryDelay: 1000, // 1초 간격
    });

    console.log('🔧 [HomeScreenData] React Query 상태:', { isLoading, error, hasData: !!schedules });

    const processedData = useMemo(() => {
        console.log('🔧 [HomeScreenData] 데이터 처리 시작');
        console.log('📊 [HomeScreenData] 원본 데이터:', schedules);
        
        if (!schedules) {
            console.log('🔧 [HomeScreenData] 데이터 없음 - 빈 배열 반환');
            return { appointments: [], markedDates: {}, allEvents: {} };
        }

        // 백엔드 데이터를 프론트엔드 상태로 변환
        const appointments = schedules.map(schedule => ({
            id: schedule.id,
            title: schedule.title || schedule.name,
            date: schedule.date || schedule.start_date,
            time: schedule.time || schedule.start_time || '12:00',
            type: schedule.type || 'other',
            isRecurring: schedule.is_recurring || schedule.isRecurring || false,
            recurrenceType: schedule.recurrence_type || schedule.recurrenceType,
            endDate: schedule.end_date || schedule.endDate,
            createdBy: schedule.created_by || schedule.createdBy || schedule.employee_id,
            description: schedule.description || '',
            location: schedule.location || '',
            participants: schedule.participants || [],
            status: schedule.status || 'active'
        }));

        console.log('🔧 [HomeScreenData] 변환된 appointments:', appointments);

        // 날짜별 이벤트 그룹화
        const allEvents = {};
        appointments.forEach(appointment => {
            const date = appointment.date;
            if (!allEvents[date]) {
                allEvents[date] = [];
            }
            allEvents[date].push(appointment);
        });

        // 달력 마킹을 위한 날짜별 데이터
        const markedDates = {};
        appointments.forEach(appointment => {
            const date = appointment.date;
            let markerColor = '#64748B'; // 기본값: 회색
            
            if (appointment.type === 'party' || appointment.isParty) {
                markerColor = '#3B82F6'; // 일반파티: 파란색
            } else if (appointment.type === 'random_lunch' || appointment.is_from_match) {
                markerColor = '#FFD700'; // 랜덤런치: 노란색
            } else {
                markerColor = '#64748B'; // 기타일정: 회색
            }
            
            markedDates[date] = {
                selected: true,
                selectedColor: markerColor
            };
        });

        const result = { appointments, markedDates, allEvents };
        console.log('✅ [HomeScreenData] 데이터 처리 완료:', result);
        console.log('🔍 [HomeScreenData] markedDates 상세:', markedDates);
        console.log('🔍 [HomeScreenData] appointments 상세:', appointments);
        return result;
    }, [schedules]);

    return {
        data: processedData,
        isLoading,
        error,
        refetch
    };
};

/**
 * 🚨 중요: 데이터 동기화 훅
 * 다른 화면에서 일정 변경 시 홈 화면 데이터 자동 새로고침
 */
export const useHomeDataSync = () => {
    const { refetch } = useHomeData();
    
    const invalidateSchedules = useCallback(() => {
        refetch();
    }, [refetch]);

    return { invalidateSchedules };
};

/**
 * 🚨 중요: 기존의 복잡한 함수들을 단순화
 * 이제 백엔드에서 모든 계산을 처리하므로 프론트엔드에서는 단순한 변환만 수행
 */

/**
 * 일정 데이터를 appointments 형식으로 변환
 * 백엔드에서 받은 데이터를 프론트엔드 UI에 맞게 변환
 */
export const transformSchedulesToAppointments = (schedules) => {
    if (!Array.isArray(schedules)) return [];
    
    const appointments = [];
    const dateMap = new Map();
    
    schedules.forEach(schedule => {
        const dateString = schedule.date;
        
        if (!dateMap.has(dateString)) {
            dateMap.set(dateString, []);
        }
        
        dateMap.get(dateString).push(schedule);
    });
    
    // Map을 배열로 변환
    dateMap.forEach((events, date) => {
        appointments.push({
            date,
            events
        });
    });
    
    // 날짜순 정렬
    return appointments.sort((a, b) => new Date(a.date) - new Date(b.date));
};

/**
 * 일정 데이터를 markedDates 형식으로 변환
 * 일정 타입별로 적절한 색상 적용
 */
export const transformSchedulesToMarkedDates = (schedules) => {
    if (!Array.isArray(schedules)) return {};
    
    const markedDates = {};
    
    schedules.forEach(schedule => {
        const dateString = schedule.date;
        let markerColor = '#64748B'; // 기본값: 회색
        
        if (schedule.type === 'party') {
            markerColor = '#3B82F6'; // 일반파티: 파란색
        } else if (schedule.type === 'random_lunch') {
            markerColor = '#FFD700'; // 랜덤런치: 노란색
        } else {
            markerColor = '#64748B'; // 기타일정: 회색
        }
        
        markedDates[dateString] = {
            selected: true,
            selectedColor: markerColor
        };
    });
    
    return markedDates;
};

/**
 * 일정 데이터를 allEvents 형식으로 변환
 * 날짜별로 일정을 그룹화
 */
export const transformSchedulesToAllEvents = (schedules) => {
    if (!Array.isArray(schedules)) return {};
    
    const allEvents = {};
    
    schedules.forEach(schedule => {
        const dateString = schedule.date;
        
        if (allEvents[dateString]) {
            allEvents[dateString].push(schedule);
        } else {
            allEvents[dateString] = [schedule];
        }
    });
    
    return allEvents;
};
