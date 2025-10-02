"""
데이터베이스 URL 정규화 유틸리티
"""

import os
from urllib.parse import urlparse

def normalize_database_url():
    """
    데이터베이스 URL을 정규화합니다.
    postgres:// -> postgresql+psycopg2:// 변환
    """
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        return None

    # postgres:// 스킴을 postgresql+psycopg2://로 변환
    if db_url.startswith('postgres://'):
        normalized_url = db_url.replace('postgres://', 'postgresql+psycopg2://', 1)
        os.environ['DATABASE_URL'] = normalized_url
        return normalized_url

    return db_url

def validate_database_url():
    """
    데이터베이스 URL 유효성을 검증합니다.
    """
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        return False, "DATABASE_URL이 설정되지 않았습니다."

    try:
        parsed = urlparse(db_url)

        # SQLite URL 검증
        if db_url.startswith('sqlite://'):
            return True, "SQLite 데이터베이스 URL이 유효합니다."

        # PostgreSQL URL 검증
        if db_url.startswith(('postgresql://', 'postgresql+psycopg2://')):
            if not parsed.hostname:
                return False, "PostgreSQL 호스트명이 누락되었습니다."
            if not parsed.port:
                return False, "PostgreSQL 포트가 누락되었습니다."
            if not parsed.username:
                return False, "PostgreSQL 사용자명이 누락되었습니다."
            if not parsed.password:
                return False, "PostgreSQL 비밀번호가 누락되었습니다."
            if not parsed.path or parsed.path == '/':
                return False, "PostgreSQL 데이터베이스명이 누락되었습니다."

            return True, "PostgreSQL 데이터베이스 URL이 유효합니다."

        return False, f"지원하지 않는 데이터베이스 URL 스킴입니다: {parsed.scheme}"

    except Exception as e:
        return False, f"데이터베이스 URL 파싱 오류: {e}"

def get_database_info():
    """
    데이터베이스 정보를 반환합니다.
    """
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        return {
            'type': 'Not configured',
            'url_masked': 'Not set'
        }

    try:
        parsed = urlparse(db_url)

        if db_url.startswith('sqlite://'):
            return {
                'type': 'SQLite',
                'url_masked': parsed.path or 'In-memory'
            }

        if db_url.startswith(('postgresql://', 'postgresql+psycopg2://')):
            return {
                'type': 'PostgreSQL',
                'url_masked': f"{parsed.hostname}:{parsed.port}{parsed.path}",
                'username': parsed.username
            }

        return {
            'type': 'Unknown',
            'url_masked': f"{parsed.scheme}://***"
        }

    except Exception as e:
        return {
            'type': 'Error',
            'url_masked': f"Parse error: {e}"
        }
