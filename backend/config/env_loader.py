import os
from pathlib import Path
from dotenv import load_dotenv


def load_environment_variables():
    """환경변수를 안전하게 로드"""
    # .env 파일 경로 찾기
    env_paths = [
        Path.cwd() / ".env",
        Path.cwd() / "lunch_app" / ".env",
        Path(__file__).parent.parent / ".env",
        Path(__file__).parent.parent.parent / ".env",
    ]

    # .env 파일이 있으면 로드
    for env_path in env_paths:
        if env_path.exists():
            load_dotenv(env_path)
            print(f"[SUCCESS] 환경변수 파일 로드됨: {env_path}")
            break
    else:
        print("[WARNING] .env 파일을 찾을 수 없습니다. 시스템 환경변수를 사용합니다.")

    # 환경 확인
    is_development = (
        os.getenv("FLASK_ENV") == "development" or 
        os.getenv("ENV") == "development" or
        os.getenv("RENDER_ENVIRONMENT") == "development"
    )
    
    is_render = (
        os.getenv("RENDER") == "true" or 
        "onrender.com" in os.getenv("RENDER_EXTERNAL_URL", "") or
        os.getenv("RENDER_ENVIRONMENT") == "production" or
        "render.com" in os.getenv("RENDER_EXTERNAL_URL", "")
    )

    # 필수 환경변수 확인 및 기본값 설정
    if is_render:
        # Render 환경에서는 PostgreSQL 사용
        required_vars = {
            "JWT_SECRET_KEY": "dev-jwt-secret-key-change-in-production",
            "SECRET_KEY": "dev-flask-secret-key-change-in-production",
            "DATABASE_URL": None,  # Render에서 자동으로 설정됨
            "REDIS_URL": None,  # Render에서는 Redis 사용 안함
            "CELERY_BROKER_URL": None,  # Render에서는 Celery 사용 안함
            "CELERY_RESULT_BACKEND": None,
            "FLASK_ENV": "production",
            "ENV": "production",
        }
    else:
        # 로컬/개발 환경
        current_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(current_dir)
        db_path = os.path.join(project_root, "instance", "lunch_app.db")
        db_url = f"sqlite:///{db_path}"
        
        # 환경별 설정
        env_type = os.getenv('ENV_TYPE', 'development')  # development, testing, production
        
        if env_type == 'testing':
            # 테스트 환경 - 가상 유저 생성 비활성화
            required_vars = {
                "JWT_SECRET_KEY": "test-jwt-secret-key",
                "SECRET_KEY": "test-flask-secret-key",
                "DATABASE_URL": db_url,
                "REDIS_URL": "redis://localhost:6379/0",
                "CELERY_BROKER_URL": "redis://localhost:6379/1",
                "CELERY_RESULT_BACKEND": "redis://localhost:6379/2",
                "FLASK_ENV": "testing",
                "ENV": "testing",
                "CREATE_VIRTUAL_USERS": "false",
                "AUTH_METHOD": "password",
            }
        elif env_type == 'production':
            # 프로덕션 환경 - 가상 유저 생성 비활성화
            required_vars = {
                "JWT_SECRET_KEY": "dev-jwt-secret-key-change-in-production",
                "SECRET_KEY": "dev-flask-secret-key-change-in-production",
                "DATABASE_URL": db_url,
                "REDIS_URL": "redis://localhost:6379/0",
                "CELERY_BROKER_URL": "redis://localhost:6379/1",
                "CELERY_RESULT_BACKEND": "redis://localhost:6379/2",
                "FLASK_ENV": "production",
                "ENV": "production",
                "CREATE_VIRTUAL_USERS": "false",
                "AUTH_METHOD": "password",
            }
        else:
            # 개발 환경 - 가상 유저 생성 비활성화 (실제 테스터 계정 사용)
            required_vars = {
                "JWT_SECRET_KEY": "dev-jwt-secret-key-change-in-production",
                "SECRET_KEY": "dev-flask-secret-key-change-in-production",
                "DATABASE_URL": db_url,
                "REDIS_URL": "redis://localhost:6379/0",
                "CELERY_BROKER_URL": "redis://localhost:6379/1",
                "CELERY_RESULT_BACKEND": "redis://localhost:6379/2",
                "FLASK_ENV": "development",
                "ENV": "development",
                "CREATE_VIRTUAL_USERS": "false",
                "AUTH_METHOD": "password",
            }

    # 환경변수 설정
    for var_name, default_value in required_vars.items():
        if not os.getenv(var_name):
            if default_value is not None:
                os.environ[var_name] = default_value
                print(f"⚠️ {var_name} 환경변수가 설정되지 않아 기본값을 사용합니다.")
            else:
                print(f"ℹ️ {var_name} 환경변수가 설정되지 않았습니다. (해당 기능은 비활성화됩니다)")

    # 개발 환경 확인
    if is_development:
        print("[DEV] 개발 환경으로 실행됩니다.")
    elif is_render:
        print("[RENDER] Render 프로덕션 환경으로 실행됩니다.")
        print("   - Redis 및 Celery 기능은 비활성화됩니다")
        print("   - PostgreSQL 데이터베이스를 사용합니다")
        print("   - 오프라인 모드로 실행됩니다")
    else:
        print("[PROD] 프로덕션 환경으로 실행됩니다.")
        
    # 프로덕션에서는 보안 키가 기본값이면 경고
    if not is_development and os.getenv("JWT_SECRET_KEY") == "dev-jwt-secret-key-change-in-production":
        print("[WARNING] 프로덕션 환경에서 기본 JWT_SECRET_KEY를 사용하고 있습니다!")
    if not is_development and os.getenv("SECRET_KEY") == "dev-flask-secret-key-change-in-production":
        print("[WARNING] 프로덕션 환경에서 기본 SECRET_KEY를 사용하고 있습니다!")


def get_env_var(var_name, default=None, required=False):
    """환경변수를 안전하게 가져오기"""
    value = os.getenv(var_name, default)

    if required and not value:
        raise ValueError(f"필수 환경변수 {var_name}이 설정되지 않았습니다.")

    return value
