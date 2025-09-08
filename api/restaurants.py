"""
식당 API Blueprint
식당 관련 모든 API 엔드포인트를 포함합니다.
"""

from flask import Blueprint, request, jsonify
from datetime import datetime
from typing import Dict, Any, List
from extensions import db
import logging
import csv
import os

logger = logging.getLogger(__name__)

# Blueprint 생성
restaurants_bp = Blueprint('restaurants', __name__, url_prefix='/api/restaurants')

@restaurants_bp.route('/', methods=['GET'])
def get_restaurants():
    """
    모든 식당 목록 조회
    쿼리 파라미터: category, location, search, limit, offset
    """
    try:
        # 쿼리 파라미터 추출
        category = request.args.get('category')
        location = request.args.get('location')
        search = request.args.get('search')
        limit = int(request.args.get('limit', 50))
        offset = int(request.args.get('offset', 0))
        
        # CSV 파일에서 식당 데이터 읽기
        restaurants_data = load_restaurants_from_csv()
        
        # 필터링
        filtered_restaurants = restaurants_data
        
        if category:
            filtered_restaurants = [r for r in filtered_restaurants if category.lower() in r.get('category', '').lower()]
        
        if location:
            filtered_restaurants = [r for r in filtered_restaurants if location.lower() in r.get('location', '').lower()]
        
        if search:
            search_lower = search.lower()
            filtered_restaurants = [r for r in filtered_restaurants 
                                  if search_lower in r.get('name', '').lower() 
                                  or search_lower in r.get('description', '').lower()]
        
        # 페이지네이션
        total_count = len(filtered_restaurants)
        paginated_restaurants = filtered_restaurants[offset:offset + limit]
        
        return jsonify({
            'success': True,
            'message': '식당 목록 조회 성공',
            'data': {
                'restaurants': paginated_restaurants,
                'pagination': {
                    'total': total_count,
                    'limit': limit,
                    'offset': offset,
                    'has_more': offset + limit < total_count
                }
            }
        })
        
    except Exception as e:
        logger.error(f"Error in get_restaurants: {e}")
        return jsonify({'error': '식당 목록 조회 중 오류가 발생했습니다.', 'details': str(e)}), 500

@restaurants_bp.route('/<int:restaurant_id>', methods=['GET'])
def get_restaurant(restaurant_id):
    """
    특정 식당 상세 정보 조회
    """
    try:
        # CSV 파일에서 식당 데이터 읽기
        restaurants_data = load_restaurants_from_csv()
        
        # ID로 식당 찾기
        restaurant = next((r for r in restaurants_data if r.get('id') == restaurant_id), None)
        
        if not restaurant:
            return jsonify({'error': '식당을 찾을 수 없습니다.'}), 404
        
        return jsonify({
            'success': True,
            'message': '식당 상세 정보 조회 성공',
            'data': restaurant
        })
        
    except Exception as e:
        logger.error(f"Error in get_restaurant: {e}")
        return jsonify({'error': '식당 상세 정보 조회 중 오류가 발생했습니다.', 'details': str(e)}), 500

@restaurants_bp.route('/categories', methods=['GET'])
def get_categories():
    """
    식당 카테고리 목록 조회
    """
    try:
        # CSV 파일에서 식당 데이터 읽기
        restaurants_data = load_restaurants_from_csv()
        
        # 카테고리 추출 및 중복 제거
        categories = list(set(r.get('category', '') for r in restaurants_data if r.get('category')))
        categories.sort()
        
        return jsonify({
            'success': True,
            'message': '카테고리 목록 조회 성공',
            'data': categories
        })
        
    except Exception as e:
        logger.error(f"Error in get_categories: {e}")
        return jsonify({'error': '카테고리 목록 조회 중 오류가 발생했습니다.', 'details': str(e)}), 500

