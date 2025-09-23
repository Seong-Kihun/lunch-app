import { StyleSheet } from 'react-native';

// 기본 스타일 정의
export const basicStyles = StyleSheet.create({
    centeredView: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: 'rgba(0,0,0,0.6)' 
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
    modalTitle: { 
        fontSize: 24, 
        fontWeight: 'bold', 
        marginBottom: 28, 
        textAlign: 'center', 
        color: '#3B82F6', 
        letterSpacing: 0.5,
        lineHeight: 32
    },
    button: { 
        borderRadius: 16, 
        padding: 16, 
        elevation: 3, 
        width: '100%', 
        marginTop: 12,
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 2 }, 
        shadowOpacity: 0.2, 
        shadowRadius: 4
    },
    buttonClose: { backgroundColor: '#E2E8F0' },
    textStyle: { color: 'white', fontWeight: 'bold', textAlign: 'center', fontSize: 16 },
    textStyleBlack: { color: 'black', fontWeight: 'bold', textAlign: 'center', fontSize: 16 },
    optionButton: { padding: 12, marginVertical: 4, borderRadius: 8, backgroundColor: '#F1F5F9' },
    optionButtonSelected: { backgroundColor: '#3B82F6' },
    optionButtonText: { fontSize: 16, color: '#1E293B' },
    optionButtonTextSelected: { color: 'white' },
    scrollerContainer: { height: 200, alignItems: 'center' },
    scroller: { width: 100 },
    scrollerItem: { height: 50, justifyContent: 'center', alignItems: 'center' },
    scrollerItemText: { fontSize: 18, fontWeight: 'bold' },
    scrollerIndicator: { position: 'absolute', top: 75, left: 0, right: 0, height: 50, backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: 8 }
});
