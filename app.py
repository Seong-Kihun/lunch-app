from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import random
import time

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
        restaurant1 = Restaurant(name='한식 뚝배기집', category='한식', rating=4.5, address='서울시 강남구 테헤란로 123', phone='02-1234-5678', description='따뜻한 국물이 일품인 한식당')
        restaurant2 = Restaurant(name='퓨전 파스타', category='양식', rating=4.0, address='서울시 서초구 서초대로 456', phone='02-9876-5432', description='트렌디하고 맛있는 파스타 전문점')
        db.session.add_all([restaurant1, restaurant2])
        user1 = User(employee_id='KOICA001', nickname='홍길동', name='홍길동', department='기획팀', lunch_preference='조용한 식사,가성비 추구', gender='남', age_group='20대', main_dish_genre='한식,분식')
        user2 = User(employee_id='KOICA002', nickname='김철수', name='김철수', department='개발팀', lunch_preference='새로운 맛집 탐방,대화 선호', gender='남', age_group='30대', main_dish_genre='양식,퓨전')
        db.session.add_all([user1, user2])
        db.session.commit()
        return '데이터베이스 초기화 및 맛집/사용자 데이터 추가 완료!'

# --- User APIs ---
@app.route('/users', methods=['POST'])
def create_user():
    data = request.get_json()
    if not data or not 'employee_id' in data or not 'nickname' in data:
        return jsonify({'message': '사번과 닉네임은 필수입니다!'}), 400
    if User.query.filter_by(employee_id=data['employee_id']).first():
        return jsonify({'message': '이미 등록된 사번입니다.'}), 409
    new_user = User(
        employee_id=data['employee_id'], nickname=data.get('nickname'),
        name=data.get('name'), department=data.get('department'),
        lunch_preference=data.get('lunch_preference'), gender=data.get('gender'),
        age_group=data.get('age_group'), main_dish_genre=data.get('main_dish_genre')
    )
    db.session.add(new_user)
    db.session.commit()
    return jsonify({'message': '사용자 등록이 완료되었습니다.'}), 201

@app.route('/users/<employee_id>', methods=['GET'])
def get_user(employee_id):
    user = User.query.filter_by(employee_id=employee_id).first()
    if not user: return jsonify({'message': '사용자를 찾을 수 없습니다.'}), 404
    user_data = {
        'employee_id': user.employee_id, 'nickname': user.nickname, 'name': user.name,
        'department': user.department, 'lunch_preference': user.lunch_preference,
        'gender': user.gender, 'age_group': user.age_group, 'main_dish_genre': user.main_dish_genre
    }
    return jsonify(user_data)

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

@app.route('/users', methods=['GET'])
def get_all_users():
    users = User.query.all()
    return jsonify([{'employee_id': u.employee_id, 'nickname': u.nickname} for u in users])

# --- Restaurant API ---
@app.route('/restaurants', methods=['GET'])
def get_restaurants():
    restaurants = Restaurant.query.all()
    return jsonify([{'id': r.id, 'name': r.name, 'category': r.category, 'rating': r.rating, 'description': r.description} for r in restaurants])

# --- Party APIs ---
@app.route('/parties', methods=['GET'])
def get_all_parties():
    parties = Party.query.all()
    return jsonify([{
        'id': p.id, 'title': p.title, 'restaurant_name': p.restaurant_name,
        'current_members': p.current_members, 'max_members': p.max_members
    } for p in parties])

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
    party_data = {
        'id': party.id, 'host_employee_id': party.host_employee_id, 'title': party.title,
        'restaurant_name': party.restaurant_name, 'max_members': party.max_members,
        'current_members': party.current_members, 'members': members_details
    }
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
    if request.json['employee_id'] != party.host_employee_id: return jsonify({'message': '파티장만 삭제할 수 있습니다.'}), 403
    db.session.delete(party)
    db.session.commit()
    return jsonify({'message': '파티가 삭제되었습니다.'})

