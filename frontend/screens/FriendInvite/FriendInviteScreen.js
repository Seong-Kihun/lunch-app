import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    ScrollView, 
    SafeAreaView, 
    TouchableOpacity, 
    StyleSheet,
    TextInput,
    Alert,
    Share,
    Clipboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import newPointsManager from '../../utils/newPointsManager';
import { useUser } from '../../contexts/UserContext';
import { useMission } from '../../contexts/MissionContext';

const FriendInviteScreen = ({ navigation }) => {
    const { user, isAuthenticated } = useUser();
    const { handleActionCompletion } = useMission();
    const [inviteCode, setInviteCode] = useState('');
    const [inviteStats, setInviteStats] = useState({});
    const [inputCode, setInputCode] = useState('');

    const currentColors = {
        primary: '#3B82F6',
        secondary: '#10B981',
        background: '#F1F5F9',
        surface: '#FFFFFF',
        text: '#1E293B',
        textSecondary: '#64748B',
        border: '#E2E8F0',
        gray: '#64748B',
        lightGray: '#E2E8F0',
        yellow: '#F4D160',
        deepBlue: '#1D5D9B',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444'
    };

    useFocusEffect(
        React.useCallback(() => {
            loadInviteData();
        }, [])
    );

    const loadInviteData = async () => {
        try {
            if (!isAuthenticated) {
                console.log('로그인이 필요합니다.');
                return;
            }

            // 초대 통계 조회
            const stats = await newPointsManager.getInviteStats(user.employee_id);
            if (stats) {
                setInviteStats(stats);
            }
        } catch (error) {
            console.error('초대 데이터 로드 실패:', error);
        }
    };

    const createInvite = async () => {
        try {
            const result = await newPointsManager.createFriendInvite(user.employee_id);
            if (result) {
                setInviteCode(result.invite_code);
                Alert.alert('성공', '초대 링크가 생성되었습니다!');
                
                // 친구 초대하기 미션 완료 처리
                handleActionCompletion('friend_invite_app');
            } else {
                Alert.alert('오류', '초대 링크 생성에 실패했습니다.');
            }
        } catch (error) {
            console.error('초대 링크 생성 실패:', error);
            Alert.alert('오류', '초대 링크 생성에 실패했습니다.');
        }
    };

    const useInviteCode = async () => {
        if (!inputCode.trim()) {
            Alert.alert('알림', '초대 코드를 입력해주세요.');
            return;
        }

        try {
            const result = await newPointsManager.useFriendInvite(inputCode.trim(), user.employee_id);
            if (result) {
                Alert.alert('축하합니다!', result.message);
                setInputCode('');
                loadInviteData(); // 통계 새로고침
            } else {
                Alert.alert('오류', '초대 코드 사용에 실패했습니다.');
            }
        } catch (error) {
            console.error('초대 코드 사용 실패:', error);
            Alert.alert('오류', '초대 코드 사용에 실패했습니다.');
        }
    };

    const shareInviteCode = async () => {
        if (!inviteCode) {
            Alert.alert('알림', '먼저 초대 링크를 생성해주세요.');
            return;
        }

        try {
            await Share.share({
                message: `점심 앱에 초대합니다! 초대 코드: ${inviteCode}`,
                title: '점심 앱 초대'
            });
        } catch (error) {
            console.error('공유 실패:', error);
        }
    };

    const copyInviteCode = async () => {
        if (!inviteCode) {
            Alert.alert('알림', '먼저 초대 링크를 생성해주세요.');
            return;
        }

        try {
            await Clipboard.setString(inviteCode);
            Alert.alert('복사 완료', '초대 코드가 클립보드에 복사되었습니다.');
        } catch (error) {
            console.error('복사 실패:', error);
            Alert.alert('오류', '초대 코드 복사에 실패했습니다.');
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background }]}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* 초대 통계 카드 */}
                <View style={[styles.statsCard, { backgroundColor: currentColors.surface }]}>
                    <Text style={[styles.statsTitle, { color: currentColors.text }]}>초대 통계</Text>
                    <View style={styles.statsGrid}>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: currentColors.primary }]}>
                                {inviteStats.total_invites || 0}
                            </Text>
                            <Text style={[styles.statLabel, { color: currentColors.textSecondary }]}>
                                총 초대
                            </Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: currentColors.success }]}>
                                {inviteStats.successful_invites || 0}
                            </Text>
                            <Text style={[styles.statLabel, { color: currentColors.textSecondary }]}>
                                성공한 초대
                            </Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: currentColors.warning }]}>
                                {inviteStats.pending_invites || 0}
                            </Text>
                            <Text style={[styles.statLabel, { color: currentColors.textSecondary }]}>
                                대기 중
                            </Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: currentColors.secondary }]}>
                                {inviteStats.total_points_earned || 0}P
                            </Text>
                            <Text style={[styles.statLabel, { color: currentColors.textSecondary }]}>
                                획득 포인트
                            </Text>
                        </View>
                    </View>
                </View>

                {/* 초대 링크 생성 섹션 */}
                <View style={[styles.sectionCard, { backgroundColor: currentColors.surface }]}>
                    <Text style={[styles.sectionTitle, { color: currentColors.text }]}>
                        초대 링크 생성
                    </Text>
                    <Text style={[styles.sectionDescription, { color: currentColors.textSecondary }]}>
                        친구를 초대하면 양쪽 모두 50포인트를 획득할 수 있습니다!
                    </Text>
                    
                    <TouchableOpacity 
                        style={[styles.createButton, { backgroundColor: currentColors.primary }]}
                        onPress={createInvite}
                    >
                        <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                        <Text style={styles.createButtonText}>초대 링크 생성하기</Text>
                    </TouchableOpacity>

                    {inviteCode && (
                        <View style={styles.inviteCodeContainer}>
                            <Text style={[styles.inviteCodeLabel, { color: currentColors.textSecondary }]}>
                                초대 코드
                            </Text>
                            <View style={styles.inviteCodeBox}>
                                <Text style={[styles.inviteCode, { color: currentColors.primary }]}>
                                    {inviteCode}
                                </Text>
                                <TouchableOpacity 
                                    style={styles.copyButton}
                                    onPress={copyInviteCode}
                                >
                                    <Ionicons name="copy" size={16} color={currentColors.primary} />
                                </TouchableOpacity>
                            </View>
                            
                            <View style={styles.actionButtons}>
                                <TouchableOpacity 
                                    style={[styles.actionButton, { backgroundColor: currentColors.secondary }]}
                                    onPress={shareInviteCode}
                                >
                                    <Ionicons name="share" size={16} color="#FFFFFF" />
                                    <Text style={styles.actionButtonText}>공유하기</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>

                {/* 초대 코드 사용 섹션 */}
                <View style={[styles.sectionCard, { backgroundColor: currentColors.surface }]}>
                    <Text style={[styles.sectionTitle, { color: currentColors.text }]}>
                        초대 코드 사용
                    </Text>
                    <Text style={[styles.sectionDescription, { color: currentColors.textSecondary }]}>
                        친구로부터 받은 초대 코드를 입력하면 50포인트를 획득할 수 있습니다!
                    </Text>
                    
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={[styles.codeInput, { 
                                borderColor: currentColors.border,
                                color: currentColors.text 
                            }]}
                            placeholder="초대 코드를 입력하세요"
                            placeholderTextColor={currentColors.textSecondary}
                            value={inputCode}
                            onChangeText={setInputCode}
                            autoCapitalize="characters"
                        />
                        <TouchableOpacity 
                            style={[styles.useButton, { backgroundColor: currentColors.secondary }]}
                            onPress={useInviteCode}
                        >
                            <Text style={styles.useButtonText}>사용하기</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* 초대 가이드 */}
                <View style={[styles.guideCard, { backgroundColor: currentColors.surface }]}>
                    <Text style={[styles.guideTitle, { color: currentColors.text }]}>
                        초대 방법
                    </Text>
                    <View style={styles.guideSteps}>
                        <View style={styles.guideStep}>
                            <View style={[styles.stepNumber, { backgroundColor: currentColors.primary }]}>
                                <Text style={styles.stepNumberText}>1</Text>
                            </View>
                            <Text style={[styles.stepText, { color: currentColors.text }]}>
                                초대 링크 생성하기 버튼을 눌러 초대 코드를 만드세요
                            </Text>
                        </View>
                        <View style={styles.guideStep}>
                            <View style={[styles.stepNumber, { backgroundColor: currentColors.secondary }]}>
                                <Text style={styles.stepNumberText}>2</Text>
                            </View>
                            <Text style={[styles.stepText, { color: currentColors.text }]}>
                                생성된 초대 코드를 친구에게 전달하세요
                            </Text>
                        </View>
                        <View style={styles.guideStep}>
                            <View style={[styles.stepNumber, { backgroundColor: currentColors.warning }]}>
                                <Text style={styles.stepNumberText}>3</Text>
                            </View>
                            <Text style={[styles.stepText, { color: currentColors.text }]}>
                                친구가 초대 코드를 사용하면 양쪽 모두 포인트 획득!
                            </Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
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
    },
    placeholder: {
        width: 32,
    },
    statsCard: {
        margin: 20,
        padding: 20,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    statsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    statItem: {
        width: '48%',
        alignItems: 'center',
        marginBottom: 16,
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        textAlign: 'center',
    },
    sectionCard: {
        marginHorizontal: 20,
        marginBottom: 20,
        padding: 20,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    sectionDescription: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 16,
    },
    createButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        marginBottom: 16,
    },
    createButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    inviteCodeContainer: {
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        paddingTop: 16,
    },
    inviteCodeLabel: {
        fontSize: 14,
        marginBottom: 8,
    },
    inviteCodeBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
    },
    inviteCode: {
        flex: 1,
        fontSize: 18,
        fontWeight: 'bold',
        fontFamily: 'monospace',
    },
    copyButton: {
        padding: 4,
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 6,
    },
    actionButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
    },
    codeInput: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        fontSize: 16,
        marginRight: 12,
    },
    useButton: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    useButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    guideCard: {
        marginHorizontal: 20,
        marginBottom: 20,
        padding: 20,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    guideTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
    },
    guideSteps: {
        gap: 16,
    },
    guideStep: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    stepNumber: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        marginTop: 2,
    },
    stepNumberText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: 'bold',
    },
    stepText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 20,
    },
});

export default FriendInviteScreen;
