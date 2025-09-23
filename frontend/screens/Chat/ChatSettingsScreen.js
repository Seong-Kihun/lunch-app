/**
 * 채팅방 설정 화면
 * 채팅방 정보, 멤버 관리, 알림 설정 등을 제공합니다.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  SafeAreaView,
  Image,
  TextInput,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ChatSettingsScreen = ({ navigation, route }) => {
  const { chatType, chatId, chatName } = route.params;
  
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
  const [chatInfo, setChatInfo] = useState({
    name: chatName || '채팅방',
    description: '',
    memberCount: 0,
    isPublic: false,
    allowInvite: true
  });
  const [members, setMembers] = useState([]);
  const [notifications, setNotifications] = useState({
    message: true,
    mention: true,
    reaction: false,
    file: true
  });
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newName, setNewName] = useState(chatName || '');

  // 채팅방 정보 로드
  useEffect(() => {
    loadChatInfo();
    loadMembers();
  }, []);

  const loadChatInfo = async () => {
    try {
      // TODO: 실제 API 호출
      console.log('채팅방 정보 로드:', chatId);
    } catch (error) {
      console.error('채팅방 정보 로드 실패:', error);
    }
  };

  const loadMembers = async () => {
    try {
      // TODO: 실제 API 호출
      console.log('멤버 목록 로드:', chatId);
    } catch (error) {
      console.error('멤버 목록 로드 실패:', error);
    }
  };

  const handleRename = () => {
    if (newName.trim()) {
      setChatInfo(prev => ({ ...prev, name: newName.trim() }));
      setShowRenameModal(false);
      // TODO: API 호출로 서버에 반영
    }
  };

  const handleLeaveChat = () => {
    Alert.alert(
      '채팅방 나가기',
      '정말로 이 채팅방을 나가시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '나가기', 
          style: 'destructive',
          onPress: () => {
            // TODO: 채팅방 나가기 API 호출
            navigation.goBack();
          }
        }
      ]
    );
  };

  const handleDeleteChat = () => {
    Alert.alert(
      '채팅방 삭제',
      '채팅방을 삭제하면 모든 메시지와 멤버가 제거됩니다. 정말로 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '삭제', 
          style: 'destructive',
          onPress: () => {
            // TODO: 채팅방 삭제 API 호출
            navigation.goBack();
          }
        }
      ]
    );
  };

  const renderSettingItem = (icon, title, subtitle, onPress, rightComponent) => (
    <TouchableOpacity
      style={[styles.settingItem, { backgroundColor: currentColors.surface }]}
      onPress={onPress}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.settingIcon, { backgroundColor: currentColors.primaryLight }]}>
          <Ionicons name={icon} size={20} color={currentColors.primary} />
        </View>
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, { color: currentColors.text }]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.settingSubtitle, { color: currentColors.textSecondary }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {rightComponent || (
        <Ionicons name="chevron-forward" size={20} color={currentColors.textSecondary} />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background }]}>
      <ScrollView style={styles.scrollView}>
        {/* 채팅방 정보 */}
        <View style={[styles.section, { backgroundColor: currentColors.surface }]}>
          <View style={styles.chatInfo}>
            <View style={[styles.chatAvatar, { backgroundColor: currentColors.primaryLight }]}>
              <Ionicons 
                name={chatType === 'party' ? 'restaurant' : chatType === 'dangolpot' ? 'people' : 'person'} 
                size={32} 
                color={currentColors.primary} 
              />
            </View>
            <View style={styles.chatDetails}>
              <Text style={[styles.chatName, { color: currentColors.text }]}>
                {chatInfo.name}
              </Text>
              <Text style={[styles.chatDescription, { color: currentColors.textSecondary }]}>
                {chatInfo.description || '설명이 없습니다'}
              </Text>
            </View>
          </View>
        </View>

        {/* 채팅방 설정 */}
        <View style={[styles.section, { backgroundColor: currentColors.surface }]}>
          <Text style={[styles.sectionTitle, { color: currentColors.text }]}>채팅방 설정</Text>
          
          {renderSettingItem(
            'create',
            '채팅방 이름 변경',
            chatInfo.name,
            () => setShowRenameModal(true)
          )}
          
          {renderSettingItem(
            'people',
            '멤버 관리',
            `${chatInfo.memberCount}명`,
            () => navigation.navigate('ChatMembers', { chatId, chatType })
          )}
          
          {renderSettingItem(
            'notifications',
            '알림 설정',
            '알림 옵션 관리',
            () => navigation.navigate('ChatNotifications', { chatId, chatType })
          )}
        </View>

        {/* 위험한 작업 */}
        <View style={[styles.section, { backgroundColor: currentColors.surface }]}>
          <Text style={[styles.sectionTitle, { color: currentColors.text }]}>위험한 작업</Text>
          
          {renderSettingItem(
            'exit',
            '채팅방 나가기',
            '채팅방에서 나갑니다',
            handleLeaveChat,
            <Ionicons name="exit" size={20} color={currentColors.error} />
          )}
          
          {renderSettingItem(
            'trash',
            '채팅방 삭제',
            '채팅방을 완전히 삭제합니다',
            handleDeleteChat,
            <Ionicons name="trash" size={20} color={currentColors.error} />
          )}
        </View>
      </ScrollView>

      {/* 이름 변경 모달 */}
      <Modal
        visible={showRenameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRenameModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentColors.surface }]}>
            <Text style={[styles.modalTitle, { color: currentColors.text }]}>
              채팅방 이름 변경
            </Text>
            <TextInput
              style={[styles.modalInput, { 
                borderColor: currentColors.border,
                color: currentColors.text
              }]}
              value={newName}
              onChangeText={setNewName}
              placeholder="채팅방 이름을 입력하세요"
              placeholderTextColor={currentColors.textSecondary}
              maxLength={50}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: currentColors.lightGray }]}
                onPress={() => setShowRenameModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: currentColors.text }]}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: currentColors.primary }]}
                onPress={handleRename}
              >
                <Text style={[styles.modalButtonText, { color: currentColors.surface }]}>확인</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  section: {
    borderRadius: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.1)',
  },
  chatInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  chatAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  chatDetails: {
    flex: 1,
  },
  chatName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  chatDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59, 130, 246, 0.1)',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default ChatSettingsScreen;









