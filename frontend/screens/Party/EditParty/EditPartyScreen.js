import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Modal,
    Alert,
    SafeAreaView,
    StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Calendar from 'react-native-calendars';
import DateTimePicker from '@react-native-community/datetimepicker';

// 공통 요소들 import
import COLORS from '../../../components/common/Colors';
import { RENDER_SERVER_URL, getMyEmployeeId, toKoreanDateString, toLocalDateString, safeNavigateToTab } from '../../../components/common/Utils';
import basicStyles from '../../../components/common/BasicStyles';
import { SuggestionsList } from '../../../components/common/FormComponents';

export default function EditPartyScreen({ route, navigation }) {
    const { partyData } = route.params;
    const [title, setTitle] = useState(partyData.title);
    const [restaurant, setRestaurant] = useState(partyData.restaurant_name);
    const [date, setDate] = useState('');
    const [time, setTime] = useState(partyData.party_time);
    const [location, setLocation] = useState(partyData.meeting_location);
    const [maxMembers, setMaxMembers] = useState(partyData.max_members);
    const [description, setDescription] = useState(partyData.description || '');
    const [isDateModalVisible, setDateModalVisible] = useState(false);
    const [isTimeModalVisible, setTimeModalVisible] = useState(false);
    const [isMaxMembersModalVisible, setMaxMembersModalVisible] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date(partyData.party_date));
    
    // 식당 선택 관련 상태들
    const [showRestaurantModal, setShowRestaurantModal] = useState(false);
    const [restaurantSearchQuery, setRestaurantSearchQuery] = useState('');
    const [frequentRestaurants, setFrequentRestaurants] = useState([]);
    const [showRestaurantManualInput, setShowRestaurantManualInput] = useState(false);
    const [restaurantManualInput, setRestaurantManualInput] = useState('');
    const [restaurantSuggestions, setRestaurantSuggestions] = useState([]);
    const [suggestedTitles, setSuggestedTitles] = useState([]);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

    const currentColors = global.currentColors || COLORS.light;
    const myEmployeeId = getMyEmployeeId();

    // 초기 날짜 설정
    useEffect(() => {
        const dateObj = new Date(partyData.party_date);
        const year = dateObj.getFullYear();
        const month = dateObj.getMonth() + 1;
        const day = dateObj.getDate();
        const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][dateObj.getDay()];
        setDate(`${year}.${month}.${day}.(${dayOfWeek})`);
    }, [partyData.party_date]);

    // AI 파티 제목 제안 기능
    const generateTitleSuggestions = async () => {
        if (!restaurant.trim() && !date.trim()) {
            Alert.alert('알림', '식당명이나 날짜를 먼저 입력해주세요.');
            return;
        }

        try {
            setIsLoadingSuggestions(true);
            const response = await fetch(`${RENDER_SERVER_URL}/ai/suggest-party-titles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    restaurant: restaurant.trim(),
                    date: date.trim(),
                    time: time.trim(),
                    location: location.trim()
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('서버에서 JSON 응답을 받지 못했습니다.');
            }
            
            const data = await response.json();
            setSuggestedTitles(data.suggestions || []);
        } catch (error) {
            console.error('AI 제목 제안 오류:', error);
            Alert.alert('오류', 'AI 제목 제안 기능을 사용할 수 없습니다. 나중에 다시 시도해주세요.');
        } finally {
            setIsLoadingSuggestions(false);
        }
    };

    const handleTitleSuggestion = (suggestion) => {
        setTitle(suggestion);
        setSuggestedTitles([]); // 제안 목록 닫기
    };

    const handleDateSelect = (selectedDate) => {
        // 날짜를 YYYY.M.D.(요일) 형식으로 표시
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth() + 1;
        const day = selectedDate.getDate();
        const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][selectedDate.getDay()];
        
        const dateText = `${year}.${month}.${day}.(${dayOfWeek})`;
        
        setDate(dateText);
        setSelectedDate(selectedDate);
        setDateModalVisible(false);
    };

    const handleUpdate = async () => {
        if (!title.trim() || !restaurant.trim() || !date.trim() || !time.trim()) {
            Alert.alert('입력 오류', '파티 제목, 식당, 날짜, 시간을 모두 입력해주세요.');
            return;
        }

        // 날짜 텍스트를 실제 날짜로 변환
        let actualDate = '';
        if (date && date.includes('.')) {
            // YYYY.M.D.(요일) 형식에서 날짜 추출
            const match = date.match(/(\d+)\.(\d+)\.(\d+)\./);
            if (match) {
                const year = parseInt(match[1]);
                const month = parseInt(match[2]);
                const day = parseInt(match[3]);
                const dateObj = new Date(year, month - 1, day);
                actualDate = toLocalDateString(dateObj);
            } else {
                actualDate = toLocalDateString(selectedDate);
            }
        } else {
            actualDate = toLocalDateString(selectedDate);
        }

        try {
            const response = await fetch(`${RENDER_SERVER_URL}/parties/${partyData.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employee_id: myEmployeeId,
                    title: title.trim(),
                    restaurant_name: restaurant.trim(),
                    party_date: actualDate,
                    party_time: time.trim(),
                    meeting_location: location.trim(),
                    max_members: maxMembers,
                    description: description.trim()
                })
            });
            const data = await response.json();
            if (response.ok) {
                Alert.alert('성공', '파티 정보가 수정되었습니다.');
                navigation.goBack();
            } else {
                Alert.alert('오류', data.message || '파티 수정에 실패했습니다.');
            }
        } catch (error) {
            Alert.alert('오류', '네트워크 요청 중 문제가 발생했습니다.');
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.formContainer}>
                <Text style={styles.inputLabel}>파티 제목 *</Text>
                <View style={styles.titleInputContainer}>
                    <TextInput 
                        style={[styles.input, { flex: 1 }]} 
                        placeholder="파티 제목을 입력하세요" 
                        value={title} 
                        onChangeText={setTitle} 
                    />
                    <TouchableOpacity
                        style={styles.aiSuggestButton}
                        onPress={generateTitleSuggestions}
                        disabled={isLoadingSuggestions}
                    >
                        <Ionicons 
                            name="sparkles" 
                            size={20} 
                            color={isLoadingSuggestions ? currentColors.gray : currentColors.primary} 
                        />
                    </TouchableOpacity>
                </View>

                {/* AI 제안 제목 목록 */}
                {suggestedTitles.length > 0 && (
                    <SuggestionsList
                        suggestions={suggestedTitles}
                        onSelect={handleTitleSuggestion}
                        visible={suggestedTitles.length > 0}
                        onRefresh={generateTitleSuggestions}
                    />
                )}

                <Text style={styles.inputLabel}>식당 *</Text>
                <View style={styles.restaurantInputContainer}>
                    <TouchableOpacity 
                        style={styles.restaurantInput} 
                        onPress={() => setShowRestaurantModal(true)}
                    >
                        <Text style={restaurant ? styles.inputText : styles.placeholderText}>
                            {restaurant || '식당을 선택하거나 입력하세요'}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color={currentColors.gray} />
                    </TouchableOpacity>
                </View>
                
                <Text style={styles.inputLabel}>날짜 *</Text>
                <TouchableOpacity style={styles.input} onPress={() => setDateModalVisible(true)}>
                    <Text style={date ? styles.inputText : styles.placeholderText}>
                        {date || '날짜를 선택하세요'}
                    </Text>
                </TouchableOpacity>
                
                <Text style={styles.inputLabel}>시간 *</Text>
                <TouchableOpacity style={styles.input} onPress={() => setTimeModalVisible(true)}>
                    <Text style={time ? styles.inputText : styles.placeholderText}>
                        {time || '시간을 선택하세요'}
                    </Text>
                </TouchableOpacity>
                
                <Text style={styles.inputLabel}>장소 (선택)</Text>
                <TextInput style={styles.input} placeholder="예: 판교역 2번 출구" value={location} onChangeText={setLocation} />
                
                <Text style={styles.inputLabel}>최대 인원 *</Text>
                <TouchableOpacity style={styles.input} onPress={() => setMaxMembersModalVisible(true)}>
                    <Text style={styles.inputText}>{maxMembers}명</Text>
                </TouchableOpacity>
                
                <Text style={styles.inputLabel}>설명 (선택)</Text>
                <TextInput 
                    style={[styles.input, { height: 100, textAlignVertical: 'top' }]} 
                    placeholder="파티에 대한 설명을 입력하세요" 
                    value={description} 
                    onChangeText={setDescription} 
                    multiline 
                />
                
                <TouchableOpacity style={styles.submitButton} onPress={handleUpdate}>
                    <Text style={[styles.submitButtonText, {color: currentColors.white}]}>수정하기</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={[styles.submitButton, { backgroundColor: currentColors.gray, marginTop: 10 }]} onPress={() => navigation.goBack()}>
                    <Text style={[styles.submitButtonText, {color: currentColors.white}]}>취소하기</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* 날짜 선택 모달 - 작은 캘린더 */}
            <Modal
                visible={isDateModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setDateModalVisible(false)}
            >
                    <View style={styles.centeredView}>
                        <View style={[styles.modalView, { width: 350, height: 450, maxWidth: '90%', maxHeight: '80%' }]}> 
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>날짜 선택</Text>
                                <TouchableOpacity onPress={() => setDateModalVisible(false)}>
                                    <Ionicons name="close" size={24} color={currentColors.gray} />
                                </TouchableOpacity>
                            </View>
                            <Calendar
                                current={selectedDate instanceof Date && !isNaN(selectedDate) ? selectedDate : new Date()}
  onDayPress={(day) => handleDateSelect(new Date(day.timestamp))}
  markedDates={{
    [toLocalDateString(selectedDate instanceof Date && !isNaN(selectedDate) ? selectedDate : new Date())]: {
      selected: true,
      selectedColor: currentColors.primary
    }
                            }}
                            theme={{
                                selectedDayBackgroundColor: currentColors.primary,
                                selectedDayTextColor: currentColors.white,
                                todayTextColor: currentColors.primary,
                                dayTextColor: currentColors.text,
                                textDisabledColor: currentColors.gray,
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
                            />
                        </View>
                    </View>
                </Modal>

            {/* 시간 선택 모달 */}
            {isTimeModalVisible && (
                <Modal transparent={true} animationType="slide">
                    <View style={styles.centeredView}>
                        <View style={styles.modalView}>
                            <Text style={styles.modalTitle}>만날 시간 선택</Text>
                            <DateTimePicker
                                value={time ? new Date(`2000-01-01T${time}:00`) : new Date(`2000-01-01T12:00:00`)}
                                mode="time"
                                display="spinner"
                                onChange={(event, selectedTime) => {
                                    if (selectedTime) {
                                        const hours = selectedTime.getHours().toString().padStart(2, '0');
                                        const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
                                        setTime(`${hours}:${minutes}`);
                                    }
                                }}
                                textColor={currentColors.text}
                                accentColor={currentColors.primary}
                            />
                            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                                <TouchableOpacity
                                    style={[basicStyles.button, { backgroundColor: currentColors.lightGray, flex: 1, marginTop: 0 }]}
                                    onPress={() => setTimeModalVisible(false)}
                                >
                                    <Text style={basicStyles.textStyleBlack}>취소</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[basicStyles.button, { backgroundColor: currentColors.primary, flex: 1, marginTop: 0 }]}
                                    onPress={() => setTimeModalVisible(false)}
                                >
                                    <Text style={[basicStyles.textStyle, { color: 'white' }]}>확인</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            )}

            {/* 최대 인원 선택 모달 */}
            <Modal
                visible={isMaxMembersModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setMaxMembersModalVisible(false)}
            >
                <View style={styles.centeredView}>
                    <View style={[styles.modalView, { width: 300, height: 400 }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>최대 인원 선택</Text>
                            <TouchableOpacity onPress={() => setMaxMembersModalVisible(false)}>
                                <Ionicons name="close" size={24} color={currentColors.gray} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.maxMembersOptionsContainer}>
                            {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((memberCount) => (
                                <TouchableOpacity
                                    key={memberCount}
                                    style={[
                                        styles.maxMembersOption,
                                        maxMembers === memberCount && styles.selectedMaxMembersOption
                                    ]}
                                    onPress={() => {
                                        setMaxMembers(memberCount);
                                        setMaxMembersModalVisible(false);
                                    }}
                                >
                                    <Text style={[
                                        styles.maxMembersOptionText,
                                        maxMembers === memberCount && styles.selectedMaxMembersOptionText
                                    ]}>
                                        {memberCount}명
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: global.currentColors?.background || COLORS.light.background },
    formContainer: { padding: 20, paddingBottom: 40 },
    inputLabel: { fontSize: 16, fontWeight: '600', marginBottom: 8, color: global.currentColors?.text || COLORS.light.text },
    input: { 
        borderWidth: 1, 
        borderColor: global.currentColors?.lightGray || COLORS.light.lightGray, 
        borderRadius: 12, 
        padding: 16, 
        fontSize: 16, 
        backgroundColor: global.currentColors?.surface || COLORS.light.surface,
        color: global.currentColors?.text || COLORS.light.text 
    },
    titleInputContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    aiSuggestButton: { padding: 12, borderRadius: 12, backgroundColor: global.currentColors?.primaryLight || COLORS.light.primaryLight },
    suggestionsContainer: { marginTop: 12, padding: 16, backgroundColor: global.currentColors?.surface || COLORS.light.surface, borderRadius: 12, borderWidth: 1, borderColor: global.currentColors?.border || COLORS.light.border },
    suggestionsTitle: { fontSize: 14, fontWeight: '600', marginBottom: 12, color: global.currentColors?.text || COLORS.light.text },
    suggestionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: global.currentColors?.border || COLORS.light.border },
    suggestionText: { fontSize: 14, color: global.currentColors?.text || COLORS.light.text },
    restaurantInputContainer: { marginBottom: 16 },
    restaurantInput: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        borderWidth: 1, 
        borderColor: global.currentColors?.lightGray || COLORS.light.lightGray, 
        borderRadius: 12, 
        padding: 16, 
        backgroundColor: global.currentColors?.surface || COLORS.light.surface 
    },
    inputText: { color: global.currentColors?.text || COLORS.light.text, fontSize: 16 },
    placeholderText: { color: global.currentColors?.textSecondary || COLORS.light.textSecondary, fontSize: 16 },
    submitButton: { 
        backgroundColor: global.currentColors?.primary || COLORS.light.primary, 
        padding: 16, 
        borderRadius: 16, 
        alignItems: 'center', 
        marginTop: 12,
        shadowColor: global.currentColors?.primary || COLORS.light.primary,
        shadowOffset: { width: 0, height: 4 }, 
        shadowOpacity: 0.3, 
        shadowRadius: 8
    },
    submitButtonText: { color: global.currentColors?.surface || COLORS.light.surface, fontWeight: 'bold', fontSize: 16 },
    centeredView: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
    modalView: { 
        margin: 20, 
        backgroundColor: 'white', 
        borderRadius: 24, 
        padding: 30, 
        alignItems: 'center', 
        width: '90%', 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 8 }, 
        shadowOpacity: 0.3, 
        shadowRadius: 12, 
        elevation: 8 
    },
    modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 0, textAlign: 'left', color: global.currentColors?.primary || COLORS.light.primary, letterSpacing: 0.5 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 15, paddingHorizontal: 5 },
    maxMembersOptionsContainer: { flex: 1 },
    maxMembersOption: { padding: 16, borderBottomWidth: 1, borderBottomColor: global.currentColors?.border || COLORS.light.border },
    selectedMaxMembersOption: { backgroundColor: global.currentColors?.primaryLight || COLORS.light.primaryLight },
    maxMembersOptionText: { fontSize: 16, color: global.currentColors?.text || COLORS.light.text },
    selectedMaxMembersOptionText: { color: global.currentColors?.primary || COLORS.light.primary, fontWeight: 'bold' }
});
