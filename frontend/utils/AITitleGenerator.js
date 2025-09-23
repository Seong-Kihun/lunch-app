// 새로운 AI 제목 생성기 - 요일별 다양한 문구와 식당 키워드 활용
// 기존의 복잡한 로직을 단순하고 효과적인 키워드 조합 시스템으로 대체

// ===== 요일별 다양한 문구 (랜덤 선택) =====

// 월요일 다양한 문구
const MONDAY_PHRASES = [
    "월요일 점심은",
    "월요일 점심",
    "월요일 한가한 점심",
    "월요일 시작 점심",
    "월요일 휴식 점심",
    "월요일 특별한 점심",
    "월요일 맛있는 점심",
    "월요일 기분 전환 점심",
    "월요일 활기찬 점심",
    "월요일 신나는 점심",
    "월요일 즐거운 점심",
    "월요일 행복한 점심"
];

// 화요일 다양한 문구
const TUESDAY_PHRASES = [
    "화요일 점심은",
    "화요일 점심",
    "화요일 중간점검 점심",
    "화요일 활력 점심",
    "화요일 특별한 점심",
    "화요일 맛있는 점심",
    "화요일 기분 전환 점심",
    "화요일 휴식 점심",
    "화요일 에너지 점심",
    "화요일 밝은 점심",
    "화요일 상쾌한 점심",
    "화요일 경쾌한 점심"
];

// 수요일 다양한 문구
const WEDNESDAY_PHRASES = [
    "수요일 점심은",
    "수요일 점심",
    "수요일 한주 중간 점심",
    "수요일 활력 점심",
    "수요일 특별한 점심",
    "수요일 맛있는 점심",
    "수요일 기분 전환 점심",
    "수요일 휴식 점심",
    "수요일 힐링 점심",
    "수요일 여유로운 점심",
    "수요일 평온한 점심",
    "수요일 차분한 점심"
];

// 목요일 다양한 문구
const THURSDAY_PHRASES = [
    "목요일 점심은",
    "목요일 점심",
    "목요일 마무리 준비 점심",
    "목요일 활력 점심",
    "목요일 특별한 점심",
    "목요일 맛있는 점심",
    "목요일 기분 전환 점심",
    "목요일 휴식 점심",
    "목요일 기대하는 점심",
    "목요일 설레는 점심",
    "목요일 가벼운 점심",
    "목요일 편안한 점심"
];

// 금요일 다양한 문구
const FRIDAY_PHRASES = [
    "금요일 점심은",
    "금요일 점심",
    "금요일 마무리 점심",
    "금요일 축하 점심",
    "금요일 특별한 점심",
    "금요일 맛있는 점심",
    "금요일 기분 전환 점심",
    "금요일 휴식 점심",
    "금요일 자유 점심",
    "금요일 즐거운 점심",
    "금요일 해방 점심",
    "금요일 환호하는 점심",
    "금요일 축제 같은 점심",
    "금요일 파티 같은 점심"
];

// 월급일 다양한 문구
const PAYDAY_PHRASES = [
    "월급날 점심은",
    "월급날 점심",
    "월급날 특별한 점심",
    "월급날 축하 점심",
    "월급날 보너스 점심",
    "월급날 자유 점심",
    "월급날 즐거운 점심",
    "월급날 맛있는 점심",
    "월급날 기분 전환 점심",
    "월급날 풍요로운 점심",
    "월급날 여유로운 점심",
    "월급날 행복한 점심",
    "월급날 축제 같은 점심",
    "월급날 파티 같은 점심"
];

// 기본 키워드 (식당 매칭이 안 될 때)
const DEFAULT_KEYWORDS = [
    "맛있는",
    "좋은",
    "추천",
    "인기",
    "유명한"
];

// ===== 식당 이름 관련 키워드 (기존 데이터 활용) =====

