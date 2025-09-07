#!/usr/bin/env python3
"""
데이터 정합성 검사 스크립트
외래키 제약조건 복원 전 데이터 무결성을 검사합니다.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from extensions import db
from app import app
from auth.models import User, Friendship
from models.app_models import Party, PartyMember, Restaurant, Review, UserActivity

class DataIntegrityChecker:
    def __init__(self):
        self.issues = []
        self.warnings = []
        self.stats = {}
    
    def check_user_references(self):
        """사용자 참조 무결성 검사"""
        print("👤 사용자 참조 무결성 검사...")
        
        with app.app_context():
            # Party.host_employee_id 참조 검사
            parties = Party.query.all()
            invalid_host_refs = 0
            
            for party in parties:
                if party.host_employee_id:
                    user = User.query.filter_by(employee_id=party.host_employee_id).first()
                    if not user:
                        invalid_host_refs += 1
                        self.issues.append(f"Party {party.id}: host_employee_id '{party.host_employee_id}' 참조하는 사용자가 없음")
            
            self.stats['parties_with_invalid_host'] = invalid_host_refs
            print(f"   파티 호스트 참조: {invalid_host_refs}개 문제 발견")
            
            # PartyMember.employee_id 참조 검사
            party_members = PartyMember.query.all()
            invalid_member_refs = 0
            
            for member in party_members:
                if member.employee_id:
                    user = User.query.filter_by(employee_id=member.employee_id).first()
                    if not user:
                        invalid_member_refs += 1
                        self.issues.append(f"PartyMember {member.id}: employee_id '{member.employee_id}' 참조하는 사용자가 없음")
            
            self.stats['party_members_with_invalid_ref'] = invalid_member_refs
            print(f"   파티 멤버 참조: {invalid_member_refs}개 문제 발견")
    
    def check_friendship_integrity(self):
        """친구 관계 무결성 검사"""
        print("👥 친구 관계 무결성 검사...")
        
        with app.app_context():
            friendships = Friendship.query.all()
            invalid_friendships = 0
            
            for friendship in friendships:
                # requester_id 검사
                requester = User.query.filter_by(employee_id=friendship.requester_id).first()
                if not requester:
                    invalid_friendships += 1
                    self.issues.append(f"Friendship {friendship.id}: requester_id '{friendship.requester_id}' 참조하는 사용자가 없음")
                
                # receiver_id 검사
                receiver = User.query.filter_by(employee_id=friendship.receiver_id).first()
                if not receiver:
                    invalid_friendships += 1
                    self.issues.append(f"Friendship {friendship.id}: receiver_id '{friendship.receiver_id}' 참조하는 사용자가 없음")
                
                # 자기 자신과의 친구 관계 검사
                if friendship.requester_id == friendship.receiver_id:
                    self.warnings.append(f"Friendship {friendship.id}: 자기 자신과의 친구 관계")
            
            self.stats['invalid_friendships'] = invalid_friendships
            print(f"   친구 관계: {invalid_friendships}개 문제 발견")
    
    def check_restaurant_references(self):
        """식당 참조 무결성 검사"""
        print("🍽️ 식당 참조 무결성 검사...")
        
        with app.app_context():
            # Review.restaurant_id 참조 검사
            reviews = Review.query.all()
            invalid_review_refs = 0
            
            for review in reviews:
                if review.restaurant_id:
                    restaurant = Restaurant.query.filter_by(id=review.restaurant_id).first()
                    if not restaurant:
                        invalid_review_refs += 1
                        self.issues.append(f"Review {review.id}: restaurant_id '{review.restaurant_id}' 참조하는 식당이 없음")
            
            self.stats['reviews_with_invalid_restaurant'] = invalid_review_refs
            print(f"   리뷰 식당 참조: {invalid_review_refs}개 문제 발견")
    
    def check_duplicate_data(self):
        """중복 데이터 검사"""
        print("🔄 중복 데이터 검사...")
        
        with app.app_context():
            # 중복 사용자 검사
            duplicate_users = db.session.query(User.employee_id).group_by(User.employee_id).having(db.func.count(User.employee_id) > 1).all()
            self.stats['duplicate_users'] = len(duplicate_users)
            print(f"   중복 사용자: {len(duplicate_users)}개 발견")
            
            # 중복 친구 관계 검사
            duplicate_friendships = db.session.query(
                Friendship.requester_id, Friendship.receiver_id
            ).group_by(
                Friendship.requester_id, Friendship.receiver_id
            ).having(db.func.count() > 1).all()
            self.stats['duplicate_friendships'] = len(duplicate_friendships)
            print(f"   중복 친구 관계: {len(duplicate_friendships)}개 발견")
    
    def generate_cleanup_script(self):
        """정리 스크립트 생성"""
        print("\n🧹 정리 스크립트 생성...")
        
        cleanup_script = """#!/usr/bin/env python3
