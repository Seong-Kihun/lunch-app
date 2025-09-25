import React from 'react';
import { 
    View, 
    Text, 
    TouchableOpacity, 
    ScrollView, 
    SafeAreaView, 
    StyleSheet,
    Linking,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { COLORS } from '../../theme/colors';

const AppInfoSection = ({ navigation }) => {
    const currentColors = global.currentColors || COLORS.light;

    const appInfo = {
        version: Constants.expoConfig?.version || '1.0.0',
        buildNumber: Constants.expoConfig?.ios?.buildNumber || '1',
        appName: Constants.expoConfig?.name || 'Lunch App',
        developer: 'KOICA Team',
        contact: 'koica@example.com',
        website: 'https://koica.example.com'
    };

    const handleContact = () => {
        // 문의사항 작성 화면으로 이동
        navigation.navigate('Inquiry');
    };

    const handlePrivacyPolicy = () => {
        Alert.alert('개인정보처리방침', '개인정보처리방침은 웹사이트에서 확인할 수 있습니다.');
    };

    const handleTermsOfService = () => {
        Alert.alert('이용약관', '이용약관은 웹사이트에서 확인할 수 있습니다.');
    };

    const renderInfoItem = (icon, title, subtitle, onPress, showArrow = true) => (
        <TouchableOpacity
            style={[styles.infoItem, { backgroundColor: currentColors.surface }]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <View style={styles.infoItemContent}>
                <View style={[styles.iconContainer, { backgroundColor: currentColors.primary + '15' }]}>
                    <Ionicons name={icon} size={20} color={currentColors.primary} />
                </View>
                <View style={styles.infoItemInfo}>
                    <Text style={[styles.infoItemTitle, { color: currentColors.text }]}>{title}</Text>
                    <Text style={[styles.infoItemSubtitle, { color: currentColors.textSecondary }]}>{subtitle}</Text>
                </View>
                {showArrow && <Ionicons name="chevron-forward" size={20} color={currentColors.gray} />}
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background }]}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                
                {/* 앱 정보 카드 */}
                <View style={[styles.appInfoCard, { backgroundColor: currentColors.surface }]}>
                    <View style={styles.appHeader}>
                        <View style={[styles.appIcon, { backgroundColor: currentColors.primary + '15' }]}>
                            <Ionicons name="restaurant" size={48} color={currentColors.primary} />
                        </View>
                        <View style={styles.appInfo}>
                            <Text style={[styles.appName, { color: currentColors.text }]}>{appInfo.appName}</Text>
                            <Text style={[styles.appVersion, { color: currentColors.textSecondary }]}>
                                버전 {appInfo.version} ({appInfo.buildNumber})
                            </Text>
                        </View>
                    </View>
                    
                    <View style={styles.appDescription}>
                        <Text style={[styles.descriptionText, { color: currentColors.textSecondary }]}>
                            동료들과 함께 즐거운 점심 시간을 보낼 수 있는 앱입니다.
                        </Text>
                    </View>
                </View>

                {/* 개발자 정보 */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: currentColors.text }]}>개발자 정보</Text>
                    
                    <View style={[styles.developerCard, { backgroundColor: currentColors.surface }]}>
                        <View style={styles.developerInfo}>
                            <Text style={[styles.developerName, { color: currentColors.text }]}>{appInfo.developer}</Text>
                            <Text style={[styles.developerDescription, { color: currentColors.textSecondary }]}>
                                맛있는 점심을 위한 혁신적인 솔루션을 제공합니다.
                            </Text>
                        </View>
                    </View>
                </View>

                {/* 연락처 및 지원 */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: currentColors.text }]}>연락처 및 지원</Text>
                    
                    {renderInfoItem('mail', '문의하기', '개발팀에 문의사항을 전달하세요', handleContact)}
                    {renderInfoItem('globe', '웹사이트', '공식 웹사이트를 방문하세요', () => Linking.openURL(appInfo.website))}
                </View>

                {/* 법적 정보 */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: currentColors.text }]}>법적 정보</Text>
                    
                    {renderInfoItem('document-text', '개인정보처리방침', '개인정보 수집 및 이용에 대한 안내', handlePrivacyPolicy)}
                    {renderInfoItem('document-text', '이용약관', '서비스 이용에 대한 약관', handleTermsOfService)}
                </View>

                {/* 라이선스 정보 */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: currentColors.text }]}>라이선스</Text>
                    
                    <View style={[styles.licenseCard, { backgroundColor: currentColors.surface }]}>
                        <Text style={[styles.licenseText, { color: currentColors.textSecondary }]}>
                            이 앱은 MIT 라이선스 하에 배포됩니다.
                        </Text>
                        <Text style={[styles.licenseText, { color: currentColors.textSecondary }]}>
                            © 2024 {appInfo.developer}. All rights reserved.
                        </Text>
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
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    appInfoCard: {
        borderRadius: 20,
        padding: 24,
        marginBottom: 24,
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
    appHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    appIcon: {
        width: 80,
        height: 80,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    appInfo: {
        flex: 1,
    },
    appName: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    appVersion: {
        fontSize: 14,
    },
    appDescription: {
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    descriptionText: {
        fontSize: 14,
        lineHeight: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    developerCard: {
        borderRadius: 20,
        padding: 20,
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
    developerInfo: {
        alignItems: 'center',
    },
    developerName: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    developerDescription: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    infoItem: {
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
    infoItemContent: {
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
    infoItemInfo: {
        flex: 1,
    },
    infoItemTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    infoItemSubtitle: {
        fontSize: 12,
    },
    licenseCard: {
        borderRadius: 20,
        padding: 20,
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
    licenseText: {
        fontSize: 12,
        textAlign: 'center',
        marginBottom: 4,
    },
});

export default AppInfoSection;
