import React from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScheduleDetailCard from './ScheduleDetailCard';

const { width, height } = Dimensions.get('window');

const ScheduleDetailModal = ({ 
    visible, 
    onClose, 
    events = [], 
    date, 
    navigation,
    onEdit,
    onDelete,
    onRefresh
}) => {
    const currentColors = {
        background: '#FFFFFF',
        surface: '#F8FAFC',
        text: '#1F2937',
        textSecondary: '#6B7280',
        primary: '#3B82F6',
        gray: '#9CA3AF',
        border: '#E5E7EB'
    };



    if (!visible) return null;

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.modalOverlay}>
                {/* 배경 dim 처리 */}
                <TouchableOpacity 
                    style={styles.backdrop}
                    activeOpacity={1}
                    onPress={onClose}
                >
                    <View style={styles.backdropOverlay} />
                </TouchableOpacity>

                {/* 메인 컨텐츠 */}
                <View style={[styles.modalContainer, { backgroundColor: currentColors.background }]}>
                    {/* 헤더 */}
                    <View style={[styles.header, { borderBottomColor: currentColors.border }]}>
                        <View style={styles.headerContent}>
                            <View style={styles.headerLeft}>
                                <Ionicons 
                                    name="calendar" 
                                    size={24} 
                                    color={currentColors.primary} 
                                />
                                <View style={styles.headerText}>
                                    <Text style={[styles.headerTitle, { color: currentColors.text }]}>
                                        일정 상세 정보
                                    </Text>
                                    <Text style={[styles.headerDate, { color: currentColors.textSecondary }]}>
                                        {formatDate(date)}
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                style={[styles.closeButton, { backgroundColor: currentColors.surface }]}
                                onPress={onClose}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="close" size={20} color={currentColors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* 일정 카드들 */}
                    <View style={styles.contentContainer}>
                        {events && events.length > 0 ? (
                            events.map((event, index) => {
                                // 백엔드 데이터를 프론트엔드 형식으로 변환
                                const transformedEvent = {
                                    ...event,
                                    isRecurring: event.is_recurring || false,
                                    recurrenceType: event.recurrence_type,
                                    recurrenceInterval: event.recurrence_interval,
                                    recurrenceEndDate: event.recurrence_end_date,
                                    time: event.start_time ? event.start_time.split(':').slice(0, 2).join(':') : event.time,
                                    attendees: event.attendees || []
                                };
                                
                                return (
                                    <ScheduleDetailCard
                                        key={event.id || index}
                                        event={transformedEvent}
                                        navigation={navigation}
                                        onEdit={onEdit}
                                        onDelete={onDelete}
                                        onClose={onClose}
                                        onRefresh={onRefresh}
                                        isLastItem={index === events.length - 1}
                                    />
                                );
                            })
                        ) : (
                            <View style={styles.emptyContainer}>
                                <Ionicons 
                                    name="calendar-outline" 
                                    size={48} 
                                    color={currentColors.gray} 
                                />
                                <Text style={[styles.emptyText, { color: currentColors.textSecondary }]}>
                                    이 날짜에 등록된 일정이 없습니다.
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </SafeAreaView>
        </Modal>
    );
};

// 날짜 포맷팅 함수
const formatDate = (dateString) => {
    if (!dateString) return '날짜 없음';
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return '잘못된 날짜';
        }
        
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        
        const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
        const weekday = weekdays[date.getDay()];
        
        return `${year}년 ${month}월 ${day}일 (${weekday})`;
    } catch (error) {
        console.error('날짜 포맷팅 오류:', error);
        return '날짜 오류';
    }
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backdropOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContainer: {
        width: width * 0.9,
        maxHeight: height * 0.9, // 0.8에서 0.9로 늘려서 모달 전체 높이 증가
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
    },
    header: {
        borderBottomWidth: 1,
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    headerText: {
        marginLeft: 12,
        flex: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    headerDate: {
        fontSize: 14,
        marginTop: 2,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    contentContainer: {
        maxHeight: height * 0.7, // 0.6에서 0.7로 늘려서 콘텐츠 영역 높이 증가
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 48,
    },
    emptyText: {
        fontSize: 16,
        marginTop: 12,
        textAlign: 'center',
    },
});

export default ScheduleDetailModal;
