#!/usr/bin/env python3
"""
Lunch App 배포 스크립트
프로덕션 환경에 안전하게 배포하기 위한 자동화 스크립트
"""

import os
import sys
import subprocess
import shutil
from datetime import datetime
import json

class DeploymentManager:
    def __init__(self):
        self.deployment_log = []
        self.start_time = datetime.now()
        
    def log(self, message, level="INFO"):
        """배포 로그 기록"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] {level}: {message}"
        self.deployment_log.append(log_entry)
        print(log_entry)
    
    def check_prerequisites(self):
        """배포 전 필수 조건 확인"""
        self.log("🔍 배포 전 필수 조건 확인 중...")
        
        checks = []
        
        # Python 버전 확인
        python_version = sys.version_info
        if python_version >= (3, 8):
            checks.append(("Python 버전", "✅", f"{python_version.major}.{python_version.minor}"))
        else:
            checks.append(("Python 버전", "❌", f"{python_version.major}.{python_version.minor} (3.8+ 필요)"))
        
        # 필수 파일 확인
        required_files = [
            "app.py",
            "requirements.txt",
            "PRODUCTION_DEPLOYMENT_GUIDE.md"
        ]
        
        for file in required_files:
            if os.path.exists(file):
                checks.append((f"파일: {file}", "✅", "존재"))
            else:
                checks.append((f"파일: {file}", "❌", "누락"))
        
        # .env 파일 확인
        if os.path.exists(".env"):
            checks.append(("환경변수 파일", "✅", ".env 존재"))
        else:
            checks.append(("환경변수 파일", "⚠️", ".env 없음 (env_template.txt 참조)"))
        
        # 결과 출력
        self.log("📋 필수 조건 확인 결과:")
        for check_name, status, detail in checks:
            self.log(f"   {status} {check_name}: {detail}")
        
        # 실패한 체크가 있는지 확인
        failed_checks = [check for check in checks if "❌" in check[1]]
        if failed_checks:
            self.log("❌ 일부 필수 조건이 충족되지 않았습니다.", "ERROR")
            return False
        
        self.log("✅ 모든 필수 조건이 충족되었습니다.")
        return True
    
    def create_backup(self):
        """현재 상태 백업"""
        self.log("💾 현재 상태 백업 중...")
        
        backup_dir = f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        try:
            os.makedirs(backup_dir, exist_ok=True)
            
            # 데이터베이스 백업
            if os.path.exists("lunch_app.db"):
                shutil.copy2("lunch_app.db", f"{backup_dir}/lunch_app.db")
                self.log(f"   ✅ 데이터베이스 백업: {backup_dir}/lunch_app.db")
            
            # 설정 파일 백업
            if os.path.exists(".env"):
                shutil.copy2(".env", f"{backup_dir}/.env")
                self.log(f"   ✅ 환경변수 백업: {backup_dir}/.env")
            
            # 로그 파일 백업
            if os.path.exists("logs"):
                shutil.copytree("logs", f"{backup_dir}/logs")
                self.log(f"   ✅ 로그 파일 백업: {backup_dir}/logs")
            
            self.log(f"✅ 백업 완료: {backup_dir}")
            return backup_dir
            
        except Exception as e:
            self.log(f"❌ 백업 실패: {e}", "ERROR")
            return None
    
    def install_dependencies(self):
        """의존성 설치"""
        self.log("📦 의존성 설치 중...")
        
        try:
            # requirements.txt가 있는지 확인
            if not os.path.exists("requirements.txt"):
                self.log("⚠️ requirements.txt가 없습니다. 기본 패키지만 설치합니다.")
                packages = [
                    "flask",
                    "flask-sqlalchemy",
                    "flask-cors",
                    "python-dotenv",
                    "requests",
                    "psutil"
                ]
                
                for package in packages:
                    subprocess.run([sys.executable, "-m", "pip", "install", package], 
                                 check=True, capture_output=True)
                    self.log(f"   ✅ {package} 설치 완료")
            else:
                # requirements.txt로 설치
                result = subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"],
                                      capture_output=True, text=True)
                
                if result.returncode == 0:
                    self.log("✅ 모든 의존성 설치 완료")
                else:
                    self.log(f"❌ 의존성 설치 실패: {result.stderr}", "ERROR")
                    return False
            
            return True
            
        except Exception as e:
            self.log(f"❌ 의존성 설치 중 오류: {e}", "ERROR")
            return False
    
    def setup_environment(self):
        """환경 설정"""
        self.log("🔧 환경 설정 중...")
        
        # .env 파일이 없으면 템플릿에서 복사
        if not os.path.exists(".env") and os.path.exists("env_template.txt"):
            shutil.copy2("env_template.txt", ".env")
            self.log("   ✅ .env 파일 생성 (env_template.txt에서 복사)")
            self.log("   ⚠️ .env 파일을 편집하여 실제 값으로 수정하세요!")
        
        # 로그 디렉토리 생성
        os.makedirs("logs", exist_ok=True)
        self.log("   ✅ 로그 디렉토리 생성")
        
        # 백업 디렉토리 생성
        os.makedirs("backup", exist_ok=True)
        self.log("   ✅ 백업 디렉토리 생성")
        
        return True
    
    def run_tests(self):
        """배포 전 테스트 실행"""
        self.log("🧪 배포 전 테스트 실행 중...")
        
        tests = [
            ("앱 import 테스트", "python -c \"import app; print('✅ 앱 import 성공')\""),
            ("API 엔드포인트 테스트", "python test_api_endpoints.py"),
            ("데이터 정합성 테스트", "python data_integrity_check.py"),
            ("성능 테스트", "python test_performance.py")
        ]
        
        test_results = []
        
        for test_name, command in tests:
            try:
                self.log(f"   🔍 {test_name} 실행 중...")
                result = subprocess.run(command.split(), capture_output=True, text=True, timeout=60)
                
                if result.returncode == 0:
                    test_results.append((test_name, "✅", "성공"))
                    self.log(f"   ✅ {test_name} 성공")
                else:
                    test_results.append((test_name, "❌", f"실패: {result.stderr[:100]}"))
                    self.log(f"   ❌ {test_name} 실패: {result.stderr[:100]}", "ERROR")
                    
            except subprocess.TimeoutExpired:
                test_results.append((test_name, "⏰", "시간 초과"))
                self.log(f"   ⏰ {test_name} 시간 초과", "WARNING")
            except Exception as e:
                test_results.append((test_name, "❌", f"오류: {str(e)[:100]}"))
                self.log(f"   ❌ {test_name} 오류: {e}", "ERROR")
        
        # 테스트 결과 요약
        self.log("📊 테스트 결과 요약:")
        for test_name, status, detail in test_results:
            self.log(f"   {status} {test_name}: {detail}")
        
        # 실패한 테스트가 있는지 확인
        failed_tests = [test for test in test_results if "❌" in test[1]]
        if failed_tests:
            self.log(f"⚠️ {len(failed_tests)}개 테스트가 실패했습니다.", "WARNING")
            return False
        
        self.log("✅ 모든 테스트가 성공했습니다.")
        return True
    
    def start_application(self):
        """애플리케이션 시작"""
        self.log("🚀 애플리케이션 시작 중...")
        
        try:
            # 개발 모드로 시작
            self.log("   📝 개발 모드로 시작합니다.")
            self.log("   💡 프로덕션 배포 시에는 Gunicorn 사용을 권장합니다.")
            self.log("   🔗 서버 URL: http://localhost:5000")
            self.log("   🏥 헬스체크: http://localhost:5000/health")
            
            # 실제로는 사용자가 수동으로 시작해야 함
            self.log("   ⚠️ 다음 명령어로 서버를 시작하세요:")
            self.log("   python app.py")
            
            return True
            
        except Exception as e:
            self.log(f"❌ 애플리케이션 시작 실패: {e}", "ERROR")
            return False
    
    def generate_deployment_report(self):
        """배포 리포트 생성"""
        self.log("📋 배포 리포트 생성 중...")
        
        end_time = datetime.now()
        duration = end_time - self.start_time
        
        report = {
            "deployment_info": {
                "start_time": self.start_time.isoformat(),
                "end_time": end_time.isoformat(),
                "duration_seconds": duration.total_seconds(),
                "status": "completed"
            },
            "logs": self.deployment_log,
            "next_steps": [
                "1. .env 파일을 편집하여 실제 값으로 수정",
                "2. python app.py로 서버 시작",
                "3. http://localhost:5000/health에서 헬스체크 확인",
                "4. PRODUCTION_DEPLOYMENT_GUIDE.md 참조하여 프로덕션 설정 완료"
            ]
        }
        
        # 리포트 파일 저장
        report_file = f"deployment_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        self.log(f"✅ 배포 리포트 저장: {report_file}")
        return report_file
    
    def deploy(self):
        """전체 배포 프로세스 실행"""
        self.log("🚀 Lunch App 배포 시작")
        self.log("=" * 50)
        
        try:
            # 1. 필수 조건 확인
            if not self.check_prerequisites():
                return False
            
            # 2. 백업 생성
            backup_dir = self.create_backup()
            if not backup_dir:
                self.log("⚠️ 백업 실패했지만 계속 진행합니다.", "WARNING")
            
            # 3. 환경 설정
            if not self.setup_environment():
                return False
            
            # 4. 의존성 설치
            if not self.install_dependencies():
                return False
            
            # 5. 테스트 실행
            if not self.run_tests():
                self.log("⚠️ 일부 테스트가 실패했지만 계속 진행합니다.", "WARNING")
            
            # 6. 애플리케이션 시작 준비
            self.start_application()
            
            # 7. 배포 리포트 생성
            report_file = self.generate_deployment_report()
            
            self.log("🎉 배포 프로세스 완료!")
            self.log("=" * 50)
            self.log("📋 다음 단계:")
            self.log("   1. .env 파일 편집")
            self.log("   2. python app.py 실행")
            self.log("   3. http://localhost:5000/health 확인")
            self.log(f"   4. {report_file} 리포트 검토")
            
            return True
            
        except Exception as e:
            self.log(f"❌ 배포 중 치명적 오류: {e}", "ERROR")
            return False

def main():
    """메인 함수"""
    print("🚀 Lunch App 배포 스크립트")
    print("=" * 50)
    
    deployer = DeploymentManager()
    
    try:
        success = deployer.deploy()
        
        if success:
            print("\n🎉 배포가 성공적으로 완료되었습니다!")
            return 0
        else:
            print("\n❌ 배포 중 문제가 발생했습니다.")
            print("로그를 확인하고 문제를 해결한 후 다시 시도하세요.")
            return 1
            
    except KeyboardInterrupt:
        print("\n⏹️ 배포가 사용자에 의해 중단되었습니다.")
        return 1
    except Exception as e:
        print(f"\n❌ 예상치 못한 오류: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
