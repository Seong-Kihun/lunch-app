import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// 알림 타입 정의
export const NOTIFICATION_TYPES = {
  // 파티 관련
  PARTY_INVITE: 'party_invite',
  PARTY_UPDATE: 'party_update',
  PARTY_CANCEL: 'party_cancel',
  PARTY_REMINDER: 'party_reminder',
  
  // 채팅 관련
  NEW_MESSAGE: 'new_message',
  MENTION: 'mention',
  CHAT_INVITE: 'chat_invite',
  
  // 추천 관련
  RECOMMENDATION: 'recommendation',
  NEW_RESTAURANT: 'new_restaurant',
  
  // 시스템 관련
  SYSTEM_UPDATE: 'system_update',
  MAINTENANCE: 'maintenance',
  
  // 개인화 관련
  PERSONAL_INSIGHT: 'personal_insight',
  ACHIEVEMENT: 'achievement',
  BIRTHDAY: 'birthday'
};

// 알림 우선순위
export const NOTIFICATION_PRIORITY = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent'
};

// 알림 매니저 클래스
class NotificationManager {
  constructor() {
    this.notifications = [];
    this.unreadCount = 0;
    this.isOnline = true;
    this.settings = {
      enabled: true,
      sound: true,
      vibration: true,
      pushEnabled: true,
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      },
      categories: {
        party: true,
        chat: true,
        recommendation: true,
        system: true,
        personal: true
      }
    };
    
