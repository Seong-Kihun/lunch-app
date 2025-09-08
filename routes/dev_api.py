"""
개발용 API 엔드포인트들
인증 없이 테스트할 수 있는 API들을 제공합니다.
"""

from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
import random

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
        # 임시 유저 데이터 생성 (20명) - 온보딩 정보에 맞춤
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
            },
            "3": {
                "employee_id": "3",
                "nickname": "박민수",
                "foodPreferences": ["한식", "분식"],
                "lunchStyle": ["가성비 좋은 곳", "빠른 식사"],
                "allergies": ["없음"],
                "preferredTime": "12:15",
            },
            "4": {
                "employee_id": "4",
                "nickname": "최지은",
                "foodPreferences": ["양식", "한식"],
                "lunchStyle": ["다양한 음식", "새로운 메뉴 도전"],
                "allergies": ["없음"],
                "preferredTime": "12:00",
            },
            "5": {
                "employee_id": "5",
                "nickname": "정현우",
                "foodPreferences": ["한식", "중식"],
                "lunchStyle": ["전통 음식", "친구들과 함께"],
                "allergies": ["없음"],
                "preferredTime": "11:30",
            },
            "6": {
                "employee_id": "6",
                "nickname": "한소영",
                "foodPreferences": ["일식", "양식"],
                "lunchStyle": ["건강한 식사", "새로운 메뉴 도전"],
                "allergies": ["없음"],
                "preferredTime": "12:30",
            },
            "7": {
                "employee_id": "7",
                "nickname": "윤준호",
                "foodPreferences": ["한식", "중식"],
                "lunchStyle": ["가성비 좋은 곳", "빠른 식사"],
                "allergies": ["없음"],
                "preferredTime": "11:45",
            },
            "8": {
                "employee_id": "8",
                "nickname": "송미라",
                "foodPreferences": ["양식", "일식"],
                "lunchStyle": ["분위기 좋은 곳", "다양한 음식"],
                "allergies": ["없음"],
                "preferredTime": "12:15",
            },
            "9": {
                "employee_id": "9",
                "nickname": "강동현",
                "foodPreferences": ["한식", "분식"],
                "lunchStyle": ["전통 음식", "친구들과 함께"],
                "allergies": ["없음"],
                "preferredTime": "12:00",
            },
            "10": {
                "employee_id": "10",
                "nickname": "임서연",
                "foodPreferences": ["일식", "양식"],
                "lunchStyle": ["건강한 식사", "새로운 메뉴 도전"],
                "allergies": ["없음"],
                "preferredTime": "11:30",
            },
            "11": {
                "employee_id": "11",
                "nickname": "오태호",
                "foodPreferences": ["한식", "중식"],
                "lunchStyle": ["가성비 좋은 곳", "빠른 식사"],
                "allergies": ["없음"],
                "preferredTime": "12:30",
            },
            "12": {
                "employee_id": "12",
                "nickname": "신유진",
                "foodPreferences": ["양식", "일식"],
                "lunchStyle": ["분위기 좋은 곳", "다양한 음식"],
                "allergies": ["없음"],
                "preferredTime": "12:00",
            },
            "13": {
                "employee_id": "13",
                "nickname": "조성민",
                "foodPreferences": ["한식", "분식"],
                "lunchStyle": ["전통 음식", "친구들과 함께"],
                "allergies": ["없음"],
                "preferredTime": "11:45",
            },
            "14": {
                "employee_id": "14",
                "nickname": "백하은",
                "foodPreferences": ["일식", "양식"],
                "lunchStyle": ["건강한 식사", "새로운 메뉴 도전"],
                "allergies": ["없음"],
                "preferredTime": "12:15",
            },
            "15": {
                "employee_id": "15",
                "nickname": "남준석",
                "foodPreferences": ["한식", "중식"],
                "lunchStyle": ["가성비 좋은 곳", "빠른 식사"],
                "allergies": ["없음"],
                "preferredTime": "12:00",
            },
            "16": {
                "employee_id": "16",
                "nickname": "류지현",
                "foodPreferences": ["양식", "일식"],
                "lunchStyle": ["분위기 좋은 곳", "다양한 음식"],
                "allergies": ["없음"],
                "preferredTime": "11:30",
            },
            "17": {
                "employee_id": "17",
                "nickname": "차준호",
                "foodPreferences": ["한식", "분식"],
                "lunchStyle": ["전통 음식", "친구들과 함께"],
                "allergies": ["없음"],
                "preferredTime": "12:30",
            },
            "18": {
                "employee_id": "18",
                "nickname": "구미영",
                "foodPreferences": ["일식", "양식"],
                "lunchStyle": ["건강한 식사", "새로운 메뉴 도전"],
                "allergies": ["없음"],
                "preferredTime": "12:00",
            },
            "19": {
                "employee_id": "19",
                "nickname": "홍성훈",
                "foodPreferences": ["한식", "중식"],
                "lunchStyle": ["가성비 좋은 곳", "빠른 식사"],
                "allergies": ["없음"],
                "preferredTime": "11:45",
            },
            "20": {
                "employee_id": "20",
                "nickname": "전소연",
                "foodPreferences": ["양식", "일식"],
                "lunchStyle": ["분위기 좋은 곳", "다양한 음식"],
                "allergies": ["없음"],
                "preferredTime": "12:15",
            },
        }

        # 요청된 employee_id에 해당하는 유저 반환
        if employee_id in temp_users:
            user_data = temp_users[employee_id]
            return jsonify(user_data)
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

@dev_bp.route('/schedules', methods=['GET'])
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
        
        # 개발용 샘플 일정 데이터
        sample_schedules = [
            {
                "id": 1,
                "title": "점심 약속",
                "start_date": start_date_str,
                "end_date": start_date_str,
                "start_time": "12:00:00",
                "end_time": "13:00:00",
                "is_recurring": False,
                "recurrence_type": None,
                "description": "팀 점심 모임",
                "location": "사무실 근처",
                "status": "confirmed"
            },
            {
                "id": 2,
                "title": "회의",
                "start_date": end_date_str,
                "end_date": end_date_str,
                "start_time": "14:00:00",
                "end_time": "15:00:00",
                "is_recurring": False,
                "recurrence_type": None,
                "description": "주간 회의",
                "location": "회의실",
                "status": "confirmed"
            }
        ]
        
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
    """개발용 식당 목록 API - 인증 없이 테스트 가능"""
    try:
        # 개발용 샘플 식당 데이터
        sample_restaurants = [
            {
                "id": 1,
                "name": "맛있는 김치찌개",
                "address": "서울시 강남구 테헤란로 123",
                "latitude": 37.5665,
                "longitude": 126.9780,
                "phone": "02-1234-5678",
                "category": "한식",
                "rating": 4.5,
                "is_active": True
            },
            {
                "id": 2,
                "name": "피자헛",
                "address": "서울시 강남구 테헤란로 456",
                "latitude": 37.5666,
                "longitude": 126.9781,
                "phone": "02-2345-6789",
                "category": "양식",
                "rating": 4.2,
                "is_active": True
            },
            {
                "id": 3,
                "name": "맥도날드",
                "address": "서울시 강남구 테헤란로 789",
                "latitude": 37.5667,
                "longitude": 126.9782,
                "phone": "02-3456-7890",
                "category": "패스트푸드",
                "rating": 3.8,
                "is_active": True
            }
        ]
        
        return jsonify({
            "success": True,
            "restaurants": sample_restaurants,
            "total": len(sample_restaurants)
        })
        
    except Exception as e:
        return jsonify({
            "error": "개발용 식당 목록 조회 중 오류가 발생했습니다.",
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
