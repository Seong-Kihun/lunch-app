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
    Keyboard,
    PanResponder,
    Animated
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
// useSchedule import 제거됨
import { useCreateParty } from '../../../hooks/usePartyQuery';



export default function CreatePartyScreen({ navigation, route }) {
    const { date, title: initialTitle, restaurant: initialRestaurant, selectedDate: initialSelectedDate, time: initialTime, location: initialLocation, selectedAttendees: initialSelectedAttendees, description: initialDescription, showAttendeesModal: initialShowAttendeesModal } = route.params || {};
    // setRefreshPartyTab 제거됨 - 로컬 상태로 관리
    const createPartyMutation = useCreateParty();
    const currentColors = global.currentColors || COLORS.light;
    const myEmployeeId = getMyEmployeeId();
    const styles = createFormStyles(currentColors);
    
    // 상태 변수들
    const [title, setTitle] = useState(initialTitle || '');
    const [restaurant, setRestaurant] = useState(initialRestaurant || '');
    const [selectedDate, setSelectedDate] = useState(() => {
        // 1. route.params에서 전달된 날짜가 있으면 해당 날짜 사용
        if (initialSelectedDate) {
            const parsedDate = new Date(initialSelectedDate);
            if (!isNaN(parsedDate.getTime())) {
                return parsedDate;
            }
        }
        if (date) {
            const parsedDate = new Date(date);
            if (!isNaN(parsedDate.getTime())) {
                return parsedDate;
            }
        }
        
        // 2. 전달된 날짜가 없으면 한국 시간 기준 오늘 날짜 사용
        const today = getKoreanToday();
        return today;
    });
    const [time, setTime] = useState(initialTime || '11:30');
    const [location, setLocation] = useState(initialLocation || '');
    const [selectedAttendees, setSelectedAttendees] = useState(initialSelectedAttendees || []);
    const [description, setDescription] = useState(initialDescription || '');
    const [isDateModalVisible, setDateModalVisible] = useState(false);
    const [isTimeModalVisible, setTimeModalVisible] = useState(false);
    const [showAttendeesModal, setShowAttendeesModal] = useState(initialShowAttendeesModal || false);
    const [suggestedTitles, setSuggestedTitles] = useState([]);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const [isLoading, setIsLoading] = useState(false); // 파티 생성 로딩 상태
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
    
    // 반복 설정 관련 상태들
    const [showRecurrenceOptions, setShowRecurrenceOptions] = useState(false);
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurrenceType, setRecurrenceType] = useState('daily');
    const [recurrenceInterval, setRecurrenceInterval] = useState(1);
    const [endType, setEndType] = useState('never');
    const [endDate, setEndDate] = useState(null);
    const [showEndDateModal, setShowEndDateModal] = useState(false);
    const [showLocationModal, setShowLocationModal] = useState(false);
    
    // ref 정의
    const locationInputRef = useRef(null);
    
    // 파티 전용 상태들
    const [maxMembers, setMaxMembers] = useState(4);
    const [isMaxMembersModalVisible, setMaxMembersModalVisible] = useState(false);
    
    // Range Slider 관련 상태
    const [sliderValue, setSliderValue] = useState(4);
    
    // 슬라이더 애니메이션 관련
    const sliderWidth = 280; // 슬라이더 전체 너비
    const sliderRef = useRef(null);
    const pan = useRef(new Animated.ValueXY()).current;
    
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
    
    // 🚨 중요: 홈탭에서 선택된 날짜 확인 및 적용
    useEffect(() => {
        if (global.newParty?.selectedDate && global.newParty?.isFromHomeTab) {
            const selectedDateFromHome = new Date(global.newParty.selectedDate);
            if (!isNaN(selectedDateFromHome.getTime())) {
                setSelectedDate(selectedDateFromHome);
                console.log('✅ [CreateParty] 홈탭에서 선택된 날짜 적용:', global.newParty.selectedDate);
                
                // 사용 후 초기화
                global.newParty.selectedDate = undefined;
                global.newParty.isFromHomeTab = undefined;
            }
        }
    }, []);
    
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

    // 페이지별로 식당 목록 표시
    const updateDisplayedRestaurants = useCallback((page = 1, forceRefresh = false) => {
        // allRestaurants가 비어있으면 표시할 것이 없음
        if (!allRestaurants || allRestaurants.length === 0) {
            setDisplayedRestaurants([]);
            setCurrentPage(1);
            setHasMore(false);
            return;
        }

        if (forceRefresh) {
            setCurrentPage(1);
            setHasMore(true);
        }
        
        // 검색 결과의 경우 모든 결과를 표시 (페이지네이션 비활성화)
        if (restaurantSearchQuery.trim()) {
            setDisplayedRestaurants(allRestaurants);
            setCurrentPage(1);
            setHasMore(false);
        } else {
            // 일반 목록의 경우 페이지네이션 적용
            const startIndex = 0;
            const endIndex = page * ITEMS_PER_PAGE;
            const newDisplayed = allRestaurants.slice(startIndex, endIndex);
            
            setDisplayedRestaurants(newDisplayed);
            setCurrentPage(page);
            setHasMore(endIndex < allRestaurants.length);
        }
    }, [allRestaurants, restaurantSearchQuery]);

    // 더보기 로드
    const loadMoreRestaurants = useCallback(async () => {
        if (isLoadingMore || !hasMore) return;
        
        // allRestaurants가 비어있으면 로드할 것이 없음
        if (!allRestaurants || allRestaurants.length === 0) {
            return;
        }

        setIsLoadingMore(true);
        
        // 다음 페이지 계산
        const nextPage = currentPage + 1;
        const startIndex = 0;
        const endIndex = nextPage * ITEMS_PER_PAGE;
        const newDisplayed = allRestaurants.slice(startIndex, endIndex);
        
        setDisplayedRestaurants(newDisplayed);
        setCurrentPage(nextPage);
        setHasMore(endIndex < allRestaurants.length);
        
        setIsLoadingMore(false);
    }, [allRestaurants, currentPage, hasMore, isLoadingMore]);

    // 전체 데이터 기반 정렬
    const sortAllRestaurants = useCallback((sortType) => {
        if (!allRestaurants || allRestaurants.length === 0) {
            return;
        }
        
        const sorted = [...allRestaurants];
        switch (sortType) {
            case 'distance':
                sorted.sort((a, b) => {
                    const distanceA = parseFloat(a.calculatedDistance || a.distance || 0);
                    const distanceB = parseFloat(b.calculatedDistance || b.distance || 0);
                    return distanceA - distanceB;
                });
                break;
            case 'rating_desc':
                sorted.sort((a, b) => {
                    const ratingA = parseFloat(a.actualRating || a.rating || 0);
                    const ratingB = parseFloat(b.actualRating || b.rating || 0);
                    return ratingB - ratingA;
                });
                break;
            case 'reviews_desc':
                sorted.sort((a, b) => {
                    const reviewsA = a.actualReviewCount || a.review_count || 0;
                    const reviewsB = b.actualReviewCount || b.review_count || 0;
                    return reviewsB - reviewsA;
                });
                break;
            case 'recommend_desc':
                sorted.sort((a, b) => (b.recommend_count || 0) - (a.recommend_count || 0));
                break;
            case 'name':
            default:
                sorted.sort((a, b) => a.name.localeCompare(b.name));
                break;
        }
        
        setAllRestaurants(sorted);
        updateDisplayedRestaurants(1, true); // 첫 페이지부터 다시 표시
    }, [allRestaurants, updateDisplayedRestaurants]);

    // 식당 데이터에 실제 평점과 거리 정보 추가
    const enhanceRestaurantData = async (restaurants) => {
        if (!restaurants || restaurants.length === 0) {
            return [];
        }
        
        // 현재 위치 (서울시청을 기본값으로 사용, 실제로는 GPS에서 가져와야 함)
        const currentLat = 37.5665;
        const currentLon = 126.9780;

        // 병렬 처리로 성능 최적화
        const enhancedRestaurants = await Promise.all(
            restaurants.map(async (restaurant) => {
                try {
                    // 실제 평점 데이터 가져오기
                    const ratingData = await getRestaurantRating(restaurant.id);
                    
                    // 거리 계산
                    let distance = 0;
                    if (restaurant.latitude && restaurant.longitude) {
                        distance = calculateDistance(
                            currentLat, currentLon,
                            restaurant.latitude, restaurant.longitude
                        );
                    }

                    return {
                        ...restaurant,
                        actualRating: ratingData.rating,
                        actualReviewCount: ratingData.reviewCount,
                        calculatedDistance: distance.toFixed(1)
                    };
        } catch (error) {
                    console.error(`식당 ${restaurant.id} 데이터 향상 오류:`, error);
                    // 오류 발생 시 원본 데이터 반환
                    return {
                        ...restaurant,
                        actualRating: restaurant.rating || '0.0',
                        actualReviewCount: restaurant.review_count || 0,
                        calculatedDistance: restaurant.distance || '0.0'
                    };
                }
            })
        );

        return enhancedRestaurants;
    };

    // 모든 입력 상태를 초기화하는 함수
    const resetAllInputs = () => {
        setTitle('');
        setRestaurant('');
        // 한국 시간 기준 오늘 날짜로 설정
        const today = getKoreanToday();
        setSelectedDate(today);
        setTime('11:30');
        setLocation('');
        setSelectedAttendees([]);
        setDescription('');
        setSuggestedTitles([]);
        setRestaurantSuggestions([]);
        setIsRecurring(false);
        setRecurrenceType('weekly');
        setRecurrenceInterval(1);
        setEndType('never');
        setEndDate(null);
        // 모달 상태들도 초기화
        setDateModalVisible(false);
        setTimeModalVisible(false);
        setShowAttendeesModal(false);
        setShowRestaurantModal(false);
        setShowEndDateModal(false);

        // 검색 관련 상태 초기화
        setRestaurantSearchQuery('');
        setSearchQuery('');
        setAllRestaurants([]);
        setDisplayedRestaurants([]);
        setTotalCount(0);
        setSelectedCategory(null);
        setSortBy('name');
        setSearchError(null);
        setSelectedQuickRestaurant(null);
        setCurrentPage(1);
        setHasMore(false);
    };

    // 일정 생성 핸들러
    const handleCreate = async () => {
        if (!title.trim() || !selectedDate) {
            Alert.alert('입력 오류', '제목과 날짜를 모두 입력해주세요.');
            return;
        }
        
        if (!restaurant.trim()) {
            Alert.alert('입력 오류', '식당명을 입력해주세요.');
            return;
        }

        try {
            // 로딩 상태 표시
            setIsLoading(true);

            // 파티 데이터 준비
            const partyData = {
                id: `local_party_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // 로컬 ID 추가
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
                maxMembers: maxMembers, // 파티 전용 필드
                isRecurring: isRecurring,
                recurrenceType: isRecurring ? recurrenceType : null,
                recurrenceInterval: isRecurring ? recurrenceInterval : null,
                endType: isRecurring ? endType : null,
                endDate: isRecurring && endDate ? endDate.toISOString().split('T')[0] : null,
                createdBy: global.myEmployeeId,
                createdAt: new Date().toISOString()
            };

            // 백엔드 API 호출 (useCreateParty 훅 사용)
            console.log('🔍 [CreateParty] 백엔드 API 호출 시작...');
            const result = await createPartyMutation.mutateAsync({
                title: partyData.title,
                date: partyData.date,
                time: partyData.time,
                restaurant: partyData.restaurant,
                location: partyData.location,
                maxMembers: partyData.maxMembers,
                attendees: partyData.attendees,
                description: partyData.description,
                created_by: myEmployeeId
            });
            console.log('✅ [CreateParty] 백엔드 API 호출 성공:', result);

            // refreshPartyTab 설정 제거됨 - React Query 캐시 무효화로 대체
            console.log('✅ [CreateParty] 파티 생성 완료');

            // 백엔드에서 받은 데이터로 전역 상태 업데이트
            const backendPartyData = {
                ...result,
                type: 'party', // 일반파티 타입
                is_from_match: false, // 일반파티는 매칭이 아님
                attendees: partyData.attendees, // 프론트엔드 참여자 정보 유지
                description: partyData.description // 프론트엔드 설명 정보 유지
            };
            global.newParty = backendPartyData;
            console.log('🔵 [CreateParty] 백엔드 파티 데이터 설정:', backendPartyData);

            // 성공 메시지 표시
            Alert.alert('성공', '파티가 생성되었습니다.', [
                {
                    text: '확인',
                    onPress: () => {
                        resetAllInputs(); // 모든 입력 상태 초기화
                        // 홈탭으로 이동하여 새로고침된 데이터 확인
                        navigation.navigate('홈');
                    }
                }
            ]);

        } catch (error) {
            console.error('일정 생성 오류:', error);
            Alert.alert('오류', '일정 생성에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setIsLoading(false);
        }
    };

    // 취소 핸들러
    const handleCancel = () => {
        resetAllInputs(); // 모든 입력 상태 초기화
        navigation.goBack();
    };

    // 화면이 포커스될 때마다 입력 상태 초기화 (단, 날짜는 제외)
    useFocusEffect(
        useCallback(() => {
            // route.params에서 검색 상태 복원 여부 확인
            if (route.params?.showRestaurantModal) {
                // 검색 상태 복원
                setRestaurantSearchQuery(route.params.searchQuery || '');
                setSelectedCategory(route.params.selectedCategory || null);
                setSortBy(route.params.sortBy || 'name');
                setRestaurantSuggestions(route.params.restaurantSuggestions || []);
                
                // 식당 선택 팝업 다시 열기
                setShowRestaurantModal(true);
                
                // 복원 완료 후 route.params 정리
                delete route.params.showRestaurantModal;
                delete route.params.searchQuery;
                delete route.params.selectedCategory;
                delete route.params.sortBy;
                delete route.params.restaurantSuggestions;
            } else {
                // 일반적인 초기화 (날짜는 초기화하지 않고 다른 입력들만 초기화)
                setTitle('');
                setRestaurant('');
                setTime('11:30');
                setLocation('');
                setSelectedAttendees([]);
                setDescription('');
                setSuggestedTitles([]);
                setRestaurantSuggestions([]);
                setIsRecurring(false);
                setRecurrenceType('weekly');
                setRecurrenceInterval(1);
                setEndType('never');
                setEndDate(null);
                // 모달 상태들도 초기화
                setDateModalVisible(false);
                setTimeModalVisible(false);
                setShowAttendeesModal(false);
                setShowRestaurantModal(false);
                setShowEndDateModal(false);

                // 검색 관련 상태 초기화
                setRestaurantSearchQuery('');
                setSearchQuery('');
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
        }, [route.params])
    );

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
            // 참석자 추가 시 자주 만나는 친구 목록에서 제거
            setFrequentFriends(prev => prev.filter(f => f.employee_id !== friend.employee_id));
        }
    };

    const removeAttendee = (employeeId) => {
        setSelectedAttendees(prev => prev.filter(a => a.employee_id !== employeeId));
        // 참석자 제거 시 자주 만나는 친구 목록에 다시 추가할 수 있도록 업데이트
        // 단, 이미 자주 만나는 친구 목록에 있지 않은 경우에만 추가
        const removedAttendee = friends.find(f => f.employee_id === employeeId);
        if (removedAttendee && !frequentFriends.some(f => f.employee_id === employeeId)) {
            setFrequentFriends(prev => {
                const newList = [...prev, removedAttendee];
                // 최대 5명까지만 유지
                return newList.slice(0, 5);
            });
        }
    };

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
                        // console.log('🔍 [참석자] 전체 가상 유저 목록 로드 성공:', allUsers.length);
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
                        // console.log('🔍 [참석자] 친구 관계 기반 참석자 목록 로드 성료:', friends.length);
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



    // route params 변경 추적
    useEffect(() => {
        if (date) {
            const parsedDate = new Date(date);
            if (!isNaN(parsedDate.getTime())) {
                setSelectedDate(parsedDate);
            }
        }
    }, [date]);

    // 초기 로딩 시에는 전체 식당 목록을 가져오지 않음
    // useEffect(() => {
    //     searchAllRestaurants();
    // }, []);



    // 식당 검색 함수
    const searchRestaurants = useCallback(async (query) => {
        if (!query.trim()) {
            setAllRestaurants([]);
            setDisplayedRestaurants([]);
            setTotalCount(0);
            setRestaurantSuggestions([]);
            setSearchError(null);
            return;
        }

        // 검색 시작 시 상태 완전 초기화
        setSelectedCategory(null); // 카테고리 필터 초기화
        setSortBy('name'); // 정렬 초기화
        setCurrentPage(1);
        setHasMore(false);

        // 캐시된 결과가 있는지 확인
        const cachedResult = searchCache.get(query);
        if (cachedResult) {
            setAllRestaurants(cachedResult);
            setTotalCount(cachedResult.length);
            setRestaurantSuggestions(cachedResult);
            setSearchError(null);
            
            // 표시 업데이트 (검색 결과는 모든 결과를 표시)
            updateDisplayedRestaurants(1, true);
            return;
        }

        setIsSearching(true);
        setSearchError(null);

        try {
            const url = `${RENDER_SERVER_URL}/restaurants?query=${encodeURIComponent(query)}&sort_by=${sortBy}&per_page=100`;
            
            // 타임아웃 설정 (10초로 단축)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const responseText = await response.text();
                
                let data;
                try {
                    data = JSON.parse(responseText);
                } catch (parseError) {
                    console.error('JSON 파싱 오류:', parseError);
                    setRestaurantSuggestions([]);
                    setSearchError('응답 데이터 파싱에 실패했습니다.');
                    return;
                }
                
                // API 응답 구조에 따라 restaurants 배열 추출
                let restaurants = [];
                if (data.restaurants && Array.isArray(data.restaurants)) {
                    restaurants = data.restaurants;
                } else if (Array.isArray(data)) {
                    restaurants = data;
                } else if (data.data && Array.isArray(data.data)) {
                    restaurants = data.data;
                }
                
                // 실제 평점과 거리 정보로 데이터 향상
                const enhancedRestaurants = await enhanceRestaurantData(restaurants);
                
                // 전체 데이터 저장 및 표시 업데이트
                setAllRestaurants(enhancedRestaurants);
                setTotalCount(enhancedRestaurants.length);
                
                // 결과를 캐시에 저장
                setSearchCache(prev => new Map(prev).set(query, enhancedRestaurants));
                setRestaurantSuggestions(enhancedRestaurants);
                
                // 표시 업데이트 (검색 결과는 모든 결과를 표시)
                updateDisplayedRestaurants(1, true);
            } else {
                const errorText = await response.text();
                console.error('API 오류:', response.status, response.statusText, errorText);
                setAllRestaurants([]);
                setDisplayedRestaurants([]);
                setTotalCount(0);
                setRestaurantSuggestions([]);
                setSearchError(`검색 중 오류가 발생했습니다. (${response.status})`);
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.error('요청 타임아웃 (10초)');
                setSearchError('서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.');
            } else {
                console.error('네트워크 오류:', error);
                setSearchError('네트워크 오류가 발생했습니다.');
            }
            setAllRestaurants([]);
            setDisplayedRestaurants([]);
            setTotalCount(0);
            setRestaurantSuggestions([]);
        } finally {
            setIsSearching(false);
        }
    }, [searchCache, updateDisplayedRestaurants]);

    // Excel/CSV 데이터를 백엔드로 동기화 (한 번만 실행)
    const syncExcelDataToBackend = useCallback(async () => {
        // 이미 동기화가 완료되었는지 확인
        if (global.excelDataSynced) {
            return;
        }
        
        try {
            // Excel/CSV 데이터 로드 (맛집탭과 동일한 방식)
            const { loadRestaurantData } = await import('../../../utils/excelReader');
            const { processExcelData } = await import('../../../utils/excelDataProcessor');
            
            const excelData = await loadRestaurantData();
            const processedData = await processExcelData(excelData);
            
            // 백엔드로 데이터 전송
            const response = await fetch(`${RENDER_SERVER_URL}/restaurants/sync-excel-data`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    restaurants: processedData
                })
            });
            
            if (response.ok) {
                // 동기화 완료 표시
                global.excelDataSynced = true;
            }
            
        } catch (error) {
            console.error('데이터 동기화 중 오류:', error);
        }
    }, []);

    // 자주 가는 식당 가져오기
    const fetchFrequentRestaurants = useCallback(async () => {
        try {
            // 임시로 인기 식당 데이터 생성 (실제로는 사용자 방문 기록 기반)
            const popularRestaurants = [
                { id: 1, name: '지구마을', category: '한식', distance: 0.1, rating: 4.5 },
                { id: 2, name: '북창동순두부', category: '한식', distance: 0.26, rating: 4.3 },
                { id: 3, name: '시먼당', category: '한식', distance: 0.26, rating: 4.2 },
                { id: 4, name: '청담식당', category: '한식', distance: 0.28, rating: 4.4 },
                { id: 5, name: '짬뽕지존', category: '중식', distance: 0.29, rating: 4.1 },
                { id: 6, name: '스타벅스', category: '카페', distance: 0.15, rating: 4.2 },
                { id: 7, name: '맥도날드', category: '양식', distance: 0.32, rating: 4.0 },
                { id: 8, name: '김밥천국', category: '분식', distance: 0.18, rating: 4.3 },
                { id: 9, name: '스시로', category: '일식', distance: 0.45, rating: 4.6 }
            ];
            setFrequentRestaurants(popularRestaurants);
        } catch (error) {
            console.error('자주 가는 식당 조회 실패:', error);
            setFrequentRestaurants([]);
        }
    }, []);

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
                        // 단, 이미 선택된 참석자는 제외하고 선택
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
                    // 단, 이미 선택된 참석자는 제외하고 선택
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
    }, [friends]);

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



    // 식당 모달이 열릴 때 자주 가는 식당 가져오기 및 데이터 동기화
    useEffect(() => {
        if (showRestaurantModal) {
            fetchFrequentRestaurants();
            // 자동으로 Excel/CSV 데이터 동기화
            syncExcelDataToBackend();
        }
    }, [showRestaurantModal, fetchFrequentRestaurants, syncExcelDataToBackend]);

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
            setTotalCount(filtered.length);
            setCurrentPage(1);
            setHasMore(false); // 필터링된 결과는 더보기 불필요
        } else if (restaurantSearchQuery.trim()) {
            searchRestaurants(restaurantSearchQuery);
        } else {
            searchAllRestaurants();
        }
    };





    // 검색 결과 정렬 (기존 함수 제거 - sortAllRestaurants로 대체)

    // 정렬 옵션 변경 핸들러
    const handleSortChange = useCallback((newSortBy) => {
        setSortBy(newSortBy);
        
        // 정렬 변경 시 전체 데이터 기반으로 재정렬
        if (allRestaurants.length > 0) {
            sortAllRestaurants(newSortBy);
        } else if (!restaurantSearchQuery.trim()) {
            searchAllRestaurants();
        }
    }, [allRestaurants, sortAllRestaurants, restaurantSearchQuery, sortBy, searchAllRestaurants]);

    // 전체 식당 목록 가져오기 (필터만 적용된 상태)
    const searchAllRestaurants = useCallback(async () => {
        try {
            setIsSearching(true);
            setSearchError(null);
            
            // 검색어 없이 필터만으로 API 호출
            const url = `${RENDER_SERVER_URL}/restaurants?sort_by=${sortBy}&per_page=100`;
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const responseText = await response.text();
                
                let data;
                try {
                    data = JSON.parse(responseText);
                } catch (parseError) {
                    console.error('전체 식당 목록 JSON 파싱 오류:', parseError);
                    setRestaurantSuggestions([]);
                    setSearchError('응답 데이터 파싱에 실패했습니다.');
                    return;
                }
                
                let restaurants = [];
                if (data.restaurants && Array.isArray(data.restaurants)) {
                    restaurants = data.restaurants;
                } else if (Array.isArray(data)) {
                    restaurants = data;
                } else if (data.data && Array.isArray(data.data)) {
                    restaurants = data.data;
                }
                
                // 실제 평점과 거리 정보로 데이터 향상
                const enhancedRestaurants = await enhanceRestaurantData(restaurants);
                
                // 전체 데이터 저장 및 표시 업데이트
                setAllRestaurants(enhancedRestaurants);
                setTotalCount(enhancedRestaurants.length);
                updateDisplayedRestaurants(1, true);
                
                // 결과를 캐시에 저장
                setSearchCache(prev => new Map(prev).set('', enhancedRestaurants));
                setRestaurantSuggestions(enhancedRestaurants);
            } else {
                const errorText = await response.text();
                console.error('전체 식당 목록 API 오류:', response.status, response.statusText, errorText);
                setRestaurantSuggestions([]);
                setSearchError(`검색 중 오류가 발생했습니다. (${response.status})`);
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.error('전체 식당 목록 요청 타임아웃 (10초)');
                setSearchError('요청 시간이 초과되었습니다. 다시 시도해주세요.');
            } else {
                console.error('전체 식당 목록 네트워크 오류:', error);
                setSearchError('네트워크 오류가 발생했습니다.');
            }
            setRestaurantSuggestions([]);
        } finally {
            setIsSearching(false);
        }
    }, [sortBy, updateDisplayedRestaurants]);



    // AI 제안 제목 생성 - 새로운 3단계 요리 과정 AI 제목 생성기 사용
    const generateTitleSuggestions = useCallback(async () => {
        // 입력값 검증
        if (!restaurant.trim()) {
            Alert.alert(
                'AI 제목 추천', 
                '식당 이름을 먼저 입력하시면\nAI가 맞춤형 제목을 추천해드려요! 🍽️✨\n\n• 식당 이름\n• 날짜\n• 참석자 정보\n\n이 정보들을 바탕으로 재치있는 제목을 만들어드립니다.'
            );
            return;
        }

        // 로딩 중이면 중복 실행 방지
        if (isLoadingSuggestions) {
            return;
        }

        // AI 제안 창이 이미 열려있으면 닫기
        if (suggestedTitles.length > 0) {
            setSuggestedTitles([]);
            return;
        }

        setIsLoadingSuggestions(true);
        
        try {
            // 컨텍스트 데이터 검증 및 정리
            const context = {
                restaurant: restaurant.trim(),
                date: selectedDate,
                time: time.trim(),
                attendees: selectedAttendees || [],
                description: description.trim(),
                scheduleType: '파티'
            };

            // 컨텍스트 유효성 검증
            if (!context.restaurant) {
                throw new Error('식당 정보가 유효하지 않습니다.');
            }

            // 3단계 요리 과정으로 AI 제목 생성
            const aiTitles = generateAITitles(context);
            
            // 결과 검증
            if (!aiTitles || !Array.isArray(aiTitles) || aiTitles.length === 0) {
                throw new Error('AI 제목 생성 결과가 유효하지 않습니다.');
            }
            
            // 랜덤 이모지 추가 (30% 확률)
            const titlesWithEmojis = addRandomEmojis(aiTitles);
            
            // 🚨 중요: 제목 데이터 무결성 검증 및 안전한 변환
            const safeTitles = titlesWithEmojis
                .filter(title => title && typeof title === 'string' && title.trim().length > 0)
                .map(title => String(title).trim());
            
            // 최종 결과 설정
            setSuggestedTitles(safeTitles);
            
            console.log('AI 제목 생성 성공:', titlesWithEmojis.length, '개');
            
        } catch (error) {
            console.error('AI 제목 생성 오류:', error);
            
            // 사용자 친화적인 오류 메시지
            let errorMessage = 'AI 제목 생성에 실패했습니다.';
            if (error.message.includes('식당 정보')) {
                errorMessage = '식당 정보를 다시 확인해주세요.';
            } else if (error.message.includes('결과가 유효하지 않습니다')) {
                errorMessage = '제목 생성 중 문제가 발생했습니다.';
            }
            
            // 🚨 중요: 오류 메시지도 안전하게 처리
            const safeErrorMessage = String(errorMessage || 'AI 제목 생성에 실패했습니다.').trim();
            setSuggestedTitles([safeErrorMessage]);
        } finally {
            setIsLoadingSuggestions(false);
        }
    }, [restaurant, selectedDate, time, selectedAttendees, description, suggestedTitles, isLoadingSuggestions]);

    // AI 제목 새로고침 전용 함수 - 컨테이너를 닫지 않고 제목만 업데이트
    const refreshAITitles = useCallback(async () => {
        // 입력값 검증
        if (!restaurant.trim()) {
            Alert.alert('알림', '식당 이름을 먼저 입력해주세요.');
            return;
        }

        // 로딩 중이면 중복 실행 방지
        if (isLoadingSuggestions) {
            return;
        }

        setIsLoadingSuggestions(true);
        
        try {
            // 컨텍스트 데이터 검증 및 정리
            const context = {
                restaurant: restaurant.trim(),
                date: selectedDate,
                time: time.trim(),
                attendees: selectedAttendees || [],
                description: description.trim(),
                scheduleType: '파티'
            };

            // 컨텍스트 유효성 검증
            if (!context.restaurant) {
                throw new Error('식당 정보가 유효하지 않습니다.');
            }

            // 3단계 요리 과정으로 AI 제목 생성
            const aiTitles = generateAITitles(context);
            
            // 결과 검증
            if (!aiTitles || !Array.isArray(aiTitles) || aiTitles.length === 0) {
                throw new Error('AI 제목 생성 결과가 유효하지 않습니다.');
            }
            
            // 랜덤 이모지 추가 (30% 확률)
            const titlesWithEmojis = addRandomEmojis(aiTitles);
            
            // 🚨 중요: 제목 데이터 무결성 검증 및 안전한 변환
            const safeTitles = titlesWithEmojis
                .filter(title => title && typeof title === 'string' && title.trim().length > 0)
                .map(title => String(title).trim());
            
            // 최종 결과 설정 (기존 제안 창 유지)
            setSuggestedTitles(safeTitles);
            
            console.log('AI 제목 새로고침 성공:', titlesWithEmojis.length, '개');
            
        } catch (error) {
            console.error('AI 제목 새로고침 오류:', error);
            
            // 사용자 친화적인 오류 메시지
            let errorMessage = 'AI 제목 새로고침에 실패했습니다.';
            if (error.message.includes('식당 정보')) {
                errorMessage = '식당 정보를 다시 확인해주세요.';
            } else if (error.message.includes('결과가 유효하지 않습니다')) {
                errorMessage = '제목 생성 중 문제가 발생했습니다.';
            }
            
            // 🚨 중요: 오류 메시지도 안전하게 처리
            const safeErrorMessage = String(errorMessage || 'AI 제목 새로고침에 실패했습니다.').trim();
            setSuggestedTitles([safeErrorMessage]);
        } finally {
            setIsLoadingSuggestions(false);
        }
    }, [restaurant, selectedDate, time, selectedAttendees, description, isLoadingSuggestions]);







    // 일반적인 제목 패턴 생성


















    // 제안 제목 선택 핸들러
    const handleTitleSuggestion = (suggestion) => {
        setTitle(suggestion);
        setSuggestedTitles([]);
    };
    
    // 슬라이더 값 업데이트 함수
    const updateSliderValue = (x) => {
        const clampedX = Math.max(0, Math.min(x, sliderWidth));
        const percentage = clampedX / sliderWidth;
        const newValue = Math.round(2 + percentage * 13); // 2~15 범위
        setSliderValue(newValue);
        
        // 애니메이션 위치 업데이트
        pan.setValue({ x: clampedX, y: 0 });
    };
    
    // 슬라이더 터치 핸들러
    const handleSliderTouch = (evt) => {
        const { locationX } = evt.nativeEvent;
        updateSliderValue(locationX);
    };
    
    // PanResponder 설정
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                pan.setOffset({
                    x: pan.x._value,
                    y: pan.y._value
                });
            },
            onPanResponderMove: (evt, gestureState) => {
                const newX = Math.max(0, Math.min(gestureState.dx, sliderWidth));
                pan.setValue({ x: newX, y: 0 });
                
                // 실시간으로 값 업데이트
                const percentage = newX / sliderWidth;
                const newValue = Math.round(2 + percentage * 13);
                setSliderValue(newValue);
            },
            onPanResponderRelease: () => {
                pan.flattenOffset();
            }
        })
    ).current;

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.formContainer}>
                {/* 제목 입력 */}
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: currentColors.surface,
                    borderWidth: 2,
                    borderColor: currentColors.lightGray,
                    borderRadius: 16,
                    minHeight: 56,
                    marginBottom: 12, // 20에서 12로 줄여서 간격 축소
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
                        returnKeyType="done" // 키보드에 완료 버튼 추가
                        onSubmitEditing={() => {
                            // 완료 버튼 클릭 시 키보드 닫기
                            Keyboard.dismiss();
                        }}
                        blurOnSubmit={true} // 완료 버튼 클릭 시 포커스 해제
                    />
                        <AISuggestionButton
                            onPress={generateTitleSuggestions}
                            loading={isLoadingSuggestions}
                            disabled={!restaurant.trim()}
                        style={{ marginRight: 16 }} // 오른쪽으로 더 이동
                    />
                </View>

                {/* AI 제안 제목 목록 */}
                {suggestedTitles && suggestedTitles.length > 0 && (
                    <View style={{ marginBottom: 12, marginTop: -10 }}> {/* 상단 여백 제거로 더 밀접하게 연결 */}
                <SuggestionsList
                            suggestions={suggestedTitles.filter(title => title && typeof title === 'string')}
                    onSelect={handleTitleSuggestion}
                    visible={suggestedTitles.length > 0}
                            onRefresh={refreshAITitles}
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
                        marginBottom: 12, // 20에서 12로 줄여서 간격 축소
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
                        marginBottom: 12, // 20에서 12로 줄여서 간격 축소
                    }}
                        onPress={() => setDateModalVisible(true)}
                        activeOpacity={0.7}
                    >
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: currentColors.text, fontSize: 16 }}>
                            {selectedDate.toISOString().split('T')[0].replace(/(\d{4})-(\d{2})-(\d{2})/, '$1년 $2월 $3일')} ({['일', '월', '화', '수', '목', '금', '토'][selectedDate.getDay()]})
                        </Text>
                        
                        {/* 반복 일정 정보를 날짜 바로 아래에 표시 (간격 매우 좁게) */}
                        {isRecurring && (
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                marginTop: 2, // 매우 좁은 간격
                                marginBottom: 0,
                            }}>
                                <Ionicons 
                                    name="repeat" 
                                    size={12} // 아이콘 크기 줄임
                                    color={currentColors.primary} 
                                    style={{ marginRight: 3 }} // 간격 줄임
                                />
                                <Text style={{
                                    color: currentColors.primary,
                                    fontSize: 11, // 폰트 크기 줄임
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
                        marginBottom: 12, // 20에서 12로 줄여서 간격 축소
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
                                // 목록이 열려있으면 닫기 + 커서 제거
                                setShowLocationModal(false);
                                if (locationInputRef.current) {
                                    locationInputRef.current.blur(); // 커서 제거
                                }
                            } else {
                                // 목록이 닫혀있으면 열기 + 커서 주기
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
                                // 포커스 시에도 목록이 열려있지 않으면 목록 열기
                                // 단, 사용자가 직접 입력창을 탭한 경우에만 목록 열기
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
                                            // 장소 선택 후 커서 제거
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



                {/* 파티 인원 선택 */}
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
                        onPress={() => {
                            setSliderValue(maxMembers); // 현재 값으로 초기화
                            // 슬라이더 위치 초기화
                            const initialX = ((maxMembers - 2) / 13) * sliderWidth;
                            pan.setValue({ x: initialX, y: 0 });
                            setMaxMembersModalVisible(true);
                        }}
                        activeOpacity={0.7}
                    >
                        <Text style={{ color: currentColors.text, fontSize: 16 }}>
                            파티 인원 {maxMembers}명
                        </Text>
                        <Ionicons name="people" size={20} color={currentColors.textSecondary} />
                    </TouchableOpacity>
                    </View>
                    
                {/* 반복 설정은 이제 날짜 선택 팝업에서 처리됩니다 */}

                {/* 설명 입력 */}
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: currentColors.surface,
                    borderWidth: 2,
                    borderColor: currentColors.lightGray,
                    borderRadius: 16,
                    minHeight: 80, // 100에서 80으로 줄여서 위아래 폭 축소
                    marginBottom: 2, // 4에서 2로 더욱 줄여서 버튼과의 간격을 최소화
                }}>
                    <TextInput
                        style={{
                            backgroundColor: 'transparent',
                            borderWidth: 0,
                            flex: 1,
                            padding: 12, // 16에서 12로 줄여서 위아래 폭 축소
                            fontSize: 16,
                            color: currentColors.text,
                            minHeight: 80, // 100에서 80으로 줄여서 위아래 폭 축소
                            textAlignVertical: 'top',
                        }}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="파티에 대한 설명을 입력하세요 (선택)"
                        placeholderTextColor={currentColors.textSecondary}
                        multiline
                        numberOfLines={4}
                        returnKeyType="done" // 키보드에 완료 버튼 추가
                        onSubmitEditing={() => {
                            // 완료 버튼 클릭 시 키보드 닫기
                            Keyboard.dismiss();
                        }}
                        blurOnSubmit={true} // 완료 버튼 클릭 시 포커스 해제
                    />
                </View>

                {/* 버튼들 */}
                <View style={styles.buttonContainer}>
                    <FormButton
                        title={isLoading ? "파티 생성 중..." : "파티 만들기"}
                        onPress={handleCreate}
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
                // 반복 설정 관련 props 추가
                isRecurring={isRecurring}
                onRecurringChange={setIsRecurring}
                recurrenceType={recurrenceType}
                onRecurrenceTypeChange={setRecurrenceType}
                recurrenceInterval={recurrenceInterval}
                onRecurrenceIntervalChange={setRecurrenceInterval}
                // 반복 종료 조건 관련 props 추가
                endDate={endDate}
                onEndDateChange={handleEndDateChange}
                onEndDateSelect={() => {}} // 빈 함수로 변경 (더 이상 사용하지 않음)
                onOpenEndDateModal={() => {
                    setShowEndDateModal(true);
                }}
            />


            {/* 시간 선택 모달 */}
            <TimePickerModal
                visible={isTimeModalVisible}
                onClose={() => setTimeModalVisible(false)}
                onTimeSelect={handleTimeSelect}
                selectedTime={new Date(`2000-01-01T${time}:00`)}
            />

            {/* 참석자 선택 모달 */}
            <Modal
                visible={showAttendeesModal}
                transparent
                animationType="slide"
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

            {/* 식당 선택 모달 */}
            <Modal
                visible={showRestaurantModal}
                transparent
                animationType="slide"
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
                                        selectedQuickRestaurant === ' 구내식당' && styles.quickRestaurantButtonActive
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
                                {frequentRestaurants.slice(0, 9).map((restaurant) => (
                                    <TouchableOpacity
                                        key={restaurant.id}
                                        style={[
                                            styles.quickRestaurantButton,
                                            selectedQuickRestaurant === restaurant.name && styles.quickRestaurantButtonActive
                                        ]}
                                        onPress={() => handleQuickRestaurantSelect(restaurant.name)}
                                    >
                                        <Text style={[
                                            styles.quickRestaurantText,
                                            selectedQuickRestaurant === restaurant.name && styles.quickRestaurantTextActive
                                        ]}>
                                            {restaurant.name}
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
                                    ({displayedRestaurants.length}개) • {sortBy === 'name' ? '이름순' : 
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
                        {!isSearching && !searchError && restaurantSearchQuery.trim() && displayedRestaurants.length > 0 && (
                            <View style={styles.searchResultsContainer}>
                                <FlatList
                                    data={displayedRestaurants}
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
                                {!isSearching && !searchError && restaurantSearchQuery.trim() && displayedRestaurants.length === 0 && (
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
                                    // 검색한 식당 이름이 있으면 기타 일정 추가 화면의 식당 입력 칸에 자동 입력
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
                                    } else {
                                        searchAllRestaurants();
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
                                    } else {
                                        searchAllRestaurants();
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
                                    } else {
                                        searchAllRestaurants();
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



            {/* 🚨 중요: 종료일자 설정 모달을 DatePickerModal과 같은 레벨에 렌더링 */}
            <EndDateSelectionModal
                visible={showEndDateModal}
                onClose={() => {
                    setShowEndDateModal(false);
                    
                    // 🚨 중요: 종료일자 설정 팝업이 닫힌 후 자동으로 날짜 선택 팝업 열기
                        setDateModalVisible(true);
                }}
                onEndDateChange={(newEndDate) => {
                    handleEndDateChange(newEndDate);
                }}
                endDate={endDate}
                startDate={selectedDate} // 반복 일정 시작일 전달
            />

            {/* 파티 인원 선택 모달 */}
            <Modal
                visible={isMaxMembersModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setMaxMembersModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContainer, { maxHeight: '60%', minHeight: '50%' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>파티 인원 선택</Text>
                            <TouchableOpacity onPress={() => setMaxMembersModalVisible(false)}>
                                <Ionicons name="close" size={24} color={currentColors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        
                        <View style={{ padding: 24, alignItems: 'center' }}>
                            {/* 현재 선택된 값 표시 */}
                            <View style={{
                                backgroundColor: currentColors.primary,
                                borderRadius: 24,
                                paddingVertical: 20,
                                paddingHorizontal: 32,
                                marginBottom: 32,
                                elevation: 3,
                                shadowColor: currentColors.primary,
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.3,
                                shadowRadius: 8
                            }}>
                                <Text style={{
                                    fontSize: 32,
                                    fontWeight: 'bold',
                                    color: '#FFFFFF',
                                    textAlign: 'center'
                                }}>
                                    {sliderValue}명
                                </Text>
                                <Text style={{
                                    fontSize: 14,
                                    color: '#FFFFFF',
                                    textAlign: 'center',
                                    marginTop: 4,
                                    opacity: 0.9
                                }}>
                                    최대 참가자
                                </Text>
                            </View>
                            
                            {/* Range Slider */}
                            <View style={{
                                width: '100%',
                                paddingHorizontal: 20,
                                marginBottom: 32,
                                alignItems: 'center'
                            }}>
                                {/* 범위 표시 */}
                                <View style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    marginBottom: 16,
                                    width: sliderWidth
                                }}>
                                    <Text style={{
                                        fontSize: 14,
                                        color: currentColors.textSecondary,
                                        fontWeight: '500'
                                    }}>
                                        2명
                                    </Text>
                                    <Text style={{
                                        fontSize: 14,
                                        color: currentColors.textSecondary,
                                        fontWeight: '500'
                                    }}>
                                        15명
                                    </Text>
                                </View>
                                
                                {/* Slider Track */}
                                <Animated.View 
                                    ref={sliderRef}
                                    style={{
                                        height: 8,
                                        backgroundColor: currentColors.lightGray,
                                        borderRadius: 4,
                                        position: 'relative',
                                        width: sliderWidth
                                    }}
                                    {...panResponder.panHandlers}
                                >
                                    {/* Active Track */}
                                    <Animated.View style={{
                                        height: 8,
                                        backgroundColor: currentColors.primary,
                                        borderRadius: 4,
                                        width: pan.x.interpolate({
                                            inputRange: [0, sliderWidth],
                                            outputRange: [0, sliderWidth]
                                        })
                                    }} />
                                    
                                    {/* Slider Thumb */}
                                    <Animated.View
                                        style={{
                                            position: 'absolute',
                                            top: -12,
                                            left: pan.x.interpolate({
                                                inputRange: [0, sliderWidth],
                                                outputRange: [0, sliderWidth]
                                            }),
                                            width: 32,
                                            height: 32,
                                            backgroundColor: currentColors.primary,
                                            borderRadius: 16,
                                            borderWidth: 3,
                                            borderColor: '#FFFFFF',
                                            elevation: 4,
                                            shadowColor: currentColors.primary,
                                            shadowOffset: { width: 0, height: 2 },
                                            shadowOpacity: 0.3,
                                            shadowRadius: 4,
                                            transform: [{ translateX: -16 }],
                                            justifyContent: 'center',
                                            alignItems: 'center'
                                        }}
                                    >
                                        <Ionicons 
                                            name="people" 
                                            size={16} 
                                            color="#FFFFFF" 
                                        />
                                    </Animated.View>
                                </Animated.View>
                                
                                {/* 숫자 표시 (2, 4, 6, 8, 10, 12, 15) */}
                                <View style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    marginTop: 16,
                                    width: sliderWidth
                                }}>
                                    {[2, 4, 6, 8, 10, 12, 15].map((num) => (
                                        <Text key={num} style={{
                                            fontSize: 12,
                                            color: currentColors.textSecondary,
                                            fontWeight: '500'
                                        }}>
                                            {num}
                                        </Text>
                                    ))}
                                </View>
                            </View>
                            

                            
                            {/* 확인 버튼 */}
                            <TouchableOpacity
                                style={{
                                    backgroundColor: currentColors.primary,
                                    borderRadius: 12,
                                    paddingVertical: 14,
                                    alignItems: 'center',
                                    marginTop: 8,
                                    elevation: 1,
                                    shadowColor: currentColors.primary,
                                    shadowOffset: { width: 0, height: 1 },
                                    shadowOpacity: 0.1,
                                    shadowRadius: 2
                                }}
                                onPress={() => {
                                    setMaxMembers(sliderValue);
                                    setMaxMembersModalVisible(false);
                                }}
                                activeOpacity={0.7}
                            >
                                <Text style={{
                                    color: '#FFFFFF',
                                    fontSize: 16,
                                    fontWeight: 'bold'
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
