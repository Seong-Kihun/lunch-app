import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    StyleSheet,
    Switch,
    Alert,
    Modal,
    TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

const NotificationSettings = ({ navigation }) => {
    const { currentTheme } = useTheme();
    const [notificationSettings, setNotificationSettings] = useState({
        pushNotifications: true,
        partyInvites: true,
        reviewReminders: false,
        weeklyStats: true,
        newRestaurants: true,
        friendActivity: false,
        systemUpdates: true
    });
    const [timeSettings, setTimeSettings] = useState({
        quietHoursEnabled: false,
        quietStartTime: '22:00',
        quietEndTime: '08:00'
    });
    const [soundSettings, setSoundSettings] = useState({
        notificationSound: true,
        vibration: true,
        silentMode: false
    });
    const [showTimeModal, setShowTimeModal] = useState(false);
    const [showSoundModal, setShowSoundModal] = useState(false);
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

    useEffect(() => {
        loadNotificationSettings();
    }, []);

    const loadNotificationSettings = async () => {
        try {
            // TODO: API에서 알림 설정 로드
            // const response = await fetch(`${global.RENDER_SERVER_URL}/users/${global.myEmployeeId}/notifications`);
            // if (response.ok) {
            //     const data = await response.json();
            //     setNotificationSettings(data);
            // }
        } catch (error) {
            console.error('알림 설정 로드 실패:', error);
        }
    };

    const handleNotificationToggle = async (key, value) => {
        setNotificationSettings(prev => ({
            ...prev,
            [key]: value
        }));

        try {
            // TODO: API로 설정 저장
            // await fetch(`${global.RENDER_SERVER_URL}/users/${global.myEmployeeId}/notifications`, {
            //     method: 'PUT',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ [key]: value })
            // });
        } catch (error) {
            console.error('설정 저장 실패:', error);
            Alert.alert('오류', '설정 저장에 실패했습니다.');
        }
    };

    const handleTimeSettingToggle = async (key, value) => {
        setTimeSettings(prev => ({
            ...prev,
            [key]: value
        }));

        try {
            // TODO: API로 설정 저장
            // await fetch(`${global.RENDER_SERVER_URL}/users/${global.myEmployeeId}/notifications/time`, {
            //     method: 'PUT',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ [key]: value })
            // });
        } catch (error) {
            console.error('설정 저장 실패:', error);
            Alert.alert('오류', '설정 저장에 실패했습니다.');
        }
    };

    const handleSoundSettingToggle = async (key, value) => {
        setSoundSettings(prev => ({
            ...prev,
            [key]: value
        }));

        try {
            // TODO: API로 설정 저장
            // await fetch(`${global.RENDER_SERVER_URL}/users/${global.myEmployeeId}/notifications/sound`, {
            //     method: 'PUT',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ [key]: value })
            // });
        } catch (error) {
            console.error('설정 저장 실패:', error);
            Alert.alert('오류', '설정 저장에 실패했습니다.');
        }
    };

    const getNotificationTitle = (key) => {
        switch (key) {
            case 'pushNotifications': return '푸시 알림';
            case 'partyInvites': return '파티 초대';
            case 'reviewReminders': return '리뷰 알림';
            case 'weeklyStats': return '주간 통계';
            case 'newRestaurants': return '새로운 식당';
            case 'friendActivity': return '친구 활동';
            case 'systemUpdates': return '시스템 업데이트';
            default: return key;
        }
    };

    const getNotificationSubtitle = (key) => {
        switch (key) {
            case 'pushNotifications': return '새로운 소식과 업데이트';
            case 'partyInvites': return '파티 초대 알림';
            case 'reviewReminders': return '리뷰 작성 알림';
            case 'weeklyStats': return '주간 활동 통계';
            case 'newRestaurants': return '새로 등록된 식당 정보';
            case 'friendActivity': return '친구의 새로운 활동';
            case 'systemUpdates': return '앱 업데이트 및 시스템 알림';
            default: return '';
        }
    };

    const renderSettingItem = (icon, title, subtitle, rightComponent, onPress = null) => (
        <TouchableOpacity
            style={[styles.settingItem, { backgroundColor: colors.surface }]}
            onPress={onPress}
            activeOpacity={onPress ? 0.8 : 1}
            disabled={!onPress}
        >
            <View style={styles.settingItemContent}>
                <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
                    <Ionicons name={icon} size={20} color={colors.primary} />
                </View>
                <View style={styles.settingItemInfo}>
                    <Text style={[styles.settingItemTitle, { color: colors.text }]}>{title}</Text>
                    <Text style={[styles.settingItemSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
                </View>
                {rightComponent}
            </View>
        </TouchableOpacity>
    );

    const renderSwitch = (value, onValueChange) => (
        <Switch
            value={value}
            onValueChange={onValueChange}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.surface}
        />
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* 기본 알림 설정 */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>알림 종류</Text>
                    
                    {Object.entries(notificationSettings).map(([key, value]) => (
                        <View key={key} style={[styles.notificationItem, { backgroundColor: colors.surface }]}>
                            <View style={styles.notificationInfo}>
                                <Text style={[styles.notificationTitle, { color: colors.text }]}>
                                    {getNotificationTitle(key)}
                                </Text>
                                <Text style={[styles.notificationSubtitle, { color: colors.textSecondary }]}>
                                    {getNotificationSubtitle(key)}
                                </Text>
                            </View>
                            <Switch
                                value={value}
                                onValueChange={(newValue) => handleNotificationToggle(key, newValue)}
                                trackColor={{ false: colors.border, true: colors.primary }}
                                thumbColor={colors.surface}
                            />
                        </View>
                    ))}
                </View>

                {/* 시간 설정 */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>시간 설정</Text>
                    
                    {renderSettingItem(
                        'moon',
                        '방해 금지 시간',
                        '설정된 시간 동안 알림을 받지 않습니다',
                        renderSwitch(
                            timeSettings.quietHoursEnabled,
                            (value) => handleTimeSettingToggle('quietHoursEnabled', value)
                        )
                    )}
                    
                    {timeSettings.quietHoursEnabled && (
                        <>
                            {renderSettingItem(
                                'time',
                                '시작 시간',
                                timeSettings.quietStartTime,
                                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />,
                                () => setShowTimeModal(true)
                            )}
                            
                            {renderSettingItem(
                                'time',
                                '종료 시간',
                                timeSettings.quietEndTime,
                                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />,
                                () => setShowTimeModal(true)
                            )}
                        </>
                    )}
                </View>

                {/* 소리 및 진동 설정 */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>소리 및 진동</Text>
                    
                    {renderSettingItem(
                        'volume-high',
                        '알림음',
                        '알림 시 소리를 재생합니다',
                        renderSwitch(
                            soundSettings.notificationSound,
                            (value) => handleSoundSettingToggle('notificationSound', value)
                        )
                    )}
                    
                    {renderSettingItem(
                        'phone-portrait',
                        '진동',
                        '알림 시 진동을 울립니다',
                        renderSwitch(
                            soundSettings.vibration,
                            (value) => handleSoundSettingToggle('vibration', value)
                        )
                    )}
                    
                    {renderSettingItem(
                        'mute',
                        '무음 모드',
                        '무음 모드에서도 알림을 받습니다',
                        renderSwitch(
                            soundSettings.silentMode,
                            (value) => handleSoundSettingToggle('silentMode', value)
                        )
                    )}
                </View>
            </ScrollView>

            {/* 시간 설정 모달 */}
            <Modal
                visible={showTimeModal}
                animationType="slide"
                transparent={true}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>방해 금지 시간 설정</Text>
                            <TouchableOpacity onPress={() => setShowTimeModal(false)}>
                                <Ionicons name="close" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.timeInputContainer}>
                            <View style={styles.timeInputRow}>
                                <Text style={[styles.timeLabel, { color: colors.text }]}>시작 시간</Text>
                                <TextInput
                                    style={[styles.timeInput, { 
                                        backgroundColor: colors.background,
                                        color: colors.text,
                                        borderColor: colors.border
                                    }]}
                                    value={timeSettings.quietStartTime}
                                    onChangeText={(text) => setTimeSettings(prev => ({ ...prev, quietStartTime: text }))}
                                    placeholder="22:00"
                                    placeholderTextColor={colors.textSecondary}
                                />
                            </View>
                            
                            <View style={styles.timeInputRow}>
                                <Text style={[styles.timeLabel, { color: colors.text }]}>종료 시간</Text>
                                <TextInput
                                    style={[styles.timeInput, { 
                                        backgroundColor: colors.background,
                                        color: colors.text,
                                        borderColor: colors.border
                                    }]}
                                    value={timeSettings.quietEndTime}
                                    onChangeText={(text) => setTimeSettings(prev => ({ ...prev, quietEndTime: text }))}
                                    placeholder="08:00"
                                    placeholderTextColor={colors.textSecondary}
                                />
                            </View>
                        </View>
                        
                        <TouchableOpacity
                            style={[styles.modalButton, { backgroundColor: colors.primary }]}
                            onPress={() => setShowTimeModal(false)}
                        >
                            <Text style={styles.modalButtonText}>확인</Text>
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
    notificationItem: {
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
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
    timeInputContainer: {
        marginBottom: 20,
    },
    timeInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    timeLabel: {
        fontSize: 16,
        fontWeight: '500',
        flex: 1,
    },
    timeInput: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        width: 100,
        textAlign: 'center',
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
});

export default NotificationSettings;
