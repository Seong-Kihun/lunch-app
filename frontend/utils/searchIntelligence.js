import AsyncStorage from '@react-native-async-storage/async-storage';

class SearchIntelligence {
  constructor() {
    this.userPreferences = {};
    this.searchHistory = [];
    this.restaurantRatings = {};
    this.categoryPreferences = {};
    this.init();
  }

  async init() {
    await this.loadUserData();
  }

  // 사용자 데이터 로드
  async loadUserData() {
    try {
      const [prefs, history, ratings, categories] = await Promise.all([
        AsyncStorage.getItem('userPreferences'),
        AsyncStorage.getItem('searchHistory'),
        AsyncStorage.getItem('restaurantRatings'),
        AsyncStorage.getItem('categoryPreferences')
      ]);

      this.userPreferences = prefs ? JSON.parse(prefs) : {};
      this.searchHistory = history ? JSON.parse(history) : [];
      this.restaurantRatings = ratings ? JSON.parse(ratings) : {};
      this.categoryPreferences = categories ? JSON.parse(categories) : {};
    } catch (error) {
      console.error('사용자 데이터 로드 실패:', error);
    }
  }

  // 검색 기록 저장
  async saveSearchHistory(query) {
    try {
      // 중복 제거 및 최신 순으로 정렬
      this.searchHistory = [
        query,
        ...this.searchHistory.filter(item => item !== query)
      ].slice(0, 50); // 최대 50개 유지

      await AsyncStorage.setItem('searchHistory', JSON.stringify(this.searchHistory));
    } catch (error) {
      console.error('검색 기록 저장 실패:', error);
    }
  }

  // 사용자 선호도 업데이트
  async updateUserPreferences(preferences) {
    try {
      this.userPreferences = { ...this.userPreferences, ...preferences };
      await AsyncStorage.setItem('userPreferences', JSON.stringify(this.userPreferences));
    } catch (error) {
      console.error('사용자 선호도 업데이트 실패:', error);
    }
  }

  // 식당 평점 저장
  async saveRestaurantRating(restaurantId, rating) {
    try {
      this.restaurantRatings[restaurantId] = rating;
      await AsyncStorage.setItem('restaurantRatings', JSON.stringify(this.restaurantRatings));
    } catch (error) {
      console.error('식당 평점 저장 실패:', error);
    }
  }

  // 카테고리 선호도 업데이트
  async updateCategoryPreference(category, action) {
    try {
      if (!this.categoryPreferences[category]) {
        this.categoryPreferences[category] = { visits: 0, rating: 0, lastVisit: null };
      }

      const pref = this.categoryPreferences[category];
      if (action === 'visit') {
        pref.visits += 1;
        pref.lastVisit = new Date().toISOString();
      } else if (action === 'rate') {
        pref.rating = Math.max(pref.rating, 0.1);
      }

      await AsyncStorage.setItem('categoryPreferences', JSON.stringify(this.categoryPreferences));
    } catch (error) {
      console.error('카테고리 선호도 업데이트 실패:', error);
    }
  }

  // 스마트 검색 추천
  getSmartSearchSuggestions(query, context = {}) {
    const suggestions = [];

    // 1. 검색 기록 기반 추천
    const historySuggestions = this.searchHistory
      .filter(item => item.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 3);
    suggestions.push(...historySuggestions);

    // 2. 사용자 선호도 기반 추천
    if (this.userPreferences.favoriteFoods) {
      const foodSuggestions = this.userPreferences.favoriteFoods
        .filter(food => food.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 2);
      suggestions.push(...foodSuggestions);
    }

    // 3. 인기 검색어 기반 추천
    const popularSearches = this.getPopularSearches();
    const popularSuggestions = popularSearches
      .filter(item => item.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 2);
    suggestions.push(...popularSuggestions);

    // 4. 컨텍스트 기반 추천
    if (context.time) {
      const timeBasedSuggestions = this.getTimeBasedSuggestions(context.time);
      suggestions.push(...timeBasedSuggestions);
    }

    if (context.location) {
      const locationBasedSuggestions = this.getLocationBasedSuggestions(context.location);
      suggestions.push(...locationBasedSuggestions);
    }

    // 중복 제거 및 정렬
    return [...new Set(suggestions)].slice(0, 8);
  }

