#!/usr/bin/env python3
"""
Render 배포용 보안 키 생성 스크립트
"""

import secrets
import string

def generate_secret_key(length=32):
    """안전한 시크릿 키 생성"""
    return secrets.token_urlsafe(length)

def generate_jwt_secret(length=32):
    """JWT용 시크릿 키 생성"""
    return secrets.token_urlsafe(length)

def main():
    print("🔐 Render 배포용 보안 키 생성")
    print("=" * 50)
    
    # 보안 키 생성
    secret_key = generate_secret_key()
    jwt_secret = generate_jwt_secret()
    
    print("\n📋 Render 환경변수 설정:")
    print("-" * 30)
    print(f"SECRET_KEY={secret_key}")
    print(f"JWT_SECRET_KEY={jwt_secret}")
    print("FLASK_ENV=production")
    print("ENV=production")
    print("OFFLINE_MODE=true")
    
    print("\n📝 Render 대시보드 설정 방법:")
    print("-" * 30)
    print("1. Render 대시보드 → Your Service → Environment")
    print("2. Add Environment Variable 클릭")
    print("3. 위의 각 변수를 하나씩 추가")
    
    print("\n⚠️  주의사항:")
    print("-" * 30)
    print("- 이 키들을 안전하게 보관하세요")
    print("- 공개 저장소에 커밋하지 마세요")
    print("- 프로덕션에서는 반드시 강력한 키를 사용하세요")
    
    # .env 파일 생성 (로컬 개발용)
    env_content = f"""# Render 배포용 환경변수
# 이 파일은 로컬 개발용입니다. Render에서는 대시보드에서 설정하세요.

SECRET_KEY={secret_key}
JWT_SECRET_KEY={jwt_secret}
FLASK_ENV=production
ENV=production
OFFLINE_MODE=true

# 데이터베이스 (Render에서 자동 설정)
# DATABASE_URL=postgresql://...

# Redis (선택사항)
# REDIS_URL=redis://...
# CELERY_BROKER_URL=redis://...
# CELERY_RESULT_BACKEND=redis://...
"""
    
    with open('.env.render', 'w', encoding='utf-8') as f:
        f.write(env_content)
    
    print(f"\n✅ .env.render 파일이 생성되었습니다.")
    print("   (로컬 테스트용 - Render에서는 사용하지 마세요)")

if __name__ == "__main__":
    main()
