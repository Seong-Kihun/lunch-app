import random
from datetime import datetime, date, timedelta, time
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from sqlalchemy import desc, or_, func

app = Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///site.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

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

class Restaurant(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    address = db.Column(db.String(200), nullable=True)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    reviews = db.relationship('Review', backref='restaurant', lazy=True, cascade="all, delete-orphan")
    
    @property
    def review_count(self): return len(self.reviews)
    
    @property
    def avg_rating(self):
        if not self.reviews: return 0
        return sum(r.rating for r in self.reviews) / len(self.reviews)

class DangolPot(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    tags = db.Column(db.String(200), nullable=True)
    category = db.Column(db.String(50), nullable=True)
    host_id = db.Column(db.String(50), nullable=False)
    members = db.Column(db.Text, default='')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    @property
    def member_count(self):
        if not self.members: return 0
        return len(self.members.split(','))

class Review(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    restaurant_id = db.Column(db.Integer, db.ForeignKey('restaurant.id'), nullable=False)
    user_id = db.Column(db.String(50), nullable=False)
    nickname = db.Column(db.String(50), nullable=False)
    rating = db.Column(db.Integer, nullable=False)
    comment = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

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

class MatchGroup(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    member_employee_ids = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default='pending')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

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
                for user_data in users_data:
                    db.session.add(User(**user_data))
            db.session.commit()
            app._db_initialized = True

# --- Helper Function ---
def reset_user_match_status_if_needed(user):
    today = get_seoul_today()
    if user.match_request_time and user.match_request_time.date() != today:
        user.matching_status = 'idle'
        user.match_request_time = None
        db.session.commit()
    return user

# --- API 엔드포인트 ---
@app.route('/cafeteria/today', methods=['GET'])
def get_today_menu(): return jsonify({'menu': ['제육볶음', '계란찜']})

# --- 이벤트 (약속) 통합 API ---
@app.route('/events/<employee_id>', methods=['GET'])
def get_events(employee_id):
    events = {}
    today = get_seoul_today()
    # 파티/랜덤런치 조회
    parties = Party.query.filter(Party.members_employee_ids.contains(employee_id)).all()
    for p in parties:
        # 오늘 날짜 이전의 약속은 제외
        if datetime.strptime(p.party_date, '%Y-%m-%d').date() < today:
            continue
        if p.party_date not in events: events[p.party_date] = []
        member_ids = p.members_employee_ids.split(',')
        other_member_ids = [mid for mid in member_ids if mid != employee_id]
        member_nicknames = [u.nickname for u in User.query.filter(User.employee_id.in_(other_member_ids)).all()]
        all_member_nicknames = [u.nickname for u in User.query.filter(User.employee_id.in_(member_ids)).all()]
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
    data = request.get_json()
    new_schedule = PersonalSchedule(employee_id=data['employee_id'], schedule_date=data['schedule_date'], title=data['title'], description=data.get('description', ''))
    db.session.add(new_schedule); db.session.commit()
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
    new_restaurant = Restaurant(name=data['name'], category=data['category'], address=data['address'], latitude=lat, longitude=lon)
    db.session.add(new_restaurant); db.session.commit()
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
    data = request.get_json(); user = User.query.filter_by(employee_id=data['user_id']).first()
    if not user: return jsonify({'message': '사용자를 찾을 수 없습니다.'}), 404
    new_review = Review(restaurant_id=restaurant_id, user_id=data['user_id'], nickname=user.nickname, rating=data['rating'], comment=data['comment'])
    db.session.add(new_review); db.session.commit()
    return jsonify({'message': '리뷰가 성공적으로 등록되었습니다.'}), 201

# --- 단골팟 API ---
@app.route('/dangolpots', methods=['POST'])
def create_dangolpot():
    data = request.get_json()
    new_pot = DangolPot(name=data['name'], description=data['description'], tags=data['tags'], category=data['category'], host_id=data['host_id'], members=data['host_id'])
    db.session.add(new_pot); db.session.commit()
    return jsonify({'message': '새로운 단골팟이 생성되었습니다!', 'pot_id': new_pot.id}), 201

@app.route('/dangolpots', methods=['GET'])
def get_all_dangolpots():
    pots = DangolPot.query.order_by(desc(DangolPot.created_at)).all()
    return jsonify([{'id': p.id, 'name': p.name, 'description': p.description, 'tags': p.tags, 'category': p.category, 'member_count': p.member_count, 'created_at': p.created_at.strftime('%Y-%m-%d')} for p in pots])

@app.route('/dangolpots/<int:pot_id>', methods=['GET'])
def get_dangolpot_detail(pot_id):
    pot = DangolPot.query.get(pot_id)
    if not pot: return jsonify({'message': '단골팟을 찾을 수 없습니다.'}), 404
    member_ids = pot.members.split(',') if pot.members else []
    members_details = [{'employee_id': u.employee_id, 'nickname': u.nickname} for u in User.query.filter(User.employee_id.in_(member_ids)).all()]
    pot_data = {'id': pot.id, 'name': pot.name, 'description': pot.description, 'tags': pot.tags, 'category': pot.category, 'host_id': pot.host_id, 'members': members_details}
    return jsonify(pot_data)

@app.route('/dangolpots/<int:pot_id>/join', methods=['POST'])
def join_dangolpot(pot_id):
    pot = DangolPot.query.get(pot_id)
    employee_id = request.json['employee_id']
    if not pot: return jsonify({'message': '단골팟을 찾을 수 없습니다.'}), 404
    
    member_ids = pot.members.split(',') if pot.members else []
    if employee_id not in member_ids:
        member_ids.append(employee_id)
        pot.members = ','.join(member_ids)
        db.session.commit()
    return jsonify({'message': '단골팟에 가입했습니다.'})

@app.route('/my_dangolpots/<employee_id>', methods=['GET'])
def get_my_dangolpots(employee_id):
    my_pots = DangolPot.query.filter(DangolPot.members.contains(employee_id)).order_by(desc(DangolPot.created_at)).all()
    return jsonify([{'id': p.id, 'name': p.name, 'description': p.description, 'tags': p.tags, 'category': p.category, 'member_count': p.member_count, 'created_at': p.created_at.strftime('%Y-%m-%d')} for p in my_pots])

# --- 파티 API ---
@app.route('/parties', methods=['GET'])
def get_all_parties():
    parties = Party.query.filter_by(is_from_match=False).order_by(desc(Party.id)).all()
    return jsonify([{'id': p.id, 'title': p.title, 'restaurant_name': p.restaurant_name, 'current_members': p.current_members, 'max_members': p.max_members, 'party_date': p.party_date, 'party_time': p.party_time} for p in parties])

@app.route('/parties', methods=['POST'])
def create_party():
    data = request.get_json()
    restaurant = Restaurant.query.filter_by(name=data['restaurant_name']).first()
    restaurant_address = restaurant.address if restaurant else None
    new_party = Party(host_employee_id=data['host_employee_id'], title=data['title'], restaurant_name=data['restaurant_name'], restaurant_address=restaurant_address, party_date=data['party_date'], party_time=data['party_time'], meeting_location=data['meeting_location'], max_members=data['max_members'], members_employee_ids=data['host_employee_id'])
    db.session.add(new_party); db.session.commit()
    return jsonify({'message': '파티가 생성되었습니다.', 'party_id': new_party.id}), 201

@app.route('/parties/<int:party_id>', methods=['GET'])
def get_party(party_id):
    party = Party.query.get(party_id)
    if not party: return jsonify({'message': '파티를 찾을 수 없습니다.'}), 404
    member_ids = party.members_employee_ids.split(',') if party.members_employee_ids else []
    members_details = [{'employee_id': u.employee_id, 'nickname': u.nickname} for u in User.query.filter(User.employee_id.in_(member_ids)).all()]
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
    employee_id = request.json['employee_id']
    if party.current_members >= party.max_members: return jsonify({'message': '파티 인원이 가득 찼습니다.'}), 400
    if employee_id not in party.members_employee_ids.split(','):
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

@app.route('/chats/<employee_id>', methods=['GET'])
def get_my_chats(employee_id):
    chat_list = []
    joined_parties = Party.query.filter(Party.members_employee_ids.contains(employee_id)).order_by(desc(Party.id)).all()
    for party in joined_parties:
        chat_list.append({'id': party.id, 'type': 'party', 'title': party.title, 'subtitle': f"{party.restaurant_name} | {party.current_members}/{party.max_members}명", 'is_from_match': party.is_from_match})
    joined_pots = DangolPot.query.filter(DangolPot.members.contains(employee_id)).order_by(desc(DangolPot.created_at)).all()
    for pot in joined_pots:
         chat_list.append({'id': pot.id, 'type': 'dangolpot', 'title': pot.name, 'subtitle': pot.tags})
    return jsonify(chat_list)

@app.route('/users/<employee_id>', methods=['GET'])
def get_user(employee_id):
    user = User.query.filter_by(employee_id=employee_id).first()
    if not user: return jsonify({'message': '사용자를 찾을 수 없습니다.'}), 404
    return jsonify({'nickname': user.nickname, 'lunch_preference': user.lunch_preference, 'gender': user.gender, 'age_group': user.age_group, 'main_dish_genre': user.main_dish_genre})

# ... (이하 생략된 다른 API들은 이전 코드와 동일) ...
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