  // 인기 검색어 계산
  getPopularSearches() {
    const searchCounts = {};
    this.searchHistory.forEach(query => {
      searchCounts[query] = (searchCounts[query] || 0) + 1;
    });

    return Object.entries(searchCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([query]) => query);
  }

  // 시간대별 추천
  getTimeBasedSuggestions(time) {
    const hour = new Date(time).getHours();
    const suggestions = [];

    if (hour >= 6 && hour < 11) {
      suggestions.push('아침', '브런치', '커피');
    } else if (hour >= 11 && hour < 15) {
      suggestions.push('점심', '한식', '중식', '일식');
    } else if (hour >= 15 && hour < 18) {
      suggestions.push('간식', '디저트', '카페');
    } else if (hour >= 18 && hour < 22) {
      suggestions.push('저녁', '양식', '술집', '고기집');
    } else {
      suggestions.push('야식', '치킨', '피자');
    }

    return suggestions;
  }

  // 위치 기반 추천
  getLocationBasedSuggestions(location) {
    // 위치 기반 추천 로직 (실제로는 더 복잡할 수 있음)
    return ['근처 맛집', '주변 식당', '가까운 카페'];
  }

  // 개인화된 검색 결과 정렬
  sortSearchResults(results, userId) {
    return results.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      // 사용자 평점 가중치
      if (this.restaurantRatings[a.id]) {
        scoreA += this.restaurantRatings[a.id] * 2;
      }
      if (this.restaurantRatings[b.id]) {
        scoreB += this.restaurantRatings[b.id] * 2;
      }

      // 카테고리 선호도 가중치
      if (this.categoryPreferences[a.category]) {
        scoreA += this.categoryPreferences[a.category].visits * 0.5;
      }
      if (this.categoryPreferences[b.category]) {
        scoreB += this.categoryPreferences[b.category].visits * 0.5;
      }

      // 거리 가중치 (가까울수록 높은 점수)
      if (a.distance && b.distance) {
        scoreA += (1000 - Math.min(a.distance, 1000)) / 100;
        scoreB += (1000 - Math.min(b.distance, 1000)) / 100;
      }

      // 평점 가중치
      scoreA += (a.rating || 0) * 1.5;
      scoreB += (b.rating || 0) * 1.5;

      return scoreB - scoreA;
    });
  }

  // 검색 패턴 분석
  analyzeSearchPatterns() {
    const patterns = {
      mostSearchedTime: this.getMostSearchedTime(),
      favoriteCategories: this.getFavoriteCategories(),
      searchTrends: this.getSearchTrends()
    };

    return patterns;
  }

  // 가장 많이 검색하는 시간대
  getMostSearchedTime() {
    // 실제 구현에서는 더 정교한 분석 필요
    return '12:00-13:00';
  }

  // 선호하는 카테고리
  getFavoriteCategories() {
    return Object.entries(this.categoryPreferences)
      .sort(([,a], [,b]) => b.visits - a.visits)
      .slice(0, 5)
      .map(([category]) => category);
  }

  // 검색 트렌드
  getSearchTrends() {
    // 최근 검색어 변화 추이 분석
    return this.searchHistory.slice(-10);
  }

  // 검색 쿼리 확장
  expandSearchQuery(query) {
    const expansions = {
      '한식': ['한국음식', '국밥', '김치찌개', '비빔밥'],
      '중식': ['중국음식', '짜장면', '탕수육', '마파두부'],
      '일식': ['일본음식', '초밥', '라멘', '우동'],
      '양식': ['서양음식', '파스타', '피자', '스테이크'],
      '카페': ['커피', '디저트', '베이커리', '음료']
    };

    const expanded = [query];
    Object.entries(expansions).forEach(([category, terms]) => {
      if (query.includes(category)) {
        expanded.push(...terms);
      }
    });

    return [...new Set(expanded)];
  }
}

export default new SearchIntelligence();
