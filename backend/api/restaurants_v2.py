"""
새로운 식당 API v2
707개 식당 데이터를 위한 깔끔하고 효율적인 API
"""

from flask import Blueprint, request, jsonify
from utils.safe_jsonify import safe_jsonify
from datetime import datetime
from typing import Dict, Any, List, Optional
from extensions import db
from models.restaurant_models import RestaurantV2, RestaurantReviewV2, RestaurantVisitV2, RestaurantRecommendV2, RestaurantSavedV2
from auth.middleware import check_authentication
import logging
import math

logger = logging.getLogger(__name__)

# Blueprint 생성
restaurants_v2_bp = Blueprint('restaurants_v2', __name__, url_prefix='/api/v2/restaurants')

# 인증 미들웨어 적용
@restaurants_v2_bp.before_request
def _restaurants_v2_guard():
    from flask import request, jsonify
    import os
    
    # 개발 환경에서는 개발용 토큰으로 인증 우회
    if os.getenv('FLASK_ENV') == 'development':
        auth_header = request.headers.get('Authorization')
        if auth_header and 'dev-token-12345' in auth_header:
            # 개발용 사용자 설정
            from auth.models import User
            user = User.query.filter_by(employee_id='1').first()
            if not user:
                user = User(
                    employee_id='1',
                    email='dev@example.com',
                    nickname='개발자',
                    is_active=True
                )
                from auth.models import db
                db.session.add(user)
                db.session.commit()
            
            request.current_user = user
            return None
    
    # 일반 인증 확인
    return check_authentication()

@restaurants_v2_bp.route('/', methods=['GET'])
def get_restaurants():
    """
    식당 목록 조회 (필터링, 검색, 페이지네이션 지원)
    쿼리 파라미터:
    - search: 검색어 (식당명, 주소, 카테고리)
    - category: 카테고리 필터
    - lat, lng: 현재 위치 (거리순 정렬용)
    - radius: 검색 반경 (km, 기본값: 5)
    - sort: 정렬 기준 (distance, rating, name, created_at)
    - limit: 페이지 크기 (기본값: 20)
    - offset: 오프셋 (기본값: 0)
    """
    try:
        # 쿼리 파라미터 추출
        search = request.args.get('search', '').strip()
        category = request.args.get('category', '').strip()
        lat = request.args.get('lat', type=float)
        lng = request.args.get('lng', type=float)
        radius = request.args.get('radius', 5, type=float)
        sort = request.args.get('sort', 'distance' if lat and lng else 'name')
        limit = min(request.args.get('limit', 20, type=int), 100)  # 최대 100개
        offset = request.args.get('offset', 0, type=int)
        
        # 기본 쿼리
        query = RestaurantV2.query.filter(RestaurantV2.is_active == True)
        
        # 검색 필터
        if search:
            search_filter = f"%{search}%"
            query = query.filter(
                db.or_(
                    RestaurantV2.name.ilike(search_filter),
                    RestaurantV2.address.ilike(search_filter),
                    RestaurantV2.category.ilike(search_filter)
                )
            )
        
        # 카테고리 필터
        if category:
            query = query.filter(RestaurantV2.category.ilike(f"%{category}%"))
        
        # 위치 기반 필터링 (선택적)
        if lat and lng and radius:
            # 간단한 경계 박스 필터링 (성능 최적화)
            lat_delta = radius / 111.0  # 대략적인 위도 차이
            lng_delta = radius / (111.0 * math.cos(math.radians(lat)))  # 경도 차이
            
            query = query.filter(
                db.and_(
                    RestaurantV2.latitude.between(lat - lat_delta, lat + lat_delta),
                    RestaurantV2.longitude.between(lng - lng_delta, lng + lng_delta)
                )
            )
        
        # 정렬
        if sort == 'distance' and lat and lng:
            # 거리순 정렬은 애플리케이션 레벨에서 처리
            restaurants = query.all()
            # 거리 계산 및 정렬
            for restaurant in restaurants:
                restaurant.distance = restaurant.calculate_distance(lat, lng)
            restaurants = [r for r in restaurants if r.distance <= radius]
            restaurants.sort(key=lambda x: x.distance)
        elif sort == 'rating':
            query = query.order_by(RestaurantV2.rating.desc(), RestaurantV2.review_count.desc())
            restaurants = query.all()
        elif sort == 'name':
            query = query.order_by(RestaurantV2.name.asc())
            restaurants = query.all()
        elif sort == 'created_at':
            query = query.order_by(RestaurantV2.created_at.desc())
            restaurants = query.all()
        else:
            restaurants = query.all()
        
        # 페이지네이션
        total_count = len(restaurants)
        paginated_restaurants = restaurants[offset:offset + limit]
        
        # 응답 데이터 구성
        restaurants_data = []
        for restaurant in paginated_restaurants:
            restaurant_dict = restaurant.to_dict()
            if lat and lng:
                restaurant_dict['distance'] = restaurant.distance
            
            # 추천 수와 저장 수 추가
            restaurant_dict['recommend_count'] = RestaurantRecommendV2.query.filter_by(restaurant_id=restaurant.id).count()
            restaurant_dict['saved_count'] = RestaurantSavedV2.query.filter_by(restaurant_id=restaurant.id).count()
            
            restaurants_data.append(restaurant_dict)
        
        return safe_jsonify({
            'success': True,
            'message': '식당 목록 조회 성공',
            'data': {
                'restaurants': restaurants_data,
                'pagination': {
                    'total': total_count,
                    'limit': limit,
                    'offset': offset,
                    'has_more': offset + limit < total_count
                },
                'filters': {
                    'search': search,
                    'category': category,
                    'radius': radius if lat and lng else None,
                    'sort': sort
                }
            }
        })
        
    except Exception as e:
        logger.error(f"Error in get_restaurants: {e}")
        return safe_jsonify({
            'success': False,
            'error': '식당 목록 조회 중 오류가 발생했습니다.',
            'details': str(e)
        }), 500


