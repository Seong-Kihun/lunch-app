"""
자동 데이터베이스 마이그레이션 유틸리티
앱 시작 시 자동으로 데이터베이스 스키마를 최신 상태로 업데이트
모든 마이그레이션 파일을 자동으로 실행하고 오류를 처리합니다.
"""

import os
import subprocess
import sys
import time
from datetime import datetime
from flask import current_app
from backend.app.extensions import db
from sqlalchemy import text, inspect
import logging

logger = logging.getLogger(__name__)

def run_migrations():
    """
    데이터베이스 마이그레이션을 실행합니다.
    모든 마이그레이션 파일을 순차적으로 실행하고 오류를 처리합니다.
    """
    try:
        logger.info("[PROCESS] 데이터베이스 마이그레이션 시작...")
        
        # 현재 디렉토리를 프로젝트 루트로 변경
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        original_cwd = os.getcwd()
        os.chdir(project_root)
        
        try:
            # 1. 먼저 기본 테이블 생성
            logger.info("[CONFIG] 기본 테이블 생성 중...")
            try:
                with current_app.app_context():
                    db.create_all()
                    logger.info("[SUCCESS] 기본 테이블 생성 완료")
            except Exception as e:
                logger.warning(f"[WARNING] 기본 테이블 생성 중 오류: {e}")
            
            # 2. 마이그레이션 상태 확인
            logger.info("[CHECK] 마이그레이션 상태 확인 중...")
            status_result = subprocess.run([
                sys.executable, '-m', 'alembic', 'current'
            ], capture_output=True, text=True, timeout=30)
            
            logger.info(f"현재 마이그레이션 상태: {status_result.stdout}")
            
            # 3. 마이그레이션 실행 시도
            logger.info("[START] 마이그레이션 실행 중...")
            
            # 먼저 merge 마이그레이션 실행
            try:
                merge_result = subprocess.run([
                    sys.executable, '-m', 'alembic', 'upgrade', 'c1fdd46a7c6f'
                ], capture_output=True, text=True, timeout=60)
                
                if merge_result.returncode == 0:
                    logger.info("[SUCCESS] 마이그레이션 머지 완료")
                else:
                    logger.warning(f"[WARNING] 마이그레이션 머지 실패: {merge_result.stderr}")
            except Exception as e:
                logger.warning(f"[WARNING] 마이그레이션 머지 중 오류: {e}")
            
            # 그 다음 head까지 실행
            upgrade_result = subprocess.run([
                sys.executable, '-m', 'alembic', 'upgrade', 'head'
            ], capture_output=True, text=True, timeout=120)
            
            if upgrade_result.returncode == 0:
                logger.info("[SUCCESS] 데이터베이스 마이그레이션 완료")
                logger.info(f"마이그레이션 출력: {upgrade_result.stdout}")
                return True
            else:
                logger.error(f"[ERROR] 마이그레이션 실패: {upgrade_result.stderr}")
                
                # 실패한 경우 개별 마이그레이션 시도
                return run_individual_migrations()
                
        finally:
            os.chdir(original_cwd)
            
    except subprocess.TimeoutExpired:
        logger.error("[ERROR] 마이그레이션 타임아웃")
        return False
    except Exception as e:
        logger.error(f"[ERROR] 마이그레이션 실행 중 오류: {e}")
        return False

def run_individual_migrations():
    """
    개별 마이그레이션을 순차적으로 실행합니다.
    테이블이 존재하지 않는 경우를 고려하여 안전하게 실행합니다.
    """
    try:
        logger.info("[PROCESS] 개별 마이그레이션 실행 시도...")
        
        # 먼저 테이블 생성
        logger.info("[CONFIG] 기본 테이블 생성 중...")
        try:
            with current_app.app_context():
                db.create_all()
                logger.info("[SUCCESS] 기본 테이블 생성 완료")
        except Exception as e:
            logger.warning(f"[WARNING] 기본 테이블 생성 중 오류 (건너뜀): {e}")
        
        # 마이그레이션 파일 목록 (테이블 생성 후 실행)
        migration_files = [
            "88b198af2208_party_datetime_columns_migration",  # 테이블 생성 마이그레이션 먼저
            "add_title_column_to_chat_room",  # chat_room 수정
            "87bade1fb681_add_test_field_to_user_model",  # users 수정
            "29c6da1f68ba_remove_test_field_from_user_model"  # users 수정 제거
        ]
        
        for migration in migration_files:
            try:
                logger.info(f"[PROCESS] 마이그레이션 실행: {migration}")
                result = subprocess.run([
                    sys.executable, '-m', 'alembic', 'upgrade', migration
                ], capture_output=True, text=True, timeout=60)
                
                if result.returncode == 0:
                    logger.info(f"[SUCCESS] {migration} 완료")
                else:
                    logger.warning(f"[WARNING] {migration} 건너뜀: {result.stderr}")
                    
            except Exception as e:
                logger.warning(f"[WARNING] {migration} 실행 중 오류 (건너뜀): {e}")
                continue
        
        return True
        
    except Exception as e:
        logger.error(f"[ERROR] 개별 마이그레이션 실행 중 오류: {e}")
        return False

