import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeToggle = ({ isDarkMode, onToggle, currentColors }) => {
  const handleToggle = async () => {
    try {
      await AsyncStorage.setItem('theme', isDarkMode ? 'light' : 'dark');
      onToggle();
    } catch (error) {
      console.error('테마 설정 저장 실패:', error);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: currentColors.surface,
          borderColor: currentColors.border,
        }
      ]}
      onPress={handleToggle}
    >
      <View style={styles.iconContainer}>
        <Ionicons
          name={isDarkMode ? 'sunny' : 'moon'}
          size={20}
          color={isDarkMode ? currentColors.yellow : currentColors.deepBlue}
        />
      </View>
      <Text style={[
        styles.text,
        { color: currentColors.text }
      ]}>
        {isDarkMode ? '라이트 모드' : '다크 모드'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  iconContainer: {
    marginRight: 12,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ThemeToggle;
