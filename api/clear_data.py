"""
개발용 데이터 정리 API Blueprint
모든 테스트 데이터를 정리하는 API 엔드포인트를 포함합니다.
"""

from flask import Blueprint, request, jsonify
from extensions import db
from models.app_models import Party, PartyMember, User, Friendship, ChatRoom, ChatMessage, RandomLunchProposal
from models.schedule_models import PersonalSchedule as Schedule
from sqlalchemy import text
import logging

logger = logging.getLogger(__name__)

# Blueprint 생성
clear_data_bp = Blueprint('clear_data', __name__)

@clear_data_bp.route('/clear-all-data', methods=['POST'])
def clear_all_data():
    """
    모든 테스트 데이터 정리
    - 파티 데이터 (Party, PartyMember)
    - 일정 데이터 (Schedule)
    - 친구 데이터 (Friend)
    - 채팅 데이터 (ChatRoom, ChatMessage)
    - 랜덤런치 데이터 (RandomLunchGroup, RandomLunchProposal)
    - 사용자 데이터 (User) - 선택적
    """
    try:
        data = request.get_json() or {}
        clear_users = data.get('clear_users', False)  # 사용자 데이터 정리 여부
        
        logger.info(f"🧹 [전체정리] 데이터 정리 시작 - 사용자 데이터 포함: {clear_users}")
        
        # 트랜잭션 시작
        with db.session.begin():
            # 1. 파티 관련 데이터 정리
            logger.info("🗑️ [전체정리] 파티 멤버 데이터 삭제 중...")
            db.session.execute(text("DELETE FROM party_member"))
            
            logger.info("🗑️ [전체정리] 파티 데이터 삭제 중...")
            db.session.execute(text("DELETE FROM party"))
            
            # 2. 일정 데이터 정리
            logger.info("🗑️ [전체정리] 일정 데이터 삭제 중...")
            db.session.execute(text("DELETE FROM personal_schedules"))
            db.session.execute(text("DELETE FROM schedule_exceptions"))
            
            # 3. 친구 데이터 정리
            logger.info("🗑️ [전체정리] 친구 데이터 삭제 중...")
            db.session.execute(text("DELETE FROM friendship"))
            
            # 4. 채팅 데이터 정리
            logger.info("🗑️ [전체정리] 채팅 메시지 데이터 삭제 중...")
            db.session.execute(text("DELETE FROM chat_message"))
            
            logger.info("🗑️ [전체정리] 채팅방 데이터 삭제 중...")
            db.session.execute(text("DELETE FROM chat_room"))
            
            # 5. 랜덤런치 데이터 정리
            logger.info("🗑️ [전체정리] 랜덤런치 제안 데이터 삭제 중...")
            db.session.execute(text("DELETE FROM random_lunch_proposal"))
            
            
            # 6. 사용자 데이터 정리 (선택적)
            if clear_users:
                logger.info("🗑️ [전체정리] 사용자 데이터 삭제 중...")
                db.session.execute(text("DELETE FROM user"))
            
            # 7. 시퀀스 리셋 (SQLite의 경우)
            logger.info("🔄 [전체정리] 시퀀스 리셋 중...")
            try:
                # SQLite에서 자동 증가 ID 리셋
                tables = ['party', 'personal_schedules', 'schedule_exceptions', 'friendship', 'chat_room', 'chat_message', 'random_lunch_proposal']
                if clear_users:
                    tables.append('user')
                
                for table in tables:
                    db.session.execute(text(f"DELETE FROM sqlite_sequence WHERE name='{table}'"))
            except Exception as e:
                logger.warning(f"⚠️ [전체정리] 시퀀스 리셋 실패 (무시 가능): {e}")
        
        logger.info("✅ [전체정리] 모든 데이터 정리 완료")
        
        return jsonify({
            'success': True,
            'message': '모든 테스트 데이터가 정리되었습니다.',
            'cleared_data': {
                'parties': '삭제됨',
                'schedules': '삭제됨', 
                'friends': '삭제됨',
                'chat_rooms': '삭제됨',
                'chat_messages': '삭제됨',
                'random_lunch_groups': '삭제됨',
                'random_lunch_proposals': '삭제됨',
                'users': '삭제됨' if clear_users else '유지됨'
            }
        })
        
    except Exception as e:
        logger.error(f"❌ [전체정리] 데이터 정리 실패: {e}")
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': '데이터 정리 중 오류가 발생했습니다.',
            'details': str(e)
        }), 500

