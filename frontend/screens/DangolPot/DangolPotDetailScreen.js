import React, { useState, useCallback } from 'react';
import {
    Text,
    View,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    ActivityIndicator,
    Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { RENDER_SERVER_URL } from '../../config';

// 컨텍스트
import { useMission } from '../../contexts/MissionContext';

export default function DangolPotDetailScreen({ route, navigation, currentColors, currentUser }) {
    const { potId } = route.params;
    const [pot, setPot] = useState(null);
    const [isMember, setIsMember] = useState(false);
    
    // MissionContext 사용
    const { handleActionCompletion } = useMission();

    const fetchDetails = useCallback(() => {
        fetch(`${RENDER_SERVER_URL}/dangolpots/${potId}`).then(res => res.json()).then(data => {
            setPot(data);
            setIsMember(data.members.some(m => m.employee_id === currentUser?.employee_id || '1'));
        }).catch(console.error);
    }, [potId, currentUser]);

    useFocusEffect(useCallback(() => {
        fetchDetails();
    }, [fetchDetails]));

    const handleJoin = async () => {
        const response = await fetch(`${RENDER_SERVER_URL}/dangolpots/${pot.id}/join`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ employee_id: currentUser?.employee_id || '1' }) 
        });
        
        if (response.ok) { 
            Alert.alert("성공", "단골파티에 가입했습니다!");
            
            // 미션 달성 체크: 단골파티 참여
            handleActionCompletion('dangol_party_join');
            
            fetchDetails(); 
        } else { 
            Alert.alert("오류", "가입에 실패했습니다."); 
        }
    };

    const handleDeletePot = async () => {
        Alert.alert(
            '단골파티 삭제',
            '정말로 이 단골파티를 삭제하시겠습니까?',
            [
                { text: '취소', style: 'cancel' },
                { text: '삭제', style: 'destructive', onPress: async () => {
                    try {
                        const response = await fetch(`${RENDER_SERVER_URL}/dangolpots/${pot.id}?employee_id=${currentUser?.employee_id || '1'}`, { method: 'DELETE' });
                        const data = await response.json();
                        if (response.ok) {
                            Alert.alert('성공', '단골파티가 삭제되었습니다.');
                            navigation.goBack();
                        } else {
                            Alert.alert('오류', data.message || '단골파티 삭제에 실패했습니다.');
                        }
                    } catch (e) {
                        Alert.alert('오류', '단골파티 삭제에 실패했습니다.');
                    }
                }}
            ]
        );
    };
    
    if (!pot) return <View style={styles.centerView}><ActivityIndicator size="large" color={currentColors.primary} /></View>;

    const isHost = pot.host_id === (currentUser?.employee_id || '1');

    const renderActionButtons = () => {
        if (isMember) {
            return (
                <View>
                    <TouchableOpacity 
                        style={styles.submitButton} 
                        onPress={() => navigation.navigate('ChatRoom', { 
                            chatId: pot.id, 
                            chatType: 'dangolpot', 
                            chatTitle: pot.name 
                        })}
                    >
                        <Text style={styles.textStyle}>채팅방으로 이동</Text>
                    </TouchableOpacity>
                    {isHost && (
                        <>
                            <TouchableOpacity 
                                style={[styles.submitButton, {marginTop: 10, backgroundColor: currentColors.gray}]} 
                                onPress={() => navigation.navigate('EditDangolPot', { potData: pot })}
                            >
                                <Text style={[styles.submitButtonText, {color: currentColors.white}]}>단골파티 정보 수정</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.submitButton, {marginTop: 10, backgroundColor: currentColors.red}]} 
                                onPress={handleDeletePot}
                            >
                                <Text style={[styles.submitButtonText, {color: currentColors.white}]}>단골파티 삭제</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            );
        }
        return (
            <TouchableOpacity style={styles.submitButton} onPress={handleJoin}>
                <Text style={styles.submitButtonText}>가입하기</Text>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.detailContainer}>
                {/* 단골파티 제목 카드 */}
                <View style={styles.partyDetailCard}>
                    <View style={styles.titleRow}>
                        <Text style={[styles.partyTitle, { color: currentColors.text }]}>{pot.name}</Text>
                        <View style={[styles.categoryTag, { backgroundColor: currentColors.primaryLight }]}>
                            <Text style={[styles.categoryText, { color: currentColors.primary }]}>{pot.category}</Text>
                        </View>
                    </View>
                    <Text style={[styles.partyDescription, { color: currentColors.textSecondary }]}>{pot.description}</Text>
                    <Text style={[styles.partyTags, { color: currentColors.textSecondary }]}>{pot.tags}</Text>
                </View>

                {/* 단골파티 정보 카드 */}
                <View style={styles.infoCard}>
                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: currentColors.textSecondary }]}>개설자:</Text>
                        <Text style={[styles.infoValue, { color: currentColors.text }]}>{pot.host_name}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: currentColors.textSecondary }]}>멤버 수:</Text>
                        <Text style={[styles.infoValue, { color: currentColors.text }]}>{pot.member_count}명</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: currentColors.textSecondary }]}>개설일:</Text>
                        <Text style={[styles.infoValue, { color: currentColors.text }]}>{pot.created_at}</Text>
                    </View>
                </View>

                {/* 멤버 목록 카드 */}
                <View style={styles.membersCard}>
                    <Text style={[styles.sectionTitle, { color: currentColors.text }]}>멤버 목록</Text>
                    {pot.members && pot.members.map((member, index) => (
                        <View key={index} style={styles.memberItem}>
                            <Text style={[styles.memberName, { color: currentColors.text }]}>{member.name}</Text>
                            <Text style={[styles.memberRole, { color: currentColors.textSecondary }]}>
                                {member.employee_id === pot.host_id ? '개설자' : '멤버'}
                            </Text>
                        </View>
                    ))}
                </View>

                {/* 액션 버튼 */}
                <View style={styles.actionContainer}>
                    {renderActionButtons()}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    detailContainer: {
        padding: 16,
        paddingBottom: 32,
    },
    centerView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    partyDetailCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    partyTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        flex: 1,
        marginRight: 12,
    },
    categoryTag: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    categoryText: {
        fontSize: 12,
        fontWeight: '600',
    },
    partyDescription: {
        fontSize: 16,
        marginBottom: 8,
        lineHeight: 22,
    },
    partyTags: {
        fontSize: 14,
        fontStyle: 'italic',
    },
    infoCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    infoLabel: {
        fontSize: 16,
        fontWeight: '500',
    },
    infoValue: {
        fontSize: 16,
        fontWeight: '600',
    },
    membersCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    memberItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    memberName: {
        fontSize: 16,
        fontWeight: '500',
    },
    memberRole: {
        fontSize: 14,
        fontStyle: 'italic',
    },
    actionContainer: {
        marginTop: 24,
    },
    submitButton: {
        backgroundColor: '#3B82F6',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 12,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    textStyle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