// 식당 이름 관련 키워드
const RESTAURANT_KEYWORDS = {
    // 메뉴 & 음식 종류
    '마라': ['마라탕', '매운', '얼얼한', '중식', '스트레스', '혈중마라', '수혈'],
    '라화쿵부': ['마라탕', '매운', '얼얼한', '중식', '스트레스', '혈중마라', '수혈'],
    '탕화쿵푸': ['마라탕', '매운', '얼얼한', '중식', '스트레스', '혈중마라', '수혈'],
    '국밥': ['국밥', '뜨끈', '해장', '든든', '한식', 'K-소울푸드', '아재입맛'],
    '순대': ['국밥', '뜨끈', '해장', '든든', '한식', 'K-소울푸드', '아재입맛'],
    '설렁탕': ['국밥', '뜨끈', '해장', '든든', '한식', 'K-소울푸드', '아재입맛'],
    '족발': ['족발', '보쌈', '야식', '회식', '한식', '푸짐', '콜라겐'],
    '보쌈': ['족발', '보쌈', '야식', '회식', '한식', '푸짐', '콜라겐'],
    '치킨': ['치킨', '치맥', '야식', '불금', '바삭', '1인1닭'],
    '통닭': ['치킨', '치맥', '야식', '불금', '바삭', '1인1닭'],
    '피자': ['피자', '양식', '파티', '치즈', '토핑'],
    '돈까스': ['돈까스', '일식', '바삭', '경양식', '치즈카츠'],
    '카츠': ['돈까스', '일식', '바삭', '경양식', '치즈카츠'],
    '스시': ['스시', '일식', '신선', '고급', '데이트', '사르르'],
    '초밥': ['스시', '일식', '신선', '고급', '데이트', '사르르'],
    '파스타': ['파스타', '양식', '이탈리안', '데이트', '꾸덕'],
    '떡볶이': ['떡볶이', '분식', '매콤', '간식', '소울푸드', 'K-디저트'],
    '분식': ['떡볶이', '분식', '매콤', '간식', '소울푸드', 'K-디저트'],
    '곱창': ['곱창', '회식', '소주', '고소', '기름칠'],
    '막창': ['곱창', '회식', '소주', '고소', '기름칠'],
    '갈비': ['고기', '회식', '든든', '한식', '저기압', '육식파'],
    '삼겹살': ['고기', '회식', '든든', '한식', '저기압', '육식파'],
    '냉면': ['냉면', '시원', '여름', '살얼음', '한식', '이냉치냉'],
    '짜장': ['중식', '짜장면', '얼큰', '부먹찍먹'],
    '짬뽕': ['중식', '짜장면', '얼큰', '부먹찍먹'],
    '쌀국수': ['베트남', '쌀국수', '해장', '뜨끈', '아시안'],
    '카레': ['인도', '카레', '향신료', '이색'],
    '타코': ['멕시칸', '타코', '이색', '축제'],
    '샐러드': ['샐러드', '다이어트', '건강', '가벼운', '클린식단'],
    '부대찌개': ['찌개', '한식', '집밥', '얼큰', '뜨끈', '밥도둑'],
    '김치찌개': ['찌개', '한식', '집밥', '얼큰', '뜨끈', '밥도둑'],
    '닭갈비': ['닭갈비', '닭', '매콤', '회식', '볶음밥'],
    '파전': ['파전', '막걸리', '비오는날', '한식', '정겨운'],
    '스테이크': ['스테이크', '고기', '양식', '고급', '칼질'],
    '샌드위치': ['버거', '간편', '든든', '양식', '육즙'],
    '만두': ['만두', '딤섬', '중식', '육즙'],
    
    // 국가 & 지역 & 장소
    '반점': ['중식', '전통'],
    '각': ['중식', '전통'],
    '루': ['중식', '전통'],
    '식당': ['한식', '맛집', '정겨운'],
    '집': ['한식', '맛집', '정겨운'],
    '키친': ['양식', '분위기', '모던'],
    '스시야': ['일식', '일본', '장인'],
    '켄': ['일식', '일본', '장인'],
    '제주': ['제주도', '고기', '흑돼지', '해산물', '한식'],
    '부산': ['부산', '돼지국밥', '밀면', '해산물', '어묵'],
    '전주': ['전주', '비빔밥', '한식', '콩나물국밥', '맛집'],
    '안동': ['안동', '찜닭', '간고등어', '한식'],
    '춘천': ['춘천', '닭갈비', '막국수'],
    '의정부': ['의정부', '부대찌개'],
    '신당동': ['신당동', '떡볶이'],
    '바다': ['해산물', '신선', '시원'],
    '시장': ['시장', '가성비', '푸짐', '정겨운'],
    
    // 분위기 & 컨셉 & 수식어
    '할머니': ['집밥', '정겨운', '한식', '손맛', '전통'],
    '엄마': ['집밥', '정겨운', '한식', '손맛', '전통'],
    '옛날': ['전통', '맛집', '오래된', '근본'],
    '원조': ['전통', '맛집', '오래된', '근본'],
    '청년': ['열정', '가성비', '트렌디'],
    '매운': ['매운', '스트레스', '도전'],
    '불': ['매운', '스트레스', '도전'],
    '오봉': ['쟁반', '푸짐', '한식', '가성비'],
    '미슐랭': ['맛집', '고급', '검증된'],
    '새벽': ['야식', '해장', '언제나'],
    '24시': ['야식', '해장', '언제나'],
    '착한': ['건강', '정직', '가성비'],
    '인생': ['JMT', '맛집', '중독'],
    '마약': ['JMT', '맛집', '중독'],
    '1인': ['혼밥', '간편'],
    '혼밥': ['혼밥', '간편'],
    '프리미엄': ['고급', '프리미엄'],
    '블랙': ['고급', '프리미엄'],
    
    // 한식 프랜차이즈
    '새마을식당': ['열탄불고기', '7분김치찌개', '백종원', '가성비', '회식', '레트로'],
    '명륜진사갈비': ['돼지갈비', '무한리필', '가성비', '회식', '가족외식'],
    '원할머니보쌈': ['보쌈', '족발', '푸짐', '가족외식', '야식', '김치'],
    '놀부보쌈': ['보쌈', '부대찌개', '한식', '가족외식'],
    '이바돔감자탕': ['감자탕', '뼈해장국', '회식', '가족외식', '놀이방'],
    '유가네닭갈비': ['닭갈비', '볶음밥', '가성비', '추억', '매콤'],
    '두찜': ['찜닭', '배달', '가성비', '푸짐', '로제찜닭'],
    '본죽': ['죽', '비빔밥', '건강', '아플때', '든든', '한식'],
    '한솥': ['도시락', '가성비', '간편', '치킨마요', '혼밥'],
    '미정국수': ['국수', '백종원', '가성비', '혼밥', '멸치국수'],
    '역전우동': ['우동', '덮밥', '백종원', '가성비', '혼밥', '일식'],
    
    // 중식 프랜차이즈
    '홍콩반점': ['짜장면', '짬뽕', '탕수육', '백종원', '가성비', '중식'],
    '교동짬뽕': ['짬뽕', '얼큰', '해장', '중식', '전국5대짬뽕'],
    '보배반점': ['짬뽕', '중식', '해물', '얼큰'],
    
    // 일식 프랜차이즈
    '백소정': ['돈카츠', '마제소바', '일식', '정갈한', '데이트'],
    '홍대개미': ['덮밥', '스테이크덮밥', '연어덮밥', '일식', '푸짐'],
    '쿠우쿠우': ['초밥', '스시', '뷔페', '가성비', '가족외식', '푸짐'],
    '미소야': ['돈카츠', '우동', '알밥', '일식', '가성비'],
    
    // 양식 프랜차이즈
    '빕스': ['스테이크', '샐러드바', '뷔페', '가족외식', '기념일'],
    'VIPS': ['스테이크', '샐러드바', '뷔페', '가족외식', '기념일'],
    '애슐리': ['뷔페', '가성비', '가족외식', '다양한'],
    '아웃백': ['스테이크', '투움바파스타', '빵', '기념일', '데이트'],
    '매드포갈릭': ['마늘', '갈릭', '파스타', '피자', '데이트', '분위기'],
    '롤링파스타': ['파스타', '백종원', '가성비', '데이트'],
    
    // 치킨 & 피자 프랜차이즈
    '교촌치킨': ['치킨', '간장치킨', '허니콤보', '단짠', '치맥'],
    '교촌': ['치킨', '간장치킨', '허니콤보', '단짠', '치맥'],
    'BHC': ['치킨', '뿌링클', '맛초킹', '신메뉴'],
    'bhc': ['치킨', '뿌링클', '맛초킹', '신메뉴'],
    'BBQ': ['치킨', '황금올리브', '바삭', '건강한'],
    'bbq': ['치킨', '황금올리브', '바삭', '건강한'],
    '굽네치킨': ['치킨', '오븐구이', '고추바사삭', '다이어트', '건강'],
    '굽네': ['치킨', '오븐구이', '고추바사삭', '다이어트', '건강'],
    '푸라닭': ['치킨', '고급', '블랙알리오', '오븐후라이드'],
    '처갓집양념치킨': ['치킨', '양념치킨', '슈프림양념', '달콤', '추억'],
    '처갓집': ['치킨', '양념치킨', '슈프림양념', '달콤', '추억'],
    '도미노피자': ['피자', '배달', '프리미엄', '신메뉴'],
    '도미노': ['피자', '배달', '프리미엄', '신메뉴'],
    '피자헛': ['피자', '샐러드바', '리치골드', '추억'],
    '미스터피자': ['피자', '샐러드바', '새우', '프리미엄'],
    '피자알볼로': ['피자', '건강', '수제피자', '진도산흑미'],
    
    // 분식 & 기타 프랜차이즈
    '엽기떡볶이': ['떡볶이', '매운', '스트레스', '도전', '주먹밥', '엽기'],
    '동대문엽기떡볶이': ['떡볶이', '매운', '스트레스', '도전', '주먹밥', '엽기'],
    '엽떡': ['떡볶이', '매운', '스트레스', '도전', '주먹밥', '엽기'],
    '신전떡볶이': ['떡볶이', '매운', '후추', '튀김오뎅', '가성비'],
    '신전': ['떡볶이', '매운', '후추', '튀김오뎅', '가성비'],
    '죠스떡볶이': ['떡볶이', '분식', '매콤', '깔끔'],
    '죠스': ['떡볶이', '분식', '매콤', '깔끔'],
    '이디야': ['커피', '가성비', '카페'],
    'EDIYA': ['커피', '가성비', '카페'],
    '스타벅스': ['커피', '카페', '된장', '작업'],
    '스벅': ['커피', '카페', '된장', '작업'],
    '메가커피': ['커피', '대용량', '가성비', '저가커피'],
    'MEGA COFFEE': ['커피', '대용량', '가성비', '저가커피'],
    '배스킨라빈스': ['아이스크림', '디저트', '31', '민트초코'],
    '배라': ['아이스크림', '디저트', '31', '민트초코'],
    '베라': ['아이스크림', '디저트', '31', '민트초코'],
    '설빙': ['빙수', '디저트', '인절미', '여름', '코리안디저트'],
    
    // 패스트푸드 프랜차이즈
    '맥도날드': ['햄버거', '빅맥', '상하이버거', '감자튀김', '감튀', '해피밀', '맥모닝', '빠른'],
    '맥날': ['햄버거', '빅맥', '상하이버거', '감자튀김', '감튀', '해피밀', '맥모닝', '빠른'],
    'Mcdonald': ['햄버거', '빅맥', '상하이버거', '감자튀김', '감튀', '해피밀', '맥모닝', '빠른'],
    '버거킹': ['햄버거', '와퍼', '직화', '푸짐', '고기', '프리미엄'],
    'Burger King': ['햄버거', '와퍼', '직화', '푸짐', '고기', '프리미엄'],
    'KFC': ['치킨', '치킨버거', '징거버거', '비스켓', '할아버지', '타워버거'],
    '케이에프씨': ['치킨', '치킨버거', '징거버거', '비스켓', '할아버지', '타워버거'],
    '롯데리아': ['햄버거', '새우버거', '불고기버거', '데리버거', '한국적', '추억'],
    'Lotteria': ['햄버거', '새우버거', '불고기버거', '데리버거', '한국적', '추억'],
    '맘스터치': ['치킨버거', '싸이버거', '가성비', '혜자', '케이준감자튀김', '엄마손길'],
    'Mom Touch': ['치킨버거', '싸이버거', '가성비', '혜자', '케이준감자튀김', '엄마손길'],
    '파파이스': ['치킨', '비스킷', '케이준', '미국남부', '치킨샌드위치'],
    'Popeyes': ['치킨', '비스킷', '케이준', '미국남부', '치킨샌드위치'],
    '쉐이크쉑': ['수제버거', '프리미엄', '뉴욕', '쉐이크', '비싼'],
    '쉑쉑버거': ['수제버거', '프리미엄', '뉴욕', '쉐이크', '비싼'],
    'Shake Shack': ['수제버거', '프리미엄', '뉴욕', '쉐이크', '비싼'],
    '노브랜드버거': ['가성비', 'NBB', '저렴', '실속'],
    'No Brand Burger': ['가성비', 'NBB', '저렴', '실속'],
    '프랭크버거': ['수제버거', '가성비', '미국식'],
    'Frank Burger': ['수제버거', '가성비', '미국식'],
    
    // 판교 지역 특화 키워드
    '판교': ['판교', 'IT', '스타트업', '창업', '테크', '혁신', '새싹', '벤처'],
    '21 플라밍고': ['판교', 'IT', '스타트업', '창업', '테크', '혁신', '새싹', '벤처'],
    '플라밍고': ['판교', 'IT', '스타트업', '창업', '테크', '혁신', '새싹', '벤처'],
    
    // 구내식당 키워드
    '구내식당': [
        '구내식당', '급식', '직원식당', '회사밥', '사내식당', '기업식당', '단체급식',
        '점심시간', '저녁시간', '아침시간', '급식시간', '식사시간', '휴식시간',
        '직장인', '회사원', '직원', '동료', '팀원', '사원', '근로자', '직업인',
        '업무', '회사', '오피스', '사무실', '직장', '근무', '출근', '퇴근',
        '팀워크', '소통', '협력', '단합', '동료애', '우정', '친목', '모임',
        '급식', '식단', '메뉴', '영양', '건강', '균형', '다양한', '푸짐'
    ]
};

