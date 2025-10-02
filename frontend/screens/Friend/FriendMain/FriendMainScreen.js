import React, { useState, useCallback, useEffect, useLayoutEffect } from 'react';
import {
    View, Text, TouchableOpacity, SafeAreaView, ScrollView,
    FlatList, TextInput, ActivityIndicator, Alert, Modal, Pressable
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../utils/commonStyles';
import appService from '../services/AppService'// 가상 유저 데이터;
import 제거
import{ apiClient } from '../../../utils/apiClient';

const FriendMainScreen = ({ navigation, route }) => {
    const [friends, setFriends] = useState([]);
    const [filteredFriends, setFilteredFriends] = useState([]);
    const [profile, setProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showSearchInput, setShowSearchInput] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showActionModal, setShowActionModal] = useState(false);
    const currentColors = global.currentColors || COLORS.light;

    useFocusEffect(useCallback(() => {
        console.log('🔍 [친구] 화면 포커스됨, 데이터 새로고침 시작');
        
        // 친구 추가/삭제 플래그 확인 및 친구 목록 새로고침
        if (global.friendAdded || global.friendRemoved || route.params?.refreshFriends || global.forceRefreshFriends) {
            console.log('🔄 [친구] 친구 상태 변경 감지, 친구 목록 새로고침:', {
                friendAdded: global.friendAdded,
                friendRemoved: global.friendRemoved,
                refreshFriends: route.params?.refreshFriends,
                forceRefreshFriends: global.forceRefreshFriends
            });
            
            // 친구 목록 새로고침
            fetchFriendsData();
            
            // 전역 변수 초기화 (새로고침 후에 초기화)
            setTimeout(() => {
            if (typeof global !== 'undefined') {
                global.friendAdded = false;
                    global.friendRemoved = false;
                global.lastFriendAddedTime = undefined;
                global.forceRefreshFriends = false;
                    console.log('🔍 [친구] 전역 변수 초기화 완료');
            }
            }, 100);
            
            // route params 초기화
            if (route.params?.refreshFriends) {
                navigation.setParams({ refreshFriends: undefined });
                console.log('🔍 [친구] route params 초기화 완료');
            }
        } else {
            console.log('🔍 [친구] 친구 상태 변경 없음, 일반 데이터 로드');
            // 일반 데이터 로드
            fetchFriendsData();
        }
        
        // 프로필 정보는 항상 로드
        fetchProfile();
    }, [global?.friendAdded, global?.friendRemoved, route.params?.refreshFriends, global?.forceRefreshFriends]));

    // 헤더에 새로고침 버튼 추가
    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity
                        onPress={fetchFriendsData}
                        style={{ marginRight: 16, padding: 8 }}
                        disabled={isLoading}
                    >
                        <Ionicons 
                            name="refresh" 
                            size={24} 
                            color={isLoading ? currentColors.gray : currentColors.primary} 
                        />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={toggleSearchInput}
                        style={{ marginRight: 16, padding: 8 }}
                    >
                        <Ionicons name="search" size={24} color={currentColors.primary} />
                    </TouchableOpacity>
                </View>
            ),
        });
    }, [navigation, isLoading, currentColors]);

    // 헤더 검색 버튼 클릭 감지
    useEffect(() => {
        if (route.params?.toggleSearch) {
            toggleSearchInput();
            // 파라미터 초기화
            navigation.setParams({ toggleSearch: undefined });
        }
    }, [route.params?.toggleSearch]);

    const fetchProfile = async () => {
        try {
            // 프로필 정보 가져오기
            if (global.myEmployeeId) {
                console.log('🔍 [친구] 프로필 조회 시작:', global.myEmployeeId);
                
                const profileResponse = await appService.get(`/users/${global.myEmployeeId});
                if (profileResponse.ok) {
                    const profileData = await profileResponse.json();
                    console.log(`)'🔍 [친구] 프로필 조회 성공:', profileData);
                    setProfile(profileData);
                } else {
                    console.error('🔍 [친구] 프로필 API 응답 오류:', profileResponse.status);
                    // API 응답 오류 시 기본 프로필 정보 설정
                    setProfile({
                        nickname: global.myNickname || '사용자',
                        lunch_preference: '취향 정보 없음'
                    });
                }
            } else {
                console.log('🔍 [친구] global.myEmployeeId 없음, 기본 프로필 설정');
                // global.myEmployeeId가 없을 때 기본 프로필 정보 설정
                setProfile({
                    nickname: global.myNickname || '사용자',
                    lunch_preference: '취향 정보 없음'
                });
            }
        } catch (error) {
            console.error('🔍 [친구] 프로필 정보 조회 오류:', error);
            // 프로필 로딩 실패 시에도 기본 정보 표시
            setProfile({
                nickname: global.myNickname || '사용자',
                lunch_preference: '취향 정보 없음'
            });
        }
    };

    const fetchFriendsData = async () => {
        try {
            setIsLoading(true);
            console.log('🔍 [친구] 친구 데이터 조회 시작:', {
                myEmployeeId: global.myEmployeeId,
                serverUrl: RENDER_SERVER_URL
            });
            
            // 실제 친구 관계 API 사용
            try {
                // 먼저 실제 친구 관계 API 시도 (UserProfileScreen과 동일한 API 사용)
                const friendsResponse = await apiClient.get(`${RENDER_SERVER_URL}/friends/${global.myEmployeeId || '1'}`);
                if (friendsResponse.ok) {
                    const responseData = await friendsResponse.json();
                    // API 응답에서 friends 배열 추출 (실제 친구 API는 배열을 직접 반환)
                    const friendsData = Array.isArray(responseData) ? responseData : (responseData.friends || []);
                    console.log('🔍 [친구] 실제 친구 관계 로드 성공:', {
                        count: friendsData.length,
                        friendIds: friendsData.map(f => f.employee_id)
                    });
                    
                    // 실제 친구 데이터 사용 (마지막 점심 히스토리는 API에서 제공)
                    const friendsWithLastLunch = friendsData;
                    
                    setFriends(friendsWithLastLunch);
                    setFilteredFriends(friendsWithLastLunch);
                    return; // 실제 친구 데이터 로드 성공 시 종료
                } else if (friendsResponse.status === 404) {
                    // 친구 관계 API가 없는 경우 가상 친구 관계 API 사용 (개발 환경)
                    console.log('🔍 [친구] 실제 친구 관계 API 없음, 가상 친구 관계 사용');
                } else {
                    console.error('🔍 [친구] 실제 친구 관계 API 응답 오류:', friendsResponse.status);
                    // API 오류 시에도 가상 친구 API 시도
                }
            } catch (error) {
                console.error('🔍 [친구] 실제 친구 관계 API 호출 실패:', error);
                // API 호출 실패 시에도 가상 친구 API 시도
            }
            
            // 실제 친구 관계 API 실패 시 가상 친구 관계 API 사용 (개발 환경)
            await fetchVirtualFriendsData();
        } catch (error) {
            console.error('친구 데이터 조회 오류:', error);
            setFriends([]);
            setFilteredFriends([]);
        } finally {
            setIsLoading(false);
        }
    };

    // 가상 친구 관계 데이터 가져오기 (개발 환경용)
    const fetchVirtualFriendsData = async () => {
        try {
            console.log('🔍 [친구] 가상 친구 데이터 조회 시작');
                const friendsResponse = await apiClient.get(`${RENDER_SERVER_URL}/dev/friends/${global.myEmployeeId || '1'}`);
                if (friendsResponse.ok) {
                    const responseData = await friendsResponse.json();
                    // API 응답에서 friends 배열 추출
                    const friendsData = responseData.friends || responseData;
                console.log('🔍 [친구] 가상 친구 API 응답:', {
                    count: friendsData.length,
                    friendIds: friendsData.map(f => f.employee_id),
                    friendNames: friendsData.map(f => f.nickname)
                });
                    
                    // 실제 친구 데이터 사용
                    const friendsWithLastLunch = friendsData;
                    
                    setFriends(friendsWithLastLunch);
                    setFilteredFriends(friendsWithLastLunch);
                console.log('🔍 [친구] 가상 친구 관계 로드 성공:', {
                    count: friendsWithLastLunch.length,
                    processedFriendIds: friendsWithLastLunch.map(f => f.employee_id)
                });
                } else {
                    console.error('🔍 [친구] 가상 친구 API 응답 오류:', friendsResponse.status);
                    setFriends([]);
                    setFilteredFriends([]);
                }
            } catch (error) {
                console.error('🔍 [친구] 가상 친구 API 호출 실패:', error);
                setFriends([]);
                setFilteredFriends([]);
                
                if (error.message.includes('Network request failed')) {
                    Alert.alert(
                        '네트워크 오류', 
                        '서버에 연결할 수 없습니다. 인터넷 연결을 확인하거나 잠시 후 다시 시도해주세요.',
                        [{ text: '확인' }]
                    );
                }
        }
    };

    // 친구 아이템 클릭 처리
    const handleFriendPress = (friend) => {
        console.log('🔍 [친구] 친구 클릭:', {
            friendId: friend.employee_id,
            friendName: friend.nickname,
            isFriend: true,
            myEmployeeId: global.myEmployeeId
        });
        
        // 친구를 클릭하면 프로필로 이동
        navigation.navigate('UserProfile', { 
            employeeId: friend.employee_id,
            isFriend: true 
        });
    };

    // 친구 여부 확인 함수
    const isFriend = (employeeId) => {
        return friends.some(friend => friend.employee_id === employeeId);
    };

    // 친구 추가 함수
    const addFriend = async (employeeId) => {
        try {
            console.log('🔍 [친구] 친구 추가 시작:', {
                myEmployeeId: global.myEmployeeId,
                targetEmployeeId: employeeId
            });
            
            // UserProfileScreen과 동일한 API 사용
            const response = await appService.get(`/friends/add, {
                method: `)'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: global.myEmployeeId || '1',
                    friend_id: employeeId
                })
            });

            const data = await response.json();
            console.log('🔍 [친구] 친구 추가 API 응답:', {
                status: response.status,
                data: data
            });

            if (response.ok) {
                console.log('🔍 [친구] 친구 추가 성공:', employeeId);
                // 전역 변수 설정하여 다른 화면에서도 상태 변경 감지
                global.friendAdded = true;
                global.forceRefreshFriends = true;
                // 친구 목록 새로고침
                fetchFriendsData();
                Alert.alert('성공', '친구가 추가되었습니다.');
            } else if (response.status === 400 && data.message === '이미 친구로 추가되어 있습니다.') {
                console.log('🔍 [친구] 이미 친구로 추가되어 있음');
                Alert.alert('알림', '이미 친구로 추가되어 있습니다.');
            } else {
                console.error('🔍 [친구] 친구 추가 실패:', response.status, data.message);
                Alert.alert('오류', data.message || '친구 추가에 실패했습니다.');
            }
        } catch (error) {
            console.error('🔍 [친구] 친구 추가 오류:', error);
            Alert.alert('오류', '친구 추가 중 오류가 발생했습니다.');
        }
    };

    // 친구 삭제 함수
    const removeFriend = async (employeeId) => {
        try {
            console.log('🔍 [친구] 친구 삭제 시작:', {
                myEmployeeId: global.myEmployeeId,
                targetEmployeeId: employeeId
            });
            
            // UserProfileScreen과 동일한 API 사용
            const response = await appService.get(`/friends/remove, {
                method: `)'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: global.myEmployeeId || '1',
                    friend_id: employeeId
                })
            });

            const data = await response.json();
            console.log('🔍 [친구] 친구 삭제 API 응답:', {
                status: response.status,
                data: data
            });

            if (response.ok) {
                console.log('🔍 [친구] 친구 삭제 성공:', employeeId);
                // 전역 변수 설정하여 다른 화면에서도 상태 변경 감지
                global.friendRemoved = true;
                global.forceRefreshFriends = true;
                // 친구 목록 새로고침
                fetchFriendsData();
                Alert.alert('성공', '친구가 삭제되었습니다.');
            } else {
                console.error('🔍 [친구] 친구 삭제 실패:', response.status, data.message);
                Alert.alert('오류', data.message || '친구 삭제에 실패했습니다.');
            }
        } catch (error) {
            console.error('🔍 [친구] 친구 삭제 오류:', error);
            Alert.alert('오류', '친구 삭제 중 오류가 발생했습니다.');
        }
    };

    // 친구 검색 함수
    const handleFriendSearch = (query) => {
        setSearchQuery(query);
        if (!query.trim()) {
            setFilteredFriends(friends);
        } else {
            const filtered = friends.filter(friend => 
                friend && typeof friend.nickname === 'string' && friend.nickname.toLowerCase().includes(query.toLowerCase())
            );
            setFilteredFriends(filtered);
        }
    };

    // 검색 입력창 토글
    const toggleSearchInput = () => {
        setShowSearchInput(!showSearchInput);
        if (showSearchInput) {
            // 검색창을 닫을 때 초기화
            setSearchQuery('');
            setFilteredFriends(friends);
        }
    };



    // 로딩 중일 때 표시할 화면
    if (isLoading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: currentColors.background }}>
                <View style={{ 
                    flex: 1, 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    paddingHorizontal: 20
                }}>
                    <ActivityIndicator size="large" color={currentColors.primary} />
                    <Text style={{ 
                        marginTop: 16, 
                        fontSize: 16, 
                        color: currentColors.textSecondary,
                        textAlign: 'center'
                    }}>
                        친구 목록을 불러오는 중...
                    </Text>
                    <Text style={{ 
                        marginTop: 8, 
                        fontSize: 14, 
                        color: currentColors.textSecondary,
                        textAlign: 'center'
                    }}>
                        잠시만 기다려주세요
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    // 친구가 없을 때 표시할 화면 (주석 처리 - 항상 메인 화면 표시)
    // if (friends.length === 0) {
    //     return (
    //         <SafeAreaView style={{ flex: 1, backgroundColor: currentColors.background }}>
    //             <View style={{ 
    //                 flex: 1, 
    //                 justifyContent: 'center', 
    //                 alignItems: 'center',
    //                 paddingHorizontal: 20
    //             }}>
    //                 <Ionicons 
    //                     name="people-outline" 
    //                     size={64} 
    //                     color={currentColors.textSecondary} 
    //                 />
    //                 <Text style={{ 
    //                     marginTop: 16, 
    //                     fontSize: 18, 
    //                     fontWeight: '600',
    //                     color: currentColors.text,
    //                     textAlign: 'center'
    //                 }}>
    //                     아직 친구가 없습니다
    //                 </Text>
    //                 <Text style={{ 
    //                     marginTop: 8, 
    //                     fontSize: 14, 
    //                     color: currentColors.textSecondary,
    //                     textAlign: 'center',
    //                     lineHeight: 20
    //                 }}>
    //                     친구 추가 버튼을 눌러서{'\n'}새로운 친구를 찾아보세요!
    //                 </Text>
    //                 <TouchableOpacity
    //                     style={{
    //                         marginTop: 24,
    //                         backgroundColor: currentColors.primary,
    //                         paddingHorizontal: 24,
    //                         paddingVertical: 12,
    //                         borderRadius: 8
    //                     }}
    //                     onPress={() => navigation.navigate('SearchUsers')}
    //                 >
    //                     <Text style={{ 
    //                         color: 'white', 
    //                         fontSize: 16, 
    //                         fontWeight: '600' 
    //                     }}>
    //                         친구 찾기
    //                     </Text>
    //                 </TouchableOpacity>
    //             </View>
    //         </SafeAreaView>
    //     );
    // }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: currentColors.background }}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
                {/* 마이페이지 카드 - 홈탭과 동일한 스타일 적용 */}
                <View style={{
                    backgroundColor: currentColors.surface,
                    borderRadius: 20,
                    marginHorizontal: 16,
                    marginTop: 20,
                    marginBottom: 16,
                    padding: 20,
                    elevation: 3,
                    shadowColor: currentColors.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    borderWidth: 1,
                    borderColor: 'rgba(59, 130, 246, 0.1)'
                }}>
                    <Text style={{ 
                        fontSize: 20, 
                        fontWeight: 'bold', 
                        color: currentColors.text, 
                        marginBottom: 16,
                        letterSpacing: -0.5 
                    }}>
                        👤 마이페이지
                    </Text>
                    {profile ? (
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => navigation.navigate('MyPageMain')}
                            style={{
                                backgroundColor: currentColors.background,
                                borderRadius: 16,
                                padding: 16
                            }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={{
                                    width: 56,
                                    height: 56,
                                    borderRadius: 28,
                                    backgroundColor: currentColors.primary,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    marginRight: 16,
                                    shadowColor: currentColors.primary,
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.15,
                                    shadowRadius: 8,
                                    elevation: 2
                                }}>
                                    <Text style={{ 
                                        color: 'white', 
                                        fontWeight: 'bold', 
                                        fontSize: 22,
                                        letterSpacing: -0.5 
                                    }}>
                                        {profile.nickname ? profile.nickname.charAt(0) : '?'}
                                    </Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ 
                                        fontSize: 18, 
                                        fontWeight: '600', 
                                        color: currentColors.text,
                                        letterSpacing: -0.3 
                                    }}>
                                        {profile.nickname || '닉네임 없음'}
                                    </Text>
                                    <Text style={{ 
                                        fontSize: 14, 
                                        color: currentColors.textSecondary, 
                                        marginTop: 4,
                                        letterSpacing: -0.2 
                                    }}>
                                        {profile.lunch_preference || '취향 정보 없음'}
                                    </Text>
                                </View>
                                <View style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 16,
                                    backgroundColor: currentColors.white,
                                    justifyContent: 'center',
                                    alignItems: 'center'
                                }}>
                                    <Ionicons name="chevron-forward" size={18} color={currentColors.primary} />
                                </View>
                            </View>
                        </TouchableOpacity>
                    ) : (
                        <View style={{
                            backgroundColor: currentColors.background,
                            borderRadius: 16,
                            padding: 20,
                            alignItems: 'center'
                        }}>
                            <Text style={{ 
                                color: currentColors.textSecondary, 
                                fontSize: 16,
                                letterSpacing: -0.3 
                            }}>
                                프로필 정보를 불러오는 중...
                            </Text>
                        </View>
                    )}
                </View>

                {/* 랭킹 카드 - 홈탭과 동일한 스타일 적용 */}
                <TouchableOpacity 
                    style={{ 
                        backgroundColor: currentColors.primary,
                        borderRadius: 20,
                        marginHorizontal: 16,
                        marginBottom: 16,
                        padding: 20,
                        elevation: 4,
                        shadowColor: currentColors.primary,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.15,
                        shadowRadius: 12,
                        borderWidth: 1,
                        borderColor: 'rgba(59, 130, 246, 0.1)'
                    }} 
                    onPress={() => navigation.navigate('RankingScreen')}
                    activeOpacity={0.9}
                >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ 
                                color: '#FFFFFF', 
                                fontSize: 22, 
                                fontWeight: 'bold',
                                letterSpacing: -0.5,
                                marginBottom: 4
                            }}>
                                랭킹 🏆
                            </Text>
                            <Text style={{ 
                                color: 'rgba(255, 255, 255, 0.9)', 
                                fontSize: 15, 
                                fontWeight: '500',
                                letterSpacing: -0.3,
                                lineHeight: 20
                            }}>
                                가장 많이 활동한 밥플을 확인해보세요!
                            </Text>
                        </View>
                        <View style={{
                            width: 48,
                            height: 48,
                            borderRadius: 24,
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            justifyContent: 'center',
                            alignItems: 'center'
                        }}>
                            <Ionicons name="trophy" size={28} color="#FFFFFF" />
                        </View>
                    </View>
                </TouchableOpacity>

                {/* 친구 목록 카드 - 홈탭과 동일한 스타일 적용 */}
                <View style={{
                    backgroundColor: currentColors.surface,
                    borderRadius: 20,
                    marginHorizontal: 16,
                    marginBottom: 20,
                    padding: 20,
                    elevation: 3,
                    shadowColor: currentColors.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    borderWidth: 1,
                    borderColor: 'rgba(59, 130, 246, 0.1)'
                }}>
                    <View style={{ 
                        flexDirection: 'row', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        marginBottom: 16 
                    }}>
                        <Text style={{ 
                            fontSize: 20, 
                            fontWeight: 'bold', 
                            color: currentColors.text,
                            letterSpacing: -0.5 
                        }}>
                            🤝 내 친구 ({friends.length}명)
                        </Text>

                    </View>
                
                    {/* 친구 검색 입력창 */}
                    {showSearchInput && (
                        <View style={{
                            backgroundColor: currentColors.background,
                            borderRadius: 16,
                            marginBottom: 16,
                            paddingHorizontal: 16,
                            paddingVertical: 12,
                            flexDirection: 'row',
                            alignItems: 'center',
                            borderWidth: 2,
                            borderColor: currentColors.lightGray
                        }}>
                            <Ionicons name="search" size={18} color={currentColors.primary} style={{ marginRight: 12 }} />
                            <TextInput
                                style={{
                                    flex: 1,
                                    fontSize: 16,
                                    color: currentColors.text,
                                    paddingVertical: 0,
                                    letterSpacing: -0.2
                                }}
                                placeholder="친구 닉네임 검색..."
                                placeholderTextColor={currentColors.textSecondary}
                                value={searchQuery}
                                onChangeText={handleFriendSearch}
                                autoFocus={true}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity
                                    onPress={() => handleFriendSearch('')}
                                    style={{ 
                                        marginLeft: 12,
                                        padding: 4
                                    }}
                                >
                                    <Ionicons name="close-circle" size={18} color={currentColors.textSecondary} />
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                    
                    {filteredFriends.length === 0 ? (
                        <View style={{ 
                            alignItems: 'center', 
                            paddingVertical: 32,
                            backgroundColor: currentColors.background,
                            borderRadius: 16,
                            marginTop: 8
                        }}>
                            <View style={{
                                width: 64,
                                height: 64,
                                borderRadius: 32,
                                backgroundColor: currentColors.white,
                                justifyContent: 'center',
                                alignItems: 'center',
                                marginBottom: 12,
                                shadowColor: currentColors.primary,
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.1,
                                shadowRadius: 6,
                                elevation: 2
                            }}>
                                <Ionicons name="search-outline" size={32} color={currentColors.textSecondary} />
                            </View>
                            <Text style={{ 
                                color: currentColors.text, 
                                fontSize: 16,
                                fontWeight: '600',
                                textAlign: 'center',
                                letterSpacing: -0.3
                            }}>
                                검색 결과가 없습니다
                            </Text>
                            <Text style={{ 
                                color: currentColors.textSecondary, 
                                fontSize: 14,
                                textAlign: 'center',
                                letterSpacing: -0.2,
                                marginTop: 4
                            }}>
                                다른 키워드로 검색해보세요
                            </Text>
                        </View>
                    ) : (
                        <>
                            {filteredFriends.map((friend, index) => (
                                <TouchableOpacity 
                                    key={friend.employee_id} 
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        paddingVertical: 12,
                                        borderBottomWidth: index < filteredFriends.length - 1 ? 1 : 0,
                                        borderBottomColor: currentColors.lightGray
                                    }}
                                    onPress={() => handleFriendPress(friend)}
                                >
                                    <View style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 20,
                                        backgroundColor: currentColors.primary,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        marginRight: 12
                                    }}>
                                        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
                                            {friend.nickname.charAt(0)}
                                        </Text>
                                    </View>
                                    
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 16, fontWeight: '600', color: currentColors.text }}>
                                            {friend.nickname}
                                        </Text>
                                        <Text style={{ fontSize: 12, color: currentColors.textSecondary, marginTop: 2 }}>
                                            {friend.lunch_preference || '취향 정보 없음'}
                                        </Text>
                                    </View>
                                    
                                    {/* 마지막 점심 정보 */}
                                    <View style={{
                                        backgroundColor: currentColors.lightGray,
                                        paddingHorizontal: 12,
                                        paddingVertical: 8,
                                        borderRadius: 16,
                                        elevation: 1,
                                        shadowColor: currentColors.primary,
                                        shadowOffset: { width: 0, height: 1 },
                                        shadowOpacity: 0.05,
                                        shadowRadius: 2
                                    }}>
                                        <Text style={{ 
                                            color: currentColors.textSecondary, 
                                            fontSize: 12, 
                                            fontWeight: '600',
                                            letterSpacing: -0.2
                                        }}>
                                            {friend.last_lunch || '처음'}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </>
                    )}
                </View>
            </ScrollView>
            
            {/* 플로팅 액션 버튼 */}
            <TouchableOpacity
                style={{
                    position: 'absolute',
                    bottom: 30,
                    right: 30,
                    width: 60,
                    height: 60,
                    borderRadius: 30,
                    backgroundColor: currentColors.primary,
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 10,
                    elevation: 8,
                    shadowColor: currentColors.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 12,
                }}
                activeOpacity={0.85}
                onPress={() => setShowActionModal(true)}
            >
                <Ionicons name="people" size={32} color="white" />
            </TouchableOpacity>

            {/* 액션 선택 모달 */}
            <Modal
                visible={showActionModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowActionModal(false)}
            >
                <Pressable 
                    style={{ 
                        flex: 1, 
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}
                    onPress={() => setShowActionModal(false)}
                >
                    <View style={{
                        backgroundColor: currentColors.surface,
                        borderRadius: 24,
                        padding: 30,
                        marginHorizontal: 20,
                        width: '90%',
                        maxWidth: 400,
                        elevation: 10,
                        shadowColor: currentColors.primary,
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.25,
                        shadowRadius: 16,
                        borderWidth: 1,
                        borderColor: 'rgba(59, 130, 246, 0.1)'
                    }}>
                        
                        {/* 친구 찾기 버튼 */}
                        <TouchableOpacity
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                backgroundColor: currentColors.primary,
                                padding: 20,
                                borderRadius: 16,
                                marginBottom: 12,
                                elevation: 2,
                                shadowColor: currentColors.primary,
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.15,
                                shadowRadius: 4,
                            }}
                            onPress={() => {
                                setShowActionModal(false);
                                navigation.navigate('SearchUsers');
                            }}
                            activeOpacity={0.8}
                        >
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                flex: 1
                            }}>
                                <View style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 20,
                                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    marginRight: 16
                                }}>
                                    <Ionicons name="person-add" size={24} color="white" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{
                                        color: 'white',
                                        fontSize: 18,
                                        fontWeight: 'bold',
                                        marginBottom: 4
                                    }}>
                                        친구 찾기
                                    </Text>
                                    <Text style={{
                                        color: 'rgba(255, 255, 255, 0.8)',
                                        fontSize: 14,
                                        lineHeight: 18
                                    }}>
                                        새로운 친구를 찾아보세요
                                    </Text>
                                </View>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="white" />
                        </TouchableOpacity>

                        {/* 친구 초대 버튼 */}
                        <TouchableOpacity
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                backgroundColor: '#10B981',
                                padding: 20,
                                borderRadius: 16,
                                elevation: 2,
                                shadowColor: '#10B981',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.15,
                                shadowRadius: 4,
                            }}
                            onPress={() => {
                                setShowActionModal(false);
                                navigation.navigate('FriendInvite');
                            }}
                            activeOpacity={0.8}
                        >
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                flex: 1
                            }}>
                                <View style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 20,
                                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    marginRight: 16
                                }}>
                                    <Ionicons name="mail" size={24} color="white" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{
                                        color: 'white',
                                        fontSize: 18,
                                        fontWeight: 'bold',
                                        marginBottom: 4
                                    }}>
                                        친구 초대
                                    </Text>
                                    <Text style={{
                                        color: 'rgba(255, 255, 255, 0.8)',
                                        fontSize: 14,
                                        lineHeight: 18
                                    }}>
                                        친구를 초대해보세요
                                    </Text>
                                </View>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="white" />
            </TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
};

export default FriendMainScreen;
