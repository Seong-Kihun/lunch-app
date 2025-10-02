#!/usr/bin/env python3
"""
마이그레이션 검증 시스템
데이터 무결성과 일관성을 검증합니다.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
import structlog

logger = structlog.get_logger()


class MigrationValidator:
    """마이그레이션 검증 시스템"""
    
    def __init__(self, db):
        self.db = db
        self.validation_results = {}
    
    def validate_data_integrity(self) -> Dict[str, Any]:
        """데이터 무결성 검증"""
        logger.info("데이터 무결성 검증 시작")
        
        checks = [
            ('record_counts', self._check_record_counts),
            ('foreign_key_violations', self._check_foreign_key_violations),
            ('duplicate_keys', self._check_duplicate_keys),
            ('sample_data_consistency', self._check_sample_data_consistency),
            ('null_constraints', self._check_null_constraints),
            ('data_type_consistency', self._check_data_type_consistency)
        ]
        
        results = {}
        overall_valid = True
        
        for check_name, check_func in checks:
            try:
                check_result = check_func()
                results[check_name] = check_result
                
                if not check_result.get('valid', False):
                    overall_valid = False
                    
                logger.info(f"검증 완료: {check_name}", valid=check_result.get('valid'))
                
            except Exception as e:
                logger.error(f"검증 실패: {check_name}", error=str(e))
                results[check_name] = {
                    'valid': False,
                    'error': str(e)
                }
                overall_valid = False
        
        self.validation_results = results
        
        return {
            'overall_valid': overall_valid,
            'checks': results,
            'timestamp': datetime.utcnow().isoformat()
        }
    
    def _check_record_counts(self) -> Dict[str, Any]:
        """레코드 카운트 검증"""
        try:
            # 기존 테이블 카운트
            old_user_count = self.db.session.execute(
                text("SELECT COUNT(*) FROM users WHERE employee_id IS NOT NULL")
            ).scalar()
            
            # 새 테이블 카운트
            new_user_count = self.db.session.execute(
                text("SELECT COUNT(*) FROM users WHERE user_id IS NOT NULL")
            ).scalar()
            
            # 파티 카운트
            old_party_count = self.db.session.execute(
                text("SELECT COUNT(*) FROM party WHERE host_employee_id IS NOT NULL")
            ).scalar()
            
            new_party_count = self.db.session.execute(
                text("SELECT COUNT(*) FROM party WHERE host_user_id IS NOT NULL")
            ).scalar()
            
            # 파티 멤버 카운트
            old_member_count = self.db.session.execute(
                text("SELECT COUNT(*) FROM party_member WHERE employee_id IS NOT NULL")
            ).scalar()
            
            new_member_count = self.db.session.execute(
                text("SELECT COUNT(*) FROM party_member WHERE user_id IS NOT NULL")
            ).scalar()
            
            users_match = old_user_count == new_user_count
            parties_match = old_party_count == new_party_count
            members_match = old_member_count == new_member_count
            
            return {
                'valid': users_match and parties_match and members_match,
                'details': {
                    'users': {
                        'old_count': old_user_count,
                        'new_count': new_user_count,
                        'match': users_match
                    },
                    'parties': {
                        'old_count': old_party_count,
                        'new_count': new_party_count,
                        'match': parties_match
                    },
                    'members': {
                        'old_count': old_member_count,
                        'new_count': new_member_count,
                        'match': members_match
                    }
                }
            }
            
        except SQLAlchemyError as e:
            return {
                'valid': False,
                'error': str(e)
            }
    
    def _check_foreign_key_violations(self) -> Dict[str, Any]:
        """외래키 위반 검증"""
        try:
            violations = []
            
            # 파티 → 사용자 외래키 위반
            party_violations = self.db.session.execute(
                text("""
                    SELECT COUNT(*) 
                    FROM party p 
                    LEFT JOIN users u ON p.host_user_id = u.user_id 
                    WHERE p.host_user_id IS NOT NULL AND u.user_id IS NULL
                """)
            ).scalar()
            
            if party_violations > 0:
                violations.append(f"파티 테이블 외래키 위반: {party_violations}개")
            
            # 파티 멤버 → 사용자 외래키 위반
            member_user_violations = self.db.session.execute(
                text("""
                    SELECT COUNT(*) 
                    FROM party_member pm 
                    LEFT JOIN users u ON pm.user_id = u.user_id 
                    WHERE pm.user_id IS NOT NULL AND u.user_id IS NULL
                """)
            ).scalar()
            
            if member_user_violations > 0:
                violations.append(f"파티 멤버-사용자 외래키 위반: {member_user_violations}개")
            
            # 파티 멤버 → 파티 외래키 위반
            member_party_violations = self.db.session.execute(
                text("""
                    SELECT COUNT(*) 
                    FROM party_member pm 
                    LEFT JOIN party p ON pm.party_id = p.id 
                    WHERE p.id IS NULL
                """)
            ).scalar()
            
            if member_party_violations > 0:
                violations.append(f"파티 멤버-파티 외래키 위반: {member_party_violations}개")
            
            return {
                'valid': len(violations) == 0,
                'violations': violations,
                'total_violations': party_violations + member_user_violations + member_party_violations
            }
            
        except SQLAlchemyError as e:
            return {
                'valid': False,
                'error': str(e)
            }
    
    def _check_duplicate_keys(self) -> Dict[str, Any]:
        """중복 키 검증"""
        try:
            duplicates = []
            
            # 사용자 중복 user_id
            duplicate_users = self.db.session.execute(
                text("""
                    SELECT user_id, COUNT(*) 
                    FROM users 
                    WHERE user_id IS NOT NULL 
                    GROUP BY user_id 
                    HAVING COUNT(*) > 1
                """)
            ).fetchall()
            
            if duplicate_users:
                duplicates.append(f"중복 user_id: {len(duplicate_users)}개")
            
            # 파티 멤버 중복 (party_id, user_id)
            duplicate_members = self.db.session.execute(
                text("""
                    SELECT party_id, user_id, COUNT(*) 
                    FROM party_member 
                    WHERE user_id IS NOT NULL 
                    GROUP BY party_id, user_id 
                    HAVING COUNT(*) > 1
                """)
            ).fetchall()
            
            if duplicate_members:
                duplicates.append(f"중복 파티 멤버: {len(duplicate_members)}개")
            
            return {
                'valid': len(duplicates) == 0,
                'duplicates': duplicates,
                'total_duplicates': len(duplicate_users) + len(duplicate_members)
            }
            
        except SQLAlchemyError as e:
            return {
                'valid': False,
                'error': str(e)
            }
    
    def _check_sample_data_consistency(self) -> Dict[str, Any]:
        """샘플 데이터 일관성 검증"""
        try:
            inconsistencies = []
            
            # 샘플 사용자 데이터 일관성
            sample_users = self.db.session.execute(
                text("""
                    SELECT id, employee_id, user_id, nickname 
                    FROM users 
                    WHERE user_id IS NOT NULL 
                    LIMIT 10
                """)
            ).fetchall()
            
            for user in sample_users:
                # user_id가 id와 일치하는지 확인
                if user.user_id != user.id:
                    inconsistencies.append(f"사용자 {user.employee_id}: user_id({user.user_id}) != id({user.id})")
            
            # 샘플 파티 데이터 일관성
            sample_parties = self.db.session.execute(
                text("""
                    SELECT p.id, p.title, p.host_employee_id, p.host_user_id, u.employee_id
                    FROM party p
                    JOIN users u ON p.host_user_id = u.user_id
                    WHERE p.host_user_id IS NOT NULL
                    LIMIT 10
                """)
            ).fetchall()
            
            for party in sample_parties:
                # host_employee_id와 실제 사용자의 employee_id 일치 확인
                if party.host_employee_id != party.employee_id:
                    inconsistencies.append(f"파티 {party.title}: host_employee_id 불일치")
            
            return {
                'valid': len(inconsistencies) == 0,
                'inconsistencies': inconsistencies,
                'sample_size': len(sample_users) + len(sample_parties)
            }
            
        except SQLAlchemyError as e:
            return {
                'valid': False,
                'error': str(e)
            }
    
    def _check_null_constraints(self) -> Dict[str, Any]:
        """NULL 제약조건 검증"""
        try:
            null_violations = []
            
            # NOT NULL 제약조건이 적용된 후 NULL 값 확인
            null_users = self.db.session.execute(
                text("SELECT COUNT(*) FROM users WHERE user_id IS NULL")
            ).scalar()
            
            if null_users > 0:
                null_violations.append(f"Users 테이블 NULL user_id: {null_users}개")
            
            null_parties = self.db.session.execute(
                text("SELECT COUNT(*) FROM party WHERE host_user_id IS NULL")
            ).scalar()
            
            if null_parties > 0:
                null_violations.append(f"Party 테이블 NULL host_user_id: {null_parties}개")
            
            null_members = self.db.session.execute(
                text("SELECT COUNT(*) FROM party_member WHERE user_id IS NULL")
            ).scalar()
            
            if null_members > 0:
                null_violations.append(f"Party Member 테이블 NULL user_id: {null_members}개")
            
            return {
                'valid': len(null_violations) == 0,
                'null_violations': null_violations,
                'total_nulls': null_users + null_parties + null_members
            }
            
        except SQLAlchemyError as e:
            return {
                'valid': False,
                'error': str(e)
            }
    
    def _check_data_type_consistency(self) -> Dict[str, Any]:
        """데이터 타입 일관성 검증"""
        try:
            type_violations = []
            
            # user_id가 정수인지 확인
            invalid_users = self.db.session.execute(
                text("""
                    SELECT COUNT(*) 
                    FROM users 
                    WHERE user_id IS NOT NULL 
                    AND user_id !~ '^[0-9]+$'
                """)
            ).scalar()
            
            if invalid_users > 0:
                type_violations.append(f"Users 테이블 잘못된 user_id 타입: {invalid_users}개")
            
            # host_user_id가 정수인지 확인
            invalid_parties = self.db.session.execute(
                text("""
                    SELECT COUNT(*) 
                    FROM party 
                    WHERE host_user_id IS NOT NULL 
                    AND host_user_id !~ '^[0-9]+$'
                """)
            ).scalar()
            
            if invalid_parties > 0:
                type_violations.append(f"Party 테이블 잘못된 host_user_id 타입: {invalid_parties}개")
            
            return {
                'valid': len(type_violations) == 0,
                'type_violations': type_violations,
                'total_invalid': invalid_users + invalid_parties
            }
            
        except SQLAlchemyError as e:
            return {
                'valid': False,
                'error': str(e)
            }
    
    def validate_migration_completeness(self) -> Dict[str, Any]:
        """마이그레이션 완료도 검증"""
        try:
            completeness_checks = {
                'users_migrated': self._check_users_migration_completeness(),
                'parties_migrated': self._check_parties_migration_completeness(),
                'members_migrated': self._check_members_migration_completeness(),
                'constraints_applied': self._check_constraints_applied(),
                'indexes_created': self._check_indexes_created()
            }
            
            total_checks = len(completeness_checks)
            passed_checks = sum(1 for check in completeness_checks.values() if check)
            
            return {
                'complete': passed_checks == total_checks,
                'completeness_percentage': (passed_checks / total_checks) * 100,
                'checks': completeness_checks,
                'passed_checks': passed_checks,
                'total_checks': total_checks
            }
            
        except Exception as e:
            return {
                'complete': False,
                'error': str(e)
            }
    
    def _check_users_migration_completeness(self) -> bool:
        """사용자 마이그레이션 완료도 확인"""
        try:
            total_users = self.db.session.execute(
                text("SELECT COUNT(*) FROM users")
            ).scalar()
            
            migrated_users = self.db.session.execute(
                text("SELECT COUNT(*) FROM users WHERE user_id IS NOT NULL")
            ).scalar()
            
            return total_users == migrated_users and total_users > 0
            
        except SQLAlchemyError:
            return False
    
    def _check_parties_migration_completeness(self) -> bool:
        """파티 마이그레이션 완료도 확인"""
        try:
            total_parties = self.db.session.execute(
                text("SELECT COUNT(*) FROM party")
            ).scalar()
            
            migrated_parties = self.db.session.execute(
                text("SELECT COUNT(*) FROM party WHERE host_user_id IS NOT NULL")
            ).scalar()
            
            return total_parties == migrated_parties and total_parties > 0
            
        except SQLAlchemyError:
            return False
    
    def _check_members_migration_completeness(self) -> bool:
        """파티 멤버 마이그레이션 완료도 확인"""
        try:
            total_members = self.db.session.execute(
                text("SELECT COUNT(*) FROM party_member")
            ).scalar()
            
            migrated_members = self.db.session.execute(
                text("SELECT COUNT(*) FROM party_member WHERE user_id IS NOT NULL")
            ).scalar()
            
            return total_members == migrated_members and total_members > 0
            
        except SQLAlchemyError:
            return False
    
    def _check_constraints_applied(self) -> bool:
        """제약조건 적용 여부 확인"""
        try:
            # NOT NULL 제약조건 확인
            constraints = self.db.session.execute(
                text("""
                    SELECT constraint_name 
                    FROM information_schema.table_constraints 
                    WHERE table_name IN ('users', 'party', 'party_member')
                    AND constraint_type = 'NOT NULL'
                """)
            ).fetchall()
            
            return len(constraints) > 0
            
        except SQLAlchemyError:
            return False
    
    def _check_indexes_created(self) -> bool:
        """인덱스 생성 여부 확인"""
        try:
            indexes = self.db.session.execute(
                text("""
                    SELECT indexname 
                    FROM pg_indexes 
                    WHERE tablename IN ('users', 'party', 'party_member')
                    AND indexname LIKE '%user_id%'
                """)
            ).fetchall()
            
            return len(indexes) > 0
            
        except SQLAlchemyError:
            return False
    
    def generate_validation_report(self) -> Dict[str, Any]:
        """검증 리포트 생성"""
        integrity_results = self.validate_data_integrity()
        completeness_results = self.validate_migration_completeness()
        
        return {
            'timestamp': datetime.utcnow().isoformat(),
            'integrity': integrity_results,
            'completeness': completeness_results,
            'overall_status': {
                'valid': integrity_results['overall_valid'] and completeness_results['complete'],
                'ready_for_production': (
                    integrity_results['overall_valid'] and 
                    completeness_results['completeness_percentage'] >= 100
                )
            }
        }
