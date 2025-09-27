#!/usr/bin/env python3
"""
통합된 백엔드 서버 실행 스크립트
모든 환경에서 일관된 방식으로 서버를 실행합니다.
"""

import os
import sys
import argparse
from pathlib import Path

# 프로젝트 루트를 Python 경로에 추가
project_root = Path(__file__).parent.parent  # backend의 부모 디렉토리 (프로젝트 루트)
sys.path.insert(0, str(project_root))

def main():
    parser = argparse.ArgumentParser(description='Lunch App Backend Server')
    parser.add_argument('--host', default='0.0.0.0', help='Host to bind to')
    parser.add_argument('--port', type=int, default=5000, help='Port to bind to')
    parser.add_argument('--debug', action='store_true', help='Enable debug mode')
    parser.add_argument('--env', choices=['dev', 'prod'], default='dev', help='Environment')
    
    args = parser.parse_args()
    
    # 환경 변수 설정
    os.environ['FLASK_ENV'] = 'development' if args.env == 'dev' else 'production'
    os.environ['FLASK_DEBUG'] = 'true' if args.debug else 'false'
    os.environ['HOST'] = args.host
    os.environ['PORT'] = str(args.port)
    
    try:
        # 앱 팩토리에서 앱 생성
        from backend.app.app_factory import create_app
        app = create_app()
        
        print("=" * 60)
        print("🚀 Lunch App Backend Server")
        print("=" * 60)
        print(f"📍 Host: {args.host}")
        print(f"🔌 Port: {args.port}")
        print(f"🔧 Debug: {args.debug}")
        print(f"🌍 Environment: {args.env}")
        print(f"🔗 URL: http://{args.host}:{args.port}")
        print("=" * 60)
        
        # Socket.IO 지원 확인
        try:
            from backend.app.realtime_system import socketio
            if socketio:
                print("🔌 Socket.IO 지원 활성화")
                socketio.run(app, host=args.host, port=args.port, debug=args.debug)
            else:
                raise ImportError("Socket.IO not available")
        except ImportError:
            print("🔌 일반 Flask 모드로 실행")
            app.run(host=args.host, port=args.port, debug=args.debug)
            
    except Exception as e:
        print(f"❌ 서버 시작 실패: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
