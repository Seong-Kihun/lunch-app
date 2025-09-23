/**
 * 채팅 훅
 * WebSocket 연결과 채팅 기능을 관리합니다.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { RENDER_SERVER_URL, getApiUrl } from '../components/common/Utils';

export default function useChat(chatType, chatId, userId, userNickname) {
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // WebSocket 연결
  useEffect(() => {
    if (!chatType || !chatId || !userId) return;

    console.log('🔌 WebSocket 연결 시작:', { chatType, chatId, userId });

    // Socket.IO 클라이언트 연결
    try {
      socketRef.current = io(RENDER_SERVER_URL, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true
      });
    } catch (error) {
      console.error('❌ Socket.IO 연결 실패:', error);
      setError('WebSocket 연결에 실패했습니다.');
      setIsLoading(false);
      return;
    }

    const socket = socketRef.current;

    // 연결 성공
    socket.on('connect', () => {
      console.log('✅ WebSocket 연결 성공');
      setIsConnected(true);
      setError(null);
      
      // 채팅방 참여
      socket.emit('join_chat', {
        chat_type: chatType,
        chat_id: chatId,
        user_id: userId,
        user_nickname: userNickname
      });
    });

    // 연결 실패
    socket.on('connect_error', (error) => {
      console.error('❌ WebSocket 연결 실패:', error);
      setError('서버에 연결할 수 없습니다.');
      setIsConnected(false);
    });

    // 연결 해제
    socket.on('disconnect', () => {
      console.log('🔌 WebSocket 연결 해제');
      setIsConnected(false);
    });

    // 새 메시지 수신
    socket.on('new_message', (message) => {
      console.log('📨 새 메시지 수신:', message);
      setMessages(prev => [...prev, message]);
    });

    // 메시지 수정
    socket.on('message_edited', (message) => {
      console.log('✏️ 메시지 수정:', message);
      setMessages(prev => prev.map(msg => 
        msg.id === message.id ? { ...msg, ...message } : msg
      ));
    });

    // 메시지 삭제
    socket.on('message_deleted', (messageId) => {
      console.log('🗑️ 메시지 삭제:', messageId);
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
    });

    // 타이핑 시작
    socket.on('typing_start', (data) => {
      console.log('⌨️ 타이핑 시작:', data);
      setTypingUsers(prev => {
        const filtered = prev.filter(user => user.user_id !== data.user_id);
        return [...filtered, data];
      });
    });

    // 타이핑 종료
    socket.on('typing_stop', (data) => {
      console.log('⌨️ 타이핑 종료:', data);
      setTypingUsers(prev => prev.filter(user => user.user_id !== data.user_id));
    });

    // 사용자 온라인
    socket.on('user_online', (data) => {
      console.log('🟢 사용자 온라인:', data);
      setOnlineUsers(prev => {
        const filtered = prev.filter(user => user.user_id !== data.user_id);
        return [...filtered, data];
      });
    });

    // 사용자 오프라인
    socket.on('user_offline', (data) => {
      console.log('🔴 사용자 오프라인:', data);
      setOnlineUsers(prev => prev.filter(user => user.user_id !== data.user_id));
    });

    // 메시지 읽음 상태
    socket.on('message_read', (data) => {
      console.log('👁️ 메시지 읽음:', data);
      setMessages(prev => prev.map(msg => 
        msg.id === data.message_id ? { ...msg, read_by: data.read_by } : msg
      ));
    });

    // 메시지 반응
    socket.on('message_reaction', (data) => {
      console.log('😀 메시지 반응:', data);
      setMessages(prev => prev.map(msg => 
        msg.id === data.message_id ? { ...msg, reactions: data.reactions } : msg
      ));
    });

    // 기존 메시지 로드
    loadMessages();

    return () => {
      if (socket) {
        socket.emit('leave_chat', {
          chat_type: chatType,
          chat_id: chatId,
          user_id: userId
        });
        socket.disconnect();
      }
    };
  }, [chatType, chatId, userId, userNickname]);

  // 기존 메시지 로드
  const loadMessages = async () => {
    try {
      setIsLoading(true);
      const url = getApiUrl(`chat/messages/${chatType}/${chatId}`);
      console.log('🔍 메시지 로드 URL:', url);
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📊 기존 메시지 로드:', data);

      if (Array.isArray(data)) {
        setMessages(data);
      } else if (data.messages && Array.isArray(data.messages)) {
        setMessages(data.messages);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('메시지 로드 실패:', error);
      setError('메시지를 불러올 수 없습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 메시지 전송
  const sendMessage = useCallback((content) => {
    if (!socketRef.current || !isConnected) {
      console.error('WebSocket이 연결되지 않았습니다.');
      return;
    }

    const message = {
      chat_type: chatType,
      chat_id: chatId,
      sender_id: userId,
      sender_nickname: userNickname,
      content: content,
      created_at: new Date().toISOString()
    };

    console.log('📤 메시지 전송:', message);
    socketRef.current.emit('send_message', message);
  }, [chatType, chatId, userId, userNickname, isConnected]);

  // 메시지 읽음 표시
  const markMessageAsRead = useCallback((messageId) => {
    if (!socketRef.current || !isConnected) return;

    socketRef.current.emit('mark_message_read', {
      message_id: messageId,
      user_id: userId
    });
  }, [userId, isConnected]);

  // 메시지 반응
  const toggleMessageReaction = useCallback((messageId, reaction) => {
    if (!socketRef.current || !isConnected) return;

    socketRef.current.emit('add_message_reaction', {
      message_id: messageId,
      user_id: userId,
      reaction: reaction
    });
  }, [userId, isConnected]);

  // 메시지 수정
  const editMessage = useCallback((messageId, newContent) => {
    if (!socketRef.current || !isConnected) return;

    socketRef.current.emit('edit_message', {
      message_id: messageId,
      content: newContent,
      user_id: userId
    });
  }, [userId, isConnected]);

  // 메시지 삭제
  const deleteMessage = useCallback((messageId) => {
    if (!socketRef.current || !isConnected) return;

    socketRef.current.emit('delete_message', {
      message_id: messageId,
      user_id: userId
    });
  }, [userId, isConnected]);

  // 타이핑 시작
  const handleTyping = useCallback(() => {
    if (!socketRef.current || !isConnected) return;

    socketRef.current.emit('typing_start', {
      chat_type: chatType,
      chat_id: chatId,
      user_id: userId,
      user_nickname: userNickname
    });

    // 타이핑 타임아웃 설정
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current.emit('typing_stop', {
        chat_type: chatType,
        chat_id: chatId,
        user_id: userId
      });
    }, 1000);
  }, [chatType, chatId, userId, userNickname, isConnected]);

  // 읽지 않은 메시지 수 초기화
  const clearUnreadCount = useCallback(() => {
    setUnreadCount(0);
  }, []);

  // 사용자 온라인 상태 확인
  const isUserOnline = useCallback((userId) => {
    return onlineUsers.some(user => user.user_id === userId);
  }, [onlineUsers]);

  // 타이핑 텍스트 생성
  const getTypingText = useCallback(() => {
    if (typingUsers.length === 0) return '';
    if (typingUsers.length === 1) return `${typingUsers[0].user_nickname}님이 타이핑 중...`;
    if (typingUsers.length === 2) return `${typingUsers[0].user_nickname}님과 ${typingUsers[1].user_nickname}님이 타이핑 중...`;
    return `${typingUsers.length}명이 타이핑 중...`;
  }, [typingUsers]);

  return {
    messages,
    isConnected,
    typingUsers,
    onlineUsers,
    unreadCount,
    isLoading,
    error,
    sendMessage,
    markMessageAsRead,
    toggleMessageReaction,
    editMessage,
    deleteMessage,
    handleTyping,
    clearUnreadCount,
    isUserOnline,
    getTypingText
  };
}