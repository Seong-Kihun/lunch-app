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
import { RENDER_SERVER_URL } from '../../../config';
import { apiClient } from '../../../utils/apiClient';

// 디버깅을 위한 로그
console.log('🔧 [MyProposalsScreen] RENDER_SERVER_URL:', RENDER_SERVER_URL);

// 컨텍스트
import { useAuth } from '../../../contexts/AuthContext';

export default function MyProposalsScreen({ navigation, currentColors, currentUser }) {
    const { user } = useAuth();
    const [proposals, setProposals] = useState({ sent_proposals: [], received_proposals: [] });
    const [loading, setLoading] = useState(true);
    const [expandedProposals, setExpandedProposals] = useState(new Set());
    const [groupMembersMap, setGroupMembersMap] = useState({});
    const [confirmedGroups, setConfirmedGroups] = useState([]);

    useEffect(() => {
        fetchMyProposals();
        fetchConfirmedGroups();
    }, []);

    // 화면이 포커스될 때마다 제안 목록 새로고침
    useFocusEffect(
        useCallback(() => {
            fetchMyProposals();
            fetchConfirmedGroups();
        }, [])
    );

    const fetchConfirmedGroups = async () => {
        try {
            const response = await fetch(`${RENDER_SERVER_URL}/parties?employee_id=${currentUser?.employee_id || '1'}&is_from_match=true`);
            const data = await response.json();
            if (response.ok && Array.isArray(data)) {
                // API 응답 데이터를 안전하게 처리 (members_employee_ids 필드 제거)
                const safeData = data.map(party => {
                    // members_employee_ids 필드를 제거하고 필요한 필드만 추출
                    const { members_employee_ids, ...safeParty } = party;
                    
                    return {
                        ...safeParty,
                        // 기본값 설정
                        current_members: party.current_members || party.members_count || 1,
                        restaurant_name: party.restaurant_name || party.restaurant || '식당명 없음',
                        party_date: party.party_date || party.date || '날짜 없음'
                    };
                });
                setConfirmedGroups(safeData);
            }
        } catch (error) {
            console.error('성사된 그룹 조회 오류:', error);
            // 오류 발생 시 빈 배열로 설정
            setConfirmedGroups([]);
        }
    };

    const handleRejectProposal = async (proposalId) => {
        try {
            const response = await fetch(`${RENDER_SERVER_URL}/proposals/${proposalId}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: user.employee_id })
            });
            const data = await response.json();
            if (response.ok) {
                Alert.alert('알림', data.message || '제안을 거절했습니다.');
                fetchMyProposals(); // 목록 새로고침
            } else {
                Alert.alert('오류', data.message || '거절에 실패했습니다.');
            }
        } catch (error) {
            console.error('제안 거절 오류:', error);
            Alert.alert('오류', '네트워크에 문제가 발생했습니다.');
        }
    };

    const fetchMyProposals = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get(`${RENDER_SERVER_URL}/proposals/mine?employee_id=${user.employee_id}`);
            const data = await response.json();
            if (response.ok) {
                // 취소된 제안만 제거
                const filterProposals = (proposals) => proposals.filter(p => p.status !== 'cancelled');
                const filteredData = {
                    sent_proposals: filterProposals(data.sent_proposals || []),
                    received_proposals: filterProposals(data.received_proposals || [])
                };
                setProposals(filteredData);
                // 보낸 제안들의 그룹 멤버 정보를 바로 가져오기
                const sentProposals = filteredData.sent_proposals || [];
                for (const proposal of sentProposals) {
                    if (proposal.recipient_ids) {
                        fetchGroupMembers(proposal.id, proposal.recipient_ids);
                    }
                }
            } else {
                Alert.alert('오류', data.message || '제안 목록을 가져오는데 실패했습니다.');
            }
        } catch (error) {
            console.error('제안 목록 조회 오류:', error);
            Alert.alert('오류', '네트워크에 문제가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const fetchGroupMembers = async (proposalId, recipientIds) => {
        try {
            const response = await fetch(`${RENDER_SERVER_URL}/users/batch?ids=${recipientIds.join(',')}`);
            const data = await response.json();
            if (response.ok && Array.isArray(data)) {
                setGroupMembersMap(prev => ({
                    ...prev,
                    [proposalId]: data
                }));
            }
        } catch (error) {
            console.error('그룹 멤버 조회 오류:', error);
        }
    };

    const handleAcceptProposal = async (proposalId) => {
        try {
            const response = await fetch(`${RENDER_SERVER_URL}/proposals/${proposalId}/accept`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: user.employee_id })
            });
            const data = await response.json();
            if (response.ok) {
                Alert.alert('성공', data.message || '제안을 수락했습니다!');
                fetchMyProposals(); // 목록 새로고침
            } else {
                Alert.alert('오류', data.message || '수락에 실패했습니다.');
            }
        } catch (error) {
            console.error('제안 수락 오류:', error);
            Alert.alert('오류', '네트워크에 문제가 발생했습니다.');
        }
    };

    const toggleProposalExpansion = (proposalId) => {
        setExpandedProposals(prev => {
            const newSet = new Set(prev);
            if (newSet.has(proposalId)) {
                newSet.delete(proposalId);
            } else {
                newSet.add(proposalId);
            }
            return newSet;
        });
    };

    const renderProposalItem = ({ item: proposal, type }) => {
        const isExpanded = expandedProposals.has(proposal.id);
        const groupMembers = groupMembersMap[proposal.id] || [];
        
        return (
            <View style={[styles.proposalCard, { backgroundColor: currentColors.surface }]}>
                <TouchableOpacity
                    style={styles.proposalHeader}
                    onPress={() => toggleProposalExpansion(proposal.id)}
                >
                    <View style={styles.proposalInfo}>
                        <Text style={[styles.proposalTitle, { color: currentColors.text }]}>
                            {proposal.message || '제안 메시지'}
                        </Text>
                        <Text style={[styles.proposalDate, { color: currentColors.textSecondary }]}>
                            {new Date(proposal.created_at).toLocaleDateString()}
                        </Text>
                    </View>
                    <View style={[styles.statusBadge, { 
                        backgroundColor: proposal.status === 'pending' ? currentColors.warning : 
                                   proposal.status === 'accepted' ? currentColors.success : 
                                   currentColors.error 
                    }]}>
                        <Text style={[styles.statusText, { color: currentColors.onPrimary }]}>
                            {proposal.status === 'pending' ? '대기중' : 
                             proposal.status === 'accepted' ? '수락됨' : '거절됨'}
                        </Text>
                    </View>
                    <Ionicons 
                        name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                        size={24} 
                        color={currentColors.textSecondary} 
                    />
                </TouchableOpacity>
                
                {isExpanded && (
                    <View style={styles.expandedContent}>
                        {type === 'sent' && groupMembers.length > 0 && (
                            <View style={styles.membersSection}>
                                <Text style={[styles.sectionTitle, { color: currentColors.text }]}>
                                    제안 대상
                                </Text>
                                <View style={styles.membersList}>
                                    {groupMembers.map((member, idx) => (
                                        <View key={idx} style={styles.memberItem}>
                                            <View style={[styles.avatar, { backgroundColor: currentColors.primaryLight }]}>
                                                <Text style={[styles.avatarText, { color: currentColors.primary }]}>
                                                    {member.nickname ? member.nickname.charAt(0) : '?'}
                                                </Text>
                                            </View>
                                            <Text style={[styles.memberName, { color: currentColors.text }]}>
                                                {member.nickname || '알 수 없음'}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}
                        
                        {type === 'received' && proposal.status === 'pending' && (
                            <View style={styles.actionButtons}>
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: currentColors.success }]}
                                    onPress={() => handleAcceptProposal(proposal.id)}
                                >
                                    <Text style={[styles.actionButtonText, { color: currentColors.onSuccess }]}>
                                        수락하기
                                    </Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: currentColors.error }]}
                                    onPress={() => handleRejectProposal(proposal.id)}
                                >
                                    <Text style={[styles.actionButtonText, { color: currentColors.onError }]}>
                                        거절하기
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}
            </View>
        );
    };

    const renderConfirmedGroup = ({ item: group }) => (
        <View style={[styles.confirmedGroupCard, { backgroundColor: currentColors.surface }]}>
            <Text style={[styles.groupTitle, { color: currentColors.text }]}>
                🎉 {group.restaurant_name}
            </Text>
            <Text style={[styles.groupInfo, { color: currentColors.textSecondary }]}>
                📅 {group.party_date} • 👥 {group.current_members}명
            </Text>
            <TouchableOpacity
                style={[styles.viewButton, { backgroundColor: currentColors.primary }]}
                onPress={() => navigation.navigate('PartyDetail', { partyId: group.id })}
            >
                <Text style={[styles.viewButtonText, { color: currentColors.onPrimary }]}>
                    상세보기
                </Text>
            </TouchableOpacity>
        </View>
    );

    if (loading) {
        return (
            <SafeAreaView style={[styles.safeArea, { backgroundColor: currentColors.background }]}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={currentColors.primary} />
                    <Text style={[styles.loadingText, { color: currentColors.textSecondary }]}>
                        제안 목록을 불러오는 중...
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: currentColors.background }]}>
            <ScrollView style={styles.container}>
                {/* 성사된 그룹 섹션 */}
                {confirmedGroups.length > 0 && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: currentColors.text }]}>
                            🎉 성사된 그룹
                        </Text>
                        <FlatList
                            data={confirmedGroups}
                            renderItem={renderConfirmedGroup}
                            keyExtractor={(item, index) => `confirmed-${index}`}
                            scrollEnabled={false}
                            contentContainerStyle={styles.confirmedGroupsList}
                        />
                    </View>
                )}

                {/* 받은 제안 섹션 */}
                {proposals.received_proposals.length > 0 && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: currentColors.text }]}>
                            📥 받은 제안
                        </Text>
                        <FlatList
                            data={proposals.received_proposals}
                            renderItem={(item) => renderProposalItem({ ...item, type: 'received' })}
                            keyExtractor={(item, index) => `received-${index}`}
                            scrollEnabled={false}
                            contentContainerStyle={styles.proposalsList}
                        />
                    </View>
                )}

                {/* 보낸 제안 섹션 */}
                {proposals.sent_proposals.length > 0 && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: currentColors.text }]}>
                            📤 보낸 제안
                        </Text>
                        <FlatList
                            data={proposals.sent_proposals}
                            renderItem={(item) => renderProposalItem({ ...item, type: 'sent' })}
                            keyExtractor={(item, index) => `sent-${index}`}
                            scrollEnabled={false}
                            contentContainerStyle={styles.proposalsList}
                        />
                    </View>
                )}

                {/* 빈 상태 */}
                {proposals.sent_proposals.length === 0 && 
                 proposals.received_proposals.length === 0 && 
                 confirmedGroups.length === 0 && (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="mail-outline" size={64} color={currentColors.textSecondary} />
                        <Text style={[styles.emptyText, { color: currentColors.textSecondary }]}>
                            제안이 없습니다
                        </Text>
                        <Text style={[styles.emptySubtext, { color: currentColors.textSecondary }]}>
                            랜덤런치에서 새로운 그룹을 제안해보세요
                        </Text>
                    </View>
                )}
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
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
        paddingHorizontal: 20,
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
        textAlign: 'center',
    },
    confirmedGroupsList: {
        paddingHorizontal: 20,
        gap: 12,
    },
    confirmedGroupCard: {
        borderRadius: 16,
        padding: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    groupTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    groupInfo: {
        fontSize: 14,
        marginBottom: 12,
    },
    viewButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    viewButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    proposalsList: {
        paddingHorizontal: 20,
        gap: 12,
    },
    proposalCard: {
        borderRadius: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    proposalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12,
    },
    proposalInfo: {
        flex: 1,
    },
    proposalTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    proposalDate: {
        fontSize: 12,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    expandedContent: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        gap: 16,
    },
    membersSection: {
        gap: 8,
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
});
