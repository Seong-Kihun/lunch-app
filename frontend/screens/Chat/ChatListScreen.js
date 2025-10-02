import React, { useState, useCallback } from 'react';
import {
    Text,
    View,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    ActivityIndicator,
    RefreshControl,
    Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import appService from '../services/AppService';
import{ getAccessToken } from '../../utils/secureStorage';
import COLORS from '../../components/common/Colors';
import basicStyles from '../../components/common/BasicStyles';
import ChatList from '../../components/chat/ChatList';

const { width } = Dimensions.get('window');

// 디버깅을 위한 로그
console.log('🔧 [ChatListScreen] RENDER_SERVER_URL:', RENDER_SERVER_URL);

export default function ChatListScreen({ navigation, route }) {
    // 통일된 색상 사용
    const currentColors = global.currentColors || COLORS.light;
    
    // currentUser를 route.params에서 가져오기
    const currentUser = route.params?.currentUser || global.currentUser;
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const handleRefresh = async () => {
        setRefreshing(true);
        // ChatList 컴포넌트에서 새로고침 처리
        setRefreshing(false);
    };

    useFocusEffect(useCallback(() => {
        console.log('🔄 [ChatListScreen] useFocusEffect 실행');
        setIsLoading(false); // ChatList 컴포넌트에서 로딩 처리
        
        // 🚨 중요: 소통탭 포커스 시 기본 상태로 리셋
        if (route?.params?.resetToDefault) {
            // 기본 상태로 리셋 요청이 있는 경우
            navigation.setParams({ resetToDefault: undefined });
            console.log('✅ [소통탭] 기본 상태로 리셋 완료');
        }
    }, [route?.params?.resetToDefault, navigation]));

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={currentColors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: currentColors.background }]}>
            {/* 새로운 ChatList 컴포넌트 사용 */}
            <ChatList
                navigation={navigation}
                userId={currentUser?.employee_id}
                onRefresh={handleRefresh}
                isLoading={isLoading}
            />

            {/* 플로팅 채팅방 만들기 버튼 */}
            <TouchableOpacity 
                style={[styles.floatingButton, { 
                    backgroundColor: currentColors.primary,
                    shadowColor: currentColors.primary
                }]}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('CreateChatRoom')}
            >
                <Ionicons name="chatbubbles" size={32} color="#fff" />
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    floatingButton: {
        position: 'absolute',
        bottom: 30,
        right: 30,
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#3B82F6',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.25,
        shadowRadius: 12,
    },
});
