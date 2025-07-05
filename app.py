from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS # 새로 추가!

app = Flask(__name__)
CORS(app) # 모든 경로에서 CORS 허용 (개발 단계에서만 사용)
# 나중에 실제 배포 시에는 CORS(app, resources={r"/api/*": {"origins": "https://yourfrontend.com"}}) 처럼 특정 도메인만 허용하도록 변경합니다.

# SQLite 데이터베이스 설정
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///site.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# 데이터베이스 모델 정의 (테이블 스키마)
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

# User 모델 정의 (사용자 테이블 스키마)
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.String(50), unique=True, nullable=False) # 사번 (고유값)
    name = db.Column(db.String(100), nullable=False) # 이름
    department = db.Column(db.String(100), nullable=True) # 부서
    lunch_preference = db.Column(db.String(200), nullable=True) # 예: 조용한 식사, 대화 선호 등

    def __repr__(self):
        return f"User('{self.employee_id}', '{self.name}')"

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

# 데이터베이스에 초기 맛집 데이터를 추가하는 함수 (웹 브라우저에서 이 주소로 접속하여 한 번만 실행)
@app.route('/init_db')
def init_db_route():
    with app.app_context():
        db.drop_all() # 기존 데이터가 있다면 삭제 (테스트용)
        db.create_all() # 테이블 다시 생성

        # 새로운 맛집 데이터 추가
        restaurant1 = Restaurant(name='한식 뚝배기집', category='한식', rating=4.5,
                                address='서울시 강남구 테헤란로 123', phone='02-1234-5678',
                                description='따뜻한 국물이 일품인 한식당')
        restaurant2 = Restaurant(name='퓨전 파스타', category='양식', rating=4.0,
                                address='서울시 서초구 서초대로 456', phone='02-9876-5432',
                                description='트렌디하고 맛있는 파스타 전문점')
        restaurant3 = Restaurant(name='시원한 막국수', category='한식', rating=3.8,
                                address='서울시 종로구 종로 789', phone='02-1111-2222',
                                description='여름에 시원하게 즐기는 막국수 맛집')
        restaurant4 = Restaurant(name='중국집 왕룡', category='중식', rating=4.2,
                                address='서울시 영등포구 여의대로 1', phone='02-3333-4444',
                                description='짜장면과 탕수육이 맛있는 중식당')

        db.session.add_all([restaurant1, restaurant2, restaurant3, restaurant4])
        db.session.commit()

        return '데이터베이스 초기화 및 맛집 데이터 추가 완료!'

# 맛집 정보를 가져오는 API (데이터베이스에서 가져옴)
@app.route('/restaurants', methods=['GET'])
def get_restaurants():
    all_restaurants = Restaurant.query.all()
    output = []
    for restaurant in all_restaurants:
        restaurant_data = {}
        restaurant_data['id'] = restaurant.id
        restaurant_data['name'] = restaurant.name
        restaurant_data['category'] = restaurant.category
        restaurant_data['rating'] = restaurant.rating
        restaurant_data['address'] = restaurant.address
        restaurant_data['phone'] = restaurant.phone
        restaurant_data['description'] = restaurant.description
        output.append(restaurant_data)
    return jsonify(output)

# 사용자 등록 및 프로필 설정
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

# 특정 사용자 프로필 조회
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

# 사용자 프로필 업데이트 (성향 변경 등)
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

# 모든 사용자 조회 (테스트용, 실제 앱에서는 보안상 제한 필요)
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

# 이 파일을 직접 실행했을 때만 서버를 시작하게 합니다.
if __name__ == '__main__':
    app.run(debug=True)
