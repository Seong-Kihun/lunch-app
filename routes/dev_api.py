"""
개발용 API 엔드포인트들
인증 없이 테스트할 수 있는 API들을 제공합니다.
"""

from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
import random
from sqlalchemy import desc
from extensions import db
from models.app_models import (
    User, Party, PartyMember, DangolPot, DangolPotMember, 
    ChatRoom, ChatParticipant, ChatMessage, LunchProposal, 
    ProposalAcceptance, Notification, Restaurant, RestaurantReviews,
    MessageStatus, MessageReaction, MessageAttachment, ChatRoomMember,
    ChatRoomSettings, NotificationSettings, ChatNotification, MessageSearchIndex
)

# 개발용 API Blueprint 생성
dev_bp = Blueprint('dev', __name__, url_prefix='/dev')

# 개발용 API는 보안 검사를 우회하도록 설정
@dev_bp.before_request
def bypass_security_for_dev():
    """개발용 API는 보안 검사를 우회합니다."""
    # 개발용 API는 보안 검사를 건너뛰도록 설정
    pass

@dev_bp.route('/users/<employee_id>', methods=['GET'])
def get_dev_user(employee_id):
    """개발용 임시 유저 API - 인증 없이 테스트 가능"""
    try:
        # 간단한 임시 유저 데이터
        temp_users = {
            "1": {
                "employee_id": "1",
                "nickname": "김철수",
                "foodPreferences": ["한식", "중식"],
                "lunchStyle": ["맛집 탐방", "새로운 메뉴 도전"],
                "allergies": ["없음"],
                "preferredTime": "12:00",
            },
            "2": {
                "employee_id": "2",
                "nickname": "이영희",
                "foodPreferences": ["양식", "일식"],
                "lunchStyle": ["건강한 식사", "분위기 좋은 곳"],
                "allergies": ["없음"],
                "preferredTime": "11:45",
            }
        }
        
        if employee_id in temp_users:
            return jsonify(temp_users[employee_id])
        else:
            return jsonify({"error": "사용자를 찾을 수 없습니다."}), 404

    except Exception as e:
        return jsonify({"error": "임시 유저 데이터 조회 중 오류가 발생했습니다."}), 500

