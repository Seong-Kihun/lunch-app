import AsyncStorage from '@react-native-async-storage/async-storage';

// 사용자별 온보딩 상태 확인 함수
export const checkOnboardingStatus = async (userId = null) => {
    try {
        // userId가 없으면 현재 로그인한 사용자 ID 가져오기
        if (!userId) {
            const userData = await AsyncStorage.getItem('user_data');
            if (userData) {
                const parsedUserData = JSON.parse(userData);
                userId = parsedUserData.employee_id || parsedUserData.id;
            }
        }
        
        if (!userId) {
            console.log('🔍 [OnboardingUtils] 사용자 ID가 없어서 온보딩 미완료로 처리');
            return false;
        }
        
        const key = `onboardingCompleted_${userId}`;
        const onboardingCompleted = await AsyncStorage.getItem(key);
        const isCompleted = onboardingCompleted === 'true';
        
        console.log(`🔍 [OnboardingUtils] 사용자 ${userId} 온보딩 상태:`, isCompleted);
        return isCompleted;
    } catch (error) {
        console.error('온보딩 상태 확인 오류:', error);
        return false;
    }
};

// 사용자별 온보딩 완료 상태 저장 함수
export const setOnboardingCompleted = async (userId = null) => {
    try {
        // userId가 없으면 현재 로그인한 사용자 ID 가져오기
        if (!userId) {
            const userData = await AsyncStorage.getItem('user_data');
            if (userData) {
                const parsedUserData = JSON.parse(userData);
                userId = parsedUserData.employee_id || parsedUserData.id;
            }
        }
        
        if (!userId) {
            console.error('🔍 [OnboardingUtils] 사용자 ID가 없어서 온보딩 완료 상태 저장 실패');
            return false;
        }
        
        const key = `onboardingCompleted_${userId}`;
        await AsyncStorage.setItem(key, 'true');
        
        console.log(`✅ [OnboardingUtils] 사용자 ${userId} 온보딩 완료 상태 저장됨`);
        return true;
    } catch (error) {
        console.error('온보딩 완료 상태 저장 오류:', error);
        return false;
    }
};

// 사용자별 온보딩 상태 초기화 함수 (테스트용)
export const resetOnboardingStatus = async (userId = null) => {
    try {
        if (!userId) {
            const userData = await AsyncStorage.getItem('user_data');
            if (userData) {
                const parsedUserData = JSON.parse(userData);
                userId = parsedUserData.employee_id || parsedUserData.id;
            }
        }
        
        if (!userId) {
            console.error('🔍 [OnboardingUtils] 사용자 ID가 없어서 온보딩 상태 초기화 실패');
            return false;
        }
        
        const key = `onboardingCompleted_${userId}`;
        await AsyncStorage.removeItem(key);
        
        console.log(`🔄 [OnboardingUtils] 사용자 ${userId} 온보딩 상태 초기화됨`);
        return true;
    } catch (error) {
        console.error('온보딩 상태 초기화 오류:', error);
        return false;
    }
};
