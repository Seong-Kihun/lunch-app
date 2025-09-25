import React, { useState, useEffect } from 'react';
import { Text, View, ActivityIndicator, Platform, TouchableOpacity, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './contexts/ThemeContext';
import { UserProvider } from './contexts/UserContext';
import { PointsProvider } from './contexts/PointsContext';
import { MissionProvider, useMission } from './contexts/MissionContext';
import { AppointmentProvider } from './contexts/AppointmentContext';
import { ScheduleProvider, useSchedule } from './contexts/ScheduleContext';
import { NewScheduleProvider } from './contexts/NewScheduleContext';

// 인증 관련
import { AuthProvider, useAuth, AUTH_STATES } from './auth/AuthContext';
import LoginScreen from './auth/LoginScreen';
import RegisterScreen from './auth/RegisterScreen';
import InquiryScreen from './screens/InquiryScreen';

// 핵심 화면 컴포넌트 Import
import HomeScreen from './screens/Home/HomeScreen';
import OnboardingScreen from './screens/Onboarding/OnboardingScreen';
import MyPageMain from './screens/MyPage/MyPageMain';
import UserDashboard from './screens/MyPage/UserDashboard';
import ActivityStatsSection from './screens/MyPage/ActivityStatsSection';
import AppointmentHistorySection from './screens/MyPage/AppointmentHistorySection';
import PointsBadgesSection from './screens/MyPage/PointsBadgesSection';
import AppInfoSection from './screens/MyPage/AppInfoSection';
import PartiesContainerScreen from './screens/Party/PartiesContainerScreen';
import RestaurantTabNew from './screens/RestaurantNew/RestaurantTabNew';

// 파티 관련 컴포넌트 Import
import PartyDetailScreen from './screens/Party/PartyDetail/PartyDetailScreen';
import CreatePartyScreen from './screens/Party/CreateParty/CreatePartyScreenBackup';
import CreateDangolPartyScreen from './screens/DangolParty/CreateDangolParty/CreateDangolPartyScreen';
import CreatePersonalScheduleScreen from './screens/Schedule/CreatePersonalSchedule/CreatePersonalScheduleScreen';
import SearchUsersScreen from './screens/Friend/SearchUsers/SearchUsersScreen';
import EditPersonalScheduleScreen from './screens/Schedule/EditPersonalSchedule/EditPersonalScheduleScreen';
import EditPartyScreen from './screens/Party/EditParty/EditPartyScreen';
import RandomLunchScreen from './screens/Party/RandomLunch/RandomLunchScreen';
import IntelligentSchedulingScreen from './screens/Voting/IntelligentScheduling/IntelligentSchedulingScreen';
import SuggestedDatesScreen from './screens/Voting/SuggestedDates/SuggestedDatesScreen';
import RestaurantSelectionScreen from './screens/Voting/RestaurantSelection/RestaurantSelectionScreen';
import TimeSelectionScreen from './screens/Voting/TimeSelection/TimeSelectionScreen';
import PartyConfirmationScreen from './screens/Voting/PartyConfirmation/PartyConfirmationScreen';
import VotingScreen from './screens/Voting/VotingScreen';
import VotingParticipateScreen from './screens/Voting/VotingParticipate/VotingParticipateScreen';
import VotingEditScreen from './screens/Voting/VotingEdit/VotingEditScreen';
import FriendProfileScreen from './screens/Friend/FriendProfile/FriendProfileScreen';
import UserProfileScreen from './screens/profile/UserProfileScreen';

// 소통 관련 컴포넌트 Import
import ChatListScreen from './screens/Chat/ChatListScreen';
import ChatRoomScreen from './screens/Chat/ChatRoomScreen';
import ChatScreen from './components/chat/ChatScreen';
import ChatSettingsScreen from './screens/Chat/ChatSettingsScreen';
import CreateChatRoomScreen from './screens/Chat/CreateChatRoomScreen';
import ChatMembersScreen from './screens/Chat/ChatMembersScreen';
import ChatNotificationsScreen from './screens/Chat/ChatNotificationsScreen';
import NotificationScreen from './screens/Notification/NotificationScreen';
import ReviewDetailScreen from './screens/Review/ReviewDetail/ReviewDetailScreen';

// 친구 관련 컴포넌트 Import
import FriendMainScreen from './screens/Friend/FriendMain/FriendMainScreen';
import FriendListScreen from './screens/Friend/FriendList/FriendListScreen';
import MyProfileScreen from './screens/MyPage/MyProfile/MyProfileScreen';
import ProfileSection from './screens/MyPage/ProfileSection';
import ProfileEditScreen from './screens/MyPage/ProfileEdit/ProfileEditScreen';
import RankingScreen from './screens/RankingScreen';
import LevelSystemScreen from './screens/MyPage/LevelSystemScreen';
import ChallengesScreen from './screens/Challenges/ChallengesScreen';
import FriendInviteScreen from './screens/FriendInvite/FriendInviteScreen';

// 기타 컴포넌트 Import
import WriteReview from './screens/WriteReview';
import PhotoGallery from './screens/PhotoGallery';

// 테마 Import
import { COLORS } from './theme/colors';

// 설정 Import
import { RENDER_SERVER_URL } from './config';

// 온보딩 유틸리티 Import
import { checkOnboardingStatus } from './utils/onboardingUtils';

// 네트워크 초기화 Import
import networkInitializer from './utils/networkInitializer';
import NetworkStatus from './components/NetworkStatus';

// API_BASE_URL과 API 호출 함수 정의
const API_BASE_URL = RENDER_SERVER_URL;



// 탭 간 이동 시 네비게이션 스택 문제를 해결하기 위한 함수
const safeNavigateToTab = (navigation, tabName, screenName, params = {}, skipDefaultScreen = false) => {
    try {
        // navigation 객체가 유효한지 확인
        if (!navigation || typeof navigation.navigate !== 'function') {
            console.warn('safeNavigateToTab: 유효하지 않은 navigation 객체입니다.');
            return false;
        }

        // 필수 매개변수 확인
        if (!tabName) {
            console.warn('safeNavigateToTab: tabName이 필요합니다.');
            return false;
        }

        // 각 탭의 기본 스크린 매핑
        const tabDefaultScreens = {
            '홈': 'HomeScreen',
            '맛집': 'RestaurantsList',
            '파티': 'PartiesScreen',
            '소통': 'ChatList',
            '친구': 'FriendMain'
        };

        const defaultScreen = tabDefaultScreens[tabName];
        
        if (!defaultScreen || skipDefaultScreen) {
            // 기본 스크린이 정의되지 않거나 건너뛰기 옵션이 있는 경우 직접 이동
            try {
                navigation.navigate(tabName, { screen: screenName, params });
                console.log(`✅ 직접 네비게이션 성공: ${tabName} -> ${screenName}`);
                return true;
            } catch (error) {
                console.warn('safeNavigateToTab: 직접 네비게이션 실패:', error);
                return false;
            }
        }

        // 안전한 네비게이션을 위한 단계별 처리
        try {
            // 1단계: 해당 탭의 기본 스크린으로 먼저 이동 (스택 초기화)
            navigation.navigate(tabName, { screen: defaultScreen });
            console.log(`✅ 1단계 네비게이션 성공: ${tabName} -> ${defaultScreen}`);
            
            // 2단계: 즉시 원하는 스크린으로 이동 (setTimeout 제거)
            try {
                navigation.navigate(tabName, { screen: screenName, params });
                console.log(`✅ 2단계 네비게이션 성공: ${tabName} -> ${screenName}`);
            } catch (error) {
                console.warn('safeNavigateToTab: 2단계 네비게이션 실패:', error);
                // 2단계 실패 시 fallback으로 직접 이동 시도
                try {
                    navigation.navigate(tabName, { screen: screenName, params });
                    console.log(`✅ fallback 네비게이션 성공: ${tabName} -> ${screenName}`);
                } catch (fallbackError) {
                    console.error('safeNavigateToTab: 모든 네비게이션 방법 실패:', fallbackError);
                }
            }
            
            // 🚨 중요: 탭 이동 후 기본 화면으로 리셋 요청은 제거
            // 이 로직이 화면 전환을 방해하는 문제를 해결
            // setTimeout(() => {
            //     try {
            //         // 해당 탭의 기본 화면에 리셋 요청 파라미터 전달
            //         navigation.navigate(tabName, { 
            //             screen: defaultScreen, 
            //             params: { resetToDefault: true } 
            //         });
            //     } catch (resetError) {
            //         console.warn('safeNavigateToTab: 리셋 요청 실패:', resetError);
            //     }
            // }, 100);
            
            return true;
        } catch (error) {
            console.warn('safeNavigateToTab: 1단계 네비게이션 실패:', error);
            return false;
        }
    } catch (error) {
        console.error('safeNavigateToTab: 예상치 못한 오류:', error);
        return false;
    }
};

// 전역 변수 사용 제거 - React Query와 Context로 대체
const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const HomeStack = () => (
    <Stack.Navigator 
        initialRouteName="HomeScreen"
        screenOptions={{
            headerStyle: { backgroundColor: '#3B82F6' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold' }
        }}
    >
        <Stack.Screen 
            name="HomeScreen" 
            component={HomeScreen} 
            options={({ navigation, route }) => ({
                title: '밥플떼기',
                headerLeft: () => (
                    <TouchableOpacity 
                        style={{ marginLeft: 15, position: 'relative' }} 
                        onPress={() => {
                            // 홈 화면으로 이동하여 미션 모달을 열기
                            navigation.navigate('HomeScreen', { openMissionModal: true });
                        }}
                    >
                        <Ionicons name="trophy-outline" size={24} color={'#fff'} />
                        {/* 미션 완료 후 수령하지 않은 미션이 있을 때 빨간 점 표시 */}
                        {route.params?.hasUnclaimedMissions && (
                            <View style={{
                                position: 'absolute',
                                top: -2,
                                right: -2,
                                width: 8,
                                height: 8,
                                borderRadius: 4,
                                backgroundColor: '#EF4444'
                            }} />
                        )}
                    </TouchableOpacity>
                ),
                headerRight: () => (
                    <View style={{ flexDirection: 'row', marginRight: 15 }}>
                        <TouchableOpacity 
                            style={{ marginRight: 15 }} 
                            onPress={() => {
                                // 마이페이지로 이동
                                navigation.navigate('MyPageMain');
                            }}
                        >
                            <Ionicons name="person-circle-outline" size={24} color={'#fff'} />
                        </TouchableOpacity>
                        <TouchableOpacity 
                            onPress={() => safeNavigateToTab(navigation, '소통', 'Notifications')}
                            style={{ position: 'relative' }}
                        >
                            <Ionicons name="notifications-outline" size={24} color={'#fff'} />
                            {route.params?.unreadCount > 0 && (
                                <View style={{
                                    position: 'absolute',
                                    top: -5,
                                    right: -5,
                                    backgroundColor: '#EF4444',
                                    borderRadius: 10,
                                    minWidth: 20,
                                    height: 20,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    paddingHorizontal: 4,
                                }}>
                                    <Text style={{
                                        color: '#fff',
                                        fontSize: 12,
                                        fontWeight: 'bold',
                                    }}>
                                        {route.params.unreadCount > 99 ? '99+' : route.params.unreadCount}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity 
                            onPress={() => setShowNetworkStatus(true)}
                            style={{ marginLeft: 15 }}
                        >
                            <Ionicons name="wifi-outline" size={24} color={'#fff'} />
                        </TouchableOpacity>
                    </View>
                )
            })}
        />
        <Stack.Screen name="MyPageMain" component={MyPageMain} options={{ title: '마이페이지' }}/>
        <Stack.Screen name="UserDashboard" component={UserDashboard} options={{ title: '대시보드' }}/>
        <Stack.Screen name="ActivityStatsSection" component={ActivityStatsSection} options={{ title: '활동 통계' }}/>
        <Stack.Screen name="AppointmentHistorySection" component={AppointmentHistorySection} options={{ title: '약속 히스토리' }}/>
        <Stack.Screen name="PointsBadgesSection" component={PointsBadgesSection} options={{ title: '포인트 & 배지' }}/>
        <Stack.Screen name="AppInfoSection" component={AppInfoSection} options={{ title: '앱 정보' }}/>
        <Stack.Screen name="CreatePersonalSchedule" component={CreatePersonalScheduleScreen} options={{ title: '기타 일정 추가' }} />
        <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ title: '사용자 프로필' }} />
    </Stack.Navigator>
);

const RestaurantStack = () => (
    <Stack.Navigator 
        initialRouteName="RestaurantsList"
        screenOptions={{
            headerStyle: { backgroundColor: '#3B82F6' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold' }
        }}
    >
        <Stack.Screen name="RestaurantsList" component={RestaurantTabNew} options={{ headerShown: false }}/>
        
        <Stack.Screen name="WriteReview" component={WriteReview} options={{ title: '리뷰 작성' }} />
        <Stack.Screen name="PhotoGallery" component={PhotoGallery} options={{ headerShown: false }} />
        <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ title: '사용자 프로필' }} />
    </Stack.Navigator>
);

const PartiesStack = () => {
    // global.currentColors가 설정되지 않은 경우 기본값으로 초기화
    if (!global.currentColors) {
        global.currentColors = {
            background: '#FF0000', // 테스트용 빨간색
            surface: '#FFFFFF',
            primary: '#3B82F6',
            primaryLight: '#E3F2FD',
            text: '#000000',
            textSecondary: '#666666',
            border: '#E5E7EB',
            secondary: '#5856D6',
            success: '#10B981',
            error: '#EF4444'
        };
        console.log('✅ [PartiesStack] global.currentColors 초기화 완료:', global.currentColors);
    }
    
    console.log('🔍 [PartiesStack] 렌더링 시작');
    console.log('🔍 [PartiesStack] global.currentColors:', global.currentColors);
    console.log('🔍 [PartiesStack] global.currentUser:', global.currentUser);
    
    return (
        <Stack.Navigator 
            initialRouteName="PartiesScreen"
            screenOptions={{
                headerStyle: { backgroundColor: '#3B82F6' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: 'bold' }
            }}
        >
            <Stack.Screen 
                name="PartiesScreen" 
                component={PartiesContainerScreen} 
                options={{ title: '파티' }}
            />
        <Stack.Screen name="PartyDetail" component={PartyDetailScreen} options={{ title: '파티 정보' }}/>
        <Stack.Screen name="CreateParty" component={CreatePartyScreen} options={{ title: '새 파티 만들기' }}/>
        <Stack.Screen name="CreateDangolPot" component={CreateDangolPartyScreen} options={{ title: '단골파티 만들기' }}/>
        <Stack.Screen name="CreatePersonalSchedule" component={CreatePersonalScheduleScreen} options={{ title: '기타 일정 추가' }} />
        <Stack.Screen name="SearchUsers" component={SearchUsersScreen} options={{ title: '친구 찾기' }} />
                
        <Stack.Screen name="EditPersonalSchedule" component={EditPersonalScheduleScreen} options={{ title: '기타 일정 수정' }} />
        <Stack.Screen name="EditParty" component={EditPartyScreen} options={{ title: '파티 정보 수정' }} />
        <Stack.Screen name="RandomLunch" component={RandomLunchScreen} options={{ title: '랜덤 런치' }} />
        <Stack.Screen name="IntelligentScheduling" component={IntelligentSchedulingScreen} options={{ title: '지능형 스케줄링' }} />
        <Stack.Screen name="SuggestedDatesScreen" component={SuggestedDatesScreen} options={{ title: '제안된 날짜' }} />
        <Stack.Screen name="RestaurantSelectionScreen" component={RestaurantSelectionScreen} options={{ title: '식당 선택' }} />
        <Stack.Screen name="TimeSelectionScreen" component={TimeSelectionScreen} options={{ title: '시간 선택' }} />
        <Stack.Screen name="PartyConfirmationScreen" component={PartyConfirmationScreen} options={{ title: '파티 확정' }} />
        <Stack.Screen name="VotingScreen" component={VotingScreen} options={{ title: '투표' }} />
        <Stack.Screen name="VotingParticipateScreen" component={VotingParticipateScreen} options={{ title: '투표 참여' }} />
        <Stack.Screen name="VotingEditScreen" component={VotingEditScreen} options={{ title: '투표 수정' }} />
        <Stack.Screen name="FriendProfile" component={FriendProfileScreen} options={{ title: '동료 프로필' }} />
        <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ title: '사용자 프로필' }} />
        </Stack.Navigator>
    );
};
const CommunicationStack = () => {
    // 색상 정의 - 안전하게 처리
    const currentColors = (() => {
        try {
            if (global.currentColors && global.currentColors.background) {
                return global.currentColors;
            }
            return {
                background: '#FFFFFF',
                surface: '#FFFFFF',
                primary: '#3B82F6',
                onPrimary: '#FFFFFF',
                text: '#000000',
                textSecondary: '#666666',
                border: '#E5E7EB'
            };
        } catch (error) {
            console.warn('⚠️ [CommunicationStack] 색상 정의 오류, 기본값 사용:', error);
            return {
                background: '#FFFFFF',
                surface: '#FFFFFF',
                primary: '#3B82F6',
                onPrimary: '#FFFFFF',
                text: '#000000',
                textSecondary: '#666666',
                border: '#E5E7EB'
            };
        }
    })();

    return (
        <Stack.Navigator 
            initialRouteName="ChatList"
            screenOptions={{
                headerStyle: { backgroundColor: '#3B82F6' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: 'bold' }
            }}
        >
        <Stack.Screen 
            name="ChatList" 
            component={ChatListScreen} 
            options={{ title: '소통' }}
            initialParams={{ currentColors, currentUser: global.currentUser }}
        />
        <Stack.Screen name="ChatRoom" component={ChatScreen} options={({ route }) => ({ title: route.params?.chatTitle || '채팅' })} />
        <Stack.Screen name="CreateChatRoom" component={CreateChatRoomScreen} options={{ title: '채팅방 만들기' }} />
        <Stack.Screen name="ChatSettings" component={ChatSettingsScreen} options={{ title: '채팅방 설정' }} />
        <Stack.Screen name="ChatMembers" component={ChatMembersScreen} options={{ title: '멤버 목록' }} />
        <Stack.Screen name="ChatNotifications" component={ChatNotificationsScreen} options={{ title: '알림 설정' }} />
        <Stack.Screen name="Notifications" component={NotificationScreen} options={{ title: '알림' }}/>
        <Stack.Screen name="ReviewDetail" component={ReviewDetailScreen} options={{ title: '리뷰 상세' }}/>
        <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ title: '사용자 프로필' }} />
        </Stack.Navigator>
    );
};

