import React, { useState, useEffect } from 'react';
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
import { useAuth } from '../contexts/AuthContext';
// import { useSchedule } from '../contexts/ScheduleContext'; // ScheduleProvider 범위 밖이므로 주석 처리
import { useUnifiedNetwork } from '../contexts/UnifiedNetworkContext';
import authManager from '../services/AuthManager';
import accountUnlockHelper from '../utils/accountUnlockHelper';

// AuthManager 인스턴스 확인
console.log('🔧 [LoginScreen] AuthManager 인스턴스:', authManager);
console.log('🔧 [LoginScreen] AuthManager ID:', authManager?.constructor?.name);
import { unifiedApiClient } from '../services/UnifiedApiClient';

const LoginScreen = ({ navigation }) => {
  const [emailPrefix, setEmailPrefix] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const authContext = useAuth();
  console.log('🔧 [LoginScreen] useAuth 결과:', {
    setUserType: typeof authContext.setUser,
    setAuthStateType: typeof authContext.setAuthState,
    authState: authContext.authState,
    user: authContext.user?.nickname
  });
  
  const { 
    enterRegistrationMode, 
    setAuthError, 
    clearError, 
    handleLoginSuccess,
    setUser,
    setAuthState,
    AUTH_STATES
  } = authContext;
  // const { setAccessToken: setScheduleAccessToken } = useSchedule(); // ScheduleProvider 범위 밖이므로 주석 처리
  
  // 네트워크 상태 관리
  const { 
    isConnected,
    isInitialized,
    serverURL, 
    getServerURL,
    reconnect,
    error: networkError 
  } = useUnifiedNetwork();

  // 네트워크 상태 변화 모니터링
  useEffect(() => {
    if (isInitialized) {
      if (isConnected) {
        console.log('✅ [LoginScreen] 네트워크 준비 완료');
      } else if (networkError) {
        console.log('❌ [LoginScreen] 네트워크 오류:', networkError);
      }
    }
  }, [isInitialized, isConnected, networkError]);

  // 네트워크 상태 표시 함수들
  const getStatusIcon = () => {
    if (isConnected) return '✅';
    if (isInitialized && !isConnected) return '⚠️';
    return '🔄';
  };

  const getStatusText = () => {
    if (isConnected) return '연결됨';
    if (isInitialized && !isConnected) return '연결 안됨';
    return '연결 중...';
  };

  // 이메일 prefix 핸들러
  const handleEmailPrefixChange = (value) => {
    setEmailPrefix(value);
    const fullEmail = value ? `${value}@koica.go.kr` : '';
    setEmail(fullEmail);
    clearError(); // authError 체크 제거
  };

  // 이메일 유효성 검사
  const isValidEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@koica\.go\.kr$/;
    return emailRegex.test(email);
  };

  // 비밀번호 로그인 처리
  const handlePasswordLogin = async () => {
    try {
      console.log('🔐 [LoginScreen] 로그인 시도 시작');
      setIsLoading(true);
      clearError();
      
      // 입력값 검증
      if (!email.trim()) {
        console.log('❌ [LoginScreen] 이메일이 비어있음');
        setAuthError('이메일을 입력해주세요.');
        setIsLoading(false);
        return;
      }
      
      if (!password.trim()) {
        console.log('❌ [LoginScreen] 비밀번호가 비어있음');
        setAuthError('비밀번호를 입력해주세요.');
        setIsLoading(false);
        return;
      }
      
      if (!isValidEmail(email)) {
        console.log('❌ [LoginScreen] 이메일 형식이 잘못됨:', email);
        setAuthError('올바른 KOICA 이메일 주소를 입력해주세요.');
        setIsLoading(false);
        return;
      }
      
      console.log('✅ [LoginScreen] 입력값 검증 통과:', { email, passwordLength: password.length });
      
      // 네트워크 상태 확인
      if (!isConnected) {
        console.log('🔧 [LoginScreen] 네트워크 연결 대기 중...');
        setAuthError('네트워크를 준비하고 있습니다. 잠시만 기다려주세요.');
        setIsLoading(false);
        return;
      }
      
      // 새로운 AuthManager를 통한 로그인
      console.log('🔐 [LoginScreen] AuthManager를 통한 로그인 시도');
      
      try {
        const result = await authManager.login({
          email: email.trim(),
          password: password.trim()
        });
        
        console.log('✅ [LoginScreen] 로그인 성공:', result.user.nickname);
      
      // ScheduleContext에 액세스 토큰 설정 (ScheduleProvider 범위 밖이므로 주석 처리)
      // if (setScheduleAccessToken) {
      //   setScheduleAccessToken(result.accessToken);
      // }
      
      // AuthContext 상태 직접 업데이트 (리스너가 없는 경우 대비)
      console.log('🔧 [LoginScreen] AuthContext 상태 직접 업데이트');
      
      // 함수가 정의되어 있는지 확인
      if (typeof setUser === 'function') {
        setUser(result.user);
        console.log('✅ [LoginScreen] setUser 호출 완료');
      } else {
        console.warn('⚠️ [LoginScreen] setUser 함수가 정의되지 않음');
      }
      
      if (typeof setAuthState === 'function') {
        setAuthState(AUTH_STATES.AUTHENTICATED);
        console.log('✅ [LoginScreen] setAuthState 호출 완료');
      } else {
        console.warn('⚠️ [LoginScreen] setAuthState 함수가 정의되지 않음');
      }
      
      // 로그인 성공 처리
      handleLoginSuccess(result.user, result.accessToken, result.refreshToken);
      
        // 에러 상태 클리어
        clearError();
        
      } catch (loginError) {
        console.error('❌ [LoginScreen] AuthManager 로그인 실패:', loginError);
        
        // 더 구체적인 에러 메시지 제공 - 백엔드 API 문제 대응 강화
        let errorMessage = '로그인에 실패했습니다.';
        let showRetryOption = false;
        
        if (loginError.message) {
          if (loginError.message.includes('계정이 잠겨있습니다') || loginError.message.includes('423')) {
            errorMessage = '계정이 잠겨있습니다. 보안을 위해 잠시 후 다시 시도해주세요.';
            showRetryOption = true;
          } else if (loginError.message.includes('비밀번호가 올바르지 않습니다') || loginError.message.includes('401')) {
            errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.';
          } else if (loginError.message.includes('browser (or proxy)') || loginError.message.includes('400')) {
            errorMessage = '서버 API에 일시적인 문제가 있습니다. 잠시 후 다시 시도해주세요.';
            showRetryOption = true;
          } else if (loginError.message.includes('네트워크') || loginError.message.includes('Network')) {
            errorMessage = '네트워크 연결을 확인해주세요.';
            showRetryOption = true;
          } else if (loginError.message.includes('서버')) {
            errorMessage = '서버 연결에 문제가 있습니다. 잠시 후 다시 시도해주세요.';
            showRetryOption = true;
          } else {
            errorMessage = loginError.message;
          }
        }
        
        // 계정 잠금 상태인 경우 사용자에게 추가 안내
        if (showRetryOption) {
          setTimeout(() => {
            let alertTitle = '로그인 안내';
            let alertMessage = errorMessage;
            
            if (loginError.message.includes('계정이 잠겨있습니다')) {
              alertTitle = '계정 잠금 안내';
              alertMessage = '보안상의 이유로 계정이 일시적으로 잠겨있습니다.\n\n' +
                           '일반적으로 15-30분 후에 자동으로 해제됩니다.\n' +
                           '긴급한 경우 관리자에게 문의해주세요.';
              
              // 개발 환경에서 계정 잠금 해제 도구 제공
              if (__DEV__) {
                Alert.alert(alertTitle, alertMessage, [
                  { text: '확인' },
                  { 
                    text: '개발자 도구', 
                    onPress: () => accountUnlockHelper.showDeveloperTools(credentials.email)
                  }
                ]);
              } else {
                Alert.alert(alertTitle, alertMessage, [{ text: '확인' }]);
              }
            } else {
              alertMessage += '\n\n문제가 지속되면 관리자에게 문의해주세요.';
              Alert.alert(alertTitle, alertMessage, [{ text: '확인' }]);
            }
          }, 100);
        }
        
        setAuthError(errorMessage);
        throw loginError; // 에러를 다시 던져서 상위에서 처리할 수 있도록 함
      }
      
    } catch (error) {
      console.error('❌ [LoginScreen] 로그인 처리 실패:', error);
      
      // 네트워크 연결 문제인지 확인
      if (error.message && (error.message.includes('Network request failed') || error.message.includes('네트워크'))) {
        console.log('🔧 [LoginScreen] 네트워크 연결 문제 감지, 재연결 시도');
        setAuthError('네트워크 연결에 문제가 있습니다. 재연결을 시도합니다.');
        
        // 재연결 시도
        try {
          await reconnect();
          setAuthError('네트워크 재연결 완료. 다시 로그인해주세요.');
        } catch (reconnectError) {
          setAuthError('네트워크 재연결에 실패했습니다. 잠시 후 다시 시도해주세요.');
        }
      } else {
        // AuthManager에서 이미 에러 메시지가 설정됨
        setAuthError(error.message || '로그인 중 오류가 발생했습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 비밀번호 찾기 처리
  const handleForgotPassword = async () => {
    try {
      if (!forgotPasswordEmail.trim()) {
        Alert.alert('오류', '이메일을 입력해주세요.');
        return;
      }

      // 이메일 prefix에 @koica.go.kr 추가
      const fullEmail = `${forgotPasswordEmail.trim()}@koica.go.kr`;

      if (!isValidEmail(fullEmail)) {
        Alert.alert('오류', '올바른 KOICA 이메일 주소를 입력해주세요.');
        return;
      }

      setIsLoading(true);

      const response = await fetch(`${RENDER_SERVER_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: fullEmail
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        Alert.alert(
          '비밀번호 재설정',
          '임시 비밀번호가 이메일로 발송되었습니다.\n이메일을 확인하신 후 임시 비밀번호로 로그인해주세요.',
          [
            {
              text: '확인',
              onPress: () => {
                setShowForgotPassword(false);
                setForgotPasswordEmail('');
              }
            }
          ]
        );
      } else {
        Alert.alert('오류', data.error || '비밀번호 재설정 요청에 실패했습니다.');
      }
    } catch (error) {
      console.error('비밀번호 찾기 실패:', error);
      Alert.alert('오류', '네트워크 오류가 발생했습니다. 다시 시도해주세요.');
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
            <Text style={styles.logo}>밥플떼기</Text>
            <Text style={styles.subtitle}>점심이 설레는 이유</Text>
            
            {/* 네트워크 상태 표시 */}
            <View style={styles.networkStatus}>
              <View style={styles.networkStatusItem}>
                <Text style={[styles.networkStatusText, { color: isConnected ? '#10B981' : '#F59E0B' }]}>
                  {getStatusIcon()} {getStatusText()}
                </Text>
              </View>
            </View>
          </View>


          {/* 입력 폼 */}
          <View style={styles.form}>
            <View style={styles.emailInputContainer}>
              <TextInput
                style={styles.emailInput}
                placeholder="이메일 아이디"
                value={emailPrefix}
                onChangeText={handleEmailPrefixChange}
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
                (!email.trim() || !password.trim() || isLoading || !isConnected) && styles.submitButtonDisabled
              ]}
              onPress={() => {
                console.log('🔘 [LoginScreen] 로그인 버튼 클릭됨');
                handlePasswordLogin();
              }}
              disabled={(!email.trim() || !password.trim() || isLoading || !isConnected)}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : !isConnected ? (
                <Text style={styles.submitButtonText}>네트워크 준비 중...</Text>
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

            {/* 비밀번호 찾기 버튼 */}
            <TouchableOpacity
              style={styles.forgotPasswordButton}
              onPress={() => setShowForgotPassword(true)}
              disabled={isLoading}
            >
              <Text style={styles.forgotPasswordText}>비밀번호를 잊으셨나요?</Text>
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

        {/* 비밀번호 찾기 모달 */}
        {showForgotPassword && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>비밀번호 찾기</Text>
              <Text style={styles.modalDescription}>
                등록된 이메일 주소를 입력하시면{'\n'}임시 비밀번호를 발송해드립니다.
              </Text>
              
              <View style={styles.modalInputContainer}>
                <TextInput
                  style={styles.modalInput}
                  placeholder="이메일 아이디"
                  value={forgotPasswordEmail}
                  onChangeText={(value) => {
                    setForgotPasswordEmail(value);
                    // @koica.go.kr 자동 추가는 비밀번호 찾기에서는 필요 없음
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
                <Text style={styles.modalDomainText}>@koica.go.kr</Text>
              </View>

              <View style={styles.modalButtonContainer}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => {
                    setShowForgotPassword(false);
                    setForgotPasswordEmail('');
                  }}
                  disabled={isLoading}
                >
                  <Text style={styles.modalCancelText}>취소</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.modalSubmitButton,
                    (!forgotPasswordEmail.trim() || isLoading) && styles.modalSubmitButtonDisabled
                  ]}
                  onPress={handleForgotPassword}
                  disabled={!forgotPasswordEmail.trim() || isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.modalSubmitText}>발송</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

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
    // 모서리가 둥근 폰트 사용
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-light',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 18,
    color: '#64748B',
    textAlign: 'center',
  },
  networkStatus: {
    marginTop: 12,
    alignItems: 'center',
  },
  networkStatusItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  networkStatusText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '500',
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
    backgroundColor: '#10B981', // secondary 색상 (에메랄드)
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
    elevation: 2,
    shadowColor: '#10B981',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  forgotPasswordButton: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  forgotPasswordText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
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
  // 모달 스타일
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 24,
    backgroundColor: '#F8F9FA',
  },
  modalInput: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
    paddingVertical: 4,
  },
  modalDomainText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
    marginLeft: 8,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalCancelText: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '600',
  },
  modalSubmitButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#3B82F6',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  modalSubmitButtonDisabled: {
    backgroundColor: '#CBD5E1',
    elevation: 0,
    shadowOpacity: 0,
  },
  modalSubmitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LoginScreen;
