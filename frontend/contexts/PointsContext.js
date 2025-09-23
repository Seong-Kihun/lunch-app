import React, { createContext, useContext, useState, useCallback } from 'react';

const PointsContext = createContext();

export const usePoints = () => {
  const context = useContext(PointsContext);
  if (!context) {
    throw new Error('usePoints must be used within a PointsProvider');
  }
  return context;
};

export const PointsProvider = ({ children }) => {
  const [userPoints, setUserPoints] = useState(0);
  const [missionHistory, setMissionHistory] = useState([]);

  // 포인트 획득
  const earnPoints = useCallback((amount, missionId, missionTitle) => {
    setUserPoints(prev => prev + amount);
    
    // 미션 히스토리에 추가
    const newHistory = {
      id: Date.now(),
      missionId,
      missionTitle,
      points: amount,
      timestamp: new Date().toISOString(),
      type: 'earn'
    };
    
    setMissionHistory(prev => [newHistory, ...prev]);
    
    // TODO: 서버에 포인트 업데이트 요청
    console.log(`🎉 ${amount}포인트 획득! (${missionTitle})`);
    
    return newHistory;
  }, []);

  // 연속 완료 보너스 포인트 지급
  const earnBonusPoints = useCallback((bonusType, streakCount) => {
    let bonusAmount = 0;
    let bonusReason = '';
    
    switch (bonusType) {
      case 'daily_streak':
        if (streakCount >= 7) {
          bonusAmount = 100; // 7일 연속 보너스
          bonusReason = '7일 연속 완료 보너스!';
        } else if (streakCount >= 3) {
          bonusAmount = 50; // 3일 연속 보너스
          bonusReason = '3일 연속 완료 보너스!';
        }
        break;
      
      case 'perfect_day':
        bonusAmount = 200; // 완벽한 하루 보너스
        bonusReason = '완벽한 하루 보너스!';
        break;
      
      case 'weekly_streak':
        if (streakCount >= 4) {
          bonusAmount = 300; // 4주 연속 보너스
          bonusReason = '4주 연속 완료 보너스!';
        }
        break;
      
      case 'monthly_streak':
        if (streakCount >= 3) {
          bonusAmount = 500; // 3개월 연속 보너스
          bonusReason = '3개월 연속 완료 보너스!';
        }
        break;
      
      default:
        return null;
    }
    
    if (bonusAmount > 0) {
      setUserPoints(prev => prev + bonusAmount);
      
      // 보너스 히스토리에 추가
      const newHistory = {
        id: Date.now(),
        missionId: null,
        missionTitle: bonusReason,
        points: bonusAmount,
        timestamp: new Date().toISOString(),
        type: 'bonus'
      };
      
      setMissionHistory(prev => [newHistory, ...prev]);
      
      console.log(`🎊 ${bonusAmount}포인트 보너스! (${bonusReason})`);
      
      return newHistory;
    }
    
    return null;
  }, []);

  // 포인트 사용
  const spendPoints = useCallback((amount, reason) => {
    if (userPoints < amount) {
      throw new Error('포인트가 부족합니다.');
    }
    
    setUserPoints(prev => prev - amount);
    
    // 사용 히스토리에 추가
    const newHistory = {
      id: Date.now(),
      reason,
      points: -amount,
      timestamp: new Date().toISOString(),
      type: 'spend'
    };
    
    setMissionHistory(prev => [newHistory, ...prev]);
    
    // TODO: 서버에 포인트 업데이트 요청
    console.log(`💸 ${amount}포인트 사용! (${reason})`);
    
    return newHistory;
  }, [userPoints]);

  // 포인트 히스토리 조회
  const getPointsHistory = useCallback(() => {
    return missionHistory;
  }, [missionHistory]);

  // 특정 미션의 포인트 수령 여부 확인
  const isMissionClaimed = useCallback((missionId) => {
    return missionHistory.some(history => 
      history.missionId === missionId && history.type === 'earn'
    );
  }, [missionHistory]);

  // 오늘 획득한 포인트
  const getTodayPoints = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return missionHistory
      .filter(history => {
        const historyDate = new Date(history.timestamp);
        historyDate.setHours(0, 0, 0, 0);
        return historyDate.getTime() === today.getTime() && history.type === 'earn';
      })
      .reduce((total, history) => total + history.points, 0);
  }, [missionHistory]);

  // 이번 주 획득한 포인트
  const getWeeklyPoints = useCallback(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    return missionHistory
      .filter(history => {
        const historyDate = new Date(history.timestamp);
        return historyDate >= startOfWeek && history.type === 'earn';
      })
      .reduce((total, history) => total + history.points, 0);
  }, [missionHistory]);

  // 이번 달 획득한 포인트
  const getMonthlyPoints = useCallback(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    return missionHistory
      .filter(history => {
        const historyDate = new Date(history.timestamp);
        return historyDate >= startOfMonth && history.type === 'earn';
      })
      .reduce((total, history) => total + history.points, 0);
  }, [missionHistory]);

  const value = {
    userPoints,
    earnPoints,
    earnBonusPoints,
    spendPoints,
    getPointsHistory,
    isMissionClaimed,
    getTodayPoints,
    getWeeklyPoints,
    getMonthlyPoints
  };

  return (
    <PointsContext.Provider value={value}>
      {children}
    </PointsContext.Provider>
  );
};
