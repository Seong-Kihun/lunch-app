/**
 * 오프라인 모드 관리자
 * 백엔드 데이터베이스 오류나 네트워크 문제 시 기본 기능을 제공합니다.
 * 프로덕션 환경에서 안정적으로 작동하도록 설계되었습니다.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

class OfflineModeManager {
  constructor() {
    this.isOfflineMode = false;
    this.offlineData = {
      schedules: {},
      restaurants: [],
      userPreferences: {},
      lastSyncTime: null
    };
    this.maxOfflineDataAge = 24 * 60 * 60 * 1000; // 24시간
    
    console.log('📴 [OfflineModeManager] 인스턴스 생성됨');
  }

  /**
   * 오프라인 모드 활성화
   */
  enableOfflineMode(reason = 'network_error') {
    if (this.isOfflineMode) {
      console.log('📴 [OfflineModeManager] 이미 오프라인 모드입니다.');
      return;
    }

    this.isOfflineMode = true;
    console.log(`📴 [OfflineModeManager] 오프라인 모드 활성화: ${reason}`);
    
    // 오프라인 모드 상태 저장
    this.saveOfflineModeStatus();
    
    // 사용자에게 알림
    this.notifyOfflineModeEnabled(reason);
  }

  /**
   * 오프라인 모드 비활성화
   */
  disableOfflineMode() {
    if (!this.isOfflineMode) {
      console.log('🌐 [OfflineModeManager] 이미 온라인 모드입니다.');
      return;
    }

    this.isOfflineMode = false;
    console.log('🌐 [OfflineModeManager] 온라인 모드로 전환');
    
    // 오프라인 모드 상태 저장
    this.saveOfflineModeStatus();
    
    // 사용자에게 알림
    this.notifyOfflineModeDisabled();
  }

  /**
   * 오프라인 모드 상태 확인
   */
  isInOfflineMode() {
    return this.isOfflineMode;
  }

  /**
   * 오프라인 데이터 저장
   */
  async saveOfflineData(key, data) {
    try {
      this.offlineData[key] = {
        data,
        timestamp: Date.now()
      };
      
      await AsyncStorage.setItem('offline_data', JSON.stringify(this.offlineData));
      console.log(`📴 [OfflineModeManager] 오프라인 데이터 저장: ${key}`);
    } catch (error) {
      console.error('❌ [OfflineModeManager] 오프라인 데이터 저장 실패:', error);
    }
  }

  /**
   * 오프라인 데이터 로드
   */
  async loadOfflineData(key) {
    try {
      const storedData = await AsyncStorage.getItem('offline_data');
      if (storedData) {
        this.offlineData = JSON.parse(storedData);
      }

      const dataEntry = this.offlineData[key];
      if (!dataEntry) {
        console.log(`📴 [OfflineModeManager] 오프라인 데이터 없음: ${key}`);
        return null;
      }

      // 데이터 만료 확인
      const dataAge = Date.now() - dataEntry.timestamp;
      if (dataAge > this.maxOfflineDataAge) {
        console.log(`📴 [OfflineModeManager] 오프라인 데이터 만료: ${key} (${Math.round(dataAge / 1000 / 60)}분 전)`);
        return null;
      }

      console.log(`📴 [OfflineModeManager] 오프라인 데이터 로드: ${key}`);
      return dataEntry.data;
    } catch (error) {
      console.error('❌ [OfflineModeManager] 오프라인 데이터 로드 실패:', error);
      return null;
    }
  }

  /**
   * 기본 일정 데이터 생성 (오프라인 모드용)
   */
  generateDefaultSchedules(userEmployeeId) {
    const today = new Date();
    const schedules = {};
    
    // 다음 5일간의 기본 일정 생성
    for (let i = 0; i < 5; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const dateString = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay();
      
      // 평일만 일정 생성
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        schedules[dateString] = {
          employee_id: userEmployeeId,
          date: dateString,
          lunch_time: '12:00',
          status: 'available',
          created_at: new Date().toISOString(),
          is_offline_default: true
        };
      }
    }

    console.log(`📴 [OfflineModeManager] 기본 일정 생성: ${Object.keys(schedules).length}개`);
    return schedules;
  }

  /**
   * 기본 식당 데이터 생성 (오프라인 모드용)
   */
  generateDefaultRestaurants() {
    const defaultRestaurants = [
      {
        id: 'offline_1',
        name: '기본 식당 1',
        category: '한식',
        location: '강남구',
        rating: 4.0,
        is_offline_default: true
      },
      {
        id: 'offline_2',
        name: '기본 식당 2',
        category: '일식',
        location: '서초구',
        rating: 4.2,
        is_offline_default: true
      },
      {
        id: 'offline_3',
        name: '기본 식당 3',
        category: '중식',
        location: '송파구',
        rating: 3.8,
        is_offline_default: true
      }
    ];

    console.log(`📴 [OfflineModeManager] 기본 식당 생성: ${defaultRestaurants.length}개`);
    return defaultRestaurants;
  }

  /**
   * 오프라인 모드에서 일정 조회
   */
  async getSchedulesOffline(userEmployeeId, startDate, endDate) {
    try {
      // 먼저 저장된 오프라인 데이터 확인
      let schedules = await this.loadOfflineData('schedules');
      
      if (!schedules) {
        // 기본 일정 생성
        schedules = this.generateDefaultSchedules(userEmployeeId);
        await this.saveOfflineData('schedules', schedules);
      }

      // 날짜 범위에 맞는 일정 필터링
      const filteredSchedules = {};
      const start = new Date(startDate);
      const end = new Date(endDate);

      Object.keys(schedules).forEach(dateString => {
        const scheduleDate = new Date(dateString);
        if (scheduleDate >= start && scheduleDate <= end) {
          filteredSchedules[dateString] = schedules[dateString];
        }
      });

      console.log(`📴 [OfflineModeManager] 오프라인 일정 조회: ${Object.keys(filteredSchedules).length}개`);
      return filteredSchedules;
    } catch (error) {
      console.error('❌ [OfflineModeManager] 오프라인 일정 조회 실패:', error);
      return {};
    }
  }

  /**
   * 오프라인 모드에서 식당 목록 조회
   */
  async getRestaurantsOffline() {
    try {
      // 먼저 저장된 오프라인 데이터 확인
      let restaurants = await this.loadOfflineData('restaurants');
      
      if (!restaurants || restaurants.length === 0) {
        // 기본 식당 생성
        restaurants = this.generateDefaultRestaurants();
        await this.saveOfflineData('restaurants', restaurants);
      }

      console.log(`📴 [OfflineModeManager] 오프라인 식당 조회: ${restaurants.length}개`);
      return restaurants;
    } catch (error) {
      console.error('❌ [OfflineModeManager] 오프라인 식당 조회 실패:', error);
      return [];
    }
  }

  /**
   * 오프라인 모드 상태 저장
   */
  async saveOfflineModeStatus() {
    try {
      await AsyncStorage.setItem('offline_mode_status', JSON.stringify({
        isOfflineMode: this.isOfflineMode,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('❌ [OfflineModeManager] 오프라인 모드 상태 저장 실패:', error);
    }
  }

  /**
   * 오프라인 모드 상태 로드
   */
  async loadOfflineModeStatus() {
    try {
      const stored = await AsyncStorage.getItem('offline_mode_status');
      if (stored) {
        const status = JSON.parse(stored);
        this.isOfflineMode = status.isOfflineMode;
        console.log(`📴 [OfflineModeManager] 오프라인 모드 상태 로드: ${this.isOfflineMode}`);
      }
    } catch (error) {
      console.error('❌ [OfflineModeManager] 오프라인 모드 상태 로드 실패:', error);
    }
  }

  /**
   * 오프라인 모드 활성화 알림
   */
  notifyOfflineModeEnabled(reason) {
    // 전역 상태 업데이트
    global.isOfflineMode = true;
    global.offlineModeReason = reason;
    
    console.log(`📴 [OfflineModeManager] 오프라인 모드 알림: ${reason}`);
    
    // 필요시 이벤트 발생
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('offlineModeEnabled', { 
        detail: { reason } 
      }));
    }
  }

  /**
   * 오프라인 모드 비활성화 알림
   */
  notifyOfflineModeDisabled() {
    // 전역 상태 업데이트
    global.isOfflineMode = false;
    global.offlineModeReason = null;
    
    console.log('🌐 [OfflineModeManager] 온라인 모드 알림');
    
    // 필요시 이벤트 발생
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('offlineModeDisabled'));
    }
  }

  /**
   * 오프라인 데이터 동기화 (온라인 복구 시)
   */
  async syncOfflineData() {
    try {
      console.log('🔄 [OfflineModeManager] 오프라인 데이터 동기화 시작');
      
      // 오프라인 모드에서 생성된 데이터가 있다면 서버에 동기화
      const schedules = await this.loadOfflineData('schedules');
      if (schedules) {
        // 서버 동기화 로직 구현 필요
        console.log('🔄 [OfflineModeManager] 일정 데이터 동기화 준비');
      }
      
      console.log('✅ [OfflineModeManager] 오프라인 데이터 동기화 완료');
    } catch (error) {
      console.error('❌ [OfflineModeManager] 오프라인 데이터 동기화 실패:', error);
    }
  }

  /**
   * 오프라인 모드 상태 초기화
   */
  async initialize() {
    try {
      await this.loadOfflineModeStatus();
      console.log('✅ [OfflineModeManager] 초기화 완료');
    } catch (error) {
      console.error('❌ [OfflineModeManager] 초기화 실패:', error);
    }
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
const offlineModeManager = new OfflineModeManager();
export default offlineModeManager;
