#!/usr/bin/env python3
"""
Redis 서버 설정 및 테스트 스크립트
Windows 환경에서 Redis를 설정하고 테스트합니다.
"""

import subprocess
import sys
import time
import requests
import json
import os

def check_redis_installed():
    """Redis가 설치되어 있는지 확인"""
    try:
        result = subprocess.run(['redis-server', '--version'], 
                              capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            print("✅ Redis가 이미 설치되어 있습니다.")
            print(f"버전: {result.stdout.strip()}")
            return True
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass
    
    print("❌ Redis가 설치되어 있지 않습니다.")
    return False

def install_redis_windows():
    """Windows에서 Redis 설치 (Chocolatey 사용)"""
    print("🔧 Redis 설치를 시도합니다...")
    
    try:
        # Chocolatey 설치 확인
        result = subprocess.run(['choco', '--version'], 
                              capture_output=True, text=True, timeout=5)
        if result.returncode != 0:
            print("❌ Chocolatey가 설치되어 있지 않습니다.")
            print("Chocolatey를 먼저 설치해주세요: https://chocolatey.org/install")
            return False
        
        # Redis 설치
        print("Redis를 설치합니다...")
        result = subprocess.run(['choco', 'install', 'redis-64', '-y'], 
                              capture_output=True, text=True, timeout=300)
        
        if result.returncode == 0:
            print("✅ Redis 설치가 완료되었습니다.")
            return True
        else:
            print(f"❌ Redis 설치 실패: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"❌ Redis 설치 중 오류 발생: {e}")
        return False

def start_redis_server():
    """Redis 서버 시작"""
    print("🚀 Redis 서버를 시작합니다...")
    
    try:
        # Redis 서버 시작 (백그라운드)
        process = subprocess.Popen(['redis-server'], 
                                 stdout=subprocess.PIPE, 
                                 stderr=subprocess.PIPE)
        
        # 서버 시작 대기
        time.sleep(3)
        
        # Redis 연결 테스트
        if test_redis_connection():
            print("✅ Redis 서버가 성공적으로 시작되었습니다.")
            return process
        else:
            print("❌ Redis 서버 시작 실패")
            process.terminate()
            return None
            
    except Exception as e:
        print(f"❌ Redis 서버 시작 중 오류 발생: {e}")
        return None

def test_redis_connection():
    """Redis 연결 테스트"""
    try:
        import redis
        r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
        r.ping()
        print("✅ Redis 연결 테스트 성공")
        return True
    except Exception as e:
        print(f"❌ Redis 연결 테스트 실패: {e}")
        return False

def test_redis_functionality():
    """Redis 기능 테스트"""
    try:
        import redis
        r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
        
        # 기본 기능 테스트
        r.set('test_key', 'test_value')
        value = r.get('test_key')
        
        if value == 'test_value':
            print("✅ Redis 기본 기능 테스트 성공")
            
            # 캐시 테스트
            r.set('cache_test', json.dumps({'data': 'test', 'timestamp': time.time()}))
            cached_data = json.loads(r.get('cache_test'))
            
            if cached_data['data'] == 'test':
                print("✅ Redis 캐시 기능 테스트 성공")
                return True
            else:
                print("❌ Redis 캐시 기능 테스트 실패")
                return False
        else:
            print("❌ Redis 기본 기능 테스트 실패")
            return False
            
    except Exception as e:
        print(f"❌ Redis 기능 테스트 실패: {e}")
        return False

def create_redis_config():
    """Redis 설정 파일 생성"""
    config_content = """# Redis 설정 파일
port 6379
bind 127.0.0.1
timeout 300
tcp-keepalive 60
maxmemory 256mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
"""
    
    try:
        with open('redis.conf', 'w', encoding='utf-8') as f:
            f.write(config_content)
        print("✅ Redis 설정 파일이 생성되었습니다.")
        return True
    except Exception as e:
        print(f"❌ Redis 설정 파일 생성 실패: {e}")
        return False

def setup_redis_for_app():
    """앱에서 Redis 사용을 위한 설정"""
    print("🔧 앱에서 Redis 사용을 위한 설정을 확인합니다...")
    
    # requirements.txt에 redis 추가 확인
    try:
        with open('requirements.txt', 'r', encoding='utf-8') as f:
            content = f.read()
            if 'redis' in content:
                print("✅ requirements.txt에 redis가 포함되어 있습니다.")
            else:
                print("⚠️ requirements.txt에 redis가 없습니다. 추가가 필요할 수 있습니다.")
    except Exception as e:
        print(f"⚠️ requirements.txt 확인 실패: {e}")
    
    # 환경 변수 설정 확인
    env_vars = {
        'REDIS_URL': 'redis://localhost:6379/0',
        'OFFLINE_MODE': 'false'
    }
    
    print("📝 환경 변수 설정:")
    for key, value in env_vars.items():
        print(f"  {key}={value}")
    
    return True

def main():
    """메인 실행 함수"""
    print("🚀 Redis 설정 및 테스트 시작")
    print("=" * 50)
    
    # 1. Redis 설치 확인
    if not check_redis_installed():
        print("\n📦 Redis 설치를 시도합니다...")
        if not install_redis_windows():
            print("❌ Redis 설치에 실패했습니다.")
            print("수동으로 Redis를 설치해주세요:")
            print("1. https://github.com/microsoftarchive/redis/releases 에서 다운로드")
            print("2. 또는 Docker 사용: docker run -d -p 6379:6379 redis:alpine")
            return False
    
    # 2. Redis 설정 파일 생성
    create_redis_config()
    
    # 3. Redis 서버 시작
    redis_process = start_redis_server()
    if not redis_process:
        print("❌ Redis 서버 시작에 실패했습니다.")
        return False
    
    # 4. Redis 기능 테스트
    if not test_redis_functionality():
        print("❌ Redis 기능 테스트에 실패했습니다.")
        redis_process.terminate()
        return False
    
    # 5. 앱 설정 확인
    setup_redis_for_app()
    
    print("\n" + "=" * 50)
    print("🎉 Redis 설정이 완료되었습니다!")
    print("=" * 50)
    print("✅ Redis 서버가 실행 중입니다.")
    print("✅ 캐싱 시스템이 활성화되었습니다.")
    print("✅ 앱에서 Redis를 사용할 수 있습니다.")
    print("\n📝 다음 단계:")
    print("1. 앱을 재시작하여 Redis 연결을 확인하세요.")
    print("2. python test_production_api.py로 테스트를 실행하세요.")
    print("3. Redis 모니터링: redis-cli monitor")
    
    return True

if __name__ == "__main__":
    success = main()
    if not success:
        sys.exit(1)
