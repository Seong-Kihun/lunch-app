import React, { createContext, useContext, useState, useCallback } from 'react';

// 새로운 일정을 공유하기 위한 Context 생성
const NewScheduleContext = createContext();

// Context Provider 컴포넌트
export const NewScheduleProvider = ({ children }) => {
    const [newSchedule, setNewSchedule] = useState(null);
    
    const addNewSchedule = useCallback((schedule) => {
        // console.log('🔍 [Context] 새로운 일정 추가:', schedule);
        setNewSchedule(schedule);
    }, []);
    
    const clearNewSchedule = useCallback(() => {
        // console.log('🔍 [Context] 새로운 일정 초기화');
        setNewSchedule(null);
    }, []);
    
    return (
        <NewScheduleContext.Provider value={{ newSchedule, addNewSchedule, clearNewSchedule }}>
            {children}
        </NewScheduleContext.Provider>
    );
};

// Context 사용을 위한 Hook
export const useNewSchedule = () => {
    const context = useContext(NewScheduleContext);
    if (!context) {
        throw new Error('useNewSchedule must be used within a NewScheduleProvider');
    }
    return context;
};

export default NewScheduleContext;
