import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, ScrollView, SafeAreaView, StyleSheet, Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import appService from '../services/AppService';
import{ COLORS } from '../../../utils/colors';
import { useMission } from '../../../contexts/MissionContext';

// 안전한 내비게이션 함수
const safeNavigateToTab = (navigation, tabName, screenName = null, params = {}, replace = false) => {
    try {
        if (screenName) {
            navigation.navigate(tabName, { screen: screenName, params });
        } else {
            navigation.navigate(tabName);
        }
    } catch (error) {
        console.error('Navigation error:', error);
    }
};

export default function PartyDetailScreen({ route, navigation }) {
    const { partyId, partyData } = route.params;
    const [party, setParty] = useState(partyData || null);
    
    // MissionContext 사용
    const { handleActionCompletion } = useMission();
    
    const fetchPartyDetails = useCallback(() => { 
        // 🚨 중요: 로컬에서 파티 데이터를 먼저 확인
        if (partyData) {
            console.log('🔍 [파티상세] 로컬 파티 데이터 사용:', partyData);
            setParty(partyData);
            return;
        }
        
        // 로컬에 없으면 서버에서 가져오기
        console.log('🔍 [파티상세] 서버에서 파티 데이터 가져오기:', partyId);
        appService.get(`/parties/${partyId}).then(res => res.json()).then(setParty).catch(err => { console.error(err); setParty(null); });
    }, [partyId, partyData]);

    useFocusEffect(useCallback(() => {
        fetchPartyDetails();
    }, [fetchPartyDetails]));

    const currentColors = global.currentColors || COLORS.light;
    
    // 현대적인 스타일 정의
    const styles = StyleSheet.create({
        safeArea: { 
            flex: 1, 
            backgroundColor: currentColors.background 
        },
        container: {
            flex: 1,
        },
        scrollContent: {
            paddingBottom: 20,
        },
        centerView: { 
            flex: 1, 
            justifyContent: `)'center', 
            alignItems: 'center', 
            padding: 20, 
            backgroundColor: currentColors.background 
        },
        
        // 헤더 섹션
        headerSection: {
            padding: 20,
            paddingBottom: 4,
        },
        partyTitle: {
            fontSize: 24,
            fontWeight: '700',
            lineHeight: 32,
        },
        
        // 카드 공통 스타일
        infoCard: {
            marginHorizontal: 16, 
            marginTop: 0,
            marginBottom: 16, 
            borderRadius: 16,
            padding: 20,
            borderWidth: 1,
            elevation: 2,
            shadowColor: currentColors.primary,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1, 
            shadowRadius: 4,
        },
        membersCard: {
            marginHorizontal: 16,
            marginBottom: 16,
            borderRadius: 16,
            padding: 20,
            borderWidth: 1,
            elevation: 2,
            shadowColor: currentColors.primary,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
        },
        cardHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 16,
        },
        cardTitle: {
            fontSize: 18,
            fontWeight: '600',
            flex: 1,
        },
        
        // 파티 제목 섹션
        partyTitleSection: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: 16,
            marginBottom: 16,
            borderRadius: 12,
            borderWidth: 1,
        },
        partyTitleContent: {
            flex: 1,
        },
        partyTitleText: {
            fontSize: 18,
            fontWeight: '700',
            lineHeight: 24,
        },
        
        // 파티 정보 그리드
        infoGrid: {
            gap: 16,
        },
        infoItem: {
            flexDirection: 'row',
            alignItems: 'flex-start',
        },
        infoIcon: {
            width: 40,
            height: 40,
            borderRadius: 20,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
        },
        infoContent: {
            flex: 1,
        },
        infoLabel: {
            fontSize: 14,
            fontWeight: '500',
            marginBottom: 4,
        },
        infoValue: {
            fontSize: 16,
            fontWeight: '600',
            lineHeight: 22,
        },
        
        // 참여자 목록
        memberCountBadge: {
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 12,
        },
        memberCountText: {
            fontSize: 12,
            fontWeight: '600',
        },
        membersList: {
            gap: 12,
        },
        memberItem: {
            borderRadius: 12,
            borderWidth: 1,
            padding: 16,
        },
        memberContent: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        memberAvatar: {
            width: 44,
            height: 44,
            borderRadius: 22,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
        },
        avatarText: {
            fontSize: 18,
            fontWeight: '700',
            color: '#FFFFFF',
        },
        memberInfo: {
            flex: 1,
        },
        memberHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 4,
        },
        memberName: {
            fontSize: 16,
            fontWeight: '600',
            flex: 1,
        },
        hostBadge: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 12,
        },
        hostBadgeText: {
            fontSize: 12,
            fontWeight: '600',
            color: '#FFFFFF',
            marginLeft: 4,
        },
        memberDetails: {
            gap: 2,
        },
        memberDetail: {
            fontSize: 13,
            lineHeight: 18,
        },
        emptyMembers: {
            alignItems: 'center',
            paddingVertical: 32,
        },
        emptyMembersText: {
            fontSize: 16,
            marginTop: 12,
            fontWeight: '500',
        },
        
        // 액션 버튼들
        actionSection: {
            paddingHorizontal: 16,
            paddingBottom: 20,
        },
        actionButtonsContainer: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 12,
        },
        
        // 기본 액션 버튼 스타일
        actionButton: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
            flex: 1,
            minWidth: 120,
        },
        actionButtonText: {
            fontSize: 14,
            fontWeight: '600',
            color: '#FFFFFF',
            marginLeft: 6,
        },
        
        // 버튼 타입별 색상
        buttonPrimary: {
            backgroundColor: '#3B82F6', // 파란색 - 참여하기
        },
        buttonSecondary: {
            backgroundColor: '#6B7280', // 회색 - 수정
        },
        buttonSuccess: {
            backgroundColor: '#10B981', // 초록색 - 채팅방 입장
        },
        buttonDanger: {
            backgroundColor: '#EF4444', // 빨간색 - 삭제
        },
        buttonWarning: {
            backgroundColor: '#F59E0B', // 주황색 - 나가기
        },
        buttonDisabled: {
            backgroundColor: '#9CA3AF', // 회색 - 비활성화
            opacity: 0.6,
        },
        
        // 기존 스타일 (호환성을 위해 유지)
        primaryButton: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 16,
            paddingHorizontal: 24,
            borderRadius: 12,
            elevation: 2,
            shadowColor: currentColors.primary,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
        },
        primaryButtonText: {
            fontSize: 16,
            fontWeight: '600',
            color: '#FFFFFF',
            marginLeft: 8,
        },
        secondaryButton: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 16,
            paddingHorizontal: 24,
            borderRadius: 12,
            borderWidth: 2,
            backgroundColor: 'transparent',
        },
        secondaryButtonText: {
            fontSize: 16,
            fontWeight: '600',
            marginLeft: 8,
        },
        fullPartyContainer: {
            alignItems: 'center',
            paddingVertical: 32,
        },
        fullPartyText: {
            fontSize: 16,
            marginTop: 12,
            fontWeight: '500',
        },
    });

    if (!party) return <View style={styles.centerView}><ActivityIndicator size="large" color={currentColors.primary}/></View>;

    // 백엔드 응답 구조에 맞춰 수정: host 객체 사용 (기존 변수는 제거됨)

    const handleJoinParty = async () => {
        const response = await appService.get(`/parties/${party.id}/join, { method: `)'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employee_id: global.myEmployeeId }) });
        const data = await response.json();
        Alert.alert("알림", data.message);
        if(response.ok) fetchPartyDetails();
    };

    const handleLeaveParty = async () => {
        Alert.alert(
            '파티 나가기',
            '정말로 이 파티에서 나가시겠습니까?',
            [
                { text: '취소', style: 'cancel' },
                { text: '나가기', style: 'destructive', onPress: async () => {
                    try {
                        const response = await appService.get(`/parties/${party.id}/leave, { 
                            method: `)'POST', 
                            headers: { 'Content-Type': 'application/json' }, 
                            body: JSON.stringify({ employee_id: global.myEmployeeId }) 
                        });
                        const data = await response.json();
                        if (response.ok) {
                            Alert.alert('성공', '파티에서 나갔습니다.');
                            navigation.goBack();
                        } else {
                            Alert.alert('오류', data.message || '파티 나가기에 실패했습니다.');
                        }
                    } catch (e) {
                        Alert.alert('오류', '파티 나가기에 실패했습니다.');
                    }
                }}
            ]
        );
    };

    // 파티 삭제 핸들러
    const handleDeleteParty = async () => {
        Alert.alert(
            '파티 삭제',
            '정말로 이 파티를 삭제하시겠습니까?',
            [
                { text: '취소', style: 'cancel' },
                { text: '삭제', style: 'destructive', onPress: async () => {
                    try {
                        const response = await appService.get(`/parties/${party.id}?employee_id=${global.myEmployeeId}, { method: `)'DELETE' });
                        const data = await response.json();
                        if (response.ok) {
                            // 로컬 상태 업데이트
                            try {
                                // AsyncStorage 업데이트
                                const myPartiesData = await AsyncStorage.getItem('@my_parties');
                                if (myPartiesData) {
                                    const myParties = JSON.parse(myPartiesData);
                                    const updatedMyParties = myParties.filter(p => p.id !== party.id);
                                    await AsyncStorage.setItem('@my_parties', JSON.stringify(updatedMyParties));
                                }
                                
                                const allPartiesData = await AsyncStorage.getItem('@all_parties');
                                if (allPartiesData) {
                                    const allParties = JSON.parse(allPartiesData);
                                    const updatedAllParties = allParties.filter(p => p.id !== party.id);
                                    await AsyncStorage.setItem('@all_parties', JSON.stringify(updatedAllParties));
                                }
                            } catch (storageError) {
                                console.error('로컬 상태 업데이트 실패:', storageError);
                            }
                            
                            Alert.alert('성공', '파티가 삭제되었습니다.');
                            navigation.goBack();
                        } else {
                            Alert.alert('오류', data.message || '파티 삭제에 실패했습니다.');
                        }
                    } catch (e) {
                        console.error('파티 삭제 오류:', e);
                        Alert.alert('오류', '파티 삭제에 실패했습니다.');
                    }
                }}
            ]
        );
    };

    // 현재 사용자 상태 확인
    const currentUserId = global.currentUser?.employee_id || '1';
    const isHost = party.host?.employee_id === currentUserId;
    const isParticipant = isHost; // 현재는 호스트만 참여자로 간주
    const isPartyJoinable = party.current_members < party.max_members;
    const isPartyInFuture = () => {
        if (!party.party_date) return true;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const partyDate = new Date(party.party_date);
        partyDate.setHours(0, 0, 0, 0);
        return partyDate >= today;
    };

    const renderActionButtons = () => {
        // 파티장인 경우
        if (isHost) {
            return (
                <View style={styles.actionButtonsContainer}>
                    <TouchableOpacity 
                        style={[styles.actionButton, styles.buttonSuccess]} 
                        onPress={() => safeNavigateToTab(navigation, '소통', 'ChatRoom', { chatId: party.id, chatType: 'party', chatTitle: party.title })}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="chatbubble-outline" size={18} color="#FFFFFF" />
                        <Text style={styles.actionButtonText}>채팅방 입장</Text>
                    </TouchableOpacity>
                    
                    {!party.is_from_match && (
                        <>
                            <TouchableOpacity 
                                style={[styles.actionButton, styles.buttonSecondary]} 
                                onPress={() => navigation.navigate('EditParty', { partyData: party })}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="create-outline" size={18} color="#FFFFFF" />
                                <Text style={styles.actionButtonText}>파티 수정</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.actionButton, styles.buttonDanger]} 
                                onPress={handleDeleteParty}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
                                <Text style={styles.actionButtonText}>파티 삭제</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            );
        }
        
        // 참여자인 경우
        if (isParticipant) {
            return (
                <View style={styles.actionButtonsContainer}>
                    <TouchableOpacity 
                        style={[styles.actionButton, styles.buttonSuccess]} 
                        onPress={() => safeNavigateToTab(navigation, '소통', 'ChatRoom', { chatId: party.id, chatType: 'party', chatTitle: party.title })}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="chatbubble-outline" size={18} color="#FFFFFF" />
                        <Text style={styles.actionButtonText}>채팅방 입장</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.actionButton, styles.buttonWarning]} 
                        onPress={handleLeaveParty}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="exit-outline" size={18} color="#FFFFFF" />
                        <Text style={styles.actionButtonText}>파티 나가기</Text>
                    </TouchableOpacity>
                </View>
            );
        }
        
        // 비참여자인 경우
        if (isPartyJoinable && isPartyInFuture()) {
            return (
                <View style={styles.actionButtonsContainer}>
                    <TouchableOpacity 
                        style={[styles.actionButton, styles.buttonPrimary]} 
                        onPress={handleJoinParty}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
                        <Text style={styles.actionButtonText}>파티 참여하기</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.actionButton, styles.buttonSuccess]} 
                        onPress={() => safeNavigateToTab(navigation, '소통', 'ChatRoom', { chatId: party.id, chatType: 'party', chatTitle: party.title })}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="chatbubble-outline" size={18} color="#FFFFFF" />
                        <Text style={styles.actionButtonText}>채팅방 입장</Text>
                    </TouchableOpacity>
                </View>
            );
        }
        
        // 참여 불가능한 경우
        return (
            <View style={styles.actionButtonsContainer}>
                <TouchableOpacity 
                    style={[styles.actionButton, styles.buttonDisabled]} 
                    disabled={true}
                    activeOpacity={0.8}
                >
                    <Ionicons name="lock-closed-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>
                        {!isPartyInFuture() ? '이미 지난 파티입니다' : '인원이 가득 찼습니다'}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView 
                style={styles.container}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* 헤더 섹션 - 빈 공간으로 여백 제공 */}
                <View style={styles.headerSection} />

                {/* 파티 정보 카드 */}
                <View style={[styles.infoCard, { backgroundColor: currentColors.surface, borderColor: currentColors.border }]}>
                    <View style={styles.cardHeader}>
                        <Text style={[styles.cardTitle, { color: currentColors.text }]}>파티 정보</Text>
                    </View>
                    
                    {/* 파티 제목 섹션 */}
                    <View style={[styles.partyTitleSection, { backgroundColor: currentColors.primaryLight, borderColor: currentColors.border }]}>
                        <View style={styles.partyTitleContent}>
                            <Text style={[styles.partyTitleText, { color: currentColors.text }]} numberOfLines={2}>
                                {party.title}
                            </Text>
                        </View>
                    </View>
                    
                    <View style={styles.infoGrid}>
                        <View style={styles.infoItem}>
                            <View style={[styles.infoIcon, { backgroundColor: currentColors.primaryLight }]}>
                                <Ionicons name="calendar-outline" size={20} color={currentColors.primary} />
                            </View>
                            <View style={styles.infoContent}>
                                <Text style={[styles.infoLabel, { color: currentColors.textSecondary }]}>날짜</Text>
                                <Text style={[styles.infoValue, { color: currentColors.text }]}>
                                    {party.party_date || '날짜 미정'}
                                </Text>
                            </View>
                        </View>
                        
                        <View style={styles.infoItem}>
                            <View style={[styles.infoIcon, { backgroundColor: currentColors.primaryLight }]}>
                                <Ionicons name="time-outline" size={20} color={currentColors.primary} />
                            </View>
                            <View style={styles.infoContent}>
                                <Text style={[styles.infoLabel, { color: currentColors.textSecondary }]}>만나는 시간</Text>
                                <Text style={[styles.infoValue, { color: currentColors.text }]}>
                                    {party.party_time || '시간 미정'}
                                </Text>
                            </View>
                        </View>
                        
                        <View style={styles.infoItem}>
                            <View style={[styles.infoIcon, { backgroundColor: currentColors.primaryLight }]}>
                                <Ionicons name="restaurant-outline" size={20} color={currentColors.primary} />
                            </View>
                            <View style={styles.infoContent}>
                                <Text style={[styles.infoLabel, { color: currentColors.textSecondary }]}>식당</Text>
                                <Text style={[styles.infoValue, { color: currentColors.text }]} numberOfLines={2}>
                                    {party.restaurant_name || '구내식당'}
                                </Text>
                            </View>
                        </View>
                        
                        <View style={styles.infoItem}>
                            <View style={[styles.infoIcon, { backgroundColor: currentColors.primaryLight }]}>
                                <Ionicons name="location-outline" size={20} color={currentColors.primary} />
                            </View>
                            <View style={styles.infoContent}>
                                <Text style={[styles.infoLabel, { color: currentColors.textSecondary }]}>만나는 장소</Text>
                                <Text style={[styles.infoValue, { color: currentColors.text }]} numberOfLines={2}>
                                    {party.meeting_location || party.location || '장소 미정'}
                                </Text>
                            </View>
                        </View>
                        
                        <View style={styles.infoItem}>
                            <View style={[styles.infoIcon, { backgroundColor: currentColors.primaryLight }]}>
                                <Ionicons name="people-outline" size={20} color={currentColors.primary} />
                            </View>
                            <View style={styles.infoContent}>
                                <Text style={[styles.infoLabel, { color: currentColors.textSecondary }]}>인원</Text>
                                <Text style={[styles.infoValue, { color: currentColors.text }]}>
                                    {party.current_members} / {party.max_members}명
                                </Text>
                            </View>
                        </View>
                        
                        {/* 설명이 있는 경우에만 표시 */}
                        {party.description && party.description.trim() && (
                            <View style={styles.infoItem}>
                                <View style={[styles.infoIcon, { backgroundColor: currentColors.primaryLight }]}>
                                    <Ionicons name="document-text-outline" size={20} color={currentColors.primary} />
                                </View>
                                <View style={styles.infoContent}>
                                    <Text style={[styles.infoLabel, { color: currentColors.textSecondary }]}>설명</Text>
                                    <Text style={[styles.infoValue, { color: currentColors.text }]} numberOfLines={3}>
                                        {party.description}
                                    </Text>
                                </View>
                            </View>
                        )}
                    </View>
                </View>

                {/* 참여자 목록 카드 */}
                <View style={[styles.membersCard, { backgroundColor: currentColors.surface, borderColor: currentColors.border }]}>
                    <View style={styles.cardHeader}>
                        <Text style={[styles.cardTitle, { color: currentColors.text }]}>참여자</Text>
                        <View style={[styles.memberCountBadge, { backgroundColor: currentColors.primaryLight }]}>
                            <Text style={[styles.memberCountText, { color: currentColors.primary }]}>
                                {party.members?.length || 0}명
                            </Text>
                        </View>
                    </View>
                    
                    {party.members && Array.isArray(party.members) && party.members.length > 0 ? (
                        <View style={styles.membersList}>
                            {party.members.map((member, index) => (
                        <TouchableOpacity 
                                    key={member.employee_id} 
                                    style={[styles.memberItem, { borderColor: currentColors.border }]}
                                    onPress={() => safeNavigateToTab(navigation, '친구', 'UserProfile', { employeeId: member.employee_id })}
                                    activeOpacity={0.7}
                        >
                            <View style={styles.memberContent}>
                                        <View style={[styles.memberAvatar, { backgroundColor: currentColors.primary }]}>
                                    <Text style={styles.avatarText}>
                                                {(member.nickname || member.name) ? (member.nickname || member.name).charAt(0).toUpperCase() : '?'}
                                    </Text>
                                </View>
                                
                                <View style={styles.memberInfo}>
                                    <View style={styles.memberHeader}>
                                                <Text style={[styles.memberName, { color: currentColors.text }]}>
                                                    {member.nickname || member.name || '이름 없음'}
                                        </Text>
                                                {member.employee_id === party.host?.employee_id && (
                                                    <View style={[styles.hostBadge, { backgroundColor: currentColors.secondary }]}>
                                                        <Ionicons name="star" size={12} color="#FFFFFF" />
                                                        <Text style={styles.hostBadgeText}>팟장</Text>
                                                    </View>
                                        )}
                                    </View>
                                            
                                            {(member.lunch_preference || member.main_dish_genre) && (
                                        <View style={styles.memberDetails}>
                                                    {member.lunch_preference && (
                                                        <Text style={[styles.memberDetail, { color: currentColors.textSecondary }]}>
                                                            🍽️ {member.lunch_preference}
                                                        </Text>
                                                    )}
                                                    {member.main_dish_genre && (
                                                        <Text style={[styles.memberDetail, { color: currentColors.textSecondary }]}>
                                                            🍜 {member.main_dish_genre}
                                                        </Text>
                                                    )}
                                                </View>
                                            )}
                                        </View>
                                        
                                        <Ionicons name="chevron-forward" size={16} color={currentColors.textSecondary} />
                            </View>
                        </TouchableOpacity>
                            ))}
                        </View>
                    ) : (
                        <View style={styles.emptyMembers}>
                            <Ionicons name="people-outline" size={48} color={currentColors.textSecondary} />
                            <Text style={[styles.emptyMembersText, { color: currentColors.textSecondary }]}>
                                참여자가 없습니다
                        </Text>
                        </View>
                    )}
                </View>

                {/* 액션 버튼들 */}
                <View style={styles.actionSection}>
                    {renderActionButtons()}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
