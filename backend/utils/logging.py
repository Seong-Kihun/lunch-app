"""
로깅 시스템 일원화
구조화된 로깅과 예외 처리를 위한 통합 로깅 모듈
"""

import logging
import logging.handlers
import os
import sys
from datetime import datetime
from typing import Any
import json


class StructuredFormatter(logging.Formatter):
    """구조화된 JSON 로그 포맷터"""

    def format(self, record):
        log_entry = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno,
        }

        # 예외 정보가 있는 경우 추가
        if record.exc_info:
            log_entry['exception'] = self.formatException(record.exc_info)

        # 추가 컨텍스트 정보가 있는 경우 추가
        if hasattr(record, 'extra_data'):
            log_entry.update(record.extra_data)

        return json.dumps(log_entry, ensure_ascii=False)


class ColoredFormatter(logging.Formatter):
    """개발 환경용 컬러 포맷터"""

    COLORS = {
        'DEBUG': '\033[36m',    # 청록색
        'INFO': '\033[32m',     # 녹색
        'WARNING': '\033[33m',  # 노란색
        'ERROR': '\033[31m',    # 빨간색
        'CRITICAL': '\033[35m', # 자주색
        'RESET': '\033[0m'      # 리셋
    }

    def format(self, record):
        color = self.COLORS.get(record.levelname, self.COLORS['RESET'])
        reset = self.COLORS['RESET']

        record.levelname = f"{color}{record.levelname}{reset}"
        return super().format(record)


def setup_logging(
    log_level: str = None,
    log_file: str = None,
    use_json: bool = None,
    enable_console: bool = True
) -> logging.Logger:
    """
    로깅 시스템 설정
    
    Args:
        log_level: 로그 레벨 (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_file: 로그 파일 경로 (None이면 파일 로깅 비활성화)
        use_json: JSON 포맷 사용 여부 (None이면 환경변수 기반)
        enable_console: 콘솔 로깅 활성화 여부
    
    Returns:
        설정된 루트 로거
    """
    # 환경변수에서 설정 읽기
    log_level = log_level or os.getenv('LOG_LEVEL', 'INFO').upper()
    log_file = log_file or os.getenv('LOG_FILE')
    use_json = use_json if use_json is not None else os.getenv('LOG_FORMAT', 'text').lower() == 'json'

    # 로그 레벨 설정
    numeric_level = getattr(logging, log_level, logging.INFO)

    # 루트 로거 설정
    root_logger = logging.getLogger()
    root_logger.setLevel(numeric_level)

    # 기존 핸들러 제거
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    # 포맷터 설정
    if use_json:
        formatter = StructuredFormatter()
    else:
        if os.getenv('FLASK_ENV') == 'development':
            formatter = ColoredFormatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
        else:
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )

    # 콘솔 핸들러
    if enable_console:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(numeric_level)
        console_handler.setFormatter(formatter)
        root_logger.addHandler(console_handler)

    # 파일 핸들러
    if log_file:
        # 로그 디렉토리 생성
        log_dir = os.path.dirname(log_file)
        if log_dir and not os.path.exists(log_dir):
            os.makedirs(log_dir)

        # 로테이팅 파일 핸들러
        file_handler = logging.handlers.RotatingFileHandler(
            log_file,
            maxBytes=10*1024*1024,  # 10MB
            backupCount=5
        )
        file_handler.setLevel(numeric_level)
        file_handler.setFormatter(formatter)
        root_logger.addHandler(file_handler)

    return root_logger


def get_logger(name: str) -> logging.Logger:
    """지정된 이름의 로거 반환"""
    return logging.getLogger(name)


def log_with_context(
    logger: logging.Logger,
    level: int,
    message: str,
    extra_data: dict[str, Any] | None = None,
    exc_info: bool = False
):
    """컨텍스트 정보와 함께 로그 기록"""
    if extra_data:
        logger.log(level, message, extra={'extra_data': extra_data}, exc_info=exc_info)
    else:
        logger.log(level, message, exc_info=exc_info)


