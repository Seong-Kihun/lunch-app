import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    TouchableOpacity, 
    ScrollView, 
    SafeAreaView, 
    ActivityIndicator,
    StyleSheet,
    Switch,
    Alert,
    TextInput,
    Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useUser } from '../../contexts/UserContext';
import { useAuth } from '../../contexts/AuthContext';
import { getUserNotificationSettings, updateUserNotificationSettings } from '../../services/userService';
import { COLORS } from '../../theme/colors';

const ProfileSection = () => {
    const navigation = useNavigation();
    const { user, isLoading: userLoading, error: userError, refreshUser, logout } = useUser();
    const { handleLogout: authHandleLogout } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [notificationSettings, setNotificationSettings] = useState({
        pushNotifications: true,
        partyInvites: true,
        reviewReminders: false,
        weeklyStats: true
    });
    const [isNotificationLoading, setIsNotificationLoading] = useState(false);
    
    // 프로필 편집 모달 상태
    const [editProfileModal, setEditProfileModal] = useState(false);
    const [editProfileData, setEditProfileData] = useState({
        nickname: '',
        department: '',
        lunch_preference: '',
        allergies: '',
        preferred_time: ''
    });

    // 계정 관리 모달 상태
    const [accountModal, setAccountModal] = useState(false);
    const [accountData, setAccountData] = useState({
        email: '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    // 개인정보 설정 모달 상태
    const [privacyModal, setPrivacyModal] = useState(false);
    const [privacySettings, setPrivacySettings] = useState({
        profileVisibility: 'public',
        showEmail: true,
        showDepartment: true,
        showPreferences: false
    });

    // 알림 설정 모달 상태
    const [notificationModal, setNotificationModal] = useState(false);

    useFocusEffect(
        React.useCallback(() => {
            loadNotificationSettings();
            if (user) {
                setEditProfileData({
                    nickname: user.nickname || '',
                    department: user.department || '',
                    lunch_preference: user.lunch_preference || '',
                    allergies: user.allergies || '',
                    preferred_time: user.preferred_time || ''
                });
                setAccountData({
                    email: user.email || '',
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                });
            }
        }, [user])
    );

    const loadNotificationSettings = async () => {
        try {
            setIsNotificationLoading(true);
            
            // 개발 모드에서는 API 호출을 건너뛰고 기본값 사용
            if (__DEV__) {
                // 기본값은 이미 useState에서 설정됨
                return;
            }
            
            // 프로덕션 모드에서만 API 호출
            try {
                const response = await getUserNotificationSettings();
                if (response.settings) {
                    setNotificationSettings(response.settings);
                }
            } catch (error) {
                console.error('API 호출 실패, 기본값 사용:', error);
                // 기본값은 이미 useState에서 설정됨
            }
        } catch (error) {
            console.error('알림 설정 로드 실패:', error);
            // 기본값 사용 - 이미 useState에서 설정됨
        } finally {
            setIsNotificationLoading(false);
        }
    };

    const handleNotificationToggle = (key) => {
        setNotificationSettings(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    // 프로필 편집 처리
    const handleEditProfile = () => {
        setEditProfileModal(true);
    };

    const handleSaveProfile = async () => {
        try {
            // 여기서 실제 API 호출을 할 수 있습니다
            Alert.alert('성공', '프로필이 업데이트되었습니다.');
            setEditProfileModal(false);
            // 사용자 데이터 새로고침
            await refreshUser();
        } catch (error) {
            Alert.alert('오류', '프로필 업데이트에 실패했습니다.');
        }
    };

    // 계정 관리 처리
    const handleAccountSettings = () => {
        setAccountModal(true);
    };

    const handleSaveAccount = async () => {
        if (accountData.newPassword !== accountData.confirmPassword) {
            Alert.alert('오류', '새 비밀번호가 일치하지 않습니다.');
            return;
        }
        
        try {
            // 여기서 실제 API 호출을 할 수 있습니다
            Alert.alert('성공', '계정 정보가 업데이트되었습니다.');
            setAccountModal(false);
        } catch (error) {
            Alert.alert('오류', '계정 정보 업데이트에 실패했습니다.');
        }
    };

    // 개인정보 설정 처리
    const handlePrivacySettings = () => {
        setPrivacyModal(true);
    };

    const handleSavePrivacy = async () => {
        try {
            // 여기서 실제 API 호출을 할 수 있습니다
            Alert.alert('성공', '개인정보 설정이 저장되었습니다.');
            setPrivacyModal(false);
        } catch (error) {
            Alert.alert('오류', '개인정보 설정 저장에 실패했습니다.');
        }
    };

    // 알림 설정 처리
    const handleNotificationSettings = () => {
        setNotificationModal(true);
    };

    const handleSaveNotificationSettings = async () => {
        try {
            // 여기서 실제 API 호출을 할 수 있습니다
            Alert.alert('성공', '알림 설정이 저장되었습니다.');
            setNotificationModal(false);
        } catch (error) {
            Alert.alert('오류', '알림 설정 저장에 실패했습니다.');
        }
    };

    const handleLogout = () => {
        Alert.alert(
            '로그아웃',
            '정말 로그아웃하시겠습니까?',
            [
                { text: '취소', style: 'cancel' },
                { text: '로그아웃', style: 'destructive', onPress: async () => {
                    try {
                        // 1단계: AuthContext의 handleLogout 호출 (인증 상태 변경)
                        authHandleLogout();
                        
                        // 2단계: UserContext의 logout 함수 호출 (토큰 정리)
                        await logout();
                        
                        Alert.alert('로그아웃', '로그아웃되었습니다.');
                        // navigation.navigate('Login') 제거 - AuthContext가 자동으로 처리
                    } catch (error) {
                        console.error('로그아웃 오류:', error);
                        // 에러가 발생해도 인증 상태는 이미 변경되었으므로 성공으로 처리
                        Alert.alert('로그아웃', '로그아웃되었습니다.');
                    }
                }}
            ]
        );
    };

    const renderProfileItem = (icon, title, subtitle, onPress, showArrow = true) => (
        <TouchableOpacity
            style={[styles.profileItem, { backgroundColor: currentColors.surface }]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <View style={styles.profileItemContent}>
                <View style={[styles.iconContainer, { backgroundColor: currentColors.primary + '15' }]}>
                    <Ionicons name={icon} size={20} color={currentColors.primary} />
                </View>
                <View style={styles.profileItemInfo}>
                    <Text style={[styles.profileItemTitle, { color: currentColors.text }]}>{title}</Text>
                    <Text style={[styles.profileItemSubtitle, { color: currentColors.textSecondary }]}>{subtitle}</Text>
                </View>
                {showArrow && <Ionicons name="chevron-forward" size={20} color={currentColors.gray} />}
            </View>
        </TouchableOpacity>
    );

    const currentColors = global.currentColors || COLORS.light;

    if (userLoading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background }]}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={currentColors.primary} />
                    <Text style={[styles.loadingText, { color: currentColors.textSecondary }]}>로딩 중...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!user) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background }]}>
                <View style={styles.errorContainer}>
                    <Ionicons name="person-circle-outline" size={64} color={currentColors.gray} />
                    <Text style={[styles.errorText, { color: currentColors.textSecondary }]}>사용자 정보를 불러올 수 없습니다</Text>
                    <TouchableOpacity 
                        style={[styles.retryButton, { backgroundColor: currentColors.primary }]}
                        onPress={refreshUser}
                    >
                        <Text style={styles.retryButtonText}>다시 시도</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background }]}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

                {/* 프로필 정보 섹션 */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: currentColors.text }]}>프로필 정보</Text>
                    
                    <View style={[styles.profileCard, { backgroundColor: currentColors.surface }]}>
                        <View style={styles.profileHeader}>
                            <View style={[styles.avatarContainer, { backgroundColor: currentColors.primary + '15' }]}>
                                <Ionicons name="person" size={32} color={currentColors.primary} />
                            </View>
                            <View style={styles.profileInfo}>
                                <Text style={[styles.profileName, { color: currentColors.text }]}>{user?.nickname || user?.name || '사용자'}</Text>
                                <Text style={[styles.profileId, { color: currentColors.textSecondary }]}>{user?.employee_id || user?.id || 'ID 없음'}</Text>
                            </View>
                        </View>
                        
                        <View style={styles.profileDetails}>
                            <View style={styles.detailRow}>
                                <Text style={[styles.detailLabel, { color: currentColors.textSecondary }]}>부서</Text>
                                <Text style={[styles.detailValue, { color: currentColors.text }]}>{user?.department || '미설정'}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={[styles.detailLabel, { color: currentColors.textSecondary }]}>이메일</Text>
                                <Text style={[styles.detailValue, { color: currentColors.text }]}>{user?.email || '미설정'}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={[styles.detailLabel, { color: currentColors.textSecondary }]}>선호 음식</Text>
                                <Text style={[styles.detailValue, { color: currentColors.text }]}>{user?.lunch_preference || '미설정'}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={[styles.detailLabel, { color: currentColors.textSecondary }]}>알레르기</Text>
                                <Text style={[styles.detailValue, { color: currentColors.text }]}>{user?.allergies || '없음'}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* 설정 섹션 */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: currentColors.text }]}>설정</Text>
                    
                    {renderProfileItem('create', '프로필 편집', '개인정보를 수정하세요', handleEditProfile)}
                    {renderProfileItem('settings', '계정 관리', '계정 설정을 관리하세요', handleAccountSettings)}
                    {renderProfileItem('shield', '개인정보 설정', '개인정보 보호 설정', handlePrivacySettings)}
                </View>

                {/* 알림 설정 섹션 */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: currentColors.text }]}>알림 설정</Text>
                    
                    {renderProfileItem(
                        'notifications',
                        '알림 설정',
                        '알림 종류, 시간, 소리 설정을 관리하세요',
                        handleNotificationSettings
                    )}
                </View>

                {/* 로그아웃 섹션 */}
                <View style={styles.section}>
                    <TouchableOpacity
                        style={[styles.logoutButton, { backgroundColor: currentColors.error }]}
                        onPress={handleLogout}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="log-out" size={20} color="#FFFFFF" />
                        <Text style={styles.logoutText}>로그아웃</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* 프로필 편집 모달 */}
            <Modal
                visible={editProfileModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setEditProfileModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: currentColors.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: currentColors.text }]}>프로필 편집</Text>
                            <TouchableOpacity onPress={() => setEditProfileModal(false)}>
                                <Ionicons name="close" size={24} color={currentColors.gray} />
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: currentColors.textSecondary }]}>닉네임</Text>
                            <TextInput
                                style={[styles.textInput, { 
                                    backgroundColor: currentColors.background,
                                    color: currentColors.text,
                                    borderColor: currentColors.border
                                }]}
                                value={editProfileData.nickname}
                                onChangeText={(text) => setEditProfileData(prev => ({ ...prev, nickname: text }))}
                                placeholder="닉네임을 입력하세요"
                                placeholderTextColor={currentColors.textSecondary}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: currentColors.textSecondary }]}>부서</Text>
                            <TextInput
                                style={[styles.textInput, { 
                                    backgroundColor: currentColors.background,
                                    color: currentColors.text,
                                    borderColor: currentColors.border
                                }]}
                                value={editProfileData.department}
                                onChangeText={(text) => setEditProfileData(prev => ({ ...prev, department: text }))}
                                placeholder="부서를 입력하세요"
                                placeholderTextColor={currentColors.textSecondary}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: currentColors.textSecondary }]}>선호 음식</Text>
                            <TextInput
                                style={[styles.textInput, { 
                                    backgroundColor: currentColors.background,
                                    color: currentColors.text,
                                    borderColor: currentColors.border
                                }]}
                                value={editProfileData.lunch_preference}
                                onChangeText={(text) => setEditProfileData(prev => ({ ...prev, lunch_preference: text }))}
                                placeholder="선호하는 음식을 입력하세요"
                                placeholderTextColor={currentColors.textSecondary}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: currentColors.textSecondary }]}>알레르기</Text>
                            <TextInput
                                style={[styles.textInput, { 
                                    backgroundColor: currentColors.background,
                                    color: currentColors.text,
                                    borderColor: currentColors.border
                                }]}
                                value={editProfileData.allergies}
                                onChangeText={(text) => setEditProfileData(prev => ({ ...prev, allergies: text }))}
                                placeholder="알레르기가 있다면 입력하세요"
                                placeholderTextColor={currentColors.textSecondary}
                            />
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton, { borderColor: currentColors.border }]}
                                onPress={() => setEditProfileModal(false)}
                            >
                                <Text style={[styles.modalButtonText, { color: currentColors.textSecondary }]}>취소</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.saveButton, { backgroundColor: currentColors.primary }]}
                                onPress={handleSaveProfile}
                            >
                                <Text style={styles.saveButtonText}>저장</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* 계정 관리 모달 */}
            <Modal
                visible={accountModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setAccountModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: currentColors.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: currentColors.text }]}>계정 관리</Text>
                            <TouchableOpacity onPress={() => setAccountModal(false)}>
                                <Ionicons name="close" size={24} color={currentColors.gray} />
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: currentColors.textSecondary }]}>이메일</Text>
                            <TextInput
                                style={[styles.textInput, { 
                                    backgroundColor: currentColors.background,
                                    color: currentColors.text,
                                    borderColor: currentColors.border
                                }]}
                                value={accountData.email}
                                onChangeText={(text) => setAccountData(prev => ({ ...prev, email: text }))}
                                placeholder="이메일을 입력하세요"
                                placeholderTextColor={currentColors.textSecondary}
                                keyboardType="email-address"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: currentColors.textSecondary }]}>현재 비밀번호</Text>
                            <TextInput
                                style={[styles.textInput, { 
                                    backgroundColor: currentColors.background,
                                    color: currentColors.text,
                                    borderColor: currentColors.border
                                }]}
                                value={accountData.currentPassword}
                                onChangeText={(text) => setAccountData(prev => ({ ...prev, currentPassword: text }))}
                                placeholder="현재 비밀번호를 입력하세요"
                                placeholderTextColor={currentColors.textSecondary}
                                secureTextEntry
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: currentColors.textSecondary }]}>새 비밀번호</Text>
                            <TextInput
                                style={[styles.textInput, { 
                                    backgroundColor: currentColors.background,
                                    color: currentColors.text,
                                    borderColor: currentColors.border
                                }]}
                                value={accountData.newPassword}
                                onChangeText={(text) => setAccountData(prev => ({ ...prev, newPassword: text }))}
                                placeholder="새 비밀번호를 입력하세요"
                                placeholderTextColor={currentColors.textSecondary}
                                secureTextEntry
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: currentColors.textSecondary }]}>새 비밀번호 확인</Text>
                            <TextInput
                                style={[styles.textInput, { 
                                    backgroundColor: currentColors.background,
                                    color: currentColors.text,
                                    borderColor: currentColors.border
                                }]}
                                value={accountData.confirmPassword}
                                onChangeText={(text) => setAccountData(prev => ({ ...prev, confirmPassword: text }))}
                                placeholder="새 비밀번호를 다시 입력하세요"
                                placeholderTextColor={currentColors.textSecondary}
                                secureTextEntry
                            />
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton, { borderColor: currentColors.border }]}
                                onPress={() => setAccountModal(false)}
                            >
                                <Text style={[styles.modalButtonText, { color: currentColors.textSecondary }]}>취소</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.saveButton, { backgroundColor: currentColors.primary }]}
                                onPress={handleSaveAccount}
                            >
                                <Text style={styles.saveButtonText}>저장</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* 개인정보 설정 모달 */}
            <Modal
                visible={privacyModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setPrivacyModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: currentColors.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: currentColors.text }]}>개인정보 설정</Text>
                            <TouchableOpacity onPress={() => setPrivacyModal(false)}>
                                <Ionicons name="close" size={24} color={currentColors.gray} />
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.privacyItem}>
                            <View style={styles.privacyInfo}>
                                <Text style={[styles.privacyTitle, { color: currentColors.text }]}>프로필 공개</Text>
                                <Text style={[styles.privacySubtitle, { color: currentColors.textSecondary }]}>다른 사용자에게 프로필을 보여줍니다</Text>
                            </View>
                            <Switch
                                value={privacySettings.profileVisibility === 'public'}
                                onValueChange={(value) => setPrivacySettings(prev => ({
                                    ...prev,
                                    profileVisibility: value ? 'public' : 'private'
                                }))}
                                trackColor={{ false: currentColors.lightGray, true: currentColors.primary + '40' }}
                                thumbColor={privacySettings.profileVisibility === 'public' ? currentColors.primary : currentColors.gray}
                            />
                        </View>

                        <View style={styles.privacyItem}>
                            <View style={styles.privacyInfo}>
                                <Text style={[styles.privacyTitle, { color: currentColors.text }]}>이메일 표시</Text>
                                <Text style={[styles.privacySubtitle, { color: currentColors.textSecondary }]}>다른 사용자에게 이메일을 보여줍니다</Text>
                            </View>
                            <Switch
                                value={privacySettings.showEmail}
                                onValueChange={(value) => setPrivacySettings(prev => ({
                                    ...prev,
                                    showEmail: value
                                }))}
                                trackColor={{ false: currentColors.lightGray, true: currentColors.primary + '40' }}
                                thumbColor={privacySettings.showEmail ? currentColors.primary : currentColors.gray}
                            />
                        </View>

                        <View style={styles.privacyItem}>
                            <View style={styles.privacyInfo}>
                                <Text style={[styles.privacyTitle, { color: currentColors.text }]}>부서 표시</Text>
                                <Text style={[styles.privacySubtitle, { color: currentColors.textSecondary }]}>다른 사용자에게 부서를 보여줍니다</Text>
                            </View>
                            <Switch
                                value={privacySettings.showDepartment}
                                onValueChange={(value) => setPrivacySettings(prev => ({
                                    ...prev,
                                    showDepartment: value
                                }))}
                                trackColor={{ false: currentColors.lightGray, true: currentColors.primary + '40' }}
                                thumbColor={privacySettings.showDepartment ? currentColors.primary : currentColors.gray}
                            />
                        </View>

                        <View style={styles.privacyItem}>
                            <View style={styles.privacyInfo}>
                                <Text style={[styles.privacyTitle, { color: currentColors.text }]}>선호 음식 표시</Text>
                                <Text style={[styles.privacySubtitle, { color: currentColors.textSecondary }]}>다른 사용자에게 선호 음식을 보여줍니다</Text>
                            </View>
                            <Switch
                                value={privacySettings.showPreferences}
                                onValueChange={(value) => setPrivacySettings(prev => ({
                                    ...prev,
                                    showPreferences: value
                                }))}
                                trackColor={{ false: currentColors.lightGray, true: currentColors.primary + '40' }}
                                thumbColor={privacySettings.showPreferences ? currentColors.primary : currentColors.gray}
                            />
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton, { borderColor: currentColors.border }]}
                                onPress={() => setPrivacyModal(false)}
                            >
                                <Text style={[styles.modalButtonText, { color: currentColors.textSecondary }]}>취소</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.saveButton, { backgroundColor: currentColors.primary }]}
                                onPress={handleSavePrivacy}
                            >
                                <Text style={styles.saveButtonText}>저장</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* 알림 설정 모달 */}
            <Modal
                visible={notificationModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setNotificationModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: currentColors.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: currentColors.text }]}>알림 설정</Text>
                            <TouchableOpacity onPress={() => setNotificationModal(false)}>
                                <Ionicons name="close" size={24} color={currentColors.gray} />
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.notificationItem}>
                            <View style={styles.notificationInfo}>
                                <Text style={[styles.notificationTitle, { color: currentColors.text }]}>푸시 알림</Text>
                                <Text style={[styles.notificationSubtitle, { color: currentColors.textSecondary }]}>모든 푸시 알림을 받습니다</Text>
                            </View>
                            <Switch
                                value={notificationSettings.pushNotifications}
                                onValueChange={(value) => setNotificationSettings(prev => ({
                                    ...prev,
                                    pushNotifications: value
                                }))}
                                trackColor={{ false: currentColors.lightGray, true: currentColors.primary + '40' }}
                                thumbColor={notificationSettings.pushNotifications ? currentColors.primary : currentColors.gray}
                            />
                        </View>

                        <View style={styles.notificationItem}>
                            <View style={styles.notificationInfo}>
                                <Text style={[styles.notificationTitle, { color: currentColors.text }]}>파티 초대</Text>
                                <Text style={[styles.notificationSubtitle, { color: currentColors.textSecondary }]}>점심 파티 초대 알림을 받습니다</Text>
                            </View>
                            <Switch
                                value={notificationSettings.partyInvites}
                                onValueChange={(value) => setNotificationSettings(prev => ({
                                    ...prev,
                                    partyInvites: value
                                }))}
                                trackColor={{ false: currentColors.lightGray, true: currentColors.primary + '40' }}
                                thumbColor={notificationSettings.partyInvites ? currentColors.primary : currentColors.gray}
                            />
                        </View>

                        <View style={styles.notificationItem}>
                            <View style={styles.notificationInfo}>
                                <Text style={[styles.notificationTitle, { color: currentColors.text }]}>리뷰 알림</Text>
                                <Text style={[styles.notificationSubtitle, { color: currentColors.textSecondary }]}>리뷰 작성 알림을 받습니다</Text>
                            </View>
                            <Switch
                                value={notificationSettings.reviewReminders}
                                onValueChange={(value) => setNotificationSettings(prev => ({
                                    ...prev,
                                    reviewReminders: value
                                }))}
                                trackColor={{ false: currentColors.lightGray, true: currentColors.primary + '40' }}
                                thumbColor={notificationSettings.reviewReminders ? currentColors.primary : currentColors.gray}
                            />
                        </View>

                        <View style={styles.notificationItem}>
                            <View style={styles.notificationInfo}>
                                <Text style={[styles.notificationTitle, { color: currentColors.text }]}>주간 통계</Text>
                                <Text style={[styles.notificationSubtitle, { color: currentColors.textSecondary }]}>주간 활동 통계를 받습니다</Text>
                            </View>
                            <Switch
                                value={notificationSettings.weeklyStats}
                                onValueChange={(value) => setNotificationSettings(prev => ({
                                    ...prev,
                                    weeklyStats: value
                                }))}
                                trackColor={{ false: currentColors.lightGray, true: currentColors.primary + '40' }}
                                thumbColor={notificationSettings.weeklyStats ? currentColors.primary : currentColors.gray}
                            />
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton, { borderColor: currentColors.border }]}
                                onPress={() => setNotificationModal(false)}
                            >
                                <Text style={[styles.modalButtonText, { color: currentColors.textSecondary }]}>취소</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.saveButton, { backgroundColor: currentColors.primary }]}
                                onPress={handleSaveNotificationSettings}
                            >
                                <Text style={styles.saveButtonText}>저장</Text>
                            </TouchableOpacity>
                        </View>
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    errorText: {
        fontSize: 16,
        textAlign: 'center',
        marginTop: 16,
        marginBottom: 24,
    },
    retryButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },

    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    profileCard: {
        borderRadius: 20,
        padding: 24,
        elevation: 3,
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.1)',
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    avatarContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    profileId: {
        fontSize: 14,
    },
    profileDetails: {
        gap: 12,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    detailLabel: {
        fontSize: 14,
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '500',
    },
    profileItem: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 12,
        elevation: 3,
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.1)',
    },
    profileItemContent: {
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
    profileItemInfo: {
        flex: 1,
    },
    profileItemTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    profileItemSubtitle: {
        fontSize: 12,
    },
    notificationCard: {
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    notificationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    notificationInfo: {
        flex: 1,
    },
    notificationTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    notificationSubtitle: {
        fontSize: 12,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 8,
    },
    logoutText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },

    // 모달 스타일
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    modalContent: {
        width: '100%',
        maxHeight: '80%',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 8,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    textInput: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 16,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 24,
        gap: 12,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
        borderWidth: 1,
        backgroundColor: 'transparent',
    },
    saveButton: {
        backgroundColor: '#3B82F6',
    },
    modalButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    privacyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    privacyInfo: {
        flex: 1,
        marginRight: 16,
    },
    privacyTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    privacySubtitle: {
        fontSize: 12,
        lineHeight: 16,
    },
});

export default ProfileSection; 