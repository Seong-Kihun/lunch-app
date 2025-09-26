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

// 통합된 네트워크 설정 사용
import { getServerURL as getUnifiedServerURL } from '../config/networkConfig';

// 기존 함수를 통합 설정으로 리다이렉트
export const getServerURL = async () => {
    try {
        // 네트워크 초기화 상태 확인
        if (!global.networkInitialized) {
            console.warn('⚠️ [NetworkUtils] 네트워크가 아직 초기화되지 않음');
            // 네트워크 초기화 대기
            let attempts = 0;
            while (!global.networkInitialized && attempts < 50) { // 5초 대기
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            if (!global.networkInitialized) {
                console.error('❌ [NetworkUtils] 네트워크 초기화 타임아웃');
                throw new Error('네트워크 초기화 타임아웃');
            }
        }
        
        // 통합된 네트워크 설정 사용
        return getUnifiedServerURL();
    } catch (error) {
        console.error('🔧 [NetworkUtils] 서버 URL 생성 실패:', error);
        // fallback
        return __DEV__ ? 'http://localhost:5000' : 'https://lunch-app-backend-ra12.onrender.com';
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
