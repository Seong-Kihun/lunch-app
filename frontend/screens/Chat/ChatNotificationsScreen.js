import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ChatNotificationsScreen = ({ route, navigation }) => {
  const { chatId, chatType, chatName } = route.params;
  const [settings, setSettings] = useState({
    pushNotifications: true,
    soundEnabled: true,
    vibrationEnabled: true,
    mentionOnly: false,
    quietHours: false,
    quietStart: '22:00',
    quietEnd: '08:00',
  });
  const [loading, setLoading] = useState(true);

  const currentColors = global.currentColors || {
    background: '#F1F5F9',
    surface: '#FFFFFF',
    primary: '#3B82F6',
    text: '#000000',
    textSecondary: '#666666',
    success: '#10B981',
    error: '#EF4444',
    border: '#E2E8F0',
  };

  useEffect(() => {
    loadSettings();
  }, [chatId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      // TODO: 실제 API 호출로 교체
      // const response = await fetch(`/dev/chat/rooms/${chatId}/notifications`);
      // const data = await response.json();
      // setSettings(data);
    } catch (error) {
      console.error('알림 설정 로드 실패:', error);
      Alert.alert('오류', '알림 설정을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key, value) => {
    try {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      
      // TODO: 실제 API 호출로 교체
      // await fetch(`/dev/chat/rooms/${chatId}/notifications`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(newSettings),
      // });
    } catch (error) {
      console.error('알림 설정 업데이트 실패:', error);
      Alert.alert('오류', '설정을 저장할 수 없습니다.');
    }
  };

  const renderSettingItem = (title, description, key, value, onValueChange) => (
    <View style={[styles.settingItem, { backgroundColor: currentColors.surface }]}>
      <View style={styles.settingInfo}>
        <Text style={[styles.settingTitle, { color: currentColors.text }]}>
          {title}
        </Text>
        {description && (
          <Text style={[styles.settingDescription, { color: currentColors.textSecondary }]}>
            {description}
          </Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: currentColors.border, true: currentColors.primaryLight }}
        thumbColor={value ? currentColors.primary : currentColors.textSecondary}
      />
    </View>
  );

  const renderTimeSetting = (title, description, key, value) => (
    <View style={[styles.settingItem, { backgroundColor: currentColors.surface }]}>
      <View style={styles.settingInfo}>
        <Text style={[styles.settingTitle, { color: currentColors.text }]}>
          {title}
        </Text>
        {description && (
          <Text style={[styles.settingDescription, { color: currentColors.textSecondary }]}>
            {description}
          </Text>
        )}
      </View>
      <TouchableOpacity style={[styles.timeButton, { borderColor: currentColors.border }]}>
        <Text style={[styles.timeText, { color: currentColors.text }]}>
          {value}
        </Text>
        <Ionicons name="chevron-down" size={16} color={currentColors.textSecondary} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background }]}>
      {/* 헤더 */}
      <View style={[styles.header, { backgroundColor: currentColors.surface }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={currentColors.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: currentColors.text }]}>
            알림 설정
          </Text>
          <Text style={[styles.headerSubtitle, { color: currentColors.textSecondary }]}>
            {chatName}
          </Text>
        </View>
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-vertical" size={20} color={currentColors.text} />
        </TouchableOpacity>
      </View>

      {/* 설정 목록 */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 기본 알림 설정 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: currentColors.text }]}>
            기본 알림
          </Text>
          {renderSettingItem(
            '푸시 알림',
            '새 메시지에 대한 푸시 알림을 받습니다',
            'pushNotifications',
            settings.pushNotifications,
            (value) => updateSetting('pushNotifications', value)
          )}
          {renderSettingItem(
            '소리',
            '알림 소리를 재생합니다',
            'soundEnabled',
            settings.soundEnabled,
            (value) => updateSetting('soundEnabled', value)
          )}
          {renderSettingItem(
            '진동',
            '알림 시 진동을 울립니다',
            'vibrationEnabled',
            settings.vibrationEnabled,
            (value) => updateSetting('vibrationEnabled', value)
          )}
        </View>

        {/* 고급 설정 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: currentColors.text }]}>
            고급 설정
          </Text>
          {renderSettingItem(
            '멘션만 알림',
            '내가 멘션된 메시지만 알림을 받습니다',
            'mentionOnly',
            settings.mentionOnly,
            (value) => updateSetting('mentionOnly', value)
          )}
          {renderSettingItem(
            '방해 금지 시간',
            '설정한 시간 동안 알림을 받지 않습니다',
            'quietHours',
            settings.quietHours,
            (value) => updateSetting('quietHours', value)
          )}
          {settings.quietHours && (
            <>
              {renderTimeSetting(
                '시작 시간',
                '방해 금지 시간 시작',
                'quietStart',
                settings.quietStart
              )}
              {renderTimeSetting(
                '종료 시간',
                '방해 금지 시간 종료',
                'quietEnd',
                settings.quietEnd
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
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
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  moreButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 8,
  },
});

export default ChatNotificationsScreen;









