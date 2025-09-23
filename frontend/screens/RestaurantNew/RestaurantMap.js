import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

// 컴포넌트
import PlatformMap from '../../components/PlatformMap';
import PlatformMarker from '../../components/PlatformMarker';
import MapFallback from '../../components/RestaurantNew/MapFallback';

// react-native-maps에서 PROVIDER_GOOGLE 안전하게 import
let PROVIDER_GOOGLE = null;
try {
  const Maps = require('react-native-maps');
  PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE || Maps.default?.PROVIDER_GOOGLE;
} catch (error) {
  console.warn('PROVIDER_GOOGLE을 불러올 수 없습니다:', error);
}

// 유틸리티
import { COLORS } from '../../utils/colors';

const RestaurantMap = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { 
    restaurants = [], 
    currentLocation: initialLocation, 
    selectedRestaurant: initialSelectedRestaurant,
    centerOnRestaurant = false 
  } = route.params || {};
  
  const [mapRegion, setMapRegion] = useState(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState(initialSelectedRestaurant);
  const [mapError, setMapError] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(initialLocation);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  
  const currentColors = global.currentColors || COLORS.light;

  useEffect(() => {
    initializeMap();
  }, []);

  const initializeMap = () => {
    if (centerOnRestaurant && initialSelectedRestaurant && initialSelectedRestaurant.latitude && initialSelectedRestaurant.longitude) {
      // 특정 식당을 중심으로 지도 표시
      setMapRegion({
        latitude: initialSelectedRestaurant.latitude,
        longitude: initialSelectedRestaurant.longitude,
        latitudeDelta: 0.005, // 더 가까운 줌 레벨
        longitudeDelta: 0.005,
      });
      setSelectedRestaurant(initialSelectedRestaurant);
    } else if (currentLocation) {
      setMapRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } else {
      // 기본 위치 (KOICA 본관)
      setMapRegion({
        latitude: 37.41504641,
        longitude: 127.0993841,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  const handleMarkerPress = (restaurant) => {
    setSelectedRestaurant(restaurant);
  };

  const handleRestaurantPress = (restaurant) => {
    navigation.navigate('RestaurantDetail', { restaurant });
  };

  const formatDistance = (distance) => {
    if (!distance) return '';
    return distance < 1 
      ? `${Math.round(distance * 1000)}m`
      : `${distance.toFixed(1)}km`;
  };

  // 현재 위치 가져오기
  const getCurrentLocation = async () => {
    try {
      setIsLocationLoading(true);
      
      // 위치 권한 요청
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('위치 권한', '위치 정보 접근 권한이 필요합니다.');
        return;
      }

      // 현재 위치 가져오기
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setCurrentLocation(newLocation);
      
      // 지도 중심을 현재 위치로 이동
      setMapRegion({
        latitude: newLocation.latitude,
        longitude: newLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

      console.log('현재 위치:', newLocation);
    } catch (error) {
      console.error('위치 가져오기 실패:', error);
      Alert.alert('위치 오류', '현재 위치를 가져올 수 없습니다.');
    } finally {
      setIsLocationLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background }]}>
      {/* 실제 지도 */}
      <View style={styles.mapContainer}>
        {mapRegion && (
          <PlatformMap
            style={styles.map}
            region={mapRegion}
            currentLocation={currentLocation}
            markers={restaurants.map(restaurant => ({
              coordinate: {
                latitude: restaurant.latitude,
                longitude: restaurant.longitude,
              },
              title: restaurant.name,
              description: restaurant.category,
              name: restaurant.name,
              category: restaurant.category,
            }))}
            onMarkerPress={(data, index) => {
              setSelectedRestaurant(restaurants[index]);
            }}
            onPress={() => setSelectedRestaurant(null)}
          />
        )}
      </View>

      {/* 선택된 식당 정보 카드 */}
      {selectedRestaurant && (
        <View style={[styles.restaurantCard, { backgroundColor: currentColors.surface }]}>
          <View style={styles.cardHeader}>
            <View style={styles.restaurantInfo}>
              <Text style={[styles.restaurantName, { color: currentColors.text }]}>
                {selectedRestaurant.name}
              </Text>
              <Text style={[styles.restaurantCategory, { color: currentColors.primary }]}>
                {selectedRestaurant.category}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedRestaurant(null)}
            >
              <Ionicons name="close" size={24} color={currentColors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.restaurantAddress, { color: currentColors.textSecondary }]}>
            {selectedRestaurant.address}
          </Text>

          <View style={styles.cardFooter}>
            <View style={styles.infoRow}>
              {selectedRestaurant.distance && (
                <View style={styles.distanceContainer}>
                  <Ionicons name="location" size={16} color={currentColors.primary} />
                  <Text style={[styles.distance, { color: currentColors.primary }]}>
                    {formatDistance(selectedRestaurant.distance)}
                  </Text>
                </View>
              )}
              {selectedRestaurant.phone && (
                <View style={styles.phoneContainer}>
                  <Ionicons name="call" size={16} color={currentColors.primary} />
                  <Text style={[styles.phoneText, { color: currentColors.textSecondary }]}>
                    {selectedRestaurant.phone}
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={[styles.detailButton, { backgroundColor: currentColors.primary }]}
              onPress={() => handleRestaurantPress(selectedRestaurant)}
            >
              <Text style={styles.detailButtonText}>상세보기</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 목록보기 플로팅 버튼 */}
      <TouchableOpacity
        style={[styles.floatingListButton, { backgroundColor: currentColors.primary }]}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="list" size={20} color="white" />
        <Text style={styles.floatingListButtonText}>목록보기</Text>
      </TouchableOpacity>

      {/* 현재 위치 버튼 */}
      <TouchableOpacity
        style={[styles.locationButton, { backgroundColor: currentColors.surface }]}
        onPress={getCurrentLocation}
        disabled={isLocationLoading}
      >
        {isLocationLoading ? (
          <Ionicons name="refresh" size={20} color={currentColors.primary} />
        ) : (
          <Ionicons name="locate" size={20} color={currentColors.primary} />
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  restaurantCard: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  restaurantInfo: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  restaurantCategory: {
    fontSize: 14,
    fontWeight: '500',
  },
  closeButton: {
    padding: 4,
  },
  restaurantAddress: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distance: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  phoneText: {
    fontSize: 14,
    marginLeft: 4,
  },
  detailButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  detailButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  floatingListButton: {
    position: 'absolute',
    bottom: 30,
    left: '50%',
    marginLeft: -60, // 버튼 너비의 절반만큼 왼쪽으로 이동
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 120,
  },
  floatingListButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  locationButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
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
});

export default RestaurantMap;
