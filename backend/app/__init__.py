#!/usr/bin/env python3
"""
Flask 애플리케이션 팩토리
기존 앱 구조를 유지하면서 새로운 아키텍처와 호환되도록 합니다.
"""

import os
import sys
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_socketio import SocketIO

# 프로젝트 루트를 Python 경로에 추가
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# 환경변수 로드
from dotenv import load_dotenv
load_dotenv()

# Flask 앱 생성
app = Flask(__name__)

# 기본 설정
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///app.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key')

# 확장 초기화
db = SQLAlchemy(app)
migrate = Migrate(app, db)
CORS(app, origins=os.environ.get('ALLOWED_ORIGINS', '*').split(','))
socketio = SocketIO(app, cors_allowed_origins=os.environ.get('ALLOWED_ORIGINS', '*').split(','))

# 기존 라우트들 등록 (호환성 유지)
try:
    # 기존 라우트들을 가져와서 등록
    from backend.routes import health, users, parties, restaurants, chats, schedules, proposals, voting, matching, notifications, points, file_upload, optimized_chat

    app.register_blueprint(health.bp, url_prefix='/api')
    app.register_blueprint(users.bp, url_prefix='/api/users')
    app.register_blueprint(parties.bp, url_prefix='/api/parties')
    app.register_blueprint(restaurants.bp, url_prefix='/api/restaurants')
    app.register_blueprint(chats.bp, url_prefix='/api/chats')
    app.register_blueprint(schedules.bp, url_prefix='/api/schedules')
    app.register_blueprint(proposals.bp, url_prefix='/api/proposals')
    app.register_blueprint(voting.bp, url_prefix='/api/voting')
    app.register_blueprint(matching.bp, url_prefix='/api/matching')
    app.register_blueprint(notifications.bp, url_prefix='/api/notifications')
    app.register_blueprint(points.bp, url_prefix='/api/points')
    app.register_blueprint(file_upload.bp, url_prefix='/api/upload')
    app.register_blueprint(optimized_chat.bp, url_prefix='/api/chat')

except ImportError as e:
    print(f"Warning: Could not import routes: {e}")
    # 기본 라우트 생성
    @app.route('/')
    def health_check():
        return {'status': 'ok', 'message': 'Lunch App is running'}

# 데이터베이스 초기화
with app.app_context():
    try:
        db.create_all()
    except Exception as e:
        print(f"Warning: Could not create database tables: {e}")

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
