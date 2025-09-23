import React from 'react';
import { View, Text } from 'react-native';
import { createFormStyles } from '../common/FormStyles';

const UserInfoSection = ({ userData, currentColors }) => {
    const styles = createFormStyles(currentColors);

    // 데이터 안전하게 접근하는 헬퍼 함수
    const getFoodPreferences = () => {
        if (!userData) return [];
        
        // 가상 유저의 경우 food_preferences 배열 사용
        if (userData.food_preferences && Array.isArray(userData.food_preferences)) {
            return userData.food_preferences;
        }
        
        // 실제 사용자의 경우 foodPreferences 배열 사용
        if (userData.foodPreferences && Array.isArray(userData.foodPreferences)) {
            return userData.foodPreferences;
        }
        
        // 문자열로 저장된 경우 쉼표로 분리
        if (typeof userData.food_preferences === 'string') {
            return userData.food_preferences.split(',').map(item => item.trim()).filter(item => item);
        }
        
        if (typeof userData.foodPreferences === 'string') {
            return userData.foodPreferences.split(',').map(item => item.trim()).filter(item => item);
        }
        
        return [];
    };

    const getLunchStyle = () => {
        if (!userData) return [];
        
        // 가상 유저의 경우 lunch_style 배열 사용
        if (userData.lunch_style && Array.isArray(userData.lunch_style)) {
            return userData.lunch_style;
        }
        
        // 실제 사용자의 경우 lunchStyle 배열 사용
        if (userData.lunchStyle && Array.isArray(userData.lunchStyle)) {
            return userData.lunchStyle;
        }
        
        // 문자열로 저장된 경우 쉼표로 분리
        if (typeof userData.lunch_style === 'string') {
            return userData.lunch_style.split(',').map(item => item.trim()).filter(item => item);
        }
        
        if (typeof userData.lunchStyle === 'string') {
            return userData.lunchStyle.split(',').map(item => item.trim()).filter(item => item);
        }
        
        return [];
    };

    const getAllergies = () => {
        if (!userData) return [];
        
        // 가상 유저의 경우 allergies 배열 사용
        if (userData.allergies && Array.isArray(userData.allergies)) {
            return userData.allergies;
        }
        
        // 문자열로 저장된 경우 쉼표로 분리
        if (typeof userData.allergies === 'string') {
            return userData.allergies.split(',').map(item => item.trim()).filter(item => item);
        }
        
        return [];
    };

    const getPreferredTime = () => {
        if (!userData) return '';
        
        // 가상 유저의 경우 preferred_time 사용
        if (userData.preferred_time) {
            return userData.preferred_time;
        }
        
        // 실제 사용자의 경우 preferredTime 사용
        if (userData.preferredTime) {
            return userData.preferredTime;
        }
        
        return '';
    };

    const foodPreferences = getFoodPreferences();
    const lunchStyle = getLunchStyle();
    const allergies = getAllergies();
    const preferredTime = getPreferredTime();

    return (
        <>
            {/* 음식 선호도 */}
            <View style={[styles.formSection, { 
                backgroundColor: currentColors.surface,
                borderRadius: 12,
                padding: 20,
                marginHorizontal: 16, // 홈탭과 동일한 좌우 여백
                marginBottom: 16, // 24에서 16으로 줄여서 간격 좁힘
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 3.84,
                elevation: 5,
            }]}>
                <Text style={[styles.formSectionTitle, { marginBottom: 16 }]}>
                    🍽️ 음식 선호도
                </Text>
                {foodPreferences.length > 0 ? (
                    <View style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        alignItems: 'center'
                    }}>
                        {foodPreferences.map((pref, index) => (
                            <View key={index} style={{
                                backgroundColor: currentColors.primary,
                                borderRadius: 20,
                                paddingHorizontal: 12,
                                paddingVertical: 6,
                                marginRight: 8,
                                marginBottom: 8
                            }}>
                                <Text style={{
                                    color: 'white',
                                    fontSize: 14,
                                    fontWeight: '600'
                                }}>
                                    {pref}
                                </Text>
                            </View>
                        ))}
                    </View>
                ) : (
                    <View style={{
                        backgroundColor: currentColors.lightGray,
                        borderRadius: 12,
                        padding: 16,
                        alignItems: 'center'
                    }}>
                        <Text style={{
                            color: currentColors.textSecondary,
                            fontSize: 14,
                            fontStyle: 'italic'
                        }}>
                            입력된 정보가 없습니다
                        </Text>
                    </View>
                )}
            </View>
            
            {/* 점심 성향 */}
            <View style={[styles.formSection, { 
                backgroundColor: currentColors.surface,
                borderRadius: 12,
                padding: 20,
                marginHorizontal: 16, // 홈탭과 동일한 좌우 여백
                marginBottom: 16, // 24에서 16으로 줄여서 간격 좁힘
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 3.84,
                elevation: 5,
            }]}>
                <Text style={[styles.formSectionTitle, { marginBottom: 16 }]}>
                    🕐 점심 성향
                </Text>
                {lunchStyle.length > 0 ? (
                    <View style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        alignItems: 'center'
                    }}>
                        {lunchStyle.map((style, index) => (
                            <View key={index} style={{
                                backgroundColor: currentColors.primary, // secondary에서 primary로 변경하여 음식 선호도와 동일하게
                                borderRadius: 20,
                                paddingHorizontal: 12,
                                paddingVertical: 6,
                                marginRight: 8,
                                marginBottom: 8
                            }}>
                                <Text style={{
                                    color: 'white',
                                    fontSize: 14, // 14로 변경하여 음식 선호도와 동일하게
                                    fontWeight: '600'
                                }}>
                                    {style}
                                </Text>
                            </View>
                        ))}
                    </View>
                ) : (
                    <View style={{
                        backgroundColor: currentColors.lightGray,
                        borderRadius: 12,
                        padding: 16,
                        alignItems: 'center'
                    }}>
                        <Text style={{
                            color: currentColors.textSecondary,
                            fontSize: 14,
                            fontStyle: 'italic'
                        }}>
                            입력된 정보가 없습니다
                        </Text>
                    </View>
                )}
            </View>
            
            {/* 알레르기 정보 */}
            <View style={[styles.formSection, { 
                backgroundColor: currentColors.surface,
                borderRadius: 12,
                padding: 20,
                marginHorizontal: 16, // 홈탭과 동일한 좌우 여백
                marginBottom: 16, // 24에서 16으로 줄여서 간격 좁힘
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 3.84,
                elevation: 5,
            }]}>
                <Text style={[styles.formSectionTitle, { marginBottom: 16 }]}>
                    ⚠️ 알레르기 정보
                </Text>
                {allergies.length > 0 ? (
                    <View style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        alignItems: 'center'
                    }}>
                        {allergies.map((allergy, index) => (
                            <View key={index} style={{
                                backgroundColor: currentColors.primary, // success/warning에서 primary로 변경하여 음식 선호도와 동일하게
                                borderRadius: 20,
                                paddingHorizontal: 12,
                                paddingVertical: 6,
                                marginRight: 8,
                                marginBottom: 8
                            }}>
                                <Text style={{
                                    color: 'white',
                                    fontSize: 14, // 14로 변경하여 음식 선호도와 동일하게
                                    fontWeight: '600'
                                }}>
                                    {allergy}
                                </Text>
                            </View>
                        ))}
                    </View>
                ) : (
                    <View style={{
                        backgroundColor: currentColors.lightGray,
                        borderRadius: 12,
                        padding: 16,
                        alignItems: 'center'
                    }}>
                        <Text style={{
                            color: currentColors.textSecondary,
                            fontSize: 14,
                            fontStyle: 'italic'
                        }}>
                            입력된 정보가 없습니다
                        </Text>
                    </View>
                )}
            </View>
            
            {/* 선호 시간대 */}
            <View style={[styles.formSection, { 
                backgroundColor: currentColors.surface,
                borderRadius: 12,
                padding: 20,
                marginHorizontal: 16, // 홈탭과 동일한 좌우 여백
                marginBottom: 16, // 24에서 16으로 줄여서 간격 좁힘
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 3.84,
                elevation: 5,
            }]}>
                <Text style={[styles.formSectionTitle, { marginBottom: 16 }]}>
                    🕐 선호 시간대
                </Text>
                {preferredTime ? (
                    <View style={{
                        backgroundColor: currentColors.primary,
                        borderRadius: 20, // 20으로 변경하여 음식 선호도와 동일하게
                        paddingHorizontal: 12, // 16에서 12로 변경하여 음식 선호도와 동일하게
                        paddingVertical: 6, // 8에서 6으로 변경하여 음식 선호도와 동일하게
                        alignSelf: 'flex-start',
                        marginBottom: 8 // 8 추가하여 음식 선호도와 동일하게
                    }}>
                        <Text style={{
                            color: 'white',
                            fontSize: 14, // 16에서 14로 변경하여 음식 선호도와 동일하게
                            fontWeight: '600'
                        }}>
                            {preferredTime}
                        </Text>
                    </View>
                ) : (
                    <View style={{
                        backgroundColor: currentColors.lightGray,
                        borderRadius: 12,
                        padding: 16,
                        alignItems: 'center'
                    }}>
                        <Text style={{
                            color: currentColors.textSecondary,
                            fontSize: 14,
                            fontStyle: 'italic'
                        }}>
                            입력된 정보가 없습니다
                        </Text>
                    </View>
                )}
            </View>
        </>
    );
};

export default UserInfoSection;
