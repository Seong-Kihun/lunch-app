from flask import Blueprint, jsonify, request
from sqlalchemy import desc, or_, and_, func
from extensions import db
from models.app_models import Restaurant, Review, RestaurantRequest, RestaurantFavorite, RestaurantVisit
from utils.date_utils import get_seoul_today
import random

# Blueprint 생성
restaurants_bp = Blueprint('restaurants', __name__)

def geocode_address(address):
    """주소를 좌표로 변환하는 함수 (가상 구현)"""
    lat = 37.4452 + (random.random() - 0.5) * 0.01
    lon = 127.1299 + (random.random() - 0.5) * 0.01
    return lat, lon

@restaurants_bp.route("/restaurants", methods=["POST"])
def add_restaurant():
    data = request.get_json()
    lat, lon = geocode_address(data["address"])
    new_restaurant = Restaurant(
        name=data["name"],
        category=data["category"],
        address=data["address"],
        latitude=lat,
        longitude=lon,
    )
    db.session.add(new_restaurant)
    db.session.commit()
    return (
        jsonify(
            {
                "message": "새로운 맛집이 등록되었습니다!",
                "restaurant_id": new_restaurant.id,
            }
        ),
        201,
    )

@restaurants_bp.route("/restaurants/sync-excel-data", methods=["POST"])
def sync_excel_data():
    """Excel/CSV 데이터를 백엔드 데이터베이스에 동기화"""
    try:
        # 기존 데이터가 있는지 확인
        existing_count = Restaurant.query.count()
        if existing_count > 0:
            return (
                jsonify(
                    {
                        "message": f"이미 {existing_count}개의 식당 데이터가 있습니다. 동기화가 필요하지 않습니다."
                    }
                ),
                200,
            )

        # 프론트엔드에서 Excel/CSV 데이터를 전송받아 처리
        data = request.get_json()
        if not data or "restaurants" not in data:
            return jsonify({"error": "식당 데이터가 제공되지 않았습니다."}), 400

        restaurants_data = data["restaurants"]
        print(f"Excel/CSV에서 {len(restaurants_data)}개의 식당 데이터 수신")

        # 데이터베이스에 추가
        for restaurant_info in restaurants_data:
            # Excel/CSV 데이터 구조에 맞게 파싱
            name = restaurant_info.get("name", "")
            category = restaurant_info.get("category", "기타")
            address = restaurant_info.get("address", "")
            latitude = restaurant_info.get("latitude")
            longitude = restaurant_info.get("longitude")

            if name:  # 이름이 있는 경우만 추가
                restaurant = Restaurant(
                    name=name,
                    category=category,
                    address=address,
                    latitude=latitude,
                    longitude=longitude,
                )
                db.session.add(restaurant)

        db.session.commit()
        final_count = Restaurant.query.count()
        print(f"{final_count}개의 식당 데이터 동기화 완료")

        return (
            jsonify(
                {
                    "message": f"{final_count}개의 식당 데이터가 동기화되었습니다.",
                    "count": final_count,
                }
            ),
            201,
        )

    except Exception as e:
        db.session.rollback()
        print(f"Excel/CSV 데이터 동기화 오류: {e}")
        return jsonify({"error": str(e)}), 500

