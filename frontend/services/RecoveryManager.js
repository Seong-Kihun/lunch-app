/**
 * 복구 관리자
 * 시스템 장애 시 자동 복구 및 백업 서버 전환을 담당하는 시스템
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import networkManager from './NetworkManager';
import authManager from './AuthManager';
import dataSyncManager from './DataSyncManager';

// 복구 상태
export const RECOVERY_STATUS = {
  IDLE: 'idle',
  RECOVERING: 'recovering',
  SUCCESS: 'success',
  FAILED: 'failed',
  FALLBACK: 'fallback'
};

// 복구 타입
export const RECOVERY_TYPE = {
  NETWORK: 'network',
  AUTH: 'auth',
  DATA: 'data',
  SYSTEM: 'system'
};

// 백업 서버 설정
const BACKUP_SERVERS = [
  'https://lunch-app-backend-ra12.onrender.com',
  'http://localhost:5000',
  'http://127.0.0.1:5000'
];

// 복구 설정
const RECOVERY_CONFIG = {
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 2000,
  FALLBACK_TIMEOUT: 10000,
  HEALTH_CHECK_INTERVAL: 30000,
  DATA_BACKUP_INTERVAL: 5 * 60 * 1000, // 5분
  MAX_RECOVERY_TIME: 60000 // 1분
};

// 저장소 키
const STORAGE_KEYS = {
  RECOVERY_STATE: 'recovery_manager_state',
  BACKUP_DATA: 'recovery_backup_data',
  FAILOVER_HISTORY: 'failover_history'
};

class RecoveryManager {
  constructor() {
    this.status = RECOVERY_STATUS.IDLE;
    this.isInitialized = false;
    this.listeners = new Set();
    this.currentServerIndex = 0;
    this.failoverHistory = [];
    this.backupData = {};
    this.healthCheckInterval = null;
    this.recoveryAttempts = 0;
    
    console.log('🔄 [RecoveryManager] 인스턴스 생성됨');
  }

  /**
   * 복구 관리자 초기화
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('✅ [RecoveryManager] 이미 초기화됨');
      return;
    }

    try {
      console.log('🚀 [RecoveryManager] 초기화 시작...');
      
      // 저장된 상태 로드
      await this.loadRecoveryState();
      
      // 헬스체크 시작
      this.startHealthCheck();
      
      // 백업 데이터 생성 시작
      this.startDataBackup();
      
      this.isInitialized = true;
      console.log('✅ [RecoveryManager] 초기화 완료');
      
    } catch (error) {
      console.error('❌ [RecoveryManager] 초기화 실패:', error);
      throw error;
    }
  }

  /**
   * 복구 상태 로드
   */
  async loadRecoveryState() {
    try {
      const [
        recoveryState,
        backupData,
        failoverHistory
      ] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.RECOVERY_STATE),
        AsyncStorage.getItem(STORAGE_KEYS.BACKUP_DATA),
        AsyncStorage.getItem(STORAGE_KEYS.FAILOVER_HISTORY)
      ]);

      if (recoveryState) {
        const state = JSON.parse(recoveryState);
        this.status = state.status || RECOVERY_STATUS.IDLE;
        this.currentServerIndex = state.currentServerIndex || 0;
      }

      if (backupData) {
        this.backupData = JSON.parse(backupData);
      }

      if (failoverHistory) {
        this.failoverHistory = JSON.parse(failoverHistory);
      }

      console.log('📱 [RecoveryManager] 복구 상태 로드 완료');
    } catch (error) {
      console.warn('⚠️ [RecoveryManager] 복구 상태 로드 실패:', error);
    }
  }

  /**
   * 복구 상태 저장
   */
  async saveRecoveryState() {
    try {
      const state = {
        status: this.status,
        currentServerIndex: this.currentServerIndex,
        timestamp: Date.now()
      };

      await AsyncStorage.setItem(STORAGE_KEYS.RECOVERY_STATE, JSON.stringify(state));
    } catch (error) {
      console.error('❌ [RecoveryManager] 복구 상태 저장 실패:', error);
    }
  }

  /**
   * 헬스체크 시작
   */
  startHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, RECOVERY_CONFIG.HEALTH_CHECK_INTERVAL);

    console.log('⏰ [RecoveryManager] 헬스체크 시작됨');
  }

  /**
   * 헬스체크 수행
   */
  async performHealthCheck() {
    try {
      const currentServer = BACKUP_SERVERS[this.currentServerIndex];
      console.log(`🏥 [RecoveryManager] 헬스체크: ${currentServer}`);
      
      const isHealthy = await this.checkServerHealth(currentServer);
      
      if (!isHealthy) {
        console.warn(`⚠️ [RecoveryManager] 서버 상태 불량: ${currentServer}`);
        await this.initiateFailover();
      }
      
    } catch (error) {
      console.error('❌ [RecoveryManager] 헬스체크 실패:', error);
    }
  }

  /**
   * 서버 헬스체크
   */
  async checkServerHealth(serverUrl) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${serverUrl}/api/health`, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      return response.ok;
      
    } catch (error) {
      console.log(`❌ [RecoveryManager] 서버 헬스체크 실패 (${serverUrl}):`, error.message);
      return false;
    }
  }

  /**
   * 장애 조치 시작
   */
  async initiateFailover() {
    if (this.status === RECOVERY_STATUS.RECOVERING) {
      console.log('🔄 [RecoveryManager] 이미 복구 중, 장애 조치 건너뛰기');
      return;
    }

    try {
      console.log('🚨 [RecoveryManager] 장애 조치 시작');
      this.status = RECOVERY_STATUS.RECOVERING;
      this.notifyListeners();

      // 다음 서버로 전환 시도
      const nextServerIndex = (this.currentServerIndex + 1) % BACKUP_SERVERS.length;
      
      if (nextServerIndex === this.currentServerIndex) {
        console.error('❌ [RecoveryManager] 모든 서버 장애, 복구 불가');
        this.status = RECOVERY_STATUS.FAILED;
        this.notifyListeners();
        return;
      }

      // 서버 전환
      await this.switchToServer(nextServerIndex);
      
      // 장애 조치 기록
      this.recordFailover(BACKUP_SERVERS[this.currentServerIndex], BACKUP_SERVERS[nextServerIndex]);
      
      console.log('✅ [RecoveryManager] 장애 조치 완료');
      
    } catch (error) {
      console.error('❌ [RecoveryManager] 장애 조치 실패:', error);
      this.status = RECOVERY_STATUS.FAILED;
      this.notifyListeners();
    }
  }

  /**
   * 서버 전환
   */
  async switchToServer(serverIndex) {
    const newServer = BACKUP_SERVERS[serverIndex];
    const oldServer = BACKUP_SERVERS[this.currentServerIndex];
    
    console.log(`🔄 [RecoveryManager] 서버 전환: ${oldServer} → ${newServer}`);
    
    try {
      // 새 서버 헬스체크
      const isHealthy = await this.checkServerHealth(newServer);
      
      if (!isHealthy) {
        throw new Error(`새 서버 상태 불량: ${newServer}`);
      }
      
      // 네트워크 매니저에 새 서버 설정
      await networkManager.switchServer(newServer);
      
      // 현재 서버 인덱스 업데이트
      this.currentServerIndex = serverIndex;
      
      // 상태 저장
      await this.saveRecoveryState();
      
      this.status = RECOVERY_STATUS.SUCCESS;
      console.log(`✅ [RecoveryManager] 서버 전환 성공: ${newServer}`);
      
    } catch (error) {
      console.error(`❌ [RecoveryManager] 서버 전환 실패: ${error.message}`);
      throw error;
    }
  }

  /**
   * 장애 조치 기록
   */
  recordFailover(fromServer, toServer) {
    const failover = {
      timestamp: Date.now(),
      from: fromServer,
      to: toServer,
      reason: 'health_check_failed'
    };
    
    this.failoverHistory.unshift(failover);
    
    // 최대 50개 기록만 유지
    if (this.failoverHistory.length > 50) {
      this.failoverHistory = this.failoverHistory.slice(0, 50);
    }
    
    // 저장소에 저장
    this.saveFailoverHistory();
    
    console.log(`📝 [RecoveryManager] 장애 조치 기록: ${fromServer} → ${toServer}`);
  }

  /**
   * 장애 조치 기록 저장
   */
  async saveFailoverHistory() {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.FAILOVER_HISTORY, JSON.stringify(this.failoverHistory));
    } catch (error) {
      console.error('❌ [RecoveryManager] 장애 조치 기록 저장 실패:', error);
    }
  }

  /**
   * 데이터 백업 시작
   */
  startDataBackup() {
    setInterval(async () => {
      await this.createDataBackup();
    }, RECOVERY_CONFIG.DATA_BACKUP_INTERVAL);
    
    console.log('💾 [RecoveryManager] 데이터 백업 시작됨');
  }

  /**
   * 데이터 백업 생성
   */
  async createDataBackup() {
    try {
      console.log('💾 [RecoveryManager] 데이터 백업 생성 중...');
      
      // 중요 데이터 백업
      const backup = {
        timestamp: Date.now(),
        userData: await this.getUserData(),
        settings: await this.getAppSettings(),
        cache: await this.getCacheData()
      };
      
      this.backupData = backup;
      
      // 저장소에 저장
      await AsyncStorage.setItem(STORAGE_KEYS.BACKUP_DATA, JSON.stringify(backup));
      
      console.log('✅ [RecoveryManager] 데이터 백업 완료');
      
    } catch (error) {
      console.error('❌ [RecoveryManager] 데이터 백업 실패:', error);
    }
  }

  /**
   * 사용자 데이터 가져오기
   */
  async getUserData() {
    try {
      const authStatus = authManager.getAuthStatus();
      return {
        isAuthenticated: authStatus.isAuthenticated,
        user: authStatus.user,
        hasValidToken: !!authStatus.accessToken
      };
    } catch (error) {
      console.warn('⚠️ [RecoveryManager] 사용자 데이터 가져오기 실패:', error);
      return null;
    }
  }

  /**
   * 앱 설정 가져오기
   */
  async getAppSettings() {
    try {
      // 앱 설정 데이터 수집
      return {
        version: '1.0.0',
        buildNumber: '1',
        lastUpdated: Date.now()
      };
    } catch (error) {
      console.warn('⚠️ [RecoveryManager] 앱 설정 가져오기 실패:', error);
      return null;
    }
  }

  /**
   * 캐시 데이터 가져오기
   */
  async getCacheData() {
    try {
      const syncStatus = dataSyncManager.getSyncStatus();
      return {
        lastSync: syncStatus.lastSync,
        pendingChanges: syncStatus.pendingChanges,
        conflicts: syncStatus.conflicts
      };
    } catch (error) {
      console.warn('⚠️ [RecoveryManager] 캐시 데이터 가져오기 실패:', error);
      return null;
    }
  }

  /**
   * 데이터 복구
   */
  async recoverData() {
    try {
      console.log('🔄 [RecoveryManager] 데이터 복구 시작');
      
      if (!this.backupData || !this.backupData.timestamp) {
        throw new Error('백업 데이터가 없습니다');
      }
      
      const backupAge = Date.now() - this.backupData.timestamp;
      if (backupAge > 24 * 60 * 60 * 1000) { // 24시간
        console.warn('⚠️ [RecoveryManager] 백업 데이터가 오래되었습니다');
      }
      
      // 사용자 데이터 복구
      if (this.backupData.userData) {
        await this.restoreUserData(this.backupData.userData);
      }
      
      // 설정 복구
      if (this.backupData.settings) {
        await this.restoreAppSettings(this.backupData.settings);
      }
      
      // 캐시 복구
      if (this.backupData.cache) {
        await this.restoreCacheData(this.backupData.cache);
      }
      
      console.log('✅ [RecoveryManager] 데이터 복구 완료');
      
    } catch (error) {
      console.error('❌ [RecoveryManager] 데이터 복구 실패:', error);
      throw error;
    }
  }

  /**
   * 사용자 데이터 복구
   */
  async restoreUserData(userData) {
    try {
      if (userData.isAuthenticated && userData.user) {
        // 인증 상태 복구 로직
        console.log('🔐 [RecoveryManager] 사용자 인증 상태 복구');
      }
    } catch (error) {
      console.error('❌ [RecoveryManager] 사용자 데이터 복구 실패:', error);
    }
  }

  /**
   * 앱 설정 복구
   */
  async restoreAppSettings(settings) {
    try {
      console.log('⚙️ [RecoveryManager] 앱 설정 복구');
      // 설정 복구 로직
    } catch (error) {
      console.error('❌ [RecoveryManager] 앱 설정 복구 실패:', error);
    }
  }

  /**
   * 캐시 데이터 복구
   */
  async restoreCacheData(cache) {
    try {
      console.log('💾 [RecoveryManager] 캐시 데이터 복구');
      // 캐시 복구 로직
    } catch (error) {
      console.error('❌ [RecoveryManager] 캐시 데이터 복구 실패:', error);
    }
  }

  /**
   * 전체 시스템 복구
   */
  async performSystemRecovery() {
    try {
      console.log('🚀 [RecoveryManager] 전체 시스템 복구 시작');
      this.status = RECOVERY_STATUS.RECOVERING;
      this.notifyListeners();
      
      const startTime = Date.now();
      
      // 1. 네트워크 복구
      await this.recoverNetwork();
      
      // 2. 인증 복구
      await this.recoverAuthentication();
      
      // 3. 데이터 복구
      await this.recoverData();
      
      // 4. 동기화 복구
      await this.recoverSync();
      
      const recoveryTime = Date.now() - startTime;
      
      if (recoveryTime > RECOVERY_CONFIG.MAX_RECOVERY_TIME) {
        console.warn('⚠️ [RecoveryManager] 복구 시간이 초과되었습니다');
        this.status = RECOVERY_STATUS.FALLBACK;
      } else {
        this.status = RECOVERY_STATUS.SUCCESS;
      }
      
      this.notifyListeners();
      console.log(`✅ [RecoveryManager] 시스템 복구 완료 (${recoveryTime}ms)`);
      
    } catch (error) {
      console.error('❌ [RecoveryManager] 시스템 복구 실패:', error);
      this.status = RECOVERY_STATUS.FAILED;
      this.notifyListeners();
      throw error;
    }
  }

  /**
   * 네트워크 복구
   */
  async recoverNetwork() {
    console.log('🌐 [RecoveryManager] 네트워크 복구 시작');
    
    // 네트워크 매니저 재연결 시도
    await networkManager.reconnect();
    
    console.log('✅ [RecoveryManager] 네트워크 복구 완료');
  }

  /**
   * 인증 복구
   */
  async recoverAuthentication() {
    console.log('🔐 [RecoveryManager] 인증 복구 시작');
    
    // 인증 매니저 재초기화
    await authManager.initialize();
    
    console.log('✅ [RecoveryManager] 인증 복구 완료');
  }

  /**
   * 동기화 복구
   */
  async recoverSync() {
    console.log('🔄 [RecoveryManager] 동기화 복구 시작');
    
    // 데이터 동기화 매니저 재초기화
    await dataSyncManager.initialize();
    
    console.log('✅ [RecoveryManager] 동기화 복구 완료');
  }

  /**
   * 복구 상태 가져오기
   */
  getRecoveryStatus() {
    return {
      status: this.status,
      currentServer: BACKUP_SERVERS[this.currentServerIndex],
      failoverCount: this.failoverHistory.length,
      lastFailover: this.failoverHistory[0] || null,
      hasBackupData: !!this.backupData.timestamp,
      backupAge: this.backupData.timestamp ? Date.now() - this.backupData.timestamp : null
    };
  }

  /**
   * 상태 변경 리스너 추가
   */
  addStatusListener(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 리스너들에게 상태 변경 알림
   */
  notifyListeners() {
    const status = this.getRecoveryStatus();
    this.listeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('❌ [RecoveryManager] 리스너 실행 오류:', error);
      }
    });
  }

  /**
   * 정리 작업
   */
  destroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    this.listeners.clear();
    console.log('🧹 [RecoveryManager] 정리 완료');
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
const recoveryManager = new RecoveryManager();
export default recoveryManager;
