import { StyleSheet } from 'react-native';
import { COLORS } from './colors';

// 전역 스타일 정의
export const globalStyles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: COLORS.light.background },
    centerView: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: COLORS.light.background },
    homeContainer: { paddingTop: 10 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, backgroundColor: COLORS.light.background },
    headerTitle: { fontSize: 32, fontWeight: 'bold', color: COLORS.light.primary, textAlign: 'center', width: '100%', letterSpacing: 1 },
    card: { 
        backgroundColor: COLORS.light.surface, 
        borderRadius: 20, 
        padding: 20, 
        marginHorizontal: 16, 
        marginBottom: 16, 
        elevation: 3, 
        shadowColor: COLORS.light.primary,
        shadowOffset: { width: 0, height: 4 }, 
        shadowOpacity: 0.1, 
        shadowRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.1)'
    },
    cardTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.light.text, marginBottom: 12 },
    menuText: { fontSize: 16, color: COLORS.light.textSecondary, lineHeight: 22 },
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
    appointmentDate: { fontSize: 16, fontWeight: 'bold', color: COLORS.light.primary, marginBottom: 8 },
    appointmentHeader: { 
        alignSelf: 'flex-start', 
        marginBottom: 12,
        position: 'absolute',
        top: 20,
        left: 20
    },
    eventItem: { marginBottom: 8 },
    eventTitle: { fontSize: 14, fontWeight: '600', color: COLORS.light.text, marginBottom: 4 },
    eventDetail: { fontSize: 12, color: COLORS.light.textSecondary, marginBottom: 2 },
    noAppointmentText: { fontSize: 14, color: COLORS.light.textSecondary, textAlign: 'center', fontStyle: 'italic' },
    modalDetailCard: { 
        backgroundColor: COLORS.light.background, 
        borderRadius: 12, 
        padding: 16, 
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.light.border
    },
    modalDetailText: { fontSize: 14, color: COLORS.light.text, marginBottom: 4, lineHeight: 20 },
    // 채팅 관련 스타일
    messageContainer: { marginVertical: 4, paddingHorizontal: 8 },
    myMessage: { alignItems: 'flex-end' },
    otherMessage: { alignItems: 'flex-start' },
    messageBubble: { 
        maxWidth: '80%', 
        padding: 12, 
        borderRadius: 16,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2
    },
    myMessageBubble: { 
        backgroundColor: COLORS.light.primary,
        borderBottomRightRadius: 4
    },
    otherMessageBubble: { 
        backgroundColor: COLORS.light.surface,
        borderBottomLeftRadius: 4
    },
    messageText: { fontSize: 16, lineHeight: 20 },
    myMessageText: { color: '#FFFFFF' },
    otherMessageText: { color: COLORS.light.text },
    messageSender: { fontSize: 12, color: COLORS.light.textSecondary, marginBottom: 4 },
    messageTime: { fontSize: 11, color: COLORS.light.gray, marginTop: 2 },
    // 입력 관련 스타일
    input: {
        backgroundColor: COLORS.light.surface,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: COLORS.light.text,
        borderWidth: 1,
        borderColor: COLORS.light.border,
        marginBottom: 16
    },
    inputLabel: { fontSize: 16, fontWeight: '600', color: COLORS.light.text, marginBottom: 8 },
    submitButton: {
        backgroundColor: COLORS.light.primary,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 20
    },
    submitButtonText: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
    // 점심 약속 옵션 모달 스타일
    appointmentOptionsContainer: {
        width: '100%',
        gap: 12
    },
    appointmentOptionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderRadius: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4
    },
    optionContent: {
        flex: 1,
        marginRight: 12
    },
    optionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4
    },
    optionSubtitle: {
        fontSize: 14,
        opacity: 0.8,
        lineHeight: 18
    },
    modalView: { 
        margin: 20, 
        backgroundColor: 'white', 
        borderRadius: 24, 
        padding: 30, 
        alignItems: 'center', 
        width: '90%', 
        maxWidth: 400, 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 8 }, 
        shadowOpacity: 0.3, 
        shadowRadius: 12, 
        elevation: 8 
    },
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    }
});
