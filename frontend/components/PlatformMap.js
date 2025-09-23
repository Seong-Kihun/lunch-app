import React from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';
import WebMap from './WebMap';

// 플랫폼별 지도 컴포넌트
const PlatformMap = (props) => {
  // 모든 플랫폼에서 웹뷰 기반 지도 사용
  return <WebMap {...props} />;
};

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  placeholderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#999',
  },
});

export default PlatformMap;
