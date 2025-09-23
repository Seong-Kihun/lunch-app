import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    TouchableOpacity, 
    ScrollView, 
    SafeAreaView, 
    ActivityIndicator,
    StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const PointsHistory = ({ navigation }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [pointsHistory, setPointsHistory] = useState([]);
    const [totalPoints, setTotalPoints] = useState(0);

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

    useEffect(() => {
        loadPointsHistory();
    }, []);

    const loadPointsHistory = async () => {
        try {
            setIsLoading(true);
            // API 호출 시뮬레이션
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const mockHistory = [
                {
                    id: 1,
                    type: 'earned',
                    amount: 50,
                    description: '랜덤런치 참여',
                    date: '2024-01-15',
                    time: '12:30'
                },
                {
                    id: 2,
                    type: 'earned',
                    amount: 30,
                    description: '리뷰 작성',
                    date: '2024-01-14',
                    time: '18:45'
                },
                {
                    id: 3,
                    type: 'spent',
                    amount: -20,
                    description: '포인트 사용',
                    date: '2024-01-13',
                    time: '14:20'
                },
                {
                    id: 4,
                    type: 'earned',
                    amount: 40,
                    description: '파티 참여',
                    date: '2024-01-12',
                    time: '12:00'
                },
                {
                    id: 5,
                    type: 'earned',
                    amount: 25,
                    description: '첫 방문 리뷰',
                    date: '2024-01-11',
                    time: '19:15'
                }
            ];
            
            setPointsHistory(mockHistory);
            setTotalPoints(mockHistory.reduce((sum, item) => sum + item.amount, 0));
        } catch (error) {
            console.error('포인트 히스토리 로드 실패:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR', {
            month: 'short',
            day: 'numeric'
        });
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

                {/* 총 포인트 카드 */}
                <View style={[styles.totalPointsCard, { backgroundColor: currentColors.surface }]}>
                    <Text style={[styles.totalPointsLabel, { color: currentColors.textSecondary }]}>현재 포인트</Text>
                    <Text style={[styles.totalPointsValue, { color: currentColors.primary }]}>{totalPoints}P</Text>
                </View>

                {/* 포인트 히스토리 리스트 */}
                <View style={styles.historyContainer}>
                    <Text style={[styles.historyTitle, { color: currentColors.text }]}>포인트 내역</Text>
                    {pointsHistory.map((item, index) => (
                        <View key={item.id} style={[styles.historyItem, { backgroundColor: currentColors.surface }]}>
                            <View style={styles.historyContent}>
                                <View style={styles.historyInfo}>
                                    <Text style={[styles.historyDescription, { color: currentColors.text }]}>{item.description}</Text>
                                    <Text style={[styles.historyDate, { color: currentColors.textSecondary }]}>
                                        {formatDate(item.date)} {item.time}
                                    </Text>
                                </View>
                                <View style={styles.pointsContainer}>
                                    <Text style={[
                                        styles.pointsAmount, 
                                        { 
                                            color: item.type === 'earned' ? currentColors.success : currentColors.error 
                                        }
                                    ]}>
                                        {item.type === 'earned' ? '+' : ''}{item.amount}P
                                    </Text>
                                    <Ionicons 
                                        name={item.type === 'earned' ? 'add-circle' : 'remove-circle'} 
                                        size={20} 
                                        color={item.type === 'earned' ? currentColors.success : currentColors.error} 
                                    />
                                </View>
                            </View>
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
    },

    totalPointsCard: {
        borderRadius: 12,
        padding: 20,
        marginTop: 16,
        marginBottom: 20,
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
    totalPointsLabel: {
        fontSize: 14,
        marginBottom: 8,
    },
    totalPointsValue: {
        fontSize: 32,
        fontWeight: 'bold',
    },
    historyContainer: {
        marginBottom: 20,
    },
    historyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    historyItem: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    historyContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    historyInfo: {
        flex: 1,
    },
    historyDescription: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 4,
    },
    historyDate: {
        fontSize: 12,
    },
    pointsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    pointsAmount: {
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default PointsHistory;