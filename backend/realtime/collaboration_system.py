"""
실시간 협업 시스템
여러 사용자가 동시에 파티 계획을 수정하거나 일정을 조율할 수 있는 기능
"""
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Set, Any
from flask_socketio import emit, join_room, leave_room
from flask import request, current_app
from dataclasses import dataclass, asdict
from enum import Enum

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CollaborationType(Enum):
    """협업 타입"""
    PARTY_PLANNING = "party_planning"
    SCHEDULE_COORDINATION = "schedule_coordination"
    RESTAURANT_SELECTION = "restaurant_selection"
    GROUP_DISCUSSION = "group_discussion"

class UserAction(Enum):
    """사용자 액션"""
    JOIN = "join"
    LEAVE = "leave"
    UPDATE = "update"
    COMMENT = "comment"
    VOTE = "vote"
    SUGGEST = "suggest"

@dataclass
class CollaborationSession:
    """협업 세션 정보"""
    session_id: str
    type: CollaborationType
    title: str
    participants: Set[str]
    created_by: str
    created_at: datetime
    last_activity: datetime
    is_active: bool = True
    metadata: Dict[str, Any] = None
    
    def to_dict(self):
        """딕셔너리로 변환"""
        data = asdict(self)
        data['participants'] = list(self.participants)
        data['type'] = self.type.value
        data['created_at'] = self.created_at.isoformat()
        data['last_activity'] = self.last_activity.isoformat()
        return data

@dataclass
class UserActivity:
    """사용자 활동 정보"""
    user_id: str
    action: UserAction
    timestamp: datetime
    data: Dict[str, Any] = None
    session_id: str = None
    
    def to_dict(self):
        """딕셔너리로 변환"""
        data = asdict(self)
        data['action'] = self.action.value
        data['timestamp'] = self.timestamp.isoformat()
        return data

