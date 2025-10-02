import React, { useState, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, SafeAreaView, FlatList, ActivityIndicator, Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../utils/commonStyles';
import appService from '../services/AppService'; // 가상 유저 데이터 import 제거

const FriendListScreen = ({ navigation }) => {
    const [friends, setFriends] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const currentColors = global.currentColors || COLORS.light;

    useFocusEffect(useCallback(() => {
        fetchFriends();
        
        // 친구 추가 플래그 확인 및 친구 목록 새로고침
        if (global.friendAdded || global.forceRefreshFriends) {
            console.log('🔄 [친구목록] 친구 추가 감지, 친구 목록 새로고침');
            fetchFriends();
            
            // 전역 변수 초기화
            if (typeof global !== 'undefined') {
                global.friendAdded = false;
                global.lastFriendAddedTime = undefined;
                global.forceRefreshFriends = false;
            }
        }
    }, [global?.friendAdded, global?.forceRefreshFriends]));

    const fetchFriends = async () => {
        try {
            setIsLoading(true);
            // 친구 목록 API 사용
            const response = await appService.get(`/api/friends?employee_id=${global.myEmployeeId || '1'}`);
            if (response.success) {
                // 실제 친구 데이터 사용
                const friendsWithLastLunch = response.friends || [];
                
                setFriends(friendsWithLastLunch);
                console.log('🔍 [친구목록] 가상 친구 관계 로드 성공:', friendsWithLastLunch.length);
            } else {
                Alert.alert('오류', '가상 친구 목록을 가져오는데 실패했습니다.');
            }
        } catch (error) {
            console.error('친구 목록 조회 오류:', error);
            Alert.alert('오류', '네트워크에 문제가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUnfriend = async (friendId) => {
        Alert.alert(
            '친구 삭제',
            '정말로 이 친구를 삭제하시겠습니까?',
            [
                { text: '취소', style: 'cancel' },
                { 
                    text: '삭제', 
                    style: 'destructive', 
                    onPress: async () => {
                        try {
                            const response = await appService.post('/api/friends/remove', {
                                employee_id: friendId
                            });
                            if (response.success) {
                                Alert.alert('성공', '친구가 삭제되었습니다.');
                                fetchFriends();
                            } else {
                                Alert.alert('오류', response.error || '친구 삭제에 실패했습니다.');
                            }
                        } catch (error) {
                            Alert.alert('오류', '네트워크에 문제가 발생했습니다.');
                        }
                    }
                }
            ]
        );
    };

    if (isLoading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: currentColors.background }}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={currentColors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: currentColors.background }}>
            <FlatList
                data={friends}
                keyExtractor={(item, index) => `friend-${item.employee_id}-${index}`}
                ListEmptyComponent={<Text style={{ textAlign: 'center', color: currentColors.gray, marginTop: 50 }}>친구가 없습니다.</Text>}
                renderItem={({ item }) => (
                    <TouchableOpacity 
                        style={{ 
                            flexDirection: 'row', 
                            alignItems: 'center', 
                            padding: 20, 
                            borderBottomWidth: 1, 
                            borderBottomColor: currentColors.lightGray,
                            backgroundColor: currentColors.white
                        }}
                                                    onPress={() => navigation.navigate('UserProfile', { friend: item, isFriend: true })}
                    >
                        <View style={{
                            width: 50,
                            height: 50,
                            borderRadius: 25,
                            backgroundColor: currentColors.primary,
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginRight: 15
                        }}>
                            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 20 }}>
                                {item.nickname ? item.nickname.charAt(0) : '?'}
                            </Text>
                        </View>
                        
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 18, fontWeight: '600', color: currentColors.text }}>
                                {item.nickname}
                            </Text>
                            <Text style={{ fontSize: 14, color: currentColors.gray, marginTop: 4 }}>
                                {item.lunch_preference || '취향 정보 없음'}
                            </Text>
                        </View>
                        
                        <TouchableOpacity 
                            style={{ 
                                backgroundColor: currentColors.error, 
                                paddingHorizontal: 12, 
                                paddingVertical: 6, 
                                borderRadius: 16 
                            }}
                            onPress={() => handleUnfriend(item.employee_id)}
                        >
                            <Text style={{ color: 'white', fontSize: 12, fontWeight: '500' }}>삭제</Text>
                        </TouchableOpacity>
                    </TouchableOpacity>
                )}
            />
        </SafeAreaView>
    );
};

export default FriendListScreen;