const FriendStack = () => {
    return (
        <Stack.Navigator 
            initialRouteName="FriendMain"
            screenOptions={{
                headerStyle: { backgroundColor: '#3B82F6' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: 'bold' }
            }}
        >
            <Stack.Screen 
                name="FriendMain" 
                component={FriendMainScreen} 
                options={({ navigation, route }) => ({
                    title: '친구',
                    headerRight: () => (
                        <View style={{ flexDirection: 'row', marginRight: 15 }}>
                            <TouchableOpacity 
                                style={{ marginRight: 15 }} 
                                onPress={() => {
                                    navigation.setParams({ toggleSearch: true });
                                }}
                            >
                                <Ionicons name="search" size={26} color={'#fff'} />
                            </TouchableOpacity>
                            <TouchableOpacity 
                                onPress={() => Alert.alert('설정', '설정 기능은 곧 출시됩니다!')}
                            >
                                <Ionicons name="settings-outline" size={26} color={'#fff'} />
                            </TouchableOpacity>
                        </View>
                    )
                })} 
            />
            <Stack.Screen name="FriendList" component={FriendListScreen} options={{ title: '친구 목록' }}/>
            <Stack.Screen name="SearchUsers" component={SearchUsersScreen} options={{ title: '친구 찾기' }}/>
            <Stack.Screen name="FriendProfile" component={FriendProfileScreen} options={{ title: '친구 프로필' }}/>
            <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ title: '사용자 프로필' }}/>
            <Stack.Screen name="MyProfile" component={MyProfileScreen} options={{ title: '내 프로필' }}/>
            <Stack.Screen name="ProfileSection" component={ProfileSection} options={{ title: '프로필' }}/>
            <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} options={{ title: '프로필 수정' }}/>
            <Stack.Screen name="RankingScreen" component={RankingScreen} options={{ title: '랭킹' }}/>
            <Stack.Screen name="LevelSystemScreen" component={LevelSystemScreen} options={{ title: '레벨 시스템' }}/>
            <Stack.Screen name="ChallengesScreen" component={ChallengesScreen} options={{ title: '도전과제' }}/>
            <Stack.Screen name="FriendInvite" component={FriendInviteScreen} options={{ title: '친구 초대' }}/>
        </Stack.Navigator>
    );
};

