import os
from datetime import timedelta
from .env_loader import get_env_var

class AuthConfig:
    """인증 시스템 설정"""
    
    # JWT 토큰 설정 - 보안 강화
    JWT_SECRET_KEY = get_env_var('JWT_SECRET_KEY', 'dev-jwt-secret-key-change-in-production')
    
    @classmethod
    def validate_jwt_secret(cls):
        """JWT 보안 키 유효성 검사"""
        if cls.JWT_SECRET_KEY == 'dev-jwt-secret-key-change-in-production':
            if os.getenv('FLASK_ENV') == 'production':
                raise ValueError("프로덕션 환경에서는 JWT_SECRET_KEY 환경변수를 반드시 설정해야 합니다!")
            else:
                print("[WARNING] 개발 환경에서 기본 JWT_SECRET_KEY를 사용합니다. 프로덕션에서는 환경변수를 설정하세요!")
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
