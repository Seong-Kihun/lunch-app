#!/usr/bin/env python3
"""
루트 레벨 호환성 API
모바일 앱이 요청하는 경로를 루트 레벨에서 지원합니다.
"""

from flask import Blueprint, request, jsonify
from backend.auth.middleware import check_authentication
from backend.auth.routes import send_magic_link, get_profile
import logging

logger = logging.getLogger(__name__)

# 루트 레벨 호환성 Blueprint 생성
root_compatibility_bp = Blueprint('root_compatibility', __name__)

@root_compatibility_bp.route('/auth/magic-link', methods=['POST'])
def root_magic_link():
    """루트 레벨 매직링크 API"""
    logger.info("루트 레벨 매직링크 API 호출됨")
    return send_magic_link()

@root_compatibility_bp.route('/dev/users/<int:employee_id>', methods=['GET'])
def root_dev_user(employee_id):
    """루트 레벨 개발용 사용자 API - 실제 데이터 사용"""
    logger.info(f"루트 레벨 개발용 사용자 API 호출됨: {employee_id}")
    
    # 개발용 토큰으로 인증된 사용자 조회
    try:
        from backend.app.extensions import db
        from flask import current_app
        
        # 근본적 해결: app_factory에서 이미 import된 모델 사용
        with current_app.app_context():
            # 메타데이터 충돌을 방지하기 위해 직접 import 제거
            # app_factory에서 이미 import된 User 모델 사용
            from backend.app.app import User
            
            user = User.query.filter_by(employee_id=str(employee_id)).first()
            
            if not user:
                # 개발용 사용자 생성
                user = User(
                    employee_id=str(employee_id),
                    email=f'dev{employee_id}@example.com',
                    nickname=f'개발자{employee_id}',
                    is_active=True
                )
                db.session.add(user)
                db.session.commit()
        
        return jsonify({
            'success': True,
            'user': {
                'employee_id': user.employee_id,
                'nickname': user.nickname,
                'email': user.email,
                'is_active': user.is_active
            }
        })
    except Exception as e:
        logger.error(f"개발용 사용자 API 오류: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@root_compatibility_bp.route('/auth/profile', methods=['GET'])
def root_auth_profile():
    """루트 레벨 인증 프로필 API"""
    logger.info("루트 레벨 인증 프로필 API 호출됨")
    return get_profile()

@root_compatibility_bp.route('/auth/register', methods=['POST'])
def root_register():
    """루트 레벨 회원가입 API"""
    logger.info("루트 레벨 회원가입 API 호출됨")
    from auth.routes import register_user
    return register_user()

@root_compatibility_bp.route('/auth/login', methods=['POST'])
def root_login():
    """루트 레벨 로그인 API"""
    logger.info("루트 레벨 로그인 API 호출됨")
    from auth.routes import test_login
    data = request.get_json()
    if data and 'employee_id' in data:
        return test_login(data['employee_id'])
    return jsonify({"error": "employee_id가 필요합니다"}), 400

@root_compatibility_bp.route('/dev/schedules', methods=['GET'])
def root_dev_schedules():
    """루트 레벨 개발용 일정 조회 API - 실제 데이터 사용"""
    logger.info("루트 레벨 개발용 일정 조회 API 호출됨")
    
    # 개발용 토큰으로 인증된 사용자의 일정 조회
    try:
        employee_id = request.args.get('employee_id', '1')
        start_date = request.args.get('start_date', '')
        end_date = request.args.get('end_date', '')
        
        # 실제 일정 데이터 조회
        from models.schedule_models import PersonalSchedule
        from extensions import db
        from datetime import datetime
        
        # 날짜 파싱
        start_dt = datetime.strptime(start_date, '%Y-%m-%d') if start_date else None
        end_dt = datetime.strptime(end_date, '%Y-%m-%d') if end_date else None
        
        # 일정 조회
        query = PersonalSchedule.query.filter_by(employee_id=employee_id)
        if start_dt:
            query = query.filter(PersonalSchedule.schedule_date >= start_dt)
        if end_dt:
            query = query.filter(PersonalSchedule.schedule_date <= end_dt)
        
        schedules = query.all()
        
        # 일정 데이터 포맷팅
        schedule_list = []
        for schedule in schedules:
            # 날짜 포맷팅 (date 객체인 경우 strftime, 문자열인 경우 그대로 사용)
            if hasattr(schedule.schedule_date, 'strftime'):
                schedule_date_str = schedule.schedule_date.strftime('%Y-%m-%d')
            else:
                schedule_date_str = str(schedule.schedule_date)
            
            schedule_list.append({
                'id': schedule.id,
                'title': schedule.title,
                'schedule_date': schedule_date_str,
                'time': schedule.time,
                'restaurant': schedule.restaurant,
                'location': schedule.location,
                'description': schedule.description
            })
        
        return jsonify({
            'success': True,
            'schedules': schedule_list,
            'employee_id': employee_id,
            'start_date': start_date,
            'end_date': end_date
        })
    except Exception as e:
        logger.error(f"개발용 일정 API 오류: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@root_compatibility_bp.route('/dev/schedules', methods=['POST'])
def root_dev_create_schedule():
    """루트 레벨 개발용 일정 생성 API - 실제 데이터 사용"""
    logger.info("루트 레벨 개발용 일정 생성 API 호출됨")
    
    try:
        # 요청 데이터 파싱
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': '요청 데이터가 없습니다.'
            }), 400
        
        # 필수 필드 확인
        required_fields = ['employee_id', 'title', 'start_date']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'필수 필드가 누락되었습니다: {field}'
                }), 400
        
        # 실제 일정 생성
        from models.schedule_models import PersonalSchedule
        from extensions import db
        from datetime import datetime
        
        # 일정 객체 생성
        schedule = PersonalSchedule(
            employee_id=data['employee_id'],
            title=data['title'],
            start_date=datetime.strptime(data['start_date'], '%Y-%m-%d').date(),
            schedule_date=datetime.strptime(data['start_date'], '%Y-%m-%d').date(),
            time=data.get('time', '12:00'),
            restaurant=data.get('restaurant', ''),
            location=data.get('location', ''),
            description=data.get('description', ''),
            is_recurring=data.get('is_recurring', False),
            recurrence_type=data.get('recurrence_type'),
            recurrence_interval=data.get('recurrence_interval', 1),
            recurrence_end_date=datetime.strptime(data['recurrence_end_date'], '%Y-%m-%d').date() if data.get('recurrence_end_date') else None,
            master_schedule_id=data.get('master_schedule_id'),
            created_by=data.get('created_by', data['employee_id'])
        )
        
        # 데이터베이스에 저장
        db.session.add(schedule)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'schedule': {
                'id': schedule.id,
                'employee_id': schedule.employee_id,
                'title': schedule.title,
                'start_date': schedule.start_date.isoformat() if hasattr(schedule.start_date, 'isoformat') else str(schedule.start_date),
                'schedule_date': schedule.schedule_date.isoformat() if hasattr(schedule.schedule_date, 'isoformat') else str(schedule.schedule_date),
                'time': schedule.time,
                'restaurant': schedule.restaurant,
                'location': schedule.location,
                'description': schedule.description,
                'is_recurring': schedule.is_recurring,
                'recurrence_type': schedule.recurrence_type,
                'recurrence_interval': schedule.recurrence_interval,
                'recurrence_end_date': schedule.recurrence_end_date.isoformat() if schedule.recurrence_end_date and hasattr(schedule.recurrence_end_date, 'isoformat') else str(schedule.recurrence_end_date) if schedule.recurrence_end_date else None,
                'created_by': schedule.created_by,
                'created_at': schedule.created_at.isoformat() if schedule.created_at and hasattr(schedule.created_at, 'isoformat') else str(schedule.created_at) if schedule.created_at else None
            }
        })
        
    except Exception as e:
        logger.error(f"개발용 일정 생성 API 오류: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@root_compatibility_bp.route('/dev/random-lunch/<int:employee_id>', methods=['GET'])
def root_dev_random_lunch(employee_id):
    """루트 레벨 개발용 랜덤런치 API - 실제 데이터 사용"""
    logger.info(f"루트 레벨 개발용 랜덤런치 API 호출됨: {employee_id}")
    
    # 실제 식당 데이터에서 랜덤 선택
    try:
        from models.restaurant_models import RestaurantV2
        import random
        
        # 모든 식당 조회
        restaurants = RestaurantV2.query.all()
        if not restaurants:
            return jsonify({
                'success': False,
                'error': '식당 데이터가 없습니다.'
            }), 404
        
        # 랜덤 식당 선택
        random_restaurant = random.choice(restaurants)
        
        return jsonify({
            'success': True,
            'groupsData': [{
                'id': random_restaurant.id,
                'name': random_restaurant.name,
                'address': random_restaurant.address,
                'category': random_restaurant.category,
                'rating': random_restaurant.rating or 4.0,
                'phone': random_restaurant.phone,
                'price_range': random_restaurant.price_range,
                'latitude': random_restaurant.latitude,
                'longitude': random_restaurant.longitude
            }],
            'restaurant': {
                'id': random_restaurant.id,
                'name': random_restaurant.name,
                'address': random_restaurant.address,
                'category': random_restaurant.category,
                'rating': random_restaurant.rating or 4.0,
                'phone': random_restaurant.phone,
                'price_range': random_restaurant.price_range,
                'latitude': random_restaurant.latitude,
                'longitude': random_restaurant.longitude
            }
        })
    except Exception as e:
        logger.error(f"개발용 랜덤런치 API 오류: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@root_compatibility_bp.route('/dev/friends/<int:employee_id>', methods=['GET'])
def root_dev_friends(employee_id):
    """루트 레벨 개발용 친구 API - 실제 데이터 사용"""
    logger.info(f"루트 레벨 개발용 친구 API 호출됨: {employee_id}")
    
    # 실제 친구 데이터 조회
    try:
        from auth.models import Friendship, User
        from extensions import db
        
        # 친구 관계 조회 (실제 컬럼명 사용)
        friendships = Friendship.query.filter(
            (Friendship.requester_id == str(employee_id)) | 
            (Friendship.receiver_id == str(employee_id))
        ).filter(Friendship.status == 'accepted').all()
        
        # 친구 목록 생성
        friends = []
        for friendship in friendships:
            # 친구 ID 결정 (실제 컬럼명 사용)
            friend_id = friendship.receiver_id if friendship.requester_id == str(employee_id) else friendship.requester_id
            
            # 친구 정보 조회
            friend = User.query.filter_by(employee_id=friend_id).first()
            if friend:
                friends.append({
                    'employee_id': friend.employee_id,
                    'nickname': friend.nickname,
                    'email': friend.email,
                    'is_active': friend.is_active
                })
        
        # 개발용 친구 관계가 없으면 생성
        if not friends and employee_id == 1:
            logger.info("개발용 친구 관계 데이터 생성 중...")
            
            # 개발용 사용자들 생성
            dev_users = [
                {'employee_id': '2', 'nickname': '친구1', 'email': 'friend1@example.com'},
                {'employee_id': '3', 'nickname': '친구2', 'email': 'friend2@example.com'},
                {'employee_id': '4', 'nickname': '친구3', 'email': 'friend3@example.com'}
            ]
            
            for user_data in dev_users:
                # 사용자 생성
                user = User.query.filter_by(employee_id=user_data['employee_id']).first()
                if not user:
                    user = User(
                        employee_id=user_data['employee_id'],
                        nickname=user_data['nickname'],
                        email=user_data['email'],
                        is_active=True
                    )
                    db.session.add(user)
                
                # 친구 관계 생성 (양방향)
                friendship1 = Friendship(
                    requester_id=str(employee_id),
                    receiver_id=user_data['employee_id'],
                    status='accepted'
                )
                friendship2 = Friendship(
                    requester_id=user_data['employee_id'],
                    receiver_id=str(employee_id),
                    status='accepted'
                )
                db.session.add(friendship1)
                db.session.add(friendship2)
            
            db.session.commit()
            logger.info("개발용 친구 관계 데이터 생성 완료")
            
            # 다시 친구 목록 조회
            friendships = Friendship.query.filter(
                (Friendship.requester_id == str(employee_id)) | 
                (Friendship.receiver_id == str(employee_id))
            ).filter(Friendship.status == 'accepted').all()
            
            for friendship in friendships:
                friend_id = friendship.receiver_id if friendship.requester_id == str(employee_id) else friendship.requester_id
                friend = User.query.filter_by(employee_id=friend_id).first()
                if friend:
                    friends.append({
                        'employee_id': friend.employee_id,
                        'nickname': friend.nickname,
                        'email': friend.email,
                        'is_active': friend.is_active
                    })
        
        return jsonify({
            'success': True,
            'friends': friends
        })
    except Exception as e:
        logger.error(f"개발용 친구 API 오류: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@root_compatibility_bp.route('/friends/<int:employee_id>', methods=['GET'])
def root_friends(employee_id):
    """루트 레벨 친구 API - 실제 데이터 사용"""
    logger.info(f"루트 레벨 친구 API 호출됨: {employee_id}")
    
    # 개발 환경에서는 인증 우회하고 실제 친구 데이터 반환
    try:
        from auth.models import Friendship, User
        from extensions import db
        
        # 친구 관계 조회 (실제 컬럼명 사용)
        friendships = Friendship.query.filter(
            (Friendship.requester_id == str(employee_id)) | 
            (Friendship.receiver_id == str(employee_id))
        ).filter(Friendship.status == 'accepted').all()
        
        # 친구 목록 생성
        friends = []
        for friendship in friendships:
            # 친구 ID 결정 (실제 컬럼명 사용)
            friend_id = friendship.receiver_id if friendship.requester_id == str(employee_id) else friendship.requester_id
            
            # 친구 정보 조회
            friend = User.query.filter_by(employee_id=friend_id).first()
            if friend:
                friends.append({
                    'employee_id': friend.employee_id,
                    'nickname': friend.nickname,
                    'email': friend.email,
                    'is_active': friend.is_active
                })
        
        # 개발용 친구 관계가 없으면 생성
        if not friends and employee_id == 1:
            logger.info("개발용 친구 관계 데이터 생성 중...")
            
            # 개발용 사용자들 생성
            dev_users = [
                {'employee_id': '2', 'nickname': '친구1', 'email': 'friend1@example.com'},
                {'employee_id': '3', 'nickname': '친구2', 'email': 'friend2@example.com'},
                {'employee_id': '4', 'nickname': '친구3', 'email': 'friend3@example.com'}
            ]
            
            for user_data in dev_users:
                # 사용자 생성
                user = User.query.filter_by(employee_id=user_data['employee_id']).first()
                if not user:
                    user = User(
                        employee_id=user_data['employee_id'],
                        nickname=user_data['nickname'],
                        email=user_data['email'],
                        is_active=True
                    )
                    db.session.add(user)
                
                # 친구 관계 생성 (양방향)
                friendship1 = Friendship(
                    requester_id=str(employee_id),
                    receiver_id=user_data['employee_id'],
                    status='accepted'
                )
                friendship2 = Friendship(
                    requester_id=user_data['employee_id'],
                    receiver_id=str(employee_id),
                    status='accepted'
                )
                db.session.add(friendship1)
                db.session.add(friendship2)
            
            db.session.commit()
            logger.info("개발용 친구 관계 데이터 생성 완료")
            
            # 다시 친구 목록 조회
            friendships = Friendship.query.filter(
                (Friendship.requester_id == str(employee_id)) | 
                (Friendship.receiver_id == str(employee_id))
            ).filter(Friendship.status == 'accepted').all()
            
            for friendship in friendships:
                friend_id = friendship.receiver_id if friendship.requester_id == str(employee_id) else friendship.requester_id
                friend = User.query.filter_by(employee_id=friend_id).first()
                if friend:
                    friends.append({
                        'employee_id': friend.employee_id,
                        'nickname': friend.nickname,
                        'email': friend.email,
                        'is_active': friend.is_active
                    })
        
        return jsonify(friends)
    except Exception as e:
        logger.error(f"친구 API 오류: {e}")
        return jsonify({
            'error': str(e)
        }), 500

@root_compatibility_bp.route('/api/chats/<int:user_id>', methods=['GET'])
def root_chats(user_id):
    """루트 레벨 채팅 목록 API"""
    logger.info(f"루트 레벨 채팅 목록 API 호출됨: {user_id}")
    
    # 개발 환경에서는 인증 우회하고 가상 채팅 데이터 반환
    try:
        return jsonify({
            'success': True,
            'chats': [
                {
                    'id': 1,
                    'name': '점심 모임',
                    'type': 'group',
                    'last_message': '안녕하세요!',
                    'last_message_time': '2025-09-23T10:30:00Z',
                    'unread_count': 2
                },
                {
                    'id': 2,
                    'name': '친구1',
                    'type': 'private',
                    'last_message': '오늘 점심 어디 갈까요?',
                    'last_message_time': '2025-09-23T10:25:00Z',
                    'unread_count': 0
                }
            ],
            'message': '개발 환경: 가상 채팅 데이터'
        })
    except Exception as e:
        logger.error(f"개발용 채팅 API 오류: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@root_compatibility_bp.route('/dev/api/v2/restaurants', methods=['GET'])
def root_dev_restaurants():
    """루트 레벨 개발용 식당 목록 API"""
    logger.info("루트 레벨 개발용 식당 목록 API 호출됨")
    
    # 실제 식당 데이터 조회
    try:
        from models.restaurant_models import RestaurantV2
        
        # 쿼리 파라미터
        lat = request.args.get('lat', type=float)
        lng = request.args.get('lng', type=float)
        radius = request.args.get('radius', 5, type=float)
        limit = request.args.get('limit', 100, type=int)
        sort = request.args.get('sort', 'distance')
        
        # 기본 쿼리
        query = RestaurantV2.query.filter_by(is_active=True)
        
        # 위치 기반 필터링 (간단한 구현)
        if lat and lng:
            # 실제로는 거리 계산이 필요하지만, 여기서는 간단히 처리
            restaurants = query.limit(limit).all()
        else:
            restaurants = query.limit(limit).all()
        
        # 식당 데이터 포맷팅
        restaurant_list = []
        for restaurant in restaurants:
            restaurant_list.append({
                'id': restaurant.id,
                'name': restaurant.name,
                'address': restaurant.address,
                'category': restaurant.category,
                'rating': restaurant.rating or 4.0,
                'phone': restaurant.phone,
                'price_range': restaurant.price_range,
                'latitude': restaurant.latitude,
                'longitude': restaurant.longitude,
                'review_count': restaurant.review_count or 0
            })
        
        return jsonify({
            'success': True,
            'restaurants': restaurant_list,
            'total': len(restaurant_list)
        })
    except Exception as e:
        logger.error(f"개발용 식당 API 오류: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@root_compatibility_bp.route('/api/v2/restaurants/categories', methods=['GET'])
def root_restaurant_categories():
    """루트 레벨 식당 카테고리 API - 실제 데이터 사용"""
    logger.info("루트 레벨 식당 카테고리 API 호출됨")
    
    # 실제 카테고리 데이터 조회
    try:
        from models.restaurant_models import RestaurantV2
        from sqlalchemy import func
        
        # 카테고리별 식당 수 조회
        category_stats = RestaurantV2.query.filter_by(is_active=True).with_entities(
            RestaurantV2.category,
            func.count(RestaurantV2.id).label('count')
        ).group_by(RestaurantV2.category).all()
        
        # 카테고리 데이터 포맷팅
        categories = []
        for i, (category, count) in enumerate(category_stats, 1):
            if category:  # None이 아닌 카테고리만
                categories.append({
                    'id': i,
                    'name': category,
                    'count': count
                })
        
        return jsonify({
            'success': True,
            'categories': categories
        })
    except Exception as e:
        logger.error(f"개발용 카테고리 API 오류: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@root_compatibility_bp.route('/dev/parties', methods=['GET'])
def root_dev_parties():
    """루트 레벨 개발용 파티 목록 API - 실제 데이터 사용"""
    logger.info("루트 레벨 개발용 파티 목록 API 호출됨")
    
    # 실제 파티 데이터 조회
    try:
        from models.app_models import Party, PartyMember
        from auth.models import User
        
        # 쿼리 파라미터
        employee_id = request.args.get('employee_id', '1')
        is_from_match = request.args.get('is_from_match', 'false').lower() == 'true'
        
        # 사용자가 참여한 파티 조회
        party_memberships = PartyMember.query.filter_by(employee_id=employee_id).all()
        party_ids = [pm.party_id for pm in party_memberships]
        
        # 파티 목록 조회
        parties = Party.query.filter(Party.id.in_(party_ids)).all()
        
        # 파티 데이터 포맷팅
        party_list = []
        for party in parties:
            # 파티 멤버 조회
            members = PartyMember.query.filter_by(party_id=party.id).all()
            member_list = []
            for member in members:
                user = User.query.filter_by(employee_id=member.employee_id).first()
                if user:
                    member_list.append({
                        'employee_id': user.employee_id,
                        'nickname': user.nickname,
                        'email': user.email
                    })
            
            party_list.append({
                'id': party.id,
                'title': party.title,
                'description': party.description,
                'restaurant_name': party.restaurant_name,
                'restaurant_address': party.restaurant_address,
                'meeting_time': party.meeting_time.isoformat() if party.meeting_time else None,
                'max_participants': party.max_participants,
                'current_participants': len(member_list),
                'host_employee_id': party.host_employee_id,
                'members': member_list,
                'created_at': party.created_at.isoformat() if party.created_at else None
            })
        
        return jsonify({
            'success': True,
            'parties': party_list,
            'total': len(party_list)
        })
    except Exception as e:
        logger.error(f"개발용 파티 API 오류: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@root_compatibility_bp.route('/dev/chat/messages/<string:chat_type>/<int:chat_id>', methods=['GET'])
def root_dev_chat_messages(chat_type, chat_id):
    """루트 레벨 개발용 채팅 메시지 API"""
    logger.info(f"루트 레벨 개발용 채팅 메시지 API 호출됨: {chat_type}/{chat_id}")
    
    # 개발 환경에서는 인증 우회하고 가상 메시지 데이터 반환
    try:
        return jsonify({
            'success': True,
            'messages': [
                {
                    'id': 1,
                    'sender_id': '2',
                    'sender_name': '친구1',
                    'content': '안녕하세요!',
                    'timestamp': '2025-09-23T10:30:00Z',
                    'type': 'text'
                },
                {
                    'id': 2,
                    'sender_id': '1',
                    'sender_name': '나',
                    'content': '안녕하세요! 오늘 점심 어디 갈까요?',
                    'timestamp': '2025-09-23T10:31:00Z',
                    'type': 'text'
                }
            ],
            'message': '개발 환경: 가상 채팅 메시지 데이터'
        })
    except Exception as e:
        logger.error(f"개발용 채팅 메시지 API 오류: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
