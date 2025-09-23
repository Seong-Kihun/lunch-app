import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const RestaurantCard = ({ restaurant, onPress, colors }) => {
  const handlePress = () => {
    if (onPress) {
      onPress(restaurant);
    }
  };

  const formatDistance = (distance) => {
    if (!distance) return '';
    return distance < 1 
      ? `${Math.round(distance * 1000)}m`
      : `${distance.toFixed(1)}km`;
  };

  const formatRating = (rating) => {
    if (!rating || rating === 0) return '평점 없음';
    return `${rating.toFixed(1)}`;
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.surface }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* 식당 정보 */}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {restaurant.name}
          </Text>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color="#FFD700" />
            <Text style={[styles.rating, { color: colors.text }]}>
              {formatRating(restaurant.rating)}
            </Text>
          </View>
        </View>

        <Text style={[styles.category, { color: colors.primary }]} numberOfLines={1}>
          {restaurant.category || '기타'}
        </Text>

        <Text style={[styles.address, { color: colors.textSecondary }]} numberOfLines={2}>
          {restaurant.address}
        </Text>

        {/* 하단 정보 */}
        <View style={styles.footer}>
          <View style={styles.infoRow}>
            {restaurant.distance && (
              <View style={styles.distanceContainer}>
                <Ionicons name="location" size={14} color={colors.primary} />
                <Text style={[styles.distance, { color: colors.primary }]}>
                  {formatDistance(restaurant.distance)}
                </Text>
              </View>
            )}
            
            {restaurant.phone && (
              <View style={styles.phoneContainer}>
                <Ionicons name="call" size={14} color={colors.textSecondary} />
                <Text style={[styles.phone, { color: colors.textSecondary }]} numberOfLines={1}>
                  {restaurant.phone}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primaryLight }]}
              onPress={handlePress}
            >
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  category: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  address: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  distance: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  phone: {
    fontSize: 12,
    marginLeft: 4,
  },
  actionContainer: {
    marginLeft: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default RestaurantCard;

