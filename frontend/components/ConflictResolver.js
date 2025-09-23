import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    Dimensions
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ConflictResolver = ({ conflicts, onResolve, onCancel }) => {
    const [resolvedConflicts, setResolvedConflicts] = useState([]);
    const [selectedActions, setSelectedActions] = useState({});

    // 충돌 유형별 아이콘과 색상
    const getConflictIcon = (type) => {
        switch (type) {
            case 'TIME_CONFLICT': return { icon: '⏰', color: '#EF4444' };
            case 'PARTICIPANT_CONFLICT': return { icon: '👥', color: '#F59E0B' };
            case 'LOCATION_CONFLICT': return { icon: '📍', color: '#8B5CF6' };
            default: return { icon: '⚠️', color: '#64748B' };
        }
    };

    // 충돌 심각도별 색상
    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'HIGH': return '#EF4444';
            case 'MEDIUM': return '#F59E0B';
            case 'LOW': return '#10B981';
            default: return '#64748B';
        }
    };

    // 충돌 해결 액션 선택
    const selectAction = useCallback((conflictId, action) => {
        setSelectedActions(prev => ({
            ...prev,
            [conflictId]: action
        }));
    }, []);

    // 충돌 해결 완료
    const handleResolve = useCallback(() => {
        // 모든 충돌에 대해 액션이 선택되었는지 확인
        const unresolvedConflicts = conflicts.filter(conflict => !selectedActions[conflict.id]);
        
        if (unresolvedConflicts.length > 0) {
            Alert.alert('해결 필요', '모든 충돌에 대해 해결 방법을 선택해주세요.');
            return;
        }

        // 해결된 충돌들을 부모 컴포넌트로 전달
        const resolved = conflicts.map(conflict => ({
            ...conflict,
            resolution: selectedActions[conflict.id]
        }));

        onResolve(resolved);
    }, [conflicts, selectedActions, onResolve]);

    // 충돌별 해결 옵션 렌더링
    const renderConflictOptions = (conflict) => {
        const { icon, color } = getConflictIcon(conflict.type);
        
        switch (conflict.type) {
            case 'TIME_CONFLICT':
                return (
                    <View style={styles.optionsContainer}>
                        <Text style={styles.optionsTitle}>해결 방법을 선택하세요:</Text>
                        <TouchableOpacity
                            style={[
                                styles.optionButton,
                                selectedActions[conflict.id] === 'RESCHEDULE' && styles.optionButtonSelected
                            ]}
                            onPress={() => selectAction(conflict.id, 'RESCHEDULE')}
                        >
                            <Text style={styles.optionButtonText}>시간 변경</Text>
                            <Text style={styles.optionButtonSubtext}>다른 시간으로 약속 조정</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                            style={[
                                styles.optionButton,
                                selectedActions[conflict.id] === 'CANCEL_EXISTING' && styles.optionButtonSelected
                            ]}
                            onPress={() => selectAction(conflict.id, 'CANCEL_EXISTING')}
                        >
                            <Text style={styles.optionButtonText}>기존 일정 취소</Text>
                            <Text style={styles.optionButtonSubtext}>기존 약속을 취소하고 새로 생성</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                            style={[
                                styles.optionButton,
                                selectedActions[conflict.id] === 'PROCEED' && styles.optionButtonSelected
                            ]}
                            onPress={() => selectAction(conflict.id, 'PROCEED')}
                        >
                            <Text style={styles.optionButtonText}>그대로 진행</Text>
                            <Text style={styles.optionButtonSubtext}>충돌을 무시하고 계속 진행</Text>
                        </TouchableOpacity>
                    </View>
                );
                
            case 'PARTICIPANT_CONFLICT':
                return (
                    <View style={styles.optionsContainer}>
                        <Text style={styles.optionsTitle}>해결 방법을 선택하세요:</Text>
                        <TouchableOpacity
                            style={[
                                styles.optionButton,
                                selectedActions[conflict.id] === 'EXCLUDE_PARTICIPANTS' && styles.optionButtonSelected
                            ]}
                            onPress={() => selectAction(conflict.id, 'EXCLUDE_PARTICIPANTS')}
                        >
                            <Text style={styles.optionButtonText}>충돌 참가자 제외</Text>
                            <Text style={styles.optionButtonSubtext}>충돌이 있는 참가자만 제외</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                            style={[
                                styles.optionButton,
                                selectedActions[conflict.id] === 'RESCHEDULE' && styles.optionButtonSelected
                            ]}
                            onPress={() => selectAction(conflict.id, 'RESCHEDULE')}
                        >
                            <Text style={styles.optionButtonText}>시간 변경</Text>
                            <Text style={styles.optionButtonSubtext}>모든 참가자가 가능한 시간으로 조정</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                            style={[
                                styles.optionButton,
                                selectedActions[conflict.id] === 'PROCEED' && styles.optionButtonSelected
                            ]}
                            onPress={() => selectAction(conflict.id, 'PROCEED')}
                        >
                            <Text style={styles.optionButtonText}>그대로 진행</Text>
                            <Text style={styles.optionButtonSubtext}>충돌을 무시하고 계속 진행</Text>
                        </TouchableOpacity>
                    </View>
                );
                
            default:
                return (
                    <View style={styles.optionsContainer}>
                        <Text style={styles.optionsTitle}>해결 방법을 선택하세요:</Text>
                        <TouchableOpacity
                            style={[
                                styles.optionButton,
                                selectedActions[conflict.id] === 'PROCEED' && styles.optionButtonSelected
                            ]}
                            onPress={() => selectAction(conflict.id, 'PROCEED')}
                        >
                            <Text style={styles.optionButtonText}>계속 진행</Text>
                            <Text style={styles.optionButtonSubtext}>충돌을 무시하고 계속 진행</Text>
                        </TouchableOpacity>
                    </View>
                );
        }
    };

    // 개별 충돌 렌더링
    const renderConflict = (conflict, index) => {
        const { icon, color } = getConflictIcon(conflict.type);
        const severityColor = getSeverityColor(conflict.severity);
        
        return (
            <View key={conflict.id} style={styles.conflictCard}>
                {/* 충돌 헤더 */}
                <View style={styles.conflictHeader}>
                    <View style={styles.conflictIconContainer}>
                        <Text style={[styles.conflictIcon, { color }]}>{icon}</Text>
                    </View>
                    <View style={styles.conflictInfo}>
                        <Text style={styles.conflictType}>
                            {conflict.type === 'TIME_CONFLICT' ? '시간 충돌' :
                             conflict.type === 'PARTICIPANT_CONFLICT' ? '참가자 충돌' :
                             conflict.type === 'LOCATION_CONFLICT' ? '장소 충돌' : '기타 충돌'}
                        </Text>
                        <View style={[styles.severityBadge, { backgroundColor: severityColor }]}>
                            <Text style={styles.severityText}>
                                {conflict.severity === 'HIGH' ? '높음' :
                                 conflict.severity === 'MEDIUM' ? '보통' : '낮음'}
                            </Text>
                        </View>
                    </View>
                </View>
                
                {/* 충돌 메시지 */}
                <Text style={styles.conflictMessage}>{conflict.message}</Text>
                
                {/* 기존 일정 정보 */}
                {conflict.existingAppointment && (
                    <View style={styles.existingAppointmentInfo}>
                        <Text style={styles.existingAppointmentTitle}>기존 일정:</Text>
                        <View style={styles.existingAppointmentCard}>
                            <Text style={styles.existingAppointmentText}>
                                📅 {conflict.existingAppointment.title}
                            </Text>
                            {conflict.existingAppointment.time && (
                                <Text style={styles.existingAppointmentText}>
                                    ⏰ {conflict.existingAppointment.time}
                                </Text>
                            )}
                            {conflict.existingAppointment.location && (
                                <Text style={styles.existingAppointmentText}>
                                    📍 {conflict.existingAppointment.location}
                                </Text>
                            )}
                        </View>
                    </View>
                )}
                
                {/* 충돌 해결 옵션 */}
                {renderConflictOptions(conflict)}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* 헤더 */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>일정 충돌 해결</Text>
                <Text style={styles.headerSubtitle}>
                    {conflicts.length}개의 충돌이 발견되었습니다. 해결 방법을 선택해주세요.
                </Text>
            </View>
            
            {/* 충돌 목록 */}
            <ScrollView style={styles.conflictsContainer} showsVerticalScrollIndicator={false}>
                {conflicts.map((conflict, index) => renderConflict(conflict, index))}
            </ScrollView>
            
            {/* 액션 버튼 */}
            <View style={styles.actionButtons}>
                <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={onCancel}
                >
                    <Text style={styles.cancelButtonText}>취소</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                    style={[
                        styles.resolveButton,
                        Object.keys(selectedActions).length === conflicts.length && styles.resolveButtonActive
                    ]}
                    onPress={handleResolve}
                    disabled={Object.keys(selectedActions).length !== conflicts.length}
                >
                    <Text style={styles.resolveButtonText}>충돌 해결</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1E293B',
        marginBottom: 8,
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#64748B',
        lineHeight: 24,
    },
    conflictsContainer: {
        flex: 1,
        padding: 20,
    },
    conflictCard: {
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    conflictHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    conflictIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    conflictIcon: {
        fontSize: 24,
    },
    conflictInfo: {
        flex: 1,
    },
    conflictType: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1E293B',
        marginBottom: 8,
    },
    severityBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    severityText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    conflictMessage: {
        fontSize: 16,
        color: '#374151',
        lineHeight: 24,
        marginBottom: 16,
    },
    existingAppointmentInfo: {
        marginBottom: 20,
    },
    existingAppointmentTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 8,
    },
    existingAppointmentCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    existingAppointmentText: {
        fontSize: 14,
        color: '#64748B',
        marginBottom: 4,
    },
    optionsContainer: {
        marginTop: 16,
    },
    optionsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 12,
    },
    optionButton: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    optionButtonSelected: {
        borderColor: '#3B82F6',
        backgroundColor: '#EFF6FF',
    },
    optionButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 4,
    },
    optionButtonSubtext: {
        fontSize: 14,
        color: '#64748B',
        lineHeight: 20,
    },
    actionButtons: {
        flexDirection: 'row',
        padding: 20,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 16,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#64748B',
    },
    resolveButton: {
        flex: 1,
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 16,
        backgroundColor: '#CBD5E0',
        alignItems: 'center',
    },
    resolveButtonActive: {
        backgroundColor: '#3B82F6',
    },
    resolveButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});

export default ConflictResolver;
