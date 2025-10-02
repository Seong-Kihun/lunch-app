import React, { useState, useEffect, useCallback } from 'react';
import {
    View, SafeAreaView, ScrollView, 
    ActivityIndicator, Alert, TouchableOpacity, Text, StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../utils/commonStyles';
import appService from '../services/AppService';
import{ createFormStyles } from '../../components/common/FormStyles';
// 가상 유저 데이터 import 제거

// 새로운 컴포넌트들;
import
importUserProfileHeader from '../../components/profile/UserProfileHeader';
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
            
            // 실제 사용자 프로필 조회
            const response = await fetch(`${RENDER_SERVER_URL}/api/users/${employeeId}`);
            if (response.ok) {
                const userData = await response.json();
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
            
            // 실제 API에서 마지막 점심 정보 조회
            const response = await fetch(`${RENDER_SERVER_URL}/api/users/${userId}/last-lunch/${global.myEmployeeId}`);
            if (response.ok) {
                const data = await response.json();
                setLastLunchTogether(data);
            } else {
                // API 데이터가 없으면 기본값 설정
                setLastLunchTogether(null);
            }
        } catch (error) {
            console.error('마지막 점심 정보 가져오기 실패:', error);
            setLastLunchTogether(null);
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

    // 가상 유저 관련 함수들 제거 - 실제 API만 사용

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