    this.init();
  }

  // 초기화
  async init() {
    await this.loadNotifications();
    await this.loadSettings();
    this.setupNetworkMonitoring();
    this.startNotificationCleanup();
  }

  // 네트워크 상태 모니터링
  setupNetworkMonitoring() {
    NetInfo.addEventListener(state => {
      this.isOnline = state.isConnected && state.isInternetReachable;
      
      if (this.isOnline) {
        this.syncNotifications();
      }
    });
  }

  // 알림 생성
  async createNotification(type, data, priority = NOTIFICATION_PRIORITY.NORMAL) {
    try {
      // 알림 설정 확인
      if (!this.settings.enabled) return null;
      if (!this.settings.categories[this.getCategoryFromType(type)]) return null;
      
      // 조용한 시간 확인
      if (this.isQuietHours()) {
        console.log('🔇 조용한 시간: 알림 생성 건너뜀');
        return null;
      }

      const notification = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        type,
        data,
        priority,
        timestamp: Date.now(),
        read: false,
        delivered: false,
        category: this.getCategoryFromType(type)
      };

      // 알림 추가
      this.notifications.unshift(notification);
      this.unreadCount++;

      // 로컬 저장
      await this.saveNotifications();
      
      // 알림 전달
      await this.deliverNotification(notification);
      
      console.log(`🔔 알림 생성됨: ${type}`);
      return notification;
    } catch (error) {
      console.error('알림 생성 실패:', error);
      return null;
    }
  }

  // 알림 타입으로부터 카테고리 추출
  getCategoryFromType(type) {
    if (type.includes('PARTY')) return 'party';
    if (type.includes('MESSAGE') || type.includes('CHAT') || type.includes('MENTION')) return 'chat';
    if (type.includes('RECOMMENDATION') || type.includes('RESTAURANT')) return 'recommendation';
    if (type.includes('SYSTEM') || type.includes('MAINTENANCE')) return 'system';
    if (type.includes('INSIGHT') || type.includes('ACHIEVEMENT') || type.includes('BIRTHDAY')) return 'personal';
    return 'system';
  }

  // 조용한 시간 확인
  isQuietHours() {
    if (!this.settings.quietHours.enabled) return false;
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMinute] = this.settings.quietHours.start.split(':').map(Number);
    const [endHour, endMinute] = this.settings.quietHours.end.split(':').map(Number);
    
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;
    
    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // 자정을 넘어가는 경우
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  // 알림 전달
  async deliverNotification(notification) {
    try {
      // 로컬 알림 표시
      if (this.settings.sound) {
        // 소리 재생 (실제 구현에서는 react-native-sound 등 사용)
        console.log('🔊 알림 소리 재생');
      }
      
      if (this.settings.vibration) {
        // 진동 (실제 구현에서는 react-native-haptic-feedback 등 사용)
        console.log('📳 알림 진동');
      }
      
      // 푸시 알림 (실제 구현에서는 react-native-push-notification 등 사용)
      if (this.settings.pushEnabled && this.isOnline) {
        await this.sendPushNotification(notification);
      }
      
      notification.delivered = true;
      await this.saveNotifications();
      
    } catch (error) {
      console.error('알림 전달 실패:', error);
    }
  }

  // 푸시 알림 전송 (서버 API 호출)
  async sendPushNotification(notification) {
    try {
      // 실제 구현에서는 서버에 푸시 알림 요청
      const response = await fetch('/api/notifications/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notification)
      });
      
      if (response.ok) {
        console.log('📱 푸시 알림 전송됨');
      }
    } catch (error) {
      console.error('푸시 알림 전송 실패:', error);
    }
  }

  // 알림 읽음 처리
  async markAsRead(notificationId) {
    try {
      const notification = this.notifications.find(n => n.id === notificationId);
      if (notification && !notification.read) {
        notification.read = true;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
        await this.saveNotifications();
        
        console.log(`✅ 알림 읽음 처리됨: ${notificationId}`);
      }
    } catch (error) {
      console.error('알림 읽음 처리 실패:', error);
    }
  }

  // 모든 알림 읽음 처리
  async markAllAsRead() {
    try {
      this.notifications.forEach(notification => {
        notification.read = true;
      });
      
      this.unreadCount = 0;
      await this.saveNotifications();
      
      console.log('✅ 모든 알림 읽음 처리됨');
    } catch (error) {
      console.error('모든 알림 읽음 처리 실패:', error);
    }
  }

  // 알림 삭제
  async deleteNotification(notificationId) {
    try {
      const index = this.notifications.findIndex(n => n.id === notificationId);
      if (index !== -1) {
        const notification = this.notifications[index];
        if (!notification.read) {
          this.unreadCount = Math.max(0, this.unreadCount - 1);
        }
        
        this.notifications.splice(index, 1);
        await this.saveNotifications();
        
        console.log(`🗑️ 알림 삭제됨: ${notificationId}`);
      }
    } catch (error) {
      console.error('알림 삭제 실패:', error);
    }
  }

  // 알림 필터링
  filterNotifications(filters = {}) {
    let filtered = [...this.notifications];
    
    // 타입별 필터링
    if (filters.type) {
      filtered = filtered.filter(n => n.type === filters.type);
    }
    
    // 카테고리별 필터링
    if (filters.category) {
      filtered = filtered.filter(n => n.category === filters.category);
    }
    
    // 읽음 상태별 필터링
    if (filters.read !== undefined) {
      filtered = filtered.filter(n => n.read === filters.read);
    }
    
    // 우선순위별 필터링
    if (filters.priority) {
      filtered = filtered.filter(n => n.priority === filters.priority);
    }
    
    // 날짜 범위별 필터링
    if (filters.startDate || filters.endDate) {
      filtered = filtered.filter(n => {
        const timestamp = n.timestamp;
        if (filters.startDate && timestamp < filters.startDate) return false;
        if (filters.endDate && timestamp > filters.endDate) return false;
        return true;
      });
    }
    
    return filtered;
  }

  // 알림 검색
  searchNotifications(query) {
    if (!query.trim()) return this.notifications;
    
    const searchTerm = query.toLowerCase();
    return this.notifications.filter(notification => {
      // 알림 타입 검색
      if (notification.type.toLowerCase().includes(searchTerm)) return true;
      
      // 데이터 내용 검색
      if (notification.data) {
        const dataStr = JSON.stringify(notification.data).toLowerCase();
        if (dataStr.includes(searchTerm)) return true;
      }
      
      return false;
    });
  }

  // 알림 통계
  getNotificationStats() {
    const total = this.notifications.length;
    const unread = this.unreadCount;
    const read = total - unread;
    
    // 카테고리별 통계
    const categoryStats = {};
    this.notifications.forEach(notification => {
      const category = notification.category;
      if (!categoryStats[category]) {
        categoryStats[category] = { total: 0, unread: 0 };
      }
      categoryStats[category].total++;
      if (!notification.read) {
        categoryStats[category].unread++;
      }
    });
    
    // 우선순위별 통계
    const priorityStats = {};
    this.notifications.forEach(notification => {
      const priority = notification.priority;
      if (!priorityStats[priority]) {
        priorityStats[priority] = { total: 0, unread: 0 };
      }
      priorityStats[priority].total++;
      if (!notification.read) {
        priorityStats[priority].unread++;
      }
    });
    
    return {
      total,
      unread,
      read,
      categoryStats,
      priorityStats
    };
  }

  // 알림 설정 업데이트
  async updateSettings(newSettings) {
    try {
      this.settings = { ...this.settings, ...newSettings };
      await this.saveSettings();
      
      console.log('⚙️ 알림 설정 업데이트됨');
    } catch (error) {
      console.error('알림 설정 업데이트 실패:', error);
    }
  }

  // 알림 동기화 (서버와)
  async syncNotifications() {
    if (!this.isOnline) return;
    
    try {
      // 서버에서 새로운 알림 가져오기
      const response = await fetch('/api/notifications/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lastSync: this.getLastSyncTime(),
          localNotifications: this.notifications
        })
      });
      
      if (response.ok) {
        const syncData = await response.json();
        
        // 새로운 알림 추가
        if (syncData.newNotifications) {
          syncData.newNotifications.forEach(notification => {
            this.notifications.unshift(notification);
            if (!notification.read) {
              this.unreadCount++;
            }
          });
        }
        
        // 읽음 상태 동기화
        if (syncData.readStatus) {
          syncData.readStatus.forEach(({ id, read }) => {
            const notification = this.notifications.find(n => n.id === id);
            if (notification && notification.read !== read) {
              if (read && !notification.read) {
                this.unreadCount = Math.max(0, this.unreadCount - 1);
              } else if (!read && notification.read) {
                this.unreadCount++;
              }
              notification.read = read;
            }
          });
        }
        
        await this.saveNotifications();
        this.setLastSyncTime(Date.now());
        
        console.log('🔄 알림 동기화 완료');
      }
    } catch (error) {
      console.error('알림 동기화 실패:', error);
    }
  }

  // 마지막 동기화 시간 관리
  getLastSyncTime() {
    return parseInt(localStorage.getItem('lastNotificationSync') || '0');
  }

  setLastSyncTime(timestamp) {
    localStorage.setItem('lastNotificationSync', timestamp.toString());
  }

  // 알림 정리 (오래된 알림 삭제)
  async cleanupOldNotifications() {
    try {
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      const initialCount = this.notifications.length;
      
      this.notifications = this.notifications.filter(notification => {
        // 30일 이상 된 읽은 알림 삭제
        if (notification.read && notification.timestamp < thirtyDaysAgo) {
          return false;
        }
        // 90일 이상 된 모든 알림 삭제
        if (notification.timestamp < (Date.now() - (90 * 24 * 60 * 60 * 1000))) {
          return false;
        }
        return true;
      });
      
      const deletedCount = initialCount - this.notifications.length;
      if (deletedCount > 0) {
        await this.saveNotifications();
        console.log(`🧹 ${deletedCount}개의 오래된 알림 정리됨`);
      }
    } catch (error) {
      console.error('알림 정리 실패:', error);
    }
  }

  // 정기적인 알림 정리 시작
  startNotificationCleanup() {
    // 24시간마다 정리 실행
    setInterval(() => {
      this.cleanupOldNotifications();
    }, 24 * 60 * 60 * 1000);
  }

  // 알림 저장
  async saveNotifications() {
    try {
      await AsyncStorage.setItem('notifications', JSON.stringify(this.notifications));
      await AsyncStorage.setItem('unread_count', this.unreadCount.toString());
    } catch (error) {
      console.error('알림 저장 실패:', error);
    }
  }

  // 알림 로드
  async loadNotifications() {
    try {
      const notifications = await AsyncStorage.getItem('notifications');
      const unreadCount = await AsyncStorage.getItem('unread_count');
      
      if (notifications) {
        this.notifications = JSON.parse(notifications);
      }
      
      if (unreadCount) {
        this.unreadCount = parseInt(unreadCount);
      }
      
      console.log(`📖 ${this.notifications.length}개의 알림 로드됨`);
    } catch (error) {
      console.error('알림 로드 실패:', error);
    }
  }

  // 설정 저장
  async saveSettings() {
    try {
      await AsyncStorage.setItem('notification_settings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('알림 설정 저장 실패:', error);
    }
  }

  // 설정 로드
  async loadSettings() {
    try {
      const settings = await AsyncStorage.getItem('notification_settings');
      if (settings) {
        this.settings = { ...this.settings, ...JSON.parse(settings) };
      }
    } catch (error) {
      console.error('알림 설정 로드 실패:', error);
    }
  }

  // 알림 시스템 초기화
  async resetNotificationSystem() {
    try {
      this.notifications = [];
      this.unreadCount = 0;
      this.settings = {
        enabled: true,
        sound: true,
        vibration: true,
        pushEnabled: true,
        quietHours: { enabled: false, start: '22:00', end: '08:00' },
        categories: { party: true, chat: true, recommendation: true, system: true, personal: true }
      };
      
      await AsyncStorage.removeItem('notifications');
      await AsyncStorage.removeItem('unread_count');
      await AsyncStorage.removeItem('notification_settings');
      
      console.log('🔄 알림 시스템 초기화됨');
    } catch (error) {
      console.error('알림 시스템 초기화 실패:', error);
    }
  }
}

// 싱글톤 인스턴스 생성
const notificationManager = new NotificationManager();

export default notificationManager;
