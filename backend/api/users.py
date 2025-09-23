"""
사용자 API Blueprint
사용자 관련 모든 API 엔드포인트를 포함합니다.
"""

from flask import Blueprint, request, jsonify
from utils.error_monitor import record_error
from utils.logger import logger, log_api_call
from auth.middleware import check_authentication

# 사용자 Blueprint 생성
api_users_bp = Blueprint('api_users', __name__, url_prefix='/users')

# 인증 미들웨어 적용
@api_users_bp.before_request
def _users_guard():
    return check_authentication()

@api_users_bp.route('/profile', methods=['GET'])
@log_api_call
def get_user_profile():
    """사용자 프로필 조회"""
    try:
        # 인증 확인
        if not hasattr(request, 'current_user') or not request.current_user:
            return jsonify({'error': '인증이 필요합니다.'}), 401
        
        # 인증된 사용자 ID 사용
        employee_id = getattr(request.current_user, 'employee_id', None)
        if not employee_id:
            return jsonify({'error': '사용자 정보를 찾을 수 없습니다.'}), 400
        
        # 데이터베이스에서 사용자 프로필 조회
        from auth.models import User
        from app import db
        
        user = User.query.filter_by(employee_id=employee_id).first()
        if not user:
            return jsonify({'error': '사용자를 찾을 수 없습니다.'}), 404
        
        logger.info("사용자 프로필 조회 성공", user_id=employee_id)
        return jsonify({
            'success': True,
            'message': '사용자 프로필 조회 성공',
            'employee_id': employee_id,
            'profile': {
                'employee_id': user.employee_id,
                'nickname': user.nickname,
                'email': user.email,
                'main_dish_genre': user.main_dish_genre,
                'lunch_preference': user.lunch_preference,
                'allergies': user.allergies,
                'preferred_time': user.preferred_time,
                'frequent_areas': user.frequent_areas
            }
        })
        
    except Exception as e:
        record_error(e, severity='medium', endpoint='get_user_profile', context={'user_id': getattr(request.current_user, 'employee_id', None) if hasattr(request, 'current_user') else None})
        return jsonify({'error': '사용자 프로필 조회 중 오류가 발생했습니다.', 'details': str(e)}), 500

@api_users_bp.route('/profile', methods=['PUT'])
def update_user_profile():
    """사용자 프로필 수정"""
    try:
        # 인증 확인
        if not hasattr(request, 'current_user') or not request.current_user:
            return jsonify({'error': '인증이 필요합니다.'}), 401
        
        # 인증된 사용자 ID 사용
        employee_id = getattr(request.current_user, 'employee_id', None)
        if not employee_id:
            return jsonify({'error': '사용자 정보를 찾을 수 없습니다.'}), 400
        
        data = request.get_json()
        if not data:
            return jsonify({'error': '요청 데이터가 없습니다.'}), 400
        
        # 데이터베이스에서 사용자 조회
        from auth.models import User
        from app import db
        
        user = User.query.filter_by(employee_id=employee_id).first()
        if not user:
            return jsonify({'error': '사용자를 찾을 수 없습니다.'}), 404
        
        # 프로필 수정
        if 'nickname' in data:
            user.nickname = data['nickname']
        if 'main_dish_genre' in data:
            user.main_dish_genre = data['main_dish_genre']
        if 'lunch_preference' in data:
            user.lunch_preference = data['lunch_preference']
        if 'allergies' in data:
            user.allergies = data['allergies']
        if 'preferred_time' in data:
            user.preferred_time = data['preferred_time']
        if 'frequent_areas' in data:
            user.frequent_areas = data['frequent_areas']
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': '사용자 프로필이 수정되었습니다.',
            'employee_id': employee_id
        })
        
    except Exception as e:
        print(f"Error in update_user_profile: {e}")
        return jsonify({'error': '사용자 프로필 수정 중 오류가 발생했습니다.', 'details': str(e)}), 500

