import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    ScrollView, 
    SafeAreaView, 
    ActivityIndicator,
    StyleSheet,
    TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

const PointsStatus = ({ navigation }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [pointsData, setPointsData] = useState(null);

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

    useFocusEffect(
        React.useCallback(() => {
            loadPointsData();
        }, [])
    );

    const loadPointsData = async () => {
        try {
            setIsLoading(true);
            
            // 목업 데이터 사용
            setPointsData({
                totalPoints: 1250,
                currentLevel: 3,
                nextLevelPoints: 750,
                progressPercentage: 65,
                levelBenefits: [
                    { level: 1, benefit: '기본 기능 사용 가능' },
                    { level: 2, benefit: '리뷰 작성 시 +5P 보너스' },
                    { level: 3, benefit: '파티 생성 시 +10P 보너스' },
                    { level: 4, benefit: '특별 배지 획득 가능' },
                    { level: 5, benefit: 'VIP 기능 사용 가능' }
                ]
            });

        } catch (error) {
            console.error('포인트 데이터 로드 실패:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                    <Text style={styles.loadingText}>로딩 중...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background }]}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* 포인트 요약 카드 */}
                <View style={[styles.summaryCard, { backgroundColor: currentColors.surface, shadowColor: currentColors.primary }]}>
                    <View style={styles.summaryContent}>
                        <Ionicons name="diamond" size={32} color={currentColors.primary} />
                        <Text style={[styles.summaryTitle, { color: currentColors.text }]}>현재 포인트</Text>
                        <Text style={[styles.pointsText, { color: currentColors.primary }]}>{pointsData.totalPoints}P</Text>
                        <Text style={[styles.levelText, { color: currentColors.textSecondary }]}>레벨 {pointsData.currentLevel}</Text>
                        <View style={[styles.progressBar, { backgroundColor: currentColors.lightGray }]}>
                            <View style={[styles.progressFill, { width: `${pointsData.progressPercentage}%`, backgroundColor: currentColors.primary }]} />
                        </View>
                        <Text style={[styles.progressText, { color: currentColors.textSecondary }]}>
                            다음 레벨까지 {pointsData.nextLevelPoints}P 남음
                        </Text>
                    </View>
                </View>

                {/* 레벨 혜택 카드 */}
                <View style={[styles.benefitsCard, { backgroundColor: currentColors.surface, shadowColor: currentColors.primary }]}>
                    <Text style={[styles.benefitsTitle, { color: currentColors.text }]}>레벨별 혜택</Text>
                    {pointsData.levelBenefits.map((benefit, index) => (
                        <View key={index} style={styles.benefitItem}>
                            <View style={[
                                styles.levelBadge, 
                                { 
                                    backgroundColor: index < pointsData.currentLevel ? currentColors.success : currentColors.lightGray 
                                }
                            ]}>
                                <Text style={[
                                    styles.levelBadgeText, 
                                    { color: index < pointsData.currentLevel ? '#FFFFFF' : currentColors.textSecondary }
                                ]}>
                                    Lv.{benefit.level}
                                </Text>
                            </View>
                            <Text style={[styles.benefitText, { color: currentColors.text }]}>
                                {benefit.benefit}
                            </Text>
                        </View>
                    ))}
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
        color: '#64748B',
    },
    summaryCard: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        elevation: 3,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.1)'
    },
    summaryContent: {
        alignItems: 'center',
    },
    summaryTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 12,
        marginBottom: 8,
    },
    pointsText: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    levelText: {
        fontSize: 14,
        marginBottom: 12,
    },
    progressBar: {
        width: '100%',
        height: 8,
        borderRadius: 4,
        marginBottom: 8,
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 12,
    },
    benefitsCard: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        elevation: 3,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.1)'
    },
    benefitsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    benefitItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    levelBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginRight: 12,
    },
    levelBadgeText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    benefitText: {
        fontSize: 14,
        flex: 1,
    },
});

export default PointsStatus;