// ===== 새로운 AI 제목 생성 함수 =====

export const generateAITitles = (context) => {
    try {
        // 입력 컨텍스트 검증
        if (!context || typeof context !== 'object') {
            throw new Error('유효하지 않은 컨텍스트입니다.');
        }
        
        if (!context.restaurant || typeof context.restaurant !== 'string') {
            throw new Error('식당 정보가 유효하지 않습니다.');
        }
        
        // 제목 생성
        const titles = generateTitles(context);
        
        // 결과 검증
        if (!titles || !Array.isArray(titles) || titles.length === 0) {
            throw new Error('제목 생성 결과가 유효하지 않습니다.');
        }
        
        console.log('AI 제목 생성 완료:', titles.length, '개');
        return titles;
        
    } catch (error) {
        console.error('AI 제목 생성 오류:', error);
        
        // 오류 시 기본 제목 반환
        if (context && context.restaurant) {
            return [
                `${context.restaurant} 점심`,
                `${context.restaurant}에서 점심`,
                `${context.restaurant} 점심 모임`,
                '맛있는 점심 시간',
                '즐거운 점심 모임'
            ];
        }
        
        return ['제목 생성에 실패했습니다. 다시 시도해주세요.'];
    }
};

// 제목 생성 메인 함수
const generateTitles = (context) => {
    const restaurant = context.restaurant.trim();
    const date = context.date || new Date();
    
    // 1. 식당 키워드 선택
    const restaurantKeyword = getRestaurantKeyword(restaurant);
    
    // 2. 사용 가능한 요일 문구들을 미리 준비
    const availableDayPhrases = getAvailableDayPhrases(date);
    
    // 3. 모든 가능한 제목 패턴을 생성 (순서 무관)
    const allPossibleTitles = [];
    
    // 요일 중심형 제목들 (모든 가능한 요일 문구 사용)
    if (availableDayPhrases.length > 0) {
        availableDayPhrases.forEach(dayPhrase => {
            allPossibleTitles.push(`${dayPhrase} ${restaurant}에서`);
            allPossibleTitles.push(`${dayPhrase} ${restaurant} 점심`);
            allPossibleTitles.push(`${dayPhrase} ${restaurant}에서 점심`);
        });
    }
    
    // 요일 + 식당 키워드 조합 제목들
    if (availableDayPhrases.length > 0 && restaurantKeyword) {
        availableDayPhrases.forEach(dayPhrase => {
            allPossibleTitles.push(`${dayPhrase} ${restaurantKeyword} ${restaurant}에서`);
            allPossibleTitles.push(`${dayPhrase} ${restaurantKeyword} ${restaurant} 점심`);
            allPossibleTitles.push(`${restaurantKeyword} ${restaurant}에서 ${dayPhrase}`);
        });
    }
    
    // 식당 중심형 제목들
    if (restaurantKeyword) {
        allPossibleTitles.push(`${restaurantKeyword} ${restaurant}에서 점심`);
        allPossibleTitles.push(`${restaurantKeyword} ${restaurant} 점심`);
        allPossibleTitles.push(`${restaurantKeyword} ${restaurant}에서 맛있는 점심`);
        allPossibleTitles.push(`${restaurantKeyword} ${restaurant} 점심 모임`);
    }
    
    // 기본형 제목들
    allPossibleTitles.push(`${restaurant}에서 점심`);
    allPossibleTitles.push(`${restaurant} 점심`);
    allPossibleTitles.push(`${restaurant} 점심 모임`);
    allPossibleTitles.push(`${restaurant}에서 맛있는 점심`);
    allPossibleTitles.push(`${restaurant} 점심 시간`);
    allPossibleTitles.push(`${restaurant}에서 즐거운 점심`);
    allPossibleTitles.push(`${restaurant} 점심 약속`);
    
    // 4. 모든 제목을 완전히 랜덤하게 섞기
    const shuffledTitles = shuffleArray([...allPossibleTitles]);
    
    // 5. 중복 제거하면서 최대 5개 반환
    const uniqueTitles = [];
    const seen = new Set();
    
    for (const title of shuffledTitles) {
        if (!seen.has(title)) {
            uniqueTitles.push(title);
            seen.add(title);
            
            if (uniqueTitles.length >= 5) break;
        }
    }
    
    // 6. 5개가 안 되면 기본 패턴으로 채우기
    while (uniqueTitles.length < 5) {
        const basicTitles = [
            `${restaurant} 점심 모임`,
            `${restaurant}에서 맛있는 점심`,
            `${restaurant} 점심 시간`,
            `${restaurant}에서 즐거운 점심`,
            `${restaurant} 점심 약속`,
            `${restaurant}에서 특별한 점심`,
            `${restaurant} 점심 데이트`,
            `${restaurant}에서 행복한 점심`,
            `${restaurant} 점심 파티`,
            `${restaurant}에서 신나는 점심`
        ];
        
        for (const basicTitle of basicTitles) {
            if (!seen.has(basicTitle)) {
                uniqueTitles.push(basicTitle);
                seen.add(basicTitle);
                break;
            }
        }
        
        // 무한 루프 방지
        if (uniqueTitles.length === seen.size) break;
    }
    
    return uniqueTitles;
};

