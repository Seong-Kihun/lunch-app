import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS
} from 'react-native-reanimated';

const DateScheduleModal = ({ 
  visible, 
  onClose, 
  selectedDate, 
  navigation,
  currentColors 
}) => {
  const [availableFriends, setAvailableFriends] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // 애니메이션 값들
  const translateY = useSharedValue(0);
  const modalScale = useSharedValue(1);

  // 애니메이션 스타일
  const animatedModalStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: translateY.value },
        { scale: modalScale.value }
      ]
    };
  });

  // 제스처 핸들러
  const gesture = Gesture.Pan()
    .onStart(() => {
      'worklet';
    })
    .onUpdate((event) => {
      'worklet';
      if (event.translationY > 0) {
        translateY.value = event.translationY;
        modalScale.value = Math.max(0.95, 1 - event.translationY / 1000);
      }
    })
    .onEnd((event) => {
      'worklet';
      if (event.translationY > 100) {
        runOnJS(onClose)();
      } else {
        translateY.value = withSpring(0);
        modalScale.value = withSpring(1);
      }
    });

  // 해당 날짜에 점심 약속이 없어서 점심 약속 잡기 좋은 친구 목록 조회
  const fetchAvailableFriends = useCallback(async () => {
    if (!selectedDate) return;

    try {
      setIsLoading(true);
      setError('');

      const serverUrl = process.env.EXPO_PUBLIC_RENDER_SERVER_URL || 'https://lunch-app-backend-ra12.onrender.com';
      const currentUserId = global.myEmployeeId || '1';

      // 1. 친구 목록 조회
      const friendsResponse = await fetch(`${serverUrl}/dev/friends/${currentUserId}`);
      if (!friendsResponse.ok) {
        throw new Error('친구 목록 조회 실패');
      }
      const friends = await friendsResponse.json();

      // 2. 해당 날짜의 일정 조회
      const schedulesResponse = await fetch(`${serverUrl}/dev/schedules/date?date=${selectedDate}`);
      if (!schedulesResponse.ok) {
        throw new Error('일정 조회 실패');
      }
      const schedules = await schedulesResponse.json();

      // 3. 참석자 목록 추출
      const busyEmployeeIds = new Set();
      schedules.forEach(schedule => {
        if (schedule.attendees) {
          schedule.attendees.forEach(attendee => {
            busyEmployeeIds.add(attendee.employee_id);
          });
        }
      });

      // 4. 점심 약속이 없어서 점심 약속 잡기 좋은 친구들만 필터링
      const available = friends.filter(friend => 
        !busyEmployeeIds.has(friend.employee_id)
      );

      setAvailableFriends(available);
    } catch (error) {
      console.error('점심 약속 잡기 좋은 친구 조회 실패:', error);
      setError('친구 목록을 불러올 수 없습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (visible && selectedDate) {
      fetchAvailableFriends();
    }
  }, [visible, selectedDate, fetchAvailableFriends]);

  // 날짜 포맷팅
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayName = dayNames[date.getDay()];
    return `${month}월 ${day}일 (${dayName})`;
  };

  // 랜덤런치 시작
  const handleRandomLunch = () => {
    onClose();
    navigation.navigate('파티', { screen: 'RandomLunch' });
  };

  // 그룹파티 시작
  const handleGroupParty = () => {
    onClose();
    navigation.navigate('파티', { screen: 'CreateParty' });
  };

  // 기타일정 시작
  const handleOtherSchedule = () => {
    onClose();
    navigation.navigate('CreatePersonalSchedule');
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <Pressable style={styles.centeredView} onPress={onClose}>
        <GestureDetector gesture={gesture}>
          <Animated.View style={[styles.modalView, { backgroundColor: currentColors.surface }, animatedModalStyle]}>
            {/* 모달 헤더 */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: currentColors.text }]}>
                {formatDate(selectedDate)} 점심 약속 만들기
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color={currentColors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* 점심 약속 잡기 좋은 친구 목록 */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: currentColors.text }]}>
                  점심 약속 잡기 좋은 친구 ({availableFriends.length}명)
                </Text>
                
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={currentColors.primary} />
                    <Text style={[styles.loadingText, { color: currentColors.textSecondary }]}>
                      친구 목록을 불러오는 중...
                    </Text>
                  </View>
                ) : error ? (
                  <View style={[styles.errorContainer, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                    <Text style={[styles.errorText, { color: '#DC2626' }]}>{error}</Text>
                  </View>
                ) : availableFriends.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="people-outline" size={48} color={currentColors.textSecondary} />
                    <Text style={[styles.emptyText, { color: currentColors.textSecondary }]}>
                      점심 약속 잡기 좋은 친구가 없습니다
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.friendsList, { backgroundColor: currentColors.background }]}>
                    {availableFriends.slice(0, 10).map((friend, index) => (
                      <View key={friend.employee_id} style={[styles.friendItem, { borderBottomColor: currentColors.border }]}>
                        <View style={[styles.friendAvatar, { backgroundColor: currentColors.primaryLight }]}>
                          <Text style={[styles.friendAvatarText, { color: currentColors.primary }]}>
                            {friend.nickname.charAt(0)}
                          </Text>
                        </View>
                        <View style={styles.friendInfo}>
                          <Text style={[styles.friendName, { color: currentColors.text }]}>
                            {friend.nickname}
                          </Text>
                          {friend.department && (
                            <Text style={[styles.friendDepartment, { color: currentColors.textSecondary }]}>
                              {friend.department}
                            </Text>
                          )}
                        </View>
                        <View style={[styles.availableBadge, { backgroundColor: currentColors.success || '#10B981' }]}>
                          <Text style={styles.availableBadgeText}>자유</Text>
                        </View>
                      </View>
                    ))}
                    {availableFriends.length > 10 && (
                      <Text style={[styles.moreText, { color: currentColors.textSecondary }]}>
                        외 {availableFriends.length - 10}명 더...
                      </Text>
                    )}
                  </View>
                )}
              </View>

              {/* 액션 버튼들 */}
              <View style={styles.actionsSection}>
                <Text style={[styles.sectionTitle, { color: currentColors.text }]}>
                  점심 약속 만들기
                </Text>
                
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: currentColors.primary }]}
                    onPress={handleRandomLunch}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="shuffle" size={20} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>랜덤런치</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: currentColors.primary }]}
                    onPress={handleGroupParty}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="people" size={20} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>그룹파티</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: currentColors.primary }]}
                    onPress={handleOtherSchedule}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="calendar" size={20} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>기타일정</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </Animated.View>
        </GestureDetector>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
  },
  errorContainer: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  friendsList: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  friendAvatarText: {
    fontSize: 16,
    fontWeight: '600',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  friendDepartment: {
    fontSize: 14,
  },
  availableBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  availableBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  moreText: {
    textAlign: 'center',
    paddingVertical: 12,
    fontSize: 14,
  },
  actionsSection: {
    marginVertical: 16,
    marginBottom: 32,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default DateScheduleModal;
