#!/usr/bin/env python3
"""
Import 경로 업데이트 스크립트
파일 이동 후 import 경로를 자동으로 업데이트합니다.
"""

import re
from pathlib import Path

def update_imports():
    """Import 경로 업데이트"""

    # 업데이트할 import 패턴들
    import_updates = {
        r"from extensions import": "from backend.app.extensions import",
        r"from auth\.": "from backend.auth.",
        r"from models\.": "from backend.models.",
        r"from utils\.": "from backend.utils.",
        r"from config\.": "from backend.config.",
        r"from api\.": "from backend.api.",
        r"from routes\.": "from backend.routes.",
        r"from services\.": "from backend.services.",
        r"from monitoring\.": "from backend.monitoring.",
        r"from security\.": "from backend.security.",
        r"from realtime\.": "from backend.realtime.",
    }

    # 백엔드 폴더의 모든 Python 파일 업데이트
    backend_path = Path("backend")
    if backend_path.exists():
        for py_file in backend_path.rglob("*.py"):
            update_file_imports(py_file, import_updates)

    print("✅ Import 경로 업데이트 완료")

def update_file_imports(file_path, import_updates):
    """파일의 import 경로 업데이트"""
    try:
        with open(file_path, encoding='utf-8') as f:
            content = f.read()

        original_content = content

        for old_pattern, new_import in import_updates.items():
            content = re.sub(old_pattern, new_import, content)

        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"  📝 {file_path} 업데이트됨")

    except Exception as e:
        print(f"  ❌ {file_path} 업데이트 실패: {e}")

if __name__ == "__main__":
    update_imports()