@api_users_bp.route('/activity-stats', methods=['GET'])
def get_user_activity_stats():
    """사용자 활동 통계 조회"""
    try:
        # 인증 확인
        if not hasattr(request, 'current_user') or not request.current_user:
            return jsonify({'error': '인증이 필요합니다.'}), 401
        
        employee_id = getattr(request.current_user, 'employee_id', None)
        if not employee_id:
            return jsonify({'error': '사용자 정보를 찾을 수 없습니다.'}), 400
        
        # 기간 파라미터 (기본값: month)
        period = request.args.get('period', 'month')
        
        # 데이터베이스에서 통계 데이터 조회
        from models.app_models import Party, PartyMember
        from models.restaurant_models import RestaurantVisitV2, RestaurantReviewV2
        from models.schedule_models import PersonalSchedule
        from extensions import db
        from datetime import datetime, timedelta
        from sqlalchemy import func, and_
        
        # 기간 설정
        end_date = datetime.now()
        if period == 'week':
            start_date = end_date - timedelta(days=7)
        elif period == 'month':
            start_date = end_date - timedelta(days=30)
        elif period == 'year':
            start_date = end_date - timedelta(days=365)
        else:
            start_date = end_date - timedelta(days=30)
        
        # 1. 총 활동 수
        total_activities = 0
        
        # 2. 리뷰 작성 수
        reviews_written = RestaurantReviewV2.query.filter(
            and_(
                RestaurantReviewV2.user_id == employee_id,
                RestaurantReviewV2.created_at >= start_date
            )
        ).count()
        total_activities += reviews_written
        
        # 3. 파티 참여 수 (호스트 + 멤버)
        parties_hosted = Party.query.filter(
            and_(
                Party.host_employee_id == employee_id,
                Party.created_at >= start_date
            )
        ).count()
        
        parties_joined = PartyMember.query.join(Party).filter(
            and_(
                PartyMember.employee_id == employee_id,
                Party.created_at >= start_date
            )
        ).count()
        
        parties_joined_total = parties_hosted + parties_joined
        total_activities += parties_joined_total
        
        # 4. 랜덤런치 수 (랜덤런치 관련 파티)
        random_lunches = Party.query.filter(
            and_(
                Party.host_employee_id == employee_id,
                Party.is_from_match == True,
                Party.created_at >= start_date
            )
        ).count()
        
        # 5. 개인 약속 수
        personal_schedules = PersonalSchedule.query.filter(
            and_(
                PersonalSchedule.employee_id == employee_id,
                PersonalSchedule.created_at >= start_date
            )
        ).count()
        total_activities += personal_schedules
        
        # 6. 약속 타입별 분석
        appointment_type_breakdown = {
            '랜덤런치': random_lunches,
            '파티 참여': parties_joined,
            '개인 약속': personal_schedules,
            '단골파티': parties_hosted,
            '기타': 0
        }
        
        # 7. 카테고리별 분석 (식당 방문 기록 기반)
        category_breakdown = {}
        visits = RestaurantVisitV2.query.filter(
            and_(
                RestaurantVisitV2.user_id == employee_id,
                RestaurantVisitV2.visit_date >= start_date.date()
            )
        ).all()
        
        for visit in visits:
            # 식당 정보에서 카테고리 가져오기
            from models.restaurant_models import RestaurantV2
            restaurant = RestaurantV2.query.get(visit.restaurant_id)
            if restaurant and restaurant.category:
                category = restaurant.category
                category_breakdown[category] = category_breakdown.get(category, 0) + 1
        
        # 8. 선호 카테고리
        favorite_category = max(category_breakdown.items(), key=lambda x: x[1])[0] if category_breakdown else '한식'
        
        stats = {
            'total_activities': total_activities,
            'reviews_written': reviews_written,
            'parties_joined': parties_joined_total,
            'random_lunches': random_lunches,
            'favorite_category': favorite_category,
            'appointment_type_breakdown': appointment_type_breakdown,
            'category_breakdown': category_breakdown,
            'period': period,
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat()
        }
        
        return jsonify({
            'success': True,
            'message': '활동 통계 조회 성공',
            'stats': stats
        })
        
    except Exception as e:
        print(f"Error in get_user_activity_stats: {e}")
        return jsonify({'error': '활동 통계 조회 중 오류가 발생했습니다.', 'details': str(e)}), 500

