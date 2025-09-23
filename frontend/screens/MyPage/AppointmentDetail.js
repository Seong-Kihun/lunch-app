import React from 'react';
import { 
    View, 
    Text, 
    TouchableOpacity, 
    ScrollView, 
    SafeAreaView, 
    StyleSheet 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const AppointmentDetail = ({ navigation, route }) => {
    const { appointment } = route.params;
    
    const currentColors = {
        primary: '#3B82F6',
        secondary: '#10B981',
        background: '#F1F5F9',
        surface: '#FFFFFF',
        text: '#1E293B',
        textSecondary: '#64748B',
        border: '#E2E8F0',
        gray: '#64748B',
        lightGray: '#E2E8F0',
        yellow: '#F4D160',
        deepBlue: '#1D5D9B',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444'
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const getStatusColor = (status) => {
        const colors = {
            'completed': '#10B981',
            'cancelled': '#EF4444',
            'upcoming': '#3B82F6'
        };
        return colors[status] || '#6B7280';
    };

    const getStatusText = (status) => {
        const texts = {
            'completed': '완료',
            'cancelled': '취소',
            'upcoming': '예정'
        };
        return texts[status] || status;
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background }]}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* 약속 정보 카드 */}
                <View style={[styles.infoCard, { backgroundColor: currentColors.surface, shadowColor: currentColors.primary }]}>
                    <View style={styles.cardHeader}>
                        <Text style={[styles.appointmentTitle, { color: currentColors.text }]}>{appointment.title}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) }]}>
                            <Text style={styles.statusText}>{getStatusText(appointment.status)}</Text>
                        </View>
                    </View>

                    <View style={styles.infoSection}>
                        <View style={styles.infoRow}>
                            <Ionicons name="calendar" size={20} color={currentColors.primary} />
                            <View style={styles.infoContent}>
                                <Text style={[styles.infoLabel, { color: currentColors.textSecondary }]}>날짜 & 시간</Text>
                                <Text style={[styles.infoValue, { color: currentColors.text }]}>
                                    {formatDate(appointment.date)} {appointment.time}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.infoRow}>
                            <Ionicons name="restaurant" size={20} color={currentColors.primary} />
                            <View style={styles.infoContent}>
                                <Text style={[styles.infoLabel, { color: currentColors.textSecondary }]}>식당</Text>
                                <Text style={[styles.infoValue, { color: currentColors.text }]}>{appointment.restaurant}</Text>
                            </View>
                        </View>

                        <View style={styles.infoRow}>
                            <Ionicons name="location" size={20} color={currentColors.primary} />
                            <View style={styles.infoContent}>
                                <Text style={[styles.infoLabel, { color: currentColors.textSecondary }]}>주소</Text>
                                <Text style={[styles.infoValue, { color: currentColors.text }]}>{appointment.address}</Text>
                            </View>
                        </View>

                        <View style={styles.infoRow}>
                            <Ionicons name="people" size={20} color={currentColors.primary} />
                            <View style={styles.infoContent}>
                                <Text style={[styles.infoLabel, { color: currentColors.textSecondary }]}>참여자</Text>
                                <Text style={[styles.infoValue, { color: currentColors.text }]}>
                                    {appointment.participants.join(', ')}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.infoRow}>
                            <Ionicons name="pricetag" size={20} color={currentColors.primary} />
                            <View style={styles.infoContent}>
                                <Text style={[styles.infoLabel, { color: currentColors.textSecondary }]}>카테고리</Text>
                                <Text style={[styles.infoValue, { color: currentColors.text }]}>{appointment.category}</Text>
                            </View>
                        </View>

                        {appointment.description && (
                            <View style={styles.infoRow}>
                                <Ionicons name="chatbubble" size={20} color={currentColors.primary} />
                                <View style={styles.infoContent}>
                                    <Text style={[styles.infoLabel, { color: currentColors.textSecondary }]}>설명</Text>
                                    <Text style={[styles.infoValue, { color: currentColors.text }]}>{appointment.description}</Text>
                                </View>
                            </View>
                        )}
                    </View>

                    {appointment.memorable && (
                        <View style={styles.memorableSection}>
                            <Ionicons name="star" size={20} color="#F59E0B" />
                            <Text style={styles.memorableText}>기억할 만한 약속</Text>
                        </View>
                    )}
                </View>

                {/* 액션 버튼 */}
                {appointment.status === 'upcoming' && (
                    <View style={styles.actionContainer}>
                        <TouchableOpacity 
                            style={[styles.actionButton, { backgroundColor: currentColors.error }]}
                            onPress={() => {
                                // 취소 로직 구현
                                navigation.goBack();
                            }}
                        >
                            <Ionicons name="close-circle" size={20} color="#FFFFFF" />
                            <Text style={styles.actionButtonText}>약속 취소</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={[styles.actionButton, { backgroundColor: currentColors.primary }]}
                            onPress={() => {
                                // 채팅방으로 이동 로직 구현
                                navigation.navigate('소통', { 
                                    screen: 'ChatRoom', 
                                    params: { 
                                        chatId: appointment.id, 
                                        chatType: 'party', 
                                        chatTitle: appointment.title 
                                    } 
                                });
                            }}
                        >
                            <Ionicons name="chatbubbles" size={20} color="#FFFFFF" />
                            <Text style={styles.actionButtonText}>채팅방으로 이동</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    scrollView: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    placeholder: {
        width: 32,
    },
    infoCard: {
        margin: 20,
        padding: 20,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    appointmentTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1E293B',
        flex: 1,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    statusText: {
        fontSize: 14,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    infoSection: {
        gap: 20,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    infoContent: {
        flex: 1,
        marginLeft: 12,
    },
    infoLabel: {
        fontSize: 14,
        color: '#64748B',
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 16,
        color: '#1E293B',
        fontWeight: '500',
    },
    memorableSection: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 20,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
    },
    memorableText: {
        fontSize: 16,
        color: '#F59E0B',
        marginLeft: 8,
        fontWeight: '600',
    },
    actionContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 12,
        marginBottom: 20,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    actionButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
});

export default AppointmentDetail; 