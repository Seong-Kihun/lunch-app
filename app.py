#!/usr/bin/env python3
"""
Render 호환성을 위한 앱 엔트리포인트
기존 backend.app 모듈을 임포트하여 사용합니다.
"""

import os
import sys

# 프로젝트 루트를 Python 경로에 추가
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_root)

# 환경변수 로드
from dotenv import load_dotenv
load_dotenv()

# backend.app 모듈에서 앱 가져오기
from backend.app import app

# Render에서 사용할 수 있도록 app 객체를 직접 노출
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
