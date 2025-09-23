// 엑셀 데이터 처리 유틸리티

// 샘플 엑셀 데이터 구조 (A열: 식당명, B열: 지번주소)
export const sampleExcelData = [
  { name: '맛있는 한식당', address: '서울시 강남구 테헤란로 123' },
  { name: '신선한 중식당', address: '서울시 강남구 역삼동 456' },
  { name: '고급 일식당', address: '서울시 강남구 삼성동 789' },
  { name: '분식천국', address: '서울시 강남구 논현동 321' },
  { name: '피자헛', address: '서울시 강남구 청담동 654' },
  { name: '스타벅스 강남점', address: '서울시 강남구 신사동 111' },
  { name: '김치찌개 전문점', address: '서울시 강남구 압구정동 222' },
  { name: '초밥집', address: '서울시 강남구 도산대로 333' },
  { name: '떡볶이 가게', address: '서울시 강남구 청담대로 444' },
  { name: '파스타 전문점', address: '서울시 강남구 강남대로 555' }
];

// 주소를 좌표로 변환하는 함수 (Google Geocoding API 사용)
export const geocodeAddress = async (address) => {
  try {
    // API 키가 유효하지 않으므로 임시로 하드코딩된 좌표 사용
    // 실제로는 유효한 Google API 키가 필요합니다
    
    // 서울 강남구 기준 좌표 (임시)
    const seoulCoordinates = {
      '경기도 성남시 수정구 태평동 3524-3': { latitude: 37.4411, longitude: 127.1376 },
      '서울시 강남구 테헤란로 123': { latitude: 37.5013, longitude: 127.0396 },
      '서울시 강남구 역삼동 456': { latitude: 37.5000, longitude: 127.0360 },
      '서울시 강남구 삼성동 789': { latitude: 37.5080, longitude: 127.0560 },
      '서울시 강남구 논현동 321': { latitude: 37.5100, longitude: 127.0200 },
      '서울시 강남구 청담동 654': { latitude: 37.5200, longitude: 127.0500 },
      '서울시 강남구 신사동 111': { latitude: 37.5150, longitude: 127.0200 },
      '서울시 강남구 압구정동 222': { latitude: 37.5300, longitude: 127.0300 },
      '서울시 강남구 도산대로 333': { latitude: 37.5250, longitude: 127.0400 },
      '서울시 강남구 청담대로 444': { latitude: 37.5200, longitude: 127.0500 },
      '서울시 강남구 강남대로 555': { latitude: 37.5000, longitude: 127.0300 }
    };
    
    // 주소에 해당하는 좌표가 있으면 반환
    if (seoulCoordinates[address]) {
      return seoulCoordinates[address];
    }
    
    // 기본 좌표 (강남역 근처)
    return { latitude: 37.5013, longitude: 127.0396 };
    
  } catch (error) {
    console.error('주소 변환 오류:', error);
    // 기본 좌표 반환
    return { latitude: 37.5013, longitude: 127.0396 };
  }
};

// 카테고리 자동 감지 함수
const detectCategory = (restaurantName) => {
  const name = restaurantName.toLowerCase();
  
  // 한식 키워드
  if (name.includes('한식') || name.includes('김치') || name.includes('삼겹살') || 
      name.includes('갈비') || name.includes('국수') || name.includes('찌개') ||
      name.includes('비빔밥') || name.includes('불고기')) {
    return '한식';
  }
  
  // 중식 키워드
  if (name.includes('중식') || name.includes('중국') || name.includes('짜장') || 
      name.includes('탕수육') || name.includes('마파두부') || name.includes('깐풍기')) {
    return '중식';
  }
  
  // 일식 키워드
  if (name.includes('일식') || name.includes('일본') || name.includes('초밥') || 
      name.includes('라멘') || name.includes('우동') || name.includes('돈까스') ||
      name.includes('스시')) {
    return '일식';
  }
  
  // 양식 키워드
  if (name.includes('양식') || name.includes('피자') || name.includes('파스타') || 
      name.includes('스테이크') || name.includes('샌드위치') || name.includes('버거')) {
    return '양식';
  }
  
  // 분식 키워드
  if (name.includes('분식') || name.includes('떡볶이') || name.includes('김밥') || 
      name.includes('라면') || name.includes('순대')) {
    return '분식';
  }
  
  // 카페 키워드
  if (name.includes('카페') || name.includes('커피') || name.includes('스타벅스') || 
      name.includes('투썸') || name.includes('할리스')) {
    return '카페';
  }
  
  // 디저트 키워드
  if (name.includes('디저트') || name.includes('케이크') || name.includes('아이스크림') || 
      name.includes('빵') || name.includes('베이커리')) {
    return '디저트';
  }
  
  return '기타'; // 기본값
};

// 엑셀 데이터를 앱 형식으로 변환
export const processExcelData = async (excelData) => {
  const processedData = [];
  
  for (let i = 0; i < excelData.length; i++) {
    const restaurant = excelData[i];
    
    // 진행률을 10% 단위로만 표시 (로그 간소화)
    if (i % Math.ceil(excelData.length / 10) === 0 || i === excelData.length - 1) {
      const progress = Math.round(((i + 1) / excelData.length) * 100);
      console.log(`식당 데이터 처리 중... ${progress}%`);
    }
    
    // 주소를 좌표로 변환
    const coordinates = await geocodeAddress(restaurant.address);

         // 카테고리 자동 감지
         const category = detectCategory(restaurant.name);

         processedData.push({
           id: i + 1,
           name: restaurant.name,
           address: restaurant.address,
           category: category,
           rating: 0, // 기본값
           user_ratings_total: 0, // 기본값
           latitude: coordinates.latitude,
           longitude: coordinates.longitude,
           distance: 0, // 거리는 나중에 계산
           recommendCount: 0,
           reviewCount: 0
         });
  }
  
  return processedData;
};

// 거리 계산 함수
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // 지구의 반지름 (km)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // km 단위
  return distance;
};

// 현재 위치 기준으로 거리 계산
export const calculateDistancesFromCurrentLocation = (restaurants, currentLat, currentLon) => {
  return restaurants.map(restaurant => ({
    ...restaurant,
    distance: calculateDistance(
      currentLat, 
      currentLon, 
      restaurant.latitude, 
      restaurant.longitude
    )
  }));
}; 