import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { unifiedApiClient } from '../services/UnifiedApiClient';
import { getMyEmployeeId } from '../components/common/Utils';
import { apiClient } from '../utils/apiClient';

/**
 * 파티 조회를 위한 React Query 훅
 * 백엔드에서 파티 데이터를 가져와서 캐싱하고 관리
 */

// 파티 목록 조회
export const useParties = (isFromMatch = false) => {
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['parties', isFromMatch],
        queryFn: async () => {
            try {
                const employeeId = getMyEmployeeId();
                const url = `${RENDER_SERVER_URL}/dev/parties?is_from_match=${isFromMatch}&employee_id=${employeeId}`;
                
                console.log('🔍 [useParties] API 호출:', url);
                
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const result = await response.json();
                
                // 백엔드 응답 구조에 맞춰 수정
                if (result.error) {
                    throw new Error(result.error);
                }
                
                console.log('✅ [useParties] API 응답 성공:', result);
                return result.parties || [];
            } catch (error) {
                console.error('❌ [useParties] API 호출 실패:', error);
                throw error;
            }
        },
        staleTime: 2 * 60 * 1000, // 2분
        cacheTime: 5 * 60 * 1000, // 5분
        retry: 2,
        retryDelay: 1000,
    });

    return {
        parties: data || [],
        isLoading,
        error,
        refetch
    };
};

// 파티 생성 Mutation
export const useCreateParty = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: async (partyData) => {
            try {
                console.log('🔍 [useCreateParty] 파티 생성 API 호출:', partyData);
                
                const response = await apiClient.post(`${RENDER_SERVER_URL}/api/parties`, partyData);

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || '파티 생성에 실패했습니다.');
                }

                const result = await response.json();
                console.log('✅ [useCreateParty] 파티 생성 성공:', result);
                return result;
            } catch (error) {
                console.error('❌ [useCreateParty] 파티 생성 실패:', error);
                throw error;
            }
        },
        onSuccess: (newParty) => {
            // 파티 목록 캐시 무효화하여 새로고침
            queryClient.invalidateQueries(['parties']);
            console.log('✅ [useCreateParty] 파티 목록 캐시 무효화 완료');
        },
        onError: (error) => {
            console.error('❌ [useCreateParty] 파티 생성 오류:', error);
        }
    });
};

// 파티 참여 Mutation
export const useJoinParty = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: async (partyId) => {
            try {
                console.log('🔍 [useJoinParty] 파티 참여 API 호출:', partyId);
                
                const response = await unifiedApiClient.get(/parties/${partyId}/join, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || '파티 참여에 실패했습니다.');
                }

                const result = await response.json();
                console.log('✅ [useJoinParty] 파티 참여 성공:', result);
                return result;
            } catch (error) {
                console.error('❌ [useJoinParty] 파티 참여 실패:', error);
                throw error;
            }
        },
        onSuccess: () => {
            // 파티 목록 캐시 무효화하여 새로고침
            queryClient.invalidateQueries(['parties']);
            console.log('✅ [useJoinParty] 파티 목록 캐시 무효화 완료');
        }
    });
};

// 파티 나가기 Mutation
export const useLeaveParty = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: async (partyId) => {
            try {
                console.log('🔍 [useLeaveParty] 파티 나가기 API 호출:', partyId);
                
                const response = await unifiedApiClient.get(/parties/${partyId}/leave, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || '파티 나가기에 실패했습니다.');
                }

                const result = await response.json();
                console.log('✅ [useLeaveParty] 파티 나가기 성공:', result);
                return result;
            } catch (error) {
                console.error('❌ [useLeaveParty] 파티 나가기 실패:', error);
                throw error;
            }
        },
        onSuccess: () => {
            // 파티 목록 캐시 무효화하여 새로고침
            queryClient.invalidateQueries(['parties']);
            console.log('✅ [useLeaveParty] 파티 목록 캐시 무효화 완료');
        }
    });
};

// 파티 삭제 Mutation
export const useDeleteParty = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: async (partyId) => {
            try {
                console.log('🔍 [useDeleteParty] 파티 삭제 API 호출:', partyId);
                
                const response = await unifiedApiClient.get(/parties/${partyId}, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || '파티 삭제에 실패했습니다.');
                }

                const result = await response.json();
                console.log('✅ [useDeleteParty] 파티 삭제 성공:', result);
                return result;
            } catch (error) {
                console.error('❌ [useDeleteParty] 파티 삭제 실패:', error);
                throw error;
            }
        },
        onSuccess: () => {
            // 파티 목록과 일정 캐시 무효화하여 새로고침
            queryClient.invalidateQueries(['parties']);
            queryClient.invalidateQueries(['schedules']);
            console.log('✅ [useDeleteParty] 캐시 무효화 완료');
        }
    });
};

// 파티 수정 Mutation
export const useUpdateParty = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: async ({ partyId, updateData }) => {
            try {
                console.log('🔍 [useUpdateParty] 파티 수정 API 호출:', partyId, updateData);
                
                const response = await unifiedApiClient.get(/parties/${partyId}?employee_id=1, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(updateData)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || '파티 수정에 실패했습니다.');
                }

                const result = await response.json();
                console.log('✅ [useUpdateParty] 파티 수정 성공:', result);
                return result;
            } catch (error) {
                console.error('❌ [useUpdateParty] 파티 수정 실패:', error);
                throw error;
            }
        },
        onSuccess: () => {
            // 파티 목록과 일정 캐시 무효화하여 새로고침
            queryClient.invalidateQueries(['parties']);
            queryClient.invalidateQueries(['schedules']);
            console.log('✅ [useUpdateParty] 캐시 무효화 완료');
        }
    });
};

