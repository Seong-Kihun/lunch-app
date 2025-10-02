"""
앱의 주요 모델들을 정의하는 파일
모델 정의 순서를 명확히 하여 외래키 참조 문제를 방지합니다.
"""

from datetime import datetime, timedelta
from backend.app.extensions import db

# 🚨 중요: User 모델은 지연 import를 사용하여 SQLAlchemy 충돌 방지
# from backend.auth.models import User  # 제거: SQLAlchemy 충돌 방지

class Party(db.Model):
    """파티 모델"""
    __tablename__ = 'party'

    id = db.Column(db.Integer, primary_key=True)
    host_employee_id = db.Column(db.String(50), nullable=False)  # 외래키 제약조건 제거
    title = db.Column(db.String(100), nullable=False)
    restaurant_name = db.Column(db.String(100), nullable=False)
    restaurant_address = db.Column(db.String(200), nullable=True)
    party_date = db.Column(db.Date, nullable=False)
    party_time = db.Column(db.Time, nullable=False)
    meeting_location = db.Column(db.String(200), nullable=True)
    max_members = db.Column(db.Integer, nullable=False, default=4)
    is_from_match = db.Column(db.Boolean, default=False)
    description = db.Column(db.Text, nullable=True)  # 파티 설명 필드 추가
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.Index('idx_party_date', 'party_date'),
        db.Index('idx_host_employee_id', 'host_employee_id'),
        db.Index('idx_party_restaurant', 'restaurant_name'),
    )

    # __init__ 메서드 제거 - SQLAlchemy가 자동으로 처리하도록 함

    @property
    def current_members(self):
        return PartyMember.query.filter_by(party_id=self.id).count()

    @property
    def member_ids(self):
        """파티 멤버 ID 목록 반환"""
        members = PartyMember.query.filter_by(party_id=self.id).all()
        return [member.employee_id for member in members]

    @property
    def member_ids_string(self):
        """파티 멤버 ID를 쉼표로 구분된 문자열로 반환"""
        return ','.join(self.member_ids)

class PartyMember(db.Model):
    """파티 멤버 연결 테이블"""
    __tablename__ = 'party_member'

    id = db.Column(db.Integer, primary_key=True)
    party_id = db.Column(db.Integer, db.ForeignKey('party.id'), nullable=False)
    employee_id = db.Column(db.String(50), nullable=False)  # 외래키 제약조건 제거
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_host = db.Column(db.Boolean, default=False)

    __table_args__ = (
        db.Index('idx_party_member', 'party_id', 'employee_id'),
        db.Index('idx_member_party', 'employee_id', 'party_id'),
        {'extend_existing': True},
    )

    def __init__(self, party_id, employee_id, is_host=False, joined_at=None):
        self.party_id = party_id
        self.employee_id = employee_id
        self.is_host = is_host
        if joined_at:
            self.joined_at = joined_at

class DangolPot(db.Model):
    """단골파티 모델"""
    __tablename__ = 'dangol_pot'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    tags = db.Column(db.String(200), nullable=True)
    category = db.Column(db.String(50), nullable=True)
    host_id = db.Column(db.String(50), db.ForeignKey('users.employee_id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.Index('idx_dangolpot_host', 'host_id'),
        db.Index('idx_dangolpot_category', 'category'),
    )

    def __init__(self, name, description, tags, category, host_id):
        self.name = name
        self.description = description
        self.tags = tags
        self.category = category
        self.host_id = host_id

class DangolPotMember(db.Model):
    """단골파티 멤버 연결 테이블"""
    id = db.Column(db.Integer, primary_key=True)
    dangolpot_id = db.Column(db.Integer, db.ForeignKey('dangol_pot.id'), nullable=False)
    employee_id = db.Column(db.String(50), db.ForeignKey('users.employee_id'), nullable=False)
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.Index('idx_dangolpot_member', 'dangolpot_id', 'employee_id'),
        db.Index('idx_member_dangolpot', 'employee_id', 'dangolpot_id'),
    )

    def __init__(self, dangolpot_id, employee_id):
        self.dangolpot_id = dangolpot_id
        self.employee_id = employee_id

