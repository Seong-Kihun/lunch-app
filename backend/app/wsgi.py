#!/usr/bin/env python3
"""
WSGI 엔트리포인트
Flask 앱을 위한 얇은 WSGI 인터페이스
"""

import os
import sys

# 프로젝트 루트를 Python 경로에 추가
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, project_root)

# 환경변수 로드
from backend.config.env_loader import load_environment_variables
load_environment_variables()

# 앱 팩토리에서 앱 생성
from backend.app.app_factory import create_app

# WSGI 애플리케이션 생성
app = create_app()

# Render 환경에서 실행
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
