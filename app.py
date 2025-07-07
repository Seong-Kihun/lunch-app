from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import random
from datetime import datetime, date
from sqlalchemy import desc, or_

app = Flask(__name__)
CORS(app)

# --- 데이터베이스 설정 ---
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///site.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

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
    match_request_date = db.Column(db.String(10), nullable=True)

class Restaurant(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    reviews = db.relationship('Review', backref='restaurant', lazy=True, cascade="all, delete-orphan")
    @property
    def review_count(self): return len(self.reviews)
    @property
    def avg_rating(self):
        if not self.reviews: return 0
        return sum(r.rating for r in self.reviews) / len(self.reviews)

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

class MatchGroup(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    member_employee_ids = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# --- 앱 실행 시 초기화 ---
@app.before_request
def create_tables_and_init_data():
    if not hasattr(app, '_db_initialized'):
        with app.app_context():
            db.create_all()
            if Restaurant.query.count() == 0:
                r1 = Restaurant(name='한식 뚝배기집', category='한식')
                r2 = Restaurant(name='퓨전 파스타', category='양식')
                db.session.add_all([r1, r2])
            if User.query.count() == 0:
                u1 = User(employee_id='KOICA001', nickname='홍길동')
                u2 = User(employee_id='KOICA002', nickname='김철수')
                db.session.add_all([u1, u2])
            db.session.commit()
            app._db_initialized = True

# --- Helper Function ---
def get_user_and_reset_status(employee_id):
    user = User.query.filter_by(employee_id=employee_id).first()
    if not user: return None
    today_str = date.today().isoformat()
    if user.match_request_date != today_str:
        user.matching_status = 'idle'
        user.match_request_date = None
        db.session.commit()
    return user

# --- API 엔드포인트 ---

@app.route('/dev/add_test_users', methods=['POST'])
def add_test_users():
    today_str = date.today().isoformat()
    test_users_data = [
        {'employee_id': 'TEST001', 'nickname': '테스터1', 'lunch_preference': '가성비 추구', 'main_dish_genre': '한식'},
        {'employee_id': 'TEST002', 'nickname': '테스터2', 'lunch_preference': '대화 선호', 'main_dish_genre': '양식'},
        {'employee_id': 'TEST003', 'nickname': '테스터3', 'lunch_preference': '새로운 맛집 탐방', 'main_dish_genre': '일식'},
    ]
    for user_data in test_users_data:
        user = User.query.filter_by(employee_id=user_data['employee_id']).first()
        if not user:
            user = User(**user_data)
            db.session.add(user)
        user.matching_status = 'waiting'
        user.match_request_date = today_str
    db.session.commit()
    return jsonify({'message': '가상 유저 3명이 매칭 대기열에 추가되었습니다. 지금 바로 매칭을 요청해보세요!'})

@app.route('/events/<employee_id>', methods=['GET'])
def get_events(employee_id):
    events = {}
    parties = Party.query.filter(Party.members_employee_ids.contains(employee_id)).all()
    for p in parties:
        if p.party_date not in events:
            events[p.party_date] = []
        events[p.party_date].append({
            'type': '파티' if not p.is_from_match else '번개',
            'title': p.title,
            'restaurant': p.restaurant_name
        })
    return jsonify(events)

@app.route('/restaurants', methods=['GET'])
def get_restaurants():
    query = request.args.get('query', '')
    sort_by = request.args.get('sort_by', 'name')
    restaurants_q = Restaurant.query.filter(or_(Restaurant.name.ilike(f'%{query}%'), Restaurant.category.ilike(f'%{query}%'))).all()
    if sort_by == 'rating_desc':
        restaurants_q.sort(key=lambda r: r.avg_rating, reverse=True)
    elif sort_by == 'reviews_desc':
        restaurants_q.sort(key=lambda r: r.review_count, reverse=True)
    else:
        restaurants_q.sort(key=lambda r: r.name)
    restaurants_list = [{'id': r.id, 'name': r.name, 'category': r.category, 'rating': round(r.avg_rating, 1), 'review_count': r.review_count} for r in restaurants_q]
    return jsonify(restaurants_list)

@app.route('/restaurants/<int:restaurant_id>/reviews', methods=['GET'])
def get_reviews(restaurant_id):
    reviews = Review.query.filter_by(restaurant_id=restaurant_id).order_by(desc(Review.created_at)).all()
    return jsonify([{'id': r.id, 'nickname': r.nickname, 'rating': r.rating, 'comment': r.comment, 'created_at': r.created_at.strftime('%Y-%m-%d')} for r in reviews])

@app.route('/restaurants/<int:restaurant_id>/reviews', methods=['POST'])
def add_review(restaurant_id):
    data = request.get_json()
    user = User.query.filter_by(employee_id=data['user_id']).first()
    if not user:
        return jsonify({'message': '사용자를 찾을 수 없습니다.'}), 404
    new_review = Review(restaurant_id=restaurant_id, user_id=data['user_id'], nickname=user.nickname, rating=data['rating'], comment=data['comment'])
    db.session.add(new_review)
    db.session.commit()
    return jsonify({'message': '리뷰가 성공적으로 등록되었습니다.'}), 201

@app.route('/match/status/<employee_id>', methods=['GET'])
def get_match_status(employee_id):
    user = get_user_and_reset_status(employee_id)
    if not user:
        return jsonify({'message': '사용자를 찾을 수 없습니다.'}), 404
    response = {'status': user.matching_status}
    if user.matching_status == 'matched':
        today_str = date.today().isoformat()
        matched_party = Party.query.filter(Party.is_from_match == True, Party.party_date == today_str, Party.members_employee_ids.contains(employee_id)).first()
        if matched_party:
            response['party_id'] = matched_party.id
            response['party_title'] = matched_party.title
    return jsonify(response)

@app.route('/match/request', methods=['POST'])
def handle_match_request():
    employee_id = request.json['employee_id']
    user = get_user_and_reset_status(employee_id)
    if not user: return jsonify({'message': '사용자를 찾을 수 없습니다.'}), 404

    if user.matching_status == 'waiting':
        user.matching_status = 'idle'
        db.session.commit()
        return jsonify({'status': 'idle', 'message': '매칭 대기를 취소했습니다.'})

    if user.matching_status == 'matched':
        return jsonify({'status': 'matched', 'message': '이미 오늘 점심 매칭이 완료되었습니다.'})

    user.matching_status = 'waiting'
    user.match_request_date = date.today().isoformat()
    
    waiting_pool = User.query.filter(User.match_request_date == user.match_request_date, User.matching_status == 'waiting', User.employee_id != user.employee_id).all()
    potential_group = [user] + waiting_pool
    
    if len(potential_group) >= 2:
        group_size = min(len(potential_group), 4)
        final_group_members = random.sample(potential_group, group_size)
        member_ids = [m.employee_id for m in final_group_members]
        
        User.query.filter(User.employee_id.in_(member_ids)).update({'matching_status': 'matched'}, synchronize_session=False)
        
        lightning_party_names = ["점심 어벤져스", "오늘의 미식 탐험대", "깜짝 런치 특공대", "맛잘알 번개모임", "점심 메이트 ⚡️"]
        today_str_for_query = date.today().isoformat()
        today_lightning_count = Party.query.filter(Party.is_from_match == True, Party.party_date == today_str_for_query).count()
        party_title = f"{random.choice(lightning_party_names)} #{today_lightning_count + 1}"
        
        new_party = Party(
            host_employee_id=member_ids[0], title=party_title, restaurant_name="미정 (채팅으로 정해요!)",
            party_date=today_str_for_query, party_time="12:30", meeting_location="회사 로비",
            max_members=4, members_employee_ids=','.join(member_ids), is_from_match=True
        )
        db.session.add(new_party)
        db.session.commit()

        return jsonify({'status': 'matched', 'message': '매칭에 성공했습니다!', 'party_id': new_party.id, 'party_title': new_party.title})
    else:
        db.session.commit()
        return jsonify({'status': 'waiting', 'message': '매칭 대기열에 등록되었습니다. 동료가 생기면 알려드릴게요!'})

@app.route('/users', methods=['GET'])
def get_all_users():
    users = User.query.all()
    return jsonify([{'employee_id': u.employee_id, 'nickname': u.nickname, 'matching_status': u.matching_status, 'match_request_date': u.match_request_date} for u in users])

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

@app.route('/parties', methods=['GET'])
def get_all_parties():
    parties = Party.query.order_by(desc(Party.id)).all()
    return jsonify([{'id': p.id, 'title': p.title, 'restaurant_name': p.restaurant_name, 'current_members': p.current_members, 'max_members': p.max_members, 'is_from_match': p.is_from_match} for p in parties])

@app.route('/parties', methods=['POST'])
def create_party():
    data = request.get_json()
    new_party = Party(
        host_employee_id=data['host_employee_id'], title=data['title'], restaurant_name=data['restaurant_name'],
        party_date=data['party_date'], party_time=data['party_time'], meeting_location=data['meeting_location'],
        max_members=data['max_members'], members_employee_ids=data['host_employee_id']
    )
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

@app.route('/parties/<int:party_id>/join', methods=['POST'])
def join_party(party_id):
    party = Party.query.get(party_id)
    employee_id = request.json['employee_id']
    if party.current_members >= party.max_members:
        return jsonify({'message': '파티 인원이 가득 찼습니다.'}), 400
    if employee_id not in party.members_employee_ids.split(','):
        party.members_employee_ids += f',{employee_id}'
        db.session.commit()
    return jsonify({'message': '파티에 참여했습니다.'})

# [수정] '번개 파티'에서도 나갈 수 있도록 로직 수정
@app.route('/parties/<int:party_id>/leave', methods=['POST'])
def leave_party(party_id):
    party = Party.query.get(party_id)
    if not party:
        return jsonify({'message': '파티를 찾을 수 없습니다.'}), 404
        
    employee_id = request.json['employee_id']
    members = party.members_employee_ids.split(',')
    
    if employee_id not in members:
        return jsonify({'message': '파티 멤버가 아닙니다.'}), 400

    # 일반 파티의 파티장은 나갈 수 없음 (삭제만 가능)
    if not party.is_from_match and employee_id == party.host_employee_id:
        return jsonify({'message': '파티장은 나갈 수 없습니다. 파티를 삭제해주세요.'}), 403
    
    members.remove(employee_id)
    
    # 나간 후 멤버가 아무도 없으면 파티 삭제
    if not members:
        db.session.delete(party)
        db.session.commit()
        return jsonify({'message': '마지막 멤버가 파티를 나가서 파티가 삭제되었습니다.'})

    # 나간 사람이 번개 파티의 파티장이었다면, 다음 사람에게 파티장 위임
    if party.is_from_match and employee_id == party.host_employee_id:
        party.host_employee_id = members[0]

    party.members_employee_ids = ','.join(members)
    db.session.commit()
    return jsonify({'message': '파티에서 나갔습니다.'})

@app.route('/parties/<int:party_id>', methods=['DELETE'])
def delete_party(party_id):
    party = Party.query.get(party_id)
    if not party: return jsonify({'message': '파티를 찾을 수 없습니다.'}), 404
    employee_id = request.json['employee_id']
    if employee_id != party.host_employee_id:
        return jsonify({'message': '파티장만 삭제할 수 있습니다.'}), 403
    db.session.delete(party)
    db.session.commit()
    return jsonify({'message': '파티가 삭제되었습니다.'})

@app.route('/chats/<employee_id>', methods=['GET'])
def get_my_chats(employee_id):
    chat_list = []
    joined_parties = Party.query.filter(Party.members_employee_ids.contains(employee_id)).order_by(desc(Party.id)).all()
    for party in joined_parties:
        chat_list.append({'id': party.id, 'type': 'party', 'title': party.title, 'subtitle': f"{party.restaurant_name} | {party.current_members}/{party.max_members}명"})
    return jsonify(chat_list)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)


