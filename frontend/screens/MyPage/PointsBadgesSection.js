import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    TouchableOpacity, 
    ScrollView, 
    SafeAreaView, 
    ActivityIndicator,
    StyleSheet,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getUserPoints, getUserBadges } from '../../services/userService';
import newPointsManager from '../../utils/newPointsManager';
import { useUser } from '../../contexts/UserContext';

const PointsBadgesSection = ({ navigation }) => {
    const { user, isAuthenticated } = useUser();
    const [isLoading, setIsLoading] = useState(true);
    const [pointsData, setPointsData] = useState(null);
    const [badgesData, setBadgesData] = useState([]);
    const [error, setError] = useState(null);

    const currentColors = global.currentColors || {
        primary: '#3B82F6',
        secondary: '#10B981',
        background: '#F1F5F9',
        surface: '#FFFFFF',
        text: '#1E293B',
        textSecondary: '#64748B',
        border: '#E2E8F0',
        gray: '#64748B',
        lightGray: '#E2E8F0',
        yellow: '#F4D160',
        deepBlue: '#1D5D9B',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444'
    };

    useEffect(() => {
        loadPointsAndBadges();
    }, []);

        const loadPointsAndBadges = async () => {
        try {
            if (!isAuthenticated) {
                setError('로그인이 필요합니다.');
                return;
            }

            setIsLoading(true);
            setError(null);
            
            // 개발 모드에서는 API 호출을 건너뛰고 기본 데이터 사용
            if (__DEV__) {
                const mockPointsData = {
                    currentPoints: 1250,
                    totalEarned: 1800,
                    level: 3,
                    levelTitle: '점심 탐험가',
                    nextLevelPoints: 2000,
                    progressPercentage: 62
                };
                
                const mockBadgesData = [
                    {
                        id: 1,
                        name: '첫 발걸음',
                        description: '첫 번째 식당을 방문했습니다',
                        icon: 'restaurant',
                        color: currentColors.success,
                        earned: true,
                        earnedDate: '2024-01-10'
                    }
                ];
                
                setPointsData(mockPointsData);
                setBadgesData(mockBadgesData);
                setIsLoading(false);
                return;
            }
            
            // 프로덕션 모드에서만 API 호출
            try {
                // 포인트 정보 조회
                const pointsResponse = await fetch(`${global.RENDER_SERVER_URL}/api/users/points`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${global.accessToken}`
                    }
                });
                
                if (!pointsResponse.ok) {
                    throw new Error(`HTTP error! status: ${pointsResponse.status}`);
                }
                
                const pointsData = await pointsResponse.json();
                
                // 배지 정보 조회
                const badgesResponse = await fetch(`${global.RENDER_SERVER_URL}/api/users/badges`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${global.accessToken}`
                    }
                });
                
                if (!badgesResponse.ok) {
                    throw new Error(`HTTP error! status: ${badgesResponse.status}`);
                }
                
                const badgesData = await badgesResponse.json();
                
                if (pointsData.success && pointsData.data) {
                    setPointsData({
                        currentPoints: pointsData.data.total_points,
                        totalEarned: pointsData.data.total_points,
                        level: pointsData.data.current_level,
                        levelTitle: pointsData.data.level_title,
                        nextLevelPoints: pointsData.data.next_level_points,
                        progressPercentage: pointsData.data.progress_percentage
                    });
                }
                
                if (badgesData.success && badgesData.data) {
                    setBadgesData(badgesData.data.badges || []);
                }
                
                setIsLoading(false);
                return;
            } catch (apiError) {
                console.log('API 호출 실패, 기본 데이터 사용:', apiError);
                
                // API 실패 시 기본 데이터 사용
                const mockPointsData = {
                    currentPoints: 1250,
                    totalEarned: 1800,
                    level: 3,
                    levelTitle: '점심 탐험가',
                    nextLevelPoints: 2000,
                    progressPercentage: 62
                };
                
                const mockBadgesData = [
                    {
                        id: 1,
                        name: '첫 발걸음',
                        description: '첫 번째 식당을 방문했습니다',
                        icon: 'restaurant',
                        color: currentColors.success,
                        earned: true,
                        earnedDate: '2024-01-10'
                    },
                    {
                        id: 2,
                        name: '이야기꾼',
                        description: '10개의 리뷰를 작성했습니다',
                        icon: 'create',
                        color: currentColors.primary,
                        earned: true,
                        earnedDate: '2024-01-15'
                    },
                    {
                        id: 3,
                        name: '사교적',
                        description: '5개의 파티에 참여했습니다',
                        icon: 'people',
                        color: currentColors.warning,
                        earned: true,
                        earnedDate: '2024-01-12'
                    },
                    {
                        id: 4,
                        name: '운명의 만남',
                        description: '20번의 랜덤런치에 참여했습니다',
                        icon: 'shuffle',
                        color: currentColors.deepBlue,
                        earned: false,
                        progress: 15
                    },
                    {
                        id: 5,
                        name: '맛집 헌터',
                        description: '50개의 다른 식당을 방문했습니다',
                        icon: 'map',
                        color: currentColors.yellow,
                        earned: false,
                        progress: 35
                    }
                ];
                
                setPointsData(mockPointsData);
                setBadgesData(mockBadgesData);
                return;
            }
            
            // 프로덕션 모드에서만 API 호출
            try {
                const [pointsResponse, badgesResponse] = await Promise.all([
                    getUserPoints(),
                    getUserBadges()
                ]);
                
                if (pointsResponse.points) {
                    setPointsData(pointsResponse.points);
                } else {
                    setPointsData({
                        currentPoints: 1250,
                        totalEarned: 1800,
                        level: 3,
                        levelTitle: '점심 탐험가',
                        nextLevelPoints: 2000,
                        progressPercentage: 62
                    });
                }
                
                if (badgesResponse.badges) {
                    setBadgesData(badgesResponse.badges);
                } else {
                    setBadgesData([
                        {
                            id: 1,
                            name: '첫 발걸음',
                            description: '첫 번째 식당을 방문했습니다',
                            icon: 'restaurant',
                            color: currentColors.success,
                            earned: true,
                            earnedDate: '2024-01-10'
                        },
                        {
                            id: 2,
                            name: '이야기꾼',
                            description: '10개의 리뷰를 작성했습니다',
                            icon: 'create',
                            color: currentColors.primary,
                            earned: true,
                            earnedDate: '2024-01-15'
                        },
                        {
                            id: 3,
                            name: '사교적',
                            description: '5개의 파티에 참여했습니다',
                            icon: 'people',
                            color: currentColors.warning,
                            earned: true,
                            earnedDate: '2024-01-12'
                        },
                        {
                            id: 4,
                            name: '운명의 만남',
                            description: '20번의 랜덤런치에 참여했습니다',
                            icon: 'shuffle',
                            color: currentColors.deepBlue,
                            earned: false,
                            progress: 15
                        },
                        {
                            id: 5,
                            name: '맛집 헌터',
                            description: '50개의 다른 식당을 방문했습니다',
                            icon: 'map',
                            color: currentColors.yellow,
                            earned: false,
                            progress: 35
                        }
                    ]);
                }
            } catch (error) {
                console.error('API 호출 실패, 기본 데이터 사용:', error);
                setPointsData({
                    currentPoints: 1250,
                    totalEarned: 1800,
                    level: 3,
                    levelTitle: '점심 탐험가',
                    nextLevelPoints: 2000,
                    progressPercentage: 62
                });
                setBadgesData([
                    {
                        id: 1,
                        name: '첫 방문',
                        description: '첫 번째 식당을 방문했습니다',
                        icon: 'restaurant',
                        color: currentColors.success,
                        earned: true,
                        earnedDate: '2024-01-10'
                    },
                    {
                        id: 2,
                        name: '리뷰 마스터',
                        description: '10개의 리뷰를 작성했습니다',
                        icon: 'create',
                        color: currentColors.primary,
                        earned: true,
                        earnedDate: '2024-01-15'
                    },
                    {
                        id: 3,
                        name: '파티 애호가',
                        description: '5개의 파티에 참여했습니다',
                        icon: 'people',
                        color: currentColors.warning,
                        earned: true,
                        earnedDate: '2024-01-12'
                    },
                    {
                        id: 4,
                        name: '랜덤런치 전문가',
                        description: '20번의 랜덤런치에 참여했습니다',
                        icon: 'shuffle',
                        color: currentColors.deepBlue,
                        earned: false,
                        progress: 15
                    },
                    {
                        id: 5,
                        name: '맛집 탐험가',
                        description: '50개의 다른 식당을 방문했습니다',
                        icon: 'map',
                        color: currentColors.yellow,
                        earned: false,
                        progress: 35
                    }
                ]);
            }
        } catch (error) {
            console.error('포인트 및 배지 데이터 로드 실패:', error);
            setError(error.message);
            
            // 에러 시 기본 데이터 사용
            setPointsData({
                currentPoints: 1250,
                totalEarned: 1800,
                level: 3,
                levelTitle: '점심 탐험가',
                nextLevelPoints: 2000,
                progressPercentage: 62
            });
            setBadgesData([
                {
                    id: 1,
                    name: '첫 발걸음',
                    description: '첫 번째 식당을 방문했습니다',
                    icon: 'restaurant',
                    color: currentColors.success,
                    earned: true,
                    earnedDate: '2024-01-10'
                },
                {
                    id: 2,
                    name: '이야기꾼',
                    description: '10개의 리뷰를 작성했습니다',
                    icon: 'create',
                    color: currentColors.primary,
                    earned: true,
                    earnedDate: '2024-01-15'
                },
                {
                    id: 3,
                    name: '사교적',
                    description: '5개의 파티에 참여했습니다',
                    icon: 'people',
                    color: currentColors.warning,
                    earned: true,
                    earnedDate: '2024-01-12'
                },
                {
                    id: 4,
                    name: '운명의 만남',
                    description: '20번의 랜덤런치에 참여했습니다',
                    icon: 'shuffle',
                    color: currentColors.deepBlue,
                    earned: false,
                    progress: 15
                    },
                {
                    id: 5,
                    name: '맛집 헌터',
                    description: '50개의 다른 식당을 방문했습니다',
                    icon: 'map',
                    color: currentColors.yellow,
                    earned: false,
                    progress: 35
                }
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const getLevelProgress = () => {
        if (!pointsData) return 0;
        if (pointsData.progressPercentage !== undefined) {
            return pointsData.progressPercentage;
        }
        const current = pointsData.currentPoints;
        const next = pointsData.nextLevelPoints;
        if (!next || next <= 0) return 100;
        return Math.min((current / next) * 100, 100);
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

    if (error) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background }]}>
                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle-outline" size={64} color={currentColors.error} />
                    <Text style={[styles.errorText, { color: currentColors.textSecondary }]}>{error}</Text>
                    <TouchableOpacity 
                        style={[styles.retryButton, { backgroundColor: currentColors.primary }]}
                        onPress={loadPointsAndBadges}
                    >
                        <Text style={styles.retryButtonText}>다시 시도</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background }]}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

                {/* 포인트 카드 */}
                <View style={[styles.pointsCard, { backgroundColor: currentColors.surface }]}>
                    <View style={styles.pointsHeader}>
                        <Text style={[styles.pointsTitle, { color: currentColors.text }]}>현재 포인트</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('PointsHistory')}>
                            <Text style={[styles.historyLink, { color: currentColors.primary }]}>히스토리</Text>
                        </TouchableOpacity>
                    </View>
                    
                    <Text style={[styles.pointsValue, { color: currentColors.primary }]}>{pointsData?.currentPoints}P</Text>
                    
                    <View style={styles.pointsStats}>
                        <View style={styles.statItem}>
                            <Text style={[styles.statLabel, { color: currentColors.textSecondary }]}>총 획득</Text>
                            <Text style={[styles.statValue, { color: currentColors.success }]}>{pointsData?.totalEarned}P</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={[styles.statLabel, { color: currentColors.textSecondary }]}>현재 레벨</Text>
                            <Text style={[styles.statValue, { color: currentColors.primary }]}>{pointsData?.levelTitle || `레벨 ${pointsData?.level}`}</Text>
                        </View>
                    </View>
                </View>

                {/* 레벨 카드 */}
                <View style={[styles.levelCard, { backgroundColor: currentColors.surface }]}>
                    <View style={styles.levelHeader}>
                        <View style={styles.levelTitleRow}>
                            <Text style={[styles.levelTitle, { color: currentColors.text }]}>
                                {pointsData?.levelTitle || `레벨 ${pointsData?.level}`}
                            </Text>
                            <TouchableOpacity 
                                style={styles.levelDetailButton}
                                onPress={() => navigation.navigate('LevelSystem')}
                            >
                                <Ionicons name="chevron-forward" size={16} color={currentColors.primary} />
                            </TouchableOpacity>
                        </View>
                        <Text style={[styles.levelSubtitle, { color: currentColors.textSecondary }]}>
                            다음 레벨까지 {pointsData?.nextLevelPoints}P 필요
                        </Text>
                    </View>
                    <View style={styles.levelProgressContainer}>
                        <View style={[styles.levelProgressBar, { backgroundColor: currentColors.lightGray }]}>
                            <View 
                                style={[
                                    styles.levelProgressFill, 
                                    { 
                                        backgroundColor: currentColors.primary,
                                        width: `${getLevelProgress()}%`
                                    }
                                ]} 
                            />
                        </View>
                        <Text style={[styles.levelProgressText, { color: currentColors.textSecondary }]}>
                            {getLevelProgress()}% 완료
                        </Text>
                    </View>
                </View>

                {/* 배지 섹션 */}
                <View style={styles.badgesSection}>
                    <View style={styles.badgesHeader}>
                        <Text style={[styles.badgesTitle, { color: currentColors.text }]}>배지 컬렉션</Text>
                        <TouchableOpacity 
                            style={styles.badgesDetailButton}
                            onPress={() => navigation.navigate('BadgeCollection')}
                        >
                            <Ionicons name="chevron-forward" size={16} color={currentColors.primary} />
                        </TouchableOpacity>
                    </View>
                    
                    <View style={styles.badgesGrid}>
                        {badgesData.slice(0, 6).map((badge) => (
                            <TouchableOpacity
                                key={badge.id}
                                style={[
                                    styles.badgeItem, 
                                    { 
                                        backgroundColor: currentColors.surface,
                                        opacity: badge.earned ? 1 : 0.6
                                    }
                                ]}
                                onPress={() => navigation.navigate('BadgeCollection')}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.badgeIcon, { backgroundColor: badge.color + '15' }]}>
                                    <Ionicons name={badge.icon} size={32} color={badge.color} />
                                </View>
                                <Text style={[styles.badgeName, { color: currentColors.text }]}>
                                    {badge.name}
                                </Text>
                                <Text style={[styles.badgeDescription, { color: currentColors.textSecondary }]}>
                                    {badge.description}
                                </Text>
                                
                                {badge.earned ? (
                                    <View style={[styles.earnedBadge, { backgroundColor: badge.color }]}>
                                        <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                                    </View>
                                ) : (
                                    <View style={styles.progressContainer}>
                                        <View style={[styles.progressBar, { backgroundColor: currentColors.lightGray }]}>
                                            <View 
                                                style={[
                                                    styles.progressFill, 
                                                    { 
                                                        backgroundColor: badge.color,
                                                        width: `${badge.progress}%`
                                                    }
                                                ]} 
                                            />
                                        </View>
                                        <Text style={[styles.progressText, { color: currentColors.textSecondary }]}>
                                            {badge.progress}%
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                    
                    {badgesData.length > 6 && (
                        <TouchableOpacity 
                            style={styles.viewAllButton}
                            onPress={() => navigation.navigate('BadgeCollection')}
                        >
                            <Text style={[styles.viewAllText, { color: currentColors.primary }]}>
                                전체 {badgesData.length}개 배지 보기
                            </Text>
                            <Ionicons name="chevron-forward" size={16} color={currentColors.primary} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* 새로운 기능 섹션 */}
                <View style={styles.newFeaturesSection}>
                    <Text style={[styles.sectionTitle, { color: currentColors.text }]}>
                        새로운 기능
                    </Text>
                    
                    <View style={styles.featureGrid}>
                        <TouchableOpacity 
                            style={[styles.featureItem, { backgroundColor: currentColors.surface }]}
                            onPress={() => navigation.navigate('FriendInvite')}
                        >
                            <View style={[styles.featureIcon, { backgroundColor: currentColors.success + '15' }]}>
                                <Ionicons name="people" size={32} color={currentColors.success} />
                            </View>
                            <Text style={[styles.featureTitle, { color: currentColors.text }]}>친구 초대</Text>
                            <Text style={[styles.featureDescription, { color: currentColors.textSecondary }]}>
                                친구 초대로 포인트 획득
                            </Text>
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
    scrollView: {
        flex: 1,
        paddingHorizontal: 16,
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
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    errorText: {
        fontSize: 16,
        textAlign: 'center',
        marginTop: 16,
        marginBottom: 24,
    },
    retryButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },

    pointsCard: {
        borderRadius: 12,
        padding: 20,
        marginTop: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    pointsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    pointsTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    historyLink: {
        fontSize: 14,
        fontWeight: '500',
    },
    pointsValue: {
        fontSize: 36,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    pointsStats: {
        flexDirection: 'row',
        gap: 20,
    },
    statItem: {
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 12,
        marginBottom: 4,
    },
    statValue: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    levelCard: {
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    levelHeader: {
        marginBottom: 12,
    },
    levelTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    levelDetailButton: {
        padding: 4,
    },
    levelTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    levelSubtitle: {
        fontSize: 12,
        color: '#666',
    },
    levelProgressContainer: {
        gap: 8,
    },
    levelProgressBar: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
    },
    levelProgressFill: {
        height: '100%',
        borderRadius: 4,
    },
    levelProgressText: {
        fontSize: 12,
        textAlign: 'center',
    },
    badgesSection: {
        marginBottom: 20,
    },
    badgesHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    badgesTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    badgesDetailButton: {
        padding: 4,
    },
    badgesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    badgeItem: {
        width: '48%',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    badgeIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    badgeName: {
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 4,
    },
    badgeDescription: {
        fontSize: 10,
        textAlign: 'center',
        marginBottom: 8,
    },
    earnedBadge: {
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    progressContainer: {
        width: '100%',
        gap: 4,
    },
    progressBar: {
        height: 4,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 2,
    },
    progressText: {
        fontSize: 10,
        textAlign: 'center',
    },
    viewAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        marginTop: 16,
        gap: 8,
    },
    viewAllText: {
        fontSize: 14,
        fontWeight: '600',
    },
    newFeaturesSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    featureGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    featureItem: {
        flex: 1,
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    featureIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    featureTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 4,
    },
    featureDescription: {
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 16,
    },
});

export default PointsBadgesSection;