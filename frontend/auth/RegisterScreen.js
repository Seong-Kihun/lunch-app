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

const RegisterScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    nickname: '',
    employeeId: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const currentColors = global.currentColors || COLORS.light;

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (!formData.email.trim()) {
      Alert.alert('입력 오류', '이메일을 입력해주세요.');
      return false;
    }
    if (!formData.email.endsWith('@koica.go.kr')) {
      Alert.alert('입력 오류', 'KOICA 이메일 주소를 입력해주세요.');
      return false;
    }
    if (!formData.password.trim()) {
      Alert.alert('입력 오류', '비밀번호를 입력해주세요.');
      return false;
    }
    if (formData.password.length < 8) {
      Alert.alert('입력 오류', '비밀번호는 최소 8자 이상이어야 합니다.');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      Alert.alert('입력 오류', '비밀번호가 일치하지 않습니다.');
      return false;
    }
    if (!formData.nickname.trim()) {
      Alert.alert('입력 오류', '닉네임을 입력해주세요.');
      return false;
    }
    if (formData.nickname.length < 2 || formData.nickname.length > 8) {
      Alert.alert('입력 오류', '닉네임은 2-8자로 입력해주세요.');
      return false;
    }
    if (!formData.employeeId.trim()) {
      Alert.alert('입력 오류', '직원 ID를 입력해주세요.');
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const response = await fetch('https://lunch-app-backend-ra12.onrender.com/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          nickname: formData.nickname,
          employee_id: formData.employeeId
        })
      });

      const result = await response.json();

      if (response.ok) {
        Alert.alert(
          '회원가입 완료',
          '회원가입이 성공적으로 완료되었습니다.\n로그인해주세요.',
          [
            {
              text: '확인',
              onPress: () => navigation.navigate('Login')
            }
          ]
        );
      } else {
        Alert.alert('회원가입 실패', result.error || '회원가입 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('회원가입 오류:', error);
      Alert.alert('오류', '네트워크 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

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
              회원가입
            </Text>
            <View style={styles.placeholder} />
          </View>

          {/* 안내 메시지 */}
          <View style={[styles.infoCard, { backgroundColor: currentColors.surface }]}>
            <Ionicons name="information-circle" size={24} color={currentColors.primary} />
            <Text style={[styles.infoText, { color: currentColors.text }]}>
              KOICA 직원만 가입할 수 있습니다.
            </Text>
          </View>

          {/* 폼 */}
          <View style={styles.form}>
            {/* 이메일 */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: currentColors.text }]}>
                이메일 <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.emailInputContainer}>
                <TextInput
                  style={[styles.emailInput, { 
                    backgroundColor: currentColors.surface,
                    borderColor: currentColors.border,
                    color: currentColors.text
                  }]}
                  value={formData.email}
                  onChangeText={(text) => handleInputChange('email', text)}
                  placeholder="아이디"
                  placeholderTextColor={currentColors.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!isLoading}
                />
                <Text style={[styles.domainText, { color: currentColors.textSecondary }]}>@koica.go.kr</Text>
              </View>
            </View>

            {/* 비밀번호 */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: currentColors.text }]}>
                비밀번호 <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.textInput, { 
                  backgroundColor: currentColors.surface,
                  borderColor: currentColors.border,
                  color: currentColors.text
                }]}
                value={formData.password}
                onChangeText={(text) => handleInputChange('password', text)}
                placeholder="비밀번호 (최소 8자)"
                placeholderTextColor={currentColors.textSecondary}
                secureTextEntry
                autoCapitalize="none"
                editable={!isLoading}
              />
            </View>

            {/* 비밀번호 확인 */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: currentColors.text }]}>
                비밀번호 확인 <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.textInput, { 
                  backgroundColor: currentColors.surface,
                  borderColor: currentColors.border,
                  color: currentColors.text
                }]}
                value={formData.confirmPassword}
                onChangeText={(text) => handleInputChange('confirmPassword', text)}
                placeholder="비밀번호 확인"
                placeholderTextColor={currentColors.textSecondary}
                secureTextEntry
                autoCapitalize="none"
                editable={!isLoading}
              />
            </View>

            {/* 닉네임 */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: currentColors.text }]}>
                닉네임 <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.textInput, { 
                  backgroundColor: currentColors.surface,
                  borderColor: currentColors.border,
                  color: currentColors.text
                }]}
                value={formData.nickname}
                onChangeText={(text) => handleInputChange('nickname', text)}
                placeholder="닉네임 (2-8자)"
                placeholderTextColor={currentColors.textSecondary}
                maxLength={8}
                editable={!isLoading}
              />
            </View>

            {/* 직원 ID */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: currentColors.text }]}>
                직원 ID <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.textInput, { 
                  backgroundColor: currentColors.surface,
                  borderColor: currentColors.border,
                  color: currentColors.text
                }]}
                value={formData.employeeId}
                onChangeText={(text) => handleInputChange('employeeId', text)}
                placeholder="직원 ID"
                placeholderTextColor={currentColors.textSecondary}
                autoCapitalize="characters"
                editable={!isLoading}
              />
            </View>

            {/* 회원가입 버튼 */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                {
                  backgroundColor: currentColors.primary,
                  opacity: isLoading ? 0.6 : 1
                }
              ]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>회원가입</Text>
              )}
            </TouchableOpacity>

            {/* 로그인 링크 */}
            <View style={styles.loginLinkContainer}>
              <Text style={[styles.loginLinkText, { color: currentColors.textSecondary }]}>
                이미 계정이 있으신가요?{' '}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={[styles.loginLink, { color: currentColors.primary }]}>
                  로그인
                </Text>
              </TouchableOpacity>
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
  emailInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emailInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  domainText: {
    fontSize: 16,
    marginLeft: 4,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
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
  loginLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  loginLinkText: {
    fontSize: 14,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default RegisterScreen;
