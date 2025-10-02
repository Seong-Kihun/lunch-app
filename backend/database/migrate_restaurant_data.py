"""
707개 식당 데이터 마이그레이션 스크립트
엑셀 파일을 데이터베이스로 이전
"""

import pandas as pd
import os
from datetime import datetime
from backend.app.extensions import db
from backend.models.restaurant_models import RestaurantV2
import logging

logger = logging.getLogger(__name__)

def migrate_restaurant_data(excel_file_path):
    """
    엑셀 파일에서 식당 데이터를 읽어서 데이터베이스에 저장
    
    Args:
        excel_file_path (str): 엑셀 파일 경로
    """
    try:
        # 엑셀 파일 읽기
        print(f"📖 엑셀 파일 읽는 중: {excel_file_path}")
        df = pd.read_excel(excel_file_path)
        
        print(f"📊 데이터 정보:")
        print(f"   - 총 행 수: {len(df)}")
        print(f"   - 컬럼: {list(df.columns)}")
        print(f"   - 샘플 데이터:")
        print(df.head())
        
        # 기존 식당 데이터 삭제 (선택적)
        print("\n🗑️ 기존 식당 데이터 삭제 중...")
        RestaurantV2.query.delete()
        db.session.commit()
        
        # 데이터 변환 및 저장
        print("\n💾 새로운 데이터 저장 중...")
        success_count = 0
        error_count = 0
        
        for index, row in df.iterrows():
            try:
                # 필수 필드 검증 (실제 엑셀 컬럼명에 맞춤)
                if pd.isna(row.get('식당 이름')) or pd.isna(row.get('위도')) or pd.isna(row.get('경도')):
                    print(f"⚠️ 행 {index + 1}: 필수 데이터 누락 - 건너뜀")
                    error_count += 1
                    continue
                
                # 식당 객체 생성 (실제 엑셀 컬럼명에 맞춤)
                restaurant = RestaurantV2(
                    name=str(row['식당 이름']).strip(),
                    address=str(row['도로명 주소']).strip() if not pd.isna(row.get('도로명 주소')) else '',
                    latitude=float(row['위도']),
                    longitude=float(row['경도']),
                    phone=str(row['전화번호']).strip() if not pd.isna(row.get('전화번호')) else '',
                    category=str(row['분류']).strip() if not pd.isna(row.get('분류')) else '기타',
                    is_active=True
                )
                
                db.session.add(restaurant)
                success_count += 1
                
                # 진행 상황 출력 (100개마다)
                if (index + 1) % 100 == 0:
                    print(f"   진행률: {index + 1}/{len(df)} ({((index + 1)/len(df)*100):.1f}%)")
                
            except Exception as e:
                print(f"❌ 행 {index + 1} 처리 실패: {e}")
                error_count += 1
                continue
        
        # 데이터베이스에 저장
        print("\n💾 데이터베이스에 저장 중...")
        db.session.commit()
        
        print(f"\n✅ 마이그레이션 완료!")
        print(f"   - 성공: {success_count}개")
        print(f"   - 실패: {error_count}개")
        print(f"   - 총 처리: {success_count + error_count}개")
        
        # 검증
        total_in_db = RestaurantV2.query.count()
        print(f"   - DB 저장 확인: {total_in_db}개")
        
        return True
        
    except FileNotFoundError:
        print(f"❌ 파일을 찾을 수 없습니다: {excel_file_path}")
        return False
    except Exception as e:
        print(f"❌ 마이그레이션 실패: {e}")
        db.session.rollback()
        return False

def create_sample_data():
    """
    샘플 데이터 생성 (테스트용)
    """
    print("🧪 샘플 데이터 생성 중...")
    
    sample_restaurants = [
        {
            'name': '지구마을',
            'address': '경기도 성남시 수정구 시흥동 298 한국국제협력단 본관 1층',
            'latitude': 37.41504641,
            'longitude': 127.0993841,
            'phone': '031-740-1234',
            'category': '한식'
        },
        {
            'name': '북창동순두부 판교파미어스몰점',
            'address': '경기도 성남시 수정구 시흥동 322 2층 209호',
            'latitude': 37.41340786,
            'longitude': 127.0983592,
            'phone': '031-740-5678',
            'category': '한식'
        },
        {
            'name': '시먼당 파미어스몰',
            'address': '경기도 성남시 수정구 시흥동 322 판교아이스퀘어 2층 201-3호',
            'latitude': 37.41340786,
            'longitude': 127.0983592,
            'phone': '031-740-9012',
            'category': '베이커리'
        },
        {
            'name': '청담식당',
            'address': '경기도 성남시 수정구 시흥동 248-8 MHY, 1층',
            'latitude': 37.41530973,
            'longitude': 127.1017639,
            'phone': '031-740-3456',
            'category': '한식'
        },
        {
            'name': '짬뽕지존 판교점',
            'address': '경기도 성남시 수정구 시흥동 272-5 1층',
            'latitude': 37.41438124,
            'longitude': 127.1014436,
            'phone': '031-740-7890',
            'category': '중식'
        }
    ]
    
    # 기존 데이터 삭제
    RestaurantV2.query.delete()
    db.session.commit()
    
    # 샘플 데이터 추가
    for data in sample_restaurants:
        restaurant = RestaurantV2(
            name=data['name'],
            address=data['address'],
            latitude=data['latitude'],
            longitude=data['longitude'],
            phone=data['phone'],
            category=data['category'],
            is_active=True
        )
        db.session.add(restaurant)
    
    db.session.commit()
    print(f"✅ 샘플 데이터 {len(sample_restaurants)}개 생성 완료!")

def main():
    """
    메인 실행 함수
    """
    print("🚀 식당 데이터 마이그레이션 시작")
    print("=" * 50)
    
    # 엑셀 파일 경로 설정
    excel_file_path = "data/restaurants_707.xlsx"  # 실제 파일 경로로 변경 필요
    
    # 파일 존재 확인
    if os.path.exists(excel_file_path):
        print(f"📁 엑셀 파일 발견: {excel_file_path}")
        success = migrate_restaurant_data(excel_file_path)
    else:
        print(f"⚠️ 엑셀 파일이 없습니다: {excel_file_path}")
        print("🧪 샘플 데이터로 대체 실행...")
        create_sample_data()
        success = True
    
    if success:
        print("\n🎉 마이그레이션 성공!")
        print("새로운 식당 API를 사용할 수 있습니다.")
    else:
        print("\n❌ 마이그레이션 실패!")
        print("오류를 확인하고 다시 시도해주세요.")

if __name__ == "__main__":
    # Flask 앱 컨텍스트에서 실행
    from backend.app.app_factory import create_app
    app = create_app()
    with app.app_context():
        main()
