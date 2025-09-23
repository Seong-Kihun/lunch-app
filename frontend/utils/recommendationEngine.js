import AsyncStorage from '@react-native-vector-icons/AsyncStorage';

// 개인화 추천 엔진 클래스
class RecommendationEngine {
  constructor() {
    this.userPreferences = {};
    this.diningHistory = [];
    this.recommendationCache = new Map();
    this.cacheExpiry = 30 * 60 * 1000; // 30분
    
    this.init();
  }

  // 초기화
  async init() {
    await this.loadUserPreferences();
    await this.loadDiningHistory();
  }

  // 사용자 선호도 로드
  async loadUserPreferences() {
    try {
      const preferences = await AsyncStorage.getItem('user_preferences');
      if (preferences) {
        this.userPreferences = JSON.parse(preferences);
        console.log('✅ 사용자 선호도 로드됨');
      }
    } catch (error) {
      console.error('사용자 선호도 로드 실패:', error);
    }
  }

  // 사용자 선호도 저장
  async saveUserPreferences() {
    try {
      await AsyncStorage.setItem('user_preferences', JSON.stringify(this.userPreferences));
      console.log('💾 사용자 선호도 저장됨');
    } catch (error) {
      console.error('사용자 선호도 저장 실패:', error);
    }
  }

  // 식사 기록 로드
  async loadDiningHistory() {
    try {
      const history = await AsyncStorage.getItem('dining_history');
      if (history) {
        this.diningHistory = JSON.parse(history);
        console.log('✅ 식사 기록 로드됨');
      }
    } catch (error) {
      console.error('식사 기록 로드 실패:', error);
    }
  }

  // 식사 기록 저장
  async saveDiningHistory() {
    try {
      await AsyncStorage.setItem('dining_history', JSON.stringify(this.diningHistory));
      console.log('💾 식사 기록 저장됨');
    } catch (error) {
      console.error('식사 기록 저장 실패:', error);
    }
  }

  // 사용자 선호도 업데이트
  async updateUserPreferences(preferences) {
    this.userPreferences = { ...this.userPreferences, ...preferences };
    await this.saveUserPreferences();
    
    // 캐시 무효화
    this.recommendationCache.clear();
    
    console.log('🔄 사용자 선호도 업데이트됨');
  }

  // 식사 기록 추가
  async addDiningRecord(record) {
    const newRecord = {
      ...record,
      timestamp: Date.now(),
      id: Date.now().toString()
    };
    
    this.diningHistory.unshift(newRecord);
    
    // 최근 100개 기록만 유지
    if (this.diningHistory.length > 100) {
      this.diningHistory = this.diningHistory.slice(0, 100);
    }
    
    await this.saveDiningHistory();
    
    // 선호도 자동 업데이트
    await this.updatePreferencesFromHistory();
    
    console.log('🍽️ 식사 기록 추가됨');
  }

  // 기록 기반 선호도 자동 업데이트
  async updatePreferencesFromHistory() {
    if (this.diningHistory.length === 0) return;

    const recentHistory = this.diningHistory.slice(0, 20); // 최근 20개 기록
    
    // 카테고리 선호도 계산
    const categoryCount = {};
    const ratingSum = {};
    const ratingCount = {};
    
    recentHistory.forEach(record => {
      if (record.category) {
        categoryCount[record.category] = (categoryCount[record.category] || 0) + 1;
        
        if (record.rating) {
          ratingSum[record.category] = (ratingSum[record.category] || 0) + record.rating;
          ratingCount[record.category] = (ratingCount[record.category] || 0) + 1;
        }
      }
    });

    // 카테고리별 평균 평점 계산
    const categoryPreferences = {};
    Object.keys(categoryCount).forEach(category => {
      const avgRating = ratingCount[category] ? ratingSum[category] / ratingCount[category] : 0;
      const frequency = categoryCount[category] / recentHistory.length;
      
      // 평점과 빈도를 종합한 선호도 점수 (0-1)
      categoryPreferences[category] = (avgRating / 5) * 0.6 + frequency * 0.4;
    });

    // 가격대 선호도 계산
    const pricePreferences = this.calculatePricePreferences(recentHistory);
    
    // 시간대 선호도 계산
    const timePreferences = this.calculateTimePreferences(recentHistory);

    // 선호도 업데이트
    await this.updateUserPreferences({
      categoryPreferences,
      pricePreferences,
      timePreferences,
      lastUpdated: Date.now()
    });
  }