\"\"\"
데이터 정합성 정리 스크립트
외래키 제약조건 복원 전 데이터를 정리합니다.
\"\"\"

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from extensions import db
from app import app
from auth.models import User, Friendship
from models.app_models import Party, PartyMember, Restaurant, Review

def cleanup_invalid_references():
    \"\"\"무효한 참조 정리\"\"\"
    with app.app_context():
        print("🧹 무효한 참조 정리 시작...")
        
        # 무효한 파티 호스트 참조 정리
        parties = Party.query.all()
        for party in parties:
            if party.host_employee_id:
                user = User.query.filter_by(employee_id=party.host_employee_id).first()
                if not user:
                    print(f"   파티 {party.id}의 무효한 호스트 참조 제거: {party.host_employee_id}")
                    party.host_employee_id = None
        
        # 무효한 파티 멤버 참조 정리
        party_members = PartyMember.query.all()
        for member in party_members:
            if member.employee_id:
                user = User.query.filter_by(employee_id=member.employee_id).first()
                if not user:
                    print(f"   파티 멤버 {member.id}의 무효한 참조 제거: {member.employee_id}")
                    db.session.delete(member)
        
        # 무효한 친구 관계 정리
        friendships = Friendship.query.all()
        for friendship in friendships:
            requester = User.query.filter_by(employee_id=friendship.requester_id).first()
            receiver = User.query.filter_by(employee_id=friendship.receiver_id).first()
            
            if not requester or not receiver:
                print(f"   무효한 친구 관계 제거: {friendship.id}")
                db.session.delete(friendship)
            elif friendship.requester_id == friendship.receiver_id:
                print(f"   자기 자신과의 친구 관계 제거: {friendship.id}")
                db.session.delete(friendship)
        
        # 무효한 리뷰 참조 정리
        reviews = Review.query.all()
        for review in reviews:
            if review.restaurant_id:
                restaurant = Restaurant.query.filter_by(id=review.restaurant_id).first()
                if not restaurant:
                    print(f"   무효한 리뷰 제거: {review.id}")
                    db.session.delete(review)
        
        db.session.commit()
        print("✅ 정리 완료")

if __name__ == "__main__":
    cleanup_invalid_references()
"""
        
        with open('cleanup_data_integrity.py', 'w', encoding='utf-8') as f:
            f.write(cleanup_script)
        
        print("✅ 정리 스크립트가 cleanup_data_integrity.py에 생성되었습니다.")
    
    def run_all_checks(self):
        """모든 검사 실행"""
        print("🔍 데이터 정합성 검사 시작")
        print("=" * 50)
        
        self.check_user_references()
        self.check_friendship_integrity()
        self.check_restaurant_references()
        self.check_duplicate_data()
        
        # 결과 요약
        print("\n📋 검사 결과 요약")
        print("=" * 50)
        print(f"🚨 심각한 문제: {len(self.issues)}개")
        print(f"⚠️ 경고: {len(self.warnings)}개")
        
        if self.issues:
            print("\n🚨 발견된 문제들:")
            for issue in self.issues[:10]:  # 처음 10개만 표시
                print(f"   • {issue}")
            if len(self.issues) > 10:
                print(f"   ... 및 {len(self.issues) - 10}개 더")
        
        if self.warnings:
            print("\n⚠️ 경고사항들:")
            for warning in self.warnings[:5]:  # 처음 5개만 표시
                print(f"   • {warning}")
            if len(self.warnings) > 5:
                print(f"   ... 및 {len(self.warnings) - 5}개 더")
        
        # 통계
        print("\n📊 통계:")
        for key, value in self.stats.items():
            print(f"   • {key}: {value}")
        
        # 권장사항
        print("\n💡 권장사항:")
        if self.issues:
            print("   1. cleanup_data_integrity.py를 실행하여 무효한 참조를 정리하세요")
            print("   2. 정리 완료 후 외래키 제약조건을 복원하세요")
        else:
            print("   ✅ 데이터가 깨끗합니다. 외래키 제약조건을 안전하게 복원할 수 있습니다.")
        
        return len(self.issues) == 0

def main():
    """메인 함수"""
    checker = DataIntegrityChecker()
    
    try:
        success = checker.run_all_checks()
        checker.generate_cleanup_script()
        
        if success:
            print("\n🎉 모든 검사가 성공했습니다!")
            return 0
        else:
            print("\n⚠️ 일부 문제가 발견되었습니다. 정리 후 다시 시도하세요.")
            return 1
            
    except Exception as e:
        print(f"\n❌ 검사 중 오류 발생: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
