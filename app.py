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
from backend.app.app import app

# Render 환경에서 PostgreSQL 스키마 수정
def fix_database_schema():
    """Render 배포 시 PostgreSQL 스키마를 수정합니다."""
    try:
        # backend 디렉토리를 Python 경로에 추가
        import sys
        backend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend')
        if backend_path not in sys.path:
            sys.path.insert(0, backend_path)
        
        print("🔧 PostgreSQL 스키마 수정을 시작합니다...")
        
        # 먼저 일반 스키마 수정 시도
        try:
            from fix_postgresql_schema import fix_postgresql_schema
            success = fix_postgresql_schema()
            if success:
                print("✅ PostgreSQL 스키마 수정이 완료되었습니다.")
                return
        except Exception as e:
            print(f"⚠️ 일반 스키마 수정 실패: {e}")
        
        # 일반 수정 실패 시 강제 수정 시도
        print("🔧 강제 스키마 수정을 시도합니다...")
        try:
            from force_fix_postgresql_schema import force_fix_postgresql_schema
            success = force_fix_postgresql_schema()
            if success:
                print("✅ PostgreSQL 강제 스키마 수정이 완료되었습니다.")
            else:
                print("⚠️ PostgreSQL 강제 스키마 수정에 실패했지만 앱을 계속 실행합니다.")
        except Exception as e:
            print(f"⚠️ PostgreSQL 강제 스키마 수정 중 오류 발생: {e}")
            print("앱을 계속 실행합니다.")
            
    except Exception as e:
        print(f"⚠️ PostgreSQL 스키마 수정 중 오류 발생: {e}")
        print("앱을 계속 실행합니다.")

# Render 환경에서 실행
if __name__ == '__main__':
    # PostgreSQL 스키마 수정 (Render 환경에서만)
    # Render 환경 감지: DATABASE_URL이 postgresql로 시작하는 경우
    database_url = os.getenv('DATABASE_URL', '')
    is_render = os.getenv('RENDER') or database_url.startswith('postgresql://')
    
    if is_render:
        print("🔧 Render 환경 감지: PostgreSQL 스키마 수정을 시작합니다...")
        fix_database_schema()
    else:
        print("ℹ️ 로컬 환경: PostgreSQL 스키마 수정을 건너뜁니다.")
    
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