@restaurants_bp.route("/restaurants", methods=["GET"])
def get_restaurants():
    # 먼저 파라미터 파싱
    query = request.args.get("query", "")
    sort_by = request.args.get("sort_by", "name")
    category_filter = request.args.get("category", None)
    lat = request.args.get("lat", None)
    lon = request.args.get("lon", None)
    radius = request.args.get("radius", 10)  # 기본 10km
    page = request.args.get("page", 1, type=int)
    per_page = min(
        request.args.get("per_page", 50, type=int), 200
    )  # 최대 200개

    # 기본 쿼리 시작
    restaurants_query = Restaurant.query

    # 검색어 필터링
    if query:
        restaurants_query = restaurants_query.filter(
            or_(
                Restaurant.name.ilike(f"%{query}%"),
                Restaurant.category.ilike(f"%{query}%"),
                Restaurant.address.ilike(f"%{query}%"),
            )
        )

    # 카테고리 필터링
    if category_filter:
        restaurants_query = restaurants_query.filter(
            Restaurant.category == category_filter
        )

    # 위치 기반 필터링 (간단한 구현)
    if lat and lon:
        # 실제로는 Haversine 공식 사용해야 함
        lat, lon = float(lat), float(lon)
        restaurants_query = restaurants_query.filter(
            and_(
                Restaurant.latitude.between(lat - 0.1, lat + 0.1),
                Restaurant.longitude.between(lon - 0.1, lon + 0.1),
            )
        )

    # 정렬
    if sort_by == "rating":
        restaurants_query = restaurants_query.outerjoin(Review).group_by(Restaurant.id).order_by(
            desc(func.avg(Review.rating))
        )
    elif sort_by == "reviews":
        restaurants_query = restaurants_query.outerjoin(Review).group_by(Restaurant.id).order_by(
            desc(func.count(Review.id))
        )
    elif sort_by == "distance" and lat and lon:
        # 거리순 정렬 (간단한 구현)
        restaurants_query = restaurants_query.order_by(
            func.abs(Restaurant.latitude - lat) + func.abs(Restaurant.longitude - lon)
        )
    else:
        restaurants_query = restaurants_query.order_by(Restaurant.name)

    # 페이지네이션
    total = restaurants_query.count()
    restaurants = restaurants_query.offset((page - 1) * per_page).limit(per_page).all()

    # 결과 포맷팅
    restaurants_data = []
    for restaurant in restaurants:
        # 평균 평점 계산
        avg_rating = 0
        review_count = 0
        if restaurant.reviews:
            ratings = [review.rating for review in restaurant.reviews if review.rating]
            if ratings:
                avg_rating = sum(ratings) / len(ratings)
                review_count = len(ratings)

        restaurant_info = {
            "id": restaurant.id,
            "name": restaurant.name,
            "category": restaurant.category,
            "address": restaurant.address,
            "latitude": restaurant.latitude,
            "longitude": restaurant.longitude,
            "avg_rating": round(avg_rating, 1),
            "review_count": review_count,
        }
        restaurants_data.append(restaurant_info)

    return jsonify(
        {
            "restaurants": restaurants_data,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "pages": (total + per_page - 1) // per_page,
            },
        }
    )

@restaurants_bp.route("/restaurants/<int:restaurant_id>", methods=["GET"])
def get_restaurant_detail(restaurant_id):
    restaurant = Restaurant.query.get_or_404(restaurant_id)
    
    # 평균 평점과 리뷰 수 계산
    avg_rating = 0
    review_count = 0
    if restaurant.reviews:
        ratings = [review.rating for review in restaurant.reviews if review.rating]
        if ratings:
            avg_rating = sum(ratings) / len(ratings)
            review_count = len(ratings)
    
    return jsonify({
        "id": restaurant.id,
        "name": restaurant.name,
        "category": restaurant.category,
        "address": restaurant.address,
        "latitude": restaurant.latitude,
        "longitude": restaurant.longitude,
        "avg_rating": round(avg_rating, 1),
        "review_count": review_count,
        "created_at": restaurant.created_at.isoformat() if restaurant.created_at else None
    })

@restaurants_bp.route("/restaurants/<int:restaurant_id>/reviews", methods=["GET"])
def get_restaurant_reviews(restaurant_id):
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    
    reviews_query = Review.query.filter_by(restaurant_id=restaurant_id).order_by(desc(Review.created_at))
    total = reviews_query.count()
    reviews = reviews_query.offset((page - 1) * per_page).limit(per_page).all()
    
    reviews_data = []
    for review in reviews:
        review_info = {
            "id": review.id,
            "rating": review.rating,
            "comment": review.comment,
            "user_id": review.user_id,
            "created_at": review.created_at.isoformat() if review.created_at else None,
            "likes": review.likes
        }
        reviews_data.append(review_info)
    
    return jsonify({
        "reviews": reviews_data,
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "pages": (total + per_page - 1) // per_page
        }
    })

