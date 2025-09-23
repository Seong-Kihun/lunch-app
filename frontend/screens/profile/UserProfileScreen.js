import React, { useState, useEffect, useCallback } from 'react';
import {
    View, SafeAreaView, ScrollView, 
    ActivityIndicator, Alert, TouchableOpacity, Text, StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../utils/commonStyles';
import { RENDER_SERVER_URL } from '../../config';
import { createFormStyles } from '../../components/common/FormStyles';
import { generateVirtualLastLunchHistory } from '../../utils/virtualUserData';

// 새로운 컴포넌트들 import
import UserProfileHeader from '../../components/profile/UserProfileHeader';
import UserActivitySection from '../../components/profile/UserActivitySection';
import UserInfoSection from '../../components/profile/UserInfoSection';
import UserActionButtons from '../../components/profile/UserActionButtons';

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: 0, // 좌우 패딩 제거
        paddingTop: 16,
    },
    scrollContainer: {
        flexGrow: 1,
        paddingBottom: 40,
    },
});

const UserProfileScreen = ({ route, navigation }) => {
    const { 
        friend, 
        employeeId, 
        isFriend, 
        fromPersonalSchedule, 
        fromRandomLunch, 
        returnToHome, 
        returnToSchedule, 
        scheduleDate, 
        scheduleEvent 
    } = route.params || {};
    
    const [userData, setUserData] = useState(friend || null);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingProfile, setIsLoadingProfile] = useState(!friend && employeeId);
    const [isFriendStatus, setIsFriendStatus] = useState(isFriend);
    

    const [pointsData, setPointsData] = useState(null);
    const [badges, setBadges] = useState([]);
    const [lastLunchTogether, setLastLunchTogether] = useState(null);
    const [activityStats, setActivityStats] = useState(null);
    
    const currentColors = global.currentColors || COLORS.light;
    const formStyles = createFormStyles(currentColors);
    
    const isMyProfile = userData?.employee_id === global.myEmployeeId || 
                       employeeId === global.myEmployeeId || 
                       (friend?.employee_id === global.myEmployeeId);

    // 🚨 중요: 스와이프 뒤로가기 처리
    const handleGoBack = () => {
        if (returnToHome && returnToSchedule) {
            navigation.navigate('홈', {
                screen: 'HomeScreen',
                params: {
                    showScheduleModal: true,
                    scheduleDate: scheduleDate,
                    scheduleEvent: scheduleEvent
                }
            });
        } else if (fromPersonalSchedule) {
            // AsyncStorage에 저장된 데이터가 있으므로 단순히 뒤로가기만 하면 됨
            navigation.goBack();
        } else if (fromRandomLunch) {
            navigation.goBack();
        } else {
            navigation.goBack();
        }
    };

    // 뒤로가기 처리 설정
    useFocusEffect(
        useCallback(() => {
            if (returnToHome && returnToSchedule) {
                navigation.setOptions({
                    headerLeft: () => (
                        <TouchableOpacity
                            onPress={handleGoBack}
                            style={{ marginLeft: 16 }}
                        >
                            <Ionicons name="arrow-back" size={24} color={currentColors.text} />
                        </TouchableOpacity>
                    ),
                });
            } else if (fromPersonalSchedule) {
                navigation.setOptions({
                    headerLeft: () => (
                        <TouchableOpacity
                            onPress={handleGoBack}
                            style={{ marginLeft: 16 }}
                        >
                            <Ionicons name="arrow-back" size={24} color={currentColors.text} />
                        </TouchableOpacity>
                    ),
                });
            } else if (fromRandomLunch) {
                navigation.setOptions({
                    headerLeft: () => (
                        <TouchableOpacity
                            onPress={handleGoBack}
                            style={{ marginLeft: 16 }}
                        >
                            <Ionicons name="arrow-back" size={24} color={currentColors.text} />
                        </TouchableOpacity>
                    ),
                });
            }
        }, [route.params, fromPersonalSchedule, fromRandomLunch, navigation])
    );

    // 사용자 프로필 정보 가져오기
    const fetchUserProfile = async () => {
        try {
            setIsLoadingProfile(true);
            
            // 사용자 프로필 조회 시작
            
            // 가상 유저인지 확인
            if (employeeId && parseInt(employeeId) <= 20) {
                // 가상 유저 프로필 조회
                
                // 가상 유저 데이터 직접 생성 (백엔드 데이터와 일치)
                const virtualUserData = {
                    employee_id: employeeId,
                    nickname: getVirtualUserNickname(employeeId),
                    food_preferences: getVirtualUserFoodPreferences(employeeId),
                    lunch_style: getVirtualUserLunchStyle(employeeId),
                    allergies: getVirtualUserAllergies(employeeId),
                    preferred_time: getVirtualUserPreferredTime(employeeId)
                };
                
                // 가상 유저 데이터 생성 완료
                setUserData(virtualUserData);
                
                // 포인트, 배지, 마지막 점심 정보도 가져오기
                fetchPointsData(employeeId);
                fetchBadgesData(employeeId);
                fetchLastLunchTogether(employeeId);
                fetchActivityStats(employeeId);
                
            } else {
                // 실제 사용자 프로필 조회
                const response = await fetch(`${RENDER_SERVER_URL}/users/${employeeId}`);
                if (response.ok) {
                    const userData = await response.json();
                    // 실제 사용자 데이터
                    setUserData(userData);
                    
                    // 포인트, 배지, 마지막 점심 정보도 가져오기
                    fetchPointsData(employeeId);
                    fetchBadgesData(employeeId);
                    fetchLastLunchTogether(employeeId);
                    fetchActivityStats(employeeId);
                } else {
                    console.error('🔍 [프로필] 사용자 프로필 조회 실패:', response.status);
                    Alert.alert('오류', '사용자 프로필을 불러올 수 없습니다.');
                }
            }
        } catch (error) {
            console.error('🔍 [프로필] 사용자 프로필 조회 오류:', error);
            Alert.alert('오류', '네트워크 오류가 발생했습니다.');
        } finally {
            setIsLoadingProfile(false);
        }
    };

    // 포인트 데이터 가져오기
    const fetchPointsData = async (userId) => {
        try {
            const response = await fetch(`${RENDER_SERVER_URL}/dev/users/${userId}/points`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            
            if (response.ok) {
                const data = await response.json();
                setPointsData(data);
            }
        } catch (error) {
            console.error('포인트 데이터 가져오기 실패:', error);
            // 기본 포인트 데이터 설정
            setPointsData({
                totalPoints: Math.floor(Math.random() * 5000) + 1000,
                currentLevel: Math.floor(Math.random() * 5) + 1,
                levelTitle: '점심 루키',
                nextLevelPoints: 1000
            });
        }
    };

    // 배지 데이터 가져오기
    const fetchBadgesData = async (userId) => {
        try {
            const response = await fetch(`${RENDER_SERVER_URL}/dev/users/${userId}/badges`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            
            if (response.ok) {
                const data = await response.json();
                setBadges(data);
            } else {
                // 기본 배지 데이터 설정
                setBadges([
                    { id: 1, name: '첫 점심', icon: '🍽️', description: '첫 번째 점심 약속 참여' },
                    { id: 2, name: '친구 사랑', icon: '👥', description: '친구 5명 추가' },
                    { id: 3, name: '맛집 탐험가', icon: '🔍', description: '10개 식당 방문' }
                ]);
            }
        } catch (error) {
            console.error('배지 데이터 가져오기 실패:', error);
            // 기본 배지 데이터 설정
            setBadges([
                { id: 1, name: '첫 점심', icon: '🍽️', description: '첫 번째 점심 약속 참여' },
                { id: 2, name: '친구 사랑', icon: '👥', description: '친구 5명 추가' },
                { id: 3, name: '맛집 탐험가', icon: '🔍', description: '10개 식당 방문' }
            ]);
        }
    };

    // 마지막 점심 정보 가져오기
    const fetchLastLunchTogether = async (userId) => {
        try {
            if (!global.myEmployeeId) return;
            
            // 공통 함수를 사용하여 일관된 가상 데이터 생성
            const lastLunchData = generateVirtualLastLunchHistory(userId, global.myEmployeeId);
            
            if (lastLunchData) {
                setLastLunchTogether({
                    date: lastLunchData.date,
                    restaurant: lastLunchData.restaurant
                });
                
                // 마지막 점심 데이터 설정 완료
            }
        } catch (error) {
            console.error('마지막 점심 정보 가져오기 실패:', error);
            
            // 에러 시에도 공통 함수 사용
            const lastLunchData = generateVirtualLastLunchHistory(userId, global.myEmployeeId);
            if (lastLunchData) {
                setLastLunchTogether({
                    date: lastLunchData.date,
                    restaurant: lastLunchData.restaurant
                });
            }
        }
    };

    // 활동 통계 가져오기
    const fetchActivityStats = async (userId) => {
        try {
            // 실제 API에서는 사용자 활동 통계를 가져와야 함
            // 여기서는 목업 데이터 사용
            setActivityStats({
                consecutiveLogin: Math.floor(Math.random() * 30) + 1,
                totalVisits: Math.floor(Math.random() * 50) + 10,
                totalReviews: Math.floor(Math.random() * 20) + 5
            });
        } catch (error) {
            console.error('활동 통계 가져오기 실패:', error);
            // 기본 데이터 설정
            setActivityStats({
                consecutiveLogin: 7,
                totalVisits: 25,
                totalReviews: 12
            });
        }
    };

    // 친구 추가
    const handleAddFriend = async () => {
        try {
            console.log('🔍 [프로필] 친구 추가 시작:', {
                myEmployeeId: global.myEmployeeId,
                targetEmployeeId: userData.employee_id,
                targetNickname: userData.nickname,
                currentFriendStatus: isFriendStatus
            });
            
            setIsLoading(true);
            
            // 친구 추가 시도
            const requestBody = {
                user_id: global.myEmployeeId || '1',
                friend_id: userData.employee_id
            };
            
            console.log('🔍 [프로필] 친구 추가 요청:', {
                url: `${RENDER_SERVER_URL}/friends/add`,
                method: 'POST',
                body: requestBody
            });
            
            const response = await fetch(`${RENDER_SERVER_URL}/friends/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });
            
            const data = await response.json();
            console.log('🔍 [프로필] 친구 추가 API 응답:', {
                status: response.status,
                statusText: response.statusText,
                data: data
            });
            
            // API 응답 확인
            if (response.ok) {
                // 친구 상태 업데이트
                setIsFriendStatus(true);
                console.log('🔍 [프로필] 친구 상태 업데이트됨: true');
                
                // 전역 친구 추가 플래그 설정
                if (typeof global !== 'undefined') {
                    global.friendAdded = true;
                    global.lastFriendAddedTime = Date.now();
                    global.forceRefreshFriends = true;
                    console.log('🔍 [프로필] 전역 플래그 설정됨:', {
                        friendAdded: global.friendAdded,
                        forceRefreshFriends: global.forceRefreshFriends
                    });
                }
                
                Alert.alert('성공', `${userData.nickname}님을 친구로 추가했습니다!`);
                
                // 친구 목록 새로고침을 위해 친구 탭으로 이동
                navigation.navigate('친구');
            } else {
                if (response.status === 400 && data.message === '이미 친구로 추가되어 있습니다.') {
                    // 이미 친구인 경우 상태 업데이트
                    console.log('🔍 [프로필] 이미 친구로 추가되어 있음, 상태 업데이트');
                    setIsFriendStatus(true);
                    Alert.alert('알림', '이미 친구로 추가되어 있습니다.');
                } else {
                    console.error('🔍 [프로필] 친구 추가 실패:', {
                        status: response.status,
                        message: data.message
                    });
                    Alert.alert('오류', data.message || '친구 추가에 실패했습니다.');
                }
            }
        } catch (error) {
            console.error('🔍 [프로필] 친구 추가 오류:', error);
            Alert.alert('오류', '네트워크 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    // 친구 삭제
    const handleRemoveFriend = async () => {
        Alert.alert(
            '친구 삭제',
            '정말로 이 친구를 삭제하시겠습니까?',
            [
                { text: '취소', style: 'cancel' },
                {
                    text: '삭제',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setIsLoading(true);
                            
                            const response = await fetch(`${RENDER_SERVER_URL}/friends/remove`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    user_id: global.myEmployeeId || '1',
                                    friend_id: userData.employee_id
                                })
                            });
                            
                            if (response.ok) {
                                setIsFriendStatus(false);
                                Alert.alert('성공', '친구가 삭제되었습니다.');
                            } else {
                                Alert.alert('오류', '친구 삭제에 실패했습니다.');
                            }
                        } catch (error) {
                            console.error('친구 삭제 오류:', error);
                            Alert.alert('오류', '네트워크 오류가 발생했습니다.');
                        } finally {
                            setIsLoading(false);
                        }
                    }
                }
            ]
        );
    };

    // 채팅 시작
    const handleStartChat = async () => {
        try {
            setIsLoading(true);
            
            // 채팅방 생성 시작
            
            // 1:1 채팅방 생성 또는 기존 채팅방 찾기
            const response = await fetch(`${RENDER_SERVER_URL}/chats/friends`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_ids: [global.myEmployeeId, userData.employee_id]
                })
            });
            
            // API 응답 확인
            
            if (response.ok) {
                const data = await response.json();
                // 채팅방 생성 성공
                
                navigation.navigate('소통', {
                    screen: 'ChatRoom',
                    params: {
                        chatId: data.room_id,
                        chatType: 'friend',
                        chatTitle: `${userData.nickname}님과의 채팅`
                    }
                });
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error('🔍 [채팅] API 응답 오류:', errorData);
                
                if (response.status === 400) {
                    Alert.alert('오류', errorData.message || '잘못된 요청입니다.');
                } else if (response.status === 500) {
                    Alert.alert('오류', '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
                } else {
                    Alert.alert('오류', `채팅방 생성에 실패했습니다. (${response.status})`);
                }
            }
        } catch (error) {
            console.error('🔍 [채팅] 채팅방 생성 오류:', error);
            
            if (error.message.includes('Network request failed')) {
                Alert.alert(
                    '네트워크 오류', 
                    '서버에 연결할 수 없습니다. 인터넷 연결을 확인하거나 잠시 후 다시 시도해주세요.',
                    [{ text: '확인' }]
                );
            } else {
                Alert.alert('오류', '채팅방 생성 중 오류가 발생했습니다.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // 손 흔들기
    const handlePoke = () => {
        Alert.alert('손 흔들기', `${userData.nickname}님에게 손을 흔들었습니다! 👋`);
    };

    // 친구 상태 확인
    const checkFriendStatus = async () => {
        try {
            console.log('🔍 [프로필] 친구 상태 확인 시작:', {
                userData: userData?.employee_id,
                myEmployeeId: global.myEmployeeId,
                isFriendParam: isFriend
            });
            
            if (!userData?.employee_id || !global.myEmployeeId) {
                console.log('🔍 [프로필] 필수 데이터 없음, 친구 상태 확인 건너뜀');
                return;
            }
            
            // 🚨 디버깅: 현재 친구 상태 로그
            console.log('🔍 [프로필] 현재 친구 상태:', {
                isFriendStatus,
                isFriendParam: isFriend,
                routeParams: route.params
            });
            
            // 1. 먼저 route.params의 isFriend 값 확인
            if (route.params?.isFriend === true) {
                console.log('🔍 [프로필] route.params에서 친구 상태 확인됨');
                setIsFriendStatus(true);
                return;
            }
            
            // 2. 실제 친구 관계 API에서 친구 상태 확인
            try {
                const realFriendsResponse = await fetch(`${RENDER_SERVER_URL}/api/friends/${global.myEmployeeId}`);
                if (realFriendsResponse.ok) {
                    const realFriendsData = await realFriendsResponse.json();
                    const isAlreadyFriend = realFriendsData.some(friend => 
                        friend.employee_id === userData.employee_id
                    );
                    
                    console.log('🔍 [프로필] 실제 친구 API 결과:', {
                        totalFriends: realFriendsData.length,
                        isAlreadyFriend,
                        searchedId: userData.employee_id
                    });
                    
                    if (isAlreadyFriend) {
                        setIsFriendStatus(true);
                        return;
                    }
                } else {
                    console.log('🔍 [프로필] 실제 친구 API 응답 오류:', realFriendsResponse.status);
                }
            } catch (error) {
                console.log('🔍 [프로필] 실제 친구 API 호출 실패:', error.message);
            }
            
            // 3. 가상 친구 관계 API에서 친구 상태 확인 (개발 환경용)
            const response = await fetch(`${RENDER_SERVER_URL}/dev/friends/${global.myEmployeeId || '1'}`);
            if (response.ok) {
                const friendsData = await response.json();
                const isAlreadyFriend = friendsData.some(friend => 
                    friend.employee_id === userData.employee_id
                );
                
                console.log('🔍 [프로필] 가상 친구 API 결과:', {
                    totalFriends: friendsData.length,
                    isAlreadyFriend,
                    searchedId: userData.employee_id,
                    allFriendIds: friendsData.map(f => f.employee_id)
                });
                
                if (isAlreadyFriend) {
                    setIsFriendStatus(true);
                }
            }
        } catch (error) {
            console.error('🔍 [프로필] 친구 상태 확인 오류:', error);
        }
    };

    // 프로필 수정
    const handleEditProfile = () => {
        navigation.navigate('ProfileEdit', { userData });
    };

    // 가상 유저 닉네임 반환 (API 데이터와 일치하도록 수정)
    const getVirtualUserNickname = (userId) => {
        const nicknames = {
            '1': '김철수', '2': '이영희', '3': '박민수', '4': '최지은', '5': '정현우',
            '6': '한소영', '7': '윤준호', '8': '송미라', '9': '강동현', '10': '임서연',
            '11': '오태호', '12': '신유진', '13': '조성민', '14': '백하은', '15': '남준석',
            '16': '류지현', '17': '차준호', '18': '구미영', '19': '홍성훈', '20': '전소연'
        };
        
        return nicknames[userId] || `사용자 ${userId}`;
    };

    // 가상 유저 음식 선호도 반환
    const getVirtualUserFoodPreferences = (userId) => {
        const foodPreferences = {
            '1': ['한식', '중식'], '2': ['양식', '일식'], '3': ['한식', '분식'], '4': ['양식', '한식'], '5': ['중식', '한식'],
            '6': ['일식', '양식'], '7': ['한식', '양식'], '8': ['중식', '일식'], '9': ['한식', '분식'], '10': ['양식', '한식'],
            '11': ['일식', '중식'], '12': ['중식', '한식'], '13': ['한식', '분식'], '14': ['양식', '한식'], '15': ['한식', '중식'],
            '16': ['일식', '양식'], '17': ['한식', '분식'], '18': ['양식', '일식'], '19': ['한식', '일식'], '20': ['중식', '양식']
        };
        
        // 일부 유저는 음식 선호도 정보가 없음 (실제 상황 반영)
        if (['3', '7', '12', '16'].includes(userId)) {
            return [];
        }
        
        return foodPreferences[userId] || ['한식'];
    };

    // 가상 유저 점심 성향 반환
    const getVirtualUserLunchStyle = (userId) => {
        const lunchStyles = {
            '1': ['맛집 탐방', '새로운 메뉴 도전'], '2': ['건강한 음식', '다이어트'], '3': ['빠른 식사', '가성비'], '4': ['다양한 음식', '새로운 메뉴 도전'],
            '5': ['맛집 탐방', '분위기 좋은 곳'], '6': ['건강한 음식', '다이어트'], '7': ['건강한 식사', '빠른 식사'], '8': ['맛있는 음식', '친구들과 함께'],
            '9': ['다양한 음식', '가성비 좋은 곳'], '10': ['전통 음식', '분위기 좋은 곳'], '11': ['맛집 탐방', '새로운 메뉴 도전'], '12': ['건강한 식사', '혼자 조용히'],
            '13': ['빠른 식사', '가성비'], '14': ['다양한 음식', '친구들과 함께'], '15': ['전통 음식', '가성비 좋은 곳'], '16': ['맛집 탐방', '분위기 좋은 곳'],
            '17': ['건강한 식사', '빠른 식사'], '18': ['맛있는 음식', '친구들과 함께'], '19': ['다양한 음식', '새로운 메뉴 도전'], '20': ['전통 음식', '가성비 좋은 곳']
        };
        
        // 일부 유저는 점심 성향 정보가 없음 (실제 상황 반영)
        if (['2', '6', '11', '17'].includes(userId)) {
            return [];
        }
        
        return lunchStyles[userId] || ['맛집 탐방'];
    };

    // 가상 유저 알레르기 정보 반환
    const getVirtualUserAllergies = (userId) => {
        // 일부 유저는 알레르기 정보가 없음 (실제 상황 반영)
        if (['4', '9', '14', '19'].includes(userId)) {
            return [];
        }
        
        // 모든 가상 유저는 알레르기가 없음
        return ['없음'];
    };

    // 가상 유저 선호 시간 반환
    const getVirtualUserPreferredTime = (userId) => {
        const preferredTimes = {
            '1': '12:00', '2': '12:30', '3': '12:00', '4': '12:00', '5': '11:30',
            '6': '12:00', '7': '12:15', '8': '11:45', '9': '12:00', '10': '12:00',
            '11': '12:00', '12': '12:30', '13': '12:00', '14': '12:00', '15': '12:30',
            '16': '12:00', '17': '12:00', '18': '12:00', '19': '12:00', '20': '12:00'
        };
        
        // 일부 유저는 선호 시간 정보가 없음 (실제 상황 반영)
        if (['5', '10', '15', '20'].includes(userId)) {
            return null;
        }
        
        return preferredTimes[userId] || '12:00';
    };

    useEffect(() => {
        if (employeeId && !friend) {
            fetchUserProfile();
        } else if (friend) {
            setUserData(friend);
            fetchPointsData(friend.employee_id);
            fetchBadgesData(friend.employee_id);
            fetchLastLunchTogether(friend.employee_id);
            fetchActivityStats(friend.employee_id);
        }
    }, [employeeId, friend]);
    
    // 🚨 디버깅: 친구 상태 확인을 위한 useEffect 추가
    useEffect(() => {
        if (userData?.employee_id) {
            console.log('🔍 [프로필] userData 변경됨, 친구 상태 확인 시작:', {
                userData: userData.employee_id,
                isFriendParam: isFriend,
                routeParams: route.params
            });
            
            // 디버그 정보 로그 출력
            console.log('🔍 [프로필] 디버그 정보:', {
                routeParams: route.params,
                isFriendParam: isFriend,
                myEmployeeId: global.myEmployeeId,
                userEmployeeId: userData.employee_id
            });
            
            // 친구 상태 확인
            checkFriendStatus();
        }
    }, [userData?.employee_id, isFriend, route.params]);

    if (isLoadingProfile) {
        return (
            <SafeAreaView style={formStyles.safeArea}>
                <View style={formStyles.loadingContainer}>
                    <ActivityIndicator size="large" color={currentColors.primary} />
                    <Text style={{ 
                        marginTop: 16, 
                        fontSize: 16, 
                        color: currentColors.textSecondary 
                    }}>
                        사용자 정보를 불러오는 중...
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!userData) {
        return (
            <SafeAreaView style={formStyles.safeArea}>
                <View style={formStyles.loadingContainer}>
                    <Ionicons 
                        name="person-circle-outline" 
                        size={64} 
                        color={currentColors.textSecondary} 
                        style={{ marginBottom: 16 }}
                    />
                    <Text style={{ 
                        fontSize: 18, 
                        color: currentColors.text, 
                        textAlign: 'center',
                        marginBottom: 8
                    }}>
                        사용자 정보를 불러올 수 없습니다
                    </Text>
                    <Text style={{ 
                        fontSize: 14, 
                        color: currentColors.textSecondary, 
                        textAlign: 'center',
                        marginBottom: 24
                    }}>
                        네트워크 연결을 확인하고 다시 시도해주세요
                    </Text>
                    <TouchableOpacity
                        style={[formStyles.button, formStyles.buttonPrimary]}
                        onPress={fetchUserProfile}
                    >
                        <Text style={formStyles.buttonText}>
                            다시 시도
                        </Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[formStyles.container, { backgroundColor: currentColors.background }]}>
            <ScrollView 
                style={formStyles.scrollView} 
                contentContainerStyle={formStyles.scrollContainer}
                showsVerticalScrollIndicator={false}
            >
                {/* 프로필 헤더 */}
                <UserProfileHeader
                    userData={userData}
                    pointsData={pointsData}
                    isMyProfile={isMyProfile}
                    isFriend={isFriend}
                    onPoke={handlePoke}
                    currentColors={currentColors}
                />

                {/* 활동 정보 섹션 */}
                <UserActivitySection
                    lastLunchTogether={lastLunchTogether}
                    badges={badges}
                    isMyProfile={isMyProfile} // 내 프로필 여부 전달
                    currentColors={currentColors}
                />

                {/* 사용자 정보 섹션 */}
                <UserInfoSection
                    userData={userData}
                    currentColors={currentColors}
                />

                {/* 액션 버튼들 */}
                <UserActionButtons
                    isMyProfile={isMyProfile}
                    isFriend={isFriendStatus}
                    isLoading={isLoading}
                    onEditProfile={handleEditProfile}
                    onAddFriend={handleAddFriend}
                    onRemoveFriend={handleRemoveFriend}
                    onStartChat={handleStartChat}
                    currentColors={currentColors}
                />
                

            </ScrollView>
        </SafeAreaView>
    );
};

export default UserProfileScreen;
