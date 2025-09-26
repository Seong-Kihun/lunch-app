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
  Platform,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { RENDER_SERVER_URL } from '../config';
import { useAuth } from '../auth/AuthContext';

const { width } = Dimensions.get('window');

const InquiryScreen = ({ navigation }) => {
  const { userData, accessToken } = useAuth();
  const currentColors = global.currentColors || COLORS.light;

  const [formData, setFormData] = useState({
    email: userData?.email || '',
    subject: '',
    message: '',
    category: 'general',
    priority: 'normal'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // 입력 시 해당 필드의 에러 제거
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email.trim()) {
      newErrors.email = '이메일을 입력해주세요.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식을 입력해주세요.';
    }
    
    if (!formData.subject.trim()) {
      newErrors.subject = '제목을 입력해주세요.';
    } else if (formData.subject.length < 5) {
      newErrors.subject = '제목은 5자 이상 입력해주세요.';
    }
    
    if (!formData.message.trim()) {
      newErrors.message = '문의 내용을 입력해주세요.';
    } else if (formData.message.length < 10) {
      newErrors.message = '문의 내용은 10자 이상 입력해주세요.';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${RENDER_SERVER_URL}/api/inquiries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        Alert.alert(
          '문의 접수 완료',
          '문의사항이 성공적으로 접수되었습니다.\n빠른 시일 내에 답변드리겠습니다.',
          [
            {
              text: '확인',
              onPress: () => {
                // 폼 초기화
                setFormData({
                  email: userData?.email || '',
                  subject: '',
                  message: '',
                  category: 'general',
                  priority: 'normal'
                });
                setErrors({});
                // 이전 화면으로 이동
                navigation.goBack();
              }
            }
          ]
        );
      } else {
        Alert.alert('문의 접수 실패', result.error || '문의 접수 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('문의 접수 오류:', error);
      Alert.alert('오류', '네트워크 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const categoryOptions = [
    { label: '일반 문의', value: 'general' },
    { label: '버그 신고', value: 'bug_report' },
    { label: '기능 요청', value: 'feature_request' },
    { label: '계정 문의', value: 'account_inquiry' },
    { label: '기타', value: 'other' }
  ];

  const priorityOptions = [
    { label: '낮음', value: 'low' },
    { label: '보통', value: 'normal' },
    { label: '높음', value: 'high' },
    { label: '긴급', value: 'urgent' }
  ];

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
              고객센터 문의
            </Text>
            <View style={styles.placeholder} />
          </View>

          {/* 메인 카드 */}
          <View style={[styles.mainCard, { backgroundColor: currentColors.surface }]}>
            {/* 폼 */}
            <View style={styles.form}>

              {/* 이메일 입력 */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: currentColors.text }]}>
                  이메일 <Text style={styles.required}>*</Text>
                </Text>
                <View style={[
                  styles.inputContainer, 
                  { 
                    borderColor: errors.email ? currentColors.red : currentColors.border,
                    backgroundColor: currentColors.surface
                  }
                ]}>
                  <Ionicons name="mail" size={20} color={currentColors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: currentColors.text }]}
                    placeholder="이메일을 입력하세요"
                    placeholderTextColor={currentColors.textSecondary}
                    value={formData.email}
                    onChangeText={(value) => handleInputChange('email', value)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!isLoading}
                  />
                </View>
                {errors.email && <Text style={[styles.errorText, { color: currentColors.red }]}>{errors.email}</Text>}
              </View>

              {/* 문의 유형 선택 */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: currentColors.text }]}>
                  문의 유형
                </Text>
                <View style={styles.buttonGroup}>
                  {categoryOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.filterButton,
                        {
                          backgroundColor: formData.category === option.value ? currentColors.primary : currentColors.surface,
                          borderColor: formData.category === option.value ? currentColors.primary : currentColors.border,
                        }
                      ]}
                      onPress={() => handleInputChange('category', option.value)}
                      disabled={isLoading}
                    >
                      <Text style={[
                        styles.filterButtonText,
                        {
                          color: formData.category === option.value ? 'white' : currentColors.text,
                          fontWeight: formData.category === option.value ? 'bold' : '600'
                        }
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 우선순위 선택 */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: currentColors.text }]}>
                  우선순위
                </Text>
                <View style={styles.buttonGroup}>
                  {priorityOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.filterButton,
                        {
                          backgroundColor: formData.priority === option.value ? currentColors.primary : currentColors.surface,
                          borderColor: formData.priority === option.value ? currentColors.primary : currentColors.border,
                        }
                      ]}
                      onPress={() => handleInputChange('priority', option.value)}
                      disabled={isLoading}
                    >
                      <Text style={[
                        styles.filterButtonText,
                        {
                          color: formData.priority === option.value ? 'white' : currentColors.text,
                          fontWeight: formData.priority === option.value ? 'bold' : '600'
                        }
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 제목 입력 */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: currentColors.text }]}>
                  제목 <Text style={styles.required}>*</Text>
                </Text>
                <View style={[
                  styles.inputContainer, 
                  { 
                    borderColor: errors.subject ? currentColors.red : currentColors.border,
                    backgroundColor: currentColors.surface
                  }
                ]}>
                  <Ionicons name="document-text" size={20} color={currentColors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: currentColors.text }]}
                    placeholder="문의 제목을 입력하세요"
                    placeholderTextColor={currentColors.textSecondary}
                    value={formData.subject}
                    onChangeText={(value) => handleInputChange('subject', value)}
                    editable={!isLoading}
                  />
                </View>
                {errors.subject && <Text style={[styles.errorText, { color: currentColors.red }]}>{errors.subject}</Text>}
              </View>

              {/* 문의 내용 입력 */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: currentColors.text }]}>
                  문의 내용 <Text style={styles.required}>*</Text>
                </Text>
                <View style={[
                  styles.textAreaContainer, 
                  { 
                    borderColor: errors.message ? currentColors.red : currentColors.border,
                    backgroundColor: currentColors.surface
                  }
                ]}>
                  <Ionicons name="chatbubble" size={20} color={currentColors.textSecondary} style={styles.textAreaIcon} />
                  <TextInput
                    style={[styles.textArea, { color: currentColors.text }]}
                    placeholder="문의 내용을 자세히 입력해주세요"
                    placeholderTextColor={currentColors.textSecondary}
                    value={formData.message}
                    onChangeText={(value) => handleInputChange('message', value)}
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                    editable={!isLoading}
                  />
                </View>
                {errors.message && <Text style={[styles.errorText, { color: currentColors.red }]}>{errors.message}</Text>}
              </View>

              {/* 제출 버튼 */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  { backgroundColor: currentColors.primary },
                  isLoading && styles.disabledButton
                ]}
                onPress={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Ionicons name="send" size={20} color="white" style={styles.buttonIcon} />
                    <Text style={[styles.submitButtonText, { color: "white" }]}>
                      문의 접수하기
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* 안내 메시지 */}
              <View style={[styles.infoCard, { backgroundColor: currentColors.primaryLight }]}>
                <Ionicons name="information-circle" size={20} color={currentColors.primary} />
                <Text style={[styles.infoText, { color: currentColors.text }]}>
                  문의사항은 평일 09:00-18:00에 확인하여 24시간 내에 답변드립니다.
                </Text>
              </View>
            </View>
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
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  placeholder: {
    width: 40,
  },
  mainCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    elevation: 3,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    marginBottom: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 52,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 52,
  },
  picker: {
    flex: 1,
    fontSize: 16,
  },
  textAreaContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 120,
  },
  textAreaIcon: {
    marginRight: 12,
    marginTop: 8,
  },
  textArea: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
    minHeight: 100,
  },
  errorText: {
    fontSize: 14,
    marginTop: 6,
    marginLeft: 4,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8,
    elevation: 2,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonIcon: {
    marginRight: 8,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  buttonGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    marginLeft: 12,
    lineHeight: 20,
  },
});

export default InquiryScreen;