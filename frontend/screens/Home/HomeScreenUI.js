// HomeScreen UI 렌더링 로직
// 이 파일은 HomeScreen의 UI 컴포넌트들을 포함합니다

import React from 'react';
import { Text, View, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { styles } from './HomeScreenStyles';

// 랜덤 런치 카드 렌더링
export const renderRandomLunchCard = (currentColors, handleMatchPress) => {
    return (
        <TouchableOpacity style={{
            backgroundColor: currentColors.primary,
            borderRadius: 20,
            marginHorizontal: 16,
            marginBottom: 16,
            padding: 20,
            elevation: 3,
            shadowColor: currentColors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            borderWidth: 1,
            borderColor: 'rgba(59, 130, 246, 0.1)'
        }} onPress={handleMatchPress}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                <Text style={{color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', marginBottom: 12}}>랜덤 런치 🎲</Text>
                <Ionicons name="shuffle" size={28} color="#FFFFFF" />
            </View>
            <Text style={{color: '#FFFFFF', fontSize: 16, marginTop: 8}}>새로운 동료와 점심 약속을 잡아보세요!</Text>
        </TouchableOpacity>
    );
};

// 약속 아이템 렌더링
export const renderAppointmentItem = ({ item }, currentUser, setModalData) => {
    const date = new Date(item.date);
    const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
    
    return (
        <TouchableOpacity style={styles.appointmentCard} onPress={() => { 
            setModalData({ visible: true, events: item.events || [], date: item.date }); 
        }}>
            <View style={styles.appointmentHeader}>
                <Text style={styles.appointmentDate}>{`${date.getDate()}일 (${dayOfWeek})`}</Text>
            </View>
            {item.events && item.events.length > 0 ? (
                item.events.map((event, index) => {
                    // 참석자에서 내 닉네임 제외 (userManager 사용)
                    const currentNickname = currentUser?.nickname || '사용자';
                    
                    // 기타 일정의 attendees 필드 처리
                    let others = [];
                    if (event.attendees && Array.isArray(event.attendees)) {
                        // 기타 일정: attendees 배열에서 nickname 추출
                        others = event.attendees
                            .map(attendee => attendee.nickname || attendee.name)
                            .filter(name => name && name.toLowerCase() !== currentNickname.trim().toLowerCase());
                    } else if (event.all_members || event.members) {
                        // 파티 일정: 기존 방식
                        others = (event.all_members || event.members || []).map(s => s.trim()).filter(name => name.toLowerCase() !== currentNickname.trim().toLowerCase());
                    }
                    
                    // description에서 시간, 식당, 참석자 파싱 (필드가 없을 때만)
                    let parsedTime = event.time;
                    let parsedRestaurant = event.restaurant;
                    let parsedLocation = event.location;
                    
                    if ((!parsedTime || !parsedRestaurant || !parsedLocation || others.length === 0) && event.description) {
                        // 새로운 형식 파싱 (모이는 시간, 모이는 장소)
                        const timeMatch = event.description.match(/🕐 모이는 시간: ([^\n]+)/) || event.description.match(/시간: ([^\n]+)/);
                        const restaurantMatch = event.description.match(/🍽️ 식당: ([^\n]+)/);
                        const locationMatch = event.description.match(/📍 모이는 장소: ([^\n]+)/) || event.description.match(/장소: ([^\n]+)/);
                        const attendeesMatch = event.description.match(/👥 참석자: ([^\n]+)/) || event.description.match(/참가자: ([^\n]+)/);
                        
                        if (!parsedTime && timeMatch) parsedTime = timeMatch[1].trim();
                        if (!parsedRestaurant && restaurantMatch) parsedRestaurant = restaurantMatch[1].trim();
                        if (!parsedLocation && locationMatch) parsedLocation = locationMatch[1].trim();
                        if (others.length === 0 && attendeesMatch) {
                            // 참석자에서 (숫자명) 제거하고 파싱
                            const attendeesText = attendeesMatch[1].replace(/\s*\(\d+명\)$/, '');
                            others = attendeesText.split(',').map(s => s.trim()).filter(name => name && name.toLowerCase() !== currentNickname.trim().toLowerCase());
                        }
                    }
                    
                    return (
                        <View key={index} style={styles.eventItem}>
                            <Text style={styles.eventTitle} numberOfLines={1}>
                                {event.type === '랜덤 런치' ? '⚡️' : 
                                 (event.type === '파티' || event.isParty) ? '🎉' : 
                                 (event.scheduleType === '기타 일정' || !event.type) ? '📝' : '📝'} {event.title}
                            </Text>
                            {/* 시간 표시 */}
                            {parsedTime && <Text style={styles.eventDetail} numberOfLines={1}>⏰ {parsedTime}</Text>}
                            {/* 식당 표시 */}
                            {parsedRestaurant && <Text style={styles.eventDetail} numberOfLines={1}>🍽️ {parsedRestaurant}</Text>}
                            {/* 모이는 장소 표시 */}
                            {parsedLocation && <Text style={styles.eventDetail} numberOfLines={1}>📍 {parsedLocation}</Text>}
                            {/* 참석자(내 닉네임 제외) */}
                            {others.length > 0 && <Text style={styles.eventDetail} numberOfLines={1}>👥 {others.join(', ')}</Text>}
                        </View>
                    );
                })
            ) : (
                <View style={{flex: 1, justifyContent: 'center'}}>
                    <Text style={styles.noAppointmentText}>약속 없음</Text>
                </View>
            )}
        </TouchableOpacity>
    );
};

// 플로팅 빠른 액션 버튼
export const renderFloatingActionButton = (currentColors, setModalData, toLocalDateString, getKoreanToday) => {
    return (
        <TouchableOpacity
            style={{
                position: 'absolute',
                right: 24,
                bottom: 32,
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: currentColors.primary,
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 10,
                elevation: 8,
                shadowColor: currentColors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8
            }}
            activeOpacity={0.85}
            onPress={() => {
                // 🎯 홈탭에서 이미 계산된 정확한 오늘 날짜를 전역 변수에서 가져오기
                const todayString = toLocalDateString(getKoreanToday());
                setModalData({ visible: true, events: [], date: todayString });
            }}
        >
            <Ionicons name="add" size={32} color="#fff" />
        </TouchableOpacity>
    );
};

// 메뉴 카드 렌더링
export const renderMenuCard = (todayMenu, styles, currentColors) => {
    return (
        <View style={{
            backgroundColor: currentColors.surface,
            borderRadius: 20,
            marginHorizontal: 16,
            marginBottom: 16,
            marginTop: 14,
            padding: 20,
            elevation: 3,
            shadowColor: currentColors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            borderWidth: 1,
            borderColor: 'rgba(59, 130, 246, 0.1)'
        }}>
            <Text style={styles.cardTitle}>오늘의 구내식당 메뉴 🍱</Text>
            <Text style={styles.menuText}>{(todayMenu || []).length > 0 ? todayMenu.join(', ') : '메뉴 정보가 없습니다.'}</Text>
        </View>
    );
};

// 약속 목록 카드 렌더링
export const renderAppointmentsCard = (generateAppointmentsFromAllEvents, renderAppointmentItem, styles, currentColors) => {
    return (
        <View style={{
            backgroundColor: currentColors.surface,
            borderRadius: 20,
            marginHorizontal: 16,
            marginBottom: 16,
            padding: 20,
            elevation: 3,
            shadowColor: currentColors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            borderWidth: 1,
            borderColor: 'rgba(59, 130, 246, 0.1)'
        }}>
            <Text style={styles.cardTitle}>나의 점심 약속 🗓️</Text>
            <FlatList 
                data={generateAppointmentsFromAllEvents()} 
                renderItem={renderAppointmentItem} 
                keyExtractor={item => item.date} 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={{ paddingVertical: 5 }} 
            />
        </View>
    );
};

// 달력 카드 렌더링
export const renderCalendarCard = (markedDates, setModalData, getSafeEventsForDate, styles, currentColors) => {
    return (
        <View style={{
            backgroundColor: currentColors.surface,
            borderRadius: 20,
            marginHorizontal: 16,
            marginBottom: 16,
            padding: 20,
            elevation: 3,
            shadowColor: currentColors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            borderWidth: 1,
            borderColor: 'rgba(59, 130, 246, 0.1)'
        }}>
            <Text style={styles.cardTitle}>달력 📅</Text>
            <Calendar 
                markedDates={markedDates} 
                maxDate={new Date(Date.now() + 15 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]} // 15년 후까지
                onDayPress={(day) => { 
                    try {
                        // 🚨 중요: 안전한 헬퍼 함수 사용
                        const validEvents = getSafeEventsForDate(day.dateString);
                    
                        // 날짜 클릭 시 모달 데이터 설정
                        setModalData({ visible: true, events: validEvents, date: day.dateString }); 
                    } catch (error) {
                        console.error('🔍 [Calendar] onDayPress 오류:', error);
                        setModalData({ visible: true, events: [], date: day.dateString });
                    }
                }} 
                theme={{ 
                    selectedDayBackgroundColor: currentColors.primary, 
                    todayTextColor: currentColors.primary, 
                    arrowColor: currentColors.primary,
                    selectedDayTextColor: '#FFFFFF',
                    'stylesheet.calendar.header': { 
                        week: { 
                            marginTop: 5, 
                            flexDirection: 'row', 
                            justifyContent: 'space-between' 
                        } 
                    },
                    'stylesheet.day.basic': {
                        base: {
                            width: 32,
                            height: 32,
                            alignItems: 'center',
                            justifyContent: 'center'
                        }
                    },
                    'stylesheet.day.single': {
                        base: {
                            width: 32,
                            height: 32,
                            alignItems: 'center',
                            justifyContent: 'center'
                        },
                        selected: {
                            backgroundColor: 'transparent',
                            borderRadius: 16,
                            borderWidth: 2,
                            borderColor: 'transparent'
                        }
                    },
                    // 랜덤런치 일정의 글자색을 남색으로 설정
                    'stylesheet.day.marked': {
                        base: {
                            width: 32,
                            height: 32,
                            alignItems: 'center',
                            justifyContent: 'center'
                        }
                    }
                }} 
            />
        </View>
    );
};
