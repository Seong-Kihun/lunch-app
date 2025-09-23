import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MapFallback = ({ restaurants = [], onRestaurantSelect, colors }) => {
  const currentColors = colors || { text: '#333', surface: '#fff', primary: '#3B82F6' };

  const handleRestaurantPress = (restaurant) => {
    if (onRestaurantSelect) {
      onRestaurantSelect(restaurant);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background }]}>
      {/* 상단 정보 */}
      <View style={[styles.topInfo, { backgroundColor: currentColors.surface }]}>
        <Text style={[styles.infoTitle, { color: currentColors.text }]}>
          🍽️ 근처 식당 {restaurants.length}개
        </Text>
        <Text style={[styles.infoSubtitle, { color: currentColors.textSecondary }]}>
          거리순으로 정렬되어 있습니다
        </Text>
      </View>

      {/* 식당 목록 */}
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {restaurants.map((restaurant, index) => (
          <TouchableOpacity
            key={restaurant.id || index}
            style={[styles.restaurantItem, { borderBottomColor: currentColors.border || '#f0f0f0' }]}
            onPress={() => handleRestaurantPress(restaurant)}
          >
            <View style={styles.restaurantInfo}>
              <Text style={[styles.restaurantName, { color: currentColors.text }]}>
                {restaurant.name}
              </Text>
              <Text style={[styles.restaurantAddress, { color: currentColors.textSecondary || '#666' }]}>
                {restaurant.address}
              </Text>
              {restaurant.category && (
                <Text style={[styles.restaurantCategory, { color: currentColors.primary }]}>
                  {restaurant.category}
                </Text>
              )}
            </View>
            <View style={styles.distanceInfo}>
              <Ionicons name="location" size={16} color={currentColors.primary} />
              <Text style={[styles.distanceText, { color: currentColors.textSecondary || '#666' }]}>
                {restaurant.distance ? `${restaurant.distance.toFixed(1)}km` : '거리 정보 없음'}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* 하단 안내 */}
      <View style={[styles.footer, { backgroundColor: currentColors.surface }]}>
        <Text style={[styles.footerText, { color: currentColors.textSecondary || '#666' }]}>
          💡 식당을 탭하면 상세 정보를 확인할 수 있습니다
        </Text>
        <Text style={[styles.footerSubtext, { color: currentColors.textSecondary || '#999' }]}>
          전화번호, 주소, 카테고리 정보를 확인하세요
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topInfo: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  infoSubtitle: {
    fontSize: 14,
  },
  list: {
    flex: 1,
  },
  restaurantItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  restaurantInfo: {
    flex: 1,
    marginRight: 12,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  restaurantAddress: {
    fontSize: 14,
    marginBottom: 4,
  },
  restaurantCategory: {
    fontSize: 12,
    fontWeight: '500',
  },
  distanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 12,
    marginLeft: 4,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 10,
    textAlign: 'center',
  },
});

export default MapFallback;
