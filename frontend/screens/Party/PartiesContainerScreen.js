import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    View,
    SafeAreaView,
    TouchableOpacity,
    Text,
    StyleSheet,
    Dimensions
} from 'react-native';
// import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs'; // 더 이상 사용하지 않음
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// 스크린들
import RandomLunchScreen from './RandomLunch/RandomLunchScreen';
import PartyListScreen from './PartyListScreen';
import DangolPotContainerScreen from '../DangolPot/DangolPotContainerScreen';

// 컨텍스트
import { useNewSchedule } from '../../contexts/NewScheduleContext';
import { COLORS } from '../../utils/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// const TopTab = createMaterialTopTabNavigator(); // 더 이상 사용하지 않음

export default function PartiesContainerScreen({ navigation, route }) {
    // currentUser를 global에서 가져오기
    const currentUser = global.currentUser || { employee_id: '1', nickname: '사용자' };
    const [tabIndex, setTabIndex] = useState(0);
    const [newPartyData, setNewPartyData] = useState(null);
    
    // refreshPartyTab 상태를 로컬에서 관리
    const [refreshPartyTab, setRefreshPartyTab] = useState(false);
    
    const currentTabIndexRef = useRef(0);
    const isProcessingSwitchToTab = useRef(false);
    
    // 색상 정의 - 더 안전한 fallback 사용
    const currentColors = (() => {
        console.log('🔍 [PartiesContainer] 색상 정의 시작');
        console.log('🔍 [PartiesContainer] global.currentColors:', global.currentColors);
        console.log('🔍 [PartiesContainer] COLORS:', COLORS);
        console.log('🔍 [PartiesContainer] COLORS.light:', COLORS?.light);
        
        try {
            // global.currentColors가 완전히 정의되어 있는지 확인
            if (global.currentColors && 
                global.currentColors.background && 
                global.currentColors.primary && 
                global.currentColors.primaryLight) {
                console.log('✅ [PartiesContainer] global.currentColors 사용:', global.currentColors);
                return global.currentColors;
            }
            
            // COLORS.light가 안전한지 확인
            if (COLORS && COLORS.light && COLORS.light.surface) {
                const fallbackColors = {
                    background: COLORS.light.surface,
                    surface: COLORS.light.surface,
                    primary: COLORS.light.primary,
                    primaryLight: COLORS.light.primaryLight,
                    text: COLORS.light.text,
                    textSecondary: COLORS.light.textSecondary,
                    border: COLORS.light.lightGray
                };
                console.log('✅ [PartiesContainer] COLORS.light 기반 fallback 사용:', fallbackColors);
                return fallbackColors;
            }
            
            // 모든 fallback이 실패한 경우 하드코딩된 기본값 사용
            const hardcodedColors = {
                background: '#FFFFFF',
                surface: '#FFFFFF',
                primary: '#007AFF',
                primaryLight: '#E3F2FD',
                text: '#000000',
                textSecondary: '#666666',
                border: '#E5E5EA'
            };
            console.log('✅ [PartiesContainer] 하드코딩된 기본값 사용:', hardcodedColors);
            return hardcodedColors;
        } catch (error) {
            console.error('❌ [PartiesContainer] 색상 정의 오류:', error);
            // 에러 발생 시에도 안전한 기본값 반환
            const errorFallbackColors = {
                background: '#FFFFFF',
                surface: '#FFFFFF',
                primary: '#007AFF',
                primaryLight: '#E3F2FD',
                text: '#000000',
                textSecondary: '#666666',
                border: '#E5E5EA'
            };
            console.log('✅ [PartiesContainer] 에러 상황용 기본값 사용:', errorFallbackColors);
            return errorFallbackColors;
        }
    })();
    
    // 디버깅: currentColors 최종 결과 확인
    console.log('🔍 [PartiesContainer] 최종 currentColors:', currentColors);
    console.log('🔍 [PartiesContainer] currentColors.background:', currentColors?.background);
    console.log('🔍 [PartiesContainer] currentColors.primary:', currentColors?.primary);
    
    // currentColors가 완전히 정의되었는지 최종 검증
    if (!currentColors || !currentColors.background || !currentColors.primary) {
        console.error('❌ [PartiesContainer] currentColors가 불완전합니다:', currentColors);
        // 강제로 안전한 기본값 설정
        const emergencyColors = {
            background: '#FFFFFF',
            surface: '#FFFFFF',
            primary: '#007AFF',
            primaryLight: '#E3F2FD',
            text: '#000000',
            textSecondary: '#666666',
            border: '#E5E5EA'
        };
        console.log('🚨 [PartiesContainer] 비상 기본값 사용:', emergencyColors);
        return emergencyColors;
    }
    
    // NewScheduleContext 사용
    const { newScheduleData, clearNewSchedule } = useNewSchedule();

    // 새 스케줄 데이터가 있을 때 파티 탭으로 이동
    useEffect(() => {
        if (newScheduleData && newScheduleData.type === 'party') {
            // 일반파티 탭으로 이동
            setTabIndex(1);
            currentTabIndexRef.current = 1;
            
            // 새 파티 데이터 설정
            setNewPartyData(newScheduleData);
            setRefreshPartyTab(true);
            
            // 컨텍스트 클리어
            clearNewSchedule();
        }
    }, [newScheduleData, clearNewSchedule]);

    // route.params에서 switchToTab 확인하여 특정 탭으로 이동
    useEffect(() => {
        if (route.params?.switchToTab !== undefined) {
            const targetTabIndex = route.params.switchToTab;
            
            // switchToTab 처리 중임을 표시
            isProcessingSwitchToTab.current = true;
            
            setTabIndex(targetTabIndex);
            currentTabIndexRef.current = targetTabIndex;
            
            // 파라미터 초기화
            navigation.setParams({ switchToTab: undefined });
            
            // 500ms 후에 처리 완료 표시
            setTimeout(() => {
                isProcessingSwitchToTab.current = false;
            }, 500);
        }
    }, [route.params?.switchToTab, navigation]);

    // tabIndex가 변경될 때 TopTab.Navigator가 자동으로 해당 탭으로 이동
    useEffect(() => {
        console.log('🔍 [PartiesContainer] tabIndex 변경됨:', tabIndex);
        // key={tabIndex}를 사용하여 Navigator를 다시 렌더링하므로 별도 로직 불필요
    }, [tabIndex]);

    // 새 파티 생성 감지하여 파티 탭 새로고침
    useEffect(() => {
        if (refreshPartyTab) {
            console.log('🔍 [PartiesContainer] refreshPartyTab 감지');
            
            // global.newParty에서 새 파티 데이터 가져오기
            if (global.newParty) {
                console.log('🔍 [PartiesContainer] global.newParty 데이터:', global.newParty);
                setNewPartyData(global.newParty);
                
                // Context 변수는 유지 (PartyListScreen에서 사용할 수 있도록)
                setRefreshPartyTab(false);
                
                // 일반파티 탭으로 이동하여 새로고침
                setTabIndex(1);
                currentTabIndexRef.current = 1;
                
                console.log('✅ [PartiesContainer] 파티 탭 새로고침 완료');
            } else {
                console.log('⚠️ [PartiesContainer] global.newParty 데이터 없음');
                setRefreshPartyTab(false);
            }
        }
    }, [refreshPartyTab]);

    // 파티탭 포커스 시 기본 상태로 리셋
    useFocusEffect(useCallback(() => {
        console.log('🔍 [PartiesContainer] useFocusEffect 실행');
        console.log('🔍 [PartiesContainer] route.params:', route.params);
        console.log('🔍 [PartiesContainer] currentColors:', currentColors);
        
        // 파티탭이 포커스될 때마다 기본 상태로 리셋
        if (route.params?.resetToDefault) {
            // 기본 상태로 리셋 요청이 있는 경우
            navigation.setParams({ resetToDefault: undefined });
            
            // 기본 탭(랜덤런치)으로 리셋
            setTabIndex(0);
            currentTabIndexRef.current = 0;
            
            console.log('✅ [파티탭] 기본 상태로 리셋 완료');
        }
    }, [route.params?.resetToDefault, navigation]));
    
    // 컴포넌트 마운트 시 기본 탭으로 설정
    useEffect(() => {
        console.log('🔍 [PartiesContainer] useEffect 실행 - 컴포넌트 마운트');
        console.log('🔍 [PartiesContainer] currentColors:', currentColors);
        console.log('🔍 [PartiesContainer] currentUser:', currentUser);
        
        setTabIndex(0);
        currentTabIndexRef.current = 0;
        console.log('✅ [파티탭] 초기 탭 설정 완료 (랜덤런치)');
    }, []);
    
    const handleAddPress = () => {
        const currentIndex = currentTabIndexRef.current;
        
        if (currentIndex === 0) {
            // 랜덤런치 탭에서는 제안 기반 시스템으로 이동
            navigation.navigate('RandomLunch');
        } else if (currentIndex === 1) {
            // 일반파티 탭에서는 새 파티 만들기 화면으로 이동
            navigation.navigate('CreateParty');
        } else if (currentIndex === 2) {
            // 단골파티 탭에서는 새 단골파티 만들기 화면으로 이동
            navigation.navigate('CreateDangolPot');
        }
    };
    
    return (
        <SafeAreaView style={{flex: 1, backgroundColor: currentColors.background}}>
            {/* 커스텀 탭 네비게이션 */}
            <View style={{
                flexDirection: 'row',
                backgroundColor: '#FFFFFF',
                borderBottomWidth: 1,
                borderBottomColor: '#E5E7EB',
                paddingVertical: 0,
                paddingHorizontal: 0,
                marginBottom: 0,
                elevation: 0,
                shadowColor: 'transparent',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0,
                shadowRadius: 0,
            }}>
                <TouchableOpacity
                    style={{
                        flex: 1,
                        paddingVertical: 16,
                        alignItems: 'center',
                        borderBottomWidth: tabIndex === 0 ? 2 : 0,
                        borderBottomColor: currentColors.primary,
                        backgroundColor: tabIndex === 0 ? currentColors.primaryLight : 'transparent'
                    }}
                    onPress={() => {
                        setTabIndex(0);
                        currentTabIndexRef.current = 0;
                    }}
                >
                    <Text style={{
                        fontSize: 16,
                        fontWeight: tabIndex === 0 ? 'bold' : 'normal',
                        color: tabIndex === 0 ? currentColors.primary : currentColors.textSecondary
                    }}>
                        랜덤런치
                    </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                    style={{
                        flex: 1,
                        paddingVertical: 16,
                        alignItems: 'center',
                        borderBottomWidth: tabIndex === 1 ? 2 : 0,
                        borderBottomColor: currentColors.primary,
                        backgroundColor: tabIndex === 1 ? currentColors.primaryLight : 'transparent'
                    }}
                    onPress={() => {
                        setTabIndex(1);
                        currentTabIndexRef.current = 1;
                    }}
                >
                    <Text style={{
                        fontSize: 16,
                        fontWeight: tabIndex === 1 ? 'bold' : 'normal',
                        color: tabIndex === 1 ? currentColors.primary : currentColors.textSecondary
                    }}>
                        일반파티
                    </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                    style={{
                        flex: 1,
                        paddingVertical: 16,
                        alignItems: 'center',
                        borderBottomWidth: tabIndex === 2 ? 2 : 0,
                        borderBottomColor: currentColors.primary,
                        backgroundColor: tabIndex === 2 ? currentColors.primaryLight : 'transparent'
                    }}
                    onPress={() => {
                        setTabIndex(2);
                        currentTabIndexRef.current = 2;
                    }}
                >
                    <Text style={{
                        fontSize: 16,
                        fontWeight: tabIndex === 2 ? 'bold' : 'normal',
                        color: tabIndex === 2 ? currentColors.primary : currentColors.textSecondary
                    }}>
                        단골파티
                    </Text>
                </TouchableOpacity>
            </View>

            {/* 탭 컨텐츠 - 조건부 렌더링으로 변경 */}
            <View style={{ flex: 1 }}>
                {tabIndex === 0 && (
                    <RandomLunchScreen 
                        navigation={navigation}
                        route={{
                            params: {
                                fromPartyTab: true,
                                currentTabIndex: tabIndex
                            }
                        }}
                    />
                )}
                {tabIndex === 1 && (
                    <PartyListScreen 
                        navigation={navigation}
                        route={{
                            params: {
                                refreshPartyTab,
                                newPartyData,
                                setRefreshPartyTab,
                                setNewPartyData,
                                currentTabIndex: tabIndex
                            }
                        }}
                    />
                )}
                {tabIndex === 2 && (
                    <DangolPotContainerScreen 
                        navigation={navigation}
                        route={{
                            params: {
                                currentTabIndex: tabIndex
                            }
                        }}
                    />
                )}
            </View>
            
            {/* 플로팅 액션 버튼 */}
            <TouchableOpacity 
                style={{
                    position: 'absolute',
                    right: 24,
                    bottom: 32,
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: currentColors.primary,
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 10,
                    elevation: 8,
                    shadowColor: currentColors.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8
                }}
                activeOpacity={0.85}
                onPress={handleAddPress}
            >
                <Ionicons name="add" size={32} color="#fff" />
            </TouchableOpacity>
        </SafeAreaView>
    );
}