@restaurants_bp.route("/restaurants/<int:restaurant_id>/reviews", methods=["POST"])
def add_restaurant_review(restaurant_id):
    data = request.get_json()
    
    # 필수 필드 검증
    if not data.get("rating") or not data.get("comment"):
        return jsonify({"error": "평점과 코멘트는 필수입니다."}), 400
    
    # 평점 범위 검증
    rating = data["rating"]
    if not (1 <= rating <= 5):
        return jsonify({"error": "평점은 1-5 사이여야 합니다."}), 400
    
    try:
        new_review = Review(
            restaurant_id=restaurant_id,
            user_id=data.get("user_id"),
            rating=rating,
            comment=data["comment"],
            likes=0
        )
        
        db.session.add(new_review)
        db.session.commit()
        
        return jsonify({
            "message": "리뷰가 등록되었습니다!",
            "review_id": new_review.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"리뷰 등록 오류: {e}")
        return jsonify({"error": str(e)}), 500

@restaurants_bp.route("/restaurants/search", methods=["GET"])
def search_restaurants():
    query = request.args.get("q", "")
    if not query:
        return jsonify({"error": "검색어가 필요합니다."}), 400
    
    restaurants = Restaurant.query.filter(
        or_(
            Restaurant.name.ilike(f"%{query}%"),
            Restaurant.category.ilike(f"%{query}%"),
            Restaurant.address.ilike(f"%{query}%")
        )
    ).limit(20).all()
    
    results = []
    for restaurant in restaurants:
        results.append({
            "id": restaurant.id,
            "name": restaurant.name,
            "category": restaurant.category,
            "address": restaurant.address
        })
    
    return jsonify({"results": results})

@restaurants_bp.route("/reviews/<int:review_id>/like", methods=["POST"])
def like_review(review_id):
    review = Review.query.get_or_404(review_id)
    review.likes += 1
    db.session.commit()
    
    return jsonify({
        "message": "좋아요가 추가되었습니다!",
        "likes": review.likes
    })

@restaurants_bp.route("/reviews/tags", methods=["GET"])
def get_review_tags():
    """리뷰에서 자주 사용되는 태그들을 반환"""
    # 간단한 구현 - 실제로는 더 정교한 태그 추출 로직 필요
    common_tags = ["맛있어요", "깔끔해요", "친절해요", "가성비 좋아요", "분위기 좋아요"]
    
    return jsonify({
        "tags": common_tags
    })

# Restaurant Request 관련 API들
@restaurants_bp.route("/restaurants/requests", methods=["POST"])
def request_restaurant():
    data = request.get_json()
    
    if not data.get("name") or not data.get("address"):
        return jsonify({"error": "식당명과 주소는 필수입니다."}), 400
    
    try:
        new_request = RestaurantRequest(
            name=data["name"],
            address=data["address"],
            category=data.get("category", "기타"),
            reason=data.get("reason", ""),
            requester_id=data.get("requester_id"),
            status="pending"
        )
        
        db.session.add(new_request)
        db.session.commit()
        
        return jsonify({
            "message": "식당 추가 요청이 등록되었습니다!",
            "request_id": new_request.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"식당 요청 등록 오류: {e}")
        return jsonify({"error": str(e)}), 500

@restaurants_bp.route("/restaurants/requests/my/<employee_id>", methods=["GET"])
def get_my_restaurant_requests(employee_id):
    requests = RestaurantRequest.query.filter_by(requester_id=employee_id).order_by(desc(RestaurantRequest.created_at)).all()
    
    requests_data = []
    for req in requests:
        requests_data.append({
            "id": req.id,
            "name": req.name,
            "address": req.address,
            "category": req.category,
            "reason": req.reason,
            "status": req.status,
            "created_at": req.created_at.isoformat() if req.created_at else None
        })
    
    return jsonify({"requests": requests_data})

@restaurants_bp.route("/restaurants/requests/pending", methods=["GET"])
def get_pending_restaurant_requests():
    requests = RestaurantRequest.query.filter_by(status="pending").order_by(RestaurantRequest.created_at).all()
    
    requests_data = []
    for req in requests:
        requests_data.append({
            "id": req.id,
            "name": req.name,
            "address": req.address,
            "category": req.category,
            "reason": req.reason,
            "requester_id": req.requester_id,
            "created_at": req.created_at.isoformat() if req.created_at else None
        })
    
    return jsonify({"requests": requests_data})

@restaurants_bp.route("/restaurants/requests/<int:request_id>/approve", methods=["PUT"])
def approve_restaurant_request(request_id):
    request_obj = RestaurantRequest.query.get_or_404(request_id)
    
    if request_obj.status != "pending":
        return jsonify({"error": "이미 처리된 요청입니다."}), 400
    
    try:
        # 식당 추가
        lat, lon = geocode_address(request_obj.address)
        new_restaurant = Restaurant(
            name=request_obj.name,
            category=request_obj.category,
            address=request_obj.address,
            latitude=lat,
            longitude=lon
        )
        
        db.session.add(new_restaurant)
        
        # 요청 상태 업데이트
        request_obj.status = "approved"
        
        db.session.commit()
        
        return jsonify({
            "message": "식당 추가 요청이 승인되었습니다!",
            "restaurant_id": new_restaurant.id
        })
        
    except Exception as e:
        db.session.rollback()
        print(f"식당 요청 승인 오류: {e}")
        return jsonify({"error": str(e)}), 500

@restaurants_bp.route("/restaurants/requests/<int:request_id>/reject", methods=["PUT"])
def reject_restaurant_request(request_id):
    request_obj = RestaurantRequest.query.get_or_404(request_id)
    
    if request_obj.status != "pending":
        return jsonify({"error": "이미 처리된 요청입니다."}), 400
    
    try:
        request_obj.status = "rejected"
        db.session.commit()
        
        return jsonify({
            "message": "식당 추가 요청이 거부되었습니다."
        })
        
    except Exception as e:
        db.session.rollback()
        print(f"식당 요청 거부 오류: {e}")
        return jsonify({"error": str(e)}), 500

# Restaurant Favorites 관련 API들
@restaurants_bp.route("/restaurants/favorites", methods=["POST"])
def add_favorite_restaurant():
    data = request.get_json()
    
    if not data.get("user_id") or not data.get("restaurant_id"):
        return jsonify({"error": "사용자 ID와 식당 ID가 필요합니다."}), 400
    
    # 이미 즐겨찾기에 있는지 확인
    existing_favorite = RestaurantFavorite.query.filter_by(
        user_id=data["user_id"],
        restaurant_id=data["restaurant_id"]
    ).first()
    
    if existing_favorite:
        return jsonify({"error": "이미 즐겨찾기에 추가된 식당입니다."}), 400
    
    try:
        new_favorite = RestaurantFavorite(
            user_id=data["user_id"],
            restaurant_id=data["restaurant_id"]
        )
        
        db.session.add(new_favorite)
        db.session.commit()
        
        return jsonify({
            "message": "즐겨찾기에 추가되었습니다!",
            "favorite_id": new_favorite.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"즐겨찾기 추가 오류: {e}")
        return jsonify({"error": str(e)}), 500

@restaurants_bp.route("/restaurants/favorites/<user_id>", methods=["GET"])
def get_user_favorites(user_id):
    favorites = RestaurantFavorite.query.filter_by(user_id=user_id).all()
    
    favorites_data = []
    for favorite in favorites:
        restaurant = Restaurant.query.get(favorite.restaurant_id)
        if restaurant:
            favorites_data.append({
                "id": favorite.id,
                "restaurant": {
                    "id": restaurant.id,
                    "name": restaurant.name,
                    "category": restaurant.category,
                    "address": restaurant.address
                },
                "added_at": favorite.created_at.isoformat() if favorite.created_at else None
            })
    
    return jsonify({"favorites": favorites_data})

@restaurants_bp.route("/restaurants/favorites/<int:favorite_id>", methods=["DELETE"])
def remove_favorite_restaurant(favorite_id):
    favorite = RestaurantFavorite.query.get_or_404(favorite_id)
    
    try:
        db.session.delete(favorite)
        db.session.commit()
        
        return jsonify({
            "message": "즐겨찾기에서 제거되었습니다."
        })
        
    except Exception as e:
        db.session.rollback()
        print(f"즐겨찾기 제거 오류: {e}")
        return jsonify({"error": str(e)}), 500

@restaurants_bp.route("/restaurants/favorites/check", methods=["POST"])
def check_favorite_restaurant():
    data = request.get_json()
    
    if not data.get("user_id") or not data.get("restaurant_id"):
        return jsonify({"error": "사용자 ID와 식당 ID가 필요합니다."}), 400
    
    favorite = RestaurantFavorite.query.filter_by(
        user_id=data["user_id"],
        restaurant_id=data["restaurant_id"]
    ).first()
    
    return jsonify({
        "is_favorite": favorite is not None,
        "favorite_id": favorite.id if favorite else None
    })

# Restaurant Visits 관련 API들
@restaurants_bp.route("/restaurants/visits", methods=["POST"])
def record_restaurant_visit():
    data = request.get_json()
    
    if not data.get("user_id") or not data.get("restaurant_id"):
        return jsonify({"error": "사용자 ID와 식당 ID가 필요합니다."}), 400
    
    try:
        new_visit = RestaurantVisit(
            user_id=data["user_id"],
            restaurant_id=data["restaurant_id"],
            visit_date=data.get("visit_date", get_seoul_today().strftime("%Y-%m-%d")),
            rating=data.get("rating"),
            comment=data.get("comment", "")
        )
        
        db.session.add(new_visit)
        db.session.commit()
        
        return jsonify({
            "message": "방문 기록이 등록되었습니다!",
            "visit_id": new_visit.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"방문 기록 등록 오류: {e}")
        return jsonify({"error": str(e)}), 500

@restaurants_bp.route("/restaurants/popular", methods=["GET"])
def get_popular_restaurants():
    """인기 식당 목록을 반환 (방문 횟수, 리뷰 수, 평점 기준)"""
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    
    # 복합 점수로 정렬 (방문 횟수 + 리뷰 수 + 평점)
    restaurants_query = db.session.query(
        Restaurant,
        func.count(RestaurantVisit.id).label('visit_count'),
        func.count(Review.id).label('review_count'),
        func.avg(Review.rating).label('avg_rating')
    ).outerjoin(RestaurantVisit).outerjoin(Review).group_by(Restaurant.id)
    
    total = restaurants_query.count()
    results = restaurants_query.order_by(
        desc(func.count(RestaurantVisit.id) + func.count(Review.id) + func.coalesce(func.avg(Review.rating), 0))
    ).offset((page - 1) * per_page).limit(per_page).all()
    
    restaurants_data = []
    for restaurant, visit_count, review_count, avg_rating in results:
        restaurants_data.append({
            "id": restaurant.id,
            "name": restaurant.name,
            "category": restaurant.category,
            "address": restaurant.address,
            "visit_count": visit_count,
            "review_count": review_count,
            "avg_rating": round(avg_rating, 1) if avg_rating else 0,
            "popularity_score": visit_count + review_count + (avg_rating or 0)
        })
    
    return jsonify({
        "restaurants": restaurants_data,
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "pages": (total + per_page - 1) // per_page
        }
    })

@restaurants_bp.route("/restaurants/visits/stats/<user_id>", methods=["GET"])
def get_user_visit_stats(user_id):
    """사용자의 식당 방문 통계를 반환"""
    visits = RestaurantVisit.query.filter_by(user_id=user_id).all()
    
    if not visits:
        return jsonify({
            "total_visits": 0,
            "unique_restaurants": 0,
            "favorite_categories": [],
            "recent_visits": []
        })
    
    # 총 방문 횟수
    total_visits = len(visits)
    
    # 방문한 고유 식당 수
    unique_restaurants = len(set(visit.restaurant_id for visit in visits))
    
    # 선호 카테고리 (방문 횟수 기준)
    category_counts = {}
    for visit in visits:
        restaurant = Restaurant.query.get(visit.restaurant_id)
        if restaurant:
            category = restaurant.category
            category_counts[category] = category_counts.get(category, 0) + 1
    
    favorite_categories = sorted(category_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    
    # 최근 방문 기록
    recent_visits = []
    for visit in sorted(visits, key=lambda x: x.visit_date, reverse=True)[:10]:
        restaurant = Restaurant.query.get(visit.restaurant_id)
        if restaurant:
            recent_visits.append({
                "restaurant_name": restaurant.name,
                "visit_date": visit.visit_date,
                "rating": visit.rating,
                "comment": visit.comment
            })
    
    return jsonify({
        "total_visits": total_visits,
        "unique_restaurants": unique_restaurants,
        "favorite_categories": [{"category": cat, "count": count} for cat, count in favorite_categories],
        "recent_visits": recent_visits
    })

@restaurants_bp.route("/restaurants/recommendations/<user_id>", methods=["GET"])
def get_restaurant_recommendations(user_id):
    """사용자 맞춤 식당 추천을 반환"""
    # 사용자의 방문 기록과 선호도 분석
    user_visits = RestaurantVisit.query.filter_by(user_id=user_id).all()
    
    if not user_visits:
        # 방문 기록이 없으면 인기 식당 반환
        popular_restaurants = Restaurant.query.limit(10).all()
        recommendations = []
        for restaurant in popular_restaurants:
            recommendations.append({
                "id": restaurant.id,
                "name": restaurant.name,
                "category": restaurant.category,
                "address": restaurant.address,
                "reason": "인기 식당"
            })
        return jsonify({"recommendations": recommendations})
    
    # 사용자가 선호하는 카테고리 찾기
    category_preferences = {}
    for visit in user_visits:
        restaurant = Restaurant.query.get(visit.restaurant_id)
        if restaurant and visit.rating and visit.rating >= 4:
            category = restaurant.category
            category_preferences[category] = category_preferences.get(category, 0) + 1
    
    # 선호 카테고리 기반 추천
    recommendations = []
    for category, count in sorted(category_preferences.items(), key=lambda x: x[1], reverse=True)[:3]:
        category_restaurants = Restaurant.query.filter_by(category=category).limit(5).all()
        for restaurant in category_restaurants:
            # 이미 방문한 식당은 제외
            if not any(visit.restaurant_id == restaurant.id for visit in user_visits):
                recommendations.append({
                    "id": restaurant.id,
                    "name": restaurant.name,
                    "category": restaurant.category,
                    "address": restaurant.address,
                    "reason": f"선호 카테고리: {category}"
                })
    
    # 추천이 부족하면 인기 식당으로 보충
    if len(recommendations) < 10:
        popular_restaurants = Restaurant.query.limit(10 - len(recommendations)).all()
        for restaurant in popular_restaurants:
            if not any(rec["id"] == restaurant.id for rec in recommendations):
                recommendations.append({
                    "id": restaurant.id,
                    "name": restaurant.name,
                    "category": restaurant.category,
                    "address": restaurant.address,
                    "reason": "인기 식당"
                })
    
    return jsonify({"recommendations": recommendations[:10]})
