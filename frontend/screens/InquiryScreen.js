import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

const InquiryScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    category: 'general',
    priority: 'normal'
  });
  const [isLoading, setIsLoading] = useState(false);

  const currentColors = global.currentColors || COLORS.light;

  const categories = [
    { value: 'general', label: '일반문의' },
    { value: 'bug', label: '버그신고' },
    { value: 'feature', label: '기능요청' },
    { value: 'account', label: '계정문의' },
    { value: 'payment', label: '결제문의' },
    { value: 'technical', label: '기술문의' },
    { value: 'other', label: '기타' }
  ];

  const priorities = [
    { value: 'low', label: '낮음' },
    { value: 'normal', label: '보통' },
    { value: 'high', label: '높음' },
    { value: 'urgent', label: '긴급' }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('입력 오류', '이름을 입력해주세요.');
      return false;
    }
    if (!formData.email.trim()) {
      Alert.alert('입력 오류', '이메일을 입력해주세요.');
      return false;
    }
    if (!formData.subject.trim()) {
      Alert.alert('입력 오류', '제목을 입력해주세요.');
      return false;
    }
    if (!formData.message.trim()) {
      Alert.alert('입력 오류', '문의 내용을 입력해주세요.');
      return false;
    }
    if (formData.message.trim().length < 10) {
      Alert.alert('입력 오류', '문의 내용은 최소 10자 이상 입력해주세요.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const response = await fetch('https://lunch-app-backend-ra12.onrender.com/api/inquiries/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (response.ok) {
        Alert.alert(
          '문의사항 등록 완료',
          '문의사항이 성공적으로 등록되었습니다.\n빠른 시일 내에 답변드리겠습니다.',
          [
            {
              text: '확인',
              onPress: () => {
                // 폼 초기화
                setFormData({
                  name: '',
                  email: '',
                  subject: '',
                  message: '',
                  category: 'general',
                  priority: 'normal'
                });
                navigation.goBack();
              }
            }
          ]
        );
      } else {
        Alert.alert('등록 실패', result.error || '문의사항 등록 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('문의사항 등록 오류:', error);
      Alert.alert('오류', '네트워크 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderPicker = (field, options, label) => (
    <View style={styles.pickerContainer}>
      <Text style={[styles.pickerLabel, { color: currentColors.text }]}>{label}</Text>
      <View style={styles.pickerOptions}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.pickerOption,
              {
                backgroundColor: formData[field] === option.value 
                  ? currentColors.primary 
                  : currentColors.surface,
                borderColor: formData[field] === option.value 
                  ? currentColors.primary 
                  : currentColors.border
              }
            ]}
            onPress={() => handleInputChange(field, option.value)}
          >
            <Text
              style={[
                styles.pickerOptionText,
                {
                  color: formData[field] === option.value 
                    ? '#FFFFFF' 
                    : currentColors.text
                }
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* 헤더 */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={currentColors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: currentColors.text }]}>
              문의하기
            </Text>
            <View style={styles.placeholder} />
          </View>

          {/* 안내 메시지 */}
          <View style={[styles.infoCard, { backgroundColor: currentColors.surface }]}>
            <Ionicons name="information-circle" size={24} color={currentColors.primary} />
            <Text style={[styles.infoText, { color: currentColors.text }]}>
              문의사항을 남겨주시면 빠른 시일 내에 답변드리겠습니다.
            </Text>
          </View>

          {/* 폼 */}
          <View style={styles.form}>
            {/* 이름 */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: currentColors.text }]}>
                이름 <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.textInput, { 
                  backgroundColor: currentColors.surface,
                  borderColor: currentColors.border,
                  color: currentColors.text
                }]}
                value={formData.name}
                onChangeText={(text) => handleInputChange('name', text)}
                placeholder="이름을 입력해주세요"
                placeholderTextColor={currentColors.textSecondary}
                editable={!isLoading}
              />
            </View>

            {/* 이메일 */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: currentColors.text }]}>
                이메일 <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.textInput, { 
                  backgroundColor: currentColors.surface,
                  borderColor: currentColors.border,
                  color: currentColors.text
                }]}
                value={formData.email}
                onChangeText={(text) => handleInputChange('email', text)}
                placeholder="이메일을 입력해주세요"
                placeholderTextColor={currentColors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isLoading}
              />
            </View>

            {/* 제목 */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: currentColors.text }]}>
                제목 <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.textInput, { 
                  backgroundColor: currentColors.surface,
                  borderColor: currentColors.border,
                  color: currentColors.text
                }]}
                value={formData.subject}
                onChangeText={(text) => handleInputChange('subject', text)}
                placeholder="문의 제목을 입력해주세요"
                placeholderTextColor={currentColors.textSecondary}
                editable={!isLoading}
              />
            </View>

            {/* 카테고리 선택 */}
            {renderPicker('category', categories, '카테고리')}

            {/* 우선순위 선택 */}
            {renderPicker('priority', priorities, '우선순위')}

            {/* 문의 내용 */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: currentColors.text }]}>
                문의 내용 <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.textArea, { 
                  backgroundColor: currentColors.surface,
                  borderColor: currentColors.border,
                  color: currentColors.text
                }]}
                value={formData.message}
                onChangeText={(text) => handleInputChange('message', text)}
                placeholder="문의 내용을 자세히 입력해주세요 (최소 10자)"
                placeholderTextColor={currentColors.textSecondary}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                editable={!isLoading}
              />
              <Text style={[styles.charCount, { color: currentColors.textSecondary }]}>
                {formData.message.length}/500
              </Text>
            </View>

            {/* 제출 버튼 */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                {
                  backgroundColor: currentColors.primary,
                  opacity: isLoading ? 0.6 : 1
                }
              ]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>문의사항 등록</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  form: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 120,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  pickerContainer: {
    marginBottom: 20,
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  pickerOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  pickerOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  submitButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default InquiryScreen;
