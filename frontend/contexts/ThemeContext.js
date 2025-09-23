import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 테마 색상 정의
const lightTheme = {
  primary: '#3B82F6',
  secondary: '#10B981',
  background: '#F1F5F9',
  surface: '#FFFFFF',
  text: '#1E293B',
  textSecondary: '#64748B',
  border: '#E2E8F0',
  gray: '#64748B',
  lightGray: '#E2E8F0',
  yellow: '#F4D160',
  deepBlue: '#1D5D9B',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  primaryLight: 'rgba(59, 130, 246, 0.1)',
  card: '#FFFFFF',
  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

const darkTheme = {
  primary: '#60A5FA',
  secondary: '#34D399',
  background: '#0F172A',
  surface: '#1E293B',
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  border: '#334155',
  gray: '#64748B',
  lightGray: '#475569',
  yellow: '#FBBF24',
  deepBlue: '#93C5FD',
  success: '#34D399',
  warning: '#FBBF24',
  error: '#F87171',
  primaryLight: 'rgba(96, 165, 250, 0.1)',
  card: '#1E293B',
  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.7)',
};

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [colors, setColors] = useState(lightTheme);

  useEffect(() => {
    loadThemePreference();
  }, []);

  useEffect(() => {
    setColors(isDarkMode ? darkTheme : lightTheme);
    // 전역 변수 사용 제거 - Context 기반으로 변경
  }, [isDarkMode]);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme) {
        setIsDarkMode(savedTheme === 'dark');
      } else {
        // 시스템 테마 감지 (선택사항)
        // const colorScheme = Appearance.getColorScheme();
        // setIsDarkMode(colorScheme === 'dark');
      }
    } catch (error) {
      console.error('테마 설정 로드 실패:', error);
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  const setTheme = (theme) => {
    setIsDarkMode(theme === 'dark');
  };

  const value = {
    isDarkMode,
    colors,
    toggleTheme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
