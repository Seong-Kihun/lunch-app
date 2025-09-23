import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createFormStyles } from '../common/FormStyles';

const UserProfileHeader = ({ 
    userData, 
    pointsData, 
    isMyProfile, 
    isFriend, 
    onPoke: onWave, 
    currentColors 
}) => {
    const styles = createFormStyles(currentColors);
    
    return (
        <View style={[styles.formSection, { 
            backgroundColor: currentColors.surface,
            borderRadius: 12,
            padding: 20,
            marginHorizontal: 16, // 홈탭과 동일한 좌우 여백
            marginTop: 16, // 헤더와의 상단 여백 추가
            marginBottom: 16, // 24에서 16으로 줄여서 간격 좁힘
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 3.84,
            elevation: 5,
            alignItems: 'center'
        }]}>
            {/* Poke 버튼 - 친구인 경우에만 표시 */}
            {!isMyProfile && isFriend && (
                <TouchableOpacity
                    style={{
                        position: 'absolute', 
                        top: 16, 
                        right: 16, 
                        padding: 12,
                        backgroundColor: '#10B981', 
                        borderRadius: 20, 
                        shadowColor: '#10B981',
                        shadowOffset: { width: 0, height: 2 }, 
                        shadowOpacity: 0.3, 
                        shadowRadius: 4, 
                        elevation: 4, 
                        zIndex: 10,
                    }}
                    onPress={onWave}
                >
                    <Ionicons name="hand-left" size={20} color="white" />
                </TouchableOpacity>
            )}
            
            {/* 프로필 이미지 */}
            <View style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                backgroundColor: currentColors.primary,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 20,
                shadowColor: currentColors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 4,
            }}>
                <Text style={{ 
                    color: 'white', 
                    fontWeight: 'bold', 
                    fontSize: 36 
                }}>
                    {userData?.nickname ? userData.nickname.charAt(0) : '?'}
                </Text>
            </View>
            
            {/* 닉네임 (부서정보 삭제) */}
            <Text style={{ 
                fontSize: 24, 
                fontWeight: 'bold', 
                color: currentColors.text,
                marginBottom: 20,
                textAlign: 'center'
            }}>
                {userData?.nickname || '닉네임 없음'}
            </Text>
            
            {/* 레벨과 포인트 */}
            <View style={{
                flexDirection: 'row',
                justifyContent: 'space-around',
                width: '100%',
                paddingHorizontal: 20
            }}>
                <View style={{ alignItems: 'center' }}>
                    <Text style={{ 
                        fontSize: 14, 
                        color: currentColors.textSecondary,
                        marginBottom: 4
                    }}>
                        레벨
                    </Text>
                    <Text style={{ 
                        fontSize: 20, 
                        fontWeight: 'bold', 
                        color: currentColors.primary 
                    }}>
                        {pointsData?.level || 1}
                    </Text>
                </View>
                
                <View style={{ alignItems: 'center' }}>
                    <Text style={{ 
                        fontSize: 14, 
                        color: currentColors.textSecondary,
                        marginBottom: 4
                    }}>
                        포인트
                    </Text>
                    <Text style={{ 
                        fontSize: 20, 
                        fontWeight: 'bold', 
                        color: currentColors.primary 
                    }}>
                        {pointsData?.points?.toLocaleString() || 0}
                    </Text>
                </View>
            </View>
        </View>
    );
};

export default UserProfileHeader;
