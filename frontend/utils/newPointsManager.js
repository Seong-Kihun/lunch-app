import { unifiedApiClient } from '../services/UnifiedApiClient';
// 새로운 포인트 시스템 관리 클래스
class NewPointsManager {
    constructor() {
        this.baseUrl = `${RENDER_SERVER_URL}/api`;
    }

    // 포인트 획득
    async earnPoints(activityType, points, description = null) {
        try {
            const response = await fetch(`${this.baseUrl}/points/earn`, {
                method: 'POST',
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
                console.log(`포인트 획득: ${result.points_earned}점 (${activityType})`);
                return result;
            } else {
                console.error('포인트 획득 실패:', response.status);
                return null;
            }
        } catch (error) {
            console.error('포인트 획득 오류:', error);
            return null;
        }
    }

    // 포인트 상태 조회
    async getPointsStatus(userId) {
        try {
            const response = await fetch(`${this.baseUrl}/points/status/${userId}`);
            
            if (response.ok) {
                return await response.json();
            } else {
                console.error('포인트 상태 조회 실패:', response.status);
                return null;
            }
        } catch (error) {
            console.error('포인트 상태 조회 오류:', error);
            return null;
        }
    }

    // 챌린지 목록 조회
    async getChallenges(userId) {
        try {
            const response = await fetch(`${this.baseUrl}/challenges/${userId}`);
            
            if (response.ok) {
                return await response.json();
            } else {
                console.error('챌린지 조회 실패:', response.status);
                return null;
            }
        } catch (error) {
            console.error('챌린지 조회 오류:', error);
            return null;
        }
    }

    // 챌린지 완료 처리
    async completeChallenge(userId, challengeId) {
        try {
            const response = await fetch(`${this.baseUrl}/challenges/${userId}/complete/${challengeId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log(`챌린지 완료: ${result.message}`);
                return result;
            } else {
                console.error('챌린지 완료 처리 실패:', response.status);
                return null;
            }
        } catch (error) {
            console.error('챌린지 완료 처리 오류:', error);
            return null;
        }
    }

    // 배지 목록 조회
    async getBadges(userId) {
        try {
            const response = await fetch(`${this.baseUrl}/badges/${userId}`);
            
            if (response.ok) {
                return await response.json();
            } else {
                console.error('배지 조회 실패:', response.status);
                return null;
            }
        } catch (error) {
            console.error('배지 조회 오류:', error);
            return null;
        }
    }

    // 배지 지급
    async awardBadge(userId, badgeId) {
        try {
            const response = await fetch(`${this.baseUrl}/badges/${userId}/award/${badgeId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log(`배지 획득: ${result.message}`);
                return result;
            } else {
                console.error('배지 지급 실패:', response.status);
                return null;
            }
        } catch (error) {
            console.error('배지 지급 오류:', error);
            return null;
        }
    }

    // 친구 초대 링크 생성
    async createFriendInvite(userId) {
        try {
            const response = await fetch(`${this.baseUrl}/friend-invite/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId })
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log(`초대 링크 생성: ${result.invite_code}`);
                return result;
            } else {
                console.error('초대 링크 생성 실패:', response.status);
                return null;
            }
        } catch (error) {
            console.error('초대 링크 생성 오류:', error);
            return null;
        }
    }

    // 친구 초대 코드 사용
    async useFriendInvite(inviteCode, userId) {
        try {
            const response = await fetch(`${this.baseUrl}/friend-invite/use`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    invite_code: inviteCode, 
                    user_id: userId 
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log(`초대 코드 사용: ${result.message}`);
                return result;
            } else {
                console.error('초대 코드 사용 실패:', response.status);
                return null;
            }
        } catch (error) {
            console.error('초대 코드 사용 오류:', error);
            return null;
        }
    }

    // 초대 통계 조회
    async getInviteStats(userId) {
        try {
            const response = await fetch(`${this.baseUrl}/friend-invite/stats/${userId}`);
            
            if (response.ok) {
                return await response.json();
            } else {
                console.error('초대 통계 조회 실패:', response.status);
                return null;
            }
        } catch (error) {
            console.error('초대 통계 조회 오류:', error);
            return null;
        }
    }

    // 리뷰 좋아요
    async likeReview(likerId, reviewId, reviewAuthorId) {
        try {
            const response = await fetch(`${this.baseUrl}/review/like`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    liker_id: likerId, 
                    review_id: reviewId, 
                    review_author_id: reviewAuthorId 
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log(`리뷰 좋아요 성공: ${result.message}`);
                return result;
            } else {
                console.error('리뷰 좋아요 실패:', response.status);
                return null;
            }
        } catch (error) {
            console.error('리뷰 좋아요 오류:', error);
            return null;
        }
    }

    // 리뷰 좋아요 수 조회
    async getReviewLikes(reviewId) {
        try {
            const response = await fetch(`${this.baseUrl}/review/likes/${reviewId}`);
            
            if (response.ok) {
                return await response.json();
            } else {
                console.error('리뷰 좋아요 수 조회 실패:', response.status);
                return null;
            }
        } catch (error) {
            console.error('리뷰 좋아요 수 조회 오류:', error);
            return null;
        }
    }

    // 레벨 계산
    calculateLevel(points) {
        if (points < 5000) return 1;
        if (points < 15000) return 2;
        if (points < 30000) return 3;
        if (points < 50000) return 4;
        if (points < 80000) return 5;
        if (points < 120000) return 6;
        if (points < 200000) return 7;
        return 8;
    }

    // 레벨별 칭호 반환
    getLevelTitle(level) {
        if (level <= 10) {
            const titles = ["점심 루키", "점심 애호가", "점심 탐험가"];
            return titles[(level - 1) % 3];
        } else if (level <= 20) {
            const titles = ["점심 전문가", "점심 마스터", "점심 전설"];
            return titles[(level - 1) % 3];
        } else if (level <= 30) {
            const titles = ["점심 신화", "점심 제왕", "점심 황제"];
            return titles[(level - 1) % 3];
        } else if (level <= 40) {
            const titles = ["점심 성자", "점심 신", "점심 창조주"];
            return titles[(level - 1) % 3];
        } else if (level <= 50) {
            const titles = ["점심 우주", "점심 차원", "점심 절대자"];
            return titles[(level - 1) % 3];
        } else {
            return "점심 절대자";
        }
    }

    // 포인트 획득 애니메이션
    showPointsAnimation(points, callback) {
        if (callback) callback(points);
    }

    // 기본 활동 포인트 반환
    getActivityPoints(activityType) {
        const basePoints = {
            'random_lunch_participate': 30,
            'party_participate': 25,
            'party_create': 40,
            'review_write': 20,
            'review_photo': 10,
            'first_visit_review': 15,
            'comment_write': 8,
            'friend_invite': 50
        };
        
        return basePoints[activityType] || 0;
    }
}

// 싱글톤 인스턴스 생성
const newPointsManager = new NewPointsManager();

export default newPointsManager;