@clear_data_bp.route('/clear-parties', methods=['POST'])
def clear_parties():
    """파티 데이터만 정리"""
    try:
        with db.session.begin():
            db.session.execute(text("DELETE FROM party_member"))
            db.session.execute(text("DELETE FROM party"))
            db.session.execute(text("DELETE FROM sqlite_sequence WHERE name='party'"))
            db.session.execute(text("DELETE FROM sqlite_sequence WHERE name='party_member'"))
        
        return jsonify({
            'success': True,
            'message': '파티 데이터가 정리되었습니다.'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': '파티 데이터 정리 중 오류가 발생했습니다.',
            'details': str(e)
        }), 500

@clear_data_bp.route('/clear-schedules', methods=['POST'])
def clear_schedules():
    """일정 데이터만 정리"""
    try:
        with db.session.begin():
            db.session.execute(text("DELETE FROM personal_schedules"))
            db.session.execute(text("DELETE FROM schedule_exceptions"))
            db.session.execute(text("DELETE FROM sqlite_sequence WHERE name='personal_schedules'"))
            db.session.execute(text("DELETE FROM sqlite_sequence WHERE name='schedule_exceptions'"))
        
        return jsonify({
            'success': True,
            'message': '일정 데이터가 정리되었습니다.'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': '일정 데이터 정리 중 오류가 발생했습니다.',
            'details': str(e)
        }), 500

@clear_data_bp.route('/clear-friends', methods=['POST'])
def clear_friends():
    """친구 데이터만 정리"""
    try:
        with db.session.begin():
            db.session.execute(text("DELETE FROM friendship"))
            db.session.execute(text("DELETE FROM sqlite_sequence WHERE name='friendship'"))
        
        return jsonify({
            'success': True,
            'message': '친구 데이터가 정리되었습니다.'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': '친구 데이터 정리 중 오류가 발생했습니다.',
            'details': str(e)
        }), 500

@clear_data_bp.route('/clear-chat', methods=['POST'])
def clear_chat():
    """채팅 데이터만 정리"""
    try:
        with db.session.begin():
            db.session.execute(text("DELETE FROM chat_message"))
            db.session.execute(text("DELETE FROM chat_room"))
            db.session.execute(text("DELETE FROM sqlite_sequence WHERE name='chat_message'"))
            db.session.execute(text("DELETE FROM sqlite_sequence WHERE name='chat_room'"))
        
        return jsonify({
            'success': True,
            'message': '채팅 데이터가 정리되었습니다.'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': '채팅 데이터 정리 중 오류가 발생했습니다.',
            'details': str(e)
        }), 500

@clear_data_bp.route('/clear-randomlunch', methods=['POST'])
def clear_randomlunch():
    """랜덤런치 데이터만 정리"""
    try:
        with db.session.begin():
            db.session.execute(text("DELETE FROM random_lunch_proposal"))
            db.session.execute(text("DELETE FROM random_lunch_group"))
            db.session.execute(text("DELETE FROM sqlite_sequence WHERE name='random_lunch_proposal'"))
            db.session.execute(text("DELETE FROM sqlite_sequence WHERE name='random_lunch_group'"))
        
        return jsonify({
            'success': True,
            'message': '랜덤런치 데이터가 정리되었습니다.'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': '랜덤런치 데이터 정리 중 오류가 발생했습니다.',
            'details': str(e)
        }), 500