def log_api_request(
    logger: logging.Logger,
    method: str,
    path: str,
    status_code: int,
    response_time: float,
    user_id: str | None = None,
    ip_address: str | None = None
):
    """API 요청 로그 기록"""
    extra_data = {
        'type': 'api_request',
        'method': method,
        'path': path,
        'status_code': status_code,
        'response_time_ms': round(response_time * 1000, 2),
        'user_id': user_id,
        'ip_address': ip_address
    }
    log_with_context(logger, logging.INFO, f"API {method} {path} - {status_code}", extra_data)


def log_database_operation(
    logger: logging.Logger,
    operation: str,
    table: str,
    duration: float,
    rows_affected: int | None = None
):
    """데이터베이스 작업 로그 기록"""
    extra_data = {
        'type': 'database_operation',
        'operation': operation,
        'table': table,
        'duration_ms': round(duration * 1000, 2),
        'rows_affected': rows_affected
    }
    log_with_context(logger, logging.INFO, f"DB {operation} on {table}", extra_data)


def log_security_event(
    logger: logging.Logger,
    event_type: str,
    description: str,
    user_id: str | None = None,
    ip_address: str | None = None,
    severity: str = 'medium'
):
    """보안 이벤트 로그 기록"""
    extra_data = {
        'type': 'security_event',
        'event_type': event_type,
        'description': description,
        'user_id': user_id,
        'ip_address': ip_address,
        'severity': severity
    }
    log_with_context(logger, logging.WARNING, f"Security: {event_type} - {description}", extra_data)


def log_performance_metric(
    logger: logging.Logger,
    metric_name: str,
    value: float,
    unit: str = 'ms',
    tags: dict[str, str] | None = None
):
    """성능 메트릭 로그 기록"""
    extra_data = {
        'type': 'performance_metric',
        'metric_name': metric_name,
        'value': value,
        'unit': unit,
        'tags': tags or {}
    }
    log_with_context(logger, logging.INFO, f"Performance: {metric_name}={value}{unit}", extra_data)


# 전역 로거 설정
def init_app_logging(app):
    """Flask 앱용 로깅 초기화 (폴백 메커니즘 포함)"""
    try:
        log_level = app.config.get('LOG_LEVEL', 'INFO')
        log_file = app.config.get('LOG_FILE', 'logs/app.log')
        use_json = app.config.get('LOG_FORMAT', 'text').lower() == 'json'

        setup_logging(
            log_level=log_level,
            log_file=log_file,
            use_json=use_json,
            enable_console=True
        )

        # Flask 앱 로거 설정
        app.logger.setLevel(logging.INFO)

        print("[SUCCESS] 고급 로깅 시스템이 초기화되었습니다.")

    except Exception as e:
        # 폴백: 기본 Python 로깅 사용
        print(f"[WARNING] 고급 로깅 시스템 초기화 실패, 기본 로깅으로 폴백: {e}")

        # 기본 로깅 설정
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.StreamHandler(sys.stdout),
                logging.FileHandler('logs/app.log', mode='a')
            ]
        )

        app.logger.setLevel(logging.INFO)
        print("[SUCCESS] 기본 로깅 시스템이 초기화되었습니다.")

    # SQLAlchemy 로깅 설정
    if app.config.get('SQLALCHEMY_ECHO'):
        logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)

    return get_logger('app')


# 편의 함수들
def info(message: str, **kwargs):
    """INFO 레벨 로그"""
    logger = get_logger('app')
    log_with_context(logger, logging.INFO, message, kwargs)


def warning(message: str, **kwargs):
    """WARNING 레벨 로그"""
    logger = get_logger('app')
    log_with_context(logger, logging.WARNING, message, kwargs)


def error(message: str, exc_info: bool = False, **kwargs):
    """ERROR 레벨 로그"""
    logger = get_logger('app')
    log_with_context(logger, logging.ERROR, message, kwargs, exc_info)


def debug(message: str, **kwargs):
    """DEBUG 레벨 로그"""
    logger = get_logger('app')
    log_with_context(logger, logging.DEBUG, message, kwargs)


def critical(message: str, exc_info: bool = False, **kwargs):
    """CRITICAL 레벨 로그"""
    logger = get_logger('app')
    log_with_context(logger, logging.CRITICAL, message, kwargs, exc_info)
