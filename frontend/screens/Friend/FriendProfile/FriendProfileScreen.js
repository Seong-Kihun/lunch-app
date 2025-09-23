import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { COLORS } from '../../../utils/commonStyles';

const FriendProfileScreen = ({ route, navigation }) => {
    const { friend, employeeId, isFriend, fromPersonalSchedule, fromRandomLunch, returnToHome, returnToSchedule, scheduleDate, scheduleEvent } = route.params;
    const currentColors = global.currentColors || COLORS.light;
    
    // 새로운 UserProfileScreen으로 리다이렉트
    useEffect(() => {
        navigation.replace('UserProfile', {
            friend: friend,
            employeeId: employeeId,
            isFriend: isFriend,
            fromPersonalSchedule: fromPersonalSchedule,
            fromRandomLunch: fromRandomLunch,
            returnToHome: returnToHome,
            returnToSchedule: returnToSchedule,
            scheduleDate: scheduleDate,
            scheduleEvent: scheduleEvent
        });
    }, [navigation, friend, employeeId, isFriend, fromPersonalSchedule, fromRandomLunch, returnToHome, returnToSchedule, scheduleDate, scheduleEvent]);
    
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

export default FriendProfileScreen;
