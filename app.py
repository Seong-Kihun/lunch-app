from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import random
import time
from datetime import datetime
from sqlalchemy import func

app = Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///site.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# --- Database Models ---
class Restaurant(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    address = db.Column(db.String(200), nullable=True)
    phone = db.Column(db.String(20), nullable=True)
    description = db.Column(db.Text, nullable=True)
    reviews = db.relationship('Review', backref='restaurant', lazy=True, cascade="all, delete-orphan")

class Review(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    restaurant_id = db.Column(db.Integer, db.ForeignKey('restaurant.id'), nullable=False)
    user_id = db.Column(db.String(50), nullable=False)
    nickname = db.Column(db.String(50), nullable=False)
    rating = db.Column(db.Integer, nullable=False)
    comment = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.String(50), unique=True, nullable=False)
    nickname = db.Column(db.String(50), nullable=True)
    name = db.Column(db.String(100), nullable=True)
    department = db.Column(db.String(100), nullable=True)
    lunch_preference = db.Column(db.String(200), nullable=True)
    gender = db.Column(db.String(10), nullable=True)
    age_group = db.Column(db.String(20), nullable=True)
    main_dish_genre = db.Column(db.String(100), nullable=True)
    is_matching_available = db.Column(db.Boolean, default=False)
    last_match_request = db.Column(db.Float, nullable=True)

class Party(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    host_employee_id = db.Column(db.String(50), nullable=False)
    title = db.Column(db.String(100), nullable=False)
    restaurant_name = db.Column(db.String(100), nullable=False)
    party_date = db.Column(db.String(20), nullable=False)
    party_time = db.Column(db.String(10), nullable=False)
    meeting_location = db.Column(db.String(200), nullable=True)
    max_members = db.Column(db.Integer, nullable=False, default=2)
    current_members = db.Column(db.Integer, nullable=False, default=1)
    members_employee_ids = db.Column(db.Text, default='')
    is_from_match = db.Column(db.Boolean, default=False)

class MatchGroup(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    member_employee_ids = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default='pending_confirmation', nullable=False)
    created_at = db.Column(db.Float, default=time.time, nullable=False)

# --- Basic Setup & DB Initialization ---
@app.before_request
def create_tables():
    if not hasattr(app, '_db_created'):
        with app.app_context():
            db.create_all()
            app._db_created = True

@app.route('/')
def hello_world():
    return '안녕하세요! 점심엔 코카인 서버에 오신 것을 환영합니다!'

@app.route('/init_db')
def init_db_route():
    with app.app_context():
        db.drop_all()
        db.create_all()
        # Sample Restaurants
        r1 = Restaurant(name='한식 뚝배기집', category='한식', description='따뜻한 국물이 일품인 한식당')
        r2 = Restaurant(name='퓨전 파스타', category='양식', description='트렌디하고 맛있는 파스타 전문점')
        r3 = Restaurant(name='시원한 막국수', category='한식', description='여름에 시원하게 즐기는 막국수 맛집')
        r4 = Restaurant(name='중국집 왕룡', category='중식', description='짜장면과 탕수육이 맛있는 중식당')
        db.session.add_all([r1, r2, r3, r4])
        # Sample Users
        u1 = User(employee_id='KOICA001', nickname='홍길동', department='기획팀', lunch_preference='조용한 식사,가성비 추구', gender='남', age_group='30대', main_dish_genre='한식,분식')
        u2 = User(employee_id='KOICA002', nickname='김철수', department='개발팀', lunch_preference='새로운 맛집 탐방,대화 선호', gender='남', age_group='30대', main_dish_genre='양식,퓨전')
        u3 = User(employee_id='KOICA003', nickname='이영희', department='인사팀', lunch_preference='대화 선호,여유로운 식사', gender='여', age_group='20대', main_dish_genre='일식,아시안')
        db.session.add_all([u1, u2, u3])
        # Sample Reviews
        rev1 = Review(restaurant=r1, user_id='KOICA002', nickname='김철수', rating=5, comment='김치찌개가 정말 맛있어요!')
        rev2 = Review(restaurant=r1, user_id='KOICA003', nickname='이영희', rating=4, comment='점심으로 든든하게 먹기 좋네요.')
        rev3 = Review(restaurant=r2, user_id='KOICA001', nickname='홍길동', rating=4, comment='분위기가 좋고 파스타가 맛있어요.')
        db.session.add_all([rev1, rev2, rev3])
        db.session.commit()
        return '데이터베이스 초기화 완료!'

# --- Restaurant APIs with Review & Sorting ---
@app.route('/restaurants', methods=['GET'])
def get_restaurants():
    query = request.args.get('query', '')
    sort_by = request.args.get('sort_by', 'name')
    
    restaurants_q = Restaurant.query.filter(db.or_(Restaurant.name.ilike(f'%{query}%'), Restaurant.category.ilike(f'%{query}%')))
    
    restaurants_list = []
    for r in restaurants_q.all():
        avg_rating = db.session.query(func.avg(Review.rating)).filter(Review.restaurant_id == r.id).scalar() or 0
        review_count = db.session.query(func.count(Review.id)).filter(Review.restaurant_id == r.id).scalar() or 0
        restaurants_list.append({'id': r.id, 'name': r.name, 'category': r.category, 'rating': round(avg_rating, 1), 'review_count': review_count})

    if sort_by == 'rating_desc':
        restaurants_list.sort(key=lambda x: x['rating'], reverse=True)
    elif sort_by == 'reviews_desc':
        restaurants_list.sort(key=lambda x: x['review_count'], reverse=True)
        
    return jsonify(restaurants_list)

@app.route('/restaurants/<int:restaurant_id>/reviews', methods=['GET'])
def get_reviews(restaurant_id):
    reviews = Review.query.filter_by(restaurant_id=restaurant_id).order_by(Review.created_at.desc()).all()
    return jsonify([{'id': r.id, 'nickname': r.nickname, 'rating': r.rating, 'comment': r.comment} for r in reviews])

@app.route('/restaurants/<int:restaurant_id>/reviews', methods=['POST'])
def add_review(restaurant_id):
    data = request.get_json()
    new_review = Review(restaurant_id=restaurant_id, user_id=data['user_id'], nickname=data['nickname'], rating=data['rating'], comment=data['comment'])
    db.session.add(new_review)
    db.session.commit()
    return jsonify({'message': '리뷰가 등록되었습니다.'}), 201

# --- Match to Party Conversion ---
@app.route('/match/confirm', methods=['POST'])
def confirm_match():
    group = MatchGroup.query.get(request.json['group_id'])
    if not group: return jsonify({'message': '그룹을 찾을 수 없습니다.'}), 404
    group.status = 'confirmed'
    
    today_str = datetime.now().strftime('%m월 %d일')
    party_title = f"{today_str}의 점심 번개 ⚡️"
    first_member_id = group.member_employee_ids.split(',')[0]
    
    new_party = Party(
        host_employee_id=first_member_id, title=party_title,
        restaurant_name="미정 (채팅으로 정해주세요!)", party_date=datetime.now().strftime('%Y-%m-%d'),
        party_time="12:30", meeting_location="회사 로비",
        max_members=4, current_members=len(group.member_employee_ids.split(',')),
        members_employee_ids=group.member_employee_ids, is_from_match=True
    )
    db.session.add(new_party)
    db.session.commit()
    return jsonify({'message': '매칭이 확정되어 파티가 생성되었습니다.'})

# --- Calendar Event API ---
@app.route('/events/<employee_id>', methods=['GET'])
def get_events(employee_id):
    events = {}
    parties = Party.query.filter(Party.members_employee_ids.contains(employee_id)).all()
    for p in parties:
        if p.party_date not in events: events[p.party_date] = []
        events[p.party_date].append({'type': '파티', 'title': p.title})
    return jsonify(events)

# (All other original APIs are also here)
@app.route('/users', methods=['GET'])
def get_all_users():
    users = User.query.all()
    return jsonify([{'employee_id': u.employee_id, 'nickname': u.nickname, 'department': u.department} for u in users])

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
    parties = Party.query.all()
    return jsonify([{'id': p.id, 'title': p.title, 'restaurant_name': p.restaurant_name, 'current_members': p.current_members, 'max_members': p.max_members} for p in parties])

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
    party_data = {'id': party.id, 'host_employee_id': party.host_employee_id, 'title': party.title, 'restaurant_name': party.restaurant_name, 'party_date': party.party_date, 'party_time': party.party_time, 'meeting_location': party.meeting_location, 'max_members': party.max_members, 'current_members': party.current_members, 'members': members_details}
    return jsonify(party_data)

@app.route('/parties/<int:party_id>/join', methods=['POST'])
def join_party(party_id):
    party = Party.query.get(party_id)
    employee_id = request.json['employee_id']
    if employee_id not in party.members_employee_ids.split(','):
        party.members_employee_ids += f',{employee_id}'
        party.current_members += 1
        db.session.commit()
    return jsonify({'message': '파티에 참여했습니다.'})

@app.route('/parties/<int:party_id>/leave', methods=['POST'])
def leave_party(party_id):
    party = Party.query.get(party_id)
    employee_id = request.json['employee_id']
    if employee_id == party.host_employee_id: return jsonify({'message': '파티장은 나갈 수 없습니다.'}), 403
    members = party.members_employee_ids.split(',')
    if employee_id in members:
        members.remove(employee_id)
        party.members_employee_ids = ','.join(members)
        party.current_members -= 1
        db.session.commit()
    return jsonify({'message': '파티에서 나갔습니다.'})

@app.route('/parties/<int:party_id>', methods=['DELETE'])
def delete_party(party_id):
    party = Party.query.get(party_id)
    if not party: return jsonify({'message': '파티를 찾을 수 없습니다.'}), 404
    if request.json['employee_id'] != party.host_employee_id: return jsonify({'message': '파티장만 삭제할 수 있습니다.'}), 403
    db.session.delete(party)
    db.session.commit()
    return jsonify({'message': '파티가 삭제되었습니다.'})

@app.route('/chats/<employee_id>', methods=['GET'])
def get_my_chats(employee_id):
    chat_list = []
    joined_parties = Party.query.filter(Party.members_employee_ids.contains(employee_id)).all()
    for party in joined_parties:
        chat_list.append({'id': party.id, 'type': 'party', 'title': party.title, 'subtitle': f"{party.restaurant_name} | {party.current_members}/{party.max_members}명"})
    return jsonify(chat_list)

if __name__ == '__main__':
    app.run(debug=True)
