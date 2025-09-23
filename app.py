#!/usr/bin/env python3
"""
Lunch App - Main Application Entry Point for Render
Render 배포를 위한 메인 실행 파일
"""

import sys
import os

# 프로젝트 루트를 Python 경로에 추가
project_root = os.path.dirname(os.path.abspath(__file__))
backend_path = os.path.join(project_root, 'backend')
sys.path.insert(0, backend_path)

# 백엔드 앱 import
from app.app import app

# Render 환경에서 실행
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