@restaurants_v2_bp.route('/<int:restaurant_id>', methods=['GET'])
def get_restaurant(restaurant_id):
    """
    특정 식당 상세 정보 조회
    """
    try:
        restaurant = RestaurantV2.query.get_or_404(restaurant_id)
        
        if not restaurant.is_active:
            return safe_jsonify({
                'success': False,
                'error': '비활성화된 식당입니다.'
            }), 404
        
        restaurant_data = restaurant.to_dict()
        
        # 리뷰 통계 추가
        reviews = RestaurantReviewV2.query.filter_by(restaurant_id=restaurant_id).all()
        if reviews:
            avg_rating = sum(r.rating for r in reviews) / len(reviews)
            restaurant_data['avg_rating'] = round(avg_rating, 1)
            restaurant_data['total_reviews'] = len(reviews)
        else:
            restaurant_data['avg_rating'] = 0.0
            restaurant_data['total_reviews'] = 0
        
        return safe_jsonify({
            'success': True,
            'message': '식당 상세 정보 조회 성공',
            'data': restaurant_data
        })
        
    except Exception as e:
        logger.error(f"Error in get_restaurant: {e}")
        return safe_jsonify({
            'success': False,
            'error': '식당 상세 정보 조회 중 오류가 발생했습니다.',
            'details': str(e)
        }), 500


@restaurants_v2_bp.route('/categories', methods=['GET'])
def get_categories():
    """
    식당 카테고리 목록 조회
    """
    try:
        categories = db.session.query(RestaurantV2.category).filter(
            RestaurantV2.is_active == True,
            RestaurantV2.category.isnot(None),
            RestaurantV2.category != ''
        ).distinct().all()
        
        category_list = [cat[0] for cat in categories if cat[0]]
        category_list.sort()
        
        return safe_jsonify({
            'success': True,
            'message': '카테고리 목록 조회 성공',
            'data': {
                'categories': category_list,
                'total': len(category_list)
            }
        })
        
    except Exception as e:
        logger.error(f"Error in get_categories: {e}")
        return safe_jsonify({
            'success': False,
            'error': '카테고리 목록 조회 중 오류가 발생했습니다.',
            'details': str(e)
        }), 500


