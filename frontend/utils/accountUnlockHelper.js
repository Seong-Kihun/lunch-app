/**
 * 계정 잠금 해제 도우미
 * 개발 환경에서 계정 잠금 상태를 확인하고 해제하는 도구
 */

import { Alert } from 'react-native';

class AccountUnlockHelper {
  constructor() {
    this.isDevelopment = __DEV__;
  }

  /**
   * 계정 잠금 상태 확인
   */
  async checkAccountStatus(email) {
    if (!this.isDevelopment) {
      console.warn('⚠️ [AccountUnlockHelper] 개발 환경에서만 사용 가능합니다.');
      return null;
    }

    try {
      console.log(`🔍 [AccountUnlockHelper] ${email} 계정 상태 확인 중...`);
      
      // 백엔드 API 상태 분석을 통한 계정 상태 확인
      const appService = (await import('../services/AppService')).default;
      const analysis = await appService.get('/api/health');
      
      console.log('📊 [AccountUnlockHelper] 백엔드 상태 분석 결과:', analysis);
      
      // 계정 잠금 관련 정보 추출
      const accountInfo = {
        email,
        isLocked: analysis.issues.some(issue => issue.includes('계정 잠금')),
        backendHealthy: analysis.apiEndpointsWorking && analysis.authenticationWorking,
        issues: analysis.issues,
        recommendations: analysis.recommendations
      };
      
      return accountInfo;
      
    } catch (error) {
      console.error('❌ [AccountUnlockHelper] 계정 상태 확인 실패:', error);
      return {
        email,
        isLocked: 'unknown',
        error: error.message
      };
    }
  }

  /**
   * 계정 잠금 해제 시도
   */
  async attemptUnlock(email) {
    if (!this.isDevelopment) {
      console.warn('⚠️ [AccountUnlockHelper] 개발 환경에서만 사용 가능합니다.');
      return false;
    }

    try {
      console.log(`🔓 [AccountUnlockHelper] ${email} 계정 잠금 해제 시도...`);
      
      // 관리자 API를 통한 계정 잠금 해제 시도
      const appService = (await import('../services/AppService')).default;
      
      try {
        const response = await appService.post(`/api/admin/unlock-account/${email}`);
        console.log('✅ [AccountUnlockHelper] 계정 잠금 해제 성공:', response);
        
        Alert.alert(
          '계정 잠금 해제',
          `${email} 계정의 잠금이 해제되었습니다.`,
          [{ text: '확인' }]
        );
        
        return true;
        
      } catch (apiError) {
        console.warn('⚠️ [AccountUnlockHelper] 관리자 API 사용 불가:', apiError.message);
        
        // 관리자 API가 없는 경우 대안 방법 제시
        this.showAlternativeUnlockMethods(email);
        return false;
      }
      
    } catch (error) {
      console.error('❌ [AccountUnlockHelper] 계정 잠금 해제 실패:', error);
      
      Alert.alert(
        '계정 잠금 해제 실패',
        `계정 잠금 해제에 실패했습니다: ${error.message}`,
        [{ text: '확인' }]
      );
      
      return false;
    }
  }

  /**
   * 대안적인 계정 잠금 해제 방법 제시
   */
  showAlternativeUnlockMethods(email) {
    const methods = [
      '1. 자동 해제 대기: 15-30분 후 자동으로 해제됩니다.',
      '2. 비밀번호 확인: 정확한 비밀번호를 입력했는지 확인해주세요.',
      '3. 네트워크 확인: 안정적인 네트워크 연결을 확인해주세요.',
      '4. 관리자 문의: 문제가 지속되면 관리자에게 문의해주세요.'
    ];

    Alert.alert(
      '계정 잠금 해제 방법',
      `${email} 계정의 잠금을 해제하는 방법:\n\n${methods.join('\n')}`,
      [
        { text: '자동 해제 대기', onPress: () => this.showAutoUnlockTimer() },
        { text: '관리자 문의', onPress: () => this.showContactAdmin() },
        { text: '확인' }
      ]
    );
  }

  /**
   * 자동 해제 타이머 표시
   */
  showAutoUnlockTimer() {
    Alert.alert(
      '자동 해제 안내',
      '계정 잠금은 보안상의 이유로 자동으로 설정되었습니다.\n\n' +
      '일반적으로 15-30분 후에 자동으로 해제됩니다.\n\n' +
      '해제 후 정확한 비밀번호로 다시 로그인해주세요.',
      [{ text: '확인' }]
    );
  }

  /**
   * 관리자 문의 안내
   */
  showContactAdmin() {
    Alert.alert(
      '관리자 문의',
      '계정 잠금 문제가 지속되는 경우:\n\n' +
      '1. 정확한 이메일 주소와 비밀번호를 확인해주세요.\n' +
      '2. 네트워크 연결 상태를 확인해주세요.\n' +
      '3. 30분 후에도 문제가 지속되면 관리자에게 문의해주세요.\n\n' +
      '관리자 연락처: 시스템 관리자',
      [{ text: '확인' }]
    );
  }

  /**
   * 개발자 도구 메뉴 표시
   */
  showDeveloperTools(email) {
    if (!this.isDevelopment) return;

    Alert.alert(
      '개발자 도구 - 계정 잠금 관리',
      `${email} 계정 관련 작업을 선택하세요.`,
      [
        { 
          text: '계정 상태 확인', 
          onPress: async () => {
            const status = await this.checkAccountStatus(email);
            if (status) {
              this.showAccountStatus(status);
            }
          }
        },
        { 
          text: '계정 잠금 해제 시도', 
          onPress: () => this.attemptUnlock(email)
        },
        { 
          text: '대안 방법 안내', 
          onPress: () => this.showAlternativeUnlockMethods(email)
        },
        { text: '취소', style: 'cancel' }
      ]
    );
  }

  /**
   * 계정 상태 표시
   */
  showAccountStatus(status) {
    const statusText = status.isLocked === 'unknown' 
      ? '상태 불명' 
      : status.isLocked 
        ? '잠금됨' 
        : '정상';

    const issuesText = status.issues && status.issues.length > 0 
      ? status.issues.join('\n• ') 
      : '없음';

    Alert.alert(
      '계정 상태',
      `이메일: ${status.email}\n` +
      `상태: ${statusText}\n` +
      `백엔드 상태: ${status.backendHealthy ? '정상' : '문제 있음'}\n\n` +
      `발견된 문제:\n• ${issuesText}`,
      [{ text: '확인' }]
    );
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
const accountUnlockHelper = new AccountUnlockHelper();
export default accountUnlockHelper;
