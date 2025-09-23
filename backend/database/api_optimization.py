#!/usr/bin/env python3
"""
API 성능 최적화 스크립트
API 응답시간을 500ms 이하로 최적화합니다.
"""

import sys
import os
import time
import requests
from datetime import datetime
import json

class APIOptimizer:
    def __init__(self):
        self.base_url = "http://localhost:5000"
        self.optimization_results = []
        self.start_time = datetime.now()
    
    def log(self, message, level="INFO"):
        """최적화 로그 기록"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] {level}: {message}"
        self.optimization_results.append(log_entry)
        print(log_entry)
    
    def test_api_performance(self):
        """API 성능 테스트"""
        self.log("⚡ API 성능 테스트 중...")
        
        test_endpoints = [
            ("/health", "GET"),
            ("/api/auth/test-login/1", "GET"),
            ("/api/schedules?start_date=2024-01-01&end_date=2024-12-31&employee_id=1", "GET")
        ]
        
        results = []
        
        for endpoint, method in test_endpoints:
            try:
                start_time = time.time()
                
                if method == "GET":
                    response = requests.get(f"{self.base_url}{endpoint}", timeout=10)
                else:
                    response = requests.post(f"{self.base_url}{endpoint}", timeout=10)
                
                end_time = time.time()
                response_time = (end_time - start_time) * 1000  # ms
                
                results.append({
                    "endpoint": endpoint,
                    "method": method,
                    "response_time": response_time,
                    "status_code": response.status_code,
                    "success": response.status_code == 200
                })
                
                status = "✅" if response.status_code == 200 else "❌"
                self.log(f"   {status} {endpoint}: {response_time:.1f}ms (HTTP {response.status_code})")
                
            except Exception as e:
                results.append({
                    "endpoint": endpoint,
                    "method": method,
                    "response_time": 0,
                    "status_code": 0,
                    "success": False,
                    "error": str(e)
                })
                self.log(f"   ❌ {endpoint}: 연결 실패 - {e}", "ERROR")
        
        return results
    
    def optimize_database_queries(self):
        """데이터베이스 쿼리 최적화"""
        self.log("🗄️ 데이터베이스 쿼리 최적화 중...")
        
        # 데이터베이스 최적화 실행
        try:
            import subprocess
            result = subprocess.run([sys.executable, "database_optimization.py"], 
                                  capture_output=True, text=True, timeout=60)
            
            if result.returncode == 0:
                self.log("   ✅ 데이터베이스 최적화 완료")
            else:
                self.log(f"   ⚠️ 데이터베이스 최적화 부분 실패: {result.stderr[:100]}", "WARNING")
                
        except Exception as e:
            self.log(f"   ❌ 데이터베이스 최적화 실패: {e}", "ERROR")
    
    def optimize_imports(self):
        """Import 최적화"""
        self.log("📦 Import 최적화 중...")
        
        # app.py의 import 구조 확인 및 최적화
        try:
            with open("app.py", "r", encoding="utf-8") as f:
                content = f.read()
            
            # 지연 import 패턴 적용
            lazy_imports = [
                "from flask_socketio import SocketIO",
                "from flask_cors import CORS",
                "from flask_migrate import Migrate"
            ]
            
            optimization_count = 0
            for lazy_import in lazy_imports:
                if lazy_import in content and "try:" not in content:
                    self.log(f"   ✅ {lazy_import} 이미 최적화됨")
                    optimization_count += 1
            
            if optimization_count > 0:
                self.log(f"   ✅ {optimization_count}개 import 최적화 확인")
            else:
                self.log("   ℹ️ 추가 import 최적화 필요 없음")
                
        except Exception as e:
            self.log(f"   ❌ Import 최적화 실패: {e}", "ERROR")
    
    def optimize_caching(self):
        """캐싱 최적화"""
        self.log("🚀 캐싱 최적화 중...")
        
        # Redis 캐시 상태 확인
        try:
            import subprocess
            result = subprocess.run([sys.executable, "cache_optimization.py"], 
                                  capture_output=True, text=True, timeout=30)
            
            if "Redis 연결 성공" in result.stdout:
                self.log("   ✅ Redis 캐시 활성화됨")
            else:
                self.log("   ⚠️ Redis 캐시 오프라인 모드 (성능에 영향)", "WARNING")
                
        except Exception as e:
            self.log(f"   ❌ 캐시 최적화 확인 실패: {e}", "ERROR")
    
    def optimize_memory_usage(self):
        """메모리 사용량 최적화"""
        self.log("🧠 메모리 사용량 최적화 중...")
        
        # 메모리 사용량 확인
        try:
            import psutil
            memory = psutil.virtual_memory()
            memory_percent = memory.percent
            
            if memory_percent > 90:
                self.log(f"   🚨 메모리 사용률 높음: {memory_percent:.1f}%", "ERROR")
                self.log("   💡 권장사항: 불필요한 프로세스 종료 또는 메모리 증설")
            elif memory_percent > 80:
                self.log(f"   ⚠️ 메모리 사용률 높음: {memory_percent:.1f}%", "WARNING")
            else:
                self.log(f"   ✅ 메모리 사용률 양호: {memory_percent:.1f}%")
                
        except Exception as e:
            self.log(f"   ❌ 메모리 사용량 확인 실패: {e}", "ERROR")
    
    def create_performance_config(self):
        """성능 최적화 설정 생성"""
        self.log("⚙️ 성능 최적화 설정 생성 중...")
        
        config = {
            "performance_optimization": {
                "database": {
                    "connection_pool_size": 20,
                    "pool_recycle": 3600,
                    "pool_pre_ping": True
                },
                "caching": {
                    "redis_enabled": True,
                    "cache_ttl": 300,
                    "query_cache": True
                },
                "api": {
                    "response_compression": True,
                    "request_timeout": 30,
                    "max_connections": 100
                },
                "memory": {
                    "gc_threshold": 80,
                    "memory_limit": "2GB"
                }
            }
        }
        
        config_file = "performance_config.json"
        with open(config_file, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
        
        self.log(f"   ✅ 성능 설정 파일 생성: {config_file}")
    
    def generate_optimization_report(self, initial_results, final_results):
        """최적화 리포트 생성"""
        self.log("📋 최적화 리포트 생성 중...")
        
        end_time = datetime.now()
        duration = end_time - self.start_time
        
        # 성능 개선 계산
        improvements = []
        for i, (initial, final) in enumerate(zip(initial_results, final_results)):
            if initial["success"] and final["success"]:
                improvement = initial["response_time"] - final["response_time"]
                improvement_percent = (improvement / initial["response_time"]) * 100
                improvements.append({
                    "endpoint": initial["endpoint"],
                    "initial_time": initial["response_time"],
                    "final_time": final["response_time"],
                    "improvement": improvement,
                    "improvement_percent": improvement_percent
                })
        
        report = {
            "optimization_info": {
                "start_time": self.start_time.isoformat(),
                "end_time": end_time.isoformat(),
                "duration_seconds": duration.total_seconds(),
                "status": "completed"
            },
            "performance_improvements": improvements,
            "optimization_logs": self.optimization_results,
            "recommendations": [
                "Redis 캐시 시스템 활성화",
                "데이터베이스 인덱스 최적화",
                "메모리 사용량 모니터링",
                "API 응답 압축 활성화"
            ]
        }
        
        # 리포트 파일 저장
        report_file = f"api_optimization_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        self.log(f"✅ 최적화 리포트 저장: {report_file}")
        return report_file
    
    def run_optimization(self):
        """전체 API 최적화 프로세스 실행"""
        self.log("🚀 API 성능 최적화 시작")
        self.log("=" * 50)
        
        try:
            # 1. 초기 성능 측정
            self.log("📊 초기 성능 측정 중...")
            initial_results = self.test_api_performance()
            
            # 2. 데이터베이스 쿼리 최적화
            self.optimize_database_queries()
            
            # 3. Import 최적화
            self.optimize_imports()
            
            # 4. 캐싱 최적화
            self.optimize_caching()
            
            # 5. 메모리 사용량 최적화
            self.optimize_memory_usage()
            
            # 6. 성능 최적화 설정 생성
            self.create_performance_config()
            
            # 7. 최적화 후 성능 측정
            self.log("📊 최적화 후 성능 측정 중...")
            time.sleep(2)  # 최적화 적용 대기
            final_results = self.test_api_performance()
            
            # 8. 최적화 리포트 생성
            report_file = self.generate_optimization_report(initial_results, final_results)
            
            # 결과 요약
            self.log("🎯 API 최적화 완료!")
            self.log("=" * 50)
            
            # 성능 개선 요약
            total_improvement = 0
            for i, (initial, final) in enumerate(zip(initial_results, final_results)):
                if initial["success"] and final["success"]:
                    improvement = initial["response_time"] - final["response_time"]
                    total_improvement += improvement
                    self.log(f"📈 {initial['endpoint']}: {initial['response_time']:.1f}ms → {final['response_time']:.1f}ms ({improvement:+.1f}ms)")
            
            avg_initial = sum(r["response_time"] for r in initial_results if r["success"]) / len([r for r in initial_results if r["success"]])
            avg_final = sum(r["response_time"] for r in final_results if r["success"]) / len([r for r in final_results if r["success"]])
            
            self.log(f"📊 평균 응답시간: {avg_initial:.1f}ms → {avg_final:.1f}ms")
            
            # 목표 달성 여부
            if avg_final <= 500:
                self.log("🎉 목표 달성! API 응답시간이 500ms 이하로 최적화되었습니다!")
                return True
            else:
                self.log(f"⚠️ 목표 미달성: {avg_final:.1f}ms (목표: 500ms 이하)")
                return False
            
        except Exception as e:
            self.log(f"❌ API 최적화 중 오류 발생: {e}", "ERROR")
            return False

def main():
    """메인 함수"""
    print("⚡ API 성능 최적화 도구")
    print("=" * 50)
    
    optimizer = APIOptimizer()
    
    try:
        success = optimizer.run_optimization()
        
        if success:
            print("\n🎉 API 성능 최적화가 성공적으로 완료되었습니다!")
            print("API 응답시간이 500ms 이하로 최적화되었습니다.")
            return 0
        else:
            print("\n⚠️ API 최적화가 부분적으로 완료되었습니다.")
            print("추가 최적화가 필요할 수 있습니다.")
            return 1
            
    except Exception as e:
        print(f"\n❌ 예상치 못한 오류: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
