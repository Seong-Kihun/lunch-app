import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Modal,
    ScrollView,
    FlatList,
    Switch,
    Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../contexts/ThemeContext';
import COLORS from './Colors';

// 공통 폼 컴포넌트들
const FormSection = ({ title, children, required = false, style, colors: propColors }) => {
    let themeColors = {};
    try {
        const theme = useTheme();
        themeColors = theme?.colors || {};
    } catch (error) {
        console.warn('🔍 [FormSection] ThemeContext 접근 실패, 기본 색상 사용:', error);
    }
    
    // props로 전달된 colors를 우선 사용, 없으면 theme에서 가져오기
    const colors = propColors || themeColors;
    
    // colors가 제대로 설정되지 않은 경우를 위한 안전한 fallback
    const safeColors = colors || {
        text: '#1E293B',
        surface: '#FFFFFF',
        lightGray: '#E2E8F0',
        textSecondary: '#64748B'
    };
    
    return (
        <View style={[{ marginBottom: 24 }, style]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: safeColors.text, marginLeft: 4 }}>{title}</Text>
                {required && <Text style={{ color: '#EF4444', fontSize: 16, fontWeight: 'bold', marginLeft: 4 }}>*</Text>}
            </View>
            {children}
        </View>
    );
};

const FormInput = ({ 
    label, 
    value, 
    onChangeText, 
    placeholder, 
    required = false,
    multiline = false,
    numberOfLines = 1,
    style,
    colors: propColors,
    ...props 
}) => {
    let themeColors = {};
    try {
        const theme = useTheme();
        themeColors = theme?.colors || {};
    } catch (error) {
        console.warn('ThemeContext 접근 실패, 기본 색상 사용:', error);
    }
    
    // props로 전달된 colors를 우선 사용, 없으면 theme에서 가져오기
    const colors = propColors || themeColors;
    // colors가 제대로 설정되지 않은 경우를 위한 안전한 fallback
    const safeColors = colors || {
        surface: '#FFFFFF',
        lightGray: '#E2E8F0',
        text: '#1E293B',
        textSecondary: '#64748B'
    };
    
    return (
        <FormSection title={label} required={required} colors={safeColors}>
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#FFFFFF', // 흰색으로 변경
                borderWidth: 2,
                borderColor: '#D1D5DB', // 더 진한 회색으로 변경
                borderRadius: 16,
                minHeight: 56,
            }}>
                <TextInput
                    style={[
                        {
                            backgroundColor: 'transparent',
                            borderWidth: 0,
                            flex: 1,
                            padding: 16,
                            fontSize: 16,
                            color: safeColors.text,
                            minHeight: 56,
                        },
                        multiline && {
                            minHeight: 100,
                            textAlignVertical: 'top',
                        },
                        style
                    ]}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={safeColors.textSecondary}
                    multiline={multiline}
                    numberOfLines={multiline ? numberOfLines : 1}
                    textAlignVertical={multiline ? 'top' : 'center'}
                    {...props}
                />
            </View>
        </FormSection>
    );
};

const FormSelect = ({ 
    label, 
    value, 
    onPress, 
    placeholder, 
    required = false,
    rightIcon = 'chevron-down',
    style,
    colors: propColors
}) => {
    let themeColors = {};
    try {
        const theme = useTheme();
        themeColors = theme?.colors || {};
    } catch (error) {
        console.warn('ThemeContext 접근 실패, 기본 색상 사용:', error);
    }
    
    // props로 전달된 colors를 우선 사용, 없으면 theme에서 가져오기
    const colors = propColors || themeColors;
    // colors가 제대로 설정되지 않은 경우를 위한 안전한 fallback
    const safeColors = colors || {
        surface: '#FFFFFF',
        lightGray: '#E2E8F0',
        text: '#1E293B',
        textSecondary: '#64748B'
    };
    
    return (
        <FormSection title={label} required={required} colors={safeColors}>
            <TouchableOpacity 
                style={[{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: '#FFFFFF', // 흰색으로 변경
                    borderWidth: 2,
                    borderColor: '#D1D5DB', // 더 진한 회색으로 변경
                    borderRadius: 16,
                    padding: 16,
                    minHeight: 56,
                }, style]}
                onPress={onPress}
                activeOpacity={0.7}
            >
                <Text style={value ? { color: safeColors.text, fontSize: 16 } : { color: safeColors.textSecondary, fontSize: 16 }}>
                    {value || placeholder}
                </Text>
                <Ionicons 
                    name={rightIcon} 
                    size={20} 
                    color={safeColors.textSecondary} 
                />
            </TouchableOpacity>
        </FormSection>
    );
};

