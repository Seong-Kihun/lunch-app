import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// 웹에서 사용할 수 있는 간단한 마커 컴포넌트
const WebMarker = ({ 
  coordinate, 
  title, 
  description,
  style,
  onPress,
  ...props 
}) => {
  return (
    <View style={[styles.marker, style]} {...props}>
      <View style={styles.markerPin}>
        <Text style={styles.markerText}>📍</Text>
      </View>
      {title && (
        <View style={styles.markerLabel}>
          <Text style={styles.markerTitle}>{title}</Text>
          {description && (
            <Text style={styles.markerDescription}>{description}</Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  marker: {
    position: 'absolute',
    alignItems: 'center',
  },
  markerPin: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  markerText: {
    fontSize: 16,
  },
  markerLabel: {
    position: 'absolute',
    top: 35,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    minWidth: 100,
    alignItems: 'center',
  },
  markerTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  markerDescription: {
    color: '#CCCCCC',
    fontSize: 10,
    marginTop: 2,
  },
});

export default WebMarker;
