"""
단순화된 Flask 앱 팩토리
환경변수 기반 모듈 로딩을 사용하여 초기화 로직을 단순화
"""
import os
from flask import Flask
from flask_cors import CORS

from backend.config.module_loader import module_loader
from backend.config.env_loader import load_environment_variables
from backend.app.extensions import db


def create_app(config_name=None):
    """단순화된 Flask 앱 생성"""
    # 환경변수 로드
    load_environment_variables()
    
    # Flask 앱 생성
    app = Flask(__name__)
    
    # 기본 설정
    app.config.update({
        "SQLALCHEMY_DATABASE_URI": os.getenv("DATABASE_URL", "sqlite:///site.db"),
        "SQLALCHEMY_TRACK_MODIFICATIONS": False,
        "SECRET_KEY": os.getenv("SECRET_KEY", "dev-flask-secret-key-change-in-production"),
        "TESTING": config_name == 'testing'
    })
    
    # 테스트 환경 설정
    if config_name == 'testing':
        app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    
    # CORS 설정
    allowed_origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]
    if not allowed_origins:
        allowed_origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    CORS(app, resources={
        r"/api/*": {
            "origins": allowed_origins,
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization", "Accept"],
            "supports_credentials": True,
            "max_age": 86400
        }
    })
    
    # 데이터베이스 초기화
    db.init_app(app)
    
    # 로깅 시스템 초기화
    try:
        from utils.logging import init_app_logging
        init_app_logging(app)
    except ImportError:
        print("⚠️ 로깅 시스템을 사용할 수 없습니다.")
    
    # 모듈 로딩 및 초기화
    loaded_modules = module_loader.load_all_modules()
    
    # 인증 시스템 초기화
    if 'auth' in loaded_modules:
        try:
            auth_init = loaded_modules['auth']
            app = auth_init(app)
            print("✅ 인증 시스템이 초기화되었습니다.")
        except Exception as e:
            print(f"❌ 인증 시스템 초기화 실패: {e}")
    
    # Blueprint 등록
    register_blueprints(app)
    
    # 데이터베이스 초기화
    try:
        from database_init import init_database
        init_database(app)
        print("✅ 데이터베이스가 초기화되었습니다.")
    except ImportError as e:
        print(f"⚠️ 데이터베이스 초기화 실패: {e}")
    
    # 포인트 시스템 설정
    if 'points' in loaded_modules:
        try:
            points_setup = loaded_modules['points']
            points_setup(app)
            print("✅ 포인트 시스템이 설정되었습니다.")
        except Exception as e:
            print(f"❌ 포인트 시스템 설정 실패: {e}")
    
    # 스케줄러 설정
    if 'scheduler' in loaded_modules:
        try:
            scheduler_setup = loaded_modules['scheduler']
            scheduler_setup(app)
            print("✅ 스케줄러가 설정되었습니다.")
        except Exception as e:
            print(f"❌ 스케줄러 설정 실패: {e}")
    
    # 실시간 통신 시스템 설정
    if 'realtime' in loaded_modules:
        try:
            from flask_socketio import SocketIO
            from realtime.notification_system import NotificationSystem
            from realtime.collaboration_system import CollaborationSystem
            
            socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")
            
            # 알림 시스템 초기화
            notification_system = NotificationSystem(socketio, db)
            notification_system.setup_socket_events()
            
            # 협업 시스템 초기화
            collaboration_system = CollaborationSystem(socketio, db)
            collaboration_system.setup_socket_events()
            
            app.socketio = socketio
            app.notification_system = notification_system
            app.collaboration_system = collaboration_system
            
            print("✅ 실시간 통신 시스템이 설정되었습니다.")
        except Exception as e:
            print(f"❌ 실시간 통신 시스템 설정 실패: {e}")
    
    # API Blueprint 등록
    if 'api' in loaded_modules:
        try:
            api_init = loaded_modules['api']
            api_init(app)
            print("✅ API Blueprint가 등록되었습니다.")
        except Exception as e:
            print(f"❌ API Blueprint 등록 실패: {e}")
    
    return app


def register_blueprints(app):
    """Blueprint들을 등록"""
    blueprints = [
        ('routes.auth', 'auth_bp', '/api'),
        ('routes.schedules', 'schedules_bp', '/api'),
        ('routes.proposals', 'proposals_bp', '/api'),
        ('routes.restaurants', 'restaurants_bp', '/api'),
        ('routes.parties', 'parties_bp', '/api'),
        ('routes.users', 'users_bp', '/api'),
        ('routes.chats', 'chats_bp', '/api'),
        ('routes.voting', 'voting_bp', '/api'),
        ('routes.matching', 'matching_bp', '/api'),
        ('routes.points', 'points_bp', '/api'),
        # 개발용 API는 제거됨 - 프로덕션 환경으로 전환
    ]
    
    for module_path, blueprint_name, url_prefix in blueprints:
        try:
            module = __import__(module_path, fromlist=[blueprint_name])
            blueprint = getattr(module, blueprint_name)
            app.register_blueprint(blueprint, url_prefix=url_prefix)
            print(f"✅ {blueprint_name} 등록 성공")
        except Exception as e:
            print(f"❌ {blueprint_name} 등록 실패: {e}")


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)
