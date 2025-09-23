import React, { useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSchedule } from '../../contexts/ScheduleContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useUser } from '../../contexts/UserContext';
import { useDeleteSchedule } from '../../hooks/useScheduleQuery';
import { useDeleteParty, useUpdateParty } from '../../hooks/usePartyQuery';

const ScheduleActions = ({ event, onEdit, onDelete, onClose, onRefresh }) => {
    // 🚨 중요: ScheduleContext에서 삭제 함수 가져오기
    const { updateScheduleUnified } = useSchedule();
    const { colors } = useTheme();
    const { user } = useUser();
    
    // 실제 삭제 API 호출을 위한 훅
    const deleteScheduleMutation = useDeleteSchedule();
    const deletePartyMutation = useDeleteParty();
    const updatePartyMutation = useUpdateParty();
    
    // 중복 호출 방지를 위한 ref
    const isDeleting = useRef(false);

    // 권한 체크 - 본인이 만든 일정인지 확인
    const canModify = () => {
        // UserContext에서 현재 사용자 ID 가져오기
        const currentUserId = user?.employee_id;
        
        // 현재 사용자 ID가 없으면 권한 없음으로 처리
        if (!currentUserId) {
            console.warn('🔍 [ScheduleActions] 현재 사용자 ID를 찾을 수 없음');
            return false;
        }
        
        console.log('🔍 [ScheduleActions] 권한 체크:', {
            currentUserId,
            eventCreatedBy: event.created_by,
            eventCreatedByType: typeof event.created_by,
            eventCreatedByValue: event.created_by,
            canModify: event.created_by === currentUserId
        });
        
        // 일정 생성자가 현재 사용자인지 확인 (created_by 필드 사용)
        return event.created_by === currentUserId || 
               event.createdBy === currentUserId || 
               event.creator_id === currentUserId ||
               event.user_id === currentUserId;
    };

    // 수정 버튼 핸들러
    const handleEdit = () => {
        if (!canModify()) {
            Alert.alert('권한 없음', '본인이 생성한 일정만 수정할 수 있습니다.');
            return;
        }

        // 반복 일정인 경우 수정 옵션 선택
        if (event.isRecurring) {
            Alert.alert(
                '반복 일정 수정',
                '이 일정은 반복 일정입니다. 어떻게 수정하시겠습니까?',
                [
                    { text: '취소', style: 'cancel' },
                    { 
                        text: '이 날짜만 수정', 
                        onPress: () => {
                            if (onEdit) {
                                onEdit(event, 'single');
                            }
                        }
                    },
                    { 
                        text: '모든 반복 일정 수정', 
                        onPress: () => {
                            if (onEdit) {
                                onEdit(event, 'recurring_all');
                            }
                        }
                    }
                ]
            );
        } else {
            // 일반 일정인 경우 바로 수정
            if (onEdit) {
                onEdit(event, 'single');
            }
        }
    };

    // 삭제 버튼 핸들러
    const handleDelete = () => {
        if (!canModify()) {
            Alert.alert('권한 없음', '본인이 생성한 일정만 삭제할 수 있습니다.');
            return;
        }

        // 중복 호출 방지
        if (isDeleting.current) {
            console.log('🔍 [ScheduleActions] 삭제 진행 중, 중복 호출 차단');
            return;
        }

        // 디버깅: 이벤트 데이터 확인
        console.log('🔍 [ScheduleActions] 삭제할 이벤트 데이터:', {
            event,
            eventId: event.id || event._id,
            eventKeys: Object.keys(event),
            eventValues: Object.values(event)
        });

        // ID를 찾는 우선순위: id > _id > local_id > 기타 고유 식별자
        let eventId = event.id || event._id || event.local_id;
        
        // 만약 위의 ID들이 모두 없다면, 다른 고유 식별자를 찾아보기
        if (!eventId) {
            // date와 title을 조합해서 고유 식별자 생성
            if (event.date && event.title) {
                eventId = `temp_${event.date}_${event.title.replace(/\s+/g, '_')}`;
                console.log('🔍 [ScheduleActions] 임시 ID 생성:', eventId);
            } else {
                console.error('❌ [ScheduleActions] ID를 찾을 수 없습니다:', event);
                Alert.alert('오류', '일정 ID를 찾을 수 없습니다.');
                return;
            }
        }

        const deleteAction = async (deleteMode = 'single') => {
            console.log('🔍 [ScheduleActions] 삭제 시작:', eventId, event.title, 'deleteMode:', deleteMode);
            isDeleting.current = true; // 삭제 시작
            
            try {
                // 🚨 중요: 실제 백엔드 API 호출
                console.log('🔍 [ScheduleActions] 백엔드 API 삭제 호출:', eventId);
                
                // 파티인지 개인 일정인지 구분
                if (event.type === 'party' || event.party_id) {
                    // 파티 삭제
                    const partyId = event.party_id || parseInt(eventId.replace(/\D/g, ''));
                    console.log('🔍 [ScheduleActions] 파티 삭제:', partyId);
                    await deletePartyMutation.mutateAsync(partyId);
                } else {
                    // 개인 일정 삭제 - id 사용
                    const scheduleId = event.id;
                    if (scheduleId) {
                        console.log('🔍 [ScheduleActions] 개인 일정 삭제 (id):', scheduleId);
                        await deleteScheduleMutation.mutateAsync(scheduleId);
                    } else {
                        console.error('❌ [ScheduleActions] 일정 ID를 찾을 수 없습니다:', event);
                        Alert.alert('오류', '일정 ID를 찾을 수 없습니다.');
                        return;
                    }
                }
                
                // 🚨 중요: 삭제 완료 후 즉시 모달 닫기
                if (onClose) {
                    onClose();
                }
                
                // 🚨 중요: 삭제 후 데이터 새로고침
                if (onRefresh) {
                    console.log('🔄 [ScheduleActions] 삭제 후 데이터 새로고침');
                    onRefresh();
                }
                
                // 성공 메시지 (모달 닫힌 후 표시)
                setTimeout(() => {
                    Alert.alert('삭제 완료', '일정이 삭제되었습니다.');
                }, 300);
                
            } catch (error) {
                console.error('❌ [ScheduleActions] 삭제 중 오류 발생:', error);
                Alert.alert('오류', `삭제 중 오류가 발생했습니다: ${error.message}`);
            } finally {
                // 삭제 상태 리셋
                setTimeout(() => {
                    isDeleting.current = false;
                    console.log('🔍 [ScheduleActions] 삭제 상태 리셋 완료');
                }, 1000); // 1초 후 리셋
            }
        };

        // 반복 일정인 경우 삭제 옵션 선택
        if (event.isRecurring) {
            Alert.alert(
                '반복 일정 삭제',
                '이 일정은 반복 일정입니다. 어떻게 삭제하시겠습니까?',
                [
                    { text: '취소', style: 'cancel' },
                    { 
                        text: '이 날짜만 삭제', 
                        onPress: () => deleteAction('single')
                    },
                    { 
                        text: '모든 반복 일정 삭제', 
                        style: 'destructive',
                        onPress: () => deleteAction('all')
                    }
                ]
            );
        } else {
            Alert.alert(
                '일정 삭제',
                '정말로 이 일정을 삭제하시겠습니까?',
                [
                    { text: '취소', style: 'cancel' },
                    { 
                        text: '삭제', 
                        style: 'destructive', 
                        onPress: () => deleteAction('single')
                    }
                ]
            );
        }
    };

    // 파티 수정 핸들러
    const handleEditParty = async () => {
        try {
            console.log('🔍 [ScheduleActions] 파티 수정 시작:', event);
            
            // 파티 수정을 위한 데이터 준비
            const updateData = {
                title: event.title,
                restaurant: event.restaurant || event.restaurant_name,
                location: event.location || event.meeting_location,
                date: event.date || event.party_date,
                time: event.time || event.party_time,
                maxMembers: event.maxMembers || event.max_members
            };
            
            const partyId = event.party_id || event.id;
            console.log('🔍 [ScheduleActions] 파티 수정 데이터:', { partyId, updateData });
            
            // 백엔드 API 호출
            await updatePartyMutation.mutateAsync({
                partyId: partyId,
                updateData: updateData
            });
            
            // 성공 메시지
            Alert.alert('성공', '파티가 수정되었습니다.');
            
            // 🚨 중요: 수정 후 데이터 새로고침
            if (onRefresh) {
                console.log('🔄 [ScheduleActions] 파티 수정 후 데이터 새로고침');
                onRefresh();
            }
            
            // 모달 닫기
            if (onClose) {
                onClose();
            }
            
        } catch (error) {
            console.error('❌ [ScheduleActions] 파티 수정 실패:', error);
            Alert.alert('오류', error.message || '파티 수정에 실패했습니다.');
        }
    };

    // 과거 일정인지 확인 (기타 일정은 과거여도 수정 가능하도록 수정)
    const isPastEvent = () => {
        // 기타 일정(personal_schedule)은 과거여도 수정 가능
        if (event.type === 'personal_schedule') {
            return false;
        }
        
        if (!event.date) return false;
        
        try {
            const eventDate = new Date(event.date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            eventDate.setHours(0, 0, 0, 0);
            
            return eventDate < today;
        } catch (error) {
            return false;
        }
    };

    const isModifiable = canModify();
    const isPast = isPastEvent();

    return (
        <View style={styles.actionsContainer}>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            
            <View style={styles.buttonsContainer}>
                <TouchableOpacity
                    style={[
                        styles.actionButton,
                        styles.editButton,
                        { 
                            backgroundColor: isModifiable && !isPast 
                                ? colors.primary 
                                : colors.gray,
                            opacity: (!isModifiable || isPast) ? 0.6 : 1
                        }
                    ]}
                    onPress={() => {
                        // 파티인 경우 파티 수정 핸들러 사용
                        if (event.type === 'party' || event.party_id) {
                            handleEditParty();
                        } else {
                            // 개인 일정인 경우 기존 핸들러 사용
                            handleEdit();
                        }
                    }}
                    disabled={!isModifiable || isPast}
                    activeOpacity={0.8}
                >
                    <View style={styles.buttonContent}>
                        <Ionicons 
                            name="create-outline" 
                            size={20} 
                            color="#FFFFFF" 
                        />
                        <Text style={styles.actionButtonText}>
                            수정하기
                        </Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.actionButton,
                        styles.deleteButton,
                        { 
                            backgroundColor: isModifiable 
                                ? colors.error 
                                : colors.gray,
                            opacity: !isModifiable ? 0.6 : 1
                        }
                    ]}
                    onPress={handleDelete}
                    disabled={!isModifiable}
                    activeOpacity={0.8}
                >
                    <View style={styles.buttonContent}>
                        <Ionicons 
                            name="trash-outline" 
                            size={20} 
                            color="#FFFFFF" 
                        />
                        <Text style={[
                            styles.actionButtonText
                        ]}>
                            삭제하기
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>

            {/* 권한 안내 텍스트 */}
            {!isModifiable && (
                <Text style={[styles.permissionText, { color: colors.textSecondary }]}>
                    본인이 생성한 일정만 수정/삭제할 수 있습니다.
                </Text>
            )}

            {/* 과거 일정 안내 텍스트 (기타 일정 제외) */}
            {isModifiable && isPast && event.type !== 'personal_schedule' && (
                <Text style={[styles.permissionText, { color: colors.textSecondary }]}>
                    지난 일정은 수정할 수 없습니다.
                </Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    actionsContainer: {
        marginTop: 8,
    },
    divider: {
        height: 1,
        marginVertical: 16,
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
    },
    buttonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8, // 16에서 8로 줄여서 버튼 사이 여백 감소
    },
    actionButton: {
        flex: 1,
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 24, // 20에서 24로 증가하여 버튼 폭 확대
        minHeight: 56,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    editButton: {
        marginRight: 4, // 8에서 4로 줄여서 여백 감소
    },
    deleteButton: {
        marginLeft: 4, // 8에서 4로 줄여서 여백 감소
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionButtonText: {
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
        color: '#FFFFFF',
    },
    permissionText: {
        fontSize: 12,
        textAlign: 'center',
        marginTop: 12,
        fontStyle: 'italic',
        lineHeight: 16,
    },
});

export default ScheduleActions;
