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
    """
    주소를 위도/경도로 변환합니다. 실제 서비스에서는 Google Maps Geocoding API 등을 연동해야 합니다.
    """
    # 임시로 성남시 수정구 내에서 랜덤 좌표 생성
    lat = 37.4452 + (random.random() - 0.5) * 0.01
    lon = 127.1023 + (random.random() - 0.5) * 0.01
    return lat, lon

def extract_keywords_from_reviews(reviews):
    """
    리뷰 목록에서 핵심 키워드 3개를 추출합니다. 실제 서비스에서는 LLM/NLU AI 연동이 필요합니다.
    """
    if not reviews:
        return []
    # 임시 로직: 모든 코멘트를 합쳐서 가장 많이 등장하는 단어 3개 추출 (단순 구현)
    text = ' '.join([r.comment for r in reviews if r.comment])
    words = [w.strip() for w in text.split() if len(w.strip()) > 1]
    if not words:
        return []
    word_counts = {}
    for word in words:
        word_counts[word] = word_counts.get(word, 0) + 1
    
    sorted_words = sorted(word_counts.items(), key=lambda item: item[1], reverse=True)
    return [f"#{word}" for word, count in sorted_words[:3]]

# --- 데이터베이스 모델 정의 ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.String(50), unique=True, nullable=False)
    nickname = db.Column(db.String(50), nullable=True)
    lunch_preference = db.Column(db.String(200), nullable=True) # 콤마로 구분된 문자열
    gender = db.Column(db.String(10), nullable=True)
    age_group = db.Column(db.String(20), nullable=True)
    main_dish_genre = db.Column(db.String(100), nullable=True) # 콤마로 구분된 문자열
    matching_status = db.Column(db.String(20), default='idle') # idle, waiting, pending_confirmation, matched
    match_request_time = db.Column(db.DateTime, nullable=True)

