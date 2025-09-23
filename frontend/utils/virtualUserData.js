// 가상유저 간 점심 히스토리 데이터를 일관되게 생성하는 공통 함수들

// 가상유저 간 마지막 점심 히스토리 생성
export const generateVirtualLastLunchHistory = (userId, myEmployeeId) => {
    if (!userId || !myEmployeeId) return null;
    
    // 사용자 ID 기반으로 일관된 가상 데이터 생성
    const userSeed = parseInt(userId.toString().replace(/\D/g, '0')) || 1;
    const mySeed = parseInt(myEmployeeId.toString().replace(/\D/g, '0')) || 1;
    const combinedSeed = userSeed + mySeed;
    
    // 식당 목록 (가상 데이터)
    const restaurants = [
        '맥도날드', '버거킹', 'KFC', '피자헛', '도미노피자',
        '스타벅스', '투썸플레이스', '할리스', '이디야', '폴바셋',
        '올리브영', 'GS25', 'CU', '세븐일레븐', '이마트24',
        '롯데리아', '맘스터치', '파파존스', '피자스쿨', '미스터피자'
    ];
    
    // 날짜 옵션 (가상 데이터)
    const dateOptions = [
        { days: 1, label: '어제' },
        { days: 3, label: '3일 전' },
        { days: 7, label: '1주 전' },
        { days: 14, label: '2주 전' },
        { days: 30, label: '1달 전' },
        { days: 90, label: '3달 전' },
        { days: 180, label: '6달 전' },
        { days: 365, label: '1년 전' }
    ];
    
    // 시드 기반으로 일관된 선택
    const restaurantIndex = combinedSeed % restaurants.length;
    const dateIndex = (combinedSeed * 7) % dateOptions.length;
    
    const selectedRestaurant = restaurants[restaurantIndex];
    const selectedDateOption = dateOptions[dateIndex];
    
    return {
        date: new Date(Date.now() - selectedDateOption.days * 24 * 60 * 60 * 1000),
        restaurant: selectedRestaurant,
        label: selectedDateOption.label,
        days: selectedDateOption.days
    };
};

// 마지막 점심 표시용 텍스트 생성
export const formatLastLunchText = (lastLunchData) => {
    if (!lastLunchData) return '처음';
    
    if (typeof lastLunchData === 'string') {
        return lastLunchData;
    }
    
    if (lastLunchData.label) {
        return lastLunchData.label;
    }
    
    if (lastLunchData.days !== undefined) {
        const days = lastLunchData.days;
        if (days === 0) return '오늘';
        if (days === 1) return '어제';
        if (days < 7) return `${days}일 전`;
        if (days < 30) return `${Math.floor(days / 7)}주 전`;
        if (days < 365) return `${Math.floor(days / 30)}달 전`;
        return `${Math.floor(days / 365)}년 전`;
    }
    
    if (lastLunchData.date && lastLunchData.date instanceof Date) {
        const now = new Date();
        const diffTime = Math.abs(now - lastLunchData.date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return '오늘';
        if (diffDays === 1) return '어제';
        if (diffDays < 7) return `${diffDays}일 전`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)}달 전`;
        return `${Math.floor(diffDays / 365)}년 전`;
    }
    
    return '처음';
};

// 가상유저 데이터에 마지막 점심 히스토리 추가
export const addLastLunchToVirtualUser = (user, myEmployeeId) => {
    if (!user || !myEmployeeId) return user;
    
    const lastLunchData = generateVirtualLastLunchHistory(user.employee_id, myEmployeeId);
    if (lastLunchData) {
        return {
            ...user,
            last_lunch: formatLastLunchText(lastLunchData),
            last_lunch_data: lastLunchData
        };
    }
    
    return user;
};
