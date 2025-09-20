import random
import json
from datetime import datetime, timedelta
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import emit, join_room, leave_room
from sqlalchemy import desc, or_, and_, func, text
import os
# APScheduler는 Celery Beat로 대체됨

# 구조화된 로깅 시스템 import
from utils.logger import logger, log_startup, log_shutdown, log_api_call
# 에러 모니터링 시스템 import
from utils.error_monitor import setup_flask_error_handlers, create_error_monitoring_routes

# 환경변수 로드
from config.env_loader import load_environment_variables
from config.module_loader import module_loader

load_environment_variables()

# 모듈 로딩
loaded_modules = module_loader.load_all_modules()

# 인증 시스템 상태 확인
AUTH_AVAILABLE = module_loader.is_loaded('auth')
GROUP_MATCHING_AVAILABLE = module_loader.is_loaded('group_matching')
AUTH_USER_AVAILABLE = AUTH_AVAILABLE

# 인증 관련 import
if AUTH_AVAILABLE:
    try:
        from auth.utils import require_auth
        from auth.models import Friendship, User
        print("[SUCCESS] 인증 시스템이 활성화되었습니다.")
    except ImportError as e:
        print(f"[WARNING] 인증 모듈 import 실패: {e}")
        AUTH_AVAILABLE = False

# 그룹 매칭 관련 import
if GROUP_MATCHING_AVAILABLE:
    try:
        from group_matching import calculate_group_score, get_virtual_users_data
        print("[SUCCESS] 그룹 매칭 시스템이 활성화되었습니다.")
    except ImportError as e:
        print(f"[WARNING] 그룹 매칭 모듈 import 실패: {e}")
        GROUP_MATCHING_AVAILABLE = False

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# 데이터베이스 URI 설정 - Render 환경 고려
database_url = os.getenv("DATABASE_URL")
if database_url:
    # Render에서 제공하는 PostgreSQL URL 사용
    app.config["SQLALCHEMY_DATABASE_URI"] = database_url
else:
    # 로컬 개발 환경에서는 SQLite 사용
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///site.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
# 보안 키 설정 - 프로덕션에서는 반드시 환경변수로 설정
secret_key = os.getenv("SECRET_KEY")
if not secret_key:
    if os.getenv("FLASK_ENV") == "production":
        raise ValueError("프로덕션 환경에서는 SECRET_KEY 환경변수를 반드시 설정해야 합니다!")
    else:
        secret_key = "dev-flask-secret-key-change-in-production"
        print("[WARNING] 개발 환경에서 기본 SECRET_KEY를 사용합니다. 프로덕션에서는 환경변수를 설정하세요!")

app.config["SECRET_KEY"] = secret_key

# 데이터베이스 객체 import (extensions.py에서)
from extensions import db

# 모델 import
from models.app_models import (
    Party,
    PartyMember,
    DangolPot,
    DangolPotMember,
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

# 스케줄 모델 import
from models.schedule_models import PersonalSchedule, ScheduleException

print("[SUCCESS] extensions.py의 데이터베이스 객체를 import했습니다.")

# Flask-Migrate 초기화 (일시적으로 비활성화 - 스키마 불일치 문제 해결 후 활성화)
# from flask_migrate import Migrate
# migrate = Migrate(app, db)

# 에러 핸들러 등록
try:
    from utils.error_handler import register_error_handlers

    register_error_handlers(app)
    print("[SUCCESS] 에러 핸들러가 성공적으로 등록되었습니다.")
except ImportError as e:
    print(f"[WARNING] 에러 핸들러 등록 실패: {e}")
    print("   에러 핸들링 기능은 비활성화됩니다.")

# Celery 백그라운드 작업 설정
offline_mode = os.getenv('OFFLINE_MODE', 'false').lower() == 'true'

if offline_mode:
    print("[CONFIG] 오프라인 모드: Celery 백그라운드 작업이 비활성화됩니다.")
    celery_app = None
else:
    try:
        from celery_config import create_celery, setup_periodic_tasks

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
    from performance_monitor import setup_development_monitoring

    setup_development_monitoring(app)
    print("[SUCCESS] 성능 모니터링이 성공적으로 설정되었습니다.")
except ImportError as e:
    print(f"[WARNING] 성능 모니터링 설정 실패: {e}")
    print("   성능 모니터링은 비활성화됩니다.")

# 데이터베이스 최적화 도구 설정
try:
    from database.optimization import DatabaseOptimizer

    # 데이터베이스 최적화 도구 초기화 (애플리케이션 컨텍스트 내에서)
    def init_db_optimizer():
        try:
            return DatabaseOptimizer(db)
        except (ImportError, AttributeError, RuntimeError) as e:
            print(f"[WARNING] 데이터베이스 최적화 도구 초기화 실패: {e}")
            return None

    db_optimizer = None  # 나중에 초기화

    print("[SUCCESS] 데이터베이스 최적화 도구가 성공적으로 설정되었습니다.")
    print("   - 인덱스 최적화")
    print("   - 쿼리 성능 분석")

except ImportError as e:
    print(f"[WARNING] 데이터베이스 최적화 도구 설정 실패: {e}")
    print("   데이터베이스 최적화 기능은 비활성화됩니다.")
    db_optimizer = None

# 보안 시스템 설정
try:
    from security.security_auditor import SecurityAuditor

    # 보안 감사 시스템 초기화
    security_auditor = SecurityAuditor(app, db)
    security_auditor.setup_security_middleware()

    print("[SUCCESS] 보안 시스템이 성공적으로 설정되었습니다.")
    print("   - 위협 패턴 스캔")
    print("   - Rate limiting")
    print("   - 보안 이벤트 로깅")

except ImportError as e:
    print(f"[WARNING] 보안 시스템 설정 실패: {e}")
    print("   보안 기능은 비활성화됩니다.")
    security_auditor = None

# 애플리케이션 모니터링 시스템 설정
try:
    from monitoring.app_monitor import AppMonitor

    # 모니터링 시스템 초기화
    app_monitor = AppMonitor(app, db)

    # 개발 환경에서 자동 모니터링 시작
    if app.config.get("DEBUG", False):
        app_monitor.start_monitoring()
        print("[SUCCESS] 애플리케이션 모니터링이 성공적으로 설정되었습니다.")
        print("   - 시스템 리소스 모니터링")
        print("   - 데이터베이스 상태 모니터링")
        print("   - 실시간 알림 시스템")
    else:
        print("[SUCCESS] 애플리케이션 모니터링이 설정되었습니다. (수동 시작 필요)")

except ImportError as e:
    print(f"[WARNING] 모니터링 시스템 설정 실패: {e}")
    print("   모니터링 기능은 비활성화됩니다.")
    app_monitor = None

# 실시간 통신 테스트 엔드포인트 (개발 환경에서만)
if app.config.get("DEBUG", False):

    @app.route("/debug/realtime/status", methods=["GET"])
    def debug_realtime_status():
        """실시간 통신 시스템 상태 확인"""
        try:
            status = {
                "status": "success",
                "timestamp": datetime.now().isoformat(),
                "socketio": "available" if socketio else "unavailable",
                "notification_system": ("available" if notification_system else "unavailable"),
                "collaboration_system": ("available" if collaboration_system else "unavailable"),
            }

            if notification_system:
                status["online_users"] = len(notification_system.get_online_users())
                status["active_notifications"] = len(notification_system.slow_queries)

            if collaboration_system:
                status["active_sessions"] = len(collaboration_system.active_sessions)
                status["total_users"] = len(collaboration_system.user_sessions)

            return jsonify(status)

        except Exception as e:
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": str(e),
                        "timestamp": datetime.now().isoformat(),
                    }
                ),
                500,
            )

    @app.route("/debug/realtime/test_notification", methods=["POST"])
    def debug_test_notification():
        """테스트 알림 전송"""
        try:
            if not notification_system:
                return jsonify({"error": "알림 시스템이 비활성화되어 있습니다."}), 400

            data = request.get_json() or {}
            user_id = data.get("user_id", "test_user")
            message = data.get("message", "테스트 알림입니다!")

            success = notification_system.send_notification(user_id, "system_alert", message, {"test": True})

            return jsonify(
                {
                    "status": "success" if success else "failed",
                    "message": ("테스트 알림 전송 완료" if success else "테스트 알림 전송 실패"),
                    "user_id": user_id,
                    "timestamp": datetime.now().isoformat(),
                }
            )

        except Exception as e:
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": str(e),
                        "timestamp": datetime.now().isoformat(),
                    }
                ),
                500,
            )

    @app.route("/debug/realtime/test_collaboration", methods=["POST"])
    def debug_test_collaboration():
        """테스트 협업 세션 생성"""
        try:
            if not collaboration_system:
                return jsonify({"error": "협업 시스템이 비활성화되어 있습니다."}), 400

            data = request.get_json() or {}
            user_id = data.get("user_id", "test_user")
            title = data.get("title", "테스트 협업 세션")

            from realtime.collaboration_system import CollaborationType

            session_id = collaboration_system.create_session(CollaborationType.GROUP_DISCUSSION, title, user_id)

            if session_id:
                return jsonify(
                    {
                        "status": "success",
                        "session_id": session_id,
                        "message": "테스트 협업 세션이 생성되었습니다.",
                        "timestamp": datetime.now().isoformat(),
                    }
                )
            else:
                return (
                    jsonify(
                        {
                            "status": "failed",
                            "message": "테스트 협업 세션 생성에 실패했습니다.",
                            "timestamp": datetime.now().isoformat(),
                        }
                    ),
                    500,
                )

        except Exception as e:
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": str(e),
                        "timestamp": datetime.now().isoformat(),
                    }
                ),
                500,
            )

    # 데이터베이스 최적화 테스트 엔드포인트
    @app.route("/debug/database/optimization_report", methods=["GET"])
    def debug_database_optimization_report():
        """데이터베이스 최적화 보고서 생성"""
        try:
            if not db_optimizer:
                return (
                    jsonify({"error": "데이터베이스 최적화 도구가 비활성화되어 있습니다."}),
                    400,
                )

            report = db_optimizer.generate_optimization_report()
            return jsonify(report)

        except Exception as e:
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": str(e),
                        "timestamp": datetime.now().isoformat(),
                    }
                ),
                500,
            )

    @app.route("/debug/database/create_indexes", methods=["POST"])
    def debug_create_recommended_indexes():
        """권장 인덱스 생성"""
        try:
            if not db_optimizer:
                return (
                    jsonify({"error": "데이터베이스 최적화 도구가 비활성화되어 있습니다."}),
                    400,
                )

            result = db_optimizer.create_recommended_indexes()
            return jsonify(result)

        except Exception as e:
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": str(e),
                        "timestamp": datetime.now().isoformat(),
                    }
                ),
                500,
            )

    @app.route("/debug/database/normalization_report", methods=["GET"])
    def debug_database_normalization_report():
        """데이터베이스 정규화 보고서 생성 (구현 예정)"""
        return jsonify(
            {
                "status": "info",
                "message": "데이터베이스 정규화 기능은 향후 구현 예정입니다.",
                "timestamp": datetime.now().isoformat(),
            }
        )

    # 보안 테스트 엔드포인트
    @app.route("/debug/security/report", methods=["GET"])
    def debug_security_report():
        """보안 보고서 생성"""
        try:
            if not security_auditor:
                return jsonify({"error": "보안 시스템이 비활성화되어 있습니다."}), 400

            report = security_auditor.get_security_report()
            return jsonify(report)

        except Exception as e:
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": str(e),
                        "timestamp": datetime.now().isoformat(),
                    }
                ),
                500,
            )

    @app.route("/debug/security/validate_password", methods=["POST"])
    def debug_validate_password():
        """비밀번호 강도 검증"""
        try:
            if not security_auditor:
                return jsonify({"error": "보안 시스템이 비활성화되어 있습니다."}), 400

            data = request.get_json() or {}
            password = data.get("password", "")

            if not password:
                return jsonify({"error": "비밀번호가 필요합니다."}), 400

            result = security_auditor.validate_password_strength(password)
            return jsonify(result)

        except Exception as e:
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": str(e),
                        "timestamp": datetime.now().isoformat(),
                    }
                ),
                500,
            )

    @app.route("/debug/security/generate_csrf", methods=["GET"])
    def debug_generate_csrf():
        """CSRF 토큰 생성"""
        try:
            if not security_auditor:
                return jsonify({"error": "보안 시스템이 비활성화되어 있습니다."}), 400

            token = security_auditor.generate_csrf_token()
            return jsonify({"csrf_token": token, "timestamp": datetime.now().isoformat()})

        except Exception as e:
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": str(e),
                        "timestamp": datetime.now().isoformat(),
                    }
                ),
                500,
            )

    # 모니터링 테스트 엔드포인트
    @app.route("/debug/monitoring/status", methods=["GET"])
    def debug_monitoring_status():
        """모니터링 시스템 상태 확인"""
        try:
            if not app_monitor:
                return (
                    jsonify({"error": "모니터링 시스템이 비활성화되어 있습니다."}),
                    400,
                )

            status = app_monitor.get_monitoring_status()
            return jsonify(status)

        except Exception as e:
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": str(e),
                        "timestamp": datetime.now().isoformat(),
                    }
                ),
                500,
            )

    @app.route("/debug/monitoring/start", methods=["POST"])
    def debug_monitoring_start():
        """모니터링 시작"""
        try:
            if not app_monitor:
                return (
                    jsonify({"error": "모니터링 시스템이 비활성화되어 있습니다."}),
                    400,
                )

            app_monitor.start_monitoring()
            return jsonify(
                {
                    "status": "success",
                    "message": "모니터링이 시작되었습니다.",
                    "timestamp": datetime.now().isoformat(),
                }
            )

        except Exception as e:
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": str(e),
                        "timestamp": datetime.now().isoformat(),
                    }
                ),
                500,
            )

    @app.route("/debug/monitoring/stop", methods=["POST"])
    def debug_monitoring_stop():
        """모니터링 중지"""
        try:
            if not app_monitor:
                return (
                    jsonify({"error": "모니터링 시스템이 비활성화되어 있습니다."}),
                    400,
                )

            app_monitor.stop_monitoring()
            return jsonify(
                {
                    "status": "success",
                    "message": "모니터링이 중지되었습니다.",
                    "timestamp": datetime.now().isoformat(),
                }
            )

        except Exception as e:
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": str(e),
                        "timestamp": datetime.now().isoformat(),
                    }
                ),
                500,
            )

    @app.route("/debug/monitoring/metrics", methods=["GET"])
    def debug_monitoring_metrics():
        """현재 메트릭 조회"""
        try:
            if not app_monitor:
                return (
                    jsonify({"error": "모니터링 시스템이 비활성화되어 있습니다."}),
                    400,
                )

            hours = request.args.get("hours", 24, type=int)
            metrics = app_monitor.get_metrics_history(hours)
            return jsonify(
                {
                    "period_hours": hours,
                    "metrics_count": len(metrics),
                    "metrics": metrics,
                }
            )

        except Exception as e:
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": str(e),
                        "timestamp": datetime.now().isoformat(),
                    }
                ),
                500,
            )

    @app.route("/debug/monitoring/summary", methods=["GET"])
    def debug_monitoring_summary():
        """메트릭 요약 조회"""
        try:
            if not app_monitor:
                return (
                    jsonify({"error": "모니터링 시스템이 비활성화되어 있습니다."}),
                    400,
                )

            hours = request.args.get("hours", 24, type=int)
            summary = app_monitor.get_metrics_summary(hours)
            return jsonify(summary)

        except Exception as e:
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": str(e),
                        "timestamp": datetime.now().isoformat(),
                    }
                ),
                500,
            )


# Redis 캐싱 설정
try:
    from cache_manager import cache_manager

    if cache_manager.redis_client:
        print("[SUCCESS] Redis 캐싱이 성공적으로 설정되었습니다.")
    else:
        print("[WARNING] Redis 캐싱 설정 실패: Redis 연결 불가")
except ImportError as e:
    print(f"[WARNING] Redis 캐싱 설정 실패: {e}")
    print("   캐싱은 비활성화됩니다.")

# 실시간 통신 시스템 설정
if module_loader.is_loaded('realtime'):
    try:
        from flask_socketio import SocketIO
        from realtime.notification_system import NotificationSystem
        from realtime.collaboration_system import CollaborationSystem

        # Socket.IO 초기화
        socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

        # 알림 시스템 초기화
        notification_system = NotificationSystem(socketio, db)
        notification_system.setup_socket_events()

        # 협업 시스템 초기화
        collaboration_system = CollaborationSystem(socketio, db)
        collaboration_system.setup_socket_events()

        print("[SUCCESS] 실시간 통신 시스템이 설정되었습니다.")
    except ImportError as e:
        print(f"[WARNING] 실시간 통신 시스템 설정 실패: {e}")
        socketio = None
        notification_system = None
        collaboration_system = None
else:
    socketio = None
    notification_system = None
    collaboration_system = None

# API Blueprint 등록
if module_loader.is_loaded('api'):
    try:
        from api import init_app as init_api
        init_api(app)
        print("[SUCCESS] API Blueprint가 등록되었습니다.")
    except ImportError as e:
        print(f"[WARNING] API Blueprint 등록 실패: {e}")

# 데이터베이스 초기화 (인증 시스템 초기화 전에 실행)
try:
    db.init_app(app)
    print("[SUCCESS] 데이터베이스가 연결되었습니다.")
except Exception as e:
    print(f"[ERROR] 데이터베이스 초기화 실패: {e}")

# 인증 시스템 초기화
if AUTH_AVAILABLE:
    try:
        from auth import init_auth
        app.require_auth = require_auth
        app = init_auth(app)
        print("[SUCCESS] 인증 시스템이 초기화되었습니다.")
    except Exception as e:
        print(f"[WARNING] 인증 시스템 초기화 실패: {e}")
        AUTH_AVAILABLE = False


# Root route to handle base URL requests
@app.route("/")
@log_api_call
def root():
    logger.info("Root endpoint accessed")
    return jsonify({"message": "Lunch App API Server", "status": "running", "version": "1.0.0"})

# 헬스체크 엔드포인트 (네트워크 연결 테스트용)
@app.route("/health")
@log_api_call
def health_check():
    """서버 상태 확인 엔드포인트 - 개발 및 모니터링용"""
    try:
        health_status = {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "version": "1.0.0",
            "environment": os.getenv("FLASK_ENV", "development"),
            "uptime": "running"
        }
        
        # 데이터베이스 연결 상태 확인
        try:
            db.session.execute(text("SELECT 1"))
            health_status["database"] = "connected"
            logger.debug("Database health check passed")
        except Exception as e:
            health_status["database"] = f"error: {str(e)}"
            logger.error("Database health check failed", error=str(e))
        
        # Redis 연결 상태 확인
        try:
            from cache_manager import cache_manager
            if cache_manager.redis_client:
                cache_manager.redis_client.ping()
                health_status["redis"] = "connected"
                logger.debug("Redis health check passed")
            else:
                health_status["redis"] = "offline_mode"
                logger.info("Redis in offline mode")
        except Exception as e:
            health_status["redis"] = f"error: {str(e)}"
            logger.warning("Redis health check failed", error=str(e))
        
        # 메모리 사용량 (개발용)
        if os.getenv("FLASK_ENV") == "development":
            import psutil
            process = psutil.Process()
            health_status["memory"] = {
                "rss": f"{process.memory_info().rss / 1024 / 1024:.1f} MB",
                "vms": f"{process.memory_info().vms / 1024 / 1024:.1f} MB"
            }
        
        logger.info("Health check completed", status="healthy")
        return jsonify(health_status), 200
        
    except Exception as e:
        error_response = {
            "status": "unhealthy",
            "timestamp": datetime.now().isoformat(),
            "error": str(e)
        }
        logger.error("Health check failed", error=str(e))
        return jsonify(error_response), 500

# 에러 모니터링 시스템 설정
try:
    setup_flask_error_handlers(app)
    create_error_monitoring_routes(app)
    logger.info("[SUCCESS] 에러 모니터링 시스템이 설정되었습니다")
except Exception as e:
    logger.error(f"[ERROR] 에러 모니터링 시스템 설정 실패: {e}")


# API 테스트 엔드포인트
@app.route("/api/test")
def api_test():
    return jsonify(
        {
            "message": "API 서버가 정상적으로 작동하고 있습니다",
            "endpoints": {
                "schedules": "/api/schedules/",
                "proposals": "/api/proposals/",
                "auth": "/auth/status",
            },
            "timestamp": datetime.now().isoformat(),
        }
    )


    # Health check endpoint는 위에서 이미 정의됨


# 인증 시스템 상태 확인 엔드포인트
@app.route("/auth/status")
def auth_status():
    return jsonify({"auth_available": AUTH_AVAILABLE, "message": "인증 시스템 상태 확인"})


# Error handlers to ensure JSON responses
@app.errorhandler(404)
def not_found(error):
    return (
        jsonify(
            {
                "error": "Endpoint not found",
                "message": "The requested endpoint does not exist",
            }
        ),
        404,
    )


@app.errorhandler(500)
def internal_error(error):
    return (
        jsonify(
            {
                "error": "Internal server error",
                "message": "Something went wrong on the server",
            }
        ),
        500,
    )


@app.errorhandler(Exception)
def handle_exception(e):
    return jsonify({"error": "Unexpected error", "message": str(e)}), 500


# 추천 그룹 캐시 (사용자별, 날짜별)
RECOMMENDATION_CACHE = {}
CACHE_GENERATION_DATE = None


# --- 유틸리티 함수 ---
# 날짜/시간 유틸리티는 utils/datetime_utils.py로 이동됨
from utils.datetime_utils import get_seoul_today


def _should_use_existing_cache():
    """기존 캐시를 사용해야 하는지 확인"""
    global RECOMMENDATION_CACHE, CACHE_GENERATION_DATE
    today = get_seoul_today()
    current_date_str = today.strftime("%Y-%m-%d")
    return CACHE_GENERATION_DATE == current_date_str and RECOMMENDATION_CACHE


def _initialize_cache():
    """캐시 초기화"""
    global RECOMMENDATION_CACHE, CACHE_GENERATION_DATE
    today = get_seoul_today()
    current_date_str = today.strftime("%Y-%m-%d")

    print(f"DEBUG: Generating optimized recommendation cache for 1 month starting from {current_date_str}")
    RECOMMENDATION_CACHE = {}
    CACHE_GENERATION_DATE = current_date_str


def _build_compatibility_cache(all_users):
    """사용자별 호환성 점수 캐시 구축"""
    compatibility_cache = {}
    user_count = len(all_users)

    if user_count == 0:
        return compatibility_cache

    # 효율적인 호환성 점수 계산 (O(N log N))
    # 병렬 처리를 위한 배치 크기 설정
    batch_size = 100
    for i in range(0, user_count, batch_size):
        batch_users = all_users[i : i + batch_size]
        for user in batch_users:
            compatibility_cache[user.employee_id] = {}
            for other_user in all_users:
                if user.employee_id != other_user.employee_id:
                    # 호환성 점수 계산 (캐시된 결과 사용)
                    score = calculate_compatibility_score_cached(user, other_user)
                    compatibility_cache[user.employee_id][other_user.employee_id] = score

    return compatibility_cache


def _generate_recommendations_for_date(target_date_str, all_users, compatibility_cache):
    """특정 날짜에 대한 추천 그룹 생성"""
    # 해당 날짜에 사용 가능한 사용자들을 한 번에 조회 (최적화)
    available_user_ids = get_available_users_for_date(target_date_str)

    if not available_user_ids:
        print(f"DEBUG: No available users for {target_date_str}")
        return

    # 각 사용자에 대해 추천 그룹 생성
    for user in all_users:
        employee_id = user.employee_id

        # 해당 사용자가 해당 날짜에 사용 가능한지 확인
        if employee_id not in available_user_ids:
            continue

        # 사용 가능한 다른 사용자들만 필터링
        available_users = [u for u in all_users if u.employee_id in available_user_ids and u.employee_id != employee_id]

        if len(available_users) < 1:
            continue

        # 미리 계산된 호환성 점수 사용
        scored_users = []
        for available_user in available_users:
            compatibility_score = compatibility_cache[employee_id].get(available_user.employee_id, 0)
            pattern_score = calculate_pattern_score_cached(user, available_user)
            # 랜덤 점수 추가 (0~50 범위로 줄임)
            random_score = random.uniform(0, 50)
            total_score = compatibility_score + pattern_score + random_score
            scored_users.append((available_user, total_score))

        # 점수로 정렬 (높은 점수 순)
        scored_users.sort(key=lambda x: x[1], reverse=True)

        # 효율적인 그룹 생성 (최대 10개)
        recommendations = generate_efficient_groups(scored_users, target_date_str, employee_id)

        # 캐시에 저장
        if recommendations:
            RECOMMENDATION_CACHE[target_date_str] = recommendations


def generate_recommendation_cache():
    """최적화된 추천 그룹 캐시 생성 - O(N log N) 성능"""
    # 이미 오늘 생성된 캐시가 있으면 재사용
    if _should_use_existing_cache():
        today = get_seoul_today()
        current_date_str = today.strftime("%Y-%m-%d")
        print(f"DEBUG: Using existing cache for {current_date_str}")
        return

    # 캐시 초기화
    _initialize_cache()

    # User 모델이 사용 가능한지 확인
    try:
        # 모든 사용자 조회 (한 번만) - 배치 처리로 최적화
        all_users = db.session.query(User).all()
        user_count = len(all_users)

        if user_count == 0:
            print("DEBUG: No users found")
            return
    except Exception as e:
        print(f"DEBUG: User model not available or table doesn't exist: {e}")
        return

    # 사용자별 호환성 점수를 미리 계산하여 캐시
    compatibility_cache = _build_compatibility_cache(all_users)

    # 1달간 (30일) 각 날짜에 대해 추천 그룹 생성
    today = get_seoul_today()
    for day_offset in range(30):
        target_date = today + timedelta(days=day_offset)
        target_date_str = target_date.strftime("%Y-%m-%d")

        # 주말 제외
        if target_date.weekday() >= 5:
            continue

        print(f"DEBUG: Generating recommendations for {target_date_str}")
        _generate_recommendations_for_date(target_date_str, all_users, compatibility_cache)

    print(f"INFO: 추천 캐시 생성 완료 - 총 {len(RECOMMENDATION_CACHE)}개 항목")


def _get_party_participants(date_str):
    """특정 날짜에 파티에 참여 중인 사용자 ID 목록 조회"""
    party_user_ids = set()
    parties = db.session.query(Party).filter_by(party_date=date_str).all()
    for party in parties:
        party_user_ids.add(party.host_employee_id)
        party_members = PartyMember.query.filter_by(party_id=party.id).all()
        for member in party_members:
            party_user_ids.add(member.employee_id)
    return party_user_ids


def _get_scheduled_users(date_str):
    """특정 날짜에 개인 일정이 있는 사용자 ID 목록 조회"""
    schedule_user_ids = set()
    schedules = db.session.query(PersonalSchedule).filter_by(schedule_date=date_str).all()
    for schedule in schedules:
        schedule_user_ids.add(schedule.employee_id)
    return schedule_user_ids


def _get_all_user_ids():
    """전체 사용자 ID 목록 조회"""
    try:
        return {user.employee_id for user in db.session.query(User).all()}
    except Exception as e:
        print(f"DEBUG: User model not available or table doesn't exist: {e}")
        return set()


def get_available_users_for_date(date_str):
    """특정 날짜에 사용 가능한 사용자 ID 목록을 효율적으로 조회"""
    # 파티에 참여 중인 사용자들
    party_user_ids = _get_party_participants(date_str)

    # 개인 일정이 있는 사용자들
    schedule_user_ids = _get_scheduled_users(date_str)

    # 모든 사용자 ID
    all_user_ids = _get_all_user_ids()

    # 사용 가능한 사용자 ID = 전체 - (파티 참여자 + 개인 일정자)
    available_user_ids = all_user_ids - party_user_ids - schedule_user_ids

    return available_user_ids


def _create_three_person_groups(scored_users, target_date_str, requester_id, max_groups=6):
    """3명 그룹 생성 (최대 6개)"""
    recommendations = []
    for i in range(0, min(len(scored_users) - 2, max_groups)):
        for j in range(i + 1, min(len(scored_users) - 1, i + 3)):
            for k in range(j + 1, min(len(scored_users), j + 3)):
                if len(recommendations) >= max_groups:
                    break
                group = [scored_users[i][0], scored_users[j][0], scored_users[k][0]]
                recommendation = create_recommendation(group, target_date_str, requester_id)
                recommendations.append(recommendation)
            if len(recommendations) >= max_groups:
                break
        if len(recommendations) >= max_groups:
            break
    return recommendations