@api_users_bp.route('/dashboard', methods=['GET'])
def get_user_dashboard():
    """사용자 대시보드 데이터 조회"""
    try:
        # 인증 확인
        if not hasattr(request, 'current_user') or not request.current_user:
            return jsonify({'error': '인증이 필요합니다.'}), 401
        
        employee_id = getattr(request.current_user, 'employee_id', None)
        if not employee_id:
            return jsonify({'error': '사용자 정보를 찾을 수 없습니다.'}), 400
        
        # 데이터베이스에서 대시보드 데이터 조회
        from models.app_models import Party, PartyMember
        from models.restaurant_models import RestaurantVisitV2, RestaurantReviewV2
        from models.schedule_models import PersonalSchedule
        from extensions import db
        from datetime import datetime, timedelta
        from sqlalchemy import func, and_
        
        # 1. 총 런치 수 (식당 방문 기록)
        total_lunches = RestaurantVisitV2.query.filter(
            RestaurantVisitV2.user_id == employee_id
        ).count()
        
        # 2. 총 파티 수
        parties_hosted = Party.query.filter(
            Party.host_employee_id == employee_id
        ).count()
        
        parties_joined = PartyMember.query.filter(
            PartyMember.employee_id == employee_id
        ).count()
        
        total_parties = parties_hosted + parties_joined
        
        # 3. 총 리뷰 수
        total_reviews = RestaurantReviewV2.query.filter(
            RestaurantReviewV2.user_id == employee_id
        ).count()
        
        # 4. 선호 카테고리
        visits = RestaurantVisitV2.query.filter(
            RestaurantVisitV2.user_id == employee_id
        ).all()
        
        category_count = {}
        for visit in visits:
            from models.restaurant_models import RestaurantV2
            restaurant = RestaurantV2.query.get(visit.restaurant_id)
            if restaurant and restaurant.category:
                category = restaurant.category
                category_count[category] = category_count.get(category, 0) + 1
        
        favorite_category = max(category_count.items(), key=lambda x: x[1])[0] if category_count else '한식'
        
        # 5. 주간 목표 및 진행률
        weekly_goal = 3  # 기본 주간 목표
        week_start = datetime.now() - timedelta(days=datetime.now().weekday())
        week_visits = RestaurantVisitV2.query.filter(
            and_(
                RestaurantVisitV2.user_id == employee_id,
                RestaurantVisitV2.visit_date >= week_start.date()
            )
        ).count()
        
        weekly_progress = min(week_visits, weekly_goal)
        
        # 6. 연속 활동 일수 (스트릭)
        streak = 0
        current_date = datetime.now().date()
        
        for i in range(30):  # 최대 30일 체크
            check_date = current_date - timedelta(days=i)
            has_activity = (
                RestaurantVisitV2.query.filter(
                    and_(
                        RestaurantVisitV2.user_id == employee_id,
                        RestaurantVisitV2.visit_date == check_date
                    )
                ).first() is not None or
                Party.query.filter(
                    and_(
                        Party.host_employee_id == employee_id,
                        func.date(Party.party_date) == check_date
                    )
                ).first() is not None
            )
            
            if has_activity:
                streak += 1
            else:
                break
        
        # 7. 랭킹 (전체 사용자 중 포인트 기준)
        from auth.models import User
        user = User.query.filter_by(employee_id=employee_id).first()
        user_points = user.total_points if user else 0
        
        # 포인트가 더 높은 사용자 수
        higher_points_users = User.query.filter(User.total_points > user_points).count()
        total_users = User.query.count()
        rank = higher_points_users + 1 if total_users > 0 else 1
        
        dashboard_data = {
            'total_lunches': total_lunches,
            'total_parties': total_parties,
            'total_reviews': total_reviews,
            'favorite_category': favorite_category,
            'weekly_goal': weekly_goal,
            'weekly_progress': weekly_progress,
            'streak': streak,
            'rank': rank,
            'total_users': total_users,
            'user_points': user_points
        }
        
        return jsonify({
            'success': True,
            'message': '대시보드 데이터 조회 성공',
            'data': dashboard_data
        })
        
    except Exception as e:
        print(f"Error in get_user_dashboard: {e}")
        return jsonify({'error': '대시보드 데이터 조회 중 오류가 발생했습니다.', 'details': str(e)}), 500

