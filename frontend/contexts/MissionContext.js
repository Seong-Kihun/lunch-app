import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const MissionContext = createContext();

export const useMission = () => {
  const context = useContext(MissionContext);
  if (!context) {
    throw new Error('useMission must be used within a MissionProvider');
  }
  return context;
};

export const MissionProvider = ({ children }) => {
  const [missionProgress, setMissionProgress] = useState({
    // 일일 미션 진행도 (올바른 ID 매핑)
    daily: {
      1: { completed: false, progress: 0, total: 1 }, // 오늘의 첫 방문
      2: { completed: false, progress: 0, total: 1 }, // 랜덤런치 참여
      3: { completed: false, progress: 0, total: 1 }, // 파티 참여하기
      4: { completed: false, progress: 0, total: 1 }, // 새로운 맛집 방문 (제거됨)
      5: { completed: false, progress: 0, total: 1 }, // 리뷰 작성
      6: { completed: false, progress: 0, total: 1 }, // 친구와 식사
      7: { completed: false, progress: 0, total: 1 }, // 소통의 시작
      8: { completed: false, progress: 0, total: 1 }, // 새로운 인연
      9: { completed: false, progress: 0, total: 1 }, // 맛집 탐색가
      10: { completed: false, progress: 0, total: 1 }, // 검색 마스터
      11: { completed: false, progress: 0, total: 1 }, // 오찬 추천하기
      12: { completed: false, progress: 0, total: 1 }, // 친구 초대하기
      13: { completed: false, progress: 0, total: 1 }, // 단골파티 참여
      14: { completed: false, progress: 0, total: 1 }  // 식당 신청하기
    },
    // 주간 미션 진행도
    weekly: {
      1: { completed: false, progress: 0, total: 5 }, // 열성 사용자 (5일 접속)
      2: { completed: false, progress: 0, total: 3 }, // 랜덤런치 마스터 (3회 참여)
      3: { completed: false, progress: 0, total: 2 }, // 파티 애호가 (2회 참여)
      4: { completed: false, progress: 0, total: 2 }, // 맛집 탐험가 (2곳 방문)
      5: { completed: false, progress: 0, total: 3 }, // 리뷰 작가 (3개 작성)
      6: { completed: false, progress: 0, total: 3 }, // 친구 만남 (3일 식사)
      7: { completed: false, progress: 0, total: 5 }, // 소통왕 (5일 채팅)
      8: { completed: false, progress: 0, total: 2 }, // 인맥 확장 (2명 친구 추가)
      9: { completed: false, progress: 0, total: 10 }, // 맛집 탐색가 (10곳 방문)
      10: { completed: false, progress: 0, total: 8 }, // 검색 마스터 (8회 검색)
      11: { completed: false, progress: 0, total: 5 }, // 오찬 추천가 (5곳 추천)
      12: { completed: false, progress: 0, total: 3 }, // 친구초대 마스터 (3회 초대)
      13: { completed: false, progress: 0, total: 2 }, // 단골파티 애호가 (2회 참여)
      14: { completed: false, progress: 0, total: 2 }  // 식당 신청가 (2회 신청)
    },
    // 월간 미션 진행도
    monthly: {
      1: { completed: false, progress: 0, total: 20 }, // 열성 사용자 (20일 접속)
      2: { completed: false, progress: 0, total: 8 },  // 파티 애호가 (8회 참여)
      3: { completed: false, progress: 0, total: 15 }, // 리뷰 작가 (15개 작성)
      4: { completed: false, progress: 0, total: 7 },  // 랜덤런치 왕 (7회 참여)
      5: { completed: false, progress: 0, total: 3 }   // 파티 플래너 (3회 생성)
    }
  });

  // 미션 리셋 날짜 추적
  const [resetDates, setResetDates] = useState({
    daily: new Date().toDateString(),
    weekly: getWeekStart(new Date()).toDateString(),
    monthly: getMonthStart(new Date()).toDateString()
  });

  // 성취감 시스템 - 연속 완료 기록
  const [achievements, setAchievements] = useState({
    dailyStreak: 0,        // 연속 일일 미션 완료
    weeklyStreak: 0,       // 연속 주간 미션 완료
    monthlyStreak: 0,      // 연속 월간 미션 완료
    totalMissions: 0,      // 총 완료한 미션 수
    perfectDays: 0,        // 모든 일일 미션 완료한 날 수
    lastPerfectDay: null   // 마지막 완벽한 날
  });

  // 보너스 포인트 지급을 위한 콜백
  const [bonusCallback, setBonusCallback] = useState(null);

  // 보너스 포인트 콜백 설정
  const setBonusPointsCallback = useCallback((callback) => {
    setBonusCallback(() => callback);
  }, []);

  // 주 시작일 계산 (일요일 기준)
  function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  }

  // 월 시작일 계산
  function getMonthStart(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  // 미션 진행도 업데이트
  const updateMissionProgress = useCallback((tab, missionId, progress, completed = false) => {
    setMissionProgress(prev => {
      const newProgress = { ...prev };
      
              // 해당 탭의 미션 ID 찾기
        if (newProgress[tab] && newProgress[tab][missionId]) {
          const currentMission = newProgress[tab][missionId];
          const newProgressValue = currentMission.progress + progress;
          
          newProgress[tab][missionId] = {
            ...currentMission,
            progress: newProgressValue,
            completed: completed || newProgressValue >= currentMission.total
          };
        }
      
      return newProgress;
    });

    // 성취감 업데이트
    if (completed) {
      setAchievements(prev => ({
        ...prev,
        totalMissions: prev.totalMissions + 1
      }));
    }
  }, []);

  // 일일 미션 연속 완료 기록 업데이트
  const updateDailyStreak = useCallback(() => {
    const dailyMissions = missionProgress.daily;
    const completedCount = Object.values(dailyMissions).filter(m => m.completed).length;
    
    if (completedCount === Object.keys(dailyMissions).length) {
      // 모든 일일 미션 완료
      setAchievements(prev => {
        const newStreak = prev.dailyStreak + 1;
        const newPerfectDays = prev.perfectDays + 1;
        
        // 보너스 포인트 지급
        if (bonusCallback) {
          // 완벽한 하루 보너스
          bonusCallback('perfect_day', 1);
          
          // 연속 완료 보너스
          if (newStreak >= 3) {
            bonusCallback('daily_streak', newStreak);
          }
        }
        
        return {
          ...prev,
          dailyStreak: newStreak,
          perfectDays: newPerfectDays,
          lastPerfectDay: new Date().toISOString()
        };
      });
    } else {
      // 일부 미션만 완료 - 연속 기록 유지
      setAchievements(prev => ({
        ...prev,
        dailyStreak: Math.max(0, prev.dailyStreak)
      }));
    }
  }, [missionProgress.daily, bonusCallback]);

  // 주간 미션 연속 완료 기록 업데이트
  const updateWeeklyStreak = useCallback(() => {
    const weeklyMissions = missionProgress.weekly;
    const completedCount = Object.values(weeklyMissions).filter(m => m.completed).length;
    
    if (completedCount > 0) {
      setAchievements(prev => {
        const newStreak = prev.weeklyStreak + 1;
        
        // 보너스 포인트 지급
        if (bonusCallback && newStreak >= 4) {
          bonusCallback('weekly_streak', newStreak);
        }
        
        return {
          ...prev,
          weeklyStreak: newStreak
        };
      });
    }
  }, [missionProgress.weekly, bonusCallback]);

  // 월간 미션 연속 완료 기록 업데이트
  const updateMonthlyStreak = useCallback(() => {
    const monthlyMissions = missionProgress.monthly;
    const completedCount = Object.values(monthlyMissions).filter(m => m.completed).length;
    
    if (completedCount > 0) {
      setAchievements(prev => {
        const newStreak = prev.monthlyStreak + 1;
        
        // 보너스 포인트 지급
        if (bonusCallback && newStreak >= 3) {
          bonusCallback('monthly_streak', newStreak);
        }
        
        return {
          ...prev,
          monthlyStreak: newStreak
        };
      });
    }
  }, [missionProgress.monthly, bonusCallback]);

  // 일일 미션 리셋
  const resetDailyMissions = useCallback(() => {
    setMissionProgress(prev => ({
      ...prev,
      daily: {
        1: { completed: false, progress: 0, total: 1 },
        2: { completed: false, progress: 0, total: 1 },
        3: { completed: false, progress: 0, total: 1 },
        4: { completed: false, progress: 0, total: 1 },
        5: { completed: false, progress: 0, total: 1 },
        6: { completed: false, progress: 0, total: 1 },
        7: { completed: false, progress: 0, total: 1 },
        8: { completed: false, progress: 0, total: 1 },
        9: { completed: false, progress: 0, total: 1 },
        10: { completed: false, progress: 0, total: 1 },
        11: { completed: false, progress: 0, total: 1 },
        12: { completed: false, progress: 0, total: 1 },
        13: { completed: false, progress: 0, total: 1 },
        14: { completed: false, progress: 0, total: 1 }
      }
    }));

    // 연속 완료 기록 업데이트
    updateDailyStreak();
  }, [updateDailyStreak]);

  // 주간 미션 리셋
  const resetWeeklyMissions = useCallback(() => {
    setMissionProgress(prev => ({
      ...prev,
      weekly: {
        1: { completed: false, progress: 0, total: 5 },
        2: { completed: false, progress: 0, total: 3 },
        3: { completed: false, progress: 0, total: 2 },
        4: { completed: false, progress: 0, total: 2 },
        5: { completed: false, progress: 0, total: 3 },
        6: { completed: false, progress: 0, total: 3 },
        7: { completed: false, progress: 0, total: 5 },
        8: { completed: false, progress: 0, total: 2 },
        9: { completed: false, progress: 0, total: 10 },
        10: { completed: false, progress: 0, total: 8 },
        11: { completed: false, progress: 0, total: 5 },
        12: { completed: false, progress: 0, total: 3 },
        13: { completed: false, progress: 0, total: 2 },
        14: { completed: false, progress: 0, total: 2 }
      }
    }));

    // 연속 완료 기록 업데이트
    updateWeeklyStreak();
  }, [updateWeeklyStreak]);

  // 월간 미션 리셋
  const resetMonthlyMissions = useCallback(() => {
    setMissionProgress(prev => ({
      ...prev,
      monthly: {
        1: { completed: false, progress: 0, total: 20 },
        2: { completed: false, progress: 0, total: 8 },
        3: { completed: false, progress: 0, total: 15 },
        4: { completed: false, progress: 0, total: 7 },
        5: { completed: false, progress: 0, total: 3 }
      }
    }));

    // 연속 완료 기록 업데이트
    updateMonthlyStreak();
  }, [updateMonthlyStreak]);

  // 미션 자동 리셋 체크
  useEffect(() => {
    const checkAndResetMissions = () => {
      const now = new Date();
      const today = now.toDateString();
      const weekStart = getWeekStart(now).toDateString();
      const monthStart = getMonthStart(now).toDateString();

      // 일일 미션 리셋 체크
      if (resetDates.daily !== today) {
        resetDailyMissions();
        setResetDates(prev => ({ ...prev, daily: today }));
      }

      // 주간 미션 리셋 체크
      if (resetDates.weekly !== weekStart) {
        resetWeeklyMissions();
        setResetDates(prev => ({ ...prev, weekly: weekStart }));
      }

      // 월간 미션 리셋 체크
      if (resetDates.monthly !== monthStart) {
        resetMonthlyMissions();
        setResetDates(prev => ({ ...prev, monthly: monthStart }));
      }
    };

    // 앱 시작 시 체크
    checkAndResetMissions();

    // 매일 자정에 체크 (24시간마다)
    const interval = setInterval(checkAndResetMissions, 24 * 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [resetDates, resetDailyMissions, resetWeeklyMissions, resetMonthlyMissions]);

  // 특정 미션 완료 처리
  const completeMission = useCallback((tab, missionId) => {
    setMissionProgress(prev => {
      const newProgress = { ...prev };
      
      // 해당 탭의 미션 ID 찾기
      if (newProgress[tab] && newProgress[tab][missionId]) {
        newProgress[tab][missionId] = {
          ...newProgress[tab][missionId],
          completed: true,
          progress: newProgress[tab][missionId].total
        };
      }
      
      return newProgress;
    });
  }, []);

  // 미션 진행도 조회
  const getMissionProgress = useCallback((missionId) => {
    // 모든 탭에서 해당 미션 ID 찾기
    for (const tab of Object.keys(missionProgress)) {
      if (missionProgress[tab][missionId]) {
        return missionProgress[tab][missionId];
      }
    }
    return null;
  }, [missionProgress]);

  // 탭별 미션 진행도 조회
  const getTabMissionProgress = useCallback((tab) => {
    const tabProgress = missionProgress[tab] || {};
    
    // claimed 상태를 포함하여 반환
    return Object.keys(tabProgress).reduce((acc, missionId) => {
      acc[missionId] = {
        ...tabProgress[missionId],
        claimed: tabProgress[missionId].claimed || false
      };
      return acc;
    }, {});
  }, [missionProgress]);

  // 일일 미션 완료율 계산
  const getDailyCompletionRate = useCallback(() => {
    const dailyMissions = missionProgress.daily;
    const completed = Object.values(dailyMissions).filter(m => m.completed).length;
    const total = Object.keys(dailyMissions).length;
    return { completed, total, percentage: (completed / total) * 100 };
  }, [missionProgress.daily]);

  // 성취감 정보 조회
  const getAchievements = useCallback(() => {
    return achievements;
  }, [achievements]);

  // 미션 수령 처리
  const claimMission = useCallback((tab, missionId) => {
    setMissionProgress(prev => ({
      ...prev,
      [tab]: {
        ...prev[tab],
        [missionId]: {
          ...prev[tab][missionId],
          claimed: true
        }
      }
    }));
  }, []);

  // 특정 액션에 따른 미션 완료 처리
  const handleActionCompletion = useCallback((actionType, data = {}) => {
    console.log('🔍 MissionContext - 액션 완료 감지:', actionType, data);
    
    switch (actionType) {
      case 'app_first_visit':
        // 오늘의 첫 방문 완료
        updateMissionProgress('daily', 1, 1, true);
        break;
      
      case 'random_lunch_participate':
        // 랜덤런치 참여 완료
        updateMissionProgress('daily', 2, 1, true);
        updateMissionProgress('weekly', 2, 1, false); // 주간 미션 진행도 증가
        updateMissionProgress('monthly', 4, 1, false); // 월간 미션 진행도 증가
        break;
      
      case 'party_create_or_join':
        // 파티 참여하기 완료
        updateMissionProgress('daily', 3, 1, true);
        updateMissionProgress('weekly', 3, 1, false); // 주간 미션 진행도 증가
        updateMissionProgress('monthly', 2, 1, false); // 월간 미션 진행도 증가
        break;
      
      case 'restaurant_visit_new':
        // 새로운 맛집 방문 완료 (제거됨)
        // updateMissionProgress('daily', 4, 1, true);
        // updateMissionProgress('weekly', 4, 1, false); // 주간 미션 진행도 증가
        break;
      
      case 'review_write':
        // 리뷰 작성 완료
        updateMissionProgress('daily', 5, 1, true);
        updateMissionProgress('weekly', 5, 1, false); // 주간 미션 진행도 증가
        updateMissionProgress('monthly', 3, 1, false); // 월간 미션 진행도 증가
        break;
      
      case 'friend_lunch_together':
        // 친구와 식사 완료
        updateMissionProgress('daily', 6, 1, true);
        updateMissionProgress('weekly', 6, 1, false); // 주간 미션 진행도 증가
        break;
      
      case 'chat_with_friend':
        // 소통의 시작 완료
        updateMissionProgress('daily', 7, 1, true);
        updateMissionProgress('weekly', 7, 1, false); // 주간 미션 진행도 증가
        break;
      
      case 'add_new_friend':
        // 새로운 인연 완료
        updateMissionProgress('daily', 8, 1, true);
        updateMissionProgress('weekly', 8, 1, false); // 주간 미션 진행도 증가
        break;
      
      case 'restaurant_detail_view':
        // 맛집 탐색가 완료
        updateMissionProgress('daily', 9, 1, true);
        updateMissionProgress('weekly', 9, 1, false); // 주간 미션 진행도 증가
        break;
      
      case 'restaurant_search':
        // 검색 마스터 완료
        updateMissionProgress('daily', 10, 1, true);
        updateMissionProgress('weekly', 10, 1, false); // 주간 미션 진행도 증가
        break;
      
      case 'restaurant_like':
        // 오찬 추천하기 완료
        updateMissionProgress('daily', 11, 1, true);
        updateMissionProgress('weekly', 11, 1, false); // 주간 미션 진행도 증가
        break;
      
      case 'friend_invite_app':
        // 친구 초대하기 완료
        updateMissionProgress('daily', 12, 1, true);
        updateMissionProgress('weekly', 12, 1, false); // 주간 미션 진행도 증가
        break;
      
      case 'dangol_party_join':
        // 단골파티 참여 완료
        updateMissionProgress('daily', 13, 1, true);
        updateMissionProgress('weekly', 13, 1, false); // 주간 미션 진행도 증가
        break;
      
      case 'restaurant_request':
        // 식당 신청하기 완료
        updateMissionProgress('daily', 14, 1, true);
        updateMissionProgress('weekly', 14, 1, false); // 주간 미션 진행도 증가
        break;
      
      case 'daily_login':
        // 일일 로그인 (주간/월간 미션 진행도 증가)
        updateMissionProgress('weekly', 1, 1, false); // 주간 미션 진행도 증가
        updateMissionProgress('monthly', 1, 1, false); // 월간 미션 진행도 증가
        break;
      
      default:
        console.log('🔍 MissionContext - 알 수 없는 액션 타입:', actionType);
    }
  }, [updateMissionProgress]);

  const value = {
    missionProgress,
    updateMissionProgress,
    completeMission,
    getMissionProgress,
    getTabMissionProgress,
    getDailyCompletionRate,
    getAchievements,
    handleActionCompletion,
    resetDailyMissions,
    resetWeeklyMissions,
    resetMonthlyMissions,
    setBonusPointsCallback
  };

  return (
    <MissionContext.Provider value={value}>
      {children}
    </MissionContext.Provider>
  );
};
