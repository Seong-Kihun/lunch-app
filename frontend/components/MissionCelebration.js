import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const MissionCelebration = ({ visible, missionTitle, points, onComplete }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // 축하 애니메이션 시작
      Animated.sequence([
        // 스케일 애니메이션
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        // 잠시 대기
        Animated.delay(1000),
        // 페이드 아웃
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

      // 컨페티 애니메이션
      Animated.timing(confettiAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      }).start();
    } else {
      // 초기 상태로 리셋
      scaleAnim.setValue(0);
      opacityAnim.setValue(1);
      confettiAnim.setValue(0);
    }
  }, [visible]);

  // visible이 false일 때 애니메이션 정리
  useEffect(() => {
    if (!visible) {
      // 모든 애니메이션 중지
      scaleAnim.stopAnimation();
      opacityAnim.stopAnimation();
      confettiAnim.stopAnimation();
      
      // 초기 상태로 즉시 리셋
      scaleAnim.setValue(0);
      opacityAnim.setValue(1);
      confettiAnim.setValue(0);
    }
  }, [visible, scaleAnim, opacityAnim, confettiAnim]);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      {/* 컨페티 효과 */}
      <Animated.View 
        style={[
          styles.confetti,
          {
            opacity: confettiAnim,
            transform: [{ translateY: confettiAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -height]
            })}]
          }
        ]}
      >
        {[...Array(20)].map((_, i) => (
          <View
            key={i}
            style={[
              styles.confettiPiece,
              {
                left: Math.random() * width,
                backgroundColor: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'][i % 5],
                animationDelay: Math.random() * 1000,
              }
            ]}
          />
        ))}
      </Animated.View>

      {/* 축하 메시지 */}
      <Animated.View
        style={[
          styles.celebrationContainer,
          {
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.celebrationContent}>
          <View style={styles.iconContainer}>
            <Ionicons name="trophy" size={60} color="#FFD700" />
          </View>
          
          <Text style={styles.congratsText}>축하합니다! 🎉</Text>
          <Text style={styles.missionText}>{missionTitle}</Text>
          <Text style={styles.pointsText}>+{points}P 획득!</Text>
          
          <View style={styles.sparkles}>
            <Ionicons name="sparkles" size={24} color="#FFD700" />
            <Ionicons name="sparkles" size={24} color="#FFD700" />
            <Ionicons name="sparkles" size={24} color="#FFD700" />
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  confetti: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  confettiPiece: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  celebrationContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    maxWidth: width * 0.8,
  },
  celebrationContent: {
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
  },
  congratsText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  missionText: {
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  pointsText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 16,
  },
  sparkles: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: 120,
  },
});

export default MissionCelebration;
