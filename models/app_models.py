"""
앱의 주요 모델들을 정의하는 파일
모델 정의 순서를 명확히 하여 외래키 참조 문제를 방지합니다.
"""

from datetime import datetime, timedelta
from extensions import db

# 🚨 중요: User 모델을 가장 먼저 import하여 'users' 테이블을 먼저 생성
from auth.models import User

class Party(db.Model):
    """파티 모델"""
    __tablename__ = 'party'
    __table_args__ = {'extend_existing': True}  # 중복 정의 문제 해결
    
    id = db.Column(db.Integer, primary_key=True)
    host_employee_id = db.Column(db.String(50), db.ForeignKey('users.employee_id'), nullable=False)
    title = db.Column(db.String(100), nullable=False)
    restaurant_name = db.Column(db.String(100), nullable=False)
    restaurant_address = db.Column(db.String(200), nullable=True)
    party_date = db.Column(db.String(20), nullable=False)
    party_time = db.Column(db.String(10), nullable=False)
    meeting_location = db.Column(db.String(200), nullable=True)
    max_members = db.Column(db.Integer, nullable=False, default=4)
    is_from_match = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        db.Index('idx_party_date', 'party_date'),
        db.Index('idx_host_employee_id', 'host_employee_id'),
        db.Index('idx_party_restaurant', 'restaurant_name'),
    )
    
    def __init__(self, host_employee_id, title, restaurant_name, restaurant_address, party_date, party_time, meeting_location, max_members, is_from_match=False):
        self.host_employee_id = host_employee_id
        self.title = title
        self.restaurant_name = restaurant_name
        self.restaurant_address = restaurant_address
        self.party_date = party_date
        self.party_time = party_time
        self.meeting_location = meeting_location
        self.max_members = max_members
        self.is_from_match = is_from_match

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
    __table_args__ = {'extend_existing': True}  # 중복 정의 문제 해결
    
    id = db.Column(db.Integer, primary_key=True)
    party_id = db.Column(db.Integer, db.ForeignKey('party.id'), nullable=False)
    employee_id = db.Column(db.String(50), db.ForeignKey('users.employee_id'), nullable=False)
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_host = db.Column(db.Boolean, default=False)
    
    __table_args__ = (
        db.Index('idx_party_member', 'party_id', 'employee_id'),
        db.Index('idx_member_party', 'employee_id', 'party_id'),
    )
    
    def __init__(self, party_id, employee_id, is_host=False):
        self.party_id = party_id
        self.employee_id = employee_id
        self.is_host = is_host

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
    type = db.Column(db.String(20), nullable=False)  # 'friend', 'group', 'dangolpot'
    party_id = db.Column(db.Integer, db.ForeignKey('party.id'), nullable=True)
    dangolpot_id = db.Column(db.Integer, db.ForeignKey('dangol_pot.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __init__(self, name, type, party_id=None, dangolpot_id=None):
        self.name = name
        self.type = type
        self.party_id = party_id
        self.dangolpot_id = dangolpot_id

class ChatParticipant(db.Model):
    """채팅 참여자 모델"""
    id = db.Column(db.Integer, primary_key=True)
    room_id = db.Column(db.Integer, db.ForeignKey('chat_room.id'), nullable=False)
    user_id = db.Column(db.String(50), nullable=False)
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __init__(self, room_id, user_id):
        self.room_id = room_id
        self.user_id = user_id

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
    chat_type = db.Column(db.String(20), nullable=False)  # 'party', 'dangolpot'
    chat_id = db.Column(db.Integer, nullable=False)  # party_id or dangolpot_id
    sender_employee_id = db.Column(db.String(50), nullable=False)
    sender_nickname = db.Column(db.String(50), nullable=False)
    message = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Notification(db.Model):
    """알림 모델"""
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

class Friendship(db.Model):
    """친구 관계 모델"""
    id = db.Column(db.Integer, primary_key=True)
    requester_id = db.Column(db.String(50), nullable=False)
    receiver_id = db.Column(db.String(50), nullable=False)
    status = db.Column(db.String(20), default='pending')  # 'pending', 'accepted'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __init__(self, requester_id, receiver_id):
        self.requester_id = requester_id
        self.receiver_id = receiver_id

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
