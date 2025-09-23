import React, { useState, useEffect, useCallback } from 'react';
import {
    Text,
    View,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    Alert,
    Dimensions,
    Switch
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

// Context 및 유틸리티
import { useMission } from '../../contexts/MissionContext';
import { COLORS } from '../../utils/colors';
import { useParties, useJoinParty, useLeaveParty } from '../../hooks/usePartyQuery';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// --- 파티 탭 ---
export default function PartyListScreen({ navigation }) {
    // 백엔드에서 파티 데이터 가져오기
    const { parties: allParties, isLoading, error, refetch } = useParties(false); // 일반 파티
    const joinPartyMutation = useJoinParty();
    const leavePartyMutation = useLeaveParty();
    
    // MissionContext 사용
    const { handleActionCompletion } = useMission();
    
    // 현재 색상 테마 가져오기
    const currentColors = global.currentColors || COLORS.light;
    
    // 필터링 상태 관리
    const [myPartiesFilter, setMyPartiesFilter] = useState(false); // 내 파티: 오늘 이후만
    const [allPartiesFilter, setAllPartiesFilter] = useState(false); // 전체 파티: 참여 가능한 파티만
    
    // 새 파티 생성 시 데이터 새로고침 (useFocusEffect로 대체)

    // 화면 포커스 시 데이터 새로고침
    useFocusEffect(useCallback(() => {
        console.log('🔍 [PartyListScreen] 화면 포커스, 데이터 새로고침');
        refetch();
    }, [refetch]));

    const handlePartyPress = (party) => {
        navigation.navigate('PartyDetail', { 
            partyId: party.id, 
            partyData: party 
        });
    };

    // 파티 참여/나가기 핸들러
    const handleJoinParty = async (partyId) => {
        try {
            await joinPartyMutation.mutateAsync(partyId);
            Alert.alert('성공', '파티에 참여했습니다!');
        } catch (error) {
            Alert.alert('오류', error.message || '파티 참여에 실패했습니다.');
        }
    };

    const handleLeaveParty = async (partyId) => {
        try {
            await leavePartyMutation.mutateAsync(partyId);
            Alert.alert('성공', '파티에서 나갔습니다.');
        } catch (error) {
            Alert.alert('오류', error.message || '파티 나가기에 실패했습니다.');
        }
    };

    const renderPartyItem = ({ item }) => {
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
                style={[styles.partyCard, { 
                    backgroundColor: currentColors.surface,
                    shadowColor: currentColors.primary,
                    borderColor: 'rgba(59, 130, 246, 0.1)'
                }]}
                onPress={() => handlePartyPress(item)}
                activeOpacity={0.8}
            >
                {/* 파티 헤더 */}
                <View style={styles.partyCardHeader}>
                    <View style={styles.partyTitleContainer}>
                        <Text style={[styles.partyTitle, { color: currentColors.text }]}>
                            {item.title}
                        </Text>
                        <View style={styles.partyDateContainer}>
                            <Ionicons name="calendar-outline" size={16} color={currentColors.primary} />
                            <Text style={[styles.partyDate, { color: currentColors.textSecondary }]}>
                                {formatDate(item.party_date)}
                            </Text>
                        </View>
                    </View>
                </View>
                
                {/* 파티 정보 - 가로 스크롤용 컴팩트 레이아웃 */}
                <View style={styles.partyInfoContainer}>
                    <View style={styles.restaurantInfo}>
                        <Ionicons name="restaurant-outline" size={16} color={currentColors.textSecondary} />
                        <Text style={[styles.restaurantName, { color: currentColors.text }]} numberOfLines={1}>
                            {item.restaurant_name || '구내식당'}
                        </Text>
                    </View>
                </View>
                
                {/* 시간과 인원 정보를 한 줄에 */}
                <View style={styles.timeAndMemberInfo}>
                    <View style={styles.timeInfo}>
                        <Ionicons name="time-outline" size={14} color={currentColors.textSecondary} />
                        <Text style={[styles.partyTime, { color: currentColors.textSecondary }]}>
                            {item.party_time || '11:30'}
                        </Text>
                    </View>
                    
                    <View style={styles.memberInfo}>
                        <Ionicons name="people-outline" size={14} color={currentColors.textSecondary} />
                        <Text style={[styles.memberCount, { color: currentColors.textSecondary }]}>
                            {item.current_members}/{item.max_members}명
                        </Text>
                    </View>
                </View>
                
                {/* 액션 버튼 */}
                <View style={[styles.partyCardActions, { borderTopColor: currentColors.border }]}>
                    {isHost ? (
                        <View style={[styles.hostBadge, { backgroundColor: currentColors.primary }]}>
                            <Ionicons name="star-outline" size={16} color="#FFFFFF" />
                            <Text style={styles.hostText}>호스트</Text>
                        </View>
                    ) : isParticipant ? (
                        <TouchableOpacity
                            style={[styles.leaveButton, { backgroundColor: currentColors.error }]}
                            onPress={() => handleLeaveParty(item.id)}
                            disabled={leavePartyMutation.isLoading}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="exit-outline" size={18} color="#FFFFFF" />
                            <Text style={styles.leaveButtonText}>나가기</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={[styles.joinButton, { backgroundColor: currentColors.primary }]}
                            onPress={() => handleJoinParty(item.id)}
                            disabled={joinPartyMutation.isLoading}
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

    if (isLoading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>파티 정보를 불러오는 중...</Text>
                </View>
            </SafeAreaView>
        );
    }

    // 날짜 비교 함수
    const isTodayOrLater = (dateString) => {
        if (!dateString) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const partyDate = new Date(dateString);
        partyDate.setHours(0, 0, 0, 0);
        return partyDate >= today;
    };

    // 파티가 참여 가능한지 확인 (인원이 다 차지 않았고, 날짜가 지나지 않음)
    const isPartyJoinable = (party) => {
        return party.current_members < party.max_members && isTodayOrLater(party.party_date);
    };

    // 내 파티와 전체 파티 데이터 분리 및 필터링
    const myParties = allParties.filter(party => {
        const currentUserId = global.currentUser?.employee_id || '1';
        const isMyParty = party.host?.employee_id === currentUserId;
        
        if (!isMyParty) return false;
        
        // 필터가 켜져있으면 오늘 이후 파티만
        if (myPartiesFilter) {
            return isTodayOrLater(party.party_date);
        }
        
        return true;
    });
    
    const otherParties = allParties.filter(party => {
        // 전체 파티는 내가 만든 파티도 포함
        // 필터가 켜져있으면 참여 가능한 파티만
        if (allPartiesFilter) {
            return isPartyJoinable(party);
        }
        
        return true;
    });

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: currentColors.background }]}>
            <ScrollView 
                style={[styles.container, { backgroundColor: currentColors.background }]}
                showsVerticalScrollIndicator={false}
            >
                {/* 내 파티 섹션 */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionTitleContainer}>
                            <Ionicons name="person-circle-outline" size={24} color={currentColors.primary} />
                            <Text style={[styles.sectionTitle, { color: currentColors.text }]}>내 파티</Text>
                        </View>
                        <View style={styles.filterToggleRow}>
                            <Switch
                                value={myPartiesFilter}
                                onValueChange={setMyPartiesFilter}
                                trackColor={{ 
                                    false: currentColors.lightGray, 
                                    true: currentColors.primary 
                                }}
                                thumbColor={'#FFFFFF'}
                            />
                        </View>
                    </View>
                    
                    {myParties.length > 0 ? (
                        <ScrollView 
                            horizontal 
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.horizontalScrollContainer}
                            style={styles.horizontalScrollView}
                        >
                            {myParties.map((party) => (
                                <View key={party.id.toString()} style={styles.horizontalCardContainer}>
                                    {renderPartyItem({ item: party })}
                                </View>
                            ))}
                        </ScrollView>
                    ) : (
                        <View style={[styles.emptyState, { backgroundColor: currentColors.surface }]}>
                            <Ionicons name="people-outline" size={48} color={currentColors.textSecondary} />
                            <Text style={[styles.emptyText, { color: currentColors.textSecondary }]}>
                                아직 생성한 파티가 없습니다
                            </Text>
                            <Text style={[styles.emptySubtext, { color: currentColors.textSecondary }]}>
                                새로운 파티를 만들어보세요!
                            </Text>
                        </View>
                    )}
                </View>
                
                {/* 전체 파티 섹션 */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionTitleContainer}>
                            <Ionicons name="globe-outline" size={24} color={currentColors.primary} />
                            <Text style={[styles.sectionTitle, { color: currentColors.text }]}>전체 파티</Text>
                        </View>
                        <View style={styles.filterToggleRow}>
                            <Switch
                                value={allPartiesFilter}
                                onValueChange={setAllPartiesFilter}
                                trackColor={{ 
                                    false: currentColors.lightGray, 
                                    true: currentColors.primary 
                                }}
                                thumbColor={'#FFFFFF'}
                            />
                        </View>
                    </View>
                    
                    {otherParties.length > 0 ? (
                        <View style={styles.partyListContainer}>
                            {otherParties.map((party) => (
                                <View key={party.id.toString()}>
                                    {renderPartyItem({ item: party })}
                                </View>
                            ))}
                        </View>
                    ) : (
                        <View style={[styles.emptyState, { backgroundColor: currentColors.surface }]}>
                            <Ionicons name="people-outline" size={48} color={currentColors.textSecondary} />
                            <Text style={[styles.emptyText, { color: currentColors.textSecondary }]}>
                                참여 가능한 파티가 없습니다
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
    partyListContainer: {
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
    partyCard: {
        borderRadius: 20,
        padding: 20,
        elevation: 3,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        borderWidth: 1,
    },
    partyCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    partyTitleContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    partyTitle: {
        fontSize: 18,
        fontWeight: '700',
        flex: 1,
    },
    partyDateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    partyDate: {
        fontSize: 14,
        marginLeft: 4,
        fontWeight: '500',
    },
    partyInfoContainer: {
        marginBottom: 12,
    },
    restaurantInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    restaurantName: {
        fontSize: 16,
        marginLeft: 8,
        fontWeight: '500',
        flex: 1,
    },
    timeAndMemberInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    timeInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    partyTime: {
        fontSize: 13,
        marginLeft: 4,
        fontWeight: '500',
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
    partyCardActions: {
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
