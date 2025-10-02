import AsyncStorage from '@react-native-async-storage/async-storage';
import { unifiedApiClient } from '../services/UnifiedApiClient';
class DataCleanupManager {
    constructor() {
        this.cleanupSchedule = '0 0 * * *'; // 매일 자정
        this.retentionPolicies = {
            randomLunchProposals: 7, // 7일 후 자동 삭제
            expiredParties: 30,      // 30일 후 히스토리로 이동
            oldNotifications: 90     // 90일 후 삭제
        };
        
        // 마지막 정리 시간 저장 키
        this.lastCleanupKey = 'last_data_cleanup';
        
        // 정리 작업 상태
        this.isCleaning = false;
    }
    
    // 정리 작업 시작
    async startCleanup() {
        if (this.isCleaning) {
            console.log('데이터 정리 작업이 이미 진행 중입니다.');
            return;
        }
        
        try {
            this.isCleaning = true;
            console.log('데이터 정리 시작:', new Date());
            
            // 1. 만료된 랜덤런치 제안 정리
            await this.cleanupExpiredProposals();
            
            // 2. 지난 파티들 히스토리로 이동
            await this.archivePastParties();
            
            // 3. 오래된 알림 정리
            await this.cleanupOldNotifications();
            
            // 4. 로컬 저장소 정리
            await this.cleanupLocalStorage();
            
            // 5. 마지막 정리 시간 업데이트
            await this.updateLastCleanupTime();
            
            console.log('데이터 정리 완료:', new Date());
            
        } catch (error) {
            console.error('데이터 정리 실패:', error);
        } finally {
            this.isCleaning = false;
        }
    }
    
    // 만료된 제안 정리
    async cleanupExpiredProposals() {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - this.retentionPolicies.randomLunchProposals);
            
            // 로컬 저장소에서 만료된 제안 제거
            const proposalsKey = 'random_lunch_proposals';
            const storedProposals = await AsyncStorage.getItem(proposalsKey);
            
