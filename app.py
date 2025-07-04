from flask import Flask, request, jsonify # Flask 관련 도구들을 불러옵니다.

app = Flask(__name__) # Flask 앱을 만듭니다.

# '/' 주소로 접속했을 때 실행되는 부분
@app.route('/')
def hello_world():
    return '안녕하세요! 점심엔 코카인 서버에 오신 것을 환영합니다!'

# '/restaurants' 주소로 접속했을 때 실행되는 부분 (맛집 정보 제공)
@app.route('/restaurants', methods=['GET']) # GET 방식으로 요청이 왔을 때만 처리
def get_restaurants():
    restaurants = [ # 간단한 맛집 정보를 리스트 형태로 만듭니다.
        {'id': 1, 'name': '한식 뚝배기집', 'type': '한식', 'rating': 4.5},
        {'id': 2, 'name': '퓨전 파스타', 'type': '양식', 'rating': 4.0},
        {'id': 3, 'name': '시원한 막국수', 'type': '한식', 'rating': 3.8}
    ]
    return jsonify(restaurants) # 이 정보를 웹에서 읽을 수 있는 JSON 형태로 바꿔서 돌려줍니다.

# 이 파일을 직접 실행했을 때만 서버를 시작하게 합니다.
# if __name__ == '__main__':
#     app.run(debug=True)