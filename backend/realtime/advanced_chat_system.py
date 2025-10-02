"""
고급 실시간 채팅 시스템
WebSocket을 사용한 고급 채팅 기능들을 제공합니다.
"""

from flask_socketio import emit
from backend.app.extensions import db
from backend.models.app_models import (
    MessageStatus, MessageReaction, MessageSearchIndex, ChatMessage, ChatRoomMember
)
from datetime import datetime

class AdvancedChatSystem:
    """고급 실시간 채팅 시스템"""

    def __init__(self, socketio):
        self.socketio = socketio
        self.setup_event_handlers()

    def setup_event_handlers(self):
        """WebSocket 이벤트 핸들러 설정"""

        @self.socketio.on("typing_start")
        def handle_typing_start(data):
            """타이핑 시작 이벤트"""
            try:
                chat_type = data.get("chat_type")
                chat_id = data.get("chat_id")
                user_id = data.get("user_id")
                user_nickname = data.get("user_nickname")

                if not all([chat_type, chat_id, user_id, user_nickname]):
                    return

                room = f"{chat_type}_{chat_id}"
                typing_data = {
                    "user_id": user_id,
                    "user_nickname": user_nickname,
                    "is_typing": True,
                    "timestamp": datetime.utcnow().isoformat()
                }

                # 자신을 제외한 다른 사용자들에게 타이핑 상태 전송
                emit("user_typing", typing_data, room=room, include_self=False)
                print(f"User {user_nickname} started typing in {room}")

            except Exception as e:
                print(f"Error in typing_start: {e}")

        @self.socketio.on("typing_stop")
        def handle_typing_stop(data):
            """타이핑 중지 이벤트"""
            try:
                chat_type = data.get("chat_type")
                chat_id = data.get("chat_id")
                user_id = data.get("user_id")
                user_nickname = data.get("user_nickname")

                if not all([chat_type, chat_id, user_id, user_nickname]):
                    return

                room = f"{chat_type}_{chat_id}"
                typing_data = {
                    "user_id": user_id,
                    "user_nickname": user_nickname,
                    "is_typing": False,
                    "timestamp": datetime.utcnow().isoformat()
                }

                # 자신을 제외한 다른 사용자들에게 타이핑 중지 상태 전송
                emit("user_typing", typing_data, room=room, include_self=False)
                print(f"User {user_nickname} stopped typing in {room}")

            except Exception as e:
                print(f"Error in typing_stop: {e}")

        @self.socketio.on("mark_message_read")
        def handle_mark_message_read(data):
            """메시지 읽음 처리"""
            try:
                message_id = data.get("message_id")
                user_id = data.get("user_id")
                chat_type = data.get("chat_type")
                chat_id = data.get("chat_id")

                if not all([message_id, user_id, chat_type, chat_id]):
                    return

                # 읽음 상태 업데이트
                message_status = MessageStatus.query.filter_by(
                    message_id=message_id,
                    user_id=user_id
                ).first()

                if message_status:
                    message_status.is_read = True
                    message_status.read_at = datetime.utcnow()
                else:
                    message_status = MessageStatus(
                        message_id=message_id,
                        user_id=user_id,
                        is_read=True,
                        read_at=datetime.utcnow()
                    )
                    db.session.add(message_status)

                db.session.commit()

                # 읽음 상태를 채팅방에 브로드캐스트
                room = f"{chat_type}_{chat_id}"
                read_data = {
                    "message_id": message_id,
                    "user_id": user_id,
                    "read_at": message_status.read_at.isoformat()
                }
                emit("message_read", read_data, room=room)

                print(f"Message {message_id} marked as read by {user_id}")

            except Exception as e:
                print(f"Error in mark_message_read: {e}")
                db.session.rollback()

        @self.socketio.on("add_message_reaction")
        def handle_add_message_reaction(data):
            """메시지 반응 추가/제거"""
            try:
                message_id = data.get("message_id")
                user_id = data.get("user_id")
                reaction_type = data.get("reaction_type")
                chat_type = data.get("chat_type")
                chat_id = data.get("chat_id")

                if not all([message_id, user_id, reaction_type, chat_type, chat_id]):
                    return

                # 기존 반응 확인
                existing_reaction = MessageReaction.query.filter_by(
                    message_id=message_id,
                    user_id=user_id,
                    reaction_type=reaction_type
                ).first()

                action = "removed"
                if existing_reaction:
                    # 이미 같은 반응이 있으면 제거
                    db.session.delete(existing_reaction)
                else:
                    # 새로운 반응 추가
                    reaction = MessageReaction(
                        message_id=message_id,
                        user_id=user_id,
                        reaction_type=reaction_type
                    )
                    db.session.add(reaction)
                    action = "added"

                db.session.commit()

                # 반응 상태를 채팅방에 브로드캐스트
                room = f"{chat_type}_{chat_id}"
                reaction_data = {
                    "message_id": message_id,
                    "user_id": user_id,
                    "reaction_type": reaction_type,
                    "action": action,
                    "timestamp": datetime.utcnow().isoformat()
                }
                emit("message_reaction", reaction_data, room=room)

                print(f"Reaction {reaction_type} {action} by {user_id} on message {message_id}")

            except Exception as e:
                print(f"Error in add_message_reaction: {e}")
                db.session.rollback()

        @self.socketio.on("edit_message")
        def handle_edit_message(data):
            """메시지 수정"""
            try:
                message_id = data.get("message_id")
                user_id = data.get("user_id")
                new_content = data.get("content")
                chat_type = data.get("chat_type")
                chat_id = data.get("chat_id")

                if not all([message_id, user_id, new_content, chat_type, chat_id]):
                    return

                # 메시지 조회 및 권한 확인
                message = ChatMessage.query.get(message_id)
                if not message or message.sender_employee_id != user_id:
                    emit("error", {"message": "메시지를 수정할 권한이 없습니다."})
                    return

                # 메시지 수정
                message.message = new_content
                message.is_edited = True
                message.edited_at = datetime.utcnow()

                # 검색 인덱스 업데이트
                search_index = MessageSearchIndex.query.filter_by(message_id=message_id).first()
                if search_index:
                    search_index.search_text = new_content

                db.session.commit()

                # 수정된 메시지를 채팅방에 브로드캐스트
                room = f"{chat_type}_{chat_id}"
                edit_data = {
                    "message_id": message_id,
                    "content": new_content,
                    "edited_at": message.edited_at.isoformat(),
                    "edited_by": user_id
                }
                emit("message_edited", edit_data, room=room)

                print(f"Message {message_id} edited by {user_id}")

            except Exception as e:
                print(f"Error in edit_message: {e}")
                db.session.rollback()

        @self.socketio.on("delete_message")
        def handle_delete_message(data):
            """메시지 삭제 (소프트 삭제)"""
            try:
                message_id = data.get("message_id")
                user_id = data.get("user_id")
                chat_type = data.get("chat_type")
                chat_id = data.get("chat_id")

                if not all([message_id, user_id, chat_type, chat_id]):
                    return

                # 메시지 조회 및 권한 확인
                message = ChatMessage.query.get(message_id)
                if not message or message.sender_employee_id != user_id:
                    emit("error", {"message": "메시지를 삭제할 권한이 없습니다."})
                    return

                # 소프트 삭제
                message.is_deleted = True
                message.deleted_at = datetime.utcnow()
                message.message = "[삭제된 메시지입니다]"

                db.session.commit()

                # 삭제된 메시지를 채팅방에 브로드캐스트
                room = f"{chat_type}_{chat_id}"
                delete_data = {
                    "message_id": message_id,
                    "deleted_by": user_id,
                    "deleted_at": message.deleted_at.isoformat()
                }
                emit("message_deleted", delete_data, room=room)

                print(f"Message {message_id} deleted by {user_id}")

            except Exception as e:
                print(f"Error in delete_message: {e}")
                db.session.rollback()

        @self.socketio.on("user_online")
        def handle_user_online(data):
            """사용자 온라인 상태"""
            try:
                user_id = data.get("user_id")
                user_nickname = data.get("user_nickname")

                if not all([user_id, user_nickname]):
                    return

                # 온라인 상태를 모든 채팅방에 브로드캐스트
                online_data = {
                    "user_id": user_id,
                    "user_nickname": user_nickname,
                    "is_online": True,
                    "timestamp": datetime.utcnow().isoformat()
                }

                # 사용자가 참여한 모든 채팅방에 알림
                user_chats = ChatRoomMember.query.filter_by(
                    user_id=user_id,
                    is_left=False
                ).all()

                for chat in user_chats:
                    room = f"{chat.chat_type}_{chat.chat_id}"
                    emit("user_status_changed", online_data, room=room)

                print(f"User {user_nickname} is now online")

            except Exception as e:
                print(f"Error in user_online: {e}")

        @self.socketio.on("user_offline")
        def handle_user_offline(data):
            """사용자 오프라인 상태"""
            try:
                user_id = data.get("user_id")
                user_nickname = data.get("user_nickname")

                if not all([user_id, user_nickname]):
                    return

                # 오프라인 상태를 모든 채팅방에 브로드캐스트
                offline_data = {
                    "user_id": user_id,
                    "user_nickname": user_nickname,
                    "is_online": False,
                    "timestamp": datetime.utcnow().isoformat()
                }

                # 사용자가 참여한 모든 채팅방에 알림
                user_chats = ChatRoomMember.query.filter_by(
                    user_id=user_id,
                    is_left=False
                ).all()

                for chat in user_chats:
                    room = f"{chat.chat_type}_{chat.chat_id}"
                    emit("user_status_changed", offline_data, room=room)

                print(f"User {user_nickname} is now offline")

            except Exception as e:
                print(f"Error in user_offline: {e}")

    def get_system_info(self):
        """시스템 정보 반환"""
        return {
            "name": "Advanced Chat System",
            "version": "1.0.0",
            "features": [
                "실시간 타이핑 인디케이터",
                "메시지 읽음 상태 관리",
                "메시지 반응 시스템",
                "메시지 수정/삭제",
                "사용자 온라인/오프라인 상태",
                "실시간 알림 시스템"
            ]
        }