class ChatRoom(db.Model):
    """채팅방 모델"""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=True)
    title = db.Column(db.String(100), nullable=True)  # 채팅방 제목
    type = db.Column(db.String(20), nullable=False)  # 'friend', 'group', 'dangolpot'
    party_id = db.Column(db.Integer, db.ForeignKey('party.id'), nullable=True)
    dangolpot_id = db.Column(db.Integer, db.ForeignKey('dangol_pot.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __init__(self, name=None, title=None, type=None, party_id=None, dangolpot_id=None):
        self.name = name
        self.title = title
        self.type = type
        self.party_id = party_id
        self.dangolpot_id = dangolpot_id

class ChatParticipant(db.Model):
    """채팅 참여자 모델"""
    id = db.Column(db.Integer, primary_key=True)
    chat_type = db.Column(db.String(20), nullable=False)
    chat_id = db.Column(db.Integer, db.ForeignKey('chat_room.id'), nullable=False)
    employee_id = db.Column(db.String(50), nullable=False)
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __init__(self, chat_type, chat_id, employee_id):
        self.chat_type = chat_type
        self.chat_id = chat_id
        self.employee_id = employee_id

class LunchProposal(db.Model):
    """점심 제안 모델"""
    id = db.Column(db.Integer, primary_key=True)
    proposer_id = db.Column(db.String(50), nullable=False)
    recipient_ids = db.Column(db.Text, nullable=False)
    proposed_date = db.Column(db.String(20), nullable=False)
    status = db.Column(db.String(20), default='pending')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)

    def __init__(self, proposer_id, recipient_ids, proposed_date):
        self.proposer_id = proposer_id
        self.recipient_ids = recipient_ids
        self.proposed_date = proposed_date
        self.expires_at = datetime.utcnow() + timedelta(hours=24)

class ProposalAcceptance(db.Model):
    """제안 수락 모델"""
    id = db.Column(db.Integer, primary_key=True)
    proposal_id = db.Column(db.Integer, db.ForeignKey('lunch_proposal.id'), nullable=False)
    user_id = db.Column(db.String(50), nullable=False)
    accepted_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __init__(self, proposal_id, user_id):
        self.proposal_id = proposal_id
        self.user_id = user_id

class ChatMessage(db.Model):
    """채팅 메시지 모델"""
    id = db.Column(db.Integer, primary_key=True)
    chat_type = db.Column(db.String(20), nullable=False)  # 'party', 'dangolpot', 'custom'
    chat_id = db.Column(db.Integer, nullable=False)  # party_id or dangolpot_id or custom_chat_id
    sender_employee_id = db.Column(db.String(50), nullable=False)
    sender_nickname = db.Column(db.String(50), nullable=False)
    message = db.Column(db.Text, nullable=False)
    message_type = db.Column(db.String(20), default='text')  # 'text', 'image', 'file', 'system'
    is_edited = db.Column(db.Boolean, default=False)
    edited_at = db.Column(db.DateTime, nullable=True)
    is_deleted = db.Column(db.Boolean, default=False)
    deleted_at = db.Column(db.DateTime, nullable=True)
    reply_to_message_id = db.Column(db.Integer, db.ForeignKey('chat_message.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.Index('idx_chat_message_chat', 'chat_type', 'chat_id'),
        db.Index('idx_chat_message_sender', 'sender_employee_id'),
        db.Index('idx_chat_message_created', 'created_at'),
    )

# === 채팅 관련 확장 테이블들 ===

class MessageStatus(db.Model):
    """메시지 읽음 상태 모델"""
    __tablename__ = 'message_status'

    id = db.Column(db.Integer, primary_key=True)
    message_id = db.Column(db.Integer, db.ForeignKey('chat_message.id'), nullable=False)
    user_id = db.Column(db.String(50), nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    read_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.Index('idx_message_status_message', 'message_id'),
        db.Index('idx_message_status_user', 'user_id'),
        db.UniqueConstraint('message_id', 'user_id', name='unique_message_user_status'),
    )

class MessageReaction(db.Model):
    """메시지 반응(이모지) 모델"""
    __tablename__ = 'message_reaction'

    id = db.Column(db.Integer, primary_key=True)
    message_id = db.Column(db.Integer, db.ForeignKey('chat_message.id'), nullable=False)
    user_id = db.Column(db.String(50), nullable=False)
    reaction_type = db.Column(db.String(20), nullable=False)  # 'like', 'heart', 'laugh', etc.
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.Index('idx_message_reaction_message', 'message_id'),
        db.Index('idx_message_reaction_user', 'user_id'),
        db.UniqueConstraint('message_id', 'user_id', 'reaction_type', name='unique_message_user_reaction'),
    )

class MessageAttachment(db.Model):
    """메시지 첨부파일 모델"""
    __tablename__ = 'message_attachment'

    id = db.Column(db.Integer, primary_key=True)
    message_id = db.Column(db.Integer, db.ForeignKey('chat_message.id'), nullable=False)
    file_name = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_size = db.Column(db.Integer, nullable=False)
    file_type = db.Column(db.String(50), nullable=False)
    mime_type = db.Column(db.String(100), nullable=False)
    thumbnail_path = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.Index('idx_message_attachment_message', 'message_id'),
        db.Index('idx_message_attachment_type', 'file_type'),
    )

