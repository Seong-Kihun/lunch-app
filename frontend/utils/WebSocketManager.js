/**
 * WebSocket 실시간 통신 관리자
 * Socket.IO를 사용한 실시간 채팅 기능을 제공합니다.
 */

import io from 'socket.io-client';
import { getServerURL } from './networkUtils';

class WebSocketManager {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.currentRoom = null;
    this.eventListeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  /**
   * 동적 서버 URL 가져오기
   */
  async getDynamicServerURL() {
    try {
      return await getServerURL();
    } catch (error) {
      console.error('❌ WebSocket 동적 서버 URL 감지 실패:', error);
      return 'https://lunch-app-backend-ra12.onrender.com';
    }
  }

  /**
   * WebSocket 서버에 연결
   * @param {string} serverUrl - 서버 URL
   * @param {object} options - 연결 옵션
   */
  connect(serverUrl = null, options = {}) {
    // 서버 URL이 제공되지 않으면 동적으로 감지
    if (!serverUrl) {
      // 동적 서버 URL 감지 (비동기)
      this.getDynamicServerURL().then(url => {
        this.connect(url, options);
      }).catch(error => {
        console.error('❌ WebSocket 서버 URL 감지 실패:', error);
        // fallback
        this.connect('https://lunch-app-backend-ra12.onrender.com', options);
      });
      return;
    }
    try {
      this.socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        ...options
      });

