/**
 * 채팅방 만들기 화면
 * 친구 목록에서 참석자를 선택하여 새로운 채팅방을 생성하는 화면입니다.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  Modal,
  Keyboard,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../utils/apiClient';

const CreateChatRoomScreen = ({ navigation }) => {
  // 전체 앱과 통일된 색상 시스템 사용
  const currentColors = global.currentColors || {
    background: '#F1F5F9',
    surface: '#FFFFFF',
    primary: '#3B82F6',
    primaryLight: '#E3F2FD',
    text: '#000000',
    textSecondary: '#666666',
    border: '#E5E7EB',
    success: '#10B981',
    error: '#EF4444',
    lightGray: '#D1D5DB'
  };


  // 상태 관리
  const [selectedAttendees, setSelectedAttendees] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // 참석자 선택 관련 상태들
  const [friends, setFriends] = useState([]);
  const [frequentFriends, setFrequentFriends] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [friendsError, setFriendsError] = useState('');

  // 친구 목록 가져오기
  const fetchFriends = useCallback(async () => {
    try {
      setIsLoadingFriends(true);
      setFriendsError('');
      
      const serverUrl = process.env.EXPO_PUBLIC_RENDER_SERVER_URL || 'http://172.30.1.43:5000';
      
      // 검색어가 있으면 전체 가상 유저에서 검색, 없으면 친구 관계 기반으로 조회
      if (searchQuery.trim()) {
        const allUsersResponse = await apiClient.get(`${serverUrl}/dev/users`);
        if (allUsersResponse.ok) {
          const allUsers = await allUsersResponse.json();
          setFriends(allUsers);
        } else {
          throw new Error('전체 유저 API 응답 오류');
        }
      } else {
        const currentUserId = global.myEmployeeId || '1';
        const friendsResponse = await apiClient.get(`${serverUrl}/dev/friends/${currentUserId}`);
        if (friendsResponse.ok) {
          const friends = await friendsResponse.json();
          setFriends(friends);
        } else {
          throw new Error('친구 관계 API 응답 오류');
        }
      }
    } catch (error) {
      console.error('친구 목록 조회 실패:', error);
      setFriendsError('친구 목록을 불러올 수 없습니다.');
    } finally {
      setIsLoadingFriends(false);
    }
  }, [searchQuery]);

  // 자주 만나는 친구 데이터 가져오기
  const fetchFrequentFriends = useCallback(async () => {
    try {
      const serverUrl = process.env.EXPO_PUBLIC_RENDER_SERVER_URL || 'http://172.30.1.43:5000';
      const historyResponse = await fetch(`${serverUrl}/dev/schedules/history`);
      
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        
        // 만남 횟수 계산
        const meetingCounts = {};
        historyData.forEach(schedule => {
          if (schedule.attendees) {
            schedule.attendees.forEach(attendee => {
              if (attendee.employee_id !== global.currentUser?.employee_id) {
                meetingCounts[attendee.employee_id] = (meetingCounts[attendee.employee_id] || 0) + 1;
              }
            });
          }
        });
        
        // 만남 횟수 순으로 정렬하여 상위 5명 선택 (이미 선택된 참석자 제외)
        const availableFriends = friends.filter(friend => 
          !selectedAttendees.some(attendee => attendee.employee_id === friend.employee_id)
        );
        
        const sortedFriends = availableFriends
          .map(friend => ({
            ...friend,
            meetingCount: meetingCounts[friend.employee_id] || 0
          }))
          .sort((a, b) => b.meetingCount - a.meetingCount)
          .slice(0, 5);
        
        setFrequentFriends(sortedFriends);
      } else {
        // 히스토리 API가 실패하면 친구 목록에서 랜덤하게 선택
        const availableFriends = friends.filter(friend => 
          !selectedAttendees.some(attendee => attendee.employee_id === friend.employee_id)
        );
        
        const shuffled = [...availableFriends].sort(() => 0.5 - Math.random());
        setFrequentFriends(shuffled.slice(0, 5));
      }
    } catch (error) {
      console.error('자주 만나는 친구 조회 실패:', error);
      // 에러 시 친구 목록에서 랜덤하게 선택
      const availableFriends = friends.filter(friend => 
        !selectedAttendees.some(attendee => attendee.employee_id === friend.employee_id)
      );
      
      const shuffled = [...availableFriends].sort(() => 0.5 - Math.random());
      setFrequentFriends(shuffled.slice(0, 5));
    }
  }, [friends, selectedAttendees]);

  // 컴포넌트 마운트 시 친구 목록 가져오기
  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  // 친구 목록이 로드되면 자주 만나는 친구 데이터도 가져오기
  useEffect(() => {
    if (friends.length > 0) {
      fetchFrequentFriends();
    }
  }, [friends, fetchFrequentFriends]);

  // 참석자 추가/제거
  const addAttendee = (friend) => {
    const isAlreadyAdded = selectedAttendees.some(a => a.employee_id === friend.employee_id);
    if (!isAlreadyAdded) {
      setSelectedAttendees(prev => [...prev, friend]);
      // 참석자 추가 시 자주 만나는 친구 목록에서 제거
      setFrequentFriends(prev => prev.filter(f => f.employee_id !== friend.employee_id));
    }
  };

  const removeAttendee = (employeeId) => {
    setSelectedAttendees(prev => prev.filter(a => a.employee_id !== employeeId));
    // 참석자 제거 시 자주 만나는 친구 목록에 다시 추가할 수 있도록 업데이트
    const removedAttendee = friends.find(f => f.employee_id === employeeId);
    if (removedAttendee && !frequentFriends.some(f => f.employee_id === employeeId)) {
      setFrequentFriends(prev => [...prev, removedAttendee]);
    }
  };

  const handleCreateChat = async () => {
    if (selectedAttendees.length === 0) {
      Alert.alert('오류', '채팅할 친구를 선택해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const serverUrl = process.env.EXPO_PUBLIC_RENDER_SERVER_URL || 'http://172.30.1.43:5000';
      
      // 선택된 참석자들의 employee_id 배열 생성
      const employeeIds = selectedAttendees.map(attendee => attendee.employee_id);
      
      // 현재 사용자도 포함
      if (global.currentUser?.employee_id) {
        employeeIds.unshift(global.currentUser.employee_id);
      }

      const requestData = {
        title: `${selectedAttendees.map(a => a.nickname).join(', ')}와의 채팅`,
        employee_ids: employeeIds
      };

      console.log('채팅방 생성 API 호출:', { requestData });

      const response = await fetch(`${serverUrl}/dev/chat/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log('채팅방 생성 성공:', result);
        
        // 성공 시 채팅방으로 이동
        Alert.alert(
          '성공',
          '채팅방이 생성되었습니다.',
          [
            {
              text: '확인',
              onPress: () => {
                navigation.navigate('ChatRoom', {
                  chatType: 'group',
                  chatId: result.chat_id,
                  chatName: result.title || requestData.title,
                  userId: global.currentUser?.employee_id || '1',
                  userNickname: global.currentUser?.nickname || '사용자'
                });
              }
            }
          ]
        );
      } else {
        throw new Error(result.error || '채팅방 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('채팅방 생성 실패:', error);
      Alert.alert('오류', error.message || '채팅방 생성에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background }]}>
      <ScrollView style={styles.scrollView}>
        {/* 헤더 섹션 */}
        <View style={styles.header}>
        </View>

        {/* 메인 컨텐츠 */}
        <View style={styles.content}>

          {/* 선택된 참석자 표시 */}
          {selectedAttendees.length > 0 && (
            <View style={styles.selectedAttendeesSection}>
              <Text style={[styles.sectionTitle, { color: currentColors.text }]}>
                선택된 친구 ({selectedAttendees.length}명)
              </Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.selectedAttendeesScroll}
              >
                {selectedAttendees.map((attendee, index) => (
                  <View key={attendee.employee_id} style={styles.attendeeCard}>
                    <View style={[styles.attendeeAvatar, { backgroundColor: currentColors.primaryLight }]}>
                      <Text style={[styles.attendeeAvatarText, { color: currentColors.primary }]}>
                        {attendee.nickname.charAt(0)}
                      </Text>
                    </View>
                    
                    {/* X 버튼 (선택 취소) */}
                    <TouchableOpacity
                      style={[styles.removeButton, { backgroundColor: currentColors.error || '#EF4444' }]}
                      onPress={() => removeAttendee(attendee.employee_id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="close" size={10} color="#FFFFFF" />
                    </TouchableOpacity>
                    
                    <Text style={[styles.attendeeName, { color: currentColors.text }]}>
                      {attendee.nickname}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* 검색 입력창 */}
          <View style={styles.searchSection}>
            <Text style={[styles.sectionTitle, { color: currentColors.text }]}>
              친구 검색
            </Text>
            <View style={[styles.searchContainer, { backgroundColor: currentColors.surface, borderColor: currentColors.border }]}>
              <TextInput
                style={[styles.searchInput, { color: currentColors.text }]}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="친구 이름을 검색하세요"
                placeholderTextColor={currentColors.textSecondary}
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
                blurOnSubmit={true}
              />
              <Ionicons name="search" size={20} color={currentColors.textSecondary} />
            </View>
          </View>

          {/* 자주 만나는 친구들 */}
          {frequentFriends.length > 0 && (
            <View style={styles.frequentFriendsSection}>
              <Text style={[styles.sectionTitle, { color: currentColors.text }]}>
                자주 만나는 친구
              </Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.frequentFriendsScroll}
              >
                {frequentFriends.map((friend) => {
                  const isSelected = selectedAttendees.some(a => a.employee_id === friend.employee_id);
                  return (
                    <TouchableOpacity
                      key={friend.employee_id}
                      style={[
                        styles.frequentFriendButton,
                        { backgroundColor: currentColors.surface, borderColor: currentColors.border },
                        isSelected && { backgroundColor: currentColors.primary, borderColor: currentColors.primary }
                      ]}
                      onPress={() => !isSelected ? addAttendee(friend) : removeAttendee(friend.employee_id)}
                    >
                      <Text style={[
                        styles.frequentFriendText,
                        { color: currentColors.text },
                        isSelected && { color: currentColors.surface }
                      ]}>
                        {friend.nickname}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* 검색 결과 또는 전체 친구 목록 */}
          <View style={styles.friendsSection}>
            <Text style={[styles.sectionTitle, { color: currentColors.text }]}>
              {searchQuery.trim() ? `검색 결과 (${friends.filter(friend => 
                friend.nickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (friend.department && friend.department.toLowerCase().includes(searchQuery.toLowerCase()))
              ).length}명)` : `친구 목록 (${friends.length}명)`}
            </Text>
            
            {/* 로딩 상태 */}
            {isLoadingFriends && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={currentColors.primary} />
                <Text style={[styles.loadingText, { color: currentColors.textSecondary }]}>
                  {searchQuery.trim() ? '검색 중...' : '친구 목록을 불러오는 중...'}
                </Text>
              </View>
            )}

            {/* 에러 상태 */}
            {friendsError && (
              <View style={[styles.errorContainer, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                <Text style={[styles.errorText, { color: '#DC2626' }]}>{friendsError}</Text>
              </View>
            )}

            {/* 친구 목록 */}
            {!isLoadingFriends && !friendsError && (
              <View style={[styles.friendsList, { backgroundColor: currentColors.surface }]}>
                {(() => {
                  const filteredUsers = searchQuery.trim() 
                    ? friends.filter(friend => 
                        friend.nickname.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                    : friends;
                  
                  if (filteredUsers.length === 0 && searchQuery.trim()) {
                    return (
                      <View style={styles.emptyState}>
                        <Ionicons 
                          name="search-outline" 
                          size={48} 
                          color={currentColors.textSecondary} 
                        />
                        <Text style={[styles.emptyStateText, { color: currentColors.textSecondary }]}>
                          검색 결과가 없습니다
                        </Text>
                      </View>
                    );
                  }

                  return filteredUsers.map((friend) => {
                    const isSelected = selectedAttendees.some(a => a.employee_id === friend.employee_id);
                    return (
                      <TouchableOpacity
                        key={friend.employee_id}
                        style={[
                          styles.friendItem,
                          { borderBottomColor: currentColors.border },
                          isSelected && { backgroundColor: currentColors.primaryLight }
                        ]}
                        onPress={() => !isSelected ? addAttendee(friend) : removeAttendee(friend.employee_id)}
                      >
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
                        {isSelected && (
                          <Ionicons 
                            name="checkmark-circle" 
                            size={24} 
                            color={currentColors.primary} 
                          />
                        )}
                      </TouchableOpacity>
                    );
                  });
                })()}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* 하단 버튼 */}
      <View style={[styles.bottomContainer, { backgroundColor: currentColors.surface, borderTopColor: currentColors.border }]}>
        <TouchableOpacity
          style={[
            styles.createButton,
            { 
              backgroundColor: currentColors.primary,
              opacity: isLoading || selectedAttendees.length === 0 ? 0.6 : 1
            }
          ]}
          onPress={handleCreateChat}
          disabled={isLoading || selectedAttendees.length === 0}
        >
          <Text style={[styles.createButtonText, { color: currentColors.surface }]}>
            {isLoading ? '생성 중...' : `채팅방 만들기 (${selectedAttendees.length}명)`}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  content: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  selectedAttendeesSection: {
    marginBottom: 24,
  },
  selectedAttendeesScroll: {
    paddingRight: 16,
  },
  attendeeCard: {
    alignItems: 'center',
    marginRight: 12,
    minWidth: 60,
    position: 'relative',
  },
  attendeeAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  attendeeAvatarText: {
    fontSize: 18,
    fontWeight: '600',
  },
  removeButton: {
    position: 'absolute',
    top: 0,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  attendeeName: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  searchSection: {
    marginBottom: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginRight: 8,
  },
  frequentFriendsSection: {
    marginBottom: 24,
  },
  frequentFriendsScroll: {
    paddingRight: 16,
  },
  frequentFriendButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  frequentFriendText: {
    fontSize: 14,
    fontWeight: '500',
  },
  friendsSection: {
    marginBottom: 24,
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
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  bottomContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  createButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CreateChatRoomScreen;
