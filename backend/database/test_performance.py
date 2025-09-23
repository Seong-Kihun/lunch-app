#!/usr/bin/env python3
"""
성능 모니터링 간단 테스트
"""

from performance_dashboard import PerformanceMonitor

def main():
    print("🚀 성능 모니터링 테스트 시작")
    
    monitor = PerformanceMonitor()
    
    # 메트릭 수집
    print("📊 메트릭 수집 중...")
    metrics = monitor.collect_metrics()
    
    print("✅ 메트릭 수집 완료")
    print(f"CPU: {metrics['system']['cpu_percent']:.1f}%")
    print(f"메모리: {metrics['system']['memory_percent']:.1f}%")
    print(f"디스크: {metrics['system']['disk_percent']:.1f}%")
    
    # API 성능 확인
    print("\n🌐 API 성능:")
    for api_metric in metrics['api']:
        status = "✅" if api_metric['success'] else "❌"
        print(f"{status} {api_metric['endpoint']}: {api_metric['response_time_ms']:.1f}ms")
    
    # 리포트 생성
    print("\n📋 성능 리포트:")
    report = monitor.generate_report()
    print(report)
    
    # 메트릭 저장
    monitor.save_metrics_to_file("test_performance_metrics.json")
    
    print("\n🎉 성능 모니터링 테스트 완료!")

if __name__ == "__main__":
    main()
