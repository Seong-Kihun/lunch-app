import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePoints } from '../contexts/PointsContext';

const PointsDisplay = ({ style, showIcon = true, size = 'medium' }) => {
  const { userPoints, getTodayPoints, getWeeklyPoints, getMonthlyPoints } = usePoints();

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
      {showIcon && (
        <Ionicons 
          name="star" 
          size={sizeStyles.icon} 
          color="#F59E0B" 
          style={styles.icon}
        />
      )}
      <Text style={[styles.pointsText, sizeStyles.text]}>
        {userPoints.toLocaleString()}P
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  smallContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  mediumContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  largeContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  icon: {
    marginRight: 6,
  },
  pointsText: {
    fontWeight: 'bold',
    color: '#D97706',
  },
  smallText: {
    fontSize: 12,
  },
  mediumText: {
    fontSize: 14,
  },
  largeText: {
    fontSize: 16,
  },
});

export default PointsDisplay;
