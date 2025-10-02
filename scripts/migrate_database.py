#!/usr/bin/env python3
"""
데이터베이스 마이그레이션 자동화 스크립트
배포 시 자동으로 마이그레이션을 실행합니다.
"""

import os
import sys
import subprocess
from pathlib import Path

def main():
    """데이터베이스 마이그레이션 실행"""
    # 프로젝트 루트를 Python 경로에 추가
    project_root = Path(__file__).parent.parent
    sys.path.insert(0, str(project_root))
    
    # 환경변수 로드
    from backend.config.env_loader import load_environment_variables
    load_environment_variables()
    
    # 데이터베이스 URL 정규화
    from backend.utils.database_url_normalizer import normalize_database_url, validate_database_url
    normalize_database_url()
    
    # 데이터베이스 URL 유효성 검증
    is_valid, message = validate_database_url()
    if not is_valid:
        print(f"❌ 데이터베이스 URL 검증 실패: {message}")
        sys.exit(1)
    
    print(f"✅ 데이터베이스 URL 검증 성공: {message}")
    
    # 백엔드 디렉토리로 이동
    backend_dir = project_root / "backend"
    os.chdir(backend_dir)
    
    try:
        # Alembic 마이그레이션 실행
        print("🔄 데이터베이스 마이그레이션 실행 중...")
        result = subprocess.run(
            ["alembic", "upgrade", "head"],
            capture_output=True,
            text=True,
            check=True
        )
        
        print("✅ 마이그레이션 완료")
        print(result.stdout)
        
    except subprocess.CalledProcessError as e:
        print(f"❌ 마이그레이션 실패: {e}")
        print(f"stderr: {e.stderr}")
        sys.exit(1)
    except FileNotFoundError:
        print("❌ alembic 명령어를 찾을 수 없습니다. requirements.txt에 flask-migrate가 설치되어 있는지 확인하세요.")
        sys.exit(1)

if __name__ == "__main__":
    main()