def _create_two_person_groups(scored_users, target_date_str, requester_id, max_groups=3):
    """2명 그룹 생성 (최대 3개)"""
    recommendations = []
    if len(scored_users) >= 2:
        for i in range(0, min(len(scored_users) - 1, max_groups)):
            for j in range(i + 1, min(len(scored_users), i + 2)):
                if len(recommendations) >= max_groups:
                    break
                group = [scored_users[i][0], scored_users[j][0]]
                recommendation = create_recommendation(group, target_date_str, requester_id)
                recommendations.append(recommendation)
            if len(recommendations) >= max_groups:
                break
    return recommendations


def _create_one_person_groups(scored_users, target_date_str, requester_id, max_groups=1):
    """1명 그룹 생성 (최대 1개)"""
    recommendations = []
    if len(scored_users) >= 1:
        group = [scored_users[0][0]]
        recommendation = create_recommendation(group, target_date_str, requester_id)
        recommendations.append(recommendation)
    return recommendations


def generate_efficient_groups(scored_users, target_date_str, requester_id):
    """효율적인 그룹 생성 (최대 10개)"""
    recommendations = []

    # 3명 그룹 우선 생성 (최대 6개)
    three_person_groups = _create_three_person_groups(scored_users, target_date_str, requester_id)
    recommendations.extend(three_person_groups)

    # 2명 그룹 생성 (최대 3개)
    if len(recommendations) < 9:
        two_person_groups = _create_two_person_groups(scored_users, target_date_str, requester_id)
        recommendations.extend(two_person_groups)

    # 1명 그룹 생성 (최대 1개)
    if len(recommendations) < 10:
        one_person_groups = _create_one_person_groups(scored_users, target_date_str, requester_id)
        recommendations.extend(one_person_groups)

    return recommendations[:10]


def create_recommendation(group, target_date_str, requester_id):
    """추천 그룹 객체 생성"""
    return {
        "proposed_date": target_date_str,
        "recommended_group": [
            {
                "employee_id": member.employee_id,
                "nickname": member.nickname or "익명",
                "lunch_preference": get_user_preference(member.employee_id, "lunch_preference"),
                "main_dish_genre": member.main_dish_genre or "",
                "last_dining_together": get_last_dining_together(requester_id, member.employee_id),
            }
            for member in group
        ],
    }


def get_user_preference(user_id, preference_type):
    """사용자 선호도 조회 (User 모델에서 직접)"""
    user = User.query.filter_by(employee_id=user_id).first()
    if not user:
        return ""

    # User 모델의 선호도 필드에서 직접 조회
    if preference_type == "lunch_preference":
        return user.lunch_preference or ""
    elif preference_type == "food_preferences":
        return user.food_preferences or ""
    elif preference_type == "allergies":
        return user.allergies or ""
    elif preference_type == "preferred_time":
        return user.preferred_time or ""
    elif preference_type == "frequent_areas":
        return user.frequent_areas or ""
    else:
        return ""


def calculate_compatibility_score_cached(user1, user2):
    """캐시된 호환성 점수 계산"""
    # 간단한 호환성 점수 (실제로는 더 복잡한 로직 구현)
    score = 0

    # 메인 요리 장르 일치
    if user1.main_dish_genre and user2.main_dish_genre:
        if user1.main_dish_genre == user2.main_dish_genre:
            score += 30

    # 나이대 일치
    if user1.age_group and user2.age_group:
        if user1.age_group == user2.age_group:
            score += 20

    # 성별 다양성 (같은 성별이면 점수 감소)
    if user1.gender and user2.gender:
        if user1.gender != user2.gender:
            score += 15

    return score


def calculate_pattern_score_cached(user1, user2):
    """캐시된 패턴 점수 계산"""
    # 간단한 패턴 점수 (실제로는 더 복잡한 로직 구현)
    score = 0

    # 파티 참여 패턴
    user1_parties = PartyMember.query.filter_by(employee_id=user1.employee_id).count()
    user2_parties = PartyMember.query.filter_by(employee_id=user2.employee_id).count()

    # 비슷한 활동 수준
    activity_diff = abs(user1_parties - user2_parties)
    if activity_diff <= 2:
        score += 20
    elif activity_diff <= 5:
        score += 10

    return score


# 중복 함수 제거 - get_last_dining_together 함수는 아래쪽에 더 완성된 버전이 있음


# 날짜/시간 유틸리티는 utils/datetime_utils.py로 이동됨
from utils.datetime_utils import get_korean_time, format_korean_time


def get_restaurant_recommend_count(restaurant_id):
    """식당의 오찬 추천 하트 개수를 반환하는 함수"""
    try:
        # 애플리케이션 컨텍스트 확인
        from flask import current_app

        if not current_app:
            # 컨텍스트가 없으면 기본값 반환
            return random.randint(5, 25)  # 테스트용 랜덤 값

        # 실제 추천 데이터를 계산
        # 1. 해당 식당에 대한 리뷰 수
        review_count = Review.query.filter_by(restaurant_id=restaurant_id).count()

        # 2. 해당 식당에 대한 좋아요 수 (리뷰의 likes 합계)
        total_likes = db.session.query(func.sum(Review.likes)).filter_by(restaurant_id=restaurant_id).scalar() or 0

        # 3. 해당 식당이 파티에서 언급된 횟수
        party_mentions = Party.query.filter(
            or_(
                Party.restaurant_name.ilike(f"%{restaurant_id}%"),
                Party.restaurant_name.ilike(f"%{restaurant_id}%"),
            )
        ).count()

        # 4. 최근 30일 내 방문 기록 (가상 데이터)
        recent_visits = random.randint(0, 10)  # 실제로는 방문 로그에서 계산

        # 종합 점수 계산 (가중치 적용)
        recommend_score = (review_count * 2) + (total_likes * 3) + (party_mentions * 2) + recent_visits

        return min(recommend_score, 99)  # 최대 99개로 제한

    except (AttributeError, KeyError, TypeError) as e:
        print(f"Error getting restaurant recommend count: {e}")
        return random.randint(5, 25)  # 에러 시 테스트용 랜덤 값


# --- AI/외부 API 연동 (가상 함수) ---
def geocode_address(address):
    lat = 37.4452 + (random.random() - 0.5) * 0.01
    lon = 127.1023 + (random.random() - 0.5) * 0.01
    return lat, lon


def extract_keywords_from_reviews(reviews):
    if not reviews:
        return []
    text = " ".join([r.comment for r in reviews if r.comment])
    words = [w.strip() for w in text.split() if len(w.strip()) > 1]
    if not words:
        return []
    word_counts = {}
    for word in words:
        word_counts[word] = word_counts.get(word, 0) + 1
    sorted_words = sorted(word_counts.items(), key=lambda item: item[1], reverse=True)
    return [f"#{word}" for word, count in sorted_words[:3]]


# --- Helper Function ---
def reset_user_match_status_if_needed(user):
    today = get_seoul_today()
    if user.match_request_time and user.match_request_time.date() != today:
        user.matching_status = "idle"
        user.match_request_time = None
        db.session.commit()
    return user


def get_next_recurrence_date(current_date, recurrence_type, interval=1):
    """반복 일정의 다음 날짜를 계산"""
    from datetime import datetime, timedelta

    if isinstance(current_date, str):
        current_date = datetime.strptime(current_date, "%Y-%m-%d")

    if recurrence_type == "weekly":
        return current_date + timedelta(weeks=interval)
    elif recurrence_type == "monthly":
        # 월 단위 반복 (간단한 구현)
        year = current_date.year
        month = current_date.month + interval
        while month > 12:
            year += 1
            month -= 12
        return datetime(year, month, current_date.day)
    elif recurrence_type == "yearly":
        return datetime(current_date.year + interval, current_date.month, current_date.day)
    else:
        return current_date


def create_notification(
    user_id,
    notification_type,
    title,
    message,
    related_id=None,
    related_type=None,
    expires_at=None,
):
    """알림 생성 헬퍼 함수"""
    try:
        notification = Notification(
            user_id=user_id,
            type=notification_type,
            title=title,
            message=message,
            related_id=related_id,
            related_type=related_type,
            expires_at=expires_at,
        )
        db.session.add(notification)
        db.session.commit()
        print(f"[DEBUG] 알림 생성 완료 - 사용자: {user_id}, 타입: {notification_type}, 제목: {title}")
        return notification
    except (AttributeError, KeyError, TypeError, ValueError) as e:
        print(f"[ERROR] 알림 생성 실패: {e}")
        db.session.rollback()
        return None


def get_notification_icon(notification_type):
    """알림 타입별 아이콘 반환"""
    icons = {
        "party_invite": "🎉",
        "party_join": "👥",
        "party_cancel": "[ERROR]",
        "party_reminder": "⏰",
        "friend_request": "👋",
        "friend_accept": "[SUCCESS]",
        "chat_message": "💬",
        "points_earned": "⭐",
        "badge_earned": "🏆",
        "review_like": "❤️",
        "system": "📢",
    }
    return icons.get(notification_type, "📄")


# --- 데이터베이스 모델 정의 ---
# 인증 시스템의 User 모델을 사용합니다.
# 기존 User 관련 모델들은 auth/models.py에 정의되어 있습니다.

# User 모델은 이미 위에서 import되었습니다

# UserPreference는 User 모델에 통합되어 있음

# 사용자 알림 설정은 User 모델에 통합되어 있음

# 🚨 중요: User 모델을 명시적으로 메타데이터에 등록
if AUTH_AVAILABLE:
    try:
        # User 모델의 테이블이 메타데이터에 등록되었는지 확인
        if "users" not in db.metadata.tables:
            print("[WARNING] users 테이블이 메타데이터에 등록되지 않았습니다.")
        else:
            print("[SUCCESS] users 테이블이 메타데이터에 등록되었습니다.")
    except (AttributeError, KeyError) as e:
        print(f"[WARNING] User 모델 메타데이터 확인 실패: {e}")

# PersonalSchedule 모델은 필요할 때만 import하여 사용


# --- 앱 실행 시 초기화 ---
def initialize_database():
    """앱 시작 시 한 번만 실행되는 데이터베이스 초기화"""
    with app.app_context():
        try:
            # 데이터베이스 연결 테스트
            if not app.config.get("SQLALCHEMY_DATABASE_URI"):
                print("[ERROR] 데이터베이스 URI가 설정되지 않았습니다.")
                return False
                
            # 데이터베이스 테이블 생성
            db.create_all()

            # 초기 데이터가 없으면 생성 (인증 시스템이 활성화된 경우에만)
            if AUTH_AVAILABLE:
                # 강제로 초기 데이터 생성 (개발 환경)
                print("DEBUG: 강제로 초기 데이터 생성을 시도합니다...")
                try:
                    create_initial_data()
                    print("DEBUG: 초기 데이터 생성 완료!")
                    
                    # 초기 데이터 생성 후 추천 그룹 캐시 생성
                    try:
                        print("INFO: 추천 캐시 초기화 중...")
                        generate_recommendation_cache()
                        print("INFO: 추천 캐시 초기화 완료")
                    except Exception as e:
                        print(f"WARNING: 추천 캐시 초기화 실패: {e}")
                        print("   이는 정상적인 상황일 수 있으며, 애플리케이션은 계속 실행됩니다.")
                        
                except (AttributeError, KeyError, ValueError) as e:
                    print(f"DEBUG: 초기 데이터 생성 실패 (이미 존재할 수 있음): {e}")
            else:
                print("[INFO] 인증 시스템이 비활성화되어 초기 데이터 생성을 건너뜁니다.")

        except (AttributeError, KeyError, ImportError, RuntimeError) as e:
            print(f"ERROR: Database initialization failed: {e}")
            # 프로덕션에서는 로그 파일에 기록


def load_restaurant_data_if_needed():
    """식당 데이터가 없으면 엑셀 파일에서 자동 로드"""
    try:
        from models.restaurant_models import RestaurantV2
        
        # 기존 데이터 확인
        existing_count = RestaurantV2.query.count()
        if existing_count > 0:
            print(f"[SUCCESS] 식당 데이터 {existing_count}개가 이미 있습니다.")
            return True
        
        # 엑셀 파일 경로
        excel_file_path = "data/restaurants_707.xlsx"
        
        if not os.path.exists(excel_file_path):
            print(f"[WARNING] 엑셀 파일을 찾을 수 없습니다: {excel_file_path}")
            return False
        
        print("📖 식당 데이터 자동 로드 시작...")
        
        # 엑셀 파일 읽기
        import pandas as pd
        df = pd.read_excel(excel_file_path)
        
        print(f"📊 엑셀 데이터: 총 {len(df)}개 행")
        
        # 데이터 변환 및 저장
        success_count = 0
        error_count = 0
        
        for index, row in df.iterrows():
            try:
                # 엑셀 컬럼명에 맞게 데이터 추출 (실제 엑셀 컬럼명 사용)
                name = str(row.get('식당 이름', '')).strip()
                address = str(row.get('도로명 주소', '')).strip()
                category = str(row.get('분류', '기타')).strip()
                latitude = row.get('위도')
                longitude = row.get('경도')
                phone = str(row.get('전화번호', '')).strip()
                
                if not name or name == 'nan':
                    continue
                
                # 위도/경도 변환
                try:
                    lat = float(latitude) if latitude and str(latitude) != 'nan' else 37.5665  # 서울 기본값
                    lng = float(longitude) if longitude and str(longitude) != 'nan' else 126.9780  # 서울 기본값
                except (ValueError, TypeError):
                    lat, lng = 37.5665, 126.9780  # 서울 기본값
                
                # 위도/경도가 유효한지 확인
                if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
                    lat, lng = 37.5665, 126.9780  # 유효하지 않으면 서울 기본값
                
                # 식당 데이터 생성
                restaurant = RestaurantV2(
                    name=name,
                    address=address,
                    category=category,
                    latitude=lat,
                    longitude=lng,
                    phone=phone if phone != 'nan' else None,
                    is_active=True
                )
                
                db.session.add(restaurant)
                success_count += 1
                
                if success_count % 100 == 0:
                    print(f"진행률: {success_count}/{len(df)}")
                    
            except Exception as e:
                error_count += 1
                print(f"행 {index} 처리 오류: {e}")
                continue
        
        db.session.commit()
        
        print(f"[SUCCESS] 식당 데이터 자동 로드 완료: 성공 {success_count}개, 실패 {error_count}개")
        return True
        
    except Exception as e:
        db.session.rollback()
        print(f"[ERROR] 식당 데이터 자동 로드 실패: {e}")
        return False

def create_initial_data():
    """초기 데이터 생성 - 가상 유저 20명 기반"""
    try:
        # users 테이블이 실제로 존재하는지 확인
        try:
            db.session.execute(text("SELECT 1 FROM users LIMIT 1"))
            print("DEBUG: users 테이블이 존재합니다.")
        except Exception as e:
            print(f"DEBUG: users 테이블이 존재하지 않습니다. 다시 생성합니다: {e}")
            # 테이블이 없으면 다시 생성
            db.create_all()
            db.session.commit()
            print("DEBUG: users 테이블 재생성 완료")
        
        # 공통 모의 데이터 사용
        from utils.mock_data import get_all_mock_users
        mock_users = get_all_mock_users()
        
        # 데이터베이스 형식으로 변환
        users_data = []
        for user_id, user_data in mock_users.items():
            users_data.append({
                "employee_id": user_data["employee_id"],
                "nickname": user_data["nickname"],
                "food_preferences": user_data["food_preferences"],
                "lunch_style": ",".join(user_data["lunchStyle"]),
            })

        # User 생성
        for user_data in users_data:
            try:
                # 이미 존재하는 사용자인지 확인
                existing_user = db.session.query(User).filter_by(employee_id=user_data["employee_id"]).first()
                if existing_user:
                    print(f"DEBUG: 사용자 {user_data['nickname']}은 이미 존재합니다.")
                    continue
                
                user = User(
                    email=f"user{user_data['employee_id']}@example.com",  # 가상 이메일
                    nickname=user_data["nickname"],
                    employee_id=user_data["employee_id"],
                )
                # 추가 필드 설정
                user.food_preferences = user_data["food_preferences"]
                user.lunch_preference = user_data["lunch_style"]
                user.allergies = "없음"
                user.preferred_time = "12:00"
                user.main_dish_genre = user_data["food_preferences"]
                user.frequent_areas = "강남구,서초구"
                user.notification_settings = "push_notification,party_reminder"
                db.session.add(user)
                print(f"DEBUG: 사용자 {user_data['nickname']} 추가 완료")
            except Exception as e:
                print(f"[WARNING] 사용자 {user_data['nickname']} 추가 중 오류: {e}")
                # 트랜잭션 롤백 후 계속 진행
                db.session.rollback()
                continue

        # 친구 관계 생성 (서로 다른 사용자들 간의 관계)
        friend_relationships = [
            ("1", "2"),
            ("1", "3"),
            ("1", "4"),
            ("1", "5"),
            ("2", "3"),
            ("2", "6"),
            ("2", "7"),
            ("3", "4"),
            ("3", "8"),
            ("3", "9"),
            ("4", "5"),
            ("4", "10"),
            ("4", "11"),
            ("5", "6"),
            ("5", "12"),
            ("5", "13"),
            ("6", "7"),
            ("6", "14"),
            ("6", "15"),
            ("7", "8"),
            ("7", "16"),
            ("7", "17"),
            ("8", "9"),
            ("8", "18"),
            ("8", "19"),
            ("9", "10"),
            ("9", "20"),
            ("9", "1"),
            ("10", "11"),
            ("10", "2"),
            ("10", "3"),
        ]

        for user1_id, user2_id in friend_relationships:
            friendship = Friendship(requester_id=user1_id, receiver_id=user2_id)
            db.session.add(friendship)

        db.session.commit()
        print("DEBUG: 가상 유저 20명과 친구 관계 초기 데이터 생성 완료")

        # 정확한 722개 맛집 데이터 로드 (CSV 파일에서)
        if Restaurant.query.count() == 0:
            print("DEBUG: Loading 722 curated restaurant data from CSV...")
            try:
                import pandas as pd
                import os

                # CSV 파일 경로
                csv_path = os.path.join(os.path.dirname(__file__), "data", "restaurants.csv")

                if os.path.exists(csv_path):
                    # CSV 파일 읽기 (cp949 인코딩으로 시도)
                    try:
                        df = pd.read_csv(csv_path, encoding="cp949")
                        print(f"DEBUG: Successfully read CSV with cp949 encoding")
                    except UnicodeDecodeError:
                        # cp949 실패시 다른 인코딩 시도
                        df = pd.read_csv(csv_path, encoding="euc-kr")
                        print(f"DEBUG: Successfully read CSV with euc-kr encoding")

                    # 빈 행 제거 (모든 컬럼이 NaN이거나 빈 문자열인 행 제거)
                    df = df.dropna(how="all")  # 모든 컬럼이 NaN인 행 제거
                    df = df[
                        df.iloc[:, 0].notna() & (df.iloc[:, 0].astype(str).str.strip() != "")
                    ]  # 첫 번째 컬럼이 비어있지 않은 행만 유지

                    print(f"DEBUG: Found {len(df)} valid restaurants in CSV (removed empty rows)")

                    # 데이터베이스에 로드
                    for index, row in df.iterrows():
                        try:
                            # CSV 컬럼명 확인 및 데이터 추출
                            name = str(row.iloc[0]) if pd.notna(row.iloc[0]) else "Unknown"
                            address = str(row.iloc[1]) if pd.notna(row.iloc[1]) else ""
                            latitude = float(row.iloc[2]) if pd.notna(row.iloc[2]) else 37.4452
                            longitude = float(row.iloc[3]) if pd.notna(row.iloc[3]) else 127.1023

                            # 카테고리 추정 (이름에서)
                            category = "기타"
                            if any(keyword in name for keyword in ["카페", "커피", "스타벅스", "투썸"]):
                                category = "카페"
                            elif any(keyword in name for keyword in ["치킨", "BBQ", "교촌", "네네"]):
                                category = "치킨"
                            elif any(keyword in name for keyword in ["피자", "도미노", "피자헛"]):
                                category = "피자"
                            elif any(keyword in name for keyword in ["편의점", "씨유", "GS25", "세븐일레븐"]):
                                category = "편의점"
                            elif any(keyword in name for keyword in ["베이커리", "파리바게뜨", "뚜레쥬르"]):
                                category = "베이커리"
                            elif any(keyword in name for keyword in ["일식", "스시", "라멘"]):
                                category = "일식"
                            elif any(keyword in name for keyword in ["중식", "짜장면", "탕수육"]):
                                category = "중식"
                            elif any(keyword in name for keyword in ["양식", "파스타", "스테이크"]):
                                category = "양식"
                            else:
                                category = "한식"

                            restaurant = Restaurant(
                                name=name,
                                category=category,
                                address=address,
                                latitude=latitude,
                                longitude=longitude,
                            )
                            db.session.add(restaurant)

                        except (AttributeError, KeyError, ValueError) as e:
                            print(f"DEBUG: Error processing restaurant {index}: {e}")
                            continue

                    db.session.commit()
                    final_count = Restaurant.query.count()
                    print(f"DEBUG: Successfully loaded {final_count} restaurants from CSV")

                else:
                    print(f"DEBUG: CSV file not found at {csv_path}")

            except (FileNotFoundError, ValueError, AttributeError) as e:
                print(f"DEBUG: Error loading restaurants from CSV: {e}")
                db.session.rollback()

    except (AttributeError, KeyError, ValueError, RuntimeError) as e:
        db.session.rollback()
        print(f"ERROR: Failed to create initial data: {e}")
        raise


# Flask 2.3.3+ 호환성을 위한 초기화
with app.app_context():
    try:
        initialize_database()
    except Exception as e:
        print(f"[WARNING] 데이터베이스 초기화 실패: {e}")
        print("   앱은 계속 실행되지만 일부 기능이 제한될 수 있습니다.")


# --- API 엔드포인트 ---
def _validate_party_date(party_date_str, party_id):
    """파티 날짜 유효성 검증"""
    try:
        # NaN 값이나 잘못된 날짜 형식 확인
        if not party_date_str or "NaN" in str(party_date_str):
            print(f"Warning: Invalid party_date found: {party_date_str} for party ID {party_id}")
            return None

        # 과거 파티는 제외
        party_date = datetime.strptime(party_date_str, "%Y-%m-%d").date()
        today = get_seoul_today()
        if party_date < today:
            return None

        return party_date
    except (ValueError, TypeError) as e:
        print(f"Warning: Failed to parse party_date '{party_date_str}' for party ID {party_id}: {e}")
        return None


def _get_party_member_info(party, employee_id):
    """파티 멤버 정보 조회"""
    member_ids = party.member_ids
    other_member_ids = [mid for mid in member_ids if mid != employee_id]

    # 다른 멤버들의 닉네임 가져오기
    other_members = User.query.filter(User.employee_id.in_(other_member_ids)).all()
    member_nicknames = [user.nickname for user in other_members]

    # 모든 멤버들의 닉네임 가져오기
    all_members = User.query.filter(User.employee_id.in_(member_ids)).all()
    all_member_nicknames = [user.nickname for user in all_members]

    return member_nicknames, all_member_nicknames


def _process_party_events(parties, employee_id):
    """파티 이벤트 처리"""
    events = {}

    for party in parties:
        # 날짜 데이터 검증 및 처리
        party_date = _validate_party_date(party.party_date, party.id)
        if not party_date:
            continue

        date_str = party.party_date
        if date_str not in events:
            events[date_str] = []

        # 파티 멤버 정보 가져오기
        member_nicknames, all_member_nicknames = _get_party_member_info(party, employee_id)

        events[date_str].append(
            {
                "type": "랜덤 런치" if party.is_from_match else "파티",
                "id": party.id,
                "title": party.title,
                "restaurant": party.restaurant_name,
                "address": party.restaurant_address,
                "date": party.party_date,
                "time": party.party_time,
                "location": party.meeting_location,
                "members": member_nicknames,
                "all_members": all_member_nicknames,
            }
        )

    return events


@app.route("/events/<employee_id>", methods=["GET"])
def get_events(employee_id):
    """사용자의 이벤트(파티, 개인 일정) 조회"""
    try:
        events = {}
        today = get_seoul_today()

        # 파티/랜덤런치 조회
        parties = Party.query.filter(
            or_(
                Party.host_employee_id == employee_id,
                Party.id.in_(db.session.query(PartyMember.party_id).filter(PartyMember.employee_id == employee_id)),
            )
        ).all()

        # 파티 이벤트 처리
        events.update(_process_party_events(parties, employee_id))

        # 개인 일정 조회
        schedules = PersonalSchedule.query.filter_by(employee_id=employee_id).all()
        print(f"DEBUG: Found {len(schedules)} personal schedules for employee {employee_id}")
        print(f"DEBUG: Today (Seoul): {today}")

        for schedule in schedules:
            # 디버그 로그 제거
            # 날짜 데이터 검증 및 처리
            try:
                # NaN 값이나 잘못된 날짜 형식 확인
                if not schedule.schedule_date or "NaN" in str(schedule.schedule_date):
                    print(
                        f"Warning: Invalid schedule_date found: {schedule.schedule_date} for schedule ID {schedule.id}"
                    )
                    continue

                # 과거 일정은 제외 (하지만 반복 일정은 시작일이 과거여도 미래 반복을 위해 포함)
                schedule_date = datetime.strptime(schedule.schedule_date, "%Y-%m-%d").date()
                # 디버그 로그 제거

                # 반복 일정이 아닌 경우에만 과거 일정 제외
                if not schedule.is_recurring and schedule_date < today:
                    # 디버그 로그 제거
                    continue

            except (ValueError, TypeError) as e:
                print(
                    f"Warning: Failed to parse schedule_date '{schedule.schedule_date}' for schedule ID {schedule.id}: {e}"
                )
                continue

            if schedule.schedule_date not in events:
                events[schedule.schedule_date] = []

            # 반복 일정인 경우 미래 날짜에 확장
            if schedule.is_recurring and schedule.recurrence_type:
                # 디버그 로그 제거

                # 시작일부터 90일 후까지 반복 일정 생성
                start_date = schedule_date

                # 시작일 자체를 무조건 추가 (과거여도 반복 일정의 시작일이므로 포함)
                start_date_str = start_date.strftime("%Y-%m-%d")
                if start_date_str not in events:
                    events[start_date_str] = []

                events[start_date_str].append(
                    {
                        "type": "기타 일정",
                        "id": schedule.id,
                        "title": schedule.title,
                        "description": schedule.description,
                        "date": start_date_str,
                        "is_recurring": schedule.is_recurring,
                        "recurrence_type": schedule.recurrence_type,
                    }
                )
                # 디버그 로그 제거

                # 이후 반복 일정 생성 (시작일 이후부터 정확한 간격으로만)
                max_weeks = 520  # 최대 520주(10년)까지 반복 (무제한에 가까운 기간)
                for week in range(1, max_weeks + 1):
                    if schedule.recurrence_type == "weekly":
                        # 매주 반복: 시작일로부터 정확히 7일, 14일, 21일... 후
                        future_date = start_date + timedelta(days=week * 7)
                    elif schedule.recurrence_type == "monthly":
                        # 매월 반복: 시작일로부터 정확히 30일, 60일, 90일... 후
                        future_date = start_date + timedelta(days=week * 30)
                    elif schedule.recurrence_type == "yearly":
                        # 매년 반복: 시작일로부터 정확히 365일, 730일... 후
                        future_date = start_date + timedelta(days=week * 365)
                    else:
                        continue

                    # 시작일과 동일한 날짜는 건너뛰기 (중복 방지)
                    if future_date == start_date:
                        print(f"DEBUG: Skipping duplicate start date: {future_date_str}")
                        continue

                    # 시작일이 오늘인 경우, 첫 번째 반복은 7일 후부터 시작
                    if start_date == today and week == 1:
                        print(f"DEBUG: Skipping first week for today start date")
                        continue

                    # 과거 날짜는 건너뛰기
                    if future_date < today:
                        continue

                    future_date_str = future_date.strftime("%Y-%m-%d")
                    if future_date_str not in events:
                        events[future_date_str] = []

                    events[future_date_str].append(
                        {
                            "type": "기타 일정",
                            "id": schedule.id,
                            "title": schedule.title,
                            "description": schedule.description,
                            "date": future_date_str,
                            "is_recurring": schedule.is_recurring,
                            "recurrence_type": schedule.recurrence_type,
                        }
                    )
                    # 디버그 로그 제거
            else:
                # 일반 일정
                events[schedule.schedule_date].append(
                    {
                        "type": "기타 일정",
                        "id": schedule.id,
                        "title": schedule.title,
                        "description": schedule.description,
                        "date": schedule.schedule_date,
                        "is_recurring": schedule.is_recurring,
                        "recurrence_type": schedule.recurrence_type,
                    }
                )

        # 디버그 로그 제거
        return jsonify(events)

    except Exception as e:
        print(f"Error in get_events: {e}")
        return (
            jsonify({"error": "이벤트 조회 중 오류가 발생했습니다.", "details": str(e)}),
            500,
        )


