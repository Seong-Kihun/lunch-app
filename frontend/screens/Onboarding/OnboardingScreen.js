import React, { useState } from 'react';
import { 
    Text, 
    View, 
    StyleSheet,
    TouchableOpacity,
    SafeAreaView, 
    ScrollView, 
    TextInput
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { setOnboardingCompleted } from '../../utils/onboardingUtils';
import { useAuth } from '../../contexts/AuthContext';
import { useUnifiedNetwork } from '../../contexts/UnifiedNetworkContext';

// 디버깅을 위한 로그
console.log('🔧 [OnboardingScreen] serverURL:', serverURL);

export default function OnboardingScreen() {
    const { user, updateUser } = useAuth();
    const { serverURL, getServerURL, isConnected, isInitialized } = useUnifiedNetwork();
    const [currentStep, setCurrentStep] = useState(0);
    const [userPreferences, setUserPreferences] = useState({
        nickname: '',
        foodPreferences: [],
        lunchStyle: [],
        allergies: [],
        preferredTime: ''
    });
    const [nicknameError, setNicknameError] = useState('');
    const [checkingNickname, setCheckingNickname] = useState(false);
    
    const onboardingSteps = [
        {
            title: '닉네임 설정',
            description: '앱에서 사용할 닉네임을 입력해주세요',
            type: 'input',
            key: 'nickname'
        },
        {
            title: '점심 선호도 설정',
            description: '좋아하는 음식 종류를 선택해주세요',
            type: 'multiSelect',
            options: ['한식', '중식', '일식', '양식', '분식', '카페', '패스트푸드'],
            key: 'foodPreferences'
        },
        {
            title: '점심 성향',
            description: '당신의 점심 스타일을 선택해주세요',
            type: 'multiSelect',
            options: ['가성비 좋은 곳', '맛집 탐방', '건강한 식사', '빠른 식사', '새로운 메뉴 도전', '친구들과 함께', '혼자 조용히', '분위기 좋은 곳'],
            key: 'lunchStyle'
        },
        {
            title: '알레르기 정보',
            description: '알레르기가 있는 음식을 선택해주세요',
            type: 'multiSelect',
            options: ['없음', '갑각류', '견과류', '우유', '계란', '밀', '대두', '생선'],
            key: 'allergies'
        },
        {
            title: '선호 시간대',
            description: '주로 점심을 먹는 시간대를 선택해주세요',
            type: 'singleSelect',
            options: ['11:30', '11:45', '12:00', '12:15', '12:30'],
            key: 'preferredTime'
        }
    ];

    const handleNext = async () => {
        if (onboardingSteps[currentStep].key === 'nickname') {
            // 닉네임 중복 체크
            setCheckingNickname(true);
            setNicknameError('');
            const nickname = userPreferences.nickname.trim();
            if (!nickname) {
                setNicknameError('닉네임을 입력해주세요.');
                setCheckingNickname(false);
                return;
            }
            try {
                    const serverURLToUse = serverURL || RENDER_SERVER_URL;
                    console.log('🔍 [OnboardingScreen] 닉네임 중복 확인 서버 URL:', serverURLToUse);
                    const res = await fetch(`${serverURLToUse}/users/check-nickname?nickname=${encodeURIComponent(nickname)}`);
                    const data = await res.json();
                    if (data.exists) {
                        setNicknameError('이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해주세요.');
                        setCheckingNickname(false);
                        return;
                    }
                } catch (e) {
                    console.error('❌ [OnboardingScreen] 닉네임 중복 확인 오류:', e);
                    setNicknameError('닉네임 중복 확인 중 오류가 발생했습니다.');
                    setCheckingNickname(false);
                    return;
                }
            setCheckingNickname(false);
        }
        if (currentStep < onboardingSteps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            // 온보딩 완료, 사용자 설정 저장
            try {
                await saveUserPreferences();
                
                // 사용자별 온보딩 완료 상태 저장 - 강화된 null 체크
                if (user && user.employee_id) {
                    await setOnboardingCompleted(user.employee_id);
                    console.log(`✅ 사용자 ${user.employee_id} 온보딩 완료 상태 저장됨`);
                    
                    // 사용자 정보에 온보딩 완료 상태 추가하여 강제로 상태 업데이트
                    const updatedUser = {
                        ...user,
                        onboardingCompleted: true
                    };
                    updateUser(updatedUser);
                    console.log(`🔄 사용자 정보 업데이트로 온보딩 완료 상태 반영`);
                } else {
                    console.error('❌ 사용자 정보가 없어서 온보딩 완료 상태 저장 실패:', { 
                        hasUser: !!user, 
                        hasEmployeeId: !!user?.employee_id,
                        userObject: user 
                    });
                    throw new Error('사용자 정보가 없어서 온보딩을 완료할 수 없습니다. 다시 로그인해주세요.');
                }
            } catch (error) {
                console.error('❌ 온보딩 완료 처리 중 오류:', error);
                
                // 사용자 정보가 있는 경우에만 온보딩 완료 상태 저장 시도
                if (user && user.employee_id) {
                    try {
                        await setOnboardingCompleted(user.employee_id);
                        console.log('🔄 오류 발생 시에도 온보딩 완료 상태 저장 성공');
                    } catch (onboardingError) {
                        console.error('❌ 온보딩 완료 상태 저장도 실패:', onboardingError);
                    }
                } else {
                    console.error('❌ 사용자 정보가 없어서 온보딩 완료 상태 저장 불가');
                }
                
                // 에러를 다시 던져서 상위에서 처리할 수 있도록 함
                throw error;
            }
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleOptionSelect = (option) => {
        const currentKey = onboardingSteps[currentStep].key;
        const currentStepData = onboardingSteps[currentStep];
        if (currentStepData.type === 'multiSelect') {
            setUserPreferences(prev => ({
                ...prev,
                [currentKey]: prev[currentKey].includes(option)
                    ? prev[currentKey].filter(item => item !== option)
                    : [...prev[currentKey], option]
            }));
        } else {
            setUserPreferences(prev => ({
                ...prev,
                [currentKey]: option
            }));
        }
    };

    const saveUserPreferences = async () => {
        try {
            console.log('🔧 사용자 설정 저장 시작:', userPreferences);
            
            // 사용자 정보 null 체크 강화
            if (!user || !user.employee_id) {
                console.error('❌ 사용자 정보가 없어서 설정 저장 불가:', { user: !!user, employee_id: user?.employee_id });
                throw new Error('사용자 정보가 없습니다. 다시 로그인해주세요.');
            }
            
            // 사용자 기본 정보 저장
            const userData = {
                nickname: userPreferences.nickname,
                lunch_preference: userPreferences.lunchStyle?.join(', ') || '',
                main_dish_genre: userPreferences.foodPreferences?.join(', ') || '',
                main_dish: userPreferences.foodPreferences?.join(', ') || '', // 주종목으로 음식 선호도 저장
            };
            
            console.log('🔧 사용자 기본 정보 저장 시도:', { employee_id: user.employee_id, userData });
            
            // 동적 서버 URL 가져오기
            const currentServerURL = getServerURL();
            if (!currentServerURL) {
                throw new Error('서버 URL을 가져올 수 없습니다.');
            }
            
            console.log('🔧 [OnboardingScreen] 서버 URL 사용:', currentServerURL);
            
            const userResponse = await fetch(`${currentServerURL}/users/${user.employee_id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
            
            if (!userResponse.ok) {
                console.warn('⚠️ 사용자 기본 정보 저장 실패:', userResponse.status);
            } else {
                console.log('✅ 사용자 기본 정보 저장 성공');
            }
            
            // 사용자 선호도 정보 저장
            const preferencesData = {
                foodPreferences: userPreferences.foodPreferences || [],
                allergies: userPreferences.allergies || [],
                preferredTime: userPreferences.preferredTime || '',
                frequentAreas: []
            };
            
            const preferencesResponse = await fetch(`${currentServerURL}/users/${user.employee_id}/preferences`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(preferencesData)
            });
            
            if (!preferencesResponse.ok) {
                console.warn('⚠️ 사용자 선호도 저장 실패:', preferencesResponse.status);
            } else {
                console.log('✅ 사용자 선호도 저장 성공');
            }
            
            console.log('🔧 사용자 설정 저장 완료');
        } catch (error) {
            console.error('사용자 설정 저장 실패:', error);
            throw error; // 상위 함수에서 처리할 수 있도록 오류 전파
        }
    };

    const currentStepData = onboardingSteps[currentStep];
    const selectedOptions = userPreferences[currentStepData.key] || [];

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.progressContainer}>
                <View style={styles.progressDots}>
                    {onboardingSteps.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.progressDot,
                                index <= currentStep ? styles.progressDotActive : styles.progressDotInactive
                            ]}
                        />
                    ))}
                </View>
                <Text style={styles.progressText}>
                    {currentStep + 1} / {onboardingSteps.length}
                </Text>
            </View>

            <View style={styles.contentContainer}>
                <Text style={styles.title}>{currentStepData.title}</Text>
                <Text style={styles.description}>{currentStepData.description}</Text>
                
                {currentStepData.type === 'input' ? (
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={[
                                styles.textInput,
                                nicknameError ? styles.textInputError : null
                            ]}
                            placeholder="닉네임을 입력하세요"
                            placeholderTextColor="#999"
                            value={userPreferences.nickname}
                            onChangeText={text => setUserPreferences(prev => ({ ...prev, nickname: text }))}
                            editable={!checkingNickname}
                        />
                        {nicknameError ? (
                            <Text style={styles.errorText}>{nicknameError}</Text>
                        ) : null}
                    </View>
                ) : (
                    <ScrollView style={styles.optionsContainer} showsVerticalScrollIndicator={false}>
                        {currentStepData.options.map((option) => (
                            <TouchableOpacity
                                key={option}
                                style={[
                                    styles.optionButton,
                                    selectedOptions.includes(option) ? styles.optionButtonSelected : null
                                ]}
                                onPress={() => handleOptionSelect(option)}
                            >
                                <Text style={[
                                    styles.optionText,
                                    selectedOptions.includes(option) ? styles.optionTextSelected : null
                                ]}>
                                    {option}
                                </Text>
                                {selectedOptions.includes(option) && (
                                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                                )}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}
            </View>

            <View style={styles.buttonContainer}>
                {currentStep > 0 && (
                    <TouchableOpacity 
                        style={styles.backButton} 
                        onPress={handleBack}
                    >
                        <Text style={styles.backButtonText}>이전</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity 
                    style={[
                        styles.nextButton,
                        currentStep > 0 ? styles.nextButtonWithBack : null
                    ]} 
                    onPress={handleNext} 
                    disabled={checkingNickname}
                >
                    <Text style={styles.nextButtonText}>
                        {currentStep === onboardingSteps.length - 1 ? '완료' : '다음'}
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    progressContainer: {
        padding: 20,
        alignItems: 'center',
    },
    progressDots: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    progressDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginHorizontal: 4,
    },
    progressDotActive: {
        backgroundColor: '#007AFF',
    },
    progressDotInactive: {
        backgroundColor: '#E5E5EA',
    },
    progressText: {
        color: '#8E8E93',
        fontSize: 14,
    },
    contentContainer: {
        flex: 1,
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1C1C1E',
        marginBottom: 10,
        textAlign: 'center',
    },
    description: {
        fontSize: 16,
        color: '#8E8E93',
        marginBottom: 30,
        textAlign: 'center',
    },
    inputContainer: {
        alignItems: 'center',
    },
    textInput: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#E5E5EA',
        borderRadius: 12,
        padding: 16,
        fontSize: 18,
        marginBottom: 8,
        color: '#1C1C1E',
        backgroundColor: '#FFFFFF',
    },
    textInputError: {
        borderColor: '#FF3B30',
    },
    errorText: {
        color: '#FF3B30',
        marginBottom: 8,
    },
    optionsContainer: {
        flex: 1,
    },
    optionButton: {
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E5EA',
    },
    optionButtonSelected: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    optionText: {
        fontSize: 16,
        color: '#1C1C1E',
    },
    optionTextSelected: {
        color: '#FFFFFF',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 20,
        backgroundColor: '#FFFFFF',
    },
    backButton: {
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E5EA',
    },
    backButtonText: {
        fontSize: 16,
        color: '#8E8E93',
    },
    nextButton: {
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#007AFF',
        flex: 1,
        alignItems: 'center',
    },
    nextButtonWithBack: {
        marginLeft: 12,
    },
    nextButtonText: {
        fontSize: 16,
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
});
