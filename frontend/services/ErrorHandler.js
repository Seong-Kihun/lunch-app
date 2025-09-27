/**
 * 통합 에러 처리 시스템
 * 모든 에러를 중앙에서 관리하고 처리하는 단일 진실의 원천
 */

import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/asyncStorage';

// 에러 타입
export const ERROR_TYPE = {
  NETWORK: 'network',
  AUTHENTICATION: 'authentication',
  VALIDATION: 'validation',
  SERVER: 'server',
  CLIENT: 'client',
  UNKNOWN: 'unknown'
};

// 에러 심각도
export const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// 에러 처리 전략
export const ERROR_STRATEGY = {
  IGNORE: 'ignore',
  LOG: 'log',
  NOTIFY: 'notify',
  RETRY: 'retry',
  FALLBACK: 'fallback',
  CRASH: 'crash'
};

// 에러 설정
const ERROR_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  RETRY_BACKOFF_FACTOR: 2,
  MAX_ERROR_HISTORY: 100,
  AUTO_REPORT_THRESHOLD: 10,
  CRITICAL_ERROR_COOLDOWN: 60000 // 1분
};

// 저장소 키
const STORAGE_KEYS = {
  ERROR_HISTORY: 'error_handler_history',
  ERROR_STATS: 'error_handler_stats',
  USER_PREFERENCES: 'error_handler_preferences'
};

class ErrorHandler {
  constructor() {
    this.errorHistory = [];
    this.errorStats = {};
    this.listeners = new Set();
    this.isInitialized = false;
    this.criticalErrorCooldown = new Map();
    
    // 에러 처리 규칙 정의
    this.errorRules = this.initializeErrorRules();
    
    console.log('🚨 [ErrorHandler] 인스턴스 생성됨');
  }

  /**
   * 에러 핸들러 초기화
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('✅ [ErrorHandler] 이미 초기화됨');
      return;
    }

    try {
      console.log('🚀 [ErrorHandler] 초기화 시작...');
      
      // 저장된 데이터 로드
      await this.loadErrorHistory();
      await this.loadErrorStats();
      
      // 전역 에러 핸들러 설정
      this.setupGlobalErrorHandlers();
      
      this.isInitialized = true;
      console.log('✅ [ErrorHandler] 초기화 완료');
      
    } catch (error) {
      console.error('❌ [ErrorHandler] 초기화 실패:', error);
      throw error;
    }
  }

  /**
   * 에러 처리 규칙 초기화
   */
  initializeErrorRules() {
    return {
      // 네트워크 에러
      [ERROR_TYPE.NETWORK]: {
        [ERROR_SEVERITY.LOW]: ERROR_STRATEGY.RETRY,
        [ERROR_SEVERITY.MEDIUM]: ERROR_STRATEGY.NOTIFY,
        [ERROR_SEVERITY.HIGH]: ERROR_STRATEGY.FALLBACK,
        [ERROR_SEVERITY.CRITICAL]: ERROR_STRATEGY.CRASH
      },
      
      // 인증 에러
      [ERROR_TYPE.AUTHENTICATION]: {
        [ERROR_SEVERITY.LOW]: ERROR_STRATEGY.LOG,
        [ERROR_SEVERITY.MEDIUM]: ERROR_STRATEGY.NOTIFY,
        [ERROR_SEVERITY.HIGH]: ERROR_STRATEGY.FALLBACK,
        [ERROR_SEVERITY.CRITICAL]: ERROR_STRATEGY.CRASH
      },
      
      // 검증 에러
      [ERROR_TYPE.VALIDATION]: {
        [ERROR_SEVERITY.LOW]: ERROR_STRATEGY.LOG,
        [ERROR_SEVERITY.MEDIUM]: ERROR_STRATEGY.NOTIFY,
        [ERROR_SEVERITY.HIGH]: ERROR_STRATEGY.NOTIFY,
        [ERROR_SEVERITY.CRITICAL]: ERROR_STRATEGY.NOTIFY
      },
      
      // 서버 에러
      [ERROR_TYPE.SERVER]: {
        [ERROR_SEVERITY.LOW]: ERROR_STRATEGY.RETRY,
        [ERROR_SEVERITY.MEDIUM]: ERROR_STRATEGY.NOTIFY,
        [ERROR_SEVERITY.HIGH]: ERROR_STRATEGY.FALLBACK,
        [ERROR_SEVERITY.CRITICAL]: ERROR_STRATEGY.CRASH
      },
      
      // 클라이언트 에러
      [ERROR_TYPE.CLIENT]: {
        [ERROR_SEVERITY.LOW]: ERROR_STRATEGY.LOG,
        [ERROR_SEVERITY.MEDIUM]: ERROR_STRATEGY.NOTIFY,
        [ERROR_SEVERITY.HIGH]: ERROR_STRATEGY.NOTIFY,
        [ERROR_SEVERITY.CRITICAL]: ERROR_STRATEGY.CRASH
      },
      
      // 알 수 없는 에러
      [ERROR_TYPE.UNKNOWN]: {
        [ERROR_SEVERITY.LOW]: ERROR_STRATEGY.LOG,
        [ERROR_SEVERITY.MEDIUM]: ERROR_STRATEGY.NOTIFY,
        [ERROR_SEVERITY.HIGH]: ERROR_STRATEGY.NOTIFY,
        [ERROR_SEVERITY.CRITICAL]: ERROR_STRATEGY.CRASH
      }
    };
  }

