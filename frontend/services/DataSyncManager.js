/**
 * 데이터 동기화 관리자
 * 서버와 클라이언트 간의 데이터 동기화를 중앙에서 관리하는 시스템
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from './ApiClient';
import authManager from './AuthManager';
import networkManager from './NetworkManager';

// 동기화 상태
export const SYNC_STATUS = {
  IDLE: 'idle',
  SYNCING: 'syncing',
  SUCCESS: 'success',
  ERROR: 'error',
  CONFLICT: 'conflict',
  OFFLINE: 'offline'
};

// 동기화 타입
export const SYNC_TYPE = {
  FULL: 'full',
  INCREMENTAL: 'incremental',
  SELECTIVE: 'selective',
  BACKGROUND: 'background'
};

// 데이터 타입
export const DATA_TYPE = {
  SCHEDULES: 'schedules',
  RESTAURANTS: 'restaurants',
  USERS: 'users',
  PARTIES: 'parties',
  PROPOSALS: 'proposals',
  CHATS: 'chats',
  POINTS: 'points'
};

// 동기화 설정
const SYNC_CONFIG = {
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  CONFLICT_RESOLUTION: 'server_wins', // 'server_wins', 'client_wins', 'manual'
  OFFLINE_THRESHOLD: 5 * 60 * 1000, // 5분
  BACKGROUND_SYNC_INTERVAL: 30 * 1000, // 30초
  MAX_OFFLINE_OPERATIONS: 100
};

// 저장소 키
const STORAGE_KEYS = {
  SYNC_STATE: 'data_sync_state',
  PENDING_CHANGES: 'pending_changes',
  LAST_SYNC: 'last_sync_timestamp',
  CONFLICTS: 'sync_conflicts',
  OFFLINE_OPERATIONS: 'offline_operations'
};

class DataSyncManager {
  constructor() {
    this.status = SYNC_STATUS.IDLE;
    this.isInitialized = false;
    this.listeners = new Set();
    this.syncQueue = [];
    this.pendingChanges = new Map();
    this.conflicts = new Map();
    this.offlineOperations = [];
    this.syncInterval = null;
    this.isOnline = false;
    
    console.log('🔄 [DataSyncManager] 인스턴스 생성됨');
  }

  /**
   * 동기화 관리자 초기화
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('✅ [DataSyncManager] 이미 초기화됨');
      return;
    }

    try {
      console.log('🚀 [DataSyncManager] 초기화 시작...');
      
      // 저장된 상태 로드
      await this.loadSyncState();
      
      // 네트워크 상태 모니터링 시작
      this.startNetworkMonitoring();
      
      // 백그라운드 동기화 시작
      this.startBackgroundSync();
      
      this.isInitialized = true;
      console.log('✅ [DataSyncManager] 초기화 완료');
      
    } catch (error) {
      console.error('❌ [DataSyncManager] 초기화 실패:', error);
      throw error;
    }
  }

  /**
   * 동기화 상태 로드
   */
  async loadSyncState() {
    try {
      const [
        syncState,
        pendingChanges,
        conflicts,
        offlineOperations
      ] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.SYNC_STATE),
        AsyncStorage.getItem(STORAGE_KEYS.PENDING_CHANGES),
        AsyncStorage.getItem(STORAGE_KEYS.CONFLICTS),
        AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_OPERATIONS)
      ]);

      if (syncState) {
        const state = JSON.parse(syncState);
        this.status = state.status || SYNC_STATUS.IDLE;
        this.lastSync = state.lastSync;
      }

      if (pendingChanges) {
        const changes = JSON.parse(pendingChanges);
        this.pendingChanges = new Map(Object.entries(changes));
      }

      if (conflicts) {
        const conflictData = JSON.parse(conflicts);
        this.conflicts = new Map(Object.entries(conflictData));
      }

      if (offlineOperations) {
        this.offlineOperations = JSON.parse(offlineOperations);
      }

      console.log('📱 [DataSyncManager] 동기화 상태 로드 완료');
    } catch (error) {
      console.warn('⚠️ [DataSyncManager] 동기화 상태 로드 실패:', error);
    }
  }

  /**
   * 동기화 상태 저장
   */
  async saveSyncState() {
    try {
      const syncState = {
        status: this.status,
        lastSync: this.lastSync,
        timestamp: Date.now()
      };

      await AsyncStorage.setItem(STORAGE_KEYS.SYNC_STATE, JSON.stringify(syncState));
      console.log('💾 [DataSyncManager] 동기화 상태 저장 완료');
    } catch (error) {
      console.error('❌ [DataSyncManager] 동기화 상태 저장 실패:', error);
    }
  }

  /**
   * 네트워크 상태 모니터링 시작
   */
  startNetworkMonitoring() {
    // NetworkManager의 상태 변화를 모니터링
    networkManager.addStatusListener((networkStatus) => {
      const wasOnline = this.isOnline;
      this.isOnline = networkStatus.isConnected;
      
      if (!wasOnline && this.isOnline) {
        console.log('🌐 [DataSyncManager] 네트워크 연결됨, 동기화 시작');
        this.syncPendingChanges();
      } else if (wasOnline && !this.isOnline) {
        console.log('📴 [DataSyncManager] 네트워크 연결 끊김, 오프라인 모드');
        this.status = SYNC_STATUS.OFFLINE;
        this.notifyListeners();
      }
    });
  }

  /**
   * 백그라운드 동기화 시작
   */
  startBackgroundSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      if (this.isOnline && this.pendingChanges.size > 0) {
        console.log('🔄 [DataSyncManager] 백그라운드 동기화 실행');
        await this.syncPendingChanges();
      }
    }, SYNC_CONFIG.BACKGROUND_SYNC_INTERVAL);

    console.log('⏰ [DataSyncManager] 백그라운드 동기화 시작됨');
  }

  /**
   * 전체 동기화 실행
   */
  async syncAll(syncType = SYNC_TYPE.FULL) {
    if (!this.isOnline) {
      console.log('📴 [DataSyncManager] 오프라인 상태, 동기화 건너뛰기');
      return { status: SYNC_STATUS.OFFLINE };
    }

    if (this.status === SYNC_STATUS.SYNCING) {
      console.log('🔄 [DataSyncManager] 이미 동기화 중, 요청 큐에 추가');
      return { status: SYNC_STATUS.SYNCING };
    }

    try {
      console.log(`🔄 [DataSyncManager] ${syncType} 동기화 시작`);
      this.status = SYNC_STATUS.SYNCING;
      this.notifyListeners();

      const results = {};

      // 각 데이터 타입별 동기화
      for (const dataType of Object.values(DATA_TYPE)) {
        try {
          results[dataType] = await this.syncDataType(dataType, syncType);
        } catch (error) {
          console.error(`❌ [DataSyncManager] ${dataType} 동기화 실패:`, error);
          results[dataType] = { status: SYNC_STATUS.ERROR, error: error.message };
        }
      }

      // 충돌 해결
      if (this.conflicts.size > 0) {
        await this.resolveConflicts();
      }

      this.lastSync = Date.now();
      this.status = SYNC_STATUS.SUCCESS;
      await this.saveSyncState();

      console.log('✅ [DataSyncManager] 전체 동기화 완료');
      this.notifyListeners();

      return { status: SYNC_STATUS.SUCCESS, results };

    } catch (error) {
      console.error('❌ [DataSyncManager] 전체 동기화 실패:', error);
      this.status = SYNC_STATUS.ERROR;
      this.notifyListeners();
      throw error;
    }
  }

  /**
   * 특정 데이터 타입 동기화
   */
  async syncDataType(dataType, syncType = SYNC_TYPE.INCREMENTAL) {
    try {
      console.log(`🔄 [DataSyncManager] ${dataType} 동기화 시작 (${syncType})`);

      // 서버에서 데이터 가져오기
      const serverData = await this.fetchFromServer(dataType, syncType);
      
      // 로컬 데이터 가져오기
      const localData = await this.fetchFromLocal(dataType);
      
      // 데이터 비교 및 병합
      const mergedData = await this.mergeData(dataType, serverData, localData);
      
      // 로컬 저장소 업데이트
      await this.updateLocal(dataType, mergedData);

      console.log(`✅ [DataSyncManager] ${dataType} 동기화 완료`);
      return { status: SYNC_STATUS.SUCCESS, data: mergedData };

    } catch (error) {
      console.error(`❌ [DataSyncManager] ${dataType} 동기화 실패:`, error);
      throw error;
    }
  }

  /**
   * 서버에서 데이터 가져오기
   */
  async fetchFromServer(dataType, syncType) {
    const endpoint = this.getEndpoint(dataType);
    const params = {};

    if (syncType === SYNC_TYPE.INCREMENTAL && this.lastSync) {
      params.since = this.lastSync;
    }

    const response = await apiClient.get(endpoint, params);
    return response.data;
  }

  /**
   * 로컬에서 데이터 가져오기
   */
  async fetchFromLocal(dataType) {
    try {
      const data = await AsyncStorage.getItem(`local_${dataType}`);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.warn(`⚠️ [DataSyncManager] 로컬 데이터 로드 실패 (${dataType}):`, error);
      return [];
    }
  }

  /**
   * 데이터 병합
   */
  async mergeData(dataType, serverData, localData) {
    // 충돌 감지
    const conflicts = this.detectConflicts(serverData, localData);
    
    if (conflicts.length > 0) {
      console.log(`⚠️ [DataSyncManager] ${conflicts.length}개 충돌 감지 (${dataType})`);
      
      // 충돌 저장
      this.conflicts.set(dataType, conflicts);
      
      // 충돌 해결 전략 적용
      return this.resolveDataConflicts(serverData, localData, conflicts);
    }

    // 충돌이 없는 경우 서버 데이터 우선
    return serverData;
  }

  /**
   * 충돌 감지
   */
  detectConflicts(serverData, localData) {
    const conflicts = [];
    
    // 간단한 충돌 감지 로직 (실제로는 더 복잡한 로직 필요)
    if (Array.isArray(serverData) && Array.isArray(localData)) {
      const serverIds = new Set(serverData.map(item => item.id));
      const localIds = new Set(localData.map(item => item.id));
      
      // 공통 ID가 있으면서 수정 시간이 다른 경우 충돌
      for (const id of serverIds) {
        if (localIds.has(id)) {
          const serverItem = serverData.find(item => item.id === id);
          const localItem = localData.find(item => item.id === id);
          
          if (serverItem.updated_at !== localItem.updated_at) {
            conflicts.push({
              id,
              serverData: serverItem,
              localData: localItem
            });
          }
        }
      }
    }
    
    return conflicts;
  }

  /**
   * 데이터 충돌 해결
   */
  resolveDataConflicts(serverData, localData, conflicts) {
    switch (SYNC_CONFIG.CONFLICT_RESOLUTION) {
      case 'server_wins':
        return serverData;
      case 'client_wins':
        return localData;
      case 'manual':
        // 수동 해결이 필요한 경우 서버 데이터 반환하고 충돌 저장
        return serverData;
      default:
        return serverData;
    }
  }

  /**
   * 로컬 저장소 업데이트
   */
  async updateLocal(dataType, data) {
    try {
      await AsyncStorage.setItem(`local_${dataType}`, JSON.stringify(data));
      console.log(`💾 [DataSyncManager] 로컬 데이터 업데이트 완료 (${dataType})`);
    } catch (error) {
      console.error(`❌ [DataSyncManager] 로컬 데이터 업데이트 실패 (${dataType}):`, error);
      throw error;
    }
  }

  /**
   * 대기 중인 변경사항 동기화
   */
  async syncPendingChanges() {
    if (this.pendingChanges.size === 0) {
      console.log('📝 [DataSyncManager] 동기화할 변경사항 없음');
      return;
    }

    console.log(`📝 [DataSyncManager] ${this.pendingChanges.size}개 변경사항 동기화 시작`);

    try {
      this.status = SYNC_STATUS.SYNCING;
      this.notifyListeners();

      const results = [];

      for (const [key, change] of this.pendingChanges) {
        try {
          const result = await this.syncPendingChange(key, change);
          results.push({ key, result, status: 'success' });
          
          // 성공한 변경사항 제거
          this.pendingChanges.delete(key);
          
        } catch (error) {
          console.error(`❌ [DataSyncManager] 변경사항 동기화 실패 (${key}):`, error);
          results.push({ key, error: error.message, status: 'failed' });
        }
      }

      await this.savePendingChanges();
      
      this.status = SYNC_STATUS.SUCCESS;
      this.notifyListeners();

      console.log(`✅ [DataSyncManager] ${results.length}개 변경사항 동기화 완료`);
      return results;

    } catch (error) {
      console.error('❌ [DataSyncManager] 변경사항 동기화 실패:', error);
      this.status = SYNC_STATUS.ERROR;
      this.notifyListeners();
      throw error;
    }
  }

  /**
   * 개별 대기 중인 변경사항 동기화
   */
  async syncPendingChange(key, change) {
    const { type, data, endpoint } = change;
    
    switch (type) {
      case 'CREATE':
        return await apiClient.post(endpoint, data);
      case 'UPDATE':
        return await apiClient.put(endpoint, data);
      case 'DELETE':
        return await apiClient.delete(endpoint);
      default:
        throw new Error(`알 수 없는 변경 타입: ${type}`);
    }
  }

  /**
   * 변경사항 추가
   */
  addPendingChange(key, change) {
    this.pendingChanges.set(key, change);
    this.savePendingChanges();
    
    // 오프라인인 경우 큐에 추가
    if (!this.isOnline) {
      this.offlineOperations.push({
        key,
        change,
        timestamp: Date.now()
      });
    }
    
    console.log(`📝 [DataSyncManager] 변경사항 추가: ${key}`);
  }

  /**
   * 대기 중인 변경사항 저장
   */
  async savePendingChanges() {
    try {
      const changes = Object.fromEntries(this.pendingChanges);
      await AsyncStorage.setItem(STORAGE_KEYS.PENDING_CHANGES, JSON.stringify(changes));
    } catch (error) {
      console.error('❌ [DataSyncManager] 변경사항 저장 실패:', error);
    }
  }

  /**
   * 충돌 해결
   */
  async resolveConflicts() {
    console.log(`🔧 [DataSyncManager] ${this.conflicts.size}개 충돌 해결 시작`);
    
    for (const [dataType, conflicts] of this.conflicts) {
      // 충돌 해결 로직 (실제로는 사용자 인터페이스 필요)
      console.log(`🔧 [DataSyncManager] ${dataType} 충돌 해결: ${conflicts.length}개`);
    }
    
    this.conflicts.clear();
    console.log('✅ [DataSyncManager] 충돌 해결 완료');
  }

  /**
   * 엔드포인트 가져오기
   */
  getEndpoint(dataType) {
    const endpoints = {
      [DATA_TYPE.SCHEDULES]: '/api/schedules',
      [DATA_TYPE.RESTAURANTS]: '/api/restaurants',
      [DATA_TYPE.USERS]: '/api/users',
      [DATA_TYPE.PARTIES]: '/api/parties',
      [DATA_TYPE.PROPOSALS]: '/api/proposals',
      [DATA_TYPE.CHATS]: '/api/chats',
      [DATA_TYPE.POINTS]: '/api/points'
    };
    
    return endpoints[dataType] || `/api/${dataType}`;
  }

  /**
   * 동기화 상태 가져오기
   */
  getSyncStatus() {
    return {
      status: this.status,
      isOnline: this.isOnline,
      pendingChanges: this.pendingChanges.size,
      conflicts: this.conflicts.size,
      lastSync: this.lastSync,
      offlineOperations: this.offlineOperations.length
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
    const status = this.getSyncStatus();
    this.listeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('❌ [DataSyncManager] 리스너 실행 오류:', error);
      }
    });
  }

  /**
   * 정리 작업
   */
  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    this.listeners.clear();
    console.log('🧹 [DataSyncManager] 정리 완료');
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
const dataSyncManager = new DataSyncManager();
export default dataSyncManager;