@restaurants_bp.route('/search', methods=['GET'])
def search_restaurants():
    """
    식당 검색
    쿼리 파라미터: q (검색어), category, location, price_range
    """
    try:
        # 쿼리 파라미터 추출
        query = request.args.get('q', '')
        category = request.args.get('category')
        location = request.args.get('location')
        price_range = request.args.get('price_range')
        limit = int(request.args.get('limit', 20))
        
        if not query:
            return jsonify({'error': '검색어가 필요합니다.'}), 400
        
        # CSV 파일에서 식당 데이터 읽기
        restaurants_data = load_restaurants_from_csv()
        
        # 검색 필터링
        filtered_restaurants = restaurants_data
        
        # 검색어로 필터링
        query_lower = query.lower()
        filtered_restaurants = [r for r in filtered_restaurants 
                              if query_lower in r.get('name', '').lower() 
                              or query_lower in r.get('description', '').lower()
                              or query_lower in r.get('category', '').lower()]
        
        # 추가 필터링
        if category:
            filtered_restaurants = [r for r in filtered_restaurants if category.lower() in r.get('category', '').lower()]
        
        if location:
            filtered_restaurants = [r for r in filtered_restaurants if location.lower() in r.get('location', '').lower()]
        
        if price_range:
            # 가격 범위 필터링 (예: "10000-20000")
            try:
                min_price, max_price = map(int, price_range.split('-'))
                filtered_restaurants = [r for r in filtered_restaurants 
                                      if min_price <= int(r.get('price_range', 0)) <= max_price]
            except ValueError:
                pass
        
        # 결과 제한
        results = filtered_restaurants[:limit]
        
        return jsonify({
            'success': True,
            'message': f'"{query}" 검색 결과',
            'data': {
                'query': query,
                'results': results,
                'total': len(results)
            }
        })
        
    except Exception as e:
        logger.error(f"Error in search_restaurants: {e}")
        return jsonify({'error': '식당 검색 중 오류가 발생했습니다.', 'details': str(e)}), 500

def load_restaurants_from_csv():
    """
    CSV 파일에서 식당 데이터를 로드합니다.
    """
    try:
        # 임시로 하드코딩된 테스트 데이터 반환
        restaurants = [
            {
                'id': 1,
                'name': '지구마을',
                'category': '한식',
                'location': '판교',
                'address': '경기도 성남시 수정구 시흥동 298 한국국제협력단 본관 1층 일부호',
                'phone': '031-123-4567',
                'description': '지구마을 - 판교 지역 맛집',
                'price_range': 8000,
                'rating': 4.2,
                'latitude': 37.41504641,
                'longitude': 127.0993841,
                'image_url': '',
                'tags': ['맛집', '판교', '한식'],
                'is_active': True,
                'created_at': datetime.now().isoformat(),
                'distance': 0.1
            },
            {
                'id': 2,
                'name': '북창동순두부 판교파미어스몰점',
                'category': '한식',
                'location': '판교',
                'address': '경기도 성남시 수정구 시흥동 322 2층 209호',
                'phone': '031-123-4568',
                'description': '북창동순두부 판교파미어스몰점 - 판교 지역 맛집',
                'price_range': 12000,
                'rating': 4.0,
                'latitude': 37.41340786,
                'longitude': 127.0983592,
                'image_url': '',
                'tags': ['맛집', '판교', '순두부'],
                'is_active': True,
                'created_at': datetime.now().isoformat(),
                'distance': 0.26
            },
            {
                'id': 3,
                'name': '시먼당 파미어스몰',
                'category': '중식',
                'location': '판교',
                'address': '경기도 성남시 수정구 시흥동 322 판교아이스퀘어 2층 201-3호',
                'phone': '031-123-4569',
                'description': '시먼당 파미어스몰 - 판교 지역 맛집',
                'price_range': 15000,
                'rating': 4.5,
                'latitude': 37.41340786,
                'longitude': 127.0983592,
                'image_url': '',
                'tags': ['맛집', '판교', '중식'],
                'is_active': True,
                'created_at': datetime.now().isoformat(),
                'distance': 0.26
            }
        ]
        
        logger.info(f"테스트 식당 데이터 {len(restaurants)}개 로드 완료")
        return restaurants
        
    except Exception as e:
        logger.error(f"Error loading restaurants: {e}")
        # CSV 파일 경로
        csv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'restaurants.csv')
        
        restaurants = []
        
        if os.path.exists(csv_path):
            logger.info(f"CSV 파일 경로: {csv_path}")
            with open(csv_path, 'r', encoding='utf-8-sig') as file:  # BOM 제거
                reader = csv.DictReader(file)
                logger.info(f"CSV 컬럼명: {reader.fieldnames}")
                for i, row in enumerate(reader, 1):
                    # 빈 행 건너뛰기
                    if not row.get('식당명'):
                        continue
                    logger.info(f"처리 중인 식당 {i}: {row.get('식당명', '')}")
                    # CSV 데이터를 API 형식으로 변환 (실제 CSV 컬럼명에 맞춤)
                    restaurant = {
                        'id': i,
                        'name': row.get('식당명', ''),
                        'category': '한식',  # 기본값
                        'location': '판교',  # 기본값
                        'address': row.get('주소', ''),
                        'phone': '',
                        'description': f"{row.get('식당명', '')} - 판교 지역 맛집",
                        'price_range': 10000,  # 기본값
                        'rating': 4.0,  # 기본값
                        'latitude': float(row.get('위도', 0)) if row.get('위도') else 0.0,
                        'longitude': float(row.get('경도', 0)) if row.get('경도') else 0.0,
                        'image_url': '',
                        'tags': ['맛집', '판교'],
                        'is_active': True,
                        'created_at': datetime.now().isoformat(),
                        'distance': float(row.get('거리(km)', 0)) if row.get('거리(km)') else 0.0
                    }
                    restaurants.append(restaurant)
        
        return restaurants
        
    except Exception as e:
        logger.error(f"Error loading restaurants from CSV: {e}")
        return []

