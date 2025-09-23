import React, { useState, useEffect } from 'react';
import {
    View, 
    Text, 
    SafeAreaView, 
    TextInput, 
    TouchableOpacity, 
    ScrollView, 
    Alert,
    StyleSheet,
    ActivityIndicator,
    Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RENDER_SERVER_URL } from '../../../config';
import { getAccessToken } from '../../../utils/secureStorage';
import COLORS from '../../../components/common/Colors';
import basicStyles from '../../../components/common/BasicStyles';

const { width } = Dimensions.get('window');

const CreateChatRoomScreen = ({ navigation }) => {
    // 통일된 색상 사용
    const currentColors = global.currentColors || COLORS.light;
    
    const [chatTitle, setChatTitle] = useState('');
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [availableMembers, setAvailableMembers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMembers, setIsLoadingMembers] = useState(true);

    // 현재 사용자 정보 가져오기
    const currentUser = global.currentUser || global.myEmployeeId;
    const currentUserId = currentUser?.employee_id || currentUser;

    useEffect(() => {
        loadAvailableMembers();
    }, []);

    const loadAvailableMembers = async () => {
        try {
            setIsLoadingMembers(true);
            
            // 개발 환경에서는 인증 없이 진행
            // 친구 목록 또는 동료 목록을 가져오는 API 호출
            const response = await fetch(`${RENDER_SERVER_URL}/dev/friends/${currentUserId}`, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (response.ok) {
                const data = await response.json();
                setAvailableMembers(data.friends || data || []);
            } else {
                console.warn('친구 목록 로드 실패:', response.status);
                setAvailableMembers([]);
            }
        } catch (error) {
            console.error('친구 목록 로드 오류:', error);
            setAvailableMembers([]);
        } finally {
            setIsLoadingMembers(false);
        }
    };

    const toggleMemberSelection = (member) => {
        setSelectedMembers(prev => {
            const isSelected = prev.some(m => m.employee_id === member.employee_id);
            if (isSelected) {
                return prev.filter(m => m.employee_id !== member.employee_id);
            } else {
                return [...prev, member];
            }
        });
    };

    const createChatRoom = async () => {
        if (!chatTitle.trim()) {
            Alert.alert('오류', '채팅방 제목을 입력해주세요.');
            return;
        }

        if (selectedMembers.length === 0) {
            Alert.alert('오류', '최소 1명 이상의 멤버를 선택해주세요.');
            return;
        }

        try {
            setIsLoading(true);
            
            // 개발 환경에서는 인증 없이 진행
            
            const memberIds = selectedMembers.map(member => member.employee_id);
            
            const response = await fetch(`${RENDER_SERVER_URL}/dev/chat/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: chatTitle.trim(),
                    employee_ids: memberIds
                }),
            });

            if (response.ok) {
                const data = await response.json();
                Alert.alert('성공', '채팅방이 생성되었습니다!', [
                    {
                        text: '확인',
                        onPress: () => {
                            navigation.navigate('ChatRoom', {
                                chatId: data.chat_id,
                                chatType: 'group',
                                chatTitle: chatTitle.trim()
                            });
                        }
                    }
                ]);
            } else {
                const errorData = await response.json().catch(() => ({}));
                Alert.alert('오류', errorData.message || '채팅방 생성에 실패했습니다.');
            }
        } catch (error) {
            console.error('채팅방 생성 오류:', error);
            Alert.alert('오류', '채팅방 생성에 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoadingMembers) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>친구 목록을 불러오는 중...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: currentColors.background }]}>
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                {/* 채팅방 제목 입력 */}
                <View style={[styles.section, { backgroundColor: currentColors.surface }]}>
                    <Text style={[styles.sectionTitle, { color: currentColors.text }]}>채팅방 제목</Text>
                    <View style={[styles.inputContainer, { backgroundColor: currentColors.background }]}>
                        <Ionicons name="chatbubbles" size={20} color={currentColors.textSecondary} style={styles.inputIcon} />
                        <TextInput
                            style={[styles.titleInput, { color: currentColors.text }]}
                            value={chatTitle}
                            onChangeText={setChatTitle}
                            placeholder="채팅방 제목을 입력하세요"
                            placeholderTextColor={currentColors.textSecondary}
                            maxLength={50}
                        />
                    </View>
                </View>

                {/* 멤버 선택 */}
                <View style={[styles.section, { backgroundColor: currentColors.surface }]}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: currentColors.text }]}>멤버 선택</Text>
                        <View style={[styles.memberCount, { backgroundColor: currentColors.primary }]}>
                            <Text style={[styles.memberCountText, { color: currentColors.surface }]}>
                                {selectedMembers.length}명
                            </Text>
                        </View>
                    </View>
                    
                    {availableMembers.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="people-outline" size={64} color={currentColors.lightGray} />
                            <Text style={[styles.emptyText, { color: currentColors.textSecondary }]}>친구가 없습니다.</Text>
                            <Text style={[styles.emptySubText, { color: currentColors.textSecondary }]}>먼저 친구를 추가해주세요.</Text>
                        </View>
                    ) : (
                        <View style={styles.memberList}>
                            {availableMembers.map((member) => {
                                const isSelected = selectedMembers.some(m => m.employee_id === member.employee_id);
                                return (
                                    <TouchableOpacity
                                        key={member.employee_id}
                                        style={[
                                            styles.memberItem,
                                            { backgroundColor: currentColors.background },
                                            isSelected && styles.memberItemSelected
                                        ]}
                                        onPress={() => toggleMemberSelection(member)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.memberAvatar, { backgroundColor: currentColors.primaryLight }]}>
                                            <Ionicons name="person" size={20} color={currentColors.primary} />
                                        </View>
                                        <View style={styles.memberInfo}>
                                            <Text style={[
                                                styles.memberName,
                                                { color: currentColors.text },
                                                isSelected && styles.memberNameSelected
                                            ]}>
                                                {member.nickname || member.name}
                                            </Text>
                                            <Text style={[
                                                styles.memberId,
                                                { color: currentColors.textSecondary },
                                                isSelected && styles.memberIdSelected
                                            ]}>
                                                {member.employee_id}
                                            </Text>
                                        </View>
                                        {isSelected && (
                                            <Ionicons name="checkmark-circle" size={24} color={currentColors.primary} />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* 생성 버튼 */}
            <View style={[styles.buttonContainer, { backgroundColor: currentColors.surface, borderTopColor: currentColors.lightGray }]}>
                <TouchableOpacity
                    style={[
                        styles.createButton,
                        { backgroundColor: currentColors.primary },
                        (!chatTitle.trim() || selectedMembers.length === 0 || isLoading) && styles.createButtonDisabled
                    ]}
                    onPress={createChatRoom}
                    disabled={!chatTitle.trim() || selectedMembers.length === 0 || isLoading}
                    activeOpacity={0.8}
                >
                    {isLoading ? (
                        <ActivityIndicator size="small" color={currentColors.surface} />
                    ) : (
                        <>
                            <Ionicons name="add-circle" size={20} color={currentColors.surface} style={styles.buttonIcon} />
                            <Text style={[styles.createButtonText, { color: currentColors.surface }]}>채팅방 생성</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    container: {
        flex: 1,
        padding: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        fontWeight: '500',
    },
    section: {
        marginBottom: 24,
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    memberCount: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    memberCountText: {
        fontSize: 14,
        fontWeight: '600',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 4,
    },
    inputIcon: {
        marginRight: 12,
    },
    titleInput: {
        flex: 1,
        fontSize: 16,
        paddingVertical: 12,
    },
    memberList: {
        maxHeight: 300,
    },
    memberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 12,
    },
    memberItemSelected: {
        borderColor: '#007AFF',
        backgroundColor: '#E3F2FD',
    },
    memberAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    memberInfo: {
        flex: 1,
    },
    memberName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    memberNameSelected: {
        color: '#007AFF',
    },
    memberId: {
        fontSize: 14,
        fontWeight: '500',
    },
    memberIdSelected: {
        color: '#007AFF',
    },
    emptyContainer: {
        paddingVertical: 60,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubText: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    buttonContainer: {
        padding: 20,
        borderTopWidth: 1,
    },
    createButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 8,
    },
    createButtonDisabled: {
        opacity: 0.5,
    },
    buttonIcon: {
        marginRight: 4,
    },
    createButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
});

export default CreateChatRoomScreen;
