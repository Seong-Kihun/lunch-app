#!/usr/bin/env python3
"""
베이스라인 성능 측정 스크립트
현재 시스템의 성능 기준치를 측정하고 저장합니다.
"""

import os
import sys
import time
import json
import psutil
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Any
import argparse

# 프로젝트 루트를 Python 경로에 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.monitoring.baseline_metrics import baseline_metrics


class BaselineCapture:
    """베이스라인 성능 캡처 클래스"""
    
    def __init__(self, base_url: str = "http://localhost:5000"):
        self.base_url = base_url
        self.results = {}
        self.start_time = datetime.now()
    
    def capture_system_metrics(self) -> Dict[str, Any]:
        """시스템 메트릭 캡처"""
        print("📊 시스템 메트릭 캡처 중...")
        
        # CPU 사용률
        cpu_percent = psutil.cpu_percent(interval=1)
        cpu_count = psutil.cpu_count()
        
        # 메모리 사용률
        memory = psutil.virtual_memory()
        memory_percent = memory.percent
        memory_available = memory.available
        memory_total = memory.total
        
        # 디스크 사용률
        disk = psutil.disk_usage('/')
        disk_percent = (disk.used / disk.total) * 100
        
        # 네트워크 통계
        network = psutil.net_io_counters()
        
        system_metrics = {
            'timestamp': datetime.now().isoformat(),
            'cpu': {
                'percent': cpu_percent,
                'count': cpu_count,
                'load_average': os.getloadavg() if hasattr(os, 'getloadavg') else None
            },
            'memory': {
                'percent': memory_percent,
                'available_bytes': memory_available,
                'total_bytes': memory_total,
                'used_bytes': memory_total - memory_available
            },
            'disk': {
                'percent': disk_percent,
                'total_bytes': disk.total,
                'used_bytes': disk.used,
                'free_bytes': disk.free
            },
            'network': {
                'bytes_sent': network.bytes_sent,
                'bytes_recv': network.bytes_recv,
                'packets_sent': network.packets_sent,
                'packets_recv': network.packets_recv
            }
        }
        
        print(f"✅ CPU: {cpu_percent}%, Memory: {memory_percent}%, Disk: {disk_percent}%")
        return system_metrics
    
    def capture_api_performance(self, duration_minutes: int = 5) -> Dict[str, Any]:
        """API 성능 캡처"""
        print(f"🚀 API 성능 측정 중... ({duration_minutes}분)")
        
        api_metrics = {
            'timestamp': datetime.now().isoformat(),
            'duration_minutes': duration_minutes,
            'endpoints': {},
            'response_times': [],
            'error_count': 0,
            'total_requests': 0
        }
        
        # 테스트할 엔드포인트들
        endpoints = [
            {'path': '/api/health', 'method': 'GET'},
            {'path': '/api/parties', 'method': 'GET'},
            {'path': '/metrics', 'method': 'GET'},
        ]
        
        end_time = datetime.now() + timedelta(minutes=duration_minutes)
        request_count = 0
        
        while datetime.now() < end_time:
            for endpoint in endpoints:
                try:
                    start_time = time.time()
                    
                    if endpoint['method'] == 'GET':
                        response = requests.get(
                            f"{self.base_url}{endpoint['path']}",
                            timeout=10
                        )
                    else:
                        response = requests.request(
                            endpoint['method'],
                            f"{self.base_url}{endpoint['path']}",
                            timeout=10
                        )
                    
                    response_time = time.time() - start_time
                    
                    # 응답 시간 기록
                    api_metrics['response_times'].append(response_time)
                    api_metrics['total_requests'] += 1
                    request_count += 1
                    
                    # 엔드포인트별 통계
                    path = endpoint['path']
                    if path not in api_metrics['endpoints']:
                        api_metrics['endpoints'][path] = {
                            'response_times': [],
                            'error_count': 0,
                            'success_count': 0
                        }
                    
                    api_metrics['endpoints'][path]['response_times'].append(response_time)
                    
                    if response.status_code >= 400:
                        api_metrics['error_count'] += 1
                        api_metrics['endpoints'][path]['error_count'] += 1
                    else:
                        api_metrics['endpoints'][path]['success_count'] += 1
                    
                    print(f"   {path}: {response.status_code} ({response_time:.3f}s)")
                    
                except requests.exceptions.RequestException as e:
                    api_metrics['error_count'] += 1
                    api_metrics['total_requests'] += 1
                    print(f"   ❌ {endpoint['path']}: {e}")
                
                # 요청 간 간격
                time.sleep(1)
        
        # 통계 계산
        if api_metrics['response_times']:
            api_metrics['avg_response_time'] = sum(api_metrics['response_times']) / len(api_metrics['response_times'])
            api_metrics['min_response_time'] = min(api_metrics['response_times'])
            api_metrics['max_response_time'] = max(api_metrics['response_times'])
            api_metrics['p95_response_time'] = sorted(api_metrics['response_times'])[int(len(api_metrics['response_times']) * 0.95)]
        
        api_metrics['error_rate'] = api_metrics['error_count'] / api_metrics['total_requests'] if api_metrics['total_requests'] > 0 else 0
        api_metrics['requests_per_minute'] = api_metrics['total_requests'] / duration_minutes
        
        print(f"✅ API 성능 측정 완료: 평균 응답시간 {api_metrics.get('avg_response_time', 0):.3f}s, 에러율 {api_metrics['error_rate']:.2%}")
        return api_metrics
    
    def capture_database_performance(self) -> Dict[str, Any]:
        """데이터베이스 성능 캡처"""
        print("🗄️ 데이터베이스 성능 측정 중...")
        
        try:
            # Flask 앱 컨텍스트에서 데이터베이스 성능 측정
            from backend.app.app_factory import create_app
            
            app = create_app()
            
            db_metrics = {
                'timestamp': datetime.now().isoformat(),
                'connection_pool': {},
                'query_performance': [],
                'table_sizes': {}
            }
            
            with app.app_context():
                from backend.app.extensions import db
                
                # 연결 풀 상태
                engine = db.engine
                pool = engine.pool
                
                db_metrics['connection_pool'] = {
                    'size': pool.size(),
                    'checked_in': pool.checkedin(),
                    'checked_out': pool.checkedout(),
                    'overflow': pool.overflow(),
                    'invalid': pool.invalid()
                }
                
                # 테이블 크기 측정
                tables = ['users', 'party', 'party_member', 'restaurant', 'review']
                for table in tables:
                    try:
                        result = db.session.execute(f"SELECT COUNT(*) FROM {table}")
                        count = result.scalar()
                        db_metrics['table_sizes'][table] = count
                    except Exception as e:
                        print(f"   ⚠️ 테이블 {table} 크기 측정 실패: {e}")
                
                # 쿼리 성능 측정
                test_queries = [
                    "SELECT COUNT(*) FROM users",
                    "SELECT COUNT(*) FROM party WHERE party_date >= CURRENT_DATE",
                    "SELECT * FROM users LIMIT 10",
                    "SELECT p.*, u.nickname FROM party p JOIN users u ON p.host_employee_id = u.employee_id LIMIT 5"
                ]
                
                for query in test_queries:
                    try:
                        start_time = time.time()
                        result = db.session.execute(query)
                        result.fetchall()  # 결과 가져오기
                        query_time = time.time() - start_time
                        
                        db_metrics['query_performance'].append({
                            'query': query[:50] + "..." if len(query) > 50 else query,
                            'execution_time': query_time,
                            'timestamp': datetime.now().isoformat()
                        })
                        
                        print(f"   {query[:30]}...: {query_time:.3f}s")
                        
                    except Exception as e:
                        print(f"   ❌ 쿼리 실행 실패: {e}")
            
            print("✅ 데이터베이스 성능 측정 완료")
            return db_metrics
            
        except ImportError as e:
            print(f"⚠️ 데이터베이스 측정 건너뜀: {e}")
            return {'error': str(e)}
    
    def capture_code_complexity(self) -> Dict[str, Any]:
        """코드 복잡도 캡처"""
        print("📝 코드 복잡도 분석 중...")
        
        try:
            import ast
            import os
            
            complexity_metrics = {
                'timestamp': datetime.now().isoformat(),
                'file_stats': {},
                'total_lines': 0,
                'total_functions': 0,
                'total_classes': 0,
                'complexity_score': 0
            }
            
            # 백엔드 코드 분석
            backend_path = os.path.join(os.path.dirname(__file__), '..', 'backend')
            
            for root, dirs, files in os.walk(backend_path):
                # 특정 디렉토리 제외
                dirs[:] = [d for d in dirs if d not in ['__pycache__', '.git', 'migrations']]
                
                for file in files:
                    if file.endswith('.py') and not file.startswith('.'):
                        file_path = os.path.join(root, file)
                        
                        try:
                            with open(file_path, 'r', encoding='utf-8') as f:
                                content = f.read()
                            
                            tree = ast.parse(content)
                            
                            lines = len(content.splitlines())
                            functions = len([node for node in ast.walk(tree) if isinstance(node, ast.FunctionDef)])
                            classes = len([node for node in ast.walk(tree) if isinstance(node, ast.ClassDef)])
                            
                            # 간단한 복잡도 점수 (실제로는 더 정교한 메트릭 필요)
                            complexity = lines + (functions * 2) + (classes * 3)
                            
                            relative_path = os.path.relpath(file_path, backend_path)
                            complexity_metrics['file_stats'][relative_path] = {
                                'lines': lines,
                                'functions': functions,
                                'classes': classes,
                                'complexity': complexity
                            }
                            
                            complexity_metrics['total_lines'] += lines
                            complexity_metrics['total_functions'] += functions
                            complexity_metrics['total_classes'] += classes
                            complexity_metrics['complexity_score'] += complexity
                            
                        except Exception as e:
                            print(f"   ⚠️ 파일 {file} 분석 실패: {e}")
            
            print(f"✅ 코드 복잡도 분석 완료: {complexity_metrics['total_lines']}줄, {complexity_metrics['total_functions']}함수, {complexity_metrics['total_classes']}클래스")
            return complexity_metrics
            
        except Exception as e:
            print(f"⚠️ 코드 복잡도 분석 실패: {e}")
            return {'error': str(e)}
    
    def generate_baseline_report(self) -> Dict[str, Any]:
        """베이스라인 리포트 생성"""
        print("📋 베이스라인 리포트 생성 중...")
        
        report = {
            'baseline_captured_at': self.start_time.isoformat(),
            'capture_duration_minutes': (datetime.now() - self.start_time).total_seconds() / 60,
            'system_metrics': self.capture_system_metrics(),
            'api_performance': self.capture_api_performance(duration_minutes=2),  # 짧은 시간으로 테스트
            'database_performance': self.capture_database_performance(),
            'code_complexity': self.capture_code_complexity(),
            'recommendations': self._generate_recommendations()
        }
        
        return report
    
    def _generate_recommendations(self) -> List[str]:
        """개선 권장사항 생성"""
        recommendations = []
        
        # 시스템 메트릭 기반 권장사항
        system_metrics = self.results.get('system_metrics', {})
        if system_metrics.get('memory', {}).get('percent', 0) > 80:
            recommendations.append("메모리 사용량이 80%를 초과했습니다. 메모리 최적화를 고려하세요.")
        
        if system_metrics.get('cpu', {}).get('percent', 0) > 70:
            recommendations.append("CPU 사용량이 70%를 초과했습니다. CPU 최적화를 고려하세요.")
        
        # API 성능 기반 권장사항
        api_metrics = self.results.get('api_performance', {})
        if api_metrics.get('avg_response_time', 0) > 1.0:
            recommendations.append("평균 API 응답시간이 1초를 초과했습니다. 성능 최적화를 고려하세요.")
        
        if api_metrics.get('error_rate', 0) > 0.05:
            recommendations.append("API 에러율이 5%를 초과했습니다. 안정성 개선을 고려하세요.")
        
        # 코드 복잡도 기반 권장사항
        complexity_metrics = self.results.get('code_complexity', {})
        if complexity_metrics.get('total_lines', 0) > 10000:
            recommendations.append("코드 라인 수가 10,000줄을 초과했습니다. 모듈화를 고려하세요.")
        
        if not recommendations:
            recommendations.append("현재 시스템 상태가 양호합니다.")
        
        return recommendations
    
    def save_baseline(self, filename: str = None):
        """베이스라인 데이터 저장"""
        if filename is None:
            filename = f"baseline_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        report = self.generate_baseline_report()
        self.results = report
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        print(f"✅ 베이스라인 데이터 저장 완료: {filename}")
        return filename