// 메인 탭 네비게이터 컴포넌트
function TabNavigator() {
    const { hasUnclaimedMissions } = useMission();
    
    // global.currentColors가 설정되지 않은 경우 기본값으로 초기화
    if (!global.currentColors) {
        global.currentColors = {
            background: '#FF0000', // 테스트용 빨간색
            surface: '#FFFFFF',
            primary: '#3B82F6',
            primaryLight: '#E3F2FD',
            text: '#000000',
            textSecondary: '#666666',
            border: '#E5E7EB',
            secondary: '#5856D6',
            success: '#10B981',
            error: '#EF4444'
        };
        console.log('✅ [TabNavigator] global.currentColors 초기화 완료:', global.currentColors);
    }
    
    console.log('🔍 [TabNavigator] 렌더링 시작');
    console.log('🔍 [TabNavigator] global.currentColors:', global.currentColors);
    console.log('🔍 [TabNavigator] global.currentUser:', global.currentUser);
    
    return (
        <Tab.Navigator 
            initialRouteName="홈"
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    const icons = { '홈': 'home', '맛집': 'restaurant', '파티': 'people', '소통': 'chatbubbles', '친구': 'people-circle' };
                    const iconName = focused ? icons[route.name] : `${icons[route.name]}-outline`;
                    
                    // 홈탭에 미션 알림 점 추가
                    if (route.name === '홈' && hasUnclaimedMissions) {
                        return (
                            <View style={{ position: 'relative' }}>
                                <Ionicons name={iconName} size={size} color={color} />
                                <View style={{
                                    position: 'absolute',
                                    top: -2,
                                    right: -2,
                                    width: 8,
                                    height: 8,
                                    borderRadius: 4,
                                    backgroundColor: '#EF4444',
                                    borderWidth: 1,
                                    borderColor: '#FFFFFF'
                                }} />
                            </View>
                        );
                    }
                    
                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: '#3B82F6',
                tabBarInactiveTintColor: '#6B7280',
                headerShown: false,
                tabBarStyle: { 
                    backgroundColor: '#FFFFFF', 
                    borderTopColor: '#E5E7EB',
                    height: 85,
                    paddingBottom: 18,
                    paddingTop: 10,
                    elevation: 8,
                    shadowColor: '#3B82F6',
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4
                },
                tabBarLabelStyle: { fontWeight: '600', fontSize: 12, marginTop: 2 },
                tabBarIconStyle: { marginBottom: 4 }
            })}
            screenListeners={({ navigation, route }) => ({
                tabPress: (e) => {
                    // 파티 탭을 누를 때만 특별 처리
                    if (route.name === '파티') {
                        try {
                            // 파티 탭의 기본 화면으로 이동
                            navigation.navigate('파티', { 
                                screen: 'PartiesScreen',
                                params: { resetToDefault: true }
                            });
                            console.log('✅ [TabNavigator] 파티 탭 기본 화면으로 이동');
                        } catch (error) {
                            console.warn('⚠️ [TabNavigator] 파티 탭 이동 실패:', error);
                        }
                    }
                },
            })}
        >
            <Tab.Screen name="홈" component={HomeStack} />
            <Tab.Screen name="맛집" component={RestaurantStack} />
            <Tab.Screen name="파티" component={PartiesStack} />
            <Tab.Screen name="소통" component={CommunicationStack} />
            <Tab.Screen name="친구" component={FriendStack} />
        </Tab.Navigator>
    );
}