@restaurants_v2_bp.route('/nearby', methods=['GET'])
def get_nearby_restaurants():
    """
    근처 식당 조회 (위치 기반)
    쿼리 파라미터:
    - lat: 위도 (필수)
    - lng: 경도 (필수)
    - radius: 반경 (km, 기본값: 2)
    - limit: 결과 수 (기본값: 20)
    - category: 카테고리 필터 (선택)
    """
    try:
        lat = request.args.get('lat', type=float)
        lng = request.args.get('lng', type=float)
        radius = request.args.get('radius', 2, type=float)
        limit = min(request.args.get('limit', 20, type=int), 50)
        category = request.args.get('category', '').strip()
        
        if not lat or not lng:
            return safe_jsonify({
                'success': False,
                'error': '위도와 경도가 필요합니다.'
            }), 400
        
        # 기본 쿼리
        query = RestaurantV2.query.filter(RestaurantV2.is_active == True)
        
        # 카테고리 필터
        if category:
            query = query.filter(RestaurantV2.category.ilike(f"%{category}%"))
        
        # 모든 식당 조회 후 거리 계산
        restaurants = query.all()
        nearby_restaurants = []
        
        for restaurant in restaurants:
            distance = restaurant.calculate_distance(lat, lng)
            if distance <= radius:
                restaurant_dict = restaurant.to_dict()
                restaurant_dict['distance'] = distance
                nearby_restaurants.append(restaurant_dict)
        
        # 거리순 정렬
        nearby_restaurants.sort(key=lambda x: x['distance'])
        
        # 결과 제한
        results = nearby_restaurants[:limit]
        
        return safe_jsonify({
            'success': True,
            'message': f'반경 {radius}km 내 식당 조회 성공',
            'data': {
                'center': {'lat': lat, 'lng': lng},
                'radius': radius,
                'restaurants': results,
                'total': len(results)
            }
        })
        
    except Exception as e:
        logger.error(f"Error in get_nearby_restaurants: {e}")
        return safe_jsonify({
            'success': False,
            'error': '근처 식당 조회 중 오류가 발생했습니다.',
            'details': str(e)
        }), 500


@restaurants_v2_bp.route('/<int:restaurant_id>/visits', methods=['POST'])
def add_restaurant_visit(restaurant_id):
    """
    식당 방문 기록 추가
    """
    try:
        data = request.get_json()
        
        if not data:
            return safe_jsonify({
                'success': False,
                'error': '요청 데이터가 필요합니다.'
            }), 400
        
        # 필수 필드 검증
        required_fields = ['user_id', 'visit_date']
        for field in required_fields:
            if field not in data:
                return safe_jsonify({
                    'success': False,
                    'error': f'{field} 필드가 필요합니다.'
                }), 400
        
        # 식당 존재 확인
        restaurant = RestaurantV2.query.get_or_404(restaurant_id)
        
        # 방문 기록 생성
        visit = RestaurantVisitV2(
            restaurant_id=restaurant_id,
            user_id=data['user_id'],
            visit_date=datetime.strptime(data['visit_date'], '%Y-%m-%d').date(),
            visit_time=datetime.strptime(data['visit_time'], '%H:%M').time() if data.get('visit_time') else None,
            party_size=data.get('party_size', 1),
            notes=data.get('notes', '')
        )
        
        db.session.add(visit)
        db.session.commit()
        
        return safe_jsonify({
            'success': True,
            'message': '방문 기록이 추가되었습니다.',
            'data': visit.to_dict()
        })
        
    except ValueError as e:
        return safe_jsonify({
            'success': False,
            'error': '날짜 형식이 올바르지 않습니다. (YYYY-MM-DD, HH:MM)'
        }), 400
    except Exception as e:
        logger.error(f"Error in add_restaurant_visit: {e}")
        db.session.rollback()
        return safe_jsonify({
            'success': False,
            'error': '방문 기록 추가 중 오류가 발생했습니다.',
            'details': str(e)
        }), 500


@restaurants_v2_bp.route('/<int:restaurant_id>/reviews', methods=['POST'])
def add_restaurant_review(restaurant_id):
    """
    식당 리뷰 추가
    """
    try:
        data = request.get_json()
        
        if not data:
            return safe_jsonify({
                'success': False,
                'error': '요청 데이터가 필요합니다.'
            }), 400
        
        # 필수 필드 검증
        required_fields = ['user_id', 'rating']
        for field in required_fields:
            if field not in data:
                return safe_jsonify({
                    'success': False,
                    'error': f'{field} 필드가 필요합니다.'
                }), 400
        
        # 평점 범위 검증
        if not (1 <= data['rating'] <= 5):
            return safe_jsonify({
                'success': False,
                'error': '평점은 1-5 사이의 값이어야 합니다.'
            }), 400
        
        # 식당 존재 확인
        restaurant = RestaurantV2.query.get_or_404(restaurant_id)
        
        # 리뷰 생성
        review = RestaurantReviewV2(
            restaurant_id=restaurant_id,
            user_id=data['user_id'],
            rating=data['rating'],
            comment=data.get('comment', ''),
            visit_date=datetime.strptime(data['visit_date'], '%Y-%m-%d').date() if data.get('visit_date') else None
        )
        
        db.session.add(review)
        
        # 식당 평점 업데이트
        all_reviews = RestaurantReviewV2.query.filter_by(restaurant_id=restaurant_id).all()
        if all_reviews:
            avg_rating = sum(r.rating for r in all_reviews) / len(all_reviews)
            restaurant.rating = round(avg_rating, 1)
            restaurant.review_count = len(all_reviews)
        
        db.session.commit()
        
        return safe_jsonify({
            'success': True,
            'message': '리뷰가 추가되었습니다.',
            'data': review.to_dict()
        })
        
    except ValueError as e:
        return safe_jsonify({
            'success': False,
            'error': '날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)'
        }), 400
    except Exception as e:
        logger.error(f"Error in add_restaurant_review: {e}")
        db.session.rollback()
        return safe_jsonify({
            'success': False,
            'error': '리뷰 추가 중 오류가 발생했습니다.',
            'details': str(e)
        }), 500


