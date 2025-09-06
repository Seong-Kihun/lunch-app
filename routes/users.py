from flask import Blueprint, jsonify, request
from sqlalchemy import desc, or_, and_, func
from extensions import db
from models.app_models import User, UserPreference, RestaurantVisit, Review
from datetime import datetime, timedelta
import random

# Blueprint 생성
users_bp = Blueprint('users', __name__)

def get_seoul_today():
    """한국 시간의 오늘 날짜를 datetime.date 타입으로 반환"""
    korean_time = datetime.now() + timedelta(hours=9)
    return korean_time.date()

@users_bp.route("/users/<employee_id>", methods=["GET"])
def get_user(employee_id):
    """사용자 정보 조회"""
    user = User.query.filter_by(employee_id=employee_id).first()
    if not user:
        return jsonify({"error": "사용자를 찾을 수 없습니다."}), 404
    
    # 사용자 선호도 정보
    preferences = UserPreference.query.filter_by(employee_id=employee_id).all()
    preference_data = {}
    for pref in preferences:
        preference_data[pref.preference_type] = pref.preference_value
    
    user_data = {
        "employee_id": user.employee_id,
        "name": user.name,
        "nickname": user.nickname,
        "email": user.email,
        "department": user.department,
        "position": user.position,
        "lunch_preference": user.lunch_preference,
        "main_dish_genre": user.main_dish_genre,
        "matching_status": user.matching_status,
        "preferences": preference_data,
        "created_at": user.created_at.isoformat() if user.created_at else None
    }
    
    return jsonify(user_data)

@users_bp.route("/users/batch", methods=["POST"])
def get_users_batch():
    """여러 사용자 정보를 일괄 조회"""
    data = request.get_json()
    if not data or "employee_ids" not in data:
        return jsonify({"error": "사용자 ID 목록이 필요합니다."}), 400
    
    employee_ids = data["employee_ids"]
    users = User.query.filter(User.employee_id.in_(employee_ids)).all()
    
    users_data = []
    for user in users:
        user_info = {
            "employee_id": user.employee_id,
            "name": user.name,
            "nickname": user.nickname,
            "department": user.department,
            "position": user.position,
            "lunch_preference": user.lunch_preference,
            "main_dish_genre": user.main_dish_genre
        }
        users_data.append(user_info)
    
    return jsonify({"users": users_data})

@users_bp.route("/users/<employee_id>", methods=["PUT"])
def update_user(employee_id):
    """사용자 정보 수정"""
    user = User.query.filter_by(employee_id=employee_id).first()
    if not user:
        return jsonify({"error": "사용자를 찾을 수 없습니다."}), 404
    
    data = request.get_json()
    if not data:
        return jsonify({"error": "수정할 데이터가 없습니다."}), 400
    
    try:
        # 수정 가능한 필드들
        if "name" in data:
            user.name = data["name"]
        if "nickname" in data:
            user.nickname = data["nickname"]
        if "email" in data:
            user.email = data["email"]
        if "department" in data:
            user.department = data["department"]
        if "position" in data:
            user.position = data["position"]
        if "lunch_preference" in data:
            user.lunch_preference = data["lunch_preference"]
        if "main_dish_genre" in data:
            user.main_dish_genre = data["main_dish_genre"]
        
        db.session.commit()
        
        return jsonify({
            "message": "사용자 정보가 수정되었습니다!",
            "employee_id": employee_id
        })
        
    except Exception as e:
        db.session.rollback()
        print(f"사용자 정보 수정 오류: {e}")
        return jsonify({"error": str(e)}), 500

@users_bp.route("/users/<employee_id>/preferences", methods=["PUT"])
def update_user_preferences(employee_id):
    """사용자 선호도 수정"""
    user = User.query.filter_by(employee_id=employee_id).first()
    if not user:
        return jsonify({"error": "사용자를 찾을 수 없습니다."}), 404
    
    data = request.get_json()
    if not data:
        return jsonify({"error": "선호도 데이터가 없습니다."}), 400
    
    try:
        for preference_type, preference_value in data.items():
            # 기존 선호도가 있는지 확인
            existing_pref = UserPreference.query.filter_by(
                employee_id=employee_id,
                preference_type=preference_type
            ).first()
            
            if existing_pref:
                existing_pref.preference_value = preference_value
            else:
                new_pref = UserPreference(
                    employee_id=employee_id,
                    preference_type=preference_type,
                    preference_value=preference_value
                )
                db.session.add(new_pref)
        
        db.session.commit()
        
        return jsonify({
            "message": "사용자 선호도가 수정되었습니다!",
            "employee_id": employee_id
        })
        
    except Exception as e:
        db.session.rollback()
        print(f"사용자 선호도 수정 오류: {e}")
        return jsonify({"error": str(e)}), 500

@users_bp.route("/users/<employee_id>/preferences", methods=["GET"])
def get_user_preferences(employee_id):
    """사용자 선호도 조회"""
    user = User.query.filter_by(employee_id=employee_id).first()
    if not user:
        return jsonify({"error": "사용자를 찾을 수 없습니다."}), 404
    
    preferences = UserPreference.query.filter_by(employee_id=employee_id).all()
    preference_data = {}
    for pref in preferences:
        preference_data[pref.preference_type] = pref.preference_value
    
    return jsonify({
        "employee_id": employee_id,
        "preferences": preference_data
    })

