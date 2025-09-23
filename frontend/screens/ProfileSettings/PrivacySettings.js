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

const PrivacySettings = ({ navigation }) => {
    const { currentTheme } = useTheme();
    const [privacySettings, setPrivacySettings] = useState({
        profileVisibility: 'friends', // 'public', 'friends', 'private'
        profilePhotoPublic: true,
        activityHistoryPublic: true,
        locationSharing: true,
        locationAccuracy: 'precise', // 'precise', 'approximate'
        dataCollection: true,
        personalizedService: true,
        marketingInfo: false
    });
    const [showVisibilityModal, setShowVisibilityModal] = useState(false);
    const [showLocationModal, setShowLocationModal] = useState(false);
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
        loadPrivacySettings();
    }, []);

    const loadPrivacySettings = async () => {
        try {
            // TODO: API에서 개인정보 설정 로드
            // const response = await fetch(`${global.RENDER_SERVER_URL}/users/${global.myEmployeeId}/privacy`);
            // if (response.ok) {
            //     const data = await response.json();
            //     setPrivacySettings(data);
            // }
        } catch (error) {
            console.error('개인정보 설정 로드 실패:', error);
        }
    };

    const handleSettingToggle = async (key, value) => {
        setPrivacySettings(prev => ({
            ...prev,
            [key]: value
        }));

        try {
            // TODO: API로 설정 저장
            // await fetch(`${global.RENDER_SERVER_URL}/users/${global.myEmployeeId}/privacy`, {
            //     method: 'PUT',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ [key]: value })
            // });
        } catch (error) {
            console.error('설정 저장 실패:', error);
            Alert.alert('오류', '설정 저장에 실패했습니다.');
        }
    };

    const handleVisibilityChange = async (visibility) => {
        setPrivacySettings(prev => ({
            ...prev,
            profileVisibility: visibility
        }));
        setShowVisibilityModal(false);

        try {
            // TODO: API로 설정 저장
            // await fetch(`${global.RENDER_SERVER_URL}/users/${global.myEmployeeId}/privacy`, {
            //     method: 'PUT',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ profileVisibility: visibility })
            // });
        } catch (error) {
            console.error('설정 저장 실패:', error);
            Alert.alert('오류', '설정 저장에 실패했습니다.');
        }
    };

    const handleLocationAccuracyChange = async (accuracy) => {
        setPrivacySettings(prev => ({
            ...prev,
            locationAccuracy: accuracy
        }));
        setShowLocationModal(false);

        try {
            // TODO: API로 설정 저장
            // await fetch(`${global.RENDER_SERVER_URL}/users/${global.myEmployeeId}/privacy`, {
            //     method: 'PUT',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ locationAccuracy: accuracy })
            // });
        } catch (error) {
            console.error('설정 저장 실패:', error);
            Alert.alert('오류', '설정 저장에 실패했습니다.');
        }
    };

    const getVisibilityText = (visibility) => {
        switch (visibility) {
            case 'public': return '전체 공개';
            case 'friends': return '친구만';
            case 'private': return '비공개';
            default: return '친구만';
        }
    };

    const getLocationAccuracyText = (accuracy) => {
        switch (accuracy) {
            case 'precise': return '정확한 위치';
            case 'approximate': return '근사치 위치';
            default: return '정확한 위치';
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
                {/* 프로필 공개 범위 */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>프로필 공개 범위</Text>
                    
                    {renderSettingItem(
                        'eye',
                        '프로필 공개 범위',
                        getVisibilityText(privacySettings.profileVisibility),
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />,
                        () => setShowVisibilityModal(true)
                    )}
                    
                    {renderSettingItem(
                        'camera',
                        '프로필 사진 공개',
                        '프로필 사진을 다른 사용자에게 보여줍니다',
                        renderSwitch(
                            privacySettings.profilePhotoPublic,
                            (value) => handleSettingToggle('profilePhotoPublic', value)
                        )
                    )}
                    
                    {renderSettingItem(
                        'time',
                        '활동 내역 공개',
                        '내 활동 내역을 다른 사용자에게 보여줍니다',
                        renderSwitch(
                            privacySettings.activityHistoryPublic,
                            (value) => handleSettingToggle('activityHistoryPublic', value)
                        )
                    )}
                </View>

                {/* 위치 정보 설정 */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>위치 정보 설정</Text>
                    
                    {renderSettingItem(
                        'location',
                        '위치 공유',
                        '위치 정보를 앱에서 사용합니다',
                        renderSwitch(
                            privacySettings.locationSharing,
                            (value) => handleSettingToggle('locationSharing', value)
                        )
                    )}
                    
                    {privacySettings.locationSharing && renderSettingItem(
                        'locate',
                        '위치 정확도',
                        getLocationAccuracyText(privacySettings.locationAccuracy),
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />,
                        () => setShowLocationModal(true)
                    )}
                </View>

                {/* 데이터 수집 동의 */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>데이터 수집 동의</Text>
                    
                    {renderSettingItem(
                        'analytics',
                        '사용 통계 수집',
                        '앱 사용 통계를 수집하여 서비스 개선에 활용합니다',
                        renderSwitch(
                            privacySettings.dataCollection,
                            (value) => handleSettingToggle('dataCollection', value)
                        )
                    )}
                    
                    {renderSettingItem(
                        'person',
                        '개인화 서비스 제공',
                        '사용자 맞춤형 서비스를 제공합니다',
                        renderSwitch(
                            privacySettings.personalizedService,
                            (value) => handleSettingToggle('personalizedService', value)
                        )
                    )}
                    
                    {renderSettingItem(
                        'megaphone',
                        '마케팅 정보 수신',
                        '새로운 기능과 이벤트 정보를 받습니다',
                        renderSwitch(
                            privacySettings.marketingInfo,
                            (value) => handleSettingToggle('marketingInfo', value)
                        )
                    )}
                </View>
            </ScrollView>

            {/* 프로필 공개 범위 선택 모달 */}
            <Modal
                visible={showVisibilityModal}
                animationType="slide"
                transparent={true}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>프로필 공개 범위</Text>
                            <TouchableOpacity onPress={() => setShowVisibilityModal(false)}>
                                <Ionicons name="close" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        
                        <TouchableOpacity
                            style={[styles.optionItem, { 
                                backgroundColor: privacySettings.profileVisibility === 'public' ? colors.primary + '15' : 'transparent'
                            }]}
                            onPress={() => handleVisibilityChange('public')}
                        >
                            <View style={styles.optionContent}>
                                <Ionicons 
                                    name="globe" 
                                    size={24} 
                                    color={privacySettings.profileVisibility === 'public' ? colors.primary : colors.textSecondary} 
                                />
                                <View style={styles.optionText}>
                                    <Text style={[styles.optionTitle, { color: colors.text }]}>전체 공개</Text>
                                    <Text style={[styles.optionSubtitle, { color: colors.textSecondary }]}>
                                        모든 사용자가 내 프로필을 볼 수 있습니다
                                    </Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                            style={[styles.optionItem, { 
                                backgroundColor: privacySettings.profileVisibility === 'friends' ? colors.primary + '15' : 'transparent'
                            }]}
                            onPress={() => handleVisibilityChange('friends')}
                        >
                            <View style={styles.optionContent}>
                                <Ionicons 
                                    name="people" 
                                    size={24} 
                                    color={privacySettings.profileVisibility === 'friends' ? colors.primary : colors.textSecondary} 
                                />
                                <View style={styles.optionText}>
                                    <Text style={[styles.optionTitle, { color: colors.text }]}>친구만</Text>
                                    <Text style={[styles.optionSubtitle, { color: colors.textSecondary }]}>
                                        친구로 등록된 사용자만 내 프로필을 볼 수 있습니다
                                    </Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                            style={[styles.optionItem, { 
                                backgroundColor: privacySettings.profileVisibility === 'private' ? colors.primary + '15' : 'transparent'
                            }]}
                            onPress={() => handleVisibilityChange('private')}
                        >
                            <View style={styles.optionContent}>
                                <Ionicons 
                                    name="lock-closed" 
                                    size={24} 
                                    color={privacySettings.profileVisibility === 'private' ? colors.primary : colors.textSecondary} 
                                />
                                <View style={styles.optionText}>
                                    <Text style={[styles.optionTitle, { color: colors.text }]}>비공개</Text>
                                    <Text style={[styles.optionSubtitle, { color: colors.textSecondary }]}>
                                        내 프로필을 아무도 볼 수 없습니다
                                    </Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* 위치 정확도 선택 모달 */}
            <Modal
                visible={showLocationModal}
                animationType="slide"
                transparent={true}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>위치 정확도</Text>
                            <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                                <Ionicons name="close" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        
                        <TouchableOpacity
                            style={[styles.optionItem, { 
                                backgroundColor: privacySettings.locationAccuracy === 'precise' ? colors.primary + '15' : 'transparent'
                            }]}
                            onPress={() => handleLocationAccuracyChange('precise')}
                        >
                            <View style={styles.optionContent}>
                                <Ionicons 
                                    name="locate" 
                                    size={24} 
                                    color={privacySettings.locationAccuracy === 'precise' ? colors.primary : colors.textSecondary} 
                                />
                                <View style={styles.optionText}>
                                    <Text style={[styles.optionTitle, { color: colors.text }]}>정확한 위치</Text>
                                    <Text style={[styles.optionSubtitle, { color: colors.textSecondary }]}>
                                        정확한 위치 정보를 제공합니다
                                    </Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                            style={[styles.optionItem, { 
                                backgroundColor: privacySettings.locationAccuracy === 'approximate' ? colors.primary + '15' : 'transparent'
                            }]}
                            onPress={() => handleLocationAccuracyChange('approximate')}
                        >
                            <View style={styles.optionContent}>
                                <Ionicons 
                                    name="location" 
                                    size={24} 
                                    color={privacySettings.locationAccuracy === 'approximate' ? colors.primary : colors.textSecondary} 
                                />
                                <View style={styles.optionText}>
                                    <Text style={[styles.optionTitle, { color: colors.text }]}>근사치 위치</Text>
                                    <Text style={[styles.optionSubtitle, { color: colors.textSecondary }]}>
                                        대략적인 위치 정보만 제공합니다
                                    </Text>
                                </View>
                            </View>
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
    optionItem: {
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    optionContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    optionText: {
        marginLeft: 16,
        flex: 1,
    },
    optionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    optionSubtitle: {
        fontSize: 14,
        lineHeight: 20,
    },
});

export default PrivacySettings;
