import React, { useState, useCallback } from 'react';
import {
    Text,
    View,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    SafeAreaView,
    ScrollView,
    Dimensions,
    ActivityIndicator,
    Switch
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
    
    // 필터링 상태 관리 (일반파티탭과 동일)
    const [myPotsFilter, setMyPotsFilter] = useState(false); // 내 단골파티: 활성 파티만
    const [allPotsFilter, setAllPotsFilter] = useState(false); // 전체 단골파티: 참여 가능한 파티만
    
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

    // 단골파티가 활성 상태인지 확인
    const isPotActive = (pot) => {
        // 단골파티는 일반적으로 활성 상태로 간주
        return true;
    };

    // 단골파티가 참여 가능한지 확인
    const isPotJoinable = (pot) => {
        return pot.member_count < (pot.max_members || 10); // 최대 인원 제한
    };

    // 내 단골파티와 전체 단골파티 데이터 분리 및 필터링
    const filteredMyPots = myPots.filter(pot => {
        if (!myPotsFilter) return true;
        return isPotActive(pot);
    });
    
    const filteredAllPots = allPots.filter(pot => {
        if (!allPotsFilter) return true;
        return isPotJoinable(pot);
    });

    if (isLoading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>단골파티 정보를 불러오는 중...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: currentColors.background }]}>
            <ScrollView 
                style={[styles.container, { backgroundColor: currentColors.background }]}
                showsVerticalScrollIndicator={false}
            >
                {/* 내 단골파티 섹션 */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionTitleContainer}>
                            <Ionicons name="home-outline" size={24} color={currentColors.primary} />
                            <Text style={[styles.sectionTitle, { color: currentColors.text }]}>내 단골파티</Text>
                        </View>
                        <View style={styles.filterToggleRow}>
                            <Switch
                                value={myPotsFilter}
                                onValueChange={setMyPotsFilter}
                                trackColor={{ 
                                    false: currentColors.lightGray, 
                                    true: currentColors.primary 
                                }}
                                thumbColor={'#FFFFFF'}
                            />
                        </View>
                    </View>
                    
                    {filteredMyPots.length > 0 ? (
                        <ScrollView 
                            horizontal 
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.horizontalScrollContainer}
                            style={styles.horizontalScrollView}
                        >
                            {filteredMyPots.map((pot) => (
                                <View key={pot.id.toString()} style={styles.horizontalCardContainer}>
                                    {renderPotItem({ item: pot })}
                                </View>
                            ))}
                        </ScrollView>
                    ) : (
                        <View style={[styles.emptyState, { backgroundColor: currentColors.surface }]}>
                            <Ionicons name="home-outline" size={48} color={currentColors.textSecondary} />
                            <Text style={[styles.emptyText, { color: currentColors.textSecondary }]}>
                                아직 생성한 단골파티가 없습니다
                            </Text>
                            <Text style={[styles.emptySubtext, { color: currentColors.textSecondary }]}>
                                새로운 단골파티를 만들어보세요!
                            </Text>
                        </View>
                    )}
                </View>
                
                {/* 전체 단골파티 섹션 */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionTitleContainer}>
                            <Ionicons name="globe-outline" size={24} color={currentColors.primary} />
                            <Text style={[styles.sectionTitle, { color: currentColors.text }]}>전체 단골파티</Text>
                        </View>
                        <View style={styles.filterToggleRow}>
                            <Switch
                                value={allPotsFilter}
                                onValueChange={setAllPotsFilter}
                                trackColor={{ 
                                    false: currentColors.lightGray, 
                                    true: currentColors.primary 
                                }}
                                thumbColor={'#FFFFFF'}
                            />
                        </View>
                    </View>
                    
                    {filteredAllPots.length > 0 ? (
                        <View style={styles.potListContainer}>
                            {filteredAllPots.map((pot) => (
                                <View key={pot.id.toString()}>
                                    {renderPotItem({ item: pot })}
                                </View>
                            ))}
                        </View>
                    ) : (
                        <View style={[styles.emptyState, { backgroundColor: currentColors.surface }]}>
                            <Ionicons name="home-outline" size={48} color={currentColors.textSecondary} />
                            <Text style={[styles.emptyText, { color: currentColors.textSecondary }]}>
                                참여 가능한 단골파티가 없습니다
                            </Text>
                            <Text style={[styles.emptySubtext, { color: currentColors.textSecondary }]}>
                                잠시 후 다시 확인해주세요
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    container: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 50,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        fontWeight: '500',
    },
    section: {
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginLeft: 8,
        letterSpacing: 0.5,
    },
    filterToggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    potListContainer: {
        gap: 12,
    },
    horizontalScrollView: {
        marginHorizontal: -16, // 부모 컨테이너의 패딩을 상쇄
    },
    horizontalScrollContainer: {
        paddingHorizontal: 16, // 좌우 패딩 복원
        gap: 12,
    },
    horizontalCardContainer: {
        width: SCREEN_WIDTH * 0.8, // 화면 너비의 80%
        maxWidth: 320, // 최대 너비 제한
    },
    // 단골파티 카드 스타일 (일반파티와 동일한 구조)
    potCard: {
        borderRadius: 20,
        padding: 20,
        elevation: 3,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        borderWidth: 1,
    },
    potCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    potTitleContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    potTitle: {
        fontSize: 18,
        fontWeight: '700',
        flex: 1,
    },
    potDateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    potDate: {
        fontSize: 14,
        marginLeft: 4,
        fontWeight: '500',
    },
    potInfoContainer: {
        marginBottom: 12,
    },
    categoryInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    categoryName: {
        fontSize: 16,
        marginLeft: 8,
        fontWeight: '500',
        flex: 1,
    },
    descriptionAndMemberInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    descriptionInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    memberInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        justifyContent: 'flex-end',
    },
    memberCount: {
        fontSize: 13,
        marginLeft: 4,
        fontWeight: '500',
    },
    potCardActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingTop: 16,
        borderTopWidth: 1,
    },
    hostBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
    },
    hostText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
        marginLeft: 6,
    },
    joinButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
    },
    joinButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
        marginLeft: 6,
    },
    leaveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
    },
    leaveButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
        marginLeft: 6,
    },
    // 빈 상태 스타일 (일반파티탭과 동일)
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
        borderRadius: 16,
        marginTop: 8,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '500',
        marginTop: 16,
        textAlign: 'center',
    },
    emptySubtext: {
        fontSize: 14,
        marginTop: 8,
        textAlign: 'center',
        opacity: 0.7,
    },
});
