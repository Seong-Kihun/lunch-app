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
    
    # 인증 모델 import (별도 처리) - 메타데이터 충돌 방지
    try:
        print(f"[DEBUG] 메타데이터 상태 (User import 전): {list(db.metadata.tables.keys())}")
        
        # 근본적 해결: 안전한 모델 등록
        from backend.app.extensions import register_model_safely
        
        # 기존 메타데이터 완전 정리
        tables_to_remove = []
        for table_name in list(db.metadata.tables.keys()):
            if table_name in ['users', 'friendships', 'refresh_tokens', 'revoked_tokens']:
                tables_to_remove.append(table_name)
        
        for table_name in tables_to_remove:
            print(f"[DEBUG] 기존 {table_name} 테이블 제거 중...")
            db.metadata.remove(db.metadata.tables[table_name])
        
        from backend.auth.models import User, Friendship, RefreshToken, RevokedToken
        info("인증 모델을 불러왔습니다.")
        
        # 안전한 모델 등록
        register_model_safely(User)
        register_model_safely(Friendship)
        register_model_safely(RefreshToken)
        register_model_safely(RevokedToken)
        
        print(f"[DEBUG] 메타데이터 상태 (User import 후): {list(db.metadata.tables.keys())}")
        print(f"[DEBUG] User 테이블 정보: {db.metadata.tables.get('users')}")
        print(f"[DEBUG] User 모델: {User}")
        print(f"[DEBUG] Friendship 모델: {Friendship}")
        
        # 모든 모델을 메타데이터에 등록 (한 번만)
        # import만으로도 메타데이터에 자동 등록되므로 db.create_all() 제거
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
        DatabaseOptimizer.setup_optimization(app)
        print("[SUCCESS] 데이터베이스 최적화 도구가 성공적으로 설정되었습니다.")
        print("   - 인덱스 최적화")
        print("   - 쿼리 성능 분석")
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

    # Render 환경에서 PostgreSQL 스키마 수정 (데이터베이스 초기화 전에 실행)
    database_url = os.getenv('DATABASE_URL', '')
    is_render = os.getenv('RENDER') or database_url.startswith('postgresql://')
    
    if is_render:
        print("🔧 Render 환경 감지: PostgreSQL 스키마 수정을 시작합니다...")
        try:
            # PostgreSQL 스키마 수정 함수
            def fix_postgresql_schema():
                """PostgreSQL 데이터베이스 스키마를 수정합니다."""
                try:
                    import psycopg2  # type: ignore
                    from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT  # type: ignore
                    
                    print("🔧 PostgreSQL 스키마 수정을 시작합니다...")
                    
                    conn = None
                    try:
                        conn = psycopg2.connect(database_url)
                        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
                        cur = conn.cursor()
                        print("✅ PostgreSQL 데이터베이스 연결 성공")

                        # users 테이블에 password_hash 관련 컬럼 추가
                        print("🔧 users 테이블 스키마를 확인하고 필요한 컬럼을 추가합니다...")
                        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'")
                        existing_columns = [row[0] for row in cur.fetchall()]

                        columns_to_add = {
                            'password_hash': 'VARCHAR(255)',
                            'last_password_change': 'TIMESTAMP WITHOUT TIME ZONE',
                            'failed_login_attempts': 'INTEGER DEFAULT 0',
                            'account_locked_until': 'TIMESTAMP WITHOUT TIME ZONE'
                        }

                        for col_name, col_type in columns_to_add.items():
                            if col_name not in existing_columns:
                                try:
                                    alter_sql = f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"
                                    cur.execute(alter_sql)
                                    print(f"  ✅ users 테이블에 '{col_name}' 컬럼 추가 완료.")
                                except Exception as e:
                                    print(f"  ⚠️ users 테이블에 '{col_name}' 컬럼 추가 실패: {e}")
                            else:
                                print(f"  ℹ️ users 테이블에 '{col_name}' 컬럼이 이미 존재합니다.")
                        
                        # inquiries 테이블이 없으면 생성
                        print("🔧 inquiries 테이블 존재 여부를 확인합니다...")
                        cur.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'inquiries')")
                        inquiries_exists = cur.fetchone()[0]

                        if not inquiries_exists:
                            print("  ℹ️ inquiries 테이블이 존재하지 않아 생성합니다...")
                            cur.execute("""
                                CREATE TABLE inquiries (
                                    id SERIAL PRIMARY KEY,
                                    user_id INTEGER REFERENCES users(id),
                                    name VARCHAR(100) NOT NULL,
                                    email VARCHAR(120) NOT NULL,
                                    subject VARCHAR(200) NOT NULL,
                                    message TEXT NOT NULL,
                                    status VARCHAR(20) DEFAULT 'pending',
                                    priority VARCHAR(20) DEFAULT 'normal',
                                    category VARCHAR(50) DEFAULT 'general',
                                    answer TEXT,
                                    answered_by VARCHAR(100),
                                    answered_at TIMESTAMP WITHOUT TIME ZONE,
                                    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                                    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
                                )
                            """)
                            print("  ✅ inquiries 테이블 생성 완료.")
                        else:
                            print("  ℹ️ inquiries 테이블이 이미 존재합니다.")

                        print("🎉 PostgreSQL 스키마 수정이 완료되었습니다!")
                        return True

                    except Exception as e:
                        print(f"❌ PostgreSQL 스키마 수정 실패: {e}")
                        return False
                    finally:
                        if conn:
                            cur.close()
                            conn.close()
                            print("데이터베이스 연결 종료.")

                except ImportError:
                    print("⚠️ psycopg2가 설치되지 않았습니다. PostgreSQL 스키마 수정을 건너뜁니다.")
                    return False
                except Exception as e:
                    print(f"⚠️ PostgreSQL 스키마 수정 중 오류 발생: {e}")
                    return False
            
            # 스키마 수정 실행
            fix_postgresql_schema()
            
        except Exception as e:
            print(f"⚠️ PostgreSQL 스키마 수정 중 오류 발생: {e}")
            print("앱을 계속 실행합니다.")
    else:
        print("ℹ️ 로컬 환경: PostgreSQL 스키마 수정을 건너뜁니다.")

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

    # Blueprint 등록
    try:
        from backend.routes.auth import auth_bp
        app.register_blueprint(auth_bp)
        print("[SUCCESS] 인증 Blueprint 등록 성공")
    except Exception as e:
        print(f"[ERROR] 인증 Blueprint 등록 실패: {e}")

    try:
        from backend.routes.schedules import schedules_bp
        app.register_blueprint(schedules_bp)
        print("[SUCCESS] 일정 관리 Blueprint 등록 성공")
    except Exception as e:
        print(f"[ERROR] 일정 관리 Blueprint 등록 실패: {e}")

    try:
        from backend.routes.proposals import proposals_bp
        app.register_blueprint(proposals_bp)
        print("[SUCCESS] 제안 관리 Blueprint 등록 성공")
    except Exception as e:
        print(f"[ERROR] 제안 관리 Blueprint 등록 실패: {e}")

    try:
        from backend.routes.restaurants import restaurants_bp
        app.register_blueprint(restaurants_bp, url_prefix='/api')
        print("[SUCCESS] 식당 관리 Blueprint 등록 성공")
    except Exception as e:
        print(f"[ERROR] 식당 관리 Blueprint 등록 실패: {e}")

    try:
        from backend.routes.parties import parties_bp
        app.register_blueprint(parties_bp, url_prefix='/api')
        print("[SUCCESS] 파티 관리 Blueprint 등록 성공")
    except Exception as e:
        print(f"[ERROR] 파티 관리 Blueprint 등록 실패: {e}")

    try:
        from backend.routes.users import users_bp
        app.register_blueprint(users_bp, url_prefix='/api')
        print("[SUCCESS] 사용자 관리 Blueprint 등록 성공")
    except Exception as e:
        print(f"[ERROR] 사용자 관리 Blueprint 등록 실패: {e}")

    try:
        from backend.routes.chats import chats_bp
        app.register_blueprint(chats_bp, url_prefix='/api')
        print("[SUCCESS] 채팅 관리 Blueprint 등록 성공")
    except Exception as e:
        print(f"[ERROR] 채팅 관리 Blueprint 등록 실패: {e}")

    try:
        from backend.routes.voting import voting_bp
        app.register_blueprint(voting_bp, url_prefix='/api')
        print("[SUCCESS] 투표 관리 Blueprint 등록 성공")
    except Exception as e:
        print(f"[ERROR] 투표 관리 Blueprint 등록 실패: {e}")

    try:
        from backend.routes.matching import matching_bp
        app.register_blueprint(matching_bp, url_prefix='/api')
        print("[SUCCESS] 매칭 관리 Blueprint 등록 성공")
    except Exception as e:
        print(f"[ERROR] 매칭 관리 Blueprint 등록 실패: {e}")

    try:
        from backend.api.inquiries import inquiries_bp
        app.register_blueprint(inquiries_bp)
        print("[SUCCESS] 문의사항 관리 Blueprint 등록 성공")
    except Exception as e:
        print(f"[ERROR] 문의사항 관리 Blueprint 등록 실패: {e}")

    # 개발용 API는 제거됨 - 프로덕션 환경으로 전환
    print("[INFO] 프로덕션 환경: 개발용 API Blueprint 제거됨")

    print("[SUCCESS] 모든 Blueprint 등록 완료")

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

