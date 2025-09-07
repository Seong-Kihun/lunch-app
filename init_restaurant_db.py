"""
새로운 식당 데이터베이스 초기화 스크립트
"""

from app import app
from extensions import db
from models.restaurant_models import Restaurant, RestaurantReview, RestaurantVisit

def init_restaurant_database():
    """
    식당 관련 데이터베이스 테이블 생성
    """
    try:
        print("🗄️ 식당 데이터베이스 테이블 생성 중...")
        
        with app.app_context():
            # 테이블 생성
            db.create_all()
            
            print("✅ 식당 데이터베이스 테이블 생성 완료!")
            print("   - restaurants 테이블")
            print("   - restaurant_reviews 테이블") 
            print("   - restaurant_visits 테이블")
            
            # 테이블 정보 확인
            from sqlalchemy import inspect
            inspector = inspect(db.engine)
            tables = inspector.get_table_names()
            
            print(f"\n📊 생성된 테이블 목록:")
            for table in tables:
                if 'restaurant' in table:
                    print(f"   - {table}")
            
            return True
            
    except Exception as e:
        print(f"❌ 데이터베이스 초기화 실패: {e}")
        return False

if __name__ == "__main__":
    init_restaurant_database()
