#!/usr/bin/env python3
"""
통합 모니터링 시스템
구조화된 로깅, 성능 모니터링, 에러 추적을 통합 관리
"""

import os
import time
import json
import uuid
from datetime import datetime, UTC
from typing import Any
from functools import wraps
from flask import request, g
import logging
from logging.handlers import RotatingFileHandler

class UnifiedMonitor:
    """통합 모니터링 시스템"""

    def __init__(self, app=None):
        self.app = app
        self.request_times = {}
        self.error_counts = {}
        self.performance_metrics = {}

        if app:
            self.init_app(app)

    def init_app(self, app):
        """Flask 앱 초기화"""
        self.app = app

        # 로깅 설정
        self._setup_logging()

        # 요청 추적 설정
        self._setup_request_tracking()

        # 에러 핸들링 설정
        self._setup_error_handling()

        print("[SUCCESS] 통합 모니터링 시스템이 초기화되었습니다.")

    def _setup_logging(self):
        """구조화된 로깅 설정"""
        if not os.path.exists('logs'):
            os.makedirs('logs')

        # 로그 포맷터
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )

        # 파일 핸들러 (회전 로그)
        file_handler = RotatingFileHandler(
            'logs/app.log',
            maxBytes=10*1024*1024,  # 10MB
            backupCount=5
        )
        file_handler.setFormatter(formatter)
        file_handler.setLevel(logging.INFO)

        # 에러 로그 핸들러
        error_handler = RotatingFileHandler(
            'logs/error.log',
            maxBytes=10*1024*1024,  # 10MB
            backupCount=5
        )
        error_handler.setFormatter(formatter)
        error_handler.setLevel(logging.ERROR)

        # 루트 로거 설정
        root_logger = logging.getLogger()
        root_logger.setLevel(logging.INFO)
        root_logger.addHandler(file_handler)
        root_logger.addHandler(error_handler)

        # 콘솔 핸들러 (개발 환경)
        if os.getenv('FLASK_ENV') == 'development':
            console_handler = logging.StreamHandler()
            console_handler.setFormatter(formatter)
            console_handler.setLevel(logging.DEBUG)
            root_logger.addHandler(console_handler)

    def _setup_request_tracking(self):
        """요청 추적 설정"""
        @self.app.before_request
        def before_request():
            # 요청 ID 생성
            g.request_id = str(uuid.uuid4())
            g.start_time = time.time()

            # 요청 정보 로깅
            self._log_request_info()

        @self.app.after_request
        def after_request(response):
            # 응답 시간 계산
            if hasattr(g, 'start_time'):
                duration = time.time() - g.start_time
                self._log_response_info(response, duration)

            # 요청 ID를 응답 헤더에 추가
            if hasattr(g, 'request_id'):
                response.headers['X-Request-ID'] = g.request_id

            return response

    def _setup_error_handling(self):
        """에러 핸들링 설정"""
        @self.app.errorhandler(Exception)
        def handle_exception(e):
            # 에러 로깅
            self._log_error(e)

            # 에러 카운트 증가
            error_type = type(e).__name__
            self.error_counts[error_type] = self.error_counts.get(error_type, 0) + 1

            # JSON 응답
            return {
                'error': True,
                'message': str(e),
                'request_id': getattr(g, 'request_id', None),
                'timestamp': datetime.now(UTC).isoformat()
            }, 500

    def _log_request_info(self):
        """요청 정보 로깅"""
        request_info = {
            'type': 'request',
            'request_id': getattr(g, 'request_id', None),
            'method': request.method,
            'path': request.path,
            'query_string': request.query_string.decode('utf-8'),
            'user_agent': request.headers.get('User-Agent'),
            'remote_addr': request.remote_addr,
            'timestamp': datetime.now(UTC).isoformat()
        }

        logging.info(f"REQUEST: {json.dumps(request_info)}")

    def _log_response_info(self, response, duration):
        """응답 정보 로깅"""
        response_info = {
            'type': 'response',
            'request_id': getattr(g, 'request_id', None),
            'status_code': response.status_code,
            'duration_ms': round(duration * 1000, 2),
            'content_length': response.content_length,
            'timestamp': datetime.now(UTC).isoformat()
        }

        logging.info(f"RESPONSE: {json.dumps(response_info)}")

        # 성능 메트릭 업데이트
        self._update_performance_metrics(response.status_code, duration)

    def _log_error(self, error):
        """에러 로깅"""
        error_info = {
            'type': 'error',
            'request_id': getattr(g, 'request_id', None),
            'error_type': type(error).__name__,
            'error_message': str(error),
            'path': request.path if request else None,
            'method': request.method if request else None,
            'timestamp': datetime.now(UTC).isoformat()
        }

        logging.error(f"ERROR: {json.dumps(error_info)}")

    def _update_performance_metrics(self, status_code, duration):
        """성능 메트릭 업데이트"""
        if 'response_times' not in self.performance_metrics:
            self.performance_metrics['response_times'] = []

        self.performance_metrics['response_times'].append(duration)

        # 최근 100개 요청만 유지
        if len(self.performance_metrics['response_times']) > 100:
            self.performance_metrics['response_times'] = self.performance_metrics['response_times'][-100:]

        # 상태 코드 카운트
        status_key = f'status_{status_code}'
        self.performance_metrics[status_key] = self.performance_metrics.get(status_key, 0) + 1

    def get_metrics(self) -> dict[str, Any]:
        """현재 메트릭 반환"""
        response_times = self.performance_metrics.get('response_times', [])

        return {
            'timestamp': datetime.now(UTC).isoformat(),
            'error_counts': self.error_counts,
            'performance': {
                'total_requests': len(response_times),
                'avg_response_time_ms': round(sum(response_times) / len(response_times) * 1000, 2) if response_times else 0,
                'max_response_time_ms': round(max(response_times) * 1000, 2) if response_times else 0,
                'min_response_time_ms': round(min(response_times) * 1000, 2) if response_times else 0,
                'status_codes': {k: v for k, v in self.performance_metrics.items() if k.startswith('status_')}
            }
        }

    def reset_metrics(self):
        """메트릭 초기화"""
        self.error_counts.clear()
        self.performance_metrics.clear()
        print("[INFO] 모니터링 메트릭이 초기화되었습니다.")

# 전역 모니터 인스턴스
monitor = UnifiedMonitor()

def monitor_api_call(func):
    """API 호출 모니터링 데코레이터"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        try:
            result = func(*args, **kwargs)
            duration = time.time() - start_time

            # 성공 로깅
            logging.info(f"API_SUCCESS: {func.__name__} - {duration:.3f}s")
            return result

        except Exception as e:
            duration = time.time() - start_time

            # 에러 로깅
            logging.error(f"API_ERROR: {func.__name__} - {duration:.3f}s - {str(e)}")
            raise

    return wrapper
