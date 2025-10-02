#!/usr/bin/env python3
"""
런타임 검증형 설정 관리
pydantic-settings를 사용한 계층적 설정 시스템입니다.
"""

from pydantic import BaseSettings, Field, validator, root_validator
from typing import Any
import os
from enum import Enum


class Environment(str, Enum):
    """환경 타입"""
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"
    TESTING = "testing"


class DatabaseSettings(BaseSettings):
    """데이터베이스 설정"""

    url: str = Field(..., description="데이터베이스 URL")
    pool_size: int = Field(10, description="연결 풀 크기")
    max_overflow: int = Field(20, description="최대 오버플로우")
    echo: bool = Field(False, description="SQL 로깅 여부")
    echo_pool: bool = Field(False, description="연결 풀 로깅 여부")
    pool_pre_ping: bool = Field(True, description="연결 전 핑 테스트")
    pool_recycle: int = Field(3600, description="연결 재활용 시간(초)")

    @validator('url')
    def validate_url(cls, v):
        if not v or v == 'sqlite:///:memory:':
            raise ValueError("프로덕션에서는 유효한 DB URL이 필요합니다")
        return v

    @validator('pool_size')
    def validate_pool_size(cls, v):
        if v < 1 or v > 100:
            raise ValueError("연결 풀 크기는 1-100 사이여야 합니다")
        return v

    class Config:
        env_prefix = "DB_"


class SecuritySettings(BaseSettings):
    """보안 설정"""

    jwt_secret: str = Field(..., description="JWT 시크릿 키")
    jwt_expiry_hours: int = Field(24, description="JWT 만료 시간")
    jwt_algorithm: str = Field("HS256", description="JWT 알고리즘")
    bcrypt_rounds: int = Field(12, description="BCrypt 라운드")
    allowed_origins: list[str] = Field(default_factory=list, description="허용된 오리진")
    cors_origins: list[str] = Field(default_factory=list, description="CORS 오리진")
    session_timeout_minutes: int = Field(30, description="세션 타임아웃(분)")

    @validator('jwt_secret')
    def validate_jwt_secret(cls, v):
        if len(v) < 32:
            raise ValueError("JWT 시크릿은 최소 32자 이상이어야 합니다")
        if v in ['dev-secret', 'test-secret', 'your-secret-key', 'secret']:
            raise ValueError("기본값이나 약한 시크릿은 사용할 수 없습니다")
        return v

    @validator('jwt_expiry_hours')
    def validate_jwt_expiry(cls, v):
        if v < 1 or v > 168:  # 1시간 ~ 7일
            raise ValueError("JWT 만료 시간은 1-168시간 사이여야 합니다")
        return v

    @validator('bcrypt_rounds')
    def validate_bcrypt_rounds(cls, v):
        if v < 10 or v > 15:
            raise ValueError("BCrypt 라운드는 10-15 사이여야 합니다")
        return v

    class Config:
        env_prefix = "SECURITY_"


class RedisSettings(BaseSettings):
    """Redis 설정"""

    host: str = Field("localhost", description="Redis 호스트")
    port: int = Field(6379, description="Redis 포트")
    password: str | None = Field(None, description="Redis 비밀번호")
    db: int = Field(0, description="Redis 데이터베이스 번호")
    max_connections: int = Field(20, description="최대 연결 수")
    socket_timeout: int = Field(5, description="소켓 타임아웃(초)")
    socket_connect_timeout: int = Field(5, description="소켓 연결 타임아웃(초)")
    retry_on_timeout: bool = Field(True, description="타임아웃 시 재시도")

    @validator('port')
    def validate_port(cls, v):
        if v < 1 or v > 65535:
            raise ValueError("포트 번호는 1-65535 사이여야 합니다")
        return v

    class Config:
        env_prefix = "REDIS_"


class LoggingSettings(BaseSettings):
    """로깅 설정"""

    level: str = Field("INFO", description="로그 레벨")
    format: str = Field("json", description="로그 형식 (json/text)")
    file_path: str | None = Field(None, description="로그 파일 경로")
    max_file_size: int = Field(10485760, description="최대 파일 크기(바이트)")  # 10MB
    backup_count: int = Field(5, description="백업 파일 수")
    enable_console: bool = Field(True, description="콘솔 로그 활성화")
    enable_file: bool = Field(False, description="파일 로그 활성화")

    @validator('level')
    def validate_level(cls, v):
        valid_levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']
        if v.upper() not in valid_levels:
            raise ValueError(f"로그 레벨은 {valid_levels} 중 하나여야 합니다")
        return v.upper()

    @validator('format')
    def validate_format(cls, v):
        valid_formats = ['json', 'text']
        if v not in valid_formats:
            raise ValueError("로그 형식은 json 또는 text여야 합니다")
        return v

    class Config:
        env_prefix = "LOG_"


