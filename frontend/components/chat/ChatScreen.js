/**
 * 채팅 화면 컴포넌트
 * 실시간 채팅 기능을 제공하는 메인 화면입니다.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import useChat from '../../hooks/useChat';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import ChatHeader from './ChatHeader';
import ChatInput from './ChatInput';
import ReactionModal from './ReactionModal';
import Colors from '../common/Colors';

const { width, height } = Dimensions.get('window');

const ChatScreen = ({ 
  route, 
  navigation 
}) => {
  const { 
    chatType, 
    chatId, 
    chatName, 
    userId, 
    userNickname 
  } = route.params;

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

  // 채팅 훅 사용
  const {
    messages,
    isConnected,
    typingUsers,
    onlineUsers,
    unreadCount,
    isLoading,
    error,
    sendMessage,
    markMessageAsRead,
    toggleMessageReaction,
    editMessage,
    deleteMessage,
    handleTyping,
    clearUnreadCount,
    isUserOnline,
    getTypingText
  } = useChat(chatType, chatId, userId, userNickname);

  // 로컬 상태
  const [inputText, setInputText] = useState('');
  const [showReactionModal, setShowReactionModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Refs
  const flatListRef = useRef(null);
  const inputRef = useRef(null);

  // 컴포넌트 마운트 시 읽지 않은 메시지 수 초기화
  useEffect(() => {
    clearUnreadCount();
  }, []);

  // 메시지 목록이 업데이트될 때마다 스크롤을 맨 아래로
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // 메시지 전송
  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    if (isEditing && editingMessageId) {
      // 메시지 수정
      editMessage(editingMessageId, inputText.trim());
      setIsEditing(false);
      setEditingMessageId(null);
    } else {
      // 새 메시지 전송
      sendMessage(inputText.trim());
    }

    setInputText('');
    inputRef.current?.blur();
  };

  // 메시지 길게 누르기 (수정/삭제 메뉴)
  const handleLongPress = (message) => {
    if (message.sender_employee_id !== userId) return;

    Alert.alert(
      '메시지 옵션',
      '수정하거나 삭제할 수 있습니다.',
      [
        {
          text: '수정',
          onPress: () => {
            setIsEditing(true);
            setEditingMessageId(message.id);
            setInputText(message.message);
            inputRef.current?.focus();
          }
        },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              '메시지 삭제',
              '정말로 이 메시지를 삭제하시겠습니까?',
              [
                { text: '취소', style: 'cancel' },
                {
                  text: '삭제',
                  style: 'destructive',
                  onPress: () => deleteMessage(message.id)
                }
              ]
            );
          }
        },
        { text: '취소', style: 'cancel' }
      ]
    );
  };

  // 반응 추가
  const handleAddReaction = (messageId, reactionType) => {
    toggleMessageReaction(messageId, reactionType);
    setShowReactionModal(false);
    setSelectedMessage(null);
  };

  // 반응 모달 열기
  const handleReactionPress = (message) => {
    setSelectedMessage(message);
    setShowReactionModal(true);
  };

  // 메시지 렌더링
  const renderMessage = ({ item, index }) => {
    const isMyMessage = item.sender_employee_id === userId;
    const showAvatar = index === 0 || 
      messages[index - 1]?.sender_employee_id !== item.sender_employee_id;

    return (
      <MessageBubble
        message={item}
        isMyMessage={isMyMessage}
        showAvatar={showAvatar}
        onLongPress={() => handleLongPress(item)}
        onReactionPress={() => handleReactionPress(item)}
        onMarkAsRead={() => markMessageAsRead(item.id)}
        isUserOnline={isUserOnline(item.sender_employee_id)}
      />
    );
  };

  // 빈 상태 렌더링
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubbles" size={64} color={Colors.gray} />
      <Text style={styles.emptyStateText}>
        아직 메시지가 없습니다.{'\n'}첫 번째 메시지를 보내보세요!
      </Text>
    </View>
  );

  // 로딩 상태 렌더링
  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.loadingText}>메시지를 불러오는 중...</Text>
    </View>
  );

  // 에러 상태 렌더링
  const renderError = () => (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle" size={48} color={Colors.error} />
      <Text style={styles.errorText}>
        연결에 문제가 있습니다.{'\n'}잠시 후 다시 시도해주세요.
      </Text>
      <TouchableOpacity 
        style={styles.retryButton}
        onPress={() => window.location.reload()}
      >
        <Text style={styles.retryButtonText}>다시 시도</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background }]}>
      {/* 통일된 채팅 헤더 */}
      <View style={[styles.chatHeader, { backgroundColor: currentColors.surface }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={currentColors.text} />
        </TouchableOpacity>
        
        <View style={styles.chatInfo}>
          <View style={[styles.chatIcon, { backgroundColor: currentColors.primaryLight }]}>
            <Ionicons 
              name={chatType === 'party' ? 'restaurant' : chatType === 'dangolpot' ? 'people' : 'person'} 
              size={20} 
              color={currentColors.primary} 
            />
          </View>
          <View style={styles.chatDetails}>
            <Text style={[styles.chatTitle, { color: currentColors.text }]} numberOfLines={1}>
              {chatName || '채팅방'}
            </Text>
            <View style={styles.statusRow}>
              <View style={[
                styles.statusDot,
                { backgroundColor: isConnected ? currentColors.success : currentColors.error }
              ]} />
              <Text style={[styles.statusText, { color: currentColors.textSecondary }]}>
                {isConnected ? '연결됨' : '연결 끊김'}
              </Text>
              {onlineUsers && onlineUsers.size > 0 && (
                <>
                  <Text style={[styles.statusSeparator, { color: currentColors.lightGray }]}>•</Text>
                  <Text style={[styles.onlineText, { color: currentColors.success }]}>
                    {onlineUsers.size}명 온라인
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('ChatMembers', { chatType, chatId, chatName })}
          >
            <Ionicons name="people" size={20} color={currentColors.text} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('ChatNotifications', { chatType, chatId, chatName })}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={currentColors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 메시지 목록 */}
      <View style={styles.messagesContainer}>
        {isLoading ? (
          renderLoading()
        ) : error ? (
          renderError()
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderMessage}
            ListEmptyComponent={renderEmptyState}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }}
          />
        )}

        {/* 타이핑 인디케이터 */}
        {typingUsers.length > 0 && (
          <TypingIndicator
            typingText={getTypingText()}
            typingUsers={typingUsers}
          />
        )}
      </View>

      {/* 채팅 입력 */}
      <ChatInput
        ref={inputRef}
        value={inputText}
        onChangeText={(text) => {
          setInputText(text);
          handleTyping(text);
        }}
        onSendPress={handleSendMessage}
        onEmojiPress={() => setShowEmojiPicker(!showEmojiPicker)}
        onAttachmentPress={() => {
          // 파일 첨부 기능
          navigation.navigate('FilePicker', {
            chatType,
            chatId
          });
        }}
        isEditing={isEditing}
        onCancelEdit={() => {
          setIsEditing(false);
          setEditingMessageId(null);
          setInputText('');
        }}
        placeholder={isEditing ? '메시지를 수정하세요...' : '메시지를 입력하세요...'}
      />

      {/* 반응 모달 */}
      <ReactionModal
        visible={showReactionModal}
        onClose={() => setShowReactionModal(false)}
        onReactionSelect={(reactionType) => 
          handleAddReaction(selectedMessage?.id, reactionType)
        }
        message={selectedMessage}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59, 130, 246, 0.1)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  chatInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chatDetails: {
    flex: 1,
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusSeparator: {
    fontSize: 12,
    marginHorizontal: 6,
  },
  onlineText: {
    fontSize: 12,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ChatScreen;
