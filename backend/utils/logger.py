"""
구조화된 로깅 시스템
개발 및 디버깅에 유용한 로깅 기능을 제공합니다.
"""

import logging
import json
import os
import sys
from datetime import datetime
from typing import Any, Dict, Optional
from functools import wraps

class ColoredFormatter(logging.Formatter):
    """컬러 로그 포맷터 (터미널에서 보기 좋게)"""
    
    # ANSI 컬러 코드
    COLORS = {
        'DEBUG': '\033[36m',    # 청록색
        'INFO': '\033[32m',     # 초록색
        'WARNING': '\033[33m',  # 노란색
        'ERROR': '\033[31m',    # 빨간색
        'CRITICAL': '\033[35m', # 자주색
        'RESET': '\033[0m'      # 리셋
    }
    
    def format(self, record):
        # 컬러 적용
        if hasattr(record, 'levelname'):
            color = self.COLORS.get(record.levelname, self.COLORS['RESET'])
            record.levelname = f"{color}{record.levelname}{self.COLORS['RESET']}"
        
        return super().format(record)

class StructuredLogger:
    """구조화된 로거"""
    
    def __init__(self, name: str = 'lunch_app'):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(logging.DEBUG)
        
        # 핸들러가 이미 있으면 제거 (중복 방지)
        if self.logger.handlers:
            self.logger.handlers.clear()
        
        self._setup_handlers()
    
    def _setup_handlers(self):
        """로그 핸들러 설정"""
        
        # 1. 콘솔 핸들러 (개발용 - 컬러)
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.INFO)
        
        # 개발 환경에서는 컬러 포맷터 사용
        if os.getenv('FLASK_ENV') == 'development':
            console_format = ColoredFormatter(
                '%(asctime)s | %(levelname)s | %(name)s | %(message)s',
                datefmt='%H:%M:%S'
            )
        else:
            console_format = logging.Formatter(
                '%(asctime)s | %(levelname)s | %(name)s | %(message)s',
                datefmt='%Y-%m-%d %H:%M:%S'
            )
        
        console_handler.setFormatter(console_format)
        self.logger.addHandler(console_handler)
        
        # 2. 파일 핸들러 (구조화된 JSON 로그)
        if not os.path.exists('logs'):
            os.makedirs('logs')
        
        file_handler = logging.FileHandler('logs/app.log', encoding='utf-8')
        file_handler.setLevel(logging.DEBUG)
        
        # JSON 포맷터
        json_formatter = JSONFormatter()
        file_handler.setFormatter(json_formatter)
        self.logger.addHandler(file_handler)
        
        # 3. 에러 전용 파일 핸들러
        error_handler = logging.FileHandler('logs/error.log', encoding='utf-8')
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(json_formatter)
        self.logger.addHandler(error_handler)
    
    def debug(self, message: str, **kwargs):
        """디버그 로그"""
        self._log('DEBUG', message, **kwargs)
    
    def info(self, message: str, **kwargs):
        """정보 로그"""
        self._log('INFO', message, **kwargs)
    
    def warning(self, message: str, **kwargs):
        """경고 로그"""
        self._log('WARNING', message, **kwargs)
    
    def error(self, message: str, **kwargs):
        """에러 로그"""
        self._log('ERROR', message, **kwargs)
    
    def critical(self, message: str, **kwargs):
        """치명적 에러 로그"""
        self._log('CRITICAL', message, **kwargs)
    
    def _log(self, level: str, message: str, **kwargs):
        """내부 로그 메서드"""
        extra = {
            'context': kwargs,
            'timestamp': datetime.now().isoformat(),
            'level': level
        }
        
        getattr(self.logger, level.lower())(message, extra=extra)
    
    # 편의 메서드들
    def api_call(self, method: str, endpoint: str, status_code: int, duration: float = None, **kwargs):
        """API 호출 로그"""
        self.info(f"API {method} {endpoint} - {status_code}", 
                 method=method, endpoint=endpoint, status_code=status_code, 
                 duration=duration, **kwargs)
    
    def db_query(self, query: str, duration: float = None, **kwargs):
        """데이터베이스 쿼리 로그"""
        self.debug(f"DB Query: {query[:100]}...", 
                  query=query, duration=duration, **kwargs)
    
    def user_action(self, user_id: str, action: str, **kwargs):
        """사용자 액션 로그"""
        self.info(f"User {user_id} performed {action}", 
                 user_id=user_id, action=action, **kwargs)
    
    def performance(self, operation: str, duration: float, **kwargs):
        """성능 로그"""
        self.info(f"Performance: {operation} took {duration:.3f}s", 
                 operation=operation, duration=duration, **kwargs)

class JSONFormatter(logging.Formatter):
    """JSON 형태의 로그 포맷터"""
    
    def format(self, record):
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno
        }
        
        # 추가 컨텍스트 정보
        if hasattr(record, 'context'):
            log_entry.update(record.context)
        
        # 예외 정보
        if record.exc_info:
            log_entry['exception'] = self.formatException(record.exc_info)
        
        return json.dumps(log_entry, ensure_ascii=False, default=str)

