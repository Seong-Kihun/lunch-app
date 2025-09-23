import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ChatMembersScreen = ({ route, navigation }) => {
  const { chatId, chatType, chatName } = route.params;
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
    loadMembers();
  }, [chatId]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      // TODO: 실제 API 호출로 교체
      // const response = await fetch(`/dev/chat/rooms/${chatId}/members`);
      // const data = await response.json();
      
      // 임시 데이터
      const mockMembers = [
        { id: 1, nickname: '사용자1', role: 'admin', is_online: true },
        { id: 2, nickname: '사용자2', role: 'member', is_online: true },
        { id: 3, nickname: '사용자3', role: 'member', is_online: false },
      ];
      setMembers(mockMembers);
    } catch (error) {
      console.error('멤버 목록 로드 실패:', error);
      Alert.alert('오류', '멤버 목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMembers();
    setRefreshing(false);
  };

  const renderMember = ({ item }) => (
    <View style={[styles.memberItem, { backgroundColor: currentColors.surface }]}>
      <View style={[styles.avatar, { backgroundColor: currentColors.primaryLight }]}>
        <Text style={[styles.avatarText, { color: currentColors.primary }]}>
          {item.nickname?.charAt(0) || '?'}
        </Text>
      </View>
      <View style={styles.memberInfo}>
        <View style={styles.memberHeader}>
          <Text style={[styles.memberName, { color: currentColors.text }]}>
            {item.nickname}
          </Text>
          {item.role === 'admin' && (
            <View style={[styles.adminBadge, { backgroundColor: currentColors.primary }]}>
              <Text style={[styles.adminText, { color: currentColors.surface }]}>관리자</Text>
            </View>
          )}
        </View>
        <View style={styles.memberStatus}>
          <View style={[
            styles.statusDot,
            { backgroundColor: item.is_online ? currentColors.success : currentColors.textSecondary }
          ]} />
          <Text style={[styles.statusText, { color: currentColors.textSecondary }]}>
            {item.is_online ? '온라인' : '오프라인'}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="people-outline" size={64} color={currentColors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: currentColors.text }]}>
        멤버가 없습니다
      </Text>
      <Text style={[styles.emptyText, { color: currentColors.textSecondary }]}>
        채팅방에 멤버가 없습니다.
      </Text>
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
            멤버 ({members.length}명)
          </Text>
          <Text style={[styles.headerSubtitle, { color: currentColors.textSecondary }]}>
            {chatName}
          </Text>
        </View>
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-vertical" size={20} color={currentColors.text} />
        </TouchableOpacity>
      </View>

      {/* 멤버 목록 */}
      <FlatList
        data={members}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderMember}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[currentColors.primary]}
            tintColor={currentColors.primary}
          />
        }
      />
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
  listContainer: {
    padding: 16,
  },
  memberItem: {
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
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  memberInfo: {
    flex: 1,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  adminBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  adminText: {
    fontSize: 12,
    fontWeight: '600',
  },
  memberStatus: {
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
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default ChatMembersScreen;









