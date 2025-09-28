/**
 * 네트워크 상태 모니터링 및 자동 복구 시스템
 * 실시간 네트워크 상태를 모니터링하고 자동으로 복구를 시도합니다.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import unifiedApiClient from './UnifiedApiClient';

class NetworkMonitor {
  constructor() {
    this.isMonitoring = false;
    this.monitorInterval = null;
    this.checkInterval = 30000; // 30초마다 체크
    this.retryAttempts = 3;
    this.retryDelay = 5000; // 5초
    this.lastHealthCheck = null;
    this.consecutiveFailures = 0;
    this.maxConsecutiveFailures = 3;
    
    this.listeners = [];
    
    console.log('📡 [NetworkMonitor] 인스턴스 생성됨');
  }

  /**
   * 모니터링 시작
   */
  startMonitoring() {
    if (this.isMonitoring) {
      console.log('📡 [NetworkMonitor] 이미 모니터링 중');
      return;
    }

    console.log('🚀 [NetworkMonitor] 네트워크 모니터링 시작');
    this.isMonitoring = true;
    
    // 즉시 첫 번째 체크 실행
    this.performHealthCheck();
    
    // 주기적 체크 설정
    this.monitorInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.checkInterval);
  }

  /**
   * 모니터링 중지
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }

    console.log('⏹️ [NetworkMonitor] 네트워크 모니터링 중지');
    this.isMonitoring = false;
    
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }

  /**
   * 스마트 헬스 체크 수행 - 실제 API 사용 가능성 테스트
   */
  async performHealthCheck() {
    try {
      console.log('🔍 [NetworkMonitor] 스마트 헬스 체크 수행');
      
      const startTime = Date.now();
      
      // 실제 API 호출로 서버 상태 확인 (로그인 API는 항상 존재해야 함)
      let isHealthy = false;
      let healthCheckMethod = '';
      
      try {
        // 1차: 로그인 API 존재 확인 (가장 기본적인 API)
        console.log('🔍 [NetworkMonitor] 로그인 API 존재 확인');
        const response = await unifiedApiClient.get('/api/auth/login', {}, { timeout: 8000 });
        isHealthy = true;
        healthCheckMethod = 'login_api';
        console.log('✅ [NetworkMonitor] 로그인 API 존재 확인 성공');
      } catch (loginError) {
        console.warn('⚠️ [NetworkMonitor] 로그인 API 확인 실패:', loginError.message);
        
        try {
          // 2차: 레스토랑 API 확인
          console.log('🔍 [NetworkMonitor] 레스토랑 API 존재 확인');
          const response = await unifiedApiClient.get('/api/restaurants', {}, { timeout: 8000 });
          isHealthy = true;
          healthCheckMethod = 'restaurants_api';
          console.log('✅ [NetworkMonitor] 레스토랑 API 존재 확인 성공');
        } catch (restaurantError) {
          console.warn('⚠️ [NetworkMonitor] 레스토랑 API 확인 실패:', restaurantError.message);
          
          try {
            // 3차: 서버 기본 응답 확인
            console.log('🔍 [NetworkMonitor] 서버 기본 응답 확인');
            const response = await unifiedApiClient.get('/', {}, { timeout: 10000 });
            isHealthy = true;
            healthCheckMethod = 'server_root';
            console.log('✅ [NetworkMonitor] 서버 기본 응답 확인 성공');
          } catch (serverError) {
            console.warn('⚠️ [NetworkMonitor] 서버 기본 응답 확인 실패:', serverError.message);
            isHealthy = false;
            healthCheckMethod = 'all_failed';
          }
        }
      }
      
      const responseTime = Date.now() - startTime;
      
      this.lastHealthCheck = {
        timestamp: new Date().toISOString(),
        isHealthy,
        responseTime,
        method: healthCheckMethod,
        serverURL: await unifiedApiClient.getServerURL()
      };

      if (isHealthy) {
        console.log(`✅ [NetworkMonitor] 스마트 헬스 체크 성공: ${healthCheckMethod} (${responseTime}ms)`);
        this.consecutiveFailures = 0;
        this.notifyListeners({
          type: 'HEALTH_CHECK_SUCCESS',
          data: this.lastHealthCheck
        });
      } else {
        console.warn(`⚠️ [NetworkMonitor] 스마트 헬스 체크 실패: ${healthCheckMethod} (${responseTime}ms)`);
        this.handleHealthCheckFailure();
      }

    } catch (error) {
      console.error('❌ [NetworkMonitor] 헬스 체크 오류:', error);
      this.handleHealthCheckFailure(error);
    }
  }

  /**
   * 헬스 체크 실패 처리
   */
  async handleHealthCheckFailure(error = null) {
    this.consecutiveFailures++;
    
    console.warn(`⚠️ [NetworkMonitor] 연속 실패 ${this.consecutiveFailures}/${this.maxConsecutiveFailures}`);
    
    this.notifyListeners({
      type: 'HEALTH_CHECK_FAILURE',
      data: {
        consecutiveFailures: this.consecutiveFailures,
        error: error?.message || 'Unknown error',
        timestamp: new Date().toISOString()
      }
    });

    // 최대 연속 실패 횟수에 도달하면 자동 복구 시도
    if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
      console.log('🔄 [NetworkMonitor] 자동 복구 시도 시작');
      await this.attemptAutoRecovery();
    }
  }

  /**
   * 자동 복구 시도
   */
  async attemptAutoRecovery() {
    console.log('🔧 [NetworkMonitor] 자동 복구 프로세스 시작');
    
    try {
      // 1. 네트워크 상태 정보 수집
      const networkStatus = await unifiedApiClient.getNetworkStatus();
      console.log('📊 [NetworkMonitor] 현재 네트워크 상태:', networkStatus);

      // 2. 네트워크 재초기화 시도
      console.log('🔄 [NetworkMonitor] 네트워크 재초기화 시도');
      await unifiedApiClient.initialize();

      // 3. 재초기화 후 헬스 체크
      const isRecovered = await unifiedApiClient.healthCheck();
      
      if (isRecovered) {
        console.log('✅ [NetworkMonitor] 자동 복구 성공');
        this.consecutiveFailures = 0;
        
        this.notifyListeners({
          type: 'AUTO_RECOVERY_SUCCESS',
          data: {
            timestamp: new Date().toISOString(),
            recoveryTime: Date.now()
          }
        });
      } else {
        console.error('❌ [NetworkMonitor] 자동 복구 실패');
        this.notifyListeners({
          type: 'AUTO_RECOVERY_FAILURE',
          data: {
            timestamp: new Date().toISOString(),
            attempts: this.consecutiveFailures
          }
        });
      }

    } catch (error) {
      console.error('❌ [NetworkMonitor] 자동 복구 중 오류:', error);
      this.notifyListeners({
        type: 'AUTO_RECOVERY_ERROR',
        data: {
          error: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * 수동 복구 시도
   */
  async manualRecovery() {
    console.log('🔧 [NetworkMonitor] 수동 복구 시도');
    
    try {
      // 강제로 재초기화
      await unifiedApiClient.initialize();
      
      // 헬스 체크 수행
      const isHealthy = await unifiedApiClient.healthCheck();
      
      if (isHealthy) {
        console.log('✅ [NetworkMonitor] 수동 복구 성공');
        this.consecutiveFailures = 0;
        
        this.notifyListeners({
          type: 'MANUAL_RECOVERY_SUCCESS',
          data: {
            timestamp: new Date().toISOString()
          }
        });
        
        return true;
      } else {
        console.error('❌ [NetworkMonitor] 수동 복구 실패');
        return false;
      }

    } catch (error) {
      console.error('❌ [NetworkMonitor] 수동 복구 중 오류:', error);
      return false;
    }
  }

  /**
   * 네트워크 상태 정보 가져오기
   */
  async getNetworkStatus() {
    try {
      const apiStatus = await unifiedApiClient.getNetworkStatus();
      
      return {
        ...apiStatus,
        isMonitoring: this.isMonitoring,
        consecutiveFailures: this.consecutiveFailures,
        lastHealthCheck: this.lastHealthCheck,
        monitorInterval: this.checkInterval
      };
    } catch (error) {
      console.error('❌ [NetworkMonitor] 상태 정보 가져오기 실패:', error);
      return {
        isMonitoring: this.isMonitoring,
        consecutiveFailures: this.consecutiveFailures,
        lastHealthCheck: this.lastHealthCheck,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 모니터링 설정 업데이트
   */
  updateConfig(config) {
    if (config.checkInterval) {
      this.checkInterval = config.checkInterval;
      console.log(`📡 [NetworkMonitor] 체크 간격 변경: ${this.checkInterval}ms`);
    }
    
    if (config.maxConsecutiveFailures) {
      this.maxConsecutiveFailures = config.maxConsecutiveFailures;
      console.log(`📡 [NetworkMonitor] 최대 연속 실패 횟수 변경: ${this.maxConsecutiveFailures}`);
    }
    
    if (config.retryDelay) {
      this.retryDelay = config.retryDelay;
      console.log(`📡 [NetworkMonitor] 재시도 지연 변경: ${this.retryDelay}ms`);
    }
  }

  /**
   * 리스너 등록
   */
  addListener(callback) {
    this.listeners.push(callback);
    console.log('📡 [NetworkMonitor] 리스너 추가됨');
  }

  /**
   * 리스너 제거
   */
  removeListener(callback) {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
      console.log('📡 [NetworkMonitor] 리스너 제거됨');
    }
  }

  /**
   * 리스너들에게 알림
   */
  notifyListeners(event) {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('❌ [NetworkMonitor] 리스너 알림 오류:', error);
      }
    });
  }

  /**
   * 디버그 정보 출력
   */
  getDebugInfo() {
    return {
      isMonitoring: this.isMonitoring,
      checkInterval: this.checkInterval,
      consecutiveFailures: this.consecutiveFailures,
      maxConsecutiveFailures: this.maxConsecutiveFailures,
      lastHealthCheck: this.lastHealthCheck,
      listenersCount: this.listeners.length,
      timestamp: new Date().toISOString()
    };
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
const networkMonitor = new NetworkMonitor();
export default networkMonitor;