class MonitoringSettings(BaseSettings):
    """모니터링 설정"""

    enable_metrics: bool = Field(True, description="메트릭 수집 활성화")
    metrics_port: int = Field(9090, description="메트릭 포트")
    enable_tracing: bool = Field(False, description="추적 활성화")
    tracing_endpoint: str | None = Field(None, description="추적 엔드포인트")
    enable_health_checks: bool = Field(True, description="헬스 체크 활성화")
    health_check_interval: int = Field(30, description="헬스 체크 간격(초)")

    @validator('metrics_port')
    def validate_metrics_port(cls, v):
        if v < 1 or v > 65535:
            raise ValueError("메트릭 포트는 1-65535 사이여야 합니다")
        return v

    class Config:
        env_prefix = "MONITORING_"


class FeatureFlags(BaseSettings):
    """기능 플래그 설정"""

    enable_redis: bool = Field(False, description="Redis 활성화")
    enable_celery: bool = Field(False, description="Celery 활성화")
    enable_websockets: bool = Field(True, description="WebSocket 활성화")
    enable_dev_tokens: bool = Field(False, description="개발 토큰 활성화")
    enable_debug_mode: bool = Field(False, description="디버그 모드 활성화")
    enable_api_docs: bool = Field(True, description="API 문서 활성화")
    enable_rate_limiting: bool = Field(True, description="속도 제한 활성화")

    class Config:
        env_prefix = "FEATURE_"


class AppSettings(BaseSettings):
    """애플리케이션 전체 설정"""

    environment: Environment = Field(Environment.DEVELOPMENT, description="실행 환경")
    debug: bool = Field(False, description="디버그 모드")
    secret_key: str = Field(..., description="Flask 시크릿 키")
    app_name: str = Field("Lunch App", description="애플리케이션 이름")
    app_version: str = Field("1.0.0", description="애플리케이션 버전")

    # 하위 설정들
    database: DatabaseSettings = Field(default_factory=DatabaseSettings)
    security: SecuritySettings = Field(default_factory=SecuritySettings)
    redis: RedisSettings = Field(default_factory=RedisSettings)
    logging: LoggingSettings = Field(default_factory=LoggingSettings)
    monitoring: MonitoringSettings = Field(default_factory=MonitoringSettings)
    features: FeatureFlags = Field(default_factory=FeatureFlags)

    class Config:
        env_file = ".env"
        env_nested_delimiter = "__"
        case_sensitive = False

    @validator('environment')
    def validate_environment(cls, v):
        if v not in Environment:
            raise ValueError("환경은 development, staging, production, testing 중 하나여야 합니다")
        return v

    @validator('secret_key')
    def validate_secret_key(cls, v):
        if len(v) < 32:
            raise ValueError("시크릿 키는 최소 32자 이상이어야 합니다")
        if v in ['dev-secret', 'test-secret', 'your-secret-key', 'secret']:
            raise ValueError("기본값이나 약한 시크릿은 사용할 수 없습니다")
        return v

    @root_validator
    def validate_production_settings(cls, values):
        """프로덕션 환경 설정 검증"""
        environment = values.get('environment')

        if environment == Environment.PRODUCTION:
            # 프로덕션에서는 디버그 모드 비활성화
            if values.get('debug'):
                raise ValueError("프로덕션에서는 디버그 모드를 활성화할 수 없습니다")

            # 프로덕션에서는 개발 토큰 비활성화
            if values.get('features', {}).get('enable_dev_tokens'):
                raise ValueError("프로덕션에서는 개발 토큰을 활성화할 수 없습니다")

            # 프로덕션에서는 API 문서 비활성화 권장
            if values.get('features', {}).get('enable_api_docs'):
                print("⚠️ 경고: 프로덕션에서 API 문서가 활성화되어 있습니다")

        return values

    def is_development(self) -> bool:
        """개발 환경 여부"""
        return self.environment == Environment.DEVELOPMENT

    def is_production(self) -> bool:
        """프로덕션 환경 여부"""
        return self.environment == Environment.PRODUCTION

    def is_testing(self) -> bool:
        """테스트 환경 여부"""
        return self.environment == Environment.TESTING


# 전역 설정 인스턴스
_settings: AppSettings | None = None


