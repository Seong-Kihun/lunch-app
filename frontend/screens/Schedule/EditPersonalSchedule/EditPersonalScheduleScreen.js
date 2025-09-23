import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Modal,
    Alert,
    SafeAreaView,
    StyleSheet,
    Switch,
    FlatList,
    Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import DateTimePicker from '@react-native-community/datetimepicker';

// 공통 요소들 import
import COLORS from '../../../components/common/Colors';
import { RENDER_SERVER_URL, getMyEmployeeId, toKoreanDateString, toLocalDateString, getKoreanToday } from '../../../components/common/Utils';
import basicStyles from '../../../components/common/BasicStyles';
import FormComponents, {
    FormSection,
    FormInput,
    FormSelect,
    FormButton,
    AISuggestionButton,
    SuggestionsList,
    DatePickerModal,
    TimePickerModal,
    CategorySelector,
    EndDateSelectionModal
} from '../../../components/common/FormComponents';
import createFormStyles from '../../../components/common/FormStyles';
import { generateAITitles, addRandomEmojis } from '../../../utils/AITitleGenerator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSchedule } from '../../../contexts/ScheduleContext';
import { useUpdateSchedule, useCreateSchedule } from '../../../hooks/useScheduleQuery';

export default function EditPersonalScheduleScreen({ navigation, route }) {
    const { schedule, editMode = 'single' } = route.params || {};
    const currentColors = global.currentColors || COLORS.light;
    const myEmployeeId = getMyEmployeeId();
    const styles = createFormStyles(currentColors);
    
    // Context 사용을 위한 useSchedule 훅 추가
    const { setUpdatedPersonalScheduleData } = useSchedule();
    
    // 일정 수정을 위한 훅
    const updateScheduleMutation = useUpdateSchedule();
    const createScheduleMutation = useCreateSchedule();
    
    // 상태 변수들 (기존 일정 데이터로 초기화)
    const [title, setTitle] = useState(schedule?.title || '');
    const [restaurant, setRestaurant] = useState(schedule?.restaurant || '');
    const [selectedDate, setSelectedDate] = useState(() => {
        if (schedule?.date) {
            const parsedDate = new Date(schedule.date);
            if (!isNaN(parsedDate.getTime())) {
                return parsedDate;
            }
        }
        if (schedule?.schedule_date) {
            const parsedDate = new Date(schedule.schedule_date);
            if (!isNaN(parsedDate.getTime())) {
                return parsedDate;
            }
        }
        // 기본값으로 오늘 날짜 사용
        const today = getKoreanToday();
        return today;
    });
    const [time, setTime] = useState(schedule?.time || '11:30');
    const [location, setLocation] = useState(schedule?.location || '');
    const [selectedAttendees, setSelectedAttendees] = useState(schedule?.attendees || []);
    const [description, setDescription] = useState(schedule?.description || '');
    const [isDateModalVisible, setDateModalVisible] = useState(false);
    const [isTimeModalVisible, setTimeModalVisible] = useState(false);
    const [showAttendeesModal, setShowAttendeesModal] = useState(false);
    const [suggestedTitles, setSuggestedTitles] = useState([]);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const [isLoading, setIsLoading] = useState(false); // 일정 수정 로딩 상태
    const [restaurantSuggestions, setRestaurantSuggestions] = useState([]);
    
    // 식당 선택 관련 상태들
    const [showRestaurantModal, setShowRestaurantModal] = useState(false);
    const [restaurantSearchQuery, setRestaurantSearchQuery] = useState('');
    const [frequentRestaurants, setFrequentRestaurants] = useState([]);
    const [selectedQuickRestaurant, setSelectedQuickRestaurant] = useState(null);

    const [selectedCategory, setSelectedCategory] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState(null);

    const [sortBy, setSortBy] = useState('name'); // 'name', 'distance', 'rating'
    const [searchCache, setSearchCache] = useState(new Map()); // 검색 결과 캐싱
    const [showFilterModal, setShowFilterModal] = useState(false);
    
    // 무한 스크롤 관련 상태들
    const [allRestaurants, setAllRestaurants] = useState([]); // 전체 검색 결과
    const [displayedRestaurants, setDisplayedRestaurants] = useState([]); // 화면에 표시할 식당들
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const ITEMS_PER_PAGE = 50; // 한 번에 보여줄 아이템 수
    
    // 참석자 선택 관련 상태들
    const [friends, setFriends] = useState([]);
    const [frequentFriends, setFrequentFriends] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoadingFriends, setIsLoadingFriends] = useState(false);
    const [friendsError, setFriendsError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    
    // 반복 설정 관련 상태들 (editMode에 따라 조건부 표시)
    const [showRecurrenceOptions, setShowRecurrenceOptions] = useState(false);
    const [isRecurring, setIsRecurring] = useState(schedule?.isRecurring || false);
    const [recurrenceType, setRecurrenceType] = useState(schedule?.recurrenceType || 'weekly');
    const [recurrenceInterval, setRecurrenceInterval] = useState(schedule?.recurrenceInterval || 1);
    const [endType, setEndType] = useState(schedule?.endType || 'never');
    const [endDate, setEndDate] = useState(schedule?.endDate ? new Date(schedule.endDate) : null);
    const [showEndDateModal, setShowEndDateModal] = useState(false);
    const [showLocationModal, setShowLocationModal] = useState(false);
    
    // ref 정의
    const locationInputRef = useRef(null);
    
    // route.params에서 showAttendeesModal이 true로 설정되어 있으면 참석자 선택 모달 자동 열기
    useEffect(() => {
        if (route.params?.showAttendeesModal) {
            setShowAttendeesModal(true);
            // route.params 초기화
            navigation.setParams({ showAttendeesModal: undefined });
        }
    }, [route.params?.showAttendeesModal, navigation]);
    
    // 🚨 중요: 프로필 화면에서 돌아왔을 때 데이터 복원
    useEffect(() => {
        // route.params에서 scheduleData가 있으면 데이터 복원
        if (route.params?.scheduleData) {
            const { 
                title: savedTitle, 
                restaurant: savedRestaurant, 
                selectedDate: savedSelectedDate, 
                time: savedTime, 
                location: savedLocation, 
                selectedAttendees: savedSelectedAttendees, 
                description: savedDescription 
            } = route.params.scheduleData;
            
            // 저장된 데이터로 상태 복원
            if (savedTitle) setTitle(savedTitle);
            if (savedRestaurant) setRestaurant(savedRestaurant);
            if (savedSelectedDate) {
                const parsedDate = new Date(savedSelectedDate);
                if (!isNaN(parsedDate.getTime())) {
                    setSelectedDate(parsedDate);
                }
            }
            if (savedTime) setTime(savedTime);
            if (savedLocation) setLocation(savedLocation);
            if (savedSelectedAttendees && savedSelectedAttendees.length > 0) {
                setSelectedAttendees(savedSelectedAttendees);
            }
            if (savedDescription) setDescription(savedDescription);
            
            // 데이터 복원 후 route.params 초기화
            navigation.setParams({ scheduleData: undefined });
        }
    }, [route.params?.scheduleData, navigation]);

    // 🚨 중요: 화면이 포커스될 때마다 저장된 데이터 복원 (더 안정적인 방법)
    useFocusEffect(
        useCallback(() => {
            const restoreScheduleData = async () => {
                try {
                    const savedData = await AsyncStorage.getItem('tempScheduleData');
                    if (savedData) {
                        const parsedData = JSON.parse(savedData);
                        const { 
                            title: savedTitle, 
                            restaurant: savedRestaurant, 
                            selectedDate: savedSelectedDate, 
                            time: savedTime, 
                            location: savedLocation, 
                            selectedAttendees: savedSelectedAttendees, 
                            description: savedDescription 
                        } = parsedData;
                        
                        // 저장된 데이터로 상태 복원
                        if (savedTitle) setTitle(savedTitle);
                        if (savedRestaurant) setRestaurant(savedRestaurant);
                        if (savedSelectedDate) {
                            const parsedDate = new Date(savedSelectedDate);
                            if (!isNaN(parsedDate.getTime())) {
                                setSelectedDate(parsedDate);
                            }
                        }
                        if (savedTime) setTime(savedTime);
                        if (savedLocation) setLocation(savedLocation);
                        if (savedSelectedAttendees && savedSelectedAttendees.length > 0) {
                            setSelectedAttendees(savedSelectedAttendees);
                        }
                        if (savedDescription) setDescription(savedDescription);
                        
                        // 복원 후 저장된 데이터 삭제
                        await AsyncStorage.removeItem('tempScheduleData');
                        
                        // 참석자 선택 모달 자동으로 열기
                        setShowAttendeesModal(true);
                    }
                } catch (error) {
                    console.log('데이터 복원 중 오류:', error);
                }
            };
            
            restoreScheduleData();
        }, [])
    );
    
    // isEndDateModalVisible 제거 (더 이상 사용하지 않음)

    // endDate 상태 변경 핸들러 추가
    const handleEndDateChange = (newEndDate) => {
        setEndDate(newEndDate);
    };

    // 기본 프로필 정보 가져오기
    const getMyProfile = (searchQuery = '') => {
        if (searchQuery.trim()) {
            // 검색어가 있으면 검색어 기반으로 프로필 생성 (고유 ID 생성)
            return {
                employee_id: `direct_input_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                nickname: searchQuery.trim(),
                department: '직접 입력'
            };
        } else {
            // 검색어가 없으면 기본 프로필
            return {
                employee_id: myEmployeeId,
                nickname: global.myNickname || '나',
                department: global.myDepartment || '내 부서'
            };
        }
    };

    // 거리 계산 함수
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        // 입력값 검증
        if (!lat1 || !lon1 || !lat2 || !lon2) {
            return 0;
        }
        
        const R = 6371; // 지구의 반지름 (km)
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        
        return distance;
    };

    // 식당 실제 평점 데이터 가져오기
    const getRestaurantRating = async (restaurantId) => {
        try {
            const storedReviews = await AsyncStorage.getItem(`reviews_${restaurantId}`);
            if (storedReviews) {
                const parsedReviews = JSON.parse(storedReviews);
                if (parsedReviews.length > 0) {
                    const averageRating = (parsedReviews.reduce((sum, review) => sum + review.rating, 0) / parsedReviews.length);
                    return {
                        rating: averageRating.toFixed(1),
                        reviewCount: parsedReviews.length
                    };
                }
            }
            return { rating: '0.0', reviewCount: 0 };
        } catch (error) {
            console.error('평점 데이터 조회 오류:', error);
            return { rating: '0.0', reviewCount: 0 };
        }
    };

    // 일정 수정 핸들러
    const handleUpdate = async () => {
        if (!title.trim() || !selectedDate) {
            Alert.alert('입력 오류', '제목과 날짜를 모두 입력해주세요.');
            return;
        }

        try {
            setIsLoading(true);
            
            // 🚨 디버깅: 수정 전 데이터 로그
            const originalDate = schedule?.date || schedule?.schedule_date;
            const newDate = selectedDate.toISOString().split('T')[0];
            
            console.log('🔍 [EditPersonalSchedule] 수정 전 일정 데이터:', {
                scheduleId: schedule?.id,
                originalDate,
                newDate,
                editMode,
                isRecurring: schedule?.isRecurring,
                scheduleKeys: Object.keys(schedule || {}),
                scheduleDate: schedule?.date,
                scheduleScheduleDate: schedule?.schedule_date
            });

            if (editMode === 'single' && schedule.isRecurring) {
                // "이 날짜만 수정" 모드이고 반복일정인 경우
                // 새로운 일정을 생성하여 해당 날짜에만 적용 (반복 설정 포함)
                const newScheduleData = {
                    title: title.trim(),
                    date: selectedDate.toISOString().split('T')[0], // YYYY-MM-DD 형식
                    time: time,
                    restaurant: restaurant.trim(),
                    location: location.trim(),
                    description: description.trim(),
                    attendees: selectedAttendees.map(attendee => ({
                        employee_id: attendee.employee_id,
                        id: attendee.employee_id,
                        name: attendee.name,
                        nickname: attendee.nickname || attendee.name,
                        profile_image: attendee.profile_image
                    })),
                    // 반복 설정 사용 (사용자가 설정한 대로)
                    isRecurring: isRecurring,
                    recurrenceType: isRecurring ? recurrenceType : null,
                    recurrenceInterval: isRecurring ? recurrenceInterval : null,
                    endType: isRecurring ? endType : null,
                    endDate: isRecurring && endDate ? endDate.toISOString().split('T')[0] : null,
                    // 원본 반복 일정과의 연결 정보
                    originalRecurringScheduleId: schedule.id,
                    isException: true, // 반복 일정의 예외 사항임을 표시
                    createdBy: global.myEmployeeId,
                    createdAt: new Date().toISOString()
                };

                // 🚨 중요: 실제 백엔드 API 호출 (새 일정 생성)
                console.log('🔍 [EditPersonalSchedule] 백엔드 API 생성 호출 시작 (single mode)');
                
                // 백엔드로 전송할 데이터 준비
                const backendCreateData = {
                    employee_id: myEmployeeId,
                    title: title.trim(),
                    start_date: selectedDate.toISOString().split('T')[0],
                    time: time,
                    restaurant: restaurant.trim(),
                    location: location.trim(),
                    description: description.trim(),
                    is_recurring: isRecurring,
                    recurrence_type: isRecurring ? recurrenceType : null,
                    recurrence_interval: isRecurring ? recurrenceInterval : 1,
                    recurrence_end_date: isRecurring && endDate ? endDate.toISOString().split('T')[0] : null,
                    created_by: myEmployeeId
                };
                
                console.log('🔍 [EditPersonalSchedule] 백엔드로 전송할 데이터 (single mode):', backendCreateData);
                
                // useCreateSchedule 훅을 사용한 API 호출
                const result = await createScheduleMutation.mutateAsync(backendCreateData);
                
                console.log('✅ [EditPersonalSchedule] 백엔드 일정 생성 성공 (single mode):', result);

                // 수정된 일정 정보를 Context에 저장하여 홈탭에서 새로고침
                const updateData = {
                    originalDate: originalDate,
                    newDate: newDate,
                    schedule: newScheduleData,
                    timestamp: Date.now()
                };
                
                setUpdatedPersonalScheduleData(updateData);
                
                // 🚨 디버깅: 전역 변수 설정 로그
                console.log('🔍 [EditPersonalSchedule] 전역 변수 설정 (single mode):', updateData);
                console.log('🔍 [EditPersonalSchedule] global.updatedPersonalSchedule 확인:', global.updatedPersonalSchedule);
                
                // 🚨 디버깅: 전역 변수 설정 직후 확인
                setTimeout(() => {
                    console.log('🔍 [EditPersonalSchedule] 1초 후 전역 변수 확인:', global.updatedPersonalSchedule);
                }, 1000);

                Alert.alert('성공', '해당 날짜의 일정이 수정되었습니다.', [
                    {
                        text: '확인',
                        onPress: () => {
                            // 🚨 디버깅: 전역 변수 설정 후 홈탭으로 강제 이동
                            console.log('🔍 [EditPersonalSchedule] 성공 후 홈탭으로 이동');
                            console.log('🔍 [EditPersonalSchedule] 전역 변수 설정 상태:', {
                                updatedPersonalSchedule: !!global.updatedPersonalSchedule,
                                forceRefreshHome: global.forceRefreshHome,
                                forceRefreshTimestamp: global.forceRefreshTimestamp
                            });
                            
                            // 홈탭으로 이동 후 강제 새로고침을 위한 플래그 설정
                            global.forceRefreshHome = true;
                            global.forceRefreshTimestamp = Date.now();
                            
                            console.log('🔍 [EditPersonalSchedule] 강제 새로고침 플래그 설정 완료');
                            
                            // 홈탭으로 이동하기 전에 잠시 대기하여 전역 변수가 설정되도록 함
                            setTimeout(() => {
                                console.log('🔍 [EditPersonalSchedule] 홈탭으로 이동 시작');
                            navigation.navigate('홈');
                            }, 100);
                        }
                    }
                ]);

            } else {
                // 일반 수정 또는 전체 반복 일정 수정
                const updatedScheduleData = {
                    id: schedule.id, // 기존 ID 유지
                    title: title.trim(),
                    // 🚨 중요: 전체 반복 일정 수정 시에는 원본 날짜 유지, 일반 수정 시에만 새 날짜 사용
                    date: editMode === 'recurring_all' 
                        ? (schedule?.date || schedule?.schedule_date) // 원본 날짜 유지
                        : selectedDate.toISOString().split('T')[0], // 새 날짜 사용
                    time: time,
                    restaurant: restaurant.trim(),
                    location: location.trim(),
                    description: description.trim(),
                    attendees: selectedAttendees.map(attendee => ({
                        employee_id: attendee.employee_id,
                        id: attendee.employee_id,
                        name: attendee.name,
                        nickname: attendee.nickname || attendee.name,
                        profile_image: attendee.profile_image
                    })),
                    // 반복 설정 (모든 모드에서 사용 가능)
                    isRecurring: isRecurring,
                    recurrenceType: isRecurring ? recurrenceType : null,
                    recurrenceInterval: isRecurring ? recurrenceInterval : null,
                    endType: isRecurring ? endType : null,
                    endDate: isRecurring && endDate ? endDate.toISOString().split('T')[0] : null,
                    createdBy: global.myEmployeeId,
                    createdAt: new Date().toISOString()
                };

                // 🚨 중요: 실제 백엔드 API 호출
                console.log('🔍 [EditPersonalSchedule] 백엔드 API 수정 호출 시작:', schedule.id);
                
                // master_schedule_id 사용 (백엔드에서 숫자 ID를 기대함)
                const numericScheduleId = schedule.master_schedule_id || 
                    (schedule.id ? parseInt(schedule.id.toString().replace(/\D/g, '')) : null) || 
                    schedule.id;
                
                console.log('🔍 [EditPersonalSchedule] ID 변환 정보:', {
                    originalId: schedule.id,
                    masterScheduleId: schedule.master_schedule_id,
                    numericScheduleId: numericScheduleId
                });
                
                // ID가 유효하지 않은 경우 오류 처리
                if (!numericScheduleId) {
                    console.error('❌ [EditPersonalSchedule] 유효한 일정 ID를 찾을 수 없습니다:', {
                        scheduleId: schedule.id,
                        masterScheduleId: schedule.master_schedule_id,
                        numericScheduleId: numericScheduleId
                    });
                    Alert.alert('오류', '일정 ID를 찾을 수 없습니다. 다시 시도해주세요.');
                    return;
                }
                
                // 백엔드로 전송할 데이터 준비
                const backendUpdateData = {
                    title: title.trim(),
                    start_date: selectedDate.toISOString().split('T')[0],
                    time: time,
                    restaurant: restaurant.trim(),
                    location: location.trim(),
                    description: description.trim(),
                    is_recurring: isRecurring,
                    recurrence_type: isRecurring ? recurrenceType : null,
                    recurrence_interval: isRecurring ? recurrenceInterval : 1,
                    recurrence_end_date: isRecurring && endDate ? endDate.toISOString().split('T')[0] : null,
                    created_by: myEmployeeId,
                    attendees: selectedAttendees.map(attendee => attendee.employee_id || attendee.id)
                };
                
                console.log('🔍 [EditPersonalSchedule] 백엔드로 전송할 데이터:', backendUpdateData);
                
                // useUpdateSchedule 훅을 사용한 API 호출
                await updateScheduleMutation.mutateAsync({
                    scheduleId: numericScheduleId,
                    updateData: backendUpdateData
                });
                
                console.log('✅ [EditPersonalSchedule] 백엔드 일정 수정 성공');

                const successMessage = editMode === 'recurring_all' 
                    ? '모든 반복 일정이 수정되었습니다.' 
                    : '일정이 수정되었습니다.';

                // 수정된 일정 정보를 전역 변수에 저장하여 홈탭에서 새로고침
                const updateData = {
                    originalDate: originalDate,
                    // 🚨 중요: 전체 반복 일정 수정 시에는 새로 선택한 날짜를 newDate로 설정
                    newDate: editMode === 'recurring_all' 
                        ? selectedDate.toISOString().split('T')[0] // 새로 선택한 날짜
                        : newDate, // 일반 수정 시 새 날짜
                    schedule: updatedScheduleData,
                    timestamp: Date.now(),
                    editMode: editMode // 수정 모드 정보 추가
                };
                
                setUpdatedPersonalScheduleData(updateData);
                
                // 🚨 디버깅: Context 상태 업데이트 로그
                console.log('🔍 [EditPersonalSchedule] Context 상태 업데이트 (recurring mode):', updateData);
                console.log('🔍 [EditPersonalSchedule] editMode 확인:', editMode);
                console.log('🔍 [EditPersonalSchedule] 수정된 일정 데이터:', {
                    id: updatedScheduleData.id || updatedScheduleData._id,
                    title: updatedScheduleData.title,
                    restaurant: updatedScheduleData.restaurant,
                    time: updatedScheduleData.time,
                    location: updatedScheduleData.location,
                    description: updatedScheduleData.description
                });
                
                // 🚨 디버깅: Context 상태 업데이트 확인
                setTimeout(() => {
                    console.log('🔍 [EditPersonalSchedule] 1초 후 Context 상태 확인 완료');
                }, 1000);

                Alert.alert('성공', successMessage, [
                    {
                        text: '확인',
                        onPress: () => {
                            // 🚨 디버깅: Context 상태 업데이트 후 홈탭으로 이동
                            console.log('🔍 [EditPersonalSchedule] 성공 후 홈탭으로 이동');
                            
                            console.log('🔍 [EditPersonalSchedule] Context 상태 업데이트 완료');
                            
                            // 홈탭으로 이동하기 전에 잠시 대기하여 전역 변수가 설정되도록 함
                            setTimeout(() => {
                                console.log('🔍 [EditPersonalSchedule] 홈탭으로 이동 시작');
                            navigation.navigate('홈');
                            }, 100);
                        }
                    }
                ]);
            }

        } catch (error) {
            console.error('일정 수정 오류:', error);
            Alert.alert('오류', '일정 수정에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setIsLoading(false);
        }
    };

    // 취소 핸들러
    const handleCancel = () => {
        navigation.goBack();
    };

    // 날짜 선택 핸들러
    const handleDateSelect = (date) => {
        setSelectedDate(date);
        setDateModalVisible(false);
    };

    // 시간 선택 핸들러
    const handleTimeSelect = (time) => {
        const hours = time.getHours().toString().padStart(2, '0');
        const minutes = time.getMinutes().toString().padStart(2, '0');
        setTime(`${hours}:${minutes}`);
        setTimeModalVisible(false);
    };

    // 참석자 추가/제거
    const addAttendee = (friend) => {
        const isAlreadyAdded = selectedAttendees.some(a => a.employee_id === friend.employee_id);
        if (!isAlreadyAdded) {
            setSelectedAttendees(prev => [...prev, friend]);
        }
    };

    const removeAttendee = (employeeId) => {
        setSelectedAttendees(prev => prev.filter(a => a.employee_id !== employeeId));
    };

    // AI 제안 제목 생성
    const generateTitleSuggestions = useCallback(async () => {
        if (!restaurant.trim()) {
            Alert.alert(
                'AI 제목 추천', 
                '식당 이름을 먼저 입력하시면\nAI가 맞춤형 제목을 추천해드려요! 🍽️✨'
            );
            return;
        }

        if (isLoadingSuggestions) {
            return;
        }

        if (suggestedTitles.length > 0) {
            setSuggestedTitles([]);
            return;
        }

        setIsLoadingSuggestions(true);
        
        try {
            const context = {
                restaurant: restaurant.trim(),
                date: selectedDate,
                time: time.trim(),
                attendees: selectedAttendees || [],
                description: description.trim(),
                scheduleType: '기타 일정'
            };

            const aiTitles = generateAITitles(context);
            const titlesWithEmojis = addRandomEmojis(aiTitles);
            const safeTitles = titlesWithEmojis
                .filter(title => title && typeof title === 'string' && title.trim().length > 0)
                .map(title => String(title).trim());
            
            setSuggestedTitles(safeTitles);
            
        } catch (error) {
            console.error('AI 제목 생성 오류:', error);
            setSuggestedTitles(['AI 제목 생성에 실패했습니다.']);
        } finally {
            setIsLoadingSuggestions(false);
        }
    }, [restaurant, selectedDate, time, selectedAttendees, description, suggestedTitles, isLoadingSuggestions]);

    // 제안 제목 선택 핸들러
    const handleTitleSuggestion = (suggestion) => {
        setTitle(suggestion);
        setSuggestedTitles([]);
    };

    // 자주 사용하는 만남 장소 목록
    const frequentLocations = [
        '구내식당 앞',
        '본관 1층 로비',
        '글로벌인재관 1층 로비', 
        '연수센터 1층',
        '정문',
        '후문',
    ];

    // 자주 사용하는 장소 선택 핸들러
    const handleLocationSelect = (selectedLocation) => {
        setLocation(selectedLocation);
    };

    // 자주 가는 식당 가져오기
    const fetchFrequentRestaurants = useCallback(async () => {
        try {
            const storedRestaurants = await AsyncStorage.getItem('frequentRestaurants');
            if (storedRestaurants) {
                const parsed = JSON.parse(storedRestaurants);
                setFrequentRestaurants(parsed);
            }
        } catch (error) {
            console.error('자주 가는 식당 로드 오류:', error);
        }
    }, []);

    // 식당 검색 함수
    const searchRestaurants = useCallback(async (query) => {
        if (!query.trim()) {
            setRestaurantSuggestions([]);
            setAllRestaurants([]);
            setDisplayedRestaurants([]);
            setTotalCount(0);
            setSearchError(null);
            return;
        }

        try {
            setIsSearching(true);
            setSearchError(null);
            
            const url = `${RENDER_SERVER_URL}/restaurants?query=${encodeURIComponent(query)}`;
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                let restaurants = [];
                
                if (data.restaurants && Array.isArray(data.restaurants)) {
                    restaurants = data.restaurants;
                } else if (Array.isArray(data)) {
                    restaurants = data;
                } else if (data.data && Array.isArray(data.data)) {
                    restaurants = data.data;
                }
                
                // 전체 데이터 저장
                setAllRestaurants(restaurants);
                setTotalCount(restaurants.length);
                
                // 첫 페이지 데이터 설정
                const firstPageData = restaurants.slice(0, ITEMS_PER_PAGE);
                setDisplayedRestaurants(firstPageData);
                setRestaurantSuggestions(firstPageData);
                
                // 더보기 가능 여부 설정
                setHasMore(restaurants.length > ITEMS_PER_PAGE);
                setCurrentPage(1);
            } else {
                setRestaurantSuggestions([]);
                setAllRestaurants([]);
                setDisplayedRestaurants([]);
                setTotalCount(0);
                setSearchError('검색에 실패했습니다.');
            }
        } catch (error) {
            console.error('식당 검색 오류:', error);
            setRestaurantSuggestions([]);
            setAllRestaurants([]);
            setDisplayedRestaurants([]);
            setTotalCount(0);
            setSearchError('네트워크 오류가 발생했습니다.');
        } finally {
            setIsSearching(false);
        }
    }, []);

    // 식당 선택 핸들러 (검색 결과에서 선택)
    const handleRestaurantSelect = (selectedRestaurant) => {
        setRestaurant(selectedRestaurant.name);
        setShowRestaurantModal(false);
        
        // 검색 관련 상태 초기화
        setRestaurantSearchQuery('');
        setRestaurantSuggestions([]);
        setAllRestaurants([]);
        setDisplayedRestaurants([]);
        setTotalCount(0);
        setSelectedCategory(null);
        setSortBy('name');
        setSearchError(null);
        setSelectedQuickRestaurant(null); // 선택된 자주가는 식당 초기화
    };

    // 자주가는 식당 버튼 핸들러 (검색창에 입력하여 검색)
    const handleQuickRestaurantSelect = (restaurantName) => {
        if (restaurantName) {
            // 이전 검색 결과 완전 초기화
            setAllRestaurants([]);
            setDisplayedRestaurants([]);
            setTotalCount(0);
            setRestaurantSuggestions([]);
            setSearchError(null);
            setSelectedCategory(null); // 카테고리 필터도 초기화
            setSortBy('name'); // 정렬도 초기화
            setCurrentPage(1);
            setHasMore(false);
            // 검색창에 입력
            setRestaurantSearchQuery(restaurantName);
            // 선택된 자주가는 식당 설정
            setSelectedQuickRestaurant(restaurantName);
            // 검색 실행
            searchRestaurants(restaurantName);
        }
    };

    // 더보기 로딩 함수
    const loadMoreRestaurants = useCallback(async () => {
        if (isLoadingMore || !hasMore) return;
        
        try {
            setIsLoadingMore(true);
            const nextPage = currentPage + 1;
            const startIndex = (nextPage - 1) * ITEMS_PER_PAGE;
            const endIndex = startIndex + ITEMS_PER_PAGE;
            
            const nextPageData = allRestaurants.slice(startIndex, endIndex);
            
            if (nextPageData.length > 0) {
                setDisplayedRestaurants(prev => [...prev, ...nextPageData]);
                setRestaurantSuggestions(prev => [...prev, ...nextPageData]);
                setCurrentPage(nextPage);
                setHasMore(endIndex < allRestaurants.length);
            } else {
                setHasMore(false);
            }
        } catch (error) {
            console.error('더보기 로딩 오류:', error);
        } finally {
            setIsLoadingMore(false);
        }
    }, [currentPage, hasMore, isLoadingMore, allRestaurants]);

    // 카테고리별 필터링 (전체 데이터 기반)
    const getFilteredRestaurants = useCallback((category) => {
        if (!category || !allRestaurants) {
            return allRestaurants;
        }
        
        const filtered = allRestaurants.filter(restaurant => restaurant.category === category);
        return filtered;
    }, [allRestaurants]);

    // 카테고리 선택 핸들러
    const handleCategorySelect = (category) => {
        if (selectedCategory === category) {
            setSelectedCategory(null); // 같은 카테고리 클릭 시 해제
        } else {
            setSelectedCategory(category);
        }
        
        // 카테고리 변경 시 필터링된 결과로 표시 업데이트
        if (allRestaurants.length > 0) {
            const filtered = getFilteredRestaurants(category);
            // 원본 데이터는 유지하고 표시만 필터링
            setDisplayedRestaurants(filtered);
            setRestaurantSuggestions(filtered);
            setTotalCount(filtered.length);
            setCurrentPage(1);
            setHasMore(false); // 필터링된 결과는 더보기 불필요
        }
    };

    // 정렬 변경 핸들러
    const handleSortChange = (newSortBy) => {
        if (sortBy === newSortBy) return;
        
        setSortBy(newSortBy);
        
        // 정렬 변경 시 데이터 재정렬
        if (allRestaurants.length > 0) {
            let sortedRestaurants = [...allRestaurants];
            
            switch (newSortBy) {
                case 'name':
                    sortedRestaurants.sort((a, b) => a.name.localeCompare(b.name));
                    break;
                case 'rating_desc':
                    sortedRestaurants.sort((a, b) => (b.actualRating || b.rating || 0) - (a.actualRating || a.rating || 0));
                    break;
                case 'reviews_desc':
                    sortedRestaurants.sort((a, b) => (b.actualReviewCount || 0) - (a.actualReviewCount || 0));
                    break;
                case 'recommend_desc':
                    sortedRestaurants.sort((a, b) => (b.recommendCount || 0) - (a.recommendCount || 0));
                    break;
                case 'distance':
                    sortedRestaurants.sort((a, b) => (a.calculatedDistance || a.distance || 0) - (b.calculatedDistance || b.distance || 0));
                    break;
                default:
                    break;
            }
            
            // 정렬된 결과로 업데이트
            setAllRestaurants(sortedRestaurants);
            setDisplayedRestaurants(sortedRestaurants.slice(0, ITEMS_PER_PAGE));
            setRestaurantSuggestions(sortedRestaurants.slice(0, ITEMS_PER_PAGE));
            setTotalCount(sortedRestaurants.length);
            setCurrentPage(1);
            setHasMore(sortedRestaurants.length > ITEMS_PER_PAGE);
        }
    };

    // 식당 모달이 열릴 때 자주 가는 식당 가져오기 및 데이터 동기화
    useEffect(() => {
        if (showRestaurantModal) {
            fetchFrequentRestaurants();
            // 검색 관련 상태 초기화
            setRestaurantSearchQuery('');
            setRestaurantSuggestions([]);
            setAllRestaurants([]);
            setDisplayedRestaurants([]);
            setTotalCount(0);
            setSelectedCategory(null);
            setSortBy('name');
            setSearchError(null);
            setSelectedQuickRestaurant(null);
            setCurrentPage(1);
            setHasMore(false);
        }
    }, [showRestaurantModal, fetchFrequentRestaurants]);

    // 검색 디바운싱
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (restaurantSearchQuery.trim()) {
                searchRestaurants(restaurantSearchQuery);
            } else {
                setAllRestaurants([]);
                setDisplayedRestaurants([]);
                setTotalCount(0);
                setRestaurantSuggestions([]);
                setSelectedQuickRestaurant(null); // 검색어가 없으면 선택된 자주가는 식당 초기화
                setSelectedCategory(null); // 카테고리 필터도 초기화
                setCurrentPage(1);
                setHasMore(false);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [restaurantSearchQuery, searchRestaurants]);

    // 친구 목록 가져오기
    const fetchFriends = useCallback(async () => {
        try {
            setIsLoadingFriends(true);
            setFriendsError(null);
            
            // 검색 시에는 전체 가상 유저를, 기본 표시 시에는 친구 관계만 가져오기
            try {
                if (searchQuery.trim()) {
                    // 검색 시: 전체 가상 유저 가져오기
                    const allUsersResponse = await fetch(`${RENDER_SERVER_URL}/dev/users`);
                    if (allUsersResponse.ok) {
                        const allUsers = await allUsersResponse.json();
                        setFriends(allUsers);
                    } else {
                        throw new Error('전체 유저 API 응답 오류');
                    }
                } else {
                    // 기본 표시 시: 친구 관계만 가져오기
                    const currentUserId = global.myEmployeeId || '1';
                    const friendsResponse = await fetch(`${RENDER_SERVER_URL}/dev/friends/${currentUserId}`);
                    
                    if (friendsResponse.ok) {
                        const friends = await friendsResponse.json();
                        setFriends(friends);
                    } else {
                        throw new Error('친구 관계 API 응답 오류');
                    }
                }
            } catch (error) {
                console.error('🔍 [참석자] API 호출 실패:', error);
                setFriends([]);
                setFriendsError('친구 목록을 불러올 수 없습니다.');
            }
        } catch (error) {
            console.error('친구 목록 조회 실패:', error);
            setFriendsError('친구 목록을 불러올 수 없습니다.');
        } finally {
            setIsLoadingFriends(false);
        }
    }, [searchQuery]);

    // 자주 만나는 친구 가져오기
    const fetchFrequentFriends = useCallback(async () => {
        try {
            // 실제 친구 목록에서 자주 만나는 친구 생성
            if (friends && friends.length > 0) {
                // 백엔드에서 점심 약속 히스토리를 가져와서 자주 만나는 친구 계산
                try {
                    const response = await fetch(`${RENDER_SERVER_URL}/dev/users/${global.myEmployeeId || '1'}/lunch-history`);
                    if (response.ok) {
                        const historyData = await response.json();
                        
                        // 점심 약속 히스토리에서 친구별 만남 횟수 계산
                        const friendMeetingCounts = {};
                        
                        if (historyData.lunch_history && Array.isArray(historyData.lunch_history)) {
                            historyData.lunch_history.forEach(meeting => {
                                if (meeting.attendees && Array.isArray(meeting.attendees)) {
                                    meeting.attendees.forEach(attendee => {
                                        if (attendee.employee_id !== (global.myEmployeeId || '1')) {
                                            friendMeetingCounts[attendee.employee_id] = (friendMeetingCounts[attendee.employee_id] || 0) + 1;
                                        }
                                    });
                                }
                            });
                        }
                        
                        // 만남 횟수 순으로 정렬하여 상위 5명 선택 (이미 선택된 참석자 제외)
                        const availableFriends = friends.filter(friend => 
                            !selectedAttendees.some(attendee => attendee.employee_id === friend.employee_id)
                        );
                        
                        const sortedFriends = availableFriends
                            .filter(friend => friendMeetingCounts[friend.employee_id])
                            .sort((a, b) => (friendMeetingCounts[b.employee_id] || 0) - (friendMeetingCounts[a.employee_id] || 0))
                            .slice(0, 5);
                        
                        // 히스토리가 없는 친구들은 랜덤하게 추가하여 최대 5명까지 채움
                        if (sortedFriends.length < 5) {
                            const remainingFriends = availableFriends.filter(friend => !friendMeetingCounts[friend.employee_id]);
                            const shuffledRemaining = remainingFriends.sort(() => Math.random() - 0.5);
                            const additionalFriends = shuffledRemaining.slice(0, 5 - sortedFriends.length);
                            sortedFriends.push(...additionalFriends);
                        }
                        
                        setFrequentFriends(sortedFriends);
                    } else {
                        // 히스토리 API가 실패하면 친구 목록에서 랜덤하게 선택
                        const availableFriends = friends.filter(friend => 
                            !selectedAttendees.some(attendee => attendee.employee_id === friend.employee_id)
                        );
                        
                        if (availableFriends.length > 0) {
                            const shuffledFriends = [...availableFriends].sort(() => Math.random() - 0.5);
                            const frequentFriendsData = shuffledFriends.slice(0, Math.min(5, availableFriends.length));
                            setFrequentFriends(frequentFriendsData);
                        } else {
                            setFrequentFriends([]);
                        }
                    }
                } catch (historyError) {
                    console.log('점심 약속 히스토리 조회 실패, 친구 목록에서 랜덤 선택:', historyError.message);
                    // 히스토리 조회 실패 시 친구 목록에서 랜덤하게 선택
                    const availableFriends = friends.filter(friend => 
                        !selectedAttendees.some(attendee => attendee.employee_id === friend.employee_id)
                    );
                    
                    if (availableFriends.length > 0) {
                        const shuffledFriends = [...availableFriends].sort(() => Math.random() - 0.5);
                        const frequentFriendsData = shuffledFriends.slice(0, Math.min(5, availableFriends.length));
                        setFrequentFriends(frequentFriendsData);
                    } else {
                        setFrequentFriends([]);
                    }
                }
            } else {
                setFrequentFriends([]);
            }
        } catch (error) {
            console.error('자주 만나는 친구 조회 실패:', error);
            setFrequentFriends([]);
        }
    }, [friends, selectedAttendees]);

    // 참석자 모달이 열릴 때 친구 목록 가져오기 (한 번만 실행)
    useEffect(() => {
            if (showAttendeesModal) {
                fetchFriends();
                // 자주 만나는 친구 데이터도 함께 가져오기
                fetchFrequentFriends();
            }
    }, [showAttendeesModal]);

    // 검색어 변경 시 친구 목록 새로고침
    useEffect(() => {
        if (showAttendeesModal && searchQuery.trim()) {
            fetchFriends();
        }
    }, [searchQuery, fetchFriends]);

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.formContainer}>
                {/* 수정 모드 안내 - 전체 반복 일정 수정 모드만 표시 */}
                

                {/* 제목 입력 */}
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: currentColors.surface,
                    borderWidth: 2,
                    borderColor: currentColors.lightGray,
                    borderRadius: 16,
                    minHeight: 56,
                    marginBottom: 12,
                }}>
                    <TextInput
                        style={{
                            backgroundColor: 'transparent',
                            borderWidth: 0,
                            flex: 1,
                            padding: 16,
                            fontSize: 16,
                            color: currentColors.text,
                            minHeight: 56,
                            paddingRight: 8
                        }}
                        value={title || ''}
                        onChangeText={(text) => setTitle(text ? String(text).trim() : '')}
                        placeholder="제목: AI 추천 제목을 확인해 보세요"
                        placeholderTextColor={currentColors.textSecondary}
                        returnKeyType="done"
                        onSubmitEditing={() => {
                            Keyboard.dismiss();
                        }}
                        blurOnSubmit={true}
                    />
                    <AISuggestionButton
                        onPress={generateTitleSuggestions}
                        loading={isLoadingSuggestions}
                        disabled={!restaurant.trim()}
                        style={{ marginRight: 16 }}
                    />
                </View>

                {/* AI 제안 제목 목록 */}
                {suggestedTitles && suggestedTitles.length > 0 && (
                    <View style={{ marginBottom: 12, marginTop: -10 }}>
                        <SuggestionsList
                            suggestions={suggestedTitles.filter(title => title && typeof title === 'string')}
                            onSelect={handleTitleSuggestion}
                            visible={suggestedTitles.length > 0}
                        />
                    </View>
                )}

                {/* 식당 입력 */}
                <TouchableOpacity 
                    style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: currentColors.surface,
                        borderWidth: 2,
                        borderColor: currentColors.lightGray,
                        borderRadius: 16,
                        padding: 16,
                        minHeight: 56,
                        marginBottom: 12,
                    }}
                    onPress={() => setShowRestaurantModal(true)}
                    activeOpacity={0.7}
                >
                    <Text style={restaurant ? { color: currentColors.text, fontSize: 16 } : { color: currentColors.textSecondary, fontSize: 16 }}>
                        {restaurant || '식당을 선택하거나 입력하세요 (선택)'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={currentColors.textSecondary} />
                </TouchableOpacity>

                {/* 날짜 선택 */}
                <TouchableOpacity 
                    style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: currentColors.surface,
                        borderWidth: 2,
                        borderColor: currentColors.lightGray,
                        borderRadius: 16,
                        padding: 16,
                        minHeight: 56,
                        marginBottom: 12,
                    }}
                    onPress={() => setDateModalVisible(true)}
                    activeOpacity={0.7}
                >
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: currentColors.text, fontSize: 16 }}>
                            {selectedDate.toISOString().split('T')[0].replace(/(\d{4})-(\d{2})-(\d{2})/, '$1년 $2월 $3일')} ({['일', '월', '화', '수', '목', '금', '토'][selectedDate.getDay()]})
                        </Text>
                        
                        {/* 반복 일정 정보를 날짜 바로 아래에 표시 (모든 모드에서 표시) */}
                        {isRecurring && (
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                marginTop: 2,
                                marginBottom: 0,
                            }}>
                                <Ionicons 
                                    name="repeat" 
                                    size={12}
                                    color={currentColors.primary} 
                                    style={{ marginRight: 3 }}
                                />
                                <Text style={{
                                    color: currentColors.primary,
                                    fontSize: 11,
                                    fontWeight: '600',
                                }}>
                                    {recurrenceInterval === 1 ? '매' : `${recurrenceInterval || 1}`}
                                    {recurrenceType === 'daily' ? '일' : 
                                     recurrenceType === 'weekly' ? '주' : '개월'}
                                     마다
                                    {endDate && endDate instanceof Date && !isNaN(endDate.getTime()) ? ` (${new Date(endDate.getTime() - 24 * 60 * 60 * 1000).toLocaleDateString('ko-KR')} 까지)` : ' (무기한)'}
                                </Text>
                            </View>
                        )}
                    </View>
                    <Ionicons name="calendar" size={20} color={currentColors.textSecondary} />
                </TouchableOpacity>

                {/* 시간 선택 */}
                <TouchableOpacity 
                    style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: currentColors.surface,
                        borderWidth: 2,
                        borderColor: currentColors.lightGray,
                        borderRadius: 16,
                        padding: 16,
                        minHeight: 56,
                        marginBottom: 12,
                    }}
                    onPress={() => setTimeModalVisible(true)}
                    activeOpacity={0.7}
                >
                    <Text style={time ? { color: currentColors.text, fontSize: 16 } : { color: currentColors.textSecondary, fontSize: 16 }}>
                        {time || '시간을 선택하세요'}
                    </Text>
                    <Ionicons name="time" size={20} color={currentColors.textSecondary} />
                </TouchableOpacity>

                {/* 장소 입력 */}
                <View style={{ marginBottom: 12 }}>
                    <TouchableOpacity
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: currentColors.surface,
                            borderWidth: 2,
                            borderColor: currentColors.lightGray,
                            borderRadius: 16,
                            minHeight: 56,
                        }}
                        onPress={() => {
                            if (showLocationModal) {
                                setShowLocationModal(false);
                                if (locationInputRef.current) {
                                    locationInputRef.current.blur();
                                }
                            } else {
                                setShowLocationModal(true);
                                setTimeout(() => {
                                    if (locationInputRef.current) {
                                        locationInputRef.current.focus();
                                    }
                                }, 100);
                            }
                        }}
                        activeOpacity={0.7}
                    >
                        <TextInput
                            ref={locationInputRef}
                            style={{
                                backgroundColor: 'transparent',
                                borderWidth: 0,
                                flex: 1,
                                padding: 16,
                                fontSize: 16,
                                color: currentColors.text,
                                minHeight: 56,
                                paddingRight: 8
                            }}
                            value={location}
                            onChangeText={setLocation}
                            placeholder="예: 본관 1층 로비 (선택)"
                            placeholderTextColor={currentColors.textSecondary}
                            editable={true}
                            onFocus={() => {
                                if (!showLocationModal) {
                                    setShowLocationModal(true);
                                }
                            }}
                        />
                        <Ionicons 
                            name={showLocationModal ? "chevron-up" : "chevron-down"} 
                            size={20} 
                            color={currentColors.textSecondary} 
                            style={{ marginRight: 16 }}
                        />
                    </TouchableOpacity>
                    
                    {/* 드롭다운 장소 목록 */}
                    {showLocationModal && (
                        <View style={{
                            backgroundColor: currentColors.surface,
                            borderWidth: 1,
                            borderColor: currentColors.lightGray,
                            borderRadius: 12,
                            marginTop: 4,
                            maxHeight: 200,
                            elevation: 3,
                            shadowColor: currentColors.primary,
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.1,
                            shadowRadius: 4
                        }}>
                            <ScrollView 
                                showsVerticalScrollIndicator={false}
                                nestedScrollEnabled={true}
                            >
                                {frequentLocations.map((loc, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={{
                                            paddingVertical: 12,
                                            paddingHorizontal: 16,
                                            borderBottomWidth: index < frequentLocations.length - 1 ? 1 : 0,
                                            borderBottomColor: currentColors.lightGray,
                                            backgroundColor: location === loc ? currentColors.primaryLight : 'transparent'
                                        }}
                                        onPress={() => {
                                            handleLocationSelect(loc);
                                            setShowLocationModal(false);
                                            if (locationInputRef.current) {
                                                locationInputRef.current.blur();
                                            }
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={{
                                            color: location === loc ? currentColors.primary : currentColors.text,
                                            fontSize: 14,
                                            fontWeight: location === loc ? '600' : '500'
                                        }}>
                                            {loc}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}
                </View>

                {/* 참석자 선택 */}
                <View style={{ marginBottom: 12 }}>
                    <TouchableOpacity 
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            backgroundColor: currentColors.surface,
                            borderWidth: 2,
                            borderColor: currentColors.lightGray,
                            borderRadius: 16,
                            padding: 16,
                            minHeight: 56,
                        }}
                        onPress={() => setShowAttendeesModal(true)}
                        activeOpacity={0.7}
                    >
                        <Text style={selectedAttendees.length > 0 ? { color: currentColors.text, fontSize: 16 } : { color: currentColors.textSecondary, fontSize: 16 }}>
                            {selectedAttendees.length > 0 
                                ? `${selectedAttendees.length}명 선택됨` 
                                : '참석자를 선택하세요 (선택)'}
                        </Text>
                        <Ionicons name="people" size={20} color={currentColors.textSecondary} />
                    </TouchableOpacity>
                    
                    {selectedAttendees.length > 0 && (
                        <View style={styles.selectedAttendees}>
                            {selectedAttendees.map((attendee, index) => (
                                <View key={index} style={{
                                    alignItems: 'center',
                                    marginRight: 8,
                                    minWidth: 50,
                                    position: 'relative'
                                }}>
                                    <View style={{
                                        width: 50,
                                        height: 50,
                                        borderRadius: 25,
                                        backgroundColor: currentColors.primaryLight,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        marginBottom: 6,
                                        elevation: 2,
                                        shadowColor: currentColors.primary,
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: 0.1,
                                        shadowRadius: 4
                                    }}>
                                        <Text style={{
                                            color: currentColors.primary,
                                            fontSize: 18,
                                            fontWeight: '600'
                                        }}>
                                            {attendee.nickname.charAt(0)}
                                        </Text>
                                    </View>
                                    
                                    {/* X 버튼 (선택 취소) */}
                                    <TouchableOpacity 
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            right: -2,
                                            width: 16,
                                            height: 16,
                                            borderRadius: 8,
                                            backgroundColor: currentColors.error || '#EF4444',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            elevation: 3,
                                            shadowColor: currentColors.error || '#EF4444',
                                            shadowOffset: { width: 0, height: 2 },
                                            shadowOpacity: 0.3,
                                            shadowRadius: 4
                                        }}
                                        onPress={() => removeAttendee(attendee.employee_id)}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons 
                                            name="close" 
                                            size={10} 
                                            color="#FFFFFF" 
                                        />
                                    </TouchableOpacity>
                                    
                                    <Text style={{
                                        fontSize: 12,
                                        color: currentColors.text,
                                        textAlign: 'center',
                                        fontWeight: '500'
                                    }}>
                                        {attendee.nickname}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                {/* 설명 입력 */}
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: currentColors.surface,
                    borderWidth: 2,
                    borderColor: currentColors.lightGray,
                    borderRadius: 16,
                    minHeight: 80,
                    marginBottom: 2,
                }}>
                    <TextInput
                        style={{
                            backgroundColor: 'transparent',
                            borderWidth: 0,
                            flex: 1,
                            padding: 12,
                            fontSize: 16,
                            color: currentColors.text,
                            minHeight: 80,
                            textAlignVertical: 'top',
                        }}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="일정에 대한 설명을 입력하세요 (선택)"
                        placeholderTextColor={currentColors.textSecondary}
                        multiline
                        numberOfLines={4}
                        returnKeyType="done"
                        onSubmitEditing={() => {
                            Keyboard.dismiss();
                        }}
                        blurOnSubmit={true}
                    />
                </View>

                {/* 버튼들 */}
                <View style={styles.buttonContainer}>
                    <FormButton
                        title={isLoading ? "일정 수정 중..." : 
                              editMode === 'single' && schedule.isRecurring ? "이 날짜만 수정하기" :
                              editMode === 'recurring_all' ? "모든 반복 일정 수정하기" : "일정 수정하기"}
                        onPress={handleUpdate}
                        variant="primary"
                        disabled={isLoading}
                    />
                    <FormButton
                        title="취소하기"
                        onPress={handleCancel}
                        variant="secondary"
                        disabled={isLoading}
                    />
                </View>
            </ScrollView>

            {/* 날짜 선택 모달 */}
            <DatePickerModal
                visible={isDateModalVisible}
                onClose={() => setDateModalVisible(false)}
                onDateSelect={handleDateSelect}
                selectedDate={selectedDate}
                minDate={new Date()}
                // 반복 설정 관련 props (모든 모드에서 활성화)
                isRecurring={isRecurring}
                onRecurringChange={setIsRecurring}
                recurrenceType={recurrenceType}
                onRecurrenceTypeChange={setRecurrenceType}
                recurrenceInterval={recurrenceInterval}
                onRecurrenceIntervalChange={setRecurrenceInterval}
                endDate={endDate}
                onEndDateChange={handleEndDateChange}
                onEndDateSelect={() => {}}
                onOpenEndDateModal={() => setShowEndDateModal(true)}
            />

            {/* 시간 선택 모달 */}
            <TimePickerModal
                visible={isTimeModalVisible}
                onClose={() => setTimeModalVisible(false)}
                onTimeSelect={handleTimeSelect}
                selectedTime={new Date(`2000-01-01T${time}:00`)}
            />

            {/* 식당 선택 모달 */}
            <Modal
                visible={showRestaurantModal}
                transparent
                animationType="none"
                onRequestClose={() => setShowRestaurantModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContainer, { maxHeight: '85%', minHeight: '60%' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>식당 선택</Text>
                            <TouchableOpacity onPress={() => setShowRestaurantModal(false)}>
                                <Ionicons name="close" size={24} color={currentColors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        
                        {/* 검색 입력창 */}
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                value={restaurantSearchQuery}
                                onChangeText={setRestaurantSearchQuery}
                                placeholder="식당명을 검색하세요"
                                placeholderTextColor={currentColors.textSecondary}
                                returnKeyType="done"
                                onSubmitEditing={() => {
                                    Keyboard.dismiss();
                                }}
                                blurOnSubmit={true}
                            />
                            <View style={styles.searchIconsContainer}>
                                <TouchableOpacity
                                    style={styles.filterButton}
                                    onPress={() => {
                                        // 1. 식당 선택 창 닫기
                                        setShowRestaurantModal(false);
                                        // 2. 즉시 필터 팝업 열기
                                        setShowFilterModal(true);
                                    }}
                                >
                                    <Ionicons name="filter" size={20} color={currentColors.primary} />
                                </TouchableOpacity>

                                <Ionicons name="search" size={20} color={currentColors.textSecondary} style={{ marginRight: 16 }} />
                            </View>
                        </View>

                        {/* 자주 가는 식당 - 간단한 버튼 형식 */}
                        <View style={[styles.quickRestaurantsContainer, { marginTop: 8, marginBottom: 8 }]}>
                            <ScrollView 
                                horizontal 
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.quickRestaurantsScroll}
                            >
                                {/* 구내식당 버튼 */}
                                <TouchableOpacity
                                    style={[
                                        styles.quickRestaurantButton, 
                                        selectedQuickRestaurant === '구내식당' && styles.quickRestaurantButtonActive
                                    ]}
                                    onPress={() => handleQuickRestaurantSelect('구내식당')}
                                >
                                    <Ionicons 
                                        name="business" 
                                        size={16} 
                                        color={selectedQuickRestaurant === '구내식당' ? '#FFFFFF' : currentColors.primary} 
                                    />
                                    <Text style={[
                                        styles.quickRestaurantText, 
                                        selectedQuickRestaurant === '구내식당' && styles.quickRestaurantTextActive
                                    ]}>
                                        구내식당
                                    </Text>
                                </TouchableOpacity>

                                {/* 자주 가는 식당들 */}
                                {frequentRestaurants.slice(0, 9).map((restaurantItem) => (
                                    <TouchableOpacity
                                        key={restaurantItem.id}
                                        style={[
                                            styles.quickRestaurantButton,
                                            selectedQuickRestaurant === restaurantItem.name && styles.quickRestaurantButtonActive
                                        ]}
                                        onPress={() => handleQuickRestaurantSelect(restaurantItem.name)}
                                    >
                                        <Text style={[
                                            styles.quickRestaurantText,
                                            selectedQuickRestaurant === restaurantItem.name && styles.quickRestaurantTextActive
                                        ]}>
                                            {restaurantItem.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        {/* 검색 결과 */}
                        {restaurantSearchQuery.trim() && (
                            <View style={styles.suggestionsContainer}>
                                <Text style={styles.suggestionsTitle}>
                                    검색 결과 {selectedCategory && `(${selectedCategory})`} 
                                    ({restaurantSuggestions.length}개) • {sortBy === 'name' ? '이름순' : 
                                     sortBy === 'rating_desc' ? '평점순' : 
                                     sortBy === 'reviews_desc' ? '리뷰순' : 
                                     sortBy === 'recommend_desc' ? '오찬추천순' : '거리순'}
                                </Text>
                                
                                {/* 로딩 상태 */}
                                {isSearching && (
                                    <View style={styles.loadingContainer}>
                                        <Text style={[styles.suggestionText, { color: currentColors.textSecondary }]}>
                                            검색 중...
                                        </Text>
                                    </View>
                                )}

                                {/* 에러 상태 */}
                                {searchError && (
                                    <View style={styles.errorContainer}>
                                        <Text style={styles.errorText}>{searchError}</Text>
                                    </View>
                                )}
                        
                                {/* 검색 결과 */}
                                {!isSearching && !searchError && restaurantSearchQuery.trim() && restaurantSuggestions.length > 0 && (
                                    <View style={styles.searchResultsContainer}>
                                        <FlatList
                                            data={restaurantSuggestions}
                                            keyExtractor={(item) => item.id.toString()}
                                            renderItem={({ item }) => (
                                                <TouchableOpacity
                                                    style={styles.suggestionItem}
                                                    onPress={() => handleRestaurantSelect(item)}
                                                >
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.suggestionText}>{item.name}</Text>
                                                        <Text style={[styles.suggestionText, { fontSize: 12, color: currentColors.textSecondary }]}>
                                                            {item.category || '카테고리 없음'} • ⭐ {item.actualRating || item.rating || '0.0'}{(item.actualReviewCount && item.actualReviewCount > 0) ? ` (${item.actualReviewCount})` : ''} • {item.calculatedDistance || item.distance || '0.0'}km
                                                        </Text>
                                                    </View>
                                                    <TouchableOpacity
                                                        style={styles.infoButton}
                                                        onPress={() => {
                                                            // 1. 식당 선택 팝업 닫기
                                                            setShowRestaurantModal(false);
                                                            
                                                            // 2. 맛집탭의 RestaurantDetail로 이동
                                                            navigation.navigate('맛집', {
                                                                screen: 'RestaurantDetail',
                                                                params: {
                                                                    restaurant: item,
                                                                    fromPersonalSchedule: true,
                                                                    personalScheduleParams: {
                                                                        date: selectedDate,
                                                                        time: time,
                                                                        description: description,
                                                                        selectedAttendees: selectedAttendees,
                                                                        // 검색 관련 상태도 전달
                                                                        searchQuery: restaurantSearchQuery,
                                                                        selectedCategory: selectedCategory,
                                                                        sortBy: sortBy,
                                                                        restaurantSuggestions: restaurantSuggestions
                                                                    }
                                                                }
                                                            });
                                                        }}
                                                    >
                                                        <Ionicons name="information-circle-outline" size={20} color={currentColors.primary} />
                                                    </TouchableOpacity>
                                                </TouchableOpacity>
                                            )}
                                            showsVerticalScrollIndicator={false}
                                            contentContainerStyle={styles.searchResultsContent}
                                            style={styles.searchResultsFlatList}
                                            onEndReached={loadMoreRestaurants}
                                            onEndReachedThreshold={0.1}
                                            ListFooterComponent={() => (
                                                hasMore ? (
                                                    <TouchableOpacity
                                                        style={styles.loadMoreButton}
                                                        onPress={loadMoreRestaurants}
                                                        disabled={isLoadingMore}
                                                    >
                                                        <Text style={[styles.loadMoreText, { color: currentColors.primary }]}>
                                                            {isLoadingMore ? '로딩 중...' : '더보기'}
                                                        </Text>
                                                    </TouchableOpacity>
                                                ) : null
                                            )}
                                        />
                                    </View>
                                )}
                        
                                {/* 검색 결과 없음 */}
                                {!isSearching && !searchError && restaurantSearchQuery.trim() && restaurantSuggestions.length === 0 && (
                                    <View style={{ padding: 16, alignItems: 'center' }}>
                                        <Text style={[styles.suggestionText, { color: currentColors.textSecondary }]}>
                                            "{restaurantSearchQuery}" 검색 결과가 없습니다
                                        </Text>
                                        <Text style={[styles.suggestionText, { fontSize: 12, color: currentColors.textSecondary, marginTop: 4 }]}>
                                            직접 입력하기를 이용해 보세요
                                        </Text>
                                        <Text style={[styles.suggestionText, { fontSize: 12, color: currentColors.textSecondary, marginTop: 8 }]}>
                                            검색어를 확인하거나 다른 키워드로 시도해보세요
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}
                        
                        {/* 수동 입력 - 검색어가 있을 때만 표시 */}
                        {restaurantSearchQuery.trim() && (
                            <TouchableOpacity
                                style={{
                                    backgroundColor: '#3B82F6',
                                    borderRadius: 12,
                                    paddingVertical: 14,
                                    alignItems: 'center',
                                    marginTop: 16,
                                    elevation: 1,
                                    shadowColor: '#3B82F6',
                                    shadowOffset: { width: 0, height: 1 },
                                    shadowOpacity: 0.1,
                                    shadowRadius: 2
                                }}
                                onPress={() => {
                                    // 검색한 식당 이름이 있으면 기타 일정 수정 화면의 식당 입력 칸에 자동 입력
                                    if (restaurantSearchQuery.trim()) {
                                        setRestaurant(restaurantSearchQuery.trim());
                                    }
                                    // 식당 선택 팝업 닫기
                                    setShowRestaurantModal(false);
                                    // 검색 관련 상태 초기화
                                    setRestaurantSearchQuery('');
                                    setRestaurantSuggestions([]);
                                    setSelectedCategory(null);
                                    setSortBy('name');
                                }}
                                activeOpacity={0.7}
                            >
                                <Text style={{
                                    color: '#FFFFFF',
                                    fontSize: 16,
                                    fontWeight: 'bold'
                                }}>{`"${restaurantSearchQuery}" 직접 입력하기`}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </Modal>

            {/* 참석자 선택 모달 */}
            <Modal
                visible={showAttendeesModal}
                transparent
                animationType="none"
                onRequestClose={() => setShowAttendeesModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContainer, { maxHeight: '90%', minHeight: '60%' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                참석자 선택
                                {selectedAttendees.length > 0 && (
                                    <Text style={{ 
                                        color: currentColors.textSecondary,
                                        fontSize: 16,
                                        fontWeight: '400'
                                    }}>
                                        {' '}({selectedAttendees.length}명)
                                    </Text>
                                )}
                            </Text>
                            <TouchableOpacity onPress={() => setShowAttendeesModal(false)}>
                                <Ionicons name="close" size={24} color={currentColors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        
                        {/* 선택된 참석자 표시 */}
                        {selectedAttendees.length > 0 && (
                            <View style={{ marginBottom: 16 }}>
                                <ScrollView 
                                    horizontal 
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={{ paddingRight: 16 }}
                                >
                                    {selectedAttendees.map((attendee, index) => (
                                        <View key={attendee.employee_id} style={{
                                            alignItems: 'center',
                                            marginRight: 8,
                                            minWidth: 50,
                                            position: 'relative'
                                        }}>
                                            <View style={{
                                                width: 50,
                                                height: 50,
                                                borderRadius: 25,
                                                backgroundColor: currentColors.primaryLight,
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                marginBottom: 6,
                                                elevation: 2,
                                                shadowColor: currentColors.primary,
                                                shadowOffset: { width: 0, height: 2 },
                                                shadowOpacity: 0.1,
                                                shadowRadius: 4
                                            }}>
                                                <Text style={{
                                                    color: currentColors.primary,
                                                    fontSize: 18,
                                                    fontWeight: '600'
                                                }}>
                                                    {attendee.nickname.charAt(0)}
                                                </Text>
                                            </View>
                                            
                                            {/* X 버튼 (선택 취소) */}
                                            <TouchableOpacity
                                                style={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    right: -2,
                                                    width: 16,
                                                    height: 16,
                                                    borderRadius: 8,
                                                    backgroundColor: currentColors.error || '#EF4444',
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    elevation: 3,
                                                    shadowColor: currentColors.error || '#EF4444',
                                                    shadowOffset: { width: 0, height: 2 },
                                                    shadowOpacity: 0.3,
                                                    shadowRadius: 4
                                                }}
                                                onPress={() => removeAttendee(attendee.employee_id)}
                                                activeOpacity={0.7}
                                            >
                                                <Ionicons 
                                                    name="close" 
                                                    size={10} 
                                                    color="#FFFFFF" 
                                                />
                                            </TouchableOpacity>
                                            
                                            <Text style={{
                                                fontSize: 12,
                                                color: currentColors.text,
                                                textAlign: 'center',
                                                fontWeight: '500'
                                            }}>
                                                {attendee.nickname}
                                            </Text>
                                        </View>
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        {/* 검색 입력창 */}
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                placeholder="참석자 이름을 검색하세요"
                                placeholderTextColor={currentColors.textSecondary}
                                returnKeyType="done"
                                onSubmitEditing={() => {
                                    Keyboard.dismiss();
                                }}
                                blurOnSubmit={true}
                            />
                            <Ionicons name="search" size={20} color={currentColors.textSecondary} style={{ marginRight: 16 }} />
                        </View>

                        {/* 자주 만나는 친구들 */}
                        {frequentFriends.length > 0 && (
                            <View style={{ marginTop: 8, marginBottom: 16 }}>
                                <ScrollView 
                                    horizontal 
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.quickRestaurantsScroll}
                                >
                                    {frequentFriends.map((friend) => {
                                        const isSelected = selectedAttendees.some(a => a.employee_id === friend.employee_id);
                                        return (
                                            <TouchableOpacity
                                                key={friend.employee_id}
                                                style={[
                                                    styles.quickRestaurantButton,
                                                    isSelected && styles.quickRestaurantButtonActive
                                                ]}
                                                onPress={() => !isSelected ? addAttendee(friend) : removeAttendee(friend.employee_id)}
                                            >
                                                <Text style={[
                                                    styles.quickRestaurantText,
                                                    isSelected && styles.quickRestaurantTextActive
                                                ]}>
                                                    {friend.nickname}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            </View>
                        )}

                        {/* 검색 결과 또는 전체 친구 목록 */}
                        {searchQuery.trim() ? (
                            <View style={styles.suggestionsContainer}>
                                <Text style={styles.suggestionsTitle}>
                                    검색 결과 ({friends.filter(friend => 
                                        friend.nickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        (friend.department && friend.department.toLowerCase().includes(searchQuery.toLowerCase()))
                                    ).length}명)
                                </Text>
                                
                                {/* 로딩 상태 */}
                                {isLoadingFriends && (
                                    <View style={styles.loadingContainer}>
                                        <Text style={[styles.suggestionText, { color: currentColors.textSecondary }]}>
                                            검색 중...
                                        </Text>
                                    </View>
                                )}

                                {/* 에러 상태 */}
                                {friendsError && (
                                    <View style={styles.errorContainer}>
                                        <Text style={styles.errorText}>{friendsError}</Text>
                                    </View>
                                )}

                                {/* 검색 결과 */}
                                {!isLoadingFriends && !friendsError && (() => {
                                    // 검색 시에는 전체 가상 유저에서 검색
                                    const filteredUsers = friends.filter(friend => 
                                        friend.nickname.toLowerCase().includes(searchQuery.toLowerCase())
                                    );
                                    
                                    if (filteredUsers.length === 0) {
                                        return (
                                            <View style={{ 
                                                padding: 20, 
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flex: 1
                                            }}>
                                                <Ionicons 
                                                    name="search-outline" 
                                                    size={48} 
                                                    color={currentColors.textSecondary} 
                                                    style={{ marginBottom: 12 }}
                                                />
                                                <Text style={[styles.suggestionText, { 
                                                    color: currentColors.textSecondary,
                                                    textAlign: 'center',
                                                    marginBottom: 8
                                                }]}>
                                                    "{searchQuery}" 검색 결과가 없습니다
                                                </Text>
                                            </View>
                                        );
                                    }
                                    
                                    return (
                                        <View style={styles.searchResultsContainer}>
                                            <FlatList
                                                data={filteredUsers}
                                                keyExtractor={(item) => item.employee_id}
                                                renderItem={({ item }) => {
                                                    const isSelected = selectedAttendees.some(a => a.employee_id === item.employee_id);
                                                    return (
                                                        <TouchableOpacity
                                                            style={[
                                                                styles.suggestionItem,
                                                                isSelected && { backgroundColor: currentColors.primaryLight }
                                                            ]}
                                                            onPress={() => !isSelected ? addAttendee(item) : removeAttendee(item.employee_id)}
                                                        >
                                                            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                                                                <TouchableOpacity
                                                                    style={{
                                                                        width: 40,
                                                                        height: 40,
                                                                        borderRadius: 20,
                                                                        backgroundColor: currentColors.primaryLight,
                                                                        justifyContent: 'center',
                                                                        alignItems: 'center',
                                                                        marginRight: 12
                                                                    }}
                                                                    onPress={async () => {
                                                                        // 현재 입력값들을 AsyncStorage에 저장
                                                                        try {
                                                                            const currentData = {
                                                                                title,
                                                                                restaurant,
                                                                                selectedDate: selectedDate.toISOString(),
                                                                                time,
                                                                                location,
                                                                                selectedAttendees,
                                                                                description,
                                                                                showAttendeesModal: true
                                                                            };
                                                                            await AsyncStorage.setItem('tempScheduleData', JSON.stringify(currentData));
                                                                        } catch (error) {
                                                                            console.log('데이터 저장 중 오류:', error);
                                                                        }
                                                                        
                                                                        setShowAttendeesModal(false);
                                                                        navigation.navigate('UserProfile', {
                                                                            employeeId: item.employee_id,
                                                                            fromPersonalSchedule: true
                                                                        });
                                                                    }}
                                                                    activeOpacity={0.7}
                                                                >
                                                                    <Text style={{
                                                                        color: currentColors.primary,
                                                                        fontSize: 16,
                                                                        fontWeight: '600'
                                                                    }}>
                                                                        {item.nickname.charAt(0)}
                                                                    </Text>
                                                                </TouchableOpacity>
                                                                <View style={{ flex: 1 }}>
                                                                    <Text style={styles.suggestionText}>
                                                                        {item.nickname}
                                                                    </Text>
                                                                    <Text style={[styles.suggestionText, { 
                                                                        fontSize: 12, 
                                                                        color: currentColors.textSecondary
                                                                    }]}>
                                                                        {item.foodPreferences ? item.foodPreferences.join(', ') : '새로운 맛집 탐방'}
                                                                    </Text>
                                                                </View>
                                                            </View>
                                                            <Ionicons 
                                                                name={isSelected ? "checkmark-circle" : "add-circle-outline"} 
                                                                size={24} 
                                                                color={isSelected ? currentColors.primary : currentColors.textSecondary} 
                                                            />
                                                        </TouchableOpacity>
                                                    );
                                                }}
                                                showsVerticalScrollIndicator={false}
                                                contentContainerStyle={styles.searchResultsContent}
                                                style={styles.searchResultsFlatList}
                                            />
                                        </View>
                                    );
                                })()}

                                {/* 직접 입력하기 카드 */}
                                {searchQuery.trim() && (
                                    <TouchableOpacity
                                        style={{
                                            backgroundColor: currentColors.surface,
                                            borderWidth: 2,
                                            borderColor: currentColors.primary,
                                            borderRadius: 16,
                                            padding: 16,
                                            marginTop: 16,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            elevation: 2,
                                            shadowColor: currentColors.primary,
                                            shadowOffset: { width: 0, height: 2 },
                                            shadowOpacity: 0.1,
                                            shadowRadius: 4
                                        }}
                                        onPress={() => {
                                            const myProfile = getMyProfile(searchQuery);
                                            addAttendee(myProfile);
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                                            <View style={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: 20,
                                                backgroundColor: currentColors.primaryLight,
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                marginRight: 12
                                            }}>
                                                <Ionicons 
                                                    name="person-add" 
                                                    size={20} 
                                                    color={currentColors.primary} 
                                                />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{
                                                    color: currentColors.primary,
                                                    fontSize: 16,
                                                    fontWeight: '600',
                                                    marginBottom: 2
                                                }}>
                                                    "{searchQuery}" 직접 입력하기
                                                </Text>
                                                <Text style={{
                                                    color: currentColors.textSecondary,
                                                    fontSize: 12
                                                }}>
                                                    현재 사용자를 참석자로 추가
                                                </Text>
                                            </View>
                                        </View>
                                        <Ionicons 
                                            name="chevron-forward" 
                                            size={20} 
                                            color={currentColors.primary} 
                                        />
                                    </TouchableOpacity>
                                )}
                            </View>
                        ) : (
                            /* 전체 친구 목록 */
                            <View style={styles.suggestionsContainer}>
                                <Text style={styles.suggestionsTitle}>
                                    전체 친구 목록
                                </Text>
                                
                                {/* 로딩 상태 */}
                                {isLoadingFriends && (
                                    <View style={styles.loadingContainer}>
                                        <Text style={[styles.suggestionText, { color: currentColors.textSecondary }]}>
                                            친구 목록을 불러오는 중...
                                        </Text>
                                    </View>
                                )}

                                {/* 에러 상태 */}
                                {friendsError && (
                                    <View style={styles.errorContainer}>
                                        <Text style={styles.errorText}>{friendsError}</Text>
                                    </View>
                                )}

                                {/* 친구 목록 */}
                                {!isLoadingFriends && !friendsError && (
                                    <View style={styles.searchResultsContainer}>
                                        <FlatList
                                            data={friends}
                                            keyExtractor={(item) => item.employee_id}
                                            renderItem={({ item }) => {
                                                const isSelected = selectedAttendees.some(a => a.employee_id === item.employee_id);
                                                return (
                                                    <TouchableOpacity
                                                        style={[
                                                            styles.suggestionItem,
                                                            isSelected && { backgroundColor: currentColors.primaryLight }
                                                        ]}
                                                        onPress={() => !isSelected ? addAttendee(item) : removeAttendee(item.employee_id)}
                                                    >
                                                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                                                            <TouchableOpacity
                                                                style={{
                                                                    width: 40,
                                                                    height: 40,
                                                                    borderRadius: 20,
                                                                    backgroundColor: currentColors.primaryLight,
                                                                    justifyContent: 'center',
                                                                    alignItems: 'center',
                                                                    marginRight: 12
                                                                }}
                                                                onPress={async () => {
                                                                    // 현재 입력값들을 AsyncStorage에 저장
                                                                    try {
                                                                        const currentData = {
                                                                            title,
                                                                            restaurant,
                                                                            selectedDate: selectedDate.toISOString(),
                                                                            time,
                                                                            location,
                                                                            selectedAttendees,
                                                                            description,
                                                                            showAttendeesModal: true
                                                                        };
                                                                        await AsyncStorage.setItem('tempScheduleData', JSON.stringify(currentData));
                                                                    } catch (error) {
                                                                        console.log('데이터 저장 중 오류:', error);
                                                                    }
                                                                    
                                                                    // 1. 참석자 선택 모달 팝업 닫기
                                                                    setShowAttendeesModal(false);
                                                                    // 2. 프로필 화면으로 직접 이동
                                                                    navigation.navigate('UserProfile', {
                                                                        employeeId: item.employee_id,
                                                                        fromPersonalSchedule: true
                                                                    });
                                                                }}
                                                                activeOpacity={0.7}
                                                            >
                                                                <Text style={{
                                                                    color: currentColors.primary,
                                                                    fontSize: 16,
                                                                    fontWeight: '600'
                                                                }}>
                                                                    {item.nickname.charAt(0)}
                                                                </Text>
                                                            </TouchableOpacity>
                                                            <View style={{ flex: 1 }}>
                                                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                                                                    <Text style={styles.suggestionText}>
                                                                        {item.nickname}
                                                                    </Text>
                                                                    <Text style={[styles.suggestionText, { 
                                                                        fontSize: 12, 
                                                                        color: currentColors.textSecondary,
                                                                        marginLeft: 8
                                                                    }]}>
                                                                        칭호
                                                                    </Text>
                                                                </View>
                                                                <Text style={[styles.suggestionText, { 
                                                                    fontSize: 12, 
                                                                    color: currentColors.textSecondary
                                                                }]}>
                                                                    {item.preferences?.food_taste || '새로운 맛집 탐방'} • {item.preferences?.favorite_food || '한식, 중식'}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                        <Ionicons 
                                                            name={isSelected ? "checkmark-circle" : "add-circle-outline"} 
                                                            size={24} 
                                                            color={isSelected ? currentColors.primary : currentColors.textSecondary} 
                                                        />
                                                    </TouchableOpacity>
                                                );
                                            }}
                                            showsVerticalScrollIndicator={false}
                                            contentContainerStyle={styles.searchResultsContent}
                                            style={styles.searchResultsFlatList}
                                        />
                                    </View>
                                )}

                                {/* 친구 찾기 카드 */}
                                <TouchableOpacity
                                    style={{
                                        backgroundColor: currentColors.surface,
                                        borderWidth: 2,
                                        borderColor: currentColors.primary,
                                        borderRadius: 16,
                                        padding: 16,
                                        marginTop: 16,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        elevation: 2,
                                        shadowColor: currentColors.primary,
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: 0.1,
                                        shadowRadius: 4
                                    }}
                                    onPress={async () => {
                                        // 현재 입력값들을 AsyncStorage에 저장
                                        try {
                                            const currentData = {
                                                title,
                                                restaurant,
                                                selectedDate: selectedDate.toISOString(),
                                                time,
                                                location,
                                                selectedAttendees,
                                                description,
                                                showAttendeesModal: true
                                            };
                                            await AsyncStorage.setItem('tempScheduleData', JSON.stringify(currentData));
                                        } catch (error) {
                                            console.log('데이터 저장 중 오류:', error);
                                        }
                                        
                                        // 1. 참석자 선택 팝업 닫기
                                        setShowAttendeesModal(false);
                                        // 2. 직접 SearchUsers 화면으로 이동 (친구탭 경유 없이)
                                        navigation.navigate('SearchUsers', {
                                            fromPersonalSchedule: true
                                        });
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: 20,
                                            backgroundColor: currentColors.primaryLight,
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            marginRight: 12
                                        }}>
                                            <Ionicons 
                                                name="search" 
                                                size={20} 
                                                color={currentColors.primary} 
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{
                                                color: currentColors.primary,
                                                fontSize: 16,
                                                fontWeight: '600',
                                                marginBottom: 2
                                            }}>
                                                친구 찾기
                                            </Text>
                                            <Text style={{
                                                color: currentColors.textSecondary,
                                                fontSize: 12
                                            }}>
                                                새로운 친구를 찾아보세요
                                            </Text>
                                        </View>
                                    </View>
                                    <Ionicons 
                                        name="chevron-forward" 
                                        size={20} 
                                        color={currentColors.primary} 
                                    />
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* 확인 버튼 */}
                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                style={[styles.button, styles.buttonPrimary]}
                                onPress={() => setShowAttendeesModal(false)}
                            >
                                <Text style={styles.buttonText}>확인</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* 필터 모달 - 완전한 필터 기능 */}
            <Modal
                visible={showFilterModal}
                transparent
                animationType="none"
                onRequestClose={() => {
                    // 1. 필터 팝업 닫기
                    setShowFilterModal(false);
                    // 2. 즉시 식당 선택 팝업 다시 열기 (애니메이션 없이)
                    setShowRestaurantModal(true);
                }}
            >
                <View style={[styles.modalOverlay, { zIndex: 9999 }]}>
                    <View style={[styles.modalContainer, { 
                        zIndex: 10000, 
                        maxHeight: '60%', 
                        minHeight: '40%',
                        padding: 24,
                        borderRadius: 24
                    }]}>
                        {/* 헤더 */}
                        <View style={[styles.modalHeader, { marginBottom: 20 }]}>
                            <Text style={styles.modalTitle}>필터 설정</Text>
                            <TouchableOpacity 
                                onPress={() => {
                                    setShowFilterModal(false);
                                    
                                    // 필터 설정 완료 후 자동으로 검색 실행
                                    if (restaurantSearchQuery.trim()) {
                                        searchRestaurants(restaurantSearchQuery);
                                    }
                                    
                                    setShowRestaurantModal(true);
                                }}
                            >
                                <Ionicons name="close" size={24} color={currentColors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        
                        {/* 카테고리 필터 */}
                        <View style={[styles.filterSection, { marginBottom: 24 }]}>
                            <Text style={[styles.filterSectionTitle, { marginBottom: 10 }]}>카테고리</Text>
                            <ScrollView 
                                horizontal 
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.categoryChipsScroll}
                            >
                                {['한식', '중식', '일식', '양식', '분식', '카페', '아시안', '퓨전', '기타'].map((category) => (
                                    <TouchableOpacity
                                        key={category}
                                        style={{
                                            backgroundColor: selectedCategory === category ? currentColors.primary : currentColors.surface,
                                            borderRadius: 20,
                                            paddingVertical: 8,
                                            paddingHorizontal: 12,
                                            marginRight: -2,
                                            elevation: selectedCategory === category ? 2 : 1,
                                            shadowColor: currentColors.primary,
                                            shadowOffset: { width: 0, height: 2 },
                                            shadowOpacity: selectedCategory === category ? 0.2 : 0.1,
                                            shadowRadius: 4,
                                            borderWidth: 1,
                                            borderColor: selectedCategory === category ? currentColors.primary : currentColors.lightGray
                                        }}
                                        onPress={() => handleCategorySelect(category)}
                                    >
                                        <Text style={{
                                            color: selectedCategory === category ? '#FFFFFF' : currentColors.text,
                                            fontWeight: selectedCategory === category ? 'bold' : '600',
                                            fontSize: 14
                                        }}>
                                            {category}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        {/* 정렬 옵션 */}
                        <View style={[styles.filterSection, { marginBottom: 16 }]}>
                            <Text style={[styles.filterSectionTitle, { marginBottom: 10 }]}>정렬 기준</Text>
                            <ScrollView 
                                horizontal 
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.sortOptionsScroll}
                            >
                                {[
                                    { key: 'name', label: '이름순' },
                                    { key: 'rating_desc', label: '평점순' },
                                    { key: 'reviews_desc', label: '리뷰순' },
                                    { key: 'recommend_desc', label: '오찬추천순' },
                                    { key: 'distance', label: '거리순' }
                                ].map((option) => (
                                    <TouchableOpacity
                                        key={option.key}
                                        style={{
                                            backgroundColor: sortBy === option.key ? currentColors.primary : currentColors.surface,
                                            borderRadius: 20,
                                            paddingVertical: 8,
                                            paddingHorizontal: 12,
                                            marginRight: -2,
                                            elevation: sortBy === option.key ? 2 : 1,
                                            shadowColor: currentColors.primary,
                                            shadowOffset: { width: 0, height: 2 },
                                            shadowOpacity: sortBy === option.key ? 0.2 : 0.1,
                                            shadowRadius: 4,
                                            borderWidth: 1,
                                            borderColor: sortBy === option.key ? currentColors.primary : currentColors.lightGray
                                        }}
                                        onPress={() => handleSortChange(option.key)}
                                    >
                                        <Text style={{
                                            color: sortBy === option.key ? '#FFFFFF' : currentColors.text,
                                            fontWeight: sortBy === option.key ? 'bold' : '600',
                                            fontSize: 14
                                        }}>
                                            {option.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        {/* 버튼들 */}
                        <View style={[styles.filterButtons, { marginTop: 16 }]}>
                            <TouchableOpacity
                                style={{
                                    backgroundColor: currentColors.surface,
                                    borderRadius: 16,
                                    paddingVertical: 14,
                                    paddingHorizontal: 24,
                                    marginRight: 8,
                                    elevation: 1,
                                    shadowColor: currentColors.primary,
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.1,
                                    shadowRadius: 4,
                                    borderWidth: 1,
                                    borderColor: currentColors.lightGray,
                                    flex: 1,
                                    justifyContent: 'center',
                                    alignItems: 'center'
                                }}
                                onPress={() => {
                                    // 필터 초기화
                                    setSelectedCategory(null);
                                    setSortBy('name');
                                    setSelectedQuickRestaurant(null); // 선택된 자주가는 식당 초기화
                                    
                                    // 초기화 후 자동으로 검색 실행
                                    if (restaurantSearchQuery.trim()) {
                                        searchRestaurants(restaurantSearchQuery);
                                    }
                                }}
                            >
                                <Text style={{
                                    color: currentColors.text,
                                    fontWeight: '600',
                                    fontSize: 16
                                }}>
                                    초기화
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{
                                    backgroundColor: currentColors.primary,
                                    borderRadius: 16,
                                    paddingVertical: 14,
                                    paddingHorizontal: 24,
                                    elevation: 2,
                                    shadowColor: currentColors.primary,
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.2,
                                    shadowRadius: 4,
                                    borderWidth: 1,
                                    borderColor: currentColors.primary,
                                    flex: 1,
                                    justifyContent: 'center',
                                    alignItems: 'center'
                                }}
                                onPress={() => {
                                    setShowFilterModal(false);
                                    
                                    // 필터 설정 완료 후 자동으로 검색 실행
                                    if (restaurantSearchQuery.trim()) {
                                        searchRestaurants(restaurantSearchQuery);
                                    }
                                    
                                    setShowRestaurantModal(true);
                                }}
                            >
                                <Text style={{
                                    color: '#FFFFFF',
                                    fontWeight: 'bold',
                                    fontSize: 16
                                }}>
                                    확인
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
