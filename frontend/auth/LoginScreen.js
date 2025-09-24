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
import { sendMagicLink } from '../services/authService';
import { useAuth } from './AuthContext';
import { useSchedule } from '../contexts/ScheduleContext';
import { storeAccessToken, storeRefreshToken, storeUserData } from '../utils/secureStorage';
import { RENDER_SERVER_URL } from '../config';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { enterRegistrationMode, setAuthError, clearError, handleLoginSuccess } = useAuth();
  const { setAccessToken: setScheduleAccessToken } = useSchedule();

  // 이메일 유효성 검사
  const isValidEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@koica\.go\.kr$/;
    return emailRegex.test(email);
  };

  // 매직링크 검증 처리
  const handleMagicLinkVerification = async (token) => {
    try {
      // 동적 서버 URL 사용
      const { getServerURL } = await import('../utils/networkUtils');
      const serverURL = await getServerURL();
      
      // 매직링크 검증 API 호출
      const response = await fetch(`${serverURL}/api/auth/verify-link?token=${token}`);
      const data = await response.json();
      
      if (response.ok) {
        if (data.type === 'login') {
          // 기존 사용자: 토큰 저장 후 메인 화면으로 이동
          await storeAccessToken(data.access_token);
          await storeRefreshToken(data.refresh_token);
          await storeUserData(data.user);
          
          // AuthContext를 통해 로그인 성공 처리
          handleLoginSuccess(data.user, data.access_token, data.refresh_token);
        } else if (data.type === 'register') {
          // 신규 사용자: 회원가입 화면으로 이동
          Alert.alert('회원가입 준비 중', '회원가입 기능은 현재 개발 중입니다.');
        }
      } else {
        Alert.alert('오류', data.error || '매직링크 검증에 실패했습니다.');
      }
    } catch (error) {
      console.error('매직링크 검증 실패:', error);
      Alert.alert('오류', '매직링크 검증 중 오류가 발생했습니다.');
    }
  };

  // 테스트 로그인 (개발용) - 특정 사용자로 로그인
  const handleTestLogin = async (userId) => {
    try {
      setIsLoading(true);
      clearError();
      
      // 동적 서버 URL 사용
      const { getServerURL } = await import('../utils/networkUtils');
      const serverURL = await getServerURL();
      
      // 가상 유저 API를 사용하여 테스트 로그인
      const response = await fetch(`${serverURL}/dev/users/${userId}`);
      const userData = await response.json();
      
      if (response.ok && userData) {
        // 가상 유저 데이터로 로그인 성공 처리
        const testUser = {
          id: userId,
          employee_id: userId,
          nickname: userData.nickname,
          email: `user${userId}@example.com`,
          foodPreferences: userData.foodPreferences,
          lunchStyle: userData.lunchStyle,
          allergies: userData.allergies,
          preferredTime: userData.preferredTime
        };
        
        // 가상 토큰 생성 (실제 인증 없음)
        const fakeToken = 'fake_token_' + Date.now();
        
        // Context에 액세스 토큰 설정
        setScheduleAccessToken(fakeToken);
        
        await storeAccessToken(fakeToken);
        await storeRefreshToken(fakeToken);
        await storeUserData(testUser);
        
        Alert.alert(
          '테스트 로그인 성공',
          `환영합니다, ${testUser.nickname}님!\n\n가상 유저 계정으로 로그인되었습니다.`,
          [{ text: '확인' }]
        );
        
        // AuthContext를 통해 로그인 성공 처리
        handleLoginSuccess(testUser, fakeToken, fakeToken);
      } else {
        Alert.alert('오류', '가상 유저 데이터를 가져올 수 없습니다.');
      }
    } catch (error) {
      console.error('테스트 로그인 실패:', error);
      Alert.alert('오류', '테스트 로그인 중 오류가 발생했습니다.');
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

  // 매직링크 요청
  const handleSendMagicLink = async () => {
    if (!email.trim()) {
      Alert.alert('알림', '이메일 주소를 입력해주세요.');
      return;
    }

    // 사용자가 입력한 아이디에 @koica.go.kr 도메인을 자동으로 추가
    const fullEmail = `${email.trim()}@koica.go.kr`;

    if (!isValidEmail(fullEmail)) {
      Alert.alert('알림', '올바른 이메일 형식이 아닙니다.');
      return;
    }

    try {
      setIsLoading(true);
      clearError();

      const response = await sendMagicLink(fullEmail);
      
      if (response.is_new_user) {
        // 신규 사용자: 회원가입 모드로 전환
        enterRegistrationMode();
      }
      
      // 이메일 확인 화면으로 이동 (다음 단계에서 구현)
      Alert.alert(
        '이메일 발송 완료',
        `${fullEmail}로 접속 링크를 보냈습니다.\n\n📱 링크를 클릭하면 자동으로 앱이 열리고 로그인이 완료됩니다.\n\n📧 메일함을 확인하여 링크를 클릭해주세요.`,
        [{ text: '확인' }]
      );
      
    } catch (error) {
      console.error('매직링크 발송 실패:', error);
      setAuthError(error.message || '이메일 발송에 실패했습니다.');
      Alert.alert('오류', error.message || '이메일 발송에 실패했습니다.');
    } finally {
      setIsLoading(false);
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

          {/* 이메일 입력 폼 */}
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

            <TouchableOpacity
              style={[
                styles.submitButton,
                (!email.trim() || isLoading) && styles.submitButtonDisabled
              ]}
              onPress={handleSendMagicLink}
              disabled={!email.trim() || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>이메일로 시작하기</Text>
              )}
            </TouchableOpacity>

            {/* 테스트 로그인 버튼들 (개발용) */}
            <View style={styles.testButtonsContainer}>
              <Text style={styles.testButtonsLabel}>🧪 가상 유저 테스트 로그인</Text>
              
              {/* 사용자 1-6 로그인 버튼들 */}
              <View style={styles.testButtonsRow}>
                <TouchableOpacity
                  style={[
                    styles.testButtonSmall,
                    isLoading && styles.submitButtonDisabled
                  ]}
                  onPress={() => handleTestLogin('1')}
                  disabled={isLoading}
                >
                  <Text style={styles.testButtonTextSmall}>사용자1</Text>
                  <Text style={styles.testButtonSubtext}>김철수</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.testButtonSmall,
                    isLoading && styles.submitButtonDisabled
                  ]}
                  onPress={() => handleTestLogin('2')}
                  disabled={isLoading}
                >
                  <Text style={styles.testButtonTextSmall}>사용자2</Text>
                  <Text style={styles.testButtonSubtext}>이영희</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.testButtonSmall,
                    isLoading && styles.submitButtonDisabled
                  ]}
                  onPress={() => handleTestLogin('3')}
                  disabled={isLoading}
                >
                  <Text style={styles.testButtonTextSmall}>사용자3</Text>
                  <Text style={styles.testButtonSubtext}>박민수</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.testButtonsRow}>
                <TouchableOpacity
                  style={[
                    styles.testButtonSmall,
                    isLoading && styles.submitButtonDisabled
                  ]}
                  onPress={() => handleTestLogin('4')}
                  disabled={isLoading}
                >
                  <Text style={styles.testButtonTextSmall}>사용자4</Text>
                  <Text style={styles.testButtonSubtext}>최지은</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.testButtonSmall,
                    isLoading && styles.submitButtonDisabled
                  ]}
                  onPress={() => handleTestLogin('5')}
                  disabled={isLoading}
                >
                  <Text style={styles.testButtonTextSmall}>사용자5</Text>
                  <Text style={styles.testButtonSubtext}>정현우</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.testButtonSmall,
                    isLoading && styles.submitButtonDisabled
                  ]}
                  onPress={() => handleTestLogin('6')}
                  disabled={isLoading}
                >
                  <Text style={styles.testButtonTextSmall}>사용자6</Text>
                  <Text style={styles.testButtonSubtext}>한소영</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 개발용 전체 정리 버튼 */}
            <TouchableOpacity
              style={[
                styles.clearButton,
                isLoading && styles.submitButtonDisabled
              ]}
              onPress={handleClearAllData}
              disabled={isLoading}
            >
              <Text style={styles.clearButtonText}>🧹 개발용 전체 정리</Text>
            </TouchableOpacity>
          </View>

          {/* 도움말 */}
          <View style={styles.helpSection}>
            <Text style={styles.helpText}>
              로그인에 문제가 있나요?{' '}
              <Text style={styles.helpLink}>고객센터 문의</Text>
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
  testButtonsContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  testButtonsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  testButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  testButtonSmall: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 3,
  },
  testButtonTextSmall: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  testButtonSubtext: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '500',
    opacity: 0.9,
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