@restaurants_bp.route('/nearby', methods=['GET'])
def get_nearby_restaurants():
    """
    근처 식당 조회
    쿼리 파라미터: lat (위도), lng (경도), radius (반경, km)
    """
    try:
        # 쿼리 파라미터 추출
        lat = float(request.args.get('lat', 0))
        lng = float(request.args.get('lng', 0))
        radius = float(request.args.get('radius', 5))  # 기본 5km
        limit = int(request.args.get('limit', 20))
        
        if lat == 0 and lng == 0:
            return jsonify({'error': '위도와 경도가 필요합니다.'}), 400
        
        # CSV 파일에서 식당 데이터 읽기
        restaurants_data = load_restaurants_from_csv()
        
        # 거리 계산 및 필터링
        nearby_restaurants = []
        for restaurant in restaurants_data:
            rest_lat = restaurant.get('latitude', 0)
            rest_lng = restaurant.get('longitude', 0)
            
            if rest_lat == 0 and rest_lng == 0:
                continue
            
            # 간단한 거리 계산 (Haversine 공식의 근사치)
            distance = calculate_distance(lat, lng, rest_lat, rest_lng)
            
            if distance <= radius:
                restaurant['distance'] = round(distance, 2)
                nearby_restaurants.append(restaurant)
        
        # 거리순으로 정렬
        nearby_restaurants.sort(key=lambda x: x['distance'])
        
        # 결과 제한
        results = nearby_restaurants[:limit]
        
        return jsonify({
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
        return jsonify({'error': '근처 식당 조회 중 오류가 발생했습니다.', 'details': str(e)}), 500

def calculate_distance(lat1, lng1, lat2, lng2):
    """
    두 지점 간의 거리를 계산합니다 (km 단위)
    """
    import math
    
    # 지구 반지름 (km)
    R = 6371
    
    # 라디안으로 변환
    lat1_rad = math.radians(lat1)
    lng1_rad = math.radians(lng1)
    lat2_rad = math.radians(lat2)
    lng2_rad = math.radians(lng2)
    
    # 차이 계산
    dlat = lat2_rad - lat1_rad
    dlng = lng2_rad - lng1_rad
    
    # Haversine 공식
    a = math.sin(dlat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlng/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    return R * c
