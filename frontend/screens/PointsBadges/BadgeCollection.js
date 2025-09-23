import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    TouchableOpacity, 
    ScrollView, 
    SafeAreaView, 
    ActivityIndicator,
    StyleSheet,
    FlatList 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import newPointsManager from '../../utils/newPointsManager';
import { useUser } from '../../contexts/UserContext';

const BadgeCollection = ({ navigation }) => {
    const { user, isAuthenticated } = useUser();
    const [badgesData, setBadgesData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedBadge, setSelectedBadge] = useState(null);
    const [error, setError] = useState(null);

    useFocusEffect(
        React.useCallback(() => {
            loadBadgesData();
        }, [])
    );

    const loadBadgesData = async () => {
        try {
            if (!isAuthenticated) {
                setError('로그인이 필요합니다.');
                return;
            }

            setIsLoading(true);
            setError(null);
            
            try {
                // 새로운 배지 시스템 API 사용
                const badges = await newPointsManager.getBadges(user.employee_id);
                setBadgesData(badges.badges || []);
            } catch (apiError) {
                console.log('API 호출 실패, 기본 데이터 사용:', apiError);
                // API 실패 시 기본 데이터 사용
                setBadgesData(generateMockBadgesData());
            }

        } catch (error) {
            console.error('배지 데이터 로드 실패:', error);
            setError('배지 데이터를 불러오는데 실패했습니다.');
            // 에러 시 목업 데이터 사용
            setBadgesData(generateMockBadgesData());
        } finally {
            setIsLoading(false);
        }
    };

    const generateMockBadgesData = () => {
        const badges = [
            // 방문 관련 배지 (10개)
            {
                id: 1,
                name: '첫 발걸음',
                description: '첫 번째 식당을 방문했습니다',
                icon: 'restaurant',
                color: '#10B981',
                is_earned: true,
                earned_date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
                category: 'visit'
            },
            {
                id: 2,
                name: '맛집 헌터',
                description: '10개의 다른 식당을 방문했습니다',
                icon: 'map',
                color: '#3B82F6',
                is_earned: true,
                earned_date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
                category: 'visit'
            },
            {
                id: 3,
                name: '지도 탐험가',
                description: '25개의 다른 식당을 방문했습니다',
                icon: 'navigate',
                color: '#8B5CF6',
                is_earned: false,
                category: 'visit',
                progress: 17,
                required: 25
            },
            {
                id: 4,
                name: '맛집 마스터',
                description: '50개의 다른 식당을 방문했습니다',
                icon: 'trophy',
                color: '#F59E0B',
                is_earned: false,
                category: 'visit',
                progress: 17,
                required: 50
            },
            {
                id: 5,
                name: '지역 전문가',
                description: '100개의 다른 식당을 방문했습니다',
                icon: 'location',
                color: '#EF4444',
                is_earned: false,
                category: 'visit',
                progress: 17,
                required: 100
            },
            {
                id: 6,
                name: '도시 탐험가',
                description: '200개의 다른 식당을 방문했습니다',
                icon: 'business',
                color: '#EC4899',
                is_earned: false,
                category: 'visit',
                progress: 17,
                required: 200
            },
            {
                id: 7,
                name: '맛집 전설',
                description: '500개의 다른 식당을 방문했습니다',
                icon: 'star',
                color: '#06B6D4',
                is_earned: false,
                category: 'visit',
                progress: 17,
                required: 500
            },
            {
                id: 8,
                name: '지도 제왕',
                description: '1000개의 다른 식당을 방문했습니다',
                icon: 'crown',
                color: '#84CC16',
                is_earned: false,
                category: 'visit',
                progress: 17,
                required: 1000
            },
            {
                id: 9,
                name: '맛집 신화',
                description: '연속 7일 방문',
                icon: 'calendar',
                color: '#F97316',
                is_earned: false,
                category: 'visit',
                progress: 3,
                required: 7
            },
            {
                id: 10,
                name: '방문 마스터',
                description: '연속 30일 방문',
                icon: 'flame',
                color: '#A855F7',
                is_earned: false,
                category: 'visit',
                progress: 3,
                required: 30
            },

            // 리뷰 관련 배지 (10개)
            {
                id: 11,
                name: '이야기꾼',
                description: '첫 번째 리뷰를 작성했습니다',
                icon: 'create',
                color: '#10B981',
                is_earned: true,
                earned_date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
                category: 'review'
            },
            {
                id: 12,
                name: '리뷰 애호가',
                description: '10개의 리뷰를 작성했습니다',
                icon: 'chatbubble',
                color: '#3B82F6',
                is_earned: true,
                earned_date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
                category: 'review'
            },
            {
                id: 13,
                name: '리뷰 전문가',
                description: '25개의 리뷰를 작성했습니다',
                icon: 'document-text',
                color: '#8B5CF6',
                is_earned: false,
                category: 'review',
                progress: 8,
                required: 25
            },
            {
                id: 14,
                name: '리뷰 마스터',
                description: '50개의 리뷰를 작성했습니다',
                icon: 'library',
                color: '#F59E0B',
                is_earned: false,
                category: 'review',
                progress: 8,
                required: 50
            },
            {
                id: 15,
                name: '리뷰 전설',
                description: '100개의 리뷰를 작성했습니다',
                icon: 'book',
                color: '#EF4444',
                is_earned: false,
                category: 'review',
                progress: 8,
                required: 100
            },
            {
                id: 16,
                name: '사진 작가',
                description: '사진과 함께 리뷰를 작성했습니다',
                icon: 'camera',
                color: '#EC4899',
                is_earned: false,
                category: 'review',
                progress: 0,
                required: 1
            },
            {
                id: 17,
                name: '음식 평론가',
                description: '상세한 리뷰를 20개 작성했습니다',
                icon: 'pencil',
                color: '#06B6D4',
                is_earned: false,
                category: 'review',
                progress: 8,
                required: 20
            },
            {
                id: 18,
                name: '리뷰 신화',
                description: '연속 7일 리뷰 작성',
                icon: 'calendar',
                color: '#84CC16',
                is_earned: false,
                category: 'review',
                progress: 2,
                required: 7
            },
            {
                id: 19,
                name: '리뷰 제왕',
                description: '연속 30일 리뷰 작성',
                icon: 'flame',
                color: '#F97316',
                is_earned: false,
                category: 'review',
                progress: 2,
                required: 30
            },
            {
                id: 20,
                name: '리뷰 창조주',
                description: '500개의 리뷰를 작성했습니다',
                icon: 'infinite',
                color: '#A855F7',
                is_earned: false,
                category: 'review',
                progress: 8,
                required: 500
            },

            // 파티 관련 배지 (10개)
            {
                id: 21,
                name: '사교적',
                description: '첫 번째 파티에 참여했습니다',
                icon: 'people',
                color: '#10B981',
                is_earned: true,
                earned_date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
                category: 'party'
            },
            {
                id: 22,
                name: '파티 애호가',
                description: '5개의 파티에 참여했습니다',
                icon: 'people-circle',
                color: '#3B82F6',
                is_earned: false,
                category: 'party',
                progress: 2,
                required: 5
            },
            {
                id: 23,
                name: '파티 전문가',
                description: '15개의 파티에 참여했습니다',
                icon: 'people',
                color: '#8B5CF6',
                is_earned: false,
                category: 'party',
                progress: 2,
                required: 15
            },
            {
                id: 24,
                name: '파티 마스터',
                description: '30개의 파티에 참여했습니다',
                icon: 'trophy',
                color: '#F59E0B',
                is_earned: false,
                category: 'party',
                progress: 2,
                required: 30
            },
            {
                id: 25,
                name: '파티 전설',
                description: '50개의 파티에 참여했습니다',
                icon: 'star',
                color: '#EF4444',
                is_earned: false,
                category: 'party',
                progress: 2,
                required: 50
            },
            {
                id: 26,
                name: '소셜 플레이어',
                description: '100개의 파티에 참여했습니다',
                icon: 'game-controller',
                color: '#EC4899',
                is_earned: false,
                category: 'party',
                progress: 2,
                required: 100
            },
            {
                id: 27,
                name: '파티 애니멀',
                description: '연속 7일 파티 참여',
                icon: 'calendar',
                color: '#06B6D4',
                is_earned: false,
                category: 'party',
                progress: 1,
                required: 7
            },
            {
                id: 28,
                name: '파티 신화',
                description: '연속 30일 파티 참여',
                icon: 'flame',
                color: '#84CC16',
                is_earned: false,
                category: 'party',
                progress: 1,
                required: 30
            },
            {
                id: 29,
                name: '파티 제왕',
                description: '200개의 파티에 참여했습니다',
                icon: 'crown',
                color: '#F97316',
                is_earned: false,
                category: 'party',
                progress: 2,
                required: 200
            },
            {
                id: 30,
                name: '파티 창조주',
                description: '500개의 파티에 참여했습니다',
                icon: 'infinite',
                color: '#A855F7',
                is_earned: false,
                category: 'party',
                progress: 2,
                required: 500
            },

            // 랜덤런치 관련 배지 (10개)
            {
                id: 31,
                name: '운명의 만남',
                description: '첫 번째 랜덤런치에 참여했습니다',
                icon: 'shuffle',
                color: '#10B981',
                is_earned: false,
                category: 'random_lunch',
                progress: 0,
                required: 1
            },
            {
                id: 32,
                name: '새로운 친구',
                description: '10번의 랜덤런치에 참여했습니다',
                icon: 'person-add',
                color: '#3B82F6',
                is_earned: false,
                category: 'random_lunch',
                progress: 3,
                required: 10
            },
            {
                id: 33,
                name: '소통의 달인',
                description: '25번의 랜덤런치에 참여했습니다',
                icon: 'chatbubbles',
                color: '#8B5CF6',
                is_earned: false,
                category: 'random_lunch',
                progress: 3,
                required: 25
            },
            {
                id: 34,
                name: '랜덤런치 마스터',
                description: '50번의 랜덤런치에 참여했습니다',
                icon: 'trophy',
                color: '#F59E0B',
                is_earned: false,
                category: 'random_lunch',
                progress: 3,
                required: 50
            },
            {
                id: 35,
                name: '랜덤런치 전설',
                description: '100번의 랜덤런치에 참여했습니다',
                icon: 'star',
                color: '#EF4444',
                is_earned: false,
                category: 'random_lunch',
                progress: 3,
                required: 100
            },
            {
                id: 36,
                name: '소셜 마스터',
                description: '200번의 랜덤런치에 참여했습니다',
                icon: 'game-controller',
                color: '#EC4899',
                is_earned: false,
                category: 'random_lunch',
                progress: 3,
                required: 200
            },
            {
                id: 37,
                name: '랜덤런치 신화',
                description: '연속 7일 랜덤런치 참여',
                icon: 'calendar',
                color: '#06B6D4',
                is_earned: false,
                category: 'random_lunch',
                progress: 0,
                required: 7
            },
            {
                id: 38,
                name: '랜덤런치 제왕',
                description: '연속 30일 랜덤런치 참여',
                icon: 'flame',
                color: '#84CC16',
                is_earned: false,
                category: 'random_lunch',
                progress: 0,
                required: 30
            },
            {
                id: 39,
                name: '랜덤런치 창조주',
                description: '500번의 랜덤런치에 참여했습니다',
                icon: 'infinite',
                color: '#F97316',
                is_earned: false,
                category: 'random_lunch',
                progress: 3,
                required: 500
            },
            {
                id: 40,
                name: '소통의 신',
                description: '1000번의 랜덤런치에 참여했습니다',
                icon: 'chatbubble-ellipses',
                color: '#A855F7',
                is_earned: false,
                category: 'random_lunch',
                progress: 3,
                required: 1000
            },

            // 음식 선호도 관련 배지 (5개)
            {
                id: 41,
                name: '한식 애호가',
                description: '한식 리뷰를 20개 작성했습니다',
                icon: 'restaurant',
                color: '#10B981',
                is_earned: false,
                category: 'food_preference',
                progress: 8,
                required: 20
            },
            {
                id: 42,
                name: '양식 전문가',
                description: '양식 리뷰를 20개 작성했습니다',
                icon: 'wine',
                color: '#3B82F6',
                is_earned: false,
                category: 'food_preference',
                progress: 3,
                required: 20
            },
            {
                id: 43,
                name: '일식 마스터',
                description: '일식 리뷰를 20개 작성했습니다',
                icon: 'fish',
                color: '#8B5CF6',
                is_earned: false,
                category: 'food_preference',
                progress: 2,
                required: 20
            },
            {
                id: 44,
                name: '중식 전설',
                description: '중식 리뷰를 20개 작성했습니다',
                icon: 'flame',
                color: '#F59E0B',
                is_earned: false,
                category: 'food_preference',
                progress: 5,
                required: 20
            },
            {
                id: 45,
                name: '세계 음식가',
                description: '모든 음식 종류의 리뷰를 작성했습니다',
                icon: 'globe',
                color: '#EF4444',
                is_earned: false,
                category: 'food_preference',
                progress: 3,
                required: 5
            },

            // 소셜 관련 배지 (5개)
            {
                id: 46,
                name: '친구 사랑',
                description: '10명의 친구를 초대했습니다',
                icon: 'heart',
                color: '#EC4899',
                is_earned: false,
                category: 'social',
                progress: 0,
                required: 10
            },
            {
                id: 47,
                name: '소셜 인플루언서',
                description: '50명의 친구를 초대했습니다',
                icon: 'megaphone',
                color: '#06B6D4',
                is_earned: false,
                category: 'social',
                progress: 0,
                required: 50
            },
            {
                id: 48,
                name: '커뮤니티 빌더',
                description: '100명의 친구를 초대했습니다',
                icon: 'people-circle',
                color: '#84CC16',
                is_earned: false,
                category: 'social',
                progress: 0,
                required: 100
            },
            {
                id: 49,
                name: '소셜 제왕',
                description: '500명의 친구를 초대했습니다',
                icon: 'crown',
                color: '#F97316',
                is_earned: false,
                category: 'social',
                progress: 0,
                required: 500
            },
            {
                id: 50,
                name: '소셜 창조주',
                description: '1000명의 친구를 초대했습니다',
                icon: 'infinite',
                color: '#A855F7',
                is_earned: false,
                category: 'social',
                progress: 0,
                required: 1000
            }
        ];
        return badges;
    };

    const getEarnedBadges = () => {
        return badgesData.filter(badge => badge.is_earned);
    };

    const getUnearnedBadges = () => {
        return badgesData.filter(badge => !badge.is_earned);
    };

    const getProgressPercentage = (badge) => {
        if (badge.is_earned) return 100;
        if (!badge.progress || !badge.required) return 0;
        return Math.min(100, (badge.progress / badge.required) * 100);
    };

    const renderBadgeItem = ({ item }) => (
        <TouchableOpacity 
            style={styles.badgeItem}
            onPress={() => setSelectedBadge(item)}
        >
            <View style={[styles.badgeIcon, { backgroundColor: item.color }]}>
                <Ionicons name={item.icon} size={24} color="#FFFFFF" />
            </View>
            <View style={styles.badgeContent}>
                <Text style={styles.badgeName}>{item.name}</Text>
                <Text style={styles.badgeDescription} numberOfLines={2}>
                    {item.description}
                </Text>
                {!item.is_earned && item.progress !== undefined && (
                    <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                            <View 
                                style={[
                                    styles.progressFill, 
                                    { width: `${getProgressPercentage(item)}%` }
                                ]} 
                            />
                        </View>
                        <Text style={styles.progressText}>
                            {item.progress}/{item.required}
                        </Text>
                    </View>
                )}
            </View>
            <View style={styles.badgeStatus}>
                {item.is_earned ? (
                    <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                ) : (
                    <Ionicons name="lock-closed" size={24} color="#CBD5E1" />
                )}
            </View>
        </TouchableOpacity>
    );

    const renderGridBadgeItem = ({ item }) => (
        <TouchableOpacity 
            style={styles.gridBadgeItem}
            onPress={() => setSelectedBadge(item)}
        >
            <View style={[styles.gridBadgeIcon, { backgroundColor: item.color }]}>
                <Ionicons name={item.icon} size={28} color="#FFFFFF" />
            </View>
            <Text style={styles.gridBadgeName} numberOfLines={2}>
                {item.name}
            </Text>
            {item.is_earned ? (
                <View style={styles.gridEarnedIndicator}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                </View>
            ) : (
                <View style={styles.gridLockedIndicator}>
                    <Ionicons name="lock-closed" size={16} color="#CBD5E1" />
                </View>
            )}
        </TouchableOpacity>
    );

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

    const earnedBadges = getEarnedBadges();
    const unearnedBadges = getUnearnedBadges();

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* 요약 카드 */}
                <View style={styles.summaryCard}>
                    <View style={styles.summaryContent}>
                        <Text style={styles.summaryTitle}>배지 현황</Text>
                        <Text style={styles.summaryCount}>
                            {earnedBadges.length}/{badgesData.length}
                        </Text>
                        <Text style={styles.summarySubtitle}>획득한 배지</Text>
                    </View>
                    <View style={styles.summaryIcon}>
                        <Ionicons name="ribbon" size={32} color="#8B5CF6" />
                    </View>
                </View>

                {/* 전체 배지 그리드 */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>전체 배지 컬렉션 ({badgesData.length})</Text>
                    <FlatList
                        data={badgesData}
                        renderItem={renderGridBadgeItem}
                        keyExtractor={item => item.id.toString()}
                        numColumns={3}
                        showsVerticalScrollIndicator={false}
                        scrollEnabled={false}
                    />
                </View>

                {/* 획득한 배지 섹션 */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>획득한 배지 ({earnedBadges.length})</Text>
                    {earnedBadges.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="ribbon-outline" size={48} color="#CBD5E1" />
                            <Text style={styles.emptyText}>아직 획득한 배지가 없습니다</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={earnedBadges}
                            renderItem={renderBadgeItem}
                            keyExtractor={item => item.id.toString()}
                            showsVerticalScrollIndicator={false}
                            scrollEnabled={false}
                        />
                    )}
                </View>

                {/* 미획득 배지 섹션 */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>진행 중인 배지 ({unearnedBadges.length})</Text>
                    {unearnedBadges.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="trophy-outline" size={48} color="#CBD5E1" />
                            <Text style={styles.emptyText}>모든 배지를 획득했습니다!</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={unearnedBadges}
                            renderItem={renderBadgeItem}
                            keyExtractor={item => item.id.toString()}
                            showsVerticalScrollIndicator={false}
                            scrollEnabled={false}
                        />
                    )}
                </View>
            </ScrollView>

            {/* 배지 상세 모달 */}
            {selectedBadge && (
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>배지 상세 정보</Text>
                            <TouchableOpacity onPress={() => setSelectedBadge(null)}>
                                <Ionicons name="close" size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.modalBody}>
                            <View style={[styles.modalBadgeIcon, { backgroundColor: selectedBadge.color }]}>
                                <Ionicons name={selectedBadge.icon} size={32} color="#FFFFFF" />
                            </View>
                            <Text style={styles.modalBadgeName}>{selectedBadge.name}</Text>
                            <Text style={styles.modalBadgeDescription}>{selectedBadge.description}</Text>
                            {selectedBadge.is_earned && selectedBadge.earned_date && (
                                <Text style={styles.modalEarnedDate}>
                                    획득일: {new Date(selectedBadge.earned_date).toLocaleDateString('ko-KR')}
                                </Text>
                            )}
                            {!selectedBadge.is_earned && selectedBadge.progress !== undefined && (
                                <View style={styles.modalProgress}>
                                    <Text style={styles.modalProgressText}>
                                        진행률: {selectedBadge.progress}/{selectedBadge.required}
                                    </Text>
                                    <View style={styles.modalProgressBar}>
                                        <View 
                                            style={[
                                                styles.modalProgressFill, 
                                                { width: `${getProgressPercentage(selectedBadge)}%` }
                                            ]} 
                                        />
                                    </View>
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    scrollView: {
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
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    placeholder: {
        width: 32,
    },
    summaryCard: {
        margin: 20,
        padding: 20,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        flexDirection: 'row',
        alignItems: 'center',
    },
    summaryContent: {
        flex: 1,
    },
    summaryTitle: {
        fontSize: 16,
        color: '#64748B',
        marginBottom: 4,
    },
    summaryCount: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#8B5CF6',
        marginBottom: 4,
    },
    summarySubtitle: {
        fontSize: 14,
        color: '#64748B',
    },
    summaryIcon: {
        marginLeft: 16,
    },
    sectionContainer: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1E293B',
        marginBottom: 16,
    },
    // 그리드 레이아웃 스타일
    gridRow: {
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    gridBadgeItem: {
        width: '30%',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 12,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        position: 'relative',
        marginBottom: 16,
        marginHorizontal: '1.66%',
    },
    gridBadgeIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    gridBadgeName: {
        fontSize: 12,
        fontWeight: '600',
        color: '#1E293B',
        textAlign: 'center',
        lineHeight: 16,
        height: 32,
    },
    gridEarnedIndicator: {
        position: 'absolute',
        top: 8,
        right: 8,
    },
    gridLockedIndicator: {
        position: 'absolute',
        top: 8,
        right: 8,
    },
    // 기존 리스트 레이아웃 스타일
    badgeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    badgeIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    badgeContent: {
        flex: 1,
    },
    badgeName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 4,
    },
    badgeDescription: {
        fontSize: 14,
        color: '#64748B',
        marginBottom: 8,
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    progressBar: {
        flex: 1,
        height: 6,
        backgroundColor: '#E2E8F0',
        borderRadius: 3,
        marginRight: 8,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#3B82F6',
        borderRadius: 3,
    },
    progressText: {
        fontSize: 12,
        color: '#64748B',
        minWidth: 30,
    },
    badgeStatus: {
        marginLeft: 8,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 16,
        color: '#64748B',
        marginTop: 12,
    },
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        width: '100%',
        maxWidth: 400,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    modalBody: {
        alignItems: 'center',
    },
    modalBadgeIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalBadgeName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1E293B',
        marginBottom: 8,
        textAlign: 'center',
    },
    modalBadgeDescription: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 20,
    },
    modalEarnedDate: {
        fontSize: 12,
        color: '#10B981',
        fontWeight: '500',
    },
    modalProgress: {
        width: '100%',
        alignItems: 'center',
    },
    modalProgressText: {
        fontSize: 14,
        color: '#64748B',
        marginBottom: 8,
    },
    modalProgressBar: {
        width: '100%',
        height: 8,
        backgroundColor: '#E2E8F0',
        borderRadius: 4,
        overflow: 'hidden',
    },
    modalProgressFill: {
        height: '100%',
        backgroundColor: '#3B82F6',
        borderRadius: 4,
    },
});

export default BadgeCollection; 