  // 가격대 선호도 계산
  calculatePricePreferences(history) {
    const priceRanges = {
      'low': { min: 0, max: 10000, count: 0, totalRating: 0 },
      'medium': { min: 10000, max: 20000, count: 0, totalRating: 0 },
      'high': { min: 20000, max: 30000, count: 0, totalRating: 0 },
      'premium': { min: 30000, max: Infinity, count: 0, totalRating: 0 }
    };

    history.forEach(record => {
      if (record.price && record.rating) {
        Object.keys(priceRanges).forEach(range => {
          const { min, max } = priceRanges[range];
          if (record.price >= min && record.price < max) {
            priceRanges[range].count++;
            priceRanges[range].totalRating += record.rating;
          }
        });
      }
    });

    const preferences = {};
    Object.keys(priceRanges).forEach(range => {
      const { count, totalRating } = priceRanges[range];
      if (count > 0) {
        preferences[range] = (totalRating / count) / 5; // 0-1 범위로 정규화
      } else {
        preferences[range] = 0.5; // 기본값
      }
    });

    return preferences;
  }

  // 시간대 선호도 계산
  calculateTimePreferences(history) {
    const timeRanges = {
      'breakfast': { start: 6, end: 11, count: 0, totalRating: 0 },
      'lunch': { start: 11, end: 17, count: 0, totalRating: 0 },
      'dinner': { start: 17, end: 22, count: 0, totalRating: 0 },
      'late_night': { start: 22, end: 6, count: 0, totalRating: 0 }
    };

    history.forEach(record => {
      if (record.timestamp && record.rating) {
        const hour = new Date(record.timestamp).getHours();
        Object.keys(timeRanges).forEach(range => {
          const { start, end } = timeRanges[range];
          if (start <= end) {
            if (hour >= start && hour < end) {
              timeRanges[range].count++;
              timeRanges[range].totalRating += record.rating;
            }
          } else {
            // 야간 시간대 (22시-6시)
            if (hour >= start || hour < end) {
              timeRanges[range].count++;
              timeRanges[range].totalRating += record.rating;
            }
          }
        });
      }
    });

    const preferences = {};
    Object.keys(timeRanges).forEach(range => {
      const { count, totalRating } = timeRanges[range];
      if (count > 0) {
        preferences[range] = (totalRating / count) / 5; // 0-1 범위로 정규화
      } else {
        preferences[range] = 0.5; // 기본값
      }
    });

    return preferences;
  }

  // 개인화 추천 점수 계산
  calculatePersonalizedScore(restaurant, userContext = {}) {
    let score = 0;
    let totalWeight = 0;

    // 1. 카테고리 선호도 (가중치: 0.3)
    if (this.userPreferences.categoryPreferences && restaurant.category) {
      const categoryScore = this.userPreferences.categoryPreferences[restaurant.category] || 0;
      score += categoryScore * 0.3;
      totalWeight += 0.3;
    }

    // 2. 가격대 선호도 (가중치: 0.2)
    if (this.userPreferences.pricePreferences && restaurant.price_range) {
      let priceRange = 'medium';
      if (restaurant.price_range <= 10000) priceRange = 'low';
      else if (restaurant.price_range <= 20000) priceRange = 'medium';
      else if (restaurant.price_range <= 30000) priceRange = 'high';
      else priceRange = 'premium';

      const priceScore = this.userPreferences.pricePreferences[priceRange] || 0.5;
      score += priceScore * 0.2;
      totalWeight += 0.2;
    }

    // 3. 시간대 선호도 (가중치: 0.15)
    if (this.userPreferences.timePreferences) {
      const currentHour = new Date().getHours();
      let timeRange = 'lunch';
      if (currentHour >= 6 && currentHour < 11) timeRange = 'breakfast';
      else if (currentHour >= 11 && currentHour < 17) timeRange = 'lunch';
      else if (currentHour >= 17 && currentHour < 22) timeRange = 'dinner';
      else timeRange = 'late_night';

      const timeScore = this.userPreferences.timePreferences[timeRange] || 0.5;
      score += timeScore * 0.15;
      totalWeight += 0.15;
    }

    // 4. 거리 선호도 (가중치: 0.15)
    if (restaurant.distance) {
      // 거리가 가까울수록 높은 점수 (1km 이내: 1.0, 5km 이상: 0.0)
      const distanceScore = Math.max(0, 1 - (restaurant.distance / 5));
      score += distanceScore * 0.15;
      totalWeight += 0.15;
    }

    // 5. 평점 (가중치: 0.1)
    if (restaurant.average_rating) {
      const ratingScore = restaurant.average_rating / 5;
      score += ratingScore * 0.1;
      totalWeight += 0.1;
    }

    // 6. 리뷰 수 (가중치: 0.05)
    if (restaurant.review_count) {
      // 리뷰 수가 많을수록 높은 점수 (최대 100개 기준)
      const reviewScore = Math.min(1, restaurant.review_count / 100);
      score += reviewScore * 0.05;
      totalWeight += 0.05;
    }

    // 7. 사용자 컨텍스트 (가중치: 0.05)
    if (userContext.weather === 'rainy' && restaurant.hasIndoorSeating) {
      score += 0.05; // 비 오는 날 실내 좌석 보너스
      totalWeight += 0.05;
    }

    // 가중 평균 계산
    return totalWeight > 0 ? score / totalWeight : 0;
  }

