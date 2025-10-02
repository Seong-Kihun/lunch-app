from flask import Blueprint, jsonify, request
from sqlalchemy import desc, or_, and_, func
from backend.app.extensions import db
from backend.models.app_models import (
    ChatRoom, ChatMessage, ChatParticipant, Party, PartyMember,
    MessageStatus, MessageReaction, MessageAttachment, ChatRoomMember,
    ChatRoomSettings, NotificationSettings, ChatNotification, MessageSearchIndex
)
from backend.auth.models import User
from datetime import datetime, timedelta
import random
import os
import uuid
from werkzeug.utils import secure_filename
# Blueprint 생성
chats_bp = Blueprint('chats', __name__)

# 인증 미들웨어는 UnifiedBlueprintManager에서 중앙 관리됨

def get_seoul_today():
    """한국 시간의 오늘 날짜를 datetime.date 타입으로 반환"""
    korean_time = datetime.now() + timedelta(hours=9)
    return korean_time.date()

@chats_bp.route("/chats/<employee_id>", methods=["GET"])
def get_user_chats(employee_id):
    """사용자의 채팅방 목록 조회"""
    try:
        # 사용자가 참여한 채팅방들
        user_chats = ChatRoom.query.join(ChatParticipant).filter(
            ChatParticipant.user_id == employee_id
        ).all()
        
        chats_data = []
        for chat in user_chats:
            # 마지막 메시지 조회
            last_message = ChatMessage.query.filter_by(
                chat_type=chat.type, 
                chat_id=chat.id
            ).order_by(desc(ChatMessage.created_at)).first()
            
            # 참여자 수
            participant_count = ChatParticipant.query.filter_by(
                room_id=chat.id
            ).count()
            
            chat_info = {
                "id": chat.id,
                "type": chat.type,
                "name": chat.name,
                "last_message_content": last_message.message if last_message else "",
                "last_message_sender": last_message.sender_employee_id if last_message else None,
                "last_message_timestamp": last_message.created_at.isoformat() if last_message else None,
                "participant_count": participant_count,
                "created_at": chat.created_at.isoformat() if chat.created_at else None
            }
            chats_data.append(chat_info)
        
        return jsonify({
            "success": True,
            "chats": chats_data
        })
        
    except Exception as e:
        print(f"채팅방 목록 조회 오류: {e}")
        return jsonify({"error": str(e)}), 500

@chats_bp.route("/chat/messages/<chat_type>/<int:chat_id>", methods=["GET"])
def get_chat_messages(chat_type, chat_id):
    """채팅 메시지 조회"""
    try:
        page = request.args.get("page", 1, type=int)
        per_page = min(request.args.get("per_page", 50, type=int), 100)
        
        messages_query = ChatMessage.query.filter_by(
            chat_type=chat_type, 
            chat_id=chat_id
        ).order_by(desc(ChatMessage.created_at))
        
        total = messages_query.count()
        messages = messages_query.offset((page - 1) * per_page).limit(per_page).all()
        
        messages_data = []
        for message in messages:
            # 발신자 정보 조회
            sender = User.query.filter_by(employee_id=message.sender_employee_id).first()
            
            message_info = {
                "id": message.id,
                "content": message.message,
                "sender": {
                    "employee_id": message.sender_employee_id,
                    "nickname": message.sender_nickname if message.sender_nickname else (sender.nickname if sender else "알 수 없음")
                },
                "created_at": message.created_at.isoformat() if message.created_at else None,
                "message_type": message.message_type or "text"
            }
            messages_data.append(message_info)
        
        return jsonify({
            "success": True,
            "messages": messages_data,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "pages": (total + per_page - 1) // per_page
            }
        })
        
    except Exception as e:
        print(f"채팅 메시지 조회 오류: {e}")
        return jsonify({"error": str(e)}), 500