            if (storedProposals) {
                const proposals = JSON.parse(storedProposals);
                const validProposals = proposals.filter(proposal => {
                    const proposalDate = new Date(proposal.proposed_date);
                    return proposalDate >= cutoffDate;
                });
                
                await AsyncStorage.setItem(proposalsKey, JSON.stringify(validProposals));
                console.log(`${proposals.length - validProposals.length}개의 만료된 제안 정리 완료`);
            }
            
        } catch (error) {
            console.error('만료된 제안 정리 실패:', error);
        }
    }
    
    // 지난 파티 아카이빙
    async archivePastParties() {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - this.retentionPolicies.expiredParties);
            
            // 로컬 저장소에서 지난 파티를 히스토리로 이동
            const partiesKey = 'user_parties';
            const historyKey = 'parties_history';
            
            const storedParties = await AsyncStorage.getItem(partiesKey);
            const storedHistory = await AsyncStorage.getItem(historyKey);
            
            if (storedParties) {
                const parties = JSON.parse(storedParties);
                const currentParties = [];
                const archivedParties = [];
                
                parties.forEach(party => {
                    const partyDate = new Date(party.party_date);
                    if (partyDate >= cutoffDate) {
                        currentParties.push(party);
                    } else {
                        // 히스토리 데이터로 변환
                        const archivedParty = {
                            ...party,
                            archived_at: new Date().toISOString(),
                            archive_reason: '자동 아카이빙'
                        };
                        archivedParties.push(archivedParty);
                    }
                });
                
                // 현재 파티 목록 업데이트
                await AsyncStorage.setItem(partiesKey, JSON.stringify(currentParties));
                
                // 히스토리에 추가
                const history = storedHistory ? JSON.parse(storedHistory) : [];
                const updatedHistory = [...history, ...archivedParties];
                await AsyncStorage.setItem(historyKey, JSON.stringify(updatedHistory));
                
                console.log(`${archivedParties.length}개의 지난 파티 아카이빙 완료`);
            }
            
        } catch (error) {
            console.error('지난 파티 아카이빙 실패:', error);
        }
    }
    
    // 오래된 알림 정리
    async cleanupOldNotifications() {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - this.retentionPolicies.oldNotifications);
            
            // 로컬 저장소에서 오래된 알림 제거
            const notificationsKey = 'user_notifications';
            const storedNotifications = await AsyncStorage.getItem(notificationsKey);
            
            if (storedNotifications) {
                const notifications = JSON.parse(storedNotifications);
                const validNotifications = notifications.filter(notification => {
                    const notificationDate = new Date(notification.created_at);
                    return notificationDate >= cutoffDate;
                });
                
                await AsyncStorage.setItem(notificationsKey, JSON.stringify(validNotifications));
                console.log(`${notifications.length - validNotifications.length}개의 오래된 알림 정리 완료`);
            }
            
        } catch (error) {
            console.error('오래된 알림 정리 실패:', error);
        }
    }
    
    // 로컬 저장소 정리
    async cleanupLocalStorage() {
        try {
            // 사용하지 않는 임시 데이터 정리
            const keys = await AsyncStorage.getAllKeys();
            const tempKeys = keys.filter(key => 
                key.startsWith('temp_') || 
                key.startsWith('cache_') ||
                key.includes('_temp')
            );
            
            if (tempKeys.length > 0) {
                await AsyncStorage.multiRemove(tempKeys);
                console.log(`${tempKeys.length}개의 임시 데이터 정리 완료`);
            }
            
            // 오래된 캐시 데이터 정리 (7일 이상)
            const cacheCutoffDate = new Date();
            cacheCutoffDate.setDate(cacheCutoffDate.getDate() - 7);
            
            const cacheKeys = keys.filter(key => key.startsWith('cache_'));
            for (const key of cacheKeys) {
                try {
                    const cachedData = await AsyncStorage.getItem(key);
                    if (cachedData) {
                        const data = JSON.parse(cachedData);
                        if (data.timestamp && new Date(data.timestamp) < cacheCutoffDate) {
                            await AsyncStorage.removeItem(key);
                        }
                    }
                } catch (error) {
                    // 캐시 데이터 파싱 실패 시 제거
                    await AsyncStorage.removeItem(key);
                }
            }
            
        } catch (error) {
            console.error('로컬 저장소 정리 실패:', error);
        }
    }
    
    // 마지막 정리 시간 업데이트
    async updateLastCleanupTime() {
        try {
            await AsyncStorage.setItem(this.lastCleanupKey, new Date().toISOString());
        } catch (error) {
            console.error('마지막 정리 시간 업데이트 실패:', error);
        }
    }
    
    // 정리 작업이 필요한지 확인
    async shouldRunCleanup() {
        try {
            const lastCleanup = await AsyncStorage.getItem(this.lastCleanupKey);
            
            if (!lastCleanup) {
                return true; // 처음 실행
            }
            
            const lastCleanupDate = new Date(lastCleanup);
            const now = new Date();
            const hoursSinceLastCleanup = (now - lastCleanupDate) / (1000 * 60 * 60);
            
            // 24시간마다 정리 실행
            return hoursSinceLastCleanup >= 24;
            
        } catch (error) {
            console.error('정리 필요 여부 확인 실패:', error);
            return true; // 에러 시 정리 실행
        }
    }
    
    // 자동 정리 스케줄러 시작
    startScheduler() {
        // 앱이 포그라운드로 돌아올 때마다 정리 필요 여부 확인
        this.checkAndCleanup();
        
        // 1시간마다 정리 필요 여부 확인
        setInterval(() => {
            this.checkAndCleanup();
        }, 60 * 60 * 1000); // 1시간
    }
    
    // 정리 필요 여부 확인 및 실행
    async checkAndCleanup() {
        try {
            const shouldCleanup = await this.shouldRunCleanup();
            
            if (shouldCleanup) {
                await this.startCleanup();
            }
        } catch (error) {
            console.error('정리 확인 및 실행 실패:', error);
        }
    }
    
    // 수동 정리 실행
    async manualCleanup() {
        console.log('수동 데이터 정리 시작');
        await this.startCleanup();
    }
    
    // 정리 통계 조회
    async getCleanupStats() {
        try {
            const lastCleanup = await AsyncStorage.getItem(this.lastCleanupKey);
            const isCleaning = this.isCleaning;
            
            return {
                lastCleanup: lastCleanup ? new Date(lastCleanup) : null,
                isCleaning,
                retentionPolicies: this.retentionPolicies
            };
        } catch (error) {
            console.error('정리 통계 조회 실패:', error);
            return null;
        }
    }
    
    // 정리 정책 업데이트
    updateRetentionPolicies(newPolicies) {
        this.retentionPolicies = {
            ...this.retentionPolicies,
            ...newPolicies
        };
        console.log('정리 정책 업데이트됨:', this.retentionPolicies);
    }
}

// 싱글톤 인스턴스 생성
const dataCleanupManager = new DataCleanupManager();

export default dataCleanupManager;
