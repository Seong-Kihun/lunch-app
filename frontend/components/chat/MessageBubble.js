/**
 * 메시지 버블 컴포넌트
 * 개별 메시지를 표시하는 컴포넌트입니다.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../common/Colors';

const { width } = Dimensions.get('window');
const MAX_WIDTH = width * 0.75;

const MessageBubble = ({
  message,
  isMyMessage,
  showAvatar,
  onLongPress,
  onReactionPress,
  onMarkAsRead,
  isUserOnline
}) => {
  const [showReactions, setShowReactions] = useState(false);
  const [reactions, setReactions] = useState({});

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

  // 메시지 시간 포맷팅
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
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  // 메시지 타입에 따른 렌더링
  const renderMessageContent = () => {
    if (message.is_deleted) {
      return (
        <View style={styles.deletedMessage}>
          <Icon name="delete" size={16} color={Colors.gray} />
          <Text style={styles.deletedText}>삭제된 메시지입니다</Text>
        </View>
      );
    }

    switch (message.message_type) {
      case 'image':
        return (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: message.message }}
              style={styles.messageImage}
              resizeMode="cover"
            />
            {message.caption && (
              <Text style={styles.imageCaption}>{message.caption}</Text>
            )}
          </View>
        );
      
      case 'file':
        return (
          <View style={styles.fileContainer}>
            <Icon name="attach-file" size={24} color={Colors.primary} />
            <View style={styles.fileInfo}>
              <Text style={styles.fileName}>{message.file_name}</Text>
              <Text style={styles.fileSize}>{message.file_size}</Text>
            </View>
          </View>
        );
      
      case 'system':
        return (
          <View style={styles.systemMessage}>
            <Text style={styles.systemText}>{message.message}</Text>
          </View>
        );
      
      default:
        return (
          <Text style={[
            styles.messageText,
            isMyMessage ? styles.myMessageText : styles.otherMessageText,
            isMyMessage ? { color: currentColors.surface } : { color: currentColors.text }
          ]}>
            {message.message}
          </Text>
        );
    }
  };

  // 반응 버튼 렌더링
  const renderReactionButton = () => {
    const reactionCount = Object.values(reactions).reduce((sum, count) => sum + count, 0);
    
    if (reactionCount === 0) return null;

    return (
      <TouchableOpacity
        style={styles.reactionButton}
        onPress={() => setShowReactions(!showReactions)}
      >
        <Text style={styles.reactionCount}>{reactionCount}</Text>
      </TouchableOpacity>
    );
  };

  // 수정 표시 렌더링
  const renderEditIndicator = () => {
    if (!message.is_edited) return null;

    return (
      <View style={styles.editIndicator}>
        <Icon name="edit" size={12} color={Colors.gray} />
        <Text style={styles.editText}>수정됨</Text>
      </View>
    );
  };

  // 읽음 상태 렌더링
  const renderReadStatus = () => {
    if (!isMyMessage || !message.read_count) return null;

    return (
      <View style={styles.readStatus}>
        <Icon 
          name={message.read_count > 0 ? "done-all" : "done"} 
          size={16} 
          color={message.read_count > 0 ? Colors.primary : Colors.gray} 
        />
        {message.read_count > 0 && (
          <Text style={styles.readCount}>{message.read_count}</Text>
        )}
      </View>
    );
  };

  return (
    <View style={[
      styles.messageContainer,
      isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer
    ]}>
      {/* 아바타 */}
      {!isMyMessage && showAvatar && (
        <View style={styles.avatarContainer}>
          <View style={[
            styles.avatar,
            { backgroundColor: currentColors.primaryLight },
            isUserOnline && styles.onlineAvatar
          ]}>
            <Text style={[styles.avatarText, { color: currentColors.primary }]}>
              {message.sender_nickname?.charAt(0) || '?'}
            </Text>
          </View>
          {isUserOnline && <View style={[styles.onlineIndicator, { backgroundColor: currentColors.success }]} />}
        </View>
      )}

      {/* 메시지 내용 */}
      <View style={[
        styles.messageBubble,
        isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
        isMyMessage ? { backgroundColor: currentColors.primary } : { backgroundColor: currentColors.surface }
      ]}>
        {/* 발신자 이름 */}
        {!isMyMessage && showAvatar && (
          <Text style={[styles.senderName, { color: currentColors.textSecondary }]}>{message.sender_nickname}</Text>
        )}

        {/* 메시지 내용 */}
        <TouchableOpacity
          onLongPress={() => onLongPress(message)}
          onPress={() => onMarkAsRead(message.id)}
          activeOpacity={0.7}
        >
          {renderMessageContent()}
        </TouchableOpacity>

        {/* 반응 버튼 */}
        {renderReactionButton()}

        {/* 메시지 정보 */}
        <View style={styles.messageInfo}>
          <Text style={[
            styles.messageTime,
            isMyMessage ? { color: currentColors.surface } : { color: currentColors.textSecondary }
          ]}>
            {formatTime(message.created_at)}
          </Text>
          {renderEditIndicator()}
          {renderReadStatus()}
        </View>
      </View>

      {/* 반응 모달 */}
      {showReactions && (
        <View style={styles.reactionsContainer}>
          <TouchableOpacity
            style={styles.reactionItem}
            onPress={() => onReactionPress('like')}
          >
            <Text style={styles.reactionEmoji}>👍</Text>
            <Text style={styles.reactionCount}>{reactions.like || 0}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.reactionItem}
            onPress={() => onReactionPress('heart')}
          >
            <Text style={styles.reactionEmoji}>❤️</Text>
            <Text style={styles.reactionCount}>{reactions.heart || 0}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.reactionItem}
            onPress={() => onReactionPress('laugh')}
          >
            <Text style={styles.reactionEmoji}>😂</Text>
            <Text style={styles.reactionCount}>{reactions.laugh || 0}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 2,
    paddingHorizontal: 16,
  },
  myMessageContainer: {
    justifyContent: 'flex-end',
  },
  otherMessageContainer: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 8,
    marginTop: 4,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineAvatar: {
    borderWidth: 2,
    borderColor: Colors.success,
  },
  avatarText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  messageBubble: {
    maxWidth: MAX_WIDTH,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  myMessageBubble: {
    borderBottomRightRadius: 6,
  },
  otherMessageBubble: {
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.1)',
  },
  senderName: {
    fontSize: 12,
    marginBottom: 6,
    fontWeight: '600',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400',
  },
  myMessageText: {
    // 색상은 동적으로 적용
  },
  otherMessageText: {
    // 색상은 동적으로 적용
  },
  deletedMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    opacity: 0.6,
  },
  deletedText: {
    fontSize: 14,
    color: Colors.gray,
    marginLeft: 4,
    fontStyle: 'italic',
  },
  imageContainer: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
  },
  imageCaption: {
    fontSize: 14,
    color: Colors.gray,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  fileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: Colors.lightGray,
    borderRadius: 8,
  },
  fileInfo: {
    marginLeft: 8,
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  fileSize: {
    fontSize: 12,
    color: Colors.gray,
    marginTop: 2,
  },
  systemMessage: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  systemText: {
    fontSize: 12,
    color: Colors.gray,
    fontStyle: 'italic',
  },
  messageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
    color: Colors.gray,
  },
  editIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  editText: {
    fontSize: 10,
    color: Colors.gray,
    marginLeft: 2,
  },
  readStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  readCount: {
    fontSize: 10,
    color: Colors.primary,
    marginLeft: 2,
  },
  reactionButton: {
    position: 'absolute',
    top: -8,
    right: 8,
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  reactionCount: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  reactionsContainer: {
    position: 'absolute',
    top: -40,
    right: 0,
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  reactionEmoji: {
    fontSize: 16,
  },
});

export default MessageBubble;
