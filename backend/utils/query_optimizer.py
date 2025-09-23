"""
데이터베이스 쿼리 최적화 유틸리티
효율적인 데이터베이스 쿼리를 위한 도구들을 제공합니다.
"""

from sqlalchemy import text, func, desc, asc
from sqlalchemy.orm import joinedload, selectinload, subqueryload
from sqlalchemy.exc import SQLAlchemyError
from backend.app.extensions import db
from backend.models.app_models import (
    ChatMessage, MessageStatus, MessageReaction, MessageAttachment,
    ChatRoomMember, ChatRoomSettings, NotificationSettings, ChatNotification
)
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
import logging

logger = logging.getLogger(__name__)

class QueryOptimizer:
    """쿼리 최적화 클래스"""
    
    @staticmethod
    def get_messages_optimized(chat_type: str, chat_id: int, limit: int = 50, offset: int = 0, 
                              include_reactions: bool = True, include_attachments: bool = True) -> List[Dict]:
        """최적화된 메시지 조회"""
        try:
            # 기본 쿼리
            query = ChatMessage.query.filter_by(
                chat_type=chat_type,
                chat_id=chat_id,
                is_deleted=False
            )
            
            # 관련 데이터 미리 로드
            if include_reactions:
                query = query.options(joinedload(ChatMessage.reactions))
            
            if include_attachments:
                query = query.options(joinedload(ChatMessage.attachments))
            
            # 정렬 및 페이징
            messages = query.order_by(desc(ChatMessage.created_at))\
                           .offset(offset)\
                           .limit(limit)\
                           .all()
            
            # 결과 변환
            result = []
            for message in messages:
                message_data = {
                    'id': message.id,
                    'chat_type': message.chat_type,
                    'chat_id': message.chat_id,
                    'sender_employee_id': message.sender_employee_id,
                    'sender_nickname': message.sender_nickname,
                    'message': message.message,
                    'message_type': message.message_type,
                    'is_edited': message.is_edited,
                    'edited_at': message.edited_at.isoformat() if message.edited_at else None,
                    'is_deleted': message.is_deleted,
                    'deleted_at': message.deleted_at.isoformat() if message.deleted_at else None,
                    'reply_to_message_id': message.reply_to_message_id,
                    'created_at': message.created_at.isoformat(),
                    'reactions': [],
                    'attachments': []
                }
                
                # 반응 데이터 추가
                if include_reactions and hasattr(message, 'reactions'):
                    for reaction in message.reactions:
                        message_data['reactions'].append({
                            'id': reaction.id,
                            'user_id': reaction.user_id,
                            'reaction_type': reaction.reaction_type,
                            'created_at': reaction.created_at.isoformat()
                        })
                
                # 첨부파일 데이터 추가
                if include_attachments and hasattr(message, 'attachments'):
                    for attachment in message.attachments:
                        message_data['attachments'].append({
                            'id': attachment.id,
                            'file_name': attachment.file_name,
                            'file_path': attachment.file_path,
                            'file_size': attachment.file_size,
                            'file_type': attachment.file_type,
                            'mime_type': attachment.mime_type,
                            'thumbnail_path': attachment.thumbnail_path,
                            'created_at': attachment.created_at.isoformat()
                        })
                
                result.append(message_data)
            
            return result
            
        except SQLAlchemyError as e:
            logger.error(f"메시지 조회 실패: {e}")
            return []
    
    @staticmethod
    def get_unread_count_optimized(user_id: str, chat_type: str = None, chat_id: int = None) -> int:
        """최적화된 읽지 않은 메시지 수 조회"""
        try:
            # 서브쿼리로 읽지 않은 메시지 ID 조회
            unread_message_ids = db.session.query(ChatMessage.id)\
                .filter(ChatMessage.chat_type == chat_type if chat_type else True)\
                .filter(ChatMessage.chat_id == chat_id if chat_id else True)\
                .filter(ChatMessage.sender_employee_id != user_id)\
                .filter(ChatMessage.is_deleted == False)\
                .except_(
                    db.session.query(MessageStatus.message_id)\
                    .filter(MessageStatus.user_id == user_id)\
                    .filter(MessageStatus.is_read == True)
                ).subquery()
            
            # 읽지 않은 메시지 수 계산
            count = db.session.query(func.count(ChatMessage.id))\
                .filter(ChatMessage.id.in_(
                    db.session.query(unread_message_ids.c.id)
                )).scalar()
            
            return count or 0
            
        except SQLAlchemyError as e:
            logger.error(f"읽지 않은 메시지 수 조회 실패: {e}")
            return 0
    
    @staticmethod
    def get_chat_rooms_optimized(user_id: str, limit: int = 20, offset: int = 0) -> List[Dict]:
        """최적화된 채팅방 목록 조회"""
        try:
            # 사용자가 참여한 채팅방 조회
            chat_rooms = db.session.query(ChatRoomMember)\
                .filter(ChatRoomMember.user_id == user_id)\
                .filter(ChatRoomMember.is_left == False)\
                .options(joinedload(ChatRoomMember.settings))\
                .offset(offset)\
                .limit(limit)\
                .all()
            
            result = []
            for room in chat_rooms:
                # 최신 메시지 조회
                latest_message = db.session.query(ChatMessage)\
                    .filter(ChatMessage.chat_type == room.chat_type)\
                    .filter(ChatMessage.chat_id == room.chat_id)\
                    .filter(ChatMessage.is_deleted == False)\
                    .order_by(desc(ChatMessage.created_at))\
                    .first()
                
                # 읽지 않은 메시지 수 조회
                unread_count = QueryOptimizer.get_unread_count_optimized(
                    user_id, room.chat_type, room.chat_id
                )
                
                room_data = {
                    'id': f"{room.chat_type}_{room.chat_id}",
                    'chat_type': room.chat_type,
                    'chat_id': room.chat_id,
                    'name': room.settings.room_name if room.settings else f"채팅방 {room.chat_id}",
                    'description': room.settings.room_description if room.settings else None,
                    'room_image': room.settings.room_image if room.settings else None,
                    'is_public': room.settings.is_public if room.settings else False,
                    'last_message': latest_message.message if latest_message else None,
                    'last_message_time': latest_message.created_at.isoformat() if latest_message else None,
                    'unread_count': unread_count,
                    'joined_at': room.joined_at.isoformat(),
                    'last_read_message_id': room.last_read_message_id
                }
                
                result.append(room_data)
            
            return result
            
        except SQLAlchemyError as e:
            logger.error(f"채팅방 목록 조회 실패: {e}")
            return []
    
    @staticmethod
    def search_messages_optimized(query: str, user_id: str, chat_type: str = None, 
                                 chat_id: int = None, limit: int = 50, offset: int = 0) -> List[Dict]:
        """최적화된 메시지 검색"""
        try:
            # 검색 쿼리
            search_query = db.session.query(ChatMessage)\
                .filter(ChatMessage.message.contains(query))\
                .filter(ChatMessage.is_deleted == False)
            
            # 채팅방 필터
            if chat_type:
                search_query = search_query.filter(ChatMessage.chat_type == chat_type)
            if chat_id:
                search_query = search_query.filter(ChatMessage.chat_id == chat_id)
            
            # 사용자 권한 확인 (사용자가 참여한 채팅방만)
            user_chats = db.session.query(ChatRoomMember.chat_type, ChatRoomMember.chat_id)\
                .filter(ChatRoomMember.user_id == user_id)\
                .filter(ChatRoomMember.is_left == False)\
                .subquery()
            
            search_query = search_query.join(
                user_chats,
                (ChatMessage.chat_type == user_chats.c.chat_type) &
                (ChatMessage.chat_id == user_chats.c.chat_id)
            )
            
            # 결과 조회
            messages = search_query.order_by(desc(ChatMessage.created_at))\
                                 .offset(offset)\
                                 .limit(limit)\
                                 .all()
            
            # 결과 변환
            result = []
            for message in messages:
                message_data = {
                    'id': message.id,
                    'chat_type': message.chat_type,
                    'chat_id': message.chat_id,
                    'sender_employee_id': message.sender_employee_id,
                    'sender_nickname': message.sender_nickname,
                    'message': message.message,
                    'message_type': message.message_type,
                    'created_at': message.created_at.isoformat(),
                    'highlight': query  # 검색어 하이라이트용
                }
                result.append(message_data)
            
            return result
            
        except SQLAlchemyError as e:
            logger.error(f"메시지 검색 실패: {e}")
            return []
    
    @staticmethod
    def get_message_reactions_optimized(message_id: int) -> Dict[str, List[Dict]]:
        """최적화된 메시지 반응 조회"""
        try:
            # 반응 그룹화 조회
            reactions = db.session.query(
                MessageReaction.reaction_type,
                func.count(MessageReaction.id).label('count'),
                func.array_agg(MessageReaction.user_id).label('user_ids')
            ).filter(MessageReaction.message_id == message_id)\
             .group_by(MessageReaction.reaction_type)\
             .all()
            
            result = {}
            for reaction in reactions:
                result[reaction.reaction_type] = {
                    'count': reaction.count,
                    'user_ids': reaction.user_ids
                }
            
            return result
            
        except SQLAlchemyError as e:
            logger.error(f"메시지 반응 조회 실패: {e}")
            return {}
    
    @staticmethod
    def bulk_update_message_status(user_id: str, message_ids: List[int]) -> bool:
        """메시지 읽음 상태 일괄 업데이트"""
        try:
            # 기존 읽음 상태 확인
            existing_statuses = db.session.query(MessageStatus.message_id)\
                .filter(MessageStatus.user_id == user_id)\
                .filter(MessageStatus.message_id.in_(message_ids))\
                .all()
            
            existing_message_ids = {status.message_id for status in existing_statuses}
            
            # 새로운 읽음 상태 생성
            new_statuses = []
            for message_id in message_ids:
                if message_id not in existing_message_ids:
                    new_statuses.append(MessageStatus(
                        message_id=message_id,
                        user_id=user_id,
                        is_read=True,
                        read_at=datetime.utcnow()
                    ))
            
            if new_statuses:
                db.session.add_all(new_statuses)
            
            # 기존 상태 업데이트
            db.session.query(MessageStatus)\
                .filter(MessageStatus.user_id == user_id)\
                .filter(MessageStatus.message_id.in_(message_ids))\
                .update({
                    'is_read': True,
                    'read_at': datetime.utcnow()
                }, synchronize_session=False)
            
            db.session.commit()
            return True
            
        except SQLAlchemyError as e:
            logger.error(f"메시지 상태 일괄 업데이트 실패: {e}")
            db.session.rollback()
            return False
    
    @staticmethod
    def get_chat_statistics(chat_type: str, chat_id: int, days: int = 30) -> Dict[str, Any]:
        """채팅 통계 조회"""
        try:
            start_date = datetime.utcnow() - timedelta(days=days)
            
            # 메시지 수 통계
            message_stats = db.session.query(
                func.count(ChatMessage.id).label('total_messages'),
                func.count(ChatMessage.id).filter(ChatMessage.message_type == 'text').label('text_messages'),
                func.count(ChatMessage.id).filter(ChatMessage.message_type == 'image').label('image_messages'),
                func.count(ChatMessage.id).filter(ChatMessage.message_type == 'file').label('file_messages'),
                func.count(ChatMessage.id).filter(ChatMessage.is_edited == True).label('edited_messages'),
                func.count(ChatMessage.id).filter(ChatMessage.is_deleted == True).label('deleted_messages')
            ).filter(ChatMessage.chat_type == chat_type)\
             .filter(ChatMessage.chat_id == chat_id)\
             .filter(ChatMessage.created_at >= start_date)\
             .first()
            
            # 활성 사용자 수
            active_users = db.session.query(func.count(func.distinct(ChatMessage.sender_employee_id)))\
                .filter(ChatMessage.chat_type == chat_type)\
                .filter(ChatMessage.chat_id == chat_id)\
                .filter(ChatMessage.created_at >= start_date)\
                .scalar()
            
            # 일별 메시지 수
            daily_messages = db.session.query(
                func.date(ChatMessage.created_at).label('date'),
                func.count(ChatMessage.id).label('count')
            ).filter(ChatMessage.chat_type == chat_type)\
             .filter(ChatMessage.chat_id == chat_id)\
             .filter(ChatMessage.created_at >= start_date)\
             .group_by(func.date(ChatMessage.created_at))\
             .order_by(asc(func.date(ChatMessage.created_at)))\
             .all()
            
            return {
                'total_messages': message_stats.total_messages or 0,
                'text_messages': message_stats.text_messages or 0,
                'image_messages': message_stats.image_messages or 0,
                'file_messages': message_stats.file_messages or 0,
                'edited_messages': message_stats.edited_messages or 0,
                'deleted_messages': message_stats.deleted_messages or 0,
                'active_users': active_users or 0,
                'daily_messages': [
                    {'date': str(day.date), 'count': day.count}
                    for day in daily_messages
                ]
            }
            
        except SQLAlchemyError as e:
            logger.error(f"채팅 통계 조회 실패: {e}")
            return {}

# 전역 쿼리 최적화 인스턴스
query_optimizer = QueryOptimizer()
