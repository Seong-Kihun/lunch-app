// 네트워크 상태 표시 및 설정 컴포넌트

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, Modal, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import networkInitializer from '../utils/networkInitializer';
import { getAvailableServerURLs } from '../utils/networkDetector';

const NetworkStatus = ({ visible, onClose }) => {
  const [networkInfo, setNetworkInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadNetworkInfo();
    }
  }, [visible]);

  const loadNetworkInfo = () => {
    const info = networkInitializer.getNetworkInfo();
    setNetworkInfo(info);
  };

  const handleReinitialize = async () => {
    setIsLoading(true);
    try {
      await networkInitializer.reinitialize();
      loadNetworkInfo();
      Alert.alert('성공', '네트워크가 재초기화되었습니다.');
    } catch (error) {
      Alert.alert('오류', '네트워크 재초기화에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetServerURL = async (url) => {
    setIsLoading(true);
    try {
      const success = await networkInitializer.setServerURL(url);
      if (success) {
        loadNetworkInfo();
        Alert.alert('성공', `서버 URL이 설정되었습니다: ${url}`);
        onClose();
      } else {
        Alert.alert('오류', '서버 연결에 실패했습니다.');
      }
    } catch (error) {
      Alert.alert('오류', '서버 URL 설정에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = () => {
    if (!networkInfo) return '#6B7280';
    return networkInfo.isInitialized ? '#10B981' : '#EF4444';
  };

  const getStatusText = () => {
    if (!networkInfo) return '알 수 없음';
    return networkInfo.isInitialized ? '연결됨' : '연결 안됨';
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>네트워크 설정</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* 현재 상태 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>현재 상태</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
              <Text style={styles.statusText}>{getStatusText()}</Text>
            </View>
            {networkInfo?.currentServerURL && (
              <Text style={styles.serverURL}>{networkInfo.currentServerURL}</Text>
            )}
          </View>

          {/* 재초기화 버튼 */}
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleReinitialize}
              disabled={isLoading}
            >
              <Ionicons name="refresh" size={20} color="#FFFFFF" />
              <Text style={styles.buttonText}>
                {isLoading ? '재초기화 중...' : '네트워크 재초기화'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 사용 가능한 서버 URL 목록 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>사용 가능한 서버 URL</Text>
            {getAvailableServerURLs().map((url, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.urlButton,
                  networkInfo?.currentServerURL === url && styles.selectedUrlButton
                ]}
                onPress={() => handleSetServerURL(url)}
                disabled={isLoading}
              >
                <Text style={[
                  styles.urlText,
                  networkInfo?.currentServerURL === url && styles.selectedUrlText
                ]}>
                  {url}
                </Text>
                {networkInfo?.currentServerURL === url && (
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* 도움말 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>도움말</Text>
            <Text style={styles.helpText}>
              • 장소를 옮길 때마다 네트워크 재초기화를 시도해보세요{'\n'}
              • 자동 감지가 실패하면 수동으로 서버 URL을 선택하세요{'\n'}
              • 터널 모드(tunnel)를 사용하면 더 안정적입니다
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  closeButton: {
    padding: 5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 15,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  statusText: {
    fontSize: 16,
    color: '#374151',
  },
  serverURL: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'monospace',
    backgroundColor: '#F3F4F6',
    padding: 10,
    borderRadius: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  urlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedUrlButton: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  urlText: {
    fontSize: 14,
    color: '#374151',
    fontFamily: 'monospace',
    flex: 1,
  },
  selectedUrlText: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  helpText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
});

export default NetworkStatus;
