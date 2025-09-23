import React, { useState, useCallback } from 'react';
import {
    Text,
    View,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    Alert
} from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { getKoreanToday } from '../../components/common/Utils';

// 컨텍스트
import { useSchedule } from '../../contexts/ScheduleContext';

export default function SelectLunchDateScreen({ navigation, currentColors }) {
    const [selectedDate, setSelectedDate] = useState('');
    const { createSchedule } = useSchedule();

    // 한국어 설정
    LocaleConfig.locales['kr'] = {
        monthNames: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
        monthNamesShort: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
        dayNames: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
        dayNamesShort: ['일', '월', '화', '수', '목', '금', '토'],
        today: '오늘'
    };
    LocaleConfig.defaultLocale = 'kr';

    const handleDateSelect = useCallback((day) => {
        const today = new Date();
        const selectedDate = new Date(day.timestamp);
        
        // 과거 날짜 선택 방지
        if (selectedDate < today.setHours(0, 0, 0, 0)) {
            Alert.alert('날짜 선택 오류', '과거 날짜는 선택할 수 없습니다.');
            return;
        }
        
        setSelectedDate(day.dateString);
    }, []);

    const handleConfirm = () => {
        if (!selectedDate) {
            Alert.alert('날짜 선택', '점심 약속 날짜를 선택해주세요.');
            return;
        }
        
        navigation.navigate('CreatePersonalSchedule', { selectedDate });
    };

    const today = getKoreanToday();
    const markedDates = selectedDate ? {
        [selectedDate]: {
            selected: true,
            selectedColor: currentColors.primary,
            selectedTextColor: currentColors.onPrimary
        }
    } : {};

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: currentColors.background }]}>
            <View style={styles.container}>
                <Text style={[styles.title, { color: currentColors.text }]}>
                    점심 약속 날짜 선택
                </Text>
                
                <Text style={[styles.subtitle, { color: currentColors.textSecondary }]}>
                    {today} 기준으로 날짜를 선택해주세요
                </Text>
                
                <View style={[styles.calendarContainer, { backgroundColor: currentColors.surface }]}>
                    <Calendar
                        onDayPress={handleDateSelect}
                        markedDates={markedDates}
                        theme={{
                            backgroundColor: currentColors.surface,
                            calendarBackground: currentColors.surface,
                            textSectionTitleColor: currentColors.text,
                            selectedDayBackgroundColor: currentColors.primary,
                            selectedDayTextColor: currentColors.onPrimary,
                            todayTextColor: currentColors.primary,
                            dayTextColor: currentColors.text,
                            textDisabledColor: currentColors.textSecondary,
                            dotColor: currentColors.primary,
                            selectedDotColor: currentColors.onPrimary,
                            arrowColor: currentColors.primary,
                            monthTextColor: currentColors.text,
                            indicatorColor: currentColors.primary,
                            textDayFontWeight: '300',
                            textMonthFontWeight: 'bold',
                            textDayHeaderFontWeight: '300',
                            textDayFontSize: 16,
                            textMonthFontSize: 16,
                            textDayHeaderFontSize: 13
                        }}
                        minDate={today}
                        maxDate={'2025-12-31'}
                    />
                </View>
                
                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={[styles.confirmButton, { backgroundColor: currentColors.primary }]}
                        onPress={handleConfirm}
                    >
                        <Text style={[styles.confirmButtonText, { color: currentColors.onPrimary }]}>
                            날짜 확인
                        </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        style={[styles.cancelButton, { backgroundColor: currentColors.surfaceVariant }]}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={[styles.cancelButtonText, { color: currentColors.onSurfaceVariant }]}>
                            취소
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    container: {
        flex: 1,
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
    },
    calendarContainer: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    buttonContainer: {
        gap: 12,
    },
    confirmButton: {
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    confirmButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    cancelButton: {
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
});