@restaurants_v2_bp.route('/stats', methods=['GET'])
def get_restaurant_stats():
    """
    식당 통계 정보 조회
    """
    try:
        total_restaurants = RestaurantV2.query.filter(RestaurantV2.is_active == True).count()
        total_reviews = RestaurantReviewV2.query.count()
        total_visits = RestaurantVisitV2.query.count()
        
        # 카테고리별 통계
        category_stats = db.session.query(
            RestaurantV2.category,
            db.func.count(RestaurantV2.id).label('count')
        ).filter(
            RestaurantV2.is_active == True,
            RestaurantV2.category.isnot(None),
            RestaurantV2.category != ''
        ).group_by(RestaurantV2.category).all()
        
        categories = [{'name': cat[0], 'count': cat[1]} for cat in category_stats]
        categories.sort(key=lambda x: x['count'], reverse=True)
        
        return safe_jsonify({
            'success': True,
            'message': '식당 통계 조회 성공',
            'data': {
                'total_restaurants': total_restaurants,
                'total_reviews': total_reviews,
                'total_visits': total_visits,
                'categories': categories[:10]  # 상위 10개 카테고리
            }
        })
        
    except Exception as e:
        logger.error(f"Error in get_restaurant_stats: {e}")
        return safe_jsonify({
            'success': False,
            'error': '통계 조회 중 오류가 발생했습니다.',
            'details': str(e)
        }), 500


@restaurants_v2_bp.route('/<int:restaurant_id>/recommend', methods=['POST'])
def toggle_restaurant_recommend(restaurant_id):
    """
    식당 오찬추천 토글 (추천/취소)
    """
    try:
        data = request.get_json()
        
        if not data or 'user_id' not in data:
            return safe_jsonify({
                'success': False,
                'error': 'user_id가 필요합니다.'
            }), 400
        
        user_id = data['user_id']
        
        # 식당 존재 확인
        restaurant = RestaurantV2.query.get_or_404(restaurant_id)
        
        # 기존 추천 확인
        existing_recommend = RestaurantRecommendV2.query.filter_by(
            restaurant_id=restaurant_id,
            user_id=user_id
        ).first()
        
        if existing_recommend:
            # 추천 취소
            db.session.delete(existing_recommend)
            action = 'cancelled'
            message = '오찬추천이 취소되었습니다.'
        else:
            # 추천 추가
            recommend = RestaurantRecommendV2(
                restaurant_id=restaurant_id,
                user_id=user_id
            )
            db.session.add(recommend)
            action = 'added'
            message = '오찬추천이 등록되었습니다!'
        
        db.session.commit()
        
        # 추천 수 계산
        recommend_count = RestaurantRecommendV2.query.filter_by(restaurant_id=restaurant_id).count()
        
        return safe_jsonify({
            'success': True,
            'message': message,
            'action': action,
            'recommend_count': recommend_count
        })
        
    except Exception as e:
        logger.error(f"Error in toggle_restaurant_recommend: {e}")
        db.session.rollback()
        return safe_jsonify({
            'success': False,
            'error': '오찬추천 처리 중 오류가 발생했습니다.',
            'details': str(e)
        }), 500


