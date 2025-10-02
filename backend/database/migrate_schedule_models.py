#!/usr/bin/env python3
"""
일정 모델 마이그레이션 스크립트
기존 PersonalSchedule 모델을 새로운 구조로 변환
"""

import sys
import os
from datetime import datetime, date, timedelta
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# 프로젝트 루트를 Python 경로에 추가
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.app.app_factory import create_app
from backend.app.extensions import db
app = create_app()
from backend.models.schedule_models import PersonalSchedule, ScheduleException

def migrate_schedule_models():
    """기존 일정 데이터를 새로운 모델 구조로 마이그레이션"""
    
    with app.app_context():
        try:
            print("🔄 일정 모델 마이그레이션 시작...")
            
            # 1. 기존 테이블이 존재하는지 확인
            inspector = db.inspect(db.engine)
            existing_tables = inspector.get_table_names()
            
            print(f"📋 기존 테이블: {existing_tables}")
            
            # 2. 새로운 테이블 생성
            print("🔨 새로운 테이블 생성 중...")
            db.create_all()
            
            # 3. 기존 데이터가 있는지 확인
            try:
                # 기존 PersonalSchedule 테이블 확인 (다른 이름일 수 있음)
                old_schedules = db.session.execute(text("""
                    SELECT name FROM sqlite_master 
                    WHERE type='table' AND name LIKE '%schedule%'
                """)).fetchall()
                
                print(f"🔍 기존 일정 관련 테이블: {[row[0] for row in old_schedules]}")
                
                if old_schedules:
                    print("⚠️ 기존 일정 데이터가 발견되었습니다.")
                    print("   마이그레이션을 진행하려면 기존 데이터를 백업하고 수동으로 변환해야 합니다.")
                    return False
                else:
                    print("✅ 기존 일정 데이터가 없습니다. 새로 시작할 수 있습니다.")
                    return True
                    
            except Exception as e:
                print(f"ℹ️ 기존 테이블 확인 중 오류 (정상): {e}")
                print("✅ 새로운 테이블 구조로 시작합니다.")
                return True
                
        except Exception as e:
            print(f"❌ 마이그레이션 실패: {e}")
            return False

def create_sample_data():
    """새로운 모델 구조로 샘플 데이터 생성"""
    
    with app.app_context():
        try:
            print("🔨 샘플 데이터 생성 중...")
            
            # 샘플 마스터 일정 생성
            sample_schedule = PersonalSchedule(
                employee_id='1',
                title='점심 약속',
                start_date=datetime.now(),
                time='12:00',
                restaurant='맛있는 식당',
                location='회사 근처',
                description='팀원들과 점심 약속',
                is_recurring=True,
                recurrence_type='weekly',
                recurrence_interval=1,
                recurrence_end_date=datetime(2024, 12, 31),
                created_by='1'
            )
            
            db.session.add(sample_schedule)
            db.session.commit()
            
            print(f"✅ 샘플 일정 생성 완료: ID {sample_schedule.id}")
            
            # 샘플 예외 생성
            sample_exception = ScheduleException(
                original_schedule_id=sample_schedule.id,
                exception_date=datetime.now() + timedelta(days=7),
                is_modified=True,
                new_title='점심 약속 (수정됨)',
                new_time='13:00'
            )
            
            db.session.add(sample_exception)
            db.session.commit()
            
            print(f"✅ 샘플 예외 생성 완료: ID {sample_exception.id}")
            
            return True
            
        except Exception as e:
            print(f"❌ 샘플 데이터 생성 실패: {e}")
            db.session.rollback()
            return False

def verify_migration():
    """마이그레이션 결과 검증"""
    
    with app.app_context():
        try:
            print("🔍 마이그레이션 결과 검증 중...")
            
            # 테이블 존재 확인
            inspector = db.inspect(db.engine)
            tables = inspector.get_table_names()
            
            required_tables = ['personal_schedules', 'schedule_exceptions']
            missing_tables = [table for table in required_tables if table not in tables]
            
            if missing_tables:
                print(f"❌ 누락된 테이블: {missing_tables}")
                return False
            
            print("✅ 모든 필수 테이블이 생성되었습니다.")
            
            # 데이터 조회 테스트
            schedules = PersonalSchedule.query.all()
            exceptions = ScheduleException.query.all()
            
            print(f"📊 마스터 일정: {len(schedules)}개")
            print(f"📊 예외: {len(exceptions)}개")
            
            return True
            
        except Exception as e:
            print(f"❌ 검증 실패: {e}")
            return False

def main():
    """메인 실행 함수"""
    
    print("🚀 일정 모델 마이그레이션 시작")
    print("=" * 50)
    
    # 1. 마이그레이션 실행
    if not migrate_schedule_models():
        print("❌ 마이그레이션 실패")
        return
    
    # 2. 샘플 데이터 생성
    if not create_sample_data():
        print("❌ 샘플 데이터 생성 실패")
        return
    
    # 3. 결과 검증
    if not verify_migration():
        print("❌ 마이그레이션 검증 실패")
        return
    
    print("=" * 50)
    print("✅ 마이그레이션 완료!")
    print("🎉 이제 새로운 일정 시스템을 사용할 수 있습니다.")

if __name__ == '__main__':
    main()




