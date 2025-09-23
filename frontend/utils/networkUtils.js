// 네트워크 유틸리티 함수들
import { Platform } from 'react-native';

// 현재 네트워크 IP를 자동으로 감지하는 함수
export const getCurrentNetworkIP = async () => {
    try {
        // React Native에서 네트워크 정보 가져오기
        const NetworkInfo = require('react-native-network-info');
        
        if (Platform.OS === 'ios') {
            return await NetworkInfo.getIPAddress();
        } else {
            // Android의 경우
            return await NetworkInfo.getIPAddress();
        }
    } catch (error) {
        console.warn('🔍 [NetworkUtils] IP 자동 감지 실패:', error);
        return null;
    }
};

// 서버 URL을 동적으로 생성하는 함수 - 자동 IP 감지
export const getServerURL = async () => {
    try {
        // 개발 환경인지 확인
        const isDevelopment = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV === 'development';
        
        // 개발 환경에서는 네트워크 IP 사용
        if (isDevelopment) {
            console.log('🔧 [NetworkUtils] 네트워크 IP 사용');
            return 'http://172.30.1.43:5000';
        }
        
        // 프로덕션 환경에서는 Render 서버 사용
        console.log('🔧 [NetworkUtils] Render 서버 사용');
        return 'https://lunch-app-backend-ra12.onrender.com';
        
        // 1. 환경변수에서 서버 URL 확인
        const envServerURL = process.env.REACT_APP_SERVER_URL || process.env.EXPO_PUBLIC_SERVER_URL;
        if (envServerURL) {
            console.log('🔧 [NetworkUtils] 환경변수에서 서버 URL 사용:', envServerURL);
            return envServerURL;
        }

        // 2. 현재 네트워크 IP 자동 감지
        try {
            const currentIP = await getCurrentNetworkIP();
            if (currentIP) {
                const serverURL = `http://${currentIP}:5000`;
                console.log('🔧 [NetworkUtils] 자동 감지된 IP 사용:', serverURL);
                return serverURL;
            }
        } catch (ipError) {
            console.warn('🔧 [NetworkUtils] IP 자동 감지 실패:', ipError);
        }

        // 3. fallback: Render 서버 사용
        console.log('🔧 [NetworkUtils] fallback: Render 서버 사용');
        return 'https://lunch-app-backend-ra12.onrender.com';

    } catch (error) {
        console.error('🔧 [NetworkUtils] 서버 URL 생성 실패:', error);
        return 'https://lunch-app-backend-ra12.onrender.com';
    }
};

// 서버 연결 테스트 함수
export const testServerConnection = async (serverURL) => {
    try {
        const response = await fetch(`${serverURL}/health`, { 
            method: 'HEAD',
            timeout: 5000 
        });
        return response.ok;
    } catch (error) {
        console.warn('🔧 [NetworkUtils] 서버 연결 테스트 실패:', error);
        return false;
    }
};

// 네트워크 상태 모니터링
export const startNetworkMonitoring = (onNetworkChange) => {
    // React Native의 네트워크 상태 변화 감지
    const { NetInfo } = require('@react-native-community/netinfo');
    
    const unsubscribe = NetInfo.addEventListener(state => {
        console.log('🔧 [NetworkUtils] 네트워크 상태 변화:', state);
        if (onNetworkChange) {
            onNetworkChange(state);
        }
    });

    return unsubscribe;
};