@api_users_bp.route('/appointments', methods=['GET'])
def get_user_appointments():
    """사용자 약속 목록 조회"""
    try:
        # 인증 확인
        if not hasattr(request, 'current_user') or not request.current_user:
            return jsonify({'error': '인증이 필요합니다.'}), 401
        
        employee_id = getattr(request.current_user, 'employee_id', None)
        if not employee_id:
            return jsonify({'error': '사용자 정보를 찾을 수 없습니다.'}), 400
        
        # 쿼리 파라미터
        status = request.args.get('status', 'all')
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        
        from models.app_models import Party, PartyMember
        from models.schedule_models import PersonalSchedule
        from extensions import db
        from datetime import datetime
        
        appointments = []
        
        # 1. 파티 관련 약속
        if status == 'all' or status == 'party':
            # 호스트한 파티
            hosted_parties = Party.query.filter(
                Party.host_employee_id == employee_id
            ).all()
            
            for party in hosted_parties:
                appointments.append({
                    'id': f"party_{party.id}",
                    'type': 'party',
                    'title': party.title,
                    'restaurant_name': party.restaurant_name,
                    'restaurant_address': party.restaurant_address,
                    'date': party.party_date.isoformat() if party.party_date else None,
                    'time': party.party_time.isoformat() if party.party_time else None,
                    'meeting_location': party.meeting_location,
                    'status': 'completed' if party.party_date and party.party_date < datetime.now().date() else 'upcoming',
                    'is_host': True,
                    'member_count': party.current_members,
                    'max_members': party.max_members
                })
            
            # 참여한 파티
            joined_parties = PartyMember.query.join(Party).filter(
                PartyMember.employee_id == employee_id
            ).all()
            
            for member in joined_parties:
                party = member.party
                appointments.append({
                    'id': f"party_{party.id}",
                    'type': 'party',
                    'title': party.title,
                    'restaurant_name': party.restaurant_name,
                    'restaurant_address': party.restaurant_address,
                    'date': party.party_date.isoformat() if party.party_date else None,
                    'time': party.party_time.isoformat() if party.party_time else None,
                    'meeting_location': party.meeting_location,
                    'status': 'completed' if party.party_date and party.party_date < datetime.now().date() else 'upcoming',
                    'is_host': False,
                    'member_count': party.current_members,
                    'max_members': party.max_members
                })
        
        # 2. 개인 일정
        if status == 'all' or status == 'personal':
            personal_schedules = PersonalSchedule.query.filter(
                PersonalSchedule.employee_id == employee_id
            ).all()
            
            for schedule in personal_schedules:
                appointments.append({
                    'id': f"schedule_{schedule.id}",
                    'type': 'personal',
                    'title': schedule.title,
                    'description': schedule.description,
                    'date': schedule.start_date.isoformat() if schedule.start_date else None,
                    'time': schedule.start_time.isoformat() if schedule.start_time else None,
                    'status': 'completed' if schedule.start_date and schedule.start_date < datetime.now().date() else 'upcoming',
                    'is_recurring': schedule.is_recurring,
                    'recurrence_type': schedule.recurrence_type
                })
        
        # 상태별 필터링
        if status != 'all':
            appointments = [apt for apt in appointments if apt['status'] == status]
        
        # 날짜순 정렬 (최신순)
        appointments.sort(key=lambda x: x['date'] or '', reverse=True)
        
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
        print(f"Error in get_user_appointments: {e}")
        return jsonify({'error': '약속 목록 조회 중 오류가 발생했습니다.', 'details': str(e)}), 500

@api_users_bp.route('/points', methods=['GET'])
def get_user_points():
    """사용자 포인트 정보 조회"""
    try:
        # 인증 확인
        if not hasattr(request, 'current_user') or not request.current_user:
            return jsonify({'error': '인증이 필요합니다.'}), 401
        
        employee_id = getattr(request.current_user, 'employee_id', None)
        if not employee_id:
            return jsonify({'error': '사용자 정보를 찾을 수 없습니다.'}), 400
        
        from auth.models import User
        
        user = User.query.filter_by(employee_id=employee_id).first()
        if not user:
            return jsonify({'error': '사용자를 찾을 수 없습니다.'}), 404
        
        # 포인트 시스템에서 레벨 계산
        from utils.points_system import PointsSystem
        
        current_level = PointsSystem.calculate_level(user.total_points)
        level_title = PointsSystem.get_level_title(current_level)
        
        # 다음 레벨까지 필요한 포인트
        next_level_points = 0
        if current_level < 7:  # 최대 레벨 7
            level_thresholds = [0, 5000, 15000, 30000, 50000, 80000, 120000, 200000]
            next_level_points = level_thresholds[current_level + 1] - user.total_points
        
        # 진행률 계산
        progress_percentage = 0
        if current_level < 7:
            level_thresholds = [0, 5000, 15000, 30000, 50000, 80000, 120000, 200000]
            current_level_start = level_thresholds[current_level]
            next_level_start = level_thresholds[current_level + 1]
            progress_percentage = int(((user.total_points - current_level_start) / (next_level_start - current_level_start)) * 100)
        
        return jsonify({
            'success': True,
            'message': '포인트 정보 조회 성공',
            'data': {
                'total_points': user.total_points,
                'current_level': current_level,
                'level_title': level_title,
                'next_level_points': next_level_points,
                'progress_percentage': progress_percentage
            }
        })
        
    except Exception as e:
        print(f"Error in get_user_points: {e}")
        return jsonify({'error': '포인트 정보 조회 중 오류가 발생했습니다.', 'details': str(e)}), 500

@api_users_bp.route('/badges', methods=['GET'])
def get_user_badges():
    """사용자 배지 목록 조회"""
    try:
        # 인증 확인
        if not hasattr(request, 'current_user') or not request.current_user:
            return jsonify({'error': '인증이 필요합니다.'}), 401
        
        employee_id = getattr(request.current_user, 'employee_id', None)
        if not employee_id:
            return jsonify({'error': '사용자 정보를 찾을 수 없습니다.'}), 400
        
        from utils.badge_system import BadgeSystem
        
        badges = BadgeSystem.get_user_badges(employee_id)
        
        return jsonify({
            'success': True,
            'message': '배지 목록 조회 성공',
            'data': {
                'badges': badges
            }
        })
        
    except Exception as e:
        print(f"Error in get_user_badges: {e}")
        return jsonify({'error': '배지 목록 조회 중 오류가 발생했습니다.', 'details': str(e)}), 500