  // 개인화된 식당 추천
  async getPersonalizedRecommendations(restaurants, userContext = {}, limit = 10) {
    const cacheKey = `recommendations_${JSON.stringify(userContext)}_${restaurants.length}`;
    
    // 캐시 확인
    if (this.recommendationCache.has(cacheKey)) {
      const cached = this.recommendationCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        console.log('📖 캐시된 추천 결과 사용');
        return cached.data;
      }
    }

    // 개인화 점수 계산
    const scoredRestaurants = restaurants.map(restaurant => ({
      ...restaurant,
      personalizedScore: this.calculatePersonalizedScore(restaurant, userContext)
    }));

    // 점수순으로 정렬
    scoredRestaurants.sort((a, b) => b.personalizedScore - a.personalizedScore);

    // 상위 결과 반환
    const recommendations = scoredRestaurants.slice(0, limit);

    // 캐시에 저장
    this.recommendationCache.set(cacheKey, {
      data: recommendations,
      timestamp: Date.now()
    });

    console.log('🎯 개인화 추천 생성됨');
    return recommendations;
  }

  // 그룹 추천 (여러 사용자 선호도 고려)
  async getGroupRecommendations(restaurants, userIds, limit = 10) {
    // 그룹 멤버들의 선호도 로드
    const groupPreferences = await this.loadGroupPreferences(userIds);
    
    // 그룹 선호도 기반 점수 계산
    const scoredRestaurants = restaurants.map(restaurant => ({
      ...restaurant,
      groupScore: this.calculateGroupScore(restaurant, groupPreferences)
    }));

    // 점수순으로 정렬
    scoredRestaurants.sort((a, b) => b.groupScore - a.groupScore);

    return scoredRestaurants.slice(0, limit);
  }

  // 그룹 선호도 로드
  async loadGroupPreferences(userIds) {
    // 실제 구현에서는 서버에서 그룹 멤버들의 선호도를 가져와야 함
    // 여기서는 기본값 반환
    return {
      categoryPreferences: {},
      pricePreferences: {},
      timePreferences: {}
    };
  }

  // 그룹 점수 계산
  calculateGroupScore(restaurant, groupPreferences) {
    // 그룹 선호도 기반 점수 계산 로직
    let score = 0;
    
    // 간단한 그룹 점수 계산 (실제로는 더 복잡한 알고리즘 필요)
    if (groupPreferences.categoryPreferences[restaurant.category]) {
      score += groupPreferences.categoryPreferences[restaurant.category];
    }
    
    return score;
  }

  // 추천 품질 개선을 위한 피드백 수집
  async collectRecommendationFeedback(recommendationId, feedback) {
    try {
      const feedbackData = {
        recommendationId,
        feedback,
        timestamp: Date.now(),
        userPreferences: this.userPreferences
      };

      // 피드백 저장 (실제로는 서버에 전송)
      const existingFeedback = await AsyncStorage.getItem('recommendation_feedback') || '[]';
      const feedbackList = JSON.parse(existingFeedback);
      feedbackList.push(feedbackData);
      
      await AsyncStorage.setItem('recommendation_feedback', JSON.stringify(feedbackList));
      
      console.log('📝 추천 피드백 수집됨');
    } catch (error) {
      console.error('추천 피드백 수집 실패:', error);
    }
  }

  // 추천 시스템 성능 분석
  async analyzeRecommendationPerformance() {
    try {
      const feedback = await AsyncStorage.getItem('recommendation_feedback');
      if (!feedback) return null;

      const feedbackList = JSON.parse(feedback);
      const recentFeedback = feedbackList.filter(f => 
        Date.now() - f.timestamp < 7 * 24 * 60 * 60 * 1000 // 최근 7일
      );

      const analysis = {
        totalFeedback: feedbackList.length,
        recentFeedback: recentFeedback.length,
        positiveFeedback: recentFeedback.filter(f => f.feedback === 'positive').length,
        negativeFeedback: recentFeedback.filter(f => f.feedback === 'negative').length,
        satisfactionRate: 0
      };

      if (recentFeedback.length > 0) {
        analysis.satisfactionRate = analysis.positiveFeedback / recentFeedback.length;
      }

      return analysis;
    } catch (error) {
      console.error('추천 성능 분석 실패:', error);
      return null;
    }
  }

  // 추천 시스템 초기화
  async resetRecommendationSystem() {
    try {
      this.userPreferences = {};
      this.diningHistory = [];
      this.recommendationCache.clear();
      
      await AsyncStorage.removeItem('user_preferences');
      await AsyncStorage.removeItem('dining_history');
      await AsyncStorage.removeItem('recommendation_feedback');
      
      console.log('🔄 추천 시스템 초기화됨');
    } catch (error) {
      console.error('추천 시스템 초기화 실패:', error);
    }
  }
}

// 싱글톤 인스턴스 생성
const recommendationEngine = new RecommendationEngine();

export default recommendationEngine;
