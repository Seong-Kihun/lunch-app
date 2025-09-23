import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    TouchableOpacity, 
    ScrollView, 
    SafeAreaView,
    StyleSheet,
    Dimensions,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../../contexts/UserContext';
import { usePoints } from '../../contexts/PointsContext';
import { COLORS } from '../../theme/colors';

const { width } = Dimensions.get('window');

const MyPageMain = ({ navigation }) => {
    const { user, isLoading: userLoading } = useUser();
    const { points } = usePoints();
    const currentColors = global.currentColors || COLORS.light;

    const menuItems = [
        {
            id: 'dashboard',
            title: '대시보드',
            subtitle: '나의 활동 현황을 한눈에 확인해보세요',
            icon: 'grid',
            color: currentColors.primary,
            screen: 'UserDashboard',
            gradient: ['#3B82F6', '#1D4ED8']
        },
        {
            id: 'activity-stats',
            title: '활동 통계',
            subtitle: '나의 활동 내역을 확인해보세요',
            icon: 'analytics',
            color: currentColors.primary,
            screen: 'ActivityStatsSection',
            gradient: ['#3B82F6', '#1D4ED8']
        },
        {
            id: 'appointment-history',
            title: '약속 히스토리',
            subtitle: '지난 약속들을 확인해보세요',
            icon: 'calendar',
            color: currentColors.secondary,
            screen: 'AppointmentHistorySection',
            gradient: ['#10B981', '#059669']
        },
        {
            id: 'points-badges',
            title: '포인트 & 배지',
            subtitle: '포인트와 배지를 확인해보세요',
            icon: 'trophy',
            color: currentColors.yellow,
            screen: 'PointsBadgesSection',
            gradient: ['#F59E0B', '#D97706']
        },
        {
            id: 'level-system',
            title: '레벨 시스템',
            subtitle: '레벨업하고 성취를 달성해보세요',
            icon: 'trending-up',
            color: currentColors.accent,
            screen: 'LevelSystemScreen',
            gradient: ['#8B5CF6', '#7C3AED']
        },
        {
            id: 'profile',
            title: '프로필 설정',
            subtitle: '개인정보를 관리해보세요',
            icon: 'person',
            color: currentColors.accent,
            screen: 'UserProfile',
            gradient: ['#8B5CF6', '#7C3AED']
        }
    ];

    const quickActions = [
        {
            id: 'create-party',
            title: '파티 만들기',
            icon: 'add-circle',
            color: currentColors.primary,
            onPress: () => navigation.navigate('파티', { screen: 'CreateParty' })
        },
        {
            id: 'random-lunch',
            title: '랜덤런치',
            icon: 'shuffle',
            color: currentColors.secondary,
            onPress: () => navigation.navigate('파티', { screen: 'RandomLunch' })
        },
        {
            id: 'restaurant-search',
            title: '맛집 찾기',
            icon: 'restaurant',
            color: currentColors.accent,
            onPress: () => navigation.navigate('맛집')
        }
    ];

    const handleMenuPress = (screen) => {
        // LevelSystemScreen은 FriendStack에 있으므로 특별 처리
        if (screen === 'LevelSystemScreen') {
            navigation.navigate('친구', { screen: 'LevelSystemScreen' });
        } else {
            navigation.navigate(screen);
        }
    };

    if (userLoading) {
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

                {/* 사용자 프로필 카드 */}
                <TouchableOpacity 
                    style={[styles.profileCard, { 
                        backgroundColor: currentColors.surface,
                        shadowColor: currentColors.primary,
                        borderColor: 'rgba(59, 130, 246, 0.1)'
                    }]}
                    onPress={() => navigation.navigate('UserProfile', { 
                        friend: { employee_id: global.myEmployeeId },
                        isMyProfile: true 
                    })}
                    activeOpacity={0.8}
                >
                    <View style={styles.profileContent}>
                        <View style={[styles.avatarContainer, { backgroundColor: currentColors.primary + '15' }]}>
                            <Ionicons name="person" size={32} color={currentColors.primary} />
                        </View>
                        <View style={styles.profileInfo}>
                            <Text style={[styles.profileName, { color: currentColors.text }]}>
                                {user?.nickname || user?.name || '사용자'}
                            </Text>
                            <Text style={[styles.profileSubtitle, { color: currentColors.textSecondary }]}>
                                {user?.employee_id || user?.id || 'ID 없음'}
                            </Text>
                            <View style={styles.profileStats}>
                                <View style={styles.statItem}>
                                    <Text style={[styles.statValue, { color: currentColors.primary }]}>{points || 0}</Text>
                                    <Text style={[styles.statLabel, { color: currentColors.textSecondary }]}>포인트</Text>
                                </View>
                                <View style={styles.statDivider} />
                                <View style={styles.statItem}>
                                    <Text style={[styles.statValue, { color: currentColors.secondary }]}>Lv.1</Text>
                                    <Text style={[styles.statLabel, { color: currentColors.textSecondary }]}>레벨</Text>
                                </View>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={currentColors.gray} />
                    </View>
                </TouchableOpacity>

                {/* 빠른 액션 섹션 */}
                <View style={styles.quickActionsSection}>
                    <Text style={[styles.sectionTitle, { color: currentColors.text }]}>빠른 액션</Text>
                    <View style={styles.quickActionsGrid}>
                        {quickActions.map((action) => (
                            <TouchableOpacity
                                key={action.id}
                                style={[styles.quickActionCard, { backgroundColor: currentColors.surface }]}
                                onPress={action.onPress}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.quickActionIcon, { backgroundColor: action.color + '15' }]}>
                                    <Ionicons name={action.icon} size={24} color={action.color} />
                                </View>
                                <Text style={[styles.quickActionTitle, { color: currentColors.text }]}>
                                    {action.title}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* 메뉴 섹션 */}
                <View style={styles.menuSection}>
                    <Text style={[styles.sectionTitle, { color: currentColors.text }]}>서비스</Text>
                    
                    {menuItems.map((item) => (
                        <TouchableOpacity
                            key={item.id}
                            style={[styles.menuItem, { 
                                backgroundColor: currentColors.surface,
                                shadowColor: currentColors.primary,
                                borderColor: 'rgba(59, 130, 246, 0.1)'
                            }]}
                            onPress={() => handleMenuPress(item.screen)}
                            activeOpacity={0.8}
                        >
                            <View style={styles.menuItemContent}>
                                <View style={[styles.iconContainer, { backgroundColor: item.color + '15' }]}>
                                    <Ionicons name={item.icon} size={24} color={item.color} />
                                </View>
                                <View style={styles.menuItemInfo}>
                                    <Text style={[styles.menuItemTitle, { color: currentColors.text }]}>
                                        {item.title}
                                    </Text>
                                    <Text style={[styles.menuItemSubtitle, { color: currentColors.textSecondary }]}>
                                        {item.subtitle}
                                    </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color={currentColors.gray} />
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* 추가 정보 섹션 */}
                <View style={styles.infoSection}>
                    <Text style={[styles.sectionTitle, { color: currentColors.text }]}>정보</Text>
                    
                    <TouchableOpacity
                        style={[styles.menuItem, { 
                            backgroundColor: currentColors.surface,
                            shadowColor: currentColors.primary,
                            borderColor: 'rgba(59, 130, 246, 0.1)'
                        }]}
                        onPress={() => navigation.navigate('AppInfoSection')}
                        activeOpacity={0.8}
                    >
                        <View style={styles.menuItemContent}>
                            <View style={[styles.iconContainer, { backgroundColor: currentColors.gray + '15' }]}>
                                <Ionicons name="information-circle" size={24} color={currentColors.gray} />
                            </View>
                            <View style={styles.menuItemInfo}>
                                <Text style={[styles.menuItemTitle, { color: currentColors.text }]}>
                                    앱 정보
                                </Text>
                                <Text style={[styles.menuItemSubtitle, { color: currentColors.textSecondary }]}>
                                    버전 및 라이선스 정보
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={currentColors.gray} />
                        </View>
                    </TouchableOpacity>
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
    profileCard: {
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
    },
    profileContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 4,
        letterSpacing: 0.3,
    },
    profileSubtitle: {
        fontSize: 14,
        marginBottom: 12,
    },
    profileStats: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 12,
    },
    statDivider: {
        width: 1,
        height: 20,
        backgroundColor: '#E2E8F0',
        marginHorizontal: 16,
    },
    quickActionsSection: {
        marginBottom: 24,
    },
    quickActionsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    quickActionCard: {
        flex: 1,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        elevation: 2,
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.1)',
    },
    quickActionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    quickActionTitle: {
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
    },
    menuSection: {
        marginBottom: 24,
    },
    infoSection: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        letterSpacing: 0.3,
    },
    menuItem: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 12,
        elevation: 3,
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        borderWidth: 1,
    },
    menuItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    menuItemInfo: {
        flex: 1,
    },
    menuItemTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
        letterSpacing: 0.2,
    },
    menuItemSubtitle: {
        fontSize: 13,
        lineHeight: 18,
    },
});

export default MyPageMain;