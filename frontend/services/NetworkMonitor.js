/**
 * 네트워크 상태 모니터링 및 자동 복구 시스템
 * 실시간 네트워크 상태를 모니터링하고 자동으로 복구를 시도합니다.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import appService from './AppService';
// 오프라인 모드 제거 - 프로덕션 환경 최적화

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
   * 백엔드 상태 분석 기반 헬스 체크 수행
   */
  async performHealthCheck() {
    try {
      console.log('🔍 [NetworkMonitor] 백엔드 상태 분석 기반 헬스 체크 수행');
      
      const startTime = Date.now();
      
      // AppService의 백엔드 상태 분석 활용
      const analysis = await appService.get('/api/health');
      
      const responseTime = Date.now() - startTime;
      
          // 백엔드가 부분적으로라도 작동하면 건강한 것으로 간주 (데이터베이스 오류 고려)
          const isHealthy = analysis.serverReachable || analysis.apiEndpointsWorking || analysis.authenticationWorking;
      
      let healthStatus = 'unknown';
      if (analysis.serverReachable && analysis.apiEndpointsWorking && analysis.authenticationWorking && analysis.databaseHealthy) {
        healthStatus = 'fully_healthy';
      } else if (analysis.serverReachable && analysis.apiEndpointsWorking && analysis.authenticationWorking) {
        healthStatus = 'partially_healthy_database_issues';
      } else if (isHealthy) {
        healthStatus = 'partially_healthy';
      } else {
        healthStatus = 'unhealthy';
      }
      
      this.lastHealthCheck = {
        timestamp: new Date().toISOString(),
        isHealthy,
        responseTime,
        healthStatus,
        analysis,
        serverURL: await unifiedApiClient.getServerURL()
      };

      if (isHealthy) {
        console.log(`✅ [NetworkMonitor] 백엔드 상태 분석 완료: ${healthStatus} (${responseTime}ms)`);
            console.log(`📊 [NetworkMonitor] 분석 결과:`, {
              serverReachable: analysis.serverReachable,
              apiEndpointsWorking: analysis.apiEndpointsWorking,
              authenticationWorking: analysis.authenticationWorking,
              databaseHealthy: analysis.databaseHealthy,
              issuesCount: analysis.issues.length,
              recommendations: analysis.recommendations
            });
        
        this.consecutiveFailures = 0;
        
            // 프로덕션 환경 - 오프라인 모드 제거
        
        this.notifyListeners({
          type: 'HEALTH_CHECK_SUCCESS',
          data: this.lastHealthCheck
        });
      } else {
        console.warn(`⚠️ [NetworkMonitor] 백엔드 상태 분석 실패: ${healthStatus} (${responseTime}ms)`);
        console.warn(`📊 [NetworkMonitor] 문제점:`, analysis.issues);
        console.warn(`📊 [NetworkMonitor] 권장사항:`, analysis.recommendations);
        
        this.handleHealthCheckFailure(null, analysis);
      }

    } catch (error) {
      console.error('❌ [NetworkMonitor] 헬스 체크 오류:', error);
      this.handleHealthCheckFailure(error);
    }
  }

  /**
   * 헬스 체크 실패 처리 - 백엔드 분석 결과 포함
   */
  async handleHealthCheckFailure(error = null, analysis = null) {
    this.consecutiveFailures++;
    
    console.warn(`⚠️ [NetworkMonitor] 연속 실패 ${this.consecutiveFailures}/${this.maxConsecutiveFailures}`);
    
    const failureData = {
      consecutiveFailures: this.consecutiveFailures,
      error: error?.message || 'Unknown error',
      timestamp: new Date().toISOString()
    };
    
    // 백엔드 분석 결과가 있으면 포함
    if (analysis) {
      failureData.backendAnalysis = {
        serverReachable: analysis.serverReachable,
        apiEndpointsWorking: analysis.apiEndpointsWorking,
        authenticationWorking: analysis.authenticationWorking,
        issues: analysis.issues,
        recommendations: analysis.recommendations
      };
    }
    
    this.notifyListeners({
      type: 'HEALTH_CHECK_FAILURE',
      data: failureData
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