class Restaurant(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    address = db.Column(db.String(200), nullable=True)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    reviews = db.relationship('Review', backref='restaurant', lazy=True, cascade="all, delete-orphan")
    correction_requests = db.relationship('RestaurantCorrectionRequest', backref='restaurant', lazy=True, cascade="all, delete-orphan")
    
    @property
    def review_count(self): return len(self.reviews)
    
    @property
    def avg_rating(self):
        if not self.reviews: return 0
        return sum(r.rating for r in self.reviews) / len(self.reviews)

class RestaurantCorrectionRequest(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    restaurant_id = db.Column(db.Integer, db.ForeignKey('restaurant.id'), nullable=False)
    user_id = db.Column(db.String(50), nullable=False)
    suggested_name = db.Column(db.String(100), nullable=True)
    suggested_address = db.Column(db.String(200), nullable=True)
    status = db.Column(db.String(20), default='pending') # pending, approved, rejected
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class DangolPot(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    tags = db.Column(db.String(200), nullable=True)
    host_id = db.Column(db.String(50), nullable=False)
    members = db.Column(db.Text, default='') # 콤마로 구분된 employee_id 목록
    
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
    status = db.Column(db.String(20), default='pending') # pending, confirmed, rejected
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# --- 앱 실행 시 초기화 ---
@app.before_request
def create_tables_and_init_data():
    if not hasattr(app, '_db_initialized'):
        with app.app_context():
            db.create_all()
            if Restaurant.query.count() == 0:
                r1 = Restaurant(name='한식 뚝배기집', category='한식', address='경기도 성남시 수정구 시흥동 288', latitude=37.4452, longitude=127.1023)
                r2 = Restaurant(name='퓨전 파스타', category='양식', address='경기도 성남시 수정구 시흥동 300', latitude=37.4468, longitude=127.1035)
                db.session.add_all([r1, r2])
            if User.query.count() == 0:
                u1 = User(employee_id='KOICA001', nickname='홍길동', lunch_preference='조용한 식사,빠른 식사', main_dish_genre='한식,분식')
                u2 = User(employee_id='KOICA002', nickname='김철수', lunch_preference='대화 선호,가성비 추구', main_dish_genre='한식,중식')
                db.session.add_all([u1, u2])
            if DangolPot.query.count() == 0:
                p1 = DangolPot(name='마라탕 중독자 모임', description='주 1회 마라 수혈 필수!', tags='#마라탕 #얼얼한맛', host_id='KOICA001', members='KOICA001,KOICA002')
                db.session.add(p1)
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
def get_today_menu(): return jsonify({'menu': ['제육볶음', '계란찜', '시금치나물', '김치']})

# --- 개인 일정 API ---
@app.route('/personal_schedules', methods=['POST'])
def add_personal_schedule():
    data = request.get_json()
    new_schedule = PersonalSchedule(
        employee_id=data['employee_id'],
        schedule_date=data['schedule_date'],
        title=data['title'],
        description=data.get('description', '')
    )
    db.session.add(new_schedule)
    db.session.commit()
    return jsonify({'message': '개인 일정이 추가되었습니다.', 'id': new_schedule.id}), 201

# --- 이벤트 (약속) 통합 API ---
@app.route('/events/<employee_id>', methods=['GET'])
def get_events(employee_id):
    events = {}
    today_str = get_seoul_today().isoformat()
    # 파티/랜덤런치 조회
    parties = Party.query.filter(Party.members_employee_ids.contains(employee_id)).all()
    for p in parties:
        if p.party_date not in events: events[p.party_date] = []
        member_ids = p.members_employee_ids.split(',')
        # 본인 이름 제외
        other_member_ids = [mid for mid in member_ids if mid != employee_id]
        member_nicknames = [u.nickname for u in User.query.filter(User.employee_id.in_(other_member_ids)).all()]
        events[p.party_date].append({
            'type': '랜덤 런치' if p.is_from_match else '파티',
            'id': p.id,
            'title': p.title,
            'restaurant': p.restaurant_name,
            'members': member_nicknames
        })
    # 개인 일정 조회
    schedules = PersonalSchedule.query.filter_by(employee_id=employee_id).all()
    for s in schedules:
        if s.schedule_date not in events: events[s.schedule_date] = []
        events[s.schedule_date].append({
            'type': '개인 일정',
            'id': s.id,
            'title': s.title,
            'description': s.description
        })
    return jsonify(events)

# --- 맛집 API ---
@app.route('/restaurants', methods=['POST'])
def add_restaurant():
    data = request.get_json()
    lat, lon = geocode_address(data['address']) # 지오코딩
    new_restaurant = Restaurant(name=data['name'], category=data['category'], address=data['address'], latitude=lat, longitude=lon)
    db.session.add(new_restaurant)
    db.session.commit()
    return jsonify({'message': '새로운 맛집이 등록되었습니다!', 'restaurant_id': new_restaurant.id}), 201

@app.route('/restaurants/<int:restaurant_id>', methods=['GET'])
def get_restaurant_detail(restaurant_id):
    restaurant = Restaurant.query.get(restaurant_id)
    if not restaurant: return jsonify({'message': '맛집을 찾을 수 없습니다.'}), 404
    keywords = extract_keywords_from_reviews(restaurant.reviews) # AI 키워드 추출
    return jsonify({
        'id': restaurant.id,
        'name': restaurant.name,
        'category': restaurant.category,
        'address': restaurant.address,
        'latitude': restaurant.latitude,
        'longitude': restaurant.longitude,
        'keywords': keywords
    })
    
@app.route('/restaurants/<int:restaurant_id>/correction', methods=['POST'])
def request_restaurant_correction(restaurant_id):
    data = request.get_json()
    new_req = RestaurantCorrectionRequest(
        restaurant_id=restaurant_id,
        user_id=data['user_id'],
        suggested_name=data.get('name'),
        suggested_address=data.get('address')
    )
    db.session.add(new_req)
    db.session.commit()
    return jsonify({'message': '정보 수정 요청이 접수되었습니다.'}), 201

# --- 단골팟 API ---
@app.route('/dangolpots/<int:pot_id>', methods=['PUT'])
def update_dangolpot(pot_id):
    pot = DangolPot.query.get(pot_id)
    data = request.get_json()
    if not pot: return jsonify({'message': '단골팟을 찾을 수 없습니다.'}), 404
    if pot.host_id != data.get('employee_id'): return jsonify({'message': '방장만 수정할 수 있습니다.'}), 403
    
    pot.name = data.get('name', pot.name)
    pot.description = data.get('description', pot.description)
    pot.tags = data.get('tags', pot.tags)
    db.session.commit()
    return jsonify({'message': '단골팟 정보가 수정되었습니다.'})

# --- 파티 API ---
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
    
# --- 랜덤 런치 매칭 시스템 ---
# [NEW] 랜덤 런치 상태 확인 API
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
        else:
            # 10시가 지났는데도 waiting이면 실시간 매칭 대기 중
            response['countdown_target'] = None

    return jsonify(response)
    
# [REVISED] 랜덤 런치 요청/취소 API
@app.route('/match/request', methods=['POST'])
def handle_match_request():
    employee_id = request.json['employee_id']
    user = User.query.filter_by(employee_id=employee_id).first()
    if not user: return jsonify({'message': '사용자를 찾을 수 없습니다.'}), 404
    
    user = reset_user_match_status_if_needed(user)

    if user.matching_status in ['waiting', 'pending_confirmation']:
        user.matching_status = 'idle'
        user.match_request_time = None
        db.session.commit()
        return jsonify({'status': 'idle', 'message': '랜덤 런치 대기를 취소했습니다.'})
    
    if user.matching_status == 'matched':
        return jsonify({'status': 'matched', 'message': '이미 오늘 점심 매칭이 완료되었습니다.'})

    now = datetime.now()
    user.match_request_time = now
    
    # 오전 10시 ~ 오후 2시: 실시간 매칭 시도
    if time(10, 0) <= now.time() < time(14, 0):
        user.matching_status = 'waiting'
        db.session.commit() # 먼저 내 상태를 저장
        
        # 다른 대기자 탐색
        waiting_pool = User.query.filter(
            User.matching_status == 'waiting',
            User.employee_id != user.employee_id,
            func.date(User.match_request_time) == now.date()
        ).all()
        
        if waiting_pool:
            potential_group = [user] + waiting_pool
            group_size = min(len(potential_group), random.randint(2, 4))
            final_group_members = random.sample(potential_group, group_size)
            member_ids = [m.employee_id for m in final_group_members]
            
            # 그룹 멤버 상태 변경 및 MatchGroup 생성
            User.query.filter(User.employee_id.in_(member_ids)).update({'matching_status': 'pending_confirmation'}, synchronize_session=False)
            new_match_group = MatchGroup(member_employee_ids=','.join(member_ids))
            db.session.add(new_match_group)
            db.session.commit()
            
            group_info = [{'nickname': m.nickname, 'lunch_preference': m.lunch_preference} for m in final_group_members]
            return jsonify({'status': 'pending_confirmation', 'message': '매칭 그룹을 찾았습니다!', 'group': group_info, 'group_id': new_match_group.id})
    
    # 그 외 시간 (예약 시간): 대기열 등록
    user.matching_status = 'waiting'
    db.session.commit()
    return jsonify({'status': 'waiting', 'message': '오전 10시 매칭 대기열에 등록되었습니다.'})

# [NEW] 10시 일괄 매칭 처리 API (개발자가 수동 호출 또는 스케줄러로 자동화)
@app.route('/match/process_batch', methods=['POST'])
def process_batch_match():
    today = get_seoul_today()
    waiting_users = User.query.filter(User.matching_status == 'waiting', func.date(User.match_request_time) <= today).all()
    
    if len(waiting_users) < 2:
        return jsonify({'message': '매칭할 사용자가 부족합니다.'}), 200

    # 사용자 선호도 파싱
    for user in waiting_users:
        user.prefs = set((user.lunch_preference or '').split(','))
        user.genres = set((user.main_dish_genre or '').split(','))

    # 그룹 매칭 로직 (유사도 기반)
    groups = []
    while len(waiting_users) >= 2:
        user1 = waiting_users.pop(0)
        best_match = None
        max_score = -1
        
        for user2 in waiting_users:
            pref_score = len(user1.prefs.intersection(user2.prefs))
            genre_score = len(user1.genres.intersection(user2.genres))
            score = pref_score * 2 + genre_score # 성향에 가중치
            if score > max_score:
                max_score = score
                best_match = user2
        
        # 그룹 형성 (여기서는 2인 그룹만 단순 생성, 확장 가능)
        if best_match:
            waiting_users.remove(best_match)
            groups.append([user1, best_match])
    
    # 남은 유저가 있다면 마지막 그룹에 추가 시도 등..
    
    # MatchGroup 생성 및 제안
    count = 0
    for group in groups:
        member_ids = [u.employee_id for u in group]
        User.query.filter(User.employee_id.in_(member_ids)).update({'matching_status': 'pending_confirmation'}, synchronize_session=False)
        new_match_group = MatchGroup(member_employee_ids=','.join(member_ids))
        db.session.add(new_match_group)
        count += 1

    db.session.commit()
    return jsonify({'message': f'{count}개의 매칭 그룹이 생성되었습니다.'})


# --- 기존 API (수정 없음 또는 사소한 수정) ---
# 기존 /match/confirm, /match/reject 등은 로직 변경이 크지 않아 유지
@app.route('/match/confirm', methods=['POST'])
def confirm_match():
    group_id = request.json['group_id']
    match_group = MatchGroup.query.get(group_id)
    if not match_group or match_group.status != 'pending': return jsonify({'message': '이미 처리된 매칭입니다.'}), 400
    
    match_group.status = 'confirmed'
    member_ids = match_group.member_employee_ids.split(',')
    User.query.filter(User.employee_id.in_(member_ids)).update({'matching_status': 'matched'}, synchronize_session=False)
    
    party_title = f"오늘의 랜덤 런치 ⚡️"
    today_str = get_seoul_today().isoformat()
    new_party = Party(host_employee_id=member_ids[0], title=party_title, restaurant_name="미정", party_date=today_str, party_time="12:30", meeting_location="회사 로비", max_members=len(member_ids), members_employee_ids=match_group.member_employee_ids, is_from_match=True)
    db.session.add(new_party)
    db.session.commit()
    return jsonify({'status': 'matched', 'message': '랜덤 런치 파티가 생성되었습니다!', 'party_id': new_party.id, 'party_title': new_party.title})

@app.route('/match/reject', methods=['POST'])
def reject_match():
    group_id = request.json['group_id']
    employee_id = request.json['employee_id']
    match_group = MatchGroup.query.get(group_id)
    if not match_group or match_group.status != 'pending': return jsonify({'message': '이미 처리된 매칭입니다.'}), 400
    
    match_group.status = 'rejected'
    other_members = [mid for mid in match_group.member_employee_ids.split(',') if mid != employee_id]
    
    User.query.filter_by(employee_id=employee_id).update({'matching_status': 'idle', 'match_request_time': None})
    if other_members:
        # 다른 멤버들은 다시 대기 상태로 (실시간 매칭 가능하도록)
        now = datetime.now()
        User.query.filter(User.employee_id.in_(other_members)).update({'matching_status': 'waiting', 'match_request_time': now}, synchronize_session=False)
    
    db.session.commit()
    return jsonify({'status': 'idle', 'message': '매칭을 거절했습니다. 다른 멤버들은 다시 대기합니다.'})
    
# ... (이하 기존 /parties, /users, /reviews 등 API는 대부분 유지, 필요한 부분은 위에 이미 수정됨) ...
@app.route('/restaurants', methods=['GET'])
def get_restaurants():
    query = request.args.get('query', '')
    sort_by = request.args.get('sort_by', 'name')
    restaurants_q = Restaurant.query.filter(or_(Restaurant.name.ilike(f'%{query}%'), Restaurant.category.ilike(f'%{query}%'))).all()
    if sort_by == 'rating_desc': restaurants_q.sort(key=lambda r: r.avg_rating, reverse=True)
    elif sort_by == 'reviews_desc': restaurants_q.sort(key=lambda r: r.review_count, reverse=True)
    else: restaurants_q.sort(key=lambda r: r.name)
    restaurants_list = [{'id': r.id, 'name': r.name, 'category': r.category, 'address': r.address, 'latitude': r.latitude, 'longitude': r.longitude, 'rating': round(r.avg_rating, 1), 'review_count': r.review_count} for r in restaurants_q]
    return jsonify(restaurants_list)

@app.route('/restaurants/<int:restaurant_id>/reviews', methods=['GET'])
def get_reviews(restaurant_id):
    reviews = Review.query.filter_by(restaurant_id=restaurant_id).order_by(desc(Review.created_at)).all()
    return jsonify([{'id': r.id, 'nickname': r.nickname, 'rating': r.rating, 'comment': r.comment, 'created_at': r.created_at.strftime('%Y-%m-%d')} for r in reviews])

@app.route('/restaurants/<int:restaurant_id>/reviews', methods=['POST'])
def add_review(restaurant_id):
    data = request.get_json()
    user = User.query.filter_by(employee_id=data['user_id']).first()
    if not user: return jsonify({'message': '사용자를 찾을 수 없습니다.'}), 404
    new_review = Review(restaurant_id=restaurant_id, user_id=data['user_id'], nickname=user.nickname, rating=data['rating'], comment=data['comment'])
    db.session.add(new_review)
    db.session.commit()
    return jsonify({'message': '리뷰가 성공적으로 등록되었습니다.'}), 201

@app.route('/parties', methods=['GET'])
def get_all_parties():
    parties = Party.query.filter_by(is_from_match=False).order_by(desc(Party.id)).all()
    return jsonify([{'id': p.id, 'title': p.title, 'restaurant_name': p.restaurant_name, 'current_members': p.current_members, 'max_members': p.max_members, 'party_date': p.party_date, 'party_time': p.party_time} for p in parties])

@app.route('/parties', methods=['POST'])
def create_party():
    data = request.get_json()
    new_party = Party(host_employee_id=data['host_employee_id'], title=data['title'], restaurant_name=data['restaurant_name'], party_date=data['party_date'], party_time=data['party_time'], meeting_location=data['meeting_location'], max_members=data['max_members'], members_employee_ids=data['host_employee_id'])
    db.session.add(new_party)
    db.session.commit()
    return jsonify({'message': '파티가 생성되었습니다.', 'party_id': new_party.id}), 201

@app.route('/parties/<int:party_id>', methods=['GET'])
def get_party(party_id):
    party = Party.query.get(party_id)
    if not party: return jsonify({'message': '파티를 찾을 수 없습니다.'}), 404
    member_ids = party.members_employee_ids.split(',') if party.members_employee_ids else []
    members_details = [{'employee_id': u.employee_id, 'nickname': u.nickname} for u in User.query.filter(User.employee_id.in_(member_ids)).all()]
    party_data = {'id': party.id, 'host_employee_id': party.host_employee_id, 'title': party.title, 'restaurant_name': party.restaurant_name, 'party_date': party.party_date, 'party_time': party.party_time, 'meeting_location': party.meeting_location, 'max_members': party.max_members, 'current_members': party.current_members, 'members': members_details, 'is_from_match': party.is_from_match}
    return jsonify(party_data)

@app.route('/users/<employee_id>', methods=['GET'])
def get_user(employee_id):
    user = User.query.filter_by(employee_id=employee_id).first()
    if not user: return jsonify({'message': '사용자를 찾을 수 없습니다.'}), 404
    return jsonify({'employee_id': user.employee_id, 'nickname': user.nickname, 'lunch_preference': user.lunch_preference, 'gender': user.gender, 'age_group': user.age_group, 'main_dish_genre': user.main_dish_genre})

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
    
# 나머지 API 생략... (위의 기존 코드와 동일)
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
