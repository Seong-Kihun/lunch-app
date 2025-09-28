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
    FlatList,
    TextInput,
    Modal
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { RENDER_SERVER_URL } from '../../../config';

// 컨텍스트
import { useAuth } from '../../../contexts/AuthContext';

export default function IntelligentSchedulingScreen({ navigation, currentColors, currentUser }) {
    const { user } = useAuth();
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSuggestion, setSelectedSuggestion] = useState(null);
    const [showVoteModal, setShowVoteModal] = useState(false);
    const [voteReason, setVoteReason] = useState('');
    const [voting, setVoting] = useState(false);

    useEffect(() => {
        fetchIntelligentSuggestions();
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchIntelligentSuggestions();
        }, [])
    );

    const fetchIntelligentSuggestions = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${RENDER_SERVER_URL}/voting/intelligent-suggestions?employee_id=${currentUser?.employee_id || '1'}`);
            const data = await response.json();
            if (response.ok && Array.isArray(data)) {
                setSuggestions(data);
            } else {
                console.error('지능형 스케줄링 제안 조회 실패:', data.message);
            }
        } catch (error) {
            console.error('지능형 스케줄링 제안 조회 오류:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleVote = async (suggestionId, voteType) => {
        if (!voteReason.trim()) {
            Alert.alert('알림', '투표 이유를 입력해주세요.');
            return;
        }

        try {
            setVoting(true);
            const response = await fetch(`${RENDER_SERVER_URL}/voting/vote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    suggestion_id: suggestionId,
                    employee_id: user.employee_id,
                    vote_type: voteType,
                    reason: voteReason.trim()
                })
            });

            const data = await response.json();
            if (response.ok) {
                Alert.alert('성공', data.message || '투표가 완료되었습니다.');
                setShowVoteModal(false);
                setVoteReason('');
                setSelectedSuggestion(null);
                fetchIntelligentSuggestions(); // 목록 새로고침
            } else {
                Alert.alert('오류', data.message || '투표에 실패했습니다.');
            }
        } catch (error) {
            console.error('투표 오류:', error);
            Alert.alert('오류', '네트워크에 문제가 발생했습니다.');
        } finally {
            setVoting(false);
        }
    };

    const openVoteModal = (suggestion) => {
        setSelectedSuggestion(suggestion);
        setShowVoteModal(true);
        setVoteReason('');
    };

    const renderSuggestionItem = ({ item: suggestion }) => (
        <View style={[styles.suggestionCard, { backgroundColor: currentColors.surface }]}>
            <View style={styles.suggestionHeader}>
                <Text style={[styles.suggestionTitle, { color: currentColors.text }]}>
                    🗓️ {suggestion.suggested_date}
                </Text>
                <View style={[styles.statusBadge, { 
                    backgroundColor: suggestion.status === 'active' ? currentColors.success : 
                                   suggestion.status === 'pending' ? currentColors.warning : 
                                   currentColors.error 
                }]}>
                    <Text style={[styles.statusText, { color: currentColors.onPrimary }]}>
                        {suggestion.status === 'active' ? '진행중' : 
                         suggestion.status === 'pending' ? '대기중' : '종료됨'}
                    </Text>
                </View>
            </View>

            <Text style={[styles.suggestionDescription, { color: currentColors.textSecondary }]}>
                {suggestion.description || 'AI가 제안한 최적의 점심 시간입니다.'}
            </Text>

            <View style={styles.suggestionStats}>
                <View style={styles.statItem}>
                    <Text style={[styles.statLabel, { color: currentColors.textSecondary }]}>찬성</Text>
                    <Text style={[styles.statValue, { color: currentColors.success }]}>
                        {suggestion.agree_count || 0}
                    </Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={[styles.statLabel, { color: currentColors.textSecondary }]}>반대</Text>
                    <Text style={[styles.statValue, { color: currentColors.error }]}>
                        {suggestion.disagree_count || 0}
                    </Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={[styles.statLabel, { color: currentColors.textSecondary }]}>참여율</Text>
                    <Text style={[styles.statValue, { color: currentColors.primary }]}>
                        {suggestion.participation_rate || 0}%
                    </Text>
                </View>
            </View>

            {suggestion.status === 'active' && (
                <TouchableOpacity
                    style={[styles.voteButton, { backgroundColor: currentColors.primary }]}
                    onPress={() => openVoteModal(suggestion)}
                >
                    <Text style={[styles.voteButtonText, { color: currentColors.onPrimary }]}>
                        투표하기
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );

    if (loading) {
        return (
            <SafeAreaView style={[styles.safeArea, { backgroundColor: currentColors.background }]}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={currentColors.primary} />
                    <Text style={[styles.loadingText, { color: currentColors.textSecondary }]}>
                        지능형 스케줄링 제안을 불러오는 중...
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
                        🤖 지능형 스케줄링
                    </Text>
                    <Text style={[styles.headerSubtitle, { color: currentColors.textSecondary }]}>
                        AI가 분석한 최적의 점심 시간에 투표해보세요
                    </Text>
                </View>

                {suggestions.length > 0 ? (
                    <FlatList
                        data={suggestions}
                        renderItem={renderSuggestionItem}
                        keyExtractor={(item, index) => `suggestion-${index}`}
                        scrollEnabled={false}
                        contentContainerStyle={styles.suggestionsList}
                    />
                ) : (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="bulb-outline" size={64} color={currentColors.textSecondary} />
                        <Text style={[styles.emptyText, { color: currentColors.textSecondary }]}>
                            아직 제안이 없습니다
                        </Text>
                        <Text style={[styles.emptySubtext, { color: currentColors.textSecondary }]}>
                            AI가 새로운 시간을 제안할 때까지 기다려주세요
                        </Text>
                    </View>
                )}
            </ScrollView>

            {/* 투표 모달 */}
            <Modal
                visible={showVoteModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowVoteModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: currentColors.surface }]}>
                        <Text style={[styles.modalTitle, { color: currentColors.text }]}>
                            투표하기
                        </Text>
                        <Text style={[styles.modalSubtitle, { color: currentColors.textSecondary }]}>
                            {selectedSuggestion?.suggested_date} 제안에 대한 의견을 남겨주세요
                        </Text>

                        <TextInput
                            style={[styles.reasonInput, { 
                                backgroundColor: currentColors.background,
                                color: currentColors.text,
                                borderColor: currentColors.border
                            }]}
                            placeholder="투표 이유를 입력하세요..."
                            placeholderTextColor={currentColors.textSecondary}
                            value={voteReason}
                            onChangeText={setVoteReason}
                            multiline
                            numberOfLines={3}
                        />

                        <View style={styles.voteActions}>
                            <TouchableOpacity
                                style={[styles.voteActionButton, { backgroundColor: currentColors.success }]}
                                onPress={() => handleVote(selectedSuggestion?.id, 'agree')}
                                disabled={voting}
                            >
                                <Text style={[styles.voteActionText, { color: currentColors.onSuccess }]}>
                                    찬성
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.voteActionButton, { backgroundColor: currentColors.error }]}
                                onPress={() => handleVote(selectedSuggestion?.id, 'disagree')}
                                disabled={voting}
                            >
                                <Text style={[styles.voteActionText, { color: currentColors.onError }]}>
                                    반대
                            </Text>
                        </TouchableOpacity>
                    </View>
                    
                        <TouchableOpacity
                            style={[styles.cancelButton, { backgroundColor: currentColors.border }]}
                            onPress={() => setShowVoteModal(false)}
                            disabled={voting}
                        >
                            <Text style={[styles.cancelButtonText, { color: currentColors.text }]}>
                                취소
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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
        textAlign: 'center',
    },
    suggestionsList: {
        paddingHorizontal: 20,
        gap: 16,
    },
    suggestionCard: {
        borderRadius: 16,
        padding: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    suggestionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    suggestionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    suggestionDescription: {
        fontSize: 14,
        marginBottom: 16,
        lineHeight: 20,
    },
    suggestionStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 16,
        paddingVertical: 12,
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 12,
    },
    statItem: {
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 12,
        marginBottom: 4,
    },
    statValue: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    voteButton: {
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    voteButtonText: {
        fontSize: 16,
        fontWeight: '600',
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '90%',
        borderRadius: 20,
        padding: 24,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    modalSubtitle: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 20,
    },
    reasonInput: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        marginBottom: 20,
        textAlignVertical: 'top',
    },
    voteActions: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    voteActionButton: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    voteActionText: {
        fontSize: 16,
        fontWeight: '600',
    },
    cancelButton: {
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
});
