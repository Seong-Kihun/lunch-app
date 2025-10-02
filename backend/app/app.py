#!/usr/bin/env python3
"""
레거시 호환성을 위한 앱 엔트리포인트
새로운 구조에서는 wsgi.py를 사용하세요.
"""

import os
import sys
import warnings

# 프로젝트 루트를 Python 경로에 추가
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, project_root)

# 환경변수 로드
from backend.config.env_loader import load_environment_variables
load_environment_variables()

# 앱 팩토리에서 앱 생성
from backend.app.app_factory import create_app

# Flask 앱 생성
app = create_app()

# 레거시 호환성을 위한 경고
warnings.warn(
    "backend/app/app.py는 레거시 호환성을 위해 유지됩니다. "
    "새로운 구조에서는 backend/app/wsgi.py를 사용하세요.",
    DeprecationWarning,
    stacklevel=2
)

# 데이터베이스 초기화 (레거시 호환성)
with app.app_context():
    try:
        from backend.database.database_init import init_database
        init_database(app)
        print("[SUCCESS] 레거시 데이터베이스 초기화 완료")
    except Exception as e:
        print(f"[WARNING] 레거시 데이터베이스 초기화 실패: {e}")

# Socket.IO 설정 (레거시 호환성)
socketio = None
try:
    from flask_socketio import SocketIO
    socketio = SocketIO(app, cors_allowed_origins="*")
    print("[SUCCESS] Socket.IO 초기화 완료 (레거시)")
except Exception as e:
    print(f"[WARNING] Socket.IO 초기화 실패 (레거시): {e}")

if __name__ == '__main__':
    # PostgreSQL 스키마 수정은 app_factory.py에서 자동으로 처리됩니다.
    port = int(os.environ.get('PORT', 5000))
    
    if socketio:
        # Socket.IO와 함께 실행 (레거시)
        socketio.run(app, host="0.0.0.0", port=port, debug=os.getenv('DEBUG', 'false').lower() == 'true')
    else:
        # 일반 Flask로 실행 (레거시)
        app.run(debug=os.getenv('DEBUG', 'false').lower() == 'true', host="0.0.0.0", port=port)
