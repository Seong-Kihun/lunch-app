import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { createFormStyles } from '../common/FormStyles';

const UserActionButtons = ({ 
    isMyProfile, 
    isFriendStatus, 
    userData, 
    onAddFriend, 
    onRemoveFriend, 
    onStartChat, 
    onEditProfile,
    isLoading,
    currentColors 
}) => {
    const styles = createFormStyles(currentColors);

    if (isMyProfile) {
        // 내 프로필: 프로필 수정 버튼만
        return (
            <View style={{
                marginHorizontal: 16,
                marginBottom: 40,
                marginTop: 8
            }}>
                <TouchableOpacity
                    style={{
                        backgroundColor: currentColors.primary,
                        borderRadius: 16, // 8에서 16으로 변경하여 FormButton과 동일하게
                        padding: 16, // 12, 20에서 16으로 변경하여 FormButton과 동일하게
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: 56, // 48에서 56으로 변경하여 FormButton과 동일하게
                        shadowColor: '#000', // FormButton과 동일한 그림자 스타일
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                        elevation: 3, // 2에서 3으로 변경하여 FormButton과 동일하게
                    }}
                    onPress={onEditProfile}
                    activeOpacity={0.8}
                >
                    <Text style={{
                        color: 'white',
                        fontSize: 16, // FormButton과 동일한 폰트 크기
                        fontWeight: '600', // FormButton과 동일한 폰트 굵기
                        textAlign: 'center'
                    }}>
                        프로필 수정
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }

    // 다른 사용자 프로필: 친구 상태에 따른 버튼들
    return (
        <View style={{
            marginHorizontal: 16,
            marginBottom: 40,
            marginTop: 8
        }}>
            {isFriendStatus ? (
                // 이미 친구: 친구 삭제 + 채팅
                <>
                    <TouchableOpacity
                        style={{
                            backgroundColor: '#EF4444',
                            borderRadius: 16, // 8에서 16으로 변경하여 FormButton과 동일하게
                            padding: 16, // 12, 20에서 16으로 변경하여 FormButton과 동일하게
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: 56, // 48에서 56으로 변경하여 FormButton과 동일하게
                            shadowColor: '#000', // FormButton과 동일한 그림자 스타일
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.1,
                            shadowRadius: 4,
                            elevation: 3, // 2에서 3으로 변경하여 FormButton과 동일하게
                            marginBottom: 8 // 12에서 8로 줄여서 간격 좁힘
                        }}
                        onPress={onRemoveFriend}
                        activeOpacity={0.8}
                    >
                        <Text style={{
                            color: 'white',
                            fontSize: 16, // FormButton과 동일한 폰트 크기
                            fontWeight: '600', // FormButton과 동일한 폰트 굵기
                            textAlign: 'center'
                        }}>
                            친구 삭제
                        </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        style={{
                            backgroundColor: currentColors.primary,
                            borderRadius: 16, // 8에서 16으로 변경하여 FormButton과 동일하게
                            padding: 16, // 12, 20에서 16으로 변경하여 FormButton과 동일하게
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: 56, // 48에서 56으로 변경하여 FormButton과 동일하게
                            shadowColor: '#000', // FormButton과 동일한 그림자 스타일
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.1,
                            shadowRadius: 4,
                            elevation: 3, // 2에서 3으로 변경하여 FormButton과 동일하게
                        }}
                        onPress={onStartChat}
                        activeOpacity={0.8}
                    >
                        <Text style={{
                            color: 'white',
                            fontSize: 16, // FormButton과 동일한 폰트 크기
                            fontWeight: '600', // FormButton과 동일한 폰트 굵기
                            textAlign: 'center'
                        }}>
                            채팅하기
                        </Text>
                    </TouchableOpacity>
                </>
            ) : (
                // 친구가 아님: 친구 추가 + 채팅
                <>
                    <TouchableOpacity
                        style={{
                            backgroundColor: currentColors.gray, // secondary에서 gray로 변경하여 취소하기 버튼과 동일하게
                            borderRadius: 16, // 8에서 16으로 변경하여 FormButton과 동일하게
                            padding: 16, // 12, 20에서 16으로 변경하여 FormButton과 동일하게
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: 56, // 48에서 56으로 변경하여 FormButton과 동일하게
                            shadowColor: '#000', // FormButton과 동일한 그림자 스타일
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.1,
                            shadowRadius: 4,
                            elevation: 3, // 2에서 3으로 변경하여 FormButton과 동일하게
                            marginBottom: 8 // 12에서 8로 줄여서 간격 좁힘
                        }}
                        onPress={onAddFriend}
                        activeOpacity={0.8}
                        disabled={isLoading}
                    >
                        <Text style={{
                            color: 'white',
                            fontSize: 16, // FormButton과 동일한 폰트 크기
                            fontWeight: '600', // FormButton과 동일한 폰트 굵기
                            textAlign: 'center'
                        }}>
                            친구 추가
                        </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        style={{
                            backgroundColor: currentColors.primary,
                            borderRadius: 16, // 8에서 16으로 변경하여 FormButton과 동일하게
                            padding: 16, // 12, 20에서 16으로 변경하여 FormButton과 동일하게
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: 56, // 48에서 56으로 변경하여 FormButton과 동일하게
                            shadowColor: '#000', // FormButton과 동일한 그림자 스타일
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.1,
                            shadowRadius: 4,
                            elevation: 3, // 2에서 3으로 변경하여 FormButton과 동일하게
                        }}
                        onPress={onStartChat}
                        activeOpacity={0.8}
                    >
                        <Text style={{
                            color: 'white',
                            fontSize: 16, // FormButton과 동일한 폰트 크기
                            fontWeight: '600', // FormButton과 동일한 폰트 굵기
                            textAlign: 'center'
                        }}>
                            채팅하기
                        </Text>
                    </TouchableOpacity>
                </>
            )}
        </View>
    );
};

export default UserActionButtons;
