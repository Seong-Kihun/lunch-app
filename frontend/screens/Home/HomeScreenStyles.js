// HomeScreen 스타일
// 이 파일은 HomeScreen의 모든 스타일을 포함합니다

import { StyleSheet } from 'react-native';
import { COLORS } from '../../utils/colors';

export const styles = StyleSheet.create({
    safeArea: { 
        flex: 1, 
        backgroundColor: COLORS.light.background,
        position: 'relative'
    },
    homeContainer: { 
        flexGrow: 1,
        paddingBottom: 100 // 플로팅 버튼 공간 확보
    },
    header: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        paddingHorizontal: 16, 
        paddingTop: 10, 
        paddingBottom: 10, 
        backgroundColor: COLORS.light.background 
    },
    headerTitle: { 
        fontSize: 32, 
        fontWeight: 'bold', 
        color: COLORS.light.primary, 
        textAlign: 'center', 
        width: '100%', 
        letterSpacing: 1 
    },
    content: {
        flex: 1,
        paddingHorizontal: 16,
        backgroundColor: COLORS.light.background
    },
    card: { 
        backgroundColor: COLORS.light.surface, 
        borderRadius: 20, 
        padding: 20, 
        marginBottom: 16, 
        elevation: 3, 
        shadowColor: COLORS.light.primary,
        shadowOffset: { width: 0, height: 4 }, 
        shadowOpacity: 0.1, 
        shadowRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.1)'
    },
    cardTitle: { 
        fontSize: 18, 
        fontWeight: 'bold', 
        color: COLORS.light.text, 
        marginBottom: 12 
    },
    menuText: { 
        fontSize: 16, 
        color: COLORS.light.textSecondary, 
        lineHeight: 22 
    },
    appointmentCard: { 
        backgroundColor: COLORS.light.surface, 
        borderRadius: 12, 
        padding: 18, 
        paddingVertical: 40,
        marginRight: 12,
        marginBottom: 5, 
        width: 220,
        minHeight: 160,
        alignItems: 'flex-start',
        borderLeftWidth: 4, 
        borderLeftColor: COLORS.light.primary,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3
    },
    appointmentDate: { 
        fontSize: 16, 
        fontWeight: 'bold', 
        color: COLORS.light.primary, 
        marginBottom: 8 
    },
    appointmentHeader: { 
        alignSelf: 'flex-start', 
        marginBottom: 12,
        position: 'absolute',
        top: 20,
        left: 20
    },
    eventItem: { 
        marginBottom: 8 
    },
    eventTitle: { 
        fontSize: 14, 
        fontWeight: '600', 
        color: COLORS.light.text, 
        marginBottom: 4 
    },
    eventDetail: { 
        fontSize: 12, 
        color: COLORS.light.textSecondary, 
        marginBottom: 2 
    },
    noAppointmentText: { 
        fontSize: 14, 
        color: COLORS.light.textSecondary, 
        textAlign: 'center', 
        fontStyle: 'italic' 
    },
    floatingButton: {
        position: 'absolute',
        bottom: 30,
        right: 30,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: COLORS.light.primary,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: COLORS.light.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    modalContent: {
        backgroundColor: COLORS.light.surface,
        borderRadius: 20,
        padding: 30,
        width: '80%',
        maxWidth: 400
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.light.text,
        textAlign: 'center',
        marginBottom: 30
    },
    modalOption: {
        backgroundColor: COLORS.light.primary,
        borderRadius: 12,
        padding: 20,
        marginBottom: 15,
        alignItems: 'center'
    },
    modalOptionText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.light.surface
    },
    modalCloseButton: {
        backgroundColor: COLORS.light.lightGray,
        borderRadius: 12,
        padding: 15,
        alignItems: 'center',
        marginTop: 10
    },
    modalCloseButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.light.text
    },
    // 모달 관련 추가 스타일
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)'
    },
    modalView: {
        backgroundColor: COLORS.light.surface,
        borderRadius: 20,
        padding: 30,
        width: '90%',
        maxWidth: 400,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5
    },
    appointmentOptionsContainer: {
        width: '100%',
        gap: 12
    },
    appointmentOptionButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        width: '100%'
    },
    optionContent: {
        flex: 1
    },
    optionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4
    },
    optionSubtitle: {
        fontSize: 14,
        opacity: 0.8
    },
    // 추가 필요한 스타일들
    centerView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 50
    },
    noDataText: {
        fontSize: 16,
        color: COLORS.light.textSecondary,
        textAlign: 'center',
        marginBottom: 20
    },
    addScheduleButton: {
        backgroundColor: COLORS.light.primary,
        borderRadius: 12,
        paddingHorizontal: 24,
        paddingVertical: 12
    },
    addScheduleButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center'
    },
    loadingText: {
        fontSize: 16,
        color: COLORS.light.textSecondary,
        marginTop: 16,
        textAlign: 'center'
    },
    errorText: {
        fontSize: 16,
        color: COLORS.light.error,
        textAlign: 'center',
        marginBottom: 20
    },
    retryButton: {
        backgroundColor: COLORS.light.primary,
        borderRadius: 12,
        paddingHorizontal: 24,
        paddingVertical: 12
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center'
    }
});