def main():
    """메인 함수"""
    parser = argparse.ArgumentParser(description='베이스라인 성능 측정')
    parser.add_argument('--url', default='http://localhost:5000', help='API 기본 URL')
    parser.add_argument('--duration', type=int, default=5, help='API 측정 시간 (분)')
    parser.add_argument('--output', help='출력 파일명')
    
    args = parser.parse_args()
    
    print("🎯 베이스라인 성능 측정 시작")
    print(f"   API URL: {args.url}")
    print(f"   측정 시간: {args.duration}분")
    
    capture = BaselineCapture(base_url=args.url)
    
    try:
        filename = capture.save_baseline(args.output)
        
        print("\n📊 베이스라인 측정 완료!")
        print(f"   리포트 파일: {filename}")
        
        # 주요 메트릭 요약
        if 'system_metrics' in capture.results:
            sys_metrics = capture.results['system_metrics']
            print(f"   시스템: CPU {sys_metrics.get('cpu', {}).get('percent', 0):.1f}%, "
                  f"Memory {sys_metrics.get('memory', {}).get('percent', 0):.1f}%")
        
        if 'api_performance' in capture.results:
            api_metrics = capture.results['api_performance']
            print(f"   API: 평균 응답시간 {api_metrics.get('avg_response_time', 0):.3f}s, "
                  f"에러율 {api_metrics.get('error_rate', 0):.2%}")
        
    except Exception as e:
        print(f"❌ 베이스라인 측정 실패: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
