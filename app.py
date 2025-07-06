from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import random
import time

app = Flask(__name__)
CORS(app)

# Database Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///site.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# --- Database Models ---
class Restaurant(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    rating = db.Column(db.Float, nullable=False)
    address = db.Column(db.String(200), nullable=True)
    phone = db.Column(db.String(20), nullable=True)
    description = db.Column(db.Text, nullable=True)

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

class MatchGroup(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    member_employee_ids = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default='pending_confirmation', nullable=False)
    created_at = db.Column(db.Float, default=time.time, nullable=False)
    rejected_by_employee_ids = db.Column(db.Text, default='')

# --- Basic Setup & DB Initialization ---
@app.before_request
def create_tables():
    # Creates DB tables before the first request
    if not hasattr(app, '_db_created'):
        with app.app_context():
            db.create_all()
            app._db_created = True

@app.route('/')
def hello_world():
    return '안녕하세요! 점심엔 코카인 서버에 오신 것을 환영합니다!'

@app.route('/init_db')
def init_db_route():
    # Initializes the database with sample data
    with app.app_context():
        db.drop_all()
        db.create_all()
        
        # Sample Restaurants
        restaurant1 = Restaurant(name='한식 뚝배기집', category='한식', rating=4.5, address='서울시 강남구 테헤란로 123', phone='02-1234-5678', description='따뜻한 국물이 일품인 한식당')
        restaurant2 = Restaurant(name='퓨전 파스타', category='양식', rating=4.0, address='서울시 서초구 서초대로 456', phone='02-9876-5432', description='트렌디하고 맛있는 파스타 전문점')
        db.session.add_all([restaurant1, restaurant2])

        # Sample Users
        user1 = User(employee_id='KOICA001', nickname='홍길동', name='홍길동', department='기획팀', lunch_preference='조용한 식사,가성비 추구', gender='남', age_group='20대', main_dish_genre='한식,분식')
        user2 = User(employee_id='KOICA002', nickname='김철수', name='김철수', department='개발팀', lunch_preference='새로운 맛집 탐방,대화 선호', gender='남', age_group='30대', main_dish_genre='양식,퓨전')
        user3 = User(employee_id='KOICA003', nickname='이영희', name='이영희', department='인사팀', lunch_preference='대화 선호,여유로운 식사', gender='여', age_group='20대', main_dish_genre='일식,아시안')
        db.session.add_all([user1, user2, user3])
        
        db.session.commit()
        return '데이터베이스 초기화 및 맛집/사용자 데이터 추가 완료!'

# --- User, Restaurant, Party, Match APIs (Most are unchanged) ---
# (The existing APIs for creating/getting users, restaurants, parties, and matching logic are here)
@app.route('/restaurants', methods=['GET'])
def get_restaurants():
    all_restaurants = Restaurant.query.all()
    output = []
    for r in all_restaurants:
        output.append({'id': r.id, 'name': r.name, 'category': r.category, 'rating': r.rating, 'description': r.description})
    return jsonify(output)

@app.route('/users', methods=['GET'])
def get_all_users():
    users = User.query.all()
    output = []
    for u in users:
        output.append({'employee_id': u.employee_id, 'nickname': u.nickname})
    return jsonify(output)

# ... other existing APIs ...

# --- NEW & MODIFIED APIs for Chat Features ---

# [MODIFIED] Get Party Details - Now includes member nicknames
@app.route('/parties/<int:party_id>', methods=['GET'])
def get_party(party_id):
    party = Party.query.get(party_id)
    if not party:
        return jsonify({'message': '파티를 찾을 수 없습니다.'}), 404
    
    member_ids = party.members_employee_ids.split(',') if party.members_employee_ids else []
    members_details = []
    for emp_id in member_ids:
        user = User.query.filter_by(employee_id=emp_id).first()
        if user:
            members_details.append({'employee_id': user.employee_id, 'nickname': user.nickname})

    party_data = {
        'id': party.id, 'host_employee_id': party.host_employee_id, 'title': party.title,
        'restaurant_name': party.restaurant_name, 'party_date': party.party_date,
        'party_time': party.party_time, 'max_members': party.max_members,
        'current_members': party.current_members, 'meeting_location': party.meeting_location,
        'members': members_details # Return detailed member info
    }
    return jsonify(party_data)

# [NEW] Leave Party API
@app.route('/parties/<int:party_id>/leave', methods=['POST'])
def leave_party(party_id):
    party = Party.query.get(party_id)
    data = request.get_json()
    employee_id = data.get('employee_id')

    if not party or not employee_id:
        return jsonify({'message': '파티 또는 사용자 정보가 올바르지 않습니다.'}), 400

    if employee_id == party.host_employee_id:
        return jsonify({'message': '파티장은 파티를 나갈 수 없습니다. 대신 파티를 삭제해주세요.'}), 403

    members = party.members_employee_ids.split(',')
    if employee_id in members:
        members.remove(employee_id)
        party.members_employee_ids = ','.join(members)
        party.current_members = len(members)
        db.session.commit()
        return jsonify({'message': '파티에서 나갔습니다.'}), 200
    else:
        return jsonify({'message': '참여 중인 파티가 아닙니다.'}), 400

# [NEW] Delete Party API (Host only)
@app.route('/parties/<int:party_id>', methods=['DELETE'])
def delete_party(party_id):
    party = Party.query.get(party_id)
    data = request.get_json()
    employee_id = data.get('employee_id')

    if not party or not employee_id:
        return jsonify({'message': '파티 또는 사용자 정보가 올바르지 않습니다.'}), 400
    
    if employee_id != party.host_employee_id:
        return jsonify({'message': '파티장만 파티를 삭제할 수 있습니다.'}), 403

    db.session.delete(party)
    db.session.commit()
    return jsonify({'message': '파티가 삭제되었습니다.'}), 200

# [NEW] Get All My Chats API (Unified)
@app.route('/chats/<employee_id>', methods=['GET'])
def get_my_chats(employee_id):
    if not User.query.filter_by(employee_id=employee_id).first():
        return jsonify({'message': '사용자를 찾을 수 없습니다.'}), 404

    chat_list = []

    # 1. Find confirmed match groups I'm in
    confirmed_groups = MatchGroup.query.filter(
        MatchGroup.status == 'confirmed',
        MatchGroup.member_employee_ids.contains(employee_id)
    ).all()
    for group in confirmed_groups:
        chat_list.append({
            'id': group.id,
            'type': 'match',
            'title': f"점심 매칭 그룹",
            'subtitle': f"{len(group.member_employee_ids.split(','))}명 참여 중"
        })

    # 2. Find parties I've joined
    joined_parties = Party.query.filter(
        Party.members_employee_ids.contains(employee_id)
    ).all()
    for party in joined_parties:
        chat_list.append({
            'id': party.id,
            'type': 'party',
            'title': party.title,
            'subtitle': f"{party.restaurant_name} | {party.current_members}/{party.max_members}명"
        })
    
    return jsonify(chat_list)

# (All other existing APIs for user profiles, matching, etc. are still here)
# ...

if __name__ == '__main__':
    app.run(debug=True)