class CollaborationSystem:
    """실시간 협업 시스템"""
    
    def __init__(self, socketio, db):
        self.socketio = socketio
        self.db = db
        self.active_sessions: Dict[str, CollaborationSession] = {}
        self.user_sessions: Dict[str, Set[str]] = {}  # user_id -> session_ids
        self.session_activities: Dict[str, List[UserActivity]] = {}  # session_id -> activities
        
        # 협업 타입별 설정
        self.collaboration_configs = {
            CollaborationType.PARTY_PLANNING: {
                'max_participants': 20,
                'auto_close_minutes': 120,  # 2시간 후 자동 종료
                'allow_anonymous': False
            },
            CollaborationType.SCHEDULE_COORDINATION: {
                'max_participants': 50,
                'auto_close_minutes': 60,   # 1시간 후 자동 종료
                'allow_anonymous': True
            },
            CollaborationType.RESTAURANT_SELECTION: {
                'max_participants': 15,
                'auto_close_minutes': 30,   # 30분 후 자동 종료
                'allow_anonymous': False
            },
            CollaborationType.GROUP_DISCUSSION: {
                'max_participants': 100,
                'auto_close_minutes': 180,  # 3시간 후 자동 종료
                'allow_anonymous': True
            }
        }
    
    def setup_socket_events(self):
        """Socket.IO 이벤트 핸들러 설정"""
        
        @self.socketio.on('join_collaboration')
        def handle_join_collaboration(data):
            """협업 세션 참가"""
            try:
                session_id = data.get('session_id')
                user_id = data.get('user_id')
                user_name = data.get('user_name', 'Unknown User')
                
                if not session_id or not user_id:
                    emit('collaboration_error', {'message': '세션 ID와 사용자 ID가 필요합니다.'})
                    return
                
                # 세션 참가 처리
                success = self.join_session(session_id, user_id, user_name)
                
                if success:
                    # 세션 방에 참가
                    join_room(f"collab_{session_id}")
                    
                    # 참가 성공 응답
                    emit('collaboration_joined', {
                        'session_id': session_id,
                        'user_id': user_id,
                        'timestamp': datetime.now().isoformat()
                    })
                    
                    # 다른 참가자들에게 참가 알림
                    self.socketio.emit('user_joined_collaboration', {
                        'session_id': session_id,
                        'user_id': user_id,
                        'user_name': user_name,
                        'timestamp': datetime.now().isoformat()
                    }, room=f"collab_{session_id}")
                    
                    logger.info(f"✅ 사용자 협업 세션 참가: {user_id} -> {session_id}")
                else:
                    emit('collaboration_error', {'message': '세션 참가에 실패했습니다.'})
                
            except Exception as e:
                logger.error(f"❌ 협업 세션 참가 실패: {e}")
                emit('collaboration_error', {'message': '세션 참가 중 오류가 발생했습니다.'})
        
        @self.socketio.on('leave_collaboration')
        def handle_leave_collaboration(data):
            """협업 세션 나가기"""
            try:
                session_id = data.get('session_id')
                user_id = data.get('user_id')
                
                if not session_id or not user_id:
                    emit('collaboration_error', {'message': '세션 ID와 사용자 ID가 필요합니다.'})
                    return
                
                # 세션 나가기 처리
                success = self.leave_session(session_id, user_id)
                
                if success:
                    # 세션 방에서 나가기
                    leave_room(f"collab_{session_id}")
                    
                    # 나가기 성공 응답
                    emit('collaboration_left', {
                        'session_id': session_id,
                        'user_id': user_id,
                        'timestamp': datetime.now().isoformat()
                    })
                    
                    # 다른 참가자들에게 나가기 알림
                    self.socketio.emit('user_left_collaboration', {
                        'session_id': session_id,
                        'user_id': user_id,
                        'timestamp': datetime.now().isoformat()
                    }, room=f"collab_{session_id}")
                    
                    logger.info(f"✅ 사용자 협업 세션 나가기: {user_id} -> {session_id}")
                else:
                    emit('collaboration_error', {'message': '세션 나가기에 실패했습니다.'})
                
            except Exception as e:
                logger.error(f"❌ 협업 세션 나가기 실패: {e}")
                emit('collaboration_error', {'message': '세션 나가기 중 오류가 발생했습니다.'})
        
        @self.socketio.on('collaboration_update')
        def handle_collaboration_update(data):
            """협업 내용 업데이트"""
            try:
                session_id = data.get('session_id')
                user_id = data.get('user_id')
                update_type = data.get('update_type')
                update_data = data.get('update_data', {})
                
                if not all([session_id, user_id, update_type]):
                    emit('collaboration_error', {'message': '필수 정보가 누락되었습니다.'})
                    return
                
                # 업데이트 처리
                success = self.process_update(session_id, user_id, update_type, update_data)
                
                if success:
                    # 업데이트 성공 응답
                    emit('collaboration_updated', {
                        'session_id': session_id,
                        'update_type': update_type,
                        'timestamp': datetime.now().isoformat()
                    })
                    
                    # 다른 참가자들에게 업데이트 알림
                    self.socketio.emit('collaboration_content_updated', {
                        'session_id': session_id,
                        'user_id': user_id,
                        'update_type': update_type,
                        'update_data': update_data,
                        'timestamp': datetime.now().isoformat()
                    }, room=f"collab_{session_id}")
                    
                    logger.info(f"✅ 협업 내용 업데이트: {session_id} - {update_type}")
                else:
                    emit('collaboration_error', {'message': '업데이트에 실패했습니다.'})
                
            except Exception as e:
                logger.error(f"❌ 협업 내용 업데이트 실패: {e}")
                emit('collaboration_error', {'message': '업데이트 중 오류가 발생했습니다.'})
        
        @self.socketio.on('collaboration_comment')
        def handle_collaboration_comment(data):
            """협업 댓글 추가"""
            try:
                session_id = data.get('session_id')
                user_id = data.get('user_id')
                user_name = data.get('user_name', 'Unknown User')
                comment = data.get('comment', '')
                
                if not all([session_id, user_id, comment]):
                    emit('collaboration_error', {'message': '댓글 내용이 필요합니다.'})
                    return
                
                # 댓글 처리
                success = self.add_comment(session_id, user_id, user_name, comment)
                
                if success:
                    # 댓글 성공 응답
                    emit('comment_added', {
                        'session_id': session_id,
                        'comment_id': f"comment_{datetime.now().timestamp()}",
                        'timestamp': datetime.now().isoformat()
                    })
                    
                    # 다른 참가자들에게 댓글 알림
                    self.socketio.emit('new_collaboration_comment', {
                        'session_id': session_id,
                        'user_id': user_id,
                        'user_name': user_name,
                        'comment': comment,
                        'timestamp': datetime.now().isoformat()
                    }, room=f"collab_{session_id}")
                    
                    logger.info(f"✅ 협업 댓글 추가: {session_id} - {user_id}")
                else:
                    emit('collaboration_error', {'message': '댓글 추가에 실패했습니다.'})
                
            except Exception as e:
                logger.error(f"❌ 협업 댓글 추가 실패: {e}")
                emit('collaboration_error', {'message': '댓글 추가 중 오류가 발생했습니다.'})
    
    def create_session(self, session_type: CollaborationType, title: str, 
                      created_by: str, metadata: Dict[str, Any] = None) -> Optional[str]:
        """새로운 협업 세션 생성"""
        try:
            session_id = f"collab_{datetime.now().timestamp()}_{created_by}"
            
            session = CollaborationSession(
                session_id=session_id,
                type=session_type,
                title=title,
                participants={created_by},
                created_by=created_by,
                created_at=datetime.now(),
                last_activity=datetime.now(),
                metadata=metadata or {}
            )
            
            # 세션 등록
            self.active_sessions[session_id] = session
            self.user_sessions.setdefault(created_by, set()).add(session_id)
            self.session_activities[session_id] = []
            
            logger.info(f"✅ 협업 세션 생성: {session_id} - {title}")
            return session_id
            
        except Exception as e:
            logger.error(f"❌ 협업 세션 생성 실패: {e}")
            return None
    
    def join_session(self, session_id: str, user_id: str, user_name: str) -> bool:
        """협업 세션 참가"""
        try:
            if session_id not in self.active_sessions:
                logger.warning(f"⚠️ 존재하지 않는 세션: {session_id}")
                return False
            
            session = self.active_sessions[session_id]
            
            # 참가자 수 제한 확인
            config = self.collaboration_configs.get(session.type)
            if config and len(session.participants) >= config['max_participants']:
                logger.warning(f"⚠️ 세션 참가자 수 제한: {session_id}")
                return False
            
            # 세션 참가
            session.participants.add(user_id)
            session.last_activity = datetime.now()
            
            # 사용자 세션 등록
            self.user_sessions.setdefault(user_id, set()).add(session_id)
            
            # 활동 기록
            activity = UserActivity(
                user_id=user_id,
                action=UserAction.JOIN,
                timestamp=datetime.now(),
                session_id=session_id
            )
            self.session_activities[session_id].append(activity)
            
            logger.info(f"✅ 세션 참가 성공: {user_id} -> {session_id}")
            return True
            
        except Exception as e:
            logger.error(f"❌ 세션 참가 실패: {e}")
            return False
    
    def leave_session(self, session_id: str, user_id: str) -> bool:
        """협업 세션 나가기"""
        try:
            if session_id not in self.active_sessions:
                return False
            
            session = self.active_sessions[session_id]
            
            # 세션 나가기
            session.participants.discard(user_id)
            session.last_activity = datetime.now()
            
            # 사용자 세션 제거
            if user_id in self.user_sessions:
                self.user_sessions[user_id].discard(session_id)
                if not self.user_sessions[user_id]:
                    del self.user_sessions[user_id]
            
            # 활동 기록
            activity = UserActivity(
                user_id=user_id,
                action=UserAction.LEAVE,
                timestamp=datetime.now(),
                session_id=session_id
            )
            self.session_activities[session_id].append(activity)
            
            # 세션이 비어있으면 자동 종료
            if not session.participants:
                self.close_session(session_id)
            
            logger.info(f"✅ 세션 나가기 성공: {user_id} -> {session_id}")
            return True
            
        except Exception as e:
            logger.error(f"❌ 세션 나가기 실패: {e}")
            return False
    
    def process_update(self, session_id: str, user_id: str, 
                      update_type: str, update_data: Dict[str, Any]) -> bool:
        """협업 내용 업데이트 처리"""
        try:
            if session_id not in self.active_sessions:
                return False
            
            session = self.active_sessions[session_id]
            
            # 세션 활성화 상태 확인
            if not session.is_active:
                return False
            
            # 활동 기록
            activity = UserActivity(
                user_id=user_id,
                action=UserAction.UPDATE,
                timestamp=datetime.now(),
                data={'update_type': update_type, 'update_data': update_data},
                session_id=session_id
            )
            self.session_activities[session_id].append(activity)
            
            # 세션 활동 시간 업데이트
            session.last_activity = datetime.now()
            
            logger.info(f"✅ 업데이트 처리 성공: {session_id} - {update_type}")
            return True
            
        except Exception as e:
            logger.error(f"❌ 업데이트 처리 실패: {e}")
            return False
    
    def add_comment(self, session_id: str, user_id: str, 
                   user_name: str, comment: str) -> bool:
        """협업 댓글 추가"""
        try:
            if session_id not in self.active_sessions:
                return False
            
            session = self.active_sessions[session_id]
            
            # 활동 기록
            activity = UserActivity(
                user_id=user_id,
                action=UserAction.COMMENT,
                timestamp=datetime.now(),
                data={'comment': comment, 'user_name': user_name},
                session_id=session_id
            )
            self.session_activities[session_id].append(activity)
            
            # 세션 활동 시간 업데이트
            session.last_activity = datetime.now()
            
            logger.info(f"✅ 댓글 추가 성공: {session_id} - {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"❌ 댓글 추가 실패: {e}")
            return False
    
    def close_session(self, session_id: str) -> bool:
        """협업 세션 종료"""
        try:
            if session_id not in self.active_sessions:
                return False
            
            session = self.active_sessions[session_id]
            session.is_active = False
            
            # 세션 참가자들에게 종료 알림
            self.socketio.emit('collaboration_session_closed', {
                'session_id': session_id,
                'reason': '자동 종료',
                'timestamp': datetime.now().isoformat()
            }, room=f"collab_{session_id}")
            
            # 세션 정리
            del self.active_sessions[session_id]
            if session_id in self.session_activities:
                del self.session_activities[session_id]
            
            logger.info(f"✅ 세션 종료: {session_id}")
            return True
            
        except Exception as e:
            logger.error(f"❌ 세션 종료 실패: {e}")
            return False
    
    def get_session_info(self, session_id: str) -> Optional[Dict[str, Any]]:
        """세션 정보 조회"""
        if session_id not in self.active_sessions:
            return None
        
        session = self.active_sessions[session_id]
        return session.to_dict()
    
    def get_user_sessions(self, user_id: str) -> List[Dict[str, Any]]:
        """사용자가 참가 중인 세션 목록"""
        if user_id not in self.user_sessions:
            return []
        
        sessions = []
        for session_id in self.user_sessions[user_id]:
            if session_id in self.active_sessions:
                sessions.append(self.active_sessions[session_id].to_dict())
        
        return sessions
    
    def get_session_activities(self, session_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """세션 활동 내역 조회"""
        if session_id not in self.session_activities:
            return []
        
        activities = self.session_activities[session_id][-limit:]
        return [activity.to_dict() for activity in activities]
    
    def cleanup_inactive_sessions(self):
        """비활성 세션 정리"""
        current_time = datetime.now()
        sessions_to_close = []
        
        for session_id, session in self.active_sessions.items():
            if not session.is_active:
                continue
            
            config = self.collaboration_configs.get(session.type)
            if config:
                auto_close_minutes = config['auto_close_minutes']
                if (current_time - session.last_activity).total_seconds() > (auto_close_minutes * 60):
                    sessions_to_close.append(session_id)
        
        for session_id in sessions_to_close:
            self.close_session(session_id)
        
        if sessions_to_close:
            logger.info(f"🧹 비활성 세션 정리 완료: {len(sessions_to_close)}개")

# 개발 환경에서 테스트용 함수
if __name__ == '__main__':
    print("🧪 협업 시스템 테스트")
    
    # Mock 객체로 테스트
    class MockSocketIO:
        def emit(self, event, data, room=None):
            print(f"📡 Socket.IO 이벤트: {event} -> {data}")
    
    class MockDB:
        pass
    
    # 테스트 실행
    mock_socketio = MockSocketIO()
    mock_db = MockDB()
    
    collaboration_system = CollaborationSystem(mock_socketio, mock_db)
    
    # 세션 생성 테스트
    session_id = collaboration_system.create_session(
        CollaborationType.PARTY_PLANNING,
        "점심 파티 계획",
        "user123"
    )
    
    if session_id:
        print(f"✅ 세션 생성 성공: {session_id}")
        
        # 세션 참가 테스트
        success = collaboration_system.join_session(session_id, "user456", "테스트사용자")
        print(f"세션 참가 테스트 결과: {success}")
        
        # 세션 정보 조회
        session_info = collaboration_system.get_session_info(session_id)
        print(f"세션 정보: {session_info}")
    else:
        print("❌ 세션 생성 실패")
