import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const BonusPointsNotification = ({ visible, bonusType, points, onComplete }) => {
  const slideAnim = useRef(new Animated.Value(-width)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // 슬라이드 인 애니메이션
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();

      // 3초 후 자동으로 사라짐
      const timer = setTimeout(() => {
        hideNotification();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hideNotification = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -width,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onComplete) {
        onComplete();
      }
    });
  };

  if (!visible) return null;

  const getBonusIcon = () => {
    switch (bonusType) {
      case 'daily_streak':
        return 'flame';
      case 'perfect_day':
        return 'trophy';
      case 'weekly_streak':
        return 'calendar';
      case 'monthly_streak':
        return 'star';
      default:
        return 'gift';
    }
  };

  const getBonusColor = () => {
    switch (bonusType) {
      case 'daily_streak':
        return '#FF6B6B';
      case 'perfect_day':
        return '#FFD700';
      case 'weekly_streak':
        return '#4ECDC4';
      case 'monthly_streak':
        return '#9B59B6';
      default:
        return '#3498DB';
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateX: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons 
            name={getBonusIcon()} 
            size={24} 
            color={getBonusColor()} 
          />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={styles.title}>보너스 포인트!</Text>
          <Text style={styles.points}>+{points}P</Text>
        </View>
        
        <TouchableOpacity onPress={hideNotification} style={styles.closeButton}>
          <Ionicons name="close" size={20} color="#666" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  content: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  points: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981',
  },
  closeButton: {
    padding: 4,
  },
});

export default BonusPointsNotification;
