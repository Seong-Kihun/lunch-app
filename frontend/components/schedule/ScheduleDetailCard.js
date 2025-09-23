import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScheduleActions from './ScheduleActions';

const ScheduleDetailCard = ({ 
    event, 
    navigation, 
    onEdit, 
    onDelete, 
    onClose,
    onRefresh,
    isLastItem = false 
}) => {
    const currentColors = {
        background: '#FFFFFF',
        surface: '#F8FAFC',
        text: '#1F2937',
        textSecondary: '#6B7280',
        primary: '#3B82F6',
        gray: '#9CA3AF',
        border: '#E5E7EB',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444'
    };



    // 식당 클릭 핸들러
    const handleRestaurantPress = () => {
        if (!event.restaurant || event.restaurant === '식당 미정') return;
        
        // 식당 정보가 있으면 RestaurantDetail 화면으로 이동
        const restaurantData = {
            id: event.restaurant_id || event.restaurant,
            name: event.restaurant,
            // 기타 일정에서 저장된 식당 정보 활용
            address: event.restaurant_address,
            category: event.restaurant_category,
            rating: event.restaurant_rating,
            // 추가 식당 정보들...
        };
        
        navigation.navigate('맛집', {
            screen: 'RestaurantDetail',
            params: { restaurant: restaurantData }
        });
    };

    // 참석자 클릭 핸들러
    const handleAttendeePress = (attendee) => {
        // 🚨 중요: 직접 입력한 참석자는 프로필 상세 정보를 볼 수 없음
        if (attendee.employee_id && attendee.employee_id.startsWith('direct_input_')) {
            console.log('직접 입력한 참석자입니다. 프로필 상세 정보를 볼 수 없습니다.');
            return;
        }
        
        if (!attendee.employee_id && !attendee.id) return;
        
        const employeeId = attendee.employee_id || attendee.id;
        
        // 🚨 중요: 참석자 클릭 시 모달 닫기
        if (onClose) {
            onClose();
        }
        
        // 본인이면 UserProfile로, 다른 사람이면 친구 프로필로
        const currentUserId = global.myEmployeeId || '1';
        if (employeeId === currentUserId) {
            // 본인 프로필은 홈탭에서 직접 이동
            navigation.navigate('UserProfile', {
                friend: attendee,
                employeeId: employeeId,
                isMyProfile: true
            });
        } else {
            // 🚨 중요: 친구 프로필은 safeNavigateToTab 사용하여 친구 탭으로 이동
            // 홈탭에서 친구 탭의 UserProfile로 이동
            // TODO: safeNavigateToTab 함수를 Context에서 가져와야 함
            // fallback: 직접 네비게이션
            navigation.navigate('UserProfile', {
                friend: attendee,
                employeeId: employeeId,
                isFriend: true,
                returnToHome: true,
                returnToSchedule: true,
                scheduleDate: event.date || event.party_date,
                scheduleEvent: event
            });
        }
    };

    // 반복 일정 표시 텍스트
    const getRecurrenceText = () => {
        if (!event.isRecurring) return null;
        
        const typeMap = {
            'daily': '매일',
            'weekly': '매주',
            'monthly': '매월'
        };
        
        return typeMap[event.recurrenceType] || '반복';
    };

    return (
        <ScrollView 
            style={[
                styles.cardContainer, 
                { backgroundColor: currentColors.surface },
                !isLastItem && styles.cardMarginBottom
            ]}
            showsVerticalScrollIndicator={false}
        >
            {/* 헤더 영역 */}
            <View style={styles.headerSection}>
                <View style={styles.titleRow}>
                    <View style={styles.titleContainer}>
                        <Ionicons 
                            name="restaurant" 
                            size={20} 
                            color={currentColors.primary} 
                        />
                        <Text style={[
                            styles.titleText, 
                            { color: currentColors.text },
                            !event.title && styles.placeholderText
                        ]}>
                            {event.title || '제목 없음'}
                        </Text>
                    </View>
                    {event.isRecurring && (
                        <View style={[styles.recurrenceBadge, { backgroundColor: currentColors.primary + '20' }]}>
                            <Ionicons name="repeat" size={12} color={currentColors.primary} />
                            <Text style={[styles.recurrenceText, { color: currentColors.primary }]}>
                                {getRecurrenceText()}
                            </Text>
                        </View>
                    )}
                </View>
            </View>

            {/* 메인 정보 영역 */}
            <View style={styles.infoSection}>
                {/* 만나는 장소 */}
                <View style={styles.infoRow}>
                    <Ionicons 
                        name="location" 
                        size={18} 
                        color={currentColors.textSecondary} 
                    />
                    <Text style={[
                        styles.infoLabel, 
                        { color: currentColors.textSecondary }
                    ]}>
                        만나는 장소:
                    </Text>
                    <Text style={[
                        styles.infoValue, 
                        { color: currentColors.text },
                        !event.location && styles.placeholderText
                    ]}>
                        {event.location || '장소 미정'}
                    </Text>
                </View>

                {/* 식당 */}
                <View style={styles.infoRow}>
                    <Ionicons 
                        name="storefront" 
                        size={18} 
                        color={currentColors.textSecondary} 
                    />
                    <Text style={[
                        styles.infoLabel, 
                        { color: currentColors.textSecondary }
                    ]}>
                        식당:
                    </Text>
                    {event.restaurant && event.restaurant !== '식당 미정' ? (
                        <TouchableOpacity onPress={handleRestaurantPress}>
                            <Text style={[
                                styles.infoValue, 
                                styles.clickableText,
                                { color: currentColors.primary }
                            ]}>
                                {event.restaurant}
                            </Text>
                        </TouchableOpacity>
                    ) : (
                        <Text style={[
                            styles.infoValue, 
                            styles.placeholderText,
                            { color: currentColors.textSecondary }
                        ]}>
                            식당 미정
                        </Text>
                    )}
                </View>

                {/* 시간 */}
                <View style={styles.infoRow}>
                    <Ionicons 
                        name="time" 
                        size={18} 
                        color={currentColors.textSecondary} 
                    />
                    <Text style={[
                        styles.infoLabel, 
                        { color: currentColors.textSecondary }
                    ]}>
                        시간:
                    </Text>
                    <Text style={[
                        styles.infoValue, 
                        { color: currentColors.text },
                        !event.time && styles.placeholderText
                    ]}>
                        {event.time || '시간 미정'}
                    </Text>
                </View>

                {/* 참석자 정보 */}
                {event.attendees && event.attendees.length > 0 && (
                    <View style={styles.attendeesSection}>
                        <View style={styles.attendeesHeader}>
                            <Ionicons 
                                name="people" 
                                size={20} 
                                color={currentColors.textSecondary} 
                            />
                            <Text style={[
                                styles.attendeesTitle, 
                                { color: currentColors.textSecondary }
                            ]}>
                                참석자({event.attendees.length}명)
                            </Text>
                        </View>
                        <View style={styles.attendeesList}>
                            {event.attendees.map((attendee, index) => {
                                const isDirectInput = attendee.employee_id && attendee.employee_id.startsWith('direct_input_');
                                
                                return (
                                    <TouchableOpacity
                                        key={attendee.id || attendee.employee_id || index}
                                        style={styles.attendeeItem}
                                        onPress={() => handleAttendeePress(attendee)}
                                        activeOpacity={isDirectInput ? 1 : 0.7}
                                    >
                                        <View style={[
                                            styles.attendeeAvatarSmall,
                                            { 
                                                backgroundColor: isDirectInput 
                                                    ? currentColors.gray + '20' 
                                                    : currentColors.primary + '20' 
                                            }
                                        ]}>
                                            {isDirectInput ? (
                                                <Ionicons 
                                                    name="person-add" 
                                                    size={18} 
                                                    color={currentColors.gray} 
                                                />
                                            ) : (
                                                <Text style={[
                                                    styles.attendeeAvatarTextSmall,
                                                    { color: currentColors.primary }
                                                ]}>
                                                    {(attendee.nickname || attendee.name || '?').charAt(0)}
                                                </Text>
                                            )}
                                        </View>
                                        <Text style={[
                                            styles.attendeeNameSmall,
                                            { 
                                                color: isDirectInput 
                                                    ? currentColors.gray 
                                                    : currentColors.text 
                                            }
                                        ]}>
                                            {attendee.nickname || attendee.name || '참석자'}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                )}
            </View>

            {/* 설명 영역 */}
            {event.description && (
                <View style={styles.descriptionSection}>
                    <View style={styles.descriptionHeader}>
                        <Ionicons 
                            name="chatbubble-outline" 
                            size={18} 
                            color={currentColors.textSecondary} 
                        />
                        <Text style={[
                            styles.descriptionTitle, 
                            { color: currentColors.textSecondary }
                        ]}>
                            설명
                        </Text>
                    </View>
                    <Text style={[
                        styles.descriptionText, 
                        { color: currentColors.text }
                    ]}>
                        {event.description}
                    </Text>
                </View>
            )}

            {/* 액션 버튼 영역 */}
            <ScheduleActions
                event={event}
                onEdit={onEdit}
                onDelete={onDelete}
                onClose={onClose}
                onRefresh={onRefresh}
            />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    cardContainer: {
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
        maxHeight: 600, // 400에서 600으로 늘려서 카드 최대 높이 증가
    },
    cardMarginBottom: {
        marginBottom: 16,
    },
    headerSection: {
        marginBottom: 16,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    titleText: {
        fontSize: 18,
        fontWeight: '600',
        marginLeft: 8,
        flex: 1,
    },
    recurrenceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    recurrenceText: {
        fontSize: 12,
        fontWeight: '500',
        marginLeft: 4,
    },
    infoSection: {
        marginBottom: 16,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        flexWrap: 'wrap',
    },
    infoLabel: {
        fontSize: 14,
        marginLeft: 8,
        minWidth: 80,
    },
    infoValue: {
        fontSize: 14,
        marginLeft: 8,
        flex: 1,
    },
    clickableText: {
        textDecorationLine: 'underline',
    },
    placeholderText: {
        fontStyle: 'italic',
    },
    descriptionSection: {
        marginBottom: 16,
    },
    descriptionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    descriptionTitle: {
        fontSize: 14,
        marginLeft: 8,
    },
    descriptionText: {
        fontSize: 14,
        lineHeight: 20,
        paddingLeft: 26,
    },
    // 참석자 섹션 스타일
    attendeesSection: {
        marginBottom: 16,
    },
    attendeesHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    attendeesTitle: {
        fontSize: 14,
        marginLeft: 8,
    },
    attendeesList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingLeft: 28,
    },
    attendeeItem: {
        alignItems: 'center',
        marginRight: 16,
        marginBottom: 12,
    },
    attendeeAvatarSmall: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    attendeeAvatarTextSmall: {
        fontSize: 16,
        fontWeight: '600',
    },
    attendeeNameSmall: {
        fontSize: 13,
        textAlign: 'center',
        maxWidth: 60,
    },
});

export default ScheduleDetailCard;
