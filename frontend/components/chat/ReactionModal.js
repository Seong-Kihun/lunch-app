/**
 * 반응 모달 컴포넌트
 * 메시지에 반응을 추가할 수 있는 모달입니다.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  Animated
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Colors from '../common/Colors';

const { width, height } = Dimensions.get('window');

const ReactionModal = ({
  visible,
  onClose,
  onReactionSelect,
  message
}) => {
  const reactions = [
    { id: 'like', emoji: '👍', name: '좋아요' },
    { id: 'heart', emoji: '❤️', name: '하트' },
    { id: 'laugh', emoji: '😂', name: '웃음' },
    { id: 'wow', emoji: '😮', name: '놀람' },
    { id: 'sad', emoji: '😢', name: '슬픔' },
    { id: 'angry', emoji: '😠', name: '화남' },
    { id: 'thumbs_up', emoji: '👍', name: '엄지척' },
    { id: 'thumbs_down', emoji: '👎', name: '엄지내림' },
    { id: 'clap', emoji: '👏', name: '박수' },
    { id: 'fire', emoji: '🔥', name: '불꽃' },
    { id: 'star', emoji: '⭐', name: '별' },
    { id: 'check', emoji: '✅', name: '체크' }
  ];

  const handleReactionPress = (reactionId) => {
    onReactionSelect(reactionId);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        
        <View style={styles.modalContainer}>
          {/* 메시지 미리보기 */}
          {message && (
            <View style={styles.messagePreview}>
              <Text style={styles.messageText} numberOfLines={2}>
                {message.message}
              </Text>
            </View>
          )}

          {/* 반응 그리드 */}
          <View style={styles.reactionsGrid}>
            {reactions.map((reaction) => (
              <TouchableOpacity
                key={reaction.id}
                style={styles.reactionButton}
                onPress={() => handleReactionPress(reaction.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.reactionEmoji}>
                  {reaction.emoji}
                </Text>
                <Text style={styles.reactionName}>
                  {reaction.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 닫기 버튼 */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <MaterialIcons name="close" size={24} color={Colors.gray} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    maxWidth: width * 0.9,
    maxHeight: height * 0.6,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  messagePreview: {
    backgroundColor: Colors.lightGray,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  messageText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  reactionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  reactionButton: {
    width: (width * 0.9 - 60) / 4,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 8,
    borderRadius: 8,
  },
  reactionEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  reactionName: {
    fontSize: 10,
    color: Colors.gray,
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 8,
  },
});

export default ReactionModal;
