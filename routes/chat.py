from flask import Blueprint, jsonify, request
from sqlalchemy import desc, or_, and_, func
from extensions import db
from models.app_models import ChatRoom, ChatMessage, ChatParticipant, Party, PartyMember, User
from datetime import datetime, timedelta
import random

# Blueprint 생성
chats_bp = Blueprint('chats', __name__)

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
            ChatParticipant.employee_id == employee_id
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
                chat_type=chat.type, 
                chat_id=chat.id
            ).count()
            
            chat_info = {
                "id": chat.id,
                "type": chat.type,
                "title": chat.title,
                "last_message": last_message.content if last_message else "",
                "last_message_time": last_message.created_at.isoformat() if last_message else None,
                "participant_count": participant_count,
                "created_at": chat.created_at.isoformat() if chat.created_at else None
            }
            chats_data.append(chat_info)
        
        return jsonify({
            "chats": chats_data,
            "total": len(chats_data)
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
            message_info = {
                "id": message.id,
                "sender_id": message.sender_id,
                "content": message.content,
                "message_type": message.message_type,
                "created_at": message.created_at.isoformat() if message.created_at else None
            }
            messages_data.append(message_info)
        
        return jsonify({
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
            sender_id=data["sender_id"],
            content=data["content"],
            message_type=data.get("message_type", "text")
        )
        
        db.session.add(new_message)
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

@chats_bp.route("/chat/room/members/<chat_type>/<int:chat_id>", methods=["GET"])
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
