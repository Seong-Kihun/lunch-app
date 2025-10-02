import React, { useState, useEffect, useCallback } from 'react';
import {
    Text,
    View,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    ActivityIndicator,
    Alert,
    FlatList
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { unifiedApiClient } from '../../../services/UnifiedApiClient';

// 디버깅을 위한 로그
console.log('🔧 [SuggestGroupScreen] unifiedApiClient 사용');

// 컨텍스트
import { useAuth } from '../../../contexts/AuthContext';

export default function SuggestGroupScreen({ navigation, route, currentColors, currentUser }) {
    const { user } = useAuth();
    const { selectedDate } = route?.params || {};
    const [suggestedGroups, setSuggestedGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
    const [proposedGroups, setProposedGroups] = useState(new Set());
    
    // 랜덤런치 탭에서 사용될 때 기본 날짜 설정
    const defaultDate = selectedDate || new Date();
    const [currentDate, setCurrentDate] = useState(defaultDate);

    useEffect(() => {
        fetchSuggestedGroups();
    }, [currentDate]);

    useEffect(() => {
        if (suggestedGroups.length > 0) {
            fetchMyProposals();
        }
    }, [suggestedGroups]);

    // 화면이 포커스될 때마다 제안 상태 새로고침
    useFocusEffect(
        useCallback(() => {
            fetchMyProposals();
        }, [])
    );

    const fetchMyProposals = async () => {
        try {
            const response = await unifiedApiClient.get(`/proposals/mine?employee_id=${currentUser?.employee_id || '1'}`);
            const data = response;
            if (response.success) {
                const sentProposals = data.sent_proposals || [];
                const pendingProposals = sentProposals.filter(p => p.status === 'pending');
                const proposedGroupKeys = new Set();
                pendingProposals.forEach(proposal => {
                    if (proposal.recipient_ids) {
                        // 여기 두 줄이 중요!
                        const ids = parseRecipientIds(proposal.recipient_ids);
                        const groupKey = getGroupKeyFromIds(ids);
                        proposedGroupKeys.add(groupKey);
                    }
                });
                setProposedGroups(proposedGroupKeys);
            }
        } catch (error) {
            console.error('제안 상태 조회 오류:', error);
        }
    };

    const fetchSuggestedGroups = async () => {
        try {
            setLoading(true);
            // 가상 그룹 매칭 API 사용 - 여러 그룹 지원
            const response = await unifiedApiClient.get(`/dev/random-lunch/${user.employee_id || '1'}`);
            const groupsData = response;
            
            if (response.success && groupsData && Array.isArray(groupsData)) {
                // API가 배열을 반환하므로 각 그룹을 변환
                const virtualGroups = groupsData.map(data => ({
                    id: data.id,
                    date: data.date,
                    members: data.members,
                    status: data.status,
                    created_at: data.created_at,
                    score: data.score || 0,
                    // 화면 표시용 추가 필드
                    title: `🍽️ ${data.date} 점심 모임`,
                    current_members: data.current_members || data.members.length,
                    max_members: data.max_members || 4,
                    restaurant_name: '추천 식당',
                    party_date: data.date,
                    party_time: '12:00',
                    users: data.members.map(memberId => {
                        // 실제 사용자 데이터에서 닉네임 가져오기
                        const getNickname = (employeeId) => {
                            const user = data.users.find(u => u.employee_id === employeeId);
                            return user ? user.nickname : `사용자${employeeId}`;
                        };
                        return {
                            employee_id: memberId,
                            nickname: getNickname(memberId),
                            profile_image: null
                        };
                    })
                }));
                
                setSuggestedGroups(virtualGroups);
                console.log('✅ [랜덤런치]', virtualGroups.length, '개 그룹 매칭 완료');
            } else {
                setSuggestedGroups([]);
                console.log('⚠️ [랜덤런치] 그룹 매칭 결과 없음');
            }
        } catch (error) {
            console.error('랜덤런치 그룹 조회 오류:', error);
            Alert.alert('오류', '그룹 정보를 가져오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handlePropose = async (group) => {
        try {
            const recipientIds = group.users
                .filter(u => u.employee_id !== (currentUser?.employee_id || '1'))
                .map(u => u.employee_id);
            
            if (recipientIds.length === 0) {
                Alert.alert('오류', '제안할 수 있는 사용자가 없습니다.');
                return;
            }

            const response = await unifiedApiClient.post(`/proposals`, {
                sender_id: currentUser?.employee_id || '1',
                recipient_ids: recipientIds,
                message: `${group.date} 점심 모임에 함께하시겠어요?`,
                type: 'random_lunch',
                group_data: {
                    date: group.date,
                    members: group.users.map(u => u.employee_id),
                    restaurant: group.restaurant_name
                }
            });

            if (response.success) {
                Alert.alert('성공', '점심 모임 제안을 보냈습니다!');
                fetchMyProposals(); // 제안 상태 새로고침
            } else {
                Alert.alert('오류', response.message || '제안 전송에 실패했습니다.');
            }
        } catch (error) {
            console.error('제안 전송 오류:', error);
            Alert.alert('오류', '네트워크에 문제가 발생했습니다.');
        }
    };

    const handleGroupSelect = (group) => {
        navigation.navigate('PartyDetail', { 
            partyId: group.id,
            partyData: group
        });
    };

    const renderGroupCard = ({ item: group, index }) => {
        const isProposed = proposedGroups.has(getGroupKeyFromIds(group.users.map(u => u.employee_id)));
        
        return (
            <View style={[styles.groupCard, { backgroundColor: currentColors.surface }]}>
                <View style={styles.groupHeader}>
                    <Text style={[styles.groupTitle, { color: currentColors.text }]}>
                        {group.title}
                    </Text>
                    <View style={[styles.scoreBadge, { backgroundColor: currentColors.primaryLight }]}>
                        <Text style={[styles.scoreText, { color: currentColors.primary }]}>
                            {group.score}점
                        </Text>
                    </View>
                </View>
                
                <View style={styles.groupInfo}>
                    <Text style={[styles.infoText, { color: currentColors.textSecondary }]}>
                        📅 {group.date} • 🕐 {group.party_time}
                    </Text>
                    <Text style={[styles.infoText, { color: currentColors.textSecondary }]}>
                        🍽️ {group.restaurant_name}
                    </Text>
                    <Text style={[styles.infoText, { color: currentColors.textSecondary }]}>
                        👥 {group.current_members}/{group.max_members}명
                    </Text>
                </View>
                
                <View style={styles.membersSection}>
                    <Text style={[styles.sectionTitle, { color: currentColors.text }]}>
                        멤버
                    </Text>
                    <View style={styles.membersList}>
                        {group.users.map((user, idx) => (
                            <View key={idx} style={styles.memberItem}>
                                <View style={[styles.avatar, { backgroundColor: currentColors.primaryLight }]}>
                                    <Text style={[styles.avatarText, { color: currentColors.primary }]}>
                                        {user.nickname.charAt(0)}
                                    </Text>
                                </View>
                                <Text style={[styles.memberName, { color: currentColors.text }]}>
                                    {user.nickname}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>
                
                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: currentColors.surfaceVariant }]}
                        onPress={() => handleGroupSelect(group)}
                    >
                        <Text style={[styles.actionButtonText, { color: currentColors.onSurfaceVariant }]}>
                            상세보기
                        </Text>
                    </TouchableOpacity>
                    
                    {!isProposed ? (
                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: currentColors.primary }]}
                            onPress={() => handlePropose(group)}
                        >
                            <Text style={[styles.actionButtonText, { color: currentColors.onPrimary }]}>
                                제안하기
                            </Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={[styles.proposedBadge, { backgroundColor: currentColors.success }]}>
                            <Text style={[styles.proposedText, { color: currentColors.onSuccess }]}>
                                제안됨
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.safeArea, { backgroundColor: currentColors.background }]}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={currentColors.primary} />
                    <Text style={[styles.loadingText, { color: currentColors.textSecondary }]}>
                        그룹을 찾는 중...
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: currentColors.background }]}>
            <ScrollView style={styles.container}>
                <View style={styles.header}>
                    <Text style={[styles.headerTitle, { color: currentColors.text }]}>
                        추천 그룹
                    </Text>
                    <Text style={[styles.headerSubtitle, { color: currentColors.textSecondary }]}>
                        {suggestedGroups.length}개의 그룹을 찾았습니다
                    </Text>
                </View>
                
                {suggestedGroups.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="people-outline" size={64} color={currentColors.textSecondary} />
                        <Text style={[styles.emptyText, { color: currentColors.textSecondary }]}>
                            추천할 그룹이 없습니다
                        </Text>
                        <Text style={[styles.emptySubtext, { color: currentColors.textSecondary }]}>
                            다른 날짜를 선택해보세요
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={suggestedGroups}
                        renderItem={renderGroupCard}
                        keyExtractor={(item, index) => `group-${index}`}
                        scrollEnabled={false}
                        contentContainerStyle={styles.groupsList}
                    />
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

// 유틸리티 함수들
const parseRecipientIds = (recipientIds) => {
    if (typeof recipientIds === 'string') {
        return recipientIds.split(',').map(id => id.trim());
    }
    return recipientIds || [];
};

const getGroupKeyFromIds = (ids) => {
    return ids.sort().join(',');
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        marginTop: 16,
    },
    header: {
        padding: 20,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    headerSubtitle: {
        fontSize: 16,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
    },
    groupsList: {
        padding: 20,
        gap: 16,
    },
    groupCard: {
        borderRadius: 16,
        padding: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    groupHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    groupTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        flex: 1,
    },
    scoreBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    scoreText: {
        fontSize: 12,
        fontWeight: '600',
    },
    groupInfo: {
        marginBottom: 16,
        gap: 4,
    },
    infoText: {
        fontSize: 14,
    },
    membersSection: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    membersList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    memberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    avatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 12,
        fontWeight: '600',
    },
    memberName: {
        fontSize: 14,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    proposedBadge: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    proposedText: {
        fontSize: 14,
        fontWeight: '600',
    },
});