// 사용 가능한 요일 문구들을 랜덤하게 섞어서 반환
const getAvailableDayPhrases = (date) => {
    const day = date.getDay(); // 0: 일요일, 1: 월요일, ..., 6: 토요일
    const dayOfMonth = date.getDate(); // 1-31
    
    let phrases = [];
    
    // 월급일 체크 (25일)
    if (dayOfMonth === 25) {
        phrases = [...PAYDAY_PHRASES];
    }
    // 요일별 문구 선택 (월요일-금요일만)
    else if (day >= 1 && day <= 5) {
        switch (day) {
            case 1: // 월요일
                phrases = [...MONDAY_PHRASES];
                break;
            case 2: // 화요일
                phrases = [...TUESDAY_PHRASES];
                break;
            case 3: // 수요일
                phrases = [...WEDNESDAY_PHRASES];
                break;
            case 4: // 목요일
                phrases = [...THURSDAY_PHRASES];
                break;
            case 5: // 금요일
                phrases = [...FRIDAY_PHRASES];
                break;
            default:
                return [];
        }
    }
    
    // 문구들을 랜덤하게 섞기
    if (phrases.length > 0) {
        for (let i = phrases.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [phrases[i], phrases[j]] = [phrases[j], phrases[i]];
        }
    }
    
    return phrases;
};

