// HomeScreen 이벤트 핸들러 및 useEffect
// 이 파일은 HomeScreen의 이벤트 처리 로직을 포함합니다

export const handleMatchPress = async (navigation) => {
    try {
        navigation.navigate('파티', { screen: 'RandomLunch' });
        console.log('✅ 랜덤런치 화면으로 직접 이동 성공');
    } catch (error) {
        console.warn('❌ 랜덤런치 화면 이동 실패:', error);
    }
};

export const goToAddPersonalSchedule = (selectedDate, setModalData, navigation, currentUser) => {
    try {
        // 모달 닫기
        setModalData({ visible: false });
        
        // 선택된 날짜가 있으면 해당 날짜로, 없으면 오늘 날짜로
        const targetDate = selectedDate || new Date();
        
        // 개인 일정 추가 화면으로 이동
        console.log('✅ 기타 일정 추가 화면으로 이동 준비:', targetDate);
        
        // navigation 객체 확인 및 화면 이동
        if (navigation && typeof navigation.navigate === 'function') {
            navigation.navigate('파티', { 
                screen: 'CreatePersonalSchedule',
                params: { 
                    selectedDate: targetDate,
                    currentUser: currentUser
                }
            });
            console.log('✅ 기타 일정 추가 화면으로 이동 성공');
        } else {
            console.error('❌ navigation 객체가 유효하지 않습니다:', navigation);
        }
    } catch (error) {
        console.error('❌ 기타 일정 추가 화면 이동 실패:', error);
    }
};

// 일정 삭제 처리
export const handleDeletePersonalSchedule = (scheduleId, eventData = null, deleteMode = 'single') => {
    if (deleteMode === 'single') {
        // 단일 일정 삭제
        deleteSchedule(scheduleId, 'single', eventData);
    } else if (deleteMode === 'all') {
        // 모든 반복 일정 삭제
        deleteSchedule(scheduleId, 'all', eventData);
    } else {
        // deleteMode가 없으면 기존 로직 사용 (하위 호환성)
        const isRecurring = eventData?.is_recurring || false;
        
        if (isRecurring) {
            Alert.alert(
                "반복 일정 삭제", 
                "이 일정은 반복 일정입니다. 어떻게 삭제하시겠습니까?",
                [
                    { text: "취소", style: "cancel" },
                    { 
                        text: "이 날짜만 삭제", 
                        onPress: () => deleteSchedule(scheduleId, 'single', eventData)
                    },
                    { 
                        text: "모든 반복 일정 삭제", 
                        style: "destructive",
                        onPress: () => deleteSchedule(scheduleId, 'all', eventData)
                    }
                ]
            );
        } else {
            Alert.alert("일정 삭제", "정말로 이 점심 약속을 삭제하시겠습니까?", [
                { text: "취소", style: "cancel" },
                { text: "삭제", style: "destructive", onPress: () => deleteSchedule(scheduleId, 'single', eventData) }
            ]);
        }
    }
};

// 일정 편집 처리
export const handleEditPersonalSchedule = (event, editMode = 'single') => {
    setModalData({ visible: false, events: [] });
    safeNavigateToTab(navigation, '파티', 'EditPersonalSchedule', { 
        schedule: event, 
        editMode: editMode 
    });
};

// 약속 생성 후 홈 화면 반영
export const handleAppointmentCreated = (newAppointment) => {
    // 로컬 상태에 즉시 추가 (Optimistic Update)
    const appointmentDate = newAppointment.date;
    setAppointments(prev => ({
        ...prev,
        [appointmentDate]: [
            ...(prev[appointmentDate] || []),
            newAppointment
        ]
    }));
    
    // 달력 마킹 업데이트
    setMarkedDates(prev => ({
        ...prev,
        [appointmentDate]: {
            selected: true,
            selectedColor: newAppointment.type === '랜덤 런치' ? '#F4D160' : 
                          newAppointment.type === '개인 일정' ? '#64748B' : '#3B82F6'
        }
    }));
    
    // 전체 이벤트 데이터 업데이트
    setAllEvents(prev => ({
        ...prev,
        [appointmentDate]: [
            ...(prev[appointmentDate] || []),
            newAppointment
        ]
    }));
    
    // 서버와 동기화
    fetchHomeData();
};

