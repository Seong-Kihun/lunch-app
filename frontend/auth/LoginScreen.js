import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from 'react-native-vector-icons';
import { useAuth } from './AuthContext';
import { useSchedule } from '../contexts/ScheduleContext';
import { storeAccessToken, storeRefreshToken, storeUserData } from '../utils/secureStorage';
import { RENDER_SERVER_URL } from '../config';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { enterRegistrationMode, setAuthError, clearError, handleLoginSuccess } = useAuth();
  const { setAccessToken: setScheduleAccessToken } = useSchedule();

  // 이메일 유효성 검사
  const isValidEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@koica\.go\.kr$/;
    return emailRegex.test(email);
  };

  // 비밀번호 로그인 처리
  const handlePasswordLogin = async () => {
    try {
      setIsLoading(true);
      clearError();
      
      // 입력값 검증
      if (!email.trim()) {
        setAuthError('이메일을 입력해주세요.');
        return;
      }
      
      if (!password.trim()) {
        setAuthError('비밀번호를 입력해주세요.');
        return;
      }
      
      if (!isValidEmail(email)) {
        setAuthError('올바른 KOICA 이메일 주소를 입력해주세요.');
        return;
      }
      
      // 동적 서버 URL 사용
      const { getServerURL } = await import('../utils/networkUtils');
      const serverURL = await getServerURL();
      
      // 비밀번호 로그인 API 호출
      const response = await fetch(`${serverURL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim()
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.access_token) {
        // 로그인 성공 처리
        await storeAccessToken(data.access_token);
        await storeRefreshToken(data.refresh_token);
        await storeUserData(data.user);
        
        // Context에 액세스 토큰 설정
        setScheduleAccessToken(data.access_token);
        
        Alert.alert(
          '로그인 성공',
          `환영합니다, ${data.user.nickname}님!`,
          [{ text: '확인' }]
        );
        
        // AuthContext를 통해 로그인 성공 처리
        handleLoginSuccess(data.user, data.access_token, data.refresh_token);
      } else {
        setAuthError(data.error || '로그인에 실패했습니다.');
      }
    } catch (error) {
      console.error('비밀번호 로그인 실패:', error);
      setAuthError('로그인 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };


  // 개발용 전체 정리 (백엔드 데이터 완전 정리)
  const handleClearAllData = async () => {
    try {
      // 확인 팝업
      Alert.alert(
        '🧹 개발용 전체 정리',
        '정말로 모든 데이터를 정리하시겠습니까?\n\n⚠️ 이 작업은 되돌릴 수 없습니다!\n\n• 모든 파티 데이터 삭제\n• 모든 일정 데이터 삭제\n• 모든 친구 데이터 삭제\n• 모든 채팅 데이터 삭제\n• 모든 랜덤런치 데이터 삭제\n• AsyncStorage 데이터 초기화',
        [
          { text: '취소', style: 'cancel' },
          { 
            text: '전체 정리', 
            style: 'destructive',
            onPress: async () => {
              try {
                setIsLoading(true);
                
                // 1. 백엔드 데이터 완전 정리
                console.log('🚀 [전체정리] 백엔드 데이터 정리 시작...');
                const clearResponse = await fetch(`${RENDER_SERVER_URL}/clear-all-data`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    clear_users: false  // 사용자 데이터는 유지
                  })
                });
                
                if (clearResponse.ok) {
                  const result = await clearResponse.json();
                  console.log('✅ [전체정리] 백엔드 데이터 정리 완료:', result);
                } else {
                  console.log('⚠️ [전체정리] 백엔드 데이터 정리 실패');
                }
                
                // 2. AsyncStorage에서 모든 데이터 삭제
                console.log('🧹 [전체정리] AsyncStorage 데이터 정리 시작...');
                const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                
                // 모든 AsyncStorage 키 확인
                const allKeys = await AsyncStorage.getAllKeys();
                console.log('현재 AsyncStorage 키들:', allKeys);
                
                // 모든 키를 한 번에 삭제
                await AsyncStorage.clear();
                console.log('✅ [전체정리] AsyncStorage 완전 초기화 완료');
                
                // 3. 전역 변수 초기화
                console.log('🔄 [전체정리] 전역 변수 초기화...');
                if (typeof global !== 'undefined') {
                  global.lastCleanupTime = Date.now();
                  global.partyDataCleared = true;
                  global.forceEmptyParties = true;
                  global.randomLunchProposalsCleared = true;
                  global.forceEmptyRandomLunch = true;
                  global.emergencyPartyCleanup = true;
                }
                
                // 4. 성공 메시지
                Alert.alert(
                  '✅ 전체 정리 완료',
                  '모든 테스트 데이터가 완전히 정리되었습니다!\n\n🗑️ 정리된 데이터:\n• 파티 데이터 (Party, PartyMember)\n• 일정 데이터 (Schedule)\n• 친구 데이터 (Friend)\n• 채팅 데이터 (ChatRoom, ChatMessage)\n• 랜덤런치 데이터 (RandomLunchGroup, RandomLunchProposal)\n• AsyncStorage 데이터\n\n🎯 프론트엔드는 백엔드 데이터를 출력만 하므로\n자동으로 빈 상태가 됩니다!\n\n이제 깔끔하게 테스트할 수 있습니다! 🎉',
                  [{ text: '확인' }]
                );
                
              } catch (error) {
                console.error('전체 정리 실패:', error);
                Alert.alert('오류', '전체 정리 중 오류가 발생했습니다: ' + error.message);
              } finally {
                setIsLoading(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('전체 정리 확인 실패:', error);
      Alert.alert('오류', '전체 정리 확인 중 오류가 발생했습니다.');
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* 로고 및 제목 */}
          <View style={styles.header}>
            <Text style={styles.logo}>🍽️ 밥플떼기</Text>
            <Text style={styles.subtitle}>점심이 설레는 이유</Text>
          </View>


          {/* 입력 폼 */}
          <View style={styles.form}>
            <View style={styles.emailInputContainer}>
              <TextInput
                style={styles.emailInput}
                placeholder="이메일 아이디"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              <Text style={styles.domainText}>@koica.go.kr</Text>
            </View>

            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="비밀번호"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.submitButton,
                (!email.trim() || !password.trim() || isLoading) && styles.submitButtonDisabled
              ]}
              onPress={handlePasswordLogin}
              disabled={(!email.trim() || !password.trim() || isLoading)}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>로그인</Text>
              )}
            </TouchableOpacity>

            {/* 회원가입 버튼 */}
            <TouchableOpacity
              style={styles.registerButton}
              onPress={() => {
                // 회원가입 화면으로 이동
                navigation.navigate('Register');
              }}
              disabled={isLoading}
            >
              <Text style={styles.registerButtonText}>회원가입</Text>
            </TouchableOpacity>

          </View>

          {/* 도움말 */}
          <View style={styles.helpSection}>
            <Text style={styles.helpText}>
              로그인에 문제가 있나요?{' '}
              <Text 
                style={styles.helpLink}
                onPress={() => navigation.navigate('Inquiry')}
              >
                고객센터 문의
              </Text>
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#64748B',
    textAlign: 'center',
  },
  form: {
    marginBottom: 32,
  },
  emailInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  emailInput: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
    padding: 0,
  },
  domainText: {
    fontSize: 16,
    color: '#64748B',
    marginLeft: 8,
  },
  passwordInputContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  passwordInput: {
    fontSize: 16,
    color: '#1E293B',
    padding: 0,
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  submitButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  registerButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  registerButtonText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
  },
  clearButton: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  helpSection: {
    alignItems: 'center',
  },
  helpText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  helpLink: {
    color: '#3B82F6',
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;