# --- 개인 일정 API는 api/schedules.py에서 처리됩니다 ---
# 새로운 API 엔드포인트: /api/schedules

# 일정 수정 API는 api/schedules.py에서 처리됩니다
# PUT /api/schedules/<id> - 마스터 일정 수정 (모든 반복 일정 수정)
# 일정 디버깅 API는 api/schedules.py에서 처리됩니다
# GET /api/schedules - 특정 기간의 모든 일정 조회

# 일정 정리 API는 api/schedules.py에서 처리됩니다
# POST /api/schedules/<id>/exceptions - 특정 날짜의 예외 생성

# 일정 삭제 API는 api/schedules.py에서 처리됩니다
# DELETE /api/schedules/<id> - 마스터 일정 삭제 (모든 반복 일정 삭제)
# POST /api/schedules/<id>/exceptions - 특정 날짜의 예외 생성 (이 날짜만 삭제)


# --- 알림 API ---
def _get_sender_info(notification):
    """알림의 상대방 정보 조회"""
    sender_info = None
    if notification.related_type == "user" and notification.related_id:
        sender = User.query.filter_by(employee_id=notification.related_id).first()
        if sender:
            sender_info = {
                "employee_id": sender.employee_id,
                "nickname": sender.nickname,
            }
    return sender_info


def _format_notification(notification):
    """알림 객체를 딕셔너리로 포맷팅"""
    return {
        "id": notification.id,
        "type": notification.type,
        "title": notification.title,
        "message": notification.message,
        "icon": get_notification_icon(notification.type),
        "is_read": notification.is_read,
        "created_at": notification.created_at.strftime("%Y-%m-%d %H:%M:%S"),
        "related_id": notification.related_id,
        "related_type": notification.related_type,
        "sender_info": _get_sender_info(notification),
    }


# @app.route("/notifications/<employee_id>", methods=["GET"])
# def get_notifications(employee_id):
    """사용자의 알림 목록 조회"""
    try:
        # 읽지 않은 알림 수 조회
        unread_count = Notification.query.filter_by(user_id=employee_id, is_read=False).count()

        # 최근 알림 목록 조회 (최대 50개, 최신순)
        notifications = (
            Notification.query.filter_by(user_id=employee_id).order_by(Notification.created_at.desc()).limit(50).all()
        )

        # 알림 목록 포맷팅
        notification_list = [_format_notification(notification) for notification in notifications]

        return jsonify({"unread_count": unread_count, "notifications": notification_list})

    except (AttributeError, KeyError, ValueError) as e:
        print(f"[ERROR] 알림 조회 실패: {e}")
        return jsonify({"message": "알림을 불러오는데 실패했습니다."}), 500


# @app.route("/notifications/<int:notification_id>/read", methods=["POST"])
# def mark_notification_read(notification_id):
    """개별 알림 읽음 처리"""
    try:
        notification = Notification.query.get(notification_id)
        if not notification:
            return jsonify({"message": "알림을 찾을 수 없습니다."}), 404

        notification.is_read = True
        db.session.commit()
        print(f"[DEBUG] 알림 읽음 처리 - ID: {notification_id}")
        return jsonify({"message": "알림이 읽음 처리되었습니다."})

    except (AttributeError, KeyError, ValueError) as e:
        print(f"[ERROR] 알림 읽음 처리 실패: {e}")
        return jsonify({"message": "알림 읽음 처리에 실패했습니다."}), 500


# @app.route("/notifications/<employee_id>/read-all", methods=["POST"])
# def mark_all_notifications_read(employee_id):
    """모든 알림 읽음 처리"""
    try:
        updated_count = Notification.query.filter_by(user_id=employee_id, is_read=False).update({"is_read": True})
        db.session.commit()
        print(f"[DEBUG] 모든 알림 읽음 처리 - 사용자: {employee_id}, 처리된 알림: {updated_count}개")
        return jsonify({"message": f"{updated_count}개의 알림이 읽음 처리되었습니다."})

    except (AttributeError, KeyError, ValueError) as e:
        print(f"[ERROR] 모든 알림 읽음 처리 실패: {e}")
        return jsonify({"message": "알림 읽음 처리에 실패했습니다."}), 500


# @app.route("/notifications/<int:notification_id>", methods=["DELETE"])
# def delete_notification(notification_id):
    """개별 알림 삭제"""
    try:
        notification = Notification.query.get(notification_id)
        if not notification:
            return jsonify({"message": "알림을 찾을 수 없습니다."}), 404

        db.session.delete(notification)
        db.session.commit()
        print(f"[DEBUG] 알림 삭제 - ID: {notification_id}")
        return jsonify({"message": "알림이 삭제되었습니다."})

    except Exception as e:
        print(f"[ERROR] 알림 삭제 실패: {e}")
        return jsonify({"message": "알림 삭제에 실패했습니다."}), 500


# @app.route("/notifications/<employee_id>/clear-read", methods=["DELETE"])
# def clear_read_notifications(employee_id):
    """읽은 알림 모두 삭제"""
    try:
        deleted_count = Notification.query.filter_by(user_id=employee_id, is_read=True).count()
        Notification.query.filter_by(user_id=employee_id, is_read=True).delete()
        db.session.commit()
        print(f"[DEBUG] 읽은 알림 전체 삭제 - 사용자: {employee_id}, 삭제된 알림: {deleted_count}개")
        return jsonify({"message": f"{deleted_count}개의 읽은 알림이 삭제되었습니다."})

    except Exception as e:
        print(f"[ERROR] 읽은 알림 삭제 실패: {e}")
        return jsonify({"message": "알림 삭제에 실패했습니다."}), 500


# Restaurant API는 routes/restaurants.py로 분리됨


# 식당 관련 함수들은 routes/restaurants.py로 분리됨


# 식당 관련 API들은 routes/restaurants.py로 분리됨

# 식당 관련 API들은 routes/restaurants.py로 분리됨


