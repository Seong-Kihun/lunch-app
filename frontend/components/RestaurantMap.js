import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import appService from '../services/AppService'import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Dimensions,
  Alert,
  ActivityIndicator,
  PanResponder,
  Animated,
  Modal,
  Image,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';
import PlatformMap from './PlatformMap';
import PlatformMarker from './PlatformMarker';
import { PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_LOCATION, SEARCH_RADIUS, RENDER_SERVER_URL } from '../config';
// Excel 데이터 로드 제거 - API만 사용
import RestaurantRequestModal from './RestaurantRequestModal';
import VisitRecordModal from './VisitRecordModal';

const { width, height } = Dimensions.get('window');
const SEARCH_BAR_HEIGHT = 72; // 검색창 높이(패딩 포함)
const MIN_LIST_HEIGHT = height * 0.29; // 최소 리스트 높이 (화면의 30% - 기존과 동일)
const DEFAULT_LIST_HEIGHT = height * 0.55; // 기본 진입시 높이 (화면의 30% - 기존과 동일)
const MAX_LIST_HEIGHT = height - SEARCH_BAR_HEIGHT + 100; // 최대 리스트 높이 (검색창 바로 아래까지, 둥근 모서리 여유)

const RestaurantMap = (props) => {
  const navigation = useNavigation();
  const route = useRoute();
  const currentColors = props.currentColors || {
    primary: '#3B82F6',
    primaryLight: 'rgba(59, 130, 246, 0.1)',
    background: '#F1F5F9',
    surface: '#FFFFFF',
    text: '#1E293B',
    textSecondary: '#64748B',
    border: '#E2E8F0',
    gray: '#64748B',
    lightGray: '#E2E8F0',
    yellow: '#F4D160',
    deepBlue: '#1D5D9B',
    blue: '#3B82F6',
    disabled: '#CBD5E0',
  };
  

  const [location, setLocation] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [restaurantsWithData, setRestaurantsWithData] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('distance');
  const [loading, setLoading] = useState(true);
  const mapRef = useRef(null);

  // 애니메이션 값들
  const listHeightAnim = useRef(new Animated.Value(DEFAULT_LIST_HEIGHT)).current;
  const [listHeight, setListHeight] = useState(DEFAULT_LIST_HEIGHT);

  // 필터/정렬 상태
  const [activeCategories, setActiveCategories] = useState([]); // 여러 카테고리 선택
  const [activeSort, setActiveSort] = useState('평점순');
  
  // 초기 정렬 상태 설정
  useEffect(() => {
    setActiveSort('평점순');
    setSortBy('rating');
  }, []);
  
  // route.params에서 식당 신청 팝업 표시 요청 확인
  useEffect(() => {
    if (route.params?.showRestaurantRequest) {
      setShowRestaurantRequest(true);
      // 파라미터 초기화
      navigation.setParams({ showRestaurantRequest: undefined });
    }
  }, [route.params?.showRestaurantRequest, navigation]);
  
  // 확장된 카테고리 옵션
  const categoryOptions = [
    '한식', '중식', '일식', '양식', '분식', '카페', '디저트', '술집', '치킨', '피자', '햄버거', '샌드위치'
  ];
  
  // 확장된 정렬 옵션
  const sortOptions = [
    '평점순', '리뷰순', '오찬추천순', '거리순', '가격순', '인기순', '최신순'
  ];
  
  // 가격대 필터 옵션
  const priceOptions = ['전체', '1만원 이하', '1-2만원', '2-3만원', '3만원 이상'];
  const [activePriceRange, setActivePriceRange] = useState('전체');
  
  // 영업시간 필터 옵션
  const timeOptions = ['전체', '아침', '점심', '저녁', '야간'];
  const [activeTimeFilter, setActiveTimeFilter] = useState('전체');
  
  // 별점 필터 옵션
  const ratingOptions = ['전체', '4.5점 이상', '4.0점 이상', '3.5점 이상', '3.0점 이상'];
  
  // 식당 신청 팝업 상태
  const [showRestaurantRequest, setShowRestaurantRequest] = useState(false);
  const [activeRatingFilter, setActiveRatingFilter] = useState('전체');
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [isMapMoved, setIsMapMoved] = useState(false);
  const [mapBounds, setMapBounds] = useState(null);
  const [searchHistory, setSearchHistory] = useState([]);
  const [showSearchHistory, setShowSearchHistory] = useState(false);

  const [popularRestaurants, setPopularRestaurants] = useState([]); // 인기 식당 목록
  const [showPopularRestaurants, setShowPopularRestaurants] = useState(false); // 인기 식당 표시 여부
  const [personalizedRecommendations, setPersonalizedRecommendations] = useState([]); // 개인화 추천 목록
  const [showRecommendations, setShowRecommendations] = useState(false); // 개인화 추천 표시 여부
  const [showVisitModal, setShowVisitModal] = useState(false); // 방문 기록 모달 표시 여부
  const [selectedRestaurantForVisit, setSelectedRestaurantForVisit] = useState(null); // 방문 기록용 선택된 식당
  const [searchCache, setSearchCache] = useState(new Map()); // 검색 결과 캐싱
  const [isOffline, setIsOffline] = useState(false); // 오프라인 상태
  const [offlineData, setOfflineData] = useState([]); // 오프라인용 로컬 데이터
  const [mapAreaResults, setMapAreaResults] = useState([]); // 지도 영역 검색 결과
  const [isMapAreaSearch, setIsMapAreaSearch] = useState(false); // 지도 영역 검색 모드
  const [mapRegion, setMapRegion] = useState(null); // 지도의 현재 영역
  const [requestModalVisible, setRequestModalVisible] = useState(false); // 식당 신청 모달
  const [isListFullyExpanded, setIsListFullyExpanded] = useState(false); // 리스트가 완전히 확장되었는지 여부
  const [isAllRestaurantsLoaded, setIsAllRestaurantsLoaded] = useState(false); // 모든 식당이 로드되었는지 여부
  
  // 무한 스크롤 관련 상태
  const [displayedRestaurants, setDisplayedRestaurants] = useState([]); // 현재까지 로드된 식당들
  const [mapDisplayedRestaurants, setMapDisplayedRestaurants] = useState([]); // 지도에 표시될 식당들 (최대 100개)
  const [isLoadingMore, setIsLoadingMore] = useState(false); // 추가 로딩 중인지 여부
  const [hasMoreData, setHasMoreData] = useState(true); // 더 로드할 데이터가 있는지 여부
  const ITEMS_PER_LOAD = 20; // 한 번에 로드할 식당 수
  const MAX_MAP_MARKERS = 100; // 지도에 표시할 최대 마커 수

  // 지도 강제 업데이트 함수
  const forceMapUpdate = () => {
    if (mapRef.current && mapRegion) {
      // 지도를 현재 위치로 다시 설정하여 마커 업데이트 강제 실행
      mapRef.current.animateToRegion({
        latitude: mapRegion.latitude,
        longitude: mapRegion.longitude,
        latitudeDelta: mapRegion.latitudeDelta,
        longitudeDelta: mapRegion.longitudeDelta,
      }, 0); // 0ms로 즉시 실행
      
      // 추가: 지도 영역을 약간 변경했다가 원래대로 돌아가기
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: mapRegion.latitude + 0.0001, // 아주 작은 변화
            longitude: mapRegion.longitude,
            latitudeDelta: mapRegion.latitudeDelta,
            longitudeDelta: mapRegion.longitudeDelta,
          }, 50);
          
          setTimeout(() => {
            if (mapRef.current) {
              mapRef.current.animateToRegion({
                latitude: mapRegion.latitude,
                longitude: mapRegion.longitude,
                latitudeDelta: mapRegion.latitudeDelta,
                longitudeDelta: mapRegion.longitudeDelta,
              }, 50);
            }
          }, 100);
        }
      }, 50);
    }
  };

  // --- 고급 필터링 및 검색 함수들 ---
  
  // 통합 필터링 함수
  const applyAdvancedFilters = (restaurants) => {
    if (!restaurants || restaurants.length === 0) return [];
    
    let filtered = [...restaurants];
    
    // 1. 카테고리 필터
    if (activeCategories.length > 0) {
      filtered = filtered.filter(restaurant => {
        if (!restaurant.category) return false;
        return activeCategories.some(category => 
          restaurant.category.includes(category) || 
          restaurant.name.includes(category)
        );
      });
    }
    
    // 2. 가격대 필터
    if (activePriceRange !== '전체') {
      filtered = filtered.filter(restaurant => {
        if (!restaurant.price_range) return true; // 가격 정보가 없으면 통과
        
        switch (activePriceRange) {
          case '1만원 이하':
            return restaurant.price_range <= 10000;
          case '1-2만원':
            return restaurant.price_range > 10000 && restaurant.price_range <= 20000;
          case '2-3만원':
            return restaurant.price_range > 20000 && restaurant.price_range <= 30000;
          case '3만원 이상':
            return restaurant.price_range > 30000;
          default:
            return true;
        }
      });
    }
    
    // 3. 별점 필터
    if (activeRatingFilter !== '전체') {
      filtered = filtered.filter(restaurant => {
        if (!restaurant.average_rating) return true; // 별점 정보가 없으면 통과
        
        const rating = parseFloat(restaurant.average_rating);
        switch (activeRatingFilter) {
          case '4.5점 이상':
            return rating >= 4.5;
          case '4.0점 이상':
            return rating >= 4.0;
          case '3.5점 이상':
            return rating >= 3.5;
          case '3.0점 이상':
            return rating >= 3.0;
          default:
            return true;
        }
      });
    }
    
    // 4. 영업시간 필터 (간단한 구현)
    if (activeTimeFilter !== '전체') {
      const currentHour = new Date().getHours();
      filtered = filtered.filter(restaurant => {
        // 현재 시간에 따라 필터링 (실제로는 영업시간 데이터가 필요)
        switch (activeTimeFilter) {
          case '아침':
            return currentHour >= 6 && currentHour < 11;
          case '점심':
            return currentHour >= 11 && currentHour < 17;
          case '저녁':
            return currentHour >= 17 && currentHour < 22;
          case '야간':
            return currentHour >= 22 || currentHour < 6;
          default:
            return true;
        }
      });
    }
    
    // 5. 검색어 필터
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(restaurant => 
        restaurant.name.toLowerCase().includes(query) ||
        (restaurant.category && restaurant.category.toLowerCase().includes(query)) ||
        (restaurant.address && restaurant.address.toLowerCase().includes(query)) ||
        (restaurant.description && restaurant.description.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  };
  
  // 고급 정렬 함수
  const applyAdvancedSorting = (restaurants) => {
    if (!restaurants || restaurants.length === 0) return [];
    
    const sorted = [...restaurants];
    
    switch (activeSort) {
      case '평점순':
        return sorted.sort((a, b) => {
          const ratingA = parseFloat(a.average_rating || 0);
          const ratingB = parseFloat(b.average_rating || 0);
          return ratingB - ratingA;
        });
        
      case '리뷰순':
        return sorted.sort((a, b) => {
          const reviewA = parseInt(a.review_count || 0);
          const reviewB = parseInt(b.review_count || 0);
          return reviewB - reviewA;
        });
        
      case '오찬추천순':
        return sorted.sort((a, b) => {
          const recommendA = parseInt(a.recommend_count || 0);
          const recommendB = parseInt(b.recommend_count || 0);
          return recommendB - recommendA;
        });
        
      case '거리순':
        return sorted.sort((a, b) => {
          const distanceA = parseFloat(a.distance || 999999);
          const distanceB = parseFloat(b.distance || 999999);
          return distanceA - distanceB;
        });
        
      case '가격순':
        return sorted.sort((a, b) => {
          const priceA = parseFloat(a.price_range || 999999);
          const priceB = parseFloat(b.price_range || 999999);
          return priceA - priceB;
        });
        
      case '인기순':
        return sorted.sort((a, b) => {
          const popularityA = (parseFloat(a.average_rating || 0) * 0.4) + 
                            (parseInt(a.review_count || 0) * 0.3) + 
                            (parseInt(a.recommend_count || 0) * 0.3);
          const popularityB = (parseFloat(b.average_rating || 0) * 0.4) + 
                            (parseInt(b.review_count || 0) * 0.3) + 
                            (parseInt(b.recommend_count || 0) * 0.3);
          return popularityB - popularityA;
        });
        
      case '최신순':
        return sorted.sort((a, b) => {
          const dateA = new Date(a.created_at || 0);
          const dateB = new Date(b.created_at || 0);
          return dateB - dateA;
        });
        
      default:
        return sorted;
    }
  };
  
  // 필터 적용 및 결과 업데이트
  const updateFilteredResults = useCallback(() => {
    if (!restaurants || restaurants.length === 0) return;
    
    // 1. 필터 적용
    let filtered = applyAdvancedFilters(restaurants);
    
    // 2. 정렬 적용
    filtered = applyAdvancedSorting(filtered);
    
    // 3. 결과 업데이트
    setDisplayedRestaurants(filtered.slice(0, ITEMS_PER_LOAD));
    setMapDisplayedRestaurants(filtered.slice(0, Math.min(MAX_MAP_MARKERS, filtered.length)));
    setHasMoreData(filtered.length > ITEMS_PER_LOAD);
    
    console.log(`필터링 결과: 전체 ${restaurants.length}개 → 필터링 ${filtered.length}개`);
  }, [restaurants, activeCategories, activePriceRange, activeRatingFilter, activeTimeFilter, searchQuery, activeSort]);
  
  // 필터 변경 시 결과 업데이트
  useEffect(() => {
    updateFilteredResults();
  }, [updateFilteredResults]);
  
  // 무한 스크롤 관련 함수들
  const initializeInfiniteScroll = (allRestaurants) => {
    // 초기 로딩 시에는 데이터를 설정하지 않음 (잘못된 클러스터 방지)
    if (!allRestaurants || allRestaurants.length === 0) {
      setDisplayedRestaurants([]);
      setMapDisplayedRestaurants([]);
      setRestaurants([]);
      setHasMoreData(false);
      console.log('초기 로딩: 빈 데이터로 설정');
      return;
    }
    
    const total = allRestaurants.length;
    
    // 첫 번째 로드
    const firstLoadRestaurants = allRestaurants.slice(0, ITEMS_PER_LOAD);
    setDisplayedRestaurants(firstLoadRestaurants);
    
    // 지도에 표시할 식당들 (첫 번째 로드와 동일하게)
    setMapDisplayedRestaurants(firstLoadRestaurants);
    
    // 전체 데이터 저장
    setRestaurants(allRestaurants);
    
    // 더 로드할 데이터가 있는지 확인
    setHasMoreData(total > ITEMS_PER_LOAD);
    
    console.log(`무한 스크롤 초기화: 전체 ${total}개, 첫 로드 ${firstLoadRestaurants.length}개`);
  };

  const loadMoreRestaurants = async () => {
    if (isLoadingMore || !hasMoreData) return;
    
    try {
      setIsLoadingMore(true);
      
      // 현재까지 로드된 식당 수
      const currentCount = displayedRestaurants.length;
      
      // 추가로 로드할 식당들
      const nextBatch = restaurants.slice(currentCount, currentCount + ITEMS_PER_LOAD);
      
      if (nextBatch.length > 0) {
        // 기존 식당들과 새로운 식당들을 합침
        const updatedRestaurants = [...displayedRestaurants, ...nextBatch];
        setDisplayedRestaurants(updatedRestaurants);
        
        // 지도 마커도 업데이트 (최대 100개까지만)
        const mapRestaurants = updatedRestaurants.slice(0, MAX_MAP_MARKERS);
        setMapDisplayedRestaurants(mapRestaurants);
        
        // 더 로드할 데이터가 있는지 확인
        setHasMoreData(currentCount + ITEMS_PER_LOAD < restaurants.length);
        
        console.log(`추가 로드: ${nextBatch.length}개, 총 ${updatedRestaurants.length}개`);
        
        // 지도 강제 업데이트
      setTimeout(() => {
        forceMapUpdate();
      }, 300);
      } else {
        setHasMoreData(false);
      }
    } catch (error) {
      console.error('추가 로드 오류:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };





  // 로컬 CSV 데이터에서 주변 식당 검색
  const searchNearbyRestaurants = async (latitude, longitude, radius = SEARCH_RADIUS) => {
    try {
      console.log('주변 식당 검색 시작:', { latitude, longitude, radius });
      
      // 로컬 데이터에서 거리 기반 필터링
      const nearbyRestaurants = restaurants.filter(restaurant => {
        const distance = calculateDistance(latitude, longitude, restaurant.latitude, restaurant.longitude);
        return distance <= radius / 1000; // km 단위로 변환
      });
      
      console.log('주변 식당 검색 결과:', nearbyRestaurants.length, '개');
      return nearbyRestaurants;
    } catch (error) {
      console.error('식당 검색 오류:', error);
      return [];
    }
  };

  const searchRestaurantsInBounds = async (bounds) => {
    try {
      console.log('현재 지도 영역에서 식당 검색 시작');
      console.log('지도 영역:', bounds);
      
      // CSV 데이터가 없으면 먼저 로드
      let dataToSearch = restaurantsWithData && restaurantsWithData.length > 0 ? restaurantsWithData : restaurants;
      
      if (!dataToSearch || dataToSearch.length === 0) {
        console.log('지도 영역 검색을 위한 CSV 데이터 로드 중...');
        // Excel 데이터 로드 제거
        const csvData = [];
        if (csvData && csvData.length > 0) {
          const restaurantsWithRecommendData = csvData.map(restaurant => ({
            ...restaurant,
            recommendCount: 0
          }));
          
          // 상태 업데이트 (비동기)
          setRestaurantsWithData(restaurantsWithRecommendData);
          setRestaurants(restaurantsWithRecommendData);
          
          // 로컬 변수에 즉시 할당하여 현재 함수에서 사용
          dataToSearch = restaurantsWithRecommendData;
          
          console.log('지도 영역 검색용 CSV 데이터 로드 완료:', csvData.length, '개');
        } else {
          console.log('CSV 데이터 로드 실패');
          return [];
        }
      }
      
      console.log('검색할 데이터:', dataToSearch.length, '개');
      
      const boundsRestaurants = dataToSearch.filter(restaurant => {
        // 위도/경도 유효성 검사
        if (!restaurant.latitude || !restaurant.longitude || 
            restaurant.latitude === 0 || restaurant.longitude === 0) {
          return false;
        }
        
        return restaurant.latitude >= bounds.southwest.lat &&
               restaurant.latitude <= bounds.northeast.lat &&
               restaurant.longitude >= bounds.southwest.lng &&
               restaurant.longitude <= bounds.northeast.lng;
      });
      
      console.log('지도 영역 내 식당 검색 결과:', boundsRestaurants.length, '개');
      
      // 디버깅을 위한 상세 정보
      if (boundsRestaurants.length === 0) {
        console.log('검색 범위:', {
          southwest: bounds.southwest,
          northeast: bounds.northeast,
          center: {
            lat: (bounds.southwest.lat + bounds.northeast.lat) / 2,
            lng: (bounds.southwest.lng + bounds.northeast.lng) / 2
          }
        });
        console.log('사용 가능한 데이터:', dataToSearch.length, '개');
        if (dataToSearch.length > 0) {
          console.log('첫 번째 데이터 샘플:', {
            name: dataToSearch[0].name,
            lat: dataToSearch[0].latitude,
            lng: dataToSearch[0].longitude
          });
        }
      }
      
      return boundsRestaurants;
    } catch (error) {
      console.error('지도 영역 검색 오류:', error);
      return [];
    }
  };

  const saveSearchHistory = (query) => {
    if (query.trim()) {
      const newHistory = [query, ...searchHistory.filter(h => h !== query)].slice(0, 5);
      setSearchHistory(newHistory);
      AsyncStorage.setItem('searchHistory', JSON.stringify(newHistory));
    }
  };

  const loadSearchHistory = async () => {
    try {
      const history = await AsyncStorage.getItem('searchHistory');
      if (history) {
        setSearchHistory(JSON.parse(history));
      }
    } catch (error) {
      console.error('검색 히스토리 로드 오류:', error);
    }
  };



  // 인기 식당 로드
  const loadPopularRestaurants = async () => {
    try {
      // 오프라인 상태이거나 네트워크 오류 시 호출하지 않음
      if (isOffline) {
        console.log('오프라인 상태: 인기 식당 건너뛰기');
        return;
      }
      
      const response = await appService./restaurants/popular?period=weekly&limit=5);
      if (response.ok) {
        const data = await response.json();
        setPopularRestaurants(data.restaurants || []);
      }
    } catch (error) {
      console.error('인기 식당 로드 오류:', error);
      // 오류 발생 시 빈 배열로 설정
      setPopularRestaurants([]);
    }
  };

  // 개인화 추천 로드
  const loadPersonalizedRecommendations = async () => {
    try {
      // 오프라인 상태이거나 네트워크 오류 시 호출하지 않음
      if (isOffline) {
        console.log('오프라인 상태: 개인화 추천 건너뛰기');
        return;
      }
      
      // 임시 사용자 ID (실제로는 로그인된 사용자 ID 사용)
      const userId = 'KOICA001';
      const response = await appService./restaurants/recommendations/${userId}?limit=5);
      if (response.ok) {
        const data = await response.json();
        setPersonalizedRecommendations(data.recommendations || []);
      }
    } catch (error) {
      console.error('개인화 추천 로드 오류:', error);
      // 오류 발생 시 빈 배열로 설정
      setPersonalizedRecommendations([]);
    }
  };

  // 검색 결과 캐싱
  const getCachedSearchResults = (query) => {
    const cacheKey = query.toLowerCase().trim();
    const cached = searchCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5분 캐시
      console.log('캐시된 검색 결과 사용:', cacheKey);
      return cached.results;
    }
    return null;
  };

  const setCachedSearchResults = (query, results) => {
    const cacheKey = query.toLowerCase().trim();
    searchCache.set(cacheKey, {
      results,
      timestamp: Date.now()
    });
    
    // 캐시 크기 제한 (최대 50개)
    if (searchCache.size > 50) {
      const firstKey = searchCache.keys().next().value;
      searchCache.delete(firstKey);
    }
  };

  // 오프라인 지원
  const checkOfflineStatus = async () => {
    try {
      const response = await appService./health, { 
        method: 'HEAD',
        timeout: 5000 
      });
      setIsOffline(false);
      return false;
    } catch (error) {
      console.log('오프라인 모드로 전환');
      setIsOffline(true);
      return true;
    }
  };

  const saveOfflineData = async (data) => {
    try {
      await AsyncStorage.setItem('offlineRestaurants', JSON.stringify(data));
      setOfflineData(data);
      console.log('오프라인 데이터 저장 완료:', data.length, '개');
    } catch (error) {
      console.error('오프라인 데이터 저장 오류:', error);
    }
  };

  const loadOfflineData = async () => {
    try {
      const data = await AsyncStorage.getItem('offlineRestaurants');
      if (data) {
        const parsedData = JSON.parse(data);
        setOfflineData(parsedData);
        console.log('오프라인 데이터 로드 완료:', parsedData.length, '개');
        return parsedData;
      }
    } catch (error) {
      console.error('오프라인 데이터 로드 오류:', error);
    }
    return [];
  };

  // 방문 기록 추가
  const addRestaurantVisit = async (restaurantId, visitDate, visitTime, partySize) => {
    try {
      const userId = 'KOICA001'; // 임시 사용자 ID
      const response = await appService./restaurants/visits, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          restaurant_id: restaurantId,
          visit_date: visitDate,
          visit_time: visitTime,
          party_size: partySize
        })
      });

      if (response.ok) {
        const result = await response.json();
        Alert.alert('방문 기록 추가', '방문 기록이 성공적으로 추가되었습니다.');
        
        // 개인화 추천 다시 로드 (방문 기록이 변경되었으므로)
        loadPersonalizedRecommendations();
        
        // 모달 닫기
        setShowVisitModal(false);
        setSelectedRestaurantForVisit(null);
      } else {
        const errorData = await response.json();
        Alert.alert('오류', errorData.error || '방문 기록 추가에 실패했습니다.');
      }
    } catch (error) {
      console.error('방문 기록 추가 오류:', error);
      Alert.alert('오류', '네트워크 오류가 발생했습니다.');
    }
  };



  // 유사도 계산 함수 (Levenshtein 거리 기반)
  const calculateSimilarity = (str1, str2) => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase());
    return (longer.length - distance) / longer.length;
  };

  // Levenshtein 거리 계산 함수
  const levenshteinDistance = (str1, str2) => {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  };

  // 키워드 매핑 (오타나 유사한 검색어를 올바른 키워드로 매핑)
  const keywordMapping = {
    '바거': ['버거', '햄버거', '치즈버거', '불고기버거'],
    '바거킹': ['버거킹', '버거'],
    '맥도날드': ['맥도날드', '맥날', '버거'],
    '맥날': ['맥도날드', '버거'],
    '피자': ['피자', '도미노', '피자헛'],
    '치킨': ['치킨', '교촌', 'BBQ', '네네치킨', '굽네치킨'],
    '커피': ['커피', '스타벅스', '투썸', '할리스', '카페'],
    '카페': ['카페', '커피', '스타벅스', '투썸', '할리스'],
    '중국집': ['중국집', '중식', '짜장면', '짬뽕'],
    '중식': ['중국집', '중식', '짜장면', '짬뽕'],
    '일식': ['일식', '초밥', '라멘', '우동'],
    '한식': ['한식', '국밥', '김치찌개', '된장찌개'],
    '분식': ['분식', '떡볶이', '김밥', '라면'],
    '도시락': ['도시락', '한식', '김밥'],
    '샌드위치': ['샌드위치', '서브웨이', '버거'],
    '스시': ['초밥', '일식', '스시'],
    '초밥': ['초밥', '일식', '스시'],
    '라멘': ['라멘', '일식'],
    '우동': ['우동', '일식'],
    '짜장면': ['짜장면', '중국집', '중식'],
    '짬뽕': ['짬뽕', '중국집', '중식'],
    '김치찌개': ['김치찌개', '한식'],
    '된장찌개': ['된장찌개', '한식'],
    '떡볶이': ['떡볶이', '분식'],
    '김밥': ['김밥', '분식', '도시락'],
    '라면': ['라면', '분식'],
    '국밥': ['국밥', '한식'],
    '스타벅스': ['스타벅스', '커피', '카페'],
    '투썸': ['투썸', '커피', '카페'],
    '할리스': ['할리스', '커피', '카페'],
    '교촌': ['교촌', '치킨'],
    'BBQ': ['BBQ', '치킨'],
    '네네치킨': ['네네치킨', '치킨'],
    '굽네치킨': ['굽네치킨', '치킨'],
    '도미노': ['도미노', '피자'],
    '피자헛': ['피자헛', '피자'],
    '서브웨이': ['서브웨이', '샌드위치'],
  };

  // 검색어 확장 함수
  const expandSearchQuery = (query) => {
    const expandedKeywords = new Set();
    const lowerQuery = query.toLowerCase();
    
    // 원본 검색어 추가
    expandedKeywords.add(lowerQuery);
    
    // 키워드 매핑에서 확장
    for (const [key, values] of Object.entries(keywordMapping)) {
      if (lowerQuery.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerQuery)) {
        values.forEach(value => expandedKeywords.add(value.toLowerCase()));
      }
    }
    
    // 유사한 키워드 찾기 (유사도 0.7 이상)
    for (const [key, values] of Object.entries(keywordMapping)) {
      if (calculateSimilarity(lowerQuery, key.toLowerCase()) >= 0.7) {
        values.forEach(value => expandedKeywords.add(value.toLowerCase()));
      }
    }
    
    // 부분 문자열 매칭 강화
    for (const [key, values] of Object.entries(keywordMapping)) {
      if (lowerQuery.length >= 2) {
        // 2글자 이상일 때 부분 매칭
        if (key.toLowerCase().includes(lowerQuery) || lowerQuery.includes(key.toLowerCase())) {
          values.forEach(value => expandedKeywords.add(value.toLowerCase()));
        }
      }
    }
    
    // 음식 종류별 연관 검색
    const foodTypeMapping = {
      '버거': ['햄버거', '치즈버거', '불고기버거', '새우버거', '치킨버거'],
      '치킨': ['후라이드', '양념치킨', '간장치킨', '마늘치킨', '파닭'],
      '피자': ['치즈피자', '페퍼로니', '하와이안', '고구마피자'],
      '커피': ['아메리카노', '라떼', '카푸치노', '에스프레소'],
      '라면': ['신라면', '진라면', '삼양라면', '농심라면'],
      '김밥': ['일반김밥', '참치김밥', '치즈김밥', '돈까스김밥'],
      '떡볶이': ['일반떡볶이', '치즈떡볶이', '로제떡볶이', '크림떡볶이'],
      '초밥': ['연어초밥', '참치초밥', '새우초밥', '계란초밥'],
      '라멘': ['미소라멘', '시오라멘', '돈코츠라멘', '쇼유라멘'],
      '짜장면': ['일반짜장면', '삼선짜장면', '해물짜장면', '고기짜장면'],
    };
    
    // 음식 종류별 연관 검색 추가
    for (const [foodType, relatedFoods] of Object.entries(foodTypeMapping)) {
      if (lowerQuery.includes(foodType) || foodType.includes(lowerQuery)) {
        relatedFoods.forEach(food => expandedKeywords.add(food.toLowerCase()));
      }
    }
    
    console.log('확장된 검색어:', Array.from(expandedKeywords));
    return Array.from(expandedKeywords);
  };

  const searchRestaurantsByQuery = async (query) => {
    try {
      console.log('검색 쿼리:', query);
      
      // 검색 시작 시 로딩 상태 설정
      setLoading(true);
      
      // 검색 시에는 전체 로드 상태 리셋
      setIsAllRestaurantsLoaded(false);
      
      // 캐시된 결과 확인
      const cachedResults = getCachedSearchResults(query);
      if (cachedResults) {
        setRestaurants(cachedResults);
        initializeInfiniteScroll(cachedResults);
        setLoading(false);
        return;
      }
      
      // CSV 데이터가 없으면 먼저 로드
      if (!restaurantsWithData || restaurantsWithData.length === 0) {
        console.log('CSV 데이터 로드 중...');
        // Excel 데이터 로드 제거
        const csvData = [];
        if (csvData && csvData.length > 0) {
          const restaurantsWithRecommendData = csvData.map(restaurant => ({
            ...restaurant,
            recommendCount: 0
          }));
          setRestaurantsWithData(restaurantsWithRecommendData);
          console.log('CSV 데이터 로드 완료:', csvData.length, '개');
        }
      }
      
      if (!query.trim()) {
        // 검색어가 없으면 기본 50개만 표시
        if (location && restaurantsWithData.length > 0) {
          const dataWithDistance = restaurantsWithData.map(restaurant => ({
            ...restaurant,
            distance: calculateDistance(
              location.latitude, 
              location.longitude, 
              restaurant.latitude, 
              restaurant.longitude
            )
          }));
          
          const sortedData = dataWithDistance.sort((a, b) => a.distance - b.distance);
          
            // 무한 스크롤 초기화
            initializeInfiniteScroll(sortedData);
          setRestaurants(sortedData);
        } else {
          const first50 = restaurantsWithData.slice(0, 50);
          setDisplayedRestaurants(first50);
          setMapDisplayedRestaurants(first50);
          setRestaurants(restaurantsWithData);
        }
        setLoading(false);
        return;
      }
      
      // 검색어 확장
      const expandedQueries = expandSearchQuery(query);
      console.log('확장된 검색어:', expandedQueries);
      
      // 검색 시에는 전체 데이터에서 검색 (restaurantsWithData 사용)
      const searchResults = restaurantsWithData.filter(restaurant => {
        const restaurantName = restaurant.name.toLowerCase();
        const restaurantCategory = restaurant.category.toLowerCase();
        const restaurantAddress = restaurant.address.toLowerCase();
        
        // 정확한 매칭 확인
        const exactMatch = expandedQueries.some(expandedQuery => 
          restaurantName.includes(expandedQuery) ||
          restaurantCategory.includes(expandedQuery) ||
          restaurantAddress.includes(expandedQuery)
        );
        
        if (exactMatch) return true;
        
        // 유사도 기반 검색 (유사도 0.6 이상)
        const similarityThreshold = 0.6;
        const nameSimilarity = Math.max(...expandedQueries.map(q => calculateSimilarity(restaurantName, q)));
        const categorySimilarity = Math.max(...expandedQueries.map(q => calculateSimilarity(restaurantCategory, q)));
        
        return nameSimilarity >= similarityThreshold || categorySimilarity >= similarityThreshold;
      });
      
      // 검색 결과에 거리 계산 추가
      if (location) {
        const searchResultsWithDistance = searchResults.map(restaurant => ({
          ...restaurant,
          distance: calculateDistance(
            location.latitude, 
            location.longitude, 
            restaurant.latitude, 
            restaurant.longitude
          )
        }));
        
        const sortedSearchResults = searchResultsWithDistance
          .sort((a, b) => a.distance - b.distance);
        
        // 무한 스크롤 초기화
        initializeInfiniteScroll(sortedSearchResults);
        setRestaurants(sortedSearchResults);
        
        // 검색 결과를 캐시에 저장
        setCachedSearchResults(query, sortedSearchResults);
        
        // 검색 결과에 따라 지도 자동 이동
        if (searchResults.length > 0) {
          moveMapToSearchResults(searchResults);
        }
      } else {
        // 무한 스크롤 초기화
        initializeInfiniteScroll(searchResults);
        setRestaurants(searchResults);
        
        // 검색 결과를 캐시에 저장
        setCachedSearchResults(query, searchResults);
        
        // 검색 결과에 따라 지도 자동 이동
        if (searchResults.length > 0) {
          moveMapToSearchResults(searchResults);
        }
      }
      
      console.log('검색 결과:', searchResults.length, '개');
      
      // 검색 완료 후 로딩 상태 해제
      setLoading(false);
      
    } catch (error) {
      console.error('검색 오류:', error);
      setRestaurants([]);
      setDisplayedRestaurants([]);
      setMapDisplayedRestaurants([]);
      setLoading(false);
    }
  };

  // 거리 계산 함수
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // 지구의 반지름 (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // 기본 식당 데이터 (위치 정보만 포함)
  const baseRestaurants = [
    {
      id: 1,
      name: '맛있는 한식당',
      category: '한식',
      distance: 0.2,
      latitude: 37.5665,
      longitude: 126.9780,
      address: '서울시 강남구 테헤란로 123',
      rating: 4.5,
      user_ratings_total: 128,
      recommendCount: 15,
      reviewCount: 45
    },
    {
      id: 2,
      name: '신선한 중식당',
      category: '중식',
      distance: 0.5,
      latitude: 37.5670,
      longitude: 126.9785,
      address: '서울시 강남구 역삼동 456',
      rating: 4.2,
      user_ratings_total: 89,
      recommendCount: 12,
      reviewCount: 34
    },
    {
      id: 3,
      name: '고급 일식당',
      category: '일식',
      distance: 0.8,
      latitude: 37.5660,
      longitude: 126.9775,
      address: '서울시 강남구 삼성동 789',
      rating: 4.8,
      user_ratings_total: 156,
      recommendCount: 23,
      reviewCount: 67
    },
    {
      id: 4,
      name: '분식천국',
      category: '분식',
      distance: 1.2,
      latitude: 37.5680,
      longitude: 126.9790,
      address: '서울시 강남구 논현동 321',
      rating: 4.0,
      user_ratings_total: 92,
      recommendCount: 8,
      reviewCount: 28
    },
    {
      id: 5,
      name: '피자헛',
      category: '양식',
      distance: 1.5,
      latitude: 37.5650,
      longitude: 126.9765,
      address: '서울시 강남구 청담동 654',
      rating: 4.3,
      user_ratings_total: 73,
      recommendCount: 19,
      reviewCount: 41
    },
    {
      id: 6,
      name: '스타벅스 강남점',
      category: '카페',
      distance: 0.3,
      latitude: 37.5668,
      longitude: 126.9782,
      address: '서울시 강남구 신사동 111',
      rating: 4.6,
      user_ratings_total: 203,
      recommendCount: 31,
      reviewCount: 89
    },
    {
      id: 7,
      name: '김치찌개 전문점',
      category: '한식',
      distance: 0.7,
      latitude: 37.5662,
      longitude: 126.9778,
      address: '서울시 강남구 압구정동 222',
      rating: 4.4,
      user_ratings_total: 67,
      recommendCount: 14,
      reviewCount: 52
    },
    {
      id: 8,
      name: '초밥집',
      category: '일식',
      distance: 1.0,
      latitude: 37.5675,
      longitude: 126.9788,
      address: '서울시 강남구 도산대로 333',
      rating: 4.7,
      user_ratings_total: 134,
      recommendCount: 27,
      reviewCount: 76
    },
    {
      id: 9,
      name: '떡볶이 가게',
      category: '분식',
      distance: 0.4,
      latitude: 37.5669,
      longitude: 126.9781,
      address: '서울시 강남구 청담대로 444',
      rating: 4.1,
      user_ratings_total: 98,
      recommendCount: 11,
      reviewCount: 38
    },
    {
      id: 10,
      name: '파스타 전문점',
      category: '양식',
      distance: 0.9,
      latitude: 37.5672,
      longitude: 126.9786,
      address: '서울시 강남구 강남대로 555',
      rating: 4.2,
      user_ratings_total: 156,
      recommendCount: 22,
      reviewCount: 63
    },
    {
      id: 11,
      name: '삼겹살 맛집',
      category: '한식',
      distance: 0.6,
      latitude: 37.5667,
      longitude: 126.9787,
      address: '서울시 강남구 가로수길 666',
      rating: 4.3,
      user_ratings_total: 87,
      recommendCount: 18,
      reviewCount: 45
    },
    {
      id: 12,
      name: '라멘 전문점',
      category: '일식',
      distance: 1.1,
      latitude: 37.5673,
      longitude: 126.9793,
      address: '서울시 강남구 신사대로 777',
      rating: 4.5,
      user_ratings_total: 112,
      recommendCount: 25,
      reviewCount: 71
    },
    {
      id: 13,
      name: '스테이크 하우스',
      category: '양식',
      distance: 0.8,
      latitude: 37.5664,
      longitude: 126.9784,
      address: '서울시 강남구 압구정로 888',
      rating: 4.4,
      user_ratings_total: 145,
      recommendCount: 29,
      reviewCount: 83
    },
    {
      id: 14,
      name: '짜장면 맛집',
      category: '중식',
      distance: 1.3,
      latitude: 37.5678,
      longitude: 126.9798,
      address: '서울시 강남구 청담로 999',
      rating: 4.0,
      user_ratings_total: 76,
      recommendCount: 9,
      reviewCount: 31
    },
    {
      id: 15,
      name: '투썸플레이스',
      category: '카페',
      distance: 0.5,
      latitude: 37.5666,
      longitude: 126.9786,
      address: '서울시 강남구 테헤란로 101',
      rating: 4.1,
      user_ratings_total: 94,
      recommendCount: 13,
      reviewCount: 42
    }
  ];

  useEffect(() => {
    // 지도 영역 검색 모드가 아닐 때만 현재 위치 가져오기
    if (!isMapAreaSearch) {
      getCurrentLocation();
    }
    
    // 로컬 데이터만 로드 (네트워크 요청 최소화)
    loadSearchHistory();

    
    // 오프라인 상태 확인 후 네트워크 요청
    checkOfflineStatus().then(isOffline => {
      if (isOffline) {
        loadOfflineData();
      } else {
        // 온라인 상태일 때만 네트워크 요청
        loadPopularRestaurants();
      }
    });
    
    setLoading(false);
    
    // 초기 로딩 시에는 마커를 표시하지 않음 (잘못된 클러스터 방지)
    setMapDisplayedRestaurants([]);
    setDisplayedRestaurants([]);
    setRestaurants([]);
    setRestaurantsWithData([]);
  }, [isMapAreaSearch]);

  const getCurrentLocation = async () => {
    try {
      setLoading(true);
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('위치 권한', '위치 권한이 필요합니다. 설정에서 위치 권한을 허용해주세요.');
        setLocation(DEFAULT_LOCATION);
        
        // 위치 권한이 없을 때는 마커를 표시하지 않음 (잘못된 클러스터 방지)
        setRestaurants([]);
        setDisplayedRestaurants([]);
        setMapDisplayedRestaurants([]);
        setRestaurantsWithData([]);
        
        // 지도 영역만 설정 (마커 없음)
        setMapRegion({
          latitude: DEFAULT_LOCATION.latitude,
          longitude: DEFAULT_LOCATION.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
        
        setLoading(false);
        return;
      }

      // 위치 가져오기에 타임아웃 설정 (10초)
      const currentLocation = await Promise.race([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 10
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('위치 가져오기 시간 초과')), 10000)
        )
      ]);

      const newLocation = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      };
      
      setLocation(newLocation);
      console.log('현재 위치:', newLocation);
      
      // 위치가 변경되면 전체 로드 상태 리셋
      setIsAllRestaurantsLoaded(false);
      
      // 지도 영역 초기화
      setMapRegion({
        latitude: newLocation.latitude,
        longitude: newLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      
      // 초기 로딩 시에는 데이터를 로드하지 않음 (잘못된 클러스터 방지)
      // 사용자가 검색하거나 지도 영역을 검색할 때만 데이터 표시
      console.log('초기 로딩: 데이터 로드 건너뛰기 (검색 시에만 표시)');
      
      // 빈 배열로 설정하여 마커 표시 방지
      setRestaurants([]);
      setDisplayedRestaurants([]);
      setMapDisplayedRestaurants([]);
      setRestaurantsWithData([]);
      
      // 지도 영역 검색 모드가 아닐 때만 지도 이동
      if (mapRef.current && !isMapAreaSearch) {
        mapRef.current.animateToRegion({
          latitude: newLocation.latitude,
          longitude: newLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 1000);
      }
      
      setLoading(false);
      
    } catch (error) {
      console.log('위치 가져오기 실패:', error);
      
      let errorMessage = '현재 위치를 가져올 수 없습니다.';
      
      // 더 구체적인 오류 메시지
      if (error.message && error.message.includes('시간 초과')) {
        errorMessage = '위치 가져오기 시간이 초과되었습니다. GPS가 켜져 있는지 확인해주세요.';
      } else if (error.code === 'UNAVAILABLE' || error.code === 'NOT_AVAILABLE') {
        errorMessage = '위치 서비스를 사용할 수 없습니다. GPS를 켜고 다시 시도해주세요.';
      } else if (error.code === 'TIMEOUT') {
        errorMessage = '위치 가져오기 시간이 초과되었습니다. 네트워크 연결을 확인해주세요.';
      } else if (error.code === 'PERMISSION_DENIED') {
        errorMessage = '위치 권한이 거부되었습니다. 설정에서 위치 권한을 허용해주세요.';
      } else if (error.code === 'POSITION_UNAVAILABLE') {
        errorMessage = '현재 위치를 사용할 수 없습니다. GPS 신호를 확인해주세요.';
      } else if (error.message && error.message.includes('Network request failed')) {
        errorMessage = '네트워크 연결을 확인해주세요.';
      }
      
      Alert.alert('위치 오류', errorMessage);
      
      // 기본 위치 설정 (데이터 로드 없음)
      setLocation(DEFAULT_LOCATION);
      
      // 오류 발생 시에도 마커 표시 방지
      setRestaurants([]);
      setDisplayedRestaurants([]);
      setMapDisplayedRestaurants([]);
      setRestaurantsWithData([]);
      
      // 지도 영역만 설정
      setMapRegion({
        latitude: DEFAULT_LOCATION.latitude,
        longitude: DEFAULT_LOCATION.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      
      setLoading(false);
    }
  };

  const handleMarkerPress = (restaurant) => {
    setSelectedRestaurant(restaurant);
  };

  const handleRestaurantPress = (restaurant) => {
    navigation.navigate('RestaurantDetail', { restaurant });
  };


  // 각 식당의 오찬 추천 데이터를 가져오는 함수
  const fetchRestaurantLunchRecommendData = async (restaurantId) => {
    try {
      const storedData = await AsyncStorage.getItem(`lunch_recommend_${restaurantId}`);
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        return parsedData.recommendCount || 0;
      }
      return 0;
    } catch (error) {
      console.error('오찬 추천 데이터 로드 오류:', error);
      return 0;
    }
  };

  // 모든 식당의 데이터를 로드하는 함수
  const loadRestaurantsData = async () => {
    try {
      console.log('식당 데이터 로드 시작');
      
      // 개발용 API에서 식당 데이터 가져오기
      const response = await appService./dev/restaurants?limit=1000);
      
      if (response.ok) {
        const data = await response.json();
        const restaurantsData = data.restaurants || [];
        
        console.log('식당 데이터 로드 성공:', restaurantsData.length, '개');
        
        setRestaurants(restaurantsData);
        setDisplayedRestaurants(restaurantsData);
        setMapDisplayedRestaurants(restaurantsData);
        setRestaurantsWithData(restaurantsData);
      } else {
        console.error('식당 데이터 로드 실패:', response.status);
        setRestaurants([]);
        setDisplayedRestaurants([]);
        setMapDisplayedRestaurants([]);
        setRestaurantsWithData([]);
      }
    } catch (error) {
      console.error('식당 데이터 로드 오류:', error);
      setRestaurants([]);
      setDisplayedRestaurants([]);
      setMapDisplayedRestaurants([]);
      setRestaurantsWithData([]);
    }
  };

  // 초기 데이터 로드 (한 번만 실행)
  useEffect(() => {
    loadRestaurantsData();
  }, []); // 컴포넌트 마운트 시 한 번만 실행

  // mapDisplayedRestaurants가 변경될 때마다 지도 강제 업데이트
  useEffect(() => {
    if (mapDisplayedRestaurants.length > 0) {
      // 마커가 변경되었을 때 지도 강제 업데이트
      setTimeout(() => {
        forceMapUpdate();
      }, 200);
    }
  }, [mapDisplayedRestaurants]); // mapDisplayedRestaurants가 변경될 때마다 실행

  // 리스트 높이가 변경될 때 스크롤 위치 조정
  useEffect(() => {
    // 리스트 높이가 작을 때는 상단으로 스크롤
    if (listHeight <= MIN_LIST_HEIGHT + 50) {
      // 작은 높이일 때는 스크롤을 상단으로 이동
      console.log('리스트 높이 작음, 스크롤 위치 조정');
    }
  }, [listHeight]);

  // 클러스터 상태 관리
  const [clusters, setClusters] = useState([]);
  const [lastZoomLevel, setLastZoomLevel] = useState(10);
  const [lastRestaurantsCount, setLastRestaurantsCount] = useState(0);
  const [lastRestaurants, setLastRestaurants] = useState([]); // 빈 배열로 초기화
  const [lastMapRegion, setLastMapRegion] = useState(null); // 지도 영역 변경 추적
  
  // 마커 애니메이션을 위한 상태 (단순화)
  const [isAnimating, setIsAnimating] = useState(false);
  
  // lastRestaurants 상태가 잘못 설정된 경우 자동으로 수정
  useEffect(() => {
    if (lastRestaurants && !isValidArray(lastRestaurants)) {
      console.warn(`⚠️ lastRestaurants 상태 자동 수정: 잘못된 타입 (${typeof lastRestaurants}) → 빈 배열로 초기화`);
      setLastRestaurants([]);
      setLastRestaurantsCount(0);
    }
  }, [lastRestaurants]);
  
  // 메인 useEffect - 클러스터 재계산 및 애니메이션 처리 (단일 실행 흐름)
  useEffect(() => {
    if (isAnimating) {
      console.log(' 애니메이션 진행 중: 클러스터 업데이트 건너뛰기');
      return;
    }

    if (!filteredAndSortedRestaurants || filteredAndSortedRestaurants.length === 0) {
      setClusters([]);
      return;
    }
    
    const currentZoomLevel = mapRegion ? Math.log2(360 / mapRegion.longitudeDelta) : 10;
    const hasZoomChanged = lastZoomLevel !== null && Math.abs(currentZoomLevel - lastZoomLevel) > 0.05;
    
    if (hasZoomChanged) {
      console.log(' 줌 레벨 변경 감지:', lastZoomLevel?.toFixed(2), '→', currentZoomLevel.toFixed(2));
      
      // 즉시 클러스터 재계산 실행
      
      // 안전한 배열 복사
      const safeArrayCopy = (source) => {
        if (!source || !Array.isArray(source)) {
          return [];
        }
        
        try {
          const copy = [...source];
          return copy;
        } catch (error) {
          return [];
        }
      };

      const restaurantsCopy = safeArrayCopy(filteredAndSortedRestaurants);
      
      if (restaurantsCopy.length > 0) {
        setLastRestaurants(restaurantsCopy);
      }

      // 즉시 클러스터링 실행
      const newClusters = createClusters(filteredAndSortedRestaurants, currentZoomLevel);
      
      if (newClusters.length > 0) {
        // 애니메이션 적용
        applySmoothClusterAnimation(newClusters);
        setLastZoomLevel(currentZoomLevel);
      }
    }
  }, [filteredAndSortedRestaurants, mapRegion, lastZoomLevel, isAnimating]);
  
  // lastRestaurants 상태 변경 감지 (디버깅용)
  useEffect(() => {
    // 상태가 잘못 설정된 경우 경고
    if (lastRestaurants && !Array.isArray(lastRestaurants)) {
      console.warn(`⚠️ 경고: lastRestaurants가 배열이 아님! 타입: ${typeof lastRestaurants}`);
    }
    
    // length 속성이 없는 경우도 경고
    if (lastRestaurants && typeof lastRestaurants.length === 'undefined') {
      console.warn(`⚠️ 경고: lastRestaurants에 length 속성이 없음!`);
    }
  }, [lastRestaurants]);

  // 부드러운 클러스터 애니메이션 적용 (자연스러운 통합/분리)
  const applySmoothClusterAnimation = useCallback((newClusters) => {
    if (isAnimating) {
      return;
    }

    if (clusters.length === 0) {
      // 첫 로딩 시에는 애니메이션 없이 바로 표시
      setClusters(newClusters);
      return;
    }

    console.log(' 부드러운 클러스터 애니메이션 시작:', newClusters.length, '개 클러스터');
    
    setIsAnimating(true);
    
    // 각 새로운 클러스터에 대해 적절한 애니메이션 시작점 설정
    const animatedClusters = newClusters.map(newCluster => {
      // 새로운 클러스터와 겹치는 기존 클러스터들을 찾기 (통합 시 올바른 시작점 결정)
      // 실제로 겹치는 클러스터만 찾기 위해 극도로 엄격한 범위 설정
      const overlappingClusters = clusters.filter(existingCluster => {
        const distance = Math.sqrt(
          Math.pow(newCluster.latitude - existingCluster.latitude, 2) +
          Math.pow(newCluster.longitude - existingCluster.longitude, 2)
        );
        
        // 거리 임계값을 극도로 엄격하게 설정 (실제로 겹치는 클러스터만 찾기)
        return distance < 0.001; // 0.001도 이내의 클러스터만 겹치는 것으로 간주 (약 100m)
      });

      if (overlappingClusters.length > 0) {
        // 실제로 겹치는 클러스터들이 있는 경우에만 통합 애니메이션 적용
        // 이들의 중앙점을 시작점으로 설정
        const totalLat = overlappingClusters.reduce((sum, c) => sum + c.latitude, 0);
        const totalLng = overlappingClusters.reduce((sum, c) => sum + c.longitude, 0);
        const avgLat = totalLat / overlappingClusters.length;
        const avgLng = totalLng / overlappingClusters.length;
        
        console.log(' 통합 애니메이션 설정:', {
          newCluster: `${newCluster.restaurants.length}개`,
          overlappingCount: overlappingClusters.length,
          startPoint: `${avgLat.toFixed(4)}, ${avgLng.toFixed(4)}`,
          endPoint: `${newCluster.latitude.toFixed(4)}, ${newCluster.longitude.toFixed(4)}`
        });

        return {
          ...newCluster,
          startLatitude: avgLat,
          startLongitude: avgLng,
          endLatitude: newCluster.latitude,
          endLongitude: newCluster.longitude,
          isNew: true,
          animationType: 'merge' // 통합 애니메이션 타입 표시
        };
      } else {
        // 겹치는 클러스터가 없는 경우: 변화가 없는 클러스터로 처리
        // 기존 클러스터와 동일한 위치와 식당 수를 가진 클러스터 찾기
        const unchangedCluster = clusters.find(existingCluster => 
          Math.abs(existingCluster.latitude - newCluster.latitude) < 0.001 &&
          Math.abs(existingCluster.longitude - newCluster.longitude) < 0.001 &&
          existingCluster.restaurants.length === newCluster.restaurants.length
        );
        
        if (unchangedCluster) {
          // 변화가 없는 클러스터: 애니메이션 없이 제자리 고정
          console.log(' 변화 없음 클러스터:', {
            newCluster: `${newCluster.restaurants.length}개`,
            position: `${newCluster.latitude.toFixed(4)}, ${newCluster.longitude.toFixed(4)}`
          });
          
          return {
            ...newCluster,
            startLatitude: newCluster.latitude,
            startLongitude: newCluster.longitude,
            endLatitude: newCluster.latitude,
            endLongitude: newCluster.longitude,
            isNew: false,
            animationType: 'unchanged' // 변화 없음 표시
          };
        } else {
          // 새로운 클러스터: 애니메이션 없이 바로 표시
          console.log(' 새로운 클러스터:', {
            newCluster: `${newCluster.restaurants.length}개`,
            position: `${newCluster.latitude.toFixed(4)}, ${newCluster.longitude.toFixed(4)}`
          });
          
          return {
            ...newCluster,
            startLatitude: newCluster.latitude,
            startLongitude: newCluster.longitude,
            endLatitude: newCluster.latitude,
            endLongitude: newCluster.longitude,
            isNew: false,
            animationType: 'new'
          };
        }
      }
    });

    // 애니메이션된 클러스터로 상태 업데이트
    setClusters(animatedClusters);
    
    // 애니메이션 완료 후 정상 상태로 복원
    setTimeout(() => {
      const finalClusters = newClusters.map(cluster => ({
        ...cluster,
        isNew: false,
        animationType: undefined
      }));
      
      setClusters(finalClusters);
      setIsAnimating(false);
      console.log('✅ 클러스터 애니메이션 완료');
    }, 800); // 애니메이션 지속 시간을 800ms로 증가 (더 부드럽게)
  }, [clusters, isAnimating]);
  
  // 실시간 줌 변경 감지를 위한 별도 useEffect (단순화)
  useEffect(() => {
    if (isAnimating) {
      return; // 애니메이션 중에는 실행하지 않음
    }

    if (!mapRegion || !filteredAndSortedRestaurants || filteredAndSortedRestaurants.length === 0) {
      return;
    }
    
    const currentZoomLevel = Math.log2(360 / mapRegion.longitudeDelta);
    const hasZoomChanged = lastZoomLevel !== null && Math.abs(currentZoomLevel - lastZoomLevel) > 0.05;

    if (hasZoomChanged) {
      console.log('🔍 실시간 줌 변경 감지:', lastZoomLevel.toFixed(2), '→', currentZoomLevel.toFixed(2));
      
      // 즉시 클러스터링 실행
      console.log('🚀 즉시 클러스터링 실행: 줌레벨', currentZoomLevel.toFixed(2), ', 식당', filteredAndSortedRestaurants.length, '개');
      const newClusters = createClusters(filteredAndSortedRestaurants, currentZoomLevel);
      
      if (newClusters.length > 0) {
        // 애니메이션 적용
        applySmoothClusterAnimation(newClusters);
        setLastZoomLevel(currentZoomLevel);
        console.log('⚡ 줌 변경 즉시 반영:', newClusters.length, '개 클러스터');
      }
    }
  }, [mapRegion, lastZoomLevel, isAnimating]);

  // 지도 영역 검색 모드일 때는 해당 결과를 우선 표시, 그렇지 않으면 현재 페이지의 식당들 사용
  const displayRestaurants = isMapAreaSearch ? mapAreaResults : displayedRestaurants;
  
  // 마커 클러스터링을 위한 함수 - 완전히 새로 작성된 강력한 알고리즘
  const createClusters = (restaurants, zoomLevel) => {
    if (!restaurants || restaurants.length === 0) return [];
    
    // 즉시 반응하는 클러스터링 시스템 - 항상 새로운 클러스터 생성
    console.log(`🚀 즉시 클러스터링 실행: 줌레벨 ${zoomLevel.toFixed(2)}, 식당 ${restaurants.length}개`);
    
    // 줌 레벨에 따른 클러스터 반지름 동적 조정 (더 민감하게)
    // 줌이 클수록(숫자가 작을수록) 클러스터 반지름이 작아짐
    const baseRadius = 0.001; // 기본 반지름 (약 100m)
    const zoomFactor = Math.max(1, Math.min(20, zoomLevel)); // 줌 레벨 범위 제한
    
    // 줌 레벨에 따른 반지름 계산 (더 세밀하고 동적으로)
    let clusterRadius;
    if (zoomLevel >= 17) {
      clusterRadius = 0.02; // 극도로 가까운 줌: 20m 이내
    } else if (zoomLevel >= 16) {
      clusterRadius = 0.04; // 매우 가까운 줌: 40m 이내
    } else if (zoomLevel >= 15) {
      clusterRadius = 0.08; // 가까운 줌: 80m 이내
    } else if (zoomLevel >= 14) {
      clusterRadius = 0.15; // 중간-가까운 줌: 150m 이내
    } else if (zoomLevel >= 13) {
      clusterRadius = 0.25; // 중간 줌: 250m 이내
    } else if (zoomLevel >= 12) {
      clusterRadius = 0.4; // 중간-넓은 줌: 400m 이내
    } else if (zoomLevel >= 11) {
      clusterRadius = 0.6; // 넓은 줌: 600m 이내
    } else if (zoomLevel >= 10) {
      clusterRadius = 0.8; // 넓은 줌: 800m 이내
    } else {
      clusterRadius = 1.2; // 매우 넓은 줌: 1.2km 이내
    }
    
    console.log(`클러스터링: 줌레벨 ${zoomLevel.toFixed(2)}, 반지름 ${clusterRadius.toFixed(6)}km`);
    
    // 1단계: 모든 식당을 거리 기반으로 클러스터링
    const clusters = [];
    
    restaurants.forEach(restaurant => {
      // 잘못된 위치 데이터 필터링
      if (!restaurant.latitude || !restaurant.longitude || 
          restaurant.latitude === 0 || restaurant.longitude === 0 ||
          restaurant.latitude < 33 || restaurant.latitude > 39 ||  // 한국 위도 범위
          restaurant.longitude < 124 || restaurant.longitude > 132) { // 한국 경도 범위
        return;
      }
      
      let addedToCluster = false;
      
      // 기존 클러스터와의 거리 확인
      for (let cluster of clusters) {
        const distance = calculateDistance(
          cluster.latitude,
          cluster.longitude,
          restaurant.latitude,
          restaurant.longitude
        );
        
        // 클러스터 반지름 내에 있는지 확인
        if (distance <= clusterRadius) {
          cluster.restaurants.push(restaurant);
          // 클러스터 중심점 업데이트
          const avgLat = cluster.restaurants.reduce((sum, r) => sum + r.latitude, 0) / cluster.restaurants.length;
          const avgLng = cluster.restaurants.reduce((sum, r) => sum + r.longitude, 0) / cluster.restaurants.length;
          cluster.latitude = avgLat;
          cluster.longitude = avgLng;
          addedToCluster = true;
          break;
        }
      }
      
      if (!addedToCluster) {
        clusters.push({
          restaurants: [restaurant],
          latitude: restaurant.latitude,
          longitude: restaurant.longitude
        });
      }
    });
    
    console.log(`1단계 클러스터 생성: ${clusters.length}개`);
    
      // 2단계: 겹치는 클러스터들을 선택적으로 통합 (가독성 기반)
  const finalClusters = [];
  const merged = new Set();
  
  for (let i = 0; i < clusters.length; i++) {
    if (merged.has(i)) continue;
    
    let currentCluster = { ...clusters[i] };
    merged.add(i);
    
    // 겹치는 클러스터만 선택적으로 통합 (극도로 엄격하게)
    let mergeCount = 0;
    const maxMergePerCluster = 1; // 한 번에 최대 1개까지만 통합
    const minOverlapRatio = 0.95; // 최소 95% 이상 겹쳐야 통합 (거의 완벽하게 겹쳐야 함)
    
    for (let j = 0; j < clusters.length; j++) {
      if (i === j || merged.has(j) || mergeCount >= maxMergePerCluster) continue;
      
      // 실제 마커 겹침 여부 판단 (겹침 비율까지 검증)
      if (isClustersOverlapping(currentCluster, clusters[j], zoomLevel)) {
        // 겹침 비율 계산
        const overlapRatio = calculateOverlapRatio(currentCluster, clusters[j], zoomLevel);
        
        console.log(`🔄 겹치는 클러스터 발견: ${currentCluster.restaurants.length}개 + ${clusters[j].restaurants.length}개`);
        console.log(`📊 겹침 비율: ${(overlapRatio * 100).toFixed(1)}%`);
        
        // 추가 겹침 검증: 정말로 겹치는지 한 번 더 확인
        const additionalOverlapCheck = performAdditionalOverlapCheck(currentCluster, clusters[j], zoomLevel);
        
        if (!additionalOverlapCheck) {
          console.log(`⚠️ 추가 겹침 검증 실패로 통합 취소`);
          continue;
        }
        
        // 최소 겹침 비율 이상일 때만 통합
        if (overlapRatio >= minOverlapRatio) {
          // 통합 후 중심점이 유효한지 미리 검증
          const mergedCenter = calculateOptimalCenter([...currentCluster.restaurants, ...clusters[j].restaurants]);
          
          if (isValidClusterCenter(mergedCenter, [...currentCluster.restaurants, ...clusters[j].restaurants])) {
            // 모든 식당을 하나의 클러스터로 통합
            currentCluster.restaurants = [...currentCluster.restaurants, ...clusters[j].restaurants];
            
            // 최적화된 중심점으로 설정
            currentCluster.latitude = mergedCenter.latitude;
            currentCluster.longitude = mergedCenter.longitude;
            
            merged.add(j);
            mergeCount++;
            
            console.log(`🎯 클러스터 통합 성공: ${currentCluster.restaurants.length}개 식당으로 통합됨`);
            console.log(`📍 새로운 중심점: ${mergedCenter.latitude.toFixed(4)}, ${mergedCenter.longitude.toFixed(4)}`);
          } else {
            console.log(`❌ 중심점 검증 실패로 통합 취소`);
          }
        } else {
          console.log(`⚠️ 겹침 비율 부족으로 통합 취소: ${(overlapRatio * 100).toFixed(1)}% < ${(minOverlapRatio * 100).toFixed(1)}%`);
        }
      }
    }
    
    finalClusters.push(currentCluster);
  }
    
      console.log(`2단계 통합 완료: 초기 ${clusters.length}개 → 통합 후 ${finalClusters.length}개, 총 ${restaurants.length}개 식당`);
  console.log(`줌 레벨 ${zoomLevel.toFixed(2)}에서 클러스터 반지름: ${clusterRadius.toFixed(3)}km`);
  
  // 통합 효과 분석 및 최적화 상태 확인
  if (finalClusters.length < clusters.length) {
    const mergedCount = clusters.length - finalClusters.length;
    console.log(`🎯 클러스터 통합 성공: ${mergedCount}개 클러스터가 통합됨`);
    
    // 통합된 클러스터들의 식당 수 분포 확인
    const clusterSizes = finalClusters.map(c => c.restaurants.length).sort((a, b) => b - a);
    console.log(`📊 클러스터 크기 분포: ${clusterSizes.slice(0, 5).join(', ')}개 식당 (상위 5개)`);
    
    // 최적 클러스터 수 확인
    const optimalCount = getOptimalClusterCount(zoomLevel, restaurants.length);
    if (finalClusters.length === optimalCount) {
      console.log(`✅ 최적 클러스터 수 달성: ${finalClusters.length}개 (목표: ${optimalCount}개)`);
    } else {
      console.log(`⚠️ 클러스터 수 최적화 필요: 현재 ${finalClusters.length}개, 목표 ${optimalCount}개`);
    }
  } else {
    console.log(`⚠️ 클러스터 통합 실패: 통합된 클러스터가 없음`);
  }
  
  // 마커 움직임 방지 상태 확인
  console.log(`🚫 마커 움직임 방지: 클러스터 ${finalClusters.length}개, 식당 ${restaurants.length}개`);
    
      return finalClusters;
}

// 마커 겹침 여부 판단 함수 (더 정확한 겹침 판단)
function isClustersOverlapping(cluster1, cluster2, zoomLevel) {
  // 줌 레벨에 따른 마커 크기 계산 (화면상 픽셀 기준)
  const markerSizePx = 40; // 마커 크기 (픽셀)
  
  // 줌 레벨에 따른 실제 거리 계산 (픽셀당 km)
  let kmPerPixel;
  if (zoomLevel >= 16) {
    kmPerPixel = 0.001; // 매우 가까운 줌: 1m/픽셀
  } else if (zoomLevel >= 14) {
    kmPerPixel = 0.003; // 가까운 줌: 3m/픽셀
  } else if (zoomLevel >= 12) {
    kmPerPixel = 0.008; // 중간 줌: 8m/픽셀
  } else if (zoomLevel >= 10) {
    kmPerPixel = 0.02; // 넓은 줌: 20m/픽셀
  } else {
    kmPerPixel = 0.05; // 매우 넓은 줌: 50m/픽셀
  }
  
  // 마커 크기를 km 단위로 변환
  const markerSizeKm = (markerSizePx * kmPerPixel) / 1000;
  
  // 두 클러스터 간의 거리 계산
  const distance = calculateDistance(
    cluster1.latitude,
    cluster1.longitude,
    cluster2.latitude,
    cluster2.longitude
  );
  
  // 겹침 판단: 마커 크기의 0.05배 이내에 있을 때만 겹침으로 판단 (거의 0에 가깝게)
  const overlapThreshold = markerSizeKm * 0.05;
  
  // 추가 검증: 실제로 겹치는지 더 정확하게 판단
  const isActuallyOverlapping = distance <= overlapThreshold;
  
  if (isActuallyOverlapping) {
    console.log(`🔍 겹침 확인: 거리 ${distance.toFixed(6)}km, 임계값 ${overlapThreshold.toFixed(6)}km, 겹침: ${isActuallyOverlapping}`);
    console.log(`📍 클러스터1: ${cluster1.latitude.toFixed(4)}, ${cluster1.longitude.toFixed(4)}`);
    console.log(`📍 클러스터2: ${cluster2.latitude.toFixed(4)}, ${cluster2.longitude.toFixed(4)}`);
  }
  
  return isActuallyOverlapping;
}

// 최적 중심점 계산 함수
function calculateOptimalCenter(restaurants) {
  if (restaurants.length === 0) return null;
  
  // 단순 평균이 아닌, 식당 밀집 지역을 고려한 중심점 계산
  const lats = restaurants.map(r => r.latitude);
  const lngs = restaurants.map(r => r.longitude);
  
  // 중앙값 기반 중심점 (극값의 영향을 줄임)
  const sortedLats = lats.sort((a, b) => a - b);
  const sortedLngs = lngs.sort((a, b) => a - b);
  
  const midIndex = Math.floor(restaurants.length / 2);
  const centerLat = restaurants.length % 2 === 0 
    ? (sortedLats[midIndex - 1] + sortedLats[midIndex]) / 2
    : sortedLats[midIndex];
  
  const centerLng = restaurants.length % 2 === 0 
    ? (sortedLngs[midIndex - 1] + sortedLngs[midIndex]) / 2
    : sortedLngs[midIndex];
  
  return { latitude: centerLat, longitude: centerLng };
}

// 클러스터 중심점 유효성 검증 함수 (더 엄격한 검증)
function isValidClusterCenter(center, restaurants) {
  if (!center || restaurants.length === 0) return false;
  
  // 중심점이 모든 포함 식당의 범위 내에 있는지 확인 (극도로 엄격하게)
  const maxDistance = 0.005; // 최대 허용 거리: 5m (10m에서 5m로 축소)
  
  for (const restaurant of restaurants) {
    const distance = calculateDistance(
      center.latitude,
      center.longitude,
      restaurant.latitude,
      restaurant.longitude
    );
    
    if (distance > maxDistance) {
      console.log(`⚠️ 중심점 검증 실패: 식당과의 거리 ${distance.toFixed(6)}km가 너무 멂 (허용: ${maxDistance}km)`);
      return false;
    }
  }
  
  console.log(`✅ 중심점 검증 성공: 모든 식당이 허용 범위 내에 있음 (최대 거리: ${maxDistance}km)`);
  return true;
}

// 줌 레벨별 최적 클러스터 수 계산 함수
function getOptimalClusterCount(zoomLevel, totalRestaurants) {
  // 줌 레벨에 따른 목표 클러스터 수 계산
  let targetClusters;
  
  if (zoomLevel >= 16) {
    // 매우 가까운 줌: 식당당 1-2개 클러스터
    targetClusters = Math.min(totalRestaurants, Math.max(40, Math.floor(totalRestaurants / 15)));
  } else if (zoomLevel >= 14) {
    // 가까운 줌: 식당당 2-3개 클러스터
    targetClusters = Math.min(totalRestaurants, Math.max(20, Math.floor(totalRestaurants / 25)));
  } else if (zoomLevel >= 12) {
    // 중간 줌: 식당당 3-5개 클러스터
    targetClusters = Math.min(totalRestaurants, Math.max(10, Math.floor(totalRestaurants / 50)));
  } else if (zoomLevel >= 10) {
    // 넓은 줌: 식당당 5-10개 클러스터
    targetClusters = Math.min(totalRestaurants, Math.max(5, Math.floor(totalRestaurants / 100)));
  } else {
    // 매우 넓은 줌: 식당당 10개 이상 클러스터
    targetClusters = Math.min(totalRestaurants, Math.max(3, Math.floor(totalRestaurants / 200)));
  }
  
  // 최소/최대 제한
  targetClusters = Math.max(3, Math.min(targetClusters, totalRestaurants));
  
  return targetClusters;
}

// 마커 겹침 비율 계산 함수
function calculateOverlapRatio(cluster1, cluster2, zoomLevel) {
  // 줌 레벨에 따른 마커 크기 계산
  const markerSizePx = 40; // 마커 크기 (픽셀)
  
  let kmPerPixel;
  if (zoomLevel >= 16) {
    kmPerPixel = 0.001;
  } else if (zoomLevel >= 14) {
    kmPerPixel = 0.003;
  } else if (zoomLevel >= 12) {
    kmPerPixel = 0.008;
  } else if (zoomLevel >= 10) {
    kmPerPixel = 0.02;
  } else {
    kmPerPixel = 0.05;
  }
  
  // 마커 크기를 km 단위로 변환
  const markerSizeKm = (markerSizePx * kmPerPixel) / 1000;
  const markerRadius = markerSizeKm / 2; // 마커 반지름
  
  // 두 클러스터 간의 거리 계산
  const distance = calculateDistance(
    cluster1.center.latitude,
    cluster1.center.longitude,
    cluster2.center.latitude,
    cluster2.center.longitude
  );
  
  // 겹침이 없는 경우
  if (distance >= markerSizeKm) {
    return 0;
  }
  
  // 겹침이 있는 경우, 겹침 비율 계산
  // 두 원이 겹칠 때 겹침 비율 = (2 * 반지름 - 거리) / (2 * 반지름)
  const overlapDistance = Math.max(0, (2 * markerRadius) - distance);
  const overlapRatio = overlapDistance / (2 * markerRadius);
  
  return Math.min(1, Math.max(0, overlapRatio)); // 0~1 범위로 제한
}

// 추가 겹침 검증 함수 (더욱 엄격한 검증)
function performAdditionalOverlapCheck(cluster1, cluster2, zoomLevel) {
  // 줌 레벨에 따른 마커 크기 계산
  const markerSizePx = 40;
  
  let kmPerPixel;
  if (zoomLevel >= 16) {
    kmPerPixel = 0.001;
  } else if (zoomLevel >= 14) {
    kmPerPixel = 0.003;
  } else if (zoomLevel >= 12) {
    kmPerPixel = 0.008;
  } else if (zoomLevel >= 10) {
    kmPerPixel = 0.02;
  } else {
    kmPerPixel = 0.05;
  }
  
  const markerSizeKm = (markerSizePx * kmPerPixel) / 1000;
  const markerRadius = markerSizeKm / 2;
  
  // 두 클러스터 간의 거리 계산
  const distance = calculateDistance(
    cluster1.center.latitude,
    cluster1.center.longitude,
    cluster2.center.latitude,
    cluster2.center.longitude
  );
  
  // 극도로 엄격한 겹침 검증 (거의 완벽하게 겹쳐야 함)
  // 1. 거리가 마커 반지름의 0.3배 이내여야 함 (더욱 엄격하게)
  const strictDistanceThreshold = markerRadius * 0.3;
  
  if (distance > strictDistanceThreshold) {
    console.log(`🔍 추가 검증 실패: 거리 ${distance.toFixed(6)}km > 임계값 ${strictDistanceThreshold.toFixed(6)}km`);
    return false;
  }
  
  // 2. 두 클러스터의 식당들이 실제로 가까이 있는지 확인 (더욱 엄격하게)
  let closeRestaurantCount = 0;
  const requiredCloseRatio = 0.9; // 90% 이상의 식당이 가까이 있어야 함
  
  for (const restaurant1 of cluster1.restaurants) {
    for (const restaurant2 of cluster2.restaurants) {
      const restaurantDistance = calculateDistance(
        restaurant1.latitude,
        restaurant1.longitude,
        restaurant2.latitude,
        restaurant2.longitude
      );
      
      if (restaurantDistance <= markerSizeKm * 0.5) { // 마커 크기의 절반 이내
        closeRestaurantCount++;
      }
    }
  }
  
  const totalRestaurantPairs = cluster1.restaurants.length * cluster2.restaurants.length;
  const closeRatio = closeRestaurantCount / totalRestaurantPairs;
  
  console.log(`🔍 추가 검증: 가까운 식당 비율 ${(closeRatio * 100).toFixed(1)}% (필요: ${(requiredCloseRatio * 100).toFixed(1)}%)`);
  
  return closeRatio >= requiredCloseRatio;
}

// 안전한 배열 검증 함수
function isValidArray(array) {
  if (!array) return false;
  if (!Array.isArray(array)) return false;
  if (typeof array.length === 'undefined') return false;
  return true;
}

// 안전한 배열 복사 함수
function safeArrayCopy(sourceArray) {
  console.log(`🔍 safeArrayCopy 시작:`, {
    sourceType: typeof sourceArray,
    sourceIsArray: Array.isArray(sourceArray),
    sourceLength: sourceArray?.length,
    sourceValue: sourceArray,
    hasLength: typeof sourceArray?.length !== 'undefined'
  });
  
  if (!isValidArray(sourceArray)) {
    console.log(`⚠️ safeArrayCopy: 소스 배열이 유효하지 않음 (${typeof sourceArray})`);
    return [];
  }
  
  try {
    const copy = [...sourceArray];
    console.log(`✅ safeArrayCopy: 배열 복사 성공 (${copy.length}개)`, {
      copyType: typeof copy,
      copyIsArray: Array.isArray(copy),
      copyLength: copy.length,
      copyHasLength: typeof copy.length !== 'undefined'
    });
    return copy;
  } catch (error) {
    console.log(`❌ safeArrayCopy: 배열 복사 실패 - ${error.message}`);
    return [];
  }
}

// 즉시 반응하는 클러스터링 시스템 - detectSignificantClusterChange 함수 제거됨
  
  // 검색 결과에 따라 지도 자동 이동
  const moveMapToSearchResults = (searchResults) => {
    if (!mapRef.current || searchResults.length === 0) return;
    
    try {
      if (searchResults.length === 1) {
        // 단일 식당: 해당 위치로 지도 이동
        const restaurant = searchResults[0];
        if (restaurant.latitude && restaurant.longitude) {
          mapRef.current.animateToRegion({
            latitude: restaurant.latitude,
            longitude: restaurant.longitude,
            latitudeDelta: 0.005, // 더 가까운 줌
            longitudeDelta: 0.005,
          }, 1000);
          console.log('단일 식당 위치로 지도 이동:', restaurant.name);
        }
      } else {
        // 다중 식당: 모든 결과가 보이는 범위로 지도 이동
        const latitudes = searchResults.map(r => r.latitude).filter(lat => lat);
        const longitudes = searchResults.map(r => r.longitude).filter(lng => lng);
        
        if (latitudes.length > 0 && longitudes.length > 0) {
          const minLat = Math.min(...latitudes);
          const maxLat = Math.max(...latitudes);
          const minLng = Math.min(...longitudes);
          const maxLng = Math.max(...longitudes);
          
          const centerLat = (minLat + maxLat) / 2;
          const centerLng = (minLng + maxLng) / 2;
          
          // 모든 결과가 보이도록 여유 공간 추가
          const latDelta = Math.max(0.01, (maxLat - minLat) * 1.5);
          const lngDelta = Math.max(0.01, (maxLng - minLng) * 1.5);
          
          mapRef.current.animateToRegion({
            latitude: centerLat,
            longitude: centerLng,
            latitudeDelta: latDelta,
            longitudeDelta: lngDelta,
          }, 1000);
          console.log('다중 식당 범위로 지도 이동:', searchResults.length, '개');
        }
      }
    } catch (error) {
      console.error('지도 이동 오류:', error);
    }
  };
  
    const filteredRestaurants = displayRestaurants
    .filter(restaurant => {
      // 지도 영역 검색 시에는 검색어 필터링 건너뛰기
      if (isMapAreaSearch) {
        const matchesCategory = activeCategories.length === 0 || activeCategories.includes(restaurant.category);
        return matchesCategory;
      }
      
      // 일반 검색 시에는 검색어와 카테고리 모두 확인
      const matchesSearch = restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           restaurant.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategories.length === 0 || activeCategories.includes(restaurant.category);
      return matchesSearch && matchesCategory;
    });
    
  // 디버깅: 필터링 결과 확인
  console.log('필터링 결과:', {
    isMapAreaSearch,
    searchQuery: searchQuery || '없음',
    displayRestaurantsCount: displayRestaurants.length,
    filteredCount: filteredRestaurants.length,
    activeCategories
  });
  
  const filteredAndSortedRestaurants = filteredRestaurants.sort((a, b) => {
      switch (sortBy) {
        case 'distance':
          return a.distance - b.distance;
        case 'rating_desc':
          return b.rating - a.rating;
        case 'reviews_desc':
          return b.reviewCount - a.reviewCount;
        case 'recommend_desc':
          return b.recommendCount - a.recommendCount;
        default:
          return a.distance - b.distance;
      }
    });

  // PanResponder 설정
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      // 드래그 시작
    },
    onPanResponderMove: (evt, gestureState) => {
      const newHeight = listHeight - gestureState.dy;
      if (newHeight >= MIN_LIST_HEIGHT && newHeight <= MAX_LIST_HEIGHT) {
        setListHeight(newHeight);
        listHeightAnim.setValue(newHeight);
        // 리스트가 거의 최대 높이에 도달했는지 확인 (90% 이상)
        setIsListFullyExpanded(newHeight >= MAX_LIST_HEIGHT * 0.9);
      }
    },
    onPanResponderRelease: (evt, gestureState) => {
      const velocity = gestureState.vy;
      const currentHeight = listHeight;
      // 3단계 스냅: MIN, DEFAULT, MAX
      // 기준점 계산
      const mid1 = (MIN_LIST_HEIGHT + DEFAULT_LIST_HEIGHT) / 2;
      const mid2 = (DEFAULT_LIST_HEIGHT + MAX_LIST_HEIGHT) / 2;
      let targetHeight;
      if (currentHeight < mid1) {
        targetHeight = MIN_LIST_HEIGHT;
      } else if (currentHeight < mid2) {
        targetHeight = DEFAULT_LIST_HEIGHT;
      } else {
        targetHeight = MAX_LIST_HEIGHT;
      }
        Animated.spring(listHeightAnim, {
        toValue: targetHeight,
          useNativeDriver: false,
        }).start();
      setListHeight(targetHeight);
      // 스냅 후에도 완전히 확장되었는지 확인
      setIsListFullyExpanded(targetHeight >= MAX_LIST_HEIGHT * 0.9);
    },
  });

  const RestaurantCard = ({ restaurant }) => {
    const [restaurantData, setRestaurantData] = useState({
      reviews: [],
      averageRating: 0,
      reviewCount: 0,
      mostSelectedFoodTypes: [],
      topKeywords: [],
      latestImage: null
    });
    const [distance, setDistance] = useState(null);

    // 거리 계산 함수
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371; // 지구의 반지름 (km)
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      return distance;
    };

    useEffect(() => {
      const fetchRestaurantData = async () => {
        try {
          // 리뷰 데이터 가져오기
          const storedReviews = await AsyncStorage.getItem(`reviews_${restaurant.id}`);
          
          if (storedReviews) {
            const parsedReviews = JSON.parse(storedReviews);
            
            // 평균 평점 계산
            const averageRating = parsedReviews.length > 0 
              ? (parsedReviews.reduce((sum, review) => sum + review.rating, 0) / parsedReviews.length).toFixed(1)
              : 0;
            
            // 가장 많이 선택된 음식 종류 계산
            const foodTypeCount = {};
            parsedReviews.forEach(review => {
              if (review.food_types && review.food_types.length > 0) {
                review.food_types.forEach(foodType => {
                  foodTypeCount[foodType] = (foodTypeCount[foodType] || 0) + 1;
                });
              }
            });
            
            let maxCount = 0;
            const mostSelectedTypes = [];
            Object.keys(foodTypeCount).forEach(foodType => {
              if (foodTypeCount[foodType] > maxCount) {
                maxCount = foodTypeCount[foodType];
              }
            });
            Object.keys(foodTypeCount).forEach(foodType => {
              if (foodTypeCount[foodType] === maxCount && maxCount > 0) {
                mostSelectedTypes.push(foodType);
              }
            });
            
            // 키워드 계산
            const keywordCount = {};
            parsedReviews.forEach(review => {
              if (review.atmosphere && review.atmosphere.length > 0) {
                review.atmosphere.forEach(keyword => {
                  keywordCount[keyword] = (keywordCount[keyword] || 0) + 1;
                });
              }
              if (review.features && review.features.length > 0) {
                review.features.forEach(keyword => {
                  keywordCount[keyword] = (keywordCount[keyword] || 0) + 1;
                });
              }
            });
            
            const topKeywords = Object.keys(keywordCount)
              .sort((a, b) => keywordCount[b] - keywordCount[a])
              .slice(0, 3);
            
            // 최신 이미지 찾기
            let latestImage = null;
            if (parsedReviews.length > 0) {
              const sortedReviews = [...parsedReviews].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
              for (let review of sortedReviews) {
                if (review.images && review.images.length > 0) {
                  latestImage = review.images[0];
                  break;
                }
              }
            }
            
            setRestaurantData({
              reviews: parsedReviews,
              averageRating: parseFloat(averageRating),
              reviewCount: parsedReviews.length,
              mostSelectedFoodTypes: mostSelectedTypes,
              topKeywords: topKeywords,
              latestImage: latestImage
            });
          } else {
            setRestaurantData({
              reviews: [],
              averageRating: 0,
              reviewCount: 0,
              mostSelectedFoodTypes: [],
              topKeywords: [],
              latestImage: null
            });
          }

          // 거리 계산
          if (restaurant.latitude && restaurant.longitude) {
            const currentLat = 37.5665;
            const currentLon = 126.9780;
            const calculatedDistance = calculateDistance(
              currentLat, currentLon,
              restaurant.latitude, restaurant.longitude
            );
            setDistance(calculatedDistance);
          }
        } catch (error) {
          console.error('식당 데이터 로드 오류:', error);
        }
      };

      fetchRestaurantData();
    }, [restaurant.id]);

    return (
      <TouchableOpacity
        key={restaurant.id}
        style={{
          backgroundColor: currentColors.surface,
          borderRadius: 16,
          marginHorizontal: 16,
          marginBottom: 12,
          padding: 16,
          elevation: 2,
          shadowColor: currentColors.primary,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          borderWidth: 1,
          borderColor: currentColors.lightGray
        }}
        onPress={() => handleRestaurantPress(restaurant)}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* 최신 이미지 */}
          <View style={{ width: 54, height: 54, borderRadius: 12, marginRight: 14, overflow: 'hidden' }}>
            {restaurantData.latestImage ? (
              <Image 
                source={{ uri: restaurantData.latestImage }} 
                style={{ width: 54, height: 54, borderRadius: 12 }}
                resizeMode="cover"
              />
            ) : (
              <View style={{ 
                width: 54, 
                height: 54, 
                borderRadius: 12, 
                backgroundColor: currentColors.background, 
                justifyContent: 'center', 
                alignItems: 'center' 
              }}>
                <Text style={{ fontSize: 26 }}>🍽️</Text>
              </View>
            )}
          </View>
          
          <View style={{ flex: 1 }}>
            {/* 식당 이름과 음식 종류 */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{ fontSize: 17, fontWeight: 'bold', color: currentColors.text, flex: 1 }}>
                {restaurant.name}
              </Text>
              {restaurantData.mostSelectedFoodTypes.length > 0 && (
                <View style={{
                  backgroundColor: currentColors.primary,
                  borderRadius: 16,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  marginLeft: 8
                }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>
                    {restaurantData.mostSelectedFoodTypes[0]}
                  </Text>
                </View>
              )}
            </View>
            
            {/* 별점, 리뷰 수, 거리 */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Ionicons name="star" size={14} color={currentColors.yellow} style={{ marginRight: 2 }} />
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: currentColors.text }}>
                {restaurantData.reviewCount > 0 ? restaurantData.averageRating.toFixed(1) : '0.0'}
              </Text>
              <Text style={{ fontSize: 13, color: currentColors.textSecondary, marginLeft: 4 }}>
                ({restaurantData.reviewCount})
              </Text>
              {distance !== null && (
                <Text style={{ fontSize: 13, color: currentColors.textSecondary, marginLeft: 10 }}>
                  {distance < 1 ? `${(distance * 1000).toFixed(0)}m` : `${distance.toFixed(1)}km`}
                </Text>
              )}
            </View>
            
            {/* 주소 */}
            <Text style={{ 
              color: currentColors.textSecondary, 
              fontSize: 12, 
              marginTop: 4
            }}>
              {restaurant.address}
            </Text>
            
            {/* 키워드 */}
            {restaurantData.topKeywords.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
                {restaurantData.topKeywords.slice(0, 3).map((keyword, index) => (
                  <Text key={index} style={{ 
                    color: currentColors.textSecondary, 
                    fontSize: 12, 
                    marginRight: 8,
                    marginBottom: 4
                  }}>
                    #{keyword}
                  </Text>
                ))}
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderRestaurantCard = (restaurant) => (
    <RestaurantCard restaurant={restaurant} />
  );

  const renderFilterButton = (type, label) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filterType === type && { backgroundColor: currentColors.yellow, borderColor: currentColors.yellow }
      ]}
      onPress={() => setFilterType(type)}
    >
      <Text style={[
        styles.filterButtonText,
        filterType === type && { color: currentColors.text, fontWeight: '600' }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderSortButton = (type, label) => (
    <TouchableOpacity
      style={[
        styles.sortButton,
        sortBy === type && { backgroundColor: currentColors.deepBlue, borderColor: currentColors.deepBlue }
      ]}
      onPress={() => setSortBy(type)}
    >
      <Text style={[
        styles.sortButtonText,
        sortBy === type && { color: '#fff', fontWeight: '600' }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: currentColors.background }]}>
        <ActivityIndicator size="large" color={currentColors.yellow} />
        <Text style={[styles.loadingText, { color: currentColors.textSecondary }]}>맛집을 찾고 있습니다...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background }]}>
      <TouchableOpacity
        style={{ flex: 1 }}
        activeOpacity={1}
        onPress={() => setShowSearchHistory(false)}
      >
      {/* 검색창 */}
      <View style={[styles.searchContainer, { backgroundColor: currentColors.surface, borderBottomColor: currentColors.border }]}>
        <View style={[styles.searchInputContainer, { backgroundColor: currentColors.background }]}>
          <Ionicons name="search" size={20} color={currentColors.gray} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: currentColors.text }]}
            placeholder="지역, 맛집을 검색해보세요"
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              // 검색어가 없을 때만 히스토리 표시
              if (text.length === 0) {
                if (searchHistory.length > 0) {
                  setShowSearchHistory(true);
                }
              } else {
                setShowSearchHistory(false);
              }
              
              // 검색어가 변경되면 지도 영역 검색 모드 해제
              if (text.length > 0) {
                setIsMapAreaSearch(false);
                setMapAreaResults([]);
              }
            }}
            onFocus={() => {
              if (searchHistory.length > 0) {
                setShowSearchHistory(true);
              }
            }}
            placeholderTextColor={currentColors.textSecondary}
            onSubmitEditing={async () => {
              if (searchQuery.trim()) {
                console.log('검색 시작:', searchQuery);
                saveSearchHistory(searchQuery);
                // 지도 영역 검색 모드 해제
                setIsMapAreaSearch(false);
                setMapAreaResults([]);
                await searchRestaurantsByQuery(searchQuery);
                setShowSearchHistory(false);
              }
            }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
                          onPress={() => {
              setSearchQuery('');
              setShowSearchHistory(false);
              // 지도 영역 검색 모드 해제하고 현재 위치로 다시 검색
              setIsMapAreaSearch(false);
              setMapAreaResults([]);
              // getCurrentLocation() 호출하지 않음 - 지도 위치 유지
            }}
              style={{ padding: 8 }}
            >
              <Ionicons name="close-circle" size={20} color={currentColors.gray} />
            </TouchableOpacity>
          )}
        </View>

        {/* 검색 히스토리 */}
        {showSearchHistory && searchHistory.length > 0 && (
          <View style={[styles.searchHistoryContainer, { backgroundColor: currentColors.surface }]}>
            <View style={styles.searchHistoryHeader}>
            <Text style={[styles.searchHistoryTitle, { color: currentColors.textSecondary }]}>
              최근 검색어
            </Text>
              <TouchableOpacity
                onPress={() => {
                  setSearchHistory([]);
                  AsyncStorage.removeItem('searchHistory');
                  setShowSearchHistory(false);
                }}
                style={styles.clearHistoryButton}
              >
                <Text style={[styles.clearHistoryText, { color: currentColors.gray }]}>전체 삭제</Text>
              </TouchableOpacity>
            </View>
            {searchHistory.map((historyItem, index) => (
              <TouchableOpacity
                key={index}
                style={styles.searchHistoryItem}
                onPress={async () => {
                  setSearchQuery(historyItem);
                  setShowSearchHistory(false);
                  // 지도 영역 검색 모드 해제
                  setIsMapAreaSearch(false);
                  setMapAreaResults([]);
                  await searchRestaurantsByQuery(historyItem);
                }}
              >
                <Ionicons name="time-outline" size={16} color={currentColors.gray} style={{ marginRight: 8 }} />
                <Text style={[styles.searchHistoryText, { color: currentColors.text }]}>
                  {historyItem}
                </Text>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    const newHistory = searchHistory.filter((_, i) => i !== index);
                    setSearchHistory(newHistory);
                    AsyncStorage.setItem('searchHistory', JSON.stringify(newHistory));
                  }}
                  style={styles.removeHistoryButton}
                >
                  <Ionicons name="close" size={16} color={currentColors.gray} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}




      </View>

              {/* 지도 섹션 */}
        <Animated.View style={[styles.mapContainer, { height: height - listHeight }]}>
          {location && mapRegion && (
            <PlatformMap
                              key={`map-${mapDisplayedRestaurants.length}-${mapRegion?.latitudeDelta?.toFixed(6) || 'default'}`}
              ref={mapRef}
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              region={mapRegion}
              onRegionChangeComplete={(region) => {
                // 지도 영역이 실제로 변경되었을 때만 업데이트 (무한 루프 방지)
                setMapRegion(prevRegion => {
                  if (!prevRegion || 
                      Math.abs(prevRegion.latitude - region.latitude) > 0.0001 ||
                      Math.abs(prevRegion.longitude - region.longitude) > 0.0001 ||
                      Math.abs(prevRegion.latitudeDelta - region.latitudeDelta) > 0.0001 ||
                      Math.abs(prevRegion.longitudeDelta - region.longitudeDelta) > 0.0001) {
                
                // 지도 이동 감지
                const bounds = {
                  northeast: {
                    lat: region.latitude + region.latitudeDelta / 2,
                    lng: region.longitude + region.longitudeDelta / 2
                  },
                  southwest: {
                    lat: region.latitude - region.latitudeDelta / 2,
                    lng: region.longitude - region.longitudeDelta / 2
                  }
                };
                setMapBounds(bounds);
                setIsMapMoved(true);
                    
                    return region;
                  }
                  return prevRegion;
                });
              }}
            >
              {/* 현재 위치 마커 */}
              <PlatformMarker
                coordinate={location}
                title="현재 위치"
                pinColor={currentColors.deepBlue}
              />

              {/* KOICA 회사 특별 마커 */}
              <PlatformMarker
                coordinate={{
                  latitude: 37.41504641,
                  longitude: 127.0993841
                }}
                title="KOICA"
                description="한국국제협력단"
                pinColor="#3B82F6"
              >
                <View style={{
                  backgroundColor: '#3B82F6',
                  borderRadius: 20,
                  padding: 8,
                  borderWidth: 2,
                  borderColor: '#FFFFFF',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 4
                }}>
                  <Text style={{
                    color: '#FFFFFF',
                    fontSize: 12,
                    fontWeight: 'bold',
                    textAlign: 'center'
                  }}>
                    KOICA
                  </Text>
                </View>
              </PlatformMarker>

              {/* 맛집 마커들 - 클러스터링 적용 (완전한 클러스터 방지) */}
              {(() => {
                // 데이터가 없으면 마커를 표시하지 않음
                if (!filteredAndSortedRestaurants || 
                    filteredAndSortedRestaurants.length === 0) {
                  console.log('마커 렌더링 조건 불만족: 데이터 없음');
                  return null;
                }
                
                // 항상 마커 표시 (초기 로딩 시에도)
                console.log('마커 렌더링 조건 만족:', {
                  isMapAreaSearch,
                  searchQuery: searchQuery || '없음',
                  dataCount: filteredAndSortedRestaurants.length
                });
                
                console.log('마커 렌더링 시작:', {
                  isMapAreaSearch,
                  searchQuery: searchQuery || '없음',
                  dataCount: filteredAndSortedRestaurants.length
                });
                
                // 미리 계산된 클러스터 사용
                console.log('클러스터 사용:', {
                  totalClusters: clusters.length,
                  zoomLevel: lastZoomLevel.toFixed(2),
                  totalRestaurants: filteredAndSortedRestaurants.length
                });
                
                // 유효한 클러스터만 필터링
                const validClusters = clusters.filter(cluster => 
                  cluster.latitude && cluster.longitude &&
                  cluster.latitude !== 0 && cluster.longitude !== 0 &&
                  cluster.latitude >= 33 && cluster.latitude <= 39 &&
                  cluster.longitude >= 124 && cluster.longitude <= 132
                );
                
                console.log('유효한 클러스터:', validClusters.length, '개');
                
                return validClusters.map((cluster, index) => {
                  // 애니메이션을 위한 좌표 계산
                  let displayLatitude = cluster.latitude;
                  let displayLongitude = cluster.longitude;
                  
                  // 클러스터 변화가 있는 경우에만 애니메이션 적용
                  if (cluster.isNew && isAnimating && cluster.startLatitude && cluster.startLongitude && cluster.animationType !== 'unchanged') {
                    // 시작 위치에서 끝 위치로 부드럽게 이동
                    const progress = isAnimating ? 0.1 : 1.0; // 애니메이션 진행도 (0.1에서 시작하여 더 부드럽게)
                    displayLatitude = cluster.startLatitude + (cluster.endLatitude - cluster.startLatitude) * progress;
                    displayLongitude = cluster.startLongitude + (cluster.endLongitude - cluster.startLongitude) * progress;
                  }
                  
                  return (
                <PlatformMarker
                      key={`cluster-${cluster.latitude.toFixed(6)}-${cluster.longitude.toFixed(6)}-${cluster.restaurants.length}`}
                  coordinate={{
                        latitude: displayLatitude,
                        longitude: displayLongitude,
                      }}
                      tracksViewChanges={false}
                      anchor={{ x: 0.5, y: 0.5 }}
                      stopPropagation={true}
                      flat={true}
                      title={cluster.restaurants.length === 1 ? cluster.restaurants[0].name : `${cluster.restaurants.length}개 식당`}
                      description={cluster.restaurants.length === 1 ? cluster.restaurants[0].category : '여러 식당'}
                      onPress={() => {
                        if (cluster.restaurants.length === 1) {
                          handleMarkerPress(cluster.restaurants[0]);
                        } else {
                          // 클러스터 클릭 시 클러스터 내 식당 목록 표시
                          setSelectedCluster(cluster);
                        }
                      }}
                    >
                      <Animated.View style={{
                        backgroundColor: currentColors.primary,
                        borderRadius: 20,
                        width: 40,
                        height: 40,
                        justifyContent: 'center',
                        alignItems: 'center',
                        borderWidth: 3,
                        borderColor: '#FFFFFF',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.3,
                        shadowRadius: 4,
                        elevation: 4,
                        // 애니메이션 효과 추가 (스케일만)
                        transform: [{
                          scale: isAnimating ? 1.1 : 1.0
                        }]
                      }}>
                        <Text style={{
                          color: '#FFFFFF',
                          fontSize: 12,
                          fontWeight: 'bold'
                        }}>
                          {cluster.restaurants.length}
                        </Text>
                      </Animated.View>
                    </PlatformMarker>
                  );
                });
              })()}
                              {/* 디버깅: 현재 페이지 식당 수와 지도 마커 수 확인 (로그 제거로 무한 루프 방지) */}
                {/* {console.log(`표시된 식당 수: ${displayedRestaurants.length}, 지도 마커 수: ${mapDisplayedRestaurants.length}`)} */}
            </PlatformMap>
          )}

          {/* 현재 위치 플로팅 버튼 */}
          {!isListFullyExpanded && (
            <TouchableOpacity
              style={{
                position: 'absolute',
                bottom: 32,
                right: 88,
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: currentColors.surface,
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 10,
                elevation: 8,
                shadowColor: currentColors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8
              }}
              onPress={getCurrentLocation}
              activeOpacity={0.85}
            >
              <Ionicons name="locate" size={24} color={currentColors.primary} />
            </TouchableOpacity>
          )}

          {/* 현재 지도에서 검색 버튼 */}
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: 20,
              left: 20,
              backgroundColor: currentColors.primary,
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 10,
              elevation: 4,
              shadowColor: currentColors.primary,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
            }}
            onPress={async () => {
              if (mapBounds) {
                setLoading(true);
                
                // 데이터가 없으면 미리 로드
                if (!restaurantsWithData || restaurantsWithData.length === 0) {
                  console.log('지도 영역 검색 전 데이터 미리 로드...');
                  // Excel 데이터 로드 제거
        const csvData = [];
                  if (csvData && csvData.length > 0) {
                    const restaurantsWithRecommendData = csvData.map(restaurant => ({
                      ...restaurant,
                      recommendCount: 0
                    }));
                    
                    // 상태 즉시 업데이트
                    setRestaurantsWithData(restaurantsWithRecommendData);
                    setRestaurants(restaurantsWithRecommendData);
                    
                    console.log('지도 영역 검색 전 데이터 로드 완료:', csvData.length, '개');
                  }
                }
                
                console.log('지도 영역 검색 시작 - 현재 데이터 상태:', {
                  restaurantsWithDataLength: restaurantsWithData?.length || 0,
                  restaurantsLength: restaurants?.length || 0
                });
                
                const boundsResults = await searchRestaurantsInBounds(mapBounds);
                
                // 거리 계산 추가 (현재 지도 중심점 기준)
                const mapCenter = {
                  latitude: (mapBounds.northeast.lat + mapBounds.southwest.lat) / 2,
                  longitude: (mapBounds.northeast.lng + mapBounds.southwest.lng) / 2
                };
                
                const restaurantsWithDistance = boundsResults.map(restaurant => ({
                  ...restaurant,
                  distance: calculateDistance(
                    mapCenter.latitude,
                    mapCenter.longitude,
                    restaurant.latitude,
                    restaurant.longitude
                  )
                }));
                
                const sortedResults = restaurantsWithDistance.sort((a, b) => a.distance - b.distance);
                
                // 무한 스크롤 초기화
                initializeInfiniteScroll(sortedResults);
                
                // 지도 영역 검색 결과를 별도 상태로 저장
                setMapAreaResults(sortedResults);
                setIsMapAreaSearch(true);
                setLoading(false);
                
                console.log('지도 영역 검색 완료:', boundsResults.length, '개 식당');
              } else {
                Alert.alert('알림', '지도를 이동한 후 다시 시도해주세요.');
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>
              지도 영역 검색
            </Text>
          </TouchableOpacity>

          {/* 식당 신청 플로팅 버튼 */}
          {!isListFullyExpanded && (
            <TouchableOpacity
              style={{
                position: 'absolute',
                bottom: 32,
                right: 24,
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: currentColors.primary,
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 10,
                elevation: 8,
                shadowColor: currentColors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8
              }}
              activeOpacity={0.85}
              onPress={() => setRequestModalVisible(true)}
            >
              <Ionicons name="add" size={32} color="#fff" />
            </TouchableOpacity>
          )}

        {/* 선택된 클러스터 정보 */}
        {selectedCluster && (
          <View style={[styles.selectedRestaurantCard, { backgroundColor: currentColors.surface, shadowColor: currentColors.primary }]}>
            <View style={styles.selectedCardHeader}>
              <Text style={[styles.selectedRestaurantName, { color: currentColors.text }]}>
                {selectedCluster.restaurants.length}개 식당
              </Text>
              <TouchableOpacity
                onPress={() => setSelectedCluster(null)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={20} color={currentColors.gray} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 200 }}>
              {selectedCluster.restaurants.map((restaurant, index) => (
                <TouchableOpacity
                  key={restaurant.id}
                  style={[styles.clusterRestaurantItem, { borderBottomColor: currentColors.border }]}
                  onPress={() => {
                    setSelectedRestaurant(restaurant);
                    setSelectedCluster(null);
                  }}
                >
                  <Text style={[styles.clusterRestaurantName, { color: currentColors.text }]}>
                    {restaurant.name}
                  </Text>
                  <Text style={[styles.clusterRestaurantCategory, { color: currentColors.textSecondary }]}>
                    {restaurant.category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          )}

        {/* 선택된 맛집 정보 */}
        {selectedRestaurant && (
          <View style={[styles.selectedRestaurantCard, { backgroundColor: currentColors.surface, shadowColor: currentColors.primary }]}>
            <View style={styles.selectedCardHeader}>
              <Text style={[styles.selectedRestaurantName, { color: currentColors.text }]}>
                {selectedRestaurant.name}
              </Text>
              <TouchableOpacity
                onPress={() => setSelectedRestaurant(null)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={20} color={currentColors.gray} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.selectedRestaurantAddress, { color: currentColors.textSecondary }]}>
              {selectedRestaurant.address}
            </Text>
            <View style={styles.selectedCardDetails}>
              <View style={styles.selectedRatingContainer}>
                <Ionicons name="star" size={16} color={currentColors.yellow} />
                <Text style={[styles.selectedRatingText, { color: currentColors.text }]}>
                  {selectedRestaurant.rating > 0 ? selectedRestaurant.rating.toFixed(1) : '0.0'}
                </Text>
                <Text style={[styles.selectedReviewText, { color: currentColors.textSecondary }]}>
                  ({selectedRestaurant.reviewCount || 0})
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.viewDetailButton, { backgroundColor: currentColors.primary }]}
              onPress={() => handleRestaurantPress(selectedRestaurant)}
            >
              <Text style={[styles.viewDetailButtonText, { color: '#fff' }]}>
                상세 정보 보기
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>

      {/* 드래그 가능한 리스트 섹션 */}
      <Animated.View style={[styles.listSection, { height: listHeightAnim, backgroundColor: currentColors.surface, shadowColor: currentColors.primary }]}> 
        {/* 드래그 핸들 */}
        <View {...panResponder.panHandlers} style={[styles.dragHandle, { backgroundColor: currentColors.surface }]}> 
          <View style={[styles.dragIndicator, { backgroundColor: currentColors.border }]} />
        </View>

        {/* 소통탭 스타일의 필터/정렬 바 */}
        <View style={{ backgroundColor: currentColors.surface, paddingHorizontal: 8, paddingTop: 8, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: currentColors.border }}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ alignItems: 'center' }}
          >
            {/* '필터' 버튼 (아이콘 포함) */}
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: activeCategories.length > 0 ? currentColors.primary : currentColors.surface,
                borderRadius: 20,
                paddingVertical: 7,
                paddingHorizontal: 14,
                marginRight: 8,
                elevation: activeCategories.length > 0 ? 2 : 1,
                shadowColor: currentColors.primary,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: activeCategories.length > 0 ? 0.2 : 0.1,
                shadowRadius: 4,
                borderWidth: 1,
                borderColor: activeCategories.length > 0 ? currentColors.primary : currentColors.lightGray
              }}
              onPress={() => setCategoryModalVisible(true)}
            >
              <Ionicons name="options-outline" size={16} color={activeCategories.length > 0 ? '#fff' : currentColors.deepBlue} style={{ marginRight: 5, marginTop: 0 }} />
              <Text style={{
                color: activeCategories.length > 0 ? '#FFFFFF' : currentColors.text,
                fontWeight: activeCategories.length > 0 ? 'bold' : '600',
                fontSize: 14
              }}>필터</Text>
            </TouchableOpacity>
            
            {/* 정렬 필터 (소통탭 스타일) */}
            {sortOptions.map(option => (
              <TouchableOpacity
                key={option}
                style={{
                  backgroundColor: (() => {
                    switch (option) {
                      case '거리순': return sortBy === 'distance' ? currentColors.primary : '#FFFFFF';
                      case '평점순': return sortBy === 'rating_desc' ? currentColors.primary : '#FFFFFF';
                      case '리뷰순': return sortBy === 'reviews_desc' ? currentColors.primary : '#FFFFFF';
                      case '오찬추천순': return sortBy === 'recommend_desc' ? currentColors.primary : '#FFFFFF';
                      default: return '#FFFFFF';
                    }
                  })(),
                  borderRadius: 20,
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  marginRight: 8,
                  elevation: (() => {
                    switch (option) {
                      case '거리순': return sortBy === 'distance' ? 4 : 0;
                      case '평점순': return sortBy === 'rating_desc' ? 4 : 0;
                      case '리뷰순': return sortBy === 'reviews_desc' ? 4 : 0;
                      case '오찬추천순': return sortBy === 'recommend_desc' ? 4 : 0;
                      default: return 0;
                    }
                  })(),
                  shadowColor: (() => {
                    switch (option) {
                      case '거리순': return sortBy === 'distance' ? currentColors.primary : 'transparent';
                      case '평점순': return sortBy === 'rating_desc' ? currentColors.primary : 'transparent';
                      case '리뷰순': return sortBy === 'reviews_desc' ? currentColors.primary : 'transparent';
                      case '오찬추천순': return sortBy === 'recommend_desc' ? currentColors.primary : 'transparent';
                      default: return 'transparent';
                    }
                  })(),
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: (() => {
                    switch (option) {
                      case '거리순': return sortBy === 'distance' ? 0.3 : 0;
                      case '평점순': return sortBy === 'rating_desc' ? 0.3 : 0;
                      case '리뷰순': return sortBy === 'reviews_desc' ? 0.3 : 0;
                      case '오찬추천순': return sortBy === 'recommend_desc' ? 0.3 : 0;
                      default: return 0;
                    }
                  })(),
                  shadowRadius: 4,
                  borderWidth: 1,
                  borderColor: (() => {
                    switch (option) {
                      case '거리순': return sortBy === 'distance' ? currentColors.primary : '#E5E7EB';
                      case '평점순': return sortBy === 'rating_desc' ? currentColors.primary : '#E5E7EB';
                      case '리뷰순': return sortBy === 'reviews_desc' ? currentColors.primary : '#E5E7EB';
                      case '오찬추천순': return sortBy === 'recommend_desc' ? currentColors.primary : '#E5E7EB';
                      default: return '#E5E7EB';
                    }
                  })()
                }}
                onPress={() => {
                  setActiveSort(option);
                  // 정렬 옵션에 따른 sortBy 설정
                  switch (option) {
                    case '거리순':
                      setSortBy('distance');
                      break;
                    case '평점순':
                      setSortBy('rating_desc');
                      break;
                    case '리뷰순':
                      setSortBy('reviews_desc');
                      break;
                    case '오찬추천순':
                      setSortBy('recommend_desc');
                      break;
                    default:
                      setSortBy('distance');
                  }
                }}
              >
                <Text style={{
                  color: (() => {
                    switch (option) {
                      case '거리순': return sortBy === 'distance' ? '#FFFFFF' : currentColors.text;
                      case '평점순': return sortBy === 'rating_desc' ? '#FFFFFF' : currentColors.text;
                      case '리뷰순': return sortBy === 'reviews_desc' ? '#FFFFFF' : currentColors.text;
                      case '오찬추천순': return sortBy === 'recommend_desc' ? '#FFFFFF' : currentColors.text;
                      default: return currentColors.text;
                    }
                  })(),
                  fontWeight: (() => {
                    switch (option) {
                      case '거리순': return sortBy === 'distance' ? 'bold' : '600';
                      case '평점순': return sortBy === 'rating_desc' ? 'bold' : '600';
                      case '리뷰순': return sortBy === 'reviews_desc' ? 'bold' : '600';
                      case '오찬추천순': return sortBy === 'recommend_desc' ? 'bold' : '600';
                      default: return '600';
                    }
                  })(),
                  fontSize: 14
                }}>{option}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* 카테고리 선택 모달 */}
        <Modal
          visible={categoryModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setCategoryModalVisible(false)}
        >
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center' }}
            activeOpacity={1}
            onPressOut={() => setCategoryModalVisible(false)}
          >
            <View style={{ backgroundColor: currentColors.surface, borderRadius: 16, padding: 24, minWidth: 220, elevation: 8 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: currentColors.text, marginBottom: 16, textAlign: 'center' }}>카테고리 선택</Text>
              {categoryOptions.map(option => {
                const selected = activeCategories.includes(option);
                return (
                  <TouchableOpacity
                    key={option}
                    style={{
                      backgroundColor: selected ? currentColors.primary : currentColors.surface,
                      borderRadius: 12,
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      marginBottom: 8,
                      borderWidth: 1,
                      borderColor: selected ? currentColors.primary : currentColors.lightGray,
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onPress={() => {
                      if (selected) {
                        setActiveCategories(activeCategories.filter(c => c !== option));
                      } else {
                        setActiveCategories([...activeCategories, option]);
                      }
                    }}
                  >
                    <Text style={{
                      color: selected ? '#FFFFFF' : currentColors.text,
                      fontWeight: selected ? 'bold' : '600',
                      fontSize: 16
                    }}>{option}</Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={{ marginTop: 8, alignItems: 'center' }}
                onPress={() => {
                  setActiveCategories([]);
                  setCategoryModalVisible(false);
                }}
              >
                <Text style={{ color: currentColors.gray, fontSize: 14 }}>카테고리 선택 해제</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* 리스트 내용 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 }}>
          {/* 오프라인 상태 표시 */}
          {isOffline && (
            <View style={styles.offlineNotice}>
              <Text style={styles.offlineText}>
                📱 오프라인 모드 - 로컬 데이터 사용 중
              </Text>
            </View>
          )}
          
          {/* 맛집 개수 정보 */}
          <Text style={[styles.resultCount, { color: currentColors.text, backgroundColor: currentColors.background, marginBottom: 8, flex: 1 }]}> 
            {restaurants.length}개의 맛집
          </Text>
        </View>
        
                 <ScrollView 
           style={[styles.listContainer, { backgroundColor: currentColors.surface }]} 
           showsVerticalScrollIndicator={true}
           contentContainerStyle={{ 
             paddingBottom: 200,
             minHeight: listHeight - 100 // 리스트 높이에 맞춰 최소 높이 설정
           }}
           nestedScrollEnabled={true}
           scrollEnabled={true}
         >
          {displayedRestaurants.length === 0 ? (
            // 식당 목록이 비어있을 때 안내 메시지
            <View style={[styles.emptyStateContainer, { 
              minHeight: listHeight - 150, // 리스트 높이에 맞춰 최소 높이 설정
              justifyContent: 'flex-start', // 상단부터 시작
              paddingTop: 20
            }]}>
              <Ionicons name="search-outline" size={64} color={currentColors.gray} />
              <Text style={[styles.emptyStateTitle, { color: currentColors.text }]}>
                맛집을 찾아보세요!
            </Text>
              <Text style={[styles.emptyStateSubtitle, { color: currentColors.textSecondary }]}>
                검색창에 원하는 음식이나 지역을 입력하거나{'\n'}
                지도 영역 검색을 통해 주변 맛집을 찾아보세요
              </Text>
              
              {/* 리스트 높이가 작을 때 안내 */}
              {listHeight <= MIN_LIST_HEIGHT + 50 && (
                <View style={[styles.heightNotice, { backgroundColor: currentColors.primaryLight }]}>
                  <Ionicons name="arrow-up" size={20} color={currentColors.primary} />
                  <Text style={[styles.heightNoticeText, { color: currentColors.primary }]}>
                    위로 드래그하여 더 많은 내용을 보세요
                  </Text>
                </View>
              )}
              <View style={styles.emptyStateButtons}>
            <TouchableOpacity
                  style={[styles.emptyStateButton, { backgroundColor: currentColors.primary }]}
                  onPress={() => {
                    setSearchQuery('버거');
                    searchRestaurantsByQuery('버거');
                  }}
                >
                  <Text style={[styles.emptyStateButtonText, { color: '#FFFFFF' }]}>
                    🍔 버거 검색
              </Text>
            </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.emptyStateButton, { backgroundColor: currentColors.surface, borderColor: currentColors.primary, borderWidth: 1 }]}
                  onPress={async () => {
                    // 지도 영역 검색 실행
                    if (mapBounds) {
                      setLoading(true);
                      const boundsResults = await searchRestaurantsInBounds(mapBounds);
                      
                      // 거리 계산 추가 (현재 지도 중심점 기준)
                      const mapCenter = {
                        latitude: (mapBounds.northeast.lat + mapBounds.southwest.lat) / 2,
                        longitude: (mapBounds.northeast.lng + mapBounds.southwest.lng) / 2
                      };
                      
                      const restaurantsWithDistance = boundsResults.map(restaurant => ({
                        ...restaurant,
                        distance: calculateDistance(
                          mapCenter.latitude,
                          mapCenter.longitude,
                          restaurant.latitude,
                          restaurant.longitude
                        )
                      }));
                      
                      const sortedResults = restaurantsWithDistance.sort((a, b) => a.distance - b.distance);
                      
                      // 무한 스크롤 초기화
                      initializeInfiniteScroll(sortedResults);
                      
                      // 지도 영역 검색 결과를 별도 상태로 저장
                      setMapAreaResults(sortedResults);
                      setIsMapAreaSearch(true);
                      setLoading(false);
                      
                      console.log('지도 영역 검색 완료:', boundsResults.length, '개 식당');
                    }
                  }}
                >
                  <Text style={[styles.emptyStateButtonText, { color: currentColors.primary }]}>
                    🗺️ 지도 영역 검색
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            displayedRestaurants.map((restaurant) => (
            <View key={restaurant.id}>
              {renderRestaurantCard(restaurant)}
            </View>
            ))
          )}
          
          {/* 무한 스크롤 UI */}
          {hasMoreData && (
            <View style={styles.infiniteScrollContainer}>
              <TouchableOpacity
                style={[
                  styles.loadMoreButton,
                  isLoadingMore && styles.loadMoreButtonDisabled
                ]}
                onPress={loadMoreRestaurants}
                disabled={isLoadingMore}
              activeOpacity={0.8}
            >
                {isLoadingMore ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.loadMoreButtonText}>더 보기</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
          
          {!hasMoreData && displayedRestaurants.length > 0 && (
            <Text style={styles.noMoreDataText}>
              모든 식당을 불러왔습니다
            </Text>
          )}
          
          {/* 인기 식당 섹션 */}
          {popularRestaurants.length > 0 && (
            <View style={styles.popularSection}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: currentColors.text }]}>
                  🔥 이번 주 인기 식당
                </Text>
                <TouchableOpacity
                  onPress={() => setShowPopularRestaurants(!showPopularRestaurants)}
                  style={styles.toggleButton}
                >
                  <Text style={[styles.toggleButtonText, { color: currentColors.primary }]}>
                    {showPopularRestaurants ? '접기' : '펼치기'}
              </Text>
            </TouchableOpacity>
              </View>
              
              {showPopularRestaurants && (
                <View style={styles.popularRestaurantsList}>
                  {popularRestaurants.map((item, index) => (
                    <TouchableOpacity
                      key={item.restaurant.id}
                      style={[styles.popularRestaurantItem, { backgroundColor: currentColors.surface }]}
                      onPress={() => {
                        // 인기 식당을 검색 결과에 추가
                        const restaurant = item.restaurant;
                        setDisplayedRestaurants([restaurant, ...displayedRestaurants]);
                        setMapDisplayedRestaurants([restaurant, ...mapDisplayedRestaurants]);
                        // 지도에서 해당 식당 위치로 이동
                        moveMapToSearchResults([restaurant]);
                      }}
                    >
                      <View style={styles.popularRank}>
                        <Text style={[styles.rankText, { color: currentColors.primary }]}>
                          {index + 1}
            </Text>
                      </View>
                      <View style={styles.popularRestaurantInfo}>
                        <Text style={[styles.popularRestaurantName, { color: currentColors.text }]}>
                          {item.restaurant.name}
                        </Text>
                        <Text style={[styles.popularRestaurantCategory, { color: currentColors.textSecondary }]}>
                          {item.restaurant.category}
                        </Text>
                        <View style={styles.popularStats}>
                          <Text style={[styles.popularStatText, { color: currentColors.textSecondary }]}>
                            방문: {item.visit_score || 0}회
                          </Text>
                          <Text style={[styles.popularStatText, { color: currentColors.textSecondary }]}>
                            리뷰: {item.review_score || 0}개
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
          
          {/* 개인화 추천 섹션 */}
          {personalizedRecommendations.length > 0 && (
            <View style={styles.popularSection}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: currentColors.text }]}>
                  🎯 맞춤 추천
                </Text>
                <TouchableOpacity
                  onPress={() => setShowRecommendations(!showRecommendations)}
                  style={styles.toggleButton}
                >
                  <Text style={[styles.toggleButtonText, { color: currentColors.primary }]}>
                    {showRecommendations ? '접기' : '펼치기'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              {showRecommendations && (
                <View style={styles.popularRestaurantsList}>
                  {personalizedRecommendations.map((item, index) => (
                    <TouchableOpacity
                      key={item.restaurant.id}
                      style={[styles.popularRestaurantItem, { backgroundColor: currentColors.surface }]}
                      onPress={() => {
                        // 추천 식당을 검색 결과에 추가
                        const restaurant = item.restaurant;
                        setDisplayedRestaurants([restaurant, ...displayedRestaurants]);
                        setMapDisplayedRestaurants([restaurant, ...mapDisplayedRestaurants]);
                        // 지도에서 해당 식당 위치로 이동
                        moveMapToSearchResults([restaurant]);
                      }}
                    >
                      <View style={[styles.popularRank, { backgroundColor: '#E0E7FF' }]}>
                        <Text style={[styles.rankText, { color: currentColors.primary }]}>
                          {index + 1}
              </Text>
                      </View>
                      <View style={styles.popularRestaurantInfo}>
                        <Text style={[styles.popularRestaurantName, { color: currentColors.text }]}>
                          {item.restaurant.name}
                        </Text>
                        <Text style={[styles.popularRestaurantCategory, { color: currentColors.textSecondary }]}>
                          {item.restaurant.category}
                        </Text>
                        <View style={styles.popularStats}>
                          <Text style={[styles.popularStatText, { color: currentColors.primary }]}>
                            추천점수: {item.score}점
                          </Text>
                        </View>
                        {item.reasons && item.reasons.length > 0 && (
                          <View style={styles.recommendationReasons}>
                            {item.reasons.slice(0, 2).map((reason, idx) => (
                              <Text key={idx} style={[styles.reasonText, { color: currentColors.textSecondary }]}>
                                • {reason}
                              </Text>
                            ))}
                          </View>
                        )}
                      </View>
            </TouchableOpacity>
                  ))}
          </View>
              )}
            </View>
          )}
        </ScrollView>
        

      </Animated.View>
      </TouchableOpacity>

      {/* 식당 신청 모달 */}
      <RestaurantRequestModalWrapper
        visible={showRestaurantRequest}
        onClose={() => setShowRestaurantRequest(false)}
        currentUser={{ employee_id: 'KOICA001', nickname: '테스트 사용자' }}
      />

      {/* 방문 기록 모달 */}
      {showVisitModal && selectedRestaurantForVisit && (
        <VisitRecordModal
          visible={showVisitModal}
          restaurant={selectedRestaurantForVisit}
          onClose={() => {
            setShowVisitModal(false);
            setSelectedRestaurantForVisit(null);
          }}
          onSubmit={addRestaurantVisit}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 25,
    paddingHorizontal: 15,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#1E293B',
  },
  mapContainer: {
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  selectedRestaurantCard: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
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
  selectedCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectedRestaurantName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  selectedRestaurantAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  selectedCardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectedRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedRatingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginLeft: 4,
  },
  selectedReviewText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  selectedDistanceText: {
    fontSize: 14,
    color: '#035AA6',
    fontWeight: '500',
  },
  selectedTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  selectedTag: {
    backgroundColor: '#F4D160',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 4,
  },
  selectedTagText: {
    fontSize: 12,
    color: '#1E293B',
    fontWeight: '500',
  },
  viewDetailButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  viewDetailButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  searchHistoryContainer: {
    position: 'absolute',
    top: 72,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 1000,
  },
  searchHistoryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  searchHistoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  searchHistoryText: {
    fontSize: 14,
  },
  listSection: {
    backgroundColor: '#f8f9fa',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  dragHandle: {
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
  },
  filterContainer: {
    paddingVertical: 10,
    backgroundColor: '#f8f9fa',
  },
  filterButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  filterButtonActive: {
    backgroundColor: '#F4D160',
    borderColor: '#F4D160',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#1E293B',
    fontWeight: '600',
  },
  sortContainer: {
    paddingVertical: 10,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sortButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 15,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  sortButtonActive: {
    backgroundColor: '#035AA6',
    borderColor: '#035AA6',
  },
  sortButtonText: {
    fontSize: 12,
    color: '#666',
  },
  sortButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  resultCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
  },
  listContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  restaurantCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardImageText: {
    fontSize: 24,
  },
  cardContent: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  restaurantCategory: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  cardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infiniteScrollContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadMoreButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    marginHorizontal: 16,
  },
  loadMoreButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  loadMoreButtonDisabled: {
    backgroundColor: '#CBD5E0',
  },
  noMoreDataText: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  popularSection: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  toggleButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  popularRestaurantsList: {
    gap: 8,
  },
  popularRestaurantItem: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  popularRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  popularRestaurantInfo: {
    flex: 1,
  },
  popularRestaurantName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  popularRestaurantCategory: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  popularStats: {
    flexDirection: 'row',
    gap: 12,
  },
  popularStatText: {
    fontSize: 12,
  },
  recommendationReasons: {
    marginTop: 4,
  },
  reasonText: {
    fontSize: 11,
    marginBottom: 2,
  },
  offlineNotice: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  offlineText: {
    fontSize: 14,
    color: '#92400E',
    fontWeight: '600',
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginLeft: 4,
  },
  reviewText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  distanceText: {
    fontSize: 12,
    color: '#035AA6',
    fontWeight: '500',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 20,
    paddingHorizontal: 16,
    minHeight: 120,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  emptyStateButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  emptyStateButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    minWidth: 100,
    alignItems: 'center',
  },
  emptyStateButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#F4D160',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 10,
    color: '#1E293B',
    fontWeight: '500',
  },
  uploadContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  clusterRestaurantItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  clusterRestaurantName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  clusterRestaurantCategory: {
    fontSize: 14,
    color: '#64748B',
  },
  popularSearchesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  closePopularSearchesButton: {
    padding: 4,
  },
  heightNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 16,
    marginBottom: 16,
  },
  heightNoticeText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});

// 식당 신청 모달 컴포넌트
const RestaurantRequestModalWrapper = ({ visible, onClose, currentUser }) => {
  return (
    <RestaurantRequestModal
      visible={visible}
      onClose={onClose}
      currentUser={currentUser}
    />
  );
};

export default RestaurantMap; 