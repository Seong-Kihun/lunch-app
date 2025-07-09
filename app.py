import random
from datetime import datetime, date, timedelta, time
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
from sqlalchemy import desc, or_, func

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

class MatchGroup(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    member_employee_ids = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default='pending')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

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
                ]
                # User 생성 (초기 데이터)
                for user_data in users_data:
                    db.session.add(User(
                        employee_id=user_data.get('employee_id'),
                        nickname=user_data.get('nickname'),
                        lunch_preference=user_data.get('lunch_preference'),
                        main_dish_genre=user_data.get('main_dish_genre')
                    ))
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
    new_restaurant = Restaurant()
    new_restaurant.name = data['name']
    new_restaurant.category = data['category']
    new_restaurant.address = data['address']
    new_restaurant.latitude = lat
    new_restaurant.longitude = lon
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
        q = q.filter(Restaurant.category == category_filter)
    
    restaurants_q = q.filter(or_(Restaurant.name.ilike(f'%{query}%'), Restaurant.category.ilike(f'%{query}%'))).all()

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
    parties = Party.query.filter_by(is_from_match=False).order_by(desc(Party.id)).all()
    return jsonify([{'id': p.id, 'title': p.title, 'restaurant_name': p.restaurant_name, 'current_members': p.current_members, 'max_members': p.max_members, 'party_date': p.party_date, 'party_time': p.party_time} for p in parties])

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
    restaurant = Restaurant.query.filter_by(name=data.get('restaurant_name')).first()
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


