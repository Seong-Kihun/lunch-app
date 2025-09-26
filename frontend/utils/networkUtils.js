// 네트워크 유틸리티 함수들
import { Platform } from 'react-native';

// 현재 네트워크 IP를 자동으로 감지하는 함수
export const getCurrentNetworkIP = async () => {
    try {
        // Expo 환경에서는 Constants를 사용하여 IP 감지
        const Constants = require('expo-constants');
        
        // 1. Expo Constants에서 debuggerHost 확인
        if (Constants.default?.manifest?.debuggerHost) {
            const debuggerHost = Constants.default.manifest.debuggerHost.split(':')[0];
            console.log('🔍 [NetworkUtils] Expo debuggerHost 감지:', debuggerHost);
            return debuggerHost;
        }
        
        // 2. Expo Constants 2.x 방식
        if (Constants.default?.expoConfig?.hostUri) {
            const hostUri = Constants.default.expoConfig.hostUri.split(':')[0];
            console.log('🔍 [NetworkUtils] Expo hostUri 감지:', hostUri);
            return hostUri;
        }
        
        // 3. Expo Constants에서 LAN IP 감지
        if (Constants.default?.expoConfig?.debuggerHost) {
            const debuggerHost = Constants.default.expoConfig.debuggerHost.split(':')[0];
            console.log('🔍 [NetworkUtils] Expo debuggerHost 감지:', debuggerHost);
            return debuggerHost;
        }
        
        // 4. fallback: 일반적인 로컬 IP들 시도
        const commonIPs = [
            '192.168.45.177', // 현재 백엔드 실행 IP
            '192.168.1.1',
            '192.168.0.1',
            '10.0.0.1',
            '172.16.0.1',
            '172.20.10.1',
            '192.168.43.1',
            'localhost',
            '127.0.0.1'
        ];
        
        // 첫 번째 IP 반환 (실제 연결 테스트는 별도로 수행)
        return commonIPs[0];
        
    } catch (error) {
        console.warn('🔍 [NetworkUtils] IP 자동 감지 실패:', error);
        return null;
    }
};

// 서버 URL을 동적으로 생성하는 함수 - 개발 환경에서는 로컬 서버 사용
export const getServerURL = async () => {
    try {
        // 개발 환경에서는 로컬 서버 사용
        if (__DEV__) {
            console.log('🔧 [NetworkUtils] 개발 환경: 로컬 서버 사용');
            return 'http://192.168.45.177:5000';
        }
        
        // 프로덕션 환경에서는 Render 서버 사용
        console.log('🔧 [NetworkUtils] 프로덕션 환경: Render 서버 사용');
        return 'https://lunch-app-backend-ra12.onrender.com';

    } catch (error) {
        console.error('🔧 [NetworkUtils] 서버 URL 생성 실패:', error);
        return __DEV__ ? 'http://192.168.45.177:5000' : 'https://lunch-app-backend-ra12.onrender.com';
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
