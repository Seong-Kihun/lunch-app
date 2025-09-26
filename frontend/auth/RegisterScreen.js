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
import { storeAccessToken, storeRefreshToken, storeUserData } from '../utils/secureStorage';

const { width } = Dimensions.get('window');

const RegisterScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    nickname: '',
    employeeId: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const currentColors = global.currentColors || COLORS.light;

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
    } else if (!formData.email.endsWith('@koica.go.kr')) {
      newErrors.email = 'KOICA 이메일 주소를 입력해주세요.';
    }
    
    if (!formData.password.trim()) {
      newErrors.password = '비밀번호를 입력해주세요.';
    } else if (formData.password.length < 8) {
      newErrors.password = '비밀번호는 최소 8자 이상이어야 합니다.';
    }
    
    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = '비밀번호 확인을 입력해주세요.';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다.';
    }
    
    if (!formData.nickname.trim()) {
      newErrors.nickname = '닉네임을 입력해주세요.';
    } else if (formData.nickname.length < 2 || formData.nickname.length > 8) {
      newErrors.nickname = '닉네임은 2-8자로 입력해주세요.';
    }
    
    if (!formData.employeeId.trim()) {
      newErrors.employeeId = '직원 ID를 입력해주세요.';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${RENDER_SERVER_URL}/api/auth/register`, {
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

          {/* 메인 카드 */}
          <View style={[styles.mainCard, { backgroundColor: currentColors.surface }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="person-add" size={32} color={currentColors.primary} />
              <Text style={[styles.cardTitle, { color: currentColors.text }]}>
                밥플떼기에 오신 것을 환영합니다!
              </Text>
              <Text style={[styles.cardSubtitle, { color: currentColors.textSecondary }]}>
                회원가입하고 함께 맛있는 점심을 즐겨보세요
              </Text>
            </View>

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

              {/* 비밀번호 입력 */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: currentColors.text }]}>
                  비밀번호 <Text style={styles.required}>*</Text>
                </Text>
                <View style={[
                  styles.inputContainer, 
                  { 
                    borderColor: errors.password ? currentColors.red : currentColors.border,
                    backgroundColor: currentColors.surface
                  }
                ]}>
                  <Ionicons name="lock-closed" size={20} color={currentColors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: currentColors.text }]}
                    placeholder="비밀번호를 입력하세요 (8자 이상)"
                    placeholderTextColor={currentColors.textSecondary}
                    value={formData.password}
                    onChangeText={(value) => handleInputChange('password', value)}
                    secureTextEntry
                    editable={!isLoading}
                  />
                </View>
                {errors.password && <Text style={[styles.errorText, { color: currentColors.red }]}>{errors.password}</Text>}
              </View>

              {/* 비밀번호 확인 입력 */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: currentColors.text }]}>
                  비밀번호 확인 <Text style={styles.required}>*</Text>
                </Text>
                <View style={[
                  styles.inputContainer, 
                  { 
                    borderColor: errors.confirmPassword ? currentColors.red : currentColors.border,
                    backgroundColor: currentColors.surface
                  }
                ]}>
                  <Ionicons name="lock-closed" size={20} color={currentColors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: currentColors.text }]}
                    placeholder="비밀번호를 다시 입력하세요"
                    placeholderTextColor={currentColors.textSecondary}
                    value={formData.confirmPassword}
                    onChangeText={(value) => handleInputChange('confirmPassword', value)}
                    secureTextEntry
                    editable={!isLoading}
                  />
                </View>
                {errors.confirmPassword && <Text style={[styles.errorText, { color: currentColors.red }]}>{errors.confirmPassword}</Text>}
              </View>

              {/* 닉네임 입력 */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: currentColors.text }]}>
                  닉네임 <Text style={styles.required}>*</Text>
                </Text>
                <View style={[
                  styles.inputContainer, 
                  { 
                    borderColor: errors.nickname ? currentColors.red : currentColors.border,
                    backgroundColor: currentColors.surface
                  }
                ]}>
                  <Ionicons name="person" size={20} color={currentColors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: currentColors.text }]}
                    placeholder="닉네임을 입력하세요 (2-8자)"
                    placeholderTextColor={currentColors.textSecondary}
                    value={formData.nickname}
                    onChangeText={(value) => handleInputChange('nickname', value)}
                    editable={!isLoading}
                  />
                </View>
                {errors.nickname && <Text style={[styles.errorText, { color: currentColors.red }]}>{errors.nickname}</Text>}
              </View>

              {/* 직원 ID 입력 */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: currentColors.text }]}>
                  직원 ID <Text style={styles.required}>*</Text>
                </Text>
                <View style={[
                  styles.inputContainer, 
                  { 
                    borderColor: errors.employeeId ? currentColors.red : currentColors.border,
                    backgroundColor: currentColors.surface
                  }
                ]}>
                  <Ionicons name="card" size={20} color={currentColors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: currentColors.text }]}
                    placeholder="직원 ID를 입력하세요"
                    placeholderTextColor={currentColors.textSecondary}
                    value={formData.employeeId}
                    onChangeText={(value) => handleInputChange('employeeId', value)}
                    editable={!isLoading}
                  />
                </View>
                {errors.employeeId && <Text style={[styles.errorText, { color: currentColors.red }]}>{errors.employeeId}</Text>}
              </View>

              {/* 회원가입 버튼 */}
              <TouchableOpacity
                style={[
                  styles.registerButton,
                  { backgroundColor: currentColors.primary },
                  isLoading && styles.disabledButton
                ]}
                onPress={handleRegister}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={currentColors.white} />
                ) : (
                  <>
                    <Ionicons name="person-add" size={20} color={currentColors.white} style={styles.buttonIcon} />
                    <Text style={[styles.registerButtonText, { color: currentColors.white }]}>
                      회원가입
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* 로그인 링크 */}
              <TouchableOpacity
                style={styles.loginLink}
                onPress={() => navigation.navigate('Login')}
                disabled={isLoading}
              >
                <Text style={[styles.loginLinkText, { color: currentColors.textSecondary }]}>
                  이미 계정이 있으신가요? <Text style={{ color: currentColors.primary, fontWeight: '600' }}>로그인</Text>
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
  errorText: {
    fontSize: 14,
    marginTop: 6,
    marginLeft: 4,
  },
  registerButton: {
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
  registerButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 12,
  },
  loginLinkText: {
    fontSize: 16,
  },
});

export default RegisterScreen;