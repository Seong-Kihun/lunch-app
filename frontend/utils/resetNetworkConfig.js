/**
 * 네트워크 설정 초기화 유틸리티
 * 하드코딩된 IP 문제 해결을 위한 설정 리셋 도구
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

class NetworkConfigReset {
  constructor() {
    this.storageKeys = [
      'network_config_server_url',
      'network_config_last_success',
      'network_config_version',
      'network_manager_server_url',
      'network_manager_last_success',
      'network_manager_connection_count'
    ];
  }

  /**
   * 모든 네트워크 관련 설정 초기화
   */
  async resetAllNetworkConfig() {
    console.log('🔄 [NetworkConfigReset] 모든 네트워크 설정 초기화 시작...');
    
    try {
      // 1. 저장된 네트워크 설정 삭제
      await this.clearStoredConfigs();
      
      // 2. 캐시된 설정 삭제
      await this.clearCachedConfigs();
      
      // 3. 초기화 완료 로그
      console.log('✅ [NetworkConfigReset] 네트워크 설정 초기화 완료');
      console.log('💡 [NetworkConfigReset] 다음에 앱을 시작하면 새로운 동적 IP 감지가 실행됩니다');
      
      return true;
    } catch (error) {
      console.error('❌ [NetworkConfigReset] 네트워크 설정 초기화 실패:', error);
      return false;
    }
  }

  /**
   * 저장된 설정 삭제
   */
  async clearStoredConfigs() {
    console.log('🔄 [NetworkConfigReset] 저장된 설정 삭제 중...');
    
    for (const key of this.storageKeys) {
      try {
        await AsyncStorage.removeItem(key);
        console.log(`✅ [NetworkConfigReset] ${key} 삭제 완료`);
      } catch (error) {
        console.warn(`⚠️ [NetworkConfigReset] ${key} 삭제 실패:`, error);
      }
    }
  }

  /**
   * 캐시된 설정 삭제
   */
  async clearCachedConfigs() {
    console.log('🔄 [NetworkConfigReset] 캐시된 설정 삭제 중...');
    
    const cacheKeys = [
      'expo_network_cache',
      'server_url_cache',
      'network_diagnostics_cache'
    ];
    
    for (const key of cacheKeys) {
      try {
        await AsyncStorage.removeItem(key);
        console.log(`✅ [NetworkConfigReset] ${key} 캐시 삭제 완료`);
      } catch (error) {
        // 캐시 키가 없을 수 있으므로 경고만 출력
        console.log(`ℹ️ [NetworkConfigReset] ${key} 캐시 없음`);
      }
    }
  }

  /**
   * 현재 설정 상태 확인
   */
  async checkCurrentConfig() {
    console.log('🔍 [NetworkConfigReset] 현재 설정 상태 확인...');
    
    const currentConfig = {};
    
    for (const key of this.storageKeys) {
      try {
        const value = await AsyncStorage.getItem(key);
        currentConfig[key] = value || 'Not Set';
      } catch (error) {
        currentConfig[key] = 'Error';
      }
    }
    
    console.log('🔍 [NetworkConfigReset] 현재 설정:', currentConfig);
    return currentConfig;
  }

  /**
   * 설정 초기화 후 재시작 가이드
   */
  getRestartGuide() {
    return {
      title: '네트워크 설정 초기화 완료',
      steps: [
        '1. 앱을 완전히 종료하세요',
        '2. Expo 개발 서버를 재시작하세요: npm start',
        '3. 앱을 다시 실행하면 새로운 IP가 자동 감지됩니다',
        '4. 문제가 지속되면 터널 모드를 사용하세요: npm run start:tunnel'
      ],
      troubleshooting: [
        '백엔드 서버가 실행 중인지 확인: python app.py',
        '네트워크 연결 상태 확인',
        '방화벽 설정 확인'
      ]
    };
  }
}

// 싱글톤 인스턴스
const networkConfigReset = new NetworkConfigReset();

// 기본 내보내기
export default networkConfigReset;

// 유틸리티 함수들
export const resetNetworkConfig = () => networkConfigReset.resetAllNetworkConfig();
export const checkNetworkConfig = () => networkConfigReset.checkCurrentConfig();
export const getRestartGuide = () => networkConfigReset.getRestartGuide();