@chats_bp.route("/chat/messages", methods=["POST"])
def send_chat_message():
    """채팅 메시지 전송"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "메시지 데이터가 없습니다."}), 400
        
        required_fields = ["chat_type", "chat_id", "sender_id", "content"]
        for field in required_fields:
            if not data.get(field):
                return jsonify({"error": f"{field}는 필수입니다."}), 400
        
        new_message = ChatMessage(
            chat_type=data["chat_type"],
            chat_id=data["chat_id"],
            sender_employee_id=data["sender_id"],
            sender_nickname=data.get("sender_nickname", "사용자"),
            message=data["content"],
            message_type=data.get("message_type", "text")
        )
        
        db.session.add(new_message)
        db.session.flush()  # ID를 얻기 위해 flush
        
        # 검색 인덱스 생성
        search_index = MessageSearchIndex(
            message_id=new_message.id,
            chat_type=data["chat_type"],
            chat_id=data["chat_id"],
            search_text=data["content"]
        )
        db.session.add(search_index)
        
        db.session.commit()
        
        return jsonify({
            "message": "메시지가 전송되었습니다!",
            "message_id": new_message.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"메시지 전송 오류: {e}")
        return jsonify({"error": str(e)}), 500

@chats_bp.route("/chat/messages/read", methods=["POST"])
def mark_messages_read():
    """메시지를 읽음으로 표시"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "데이터가 없습니다."}), 400
        
        employee_id = data.get("employee_id")
        chat_type = data.get("chat_type")
        chat_id = data.get("chat_id")
        
        if not all([employee_id, chat_type, chat_id]):
            return jsonify({"error": "모든 필드가 필요합니다."}), 400
        
        # 읽지 않은 메시지들을 읽음으로 표시
        unread_messages = ChatMessage.query.filter(
            and_(
                ChatMessage.chat_type == chat_type,
                ChatMessage.chat_id == chat_id,
                ChatMessage.sender_id != employee_id
            )
        ).all()
        
        for message in unread_messages:
            message.is_read = True
        
        db.session.commit()
        
        return jsonify({
            "message": f"{len(unread_messages)}개의 메시지를 읽음으로 표시했습니다.",
            "read_count": len(unread_messages)
        })
        
    except Exception as e:
        db.session.rollback()
        print(f"메시지 읽음 표시 오류: {e}")
        return jsonify({"error": str(e)}), 500

@chats_bp.route("/chat/messages/search", methods=["GET"])
def search_chat_messages():
    """채팅 메시지 검색"""
    try:
        query = request.args.get("q", "")
        chat_type = request.args.get("chat_type")
        chat_id = request.args.get("chat_id")
        
        if not query:
            return jsonify({"error": "검색어가 필요합니다."}), 400
        
        messages_query = ChatMessage.query
        
        if chat_type and chat_id:
            messages_query = messages_query.filter(
                and_(
                    ChatMessage.chat_type == chat_type,
                    ChatMessage.chat_id == chat_id
                )
            )
        
        messages = messages_query.filter(
            ChatMessage.content.ilike(f"%{query}%")
        ).order_by(desc(ChatMessage.created_at)).limit(20).all()
        
        messages_data = []
        for message in messages:
            message_info = {
                "id": message.id,
                "chat_type": message.chat_type,
                "chat_id": message.chat_id,
                "sender_id": message.sender_id,
                "content": message.content,
                "created_at": message.created_at.isoformat() if message.created_at else None
            }
            messages_data.append(message_info)
        
        return jsonify({
            "results": messages_data,
            "total": len(messages_data)
        })
        
    except Exception as e:
        print(f"메시지 검색 오류: {e}")
        return jsonify({"error": str(e)}), 500

@chats_bp.route("/chat/room/title", methods=["PUT"])
def update_chat_room_title():
    """채팅방 제목 수정"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "데이터가 없습니다."}), 400
        
        chat_type = data.get("chat_type")
        chat_id = data.get("chat_id")
        new_title = data.get("title")
        
        if not all([chat_type, chat_id, new_title]):
            return jsonify({"error": "모든 필드가 필요합니다."}), 400
        
        chat_room = ChatRoom.query.filter_by(
            type=chat_type, 
            id=chat_id
        ).first()
        
        if not chat_room:
            return jsonify({"error": "채팅방을 찾을 수 없습니다."}), 404
        
        chat_room.title = new_title
        db.session.commit()
        
        return jsonify({
            "message": "채팅방 제목이 수정되었습니다!",
            "new_title": new_title
        })
        
    except Exception as e:
        db.session.rollback()
        print(f"채팅방 제목 수정 오류: {e}")
        return jsonify({"error": str(e)}), 500

@chats_bp.route("/room/members/<chat_type>/<int:chat_id>", methods=["GET"])
def get_chat_room_members(chat_type, chat_id):
    """채팅방 멤버 목록 조회"""
    try:
        participants = ChatParticipant.query.filter_by(
            chat_type=chat_type, 
            chat_id=chat_id
        ).all()
        
        members_data = []
        for participant in participants:
            user = User.query.filter_by(employee_id=participant.employee_id).first()
            if user:
                member_info = {
                    "employee_id": participant.employee_id,
                    "name": user.name,
                    "nickname": user.nickname,
                    "joined_at": participant.created_at.isoformat() if participant.created_at else None
                }
                members_data.append(member_info)
        
        return jsonify({
            "members": members_data,
            "total": len(members_data)
        })
        
    except Exception as e:
        print(f"채팅방 멤버 조회 오류: {e}")
        return jsonify({"error": str(e)}), 500

@chats_bp.route("/chat/leave", methods=["POST"])
def leave_chat_room():
    """채팅방 나가기"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "데이터가 없습니다."}), 400
        
        employee_id = data.get("employee_id")
        chat_type = data.get("chat_type")
        chat_id = data.get("chat_id")
        
        if not all([employee_id, chat_type, chat_id]):
            return jsonify({"error": "모든 필드가 필요합니다."}), 400
        
        # 참여자 정보 찾기
        participant = ChatParticipant.query.filter_by(
            employee_id=employee_id,
            chat_type=chat_type,
            chat_id=chat_id
        ).first()
        
        if not participant:
            return jsonify({"error": "채팅방에 참여하지 않았습니다."}), 400
        
        # 채팅방 나가기
        db.session.delete(participant)
        db.session.commit()
        
        return jsonify({
            "message": "채팅방에서 나갔습니다.",
            "employee_id": employee_id
        })
        
    except Exception as e:
        db.session.rollback()
        print(f"채팅방 나가기 오류: {e}")
        return jsonify({"error": str(e)}), 500