  /**
   * 전역 에러 핸들러 설정
   */
  setupGlobalErrorHandlers() {
    // JavaScript 에러 핸들러
    const originalConsoleError = console.error;
    console.error = (...args) => {
      originalConsoleError.apply(console, args);
      
      // 에러 객체인 경우 처리
      if (args[0] instanceof Error) {
        this.handleError(args[0], {
          context: 'global',
          source: 'console.error'
        });
      }
    };

    // Promise rejection 핸들러
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event) => {
        this.handleError(event.reason, {
          context: 'global',
          source: 'unhandledrejection'
        });
      });
    }

    // React Native 에러 핸들러
    if (Platform.OS !== 'web') {
      const originalErrorHandler = ErrorUtils.getGlobalHandler();
      ErrorUtils.setGlobalHandler((error, isFatal) => {
        this.handleError(error, {
          context: 'global',
          source: 'react_native',
          isFatal
        });
        
        // 원래 핸들러 호출
        originalErrorHandler(error, isFatal);
      });
    }

    console.log('🛡️ [ErrorHandler] 전역 에러 핸들러 설정 완료');
  }

  /**
   * 에러 처리 메인 함수
   */
  async handleError(error, context = {}) {
    try {
      // 에러 정보 추출
      const errorInfo = this.extractErrorInfo(error, context);
      
      // 에러 로깅
      this.logError(errorInfo);
      
      // 에러 히스토리에 추가
      this.addToHistory(errorInfo);
      
      // 통계 업데이트
      this.updateStats(errorInfo);
      
      // 처리 전략 결정
      const strategy = this.determineStrategy(errorInfo);
      
      // 전략에 따른 처리 실행
      await this.executeStrategy(strategy, errorInfo);
      
      // 리스너들에게 알림
      this.notifyListeners(errorInfo);
      
      return errorInfo;
      
    } catch (handlerError) {
      console.error('❌ [ErrorHandler] 에러 처리 중 오류 발생:', handlerError);
      throw handlerError;
    }
  }

  /**
   * 에러 정보 추출
   */
  extractErrorInfo(error, context) {
    const timestamp = Date.now();
    const errorId = this.generateErrorId();
    
    let errorInfo = {
      id: errorId,
      timestamp,
      type: ERROR_TYPE.UNKNOWN,
      severity: ERROR_SEVERITY.MEDIUM,
      message: '알 수 없는 오류가 발생했습니다',
      stack: null,
      context: context,
      userAgent: Platform.OS,
      version: '1.0.0'
    };

    // Error 객체인 경우
    if (error instanceof Error) {
      errorInfo.message = error.message;
      errorInfo.stack = error.stack;
      errorInfo.type = this.classifyError(error);
      errorInfo.severity = this.assessSeverity(error, context);
    }
    // 문자열인 경우
    else if (typeof error === 'string') {
      errorInfo.message = error;
    }
    // 객체인 경우
    else if (typeof error === 'object' && error !== null) {
      errorInfo = { ...errorInfo, ...error };
    }

    // 네트워크 에러 특별 처리
    if (this.isNetworkError(error)) {
      errorInfo.type = ERROR_TYPE.NETWORK;
      errorInfo.networkInfo = this.extractNetworkInfo(error);
    }

    // 인증 에러 특별 처리
    if (this.isAuthError(error)) {
      errorInfo.type = ERROR_TYPE.AUTHENTICATION;
      errorInfo.authInfo = this.extractAuthInfo(error);
    }

    return errorInfo;
  }

  /**
   * 에러 분류
   */
  classifyError(error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return ERROR_TYPE.NETWORK;
    }
    
    if (message.includes('unauthorized') || message.includes('forbidden') || message.includes('token')) {
      return ERROR_TYPE.AUTHENTICATION;
    }
    
    if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
      return ERROR_TYPE.VALIDATION;
    }
    
    if (message.includes('server') || message.includes('internal') || message.includes('500')) {
      return ERROR_TYPE.SERVER;
    }
    
    return ERROR_TYPE.CLIENT;
  }

  /**
   * 에러 심각도 평가
   */
  assessSeverity(error, context) {
    const message = error.message.toLowerCase();
    
    // 치명적 에러
    if (message.includes('fatal') || message.includes('critical') || context.isFatal) {
      return ERROR_SEVERITY.CRITICAL;
    }
    
    // 높은 심각도
    if (message.includes('unauthorized') || message.includes('forbidden') || 
        message.includes('server') || message.includes('500')) {
      return ERROR_SEVERITY.HIGH;
    }
    
    // 중간 심각도
    if (message.includes('network') || message.includes('timeout') || 
        message.includes('validation')) {
      return ERROR_SEVERITY.MEDIUM;
    }
    
    // 낮은 심각도
    return ERROR_SEVERITY.LOW;
  }

  /**
   * 네트워크 에러 확인
   */
  isNetworkError(error) {
    const message = error.message.toLowerCase();
    return message.includes('network') || message.includes('fetch') || 
           message.includes('timeout') || message.includes('connection');
  }

  /**
   * 인증 에러 확인
   */
  isAuthError(error) {
    const message = error.message.toLowerCase();
    return message.includes('unauthorized') || message.includes('forbidden') || 
           message.includes('token') || message.includes('authentication');
  }

  /**
   * 네트워크 정보 추출
   */
  extractNetworkInfo(error) {
    return {
      message: error.message,
      code: error.code,
      status: error.status,
      url: error.url
    };
  }

  /**
   * 인증 정보 추출
   */
  extractAuthInfo(error) {
    return {
      message: error.message,
      code: error.code,
      status: error.status,
      tokenExpired: error.message.includes('expired')
    };
  }

  /**
   * 에러 ID 생성
   */
  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 에러 로깅
   */
  logError(errorInfo) {
    const logLevel = this.getLogLevel(errorInfo.severity);
    const logMessage = `🚨 [ErrorHandler] ${errorInfo.type.toUpperCase()} - ${errorInfo.message}`;
    
    switch (logLevel) {
      case 'error':
        console.error(logMessage, errorInfo);
        break;
      case 'warn':
        console.warn(logMessage, errorInfo);
        break;
      case 'info':
        console.info(logMessage, errorInfo);
        break;
      default:
        console.log(logMessage, errorInfo);
    }
  }

  /**
   * 로그 레벨 결정
   */
  getLogLevel(severity) {
    switch (severity) {
      case ERROR_SEVERITY.CRITICAL:
      case ERROR_SEVERITY.HIGH:
        return 'error';
      case ERROR_SEVERITY.MEDIUM:
        return 'warn';
      case ERROR_SEVERITY.LOW:
        return 'info';
      default:
        return 'log';
    }
  }

  /**
   * 에러 히스토리에 추가
   */
  addToHistory(errorInfo) {
    this.errorHistory.unshift(errorInfo);
    
    // 최대 히스토리 크기 제한
    if (this.errorHistory.length > ERROR_CONFIG.MAX_ERROR_HISTORY) {
      this.errorHistory = this.errorHistory.slice(0, ERROR_CONFIG.MAX_ERROR_HISTORY);
    }
    
    // 저장소에 저장
    this.saveErrorHistory();
  }

  /**
   * 통계 업데이트
   */
  updateStats(errorInfo) {
    const type = errorInfo.type;
    const severity = errorInfo.severity;
    
    if (!this.errorStats[type]) {
      this.errorStats[type] = {};
    }
    
    if (!this.errorStats[type][severity]) {
      this.errorStats[type][severity] = 0;
    }
    
    this.errorStats[type][severity]++;
    this.errorStats[type].total = (this.errorStats[type].total || 0) + 1;
    
    // 저장소에 저장
    this.saveErrorStats();
  }

  /**
   * 처리 전략 결정
   */
  determineStrategy(errorInfo) {
    const { type, severity } = errorInfo;
    const rules = this.errorRules[type];
    
    if (!rules || !rules[severity]) {
      return ERROR_STRATEGY.NOTIFY;
    }
    
    return rules[severity];
  }

  /**
   * 전략 실행
   */
  async executeStrategy(strategy, errorInfo) {
    switch (strategy) {
      case ERROR_STRATEGY.IGNORE:
        // 무시
        break;
        
      case ERROR_STRATEGY.LOG:
        // 로깅만 (이미 로깅됨)
        break;
        
      case ERROR_STRATEGY.NOTIFY:
        await this.notifyUser(errorInfo);
        break;
        
      case ERROR_STRATEGY.RETRY:
        await this.retryOperation(errorInfo);
        break;
        
      case ERROR_STRATEGY.FALLBACK:
        await this.executeFallback(errorInfo);
        break;
        
      case ERROR_STRATEGY.CRASH:
        await this.handleCriticalError(errorInfo);
        break;
        
      default:
        await this.notifyUser(errorInfo);
    }
  }

  /**
   * 사용자 알림
   */
  async notifyUser(errorInfo) {
    const title = this.getErrorMessage(errorInfo);
    const message = this.getErrorDescription(errorInfo);
    
    Alert.alert(title, message, [
      { text: '확인', style: 'default' }
    ]);
  }

  /**
   * 재시도 처리
   */
  async retryOperation(errorInfo) {
    // 재시도 로직 구현
    console.log(`🔄 [ErrorHandler] 재시도 처리: ${errorInfo.id}`);
  }

  /**
   * 폴백 처리
   */
  async executeFallback(errorInfo) {
    // 폴백 로직 구현
    console.log(`🔄 [ErrorHandler] 폴백 처리: ${errorInfo.id}`);
  }

  /**
   * 치명적 에러 처리
   */
  async handleCriticalError(errorInfo) {
    // 치명적 에러는 쿨다운 적용
    const cooldownKey = `${errorInfo.type}_${errorInfo.severity}`;
    const lastTime = this.criticalErrorCooldown.get(cooldownKey);
    const now = Date.now();
    
    if (lastTime && (now - lastTime) < ERROR_CONFIG.CRITICAL_ERROR_COOLDOWN) {
      console.log(`⏰ [ErrorHandler] 치명적 에러 쿨다운 중: ${cooldownKey}`);
      return;
    }
    
    this.criticalErrorCooldown.set(cooldownKey, now);
    
    // 치명적 에러 알림
    Alert.alert(
      '치명적 오류',
      '앱에 치명적인 오류가 발생했습니다. 앱을 다시 시작해주세요.',
      [
        { text: '확인', onPress: () => {
          // 앱 재시작 로직
          console.log('🔄 [ErrorHandler] 앱 재시작 요청');
        }}
      ]
    );
  }

  /**
   * 에러 메시지 생성
   */
  getErrorMessage(errorInfo) {
    const messages = {
      [ERROR_TYPE.NETWORK]: '네트워크 오류',
      [ERROR_TYPE.AUTHENTICATION]: '인증 오류',
      [ERROR_TYPE.VALIDATION]: '입력 오류',
      [ERROR_TYPE.SERVER]: '서버 오류',
      [ERROR_TYPE.CLIENT]: '앱 오류',
      [ERROR_TYPE.UNKNOWN]: '알 수 없는 오류'
    };
    
    return messages[errorInfo.type] || '오류 발생';
  }

  /**
   * 에러 설명 생성
   */
  getErrorDescription(errorInfo) {
    if (errorInfo.message) {
      return errorInfo.message;
    }
    
    const descriptions = {
      [ERROR_TYPE.NETWORK]: '네트워크 연결을 확인해주세요.',
      [ERROR_TYPE.AUTHENTICATION]: '다시 로그인해주세요.',
      [ERROR_TYPE.VALIDATION]: '입력한 정보를 확인해주세요.',
      [ERROR_TYPE.SERVER]: '서버에 일시적인 문제가 있습니다.',
      [ERROR_TYPE.CLIENT]: '앱을 다시 시작해주세요.',
      [ERROR_TYPE.UNKNOWN]: '알 수 없는 오류가 발생했습니다.'
    };
    
    return descriptions[errorInfo.type] || '다시 시도해주세요.';
  }

  /**
   * 에러 히스토리 로드
   */
  async loadErrorHistory() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.ERROR_HISTORY);
      if (data) {
        this.errorHistory = JSON.parse(data);
        console.log(`📱 [ErrorHandler] 에러 히스토리 로드 완료: ${this.errorHistory.length}개`);
      }
    } catch (error) {
      console.warn('⚠️ [ErrorHandler] 에러 히스토리 로드 실패:', error);
    }
  }

  /**
   * 에러 히스토리 저장
   */
  async saveErrorHistory() {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ERROR_HISTORY, JSON.stringify(this.errorHistory));
    } catch (error) {
      console.error('❌ [ErrorHandler] 에러 히스토리 저장 실패:', error);
    }
  }

  /**
   * 에러 통계 로드
   */
  async loadErrorStats() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.ERROR_STATS);
      if (data) {
        this.errorStats = JSON.parse(data);
        console.log('📊 [ErrorHandler] 에러 통계 로드 완료');
      }
    } catch (error) {
      console.warn('⚠️ [ErrorHandler] 에러 통계 로드 실패:', error);
    }
  }

  /**
   * 에러 통계 저장
   */
  async saveErrorStats() {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ERROR_STATS, JSON.stringify(this.errorStats));
    } catch (error) {
      console.error('❌ [ErrorHandler] 에러 통계 저장 실패:', error);
    }
  }

  /**
   * 에러 통계 가져오기
   */
  getErrorStats() {
    return {
      history: this.errorHistory,
      stats: this.errorStats,
      totalErrors: this.errorHistory.length,
      recentErrors: this.errorHistory.slice(0, 10)
    };
  }

  /**
   * 에러 히스토리 클리어
   */
  async clearErrorHistory() {
    this.errorHistory = [];
    this.errorStats = {};
    await this.saveErrorHistory();
    await this.saveErrorStats();
    console.log('🧹 [ErrorHandler] 에러 히스토리 클리어 완료');
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
  notifyListeners(errorInfo) {
    this.listeners.forEach(listener => {
      try {
        listener(errorInfo);
      } catch (error) {
        console.error('❌ [ErrorHandler] 리스너 실행 오류:', error);
      }
    });
  }

  /**
   * 정리 작업
   */
  destroy() {
    this.listeners.clear();
    console.log('🧹 [ErrorHandler] 정리 완료');
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
const errorHandler = new ErrorHandler();
export default errorHandler;