const FormButton = ({ 
    title, 
    onPress, 
    variant = 'primary', 
    disabled = false,
    loading = false,
    icon,
    style 
}) => {
    let colors = {};
    try {
        const theme = useTheme();
        colors = theme?.colors || {};
    } catch (error) {
        console.warn('ThemeContext 접근 실패, 기본 색상 사용:', error);
        colors = {
            primary: '#3B82F6',
            text: '#FFFFFF',
            surface: '#FFFFFF',
            lightGray: '#E2E8F0'
        };
    }
    const buttonStyles = [
        styles.button,
        styles[`button${variant.charAt(0).toUpperCase() + variant.slice(1)}`],
        disabled && styles.buttonDisabled,
        style
    ];

    const textStyles = [
        styles.buttonText,
        styles[`buttonText${variant.charAt(0).toUpperCase() + variant.slice(1)}`],
        disabled && styles.buttonTextDisabled
    ];

    return (
        <TouchableOpacity
            style={buttonStyles}
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.8}
        >
            {loading ? (
                <View style={styles.loadingContainer}>
                    <Ionicons name="refresh" size={20} color="white" style={styles.spinning} />
                    <Text style={textStyles}>처리 중...</Text>
                </View>
            ) : (
                <View style={styles.buttonContent}>
                    {icon && <Ionicons name={icon} size={20} color="white" style={styles.buttonIcon} />}
                    <Text style={textStyles}>{title}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
};

const AISuggestionButton = ({ onPress, loading = false, disabled = false, colors: propColors }) => {
    let themeColors = {};
    try {
        const theme = useTheme();
        themeColors = theme?.colors || {};
    } catch (error) {
        console.warn('AISuggestionButton ThemeContext 접근 실패, 기본 색상 사용:', error);
    }
    
    // props로 전달된 colors를 우선 사용, 없으면 theme에서 가져오기
    const colors = propColors || themeColors;
    
    // colors가 제대로 설정되지 않은 경우를 위한 안전한 fallback
    const safeColors = colors || {
        lightGray: '#E2E8F0',
        primaryLight: 'rgba(59, 130, 246, 0.1)',
        primary: '#3B82F6'
    };
    
    // onPress 함수가 유효한지 확인
    const handlePress = () => {
        if (onPress && typeof onPress === 'function') {
            onPress();
        }
    };
    
    return (
        <TouchableOpacity
            style={{
                padding: 6,
                borderRadius: 10,
                backgroundColor: loading || disabled ? safeColors.lightGray : safeColors.primaryLight,
                borderWidth: 1,
                borderColor: loading || disabled ? safeColors.lightGray : safeColors.primary,
                marginRight: 16,
                width: 36,
                height: 36,
                justifyContent: 'center',
                alignItems: 'center',
            }}
            onPress={disabled ? undefined : handlePress}
            disabled={loading || disabled}
            activeOpacity={0.7}
        >
            {loading ? (
                <Ionicons 
                    name="refresh" 
                    size={18} 
                    color="#94A3B8" 
                />
            ) : (
                <Ionicons 
                    name="sparkles" 
                    size={18} 
                    color={disabled ? '#94A3B8' : '#3B82F6'} 
                />
            )}
        </TouchableOpacity>
    );
};

const SuggestionsList = ({ suggestions, onSelect, visible = false, onRefresh, colors: propColors }) => {
    let themeColors = {};
    try {
        const theme = useTheme();
        themeColors = theme?.colors || {};
    } catch (error) {
        console.warn('🔍 [SuggestionsList] ThemeContext 접근 실패, 기본 색상 사용:', error);
    }
    
    // props로 전달된 colors를 우선 사용, 없으면 theme에서 가져오기
    const colors = propColors || themeColors;
    
    // colors가 제대로 설정되지 않은 경우를 위한 안전한 fallback
    const safeColors = colors || {
        primary: '#3B82F6'
    };
        
        if (!visible || suggestions.length === 0) {
            return null;
        }

    return (
        <View style={styles.suggestionsContainer}>
            <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12
            }}>
                <Text style={styles.suggestionsTitle}>AI 제안</Text>
                {onRefresh && (
                                            <TouchableOpacity
                            style={{
                                backgroundColor: safeColors.primary,
                                borderRadius: 16,
                                padding: 6,
                                elevation: 2,
                                shadowColor: safeColors.primary,
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.2,
                                shadowRadius: 4,
                            }}
                            onPress={onRefresh}
                            activeOpacity={0.7}
                        >
                            <Ionicons 
                                name="refresh" 
                                size={14} 
                                color="white"
                            />
                        </TouchableOpacity>
                )}
            </View>
            <ScrollView 
                style={styles.suggestionsScrollView}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
            >
                {suggestions.map((item, index) => (
                    <TouchableOpacity
                        key={index.toString()}
                        style={styles.suggestionItem}
                        onPress={() => onSelect(item)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.suggestionText}>{item}</Text>
                        <Ionicons 
                            name="arrow-forward" 
                            size={16} 
                            color={safeColors.primary} 
                        />
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
        );
};

const DatePickerModal = ({ 
    visible, 
    onClose, 
    onDateSelect, 
    selectedDate, 
    minDate,
    maxDate,
    isRecurring = false,
    onRecurringChange = () => {},
    recurrenceType = 'weekly',
    onRecurrenceTypeChange = () => {},
    recurrenceInterval = 1,
    onRecurrenceIntervalChange = () => {},
    endDate,
    onEndDateChange = () => {},
    onEndDateSelect = () => {},
    onOpenEndDateModal = () => {},
    colors: propColors
}) => {
    const [tempSelectedDate, setTempSelectedDate] = useState(selectedDate);
    
    // 안전한 colors 처리
    let themeColors = {};
    try {
        const theme = useTheme();
        themeColors = theme?.colors || {};
    } catch (error) {
        console.warn('DatePickerModal ThemeContext 접근 실패, 기본 색상 사용:', error);
    }
    
    // props로 전달된 colors를 우선 사용, 없으면 theme에서 가져오기
    const colors = propColors || themeColors;
    
    // colors가 제대로 설정되지 않은 경우를 위한 안전한 fallback
    const safeColors = colors || {
        text: '#000000',
        primary: '#3B82F6',
        textSecondary: '#666666'
    };

    // selectedDate가 변경될 때마다 tempSelectedDate 업데이트
    useEffect(() => {
        if (selectedDate) {
            setTempSelectedDate(selectedDate);
        }
    }, [selectedDate]);

    // endDate나 반복 설정이 변경될 때마다 캘린더 업데이트
    useEffect(() => {
        // 캘린더가 자동으로 다시 렌더링되도록 강제 업데이트
        // 이 useEffect는 endDate, isRecurring, recurrenceType, recurrenceInterval이 변경될 때마다 실행됨
    }, [endDate, isRecurring, recurrenceType, recurrenceInterval]);

    // 캘린더에 표시할 마킹된 날짜들을 생성하는 함수
    const generateMarkedDates = () => {
        const markedDates = {};
        
        // 선택된 날짜 표시
        const selectedDateString = tempSelectedDate.toISOString().split('T')[0];
        markedDates[selectedDateString] = {
            selected: true,
            selectedColor: '#3B82F6',
        };
        
        // 반복 설정이 활성화된 경우 반복 일정 표시
        if (isRecurring) {
            const startDate = new Date(tempSelectedDate);
            let currentDate = new Date(startDate);
            
            // 🚨 중요: 무기한 반복을 위해 충분히 긴 기간 설정 (10년)
            // 종료일이 설정된 경우 해당 날짜까지만 표시
            const endDisplayDate = endDate ? new Date(endDate) : new Date(startDate.getFullYear() + 10, startDate.getMonth(), startDate.getDate());
            
            while (currentDate <= endDisplayDate) {
                const dateString = currentDate.toISOString().split('T')[0];
                
                // 선택된 날짜와 다른 경우에만 반복 일정으로 표시
                if (dateString !== selectedDateString) {
                    markedDates[dateString] = {
                        ...markedDates[dateString],
                        marked: true,
                        dotColor: '#3B82F6',
                    };
                }
                
                // 다음 반복 날짜 계산
                switch (recurrenceType) {
                    case 'daily':
                        currentDate.setDate(currentDate.getDate() + recurrenceInterval);
                        break;
                    case 'weekly':
                        currentDate.setDate(currentDate.getDate() + (7 * recurrenceInterval));
                        break;
                    case 'monthly':
                        currentDate.setMonth(currentDate.getMonth() + recurrenceInterval);
                        break;
                    case 'yearly':
                        currentDate.setFullYear(currentDate.getFullYear() + recurrenceInterval);
                        break;
                    default:
                        currentDate.setDate(currentDate.getDate() + 7);
                }
            }
        }
        
        return markedDates;
    };

    const handleConfirm = () => {
        onDateSelect(tempSelectedDate);
        onClose();
    };

    const handleDayPress = (day) => {
        setTempSelectedDate(new Date(day.timestamp));
    };



    return (
        <>
            <Modal
                visible={visible}
                transparent
                animationType="fade"
                onRequestClose={() => {
                    // 상태 초기화 후 모달 닫기
                    setTempSelectedDate(selectedDate);
                    onClose();
                }}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <ScrollView 
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 20 }}
                        >
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>날짜 선택</Text>
                                <TouchableOpacity onPress={() => onClose()} style={styles.closeButton}>
                                    <Ionicons name="close" size={24} color="#64748B" />
                                </TouchableOpacity>
                            </View>

                            <Calendar
                                current={tempSelectedDate}
                                onDayPress={handleDayPress}
                                markedDates={generateMarkedDates()}
                                minDate={minDate}
                                maxDate={maxDate}
                                                                 theme={{
                                     backgroundColor: '#FFFFFF',
                                     calendarBackground: '#FFFFFF',
                                     textSectionTitleColor: safeColors.text,
                                     selectedDayBackgroundColor: safeColors.primary,
                                     selectedDayTextColor: '#FFFFFF',
                                     todayTextColor: safeColors.primary,
                                     dayTextColor: safeColors.text,
                                     textDisabledColor: safeColors.textSecondary,
                                     dotColor: safeColors.primary,
                                     selectedDotColor: '#FFFFFF',
                                     arrowColor: safeColors.primary,
                                     monthTextColor: safeColors.text,
                                     indicatorColor: safeColors.primary,
                                    textDayFontWeight: '500',
                                    textMonthFontWeight: 'bold',
                                    textDayHeaderFontWeight: '600',
                                    textDayFontSize: 16,
                                    textMonthFontSize: 18,
                                    textDayHeaderFontSize: 14
                                }}
                            />
                            
                            {/* 반복 설정 섹션 추가 */}
                            <View style={styles.recurrenceSection}>
                                <View style={styles.recurrenceHeader}>
                                    <View style={styles.recurrenceTitleRow}>
                                        <Switch
                                            value={isRecurring}
                                            onValueChange={onRecurringChange}
                                            trackColor={{ 
                                                false: '#E2E8F0', 
                                                true: '#3B82F6' 
                                            }}
                                            thumbColor={'#FFFFFF'}
                                        />
                                        <Text style={styles.recurrenceTitle}>반복 설정</Text>
                                    </View>
                                    
                                    {/* 반복 종료 조건을 제목 오른쪽에 배치 */}
                                    {isRecurring && (
                                        <View style={styles.recurrenceEndOptions}>
                                            <TouchableOpacity
                                                style={[
                                                    styles.endOptionChip,
                                                    !endDate && styles.endOptionChipSelected,
                                                    { marginLeft: 10 } // 무기한 버튼을 살짝 오른쪽으로 이동
                                                ]}
                                                onPress={() => onEndDateChange(null)}
                                            >
                                                <Text style={[
                                                    styles.endOptionChipText,
                                                    !endDate && styles.endOptionChipTextSelected
                                                ]}>무기한</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[
                                                    styles.endOptionChip,
                                                    endDate && styles.endOptionChipSelected,
                                                    { marginLeft: -8 } // 특정 일자까지 버튼을 왼쪽으로 이동
                                                ]}
                                                onPress={() => {
                                                    // 날짜선택 팝업을 닫고, 그 다음에 종료일자 설정 팝업 열기
                                                    onClose(); // 날짜선택 팝업 닫기
                                                    // 약간의 지연 후 종료일자 설정 팝업 열기
                                                    setTimeout(() => {
                                                        onOpenEndDateModal();
                                                    }, 100);
                                                }}
                                            >
                                                <Text style={[
                                                    styles.endOptionChipText,
                                                    endDate && styles.endOptionChipTextSelected
                                                ]}>특정 일자까지</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                                
                                {isRecurring && (
                                    <View style={styles.recurrenceOptions}>
                                        {/* 반복 주기와 타입을 제목 아래에 배치 (라벨 제거) */}
                                        <View style={styles.recurrenceRow}>
                                            <View style={styles.recurrenceInputGroup}>
                                                <View style={styles.numberScrollSelector}>
                                                    <TouchableOpacity
                                                        style={styles.scrollUpButton}
                                                        onPress={() => {
                                                            const newValue = Math.min(99, recurrenceInterval + 1);
                                                            onRecurrenceIntervalChange(newValue);
                                                        }}
                                                        activeOpacity={0.7}
                                                    >
                                                        <Ionicons name="chevron-up" size={16} color={'#3B82F6'} />
                                                    </TouchableOpacity>
                                                    
                                                    <View style={styles.numberDisplay}>
                                                        <Text style={styles.numberText}>{recurrenceInterval}</Text>
                                                    </View>
                                                    
                                                    <TouchableOpacity
                                                        style={styles.scrollDownButton}
                                                        onPress={() => {
                                                            const newValue = Math.max(1, recurrenceInterval - 1);
                                                            onRecurrenceIntervalChange(newValue);
                                                        }}
                                                        activeOpacity={0.7}
                                                    >
                                                        <Ionicons name="chevron-down" size={16} color={'#3B82F6'} />
                                                    </TouchableOpacity>
                                                </View>
                                                
                                                <View style={styles.recurrenceTypeSelector}>
                                                    {['daily', 'weekly', 'monthly'].map((type) => (
                                                        <TouchableOpacity
                                                            key={type}
                                                            style={[
                                                                styles.recurrenceTypeChip,
                                                                recurrenceType === type && styles.recurrenceTypeChipSelected
                                                            ]}
                                                            onPress={() => onRecurrenceTypeChange(type)}
                                                        >
                                                            <Text style={[
                                                                styles.recurrenceTypeChipText,
                                                                recurrenceType === type && styles.recurrenceTypeChipTextSelected
                                                            ]}>
                                                                {type === 'daily' ? '일' : 
                                                                 type === 'weekly' ? '주' : '개월'}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </View>
                                                <Text style={styles.recurrenceLabel}>마다</Text>
                                            </View>
                                        </View>
                                        
                                        {/* 종료 일자 표시는 새로운 팝업에서만 처리하므로 여기서는 제거 */}
                                    </View>
                                )}
                            </View>
                            
                            {/* 확인 버튼 */}
                            <View style={{ marginTop: 4 }}>
                                <TouchableOpacity
                                    style={{
                                        backgroundColor: '#3B82F6',
                                        borderRadius: 12,
                                        paddingVertical: 14,
                                        alignItems: 'center',
                                        marginTop: 0,
                                        elevation: 1,
                                        shadowColor: '#3B82F6',
                                        shadowOffset: { width: 0, height: 1 },
                                        shadowOpacity: 0.1,
                                        shadowRadius: 2
                                    }}
                                    onPress={handleConfirm}
                                    activeOpacity={0.7}
                                >
                                    <Text style={{
                                        color: '#FFFFFF',
                                        fontSize: 16,
                                        fontWeight: 'bold'
                                    }}>확인</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* 🚨 중요: 종료일자 설정 팝업을 DatePickerModal 내부에 통합 */}
            {/* 🚨 중요: 종료일자 설정 팝업은 CreatePersonalScheduleScreen에서 독립적으로 관리 */}
        </>
    );
};

{/* 별도의 독립된 종료일자 설정 Modal */}
{/* EndDateSelectionModal은 파일 맨 아래로 이동됨 */}

const TimePickerModal = ({ 
    visible, 
    onClose, 
    onTimeSelect, 
    selectedTime 
}) => {
    const [tempSelectedTime, setTempSelectedTime] = useState(selectedTime);

    const handleConfirm = () => {
        onTimeSelect(tempSelectedTime);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>시간 선택</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color="#64748B" />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.timePickerContainer}>
                        <DateTimePicker
                            value={tempSelectedTime}
                            mode="time"
                            display="spinner"
                            onChange={(event, time) => {
                                if (time) {
                                    setTempSelectedTime(time);
                                }
                            }}
                            textColor={'#1E293B'}
                            accentColor={'#3B82F6'}
                        />
                    </View>
                    <View style={{ marginTop: 20 }}>
                        <TouchableOpacity
                            style={{
                                backgroundColor: '#3B82F6',
                                borderRadius: 12,
                                paddingVertical: 14,
                                alignItems: 'center',
                                marginTop: 8,
                                elevation: 1,
                                shadowColor: '#3B82F6',
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: 0.1,
                                shadowRadius: 2
                            }}
                            onPress={handleConfirm}
                            activeOpacity={0.7}
                        >
                            <Text style={{
                                color: '#FFFFFF',
                                fontSize: 16,
                                fontWeight: 'bold'
                            }}>확인</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const CategorySelector = ({ 
    visible, 
    onClose, 
    categories, 
    selectedCategory, 
    onSelect 
}) => (
    <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
    >
        <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>카테고리 선택</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close" size={24} color="#64748B" />
                    </TouchableOpacity>
                </View>
                <ScrollView style={styles.categoriesList}>
                    {categories.map((category, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.categoryItem,
                                selectedCategory === category && styles.categoryItemSelected
                            ]}
                            onPress={() => {
                                onSelect(category);
                                onClose();
                            }}
                            activeOpacity={0.7}
                        >
                            <Text style={[
                                styles.categoryText,
                                selectedCategory === category && styles.categoryTextSelected
                            ]}>
                                {category}
                            </Text>
                            {selectedCategory === category && (
                                <Ionicons 
                                    name="checkmark-circle" 
                                    size={24} 
                                    color={'#3B82F6'} 
                                />
                            )}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        </View>
    </Modal>
);

const styles = StyleSheet.create({
    // Form Section
    formSection: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1E293B',
        marginLeft: 4,
    },
    requiredMark: {
        color: '#EF4444',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 4,
    },

    // Input
    input: {
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: '#E2E8F0',
        borderRadius: 16,
        padding: 16,
        fontSize: 16,
        color: '#1E293B',
        minHeight: 56,
    },
    multilineInput: {
        minHeight: 100,
        textAlignVertical: 'top',
    },

    // Select Input
    selectInput: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: '#E2E8F0',
        borderRadius: 16,
        padding: 16,
        minHeight: 56,
    },
    selectText: {
        color: '#1E293B',
        fontSize: 16,
        flex: 1,
    },
    placeholderText: {
        color: '#94A3B8',
        fontSize: 16,
        flex: 1,
    },

    // Buttons
    button: {
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 56,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    buttonPrimary: {
        backgroundColor: '#3B82F6',
    },
    buttonSecondary: {
        backgroundColor: '#6B7280', // lightGray에서 gray로 변경하여 홈탭과 동일하게
        borderWidth: 2,
        borderColor: '#6B7280', // lightGray에서 gray로 변경하여 홈탭과 동일하게
    },
    buttonOutline: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: '#E2E8F0',
    },
    buttonDisabled: {
        backgroundColor: '#E2E8F0',
        opacity: 0.6,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonIcon: {
        marginRight: 8,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    buttonTextSecondary: {
        color: '#FFFFFF', // 흰색 글자로 변경
        fontSize: 16,
        fontWeight: '600',
    },
    buttonTextOutline: {
        color: '#1E293B',
        fontSize: 16,
        fontWeight: '600',
    },
    buttonTextDisabled: {
        color: '#94A3B8',
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    spinning: {
        marginRight: 8,
        transform: [{ rotate: '0deg' }],
    },

    // AI Button
    aiButton: {
        padding: 12,
        borderRadius: 12,
        backgroundColor: '#DBEAFE',
        borderWidth: 1,
        borderColor: '#3B82F6',
    },
    aiButtonLoading: {
        backgroundColor: '#E2E8F0',
        borderColor: '#E2E8F0',
    },
    aiButtonDisabled: {
        backgroundColor: '#E2E8F0',
        borderColor: '#E2E8F0',
    },

    // Suggestions
    suggestionsContainer: {
        marginTop: 12,
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        maxHeight: 160, // 200에서 160으로 줄여서 범위 축소
    },
    suggestionsScrollView: {
        maxHeight: 120, // 스크롤 가능한 영역 제한
    },
    suggestionsTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 12,
        color: '#1E293B',
    },
    suggestionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    suggestionText: {
        fontSize: 14,
        color: '#1E293B',
        flex: 1,
        marginRight: 12,
    },

    // Modals
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        width: '90%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    closeButton: {
        padding: 4,
    },
    timePickerContainer: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    categoriesList: {
        maxHeight: 300,
    },
    categoryItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    categoryItemSelected: {
        backgroundColor: '#DBEAFE',
        borderRadius: 12,
        marginHorizontal: 4,
    },
    categoryText: {
        fontSize: 16,
        color: '#1E293B',
    },
    categoryTextSelected: {
        color: '#3B82F6',
        fontWeight: '600',
    },
    modalFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
    },
    confirmButton: {
        backgroundColor: '#3B82F6',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },

    // 반복 설정 스타일
    recurrenceSection: {
        marginTop: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
    },
    recurrenceHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    recurrenceTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    recurrenceTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1E293B',
        marginLeft: 12,
    },
    recurrenceOptions: {
        paddingHorizontal: 0, // 10에서 0으로 변경하여 전체 폭 사용
    },
    recurrenceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        width: '100%', // 전체 폭 사용
    },
    recurrenceLabel: {
        fontSize: 14,
        color: '#1E293B',
        marginRight: 10,
    },
    recurrenceInputGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        // 하단 확인 버튼과 동일한 폭으로 확장
        width: '100%',
        justifyContent: 'space-between',
        flex: 1, // 추가로 flex: 1 설정
    },
    recurrenceInput: {
        fontSize: 14,
        color: '#1E293B',
        width: 60,
        textAlign: 'center',
    },
    recurrenceTypeSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 8,
        gap: 8, // 버튼들 사이 간격 추가
    },
    recurrenceTypeChip: {
        backgroundColor: '#E2E8F0',
        borderRadius: 16,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    recurrenceTypeChipSelected: {
        backgroundColor: '#DBEAFE',
        borderColor: '#3B82F6',
    },
    recurrenceTypeChipText: {
        fontSize: 12,
        color: '#1E293B',
        fontWeight: '600',
    },
    recurrenceTypeChipTextSelected: {
        color: '#3B82F6',
    },
    recurrenceEndSection: {
        marginTop: 12,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
    },
    recurrenceEndOptions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 8, // 위로 올리기 위해 marginTop 줄임
        marginBottom: 16, // 아래 간격 추가
        gap: 12, // 버튼들 사이 간격 추가
        alignItems: 'center', // Switch와 높이 정렬
    },
    endOptionChip: {
        backgroundColor: '#E2E8F0',
        borderRadius: 16,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        // 주/개월/년 버튼과 동일한 크기로 조정
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    endOptionChipSelected: {
        backgroundColor: '#DBEAFE',
        borderColor: '#3B82F6',
    },
    endOptionChipText: {
        fontSize: 12, // 주/개월/년 버튼과 동일한 글자 크기
        color: '#1E293B',
        fontWeight: '600',
    },
    endOptionChipTextSelected: {
        color: '#3B82F6',
    },
    endDateSection: {
        marginTop: 12,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
    },
    endDateInput: {
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginTop: 8,
        fontSize: 14,
        color: '#1E293B',
        textAlign: 'center',
    },
    endDateButtonText: {
        fontSize: 14,
        color: '#1E293B',
        fontWeight: '600',
    },
    endDateDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginTop: 8,
    },
    endDateDisplayText: {
        fontSize: 14,
        color: '#1E293B',
        fontWeight: '600',
    },
    endDateModalContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 24,
        margin: 20,
        maxWidth: 400,
        width: '90%',
        maxHeight: '80%',
        zIndex: 999999999, // 극단적으로 높게 설정하여 모든 팝업 위에 표시
        elevation: 999999999, // Android에서도 극단적으로 높게 설정
    },
    popupOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999999999, // 극단적으로 높게 설정하여 모든 팝업 위에 표시
        elevation: 999999999, // Android에서도 극단적으로 높게 설정
    },
    endDateInputContainer: {
        marginTop: 8, // 20에서 8로 줄여서 제목과 입력칸 사이 여백 축소
    },
    endDateInputLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 16,
        textAlign: 'center',
    },
    dateInputRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
    },
    dateInputGroup: {
        flex: 1,
        alignItems: 'center',
        position: 'relative', // 절대 위치를 위한 상대 위치 설정
    },
    dateInput: {
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        fontSize: 16,
        color: '#1E293B',
        textAlign: 'center',
        minHeight: 48,
    },
    dateInputUnit: {
        fontSize: 14,
        color: '#1E293B',
        marginTop: 8,
        fontWeight: '500',
    },
    numberSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 12,
        minHeight: 48,
        justifyContent: 'space-between',
        width: 120,
    },
    numberButton: {
        width: 24, // 32에서 24로 축소
        height: 24, // 32에서 24로 축소
        borderRadius: 12, // 16에서 12로 축소
        backgroundColor: '#DBEAFE',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#3B82F6',
    },
    numberDisplay: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
    },
    numberText: {
        fontSize: 12, // 18에서 12로 변경하여 "주/월/년 마다"와 동일하게
        fontWeight: '600',
        color: '#1E293B',
    },
    numberScrollSelector: {
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingVertical: 4,
        paddingHorizontal: 8,
        minHeight: 48,
        justifyContent: 'space-between',
        width: 60, // 120에서 60으로 축소하여 공간 절약
    },
    scrollUpButton: {
        width: 20,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 0,
    },
    scrollDownButton: {
        width: 20,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 0,
    },
    numberDisplay: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 4,
    },
});

