import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createFormStyles } from '../common/FormStyles';

const { width } = Dimensions.get('window');

const UserActivitySection = ({ 
    lastLunchTogether, 
    badges, 
    isMyProfile, // 내 프로필 여부 추가
    currentColors 
}) => {
    const styles = createFormStyles(currentColors);
    
    const getLastLunchColor = (date) => {
        if (!date || !(date instanceof Date)) return currentColors.textSecondary;
        
        const daysDiff = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24));
        
        if (daysDiff <= 1) return '#10B981'; // 초록색 (최근)
        if (daysDiff <= 7) return '#F59E0B'; // 주황색 (1주 이내)
        if (daysDiff <= 30) return '#EF4444'; // 빨간색 (1달 이내)
        return currentColors.textSecondary; // 회색 (오래됨)
    };
    
    return (
        <>
            {/* 마지막 점심 정보 - 내 프로필이 아닌 경우에만 표시 */}
            {!isMyProfile && lastLunchTogether && (
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
                        🍽️ 마지막 점심
                    </Text>
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <Text style={{ 
                            fontSize: 16, 
                            color: currentColors.text,
                            flex: 1
                        }}>
                            {lastLunchTogether.restaurant || '식당 정보 없음'}
                        </Text>
                        <Text style={{ 
                            fontSize: 14, 
                            color: getLastLunchColor(lastLunchTogether.date),
                            fontWeight: '600'
                        }}>
                            {lastLunchTogether.date && lastLunchTogether.date instanceof Date ? 
                                `${Math.floor((new Date() - lastLunchTogether.date) / (1000 * 60 * 60 * 24))}일 전` : 
                                '날짜 정보 없음'
                            }
                        </Text>
                    </View>
                </View>
            )}
            
            {/* 배지 섹션 */}
            {badges && badges.length > 0 && (
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
                        🏆 획득한 배지
                    </Text>
                    <View style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        justifyContent: 'flex-start', // space-between에서 flex-start로 변경하여 왼쪽 정렬
                        gap: 8 // 12에서 8로 줄여서 5열 배치에 맞춤
                    }}>
                        {badges.map((badge, index) => {
                            // 배지 데이터 구조에 따라 아이콘과 색상 결정
                            let badgeIcon = 'trophy';
                            let badgeColor = '#F59E0B';
                            
                            // 배지 이름에 따른 아이콘 매핑
                            if (typeof badge === 'string') {
                                if (badge.includes('방문') || badge.includes('탐험')) {
                                    badgeIcon = 'map';
                                    badgeColor = '#3B82F6';
                                } else if (badge.includes('리뷰') || badge.includes('이야기')) {
                                    badgeIcon = 'chatbubble';
                                    badgeColor = '#10B981';
                                } else if (badge.includes('파티') || badge.includes('사교')) {
                                    badgeIcon = 'people';
                                    badgeColor = '#8B5CF6';
                                } else if (badge.includes('랜덤') || badge.includes('도전')) {
                                    badgeIcon = 'shuffle';
                                    badgeColor = '#06B6D4';
                                } else if (badge.includes('한식') || badge.includes('음식')) {
                                    badgeIcon = 'restaurant';
                                    badgeColor = '#EF4444';
                                }
                            }
                            
                            return (
                                <View key={index} style={{
                                    width: '18%', // 48%에서 18%로 변경하여 5열 배치 (100% ÷ 5 = 20%, 여백 고려하여 18%)
                                    backgroundColor: currentColors.surface,
                                    borderRadius: 12,
                                    padding: 12, // 16에서 12로 줄여서 5열에 맞춤
                                    alignItems: 'center',
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 1 },
                                    shadowOpacity: 0.05,
                                    shadowRadius: 4,
                                    elevation: 2,
                                    borderWidth: 1,
                                    borderColor: currentColors.lightGray,
                                }}>
                                    <View style={{
                                        width: 40, // 56에서 40으로 줄여서 5열에 맞춤
                                        height: 40, // 56에서 40으로 줄여서 5열에 맞춤
                                        borderRadius: 20, // 28에서 20으로 줄여서 5열에 맞춤
                                        backgroundColor: badgeColor + '15',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        marginBottom: 8 // 12에서 8로 줄여서 5열에 맞춤
                                    }}>
                                        <Ionicons name={badgeIcon} size={20} color={badgeColor} /> {/* 28에서 20으로 줄여서 5열에 맞춤 */}
                                    </View>
                                    <Text style={{
                                        fontSize: 12, // 11에서 12로 변경하여 앱 내 다른 작은 글자 크기와 통일
                                        fontWeight: '600',
                                        color: currentColors.text,
                                        textAlign: 'center',
                                        lineHeight: 16, // 14에서 16으로 변경하여 12px 폰트에 맞춤
                                        height: 32 // 28에서 32로 변경하여 12px 폰트에 맞춤
                                    }}>
                                        {typeof badge === 'string' ? badge : badge.name || `배지 ${index + 1}`}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                </View>
            )}
        </>
    );
};

export default UserActivitySection;
