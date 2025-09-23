/**
 * 통합 에러 처리 유틸리티
 * 앱 전체에서 일관된 에러 처리와 사용자 피드백을 제공합니다.
 */

import { Alert } from 'react-native';

/**
 * 에러 타입 정의
 */
export const ERROR_TYPES = {
    NETWORK: 'NETWORK',
    AUTHENTICATION: 'AUTHENTICATION',
    VALIDATION: 'VALIDATION',
    SERVER: 'SERVER',
    UNKNOWN: 'UNKNOWN'
};

/**
 * 에러 메시지 매핑
 */
const ERROR_MESSAGES = {
    [ERROR_TYPES.NETWORK]: {
        title: '네트워크 오류',
        message: '인터넷 연결을 확인해주세요.',
        action: '다시 시도'
    },
    [ERROR_TYPES.AUTHENTICATION]: {
        title: '인증 오류',
        message: '로그인이 필요합니다.',
        action: '로그인'
    },
    [ERROR_TYPES.VALIDATION]: {
        title: '입력 오류',
        message: '입력한 정보를 확인해주세요.',
        action: '확인'
    },
    [ERROR_TYPES.SERVER]: {
        title: '서버 오류',
        message: '일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
        action: '다시 시도'
    },
    [ERROR_TYPES.UNKNOWN]: {
        title: '오류 발생',
        message: '예상치 못한 오류가 발생했습니다.',
        action: '확인'
    }
};

/**
 * 에러 타입 감지
 */
export const detectErrorType = (error) => {
    if (!error) return ERROR_TYPES.UNKNOWN;

    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code || error.status;

    // 네트워크 에러
    if (
        errorMessage.includes('network') ||
        errorMessage.includes('fetch') ||
        errorMessage.includes('timeout') ||
        errorCode === 'NETWORK_ERROR' ||
        errorCode === 'TIMEOUT'
    ) {
        return ERROR_TYPES.NETWORK;
    }

    // 인증 에러
    if (
        errorMessage.includes('unauthorized') ||
        errorMessage.includes('forbidden') ||
        errorCode === 401 ||
        errorCode === 403
    ) {
        return ERROR_TYPES.AUTHENTICATION;
    }

    // 유효성 검증 에러
    if (
        errorMessage.includes('validation') ||
        errorMessage.includes('invalid') ||
        errorCode === 400 ||
        errorCode === 'VALIDATION_ERROR'
    ) {
        return ERROR_TYPES.VALIDATION;
    }

    // 서버 에러
    if (
        errorCode >= 500 ||
        errorCode === 'SERVER_ERROR' ||
        errorMessage.includes('internal server error')
    ) {
        return ERROR_TYPES.SERVER;
    }

    return ERROR_TYPES.UNKNOWN;
};

/**
 * 에러 정보 추출
 */
export const extractErrorInfo = (error) => {
    const errorType = detectErrorType(error);
    const errorConfig = ERROR_MESSAGES[errorType];

    return {
        type: errorType,
        title: errorConfig.title,
        message: errorConfig.message,
        action: errorConfig.action,
        originalError: error,
        timestamp: new Date().toISOString()
    };
};

/**
 * 에러 로깅
 */
export const logError = (error, context = '') => {
    const errorInfo = extractErrorInfo(error);
    
    console.error(`❌ [ErrorHandler${context ? ` - ${context}` : ''}]`, {
        type: errorInfo.type,
        message: errorInfo.message,
        originalError: errorInfo.originalError,
        timestamp: errorInfo.timestamp
    });

    // 개발 환경에서만 상세 에러 정보 출력
    if (__DEV__) {
        console.error('🔍 [ErrorHandler] 상세 에러 정보:', error);
    }
};

/**
 * 사용자에게 에러 알림 표시
 */
export const showErrorAlert = (error, context = '', onRetry = null) => {
    const errorInfo = extractErrorInfo(error);
    logError(error, context);

    const buttons = [
        { text: errorInfo.action, style: 'default' }
    ];

    if (onRetry && (errorInfo.type === ERROR_TYPES.NETWORK || errorInfo.type === ERROR_TYPES.SERVER)) {
        buttons.unshift({
            text: '다시 시도',
            onPress: onRetry,
            style: 'default'
        });
    }

    Alert.alert(
        errorInfo.title,
        errorInfo.message,
        buttons,
        { cancelable: true }
    );
};

/**
 * API 에러 처리
 */
export const handleApiError = async (error, context = '', onRetry = null) => {
    // 네트워크 에러인 경우 재시도 로직
    if (detectErrorType(error) === ERROR_TYPES.NETWORK && onRetry) {
        try {
            await onRetry();
            return; // 재시도 성공 시 에러 알림 표시하지 않음
        } catch (retryError) {
            // 재시도 실패 시 원래 에러로 처리
            showErrorAlert(retryError, `${context} (재시도 실패)`, null);
            return;
        }
    }

    showErrorAlert(error, context, onRetry);
};

/**
 * Promise 에러 처리 래퍼
 */
export const withErrorHandling = (promise, context = '', onRetry = null) => {
    return promise.catch(error => {
        handleApiError(error, context, onRetry);
        throw error; // 원래 에러를 다시 throw하여 호출자가 처리할 수 있도록 함
    });
};

/**
 * 비동기 함수 에러 처리 래퍼
 */
export const asyncWithErrorHandling = (asyncFn, context = '', onRetry = null) => {
    return async (...args) => {
        try {
            return await asyncFn(...args);
        } catch (error) {
            handleApiError(error, context, onRetry);
            throw error;
        }
    };
};

/**
 * 에러 복구 제안
 */
export const getErrorRecoverySuggestion = (errorType) => {
    const suggestions = {
        [ERROR_TYPES.NETWORK]: [
            'Wi-Fi 또는 모바일 데이터 연결을 확인하세요.',
            '네트워크 설정을 다시 확인해보세요.',
            '잠시 후 다시 시도해보세요.'
        ],
        [ERROR_TYPES.AUTHENTICATION]: [
            '앱을 다시 시작해보세요.',
            '로그아웃 후 다시 로그인해보세요.',
            '계정 정보를 확인해보세요.'
        ],
        [ERROR_TYPES.VALIDATION]: [
            '입력한 정보가 올바른지 확인하세요.',
            '필수 항목을 모두 입력했는지 확인하세요.',
            '입력 형식을 확인해보세요.'
        ],
        [ERROR_TYPES.SERVER]: [
            '잠시 후 다시 시도해보세요.',
            '앱을 다시 시작해보세요.',
            '문제가 지속되면 고객센터에 문의하세요.'
        ]
    };

    return suggestions[errorType] || ['앱을 다시 시작해보세요.'];
};

export default {
    ERROR_TYPES,
    detectErrorType,
    extractErrorInfo,
    logError,
    showErrorAlert,
    handleApiError,
    withErrorHandling,
    asyncWithErrorHandling,
    getErrorRecoverySuggestion
};