@restaurants_v2_bp.route('/<int:restaurant_id>/save', methods=['POST'])
def toggle_restaurant_save(restaurant_id):
    """
    식당 저장 토글 (저장/해제)
    """
    try:
        data = request.get_json()
        
        if not data or 'user_id' not in data:
            return safe_jsonify({
                'success': False,
                'error': 'user_id가 필요합니다.'
            }), 400
        
        user_id = data['user_id']
        
        # 식당 존재 확인
        restaurant = RestaurantV2.query.get_or_404(restaurant_id)
        
        # 기존 저장 확인
        existing_save = RestaurantSavedV2.query.filter_by(
            restaurant_id=restaurant_id,
            user_id=user_id
        ).first()
        
        if existing_save:
            # 저장 해제
            db.session.delete(existing_save)
            action = 'removed'
            message = '저장이 해제되었습니다.'
        else:
            # 저장 추가
            saved = RestaurantSavedV2(
                restaurant_id=restaurant_id,
                user_id=user_id
            )
            db.session.add(saved)
            action = 'saved'
            message = '식당이 저장되었습니다!'
        
        db.session.commit()
        
        # 저장 수 계산
        saved_count = RestaurantSavedV2.query.filter_by(restaurant_id=restaurant_id).count()
        
        return safe_jsonify({
            'success': True,
            'message': message,
            'action': action,
            'saved_count': saved_count
        })
        
    except Exception as e:
        logger.error(f"Error in toggle_restaurant_save: {e}")
        db.session.rollback()
        return safe_jsonify({
            'success': False,
            'error': '저장 처리 중 오류가 발생했습니다.',
            'details': str(e)
        }), 500


@restaurants_v2_bp.route('/<int:restaurant_id>/recommend/status', methods=['GET'])
def get_restaurant_recommend_status(restaurant_id):
    """
    식당 오찬추천 상태 조회
    """
    try:
        user_id = request.args.get('user_id')
        
        if not user_id:
            return safe_jsonify({
                'success': False,
                'error': 'user_id가 필요합니다.'
            }), 400
        
        # 식당 존재 확인
        restaurant = RestaurantV2.query.get_or_404(restaurant_id)
        
        # 사용자의 추천 상태 확인
        is_recommended = RestaurantRecommendV2.query.filter_by(
            restaurant_id=restaurant_id,
            user_id=user_id
        ).first() is not None
        
        # 전체 추천 수
        recommend_count = RestaurantRecommendV2.query.filter_by(restaurant_id=restaurant_id).count()
        
        return safe_jsonify({
            'success': True,
            'data': {
                'is_recommended': is_recommended,
                'recommend_count': recommend_count
            }
        })
        
    except Exception as e:
        logger.error(f"Error in get_restaurant_recommend_status: {e}")
        return safe_jsonify({
            'success': False,
            'error': '추천 상태 조회 중 오류가 발생했습니다.',
            'details': str(e)
        }), 500


@restaurants_v2_bp.route('/<int:restaurant_id>/save/status', methods=['GET'])
def get_restaurant_save_status(restaurant_id):
    """
    식당 저장 상태 조회
    """
    try:
        user_id = request.args.get('user_id')
        
        if not user_id:
            return safe_jsonify({
                'success': False,
                'error': 'user_id가 필요합니다.'
            }), 400
        
        # 식당 존재 확인
        restaurant = RestaurantV2.query.get_or_404(restaurant_id)
        
        # 사용자의 저장 상태 확인
        is_saved = RestaurantSavedV2.query.filter_by(
            restaurant_id=restaurant_id,
            user_id=user_id
        ).first() is not None
        
        # 전체 저장 수
        saved_count = RestaurantSavedV2.query.filter_by(restaurant_id=restaurant_id).count()
        
        return safe_jsonify({
            'success': True,
            'data': {
                'is_saved': is_saved,
                'saved_count': saved_count
            }
        })
        
    except Exception as e:
        logger.error(f"Error in get_restaurant_save_status: {e}")
        return safe_jsonify({
            'success': False,
            'error': '저장 상태 조회 중 오류가 발생했습니다.',
            'details': str(e)
        }), 500


@restaurants_v2_bp.route('/<int:restaurant_id>/reviews', methods=['GET'])
def get_restaurant_reviews(restaurant_id):
    """
    식당 리뷰 목록 조회
    """
    try:
        # 식당 존재 확인
        restaurant = RestaurantV2.query.get_or_404(restaurant_id)
        
        # 리뷰 조회
        reviews = RestaurantReviewV2.query.filter_by(restaurant_id=restaurant_id).order_by(
            RestaurantReviewV2.created_at.desc()
        ).all()
        
        return safe_jsonify({
            'success': True,
            'data': {
                'restaurant_id': restaurant_id,
                'restaurant_name': restaurant.name,
                'reviews': [review.to_dict() for review in reviews],
                'total_count': len(reviews)
            }
        })
        
    except Exception as e:
        logger.error(f"Error in get_restaurant_reviews: {e}")
        return safe_jsonify({
            'success': False,
            'error': '리뷰 조회 중 오류가 발생했습니다.',
            'details': str(e)
        }), 500
