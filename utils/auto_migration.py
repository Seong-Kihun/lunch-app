"""
자동 데이터베이스 마이그레이션 유틸리티
앱 시작 시 자동으로 데이터베이스 스키마를 최신 상태로 업데이트
"""

import os
import subprocess
import sys
from flask import current_app
from extensions import db
from sqlalchemy import text
import logging

logger = logging.getLogger(__name__)

def run_migrations():
    """
    데이터베이스 마이그레이션을 실행합니다.
    """
    try:
        logger.info("🔄 데이터베이스 마이그레이션 시작...")
        
        # 현재 디렉토리를 프로젝트 루트로 변경
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        os.chdir(project_root)
        
        # Alembic을 사용하여 마이그레이션 실행
        result = subprocess.run([
            sys.executable, '-m', 'alembic', 'upgrade', 'head'
        ], capture_output=True, text=True, timeout=60)
        
        if result.returncode == 0:
            logger.info("✅ 데이터베이스 마이그레이션 완료")
            logger.info(f"마이그레이션 출력: {result.stdout}")
            return True
        else:
            logger.error(f"❌ 마이그레이션 실패: {result.stderr}")
            return False
            
    except subprocess.TimeoutExpired:
        logger.error("❌ 마이그레이션 타임아웃 (60초 초과)")
        return False
    except Exception as e:
        logger.error(f"❌ 마이그레이션 실행 중 오류: {e}")
        return False

def check_and_fix_database_schema():
    """
    데이터베이스 스키마를 확인하고 필요한 경우 수정합니다.
    """
    try:
        with current_app.app_context():
            # chat_room 테이블에 title 컬럼이 있는지 확인
            result = db.session.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'chat_room' AND column_name = 'title'
            """))
            
            if not result.fetchone():
                logger.info("🔧 chat_room 테이블에 title 컬럼 추가 중...")
                db.session.execute(text("ALTER TABLE chat_room ADD COLUMN title VARCHAR(100)"))
                db.session.commit()
                logger.info("✅ title 컬럼 추가 완료")
            else:
                logger.info("✅ chat_room 테이블에 title 컬럼이 이미 존재합니다")
                
            return True
            
    except Exception as e:
        logger.error(f"❌ 데이터베이스 스키마 확인/수정 중 오류: {e}")
        try:
            db.session.rollback()
        except:
            pass
        return False

def initialize_database():
    """
    데이터베이스 초기화 및 마이그레이션을 실행합니다.
    """
    try:
        logger.info("🚀 데이터베이스 초기화 시작...")
        
        # 1. 마이그레이션 실행
        migration_success = run_migrations()
        
        # 2. 스키마 확인 및 수정
        schema_success = check_and_fix_database_schema()
        
        if migration_success and schema_success:
            logger.info("✅ 데이터베이스 초기화 완료")
            return True
        else:
            logger.warning("⚠️ 데이터베이스 초기화에 일부 문제가 있었습니다")
            return False
            
    except Exception as e:
        logger.error(f"❌ 데이터베이스 초기화 중 오류: {e}")
        return False

def create_tables_if_not_exist():
    """
    테이블이 존재하지 않는 경우 생성합니다.
    """
    try:
        with current_app.app_context():
            db.create_all()
            logger.info("✅ 데이터베이스 테이블 생성/확인 완료")
            return True
    except Exception as e:
        logger.error(f"❌ 테이블 생성 중 오류: {e}")
        return False
