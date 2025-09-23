/**
 * 채팅 목록 컴포넌트
 * 사용자가 참여한 채팅방 목록을 표시합니다.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../common/Colors';

const ChatList = ({ 
  navigation,
  userId,
  onRefresh,
  isLoading = false
}) => {
  const [chats, setChats] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  
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

  // 채팅 목록 데이터 (실제로는 API에서 가져와야 함)
  useEffect(() => {
    loadChats();
  }, []);

  const loadChats = async () => {
    try {
      if (!userId) {
        console.log('⚠️ 사용자 ID가 없어서 채팅 목록을 가져올 수 없습니다');
        return;
      }

      console.log('💬 채팅 목록 조회 시작:', userId);
      
      const serverUrl = process.env.EXPO_PUBLIC_RENDER_SERVER_URL || 'http://172.30.1.43:5000';
      
      // 채팅방 목록 API 사용 (개발용 - 실제 데이터베이스에서 조회)
      const response = await fetch(`${serverUrl}/api/chats/${userId}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📊 백엔드 응답 데이터:', data);
      
      // API 응답 데이터를 UI에 맞게 변환
      let chatRooms = [];
      
      if (Array.isArray(data)) {
        // 백엔드에서 배열로 직접 반환하는 경우 (기본)
        chatRooms = data.map(chat => ({
          id: chat.id,
          chat_id: chat.id,
          chat_type: chat.type || 'group',
          type: chat.type || 'group',
          name: chat.title || '채팅방',
          title: chat.title || '채팅방',
          last_message: chat.last_message || '메시지가 없습니다',
          last_message_time: chat.last_message_time,
          unread_count: chat.unread_count || 0,
          members: chat.members || [],
          is_online: chat.is_online || false,
          avatar: chat.avatar || null
        }));
      } else if (data.success && data.chat_rooms) {
        chatRooms = data.chat_rooms.map(chat => ({
          id: chat.chat_id || chat.id,
          chat_id: chat.chat_id || chat.id,
          chat_type: chat.chat_type || chat.type || 'group',
          type: chat.chat_type || chat.type || 'group',
          name: chat.title || chat.name || '채팅방',
          title: chat.title || chat.name || '채팅방',
          last_message: chat.last_message || '메시지가 없습니다',
          last_message_time: chat.last_message_time || chat.updated_at,
          unread_count: chat.unread_count || 0,
          members: chat.members || [],
          is_online: chat.is_online || false,
          avatar: chat.avatar || null
        }));
      } else if (data.chats && Array.isArray(data.chats)) {
        // 백엔드에서 {chats: [...]} 형태로 반환하는 경우
        chatRooms = data.chats;
      } else {
        console.warn('⚠️ 예상하지 못한 데이터 구조:', data);
        chatRooms = [];
      }
      
      setChats(chatRooms);
      console.log('✅ 채팅 목록 로드 완료:', chatRooms.length + '개');
    } catch (error) {
      console.error('채팅 목록 로드 실패:', error);
      setChats([]);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadChats();
      onRefresh?.();
    } catch (error) {
      console.error('새로고침 실패:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleChatPress = (chat) => {
    navigation.navigate('ChatRoom', {
      chatType: chat.chat_type || chat.type,
      chatId: chat.chat_id || chat.id,
      chatTitle: chat.name || chat.title,
      userId: userId,
      userNickname: '사용자' // 실제 사용자 닉네임으로 대체
    });
  };

  const handleLongPress = (chat) => {
    Alert.alert(
      chat.name,
      '채팅방 옵션을 선택하세요.',
      [
        {
          text: '채팅방 설정',
          onPress: () => {
            navigation.navigate('ChatSettings', {
              chatType: chat.chat_type,
              chatId: chat.chat_id,
              chatName: chat.name
            });
          }
        },
        {
          text: '채팅방 나가기',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              '채팅방 나가기',
              '정말로 이 채팅방을 나가시겠습니까?',
              [
                { text: '취소', style: 'cancel' },
                { text: '나가기', style: 'destructive', onPress: () => {
                  // TODO: 채팅방 나가기 API 호출
                  console.log('채팅방 나가기:', chat.id);
                }}
              ]
            );
          }
        },
        { text: '취소', style: 'cancel' }
      ]
    );
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) { // 1분 미만
      return '방금 전';
    } else if (diff < 3600000) { // 1시간 미만
      return `${Math.floor(diff / 60000)}분 전`;
    } else if (diff < 86400000) { // 1일 미만
      return `${Math.floor(diff / 3600000)}시간 전`;
    } else {
      return date.toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const getChatIcon = (chatType) => {
    switch (chatType) {
      case 'party':
        return 'restaurant';
      case 'dangolpot':
        return 'people';
      case 'custom':
        return 'person';
      default:
        return 'chatbubbles';
    }
  };

  const getChatTypeLabel = (chatType) => {
    switch (chatType) {
      case 'party':
        return '점심파티';
      case 'dangolpot':
        return '단골파티';
      case 'custom':
        return '개인채팅';
      default:
        return '채팅';
    }
  };

  const renderChatItem = ({ item }) => {
    if (!item) return null;
    
    return (
      <TouchableOpacity
        style={[styles.chatItem, { backgroundColor: currentColors.surface }]}
        onPress={() => handleChatPress(item)}
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.7}
      >
        {/* 채팅방 아바타 */}
        <View style={styles.avatarContainer}>
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.defaultAvatar, { backgroundColor: currentColors.primaryLight }]}>
              <Ionicons 
                name={getChatIcon(item.chat_type || item.type)} 
                size={24} 
                color={currentColors.primary} 
              />
            </View>
          )}
          {item.is_online && <View style={[styles.onlineIndicator, { backgroundColor: currentColors.success }]} />}
        </View>

        {/* 채팅방 정보 */}
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={[styles.chatName, { color: currentColors.text }]} numberOfLines={1}>
              {item.name || item.title}
            </Text>
            <Text style={[styles.lastMessageTime, { color: currentColors.textSecondary }]}>
              {formatTime(item.last_message_time)}
            </Text>
          </View>
          
          <View style={styles.chatSubInfo}>
            <Text style={[styles.chatType, { color: currentColors.textSecondary }]}>
              {getChatTypeLabel(item.chat_type || item.type)}
            </Text>
            {item.unread_count > 0 && (
              <View style={[styles.unreadBadge, { backgroundColor: currentColors.primary }]}>
                <Text style={[styles.unreadCount, { color: currentColors.surface }]}>
                  {item.unread_count > 99 ? '99+' : item.unread_count}
                </Text>
              </View>
            )}
          </View>
          
          <Text style={[styles.lastMessage, { color: currentColors.textSecondary }]} numberOfLines={1}>
            {item.last_message}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubbles-outline" size={64} color={currentColors.lightGray} />
      <Text style={[styles.emptyStateTitle, { color: currentColors.text }]}>채팅이 없습니다</Text>
      <Text style={[styles.emptyStateText, { color: currentColors.textSecondary }]}>
        새로운 채팅방에 참여하거나{'\n'}채팅을 시작해보세요!
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background }]}>
      <FlatList
        data={chats || []}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderChatItem}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[currentColors.primary]}
            tintColor={currentColors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100, // 플로팅 버튼을 위한 하단 여백
  },
  chatItem: {
    flexDirection: 'row',
    padding: 20,
    marginBottom: 12,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.1)',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  defaultAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  lastMessageTime: {
    fontSize: 12,
    fontWeight: '500',
  },
  chatSubInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  chatType: {
    fontSize: 12,
    fontWeight: '500',
  },
  lastMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  unreadBadge: {
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  membersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  membersText: {
    fontSize: 12,
    marginLeft: 4
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ChatList;
