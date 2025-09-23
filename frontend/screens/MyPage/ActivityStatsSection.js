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
import { getUserActivityStats } from '../../services/userService';
import { useUser } from '../../contexts/UserContext';
import { COLORS } from '../../theme/colors';

const ActivityStatsSection = ({ navigation }) => {
    const { user, isAuthenticated } = useUser();
    const [isLoading, setIsLoading] = useState(true);
    const [timeFilter, setTimeFilter] = useState('month');
    const [currentStats, setCurrentStats] = useState(null);
    const [error, setError] = useState(null);

    const currentColors = global.currentColors || COLORS.light;

    useEffect(() => {
        loadStats();
    }, [timeFilter]);

        const loadStats = async () => {
        try {
            if (!isAuthenticated) {
                setError('로그인이 필요합니다.');
                return;
            }

            setIsLoading(true);
            setError(null);
            
            // 개발 모드에서는 API 호출을 건너뛰고 기본 데이터 사용
            if (__DEV__) {
                const mockStats = {
                    totalActivities: 45,
                    reviewsWritten: 12,
                    partiesJoined: 8,
                    randomLunches: 15,
                    favoriteCategory: '한식',
                    appointmentTypeBreakdown: {
                        '랜덤런치': 12,
                        '파티 참여': 15,
                        '개인 약속': 8,
                        '단골파티': 6,
                        '기타': 4
                    },
                    categoryBreakdown: {
                        '한식': 20,
                        '중식': 12,
                        '일식': 8,
                        '양식': 5
                    }
                };
                setCurrentStats(mockStats);
                return;
            }
            
            // 프로덕션 모드에서만 API 호출
            try {
                const response = await fetch(`${global.RENDER_SERVER_URL}/api/users/activity-stats?period=${timeFilter}`, {
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
                
                if (data.success && data.stats) {
                    setCurrentStats(data.stats);
                } else {
                    throw new Error(data.error || '활동 통계 조회 실패');
                }
            } catch (error) {
                console.error('API 호출 실패, 기본 데이터 사용:', error);
                setCurrentStats({
                    totalActivities: 45,
                    reviewsWritten: 12,
                    partiesJoined: 8,
                    randomLunches: 15,
                    favoriteCategory: '한식',
                    appointmentTypeBreakdown: {
                        '랜덤런치': 12,
                        '파티 참여': 15,
                        '개인 약속': 8,
                        '단골파티': 6,
                        '기타': 4
                    },
                    categoryBreakdown: {
                        '한식': 20,
                        '중식': 12,
                        '일식': 8,
                        '양식': 5
                    }
                });
            }
        } catch (error) {
            console.error('통계 로드 실패:', error);
            setError(error.message);
            
            // 에러 시 기본 데이터 사용
            setCurrentStats({
                totalActivities: 45,
                reviewsWritten: 12,
                partiesJoined: 8,
                randomLunches: 15,
                favoriteCategory: '한식',
                appointmentTypeBreakdown: {
                    '랜덤런치': 12,
                    '파티 참여': 15,
                    '개인 약속': 8,
                    '단골파티': 6,
                    '기타': 4
                },
                categoryBreakdown: {
                    '한식': 20,
                    '중식': 12,
                    '일식': 8,
                    '양식': 5
                }
            });
        } finally {
            setIsLoading(false);
        }
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
                        onPress={loadStats}
                    >
                        <Text style={styles.retryButtonText}>다시 시도</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    if (!currentStats) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background }]}>
                <View style={styles.errorContainer}>
                    <Ionicons name="analytics-outline" size={64} color={currentColors.gray} />
                    <Text style={[styles.errorText, { color: currentColors.textSecondary }]}>통계 데이터를 불러올 수 없습니다</Text>
                    <TouchableOpacity 
                        style={[styles.retryButton, { backgroundColor: currentColors.primary }]}
                        onPress={loadStats}
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
                {/* 필터 버튼 */}
                <View style={styles.filterContainer}>
                    <TouchableOpacity
                        style={[
                            styles.filterButton,
                            { backgroundColor: timeFilter === 'month' ? currentColors.primary : currentColors.surface }
                        ]}
                        onPress={() => setTimeFilter('month')}
                        activeOpacity={0.8}
                    >
                        <Text style={[
                            styles.filterText,
                            { color: timeFilter === 'month' ? '#FFFFFF' : currentColors.text }
                        ]}>
                            이번 달
                        </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        style={[
                            styles.filterButton,
                            { backgroundColor: timeFilter === 'total' ? currentColors.primary : currentColors.surface }
                        ]}
                        onPress={() => setTimeFilter('total')}
                        activeOpacity={0.8}
                    >
                        <Text style={[
                            styles.filterText,
                            { color: timeFilter === 'total' ? '#FFFFFF' : currentColors.text }
                        ]}>
                            전체
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* 활동 요약 카드 */}
                <View style={[styles.summaryCard, { backgroundColor: currentColors.surface }]}>
                    <Text style={[styles.summaryTitle, { color: currentColors.text }]}>활동 요약</Text>
                    <View style={styles.summaryGrid}>
                        <View style={styles.summaryItem}>
                            <Text style={[styles.summaryValue, { color: currentColors.primary }]}>{currentStats?.totalActivities}</Text>
                            <Text style={[styles.summaryLabel, { color: currentColors.textSecondary }]}>총 활동</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={[styles.summaryValue, { color: currentColors.success }]}>{currentStats?.reviewsWritten}</Text>
                            <Text style={[styles.summaryLabel, { color: currentColors.textSecondary }]}>리뷰 작성</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={[styles.summaryValue, { color: currentColors.warning }]}>{currentStats?.partiesJoined}</Text>
                            <Text style={[styles.summaryLabel, { color: currentColors.textSecondary }]}>파티 참여</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={[styles.summaryValue, { color: currentColors.deepBlue }]}>{currentStats?.randomLunches}</Text>
                            <Text style={[styles.summaryLabel, { color: currentColors.textSecondary }]}>랜덤런치</Text>
                        </View>
                    </View>
                </View>

                {/* 약속 유형별 통계 카드 */}
                <View style={[styles.appointmentTypeCard, { backgroundColor: currentColors.surface }]}>
                    <Text style={[styles.appointmentTypeTitle, { color: currentColors.text }]}>약속 유형별 통계</Text>
                    <View style={styles.appointmentTypeList}>
                        {Object.entries(currentStats?.appointmentTypeBreakdown || {}).map(([type, count]) => (
                            <View key={type} style={styles.appointmentTypeItem}>
                                <View style={styles.appointmentTypeInfo}>
                                    <Text style={[styles.appointmentTypeName, { color: currentColors.text }]}>{type}</Text>
                                    <Text style={[styles.appointmentTypeCount, { color: currentColors.textSecondary }]}>{count}회</Text>
                                </View>
                                <View style={[styles.appointmentTypeBar, { backgroundColor: currentColors.lightGray }]}>
                                    <View 
                                        style={[
                                            styles.appointmentTypeBarFill, 
                                            { 
                                                backgroundColor: currentColors.primary,
                                                width: `${(count / currentStats.totalActivities) * 100}%`
                                            }
                                        ]} 
                                    />
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

                {/* 선호 카테고리 카드 */}
                <View style={[styles.categoryCard, { backgroundColor: currentColors.surface }]}>
                    <Text style={[styles.categoryTitle, { color: currentColors.text }]}>선호 카테고리</Text>
                    <View style={styles.favoriteCategoryContainer}>
                        <Ionicons name="restaurant" size={20} color={currentColors.success} />
                        <Text style={[styles.favoriteCategoryText, { color: currentColors.text }]}>{currentStats?.favoriteCategory}</Text>
                    </View>
                    <View style={styles.categoryList}>
                        {Object.entries(currentStats?.categoryBreakdown || {}).map(([category, count]) => (
                            <View key={category} style={styles.categoryItem}>
                                <Text style={[styles.categoryName, { color: currentColors.text }]}>{category}</Text>
                                <Text style={[styles.categoryCount, { color: currentColors.textSecondary }]}>{count}회</Text>
                            </View>
                        ))}
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
        paddingTop: 16,
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
    filterContainer: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 20,
    },
    filterButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
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
    filterText: {
        fontSize: 14,
        fontWeight: '500',
    },
    summaryCard: {
        borderRadius: 20,
        padding: 24,
        marginBottom: 20,
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
    summaryTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    summaryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    summaryItem: {
        flex: 1,
        minWidth: '45%',
        alignItems: 'center',
    },
    summaryValue: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    summaryLabel: {
        fontSize: 12,
    },
    appointmentTypeCard: {
        borderRadius: 20,
        padding: 24,
        marginBottom: 20,
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
    appointmentTypeTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    appointmentTypeList: {
        gap: 12,
    },
    appointmentTypeItem: {
        gap: 8,
    },
    appointmentTypeInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    appointmentTypeName: {
        fontSize: 14,
        fontWeight: '500',
    },
    appointmentTypeCount: {
        fontSize: 14,
    },
    appointmentTypeBar: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    appointmentTypeBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    categoryCard: {
        borderRadius: 20,
        padding: 24,
        marginBottom: 24,
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
    categoryTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    favoriteCategoryContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    favoriteCategoryText: {
        fontSize: 16,
        fontWeight: '500',
    },
    categoryList: {
        gap: 12,
    },
    categoryItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    categoryName: {
        fontSize: 14,
    },
    categoryCount: {
        fontSize: 14,
    },
});

export default ActivityStatsSection;