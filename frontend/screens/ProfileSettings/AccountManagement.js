import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    StyleSheet,
    TextInput,
    Alert,
    Switch,
    Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

const AccountManagement = ({ navigation }) => {
    const { currentTheme } = useTheme();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const colors = currentTheme === 'dark' ? {
        primary: '#3B82F6',
        background: '#1F2937',
        surface: '#374151',
        text: '#F9FAFB',
        textSecondary: '#D1D5DB',
        border: '#4B5563',
        error: '#EF4444',
        success: '#10B981'
    } : {
        primary: '#3B82F6',
        background: '#F1F5F9',
        surface: '#FFFFFF',
        text: '#1E293B',
        textSecondary: '#64748B',
        border: '#E2E8F0',
        error: '#EF4444',
        success: '#10B981'
    };

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            Alert.alert('오류', '모든 필드를 입력해주세요.');
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert('오류', '새 비밀번호가 일치하지 않습니다.');
            return;
        }

        if (newPassword.length < 8) {
            Alert.alert('오류', '비밀번호는 8자 이상이어야 합니다.');
            return;
        }

        setIsLoading(true);
        try {
            // TODO: API 호출로 비밀번호 변경
            await new Promise(resolve => setTimeout(resolve, 1000)); // 임시 딜레이
            
            Alert.alert('성공', '비밀번호가 변경되었습니다.');
            setShowPasswordModal(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            Alert.alert('오류', '비밀번호 변경에 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleChangeEmail = async () => {
        if (!newEmail) {
            Alert.alert('오류', '새 이메일을 입력해주세요.');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmail)) {
            Alert.alert('오류', '올바른 이메일 형식을 입력해주세요.');
            return;
        }

        setIsLoading(true);
        try {
            // TODO: API 호출로 이메일 변경
            await new Promise(resolve => setTimeout(resolve, 1000)); // 임시 딜레이
            
            Alert.alert('성공', '이메일이 변경되었습니다.');
            setShowEmailModal(false);
            setNewEmail('');
        } catch (error) {
            Alert.alert('오류', '이메일 변경에 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        Alert.alert(
            '계정 삭제',
            '정말로 계정을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.',
            [
                { text: '취소', style: 'cancel' },
                { 
                    text: '삭제', 
                    style: 'destructive',
                    onPress: async () => {
                        setIsLoading(true);
                        try {
                            // TODO: API 호출로 계정 삭제
                            await new Promise(resolve => setTimeout(resolve, 1000)); // 임시 딜레이
                            
                            Alert.alert('완료', '계정이 삭제되었습니다.');
                            // 로그아웃 처리
                        } catch (error) {
                            Alert.alert('오류', '계정 삭제에 실패했습니다.');
                        } finally {
                            setIsLoading(false);
                            setShowDeleteModal(false);
                        }
                    }
                }
            ]
        );
    };

    const renderSettingItem = (icon, title, subtitle, onPress, showArrow = true) => (
        <TouchableOpacity
            style={[styles.settingItem, { backgroundColor: colors.surface }]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <View style={styles.settingItemContent}>
                <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
                    <Ionicons name={icon} size={20} color={colors.primary} />
                </View>
                <View style={styles.settingItemInfo}>
                    <Text style={[styles.settingItemTitle, { color: colors.text }]}>{title}</Text>
                    <Text style={[styles.settingItemSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
                </View>
                {showArrow && <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />}
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>계정 정보</Text>
                    
                    {renderSettingItem(
                        'key',
                        '비밀번호 변경',
                        '보안을 위해 정기적으로 변경하세요',
                        () => setShowPasswordModal(true)
                    )}
                    
                    {renderSettingItem(
                        'mail',
                        '이메일 변경',
                        '계정 연동 이메일을 변경하세요',
                        () => setShowEmailModal(true)
                    )}
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>계정 삭제</Text>
                    
                    {renderSettingItem(
                        'trash',
                        '계정 삭제',
                        '계정과 모든 데이터를 영구 삭제합니다',
                        () => setShowDeleteModal(true),
                        false
                    )}
                </View>
            </ScrollView>

            {/* 비밀번호 변경 모달 */}
            <Modal
                visible={showPasswordModal}
                animationType="slide"
                transparent={true}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>비밀번호 변경</Text>
                            <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                                <Ionicons name="close" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        
                        <TextInput
                            style={[styles.input, { 
                                backgroundColor: colors.background,
                                color: colors.text,
                                borderColor: colors.border
                            }]}
                            placeholder="현재 비밀번호"
                            placeholderTextColor={colors.textSecondary}
                            secureTextEntry
                            value={currentPassword}
                            onChangeText={setCurrentPassword}
                        />
                        
                        <TextInput
                            style={[styles.input, { 
                                backgroundColor: colors.background,
                                color: colors.text,
                                borderColor: colors.border
                            }]}
                            placeholder="새 비밀번호 (8자 이상)"
                            placeholderTextColor={colors.textSecondary}
                            secureTextEntry
                            value={newPassword}
                            onChangeText={setNewPassword}
                        />
                        
                        <TextInput
                            style={[styles.input, { 
                                backgroundColor: colors.background,
                                color: colors.text,
                                borderColor: colors.border
                            }]}
                            placeholder="새 비밀번호 확인"
                            placeholderTextColor={colors.textSecondary}
                            secureTextEntry
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                        />
                        
                        <TouchableOpacity
                            style={[styles.modalButton, { backgroundColor: colors.primary }]}
                            onPress={handleChangePassword}
                            disabled={isLoading}
                        >
                            <Text style={styles.modalButtonText}>
                                {isLoading ? '처리 중...' : '변경하기'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* 이메일 변경 모달 */}
            <Modal
                visible={showEmailModal}
                animationType="slide"
                transparent={true}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>이메일 변경</Text>
                            <TouchableOpacity onPress={() => setShowEmailModal(false)}>
                                <Ionicons name="close" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        
                        <TextInput
                            style={[styles.input, { 
                                backgroundColor: colors.background,
                                color: colors.text,
                                borderColor: colors.border
                            }]}
                            placeholder="새 이메일 주소"
                            placeholderTextColor={colors.textSecondary}
                            value={newEmail}
                            onChangeText={setNewEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        
                        <TouchableOpacity
                            style={[styles.modalButton, { backgroundColor: colors.primary }]}
                            onPress={handleChangeEmail}
                            disabled={isLoading}
                        >
                            <Text style={styles.modalButtonText}>
                                {isLoading ? '처리 중...' : '변경하기'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* 계정 삭제 확인 모달 */}
            <Modal
                visible={showDeleteModal}
                animationType="slide"
                transparent={true}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>계정 삭제</Text>
                            <TouchableOpacity onPress={() => setShowDeleteModal(false)}>
                                <Ionicons name="close" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.warningContainer}>
                            <Ionicons name="warning" size={48} color={colors.error} />
                            <Text style={[styles.warningText, { color: colors.text }]}>
                                이 작업은 되돌릴 수 없습니다.
                            </Text>
                            <Text style={[styles.warningSubtext, { color: colors.textSecondary }]}>
                                계정과 관련된 모든 데이터가 영구적으로 삭제됩니다.
                            </Text>
                        </View>
                        
                        <TouchableOpacity
                            style={[styles.modalButton, { backgroundColor: colors.error }]}
                            onPress={handleDeleteAccount}
                            disabled={isLoading}
                        >
                            <Text style={styles.modalButtonText}>
                                {isLoading ? '처리 중...' : '계정 삭제'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        marginBottom: 24,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    placeholder: {
        width: 40,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    settingItem: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    settingItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    settingItemInfo: {
        flex: 1,
    },
    settingItemTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    settingItemSubtitle: {
        fontSize: 12,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '90%',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        fontSize: 16,
    },
    modalButton: {
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    modalButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    warningContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    warningText: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 12,
        marginBottom: 8,
        textAlign: 'center',
    },
    warningSubtext: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
});

export default AccountManagement;