def get_settings() -> AppSettings:
    """설정 인스턴스 반환 - 싱글톤 패턴"""
    global _settings

    if _settings is None:
        _settings = _create_settings()

    return _settings


def _create_settings() -> AppSettings:
    """설정 인스턴스 생성"""
    try:
        settings = AppSettings()
        print(f"✅ 설정 로드 완료: {settings.environment} 환경")
        return settings

    except Exception as e:
        print(f"❌ 설정 검증 실패: {e}")

        if os.getenv('FLASK_ENV') == 'production':
            raise RuntimeError(f"프로덕션 설정 오류: {e}")
        else:
            print("⚠️ 개발 환경에서 기본값 사용")
            return _create_development_settings()


def _create_development_settings() -> AppSettings:
    """개발 환경 기본 설정"""
    return AppSettings(
        environment=Environment.DEVELOPMENT,
        debug=True,
        secret_key="dev-secret-key-not-for-production-use-only",
        database=DatabaseSettings(
            url="sqlite:///dev.db",
            echo=True
        ),
        security=SecuritySettings(
            jwt_secret="dev-jwt-secret-key-not-for-production-use-only-32-chars",
            jwt_expiry_hours=24,
            bcrypt_rounds=10,
            allowed_origins=["*"]
        ),
        features=FeatureFlags(
            enable_dev_tokens=True,
            enable_debug_mode=True,
            enable_api_docs=True
        )
    )


def reload_settings() -> AppSettings:
    """설정 재로드"""
    global _settings
    _settings = None
    return get_settings()


# 환경별 설정 팩토리
def create_development_settings() -> AppSettings:
    """개발 환경 설정 생성"""
    return _create_development_settings()


def create_testing_settings() -> AppSettings:
    """테스트 환경 설정 생성"""
    return AppSettings(
        environment=Environment.TESTING,
        debug=False,
        secret_key="test-secret-key-for-testing-only-32-chars",
        database=DatabaseSettings(
            url="sqlite:///:memory:",
            echo=False
        ),
        security=SecuritySettings(
            jwt_secret="test-jwt-secret-key-for-testing-only-32-chars",
            jwt_expiry_hours=1,
            bcrypt_rounds=4  # 테스트에서는 빠른 해싱
        ),
        features=FeatureFlags(
            enable_redis=False,
            enable_celery=False,
            enable_dev_tokens=True
        )
    )


def create_production_settings() -> AppSettings:
    """프로덕션 환경 설정 생성 - 환경변수에서만 로드"""
    return AppSettings()


# 설정 검증 함수
def validate_settings() -> dict[str, Any]:
    """설정 검증 결과 반환"""
    settings = get_settings()

    validation_results = {
        'is_valid': True,
        'errors': [],
        'warnings': [],
        'environment': settings.environment.value,
        'checks': {}
    }

    # 데이터베이스 설정 검증
    try:
        db_settings = settings.database
        validation_results['checks']['database'] = {
            'url_valid': bool(db_settings.url and db_settings.url != 'sqlite:///:memory:'),
            'pool_size_valid': 1 <= db_settings.pool_size <= 100,
            'echo_enabled': db_settings.echo
        }
    except Exception as e:
        validation_results['errors'].append(f"Database settings error: {e}")
        validation_results['is_valid'] = False

    # 보안 설정 검증
    try:
        security_settings = settings.security
        validation_results['checks']['security'] = {
            'jwt_secret_strong': len(security_settings.jwt_secret) >= 32,
            'jwt_expiry_reasonable': 1 <= security_settings.jwt_expiry_hours <= 168,
            'bcrypt_rounds_safe': 10 <= security_settings.bcrypt_rounds <= 15
        }
    except Exception as e:
        validation_results['errors'].append(f"Security settings error: {e}")
        validation_results['is_valid'] = False

    # 프로덕션 환경 특별 검증
    if settings.is_production():
        if settings.debug:
            validation_results['errors'].append("Production debug mode is enabled")
            validation_results['is_valid'] = False

        if settings.features.enable_dev_tokens:
            validation_results['errors'].append("Production dev tokens are enabled")
            validation_results['is_valid'] = False

    return validation_results


if __name__ == "__main__":
    # 설정 테스트
    settings = get_settings()
    print(f"환경: {settings.environment}")
    print(f"디버그: {settings.debug}")
    print(f"데이터베이스 URL: {settings.database.url}")

    # 설정 검증
    validation = validate_settings()
    print(f"설정 유효성: {validation['is_valid']}")
    if validation['errors']:
        print(f"오류: {validation['errors']}")
    if validation['warnings']:
        print(f"경고: {validation['warnings']}")
