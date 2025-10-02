#!/usr/bin/env python3
"""
SQLAlchemy 모델 정의
데이터베이스 테이블과 매핑되는 모델들입니다.
"""

from datetime import datetime
from backend.app.extensions import db


class UserModel(db.Model):
    """사용자 모델"""
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    nickname = db.Column(db.String(50), nullable=False)
    password_hash = db.Column(db.String(255), nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 관계 설정
    hosted_parties = db.relationship('PartyModel', backref='host_user', lazy='dynamic')
    party_memberships = db.relationship('PartyMemberModel', backref='user', lazy='dynamic')

    def __repr__(self):
        return f'<User {self.employee_id}>'


class PartyModel(db.Model):
    """파티 모델"""
    __tablename__ = 'party'

    id = db.Column(db.Integer, primary_key=True)
    host_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    title = db.Column(db.String(100), nullable=False)
    restaurant_name = db.Column(db.String(100), nullable=False, index=True)
    restaurant_address = db.Column(db.String(200), nullable=True)
    party_date = db.Column(db.Date, nullable=False, index=True)
    party_time = db.Column(db.Time, nullable=False)
    meeting_location = db.Column(db.String(200), nullable=True)
    max_members = db.Column(db.Integer, nullable=False, default=4)
    description = db.Column(db.Text, nullable=True)
    is_from_match = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 관계 설정
    members = db.relationship('PartyMemberModel', backref='party', lazy='dynamic', cascade='all, delete-orphan')
    reviews = db.relationship('ReviewModel', backref='party', lazy='dynamic')

    # 인덱스
    __table_args__ = (
        db.Index('idx_party_date_time', 'party_date', 'party_time'),
        db.Index('idx_party_host_date', 'host_user_id', 'party_date'),
        db.Index('idx_party_active_date', 'is_active', 'party_date'),
    )

    def __repr__(self):
        return f'<Party {self.title}>'


class PartyMemberModel(db.Model):
    """파티 멤버 모델"""
    __tablename__ = 'party_member'

    id = db.Column(db.Integer, primary_key=True)
    party_id = db.Column(db.Integer, db.ForeignKey('party.id'), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    joined_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    is_host = db.Column(db.Boolean, default=False, nullable=False)

    # 유니크 제약조건
    __table_args__ = (
        db.UniqueConstraint('party_id', 'user_id', name='unique_party_member'),
        db.Index('idx_party_member_user_party', 'user_id', 'party_id'),
    )

    def __repr__(self):
        return f'<PartyMember party_id={self.party_id} user_id={self.user_id}>'


class RestaurantModel(db.Model):
    """식당 모델"""
    __tablename__ = 'restaurant'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, index=True)
    address = db.Column(db.String(200), nullable=True)
    phone = db.Column(db.String(20), nullable=True)
    cuisine_type = db.Column(db.String(50), nullable=True)
    rating = db.Column(db.Float, nullable=True)
    description = db.Column(db.Text, nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 관계 설정
    reviews = db.relationship('ReviewModel', backref='restaurant', lazy='dynamic')

    # 인덱스
    __table_args__ = (
        db.Index('idx_restaurant_name', 'name'),
        db.Index('idx_restaurant_rating', 'rating'),
        db.Index('idx_restaurant_cuisine', 'cuisine_type'),
    )

    def __repr__(self):
        return f'<Restaurant {self.name}>'


class ReviewModel(db.Model):
    """리뷰 모델"""
    __tablename__ = 'review'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    party_id = db.Column(db.Integer, db.ForeignKey('party.id'), nullable=True, index=True)
    restaurant_id = db.Column(db.Integer, db.ForeignKey('restaurant.id'), nullable=True, index=True)
    rating = db.Column(db.Integer, nullable=False)  # 1-5점
    comment = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 유니크 제약조건 (사용자는 같은 파티에 대해 하나의 리뷰만)
    __table_args__ = (
        db.UniqueConstraint('user_id', 'party_id', name='unique_user_party_review'),
        db.Index('idx_review_user_party', 'user_id', 'party_id'),
        db.Index('idx_review_rating', 'rating'),
    )

    def __repr__(self):
        return f'<Review {self.rating}점 by user {self.user_id}>'


class UserActivityModel(db.Model):
    """사용자 활동 모델"""
    __tablename__ = 'user_activity'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    activity_type = db.Column(db.String(50), nullable=False)  # 'party_created', 'party_joined', etc.
    activity_data = db.Column(db.JSON, nullable=True)  # 추가 활동 데이터
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # 인덱스
    __table_args__ = (
        db.Index('idx_user_activity_user_type', 'user_id', 'activity_type'),
        db.Index('idx_user_activity_created', 'created_at'),
    )

    def __repr__(self):
        return f'<UserActivity {self.activity_type} by user {self.user_id}>'


class FriendshipModel(db.Model):
    """친구 관계 모델"""
    __tablename__ = 'friendship'

    id = db.Column(db.Integer, primary_key=True)
    requester_id = db.Column(db.String(50), nullable=False, index=True)  # employee_id
    receiver_id = db.Column(db.String(50), nullable=False, index=True)  # employee_id
    status = db.Column(db.String(20), nullable=False, default='pending')  # pending, accepted, rejected
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 유니크 제약조건
    __table_args__ = (
        db.UniqueConstraint('requester_id', 'receiver_id', name='unique_friendship'),
        db.Index('idx_friendship_requester', 'requester_id'),
        db.Index('idx_friendship_receiver', 'receiver_id'),
        db.Index('idx_friendship_status', 'status'),
    )

    def __repr__(self):
        return f'<Friendship {self.requester_id} -> {self.receiver_id} ({self.status})>'


class NotificationModel(db.Model):
    """알림 모델"""
    __tablename__ = 'notification'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(50), nullable=False, index=True)  # employee_id
    type = db.Column(db.String(50), nullable=False)  # 'party_invitation', 'party_reminder', etc.
    title = db.Column(db.String(100), nullable=False)
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False, nullable=False)
    data = db.Column(db.JSON, nullable=True)  # 추가 알림 데이터
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    read_at = db.Column(db.DateTime, nullable=True)

    # 인덱스
    __table_args__ = (
        db.Index('idx_notification_user_read', 'user_id', 'is_read'),
        db.Index('idx_notification_created', 'created_at'),
        db.Index('idx_notification_type', 'type'),
    )

    def __repr__(self):
        return f'<Notification {self.type} for user {self.user_id}>'


class ChatMessageModel(db.Model):
    """채팅 메시지 모델"""
    __tablename__ = 'chat_message'

    id = db.Column(db.Integer, primary_key=True)
    chat_type = db.Column(db.String(20), nullable=False)  # 'party', 'direct'
    chat_id = db.Column(db.Integer, nullable=False, index=True)  # party_id or user_id
    sender_user_id = db.Column(db.String(50), nullable=False, index=True)  # employee_id
    sender_nickname = db.Column(db.String(50), nullable=False)  # 캐시용
    message = db.Column(db.Text, nullable=False)
    message_type = db.Column(db.String(20), default='text', nullable=False)  # text, image, file
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # 인덱스
    __table_args__ = (
        db.Index('idx_chat_message_chat_created', 'chat_type', 'chat_id', 'created_at'),
        db.Index('idx_chat_message_sender', 'sender_user_id'),
    )

    def __repr__(self):
        return f'<ChatMessage {self.chat_type}:{self.chat_id} by {self.sender_nickname}>'
