/**
 * 채팅 헤더 컴포넌트
 * 채팅방 정보와 연결 상태를 표시하는 헤더입니다.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../common/Colors';

const ChatHeader = ({
  chatName,
  chatType,
  chatId,
  isConnected,
  onlineUsers,
  onBackPress,
  onSettingsPress,
  onMembersPress
}) => {
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

  // 채팅방 타입에 따른 아이콘 설정
  const getChatIcon = () => {
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

  // 온라인 사용자 수 계산
  const onlineCount = onlineUsers ? onlineUsers.size : 0;

  return (
    <View style={[styles.container, { backgroundColor: currentColors.surface }]}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={currentColors.surface}
        translucent={false}
      />
      
      <View style={styles.content}>
        {/* 뒤로가기 버튼 */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBackPress}
        >
          <Ionicons name="arrow-back" size={24} color={currentColors.text} />
        </TouchableOpacity>

        {/* 채팅방 정보 */}
        <View style={styles.chatInfo}>
          <View style={[styles.chatIconContainer, { backgroundColor: currentColors.primaryLight }]}>
            <Ionicons 
              name={getChatIcon()} 
              size={20} 
              color={currentColors.primary} 
            />
          </View>
          
          <View style={styles.chatDetails}>
            <Text style={[styles.chatName, { color: currentColors.text }]} numberOfLines={1}>
              {chatName || '채팅방'}
            </Text>
            
            <View style={styles.statusContainer}>
              {/* 연결 상태 */}
              <View style={styles.connectionStatus}>
                <View style={[
                  styles.statusDot,
                  { backgroundColor: isConnected ? currentColors.success : currentColors.error }
                ]} />
                <Text style={[styles.statusText, { color: currentColors.textSecondary }]}>
                  {isConnected ? '연결됨' : '연결 끊김'}
                </Text>
              </View>

              {/* 온라인 사용자 수 */}
              {onlineCount > 0 && (
                <View style={styles.onlineStatus}>
                  <Ionicons name="person" size={12} color={currentColors.success} />
                  <Text style={[styles.onlineText, { color: currentColors.success }]}>
                    {onlineCount}명 온라인
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* 액션 버튼들 */}
        <View style={styles.actionButtons}>
          {/* 멤버 목록 버튼 */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onMembersPress}
          >
            <Ionicons name="people" size={20} color={currentColors.text} />
          </TouchableOpacity>

          {/* 설정 버튼 */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onSettingsPress}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={currentColors.text} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59, 130, 246, 0.1)',
    paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 60,
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
  chatIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chatDetails: {
    flex: 1,
  },
  chatName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  onlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
});

export default ChatHeader;