// 별도의 독립된 종료일자 설정 Modal
const EndDateSelectionModal = ({ 
    visible, 
    onClose, 
    onEndDateChange,
    endDate,
    startDate, // 반복 일정 시작일 추가
    colors: propColors
}) => {
    const [endYear, setEndYear] = useState('');
    const [endMonth, setEndMonth] = useState('');
    const [endDay, setEndDay] = useState('');
    const [errorMessage, setErrorMessage] = useState(''); // 에러 메시지 상태 추가

    // 안전한 colors 처리
    let themeColors = {};
    try {
        const theme = useTheme();
        themeColors = theme?.colors || {};
    } catch (error) {
        console.warn('EndDateSelectionModal ThemeContext 접근 실패, 기본 색상 사용:', error);
    }

    const colors = propColors || themeColors;

    const safeColors = colors || {
        text: '#000000',
        primary: '#3B82F6',
        textSecondary: '#666666',
        surface: '#FFFFFF',
        error: '#EF4444'
    };

    // endDate가 변경될 때 입력 필드 초기화
    useEffect(() => {
        if (endDate) {
            const date = new Date(endDate);
            setEndYear(date.getFullYear().toString());
            setEndMonth((date.getMonth() + 1).toString()); // getMonth()는 0부터 시작하므로 +1
            setEndDay(date.getDate().toString());
        } else {
            // endDate가 null이면 입력 필드 초기화
            setEndYear('');
            setEndMonth('');
            setEndDay('');
        }
        setErrorMessage(''); // 에러 메시지도 초기화
    }, [endDate]);

    // 유효성 검사 함수
    const validateDate = () => {
        // 1. 빈 값 체크
        if (!endYear || !endMonth || !endDay || 
            endYear.trim().length === 0 || endMonth.trim().length === 0 || endDay.trim().length === 0) {
            setErrorMessage('연도, 월, 일을 모두 입력해주세요.');
            return false;
        }

        // 2. 숫자 형식 체크
        const year = parseInt(endYear);
        const month = parseInt(endMonth);
        const day = parseInt(endDay);
        
        if (isNaN(year) || isNaN(month) || isNaN(day)) {
            setErrorMessage('올바른 숫자를 입력해주세요.');
            return false;
        }

        // 2-1. 입력값 길이 및 형식 검사 강화
        if (endYear.length !== 4) {
            setErrorMessage('연도는 4자리로 입력해주세요.');
            return false;
        }
        
        if (endMonth.length !== 2) {
            setErrorMessage('월은 2자리로 입력해주세요. (예: 01, 02, 12)');
            return false;
        }
        
        if (endDay.length !== 2) {
            setErrorMessage('일은 2자리로 입력해주세요. (예: 01, 02, 31)');
            return false;
        }

        // 3. 범위 체크
        if (year < 1900 || year > 2100) {
            setErrorMessage('연도는 1900년부터 2100년 사이로 입력해주세요.');
            return false;
        }
        
        if (month < 1 || month > 12) {
            setErrorMessage('월은 1부터 12 사이로 입력해주세요.');
            return false;
        }

        // 4. 일자 유효성 체크 (윤년 고려)
        const maxDays = new Date(year, month, 0).getDate();
        if (day < 1 || day > maxDays) {
            setErrorMessage(`${month}월은 ${maxDays}일까지 있습니다.`);
            return false;
        }

        // 4-1. 특정 월의 일수 제한 강화
        const monthLimits = {
            4: 30, // 4월은 30일
            6: 30, // 6월은 30일
            9: 30, // 9월은 30일
            11: 30  // 11월은 30일
        };
        
        if (monthLimits[month] && day > monthLimits[month]) {
            setErrorMessage(`${month}월은 ${monthLimits[month]}일까지 있습니다.`);
            return false;
        }

        // 4-2. 2월 윤년 정확한 처리
        if (month === 2) {
            const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
            const maxFebDays = isLeapYear ? 29 : 28;
            if (day > maxFebDays) {
                setErrorMessage(`${year}년 2월은 ${maxFebDays}일까지 있습니다.`);
                return false;
            }
        }

        // 5. 시작일 이후인지 체크
        if (startDate) {
            const selectedDate = new Date(year, month - 1, day);
            if (selectedDate <= startDate) {
                setErrorMessage('종료일은 반복 일정 시작일 이후여야 합니다.');
                return false;
            }

            // 5-1. 시작일과의 최소 간격 검사 (최소 1일 이상)
            const minGap = 1; // 최소 1일 간격
            const daysDiff = Math.floor((selectedDate - startDate) / (1000 * 60 * 60 * 24));
            if (daysDiff < minGap) {
                setErrorMessage('종료일은 시작일로부터 최소 1일 이후여야 합니다.');
                return false;
            }
        }

        // 6. 과거 날짜 체크
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDate = new Date(year, month - 1, day);
        if (selectedDate < today) {
            setErrorMessage('종료일은 오늘 이후여야 합니다.');
            return false;
        }

        // 7. 너무 먼 미래 체크 (100년 후)
        const maxFutureDate = new Date();
        maxFutureDate.setFullYear(maxFutureDate.getFullYear() + 100);
        if (selectedDate > maxFutureDate) {
            setErrorMessage('종료일은 100년 이내로 설정해주세요.');
            return false;
        }

        setErrorMessage(''); // 에러 메시지 초기화
        return true;
    };

    const handleYearChange = (text) => {
        // 연도 입력값 실시간 검증
        if (text.length > 0) {
            const yearNum = parseInt(text);
            if (text.length === 4 && (yearNum < 1900 || yearNum > 2100)) {
                setErrorMessage('연도는 1900년부터 2100년 사이로 입력해주세요.');
            } else {
                setErrorMessage(''); // 에러 메시지 초기화
            }
        } else {
            setErrorMessage(''); // 에러 메시지 초기화
        }
        setEndYear(text);
    };

    const handleMonthChange = (text) => {
        // 사용자가 입력한 값 그대로 저장 (자동 0 추가 제거)
        setEndMonth(text);
        setErrorMessage(''); // 입력 시 에러 메시지 초기화
    };

    const handleDayChange = (text) => {
        // 사용자가 입력한 값 그대로 저장 (자동 0 추가 제거)
        setEndDay(text);
        setErrorMessage(''); // 입력 시 에러 메시지 초기화
    };

    const handleConfirm = () => {
        if (validateDate()) {
            try {
                // 🚨 중요: endDate를 하루 더해서 설정 (사용자가 선택한 날짜까지 포함)
                const selectedDate = new Date(parseInt(endYear), parseInt(endMonth) - 1, parseInt(endDay));
                selectedDate.setDate(selectedDate.getDate() + 1); // 하루를 더해줌
                onEndDateChange(selectedDate);
                onClose();
            } catch (error) {
                setErrorMessage('날짜 처리 중 오류가 발생했습니다.');
            }
        }
    };

    const handleClose = () => {
        // 입력값 초기화
        setEndYear('');
        setEndMonth('');
        setEndDay('');
        onClose();
    };

    if (!visible) return null;

    return (
        <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999999999,
            elevation: 999999999,
            // 🚨 중요: 모든 레이어 위에 표시되도록 강제 설정
            pointerEvents: 'box-none', // 하위 요소 터치 허용
        }}>
            <View style={{
                flex: 1,
                backgroundColor: 'rgba(0, 0, 0, 0.8)', // 더 진한 배경
                justifyContent: 'center',
                alignItems: 'center',
            }}>
                <View style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 20,
                    padding: 24,
                    margin: 20,
                    maxWidth: 400,
                    width: '90%',
                    maxHeight: '80%',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.3,
                    shadowRadius: 20,
                    elevation: 20,
                }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1F2937' }}>종료일자 설정</Text>
                        <TouchableOpacity onPress={handleClose}>
                            <Ionicons name="close" size={24} color="#64748B" />
                        </TouchableOpacity>
                    </View>
                    
                    <View style={{ marginTop: 8 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View style={{ flex: 1, marginRight: 8, position: 'relative' }}>
                                <TextInput
                                    style={{
                                        borderWidth: 1,
                                        borderColor: errorMessage ? '#DC2626' : '#E5E7EB',
                                        borderRadius: 8,
                                        paddingHorizontal: 12,
                                        paddingVertical: 12,
                                        fontSize: 16,
                                        backgroundColor: '#FFFFFF',
                                        textAlign: 'center'
                                    }}
                                    value={endYear || ''}
                                    onChangeText={handleYearChange}
                                    placeholder="2025"
                                    placeholderTextColor="#9CA3AF"
                                    keyboardType="numeric"
                                    maxLength={4}
                                    returnKeyType="next"
                                    blurOnSubmit={false}
                                    autoFocus={false}
                                />
                                <Text style={{ position: 'absolute', right: -10, top: 12, fontSize: 14, color: '#6B7280' }}>-</Text>
                            </View>
                            
                            <View style={{ flex: 1, marginHorizontal: 8, position: 'relative' }}>
                                <TextInput
                                    style={{
                                        borderWidth: 1,
                                        borderColor: errorMessage ? '#DC2626' : '#E5E7EB',
                                        borderRadius: 8,
                                        paddingHorizontal: 12,
                                        paddingVertical: 12,
                                        fontSize: 16,
                                        backgroundColor: '#FFFFFF',
                                        textAlign: 'center'
                                    }}
                                    value={endMonth || ''}
                                    placeholder="08"
                                    placeholderTextColor="#9CA3AF"
                                    keyboardType="numeric"
                                    maxLength={2}
                                    returnKeyType="next"
                                    blurOnSubmit={false}
                                    autoFocus={false}
                                    onChangeText={handleMonthChange}
                                />
                                <Text style={{ position: 'absolute', right: -10, top: 12, fontSize: 14, color: '#6B7280' }}>-</Text>
                            </View>
                            
                            <View style={{ flex: 1, marginLeft: 8, position: 'relative' }}>
                                <TextInput
                                    style={{
                                        borderWidth: 1,
                                        borderColor: errorMessage ? '#DC2626' : '#E5E7EB',
                                        borderRadius: 8,
                                        paddingHorizontal: 12,
                                        paddingVertical: 12,
                                        fontSize: 16,
                                        backgroundColor: '#FFFFFF',
                                        textAlign: 'center'
                                    }}
                                    value={endDay || ''}
                                    onChangeText={handleDayChange}
                                    placeholder="21"
                                    placeholderTextColor="#9CA3AF"
                                    keyboardType="numeric"
                                    maxLength={2}
                                    returnKeyType="done"
                                    onSubmitEditing={() => {
                                        Keyboard.dismiss();
                                    }}
                                    blurOnSubmit={true}
                                    autoFocus={false}
                                />
                                <Text style={{ position: 'absolute', right: -20, top: 12, fontSize: 14, color: '#6B7280' }}></Text>
                            </View>
                        </View>
                        
                        {/* 에러 메시지 표시 */}
                        {errorMessage ? (
                            <View style={{
                                marginTop: 12,
                                padding: 12,
                                backgroundColor: '#FEF2F2',
                                borderWidth: 1,
                                borderColor: '#FECACA',
                                borderRadius: 8,
                                flexDirection: 'row',
                                alignItems: 'center'
                            }}>
                                <Ionicons name="warning" size={16} color="#DC2626" style={{ marginRight: 8 }} />
                                <Text style={{
                                    color: '#DC2626',
                                    fontSize: 14,
                                    flex: 1
                                }}>
                                    {errorMessage}
                                </Text>
                            </View>
                        ) : null}
                    </View>
                    
                    <View style={{ marginTop: 16 }}>
                        <TouchableOpacity
                            style={{
                                backgroundColor: '#3B82F6',
                                borderRadius: 12,
                                paddingVertical: 14,
                                alignItems: 'center',
                                elevation: 1,
                                shadowColor: '#3B82F6',
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: 0.1,
                                shadowRadius: 2
                            }}
                            onPress={handleConfirm}
                            activeOpacity={0.7}
                        >
                            <Text style={{
                                color: '#FFFFFF',
                                fontSize: 16,
                                fontWeight: 'bold'
                            }}>확인</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
};

// 모든 컴포넌트를 한 번에 export
export {
    FormSection,
    FormInput,
    FormSelect,
    FormButton,
    AISuggestionButton,
    SuggestionsList,
    DatePickerModal,
    TimePickerModal,
    CategorySelector,
    EndDateSelectionModal,
};
