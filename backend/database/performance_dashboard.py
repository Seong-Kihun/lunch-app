#!/usr/bin/env python3
"""
성능 모니터링 대시보드
실시간 성능 지표를 모니터링하고 리포트를 생성합니다.
"""

import requests
import json
import time
import psutil
import os
from datetime import datetime, timedelta
# import matplotlib.pyplot as plt  # 선택적 import
# import pandas as pd  # 선택적 import

class PerformanceMonitor:
    def __init__(self, server_url="http://localhost:5000"):
        self.server_url = server_url
        self.metrics = []
        self.start_time = datetime.now()
    
    def collect_system_metrics(self):
        """시스템 메트릭 수집"""
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        return {
            'timestamp': datetime.now().isoformat(),
            'cpu_percent': cpu_percent,
            'memory_percent': memory.percent,
            'memory_used_gb': memory.used / (1024**3),
            'memory_total_gb': memory.total / (1024**3),
            'disk_percent': disk.percent,
            'disk_used_gb': disk.used / (1024**3),
            'disk_total_gb': disk.total / (1024**3)
        }
    
    def collect_api_metrics(self):
        """API 메트릭 수집"""
        endpoints = [
            '/health',
            '/api/auth/test-login/1',
            '/api/schedules?start_date=2024-01-01&end_date=2024-12-31&employee_id=1'
        ]
        
        api_metrics = []
        
        for endpoint in endpoints:
            try:
                start_time = time.time()
                response = requests.get(f"{self.server_url}{endpoint}", timeout=5)
                response_time = time.time() - start_time
                
                api_metrics.append({
                    'endpoint': endpoint,
                    'status_code': response.status_code,
                    'response_time_ms': response_time * 1000,
                    'success': response.status_code < 400,
                    'timestamp': datetime.now().isoformat()
                })
            except Exception as e:
                api_metrics.append({
                    'endpoint': endpoint,
                    'status_code': 0,
                    'response_time_ms': -1,
                    'success': False,
                    'error': str(e),
                    'timestamp': datetime.now().isoformat()
                })
        
        return api_metrics
    
    def collect_metrics(self):
        """모든 메트릭 수집"""
        system_metrics = self.collect_system_metrics()
        api_metrics = self.collect_api_metrics()
        
        combined_metrics = {
            'system': system_metrics,
            'api': api_metrics,
            'collection_time': datetime.now().isoformat()
        }
        
        self.metrics.append(combined_metrics)
        return combined_metrics
    
    def generate_report(self):
        """성능 리포트 생성"""
        if not self.metrics:
            return "수집된 메트릭이 없습니다."
        
        # 시스템 메트릭 분석
        system_data = [m['system'] for m in self.metrics]
        api_data = [m['api'] for m in self.metrics]
        
        # 평균값 계산
        avg_cpu = sum(s['cpu_percent'] for s in system_data) / len(system_data)
        avg_memory = sum(s['memory_percent'] for s in system_data) / len(system_data)
        
        # API 성능 분석
        all_api_metrics = []
        for api_batch in api_data:
            all_api_metrics.extend(api_batch)
        
        successful_requests = [m for m in all_api_metrics if m['success']]
        avg_response_time = sum(m['response_time_ms'] for m in successful_requests) / len(successful_requests) if successful_requests else 0
        
        # 리포트 생성
        report = f"""
📊 성능 모니터링 리포트
{'='*50}
📅 생성 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
⏱️ 모니터링 기간: {self.start_time.strftime('%Y-%m-%d %H:%M:%S')} ~ {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
📈 수집된 데이터 포인트: {len(self.metrics)}개

🖥️ 시스템 성능
{'─'*30}
• 평균 CPU 사용률: {avg_cpu:.1f}%
• 평균 메모리 사용률: {avg_memory:.1f}%
• 현재 메모리 사용량: {system_data[-1]['memory_used_gb']:.1f}GB / {system_data[-1]['memory_total_gb']:.1f}GB

🌐 API 성능
{'─'*30}
• 총 API 요청: {len(all_api_metrics)}개
• 성공한 요청: {len(successful_requests)}개
• 성공률: {len(successful_requests)/len(all_api_metrics)*100:.1f}%
• 평균 응답 시간: {avg_response_time:.1f}ms

📋 엔드포인트별 성능
{'─'*30}
"""
        
        # 엔드포인트별 통계
        endpoint_stats = {}
        for metric in all_api_metrics:
            endpoint = metric['endpoint']
            if endpoint not in endpoint_stats:
                endpoint_stats[endpoint] = {'total': 0, 'success': 0, 'response_times': []}
            
            endpoint_stats[endpoint]['total'] += 1
            if metric['success']:
                endpoint_stats[endpoint]['success'] += 1
                endpoint_stats[endpoint]['response_times'].append(metric['response_time_ms'])
        
        for endpoint, stats in endpoint_stats.items():
            success_rate = stats['success'] / stats['total'] * 100
            avg_rt = sum(stats['response_times']) / len(stats['response_times']) if stats['response_times'] else 0
            report += f"• {endpoint}: {success_rate:.1f}% 성공, {avg_rt:.1f}ms 평균 응답시간\n"
        
        return report
    
    def save_metrics_to_file(self, filename="performance_metrics.json"):
        """메트릭을 파일로 저장"""
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(self.metrics, f, indent=2, ensure_ascii=False)
        print(f"✅ 메트릭이 {filename}에 저장되었습니다.")
    
    def create_performance_chart(self):
        """성능 차트 생성 (간단한 텍스트 차트)"""
        if len(self.metrics) < 2:
            print("⚠️ 차트 생성을 위해 최소 2개의 데이터 포인트가 필요합니다.")
            return
        
        # 데이터 준비
        cpu_data = [m['system']['cpu_percent'] for m in self.metrics]
        memory_data = [m['system']['memory_percent'] for m in self.metrics]
        
        print("\n📊 성능 차트 (텍스트)")
        print("=" * 50)
        
        # CPU 사용률 차트
        print("🖥️ CPU 사용률:")
        max_cpu = max(cpu_data) if cpu_data else 0
        for i, cpu in enumerate(cpu_data):
            bar_length = int(cpu / max_cpu * 30) if max_cpu > 0 else 0
            bar = "█" * bar_length + "░" * (30 - bar_length)
            print(f"  {i+1:2d}: {bar} {cpu:5.1f}%")
        
        print("\n💾 메모리 사용률:")
        max_memory = max(memory_data) if memory_data else 0
        for i, memory in enumerate(memory_data):
            bar_length = int(memory / max_memory * 30) if max_memory > 0 else 0
            bar = "█" * bar_length + "░" * (30 - bar_length)
            print(f"  {i+1:2d}: {bar} {memory:5.1f}%")
        
        print("\n✅ 텍스트 차트가 생성되었습니다.")
    
    def monitor_continuous(self, duration_minutes=5, interval_seconds=10):
        """지속적인 모니터링"""
        print(f"🚀 {duration_minutes}분간 {interval_seconds}초 간격으로 모니터링을 시작합니다...")
        
        end_time = datetime.now() + timedelta(minutes=duration_minutes)
        
        while datetime.now() < end_time:
            try:
                metrics = self.collect_metrics()
                print(f"📊 메트릭 수집 완료: {datetime.now().strftime('%H:%M:%S')}")
                
                # 간단한 상태 출력
                system = metrics['system']
                print(f"   CPU: {system['cpu_percent']:.1f}%, 메모리: {system['memory_percent']:.1f}%")
                
                time.sleep(interval_seconds)
                
            except KeyboardInterrupt:
                print("\n⏹️ 모니터링이 중단되었습니다.")
                break
            except Exception as e:
                print(f"❌ 메트릭 수집 오류: {e}")
                time.sleep(interval_seconds)
        
        print("✅ 모니터링이 완료되었습니다.")
        return self.generate_report()