// 기본 약속 상자들 생성 (약속 데이터가 없을 때 사용)
export const generateDefaultAppointments = () => {
    const defaultAppointments = [];
    const today = getKoreanToday();
    
    // 오늘부터 7일간의 기본 날짜 생성
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateString = date.toISOString().split('T')[0];
        
        defaultAppointments.push({
            date: dateString,
            events: [] // 빈 이벤트 배열
        });
    }
    
    return defaultAppointments;
};

// allEvents에서 appointments 데이터 생성 (반복 일정 포함)
export const generateAppointmentsFromAllEvents = () => {
    // 🚨 중요: 한국 시간 기준으로 오늘 날짜 가져오기
    const today = getKoreanToday();
    
    const appointments = [];
    
    // 오늘부터 7일간의 카드를 항상 생성
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateString = date.toISOString().split('T')[0];
        
        // allEvents에서 해당 날짜의 일정 가져오기
        const events = allEvents && allEvents[dateString] ? allEvents[dateString] : [];
        
        appointments.push({
            date: dateString,
            events: events
        });
    }
    
    return appointments;
};

// allEvents에서 markedDates 데이터 생성 (달력 동그라미용)
export const generateMarkedDatesFromAllEvents = () => {
    const newMarkedDates = {};
    
    if (allEvents && typeof allEvents === 'object') {
        Object.keys(allEvents).forEach(dateString => {
            const events = allEvents[dateString];
            if (events && Array.isArray(events) && events.length > 0) {
                // 해당 날짜에 일정이 있으면 마킹
                // 기타 일정(개인 일정)은 회색, 파티 일정은 파란색, 랜덤런치는 노란색으로 표시
                const hasPartySchedule = events.some(event => event.type === 'party' || event.isParty);
                const hasPersonalSchedule = events.some(event => 
                    !event.type || 
                    event.type === 'personal' || 
                    !event.isParty || 
                    event.scheduleType === '기타 일정'
                );
                // 랜덤런치 확정된 일정 판단 조건 개선
                const hasRandomLunch = events.some(event => 
                    event.is_from_match === true || 
                    event.type === '랜덤 런치' ||
                    event.scheduleType === '랜덤 런치' ||
                    (event.type === 'party' && event.is_from_match === true) ||
                    (event.type === 'party' && event.status === 'confirmed' && event.is_from_match === true)
                );
                
                let selectedColor = '#3B82F6'; // 기본 파란색
                
                if (hasRandomLunch) {
                    // 랜덤런치가 있는 경우 노란색 (최우선)
                    selectedColor = '#F4D160'; // 노란색
                    console.log('🔍 [달력마크] 랜덤런치 노란색 마크:', dateString, events.filter(e => 
                        e.is_from_match === true || 
                        e.type === '랜덤 런치' ||
                        e.scheduleType === '랜덤 런치'
                    ));
                    
                    // 랜덤런치 일정의 경우 글자색을 남색으로 설정
                    newMarkedDates[dateString] = {
                        selected: true,
                        selectedColor: selectedColor,
                        textColor: '#1D5D9B' // 남색 글자색
                    };
                } else if (hasPersonalSchedule && !hasPartySchedule) {
                    // 기타 일정만 있는 경우 회색
                    selectedColor = '#64748B'; // 기타 일정 색상
                    newMarkedDates[dateString] = {
                        selected: true,
                        selectedColor: selectedColor
                    };
                } else if (hasPartySchedule) {
                    // 파티 일정이 있는 경우 파란색
                    selectedColor = '#3B82F6'; // 파란색
                    newMarkedDates[dateString] = {
                        selected: true,
                        selectedColor: selectedColor
                    };
                }
            }
        });
    }
    
    return newMarkedDates;
};
