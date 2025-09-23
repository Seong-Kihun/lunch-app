"""
간소화된 Flask 애플리케이션
app_factory.py를 사용하여 앱을 생성합니다.
"""

from backend.app.app_factory import create_app

# Flask 앱 생성
app = create_app()

if __name__ == '__main__':
    import os
    
    # 개발 환경 설정
    debug_mode = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
    port = int(os.getenv('PORT', 5000))
    host = os.getenv('HOST', '0.0.0.0')
    
    print(f"🚀 서버 시작: http://{host}:{port}")
    print(f"🔧 디버그 모드: {debug_mode}")
    
    app.run(
        host=host,
        port=port,
        debug=debug_mode
    )