@chats_bp.route("/chats/friends", methods=["POST"])
def create_friend_chat():
    """친구와의 1:1 채팅방 생성"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "데이터가 없습니다."}), 400
        
        user1_id = data.get("user1_id")
        user2_id = data.get("user2_id")
        
        if not all([user1_id, user2_id]):
            return jsonify({"error": "두 사용자 ID가 필요합니다."}), 400
        
        # 기존 채팅방이 있는지 확인
        existing_chat = ChatRoom.query.join(ChatParticipant).filter(
            and_(
                ChatRoom.type == "direct",
                ChatParticipant.employee_id.in_([user1_id, user2_id])
            )
        ).first()
        
        if existing_chat:
            return jsonify({
                "message": "이미 존재하는 채팅방입니다.",
                "chat_id": existing_chat.id
            })
        
        # 새 채팅방 생성
        new_chat = ChatRoom(
            type="direct",
            title=f"1:1 채팅"
        )
        db.session.add(new_chat)
        db.session.flush()
        
        # 참여자 추가
        participant1 = ChatParticipant(
            chat_type="direct",
            chat_id=new_chat.id,
            employee_id=user1_id
        )
        participant2 = ChatParticipant(
            chat_type="direct",
            chat_id=new_chat.id,
            employee_id=user2_id
        )
        
        db.session.add(participant1)
        db.session.add(participant2)
        db.session.commit()
        
        return jsonify({
            "message": "1:1 채팅방이 생성되었습니다!",
            "chat_id": new_chat.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"친구 채팅방 생성 오류: {e}")
        return jsonify({"error": str(e)}), 500

@chats_bp.route("/chat/create", methods=["POST"])
def create_group_chat():
    """그룹 채팅방 생성"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "데이터가 없습니다."}), 400
        
        title = data.get("title")
        employee_ids = data.get("employee_ids", [])
        
        if not title or not employee_ids:
            return jsonify({"error": "제목과 참여자 목록이 필요합니다."}), 400
        
        # 새 그룹 채팅방 생성
        new_chat = ChatRoom(
            type="group",
            title=title
        )
        db.session.add(new_chat)
        db.session.flush()
        
        # 참여자들 추가
        for employee_id in employee_ids:
            participant = ChatParticipant(
                chat_type="group",
                chat_id=new_chat.id,
                employee_id=employee_id
            )
            db.session.add(participant)
        
        db.session.commit()
        
        return jsonify({
            "message": "그룹 채팅방이 생성되었습니다!",
            "chat_id": new_chat.id,
            "title": title
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"그룹 채팅방 생성 오류: {e}")
        return jsonify({"error": str(e)}), 500

@chats_bp.route("/chats/filtered", methods=["GET"])
def get_filtered_chats():
    """필터링된 채팅방 목록 조회"""
    try:
        employee_id = request.args.get("employee_id")
        chat_type = request.args.get("type")
        
        if not employee_id:
            return jsonify({"error": "사용자 ID가 필요합니다."}), 400
        
        chats_query = ChatRoom.query.join(ChatParticipant).filter(
            ChatParticipant.employee_id == employee_id
        )
        
        if chat_type:
            chats_query = chats_query.filter(ChatRoom.type == chat_type)
        
        chats = chats_query.all()
        
        chats_data = []
        for chat in chats:
            # 마지막 메시지 조회
            last_message = ChatMessage.query.filter_by(
                chat_type=chat.type, 
                chat_id=chat.id
            ).order_by(desc(ChatMessage.created_at)).first()
            
            chat_info = {
                "id": chat.id,
                "type": chat.type,
                "title": chat.title,
                "last_message": last_message.content if last_message else "",
                "last_message_time": last_message.created_at.isoformat() if last_message else None,
                "created_at": chat.created_at.isoformat() if chat.created_at else None
            }
            chats_data.append(chat_info)
        
        return jsonify({
            "chats": chats_data,
            "total": len(chats_data)
        })
        
    except Exception as e:
        print(f"필터링된 채팅방 조회 오류: {e}")
        return jsonify({"error": str(e)}), 500

@chats_bp.route("/chats/<int:room_id>/suggest-dates", methods=["POST"])
def suggest_chat_dates(room_id):
    """채팅방에서 날짜 제안"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "데이터가 없습니다."}), 400
        
        suggested_date = data.get("suggested_date")
        suggested_by = data.get("suggested_by")
        
        if not all([suggested_date, suggested_by]):
            return jsonify({"error": "제안 날짜와 제안자가 필요합니다."}), 400
        
        # 날짜 제안 메시지 생성
        suggestion_message = ChatMessage(
            chat_type="group",
            chat_id=room_id,
            sender_id=suggested_by,
            content=f"📅 {suggested_date}에 만나요!",
            message_type="date_suggestion"
        )
        
        db.session.add(suggestion_message)
        db.session.commit()
        
        return jsonify({
            "message": "날짜가 제안되었습니다!",
            "suggested_date": suggested_date,
            "message_id": suggestion_message.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"날짜 제안 오류: {e}")
        return jsonify({"error": str(e)}), 500

# === 고급 채팅 기능 API들 ===

@chats_bp.route("/messages/<int:message_id>/read", methods=["POST"])
def mark_message_read(message_id):
    """메시지를 읽음으로 표시"""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({"error": "사용자 ID가 필요합니다."}), 400
        
        # 기존 읽음 상태 확인
        message_status = MessageStatus.query.filter_by(
            message_id=message_id,
            user_id=user_id
        ).first()
        
        if message_status:
            # 이미 읽음 상태면 업데이트
            message_status.is_read = True
            message_status.read_at = datetime.utcnow()
        else:
            # 새로운 읽음 상태 생성
            message_status = MessageStatus(
                message_id=message_id,
                user_id=user_id,
                is_read=True,
                read_at=datetime.utcnow()
            )
            db.session.add(message_status)
        
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "메시지가 읽음으로 표시되었습니다."
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@chats_bp.route("/messages/<int:message_id>/reaction", methods=["POST"])
def add_message_reaction(message_id):
    """메시지에 반응(이모지) 추가"""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        reaction_type = data.get('reaction_type')
        
        if not user_id or not reaction_type:
            return jsonify({"error": "사용자 ID와 반응 타입이 필요합니다."}), 400
        
        # 기존 반응 확인
        existing_reaction = MessageReaction.query.filter_by(
            message_id=message_id,
            user_id=user_id,
            reaction_type=reaction_type
        ).first()
        
        if existing_reaction:
            # 이미 같은 반응이 있으면 제거
            db.session.delete(existing_reaction)
            action = "removed"
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
        
        return jsonify({
            "success": True,
            "action": action,
            "message": f"반응이 {action}되었습니다."
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@chats_bp.route("/chat/messages/<int:message_id>/reactions", methods=["GET"])
def get_message_reactions(message_id):
    """메시지의 모든 반응 조회"""
    try:
        reactions = MessageReaction.query.filter_by(message_id=message_id).all()
        
        # 반응 타입별로 그룹화
        reaction_groups = {}
        for reaction in reactions:
            if reaction.reaction_type not in reaction_groups:
                reaction_groups[reaction.reaction_type] = []
            reaction_groups[reaction.reaction_type].append({
                "user_id": reaction.user_id,
                "created_at": reaction.created_at.isoformat()
            })
        
        return jsonify({
            "success": True,
            "reactions": reaction_groups
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@chats_bp.route("/chat/messages/<int:message_id>", methods=["PUT"])
def edit_message(message_id):
    """메시지 수정"""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        new_content = data.get('content')
        
        if not user_id or not new_content:
            return jsonify({"error": "사용자 ID와 수정할 내용이 필요합니다."}), 400
        
        # 메시지 조회
        message = ChatMessage.query.get(message_id)
        if not message:
            return jsonify({"error": "메시지를 찾을 수 없습니다."}), 404
        
        # 작성자 확인
        if message.sender_employee_id != user_id:
            return jsonify({"error": "메시지를 수정할 권한이 없습니다."}), 403
        
        # 메시지 수정
        message.message = new_content
        message.is_edited = True
        message.edited_at = datetime.utcnow()
        
        # 검색 인덱스 업데이트
        search_index = MessageSearchIndex.query.filter_by(message_id=message_id).first()
        if search_index:
            search_index.search_text = new_content
        
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "메시지가 수정되었습니다.",
            "edited_at": message.edited_at.isoformat()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@chats_bp.route("/chat/messages/<int:message_id>", methods=["DELETE"])
def delete_message(message_id):
    """메시지 삭제 (소프트 삭제)"""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({"error": "사용자 ID가 필요합니다."}), 400
        
        # 메시지 조회
        message = ChatMessage.query.get(message_id)
        if not message:
            return jsonify({"error": "메시지를 찾을 수 없습니다."}), 404
        
        # 작성자 확인
        if message.sender_employee_id != user_id:
            return jsonify({"error": "메시지를 삭제할 권한이 없습니다."}), 403
        
        # 소프트 삭제
        message.is_deleted = True
        message.deleted_at = datetime.utcnow()
        message.message = "[삭제된 메시지입니다]"
        
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "메시지가 삭제되었습니다."
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@chats_bp.route("/chat/search", methods=["GET"])
def search_messages():
    """메시지 검색"""
    try:
        chat_type = request.args.get('chat_type')
        chat_id = request.args.get('chat_id')
        query = request.args.get('q')
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        
        if not query:
            return jsonify({"error": "검색어가 필요합니다."}), 400
        
        # 검색 쿼리
        search_query = MessageSearchIndex.query.filter(
            MessageSearchIndex.search_text.contains(query)
        )
        
        if chat_type and chat_id:
            search_query = search_query.filter(
                MessageSearchIndex.chat_type == chat_type,
                MessageSearchIndex.chat_id == int(chat_id)
            )
        
        # 페이징
        search_results = search_query.order_by(
            desc(MessageSearchIndex.created_at)
        ).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        # 결과 포맷팅
        results = []
        for search_result in search_results.items:
            message = ChatMessage.query.get(search_result.message_id)
            if message and not message.is_deleted:
                results.append({
                    "message_id": message.id,
                    "chat_type": message.chat_type,
                    "chat_id": message.chat_id,
                    "sender_nickname": message.sender_nickname,
                    "message": message.message,
                    "created_at": message.created_at.isoformat(),
                    "is_edited": message.is_edited
                })
        
        return jsonify({
            "success": True,
            "results": results,
            "total": search_results.total,
            "page": page,
            "per_page": per_page,
            "pages": search_results.pages
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@chats_bp.route("/chat/rooms/<chat_type>/<int:chat_id>/members", methods=["GET"])
def get_chat_room_members_v2(chat_type, chat_id):
    """채팅방 멤버 목록 조회 (v2)"""
    try:
        members = ChatRoomMember.query.filter_by(
            chat_type=chat_type,
            chat_id=chat_id,
            is_left=False
        ).all()
        
        members_data = []
        for member in members:
            user = User.query.filter_by(employee_id=member.user_id).first()
            members_data.append({
                "user_id": member.user_id,
                "nickname": user.nickname if user else "알 수 없음",
                "role": member.role,
                "joined_at": member.joined_at.isoformat(),
                "is_muted": member.is_muted
            })
        
        return jsonify({
            "success": True,
            "members": members_data
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@chats_bp.route("/chat/rooms/<chat_type>/<int:chat_id>/members", methods=["POST"])
def add_chat_room_member(chat_type, chat_id):
    """채팅방에 멤버 추가"""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        added_by = data.get('added_by')
        
        if not user_id or not added_by:
            return jsonify({"error": "사용자 ID와 추가한 사용자 ID가 필요합니다."}), 400
        
        # 권한 확인 (관리자만 추가 가능)
        admin_member = ChatRoomMember.query.filter_by(
            chat_type=chat_type,
            chat_id=chat_id,
            user_id=added_by,
            role='admin'
        ).first()
        
        if not admin_member:
            return jsonify({"error": "채팅방에 멤버를 추가할 권한이 없습니다."}), 403
        
        # 이미 멤버인지 확인
        existing_member = ChatRoomMember.query.filter_by(
            chat_type=chat_type,
            chat_id=chat_id,
            user_id=user_id
        ).first()
        
        if existing_member:
            if existing_member.is_left:
                # 나갔다가 다시 들어오는 경우
                existing_member.is_left = False
                existing_member.left_at = None
                existing_member.joined_at = datetime.utcnow()
            else:
                return jsonify({"error": "이미 채팅방 멤버입니다."}), 400
        else:
            # 새로운 멤버 추가
            new_member = ChatRoomMember(
                chat_type=chat_type,
                chat_id=chat_id,
                user_id=user_id,
                role='member'
            )
            db.session.add(new_member)
        
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "멤버가 추가되었습니다."
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@chats_bp.route("/chat/rooms/<chat_type>/<int:chat_id>/members/<user_id>", methods=["DELETE"])
def remove_chat_room_member(chat_type, chat_id, user_id):
    """채팅방에서 멤버 제거"""
    try:
        data = request.get_json()
        removed_by = data.get('removed_by')
        
        if not removed_by:
            return jsonify({"error": "제거한 사용자 ID가 필요합니다."}), 400
        
        # 권한 확인
        admin_member = ChatRoomMember.query.filter_by(
            chat_type=chat_type,
            chat_id=chat_id,
            user_id=removed_by,
            role='admin'
        ).first()
        
        if not admin_member and removed_by != user_id:
            return jsonify({"error": "채팅방에서 멤버를 제거할 권한이 없습니다."}), 403
        
        # 멤버 조회
        member = ChatRoomMember.query.filter_by(
            chat_type=chat_type,
            chat_id=chat_id,
            user_id=user_id
        ).first()
        
        if not member:
            return jsonify({"error": "채팅방 멤버를 찾을 수 없습니다."}), 404
        
        # 소프트 삭제 (나가기)
        member.is_left = True
        member.left_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "멤버가 제거되었습니다."
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@chats_bp.route("/chat/rooms/<chat_type>/<int:chat_id>/settings", methods=["GET"])
def get_chat_room_settings(chat_type, chat_id):
    """채팅방 설정 조회"""
    try:
        settings = ChatRoomSettings.query.filter_by(
            chat_type=chat_type,
            chat_id=chat_id
        ).first()
        
        if not settings:
            # 기본 설정 생성
            settings = ChatRoomSettings(
                chat_type=chat_type,
                chat_id=chat_id
            )
            db.session.add(settings)
            db.session.commit()
        
        return jsonify({
            "success": True,
            "settings": {
                "room_name": settings.room_name,
                "room_description": settings.room_description,
                "room_image": settings.room_image,
                "is_public": settings.is_public,
                "allow_member_invite": settings.allow_member_invite,
                "created_at": settings.created_at.isoformat(),
                "updated_at": settings.updated_at.isoformat()
            }
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@chats_bp.route("/chat/rooms/<chat_type>/<int:chat_id>/settings", methods=["PUT"])
def update_chat_room_settings(chat_type, chat_id):
    """채팅방 설정 업데이트"""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({"error": "사용자 ID가 필요합니다."}), 400
        
        # 권한 확인 (관리자만 설정 변경 가능)
        admin_member = ChatRoomMember.query.filter_by(
            chat_type=chat_type,
            chat_id=chat_id,
            user_id=user_id,
            role='admin'
        ).first()
        
        if not admin_member:
            return jsonify({"error": "채팅방 설정을 변경할 권한이 없습니다."}), 403
        
        # 설정 조회 또는 생성
        settings = ChatRoomSettings.query.filter_by(
            chat_type=chat_type,
            chat_id=chat_id
        ).first()
        
        if not settings:
            settings = ChatRoomSettings(
                chat_type=chat_type,
                chat_id=chat_id
            )
            db.session.add(settings)
        
        # 설정 업데이트
        if 'room_name' in data:
            settings.room_name = data['room_name']
        if 'room_description' in data:
            settings.room_description = data['room_description']
        if 'room_image' in data:
            settings.room_image = data['room_image']
        if 'is_public' in data:
            settings.is_public = data['is_public']
        if 'allow_member_invite' in data:
            settings.allow_member_invite = data['allow_member_invite']
        
        settings.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "채팅방 설정이 업데이트되었습니다."
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
