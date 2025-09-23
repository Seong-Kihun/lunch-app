import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMission } from '../contexts/MissionContext';

const AchievementDisplay = ({ style, size = 'medium' }) => {
  const { getAchievements } = useMission();
  const achievements = getAchievements();

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          container: styles.smallContainer,
          text: styles.smallText,
          icon: 16
        };
      case 'large':
        return {
          container: styles.largeContainer,
          text: styles.largeText,
          icon: 24
        };
      default: // medium
        return {
          container: styles.mediumContainer,
          text: styles.mediumText,
          icon: 20
        };
    }
  };

  const sizeStyles = getSizeStyles();

  return (
    <View style={[styles.container, sizeStyles.container, style]}>
      <View style={styles.achievementRow}>
        <View style={styles.achievementItem}>
          <Ionicons name="flame" size={sizeStyles.icon} color="#FF6B6B" />
          <Text style={[styles.achievementText, sizeStyles.text]}>
            {achievements.dailyStreak}일 연속
          </Text>
        </View>
        
        <View style={styles.achievementItem}>
          <Ionicons name="trophy" size={sizeStyles.icon} color="#FFD700" />
          <Text style={[styles.achievementText, sizeStyles.text]}>
            {achievements.perfectDays}일 완벽
          </Text>
        </View>
        
        <View style={styles.achievementItem}>
          <Ionicons name="star" size={sizeStyles.icon} color="#4ECDC4" />
          <Text style={[styles.achievementText, sizeStyles.text]}>
            {achievements.totalMissions}개 완료
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  smallContainer: {
    padding: 8,
  },
  mediumContainer: {
    padding: 12,
  },
  largeContainer: {
    padding: 16,
  },
  achievementRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  achievementItem: {
    alignItems: 'center',
    flex: 1,
  },
  achievementText: {
    marginTop: 4,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },
  smallText: {
    fontSize: 10,
  },
  mediumText: {
    fontSize: 12,
  },
  largeText: {
    fontSize: 14,
  },
});

export default AchievementDisplay;
