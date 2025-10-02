#!/usr/bin/env python3
"""
베이스라인 메트릭 정의 및 관측 인프라 구축
현재 시스템의 성능 기준치를 측정하고 모니터링 기반을 구축합니다.
"""

from prometheus_client import Counter, Histogram, Gauge, generate_latest
from flask import Response, request
import structlog
import time
import psutil
import os
from datetime import datetime
from typing import Dict, List, Any
import json

# 베이스라인 메트릭 정의
REQUEST_COUNT = Counter(
    'http_requests_total', 
    'Total HTTP requests', 
    ['method', 'endpoint', 'status']
)

REQUEST_DURATION = Histogram(
    'http_request_duration_seconds', 
    'HTTP request duration in seconds',
    ['method', 'endpoint']
)

ERROR_COUNT = Counter(
    'application_errors_total', 
    'Total application errors', 
    ['error_type', 'endpoint']
)

DATABASE_QUERIES = Counter(
    'database_queries_total', 
    'Total database queries', 
    ['operation', 'table', 'status']
)

DATABASE_QUERY_DURATION = Histogram(
    'database_query_duration_seconds',
    'Database query duration in seconds',
    ['operation', 'table']
)

ACTIVE_CONNECTIONS = Gauge(
    'active_connections',
    'Number of active connections'
)

MEMORY_USAGE = Gauge(
    'memory_usage_bytes',
    'Memory usage in bytes',
    ['type']  # 'rss', 'vms', 'available'
)

CPU_USAGE = Gauge(
    'cpu_usage_percent',
    'CPU usage percentage'
)

# 구조적 로깅 설정
logger = structlog.get_logger()

class BaselineMetrics:
    """베이스라인 메트릭 관리자"""
    
    def __init__(self):
        self.baseline_data = {}
        self.start_time = datetime.utcnow()
    
    def capture_baseline(self) -> Dict[str, Any]:
        """현재 시스템 베이스라인 캡처"""
        logger.info("베이스라인 메트릭 캡처 시작")
        
        metrics = {
            'timestamp': datetime.utcnow().isoformat(),
            'api_response_times': [],  # 현재 API 응답시간
            'error_rates': [],         # 현재 에러율
            'database_performance': [], # DB 성능
            'memory_usage': {},        # 메모리 사용량
            'cpu_usage': {},          # CPU 사용량
            'code_complexity': {},     # 코드 복잡도
            'system_info': {}         # 시스템 정보
        }
        
        # 시스템 리소스 정보
        metrics['memory_usage'] = {
            'total': psutil.virtual_memory().total,
            'available': psutil.virtual_memory().available,
            'percent': psutil.virtual_memory().percent,
            'rss': psutil.Process().memory_info().rss,
            'vms': psutil.Process().memory_info().vms
        }
        
        metrics['cpu_usage'] = {
            'percent': psutil.cpu_percent(),
            'count': psutil.cpu_count()
        }
        
        # 시스템 정보
        metrics['system_info'] = {
            'platform': os.uname().sysname if hasattr(os, 'uname') else 'unknown',
            'python_version': f"{os.sys.version_info.major}.{os.sys.version_info.minor}.{os.sys.version_info.micro}",
            'flask_env': os.getenv('FLASK_ENV', 'development'),
            'start_time': self.start_time.isoformat()
        }
        
        self.baseline_data = metrics
        logger.info("베이스라인 메트릭 캡처 완료", metrics=metrics)
        
        return metrics
    
    def update_metrics(self):
        """메트릭 업데이트"""
        # 메모리 사용량 업데이트
        MEMORY_USAGE.labels(type='rss').set(psutil.Process().memory_info().rss)
        MEMORY_USAGE.labels(type='vms').set(psutil.Process().memory_info().vms)
        MEMORY_USAGE.labels(type='available').set(psutil.virtual_memory().available)
        
        # CPU 사용량 업데이트
        CPU_USAGE.set(psutil.cpu_percent())
    
    def get_metrics_endpoint(self) -> Response:
        """Prometheus 메트릭 엔드포인트"""
        # 메트릭 업데이트
        self.update_metrics()
        
        # Prometheus 형식으로 메트릭 반환
        data = generate_latest()
        return Response(data, mimetype='text/plain; version=0.0.4; charset=utf-8')
    
    def get_baseline_report(self) -> Dict[str, Any]:
        """베이스라인 리포트 생성"""
        return {
            'baseline_captured_at': self.start_time.isoformat(),
            'current_metrics': self.baseline_data,
            'uptime_seconds': (datetime.utcnow() - self.start_time).total_seconds(),
            'recommendations': self._generate_recommendations()
        }
    
    def _generate_recommendations(self) -> List[str]:
        """성능 개선 권장사항 생성"""
        recommendations = []
        
        if self.baseline_data.get('memory_usage', {}).get('percent', 0) > 80:
            recommendations.append("메모리 사용량이 80%를 초과했습니다. 메모리 최적화를 고려하세요.")
        
        if self.baseline_data.get('cpu_usage', {}).get('percent', 0) > 70:
            recommendations.append("CPU 사용량이 70%를 초과했습니다. CPU 최적화를 고려하세요.")
        
        if not recommendations:
            recommendations.append("현재 시스템 성능이 양호합니다.")
        
        return recommendations

