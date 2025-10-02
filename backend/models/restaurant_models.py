"""
새로운 식당 모델 정의
707개 식당 데이터를 위한 깔끔한 구조
"""

from backend.app.extensions import db
from datetime import datetime
from sqlalchemy import Index

class RestaurantV2(db.Model):
    """식당 정보 모델 v2"""
    __tablename__ = 'restaurants_v2'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False, index=True)  # 식당명
    address = db.Column(db.Text, nullable=False)  # 도로명주소
    latitude = db.Column(db.Float, nullable=False)  # 위도
    longitude = db.Column(db.Float, nullable=False)  # 경도
    phone = db.Column(db.String(20))  # 전화번호
    category = db.Column(db.String(100), index=True)  # 식당분류

    # 추가 정보
    rating = db.Column(db.Float, default=0.0)  # 평점
    review_count = db.Column(db.Integer, default=0)  # 리뷰 수
    price_range = db.Column(db.String(50))  # 가격대
    is_active = db.Column(db.Boolean, default=True)  # 활성 상태

    # 타임스탬프
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 인덱스 설정 (성능 최적화)
    __table_args__ = (
        Index('idx_location', 'latitude', 'longitude'),  # 위치 기반 검색용
        Index('idx_category_name', 'category', 'name'),  # 카테고리 + 이름 검색용
    )

    def to_dict(self):
        """딕셔너리로 변환"""
        return {
            'id': self.id,
            'name': self.name,
            'address': self.address,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'phone': self.phone,
            'category': self.category,
            'rating': self.rating,
            'review_count': self.review_count,
            'price_range': self.price_range,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def calculate_distance(self, lat, lng):
        """현재 위치로부터의 거리 계산 (km)"""
        from math import radians, cos, sin, asin, sqrt

        # Haversine 공식
        lat1, lon1 = radians(self.latitude), radians(self.longitude)
        lat2, lon2 = radians(lat), radians(lng)

        dlat = lat2 - lat1
        dlon = lon2 - lon1

        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * asin(sqrt(a))

        # 지구 반지름 (km)
        r = 6371

        return round(c * r, 2)

    def __repr__(self):
        return f'<Restaurant {self.name}>'


class RestaurantReviewV2(db.Model):
    """식당 리뷰 모델 v2 (향후 확장용)"""
    __tablename__ = 'restaurant_reviews_v2'

    id = db.Column(db.Integer, primary_key=True)
    restaurant_id = db.Column(db.Integer, db.ForeignKey('restaurants_v2.id'), nullable=False)
    user_id = db.Column(db.String(50), nullable=False)  # 사용자 ID
    rating = db.Column(db.Float, nullable=False)  # 평점 (1-5)
    comment = db.Column(db.Text)  # 리뷰 내용
    visit_date = db.Column(db.Date)  # 방문 날짜

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # 관계 설정
    restaurant = db.relationship('RestaurantV2', backref=db.backref('reviews', lazy=True))

    def to_dict(self):
        return {
            'id': self.id,
            'restaurant_id': self.restaurant_id,
            'user_id': self.user_id,
            'rating': self.rating,
            'comment': self.comment,
            'visit_date': self.visit_date.isoformat() if self.visit_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class RestaurantVisitV2(db.Model):
    """식당 방문 기록 모델 v2"""
    __tablename__ = 'restaurant_visits_v2'

    id = db.Column(db.Integer, primary_key=True)
    restaurant_id = db.Column(db.Integer, db.ForeignKey('restaurants_v2.id'), nullable=False)
    user_id = db.Column(db.String(50), nullable=False)  # 사용자 ID
    visit_date = db.Column(db.Date, nullable=False)  # 방문 날짜
    visit_time = db.Column(db.Time)  # 방문 시간
    party_size = db.Column(db.Integer, default=1)  # 인원수
    notes = db.Column(db.Text)  # 메모

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # 관계 설정
    restaurant = db.relationship('RestaurantV2', backref=db.backref('visits', lazy=True))

    def to_dict(self):
        return {
            'id': self.id,
            'restaurant_id': self.restaurant_id,
            'user_id': self.user_id,
            'visit_date': self.visit_date.isoformat() if self.visit_date else None,
            'visit_time': self.visit_time.isoformat() if self.visit_time else None,
            'party_size': self.party_size,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class RestaurantRecommendV2(db.Model):
    """식당 오찬추천 모델 v2"""
    __tablename__ = 'restaurant_recommends_v2'

    id = db.Column(db.Integer, primary_key=True)
    restaurant_id = db.Column(db.Integer, db.ForeignKey('restaurants_v2.id'), nullable=False)
    user_id = db.Column(db.String(50), nullable=False)  # 사용자 ID

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # 관계 설정
    restaurant = db.relationship('RestaurantV2', backref=db.backref('recommends', lazy=True))

    # 복합 유니크 인덱스 (한 사용자가 같은 식당을 중복 추천하지 않도록)
    __table_args__ = (
        db.UniqueConstraint('restaurant_id', 'user_id', name='unique_restaurant_user_recommend'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'restaurant_id': self.restaurant_id,
            'user_id': self.user_id,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class RestaurantSavedV2(db.Model):
    """식당 저장 모델 v2"""
    __tablename__ = 'restaurant_saved_v2'

    id = db.Column(db.Integer, primary_key=True)
    restaurant_id = db.Column(db.Integer, db.ForeignKey('restaurants_v2.id'), nullable=False)
    user_id = db.Column(db.String(50), nullable=False)  # 사용자 ID

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # 관계 설정
    restaurant = db.relationship('RestaurantV2', backref=db.backref('saved_by', lazy=True))

    # 복합 유니크 인덱스 (한 사용자가 같은 식당을 중복 저장하지 않도록)
    __table_args__ = (
        db.UniqueConstraint('restaurant_id', 'user_id', name='unique_restaurant_user_saved'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'restaurant_id': self.restaurant_id,
            'user_id': self.user_id,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
