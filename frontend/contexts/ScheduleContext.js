import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const ScheduleContext = createContext();

export const useSchedule = () => {
  const context = useContext(ScheduleContext);
  if (!context) {
    throw new Error('useSchedule must be used within a ScheduleProvider');
  }
  return context;
};

export const ScheduleProvider = ({ children }) => {
  // 일정 상태 관리
  const [appointments, setAppointments] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [allEvents, setAllEvents] = useState({});
  
  // 백업 데이터
  const [backupAppointments, setBackupAppointments] = useState([]);
  const [backupMarkedDates, setBackupMarkedDates] = useState({});
  const [backupAllEvents, setBackupAllEvents] = useState({});
  
  // 새 일정 데이터
  const [newPersonalSchedule, setNewPersonalSchedule] = useState(null);
  const [newPartySchedule, setNewPartySchedule] = useState(null);
  const [updatedPersonalSchedule, setUpdatedPersonalSchedule] = useState(null);
  const [deletedPersonalSchedule, setDeletedPersonalSchedule] = useState(null);
  
  // 강제 새로고침
  const [forceRefreshHome, setForceRefreshHome] = useState(false);
  const [forceRefreshTimestamp, setForceRefreshTimestamp] = useState(null);
  
  // 파티 탭 새로고침
  const [refreshPartyTab, setRefreshPartyTab] = useState(false);
  
  // 액세스 토큰
  const [accessToken, setAccessToken] = useState(null);
  
  // 처리 중 상태
  const isProcessingSchedule = useRef(false);
  
  // 일정 업데이트 함수
  const updateHomeSchedule = useCallback((eventData, action) => {
    if (isProcessingSchedule.current) return;
    
    isProcessingSchedule.current = true;
    
    try {
      if (action === 'add' || action === 'update') {
        const newAllEvents = { ...allEvents };
        const eventDate = eventData.party_date || eventData.date;
        
        if (!newAllEvents[eventDate]) {
          newAllEvents[eventDate] = [];
        }
        
        const existingIndex = newAllEvents[eventDate].findIndex(
          event => event.id === eventData.id
                        );
                        
                        if (existingIndex >= 0) {
          newAllEvents[eventDate][existingIndex] = eventData;
                        } else {
          newAllEvents[eventDate].push(eventData);
        }
        
        setAllEvents(newAllEvents);
      } else if (action === 'delete') {
        const newAppointments = appointments.filter(app => app.id !== eventData.id);
        setAppointments(newAppointments);
        
        const newAllEvents = { ...allEvents };
        const eventDate = eventData.party_date || eventData.date;
        
        if (newAllEvents[eventDate]) {
          newAllEvents[eventDate] = newAllEvents[eventDate].filter(
            event => event.id !== eventData.id
          );
        }
        
        setAllEvents(newAllEvents);
      }
    } finally {
      isProcessingSchedule.current = false;
    }
  }, [allEvents, appointments]);
  
  // 백업 데이터 저장
  const saveBackupData = useCallback(() => {
    setBackupAppointments([...appointments]);
    setBackupMarkedDates({ ...markedDates });
    setBackupAllEvents({ ...allEvents });
  }, [appointments, markedDates, allEvents]);
  
  // 백업 데이터 복원
  const restoreBackupData = useCallback(() => {
    if (backupAppointments.length > 0) {
      setAppointments(backupAppointments);
      setMarkedDates(backupMarkedDates);
      setAllEvents(backupAllEvents);
    }
  }, [backupAppointments, backupMarkedDates, backupAllEvents]);
  
  // 새 일정 설정
  const setNewPersonalScheduleData = useCallback((schedule) => {
    setNewPersonalSchedule(schedule);
  }, []);
  
  const setNewPartyScheduleData = useCallback((schedule) => {
    setNewPartySchedule(schedule);
  }, []);
  
  const setUpdatedPersonalScheduleData = useCallback((schedule) => {
    setUpdatedPersonalSchedule(schedule);
  }, []);
  
  const setDeletedPersonalScheduleData = useCallback((schedule) => {
    setDeletedPersonalSchedule(schedule);
  }, []);
  
  // 일정 데이터 클리어
  const clearNewPersonalSchedule = useCallback(() => {
    setNewPersonalSchedule(null);
  }, []);
  
  const clearNewPartySchedule = useCallback(() => {
    setNewPartySchedule(null);
  }, []);
  
  const clearUpdatedPersonalSchedule = useCallback(() => {
    setUpdatedPersonalSchedule(null);
  }, []);
  
  const clearDeletedPersonalSchedule = useCallback(() => {
    setDeletedPersonalSchedule(null);
    }, []);

  // 강제 새로고침 설정
  const setForceRefresh = useCallback((force, timestamp = Date.now()) => {
    setForceRefreshHome(force);
    setForceRefreshTimestamp(timestamp);
    }, []);

  // 강제 새로고침 클리어
  const clearForceRefresh = useCallback(() => {
    setForceRefreshHome(false);
    setForceRefreshTimestamp(null);
    }, []);

  // 파티 탭 새로고침 설정
  const setRefreshPartyTabCallback = useCallback((refresh) => {
    setRefreshPartyTab(refresh);
  }, []);

  // 🚨 중요: 통합 일정 업데이트 함수
  const updateScheduleUnified = useCallback((event, action, type, eventId) => {
    console.log('🔍 [ScheduleContext] updateScheduleUnified 호출:', { action, type, eventId });
    
    if (action === 'delete') {
      if (type === 'personal') {
        // 개인 일정 삭제
        const deleteData = {
          date: event.date,
          scheduleId: eventId || event.id
        };
        setDeletedPersonalSchedule(deleteData);
        console.log('🔍 [ScheduleContext] 개인 일정 삭제 요청:', deleteData);
      }
    }
  }, []);

  const value = {
    // 상태
    appointments,
    markedDates,
    allEvents,
    backupAppointments,
    backupMarkedDates,
    backupAllEvents,
    newPersonalSchedule,
    newPartySchedule,
    updatedPersonalSchedule,
    deletedPersonalSchedule,
    forceRefreshHome,
    forceRefreshTimestamp,
    isProcessingSchedule: isProcessingSchedule.current,
    
    // 설정 함수
    setAppointments,
    setMarkedDates,
    setAllEvents,
    
    // 업데이트 함수
    updateHomeSchedule,
    updateScheduleUnified,
    
    // 백업 함수
    saveBackupData,
    restoreBackupData,
    
    // 새 일정 설정 함수
    setNewPersonalScheduleData,
    setNewPartyScheduleData,
    setUpdatedPersonalScheduleData,
    setDeletedPersonalScheduleData,
    
    // 클리어 함수
    clearNewPersonalSchedule,
    clearNewPartySchedule,
    clearUpdatedPersonalSchedule,
    clearDeletedPersonalSchedule,
    
    // 강제 새로고침 함수
    setForceRefresh,
    clearForceRefresh,
    
    // 파티 탭 새로고침
    refreshPartyTab,
    setRefreshPartyTab: setRefreshPartyTabCallback,
    
    // 액세스 토큰
    accessToken,
    setAccessToken,
  };

    return (
    <ScheduleContext.Provider value={value}>
            {children}
        </ScheduleContext.Provider>
    );
};
