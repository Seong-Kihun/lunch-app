import { useQuery } from '@tanstack/react-query';

/**
 * 백엔드에서 "오늘" 날짜를 가져오는 훅 (안전한 API 호출)
 * 앱 전체에서 일관된 "오늘" 날짜를 사용하기 위해 백엔드 API 활용
 */
export const useToday = () => {
    const { data, isLoading, error } = useQuery({
        queryKey: ['today'],
        queryFn: async () => {
            try {
                // 안전한 API 호출 (근본적 해결책)
                const { unifiedApiClient } = await import('../services/UnifiedApiClient');
                
                // API 클라이언트 초기화 대기
                if (!unifiedApiClient || !unifiedApiClient.isInitialized) {
                    console.log('🔄 [useToday] API 클라이언트 초기화 대기 중...');
                    await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기
                }
                
                if (!unifiedApiClient) {
                    throw new Error('API 클라이언트가 초기화되지 않았습니다');
                }
                
                const result = await unifiedApiClient.get('/api/today');
                
                if (!result.success) {
                    throw new Error(result.error || '오늘 날짜 조회에 실패했습니다');
                }
                
                return result.data;
            } catch (error) {
                console.error('❌ [useToday] API 호출 실패:', error);
                // fallback: 로컬 시간 사용 (더 정확한 한국 시간 계산)
                const now = new Date();
                
                // 한국 시간대 오프셋 계산
                const koreanOffset = 9 * 60; // 한국은 UTC+9 (분 단위)
                const localOffset = now.getTimezoneOffset(); // 로컬 시간대 오프셋 (분 단위)
                const totalOffset = koreanOffset + localOffset; // 총 오프셋
                
                // 한국 시간으로 변환
                const koreanTime = new Date(now.getTime() + (totalOffset * 60 * 1000));
                const koreanYear = koreanTime.getFullYear();
                const koreanMonth = koreanTime.getMonth();
                const koreanDate = koreanTime.getDate();
                
                const todayDateString = `${koreanYear}-${String(koreanMonth + 1).padStart(2, '0')}-${String(koreanDate).padStart(2, '0')}`;
                
                console.log('🔍 [useToday] fallback 사용:', {
                    now: now.toISOString(),
                    koreanTime: koreanTime.toISOString(),
                    todayDateString,
                    dayOfWeek: koreanTime.getDay()
                });
                
                return {
                    today_date: todayDateString,
                    today_datetime: new Date(koreanYear, koreanMonth, koreanDate).toISOString(),
                    current_utc: now.toISOString(),
                    current_korean: koreanTime.toISOString(),
                    timezone_info: {
                        utc_offset: "+00:00",
                        korean_offset: "+09:00"
                    }
                };
            }
        },
        staleTime: 5 * 60 * 1000, // 5분
        gcTime: 10 * 60 * 1000, // 10분
        retry: 3,
        retryDelay: 1000,
    });

    return {
        today: data?.today_date ? new Date(data.today_date) : null,
        todayString: data?.today_date || null,
        isLoading,
        error,
        timezoneInfo: data?.timezone_info
    };
};
