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
from dotenv import load_dotenv
load_dotenv()

# 기존 앱 구조 사용 (호환성 유지)
from backend.app import app

# Render 환경에서 실행
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
