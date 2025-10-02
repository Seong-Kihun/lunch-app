#!/usr/bin/env python3
"""
Restaurant 테이블 스키마 수정 스크립트
누락된 rating 컬럼을 추가합니다.
"""

import os
import sys
from sqlalchemy import text, inspect

# 프로젝트 루트를 Python 경로에 추가
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

# 레거시 import 제거 - CLI에서 create_app() 사용
from backend.app.extensions import db

def fix_restaurant_schema():
    """Restaurant 테이블에 누락된 컬럼들을 추가합니다."""
    
    with app.app_context():
        try:
            # 데이터베이스 연결 확인
            with db.engine.connect() as conn:
                # Restaurant 테이블의 현재 컬럼 확인
                inspector = inspect(db.engine)
                columns = inspector.get_columns('restaurant')
                column_names = [col['name'] for col in columns]
                
                print(f"현재 restaurant 테이블 컬럼들: {column_names}")
                
                # 누락된 컬럼들 추가
                missing_columns = []
                
                if 'rating' not in column_names:
                    missing_columns.append("ADD COLUMN rating FLOAT DEFAULT 0.0")
                
                if 'total_reviews' not in column_names:
                    missing_columns.append("ADD COLUMN total_reviews INTEGER DEFAULT 0")
                
                if 'category' not in column_names:
                    missing_columns.append("ADD COLUMN category VARCHAR(100)")
                
                if missing_columns:
                    # 컬럼 추가
                    alter_sql = f"ALTER TABLE restaurant {', '.join(missing_columns)}"
                    print(f"실행할 SQL: {alter_sql}")
                    
                    conn.execute(text(alter_sql))
                    conn.commit()
                    
                    print("✅ Restaurant 테이블 스키마가 성공적으로 수정되었습니다.")
                    print(f"추가된 컬럼들: {[col.split()[2] for col in missing_columns]}")
                else:
                    print("✅ 모든 필요한 컬럼이 이미 존재합니다.")
                
                # 수정된 컬럼들 확인
                inspector = inspect(db.engine)
                columns = inspector.get_columns('restaurant')
                column_names = [col['name'] for col in columns]
                print(f"수정된 restaurant 테이블 컬럼들: {column_names}")
                
        except Exception as e:
            print(f"❌ 스키마 수정 실패: {e}")
            return False
    
    return True

if __name__ == "__main__":
    print("🔧 Restaurant 테이블 스키마 수정 시작...")
    success = fix_restaurant_schema()
    
    if success:
        print("🎉 스키마 수정이 완료되었습니다!")
    else:
        print("💥 스키마 수정에 실패했습니다.")
        sys.exit(1)
