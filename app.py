from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import random # 무작위 선택을 위해 추가

app = Flask(__name__)
CORS(app) # 모든 경로에서 CORS 허용

# SQLite 데이터베이스 설정
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///site.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# 데이터베이스 모델 정의 (Restaurant)
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

# 데이터베이스 모델 정의 (User)
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.String(50), unique=True, nullable=False) # 사번 (고유값)
    name = db.Column(db.String(100), nullable=False) # 이름
    department = db.Column(db.String(100), nullable=True) # 부서
    lunch_preference = db.Column(db.String(200), nullable=True) # 예: 조용한 식사, 대화 선호 등

    def __repr__(self):
        return f"User('{self.employee_id}', '{self.name}')"

# Flask 앱 시작 전 데이터베이스 테이블 생성
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

# 데이터베이스 초기화 라우트
@app.route('/init_db')
def init_db_route():
    with app.app_context():
        db.drop_all()
        db.create_all()

        restaurants = [
            Restaurant(name='한식 뚝배기집', category='한식', rating=4.5, address='서울시 강남구 테헤란로 123', phone='02-1234-5678', description='따뜻한 국물이 일품인 한식당'),
            Restaurant(name='퓨전 파스타', category='양식', rating=4.0, address='서울시 서초구 서초대로 456', phone='02-9876-5432', description='트렌디하고 맛있는 파스타 전문점'),
            Restaurant(name='시원한 막국수', category='한식', rating=3.8, address='서울시 종로구 종로 789', phone='02-1111-2222', description='여름에 시원하게 즐기는 막국수 맛집'),
            Restaurant(name='중국집 왕룡', category='중식', rating=4.2, address='서울시 영등포구 여의대로 1', phone='02-3333-4444', description='짜장면과 탕수육이 맛있는 중식당')
        ]
        db.session.add_all(restaurants)
        db.session.commit()
    return '데이터베이스 초기화 및 맛집 데이터 추가 완료!'

# 모든 맛집 정보 조회 API
@app.route('/restaurants', methods=['GET'])
def get_restaurants():
    all_restaurants = Restaurant.query.all()
    output = []
    for restaurant in all_restaurants:
        restaurant_data = {
            'id': restaurant.id,
            'name': restaurant.name,
            'category': restaurant.category,
            'rating': restaurant.rating,
            'address': restaurant.address,
            'phone': restaurant.phone,
            'description': restaurant.description
        }
        output.append(restaurant_data)
    return jsonify(output)

# 사용자 등록 API
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
        lunch_preference=data.get('lunch_preference')
    )
    db.session.add(new_user)
    db.session.commit()
    return jsonify({'message': '사용자 등록 및 프로필 설정 완료!', 'user_id': new_user.id}), 201

# 특정 사용자 프로필 조회 API
@app.route('/users/<employee_id>', methods=['GET'])
def get_user(employee_id):
    user = User.query.filter_by(employee_id=employee_id).first()
    if not user:
        return jsonify({'message': '사용자를 찾을 수 없습니다.'}), 404

    user_data = {
        'id': user.id,
        'employee_id': user.employee_id,
        'name': user.name,
        'department': user.department,
        'lunch_preference': user.lunch_preference
    }
    return jsonify(user_data)

# 사용자 프로필 업데이트 API
@app.route('/users/<employee_id>', methods=['PUT'])
def update_user(employee_id):
    user = User.query.filter_by(employee_id=employee_id).first()
    if not user:
        return jsonify({'message': '사용자를 찾을 수 없습니다.'}), 404

    data = request.get_json()
    user.name = data.get('name', user.name)
    user.department = data.get('department', user.department)
    user.lunch_preference = data.get('lunch_preference', user.lunch_preference)
    db.session.commit()
    return jsonify({'message': '사용자 프로필 업데이트 완료!'})

# 모든 사용자 조회 API
@app.route('/users', methods=['GET'])
def get_all_users():
    users = User.query.all()
    output = []
    for user in users:
        user_data = {
            'id': user.id,
            'employee_id': user.employee_id,
            'name': user.name,
            'department': user.department,
            'lunch_preference': user.lunch_preference
        }
        output.append(user_data)
    return jsonify(output)

# ======================================================
# ## 점심 파트너 매칭 API (새로 추가된 부분) ##
# ======================================================
@app.route('/match', methods=['POST'])
def match_lunch_partner():
    """점심 파트너를 매칭해주는 API"""
    data = request.get_json()
    # 요청 본문에 employee_id가 있는지 확인
    if not data or 'employee_id' not in data:
        return jsonify({'message': '매칭을 요청한 사용자의 사번(employee_id)이 필요합니다.'}), 400

    current_user_id = data['employee_id']

    # 자신을 제외한 모든 사용자를 잠재적 파트너로 조회
    potential_partners = User.query.filter(User.employee_id != current_user_id).all()

    # 매칭할 다른 사용자가 없는 경우
    if not potential_partners:
        return jsonify({'message': '이런! 점심을 함께 먹을 다른 사용자가 아직 없어요. 친구에게 앱을 추천해보세요!'}), 200

    # 파트너 목록에서 무작위로 한 명 선택
    matched_partner = random.choice(potential_partners)

    # 매칭된 파트너의 정보를 JSON으로 가공
    partner_data = {
        'employee_id': matched_partner.employee_id,
        'name': matched_partner.name,
        'department': matched_partner.department,
        'lunch_preference': matched_partner.lunch_preference
    }

    # 매칭 성공 메시지와 함께 파트너 정보 반환
    return jsonify({
        'message': '매칭 성공! 오늘 점심은 이 분과 함께 어떠세요?',
        'partner': partner_data
    })

# 이 파일을 직접 실행했을 때만 서버를 시작
if __name__ == '__main__':
    app.run(debug=True)
