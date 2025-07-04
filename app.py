from flask import Flask, request, jsonify # Flask 관련 도구들을 불러옵니다.
from flask_sqlalchemy import SQLAlchemy # 새로 추가!

app = Flask(__name__) # Flask 앱을 만듭니다.

# SQLite 데이터베이스 설정
# app.config['SQLALCHEMY_DATABASE_URI']는 데이터베이스 파일의 위치를 지정합니다.
# 'sqlite:///site.db'는 현재 폴더에 'site.db'라는 SQLite 파일을 만들겠다는 의미입니다.
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///site.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False # 경고 메시지 방지 (새로운 버전에서는 필수는 아님)
db = SQLAlchemy(app) # SQLAlchemy 객체를 초기화하여 Flask 앱과 연결합니다.

# 데이터베이스 모델 정의 (테이블 스키마)
# Restaurant 모델은 데이터베이스의 'restaurant' 테이블에 해당됩니다.
class Restaurant(db.Model):
    id = db.Column(db.Integer, primary_key=True) # 고유 ID (자동 증가)
    name = db.Column(db.String(100), nullable=False) # 식당 이름 (필수)
    category = db.Column(db.String(50), nullable=False) # 카테고리 (한식, 양식 등, 필수)
    rating = db.Column(db.Float, nullable=False) # 평점 (필수)
    address = db.Column(db.String(200), nullable=True) # 주소 (선택 사항)
    phone = db.Column(db.String(20), nullable=True) # 전화번호 (선택 사항)
    description = db.Column(db.Text, nullable=True) # 상세 설명 (선택 사항)

    # 객체를 출력할 때 보기 좋게 해주는 함수
    def __repr__(self):
        return f"Restaurant('{self.name}', '{self.category}', {self.rating})"

# Flask 앱 시작 전에 데이터베이스 테이블을 생성합니다. (앱이 실행될 때마다 실행)
@app.before_request
def create_tables():
    # 이 함수는 요청이 들어올 때마다 실행되므로, 실제 운영에서는 다른 방식으로 테이블을 생성합니다.
    # 개발 단계에서는 편의상 이렇게 사용합니다.
    if not hasattr(app, '_db_created'): # _db_created 속성으로 한 번만 실행되도록
        with app.app_context():
            db.create_all()
            app._db_created = True

# 기본 페이지 라우트
@app.route('/')
def hello_world():
    return '안녕하세요! 점심엔 코카인 서버에 오신 것을 환영합니다!'

# 데이터베이스에 초기 맛집 데이터를 추가하는 함수 (웹 브라우저에서 이 주소로 접속하여 한 번만 실행)
@app.route('/init_db')
def init_db_route(): # 함수명 변경: init_db는 이미 다른 곳에서 사용될 수 있으므로
    with app.app_context(): # Flask 앱 컨텍스트 안에서 데이터베이스 작업
        # 기존 데이터가 있다면 삭제 (테스트용)
        db.drop_all()
        db.create_all()

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


        db.session.add_all([restaurant1, restaurant2, restaurant3, restaurant4]) # 여러 객체 한 번에 추가
        db.session.commit() # 변경사항을 데이터베이스에 저장

        return '데이터베이스 초기화 및 맛집 데이터 추가 완료!'

# 맛집 정보를 가져오는 API (데이터베이스에서 가져옴)
@app.route('/restaurants', methods=['GET'])
def get_restaurants():
    # 데이터베이스에서 모든 맛집 정보를 가져옵니다.
    all_restaurants = Restaurant.query.all()
    # 가져온 정보를 앱이 이해할 수 있는 JSON 형태로 변환합니다.
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
    return jsonify(output) # 데이터베이스에서 가져온 데이터를 JSON 형태로 반환

# 이 파일을 직접 실행했을 때만 서버를 시작하게 합니다.
# Render 배포를 위해 주석 처리했었지만, 로컬에서 실행할 때는 주석을 제거해야 합니다.
if __name__ == '__main__':
    app.run(debug=True)