@users_bp.route("/users/search", methods=["GET"])
def search_users():
    """사용자 검색"""
    query = request.args.get("q", "")
    department = request.args.get("department")
    position = request.args.get("position")
    
    if not query and not department and not position:
        return jsonify({"error": "검색 조건이 필요합니다."}), 400
    
    users_query = User.query
    
    if query:
        users_query = users_query.filter(
            or_(
                User.name.ilike(f"%{query}%"),
                User.nickname.ilike(f"%{query}%"),
                User.employee_id.ilike(f"%{query}%")
            )
        )
    
    if department:
        users_query = users_query.filter(User.department == department)
    
    if position:
        users_query = users_query.filter(User.position == position)
    
    users = users_query.limit(50).all()
    
    users_data = []
    for user in users:
        user_info = {
            "employee_id": user.employee_id,
            "name": user.name,
            "nickname": user.nickname,
            "department": user.department,
            "position": user.position
        }
        users_data.append(user_info)
    
    return jsonify({"users": users_data})

@users_bp.route("/users/nearby", methods=["GET"])
def get_nearby_users():
    """근처에 있는 사용자들 조회 (같은 건물/층)"""
    employee_id = request.args.get("employee_id")
    if not employee_id:
        return jsonify({"error": "사용자 ID가 필요합니다."}), 400
    
    user = User.query.filter_by(employee_id=employee_id).first()
    if not user:
        return jsonify({"error": "사용자를 찾을 수 없습니다."}), 404
    
    # 같은 부서나 건물에 있는 사용자들 (간단한 구현)
    nearby_users = User.query.filter(
        and_(
            User.employee_id != employee_id,
            or_(
                User.department == user.department,
                User.position == user.position
            )
        )
    ).limit(20).all()
    
    users_data = []
    for nearby_user in nearby_users:
        user_info = {
            "employee_id": nearby_user.employee_id,
            "name": nearby_user.name,
            "nickname": nearby_user.nickname,
            "department": nearby_user.department,
            "position": nearby_user.position,
            "lunch_preference": nearby_user.lunch_preference
        }
        users_data.append(user_info)
    
    return jsonify({
        "nearby_users": users_data,
        "total": len(users_data)
    })

# 개발용 API들
@users_bp.route("/dev/users/<employee_id>", methods=["GET"])
def get_dev_user(employee_id):
    """개발용 사용자 상세 정보 조회"""
    user = User.query.filter_by(employee_id=employee_id).first()
    if not user:
        return jsonify({"error": "사용자를 찾을 수 없습니다."}), 404
    
    # 방문 기록
    visits = RestaurantVisit.query.filter_by(user_id=user.id).all()
    visit_data = []
    for visit in visits:
        visit_info = {
            "restaurant_id": visit.restaurant_id,
            "visit_date": visit.visit_date,
            "rating": visit.rating,
            "comment": visit.comment
        }
        visit_data.append(visit_info)
    
    # 리뷰 기록
    reviews = Review.query.filter_by(user_id=user.id).all()
    review_data = []
    for review in reviews:
        review_info = {
            "restaurant_id": review.restaurant_id,
            "rating": review.rating,
            "comment": review.comment,
            "created_at": review.created_at.isoformat() if review.created_at else None
        }
        review_data.append(review_info)
    
    user_data = {
        "employee_id": user.employee_id,
        "name": user.name,
        "nickname": user.nickname,
        "email": user.email,
        "department": user.department,
        "position": user.position,
        "lunch_preference": user.lunch_preference,
        "main_dish_genre": user.main_dish_genre,
        "matching_status": user.matching_status,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "visits": visit_data,
        "reviews": review_data
    }
    
    return jsonify(user_data)

@users_bp.route("/dev/users", methods=["GET"])
def get_all_dev_users():
    """개발용 전체 사용자 목록 조회"""
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 50, type=int), 200)
    
    users_query = User.query
    total = users_query.count()
    users = users_query.offset((page - 1) * per_page).limit(per_page).all()
    
    users_data = []
    for user in users:
        user_info = {
            "employee_id": user.employee_id,
            "name": user.name,
            "nickname": user.nickname,
            "email": user.email,
            "department": user.department,
            "position": user.position,
            "lunch_preference": user.lunch_preference,
            "main_dish_genre": user.main_dish_genre,
            "matching_status": user.matching_status,
            "created_at": user.created_at.isoformat() if user.created_at else None
        }
        users_data.append(user_info)
    
    return jsonify({
        "users": users_data,
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "pages": (total + per_page - 1) // per_page
        }
    })

@users_bp.route("/dev/users/<employee_id>/lunch-history", methods=["GET"])
def get_user_lunch_history(employee_id):
    """사용자의 점심 기록 조회"""
    user = User.query.filter_by(employee_id=employee_id).first()
    if not user:
        return jsonify({"error": "사용자를 찾을 수 없습니다."}), 404
    
    # 방문 기록
    visits = RestaurantVisit.query.filter_by(user_id=user.id).order_by(
        desc(RestaurantVisit.visit_date)
    ).all()
    
    # 리뷰 기록
    reviews = Review.query.filter_by(user_id=user.id).order_by(
        desc(Review.created_at)
    ).all()
    
    # 통계 정보
    total_visits = len(visits)
    total_reviews = len(reviews)
    avg_rating = 0
    if reviews:
        ratings = [review.rating for review in reviews if review.rating]
        if ratings:
            avg_rating = sum(ratings) / len(ratings)
    
    history_data = {
        "employee_id": employee_id,
        "user_name": user.name,
        "statistics": {
            "total_visits": total_visits,
            "total_reviews": total_reviews,
            "average_rating": round(avg_rating, 1)
        },
        "visits": [
            {
                "restaurant_id": visit.restaurant_id,
                "visit_date": visit.visit_date,
                "rating": visit.rating,
                "comment": visit.comment
            }
            for visit in visits
        ],
        "reviews": [
            {
                "restaurant_id": review.restaurant_id,
                "rating": review.rating,
                "comment": review.comment,
                "created_at": review.created_at.isoformat() if review.created_at else None
            }
            for review in reviews
        ]
    }
    
    return jsonify(history_data)
