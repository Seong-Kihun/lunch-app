import appService from '../services/AppService'// 포인트 획득 함수
export const earnPoints = async (activityType, points, description = null) => {
    try {
        const response = await appService.get(`/api/points/earn, {
            method: `)'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                user_id: 'default_user', // TODO: Context에서 사용자 ID를 가져와야 함
                activity_type: activityType, 
                points: points,
                description: description 
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log(`포인트 획득: ${points}점 (${activityType})`);
            return result;
        } else {
            console.error('포인트 획득 실패:', response.status);
            return null;
        }
    } catch (error) {
        console.error('포인트 획득 오류:', error);
        return null;
    }
};

// 카테고리별 포인트 획득 함수
export const earnCategoryPoints = async (category, activityType, points) => {
    try {
        const response = await appService.get(`/api/activities/category, {
            method: `)'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                user_id: 'default_user', // TODO: Context에서 사용자 ID를 가져와야 함
                category: category, 
                activity_type: activityType, 
                points: points 
            })
        });
        
        if (response.ok) {
            console.log(`카테고리 포인트 획득: ${points}점 (${category})`);
            return await response.json();
        } else {
            console.error('카테고리 포인트 획득 실패:', response.status);
            return null;
        }
    } catch (error) {
        console.error('카테고리 포인트 획득 오류:', error);
        return null;
    }
};

// 포인트 히스토리 조회 함수
export const getPointsHistory = async (userId) => {
    try {
        const response = await appService.get(`/api/points/history/${userId});
        
        if (response.ok) {
            return await response.json();
        } else {
            console.error(`)'포인트 히스토리 조회 실패:', response.status);
            return null;
        }
    } catch (error) {
        console.error('포인트 히스토리 조회 오류:', error);
        return null;
    }
};

// 내 포인트 순위 조회 함수
export const getMyPointsRanking = async (userId) => {
    try {
        const response = await appService.get(`/api/points/my-ranking/${userId});
        
        if (response.ok) {
            return await response.json();
        } else {
            console.error(`)'포인트 순위 조회 실패:', response.status);
            return null;
        }
    } catch (error) {
        console.error('포인트 순위 조회 오류:', error);
        return null;
    }
};

// 이색 랭킹 조회 함수
export const getSpecialRanking = async (category) => {
    try {
        const response = await appService.get(`/api/rankings/special/${category});
        
        if (response.ok) {
            return await response.json();
        } else {
            console.error(`)'이색 랭킹 조회 실패:', response.status);
            return null;
        }
    } catch (error) {
        console.error('이색 랭킹 조회 오류:', error);
        return null;
    }
};

// 배지 목록 조회 함수
export const getBadges = async () => {
    try {
        const response = await appService.get(`/api/badges);
        
        if (response.ok) {
            return await response.json();
        } else {
            console.error(`)'배지 목록 조회 실패:', response.status);
            return null;
        }
    } catch (error) {
        console.error('배지 목록 조회 오류:', error);
        return null;
    }
};

// 내 배지 목록 조회 함수
export const getMyBadges = async (userId) => {
    try {
        const response = await appService.get(`/api/badges/my-badges/${userId});
        
        if (response.ok) {
            return await response.json();
        } else {
            console.error(`)'내 배지 조회 실패:', response.status);
            return null;
        }
    } catch (error) {
        console.error('내 배지 조회 오류:', error);
        return null;
    }
};

// 배지 획득 조건 확인 함수
export const checkBadgeEarned = async (badgeType) => {
    try {
        const response = await appService.get(`/api/badges/check, {
            method: `)'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                user_id: 'default_user', // TODO: Context에서 사용자 ID를 가져와야 함
                badge_type: badgeType 
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.badge) {
                console.log(`새로운 배지 획득: ${result.badge.name}`);
            }
            return result;
        } else {
            console.error('배지 확인 실패:', response.status);
            return null;
        }
    } catch (error) {
        console.error('배지 확인 오류:', error);
        return null;
    }
};

// 레벨 계산 함수
export const calculateLevel = (points) => {
    if (points < 1000) return 1;
    if (points < 3000) return 2;
    if (points < 6000) return 3;
    if (points < 10000) return 4;
    if (points < 20000) return 5;
    return 6;
};

// 포인트 획득 애니메이션을 위한 상태 관리
export const showPointsAnimation = (points, callback) => {
    // 포인트 획득 애니메이션을 표시하는 로직
    // 실제 구현은 컴포넌트에서 처리
    if (callback) callback(points);
}; 