class ChatRoomMember(db.Model):
    """채팅방 멤버 관리 모델"""
    __tablename__ = 'chat_room_member'

    id = db.Column(db.Integer, primary_key=True)
    chat_type = db.Column(db.String(20), nullable=False)  # 'party', 'dangolpot', 'custom'
    chat_id = db.Column(db.Integer, nullable=False)
    user_id = db.Column(db.String(50), nullable=False)
    role = db.Column(db.String(20), default='member')  # 'admin', 'member'
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_read_message_id = db.Column(db.Integer, db.ForeignKey('chat_message.id'), nullable=True)
    is_muted = db.Column(db.Boolean, default=False)
    is_left = db.Column(db.Boolean, default=False)
    left_at = db.Column(db.DateTime, nullable=True)

    __table_args__ = (
        db.Index('idx_chat_room_member_chat', 'chat_type', 'chat_id'),
        db.Index('idx_chat_room_member_user', 'user_id'),
        db.UniqueConstraint('chat_type', 'chat_id', 'user_id', name='unique_chat_member'),
    )

class ChatRoomSettings(db.Model):
    """채팅방 설정 모델"""
    __tablename__ = 'chat_room_settings'

    id = db.Column(db.Integer, primary_key=True)
    chat_type = db.Column(db.String(20), nullable=False)
    chat_id = db.Column(db.Integer, nullable=False)
    room_name = db.Column(db.String(100), nullable=True)
    room_description = db.Column(db.Text, nullable=True)
    room_image = db.Column(db.String(500), nullable=True)
    is_public = db.Column(db.Boolean, default=False)
    allow_member_invite = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        db.Index('idx_chat_room_settings_chat', 'chat_type', 'chat_id'),
        db.UniqueConstraint('chat_type', 'chat_id', name='unique_chat_settings'),
    )

class NotificationSettings(db.Model):
    """사용자별 알림 설정 모델"""
    __tablename__ = 'notification_settings'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(50), nullable=False)
    chat_notifications = db.Column(db.Boolean, default=True)
    message_notifications = db.Column(db.Boolean, default=True)
    mention_notifications = db.Column(db.Boolean, default=True)
    sound_enabled = db.Column(db.Boolean, default=True)
    vibration_enabled = db.Column(db.Boolean, default=True)
    quiet_hours_start = db.Column(db.Time, nullable=True)
    quiet_hours_end = db.Column(db.Time, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        db.Index('idx_notification_settings_user', 'user_id'),
        db.UniqueConstraint('user_id', name='unique_user_notification_settings'),
    )

class ChatNotification(db.Model):
    """채팅 알림 모델"""
    __tablename__ = 'chat_notification'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(50), nullable=False)
    chat_type = db.Column(db.String(20), nullable=False)
    chat_id = db.Column(db.Integer, nullable=False)
    message_id = db.Column(db.Integer, db.ForeignKey('chat_message.id'), nullable=True)
    notification_type = db.Column(db.String(50), nullable=False)  # 'new_message', 'mention', 'reaction'
    title = db.Column(db.String(100), nullable=False)
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    read_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.Index('idx_chat_notification_user', 'user_id'),
        db.Index('idx_chat_notification_chat', 'chat_type', 'chat_id'),
        db.Index('idx_chat_notification_created', 'created_at'),
    )

class MessageSearchIndex(db.Model):
    """메시지 검색 인덱스 모델"""
    __tablename__ = 'message_search_index'

    id = db.Column(db.Integer, primary_key=True)
    message_id = db.Column(db.Integer, db.ForeignKey('chat_message.id'), nullable=False)
    chat_type = db.Column(db.String(20), nullable=False)
    chat_id = db.Column(db.Integer, nullable=False)
    search_text = db.Column(db.Text, nullable=False)  # 검색용 텍스트 (한글, 영문 모두 포함)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.Index('idx_message_search_text', 'search_text'),
        db.Index('idx_message_search_chat', 'chat_type', 'chat_id'),
        db.Index('idx_message_search_created', 'created_at'),
    )

