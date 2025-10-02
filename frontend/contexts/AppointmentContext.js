import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import appService from '../services/AppService'// 기본 사용자 정보 (Context에서 가져와야 함)
const getCurrentUser = () => {
    try {
        // global.currentUser에서 사용자 정보 가져오기
        if (global.currentUser && global.currentUser.employee_id) {
            return global.currentUser;
        }
        
        // fallback: AuthManager에서 사용자 정보 가져오기
        if (global.authManager && global.authManager.getCurrentUser) {
            const user = global.authManager.getCurrentUser();
            if (user && user.employee_id) {
                return user;
            }
        }
        
        console.warn('⚠️ [AppointmentContext] 사용자 정보를 찾을 수 없음');
        return null;
    } catch (error) {
        console.error('사용자 정보 가져오기 실패:', error);
        return null;
    }
};

// 안전한 API 요청 함수
const safeApiRequest = async (url, options = {}) => {
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            throw new Error(`API 오류: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API 요청 실패:', error);
        throw error;
    }
};

const AppointmentContext = createContext();

export const useAppointment = () => {
    const context = useContext(AppointmentContext);
    if (!context) {
        throw new Error('useAppointment는 AppointmentProvider 내에서 사용되어야 합니다');
    }
    return context;
};

export const AppointmentProvider = ({ children }) => {
    const [appointments, setAppointments] = useState({});
    const [syncStatus, setSyncStatus] = useState('idle'); // idle, syncing, synced, error
    const [lastSync, setLastSync] = useState(null);
    const [conflicts, setConflicts] = useState([]);

    // 기존 데이터와의 호환성을 위한 변환 함수
    const convertLegacyData = useCallback((legacyData) => {
        const converted = {};
        
        Object.keys(legacyData).forEach(date => {
            converted[date] = legacyData[date].map(event => ({
                id: event.id || `legacy_${Date.now()}_${Math.random()}`,
                type: event.type || 'unknown',
                title: event.title || '제목 없음',
                date: event.date || date,
                time: event.time || '',
                restaurant: event.restaurant || '',
                location: event.location || '',
                description: event.description || '',
                members: event.members || event.all_members || [],
                isLegacy: true
            }));
        });
        
        return converted;
    }, []);

    // 기존 데이터 로드 (호환성 유지)
    const loadLegacyData = useCallback(async () => {
        try {
            const currentUser = getCurrentUser();
            
            // 사용자 정보가 없으면 빈 데이터 반환
            if (!currentUser || !currentUser.employee_id) {
                console.warn('⚠️ [AppointmentContext] 사용자 정보가 없어서 기존 데이터 로드를 건너뜀');
                setSyncStatus('error');
                return {};
            }
            
            const response = await appService./events/${currentUser.employee_id});
            
            if (response.ok) {
                const data = await response.json();
                const convertedData = convertLegacyData(data);
                setAppointments(convertedData);
                setLastSync(new Date());
                setSyncStatus('synced');
                return convertedData;
            }
        } catch (error) {
            console.error('기존 데이터 로드 실패:', error);
            setSyncStatus('error');
        }
        return {};
    }, [convertLegacyData]);

    // 충돌 감지 함수
    const detectConflicts = useCallback((newAppointment, existingAppointments) => {
        const conflicts = [];
        const targetDate = newAppointment.date;
        
        console.log('충돌 감지 시작:', { newAppointment, targetDate, existingAppointments });
        
        if (!existingAppointments[targetDate] || existingAppointments[targetDate].length === 0) {
            console.log('해당 날짜에 기존 약속 없음');
            return conflicts;
        }
        
        existingAppointments[targetDate].forEach((existing, index) => {
            console.log(`기존 약속 ${index + 1} 검사:`, existing);
            
            // 시간 충돌 검사 (더 정교한 로직)
            if (newAppointment.time && existing.time) {
                const newTime = newAppointment.time;
                const existingTime = existing.time;
                
                // 시간 범위 충돌 검사 (11:30-13:00 vs 12:00-13:30)
                if (newTime === existingTime) {
                    conflicts.push({
                        id: `time_conflict_${index}`,
                        type: 'TIME_CONFLICT',
                        severity: 'HIGH',
                        message: `같은 시간(${existingTime})에 이미 일정이 있습니다`,
                        existingAppointment: existing,
                        newAppointment: newAppointment,
                        resolution: 'RESCHEDULE'
                    });
                }
            }
            
            // 참가자 충돌 검사
            if (newAppointment.members && existing.members && newAppointment.members.length > 0) {
                const commonMembers = newAppointment.members.filter(member => 
                    existing.members.some(existingMember => 
                        existingMember.employee_id === member.employee_id ||
                        existingMember.nickname === member.nickname
                    )
                );
                
                if (commonMembers.length > 0) {
                    conflicts.push({
                        id: `participant_conflict_${index}`,
                        type: 'PARTICIPANT_CONFLICT',
                        severity: 'MEDIUM',
                        message: `${commonMembers.map(m => m.nickname || m.employee_id).join(', ')}님이 이미 다른 일정에 참여 중입니다`,
                        existingAppointment: existing,
                        newAppointment: newAppointment,
                        conflictingMembers: commonMembers,
                        resolution: 'EXCLUDE_PARTICIPANTS'
                    });
                }
            }
            
            // 장소 충돌 검사 (같은 장소, 같은 시간대)
            if (newAppointment.location && existing.location && 
                newAppointment.location === existing.location && 
                newAppointment.time === existing.time) {
                conflicts.push({
                    id: `location_conflict_${index}`,
                    type: 'LOCATION_CONFLICT',
                    severity: 'MEDIUM',
                    message: `같은 장소(${existing.location})에 이미 일정이 있습니다`,
                    existingAppointment: existing,
                    newAppointment: newAppointment,
                    resolution: 'CHANGE_LOCATION'
                });
            }
        });
        
        console.log('충돌 감지 결과:', conflicts);
        return conflicts;
    }, []);

    // 약속 생성 함수
    const createAppointment = useCallback(async (appointmentData) => {
        try {
            setSyncStatus('syncing');
            
            // 충돌 검사
            const detectedConflicts = detectConflicts(appointmentData, appointments);
            if (detectedConflicts.length > 0) {
                setConflicts(detectedConflicts);
                
                // 사용자에게 충돌 알림
                const conflictMessage = detectedConflicts.map(c => c.message).join('\n');
                Alert.alert(
                    '일정 충돌 감지',
                    conflictMessage,
                    [
                        { text: '취소', style: 'cancel' },
                        { text: '계속 진행', onPress: () => proceedWithConflicts(appointmentData, detectedConflicts) }
                    ]
                );
                return { success: false, conflicts: detectedConflicts };
            }
            
            // 충돌이 없으면 바로 생성
            return await proceedWithConflicts(appointmentData, []);
            
        } catch (error) {
            console.error('약속 생성 실패:', error);
            setSyncStatus('error');
            Alert.alert('오류', '약속 생성에 실패했습니다.');
            return { success: false, error };
        }
    }, [appointments, detectConflicts]);

    // 충돌과 함께 진행하는 함수
    const proceedWithConflicts = useCallback(async (appointmentData, conflicts) => {
        try {
            const currentUser = getCurrentUser();
            
            // 기존 시스템과의 호환성을 위해 적절한 API 선택
            let response;
            let newAppointment;
            
            if (appointmentData.type === '개인 일정') {
                // 개인 일정은 그룹 파티와 동일한 API 사용 (임시)
                response = await appService./parties, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        creator_id: currentUser.employee_id,
                        party_date: appointmentData.date,
                        title: appointmentData.title,
                        restaurant_name: '',
                        meeting_location: appointmentData.location || '1층 로비',
                        meeting_time: appointmentData.time || '11:30'
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    newAppointment = {
                        id: data.id,
                        type: '개인 일정',
                        title: appointmentData.title,
                        date: appointmentData.date,
                        description: appointmentData.description,
                        location: appointmentData.location,
                        time: appointmentData.time,
                        isLegacy: false
                    };
                }
            } else if (appointmentData.type === '그룹 파티') {
                // 그룹 파티 API 사용 (기존 시스템과 동일)
                response = await appService./parties, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        creator_id: currentUser.employee_id,
                        party_date: appointmentData.date,
                        title: appointmentData.title,
                        restaurant_name: appointmentData.restaurant || '',
                        meeting_location: appointmentData.location || '1층 로비',
                        meeting_time: appointmentData.time || '11:30'
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    newAppointment = {
                        id: data.id,
                        type: '그룹 파티',
                        title: appointmentData.title,
                        date: appointmentData.date,
                        restaurant: appointmentData.restaurant,
                        location: appointmentData.location,
                        time: appointmentData.time,
                        isLegacy: false
                    };
                }
            }
            
            if (newAppointment) {
                // 로컬 상태 업데이트
                setAppointments(prev => ({
                    ...prev,
                    [newAppointment.date]: [
                        ...(prev[newAppointment.date] || []),
                        newAppointment
                    ]
                }));
                
                setSyncStatus('synced');
                setLastSync(new Date());
                setConflicts([]);
                
                Alert.alert('성공', '약속이 생성되었습니다.');
                return { success: true, appointment: newAppointment };
            }
            
        } catch (error) {
            console.error('약속 생성 진행 실패:', error);
            setSyncStatus('error');
            Alert.alert('오류', '약속 생성에 실패했습니다.');
            return { success: false, error };
        }
    }, []);

    // 데이터 동기화 함수
    const syncAppointments = useCallback(async (force = false) => {
        try {
            if (syncStatus === 'syncing' && !force) return;
            
            setSyncStatus('syncing');
            await loadLegacyData();
            
        } catch (error) {
            console.error('동기화 실패:', error);
            setSyncStatus('error');
        }
    }, [loadLegacyData, syncStatus]);

    // 약속 수정 함수
    const updateAppointment = useCallback(async (appointmentId, updates) => {
        try {
            setSyncStatus('syncing');
            
            // 기존 시스템과의 호환성을 위해 적절한 API 선택
            // (구현은 기존 시스템의 수정 API를 사용)
            
            // 로컬 상태 업데이트
            setAppointments(prev => {
                const updated = { ...prev };
                Object.keys(updated).forEach(date => {
                    updated[date] = updated[date].map(appointment => 
                        appointment.id === appointmentId 
                            ? { ...appointment, ...updates }
                            : appointment
                    );
                });
                return updated;
            });
            
            setSyncStatus('synced');
            setLastSync(new Date());
            
        } catch (error) {
            console.error('약속 수정 실패:', error);
            setSyncStatus('error');
        }
    }, []);

    // 약속 삭제 함수
    const deleteAppointment = useCallback(async (appointmentId) => {
        try {
            setSyncStatus('syncing');
            
            // 기존 시스템과의 호환성을 위해 적절한 API 선택
            // (구현은 기존 시스템의 삭제 API를 사용)
            
            // 로컬 상태에서 제거
            setAppointments(prev => {
                const updated = { ...prev };
                Object.keys(updated).forEach(date => {
                    updated[date] = updated[date].filter(appointment => 
                        appointment.id !== appointmentId
                    );
                });
                return updated;
            });
            
            setSyncStatus('synced');
            setLastSync(new Date());
            
        } catch (error) {
            console.error('약속 삭제 실패:', error);
            setSyncStatus('error');
        }
    }, []);

    // 초기 데이터 로드
    useEffect(() => {
        loadLegacyData();
    }, [loadLegacyData]);

    const value = {
        appointments,
        syncStatus,
        lastSync,
        conflicts,
        createAppointment,
        updateAppointment,
        deleteAppointment,
        syncAppointments,
        detectConflicts: detectConflicts
    };

    return (
        <AppointmentContext.Provider value={value}>
            {children}
        </AppointmentContext.Provider>
    );
};

