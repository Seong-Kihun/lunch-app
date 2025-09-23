import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    TouchableOpacity, 
    ScrollView, 
    SafeAreaView, 
    ActivityIndicator,
    StyleSheet,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getUserAppointments } from '../../services/userService';
import { useUser } from '../../contexts/UserContext';

const AppointmentHistorySection = ({ navigation }) => {
    const { user, isAuthenticated } = useUser();
    const [isLoading, setIsLoading] = useState(true);
    const [appointments, setAppointments] = useState([]);
    const [filter, setFilter] = useState('all');
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const currentColors = global.currentColors || {
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

    useEffect(() => {
        loadAppointments(true);
    }, [filter]);

    const loadAppointments = async (reset = false) => {
        try {
            if (!isAuthenticated) {
                setError('로그인이 필요합니다.');
                return;
            }

            if (reset) {
                setPage(1);
                setAppointments([]);
                setHasMore(true);
            }

            if (!hasMore && !reset) return;

            setIsLoading(true);
            setError(null);
            
            // 개발 모드에서는 API 호출을 건너뛰고 기본 데이터 사용
            if (__DEV__) {
                const mockAppointments = [
                    {
                        id: 1,
                        title: '팀 점심 모임',
                        date: '2024-01-15',
                        time: '12:00',
                        participants: ['김코이카', '박영희', '최민수', '이지은'],
                        status: 'completed',
                        restaurant: '맛있는 한식당',
                        category: '한식',
                        memorable: true,
                        address: '서울시 강남구 테헤란로 123',
                        description: '팀원들과 함께하는 즐거운 점심 시간'
                    },
                    {
                        id: 2,
                        title: '새로운 중식당 탐방',
                        date: '2024-01-14',
                        time: '12:30',
                        participants: ['김코이카', '박영희'],
                        status: 'completed',
                        restaurant: '중국집',
                        category: '중식',
                        memorable: false,
                        address: '서울시 서초구 강남대로 456',
                        description: '새로운 중식당 탐방'
                    },
                    {
                        id: 3,
                        title: '특별한 날 점심',
                        date: '2024-01-13',
                        time: '12:00',
                        participants: ['김코이카', '최민수'],
                        status: 'completed',
                        restaurant: '고급 일식당',
                        category: '일식',
                        memorable: true,
                        address: '서울시 강남구 논현로 789',
                        description: '특별한 날을 위한 고급 일식'
                    },
                    {
                        id: 4,
                        title: '랜덤런치',
                        date: '2024-01-12',
                        time: '12:00',
                        participants: ['김코이카', '이지은', '박영희'],
                        status: 'completed',
                        restaurant: '새로운 식당',
                        category: '양식',
                        memorable: false,
                        address: '서울시 강남구 삼성로 101',
                        description: '새로운 사람들과의 만남'
                    },
                    {
                        id: 5,
                        title: '카페 점심',
                        date: '2024-01-11',
                        time: '12:30',
                        participants: ['김코이카', '최민수'],
                        status: 'completed',
                        restaurant: '카페',
                        category: '카페',
                        memorable: false,
                        address: '서울시 강남구 역삼로 202',
                        description: '카페에서의 여유로운 시간'
                    }
                ];
                setAppointments(mockAppointments);
                setHasMore(false);
                return;
            }
            
            // 프로덕션 모드에서만 API 호출
            try {
                const response = await fetch(`${global.RENDER_SERVER_URL}/api/users/appointments?status=${filter}&page=${page}&limit=20`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${global.accessToken}`
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data.success && data.data && data.data.appointments) {
                    if (reset) {
                        setAppointments(data.data.appointments);
                    } else {
                        setAppointments(prev => [...prev, ...data.data.appointments]);
                    }
                    setHasMore(data.data.appointments.length === 20);
                    setPage(prev => prev + 1);
                } else {
                    setAppointments([]);
                    setHasMore(false);
                }
            } catch (error) {
                console.error('API 호출 실패, 기본 데이터 사용:', error);
                const mockAppointments = [
                    {
                        id: 1,
                        title: '팀 점심 모임',
                        date: '2024-01-15',
                        time: '12:00',
                        participants: ['김코이카', '박영희', '최민수', '이지은'],
                        status: 'completed',
                        restaurant: '맛있는 한식당',
                        category: '한식',
                        memorable: true,
                        address: '서울시 강남구 테헤란로 123',
                        description: '팀원들과 함께하는 즐거운 점심 시간'
                    }
                ];
                setAppointments(mockAppointments);
                setHasMore(false);
            }
        } catch (error) {
            console.error('약속 데이터 로드 실패:', error);
            setError(error.message);
            
            // 에러 시 기본 데이터 사용
            const mockAppointments = [
                {
                    id: 1,
                    title: '팀 점심 모임',
                    date: '2024-01-15',
                    time: '12:00',
                    participants: ['김코이카', '박영희', '최민수', '이지은'],
                    status: 'completed',
                    restaurant: '맛있는 한식당',
                    category: '한식',
                    memorable: true,
                    address: '서울시 강남구 테헤란로 123',
                    description: '팀원들과 함께하는 즐거운 점심 시간'
                }
            ];
            setAppointments(mockAppointments);
            setHasMore(false);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredAppointments = appointments.filter(appointment => {
        if (filter === 'all') return true;
        return appointment.status === filter;
    });

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed':
                return currentColors.success;
            case 'upcoming':
                return currentColors.warning;
            default:
                return currentColors.gray;
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'completed':
                return '완료';
            case 'upcoming':
                return '예정';
            default:
                return '알 수 없음';
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR', {
            month: 'short',
            day: 'numeric'
        });
    };

    const handleAppointmentPress = (appointment) => {
        navigation.navigate('AppointmentDetail', { appointment });
    };

    if (isLoading && appointments.length === 0) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background }]}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={currentColors.primary} />
                    <Text style={[styles.loadingText, { color: currentColors.textSecondary }]}>로딩 중...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (error && appointments.length === 0) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background }]}>
                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle-outline" size={64} color={currentColors.error} />
                    <Text style={[styles.errorText, { color: currentColors.textSecondary }]}>{error}</Text>
                    <TouchableOpacity 
                        style={[styles.retryButton, { backgroundColor: currentColors.primary }]}
                        onPress={() => loadAppointments(true)}
                    >
                        <Text style={styles.retryButtonText}>다시 시도</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background }]}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* 필터 버튼 */}
                <View style={styles.filterContainer}>
                    <TouchableOpacity
                        style={[
                            styles.filterButton,
                            { backgroundColor: filter === 'all' ? currentColors.primary : currentColors.surface }
                        ]}
                        onPress={() => setFilter('all')}
                        activeOpacity={0.8}
                    >
                        <Text style={[
                            styles.filterText,
                            { color: filter === 'all' ? '#FFFFFF' : currentColors.text }
                        ]}>
                            전체 ({appointments.length})
                        </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        style={[
                            styles.filterButton,
                            { backgroundColor: filter === 'completed' ? currentColors.primary : currentColors.surface }
                        ]}
                        onPress={() => setFilter('completed')}
                        activeOpacity={0.8}
                    >
                        <Text style={[
                            styles.filterText,
                            { color: filter === 'completed' ? '#FFFFFF' : currentColors.text }
                        ]}>
                            완료 ({appointments.filter(a => a.status === 'completed').length})
                        </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        style={[
                            styles.filterButton,
                            { backgroundColor: filter === 'upcoming' ? currentColors.primary : currentColors.surface }
                        ]}
                        onPress={() => setFilter('upcoming')}
                        activeOpacity={0.8}
                    >
                        <Text style={[
                            styles.filterText,
                            { color: filter === 'upcoming' ? '#FFFFFF' : currentColors.text }
                        ]}>
                            예정 ({appointments.filter(a => a.status === 'upcoming').length})
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* 약속 리스트 */}
                <View style={styles.appointmentsContainer}>
                    {filteredAppointments.map((appointment) => (
                        <TouchableOpacity 
                            key={appointment.id}
                            style={[styles.appointmentItem, { backgroundColor: currentColors.surface }]}
                            onPress={() => handleAppointmentPress(appointment)}
                            activeOpacity={0.8}
                        >
                            <View style={styles.appointmentHeader}>
                                <View style={styles.appointmentInfo}>
                                    <Text style={[styles.appointmentTitle, { color: currentColors.text }]}>
                                        {appointment.title}
                                    </Text>
                                    <Text style={[styles.appointmentDate, { color: currentColors.textSecondary }]}>
                                        {formatDate(appointment.date)} {appointment.time}
                                    </Text>
                                </View>
                                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) }]}>
                                    <Text style={styles.statusText}>{getStatusText(appointment.status)}</Text>
                                </View>
                            </View>
                            
                            <View style={styles.appointmentDetails}>
                                <View style={styles.detailRow}>
                                    <Ionicons name="restaurant" size={16} color={currentColors.primary} />
                                    <Text style={[styles.detailText, { color: currentColors.text }]}>
                                        {appointment.restaurant}
                                    </Text>
                                </View>
                                
                                <View style={styles.detailRow}>
                                    <Ionicons name="people" size={16} color={currentColors.primary} />
                                    <Text style={[styles.detailText, { color: currentColors.textSecondary }]}>
                                        {appointment.participants.length}명 참여
                                    </Text>
                                </View>
                                
                                {appointment.memorable && (
                                    <View style={styles.detailRow}>
                                        <Ionicons name="star" size={16} color={currentColors.yellow} />
                                        <Text style={[styles.detailText, { color: currentColors.yellow }]}>
                                            기억에 남는 약속
                                        </Text>
                                    </View>
                                )}
                            </View>
                            
                            <View style={styles.tapIndicator}>
                                <Ionicons name="chevron-forward" size={16} color={currentColors.gray} />
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    errorText: {
        fontSize: 16,
        textAlign: 'center',
        marginTop: 16,
        marginBottom: 24,
    },
    retryButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    filterContainer: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 20,
    },
    filterButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 8,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    filterText: {
        fontSize: 12,
        fontWeight: '500',
    },
    appointmentsContainer: {
        marginBottom: 20,
    },
    appointmentItem: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    appointmentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    appointmentInfo: {
        flex: 1,
    },
    appointmentTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    appointmentDate: {
        fontSize: 12,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 10,
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    appointmentDetails: {
        gap: 8,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    detailText: {
        fontSize: 14,
    },
    tapIndicator: {
        position: 'absolute',
        right: 16,
        top: '50%',
        marginTop: -8,
    },
});

export default AppointmentHistorySection;