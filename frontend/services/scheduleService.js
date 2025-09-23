import scheduleAPI from './apiClient';

/**
 * 새로운 일정 API 서비스
 * 백엔드에서 반복 일정 계산과 예외 처리를 모두 담당
 */

// 특정 기간의 모든 일정 조회 (반복 일정 자동 확장 + 예외 적용)
export const fetchSchedules = async (startDate, endDate, employeeId) => {
  try {
    const response = await scheduleAPI.getSchedules(employeeId, startDate, endDate);
    return response;
  } catch (error) {
    console.error('일정 조회 오류:', error);
    throw error;
  }
};

// 새로운 마스터 일정 생성
export const createSchedule = async (scheduleData) => {
  try {
    const response = await scheduleAPI.createSchedule(scheduleData);
    return response;
  } catch (error) {
    console.error('일정 생성 오류:', error);
    throw error;
  }
};

// 마스터 일정 수정 (모든 반복 일정 수정)
export const updateSchedule = async (scheduleId, updateData) => {
  try {
    const response = await scheduleAPI.updateSchedule(scheduleId, updateData);
    return response;
  } catch (error) {
    console.error('일정 수정 오류:', error);
    throw error;
  }
};

// 마스터 일정 삭제 (모든 반복 일정 삭제)
export const deleteSchedule = async (scheduleId) => {
  try {
    const response = await scheduleAPI.deleteSchedule(scheduleId);
    return response;
  } catch (error) {
    console.error('일정 삭제 오류:', error);
    throw error;
  }
};

// 특정 날짜의 예외 생성 (이 날짜만 수정/삭제)
export const createScheduleException = async (scheduleId, exceptionData) => {
  try {
    const response = await scheduleAPI.createException(scheduleId, exceptionData);
    return response;
  } catch (error) {
    console.error('일정 예외 생성 오류:', error);
    throw error;
  }
};

// 일정 예외 삭제
export const deleteScheduleException = async (scheduleId, exceptionId) => {
  try {
    const response = await scheduleAPI.deleteException(scheduleId, exceptionId);
    return response;
  } catch (error) {
    console.error('일정 예외 삭제 오류:', error);
    throw error;
  }
};

// 날짜 형식 변환 헬퍼 함수
export const formatDateForAPI = (date) => {
  if (typeof date === 'string') return date;
  if (date instanceof Date) return date.toISOString().split('T')[0];
  return date;
};

// 월 단위로 일정 조회 (HomeScreen용)
export const fetchSchedulesForMonth = async (year, month, employeeId) => {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
  
  return await fetchSchedules(startDate, endDate, employeeId);
};
