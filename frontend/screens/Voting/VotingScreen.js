import React from 'react';
import {
    View, Text, SafeAreaView
} from 'react-native';
import { COLORS } from '../../utils/commonStyles';

const VotingScreen = ({ navigation }) => {
    const currentColors = global.currentColors || COLORS.light;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: currentColors.background }}>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 24, color: currentColors.text, textAlign: 'center' }}>
                    투표 화면
                </Text>
                <Text style={{ fontSize: 16, color: currentColors.gray, marginTop: 20, textAlign: 'center' }}>
                    개발 중인 기능입니다
                </Text>
            </View>
        </SafeAreaView>
    );
};

export default VotingScreen;
