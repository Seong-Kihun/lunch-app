import React, { useState, useEffect, useCallback } from 'react';
import {
    Text,
    View,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    ActivityIndicator,
    Alert,
    RefreshControl
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Context 및 유틸리티
import { useAuth } from '../../contexts/AuthContext';
import { COLORS } from '../../utils/colors';
import { RENDER_SERVER_URL } from '../../config';

export default function RestaurantsScreen({ navigation }) {
    const { user: currentUser } = useAuth();
    const [restaurants, setRestaurants] = useState([]);
    const [filteredRestaurants, setFilteredRestaurants] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        initUser();
    }, []);

    useFocusEffect(useCallback(() => {
        fetchRecommendations();
    }, []));

    const initUser = async () => {
        try {
            const storedUser = await AsyncStorage.getItem('@user_data');
            if (storedUser) {
                const userData = JSON.parse(storedUser);
                // 사용자 데이터 설정
            }
        } catch (error) {
            console.error('사용자 데이터 로드 오류:', error);
        }
    };

    const fetchRecommendations = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${RENDER_SERVER_URL}/restaurants/recommendations`);
            if (response.ok) {
                const data = await response.json();
                setRestaurants(data);
                setFilteredRestaurants(data);
            }
        } catch (error) {
            console.error('맛집 추천 로드 오류:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const addRestaurantVisit = async (restaurantId, visitDate, visitTime, partySize) => {
        try {
            const visitData = {
                restaurant_id: restaurantId,
                visit_date: visitDate,
                visit_time: visitTime,
                party_size: partySize,
                user_id: currentUser?.employee_id || '1'
            };

            const response = await fetch(`${RENDER_SERVER_URL}/restaurants/${restaurantId}/visits`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(visitData),
            });

            if (response.ok) {
                Alert.alert('성공', '방문 기록이 추가되었습니다!');
                // 방문 기록 추가 후 맛집 목록 새로고침
                fetchRecommendations();
            }
        } catch (error) {
            console.error('방문 기록 추가 오류:', error);
            Alert.alert('오류', '방문 기록 추가에 실패했습니다.');
        }
    };

    const handleTabPress = (tab) => {
        setActiveTab(tab);
        filterRestaurants(tab, searchQuery);
    };

    const filterRestaurants = (tab, query) => {
        let filtered = restaurants;

        // 탭별 필터링
        if (tab === 'favorites') {
            filtered = restaurants.filter(restaurant => restaurant.isFavorite);
        } else if (tab === 'visited') {
            filtered = restaurants.filter(restaurant => restaurant.visitCount > 0);
        } else if (tab === 'recommended') {
            filtered = restaurants.filter(restaurant => restaurant.recommendationScore > 0);
        }

        // 검색어 필터링
        if (query) {
            filtered = filtered.filter(restaurant =>
                restaurant.name.toLowerCase().includes(query.toLowerCase()) ||
                restaurant.category.toLowerCase().includes(query.toLowerCase()) ||
                restaurant.address.toLowerCase().includes(query.toLowerCase())
            );
        }

        setFilteredRestaurants(filtered);
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchRecommendations();
        setRefreshing(false);
    };

    const renderRestaurantItem = ({ item }) => (
        <TouchableOpacity
            style={styles.restaurantItem}
            onPress={() => navigation.navigate('RestaurantDetail', { restaurant: item })}
        >
            <View style={styles.restaurantHeader}>
                <Text style={styles.restaurantName}>{item.name}</Text>
                <View style={styles.ratingContainer}>
                    <Ionicons name="star" size={16} color={COLORS.warning} />
                    <Text style={styles.rating}>{item.avg_rating || 0}</Text>
                </View>
            </View>
            
            <Text style={styles.restaurantCategory}>{item.category}</Text>
            <Text style={styles.restaurantAddress}>{item.address}</Text>
            
            <View style={styles.restaurantFooter}>
                <View style={styles.visitInfo}>
                    <Ionicons name="people" size={16} color={COLORS.secondary} />
                    <Text style={styles.visitCount}>{item.visit_count || 0}명 방문</Text>
                </View>
                
                <TouchableOpacity
                    style={styles.addVisitButton}
                    onPress={() => {
                        // 방문 기록 추가 모달 또는 화면으로 이동
                        navigation.navigate('AddRestaurantVisit', { restaurant: item });
                    }}
                >
                    <Ionicons name="add-circle" size={20} color={COLORS.primary} />
                    <Text style={styles.addVisitText}>방문 기록</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    if (isLoading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>맛집 정보를 불러오는 중...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView 
                style={styles.container}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* 탭 네비게이션 */}
                <View style={styles.tabContainer}>
                    {['all', 'favorites', 'visited', 'recommended'].map((tab) => (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.tab, activeTab === tab && styles.activeTab]}
                            onPress={() => handleTabPress(tab)}
                        >
                            <Text style={[
                                styles.tabText,
                                activeTab === tab && styles.activeTabText
                            ]}>
                                {tab === 'all' ? '전체' :
                                 tab === 'favorites' ? '즐겨찾기' :
                                 tab === 'visited' ? '방문한 곳' :
                                 '추천'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* 맛집 목록 */}
                <FlatList
                    data={filteredRestaurants}
                    renderItem={renderRestaurantItem}
                    keyExtractor={item => item.id.toString()}
                    scrollEnabled={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="restaurant-outline" size={64} color={COLORS.textSecondary} />
                            <Text style={styles.emptyText}>
                                {activeTab === 'all' ? '등록된 맛집이 없습니다.' :
                                 activeTab === 'favorites' ? '즐겨찾기한 맛집이 없습니다.' :
                                 activeTab === 'visited' ? '방문한 맛집이 없습니다.' :
                                 '추천 맛집이 없습니다.'}
                            </Text>
                        </View>
                    }
                />
            </ScrollView>

            {/* 플로팅 액션 버튼 */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('AddRestaurant')}
            >
                <Ionicons name="add" size={24} color={COLORS.white} />
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    container: {
        flex: 1,
        padding: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: COLORS.text,
    },
    tabContainer: {
        flexDirection: 'row',
        marginBottom: 20,
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    activeTab: {
        backgroundColor: COLORS.primary,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.textSecondary,
    },
    activeTabText: {
        color: COLORS.white,
        fontWeight: '600',
    },
    restaurantItem: {
        backgroundColor: COLORS.surface,
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    restaurantHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    restaurantName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        flex: 1,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rating: {
        marginLeft: 4,
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.warning,
    },
    restaurantCategory: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: '500',
        marginBottom: 4,
    },
    restaurantAddress: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 12,
    },
    restaurantFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    visitInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    visitCount: {
        marginLeft: 4,
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    addVisitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: COLORS.primaryLight,
        borderRadius: 16,
    },
    addVisitText: {
        marginLeft: 4,
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: '500',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
});
