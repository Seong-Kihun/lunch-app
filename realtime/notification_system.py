"""
실시간 알림 시스템
WebSocket을 사용한 즉시 알림 전송 및 알림 히스토리 관리
"""
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Set
from flask_socketio import emit, join_room, leave_room
from flask import request, current_app
from sqlalchemy import and_

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class NotificationSystem:
    """실시간 알림 시스템"""
    
    def __init__(self, socketio, db):
        self.socketio = socketio
        self.db = db
        self.user_sessions: Dict[str, str] = {}  # user_id -> session_id
        self.active_users: Set[str] = set()  # 현재 온라인 사용자들
        
        # 알림 타입별 템플릿
        self.notification_templates = {
            'party_invite': {
                'title': '파티 초대',
                'icon': '🎉',
                'default_message': '새로운 파티에 초대되었습니다!'
            },
            'party_update': {
                'title': '파티 정보 변경',
                'icon': '📝',
                'default_message': '파티 정보가 변경되었습니다.'
            },
            'party_cancel': {
                'title': '파티 취소',
                'icon': '❌',
                'default_message': '파티가 취소되었습니다.'
            },
            'schedule_reminder': {
                'title': '일정 알림',
                'icon': '⏰',
                'default_message': '곧 일정이 시작됩니다!'
            },
            'lunch_recommendation': {
                'title': '점심 추천',
                'icon': '🍽️',
                'default_message': '새로운 점심 추천이 있습니다!'
            },
            'system_alert': {
                'title': '시스템 알림',
                'icon': '🔔',
                'default_message': '시스템에서 중요한 알림이 있습니다.'
            }
        }
    
    def setup_socket_events(self):
        """Socket.IO 이벤트 핸들러 설정"""
        
        @self.socketio.on('connect')
        def handle_connect(*args, **kwargs):
            """클라이언트 연결 시"""
            session_id = request.sid
            logger.info(f"🔌 클라이언트 연결: {session_id}")
            
            # 연결 확인 응답
            emit('connection_established', {
                'status': 'connected',
                'session_id': session_id,
                'timestamp': datetime.now().isoformat()
            })
        
        @self.socketio.on('authenticate')
        def handle_authentication(data):
            """사용자 인증 및 세션 관리"""
            try:
                user_id = data.get('user_id')
                if not user_id:
                    emit('auth_error', {'message': '사용자 ID가 필요합니다.'})
                    return
                
                session_id = request.sid
                
                # 사용자 세션 등록
                self.user_sessions[user_id] = session_id
                self.active_users.add(user_id)
                
                # 사용자별 방에 참가
                join_room(f"user_{user_id}")
                
                # 온라인 상태 브로드캐스트
                self.socketio.emit('user_online', {
                    'user_id': user_id,
                    'timestamp': datetime.now().isoformat()
                }, room=f"user_{user_id}")
                
                logger.info(f"✅ 사용자 인증 성공: {user_id} -> {session_id}")
                
                # 인증 성공 응답
                emit('auth_success', {
                    'user_id': user_id,
                    'session_id': session_id,
                    'timestamp': datetime.now().isoformat()
                })
                
                # 읽지 않은 알림 전송
                self.send_unread_notifications(user_id)
                
            except Exception as e:
                logger.error(f"❌ 인증 처리 실패: {e}")
                emit('auth_error', {'message': '인증 처리 중 오류가 발생했습니다.'})
        
        @self.socketio.on('disconnect')
        def handle_disconnect():
            """클라이언트 연결 해제 시"""
            session_id = request.sid
            
            # 사용자 ID 찾기
            user_id = None
            for uid, sid in self.user_sessions.items():
                if sid == session_id:
                    user_id = uid
                    break
            
            if user_id:
                # 사용자 세션 제거
                del self.user_sessions[user_id]
                self.active_users.discard(user_id)
                
                # 오프라인 상태 브로드캐스트
                self.socketio.emit('user_offline', {
                    'user_id': user_id,
                    'timestamp': datetime.now().isoformat()
                }, room=f"user_{user_id}")
                
                logger.info(f"🔌 사용자 연결 해제: {user_id}")
            else:
                logger.info(f"🔌 알 수 없는 클라이언트 연결 해제: {session_id}")
        
        @self.socketio.on('mark_notification_read')
        def handle_mark_notification_read(data):
            """알림 읽음 처리"""
            try:
                notification_id = data.get('notification_id')
                user_id = data.get('user_id')
                
                if not notification_id or not user_id:
                    emit('error', {'message': '알림 ID와 사용자 ID가 필요합니다.'})
                    return
                
                # 알림 읽음 처리 (데이터베이스 업데이트)
                self.mark_notification_as_read(notification_id, user_id)
                
                # 읽음 처리 완료 응답
                emit('notification_marked_read', {
                    'notification_id': notification_id,
                    'status': 'success'
                })
                
            except Exception as e:
                logger.error(f"❌ 알림 읽음 처리 실패: {e}")
                emit('error', {'message': '알림 읽음 처리 중 오류가 발생했습니다.'})
    
    def send_notification(self, user_id: str, notification_type: str, 
                         message: str = None, data: dict = None, 
                         priority: str = 'normal') -> bool:
        """사용자에게 알림 전송"""
        try:
            # 알림 템플릿 가져오기
            template = self.notification_templates.get(notification_type, {})
            
            # 알림 메시지 구성
            notification = {
                'id': f"notif_{datetime.now().timestamp()}",
                'type': notification_type,
                'title': template.get('title', '알림'),
                'icon': template.get('icon', '🔔'),
                'message': message or template.get('default_message', '새로운 알림이 있습니다.'),
                'data': data or {},
                'priority': priority,
                'timestamp': datetime.now().isoformat(),
                'read': False
            }
            
            # 데이터베이스에 알림 저장
            self.save_notification_to_db(user_id, notification)
            
            # 실시간 알림 전송
            if user_id in self.user_sessions:
                session_id = self.user_sessions[user_id]
                
                # 개별 사용자에게 알림 전송
                self.socketio.emit('new_notification', notification, room=session_id)
                
                # 우선순위가 높은 알림은 모든 사용자에게 브로드캐스트
                if priority == 'high':
                    self.socketio.emit('urgent_notification', notification)
                
                logger.info(f"📨 알림 전송 성공: {user_id} - {notification_type}")
                return True
            else:
                # 사용자가 오프라인인 경우, 다음 로그인 시 전송
                logger.info(f"📨 사용자 오프라인, 알림 저장됨: {user_id} - {notification_type}")
                return False
                
        except Exception as e:
            logger.error(f"❌ 알림 전송 실패: {user_id} - {notification_type} - {e}")
            return False
    
    def send_bulk_notification(self, user_ids: List[str], notification_type: str,
                              message: str = None, data: dict = None,
                              priority: str = 'normal') -> int:
        """여러 사용자에게 일괄 알림 전송"""
        success_count = 0
        
        for user_id in user_ids:
            if self.send_notification(user_id, notification_type, message, data, priority):
                success_count += 1
        
        logger.info(f"📨 일괄 알림 전송 완료: {success_count}/{len(user_ids)} 성공")
        return success_count
    
    def send_party_notification(self, party_id: int, notification_type: str,
                               message: str = None, data: dict = None,
                               exclude_user: str = None) -> int:
        """파티 참여자들에게 알림 전송"""
        try:
            # 파티 참여자 목록 조회 (데이터베이스에서)
            participants = self.get_party_participants(party_id)
            
            if exclude_user:
                participants = [p for p in participants if p != exclude_user]
            
            # 알림 전송
            success_count = self.send_bulk_notification(
                participants, notification_type, message, data
            )
            
            logger.info(f"🎉 파티 알림 전송 완료: {party_id} - {success_count}명")
            return success_count
            
        except Exception as e:
            logger.error(f"❌ 파티 알림 전송 실패: {party_id} - {e}")
            return 0
    
    def send_schedule_reminder(self, user_id: str, schedule_data: dict) -> bool:
        """일정 시작 전 알림 전송"""
        try:
            # 일정 시작 30분 전 알림
            reminder_message = f"30분 후 '{schedule_data.get('title', '일정')}'이 시작됩니다!"
            
            return self.send_notification(
                user_id, 'schedule_reminder', reminder_message, 
                schedule_data, 'normal'
            )
            
        except Exception as e:
            logger.error(f"❌ 일정 알림 전송 실패: {user_id} - {e}")
            return False
    
    def send_lunch_recommendation(self, user_ids: List[str], recommendation_data: dict) -> int:
        """점심 추천 알림 전송"""
        try:
            message = f"새로운 점심 추천: {recommendation_data.get('restaurant_name', '식당')}"
            
            return self.send_bulk_notification(
                user_ids, 'lunch_recommendation', message, recommendation_data, 'normal'
            )
            
        except Exception as e:
            logger.error(f"❌ 점심 추천 알림 전송 실패: {e}")
            return 0
    
    def get_user_notifications(self, user_id: str, limit: int = 50) -> List[dict]:
        """사용자의 알림 히스토리 조회"""
        try:
            # 데이터베이스에서 알림 조회
            notifications = self.get_notifications_from_db(user_id, limit)
            return notifications
        except Exception as e:
            logger.error(f"❌ 알림 히스토리 조회 실패: {user_id} - {e}")
            return []
    
    def mark_notification_as_read(self, notification_id: str, user_id: str) -> bool:
        """알림을 읽음으로 표시"""
        try:
            # 데이터베이스에서 알림 읽음 처리
            success = self.update_notification_read_status(notification_id, user_id)
            
            if success:
                logger.info(f"✅ 알림 읽음 처리 완료: {notification_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"❌ 알림 읽음 처리 실패: {notification_id} - {e}")
            return False
    
    def get_online_users(self) -> List[str]:
        """현재 온라인 사용자 목록 반환"""
        return list(self.active_users)
    
    def get_user_session(self, user_id: str) -> Optional[str]:
        """사용자의 세션 ID 반환"""
        return self.user_sessions.get(user_id)
    
    def is_user_online(self, user_id: str) -> bool:
        """사용자 온라인 상태 확인"""
        return user_id in self.active_users
    
    # 데이터베이스 관련 메서드들 (구현 필요)
    def save_notification_to_db(self, user_id: str, notification: dict) -> bool:
        """알림을 데이터베이스에 저장"""
        # TODO: 실제 데이터베이스 저장 로직 구현
        logger.debug(f"💾 알림 저장: {user_id} - {notification['id']}")
        return True
    
    def get_notifications_from_db(self, user_id: str, limit: int) -> List[dict]:
        """데이터베이스에서 알림 조회"""
        # TODO: 실제 데이터베이스 조회 로직 구현
        logger.debug(f"📖 알림 조회: {user_id} - {limit}개")
        return []
    
    def update_notification_read_status(self, notification_id: str, user_id: str) -> bool:
        """알림 읽음 상태 업데이트"""
        # TODO: 실제 데이터베이스 업데이트 로직 구현
        logger.debug(f"✅ 알림 읽음 상태 업데이트: {notification_id}")
        return True
    
    def get_party_participants(self, party_id: int) -> List[str]:
        """파티 참여자 목록 조회"""
        # TODO: 실제 데이터베이스 조회 로직 구현
        logger.debug(f"👥 파티 참여자 조회: {party_id}")
        return []

# 개발 환경에서 테스트용 함수
if __name__ == '__main__':
    print("🧪 알림 시스템 테스트")
    
    # Mock 객체로 테스트
    class MockSocketIO:
        def emit(self, event, data, room=None):
            print(f"📡 Socket.IO 이벤트: {event} -> {data}")
    
    class MockDB:
        pass
    
    # 테스트 실행
    mock_socketio = MockSocketIO()
    mock_db = MockDB()
    
    notification_system = NotificationSystem(mock_socketio, mock_db)
    
    # 알림 전송 테스트
    test_notification = notification_system.send_notification(
        'user123', 'party_invite', '새로운 파티에 초대되었습니다!'
    )
    
    print(f"알림 전송 테스트 결과: {test_notification}")
    
    # 온라인 사용자 확인
    online_users = notification_system.get_online_users()
    print(f"온라인 사용자: {online_users}")
