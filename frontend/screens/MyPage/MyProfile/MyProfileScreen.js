import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { COLORS } from '../../../utils/commonStyles';

const MyProfileScreen = ({ navigation }) => {
    const currentColors = global.currentColors || COLORS.light;
    
    // 새로운 UserProfileScreen으로 리다이렉트
    useEffect(() => {
        navigation.replace('UserProfile', { 
            friend: { employee_id: global.myEmployeeId },
            isMyProfile: true 
        });
    }, [navigation]);
    
    // 로딩 화면 표시
    return (
        <View style={{ 
            flex: 1, 
            justifyContent: 'center', 
            alignItems: 'center',
            backgroundColor: currentColors.background 
        }}>
            <ActivityIndicator size="large" color={currentColors.primary} />
        </View>
    );
};

export default MyProfileScreen;