@dev_bp.route('/users', methods=['GET'])
def get_dev_users_list():
    """개발용 임시 유저 목록 API"""
    try:
        # 실제 닉네임으로 유저 목록 반환
        users_list = [
            {"employee_id": "1", "nickname": "김철수"},
            {"employee_id": "2", "nickname": "이영희"},
            {"employee_id": "3", "nickname": "박민수"},
            {"employee_id": "4", "nickname": "최지은"},
            {"employee_id": "5", "nickname": "정현우"},
            {"employee_id": "6", "nickname": "한소영"},
            {"employee_id": "7", "nickname": "윤준호"},
            {"employee_id": "8", "nickname": "송미라"},
            {"employee_id": "9", "nickname": "강동현"},
            {"employee_id": "10", "nickname": "임서연"},
            {"employee_id": "11", "nickname": "오태호"},
            {"employee_id": "12", "nickname": "신유진"},
            {"employee_id": "13", "nickname": "조성민"},
            {"employee_id": "14", "nickname": "백하은"},
            {"employee_id": "15", "nickname": "남준석"},
            {"employee_id": "16", "nickname": "류지현"},
            {"employee_id": "17", "nickname": "차준호"},
            {"employee_id": "18", "nickname": "구미영"},
            {"employee_id": "19", "nickname": "홍성훈"},
            {"employee_id": "20", "nickname": "전소연"},
        ]
        return jsonify(users_list)
    except Exception as e:
        return jsonify({"error": "임시 유저 목록 조회 중 오류가 발생했습니다."}), 500

    @dev_bp.route('/schedules', methods=['GET', 'POST'])
    def dev_schedules():
        """개발용 일정 조회/생성 API - 인증 없이 테스트 가능"""
        if request.method == 'GET':
            # GET: 일정 조회
            try:
                print("🚨 [DEBUG] dev_schedules GET 메서드 실행됨!")
                # 쿼리 파라미터 가져오기
                start_date_str = request.args.get('start_date')
                end_date_str = request.args.get('end_date')
                employee_id = request.args.get('employee_id')
                print(f"🚨 [DEBUG] 파라미터: start_date={start_date_str}, end_date={end_date_str}, employee_id={employee_id}")
                
                if not all([start_date_str, end_date_str, employee_id]):
                    return jsonify({
                        'error': '필수 파라미터가 누락되었습니다',
                        'required': ['start_date', 'end_date', 'employee_id']
                    }), 400
                
                # 실제 데이터베이스에서 일정 조회
                print("🚨 [DEBUG] 데이터베이스에서 일정 조회 시작...")
                from models.schedule_models import PersonalSchedule
                from extensions import db
                from datetime import datetime
                
                # 날짜 범위로 일정 조회
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
                
                schedules = PersonalSchedule.query.filter(
                    PersonalSchedule.employee_id == employee_id,
                    PersonalSchedule.start_date >= start_date,
                    PersonalSchedule.start_date <= end_date
                ).all()
                
                # 일정 데이터를 API 형식으로 변환
                sample_schedules = []
                for schedule in schedules:
                    sample_schedules.append({
                        "id": schedule.id,
                        "title": schedule.title,
                        "start_date": schedule.start_date.isoformat(),
                        "end_date": schedule.start_date.isoformat(),
                        "start_time": schedule.time + ":00" if schedule.time else "12:00:00",
                        "end_time": (schedule.time + ":00" if schedule.time else "12:00:00"),
                        "is_recurring": schedule.is_recurring or False,
                        "recurrence_type": schedule.recurrence_type,
                        "description": schedule.description or "",
                        "location": schedule.location or "",
                        "status": "confirmed",
                        "restaurant": schedule.restaurant or "",
                        "created_by": schedule.created_by or schedule.employee_id,
                        "created_at": schedule.created_at.isoformat() if schedule.created_at else None
                    })
                
                print(f"🔍 [개발용] 일정 조회 결과: {len(sample_schedules)}개 일정")
                for schedule in sample_schedules:
                    print(f"  - {schedule['title']} ({schedule['start_date']})")
                
                return jsonify({
                    'success': True,
                    'data': sample_schedules,
                    'period': {
                        'start_date': start_date_str,
                        'end_date': end_date_str
                    },
                    'total_dates': len(sample_schedules)
                })
                
            except Exception as e:
                return jsonify({
                    'error': '개발용 일정 조회 중 오류가 발생했습니다',
                    'message': str(e)
                }), 500
        
        elif request.method == 'POST':
            # POST: 일정 생성
            try:
                data = request.get_json()
                if not data:
                    return jsonify({'error': '요청 데이터가 없습니다'}), 400
                
                print(f"🔍 [개발용] 일정 생성 요청 데이터: {data}")
                
                # 필수 필드 검증
                required_fields = ['employee_id', 'title', 'start_date', 'time']
                for field in required_fields:
                    if field not in data:
                        return jsonify({'error': f'필수 필드가 누락되었습니다: {field}'}), 400
                
                # 실제 데이터베이스에 일정 저장
                from models.schedule_models import PersonalSchedule
                from extensions import db
                from datetime import datetime
                
                # 반복일정 처리
                if data.get('is_recurring', False) and data.get('recurrence_type'):
                    # 반복일정의 경우 모든 반복 인스턴스 생성
                    from datetime import timedelta
                    
                    start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
                    recurrence_type = data.get('recurrence_type')
                    recurrence_interval = data.get('recurrence_interval', 1)
                    recurrence_end_date = datetime.strptime(data['recurrence_end_date'], '%Y-%m-%d').date() if data.get('recurrence_end_date') else None
                    
                    # 기본 종료일 설정 (10년 후)
                    if not recurrence_end_date:
                        recurrence_end_date = start_date + timedelta(days=3650)  # 10년 = 3650일
                    
                    created_schedules = []
                    current_date = start_date
                    
                    while current_date <= recurrence_end_date:
                        # PersonalSchedule 객체 생성
                        new_schedule = PersonalSchedule(
                            employee_id=data['employee_id'],
                            title=data['title'],
                            start_date=current_date,
                            time=data['time'],
                            restaurant=data.get('restaurant', ''),
                            location=data.get('location', ''),
                            description=data.get('description', ''),
                            is_recurring=False,  # 개별 인스턴스는 반복이 아님
                            recurrence_type=None,
                            recurrence_interval=1,
                            recurrence_end_date=None,
                            created_by=data.get('created_by', data['employee_id'])
                        )
                        
                        db.session.add(new_schedule)
                        created_schedules.append(new_schedule)
                        
                        # 다음 반복일 계산
                        if recurrence_type == 'daily':
                            current_date += timedelta(days=recurrence_interval)
                        elif recurrence_type == 'weekly':
                            current_date += timedelta(weeks=recurrence_interval)
                        elif recurrence_type == 'monthly':
                            # 간단한 월별 계산 (30일)
                            current_date += timedelta(days=30 * recurrence_interval)
                        else:
                            break
                    
                    db.session.commit()
                    
                    # 첫 번째 생성된 일정을 응답으로 사용
                    new_schedule = created_schedules[0] if created_schedules else None
                    
                else:
                    # 일반 일정 생성
                    new_schedule = PersonalSchedule(
                        employee_id=data['employee_id'],
                        title=data['title'],
                        start_date=datetime.strptime(data['start_date'], '%Y-%m-%d').date(),
                        time=data['time'],
                        restaurant=data.get('restaurant', ''),
                        location=data.get('location', ''),
                        description=data.get('description', ''),
                        is_recurring=data.get('is_recurring', False),
                        recurrence_type=data.get('recurrence_type'),
                        recurrence_interval=data.get('recurrence_interval', 1),
                        recurrence_end_date=datetime.strptime(data['recurrence_end_date'], '%Y-%m-%d').date() if data.get('recurrence_end_date') else None,
                        created_by=data.get('created_by', data['employee_id'])
                    )
                    
                    # 데이터베이스에 저장
                    db.session.add(new_schedule)
                    db.session.commit()
                
                # 성공 응답
                response_data = {
                    'success': True,
                    'data': {
                        'id': new_schedule.id,
                        'employee_id': new_schedule.employee_id,
                        'title': new_schedule.title,
                        'start_date': new_schedule.start_date.isoformat(),
                        'time': new_schedule.time,
                        'restaurant': new_schedule.restaurant or '',
                        'location': new_schedule.location or '',
                        'description': new_schedule.description or '',
                        'is_recurring': new_schedule.is_recurring or False,
                        'recurrence_type': new_schedule.recurrence_type,
                        'recurrence_interval': new_schedule.recurrence_interval or 1,
                        'recurrence_end_date': new_schedule.recurrence_end_date.isoformat() if new_schedule.recurrence_end_date else None,
                        'created_by': new_schedule.created_by,
                        'created_at': new_schedule.created_at.isoformat() if new_schedule.created_at else None
                    },
                    'message': '일정이 성공적으로 생성되었습니다'
                }
                
                print(f"✅ [개발용] 일정 생성 성공: {response_data}")
                return jsonify(response_data), 201
                
            except Exception as e:
                print(f"❌ [개발용] 일정 생성 오류: {e}")
                return jsonify({
                    'error': '개발용 일정 생성 중 오류가 발생했습니다',
                    'message': str(e)
                }), 500

    @dev_bp.route('/schedules/<int:schedule_id>', methods=['PUT'])
    def update_dev_schedule(schedule_id):
        """개발용 일정 수정 API - 인증 없이 테스트 가능"""
        try:
            from models.schedule_models import PersonalSchedule
            from extensions import db
            from datetime import datetime
            
            # 일정 조회
            schedule = PersonalSchedule.query.get(schedule_id)
            if not schedule:
                return jsonify({
                    'error': '일정을 찾을 수 없습니다',
                    'schedule_id': schedule_id
                }), 404
            
            # 요청 데이터 가져오기
            data = request.get_json()
            if not data:
                return jsonify({
                    'error': '요청 데이터가 없습니다'
                }), 400
            
            # 일정 수정
            if 'title' in data:
                schedule.title = data['title']
            if 'start_date' in data:
                schedule.start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
            if 'time' in data:
                schedule.time = data['time']
            if 'restaurant' in data:
                schedule.restaurant = data.get('restaurant', '')
            if 'location' in data:
                schedule.location = data.get('location', '')
            if 'description' in data:
                schedule.description = data.get('description', '')
            if 'is_recurring' in data:
                schedule.is_recurring = data.get('is_recurring', False)
            if 'recurrence_type' in data:
                schedule.recurrence_type = data.get('recurrence_type')
            if 'recurrence_interval' in data:
                schedule.recurrence_interval = data.get('recurrence_interval', 1)
            if 'recurrence_end_date' in data:
                schedule.recurrence_end_date = datetime.strptime(data['recurrence_end_date'], '%Y-%m-%d').date() if data.get('recurrence_end_date') else None
            
            # 데이터베이스에 저장
            db.session.commit()
            
            print(f"✅ [개발용] 일정 수정 성공: ID {schedule_id}")
            
            return jsonify({
                'success': True,
                'message': '일정이 성공적으로 수정되었습니다',
                'data': {
                    'id': schedule.id,
                    'employee_id': schedule.employee_id,
                    'title': schedule.title,
                    'start_date': schedule.start_date.isoformat(),
                    'time': schedule.time,
                    'restaurant': schedule.restaurant or '',
                    'location': schedule.location or '',
                    'description': schedule.description or '',
                    'is_recurring': schedule.is_recurring or False,
                    'recurrence_type': schedule.recurrence_type,
                    'recurrence_interval': schedule.recurrence_interval or 1,
                    'recurrence_end_date': schedule.recurrence_end_date.isoformat() if schedule.recurrence_end_date else None,
                    'created_by': schedule.created_by,
                    'created_at': schedule.created_at.isoformat() if schedule.created_at else None
                }
            })
            
        except Exception as e:
            print(f"❌ [개발용] 일정 수정 실패: {str(e)}")
            return jsonify({
                'error': '일정 수정 중 오류가 발생했습니다',
                'message': str(e)
            }), 500

    @dev_bp.route('/schedules/<int:schedule_id>', methods=['DELETE'])
    def delete_dev_schedule(schedule_id):
        """개발용 일정 삭제 API - 인증 없이 테스트 가능"""
        try:
            from models.schedule_models import PersonalSchedule
            from extensions import db
            
            # 일정 조회
            schedule = PersonalSchedule.query.get(schedule_id)
            if not schedule:
                return jsonify({
                    'error': '일정을 찾을 수 없습니다',
                    'schedule_id': schedule_id
                }), 404
            
            # 일정 삭제
            db.session.delete(schedule)
            db.session.commit()
            
            print(f"✅ [개발용] 일정 삭제 성공: ID {schedule_id}")
            
            return jsonify({
                'success': True,
                'message': '일정이 성공적으로 삭제되었습니다',
                'deleted_id': schedule_id
            }), 200
            
        except Exception as e:
            print(f"❌ [개발용] 일정 삭제 오류: {e}")
            return jsonify({
                'error': '개발용 일정 삭제 중 오류가 발생했습니다',
                    'message': str(e)
                }), 500

    @dev_bp.route('/users/<employee_id>/lunch-history', methods=['GET'])
    def get_dev_lunch_history(employee_id):
        """개발용 점심 약속 히스토리 API - 인증 없이 테스트 가능"""
        try:
            # 가상 점심 약속 히스토리 생성 (실제로는 데이터베이스에서 조회)
            # 각 유저별로 최근 30일간의 점심 약속 히스토리 생성
            from datetime import datetime, timedelta
            
            # 최근 30일간의 랜덤한 점심 약속 생성
            lunch_history = []
            today = datetime.now().date()
            
            for i in range(10):  # 10개의 히스토리 생성
                date = today - timedelta(days=random.randint(1, 30))
                restaurants = [
                    "맛있는 김치찌개", "피자헛", "맥도날드", "서브웨이", 
                    "본죽", "김밥천국", "한솥도시락", "파스타마니아"
                ]
                
                lunch_history.append({
                    "id": i + 1,
                    "date": date.isoformat(),
                    "restaurant": random.choice(restaurants),
                    "participants": random.randint(2, 6),
                    "rating": random.randint(3, 5),
                    "review": f"{date.strftime('%m월 %d일')} 점심은 정말 맛있었어요!"
                })
            
            # 날짜순 정렬 (최신순)
            lunch_history.sort(key=lambda x: x['date'], reverse=True)
            
            return jsonify({
                "success": True,
                "data": lunch_history,
                "total": len(lunch_history),
                "employee_id": employee_id
            })
            
        except Exception as e:
            return jsonify({
                "error": "점심 약속 히스토리 조회 중 오류가 발생했습니다.",
                "message": str(e)
            }), 500

    @dev_bp.route('/parties', methods=['GET'])
    def get_dev_parties():
        """개발용 파티 목록 API - 인증 없이 테스트 가능"""
        try:
            # 개발용 샘플 파티 데이터
            sample_parties = [
                {
                    "id": 1,
                    "title": "점심 모임",
                    "restaurant_name": "맛있는 김치찌개",
                    "restaurant_address": "서울시 강남구 테헤란로 123",
                    "party_date": "2025-09-09",
                    "party_time": "12:00:00",
                    "meeting_location": "사무실 로비",
                    "max_members": 4,
                    "current_members": 2,
                    "is_from_match": False,
                    "host": {
                        "employee_id": "1",
                        "name": "김철수"
                    },
                    "created_at": "2025-09-08T10:00:00Z"
                },
                {
                    "id": 2,
                    "title": "랜덤런치",
                    "restaurant_name": "피자헛",
                    "restaurant_address": "서울시 강남구 테헤란로 456",
                    "party_date": "2025-09-10",
                    "party_time": "12:30:00",
                    "meeting_location": "사무실 앞",
                    "max_members": 6,
                    "current_members": 4,
                    "is_from_match": True,
                    "host": {
                        "employee_id": "2",
                        "name": "이영희"
                    },
                    "created_at": "2025-09-08T11:00:00Z"
                }
            ]
            
            return jsonify({
                "success": True,
                "parties": sample_parties,
                "total": len(sample_parties)
            })
            
        except Exception as e:
            return jsonify({
                "error": "개발용 파티 목록 조회 중 오류가 발생했습니다.",
                "message": str(e)
            }), 500

    @dev_bp.route('/restaurants', methods=['GET'])
    def get_dev_restaurants():
        """개발용 식당 목록 API - 실제 데이터베이스에서 조회"""
        try:
            from models.restaurant_models import RestaurantV2
            
            # 쿼리 파라미터 처리
            page = int(request.args.get('page', 1))
            limit = int(request.args.get('limit', 100))
            search = request.args.get('search', '').strip()
            category = request.args.get('category', '').strip()
            lat = request.args.get('lat')
            lng = request.args.get('lng')
            radius = request.args.get('radius')
            
            # 기본 쿼리
            query = RestaurantV2.query.filter_by(is_active=True)
            
            # 검색어 필터링
            if search:
                query = query.filter(
                    db.or_(
                        RestaurantV2.name.contains(search),
                        RestaurantV2.address.contains(search),
                        RestaurantV2.category.contains(search)
                    )
                )
            
            # 카테고리 필터링
            if category:
                query = query.filter(RestaurantV2.category == category)
            
            # 위치 기반 필터링
            if lat and lng and radius:
                try:
                    lat_float = float(lat)
                    lng_float = float(lng)
                    radius_float = float(radius)
                    
                    # 간단한 거리 계산을 위한 위도/경도 범위 계산
                    lat_range = radius_float / 111.0  # 대략적인 위도 1도 = 111km
                    lng_range = radius_float / (111.0 * abs(lat_float))
                    
                    query = query.filter(
                        RestaurantV2.latitude.between(lat_float - lat_range, lat_float + lat_range),
                        RestaurantV2.longitude.between(lng_float - lng_range, lng_float + lng_range)
                    )
                except ValueError:
                    pass  # 잘못된 좌표값이면 무시
            
            # 정렬
            query = query.order_by(RestaurantV2.name)
            
            # 페이지네이션
            offset = (page - 1) * limit
            restaurants = query.offset(offset).limit(limit).all()
            
            # 데이터 변환
            restaurant_list = []
            for restaurant in restaurants:
                restaurant_list.append({
                    "id": restaurant.id,
                    "name": restaurant.name,
                    "address": restaurant.address,
                    "latitude": restaurant.latitude,
                    "longitude": restaurant.longitude,
                    "phone": restaurant.phone or "",
                    "category": restaurant.category or "기타",
                    "rating": 4.0,  # 기본값
                    "is_active": restaurant.is_active,
                    "price_range": "$$",  # 기본값
                    "opening_hours": "11:00-22:00"  # 기본값
                })
            
            return jsonify({
                "success": True,
                "restaurants": restaurant_list,
                "total": len(restaurant_list),
                "page": page,
                "limit": limit
            })
            
        except Exception as e:
            return jsonify({
                "error": "식당 목록 조회 중 오류가 발생했습니다.",
                "message": str(e)
            }), 500

    # ===== 실제 API 엔드포인트들을 개발용으로 추가 =====

    @dev_bp.route('/api/users/profile', methods=['GET'])
    def get_dev_user_profile():
        """개발용 사용자 프로필 API - 인증 없이 테스트 가능"""
        try:
            # 임시 사용자 프로필 데이터
            profile_data = {
                "success": True,
                "message": "사용자 프로필 조회 성공",
                "employee_id": "1",
                "profile": {
                    "employee_id": "1",
                    "nickname": "김철수",
                    "email": "kim@company.com",
                    "main_dish_genre": "한식",
                    "lunch_preference": "맛집 탐방",
                    "allergies": ["없음"],
                    "preferred_time": "12:00",
                    "frequent_areas": ["강남구", "서초구"]
                }
            }
            return jsonify(profile_data)
            
        except Exception as e:
            return jsonify({'error': '사용자 프로필 조회 중 오류가 발생했습니다.', 'details': str(e)}), 500

    @dev_bp.route('/api/users/activity-stats', methods=['GET'])
    def get_dev_user_activity_stats():
        """개발용 사용자 활동 통계 API - 인증 없이 테스트 가능"""
        try:
            period = request.args.get('period', 'month')
            
            stats = {
                'total_activities': 15,
                'reviews_written': 8,
                'parties_joined': 5,
                'random_lunches': 3,
                'favorite_category': '한식',
                'appointment_type_breakdown': {
                    '랜덤런치': 3,
                    '파티 참여': 5,
                    '개인 약속': 2,
                    '단골파티': 2,
                    '기타': 3
                },
                'category_breakdown': {
                    '한식': 8,
                    '양식': 4,
                    '일식': 2,
                    '중식': 1
                },
                'period': period,
                'start_date': '2025-08-09T00:00:00',
                'end_date': '2025-09-08T23:59:59'
            }
            
            return jsonify({
                'success': True,
                'message': '활동 통계 조회 성공',
                'stats': stats
            })
            
        except Exception as e:
            return jsonify({'error': '활동 통계 조회 중 오류가 발생했습니다.', 'details': str(e)}), 500

    @dev_bp.route('/api/users/dashboard', methods=['GET'])
    def get_dev_user_dashboard():
        """개발용 사용자 대시보드 API - 인증 없이 테스트 가능"""
        try:
            dashboard_data = {
                'total_lunches': 25,
                'total_parties': 12,
                'total_reviews': 18,
                'favorite_category': '한식',
                'weekly_goal': 3,
                'weekly_progress': 2,
                'streak': 5,
                'rank': 3,
                'total_users': 20,
                'user_points': 12500
            }
            
            return jsonify({
                'success': True,
                'message': '대시보드 데이터 조회 성공',
                'data': dashboard_data
            })
            
        except Exception as e:
            return jsonify({'error': '대시보드 데이터 조회 중 오류가 발생했습니다.', 'details': str(e)}), 500

    @dev_bp.route('/api/users/appointments', methods=['GET'])
    def get_dev_user_appointments():
        """개발용 사용자 약속 목록 API - 인증 없이 테스트 가능"""
        try:
            status = request.args.get('status', 'all')
            page = int(request.args.get('page', 1))
            limit = int(request.args.get('limit', 20))
            
            appointments = [
                {
                    'id': 'party_1',
                    'type': 'party',
                    'title': '점심 모임',
                    'restaurant_name': '맛있는 김치찌개',
                    'restaurant_address': '서울시 강남구 테헤란로 123',
                    'date': '2025-09-09',
                    'time': '12:00:00',
                    'meeting_location': '사무실 로비',
                    'status': 'upcoming',
                    'is_host': True,
                    'member_count': 2,
                    'max_members': 4
                },
                {
                    'id': 'party_2',
                    'type': 'party',
                    'title': '랜덤런치',
                    'restaurant_name': '피자헛',
                    'restaurant_address': '서울시 강남구 테헤란로 456',
                    'date': '2025-09-10',
                    'time': '12:30:00',
                    'meeting_location': '사무실 앞',
                    'status': 'upcoming',
                    'is_host': False,
                    'member_count': 4,
                    'max_members': 6
                },
                {
                    'id': 'schedule_1',
                    'type': 'personal',
                    'title': '개인 약속',
                    'description': '병원 예약',
                    'date': '2025-09-11',
                    'time': '14:00:00',
                    'status': 'upcoming',
                    'is_recurring': False,
                    'recurrence_type': None
                }
            ]
            
            # 상태별 필터링
            if status != 'all':
                appointments = [apt for apt in appointments if apt['status'] == status]
            
            # 페이지네이션
            total_count = len(appointments)
            start_idx = (page - 1) * limit
            end_idx = start_idx + limit
            paginated_appointments = appointments[start_idx:end_idx]
            
            return jsonify({
                'success': True,
                'message': '약속 목록 조회 성공',
                'data': {
                    'appointments': paginated_appointments,
                    'pagination': {
                        'page': page,
                        'limit': limit,
                        'total_count': total_count,
                        'total_pages': (total_count + limit - 1) // limit
                    }
                }
            })
            
        except Exception as e:
            return jsonify({'error': '약속 목록 조회 중 오류가 발생했습니다.', 'details': str(e)}), 500

    @dev_bp.route('/api/users/points', methods=['GET'])
    def get_dev_user_points():
        """개발용 사용자 포인트 API - 인증 없이 테스트 가능"""
        try:
            points_data = {
                'total_points': 12500,
                'current_level': 3,
                'level_title': '점심 마스터',
                'next_level_points': 7500,
                'progress_percentage': 67
            }
            
            return jsonify({
                'success': True,
                'message': '포인트 정보 조회 성공',
                'data': points_data
            })
            
        except Exception as e:
            return jsonify({'error': '포인트 정보 조회 중 오류가 발생했습니다.', 'details': str(e)}), 500

    @dev_bp.route('/api/users/badges', methods=['GET'])
    def get_dev_user_badges():
        """개발용 사용자 배지 API - 인증 없이 테스트 가능"""
        try:
            badges = [
                {
                    'id': 'first_lunch',
                    'name': '첫 점심',
                    'description': '첫 번째 점심 약속을 완료했습니다',
                    'icon': '🍽️',
                    'earned_at': '2025-08-15T12:00:00Z',
                    'is_earned': True
                },
                {
                    'id': 'social_butterfly',
                    'name': '사교적인 사람',
                    'description': '10번의 파티에 참여했습니다',
                    'icon': '🦋',
                    'earned_at': '2025-09-01T12:00:00Z',
                    'is_earned': True
                },
                {
                    'id': 'food_critic',
                    'name': '음식 평론가',
                    'description': '20개의 리뷰를 작성했습니다',
                    'icon': '⭐',
                    'earned_at': None,
                    'is_earned': False
                }
            ]
            
            return jsonify({
                'success': True,
                'message': '배지 목록 조회 성공',
                'data': {
                    'badges': badges
                }
            })
            
        except Exception as e:
            return jsonify({'error': '배지 목록 조회 중 오류가 발생했습니다.', 'details': str(e)}), 500

    # ===== 추가 API 엔드포인트들 =====

    @dev_bp.route('/api/v2/restaurants', methods=['GET'])
    def get_dev_restaurants_v2():
        """개발용 식당 목록 v2 API - 실제 데이터베이스에서 조회"""
        try:
            from models.restaurant_models import RestaurantV2
            
            # 쿼리 파라미터 처리
            page = int(request.args.get('page', 1))
            limit = int(request.args.get('limit', 1000))
            lat = request.args.get('lat')
            lng = request.args.get('lng')
            radius = request.args.get('radius')
            sort = request.args.get('sort', 'name')
            
            # 기본 쿼리
            query = RestaurantV2.query.filter_by(is_active=True)
            
            # 위치 기반 필터링 (간단한 구현)
            if lat and lng and radius:
                try:
                    lat_float = float(lat)
                    lng_float = float(lng)
                    radius_float = float(radius)
                    
                    # 간단한 거리 계산을 위한 위도/경도 범위 계산
                    lat_range = radius_float / 111.0  # 대략적인 위도 1도 = 111km
                    lng_range = radius_float / (111.0 * abs(lat_float))  # 경도는 위도에 따라 다름
                    
                    query = query.filter(
                        RestaurantV2.latitude.between(lat_float - lat_range, lat_float + lat_range),
                        RestaurantV2.longitude.between(lng_float - lng_range, lng_float + lng_range)
                    )
                except ValueError:
                    pass  # 잘못된 좌표값이면 무시
            
            # 정렬
            if sort == 'name':
                query = query.order_by(RestaurantV2.name)
            elif sort == 'distance' and lat and lng:
                # 거리순 정렬은 간단히 위도 기준으로
                query = query.order_by(RestaurantV2.latitude)
            else:
                query = query.order_by(RestaurantV2.name)
            
            # 페이지네이션
            offset = (page - 1) * limit
            restaurants = query.offset(offset).limit(limit).all()
            
            # 데이터 변환
            restaurant_list = []
            for restaurant in restaurants:
                restaurant_list.append({
                    "id": restaurant.id,
                    "name": restaurant.name,
                    "address": restaurant.address,
                    "latitude": restaurant.latitude,
                    "longitude": restaurant.longitude,
                    "phone": restaurant.phone or "",
                    "category": restaurant.category or "기타",
                    "rating": 4.0,  # 기본값
                    "distance": 0.5,  # 기본값
                    "is_active": restaurant.is_active,
                    "price_range": "$$",  # 기본값
                    "opening_hours": "11:00-22:00"  # 기본값
                })
            
            return jsonify({
                "success": True,
                "restaurants": restaurant_list,
                "total": len(restaurant_list),
                "sort": sort,
                "limit": limit
            })
            
        except Exception as e:
            return jsonify({
                "error": "식당 목록 조회 중 오류가 발생했습니다.",
                "message": str(e)
            }), 500

    @dev_bp.route('/api/restaurants/search', methods=['GET'])
    def get_dev_restaurants_search():
        """개발용 식당 검색 API - 인증 없이 테스트 가능"""
        try:
            query = request.args.get('q', '').strip()
            page = int(request.args.get('page', 1))
            limit = int(request.args.get('limit', 50))
            sort = request.args.get('sort', 'name')
            
            # 실제 데이터베이스에서 검색
            from models.restaurant_models import RestaurantV2
            from extensions import db
            
            # 데이터베이스에서 검색
            db_query = RestaurantV2.query.filter_by(is_active=True)
            
            # 검색어가 있으면 필터링
            if query:
                db_query = db_query.filter(
                    db.or_(
                        RestaurantV2.name.contains(query),
                        RestaurantV2.address.contains(query),
                        RestaurantV2.category.contains(query)
                    )
                )
            
            # 정렬
            if sort == 'rating':
                db_query = db_query.order_by(RestaurantV2.rating.desc())
            elif sort == 'name':
                db_query = db_query.order_by(RestaurantV2.name)
            else:
                db_query = db_query.order_by(RestaurantV2.name)
            
            # 페이지네이션
            offset = (page - 1) * limit
            restaurants = db_query.offset(offset).limit(limit).all()
            
            # 응답 형식으로 변환
            restaurant_list = []
            for restaurant in restaurants:
                restaurant_list.append({
                    "id": restaurant.id,
                    "name": restaurant.name,
                    "address": restaurant.address,
                    "latitude": restaurant.latitude,
                    "longitude": restaurant.longitude,
                    "phone": restaurant.phone or "",
                    "category": restaurant.category or "기타",
                    "rating": 4.0,  # 기본값
                    "distance": 0.5,  # 기본값
                    "is_active": restaurant.is_active,
                    "price_range": "$$",
                    "opening_hours": "11:00-22:00"
                })
            
            return jsonify({
                "success": True,
                "restaurants": restaurant_list,
                "total": len(restaurant_list),
                "page": page,
                "limit": limit,
                "sort": sort
            })
            
        except Exception as e:
            return jsonify({
                "error": "식당 검색 중 오류가 발생했습니다.",
                "message": str(e)
            }), 500

    @dev_bp.route('/api/restaurants/frequent', methods=['GET'])
    def get_dev_frequent_restaurants():
        """개발용 자주 가는 식당 API - 인증 없이 테스트 가능"""
        try:
            # 개발용 자주 가는 식당 데이터
            frequent_restaurants = [
                {
                    "id": 1,
                    "name": "맛있는 김치찌개",
                    "address": "서울시 강남구 테헤란로 123",
                    "category": "한식",
                    "rating": 4.5,
                    "visit_count": 15
                },
                {
                    "id": 2,
                    "name": "피자헛",
                    "address": "서울시 강남구 테헤란로 456",
                    "category": "양식",
                    "rating": 4.2,
                    "visit_count": 8
                }
            ]
            
            return jsonify({
                "success": True,
                "restaurants": frequent_restaurants
            })
            
        except Exception as e:
            return jsonify({
                "error": "자주 가는 식당 조회 중 오류가 발생했습니다.",
                "message": str(e)
            }), 500

    @dev_bp.route('/api/v2/restaurants/categories', methods=['GET'])
    def get_dev_restaurant_categories():
        """개발용 식당 카테고리 API - 인증 없이 테스트 가능"""
        try:
            categories = [
                {"id": "korean", "name": "한식", "count": 15},
                {"id": "western", "name": "양식", "count": 12},
                {"id": "japanese", "name": "일식", "count": 8},
                {"id": "chinese", "name": "중식", "count": 6},
                {"id": "fastfood", "name": "패스트푸드", "count": 10},
                {"id": "salad", "name": "샐러드", "count": 5},
                {"id": "cafe", "name": "카페", "count": 20},
                {"id": "dessert", "name": "디저트", "count": 7}
            ]
            
            return jsonify({
                "success": True,
                "categories": categories,
                "total": len(categories)
            })
            
        except Exception as e:
            return jsonify({
                "error": "식당 카테고리 조회 중 오류가 발생했습니다.",
                "message": str(e)
            }), 500

    @dev_bp.route('/friends/<employee_id>', methods=['GET'])
    def get_dev_friends(employee_id):
        """개발용 친구 목록 API - 인증 없이 테스트 가능"""
        try:
            friends = [
                {
                    "id": 2,
                    "employee_id": "2",
                    "nickname": "이영희",
                    "status": "online",
                    "last_seen": "2025-09-08T13:20:00Z",
                    "mutual_friends": 3
                },
                {
                    "id": 3,
                    "employee_id": "3",
                    "nickname": "박민수",
                    "status": "offline",
                    "last_seen": "2025-09-07T18:30:00Z",
                    "mutual_friends": 2
                },
                {
                    "id": 4,
                    "employee_id": "4",
                    "nickname": "최지은",
                    "status": "online",
                    "last_seen": "2025-09-08T13:15:00Z",
                    "mutual_friends": 4
                },
                {
                    "id": 5,
                    "employee_id": "5",
                    "nickname": "정현우",
                    "status": "away",
                    "last_seen": "2025-09-08T12:45:00Z",
                    "mutual_friends": 1
                }
            ]
            
            return jsonify({
                "success": True,
                "friends": friends,
                "total": len(friends),
                "employee_id": employee_id
            })
            
        except Exception as e:
            return jsonify({
                "error": "친구 목록 조회 중 오류가 발생했습니다.",
                "message": str(e)
            }), 500


    @dev_bp.route('/my_dangolpots/<employee_id>', methods=['GET'])
    def get_dev_my_dangolpots(employee_id):
        """개발용 내 단골파티 목록 API - 인증 없이 접근 가능"""
        try:
            # 더미 단골파티 데이터
            dangolpots = [
                {
                    "id": 1,
                    "name": "점심 단골파티",
                    "description": "매일 점심 같이 먹는 단골파티",
                    "members": [
                        {"id": 1, "employee_id": employee_id, "nickname": "사용자"},
                        {"id": 2, "employee_id": "2", "nickname": "김철수"},
                        {"id": 3, "employee_id": "3", "nickname": "이영희"}
                    ],
                    "created_by": employee_id,
                    "created_at": "2025-09-01T10:00:00Z",
                    "is_active": True
                }
            ]
            
            return jsonify({
                "success": True,
                "dangolpots": dangolpots,
                "total": len(dangolpots),
                "employee_id": employee_id
            })
            
        except Exception as e:
            return jsonify({
                "error": "단골파티 목록 조회 중 오류가 발생했습니다.",
                "message": str(e)
            }), 500

    # === 개발용 고급 채팅 API들 ===

    @dev_bp.route("/dev/chat/messages/<int:message_id>/read", methods=["POST"])
    def dev_mark_message_read(message_id):
        """개발용: 메시지를 읽음으로 표시"""
        try:
            data = request.get_json()
            user_id = data.get('user_id', '1')  # 개발용 기본값
            
            # 기존 읽음 상태 확인
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
            
            return jsonify({
                "success": True,
                "message": "메시지가 읽음으로 표시되었습니다."
            }), 200
            
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 500

    @dev_bp.route("/dev/chat/messages/<int:message_id>/reaction", methods=["POST"])
    def dev_add_message_reaction(message_id):
        """개발용: 메시지에 반응 추가"""
        try:
            data = request.get_json()
            user_id = data.get('user_id', '1')
            reaction_type = data.get('reaction_type', 'like')
            
            # 기존 반응 확인
            existing_reaction = MessageReaction.query.filter_by(
                message_id=message_id,
                user_id=user_id,
                reaction_type=reaction_type
            ).first()
            
            if existing_reaction:
                db.session.delete(existing_reaction)
                action = "removed"
            else:
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

    @dev_bp.route("/dev/chat/messages/<int:message_id>", methods=["PUT"])
    def dev_edit_message(message_id):
        """개발용: 메시지 수정"""
        try:
            data = request.get_json()
            user_id = data.get('user_id', '1')
            new_content = data.get('content')
            
            if not new_content:
                return jsonify({"error": "수정할 내용이 필요합니다."}), 400
            
            message = ChatMessage.query.get(message_id)
            if not message:
                return jsonify({"error": "메시지를 찾을 수 없습니다."}), 404
            
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

    @dev_bp.route("/dev/chat/messages/<int:message_id>", methods=["DELETE"])
    def dev_delete_message(message_id):
        """개발용: 메시지 삭제"""
        try:
            data = request.get_json()
            user_id = data.get('user_id', '1')
            
            message = ChatMessage.query.get(message_id)
            if not message:
                return jsonify({"error": "메시지를 찾을 수 없습니다."}), 404
            
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

    @dev_bp.route("/dev/chat/search", methods=["GET"])
    def dev_search_messages():
        """개발용: 메시지 검색"""
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

    @dev_bp.route("/dev/chat/rooms/<chat_type>/<int:chat_id>/members", methods=["GET"])
    def dev_get_chat_room_members(chat_type, chat_id):
        """개발용: 채팅방 멤버 목록 조회"""
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

    @dev_bp.route("/dev/chat/rooms/<chat_type>/<int:chat_id>/settings", methods=["GET"])
    def dev_get_chat_room_settings(chat_type, chat_id):
        """개발용: 채팅방 설정 조회"""
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

    # === 개발용 파일 업로드 API들 ===

    @dev_bp.route("/dev/files/upload", methods=["POST"])
    def dev_upload_file():
        """개발용: 파일 업로드"""
        try:
            from utils.file_manager import file_manager
            
            if 'file' not in request.files:
                return jsonify({"error": "파일이 선택되지 않았습니다."}), 400
            
            file = request.files['file']
            if file.filename == '':
                return jsonify({"error": "파일이 선택되지 않았습니다."}), 400
            
            file_type = request.form.get('file_type', 'image')
            user_id = request.form.get('user_id', '1')  # 개발용 기본값
            
            # 파일 업로드
            file_metadata, message = file_manager.upload_file(file, file_type, user_id)
            
            if not file_metadata:
                return jsonify({"error": message}), 400
            
            return jsonify({
                "success": True,
                "message": message,
                "file_metadata": file_metadata
            }), 200
            
        except Exception as e:
            return jsonify({"error": f"파일 업로드 중 오류가 발생했습니다: {str(e)}"}), 500

    @dev_bp.route("/dev/files/storage/info", methods=["GET"])
    def dev_get_storage_info():
        """개발용: 저장소 정보 조회"""
        try:
            from utils.file_manager import file_manager
            
            storage_info = file_manager.get_storage_info()
            if not storage_info:
                return jsonify({"error": "저장소 정보를 가져올 수 없습니다."}), 500
            
            return jsonify({
                "success": True,
                "storage_info": storage_info
            }), 200
            
        except Exception as e:
            return jsonify({"error": f"저장소 정보 조회 중 오류가 발생했습니다: {str(e)}"}), 500

    @dev_bp.route("/dev/files/cleanup", methods=["POST"])
    def dev_cleanup_files():
        """개발용: 임시 파일 정리"""
        try:
            from utils.file_manager import file_manager
            
            max_age_hours = request.json.get('max_age_hours', 24) if request.json else 24
            file_manager.cleanup_temp_files(max_age_hours)
            
            return jsonify({
                "success": True,
                "message": f"{max_age_hours}시간 이상 된 임시 파일이 정리되었습니다."
            }), 200
            
        except Exception as e:
            return jsonify({"error": f"파일 정리 중 오류가 발생했습니다: {str(e)}"}), 500

    # === 개발용 알림 API들 ===

    @dev_bp.route("/dev/notifications/send", methods=["POST"])
    def dev_send_notification():
        """개발용: 알림 전송"""
        try:
            from utils.notification_manager import notification_manager
            
            data = request.get_json()
            user_id = data.get('user_id', '1')
            notification_type = data.get('notification_type', 'system')
            title = data.get('title', '개발용 테스트 알림')
            message = data.get('message', '이것은 개발용 테스트 알림입니다.')
            
            notification, result_message = notification_manager.create_notification(
                user_id=user_id,
                notification_type=notification_type,
                title=title,
                message=message,
                chat_type=data.get('chat_type'),
                chat_id=data.get('chat_id'),
                message_id=data.get('message_id')
            )
            
            if not notification:
                return jsonify({"error": result_message}), 400
            
            return jsonify({
                "success": True,
                "message": result_message,
                "notification_id": notification.id
            }), 200
            
        except Exception as e:
            return jsonify({"error": f"알림 전송 중 오류가 발생했습니다: {str(e)}"}), 500

    @dev_bp.route("/dev/notifications/user/<user_id>", methods=["GET"])
    def dev_get_user_notifications(user_id):
        """개발용: 사용자 알림 목록 조회"""
        try:
            from utils.notification_manager import notification_manager
            
            limit = int(request.args.get('limit', 20))
            offset = int(request.args.get('offset', 0))
            unread_only = request.args.get('unread_only', 'false').lower() == 'true'
            
            notifications, message = notification_manager.get_user_notifications(
                user_id, limit, offset, unread_only
            )
            
            return jsonify({
                "success": True,
                "notifications": notifications,
                "total": len(notifications),
                "message": message
            }), 200
            
        except Exception as e:
            return jsonify({"error": f"알림 목록 조회 중 오류가 발생했습니다: {str(e)}"}), 500

    @dev_bp.route("/dev/notifications/user/<user_id>/unread-count", methods=["GET"])
    def dev_get_unread_count(user_id):
        """개발용: 읽지 않은 알림 수 조회"""
        try:
            from utils.notification_manager import notification_manager
            
            chat_type = request.args.get('chat_type')
            chat_id = request.args.get('chat_id')
            
            count, message = notification_manager.get_unread_count(user_id, chat_type, chat_id)
            
            return jsonify({
                "success": True,
                "unread_count": count,
                "message": message
            }), 200
            
        except Exception as e:
            return jsonify({"error": f"읽지 않은 알림 수 조회 중 오류가 발생했습니다: {str(e)}"}), 500

    @dev_bp.route("/dev/notifications/settings/<user_id>", methods=["GET"])
    def dev_get_notification_settings(user_id):
        """개발용: 알림 설정 조회"""
        try:
            from utils.notification_manager import notification_manager
            
            settings, message = notification_manager.get_notification_settings(user_id)
            
            if not settings:
                return jsonify({"error": message}), 400
            
            return jsonify({
                "success": True,
                "settings": settings,
                "message": message
            }), 200
            
        except Exception as e:
            return jsonify({"error": f"알림 설정 조회 중 오류가 발생했습니다: {str(e)}"}), 500

    @dev_bp.route("/dev/notifications/settings/<user_id>", methods=["PUT"])
    def dev_update_notification_settings(user_id):
        """개발용: 알림 설정 업데이트"""
        try:
            from utils.notification_manager import notification_manager
            
            data = request.get_json()
            if not data:
                return jsonify({"error": "설정 데이터가 필요합니다."}), 400
            
            success, message = notification_manager.update_notification_settings(user_id, data)
            
            if not success:
                return jsonify({"error": message}), 400
            
            return jsonify({
                "success": True,
                "message": message
            }), 200
            
        except Exception as e:
            return jsonify({"error": f"알림 설정 업데이트 중 오류가 발생했습니다: {str(e)}"}), 500

    @dev_bp.route("/dev/notifications/types", methods=["GET"])
    def dev_get_notification_types():
        """개발용: 알림 타입 목록 조회"""
        try:
            from utils.notification_manager import notification_manager
            
            types = notification_manager.notification_types
            
            return jsonify({
                "success": True,
                "notification_types": types
            }), 200
            
        except Exception as e:
            return jsonify({"error": f"알림 타입 조회 중 오류가 발생했습니다: {str(e)}"}), 500

    # 추가 개발용 API들 (app.py에서 이동)

    @dev_bp.route("/dev/schedules", methods=["GET"])
    def get_dev_schedules():
        """개발용 일정 조회 API - 인증 없이 테스트 가능"""
        try:
            # 쿼리 파라미터 가져오기
            start_date_str = request.args.get('start_date')
            end_date_str = request.args.get('end_date')
            employee_id = request.args.get('employee_id')
            
            if not all([start_date_str, end_date_str, employee_id]):
                return jsonify({
                    'error': '필수 파라미터가 누락되었습니다',
                    'required': ['start_date', 'end_date', 'employee_id']
                }), 400
            
            # 실제 데이터베이스에서 일정 조회
            from models.schedule_models import PersonalSchedule, ScheduleAttendee
            from datetime import datetime
            
            # 날짜 범위로 일정 조회
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            
            schedules = PersonalSchedule.query.filter(
                PersonalSchedule.employee_id == employee_id,
                PersonalSchedule.start_date >= start_date,
                PersonalSchedule.start_date <= end_date
            ).all()
            
            # 일정 데이터를 API 형식으로 변환
            sample_schedules = []
            for schedule in schedules:
                # 참석자 정보 조회
                attendees = ScheduleAttendee.query.filter_by(schedule_id=schedule.id).all()
                attendees_data = []
                for attendee in attendees:
                    # 실제 사용자 정보 조회
                    nickname = get_nickname_by_id(attendee.employee_id)
                    attendees_data.append({
                        "employee_id": attendee.employee_id,
                        "id": attendee.employee_id,
                        "name": nickname,
                        "nickname": nickname
                    })
                
                # 반복일정 그룹 인식 로직
                is_recurring_group = False
                recurrence_type = None
                master_schedule_id = None
                
                if schedule.is_recurring:
                    # 마스터 일정인 경우
                    is_recurring_group = True
                    recurrence_type = schedule.recurrence_type
                    master_schedule_id = schedule.id
                elif schedule.master_schedule_id:
                    # 인스턴스 일정인 경우 - 마스터 일정 정보 조회
                    master_schedule = PersonalSchedule.query.get(schedule.master_schedule_id)
                    if master_schedule and master_schedule.is_recurring:
                        is_recurring_group = True
                        recurrence_type = master_schedule.recurrence_type
                        master_schedule_id = schedule.master_schedule_id
                
                sample_schedules.append({
                    "id": schedule.id,
                    "title": schedule.title,
                    "start_date": schedule.start_date.isoformat(),
                    "end_date": schedule.start_date.isoformat(),
                    "start_time": schedule.time + ":00" if schedule.time else "12:00:00",
                    "end_time": (schedule.time + ":00" if schedule.time else "12:00:00"),
                    "is_recurring": is_recurring_group,
                    "recurrence_type": recurrence_type,
                    "master_schedule_id": master_schedule_id,
                    "description": schedule.description or "",
                    "location": schedule.location or "",
                    "status": "confirmed",
                    "restaurant": schedule.restaurant or "",
                    "created_by": schedule.created_by or schedule.employee_id,
                    "created_at": schedule.created_at.isoformat() if schedule.created_at else None,
                    "attendees": attendees_data
                })
            
            print(f"🔍 [개발용] 일정 조회 결과: {len(sample_schedules)}개 일정")
            for schedule in sample_schedules:
                print(f"  - {schedule['title']} ({schedule['start_date']})")
            
            return jsonify({
                'success': True,
                'data': sample_schedules,
                'period': {
                    'start_date': start_date_str,
                    'end_date': end_date_str
                },
                'total_dates': len(sample_schedules)
            })
            
        except Exception as e:
            return jsonify({
                'error': '개발용 일정 조회 중 오류가 발생했습니다',
                'message': str(e)
            }), 500

    @dev_bp.route("/dev/chats/<employee_id>", methods=["GET"])
    def get_dev_chats(employee_id):
        """개발용 채팅 목록 조회 API"""
        try:
            # 실제 데이터베이스에서 채팅방 조회
            chat_rooms = ChatRoom.query.join(ChatParticipant).filter(
                ChatParticipant.employee_id == employee_id
            ).all()
            
            chat_list = []
            for room in chat_rooms:
                # 마지막 메시지 조회
                last_message = ChatMessage.query.filter_by(chat_room_id=room.id).order_by(desc(ChatMessage.created_at)).first()
                
                # 참여자 수 조회
                participant_count = ChatParticipant.query.filter_by(chat_room_id=room.id).count()
                
                chat_list.append({
                    "id": room.id,
                    "name": room.name,
                    "type": room.chat_type,
                    "last_message": {
                        "content": last_message.content if last_message else "",
                        "sender": last_message.sender_id if last_message else None,
                        "timestamp": last_message.created_at.isoformat() if last_message else None
                    },
                    "participant_count": participant_count,
                    "created_at": room.created_at.isoformat()
                })
            
            return jsonify({
                "success": True,
                "chats": chat_list
            })
            
        except Exception as e:
            return jsonify({
                "error": "개발용 채팅 목록 조회 중 오류가 발생했습니다",
                "message": str(e)
            }), 500

    @dev_bp.route("/dev/chat/room/members/<chat_type>/<int:chat_id>", methods=["GET"])
    def get_dev_chat_room_members(chat_type, chat_id):
        """개발용 채팅방 멤버 조회 API"""
        try:
            # 채팅방 멤버 조회
            participants = ChatParticipant.query.filter_by(
                chat_room_id=chat_id
            ).all()
            
            members = []
            for participant in participants:
                # 사용자 정보 조회
                user = User.query.get(participant.employee_id)
                if user:
                    members.append({
                        "employee_id": user.employee_id,
                        "nickname": user.nickname,
                        "joined_at": participant.joined_at.isoformat() if participant.joined_at else None
                    })
            
            return jsonify({
                "success": True,
                "members": members,
                "total_count": len(members)
            })
            
        except Exception as e:
            return jsonify({
                "error": "개발용 채팅방 멤버 조회 중 오류가 발생했습니다",
                "message": str(e)
            }), 500

    @dev_bp.route("/dev/chat/messages/<chat_type>/<int:chat_id>", methods=["GET"])
    def get_dev_chat_messages(chat_type, chat_id):
        """개발용 채팅 메시지 조회 API"""
        try:
            page = request.args.get('page', 1, type=int)
            per_page = min(request.args.get('per_page', 50, type=int), 100)
            
            # 메시지 조회 (페이지네이션)
            messages_query = ChatMessage.query.filter_by(chat_room_id=chat_id).order_by(desc(ChatMessage.created_at))
            messages = messages_query.paginate(
                page=page, per_page=per_page, error_out=False
            )
            
            message_list = []
            for message in messages.items:
                # 발신자 정보 조회
                sender = User.query.get(message.sender_id)
                
                message_list.append({
                    "id": message.id,
                    "content": message.content,
                    "sender": {
                        "employee_id": sender.employee_id if sender else None,
                        "nickname": sender.nickname if sender else "알 수 없음"
                    },
                    "created_at": message.created_at.isoformat(),
                    "message_type": message.message_type or "text"
                })
            
            return jsonify({
                "success": True,
                "messages": message_list,
                "pagination": {
                    "page": page,
                    "per_page": per_page,
                    "total": messages.total,
                    "pages": messages.pages
                }
            })
            
        except Exception as e:
            return jsonify({
                "error": "개발용 채팅 메시지 조회 중 오류가 발생했습니다",
                "message": str(e)
            }), 500

    @dev_bp.route("/dev/chat/messages", methods=["POST"])
    def send_dev_chat_message():
        """개발용 채팅 메시지 전송 API"""
        try:
            data = request.get_json()
            
            required_fields = ['chat_room_id', 'sender_id', 'content']
            for field in required_fields:
                if not data.get(field):
                    return jsonify({"error": f"{field}는 필수입니다."}), 400
            
            # 메시지 생성
            message = ChatMessage(
                chat_room_id=data['chat_room_id'],
                sender_id=data['sender_id'],
                content=data['content'],
                message_type=data.get('message_type', 'text')
            )
            
            db.session.add(message)
            db.session.commit()
            
            return jsonify({
                "success": True,
                "message_id": message.id,
                "message": "메시지가 전송되었습니다."
            })
            
        except Exception as e:
            db.session.rollback()
            return jsonify({
                "error": "개발용 채팅 메시지 전송 중 오류가 발생했습니다",
                "message": str(e)
            }), 500

    @dev_bp.route("/dev/chat/create", methods=["POST"])
    def create_dev_chat_room():
        """개발용 채팅방 생성 API"""
        try:
            data = request.get_json()
            
            required_fields = ['name', 'chat_type', 'creator_id']
            for field in required_fields:
                if not data.get(field):
                    return jsonify({"error": f"{field}는 필수입니다."}), 400
            
            # 채팅방 생성
            chat_room = ChatRoom(
                name=data['name'],
                chat_type=data['chat_type'],
                created_by=data['creator_id']
            )
            
            db.session.add(chat_room)
            db.session.flush()
            
            # 생성자를 멤버로 추가
            participant = ChatParticipant(
                chat_room_id=chat_room.id,
                employee_id=data['creator_id']
            )
            db.session.add(participant)
            
            # 추가 멤버가 있다면 추가
            if data.get('member_ids'):
                for member_id in data['member_ids']:
                    if member_id != data['creator_id']:
                        participant = ChatParticipant(
                            chat_room_id=chat_room.id,
                            employee_id=member_id
                        )
                        db.session.add(participant)
            
            db.session.commit()
            
            return jsonify({
                "success": True,
                "chat_room_id": chat_room.id,
                "message": "채팅방이 생성되었습니다."
            })
            
        except Exception as e:
            db.session.rollback()
            return jsonify({
                "error": "개발용 채팅방 생성 중 오류가 발생했습니다",
                "message": str(e)
            }), 500

    @dev_bp.route("/dev/schedules/date", methods=["GET"])
    def get_dev_schedules_by_date():
        """개발용: 특정 날짜의 일정 조회"""
        try:
            date_str = request.args.get('date')
            employee_id = request.args.get('employee_id')
            
            if not date_str or not employee_id:
                return jsonify({
                    'error': '필수 파라미터가 누락되었습니다',
                    'required': ['date', 'employee_id']
                }), 400
            
            from models.schedule_models import PersonalSchedule
            from datetime import datetime
            
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            
            schedules = PersonalSchedule.query.filter(
                PersonalSchedule.employee_id == employee_id,
                PersonalSchedule.start_date == target_date
            ).all()
            
            schedule_list = []
            for schedule in schedules:
                schedule_list.append({
                    "id": schedule.id,
                    "title": schedule.title,
                    "start_date": schedule.start_date.isoformat(),
                    "time": schedule.time,
                    "description": schedule.description or "",
                    "location": schedule.location or "",
                    "restaurant": schedule.restaurant or ""
                })
            
            return jsonify({
                'success': True,
                'date': date_str,
                'schedules': schedule_list,
                'count': len(schedule_list)
            })
            
        except Exception as e:
            return jsonify({
                'error': '개발용 일정 조회 중 오류가 발생했습니다',
                'message': str(e)
            }), 500

    @dev_bp.route("/dev/schedules", methods=["POST"])
    def create_dev_schedule():
        """개발용: 일정 생성 API"""
        try:
            data = request.get_json()
            
            required_fields = ['employee_id', 'title', 'start_date']
            for field in required_fields:
                if not data.get(field):
                    return jsonify({"error": f"{field}는 필수입니다."}), 400
            
            from models.schedule_models import PersonalSchedule
            from datetime import datetime
            
            # 일정 생성
            schedule = PersonalSchedule(
                employee_id=data['employee_id'],
                title=data['title'],
                start_date=datetime.strptime(data['start_date'], '%Y-%m-%d').date(),
                time=data.get('time'),
                description=data.get('description'),
                location=data.get('location'),
                restaurant=data.get('restaurant'),
                is_recurring=data.get('is_recurring', False),
                recurrence_type=data.get('recurrence_type'),
                recurrence_interval=data.get('recurrence_interval'),
                recurrence_end_date=datetime.strptime(data['recurrence_end_date'], '%Y-%m-%d').date() if data.get('recurrence_end_date') else None,
                created_by=data['employee_id']
            )
            
            db.session.add(schedule)
            db.session.commit()
            
            return jsonify({
                "success": True,
                "schedule_id": schedule.id,
                "message": "일정이 생성되었습니다."
            })
            
        except Exception as e:
            db.session.rollback()
            return jsonify({
                "error": "개발용 일정 생성 중 오류가 발생했습니다",
                "message": str(e)
            }), 500

    @dev_bp.route("/dev/schedules/<int:schedule_id>", methods=["PUT"])
    def update_dev_schedule(schedule_id):
        """개발용: 일정 수정 API"""
        try:
            data = request.get_json()
            
            from models.schedule_models import PersonalSchedule
            from datetime import datetime
            
            schedule = PersonalSchedule.query.get(schedule_id)
            if not schedule:
                return jsonify({"error": "일정을 찾을 수 없습니다."}), 404
            
            # 일정 수정
            if 'title' in data:
                schedule.title = data['title']
            if 'start_date' in data:
                schedule.start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
            if 'time' in data:
                schedule.time = data['time']
            if 'description' in data:
                schedule.description = data['description']
            if 'location' in data:
                schedule.location = data['location']
            if 'restaurant' in data:
                schedule.restaurant = data['restaurant']
            
            db.session.commit()
            
            return jsonify({
                "success": True,
                "message": "일정이 수정되었습니다."
            })
            
        except Exception as e:
            db.session.rollback()
            return jsonify({
                "error": "개발용 일정 수정 중 오류가 발생했습니다",
                "message": str(e)
            }), 500

    @dev_bp.route("/dev/schedules/<int:schedule_id>", methods=["DELETE"])
    def delete_dev_schedule(schedule_id):
        """개발용: 일정 삭제 API"""
        try:
            from models.schedule_models import PersonalSchedule
            
            schedule = PersonalSchedule.query.get(schedule_id)
            if not schedule:
                return jsonify({"error": "일정을 찾을 수 없습니다."}), 404
            
            db.session.delete(schedule)
            db.session.commit()
            
            return jsonify({
                "success": True,
                "message": "일정이 삭제되었습니다."
            })
            
        except Exception as e:
            db.session.rollback()
            return jsonify({
                "error": "개발용 일정 삭제 중 오류가 발생했습니다",
                "message": str(e)
            }), 500

    @dev_bp.route("/dev/random-lunch/<employee_id>", methods=["GET"])
    def get_dev_random_lunch(employee_id):
        """개발용: 랜덤 런치 추천 API"""
        try:
            from utils.mock_data import get_all_mock_users
            mock_users = get_all_mock_users()
            
            # 가상 유저 데이터에서 추천 생성
            user_data = mock_users.get(employee_id)
            if not user_data:
                return jsonify({"error": "사용자를 찾을 수 없습니다."}), 404
            
            # 간단한 추천 로직
            recommendations = []
            for user_id, user in mock_users.items():
                if user_id != employee_id:
                    # 호환성 점수 계산 (간단한 버전)
                    compatibility = random.randint(60, 95)
                    
                    recommendations.append({
                        "employee_id": user["employee_id"],
                        "nickname": user["nickname"],
                        "compatibility_score": compatibility,
                        "reason": f"{user['food_preferences']} 선호도가 비슷합니다"
                    })
            
            # 점수순으로 정렬
            recommendations.sort(key=lambda x: x['compatibility_score'], reverse=True)
            
            return jsonify({
                "success": True,
                "recommendations": recommendations[:5],  # 상위 5명만
                "user_preferences": {
                    "food_preferences": user_data["food_preferences"],
                    "lunch_style": user_data["lunchStyle"]
                }
            })
            
        except Exception as e:
            return jsonify({
                "error": "개발용 랜덤 런치 추천 중 오류가 발생했습니다",
                "message": str(e)
            }), 500

    # 헬퍼 함수들
    def get_nickname_by_id(employee_id):
        """직원 ID로 닉네임 조회"""
        try:
            from utils.mock_data import get_all_mock_users
            mock_users = get_all_mock_users()
            user_data = mock_users.get(employee_id)
            return user_data["nickname"] if user_data else "알 수 없음"
        except:
            return "알 수 없음"
