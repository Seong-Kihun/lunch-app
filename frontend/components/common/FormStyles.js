import { StyleSheet } from 'react-native';

// 공통 폼 스타일
export const createFormStyles = (colors) => StyleSheet.create({
    // 컨테이너
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    safeArea: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContainer: {
        flexGrow: 1,
        paddingBottom: 40,
    },
    
    // 헤더
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.lightGray,
        backgroundColor: colors.surface,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
        flex: 1,
        textAlign: 'center',
    },
    headerButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: colors.lightGray,
    },
    headerButtonText: {
        fontSize: 16,
        color: colors.text,
    },
    
    // 폼 컨테이너
    formContainer: {
        padding: 20,
    },
    formSection: {
        marginBottom: 24,
    },
    formSectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 16,
        marginLeft: 4,
    },
    
    // 입력 필드
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 8,
        marginLeft: 4,
    },
    requiredMark: {
        color: '#EF4444',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 4,
    },
    input: {
        backgroundColor: 'transparent',
        borderWidth: 0,
        flex: 1,
        padding: 16,
        fontSize: 16,
        color: colors.text,
        minHeight: 56,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF', // 흰색으로 변경
        borderWidth: 2,
        borderColor: '#D1D5DB', // 더 진한 회색으로 변경
        borderRadius: 16,
        minHeight: 56,
    },
    inputFocused: {
        borderColor: colors.primary,
        borderWidth: 2,
    },
    inputError: {
        borderColor: '#EF4444',
        borderWidth: 2,
    },
    multilineInput: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    inputText: {
        color: colors.text,
        fontSize: 16,
    },
    placeholderText: {
        color: colors.textSecondary,
        fontSize: 16,
    },
    
    // 선택 입력
    selectInput: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFFFFF', // 흰색으로 변경
        borderWidth: 2,
        borderColor: '#D1D5DB', // 더 진한 회색으로 변경
        borderRadius: 16,
        padding: 16,
        minHeight: 56,
    },
    selectText: {
        color: colors.text,
        fontSize: 16,
        flex: 1,
    },
    
    // AI 제안 버튼
    aiButtonContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    aiButton: {
        padding: 6,
        borderRadius: 10,
        backgroundColor: colors.primaryLight,
        borderWidth: 1,
        borderColor: colors.primary,
        marginRight: 16,
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    aiButtonLoading: {
        backgroundColor: colors.lightGray,
        borderColor: '#D1D5DB', // 더 진한 회색으로 변경
    },
    aiButtonDisabled: {
        backgroundColor: colors.lightGray,
        borderColor: '#D1D5DB', // 더 진한 회색으로 변경
    },
    
    // 제안 목록
    suggestionsContainer: {
        marginTop: 8, // 12에서 8로 줄여서 상단 여백 축소
        padding: 12, // 16에서 12로 줄여서 내부 여백 축소
        backgroundColor: '#FFFFFF', // 흰색으로 변경
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#D1D5DB', // 더 진한 회색으로 변경
        maxHeight: 4000, // 200에서 350으로 늘려서 검색 결과가 테두리를 벗어나지 않도록 함
    },
    suggestionsTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 6, // 12에서 6으로 줄여서 제목과 결과 사이 여백 최소화
        color: colors.text,
    },
    suggestionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10, // 12에서 10으로 줄여서 각 항목 간격 더 축소
        borderBottomWidth: 1,
        borderBottomColor: colors.lightGray,
    },
    suggestionText: {
        fontSize: 14,
        color: colors.text,
        flex: 1,
        marginRight: 12,
    },
    
    // 버튼
    buttonContainer: {
        marginTop: 16,
        gap: 12,
    },
    button: {
        borderRadius: 16,
        paddingVertical: 14, // 16에서 14로 변경하여 직접 입력하기 버튼과 동일한 높이
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48, // 56에서 48로 변경하여 직접 입력하기 버튼과 동일한 높이
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonPrimary: {
        backgroundColor: colors.primary,
    },
    buttonSecondary: {
        backgroundColor: colors.lightGray,
        borderWidth: 2,
        borderColor: '#D1D5DB', // 더 진한 회색으로 변경
    },
    buttonOutline: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: '#D1D5DB', // 더 진한 회색으로 변경
    },
    buttonDanger: {
        backgroundColor: '#EF4444',
    },
    buttonDisabled: {
        backgroundColor: colors.lightGray,
        opacity: 0.6,
    },
    buttonText: {
        color: colors.surface,
        fontSize: 16,
        fontWeight: '600',
    },
    buttonTextSecondary: {
        color: colors.white,
        fontSize: 16,
        fontWeight: '600',
    },
    buttonTextOutline: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '600',
    },
    buttonTextDanger: {
        color: colors.surface,
        fontSize: 16,
        fontWeight: '600',
    },
    
    // 모달
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        backgroundColor: '#FFFFFF', // 흰색으로 변경
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
        color: colors.text,
    },
    closeButton: {
        padding: 4,
    },
    
    // 모달 푸터
    modalFooter: {
        marginTop: 20,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: colors.lightGray,
    },
    confirmButton: {
        backgroundColor: colors.primary,
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmButtonText: {
        color: colors.white,
        fontSize: 16,
        fontWeight: '600',
    },
    
    // 카테고리 선택
    categoriesContainer: {
        marginTop: 16,
    },
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    categoryChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#D1D5DB', // 더 진한 회색으로 변경
        backgroundColor: '#FFFFFF', // 흰색으로 변경
    },
    categoryChipSelected: {
        borderColor: colors.primary,
        backgroundColor: colors.primaryLight,
    },
    categoryChipText: {
        fontSize: 14,
        color: colors.text,
        fontWeight: '500',
    },
    categoryChipTextSelected: {
        color: colors.primary,
        fontWeight: '600',
    },
    
    // 태그 입력
    tagsContainer: {
        marginTop: 16,
    },
    tagsInput: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        minHeight: 56,
        padding: 12,
        backgroundColor: '#FFFFFF', // 흰색으로 변경
        borderWidth: 2,
        borderColor: '#D1D5DB', // 더 진한 회색으로 변경
        borderRadius: 16,
    },
    tag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primaryLight,
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginRight: 8,
        marginBottom: 8,
    },
    tagText: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: '500',
        marginRight: 6,
    },
    removeTagButton: {
        padding: 2,
    },
    
    // 반복 설정
    recurrenceContainer: {
        marginTop: 16,
        padding: 16,
        backgroundColor: '#FFFFFF', // 흰색으로 변경
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#D1D5DB', // 더 진한 회색으로 변경
    },
    recurrenceHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    recurrenceToggle: {
        marginRight: 12,
    },
    recurrenceTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    recurrenceOptions: {
        marginTop: 16,
    },
    recurrenceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    recurrenceLabel: {
        fontSize: 14,
        color: colors.text,
    },
    recurrenceInput: {
        width: 80,
        textAlign: 'center',
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: '#D1D5DB', // 더 진한 회색으로 변경
        borderRadius: 8,
        padding: 8,
        fontSize: 14,
    },
    
    // 참석자 선택
    attendeesContainer: {
        marginTop: 16,
    },
    attendeesInput: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFFFFF', // 흰색으로 변경
        borderWidth: 2,
        borderColor: '#D1D5DB', // 더 진한 회색으로 변경
        borderRadius: 16,
        padding: 16,
        minHeight: 56,
    },
    selectedAttendees: {
        marginTop: 12,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    attendeeTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primaryLight,
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    attendeeText: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: '500',
        marginRight: 6,
    },
    
    // 로딩 및 에러
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        padding: 16,
        backgroundColor: '#FEF2F2',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FECACA',
        marginBottom: 16,
    },
    errorText: {
        color: '#DC2626',
        fontSize: 14,
        textAlign: 'center',
    },
    
    // 헬프 텍스트
    helpText: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 4,
        marginLeft: 4,
        fontStyle: 'italic',
    },
    
    // 구분선
    divider: {
        height: 1,
        backgroundColor: colors.lightGray,
        marginVertical: 16,
    },
    
    // 스페이서
    spacer: {
        height: 16,
    },
    largeSpacer: {
        height: 32,
    },

    // 빠른 식당 선택 관련
    quickRestaurantsContainer: {
        marginBottom: 24, // 간격을 넓혀서 "직접 입력하기" 버튼과 분리
    },
    quickRestaurantsScroll: {
        paddingHorizontal: 0,
        gap: 8,
    },
    quickRestaurantButton: {
        paddingHorizontal: 12, // 16 -> 12로 줄임
        paddingVertical: 6, // 8 -> 6으로 줄임 (반복 설정 버튼과 동일)
        backgroundColor: '#FFFFFF', // 흰색으로 변경
        borderRadius: 16, // 20 -> 16으로 줄임 (반복 설정 버튼과 동일)
        borderWidth: 1,
        borderColor: '#D1D5DB', // 더 진한 회색으로 변경
        marginRight: -1, // 8 -> 4로 줄여서 간격 좁힘
        minWidth: 50, // 60 -> 50으로 줄임
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        height: 32, // 반복 설정 버튼과 동일한 높이
    },
    quickRestaurantButtonSpecial: {
        backgroundColor: colors.primary + '10', // 10% 투명도
        borderColor: colors.primary,
    },
    quickRestaurantText: {
        fontSize: 12, // 14 -> 12로 줄임 (반복 설정 버튼과 동일)
        color: colors.text,
        fontWeight: '600', // 500 -> 600으로 변경 (반복 설정 버튼과 동일)
        textAlign: 'center',
    },
    quickRestaurantTextSpecial: {
        color: colors.primary,
        fontWeight: '600',
        marginLeft: 4,
    },
    quickRestaurantButtonActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    quickRestaurantTextActive: {
        color: '#FFFFFF',
        fontWeight: '600',
    },

    // 검색 아이콘 컨테이너
    searchIconsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    filterButton: {
        padding: 8,
        borderRadius: 4,
        minWidth: 32,
        minHeight: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // 필터 모달 관련
    filterSection: {
        marginBottom: 8,
    },
    filterSectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 8,
    },
    
    // 카테고리 칩
    categoryChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    categoryChipsScroll: {
        paddingHorizontal: 0,
        gap: 8,
    },
    categoryChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#FFFFFF', // 흰색으로 변경
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#D1D5DB', // 더 진한 회색으로 변경
    },
    categoryChipSelected: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    categoryChipText: {
        fontSize: 14,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    categoryChipTextSelected: {
        color: colors.white,
    },
    
    // 정렬 옵션
    sortOptions: {
        flexDirection: 'row',
        gap: 8,
    },
    sortOptionsScroll: {
        paddingHorizontal: 0,
        gap: 8,
    },
    sortOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#FFFFFF', // 흰색으로 변경
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#D1D5DB', // 더 진한 회색으로 변경
        gap: 6,
    },
    sortOptionSelected: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    sortOptionText: {
        fontSize: 14,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    sortOptionTextSelected: {
        color: colors.white,
    },
    
    // 필터 버튼들
    filterButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    
    // 검색 결과 컨테이너 스타일
    searchResultsContainer: {
        marginTop: 2, // 4에서 2로 더 줄여서 제목과 결과 사이 여백 최소화
        marginBottom: 8, // 12에서 8로 줄여서 하단 여백 축소
        paddingVertical: 1, // 2에서 1로 줄여서 내부 여백 최소화
    },
    searchResultsContent: {
        paddingVertical: 0, // 2에서 0으로 줄여서 내부 여백 최소화
    },
    searchResultsFlatList: {
        minHeight: 150, // 최소 높이를 120에서 200으로 늘림
        maxHeight: 200, // 최대 높이를 180에서 280으로 늘림
    },
    
    // 정보 버튼 스타일
    infoButton: {
        padding: 8,
        borderRadius: 4,
    },
    
    // 더보기 버튼
    loadMoreButton: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
        marginBottom: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'transparent',
        backgroundColor: 'transparent',
    },
    loadMoreText: {
        fontSize: 14,
        fontWeight: '600',
    },
    

});

export default createFormStyles;
