import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    ScrollView, 
    SafeAreaView, 
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../../contexts/UserContext';
import newPointsManager from '../../utils/newPointsManager';

const LevelSystemScreen = ({ navigation }) => {
    const { user, isAuthenticated } = useUser();
    const [isLoading, setIsLoading] = useState(true);
    const [levelData, setLevelData] = useState(null);
    const [error, setError] = useState(null);

    const currentColors = {
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

    // 새로운 레벨 시스템 정의
    const levelSystem = [
        { level: 1, title: "점심 루키", minPoints: 0, maxPoints: 4999, color: "#10B981" },
        { level: 2, title: "점심 애호가", minPoints: 5000, maxPoints: 14999, color: "#3B82F6" },
        { level: 3, title: "점심 탐험가", minPoints: 15000, maxPoints: 29999, color: "#8B5CF6" },
        { level: 4, title: "점심 전문가", minPoints: 30000, maxPoints: 49999, color: "#F59E0B" },
        { level: 5, title: "점심 마스터", minPoints: 50000, maxPoints: 79999, color: "#EF4444" },
        { level: 6, title: "점심 전설", minPoints: 80000, maxPoints: 119999, color: "#EC4899" },
        { level: 7, title: "점심 신화", minPoints: 120000, maxPoints: 199999, color: "#06B6D4" },
        { level: 8, title: "점심 제왕", minPoints: 200000, maxPoints: 299999, color: "#84CC16" },
        { level: 9, title: "점심 황제", minPoints: 300000, maxPoints: 399999, color: "#F97316" },
        { level: 10, title: "점심 성자", minPoints: 400000, maxPoints: 499999, color: "#A855F7" },
        { level: 11, title: "점심 신", minPoints: 500000, maxPoints: 599999, color: "#14B8A6" },
        { level: 12, title: "점심 창조주", minPoints: 600000, maxPoints: 699999, color: "#F43F5E" },
        { level: 13, title: "점심 우주", minPoints: 700000, maxPoints: 799999, color: "#0EA5E9" },
        { level: 14, title: "점심 차원", minPoints: 800000, maxPoints: 899999, color: "#22C55E" },
        { level: 15, title: "점심 절대자", minPoints: 900000, maxPoints: 999999, color: "#EAB308" },
        { level: 16, title: "점심 우주", minPoints: 1000000, maxPoints: 1099999, color: "#06B6D4" },
        { level: 17, title: "점심 차원", minPoints: 1100000, maxPoints: 1199999, color: "#84CC16" },
        { level: 18, title: "점심 절대자", minPoints: 1200000, maxPoints: 1299999, color: "#F97316" },
        { level: 19, title: "점심 우주", minPoints: 1300000, maxPoints: 1399999, color: "#0EA5E9" },
        { level: 20, title: "점심 차원", minPoints: 1400000, maxPoints: 1499999, color: "#22C55E" },
        { level: 21, title: "점심 절대자", minPoints: 1500000, maxPoints: 1599999, color: "#EAB308" },
        { level: 22, title: "점심 우주", minPoints: 1600000, maxPoints: 1699999, color: "#06B6D4" },
        { level: 23, title: "점심 차원", minPoints: 1700000, maxPoints: 1799999, color: "#84CC16" },
        { level: 24, title: "점심 절대자", minPoints: 1800000, maxPoints: 1899999, color: "#F97316" },
        { level: 25, title: "점심 우주", minPoints: 1900000, maxPoints: 1999999, color: "#0EA5E9" },
        { level: 26, title: "점심 차원", minPoints: 2000000, maxPoints: 2099999, color: "#22C55E" },
        { level: 27, title: "점심 절대자", minPoints: 2100000, maxPoints: 2199999, color: "#EAB308" },
        { level: 28, title: "점심 우주", minPoints: 2200000, maxPoints: 2299999, color: "#06B6D4" },
        { level: 29, title: "점심 차원", minPoints: 2300000, maxPoints: 2399999, color: "#84CC16" },
        { level: 30, title: "점심 절대자", minPoints: 2400000, maxPoints: 2499999, color: "#F97316" }
    ];

    useEffect(() => {
        loadLevelData();
    }, []);

    const loadLevelData = async () => {
        try {
            if (!isAuthenticated) {
                setError('로그인이 필요합니다.');
                return;
            }

            setIsLoading(true);
            setError(null);
            
            try {
                const pointsStatus = await newPointsManager.getPointsStatus(user.employee_id);
                setLevelData(pointsStatus);
            } catch (apiError) {
                console.log('API 호출 실패, 기본 데이터 사용:', apiError);
                
                // API 실패 시 기본 데이터 사용
                setLevelData({
                    total_points: 12500,
                    current_level: 3,
                    level_title: '점심 탐험가',
                    next_level_points: 15000,
                    progress_percentage: 50
                });
            }
        } catch (error) {
            console.error('레벨 데이터 로드 실패:', error);
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const getCurrentLevelInfo = () => {
        if (!levelData) return null;
        return levelSystem.find(level => level.level === levelData.current_level);
    };

    const getNextLevelInfo = () => {
        if (!levelData) return null;
        const nextLevel = levelData.current_level + 1;
        return levelSystem.find(level => level.level === nextLevel);
    };

    const getLevelProgress = () => {
        if (!levelData) return 0;
        if (levelData.progress_percentage !== undefined) {
            return levelData.progress_percentage;
        }
        
        const currentLevel = getCurrentLevelInfo();
        const nextLevel = getNextLevelInfo();
        
        if (!currentLevel || !nextLevel) return 100;
        
        const currentPoints = levelData.total_points;
        const levelRange = nextLevel.minPoints - currentLevel.minPoints;
        const userProgress = currentPoints - currentLevel.minPoints;
        
        return Math.min((userProgress / levelRange) * 100, 100);
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
                        onPress={loadLevelData}
                    >
                        <Text style={styles.retryButtonText}>다시 시도</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const currentLevelInfo = getCurrentLevelInfo();
    const nextLevelInfo = getNextLevelInfo();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background }]}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                
                {/* 현재 레벨 카드 */}
                <View style={[styles.currentLevelCard, { backgroundColor: currentColors.surface }]}>
                    <View style={styles.currentLevelHeader}>
                        <Text style={[styles.currentLevelTitle, { color: currentColors.text }]}>
                            현재 레벨
                        </Text>
                        <View style={[styles.levelBadge, { backgroundColor: currentLevelInfo?.color + '15' }]}>
                            <Text style={[styles.levelNumber, { color: currentLevelInfo?.color }]}>
                                {levelData?.current_level}
                            </Text>
                        </View>
                    </View>
                    
                    <Text style={[styles.levelTitle, { color: currentLevelInfo?.color }]}>
                        {levelData?.level_title}
                    </Text>
                    
                    <Text style={[styles.levelDescription, { color: currentColors.textSecondary }]}>
                        {currentLevelInfo?.minPoints.toLocaleString()}P ~ {currentLevelInfo?.maxPoints.toLocaleString()}P
                    </Text>
                    
                    <View style={styles.progressContainer}>
                        <View style={[styles.progressBar, { backgroundColor: currentColors.lightGray }]}>
                            <View 
                                style={[
                                    styles.progressFill, 
                                    { 
                                        backgroundColor: currentLevelInfo?.color,
                                        width: `${getLevelProgress()}%`
                                    }
                                ]} 
                            />
                        </View>
                        <Text style={[styles.progressText, { color: currentColors.textSecondary }]}>
                            {getLevelProgress()}% 완료
                        </Text>
                    </View>
                    
                    {nextLevelInfo && (
                        <View style={styles.nextLevelInfo}>
                            <Text style={[styles.nextLevelText, { color: currentColors.textSecondary }]}>
                                다음 레벨까지 {levelData?.next_level_points?.toLocaleString()}P 필요
                            </Text>
                        </View>
                    )}
                </View>

                {/* 레벨 시스템 전체 보기 */}
                <View style={styles.levelSystemSection}>
                    <Text style={[styles.sectionTitle, { color: currentColors.text }]}>
                        레벨 시스템
                    </Text>
                    <Text style={[styles.sectionDescription, { color: currentColors.textSecondary }]}>
                        10레벨마다 새로운 칭호를 획득할 수 있습니다
                    </Text>
                    
                    <View style={styles.levelList}>
                        {levelSystem.map((level) => {
                            const isCurrentLevel = level.level === levelData?.current_level;
                            const isCompleted = levelData?.total_points >= level.minPoints;
                            const isNextLevel = level.level === (levelData?.current_level + 1);
                            
                            return (
                                <View 
                                    key={level.level}
                                    style={[
                                        styles.levelItem, 
                                        { 
                                            backgroundColor: currentColors.surface,
                                            borderColor: isCurrentLevel ? level.color : currentColors.border,
                                            borderWidth: isCurrentLevel ? 2 : 1
                                        }
                                    ]}
                                >
                                    <View style={styles.levelItemHeader}>
                                        <View style={[
                                            styles.levelItemBadge, 
                                            { 
                                                backgroundColor: isCurrentLevel 
                                                    ? level.color + '20' 
                                                    : isCompleted 
                                                        ? level.color + '15' 
                                                        : currentColors.lightGray + '50'
                                            }
                                        ]}>
                                            <Text style={[
                                                styles.levelItemNumber, 
                                                { 
                                                    color: isCurrentLevel 
                                                        ? level.color 
                                                        : isCompleted 
                                                            ? level.color 
                                                            : currentColors.textSecondary
                                                }
                                            ]}>
                                                {level.level}
                                            </Text>
                                        </View>
                                        
                                        <View style={styles.levelItemInfo}>
                                            <Text style={[
                                                styles.levelItemTitle, 
                                                { 
                                                    color: isCurrentLevel 
                                                        ? level.color 
                                                        : currentColors.text
                                                }
                                            ]}>
                                                {level.title}
                                            </Text>
                                            <Text style={[styles.levelItemRange, { color: currentColors.textSecondary }]}>
                                                {level.minPoints.toLocaleString()}P ~ {level.maxPoints.toLocaleString()}P
                                            </Text>
                                        </View>
                                    </View>
                                    
                                    {isCurrentLevel && (
                                        <View style={[styles.currentIndicator, { backgroundColor: level.color }]}>
                                            <Ionicons name="star" size={12} color="#FFFFFF" />
                                            <Text style={styles.currentIndicatorText}>현재 레벨</Text>
                                        </View>
                                    )}
                                    
                                    {isCompleted && !isCurrentLevel && (
                                        <View style={[styles.completedIndicator, { backgroundColor: currentColors.success }]}>
                                            <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                                        </View>
                                    )}
                                </View>
                            );
                        })}
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
        padding: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#666',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        marginTop: 16,
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20,
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
    currentLevelCard: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    currentLevelHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    currentLevelTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
    },
    levelBadge: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    levelNumber: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    levelTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    levelDescription: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 20,
    },
    progressContainer: {
        marginBottom: 16,
    },
    progressBar: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 12,
        textAlign: 'center',
        fontWeight: '600',
    },
    nextLevelInfo: {
        alignItems: 'center',
    },
    nextLevelText: {
        fontSize: 14,
        fontWeight: '600',
    },
    levelSystemSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    sectionDescription: {
        fontSize: 14,
        marginBottom: 20,
        lineHeight: 20,
    },
    levelList: {
        gap: 12,
    },
    levelItem: {
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.05,
        shadowRadius: 2.22,
        elevation: 2,
    },
    levelItemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    levelItemBadge: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    levelItemNumber: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    levelItemInfo: {
        flex: 1,
    },
    levelItemTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    levelItemRange: {
        fontSize: 12,
    },
    currentIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginTop: 12,
    },
    currentIndicatorText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    completedIndicator: {
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'flex-end',
        marginTop: -20,
    },
});

export default LevelSystemScreen;
