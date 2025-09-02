"""
Application Factory 패턴을 사용한 Flask 앱 생성
"""
import os
from flask import Flask
from flask_cors import CORS


def create_app(config_name=None):
    """Application Factory 패턴으로 Flask 앱 생성"""
    app = Flask(__name__)
    CORS(app, resources={r"/*": {"origins": "*"}})

    # 기본 설정
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", "sqlite:///site.db")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-flask-secret-key-change-in-production")
    
    # 테스트 환경 설정
    if config_name == 'testing':
        app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
        app.config["TESTING"] = True

    # 데이터베이스 객체 import (extensions.py에서)
    from extensions import db

    # 모델 import
    from models.app_models import (
        Party,
        PartyMember,
        DangolPot,
        ChatRoom,
        ChatParticipant,
        LunchProposal,
        ProposalAcceptance,
        ChatMessage,
        Notification,
        UserAnalytics,
        Restaurant,
        Review,
        Friendship,
        UserActivity,
        RestaurantVisit,
        OfflineData,
        ChatMessageRead,
        CategoryActivity,
        Badge,
        UserBadge,
        DailyRecommendation,
        RestaurantRequest,
        UserFavorite,
    )

    print("✅ extensions.py의 데이터베이스 객체를 import했습니다.")

    # Flask-Migrate 초기화
    from flask_migrate import Migrate
    migrate = Migrate(app, db)

    # 에러 핸들러 등록
    try:
        from utils.error_handler import register_error_handlers
        register_error_handlers(app)
        print("✅ 에러 핸들러가 성공적으로 등록되었습니다.")
    except ImportError as e:
        print(f"⚠️ 에러 핸들러 등록 실패: {e}")
        print("   에러 핸들링 기능은 비활성화됩니다.")

    # Celery 백그라운드 작업 설정
    try:
        from celery_config import create_celery, setup_periodic_tasks
        celery_app = create_celery(app)
        if celery_app:
            setup_periodic_tasks(celery_app)
            print("✅ Celery 백그라운드 작업이 성공적으로 설정되었습니다.")
        else:
            print("ℹ️ Celery가 비활성화되어 백그라운드 작업을 건너뜁니다.")
    except ImportError as e:
        print(f"⚠️ Celery 설정 실패: {e}")
        print("   백그라운드 작업은 비활성화됩니다.")
        celery_app = None

    # 성능 모니터링 설정 (개발 환경에서만)
    try:
        from performance_monitor import setup_development_monitoring
        setup_development_monitoring(app)
        print("✅ 성능 모니터링이 성공적으로 설정되었습니다.")
    except ImportError as e:
        print(f"⚠️ 성능 모니터링 설정 실패: {e}")
        print("   성능 모니터링은 비활성화됩니다.")

    # 데이터베이스 최적화 도구 설정
    try:
        from database_optimizer import setup_database_optimization
        setup_database_optimization(app)
        print("✅ 데이터베이스 최적화 도구가 성공적으로 설정되었습니다.")
        print("   - 인덱스 최적화")
        print("   - 쿼리 성능 분석")
    except ImportError as e:
        print(f"⚠️ 데이터베이스 최적화 도구 설정 실패: {e}")

    # 보안 시스템 설정
    try:
        from security_system import setup_security
        setup_security(app)
        print("✅ 보안 시스템이 성공적으로 설정되었습니다.")
        print("   - 위협 패턴 스캔")
        print("   - Rate limiting")
        print("   - 보안 이벤트 로깅")
    except ImportError as e:
        print(f"⚠️ 보안 시스템 설정 실패: {e}")

    # 애플리케이션 모니터링 설정
    try:
        from app_monitor import setup_app_monitoring
        setup_app_monitoring(app)
        print("✅ 애플리케이션 모니터링이 설정되었습니다. (수동 시작 필요)")
    except ImportError as e:
        print(f"⚠️ 애플리케이션 모니터링 설정 실패: {e}")

    # 캐시 관리자 설정
    try:
        from cache_manager import setup_cache_manager
        setup_cache_manager(app)
        print("✅ 캐시 관리자가 성공적으로 설정되었습니다.")
    except ImportError as e:
        print(f"⚠️ 캐시 관리자 설정 실패: {e}")

    # 실시간 통신 시스템 설정
    try:
        from realtime_system import setup_realtime_communication
        setup_realtime_communication(app)
        print("✅ 실시간 통신 시스템이 성공적으로 설정되었습니다.")
        print("   - WebSocket 알림 시스템")
        print("   - 실시간 협업 시스템")
    except ImportError as e:
        print(f"⚠️ 실시간 통신 시스템 설정 실패: {e}")

    # API Blueprint 등록
    try:
        from routes.api import api_bp
        app.register_blueprint(api_bp)
        print("✅ API Blueprint가 성공적으로 등록되었습니다.")
    except Exception as e:
        print(f"❌ API Blueprint 등록 실패: {e}")

    # 인증 시스템 초기화
    try:
        from auth.auth_system import init_auth_system
        init_auth_system(app)
        print("✅ 인증 시스템을 불러왔습니다.")
    except ImportError as e:
        print(f"⚠️ 인증 시스템 초기화 실패: {e}")
        print("ℹ️ 인증 시스템이 비활성화되어 초기 데이터 생성을 건너뜁니다.")

    # 데이터베이스 초기화
    try:
        from database_init import init_database
        init_database(app)
        print("✅ 데이터베이스가 Flask 앱과 연결되었습니다.")
    except ImportError as e:
        print(f"⚠️ 데이터베이스 초기화 실패: {e}")

    # 포인트 시스템 설정
    try:
        from points_system import setup_points_system
        setup_points_system(app)
        print("✅ 포인트 시스템이 성공적으로 설정되었습니다.")
    except ImportError as e:
        print(f"⚠️ 포인트 시스템 설정 실패: {e}")

    # 포인트 API 등록
    try:
        from routes.points import points_bp
        app.register_blueprint(points_bp)
        print("✅ 포인트 API가 성공적으로 등록되었습니다.")
    except Exception as e:
        print(f"❌ 포인트 API 등록 실패: {e}")

    # 스케줄러 설정
    try:
        from scheduler_config import setup_scheduler
        setup_scheduler(app)
        print("✅ 스케줄러가 성공적으로 설정되었습니다.")
    except ImportError as e:
        print(f"⚠️ 스케줄러 설정 실패: {e}")

    # Blueprint 등록
    try:
        from routes.auth import auth_bp
        app.register_blueprint(auth_bp)
        print("✅ 인증 Blueprint 등록 성공")
    except Exception as e:
        print(f"❌ 인증 Blueprint 등록 실패: {e}")

    try:
        from routes.schedules import schedules_bp
        app.register_blueprint(schedules_bp)
        print("✅ 일정 관리 Blueprint 등록 성공")
    except Exception as e:
        print(f"❌ 일정 관리 Blueprint 등록 실패: {e}")

    try:
        from routes.proposals import proposals_bp
        app.register_blueprint(proposals_bp)
        print("✅ 제안 관리 Blueprint 등록 성공")
    except Exception as e:
        print(f"❌ 제안 관리 Blueprint 등록 실패: {e}")

    try:
        from routes.restaurants import restaurants_bp
        app.register_blueprint(restaurants_bp)
        print("✅ 식당 관리 Blueprint 등록 성공")
    except Exception as e:
        print(f"❌ 식당 관리 Blueprint 등록 실패: {e}")

    try:
        from routes.parties import parties_bp
        app.register_blueprint(parties_bp)
        print("✅ 파티 관리 Blueprint 등록 성공")
    except Exception as e:
        print(f"❌ 파티 관리 Blueprint 등록 실패: {e}")

    try:
        from routes.users import users_bp
        app.register_blueprint(users_bp)
        print("✅ 사용자 관리 Blueprint 등록 성공")
    except Exception as e:
        print(f"❌ 사용자 관리 Blueprint 등록 실패: {e}")

    try:
        from routes.chats import chats_bp
        app.register_blueprint(chats_bp)
        print("✅ 채팅 관리 Blueprint 등록 성공")
    except Exception as e:
        print(f"❌ 채팅 관리 Blueprint 등록 실패: {e}")

    try:
        from routes.voting import voting_bp
        app.register_blueprint(voting_bp)
        print("✅ 투표 관리 Blueprint 등록 성공")
    except Exception as e:
        print(f"❌ 투표 관리 Blueprint 등록 실패: {e}")

    try:
        from routes.matching import matching_bp
        app.register_blueprint(matching_bp)
        print("✅ 매칭 관리 Blueprint 등록 성공")
    except Exception as e:
        print(f"❌ 매칭 관리 Blueprint 등록 실패: {e}")

    print("✅ 모든 Blueprint 등록 완료")

    return app


# 기존 app.py와의 호환성을 위한 전역 앱 인스턴스
app = create_app()

if __name__ == "__main__":
    # Socket.IO 설정 확인
    try:
        from realtime_system import socketio
        if socketio:
            # Socket.IO와 함께 실행
            socketio.run(app, host="0.0.0.0", port=5000, debug=True)
        else:
            # 일반 Flask로 실행
            app.run(debug=True, host="0.0.0.0", port=5000)
    except ImportError:
        # 일반 Flask로 실행
        app.run(debug=True, host="0.0.0.0", port=5000)