// 메인 앱 화면 컴포넌트
function MainApp() {
    const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
    const [showNetworkStatus, setShowNetworkStatus] = useState(false);
    const { authState, user } = useAuth();
    const { 
        appointments, 
        setAppointments, 
        markedDates, 
        setMarkedDates, 
        allEvents, 
        setAllEvents,
        updateHomeSchedule,
        saveBackupData,
        restoreBackupData
    } = useSchedule();

    // 전역 변수 초기화 - currentColors 설정
    useEffect(() => {
        // global.currentColors가 설정되지 않은 경우 기본값으로 초기화
        if (!global.currentColors) {
            global.currentColors = {
                background: '#F1F5F9', // 파란색 테마와 어울리는 연한 블루 그레이
                surface: '#FFFFFF',
                primary: '#3B82F6',
                primaryLight: '#E3F2FD',
                text: '#000000',
                textSecondary: '#666666',
                border: '#E5E7EB',
                lightGray: '#D1D5DB', // 추가
                secondary: '#5856D6',
                success: '#10B981',
                error: '#EF4444'
            };
            console.log('✅ [MainApp] global.currentColors 초기화 완료:', global.currentColors);
        }
        
        // global.currentUser가 설정되지 않은 경우 기본값으로 초기화
        if (!global.currentUser) {
            global.currentUser = {
                employee_id: '1',
                nickname: '사용자'
            };
            console.log('✅ [MainApp] global.currentUser 초기화 완료:', global.currentUser);
        }

        // 네트워크 초기화 (개발/프로덕션 환경 통일)
        networkInitializer.initialize().catch(error => {
            console.error('❌ [MainApp] 네트워크 초기화 실패:', error);
            // 네트워크 초기화 실패 시 네트워크 설정 모달 표시
            setShowNetworkStatus(true);
        });
    }, []);

    useEffect(() => {
        const checkStatus = async () => {
            const completed = await checkOnboardingStatus();
            if (completed) {
                setHasCompletedOnboarding(true);
                console.log('✅ [MainApp] 온보딩 완료 - 메인 화면으로 전환');
                return true; // 온보딩 완료됨
            }
            return false; // 온보딩 미완료
        };
        
        // 초기 상태 확인
        checkStatus().then(completed => {
            if (!completed) {
                // 온보딩이 완료되지 않은 경우에만 폴링 시작
                const interval = setInterval(async () => {
                    const isCompleted = await checkStatus();
                    if (isCompleted) {
                        // 온보딩이 완료되면 폴링 중단
                        clearInterval(interval);
                    }
                }, 1000); // 폴링 간격을 1초로 증가
                
                // cleanup 함수에서 interval 정리
                return () => clearInterval(interval);
            }
        });
    }, []);

    // 로딩 중
    if (authState === 'loading') {
    return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text style={{ marginTop: 10 }}>로딩 중...</Text>
            </View>
        );
    }

    // 인증되지 않은 경우 로그인 화면
    if (authState === 'unauthenticated') {
        return (
            <NavigationContainer>
                <Stack.Navigator screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="Login" component={LoginScreen} />
                    <Stack.Screen name="Register" component={RegisterScreen} />
                    <Stack.Screen name="Inquiry" component={InquiryScreen} />
                </Stack.Navigator>
            </NavigationContainer>
        );
    }

    // 온보딩이 완료되지 않은 경우 온보딩 화면
    if (!hasCompletedOnboarding) {
        return <OnboardingScreen />;
    }

    // 메인 앱 화면 - NavigationContainer로 감싸서 TabNavigator 사용
    return (
        <>
            <NavigationContainer>
                <TabNavigator />
            </NavigationContainer>
            <NetworkStatus 
                visible={showNetworkStatus} 
                onClose={() => setShowNetworkStatus(false)} 
            />
        </>
    );
}

// QueryClient 인스턴스 생성
const queryClient = new QueryClient();

// 메인 App 컴포넌트
export default function App() {
    return (
        <QueryClientProvider client={queryClient}>
        <AuthProvider>
        <ThemeProvider>
            <UserProvider>
                <PointsProvider>
                    <MissionProvider>
                        <AppointmentProvider>
                                                    <ScheduleProvider>
                            <NewScheduleProvider>
                                <MainApp />
                            </NewScheduleProvider>
                        </ScheduleProvider>
                        </AppointmentProvider>
                    </MissionProvider>
                </PointsProvider>
            </UserProvider>
        </ThemeProvider>
        </AuthProvider>
        </QueryClientProvider>
    );
}
