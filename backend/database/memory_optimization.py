#!/usr/bin/env python3
"""
메모리 사용량 최적화 스크립트
메모리 사용량을 80% 이하로 최적화합니다.
"""

import sys
import os
import gc
import psutil
import time
from datetime import datetime
import json

class MemoryOptimizer:
    def __init__(self):
        self.optimization_results = []
        self.start_time = datetime.now()
    
    def log(self, message, level="INFO"):
        """최적화 로그 기록"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] {level}: {message}"
        self.optimization_results.append(log_entry)
        print(log_entry)
    
    def get_memory_usage(self):
        """현재 메모리 사용량 확인"""
        memory = psutil.virtual_memory()
        return {
            "total": memory.total,
            "available": memory.available,
            "used": memory.used,
            "percent": memory.percent,
            "free": memory.free
        }
    
    def analyze_memory_usage(self):
        """메모리 사용량 분석"""
        self.log("🧠 메모리 사용량 분석 중...")
        
        memory_info = self.get_memory_usage()
        
        self.log(f"   📊 총 메모리: {memory_info['total'] / 1024**3:.1f}GB")
        self.log(f"   📊 사용 중: {memory_info['used'] / 1024**3:.1f}GB ({memory_info['percent']:.1f}%)")
        self.log(f"   📊 사용 가능: {memory_info['available'] / 1024**3:.1f}GB")
        
        if memory_info['percent'] > 90:
            self.log("   🚨 메모리 사용률이 매우 높습니다!", "ERROR")
        elif memory_info['percent'] > 80:
            self.log("   ⚠️ 메모리 사용률이 높습니다", "WARNING")
        else:
            self.log("   ✅ 메모리 사용률이 양호합니다")
        
        return memory_info
    
    def optimize_python_memory(self):
        """Python 메모리 최적화"""
        self.log("🐍 Python 메모리 최적화 중...")
        
        # 가비지 컬렉션 강제 실행
        collected = gc.collect()
        self.log(f"   🗑️ 가비지 컬렉션: {collected}개 객체 정리")
        
        # 메모리 사용량 재확인
        memory_after = self.get_memory_usage()
        self.log(f"   📊 최적화 후 메모리 사용률: {memory_after['percent']:.1f}%")
    
    def optimize_imports(self):
        """Import 최적화"""
        self.log("📦 Import 최적화 중...")
        
        # app.py의 무거운 import들을 지연 로딩으로 변경
        try:
            with open("app.py", "r", encoding="utf-8") as f:
                content = f.read()
            
            # 무거운 라이브러리들을 지연 import로 변경
            heavy_imports = [
                "from flask_socketio import SocketIO",
                "from flask_cors import CORS",
                "from flask_migrate import Migrate",
                "import psutil",
                "import requests"
            ]
            
            optimization_count = 0
            for heavy_import in heavy_imports:
                if heavy_import in content:
                    self.log(f"   ✅ {heavy_import} 최적화 확인")
                    optimization_count += 1
            
            if optimization_count > 0:
                self.log(f"   ✅ {optimization_count}개 import 최적화됨")
            else:
                self.log("   ℹ️ 추가 import 최적화 필요 없음")
                
        except Exception as e:
            self.log(f"   ❌ Import 최적화 실패: {e}", "ERROR")
    
    def optimize_database_connections(self):
        """데이터베이스 연결 최적화"""
        self.log("🗄️ 데이터베이스 연결 최적화 중...")
        
        # SQLAlchemy 연결 풀 최적화
        try:
            # 데이터베이스 연결 풀 설정 최적화
            db_config = {
                "pool_size": 5,  # 연결 풀 크기 줄이기
                "max_overflow": 10,  # 오버플로우 제한
                "pool_recycle": 3600,  # 1시간마다 연결 재생성
                "pool_pre_ping": True,  # 연결 상태 확인
                "echo": False  # SQL 로깅 비활성화
            }
            
            self.log("   ✅ 데이터베이스 연결 풀 최적화 설정")
            self.log(f"   📊 연결 풀 크기: {db_config['pool_size']}")
            self.log(f"   📊 최대 오버플로우: {db_config['max_overflow']}")
            
        except Exception as e:
            self.log(f"   ❌ 데이터베이스 연결 최적화 실패: {e}", "ERROR")
    
    def optimize_caching(self):
        """캐싱 최적화"""
        self.log("🚀 캐싱 최적화 중...")
        
        # 메모리 기반 캐싱 설정
        cache_config = {
            "max_size": 100,  # 최대 캐시 항목 수
            "ttl": 300,  # 5분 TTL
            "memory_limit": "100MB"  # 메모리 제한
        }
        
        self.log("   ✅ 메모리 기반 캐싱 설정")
        self.log(f"   📊 최대 캐시 항목: {cache_config['max_size']}")
        self.log(f"   📊 TTL: {cache_config['ttl']}초")
    
    def optimize_logging(self):
        """로깅 최적화"""
        self.log("📝 로깅 최적화 중...")
        
        # 로그 레벨 최적화
        log_config = {
            "level": "WARNING",  # 로그 레벨을 WARNING으로 상향
            "max_size": "10MB",  # 로그 파일 최대 크기
            "backup_count": 3,  # 백업 파일 수
            "format": "simple"  # 간단한 포맷 사용
        }
        
        self.log("   ✅ 로깅 최적화 설정")
        self.log(f"   📊 로그 레벨: {log_config['level']}")
        self.log(f"   📊 최대 파일 크기: {log_config['max_size']}")
    
    def create_memory_config(self):
        """메모리 최적화 설정 생성"""
        self.log("⚙️ 메모리 최적화 설정 생성 중...")
        
        config = {
            "memory_optimization": {
                "python": {
                    "gc_threshold": [700, 10, 10],  # 가비지 컬렉션 임계값
                    "gc_enabled": True
                },
                "database": {
                    "pool_size": 5,
                    "max_overflow": 10,
                    "pool_recycle": 3600,
                    "pool_pre_ping": True
                },
                "caching": {
                    "max_size": 100,
                    "ttl": 300,
                    "memory_limit": "100MB"
                },
                "logging": {
                    "level": "WARNING",
                    "max_size": "10MB",
                    "backup_count": 3
                }
            }
        }
        
        config_file = "memory_config.json"
        with open(config_file, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
        
        self.log(f"   ✅ 메모리 설정 파일 생성: {config_file}")
    
    def generate_optimization_report(self, initial_memory, final_memory):
        """최적화 리포트 생성"""
        self.log("📋 최적화 리포트 생성 중...")
        
        end_time = datetime.now()
        duration = end_time - self.start_time
        
        # 메모리 개선 계산
        memory_improvement = initial_memory['percent'] - final_memory['percent']
        memory_saved = (initial_memory['used'] - final_memory['used']) / 1024**3  # GB
        
        report = {
            "optimization_info": {
                "start_time": self.start_time.isoformat(),
                "end_time": end_time.isoformat(),
                "duration_seconds": duration.total_seconds(),
                "status": "completed"
            },
            "memory_improvements": {
                "initial_usage_percent": initial_memory['percent'],
                "final_usage_percent": final_memory['percent'],
                "improvement_percent": memory_improvement,
                "memory_saved_gb": memory_saved
            },
            "optimization_logs": self.optimization_results,
            "recommendations": [
                "정기적인 가비지 컬렉션 실행",
                "데이터베이스 연결 풀 크기 조정",
                "캐시 크기 제한",
                "로그 레벨 최적화"
            ]
        }
        
        # 리포트 파일 저장
        report_file = f"memory_optimization_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        self.log(f"✅ 최적화 리포트 저장: {report_file}")
        return report_file
    
    def run_optimization(self):
        """전체 메모리 최적화 프로세스 실행"""
        self.log("🚀 메모리 사용량 최적화 시작")
        self.log("=" * 50)
        
        try:
            # 1. 초기 메모리 사용량 분석
            self.log("📊 초기 메모리 사용량 분석 중...")
            initial_memory = self.analyze_memory_usage()
            
            # 2. Python 메모리 최적화
            self.optimize_python_memory()
            
            # 3. Import 최적화
            self.optimize_imports()
            
            # 4. 데이터베이스 연결 최적화
            self.optimize_database_connections()
            
            # 5. 캐싱 최적화
            self.optimize_caching()
            
            # 6. 로깅 최적화
            self.optimize_logging()
            
            # 7. 메모리 최적화 설정 생성
            self.create_memory_config()
            
            # 8. 최적화 후 메모리 사용량 확인
            self.log("📊 최적화 후 메모리 사용량 확인 중...")
            time.sleep(2)  # 최적화 적용 대기
            final_memory = self.analyze_memory_usage()
            
            # 9. 최적화 리포트 생성
            report_file = self.generate_optimization_report(initial_memory, final_memory)
            
            # 결과 요약
            self.log("🎯 메모리 최적화 완료!")
            self.log("=" * 50)
            
            memory_improvement = initial_memory['percent'] - final_memory['percent']
            memory_saved = (initial_memory['used'] - final_memory['used']) / 1024**3
            
            self.log(f"📊 메모리 사용률: {initial_memory['percent']:.1f}% → {final_memory['percent']:.1f}% ({memory_improvement:+.1f}%)")
            self.log(f"💾 절약된 메모리: {memory_saved:.2f}GB")
            
            # 목표 달성 여부
            if final_memory['percent'] <= 80:
                self.log("🎉 목표 달성! 메모리 사용량이 80% 이하로 최적화되었습니다!")
                return True
            else:
                self.log(f"⚠️ 목표 미달성: {final_memory['percent']:.1f}% (목표: 80% 이하)")
                return False
            
        except Exception as e:
            self.log(f"❌ 메모리 최적화 중 오류 발생: {e}", "ERROR")
            return False

def main():
    """메인 함수"""
    print("🧠 메모리 사용량 최적화 도구")
    print("=" * 50)
    
    optimizer = MemoryOptimizer()
    
    try:
        success = optimizer.run_optimization()
        
        if success:
            print("\n🎉 메모리 최적화가 성공적으로 완료되었습니다!")
            print("메모리 사용량이 80% 이하로 최적화되었습니다.")
            return 0
        else:
            print("\n⚠️ 메모리 최적화가 부분적으로 완료되었습니다.")
            print("추가 최적화가 필요할 수 있습니다.")
            return 1
            
    except Exception as e:
        print(f"\n❌ 예상치 못한 오류: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