def main():
    """메인 함수"""
    monitor = PerformanceMonitor()
    
    print("🔧 성능 모니터링 도구")
    print("=" * 50)
    
    while True:
        print("\n선택하세요:")
        print("1. 단일 메트릭 수집")
        print("2. 지속적인 모니터링 (5분)")
        print("3. 리포트 생성")
        print("4. 차트 생성")
        print("5. 메트릭 저장")
        print("6. 종료")
        
        choice = input("\n선택 (1-6): ").strip()
        
        if choice == '1':
            metrics = monitor.collect_metrics()
            print("✅ 메트릭 수집 완료")
            print(f"CPU: {metrics['system']['cpu_percent']:.1f}%")
            print(f"메모리: {metrics['system']['memory_percent']:.1f}%")
            
        elif choice == '2':
            report = monitor.monitor_continuous(duration_minutes=5, interval_seconds=10)
            print(report)
            
        elif choice == '3':
            report = monitor.generate_report()
            print(report)
            
        elif choice == '4':
            monitor.create_performance_chart()
            
        elif choice == '5':
            monitor.save_metrics_to_file()
            
        elif choice == '6':
            print("👋 모니터링을 종료합니다.")
            break
            
        else:
            print("❌ 잘못된 선택입니다.")

if __name__ == "__main__":
    main()
