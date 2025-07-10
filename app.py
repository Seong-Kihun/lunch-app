import random
from datetime import datetime, date, timedelta, time
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
from sqlalchemy import desc, or_, func, text

app = Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///site.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'your-secret-key-here'
db = SQLAlchemy(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# --- 유틸리티 함수 ---
def get_seoul_today():
    return datetime.now().date()

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
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    def __init__(self, restaurant_id, user_id, nickname, rating, comment=None):
        self.restaurant_id = restaurant_id
        self.user_id = user_id
        self.nickname = nickname
        self.rating = rating
        self.comment = comment

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
    # Review 생성
    new_review = Review(
        restaurant_id=restaurant_id,
        user_id=data.get('user_id'),
        nickname=user.nickname,
        rating=data.get('rating'),
        comment=data.get('comment')
    )
    db.session.add(new_review)
    db.session.commit()
    return jsonify({'message': '리뷰가 성공적으로 등록되었습니다.'}), 201

# --- 단골팟 API ---
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
    db.session.commit()
    return jsonify({'message': '새로운 단골팟이 생성되었습니다!', 'pot_id': new_pot.id}), 201

@app.route('/dangolpots', methods=['GET'])
def get_all_dangolpots():
    pots = DangolPot.query.order_by(desc(DangolPot.created_at)).all()
    return jsonify([{'id': p.id, 'name': p.name, 'description': p.description, 'tags': p.tags, 'category': p.category, 'member_count': p.member_count, 'created_at': p.created_at.strftime('%Y-%m-%d')} for p in pots])

@app.route('/dangolpots/<int:pot_id>', methods=['GET'])
def get_dangolpot_detail(pot_id):
    pot = DangolPot.query.get(pot_id)
    if not pot: return jsonify({'message': '단골팟을 찾을 수 없습니다.'}), 404
    member_ids = pot.members.split(',') if pot and pot.members else []
    members_details = [{'employee_id': u.employee_id, 'nickname': u.nickname} for u in User.query.filter(User.employee_id.in_(member_ids)).all()]  # type: ignore
    pot_data = {'id': pot.id, 'name': pot.name, 'description': pot.description, 'tags': pot.tags, 'category': pot.category, 'host_id': pot.host_id, 'members': members_details}
    return jsonify(pot_data)

@app.route('/dangolpots/<int:pot_id>/join', methods=['POST'])
def join_dangolpot(pot_id):
    pot = DangolPot.query.get(pot_id)
    data = request.get_json() or {}
    employee_id = data.get('employee_id')
    if not pot: return jsonify({'message': '단골팟을 찾을 수 없습니다.'}), 404
    
    member_ids = pot.members.split(',') if pot and pot.members else []
    if employee_id and employee_id not in member_ids:
        member_ids.append(employee_id)
        pot.members = ','.join(member_ids)
        db.session.commit()
    return jsonify({'message': '단골팟에 가입했습니다.'})

@app.route('/dangolpots/<int:pot_id>', methods=['DELETE'])
def delete_dangolpot(pot_id):
    pot = DangolPot.query.get(pot_id)
    if not pot:
        return jsonify({'message': '단골팟을 찾을 수 없습니다.'}), 404
    
    employee_id = request.args.get('employee_id')
    if not employee_id:
        return jsonify({'message': '사용자 ID가 필요합니다.'}), 400
    
    if pot.host_id != employee_id:
        return jsonify({'message': '팟장만 삭제할 수 있습니다.'}), 403
    
    db.session.delete(pot)
    db.session.commit()
    return jsonify({'message': '단골팟이 삭제되었습니다.'})

@app.route('/dangolpots/<int:pot_id>', methods=['PUT'])
def update_dangolpot(pot_id):
    pot = DangolPot.query.get(pot_id)
    if not pot:
        return jsonify({'message': '단골팟을 찾을 수 없습니다.'}), 404
    
    data = request.get_json()
    employee_id = data.get('employee_id')
    
    if not employee_id:
        return jsonify({'message': '사용자 ID가 필요합니다.'}), 400
    
    if pot.host_id != employee_id:
        return jsonify({'message': '팟장만 수정할 수 있습니다.'}), 403
    
    pot.name = data.get('name', pot.name)
    pot.description = data.get('description', pot.description)
    pot.tags = data.get('tags', pot.tags)
    pot.category = data.get('category', pot.category)
    
    db.session.commit()
    return jsonify({'message': '단골팟 정보가 수정되었습니다.'})

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
    db.session.commit()
    return jsonify({'message': '파티가 생성되었습니다.', 'party_id': new_party.id}), 201

@app.route('/parties/<int:party_id>', methods=['GET'])
def get_party(party_id):
    party = Party.query.get(party_id)
    if not party: return jsonify({'message': '파티를 찾을 수 없습니다.'}), 404
    member_ids = party.members_employee_ids.split(',') if party and party.members_employee_ids else []
    members_details = [{'employee_id': u.employee_id, 'nickname': u.nickname} for u in User.query.filter(User.employee_id.in_(member_ids)).all()]  # type: ignore
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
            # 첫 번째 대기 사용자와 매칭
            matched_user = waiting_users[0]
            
            # 파티 생성
            new_party = Party(
                host_employee_id=employee_id,
                title='랜덤 런치',
                restaurant_name='랜덤 매칭',
                restaurant_address=None,
                party_date=now.strftime('%Y-%m-%d'),
                party_time='12:00',
                meeting_location='KOICA 본사',
                max_members=2,
                members_employee_ids=f"{employee_id},{matched_user.employee_id}",
                is_from_match=True
            )
            db.session.add(new_party)
            
            # 두 사용자 모두 matched 상태로 변경
            user.matching_status = 'matched'
            matched_user.matching_status = 'matched'
            db.session.commit()
            
            return jsonify({
                'message': '매칭이 완료되었습니다!',
                'status': 'matched',
                'party_id': new_party.id
            })
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

# --- 채팅 API ---
@app.route('/chat/messages/<chat_type>/<int:chat_id>', methods=['GET'])
def get_chat_messages(chat_type, chat_id):
    messages = ChatMessage.query.filter_by(chat_type=chat_type, chat_id=chat_id).order_by(ChatMessage.created_at).all()
    return jsonify([{
        'id': msg.id,
        'sender_employee_id': msg.sender_employee_id,
        'sender_nickname': msg.sender_nickname,
        'message': msg.message,
        'created_at': msg.created_at.strftime('%Y-%m-%d %H:%M')
    } for msg in messages])

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
    chat_type = data['chat_type']
    chat_id = data['chat_id']
    sender_employee_id = data['sender_employee_id']
    message = data['message']
    
    # 사용자 정보 조회
    user = User.query.filter_by(employee_id=sender_employee_id).first()
    if not user:
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
    
    # 채팅방의 모든 사용자에게 메시지 전송
    room = f"{chat_type}_{chat_id}"
    emit('new_message', {
        'id': new_message.id,
        'sender_employee_id': sender_employee_id,
        'sender_nickname': user.nickname,
        'message': message,
        'created_at': new_message.created_at.strftime('%Y-%m-%d %H:%M')
    }, to=room)

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)