def check_and_fix_database_schema():
    """
    데이터베이스 스키마를 확인하고 필요한 경우 수정합니다.
    모든 필수 테이블과 컬럼이 존재하는지 확인하고 자동으로 수정합니다.
    """
    try:
        with current_app.app_context():
            logger.info("[SEARCH] 데이터베이스 스키마 확인 중...")
            
            # 데이터베이스 엔진 타입 확인
            inspector = inspect(db.engine)
            existing_tables = inspector.get_table_names()
            logger.info(f"기존 테이블 목록: {existing_tables}")
            
            # 필수 테이블들이 존재하는지 확인 (실제 테이블 이름 사용)
            required_tables = [
                'users', 'party', 'party_member', 'dangol_pot', 'dangol_pot_member',
                'chat_room', 'chat_participant', 'chat_message', 'personal_schedules',
                'schedule_attendees', 'lunch_proposal', 'proposal_acceptance',
                'notification', 'user_analytics', 'restaurant', 'review'
            ]
            
            missing_tables = [table for table in required_tables if table not in existing_tables]
            if missing_tables:
                logger.warning(f"[WARNING] 누락된 테이블들: {missing_tables}")
            
            # chat_room 테이블 스키마 확인 및 수정
            if 'chat_room' in existing_tables:
                try:
                    # chat_room 테이블의 컬럼 확인
                    columns = inspector.get_columns('chat_room')
                    column_names = [col['name'] for col in columns]
                    logger.info(f"chat_room 컬럼들: {column_names}")
                    
                    # title 컬럼이 없으면 추가
                    if 'title' not in column_names:
                        logger.info("[CONFIG] chat_room 테이블에 title 컬럼 추가 중...")
                        db.session.execute(text("ALTER TABLE chat_room ADD COLUMN title VARCHAR(100)"))
                        db.session.commit()
                        logger.info("[SUCCESS] title 컬럼 추가 완료")
                    else:
                        logger.info("[SUCCESS] chat_room 테이블에 title 컬럼이 이미 존재합니다")
                        
                except Exception as e:
                    logger.warning(f"[WARNING] chat_room 스키마 확인 중 오류 (건너뜀): {e}")
            
            # users 테이블 스키마 확인
            if 'users' in existing_tables:
                try:
                    columns = inspector.get_columns('users')
                    column_names = [col['name'] for col in columns]
                    logger.info(f"users 컬럼들: {column_names}")
                    
                    # test_field가 있으면 제거 (이미 마이그레이션으로 처리됨)
                    if 'test_field' in column_names:
                        logger.info("[CONFIG] users 테이블에서 test_field 컬럼 제거 중...")
                        db.session.execute(text("ALTER TABLE users DROP COLUMN test_field"))
                        db.session.commit()
                        logger.info("[SUCCESS] test_field 컬럼 제거 완료")
                        
                except Exception as e:
                    logger.warning(f"[WARNING] users 스키마 확인 중 오류 (건너뜀): {e}")
            
            # personal_schedules 테이블 스키마 확인
            if 'personal_schedules' in existing_tables:
                try:
                    columns = inspector.get_columns('personal_schedules')
                    column_names = [col['name'] for col in columns]
                    logger.info(f"personal_schedules 컬럼들: {column_names}")
                    
                    # 필요한 컬럼들이 있는지 확인
                    required_columns = ['id', 'employee_id', 'title', 'start_date', 'time']
                    missing_columns = [col for col in required_columns if col not in column_names]
                    
                    if missing_columns:
                        logger.warning(f"[WARNING] personal_schedules 누락된 컬럼들: {missing_columns}")
                    
                except Exception as e:
                    logger.warning(f"[WARNING] personal_schedules 스키마 확인 중 오류 (건너뜀): {e}")
            
            logger.info("[SUCCESS] 데이터베이스 스키마 확인 완료")
            return True
            
    except Exception as e:
        logger.error(f"[ERROR] 데이터베이스 스키마 확인/수정 중 오류: {e}")
        try:
            db.session.rollback()
        except:
            pass
        return False

