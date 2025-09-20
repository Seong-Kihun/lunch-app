#!/usr/bin/env python3
"""
데이터 정합성 정리 스크립트
외래키 제약조건 복원 전 데이터를 정리합니다.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from extensions import db
from app import app
from models.app_models import User, Friendship
from models.app_models import Party, PartyMember, Restaurant, Review

def cleanup_invalid_references():
    """무효한 참조 정리"""
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