# --- Match APIs ---
@app.route('/match/request', methods=['POST'])
def request_match():
    user = User.query.filter_by(employee_id=request.json['employee_id']).first()
    if not user: return jsonify({'message': '사용자를 찾을 수 없습니다.'}), 404
    user.is_matching_available = True
    user.last_match_request = time.time()
    db.session.commit()
    return jsonify({'message': '매칭 요청이 접수되었습니다.'})

@app.route('/match/find_group', methods=['POST'])
def find_match_group():
    requester_id = request.json['employee_id']
    current_time = time.time()
    available_users = User.query.filter(User.is_matching_available == True, User.last_match_request >= (current_time - 300)).all()
    if len(available_users) < 2: return jsonify({'message': '현재 매칭 가능한 인원이 부족합니다.'}), 200 # 성공 응답이나 메시지로 실패 전달
    
    potential_group = random.sample([u for u in available_users if u.employee_id != requester_id], min(len(available_users) - 1, 3))
    requester = User.query.filter_by(employee_id=requester_id).first()
    potential_group.append(requester)
    
    group_member_ids = [u.employee_id for u in potential_group]
    new_group = MatchGroup(member_employee_ids=','.join(group_member_ids), status='pending_confirmation')
    db.session.add(new_group)
    for user in potential_group: user.is_matching_available = False
    db.session.commit()
    
    group_info = [{'employee_id': u.employee_id, 'nickname': u.nickname, 'displayed_info': {'성향': u.lunch_preference.split(',')[0], '주종목': u.main_dish_genre.split(',')[0]}} for u in potential_group]
    return jsonify({'message': '매칭 그룹이 구성되었습니다!', 'group_id': new_group.id, 'group': group_info})

@app.route('/match/confirm', methods=['POST'])
def confirm_match():
    group = MatchGroup.query.get(request.json['group_id'])
    if not group: return jsonify({'message': '그룹을 찾을 수 없습니다.'}), 404
    group.status = 'confirmed'
    db.session.commit()
    return jsonify({'message': '매칭이 확정되었습니다.'})

@app.route('/match/cancel', methods=['POST'])
def cancel_match():
    group = MatchGroup.query.get(request.json['group_id'])
    if not group: return jsonify({'message': '그룹을 찾을 수 없습니다.'}), 404
    group.status = 'cancelled'
    db.session.commit()
    return jsonify({'message': '매칭이 취소되었습니다.'})

@app.route('/match/group/<int:group_id>', methods=['GET'])
def get_match_group(group_id):
    group = MatchGroup.query.get(group_id)
    if not group: return jsonify({'message': '그룹을 찾을 수 없습니다.'}), 404
    member_ids = group.member_employee_ids.split(',')
    members = [{'employee_id': u.employee_id, 'nickname': u.nickname} for u in User.query.filter(User.employee_id.in_(member_ids)).all()]
    return jsonify({'group_id': group.id, 'status': group.status, 'members': members})

# --- Chat API ---
@app.route('/chats/<employee_id>', methods=['GET'])
def get_my_chats(employee_id):
    chat_list = []
    confirmed_groups = MatchGroup.query.filter(MatchGroup.status == 'confirmed', MatchGroup.member_employee_ids.contains(employee_id)).all()
    for group in confirmed_groups:
        chat_list.append({'id': group.id, 'type': 'match', 'title': f"점심 매칭 그룹", 'subtitle': f"{len(group.member_employee_ids.split(','))}명 참여"})
    joined_parties = Party.query.filter(Party.members_employee_ids.contains(employee_id)).all()
    for party in joined_parties:
        chat_list.append({'id': party.id, 'type': 'party', 'title': party.title, 'subtitle': f"{party.restaurant_name} | {party.current_members}/{party.max_members}명"})
    return jsonify(chat_list)

# --- Run Server ---
if __name__ == '__main__':
    app.run(debug=True)
