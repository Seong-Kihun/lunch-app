# Gunicorn 설정 파일
# WebSocket 지원을 위한 eventlet worker 사용

import os

# 기본 설정
bind = f"0.0.0.0:{os.environ.get('PORT', 5000)}"
workers = 1  # WebSocket을 위해 단일 worker 사용
worker_class = "eventlet"  # WebSocket 지원
worker_connections = 1000

# 타임아웃 설정
timeout = 30
keepalive = 2

# 로깅
accesslog = "-"
errorlog = "-"
loglevel = "info"

# 프로세스 설정
preload_app = True
max_requests = 1000
max_requests_jitter = 50

# WebSocket 지원
worker_tmp_dir = "/dev/shm"  # 메모리 기반 임시 디렉토리

# 환경변수
raw_env = [
    'FLASK_ENV=production',
    'PYTHONPATH=/opt/render/project/src'
]
