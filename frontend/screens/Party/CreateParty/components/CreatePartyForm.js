import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../../../../components/common/Colors';
import { toKoreanDateString } from '../../../../components/common/Utils';

const CreatePartyForm = ({
    title,
    setTitle,
    restaurant,
    setRestaurant,
    selectedDate,
    setSelectedDate,
    time,
    setTime,
    location,
    setLocation,
    selectedAttendees,
    setSelectedAttendees,
    description,
    setDescription,
    onShowDateModal,
    onShowTimeModal,
    onShowRestaurantModal,
    onShowAttendeesModal,
    currentColors = COLORS.light
}) => {
    const [suggestedTitles, setSuggestedTitles] = useState([]);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

    // AI 제목 제안
    const generateTitleSuggestions = async () => {
        if (!restaurant.trim()) return;
        
        try {
            setIsLoadingSuggestions(true);
            // AI 제목 생성 로직 (실제 구현 필요)
            const suggestions = [
                `${restaurant}에서 점심 같이 먹어요!`,
                `${restaurant} 맛집 탐방`,
                `${restaurant}에서 즐거운 점심`,
                `${restaurant} 맛있는 점심 약속`
            ];
            setSuggestedTitles(suggestions);
        } catch (error) {
            console.error('제목 제안 생성 실패:', error);
        } finally {
            setIsLoadingSuggestions(false);
        }
    };

    useEffect(() => {
        if (restaurant.trim()) {
            generateTitleSuggestions();
        } else {
            setSuggestedTitles([]);
        }
    }, [restaurant]);

    const handleTitleSuggestion = (suggestion) => {
        setTitle(suggestion);
        setSuggestedTitles([]);
    };

    const removeAttendee = (attendeeToRemove) => {
        setSelectedAttendees(prev => 
            prev.filter(attendee => attendee.employee_id !== attendeeToRemove.employee_id)
        );
    };

    return (
        <View style={styles.container}>
            {/* 파티 제목 */}
            <View style={styles.section}>
                <Text style={[styles.label, { color: currentColors.text }]}>
                    파티 제목 *
                </Text>
                <TextInput
                    style={[styles.input, { 
                        backgroundColor: currentColors.surface, 
                        borderColor: currentColors.border,
                        color: currentColors.text 
                    }]}
                    placeholder="파티 제목을 입력하세요"
                    placeholderTextColor={currentColors.textSecondary}
                    value={title}
                    onChangeText={setTitle}
                    maxLength={50}
                />
                
                {/* AI 제목 제안 */}
                {suggestedTitles.length > 0 && (
                    <View style={styles.suggestionsContainer}>
                        <Text style={[styles.suggestionsTitle, { color: currentColors.textSecondary }]}>
                            AI 제안 제목:
                        </Text>
                        {suggestedTitles.map((suggestion, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[styles.suggestionItem, { backgroundColor: currentColors.surface, borderColor: currentColors.border }]}
                                onPress={() => handleTitleSuggestion(suggestion)}
                            >
                                <Text style={[styles.suggestionText, { color: currentColors.text }]}>
                                    {suggestion}
                                </Text>
                                <Ionicons name="arrow-up" size={16} color={currentColors.primary} />
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>

            {/* 식당 선택 */}
            <View style={styles.section}>
                <Text style={[styles.label, { color: currentColors.text }]}>
                    식당 *
                </Text>
                <TouchableOpacity
                    style={[styles.input, styles.selectInput, { 
                        backgroundColor: currentColors.surface, 
                        borderColor: currentColors.border 
                    }]}
                    onPress={onShowRestaurantModal}
                >
                    <Text style={[styles.selectText, { color: restaurant ? currentColors.text : currentColors.textSecondary }]}>
                        {restaurant || '식당을 선택하세요'}
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color={currentColors.textSecondary} />
                </TouchableOpacity>
            </View>

            {/* 날짜 선택 */}
            <View style={styles.section}>
                <Text style={[styles.label, { color: currentColors.text }]}>
                    날짜 *
                </Text>
                <TouchableOpacity
                    style={[styles.input, styles.selectInput, { 
                        backgroundColor: currentColors.surface, 
                        borderColor: currentColors.border 
                    }]}
                    onPress={onShowDateModal}
                >
                    <Text style={[styles.selectText, { color: currentColors.text }]}>
                        {toKoreanDateString(selectedDate)}
                    </Text>
                    <Ionicons name="calendar-outline" size={20} color={currentColors.primary} />
                </TouchableOpacity>
            </View>

            {/* 시간 선택 */}
            <View style={styles.section}>
                <Text style={[styles.label, { color: currentColors.text }]}>
                    시간 *
                </Text>
                <TouchableOpacity
                    style={[styles.input, styles.selectInput, { 
                        backgroundColor: currentColors.surface, 
                        borderColor: currentColors.border 
                    }]}
                    onPress={onShowTimeModal}
                >
                    <Text style={[styles.selectText, { color: currentColors.text }]}>
                        {time}
                    </Text>
                    <Ionicons name="time-outline" size={20} color={currentColors.primary} />
                </TouchableOpacity>
            </View>

            {/* 만남 장소 */}
            <View style={styles.section}>
                <Text style={[styles.label, { color: currentColors.text }]}>
                    만남 장소
                </Text>
                <TextInput
                    style={[styles.input, { 
                        backgroundColor: currentColors.surface, 
                        borderColor: currentColors.border,
                        color: currentColors.text 
                    }]}
                    placeholder="만남 장소를 입력하세요 (선택사항)"
                    placeholderTextColor={currentColors.textSecondary}
                    value={location}
                    onChangeText={setLocation}
                    maxLength={100}
                />
            </View>

            {/* 참석자 선택 */}
            <View style={styles.section}>
                <Text style={[styles.label, { color: currentColors.text }]}>
                    참석자 ({selectedAttendees.length}명)
                </Text>
                <TouchableOpacity
                    style={[styles.input, styles.selectInput, { 
                        backgroundColor: currentColors.surface, 
                        borderColor: currentColors.border 
                    }]}
                    onPress={onShowAttendeesModal}
                >
                    <Text style={[styles.selectText, { color: currentColors.text }]}>
                        {selectedAttendees.length > 0 
                            ? `${selectedAttendees.length}명 선택됨` 
                            : '참석자를 선택하세요'
                        }
                    </Text>
                    <Ionicons name="people-outline" size={20} color={currentColors.primary} />
                </TouchableOpacity>
                
                {/* 선택된 참석자 목록 */}
                {selectedAttendees.length > 0 && (
                    <View style={styles.attendeesList}>
                        {selectedAttendees.map((attendee) => (
                            <View key={attendee.employee_id} style={[styles.attendeeItem, { backgroundColor: currentColors.surface, borderColor: currentColors.border }]}>
                                <View style={[styles.attendeeAvatar, { backgroundColor: currentColors.primary }]}>
                                    <Text style={[styles.attendeeAvatarText, { color: '#fff' }]}>
                                        {attendee.nickname ? attendee.nickname.charAt(0) : '?'}
                                    </Text>
                                </View>
                                <Text style={[styles.attendeeName, { color: currentColors.text }]}>
                                    {attendee.nickname || '알 수 없음'}
                                </Text>
                                <TouchableOpacity
                                    onPress={() => removeAttendee(attendee)}
                                    style={styles.removeButton}
                                >
                                    <Ionicons name="close-circle" size={20} color={currentColors.error} />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}
            </View>

            {/* 설명 */}
            <View style={styles.section}>
                <Text style={[styles.label, { color: currentColors.text }]}>
                    설명
                </Text>
                <TextInput
                    style={[styles.textArea, { 
                        backgroundColor: currentColors.surface, 
                        borderColor: currentColors.border,
                        color: currentColors.text 
                    }]}
                    placeholder="파티에 대한 설명을 입력하세요 (선택사항)"
                    placeholderTextColor={currentColors.textSecondary}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={4}
                    maxLength={200}
                />
                <Text style={[styles.characterCount, { color: currentColors.textSecondary }]}>
                    {description.length}/200
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
    },
    section: {
        marginBottom: 24,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 16,
    },
    selectInput: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    selectText: {
        fontSize: 16,
        flex: 1,
    },
    textArea: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 16,
        textAlignVertical: 'top',
        minHeight: 100,
    },
    characterCount: {
        fontSize: 12,
        textAlign: 'right',
        marginTop: 4,
    },
    suggestionsContainer: {
        marginTop: 8,
    },
    suggestionsTitle: {
        fontSize: 14,
        marginBottom: 8,
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
        borderWidth: 1,
        marginBottom: 4,
    },
    suggestionText: {
        fontSize: 14,
        flex: 1,
    },
    attendeesList: {
        marginTop: 8,
    },
    attendeeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
        borderWidth: 1,
        marginBottom: 4,
    },
    attendeeAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    attendeeAvatarText: {
        fontSize: 14,
        fontWeight: '600',
    },
    attendeeName: {
        fontSize: 14,
        flex: 1,
    },
    removeButton: {
        padding: 4,
    },
});

export default CreatePartyForm;