class Notification(db.Model):
    """알림 모델 (기존 유지)"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(50), nullable=False)
    type = db.Column(db.String(50), nullable=False)
    title = db.Column(db.String(100), nullable=False)
    message = db.Column(db.Text, nullable=False)
    related_id = db.Column(db.Integer, nullable=True)
    related_type = db.Column(db.String(50), nullable=True)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=True)

    def __init__(self, user_id, type, title, message, related_id=None, related_type=None, expires_at=None):
        self.user_id = user_id
        self.type = type
        self.title = title
        self.message = message
        self.related_id = related_id
        self.related_type = related_type
        self.expires_at = expires_at

class UserAnalytics(db.Model):
    """사용자 분석 모델"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(50), nullable=False)
    date = db.Column(db.Date, nullable=False)
    total_parties_joined = db.Column(db.Integer, default=0)
    total_reviews_written = db.Column(db.Integer, default=0)
    total_friends_added = db.Column(db.Integer, default=0)
    favorite_restaurant_category = db.Column(db.String(50), nullable=True)
    average_rating_given = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __init__(self, user_id, date):
        self.user_id = user_id
        self.date = date

class RestaurantAnalytics(db.Model):
    """식당 분석 모델"""
    id = db.Column(db.Integer, primary_key=True)
    restaurant_id = db.Column(db.Integer, db.ForeignKey('restaurant.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    total_visits = db.Column(db.Integer, default=0)
    total_reviews = db.Column(db.Integer, default=0)
    average_rating = db.Column(db.Float, default=0.0)
    total_likes = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __init__(self, restaurant_id, date):
        self.restaurant_id = restaurant_id
        self.date = date

class Restaurant(db.Model):
    """식당 모델"""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    address = db.Column(db.String(500), nullable=True)
    category = db.Column(db.String(100), nullable=True)
    rating = db.Column(db.Float, default=0.0)
    total_reviews = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __init__(self, name, address=None, category=None):
        self.name = name
        self.address = address
        self.category = category

class Review(db.Model):
    """리뷰 모델"""
    id = db.Column(db.Integer, primary_key=True)
    restaurant_id = db.Column(db.Integer, db.ForeignKey('restaurant.id'), nullable=False)
    user_id = db.Column(db.String(50), nullable=False)
    nickname = db.Column(db.String(50), nullable=False)
    rating = db.Column(db.Integer, nullable=False)
    comment = db.Column(db.Text, nullable=True)
    photo_url = db.Column(db.String(255), nullable=True)
    tags = db.Column(db.String(200), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __init__(self, restaurant_id, user_id, nickname, rating, comment=None, photo_url=None, tags=None):
        self.restaurant_id = restaurant_id
        self.user_id = user_id
        self.nickname = nickname
        self.rating = rating
        self.comment = comment
        self.photo_url = photo_url
        self.tags = tags

# Friendship 모델은 auth/models.py에서 정의됨 (중복 제거)

class UserActivity(db.Model):
    """사용자 활동 모델"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(50), nullable=False)
    activity_type = db.Column(db.String(50), nullable=False)
    description = db.Column(db.Text, nullable=True)
    points_earned = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __init__(self, user_id, activity_type, description=None, points_earned=0):
        self.user_id = user_id
        self.activity_type = activity_type
        self.description = description
        self.points_earned = points_earned

class RestaurantVisit(db.Model):
    """식당 방문 기록 모델"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(50), nullable=False)
    restaurant_id = db.Column(db.Integer, db.ForeignKey('restaurant.id'), nullable=False)
    visit_date = db.Column(db.Date, nullable=False)
    visit_time = db.Column(db.String(10), nullable=True)
    party_size = db.Column(db.Integer, default=1)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __init__(self, user_id, restaurant_id, visit_date, visit_time=None, party_size=1):
        self.user_id = user_id
        self.restaurant_id = restaurant_id
        self.visit_date = visit_date
        self.visit_time = visit_time
        self.party_size = party_size

class OfflineData(db.Model):
    """오프라인 데이터 저장 모델"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(50), nullable=False)
    data_type = db.Column(db.String(50), nullable=False)  # 'restaurants', 'parties', 'reviews'
    data_json = db.Column(db.Text, nullable=False)  # JSON 형태로 저장된 데이터
    last_sync = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __init__(self, user_id, data_type, data_json):
        self.user_id = user_id
        self.data_type = data_type
        self.data_json = data_json

class ChatMessageRead(db.Model):
    """채팅 메시지 읽음 상태 모델"""
    id = db.Column(db.Integer, primary_key=True)
    message_id = db.Column(db.Integer, db.ForeignKey('chat_message.id'), nullable=False)
    user_id = db.Column(db.String(50), nullable=False)
    read_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __init__(self, message_id, user_id):
        self.message_id = message_id
        self.user_id = user_id

class CategoryActivity(db.Model):
    """카테고리별 활동 기록 테이블"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(50), nullable=False)
    category = db.Column(db.String(50), nullable=False)  # 'ramen', 'pizza', 'korean' 등
    activity_type = db.Column(db.String(50), nullable=False)  # 'search', 'review', 'visit' 등
    points_earned = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __init__(self, user_id, category, activity_type, points_earned):
        self.user_id = user_id
        self.category = category
        self.activity_type = activity_type
        self.points_earned = points_earned

class Badge(db.Model):
    """배지 정보 테이블"""
    id = db.Column(db.Integer, primary_key=True)
    badge_name = db.Column(db.String(50), nullable=False)
    badge_icon = db.Column(db.String(20), nullable=False)
    badge_color = db.Column(db.String(10), nullable=True)
    requirement_type = db.Column(db.String(50), nullable=False)  # 'activity_count', 'points_threshold' 등
    requirement_count = db.Column(db.Integer, nullable=False)
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __init__(self, badge_name, badge_icon, requirement_type, requirement_count, description=None, badge_color=None):
        self.badge_name = badge_name
        self.badge_icon = badge_icon
        self.requirement_type = requirement_type
        self.requirement_count = requirement_count
        self.description = description
        self.badge_color = badge_color

class UserBadge(db.Model):
    """사용자 배지 획득 기록 테이블"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(50), nullable=False)
    badge_id = db.Column(db.Integer, db.ForeignKey('badge.id'), nullable=False)
    earned_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __init__(self, user_id, badge_id):
        self.user_id = user_id
        self.badge_id = badge_id

class VotingSession(db.Model):
    """투표 세션 모델"""
    id = db.Column(db.Integer, primary_key=True)
    chat_room_id = db.Column(db.Integer, nullable=False)
    title = db.Column(db.String(100), nullable=False)
    restaurant_name = db.Column(db.String(100), nullable=True)
    restaurant_address = db.Column(db.String(200), nullable=True)
    meeting_location = db.Column(db.String(200), nullable=True)
    meeting_time = db.Column(db.String(10), nullable=True)
    participants = db.Column(db.Text, nullable=False)  # JSON 형태로 참가자 목록
    available_dates = db.Column(db.Text, nullable=True)  # JSON 형태로 가능한 날짜 목록
    expires_at = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String(20), default="active")  # active, completed, cancelled
    created_by = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    confirmed_date = db.Column(db.String(20), nullable=True)  # 확정된 날짜
    confirmed_at = db.Column(db.DateTime, nullable=True)

    def __init__(self, chat_room_id, title, participants, created_by, expires_at, restaurant_name=None, restaurant_address=None, meeting_location=None, meeting_time=None):
        self.chat_room_id = chat_room_id
        self.title = title
        self.restaurant_name = restaurant_name
        self.restaurant_address = restaurant_address
        self.meeting_location = meeting_location
        self.meeting_time = meeting_time
        self.participants = participants
        self.created_by = created_by
        self.expires_at = expires_at

class DateVote(db.Model):
    """날짜 투표 모델"""
    id = db.Column(db.Integer, primary_key=True)
    voting_session_id = db.Column(db.Integer, db.ForeignKey("voting_session.id"), nullable=False)
    voter_id = db.Column(db.String(50), nullable=False)
    voted_date = db.Column(db.String(20), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __init__(self, voting_session_id, voter_id, voted_date):
        self.voting_session_id = voting_session_id
        self.voter_id = voter_id
        self.voted_date = voted_date

class DailyRecommendation(db.Model):
    """일별 추천 그룹 모델"""
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.String(20), nullable=False)  # YYYY-MM-DD 형식
    group_members = db.Column(db.Text, nullable=False)  # JSON 형태로 멤버 정보 저장
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __init__(self, date, group_members):
        self.date = date
        self.group_members = group_members

class RestaurantRequest(db.Model):
    """식당 신청/수정/삭제 요청 모델"""
    id = db.Column(db.Integer, primary_key=True)
    request_type = db.Column(db.String(20), nullable=False)  # 'add', 'update', 'delete'
    restaurant_name = db.Column(db.String(100), nullable=True)
    restaurant_address = db.Column(db.String(200), nullable=True)
    restaurant_id = db.Column(db.Integer, db.ForeignKey("restaurant.id"), nullable=True)  # 수정/삭제 시
    reason = db.Column(db.Text, nullable=True)  # 수정/삭제 사유
    status = db.Column(db.String(20), default="pending")  # 'pending', 'approved', 'rejected'
    requester_id = db.Column(db.String(50), nullable=False)
    requester_nickname = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    approved_at = db.Column(db.DateTime, nullable=True)
    approved_by = db.Column(db.String(50), nullable=True)
    rejection_reason = db.Column(db.Text, nullable=True)  # 거절 사유

    def __init__(self, request_type, requester_id, requester_nickname, restaurant_name=None, restaurant_address=None, restaurant_id=None, reason=None):
        self.request_type = request_type
        self.requester_id = requester_id
        self.requester_nickname = requester_nickname
        self.restaurant_name = restaurant_name
        self.restaurant_address = restaurant_address
        self.restaurant_id = restaurant_id
        self.reason = reason

class UserFavorite(db.Model):
    """사용자 즐겨찾기 모델"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(50), nullable=False)  # 사용자 ID
    restaurant_id = db.Column(db.Integer, db.ForeignKey("restaurant.id"), nullable=False)  # 식당 ID
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # 관계 설정
    restaurant = db.relationship("Restaurant", backref="favorites")

    def __init__(self, user_id, restaurant_id):
        self.user_id = user_id
        self.restaurant_id = restaurant_id

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "restaurant_id": self.restaurant_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "restaurant": self.restaurant.to_dict() if self.restaurant else None,
        }

class RestaurantFavorite(db.Model):
    """식당 즐겨찾기 모델"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(50), nullable=False)
    restaurant_id = db.Column(db.Integer, db.ForeignKey("restaurant.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __init__(self, user_id, restaurant_id):
        self.user_id = user_id
        self.restaurant_id = restaurant_id

class UserPreference(db.Model):
    """사용자 선호도 모델"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(50), nullable=False)
    food_preferences = db.Column(db.String(200), nullable=True)  # '한식,중식,양식'
    lunch_style = db.Column(db.String(200), nullable=True)  # '맛집 탐방,건강한 식사'
    max_distance = db.Column(db.Integer, default=1000)  # 최대 거리 (미터)
    budget_range = db.Column(db.String(50), nullable=True)  # '10000-15000'
    preferred_time = db.Column(db.String(20), nullable=True)  # '12:00-13:00'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __init__(self, user_id, food_preferences=None, lunch_style=None, max_distance=1000, budget_range=None, preferred_time=None):
        self.user_id = user_id
        self.food_preferences = food_preferences
        self.lunch_style = lunch_style
        self.max_distance = max_distance
        self.budget_range = budget_range
        self.preferred_time = preferred_time

class VotingOption(db.Model):
    """투표 옵션 모델"""
    id = db.Column(db.Integer, primary_key=True)
    voting_session_id = db.Column(db.Integer, db.ForeignKey("voting_session.id"), nullable=False)
    option_text = db.Column(db.String(200), nullable=False)
    option_type = db.Column(db.String(50), nullable=False)  # 'date', 'restaurant', 'time'
    votes_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __init__(self, voting_session_id, option_text, option_type):
        self.voting_session_id = voting_session_id
        self.option_text = option_text
        self.option_type = option_type

class Vote(db.Model):
    """투표 모델"""
    id = db.Column(db.Integer, primary_key=True)
    voting_session_id = db.Column(db.Integer, db.ForeignKey("voting_session.id"), nullable=False)
    voter_id = db.Column(db.String(50), nullable=False)
    option_id = db.Column(db.Integer, db.ForeignKey("voting_option.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __init__(self, voting_session_id, voter_id, option_id):
        self.voting_session_id = voting_session_id
        self.voter_id = voter_id
        self.option_id = option_id

class MatchRequest(db.Model):
    """매칭 요청 모델"""
    id = db.Column(db.Integer, primary_key=True)
    requester_id = db.Column(db.String(50), nullable=False)
    target_user_id = db.Column(db.String(50), nullable=True)  # 특정 사용자와 매칭 원할 때
    preferred_date = db.Column(db.String(20), nullable=True)  # YYYY-MM-DD 형식
    preferred_time = db.Column(db.String(10), nullable=True)  # HH:MM 형식
    max_distance = db.Column(db.Integer, default=1000)  # 최대 거리 (미터)
    status = db.Column(db.String(20), default="pending")  # 'pending', 'matched', 'cancelled'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    matched_at = db.Column(db.DateTime, nullable=True)

    def __init__(self, requester_id, preferred_date=None, preferred_time=None, max_distance=1000, target_user_id=None):
        self.requester_id = requester_id
        self.preferred_date = preferred_date
        self.preferred_time = preferred_time
        self.max_distance = max_distance
        self.target_user_id = target_user_id

class Match(db.Model):
    """매칭 결과 모델"""
    id = db.Column(db.Integer, primary_key=True)
    match_request_id = db.Column(db.Integer, db.ForeignKey("match_request.id"), nullable=False)
    user1_id = db.Column(db.String(50), nullable=False)
    user2_id = db.Column(db.String(50), nullable=False)
    matched_date = db.Column(db.String(20), nullable=True)  # YYYY-MM-DD 형식
    matched_time = db.Column(db.String(10), nullable=True)  # HH:MM 형식
    status = db.Column(db.String(20), default="active")  # 'active', 'completed', 'cancelled'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)

    def __init__(self, match_request_id, user1_id, user2_id, matched_date=None, matched_time=None):
        self.match_request_id = match_request_id
        self.user1_id = user1_id
        self.user2_id = user2_id
        self.matched_date = matched_date
        self.matched_time = matched_time

class RestaurantReviews(db.Model):
    """식당 리뷰 모델"""
    id = db.Column(db.Integer, primary_key=True)
    restaurant_id = db.Column(db.Integer, nullable=False)
    user_id = db.Column(db.String(50), nullable=False)
    rating = db.Column(db.Float, nullable=False)
    comment = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __init__(self, restaurant_id, user_id, rating, comment=None):
        self.restaurant_id = restaurant_id
        self.user_id = user_id
        self.rating = rating
        self.comment = comment

class RandomLunchGroup(db.Model):
    """랜덤런치 그룹 모델 - 프로덕션 환경용"""
    __tablename__ = 'random_lunch_group'

    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.String(10), nullable=False)  # YYYY-MM-DD 형식
    time = db.Column(db.String(10), nullable=False)  # HH:MM 형식
    restaurant_name = db.Column(db.String(100), nullable=False)
    restaurant_address = db.Column(db.String(200), nullable=True)
    max_members = db.Column(db.Integer, nullable=False, default=4)
    status = db.Column(db.String(20), default='active')  # 'active', 'completed', 'cancelled'
    created_by = db.Column(db.String(50), nullable=False)  # 그룹 생성자
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.Index('idx_random_lunch_date', 'date'),
        db.Index('idx_random_lunch_status', 'status'),
        db.Index('idx_random_lunch_created_by', 'created_by'),
    )

    def __init__(self, date, time, restaurant_name, restaurant_address=None, max_members=4, status='active', created_by=None):
        self.date = date
        self.time = time
        self.restaurant_name = restaurant_name
        self.restaurant_address = restaurant_address
        self.max_members = max_members
        self.status = status
        self.created_by = created_by

class RandomLunchMember(db.Model):
    """랜덤런치 그룹 멤버 모델 - 프로덕션 환경용"""
    __tablename__ = 'random_lunch_member'

    id = db.Column(db.Integer, primary_key=True)
    group_id = db.Column(db.Integer, db.ForeignKey('random_lunch_group.id'), nullable=False)
    employee_id = db.Column(db.String(50), nullable=False)
    role = db.Column(db.String(20), default='member')  # 'host', 'member'
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.Index('idx_random_lunch_member_group', 'group_id'),
        db.Index('idx_random_lunch_member_employee', 'employee_id'),
        db.UniqueConstraint('group_id', 'employee_id', name='uq_random_lunch_member_group_employee'),
    )

    def __init__(self, group_id, employee_id, role='member'):
        self.group_id = group_id
        self.employee_id = employee_id
        self.role = role