      this.setupEventListeners();
      console.log('✅ WebSocket 연결 시도 중...');
    } catch (error) {
      console.error('❌ WebSocket 연결 실패:', error);
    }
  }

  /**
   * 기본 이벤트 리스너 설정
   */
  setupEventListeners() {
    if (!this.socket) return;

    // 연결 성공
    this.socket.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log('✅ WebSocket 연결 성공');
      this.emit('connected');
    });

    // 연결 해제
    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      console.log('❌ WebSocket 연결 해제:', reason);
      this.emit('disconnected', reason);
      
      // 자동 재연결 시도
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        setTimeout(() => {
          console.log(`🔄 재연결 시도 ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
          this.socket.connect();
        }, this.reconnectDelay * this.reconnectAttempts);
      }
    });

    // 연결 오류
    this.socket.on('connect_error', (error) => {
      console.error('❌ WebSocket 연결 오류:', error);
      this.emit('error', error);
    });

    // 새 메시지 수신
    this.socket.on('new_message', (data) => {
      console.log('📨 새 메시지 수신:', data);
      this.emit('new_message', data);
    });

    // 메시지 읽음 상태
    this.socket.on('message_read', (data) => {
      console.log('👁️ 메시지 읽음 상태:', data);
      this.emit('message_read', data);
    });

    // 메시지 반응
    this.socket.on('message_reaction', (data) => {
      console.log('👍 메시지 반응:', data);
      this.emit('message_reaction', data);
    });

    // 메시지 수정
    this.socket.on('message_edited', (data) => {
      console.log('✏️ 메시지 수정:', data);
      this.emit('message_edited', data);
    });

    // 메시지 삭제
    this.socket.on('message_deleted', (data) => {
      console.log('🗑️ 메시지 삭제:', data);
      this.emit('message_deleted', data);
    });

    // 사용자 타이핑 상태
    this.socket.on('user_typing', (data) => {
      console.log('⌨️ 사용자 타이핑:', data);
      this.emit('user_typing', data);
    });

    // 사용자 온라인/오프라인 상태
    this.socket.on('user_status_changed', (data) => {
      console.log('🟢 사용자 상태 변경:', data);
      this.emit('user_status_changed', data);
    });

    // 오류 메시지
    this.socket.on('error', (data) => {
      console.error('❌ 서버 오류:', data);
      this.emit('server_error', data);
    });
  }

  /**
   * 채팅방 입장
   * @param {string} chatType - 채팅 타입 (party, dangolpot, custom)
   * @param {number} chatId - 채팅 ID
   */
  joinChat(chatType, chatId) {
    if (!this.isConnected) {
      console.error('❌ WebSocket이 연결되지 않았습니다.');
      return;
    }

    this.currentRoom = { chatType, chatId };
    this.socket.emit('join_chat', { chat_type: chatType, chat_id: chatId });
    console.log(`🚪 채팅방 입장: ${chatType}_${chatId}`);
  }

  /**
   * 채팅방 퇴장
   * @param {string} chatType - 채팅 타입
   * @param {number} chatId - 채팅 ID
   */
  leaveChat(chatType, chatId) {
    if (!this.isConnected) return;

    this.socket.emit('leave_chat', { chat_type: chatType, chat_id: chatId });
    console.log(`🚪 채팅방 퇴장: ${chatType}_${chatId}`);
    
    if (this.currentRoom && 
        this.currentRoom.chatType === chatType && 
        this.currentRoom.chatId === chatId) {
      this.currentRoom = null;
    }
  }

  /**
   * 메시지 전송
   * @param {object} messageData - 메시지 데이터
   */
  sendMessage(messageData) {
    if (!this.isConnected) {
      console.error('❌ WebSocket이 연결되지 않았습니다.');
      return;
    }

    const data = {
      chat_type: messageData.chatType,
      chat_id: messageData.chatId,
      sender_employee_id: messageData.senderId,
      message: messageData.content,
      message_type: messageData.messageType || 'text'
    };

    this.socket.emit('send_message', data);
    console.log('📤 메시지 전송:', data);
  }

  /**
   * 메시지 읽음 표시
   * @param {number} messageId - 메시지 ID
   * @param {string} userId - 사용자 ID
   */
  markMessageRead(messageId, userId) {
    if (!this.isConnected || !this.currentRoom) return;

    const data = {
      message_id: messageId,
      user_id: userId,
      chat_type: this.currentRoom.chatType,
      chat_id: this.currentRoom.chatId
    };

    this.socket.emit('mark_message_read', data);
    console.log('👁️ 메시지 읽음 표시:', data);
  }

  /**
   * 메시지 반응 추가/제거
   * @param {number} messageId - 메시지 ID
   * @param {string} userId - 사용자 ID
   * @param {string} reactionType - 반응 타입
   */
  addMessageReaction(messageId, userId, reactionType) {
    if (!this.isConnected || !this.currentRoom) return;

    const data = {
      message_id: messageId,
      user_id: userId,
      reaction_type: reactionType,
      chat_type: this.currentRoom.chatType,
      chat_id: this.currentRoom.chatId
    };

    this.socket.emit('add_message_reaction', data);
    console.log('👍 메시지 반응:', data);
  }

  /**
   * 메시지 수정
   * @param {number} messageId - 메시지 ID
   * @param {string} userId - 사용자 ID
   * @param {string} newContent - 새로운 내용
   */
  editMessage(messageId, userId, newContent) {
    if (!this.isConnected || !this.currentRoom) return;

    const data = {
      message_id: messageId,
      user_id: userId,
      content: newContent,
      chat_type: this.currentRoom.chatType,
      chat_id: this.currentRoom.chatId
    };

    this.socket.emit('edit_message', data);
    console.log('✏️ 메시지 수정:', data);
  }

  /**
   * 메시지 삭제
   * @param {number} messageId - 메시지 ID
   * @param {string} userId - 사용자 ID
   */
  deleteMessage(messageId, userId) {
    if (!this.isConnected || !this.currentRoom) return;

    const data = {
      message_id: messageId,
      user_id: userId,
      chat_type: this.currentRoom.chatType,
      chat_id: this.currentRoom.chatId
    };

    this.socket.emit('delete_message', data);
    console.log('🗑️ 메시지 삭제:', data);
  }

  /**
   * 타이핑 시작
   * @param {string} userId - 사용자 ID
   * @param {string} userNickname - 사용자 닉네임
   */
  startTyping(userId, userNickname) {
    if (!this.isConnected || !this.currentRoom) return;

    const data = {
      chat_type: this.currentRoom.chatType,
      chat_id: this.currentRoom.chatId,
      user_id: userId,
      user_nickname: userNickname
    };

    this.socket.emit('typing_start', data);
  }

  /**
   * 타이핑 중지
   * @param {string} userId - 사용자 ID
   * @param {string} userNickname - 사용자 닉네임
   */
  stopTyping(userId, userNickname) {
    if (!this.isConnected || !this.currentRoom) return;

    const data = {
      chat_type: this.currentRoom.chatType,
      chat_id: this.currentRoom.chatId,
      user_id: userId,
      user_nickname: userNickname
    };

    this.socket.emit('typing_stop', data);
  }

  /**
   * 사용자 온라인 상태 알림
   * @param {string} userId - 사용자 ID
   * @param {string} userNickname - 사용자 닉네임
   */
  setUserOnline(userId, userNickname) {
    if (!this.isConnected) return;

    this.socket.emit('user_online', {
      user_id: userId,
      user_nickname: userNickname
    });
  }

  /**
   * 사용자 오프라인 상태 알림
   * @param {string} userId - 사용자 ID
   * @param {string} userNickname - 사용자 닉네임
   */
  setUserOffline(userId, userNickname) {
    if (!this.isConnected) return;

    this.socket.emit('user_offline', {
      user_id: userId,
      user_nickname: userNickname
    });
  }

  /**
   * 이벤트 리스너 등록
   * @param {string} event - 이벤트 이름
   * @param {function} callback - 콜백 함수
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  /**
   * 이벤트 리스너 제거
   * @param {string} event - 이벤트 이름
   * @param {function} callback - 콜백 함수
   */
  off(event, callback) {
    if (!this.eventListeners.has(event)) return;
    
    const listeners = this.eventListeners.get(event);
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  /**
   * 이벤트 발생
   * @param {string} event - 이벤트 이름
   * @param {...any} args - 인자들
   */
  emit(event, ...args) {
    if (!this.eventListeners.has(event)) return;
    
    const listeners = this.eventListeners.get(event);
    listeners.forEach(callback => {
      try {
        callback(...args);
      } catch (error) {
        console.error(`❌ 이벤트 리스너 오류 (${event}):`, error);
      }
    });
  }

  /**
   * 연결 상태 확인
   * @returns {boolean} 연결 상태
   */
  isSocketConnected() {
    return this.isConnected && this.socket && this.socket.connected;
  }

  /**
   * 현재 채팅방 정보
   * @returns {object|null} 현재 채팅방 정보
   */
  getCurrentRoom() {
    return this.currentRoom;
  }

  /**
   * 연결 해제
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.currentRoom = null;
    this.eventListeners.clear();
    console.log('🔌 WebSocket 연결 해제');
  }
}

// 싱글톤 인스턴스 생성
const webSocketManager = new WebSocketManager();

export default webSocketManager;
