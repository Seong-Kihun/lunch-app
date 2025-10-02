/**
 * 전역 에러 바운더리 - 모든 에러를 중앙에서 처리
 * 사용자 친화적인 에러 메시지와 자동 복구 기능 제공
 */

import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error) {
    // 에러 발생 시 상태 업데이트
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error, errorInfo) {
    // 에러 로깅 및 분석
    console.error('🚨 [AppErrorBoundary] 에러 발생:', error)
    console.error('🚨 [AppErrorBoundary] 에러 정보:', errorInfo)
    
    this.setState({
      error,
      errorInfo
    })

    // 에러 모니터링 서비스에 전송 (선택사항)
    this.logError(error, errorInfo)
  }

  logError = async (error, errorInfo) => {
    try {
      // 에러 정보를 서버에 전송하거나 로컬에 저장
      const errorData = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        retryCount: this.state.retryCount
      }
      
      console.log('📊 [AppErrorBoundary] 에러 데이터:', errorData)
      
      // 필요시 서버로 전송
      // await appService.post('/api/errors', errorData)
      
    } catch (logError) {
      console.error('❌ [AppErrorBoundary] 에러 로깅 실패:', logError)
    }
  }

  handleRetry = () => {
    const { retryCount } = this.state
    const maxRetries = 3

    if (retryCount < maxRetries) {
      console.log(`🔄 [AppErrorBoundary] 재시도 ${retryCount + 1}/${maxRetries}`)
      
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }))
    } else {
      Alert.alert(
        '앱 재시작 필요',
        '문제가 지속되고 있습니다. 앱을 재시작해주세요.',
        [
          { text: '확인', onPress: () => this.handleAppRestart() }
        ]
      )
    }
  }

  handleAppRestart = () => {
    // 앱 재시작 로직 (Expo의 경우)
    if (typeof expo !== 'undefined' && expo.Updates) {
      expo.Updates.reloadAsync()
    } else {
      // React Native의 경우
      console.log('🔄 [AppErrorBoundary] 앱 재시작 필요')
    }
  }

  render() {
    if (this.state.hasError) {
      const { retryCount } = this.state
      const maxRetries = 3

      return (
        <View style={styles.container}>
          <View style={styles.errorContainer}>
            <Ionicons name="warning-outline" size={64} color="#EF4444" />
            
            <Text style={styles.title}>앗, 문제가 발생했어요!</Text>
            
            <Text style={styles.message}>
              {retryCount < maxRetries 
                ? '일시적인 문제일 수 있습니다. 다시 시도해보세요.'
                : '문제가 지속되고 있습니다. 앱을 재시작해주세요.'
              }
            </Text>

            <View style={styles.buttonContainer}>
              {retryCount < maxRetries && (
                <TouchableOpacity 
                  style={styles.retryButton} 
                  onPress={this.handleRetry}
                >
                  <Text style={styles.retryButtonText}>다시 시도</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={styles.restartButton} 
                onPress={this.handleAppRestart}
              >
                <Text style={styles.restartButtonText}>앱 재시작</Text>
              </TouchableOpacity>
            </View>

            {__DEV__ && (
              <View style={styles.debugContainer}>
                <Text style={styles.debugTitle}>개발자 정보:</Text>
                <Text style={styles.debugText}>
                  {this.state.error?.message || '알 수 없는 오류'}
                </Text>
                <Text style={styles.debugText}>
                  재시도 횟수: {retryCount}/{maxRetries}
                </Text>
              </View>
            )}
          </View>
        </View>
      )
    }

    return this.props.children
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  errorContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    maxWidth: 400,
    width: '100%'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center'
  },
  message: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%'
  },
  retryButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center'
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },
  restartButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center'
  },
  restartButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },
  debugContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    width: '100%'
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8
  },
  debugText: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'monospace',
    marginBottom: 4
  }
})

export default AppErrorBoundary
