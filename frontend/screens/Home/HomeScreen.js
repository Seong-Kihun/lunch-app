import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    StyleSheet,
    Dimensions,
    Alert,
    FlatList,
    Modal,
    Pressable
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { useMonthSchedules, transformSchedulesForCalendar } from '../../hooks/useScheduleQuery';
import { transformSchedulesToAppointments, transformSchedulesToMarkedDates, transformSchedulesToAllEvents } from './HomeScreenData';
import { getMyEmployeeId } from '../../components/common/Utils';
import COLORS from '../../components/common/Colors';
import { useSchedule } from '../../contexts/ScheduleContext';
import { useMission } from '../../contexts/MissionContext';
import { usePoints } from '../../contexts/PointsContext';
import { toLocalDateString, toKoreanDateString } from '../../utils/dateUtils';
import { apiClient } from '../../utils/apiClient';
import unifiedApiClient from '../../services/UnifiedApiClient';
import { getKoreanToday, safeNavigateToTab } from '../../components/common/Utils';
import { useToday } from '../../hooks/useToday';
import ScheduleDetailModal from '../../components/schedule/ScheduleDetailModal';
import MissionModal from '../../components/MissionModal';
import DateScheduleModal from '../../components/schedule/DateScheduleModal';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    runOnJS
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation, route }) {
    const currentColors = global.currentColors || COLORS.light;
    const myEmployeeId = getMyEmployeeId();
    
    // 디버깅: myEmployeeId 확인
    console.log('🔍 [HomeScreen] myEmployeeId:', myEmployeeId);
    console.log('🔍 [HomeScreen] global.currentUser:', global.currentUser);
    
    // 백엔드에서 오늘 날짜 가져오기
    const { todayString, isLoading: todayLoading } = useToday();
    
    // 현재 보이는 월 상태
    const [visibleMonth, setVisibleMonth] = useState(new Date());
    
    // 모달 상태
    const [modalData, setModalData] = useState({ visible: false, events: [], date: '' });
    const [missionModalVisible, setMissionModalVisible] = useState(false);
    const [dateScheduleModalVisible, setDateScheduleModalVisible] = useState(false);
    const [selectedDateForModal, setSelectedDateForModal] = useState('');
    
    // 모달 스와이프 애니메이션 상태
    const translateY = useSharedValue(0);
    const modalScale = useSharedValue(1);
    
    // 모달 닫기 함수 (즉시 닫기용)
    const closeModal = useCallback(() => {
        // 모달 상태 즉시 변경
        setModalData({ ...modalData, visible: false });
    }, [modalData]);
    
    // 제스처 핸들러
    const gesture = Gesture.Pan()
        .onStart(() => {
            'worklet';
        })
        .onUpdate((event) => {
            'worklet';
            if (event.translationY > 0) { // 아래로만 스와이프
                translateY.value = event.translationY;
                modalScale.value = 1 - (event.translationY / 1000);
            }
        })
        .onEnd((event) => {
            'worklet';
            if (event.translationY > 100) { // 100px 이상 아래로 스와이프하면 모달 닫기
                // 스와이프로 닫기 애니메이션 - 더 자연스럽게
                translateY.value = withSpring(800, {
                    damping: 15,
                    stiffness: 100,
                    onFinish: () => {
                        runOnJS(() => {
                            // 모달 상태 먼저 변경
                            setModalData({ ...modalData, visible: false });
                        })();
                    }
                });
                modalScale.value = withSpring(0.5, {
                    damping: 15,
                    stiffness: 100
                });
            } else {
                // 원래 위치로 돌아가기
                translateY.value = withSpring(0, {
                    damping: 15,
                    stiffness: 100
                });
                modalScale.value = withSpring(1, {
                    damping: 15,
                    stiffness: 100
                });
            }
        });
    
    // 애니메이션 스타일
    const animatedModalStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { translateY: translateY.value },
                { scale: modalScale.value }
            ],
        };
    });
    
    // 수동으로 일정 데이터 조회 (디버깅용)
    const [schedulesData, setSchedulesData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // 디버깅: 원본 데이터 확인
    console.log('🔍 [HomeScreen] 원본 일정 데이터:', schedulesData);
    
    // 일정 데이터 수동 조회
    const fetchSchedules = useCallback(async () => {
        if (!myEmployeeId) {
            console.log('🔍 [HomeScreen] myEmployeeId가 없어서 일정 조회 건너뜀');
            return;
        }
        
        try {
            setIsLoading(true);
            setError(null);
            
            // 월의 시작과 끝 날짜 계산
            const startDate = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
            const endDate = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0);
            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];
            
            console.log('🔍 [HomeScreen] 수동 일정 조회 시작:', {
                myEmployeeId,
                startDateStr,
                endDateStr
            });
            
        const data = await unifiedApiClient.get('/dev/schedules', {
            employee_id: myEmployeeId,
            start_date: startDateStr,
            end_date: endDateStr
        });
            console.log('🔍 [HomeScreen] 수동 일정 조회 결과:', data);
            
            if (data.success) {
                // 백엔드 응답에서 schedules 배열 추출
                const schedules = data.schedules || [];
                console.log('🔍 [HomeScreen] 추출된 일정 데이터:', schedules);
                setSchedulesData(schedules);
            } else {
                throw new Error(data.error || '일정 조회 실패');
            }
        } catch (err) {
            console.error('🔍 [HomeScreen] 수동 일정 조회 실패:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [myEmployeeId, visibleMonth]);
    
    // 컴포넌트 마운트 시 일정 조회
    useEffect(() => {
        fetchSchedules();
    }, [fetchSchedules]);
    
    // API 데이터를 달력 형식으로 변환
    const transformSchedulesData = (rawData) => {
        if (!rawData || !Array.isArray(rawData)) {
            return {
                appointments: [],
                markedDates: {},
                allEvents: {}
            };
        }
        
        // import한 함수들 사용
        const appointments = transformSchedulesToAppointments(rawData);
        const markedDates = transformSchedulesToMarkedDates(rawData);
        const allEvents = transformSchedulesToAllEvents(rawData);
        
        return {
            appointments,
            markedDates,
            allEvents
        };
    };
    
    // 달력에 필요한 데이터로 변환
    const transformedData = transformSchedulesData(schedulesData);
    const { appointments, markedDates, allEvents } = transformedData;
    
    // 변환된 데이터 디버깅
    console.log('🔍 [HomeScreen] 변환된 일정 데이터:', {
        appointmentsCount: appointments?.length || 0,
        markedDatesCount: Object.keys(markedDates || {}).length,
        allEventsCount: Object.keys(allEvents || {}).length,
        allEvents: allEvents,
        rawData: schedulesData
    });
    
    // Context에서 필요한 데이터
    const { 
        newPersonalSchedule, 
        updatedPersonalSchedule, 
        deletedPersonalSchedule,
        clearNewPersonalSchedule,
        clearUpdatedPersonalSchedule,
        clearDeletedPersonalSchedule
    } = useSchedule();
    
    const { hasNewMission } = useMission();
    const { points } = usePoints();
    
    // 🚨 중요: resetToDefault 파라미터 처리
    useEffect(() => {
        if (route?.params?.resetToDefault) {
            console.log('🔄 [HomeScreen] resetToDefault 파라미터 감지 - 홈 화면 상태 초기화');
            setModalData({ visible: false, events: [] });
            route.params.resetToDefault = undefined;
        }
    }, [route?.params?.resetToDefault]);
    
    // 🚨 중요: openMissionModal 파라미터 처리
    useEffect(() => {
        if (route?.params?.openMissionModal) {
            console.log('🎯 [HomeScreen] openMissionModal 파라미터 감지 - 미션 모달 열기');
            setMissionModalVisible(true);
            route.params.openMissionModal = undefined;
        }
    }, [route?.params?.openMissionModal]);
    
    // 모달 상태 변화에 따른 애니메이션 값 관리
    useEffect(() => {
        if (modalData.visible) {
            // 모달이 열릴 때 애니메이션 값 초기화
            translateY.value = 0;
            modalScale.value = 1;
        } else {
            // 모달이 닫힐 때 애니메이션 값 초기화 (약간의 지연 후)
            setTimeout(() => {
                translateY.value = 0;
                modalScale.value = 1;
            }, 100);
        }
    }, [modalData.visible, translateY, modalScale]);
    
    // visibleMonth 안전성 보장
    useEffect(() => {
        if (!visibleMonth || !(visibleMonth instanceof Date) || isNaN(visibleMonth.getTime())) {
            console.warn('⚠️ [HomeScreen] visibleMonth가 유효하지 않음, 기본값으로 재설정');
            setVisibleMonth(new Date());
        }
    }, [visibleMonth]);
    
    // 달력 월 변경 감지
    const handleMonthChange = useCallback((month) => {
        try {
            if (month && month.timestamp) {
        const newMonth = new Date(month.timestamp);
                if (!isNaN(newMonth.getTime())) {
        setVisibleMonth(newMonth);
        console.log('🔍 [홈탭] 월 변경 감지:', newMonth.toISOString().split('T')[0]);
                } else {
                    console.warn('⚠️ [HomeScreen] 유효하지 않은 timestamp:', month.timestamp);
                }
            } else {
                console.warn('⚠️ [HomeScreen] month 객체가 유효하지 않음:', month);
            }
        } catch (error) {
            console.error('❌ [HomeScreen] handleMonthChange 오류:', error);
        }
    }, []);
    
    // 일정 상세 모달 열기
    const handleDatePress = useCallback((day) => {
        const dateString = day.dateString;
        const dayEvents = allEvents[dateString] || [];
        
        if (dayEvents.length > 0) {
            // 일정이 있는 경우 상세 모달 표시
            setModalData({ visible: true, events: dayEvents, date: dateString });
        } else {
            // 일정이 없는 경우 날짜별 점심약속 만들기 모달 표시
            setSelectedDateForModal(dateString);
            setDateScheduleModalVisible(true);
        }
    }, [allEvents]);
    
    // 새 일정 생성 화면으로 이동
    const handleCreateSchedule = useCallback(() => {
        navigation.navigate('CreatePersonalSchedule');
    }, [navigation]);
    
    // 랜덤 런치 시작
    const handleMatchPress = useCallback(() => {
        try {
            navigation.navigate('파티', { screen: 'RandomLunch' });
        } catch (error) {
            console.warn('❌ 랜덤런치 화면 이동 실패:', error);
            // fallback으로 파티 탭으로 이동
            navigation.navigate('파티');
        }
    }, [navigation]);
    
    // 새로고침
    const handleRefresh = useCallback(() => {
        fetchSchedules();
        console.log('🔍 [홈탭] 수동 새로고침 실행');
    }, [fetchSchedules]);
    
    // 일정 편집
    const handleEditPersonalSchedule = useCallback((event, editMode = 'single') => {
        setModalData({ visible: false, events: [] });
        try {
            navigation.navigate('파티', { 
                screen: 'EditPersonalSchedule', 
                params: { 
                    schedule: event, 
                    editMode: editMode 
                }
            });
        } catch (error) {
            console.warn('❌ 일정 편집 화면 이동 실패:', error);
            // fallback으로 파티 탭으로 이동
            navigation.navigate('파티');
        }
    }, [navigation]);
    
    // 일정 삭제
    const handleDeletePersonalSchedule = useCallback((scheduleId, eventData = null, deleteMode = 'single') => {
        // 일정 삭제 로직은 Context에서 처리
        console.log('🗑️ [홈탭] 일정 삭제 요청:', scheduleId, deleteMode);
    }, []);
    
    // 에러 처리
    useEffect(() => {
        if (error) {
            console.error('❌ [홈탭] 일정 조회 오류:', error);
            Alert.alert(
                '오류',
                '일정을 불러오는 중 오류가 발생했습니다.',
                [
                    { text: '취소', style: 'cancel' },
                    { text: '다시 시도', onPress: handleRefresh }
                ]
            );
        }
    }, [error, handleRefresh]);
    
    // 화면 포커스 시 자동 새로고침
    useFocusEffect(
        useCallback(() => {
            console.log('🔍 [홈탭] 화면 포커스 - 자동 새로고침');
            fetchSchedules();
        }, [fetchSchedules])
    );
    
    // 한국어 날짜 문자열로 변환 (예: "29일(금)")
    const toKoreanDateString = (dateString) => {
        const date = new Date(dateString);
        const day = date.getDate();
        const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
        const weekday = weekdays[date.getDay()];
        return `${day}일(${weekday})`;
    };

    // 평일 날짜 배열을 생성 (주말 제외)
    const generateWeekDates = () => {
        const dates = [];
        
        // 오늘 날짜를 올바르게 가져오기
        let todayDate;
        if (todayString) {
            // todayString이 문자열인 경우
            todayDate = new Date(todayString);
        } else {
            // fallback: 로컬 함수 사용
            todayDate = getKoreanToday();
        }
        
        // 날짜가 유효한지 확인
        if (isNaN(todayDate.getTime())) {
            console.warn('⚠️ [HomeScreen] 유효하지 않은 날짜, 현재 시간 사용');
            todayDate = new Date();
        }
        
        console.log('🔍 [HomeScreen] generateWeekDates 시작:', {
            todayString,
            todayDate: todayDate.toISOString().split('T')[0],
            dayOfWeek: todayDate.getDay()
        });
        
        let currentDate = new Date(todayDate);
        let count = 0;
        
        // 최대 7일까지 평일만 추가
        while (count < 7 && dates.length < 5) {
            const dayOfWeek = currentDate.getDay();
            // 토요일(6)과 일요일(0) 제외
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                const dateString = currentDate.toISOString().split('T')[0];
                dates.push(dateString);
                count++;
                console.log(`📅 [HomeScreen] 평일 추가: ${dateString} (${['일', '월', '화', '수', '목', '금', '토'][dayOfWeek]})`);
            }
            // 다음 날로 이동
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        console.log('🔍 [HomeScreen] generateWeekDates 결과:', dates);
        return dates;
    };

    // 각 날짜에 대한 일정 데이터를 가져오거나 빈 배열 반환
    const getAppointmentsForDate = (dateString) => {
        return allEvents[dateString] || [];
    };

    // 일주일간의 일정 데이터를 생성
    const generateWeekAppointments = () => {
        const weekDates = generateWeekDates();
        return weekDates.map(date => ({
            date,
            appointments: getAppointmentsForDate(date)
        }));
    };

    // 각 일정 아이템을 렌더링하는 함수
    const renderAppointmentItem = ({ date, appointments }) => {
        const dateAppointments = appointments.map((event, index) => ({
            ...event,
            date: date // 각 이벤트에 날짜 추가
        }));

        return (
            <TouchableOpacity 
                style={styles.appointmentItem}
                onPress={() => {
                    // 날짜 클릭 시 해당 날짜의 일정 상태에 따라 모달 표시
                    if (appointments.length > 0) {
                        // 일정이 있는 경우 상세 모달 표시
                        setModalData({ visible: true, events: dateAppointments, date: date });
                    } else {
                        // 일정이 없는 경우 생성 옵션 모달 표시
                        setModalData({ visible: true, events: [], date: date });
                    }
                }}
                activeOpacity={0.8}
            >
                {/* 날짜 헤더 */}
                <View style={styles.modernAppointmentDateHeader}>
                    <View style={styles.dateInfoContainer}>
                        <Text style={[styles.modernAppointmentDate, { color: currentColors.text }]}>
                            {toKoreanDateString(date)}
                        </Text>
                        <Text style={[styles.dateSubtext, { color: currentColors.textSecondary }]}>
                            {new Date(date).toLocaleDateString('ko-KR', { month: 'long' })} 
                        </Text>
                    </View>
                    {dateAppointments.length > 0 && (
                        <View style={[styles.modernAppointmentCountBadge, { backgroundColor: currentColors.primary }]}>
                            <Text style={[styles.modernAppointmentCountText, { color: '#FFFFFF' }]}>
                                {dateAppointments.length}
                            </Text>
                        </View>
                    )}
                </View>

                {/* 일정 내용 */}
                {dateAppointments.length > 0 ? (
                    <View style={styles.appointmentContent}>
                        {dateAppointments.slice(0, 2).map((appointment, index) => (
                            <View key={index} style={[styles.modernEventItem, { 
                                backgroundColor: currentColors.surface,
                                borderColor: 'rgba(59, 130, 246, 0.1)'
                            }]}>
                                {/* 일정 헤더 */}
                                <View style={styles.eventHeader}>
                                    <View style={styles.eventTitleContainer}>
                                        <Text style={[styles.modernEventTitle, { color: currentColors.text }]} numberOfLines={1}>
                                            {appointment.title || appointment.name}
                                        </Text>
                                        {appointment.isRecurring && (
                                            <View style={[styles.modernRecurringBadge, { backgroundColor: currentColors.primary + '15' }]}>
                                                <Ionicons name="repeat" size={10} color={currentColors.primary} />
                                            </View>
                                        )}
                                    </View>
                                    <View style={[styles.eventTypeIndicator, { 
                                        backgroundColor: appointment.type === 'party' ? currentColors.secondary + '20' : currentColors.primary + '20'
                                    }]}>
                                        <Ionicons 
                                            name={appointment.type === 'party' ? 'people' : 'person'} 
                                            size={12} 
                                            color={appointment.type === 'party' ? currentColors.secondary : currentColors.primary} 
                                        />
                                    </View>
                                </View>

                                {/* 일정 상세 정보 */}
                                <View style={styles.modernEventDetails}>
                                    {appointment.time && (
                                        <View style={styles.modernEventDetailRow}>
                                            <View style={[styles.detailIconContainer, { backgroundColor: currentColors.primary + '10' }]}>
                                                <Ionicons name="time" size={12} color={currentColors.primary} />
                                            </View>
                                            <Text style={[styles.modernEventDetailText, { color: currentColors.textSecondary }]} numberOfLines={1}>
                                                {appointment.time}
                                            </Text>
                                        </View>
                                    )}
                                    {appointment.restaurant && (
                                        <View style={styles.modernEventDetailRow}>
                                            <View style={[styles.detailIconContainer, { backgroundColor: currentColors.secondary + '10' }]}>
                                                <Ionicons name="restaurant" size={12} color={currentColors.secondary} />
                                            </View>
                                            <Text style={[styles.modernEventDetailText, { color: currentColors.textSecondary }]} numberOfLines={1}>
                                                {appointment.restaurant}
                                            </Text>
                                        </View>
                                    )}
                                    {appointment.participants && appointment.participants.length > 0 && (
                                        <View style={styles.modernEventDetailRow}>
                                            <View style={[styles.detailIconContainer, { backgroundColor: currentColors.accent + '10' }]}>
                                                <Ionicons name="people" size={12} color={currentColors.accent} />
                                            </View>
                                            <Text style={[styles.modernEventDetailText, { color: currentColors.textSecondary }]} numberOfLines={1}>
                                                {appointment.participants.length}명 참여
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        ))}
                        {dateAppointments.length > 2 && (
                            <TouchableOpacity style={[styles.modernMoreEventsIndicator, { 
                                backgroundColor: currentColors.background,
                                borderColor: 'rgba(59, 130, 246, 0.1)'
                            }]}>
                                <View style={[styles.moreEventsIconContainer, { backgroundColor: currentColors.primary + '10' }]}>
                                    <Ionicons name="add" size={16} color={currentColors.primary} />
                                </View>
                                <Text style={[styles.modernMoreEventsText, { color: currentColors.primary }]}>
                                    +{dateAppointments.length - 2}개 더보기
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ) : (
                    <View style={styles.modernEmptyAppointments}>
                        <View style={[styles.modernEmptyIconContainer, { backgroundColor: currentColors.primary + '08' }]}>
                            <Ionicons name="calendar-outline" size={28} color={currentColors.primary} />
                        </View>
                        <Text style={[styles.modernEmptyAppointmentsText, { color: currentColors.text }]}>
                            일정이 없어요
                        </Text>
                        <Text style={[styles.modernEmptyAppointmentsSubtext, { color: currentColors.textSecondary }]}>
                            터치해서 추가해보세요
                        </Text>
                        <View style={[styles.addHintContainer, { backgroundColor: currentColors.primary + '05' }]}>
                            <Ionicons name="add-circle-outline" size={16} color={currentColors.primary} />
                            <Text style={[styles.addHintText, { color: currentColors.primary }]}>
                                새 일정 만들기
                            </Text>
                        </View>
                    </View>
                )}
            </TouchableOpacity>
        );
    };
    
    return (
        <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background }]}>
            
            {/* 로딩 상태 - 초기 로딩만 표시 */}
            {isLoading && !schedulesData && (
                <View style={styles.loadingContainer}>
                    <Text style={[styles.loadingText, { color: currentColors.text }]}>
                        일정을 불러오는 중...
                    </Text>
                </View>
            )}
            
            <ScrollView style={[styles.scrollView, { backgroundColor: currentColors.background }]} showsVerticalScrollIndicator={false}>
                {/* 오늘의 구내식당 메뉴 카드 */}
                <View style={[styles.card, { 
                    backgroundColor: currentColors.surface,
                    shadowColor: currentColors.primary,
                    borderColor: 'rgba(59, 130, 246, 0.1)'
                }]}>
                    <Text style={[styles.cardTitle, { color: currentColors.text }]}>오늘의 구내식당 메뉴 🍱</Text>
                    <Text style={[styles.menuText, { color: currentColors.secondaryText }]}>
                        메뉴 정보가 없습니다.
                    </Text>
                </View>
                
                {/* 랜덤런치 카드 */}
                <TouchableOpacity 
                    style={[styles.randomLunchCard, { 
                        backgroundColor: currentColors.primary,
                        shadowColor: currentColors.primary
                    }]}
                    onPress={handleMatchPress}
                >
                    <View style={styles.randomLunchContent}>
                        <View style={styles.randomLunchTextContainer}>
                            <Text style={styles.randomLunchTitle}>랜덤 런치 🎲</Text>
                            <Text style={styles.randomLunchSubtitle}>새로운 동료와 점심 약속을 잡아보세요!</Text>
                        </View>
                        <Ionicons name="shuffle" size={28} color="#FFFFFF" />
                    </View>
                </TouchableOpacity>
                
                {/* 나의 점심 약속 카드 */}
                <View style={[styles.card, { 
                    backgroundColor: currentColors.surface,
                    shadowColor: currentColors.primary,
                    borderColor: 'rgba(59, 130, 246, 0.1)'
                }]}>
                    <Text style={[styles.cardTitle, { color: currentColors.text }]}>나의 점심 약속 🗓️</Text>
                    <FlatList 
                        data={generateWeekAppointments()} 
                        renderItem={({ item }) => renderAppointmentItem(item)} 
                        keyExtractor={(item, index) => `appointment-${index}`}
                        horizontal 
                        showsHorizontalScrollIndicator={false} 
                        contentContainerStyle={styles.appointmentListContainer}
                    />
                </View>
                
                {/* 달력 카드 */}
                <View style={[styles.card, { 
                    backgroundColor: currentColors.surface,
                    shadowColor: currentColors.primary,
                    borderColor: 'rgba(59, 130, 246, 0.1)'
                }]}>
                    <Text style={[styles.cardTitle, { color: currentColors.text }]}>달력 📅</Text>
                <Calendar
                    current={visibleMonth.toISOString().split('T')[0]}
                    onMonthChange={handleMonthChange}
                    onDayPress={handleDatePress}
                    markedDates={markedDates}
                    maxDate={new Date(Date.now() + 15 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                    markingType="multi-dot"
                    locale="ko"
                    firstDay={0}
                    hideExtraDays={false}
                        customHeader={({ month, addMonth }) => {
                            const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
                            
                            // month 객체 안전하게 처리
                            const monthText = (() => {
                                try {
                                    if (month && typeof month.toString === 'function') {
                                        return month.toString('yyyy년 M월');
                                    }
                                    // fallback: 현재 visibleMonth 사용
                                    if (visibleMonth) {
                                        const year = visibleMonth.getFullYear();
                                        const monthNum = visibleMonth.getMonth() + 1;
                                        return `${year}년 ${monthNum}월`;
                                    }
                                    // 최종 fallback
                                    return '2025년 8월';
                                } catch (error) {
                                    console.warn('⚠️ [HomeScreen] month.toString 오류, fallback 사용:', error);
                                    return '2025년 8월';
                                }
                            })();
                            
                            return (
                                <View>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                        <TouchableOpacity onPress={() => addMonth(-1)}>
                                            <Ionicons name="chevron-back" size={24} color={currentColors.primary} />
                                        </TouchableOpacity>
                                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: currentColors.text }}>
                                            {monthText}
                                        </Text>
                                        <TouchableOpacity onPress={() => addMonth(1)}>
                                            <Ionicons name="chevron-forward" size={24} color={currentColors.primary} />
                                        </TouchableOpacity>
                                    </View>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10 }}>
                                        {weekDays.map((day, index) => (
                                            <Text key={index} style={{ 
                                                width: 32, 
                                                textAlign: 'center', 
                                                fontSize: 13, 
                                                fontWeight: '600',
                                                color: currentColors.text 
                                            }}>
                                                {day}
                                            </Text>
                                        ))}
                                    </View>
                                </View>
                            );
                        }}
                    theme={{
                        backgroundColor: currentColors.surface,
                        calendarBackground: currentColors.surface,
                        textSectionTitleColor: currentColors.text,
                        selectedDayBackgroundColor: currentColors.primary,
                        selectedDayTextColor: currentColors.white,
                        todayTextColor: currentColors.primary,
                        dayTextColor: currentColors.text,
                        textDisabledColor: currentColors.lightGray,
                        dotColor: currentColors.primary,
                        selectedDotColor: currentColors.white,
                        arrowColor: currentColors.primary,
                        monthTextColor: currentColors.text,
                        indicatorColor: currentColors.primary,
                        textDayFontWeight: '300',
                        textMonthFontWeight: 'bold',
                        textDayHeaderFontWeight: '300',
                        textDayFontSize: 16,
                        textMonthFontSize: 16,
                        textDayHeaderFontSize: 13,
                        // 현재 월이 아닌 날짜들을 연하게 표시
                        textOutsideDaysColor: currentColors.textSecondary,
                        'stylesheet.calendar.header': { 
                            week: { 
                                marginTop: 0,
                                marginBottom: 0
                            }
                        },
                        'stylesheet.day.basic': {
                            base: {
                                width: 32,
                                height: 32,
                                alignItems: 'center',
                                justifyContent: 'center'
                            }
                        },
                        'stylesheet.day.single': {
                            base: {
                                width: 32,
                                height: 32,
                                alignItems: 'center',
                                justifyContent: 'center'
                            },
                            selected: {
                                backgroundColor: 'transparent',
                                borderRadius: 16,
                                borderWidth: 2,
                                borderColor: 'transparent'
                            }
                        }
                    }}
                />
            </View>
            </ScrollView>

            {/* 일정 상세 모달 */}
            <ScheduleDetailModal
                visible={modalData.visible && (modalData.events || []).length > 0}
                onClose={() => setModalData({ ...modalData, visible: false })}
                events={modalData.events || []}
                date={modalData.date}
                navigation={navigation}
                onEdit={handleEditPersonalSchedule}
                onDelete={handleDeletePersonalSchedule}
                onRefresh={fetchSchedules}
            />

            {/* 일정 생성 옵션 모달 */}
            <Modal 
                visible={modalData.visible && (!modalData.events || modalData.events.length === 0)} 
                transparent={true} 
                animationType="none" 
                onRequestClose={closeModal}
            >
                <Pressable style={styles.centeredView} onPress={closeModal}>
                    <GestureDetector gesture={gesture}>
                        <Animated.View style={[styles.modalView, { backgroundColor: currentColors.surface }, animatedModalStyle]}>
                            {/* 모달 헤더 - 제목만 */}
                            <View style={styles.modalHeader}>
                                <Text style={[styles.modalTitle, { color: currentColors.text }]}>점심 약속 만들기</Text>
                            </View>
                        {/* 옵션 그리드 컨테이너 */}
                        <View style={styles.appointmentOptionsGrid}>
                            {/* 랜덤 런치 */}
                            <TouchableOpacity 
                                style={[styles.modernOptionCard, { backgroundColor: '#FFD700' }]} 
                                onPress={() => { 
                                    closeModal(); 
                                    handleMatchPress(); 
                                }}
                                activeOpacity={0.8}
                            >
                                <View style={styles.optionIconContainer}>
                                    <Text style={styles.optionIcon}>🎲</Text>
                                </View>
                                <View style={styles.optionTextContainer}>
                                    <Text style={styles.modernOptionTitle}>랜덤 런치</Text>
                                    <Text style={styles.modernOptionSubtitle}>AI가 추천하는 동료와 함께</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="white" />
                            </TouchableOpacity>
                            
                            {/* 그룹 파티 */}
                            <TouchableOpacity 
                                style={[styles.modernOptionCard, { backgroundColor: '#3B82F6' }]} 
                                onPress={() => { 
                                    closeModal(); 
                                    
                                    // global.newParty 안전하게 정의
                                    if (!global.newParty) {
                                        global.newParty = {};
                                    }
                                    
                                    if (modalData.date) {
                                        global.newParty = {
                                            ...global.newParty,
                                            selectedDate: modalData.date,
                                            isFromHomeTab: true
                                        };
                                        console.log('✅ [홈탭] 새파티만들기 - 선택된 날짜 설정:', modalData.date);
                                    }
                                    
                                    try {
                                        console.log('🚀 [홈탭] 새파티만들기 화면으로 이동 시도');
                                        navigation.navigate('파티', { screen: 'CreateParty' });
                                        console.log('✅ [홈탭] 새파티만들기 화면으로 이동 성공');
                                    } catch (error) {
                                        console.warn('❌ [홈탭] 새파티만들기 화면 이동 실패:', error);
                                        // fallback으로 파티 탭으로 이동
                                        navigation.navigate('파티');
                                    }
                                }}
                                activeOpacity={0.8}
                            >
                                <View style={styles.optionIconContainer}>
                                    <Text style={styles.optionIcon}>🎉</Text>
                                </View>
                                <View style={styles.optionTextContainer}>
                                    <Text style={styles.modernOptionTitle}>그룹 파티</Text>
                                    <Text style={styles.modernOptionSubtitle}>가고 싶은 맛집에 그룹 사냥</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="white" />
                            </TouchableOpacity>
                            
                            {/* 스마트 일정 조율 */}
                            <TouchableOpacity 
                                style={[styles.modernOptionCard, { backgroundColor: '#10B981' }]} 
                                onPress={() => { 
                                    closeModal(); 
                                    try {
                                        navigation.navigate('소통', { 
                                            screen: 'VotingScreen', 
                                            params: {
                                                chatRoomId: -1,
                                                chatTitle: '',
                                                participants: [{ 
                                                    employee_id: myEmployeeId, 
                                                    nickname: '나' 
                                                }]
                                            }
                                        });
                                    } catch (error) {
                                        console.warn('❌ 스마트 일정 조율 화면 이동 실패:', error);
                                        navigation.navigate('소통');
                                    }
                                }}
                                activeOpacity={0.8}
                            >
                                <View style={styles.optionIconContainer}>
                                    <Text style={styles.optionIcon}>🗳️</Text>
                                </View>
                                <View style={styles.optionTextContainer}>
                                    <Text style={styles.modernOptionTitle}>스마트 일정 조율</Text>
                                    <Text style={styles.modernOptionSubtitle}>약속이 없는 일정만 골라서</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="white" />
                            </TouchableOpacity>
                            
                            {/* 기타 일정 */}
                        <TouchableOpacity 
                                style={[styles.modernOptionCard, { backgroundColor: '#666666' }]} 
                                onPress={() => { 
                                    const dateToUse = modalData.date || toLocalDateString(getKoreanToday());
                                    closeModal(); 
                                    
                                    console.log('🚀 [홈탭] 기타 일정 추가 화면으로 이동 시도');
                                    console.log('📅 선택된 날짜:', dateToUse);
                                    
                                    try {
                                        // 직접 CreatePersonalSchedule 화면으로 이동
                                        navigation.navigate('CreatePersonalSchedule', { 
                                            date: dateToUse 
                                        });
                                        console.log('✅ [홈탭] 기타 일정 추가 화면으로 이동 성공');
                                    } catch (error) {
                                        console.warn('❌ [홈탭] CreatePersonalSchedule 화면 이동 실패:', error);
                                        
                                        // 실패 시 파티 탭을 거쳐서 이동 시도
                                        try {
                                            navigation.navigate('파티');
                                            setTimeout(() => {
                                                navigation.navigate('CreatePersonalSchedule', { 
                                                    date: dateToUse 
                                                });
                                            }, 100);
                                        } catch (fallbackError) {
                                            console.error('❌ [홈탭] 폴백 네비게이션도 실패:', fallbackError);
                                        }
                                    }
                                }}
                                activeOpacity={0.8}
                            >
                                <View style={styles.optionIconContainer}>
                                    <Text style={styles.optionIcon}>📝</Text>
                                </View>
                                <View style={styles.optionTextContainer}>
                                    <Text style={styles.modernOptionTitle}>기타 일정</Text>
                                    <Text style={styles.modernOptionSubtitle}>나만의 일정 만들기</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="white" />
                        </TouchableOpacity>
                    </View>
                    </Animated.View>
                </GestureDetector>
                </Pressable>
            </Modal>
            
            {/* 플로팅 빠른 액션 버튼 */}
            <TouchableOpacity 
                style={[styles.floatingButton, { 
                    backgroundColor: currentColors.primary,
                    shadowColor: currentColors.primary
                }]}
                activeOpacity={0.85}
                onPress={() => {
                    const todayString = toLocalDateString(getKoreanToday());
                    console.log('🚀 [홈탭] 점심 약속 만들기 모달 표시');
                    console.log('📅 선택된 날짜:', todayString);
                    setModalData({ visible: true, events: [], date: todayString });
                }}
            >
                <Ionicons name="add" size={32} color="#fff" />
            </TouchableOpacity>
            
            {/* 미션 모달 */}
            <MissionModal 
                visible={missionModalVisible}
                onClose={() => setMissionModalVisible(false)}
                navigation={navigation}
                onMissionUpdate={() => {
                    // 미션 수령 후 즉시 헤더의 빨간 점 상태 갱신
                }}
            />
            
            {/* 날짜별 점심약속 만들기 모달 */}
            <DateScheduleModal
                visible={dateScheduleModalVisible}
                onClose={() => setDateScheduleModalVisible(false)}
                selectedDate={selectedDateForModal}
                navigation={navigation}
                currentColors={currentColors}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    refreshButton: {
        padding: 8,
    },
    loadingContainer: {
        padding: 20,
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        fontWeight: '500',
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    card: {
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.1)',
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 12,
        letterSpacing: 0.5,
    },
    menuText: {
        fontSize: 16,
        lineHeight: 22,
        color: '#666666',
    },
    randomLunchCard: {
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.1)',
    },
    randomLunchContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    randomLunchTextContainer: {
        flex: 1,
        marginRight: 10,
    },
    randomLunchTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    randomLunchSubtitle: {
        fontSize: 16,
        color: '#FFFFFF',
        marginTop: 12,
        opacity: 0.9,
        lineHeight: 18,
    },
    appointmentItem: {
        marginRight: 10,
    },
    appointmentDate: {
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 0,
        color: '#1D5D9B',
        letterSpacing: 0.5,
    },
    // 새로운 모던 날짜 헤더 스타일들
    modernAppointmentDateHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(59, 130, 246, 0.08)',
    },
    dateInfoContainer: {
        flex: 1,
    },
    modernAppointmentDate: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 0.3,
        marginBottom: 2,
    },
    dateSubtext: {
        fontSize: 12,
        fontWeight: '500',
        opacity: 0.8,
    },
    modernAppointmentCountBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    modernAppointmentCountText: {
        fontSize: 13,
        fontWeight: '700',
    },
    eventItem: {
        padding: 16,
        borderRadius: 14,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
    },
    eventTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 8,
        letterSpacing: 0.2,
    },
    recurringBadge: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 12,
        backgroundColor: 'rgba(0, 122, 255, 0.1)',
        marginTop: 8,
    },
    recurringText: {
        fontSize: 11,
        fontWeight: '600',
        marginLeft: 4,
        letterSpacing: 0.2,
    },
    // 새로운 모던 스타일들
    modernEventItem: {
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
    },
    eventHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    eventTitleContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 8,
    },
    modernEventTitle: {
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: 0.2,
        flex: 1,
    },
    modernRecurringBadge: {
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 6,
    },
    eventTypeIndicator: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modernEventDetails: {
        gap: 8,
    },
    modernEventDetailRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailIconContainer: {
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    modernEventDetailText: {
        fontSize: 13,
        fontWeight: '500',
        flex: 1,
    },
    modernMoreEventsIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginTop: 4,
    },
    moreEventsIconContainer: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    modernMoreEventsText: {
        fontSize: 13,
        fontWeight: '600',
    },
    emptyAppointments: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    emptyAppointmentsText: {
        fontSize: 15,
        textAlign: 'center',
        color: '#666666',
        fontWeight: '600',
        marginTop: 8,
        marginBottom: 4,
        letterSpacing: 0.2,
    },
    // 새로운 모던 빈 상태 스타일들
    modernEmptyAppointments: {
        paddingVertical: 20,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 120,
    },
    modernEmptyIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    modernEmptyAppointmentsText: {
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 4,
        letterSpacing: 0.2,
    },
    modernEmptyAppointmentsSubtext: {
        fontSize: 13,
        textAlign: 'center',
        marginBottom: 12,
        opacity: 0.8,
    },
    addHintContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 4,
    },
    addHintText: {
        fontSize: 12,
        fontWeight: '500',
    },
     appointmentListContainer: {
         paddingVertical: 5,
     },
         appointmentItem: {
        width: 220,
        marginRight: 16,
        padding: 20,
        backgroundColor: 'rgba(59, 130, 246, 0.03)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.08)',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
    },
     centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    modalView: {
        width: '85%',
        maxWidth: 400,
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
        // 슬라이드 애니메이션을 위한 추가 스타일
        transform: [{ translateY: 0 }],
    },
    modalHeader: {
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        marginBottom: 24,
        paddingTop: 8,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '700',
        textAlign: 'center',
        lineHeight: 28,
        color: '#000000',
    },

    appointmentOptionsContainer: {
        width: '100%',
        gap: 12,
    },
    appointmentOptionButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 18,
        paddingHorizontal: 20,
        borderRadius: 12,
        marginBottom: 0,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.08,
        shadowRadius: 4,
    },
    optionContent: {
        flex: 1,
        marginRight: 16,
    },
    optionTitle: {
        fontSize: 17,
        fontWeight: '600',
        marginBottom: 4,
    },
    optionSubtitle: {
        fontSize: 14,
        marginTop: 0,
        opacity: 0.9,
        lineHeight: 18,
    },
    // 앱 스타일과 통일된 옵션 카드 스타일
    appointmentOptionsGrid: {
        width: '100%',
        flexDirection: 'column',
        gap: 12,
    },
    modernOptionCard: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderRadius: 16,
        marginBottom: 0,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },
    optionIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    optionIcon: {
        fontSize: 20,
        textAlign: 'center',
    },
    modernOptionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
        textAlign: 'left',
        color: 'white',
    },
    modernOptionSubtitle: {
        fontSize: 14,
        textAlign: 'left',
        lineHeight: 18,
        color: 'rgba(255, 255, 255, 0.8)',
    },
    optionTextContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    floatingButton: {
        position: 'absolute',
        bottom: 30,
        right: 30,
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#3B82F6',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.25,
        shadowRadius: 12,
    },
});
