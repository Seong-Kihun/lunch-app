import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    TouchableOpacity, 
    ScrollView, 
    SafeAreaView, 
    ActivityIndicator,
    StyleSheet,
    Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../../contexts/UserContext';
import { usePoints } from '../../contexts/PointsContext';
import { COLORS } from '../../theme/colors';

const { width } = Dimensions.get('window');

const UserDashboard = ({ navigation }) => {
    const { user } = useUser();
    const { points } = usePoints();
    const currentColors = global.currentColors || COLORS.light;
    
    const [dashboardData, setDashboardData] = useState({
        totalLunches: 0,
        totalParties: 0,
        totalReviews: 0,
        favoriteCategory: '한식',
        weeklyGoal: 3,
        weeklyProgress: 1,
        streak: 0,
        rank: 0
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setIsLoading(true);
            
            // 개발 모드에서는 API 호출을 건너뛰고 기본 데이터 사용
            if (__DEV__) {
                const mockData = {
                    totalLunches: 45,
                    totalParties: 12,
                    totalReviews: 8,
                    favoriteCategory: '한식',
                    weeklyGoal: 3,
                    weeklyProgress: 2,
                    streak: 5,
                    rank: 15
                };
                setDashboardData(mockData);
                return;
            }
            
            // 프로덕션 모드에서만 API 호출
            try {
                const response = await fetch(`${global.RENDER_SERVER_URL}/api/users/dashboard`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${global.accessToken}`
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data.success && data.data) {
                    setDashboardData({
                        totalLunches: data.data.total_lunches,
                        totalParties: data.data.total_parties,
                        totalReviews: data.data.total_reviews,
                        favoriteCategory: data.data.favorite_category,
                        weeklyGoal: data.data.weekly_goal,
                        weeklyProgress: data.data.weekly_progress,
                        streak: data.data.streak,
                        rank: data.data.rank
                    });
                } else {
                    throw new Error(data.error || '대시보드 데이터 조회 실패');
                }
            } catch (error) {
                console.error('API 호출 실패, 기본 데이터 사용:', error);
                // API 실패 시 기본 데이터 사용
                setDashboardData({
                    totalLunches: 45,
                    totalParties: 12,
                    totalReviews: 8,
                    favoriteCategory: '한식',
                    weeklyGoal: 3,
                    weeklyProgress: 2,
                    streak: 5,
                    rank: 15
                });
            }
            
        } catch (error) {
            console.error('대시보드 데이터 로드 실패:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getStreakMessage = (streak) => {
        if (streak >= 10) return '🔥 불타는 연속 기록!';
        if (streak >= 5) return '⚡ 연속 기록 달성!';
        if (streak >= 3) return '💪 좋은 시작!';
        return '🌟 첫 걸음을 내딛어보세요!';
    };

    const getRankMessage = (rank) => {
        if (rank <= 5) return '🏆 상위 랭커!';
        if (rank <= 10) return '🥈 상위권!';
        if (rank <= 20) return '🥉 중상위권!';
        return '📈 성장 중!';
    };

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background }]}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={currentColors.primary} />
                    <Text style={[styles.loadingText, { color: currentColors.textSecondary }]}>로딩 중...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background }]}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* 헤더 */}
                <View style={styles.headerSection}>
                    <Text style={[styles.headerTitle, { color: currentColors.text }]}>대시보드</Text>
                    <Text style={[styles.headerSubtitle, { color: currentColors.textSecondary }]}>
                        {user?.nickname || user?.name || '사용자'}님의 활동 현황을 확인해보세요
                    </Text>
                </View>

                {/* 주요 통계 카드 */}
                <View style={styles.statsSection}>
                    <Text style={[styles.sectionTitle, { color: currentColors.text }]}>주요 통계</Text>
                    
                    <View style={styles.statsGrid}>
                        <View style={[styles.statCard, { backgroundColor: currentColors.surface }]}>
                            <View style={[styles.statIcon, { backgroundColor: currentColors.primary + '15' }]}>
                                <Ionicons name="restaurant" size={24} color={currentColors.primary} />
                            </View>
                            <Text style={[styles.statValue, { color: currentColors.primary }]}>
                                {dashboardData.totalLunches}
                            </Text>
                            <Text style={[styles.statLabel, { color: currentColors.textSecondary }]}>
                                총 점심
                            </Text>
                        </View>
                        
                        <View style={[styles.statCard, { backgroundColor: currentColors.surface }]}>
                            <View style={[styles.statIcon, { backgroundColor: currentColors.secondary + '15' }]}>
                                <Ionicons name="people" size={24} color={currentColors.secondary} />
                            </View>
                            <Text style={[styles.statValue, { color: currentColors.secondary }]}>
                                {dashboardData.totalParties}
                            </Text>
                            <Text style={[styles.statLabel, { color: currentColors.textSecondary }]}>
                                파티 참여
                            </Text>
                        </View>
                        
                        <View style={[styles.statCard, { backgroundColor: currentColors.surface }]}>
                            <View style={[styles.statIcon, { backgroundColor: currentColors.yellow + '15' }]}>
                                <Ionicons name="star" size={24} color={currentColors.yellow} />
                            </View>
                            <Text style={[styles.statValue, { color: currentColors.yellow }]}>
                                {dashboardData.totalReviews}
                            </Text>
                            <Text style={[styles.statLabel, { color: currentColors.textSecondary }]}>
                                리뷰 작성
                            </Text>
                        </View>
                        
                        <View style={[styles.statCard, { backgroundColor: currentColors.surface }]}>
                            <View style={[styles.statIcon, { backgroundColor: currentColors.accent + '15' }]}>
                                <Ionicons name="trophy" size={24} color={currentColors.accent} />
                            </View>
                            <Text style={[styles.statValue, { color: currentColors.accent }]}>
                                #{dashboardData.rank}
                            </Text>
                            <Text style={[styles.statLabel, { color: currentColors.textSecondary }]}>
                                전체 순위
                            </Text>
                        </View>
                    </View>
                </View>

                {/* 주간 목표 */}
                <View style={styles.goalSection}>
                    <Text style={[styles.sectionTitle, { color: currentColors.text }]}>주간 목표</Text>
                    
                    <View style={[styles.goalCard, { 
                        backgroundColor: currentColors.surface,
                        shadowColor: currentColors.primary,
                        borderColor: 'rgba(59, 130, 246, 0.1)'
                    }]}>
                        <View style={styles.goalHeader}>
                            <View style={styles.goalInfo}>
                                <Text style={[styles.goalTitle, { color: currentColors.text }]}>
                                    이번 주 점심 목표
                                </Text>
                                <Text style={[styles.goalProgress, { color: currentColors.textSecondary }]}>
                                    {dashboardData.weeklyProgress} / {dashboardData.weeklyGoal}회
                                </Text>
                            </View>
                            <View style={[styles.goalIcon, { backgroundColor: currentColors.primary + '15' }]}>
                                <Ionicons name="target" size={24} color={currentColors.primary} />
                            </View>
                        </View>
                        
                        <View style={[styles.goalBar, { backgroundColor: currentColors.lightGray }]}>
                            <View 
                                style={[
                                    styles.goalBarFill, 
                                    { 
                                        backgroundColor: currentColors.primary,
                                        width: `${(dashboardData.weeklyProgress / dashboardData.weeklyGoal) * 100}%`
                                    }
                                ]} 
                            />
                        </View>
                        
                        <Text style={[styles.goalMessage, { color: currentColors.textSecondary }]}>
                            {dashboardData.weeklyProgress >= dashboardData.weeklyGoal 
                                ? '🎉 목표 달성! 다음 주 목표를 높여보세요!' 
                                : `${dashboardData.weeklyGoal - dashboardData.weeklyProgress}회 더 하면 목표 달성!`}
                        </Text>
                    </View>
                </View>

                {/* 연속 기록 */}
                <View style={styles.streakSection}>
                    <Text style={[styles.sectionTitle, { color: currentColors.text }]}>연속 기록</Text>
                    
                    <View style={[styles.streakCard, { 
                        backgroundColor: currentColors.surface,
                        shadowColor: currentColors.primary,
                        borderColor: 'rgba(59, 130, 246, 0.1)'
                    }]}>
                        <View style={styles.streakHeader}>
                            <View style={[styles.streakIcon, { backgroundColor: currentColors.secondary + '15' }]}>
                                <Ionicons name="flame" size={28} color={currentColors.secondary} />
                            </View>
                            <View style={styles.streakInfo}>
                                <Text style={[styles.streakNumber, { color: currentColors.secondary }]}>
                                    {dashboardData.streak}일
                                </Text>
                                <Text style={[styles.streakLabel, { color: currentColors.textSecondary }]}>
                                    연속 점심 기록
                                </Text>
                            </View>
                        </View>
                        
                        <Text style={[styles.streakMessage, { color: currentColors.text }]}>
                            {getStreakMessage(dashboardData.streak)}
                        </Text>
                    </View>
                </View>

                {/* 선호 카테고리 */}
                <View style={styles.categorySection}>
                    <Text style={[styles.sectionTitle, { color: currentColors.text }]}>선호 카테고리</Text>
                    
                    <View style={[styles.categoryCard, { 
                        backgroundColor: currentColors.surface,
                        shadowColor: currentColors.primary,
                        borderColor: 'rgba(59, 130, 246, 0.1)'
                    }]}>
                        <View style={styles.categoryHeader}>
                            <View style={[styles.categoryIcon, { backgroundColor: currentColors.accent + '15' }]}>
                                <Ionicons name="heart" size={24} color={currentColors.accent} />
                            </View>
                            <View style={styles.categoryInfo}>
                                <Text style={[styles.categoryTitle, { color: currentColors.text }]}>
                                    {dashboardData.favoriteCategory}
                                </Text>
                                <Text style={[styles.categorySubtitle, { color: currentColors.textSecondary }]}>
                                    가장 많이 선택한 카테고리
                                </Text>
                            </View>
                        </View>
                        
                        <TouchableOpacity 
                            style={[styles.exploreButton, { backgroundColor: currentColors.primary }]}
                            onPress={() => navigation.navigate('맛집')}
                        >
                            <Text style={styles.exploreButtonText}>맛집 탐험하기</Text>
                            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* 빠른 액션 */}
                <View style={styles.quickActionsSection}>
                    <Text style={[styles.sectionTitle, { color: currentColors.text }]}>빠른 액션</Text>
                    
                    <View style={styles.quickActionsGrid}>
                        <TouchableOpacity 
                            style={[styles.quickActionCard, { backgroundColor: currentColors.primary }]}
                            onPress={() => navigation.navigate('파티', { screen: 'CreateParty' })}
                        >
                            <Ionicons name="add-circle" size={24} color="#FFFFFF" />
                            <Text style={styles.quickActionText}>파티 만들기</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={[styles.quickActionCard, { backgroundColor: currentColors.secondary }]}
                            onPress={() => navigation.navigate('파티', { screen: 'RandomLunch' })}
                        >
                            <Ionicons name="shuffle" size={24} color="#FFFFFF" />
                            <Text style={styles.quickActionText}>랜덤런치</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={[styles.quickActionCard, { backgroundColor: currentColors.accent }]}
                            onPress={() => navigation.navigate('맛집')}
                        >
                            <Ionicons name="restaurant" size={24} color="#FFFFFF" />
                            <Text style={styles.quickActionText}>맛집 찾기</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
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
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    headerSection: {
        marginBottom: 24,
        paddingTop: 8,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    headerSubtitle: {
        fontSize: 16,
        lineHeight: 22,
    },
    statsSection: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        letterSpacing: 0.3,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    statCard: {
        width: (width - 44) / 2,
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        elevation: 3,
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.1)',
    },
    statIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        textAlign: 'center',
    },
    goalSection: {
        marginBottom: 24,
    },
    goalCard: {
        borderRadius: 20,
        padding: 20,
        elevation: 3,
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        borderWidth: 1,
    },
    goalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    goalInfo: {
        flex: 1,
    },
    goalTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    goalProgress: {
        fontSize: 14,
    },
    goalIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    goalBar: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 12,
    },
    goalBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    goalMessage: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    streakSection: {
        marginBottom: 24,
    },
    streakCard: {
        borderRadius: 20,
        padding: 20,
        elevation: 3,
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        borderWidth: 1,
    },
    streakHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    streakIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    streakInfo: {
        flex: 1,
    },
    streakNumber: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    streakLabel: {
        fontSize: 14,
    },
    streakMessage: {
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    categorySection: {
        marginBottom: 24,
    },
    categoryCard: {
        borderRadius: 20,
        padding: 20,
        elevation: 3,
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        borderWidth: 1,
    },
    categoryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    categoryIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    categoryInfo: {
        flex: 1,
    },
    categoryTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    categorySubtitle: {
        fontSize: 14,
    },
    exploreButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        gap: 8,
    },
    exploreButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    quickActionsSection: {
        marginBottom: 24,
    },
    quickActionsGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    quickActionCard: {
        flex: 1,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        elevation: 3,
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        gap: 8,
    },
    quickActionText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
    },
});

export default UserDashboard;
