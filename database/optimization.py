"""
데이터베이스 최적화 도구
인덱스 최적화, 쿼리 분석, 성능 튜닝을 위한 도구들
"""
import logging
from typing import Dict, List, Optional, Tuple
from sqlalchemy import text, inspect, Index, create_engine
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime, timedelta

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DatabaseOptimizer:
    """데이터베이스 최적화 도구"""
    
    def __init__(self, db):
        self.db = db
        self.engine = db.engine
        self.inspector = inspect(self.engine)
        
        # 최적화 권장사항
        self.optimization_recommendations = {
            'missing_indexes': [],
            'unused_indexes': [],
            'slow_queries': [],
            'table_optimizations': []
        }
    
    def analyze_database_structure(self) -> Dict[str, any]:
        """데이터베이스 구조 분석"""
        try:
            analysis = {
                'tables': {},
                'total_tables': 0,
                'total_indexes': 0,
                'total_foreign_keys': 0,
                'timestamp': datetime.now().isoformat()
            }
            
            # 테이블 정보 수집
            for table_name in self.inspector.get_table_names():
                table_info = {
                    'name': table_name,
                    'columns': len(self.inspector.get_columns(table_name)),
                    'indexes': len(self.inspector.get_indexes(table_name)),
                    'foreign_keys': len(self.inspector.get_foreign_keys(table_name)),
                    'primary_keys': len(self.inspector.get_pk_constraint(table_name)['constrained_columns']),
                    'estimated_rows': self._estimate_table_rows(table_name)
                }
                
                analysis['tables'][table_name] = table_info
                analysis['total_tables'] += 1
                analysis['total_indexes'] += table_info['indexes']
                analysis['total_foreign_keys'] += table_info['foreign_keys']
            
            logger.info(f"✅ 데이터베이스 구조 분석 완료: {analysis['total_tables']}개 테이블")
            return analysis
            
        except Exception as e:
            logger.error(f"❌ 데이터베이스 구조 분석 실패: {e}")
            return {'error': str(e)}
    
    def analyze_query_performance(self, query: str, params: Dict = None) -> Dict[str, any]:
        """쿼리 성능 분석"""
        try:
            start_time = datetime.now()
            
            # 실행 계획 분석
            explain_query = f"EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {query}"
            with self.engine.connect() as conn:
                result = conn.execute(text(explain_query), params or {})
                execution_plan = result.fetchone()
            
            # 실제 쿼리 실행
            with self.engine.connect() as conn:
                result = conn.execute(text(query), params or {})
                rows = result.fetchall()
            
            execution_time = (datetime.now() - start_time).total_seconds()
            
            analysis = {
                'query': query,
                'execution_time': execution_time,
                'rows_returned': len(rows),
                'execution_plan': execution_plan[0] if execution_plan else None,
                'timestamp': datetime.now().isoformat()
            }
            
            # 성능 분석 결과
            if execution_time > 1.0:  # 1초 이상 걸리는 쿼리
                analysis['performance_issue'] = 'slow_query'
                analysis['recommendation'] = '인덱스 추가 또는 쿼리 최적화 필요'
            elif execution_time > 0.5:  # 0.5초 이상 걸리는 쿼리
                analysis['performance_issue'] = 'moderate_query'
                analysis['recommendation'] = '모니터링 필요'
            else:
                analysis['performance_issue'] = 'fast_query'
                analysis['recommendation'] = '성능 양호'
            
            logger.info(f"✅ 쿼리 성능 분석 완료: {execution_time:.3f}초")
            return analysis
            
        except Exception as e:
            logger.error(f"❌ 쿼리 성능 분석 실패: {e}")
            return {'error': str(e)}
    
    def find_missing_indexes(self) -> List[Dict[str, any]]:
        """누락된 인덱스 찾기"""
        try:
            missing_indexes = []
            
            # 자주 조회되는 컬럼들에 대한 인덱스 필요성 분석
            common_query_patterns = [
                # 사용자 관련
                {'table': 'users', 'columns': ['employee_id'], 'type': 'unique'},
                {'table': 'users', 'columns': ['email'], 'type': 'unique'},
                {'table': 'users', 'columns': ['department'], 'type': 'index'},
                
                # 파티 관련
                {'table': 'parties', 'columns': ['host_employee_id'], 'type': 'index'},
                {'table': 'parties', 'columns': ['party_date'], 'type': 'index'},
                {'table': 'parties', 'columns': ['restaurant_name'], 'type': 'index'},
                {'table': 'parties', 'columns': ['status'], 'type': 'index'},
                
                # 일정 관련
                {'table': 'schedules', 'columns': ['employee_id'], 'type': 'index'},
                {'table': 'schedules', 'columns': ['schedule_date'], 'type': 'index'},
                {'table': 'schedules', 'columns': ['schedule_type'], 'type': 'index'},
                
                # 참여자 관련
                {'table': 'party_participants', 'columns': ['party_id'], 'type': 'index'},
                {'table': 'party_participants', 'columns': ['employee_id'], 'type': 'index'},
                
                # 댓글 관련
                {'table': 'comments', 'columns': ['party_id'], 'type': 'index'},
                {'table': 'comments', 'columns': ['employee_id'], 'type': 'index'},
                {'table': 'comments', 'columns': ['created_at'], 'type': 'index'}
            ]
            
            for pattern in common_query_patterns:
                table_name = pattern['table']
                columns = pattern['columns']
                index_type = pattern['type']
                
                # 테이블이 존재하는지 확인
                if table_name not in self.inspector.get_table_names():
                    continue
                
                # 기존 인덱스 확인
                existing_indexes = self.inspector.get_indexes(table_name)
                index_name = f"idx_{table_name}_{'_'.join(columns)}"
                
                # 인덱스가 이미 존재하는지 확인
                index_exists = any(
                    idx['name'] == index_name or 
                    set(idx['column_names']) == set(columns)
                    for idx in existing_indexes
                )
                
                if not index_exists:
                    missing_indexes.append({
                        'table': table_name,
                        'columns': columns,
                        'type': index_type,
                        'suggested_name': index_name,
                        'priority': 'high' if 'id' in columns[0] else 'medium',
                        'reason': f"{', '.join(columns)} 컬럼에 대한 {index_type} 인덱스 필요"
                    })
            
            logger.info(f"✅ 누락된 인덱스 분석 완료: {len(missing_indexes)}개 발견")
            return missing_indexes
            
        except Exception as e:
            logger.error(f"❌ 누락된 인덱스 분석 실패: {e}")
            return []
    
    def find_unused_indexes(self) -> List[Dict[str, any]]:
        """사용되지 않는 인덱스 찾기"""
        try:
            unused_indexes = []
            
            # PostgreSQL의 pg_stat_user_indexes 뷰를 사용하여 인덱스 사용 통계 확인
            if 'postgresql' in str(self.engine.url):
                query = """
                SELECT 
                    schemaname,
                    tablename,
                    indexname,
                    idx_scan as index_scans,
                    idx_tup_read as tuples_read,
                    idx_tup_fetch as tuples_fetched
                FROM pg_stat_user_indexes 
                WHERE idx_scan = 0 
                AND indexname NOT LIKE '%_pkey'
                ORDER BY tablename, indexname
                """
                
                with self.engine.connect() as conn:
                    result = conn.execute(text(query))
                    for row in result:
                        unused_indexes.append({
                            'table': row.tablename,
                            'index': row.indexname,
                            'scans': row.index_scans,
                            'tuples_read': row.tuples_read,
                            'tuples_fetched': row.tuples_fetched,
                            'recommendation': '사용되지 않는 인덱스 - 제거 고려'
                        })
            
            logger.info(f"✅ 사용되지 않는 인덱스 분석 완료: {len(unused_indexes)}개 발견")
            return unused_indexes
            
        except Exception as e:
            logger.error(f"❌ 사용되지 않는 인덱스 분석 실패: {e}")
            return []
    
    def create_recommended_indexes(self) -> Dict[str, any]:
        """권장 인덱스 생성"""
        try:
            missing_indexes = self.find_missing_indexes()
            created_indexes = []
            failed_indexes = []
            
            for index_info in missing_indexes:
                try:
                    # 인덱스 생성 SQL
                    if index_info['type'] == 'unique':
                        sql = f"""
                        CREATE UNIQUE INDEX {index_info['suggested_name']} 
                        ON {index_info['table']} ({', '.join(index_info['columns'])})
                        """
                    else:
                        sql = f"""
                        CREATE INDEX {index_info['suggested_name']} 
                        ON {index_info['table']} ({', '.join(index_info['columns'])})
                        """
                    
                    with self.engine.connect() as conn:
                        conn.execute(text(sql))
                        conn.commit()
                    
                    created_indexes.append({
                        'table': index_info['table'],
                        'index_name': index_info['suggested_name'],
                        'columns': index_info['columns'],
                        'type': index_info['type']
                    })
                    
                    logger.info(f"✅ 인덱스 생성 성공: {index_info['suggested_name']}")
                    
                except Exception as e:
                    failed_indexes.append({
                        'table': index_info['table'],
                        'index_name': index_info['suggested_name'],
                        'error': str(e)
                    })
                    logger.error(f"❌ 인덱스 생성 실패: {index_info['suggested_name']} - {e}")
            
            result = {
                'created_count': len(created_indexes),
                'failed_count': len(failed_indexes),
                'created_indexes': created_indexes,
                'failed_indexes': failed_indexes,
                'timestamp': datetime.now().isoformat()
            }
            
            logger.info(f"✅ 인덱스 생성 완료: {len(created_indexes)}개 성공, {len(failed_indexes)}개 실패")
            return result
            
        except Exception as e:
            logger.error(f"❌ 인덱스 생성 실패: {e}")
            return {'error': str(e)}
    
    def analyze_table_performance(self) -> Dict[str, any]:
        """테이블 성능 분석"""
        try:
            table_analysis = {}
            
            for table_name in self.inspector.get_table_names():
                try:
                    # 테이블 크기 및 통계 정보
                    size_query = f"""
                    SELECT 
                        pg_size_pretty(pg_total_relation_size('{table_name}'::regclass)) as total_size,
                        pg_size_pretty(pg_relation_size('{table_name}'::regclass)) as table_size,
                        pg_size_pretty(pg_total_relation_size('{table_name}'::regclass) - 
                                     pg_relation_size('{table_name}'::regclass)) as index_size,
                        (SELECT count(*) FROM {table_name}) as row_count
                    """
                    
                    with self.engine.connect() as conn:
                        result = conn.execute(text(size_query))
                        stats = result.fetchone()
                        
                        if stats:
                            table_analysis[table_name] = {
                                'total_size': stats.total_size,
                                'table_size': stats.table_size,
                                'index_size': stats.index_size,
                                'row_count': stats.row_count,
                                'recommendations': []
                            }
                            
                            # 성능 권장사항 생성
                            if stats.row_count > 10000:
                                table_analysis[table_name]['recommendations'].append(
                                    '대용량 테이블 - 파티셔닝 고려'
                                )
                            
                            if stats.index_size and '0 bytes' not in stats.index_size:
                                table_analysis[table_name]['recommendations'].append(
                                    '인덱스 크기 적절'
                                )
                            else:
                                table_analysis[table_name]['recommendations'].append(
                                    '인덱스 부족 - 추가 인덱스 필요'
                                )
                
                except Exception as e:
                    logger.warning(f"⚠️ 테이블 {table_name} 분석 실패: {e}")
                    continue
            
            logger.info(f"✅ 테이블 성능 분석 완료: {len(table_analysis)}개 테이블")
            return table_analysis
            
        except Exception as e:
            logger.error(f"❌ 테이블 성능 분석 실패: {e}")
            return {'error': str(e)}
    
    def generate_optimization_report(self) -> Dict[str, any]:
        """최적화 보고서 생성"""
        try:
            report = {
                'timestamp': datetime.now().isoformat(),
                'database_structure': self.analyze_database_structure(),
                'missing_indexes': self.find_missing_indexes(),
                'unused_indexes': self.find_unused_indexes(),
                'table_performance': self.analyze_table_performance(),
                'recommendations': [],
                'priority_actions': []
            }
            
            # 종합 권장사항 생성
            if report['missing_indexes']:
                report['recommendations'].append({
                    'type': 'index_creation',
                    'priority': 'high',
                    'description': f"{len(report['missing_indexes'])}개의 누락된 인덱스 생성 필요",
                    'action': 'create_recommended_indexes() 실행'
                })
                report['priority_actions'].append('누락된 인덱스 생성')
            
            if report['unused_indexes']:
                report['recommendations'].append({
                    'type': 'index_cleanup',
                    'priority': 'medium',
                    'description': f"{len(report['unused_indexes'])}개의 사용되지 않는 인덱스 제거 고려",
                    'action': '사용되지 않는 인덱스 분석 후 제거'
                })
            
            # 성능 개선 기회 식별
            slow_tables = [
                table for table, info in report['table_performance'].items()
                if '대용량 테이블' in info.get('recommendations', [])
            ]
            
            if slow_tables:
                report['recommendations'].append({
                    'type': 'table_optimization',
                    'priority': 'medium',
                    'description': f"{len(slow_tables)}개의 대용량 테이블 최적화 필요",
                    'action': '테이블 파티셔닝 또는 아카이빙 고려'
                })
            
            logger.info(f"✅ 최적화 보고서 생성 완료: {len(report['recommendations'])}개 권장사항")
            return report
            
        except Exception as e:
            logger.error(f"❌ 최적화 보고서 생성 실패: {e}")
            return {'error': str(e)}
    
    def _estimate_table_rows(self, table_name: str) -> int:
        """테이블 행 수 추정"""
        try:
            with self.engine.connect() as conn:
                result = conn.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
                return result.scalar() or 0
        except:
            return 0

