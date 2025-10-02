import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Text,
    View,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    SafeAreaView,
    TextInput,
    Alert,
    Modal,
    Pressable,
    ScrollView,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    Image
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import io from 'socket.io-client';

// Context 및 유틸리티
import { useMission } from '../../contexts/MissionContext';
import appService from '../services/AppService';
import{ getAccessToken } from '../../utils/secureStorage';
import COLORS from '../../components/common/Colors';
import basicStyles from '../../components/common/BasicStyles';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ChatRoomScreen({ route, navigation }) {
    const { chatId, chatType, chatTitle: initialChatTitle } = route.params;
    const { handleActionCompletion } = useMission();
    
    // 통일된 색상 사용
    const currentColors = global.currentColors || COLORS.light;
    
    const [chatDetails, setChatDetails] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isImagePickerVisible, setIsImagePickerVisible] = useState(false);
    const [chatMembers, setChatMembers] = useState([]);
    const [isTitleEditVisible, setIsTitleEditVisible] = useState(false);
    const [isMembersVisible, setIsMembersVisible] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [chatTitle, setChatTitle] = useState(initialChatTitle);
    const flatListRef = useRef(null);
    const [isMenuVisible, setIsMenuVisible] = useState(false);

    useEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <View style={{ flexDirection: 'row', marginRight: 10 }}>
                    <TouchableOpacity 
                        onPress={() => setIsSearchVisible(!isSearchVisible)} 
                        style={{ marginRight: 16, padding: 8 }}
                    >
                        <Ionicons name="search" size={24} color={currentColors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => setIsMenuVisible(true)}
                        style={{ padding: 8 }}
                    >
                        <Ionicons name="ellipsis-vertical" size={24} color={currentColors.text} />
                    </TouchableOpacity>
                </View>
            ),
        });
    }, [navigation, setIsSearchVisible, setIsMenuVisible, currentColors.text]);

    // WebSocket 연결 및 실시간 메시지 처리
    useEffect(() => {
        // WebSocket URL 생성
        let wsUrl = RENDER_SERVER_URL;
        if (wsUrl.startsWith('https://')) {
            wsUrl = wsUrl.replace('https://', 'wss://');
        } else if (wsUrl.startsWith('http://')) {
            wsUrl = wsUrl.replace('http://', 'ws://');
        }
        
        console.log('🔌 WebSocket 연결 시도:', wsUrl);
        
        const newSocket = io(wsUrl, {
            transports: ['polling', 'websocket'],
            timeout: 30000,
            forceNew: true,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000
        });
        
        newSocket.on('connect', () => {
            console.log('✅ WebSocket 연결 성공');
            setIsConnected(true);
            
            // 채팅방에 참여
            newSocket.emit('join_chat', {
                chat_type: chatType,
                chat_id: chatId
            });
        });

        newSocket.on('disconnect', (reason) => {
            console.log('❌ WebSocket 연결 끊김:', reason);
            setIsConnected(false);
        });

        newSocket.on('connect_error', (error) => {
            console.log('❌ WebSocket 연결 오류:', error);
            setIsConnected(false);
        });

        newSocket.on('reconnect', (attemptNumber) => {
            console.log('🔄 WebSocket 재연결 성공:', attemptNumber, '번째 시도');
            setIsConnected(true);
            
            // 재연결 시 채팅방에 다시 참여
            newSocket.emit('join_chat', {
                chat_type: chatType,
                chat_id: chatId
            });
        });

        newSocket.on('reconnect_error', (error) => {
            console.log('❌ WebSocket 재연결 오류:', error);
            setIsConnected(false);
        });

        // 실시간 메시지 수신
        newSocket.on('new_message', (data) => {
            console.log('📨 새 메시지 수신:', data);
            setMessages(prev => {
                const newMessages = [...prev, data];
                // 새 메시지 추가 후 자동으로 맨 아래로 스크롤
                setTimeout(() => {
                    if (flatListRef.current) {
                        flatListRef.current.scrollToEnd({ animated: true });
                    }
                }, 100);
                return newMessages;
            });
        });

        setSocket(newSocket);

        return () => {
            if (newSocket) {
                newSocket.disconnect();
            }
        };
    }, [chatId, chatType]);

    // 채팅방 정보 및 메시지 로드
    useFocusEffect(useCallback(() => {
        loadChatData();
        loadMessages();
    }, [chatId, chatType]));

    const loadChatData = async () => {
        try {
            // 개발 환경에서는 인증 없이 진행
            // 채팅방 정보 로드 - 개발용 API 사용
            const response = await appService.get(`/dev/chat/room/members/${chatType}/${chatId}, {
                headers: {
                    `)'Content-Type': 'application/json'
                }
            });
            if (response.ok) {
                const data = await response.json();
                setChatDetails(data);
                setChatMembers(data.members || []);
                console.log('✅ 채팅방 정보 로드 완료:', data);
            } else {
                console.warn('⚠️ 채팅방 정보 로드 실패:', response.status);
            }
        } catch (error) {
            console.error('채팅방 정보 로드 오류:', error);
        }
    };

    const loadMessages = async () => {
        try {
            // 개발 환경에서는 인증 없이 진행
            // 메시지 로드 - 개발용 API 사용
            const response = await appService.get(`/dev/chat/messages/${chatType}/${chatId}, {
                headers: {
                    `)'Content-Type': 'application/json'
                }
            });
            if (response.ok) {
                const data = await response.json();
                // 백엔드에서 {messages: [...]} 형태로 반환
                const messages = data.messages || data;
                // 메시지를 시간순으로 정렬 (오래된 메시지가 먼저)
                const sortedMessages = Array.isArray(messages) 
                    ? messages.sort((a, b) => new Date(a.created_at || a.timestamp) - new Date(b.created_at || b.timestamp))
                    : [];
                setMessages(sortedMessages);
                console.log('✅ 메시지 로드 완료:', sortedMessages.length + '개');
            } else {
                console.warn('⚠️ 메시지 로드 실패:', response.status);
                setMessages([]);
            }
        } catch (error) {
            console.error('메시지 로드 오류:', error);
            setMessages([]);
        }
    };

    const sendMessage = async () => {
        if (!newMessage.trim()) return;

        try {
            // 개발 환경에서는 인증 없이 진행

            // 실제 사용자 ID 가져오기
            const currentUser = global.currentUser || global.myEmployeeId;
            const senderId = currentUser?.employee_id || currentUser || 'unknown_user';
            
            const messageData = {
                chat_type: chatType,
                chat_id: chatId,
                sender_id: senderId,
                content: newMessage.trim(),
                message_type: 'text'
            };

            console.log('📤 메시지 전송:', messageData);

            const response = await appService.get(`/dev/chat/messages, {
                method: `)'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(messageData),
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ 메시지 전송 성공:', result);
                
                // 백엔드에서 메시지가 저장되었으므로 목록 새로고침
                await loadMessages();
                setNewMessage('');
                
                // 메시지 전송 후 자동으로 맨 아래로 스크롤
                setTimeout(() => {
                    if (flatListRef.current) {
                        flatListRef.current.scrollToEnd({ animated: true });
                    }
                }, 100);
                
                // 메시지 전송 성공 시 미션 완료 처리
                handleActionCompletion('send_message', 1);
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error('❌ 메시지 전송 실패:', response.status, errorData);
                Alert.alert('오류', errorData.message || '메시지 전송에 실패했습니다.');
            }
        } catch (error) {
            console.error('메시지 전송 오류:', error);
            Alert.alert('오류', '메시지 전송에 실패했습니다.');
        }
    };

    const renderMessage = ({ item }) => {
        // 현재 사용자 ID 가져오기
        const currentUser = global.currentUser || global.myEmployeeId;
        const currentUserId = currentUser?.employee_id || currentUser || 'unknown_user';
        const isMyMessage = item.sender_id === currentUserId;
        
        return (
            <View style={[
                styles.messageWrapper,
                isMyMessage ? styles.myMessageWrapper : styles.otherMessageWrapper
            ]}>
                {!isMyMessage && (
                    <View style={[styles.messageAvatar, { backgroundColor: currentColors.primaryLight }]}>
                        <Ionicons name="person" size={16} color={currentColors.primary} />
                    </View>
                )}
                
                <View style={[
                    styles.messageContainer,
                    isMyMessage ? styles.myMessage : styles.otherMessage
                ]}>
                    <Text style={[styles.messageText, { 
                        color: isMyMessage ? currentColors.surface : currentColors.text 
                    }]}>
                        {item.content || item.message}
                    </Text>
                    <Text style={[styles.messageTime, { 
                        color: isMyMessage ? currentColors.surface + '80' : currentColors.textSecondary 
                    }]}>
                        {new Date(item.created_at || item.timestamp).toLocaleTimeString('ko-KR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                        })}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: currentColors.background }]}>
            <KeyboardAvoidingView 
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                {/* 메시지 목록 */}
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={item => item.id.toString()}
                    style={[styles.messageList, { backgroundColor: currentColors.background }]}
                    contentContainerStyle={styles.messageListContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={() => (
                        <View style={styles.emptyContainer}>
                            <Text style={[styles.emptyText, { color: currentColors.textSecondary }]}>
                                아직 메시지가 없습니다.
                            </Text>
                            <Text style={[styles.emptySubText, { color: currentColors.textSecondary }]}>
                                첫 메시지를 보내보세요!
                            </Text>
                        </View>
                    )}
                />

                {/* 메시지 입력 */}
                <View style={[styles.inputContainer, { 
                    backgroundColor: currentColors.surface,
                    borderTopColor: currentColors.lightGray
                }]}>
                    <View style={[styles.inputWrapper, { backgroundColor: currentColors.background }]}>
                        <TextInput
                            style={[styles.textInput, { 
                                color: currentColors.text,
                                backgroundColor: currentColors.background
                            }]}
                            value={newMessage}
                            onChangeText={setNewMessage}
                            placeholder="메시지를 입력하세요..."
                            placeholderTextColor={currentColors.textSecondary}
                            multiline
                            maxLength={500}
                        />
                        <TouchableOpacity 
                            style={[
                                styles.sendButton, 
                                { backgroundColor: currentColors.primary },
                                !newMessage.trim() && styles.sendButtonDisabled
                            ]}
                            onPress={sendMessage}
                            disabled={!newMessage.trim()}
                        >
                            <Ionicons 
                                name="send" 
                                size={20} 
                                color={newMessage.trim() ? currentColors.surface : currentColors.textSecondary} 
                            />
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>

            {/* 메뉴 모달 */}
            <Modal
                visible={isMenuVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsMenuVisible(false)}
            >
                <Pressable 
                    style={styles.modalOverlay}
                    onPress={() => setIsMenuVisible(false)}
                >
                    <View style={styles.menuModal}>
                        <TouchableOpacity 
                            style={styles.menuItem}
                            onPress={() => {
                                setIsTitleEditVisible(true);
                                setIsMenuVisible(false);
                            }}
                        >
                            <Ionicons name="create-outline" size={20} color={COLORS.text} />
                            <Text style={styles.menuText}>제목 변경</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={styles.menuItem}
                            onPress={() => {
                                setIsMembersVisible(true);
                                setIsMenuVisible(false);
                            }}
                        >
                            <Ionicons name="people-outline" size={20} color={COLORS.text} />
                            <Text style={styles.menuText}>멤버 관리</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    messageList: {
        flex: 1,
    },
    messageListContent: {
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    messageWrapper: {
        flexDirection: 'row',
        marginVertical: 4,
        alignItems: 'flex-end',
    },
    myMessageWrapper: {
        justifyContent: 'flex-end',
    },
    otherMessageWrapper: {
        justifyContent: 'flex-start',
    },
    messageAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
        marginBottom: 4,
    },
    messageContainer: {
        maxWidth: '75%',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20,
    },
    myMessage: {
        backgroundColor: '#007AFF',
        borderBottomRightRadius: 4,
    },
    otherMessage: {
        backgroundColor: '#FFFFFF',
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    messageText: {
        fontSize: 16,
        lineHeight: 22,
        marginBottom: 4,
    },
    messageTime: {
        fontSize: 12,
        alignSelf: 'flex-end',
        opacity: 0.7,
    },
    inputContainer: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        borderRadius: 24,
        paddingHorizontal: 4,
        paddingVertical: 4,
    },
    textInput: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        maxHeight: 100,
        borderRadius: 20,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    sendButtonDisabled: {
        opacity: 0.5,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuModal: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        minWidth: 200,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 8,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 12,
    },
    menuText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#111827',
        marginLeft: 16,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 8,
    },
    emptySubText: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
});
