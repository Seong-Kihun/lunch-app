import React, { useState, useEffect } from 'react';
import {
    Text,
    View,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Dimensions
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';

// 유틸리티
import { COLORS } from '../utils/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function RestaurantItem({ restaurant, navigation, activeTab, currentColors, onAddVisit }) {
    const [isFavorite, setIsFavorite] = useState(false);
    const [visitCount, setVisitCount] = useState(0);

    useEffect(() => {
        checkFavoriteStatus();
        loadVisitCount();
    }, [restaurant.id]);

    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        if (!lat1 || !lon1 || !lat2 || !lon2) return null;
        
        const R = 6371; // 지구의 반지름 (km)
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        
        return distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`;
    };

    const checkFavoriteStatus = async () => {
        try {
            const favorites = await AsyncStorage.getItem('@favorite_restaurants');
            if (favorites) {
                const favoriteList = JSON.parse(favorites);
                setIsFavorite(favoriteList.includes(restaurant.id));
            }
        } catch (error) {
            console.error('즐겨찾기 상태 확인 오류:', error);
        }
    };

    const toggleFavorite = async () => {
        try {
            const favorites = await AsyncStorage.getItem('@favorite_restaurants') || '[]';
            const favoriteList = JSON.parse(favorites);
            
            if (isFavorite) {
                const newFavorites = favoriteList.filter(id => id !== restaurant.id);
                await AsyncStorage.setItem('@favorite_restaurants', JSON.stringify(newFavorites));
                setIsFavorite(false);
            } else {
                favoriteList.push(restaurant.id);
                await AsyncStorage.setItem('@favorite_restaurants', JSON.stringify(favoriteList));
                setIsFavorite(true);
            }
        } catch (error) {
            console.error('즐겨찾기 토글 오류:', error);
            Alert.alert('오류', '즐겨찾기 처리에 실패했습니다.');
        }
    };

    const loadVisitCount = async () => {
        try {
            const visits = await AsyncStorage.getItem(`@restaurant_visits_${restaurant.id}`);
            if (visits) {
                const visitList = JSON.parse(visits);
                setVisitCount(visitList.length);
            }
        } catch (error) {
            console.error('방문 횟수 로드 오류:', error);
        }
    };

    const handleRestaurantPress = () => {
        navigation.navigate('RestaurantDetail', { restaurant });
    };

    const handleAddVisit = () => {
        if (onAddVisit) {
            onAddVisit(restaurant);
        } else {
            navigation.navigate('AddRestaurantVisit', { restaurant });
        }
    };

    const colors = currentColors || COLORS;

    return (
        <TouchableOpacity
            style={[styles.container, { backgroundColor: colors.surface }]}
            onPress={handleRestaurantPress}
            activeOpacity={0.7}
        >
            <View style={styles.header}>
                <View style={styles.titleContainer}>
                    <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                        {restaurant.name}
                    </Text>
                    <View style={styles.categoryContainer}>
                        <Text style={[styles.category, { color: colors.primary }]}>
                            {restaurant.category}
                        </Text>
                    </View>
                </View>
                
                <TouchableOpacity
                    style={styles.favoriteButton}
                    onPress={toggleFavorite}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons
                        name={isFavorite ? "heart" : "heart-outline"}
                        size={24}
                        color={isFavorite ? colors.error : colors.textSecondary}
                    />
                </TouchableOpacity>
            </View>

            <View style={styles.infoContainer}>
                <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                    <Text style={[styles.address, { color: colors.textSecondary }]} numberOfLines={2}>
                        {restaurant.address}
                    </Text>
                </View>

                {restaurant.latitude && restaurant.longitude && (
                    <View style={styles.infoRow}>
                        <Ionicons name="navigate-outline" size={16} color={colors.textSecondary} />
                        <Text style={[styles.distance, { color: colors.textSecondary }]}>
                            {calculateDistance(37.5665, 126.9780, restaurant.latitude, restaurant.longitude)}
                        </Text>
                    </View>
                )}

                <View style={styles.infoRow}>
                    <Ionicons name="star" size={16} color={colors.warning} />
                    <Text style={[styles.rating, { color: colors.textSecondary }]}>
                        {restaurant.avg_rating || 0} ({restaurant.review_count || 0}개 리뷰)
                    </Text>
                </View>

                <View style={styles.infoRow}>
                    <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
                    <Text style={[styles.visitCount, { color: colors.textSecondary }]}>
                        {visitCount}명 방문
                    </Text>
                </View>
            </View>

            <View style={styles.actionContainer}>
                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.primaryLight }]}
                    onPress={handleAddVisit}
                >
                    <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
                    <Text style={[styles.actionButtonText, { color: colors.primary }]}>
                        방문 기록
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.secondaryLight }]}
                    onPress={() => navigation.navigate('WriteReview', { restaurant })}
                >
                    <Ionicons name="chatbubble-outline" size={16} color={colors.secondary} />
                    <Text style={[styles.actionButtonText, { color: colors.secondary }]}>
                        리뷰 작성
                    </Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 16,
        borderRadius: 12,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    titleContainer: {
        flex: 1,
        marginRight: 12,
    },
    name: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 6,
        lineHeight: 22,
    },
    categoryContainer: {
        alignSelf: 'flex-start',
    },
    category: {
        fontSize: 12,
        fontWeight: '600',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
    },
    favoriteButton: {
        padding: 4,
    },
    infoContainer: {
        marginBottom: 16,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    address: {
        fontSize: 14,
        marginLeft: 6,
        flex: 1,
        lineHeight: 18,
    },
    distance: {
        fontSize: 14,
        marginLeft: 6,
    },
    rating: {
        fontSize: 14,
        marginLeft: 6,
    },
    visitCount: {
        fontSize: 14,
        marginLeft: 6,
    },
    actionContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        flex: 1,
        marginHorizontal: 4,
        justifyContent: 'center',
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 6,
    },
});