# 개발 환경에서 테스트용 함수
if __name__ == '__main__':
    print("🧪 데이터베이스 최적화 도구 테스트")
    
    # Mock 객체로 테스트
    class MockDB:
        pass
    
    class MockEngine:
        pass
    
    class MockInspector:
        def get_table_names(self):
            return ['users', 'parties', 'schedules']
        
        def get_columns(self, table_name):
            return [{'name': 'id'}, {'name': 'name'}]
        
        def get_indexes(self, table_name):
            return []
        
        def get_foreign_keys(self, table_name):
            return []
        
        def get_pk_constraint(self, table_name):
            return {'constrained_columns': ['id']}
    
    # 테스트 실행
    mock_db = MockDB()
    mock_db.engine = MockEngine()
    mock_db.engine.url = 'postgresql://test'
    
    optimizer = DatabaseOptimizer(mock_db)
    optimizer.inspector = MockInspector()
    
    # 구조 분석 테스트
    structure_analysis = optimizer.analyze_database_structure()
    print(f"데이터베이스 구조 분석: {structure_analysis}")
    
    # 누락된 인덱스 분석 테스트
    missing_indexes = optimizer.find_missing_indexes()
    print(f"누락된 인덱스: {len(missing_indexes)}개")
    
    # 최적화 보고서 생성 테스트
    optimization_report = optimizer.generate_optimization_report()
    print(f"최적화 보고서: {len(optimization_report.get('recommendations', []))}개 권장사항")