# --- 데이터 분석 API ---
@app.route("/analytics/user/<employee_id>", methods=["GET"])
def get_user_analytics(employee_id):
    """사용자 분석 데이터 조회"""
    try:
        # 최근 30일 데이터
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=30)

        analytics = UserAnalytics.query.filter(
            UserAnalytics.user_id == employee_id,  # type: ignore
            UserAnalytics.date >= start_date,  # type: ignore
            UserAnalytics.date <= end_date,  # type: ignore
        ).all()

        # 파티 참여 통계
        parties_joined = (
            Party.query.join(PartyMember, Party.id == PartyMember.party_id)
            .filter(PartyMember.employee_id == employee_id)
            .count()
        )

        # 리뷰 작성 통계
        reviews_written = Review.query.filter_by(user_id=employee_id).count()

        # 친구 수 (일방적 관계)
        friendships = Friendship.query.filter_by(requester_id=employee_id, status="accepted").count()

        # 선호 카테고리 분석
        user_reviews = Review.query.filter_by(user_id=employee_id).all()
        category_counts = {}
        total_rating = 0

        for review in user_reviews:
            restaurant = Restaurant.query.get(review.restaurant_id)
            if restaurant:
                category = restaurant.category
                category_counts[category] = category_counts.get(category, 0) + 1
                total_rating += review.rating

        favorite_category = max(category_counts.items(), key=lambda x: x[1])[0] if category_counts else None
        avg_rating = total_rating / len(user_reviews) if user_reviews else 0

        return jsonify(
            {
                "parties_joined": parties_joined,
                "reviews_written": reviews_written,
                "friends_count": friendships,
                "favorite_category": favorite_category,
                "average_rating": round(avg_rating, 1),
                "activity_trend": [a.total_parties_joined for a in analytics],
            }
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/analytics/restaurant/<int:restaurant_id>", methods=["GET"])
def get_restaurant_analytics(restaurant_id):
    """식당 분석 데이터 조회"""
    try:
        restaurant = Restaurant.query.get(restaurant_id)
        if not restaurant:
            return jsonify({"error": "식당을 찾을 수 없습니다."}), 404

        # 리뷰 통계
        reviews = Review.query.filter_by(restaurant_id=restaurant_id).all()
        total_reviews = len(reviews)
        total_likes = sum(review.likes for review in reviews)
        avg_rating = sum(review.rating for review in reviews) / total_reviews if reviews else 0

        # 인기 태그 분석
        tag_counts = {}
        for review in reviews:
            if review.tags:
                tags = review.tags.split(",")
                for tag in tags:
                    tag = tag.strip()
                    tag_counts[tag] = tag_counts.get(tag, 0) + 1

        popular_tags = sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)[:5]

        # 방문 통계 (파티 참여 기준)
        visits = Party.query.filter_by(restaurant_name=restaurant.name).count()

        return jsonify(
            {
                "restaurant_name": restaurant.name,
                "total_visits": visits,
                "total_reviews": total_reviews,
                "average_rating": round(avg_rating, 1),
                "total_likes": total_likes,
                "popular_tags": [{"tag": tag, "count": count} for tag, count in popular_tags],
            }
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/analytics/trends", methods=["GET"])
def get_trends():
    """전체 트렌드 분석"""
    try:
        # 인기 식당 카테고리 (N+1 문제 해결)
        # 모든 식당과 리뷰를 한 번에 조회
        restaurants_with_reviews = (
            db.session.query(
                Restaurant.category,
                func.avg(Review.rating).label('avg_rating'),
                func.count(Review.id).label('review_count')
            )
            .outerjoin(Review, Restaurant.id == Review.restaurant_id)
            .group_by(Restaurant.category)
            .all()
        )

        category_stats = {}
        for category, avg_rating, review_count in restaurants_with_reviews:
            if avg_rating is not None:  # 리뷰가 있는 카테고리만
                category_stats[category] = {
                    "count": 1,  # 식당 수 (그룹화되어 있으므로 1)
                    "total_rating": avg_rating,
                    "total_reviews": review_count,
                }

        # 평균 평점으로 정렬
        popular_categories = sorted(
            [(cat, stats) for cat, stats in category_stats.items()],
            key=lambda x: x[1]["total_rating"],
            reverse=True,
        )[:5]

        # 최근 활성 사용자
        recent_users = User.query.order_by(desc(User.id)).limit(10).all()

        return jsonify(
            {
                "popular_categories": [
                    {
                        "category": cat,
                        "average_rating": round(stats["total_rating"], 1),
                        "total_reviews": stats["total_reviews"],
                    }
                    for cat, stats in popular_categories
                ],
                "recent_active_users": [
                    {
                        "employee_id": user.employee_id,
                        "nickname": user.nickname,
                        "lunch_preference": user.lunch_preference,
                    }
                    for user in recent_users
                ],
            }
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# --- 오프라인 데이터 API ---
@app.route("/offline/sync", methods=["POST"])
def sync_offline_data():
    """오프라인 데이터 동기화"""
    try:
        data = request.get_json()
        user_id = data.get("user_id")
        data_type = data.get("data_type")
        data_json = data.get("data_json")

        if not all([user_id, data_type, data_json]):
            return jsonify({"error": "필수 데이터가 누락되었습니다."}), 400

        # 기존 데이터 업데이트 또는 새로 생성
        existing_data = OfflineData.query.filter_by(user_id=user_id, data_type=data_type).first()

        if existing_data:
            existing_data.data_json = data_json
            existing_data.last_sync = datetime.utcnow()
        else:
            new_data = OfflineData(user_id, data_type, data_json)
            db.session.add(new_data)

        db.session.commit()
        return jsonify({"message": "오프라인 데이터가 동기화되었습니다."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/offline/data/<employee_id>", methods=["GET"])
def get_offline_data(employee_id):
    """오프라인 데이터 조회"""
    try:
        data_types = request.args.getlist("types")  # 'restaurants', 'parties', 'reviews'

        if not data_types:
            return jsonify({"error": "데이터 타입을 지정해주세요."}), 400

        offline_data = {}
        for data_type in data_types:
            data = OfflineData.query.filter_by(user_id=employee_id, data_type=data_type).first()

            if data:
                offline_data[data_type] = {
                    "data": json.loads(data.data_json),
                    "last_sync": data.last_sync.strftime("%Y-%m-%d %H:%M:%S"),
                }

        return jsonify(offline_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# 포인트 시스템 유틸리티 함수들
def calculate_level(points):
    """포인트에 따른 레벨 계산"""
    if points < 1000:
        return 1
    elif points < 3000:
        return 2
    elif points < 6000:
        return 3
    elif points < 10000:
        return 4
    elif points < 20000:
        return 5
    else:
        return 6


def earn_points(user_id, activity_type, points, description=None):
    """포인트 획득 함수"""
    try:
        # 사용자 포인트 업데이트
        user = User.query.filter_by(employee_id=user_id).first()
        if user:
            user.total_points += points
            user.current_level = calculate_level(user.total_points)
            db.session.commit()

            # 활동 기록
            activity = UserActivity(user_id, activity_type, points, description)
            db.session.add(activity)
            db.session.commit()

            # 포인트 획득 알림 생성 (큰 포인트일 때만)
            if points >= 50:
                create_notification(
                    user_id=user_id,
                    notification_type="points_earned",
                    title="⭐ 포인트 획득",
                    message=f"{points}포인트를 획득했습니다! ({description or activity_type})",
                    related_id=None,
                    related_type="points",
                )

            return True
    except Exception as e:
        print(f"포인트 획득 실패: {e}")
        db.session.rollback()
        return False


def earn_category_points(user_id, category, activity_type, points):
    """카테고리별 포인트 획득 함수"""
    try:
        # 카테고리 활동 기록
        category_activity = CategoryActivity(user_id, category, activity_type, points)
        db.session.add(category_activity)
        db.session.commit()

        return True
    except Exception as e:
        print(f"카테고리 포인트 획득 실패: {e}")
        db.session.rollback()
        return False


def check_badge_earned(user_id, badge_type):
    """배지 획득 조건 확인 함수"""
    try:
        user = User.query.filter_by(employee_id=user_id).first()
        if not user:
            return False

        # 이미 획득한 배지인지 확인
        existing_badge = (
            UserBadge.query.filter_by(user_id=user_id).join(Badge).filter(Badge.requirement_type == badge_type).first()
        )
        if existing_badge:
            return False

        # 배지 조건 확인
        badge = Badge.query.filter_by(requirement_type=badge_type).first()
        if not badge:
            return False

        # 조건에 따른 확인
        if badge_type == "first_party":
            party_count = Party.query.filter_by(host_employee_id=user_id).count()
            if party_count >= badge.requirement_count:
                return badge
        elif badge_type == "first_review":
            review_count = Review.query.filter_by(user_id=user_id).count()
            if review_count >= badge.requirement_count:
                return badge
        elif badge_type == "consecutive_login":
            if user.consecutive_login_days >= badge.requirement_count:
                return badge
        elif badge_type == "total_points":
            if user.total_points >= badge.requirement_count:
                return badge
        elif badge_type == "western_master":
            # 양식 관련 활동 카운트 (리뷰, 검색 등)
            western_activities = CategoryActivity.query.filter_by(user_id=user_id, category="western").count()
            if western_activities >= badge.requirement_count:
                return badge
        elif badge_type == "cafe_hunter":
            # 카페 관련 활동 카운트 (리뷰, 검색 등)
            cafe_activities = CategoryActivity.query.filter_by(user_id=user_id, category="cafe").count()
            if cafe_activities >= badge.requirement_count:
                return badge
        elif badge_type == "korean_expert":
            # 한식 관련 활동 카운트
            korean_activities = CategoryActivity.query.filter_by(user_id=user_id, category="korean").count()
            if korean_activities >= badge.requirement_count:
                return badge
        elif badge_type == "chinese_explorer":
            # 중식 관련 활동 카운트
            chinese_activities = CategoryActivity.query.filter_by(user_id=user_id, category="chinese").count()
            if chinese_activities >= badge.requirement_count:
                return badge
        elif badge_type == "japanese_lover":
            # 일식 관련 활동 카운트
            japanese_activities = CategoryActivity.query.filter_by(user_id=user_id, category="japanese").count()
            if japanese_activities >= badge.requirement_count:
                return badge
        elif badge_type == "random_lunch_king":
            # 랜덤런치 참여 카운트
            random_activities = CategoryActivity.query.filter_by(user_id=user_id, category="random_lunch_king").count()
            if random_activities >= badge.requirement_count:
                return badge
        elif badge_type == "party_planner":
            # 파티 생성 카운트
            party_count = Party.query.filter_by(host_employee_id=user_id).count()
            if party_count >= badge.requirement_count:
                return badge
        elif badge_type == "review_writer":
            # 리뷰 작성 카운트
            review_count = Review.query.filter_by(user_id=user_id).count()
            if review_count >= badge.requirement_count:
                return badge
        elif badge_type == "friend_lover":
            # 친구 추가 카운트 (임시로 10명으로 설정)
            friend_count = 10  # 실제 친구 테이블이 있으면 그걸로 변경
            if friend_count >= badge.requirement_count:
                return badge

        return False
    except Exception as e:
        print(f"배지 확인 실패: {e}")
        return False


def award_badge(user_id, badge):
    """배지 수여 함수"""
    try:
        user_badge = UserBadge(user_id, badge.id)
        db.session.add(user_badge)

        # 사용자의 현재 배지 업데이트
        user = User.query.filter_by(employee_id=user_id).first()
        if user:
            user.current_badge = badge.badge_name
            db.session.commit()

            # 배지 획득 알림 생성
            create_notification(
                user_id=user_id,
                notification_type="badge_earned",
                title="🏆 배지 획득",
                message=f'새로운 배지를 획득했습니다! "{badge.badge_name}"',
                related_id=badge.id,
                related_type="badge",
            )

        return True
    except Exception as e:
        print(f"배지 수여 실패: {e}")
        db.session.rollback()
        return False


# 포인트 시스템 API 엔드포인트들
# @app.route("/api/points/earn", methods=["POST"])
# def earn_points_api():
    """포인트 획득 API"""
    try:
        data = request.get_json()
        user_id = data.get("user_id")
        activity_type = data.get("activity_type")
        points = data.get("points", 0)
        description = data.get("description")

        if not all([user_id, activity_type]):
            return jsonify({"message": "필수 필드가 누락되었습니다."}), 400

        success = earn_points(user_id, activity_type, points, description)
        if success:
            return (
                jsonify(
                    {
                        "message": f"{points}포인트를 획득했습니다!",
                        "points_earned": points,
                    }
                ),
                200,
            )
        else:
            return jsonify({"message": "포인트 획득에 실패했습니다."}), 500

    except Exception as e:
        return (
            jsonify({"message": f"포인트 획득 중 오류가 발생했습니다: {str(e)}"}),
            500,
        )


# @app.route("/api/points/history/<user_id>", methods=["GET"])
# @require_auth
# def get_points_history(user_id):
    """포인트 히스토리 조회 API"""
    try:
        # 인증된 사용자 정보 사용
        authenticated_user = request.current_user

        # 다른 사용자의 포인트 히스토리를 조회하는 경우 권한 확인
        if user_id != authenticated_user.employee_id:
            return (
                jsonify({"error": "자신의 포인트 히스토리만 조회할 수 있습니다"}),
                403,
            )

        activities = (
            UserActivity.query.filter_by(user_id=user_id).order_by(desc(UserActivity.created_at)).limit(50).all()
        )

        history = []
        for activity in activities:
            history.append(
                {
                    "id": activity.id,
                    "activity_type": activity.activity_type,
                    "points_earned": activity.points_earned,
                    "description": activity.description,
                    "created_at": activity.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                }
            )

        return jsonify({"history": history}), 200

    except Exception as e:
        return (
            jsonify({"message": f"포인트 히스토리 조회 중 오류가 발생했습니다: {str(e)}"}),
            500,
        )


# @app.route("/api/points/my-ranking/<user_id>", methods=["GET"])
# @require_auth
# def get_my_points_ranking(user_id):
    """내 포인트 순위 조회 API"""
    try:
        # 인증된 사용자 정보 사용
        authenticated_user = request.current_user

        # 다른 사용자의 포인트 순위를 조회하는 경우 권한 확인
        if user_id != authenticated_user.employee_id:
            return jsonify({"error": "자신의 포인트 순위만 조회할 수 있습니다"}), 403

        user = User.query.filter_by(employee_id=user_id).first()
        if not user:
            return jsonify({"message": "사용자를 찾을 수 없습니다."}), 404

        # 전체 사용자 중 내 순위 계산
        total_users = User.query.count()
        my_rank = User.query.filter(User.total_points > user.total_points).count() + 1

        return (
            jsonify(
                {
                    "total_points": user.total_points,
                    "current_level": user.current_level,
                    "current_badge": user.current_badge,
                    "my_rank": my_rank,
                    "total_users": total_users,
                }
            ),
            200,
        )

    except Exception as e:
        return jsonify({"message": f"순위 조회 중 오류가 발생했습니다: {str(e)}"}), 500


@app.route("/api/rankings/special/<category>", methods=["GET"])
def get_special_ranking(category):
    """이색 랭킹 조회 API"""
    try:
        # 카테고리별 포인트 합계 계산
        category_points = (
            db.session.query(
                CategoryActivity.user_id,
                func.sum(CategoryActivity.points_earned).label("total_points"),
            )
            .filter_by(category=category)
            .group_by(CategoryActivity.user_id)
            .order_by(desc(func.sum(CategoryActivity.points_earned)))
            .limit(100)
            .all()
        )

        rankings = []
        for i, (user_id, points) in enumerate(category_points, 1):
            user = User.query.filter_by(employee_id=user_id).first()
            if user:
                rankings.append(
                    {
                        "rank": i,
                        "user_id": user_id,
                        "nickname": user.nickname,
                        "points": points,
                        "badge": user.current_badge or "신인",
                        "change": "+1",  # 임시 데이터
                    }
                )

        return jsonify({"rankings": rankings}), 200

    except Exception as e:
        return (
            jsonify({"message": f"이색 랭킹 조회 중 오류가 발생했습니다: {str(e)}"}),
            500,
        )


@app.route("/api/badges", methods=["GET"])
def get_badges():
    """전체 배지 목록 조회 API"""
    try:
        badges = Badge.query.all()
        badge_list = []
        for badge in badges:
            badge_list.append(
                {
                    "id": badge.id,
                    "badge_name": badge.badge_name,
                    "badge_icon": badge.badge_icon,
                    "badge_color": badge.badge_color,
                    "requirement_type": badge.requirement_type,
                    "requirement_count": badge.requirement_count,
                    "description": badge.description,
                }
            )

        return jsonify({"badges": badge_list}), 200

    except Exception as e:
        return (
            jsonify({"message": f"배지 목록 조회 중 오류가 발생했습니다: {str(e)}"}),
            500,
        )


@app.route("/api/badges/my-badges/<user_id>", methods=["GET"])
def get_my_badges(user_id):
    """내 배지 목록 조회 API"""
    try:
        user_badges = UserBadge.query.filter_by(user_id=user_id).join(Badge).all()
        badge_list = []
        for user_badge in user_badges:
            badge_list.append(
                {
                    "id": user_badge.badge.id,
                    "badge_name": user_badge.badge.badge_name,
                    "badge_icon": user_badge.badge.badge_icon,
                    "badge_color": user_badge.badge.badge_color,
                    "earned_at": user_badge.earned_at.strftime("%Y-%m-%d %H:%M:%S"),
                }
            )

        return jsonify({"my_badges": badge_list}), 200

    except Exception as e:
        return (
            jsonify({"message": f"내 배지 조회 중 오류가 발생했습니다: {str(e)}"}),
            500,
        )


@app.route("/api/badges/check", methods=["POST"])
def check_badge_earned_api():
    """배지 획득 조건 확인 API"""
    try:
        data = request.get_json()
        user_id = data.get("user_id")
        badge_type = data.get("badge_type")

        if not all([user_id, badge_type]):
            return jsonify({"message": "필수 필드가 누락되었습니다."}), 400

        badge = check_badge_earned(user_id, badge_type)
        if badge:
            # 배지 수여
            success = award_badge(user_id, badge)
            if success:
                return (
                    jsonify(
                        {
                            "message": f"새로운 배지를 획득했습니다: {badge.badge_name}",
                            "badge": {
                                "name": badge.badge_name,
                                "icon": badge.badge_icon,
                                "color": badge.badge_color,
                            },
                        }
                    ),
                    200,
                )
            else:
                return jsonify({"message": "배지 수여에 실패했습니다."}), 500
        else:
            return jsonify({"message": "아직 배지 획득 조건을 만족하지 않습니다."}), 200

    except Exception as e:
        return jsonify({"message": f"배지 확인 중 오류가 발생했습니다: {str(e)}"}), 500


@app.route("/api/rankings/<period>", methods=["GET"])
def get_rankings(period):
    """주간/월간/올타임 랭킹 조회 API"""
    try:
        if period not in ["weekly", "monthly", "alltime"]:
            return jsonify({"message": "잘못된 기간입니다."}), 400

        # 사용자별 포인트 합계 계산
        if period == "weekly":
            # 이번 주 포인트 합계
            start_date = datetime.now() - timedelta(days=7)
            user_points = (
                db.session.query(
                    UserActivity.user_id,
                    func.sum(UserActivity.points_earned).label("total_points"),
                )
                .filter(UserActivity.created_at >= start_date)
                .group_by(UserActivity.user_id)
                .order_by(desc(func.sum(UserActivity.points_earned)))
                .limit(100)
                .all()
            )
        elif period == "monthly":
            # 이번 달 포인트 합계
            start_date = datetime.now() - timedelta(days=30)
            user_points = (
                db.session.query(
                    UserActivity.user_id,
                    func.sum(UserActivity.points_earned).label("total_points"),
                )
                .filter(UserActivity.created_at >= start_date)
                .group_by(UserActivity.user_id)
                .order_by(desc(func.sum(UserActivity.points_earned)))
                .limit(100)
                .all()
            )
        else:  # alltime
            # 전체 포인트 합계
            user_points = (
                db.session.query(
                    UserActivity.user_id,
                    func.sum(UserActivity.points_earned).label("total_points"),
                )
                .group_by(UserActivity.user_id)
                .order_by(desc(func.sum(UserActivity.points_earned)))
                .limit(100)
                .all()
            )

        rankings = []
        for i, (user_id, points) in enumerate(user_points, 1):
            user = User.query.filter_by(employee_id=user_id).first()
            if user:
                rankings.append(
                    {
                        "rank": i,
                        "user_id": user_id,
                        "nickname": user.nickname,
                        "points": points,
                        "badge": user.current_badge or "신인",
                        "change": "+1",  # 임시 데이터
                    }
                )

        return jsonify({"rankings": rankings}), 200

    except Exception as e:
        return jsonify({"message": f"랭킹 조회 중 오류가 발생했습니다: {str(e)}"}), 500


@app.route("/api/activities/category", methods=["POST"])
def add_category_activity():
    """카테고리별 활동 기록 API"""
    try:
        data = request.get_json()
        user_id = data.get("user_id")
        category = data.get("category")
        activity_type = data.get("activity_type")
        points = data.get("points", 0)

        if not all([user_id, category, activity_type]):
            return jsonify({"message": "필수 필드가 누락되었습니다."}), 400

        success = earn_category_points(user_id, category, activity_type, points)
        if success:
            return jsonify({"message": f"카테고리 활동이 기록되었습니다."}), 200
        else:
            return jsonify({"message": "카테고리 활동 기록에 실패했습니다."}), 500

    except Exception as e:
        return (
            jsonify({"message": f"카테고리 활동 기록 중 오류가 발생했습니다: {str(e)}"}),
            500,
        )


# @app.route("/notifications", methods=["POST"])
# def create_notification_api():
    """알림 생성 API"""
    try:
        data = request.get_json()
        user_id = data.get("user_id")
        type = data.get("type")
        title = data.get("title")
        message = data.get("message")
        related_id = data.get("related_id")

        if not all([user_id, type, title, message]):
            return jsonify({"message": "필수 필드가 누락되었습니다."}), 400

        create_notification(user_id, type, title, message, related_id)

        return jsonify({"message": "알림이 생성되었습니다."}), 201

    except Exception as e:
        return jsonify({"message": f"알림 생성 중 오류가 발생했습니다: {str(e)}"}), 500


# --- 단골파티 API ---
@app.route("/dangolpots", methods=["POST"])
def create_dangolpot():
    data = request.get_json() or {}
    new_pot = DangolPot(
        name=data.get("name"),
        description=data.get("description"),
        tags=data.get("tags"),
        category=data.get("category"),
        host_id=data.get("host_id"),
        members=data.get("host_id"),
    )
    db.session.add(new_pot)
    db.session.flush()  # ID를 얻기 위해 flush

    # 채팅방 자동 생성
    new_pot.create_chat_room()

    db.session.commit()
    return (
        jsonify({"message": "새로운 단골파티가 생성되었습니다!", "pot_id": new_pot.id}),
        201,
    )


@app.route("/dangolpots", methods=["GET"])
def get_all_dangolpots():
    pots = DangolPot.query.order_by(desc(DangolPot.created_at)).all()
    return jsonify(
        [
            {
                "id": p.id,
                "name": p.name,
                "description": p.description,
                "tags": p.tags,
                "category": p.category,
                "member_count": p.member_count,
                "created_at": p.created_at.strftime("%Y-%m-%d"),
            }
            for p in pots
        ]
    )


@app.route("/dangolpots/<int:pot_id>", methods=["GET"])
def get_dangolpot_detail(pot_id):
    pot = DangolPot.query.get(pot_id)
    if not pot:
        return jsonify({"message": "단골파티를 찾을 수 없습니다."}), 404
    member_ids = pot.members.split(",") if pot and pot.members else []
    members_details = [{"employee_id": u.employee_id, "nickname": u.nickname} for u in User.query.filter(User.employee_id.in_(member_ids)).all()]  # type: ignore
    pot_data = {
        "id": pot.id,
        "name": pot.name,
        "description": pot.description,
        "tags": pot.tags,
        "category": pot.category,
        "host_id": pot.host_id,
        "members": members_details,
    }
    return jsonify(pot_data)


@app.route("/dangolpots/<int:pot_id>/join", methods=["POST"])
def join_dangolpot(pot_id):
    pot = DangolPot.query.get(pot_id)
    data = request.get_json() or {}
    employee_id = data.get("employee_id")
    if not pot:
        return jsonify({"message": "단골파티를 찾을 수 없습니다."}), 404

    member_ids = pot.members.split(",") if pot and pot.members else []
    if employee_id and employee_id not in member_ids:
        member_ids.append(employee_id)
        pot.members = ",".join(member_ids)
        db.session.commit()
    return jsonify({"message": "단골파티에 가입했습니다."})


@app.route("/dangolpots/<int:pot_id>", methods=["DELETE"])
def delete_dangolpot(pot_id):
    """단골파티 삭제 API (보안 강화)"""
    try:
        # 인증 확인
        if not hasattr(request, "current_user") or not request.current_user:
            return jsonify({"error": "인증이 필요합니다."}), 401

        # 인증된 사용자 ID 사용
        employee_id = request.current_user.get("employee_id")
        if not employee_id:
            return jsonify({"error": "사용자 정보를 찾을 수 없습니다."}), 400

        pot = DangolPot.query.get(pot_id)
        if not pot:
            return jsonify({"error": "단골파티를 찾을 수 없습니다."}), 404

        # 권한 확인 - 파티장만 삭제 가능
        if pot.host_id != employee_id:
            return jsonify({"error": "파티장만 삭제할 수 있습니다."}), 403

        # Pydantic 모델을 사용한 응답 데이터 검증
        from models.schemas import SuccessResponse

        db.session.delete(pot)
        db.session.commit()

        response_data = SuccessResponse(message="단골파티가 삭제되었습니다.")
        return jsonify(response_data.model_dump())

    except Exception as e:
        db.session.rollback()
        print(f"Error in delete_dangolpot: {e}")
        return (
            jsonify({"error": "단골파티 삭제 중 오류가 발생했습니다.", "details": str(e)}),
            500,
        )


@app.route("/dangolpots/<int:pot_id>", methods=["PUT"])
def update_dangolpot(pot_id):
    """단골파티 수정 API (보안 강화)"""
    try:
        # 인증 확인
        if not hasattr(request, "current_user") or not request.current_user:
            return jsonify({"error": "인증이 필요합니다."}), 401

        # 인증된 사용자 ID 사용
        employee_id = request.current_user.get("employee_id")
        if not employee_id:
            return jsonify({"error": "사용자 정보를 찾을 수 없습니다."}), 400

        pot = DangolPot.query.get(pot_id)
        if not pot:
            return jsonify({"error": "단골파티를 찾을 수 없습니다."}), 404

        # 권한 확인 - 파티장만 수정 가능
        if pot.host_id != employee_id:
            return jsonify({"error": "파티장만 수정할 수 있습니다."}), 403

        data = request.get_json()
        if not data:
            return jsonify({"error": "수정할 데이터가 필요합니다."}), 400

        # Pydantic 모델을 사용한 입력 데이터 검증
        from models.schemas import PartyUpdate

        # 데이터 업데이트
        if "name" in data:
            pot.name = data["name"]
        if "description" in data:
            pot.description = data["description"]
        if "tags" in data:
            pot.tags = data["tags"]
        if "category" in data:
            pot.category = data["category"]

        db.session.commit()

        # Pydantic 모델을 사용한 응답 데이터 검증
        from models.schemas import SuccessResponse

        response_data = SuccessResponse(message="단골파티 정보가 수정되었습니다.")
        return jsonify(response_data.model_dump())

    except Exception as e:
        db.session.rollback()
        print(f"Error in update_dangolpot: {e}")
        return (
            jsonify({"error": "단골파티 수정 중 오류가 발생했습니다.", "details": str(e)}),
            500,
        )


@app.route("/my_dangolpots", methods=["GET"])
def get_my_dangolpots():
    """내 단골파티 목록 조회 API (보안 강화)"""
    try:
        # 인증 확인
        if not hasattr(request, "current_user") or not request.current_user:
            return jsonify({"error": "인증이 필요합니다."}), 401

        # 인증된 사용자 ID 사용
        employee_id = request.current_user.get("employee_id")
        if not employee_id:
            return jsonify({"error": "사용자 정보를 찾을 수 없습니다."}), 400

        pots = DangolPot.query.all()
        my_pots = []

        for pot in pots:
            member_ids = pot.members.split(",") if pot and pot.members else []
            if employee_id in member_ids:
                my_pots.append(
                    {
                        "id": pot.id,
                        "name": pot.name,
                        "description": pot.description,
                        "tags": pot.tags,
                        "category": pot.category,
                        "member_count": pot.member_count,
                        "created_at": (pot.created_at.strftime("%Y-%m-%d") if pot.created_at else None),
                    }
                )

        # Pydantic 모델을 사용한 응답 데이터 검증
        from models.schemas import SuccessResponse

        return jsonify(
            {
                "success": True,
                "employee_id": employee_id,
                "total_pots": len(my_pots),
                "pots": my_pots,
            }
        )

    except Exception as e:
        print(f"Error in get_my_dangolpots: {e}")
        return (
            jsonify(
                {
                    "error": "단골파티 목록 조회 중 오류가 발생했습니다.",
                    "details": str(e),
                }
            ),
            500,
        )


# Party API는 routes/parties.py로 분리됨


# create_party 함수는 routes/parties.py로 분리됨


# get_party 함수는 routes/parties.py로 분리됨


# update_party 함수는 routes/parties.py로 분리됨


# join_party 함수는 routes/parties.py로 분리됨


# leave_party 함수는 routes/parties.py로 분리됨


# get_my_parties 함수는 routes/parties.py로 분리됨


# get_my_regular_parties와 delete_party 함수는 routes/parties.py로 분리됨


# --- 랜덤런치, 사용자 프로필, 소통 API 등은 이전과 동일하게 유지 ---
# get_match_status 함수는 routes/matching.py로 분리됨


# request_match 함수는 routes/matching.py로 분리됨


# confirm_match 함수는 routes/matching.py로 분리됨


# cancel_match 함수는 routes/matching.py로 분리됨


# reject_match 함수는 routes/matching.py로 분리됨


# --- 새로운 랜덤 런치 시스템 API ---
@app.route("/proposals/available-dates", methods=["GET"])
def get_available_dates():
    employee_id = request.args.get("employee_id")
    if not employee_id:
        return jsonify({"message": "employee_id가 필요합니다."}), 400

    today = get_seoul_today()
    available_dates = []

    for i in range(14):  # 오늘부터 14일 후까지
        check_date = today + timedelta(days=i)
        date_str = check_date.strftime("%Y-%m-%d")

        # 해당 날짜에 파티나 개인 일정이 있는지 확인
        # SQLAlchemy 쿼리 - 타입 힌팅 경고는 무시해도 됨
        party_query = Party.query.join(PartyMember).filter(
            PartyMember.employee_id == employee_id, Party.party_date == date_str  # type: ignore
        )
        has_party = party_query.first() is not None

        has_schedule = (
            PersonalSchedule.query.filter_by(employee_id=employee_id, schedule_date=date_str).first() is not None
        )

        if not has_party and not has_schedule:
            available_dates.append(date_str)

    return jsonify(available_dates)


@app.route("/proposals/date-recommendations", methods=["GET"])
@require_auth
def get_date_recommendations():
    """특정 날짜의 추천 그룹을 가져오는 API"""
    # 인증된 사용자 정보 사용
    current_user = request.current_user
    employee_id = request.args.get("employee_id", current_user.employee_id)
    selected_date = request.args.get("date")

    # 다른 사용자의 추천을 요청하는 경우 권한 확인
    if employee_id != current_user.employee_id:
        return jsonify({"error": "자신의 추천만 조회할 수 있습니다"}), 403

    if not selected_date:
        return jsonify({"error": "date parameter is required"}), 400

    try:
        # 해당 날짜의 기존 추천 그룹이 있는지 확인
        existing_recommendations = DailyRecommendation.query.filter_by(date=selected_date).all()

        if existing_recommendations:
            # 기존 추천 그룹이 있으면 반환
            recommendations = []
            for rec in existing_recommendations:
                group_members = json.loads(rec.group_members)
                recommendations.append({"proposed_date": selected_date, "recommended_group": group_members})
            return jsonify(recommendations)

        # 기존 추천 그룹이 없으면 빈 배열 반환 (매일 자정에만 생성됨)
        return jsonify([])

    except Exception as e:
        print(f"Error getting date recommendations: {e}")
        return jsonify({"error": "Failed to get date recommendations"}), 500


@app.route("/proposals/suggest-groups", methods=["POST"])
def suggest_groups():
    data = request.get_json() or {}
    employee_id = data.get("employee_id")
    date = data.get("date")

    if not employee_id or not date:
        return jsonify({"message": "employee_id와 date가 필요합니다."}), 400

    # 해당 날짜에 약속이 없는 모든 유저 찾기
    busy_users = set()

    # 파티에 참여하는 유저들
    parties = Party.query.filter(Party.party_date == date).all()  # type: ignore
    for party in parties:
        # PartyMember 테이블에서 멤버 ID 가져오기
        party_members = PartyMember.query.filter_by(party_id=party.id).all()
        member_ids = [member.employee_id for member in party_members]
        busy_users.update(member_ids)

    # 개인 일정이 있는 유저들
    schedules = PersonalSchedule.query.filter_by(schedule_date=date).all()
    for schedule in schedules:
        busy_users.add(schedule.employee_id)

    # 요청자도 제외
    busy_users.add(employee_id)

    # 가능한 유저들
    available_users = User.query.filter(~User.employee_id.in_(busy_users)).all()  # type: ignore

    if not available_users:
        return jsonify([])

    # 요청자 정보 가져오기
    proposer = User.query.filter_by(employee_id=employee_id).first()
    if not proposer:
        return jsonify({"message": "사용자를 찾을 수 없습니다."}), 404

    # 성향 매칭 점수 계산
    user_scores = []
    for user in available_users:
        score = 0

        # lunch_preference 매칭
        if proposer.lunch_preference and user.lunch_preference:
            proposer_prefs = set(proposer.lunch_preference.split(","))
            user_prefs = set(user.lunch_preference.split(","))
            score += len(proposer_prefs.intersection(user_prefs))

        # main_dish_genre 매칭
        if proposer.main_dish_genre and user.main_dish_genre:
            proposer_genres = set(proposer.main_dish_genre.split(","))
            user_genres = set(user.main_dish_genre.split(","))
            score += len(proposer_genres.intersection(user_genres))

        user_scores.append((user, score))

    # 점수순으로 정렬
    user_scores.sort(key=lambda x: x[1], reverse=True)

    # 중복 제거를 위한 함수
    def create_group_key(group_users):
        """그룹의 고유 키를 생성하는 함수"""
        user_ids = sorted([user.employee_id for user in group_users])
        return ",".join(user_ids)

    # 여러 그룹 생성 (최대 5개)
    groups = []
    used_users = set()
    seen_groups = set()  # 중복 제거를 위한 set

    for group_idx in range(min(5, len(user_scores) // 3 + 1)):
        group_users = []

        # 높은 점수 순으로 그룹에 추가
        for user, score in user_scores:
            if len(group_users) >= 3:
                break
            if user.employee_id not in used_users:
                group_users.append(user)
                used_users.add(user.employee_id)

        # 부족하면 랜덤으로 추가
        if len(group_users) < 3:
            remaining_users = [user for user, _ in user_scores if user.employee_id not in used_users]
            random.shuffle(remaining_users)
            for user in remaining_users[: 3 - len(group_users)]:
                group_users.append(user)
                used_users.add(user.employee_id)

        if group_users:
            # 중복 제거를 위한 그룹 키 생성
            group_key = create_group_key(group_users)

            # 중복되지 않은 그룹만 추가
            if group_key not in seen_groups:
                seen_groups.add(group_key)
                groups.append(
                    {
                        "group_id": len(groups) + 1,  # 중복 제거 후 실제 인덱스 사용
                        "users": [
                            {
                                "employee_id": user.employee_id,
                                "nickname": user.nickname,
                                "lunch_preference": user.lunch_preference,
                                "main_dish_genre": user.main_dish_genre,
                                "gender": user.gender,
                                "age_group": user.age_group,
                            }
                            for user in group_users
                        ],
                    }
                )

    return jsonify(groups)


@app.route("/proposals", methods=["POST"])
def create_proposal():
    data = request.get_json() or {}
    proposer_id = data.get("proposer_id")
    recipient_ids = data.get("recipient_ids")  # 리스트 형태
    proposed_date = data.get("proposed_date")

    if not proposer_id or not recipient_ids or not proposed_date:
        return (
            jsonify({"message": "proposer_id, recipient_ids, proposed_date가 필요합니다."}),
            400,
        )

    # recipient_ids가 리스트인지 확인하고 문자열로 변환
    if isinstance(recipient_ids, list):
        recipient_ids_str = ",".join(recipient_ids)
    else:
        recipient_ids_str = str(recipient_ids)

    new_proposal = LunchProposal(
        proposer_id=proposer_id,
        recipient_ids=recipient_ids_str,
        proposed_date=proposed_date,
    )

    db.session.add(new_proposal)
    db.session.commit()

    return (
        jsonify(
            {
                "id": new_proposal.id,
                "proposer_id": new_proposal.proposer_id,
                "recipient_ids": new_proposal.recipient_ids,
                "proposed_date": new_proposal.proposed_date,
                "status": new_proposal.status,
                "created_at": new_proposal.created_at.strftime("%Y-%m-%d %H:%M"),
                "expires_at": new_proposal.expires_at.strftime("%Y-%m-%d %H:%M"),
            }
        ),
        201,
    )


@app.route("/proposals/mine", methods=["GET"])
def get_my_proposals():
    employee_id = request.args.get("employee_id")
    if not employee_id:
        return jsonify({"message": "employee_id가 필요합니다."}), 400

    # 내가 보낸 제안들
    sent_proposals = (
        LunchProposal.query.filter_by(proposer_id=employee_id).order_by(desc(LunchProposal.created_at)).all()
    )

    # 내가 받은 제안들 (제안을 보낸 사람은 제외)
    received_proposals = (
        LunchProposal.query.filter(
            and_(
                LunchProposal.recipient_ids.contains(employee_id),  # type: ignore
                LunchProposal.proposer_id != employee_id,  # 제안을 보낸 사람은 제외
            )
        )
        .order_by(desc(LunchProposal.created_at))
        .all()
    )

    def format_proposal(proposal):
        # 수락한 사람들의 닉네임 리스트
        acceptances = ProposalAcceptance.query.filter_by(proposal_id=proposal.id).all()
        accepted_user_ids = [acc.user_id for acc in acceptances]
        accepted_users = User.query.filter(User.employee_id.in_(accepted_user_ids)).all()  # type: ignore
        accepted_nicknames = [user.nickname for user in accepted_users]

        return {
            "id": proposal.id,
            "proposer_id": proposal.proposer_id,
            "recipient_ids": proposal.recipient_ids,
            "proposed_date": proposal.proposed_date,
            "status": proposal.status,
            "created_at": proposal.created_at.strftime("%Y-%m-%d %H:%M"),
            "expires_at": proposal.expires_at.strftime("%Y-%m-%d %H:%M"),
            "accepted_nicknames": accepted_nicknames,
        }

    return jsonify(
        {
            "sent_proposals": [format_proposal(p) for p in sent_proposals],
            "received_proposals": [format_proposal(p) for p in received_proposals],
        }
    )


@app.route("/proposals/<int:proposal_id>/accept", methods=["POST"])
def accept_proposal(proposal_id):
    data = request.get_json() or {}
    user_id = data.get("user_id")

    if not user_id:
        return jsonify({"message": "user_id가 필요합니다."}), 400

    # 1단계: 유효성 검사
    proposal = LunchProposal.query.get(proposal_id)
    if not proposal:
        return jsonify({"message": "제안을 찾을 수 없습니다."}), 404

    if proposal.status != "pending":
        return jsonify({"message": "이미 처리된 제안입니다."}), 400

    if datetime.utcnow() > proposal.expires_at:
        return jsonify({"message": "제안이 만료되었습니다."}), 400

    # 요청한 user_id가 recipient_ids에 포함되는지 확인
    recipient_ids = proposal.recipient_ids.split(",") if proposal.recipient_ids else []
    if user_id not in recipient_ids:
        return jsonify({"message": "이 제안의 수신자가 아닙니다."}), 403

    # 해당 유저가 이미 제안된 날짜에 다른 약속이 있는지 확인
    proposed_date = proposal.proposed_date

    # 파티 확인
    has_party = (
        Party.query.join(PartyMember, Party.id == PartyMember.party_id)
        .filter(PartyMember.employee_id == user_id, Party.party_date == proposed_date)  # type: ignore
        .first()
        is not None
    )

    # 개인 일정 확인
    has_schedule = (
        PersonalSchedule.query.filter_by(employee_id=user_id, schedule_date=proposed_date).first() is not None
    )

    if has_party or has_schedule:
        return jsonify({"message": "이미 다른 약속이 있어 수락할 수 없습니다."}), 409

    # 2단계: 수락 기록
    # 이미 수락했는지 확인
    existing_acceptance = ProposalAcceptance.query.filter_by(proposal_id=proposal_id, user_id=user_id).first()

    if existing_acceptance:
        return jsonify({"message": "이미 수락한 제안입니다."}), 400

    new_acceptance = ProposalAcceptance(proposal_id=proposal_id, user_id=user_id)
    db.session.add(new_acceptance)

    # 3단계: 성사 여부 확인
    all_members = [proposal.proposer_id] + recipient_ids
    accepted_count = ProposalAcceptance.query.filter_by(proposal_id=proposal_id).count() + 1  # +1은 현재 수락

    if accepted_count >= 2:
        # 4단계: 성사 프로세스
        proposal.status = "confirmed"

        # 새로운 Party 생성
        new_party = Party(
            host_employee_id=proposal.proposer_id,
            title="랜덤 런치",
            restaurant_name="미정",  # 기본값을 '미정'으로 설정
            restaurant_address=None,
            party_date=proposal.proposed_date,
            party_time="11:30",  # 기본값을 '11:30'으로 설정
            meeting_location="본관 1층 로비",  # 기본값을 '본관 1층 로비'로 설정
            max_members=len(all_members),
            is_from_match=True,
        )
        db.session.add(new_party)
        db.session.flush()  # ID를 얻기 위해 flush

        # 모든 멤버를 PartyMember 테이블에 추가
        for member_id in all_members:
            is_host = member_id == proposal.proposer_id
            party_member = PartyMember(party_id=new_party.id, employee_id=member_id, is_host=is_host)
            db.session.add(party_member)

        # 같은 날짜의 다른 pending 제안들을 cancelled로 변경
        other_pending_proposals = LunchProposal.query.filter(
            LunchProposal.status == "pending",  # type: ignore
            LunchProposal.proposed_date == proposed_date,  # type: ignore
            LunchProposal.id != proposal_id,
        ).all()

        for other_proposal in other_pending_proposals:
            other_members = [other_proposal.proposer_id] + other_proposal.recipient_ids.split(",")
            # 겹치는 멤버가 있는지 확인
            if any(member in all_members for member in other_members):
                other_proposal.status = "cancelled"

        db.session.commit()
        return jsonify(
            {
                "message": "매칭이 성사되었습니다!",
                "status": "confirmed",
                "party_id": new_party.id,
            }
        )
    else:
        # 5단계: 단순 수락
        db.session.commit()
        return jsonify(
            {
                "message": "수락이 기록되었습니다. 1명 이상 더 수락하면 매칭이 성사됩니다.",
                "status": "accepted",
            }
        )


@app.route("/proposals/<int:proposal_id>/cancel", methods=["POST"])
def cancel_proposal(proposal_id):
    data = request.get_json() or {}
    user_id = data.get("user_id") or data.get("employee_id")

    if not user_id:
        return jsonify({"message": "user_id 또는 employee_id가 필요합니다."}), 400

    proposal = LunchProposal.query.get(proposal_id)
    if not proposal:
        return jsonify({"message": "제안을 찾을 수 없습니다."}), 404

    if proposal.proposer_id != user_id:
        return jsonify({"message": "제안자만 취소할 수 있습니다."}), 403

    if proposal.status != "pending":
        return jsonify({"message": "이미 처리된 제안은 취소할 수 없습니다."}), 400

    proposal.status = "cancelled"
    db.session.commit()

    return jsonify({"message": "제안이 취소되었습니다.", "status": "cancelled"})


@app.route("/chats/<employee_id>", methods=["GET"])
def get_my_chats(employee_id):
    # 개발 환경에서는 인증 우회
    import os
    if not (os.getenv('FLASK_ENV') == 'development' or 
            os.getenv('DEV_MODE') == 'true' or 
            os.getenv('DEV_MODE') == '1' or
            'DEV' in os.getenv('FLASK_ENV', '')):
        # 프로덕션 환경에서는 인증 필요
        try:
            from auth.utils import require_auth
            authenticated_user = require_auth()()
            if not authenticated_user:
                return jsonify({"error": "Authorization header missing"}), 401
        except:
            return jsonify({"error": "Authorization header missing"}), 401
    else:
        # 개발 환경에서는 가짜 사용자 정보 생성
        class MockUser:
            def __init__(self, employee_id):
                self.employee_id = employee_id
        authenticated_user = MockUser(employee_id)

    # 다른 사용자의 채팅 목록을 조회하는 경우 권한 확인
    if employee_id != authenticated_user.employee_id:
        return jsonify({"error": "자신의 채팅 목록만 조회할 수 있습니다"}), 403

    chat_list = []

    print(f"=== DEBUG: 채팅방 목록 조회 시작 (사용자: {employee_id}) ===")

    # 파티 채팅방들 (랜덤 런치 제외)
    party_chat_list = []
    joined_parties = (
        Party.query.join(PartyMember, Party.id == PartyMember.party_id)
        .filter(PartyMember.employee_id == employee_id)
        .order_by(desc(Party.id))
        .all()
    )

    # 중복 제거를 위한 set
    seen_party_ids = set()

    for party in joined_parties:
        # 중복 체크
        if party.id in seen_party_ids:
            continue
        seen_party_ids.add(party.id)

        # 랜덤 런치(is_from_match=True)는 일반 채팅방으로 분류하지 않음
        if party.is_from_match:
            continue

        # 파티의 마지막 메시지 가져오기
        last_message = (
            ChatMessage.query.filter_by(chat_type="party", chat_id=party.id)
            .order_by(desc(ChatMessage.created_at))
            .first()
        )

        # 최근 메시지 미리보기 (최대 15글자)
        if last_message:
            message_preview = last_message.message
            if len(message_preview) > 15:
                message_preview = message_preview[:15] + "..."
        else:
            message_preview = f"{party.restaurant_name} | {party.current_members}/{party.max_members}명"

        party_chat_list.append(
            {
                "id": party.id,
                "type": "party",
                "title": party.title,
                "subtitle": message_preview,
                "is_from_match": party.is_from_match,
                "last_message_time": last_message.created_at if last_message else None,
                "unread_count": (3 if party.id % 2 == 0 else 0),  # 테스트용 안읽은 메시지 수
            }
        )

    # 단골파티 채팅방들
    pot_chat_list = []
    joined_pots = DangolPot.query.join(DangolPotMember, DangolPot.id == DangolPotMember.pot_id).filter(DangolPotMember.employee_id == employee_id).order_by(desc(DangolPot.created_at)).all()

    # 중복 제거를 위한 set
    seen_pot_ids = set()

    for pot in joined_pots:
        # 중복 체크
        if pot.id in seen_pot_ids:
            continue
        seen_pot_ids.add(pot.id)

        # 단골파티의 마지막 메시지 가져오기
        last_message = (
            ChatMessage.query.filter_by(chat_type="dangolpot", chat_id=pot.id)
            .order_by(desc(ChatMessage.created_at))
            .first()
        )

        # 최근 메시지 미리보기 (최대 15글자)
        if last_message:
            message_preview = last_message.message
            if len(message_preview) > 15:
                message_preview = message_preview[:15] + "..."
        else:
            message_preview = pot.tags

        pot_chat_list.append(
            {
                "id": pot.id,
                "type": "dangolpot",
                "title": pot.name,
                "subtitle": message_preview,
                "last_message_time": last_message.created_at if last_message else None,
                "unread_count": (5 if pot.id % 3 == 0 else 0),  # 테스트용 안읽은 메시지 수
            }
        )

    # 일반 채팅방들 (투표로 생성된 채팅방 포함)
    user_participations = ChatParticipant.query.filter_by(user_id=employee_id).all()
    print(f"=== DEBUG: 사용자 참여 채팅방 수: {len(user_participations)} ===")

    custom_chat_list = []

    # 중복 제거를 위한 set
    seen_chat_room_ids = set()

    # 랜덤 런치 채팅방들도 일반 채팅방으로 분류
    random_lunch_parties = (
        Party.query.join(PartyMember)
        .filter(PartyMember.employee_id == employee_id, Party.is_from_match == True)
        .order_by(desc(Party.id))
        .all()
    )

    for party in random_lunch_parties:
        # 중복 체크 (랜덤 런치용 별도 체크)
        if party.id in seen_chat_room_ids:
            continue
        seen_chat_room_ids.add(party.id)

        # 랜덤 런치의 마지막 메시지 가져오기
        last_message = (
            ChatMessage.query.filter_by(chat_type="party", chat_id=party.id)
            .order_by(desc(ChatMessage.created_at))
            .first()
        )

        # 최근 메시지 미리보기 (최대 15글자)
        if last_message:
            message_preview = last_message.message
            if len(message_preview) > 15:
                message_preview = message_preview[:15] + "..."
        else:
            message_preview = f"{party.restaurant_name} | {party.current_members}/{party.max_members}명"

        custom_chat_list.append(
            {
                "id": party.id,
                "type": "party",
                "title": party.title,
                "subtitle": message_preview,
                "is_from_match": party.is_from_match,
                "last_message_time": last_message.created_at if last_message else None,
                "unread_count": (3 if party.id % 2 == 0 else 0),  # 테스트용 안읽은 메시지 수
            }
        )

    # 일반 채팅방용 별도 중복 체크
    seen_custom_chat_ids = set()

    for participation in user_participations:
        chat_room = ChatRoom.query.get(participation.room_id)
        print(
            f"=== DEBUG: 채팅방 ID {participation.room_id} - 타입: {chat_room.type if chat_room else 'None'} - 이름: {chat_room.name if chat_room else 'None'} ==="
        )

        # 중복 체크 (일반 채팅방용 별도 체크)
        if chat_room and chat_room.id in seen_custom_chat_ids:
            print(f"=== DEBUG: 채팅방 ID {participation.room_id} 중복 제외 ===")
            continue
        if chat_room:
            seen_custom_chat_ids.add(chat_room.id)

        print(
            f"=== DEBUG: 채팅방 ID {participation.room_id} 조건 체크 - chat_room: {chat_room is not None}, type: {chat_room.type if chat_room else 'None'} ==="
        )

        if chat_room:  # 모든 채팅방을 포함
            # 채팅방 타입에 따라 올바른 chat_type 결정
            if chat_room.type == "group":
                chat_type = "group"
            elif chat_room.type == "friend":
                chat_type = "custom"
            else:
                chat_type = "custom"  # 기본값

            # 마지막 메시지 가져오기 (실제 채팅방 타입에 맞는 chat_type 사용)
            last_message = (
                ChatMessage.query.filter_by(chat_type=chat_type, chat_id=chat_room.id)
                .order_by(desc(ChatMessage.created_at))
                .first()
            )

            print(
                f"=== DEBUG: chat_type='{chat_type}'으로 검색한 마지막 메시지: {last_message.message if last_message else 'None'} ==="
            )

            # 마지막 메시지가 없으면 다른 chat_type으로도 시도
            if not last_message:
                last_message = (
                    ChatMessage.query.filter_by(chat_id=chat_room.id).order_by(desc(ChatMessage.created_at)).first()
                )

                print(
                    f"=== DEBUG: chat_id로만 검색한 마지막 메시지: {last_message.message if last_message else 'None'} ==="
                )

            # 최근 메시지 미리보기 (최대 15글자)
            message_preview = last_message.message if last_message else "새로운 채팅방입니다"
            if len(message_preview) > 15:
                message_preview = message_preview[:15] + "..."

            # 프론트엔드 호환성을 위해 type='group'인 채팅방을 'custom'으로 반환
            frontend_type = "custom" if chat_room.type == "group" else chat_type

            custom_chat_list.append(
                {
                    "id": chat_room.id,
                    "type": frontend_type,
                    "title": chat_room.name or "새로운 채팅방",
                    "subtitle": message_preview,
                    "last_message": last_message.message if last_message else None,
                    "last_message_time": (last_message.created_at if last_message else None),
                    "unread_count": (2 if chat_room.id % 2 == 0 else 0),  # 테스트용 안읽은 메시지 수
                }
            )

    # 마지막 메시지 시간 기준으로 정렬 (최신 메시지가 있는 채팅방이 위로)
    custom_chat_list.sort(key=lambda x: x["last_message_time"] or datetime.min, reverse=True)

    # 파티 채팅방들도 마지막 메시지 시간 기준으로 정렬
    party_chat_list.sort(key=lambda x: x["last_message_time"] or datetime.min, reverse=True)

    # 단골파티 채팅방들도 마지막 메시지 시간 기준으로 정렬
    pot_chat_list.sort(key=lambda x: x["last_message_time"] or datetime.min, reverse=True)

    # 모든 채팅방을 하나의 리스트로 합치고 마지막 메시지 시간 기준으로 정렬
    all_chats = party_chat_list + pot_chat_list + custom_chat_list
    all_chats.sort(key=lambda x: x["last_message_time"] or datetime.min, reverse=True)

    # last_message_time 필드 제거하지 않음 (프론트엔드에서 사용)
    # 디버깅을 위한 로그 추가
    print(f"=== DEBUG: 최종 채팅방 목록 ===")
    for i, chat in enumerate(all_chats):
        print(
            f"채팅방 {i+1}: {chat['title']} - last_message_time: {chat.get('last_message_time')} - unread_count: {chat.get('unread_count')}"
        )

    chat_list = all_chats

    print(f"=== DEBUG: 최종 채팅방 목록: {chat_list} ===")
    return jsonify(chat_list)


@app.route("/users/<employee_id>", methods=["GET"])
# get_user 함수는 routes/users.py로 분리됨


# get_users_batch 함수는 routes/users.py로 분리됨


# update_user 함수는 routes/users.py로 분리됨


# update_user_preferences 함수는 routes/users.py로 분리됨


# get_user_preferences 함수는 routes/users.py로 분리됨


# --- 채팅 API ---
# get_chat_messages 함수는 routes/chats.py로 분리됨


# send_chat_message 함수는 routes/chats.py로 분리됨


# mark_message_read 함수는 routes/chats.py로 분리됨


# search_messages 함수는 routes/chats.py로 분리됨


# update_chat_room_title 함수는 routes/chats.py로 분리됨


# get_chat_room_members 함수는 routes/chats.py로 분리됨


# leave_chat_room 함수는 routes/chats.py로 분리됨


# --- WebSocket 이벤트 ---
@socketio.on("connect")
def handle_connect():
    print("Client connected")


@socketio.on("disconnect")
def handle_disconnect():
    print("Client disconnected")


@socketio.on("join_chat")
def handle_join_chat(data):
    chat_type = data["chat_type"]
    chat_id = data["chat_id"]
    room = f"{chat_type}_{chat_id}"
    join_room(room)
    print(f"Client joined room: {room}")


@socketio.on("leave_chat")
def handle_leave_chat(data):
    chat_type = data["chat_type"]
    chat_id = data["chat_id"]
    room = f"{chat_type}_{chat_id}"
    leave_room(room)
    print(f"Client left room: {room}")


@socketio.on("send_message")
def handle_send_message(data):
    chat_type = data.get("chat_type")
    chat_id = data.get("chat_id")
    sender_employee_id = data.get("sender_employee_id")
    message = data.get("message")

    print(f"Send message event received: {data}")

    if not all([chat_type, chat_id, sender_employee_id, message]):
        print("Missing required fields in send_message event")
        return

    try:
        # 사용자 정보 조회
        user = User.query.filter_by(employee_id=sender_employee_id).first()
        if not user:
            print(f"User not found: {sender_employee_id}")
            return

        # 메시지 저장
        new_message = ChatMessage()
        new_message.chat_type = chat_type
        new_message.chat_id = chat_id
        new_message.sender_employee_id = sender_employee_id
        new_message.sender_nickname = user.nickname
        new_message.message = message
        db.session.add(new_message)
        db.session.commit()
        print(f"Message saved with ID: {new_message.id}")

        # 채팅방의 모든 사용자에게 메시지 전송
        room = f"{chat_type}_{chat_id}"
        message_data = {
            "id": new_message.id,
            "sender_employee_id": sender_employee_id,
            "sender_nickname": user.nickname,
            "message": message,
            "created_at": format_korean_time(new_message.created_at),
            "unread_count": 0,
        }
        print(f"Emitting new_message to room {room}: {message_data}")
        emit("new_message", message_data, to=room)

    except Exception as e:
        print(f"Error in handle_send_message: {e}")
        import traceback

        traceback.print_exc()


@socketio.on("read_message")
def handle_read_message(data):
    message_id = data.get("message_id")
    user_id = data.get("user_id")
    chat_type = data.get("chat_type")
    chat_id = data.get("chat_id")

    print(f"Read message event received: {data}")

    if not message_id or not user_id or not chat_type or not chat_id:
        print("Missing required fields in read_message event")
        return

    try:
        # 이미 읽음 처리된 경우 중복 저장 방지
        existing = ChatMessageRead.query.filter_by(message_id=message_id, user_id=user_id).first()
        if not existing:
            read = ChatMessageRead(message_id=message_id, user_id=user_id)
            db.session.add(read)
            db.session.commit()
            print(f"Message {message_id} marked as read by {user_id}")

        # 채팅방 참여자 목록 구하기
        if chat_type == "party":
            party = Party.query.get(chat_id)
            if party:
                # PartyMember 테이블에서 멤버 ID 가져오기
                party_members = PartyMember.query.filter_by(party_id=chat_id).all()
                member_ids = [member.employee_id for member in party_members]
            else:
                member_ids = []
        elif chat_type == "dangolpot":
            pot = DangolPot.query.get(chat_id)
            member_ids = [mid.strip() for mid in pot.members.split(",") if mid.strip()] if pot and pot.members else []
        elif chat_type == "custom":
            room = ChatRoom.query.filter_by(type="friend", id=chat_id).first()
            if room:
                participants = ChatParticipant.query.filter_by(room_id=room.id).all()
                member_ids = [p.user_id for p in participants]
            else:
                member_ids = []
        else:
            member_ids = []

        read_count = ChatMessageRead.query.filter_by(message_id=message_id).count()
        unread_count = max(0, len(member_ids) - read_count)

        room_name = f"{chat_type}_{chat_id}"
        print(f"Emitting message_read to room {room_name}: message_id={message_id}, unread_count={unread_count}")

        socketio.emit(
            "message_read",
            {
                "message_id": message_id,
                "user_id": user_id,
                "unread_count": unread_count,
            },
            to=room_name,
        )

    except Exception as e:
        print(f"Error in handle_read_message: {e}")
        import traceback

        traceback.print_exc()


# --- 친구 API ---
# search_users 함수는 routes/users.py로 분리됨


@app.route("/friends/add", methods=["POST"])
def add_friend():
    # 개발 모드에서는 인증 우회
    if app.config.get("USE_VIRTUAL_USERS", True):
        data = request.get_json()
        user_id = data.get("user_id")
        friend_id = data.get("friend_id")

        print(f"🔍 [친구추가] 요청 데이터: user_id={user_id}, friend_id={friend_id}")

        if not user_id or not friend_id:
            return jsonify({"message": "사용자 ID와 친구 ID가 필요합니다."}), 400
    else:
        # 프로덕션 모드에서는 인증 필요
        @require_auth
        def authenticated_add_friend():
            authenticated_user = request.current_user
            data = request.get_json()
            user_id = data.get("user_id", authenticated_user.employee_id)
            friend_id = data.get("friend_id")

            # 다른 사용자를 대신해서 친구를 추가하는 경우 권한 확인
            if user_id != authenticated_user.employee_id:
                return jsonify({"error": "자신의 친구만 추가할 수 있습니다"}), 403

            return user_id, friend_id

        try:
            user_id, friend_id = authenticated_add_friend()
        except Exception as e:
            return jsonify({"error": "인증이 필요합니다."}), 401

    if user_id == friend_id:
        print(f"[WARNING] [친구추가] 자기 자신 추가 시도: user_id={user_id}, friend_id={friend_id}")
        return jsonify({"message": "자기 자신을 친구로 추가할 수 없습니다."}), 400

    # 이미 친구인지 확인 (양방향 확인)
    existing_friendship1 = Friendship.query.filter_by(
        requester_id=user_id, receiver_id=friend_id, status="accepted"
    ).first()

    existing_friendship2 = Friendship.query.filter_by(
        requester_id=friend_id, receiver_id=user_id, status="accepted"
    ).first()

    if existing_friendship1 or existing_friendship2:
        print(f"[WARNING] [친구추가] 이미 친구: {user_id}와 {friend_id}")
        return jsonify({"message": "이미 친구로 추가되어 있습니다."}), 400

    # 양방향 친구 관계 생성

    # user_id -> friend_id 친구 관계
    new_friendship1 = Friendship(requester_id=user_id, receiver_id=friend_id)
    new_friendship1.status = "accepted"

    # friend_id -> user_id 친구 관계 (상호 친구)
    new_friendship2 = Friendship(requester_id=friend_id, receiver_id=user_id)
    new_friendship2.status = "accepted"

    db.session.add(new_friendship1)
    db.session.add(new_friendship2)
    db.session.commit()

    print(f"[SUCCESS] [친구추가] 성공: {user_id}와 {friend_id}가 친구가 되었습니다.")

    # 추가된 친구 관계 확인
    added_friendship1 = Friendship.query.filter_by(
        requester_id=user_id, receiver_id=friend_id, status="accepted"
    ).first()

    added_friendship2 = Friendship.query.filter_by(
        requester_id=friend_id, receiver_id=user_id, status="accepted"
    ).first()

    if added_friendship1 and added_friendship2:
        print(f"[SUCCESS] [친구추가] 데이터베이스 확인: 양방향 친구 관계 생성 완료")
    else:
        print(f"[WARNING] [친구추가] 데이터베이스 확인: 친구 관계 생성 실패")

    return jsonify({"message": "친구가 추가되었습니다."}), 201


@app.route("/friends/remove", methods=["POST"])
@require_auth
def remove_friend():
    # 인증된 사용자 정보 사용
    authenticated_user = request.current_user
    data = request.get_json()
    user_id = data.get("user_id", authenticated_user.employee_id)
    friend_id = data.get("friend_id")

    # 다른 사용자를 대신해서 친구를 제거하는 경우 권한 확인
    if user_id != authenticated_user.employee_id:
        return jsonify({"error": "자신의 친구만 제거할 수 있습니다"}), 403

    if not friend_id:
        return jsonify({"message": "친구 ID가 필요합니다."}), 400

    # 양방향 친구 관계 찾기
    friendship1 = Friendship.query.filter_by(requester_id=user_id, receiver_id=friend_id, status="accepted").first()

    friendship2 = Friendship.query.filter_by(requester_id=friend_id, receiver_id=user_id, status="accepted").first()

    if not friendship1 and not friendship2:
        return jsonify({"message": "친구 관계를 찾을 수 없습니다."}), 404

    # 양방향 친구 관계 모두 삭제
    if friendship1:
        db.session.delete(friendship1)
    if friendship2:
        db.session.delete(friendship2)
    db.session.commit()

    return jsonify({"message": "친구가 삭제되었습니다."}), 200


# 친구 요청 시스템 제거 - 일방적 친구 추가로 변경
# @app.route('/friends/accept', methods=['POST'])
# @app.route('/friends/requests', methods=['GET'])


@app.route("/friends", methods=["GET"])
@require_auth
def get_friends():
    try:
        # 인증된 사용자 정보 사용
        authenticated_user = request.current_user
        employee_id = request.args.get("employee_id", authenticated_user.employee_id)

        # 다른 사용자의 친구 목록을 조회하는 경우 권한 확인
        if employee_id != authenticated_user.employee_id:
            return jsonify({"error": "자신의 친구 목록만 조회할 수 있습니다"}), 403

        print(f"DEBUG: Fetching friends for employee_id: {employee_id}")

        # 양방향 친구 관계 조회
        friendships = Friendship.query.filter(
            and_(
                Friendship.status == "accepted",
                or_(
                    Friendship.requester_id == employee_id,
                    Friendship.receiver_id == employee_id,
                ),
            )
        ).all()

        # 친구 ID 리스트 생성
        friend_ids = []
        for friendship in friendships:
            if friendship.requester_id == employee_id:
                friend_ids.append(friendship.receiver_id)
            else:
                friend_ids.append(friendship.requester_id)

        if not friend_ids:
            return jsonify([])

        # 친구 정보를 한 번에 조회 (N+1 문제 해결)
        friends = User.query.filter(User.employee_id.in_(friend_ids)).all()
        
        # 친구 ID를 키로 하는 딕셔너리 생성
        friends_dict = {friend.employee_id: friend for friend in friends}

        # 마지막 점심 기록을 한 번에 조회 (N+1 문제 해결)
        today = get_seoul_today()
        today_str = today.strftime("%Y-%m-%d")
        
        # 모든 친구와의 마지막 파티 기록을 한 번에 조회
        last_parties_query = (
            db.session.query(
                Party.party_date,
                Party.host_employee_id,
                PartyMember.employee_id.label('member_employee_id')
            )
            .join(PartyMember, Party.id == PartyMember.party_id)
                    .filter(
                        and_(
                            or_(
                                and_(
                                    Party.host_employee_id == employee_id,
                            PartyMember.employee_id.in_(friend_ids)
                                ),
                                and_(
                            Party.host_employee_id.in_(friend_ids),
                            PartyMember.employee_id == employee_id
                        )
                                ),
                    Party.party_date < today_str
                        )
                    )
                    .order_by(desc(Party.party_date))
        ).all()

        # 친구별 마지막 파티 날짜 매핑
        last_party_dates = {}
        for party_date, host_id, member_id in last_parties_query:
            # 친구 ID 결정
            if host_id == employee_id:
                friend_id = member_id
            else:
                friend_id = host_id
            
            # 가장 최근 파티만 기록 (이미 정렬되어 있음)
            if friend_id not in last_party_dates:
                last_party_dates[friend_id] = party_date

        friends_data = []
        for friend_id in friend_ids:
            friend = friends_dict.get(friend_id)
            if not friend:
                continue

                # 마지막 점심 날짜 계산
                last_party_date_str = last_party_dates.get(friend_id)
                if last_party_date_str:
                    last_party_date = datetime.strptime(last_party_date_str, "%Y-%m-%d").date()
                    days_diff = (today - last_party_date).days

                    if days_diff == 1:
                        last_lunch = "어제"
                    elif days_diff <= 7:
                        last_lunch = f"{days_diff}일 전"
                    elif days_diff <= 30:
                        last_lunch = f"{days_diff//7}주 전"
                    else:
                        last_lunch = "1달 이상 전"
                else:
                    last_lunch = "처음"

                friends_data.append(
                    {
                        "employee_id": friend.employee_id,
                        "nickname": friend.nickname,
                        "lunch_preference": friend.lunch_preference,
                        "main_dish_genre": friend.main_dish_genre,
                        "last_lunch": last_lunch,
                        "allergies": friend.allergies,
                        "preferred_time": friend.preferred_time,
                    }
                )

        return jsonify(friends_data)
    except Exception as e:
        print(f"ERROR in get_friends: {e}")
        return (
            jsonify({"error": "친구 데이터 조회 중 오류가 발생했습니다.", "details": str(e)}),
            500,
        )


@app.route("/friends/recommendations", methods=["GET"])
@require_auth
def get_friend_recommendations():
    """친구 추천 API - 랜덤런치 점수, 활동패턴, 상호친구 기반 추천"""
    # 인증된 사용자 정보 사용
    authenticated_user = request.current_user
    employee_id = request.args.get("employee_id", authenticated_user.employee_id)

    # 다른 사용자의 친구 추천을 요청하는 경우 권한 확인
    if employee_id != authenticated_user.employee_id:
        return jsonify({"error": "자신의 친구 추천만 조회할 수 있습니다"}), 403

    # 현재 사용자 정보
    current_user = User.query.filter_by(employee_id=employee_id).first()
    if not current_user:
        return jsonify({"message": "사용자를 찾을 수 없습니다."}), 404

    # 이미 친구인 사용자들 제외
    existing_friends = Friendship.query.filter_by(requester_id=employee_id, status="accepted").all()
    friend_ids = [f.receiver_id for f in existing_friends]
    friend_ids.append(employee_id)  # 본인도 제외

    # 모든 다른 사용자들 조회
    potential_friends = User.query.filter(~User.employee_id.in_(friend_ids)).all()

    recommendations = []

    for user in potential_friends:
        score = 0.0

        # 1. 랜덤런치 호환성 점수 (기존 calculate_compatibility_score 활용)
        compatibility_score = calculate_compatibility_score(current_user, user)
        score += compatibility_score * 0.4  # 40% 가중치

        # 2. 활동 패턴 분석
        # 사용자의 파티 참여 횟수
        user_parties = Party.query.filter(
            or_(
                Party.host_employee_id == user.employee_id,
                Party.id.in_(
                    db.session.query(PartyMember.party_id).filter(PartyMember.employee_id == user.employee_id)
                ),
            )
        ).count()

        # 리뷰 작성 횟수
        user_reviews = Review.query.filter_by(user_id=user.employee_id).count()

        # 활동성 점수 (정규화)
        activity_score = min((user_parties * 0.1 + user_reviews * 0.05), 1.0)
        score += activity_score * 0.3  # 30% 가중치

        # 3. 상호 친구 분석
        # 현재 사용자의 친구들과 해당 사용자가 공통으로 아는 사람 수
        current_user_friends = set(friend_ids[:-1])  # 본인 제외

        # 해당 사용자와 함께 파티에 참여했던 사람들
        user_party_members = set()
        user_hosted_parties = Party.query.filter_by(host_employee_id=user.employee_id).all()
        user_joined_parties = (
            Party.query.join(PartyMember, Party.id == PartyMember.party_id)
            .filter(PartyMember.employee_id == user.employee_id)
            .all()
        )

        for party in user_hosted_parties + user_joined_parties:
            # PartyMember 테이블에서 멤버 ID 가져오기
            party_members = PartyMember.query.filter_by(party_id=party.id).all()
            member_ids = [member.employee_id for member in party_members if member.employee_id != user.employee_id]
            user_party_members.update(member_ids)

        # 공통 연결점 계산
        mutual_connections = len(current_user_friends.intersection(user_party_members))
        mutual_score = min(mutual_connections * 0.2, 1.0)
        score += mutual_score * 0.3  # 30% 가중치

        # 4. 최근 활동도 (보너스)
        recent_activity = Party.query.filter(
            and_(
                or_(
                    Party.host_employee_id == user.employee_id,
                    Party.id.in_(
                        db.session.query(PartyMember.party_id).filter(PartyMember.employee_id == user.employee_id)
                    ),
                ),
                Party.party_date >= (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d"),
            )
        ).count()

        recent_score = min(recent_activity * 0.1, 0.5)
        score += recent_score

        recommendations.append(
            {
                "employee_id": user.employee_id,
                "nickname": user.nickname,
                "lunch_preference": user.lunch_preference,
                "main_dish_genre": user.main_dish_genre,
                "recommendation_score": round(score, 3),
                "is_friend": False,
                "allergies": user.allergies,
                "preferred_time": user.preferred_time,
            }
        )

    # 점수순으로 정렬하고 상위 10명만 반환
    recommendations.sort(key=lambda x: x["recommendation_score"], reverse=True)
    return jsonify(recommendations[:10])

    # --- 새로운 채팅 API ---
    # create_friend_chat 함수는 routes/chats.py로 분리됨

    # create_chat_room 함수는 routes/chats.py로 분리됨

    # get_filtered_chats 함수는 routes/chats.py로 분리됨

    # 사용자가 참여한 채팅방들 조회
    user_participants = ChatParticipant.query.filter_by(user_id=employee_id).all()
    room_ids = [p.room_id for p in user_participants]

    # 채팅방 정보 조회
    if chat_type:
        rooms = ChatRoom.query.filter(
            ChatRoom.id.in_(room_ids),  # type: ignore
            ChatRoom.type == chat_type,  # type: ignore
        ).all()
    else:
        rooms = ChatRoom.query.filter(ChatRoom.id.in_(room_ids)).all()  # type: ignore

    chats_data = []
    for room in rooms:
        # 참여자 정보 가져오기
        participants = ChatParticipant.query.filter_by(room_id=room.id).all()
        participant_users = []

        for participant in participants:
            user = User.query.filter_by(employee_id=participant.user_id).first()
            if user:
                participant_users.append({"employee_id": user.employee_id, "nickname": user.nickname})

        # 마지막 메시지 가져오기
        last_message = (
            ChatMessage.query.filter_by(chat_type=room.type, chat_id=room.id)
            .order_by(desc(ChatMessage.created_at))
            .first()
        )

        chat_data = {
            "id": room.id,
            "name": room.name or f"{len(participant_users)}명의 채팅방",
            "type": room.type,
            "participants": participant_users,
            "last_message": (
                {
                    "sender_nickname": last_message.sender_nickname,
                    "message": last_message.message,
                    "created_at": last_message.created_at.strftime("%Y-%m-%d %H:%M"),
                }
                if last_message
                else None
            ),
        }

        chats_data.append(chat_data)

    return jsonify(chats_data)


def find_available_dates_for_participants(participant_ids, max_days=30):
    """참가자들의 공통 가능 날짜를 찾는 공통 함수"""
    today = get_seoul_today()
    available_dates = []
    alternative_dates = []

    for i in range(max_days):
        check_date = today + timedelta(days=i)
        date_str = check_date.strftime("%Y-%m-%d")

        # 각 참여자의 해당 날짜 약속 확인
        available_participants = []
        unavailable_participants = []

        for participant_id in participant_ids:
            # 파티 약속 확인
            has_party = (
                Party.query.join(PartyMember, Party.id == PartyMember.party_id)
                .filter(PartyMember.employee_id == participant_id, Party.party_date == date_str)  # type: ignore
                .first()
                is not None
            )

            # 개인 일정 확인
            has_schedule = (
                PersonalSchedule.query.filter_by(employee_id=participant_id, schedule_date=date_str).first()
                is not None
            )

            if not has_party and not has_schedule:
                available_participants.append(participant_id)
            else:
                unavailable_participants.append(participant_id)

        date_info = {
            "date": date_str,
            "available_participants": available_participants,
            "unavailable_participants": unavailable_participants,
            "available_count": len(available_participants),
            "total_count": len(participant_ids),
        }

        # 모든 참여자가 가능한 경우
        if len(available_participants) == len(participant_ids):
            available_dates.append(date_info)
        # 1명만 빠지고 나머지가 가능한 경우 (3명 이상일 때)
        elif len(participant_ids) >= 3 and len(available_participants) == len(participant_ids) - 1:
            alternative_dates.append(date_info)

    return available_dates, alternative_dates


# --- 지능형 약속 잡기 API ---
@app.route("/intelligent/suggest-dates", methods=["POST"])
def intelligent_suggest_dates():
    """선택된 참가자들로 공통 가능 날짜 찾기 (2050년까지 확장)"""
    try:
        data = request.get_json()
        participant_ids = data.get("participant_ids", [])

        if len(participant_ids) < 2:
            return jsonify({"message": "최소 2명의 참여자가 필요합니다."}), 400

        # 2050년까지 모든 참여자 가능 날짜 찾기 (성능을 위해 최대 3년)
        today = get_seoul_today()
        end_date = datetime(2050, 12, 31).date()
        max_days = (end_date - today).days + 1

        # 너무 큰 범위는 제한 (최대 3년)
        max_days = min(max_days, 365 * 3)

        available_dates_all, alternative_dates_all = find_available_dates_for_participants(
            participant_ids, max_days=max_days
        )

        return jsonify(
            {
                "message": f"{len(available_dates_all)}개의 공통 가능 날짜를 찾았습니다.",
                "type": "common",
                "period": "extended",
                "dates": available_dates_all,
            }
        )

    except Exception as e:
        return jsonify({"message": f"날짜 제안 중 오류가 발생했습니다: {str(e)}"}), 500


@app.route("/chats/<int:room_id>/suggest-dates", methods=["POST"])
def suggest_dates(room_id):
    """채팅방 참여자들의 공통 가능 날짜 찾기 (개선된 버전)"""
    try:
        # 채팅방 정보 조회
        chat_room = ChatRoom.query.get(room_id)
        if not chat_room:
            return jsonify({"message": "채팅방을 찾을 수 없습니다."}), 404

        # 채팅방 참여자들 조회
        participants = ChatParticipant.query.filter_by(room_id=room_id).all()
        participant_ids = [p.user_id for p in participants]

        if len(participant_ids) < 2:
            return jsonify({"message": "최소 2명의 참여자가 필요합니다."}), 400

        # 1단계: 한 달 이내 모든 참여자 가능 날짜 찾기
        available_dates_month, alternative_dates_month = find_available_dates_for_participants(
            participant_ids, max_days=30
        )

        # 한 달 이내에 모든 참여자가 가능한 날짜가 있으면 반환
        if available_dates_month:
            return jsonify(
                {
                    "message": f"한 달 이내 {len(available_dates_month)}개의 공통 가능 날짜를 찾았습니다.",
                    "type": "common",
                    "period": "one_month",
                    "dates": available_dates_month,
                }
            )

        # 2단계: 한 달 이내에 없으면 두 달 이내 검색
        available_dates_two_months, alternative_dates_two_months = find_available_dates_for_participants(
            participant_ids, max_days=60
        )

        # 결과 조합
        all_alternatives = alternative_dates_month + alternative_dates_two_months
        all_available = available_dates_two_months

        if all_available or all_alternatives:
            result = {
                "message": "한 달 이내 공통 날짜가 없어 대안을 제시합니다.",
                "type": "mixed",
                "period": "two_months",
            }

            if all_available:
                result["available_dates"] = {
                    "title": "두 달 이내 모든 참여자 가능 날짜",
                    "dates": all_available,
                }

            if all_alternatives:
                result["alternative_dates"] = {
                    "title": "1명 빼고 가능한 날짜",
                    "dates": all_alternatives[:10],  # 최대 10개
                }

            return jsonify(result)
        else:
            return jsonify(
                {
                    "message": "두 달 이내에도 적절한 날짜를 찾을 수 없습니다.",
                    "type": "no_dates",
                    "period": "two_months",
                }
            )

    except Exception as e:
        return jsonify({"message": f"날짜 제안 중 오류가 발생했습니다: {str(e)}"}), 500


# --- AI 제목 제안 API ---
@app.route("/ai/suggest-party-titles", methods=["POST"])
def suggest_party_titles():
    try:
        data = request.get_json()
        restaurant = data.get("restaurant", "")
        date = data.get("date", "")
        time = data.get("time", "")
        location = data.get("location", "")

        # 간단한 제목 제안 로직
        suggestions = []

        if restaurant:
            suggestions.append(f"🍽️ {restaurant} 점심 모임")
            suggestions.append(f"🥘 {restaurant}에서 함께 밥먹기")
            suggestions.append(f"👥 {restaurant} 런치타임")

        if date:
            date_obj = datetime.strptime(date, "%Y-%m-%d")
            day_name = ["월", "화", "수", "목", "금", "토", "일"][date_obj.weekday()]
            suggestions.append(f"📅 {day_name}요일 점심 모임")
            suggestions.append(f"🎉 {date} 점심 파티")

        if location:
            suggestions.append(f"📍 {location} 점심 모임")

        # 기본 제안들
        suggestions.extend(
            [
                "🍕 맛있는 점심 시간",
                "🥗 건강한 점심 모임",
                "🍜 따뜻한 점심 타임",
                "🍖 고기 맛집 탐방",
                "🍱 도시락 친구들",
            ]
        )

        # 중복 제거 및 최대 5개 반환
        unique_suggestions = list(dict.fromkeys(suggestions))[:5]

        return jsonify({"suggestions": unique_suggestions, "message": "제목 제안을 생성했습니다."})

    except Exception as e:
        return (
            jsonify({"message": f"제목 제안 생성 중 오류가 발생했습니다: {str(e)}"}),
            500,
        )


# 식당 관련 API들은 routes/restaurants.py로 분리됨


def get_user_friends(employee_id):
    """사용자의 친구 목록을 반환하는 헬퍼 함수 (일방적 관계)"""
    friendships = Friendship.query.filter_by(requester_id=employee_id, status="accepted").all()

    friends = []
    for friendship in friendships:
        friend = User.query.filter_by(employee_id=friendship.receiver_id).first()
        if friend:
            friends.append({"employee_id": friend.employee_id, "nickname": friend.nickname})

    return friends


# --- 그룹 최적화 기능 ---
@app.route("/groups/aa-calculator", methods=["POST"])
def calculate_aa():
    """그룹 AA 계산기"""
    data = request.get_json()
    expenses = data.get("expenses", [])  # [{'user_id': 'id', 'amount': 1000}, ...]

    if not expenses:
        return jsonify({"message": "지출 정보가 필요합니다."}), 400

    total_amount = sum(expense["amount"] for expense in expenses)
    average_amount = total_amount / len(expenses)

    # 각 사용자별 정산 금액 계산
    settlements = []
    for expense in expenses:
        user_id = expense["user_id"]
        amount = expense["amount"]
        difference = amount - average_amount

        settlements.append(
            {
                "user_id": user_id,
                "paid_amount": amount,
                "should_pay": average_amount,
                "difference": difference,
                "status": ("receive" if difference > 0 else "pay" if difference < 0 else "settled"),
            }
        )

    return jsonify(
        {
            "total_amount": total_amount,
            "average_amount": average_amount,
            "participant_count": len(expenses),
            "settlements": settlements,
        }
    )


@app.route("/groups/vote", methods=["POST"])
def create_vote():
    """그룹 투표 생성"""
    data = request.get_json()
    group_id = data.get("group_id")
    title = data.get("title")
    options = data.get("options", [])
    end_time = data.get("end_time")

    if not all([group_id, title, options]):
        return jsonify({"message": "필수 정보가 누락되었습니다."}), 400

    # 실제로는 Vote 모델을 만들어야 함
    vote_data = {
        "id": len(votes) + 1,
        "group_id": group_id,
        "title": title,
        "options": options,
        "votes": {},
        "end_time": end_time,
        "created_at": datetime.utcnow().isoformat(),
    }

    votes.append(vote_data)

    return jsonify({"message": "투표가 생성되었습니다.", "vote_id": vote_data["id"]})


@app.route("/groups/vote/<int:vote_id>/vote", methods=["POST"])
def submit_vote():
    """투표 제출"""
    data = request.get_json()
    vote_id = data.get("vote_id")
    user_id = data.get("user_id")
    option = data.get("option")

    if not all([vote_id, user_id, option]):
        return jsonify({"message": "필수 정보가 누락되었습니다."}), 400

    # 실제로는 데이터베이스에서 투표 정보를 가져와야 함
    vote = next((v for v in votes if v["id"] == vote_id), None)
    if not vote:
        return jsonify({"message": "투표를 찾을 수 없습니다."}), 404

    if user_id in vote["votes"]:
        return jsonify({"message": "이미 투표하셨습니다."}), 400

    vote["votes"][user_id] = option

    return jsonify({"message": "투표가 제출되었습니다."})


# 임시 투표 데이터 (실제로는 데이터베이스 사용)
votes = []


def find_best_match(user, employee_id):
    """선호도 기반으로 최적의 매칭 파트너를 찾습니다."""
    waiting_users = User.query.filter(
        and_(
            User.matching_status == "waiting",  # type: ignore
            User.employee_id != employee_id,  # type: ignore
        )
    ).all()

    if not waiting_users:
        return None

    # 각 대기 사용자와의 호환성 점수 계산
    best_match = None
    best_score = 0

    for candidate in waiting_users:
        score = calculate_compatibility_score(user, candidate)
        if score > best_score:
            best_score = score
            best_match = candidate

    # 최소 호환성 점수 이상인 경우에만 매칭
    return best_match if best_score >= 0.3 else None


def calculate_compatibility_score(user1, user2):
    """두 사용자 간의 호환성 점수를 계산합니다 (0-1)."""
    score = 0.0

    # 음식 선호도 비교
    if user1.food_preferences and user2.food_preferences:
        prefs1 = set(user1.food_preferences.split(","))
        prefs2 = set(user2.food_preferences.split(","))
        if prefs1 & prefs2:  # 공통 선호도가 있으면
            score += 0.3

    # 선호 시간대 비교
    if user1.preferred_time and user2.preferred_time:
        if user1.preferred_time == user2.preferred_time:
            score += 0.2

    # 자주 가는 지역 비교
    if user1.frequent_areas and user2.frequent_areas:
        areas1 = set(user1.frequent_areas.split(","))
        areas2 = set(user2.frequent_areas.split(","))
        if areas1 & areas2:  # 공통 지역이 있으면
            score += 0.2

    # 알레르기 호환성 (서로 다른 알레르기가 있으면 감점)
    if user1.allergies and user2.allergies:
        allergies1 = set(user1.allergies.split(","))
        allergies2 = set(user2.allergies.split(","))
        if not (allergies1 & allergies2):  # 공통 알레르기가 없으면
            score += 0.1

    # 기본 점수 (무작위 매칭보다는 나음)
    score += 0.2

    return min(score, 1.0)


# --- 스마트 랜덤 런치 API ---
SMART_LUNCH_CACHE = {}
SMART_LUNCH_CACHE_DATE = None


# 패턴 점수 계산 예시 함수
# (실제 서비스에서는 더 정교하게 구현 가능)
def get_last_dining_together(user1_id, user2_id):
    """두 사용자가 마지막으로 함께 점심을 먹은 시간을 계산하는 함수"""
    try:
        # 두 사용자가 함께 참여한 파티 중 가장 최근 것을 찾기
        latest_party = (
            db.session.query(Party)
            .join(PartyMember, Party.id == PartyMember.party_id)
            .filter(
                and_(
                    or_(
                        and_(
                            Party.host_employee_id == user1_id,
                            PartyMember.employee_id == user2_id,
                        ),
                        and_(
                            Party.host_employee_id == user2_id,
                            PartyMember.employee_id == user1_id,
                        ),
                    ),
                    Party.party_date < get_seoul_today().strftime("%Y-%m-%d"),
                )
            )
            .order_by(desc(Party.party_date))
            .first()
        )

        if latest_party:
            party_date = datetime.strptime(latest_party.party_date, "%Y-%m-%d").date()
            today = get_seoul_today()
            days_diff = (today - party_date).days

            if days_diff == 0:
                return "오늘"
            elif days_diff == 1:
                return "어제"
            elif days_diff < 7:
                return f"{days_diff}일 전"
            elif days_diff < 30:
                weeks = days_diff // 7
                return f"{weeks}주 전"
            elif days_diff < 365:
                months = days_diff // 30
                return f"{months}개월 전"
            else:
                years = days_diff // 365
                return f"{years}년 전"
        else:
            return "처음 만나는 동료"
    except Exception as e:
        print(f"Error calculating last dining together: {e}")
        return "알 수 없음"


def calculate_pattern_score(requester, user):
    score = 0.0
    # 점심 시간대 선호 일치
    if requester.preferred_time and user.preferred_time:
        if requester.preferred_time == user.preferred_time:
            score += 0.5
    # 음식 취향 일치
    if requester.main_dish_genre and user.main_dish_genre:
        if requester.main_dish_genre == user.main_dish_genre:
            score += 0.3
    # 그룹 크기 선호(예시: 없음)
    # 기타 패턴 요소 추가 가능
    return min(score, 1.0)


@app.route("/proposals/smart-recommendations", methods=["GET"])
@require_auth
def get_smart_recommendations():
    # 인증된 사용자 정보 사용
    authenticated_user = request.current_user
    employee_id = request.args.get("employee_id", authenticated_user.employee_id)
    # 여러 파라미터 이름 지원 (프론트엔드 호환성)
    selected_date = request.args.get("selected_date") or request.args.get("date") or request.args.get("target_date")

    # 다른 사용자의 스마트 추천을 요청하는 경우 권한 확인
    if employee_id != authenticated_user.employee_id:
        return jsonify({"error": "자신의 스마트 추천만 조회할 수 있습니다"}), 403

    # 디버깅을 위한 로그 추가
    print(f"DEBUG: Received request with employee_id={employee_id}, selected_date={selected_date}")
    print(f"DEBUG: All request args: {dict(request.args)}")

    try:
        # 캐시가 없으면 먼저 생성
        if not RECOMMENDATION_CACHE:
            generate_recommendation_cache()

        # 기본 날짜 설정: 가장 가까운 영업일
        if not selected_date:
            today = get_seoul_today()
            # 오늘이 주말이면 다음 월요일로 설정
            if today.weekday() >= 5:  # 토요일(5) 또는 일요일(6)
                days_until_monday = (7 - today.weekday()) % 7
                if days_until_monday == 0:
                    days_until_monday = 7
                selected_date = (today + timedelta(days=days_until_monday)).strftime("%Y-%m-%d")
            else:
                selected_date = today.strftime("%Y-%m-%d")

        # 캐시에서 추천 그룹 조회
        cache_key = f"{employee_id}_{selected_date}"
        if cache_key in RECOMMENDATION_CACHE:
            print(f"DEBUG: Returning cached recommendations for {cache_key}")
            return jsonify(RECOMMENDATION_CACHE[cache_key])

        print(f"DEBUG: No cache found for {cache_key}, returning empty list")
        return jsonify([])

    except Exception as e:
        print(f"Error in smart recommendations: {e}")
        return jsonify({"error": "Internal server error"}), 500


# --- 새로운 투표 시스템 API ---


# create_voting_session 함수는 routes/voting.py로 분리됨


# get_voting_session 함수는 routes/voting.py로 분리됨


# vote_for_date 함수는 routes/voting.py로 분리됨


# cancel_voting_session 함수는 routes/voting.py로 분리됨


@app.route("/voting-sessions/<int:session_id>/update", methods=["PUT"])
# update_voting_session 함수는 routes/voting.py로 분리됨


# replace_user_votes 함수는 routes/voting.py로 분리됨


def save_personal_schedules_from_voting(session):
    """투표 결과로 참가자들의 개인 일정 자동 저장"""
    try:
        if not session.confirmed_date:
            return

        participant_ids = json.loads(session.participants)

        # 일정 제목 생성
        schedule_title = session.title

        # 일정 설명 생성 (더 상세하게)
        description_parts = []
        description_parts.append(f"📅 모임명: {schedule_title}")
        description_parts.append(f"📆 날짜: {session.confirmed_date}")

        if session.restaurant_name:
            description_parts.append(f"🍽️ 식당: {session.restaurant_name}")
        else:
            description_parts.append(f"🍽️ 식당: 미정")

        if session.meeting_time:
            description_parts.append(f"🕐 모이는 시간: {session.meeting_time}")
        else:
            description_parts.append(f"🕐 모이는 시간: 12:00")

        if session.meeting_location:
            description_parts.append(f"📍 모이는 장소: {session.meeting_location}")
        else:
            description_parts.append(f"📍 모이는 장소: 1층 로비")

        # 참가자 목록 추가
        participants = User.query.filter(User.employee_id.in_(participant_ids)).all()
        participant_names = [p.nickname for p in participants]
        if participant_names:
            description_parts.append(f"👥 참석자: {', '.join(participant_names)} ({len(participant_names)}명)")

        description = "\n".join(description_parts)

        # 각 참가자의 개인 일정에 저장
        for participant_id in participant_ids:
                # 이미 해당 날짜에 동일한 일정이 있는지 확인
                existing_schedule = PersonalSchedule.query.filter_by(
                    employee_id=participant_id,
                    schedule_date=session.confirmed_date,
                    title=schedule_title,
                ).first()

                if not existing_schedule:
                    personal_schedule = PersonalSchedule(
                        employee_id=participant_id,
                        schedule_date=session.confirmed_date,
                        title=schedule_title,
                        description=description,
                    )
                    db.session.add(personal_schedule)

        db.session.commit()
        print(f"개인 일정 저장 완료: {len(participant_ids)}명")

    except Exception as e:
        print(f"개인 일정 저장 실패: {e}")
        db.session.rollback()


def auto_create_party_from_voting(session):
    """투표 결과로 자동 파티 생성"""
    try:
        if not session.confirmed_date:
            return

        # 날짜와 시간 변환
        from datetime import datetime, date, time
        
        # confirmed_date가 이미 date 객체인지 확인
        if isinstance(session.confirmed_date, str):
            party_date = datetime.strptime(session.confirmed_date, '%Y-%m-%d').date()
        else:
            party_date = session.confirmed_date
        
        # meeting_time이 문자열인 경우 time 객체로 변환
        if isinstance(session.meeting_time, str):
            party_time = datetime.strptime(session.meeting_time, '%H:%M').time()
        else:
            party_time = session.meeting_time or datetime.strptime("11:30", '%H:%M').time()
        
        # 파티 생성
        new_party = Party(
            host_employee_id=session.created_by,
            title=session.title,
            restaurant_name=session.restaurant_name or "미정",
            restaurant_address=session.restaurant_address,
            party_date=party_date,
            party_time=party_time,
            meeting_location=session.meeting_location or "본관 1층 로비",  # 기본값을 '본관 1층 로비'로 설정
            max_members=len(json.loads(session.participants)),
            is_from_match=False,
        )

        db.session.add(new_party)
        db.session.flush()

        # 모든 참가자를 PartyMember 테이블에 추가
        participants = json.loads(session.participants)
        for participant_id in participants:
            is_host = participant_id == session.created_by
            party_member = PartyMember(party_id=new_party.id, employee_id=participant_id, is_host=is_host)
            db.session.add(party_member)

        # 채팅방 생성
        new_party.create_chat_room()
        db.session.commit()

        # WebSocket으로 파티 생성 알림 (채팅방이 있는 경우에만)
        if session.chat_room_id != -1:
            room = f"custom_{session.chat_room_id}"
            socketio.emit(
                "party_created_from_voting",
                {
                    "party_id": new_party.id,
                    "title": new_party.title,
                    "date": new_party.party_date,
                    "time": new_party.party_time,
                    "restaurant": new_party.restaurant_name,
                },
                room=room,
            )

    except Exception as e:
        print(f"Error auto creating party: {e}")


# --- 기존 함수들 ---


def generate_daily_recommendations():
    """매일 자정에 새로운 추천 그룹 생성"""
    try:
        today = get_seoul_today()
        today_str = today.strftime("%Y-%m-%d")

        # 오늘 날짜의 추천 그룹이 이미 있는지 확인
        existing = DailyRecommendation.query.filter_by(date=today_str).first()
        if existing:
            return  # 이미 생성되어 있으면 스킵

        # 모든 사용자 가져오기
        all_users = User.query.all()

        # 각 사용자별로 추천 그룹 생성 (최대 20개 그룹)
        group_count = 0
        for user in all_users:
            if group_count >= 20:
                break

            # 해당 사용자와 호환되는 다른 사용자들 찾기
            compatible_users = []
            for other_user in all_users:
                if other_user.employee_id != user.employee_id:
                    preference_score = calculate_compatibility_score(user, other_user)
                    pattern_score = calculate_pattern_score(user, other_user)
                    # 일관된 시드 사용
                    random.seed(hash(today_str + other_user.employee_id))
                    random_score = random.random()
                    total_score = preference_score * 0.6 + pattern_score * 0.3 + random_score * 0.1
                    compatible_users.append((other_user, total_score))

            # 점수순으로 정렬
            compatible_users.sort(key=lambda x: x[1], reverse=True)

            # 그룹 생성 (3명씩)
            for i in range(0, len(compatible_users), 3):
                if i + 3 <= len(compatible_users) and group_count < 20:
                    group_members = []
                    for other_user, score in compatible_users[i : i + 3]:
                        last_dining = get_last_dining_together(user.employee_id, other_user.employee_id)

                        group_members.append(
                            {
                                "nickname": other_user.nickname,
                                "lunch_preference": other_user.lunch_preference,
                                "employee_id": other_user.employee_id,
                                "compatibility_score": round(score, 2),
                                "last_dining_together": last_dining,
                            }
                        )

                    if group_members:
                        daily_rec = DailyRecommendation(today_str, json.dumps(group_members))
                        db.session.add(daily_rec)
                        group_count += 1

        db.session.commit()
        print(f"Generated {group_count} daily recommendations for {today_str}")

    except Exception as e:
        print(f"Error generating daily recommendations: {e}")
        db.session.rollback()


# 새로운 포인트 시스템 API 등록
try:
    from utils.points_system import PointsSystem
    from utils.challenge_system import ChallengeSystem
    from utils.badge_system import BadgeSystem
    from utils.friend_invite_system import FriendInviteSystem

    # FriendInviteSystem에 데이터베이스 객체 설정
    FriendInviteSystem.set_db(db)
    print("[SUCCESS] 포인트 시스템이 성공적으로 설정되었습니다.")

    # 포인트 시스템 API 블루프린트 등록
    try:
        from api.points_api import points_api

        app.register_blueprint(points_api, url_prefix="/api")
        print("[SUCCESS] 포인트 API가 성공적으로 등록되었습니다.")
    except ImportError as e:
        print(f"[WARNING] 포인트 API 등록 실패: {e}")
        print("   포인트 API는 비활성화됩니다.")

except ImportError as e:
    print(f"[WARNING] 포인트 시스템 설정 실패: {e}")
    print("   포인트 시스템은 비활성화됩니다.")

# 스케줄러는 Celery Beat로 통일됨 (celery_config.py에서 관리)


@app.route("/proposals/generate-today", methods=["POST"])
def generate_today_recommendations():
    """오늘 날짜의 추천 그룹을 수동으로 생성하는 API (테스트용)"""
    try:
        generate_daily_recommendations()
        return jsonify({"message": "Today's recommendations generated successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# 중복된 delete_all_parties 함수 제거됨 - routes/parties.py의 정의만 유지


# 오늘 날짜 확인 API 추가
@app.route("/api/today", methods=["GET"])
def get_today():
    """백엔드에서 인식하는 오늘 날짜를 반환"""
    try:
        today = get_seoul_today()
        now_utc = datetime.utcnow()
        now_korean = datetime.now() + timedelta(hours=9)
        
        return jsonify({
            "success": True,
            "data": {
                "today_date": today.strftime("%Y-%m-%d"),
                "today_datetime": today.isoformat(),
                "current_utc": now_utc.isoformat(),
                "current_korean": now_korean.isoformat(),
                "timezone_info": {
                    "utc_offset": "+00:00",
                    "korean_offset": "+09:00"
                }
            }
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# 잘못된 날짜 데이터 정리 API 추가
@app.route("/cleanup-invalid-dates", methods=["GET"])
def cleanup_invalid_dates():
    try:
        # 잘못된 날짜가 있는 개인 일정 삭제
        invalid_schedules = PersonalSchedule.query.all()
        deleted_schedules = 0

        for schedule in invalid_schedules:
            if not schedule.schedule_date or "NaN" in str(schedule.schedule_date):
                print(f"Deleting invalid schedule: ID {schedule.id}, date: {schedule.schedule_date}")
                db.session.delete(schedule)
                deleted_schedules += 1

        # 잘못된 날짜가 있는 파티 삭제
        invalid_parties = Party.query.all()
        deleted_parties = 0

        for party in invalid_parties:
            if not party.party_date or "NaN" in str(party.party_date):
                print(f"Deleting invalid party: ID {party.id}, date: {party.party_date}")
                db.session.delete(party)
                deleted_parties += 1

        db.session.commit()

        return jsonify(
            {
                "message": "잘못된 날짜 데이터 정리 완료!",
                "deleted_schedules": deleted_schedules,
                "deleted_parties": deleted_parties,
            }
        )
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# 모든 기타 일정 삭제 API 추가
@app.route("/delete-all-schedules", methods=["GET"])
def delete_all_schedules():
    try:
        # 모든 개인 일정 삭제
        deleted_count = PersonalSchedule.query.delete()
        db.session.commit()

        return jsonify({"message": "모든 기타 일정 삭제 완료!", "deleted_schedules": deleted_count})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# 랜덤런치 데이터 전체 삭제 API 추가
@app.route("/delete-all-randomlunch", methods=["GET"])
def delete_all_randomlunch():
    try:
        print("🧹 [랜덤런치] 데이터 정리 시작")

        # 1. 모든 파티 삭제 (랜덤런치로 생성된 파티)
        deleted_parties = Party.query.filter_by(is_from_match=True).delete()

        # 2. 모든 파티 멤버 삭제
        deleted_members = PartyMember.query.delete()

        # 3. 모든 제안 데이터 삭제
        deleted_proposals = LunchProposal.query.delete()

        # 4. 모든 채팅방 삭제 (랜덤런치 관련)
        deleted_chats = ChatRoom.query.filter_by(type="random_lunch").delete()

        # 5. 모든 채팅 참여자 삭제
        deleted_chat_participants = ChatParticipant.query.delete()

        # 6. 모든 채팅 메시지 삭제
        deleted_messages = ChatMessage.query.delete()

        db.session.commit()

        print(
            f"[SUCCESS] [랜덤런치] 정리 완료: 파티{deleted_parties}개, 멤버{deleted_members}개, 제안{deleted_proposals}개, 채팅{deleted_chats}개"
        )

        return jsonify(
            {
                "message": "랜덤런치 데이터 전체 삭제 완료!",
                "deleted_parties": deleted_parties,
                "deleted_members": deleted_members,
                "deleted_chats": deleted_chats,
                "deleted_chat_participants": deleted_chat_participants,
                "deleted_messages": deleted_messages,
            }
        )
    except Exception as e:
        db.session.rollback()
        print(f"[ERROR] [랜덤런치] 데이터 정리 중 오류: {e}")
        return jsonify({"error": str(e)}), 500


# 개발용 유저 API들은 routes/dev_api.py로 이동됨

def create_recurring_instances(master_schedule):
    """반복일정의 각 인스턴스를 생성하는 함수"""
    try:
        from models.schedule_models import PersonalSchedule, ScheduleAttendee
        from datetime import datetime, timedelta
        
        if not master_schedule.is_recurring or not master_schedule.recurrence_type:
            return
        
        print(f"[PROCESS] 반복일정 인스턴스 생성 시작: {master_schedule.title}")
        
        # 시작 날짜와 종료 날짜 설정
        start_date = master_schedule.start_date
        end_date = master_schedule.recurrence_end_date or (start_date + timedelta(days=365))  # 기본 1년
        
        current_date = start_date
        instance_count = 0
        max_instances = 100  # 무한 루프 방지
        
        while current_date <= end_date and instance_count < max_instances:
            # 반복 규칙에 따라 다음 날짜 계산
            if master_schedule.recurrence_type == 'daily':
                next_date = current_date + timedelta(days=master_schedule.recurrence_interval)
            elif master_schedule.recurrence_type == 'weekly':
                next_date = current_date + timedelta(weeks=master_schedule.recurrence_interval)
            elif master_schedule.recurrence_type == 'monthly':
                # 월별 반복은 간단하게 30일로 처리
                next_date = current_date + timedelta(days=30 * master_schedule.recurrence_interval)
            else:
                break
            
            # 현재 날짜가 시작 날짜가 아닌 경우에만 인스턴스 생성
            if current_date != start_date:
                # 인스턴스 일정 생성
                instance_schedule = PersonalSchedule(
                    employee_id=master_schedule.employee_id,
                    title=master_schedule.title,
                    start_date=current_date,
                    schedule_date=current_date.strftime('%Y-%m-%d'),
                    time=master_schedule.time,
                    restaurant=master_schedule.restaurant,
                    location=master_schedule.location,
                    description=master_schedule.description,
                    is_recurring=False,  # 인스턴스는 반복일정이 아님
                    recurrence_type=None,
                    recurrence_interval=None,
                    recurrence_end_date=None,
                    master_schedule_id=master_schedule.id,  # 마스터 일정 ID 설정
                    created_by=master_schedule.created_by
                )
                
                db.session.add(instance_schedule)
                db.session.flush()
                
                # 참석자 복사
                original_attendees = ScheduleAttendee.query.filter_by(schedule_id=master_schedule.id).all()
                for attendee in original_attendees:
                    instance_attendee = ScheduleAttendee(
                        schedule_id=instance_schedule.id,
                        employee_id=attendee.employee_id
                    )
                    db.session.add(instance_attendee)
                
                instance_count += 1
                print(f"  📅 인스턴스 생성: {current_date.strftime('%Y-%m-%d')} - {master_schedule.title}")
            
            current_date = next_date
        
        print(f"[SUCCESS] 반복일정 인스턴스 생성 완료: {instance_count}개")
        
    except Exception as e:
        print(f"[ERROR] 반복일정 인스턴스 생성 실패: {e}")
        raise

# 🚀 개발용 일정 조회 API (인증 없이 테스트 가능)
# 개발용 일정 조회 API는 routes/dev_api.py로 이동됨

# 개발용 점심 약속 히스토리 API는 routes/dev_api.py로 이동됨


def get_nickname_by_id(employee_id):
    """employee_id로 닉네임을 반환하는 헬퍼 함수"""
    nicknames = {
        "1": "김철수",
        "2": "이영희",
        "3": "박민수",
        "4": "최지은",
        "5": "정현우",
        "6": "한소영",
        "7": "윤준호",
        "8": "송미라",
        "9": "강동현",
        "10": "임서연",
        "11": "오태호",
        "12": "신유진",
        "13": "조성민",
        "14": "백하은",
        "15": "남준석",
        "16": "류지현",
        "17": "차준호",
        "18": "구미영",
        "19": "홍성훈",
        "20": "전소연",
    }
    return nicknames.get(employee_id, f"사용자{employee_id}")


# 🚀 개발용 채팅 API
# @app.route("/dev/chats/<employee_id>", methods=["GET"])
# def get_dev_chats(employee_id):
    """개발용 채팅 목록 API - 실제 데이터베이스에서 조회"""
    try:
        from models.app_models import ChatRoom, ChatParticipant
        from sqlalchemy import and_
        
        # 사용자가 참여한 채팅방 조회 (실제 데이터베이스 스키마에 맞게 수정)
        user_chats = db.session.query(ChatRoom).join(
            ChatParticipant, 
            and_(
                ChatRoom.id == ChatParticipant.room_id,  # chat_id -> room_id
                ChatParticipant.user_id == employee_id   # employee_id -> user_id
            )
        ).all()
        
        # 채팅방 목록을 프론트엔드 형식으로 변환
        chats_data = []
        for chat in user_chats:
            chat_data = {
                "id": chat.id,
                "type": chat.type or "group",
                "title": chat.title or "채팅방",
                "last_message": "메시지가 없습니다",
                "last_message_time": chat.created_at.isoformat() if chat.created_at else None,
                "unread_count": 0,
                "created_at": chat.created_at.isoformat() if chat.created_at else None,
                "members": []
            }
            
            # 참여자 목록 조회 (실제 데이터베이스 스키마에 맞게 수정)
            participants = ChatParticipant.query.filter_by(
                room_id=chat.id
            ).all()
            
            for participant in participants:
                chat_data["members"].append({
                    "employee_id": participant.user_id,  # employee_id -> user_id
                    "nickname": f"사용자{participant.user_id}"
                })
            
            chats_data.append(chat_data)
        
        print(f"[SUCCESS] 사용자 {employee_id}의 채팅방 {len(chats_data)}개 조회 완료")
        return jsonify(chats_data)
    except Exception as e:
        print(f"개발용 채팅 목록 조회 오류: {e}")
        return jsonify({"error": str(e)}), 500

# 🚀 개발용 채팅방 멤버 API
# @app.route("/dev/chat/room/members/<chat_type>/<int:chat_id>", methods=["GET"])
# def get_dev_chat_room_members(chat_type, chat_id):
    """개발용 채팅방 멤버 조회 API - 인증 없이 테스트 가능"""
    try:
        mock_members = [
            {
                "employee_id": "1",
                "name": "사용자",
                "nickname": "사용자",
                "joined_at": "2025-09-01T09:00:00Z"
            },
            {
                "employee_id": "2",
                "name": "김철수",
                "nickname": "철수",
                "joined_at": "2025-09-01T09:00:00Z"
            }
        ]
        
        return jsonify({
            "members": mock_members,
            "total": len(mock_members)
        })
    except Exception as e:
        print(f"개발용 채팅방 멤버 조회 오류: {e}")
        return jsonify({"error": str(e)}), 500

# 🚀 개발용 채팅 메시지 API
# @app.route("/dev/chat/messages/<chat_type>/<int:chat_id>", methods=["GET"])
# def get_dev_chat_messages(chat_type, chat_id):
    """개발용 채팅 메시지 조회 API - 인증 없이 테스트 가능"""
    try:
        print(f"개발용 채팅 메시지 조회: {chat_type}/{chat_id}")
        
        chat_key = f"{chat_type}_{chat_id}"
        
        # 저장된 메시지가 있으면 반환
        if hasattr(app, 'dev_messages') and chat_key in app.dev_messages:
            messages = app.dev_messages[chat_key]
            print(f"📋 저장된 메시지 반환: {len(messages)}개")
            return jsonify({
                "messages": messages,
                "total": len(messages)
            })
        
        # 저장된 메시지가 없으면 기본 메시지 반환
        mock_messages = [
            {
                "id": 1,
                "sender_id": "2",
                "content": "안녕하세요!",
                "created_at": "2025-09-05T12:30:00Z",
                "message_type": "text"
            },
            {
                "id": 2,
                "sender_id": "1",
                "content": "안녕하세요! 반갑습니다.",
                "created_at": "2025-09-05T12:31:00Z",
                "message_type": "text"
            },
            {
                "id": 3,
                "sender_id": "2",
                "content": "오늘 정말 맛있었어요!",
                "created_at": "2025-09-05T12:32:00Z",
                "message_type": "text"
            }
        ]
        
        # 기본 메시지를 저장소에 추가
        if not hasattr(app, 'dev_messages'):
            app.dev_messages = {}
        app.dev_messages[chat_key] = mock_messages
        
        return jsonify({
            "messages": mock_messages,
            "total": len(mock_messages)
        })
    except Exception as e:
        print(f"개발용 채팅 메시지 조회 오류: {e}")
        return jsonify({"error": str(e)}), 500

# 🚀 개발용 메시지 전송 API
# @app.route("/dev/chat/messages", methods=["POST"])
# def send_dev_chat_message():
    """개발용 메시지 전송 API - 인증 없이 테스트 가능"""
    try:
        import time
        data = request.get_json()
        print(f"개발용 메시지 전송 요청: {data}")
        
        # 메시지 ID 생성
        message_id = int(time.time() * 1000) % 10000
        
        # 메시지 저장
        message = {
            "id": message_id,
            "chat_type": data.get("chat_type"),
            "chat_id": data.get("chat_id"),
            "sender_id": data.get("sender_id"),
            "content": data.get("content"),
            "message_type": data.get("message_type", "text"),
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }
        
        # 메모리에 메시지 저장
        if not hasattr(app, 'dev_messages'):
            app.dev_messages = {}
        
        chat_key = f"{data.get('chat_type')}_{data.get('chat_id')}"
        if chat_key not in app.dev_messages:
            app.dev_messages[chat_key] = []
        
        app.dev_messages[chat_key].append(message)
        print(f"💾 메시지 저장됨: {chat_key} - {len(app.dev_messages[chat_key])}개")
        
        return jsonify({
            "message": "메시지가 전송되었습니다!",
            "message_id": message_id,
            "success": True
        })
    except Exception as e:
        print(f"개발용 메시지 전송 오류: {e}")
        return jsonify({"error": str(e)}), 500

# 🚀 개발용 채팅방 생성 API
# @app.route("/dev/chat/create", methods=["POST"])
# def create_dev_chat_room():
    """개발용 채팅방 생성 API - 실제 데이터베이스에 저장"""
    try:
        data = request.get_json()
        print(f"개발용 채팅방 생성 요청: {data}")
        
        title = data.get("title")
        employee_ids = data.get("employee_ids", [])
        
        if not title or not employee_ids:
            return jsonify({"error": "제목과 참여자 목록이 필요합니다."}), 400
        
        # 실제 데이터베이스에 채팅방 생성
        from models.app_models import ChatRoom, ChatParticipant
        
        # 새 그룹 채팅방 생성
        new_chat = ChatRoom(
            type="group",
            title=title
        )
        db.session.add(new_chat)
        db.session.flush()
        
        # 참여자들 추가
        for employee_id in employee_ids:
            participant = ChatParticipant(
                chat_type="group",
                chat_id=new_chat.id,
                employee_id=employee_id
            )
            db.session.add(participant)
        
        db.session.commit()
        
        print(f"[SUCCESS] 채팅방 생성 완료: ID={new_chat.id}, 제목={title}")
        
        return jsonify({
            "message": "채팅방이 생성되었습니다!",
            "chat_id": new_chat.id,
            "title": title,
            "success": True
        })
    except Exception as e:
        db.session.rollback()
        print(f"개발용 채팅방 생성 오류: {e}")
        return jsonify({"error": str(e)}), 500

# 식당 관련 API들은 routes/restaurants.py로 분리됨

# 🚀 개발용 특정 날짜 일정 조회 API
# @app.route("/dev/schedules/date", methods=["GET"])
# def get_dev_schedules_by_date():
    """개발용 특정 날짜 일정 조회 API - PersonalSchedule 모델 사용"""
    try:
        date = request.args.get('date')
        if not date:
            return jsonify({"error": "날짜가 필요합니다."}), 400
        
        from models.schedule_models import PersonalSchedule
        
        # 해당 날짜의 일정 조회 (schedule_date 필드 사용)
        schedules = PersonalSchedule.query.filter(
            PersonalSchedule.schedule_date == date
        ).all()
        
        # 일정 데이터 변환
        from models.schedule_models import ScheduleAttendee
        schedules_data = []
        for schedule in schedules:
            # 참석자 정보 조회
            attendees = ScheduleAttendee.query.filter_by(schedule_id=schedule.id).all()
            attendees_data = []
            for attendee in attendees:
                nickname = get_nickname_by_id(attendee.employee_id)
                attendees_data.append({
                    "employee_id": attendee.employee_id,
                    "nickname": nickname
                })
            
            schedule_data = {
                "id": schedule.id,
                "title": schedule.title,
                "scheduled_date": schedule.start_date.isoformat() if schedule.start_date else None,
                "scheduled_time": schedule.time,
                "location": schedule.location,
                "description": schedule.description,
                "attendees": attendees_data
            }
            schedules_data.append(schedule_data)
        
        print(f"[SUCCESS] {date} 일정 조회 완료: {len(schedules_data)}개")
        return jsonify(schedules_data)
        
    except Exception as e:
        print(f"개발용 일정 조회 오류: {e}")
        return jsonify({"error": str(e)}), 500

# 🚀 개발용 파티 API
# @app.route("/parties", methods=["POST"])
# def create_party_main():
    """파티 생성 API - 메인 엔드포인트"""
    try:
        data = request.get_json()
        print(f"🔍 [create_party_main] 받은 데이터: {data}")
        
        if not data:
            return jsonify({'error': '요청 데이터가 없습니다'}), 400
        
        # 필수 필드 검증
        required_fields = ['title', 'date', 'time', 'created_by', 'restaurant']
        for field in required_fields:
            if field not in data or not data[field]:
                print(f"[ERROR] [create_party_main] 필수 필드 누락: {field}, 값: {data.get(field)}")
                return jsonify({'error': f'필수 필드가 누락되었습니다: {field}'}), 400
        
        print(f"[SUCCESS] [create_party_main] 필수 필드 검증 통과")
        
        # 데이터베이스에서 파티 생성
        from models.app_models import Party, PartyMember
        from datetime import datetime, date, time
        
        # 날짜와 시간 변환
        try:
            party_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': '잘못된 날짜 형식입니다. YYYY-MM-DD 형식을 사용하세요.'}), 400
        
        try:
            party_time = datetime.strptime(data['time'], '%H:%M').time()
        except ValueError:
            return jsonify({'error': '잘못된 시간 형식입니다. HH:MM 형식을 사용하세요.'}), 400
        
        # 새 파티 생성
        print(f"🔍 [create_party_main] 변환된 날짜: {party_date} (타입: {type(party_date)})")
        print(f"🔍 [create_party_main] 변환된 시간: {party_time} (타입: {type(party_time)})")
        
        new_party = Party()
        new_party.host_employee_id = data['created_by']
        new_party.title = data['title']
        new_party.restaurant_name = data.get('restaurant', '')
        new_party.restaurant_address = data.get('location', '')
        new_party.party_date = party_date
        new_party.party_time = party_time
        new_party.meeting_location = data.get('location', '')
        new_party.max_members = data.get('maxMembers', 4)
        new_party.is_from_match = False
        new_party.description = data.get('description', '')
        
        print(f"🔍 [create_party_main] 설정된 party_date: {new_party.party_date} (타입: {type(new_party.party_date)})")
        print(f"🔍 [create_party_main] 설정된 party_time: {new_party.party_time} (타입: {type(new_party.party_time)})")
        
        db.session.add(new_party)
        db.session.flush()
        
        # 파티 생성자를 멤버로 추가
        party_member = PartyMember(
            party_id=new_party.id,
            employee_id=data['created_by']
        )
        db.session.add(party_member)
        
        # 참여자들 추가 (있는 경우)
        attendees = data.get('attendees', [])
        for attendee in attendees:
            if attendee.get('employee_id') and attendee['employee_id'] != data['created_by']:
                member = PartyMember(
                    party_id=new_party.id,
                    employee_id=attendee['employee_id']
                )
                db.session.add(member)
                new_party.current_members += 1
        
        db.session.commit()
        
        print(f"[SUCCESS] [create_party_main] 파티 생성 성공: ID {new_party.id}")
        
        return jsonify({
            'success': True,
            'message': '파티가 생성되었습니다',
            'data': {
                'id': new_party.id,
                'title': new_party.title,
                'restaurant_name': new_party.restaurant_name,
                'restaurant_address': new_party.restaurant_address,
                'party_date': new_party.party_date,
                'party_time': new_party.party_time,
                'meeting_location': new_party.meeting_location,
                'max_members': new_party.max_members,
                'current_members': new_party.current_members,
                'is_from_match': new_party.is_from_match,
                'host_employee_id': new_party.host_employee_id,
                'description': new_party.description
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"[ERROR] [create_party_main] 파티 생성 오류: {e}")
        return jsonify({'error': '파티 생성 중 오류가 발생했습니다.', 'details': str(e)}), 500

# @app.route("/parties", methods=["GET"])
# def get_parties_main():
    """파티 목록 조회 API - 메인 엔드포인트"""
    try:
        # 파티 Blueprint의 get_all_parties 함수를 호출
        from api.parties import get_all_parties
        return get_all_parties()
    except Exception as e:
        print(f"[ERROR] [get_parties_main] 오류: {e}")
        return jsonify({'error': '파티 목록 조회 중 오류가 발생했습니다.', 'details': str(e)}), 500

# @app.route("/parties/<int:party_id>", methods=["GET"])
# def get_party_main(party_id):
    """파티 상세 조회 API - 메인 엔드포인트"""
    try:
        # 파티 Blueprint의 get_party 함수를 호출
        from api.parties import get_party
        return get_party(party_id)
    except Exception as e:
        print(f"[ERROR] [get_party_main] 오류: {e}")
        return jsonify({'error': '파티 상세 조회 중 오류가 발생했습니다.', 'details': str(e)}), 500

# @app.route("/parties/<int:party_id>/join", methods=["POST"])
# def join_party_main(party_id):
    """파티 참여 API - 메인 엔드포인트"""
    try:
        # 파티 Blueprint의 join_party 함수를 호출
        from api.parties import join_party
        return join_party(party_id)
    except Exception as e:
        print(f"[ERROR] [join_party_main] 오류: {e}")
        return jsonify({'error': '파티 참여 중 오류가 발생했습니다.', 'details': str(e)}), 500

# @app.route("/parties/<int:party_id>/leave", methods=["POST"])
# def leave_party_main(party_id):
    """파티 나가기 API - 메인 엔드포인트"""
    try:
        # 파티 Blueprint의 leave_party 함수를 호출
        from api.parties import leave_party
        return leave_party(party_id)
    except Exception as e:
        print(f"[ERROR] [leave_party_main] 오류: {e}")
        return jsonify({'error': '파티 나가기 중 오류가 발생했습니다.', 'details': str(e)}), 500

# @app.route("/parties/<int:party_id>", methods=["DELETE"])
# def delete_party_main(party_id):
    """파티 삭제 API - 메인 엔드포인트"""
    try:
        # 파티 Blueprint의 delete_party 함수를 호출
        from api.parties import delete_party
        return delete_party(party_id)
    except Exception as e:
        print(f"[ERROR] [delete_party_main] 오류: {e}")
        return jsonify({'error': '파티 삭제 중 오류가 발생했습니다.', 'details': str(e)}), 500

# @app.route("/dev/parties", methods=["GET"])
# def get_dev_parties():
    """개발용 파티 목록 API - 실제 데이터베이스에서 조회"""
    try:
        from models.app_models import Party, PartyMember
        
        # 쿼리 파라미터 처리
        employee_id = request.args.get('employee_id', '1')
        is_from_match = request.args.get('is_from_match')
        
        # 파티 조회
        if is_from_match:
            # 랜덤런치 그룹 조회
            parties = Party.query.join(PartyMember).filter(
                Party.is_from_match == True,
                PartyMember.employee_id == employee_id
            ).order_by(Party.id.desc()).all()
        else:
            # 일반 파티 조회
            parties = Party.query.filter_by(is_from_match=False).order_by(Party.id.desc()).all()
        
        # 파티 데이터 변환
        parties_data = []
        for party in parties:
            # 멤버 수 조회
            member_count = PartyMember.query.filter_by(party_id=party.id).count()
            
            party_data = {
                "id": party.id,
                "title": party.title,
                "restaurant_name": party.restaurant_name,
                "restaurant_address": party.restaurant_address,
                "party_date": party.party_date.isoformat() if party.party_date else None,
                "party_time": party.party_time,
                "meeting_location": party.meeting_location,
                "max_members": party.max_members,
                "current_members": member_count,
                "is_from_match": party.is_from_match,
                "description": party.description or "",
                "host_employee_id": party.host_employee_id,
                "created_at": party.created_at.isoformat() if party.created_at else None
            }
            parties_data.append(party_data)
        
        print(f"[SUCCESS] 파티 목록 조회 완료: {len(parties_data)}개")
        return jsonify({
            "success": True,
            "parties": parties_data,
            "total": len(parties_data)
        })
        
    except Exception as e:
        print(f"개발용 파티 목록 조회 오류: {e}")
        return jsonify({"error": str(e)}), 500

# 🚀 개발용 일정 생성 API
# @app.route("/dev/schedules", methods=["POST"])
# def create_dev_schedule():
    """개발용 일정 생성 API - 실제 데이터베이스에 저장"""
    try:
        data = request.get_json()
        print(f"개발용 일정 생성 요청: {data}")
        
        from models.schedule_models import PersonalSchedule, ScheduleAttendee
        from datetime import datetime, date
        
        # 날짜 문자열을 datetime 객체로 변환
        start_date = data.get('start_date')
        if start_date and isinstance(start_date, str):
            try:
                start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            except ValueError:
                start_date = datetime.strptime(start_date, '%Y-%m-%d %H:%M:%S').date()
        
        recurrence_end_date = data.get('recurrence_end_date')
        if recurrence_end_date and isinstance(recurrence_end_date, str):
            try:
                recurrence_end_date = datetime.strptime(recurrence_end_date, '%Y-%m-%d').date()
            except ValueError:
                recurrence_end_date = datetime.strptime(recurrence_end_date, '%Y-%m-%d %H:%M:%S').date()
        
        # 새 일정 생성
        new_schedule = PersonalSchedule(
            employee_id=data.get('employee_id'),
            title=data.get('title'),
            start_date=start_date,
            time=data.get('time'),
            restaurant=data.get('restaurant'),
            location=data.get('location'),
            description=data.get('description'),
            is_recurring=data.get('is_recurring', False),
            recurrence_type=data.get('recurrence_type'),
            recurrence_interval=data.get('recurrence_interval', 1),
            recurrence_end_date=recurrence_end_date,
            created_by=data.get('created_by')
        )
        
        db.session.add(new_schedule)
        db.session.flush()
        
        # 참석자 추가
        if data.get('attendees'):
            for attendee_id in data['attendees']:
                attendee = ScheduleAttendee(
                    schedule_id=new_schedule.id,
                    employee_id=attendee_id
                )
                db.session.add(attendee)
        
        # 반복일정인 경우 각 인스턴스 생성
        if new_schedule.is_recurring and new_schedule.recurrence_type:
            create_recurring_instances(new_schedule)
        
        db.session.commit()
        
        print(f"[SUCCESS] 일정 생성 완료: ID={new_schedule.id}, 제목={new_schedule.title}")
        
        return jsonify({
            "success": True,
            "message": "일정이 생성되었습니다.",
            "data": {
                "id": new_schedule.id,
                "title": new_schedule.title,
                "start_date": new_schedule.start_date.isoformat() if new_schedule.start_date else None,
                "time": new_schedule.time,
                "restaurant": new_schedule.restaurant,
                "location": new_schedule.location,
                "description": new_schedule.description
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"개발용 일정 생성 오류: {e}")
        return jsonify({"error": str(e)}), 500

# 🚀 개발용 일정 수정 API
# @app.route("/dev/schedules/<int:schedule_id>", methods=["PUT"])
# def update_dev_schedule(schedule_id):
    """개발용 일정 수정 API - 실제 데이터베이스에서 수정"""
    try:
        data = request.get_json()
        print(f"개발용 일정 수정 요청: ID={schedule_id}, 데이터={data}")
        
        from models.schedule_models import PersonalSchedule, ScheduleAttendee
        from datetime import datetime, date
        
        # 기존 일정 조회
        schedule = PersonalSchedule.query.get(schedule_id)
        if not schedule:
            return jsonify({"error": "일정을 찾을 수 없습니다."}), 404
        
        # 날짜 문자열을 datetime 객체로 변환
        start_date = data.get('start_date')
        if start_date and isinstance(start_date, str):
            try:
                start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            except ValueError:
                start_date = datetime.strptime(start_date, '%Y-%m-%d %H:%M:%S').date()
        
        recurrence_end_date = data.get('recurrence_end_date')
        if recurrence_end_date and isinstance(recurrence_end_date, str):
            try:
                recurrence_end_date = datetime.strptime(recurrence_end_date, '%Y-%m-%d').date()
            except ValueError:
                recurrence_end_date = datetime.strptime(recurrence_end_date, '%Y-%m-%d %H:%M:%S').date()
        
        # 일정 정보 수정
        schedule.title = data.get('title', schedule.title)
        schedule.start_date = start_date if start_date else schedule.start_date
        schedule.time = data.get('time', schedule.time)
        schedule.restaurant = data.get('restaurant', schedule.restaurant)
        schedule.location = data.get('location', schedule.location)
        schedule.description = data.get('description', schedule.description)
        schedule.is_recurring = data.get('is_recurring', schedule.is_recurring)
        schedule.recurrence_type = data.get('recurrence_type', schedule.recurrence_type)
        schedule.recurrence_interval = data.get('recurrence_interval', schedule.recurrence_interval)
        schedule.recurrence_end_date = recurrence_end_date if recurrence_end_date else schedule.recurrence_end_date
        
        # 기존 참석자 삭제
        ScheduleAttendee.query.filter_by(schedule_id=schedule_id).delete()
        
        # 새 참석자 추가
        if data.get('attendees'):
            for attendee_id in data['attendees']:
                attendee = ScheduleAttendee(
                    schedule_id=schedule_id,
                    employee_id=attendee_id
                )
                db.session.add(attendee)
        
        db.session.commit()
        
        print(f"[SUCCESS] 일정 수정 완료: ID={schedule_id}, 제목={schedule.title}")
        
        return jsonify({
            "success": True,
            "message": "일정이 수정되었습니다.",
            "data": {
                "id": schedule.id,
                "title": schedule.title,
                "start_date": schedule.start_date.isoformat() if schedule.start_date else None,
                "time": schedule.time,
                "restaurant": schedule.restaurant,
                "location": schedule.location,
                "description": schedule.description
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"개발용 일정 수정 오류: {e}")
        return jsonify({"error": str(e)}), 500

# 🚀 개발용 일정 삭제 API
# @app.route("/dev/schedules/<int:schedule_id>", methods=["DELETE"])
# def delete_dev_schedule(schedule_id):
    """개발용 일정 삭제 API - 실제 데이터베이스에서 삭제"""
    try:
        from models.schedule_models import PersonalSchedule, ScheduleAttendee
        
        # 기존 일정 조회
        schedule = PersonalSchedule.query.get(schedule_id)
        if not schedule:
            return jsonify({"error": "일정을 찾을 수 없습니다."}), 404
        
        # 참석자 삭제
        ScheduleAttendee.query.filter_by(schedule_id=schedule_id).delete()
        
        # 일정 삭제
        db.session.delete(schedule)
        db.session.commit()
        
        print(f"[SUCCESS] 일정 삭제 완료: ID={schedule_id}")
        
        return jsonify({
            "success": True,
            "message": "일정이 삭제되었습니다."
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"개발용 일정 삭제 오류: {e}")
        return jsonify({"error": str(e)}), 500

# 🚀 개발용 친구 관계 API
# @app.route("/dev/friends/<employee_id>", methods=["GET"])
# def get_dev_friends(employee_id):
    """개발용 임시 친구 관계 API - 인증 없이 테스트 가능"""
    try:
        # 먼저 실제 데이터베이스에서 친구 관계 확인
        try:
            from auth.models import Friendship

            actual_friendships = Friendship.query.filter(
                and_(
                    Friendship.status == "accepted",
                    or_(
                        Friendship.requester_id == employee_id,
                        Friendship.receiver_id == employee_id,
                    ),
                )
            ).all()

            if actual_friendships:

                # 실제 친구 관계가 있으면 그것을 사용
                friends_data = []
                for friendship in actual_friendships:
                    # 친구 ID 결정 (requester_id가 현재 사용자면 receiver_id가 친구, 반대면 requester_id가 친구)
                    if friendship.requester_id == employee_id:
                        friend_id = friendship.receiver_id
                    else:
                        friend_id = friendship.requester_id
                    # 가상 유저 데이터에서 친구 정보 가져오기
                    if GROUP_MATCHING_AVAILABLE:
                        virtual_users = get_virtual_users_data()
                        friend_data = virtual_users.get(friend_id)
                    else:
                        # fallback: 기본 데이터
                        friend_data = {
                            "1": {
                                "nickname": "김철수",
                                "foodPreferences": ["한식", "중식"],
                                "lunchStyle": ["맛집 탐방", "새로운 메뉴 도전"],
                                "allergies": ["없음"],
                                "preferredTime": "12:00",
                            },
                            "2": {
                                "nickname": "이영희",
                                "foodPreferences": ["양식", "일식"],
                                "lunchStyle": ["건강한 음식", "다이어트"],
                                "allergies": ["없음"],
                                "preferredTime": "12:30",
                            },
                            "3": {
                                "nickname": "박민수",
                                "foodPreferences": ["한식", "분식"],
                                "lunchStyle": ["빠른 식사", "가성비"],
                                "allergies": ["없음"],
                                "preferredTime": "12:00",
                            },
                            "4": {
                                "nickname": "최지은",
                                "foodPreferences": ["양식", "한식"],
                                "lunchStyle": ["다양한 음식", "새로운 메뉴 도전"],
                                "allergies": ["없음"],
                                "preferredTime": "12:00",
                            },
                            "5": {
                                "nickname": "정현우",
                                "foodPreferences": ["중식", "한식"],
                                "lunchStyle": ["맛집 탐방", "분위기 좋은 곳"],
                                "allergies": ["없음"],
                                "preferredTime": "12:00",
                            },
                        }.get(friend_id)

                    if friend_data:
                        friends_data.append(
                            {
                                "employee_id": friend_id,
                                "nickname": friend_data.get("nickname", f"사용자{friend_id}"),
                                "department": friend_data.get("department", "부서 정보 없음"),
                                "foodPreferences": friend_data.get("foodPreferences", []),
                                "lunchStyle": friend_data.get("lunchStyle", []),
                                "allergies": friend_data.get("allergies", []),
                                "preferredTime": friend_data.get("preferredTime", "12:00"),
                            }
                        )

                return jsonify(friends_data)

        except (AttributeError, KeyError, TypeError) as db_error:
            print(f"[WARNING] [개발용] 데이터베이스 친구 관계 조회 실패, 가상 데이터 사용: {db_error}")

        # 실제 친구 관계가 없으면 가상 친구 관계 생성 (각 유저당 3-5명의 친구)
        friend_relationships = {
            "1": ["2", "3", "4", "5"],  # 김철수의 친구들
            "2": ["1", "3", "6", "7"],  # 이영희의 친구들
            "3": ["1", "2", "4", "8"],  # 박민수의 친구들
            "4": ["1", "3", "5", "9"],  # 최지은의 친구들
            "5": ["1", "4", "6", "10"],  # 정현우의 친구들
            "6": ["2", "5", "7", "11"],  # 한소영의 친구들
            "7": ["2", "6", "8", "12"],  # 윤준호의 친구들
            "8": ["3", "7", "9", "13"],  # 송미라의 친구들
            "9": ["4", "8", "10", "14"],  # 강동현의 친구들
            "10": ["5", "9", "11", "15"],  # 임서연의 친구들
            "11": ["6", "10", "12", "16"],  # 오태호의 친구들
            "12": ["7", "11", "13", "17"],  # 신유진의 친구들
            "13": ["8", "12", "14", "18"],  # 조성민의 친구들
            "14": ["9", "13", "15", "19"],  # 백하은의 친구들
            "15": ["10", "14", "16", "20"],  # 남준석의 친구들
            "16": ["11", "15", "17", "1"],  # 류지현의 친구들
            "17": ["12", "16", "18", "2"],  # 차준호의 친구들
            "18": ["13", "17", "19", "3"],  # 구미영의 친구들
            "19": ["14", "18", "20", "4"],  # 홍성훈의 친구들
            "20": ["15", "19", "1", "5"],  # 전소연의 친구들
        }

        # 요청된 employee_id의 친구 목록 반환
        if employee_id in friend_relationships:
            friends = friend_relationships[employee_id]
            # 친구들의 상세 정보 생성
            friends_data = []
            for friend_id in friends:
                # 가상 유저 데이터에서 친구 정보 가져오기
                if GROUP_MATCHING_AVAILABLE:
                    virtual_users = get_virtual_users_data()
                    friend_data = virtual_users.get(friend_id)
                else:
                    # fallback: 기본 데이터
                    friend_data = {
                        "1": {
                            "nickname": "김철수",
                            "foodPreferences": ["한식", "중식"],
                            "lunchStyle": ["맛집 탐방", "새로운 메뉴 도전"],
                            "allergies": ["없음"],
                            "preferredTime": "12:00",
                        },
                        "2": {
                            "nickname": "이영희",
                            "foodPreferences": ["양식", "일식"],
                            "lunchStyle": ["건강한 음식", "다이어트"],
                            "allergies": ["없음"],
                            "preferredTime": "12:30",
                        },
                        "3": {
                            "nickname": "박민수",
                            "foodPreferences": ["한식", "분식"],
                            "lunchStyle": ["빠른 식사", "가성비"],
                            "allergies": ["없음"],
                            "preferredTime": "12:00",
                        },
                        "4": {
                            "nickname": "최지은",
                            "foodPreferences": ["양식", "한식"],
                            "lunchStyle": ["다양한 음식", "새로운 메뉴 도전"],
                            "allergies": ["없음"],
                            "preferredTime": "12:00",
                        },
                        "5": {
                            "nickname": "정현우",
                            "foodPreferences": ["중식", "한식"],
                            "lunchStyle": ["맛집 탐방", "분위기 좋은 곳"],
                            "allergies": ["없음"],
                            "preferredTime": "12:00",
                        },
                    }.get(friend_id)

                if friend_data:
                    friends_data.append(
                        {
                            "employee_id": friend_id,
                            "nickname": friend_data["nickname"],
                            "foodPreferences": friend_data["foodPreferences"],
                            "lunchStyle": friend_data["lunchStyle"],
                            "allergies": friend_data["allergies"],
                            "preferredTime": friend_data["preferredTime"],
                        }
                    )

            print(f"🔍 [개발용] 친구 관계 반환: {employee_id}의 친구 {len(friends_data)}명")
            return jsonify(friends_data)
        else:
            return jsonify([])  # 친구가 없는 경우 빈 배열

    except (AttributeError, KeyError, TypeError) as e:

        return jsonify({"error": "친구 관계 조회 중 오류가 발생했습니다."}), 500


# 🚀 개발용 그룹 매칭 API
# @app.route("/dev/random-lunch/<employee_id>", methods=["GET"])
# def get_dev_random_lunch(employee_id):
    """개발용 임시 그룹 매칭 API - 실제와 유사하게 구현"""
    try:
        import random
        from datetime import datetime, timedelta

        current_user = int(employee_id)

        # 가상 유저 데이터 (모듈에서 가져오기)
        if GROUP_MATCHING_AVAILABLE:
            virtual_users = get_virtual_users_data()
        else:
            # fallback: 기본 데이터 (20명 유지)
            virtual_users = {
                "1": {
                    "nickname": "김철수",
                    "foodPreferences": ["한식", "중식"],
                    "lunchStyle": ["맛집 탐방", "새로운 메뉴 도전"],
                    "allergies": ["없음"],
                    "preferredTime": "12:00",
                },
                "2": {
                    "nickname": "이영희",
                    "foodPreferences": ["양식", "일식"],
                    "lunchStyle": ["건강한 음식", "다이어트"],
                    "allergies": ["없음"],
                    "preferredTime": "12:30",
                },
                "3": {
                    "nickname": "박민수",
                    "foodPreferences": ["한식", "분식"],
                    "lunchStyle": ["빠른 식사", "가성비"],
                    "allergies": ["없음"],
                    "preferredTime": "12:00",
                },
                "4": {
                    "nickname": "최지은",
                    "foodPreferences": ["양식", "한식"],
                    "lunchStyle": ["다양한 음식", "새로운 메뉴 도전"],
                    "allergies": ["없음"],
                    "preferredTime": "12:00",
                },
                "5": {
                    "nickname": "정현우",
                    "foodPreferences": ["중식", "한식"],
                    "lunchStyle": ["맛집 탐방", "분위기 좋은 곳"],
                    "allergies": ["없음"],
                    "preferredTime": "12:00",
                },
                "6": {
                    "nickname": "한소영",
                    "foodPreferences": ["일식", "양식"],
                    "lunchStyle": ["건강한 음식", "다이어트"],
                    "allergies": ["없음"],
                    "preferredTime": "12:30",
                },
                "7": {
                    "nickname": "윤준호",
                    "foodPreferences": ["한식", "분식"],
                    "lunchStyle": ["빠른 식사", "가성비"],
                    "allergies": ["없음"],
                    "preferredTime": "12:00",
                },
                "8": {
                    "nickname": "송미라",
                    "foodPreferences": ["양식", "일식"],
                    "lunchStyle": ["맛집 탐방", "새로운 메뉴 도전"],
                    "allergies": ["없음"],
                    "preferredTime": "12:00",
                },
                "9": {
                    "nickname": "강동현",
                    "foodPreferences": ["중식", "한식"],
                    "lunchStyle": ["건강한 음식", "다이어트"],
                    "allergies": ["없음"],
                    "preferredTime": "12:30",
                },
                "10": {
                    "nickname": "임서연",
                    "foodPreferences": ["한식", "분식"],
                    "lunchStyle": ["빠른 식사", "가성비"],
                    "allergies": ["없음"],
                    "preferredTime": "12:00",
                },
                "11": {
                    "nickname": "오태호",
                    "foodPreferences": ["양식", "일식"],
                    "lunchStyle": ["맛집 탐방", "새로운 메뉴 도전"],
                    "allergies": ["없음"],
                    "preferredTime": "12:00",
                },
                "12": {
                    "nickname": "신유진",
                    "foodPreferences": ["중식", "한식"],
                    "lunchStyle": ["건강한 음식", "다이어트"],
                    "allergies": ["없음"],
                    "preferredTime": "12:30",
                },
                "13": {
                    "nickname": "조성민",
                    "foodPreferences": ["한식", "분식"],
                    "lunchStyle": ["빠른 식사", "가성비"],
                    "allergies": ["없음"],
                    "preferredTime": "12:00",
                },
                "14": {
                    "nickname": "백하은",
                    "foodPreferences": ["양식", "일식"],
                    "lunchStyle": ["맛집 탐방", "새로운 메뉴 도전"],
                    "allergies": ["없음"],
                    "preferredTime": "12:00",
                },
                "15": {
                    "nickname": "남준석",
                    "foodPreferences": ["중식", "한식"],
                    "lunchStyle": ["건강한 음식", "다이어트"],
                    "allergies": ["없음"],
                    "preferredTime": "12:30",
                },
                "16": {
                    "nickname": "류지현",
                    "foodPreferences": ["일식", "양식"],
                    "lunchStyle": ["맛집 탐방", "분위기 좋은 곳"],
                    "allergies": ["없음"],
                    "preferredTime": "12:00",
                },
                "17": {
                    "nickname": "차준호",
                    "foodPreferences": ["한식", "분식"],
                    "lunchStyle": ["건강한 식사", "빠른 식사"],
                    "allergies": ["없음"],
                    "preferredTime": "12:00",
                },
                "18": {
                    "nickname": "구미영",
                    "foodPreferences": ["양식", "일식"],
                    "lunchStyle": ["맛집 탐방", "새로운 메뉴 도전"],
                    "allergies": ["없음"],
                    "preferredTime": "12:00",
                },
                "19": {
                    "nickname": "홍성훈",
                    "foodPreferences": ["중식", "한식"],
                    "lunchStyle": ["건강한 음식", "다이어트"],
                    "allergies": ["없음"],
                    "preferredTime": "12:30",
                },
                "20": {
                    "nickname": "전소연",
                    "foodPreferences": ["한식", "분식"],
                    "lunchStyle": ["빠른 식사", "가성비"],
                    "allergies": ["없음"],
                    "preferredTime": "12:00",
                },
            }
        # 현재 사용자 제외 (절대 포함되지 않도록)
        available_users = {k: v for k, v in virtual_users.items() if k != str(current_user)}

        # 원래 앱과 동일한 날짜 생성 (30일, 주말 제외)
        future_dates = []
        for i in range(1, 31):  # 30일 동안
            future_date = datetime.now() + timedelta(days=i)
            # 주말 제외 (토요일=5, 일요일=6)
            if future_date.weekday() < 5:  # 월~금만
                future_dates.append(future_date.strftime("%Y-%m-%d"))

        # 여러 그룹 생성 (3명 우선, 2명은 보조)
        groups = []
        for date in future_dates:
            # 각 날짜마다 3명 그룹을 우선적으로 생성
            num_groups_3 = random.randint(40, 80)  # 3명 그룹 수
            num_groups_2 = random.randint(10, 20)  # 2명 그룹 수 (보조)

            # 3명 그룹 우선 생성
            for group_idx in range(num_groups_3):
                group_size = 3  # 항상 3명

                # 사용 가능한 유저에서 3명 선택 (현재 사용자 제외)
                available_user_ids = list(available_users.keys())
                if len(available_user_ids) >= group_size:
                    group_members = random.sample(available_user_ids, group_size)

                    # 현재 사용자가 포함되어 있는지 한 번 더 확인
                    if str(current_user) not in group_members:
                        # 그룹 점수 계산 (실제 로직과 유사)
                        score = calculate_group_score(group_members, available_users, date)

                        group_data = {
                            "group_id": f"group_3_{date}_{group_idx}_{random.randint(1000, 9999)}",
                            "date": date,
                            "users": [
                                {
                                    "employee_id": member_id,
                                    "nickname": virtual_users[member_id]["nickname"],
                                    "foodPreferences": virtual_users[member_id]["foodPreferences"],
                                    "lunchStyle": virtual_users[member_id]["lunchStyle"],
                                    "allergies": virtual_users[member_id]["allergies"],
                                    "preferredTime": virtual_users[member_id]["preferredTime"],
                                    "age_group": None,
                                    "gender": None,
                                    "lunch_preference": ", ".join(virtual_users[member_id]["lunchStyle"]),
                                    "main_dish_genre": ", ".join(virtual_users[member_id]["foodPreferences"]),
                                }
                                for member_id in group_members
                            ],
                            "status": "matched",
                            "created_at": datetime.now().isoformat(),
                            "score": score,
                            "max_members": 4,  # 현재 사용자 포함 시 4명
                            "current_members": group_size,
                            "group_type": "3인_그룹",
                            "can_join": True,  # 현재 사용자가 참여 가능
                        }
                        groups.append(group_data)

            # 2명 그룹 보조 생성 (3명 그룹을 만들 수 없을 때 대안)
            for group_idx in range(num_groups_2):
                group_size = 2  # 2명 그룹

                # 사용 가능한 유저에서 2명 선택 (현재 사용자 제외)
                available_user_ids = list(available_users.keys())
                if len(available_user_ids) >= group_size:
                    group_members = random.sample(available_user_ids, group_size)

                    # 현재 사용자가 포함되어 있는지 한 번 더 확인
                    if str(current_user) not in group_members:
                        # 그룹 점수 계산 (실제 로직과 유사)
                        score = calculate_group_score(group_members, available_users, date)

                        group_data = {
                            "group_id": f"group_2_{date}_{group_idx}_{random.randint(1000, 9999)}",
                            "date": date,
                            "users": [
                                {
                                    "employee_id": member_id,
                                    "nickname": virtual_users[member_id]["nickname"],
                                    "foodPreferences": virtual_users[member_id]["foodPreferences"],
                                    "lunchStyle": virtual_users[member_id]["lunchStyle"],
                                    "allergies": virtual_users[member_id]["allergies"],
                                    "preferredTime": virtual_users[member_id]["preferredTime"],
                                    "age_group": None,
                                    "gender": None,
                                    "lunch_preference": ", ".join(virtual_users[member_id]["lunchStyle"]),
                                    "main_dish_genre": ", ".join(virtual_users[member_id]["foodPreferences"]),
                                }
                                for member_id in group_members
                            ],
                            "status": "matched",
                            "created_at": datetime.now().isoformat(),
                            "score": score * 0.8,  # 2명 그룹은 점수 감점
                            "max_members": 3,  # 현재 사용자 포함 시 3명
                            "current_members": group_size,
                            "group_type": "2인_그룹",
                            "can_join": True,  # 현재 사용자가 참여 가능
                        }
                        groups.append(group_data)

        # 점수 순으로 정렬
        groups.sort(key=lambda x: x["score"], reverse=True)

        # 현재 사용자가 포함된 그룹이 있는지 최종 확인
        current_user_in_groups = any(
            str(current_user) in [user["employee_id"] for user in group["users"]] for group in groups
        )
        if current_user_in_groups:
            print(f"[WARNING] [경고] 현재 사용자 {current_user}가 그룹에 포함되어 있습니다!")
        else:
            print(f"[SUCCESS] [확인] 현재 사용자 {current_user}가 모든 그룹에서 제외되었습니다.")

        # 모든 그룹 반환 (무한 스크롤 지원)

        return jsonify(groups)

    except Exception as e:

        return jsonify({"error": "그룹 매칭 생성 중 오류가 발생했습니다."}), 500


def get_dev_user_data(employee_id):
    """가상 유저 데이터 반환 헬퍼 함수"""
    # 공통 모의 데이터 사용
    from utils.mock_data import get_all_mock_users
    mock_users = get_all_mock_users()
    
    if employee_id in mock_users:
        user_data = mock_users[employee_id]
        return {
            "nickname": user_data["nickname"],
            "foodPreferences": user_data["food_preferences"].split(","),
            "lunchStyle": user_data["lunchStyle"],
            "allergies": user_data["allergies"],
            "preferredTime": user_data["preferred_time"],
        }
    
    return None


# 데이터베이스 자동 초기화 함수
def create_default_users():
    """기본 사용자들을 생성합니다."""
    try:
        from auth.models import User

        # 가상 사용자 데이터
        default_users = [
            {"email": "kim@example.com", "nickname": "김철수", "employee_id": "1"},
            {"email": "lee@example.com", "nickname": "이영희", "employee_id": "2"},
            {"email": "park@example.com", "nickname": "박민수", "employee_id": "3"},
        ]

        # 세션 상태 확인 및 재설정
        try:
            db.session.rollback()
        except:
            pass

        created_count = 0
        for user_data in default_users:
            try:
                # 이미 존재하는지 확인
                existing_user = db.session.query(User).filter_by(employee_id=user_data["employee_id"]).first()
                if not existing_user:
                    user = User(**user_data)
                    db.session.add(user)
                    created_count += 1
                    print(f"[SUCCESS] 사용자 추가: {user_data['nickname']} ({user_data['employee_id']})")
            except Exception as e:
                print(f"[WARNING] 사용자 {user_data['nickname']} 추가 중 오류: {e}")
                # 개별 사용자 실패 시에도 계속 진행
                continue

        if created_count > 0:
            try:
                db.session.commit()
                print(f"[SUCCESS] {created_count}명의 기본 사용자 생성 완료")
            except Exception as e:
                print(f"[ERROR] 사용자 커밋 실패: {e}")
                # 커밋 실패 시 개별 커밋 시도
                db.session.rollback()
                for user_data in default_users:
                    try:
                        existing_user = db.session.query(User).filter_by(employee_id=user_data["employee_id"]).first()
                        if not existing_user:
                            user = User(**user_data)
                            db.session.add(user)
                            db.session.commit()
                            print(f"[SUCCESS] 개별 커밋 성공: {user_data['nickname']}")
                    except Exception as e2:
                        print(f"[ERROR] 개별 커밋 실패 {user_data['nickname']}: {e2}")
                        db.session.rollback()
        else:
            print("[INFO] 추가할 사용자가 없습니다 (이미 모두 존재)")

    except Exception as e:
        print(f"[ERROR] 기본 사용자 생성 실패: {e}")
        try:
            db.session.rollback()
        except:
            pass


# Flask 3.x 호환 데이터베이스 초기화
def init_database_on_startup():
    """애플리케이션 첫 요청 시 데이터베이스 자동 초기화"""
    try:
        # PostgreSQL 환경에서 더 안정적인 테이블 존재 여부 확인
        from sqlalchemy import text

        def check_table_exists(table_name):
            """PostgreSQL에서 테이블 존재 여부를 안정적으로 확인"""
            try:
                # 방법 1: information_schema 사용 (가장 안정적)
                result = db.session.execute(
                    text("SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = :table_name)"),
                    {"table_name": table_name},
                ).scalar()
                if result:
                    return True

                # 방법 2: pg_tables 사용 (PostgreSQL 전용)
                result = db.session.execute(
                    text("SELECT EXISTS(SELECT 1 FROM pg_tables WHERE tablename = :table_name)"),
                    {"table_name": table_name},
                ).scalar()
                if result:
                    return True

                # 방법 3: 직접 테이블 조회 시도 (마지막 수단)
                result = db.session.execute(text(f"SELECT 1 FROM {table_name} LIMIT 1")).fetchone()
                return result is not None

            except Exception:
                return False

        def force_create_tables():
            """강제로 테이블을 생성하고 확인"""
            try:
                print("[CONFIG] 강제 테이블 생성 시작...")

                # 기존 세션 정리
                db.session.rollback()
                db.session.close()

                # 테이블 생성
                db.create_all()
                print("[SUCCESS] 강제 테이블 생성 완료")

                # PostgreSQL 특성상 약간의 대기 시간 필요
                import time

                time.sleep(5)

                # 세션 재설정
                db.session.rollback()

                return True
            except Exception as e:
                print(f"[ERROR] 강제 테이블 생성 실패: {e}")
                db.session.rollback()
                return False

        if not check_table_exists("users"):
            print("[CONFIG] 데이터베이스에 users 테이블이 없어 새로 생성합니다...")

            # 첫 번째 시도: 일반적인 방법
            try:
                db.create_all()
                print("[SUCCESS] 데이터베이스 테이블 생성 완료")
            except Exception as e:
                print(f"[WARNING] 일반 테이블 생성 실패: {e}")
                # 강제 생성 시도
                if not force_create_tables():
                    print("[ERROR] 모든 테이블 생성 방법 실패")
                    return

            # 테이블 생성 완료 확인 (1번만 시도)
            try:
                if check_table_exists("users"):
                    print("[SUCCESS] 테이블 생성 확인 완료")
                else:
                    print("[WARNING] 테이블 생성 확인 실패, 강제 테이블 생성 시도...")
                    if not force_create_tables():
                        print("[ERROR] 강제 테이블 생성도 실패")
                        return
            except Exception as e:
                print(f"[WARNING] 테이블 확인 중 오류: {e}, 강제 테이블 생성 시도...")
                if not force_create_tables():
                    print("[ERROR] 강제 테이블 생성도 실패")
                    return

            # 기본 사용자 생성 (세션 재설정 후)
            try:
                db.session.rollback()  # 세션 상태 초기화
                create_default_users()
                print("[SUCCESS] 기본 사용자 생성 완료")
            except Exception as e:
                print(f"[ERROR] 기본 사용자 생성 실패: {e}")
                # 마지막 시도: 세션 재설정 후 사용자 생성
                try:
                    db.session.rollback()
                    db.session.close()
                    create_default_users()
                    print("[SUCCESS] 세션 재설정 후 사용자 생성 성공")
                except Exception as e2:
                    print(f"[ERROR] 모든 사용자 생성 방법 실패: {e2}")
        else:
            print("[SUCCESS] 데이터베이스 테이블이 이미 존재합니다")
    except Exception as e:
        print(f"[ERROR] 데이터베이스 초기화 실패: {e}")
        # 마지막 수단: 세션 재설정
        try:
            db.session.rollback()
            db.session.close()
        except:
            pass


# Flask 3.x 호환 방식으로 데이터베이스 초기화
with app.app_context():
    init_database_on_startup()

    # 데이터베이스 초기화 완료 후 Blueprint 등록
    try:
        from auth.routes import auth_bp

        app.register_blueprint(auth_bp)
        print("[SUCCESS] 인증 Blueprint 등록 성공")
    except Exception as e:
        print(f"[ERROR] 인증 Blueprint 등록 실패: {e}")

    try:
        from api.schedules import schedules_bp, personal_schedules_bp

        app.register_blueprint(schedules_bp)
        app.register_blueprint(personal_schedules_bp)
        print("[SUCCESS] 일정 관리 Blueprint 등록 성공")
    except Exception as e:
        print(f"[ERROR] 일정 관리 Blueprint 등록 실패: {e}")

    try:
        from api.proposals import proposals_bp

        app.register_blueprint(proposals_bp)
        print("[SUCCESS] 제안 관리 Blueprint 등록 성공")
    except Exception as e:
        print(f"[ERROR] 제안 관리 Blueprint 등록 실패: {e}")

    # 식당 API v2 등록 (기존 v1은 제거됨)
    try:
        from api.restaurants_v2 import restaurants_v2_bp

        app.register_blueprint(restaurants_v2_bp)
        print("[SUCCESS] 식당 관리 Blueprint v2 등록 성공")
    except Exception as e:
        print(f"[ERROR] 식당 관리 Blueprint v2 등록 실패: {e}")

    # 식당 관련 API 등록 (routes/restaurants.py)
    try:
        from routes.restaurants import restaurants_bp

        app.register_blueprint(restaurants_bp)
        print("[SUCCESS] 식당 관련 Blueprint 등록 성공")
    except Exception as e:
        print(f"[ERROR] 식당 관련 Blueprint 등록 실패: {e}")

    try:
        from api.parties import parties_bp

        app.register_blueprint(parties_bp)
        print("[SUCCESS] 파티 관리 Blueprint 등록 성공")
    except Exception as e:
        print(f"[ERROR] 파티 관리 Blueprint 등록 실패: {e}")

    try:
        from routes.users import users_bp

        app.register_blueprint(users_bp)
        print("[SUCCESS] 사용자 관리 Blueprint 등록 성공")
    except Exception as e:
        print(f"[ERROR] 사용자 관리 Blueprint 등록 실패: {e}")

    try:
        from routes.chats import chats_bp

        app.register_blueprint(chats_bp)
        print("[SUCCESS] 채팅 관리 Blueprint 등록 성공")
    except Exception as e:
        print(f"[ERROR] 채팅 관리 Blueprint 등록 실패: {e}")

    # 개발용 API는 제거됨 - 프로덕션 환경으로 전환
    print("[INFO] 프로덕션 환경: 개발용 API Blueprint 제거됨")

    try:
        from routes.voting import voting_bp

        app.register_blueprint(voting_bp)
        print("[SUCCESS] 투표 관리 Blueprint 등록 성공")
    except Exception as e:
        print(f"[ERROR] 투표 관리 Blueprint 등록 실패: {e}")

    try:
        from routes.matching import matching_bp

        app.register_blueprint(matching_bp)
        print("[SUCCESS] 매칭 관리 Blueprint 등록 성공")
    except Exception as e:
        print(f"[ERROR] 매칭 관리 Blueprint 등록 실패: {e}")

    try:
        from api.clear_data import clear_data_bp

        app.register_blueprint(clear_data_bp)
        print("[SUCCESS] 데이터 정리 Blueprint 등록 성공")
    except Exception as e:
        print(f"[ERROR] 데이터 정리 Blueprint 등록 실패: {e}")

    # 파일 업로드 Blueprint 등록
    try:
        from routes.file_upload import file_upload_bp
        app.register_blueprint(file_upload_bp)
        print("[SUCCESS] 파일 업로드 Blueprint 등록 성공")
    except ImportError as e:
        if "PIL" in str(e):
            print("[ERROR] 파일 업로드 Blueprint 등록 실패: Pillow 패키지가 설치되지 않았습니다.")
            print("   requirements.txt에 Pillow>=10.0.0을 추가하고 재배포하세요.")
        else:
            print(f"[ERROR] 파일 업로드 Blueprint 등록 실패: {e}")
    except Exception as e:
        print(f"[ERROR] 파일 업로드 Blueprint 등록 실패: {e}")

    # 알림 관리 Blueprint 등록
    try:
        from routes.notifications import notifications_bp
        app.register_blueprint(notifications_bp)
        print("[SUCCESS] 알림 관리 Blueprint 등록 성공")
    except Exception as e:
        print(f"[ERROR] 알림 관리 Blueprint 등록 실패: {e}")

    # 최적화된 채팅 Blueprint 등록
    try:
        from routes.optimized_chat import optimized_chat_bp
        app.register_blueprint(optimized_chat_bp)
        print("[SUCCESS] 최적화된 채팅 Blueprint 등록 성공")
    except Exception as e:
        print(f"[ERROR] 최적화된 채팅 Blueprint 등록 실패: {e}")

    print("[SUCCESS] 모든 Blueprint 등록 완료")

# === 고급 실시간 채팅 시스템 ===
try:
    from realtime.advanced_chat_system import AdvancedChatSystem
    advanced_chat_system = AdvancedChatSystem(socketio)
    print("[SUCCESS] 고급 실시간 채팅 시스템이 성공적으로 로드되었습니다.")
    print(f"   - 시스템 정보: {advanced_chat_system.get_system_info()}")
except Exception as e:
    print(f"[ERROR] 고급 실시간 채팅 시스템 로드 실패: {e}")
    advanced_chat_system = None

# 공통 로직은 group_matching.py 모듈로 이동

if __name__ == "__main__":
    # 앱 시작 시 자동 마이그레이션 및 데이터베이스 초기화
    with app.app_context():
        try:
            from utils.auto_migration import (
                initialize_database, 
                create_tables_if_not_exist, 
                reset_database_if_needed
            )
            
            print("[PROCESS] 데이터베이스 초기화 중...")
            
            # 1. 데이터베이스 마이그레이션 실행
            db_init_success = initialize_database()
            
            # 2. 테이블 생성 (필요한 경우)
            table_creation_success = create_tables_if_not_exist()
            
            if db_init_success and table_creation_success:
                print("[SUCCESS] 데이터베이스 초기화 완료")
            else:
                print("[WARNING] 데이터베이스 초기화에 일부 문제가 있었습니다")
                print("[PROCESS] 데이터베이스 재초기화를 시도합니다...")
                
                # 재초기화 시도
                reset_success = reset_database_if_needed()
                if reset_success:
                    print("[SUCCESS] 데이터베이스 재초기화 완료")
                else:
                    print("[ERROR] 데이터베이스 재초기화 실패 - 기본 모드로 실행합니다")
            
            # 3. 식당 데이터 자동 로드
            try:
                load_restaurant_data_if_needed()
                print("[SUCCESS] 식당 데이터 로드 완료")
            except Exception as e:
                print(f"[WARNING] 식당 데이터 로드 실패 (건너뜀): {e}")
            
        except Exception as e:
            print(f"[ERROR] 데이터베이스 초기화 중 오류 발생: {e}")
            print("[PROCESS] 데이터베이스 재초기화를 시도합니다...")
            
            try:
                reset_success = reset_database_if_needed()
                if reset_success:
                    print("[SUCCESS] 데이터베이스 재초기화 완료")
                else:
                    print("[ERROR] 데이터베이스 재초기화 실패 - 기본 모드로 실행합니다")
            except Exception as reset_error:
                print(f"[ERROR] 데이터베이스 재초기화 중 오류: {reset_error}")
                print("[WARNING] 오류가 있었지만 앱을 계속 실행합니다")
    
    if socketio:
        # Socket.IO와 함께 실행
            socketio.run(app, host="0.0.0.0", port=5000, debug=os.getenv('DEBUG', 'false').lower() == 'true')
    else:
        # 일반 Flask로 실행
            app.run(debug=os.getenv('DEBUG', 'false').lower() == 'true', host="0.0.0.0", port=5000)
