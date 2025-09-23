// 동적 설정 시스템
import { getServerURL, testServerConnection } from '../utils/networkUtils';

class DynamicConfig {
    constructor() {
        this.serverURL = null;
        this.isInitialized = false;
        this.retryCount = 0;
        this.maxRetries = 3;
    }

    // 설정 초기화
    async initialize() {
        if (this.isInitialized) {
            return this.serverURL;
        }

        console.log('🔧 [DynamicConfig] 설정 초기화 시작...');
        
        try {
            // 1. 서버 URL 자동 감지
            this.serverURL = await getServerURL();
            
            // 2. 연결 테스트
            const isConnected = await testServerConnection(this.serverURL);
            
            if (isConnected) {
                console.log('✅ [DynamicConfig] 서버 연결 성공:', this.serverURL);
                this.isInitialized = true;
                return this.serverURL;
            } else {
                throw new Error('서버 연결 실패');
            }
            
        } catch (error) {
            console.error('❌ [DynamicConfig] 초기화 실패:', error);
            
            // 재시도 로직
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                console.log(`🔄 [DynamicConfig] 재시도 ${this.retryCount}/${this.maxRetries}`);
                
                // 3초 후 재시도
                await new Promise(resolve => setTimeout(resolve, 3000));
                return await this.initialize();
            } else {
                // 최대 재시도 횟수 초과
                console.error('❌ [DynamicConfig] 최대 재시도 횟수 초과, Render 서버 사용');
                this.serverURL = 'https://lunch-app-backend-ra12.onrender.com';
                this.isInitialized = true;
                return this.serverURL;
            }
        }
    }

    // 현재 서버 URL 가져오기
    async getServerURL() {
        if (!this.isInitialized) {
            await this.initialize();
        }
        return this.serverURL;
    }

    // 설정 리셋 (네트워크 변경 시 사용)
    reset() {
        this.isInitialized = false;
        this.serverURL = null;
        this.retryCount = 0;
        console.log('🔄 [DynamicConfig] 설정 리셋됨');
    }

    // 수동으로 서버 URL 설정
    setServerURL(url) {
        this.serverURL = url;
        this.isInitialized = true;
        console.log('🔧 [DynamicConfig] 수동 설정된 서버 URL:', url);
    }
}

// 싱글톤 인스턴스
const dynamicConfig = new DynamicConfig();

export default dynamicConfig;

// 편의 함수들
export const getDynamicServerURL = () => dynamicConfig.getServerURL();
export const resetDynamicConfig = () => dynamicConfig.reset();
export const setDynamicServerURL = (url) => dynamicConfig.setServerURL(url);
