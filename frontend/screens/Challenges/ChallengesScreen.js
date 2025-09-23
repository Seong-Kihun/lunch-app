import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    ScrollView, 
    SafeAreaView, 
    StyleSheet, 
    TouchableOpacity,
    ActivityIndicator,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useUser } from '../../contexts/UserContext';
import newPointsManager from '../../utils/newPointsManager';

const ChallengesScreen = ({ navigation }) => {
    const { user, isAuthenticated } = useUser();
    const [challenges, setChallenges] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTab, setSelectedTab] = useState('daily');

    const currentColors = {
        primary: '#3B82F6',
        secondary: '#10B981',
        background: '#F1F5F9',
        surface: '#FFFFFF',
        text: '#1E293B',
        textSecondary: '#64748B',
        border: '#E2E8F0',
        accent: '#F59E0B',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444'
    };

    useFocusEffect(
        React.useCallback(() => {
            loadChallenges();
        }, [])
    );

    const loadChallenges = async () => {
        try {
            if (!isAuthenticated) {
                console.log('로그인이 필요합니다.');
                return;
            }

            setIsLoading(true);
            
            try {
                const challengesData = await newPointsManager.getChallenges(user.employee_id);
                if (challengesData) {
                    setChallenges(challengesData);
                } else {
                    // API 실패 시 기본 데이터 사용
                    setChallenges(generateMockChallenges());
                }
            } catch (error) {
                console.log('API 호출 실패, 기본 데이터 사용:', error);
                setChallenges(generateMockChallenges());
            }

        } catch (error) {
            console.error('챌린지 데이터 로드 실패:', error);
            setChallenges(generateMockChallenges());
        } finally {
            setIsLoading(false);
        }
    };

    const generateMockChallenges = () => {
        return {
            daily: [
                {
                    id: "daily_1",
                    name: "오늘의 기록",
                    description: "오늘 점심 메뉴를 기록하기",
                    points: 20,
                    type: "daily",
                    category: "기록",
                    progress: 0,
                    required: 1,
                    completed: false
                },
                {
                    id: "daily_2",
                    name: "사진 작가",
                    description: "점심 사진을 찍어서 공유하기",
                    points: 30,
                    type: "daily",
                    category: "공유",
                    progress: 0,
                    required: 1,
                    completed: false
                },
                {
                    id: "daily_3",
                    name: "소통하기",
                    description: "파티나 랜덤런치에 참여하기",
                    points: 40,
                    type: "daily",
                    category: "소통",
                    progress: 0,
                    required: 1,
                    completed: false
                },
                {
                    id: "daily_4",
                    name: "맛집 탐험",
                    description: "새로운 식당에 방문하기",
                    points: 50,
                    type: "daily",
                    category: "탐험",
                    progress: 0,
                    required: 1,
                    completed: false
                },
                {
                    id: "daily_5",
                    name: "리뷰 작성",
                    description: "방문한 식당에 리뷰 작성하기",
                    points: 25,
                    type: "daily",
                    category: "리뷰",
                    progress: 0,
                    required: 1,
                    completed: false
                },
                {
                    id: "daily_6",
                    name: "친구와 식사",
                    description: "친구와 함께 점심 먹기",
                    points: 35,
                    type: "daily",
                    category: "소통",
                    progress: 0,
                    required: 1,
                    completed: false
                },
                {
                    id: "daily_7",
                    name: "건강한 선택",
                    description: "건강한 메뉴 선택하기",
                    points: 20,
                    type: "daily",
                    category: "건강",
                    progress: 0,
                    required: 1,
                    completed: false
                },
                {
                    id: "daily_8",
                    name: "시간 지키기",
                    description: "점심 시간을 정확히 지키기",
                    points: 15,
                    type: "daily",
                    category: "습관",
                    progress: 0,
                    required: 1,
                    completed: false
                }
            ],
            weekly: [
                {
                    id: "weekly_1",
                    name: "맛집 탐험가",
                    description: "일주일 동안 5개의 다른 식당 방문하기",
                    points: 150,
                    type: "weekly",
                    category: "탐험",
                    progress: 2,
                    required: 5,
                    completed: false
                },
                {
                    id: "weekly_2",
                    name: "소셜 플레이어",
                    description: "일주일 동안 3번의 파티나 랜덤런치 참여하기",
                    points: 200,
                    type: "weekly",
                    category: "소통",
                    progress: 1,
                    required: 3,
                    completed: false
                },
                {
                    id: "weekly_3",
                    name: "리뷰 마스터",
                    description: "일주일 동안 7개의 리뷰 작성하기",
                    points: 180,
                    type: "weekly",
                    category: "리뷰",
                    progress: 3,
                    required: 7,
                    completed: false
                }
            ],
            monthly: [
                {
                    id: "monthly_1",
                    name: "맛집 마스터",
                    description: "한 달 동안 20개의 다른 식당 방문하기",
                    points: 500,
                    type: "monthly",
                    category: "탐험",
                    progress: 8,
                    required: 20,
                    completed: false
                },
                {
                    id: "monthly_2",
                    name: "소셜 스타",
                    description: "한 달 동안 15번의 파티나 랜덤런치 참여하기",
                    points: 600,
                    type: "monthly",
                    category: "소통",
                    progress: 5,
                    required: 15,
                    completed: false
                }
            ]
        };
    };

    const handleChallengeComplete = async (challenge) => {
        try {
            const result = await newPointsManager.completeChallenge(user.employee_id, challenge.id);
            if (result && result.success) {
                Alert.alert('축하합니다!', result.message);
                loadChallenges(); // 챌린지 목록 새로고침
            } else {
                Alert.alert('오류', '챌린지 완료 처리에 실패했습니다.');
            }
        } catch (error) {
            console.error('챌린지 완료 처리 실패:', error);
            Alert.alert('오류', '챌린지 완료 처리에 실패했습니다.');
        }
    };

    const navigateToChallengeAction = (challenge) => {
        // 챌린지 타입에 따라 해당 화면으로 이동
        switch (challenge.category) {
            case '기록':
                navigation.navigate('홈'); // 홈 화면에서 점심 기록 가능
                break;
            case '공유':
                navigation.navigate('파티', { screen: 'CreateParty' }); // 파티 생성 화면
                break;
            case '소통':
                navigation.navigate('파티', { screen: 'RandomLunch' }); // 랜덤런치 화면
                break;
            case '탐험':
                navigation.navigate('홈'); // 홈 화면에서 식당 검색 가능
                break;
            case '리뷰':
                navigation.navigate('홈'); // 홈 화면에서 리뷰 작성 가능
                break;
            case '건강':
                navigation.navigate('홈'); // 홈 화면에서 메뉴 선택 가능
                break;
            case '습관':
                navigation.navigate('홈'); // 홈 화면에서 시간 관리 가능
                break;
            default:
                navigation.navigate('홈');
                break;
        }
    };

    const getProgressPercentage = (challenge) => {
        if (challenge.completed) return 100;
        if (!challenge.progress || !challenge.required) return 0;
        return Math.min(100, (challenge.progress / challenge.required) * 100);
    };

    const renderChallengeItem = (challenge) => (
        <View key={challenge.id} style={[styles.challengeItem, { backgroundColor: currentColors.surface }]}>
            <View style={styles.challengeHeader}>
                <View style={styles.challengeInfo}>
                    <Text style={[styles.challengeName, { color: currentColors.text }]}>
                        {challenge.name}
                    </Text>
                    <Text style={[styles.challengeDescription, { color: currentColors.textSecondary }]}>
                        {challenge.description}
                    </Text>
                </View>
                <View style={styles.challengePoints}>
                    <Text style={[styles.pointsText, { color: currentColors.accent }]}>
                        {challenge.points}P
                    </Text>
                </View>
            </View>
            
            {!challenge.completed && challenge.progress !== undefined && (
                <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                        <View 
                            style={[
                                styles.progressFill, 
                                { 
                                    width: `${getProgressPercentage(challenge)}%`,
                                    backgroundColor: currentColors.primary
                                }
                            ]} 
                        />
                    </View>
                    <Text style={[styles.progressText, { color: currentColors.textSecondary }]}>
                        {challenge.progress}/{challenge.required}
                    </Text>
                </View>
            )}
            
            <View style={styles.challengeActions}>
                {challenge.completed ? (
                    <View style={[styles.completedBadge, { backgroundColor: currentColors.success }]}>
                        <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                        <Text style={styles.completedText}>완료</Text>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={[styles.completeButton, { backgroundColor: currentColors.primary }]}
                        onPress={() => navigateToChallengeAction(challenge)}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.completeButtonText}>완료하기</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    const renderTabContent = () => {
        const tabChallenges = challenges[selectedTab] || [];
        
        if (tabChallenges.length === 0) {
            return (
                <View style={styles.emptyContainer}>
                    <Ionicons name="trophy-outline" size={64} color={currentColors.textSecondary} />
                    <Text style={[styles.emptyText, { color: currentColors.textSecondary }]}>
                        {selectedTab === 'daily' ? '오늘의 챌린지가 없습니다.' :
                         selectedTab === 'weekly' ? '이번 주 챌린지가 없습니다.' :
                         '이번 달 챌린지가 없습니다.'}
                    </Text>
                </View>
            );
        }

        return (
            <ScrollView 
                style={styles.challengesList}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.challengesListContent}
            >
                {tabChallenges.map(renderChallengeItem)}
            </ScrollView>
        );
    };

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background }]}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={currentColors.primary} />
                    <Text style={[styles.loadingText, { color: currentColors.textSecondary }]}>
                        챌린지를 불러오는 중...
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background }]}>
            {/* 탭 네비게이션 */}
            <View style={[styles.tabContainer, { backgroundColor: currentColors.surface }]}>
                <TouchableOpacity
                    style={[
                        styles.tabButton,
                        selectedTab === 'daily' && { backgroundColor: currentColors.primary }
                    ]}
                    onPress={() => setSelectedTab('daily')}
                >
                    <Text style={[
                        styles.tabText,
                        { color: selectedTab === 'daily' ? '#FFFFFF' : currentColors.textSecondary }
                    ]}>
                        일일
                    </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                    style={[
                        styles.tabButton,
                        selectedTab === 'weekly' && { backgroundColor: currentColors.primary }
                    ]}
                    onPress={() => setSelectedTab('weekly')}
                >
                    <Text style={[
                        styles.tabText,
                        { color: selectedTab === 'weekly' ? '#FFFFFF' : currentColors.textSecondary }
                    ]}>
                        주간
                    </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                    style={[
                        styles.tabButton,
                        selectedTab === 'monthly' && { backgroundColor: currentColors.primary }
                    ]}
                    onPress={() => setSelectedTab('monthly')}
                >
                    <Text style={[
                        styles.tabText,
                        { color: selectedTab === 'monthly' ? '#FFFFFF' : currentColors.textSecondary }
                    ]}>
                        월간
                    </Text>
                </TouchableOpacity>
            </View>

            {/* 챌린지 목록 */}
            {renderTabContent()}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#64748B',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    placeholder: {
        width: 32,
    },
    tabContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    tabButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
    },
    challengesList: {
        flex: 1,
    },
    challengesListContent: {
        padding: 20,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 50,
    },
    emptyText: {
        marginTop: 10,
        fontSize: 16,
    },
    challengeItem: {
        marginBottom: 16,
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    challengeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    challengeInfo: {
        flex: 1,
        marginRight: 12,
    },
    challengeName: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    challengeDescription: {
        fontSize: 14,
        lineHeight: 20,
    },
    challengePoints: {
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    pointsText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    progressContainer: {
        marginBottom: 16,
    },
    progressBar: {
        height: 6,
        backgroundColor: '#E2E8F0',
        borderRadius: 3,
        marginBottom: 8,
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    progressText: {
        fontSize: 12,
        textAlign: 'right',
    },
    challengeActions: {
        alignItems: 'flex-end',
    },
    completeButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    completeButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    completedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    completedText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 4,
    },
});

export default ChallengesScreen;