# 전역 로거 인스턴스
logger = StructuredLogger()

# 데코레이터들
def log_function_call(func):
    """함수 호출 로그 데코레이터"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = datetime.now()
        logger.debug(f"Calling {func.__name__}", 
                    function=func.__name__, 
                    args=str(args)[:100], 
                    kwargs=str(kwargs)[:100])
        
        try:
            result = func(*args, **kwargs)
            duration = (datetime.now() - start_time).total_seconds()
            logger.debug(f"Completed {func.__name__}", 
                        function=func.__name__, 
                        duration=duration)
            return result
        except Exception as e:
            duration = (datetime.now() - start_time).total_seconds()
            logger.error(f"Error in {func.__name__}: {str(e)}", 
                        function=func.__name__, 
                        error=str(e), 
                        duration=duration)
            raise
    
    return wrapper

def log_api_call(func):
    """API 호출 로그 데코레이터"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        from flask import request
        
        start_time = datetime.now()
        method = request.method
        endpoint = request.endpoint or request.path
        
        logger.info(f"API Request: {method} {endpoint}", 
                   method=method, endpoint=endpoint)
        
        try:
            result = func(*args, **kwargs)
            duration = (datetime.now() - start_time).total_seconds()
            
            # 응답 상태 코드 추출
            status_code = 200
            if hasattr(result, 'status_code'):
                status_code = result.status_code
            elif isinstance(result, tuple) and len(result) > 1:
                status_code = result[1]
            
            logger.api_call(method, endpoint, status_code, duration)
            return result
            
        except Exception as e:
            duration = (datetime.now() - start_time).total_seconds()
            logger.error(f"API Error: {method} {endpoint} - {str(e)}", 
                        method=method, endpoint=endpoint, 
                        error=str(e), duration=duration)
            raise
    
    return wrapper

# 편의 함수들
def log_startup():
    """앱 시작 로그"""
    logger.info("🚀 Lunch App 서버 시작", 
               version="1.0.0", 
               environment=os.getenv('FLASK_ENV', 'development'))

def log_shutdown():
    """앱 종료 로그"""
    logger.info("🛑 Lunch App 서버 종료")

def log_error_with_context(error: Exception, context: str = "", **kwargs):
    """컨텍스트와 함께 에러 로그"""
    logger.error(f"Error in {context}: {str(error)}", 
                error=str(error), 
                error_type=type(error).__name__, 
                context=context, 
                **kwargs)

# 성능 모니터링
class PerformanceMonitor:
    """성능 모니터링 클래스"""
    
    def __init__(self):
        self.timers = {}
    
    def start_timer(self, name: str):
        """타이머 시작"""
        self.timers[name] = datetime.now()
    
    def end_timer(self, name: str) -> float:
        """타이머 종료 및 지속시간 반환"""
        if name not in self.timers:
            logger.warning(f"Timer '{name}' was not started")
            return 0
        
        duration = (datetime.now() - self.timers[name]).total_seconds()
        logger.performance(name, duration)
        del self.timers[name]
        return duration
    
    def time_it(self, name: str):
        """컨텍스트 매니저로 사용"""
        return TimerContext(self, name)

class TimerContext:
    """타이머 컨텍스트 매니저"""
    
    def __init__(self, monitor: PerformanceMonitor, name: str):
        self.monitor = monitor
        self.name = name
    
    def __enter__(self):
        self.monitor.start_timer(self.name)
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.monitor.end_timer(self.name)

# 전역 성능 모니터
performance_monitor = PerformanceMonitor()

# 편의 함수
def time_it(name: str):
    """성능 측정 데코레이터"""
    return performance_monitor.time_it(name)

# 로그 레벨 설정 함수
def set_log_level(level: str):
    """로그 레벨 설정"""
    numeric_level = getattr(logging, level.upper(), logging.INFO)
    logger.logger.setLevel(numeric_level)
    logger.info(f"Log level set to {level.upper()}")

# 개발용 로그 필터
def enable_debug_logging():
    """디버그 로깅 활성화"""
    set_log_level('DEBUG')
    logger.info("[DEBUG] Debug logging enabled")

def disable_debug_logging():
    """디버그 로깅 비활성화"""
    set_log_level('INFO')
    logger.info("[INFO] Debug logging disabled")

# 환경변수에서 로그 레벨 읽기
if os.getenv('LOG_LEVEL'):
    set_log_level(os.getenv('LOG_LEVEL'))

# 개발 환경에서는 디버그 로깅 활성화
if os.getenv('FLASK_ENV') == 'development':
    enable_debug_logging()

# 모듈 export
__all__ = [
    'logger', 'log_function_call', 'log_api_call', 
    'log_startup', 'log_shutdown', 'log_error_with_context',
    'performance_monitor', 'time_it', 'set_log_level',
    'enable_debug_logging', 'disable_debug_logging'
]
