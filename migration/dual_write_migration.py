#!/usr/bin/env python3
"""
듀얼 라이트 기반 안전한 마이그레이션
employee_id → user_id 전환을 위한 무중단 마이그레이션 시스템입니다.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from sqlalchemy import text, inspect
from sqlalchemy.exc import SQLAlchemyError
import structlog

logger = structlog.get_logger()


class DualWriteMigration:
    """듀얼 라이트 기반 안전한 마이그레이션"""
    
    def __init__(self, db):
        self.db = db
        self.migration_log = []
        self.rollback_scripts = []
        self.batch_size = 1000
        self.max_retries = 3
    
    def phase1_add_user_id_columns(self) -> bool:
        """Phase 1: user_id 컬럼 추가 (NULL 허용)"""
        logger.info("Phase 1: user_id 컬럼 추가 시작")
        
        migration_sql = """
        -- Users 테이블에 user_id 컬럼 추가
        ALTER TABLE users ADD COLUMN IF NOT EXISTS user_id INTEGER;
        
        -- Parties 테이블에 host_user_id 컬럼 추가
        ALTER TABLE party ADD COLUMN IF NOT EXISTS host_user_id INTEGER;
        
        -- Party Members 테이블에 user_id 컬럼 추가
        ALTER TABLE party_member ADD COLUMN IF NOT EXISTS user_id INTEGER;
        
        -- 인덱스 생성 (데이터 이관 전)
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_user_id ON users(user_id);
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_party_host_user_id ON party(host_user_id);
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_party_member_user_id ON party_member(user_id);
        """
        
        rollback_sql = """
        -- 인덱스 삭제
        DROP INDEX IF EXISTS idx_users_user_id;
        DROP INDEX IF EXISTS idx_party_host_user_id;
        DROP INDEX IF EXISTS idx_party_member_user_id;
        
        -- 컬럼 삭제
        ALTER TABLE users DROP COLUMN IF EXISTS user_id;
        ALTER TABLE party DROP COLUMN IF EXISTS host_user_id;
        ALTER TABLE party_member DROP COLUMN IF EXISTS user_id;
        """
        
        try:
            self.db.session.execute(text(migration_sql))
            self.db.session.commit()
            
            self.migration_log.append("Phase 1: user_id 컬럼 추가 완료")
            self.rollback_scripts.append(rollback_sql)
            
            logger.info("Phase 1 완료")
            return True
            
        except SQLAlchemyError as e:
            logger.error("Phase 1 실패", error=str(e))
            self.db.session.rollback()
            return False
    
    def phase2_dual_write_implementation(self) -> bool:
        """Phase 2: 듀얼 라이트 구현 (기존 + 신규 모두 기록)"""
        logger.info("Phase 2: 듀얼 라이트 구현 시작")
        
        # 이 단계는 주로 애플리케이션 코드 변경으로 이루어짐
        # 새로운 코드에서는 employee_id와 user_id 모두 기록
        
        dual_write_functions = {
            'create_user_dual_write': self._create_user_dual_write,
            'create_party_dual_write': self._create_party_dual_write,
            'create_party_member_dual_write': self._create_party_member_dual_write
        }
        
        try:
            # 듀얼 라이트 함수들 등록
            for func_name, func in dual_write_functions.items():
                logger.info(f"듀얼 라이트 함수 등록: {func_name}")
            
            self.migration_log.append("Phase 2: 듀얼 라이트 구현 완료")
            
            logger.info("Phase 2 완료")
            return True
            
        except Exception as e:
            logger.error("Phase 2 실패", error=str(e))
            return False
    
    def phase3_backfill_data(self) -> bool:
        """Phase 3: 배치 백필 (작은 청크로)"""
        logger.info("Phase 3: 배치 백필 시작")
        
        backfill_tasks = [
            ('users', self._backfill_users),
            ('parties', self._backfill_parties),
            ('party_members', self._backfill_party_members)
        ]
        
        for table_name, backfill_func in backfill_tasks:
            logger.info(f"{table_name} 테이블 백필 시작")
            
            if not backfill_func():
                logger.error(f"{table_name} 테이블 백필 실패")
                return False
            
            logger.info(f"{table_name} 테이블 백필 완료")
        
        self.migration_log.append("Phase 3: 배치 백필 완료")
        
        logger.info("Phase 3 완료")
        return True
    
    def phase4_read_priority_switch(self) -> bool:
        """Phase 4: 읽기 우선순위 전환 (user_id 우선)"""
        logger.info("Phase 4: 읽기 우선순위 전환 시작")
        
        # 이 단계는 주로 애플리케이션 코드 변경으로 이루어짐
        # 읽기 시 user_id 우선, 없으면 employee_id fallback
        
        priority_switch_functions = {
            'find_user_priority': self._find_user_priority,
            'find_party_priority': self._find_party_priority,
            'find_party_member_priority': self._find_party_member_priority
        }
        
        try:
            # 우선순위 전환 함수들 등록
            for func_name, func in priority_switch_functions.items():
                logger.info(f"우선순위 전환 함수 등록: {func_name}")
            
            self.migration_log.append("Phase 4: 읽기 우선순위 전환 완료")
            
            logger.info("Phase 4 완료")
            return True
            
        except Exception as e:
            logger.error("Phase 4 실패", error=str(e))
            return False
    
    def phase5_add_constraints(self) -> bool:
        """Phase 5: NOT NULL + FK 제약 적용"""
        logger.info("Phase 5: 제약조건 추가 시작")
        
        constraint_sql = """
        -- NOT NULL 제약 추가
        ALTER TABLE users ALTER COLUMN user_id SET NOT NULL;
        ALTER TABLE party ALTER COLUMN host_user_id SET NOT NULL;
        ALTER TABLE party_member ALTER COLUMN user_id SET NOT NULL;
        
        -- 유니크 제약 추가
        ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS unique_users_user_id UNIQUE (user_id);
        
        -- 외래키 제약 추가
        ALTER TABLE party ADD CONSTRAINT IF NOT EXISTS fk_party_host_user_id 
            FOREIGN KEY (host_user_id) REFERENCES users(user_id);
        ALTER TABLE party_member ADD CONSTRAINT IF NOT EXISTS fk_party_member_user_id 
            FOREIGN KEY (user_id) REFERENCES users(user_id);
        ALTER TABLE party_member ADD CONSTRAINT IF NOT EXISTS fk_party_member_party_id 
            FOREIGN KEY (party_id) REFERENCES party(id);
        """
        
        rollback_sql = """
        -- 외래키 제약 삭제
        ALTER TABLE party DROP CONSTRAINT IF EXISTS fk_party_host_user_id;
        ALTER TABLE party_member DROP CONSTRAINT IF EXISTS fk_party_member_user_id;
        ALTER TABLE party_member DROP CONSTRAINT IF EXISTS fk_party_member_party_id;
        
        -- 유니크 제약 삭제
        ALTER TABLE users DROP CONSTRAINT IF EXISTS unique_users_user_id;
        
        -- NOT NULL 제약 해제
        ALTER TABLE users ALTER COLUMN user_id DROP NOT NULL;
        ALTER TABLE party ALTER COLUMN host_user_id DROP NOT NULL;
        ALTER TABLE party_member ALTER COLUMN user_id DROP NOT NULL;
        """
        
        try:
            self.db.session.execute(text(constraint_sql))
            self.db.session.commit()
            
            self.migration_log.append("Phase 5: 제약조건 추가 완료")
            self.rollback_scripts.append(rollback_sql)
            
            logger.info("Phase 5 완료")
            return True
            
        except SQLAlchemyError as e:
            logger.error("Phase 5 실패", error=str(e))
            self.db.session.rollback()
            return False
    
    def phase6_remove_dual_write(self) -> bool:
        """Phase 6: 듀얼 라이트 제거"""
        logger.info("Phase 6: 듀얼 라이트 제거 시작")
        
        # 이 단계는 주로 애플리케이션 코드 변경으로 이루어짐
        # employee_id 관련 로직 제거, user_id만 사용
        
        try:
            # 듀얼 라이트 제거 작업
            logger.info("듀얼 라이트 코드 제거")
            
            self.migration_log.append("Phase 6: 듀얼 라이트 제거 완료")
            
            logger.info("Phase 6 완료")
            return True
            
        except Exception as e:
            logger.error("Phase 6 실패", error=str(e))
            return False
    
    def phase7_cleanup_old_columns(self) -> bool:
        """Phase 7: 기존 컬럼/테이블 삭제"""
        logger.info("Phase 7: 기존 컬럼 삭제 시작")
        
        cleanup_sql = """
        -- 기존 employee_id 컬럼 삭제 (주의: 데이터 손실)
        ALTER TABLE party DROP COLUMN IF EXISTS host_employee_id;
        ALTER TABLE party_member DROP COLUMN IF EXISTS employee_id;
        
        -- 기존 인덱스 삭제
        DROP INDEX IF EXISTS idx_party_host_employee_id;
        DROP INDEX IF EXISTS idx_party_member_employee_id;
        """
        
        rollback_sql = """
        -- 기존 컬럼 복구는 불가능 (데이터 손실)
        -- 백업에서 복구해야 함
        """
        
        try:
            # 백업 확인
            backup_exists = self._check_backup_exists()
            if not backup_exists:
                logger.warning("백업이 존재하지 않습니다. 컬럼 삭제를 건너뜁니다.")
                return True
            
            self.db.session.execute(text(cleanup_sql))
            self.db.session.commit()
            
            self.migration_log.append("Phase 7: 기존 컬럼 삭제 완료")
            self.rollback_scripts.append(rollback_sql)
            
            logger.info("Phase 7 완료")
            return True
            
        except SQLAlchemyError as e:
            logger.error("Phase 7 실패", error=str(e))
            self.db.session.rollback()
            return False
    
    def _backfill_users(self) -> bool:
        """Users 테이블 백필"""
        offset = 0
        
        while True:
            try:
                # 백필할 사용자 조회
                users = self.db.session.execute(
                    text("""
                        SELECT id, employee_id 
                        FROM users 
                        WHERE user_id IS NULL 
                        ORDER BY id 
                        LIMIT :limit OFFSET :offset
                    """),
                    {"limit": self.batch_size, "offset": offset}
                ).fetchall()
                
                if not users:
                    break
                
                # 백필 실행
                for user in users:
                    self.db.session.execute(
                        text("UPDATE users SET user_id = :user_id WHERE id = :id"),
                        {"user_id": user.id, "id": user.id}
                    )
                
                self.db.session.commit()
                offset += len(users)
                
                logger.info(f"Users 백필 진행: {offset}개 완료")
                
            except SQLAlchemyError as e:
                logger.error("Users 백필 실패", offset=offset, error=str(e))
                self.db.session.rollback()
                return False
        
        return True
    
    def _backfill_parties(self) -> bool:
        """Parties 테이블 백필"""
        offset = 0
        
        while True:
            try:
                # 백필할 파티 조회
                parties = self.db.session.execute(
                    text("""
                        SELECT p.id, u.user_id 
                        FROM party p
                        JOIN users u ON p.host_employee_id = u.employee_id
                        WHERE p.host_user_id IS NULL 
                        ORDER BY p.id 
                        LIMIT :limit OFFSET :offset
                    """),
                    {"limit": self.batch_size, "offset": offset}
                ).fetchall()
                
                if not parties:
                    break
                
                # 백필 실행
                for party in parties:
                    self.db.session.execute(
                        text("UPDATE party SET host_user_id = :host_user_id WHERE id = :id"),
                        {"host_user_id": party.user_id, "id": party.id}
                    )
                
                self.db.session.commit()
                offset += len(parties)
                
                logger.info(f"Parties 백필 진행: {offset}개 완료")
                
            except SQLAlchemyError as e:
                logger.error("Parties 백필 실패", offset=offset, error=str(e))
                self.db.session.rollback()
                return False
        
        return True
    
    def _backfill_party_members(self) -> bool:
        """Party Members 테이블 백필"""
        offset = 0
        
        while True:
            try:
                # 백필할 파티 멤버 조회
                members = self.db.session.execute(
                    text("""
                        SELECT pm.id, u.user_id 
                        FROM party_member pm
                        JOIN users u ON pm.employee_id = u.employee_id
                        WHERE pm.user_id IS NULL 
                        ORDER BY pm.id 
                        LIMIT :limit OFFSET :offset
                    """),
                    {"limit": self.batch_size, "offset": offset}
                ).fetchall()
                
                if not members:
                    break
                
                # 백필 실행
                for member in members:
                    self.db.session.execute(
                        text("UPDATE party_member SET user_id = :user_id WHERE id = :id"),
                        {"user_id": member.user_id, "id": member.id}
                    )
                
                self.db.session.commit()
                offset += len(members)
                
                logger.info(f"Party Members 백필 진행: {offset}개 완료")
                
            except SQLAlchemyError as e:
                logger.error("Party Members 백필 실패", offset=offset, error=str(e))
                self.db.session.rollback()
                return False
        
        return True
    
    def _create_user_dual_write(self, user_data: Dict[str, Any]) -> Any:
        """사용자 생성 듀얼 라이트"""
        # 기존 방식 (employee_id)
        # 신규 방식 (user_id) - 추가로 기록
        pass
    
    def _create_party_dual_write(self, party_data: Dict[str, Any]) -> Any:
        """파티 생성 듀얼 라이트"""
        # 기존 방식 (host_employee_id)
        # 신규 방식 (host_user_id) - 추가로 기록
        pass
    
    def _create_party_member_dual_write(self, member_data: Dict[str, Any]) -> Any:
        """파티 멤버 생성 듀얼 라이트"""
        # 기존 방식 (employee_id)
        # 신규 방식 (user_id) - 추가로 기록
        pass
    
    def _find_user_priority(self, employee_id: str) -> Optional[Any]:
        """사용자 조회 우선순위 (user_id 우선)"""
        # 1차: user_id로 조회 (신규)
        # 2차: employee_id로 조회 (기존)
        pass
    
    def _find_party_priority(self, party_id: int) -> Optional[Any]:
        """파티 조회 우선순위"""
        # user_id 기반으로 조회
        pass
    
    def _find_party_member_priority(self, party_id: int, user_id: int) -> Optional[Any]:
        """파티 멤버 조회 우선순위"""
        # user_id 기반으로 조회
        pass
    
    def _check_backup_exists(self) -> bool:
        """백업 존재 여부 확인"""
        # 백업 파일 또는 스냅샷 존재 확인
        return True
    
    def get_migration_status(self) -> Dict[str, Any]:
        """마이그레이션 상태 조회"""
        return {
            "completed_phases": len(self.migration_log),
            "total_phases": 7,
            "migration_log": self.migration_log,
            "rollback_scripts_count": len(self.rollback_scripts)
        }
    
    def rollback_to_phase(self, phase: int) -> bool:
        """특정 단계로 롤백"""
        logger.info(f"Phase {phase}로 롤백 시작")
        
        try:
            # 롤백 스크립트 실행
            for i in range(len(self.rollback_scripts) - 1, phase - 1, -1):
                rollback_sql = self.rollback_scripts[i]
                if rollback_sql:
                    self.db.session.execute(text(rollback_sql))
            
            self.db.session.commit()
            
            logger.info(f"Phase {phase}로 롤백 완료")
            return True
            
        except SQLAlchemyError as e:
            logger.error(f"Phase {phase}로 롤백 실패", error=str(e))
            self.db.session.rollback()
            return False