# 전역 메트릭 인스턴스
baseline_metrics = BaselineMetrics()

def setup_monitoring_middleware(app):
    """모니터링 미들웨어 설정"""
    
    @app.before_request
    def before_request():
        request.start_time = time.time()
    
    @app.after_request
    def after_request(response):
        # 요청 지속 시간 기록
        duration = time.time() - getattr(request, 'start_time', time.time())
        
        REQUEST_DURATION.labels(
            method=request.method,
            endpoint=request.endpoint or 'unknown'
        ).observe(duration)
        
        # 요청 수 기록
        REQUEST_COUNT.labels(
            method=request.method,
            endpoint=request.endpoint or 'unknown',
            status=response.status_code
        ).inc()
        
        # 에러 카운트 기록
        if response.status_code >= 400:
            ERROR_COUNT.labels(
                error_type=f"http_{response.status_code}",
                endpoint=request.endpoint or 'unknown'
            ).inc()
        
        return response
    
    # 메트릭 엔드포인트 등록
    @app.route('/metrics')
    def metrics():
        """Prometheus 메트릭 엔드포인트"""
        return baseline_metrics.get_metrics_endpoint()
    
    @app.route('/baseline')
    def baseline():
        """베이스라인 리포트 엔드포인트"""
        report = baseline_metrics.get_baseline_report()
        return Response(
            json.dumps(report, indent=2),
            mimetype='application/json'
        )

def capture_baseline():
    """베이스라인 캡처 함수"""
    return baseline_metrics.capture_baseline()

def log_database_query(operation: str, table: str, duration: float, status: str = 'success'):
    """데이터베이스 쿼리 로깅"""
    DATABASE_QUERIES.labels(
        operation=operation,
        table=table,
        status=status
    ).inc()
    
    DATABASE_QUERY_DURATION.labels(
        operation=operation,
        table=table
    ).observe(duration)
    
    logger.info(
        "Database query executed",
        operation=operation,
        table=table,
        duration=duration,
        status=status
    )

def log_application_error(error_type: str, endpoint: str, error_message: str):
    """애플리케이션 에러 로깅"""
    ERROR_COUNT.labels(
        error_type=error_type,
        endpoint=endpoint
    ).inc()
    
    logger.error(
        "Application error occurred",
        error_type=error_type,
        endpoint=endpoint,
        error_message=error_message
    )

if __name__ == "__main__":
    # 베이스라인 캡처 테스트
    metrics = capture_baseline()
    print("베이스라인 메트릭 캡처 완료:")
    print(json.dumps(metrics, indent=2))