def initialize_database():
    """
    데이터베이스 초기화 및 마이그레이션을 실행합니다.
    모든 마이그레이션 파일을 자동으로 실행하고 스키마를 최신 상태로 유지합니다.
    """
    try:
        logger.info("[START] 데이터베이스 초기화 시작...")
        
        # 1. 데이터베이스 연결 테스트
        try:
            with current_app.app_context():
                db.session.execute(text("SELECT 1"))
                logger.info("[SUCCESS] 데이터베이스 연결 확인")
        except Exception as e:
            logger.error(f"[ERROR] 데이터베이스 연결 실패: {e}")
            return False
        
        # 2. 마이그레이션 실행
        logger.info("[PROCESS] 마이그레이션 실행 중...")
        migration_success = run_migrations()
        
        # 3. 스키마 확인 및 수정
        logger.info("[SEARCH] 스키마 확인 및 수정 중...")
        schema_success = check_and_fix_database_schema()
        
        # 4. 최종 검증
        logger.info("[SEARCH] 최종 검증 중...")
        validation_success = validate_database_integrity()
        
        if migration_success and schema_success and validation_success:
            logger.info("[SUCCESS] 데이터베이스 초기화 완료")
            return True
        else:
            logger.warning("[WARNING] 데이터베이스 초기화에 일부 문제가 있었습니다")
            logger.warning(f"마이그레이션: {'[SUCCESS]' if migration_success else '[ERROR]'}")
            logger.warning(f"스키마: {'[SUCCESS]' if schema_success else '[ERROR]'}")
            logger.warning(f"검증: {'[SUCCESS]' if validation_success else '[ERROR]'}")
            return False
            
    except Exception as e:
        logger.error(f"[ERROR] 데이터베이스 초기화 중 오류: {e}")
        return False

def validate_database_integrity():
    """
    데이터베이스 무결성을 검증합니다.
    """
    try:
        with current_app.app_context():
            logger.info("[SEARCH] 데이터베이스 무결성 검증 중...")
            
            # 필수 테이블 존재 확인
            inspector = inspect(db.engine)
            existing_tables = inspector.get_table_names()
            
            critical_tables = ['users', 'personal_schedules', 'chat_room']
            missing_critical = [table for table in critical_tables if table not in existing_tables]
            
            if missing_critical:
                logger.error(f"[ERROR] 필수 테이블 누락: {missing_critical}")
                return False
            
            # chat_room 테이블에 title 컬럼 확인
            if 'chat_room' in existing_tables:
                columns = inspector.get_columns('chat_room')
                column_names = [col['name'] for col in columns]
                if 'title' not in column_names:
                    logger.error("[ERROR] chat_room 테이블에 title 컬럼이 없습니다")
                    return False
            
            logger.info("[SUCCESS] 데이터베이스 무결성 검증 완료")
            return True
            
    except Exception as e:
        logger.error(f"[ERROR] 데이터베이스 무결성 검증 중 오류: {e}")
        return False

def create_tables_if_not_exist():
    """
    테이블이 존재하지 않는 경우 생성합니다.
    모든 모델의 테이블을 생성하고 인덱스를 설정합니다.
    """
    try:
        with current_app.app_context():
            logger.info("[CONFIG] 데이터베이스 테이블 생성/확인 중...")
            
            # 모든 테이블 생성
            db.create_all()
            
            # 인덱스 생성 (성능 최적화)
            try:
                logger.info("[CONFIG] 데이터베이스 인덱스 생성 중...")
                
                # personal_schedules 테이블 인덱스
                db.session.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_personal_schedules_employee_date 
                    ON personal_schedules(employee_id, start_date)
                """))
                
                # chat_message 테이블 인덱스
                db.session.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_chat_message_room_time 
                    ON chat_message(chat_type, chat_id, created_at)
                """))
                
                # party_member 테이블 인덱스
                db.session.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_party_member_party_employee 
                    ON party_member(party_id, employee_id)
                """))
                
                db.session.commit()
                logger.info("[SUCCESS] 데이터베이스 인덱스 생성 완료")
                
            except Exception as e:
                logger.warning(f"[WARNING] 인덱스 생성 중 오류 (건너뜀): {e}")
                db.session.rollback()
            
            logger.info("[SUCCESS] 데이터베이스 테이블 생성/확인 완료")
            return True
            
    except Exception as e:
        logger.error(f"[ERROR] 테이블 생성 중 오류: {e}")
        try:
            db.session.rollback()
        except:
            pass
        return False

def reset_database_if_needed():
    """
    데이터베이스가 심각하게 손상된 경우 초기화합니다.
    """
    try:
        with current_app.app_context():
            logger.warning("[WARNING] 데이터베이스 초기화가 필요할 수 있습니다...")
            
            # 백업 생성
            logger.info("💾 데이터베이스 백업 생성 중...")
            backup_file = f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
            backup_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), backup_file)
            
            # SQLite 백업 (SQLite인 경우에만)
            if 'sqlite' in str(db.engine.url):
                import shutil
                db_path = str(db.engine.url).replace('sqlite:///', '')
                if os.path.exists(db_path):
                    shutil.copy2(db_path, backup_path)
                    logger.info(f"[SUCCESS] 백업 생성 완료: {backup_path}")
            
            # 테이블 재생성
            logger.info("[PROCESS] 데이터베이스 테이블 재생성 중...")
            db.drop_all()
            db.create_all()
            
            logger.info("[SUCCESS] 데이터베이스 초기화 완료")
            return True
            
    except Exception as e:
        logger.error(f"[ERROR] 데이터베이스 초기화 중 오류: {e}")
        return False
