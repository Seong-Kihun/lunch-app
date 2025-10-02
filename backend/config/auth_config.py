import os
from datetime import timedelta
from .env_loader import get_env_var

class AuthConfig:
    """인증 시스템 설정"""
    
    # JWT 토큰 설정 - 보안 강화
    JWT_SECRET_KEY = get_env_var('JWT_SECRET_KEY', 'dev-jwt-secret-key-change-in-production')
    
    @classmethod
    def validate_jwt_secret(cls):
        """JWT 보안 키 유효성 검사 (프로덕션에서 하드 실패)"""
        # 프로덕션 환경에서 기본값 사용 시 즉시 실패
        if os.getenv('FLASK_ENV') == 'production':
            if (cls.JWT_SECRET_KEY == 'dev-jwt-secret-key-change-in-production' or 
                cls.JWT_SECRET_KEY == 'your-jwt-secret-key-here' or
                len(cls.JWT_SECRET_KEY) < 32):
                raise ValueError(
                    "🚨 프로덕션 보안 위험: JWT_SECRET_KEY가 기본값이거나 너무 짧습니다! "
                    "반드시 강력한 환경변수를 설정하세요."
                )
        else:
            if cls.JWT_SECRET_KEY == 'dev-jwt-secret-key-change-in-production':
                print("[WARNING] 개발 환경에서 기본 JWT_SECRET_KEY를 사용합니다. 프로덕션에서는 환경변수를 설정하세요!")
    
    @classmethod
    def validate_production_secrets(cls):
        """프로덕션 환경 보안 검증 (하드 실패)"""
        if os.getenv('FLASK_ENV') == 'production':
            # SECRET_KEY 검증
            if (cls.SECRET_KEY == 'dev-flask-secret-key-change-in-production' or
                cls.SECRET_KEY == 'your-secret-key-here' or
                len(cls.SECRET_KEY) < 32):
                raise ValueError(
                    "🚨 프로덕션 보안 위험: SECRET_KEY가 기본값이거나 너무 짧습니다! "
                    "반드시 강력한 환경변수를 설정하세요."
                )
            
            # 이메일 설정 검증
            if not cls.MAIL_USERNAME or cls.MAIL_USERNAME == 'your-gmail-username-here':
                print("[WARNING] 이메일 기능이 비활성화됩니다. MAIL_USERNAME을 설정하세요.")
            
            if not cls.MAIL_PASSWORD or cls.MAIL_PASSWORD == 'your-gmail-app-password-here':
                print("[WARNING] 이메일 기능이 비활성화됩니다. MAIL_PASSWORD를 설정하세요.")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)  # 1일
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=365)  # 1년
    
    
    # 이메일 설정 (Gmail)
    MAIL_SERVER = 'smtp.gmail.com'  # Gmail 서버
    MAIL_PORT = 587
    MAIL_USE_TLS = True
    MAIL_USERNAME = get_env_var('MAIL_USERNAME', '')  # 환경변수에서 로드
    MAIL_PASSWORD = get_env_var('MAIL_PASSWORD', '')  # 환경변수에서 로드
    
    # 문의사항 수신 이메일 주소
    INQUIRY_EMAIL = get_env_var('INQUIRY_EMAIL', 'kihun.seong.official@gmail.com')
    
    # 앱 설정
    APP_NAME = '밥플떼기'
    APP_DOMAIN = get_env_var('APP_DOMAIN', 'https://api.bal-plateggi.com')
    FRONTEND_DOMAIN = get_env_var('FRONTEND_DOMAIN', 'https://app.bal-plateggi.com')
    
    # 딥링크 설정
    DEEP_LINK_SCHEME = 'balplateggi'
    UNIVERSAL_LINK_DOMAIN = 'api.bal-plateggi.com'
    
    # 보안 설정
    PASSWORD_SALT_ROUNDS = 12
    MAX_LOGIN_ATTEMPTS = 5
    LOCKOUT_DURATION = timedelta(minutes=15)
    
    # 데이터베이스 설정
    DB_CONNECTION_STRING = get_env_var('DATABASE_URL', 'sqlite:///site.db')
    
    
    @classmethod
    def get_deep_link_url(cls, action, **params):
        """딥링크 URL 생성"""
        param_string = '&'.join([f"{k}={v}" for k, v in params.items()])
        return f"{cls.DEEP_LINK_SCHEME}://{action}?{param_string}"
