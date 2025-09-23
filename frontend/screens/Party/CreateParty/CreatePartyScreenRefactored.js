import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Alert,
    SafeAreaView,
    StyleSheet,
    ActivityIndicator
} from 'react-native';
import { Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import DateTimePicker from '@react-native-community/datetimepicker';

// 공통 요소들 import
import COLORS from '../../../components/common/Colors';
import { getMyEmployeeId, toKoreanDateString, getKoreanToday } from '../../../components/common/Utils';
import { useCreateParty } from '../../../hooks/usePartyQuery';

// 분리된 컴포넌트들 import
import CreatePartyForm from './components/CreatePartyForm';
import RestaurantSelectionModal from './components/RestaurantSelectionModal';
import AttendeeSelectionModal from './components/AttendeeSelectionModal';

export default function CreatePartyScreen({ navigation, route }) {
    const { 
        date, 
        title: initialTitle, 
        restaurant: initialRestaurant, 
        selectedDate: initialSelectedDate, 
        time: initialTime, 
        location: initialLocation, 
        selectedAttendees: initialSelectedAttendees, 
        description: initialDescription, 
        showAttendeesModal: initialShowAttendeesModal 
    } = route.params || {};

    const createPartyMutation = useCreateParty();
    const currentColors = global.currentColors || COLORS.light;
    const myEmployeeId = getMyEmployeeId();
    
    // 상태 변수들
    const [title, setTitle] = useState(initialTitle || '');
    const [restaurant, setRestaurant] = useState(initialRestaurant || '');
    const [selectedDate, setSelectedDate] = useState(() => {
        if (initialSelectedDate) {
            const parsedDate = new Date(initialSelectedDate);
            if (!isNaN(parsedDate.getTime())) {
                return parsedDate;
            }
        }
        if (date) {
            const parsedDate = new Date(date);
            if (!isNaN(parsedDate.getTime())) {
                return parsedDate;
            }
        }
        const today = getKoreanToday();
        return today;
    });
    const [time, setTime] = useState(initialTime || '11:30');
    const [location, setLocation] = useState(initialLocation || '');
    const [selectedAttendees, setSelectedAttendees] = useState(initialSelectedAttendees || []);
    const [description, setDescription] = useState(initialDescription || '');
    
    // 모달 상태들
    const [isDateModalVisible, setDateModalVisible] = useState(false);
    const [isTimeModalVisible, setTimeModalVisible] = useState(false);
    const [showAttendeesModal, setShowAttendeesModal] = useState(initialShowAttendeesModal || false);
    const [showRestaurantModal, setShowRestaurantModal] = useState(false);
    
    // 로딩 상태
    const [isLoading, setIsLoading] = useState(false);

    // 날짜 선택 핸들러
    const handleDateSelect = (day) => {
        setSelectedDate(new Date(day.dateString));
        setDateModalVisible(false);
    };

    // 시간 선택 핸들러
    const handleTimeChange = (event, selectedTime) => {
        if (selectedTime) {
            const timeString = selectedTime.toTimeString().slice(0, 5);
            setTime(timeString);
        }
        setTimeModalVisible(false);
    };

    // 식당 선택 핸들러
    const handleRestaurantSelect = (selectedRestaurant) => {
        setRestaurant(selectedRestaurant.name);
        setShowRestaurantModal(false);
    };

    // 참석자 선택 핸들러
    const handleAttendeesSelect = (attendees) => {
        setSelectedAttendees(attendees);
        setShowAttendeesModal(false);
    };

    // 파티 생성 핸들러
    const handleCreateParty = async () => {
        // 입력 검증
        if (!title.trim()) {
            Alert.alert('오류', '파티 제목을 입력해주세요.');
            return;
        }
        if (!restaurant.trim()) {
            Alert.alert('오류', '식당을 선택해주세요.');
            return;
        }

        try {
            setIsLoading(true);
            
            const partyData = {
                title: title.trim(),
                restaurant_name: restaurant.trim(),
                restaurant_address: '', // 식당 선택 시 주소 정보 추가 필요
                party_date: selectedDate.toISOString().split('T')[0],
                party_time: time,
                meeting_location: location.trim(),
                max_members: selectedAttendees.length + 1, // 호스트 포함
                description: description.trim(),
                attendees: selectedAttendees.map(attendee => attendee.employee_id)
            };

            await createPartyMutation.mutateAsync(partyData);
            
            Alert.alert(
                '성공', 
                '파티가 성공적으로 생성되었습니다!',
                [
                    {
                        text: '확인',
                        onPress: () => navigation.goBack()
                    }
                ]
            );
            
        } catch (error) {
            console.error('파티 생성 실패:', error);
            Alert.alert('오류', '파티 생성 중 오류가 발생했습니다. 다시 시도해주세요.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background }]}>
            {/* 헤더 */}
            <View style={[styles.header, { backgroundColor: currentColors.surface, borderBottomColor: currentColors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
                    <Ionicons name="arrow-back" size={24} color={currentColors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: currentColors.text }]}>
                    파티 만들기
                </Text>
                <TouchableOpacity 
                    onPress={handleCreateParty}
                    disabled={isLoading}
                    style={[styles.createButton, { backgroundColor: currentColors.primary }]}
                >
                    {isLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.createButtonText}>생성</Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* 폼 */}
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                <CreatePartyForm
                    title={title}
                    setTitle={setTitle}
                    restaurant={restaurant}
                    setRestaurant={setRestaurant}
                    selectedDate={selectedDate}
                    setSelectedDate={setSelectedDate}
                    time={time}
                    setTime={setTime}
                    location={location}
                    setLocation={setLocation}
                    selectedAttendees={selectedAttendees}
                    setSelectedAttendees={setSelectedAttendees}
                    description={description}
                    setDescription={setDescription}
                    onShowDateModal={() => setDateModalVisible(true)}
                    onShowTimeModal={() => setTimeModalVisible(true)}
                    onShowRestaurantModal={() => setShowRestaurantModal(true)}
                    onShowAttendeesModal={() => setShowAttendeesModal(true)}
                    currentColors={currentColors}
                />
            </ScrollView>

            {/* 날짜 선택 모달 */}
            <Modal
                visible={isDateModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setDateModalVisible(false)}
            >
                <View style={[styles.modalContainer, { backgroundColor: currentColors.background }]}>
                    <View style={[styles.modalHeader, { backgroundColor: currentColors.surface, borderBottomColor: currentColors.border }]}>
                        <TouchableOpacity onPress={() => setDateModalVisible(false)} style={styles.modalButton}>
                            <Ionicons name="close" size={24} color={currentColors.text} />
                        </TouchableOpacity>
                        <Text style={[styles.modalTitle, { color: currentColors.text }]}>
                            날짜 선택
                        </Text>
                        <View style={styles.modalButton} />
                    </View>
                    <Calendar
                        onDayPress={handleDateSelect}
                        markedDates={{
                            [selectedDate.toISOString().split('T')[0]]: {
                                selected: true,
                                selectedColor: currentColors.primary
                            }
                        }}
                        theme={{
                            backgroundColor: currentColors.background,
                            calendarBackground: currentColors.background,
                            textSectionTitleColor: currentColors.text,
                            selectedDayBackgroundColor: currentColors.primary,
                            selectedDayTextColor: '#fff',
                            todayTextColor: currentColors.primary,
                            dayTextColor: currentColors.text,
                            textDisabledColor: currentColors.textSecondary,
                            dotColor: currentColors.primary,
                            selectedDotColor: '#fff',
                            arrowColor: currentColors.primary,
                            monthTextColor: currentColors.text,
                            indicatorColor: currentColors.primary,
                            textDayFontWeight: '500',
                            textMonthFontWeight: '600',
                            textDayHeaderFontWeight: '500'
                        }}
                    />
                </View>
            </Modal>

            {/* 시간 선택 모달 */}
            <Modal
                visible={isTimeModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setTimeModalVisible(false)}
            >
                <View style={[styles.modalContainer, { backgroundColor: currentColors.background }]}>
                    <View style={[styles.modalHeader, { backgroundColor: currentColors.surface, borderBottomColor: currentColors.border }]}>
                        <TouchableOpacity onPress={() => setTimeModalVisible(false)} style={styles.modalButton}>
                            <Ionicons name="close" size={24} color={currentColors.text} />
                        </TouchableOpacity>
                        <Text style={[styles.modalTitle, { color: currentColors.text }]}>
                            시간 선택
                        </Text>
                        <View style={styles.modalButton} />
                    </View>
                    <View style={styles.timePickerContainer}>
                        <DateTimePicker
                            value={new Date(`2000-01-01T${time}:00`)}
                            mode="time"
                            is24Hour={true}
                            display="spinner"
                            onChange={handleTimeChange}
                            style={styles.timePicker}
                        />
                    </View>
                </View>
            </Modal>

            {/* 식당 선택 모달 */}
            <RestaurantSelectionModal
                visible={showRestaurantModal}
                onClose={() => setShowRestaurantModal(false)}
                onSelectRestaurant={handleRestaurantSelect}
                currentColors={currentColors}
            />

            {/* 참석자 선택 모달 */}
            <AttendeeSelectionModal
                visible={showAttendeesModal}
                onClose={() => setShowAttendeesModal(false)}
                onSelectAttendees={handleAttendeesSelect}
                selectedAttendees={selectedAttendees}
                currentColors={currentColors}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    headerButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    createButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    createButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    scrollView: {
        flex: 1,
    },
    modalContainer: {
        flex: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    modalButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    timePickerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    timePicker: {
        width: 200,
        height: 200,
    },
});
