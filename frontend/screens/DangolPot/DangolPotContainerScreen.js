import React, { useState, useCallback } from 'react';
import {
    Text,
    View,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    SafeAreaView,
    ScrollView,
    Dimensions
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { RENDER_SERVER_URL } from '../../config';
import { COLORS } from '../../utils/colors';

// 컨텍스트
import { useMission } from '../../contexts/MissionContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function DangolPotContainerScreen({ navigation, route }) {
    const [myPots, setMyPots] = useState([]);
    const [allPots, setAllPots] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // currentColors와 currentUser를 global에서 가져오기
    const currentColors = global.currentColors || COLORS.light;
    
    const currentUser = global.currentUser || { employee_id: '1', nickname: '사용자' };
    
    // MissionContext 사용
    const { handleActionCompletion } = useMission();

    useFocusEffect(useCallback(() => {
        setIsLoading(true);
        Promise.all([
            fetch(`${RENDER_SERVER_URL}/dev/my_dangolpots/${currentUser?.employee_id || '1'}`).then(res => res.json()),
            fetch(`${RENDER_SERVER_URL}/dangolpots`).then(res => res.json())
        ]).then(([myPotsData, allPotsData]) => {
            if(Array.isArray(myPotsData)) setMyPots(myPotsData);
            if(Array.isArray(allPotsData)) setAllPots(allPotsData);
        }).catch(console.error).finally(() => setIsLoading(false));
    }, []));

    const renderPotItem = ({ item }) => {
        const currentUserId = global.currentUser?.employee_id || '1';
        const isHost = item.host?.employee_id === currentUserId;
        const isParticipant = isHost; // 현재는 호스트만 참여자로 간주
        
        // 날짜 포맷팅
        const formatDate = (dateString) => {
            if (!dateString) return '';
            const date = new Date(dateString);
            const month = date.getMonth() + 1;
            const day = date.getDate();
            const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
            return `${month}/${day}(${dayOfWeek})`;
        };
        
        return (
            <TouchableOpacity 
                style={[styles.potCard, { 
                    backgroundColor: currentColors.surface,
                    shadowColor: currentColors.primary,
                    borderColor: 'rgba(59, 130, 246, 0.1)'
                }]}
                onPress={() => navigation.navigate('DangolPotDetail', { potId: item.id })}
                activeOpacity={0.8}
            >
                {/* 단골파티 헤더 */}
                <View style={styles.potCardHeader}>
                    <View style={styles.potTitleContainer}>
                        <Text style={[styles.potTitle, { color: currentColors.text }]}>
                            {item.name}
                        </Text>
                        <View style={styles.potDateContainer}>
                            <Ionicons name="calendar-outline" size={16} color={currentColors.primary} />
                            <Text style={[styles.potDate, { color: currentColors.textSecondary }]}>
                                {formatDate(item.created_at)}
                            </Text>
                        </View>
                    </View>
                </View>
                
                {/* 단골파티 정보 - 가로 스크롤용 컴팩트 레이아웃 */}
                <View style={styles.potInfoContainer}>
                    <View style={styles.categoryInfo}>
                        <Ionicons name="home-outline" size={16} color={currentColors.textSecondary} />
                        <Text style={[styles.categoryName, { color: currentColors.text }]} numberOfLines={1}>
                            {item.category || '단골파티'}
                        </Text>
                    </View>
                </View>
                
                {/* 설명과 인원 정보를 한 줄에 */}
                <View style={styles.descriptionAndMemberInfo}>
                    <View style={styles.descriptionInfo}>
                        <Ionicons name="document-text-outline" size={14} color={currentColors.textSecondary} />
                        <Text style={[styles.potDescription, { color: currentColors.textSecondary }]} numberOfLines={1}>
                            {item.description || '단골파티입니다'}
                        </Text>
                    </View>
                    
                    <View style={styles.memberInfo}>
                        <Ionicons name="people-outline" size={14} color={currentColors.textSecondary} />
                        <Text style={[styles.memberCount, { color: currentColors.textSecondary }]}>
                            {item.member_count || 0}명
                        </Text>
                    </View>
                </View>
                
                {/* 액션 버튼 */}
                <View style={[styles.potCardActions, { borderTopColor: currentColors.border }]}>
                    {isHost ? (
                        <View style={[styles.hostBadge, { backgroundColor: currentColors.primary }]}>
                            <Ionicons name="star-outline" size={16} color="#FFFFFF" />
                            <Text style={styles.hostText}>호스트</Text>
                        </View>
                    ) : isParticipant ? (
                        <TouchableOpacity
                            style={[styles.leaveButton, { backgroundColor: currentColors.error }]}
                            onPress={() => {/* 나가기 기능 */}}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="exit-outline" size={18} color="#FFFFFF" />
                            <Text style={styles.leaveButtonText}>나가기</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={[styles.joinButton, { backgroundColor: currentColors.primary }]}
                            onPress={() => {/* 참여하기 기능 */}}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
                            <Text style={styles.joinButtonText}>참여하기</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const renderMyPotItem = ({ item }) => (
        <TouchableOpacity 
            style={[styles.myPotCard, { 
                backgroundColor: currentColors.surface,
                shadowColor: currentColors.primary,
                borderColor: 'rgba(59, 130, 246, 0.1)'
            }]}
            onPress={() => navigation.navigate('DangolPotDetail', { potId: item.id })}
            activeOpacity={0.8}
        >
            {/* 내 단골파티 헤더 */}
            <View style={styles.myPotHeader}>
                <Ionicons name="home" size={18} color={currentColors.primary} style={styles.myPotIcon} />
                <Text style={[styles.myPotTitle, { color: currentColors.text }]} numberOfLines={1}>
                    {item.name}
                </Text>
            </View>
            
            {/* 카테고리 태그 */}
            <View style={[styles.myPotCategoryBadge, { backgroundColor: currentColors.primaryLight }]}>
                <Text style={[styles.myPotCategoryText, { color: currentColors.primary }]}>{item.category}</Text>
            </View>
            
            {/* 설명 */}
            <Text style={[styles.myPotDescription, { color: currentColors.textSecondary }]} numberOfLines={2}>
                {item.description}
            </Text>
            
            {/* 정보 */}
            <View style={styles.myPotInfo}>
                <View style={styles.myPotInfoRow}>
                    <Ionicons name="people" size={14} color={currentColors.textSecondary} />
                    <Text style={[styles.myPotInfoText, { color: currentColors.textSecondary }]}>
                        {item.member_count}명
                    </Text>
                </View>
                <View style={styles.myPotInfoRow}>
                    <Ionicons name="calendar" size={14} color={currentColors.textSecondary} />
                    <Text style={[styles.myPotInfoText, { color: currentColors.textSecondary }]}>
                        {item.created_at}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background }]}>
                <View style={styles.loadingContainer}>
                    <Text style={[styles.loadingText, { color: currentColors.text }]}>로딩 중...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background }]}>
            <ScrollView style={styles.scrollView}>
                {/* 헤더 섹션 */}
                <View style={styles.header}>
                    <Text style={[styles.headerTitle, { color: currentColors.text }]}>
                        🏠 단골파티
                    </Text>
                    <Text style={[styles.headerSubtitle, { color: currentColors.textSecondary }]}>
                        정기적인 모임을 만들어보세요!
                    </Text>
                </View>

                {/* 내 단골파티 섹션 */}
                {myPots.length > 0 ? (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: currentColors.text }]}>내 단골파티</Text>
                        <FlatList
                            data={myPots}
                            renderItem={renderMyPotItem}
                            keyExtractor={(item) => item.id.toString()}
                            horizontal={true}
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.myPotsContainer}
                        />
                    </View>
                ) : (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: currentColors.text }]}>내 단골파티</Text>
                        <View style={styles.emptyContainer}>
                            <Ionicons name="home-outline" size={64} color={currentColors.textSecondary} />
                            <Text style={[styles.emptyTitle, { color: currentColors.text }]}>
                                아직 참여한 단골파티가 없습니다
                            </Text>
                            <Text style={[styles.emptySubtitle, { color: currentColors.textSecondary }]}>
                                첫 번째 단골파티를 만들어보세요!
                            </Text>
                            <TouchableOpacity 
                                style={[styles.emptyButton, { backgroundColor: currentColors.primary }]}
                                onPress={() => navigation.navigate('CreateDangolPot')}
                            >
                                <Text style={[styles.emptyButtonText, { color: '#FFFFFF' }]}>
                                    단골파티 만들기
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* 전체 단골파티 섹션 */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: currentColors.text }]}>전체 단골파티</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('DangolPotList')}>
                            <Text style={[styles.viewAllText, { color: currentColors.primary }]}>전체보기</Text>
                        </TouchableOpacity>
                    </View>
                    
                    <FlatList
                        data={allPots.slice(0, 5)}
                        renderItem={renderPotItem}
                        keyExtractor={(item) => item.id.toString()}
                        scrollEnabled={false}
                        contentContainerStyle={styles.allPotsContainer}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Ionicons name="home-outline" size={64} color={currentColors.textSecondary} />
                                <Text style={[styles.emptyTitle, { color: currentColors.text }]}>
                                    단골파티가 없습니다
                                </Text>
                                <Text style={[styles.emptySubtitle, { color: currentColors.textSecondary }]}>
                                    새로운 단골파티를 만들어보세요!
                                </Text>
                            </View>
                        }
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        fontWeight: '500',
    },
    // 홈탭과 통일된 헤더 스타일
    header: {
        marginBottom: 24,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    headerSubtitle: {
        fontSize: 16,
        lineHeight: 22,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: 0.5,
        marginBottom: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    viewAllText: {
        fontSize: 14,
        fontWeight: '600',
    },
    // 일반파티와 통일된 카드 스타일
    potCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderWidth: 1,
    },
    potCardHeader: {
        marginBottom: 12,
    },
    potTitleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    potTitle: {
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
        marginRight: 8,
    },
    potDateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    potDate: {
        fontSize: 12,
        marginLeft: 4,
    },
    potInfoContainer: {
        marginBottom: 8,
    },
    categoryInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    categoryName: {
        fontSize: 14,
        marginLeft: 6,
        flex: 1,
    },
    descriptionAndMemberInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    descriptionInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 12,
    },
    memberInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    memberCount: {
        fontSize: 12,
        marginLeft: 4,
    },
    potCardActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
    },
    hostBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    hostText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 4,
    },
    joinButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    joinButtonText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 4,
    },
    leaveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    leaveButtonText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 4,
    },
    potCategoryBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    potCategoryText: {
        fontSize: 12,
        fontWeight: '600',
    },
    potDescription: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 8,
    },
    potTags: {
        fontSize: 14,
        fontStyle: 'italic',
        marginBottom: 16,
    },
    potInfo: {
        gap: 8,
    },
    potInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    potInfoText: {
        fontSize: 14,
        marginLeft: 8,
        fontWeight: '500',
    },
    // 내 단골파티 카드 (가로 스크롤용)
    myPotCard: {
        borderRadius: 20,
        padding: 16,
        marginHorizontal: 6,
        width: SCREEN_WIDTH * 0.5,
        height: 160,
        borderWidth: 1,
        justifyContent: 'flex-start',
        elevation: 3,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    myPotHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    myPotIcon: {
        marginRight: 6,
    },
    myPotTitle: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
        flex: 1,
    },
    myPotCategoryBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
        marginBottom: 8,
    },
    myPotCategoryText: {
        fontSize: 10,
        fontWeight: '600',
    },
    myPotDescription: {
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 8,
    },
    myPotInfo: {
        gap: 4,
    },
    myPotInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    myPotInfoText: {
        fontSize: 12,
        marginLeft: 6,
        fontWeight: '500',
    },
    myPotsContainer: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    allPotsContainer: {
        gap: 16,
    },
    // 빈 상태 스타일
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
    },
    emptyButton: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 25,
    },
    emptyButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
});
