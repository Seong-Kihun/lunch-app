import random
import json
from datetime import datetime, date, timedelta, time
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
from sqlalchemy import desc, or_, and_, func, text

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///site.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'your-secret-key-here'
db = SQLAlchemy(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# --- 유틸리티 함수 ---
def get_seoul_today():
    return datetime.now().date()

def get_korean_time():
    """한국 시간을 반환하는 함수"""
    korean_tz = datetime.now().replace(tzinfo=None) + timedelta(hours=9)
    return korean_tz

def format_korean_time(dt):
    """한국 시간으로 포맷팅하는 함수"""
    if dt:
        korean_time = dt + timedelta(hours=9)
        return korean_time.strftime('%Y-%m-%d %H:%M')
    return None

# --- AI/외부 API 연동 (가상 함수) ---
def geocode_address(address):
    lat = 37.4452 + (random.random() - 0.5) * 0.01
    lon = 127.1023 + (random.random() - 0.5) * 0.01
    return lat, lon

def extract_keywords_from_reviews(reviews):
    if not reviews: return []
    text = ' '.join([r.comment for r in reviews if r.comment])
    words = [w.strip() for w in text.split() if len(w.strip()) > 1]
    if not words: return []
    word_counts = {}
    for word in words: word_counts[word] = word_counts.get(word, 0) + 1
    sorted_words = sorted(word_counts.items(), key=lambda item: item[1], reverse=True)
    return [f"#{word}" for word, count in sorted_words[:3]]

# --- Helper Function ---
def reset_user_match_status_if_needed(user):
    today = get_seoul_today()
    if user.match_request_time and user.match_request_time.date() != today:
        user.matching_status = 'idle'
        user.match_request_time = None
        db.session.commit()
    return user

# --- 데이터베이스 모델 정의 ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.String(50), unique=True, nullable=False)
    nickname = db.Column(db.String(50), nullable=True)
    lunch_preference = db.Column(db.String(200), nullable=True)
    gender = db.Column(db.String(10), nullable=True)
    age_group = db.Column(db.String(20), nullable=True)
    main_dish_genre = db.Column(db.String(100), nullable=True)
    matching_status = db.Column(db.String(20), default='idle')
    match_request_time = db.Column(db.DateTime, nullable=True)
    # 사용자 선호도 필드들
    food_preferences = db.Column(db.Text, nullable=True)  # 음식 선호도
    allergies = db.Column(db.Text, nullable=True)  # 알레르기 정보
    preferred_time = db.Column(db.String(10), nullable=True)  # 선호 시간대
    frequent_areas = db.Column(db.Text, nullable=True)  # 자주 가는 지역
    notification_settings = db.Column(db.Text, nullable=True)  # 알림 설정
    def __init__(self, employee_id, nickname, lunch_preference, main_dish_genre):
        self.employee_id = employee_id
        self.nickname = nickname
        self.lunch_preference = lunch_preference
        self.main_dish_genre = main_dish_genre

class Restaurant(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    address = db.Column(db.String(200), nullable=True)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    reviews = db.relationship('Review', backref='restaurant', lazy=True, cascade="all, delete-orphan")
    
    def __init__(self, name, category, address=None, latitude=None, longitude=None):
        self.name = name
        self.category = category
        self.address = address
        self.latitude = latitude
        self.longitude = longitude
    
    @property
    def review_count(self):
        return len(self.reviews)  # type: ignore
    
    @property
    def avg_rating(self):
        if self.reviews and len(self.reviews) > 0:  # type: ignore
            return sum(r.rating for r in self.reviews) / len(self.reviews)  # type: ignore
        return 0

class Review(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    restaurant_id = db.Column(db.Integer, db.ForeignKey('restaurant.id'), nullable=False)
    user_id = db.Column(db.String(50), nullable=False)
    nickname = db.Column(db.String(50), nullable=False)
    rating = db.Column(db.Integer, nullable=False)
    comment = db.Column(db.Text, nullable=True)
    photo_url = db.Column(db.String(500), nullable=True)  # 사진 URL
    tags = db.Column(db.String(200), nullable=True)  # 태그 (맛있어요, 깔끔해요 등)
    likes = db.Column(db.Integer, default=0)  # 좋아요 수
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    def __init__(self, restaurant_id, user_id, nickname, rating, comment=None, photo_url=None, tags=None):
        self.restaurant_id = restaurant_id
        self.user_id = user_id
        self.nickname = nickname
        self.rating = rating
        self.comment = comment
        self.photo_url = photo_url
        self.tags = tags

class Party(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    host_employee_id = db.Column(db.String(50), nullable=False)
    title = db.Column(db.String(100), nullable=False)
    restaurant_name = db.Column(db.String(100), nullable=False)
    restaurant_address = db.Column(db.String(200), nullable=True)
    party_date = db.Column(db.String(20), nullable=False)
    party_time = db.Column(db.String(10), nullable=False)
    meeting_location = db.Column(db.String(200), nullable=True)
    max_members = db.Column(db.Integer, nullable=False, default=4)
    members_employee_ids = db.Column(db.Text, default='')
    is_from_match = db.Column(db.Boolean, default=False)
    def __init__(self, host_employee_id, title, restaurant_name, restaurant_address, party_date, party_time, meeting_location, max_members, members_employee_ids, is_from_match=False):
        self.host_employee_id = host_employee_id
        self.title = title
        self.restaurant_name = restaurant_name
        self.restaurant_address = restaurant_address
        self.party_date = party_date
        self.party_time = party_time
        self.meeting_location = meeting_location
        self.max_members = max_members
        self.members_employee_ids = members_employee_ids
        self.is_from_match = is_from_match

    @property
    def current_members(self):
        if not self.members_employee_ids: return 0
        return len(self.members_employee_ids.split(','))
    
    def create_chat_room(self):
        """파티 생성 시 자동으로 채팅방과 참여자들을 생성"""
        # 채팅방 생성
        chat_room = ChatRoom(
            name=self.title,
            type='group',
            party_id=self.id
        )
        db.session.add(chat_room)
        db.session.flush()  # ID를 얻기 위해 flush
        
        # 참여자들 추가
        member_ids = self.members_employee_ids.split(',') if self.members_employee_ids else []
        for member_id in member_ids:
            participant = ChatParticipant(room_id=chat_room.id, user_id=member_id)
            db.session.add(participant)

class PersonalSchedule(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.String(50), nullable=False)
    schedule_date = db.Column(db.String(10), nullable=False)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    def __init__(self, employee_id, schedule_date, title, description=None):
        self.employee_id = employee_id
        self.schedule_date = schedule_date
        self.title = title
        self.description = description

class LunchProposal(db.Model):
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
    id = db.Column(db.Integer, primary_key=True)
    proposal_id = db.Column(db.Integer, db.ForeignKey('lunch_proposal.id'), nullable=False)
    user_id = db.Column(db.String(50), nullable=False)
    accepted_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __init__(self, proposal_id, user_id):
        self.proposal_id = proposal_id
        self.user_id = user_id

class ChatMessage(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    chat_type = db.Column(db.String(20), nullable=False)  # 'party', 'dangolpot'
    chat_id = db.Column(db.Integer, nullable=False)  # party_id or dangolpot_id
    sender_employee_id = db.Column(db.String(50), nullable=False)
    sender_nickname = db.Column(db.String(50), nullable=False)
    message = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Notification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(50), nullable=False)
    type = db.Column(db.String(50), nullable=False)  # 'friend_request', 'party_invite', 'chat_message', 'review_like'
    title = db.Column(db.String(100), nullable=False)
    message = db.Column(db.Text, nullable=False)
    related_id = db.Column(db.Integer, nullable=True)  # 관련 ID (파티 ID, 채팅방 ID 등)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __init__(self, user_id, type, title, message, related_id=None):
        self.user_id = user_id
        self.type = type
        self.title = title
        self.message = message
        self.related_id = related_id

class UserAnalytics(db.Model):
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
    id = db.Column(db.Integer, primary_key=True)
    restaurant_id = db.Column(db.Integer, db.ForeignKey('restaurant.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    total_visits = db.Column(db.Integer, default=0)
    total_reviews = db.Column(db.Integer, default=0)
    average_rating = db.Column(db.Float, default=0.0)
    total_likes = db.Column(db.Integer, default=0)
    popular_tags = db.Column(db.String(500), nullable=True)  # JSON 형태로 저장
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __init__(self, restaurant_id, date):
        self.restaurant_id = restaurant_id
        self.date = date

class OfflineData(db.Model):
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

class DangolPot(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    tags = db.Column(db.String(200), nullable=True)
    category = db.Column(db.String(50), nullable=True)
    host_id = db.Column(db.String(50), nullable=False)
    members = db.Column(db.Text, default='')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    def __init__(self, name, description, tags, category, host_id, members):
        self.name = name
        self.description = description
        self.tags = tags
        self.category = category
        self.host_id = host_id
        self.members = members
    @property
    def member_count(self):
        if not self.members:
            return 0
        return len(self.members.split(','))
    
    def create_chat_room(self):
        """단골파티 생성 시 자동으로 채팅방과 참여자들을 생성"""
        # 채팅방 생성
        chat_room = ChatRoom(
            name=self.name,
            type='dangolpot',
            dangolpot_id=self.id
        )
        db.session.add(chat_room)
        db.session.flush()  # ID를 얻기 위해 flush
        
        # 참여자들 추가
        member_ids = self.members.split(',') if self.members else []
        for member_id in member_ids:
            participant = ChatParticipant(room_id=chat_room.id, user_id=member_id)
            db.session.add(participant)

# --- 새로운 모델들 ---
class Friendship(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    requester_id = db.Column(db.String(50), nullable=False)
    receiver_id = db.Column(db.String(50), nullable=False)
    status = db.Column(db.String(20), default='pending')  # 'pending', 'accepted'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __init__(self, requester_id, receiver_id):
        self.requester_id = requester_id
        self.receiver_id = receiver_id

class ChatRoom(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=True)  # 그룹 채팅방 이름
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
    id = db.Column(db.Integer, primary_key=True)
    room_id = db.Column(db.Integer, db.ForeignKey('chat_room.id'), nullable=False)
    user_id = db.Column(db.String(50), nullable=False)
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __init__(self, room_id, user_id):
        self.room_id = room_id
        self.user_id = user_id

class ChatMessageRead(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    message_id = db.Column(db.Integer, db.ForeignKey('chat_message.id'), nullable=False)
    user_id = db.Column(db.String(50), nullable=False)
    read_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __init__(self, message_id, user_id):
        self.message_id = message_id
        self.user_id = user_id

# --- 앱 실행 시 초기화 ---
@app.before_request
def create_tables_and_init_data():
    if not hasattr(app, '_db_initialized'):
        with app.app_context():
            db.create_all()
            if User.query.count() == 0:
                users_data = [
                    {'employee_id': 'KOICA001', 'nickname': '김코이카', 'lunch_preference': '조용한 식사,빠른 식사', 'main_dish_genre': '한식,분식'},
                    {'employee_id': 'KOICA002', 'nickname': '이해외', 'lunch_preference': '대화 선호,가성비 추구', 'main_dish_genre': '한식,중식'},
                    {'employee_id': 'KOICA003', 'nickname': '박봉사', 'lunch_preference': '새로운 맛집 탐방', 'main_dish_genre': '일식,양식'},
                    {'employee_id': 'KOICA004', 'nickname': '최점심', 'lunch_preference': '맛집 탐방,사진 촬영', 'main_dish_genre': '한식,양식'},
                    {'employee_id': 'KOICA005', 'nickname': '정식사', 'lunch_preference': '건강한 식사,채식 선호', 'main_dish_genre': '한식,샐러드'},
                    {'employee_id': 'KOICA006', 'nickname': '한식당', 'lunch_preference': '전통 한식,가족 분위기', 'main_dish_genre': '한식,분식'},
                    {'employee_id': 'KOICA007', 'nickname': '중국집', 'lunch_preference': '매운 음식,대량 주문', 'main_dish_genre': '중식,분식'},
                    {'employee_id': 'KOICA008', 'nickname': '일본인', 'lunch_preference': '신선한 재료,정갈한 맛', 'main_dish_genre': '일식,한식'},
                    {'employee_id': 'KOICA009', 'nickname': '양식당', 'lunch_preference': '분위기 좋은 곳,와인', 'main_dish_genre': '양식,한식'},
                    {'employee_id': 'KOICA010', 'nickname': '분식왕', 'lunch_preference': '빠른 식사,가성비', 'main_dish_genre': '분식,한식'},
                    {'employee_id': 'KOICA011', 'nickname': '카페인', 'lunch_preference': '커피와 함께,브런치', 'main_dish_genre': '양식,카페'},
                    {'employee_id': 'KOICA012', 'nickname': '맛집탐험가', 'lunch_preference': '새로운 맛집,인스타그램', 'main_dish_genre': '한식,양식,일식'},
                ]
                # User 생성 (초기 데이터)
                for user_data in users_data:
                    db.session.add(User(
                        employee_id=user_data.get('employee_id'),
                        nickname=user_data.get('nickname'),
                        lunch_preference=user_data.get('lunch_preference'),
                        main_dish_genre=user_data.get('main_dish_genre')
                    ))
            
            # Restaurant 초기 데이터 추가
            if Restaurant.query.count() == 0:
                restaurants_data = [
                    {'name': '판교역 맛집', 'category': '한식', 'address': '경기도 성남시 분당구 판교역로 146'},
                    {'name': '분당 맛집', 'category': '중식', 'address': '경기도 성남시 분당구 정자로 123'},
                    {'name': '일식당', 'category': '일식', 'address': '경기도 성남시 분당구 판교로 456'},
                    {'name': '양식점', 'category': '양식', 'address': '경기도 성남시 분당구 정자동 789'},
                    {'name': '분식점', 'category': '분식', 'address': '경기도 성남시 분당구 판교동 321'},
                ]
                # Restaurant 생성 (초기 데이터)
                for restaurant_data in restaurants_data:
                    lat, lon = geocode_address(restaurant_data['address'])
                    db.session.add(Restaurant(
                        name=restaurant_data['name'],
                        category=restaurant_data['category'],
                        address=restaurant_data['address'],
                        latitude=lat,
                        longitude=lon
                    ))
            
            # 성사된 랜덤런치 그룹 테스트 데이터 추가
            if Party.query.filter_by(is_from_match=True).count() == 0:
                test_parties = [
                    {
                        'host_employee_id': 'KOICA001',
                        'title': '랜덤 런치',
                        'restaurant_name': '판교역 맛집',
                        'restaurant_address': '경기도 성남시 분당구 판교역로 146',
                        'party_date': '2024-01-15',
                        'party_time': '12:00',
                        'meeting_location': 'KOICA 본사',
                        'max_members': 3,
                        'members_employee_ids': 'KOICA001,KOICA002,KOICA003',
                        'is_from_match': True
                    },
                    {
                        'host_employee_id': 'KOICA001',
                        'title': '랜덤 런치',
                        'restaurant_name': '분당 맛집',
                        'restaurant_address': '경기도 성남시 분당구 정자로 123',
                        'party_date': '2024-01-16',
                        'party_time': '12:30',
                        'meeting_location': 'KOICA 본사',
                        'max_members': 4,
                        'members_employee_ids': 'KOICA001,KOICA004,KOICA005,KOICA006',
                        'is_from_match': True
                    },
                    {
                        'host_employee_id': 'KOICA007',
                        'title': '랜덤 런치',
                        'restaurant_name': '일식당',
                        'restaurant_address': '경기도 성남시 분당구 판교로 456',
                        'party_date': '2024-01-17',
                        'party_time': '12:00',
                        'meeting_location': 'KOICA 본사',
                        'max_members': 2,
                        'members_employee_ids': 'KOICA007,KOICA001',
                        'is_from_match': True
                    }
                ]
                
                # 테스트 파티 생성
                for party_data in test_parties:
                    db.session.add(Party(**party_data))
            
            db.session.commit()
            setattr(app, '_db_initialized', True)

# --- API 엔드포인트 ---
@app.route('/cafeteria/today', methods=['GET'])
def get_today_menu(): return jsonify({'menu': ['제육볶음', '계란찜']})

# --- 이벤트 (약속) 통합 API ---
@app.route('/events/<employee_id>', methods=['GET'])
def get_events(employee_id):
    events = {}
    today = get_seoul_today()
    # 파티/랜덤런치 조회
    parties = Party.query.filter(Party.members_employee_ids.contains(employee_id)).all()  # type: ignore
    for p in parties:
        # 오늘 날짜 이전의 약속은 제외
        if datetime.strptime(p.party_date, '%Y-%m-%d').date() < today:
            continue
        if p.party_date not in events: events[p.party_date] = []
        member_ids = p.members_employee_ids.split(',') if p.members_employee_ids else []
        other_member_ids = [mid for mid in member_ids if mid != employee_id]
        users = User.query.filter(User.employee_id.in_(other_member_ids)).all()  # type: ignore
        member_nicknames = [user.nickname for user in users]
        all_users = User.query.filter(User.employee_id.in_(member_ids)).all()  # type: ignore
        all_member_nicknames = [user.nickname for user in all_users]
        events[p.party_date].append({
            'type': '랜덤 런치' if p.is_from_match else '파티',
            'id': p.id, 'title': p.title, 'restaurant': p.restaurant_name, 'address': p.restaurant_address,
            'date': p.party_date, 'time': p.party_time, 'location': p.meeting_location,
            'members': member_nicknames, 'all_members': all_member_nicknames
        })
    # 개인 일정 조회
    schedules = PersonalSchedule.query.filter_by(employee_id=employee_id).all()
    for s in schedules:
        if datetime.strptime(s.schedule_date, '%Y-%m-%d').date() < today:
            continue
        if s.schedule_date not in events: events[s.schedule_date] = []
        events[s.schedule_date].append({
            'type': '개인 일정', 'id': s.id, 'title': s.title, 'description': s.description, 'date': s.schedule_date
        })
    return jsonify(events)

# --- 개인 일정 API ---
@app.route('/personal_schedules', methods=['POST'])
def add_personal_schedule():
    data = request.get_json() or {}
    # PersonalSchedule 생성
    new_schedule = PersonalSchedule(
        employee_id=data.get('employee_id'),
        schedule_date=data.get('schedule_date'),
        title=data.get('title'),
        description=data.get('description', '')
    )
    db.session.add(new_schedule)
    db.session.commit()
    return jsonify({'message': '개인 일정이 추가되었습니다.', 'id': new_schedule.id}), 201

@app.route('/personal_schedules/<int:schedule_id>', methods=['PUT'])
def update_personal_schedule(schedule_id):
    schedule = PersonalSchedule.query.get(schedule_id)
    if not schedule: return jsonify({'message': '일정을 찾을 수 없습니다.'}), 404
    data = request.get_json()
    schedule.title = data.get('title', schedule.title)
    schedule.description = data.get('description', schedule.description)
    db.session.commit()
    return jsonify({'message': '일정이 수정되었습니다.'})

@app.route('/personal_schedules/<int:schedule_id>', methods=['DELETE'])
def delete_personal_schedule(schedule_id):
    schedule = PersonalSchedule.query.get(schedule_id)
    if not schedule: return jsonify({'message': '일정을 찾을 수 없습니다.'}), 404
    db.session.delete(schedule)
    db.session.commit()
    return jsonify({'message': '일정이 삭제되었습니다.'})

# --- 맛집 API ---
@app.route('/restaurants', methods=['POST'])
def add_restaurant():
    data = request.get_json()
    lat, lon = geocode_address(data['address'])
    new_restaurant = Restaurant(
        name=data['name'],
        category=data['category'],
        address=data['address'],
        latitude=lat,
        longitude=lon
    )
    db.session.add(new_restaurant)
    db.session.commit()
    return jsonify({'message': '새로운 맛집이 등록되었습니다!', 'restaurant_id': new_restaurant.id}), 201

@app.route('/restaurants', methods=['GET'])
def get_restaurants():
    query = request.args.get('query', '')
    sort_by = request.args.get('sort_by', 'name')
    category_filter = request.args.get('category', None)

    q = Restaurant.query
    if category_filter:
        q = q.filter(Restaurant.category == category_filter)  # type: ignore
    
    restaurants_q = q.filter(or_(Restaurant.name.ilike(f'%{query}%'), Restaurant.category.ilike(f'%{query}%'))).all()  # type: ignore

    if sort_by == 'rating_desc': restaurants_q.sort(key=lambda r: r.avg_rating, reverse=True)
    elif sort_by == 'reviews_desc': restaurants_q.sort(key=lambda r: r.review_count, reverse=True)
    else: restaurants_q.sort(key=lambda r: r.name)
    
    restaurants_list = [{'id': r.id, 'name': r.name, 'category': r.category, 'address': r.address, 'latitude': r.latitude, 'longitude': r.longitude, 'rating': round(r.avg_rating, 1), 'review_count': r.review_count} for r in restaurants_q]
    return jsonify(restaurants_list)

@app.route('/restaurants/<int:restaurant_id>', methods=['GET'])
def get_restaurant_detail(restaurant_id):
    restaurant = Restaurant.query.get(restaurant_id)
    if not restaurant: return jsonify({'message': '맛집을 찾을 수 없습니다.'}), 404
    keywords = extract_keywords_from_reviews(restaurant.reviews)
    return jsonify({
        'id': restaurant.id, 'name': restaurant.name, 'category': restaurant.category,
        'address': restaurant.address, 'latitude': restaurant.latitude, 'longitude': restaurant.longitude,
        'keywords': keywords
    })

@app.route('/restaurants/<int:restaurant_id>/reviews', methods=['GET'])
def get_reviews(restaurant_id):
    reviews = Review.query.filter_by(restaurant_id=restaurant_id).order_by(desc(Review.created_at)).all()
    return jsonify([{'id': r.id, 'nickname': r.nickname, 'rating': r.rating, 'comment': r.comment, 'created_at': r.created_at.strftime('%Y-%m-%d')} for r in reviews])

@app.route('/restaurants/<int:restaurant_id>/reviews', methods=['POST'])
def add_review(restaurant_id):
    data = request.get_json() or {}
    user = User.query.filter_by(employee_id=data.get('user_id')).first()
    if not user:
        return jsonify({'message': '사용자를 찾을 수 없습니다.'}), 404
    
    # Review 생성 (사진, 태그 포함)
    new_review = Review(
        restaurant_id=restaurant_id,
        user_id=data.get('user_id'),
        nickname=user.nickname,
        rating=data.get('rating'),
        comment=data.get('comment'),
        photo_url=data.get('photo_url'),
        tags=','.join(data.get('tags', [])) if data.get('tags') else None
    )
    db.session.add(new_review)
    db.session.commit()
    return jsonify({'message': '리뷰가 성공적으로 등록되었습니다.'}), 201

@app.route('/reviews/<int:review_id>/like', methods=['POST'])
def like_review(review_id):
    """리뷰 좋아요"""
    review = Review.query.get(review_id)
    if not review:
        return jsonify({'message': '리뷰를 찾을 수 없습니다.'}), 404
    
    review.likes += 1
    db.session.commit()
    
    return jsonify({'message': '좋아요가 추가되었습니다.', 'likes': review.likes})

@app.route('/reviews/tags', methods=['GET'])
def get_review_tags():
    """사용 가능한 리뷰 태그 목록"""
    tags = [
        '맛있어요', '깔끔해요', '친절해요', '분위기 좋아요',
        '가성비 좋아요', '양 많아요', '신선해요', '매운맛',
        '달콤해요', '고소해요', '담백해요', '진한맛'
    ]
    return jsonify({'tags': tags})

# --- 데이터 분석 API ---
@app.route('/analytics/user/<employee_id>', methods=['GET'])
def get_user_analytics(employee_id):
    """사용자 분석 데이터 조회"""
    try:
        # 최근 30일 데이터
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=30)
        
        analytics = UserAnalytics.query.filter(
            UserAnalytics.user_id == employee_id,  # type: ignore
            UserAnalytics.date >= start_date,  # type: ignore
            UserAnalytics.date <= end_date  # type: ignore
        ).all()
        
        # 파티 참여 통계
        parties_joined = Party.query.filter(
            Party.members_employee_ids.contains(employee_id)  # type: ignore
        ).count()
        
        # 리뷰 작성 통계
        reviews_written = Review.query.filter_by(user_id=employee_id).count()
        
        # 친구 수
        friendships = Friendship.query.filter(
            and_(
                Friendship.status == 'accepted',  # type: ignore
                or_(
                    Friendship.requester_id == employee_id,  # type: ignore
                    Friendship.receiver_id == employee_id  # type: ignore
                )
            )
        ).count()
        
        # 선호 카테고리 분석
        user_reviews = Review.query.filter_by(user_id=employee_id).all()
        category_counts = {}
        total_rating = 0
        
        for review in user_reviews:
            restaurant = Restaurant.query.get(review.restaurant_id)
            if restaurant:
                category = restaurant.category
                category_counts[category] = category_counts.get(category, 0) + 1
                total_rating += review.rating
        
        favorite_category = max(category_counts.items(), key=lambda x: x[1])[0] if category_counts else None
        avg_rating = total_rating / len(user_reviews) if user_reviews else 0
        
        return jsonify({
            'parties_joined': parties_joined,
            'reviews_written': reviews_written,
            'friends_count': friendships,
            'favorite_category': favorite_category,
            'average_rating': round(avg_rating, 1),
            'activity_trend': [a.total_parties_joined for a in analytics]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/analytics/restaurant/<int:restaurant_id>', methods=['GET'])
def get_restaurant_analytics(restaurant_id):
    """식당 분석 데이터 조회"""
    try:
        restaurant = Restaurant.query.get(restaurant_id)
        if not restaurant:
            return jsonify({'error': '식당을 찾을 수 없습니다.'}), 404
        
        # 리뷰 통계
        reviews = Review.query.filter_by(restaurant_id=restaurant_id).all()
        total_reviews = len(reviews)
        total_likes = sum(review.likes for review in reviews)
        avg_rating = sum(review.rating for review in reviews) / total_reviews if reviews else 0
        
        # 인기 태그 분석
        tag_counts = {}
        for review in reviews:
            if review.tags:
                tags = review.tags.split(',')
                for tag in tags:
                    tag = tag.strip()
                    tag_counts[tag] = tag_counts.get(tag, 0) + 1
        
        popular_tags = sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        
        # 방문 통계 (파티 참여 기준)
        visits = Party.query.filter_by(restaurant_name=restaurant.name).count()
        
        return jsonify({
            'restaurant_name': restaurant.name,
            'total_visits': visits,
            'total_reviews': total_reviews,
            'average_rating': round(avg_rating, 1),
            'total_likes': total_likes,
            'popular_tags': [{'tag': tag, 'count': count} for tag, count in popular_tags]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/analytics/trends', methods=['GET'])
def get_trends():
    """전체 트렌드 분석"""
    try:
        # 인기 식당 카테고리
        restaurants = Restaurant.query.all()
        category_stats = {}
        
        for restaurant in restaurants:
            reviews = Review.query.filter_by(restaurant_id=restaurant.id).all()
            if reviews:
                avg_rating = sum(r.rating for r in reviews) / len(reviews)
                category_stats[restaurant.category] = category_stats.get(restaurant.category, {
                    'count': 0,
                    'total_rating': 0,
                    'total_reviews': 0
                })
                category_stats[restaurant.category]['count'] += 1
                category_stats[restaurant.category]['total_rating'] += avg_rating
                category_stats[restaurant.category]['total_reviews'] += len(reviews)
        
        # 평균 평점으로 정렬
        popular_categories = sorted(
            [(cat, stats) for cat, stats in category_stats.items()],
            key=lambda x: x[1]['total_rating'] / x[1]['count'],
            reverse=True
        )[:5]
        
        # 최근 활성 사용자
        recent_users = User.query.order_by(desc(User.id)).limit(10).all()
        
        return jsonify({
            'popular_categories': [
                {
                    'category': cat,
                    'average_rating': round(stats['total_rating'] / stats['count'], 1),
                    'total_reviews': stats['total_reviews']
                }
                for cat, stats in popular_categories
            ],
            'recent_active_users': [
                {
                    'employee_id': user.employee_id,
                    'nickname': user.nickname,
                    'lunch_preference': user.lunch_preference
                }
                for user in recent_users
            ]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# --- 오프라인 데이터 API ---
@app.route('/offline/sync', methods=['POST'])
def sync_offline_data():
    """오프라인 데이터 동기화"""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        data_type = data.get('data_type')
        data_json = data.get('data_json')
        
        if not all([user_id, data_type, data_json]):
            return jsonify({'error': '필수 데이터가 누락되었습니다.'}), 400
        
        # 기존 데이터 업데이트 또는 새로 생성
        existing_data = OfflineData.query.filter_by(
            user_id=user_id,
            data_type=data_type
        ).first()
        
        if existing_data:
            existing_data.data_json = data_json
            existing_data.last_sync = datetime.utcnow()
        else:
            new_data = OfflineData(user_id, data_type, data_json)
            db.session.add(new_data)
        
        db.session.commit()
        return jsonify({'message': '오프라인 데이터가 동기화되었습니다.'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/offline/data/<employee_id>', methods=['GET'])
def get_offline_data(employee_id):
    """오프라인 데이터 조회"""
    try:
        data_types = request.args.getlist('types')  # 'restaurants', 'parties', 'reviews'
        
        if not data_types:
            return jsonify({'error': '데이터 타입을 지정해주세요.'}), 400
        
        offline_data = {}
        for data_type in data_types:
            data = OfflineData.query.filter_by(
                user_id=employee_id,
                data_type=data_type
            ).first()
            
            if data:
                offline_data[data_type] = {
                    'data': json.loads(data.data_json),
                    'last_sync': data.last_sync.strftime('%Y-%m-%d %H:%M:%S')
                }
        
        return jsonify(offline_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# --- 알림 API ---
@app.route('/notifications/<employee_id>', methods=['GET'])
def get_notifications(employee_id):
    """사용자의 알림 목록 조회"""
    notifications = Notification.query.filter_by(user_id=employee_id).order_by(desc(Notification.created_at)).all()
    return jsonify([{
        'id': n.id,
        'type': n.type,
        'title': n.title,
        'message': n.message,
        'related_id': n.related_id,
        'is_read': n.is_read,
        'created_at': n.created_at.strftime('%Y-%m-%d %H:%M')
    } for n in notifications])

@app.route('/notifications/<int:notification_id>/read', methods=['POST'])
def mark_notification_read(notification_id):
    """알림 읽음 처리"""
    notification = Notification.query.get(notification_id)
    if not notification:
        return jsonify({'message': '알림을 찾을 수 없습니다.'}), 404
    
    notification.is_read = True
    db.session.commit()
    return jsonify({'message': '알림이 읽음 처리되었습니다.'})

@app.route('/notifications/<employee_id>/read-all', methods=['POST'])
def mark_all_notifications_read(employee_id):
    """모든 알림 읽음 처리"""
    Notification.query.filter_by(user_id=employee_id, is_read=False).update({'is_read': True})
    db.session.commit()
    return jsonify({'message': '모든 알림이 읽음 처리되었습니다.'})

def create_notification(user_id, type, title, message, related_id=None):
    """알림 생성 헬퍼 함수"""
    notification = Notification(user_id, type, title, message, related_id)
    db.session.add(notification)
    db.session.commit()
    
    # 실시간 알림 전송
    socketio.emit('notification', {
        'type': type,
        'title': title,
        'message': message,
        'related_id': related_id
    }, room=user_id)  # type: ignore

# --- 단골파티 API ---
@app.route('/dangolpots', methods=['POST'])
def create_dangolpot():
    data = request.get_json() or {}
    new_pot = DangolPot(
        name=data.get('name'),
        description=data.get('description'),
        tags=data.get('tags'),
        category=data.get('category'),
        host_id=data.get('host_id'),
        members=data.get('host_id')
    )
    db.session.add(new_pot)
    db.session.flush()  # ID를 얻기 위해 flush
    
    # 채팅방 자동 생성
    new_pot.create_chat_room()
    
    db.session.commit()
    return jsonify({'message': '새로운 단골파티가 생성되었습니다!', 'pot_id': new_pot.id}), 201

@app.route('/dangolpots', methods=['GET'])
def get_all_dangolpots():
    pots = DangolPot.query.order_by(desc(DangolPot.created_at)).all()
    return jsonify([{'id': p.id, 'name': p.name, 'description': p.description, 'tags': p.tags, 'category': p.category, 'member_count': p.member_count, 'created_at': p.created_at.strftime('%Y-%m-%d')} for p in pots])

@app.route('/dangolpots/<int:pot_id>', methods=['GET'])
def get_dangolpot_detail(pot_id):
    pot = DangolPot.query.get(pot_id)
    if not pot: return jsonify({'message': '단골파티를 찾을 수 없습니다.'}), 404
    member_ids = pot.members.split(',') if pot and pot.members else []
    members_details = [{'employee_id': u.employee_id, 'nickname': u.nickname} for u in User.query.filter(User.employee_id.in_(member_ids)).all()]  # type: ignore
    pot_data = {'id': pot.id, 'name': pot.name, 'description': pot.description, 'tags': pot.tags, 'category': pot.category, 'host_id': pot.host_id, 'members': members_details}
    return jsonify(pot_data)

@app.route('/dangolpots/<int:pot_id>/join', methods=['POST'])
def join_dangolpot(pot_id):
    pot = DangolPot.query.get(pot_id)
    data = request.get_json() or {}
    employee_id = data.get('employee_id')
    if not pot: return jsonify({'message': '단골파티를 찾을 수 없습니다.'}), 404
    
    member_ids = pot.members.split(',') if pot and pot.members else []
    if employee_id and employee_id not in member_ids:
        member_ids.append(employee_id)
        pot.members = ','.join(member_ids)
        db.session.commit()
    return jsonify({'message': '단골파티에 가입했습니다.'})

@app.route('/dangolpots/<int:pot_id>', methods=['DELETE'])
def delete_dangolpot(pot_id):
    pot = DangolPot.query.get(pot_id)
    if not pot:
        return jsonify({'message': '단골파티를 찾을 수 없습니다.'}), 404
    
    employee_id = request.args.get('employee_id')
    if not employee_id:
        return jsonify({'message': '사용자 ID가 필요합니다.'}), 400
    
    if pot.host_id != employee_id:
        return jsonify({'message': '파티장만 삭제할 수 있습니다.'}), 403
    
    db.session.delete(pot)
    db.session.commit()
    return jsonify({'message': '단골파티가 삭제되었습니다.'})

@app.route('/dangolpots/<int:pot_id>', methods=['PUT'])
def update_dangolpot(pot_id):
    pot = DangolPot.query.get(pot_id)
    if not pot:
        return jsonify({'message': '단골파티를 찾을 수 없습니다.'}), 404
    
    data = request.get_json()
    employee_id = data.get('employee_id')
    
    if not employee_id:
        return jsonify({'message': '사용자 ID가 필요합니다.'}), 400
    
    if pot.host_id != employee_id:
        return jsonify({'message': '파티장만 수정할 수 있습니다.'}), 403
    
    pot.name = data.get('name', pot.name)
    pot.description = data.get('description', pot.description)
    pot.tags = data.get('tags', pot.tags)
    pot.category = data.get('category', pot.category)
    
    db.session.commit()
    return jsonify({'message': '단골파티 정보가 수정되었습니다.'})

@app.route('/my_dangolpots/<employee_id>', methods=['GET'])
def get_my_dangolpots(employee_id):
    pots = DangolPot.query.all()
    my_pots = []
    for pot in pots:
        member_ids = pot.members.split(',') if pot and pot.members else []
        if employee_id in member_ids:
            my_pots.append(pot)
    return jsonify([
        {
            'id': p.id,
            'name': p.name,
            'description': p.description,
            'tags': p.tags,
            'category': p.category,
            'member_count': p.member_count,
            'created_at': p.created_at.strftime('%Y-%m-%d')
        } for p in my_pots
    ])

# --- 파티 API ---
@app.route('/parties', methods=['GET'])
def get_all_parties():
    employee_id = request.args.get('employee_id')
    is_from_match = request.args.get('is_from_match')
    
    if employee_id and is_from_match:
        # 특정 사용자의 랜덤런치 그룹 조회
        parties = Party.query.filter(
            Party.is_from_match == True,  # type: ignore
            Party.members_employee_ids.contains(employee_id)  # type: ignore
        ).order_by(desc(Party.id)).all()
    else:
        # 일반 파티 조회 (랜덤런치 제외)
        parties = Party.query.filter_by(is_from_match=False).order_by(desc(Party.id)).all()
    
    return jsonify([{
        'id': p.id, 
        'title': p.title, 
        'restaurant_name': p.restaurant_name, 
        'current_members': p.current_members, 
        'max_members': p.max_members, 
        'party_date': p.party_date, 
        'party_time': p.party_time,
        'is_from_match': p.is_from_match
    } for p in parties])

@app.route('/parties', methods=['POST'])
def create_party():
    data = request.get_json()
    # 필수 입력값 체크
    required_fields = [
        'host_employee_id', 'title', 'restaurant_name',
        'party_date', 'party_time', 'meeting_location', 'max_members'
    ]
    for field in required_fields:
        if not data.get(field):
            return jsonify({'message': f'필수 입력값이 누락되었습니다: {field}'}), 400

    # max_members 정수 변환 및 검증
    try:
        max_members = int(data['max_members'])
        if max_members < 1:
            return jsonify({'message': '최대 인원(max_members)은 1명 이상이어야 합니다.'}), 400
    except (ValueError, TypeError):
        return jsonify({'message': '최대 인원(max_members)은 숫자여야 합니다.'}), 400

    # 레스토랑 주소 가져오기
    restaurant = Restaurant.query.filter_by(name=data.get('restaurant_name')).first()  # type: ignore
    restaurant_address = restaurant.address if restaurant else None

    # Party 생성
    new_party = Party(
        host_employee_id=data['host_employee_id'],
        title=data['title'],
        restaurant_name=data['restaurant_name'],
        restaurant_address=restaurant_address,
        party_date=data['party_date'],
        party_time=data['party_time'],
        meeting_location=data['meeting_location'],
        max_members=max_members,
        members_employee_ids=str(data['host_employee_id']),
        is_from_match=False
    )
    db.session.add(new_party)
    db.session.flush()  # ID를 얻기 위해 flush
    
    # 채팅방 자동 생성
    new_party.create_chat_room()
    
    db.session.commit()
    return jsonify({'message': '파티가 생성되었습니다.', 'party_id': new_party.id}), 201

@app.route('/parties/<int:party_id>', methods=['GET'])
def get_party(party_id):
    party = Party.query.get(party_id)
    if not party: return jsonify({'message': '파티를 찾을 수 없습니다.'}), 404
    member_ids = party.members_employee_ids.split(',') if party and party.members_employee_ids else []
    members_details = [{
        'employee_id': u.employee_id, 
        'nickname': u.nickname,
        'lunch_preference': u.lunch_preference,
        'main_dish_genre': u.main_dish_genre
    } for u in User.query.filter(User.employee_id.in_(member_ids)).all()]  # type: ignore
    party_data = {'id': party.id, 'host_employee_id': party.host_employee_id, 'title': party.title, 'restaurant_name': party.restaurant_name, 'restaurant_address': party.restaurant_address, 'party_date': party.party_date, 'party_time': party.party_time, 'meeting_location': party.meeting_location, 'max_members': party.max_members, 'current_members': party.current_members, 'members': members_details, 'is_from_match': party.is_from_match}
    return jsonify(party_data)

@app.route('/parties/<int:party_id>', methods=['PUT'])
def update_party(party_id):
    party = Party.query.get(party_id)
    data = request.get_json()
    if not party: return jsonify({'message': '파티를 찾을 수 없습니다.'}), 404
    if party.host_employee_id != data.get('employee_id'): return jsonify({'message': '파티장만 수정할 수 있습니다.'}), 403
    party.title = data.get('title', party.title)
    party.restaurant_name = data.get('restaurant_name', party.restaurant_name)
    party.party_date = data.get('party_date', party.party_date)
    party.party_time = data.get('party_time', party.party_time)
    party.meeting_location = data.get('meeting_location', party.meeting_location)
    party.max_members = data.get('max_members', party.max_members)
    db.session.commit()
    return jsonify({'message': '파티 정보가 수정되었습니다.'})

@app.route('/parties/<int:party_id>/join', methods=['POST'])
def join_party(party_id):
    party = Party.query.get(party_id)
    data = request.get_json() or {}
    employee_id = data.get('employee_id')
    if party and party.current_members >= party.max_members: return jsonify({'message': '파티 인원이 가득 찼습니다.'}), 400
    if party and employee_id and employee_id not in party.members_employee_ids.split(','):
        party.members_employee_ids += f',{employee_id}'; db.session.commit()
    return jsonify({'message': '파티에 참여했습니다.'})

@app.route('/parties/<int:party_id>/leave', methods=['POST'])
def leave_party(party_id):
    party = Party.query.get(party_id)
    if not party:
        return jsonify({'message': '파티를 찾을 수 없습니다.'}), 404
    
    data = request.get_json() or {}
    employee_id = data.get('employee_id')
    if not employee_id:
        return jsonify({'message': '사용자 ID가 필요합니다.'}), 400
    
    # 파티장은 나갈 수 없음 (파티 삭제를 사용해야 함)
    if party.host_employee_id == employee_id:
        return jsonify({'message': '파티장은 파티를 나갈 수 없습니다. 파티 삭제를 사용해주세요.'}), 400
    
    # 멤버 목록에서 제거
    if party.members_employee_ids:
        member_ids = party.members_employee_ids.split(',')
        if employee_id in member_ids:
            member_ids.remove(employee_id)
            party.members_employee_ids = ','.join(member_ids)
            db.session.commit()
            return jsonify({'message': '파티에서 나갔습니다.'})
        else:
            return jsonify({'message': '이미 파티에 참여하지 않습니다.'}), 400
    else:
        return jsonify({'message': '이미 파티에 참여하지 않습니다.'}), 400

@app.route('/my_parties/<employee_id>', methods=['GET'])
def get_my_parties(employee_id):
    # 내가 참여한 파티들 (호스트이거나 멤버인 경우)
    my_parties = Party.query.filter(
        or_(
            Party.host_employee_id == employee_id,  # type: ignore
            Party.members_employee_ids.contains(employee_id)  # type: ignore
        )
    ).all()
    
    parties_data = []
    for party in my_parties:
        member_ids = party.members_employee_ids.split(',') if party.members_employee_ids else []
        members_details = [{
            'employee_id': u.employee_id, 
            'nickname': u.nickname,
            'lunch_preference': u.lunch_preference,
            'main_dish_genre': u.main_dish_genre
        } for u in User.query.filter(User.employee_id.in_(member_ids)).all()]  # type: ignore
        
        party_data = {
            'id': party.id,
            'host_employee_id': party.host_employee_id,
            'title': party.title,
            'restaurant_name': party.restaurant_name,
            'restaurant_address': party.restaurant_address,
            'party_date': party.party_date,
            'party_time': party.party_time,
            'meeting_location': party.meeting_location,
            'max_members': party.max_members,
            'current_members': party.current_members,
            'members': members_details,
            'is_from_match': party.is_from_match
        }
        parties_data.append(party_data)
    
    return jsonify(parties_data)

@app.route('/my_regular_parties/<employee_id>', methods=['GET'])
def get_my_regular_parties(employee_id):
    # 내가 참여한 일반파티들만 (랜덤런치 제외)
    my_regular_parties = Party.query.filter(
        and_(
            Party.is_from_match == False,  # type: ignore
            or_(
                Party.host_employee_id == employee_id,  # type: ignore
                Party.members_employee_ids.contains(employee_id)  # type: ignore
            )
        )
    ).all()
    
    parties_data = []
    for party in my_regular_parties:
        member_ids = party.members_employee_ids.split(',') if party.members_employee_ids else []
        members_details = [{
            'employee_id': u.employee_id, 
            'nickname': u.nickname,
            'lunch_preference': u.lunch_preference,
            'main_dish_genre': u.main_dish_genre
        } for u in User.query.filter(User.employee_id.in_(member_ids)).all()]  # type: ignore
        
        party_data = {
            'id': party.id,
            'host_employee_id': party.host_employee_id,
            'title': party.title,
            'restaurant_name': party.restaurant_name,
            'restaurant_address': party.restaurant_address,
            'party_date': party.party_date,
            'party_time': party.party_time,
            'meeting_location': party.meeting_location,
            'max_members': party.max_members,
            'current_members': party.current_members,
            'members': members_details,
            'is_from_match': party.is_from_match
        }
        parties_data.append(party_data)
    
    return jsonify(parties_data)

@app.route('/parties/<int:party_id>', methods=['DELETE'])
def delete_party(party_id):
    party = Party.query.get(party_id)
    if not party:
        return jsonify({'message': '파티를 찾을 수 없습니다.'}), 404
    
    employee_id = request.args.get('employee_id')
    if not employee_id:
        return jsonify({'message': '사용자 ID가 필요합니다.'}), 400
    
    if party.host_employee_id != employee_id:
        return jsonify({'message': '파티장만 삭제할 수 있습니다.'}), 403
    
    db.session.delete(party)
    db.session.commit()
    return jsonify({'message': '파티가 삭제되었습니다.'})

# --- 랜덤런치, 사용자 프로필, 소통 API 등은 이전과 동일하게 유지 ---
@app.route('/match/status/<employee_id>', methods=['GET'])
def get_match_status(employee_id):
    user = User.query.filter_by(employee_id=employee_id).first()
    if not user: return jsonify({'message': '사용자를 찾을 수 없습니다.'}), 404
    user = reset_user_match_status_if_needed(user)
    response = {'status': user.matching_status}
    if user.matching_status == 'waiting':
        now = datetime.now()
        match_time = now.replace(hour=10, minute=0, second=0, microsecond=0)
        if now < match_time:
            response['countdown_target'] = match_time.isoformat()
    return jsonify(response)

@app.route('/match/request', methods=['POST'])
def request_match():
    data = request.get_json()
    employee_id = data['employee_id']
    
    user = User.query.filter_by(employee_id=employee_id).first()
    if not user: return jsonify({'message': '사용자를 찾을 수 없습니다.'}), 404
    
    now = datetime.now()
    today_10am = now.replace(hour=10, minute=0, second=0, microsecond=0)
    
    # 예약 매칭 (전일 14:00 ~ 당일 10:00)
    if now < today_10am:
        user.matching_status = 'waiting'
        user.match_request_time = now
        db.session.commit()
        return jsonify({'message': '오전 10시 매칭 대기열에 등록되었습니다.', 'status': 'waiting'})
    
    # 실시간 매칭 (당일 10:00 ~ 14:00)
    else:
        # 대기 중인 다른 사용자 찾기
        waiting_users = User.query.filter(
            User.matching_status == 'waiting',  # type: ignore
            User.employee_id != employee_id  # type: ignore
        ).all()  # type: ignore
        
        if waiting_users:
            # 스마트 매칭: 선호도 기반으로 최적의 파트너 찾기
            best_match = find_best_match(user, employee_id)
            
            if best_match:
                # 파티 생성
                new_party = Party(
                    host_employee_id=employee_id,
                    title='스마트 런치',
                    restaurant_name='스마트 매칭',
                    restaurant_address=None,
                    party_date=now.strftime('%Y-%m-%d'),
                    party_time='12:00',
                    meeting_location='KOICA 본사',
                    max_members=2,
                    members_employee_ids=f"{employee_id},{best_match.employee_id}",
                    is_from_match=True
                )
                db.session.add(new_party)
                
                # 두 사용자 모두 matched 상태로 변경
                user.matching_status = 'matched'
                best_match.matching_status = 'matched'
                db.session.commit()
                
                compatibility_score = calculate_compatibility_score(user, best_match)
                
                return jsonify({
                    'message': '스마트 매칭이 완료되었습니다!',
                    'status': 'matched',
                    'party_id': new_party.id,
                    'compatibility_score': round(compatibility_score, 2),
                    'partner': {
                        'employee_id': best_match.employee_id,
                        'nickname': best_match.nickname
                    }
                })
            else:
                # 호환성 높은 파트너가 없으면 대기
                user.matching_status = 'waiting'
                user.match_request_time = now
                db.session.commit()
                return jsonify({'message': '최적의 파트너를 기다리는 중입니다...', 'status': 'waiting'})
        else:
            # 대기 상태로 변경
            user.matching_status = 'waiting'
            user.match_request_time = now
            db.session.commit()
            return jsonify({'message': '매칭 대기 중입니다...', 'status': 'waiting'})

@app.route('/match/confirm', methods=['POST'])
def confirm_match():
    data = request.get_json()
    group_id = data['group_id']
    employee_id = data['employee_id']
    
    # 매칭 그룹 확인 및 파티 생성 로직
    # (실제 구현에서는 더 복잡한 매칭 로직이 필요)
    
    return jsonify({'message': '매칭이 확정되었습니다.', 'status': 'confirmed'})

@app.route('/match/cancel', methods=['POST'])
def cancel_match():
    data = request.get_json()
    employee_id = data['employee_id']
    
    user = User.query.filter_by(employee_id=employee_id).first()
    if not user:
        return jsonify({'message': '사용자를 찾을 수 없습니다.'}), 404
    
    if user.matching_status == 'waiting':
        user.matching_status = 'idle'
        user.match_request_time = None
        db.session.commit()
        return jsonify({'message': '매칭 대기가 취소되었습니다.', 'status': 'cancelled'})
    else:
        return jsonify({'message': '매칭 대기 상태가 아닙니다.'}), 400

@app.route('/match/reject', methods=['POST'])
def reject_match():
    data = request.get_json()
    employee_id = data['employee_id']
    
    user = User.query.filter_by(employee_id=employee_id).first()
    if user:
        user.matching_status = 'idle'
        user.match_request_time = None
        db.session.commit()
    
    return jsonify({'message': '매칭을 거절했습니다.', 'status': 'rejected'})

# --- 새로운 랜덤 런치 시스템 API ---
@app.route('/proposals/available-dates', methods=['GET'])
def get_available_dates():
    employee_id = request.args.get('employee_id')
    if not employee_id:
        return jsonify({'message': 'employee_id가 필요합니다.'}), 400
    
    today = get_seoul_today()
    available_dates = []
    
    for i in range(14):  # 오늘부터 14일 후까지
        check_date = today + timedelta(days=i)
        date_str = check_date.strftime('%Y-%m-%d')
        
        # 해당 날짜에 파티나 개인 일정이 있는지 확인
        # SQLAlchemy 쿼리 - 타입 힌팅 경고는 무시해도 됨
        party_query = Party.query.filter(
            Party.members_employee_ids.contains(employee_id),  # type: ignore
            Party.party_date == date_str  # type: ignore
        )
        has_party = party_query.first() is not None
        
        has_schedule = PersonalSchedule.query.filter_by(
            employee_id=employee_id,
            schedule_date=date_str
        ).first() is not None
        
        if not has_party and not has_schedule:
            available_dates.append(date_str)
    
    return jsonify(available_dates)

@app.route('/proposals/suggest-groups', methods=['POST'])
def suggest_groups():
    data = request.get_json() or {}
    employee_id = data.get('employee_id')
    date = data.get('date')
    
    if not employee_id or not date:
        return jsonify({'message': 'employee_id와 date가 필요합니다.'}), 400
    
    # 해당 날짜에 약속이 없는 모든 유저 찾기
    busy_users = set()
    
    # 파티에 참여하는 유저들
    parties = Party.query.filter(Party.party_date == date).all()  # type: ignore
    for party in parties:
        if party.members_employee_ids:
            busy_users.update(party.members_employee_ids.split(','))
    
    # 개인 일정이 있는 유저들
    schedules = PersonalSchedule.query.filter_by(schedule_date=date).all()
    for schedule in schedules:
        busy_users.add(schedule.employee_id)
    
    # 요청자도 제외
    busy_users.add(employee_id)
    
    # 가능한 유저들
    available_users = User.query.filter(~User.employee_id.in_(busy_users)).all()  # type: ignore
    
    if not available_users:
        return jsonify([])
    
    # 요청자 정보 가져오기
    proposer = User.query.filter_by(employee_id=employee_id).first()
    if not proposer:
        return jsonify({'message': '사용자를 찾을 수 없습니다.'}), 404
    
    # 성향 매칭 점수 계산
    user_scores = []
    for user in available_users:
        score = 0
        
        # lunch_preference 매칭
        if proposer.lunch_preference and user.lunch_preference:
            proposer_prefs = set(proposer.lunch_preference.split(','))
            user_prefs = set(user.lunch_preference.split(','))
            score += len(proposer_prefs.intersection(user_prefs))
        
        # main_dish_genre 매칭
        if proposer.main_dish_genre and user.main_dish_genre:
            proposer_genres = set(proposer.main_dish_genre.split(','))
            user_genres = set(user.main_dish_genre.split(','))
            score += len(proposer_genres.intersection(user_genres))
        
        user_scores.append((user, score))
    
    # 점수순으로 정렬
    user_scores.sort(key=lambda x: x[1], reverse=True)
    
    # 여러 그룹 생성 (최대 5개)
    groups = []
    used_users = set()
    
    for group_idx in range(min(5, len(user_scores) // 3 + 1)):
        group_users = []
        
        # 높은 점수 순으로 그룹에 추가
        for user, score in user_scores:
            if len(group_users) >= 3:
                break
            if user.employee_id not in used_users:
                group_users.append(user)
                used_users.add(user.employee_id)
        
        # 부족하면 랜덤으로 추가
        if len(group_users) < 3:
            remaining_users = [user for user, _ in user_scores if user.employee_id not in used_users]
            random.shuffle(remaining_users)
            for user in remaining_users[:3-len(group_users)]:
                group_users.append(user)
                used_users.add(user.employee_id)
        
        if group_users:
            groups.append({
                'group_id': group_idx + 1,
                'users': [{
                    'employee_id': user.employee_id,
                    'nickname': user.nickname,
                    'lunch_preference': user.lunch_preference,
                    'main_dish_genre': user.main_dish_genre,
                    'gender': user.gender,
                    'age_group': user.age_group
                } for user in group_users]
            })
    
    return jsonify(groups)

@app.route('/proposals', methods=['POST'])
def create_proposal():
    data = request.get_json() or {}
    proposer_id = data.get('proposer_id')
    recipient_ids = data.get('recipient_ids')  # 리스트 형태
    proposed_date = data.get('proposed_date')
    
    if not proposer_id or not recipient_ids or not proposed_date:
        return jsonify({'message': 'proposer_id, recipient_ids, proposed_date가 필요합니다.'}), 400
    
    # recipient_ids를 쉼표로 구분된 문자열로 변환
    recipient_ids_str = ','.join(recipient_ids)
    
    new_proposal = LunchProposal(
        proposer_id=proposer_id,
        recipient_ids=recipient_ids_str,
        proposed_date=proposed_date
    )
    
    db.session.add(new_proposal)
    db.session.commit()
    
    return jsonify({
        'id': new_proposal.id,
        'proposer_id': new_proposal.proposer_id,
        'recipient_ids': new_proposal.recipient_ids,
        'proposed_date': new_proposal.proposed_date,
        'status': new_proposal.status,
        'created_at': new_proposal.created_at.strftime('%Y-%m-%d %H:%M'),
        'expires_at': new_proposal.expires_at.strftime('%Y-%m-%d %H:%M')
    }), 201

@app.route('/proposals/mine', methods=['GET'])
def get_my_proposals():
    employee_id = request.args.get('employee_id')
    if not employee_id:
        return jsonify({'message': 'employee_id가 필요합니다.'}), 400
    
    # 내가 보낸 제안들
    sent_proposals = LunchProposal.query.filter_by(proposer_id=employee_id).order_by(desc(LunchProposal.created_at)).all()
    
    # 내가 받은 제안들
    received_proposals = LunchProposal.query.filter(
        LunchProposal.recipient_ids.contains(employee_id)  # type: ignore
    ).order_by(desc(LunchProposal.created_at)).all()
    
    def format_proposal(proposal):
        # 수락한 사람들의 닉네임 리스트
        acceptances = ProposalAcceptance.query.filter_by(proposal_id=proposal.id).all()
        accepted_user_ids = [acc.user_id for acc in acceptances]
        accepted_users = User.query.filter(User.employee_id.in_(accepted_user_ids)).all()  # type: ignore
        accepted_nicknames = [user.nickname for user in accepted_users]
        
        return {
            'id': proposal.id,
            'proposer_id': proposal.proposer_id,
            'recipient_ids': proposal.recipient_ids,
            'proposed_date': proposal.proposed_date,
            'status': proposal.status,
            'created_at': proposal.created_at.strftime('%Y-%m-%d %H:%M'),
            'expires_at': proposal.expires_at.strftime('%Y-%m-%d %H:%M'),
            'accepted_nicknames': accepted_nicknames
        }
    
    return jsonify({
        'sent_proposals': [format_proposal(p) for p in sent_proposals],
        'received_proposals': [format_proposal(p) for p in received_proposals]
    })

@app.route('/proposals/<int:proposal_id>/accept', methods=['POST'])
def accept_proposal(proposal_id):
    data = request.get_json() or {}
    user_id = data.get('user_id')
    
    if not user_id:
        return jsonify({'message': 'user_id가 필요합니다.'}), 400
    
    # 1단계: 유효성 검사
    proposal = LunchProposal.query.get(proposal_id)
    if not proposal:
        return jsonify({'message': '제안을 찾을 수 없습니다.'}), 404
    
    if proposal.status != 'pending':
        return jsonify({'message': '이미 처리된 제안입니다.'}), 400
    
    if datetime.utcnow() > proposal.expires_at:
        return jsonify({'message': '제안이 만료되었습니다.'}), 400
    
    # 요청한 user_id가 recipient_ids에 포함되는지 확인
    recipient_ids = proposal.recipient_ids.split(',') if proposal.recipient_ids else []
    if user_id not in recipient_ids:
        return jsonify({'message': '이 제안의 수신자가 아닙니다.'}), 403
    
    # 해당 유저가 이미 제안된 날짜에 다른 약속이 있는지 확인
    proposed_date = proposal.proposed_date
    
    # 파티 확인
    has_party = Party.query.filter(
        Party.members_employee_ids.contains(user_id),  # type: ignore
        Party.party_date == proposed_date  # type: ignore
    ).first() is not None
    
    # 개인 일정 확인
    has_schedule = PersonalSchedule.query.filter_by(
        employee_id=user_id,
        schedule_date=proposed_date
    ).first() is not None
    
    if has_party or has_schedule:
        return jsonify({'message': '이미 다른 약속이 있어 수락할 수 없습니다.'}), 409
    
    # 2단계: 수락 기록
    # 이미 수락했는지 확인
    existing_acceptance = ProposalAcceptance.query.filter_by(
        proposal_id=proposal_id,
        user_id=user_id
    ).first()
    
    if existing_acceptance:
        return jsonify({'message': '이미 수락한 제안입니다.'}), 400
    
    new_acceptance = ProposalAcceptance(proposal_id=proposal_id, user_id=user_id)
    db.session.add(new_acceptance)
    
    # 3단계: 성사 여부 확인
    all_members = [proposal.proposer_id] + recipient_ids
    accepted_count = ProposalAcceptance.query.filter_by(proposal_id=proposal_id).count() + 1  # +1은 현재 수락
    
    if accepted_count >= 2:
        # 4단계: 성사 프로세스
        proposal.status = 'confirmed'
        
        # 새로운 Party 생성
        new_party = Party(
            host_employee_id=proposal.proposer_id,
            title='랜덤 런치',
            restaurant_name='랜덤 매칭',
            restaurant_address=None,
            party_date=proposal.proposed_date,
            party_time='12:00',
            meeting_location='KOICA 본사',
            max_members=len(all_members),
            members_employee_ids=','.join(all_members),
            is_from_match=True
        )
        db.session.add(new_party)
        
        # 같은 날짜의 다른 pending 제안들을 cancelled로 변경
        other_pending_proposals = LunchProposal.query.filter(
            LunchProposal.status == 'pending',  # type: ignore
            LunchProposal.proposed_date == proposed_date,  # type: ignore
            LunchProposal.id != proposal_id
        ).all()
        
        for other_proposal in other_pending_proposals:
            other_members = [other_proposal.proposer_id] + other_proposal.recipient_ids.split(',')
            # 겹치는 멤버가 있는지 확인
            if any(member in all_members for member in other_members):
                other_proposal.status = 'cancelled'
        
        db.session.commit()
        return jsonify({'message': '매칭이 성사되었습니다!', 'status': 'confirmed', 'party_id': new_party.id})
    else:
        # 5단계: 단순 수락
        db.session.commit()
        return jsonify({'message': '수락이 기록되었습니다. 1명 이상 더 수락하면 매칭이 성사됩니다.', 'status': 'accepted'})

@app.route('/proposals/<int:proposal_id>/cancel', methods=['POST'])
def cancel_proposal(proposal_id):
    data = request.get_json() or {}
    user_id = data.get('user_id')
    
    if not user_id:
        return jsonify({'message': 'user_id가 필요합니다.'}), 400
    
    proposal = LunchProposal.query.get(proposal_id)
    if not proposal:
        return jsonify({'message': '제안을 찾을 수 없습니다.'}), 404
    
    if proposal.proposer_id != user_id:
        return jsonify({'message': '제안자만 취소할 수 있습니다.'}), 403
    
    if proposal.status != 'pending':
        return jsonify({'message': '이미 처리된 제안은 취소할 수 없습니다.'}), 400
    
    proposal.status = 'cancelled'
    db.session.commit()
    
    return jsonify({'message': '제안이 취소되었습니다.', 'status': 'cancelled'})

@app.route('/chats/<employee_id>', methods=['GET'])
def get_my_chats(employee_id):
    chat_list = []
    joined_parties = Party.query.filter(Party.members_employee_ids.contains(employee_id)).order_by(desc(Party.id)).all()  # type: ignore
    for party in joined_parties:
        chat_list.append({'id': party.id, 'type': 'party', 'title': party.title, 'subtitle': f"{party.restaurant_name} | {party.current_members}/{party.max_members}명", 'is_from_match': party.is_from_match})
    joined_pots = DangolPot.query.filter(DangolPot.members.contains(employee_id)).order_by(desc(DangolPot.created_at)).all()  # type: ignore
    for pot in joined_pots:
         chat_list.append({'id': pot.id, 'type': 'dangolpot', 'title': pot.name, 'subtitle': pot.tags})
    return jsonify(chat_list)

@app.route('/users/<employee_id>', methods=['GET'])
def get_user(employee_id):
    user = User.query.filter_by(employee_id=employee_id).first()
    if not user: return jsonify({'message': '사용자를 찾을 수 없습니다.'}), 404
    return jsonify({'nickname': user.nickname, 'lunch_preference': user.lunch_preference, 'gender': user.gender, 'age_group': user.age_group, 'main_dish_genre': user.main_dish_genre})

@app.route('/users/batch', methods=['POST'])
def get_users_batch():
    data = request.get_json() or {}
    user_ids = data.get('user_ids', [])
    
    if not user_ids:
        return jsonify({'message': 'user_ids가 필요합니다.'}), 400
    
    users = User.query.filter(User.employee_id.in_(user_ids)).all()  # type: ignore
    return jsonify([{
        'employee_id': user.employee_id,
        'nickname': user.nickname,
        'lunch_preference': user.lunch_preference,
        'main_dish_genre': user.main_dish_genre
    } for user in users])

@app.route('/users/<employee_id>', methods=['PUT'])
def update_user(employee_id):
    user = User.query.filter_by(employee_id=employee_id).first()
    if not user: return jsonify({'message': '사용자를 찾을 수 없습니다.'}), 404
    
    data = request.get_json()
    user.nickname = data.get('nickname', user.nickname)
    user.lunch_preference = data.get('lunch_preference', user.lunch_preference)
    user.gender = data.get('gender', user.gender)
    user.age_group = data.get('age_group', user.age_group)
    user.main_dish_genre = data.get('main_dish_genre', user.main_dish_genre)
    
    db.session.commit()
    return jsonify({'message': '프로필이 업데이트되었습니다.'})

@app.route('/users/<employee_id>/preferences', methods=['PUT'])
def update_user_preferences(employee_id):
    data = request.get_json()
    user = User.query.filter_by(employee_id=employee_id).first()
    if not user:
        return jsonify({'message': '사용자를 찾을 수 없습니다.'}), 404
    
    # 사용자 선호도 정보 업데이트
    if 'foodPreferences' in data:
        user.food_preferences = ','.join(data['foodPreferences'])
    if 'allergies' in data:
        user.allergies = ','.join(data['allergies'])
    if 'preferredTime' in data:
        user.preferred_time = data['preferredTime']
    if 'frequentAreas' in data:
        user.frequent_areas = ','.join(data['frequentAreas'])
    if 'notifications' in data:
        user.notification_settings = ','.join(data['notifications'])
    
    db.session.commit()
    return jsonify({'message': '사용자 선호도가 저장되었습니다.'})

@app.route('/users/<employee_id>/preferences', methods=['GET'])
def get_user_preferences(employee_id):
    user = User.query.filter_by(employee_id=employee_id).first()
    if not user:
        return jsonify({'message': '사용자를 찾을 수 없습니다.'}), 404
    
    preferences = {
        'foodPreferences': user.food_preferences.split(',') if user.food_preferences else [],
        'allergies': user.allergies.split(',') if user.allergies else [],
        'preferredTime': user.preferred_time or '',
        'frequentAreas': user.frequent_areas.split(',') if user.frequent_areas else [],
        'notifications': user.notification_settings.split(',') if user.notification_settings else []
    }
    
    return jsonify(preferences)

# --- 채팅 API ---
@app.route('/chat/messages/<chat_type>/<int:chat_id>', methods=['GET'])
def get_chat_messages(chat_type, chat_id):
    messages = ChatMessage.query.filter_by(chat_type=chat_type, chat_id=chat_id).order_by(ChatMessage.created_at).all()

    # 채팅방 참여자 목록 구하기
    if chat_type == 'party':
        party = Party.query.get(chat_id)
        if party and party.members_employee_ids:
            member_ids = [mid.strip() for mid in party.members_employee_ids.split(',') if mid.strip()]
        else:
            member_ids = []
    elif chat_type == 'dangolpot':
        pot = DangolPot.query.get(chat_id)
        if pot and pot.members:
            member_ids = [mid.strip() for mid in pot.members.split(',') if mid.strip()]
        else:
            member_ids = []
    elif chat_type == 'custom':
        # custom(1:1) 채팅은 ChatRoom/ChatParticipant에서 조회
        room = ChatRoom.query.filter_by(type='friend', id=chat_id).first()
        if room:
            participants = ChatParticipant.query.filter_by(room_id=room.id).all()
            member_ids = [p.user_id for p in participants]
        else:
            member_ids = []
    else:
        member_ids = []

    result = []
    for msg in messages:
        read_count = ChatMessageRead.query.filter_by(message_id=msg.id).count()
        unread_count = max(0, len(member_ids) - read_count)
        result.append({
        'id': msg.id,
        'sender_employee_id': msg.sender_employee_id,
        'sender_nickname': msg.sender_nickname,
        'message': msg.message,
            'created_at': format_korean_time(msg.created_at),
            'unread_count': unread_count
        })
    return jsonify(result)

@app.route('/chat/messages', methods=['POST'])
def send_chat_message():
    data = request.get_json()
    chat_type = data.get('chat_type')
    chat_id = data.get('chat_id')
    sender_employee_id = data.get('sender_employee_id')
    message = data.get('message')
    
    if not all([chat_type, chat_id, sender_employee_id, message]):
        return jsonify({'message': '모든 필드가 필요합니다.'}), 400
    
    # 사용자 정보 조회
    user = User.query.filter_by(employee_id=sender_employee_id).first()
    if not user:
        return jsonify({'message': '사용자를 찾을 수 없습니다.'}), 404
    
    # 메시지 저장
    new_message = ChatMessage()
    new_message.chat_type = chat_type
    new_message.chat_id = chat_id
    new_message.sender_employee_id = sender_employee_id
    new_message.sender_nickname = user.nickname
    new_message.message = message
    
    try:
        db.session.add(new_message)
        db.session.commit()
        
        return jsonify({
            'id': new_message.id,
            'sender_employee_id': sender_employee_id,
            'sender_nickname': user.nickname,
            'message': message,
            'created_at': format_korean_time(new_message.created_at)
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': '메시지 저장에 실패했습니다.'}), 500

@app.route('/chat/messages/read', methods=['POST'])
def mark_message_read():
    data = request.get_json()
    message_id = data.get('message_id')
    user_id = data.get('user_id')
    if not message_id or not user_id:
        return jsonify({'message': 'message_id와 user_id가 필요합니다.'}), 400

    # 이미 읽음 처리된 경우 중복 저장 방지
    existing = ChatMessageRead.query.filter_by(message_id=message_id, user_id=user_id).first()
    if existing:
        return jsonify({'message': '이미 읽음 처리됨.'}), 200

    read = ChatMessageRead(message_id=message_id, user_id=user_id)
    db.session.add(read)
    db.session.commit()
    return jsonify({'message': '읽음 처리 완료.'}), 201

@app.route('/chat/room/title', methods=['PUT'])
def update_chat_room_title():
    data = request.get_json()
    chat_type = data.get('chat_type')
    chat_id = data.get('chat_id')
    new_title = data.get('title')
    user_id = data.get('user_id')
    
    if not all([chat_type, chat_id, new_title, user_id]):
        return jsonify({'message': '모든 필드가 필요합니다.'}), 400
    
    try:
        if chat_type == 'party':
            party = Party.query.get(chat_id)
            if not party:
                return jsonify({'message': '파티를 찾을 수 없습니다.'}), 404
            if party.host_employee_id != user_id:
                return jsonify({'message': '파티 호스트만 제목을 변경할 수 있습니다.'}), 403
            party.title = new_title
        elif chat_type == 'dangolpot':
            pot = DangolPot.query.get(chat_id)
            if not pot:
                return jsonify({'message': '단골파티를 찾을 수 없습니다.'}), 404
            if pot.host_id != user_id:
                return jsonify({'message': '단골파티 호스트만 제목을 변경할 수 있습니다.'}), 403
            pot.name = new_title
        else:
            return jsonify({'message': '지원하지 않는 채팅 타입입니다.'}), 400
        
        db.session.commit()
        return jsonify({'message': '채팅방 제목이 변경되었습니다.', 'title': new_title}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': '제목 변경에 실패했습니다.'}), 500

@app.route('/chat/room/members/<chat_type>/<int:chat_id>', methods=['GET'])
def get_chat_room_members(chat_type, chat_id):
    try:
        if chat_type == 'party':
            party = Party.query.get(chat_id)
            if not party:
                return jsonify({'message': '파티를 찾을 수 없습니다.'}), 404
            
            # 호스트 정보
            host = User.query.filter_by(employee_id=party.host_employee_id).first()
            members = [{
                'employee_id': party.host_employee_id,
                'nickname': host.nickname if host else '알 수 없음',
                'is_host': True
            }]
            
            # 멤버 정보
            if party.members_employee_ids:
                member_ids = [mid.strip() for mid in party.members_employee_ids.split(',') if mid.strip()]
                for member_id in member_ids:
                    user = User.query.filter_by(employee_id=member_id).first()
                    if user:
                        members.append({
                            'employee_id': member_id,
                            'nickname': user.nickname,
                            'is_host': False
                        })
            
        elif chat_type == 'dangolpot':
            pot = DangolPot.query.get(chat_id)
            if not pot:
                return jsonify({'message': '단골파티를 찾을 수 없습니다.'}), 404
            
            # 호스트 정보
            host = User.query.filter_by(employee_id=pot.host_id).first()
            members = [{
                'employee_id': pot.host_id,
                'nickname': host.nickname if host else '알 수 없음',
                'is_host': True
            }]
            
            # 멤버 정보
            if pot.members:
                member_ids = [mid.strip() for mid in pot.members.split(',') if mid.strip()]
                for member_id in member_ids:
                    user = User.query.filter_by(employee_id=member_id).first()
                    if user:
                        members.append({
                            'employee_id': member_id,
                            'nickname': user.nickname,
                            'is_host': False
                        })
            
        elif chat_type == 'custom':
            # 1:1 채팅의 경우
            room = ChatRoom.query.filter_by(type='friend', id=chat_id).first()
            if not room:
                return jsonify({'message': '채팅방을 찾을 수 없습니다.'}), 404
            
            participants = ChatParticipant.query.filter_by(room_id=room.id).all()
            members = []
            for participant in participants:
                user = User.query.filter_by(employee_id=participant.user_id).first()
                if user:
                    members.append({
                        'employee_id': participant.user_id,
                        'nickname': user.nickname,
                        'is_host': False
                    })
        else:
            return jsonify({'message': '지원하지 않는 채팅 타입입니다.'}), 400
        
        return jsonify(members)
    except Exception as e:
        return jsonify({'message': '멤버 목록 조회에 실패했습니다.'}), 500

# --- WebSocket 이벤트 ---
@socketio.on('connect')
def handle_connect():
    print('Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

@socketio.on('join_chat')
def handle_join_chat(data):
    chat_type = data['chat_type']
    chat_id = data['chat_id']
    room = f"{chat_type}_{chat_id}"
    join_room(room)
    print(f'Client joined room: {room}')

@socketio.on('leave_chat')
def handle_leave_chat(data):
    chat_type = data['chat_type']
    chat_id = data['chat_id']
    room = f"{chat_type}_{chat_id}"
    leave_room(room)
    print(f'Client left room: {room}')

@socketio.on('send_message')
def handle_send_message(data):
    chat_type = data.get('chat_type')
    chat_id = data.get('chat_id')
    sender_employee_id = data.get('sender_employee_id')
    message = data.get('message')
    
    print(f'Send message event received: {data}')
    
    if not all([chat_type, chat_id, sender_employee_id, message]):
        print('Missing required fields in send_message event')
        return
    
    try:
        # 사용자 정보 조회
        user = User.query.filter_by(employee_id=sender_employee_id).first()
        if not user:
            print(f'User not found: {sender_employee_id}')
            return
        
        # 메시지 저장
        new_message = ChatMessage()
        new_message.chat_type = chat_type
        new_message.chat_id = chat_id
        new_message.sender_employee_id = sender_employee_id
        new_message.sender_nickname = user.nickname
        new_message.message = message
        db.session.add(new_message)
        db.session.commit()
        
        print(f'Message saved with ID: {new_message.id}')
        
        # 채팅방의 모든 사용자에게 메시지 전송
        room = f"{chat_type}_{chat_id}"
        message_data = {
            'id': new_message.id,
            'sender_employee_id': sender_employee_id,
            'sender_nickname': user.nickname,
            'message': message,
            'created_at': format_korean_time(new_message.created_at),
            'unread_count': 0
        }
        
        print(f'Emitting new_message to room {room}: {message_data}')
        emit('new_message', message_data, to=room)
        
    except Exception as e:
        print(f'Error in handle_send_message: {e}')
        import traceback
        traceback.print_exc()

@socketio.on('read_message')
def handle_read_message(data):
    message_id = data.get('message_id')
    user_id = data.get('user_id')
    chat_type = data.get('chat_type')
    chat_id = data.get('chat_id')
    
    print(f'Read message event received: {data}')
    
    if not message_id or not user_id or not chat_type or not chat_id:
        print('Missing required fields in read_message event')
        return
    
    try:
        # 이미 읽음 처리된 경우 중복 저장 방지
        existing = ChatMessageRead.query.filter_by(message_id=message_id, user_id=user_id).first()
        if not existing:
            read = ChatMessageRead(message_id=message_id, user_id=user_id)
            db.session.add(read)
            db.session.commit()
            print(f'Message {message_id} marked as read by {user_id}')
        
        # 채팅방 참여자 목록 구하기
        if chat_type == 'party':
            party = Party.query.get(chat_id)
            member_ids = [mid.strip() for mid in party.members_employee_ids.split(',') if mid.strip()] if party and party.members_employee_ids else []
        elif chat_type == 'dangolpot':
            pot = DangolPot.query.get(chat_id)
            member_ids = [mid.strip() for mid in pot.members.split(',') if mid.strip()] if pot and pot.members else []
        elif chat_type == 'custom':
            room = ChatRoom.query.filter_by(type='friend', id=chat_id).first()
            if room:
                participants = ChatParticipant.query.filter_by(room_id=room.id).all()
                member_ids = [p.user_id for p in participants]
            else:
                member_ids = []
        else:
            member_ids = []
        
        read_count = ChatMessageRead.query.filter_by(message_id=message_id).count()
        unread_count = max(0, len(member_ids) - read_count)
        
        room_name = f"{chat_type}_{chat_id}"
        print(f'Emitting message_read to room {room_name}: message_id={message_id}, unread_count={unread_count}')
        
        socketio.emit('message_read', {
            'message_id': message_id,
            'user_id': user_id,
            'unread_count': unread_count
        }, to=room_name)
        
    except Exception as e:
        print(f'Error in handle_read_message: {e}')
        import traceback
        traceback.print_exc()

# --- 친구 API ---
@app.route('/users/search', methods=['GET'])
def search_users():
    nickname = request.args.get('nickname')
    if not nickname:
        return jsonify({'message': '닉네임 파라미터가 필요합니다.'}), 400
    
    users = User.query.filter(User.nickname.contains(nickname)).all()  # type: ignore
    return jsonify([{
        'employee_id': user.employee_id,
        'nickname': user.nickname,
        'lunch_preference': user.lunch_preference,
        'main_dish_genre': user.main_dish_genre
    } for user in users])

@app.route('/friends/request', methods=['POST'])
def send_friend_request():
    data = request.get_json()
    requester_id = data.get('requester_id')
    receiver_id = data.get('receiver_id')
    
    if not requester_id or not receiver_id:
        return jsonify({'message': '요청자와 수신자 ID가 필요합니다.'}), 400
    
    if requester_id == receiver_id:
        return jsonify({'message': '자기 자신에게 친구 요청을 보낼 수 없습니다.'}), 400
    
    # 이미 친구 요청이 있는지 확인
    existing_request = Friendship.query.filter(
        or_(
            and_(Friendship.requester_id == requester_id, Friendship.receiver_id == receiver_id),  # type: ignore
            and_(Friendship.requester_id == receiver_id, Friendship.receiver_id == requester_id)  # type: ignore
        )
    ).first()
    
    if existing_request:
        if existing_request.status == 'accepted':
            return jsonify({'message': '이미 친구입니다.'}), 400
        elif existing_request.status == 'pending':
            return jsonify({'message': '이미 친구 요청이 대기 중입니다.'}), 400
    
    new_request = Friendship(requester_id=requester_id, receiver_id=receiver_id)
    db.session.add(new_request)
    db.session.commit()
    
    # 알림 생성
    requester = User.query.filter_by(employee_id=requester_id).first()
    if requester:
        create_notification(
            receiver_id,
            'friend_request',
            '새로운 친구 요청',
            f'{requester.nickname}님이 친구 요청을 보냈습니다.',
            new_request.id
        )
    
    return jsonify({'message': '친구 요청을 보냈습니다.'}), 201

@app.route('/friends/accept', methods=['POST'])
def accept_friend_request():
    data = request.get_json()
    requester_id = data.get('requester_id')
    receiver_id = data.get('receiver_id')
    
    if not requester_id or not receiver_id:
        return jsonify({'message': '요청자와 수신자 ID가 필요합니다.'}), 400
    
    friendship = Friendship.query.filter_by(
        requester_id=requester_id,
        receiver_id=receiver_id,
        status='pending'
    ).first()
    
    if not friendship:
        return jsonify({'message': '친구 요청을 찾을 수 없습니다.'}), 404
    
    friendship.status = 'accepted'
    db.session.commit()
    
    return jsonify({'message': '친구 요청을 수락했습니다.'})

@app.route('/friends/requests', methods=['GET'])
def get_friend_requests():
    employee_id = request.args.get('employee_id')
    if not employee_id:
        return jsonify({'message': '사용자 ID가 필요합니다.'}), 400
    
    requests = Friendship.query.filter_by(
        receiver_id=employee_id,
        status='pending'
    ).all()
    
    request_data = []
    for req in requests:
        requester = User.query.filter_by(employee_id=req.requester_id).first()
        if requester:
            request_data.append({
                'id': req.id,
                'requester_id': req.requester_id,
                'requester_nickname': requester.nickname,
                'created_at': req.created_at.strftime('%Y-%m-%d %H:%M')
            })
    
    return jsonify(request_data)

@app.route('/friends', methods=['GET'])
def get_friends():
    employee_id = request.args.get('employee_id')
    if not employee_id:
        return jsonify({'message': '사용자 ID가 필요합니다.'}), 400
    
    friendships = Friendship.query.filter(
        and_(
            Friendship.status == 'accepted',  # type: ignore
            or_(
                Friendship.requester_id == employee_id,  # type: ignore
                Friendship.receiver_id == employee_id  # type: ignore
            )
        )
    ).all()
    
    friends_data = []
    for friendship in friendships:
        # 친구의 ID 결정
        friend_id = friendship.receiver_id if friendship.requester_id == employee_id else friendship.requester_id
        friend = User.query.filter_by(employee_id=friend_id).first()
        
        if friend:
            friends_data.append({
                'employee_id': friend.employee_id,
                'nickname': friend.nickname,
                'lunch_preference': friend.lunch_preference,
                'main_dish_genre': friend.main_dish_genre
            })
    
    return jsonify(friends_data)

# --- 새로운 채팅 API ---
@app.route('/chats/friends', methods=['POST'])
def create_friend_chat():
    data = request.get_json()
    user_ids = data.get('user_ids', [])
    
    if len(user_ids) < 2:
        return jsonify({'message': '최소 2명의 사용자가 필요합니다.'}), 400
    
    # 기존 친구 채팅방이 있는지 확인
    existing_room = None
    for room in ChatRoom.query.filter_by(type='friend').all():
        participants = ChatParticipant.query.filter_by(room_id=room.id).all()
        participant_ids = [p.user_id for p in participants]
        
        if set(user_ids) == set(participant_ids):
            existing_room = room
            break
    
    if existing_room:
        return jsonify({
            'message': '이미 존재하는 채팅방입니다.',
            'room_id': existing_room.id
        }), 200
    
    # 새 채팅방 생성
    chat_room = ChatRoom(
        name=None,  # 1:1 채팅은 이름 없음
        type='friend'
    )
    db.session.add(chat_room)
    db.session.flush()
    
    # 참여자들 추가
    for user_id in user_ids:
        participant = ChatParticipant(room_id=chat_room.id, user_id=user_id)
        db.session.add(participant)
    
    db.session.commit()
    
    return jsonify({
        'message': '친구 채팅방이 생성되었습니다.',
        'room_id': chat_room.id
    }), 201

@app.route('/chats/filtered', methods=['GET'])
def get_filtered_chats():
    employee_id = request.args.get('employee_id')
    chat_type = request.args.get('type')  # 'friend', 'group', 'dangolpot' 또는 None
    
    if not employee_id:
        return jsonify({'message': '사용자 ID가 필요합니다.'}), 400
    
    # 사용자가 참여한 채팅방들 조회
    user_participants = ChatParticipant.query.filter_by(user_id=employee_id).all()
    room_ids = [p.room_id for p in user_participants]
    
    # 채팅방 정보 조회
    if chat_type:
        rooms = ChatRoom.query.filter(
            ChatRoom.id.in_(room_ids),  # type: ignore
            ChatRoom.type == chat_type  # type: ignore
        ).all()
    else:
        rooms = ChatRoom.query.filter(ChatRoom.id.in_(room_ids)).all()  # type: ignore
    
    chats_data = []
    for room in rooms:
        # 참여자 정보 가져오기
        participants = ChatParticipant.query.filter_by(room_id=room.id).all()
        participant_users = []
        
        for participant in participants:
            user = User.query.filter_by(employee_id=participant.user_id).first()
            if user:
                participant_users.append({
                    'employee_id': user.employee_id,
                    'nickname': user.nickname
                })
        
        # 마지막 메시지 가져오기
        last_message = ChatMessage.query.filter_by(
            chat_type=room.type,
            chat_id=room.id
        ).order_by(desc(ChatMessage.created_at)).first()
        
        chat_data = {
            'id': room.id,
            'name': room.name or f"{len(participant_users)}명의 채팅방",
            'type': room.type,
            'participants': participant_users,
            'last_message': {
                'sender_nickname': last_message.sender_nickname,
                'message': last_message.message,
                'created_at': last_message.created_at.strftime('%Y-%m-%d %H:%M')
            } if last_message else None
        }
        
        chats_data.append(chat_data)
    
    return jsonify(chats_data)

# --- 지능형 약속 잡기 API ---
@app.route('/chats/<int:room_id>/suggest-dates', methods=['POST'])
def suggest_dates(room_id):
    # 채팅방 정보 조회
    chat_room = ChatRoom.query.get(room_id)
    if not chat_room:
        return jsonify({'message': '채팅방을 찾을 수 없습니다.'}), 404
    
    # 채팅방 참여자들 조회
    participants = ChatParticipant.query.filter_by(room_id=room_id).all()
    participant_ids = [p.user_id for p in participants]
    
    if len(participant_ids) < 2:
        return jsonify({'message': '최소 2명의 참여자가 필요합니다.'}), 400
    
    today = get_seoul_today()
    available_dates = []
    best_alternative = {'date': None, 'available_count': 0, 'total_count': len(participant_ids)}
    
    # 오늘부터 14일 후까지 검사
    for i in range(14):
        check_date = today + timedelta(days=i)
        date_str = check_date.strftime('%Y-%m-%d')
        
        # 각 참여자의 해당 날짜 약속 확인
        available_participants = []
        unavailable_participants = []
        
        for participant_id in participant_ids:
            # 파티 약속 확인
            has_party = Party.query.filter(
                Party.members_employee_ids.contains(participant_id),  # type: ignore
                Party.party_date == date_str  # type: ignore
            ).first() is not None
            
            # 개인 일정 확인
            has_schedule = PersonalSchedule.query.filter_by(
                employee_id=participant_id,
                schedule_date=date_str
            ).first() is not None
            
            if not has_party and not has_schedule:
                available_participants.append(participant_id)
            else:
                unavailable_participants.append(participant_id)
        
        # 모든 참여자가 가능한 경우
        if len(available_participants) == len(participant_ids):
            available_dates.append({
                'date': date_str,
                'available_participants': available_participants,
                'unavailable_participants': unavailable_participants
            })
            
            # 최대 3개까지만 반환
            if len(available_dates) >= 3:
                break
        else:
            # 대안으로 가장 많은 인원이 가능한 날짜 기록
            if len(available_participants) > best_alternative['available_count']:
                best_alternative = {
                    'date': date_str,
                    'available_count': len(available_participants),
                    'available_participants': available_participants,
                    'unavailable_participants': unavailable_participants,
                    'total_count': len(participant_ids)
                }
    
    # 결과 반환
    if available_dates:
        return jsonify({
            'message': '공통 가능 날짜를 찾았습니다.',
            'type': 'common',
            'dates': available_dates
        })
    else:
        return jsonify({
            'message': '공통 가능 날짜가 없습니다. 대안을 제시합니다.',
            'type': 'alternative',
            'best_alternative': best_alternative
        })

# --- AI 제목 제안 API ---
@app.route('/ai/suggest-party-titles', methods=['POST'])
def suggest_party_titles():
    try:
        data = request.get_json()
        restaurant = data.get('restaurant', '')
        date = data.get('date', '')
        time = data.get('time', '')
        location = data.get('location', '')
        
        # 간단한 제목 제안 로직
        suggestions = []
        
        if restaurant:
            suggestions.append(f"🍽️ {restaurant} 점심 모임")
            suggestions.append(f"🥘 {restaurant}에서 함께 밥먹기")
            suggestions.append(f"👥 {restaurant} 런치타임")
        
        if date:
            date_obj = datetime.strptime(date, '%Y-%m-%d')
            day_name = ['월', '화', '수', '목', '금', '토', '일'][date_obj.weekday()]
            suggestions.append(f"📅 {day_name}요일 점심 모임")
            suggestions.append(f"🎉 {date} 점심 파티")
        
        if location:
            suggestions.append(f"📍 {location} 점심 모임")
        
        # 기본 제안들
        suggestions.extend([
            "🍕 맛있는 점심 시간",
            "🥗 건강한 점심 모임",
            "🍜 따뜻한 점심 타임",
            "🍖 고기 맛집 탐방",
            "🍱 도시락 친구들"
        ])
        
        # 중복 제거 및 최대 5개 반환
        unique_suggestions = list(dict.fromkeys(suggestions))[:5]
        
        return jsonify({
            'suggestions': unique_suggestions,
            'message': '제목 제안을 생성했습니다.'
        })
        
    except Exception as e:
        return jsonify({
            'message': f'제목 제안 생성 중 오류가 발생했습니다: {str(e)}'
        }), 500

# --- 위치 기반 서비스 ---
@app.route('/restaurants/nearby', methods=['GET'])
def get_nearby_restaurants():
    """현재 위치 기반 근처 식당 추천"""
    latitude = request.args.get('latitude', type=float)
    longitude = request.args.get('longitude', type=float)
    radius = request.args.get('radius', 1000, type=int)  # 기본 1km
    
    if not latitude or not longitude:
        return jsonify({'message': '위치 정보가 필요합니다.'}), 400
    
    # 간단한 거리 계산 (실제로는 Haversine 공식 사용)
    restaurants = Restaurant.query.filter(
        Restaurant.latitude.isnot(None),  # type: ignore
        Restaurant.longitude.isnot(None)  # type: ignore
    ).all()
    
    nearby_restaurants = []
    for restaurant in restaurants:
        # 간단한 유클리드 거리 계산 (실제로는 Haversine 공식 사용)
        distance = ((restaurant.latitude - latitude) ** 2 + 
                   (restaurant.longitude - longitude) ** 2) ** 0.5 * 111000  # 대략적인 km 변환
        
        if distance <= radius:
            nearby_restaurants.append({
                'id': restaurant.id,
                'name': restaurant.name,
                'category': restaurant.category,
                'address': restaurant.address,
                'distance': round(distance, 1),
                'avg_rating': restaurant.avg_rating,
                'review_count': restaurant.review_count
            })
    
    # 거리순으로 정렬
    nearby_restaurants.sort(key=lambda x: x['distance'])
    
    return jsonify({
        'restaurants': nearby_restaurants[:10],  # 최대 10개
        'user_location': {'latitude': latitude, 'longitude': longitude}
    })

@app.route('/users/nearby', methods=['GET'])
def get_nearby_users():
    """근처 사용자 찾기 (같은 건물/지역)"""
    employee_id = request.args.get('employee_id')
    building = request.args.get('building', 'KOICA 본사')  # 기본값
    
    if not employee_id:
        return jsonify({'message': '사용자 ID가 필요합니다.'}), 400
    
    # 같은 건물의 다른 사용자들 찾기
    nearby_users = User.query.filter(
        User.employee_id != employee_id  # type: ignore
    ).limit(20).all()
    
    # 실제로는 위치 기반 필터링이 필요
    users_data = []
    for user in nearby_users:
        users_data.append({
            'employee_id': user.employee_id,
            'nickname': user.nickname,
            'lunch_preference': user.lunch_preference,
            'main_dish_genre': user.main_dish_genre,
            'building': building
        })
    
    return jsonify({
        'nearby_users': users_data,
        'building': building
    })

# --- 식당 추천 API ---
@app.route('/restaurants/recommend', methods=['GET'])
def recommend_restaurants():
    employee_id = request.args.get('employee_id')
    if not employee_id:
        return jsonify({'message': '사용자 ID가 필요합니다.'}), 400
    
    user = User.query.filter_by(employee_id=employee_id).first()
    if not user:
        return jsonify({'message': '사용자를 찾을 수 없습니다.'}), 404
    
    # 사용자 선호도 기반 추천
    user_preferences = []
    if user.food_preferences:
        user_preferences = user.food_preferences.split(',')
    
            # 기본 추천 (사용자 선호도가 없으면 인기 식당)
        if user_preferences:
            recommended_restaurants = Restaurant.query.filter(
                Restaurant.category.in_(user_preferences)  # type: ignore
            ).limit(10).all()
        else:
            # 평점 높은 식당 추천
            recommended_restaurants = Restaurant.query.order_by(
                Restaurant.avg_rating.desc()  # type: ignore
            ).limit(10).all()
    
    # 친구들이 좋아하는 식당 추천
    friends = get_user_friends(employee_id)
    friend_favorites = []
    if friends:
        for friend in friends:
            friend_user = User.query.filter_by(employee_id=friend['employee_id']).first()
            if friend_user and friend_user.main_dish_genre:
                friend_favorites.append(friend_user.main_dish_genre)
    
    friend_recommendations = []
    if friend_favorites:
        friend_recommendations = Restaurant.query.filter(
            Restaurant.category.in_(friend_favorites)  # type: ignore
        ).limit(5).all()
    
    return jsonify({
        'personal_recommendations': [{
            'id': restaurant.id,
            'name': restaurant.name,
            'category': restaurant.category,
            'address': restaurant.address,
            'avg_rating': restaurant.avg_rating,
            'review_count': restaurant.review_count
        } for restaurant in recommended_restaurants],
        'friend_recommendations': [{
            'id': restaurant.id,
            'name': restaurant.name,
            'category': restaurant.category,
            'address': restaurant.address,
            'avg_rating': restaurant.avg_rating,
            'review_count': restaurant.review_count
        } for restaurant in friend_recommendations]
    })

def get_user_friends(employee_id):
    """사용자의 친구 목록을 반환하는 헬퍼 함수"""
    friendships = Friendship.query.filter(
        and_(
            Friendship.status == 'accepted',  # type: ignore
            or_(
                Friendship.requester_id == employee_id,  # type: ignore
                Friendship.receiver_id == employee_id  # type: ignore
            )
        )
    ).all()
    
    friends = []
    for friendship in friendships:
        friend_id = friendship.receiver_id if friendship.requester_id == employee_id else friendship.requester_id
        friend = User.query.filter_by(employee_id=friend_id).first()
        if friend:
            friends.append({
                'employee_id': friend.employee_id,
                'nickname': friend.nickname
            })
    
    return friends

# --- 그룹 최적화 기능 ---
@app.route('/groups/aa-calculator', methods=['POST'])
def calculate_aa():
    """그룹 AA 계산기"""
    data = request.get_json()
    expenses = data.get('expenses', [])  # [{'user_id': 'id', 'amount': 1000}, ...]
    
    if not expenses:
        return jsonify({'message': '지출 정보가 필요합니다.'}), 400
    
    total_amount = sum(expense['amount'] for expense in expenses)
    average_amount = total_amount / len(expenses)
    
    # 각 사용자별 정산 금액 계산
    settlements = []
    for expense in expenses:
        user_id = expense['user_id']
        amount = expense['amount']
        difference = amount - average_amount
        
        settlements.append({
            'user_id': user_id,
            'paid_amount': amount,
            'should_pay': average_amount,
            'difference': difference,
            'status': 'receive' if difference > 0 else 'pay' if difference < 0 else 'settled'
        })
    
    return jsonify({
        'total_amount': total_amount,
        'average_amount': average_amount,
        'participant_count': len(expenses),
        'settlements': settlements
    })

@app.route('/groups/vote', methods=['POST'])
def create_vote():
    """그룹 투표 생성"""
    data = request.get_json()
    group_id = data.get('group_id')
    title = data.get('title')
    options = data.get('options', [])
    end_time = data.get('end_time')
    
    if not all([group_id, title, options]):
        return jsonify({'message': '필수 정보가 누락되었습니다.'}), 400
    
    # 실제로는 Vote 모델을 만들어야 함
    vote_data = {
        'id': len(votes) + 1,
        'group_id': group_id,
        'title': title,
        'options': options,
        'votes': {},
        'end_time': end_time,
        'created_at': datetime.utcnow().isoformat()
    }
    
    votes.append(vote_data)
    
    return jsonify({
        'message': '투표가 생성되었습니다.',
        'vote_id': vote_data['id']
    })

@app.route('/groups/vote/<int:vote_id>/vote', methods=['POST'])
def submit_vote():
    """투표 제출"""
    data = request.get_json()
    vote_id = data.get('vote_id')
    user_id = data.get('user_id')
    option = data.get('option')
    
    if not all([vote_id, user_id, option]):
        return jsonify({'message': '필수 정보가 누락되었습니다.'}), 400
    
    # 실제로는 데이터베이스에서 투표 정보를 가져와야 함
    vote = next((v for v in votes if v['id'] == vote_id), None)
    if not vote:
        return jsonify({'message': '투표를 찾을 수 없습니다.'}), 404
    
    if user_id in vote['votes']:
        return jsonify({'message': '이미 투표하셨습니다.'}), 400
    
    vote['votes'][user_id] = option
    
    return jsonify({'message': '투표가 제출되었습니다.'})

# 임시 투표 데이터 (실제로는 데이터베이스 사용)
votes = []

def find_best_match(user, employee_id):
    """선호도 기반으로 최적의 매칭 파트너를 찾습니다."""
    waiting_users = User.query.filter(
        and_(
            User.matching_status == 'waiting',  # type: ignore
            User.employee_id != employee_id  # type: ignore
        )
    ).all()
    
    if not waiting_users:
        return None
    
    # 각 대기 사용자와의 호환성 점수 계산
    best_match = None
    best_score = 0
    
    for candidate in waiting_users:
        score = calculate_compatibility_score(user, candidate)
        if score > best_score:
            best_score = score
            best_match = candidate
    
    # 최소 호환성 점수 이상인 경우에만 매칭
    return best_match if best_score >= 0.3 else None

def calculate_compatibility_score(user1, user2):
    """두 사용자 간의 호환성 점수를 계산합니다 (0-1)."""
    score = 0.0
    
    # 음식 선호도 비교
    if user1.food_preferences and user2.food_preferences:
        prefs1 = set(user1.food_preferences.split(','))
        prefs2 = set(user2.food_preferences.split(','))
        if prefs1 & prefs2:  # 공통 선호도가 있으면
            score += 0.3
    
    # 선호 시간대 비교
    if user1.preferred_time and user2.preferred_time:
        if user1.preferred_time == user2.preferred_time:
            score += 0.2
    
    # 자주 가는 지역 비교
    if user1.frequent_areas and user2.frequent_areas:
        areas1 = set(user1.frequent_areas.split(','))
        areas2 = set(user2.frequent_areas.split(','))
        if areas1 & areas2:  # 공통 지역이 있으면
            score += 0.2
    
    # 알레르기 호환성 (서로 다른 알레르기가 있으면 감점)
    if user1.allergies and user2.allergies:
        allergies1 = set(user1.allergies.split(','))
        allergies2 = set(user2.allergies.split(','))
        if not (allergies1 & allergies2):  # 공통 알레르기가 없으면
            score += 0.1
    
    # 기본 점수 (무작위 매칭보다는 나음)
    score += 0.2
    
    return min(score, 1.0)

# --- 스마트 랜덤 런치 API ---
@app.route('/proposals/smart-recommendations', methods=['GET'])
def get_smart_recommendations():
    """스마트 랜덤 런치 추천 API - 최대 10개 그룹 추천"""
    employee_id = request.args.get('employee_id')
    if not employee_id:
        return jsonify({'error': 'employee_id is required'}), 400
    
    try:
        # 1단계: 빈 날짜 탐색 (오늘부터 14일 후까지)
        today = get_seoul_today()
        empty_dates = []
        
        for i in range(14):
            check_date = today + timedelta(days=i)
            date_string = check_date.strftime('%Y-%m-%d')
            
            # 해당 날짜에 약속이 있는지 확인
            has_party = db.session.query(Party).filter(
                and_(
                    getattr(Party, 'party_date') == date_string,
                    or_(
                        getattr(Party, 'host_employee_id') == employee_id,
                        getattr(Party, 'members_employee_ids').contains(employee_id)
                    )
                )
            ).first()
            
            has_personal = db.session.query(PersonalSchedule).filter(
                and_(
                    getattr(PersonalSchedule, 'schedule_date') == date_string,
                    getattr(PersonalSchedule, 'employee_id') == employee_id
                )
            ).first()
            
            # 약속이 없는 날짜만 추가
            if not has_party and not has_personal:
                empty_dates.append(date_string)
        
        # 2단계: 날짜별 추천 그룹 개수 설정
        # 가장 가까운 날 5개, 그 다음 날 2개, 그 다음 날 2개, 그 다음 날 1개
        date_group_counts = [5, 2, 2, 1]
        all_recommendations = []
        
        for i, group_count in enumerate(date_group_counts):
            if i >= len(empty_dates):
                break
                
            selected_date = empty_dates[i]
            
            # 해당 날짜에 약속이 없는 다른 유저들 찾기
            available_users = db.session.query(User).filter(
                and_(
                    getattr(User, 'employee_id') != employee_id,
                    ~db.session.query(Party).filter(
                        and_(
                            getattr(Party, 'party_date') == selected_date,
                            or_(
                                getattr(Party, 'host_employee_id') == getattr(User, 'employee_id'),
                                getattr(Party, 'members_employee_ids').contains(getattr(User, 'employee_id'))
                            )
                        )
                    ).exists(),
                    ~db.session.query(PersonalSchedule).filter(
                        and_(
                            getattr(PersonalSchedule, 'schedule_date') == selected_date,
                            getattr(PersonalSchedule, 'employee_id') == getattr(User, 'employee_id')
                        )
                    ).exists()
                )
            ).all()
            
            # 요청자 정보 가져오기
            requester = db.session.query(User).filter(getattr(User, 'employee_id') == employee_id).first()
            if not requester:
                continue
            
            # 성향 매칭 점수 계산 및 정렬
            scored_users = []
            for user in available_users:
                score = calculate_compatibility_score(requester, user)
                scored_users.append((user, score))
            
            # 점수순으로 정렬하고 상위 3명씩 여러 그룹 생성
            scored_users.sort(key=lambda x: x[1], reverse=True)
            
            # 해당 날짜에 대해 여러 그룹 생성 (최대 group_count개)
            for group_idx in range(min(group_count, len(scored_users) // 3)):
                start_idx = group_idx * 3
                end_idx = start_idx + 3
                
                if end_idx > len(scored_users):
                    break
                    
                selected_group = scored_users[start_idx:end_idx]
                
                # 각 멤버의 식사 기록 조회
                group_members = []
                for user, score in selected_group:
                    # 마지막 Party 기록 조회
                    last_party = db.session.query(Party).filter(
                        and_(
                            or_(
                                and_(getattr(Party, 'host_employee_id') == employee_id, getattr(Party, 'members_employee_ids').contains(user.employee_id)),
                                and_(getattr(Party, 'host_employee_id') == user.employee_id, getattr(Party, 'members_employee_ids').contains(employee_id))
                            ),
                            getattr(Party, 'party_date') < selected_date
                        )
                    ).order_by(desc(getattr(Party, 'party_date'))).first()
                    
                    # dining_history 계산
                    if last_party:
                        last_party_date = datetime.strptime(last_party.party_date, '%Y-%m-%d').date()
                        days_diff = (today - last_party_date).days
                        
                        if days_diff == 1:
                            dining_history = "어제 함께 식사"
                        elif days_diff <= 7:
                            dining_history = f"{days_diff}일 전 함께 식사"
                        elif days_diff <= 30:
                            dining_history = f"{days_diff//7}주 전 함께 식사"
                        else:
                            dining_history = "1달 이상 전"
                    else:
                        dining_history = "처음 만나는 동료"
                    
                    group_members.append({
                        "nickname": user.nickname,
                        "lunch_preference": user.lunch_preference,
                        "dining_history": dining_history,
                        "employee_id": user.employee_id
                    })
                
                if group_members:
                    all_recommendations.append({
                        "proposed_date": selected_date,
                        "recommended_group": group_members
                    })
        
        # 최대 10개까지만 반환
        return jsonify(all_recommendations[:10])
        
    except Exception as e:
        print(f"Error in smart recommendations: {e}")
        return jsonify({'error': 'Internal server error'}), 500

# --- 기존 함수들 ---

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
















