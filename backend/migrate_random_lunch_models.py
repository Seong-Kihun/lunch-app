#!/usr/bin/env python3
"""
랜덤런치 모델 마이그레이션 스크립트
프로덕션 환경에서 실제 데이터베이스 테이블 생성
"""

import sys
import os

# 프로젝트 루트 디렉토리를 Python 경로에 추가
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

# 현재 디렉토리를 Python 경로에 추가
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

def migrate_random_lunch_models():
    """랜덤런치 모델 테이블 생성"""
    try:
        print("랜덤런치 모델 마이그레이션 시작...")

        # Flask 앱 초기화
        from backend.app.app_factory import create_app
        app = create_app()

        with app.app_context():
            from backend.app.extensions import db
            from backend.models.app_models import RandomLunchGroup, RandomLunchMember

            print("데이터베이스 연결 확인...")

            # 테이블 생성
            print("RandomLunchGroup 테이블 생성 중...")
            RandomLunchGroup.__table__.create(db.engine, checkfirst=True)

            print("RandomLunchMember 테이블 생성 중...")
            RandomLunchMember.__table__.create(db.engine, checkfirst=True)

            print("랜덤런치 모델 마이그레이션 완료!")
            print("생성된 테이블:")
            print("   - random_lunch_group")
            print("   - random_lunch_member")

    except Exception as e:
        print(f"마이그레이션 실패: {e}")
        return False

    return True

if __name__ == "__main__":
    success = migrate_random_lunch_models()
    if success:
        print("랜덤런치 모델 마이그레이션이 성공적으로 완료되었습니다!")
    else:
        print("랜덤런치 모델 마이그레이션이 실패했습니다.")
        sys.exit(1)
