"""
Application Factory 패턴을 사용한 Flask 앱 생성
"""
import os
from flask import Flask
from flask_cors import CORS


def create_app(config_name=None):
    """Application Factory 패턴으로 Flask 앱 생성"""
    # 환경변수 로드
    from backend.config.env_loader import load_environment_variables
    load_environment_variables()
    
    # 보안 키 검증 (프로덕션에서 기본 키 사용 시 부팅 차단)
    from backend.config.auth_config import AuthConfig
    AuthConfig.validate_jwt_secret()
    
    app = Flask(__name__)
    
    # 로깅 시스템 초기화
    from backend.utils.logging import init_app_logging
    init_app_logging(app)
     
    # CORS 화이트리스트 설정
    allowed_origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]
    if not allowed_origins:
        # 개발 환경 기본값
        allowed_origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    cors_config = {
        "origins": allowed_origins,
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "Accept"],
        "supports_credentials": True,
        "max_age": 86400  # 24시간 프리플라이트 캐시
    }
    CORS(app, resources={r"/api/*": cors_config})

    # 기본 설정
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", "sqlite:///site.db")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-flask-secret-key-change-in-production")
    
    # PostgreSQL 연결 풀 설정 (프로덕션 최적화)
    if os.getenv("DATABASE_URL", "").startswith("postgresql://"):
        app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
            "pool_size": 10,
            "pool_recycle": 3600,
            "pool_pre_ping": True,
            "max_overflow": 20
        }
    
    # 테스트 환경 설정
    if config_name == 'testing':
        app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
        app.config["TESTING"] = True

    # 데이터베이스 객체 import (extensions.py에서)
    from backend.app.extensions import db
    
    # 데이터베이스 초기화 - Factory 패턴에서 필수
    db.init_app(app)

    # 모델 import
    from backend.models.app_models import (
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
    
    # 문의사항 모델 import
    from backend.models import Inquiry

    from backend.utils.logging import info, warning
    info("extensions.py의 데이터베이스 객체를 import했습니다.")
    
    # 인증 모델 import (표준 SQLAlchemy 방식)
    try:
        # 표준 SQLAlchemy 선언적 매핑 사용
        from backend.auth.models import User, Friendship, RefreshToken, RevokedToken
        info("인증 모델을 불러왔습니다.")
        
        print("[SUCCESS] 인증 모델이 표준 방식으로 등록되었습니다.")
        info("모든 모델이 메타데이터에 등록되었습니다.")
        
        # 전역 변수로 모델 저장 (다른 모듈에서 사용 가능)
        app.config['USER_MODEL'] = User
        app.config['FRIENDSHIP_MODEL'] = Friendship
        
        # 전역 모듈 변수로도 저장 (더 안정적인 접근)
        import backend.app.app as app_module
        app_module.User = User
        app_module.Friendship = Friendship
        
        print(f"[DEBUG] 모델이 app.config에 저장됨: USER_MODEL={app.config.get('USER_MODEL')}")
        print(f"[DEBUG] 모델이 전역 변수로 저장됨: User={User}, Friendship={Friendship}")
            
    except ImportError as e:
        warning(f"인증 모델 import 실패: {e}")
        warning("User, Friendship 모델은 비활성화됩니다.")
    except Exception as e:
        print(f"[ERROR] 인증 모델 처리 중 오류: {e}")
        print(f"[ERROR] 오류 타입: {type(e)}")
        import traceback
        traceback.print_exc()

    # Flask-Migrate 초기화
    try:
        from flask_migrate import Migrate
        migrate = Migrate(app, db)
        print("[SUCCESS] Flask-Migrate가 성공적으로 초기화되었습니다.")
    except ImportError as e:
        print(f"[WARNING] Flask-Migrate 초기화 실패: {e}")
        print("   데이터베이스 마이그레이션 기능은 비활성화됩니다.")

    # 에러 핸들러 등록
    try:
        from backend.utils.error_handler import register_error_handlers
        register_error_handlers(app)
        print("[SUCCESS] 에러 핸들러가 성공적으로 등록되었습니다.")
    except ImportError as e:
        print(f"[WARNING] 에러 핸들러 등록 실패: {e}")
        print("   에러 핸들링 기능은 비활성화됩니다.")

    # Celery 백그라운드 작업 설정
    try:
        from backend.app.celery_config import create_celery, setup_periodic_tasks
        celery_app = create_celery(app)
        if celery_app:
            setup_periodic_tasks(celery_app)
            print("[SUCCESS] Celery 백그라운드 작업이 성공적으로 설정되었습니다.")
        else:
            print("[INFO] Celery가 비활성화되어 백그라운드 작업을 건너뜁니다.")
    except ImportError as e:
        print(f"[WARNING] Celery 설정 실패: {e}")
        print("   백그라운드 작업은 비활성화됩니다.")
        celery_app = None

    # 성능 모니터링 설정 (개발 환경에서만)
    try:
        from backend.utils.performance_monitor import setup_development_monitoring
        setup_development_monitoring(app)
        print("[SUCCESS] 성능 모니터링이 성공적으로 설정되었습니다.")
    except ImportError as e:
        print(f"[WARNING] 성능 모니터링 설정 실패: {e}")
        print("   성능 모니터링은 비활성화됩니다.")

    # 데이터베이스 최적화 도구 설정
    try:
        from backend.database.database_optimization import DatabaseOptimizer
        if hasattr(DatabaseOptimizer, 'setup_optimization'):
            DatabaseOptimizer.setup_optimization(app)
            print("[SUCCESS] 데이터베이스 최적화 도구가 성공적으로 설정되었습니다.")
            print("   - 인덱스 최적화")
            print("   - 쿼리 성능 분석")
        else:
            print("[INFO] 데이터베이스 최적화 도구는 사용할 수 없습니다.")
    except ImportError as e:
        print(f"[WARNING] 데이터베이스 최적화 도구 설정 실패: {e}")

    # 보안 시스템 설정
    try:
        from backend.app.security_system import setup_security
        setup_security(app)
        print("[SUCCESS] 보안 시스템이 성공적으로 설정되었습니다.")
        print("   - 위협 패턴 스캔")
        print("   - Rate limiting")
        print("   - 보안 이벤트 로깅")
    except ImportError as e:
        print(f"[WARNING] 보안 시스템 설정 실패: {e}")

    # 애플리케이션 모니터링 설정
    try:
        from backend.app.app_monitor import setup_app_monitoring
        setup_app_monitoring(app)
        print("[SUCCESS] 애플리케이션 모니터링이 설정되었습니다. (수동 시작 필요)")
    except ImportError as e:
        print(f"[WARNING] 애플리케이션 모니터링 설정 실패: {e}")

    # 캐시 관리자 설정
    try:
        from backend.app.cache_manager import setup_cache_manager
        setup_cache_manager(app)
        print("[SUCCESS] 캐시 관리자가 성공적으로 설정되었습니다.")
    except ImportError as e:
        print(f"[WARNING] 캐시 관리자 설정 실패: {e}")

    # 실시간 통신 시스템 설정
    try:
        from backend.app.realtime_system import setup_realtime_communication
        setup_realtime_communication(app)
        print("[SUCCESS] 실시간 통신 시스템이 성공적으로 설정되었습니다.")
        print("   - WebSocket 알림 시스템")
        print("   - 실시간 협업 시스템")
    except ImportError as e:
        print(f"[WARNING] 실시간 통신 시스템 설정 실패: {e}")

    # API Blueprint 등록
    try:
        from backend.routes.api import api_bp
        app.register_blueprint(api_bp)
        print("[SUCCESS] API Blueprint가 성공적으로 등록되었습니다.")
    except Exception as e:
        print(f"[ERROR] API Blueprint 등록 실패: {e}")

    # 인증 시스템 초기화
    try:
        from backend.auth.auth_system import init_auth_system
        init_auth_system(app)
        print("[SUCCESS] 인증 시스템을 불러왔습니다.")
    except ImportError as e:
        print(f"[WARNING] 인증 시스템 초기화 실패: {e}")
        print("[INFO] 인증 시스템이 비활성화되어 초기 데이터 생성을 건너뜁니다.")

    # 스키마 수정은 Alembic 마이그레이션을 통해서만 수행합니다.
    # 부팅 시 DDL 실행은 제거되었습니다.
    print("🔧 스키마 수정은 Alembic 마이그레이션을 통해서만 수행됩니다.")

    # 데이터베이스 초기화
    try:
        from backend.database.init_db import init_database
        init_database(app)
        print("[SUCCESS] 데이터베이스가 Flask 앱과 연결되었습니다.")
    except ImportError as e:
        print(f"[WARNING] 데이터베이스 초기화 실패: {e}")

    # 포인트 시스템 설정
    try:
        from backend.app.points_system import setup_points_system
        setup_points_system(app)
        print("[SUCCESS] 포인트 시스템이 성공적으로 설정되었습니다.")
    except ImportError as e:
        print(f"[WARNING] 포인트 시스템 설정 실패: {e}")

    # 포인트 API 등록
    try:
        from backend.routes.points import points_bp
        app.register_blueprint(points_bp)
        print("[SUCCESS] 포인트 API가 성공적으로 등록되었습니다.")
    except Exception as e:
        print(f"[ERROR] 포인트 API 등록 실패: {e}")

    # 스케줄러 설정
    try:
        from backend.app.scheduler_config import setup_scheduler
        setup_scheduler(app)
        print("[SUCCESS] 스케줄러가 성공적으로 설정되었습니다.")
    except ImportError as e:
        print(f"[WARNING] 스케줄러 설정 실패: {e}")

    # 통합 모니터링 시스템 초기화
    try:
        from backend.monitoring.unified_monitor import monitor
        monitor.init_app(app)
        print("[SUCCESS] 통합 모니터링 시스템 초기화 완료")
    except Exception as e:
        print(f"[WARNING] 모니터링 시스템 초기화 실패: {e}")

    # 성능 최적화 시스템 초기화
    try:
        # Redis 캐시 시스템 초기화
        from backend.cache.redis_cache import cache
        cache.init_app(app)
        print("[SUCCESS] Redis 캐시 시스템 초기화 완료")
        
        # 데이터베이스 최적화
        from backend.optimization.query_optimizer import create_database_indexes
        create_database_indexes()
        print("[SUCCESS] 데이터베이스 최적화 완료")
        
    except Exception as e:
        print(f"[WARNING] 성능 최적화 시스템 초기화 실패: {e}")

    # 통합 Blueprint 등록 시스템 사용
    try:
        from backend.api.unified_blueprint import UnifiedBlueprintManager
        
        # UnifiedBlueprintManager 초기화
        blueprint_manager = UnifiedBlueprintManager(app)
        
        # 모든 Blueprint 등록
        blueprint_manager.register_all_blueprints()
        
        # 모니터링 API 등록
        from backend.monitoring.monitoring_api import monitoring_bp
        app.register_blueprint(monitoring_bp)
        
        print("[SUCCESS] 통합 Blueprint 등록 시스템으로 모든 Blueprint 등록 완료")
        
    except Exception as e:
        print(f"[ERROR] 통합 Blueprint 등록 시스템 실패: {e}")
        print("[FALLBACK] 개별 Blueprint 등록으로 폴백합니다.")
        
        # 폴백: 핵심 Blueprint만 등록
        try:
            from backend.routes.health import health_bp
            app.register_blueprint(health_bp)
            print("[SUCCESS] 헬스체크 Blueprint 등록 성공 (폴백)")
        except Exception as fallback_e:
            print(f"[ERROR] 폴백 Blueprint 등록 실패: {fallback_e}")

    return app


# 기존 app.py와의 호환성을 위한 전역 앱 인스턴스
app = create_app()

if __name__ == "__main__":
    # Socket.IO 설정 확인
    try:
        from backend.app.realtime_system import socketio
        if socketio:
            # Socket.IO와 함께 실행
            socketio.run(app, host="0.0.0.0", port=5000, debug=True)
        else:
            # 일반 Flask로 실행
            app.run(debug=True, host="0.0.0.0", port=5000)
    except ImportError:
        # 일반 Flask로 실행
        app.run(debug=True, host="0.0.0.0", port=5000)

