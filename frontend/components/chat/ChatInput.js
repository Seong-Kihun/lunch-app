/**
 * 채팅 입력 컴포넌트
 * 메시지 입력 및 전송 기능을 제공합니다.
 */

import React, { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../common/Colors';

const { width } = Dimensions.get('window');

const ChatInput = forwardRef(({
  value,
  onChangeText,
  onSendPress,
  onEmojiPress,
  onAttachmentPress,
  isEditing,
  onCancelEdit,
  placeholder = '메시지를 입력하세요...',
  disabled = false
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const [inputHeight, setInputHeight] = useState(40);
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);
  
  const inputRef = useRef(null);
  const attachmentAnimation = useRef(new Animated.Value(0)).current;

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

  // Ref 메서드 노출
  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    blur: () => inputRef.current?.blur(),
    clear: () => {
      onChangeText('');
      inputRef.current?.clear();
    }
  }));

  // 입력 높이 조정
  const handleContentSizeChange = (event) => {
    const newHeight = Math.min(Math.max(event.nativeEvent.contentSize.height, 40), 120);
    setInputHeight(newHeight);
  };

  // 전송 버튼 활성화 여부
  const canSend = value.trim().length > 0 && !disabled;

  // 첨부파일 옵션 토글
  const toggleAttachmentOptions = () => {
    const toValue = showAttachmentOptions ? 0 : 1;
    Animated.timing(attachmentAnimation, {
      toValue,
      duration: 200,
      useNativeDriver: false,
    }).start();
    setShowAttachmentOptions(!showAttachmentOptions);
  };

  // 첨부파일 옵션 렌더링
  const renderAttachmentOptions = () => {
    if (!showAttachmentOptions) return null;

    return (
      <Animated.View
        style={[
          styles.attachmentOptions,
          {
            opacity: attachmentAnimation,
            transform: [{
              translateY: attachmentAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              })
            }]
          }
        ]}
      >
        <TouchableOpacity
          style={styles.attachmentOption}
          onPress={() => {
            onAttachmentPress?.('camera');
            setShowAttachmentOptions(false);
          }}
        >
          <Ionicons name="camera" size={24} color={currentColors.primary} />
          <Text style={[styles.attachmentOptionText, { color: currentColors.text }]}>카메라</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.attachmentOption}
          onPress={() => {
            onAttachmentPress?.('gallery');
            setShowAttachmentOptions(false);
          }}
        >
          <Ionicons name="images" size={24} color={currentColors.primary} />
          <Text style={[styles.attachmentOptionText, { color: currentColors.text }]}>갤러리</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.attachmentOption}
          onPress={() => {
            onAttachmentPress?.('file');
            setShowAttachmentOptions(false);
          }}
        >
          <Ionicons name="attach" size={24} color={currentColors.primary} />
          <Text style={[styles.attachmentOptionText, { color: currentColors.text }]}>파일</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.attachmentOption}
          onPress={() => {
            onAttachmentPress?.('location');
            setShowAttachmentOptions(false);
          }}
        >
          <Ionicons name="location" size={24} color={currentColors.primary} />
          <Text style={[styles.attachmentOptionText, { color: currentColors.text }]}>위치</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: currentColors.surface }]}>
      {/* 첨부파일 옵션 */}
      {renderAttachmentOptions()}
      
      {/* 입력 영역 */}
      <View style={[
        styles.inputContainer,
        { backgroundColor: currentColors.surface, borderColor: currentColors.border },
        isFocused && { borderColor: currentColors.primary },
        isEditing && { borderColor: currentColors.primary }
      ]}>
        {/* 수정 모드 표시 */}
        {isEditing && (
          <View style={[styles.editIndicator, { backgroundColor: currentColors.primaryLight }]}>
            <Ionicons name="create" size={16} color={currentColors.primary} />
            <Text style={[styles.editText, { color: currentColors.primary }]}>수정 중</Text>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancelEdit}
            >
              <Ionicons name="close" size={16} color={currentColors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* 메인 입력 영역 */}
        <View style={styles.inputRow}>
          {/* 첨부파일 버튼 */}
          <TouchableOpacity
            style={styles.attachmentButton}
            onPress={toggleAttachmentOptions}
            disabled={disabled}
          >
            <Ionicons 
              name="add" 
              size={24} 
              color={disabled ? currentColors.lightGray : currentColors.primary} 
            />
          </TouchableOpacity>

          {/* 텍스트 입력 */}
          <TextInput
            ref={inputRef}
            style={[
              styles.textInput,
              { height: inputHeight, color: currentColors.text }
            ]}
            value={value}
            onChangeText={onChangeText}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onContentSizeChange={handleContentSizeChange}
            placeholder={placeholder}
            placeholderTextColor={currentColors.textSecondary}
            multiline
            maxLength={1000}
            editable={!disabled}
            returnKeyType="default"
            blurOnSubmit={false}
          />

          {/* 이모지 버튼 */}
          <TouchableOpacity
            style={styles.emojiButton}
            onPress={onEmojiPress}
            disabled={disabled}
          >
            <Ionicons 
              name="happy" 
              size={24} 
              color={disabled ? currentColors.lightGray : currentColors.primary} 
            />
          </TouchableOpacity>

          {/* 전송 버튼 */}
          <TouchableOpacity
            style={[
              styles.sendButton,
              { backgroundColor: currentColors.primary },
              !canSend && { backgroundColor: currentColors.lightGray }
            ]}
            onPress={onSendPress}
            disabled={!canSend}
          >
            <Ionicons 
              name="send" 
              size={20} 
              color={canSend ? currentColors.surface : currentColors.textSecondary} 
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(59, 130, 246, 0.1)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  attachmentOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  attachmentOption: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  attachmentOptionText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  inputContainer: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  inputContainerFocused: {
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  inputContainerEditing: {
    borderColor: '#3B82F6',
  },
  editIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 4,
  },
  editText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '600',
  },
  cancelButton: {
    marginLeft: 'auto',
    padding: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  attachmentButton: {
    padding: 8,
    marginRight: 4,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 8,
    paddingVertical: 8,
    maxHeight: 120,
    minHeight: 40,
  },
  emojiButton: {
    padding: 8,
    marginLeft: 4,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  sendButtonActive: {
    backgroundColor: '#3B82F6',
  },
  sendButtonInactive: {
    backgroundColor: '#D1D5DB',
  },
});

export default ChatInput;
