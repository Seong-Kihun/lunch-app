import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

class UserManager {
  constructor() {
    this.currentUser = null;
    this.isInitialized = false;
  }

  /**
   * 사용자 정보 초기화
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // 저장된 사용자 정보 로드
      const savedUser = await AsyncStorage.getItem('currentUser');
      if (savedUser) {
        this.currentUser = JSON.parse(savedUser);
        console.log('✅ 저장된 사용자 정보 로드됨:', this.currentUser.nickname);
      } else {
        // 개발 환경에서만 기본 사용자 설정
        if (__DEV__) {
          this.currentUser = {
            employee_id: '1',
            nickname: '김철수',
            email: 'user1@example.com'
          };
          console.log('🔧 개발 환경: 가상 유저 정보 설정됨');
        }
      }
      this.isInitialized = true;
    } catch (error) {
      console.error('사용자 정보 초기화 실패:', error);
      // 개발 환경에서만 기본값 사용
      if (__DEV__) {
        this.currentUser = {
          employee_id: '1',
          nickname: '김철수',
          email: 'user1@example.com'
        };
      }
      this.isInitialized = true;
    }
  }

  /**
   * 현재 사용자 정보 반환
   */
  getCurrentUser() {
    if (!this.isInitialized) {
      console.warn('⚠️ UserManager가 초기화되지 않았습니다. initialize()를 먼저 호출하세요.');
      return null;
    }
    return this.currentUser;
  }

  /**
   * 사용자 ID 반환
   */
  getCurrentUserId() {
    const user = this.getCurrentUser();
    return user ? user.employee_id : null;
  }

  /**
   * 사용자 닉네임 반환
   */
  getCurrentUserNickname() {
    const user = this.getCurrentUser();
    return user ? user.nickname : null;
  }

  /**
   * 사용자 이메일 반환
   */
  getCurrentUserEmail() {
    const user = this.getCurrentUser();
    return user ? user.email : null;
  }

  /**
   * 사용자 정보 업데이트
   */
  async updateUser(userData) {
    try {
      this.currentUser = { ...this.currentUser, ...userData };
      await AsyncStorage.setItem('currentUser', JSON.stringify(this.currentUser));
      console.log('✅ 사용자 정보 업데이트됨:', this.currentUser.nickname);
      return true;
    } catch (error) {
      console.error('사용자 정보 업데이트 실패:', error);
      return false;
    }
  }

  /**
   * 사용자 정보 저장
   */
  async saveUser(userData) {
    try {
      this.currentUser = userData;
      await AsyncStorage.setItem('currentUser', JSON.stringify(userData));
      console.log('✅ 사용자 정보 저장됨:', userData.nickname);
      return true;
    } catch (error) {
      console.error('사용자 정보 저장 실패:', error);
      return false;
    }
  }

  /**
   * 사용자 정보 삭제 (로그아웃 시)
   */
  async clearUser() {
    try {
      this.currentUser = null;
      await AsyncStorage.removeItem('currentUser');
      console.log('✅ 사용자 정보 삭제됨');
      return true;
    } catch (error) {
      console.error('사용자 정보 삭제 실패:', error);
      return false;
    }
  }

  /**
   * 사용자 정보 유효성 검사
   */
  isUserValid() {
    const user = this.getCurrentUser();
    return user && user.employee_id && user.nickname;
  }

  /**
   * 개발 환경 확인
   */
  isDevelopment() {
    return __DEV__;
  }
}

// 싱글톤 인스턴스 생성
const userManager = new UserManager();

export default userManager;
