import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 컴포넌트
import RestaurantCard from '../../components/RestaurantNew/RestaurantCard';
import SearchBar from '../../components/RestaurantNew/SearchBar';
import FilterChips from '../../components/RestaurantNew/FilterChips';

// 유틸리티
import appService from '../services/AppService';
import{ COLORS } from '../../utils/colors';

const { width } = Dimensions.get('window');

const RestaurantHome = ({ navigation }) => {
  // 상태 관리
  const [restaurants, setRestaurants] = useState([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [sortBy, setSortBy] = useState('distance');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [categories, setCategories] = useState([]);

  // 현재 색상 테마
  const currentColors = global.currentColors || COLORS.light;

  // 화면 포커스 시 데이터 로드
  useFocusEffect(
    useCallback(() => {
      loadInitialData();
    }, [])
  );

  // 초기 데이터 로드
  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      
      // 병렬로 데이터 로드
      await Promise.all([
        loadRestaurants(),
        loadCategories(),
        getCurrentLocation()
      ]);
      
    } catch (error) {
      console.error('초기 데이터 로드 실패:', error);
      Alert.alert('오류', '데이터를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 현재 위치 가져오기
  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('위치 권한이 거부되었습니다.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
    } catch (error) {
      console.error('위치 정보 가져오기 실패:', error);
    }
  };

  // 식당 목록 로드
  const loadRestaurants = async () => {
    try {
      const params = new URLSearchParams();
      
      if (searchQuery) params.append('search', searchQuery);
      if (selectedCategories.length > 0) {
        selectedCategories.forEach(category => {
          params.append('category', category);
        });
      }
      if (currentLocation) {
        params.append('lat', currentLocation.latitude);
        params.append('lng', currentLocation.longitude);
        params.append('radius', '5');
      }
      // 백엔드에서 지원하는 정렬만 전송
      if (['distance', 'rating', 'name'].includes(sortBy)) {
        params.append('sort', sortBy);
      }
      
      params.append('limit', '1000'); // 모든 식당을 가져오기 위해 큰 값 설정

      const response = await appService.get(`/dev/api/v2/restaurants?${params});
      
      if (!response.ok) {
        throw new Error(`)`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // 개발용 API는 data.restaurants에 데이터가 있음
        const restaurantsData = data.restaurants || data.data?.restaurants || [];
        
        // 식당 데이터에 통계 정보 추가
        const enrichedRestaurants = await enrichRestaurantDataAsync(restaurantsData);
        
        // 클라이언트 사이드 정렬 적용
        const sortedRestaurants = sortRestaurants(enrichedRestaurants, sortBy);
        
        setRestaurants(sortedRestaurants);
        setFilteredRestaurants(sortedRestaurants);
      } else {
        throw new Error(data.error || '식당 데이터 로드 실패');
      }
      
    } catch (error) {
      console.error('식당 목록 로드 실패:', error);
      // 오프라인 모드 - 빈 배열로 설정
      setRestaurants([]);
      setFilteredRestaurants([]);
    }
  };

  // 카테고리 목록 로드
  const loadCategories = async () => {
    try {
      const response = await appService.get(`/api/v2/restaurants/categories);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCategories(data.data.categories);
        }
      }
    } catch (error) {
      console.error(`)'카테고리 로드 실패:', error);
    }
  };

  // 새로고침
  const onRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  };

  // 검색 처리
  const handleSearch = (query) => {
    setSearchQuery(query);
    // 검색은 loadRestaurants에서 처리됨
  };

  // 카테고리 필터 처리 (다중 선택)
  const handleCategoryFilter = (category) => {
    setSelectedCategories(prev => {
      if (prev.includes(category)) {
        // 이미 선택된 카테고리면 제거
        return prev.filter(c => c !== category);
      } else {
        // 선택되지 않은 카테고리면 추가
        return [...prev, category];
      }
    });
  };

  // 전체 보기 처리
  const handleShowAll = () => {
    setSelectedCategories([]);
  };

  // 정렬 처리
  const handleSort = (sortType) => {
    setSortBy(sortType);
  };

  // 비동기로 식당 데이터에 통계 정보 추가 (백엔드 API에서 이미 제공하므로 단순화)
  const enrichRestaurantDataAsync = async (restaurants) => {
    return Promise.all(restaurants.map(async (restaurant) => {
      try {
        // 백엔드 API에서 이미 recommend_count와 saved_count를 제공하므로
        // 추가 API 호출 없이 데이터를 그대로 사용
        return {
          ...restaurant,
          reviewCount: restaurant.review_count || 0,
          savedCount: restaurant.saved_count || 0,
          recommendCount: restaurant.recommend_count || 0,
          averageRating: restaurant.rating || 0,
          keywords: [] // 필요시 별도 API로 구현
        };
      } catch (error) {
        console.error(`식당 ${restaurant.id} 데이터 보강 실패:`, error);
        return restaurant;
      }
    }));
  };

  // 식당 정렬 함수
  const sortRestaurants = (restaurants, sortType) => {
    const sorted = [...restaurants];
    
    switch (sortType) {
      case 'distance':
        return sorted.sort((a, b) => (a.distance || 0) - (b.distance || 0));
      case 'rating':
        return sorted.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
      case 'name':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'recommend':
        return sorted.sort((a, b) => (b.recommendCount || 0) - (a.recommendCount || 0));
      case 'saved':
        return sorted.sort((a, b) => (b.savedCount || 0) - (a.savedCount || 0));
      case 'reviews':
        return sorted.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
      default:
        return sorted;
    }
  };

  // 평균 평점 계산
  const calculateAverageRating = (reviews) => {
    if (reviews.length === 0) return 0;
    const totalRating = reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
    return totalRating / reviews.length;
  };

  // 키워드 추출
  const extractKeywords = (reviews) => {
    const keywords = [];
    reviews.forEach(review => {
      if (review.keywords) {
        keywords.push(...review.keywords);
      }
    });
    return [...new Set(keywords)]; // 중복 제거
  };

  // 식당 카드 클릭
  const handleRestaurantPress = (restaurant) => {
    navigation.navigate('RestaurantDetail', { restaurant });
  };

  // 지도 보기
  const handleMapView = () => {
    navigation.navigate('RestaurantMap', { 
      restaurants: filteredRestaurants,
      currentLocation 
    });
  };

  // 검색 실행 (검색어 변경 시)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery !== '' || selectedCategories.length > 0) {
        loadRestaurants();
      }
    }, 500); // 500ms 디바운스

    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedCategories, sortBy, currentLocation]);

  // 로딩 화면
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={currentColors.primary} />
          <Text style={[styles.loadingText, { color: currentColors.text }]}>
            맛집 정보를 불러오는 중...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background }]}>
      {/* 검색바 */}
      <SearchBar
        value={searchQuery}
        onChangeText={handleSearch}
        placeholder="식당명, 주소, 카테고리로 검색..."
        colors={currentColors}
      />

      {/* 필터 섹션 */}
      <View style={[styles.filterSection, { backgroundColor: currentColors.surface }]}>
        <View style={styles.filterHeader}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChipsContainer}>
            <FilterChips
              categories={categories}
              selectedCategories={selectedCategories}
              onCategorySelect={handleCategoryFilter}
              onShowAll={handleShowAll}
              colors={currentColors}
            />
          </ScrollView>
        </View>
        
        {/* 정렬 옵션 - 소통탭 스타일 */}
        <View style={styles.sortContainer}>
          <Text style={[styles.sortLabel, { color: currentColors.textSecondary }]}>
            정렬:
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
              { key: 'distance', label: '거리순' },
              { key: 'rating', label: '평점순' },
              { key: 'name', label: '이름순' },
              { key: 'recommend', label: '오찬추천순' },
              { key: 'saved', label: '저장순' },
              { key: 'reviews', label: '리뷰순' }
            ].map((sort) => (
              <TouchableOpacity
                key={sort.key}
                style={[
                  styles.sortButton,
                  {
                    backgroundColor: sortBy === sort.key ? currentColors.primary : '#FFFFFF',
                    borderColor: sortBy === sort.key ? currentColors.primary : '#E5E7EB',
                    elevation: sortBy === sort.key ? 4 : 0,
                    shadowColor: sortBy === sort.key ? currentColors.primary : 'transparent',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: sortBy === sort.key ? 0.3 : 0,
                    shadowRadius: 4
                  }
                ]}
                onPress={() => handleSort(sort.key)}
              >
                <Text style={[
                  styles.sortButtonText,
                  { 
                    color: sortBy === sort.key ? '#FFFFFF' : currentColors.text,
                    fontWeight: sortBy === sort.key ? 'bold' : '600',
                    fontSize: 14
                  }
                ]}>
                  {sort.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* 식당 목록 */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredRestaurants.length > 0 ? (
          <View style={styles.restaurantList}>
            {filteredRestaurants.map((restaurant) => (
              <RestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
                onPress={() => handleRestaurantPress(restaurant)}
                colors={currentColors}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons 
              name="restaurant-outline" 
              size={64} 
              color={currentColors.textSecondary} 
            />
            <Text style={[styles.emptyText, { color: currentColors.textSecondary }]}>
              {searchQuery || selectedCategories.length > 0
                ? '검색 결과가 없습니다.' 
                : '등록된 맛집이 없습니다.'}
            </Text>
            <TouchableOpacity
              style={[styles.refreshButton, { backgroundColor: currentColors.primary }]}
              onPress={onRefresh}
            >
              <Text style={styles.refreshButtonText}>새로고침</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      
      {/* 지도 보기 플로팅 버튼 */}
      <TouchableOpacity 
        style={[styles.floatingMapButton, { backgroundColor: currentColors.primary }]}
        onPress={handleMapView}
      >
        <Ionicons name="map" size={20} color="white" />
        <Text style={styles.floatingMapButtonText}>지도 보기</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  floatingMapButton: {
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
  floatingMapButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  filterSection: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  filterChipsContainer: {
    flex: 1,
    marginRight: 12,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 8,
  },
  sortLabel: {
    fontSize: 14,
    marginRight: 8,
  },
  sortButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  restaurantList: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  refreshButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default RestaurantHome;
