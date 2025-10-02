/**
 * 통합 앱 상태 관리 훅
 * 모든 상태를 하나의 훅에서 관리하여 복잡성 제거
 */

import { useState, useEffect, useCallback } from 'react'
import appService from '../services/AppService'

export const useAppState = () => {
  // 기본 상태
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // 에러 처리
  const handleError = useCallback((error, context = '') => {
    console.error(`❌ [useAppState] ${context}:`, error)
    setError({
      message: error.message || '알 수 없는 오류가 발생했습니다',
      context,
      timestamp: new Date().toISOString()
    })
  }, [])

  // 에러 클리어
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // 로딩 상태 관리
  const setLoading = useCallback((loading) => {
    setIsLoading(loading)
  }, [])

  // API 호출 래퍼
  const apiCall = useCallback(async (apiFunction, context = '') => {
    try {
      setLoading(true)
      clearError()
      
      const result = await apiFunction()
      
      if (!result.success) {
        throw new Error(result.error || 'API 호출 실패')
      }
      
      return result
    } catch (error) {
      handleError(error, context)
      throw error
    } finally {
      setLoading(false)
    }
  }, [handleError, clearError, setLoading])

  // 사용자 인증 상태 확인
  const checkAuthStatus = useCallback(async () => {
    try {
      const { authManager } = await import('../services/AuthManager')
      const isAuth = authManager.isAuthenticated
      const currentUser = authManager.getCurrentUser()
      
      setIsAuthenticated(isAuth)
      setUser(currentUser)
      
      return { isAuth, user: currentUser }
    } catch (error) {
      handleError(error, '인증 상태 확인')
      return { isAuth: false, user: null }
    }
  }, [handleError])

  // 초기화
  useEffect(() => {
    checkAuthStatus()
  }, [checkAuthStatus])

  return {
    // 상태
    isLoading,
    error,
    user,
    isAuthenticated,
    
    // 액션
    setLoading,
    clearError,
    apiCall,
    checkAuthStatus,
    
    // 편의 메서드
    hasError: !!error,
    isReady: !isLoading && !error
  }
}

export default useAppState
