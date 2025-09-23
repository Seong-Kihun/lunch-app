import AsyncStorage from '@react-native-async-storage/async-storage';

// 온보딩 상태 확인 함수
export const checkOnboardingStatus = async () => {
    try {
        const onboardingCompleted = await AsyncStorage.getItem('onboardingCompleted');
        return onboardingCompleted === 'true';
    } catch (error) {
        console.error('온보딩 상태 확인 오류:', error);
        return false;
    }
};
