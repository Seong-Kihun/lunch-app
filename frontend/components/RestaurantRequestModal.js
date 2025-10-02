import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import appService from '../services/AppService';
import { useMission } from '../contexts/MissionContext';
import { useSchedule } from '../contexts/ScheduleContext';

const RestaurantRequestModal = ({ visible, onClose, onSubmit, currentUser, prefilledRestaurant, hideAddOption = false }) => {
  const { handleActionCompletion } = useMission();
  const { accessToken } = useSchedule();
  const [requestType, setRequestType] = useState(prefilledRestaurant ? 'update' : 'add');
  const [restaurantName, setRestaurantName] = useState(prefilledRestaurant ? prefilledRestaurant.name : '');
  const [restaurantAddress, setRestaurantAddress] = useState(prefilledRestaurant ? prefilledRestaurant.address : '');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [restaurantSearchModalVisible, setRestaurantSearchModalVisible] = useState(false);
  const [restaurantSearchQuery, setRestaurantSearchQuery] = useState('');
  const [restaurantSearchResults, setRestaurantSearchResults] = useState([]);

  // 네트워크 상태 모니터링 (간소화)
  useEffect(() => {
    // NetInfo 사용을 일시적으로 비활성화하여 오류 방지
    console.log('NetInfo 모니터링 비활성화됨');
  }, []);

  // 앱의 테마 색상 사용
  const currentColors = {
    primary: '#3B82F6',
    primaryLight: 'rgba(59, 130, 246, 0.1)',
    background: '#F1F5F9',
    surface: '#FFFFFF',
    text: '#1E293B',
    textSecondary: '#64748B',
    border: '#E2E8F0',
    gray: '#64748B',
    lightGray: '#E2E8F0',
    yellow: '#F4D160',
    deepBlue: '#1D5D9B',
    blue: '#3B82F6',
    disabled: '#CBD5E0',
  };

  const handleSubmit = async () => {
    if (!restaurantName.trim()) {
      Alert.alert('입력 오류', '식당명을 입력해주세요.');
      return;
    }

    if (requestType === 'add' && !restaurantAddress.trim()) {
      Alert.alert('입력 오류', '식당 주소를 입력해주세요.');
      return;
    }

    if ((requestType === 'update' || requestType === 'delete') && !reason.trim()) {
      Alert.alert('입력 오류', '사유를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const requestData = {
        request_type: requestType,
        requester_id: currentUser.employee_id,
        requester_nickname: currentUser.nickname,
        restaurant_name: restaurantName.trim(),
        restaurant_address: restaurantAddress.trim(),
        reason: reason.trim(),
      };

      console.log('식당 요청 데이터:', requestData);

      // 네트워크 상태 확인은 실제 요청 시도 시 오류로 처리
      // 오프라인 저장 기능은 나중에 구현

      // 서버 URL 사용
      const serverUrl = RENDER_SERVER_URL;
      console.log('서버 URL:', serverUrl);

      // 타임아웃 설정 (10초)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${serverUrl}/restaurants/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken || ''}`,
        },
        body: JSON.stringify(requestData),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log('응답 상태:', response.status);
      const result = await response.json();
      console.log('응답 결과:', result);

      if (response.ok) {
        Alert.alert(
          '신청 완료',
          result.message || '요청이 성공적으로 제출되었습니다.',
          [{ text: '확인', onPress: onClose }]
        );
        
        // 식당 신청하기 미션 완료 처리
        handleActionCompletion('restaurant_request');
        
        resetForm();
      } else {
        // 더 자세한 오류 메시지 제공
        let errorMessage = '신청 중 오류가 발생했습니다.';
        if (result.error) {
          errorMessage = result.error;
        } else if (result.message) {
          errorMessage = result.message;
        } else if (response.status === 400) {
          errorMessage = '잘못된 요청입니다. 입력 정보를 확인해주세요.';
        } else if (response.status === 401) {
          errorMessage = '인증이 필요합니다. 다시 로그인해주세요.';
        } else if (response.status === 500) {
          errorMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
        }
        
        Alert.alert('신청 실패', errorMessage);
      }
    } catch (error) {
      console.error('식당 신청 오류:', error);
      
      // 네트워크 오류 세분화
      let errorMessage = '식당 신청 중 오류가 발생했습니다.';
      
      if (error.message === '인터넷 연결을 확인해주세요.') {
        errorMessage = '인터넷 연결을 확인해주세요.';
      } else if (error.name === 'TypeError' && error.message.includes('Network request failed')) {
        errorMessage = '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.';
      } else if (error.message.includes('fetch')) {
        errorMessage = '서버에 연결할 수 없습니다. 인터넷 연결을 확인해주세요.';
      } else if (error.message.includes('timeout')) {
        errorMessage = '요청 시간이 초과되었습니다. 다시 시도해주세요.';
      }
      
      Alert.alert('오류', errorMessage, [
        { text: '다시 시도', onPress: () => setLoading(false) },
        { text: '취소', onPress: () => setLoading(false) }
      ]);
      return;
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setRequestType('add');
    setRestaurantName('');
    setRestaurantAddress('');
    setReason('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const searchRestaurants = async (query) => {
    if (!query.trim()) {
      setRestaurantSearchResults([]);
      return;
    }
    
    try {
      // 네트워크 상태 확인은 실제 요청 시도 시 오류로 처리

      // 서버 URL 사용
      const response = await appService.get(`/restaurants?query=${encodeURIComponent(query)}&per_page=100`);
      
      if (response.ok) {
        const data = await response.json();
        setRestaurantSearchResults(data.restaurants || []);
      } else {
        console.log('식당 검색 응답 오류:', response.status);
        setRestaurantSearchResults([]);
      }
    } catch (error) {
      console.error('식당 검색 오류:', error);
      setRestaurantSearchResults([]);
    }
  };

  const selectRestaurant = (restaurant) => {
    setRestaurantName(restaurant.name);
    setRestaurantSearchModalVisible(false);
    setRestaurantSearchQuery('');
    setRestaurantSearchResults([]);
  };

  // 오프라인 요청 동기화 함수
  const syncOfflineRequests = async () => {
    try {
      const storedRequests = await AsyncStorage.getItem('offlineRestaurantRequests');
      if (!storedRequests) return;

      const offlineRequests = JSON.parse(storedRequests);
      if (offlineRequests.length === 0) return;

      console.log('오프라인 요청 동기화 시작:', offlineRequests.length, '개');

      const serverUrl = RENDER_SERVER_URL;
      const successfulRequests = [];
      const failedRequests = [];

      for (const request of offlineRequests) {
        try {
          const response = await fetch(`${serverUrl}/restaurants/requests`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken || ''}`,
            },
            body: JSON.stringify(request),
          });

          if (response.ok) {
            successfulRequests.push(request);
          } else {
            failedRequests.push(request);
          }
        } catch (error) {
          failedRequests.push(request);
        }
      }

      // 성공한 요청들은 제거하고, 실패한 요청들은 유지
      if (successfulRequests.length > 0) {
        const remainingRequests = offlineRequests.filter(req => 
          !successfulRequests.some(success => success.timestamp === req.timestamp)
        );
        await AsyncStorage.setItem('offlineRestaurantRequests', JSON.stringify(remainingRequests));
        console.log('오프라인 요청 동기화 완료:', successfulRequests.length, '개 성공');
      }

      if (failedRequests.length > 0) {
        console.log('오프라인 요청 동기화 실패:', failedRequests.length, '개');
      }
    } catch (error) {
      console.error('오프라인 요청 동기화 오류:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.6)' }]}>
        <View style={[styles.modalContent, { backgroundColor: currentColors.surface }]}>
          <View style={[styles.header, { borderBottomColor: currentColors.border }]}>
            <Text style={[styles.title, { color: currentColors.text }]}>식당 신청</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={currentColors.gray} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* 신청 유형 선택 */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: currentColors.text }]}>신청 유형</Text>
              <View style={styles.typeButtons}>
                {!hideAddOption && (
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      { 
                        backgroundColor: requestType === 'add' ? currentColors.primary : currentColors.lightGray,
                        borderColor: requestType === 'add' ? currentColors.primary : currentColors.border
                      }
                    ]}
                    onPress={() => setRequestType('add')}
                  >
                    <Text style={[
                      styles.typeButtonText,
                      { color: requestType === 'add' ? '#FFFFFF' : currentColors.textSecondary }
                    ]}>
                      추가
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    { 
                      backgroundColor: requestType === 'update' ? currentColors.primary : currentColors.lightGray,
                      borderColor: requestType === 'update' ? currentColors.primary : currentColors.border
                    }
                  ]}
                  onPress={() => setRequestType('update')}
                >
                  <Text style={[
                    styles.typeButtonText,
                    { color: requestType === 'update' ? '#FFFFFF' : currentColors.textSecondary }
                  ]}>
                    수정
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    { 
                      backgroundColor: requestType === 'delete' ? currentColors.primary : currentColors.lightGray,
                      borderColor: requestType === 'delete' ? currentColors.primary : currentColors.border
                    }
                  ]}
                  onPress={() => setRequestType('delete')}
                >
                  <Text style={[
                    styles.typeButtonText,
                    { color: requestType === 'delete' ? '#FFFFFF' : currentColors.textSecondary }
                  ]}>
                    삭제
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 식당명 입력 */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: currentColors.text }]}>식당명 *</Text>
              {requestType === 'add' ? (
                <TextInput
                  style={[styles.input, { 
                    borderColor: currentColors.border,
                    color: currentColors.text,
                    backgroundColor: currentColors.surface
                  }]}
                  value={restaurantName}
                  onChangeText={setRestaurantName}
                  placeholder="식당명을 입력하세요"
                  placeholderTextColor={currentColors.gray}
                />
              ) : (
                <TouchableOpacity
                  style={[styles.input, { 
                    borderColor: currentColors.border,
                    backgroundColor: currentColors.lightGray,
                    justifyContent: 'center'
                  }]}
                  onPress={() => setRestaurantSearchModalVisible(true)}
                >
                  <Text style={{ 
                    color: restaurantName ? currentColors.text : currentColors.gray,
                    fontSize: 14
                  }}>
                    {restaurantName || '기존 식당을 선택하세요'}
                  </Text>
                  <Ionicons 
                    name="chevron-down" 
                    size={20} 
                    color={currentColors.gray} 
                    style={{ position: 'absolute', right: 16 }}
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* 식당 주소 입력 (추가 시에만) */}
            {requestType === 'add' && (
              <View style={styles.section}>
                <Text style={[styles.label, { color: currentColors.text }]}>식당 주소 *</Text>
                <TextInput
                  style={[styles.input, { 
                    borderColor: currentColors.border,
                    color: currentColors.text,
                    backgroundColor: currentColors.surface
                  }]}
                  value={restaurantAddress}
                  onChangeText={setRestaurantAddress}
                  placeholder="식당 주소를 입력하세요"
                  placeholderTextColor={currentColors.gray}
                />
              </View>
            )}

            {/* 사유 입력 (수정/삭제 시에만) */}
            {(requestType === 'update' || requestType === 'delete') && (
              <View style={styles.section}>
                <Text style={[styles.label, { color: currentColors.text }]}>사유 *</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { 
                    borderColor: currentColors.border,
                    color: currentColors.text,
                    backgroundColor: currentColors.surface
                  }]}
                  value={reason}
                  onChangeText={setReason}
                  placeholder={`${requestType === 'update' ? '수정' : '삭제'} 사유를 입력하세요`}
                  placeholderTextColor={currentColors.gray}
                  multiline
                  numberOfLines={4}
                />
              </View>
            )}

            {/* 안내 메시지 */}
            <View style={[styles.infoSection, { backgroundColor: currentColors.lightGray }]}>
              <Text style={[styles.infoText, { color: currentColors.textSecondary }]}>
                • 신청은 관리자 검토 후 승인됩니다.
              </Text>
              <Text style={[styles.infoText, { color: currentColors.textSecondary }]}>
                • 모든 식당 신청은 검토 후 승인됩니다.
              </Text>
            </View>
          </ScrollView>

          {/* 하단 버튼 */}
          <View style={[styles.footer, { borderTopColor: currentColors.border }]}>
            <TouchableOpacity
              style={[styles.cancelButton, { 
                borderColor: currentColors.border,
                backgroundColor: currentColors.surface
              }]}
              onPress={handleClose}
            >
              <Text style={[styles.cancelButtonText, { color: currentColors.textSecondary }]}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, { 
                backgroundColor: loading ? currentColors.disabled : currentColors.primary
              }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={[styles.submitButtonText, { color: '#FFFFFF' }]}>
                {loading ? '신청 중...' : '신청하기'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 식당 검색 모달 */}
      <Modal
        visible={restaurantSearchModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRestaurantSearchModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.6)' }]}>
          <View style={[styles.modalContent, { backgroundColor: currentColors.surface, maxHeight: '70%' }]}>
            <View style={[styles.header, { borderBottomColor: currentColors.border }]}>
              <Text style={[styles.title, { color: currentColors.text }]}>기존 식당 선택</Text>
              <TouchableOpacity onPress={() => setRestaurantSearchModalVisible(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={currentColors.gray} />
              </TouchableOpacity>
            </View>

            <View style={styles.content}>
              <TextInput
                style={[styles.input, { 
                  borderColor: currentColors.border,
                  color: currentColors.text,
                  backgroundColor: currentColors.surface,
                  marginBottom: 16
                }]}
                value={restaurantSearchQuery}
                onChangeText={(text) => {
                  setRestaurantSearchQuery(text);
                  searchRestaurants(text);
                }}
                placeholder="식당명을 검색하세요"
                placeholderTextColor={currentColors.gray}
              />

              <ScrollView style={{ maxHeight: 300 }}>
                {restaurantSearchResults.map((restaurant) => (
                  <TouchableOpacity
                    key={restaurant.id}
                    style={[styles.restaurantItem, { borderBottomColor: currentColors.border }]}
                    onPress={() => selectRestaurant(restaurant)}
                  >
                    <Text style={[styles.restaurantName, { color: currentColors.text }]}>
                      {restaurant.name}
                    </Text>
                    <Text style={[styles.restaurantCategory, { color: currentColors.textSecondary }]}>
                      {restaurant.category}
                    </Text>
                  </TouchableOpacity>
                ))}
                {restaurantSearchResults.length === 0 && restaurantSearchQuery && (
                  <Text style={[styles.noResults, { color: currentColors.textSecondary }]}>
                    검색 결과가 없습니다.
                  </Text>
                )}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  infoSection: {
    padding: 16,
    borderRadius: 12,
    marginTop: 10,
  },
  infoText: {
    fontSize: 12,
    marginBottom: 4,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  restaurantItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  restaurantCategory: {
    fontSize: 14,
    color: '#64748B',
  },
  noResults: {
    textAlign: 'center',
    padding: 20,
    fontSize: 14,
  },
});

export default RestaurantRequestModal; 