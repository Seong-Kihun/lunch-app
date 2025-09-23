"""
애플리케이션 모니터링 시스템
시스템 리소스, 데이터베이스 상태, API 성능을 실시간으로 모니터링
"""
import logging
import time
import psutil
import threading
from typing import Dict, List, Optional, Any, Callable
from datetime import datetime, timedelta
from flask import current_app, g
from sqlalchemy import text
import json

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AppMonitor:
    """애플리케이션 모니터링 시스템"""
    
    def __init__(self, app, db):
        self.app = app
        self.db = db
        self.monitoring_active = False
        self.monitoring_thread = None
        self.metrics_history = []
        self.alert_callbacks = []
        self.thresholds = {
            'cpu_usage': 80.0,      # CPU 사용률 80% 이상 시 알림
            'memory_usage': 85.0,   # 메모리 사용률 85% 이상 시 알림
            'disk_usage': 90.0,     # 디스크 사용률 90% 이상 시 알림
            'response_time': 2.0,   # 응답 시간 2초 이상 시 알림
            'error_rate': 5.0,      # 에러율 5% 이상 시 알림
            'db_connections': 80,   # DB 연결 수 80개 이상 시 알림
        }
        
        # 모니터링 간격 (초)
        self.monitoring_interval = 30
        
        # 메트릭 저장 기간 (24시간)
        self.metrics_retention_hours = 24
        
        # 알림 설정
        self.alert_settings = {
            'email_alerts': False,
            'slack_alerts': False,
            'console_alerts': True,
            'alert_cooldown': 300  # 5분간 중복 알림 방지
        }
        
        # 마지막 알림 시간
        self.last_alerts = {}
    
    def start_monitoring(self):
        """모니터링 시작"""
        if self.monitoring_active:
            logger.info("⚠️ 모니터링이 이미 실행 중입니다.")
            return
        
        try:
            self.monitoring_active = True
            self.monitoring_thread = threading.Thread(target=self._monitoring_loop, daemon=True)
            self.monitoring_thread.start()
            
            logger.info("✅ 애플리케이션 모니터링이 시작되었습니다.")
            logger.info(f"   - 모니터링 간격: {self.monitoring_interval}초")
            logger.info(f"   - 메트릭 보관: {self.metrics_retention_hours}시간")
            
        except Exception as e:
            logger.error(f"❌ 모니터링 시작 실패: {e}")
            self.monitoring_active = False
    
    def stop_monitoring(self):
        """모니터링 중지"""
        if not self.monitoring_active:
            return
        
        try:
            self.monitoring_active = False
            if self.monitoring_thread:
                self.monitoring_thread.join(timeout=5)
            
            logger.info("✅ 애플리케이션 모니터링이 중지되었습니다.")
            
        except Exception as e:
            logger.error(f"❌ 모니터링 중지 실패: {e}")
    
    def _monitoring_loop(self):
        """모니터링 루프"""
        while self.monitoring_active:
            try:
                # 시스템 메트릭 수집
                system_metrics = self._collect_system_metrics()
                
                # 데이터베이스 메트릭 수집
                db_metrics = self._collect_database_metrics()
                
                # 애플리케이션 메트릭 수집
                app_metrics = self._collect_application_metrics()
                
                # 통합 메트릭 생성
                combined_metrics = {
                    'timestamp': datetime.now().isoformat(),
                    'system': system_metrics,
                    'database': db_metrics,
                    'application': app_metrics
                }
                
                # 메트릭 저장
                self._store_metrics(combined_metrics)
                
                # 임계값 검사 및 알림
                self._check_thresholds_and_alert(combined_metrics)
                
                # 오래된 메트릭 정리
                self._cleanup_old_metrics()
                
                # 대기
                time.sleep(self.monitoring_interval)
                
            except Exception as e:
                logger.error(f"❌ 모니터링 루프 오류: {e}")
                time.sleep(10)  # 오류 시 10초 대기
    
    def _collect_system_metrics(self) -> Dict[str, Any]:
        """시스템 메트릭 수집"""
        try:
            # CPU 사용률
            cpu_percent = psutil.cpu_percent(interval=1)
            
            # 메모리 사용률
            memory = psutil.virtual_memory()
            memory_percent = memory.percent
            
            # 디스크 사용률
            disk = psutil.disk_usage('/')
            disk_percent = disk.percent
            
            # 네트워크 I/O
            network = psutil.net_io_counters()
            
            # 프로세스 정보
            process = psutil.Process()
            process_cpu = process.cpu_percent()
            process_memory = process.memory_info().rss / 1024 / 1024  # MB
            
            return {
                'cpu_percent': cpu_percent,
                'memory_percent': memory_percent,
                'memory_available': memory.available / 1024 / 1024 / 1024,  # GB
                'disk_percent': disk_percent,
                'disk_free': disk.free / 1024 / 1024 / 1024,  # GB
                'network_bytes_sent': network.bytes_sent,
                'network_bytes_recv': network.bytes_recv,
                'process_cpu': process_cpu,
                'process_memory_mb': process_memory
            }
            
        except Exception as e:
            logger.error(f"❌ 시스템 메트릭 수집 실패: {e}")
            return {'error': str(e)}
    
    def _collect_database_metrics(self) -> Dict[str, Any]:
        """데이터베이스 메트릭 수집"""
        try:
            metrics = {}
            
            # 데이터베이스 연결 상태 확인
            try:
                with self.db.engine.connect() as conn:
                    result = conn.execute(text("SELECT 1"))
                    metrics['connection_status'] = 'healthy'
                    metrics['connection_test'] = True
            except Exception as e:
                metrics['connection_status'] = 'unhealthy'
                metrics['connection_test'] = False
                metrics['connection_error'] = str(e)
            
            # 테이블 크기 및 행 수 확인
            try:
                with self.db.engine.connect() as conn:
                    # 테이블 목록 조회
                    result = conn.execute(text("""
                        SELECT table_name 
                        FROM information_schema.tables 
                        WHERE table_schema = 'public'
                    """))
                    tables = [row[0] for row in result]
                    
                    table_metrics = {}
                    for table in tables[:10]:  # 상위 10개 테이블만
                        try:
                            # 행 수 조회
                            count_result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                            row_count = count_result.scalar()
                            
                            # 테이블 크기 조회 (PostgreSQL)
                            size_result = conn.execute(text(f"""
                                SELECT pg_size_pretty(pg_total_relation_size('{table}'::regclass))
                            """))
                            size = size_result.scalar()
                            
                            table_metrics[table] = {
                                'row_count': row_count,
                                'size': size
                            }
                        except Exception as e:
                            table_metrics[table] = {'error': str(e)}
                    
                    metrics['tables'] = table_metrics
                    
            except Exception as e:
                metrics['tables_error'] = str(e)
            
            return metrics
            
        except Exception as e:
            logger.error(f"❌ 데이터베이스 메트릭 수집 실패: {e}")
            return {'error': str(e)}
    
    def _collect_application_metrics(self) -> Dict[str, Any]:
        """애플리케이션 메트릭 수집"""
        try:
            metrics = {}
            
            # Flask 앱 상태
            metrics['flask_debug'] = self.app.config.get('DEBUG', False)
            metrics['flask_env'] = self.app.config.get('ENV', 'production')
            
            # 활성 요청 수 (Flask g 객체에서)
            if hasattr(g, 'request_count'):
                metrics['active_requests'] = g.request_count
            else:
                metrics['active_requests'] = 0
            
            # 메트릭 히스토리 길이
            metrics['metrics_history_length'] = len(self.metrics_history)
            
            # 마지막 메트릭 수집 시간
            if self.metrics_history:
                last_metric_time = datetime.fromisoformat(self.metrics_history[-1]['timestamp'])
                metrics['last_collection'] = (datetime.now() - last_metric_time).total_seconds()
            else:
                metrics['last_collection'] = 0
            
            return metrics
            
        except Exception as e:
            logger.error(f"❌ 애플리케이션 메트릭 수집 실패: {e}")
            return {'error': str(e)}
    
    def _store_metrics(self, metrics: Dict[str, Any]):
        """메트릭 저장"""
        try:
            self.metrics_history.append(metrics)
            
            # 메트릭 수 제한 (메모리 사용량 제어)
            max_metrics = (24 * 60 * 60) // self.monitoring_interval  # 24시간치
            if len(self.metrics_history) > max_metrics:
                self.metrics_history = self.metrics_history[-max_metrics:]
            
        except Exception as e:
            logger.error(f"❌ 메트릭 저장 실패: {e}")
    
    def _check_thresholds_and_alert(self, metrics: Dict[str, Any]):
        """임계값 검사 및 알림"""
        try:
            current_time = datetime.now()
            
            # CPU 사용률 검사
            if 'system' in metrics and 'cpu_percent' in metrics['system']:
                cpu_usage = metrics['system']['cpu_percent']
                if cpu_usage > self.thresholds['cpu_usage']:
                    self._send_alert('high_cpu_usage', {
                        'current': cpu_usage,
                        'threshold': self.thresholds['cpu_usage'],
                        'message': f"CPU 사용률이 {cpu_usage:.1f}%로 임계값 {self.thresholds['cpu_usage']}%를 초과했습니다."
                    }, current_time)
            
            # 메모리 사용률 검사
            if 'system' in metrics and 'memory_percent' in metrics['system']:
                memory_usage = metrics['system']['memory_percent']
                if memory_usage > self.thresholds['memory_usage']:
                    self._send_alert('high_memory_usage', {
                        'current': memory_usage,
                        'threshold': self.thresholds['memory_usage'],
                        'message': f"메모리 사용률이 {memory_usage:.1f}%로 임계값 {self.thresholds['memory_usage']}%를 초과했습니다."
                    }, current_time)
            
            # 디스크 사용률 검사
            if 'system' in metrics and 'disk_percent' in metrics['system']:
                disk_usage = metrics['system']['disk_percent']
                if disk_usage > self.thresholds['disk_usage']:
                    self._send_alert('high_disk_usage', {
                        'current': disk_usage,
                        'threshold': self.thresholds['disk_usage'],
                        'message': f"디스크 사용률이 {disk_usage:.1f}%로 임계값 {self.thresholds['disk_usage']}%를 초과했습니다."
                    }, current_time)
            
            # 데이터베이스 연결 상태 검사
            if 'database' in metrics and 'connection_status' in metrics['database']:
                if metrics['database']['connection_status'] == 'unhealthy':
                    self._send_alert('database_connection_failed', {
                        'status': metrics['database']['connection_status'],
                        'error': metrics['database'].get('connection_error', 'Unknown error'),
                        'message': "데이터베이스 연결에 실패했습니다."
                    }, current_time)
            
        except Exception as e:
            logger.error(f"❌ 임계값 검사 실패: {e}")
    
    def _send_alert(self, alert_type: str, alert_data: Dict[str, Any], current_time: datetime):
        """알림 전송"""
        try:
            # 중복 알림 방지
            if alert_type in self.last_alerts:
                time_since_last = (current_time - self.last_alerts[alert_type]).total_seconds()
                if time_since_last < self.alert_settings['alert_cooldown']:
                    return
            
            # 알림 데이터 구성
            alert = {
                'type': alert_type,
                'timestamp': current_time.isoformat(),
                'severity': 'warning',
                'data': alert_data
            }
            
            # 콘솔 알림
            if self.alert_settings['console_alerts']:
                logger.warning(f"🚨 알림: {alert_data['message']}")
                logger.warning(f"   타입: {alert_type}")
                logger.warning(f"   시간: {current_time.strftime('%Y-%m-%d %H:%M:%S')}")
            
            # 콜백 함수 실행
            for callback in self.alert_callbacks:
                try:
                    callback(alert)
                except Exception as e:
                    logger.error(f"❌ 알림 콜백 실행 실패: {e}")
            
            # 마지막 알림 시간 업데이트
            self.last_alerts[alert_type] = current_time
            
        except Exception as e:
            logger.error(f"❌ 알림 전송 실패: {e}")
    
    def add_alert_callback(self, callback: Callable[[Dict[str, Any]], None]):
        """알림 콜백 함수 추가"""
        self.alert_callbacks.append(callback)
    
    def get_current_metrics(self) -> Dict[str, Any]:
        """현재 메트릭 조회"""
        if not self.metrics_history:
            return {'message': '아직 수집된 메트릭이 없습니다.'}
        
        return self.metrics_history[-1]
    
    def get_metrics_history(self, hours: int = 24) -> List[Dict[str, Any]]:
        """메트릭 히스토리 조회"""
        try:
            if not self.metrics_history:
                return []
            
            cutoff_time = datetime.now() - timedelta(hours=hours)
            
            filtered_metrics = [
                metric for metric in self.metrics_history
                if datetime.fromisoformat(metric['timestamp']) > cutoff_time
            ]
            
            return filtered_metrics
            
        except Exception as e:
            logger.error(f"❌ 메트릭 히스토리 조회 실패: {e}")
            return []
    
    def get_metrics_summary(self, hours: int = 24) -> Dict[str, Any]:
        """메트릭 요약 생성"""
        try:
            metrics = self.get_metrics_history(hours)
            if not metrics:
                return {'message': '수집된 메트릭이 없습니다.'}
            
            summary = {
                'period_hours': hours,
                'total_metrics': len(metrics),
                'first_metric': metrics[0]['timestamp'],
                'last_metric': metrics[-1]['timestamp']
            }
            
            # 시스템 메트릭 평균
            if 'system' in metrics[0]:
                cpu_values = [m['system'].get('cpu_percent', 0) for m in metrics if 'system' in m]
                memory_values = [m['system'].get('memory_percent', 0) for m in metrics if 'system' in m]
                
                if cpu_values:
                    summary['avg_cpu_usage'] = sum(cpu_values) / len(cpu_values)
                if memory_values:
                    summary['avg_memory_usage'] = sum(memory_values) / len(memory_values)
            
            # 알림 통계
            alert_counts = {}
            for metric in metrics:
                if 'alerts' in metric:
                    for alert in metric['alerts']:
                        alert_type = alert['type']
                        alert_counts[alert_type] = alert_counts.get(alert_type, 0) + 1
            
            summary['alerts'] = alert_counts
            
            return summary
            
        except Exception as e:
            logger.error(f"❌ 메트릭 요약 생성 실패: {e}")
            return {'error': str(e)}
    
    def _cleanup_old_metrics(self):
        """오래된 메트릭 정리"""
        try:
            cutoff_time = datetime.now() - timedelta(hours=self.metrics_retention_hours)
            
            self.metrics_history = [
                metric for metric in self.metrics_history
                if datetime.fromisoformat(metric['timestamp']) > cutoff_time
            ]
            
        except Exception as e:
            logger.error(f"❌ 오래된 메트릭 정리 실패: {e}")
    
    def update_thresholds(self, new_thresholds: Dict[str, float]):
        """임계값 업데이트"""
        try:
            for key, value in new_thresholds.items():
                if key in self.thresholds:
                    self.thresholds[key] = value
                    logger.info(f"✅ 임계값 업데이트: {key} = {value}")
                else:
                    logger.warning(f"⚠️ 알 수 없는 임계값: {key}")
            
        except Exception as e:
            logger.error(f"❌ 임계값 업데이트 실패: {e}")
    
    def get_monitoring_status(self) -> Dict[str, Any]:
        """모니터링 상태 조회"""
        return {
            'active': self.monitoring_active,
            'interval_seconds': self.monitoring_interval,
            'metrics_count': len(self.metrics_history),
            'thresholds': self.thresholds,
            'alert_settings': self.alert_settings,
            'last_metrics': self.get_current_metrics()
        }

# 개발 환경에서 테스트용 함수
if __name__ == '__main__':
    print("🧪 애플리케이션 모니터링 시스템 테스트")
    
    # Mock 객체로 테스트
    class MockApp:
        def __init__(self):
            self.config = {'DEBUG': True, 'ENV': 'development'}
    
    class MockDB:
        def __init__(self):
            self.engine = None
    
    # 테스트 실행
    mock_app = MockApp()
    mock_db = MockDB()
    
    monitor = AppMonitor(mock_app, mock_db)
    
    # 모니터링 상태 확인
    status = monitor.get_monitoring_status()
    print(f"모니터링 상태: {status}")
    
    # 임계값 업데이트 테스트
    monitor.update_thresholds({'cpu_usage': 90.0})
    print(f"업데이트된 임계값: {monitor.thresholds}")
    
    # 알림 콜백 테스트
    def test_alert_callback(alert):
        print(f"🚨 테스트 알림: {alert['type']}")
    
    monitor.add_alert_callback(test_alert_callback)
    print("✅ 알림 콜백이 추가되었습니다.")
