import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, SafeAreaView, FlatList, ActivityIndicator, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../utils/commonStyles';
import { useFocusEffect } from '@react-navigation/native';
import appService from '../services/AppService'const SearchUsersScreen = ({ navigation, route }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const currentColors = global.currentColors || COLORS.light;

    // 실시간 검색을 위한 useEffect (디바운싱 적용)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.trim()) {
                // 검색어가 있을 때만 실시간 검색 실행 (500ms 후)
                handleRealTimeSearch();
            } else {
                // 검색어가 없으면 결과 초기화
                setSearchResults([]);
            }
        }, 500); // 500ms 디바운싱

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // 커스텀 뒤로가기 핸들러
    useEffect(() => {
        if (route.params?.fromPersonalSchedule) {
            navigation.setOptions({
                headerLeft: () => (
                    <TouchableOpacity
                        onPress={() => {
                            // AsyncStorage에 저장된 데이터가 있으므로 단순히 뒤로가기만 하면 됨
                            navigation.goBack();
                        }}
                        style={{ marginLeft: 16 }}
                    >
                        <Ionicons name="arrow-back" size={24} color={currentColors.text} />
                    </TouchableOpacity>
                ),
            });
        }
    }, [navigation, route.params?.fromPersonalSchedule, currentColors.text]);

    // 실시간 검색 함수
    const handleRealTimeSearch = async () => {
        if (!searchQuery.trim()) return;
        
        setIsLoading(true);
        try {
            // 가상 유저 검색 API 사용
            const response = await appService.get(`/dev/users);
            if (response.ok) {
                const allUsers = await response.json();
                // 검색어로 필터링
                const filtered = allUsers.filter(user => 
                    user.nickname.toLowerCase().includes(searchQuery.toLowerCase())
                );
                
                // 각 유저의 상세 프로필 정보 가져오기
                const usersWithDetails = await Promise.all(
                    filtered.map(async (user) => {
                        try {
                            // 실제 유저 프로필 API에서 상세 정보 가져오기
                            const response = await appService.get(`/users/${user.employee_id}`);
                            if (response.ok) {
                                const profileData = await response.json();
                                console.log(`)`🔍 [검색] 유저 ${user.employee_id} 프로필 데이터:`, profileData);
                                // 기존 기본 정보와 프로필 정보 병합
                                return {
                                    ...user,
                                    ...profileData
                                };
                            } else {
                                // 프로필 API 실패 시 기본 정보만 사용
                                return user;
                            }
                        } catch (error) {
                            console.error(`유저 ${user.employee_id} 프로필 조회 실패:`, error);
                            return user;
                        }
                    })
                );
                
                console.log('🔍 [검색] 상세 정보가 포함된 유저 데이터:', usersWithDetails.map(user => ({
                    id: user.employee_id,
                    nickname: user.nickname,
                    hasLunchStyle: !!user.lunch_style?.length,
                    hasFoodPreferences: !!user.food_preferences?.length,
                    lunchStyle: user.lunch_style,
                    foodPreferences: user.food_preferences
                })));
                
                setSearchResults(usersWithDetails);
            } else {
                setSearchResults([]);
            }
        } catch (error) {
            console.error('실시간 검색 오류:', error);
            setSearchResults([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        
        setIsLoading(true);
        try {
            // 가상 유저 검색 API 사용
            const response = await appService.get(`/dev/users);
            if (response.ok) {
                const allUsers = await response.json();
                // 검색어로 필터링
                const filtered = allUsers.filter(user => 
                    user.nickname.toLowerCase().includes(searchQuery.toLowerCase())
                );
                
                // 각 유저의 상세 프로필 정보 가져오기
                const usersWithDetails = await Promise.all(
                    filtered.map(async (user) => {
                        try {
                            // 실제 유저 프로필 API에서 상세 정보 가져오기
                            const profileResponse = await appService.get(`/users/${user.employee_id}`);
                            if (profileResponse.ok) {
                                const profileData = await profileResponse.json();
                                console.log(`)`🔍 [검색] 유저 ${user.employee_id} 프로필 데이터:`, profileData);
                                // 기존 기본 정보와 프로필 정보 병합
                                return {
                                    ...user,
                                    ...profileData
                                };
                            } else {
                                // 프로필 API 실패 시 기본 정보만 사용
                                return user;
                            }
                        } catch (error) {
                            console.error(`유저 ${user.employee_id} 프로필 조회 실패:`, error);
                            return user;
                        }
                    })
                );
                
                setSearchResults(usersWithDetails);
            } else {
                setSearchResults([]);
            }
        } catch (error) {
            console.error('사용자 검색 오류:', error);
            setSearchResults([]);
        } finally {
            setIsLoading(false);
        }
    };

    const addFriend = async (userId) => {
        try {
            console.log('🔍 [친구추가] 친구 추가 시도:', userId);
            console.log('🔍 [친구추가] 현재 사용자 ID:', global.myEmployeeId);
            console.log('🔍 [친구추가] 전송할 데이터:', {
                user_id: global.myEmployeeId || '1',
                friend_id: userId
            });
            
            const response = await appService.get(`/friends/add, {
                method: `)'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${global.myToken || 'dev-token'}`
                },
                body: JSON.stringify({
                    user_id: global.myEmployeeId || '1',
                    friend_id: userId
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ [친구추가] 성공:', result);
                
                // 성공 팝업 표시
                Alert.alert(
                    '성공', 
                    '친구가 추가되었습니다!',
                    [
                        {
                            text: '친구탭으로 이동',
                            onPress: () => {
                                // 친구탭으로 이동하여 새로 추가된 친구 확인
                                navigation.navigate('친구', { 
                                    screen: 'FriendMainScreen',
                                    params: { refreshFriends: true }
                                });
                            }
                        },
                        { text: '계속 검색', style: 'cancel' }
                    ]
                );
                
                // 검색 결과에서 제거
                setSearchResults(prev => prev.filter(user => user.employee_id !== userId));
                
                // 전역 변수에 친구 추가 플래그 설정 (다른 화면에서 친구 목록 새로고침용)
                if (typeof global !== 'undefined') {
                    global.friendAdded = true;
                    global.lastFriendAddedTime = Date.now();
                }
                
                // 즉시 친구 목록 새로고침을 위한 추가 플래그
                global.forceRefreshFriends = true;
            } else {
                const errorData = await response.json();
                console.error('❌ [친구추가] 실패:', response.status, errorData);
                Alert.alert('오류', errorData.message || '친구 추가에 실패했습니다.');
            }
        } catch (error) {
            console.error('❌ [친구추가] 네트워크 오류:', error);
            Alert.alert('오류', '네트워크 오류가 발생했습니다.');
        }
    };

    // 검색 결과 아이템 렌더링
    const renderSearchResult = ({ item }) => (
        <View style={{
            backgroundColor: currentColors.surface,
            borderRadius: 20,
            marginHorizontal: 16,
            marginBottom: 12,
            padding: 20,
            elevation: 3,
            shadowColor: currentColors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            borderWidth: 1,
            borderColor: 'rgba(59, 130, 246, 0.1)'
        }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {/* 프로필 아바타 */}
                <TouchableOpacity
                    style={{
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
                    }}
                    onPress={() => {
                        // 유저 프로필 화면으로 이동
                        navigation.navigate('UserProfile', { 
                            employeeId: item.employee_id,
                            fromFriendSearch: true
                        });
                    }}
                    activeOpacity={0.8}
                >
                    <Text style={{ 
                        color: 'white', 
                        fontWeight: 'bold', 
                        fontSize: 22,
                        letterSpacing: -0.5 
                    }}>
                        {item.nickname ? item.nickname.charAt(0) : '?'}
                    </Text>
                </TouchableOpacity>
                
                {/* 사용자 정보 */}
                <View style={{ flex: 1 }}>
                    <Text style={{ 
                        fontSize: 18, 
                        fontWeight: '600', 
                        color: currentColors.text,
                        letterSpacing: -0.3,
                        marginBottom: 6
                    }}>
                        {item.nickname}
                    </Text>
                    
                    {/* 점심 성향 */}
                    {item.lunch_style && item.lunch_style.length > 0 && (
                        <Text style={{ 
                            fontSize: 13, 
                            color: currentColors.textSecondary,
                            letterSpacing: -0.2,
                            marginBottom: 3
                        }}>
                            🍽️ {item.lunch_style.join(', ')}
                        </Text>
                    )}
                    
                    {/* 좋아하는 음식 종류 */}
                    {item.food_preferences && item.food_preferences.length > 0 && (
                        <Text style={{ 
                            fontSize: 13, 
                            color: currentColors.textSecondary,
                            letterSpacing: -0.2
                        }}>
                            🍜 {item.food_preferences.join(', ')}
                        </Text>
                    )}
                    
                    {/* 정보가 없는 경우 */}
                    {(!item.lunch_style || item.lunch_style.length === 0) && 
                     (!item.food_preferences || item.food_preferences.length === 0) && (
                        <Text style={{ 
                            fontSize: 13, 
                            color: currentColors.textSecondary,
                            letterSpacing: -0.2,
                            fontStyle: 'italic'
                        }}>
                            취향 정보 없음
                        </Text>
                    )}
                    
                    {/* 🚨 디버깅: 유저 데이터 정보 (개발 모드) */}
                    {__DEV__ && (
                        <Text style={{ 
                            fontSize: 10, 
                            color: '#666',
                            marginTop: 4,
                            fontStyle: 'italic'
                        }}>
                            🔍 ID: {item.employee_id} | 
                            점심성향: {item.lunch_style?.length || 0}개 | 
                            음식선호: {item.food_preferences?.length || 0}개
                        </Text>
                    )}
                </View>
                
                {/* 친구 추가 버튼 */}
                <TouchableOpacity 
                    style={{ 
                        backgroundColor: currentColors.primary, 
                        paddingHorizontal: 12, 
                        paddingVertical: 0, 
                        borderRadius: 12,
                        elevation: 2,
                        shadowColor: currentColors.primary,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.15,
                        shadowRadius: 4,
                        height: 36,
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}
                    onPress={() => addFriend(item.employee_id)}
                    activeOpacity={0.8}
                >
                    <View style={{ 
                        flexDirection: 'row', 
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Ionicons name="person-add" size={14} color="white" style={{ marginRight: 4 }} />
                        <Text style={{ 
                            color: 'white', 
                            fontWeight: '600',
                            fontSize: 12,
                            letterSpacing: -0.2,
                            textAlignVertical: 'center'
                        }}>
                            친구 추가
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    );

    // 빈 검색 결과 컴포넌트
    const renderEmptyResults = () => (
        <View style={{ 
            alignItems: 'center', 
            marginTop: 80,
            paddingHorizontal: 32
        }}>
            <View style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: currentColors.lightGray,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 20,
                shadowColor: currentColors.primary,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 6,
                elevation: 2
            }}>
                <Ionicons 
                    name={searchQuery ? "search-outline" : "people-outline"} 
                    size={40} 
                    color={currentColors.textSecondary} 
                />
            </View>
            <Text style={{ 
                color: currentColors.text, 
                fontSize: 18,
                fontWeight: '600',
                textAlign: 'center',
                letterSpacing: -0.3,
                marginBottom: 8
            }}>
                {searchQuery ? '검색 결과가 없습니다' : '새로운 친구를 찾아보세요'}
            </Text>
            <Text style={{ 
                color: currentColors.textSecondary, 
                fontSize: 14,
                textAlign: 'center',
                letterSpacing: -0.2,
                lineHeight: 20
            }}>
                {searchQuery 
                    ? '다른 키워드로 검색해보세요' 
                    : '사용자 닉네임을 검색해보세요'
                }
            </Text>
        </View>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: currentColors.background }}>
            {/* 검색 입력 카드 */}
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

                
                <View style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    backgroundColor: currentColors.background, 
                    borderRadius: 16, 
                    paddingHorizontal: 16,
                    paddingVertical: 4,
                    borderWidth: 2,
                    borderColor: currentColors.lightGray
                }}>
                    <Ionicons 
                        name="search" 
                        size={20} 
                        color={currentColors.primary} 
                        style={{ marginRight: 12 }} 
                    />
                    <TextInput
                        style={{ 
                            flex: 1, 
                            paddingVertical: 16, 
                            fontSize: 16, 
                            color: currentColors.text,
                            letterSpacing: -0.2
                        }}
                        placeholder="사용자 닉네임을 입력하세요..."
                        placeholderTextColor={currentColors.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoFocus={true}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity
                            onPress={() => setSearchQuery('')}
                            style={{ 
                                marginLeft: 12,
                                padding: 8
                            }}
                        >
                            <Ionicons 
                                name="close-circle" 
                                size={20} 
                                color={currentColors.textSecondary} 
                            />
                        </TouchableOpacity>
                    )}
                </View>
                

            </View>

            {/* 검색 결과 */}
            {isLoading ? (
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
                        textAlign: 'center',
                        letterSpacing: -0.2
                    }}>
                        검색 중...
                    </Text>
                    <Text style={{ 
                        marginTop: 8, 
                        fontSize: 14, 
                        color: currentColors.textSecondary,
                        textAlign: 'center',
                        letterSpacing: -0.2
                    }}>
                        잠시만 기다려주세요
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={searchResults}
                    keyExtractor={(item) => item.employee_id}
                    renderItem={renderSearchResult}
                    ListEmptyComponent={renderEmptyResults}
                    contentContainerStyle={{ 
                        paddingBottom: 20,
                        flexGrow: 1
                    }}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </SafeAreaView>
    );
};

export default SearchUsersScreen;
