import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Modal,
    Alert,
    SafeAreaView,
    StyleSheet,
    Switch,
    FlatList,
    Keyboard,
    PanResponder,
    Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import DateTimePicker from '@react-native-community/datetimepicker';

// 공통 요소들 import
import { COLORS } from '../../../utils/colors';
import { unifiedApiClient } from '../services/UnifiedApiClient';
import FormComponents, {
    FormSection,
    FormInput,
    FormSelect,
    FormButton,
    AISuggestionButton,
    SuggestionsList,
    DatePickerModal,
    TimePickerModal,
    CategorySelector,
    EndDateSelectionModal
} from '../../../components/common/FormComponents';
import createFormStyles from '../../../components/common/FormStyles';
import { generateAITitles, addRandomEmojis } from '../../../utils/AITitleGenerator';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function CreateDangolPartyScreen({ navigation, route }) {
    const { date, title: initialTitle, restaurant: initialRestaurant, selectedDate: initialSelectedDate, time: initialTime, location: initialLocation, selectedAttendees: initialSelectedAttendees, description: initialDescription, showAttendeesModal: initialShowAttendeesModal } = route.params || {};
    
    const currentColors = global.currentColors || COLORS.light;
    const myEmployeeId = global.currentUser?.employee_id || '1';
    const styles = createFormStyles(currentColors);
    
    // 상태 변수들 (일반파티와 동일한 구조)
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
        // 기본값: 오늘 날짜
        return new Date();
    });
    const [time, setTime] = useState(initialTime || '12:00');
    const [location, setLocation] = useState(initialLocation || '');
    const [selectedAttendees, setSelectedAttendees] = useState(initialSelectedAttendees || []);
    const [description, setDescription] = useState(initialDescription || '');
    const [isDateModalVisible, setDateModalVisible] = useState(false);
    const [isTimeModalVisible, setTimeModalVisible] = useState(false);
    const [showAttendeesModal, setShowAttendeesModal] = useState(initialShowAttendeesModal || false);
    const [suggestedTitles, setSuggestedTitles] = useState([]);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    // 단골파티 전용 상태 변수들
    const [frequency, setFrequency] = useState('weekly'); // weekly, biweekly, monthly
    const [dayOfWeek, setDayOfWeek] = useState(1); // 1=월요일, 7=일요일
    const [maxMembers, setMaxMembers] = useState(10);
    const [isPublic, setIsPublic] = useState(true);
    const [allowInvites, setAllowInvites] = useState(true);
    const [autoAccept, setAutoAccept] = useState(false);
    const [isRecurring, setIsRecurring] = useState(true);
    const [endDate, setEndDate] = useState(null);
    
    // 카테고리 옵션
    const CATEGORY_OPTIONS = [
        '한식', '중식', '일식', '양식', '분식', '카페', '아시안', '퓨전', '기타'
    ];

    // AI 제목 생성 함수
    const generateTitleSuggestions = async () => {
        if (!restaurant && !description) {
            Alert.alert('알림', '식당이나 설명을 먼저 입력해주세요.');
            return;
        }
        
        setIsLoadingSuggestions(true);
        try {
            const suggestions = await generateAITitles({
                restaurant: restaurant,
                description: description,
                type: 'dangol_party'
            });
            setSuggestedTitles(suggestions);
        } catch (error) {
            console.error('제목 생성 오류:', error);
            Alert.alert('오류', '제목 생성 중 문제가 발생했습니다.');
        } finally {
            setIsLoadingSuggestions(false);
        }
    };

    // 단골파티 생성 핸들러
    const handleCreate = async () => {
        if (!title.trim()) {
            Alert.alert('입력 오류', '단골파티 제목을 입력해주세요.');
            return;
        }

        setIsLoading(true);
        try {
            const response = await unifiedApiClient.get(/dangolpots, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: title.trim(),
                    restaurant: restaurant.trim(),
                    description: description.trim(),
                    party_date: selectedDate.toISOString().split('T')[0],
                    party_time: time,
                    location: location.trim(),
                    max_members: maxMembers,
                    frequency: frequency,
                    day_of_week: dayOfWeek,
                    is_recurring: isRecurring,
                    end_date: endDate ? endDate.toISOString().split('T')[0] : null,
                    is_public: isPublic,
                    allow_invites: allowInvites,
                    auto_accept: autoAccept,
                    host_id: myEmployeeId,
                    attendees: selectedAttendees.map(attendee => attendee.employee_id)
                })
            });

            if (response.ok) {
                Alert.alert('성공', '단골파티가 생성되었습니다!');
                navigation.goBack();
            } else {
                const errorData = await response.json();
                Alert.alert('오류', errorData.message || '단골파티 생성에 실패했습니다.');
            }
        } catch (error) {
            console.error('단골파티 생성 오류:', error);
            Alert.alert('오류', '네트워크 오류가 발생했습니다. 다시 시도해주세요.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.formContainer}>
                {/* 제목 입력 */}
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: currentColors.surface,
                    borderWidth: 2,
                    borderColor: currentColors.border,
                    borderRadius: 16,
                    minHeight: 56,
                    marginBottom: 12,
                }}>
                    <TextInput
                        style={{
                            backgroundColor: 'transparent',
                            borderWidth: 0,
                            flex: 1,
                            padding: 16,
                            fontSize: 16,
                            color: currentColors.text,
                            minHeight: 56,
                            paddingRight: 8
                        }}
                        value={title || ''}
                        onChangeText={(text) => setTitle(text ? String(text).trim() : '')}
                        placeholder="제목: AI 추천 제목을 확인해 보세요"
                        placeholderTextColor={currentColors.textSecondary}
                        returnKeyType="done"
                        onSubmitEditing={() => Keyboard.dismiss()}
                        blurOnSubmit={true}
                    />
                    <AISuggestionButton
                        onPress={generateTitleSuggestions}
                        isLoading={isLoadingSuggestions}
                    />
                </View>

                {/* AI 제안 제목 목록 */}
                {suggestedTitles && suggestedTitles.length > 0 && (
                    <View style={{ marginBottom: 12, marginTop: -10 }}>
                        <SuggestionsList
                            suggestions={suggestedTitles}
                            onSelect={(suggestion) => {
                                setTitle(suggestion);
                                setSuggestedTitles([]);
                            }}
                            onClose={() => setSuggestedTitles([])}
                        />
                    </View>
                )}

                {/* 식당 입력 */}
                <TouchableOpacity 
                    style={{
                        backgroundColor: currentColors.surface,
                        borderWidth: 2,
                        borderColor: currentColors.border,
                        borderRadius: 16,
                        minHeight: 56,
                        marginBottom: 12,
                        paddingHorizontal: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}
                    onPress={() => {/* 식당 선택 모달 열기 */}}
                >
                    <Text style={{
                        color: restaurant ? currentColors.text : currentColors.textSecondary,
                        fontSize: 16,
                        flex: 1
                    }}>
                        {restaurant || '식당을 선택하세요'}
                    </Text>
                    <Ionicons name="restaurant-outline" size={20} color={currentColors.textSecondary} />
                </TouchableOpacity>

                {/* 날짜 선택 */}
                <TouchableOpacity 
                    style={{
                        backgroundColor: currentColors.surface,
                        borderWidth: 2,
                        borderColor: currentColors.border,
                        borderRadius: 16,
                        minHeight: 56,
                        marginBottom: 12,
                        paddingHorizontal: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}
                    onPress={() => setDateModalVisible(true)}
                >
                    <View style={{ flex: 1 }}>
                        <Text style={{
                            color: currentColors.text,
                            fontSize: 16
                        }}>
                            {selectedDate.toLocaleDateString('ko-KR', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric',
                                weekday: 'long'
                            })}
                        </Text>
                        {/* 반복 일정 정보를 날짜 바로 아래에 표시 */}
                        {isRecurring && (
                            <Text style={{
                                color: currentColors.primary,
                                fontSize: 12,
                                marginTop: 2
                            }}>
                                매주 반복 • {frequency === 'weekly' ? '주간' : frequency === 'biweekly' ? '격주' : '월간'}
                            </Text>
                        )}
                    </View>
                    <Ionicons name="calendar-outline" size={20} color={currentColors.textSecondary} />
                </TouchableOpacity>

                {/* 시간 선택 */}
                <TouchableOpacity 
                    style={{
                        backgroundColor: currentColors.surface,
                        borderWidth: 2,
                        borderColor: currentColors.border,
                        borderRadius: 16,
                        minHeight: 56,
                        marginBottom: 12,
                        paddingHorizontal: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}
                    onPress={() => setTimeModalVisible(true)}
                >
                    <Text style={{
                        color: currentColors.text,
                        fontSize: 16
                    }}>
                        {time}
                    </Text>
                    <Ionicons name="time-outline" size={20} color={currentColors.textSecondary} />
                </TouchableOpacity>

                {/* 장소 입력 */}
                <View style={{ marginBottom: 12 }}>
                    <TextInput
                        style={{
                            backgroundColor: currentColors.surface,
                            borderWidth: 2,
                            borderColor: currentColors.border,
                            borderRadius: 16,
                            minHeight: 56,
                            paddingHorizontal: 16,
                            fontSize: 16,
                            color: currentColors.text
                        }}
                        value={location}
                        onChangeText={setLocation}
                        placeholder="만나는 장소를 입력하세요"
                        placeholderTextColor={currentColors.textSecondary}
                        returnKeyType="done"
                        onSubmitEditing={() => Keyboard.dismiss()}
                        blurOnSubmit={true}
                    />
                </View>

                {/* 파티 인원 선택 */}
                <View style={{ marginBottom: 12 }}>
                    <TouchableOpacity 
                        style={{
                            backgroundColor: currentColors.surface,
                            borderWidth: 2,
                            borderColor: currentColors.border,
                            borderRadius: 16,
                            minHeight: 56,
                            paddingHorizontal: 16,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}
                        onPress={() => {/* 인원 선택 모달 열기 */}}
                    >
                        <Text style={{
                            color: currentColors.text,
                            fontSize: 16
                        }}>
                            최대 {maxMembers}명
                        </Text>
                        <Ionicons name="people-outline" size={20} color={currentColors.textSecondary} />
                    </TouchableOpacity>
                </View>

                {/* 단골파티 전용 설정 */}
                <View style={{
                    backgroundColor: currentColors.surface,
                    borderWidth: 2,
                    borderColor: currentColors.border,
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 12
                }}>
                    <Text style={{
                        color: currentColors.text,
                        fontSize: 16,
                        fontWeight: '600',
                        marginBottom: 16
                    }}>
                        단골파티 설정
                    </Text>
                    
                    <View style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 12
                    }}>
                        <Text style={{ color: currentColors.text, fontSize: 14 }}>반복 일정</Text>
                        <Switch
                            value={isRecurring}
                            onValueChange={setIsRecurring}
                            trackColor={{ false: currentColors.border, true: currentColors.primary }}
                            thumbColor={currentColors.surface}
                        />
                    </View>
                    
                    <View style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 12
                    }}>
                        <Text style={{ color: currentColors.text, fontSize: 14 }}>공개 단골파티</Text>
                        <Switch
                            value={isPublic}
                            onValueChange={setIsPublic}
                            trackColor={{ false: currentColors.border, true: currentColors.primary }}
                            thumbColor={currentColors.surface}
                        />
                    </View>
                    
                    <View style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 12
                    }}>
                        <Text style={{ color: currentColors.text, fontSize: 14 }}>초대 허용</Text>
                        <Switch
                            value={allowInvites}
                            onValueChange={setAllowInvites}
                            trackColor={{ false: currentColors.border, true: currentColors.primary }}
                            thumbColor={currentColors.surface}
                        />
                    </View>
                    
                    <View style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <Text style={{ color: currentColors.text, fontSize: 14 }}>자동 승인</Text>
                        <Switch
                            value={autoAccept}
                            onValueChange={setAutoAccept}
                            trackColor={{ false: currentColors.border, true: currentColors.primary }}
                            thumbColor={currentColors.surface}
                        />
                    </View>
                </View>

                {/* 설명 입력 */}
                <View style={{
                    backgroundColor: currentColors.surface,
                    borderWidth: 2,
                    borderColor: currentColors.border,
                    borderRadius: 16,
                    minHeight: 100,
                    marginBottom: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12
                }}>
                    <TextInput
                        style={{
                            backgroundColor: 'transparent',
                            borderWidth: 0,
                            flex: 1,
                            fontSize: 16,
                            color: currentColors.text,
                            textAlignVertical: 'top',
                            minHeight: 76
                        }}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="단골파티에 대한 설명을 입력하세요"
                        placeholderTextColor={currentColors.textSecondary}
                        multiline={true}
                        numberOfLines={4}
                        returnKeyType="done"
                        onSubmitEditing={() => Keyboard.dismiss()}
                        blurOnSubmit={true}
                    />
                </View>

                {/* 버튼들 */}
                <View style={styles.buttonContainer}>
                    <FormButton
                        title="단골파티 만들기"
                        onPress={handleCreate}
                        variant="primary"
                        icon="people"
                        loading={isLoading}
                    />
                    <FormButton
                        title="취소"
                        onPress={() => navigation.goBack()}
                        variant="outline"
                    />
                </View>
            </ScrollView>

            {/* 날짜 선택 모달 */}
            <DatePickerModal
                visible={isDateModalVisible}
                onClose={() => setDateModalVisible(false)}
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
                isRecurring={isRecurring}
                onRecurringChange={setIsRecurring}
                frequency={frequency}
                onFrequencyChange={setFrequency}
                dayOfWeek={dayOfWeek}
                onDayOfWeekChange={setDayOfWeek}
                endDate={endDate}
                onEndDateChange={setEndDate}
            />

            {/* 시간 선택 모달 */}
            <TimePickerModal
                visible={isTimeModalVisible}
                onClose={() => setTimeModalVisible(false)}
                selectedTime={time}
                onTimeSelect={setTime}
            />
        </SafeAreaView>
    );
}
