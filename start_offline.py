#!/usr/bin/env python3
"""
오프라인 개발 환경 시작 스크립트
맥도날드 같은 공공 WiFi에서 개발할 때 사용
"""
import os
import sys
import subprocess
import shutil
from pathlib import Path

def setup_offline_environment():
    """오프라인 개발 환경 설정"""
    print("🔧 오프라인 개발 환경을 설정합니다...")
    
    # .env 파일이 없으면 offline.env를 복사
    if not os.path.exists('.env'):
        if os.path.exists('offline.env'):
            shutil.copy('offline.env', '.env')
            print("✅ .env 파일을 생성했습니다 (offline.env에서 복사)")
        else:
            print("⚠️ offline.env 파일이 없습니다. 기본 설정을 사용합니다.")
    else:
        print("ℹ️ .env 파일이 이미 존재합니다.")
    
    # 환경변수 설정
    os.environ['OFFLINE_MODE'] = 'true'
    os.environ['FLASK_ENV'] = 'development'
    os.environ['ENV'] = 'development'
    
    print("✅ 오프라인 모드 환경변수가 설정되었습니다.")

def start_backend():
    """백엔드 서버 시작"""
    print("\n🚀 백엔드 서버를 시작합니다...")
    try:
        subprocess.run([sys.executable, 'app.py'], check=True)
    except KeyboardInterrupt:
        print("\n⏹️ 백엔드 서버가 중지되었습니다.")
    except Exception as e:
        print(f"❌ 백엔드 서버 시작 실패: {e}")

def start_frontend():
    """프론트엔드 서버 시작"""
    print("\n🚀 프론트엔드 서버를 시작합니다...")
    frontend_dir = Path('lunch_app_frontend')
    
    if not frontend_dir.exists():
        print("❌ lunch_app_frontend 디렉토리를 찾을 수 없습니다.")
        return
    
    try:
        # 오프라인 모드로 Expo 시작
        subprocess.run(['npx', 'expo', 'start', '--offline'], 
                      cwd=frontend_dir, check=True)
    except KeyboardInterrupt:
        print("\n⏹️ 프론트엔드 서버가 중지되었습니다.")
    except Exception as e:
        print(f"❌ 프론트엔드 서버 시작 실패: {e}")

def main():
    """메인 함수"""
    print("🍟 맥도날드 개발 환경 설정 도구")
    print("=" * 40)
    
    setup_offline_environment()
    
    print("\n사용 가능한 명령어:")
    print("1. 백엔드만 시작: python start_offline.py backend")
    print("2. 프론트엔드만 시작: python start_offline.py frontend")
    print("3. 둘 다 시작: python start_offline.py all")
    
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        
        if command == 'backend':
            start_backend()
        elif command == 'frontend':
            start_frontend()
        elif command == 'all':
            print("⚠️ 두 서버를 동시에 시작하려면 각각 다른 터미널에서 실행하세요.")
            print("터미널 1: python start_offline.py backend")
            print("터미널 2: python start_offline.py frontend")
        else:
            print(f"❌ 알 수 없는 명령어: {command}")
    else:
        print("\n💡 도움말을 보려면: python start_offline.py --help")

if __name__ == '__main__':
    main()
