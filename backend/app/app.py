#!/usr/bin/env python3
"""
DEPRECATED: 이 파일은 더 이상 사용되지 않습니다.
새로운 구조에서는 backend.app.wsgi를 사용하세요.
"""

import warnings

# 강력한 경고 메시지
warnings.warn(
    "backend.app.app는 완전히 제거되었습니다. "
    "반드시 backend.app.wsgi를 사용하세요.",
    DeprecationWarning,
    stacklevel=2
)

raise ImportError(
    "backend.app.app는 더 이상 사용할 수 없습니다. "
    "backend.app.wsgi를 사용하세요."
)