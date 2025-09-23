import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    ActivityIndicator,
    Alert,
    Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getSpecialRanking, getMyPointsRanking } from '../utils/pointsManager';
import { RENDER_SERVER_URL } from '../config';
import { addLastLunchToVirtualUser } from '../utils/virtualUserData';

const SCREEN_WIDTH = Dimensions.get('window').width;

// 색상 테마
const COLORS = {
    light: {
        primary: '#3B82F6',
        secondary: '#6366F1',
        surface: '#FFFFFF',
        background: '#F8FAFC',
        text: '#1F2937',
        textSecondary: '#6B7280',
        gray: '#9CA3AF',
        lightGray: '#F3F4F6',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        yellow: '#F4D160',
        deepBlue: '#1E40AF'
    },
    dark: {
        primary: '#60A5FA',
        secondary: '#818CF8',
        surface: '#1F2937',
        background: '#111827',
        text: '#F9FAFB',
        textSecondary: '#D1D5DB',
        gray: '#6B7280',
        lightGray: '#374151',
        success: '#34D399',
        warning: '#FBBF24',
        error: '#F87171',
        yellow: '#F4D160',
        deepBlue: '#3B82F6'
    }
};

const RankingScreen = ({ navigation }) => {
    const [activeTab, setActiveTab] = useState('weekly'); // weekly, monthly, alltime, special
    const [specialCategory, setSpecialCategory] = useState('western'); // 이색 랭킹 카테고리 (양식 마스터)
    const [rankingData, setRankingData] = useState([]);
    const [myRanking, setMyRanking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentColors] = useState(COLORS.light); // 현재는 라이트 모드만 지원

    // myRanking 상태 변화 추적
    useEffect(() => {
        console.log('myRanking 상태 변경됨:', myRanking);
    }, [myRanking]);

    // 기간별 랭킹 탭
    const periodTabs = [
        { id: 'weekly', title: '주간', icon: '🏆' },
        { id: 'monthly', title: '월간', icon: '📅' },
        { id: 'alltime', title: '올타임', icon: '👑' },
        { id: 'special', title: '이색', icon: '🎭' }
    ];

    // 이색 랭킹 카테고리
    const specialCategories = [
        { id: 'western', title: '양식 마스터', icon: '🍝', color: '#FF6B6B' },
        { id: 'cafe', title: '카페 헌터', icon: '☕', color: '#4ECDC4' },
        { id: 'korean', title: '한식 전문가', icon: '🍚', color: '#45B7D1' },
        { id: 'chinese', title: '중식 탐험가', icon: '🥘', color: '#96CEB4' },
        { id: 'japanese', title: '일식 마니아', icon: '🍣', color: '#FFEAA7' },
        { id: 'random', title: '랜덤런치 왕', icon: '🏃‍♂️', color: '#DDA0DD' },
        { id: 'party', title: '파티 플래너', icon: '🎉', color: '#98D8C8' },
        { id: 'review', title: '리뷰 작가', icon: '✍️', color: '#F7DC6F' },
        { id: 'friend', title: '친구 사랑', icon: '🤝', color: '#BB8FCE' }
    ];

    // 기본 임시 데이터 생성 함수
    const generateDefaultMockData = (period) => {
        const rankings = [];
        const badges = ['양식 마스터', '카페 헌터', '한식 전문가', '중식 탐험가', '일식 마니아', '레전드', '베테랑', '신인', '열정가', '탐험가'];
        const changes = ['+3', '+2', '+1', '=', '-1', '-2', '-3'];
        
        for (let i = 1; i <= 20; i++) {
            const points = Math.max(0, 1000 - (i - 1) * 50); // 0점도 가능
            const badge = badges[i % badges.length];
            const change = changes[i % changes.length];
            
            rankings.push({
                rank: i,
                user_id: `user_${i}`,
                nickname: `사용자${i.toString().padStart(3, '0')}`,
                points: points,
                badge: badge,
                change: change,
                activities: [],
                last_lunch: '처음'
            });
        }
        return rankings;
    };

    // 랭킹 데이터 가져오기
    const fetchRankingData = useCallback(async () => {
        try {
            setLoading(true);
            
            let data = [];
            
            if (activeTab === 'special') {
                // 이색 랭킹 API 호출
                try {
                const specialData = await getSpecialRanking(specialCategory);
                if (specialData && specialData.rankings) {
                    data = specialData.rankings;
                    }
                } catch (error) {
                    console.log('이색 랭킹 API 호출 실패, 가상 데이터 사용:', error.message);
                    data = []; // 빈 배열로 설정하여 가상 데이터 생성 트리거
                }
            } else {
                // 주간/월간/올타임 랭킹 API 호출
                const response = await fetch(`${RENDER_SERVER_URL}/api/rankings/${activeTab}`);
                if (response.ok) {
                    const result = await response.json();
                    data = result.rankings || [];
                }
            }
            
            // API 데이터가 없으면 가상 유저 데이터를 사용하여 랭킹 생성
            if (data.length === 0) {
                console.log('API 데이터가 없어서 가상 유저 데이터로 랭킹 생성 시작');
                try {
                    // 가상 유저 목록 가져오기
                    const friendsResponse = await fetch(`${RENDER_SERVER_URL}/dev/friends/${global.myEmployeeId || '1'}`);
                    console.log('가상 유저 API 응답 상태:', friendsResponse.status);
                    
                    if (friendsResponse.ok) {
                        const friendsData = await friendsResponse.json();
                        console.log('가상 유저 데이터 로드 성공, 유저 수:', friendsData.length);
                        console.log('가상 유저 데이터 샘플:', friendsData.slice(0, 2));
                        
                        // 가상 유저 데이터에 마지막 점심 히스토리 추가
                        const usersWithLastLunch = friendsData.map(friend => 
                            addLastLunchToVirtualUser(friend, global.myEmployeeId || '1')
                        );
                        console.log('마지막 점심 히스토리 추가 후 유저 수:', usersWithLastLunch.length);
                        console.log('처리된 유저 샘플:', usersWithLastLunch.slice(0, 2));
                        
                        // 랭킹 데이터 생성 (점수가 0점인 유저도 포함)
                        const generateRankingsFromUsers = (users, period) => {
                            console.log('랭킹 생성 시작, 입력 유저 수:', users.length);
                            console.log('입력 유저 샘플:', users.slice(0, 2));
                            
                            const badges = ['양식 마스터', '카페 헌터', '한식 전문가', '중식 탐험가', '일식 마니아', '레전드', '베테랑', '신인', '열정가', '탐험가'];
                            const changes = ['+3', '+2', '+1', '=', '-1', '-2', '-3'];
                            
                            // 사용자별 점수 계산 (사용자 ID 기반으로 일관된 점수 생성)
                            const rankings = users.map((user, index) => {
                                const userSeed = parseInt(user.employee_id.toString().replace(/\D/g, '0')) || 1;
                                const periodMultiplier = period === 'weekly' ? 1 : period === 'monthly' ? 4 : 12;
                                
                                // 사용자 ID 기반으로 일관된 점수 생성 (0점도 가능)
                                const basePoints = (userSeed * 37) % 1000; // 0-999점 범위
                                const periodPoints = basePoints * periodMultiplier;
                                const finalPoints = Math.max(0, periodPoints - (index * 10)); // 순위에 따라 점수 감소
                                
                                const badge = badges[userSeed % badges.length];
                                const change = changes[userSeed % changes.length];
                                
                                const rankingItem = {
                                    rank: index + 1,
                                    user_id: user.employee_id,
                                    nickname: user.nickname,
                                    points: finalPoints,
                            badge: badge,
                            change: change,
                                    activities: [],
                                    last_lunch: user.last_lunch || '처음'
                                };
                                
                                console.log(`유저 ${user.nickname} 랭킹 생성:`, rankingItem);
                                return rankingItem;
                            });
                            
                            console.log('정렬 전 랭킹 데이터:', rankings.length, '개');
                            
                            // 점수 순으로 정렬 (높은 점수 순)
                            const sortedRankings = rankings.sort((a, b) => b.points - a.points).map((item, index) => ({
                                ...item,
                                rank: index + 1
                            }));
                            
                            console.log('정렬 후 랭킹 데이터:', sortedRankings.length, '개');
                            console.log('정렬 후 샘플:', sortedRankings.slice(0, 2));
                            
                            return sortedRankings;
                        };
                        
                        const rankingsData = {
                            weekly: generateRankingsFromUsers(usersWithLastLunch, 'weekly'),
                            monthly: generateRankingsFromUsers(usersWithLastLunch, 'monthly'),
                            alltime: generateRankingsFromUsers(usersWithLastLunch, 'alltime')
                        };
                        
                        data = rankingsData[activeTab] || [];
                        console.log(`${activeTab} 탭 랭킹 데이터 생성 완료, 데이터 수:`, data.length);
                        console.log(`${activeTab} 탭 랭킹 데이터 샘플:`, data.slice(0, 2));
                        console.log('전체 랭킹 데이터 구조:', Object.keys(rankingsData));
                    } else {
                        console.error('가상 유저 데이터 로드 실패:', friendsResponse.status);
                        // 가상 유저 데이터 로드 실패 시 기본 임시 데이터 사용
                        data = generateDefaultMockData(activeTab);
                        console.log('기본 임시 데이터 사용, 데이터 수:', data.length);
                    }
                } catch (error) {
                    console.error('가상 유저 데이터 로드 오류:', error);
                    // 오류 발생 시 기본 임시 데이터 사용
                    data = generateDefaultMockData(activeTab);
                    console.log('오류로 인한 기본 임시 데이터 사용, 데이터 수:', data.length);
                }
            }

            setRankingData(data);
            console.log('최종 랭킹 데이터 설정 완료, 데이터 수:', data.length);
            console.log('랭킹 데이터 샘플:', data.slice(0, 3));
            
            // 내 순위 정보 설정 (가상 유저 데이터에서 현재 사용자 찾기)
            if (global.myEmployeeId && data.length > 0) {
                try {
                    // 먼저 API에서 내 랭킹 정보 가져오기 시도 (401 오류 방지)
                    let myRankingData = null;
                    try {
                        myRankingData = await getMyPointsRanking(global.myEmployeeId);
                    } catch (apiError) {
                        console.log('API 랭킹 조회 실패 (정상적인 상황), 가상 데이터 사용:', apiError.message);
                        myRankingData = null;
                    }
                    
                    if (myRankingData && myRankingData.rank && myRankingData.rank > 0) {
                        // API에서 유효한 데이터를 가져온 경우
                        if (activeTab === 'special') {
                            const specialRanking = myRankingData.special?.[specialCategory];
                            if (specialRanking) {
                                setMyRanking(specialRanking);
                            } else {
                                setMyRanking({
                                    rank: myRankingData.rank || 0,
                                    points: myRankingData.points || 0,
                                    change: myRankingData.change || '='
                                });
                            }
                        } else {
                            const periodRanking = myRankingData[activeTab];
                            if (periodRanking) {
                                setMyRanking(periodRanking);
                            } else {
                                setMyRanking({
                                    rank: myRankingData.rank || 0,
                                    points: myRankingData.points || 0,
                                    change: myRankingData.change || '='
                                });
                            }
                        }
                    } else {
                        // API에서 데이터를 가져올 수 없는 경우, 가상 유저 데이터에서 현재 사용자 찾기
                        const currentUserRanking = data.find(item => 
                            item.user_id === global.myEmployeeId || 
                            item.nickname === global.myNickname
                        );
                        
                        if (currentUserRanking) {
                            setMyRanking({
                                rank: currentUserRanking.rank,
                                points: currentUserRanking.points,
                                change: currentUserRanking.change || '='
                            });
                        } else {
                            // 현재 사용자를 찾을 수 없는 경우 기본값 설정
                            setMyRanking({ rank: 0, points: 0, change: '=' });
                        }
                    }
                } catch (error) {
                    console.error('내 랭킹 정보 조회 실패:', error);
                    
                    // 오류 발생 시 가상 유저 데이터에서 현재 사용자 찾기
                    const currentUserRanking = data.find(item => 
                        item.user_id === global.myEmployeeId || 
                        item.nickname === global.myNickname
                    );
                    
                    if (currentUserRanking) {
                        setMyRanking({
                            rank: currentUserRanking.rank,
                            points: currentUserRanking.points,
                            change: currentUserRanking.change || '='
                        });
                    } else {
                        setMyRanking({ rank: 0, points: 0, change: '=' });
                    }
                }
            } else {
                // 사용자 ID가 없거나 데이터가 없는 경우 기본값 설정
                setMyRanking({ rank: 0, points: 0, change: '=' });
            }
        } catch (error) {
            console.error('랭킹 데이터 로딩 실패:', error);
            Alert.alert('오류', '랭킹 정보를 불러올 수 없습니다.');
        } finally {
            setLoading(false);
        }
    }, [activeTab, specialCategory]);

    useEffect(() => {
        fetchRankingData();
    }, [fetchRankingData, specialCategory]); // specialCategory 변경 시에도 랭킹 데이터 새로고침

    // 랭킹 아이템 렌더링
    const renderRankingItem = ({ item, index }) => {
        // 1~10위는 특별 아이콘, 11~100위는 숫자
        const rankIcons = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
        const rankIcon = item.rank <= 10 ? rankIcons[item.rank - 1] : `${item.rank}위`;
        
        const changeColor = item.change === '+' ? currentColors.success : 
                           item.change === '-' ? currentColors.error : 
                           currentColors.gray;

        return (
            <TouchableOpacity
                style={{
                    backgroundColor: currentColors.surface,
                    borderRadius: 16,
                    padding: 16,
                    marginHorizontal: 16,
                    marginBottom: 12,
                    elevation: 3,
                    shadowColor: currentColors.primary,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    borderWidth: 1,
                    borderColor: 'rgba(59, 130, 246, 0.1)'
                }}
                onPress={() => {
                    // 사용자 프로필로 이동
                    if (item.user_id && item.user_id !== 'user_0') {
                    navigation.navigate('UserProfile', { 
                        employeeId: item.user_id,
                        isFriend: false 
                    });
                    }
                }}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <Text style={{ fontSize: 24, marginRight: 12 }}>{rankIcon}</Text>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: currentColors.text }}>
                                {item.nickname}
                            </Text>
                            <Text style={{ fontSize: 14, color: currentColors.textSecondary, marginTop: 2 }}>
                                {item.badge}
                            </Text>
                        </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: currentColors.primary }}>
                            {item.points.toLocaleString()}점
                        </Text>
                        <Text style={{ fontSize: 12, color: changeColor, marginTop: 2 }}>
                            {item.change}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    // 기간별 탭 렌더링
    const renderPeriodTabs = () => (
        <View style={{ paddingHorizontal: 16, marginTop: 14, marginBottom: 16 }}>
            <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 8 }}
            >
                {periodTabs.map((tab) => (
                    <TouchableOpacity
                        key={tab.id}
                        style={{
                            backgroundColor: activeTab === tab.id ? currentColors.primary : currentColors.surface,
                            borderRadius: 20,
                            paddingVertical: 8,
                            paddingHorizontal: 16,
                            marginRight: 8,
                            elevation: activeTab === tab.id ? 2 : 1,
                            shadowColor: currentColors.primary,
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: activeTab === tab.id ? 0.2 : 0.1,
                            shadowRadius: 4,
                            borderWidth: 1,
                            borderColor: activeTab === tab.id ? currentColors.primary : currentColors.lightGray
                        }}
                        onPress={() => {
                            if (tab.id === 'special') {
                                setSpecialCategory('western'); // 이색 랭킹 선택 시 양식 마스터로 자동 설정
                            }
                            setActiveTab(tab.id);
                        }}
                    >
                        <Text style={{
                            color: activeTab === tab.id ? '#FFFFFF' : currentColors.text,
                            fontWeight: activeTab === tab.id ? 'bold' : '600',
                            fontSize: 14
                        }}>
                            {tab.icon} {tab.title}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );

    // 이색 랭킹 카테고리 렌더링
    const renderSpecialCategories = () => (
        <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, marginBottom: 16 }}
        >
            {specialCategories.map((category) => (
                <TouchableOpacity
                    key={category.id}
                    style={{
                        backgroundColor: specialCategory === category.id ? category.color : currentColors.lightGray,
                        borderRadius: 20,
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                        marginHorizontal: 6,
                        alignItems: 'center',
                        minWidth: 80
                    }}
                    onPress={() => setSpecialCategory(category.id)}
                >
                    <Text style={{ fontSize: 20, marginBottom: 4 }}>{category.icon}</Text>
                    <Text style={{ 
                        fontSize: 10, 
                        fontWeight: 'bold',
                        color: specialCategory === category.id ? '#FFFFFF' : currentColors.text,
                        textAlign: 'center'
                    }}>
                        {category.title}
                    </Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );

    // 내 순위 렌더링 (플로팅 카드)
    const renderMyRanking = () => {
        console.log('renderMyRanking 호출됨, myRanking:', myRanking);
        
        // 랭킹 정보가 없으면 표시하지 않음
        if (!myRanking) {
            console.log('myRanking이 null이므로 카드 표시 안함');
            return null;
        }
        
        // 순위가 0이고 점수도 0인 경우에만 표시하지 않음 (데이터가 없는 경우)
        if (myRanking.rank === 0 && myRanking.points === 0) {
            console.log('순위와 점수가 모두 0이므로 카드 표시 안함');
            return null;
        }

        console.log('내 순위 카드 렌더링:', myRanking);

        return (
        <View style={{
            position: 'absolute',
            bottom: 32,
            left: 16,
            right: 16,
            backgroundColor: currentColors.primary,
            borderRadius: 20,
            padding: 16,
            elevation: 8,
            shadowColor: currentColors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            zIndex: 10
        }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }}>
                            내 순위: {myRanking.rank > 0 ? `${myRanking.rank}위` : '순위 없음'}
                    </Text>
                    <Text style={{ color: '#FFFFFF', fontSize: 14, marginTop: 2 }}>
                            {myRanking.points.toLocaleString()}점
                    </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ 
                            color: myRanking.change === '+' ? '#10B981' : 
                                   myRanking.change === '-' ? '#EF4444' : '#FFFFFF',
                        fontSize: 18,
                        fontWeight: 'bold'
                    }}>
                            {myRanking.change}
                    </Text>
                    <Text style={{ color: '#FFFFFF', fontSize: 12, marginTop: 2 }}>
                        순위 변화
                    </Text>
                </View>
            </View>
        </View>
    );
    };

    if (loading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: currentColors.background }}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={currentColors.primary} />
                    <Text style={{ marginTop: 10, color: currentColors.text }}>랭킹 정보를 불러오는 중...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: currentColors.background }}>


            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }}>
                {/* 기간별 탭 */}
                {renderPeriodTabs()}

                {/* 이색 랭킹 카테고리 (이색 탭일 때만) */}
                {activeTab === 'special' && renderSpecialCategories()}

                {/* 랭킹 제목 */}
                <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
                    <Text style={{ fontSize: 20, fontWeight: 'bold', color: currentColors.text }}>
                        {activeTab === 'weekly' && '🏆 이번 주 랭킹'}
                        {activeTab === 'monthly' && '📅 이번 달 랭킹'}
                        {activeTab === 'alltime' && '👑 올타임 랭킹'}
                        {activeTab === 'special' && `${specialCategories.find(c => c.id === specialCategory)?.icon} ${specialCategories.find(c => c.id === specialCategory)?.title} 랭킹`}
                    </Text>
                </View>

                {/* 랭킹 리스트 */}
                {rankingData.length > 0 ? (
                    rankingData.map((item, index) => (
                        <View key={`${item.user_id || item.rank || index}`}>
                            {renderRankingItem({ item, index })}
                        </View>
                    ))
                ) : (
                    <View style={{ padding: 20, alignItems: 'center' }}>
                        <Text style={{ color: currentColors.text, fontSize: 16 }}>
                            랭킹 데이터를 불러올 수 없습니다.
                        </Text>
                    </View>
                )}
            </ScrollView>

            {/* 내 순위 플로팅 카드 */}
            {myRanking && renderMyRanking()}
        </SafeAreaView>
    );
};

export default RankingScreen; 