/**
 * 오프라인 모드 표시기
 * 백엔드 오류나 네트워크 문제 시 사용자에게 오프라인 모드 상태를 알려줍니다.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import offlineModeManager from '../services/OfflineModeManager';

const OfflineModeIndicator = ({ style, onRetry }) => {
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [offlineReason, setOfflineReason] = useState(null);

  useEffect(() => {
    // 초기 상태 확인
    checkOfflineModeStatus();

    // 전역 상태 변화 감지
    const interval = setInterval(checkOfflineModeStatus, 1000);

    return () => clearInterval(interval);
  }, []);

  const checkOfflineModeStatus = () => {
    const isOffline = offlineModeManager.isInOfflineMode();
    const reason = global.offlineModeReason;
    
    if (isOffline !== isOfflineMode) {
      setIsOfflineMode(isOffline);
      setOfflineReason(reason);
    }
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      // 기본 재시도 로직
      Alert.alert(
        '온라인 모드로 전환',
        '네트워크 상태를 다시 확인하고 온라인 모드로 전환을 시도하시겠습니까?',
        [
          { text: '취소', style: 'cancel' },
          { 
            text: '재시도', 
            onPress: () => {
              offlineModeManager.disableOfflineMode();
              // 네트워크 상태 재확인을 위해 앱 새로고침 유도
              Alert.alert('알림', '네트워크 상태를 확인하기 위해 앱을 새로고침해주세요.');
            }
          }
        ]
      );
    }
  };

  const getOfflineMessage = (reason) => {
    switch (reason) {
      case 'database_error':
        return '데이터베이스 오류로 인해 오프라인 모드로 전환되었습니다.';
      case 'backend_error':
        return '백엔드 서버 오류로 인해 오프라인 모드로 전환되었습니다.';
      case 'network_error':
        return '네트워크 연결 문제로 인해 오프라인 모드로 전환되었습니다.';
      default:
        return '오프라인 모드로 전환되었습니다.';
    }
  };

  if (!isOfflineMode) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.content}>
        <Text style={styles.icon}>📴</Text>
        <View style={styles.textContainer}>
          <Text style={styles.title}>오프라인 모드</Text>
          <Text style={styles.message}>
            {getOfflineMessage(offlineReason)}
          </Text>
          <Text style={styles.subMessage}>
            기본 기능은 계속 사용할 수 있습니다.
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={handleRetry}
        >
          <Text style={styles.retryText}>재시도</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF3CD',
    borderColor: '#FFEAA7',
    borderWidth: 1,
    borderRadius: 8,
    margin: 8,
    padding: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 2,
  },
  subMessage: {
    fontSize: 12,
    color: '#856404',
    opacity: 0.8,
  },
  retryButton: {
    backgroundColor: '#FFC107',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 12,
  },
  retryText: {
    color: '#856404',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default OfflineModeIndicator;
