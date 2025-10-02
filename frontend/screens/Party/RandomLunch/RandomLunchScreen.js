import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    FlatList,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Dimensions,
    RefreshControl,
    AsyncStorage
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { IS_DEVELOPMENT } from '../../../config/config';
import { apiClient } from '../../../utils/apiClient';
import unifiedApiClient from '../../../services/UnifiedApiClient';
import * as Notifications from 'expo-notifications';
// 가상 유저 데이터 import 제거

const { width: screenWidth } = Dimensions.get('window');

export default function RandomLunchScreen({ navigation, route }) {
    const { selectedDate, fromPartyTab } = route?.params || {};
    
    // 파티탭에서 호출되었는지 확인
    const isFromPartyTab = fromPartyTab === true;
    
    // currentUser를 global에서 직접 가져오기
    const user = (() => {
        try {
            if (global.currentUser && global.currentUser.employee_id) {
                return global.currentUser;
            }
            return { employee_id: global.myEmployeeId || '1', nickname: '사용자' };
        } catch (error) {
            console.warn('⚠️ [RandomLunch] 사용자 객체 생성 오류, 기본값 사용:', error);
            return { employee_id: '1', nickname: '사용자' };
        }
    })();
    
    // currentColors를 global에서 직접 가져오기
    const safeColors = (() => {
        console.log('🔍 [RandomLunch] 색상 정의 시작');
        console.log('🔍 [RandomLunch] global.currentColors:', global.currentColors);
        
        try {
            if (global.currentColors && global.currentColors.background) {
                console.log('✅ [RandomLunch] global.currentColors 사용:', global.currentColors);
                return global.currentColors;
            }
            const fallbackColors = {
                background: '#FFFFFF',
                surface: '#FFFFFF',
                primary: '#007AFF',
                primaryLight: '#E3F2FD',
                text: '#000000',
                textSecondary: '#666666',
                border: '#E5E5EA'
            };
            console.log('✅ [RandomLunch] fallback 기본값 사용:', fallbackColors);
            return fallbackColors;
        } catch (error) {
            console.error('❌ [RandomLunch] 색상 정의 오류:', error);
            const errorFallbackColors = {
                background: '#FFFFFF',
                surface: '#FFFFFF',
                primary: '#007AFF',
                primaryLight: '#E3F2FD',
                text: '#000000',
                textSecondary: '#666666',
                border: '#E5E5EA'
            };
            console.log('✅ [RandomLunch] 에러 상황용 기본값 사용:', errorFallbackColors);
            return errorFallbackColors;
        }
    })();
    
    // 디버깅: safeColors 최종 결과 확인
    console.log('🔍 [RandomLunch] 최종 safeColors:', safeColors);
    console.log('🔍 [RandomLunch] safeColors.background:', safeColors?.background);
    
    // safeColors가 완전히 정의되었는지 최종 검증
    if (!safeColors || !safeColors.background || !safeColors.primary) {
        console.error('❌ [RandomLunch] safeColors가 불완전합니다:', safeColors);
        // 강제로 안전한 기본값 설정
        const emergencyColors = {
            background: '#FFFFFF',
            surface: '#FFFFFF',
            primary: '#007AFF',
            primaryLight: '#E3F2FD',
            text: '#000000',
            textSecondary: '#666666',
            border: '#E5E5EA'
        };
        console.log('🚨 [RandomLunch] 비상 기본값 사용:', emergencyColors);
        return emergencyColors;
    }
    const [suggestedGroups, setSuggestedGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    // currentGroupIndex는 페이지 인디케이터용으로 사용
    const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
    const [proposedGroups, setProposedGroups] = useState(new Set());
    const [currentDate, setCurrentDate] = useState(null); // null로 초기화
    const [selectedDateIndex, setSelectedDateIndex] = useState(0);
    const [dateOptions, setDateOptions] = useState([]);
    const [displayMonth, setDisplayMonth] = useState(''); // 월 표시용 별도 상태
    const [existingSchedules, setExistingSchedules] = useState(new Set());
    const dateScrollViewRef = useRef(null);
    
    // 그룹 무한 스크롤을 위한 상태들
    const [allPossibleGroups, setAllPossibleGroups] = useState([]);
    const [displayedGroups, setDisplayedGroups] = useState([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [hasMoreGroups, setHasMoreGroups] = useState(true);
    const [isLoadingMoreGroups, setIsLoadingMoreGroups] = useState(false);
    const groupsPerPage = 50; // 더 많은 그룹을 한 번에 표시
    
    // 현재 보고 있는 추천 그룹 인덱스 (페이지 인디케이터용)
    // const [currentGroupIndex, setCurrentGroupIndex] = useState(0); // 중복 선언 제거
    
    // 날짜별 그룹 캐시를 위한 상태
    const [groupsCache, setGroupsCache] = useState({}); // { date: { groups: [], displayedGroups: [] } }
    
    // 제안 정보를 위한 상태들
    const [proposals, setProposals] = useState({ sent_proposals: [], received_proposals: [] });
    const [expandedProposals, setExpandedProposals] = useState(new Set());
    const [groupMembersMap, setGroupMembersMap] = useState({});
    const [confirmedGroups, setConfirmedGroups] = useState([]);
    const [activeTab, setActiveTab] = useState(isFromPartyTab ? 'proposals' : 'groups'); // 파티탭에서 호출된 경우 제안정보 탭으로 시작
    
    // 파티탭에서 호출된 경우 제안정보 탭으로 고정, 홈탭에서 호출된 경우 추천그룹 탭으로 설정
    // const finalActiveTab = isFromPartyTab ? 'proposals' : 'groups';
    
    // 사용자가 탭을 클릭할 수 있도록 activeTab 상태를 사용
    const finalActiveTab = activeTab;

    // 제안 상태를 AsyncStorage에 저장
    const saveProposalsToStorage = async (proposalsData, proposedGroupsData) => {
        try {
            const storageKey = `proposals_${user?.employee_id || 'default'}`;
            const dataToSave = {
                proposals: proposalsData,
                proposedGroups: Array.from(proposedGroupsData),
                timestamp: Date.now()
            };
            await AsyncStorage.setItem(storageKey, JSON.stringify(dataToSave));
            console.log('✅ 제안 상태를 로컬에 저장 완료');
        } catch (error) {
            console.error('❌ 제안 상태 저장 실패:', error);
        }
    };

    // AsyncStorage에서 제안 상태 복원
    const loadProposalsFromStorage = async () => {
        try {
            const storageKey = `proposals_${user?.employee_id || 'default'}`;
            const storedData = await AsyncStorage.getItem(storageKey);
            
            if (storedData) {
                const parsedData = JSON.parse(storedData);
                const isExpired = Date.now() - parsedData.timestamp > 24 * 60 * 60 * 1000; // 24시간 만료
                
                if (!isExpired) {
                    setProposals(parsedData.proposals || { sent_proposals: [], received_proposals: [] });
                    setProposedGroups(new Set(parsedData.proposedGroups || []));
                    console.log('✅ 로컬에서 제안 상태 복원 완료');
                    return true;
                } else {
                    console.log('🕐 저장된 제안 상태가 만료됨 - 삭제');
                    await AsyncStorage.removeItem(storageKey);
                }
            }
        } catch (error) {
            console.error('❌ 제안 상태 복원 실패:', error);
        }
        return false;
    };

    // 컴포넌트 마운트 시 강제 초기화 및 기본 탭 설정
    useEffect(() => {
        // 전체 정리 후 컴포넌트가 마운트된 경우 즉시 초기화
        if (global.lastCleanupTime) {
            // 즉시 모든 상태 초기화
            setSuggestedGroups([]);
            setProposedGroups(new Set());
            setProposals({ sent_proposals: [], received_proposals: [] });
            setExpandedProposals(new Set());
            setGroupMembersMap({});
            setConfirmedGroups([]);
            setAllPossibleGroups([]);
            setDisplayedGroups([]);
            setCurrentPage(0);
            setHasMoreGroups(true);
            setGroupsCache({});
        }
        
        // 파티탭이 아닌 경우(홈탭)에는 기본 탭을 "추천 그룹"으로 설정
        if (!isFromPartyTab) {
            setActiveTab('groups');
        }
    }, []); // 빈 의존성 배열로 마운트 시에만 실행

    // proposals 상태 변화 감지
    useEffect(() => {
        // 제안 목록이 비어있지 않으면 즉시 초기화 시도
        if (proposals.sent_proposals.length > 0 || proposals.received_proposals.length > 0) {
            // 강제 초기화가 필요한 상황인지 확인
            if (global.lastCleanupTime) {
                setProposals({ sent_proposals: [], received_proposals: [] });
                setProposedGroups(new Set());
                setConfirmedGroups([]);
            }
        }
    }, [proposals]);

    // confirmedGroups가 변경될 때 홈탭 일정에 반영
    useEffect(() => {
        if (confirmedGroups.length > 0 && global.updateHomeSchedule) {
            confirmedGroups.forEach(group => {
                // 홈탭 일정 형식으로 변환
                const homeEvent = {
                    id: group.id,
                    title: group.title || `🍽️ ${group.party_date} 점심 모임`,
                    date: group.party_date,
                    time: group.party_time || '11:30', // 기본값을 11:30으로 설정
                    type: 'random_lunch', // 🚨 중요: 랜덤런치 타입으로 변경
                    status: 'confirmed',
                    isConfirmed: true,
                    current_members: group.current_members,
                    max_members: group.max_members,
                    restaurant_name: group.restaurant_name || '미정', // 기본값을 '미정'으로 설정
                    meeting_location: group.meeting_location || '본관 1층 로비', // 기본값을 '본관 1층 로비'로 설정
                    is_from_match: true, // 랜덤런치에서 온 그룹임을 표시
                    // 홈탭에서 필요한 추가 필드들
                    party_date: group.party_date,
                    party_time: group.party_time || '11:30', // 기본값을 11:30으로 설정
                    members: group.members || group.users || []
                };
                
                // 홈탭 일정에 추가
                global.updateHomeSchedule(homeEvent, 'add');
            });
        }
    }, [confirmedGroups]);

    // 화면에 포커스될 때마다 전역 변수 상태 확인 및 초기화
    useFocusEffect(
        useCallback(() => {
            console.log('🔍 [RandomLunch] useFocusEffect 실행');
            console.log('🔍 [RandomLunch] safeColors:', safeColors);
            console.log('🔍 [RandomLunch] user:', user);
            console.log('🔍 [RandomLunch] route.params:', route?.params);
            
            // 🚨 중요: 화면 포커스 시 스크롤 위치 초기화
            if (dateScrollViewRef.current) {
                // 날짜 스크롤뷰를 맨 위로 리셋
                dateScrollViewRef.current.scrollTo({ x: 0, y: 0, animated: false });
            }
            
            // 🚨 중요: 화면 포커스 시 레이아웃 안정화
            // 약간의 지연 후 추가 정리 작업 수행
            setTimeout(() => {
                if (dateScrollViewRef.current) {
                    // 날짜 스크롤뷰 위치 재확인 및 조정
                    dateScrollViewRef.current.scrollTo({ x: 0, y: 0, animated: false });
                }
                
                // 파티탭이 아닌 경우(홈탭)에는 기본 탭을 "추천 그룹"으로 설정
                if (!isFromPartyTab) {
                    setActiveTab('groups');
                }
            }, 100);
            
            // 강제 초기화: 전체 정리 후에는 무조건 초기화
            const shouldForceClear = global.partyDataCleared || global.forceEmptyParties || 
                global.emergencyPartyCleanup || global.randomLunchProposalsCleared || 
                global.forceEmptyRandomLunch || global.lastCleanupTime;
            
            // 디버깅을 위한 로그 추가 (주석 처리)
            // console.log('🔍 [랜덤런치] useFocusEffect - 전역 변수 상태:', {
            //     partyDataCleared: global.partyDataCleared,
            //     forceEmptyParties: global.forceEmptyParties,
            //     emergencyPartyCleanup: global.emergencyPartyCleanup,
            //     randomLunchProposalsCleared: global.randomLunchProposalsCleared,
            //     forceEmptyRandomLunch: global.forceEmptyRandomLunch,
            //     lastCleanupTime: global.lastCleanupTime,
            //     shouldForceClear
            // });
            
            // 즉시 강제 초기화: 전체 정리 후에는 무조건 실행
            if (global.lastCleanupTime) {
                // console.log('🚨 [랜덤런치] global.lastCleanupTime 감지 - 강제 초기화 실행');
                
                // 즉시 모든 상태 초기화
                setSuggestedGroups([]);
                setProposedGroups(new Set());
                setProposals({ sent_proposals: [], received_proposals: [] });
                setExpandedProposals(new Set());
                setGroupMembersMap({});
                setConfirmedGroups([]);
                setAllPossibleGroups([]);
                setDisplayedGroups([]);
                setCurrentPage(0);
                setHasMoreGroups(true);
                setGroupsCache({});
                
                // global.lastCleanupTime 해제 (무한 루프 방지)
                if (typeof global !== 'undefined') {
                    global.lastCleanupTime = null;
                    // console.log('✅ [랜덤런치] global.lastCleanupTime 해제 완료');
                }
                
                // 초기화 후 데이터 다시 로드
                setTimeout(() => {
                    fetchSuggestedGroups();
                    fetchConfirmedGroups();
                    fetchMyProposals();
                }, 100);
            }
            
            // 전역 변수에서 데이터 정리 플래그 확인 또는 강제 초기화
            if (shouldForceClear) {
                // console.log('🚨 [랜덤런치] 강제 초기화 플래그 감지 - 초기화 실행');
                
                // 모든 상태 변수 초기화
                setSuggestedGroups([]);
                setProposedGroups(new Set());
                setProposals({ sent_proposals: [], received_proposals: [] });
                setExpandedProposals(new Set());
                setGroupMembersMap({});
                setConfirmedGroups([]);
                setAllPossibleGroups([]);
                setDisplayedGroups([]);
                setCurrentPage(0);
                setHasMoreGroups(true);
                setGroupsCache({});
                
                // 전역 변수도 초기화
                if (typeof global !== 'undefined') {
                    global.confirmedGroups = [];
                    global.proposals = { sent_proposals: [], received_proposals: [] };
                    global.expandedProposals = new Set();
                    global.groupMembersMap = {};
                    global.randomLunchGroups = [];
                    global.randomLunchProposals = [];
                    global.suggestedGroups = [];
                    global.proposedGroups = new Set();
                    
                    // 강제 초기화 완료 플래그 설정
                    global.randomLunchForceCleared = true;
                    global.randomLunchInitialized = true;
                    
                    // 강제 초기화 플래그들 해제 (무한 루프 방지)
                    global.partyDataCleared = false;
                    global.forceEmptyParties = false;
                    global.emergencyPartyCleanup = false;
                    global.randomLunchProposalsCleared = false;
                    global.forceEmptyRandomLunch = false;
                    global.lastCleanupTime = null;
                    
                    // console.log('✅ [랜덤런치] 강제 초기화 플래그 해제 완료');
                }
                
                // 초기화 후 데이터 다시 로드
                setTimeout(() => {
                    fetchSuggestedGroups();
                    fetchConfirmedGroups();
                    fetchMyProposals();
                }, 200);
            }
        }, [])
    );

    // 날짜 옵션 생성 (한 달로 제한)
    useEffect(() => {
        const generateDateOptions = () => {
            const options = [];
            const today = new Date();
            
            // 한 달 (30일) 동안의 날짜만 생성
            for (let i = 0; i < 30; i++) {
                const date = new Date(today);
                date.setDate(today.getDate() + i);
                
                // 주말 제외 (토요일=6, 일요일=0)
                const dayOfWeek = date.getDay();
                if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                    const month = date.getMonth() + 1;
                    options.push({
                        date: date.toISOString().split('T')[0],
                        day: date.getDate(),
                        weekday: date.toLocaleDateString('ko-KR', { weekday: 'short' }),
                        month: month,
                        isWeekend: false
                    });
                }
            }
            setDateOptions(options);
            
            // 오늘 날짜를 기본으로 선택하고 currentDate 설정
            setSelectedDateIndex(0);
            if (options.length > 0) {
                setCurrentDate(options[0].date);
                // 초기 displayMonth 설정
                const initialMonth = `${options[0].month}월`;
                setDisplayMonth(initialMonth);
            }
        };
        
        generateDateOptions();
    }, []);

    // 무한 로딩 함수 제거 - 사용하지 않는 코드 정리

    // 더 많은 그룹 로딩
    const loadMoreGroups = useCallback(() => {
        if (isLoadingMoreGroups || !hasMoreGroups) return;
        
        setIsLoadingMoreGroups(true);
        
        setTimeout(() => {
            const nextPage = currentPage + 1;
            const startIndex = (nextPage - 1) * groupsPerPage;
            const endIndex = startIndex + groupsPerPage;
            const newGroups = allPossibleGroups.slice(startIndex, endIndex);
            
            if (newGroups.length > 0) {
                setDisplayedGroups(prev => [...prev, ...newGroups]);
                setCurrentPage(nextPage);
                setHasMoreGroups(endIndex < allPossibleGroups.length);
            } else {
                setHasMoreGroups(false);
            }
            
            setIsLoadingMoreGroups(false);
        }, 300);
    }, [currentPage, hasMoreGroups, allPossibleGroups, isLoadingMoreGroups]);

    // 날짜 변경 시 그룹 재생성 (실제 선택된 날짜일 때만)
    useEffect(() => {
        if (currentDate && dateOptions.length > 0 && selectedDateIndex >= 0) {
            // 실제로 선택된 날짜와 currentDate가 일치할 때만 그룹 생성
            const selectedDateOption = dateOptions[selectedDateIndex];
            if (selectedDateOption && selectedDateOption.date === currentDate) {
                // 깜빡임 방지: 캐시에서 이미 해당 날짜의 그룹이 로딩되어 있으면 로딩 상태를 설정하지 않음
                const isAlreadyLoaded = groupsCache[currentDate];
                
                if (!isAlreadyLoaded) {
                    setIsGeneratingGroups(true); // 캐시에 없는 새로운 날짜일 때만 그룹 생성 상태 설정
                }
                
                // 깜빡임 방지: 로딩 상태를 즉시 설정하지 않고 약간의 지연 후 설정
                const timer = setTimeout(() => {
                    generateAllPossibleGroups(currentDate);
                    
                    // 그룹 생성 완료 후 스크롤 위치 복원
                    setTimeout(() => {
                        if (dateScrollViewRef.current && lastScrollPositionRef.current > 0) {
                            // 스크롤 위치 복원 시도
                            try {
                                dateScrollViewRef.current.scrollTo({
                                    x: lastScrollPositionRef.current,
                                    animated: false
                                });
                            } catch (error) {
                                // 스크롤 위치 복원 실패 시 무시
                            }
                        }
                    }, 300); // 그룹 렌더링 완료 후 복원
                }, 100); // 100ms 지연으로 깜빡임 방지
                
                return () => clearTimeout(timer); // cleanup
            }
        }
    }, [currentDate, selectedDateIndex, generateAllPossibleGroups, dateOptions, displayedGroups.length, allPossibleGroups.length, groupsCache]);

    // 사용자의 기존 점심 일정 가져오기
    useEffect(() => {
        try {
            fetchExistingSchedules();
            fetchConfirmedGroups();
            fetchMyProposals();
            fetchSuggestedGroups(); // 추천 그룹 가져오기 추가
        } catch (error) {
            // 초기 데이터 로딩 오류 시 무시
        }
        
        // 컴포넌트 언마운트 시 타이머 정리
        return () => {
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, []);

    // 🚨 중요: 추천 그룹 가져오기 함수 추가
    const fetchSuggestedGroups = async () => {
        try {
            setLoading(true);
            
            // 안전한 사용자 ID 가져오기
            const userId = (() => {
                try {
                    if (user && user.employee_id) {
                        return user.employee_id;
                    }
                    if (global.myEmployeeId) {
                        return global.myEmployeeId;
                    }
                    return '1';
                } catch (error) {
                    console.warn('⚠️ [RandomLunch] 사용자 ID 생성 오류, 기본값 사용:', error);
                    return '1';
                }
            })();
            
            // 먼저 백엔드 API 시도 (통합 API 클라이언트 사용)
            try {
                const responseData = await unifiedApiClient.get(`/dev/random-lunch/${userId}`);
                
                // console.log('🔍 [랜덤런치] 백엔드 API 응답:', response.status, responseData);
                
                // API 응답 구조에 따라 데이터 추출
                let groupsData = [];
                if (response.ok && responseData) {
                    if (Array.isArray(responseData)) {
                        groupsData = responseData;
                    } else if (responseData.parties && Array.isArray(responseData.parties)) {
                        groupsData = responseData.parties;
                    } else if (responseData.groups && Array.isArray(responseData.groups)) {
                        groupsData = responseData.groups;
                    }
                }
                
                // 3명을 초과하는 그룹은 제외
                groupsData = groupsData.filter(data => {
                    const memberCount = data.members ? data.members.length : 0;
                    const currentCount = data.current_members || memberCount;
                    return currentCount <= 3;
                });
                
                if (groupsData && groupsData.length > 0) {
                    // API가 배열을 반환하므로 각 그룹을 변환
                    // 최대 3명까지만 허용하도록 필터링
                    const validGroupsData = groupsData.filter(data => 
                        (data.members && data.members.length <= 3) || 
                        (data.current_members && data.current_members <= 3)
                    );
                    
                    const virtualGroups = validGroupsData.map(data => ({
                        id: data.id,
                        date: data.date,
                        members: data.members,
                        status: data.status,
                        created_at: data.created_at,
                        score: data.score || 0,
                        // 화면 표시용 추가 필드
                        title: `🍽️ ${data.date} 점심 모임`,
                        current_members: Math.min(data.current_members || data.members.length, 3),
                        max_members: 3, // 최대 3명으로 제한
                        restaurant_name: '추천 식당',
                        party_date: data.date,
                        party_time: '12:00',
                        users: data.members.slice(0, 3).map(memberId => { // 최대 3명까지만
                            // memberId를 기반으로 실제 닉네임 가져오기
                            // 실제 사용자 데이터에서 닉네임 가져오기
                            const getNickname = (employeeId) => {
                                const user = data.users.find(u => u.employee_id === employeeId);
                                return user ? user.nickname : `사용자${employeeId}`;
                            };
                            return {
                                employee_id: memberId,
                                nickname: getNickname(memberId),
                                profile_image: null
                            };
                        })
                    }));
                    
                    // 모든 상태를 올바르게 설정
                    setSuggestedGroups(virtualGroups);
                    setAllPossibleGroups(virtualGroups);
                    setDisplayedGroups(virtualGroups.slice(0, groupsPerPage));
                    setCurrentPage(0);
                    setHasMoreGroups(virtualGroups.length > groupsPerPage);
                    // console.log('✅ [랜덤런치] 백엔드 API로', virtualGroups.length, '개 그룹 매칭 완료');
                    return;
                } else {
                    // console.log('📭 [랜덤런치] 백엔드 API에서 그룹 데이터가 없음, 로컬 가상 그룹 생성으로 대체');
                }
            } catch (apiError) {
                // console.log('🔧 [랜덤런치] 백엔드 API 호출 실패, 로컬 가상 그룹 생성으로 대체:', apiError.message);
            }
            
            // 백엔드 API 실패 시 로컬에서 가상 그룹 생성
            const today = new Date();
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            const todayStr = today.toISOString().split('T')[0];
            const tomorrowStr = tomorrow.toISOString().split('T')[0];
            
            // 오늘과 내일 날짜에 대해 가상 그룹 생성
            const todayGroups = generateLocalVirtualGroupsForDate(todayStr);
            const tomorrowGroups = generateLocalVirtualGroupsForDate(tomorrowStr);
            
            const allLocalGroups = [...todayGroups, ...tomorrowGroups];
            
            // 모든 상태를 올바르게 설정
            setSuggestedGroups(allLocalGroups);
            setAllPossibleGroups(allLocalGroups);
            setDisplayedGroups(allLocalGroups.slice(0, groupsPerPage));
            setCurrentPage(0);
            setHasMoreGroups(allLocalGroups.length > groupsPerPage);
            
            // console.log('✅ [랜덤런치] 로컬 가상 그룹으로', allLocalGroups.length, '개 그룹 생성 완료 (오늘:', todayGroups.length, '개, 내일:', tomorrowGroups.length, '개)');
            
        } catch (error) {
            console.error('🔍 [랜덤런치] 가상 그룹 매칭 오류:', error);
            // 에러 발생 시에도 로컬 가상 그룹 생성 시도
            const today = new Date();
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            const todayStr = today.toISOString().split('T')[0];
            const tomorrowStr = tomorrow.toISOString().split('T')[0];
            
            try {
                const todayGroups = generateLocalVirtualGroupsForDate(todayStr);
                const tomorrowGroups = generateLocalVirtualGroupsForDate(tomorrowStr);
                
                const allLocalGroups = [...todayGroups, ...tomorrowGroups];
                
                // 모든 상태를 올바르게 설정
                setSuggestedGroups(allLocalGroups);
                setAllPossibleGroups(allLocalGroups);
                setDisplayedGroups(allLocalGroups.slice(0, groupsPerPage));
                setCurrentPage(0);
                setHasMoreGroups(allLocalGroups.length > groupsPerPage);
                
                console.log('✅ [랜덤런치] 에러 복구로 로컬 가상 그룹 생성 완료:', allLocalGroups.length, '개');
            } catch (localError) {
                console.error('❌ [랜덤런치] 로컬 가상 그룹 생성도 실패:', localError);
                setSuggestedGroups([]);
            }
        } finally {
            setLoading(false);
        }
    };

    // 주기적 폴링을 위한 상태 (UI 표시 없음)
    const [pollingInterval, setPollingInterval] = useState(null);

    // 주기적 폴링 설정 (30초마다, 조용히 실행)
    useEffect(() => {
        const interval = setInterval(() => {
            // 제안 상태 새로고침
            fetchMyProposals();
            
            // 현재 선택된 날짜의 그룹 정보도 새로고침
            if (currentDate && !isGeneratingGroups) {
                generateAllPossibleGroups(currentDate);
            }
        }, 30000); // 30초마다

        setPollingInterval(interval);

        // 컴포넌트 언마운트 시 정리
        return () => {
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [currentDate, isGeneratingGroups]);

    // 스크롤 중인지 추적하는 상태
    const [isScrolling, setIsScrolling] = useState(false);
    const scrollTimeoutRef = useRef(null);
    const lastScrollPositionRef = useRef(0); // 스크롤 위치 보존용

    // 스크롤 시작 시 호출
    const handleScrollBegin = useCallback(() => {
        setIsScrolling(true);
        // 기존 타이머가 있다면 제거
        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }
    }, []);

    // 스크롤 종료 시 호출
    const handleScrollEnd = useCallback(() => {
        // 스크롤이 끝난 후 150ms 뒤에 스크롤 상태 해제 (더 안정적으로)
        scrollTimeoutRef.current = setTimeout(() => {
            setIsScrolling(false);
        }, 150);
    }, []);

    // 그룹 매칭 점수 계산 함수
    const calculateGroupScore = useCallback((group, date = null) => {
        let totalScore = 0;
        
        // 그룹 크기 점수 (2-4명만 허용, 3명이 최적)
        const groupSize = group.users.length;
        if (groupSize > 4) return 0; // 4명 초과 그룹은 제외
        
        if (groupSize === 3) totalScore += 30;
        else if (groupSize === 4) totalScore += 25;
        else if (groupSize === 2) totalScore += 20;
        else totalScore += 10;
        
        // 사용자별 호환성 점수 계산
        for (let i = 0; i < group.users.length; i++) {
            for (let j = i + 1; j < group.users.length; j++) {
                const user1 = group.users[i];
                const user2 = group.users[j];
                
                // 음식 선호도 호환성
                if (user1.main_dish_genre && user2.main_dish_genre) {
                    const genres1 = user1.main_dish_genre.split(',').map(g => g.trim());
                    const genres2 = user2.main_dish_genre.split(',').map(g => g.trim());
                    const commonGenres = genres1.filter(g => genres2.includes(g));
                    if (commonGenres.length > 0) totalScore += 15;
                }
                
                // 점심 성향 호환성
                if (user1.lunch_preference && user2.lunch_preference) {
                    if (user1.lunch_preference === user2.lunch_preference) {
                        totalScore += 20;
                    }
                }
                
                // 선호 시간 호환성 (새로 추가)
                if (user1.preferred_time && user2.preferred_time) {
                    if (user1.preferred_time === user2.preferred_time) {
                        totalScore += 15;
                    }
                }
                
                // 알러지 정보 호환성 (새로 추가)
                if (user1.allergies && user2.allergies) {
                    const allergies1 = user1.allergies.split(',').map(a => a.trim());
                    const allergies2 = user2.allergies.split(',').map(a => a.trim());
                    const commonAllergies = allergies1.filter(a => allergies2.includes(a));
                    if (commonAllergies.length > 0) totalScore += 10;
                }
                
                // 마지막 점심 시간 (오래된 관계일수록 높은 점수)
                if (user1.last_lunch && user2.last_lunch) {
                    if (user1.last_lunch === '처음' || user2.last_lunch === '처음') {
                        totalScore += 25; // 새로운 관계
                    } else if (user1.last_lunch.includes('주 전') || user2.last_lunch.includes('주 전')) {
                        totalScore += 15; // 오래된 관계
                    }
                }
            }
        }
        
        // 날짜별로 다른 랜덤 점수 생성 (0-15점)
        let randomScore = 0;
        if (date) {
            // 날짜를 시드로 사용하여 랜덤 점수 생성
            const dateSeed = date.split('-').join('');
            const seed = parseInt(dateSeed) % 10000;
            randomScore = (seed * 9301 + 49297) % 233280;
            randomScore = (randomScore / 233280) * 16; // 0-15점
        } else {
            randomScore = Math.floor(Math.random() * 16);
        }
        
        totalScore += Math.floor(randomScore);
        
        return totalScore;
    }, []);

    // 모든 가능한 그룹 조합 생성
    const generateAllPossibleGroups = useCallback(async (date) => {
        if (!date) return; // date가 없으면 함수 종료
        
        // 캐시에서 이미 로딩된 그룹이 있는지 확인
        if (groupsCache[date]) {
            const cachedData = groupsCache[date];
            
            // 캐시된 데이터로 모든 상태 업데이트
            setAllPossibleGroups(cachedData.groups);
            setHasMoreGroups(cachedData.groups.length > groupsPerPage);
            setDisplayedGroups(cachedData.displayedGroups);
            setCurrentPage(1);
            setIsGeneratingGroups(false); // loading 대신 isGeneratingGroups 사용
            
            return;
        }
        
        try {
            setIsGeneratingGroups(true); // 그룹 생성 시작
            
                    // API 호출 시작 (로그 간소화)
            
            // 개발용 랜덤런치 API 사용 (더 많은 그룹 생성) - 통합 API 클라이언트 사용
            const response = await unifiedApiClient.get(`/dev/random-lunch/${user.employee_id || '1'}`);
            
            // API 응답 상태 확인 (로그 간소화)
            
            if (response.ok) {
                const responseData = await response.json();
                
                // API 응답에서 groupsData 배열 추출
                const groupsData = responseData.groupsData || [];
                
                // API 응답 검증
                if (!Array.isArray(groupsData)) {
                    console.error('🔍 [랜덤런치] API 응답 오류: groupsData가 배열이 아님:', groupsData);
                    setIsGeneratingGroups(false);
                    return;
                }
                
                console.log('🔍 [랜덤런치] API 응답:', groupsData.length, '개 그룹');
                
                // groupsData 배열을 그룹으로 변환
                const groups = groupsData.map(data => {
                    // 데이터 검증 - 백엔드 응답 구조에 맞춤
                    if (!data || !data.users || !Array.isArray(data.users)) {
                        console.warn('🔍 [랜덤런치] 잘못된 그룹 데이터:', data);
                        return null;
                    }
                    
                    // 백엔드 응답 구조를 프론트엔드 구조로 변환
                    const virtualGroup = {
                        id: data.group_id || data.id, // group_id 사용
                        date: date, // 현재 선택된 날짜 사용
                        members: data.users.map(user => user.employee_id), // users 배열에서 employee_id 추출
                        status: 'open', // 기본 상태
                        created_at: new Date().toISOString(), // 현재 시간
                        score: data.score || 0,
                        // 화면 표시용 추가 필드
                        title: `🍽️ ${date} 점심 모임 (${data.users.length}인 그룹)`,
                        current_members: data.users.length,
                        max_members: Math.min(data.max_members || 3, 3), // 최대 3명으로 제한
                        restaurant_name: '추천 식당',
                        party_date: date,
                        party_time: '12:00',
                        group_type: data.group_type || '그룹',
                        can_join: data.can_join || true, // 현재 사용자가 참여 가능
                        is_recommended: true, // 추천 그룹임을 명시
                        users: data.users.map(user => {
                            return {
                                employee_id: user.employee_id,
                                nickname: user.nickname || `사용자${user.employee_id}`,
                                profile_url: user.profile_url || null,
                                main_dish_genre: user.main_dish_genre || '한식,중식',
                                lunch_preference: user.lunch_preference || '맛집 탐방',
                                preferred_time: user.preferred_time || '12:00',
                                allergies: Array.isArray(user.allergies) ? user.allergies.join(', ') : (user.allergies || '없음'),
                                last_lunch: user.last_lunch || '처음'
                            };
                        })
                    };
                    return virtualGroup;
                }).filter(group => group !== null); // null 값 제거
                
                // 그룹이 없는 경우 처리
                if (groups.length === 0) {
                    console.warn('🔍 [랜덤런치] 생성된 그룹이 없음');
                    setIsGeneratingGroups(false);
                    return;
                }
                
                // 유효한 그룹 수 (로그 간소화)
                
                // 각 그룹에 매칭 점수 계산 (날짜별로 다른 점수)
                const scoredGroups = groups.map(group => ({
                    ...group,
                    date: date, // 날짜 정보 추가
                    score: calculateGroupScore(group, date) // 날짜 정보 전달
                }));
                
                // 3명 그룹 우선, 점수 순으로 정렬
                const sortedGroups = scoredGroups.sort((a, b) => {
                    // 3명 그룹 우선
                    if (a.current_members === 3 && b.current_members !== 3) return -1;
                    if (a.current_members !== 3 && b.current_members === 3) return 1;
                    
                    // 같은 인원수일 때는 점수 순
                    return b.score - a.score;
                });
                
                // 강력한 랜덤 셔플링 적용
                const shuffledGroups = [...sortedGroups];
                
                // Fisher-Yates 셔플 알고리즘으로 전체 그룹 순서를 섞음
                for (let i = shuffledGroups.length - 1; i > 0; i--) {
                    // 날짜별로 다른 시드를 사용하여 랜덤 인덱스 생성
                    const dateSeed = date.split('-').join('');
                    const seed = parseInt(dateSeed) % 10000;
                    const randomSeed = (seed * 9301 + 49297) % 233280;
                    const j = Math.floor((randomSeed / 233280) * (i + 1));
                    
                    // 그룹 순서 교환
                    [shuffledGroups[i], shuffledGroups[j]] = [shuffledGroups[j], shuffledGroups[i]];
                }
                
                // 최종 검증
                if (!shuffledGroups || shuffledGroups.length === 0) {
                    console.error('🔍 [랜덤런치] 최종 그룹 배열이 비어있음');
                    setIsGeneratingGroups(false);
                    return;
                }
                
                // 캐시에 저장
                const cacheData = {
                    groups: shuffledGroups,
                    displayedGroups: shuffledGroups.slice(0, groupsPerPage)
                };
                setGroupsCache(prev => ({
                    ...prev,
                    [date]: cacheData
                }));
                
                // 깜빡임 방지: 모든 상태를 한 번에 업데이트
                setAllPossibleGroups(shuffledGroups);
                setHasMoreGroups(shuffledGroups.length > groupsPerPage);
                setDisplayedGroups(shuffledGroups.slice(0, groupsPerPage));
                setCurrentPage(1);
                
                // 그룹 생성 완료
                setIsGeneratingGroups(false);
                console.log('✅ [랜덤런치]', shuffledGroups.length, '개 그룹 생성 완료');
                
            } else {
                // API 응답 오류 시에도 기존 그룹을 유지 (빈 화면 방지)
                console.error('🔍 [랜덤런치] API 응답 오류:', response.status, response.statusText);
                setIsGeneratingGroups(false); // 에러 시에도 그룹 생성 상태 해제
            }
        } catch (error) {
            // 에러 시에도 기존 그룹을 유지 (빈 화면 방지)
            console.error('🔍 [랜덤런치] 가상 그룹 매칭 오류:', error);
            setIsGeneratingGroups(false); // 에러 시에도 그룹 생성 상태 해제
        }
    }, [user.employee_id, calculateGroupScore, displayedGroups.length, groupsPerPage, groupsCache]);

    const fetchExistingSchedules = async () => {
        // 🚨 중요: 개발 환경에서도 API 호출 활성화 (테스트를 위해)
        // if (IS_DEVELOPMENT) {
        //     console.log('🔧 [랜덤런치] 개발 환경 - 기존 일정 조회 API 호출 우회');
        //     setExistingSchedules(new Set());
        //     return;
        // }
        
        try {
            const employeeId = user?.employee_id || global.myEmployeeId || 'default_id';
            const response = await unifiedApiClient.get(`/events/${employeeId}`);
            if (response.ok) {
                const data = await response.json();
                const scheduleDates = new Set();
                
                // 모든 날짜의 이벤트를 확인
                Object.keys(data).forEach(date => {
                    if (data[date] && data[date].length > 0) {
                        scheduleDates.add(date);
                    }
                });
                
                setExistingSchedules(scheduleDates);
            } else {
                console.warn('기존 일정 조회 API 오류:', response.status);
                setExistingSchedules(new Set());
            }
        } catch (error) {
            console.error('❌ [랜덤런치] 기존 일정 조회 네트워크 오류:', error);
            console.error('❌ [랜덤런치] 오류 타입:', error.constructor.name);
            console.error('❌ [랜덤런치] 오류 메시지:', error.message);
            console.error('❌ [랜덤런치] 오류 스택:', error.stack);
            
            // 🚨 중요: 네트워크 오류 시 개발 환경 우회 로직 활성화
            if (error.message === 'Network request failed' || error.message.includes('Network')) {
                console.warn('🔄 [랜덤런치] 네트워크 오류 감지 - 개발 환경 우회 로직 활성화');
                setExistingSchedules(new Set());
                return;
            }
            
            setExistingSchedules(new Set());
        }
    };

    // 현재 선택된 날짜의 월 표시 업데이트
    const getCurrentMonthText = () => {
        // displayMonth가 있으면 사용, 없으면 선택된 날짜의 월 사용
        if (displayMonth) {
            return displayMonth;
        }
        if (dateOptions.length > 0 && selectedDateIndex >= 0) {
            const selectedDateObj = dateOptions[selectedDateIndex];
            const dateObj = new Date(selectedDateObj.date);
            return `${dateObj.getMonth() + 1}월`;
        }
        return '';
    };

    // 화면이 포커스될 때마다 제안 상태 새로고침 - 현재 사용하지 않음

    const fetchMyProposals = async () => {
        // 🚨 중요: 개발 환경에서도 API 호출 활성화 (테스트를 위해)
        // if (IS_DEVELOPMENT) {
        //     console.log('🔧 [랜덤런치] 개발 환경 - 제안 조회 API 호출 우회');
        //     setProposals({ sent_proposals: [], received_proposals: [] });
        //     setProposedGroups(new Set());
        //     return;
        // }
        
        // 🚨 중요: 네트워크 연결 상태 확인 (통합 API 클라이언트 사용)
        try {
            // 통합 API 클라이언트가 초기화되었는지 확인
            if (!unifiedApiClient) {
                console.warn('⚠️ [랜덤런치] API 클라이언트가 초기화되지 않음 - 제안 조회 건너뜀');
                setProposals({ sent_proposals: [], received_proposals: [] });
                setProposedGroups(new Set());
                return;
            }
        } catch (error) {
            console.warn('⚠️ [랜덤런치] API 클라이언트 확인 실패 - 제안 조회 건너뜀:', error);
            setProposals({ sent_proposals: [], received_proposals: [] });
            setProposedGroups(new Set());
            return;
        }
        
        // 초기화 플래그가 설정되어 있으면 API 호출 차단
        if (global.randomLunchProposalsCleared || global.forceEmptyRandomLunch || 
            global.partyDataCleared || global.forceEmptyParties || 
            global.randomLunchForceCleared || global.randomLunchInitialized) {
            setProposals({ sent_proposals: [], received_proposals: [] });
            setProposedGroups(new Set());
            return;
        }
        try {
            // 🚨 중요: 사용자 ID가 없을 때 대체 로직
            const employeeId = user?.employee_id || global.myEmployeeId || 'default_id';
            if (!employeeId || employeeId === 'default_id') {
                console.warn('⚠️ [랜덤런치] 사용자 ID가 없어서 제안 조회를 건너뜁니다');
                setProposals({ sent_proposals: [], received_proposals: [] });
                setProposedGroups(new Set());
                return;
            }
            
            const response = await unifiedApiClient.get(`/api/proposals/mine?employee_id=${employeeId}`);
            const data = await response.json();
            

            
            if (response.ok) {

                
                // 취소된 제안만 제거
                const filterProposals = (proposals) => proposals.filter(p => p.status !== 'cancelled');
                const filteredData = {
                    sent_proposals: filterProposals(data.sent_proposals || []),
                    received_proposals: filterProposals(data.received_proposals || [])
                };
                
                setProposals(filteredData);
                
                // 보낸 제안들의 그룹 멤버 정보를 바로 가져오기
                const sentProposals = filteredData.sent_proposals || [];
                for (const proposal of sentProposals) {
                    if (proposal.recipient_ids) {
                        fetchGroupMembers(proposal.id, proposal.recipient_ids);
                    }
                }
                
                // 제안된 그룹 상태 업데이트
                const pendingProposals = sentProposals.filter(p => p.status === 'pending');
                const proposedGroupKeys = new Set();
                pendingProposals.forEach(proposal => {
                    if (proposal.recipient_ids) {
                        const recipientIds = parseRecipientIds(proposal.recipient_ids);
                        // 날짜별로 그룹 키 생성
                        const groupKey = getGroupKeyFromIds(recipientIds, proposal.proposed_date);
                        proposedGroupKeys.add(groupKey);
                    }
                });
                setProposedGroups(proposedGroupKeys);
                
                // 제안 상태 변화 감지
                detectProposalChanges(filteredData);
            } else {
                console.warn('제안 조회 API 오류:', response.status);
                if (response.status === 500) {
                    console.error('🔍 [랜덤런치] 서버 내부 오류 상세:', data);
                }
                // 서버 오류 시 기존 상태 유지 (초기화하지 않음)
                console.log('⚠️ [랜덤런치] 서버 오류로 인해 기존 제안 상태 유지');
            }
        } catch (error) {
            // 통합 에러 처리 사용
            const { handleApiError, ERROR_TYPES } = require('../../../utils/errorHandler');
            
            // 네트워크 오류 시 기존 상태 유지 (사용자 경험 개선)
            if (error.message === 'Network request failed' || error.message.includes('Network')) {
                console.warn('🔄 [랜덤런치] 네트워크 오류 감지 - 기존 제안 상태 유지');
                return;
            }
            
            // 기타 오류 시에도 기존 상태 유지
            console.log('⚠️ [랜덤런치] 기타 오류로 인해 기존 제안 상태 유지');
            setProposedGroups(new Set());
            
            // 사용자에게 에러 알림 (재시도 옵션 포함)
            handleApiError(error, '제안 조회', fetchMyProposals);
        }
    };

    const fetchConfirmedGroups = async () => {
        // 🚨 중요: 개발 환경에서도 API 호출 활성화 (테스트를 위해)
        // if (IS_DEVELOPMENT) {
        //     console.log('🔧 [랜덤런치] 개발 환경 - 확정 그룹 조회 API 호출 우회');
        //     setConfirmedGroups([]);
        //     return;
        // }
        
        // 🚨 중요: 초기화 플래그가 설정되어 있으면 API 호출 차단
        if (global.randomLunchProposalsCleared || global.forceEmptyRandomLunch || 
            global.partyDataCleared || global.forceEmptyParties || 
            global.randomLunchForceCleared || global.randomLunchInitialized) {
            console.log('🚨 [랜덤런치] 초기화 플래그 감지 - 확정 그룹 API 호출 차단');
            console.log('  - 추가 플래그 확인: randomLunchForceCleared:', global.randomLunchForceCleared, 'randomLunchInitialized:', global.randomLunchInitialized);
            setConfirmedGroups([]);
            return;
        }
        
        try {
            // 🚨 중요: 사용자 ID가 없을 때 대체 로직
            const employeeId = user?.employee_id || global.myEmployeeId || 'default_id';
            if (!employeeId || employeeId === 'default_id') {
                console.warn('⚠️ [랜덤런치] 사용자 ID가 없어서 확정 그룹 조회를 건너뜁니다');
                setConfirmedGroups([]);
                return;
            }
            
            const response = await unifiedApiClient.get(`/parties?employee_id=${employeeId}&is_from_match=true`);
            const data = await response.json();
            
            if (response.ok && Array.isArray(data)) {
                // API 응답 데이터를 안전하게 처리 (members_employee_ids 필드 제거)
                const safeData = data.map(party => {
                    // members_employee_ids 필드를 제거하고 필요한 필드만 추출
                    const { members_employee_ids, ...safeParty } = party;
                    
                    return {
                        ...safeParty,
                        // 기본값 설정
                        current_members: party.current_members || party.members_count || 1,
                        restaurant_name: party.restaurant_name || party.restaurant || '식당명 없음',
                        party_date: party.party_date || party.date || '날짜 없음'
                    };
                });
                
                setConfirmedGroups(safeData);
            } else {
                // API 오류가 발생해도 빈 배열로 설정하여 앱이 계속 작동하도록 함
                console.warn('백엔드 API 응답 오류:', response.status, data);
                setConfirmedGroups([]);
            }
        } catch (error) {
            // 네트워크 오류가 발생해도 빈 배열로 설정하여 앱이 계속 작동하도록 함
            console.warn('네트워크 오류:', error.message);
            setConfirmedGroups([]);
        }
    };

    const fetchGroupMembers = async (proposalId, recipientIds) => {
        try {
            const userIds = parseRecipientIds(recipientIds);
            
            if (userIds.length === 0) {
                setGroupMembersMap(prev => ({
                    ...prev,
                    [proposalId]: []
                }));
                return;
            }
            
            const response = await unifiedApiClient.post('/users/batch', { user_ids: userIds });
            
            const data = await response.json();
            
            if (response.ok && Array.isArray(data)) {
                setGroupMembersMap(prev => ({
                    ...prev,
                    [proposalId]: data
                }));
            } else {
                setGroupMembersMap(prev => ({
                    ...prev,
                    [proposalId]: []
                }));
            }
        } catch (error) {
            console.error('그룹 멤버 정보 조회 오류:', error);
            setGroupMembersMap(prev => ({
                ...prev,
                [proposalId]: []
            }));
        }
    };

    const handleRejectProposal = async (proposalId) => {
        // 🚨 중요: 개발 환경에서도 API 호출 활성화 (테스트를 위해)
        // if (IS_DEVELOPMENT) {
        //     console.log('🔧 [랜덤런치] 개발 환경 - 제안 거절 API 호출 우회');
        //     Alert.alert('알림', '제안을 거절했습니다. (개발 환경)');
        //     fetchMyProposals(); // 목록 새로고침
        //     return;
        // }
        
        try {
            const response = await unifiedApiClient.post(`/api/proposals/${proposalId}/reject`, { user_id: user.employee_id });
            const data = await response.json();
            if (response.ok) {
                Alert.alert('알림', data.message || '제안을 거절했습니다.');
                fetchMyProposals(); // 목록 새로고침
            } else {
                Alert.alert('오류', data.message || '거절에 실패했습니다.');
            }
        } catch (error) {
            console.error('제안 거절 오류:', error);
            Alert.alert('오류', '네트워크에 문제가 발생했습니다.');
        }
    };

    const handleAcceptProposal = async (proposalId) => {
        // 🚨 중요: 개발 환경에서도 API 호출 활성화 (테스트를 위해)
        // if (IS_DEVELOPMENT) {
        //     console.log('🔧 [랜덤런치] 개발 환경 - 제안 수락 API 호출 우회');
        //     Alert.alert('성공!', '매칭이 성사되었습니다! (개발 환경)');
        //     fetchMyProposals();
        //     return;
        // }
        
        try {
            const response = await unifiedApiClient.post(`/api/proposals/${proposalId}/accept`, { user_id: user.employee_id });
            const data = await response.json();
            
            if (response.ok) {
                if (data.status === 'confirmed') {
                    Alert.alert('성공!', '매칭이 성사되었습니다!');
                } else {
                    Alert.alert('알림', data.message);
                }
                fetchMyProposals();
            } else {
                Alert.alert('오류', data.message || '수락에 실패했습니다.');
            }
        } catch (error) {
            console.error('제안 수락 오류:', error);
            Alert.alert('오류', '네트워크에 문제가 발생했습니다.');
        }
    };

    const toggleProposalExpansion = (proposalId) => {
        setExpandedProposals(prev => {
            const newSet = new Set(prev);
            if (newSet.has(proposalId)) {
                newSet.delete(proposalId);
            } else {
                newSet.add(proposalId);
            }
            return newSet;
        });
    };

    const handleCancelSentProposal = async (proposalId) => {
        try {
            const response = await unifiedApiClient.post(`/proposals/${proposalId}/cancel`, { employee_id: user.employee_id });
            
            if (response.ok) {
                Alert.alert('알림', '제안이 취소되었습니다.');
                fetchMyProposals();
            } else {
                Alert.alert('오류', '제안 취소에 실패했습니다.');
            }
        } catch (error) {
            console.error('제안 취소 오류:', error);
            Alert.alert('오류', '제안 취소에 실패했습니다.');
        }
    };

    const handleProposeGroup = async (group) => {
        // 그룹 키 생성 (날짜 포함)
        const groupUserIds = group.users
            .map(user => user.employee_id)
            .filter(id => id && id.trim().length > 0)
            .sort();
        const groupKey = getGroupKeyFromIds(groupUserIds, currentDate); // 날짜 정보 포함
        
        // 이미 제안한 그룹이면 취소
        if (group.isProposed || proposedGroups.has(groupKey)) {
            try {
                // 해당 날짜에 내가 보낸 제안 찾기
                const employeeId = user?.employee_id || global.myEmployeeId || 'default_id';
            const response = await unifiedApiClient.get(`/api/proposals/mine?employee_id=${employeeId}`);
                const data = await response.json();
                
                if (response.ok) {
                    const sentProposals = data.sent_proposals || [];
                    
                    // 해당 그룹에 해당하는 제안 찾기
                    const myProposal = sentProposals.find(proposal => {
                        if (proposal.proposed_date !== currentDate || proposal.status !== 'pending') {
                            return false;
                        }
                        
                        if (proposal.recipient_ids) {
                            const recipientIds = parseRecipientIds(proposal.recipient_ids);
                            return getGroupKeyFromIds(recipientIds, currentDate) === groupKey; // 날짜 정보 포함
                        }
                        return false;
                    });
                    
                    if (myProposal) {
                        const cancelResponse = await unifiedApiClient.post(`/api/proposals/${myProposal.id}/cancel`, { employee_id: user.employee_id });
                        
                        if (cancelResponse.ok) {
                            setProposedGroups(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(groupKey);
                                return newSet;
                            });
                            
                            // 제안 목록에서 즉시 제거
                            setProposals(prev => ({
                                sent_proposals: prev.sent_proposals.filter(p => 
                                    p.proposed_date !== toKoreanDateString(currentDate) ||
                                    !recipientIds.every(id => parseRecipientIds(p.recipient_ids).includes(id))
                                ),
                                received_proposals: prev.received_proposals
                            }));
                            
                            Alert.alert('알림', '제안이 취소되었습니다.');
                            console.log('✅ 제안 취소 - 즉시 상태 업데이트:', groupKey);
                            
                            // 서버와 동기화 (백엔드 오류 해결 후 복원)
                            setTimeout(() => {
                                fetchMyProposals();
                            }, 1000); // 1초 후 동기화
                        } else {
                            Alert.alert('오류', '제안 취소에 실패했습니다.');
                        }
                    }
                }
            } catch (error) {
                console.error('제안 취소 오류:', error);
                Alert.alert('오류', '제안 취소에 실패했습니다.');
            }
            fetchMyProposals();
            return;
        }

        try {
            const recipientIds = group.users
                .map(user => user.employee_id)
                .filter(id => id && id.trim().length > 0);
            const response = await unifiedApiClient.post('/api/proposals', {
                    proposer_id: user.employee_id,
                    recipient_ids: recipientIds,
                    proposed_date: toKoreanDateString(currentDate)
                })
            });
            const data = await response.json();
            if (response.ok) {
                // 즉시 UI 업데이트
                setProposedGroups(prev => new Set([...prev, groupKey]));
                
                // 제안 목록에 즉시 추가
                const newProposal = {
                    id: Date.now(), // 임시 ID
                    proposer_id: user.employee_id,
                    recipient_ids: recipientIds,
                    proposed_date: toKoreanDateString(currentDate),
                    status: 'pending',
                    created_at: new Date().toISOString()
                };
                
                setProposals(prev => ({
                    sent_proposals: [...prev.sent_proposals, newProposal],
                    received_proposals: prev.received_proposals
                }));
                
                console.log('✅ 제안 성공 - 즉시 상태 업데이트:', groupKey);
                
                // 서버와 동기화 (백엔드 오류 해결 후 복원)
                setTimeout(() => {
                    fetchMyProposals();
                }, 1000); // 1초 후 동기화
            } else {
                Alert.alert('오류', data.message || '제안에 실패했습니다.');
            }
        } catch (error) {
            console.error('제안 오류:', error);
            Alert.alert('오류', '제안에 실패했습니다.');
        }
        // fetchMyProposals(); // 제안 실패 시에는 동기화 불필요
    };

    // 날짜 선택 처리 (스크롤 위치 유지)
    const handleDateSelect = useCallback((index) => {
        const selectedDateOption = dateOptions[index];
        
        // 기존 일정이 있는 날짜는 선택 불가
        if (existingSchedules.has(selectedDateOption.date)) {
            return;
        }
        
        // 현재 스크롤 위치 저장 (이미 handleDateScroll에서 저장되고 있음)
        
        setSelectedDateIndex(index);
        // 선택된 날짜의 월 표시를 유지하기 위해 currentDate 업데이트
        setCurrentDate(selectedDateOption.date);
        // 선택된 날짜의 월을 displayMonth에 반영
        const selectedMonth = `${selectedDateOption.month}월`;
        setDisplayMonth(selectedMonth);
        setCurrentPage(0); // 그룹 페이지 초기화
        
        // 날짜가 변경되면 제안 상태 초기화 (날짜별로 개별 관리)
        setProposedGroups(new Set());
        
        // 날짜가 변경되면 그룹 캐시도 초기화하여 새로운 그룹 생성
        setGroupsCache({});
        setAllPossibleGroups([]);
        setDisplayedGroups([]);
        setCurrentPage(0);
        
        // 새로운 날짜의 제안 상태 로드는 제거 - pull-to-refresh 방지
        // fetchMyProposals();
        
        // 깜빡임 방지: 기존 그룹을 즉시 초기화하지 않고 로딩 상태만 설정
        // setDisplayedGroups([]); // 이 줄 제거
        
        // 스크롤 위치는 변경하지 않음 (사용자가 선택한 위치 유지)
        // 선택된 날짜가 화면에 보이도록 스크롤 위치 조정하지 않음
    }, [dateOptions, existingSchedules, displayedGroups.length, allPossibleGroups.length, groupsCache]);

    // 날짜 스크롤 처리 (월 표시 업데이트만)
    const handleDateScroll = useCallback((event) => {
        const scrollX = event.nativeEvent.contentOffset.x;
        const buttonWidth = 70; // 각 날짜 버튼의 너비
        
        // 스크롤 위치를 실시간으로 저장 (스크롤 위치 보존용)
        lastScrollPositionRef.current = scrollX;
        
        // 스크롤 위치 기반으로 정확한 월 계산
        let targetMonth = null;
        
        // 현재 스크롤 위치에서 가장 가까운 날짜 찾기
        for (let i = 0; i < dateOptions.length; i++) {
            const expectedScrollX = i * buttonWidth;
            if (Math.abs(scrollX - expectedScrollX) < buttonWidth / 2) {
                targetMonth = dateOptions[i].month;
                break;
            }
        }
        
        // 스크롤 위치가 범위를 벗어난 경우 처리
        if (!targetMonth) {
            if (scrollX < buttonWidth / 2) {
                targetMonth = dateOptions[0].month; // 첫 번째 날짜
            } else if (scrollX > (dateOptions.length - 1) * buttonWidth) {
                targetMonth = dateOptions[dateOptions.length - 1].month; // 마지막 날짜
            }
        }
        
        if (targetMonth) {
            const monthText = `${targetMonth}월`;
            setDisplayMonth(monthText);
        }
        
        // 무한 로딩 로직 제거 - 스크롤 끝에 도달해도 더 많은 날짜 생성하지 않음
    }, [dateOptions]);

    // 수동 새로고침 함수
    const handleManualRefresh = useCallback(async () => {
        console.log('🔄 [실시간] 수동 새로고침 시작');
        
        try {
            // 로딩 상태 표시
            setLoading(true);
            
            // 제안 상태 새로고침
            await fetchMyProposals();
            
            // 현재 날짜의 그룹 정보 새로고침
            if (currentDate) {
                await generateAllPossibleGroups(currentDate);
            }
            
            console.log('🔄 [실시간] 수동 새로고침 완료');
        } catch (error) {
            console.error('🔄 [실시간] 수동 새로고침 오류:', error);
        } finally {
            setLoading(false);
        }
    }, [currentDate]);

    // 제안 상태 변화 감지를 위한 상태 (UI 표시 없음)
    const [previousProposals, setPreviousProposals] = useState({ sent_proposals: [], received_proposals: [] });

    // 제안 상태 변화 감지 (조용히 실행)
    const detectProposalChanges = useCallback((newProposals) => {
        const changes = [];
        
        // 보낸 제안 변화 감지
        const sentChanges = newProposals.sent_proposals.filter(newProposal => {
            const oldProposal = previousProposals.sent_proposals.find(p => p.id === newProposal.id);
            return !oldProposal || oldProposal.status !== newProposal.status;
        });
        
        // 받은 제안 변화 감지
        const receivedChanges = newProposals.received_proposals.filter(newProposal => {
            const oldProposal = previousProposals.received_proposals.find(p => p.id === newProposal.id);
            return !oldProposal || oldProposal.status !== newProposal.status;
        });
        
        // 새로운 제안 감지
        const newSentProposals = newProposals.sent_proposals.filter(newProposal => 
            !previousProposals.sent_proposals.find(p => p.id === newProposal.id)
        );
        
        const newReceivedProposals = newProposals.received_proposals.filter(newProposal => 
            !previousProposals.received_proposals.find(p => p.id === newProposal.id)
        );
        
        // 변화 사항이 있으면 콘솔에만 기록 (UI 알림 없음)
        if (newSentProposals.length > 0 || newReceivedProposals.length > 0 || sentChanges.length > 0 || receivedChanges.length > 0) {
            console.log('🔄 [실시간] 제안 상태 변화 감지됨');
        }
        
        // 이전 상태 업데이트
        setPreviousProposals(newProposals);
    }, [previousProposals]);

    // WebSocket 연결을 위한 상태
    const [websocket, setWebsocket] = useState(null);
    const [isWebsocketConnected, setIsWebsocketConnected] = useState(false);
    const [websocketReconnectAttempts, setWebsocketReconnectAttempts] = useState(0);
    const maxReconnectAttempts = 5;
    const reconnectDelay = 3000; // 3초

    // WebSocket 연결 함수
    const connectWebSocket = useCallback(() => {
        try {
            // WebSocket 서버 URL (통합 API 클라이언트에서 서버 URL 가져오기)
            const serverURL = await unifiedApiClient.getServerURL();
            const wsUrl = serverURL.replace('https://', 'wss://').replace('http://', 'ws://') + '/ws/random-lunch';
            
            console.log('🔌 [WebSocket] 연결 시도:', wsUrl);
            
            const ws = new WebSocket(wsUrl);
            
            ws.onopen = () => {
                console.log('🔌 [WebSocket] 연결 성공');
                setIsWebsocketConnected(true);
                setWebsocketReconnectAttempts(0);
                
                // 연결 후 사용자 인증 메시지 전송
                if (user && user.employee_id) {
                    ws.send(JSON.stringify({
                        type: 'auth',
                        employee_id: user.employee_id,
                        action: 'subscribe'
                    }));
                }
            };
            
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    handleWebSocketMessage(data);
                } catch (error) {
                    console.error('🔌 [WebSocket] 메시지 파싱 오류:', error);
                }
            };
            
            ws.onclose = (event) => {
                console.log('🔌 [WebSocket] 연결 종료:', event.code, event.reason);
                setIsWebsocketConnected(false);
                
                // 자동 재연결 시도
                if (websocketReconnectAttempts < maxReconnectAttempts) {
                    setTimeout(() => {
                        setWebsocketReconnectAttempts(prev => prev + 1);
                        connectWebSocket();
                    }, reconnectDelay);
                }
            };
            
            ws.onerror = (error) => {
                console.error('🔌 [WebSocket] 연결 오류:', error);
                setIsWebsocketConnected(false);
            };
            
            setWebsocket(ws);
            
        } catch (error) {
            console.error('🔌 [WebSocket] 연결 생성 오류:', error);
            setIsWebsocketConnected(false);
        }
    }, [user, websocketReconnectAttempts]);

    // WebSocket 메시지 처리
    const handleWebSocketMessage = useCallback((data) => {
        console.log('🔌 [WebSocket] 메시지 수신:', data);
        
        switch (data.type) {
            case 'proposal_update':
                // 제안 상태 업데이트
                handleProposalUpdate(data);
                break;
                
            case 'group_update':
                // 그룹 정보 업데이트
                handleGroupUpdate(data);
                break;
                
            case 'user_availability_change':
                // 사용자 가용성 변화
                handleUserAvailabilityChange(data);
                break;
                
            case 'notification':
                // 실시간 알림
                handleRealTimeNotification(data);
                break;
                
            default:
                console.log('🔌 [WebSocket] 알 수 없는 메시지 타입:', data.type);
        }
    }, []);

    // 제안 상태 업데이트 처리
    const handleProposalUpdate = useCallback((data) => {
        console.log('🔄 [실시간] 제안 상태 업데이트:', data);
        
        // 제안 상태 즉시 새로고침
        fetchMyProposals();
        
        // 현재 날짜의 그룹 정보도 새로고침
        if (currentDate) {
            generateAllPossibleGroups(currentDate);
        }
    }, [currentDate]);

    // 그룹 정보 업데이트 처리
    const handleGroupUpdate = useCallback((data) => {
        console.log('🔄 [실시간] 그룹 정보 업데이트:', data);
        
        // 그룹 캐시 무효화
        setGroupsCache(prev => {
            const newCache = { ...prev };
            delete newCache[data.date];
            return newCache;
        });
        
        // 현재 날짜가 업데이트된 날짜와 같다면 즉시 새로고침
        if (currentDate === data.date) {
            generateAllPossibleGroups(data.date);
        }
    }, [currentDate]);

    // 사용자 가용성 변화 처리
    const handleUserAvailabilityChange = useCallback((data) => {
        console.log('🔄 [실시간] 사용자 가용성 변화:', data);
        
        // 기존 일정 정보 새로고침
        fetchExistingSchedules();
        
        // 현재 날짜의 그룹 정보 새로고침
        if (currentDate) {
            generateAllPossibleGroups(currentDate);
        }
    }, [currentDate]);

    // 실시간 알림 처리
    const handleRealTimeNotification = useCallback((data) => {
        console.log('🔔 [실시간] 알림 수신:', data);
        
        // 사용자에게 즉시 알림 표시
        Alert.alert(
            data.title || '새로운 알림',
            data.message,
            [
                {
                    text: '확인',
                    onPress: () => {
                        // 알림 확인 후 필요한 경우 화면 새로고침
                        if (data.requiresRefresh) {
                            handleManualRefresh();
                        }
                    }
                }
            ]
        );
    }, []);

    // last_lunch 값을 정확하게 표시하는 함수
    const formatLastLunch = useCallback((lastLunch) => {
        if (!lastLunch) {
            return '처음';
        }
        
        // 백엔드에서 제공하는 값의 형태에 따라 처리
        if (typeof lastLunch === 'string') {
            // "어제", "3일 전", "1주 전", "1달 이상 전" 등의 형태
            return lastLunch;
        } else if (typeof lastLunch === 'number') {
            // 숫자로 제공되는 경우 (일 수)
            if (lastLunch === 0) {
                return '오늘';
            } else if (lastLunch === 1) {
                return '어제';
            } else if (lastLunch < 7) {
                return `${lastLunch}일 전`;
            } else if (lastLunch < 30) {
                const weeks = Math.floor(lastLunch / 7);
                return `${weeks}주 전`;
            } else if (lastLunch < 365) {
                const months = Math.floor(lastLunch / 30);
                return `${months}달 전`;
            } else {
                const years = Math.floor(lastLunch / 365);
                return `${years}년 전`;
            }
        } else if (lastLunch instanceof Date || typeof lastLunch === 'object') {
            // Date 객체나 날짜 문자열인 경우
            try {
                const date = new Date(lastLunch);
                if (isNaN(date.getTime())) {
                    return '처음';
                }
                
                const now = new Date();
                const diffTime = Math.abs(now - date);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays === 0) {
                    return '오늘';
                } else if (diffDays === 1) {
                    return '어제';
                } else if (diffDays < 7) {
                    return `${diffDays}일 전`;
                } else if (diffDays < 30) {
                    const weeks = Math.floor(diffDays / 7);
                    return `${weeks}주 전`;
                } else if (diffDays < 365) {
                    const months = Math.floor(diffDays / 30);
                    return `${months}달 전`;
                } else {
                    const years = Math.floor(diffDays / 365);
                    return `${years}년 전`;
                }
            } catch (error) {
                console.warn('날짜 파싱 오류:', error);
                return '처음';
            }
        }
        
        return '처음';
    }, []);

    // 사용자 카드 렌더링
    const renderUserCard = ({ item }) => (
        <TouchableOpacity
            onPress={() => {
                // 동료 카드를 누르면 상세 프로필 화면으로 이동
                // 🚨 중요: 홈탭으로 이동하여 프로필 표시
                navigation.navigate('UserProfile', {
                    employeeId: item.employee_id,
                    friend: item,
                    isFriend: false, // 랜덤런치에서 만난 동료는 아직 친구가 아님
                    fromRandomLunch: true // 랜덤런치에서 온 것을 표시
                });
            }}
            activeOpacity={0.7}
            style={{
                backgroundColor: '#F8FAFC',
                borderRadius: 12,
                padding: 12,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: '#E5E7EB',
                minHeight: 80 // 두 줄 텍스트를 위한 최소 높이 설정
            }}
        >
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                    <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
                        {/* 아바타 이미지 공간 */}
                        <View style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                            backgroundColor: '#3B82F6',
                            marginRight: 12,
                            justifyContent: 'center',
                            alignItems: 'center',
                            borderWidth: 1,
                            borderColor: '#2563EB'
                        }}>
                            <Text style={{
                            fontSize: 16,
                                color: '#FFFFFF',
                                fontWeight: 'bold'
                            }}>
                                {item.nickname ? item.nickname.charAt(0) : '?'}
                            </Text>
                        </View>
                    <View style={{flex: 1}}>
                        <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 4}}>
                            <Text style={{fontSize: 16, fontWeight: 'bold', color: '#1F2937'}}>{item.nickname}</Text>
                            <Text style={{
                                fontSize: 12,
                                color: '#9CA3AF',
                                fontStyle: 'italic',
                                marginLeft: 8
                            }}>
                                칭호
                            </Text>
                    </View>
                        {/* 좋아하는 음식과 점심 성향을 두 줄로 분리하여 표시 */}
                        <Text style={{
                            fontSize: 12, 
                            color: '#6B7280', 
                            marginBottom: 2,
                            fontWeight: '500'
                        }}>
                            🍽️ {item.main_dish_genre || '음식 선호도 없음'}
                        </Text>
                        <Text style={{
                            fontSize: 12, 
                            color: '#6B7280',
                            fontWeight: '400'
                        }}>
                            🎯 {item.lunch_preference || '점심 성향 없음'}
                        </Text>
                    </View>
                </View>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    {/* 마지막 점심 시간만 표시 */}
                    <View style={{
                        backgroundColor: '#6B7280', // 회색 도형 채우기
                        borderRadius: 8,
                        paddingVertical: 4,
                        paddingHorizontal: 8
                    }}>
                        <Text style={{color: '#FFFFFF', fontWeight: '500', fontSize: 12}}> {/* 흰색 글자 */}
                            {formatLastLunch(item.last_lunch)}
                        </Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );

    // 매칭 성공한 그룹에서 나가기 처리
    const handleLeaveConfirmedGroup = async (group) => {
        Alert.alert(
            '그룹 나가기',
            '정말로 이 그룹에서 나가시겠습니까?',
            [
                {
                    text: '취소',
                    style: 'cancel'
                },
                {
                    text: '나가기',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // 그룹 나가기 시작 (로그 간소화)
                            
                            // 백엔드 API 호출하여 그룹에서 나가기
                            const response = await unifiedApiClient.post(`/parties/${group.id}/leave`, {
                                    'Authorization': `Bearer ${global.myToken || 'dev-token'}`
                                },
                                body: JSON.stringify({
                                    employee_id: global.myEmployeeId || '1'
                                })
                            });

                            if (response.ok) {
                                // 그룹 나가기 성공 (로그 간소화)
                                
                                // 홈탭 일정에서 제거하기 위해 App.js의 allEvents 업데이트
                                const updatedEvent = {
                                    ...group,
                                    status: 'cancelled',
                                    isCancelled: true
                                };
                                
                                // 전역 상태 업데이트 (App.js와 동기화)
                                if (global.updateHomeSchedule) {
                                    global.updateHomeSchedule(updatedEvent, 'remove');
                                }
                                
                                // 현재 화면의 confirmedGroups에서 제거
                                setConfirmedGroups(prev => prev.filter(g => g.id !== group.id));
                                
                                // 제안 상태 새로고침
                                await fetchMyProposals();
                                
                                Alert.alert('완료', '그룹에서 나갔습니다.');
                            } else {
                                const errorData = await response.json();
                                console.error('❌ [랜덤런치] 그룹 나가기 실패:', errorData);
                                
                                // 더 자세한 에러 메시지 표시
                                let errorMessage = '그룹에서 나가기 실패했습니다.';
                                if (errorData.message) {
                                    if (errorData.message.includes('파티장은 파티를 나갈 수 없습니다')) {
                                        errorMessage = '일반 파티의 파티장은 나갈 수 없습니다.\n파티 삭제를 사용해주세요.';
                                    } else {
                                        errorMessage = errorData.message;
                                    }
                                }
                                
                                Alert.alert('오류', errorMessage);
                            }
                        } catch (error) {
                            console.error('❌ [랜덤런치] 그룹 나가기 오류:', error);
                            Alert.alert('오류', '네트워크 오류가 발생했습니다.');
                        }
                    }
                }
            ]
        );
    };

    const renderConfirmedGroupItem = ({ item }) => (
        <View style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 20,
                padding: 20,
                marginHorizontal: 6,
                width: screenWidth * 0.5,
            height: 180, // 높이를 늘려서 나가기 버튼 공간 확보
                borderWidth: 1,
                borderColor: 'rgba(59, 130, 246, 0.1)',
            justifyContent: 'space-between', // 공간 분배
                elevation: 3,
                shadowColor: '#3B82F6',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 8
        }}>
            <TouchableOpacity 
                style={{flex: 1, justifyContent: 'flex-start'}}
            onPress={() => {
                // item.id가 있는 경우에만 PartyDetail로 이동
                if (item.id) {
                    navigation.navigate('PartyDetail', { partyId: item.id });
                }
            }}
        >
            <View style={{marginBottom: 6}}>
                <Text style={{fontSize: 16, fontWeight: 'bold', color: '#1F2937'}}>
                    ⚡️ {item.party_date || '날짜 없음'}
                </Text>
            </View>
            <Text style={{fontSize: 13, color: '#6B7280', marginBottom: 6}}>
                👥 {item.current_members || 1}명 참여
            </Text>
            <Text style={{fontSize: 13, color: '#6B7280'}}>
                🍽️ {item.restaurant_name || '식당명 없음'}
            </Text>
        </TouchableOpacity>
            
            {/* 나가기 버튼 */}
            <TouchableOpacity 
                style={{
                    backgroundColor: '#EF4444',
                    borderRadius: 12,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    alignSelf: 'flex-end',
                    marginTop: 8
                }}
                onPress={() => handleLeaveConfirmedGroup(item)}
            >
                <Text style={{color: '#FFFFFF', fontSize: 12, fontWeight: 'bold'}}>
                    나가기
                </Text>
            </TouchableOpacity>
        </View>
    );

    const renderProposalItem = ({ item, type }) => {
        const isPending = item.status === 'pending';
        const isReceived = type === 'received';
        const isExpanded = expandedProposals.has(item.id);
        const groupMembers = groupMembersMap[item.id] || [];
        
        // 그룹 멤버 정보 가져오기
        if (isExpanded && type === 'sent' && item.recipient_ids && !groupMembersMap[item.id]) {
            fetchGroupMembers(item.id, item.recipient_ids);
        }
        
        return (
            <View style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 20,
                marginHorizontal: 16,
                marginBottom: 16,
                padding: 20,
                elevation: 3,
                shadowColor: '#3B82F6',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                borderWidth: 1,
                borderColor: 'rgba(59, 130, 246, 0.1)'
            }}>
                <TouchableOpacity 
                    style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}
                    onPress={() => toggleProposalExpansion(item.id)}
                >
                    <Text style={{fontSize: 16, fontWeight: 'bold', color: '#1F2937'}}>
                        {new Date(item.proposed_date).toLocaleDateString('ko-KR', { 
                            month: 'long', 
                            day: 'numeric' 
                        })}
                    </Text>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <View style={{
                            backgroundColor: item.status === 'confirmed' ? '#10B981' : 
                                          item.status === 'cancelled' ? '#EF4444' : 
                                          item.status === 'expired' ? '#F59E0B' : '#E5E7EB',
                            borderRadius: 20,
                            paddingVertical: 6,
                            paddingHorizontal: 12,
                            marginRight: 8
                        }}>
                            <Text style={{color: item.status === 'confirmed' ? '#FFFFFF' : 
                                         item.status === 'cancelled' ? '#FFFFFF' : 
                                         item.status === 'expired' ? '#FFFFFF' : '#6B7280', 
                                         fontWeight: 'bold', fontSize: 12}}>
                                {item.status === 'pending' ? '대기중' : 
                                 item.status === 'confirmed' ? '확정' : 
                                 item.status === 'cancelled' ? '취소' : '만료'}
                            </Text>
                        </View>
                        <Text style={{color: '#6B7280', fontSize: 20}}>
                            {isExpanded ? "⌃" : "⌄"}
                            </Text>
                    </View>
                </TouchableOpacity>
                
                {isExpanded && (
                    <View style={{marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB'}}>
                        {type === 'sent' && (
                            <View style={{marginBottom: 8}}>
                                <Text style={{fontSize: 14, fontWeight: 'bold', color: '#1F2937', marginBottom: 8}}>제안한 그룹:</Text>
                                {(groupMembers && groupMembers.length > 0) ? (
                                    groupMembers.map((member, index) => (
                                        <View key={index} style={{marginBottom: 8}}>
                                            <Text style={{fontSize: 14, color: '#1F2937', fontWeight: '600'}}>{member.nickname || member.employee_id}</Text>
                                            <Text style={{fontSize: 12, color: '#6B7280', marginLeft: 16}}>
                                                🍽️ {member.lunch_preference || '-'}
                                                {member.dining_history && `  |  ${member.dining_history}`}
                            </Text>
                                            {member.main_dish_genre && (
                                                <Text style={{fontSize: 12, color: '#6B7280', marginLeft: 16}}>🍜 {member.main_dish_genre}</Text>
                                            )}
                        </View>
                                    ))
                                ) : (
                                    <View style={{marginBottom: 8}}>
                                        <Text style={{fontSize: 12, color: '#6B7280'}}>
                                            {item.recipient_ids ? '참여자 정보를 불러오는 중...' : '참여자 정보 없음'}
                                        </Text>
                                        {item.recipient_ids && (
                                            <Text style={{fontSize: 10, color: '#6B7280', marginTop: 4}}>
                                                ID: {item.recipient_ids}
                                            </Text>
                                        )}
                    </View>
                                )}
                </View>
                        )}
                        
                        {item.accepted_nicknames && item.accepted_nicknames.length > 0 && (
                            <Text style={{fontSize: 14, color: '#10B981', fontWeight: '600', marginBottom: 8}}>
                                수락한 사람: {item.accepted_nicknames.join(', ')}
                            </Text>
                        )}
                
                        {isReceived && isPending && (
                            <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 8}}>
                <TouchableOpacity
                    style={{
                                        backgroundColor: '#3B82F6',
                                        borderRadius: 16,
                                        paddingVertical: 12,
                                        paddingHorizontal: 20,
                                        flex: 1,
                                        marginRight: 8,
                        alignItems: 'center',
                                        elevation: 3,
                        shadowColor: '#3B82F6',
                                        shadowOffset: { width: 0, height: 4 },
                                        shadowOpacity: 0.3,
                                        shadowRadius: 8
                                    }}
                                    onPress={() => handleAcceptProposal(item.id)}
                                >
                                    <Text style={{color: '#FFFFFF', fontWeight: 'bold', fontSize: 14}}>
                                        수락
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={{
                                        backgroundColor: '#EF4444',
                                        borderRadius: 16,
                                        paddingVertical: 12,
                                        paddingHorizontal: 20,
                                        flex: 1,
                                        marginLeft: 8,
                                        alignItems: 'center',
                                        elevation: 3,
                                        shadowColor: '#EF4444',
                                        shadowOffset: { width: 0, height: 4 },
                                        shadowOpacity: 0.3,
                                        shadowRadius: 8
                                    }}
                                    onPress={() => {
                                        Alert.alert('거절', '이 제안을 거절하시겠습니까?', [
                                            { text: '취소', style: 'cancel' },
                                            { text: '확인', style: 'destructive', onPress: () => handleRejectProposal(item.id) }
                                        ]);
                                    }}
                                >
                                    <Text style={{color: '#FFFFFF', fontWeight: 'bold', fontSize: 14}}>
                                        거절
                    </Text>
                </TouchableOpacity>
                            </View>
                        )}
                        
                        {type === 'sent' && isPending && (
                            <View style={{marginTop: 8}}>
                                <TouchableOpacity 
                                    style={{
                                        backgroundColor: '#EF4444',
                                        borderRadius: 16,
                                        paddingVertical: 12,
                                        paddingHorizontal: 24,
                                        alignItems: 'center',
                                        width: '100%',
                                        elevation: 3,
                                        shadowColor: '#EF4444',
                                        shadowOffset: { width: 0, height: 4 },
                                        shadowOpacity: 0.3,
                                        shadowRadius: 8
                                    }}
                                    onPress={() => handleCancelSentProposal(item.id)}
                                >
                                    <Text style={{color: '#FFFFFF', fontWeight: 'bold', fontSize: 14}}>
                                        제안 취소
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}
            </View>
        );
    };

    // 유틸리티 함수들
    const parseRecipientIds = (recipientIds) => {
        if (!recipientIds) return [];
        if (typeof recipientIds === 'string') {
            try {
                return JSON.parse(recipientIds);
            } catch (e) {
                return recipientIds.split(',').map(id => id.trim());
            }
        }
        return Array.isArray(recipientIds) ? recipientIds : [];
    };

    const getGroupKeyFromIds = (ids, date = null) => {
        const sortedIds = ids.sort();
        const baseKey = sortedIds.join('-');
        // 날짜 정보가 있으면 그룹 키에 포함
        return date ? `${date}-${baseKey}` : baseKey;
    };

    const toKoreanDateString = (dateString) => {
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
    };

    // WebSocket 연결 관리 (일시적으로 비활성화)
    useEffect(() => {
        // 백엔드에 WebSocket 엔드포인트가 없어서 일시적으로 비활성화
        // if (user && user.employee_id) {
        //     connectWebSocket();
        // }
        
        // 컴포넌트 언마운트 시 WebSocket 연결 해제
        return () => {
            if (websocket) {
                websocket.close();
                setWebsocket(null);
            }
        };
    }, [user, connectWebSocket]);

    // WebSocket 연결 상태 모니터링
    useEffect(() => {
        if (isWebsocketConnected) {
            console.log('🔌 [WebSocket] 연결 상태: 활성화');
        } else {
            console.log('🔌 [WebSocket] 연결 상태: 비활성화');
        }
    }, [isWebsocketConnected]);

    // 푸시 알림을 위한 상태
    // const [pushToken, setPushToken] = useState(null);
    // const [notificationPermission, setNotificationPermission] = useState(false);

    // 푸시 알림 권한 요청 및 토큰 등록 (일시적으로 비활성화)
    // const setupPushNotifications = useCallback(async () => {
    //     // expo-notifications 패키지가 설치되지 않아 일시적으로 비활성화
    // }, []);

    // 서버에 푸시 토큰 등록 (일시적으로 비활성화)
    // const registerPushToken = useCallback(async (token) => {
    //     // expo-notifications 패키지가 설치되지 않아 일시적으로 비활성화
    // }, [user]);

    // 로컬 알림 표시 (일시적으로 비활성화)
    // const showLocalNotification = useCallback(async (title, body, data = {}) => {
    //     // expo-notifications 패키지가 설치되지 않아 일시적으로 비활성화
    // }, []);

    // 백그라운드 알림 처리 (일시적으로 비활성화)
    // const handleBackgroundNotification = useCallback((notification) => {
    //     // expo-notifications 패키지가 설치되지 않아 일시적으로 비활성화
    // }, [showLocalNotification]);

    // 푸시 알림 설정 (일시적으로 비활성화)
    // useEffect(() => {
    //     if (user && user.employee_id) {
    //         setupPushNotifications();
    //     }
    // }, [user, setupPushNotifications]);

    // 백그라운드 알림 리스너 설정 (일시적으로 비활성화)
    // useEffect(() => {
    //     const backgroundSubscription = Notifications.addNotificationResponseReceivedListener(response => {
    //         handleBackgroundNotification(response.notification);
    //     });
    //     
    //     const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
    //         // 포그라운드에서 알림 수신 시 처리
    //         console.log('🔔 [푸시] 포그라운드 알림 수신:', notification);
    //     });
    //     
    //     return () => {
    //         backgroundSubscription?.remove();
    //         foregroundSubscription?.remove();
    //     };
    // }, [handleBackgroundNotification]);

    // 스마트 동기화를 위한 상태
    const [userActivity, setUserActivity] = useState({
        lastInteraction: new Date(),
        interactionCount: 0,
        preferredSyncInterval: 30000, // 기본 30초
        isActive: true
    });
    const [smartSyncEnabled, setSmartSyncEnabled] = useState(true);

    // 사용자 활동 추적
    const trackUserActivity = useCallback(() => {
        const now = new Date();
        setUserActivity(prev => ({
            ...prev,
            lastInteraction: now,
            interactionCount: prev.interactionCount + 1,
            isActive: true
        }));
        
        // 활동이 감지되면 동기화 간격 조정
        adjustSyncInterval();
    }, []);

    // 동기화 간격 스마트 조정
    const adjustSyncInterval = useCallback(() => {
        const now = new Date();
        const timeSinceLastInteraction = now - userActivity.lastInteraction;
        
        let newInterval = 30000; // 기본 30초
        
        if (timeSinceLastInteraction < 60000) { // 1분 이내 활동
            newInterval = 15000; // 15초로 단축
        } else if (timeSinceLastInteraction < 300000) { // 5분 이내 활동
            newInterval = 30000; // 30초 유지
        } else if (timeSinceLastInteraction < 900000) { // 15분 이내 활동
            newInterval = 60000; // 1분으로 연장
        } else { // 15분 이상 비활성
            newInterval = 300000; // 5분으로 연장
        }
        
        setUserActivity(prev => ({
            ...prev,
            preferredSyncInterval: newInterval
        }));
        
        console.log('🔄 [스마트] 동기화 간격 조정:', newInterval / 1000, '초');
    }, [userActivity.lastInteraction]);

    // 스마트 폴링 설정
    useEffect(() => {
        if (!smartSyncEnabled) return;
        
        const interval = setInterval(() => {
            const now = new Date();
            const timeSinceLastInteraction = now - userActivity.lastInteraction;
            
            // 사용자가 활성 상태이고 최근에 상호작용했다면 동기화 실행
            if (userActivity.isActive && timeSinceLastInteraction < 300000) { // 5분 이내
                console.log('🔄 [스마트] 사용자 활동 기반 동기화 실행');
                
                // 제안 상태 새로고침
                fetchMyProposals();
                
                // 현재 날짜의 그룹 정보 새로고침
                if (currentDate && !isGeneratingGroups) {
                    generateAllPossibleGroups(currentDate);
                }
            } else {
                console.log('🔄 [스마트] 사용자 비활성 상태 - 동기화 건너뜀');
            }
        }, userActivity.preferredSyncInterval);
        
        return () => clearInterval(interval);
    }, [smartSyncEnabled, userActivity, currentDate, isGeneratingGroups]);

    // 화면 포커스/블러 감지
    useEffect(() => {
        const onFocus = () => {
            console.log('🔄 [스마트] 화면 포커스 - 즉시 동기화');
            setUserActivity(prev => ({ ...prev, isActive: true }));
            
            // 화면에 돌아왔을 때 즉시 동기화
            handleManualRefresh();
        };
        
        const onBlur = () => {
            console.log('🔄 [스마트] 화면 블러 - 동기화 간격 연장');
            setUserActivity(prev => ({ ...prev, isActive: false }));
        };
        
        // 네비게이션 이벤트 리스너 등록
        const unsubscribeFocus = navigation.addListener('focus', onFocus);
        const unsubscribeBlur = navigation.addListener('blur', onBlur);
        
        return () => {
            unsubscribeFocus();
            unsubscribeBlur();
        };
    }, [navigation, handleManualRefresh]);

    // 사용자 상호작용 이벤트 리스너 (React Native 호환)
    useEffect(() => {
        const handleInteraction = () => {
            trackUserActivity();
        };
        
        // React Native에서는 document 객체가 없으므로
        // 네비게이션 이벤트와 컴포넌트 상호작용으로 활동 추적
        const activityTimer = setTimeout(() => {
            handleInteraction();
        }, 1000);
        
        return () => {
            clearTimeout(activityTimer);
        };
    }, [trackUserActivity]);

    // 그룹 생성 상태를 별도로 관리 (pull-to-refresh 방지)
    const [isGeneratingGroups, setIsGeneratingGroups] = useState(false);

    // 특정 날짜에 대한 로컬 가상 그룹을 생성하는 함수
    const generateLocalVirtualGroupsForDate = (date) => {
        const currentUserId = user?.employee_id || global.myEmployeeId || '1';
        
        // 프로덕션 환경에서는 가상 유저 데이터 사용하지 않음
        console.log('⚠️ 프로덕션 환경: 가상 유저 데이터가 제거되었습니다. 실제 사용자 데이터를 사용하세요.');
        const availableUsers = [];
        
        // 3명 그룹으로만 랜덤하게 조합 (최대 3명 제한)
        const groups = [];
        const usedUsers = new Set();
        
        // 3명 그룹 4개 생성 (더 많은 그룹 제공)
        for (let i = 0; i < 4; i++) {
            const groupMembers = [];
            for (let j = 0; j < 3; j++) {
                const available = availableUsers.filter(user => !usedUsers.has(user.employee_id));
                if (available.length === 0) break;
                
                const randomUser = available[Math.floor(Math.random() * available.length)];
                groupMembers.push(randomUser);
                usedUsers.add(randomUser.employee_id);
            }
            
            if (groupMembers.length === 3) {
                // 최종 검증: 정확히 3명인지 확인
                const validatedMembers = groupMembers.slice(0, 3);
                groups.push({
                    id: `local_group_${date}_${i + 1}`,
                    date: date,
                    members: validatedMembers.map(u => u.employee_id),
                    status: 'open',
                    created_at: new Date().toISOString(),
                    score: Math.floor(Math.random() * 100) + 50,
                    title: `🍽️ ${date} 점심 모임 (3인 그룹)`,
                    current_members: validatedMembers.length,
                    max_members: 3, // 최대 3명으로 제한
                    restaurant_name: ['맛있는 한식집', '신선한 중식당', '깔끔한 일식집', '트렌디한 양식당'][Math.floor(Math.random() * 4)],
                    party_date: date,
                    party_time: '12:00',
                    users: validatedMembers
                });
            }
        }
        
        // 추가로 2명 그룹도 생성 (더 다양한 옵션 제공)
        const remainingUsers = availableUsers.filter(user => !usedUsers.has(user.employee_id));
        for (let i = 0; i < 2 && remainingUsers.length >= 2; i++) {
            const groupMembers = remainingUsers.slice(i * 2, (i + 1) * 2);
            if (groupMembers.length === 2) {
                // 최종 검증: 정확히 2명인지 확인
                const validatedMembers = groupMembers.slice(0, 2);
                groups.push({
                    id: `local_group_${date}_2_${i + 1}`,
                    date: date,
                    members: validatedMembers.map(u => u.employee_id),
                    status: 'open',
                    created_at: new Date().toISOString(),
                    score: Math.floor(Math.random() * 100) + 50,
                    title: `🍽️ ${date} 점심 모임 (2인 그룹)`,
                    current_members: validatedMembers.length,
                    max_members: 3, // 최대 3명으로 제한
                    restaurant_name: ['전통 한식집', '모던 중식당', '일본 정통 일식집', '이탈리아 트로트토리아'][Math.floor(Math.random() * 4)],
                    party_date: date,
                    party_time: '12:00',
                    users: validatedMembers
                });
            }
        }
        
        // 최종 검증: 모든 그룹이 3명 이하인지 확인
        const validatedGroups = groups.filter(group => {
            const isValid = group.current_members <= 3 && group.max_members <= 3;
            if (!isValid) {
                console.warn(`⚠️ [랜덤런치] 3명 초과 그룹 제외: ${group.current_members}명 (ID: ${group.id})`);
            }
            return isValid;
        });
        
        return validatedGroups;
    };

        return (
        <SafeAreaView style={styles.container}>
            {/* 파티탭에서 호출된 경우 탭 버튼 숨김, 홈탭에서 호출된 경우에만 탭 버튼 표시 */}
            {!isFromPartyTab && (
                <>
                    <View style={styles.tabContainer}>
                        <TouchableOpacity
                            style={[
                                styles.tabButton,
                                activeTab === 'groups' && styles.tabButtonActive
                            ]}
                            onPress={() => setActiveTab('groups')}
                        >
                            <Text style={[
                                styles.tabButtonText,
                                activeTab === 'groups' && styles.tabButtonTextActive
                            ]}>
                                추천 그룹
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.tabButton,
                                activeTab === 'proposals' && styles.tabButtonActive
                            ]}
                            onPress={() => setActiveTab('proposals')}
                        >
                            <Text style={[
                                styles.tabButtonText,
                                activeTab === 'proposals' && styles.tabButtonTextActive
                            ]}>
                                제안 정보
                            </Text>
                        </TouchableOpacity>
                    </View>
                    
                    {/* 탭 내용과의 간격 조정 */}
                    <View style={{marginBottom: 16}} />
                </>
            )}

            {finalActiveTab === 'groups' ? (
                // 추천 그룹 탭
                <ScrollView 
                    style={styles.scrollView} 
                    showsVerticalScrollIndicator={false}
                    contentOffset={{ x: 0, y: 0 }}
                    contentInset={{ top: 0, bottom: 0, left: 0, right: 0 }}
                    automaticallyAdjustContentInsets={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={loading}
                            onRefresh={handleManualRefresh}
                            colors={['#3B82F6']}
                            tintColor="#3B82F6"
                            title="새로고침 중..."
                            titleColor="#6B7280"
                        />
                    }
                >
                    {/* 날짜 선택 UI */}
                    <View style={styles.dateSelectionCard}>
                        <Text style={styles.dateSelectionTitle}>
                            {getCurrentMonthText()} 날짜 선택
                    </Text>
                        <ScrollView
                            ref={dateScrollViewRef}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.dateScrollContainer}
                            onScroll={handleDateScroll}
                            onScrollBeginDrag={handleScrollBegin}
                            onMomentumScrollEnd={handleScrollEnd}
                            scrollEventThrottle={16}
                            snapToInterval={60}
                            decelerationRate={0.8}
                            snapToAlignment="center"
                            snapToOffsets={dateOptions.map((_, index) => index * 60)}
                            contentInset={{ left: 10, right: 10 }}
                            bounces={false}
                            alwaysBounceHorizontal={false}
                            directionalLockEnabled={true}
                            scrollIndicatorInsets={{ right: 1 }}
                            keyboardShouldPersistTaps="never"
                            removeClippedSubviews={true}
                            automaticallyAdjustContentInsets={false}
                            nestedScrollEnabled={true}
                            overScrollMode="never"
                            pagingEnabled={false}
                            scrollEnabled={true}
                            canCancelContentTouches={true}
                            delaysContentTouches={false}
                            onLayout={() => {}}
                            onScrollToTop={() => {}}
                            onContentSizeChange={() => {
                                // 콘텐츠 크기 변화 시 추가 날짜 생성 체크 - 무한 로딩 제거
                            }}
                            onEndReached={() => {
                                // 스크롤 끝에 도달하면 더 많은 그룹 로딩
                                if (hasMoreGroups && !isLoadingMoreGroups) {
                                    loadMoreGroups();
                                }
                            }}
                            onEndReachedThreshold={0.1}
                            onViewableItemsChanged={({ viewableItems }) => {
                                // 현재 보고 있는 그룹의 인덱스 업데이트
                                if (viewableItems.length > 0) {
                                    const currentIndex = viewableItems[0].index;
                                    setCurrentGroupIndex(currentIndex);
                                }
                            }}
                            viewabilityConfig={{
                                minimumViewTime: 100,
                                itemVisiblePercentThreshold: 50
                            }}
                            getItemLayout={(data, index) => ({
                                length: 60,
                                offset: 60 * index,
                                index,
                            })}
                            initialScrollIndex={0}
                            maxToRenderPerBatch={10}
                            windowSize={5}
                            updateCellsBatchingPeriod={50}
                            disableIntervalMomentum={true}
                            disableScrollViewPanGestureRecognizer={false}
                            maintainVisibleContentPosition={{
                                minIndexForVisible: 0,
                                autoscrollToTopThreshold: 10
                            }}
                            stickyHeaderIndices={[]}
                            inverted={false}
                            keyboardDismissMode="on-drag"
                        >
                            {dateOptions.map((dateOption, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.dateButton,
                                        // 선택된 날짜는 항상 선택 표시 유지 (스크롤 중에도)
                                        selectedDateIndex === index && styles.dateButtonSelected,
                                        existingSchedules.has(dateOption.date) && styles.dateButtonDisabled
                                    ]}
                                    onPress={() => handleDateSelect(index)}
                                    disabled={existingSchedules.has(dateOption.date)}
                                >
                                    <Text style={[
                                        styles.dateButtonText,
                                        // 선택된 날짜는 항상 선택 표시 유지 (스크롤 중에도)
                                        selectedDateIndex === index && styles.dateButtonTextSelected,
                                        existingSchedules.has(dateOption.date) && styles.dateButtonTextDisabled
                                    ]}>
                                        {dateOption.day}
                        </Text>
                                    <Text style={[
                                        styles.dateButtonSubtext,
                                        // 선택된 날짜는 항상 선택 표시 유지 (스크롤 중에도)
                                        selectedDateIndex === index && styles.dateButtonSubtextSelected,
                                        existingSchedules.has(dateOption.date) && styles.dateButtonSubtextDisabled
                                    ]}>
                                        {dateOption.weekday}
                    </Text>
                                    {existingSchedules.has(dateOption.date) && (
                                        <Text style={styles.dateButtonDisabledText}>
                                            일정있음
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            ))}
                            
                            {/* 로딩 인디케이터 - 무한 로딩 제거로 인해 사용하지 않음 */}
                        </ScrollView>
            </View>
            
                    {/* 추천 그룹 목록 */}
                    {(() => {
                        if (loading && displayedGroups.length === 0) {
                            // 로딩 중이고 기존 그룹이 없을 때만 로딩 화면 표시
    return (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator size="large" color="#3B82F6" />
                                    <Text style={styles.loadingText}>추천 그룹을 불러오는 중...</Text>
            </View>
                            );
                        } else if (displayedGroups.length > 0) {
                            // 그룹이 있을 때 그룹 목록 표시
                            return (
                                <>
                                    <FlatList
                                        data={displayedGroups}
                                        renderItem={({ item, index }) => (
                                            <View style={styles.recommendedGroupsHeader}>
                                                <Text style={styles.recommendedGroupsTitle}>
                                                    추천 그룹
                    </Text>
                                                <Text style={styles.recommendedGroupsDescription}>
                        옆으로 스와이프하여 새로운 추천을 받아보세요!
                    </Text>
                
                                                {/* 개별 그룹 카드들을 상자 구분 없이 표시 */}
                <FlatList
                                                    data={item.users}
                                                    renderItem={renderUserCard}
                                                    keyExtractor={(user, idx) => `${user.employee_id}-${idx}`}
                                                    scrollEnabled={false}
                                                />
                                                
                                                {/* 제안 버튼 */}
                                                <TouchableOpacity
                                                    style={{
                                                        backgroundColor: proposedGroups.has(getGroupKeyFromIds(item.users.map(user => user.employee_id).filter(id => id && id.trim().length > 0).sort(), currentDate)) ? '#EF4444' : '#3B82F6',
                                                        borderRadius: 12,
                                                        paddingVertical: 14,
                                                        alignItems: 'center',
                                                        marginTop: 8, // 16에서 8로 줄여서 간격 축소
                                                        elevation: 1,
                                                        shadowColor: '#3B82F6',
                                                        shadowOffset: { width: 0, height: 1 },
                                                        shadowOpacity: 0.1,
                                                        shadowRadius: 2
                                                    }}
                                                    onPress={() => handleProposeGroup(item)}
                                                >
                                                    <Text style={{
                                                        color: '#FFFFFF',
                                                        fontSize: 16,
                                                        fontWeight: 'bold'
                                                    }}>
                                                        {proposedGroups.has(getGroupKeyFromIds(item.users.map(user => user.employee_id).filter(id => id && id.trim().length > 0).sort(), currentDate)) ? '제안 취소' : '점심 제안하기'}
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                    keyExtractor={(item, index) => `group-${index}`}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                                        pagingEnabled={true}
                                        snapToInterval={screenWidth - 0} // 32에서 16으로 줄여서 더 많이 이동
                                        decelerationRate={0.8}
                                        snapToAlignment="center"
                                        contentContainerStyle={styles.groupListContainer}
                                        onViewableItemsChanged={({ viewableItems }) => {
                                            // 현재 보고 있는 그룹의 인덱스 업데이트
                                            if (viewableItems.length > 0) {
                                                const currentIndex = viewableItems[0].index;
                                                setCurrentGroupIndex(currentIndex);
                                            }
                                        }}
                                        viewabilityConfig={{
                                            minimumViewTime: 100,
                                            itemVisiblePercentThreshold: 50
                                        }}
                                        onEndReached={loadMoreGroups}
                                        onEndReachedThreshold={0.1}
                                        ListFooterComponent={
                                            isLoadingMoreGroups ? (
                                                <View style={styles.groupLoadingIndicator}>
                                                    <ActivityIndicator size="small" color="#3B82F6" />
                                                    <Text style={styles.groupLoadingText}>그룹 로딩 중...</Text>
                                                </View>
                                            ) : null
                                        }
                />
                
                {/* 페이지 인디케이터 */}

                                </>
                            );
                        } else if (!loading && displayedGroups.length === 0 && allPossibleGroups.length === 0) {
                            // 로딩이 완료되었고 그룹이 없을 때만 빈 상태 표시
                            return (
                                <View style={styles.noGroupsContainer}>
                                    <Text style={styles.noGroupsText}>해당 날짜에 추천할 그룹이 없습니다.</Text>
            </View>
                            );
                        } else if (loading) {
                            // 로딩 중일 때 로딩 화면 표시
                            return (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator size="large" color="#3B82F6" />
                                    <Text style={styles.loadingText}>추천 그룹을 불러오는 중...</Text>
                                </View>
                            );
                        } else {
                            // 기타 상태 (로딩 중이지만 기존 그룹이 있는 경우 등)
                            return null;
                        }
                    })()}
                </ScrollView>
            ) : (
                // 제안 정보 탭
                <ScrollView 
                    style={styles.scrollView} 
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={loading}
                            onRefresh={handleManualRefresh}
                            colors={['#3B82F6']}
                            tintColor="#3B82F6"
                            title="새로고침 중..."
                            titleColor="#6B7280"
                        />
                    }
                >
                    {/* 🚨 강제 초기화: 전체 정리 후 제안 목록 강제 초기화 */}
                    {(() => {
                        // 전체 정리 후 제안 목록이 여전히 존재하면 강제 초기화
                        if (global.lastCleanupTime && (proposals.sent_proposals.length > 0 || proposals.received_proposals.length > 0)) {
                            console.log('🚨 [랜덤런치] 제안 탭 렌더링 시 강제 초기화 실행');
                            console.log('  - proposals.sent_proposals.length:', proposals.sent_proposals.length);
                            console.log('  - proposals.received_proposals.length:', proposals.received_proposals.length);
                            
                            // 즉시 상태 초기화
                            setTimeout(() => {
                                setProposals({ sent_proposals: [], received_proposals: [] });
                                setProposedGroups(new Set());
                                setConfirmedGroups([]);
                                console.log('✅ [랜덤런치] 제안 탭 렌더링 시 강제 초기화 완료');
                            }, 0);
                        }
                        return null;
                    })()}
                    {/* 🚨 수동 새로고침 버튼 - 초기화 후 데이터 복구용 */}
                    {(global.randomLunchProposalsCleared || global.forceEmptyRandomLunch || 
                      global.partyDataCleared || global.forceEmptyParties) && (
                        <View style={{margin: 16, padding: 16, backgroundColor: '#FEF3C7', borderRadius: 12, borderWidth: 1, borderColor: '#F59E0B'}}>
                            <Text style={{fontSize: 16, fontWeight: '600', color: '#92400E', marginBottom: 8, textAlign: 'center'}}>
                                🚨 데이터 초기화 상태
                            </Text>
                            <Text style={{fontSize: 14, color: '#92400E', marginBottom: 16, textAlign: 'center'}}>
                                제안 목록이 초기화되었습니다. 필요시 아래 버튼을 눌러 데이터를 복구하세요.
                            </Text>
                            <TouchableOpacity
                                style={{backgroundColor: '#F59E0B', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, alignItems: 'center'}}
                                onPress={() => {
                                    // 초기화 플래그 해제 후 데이터 새로고침
                                    global.randomLunchProposalsCleared = false;
                                    global.forceEmptyRandomLunch = false;
                                    global.partyDataCleared = false;
                                    global.forceEmptyParties = false;
                                    global.emergencyPartyCleanup = false;
                                    
                                    console.log('✅ [랜덤런치] 초기화 플래그 해제 - 데이터 새로고침 시작');
                                    
                                    // 제안 목록 새로고침
                                    fetchMyProposals();
                                    fetchConfirmedGroups();
                                }}
                            >
                                <Text style={{color: '#FFFFFF', fontSize: 16, fontWeight: '600'}}>
                                    🔄 데이터 복구하기
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    {/* 매칭 성공한 점심 모임 */}
                    {confirmedGroups.length > 0 && (
                        <View style={{marginBottom: 24}}>
                            <Text style={{fontSize: 20, fontWeight: 'bold', marginBottom: 12, color: '#3B82F6', paddingHorizontal: 16, marginTop: 16}}>
                                매칭 성공
                            </Text>
                            <FlatList
                                data={confirmedGroups}
                                renderItem={renderConfirmedGroupItem}
                                keyExtractor={item => `confirmed-${item.id}`}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 5 }}
                            />
                        </View>
                    )}
                    
                    <View style={{marginBottom: 24}}>
                        {/* 🔍 디버깅: 보낸 제안 렌더링 시 상태 확인 */}
                        {(() => {
                            console.log('🔍 [랜덤런치] 보낸 제안 렌더링 시점:');
                            console.log('  - proposals.sent_proposals:', proposals.sent_proposals);
                            console.log('  - proposals.sent_proposals.length:', proposals.sent_proposals.length);
                            console.log('  - proposals.sent_proposals 타입:', typeof proposals.sent_proposals);
                            console.log('  - proposals.sent_proposals 배열 여부:', Array.isArray(proposals.sent_proposals));
                            return null;
                        })()}
                        
                        <Text style={{fontSize: 20, fontWeight: 'bold', marginBottom: 12, color: '#000000', paddingHorizontal: 16, marginTop: 16}}>
                            보낸 제안
                        </Text>
                        {proposals.sent_proposals.length > 0 ? (
                            proposals.sent_proposals.map(item => (
                                <View key={item.id}>
                                    {renderProposalItem({ item, type: 'sent' })}
                                </View>
                            ))
                        ) : (
                            <Text style={{fontSize: 16, color: '#6B7280', textAlign: 'center', marginTop: 50, paddingHorizontal: 16}}>보낸 제안이 없습니다.</Text>
                        )}
                    </View>
                    
                    <View style={{marginBottom: 24}}>
                        {/* 🔍 디버깅: 받은 제안 렌더링 시 상태 확인 */}
                        {(() => {
                            console.log('🔍 [랜덤런치] 받은 제안 렌더링 시점:');
                            console.log('  - proposals.received_proposals:', proposals.received_proposals);
                            console.log('  - proposals.received_proposals.length:', proposals.received_proposals.length);
                            console.log('  - proposals.received_proposals 타입:', typeof proposals.received_proposals);
                            console.log('  - proposals.received_proposals 배열 여부:', Array.isArray(proposals.received_proposals));
                            return null;
                        })()}
                        
                        <Text style={{fontSize: 20, fontWeight: 'bold', marginBottom: 12, color: '#000000', paddingHorizontal: 16, marginTop: 16}}>
                            받은 제안
                        </Text>
                        {proposals.received_proposals.length > 0 ? (
                            proposals.received_proposals.map(item => (
                                <View key={item.id}>
                                    {renderProposalItem({ item, type: 'received' })}
                                </View>
                            ))
                        ) : (
                            <Text style={{fontSize: 16, color: '#6B7280', textAlign: 'center', marginTop: 50, paddingHorizontal: 16}}>받은 제안이 없습니다.</Text>
                        )}
                    </View>
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        // 🚨 중요: SafeAreaView 관련 설정 추가
        paddingTop: 0,
        paddingBottom: 0,
        paddingLeft: 0,
        paddingRight: 0,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 50,
    },
    loadingText: {
        fontSize: 16,
        color: '#6B7280',
        marginTop: 16,
    },
    groupLoadingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        marginBottom: 10,
        width: screenWidth,
    },
    groupLoadingText: {
        marginLeft: 5,
        fontSize: 14,
        color: '#6B7280',
    },
    dateScrollContainer: {
        paddingHorizontal: 6,
        paddingVertical: 3, // 위아래 여백 조정
        alignItems: 'center',
    },
    dateButton: {
        width: 50,
        height: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 4,
        marginVertical: 2, // 위아래 여백 추가
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        borderWidth: 2,
        borderColor: '#E5E7EB',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    dateButtonSelected: {
        backgroundColor: '#3B82F6',
        borderWidth: 0, // 테두리 완전 제거
        elevation: 1, // 최소한의 그림자만
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08, // 매우 연한 그림자
        shadowRadius: 1, // 작은 그림자 반경
        marginVertical: 2,
    },
    dateButtonDisabled: {
        backgroundColor: '#F3F4F6',
        borderColor: '#D1D5DB',
        opacity: 0.6,
        elevation: 0,
        shadowOpacity: 0,
        marginVertical: 2, // 위아래 여백 추가
    },
    dateButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#6B7280',
        marginBottom: 2,
    },
    dateButtonTextSelected: {
        color: '#FFFFFF',
    },
    dateButtonTextDisabled: {
        color: '#9CA3AF',
        fontWeight: 'normal',
    },
    dateButtonSubtext: {
        fontSize: 10,
        color: '#9CA3AF',
    },
    dateButtonSubtextSelected: {
        color: '#FFFFFF',
    },
    dateButtonSubtextDisabled: {
        color: '#D1D5DB',
        fontWeight: 'normal',
    },
    dateButtonDisabledText: {
        fontSize: 9,
        color: '#9CA3AF',
        textAlign: 'center',
        marginTop: 2,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        paddingVertical: 0, // 파티탭과 동일하게 0으로 설정
        paddingHorizontal: 0, // 파티탭과 동일하게 0으로 설정
        marginBottom: 0, // 파티탭과 동일하게 0으로 설정
        elevation: 0, // 파티탭과 동일하게 0으로 설정
        shadowColor: 'transparent', // 그림자 제거
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
    },
    tabButton: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12, // 파티탭과 동일하게 12로 설정
        paddingHorizontal: 0, // 파티탭과 동일하게 0으로 설정
    },
    tabButtonActive: {
        borderBottomWidth: 2,
        borderBottomColor: '#3B82F6',
    },
    tabButtonText: {
        fontSize: 16, // 파티탭과 동일하게 16으로 설정
        fontWeight: '600', // 파티탭과 동일하게 600으로 설정
        color: '#6B7280',
        marginTop: 2, // 파티탭과 동일하게 2로 설정
    },
    tabButtonTextActive: {
        color: '#3B82F6', // 파티탭과 동일하게 primary 색상 사용
    },
    scrollView: {
        flex: 1,
        // 🚨 중요: 스크롤뷰 위치 초기화를 위한 설정
        paddingTop: 0,
        paddingBottom: 0,
        paddingLeft: 0,
        paddingRight: 0,
    },
    dateSelectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1E293B',
        marginBottom: 12,
    },
    groupListContainer: {
        paddingHorizontal: 0,
        paddingTop: 16, // 제목과 설명 아래에 여백 추가
        alignItems: 'center', // 중앙 정렬
    },
    noGroupsContainer: {
        paddingVertical: 50,
        alignItems: 'center',
    },
    noGroupsText: {
        fontSize: 16,
        color: '#9CA3AF',
    },
    dateSelectionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        marginHorizontal: 16,
        marginBottom: 0, // 2에서 0으로 줄여서 간격 최소화
        elevation: 3,
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.1)',
    },
    recommendedGroupsHeader: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        marginHorizontal: 16,
        marginTop: 4, // 날짜 선택 컨테이너와의 간격을 4px로 줄여서 더 좁게 설정
        marginBottom: 20,
        elevation: 3,
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.1)',
        minHeight: 240, // 280에서 240으로 줄여서 공간 절약
        width: screenWidth - 32, // 스와이프에 적합한 너비 설정
    },
    recommendedGroupsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1E293B',
        marginBottom: 12,
    },
    recommendedGroupsDescription: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'left',
        marginBottom: 12, // 20에서 12로 줄여서 간격 축소
    },

});