// 기존 함수 유지 (호환성)
const getDayPhrase = (date) => {
    const availablePhrases = getAvailableDayPhrases(date);
    return availablePhrases.length > 0 ? availablePhrases[0] : null;
};

// 식당 키워드 선택
const getRestaurantKeyword = (restaurantName) => {
    const name = restaurantName.toLowerCase();
    
    // 1. 정확한 매칭 시도
    for (const [trigger, keywords] of Object.entries(RESTAURANT_KEYWORDS)) {
        if (name.includes(trigger.toLowerCase())) {
            const randomIndex = Math.floor(Math.random() * keywords.length);
            return keywords[randomIndex];
        }
    }
    
    // 2. 부분 매칭 시도
    for (const [trigger, keywords] of Object.entries(RESTAURANT_KEYWORDS)) {
        if (name.includes(trigger.toLowerCase()) || 
            trigger.toLowerCase().includes(name) ||
            name.split(' ').some(word => trigger.toLowerCase().includes(word)) ||
            trigger.toLowerCase().split(' ').some(word => name.includes(word))) {
            const randomIndex = Math.floor(Math.random() * keywords.length);
            return keywords[randomIndex];
        }
    }
    
    // 3. 음식 종류별 기본 키워드 추가
    const foodTypes = ['한식', '중식', '일식', '양식', '분식', '카페', '해산물', '고기', '치킨', '피자', '버거'];
    for (const foodType of foodTypes) {
        if (name.includes(foodType)) {
            return foodType;
        }
    }
    
    // 4. 기본 키워드 반환
    const randomIndex = Math.floor(Math.random() * DEFAULT_KEYWORDS.length);
    return DEFAULT_KEYWORDS[randomIndex];
};

// 배열을 완전히 랜덤하게 섞는 함수 (Fisher-Yates 셔플)
const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

// 기존 함수 유지 (호환성)
export const addRandomEmojis = (titles) => {
    if (!Array.isArray(titles)) return titles;
    
    const emojis = ['🍽️', '🍜', '🍱', '🍣', '🍕', '🍔', '🍗', '🥘', '🍲', '🥗'];
    
    return titles.map(title => {
        if (Math.random() < 0.3) { // 30% 확률로 이모지 추가
            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
            return `${randomEmoji} ${title}`;
        }
        return title;
    });
};
