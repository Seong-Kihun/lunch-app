import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// 오프라인 매니저 클래스
class OfflineManager {
  constructor() {
    this.isOnline = true;
    this.pendingRequests = [];
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24시간
    this.maxCacheSize = 50; // 최대 캐시 항목 수
    
    // 네트워크 상태 모니터링
    this.setupNetworkMonitoring();
  }

  // 네트워크 상태 모니터링 설정
  setupNetworkMonitoring() {
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected && state.isInternetReachable;
      
      if (!wasOnline && this.isOnline) {
        console.log('🌐 온라인 상태로 전환됨');
        this.processPendingRequests();
      } else if (wasOnline && !this.isOnline) {
        console.log('📴 오프라인 상태로 전환됨');
      }
    });
  }

  // 온라인 상태 확인
  async checkOnlineStatus() {
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected && state.isInternetReachable;
    return this.isOnline;
  }

  // 데이터 캐싱
  async cacheData(key, data, expiry = null) {
    try {
      const cacheItem = {
        data,
        timestamp: Date.now(),
        expiry: expiry || this.cacheExpiry
      };

      await AsyncStorage.setItem(`cache_${key}`, JSON.stringify(cacheItem));
      
      // 캐시 크기 관리
      await this.manageCacheSize();
      
      console.log(`💾 데이터 캐시됨: ${key}`);
    } catch (error) {
      console.error('캐시 저장 실패:', error);
    }
  }

  // 캐시된 데이터 조회
  async getCachedData(key) {
    try {
      const cached = await AsyncStorage.getItem(`cache_${key}`);
      if (!cached) return null;

      const cacheItem = JSON.parse(cached);
      const now = Date.now();

      // 만료된 캐시 확인
      if (now - cacheItem.timestamp > cacheItem.expiry) {
        await AsyncStorage.removeItem(`cache_${key}`);
        console.log(`🗑️ 만료된 캐시 삭제됨: ${key}`);
        return null;
      }

      console.log(`📖 캐시된 데이터 로드됨: ${key}`);
      return cacheItem.data;
    } catch (error) {
      console.error('캐시 데이터 로드 실패:', error);
      return null;
    }
  }

  // 캐시 크기 관리
  async manageCacheSize() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      
      if (cacheKeys.length <= this.maxCacheSize) return;

      // 캐시 항목들을 타임스탬프순으로 정렬
      const cacheItems = await Promise.all(
        cacheKeys.map(async key => {
          try {
            const cached = await AsyncStorage.getItem(key);
            if (cached) {
              const item = JSON.parse(cached);
              return { key, timestamp: item.timestamp };
            }
          } catch (error) {
            console.error('캐시 항목 파싱 실패:', error);
          }
          return null;
        })
      );

      // null 값 제거 및 정렬
      const validItems = cacheItems.filter(item => item !== null);
      validItems.sort((a, b) => a.timestamp - b.timestamp);

      // 가장 오래된 항목들 삭제
      const itemsToDelete = validItems.slice(0, validItems.length - this.maxCacheSize);
      await Promise.all(
        itemsToDelete.map(item => AsyncStorage.removeItem(item.key))
      );

      console.log(`🗑️ ${itemsToDelete.length}개의 오래된 캐시 항목 삭제됨`);
    } catch (error) {
      console.error('캐시 크기 관리 실패:', error);
    }
  }

  // 캐시 무효화
  async invalidateCache(pattern = null) {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      
      if (pattern) {
        // 패턴에 맞는 캐시만 삭제
        const patternKeys = cacheKeys.filter(key => key.includes(pattern));
        await Promise.all(patternKeys.map(key => AsyncStorage.removeItem(key)));
        console.log(`🗑️ 패턴 "${pattern}"에 맞는 캐시 무효화됨`);
      } else {
        // 모든 캐시 삭제
        await Promise.all(cacheKeys.map(key => AsyncStorage.removeItem(key)));
        console.log('🗑️ 모든 캐시 무효화됨');
      }
    } catch (error) {
      console.error('캐시 무효화 실패:', error);
    }
  }

  // 오프라인 요청 큐에 추가
  async addPendingRequest(request) {
    try {
      const pendingRequest = {
        id: Date.now().toString(),
        request,
        timestamp: Date.now(),
        retryCount: 0
      };

      this.pendingRequests.push(pendingRequest);
      await AsyncStorage.setItem('pending_requests', JSON.stringify(this.pendingRequests));
      
      console.log(`📝 오프라인 요청 추가됨: ${request.url}`);
    } catch (error) {
      console.error('오프라인 요청 추가 실패:', error);
    }
  }

  // 대기 중인 요청 처리
  async processPendingRequests() {
    if (this.pendingRequests.length === 0) return;

    console.log(`🔄 ${this.pendingRequests.length}개의 대기 중인 요청 처리 시작`);

    const successfulRequests = [];
    const failedRequests = [];

    for (const pendingRequest of this.pendingRequests) {
      try {
        const response = await fetch(pendingRequest.request.url, pendingRequest.request.options);
        
        if (response.ok) {
          successfulRequests.push(pendingRequest.id);
          console.log(`✅ 오프라인 요청 성공: ${pendingRequest.request.url}`);
        } else {
          failedRequests.push(pendingRequest);
          console.log(`❌ 오프라인 요청 실패: ${pendingRequest.request.url}`);
        }
      } catch (error) {
        failedRequests.push(pendingRequest);
        console.error(`❌ 오프라인 요청 오류: ${pendingRequest.request.url}`, error);
      }
    }

    // 성공한 요청들 제거
    this.pendingRequests = failedRequests;
    await AsyncStorage.setItem('pending_requests', JSON.stringify(this.pendingRequests));

    console.log(`✅ ${successfulRequests.length}개의 오프라인 요청 처리 완료`);
  }

  // 오프라인 요청 로드
  async loadPendingRequests() {
    try {
      const pending = await AsyncStorage.getItem('pending_requests');
      if (pending) {
        this.pendingRequests = JSON.parse(pending);
        console.log(`📖 ${this.pendingRequests.length}개의 대기 중인 요청 로드됨`);
      }
    } catch (error) {
      console.error('대기 중인 요청 로드 실패:', error);
    }
  }

  // 오프라인 상태에서 데이터 제공
  async getOfflineData(key, fallbackData = null) {
    try {
      // 1. 캐시된 데이터 확인
      const cachedData = await this.getCachedData(key);
      if (cachedData) return cachedData;

      // 2. 로컬 저장소에서 데이터 확인
      const localData = await AsyncStorage.getItem(`local_${key}`);
      if (localData) {
        const parsed = JSON.parse(localData);
        console.log(`📱 로컬 데이터 로드됨: ${key}`);
        return parsed;
      }

      // 3. fallback 데이터 반환
      return fallbackData;
    } catch (error) {
      console.error('오프라인 데이터 로드 실패:', error);
      return fallbackData;
    }
  }

  // 로컬 데이터 저장
  async saveLocalData(key, data) {
    try {
      await AsyncStorage.setItem(`local_${key}`, JSON.stringify(data));
      console.log(`💾 로컬 데이터 저장됨: ${key}`);
    } catch (error) {
      console.error('로컬 데이터 저장 실패:', error);
    }
  }

  // 오프라인 우선 데이터 가져오기
  async getDataWithOfflineFallback(key, fetchFunction, fallbackData = null) {
    try {
      // 온라인 상태이고 캐시가 없거나 만료된 경우에만 새로 가져오기
      if (this.isOnline) {
        const data = await fetchFunction();
        if (data) {
          await this.cacheData(key, data);
          await this.saveLocalData(key, data);
          return data;
        }
      }

      // 오프라인 데이터 반환
      return await this.getOfflineData(key, fallbackData);
    } catch (error) {
      console.error('데이터 가져오기 실패:', error);
      return await this.getOfflineData(key, fallbackData);
    }
  }

  // 캐시 통계
  async getCacheStats() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      const localKeys = keys.filter(key => key.startsWith('local_'));
      
      let totalCacheSize = 0;
      let expiredCacheCount = 0;
      
      for (const key of cacheKeys) {
        try {
          const cached = await AsyncStorage.getItem(key);
          if (cached) {
            const item = JSON.parse(cached);
            const now = Date.now();
            
            if (now - item.timestamp > item.expiry) {
              expiredCacheCount++;
            }
            
            totalCacheSize += cached.length;
          }
        } catch (error) {
          console.error('캐시 항목 분석 실패:', error);
        }
      }

      return {
        cacheCount: cacheKeys.length,
        localDataCount: localKeys.length,
        pendingRequestsCount: this.pendingRequests.length,
        totalCacheSize: totalCacheSize,
        expiredCacheCount: expiredCacheCount,
        isOnline: this.isOnline
      };
    } catch (error) {
      console.error('캐시 통계 조회 실패:', error);
      return null;
    }
  }

  // 캐시 정리
  async cleanupCache() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      
      let cleanedCount = 0;
      const now = Date.now();
      
      for (const key of cacheKeys) {
        try {
          const cached = await AsyncStorage.getItem(key);
          if (cached) {
            const item = JSON.parse(cached);
            
            if (now - item.timestamp > item.expiry) {
              await AsyncStorage.removeItem(key);
              cleanedCount++;
            }
          }
        } catch (error) {
          console.error('캐시 정리 중 오류:', error);
        }
      }

      console.log(`🧹 ${cleanedCount}개의 만료된 캐시 항목 정리됨`);
      return cleanedCount;
    } catch (error) {
      console.error('캐시 정리 실패:', error);
      return 0;
    }
  }
}

// 싱글톤 인스턴스 생성
const offlineManager = new OfflineManager();

// 초기화
offlineManager.loadPendingRequests();

export default offlineManager;
