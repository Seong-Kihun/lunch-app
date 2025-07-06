from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS # CORS 허용을 위해 추가
import random # random 모듈 사용을 위해 추가
import time # time 모듈 사용을 위해 추가 (매칭 요청 시간 기록)

app = Flask(__name__)
CORS(app) # 모든 경로에서 CORS 허용 (개발 단계에서만 사용)
# 나중에 실제 배포 시에는 CORS(app, resources={r"/api/*": {"origins": "https://yourfrontend.com"}}) 처럼 특정 도메인만 허용하도록 변경합니다.

# SQLite 데이터베이스 설정
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///site.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# 데이터베이스 모델 정의
class Restaurant(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    rating = db.Column(db.Float, nullable=False)
    address = db.Column(db.String(200), nullable=True)
    phone = db.Column(db.String(20), nullable=True)
    description = db.Column(db.Text, nullable=True)

    def __repr__(self):
        return f"Restaurant('{self.name}', '{self.category}', {self.rating})"

# User 모델 정의 - gender, age_group, main_dish_genre, is_matching_available, last_match_request 추가
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.String(50), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    department = db.Column(db.String(100), nullable=True)
    lunch_preference = db.Column(db.String(200), nullable=True)
    gender = db.Column(db.String(10), nullable=True)
    age_group = db.Column(db.String(20), nullable=True)
    main_dish_genre = db.Column(db.String(50), nullable=True) # 주종목 추가
    is_matching_available = db.Column(db.Boolean, default=False) # 매칭 가능 상태
    last_match_request = db.Column(db.Float, nullable=True) # 마지막 매칭 요청 시간 (timestamp)

    def __repr__(self):
        return f"User('{self.employee_id}', '{self.name}', available={self.is_matching_available})"

# Party 모델 정의 (변경 없음)
class Party(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    host_employee_id = db.Column(db.String(50), nullable=False)
    title = db.Column(db.String(100), nullable=False)
    restaurant_name = db.Column(db.String(100), nullable=False)
    party_date = db.Column(db.String(20), nullable=False)
    party_time = db.Column(db.String(10), nullable=False)
    max_members = db.Column(db.Integer, nullable=False, default=2)
    current_members = db.Column(db.Integer, nullable=False, default=1)
    members_employee_ids = db.Column(db.Text, default='')

    def __repr__(self):
        return f"Party('{self.title}', '{self.restaurant_name}', '{self.party_date}')"

# Flask 앱 시작 전에 데이터베이스 테이블을 생성합니다.
@app.before_request
def create_tables():
    if not hasattr(app, '_db_created'):
        with app.app_context():
            db.create_all()
            app._db_created = True

# 기본 페이지 라우트
@app.route('/')
def hello_world():
    return '안녕하세요! 점심엔 코카인 서버에 오신 것을 환영합니다!'

# 데이터베이스 초기화 및 맛집/사용자 데이터 추가
@app.route('/init_db')
def init_db_route():
    with app.app_context():
        db.drop_all()
        db.create_all()

        # 새로운 맛집 데이터 추가
        restaurant1 = Restaurant(name='한식 뚝배기집', category='한식', rating=4.5, address='서울시 강남구 테헤란로 123', phone='02-1234-5678', description='따뜻한 국물이 일품인 한식당')
        restaurant2 = Restaurant(name='퓨전 파스타', category='양식', rating=4.0, address='서울시 서초구 서초대로 456', phone='02-9876-5432', description='트렌디하고 맛있는 파스타 전문점')
        restaurant3 = Restaurant(name='시원한 막국수', category='한식', rating=3.8, address='서울시 종로구 종로 789', phone='02-1111-2222', description='여름에 시원하게 즐기는 막국수 맛집')
        restaurant4 = Restaurant(name='중국집 왕룡', category='중식', rating=4.2, address='서울시 영등포구 여의대로 1', phone='02-3333-4444', description='짜장면과 탕수육이 맛있는 중식당')
        db.session.add_all([restaurant1, restaurant2, restaurant3, restaurant4])

        # 초기 사용자 데이터 추가 (테스트용) - is_matching_available 초기값은 True로 변경
        user1 = User(employee_id='KOICA001', name='홍길동', department='기획팀', lunch_preference='조용한 식사', gender='남', age_group='20대', main_dish_genre='한식', is_matching_available=True, last_match_request=time.time())
        user2 = User(employee_id='KOICA002', name='김철수', department='개발팀', lunch_preference='새로운 맛집 탐방', gender='남', age_group='30대', main_dish_genre='양식', is_matching_available=True, last_match_request=time.time())
        user3 = User(employee_id='KOICA003', name='이영희', department='인사팀', lunch_preference='대화 선호', gender='여', age_group='20대', main_dish_genre='일식', is_matching_available=True, last_match_request=time.time())
        user4 = User(employee_id='KOICA004', name='박지수', department='홍보팀', lunch_preference='조용한 식사', gender='여', age_group='20대', main_dish_genre='한식', is_matching_available=True, last_match_request=time.time())
        db.session.add_all([user1, user2, user3, user4])

        db.session.commit()
        return '데이터베이스 초기화 및 맛집/사용자 데이터 추가 완료!'

# 맛집 정보를 가져오는 API (변경 없음)
@app.route('/restaurants', methods=['GET'])
def get_restaurants():
    all_restaurants = Restaurant.query.all()
    output = []
    for restaurant in all_restaurants:
        output.append({
            'id': restaurant.id, 'name': restaurant.name, 'category': restaurant.category,
            'rating': restaurant.rating, 'address': restaurant.address,
            'phone': restaurant.phone, 'description': restaurant.description
        })
    return jsonify(output)

# 사용자 등록 및 프로필 설정 (gender, age_group, main_dish_genre 처리 추가)
@app.route('/users', methods=['POST'])
def create_user():
    data = request.get_json()
    if not data or not 'employee_id' in data or not 'name' in data:
        return jsonify({'message': '사번과 이름은 필수입니다!'}), 400

    if User.query.filter_by(employee_id=data['employee_id']).first():
        return jsonify({'message': '이미 등록된 사번입니다.'}), 409

    new_user = User(
        employee_id=data['employee_id'],
        name=data['name'],
        department=data.get('department'),
        lunch_preference=data.get('lunch_preference'),
        gender=data.get('gender'),
        age_group=data.get('age_group'),
        main_dish_genre=data.get('main_dish_genre'), # 추가
        is_matching_available=False, # 초기값은 False
        last_match_request=None # 초기값은 None
    )
    db.session.add(new_user)
    db.session.commit()
    return jsonify({'message': '사용자 등록 및 프로필 설정 완료!', 'user_id': new_user.id}), 201

# 특정 사용자 프로필 조회 (gender, age_group, main_dish_genre 반환 추가)
@app.route('/users/<employee_id>', methods=['GET'])
def get_user(employee_id):
    user = User.query.filter_by(employee_id=employee_id).first()
    if not user:
        return jsonify({'message': '사용자를 찾을 수 없습니다.'}), 404

    user_data = {
        'id': user.id, 'employee_id': user.employee_id, 'name': user.name,
        'department': user.department, 'lunch_preference': user.lunch_preference,
        'gender': user.gender, 'age_group': user.age_group,
        'main_dish_genre': user.main_dish_genre # 추가
    }
    return jsonify(user_data)

# 사용자 프로필 업데이트 (gender, age_group, main_dish_genre 처리 추가)
@app.route('/users/<employee_id>', methods=['PUT'])
def update_user(employee_id):
    user = User.query.filter_by(employee_id=employee_id).first()
    if not user:
        return jsonify({'message': '사용자를 찾을 수 없습니다.'}), 404

    data = request.get_json()
    user.name = data.get('name', user.name)
    user.department = data.get('department', user.department)
    user.lunch_preference = data.get('lunch_preference', user.lunch_preference)
    user.gender = data.get('gender', user.gender)
    user.age_group = data.get('age_group', user.age_group)
    user.main_dish_genre = data.get('main_dish_genre', user.main_dish_genre) # 추가
    db.session.commit()
    return jsonify({'message': '사용자 프로필 업데이트 완료!'})

# 모든 사용자 조회 (gender, age_group, main_dish_genre 반환 추가)
@app.route('/users', methods=['GET'])
def get_all_users():
    users = User.query.all()
    output = []
    for user in users:
        output.append({
            'id': user.id, 'employee_id': user.employee_id, 'name': user.name,
            'department': user.department, 'lunch_preference': user.lunch_preference,
            'gender': user.gender, 'age_group': user.age_group,
            'main_dish_genre': user.main_dish_genre # 추가
        })
    return jsonify(output)

# 파티 생성, 조회, 참여 API는 변경 없음

@app.route('/parties', methods=['POST'])
def create_party():
    data = request.get_json()
    required_fields = ['host_employee_id', 'title', 'restaurant_name', 'party_date', 'party_time', 'max_members']
    if not all(field in data for field in required_fields):
        return jsonify({'message': '필수 필드가 누락되었습니다.'}), 400

    host_user = User.query.filter_by(employee_id=data['host_employee_id']).first()
    if not host_user:
        return jsonify({'message': '파티장을 찾을 수 없습니다. 먼저 사용자 프로필을 등록해주세요.'}), 404

    new_party = Party(
        host_employee_id=data['host_employee_id'],
        title=data['title'],
        restaurant_name=data['restaurant_name'],
        party_date=data['party_date'],
        party_time=data['party_time'],
        max_members=data['max_members'],
        current_members=1,
        members_employee_ids=data['host_employee_id']
    )
    db.session.add(new_party)
    db.session.commit()
    return jsonify({'message': '파티 생성 완료!', 'party_id': new_party.id}), 201

@app.route('/parties', methods=['GET'])
def get_all_parties():
    parties = Party.query.all()
    output = []
    for party in parties:
        output.append({
            'id': party.id, 'host_employee_id': party.host_employee_id, 'title': party.title,
            'restaurant_name': party.restaurant_name, 'party_date': party.party_date,
            'party_time': party.party_time, 'max_members': party.max_members,
            'current_members': party.current_members,
            'members_employee_ids': party.members_employee_ids.split(',') if party.members_employee_ids else []
        })
    return jsonify(output)

@app.route('/parties/<int:party_id>', methods=['GET'])
def get_party(party_id):
    party = Party.query.get(party_id)
    if not party:
        return jsonify({'message': '파티를 찾을 수 없습니다.'}), 404
    
    party_data = {
        'id': party.id, 'host_employee_id': party.host_employee_id, 'title': party.title,
        'restaurant_name': party.restaurant_name, 'party_date': party.party_date,
        'party_time': party.party_time, 'max_members': party.max_members,
        'current_members': party.current_members,
        'members_employee_ids': party.members_employee_ids.split(',') if party.members_employee_ids else []
    }
    return jsonify(party_data)

@app.route('/parties/<int:party_id>/join', methods=['POST'])
def join_party(party_id):
    data = request.get_json()
    joiner_employee_id = data.get('employee_id')

    if not joiner_employee_id:
        return jsonify({'message': '사번이 필요합니다.'}), 400

    party = Party.query.get(party_id)
    if not party:
        return jsonify({'message': '파티를 찾을 수 없습니다.'}), 404
    
    if party.current_members >= party.max_members:
        return jsonify({'message': '파티 인원이 가득 찼습니다.'}), 400

    members = party.members_employee_ids.split(',') if party.members_employee_ids else []
    if joiner_employee_id in members:
        return jsonify({'message': '이미 파티에 참여 중입니다.'}), 400

    members.append(joiner_employee_id)
    party.members_employee_ids = ','.join(members)
    party.current_members += 1
    db.session.commit()
    return jsonify({'message': '파티 참여 완료!'})

# --- 매칭 요청 및 그룹 매칭 로직 (새로운 로직) ---

# 1. 사용자가 매칭을 요청 (매칭 가능 상태로 변경)
@app.route('/match/request', methods=['POST'])
def request_match():
    data = request.get_json()
    employee_id = data.get('employee_id')

    if not employee_id:
        return jsonify({'message': '사번이 필요합니다.'}), 400

    user = User.query.filter_by(employee_id=employee_id).first()
    if not user:
        return jsonify({'message': '등록되지 않은 사용자입니다. 먼저 프로필을 설정해주세요.'}), 404
    
    # 사용자의 매칭 가능 상태를 True로 업데이트하고 마지막 요청 시간 기록
    user.is_matching_available = True
    user.last_match_request = time.time()
    db.session.commit()
    
    print(f"--- 디버그: {employee_id} 매칭 요청 접수됨 ---") # 디버그
    return jsonify({'message': '매칭 요청이 접수되었습니다. 매칭 상대를 찾는 중...'}), 200

# 2. 매칭 풀에서 그룹 매칭 시도 (실제 매칭 로직)
@app.route('/match/find_group', methods=['POST'])
def find_match_group():
    data = request.get_json()
    requester_employee_id = data.get('employee_id')

    if not requester_employee_id:
        return jsonify({'message': '사번이 필요합니다.'}), 400

    requester = User.query.filter_by(employee_id=requester_employee_id).first()
    if not requester:
        return jsonify({'message': '등록되지 않은 사용자입니다. 먼저 프로필을 설정해주세요.'}), 404

    # 매칭 요청자를 매칭 가능한 상태로 설정 (혹시 풀에 없다면)
    requester.is_matching_available = True
    requester.last_match_request = time.time()
    db.session.commit()

    # 현재 매칭 가능한 모든 사용자 (자신 포함, 너무 오래된 요청 제외)
    current_time = time.time()
    available_users_for_match = User.query.filter(
        User.is_matching_available == True,
        User.last_match_request >= (current_time - 300) # 5분 이내 요청만 유효
    ).all()
    
    # 요청자 자신을 potential_group의 첫 번째 멤버로 추가
    potential_group = [requester]
    
    # 나머지 매칭 가능한 사용자들 (요청자 제외)
    other_available_users = [
        u for u in available_users_for_match
        if u.employee_id != requester_employee_id
    ]

    # 1차: 성향 기반 매칭 (우선 순위)
    # requester와 lunch_preference가 동일한 사람을 우선 찾습니다.
    similar_users = [
        u for u in other_available_users
        if u.lunch_preference and requester.lunch_preference and u.lunch_preference == requester.lunch_preference
    ]
    random.shuffle(similar_users) # 유사 성향 사용자 섞기

    for user in similar_users:
        if len(potential_group) < 4: # 최대 4명까지
            potential_group.append(user)
        else:
            break
    
    # 2차: 부족한 인원 무작위로 채우기 (성향 무관)
    # 아직 그룹이 4명 미만이고, 다른 매칭 가능한 사용자(유사 성향으로 뽑히지 않은)가 있다면 추가
    random_users = [
        u for u in other_available_users
        if u not in similar_users and u.employee_id != requester_employee_id
    ]
    random.shuffle(random_users)

    for user in random_users:
        if len(potential_group) < 4:
            potential_group.append(user)
        else:
            break
    
    # 최소 2명 ~ 최대 4명 그룹 구성
    if len(potential_group) < 2:
        print(f"--- 디버그: 매칭 가능한 인원 부족 (현재 {len(potential_group)}명) ---") # 디버그
        return jsonify({'message': '현재 매칭 가능한 인원이 부족합니다. 잠시 후 다시 시도해주세요.'}), 404
    
    # 매칭된 사용자들의 is_matching_available 상태를 False로 변경
    for member in potential_group:
        member.is_matching_available = False
        db.session.commit() # 변경사항 저장

    # 매칭된 그룹 정보 반환 (부분 정보 공개)
    matched_group_info = []
    for member in potential_group:
        # 성별, 연령대, 식사 성향, 주종목 중 2가지만 랜덤으로 공개
        profile_fields = []
        if member.gender: profile_fields.append({'key': 'gender', 'value': member.gender})
        if member.age_group: profile_fields.append({'key': 'age_group', 'value': member.age_group})
        if member.lunch_preference: profile_fields.append({'key': 'lunch_preference', 'value': member.lunch_preference})
        if member.main_dish_genre: profile_fields.append({'key': 'main_dish_genre', 'value': member.main_dish_genre}) # 주종목 추가

        random.shuffle(profile_fields) # 필드 순서 섞기
        
        displayed_info = {}
        for i in range(min(2, len(profile_fields))): # 최대 2개만 선택
            # key 이름을 좀 더 친근하게 변경
            display_name = ''
            if profile_fields[i]['key'] == 'gender': display_name = '성별'
            elif profile_fields[i]['key'] == 'age_group': display_name = '연령대'
            elif profile_fields[i]['key'] == 'lunch_preference': display_name = '성향'
            elif profile_fields[i]['key'] == 'main_dish_genre': display_name = '주종목'
            
            displayed_info[display_name] = profile_fields[i]['value']
        
        matched_group_info.append({
            'employee_id': member.employee_id, # 사번 (내부적으로 필요)
            'name': member.name, # 이름 (매칭 결과에는 공개 안 함, 최종 채팅방에서 공개)
            'displayed_info': displayed_info # 공개될 정보
        })
    
    print(f"--- 디버그: 매칭 그룹 구성 완료. 그룹 크기: {len(matched_group_info)} ---") # 디버그
    return jsonify({
        'message': '매칭 그룹이 구성되었습니다!',
        'group': matched_group_info
    }), 200

# 3. 매칭 수락/취소 (is_matching_available 상태 변경)
@app.route('/match/confirm', methods=['POST'])
def confirm_match():
    data = request.get_json()
    employee_id = data.get('employee_id')
    group_members_ids = data.get('group_members_ids', [])

    if not employee_id:
        return jsonify({'message': '사번이 필요합니다.'}), 400
    
    # 참여 확정한 사용자들의 is_matching_available 상태를 False로 변경
    # (find_group에서 이미 false로 변경했지만, 혹시 모를 재확인)
    with app.app_context():
        # 그룹 멤버들 모두 is_matching_available = False로
        for member_id in group_members_ids:
            user = User.query.filter_by(employee_id=member_id).first()
            if user:
                user.is_matching_available = False
        db.session.commit()
    
    return jsonify({'message': '매칭 확인 완료!'}), 200

@app.route('/match/cancel', methods=['POST'])
def cancel_match():
    data = request.get_json()
    employee_id = data.get('employee_id')

    if not employee_id:
        return jsonify({'message': '사번이 필요합니다.'}), 400
    
    # 매칭 취소한 사용자의 is_matching_available 상태를 False로 변경
    with app.app_context():
        user = User.query.filter_by(employee_id=employee_id).first()
        if user:
            user.is_matching_available = False
            db.session.commit()
    
    return jsonify({'message': '매칭 취소 완료!'}), 200

# --- 매칭 요청 및 그룹 매칭 로직 끝 ---

# 이 파일을 직접 실행했을 때만 서버를 시작하게 합니다.
if __name__ == '__main__':
    app.run(debug=True)
