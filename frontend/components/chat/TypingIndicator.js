/**
 * 타이핑 인디케이터 컴포넌트
 * 다른 사용자가 타이핑 중일 때 표시되는 컴포넌트입니다.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Colors from '../common/Colors';

const { width } = Dimensions.get('window');

const TypingIndicator = ({ typingText, typingUsers = [] }) => {
  const dotAnimation1 = useRef(new Animated.Value(0)).current;
  const dotAnimation2 = useRef(new Animated.Value(0)).current;
  const dotAnimation3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (typingUsers.length === 0) return;

    // 애니메이션 시작
    const startAnimation = () => {
      const createDotAnimation = (animValue) => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(animValue, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(animValue, {
              toValue: 0,
              duration: 600,
              useNativeDriver: true,
            }),
          ])
        );
      };

      Animated.parallel([
        createDotAnimation(dotAnimation1),
        Animated.loop(
          Animated.sequence([
            Animated.delay(200),
            createDotAnimation(dotAnimation2),
          ])
        ),
        Animated.loop(
          Animated.sequence([
            Animated.delay(400),
            createDotAnimation(dotAnimation3),
          ])
        ),
      ]).start();
    };

    startAnimation();
  }, [typingUsers.length]);

  if (typingUsers.length === 0) return null;

  const dot1Opacity = dotAnimation1.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  const dot2Opacity = dotAnimation2.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  const dot3Opacity = dotAnimation3.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  return (
    <View style={styles.container}>
      <View style={styles.indicatorContainer}>
        <View style={styles.avatar}>
          <MaterialIcons name="person" size={16} color={Colors.gray} />
        </View>
        
        <View style={styles.bubble}>
          <View style={styles.dotsContainer}>
            <Animated.View
              style={[
                styles.dot,
                { opacity: dot1Opacity }
              ]}
            />
            <Animated.View
              style={[
                styles.dot,
                { opacity: dot2Opacity }
              ]}
            />
            <Animated.View
              style={[
                styles.dot,
                { opacity: dot3Opacity }
              ]}
            />
          </View>
        </View>
      </View>
      
      <Text style={styles.typingText}>{typingText}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  indicatorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  bubble: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    maxWidth: width * 0.6,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.gray,
    marginHorizontal: 2,
  },
  typingText: {
    fontSize: 12,
    color: Colors.gray,
    marginTop: 4,
    marginLeft: 40,
  },
});

export default TypingIndicator;
