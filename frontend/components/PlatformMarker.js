import React from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';
import WebMarker from './WebMarker';

// 플랫폼별 마커 컴포넌트
const PlatformMarker = (props) => {
  if (Platform.OS === 'web') {
    return <WebMarker {...props} />;
  }
  
  // 모바일에서는 expo-maps의 Marker 사용
  try {
    const { ExpoMapMarker } = require('expo-maps');
    
    if (!ExpoMapMarker) {
      throw new Error('ExpoMapMarker not found');
    }
    
    return <ExpoMapMarker {...props} />;
  } catch (error) {
    console.warn('expo-maps Marker를 사용할 수 없습니다:', error);
    // expo-maps가 안되면 react-native-maps 시도
    try {
      const Maps = require('react-native-maps');
      const Marker = Maps.default?.Marker || Maps.Marker;
      
      if (!Marker) {
        throw new Error('Marker not found');
      }
      
      return <Marker {...props} />;
    } catch (error2) {
      console.warn('react-native-maps Marker도 사용할 수 없습니다:', error2);
      // 마커 대신 간단한 뷰 반환
      return (
        <View style={styles.markerPlaceholder}>
          <Text style={styles.markerText}>📍</Text>
        </View>
      );
    }
  }
};

const styles = StyleSheet.create({
  markerPlaceholder: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerText: {
    fontSize: 20,
  },
});

export default PlatformMarker;
