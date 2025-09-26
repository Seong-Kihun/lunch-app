"""
추천 시스템 관련 유틸리티 함수들
"""
import random
from datetime import datetime, timedelta
from backend.app.extensions import db
from backend.models.app_models import Party, PartyMember, LunchProposal
from backend.auth.models import User


def get_available_users_for_date(date_str):
    """특정 날짜에 사용할 수 있는 사용자 목록 반환"""
    try:
        # 해당 날짜에 이미 파티에 참여한 사용자들 조회
        party_participants = _get_party_participants(date_str)
        
        # 해당 날짜에 개인 일정이 있는 사용자들 조회
        scheduled_users = _get_scheduled_users(date_str)
        
        # 모든 사용자 ID 조회
        all_user_ids = _get_all_user_ids()
        
        # 사용 가능한 사용자 = 전체 - (파티 참여자 + 일정 있는 사용자)
        unavailable_users = set(party_participants + scheduled_users)
        available_users = [uid for uid in all_user_ids if uid not in unavailable_users]
        
        print(f"DEBUG: 날짜 {date_str} - 전체 사용자: {len(all_user_ids)}, 사용 가능: {len(available_users)}")
        return available_users
        
    except Exception as e:
        print(f"ERROR: get_available_users_for_date 실행 중 오류: {e}")
        return []


def _get_party_participants(date_str):
    """특정 날짜의 파티 참여자들 조회"""
    try:
        parties = Party.query.filter(Party.party_date == date_str).all()
        participants = []
        
        for party in parties:
            # 호스트 추가
            participants.append(party.host_employee_id)
            
            # 멤버들 추가
            members = PartyMember.query.filter(PartyMember.party_id == party.id).all()
            for member in members:
                participants.append(member.employee_id)
        
        return list(set(participants))  # 중복 제거
        
    except Exception as e:
        print(f"ERROR: _get_party_participants 실행 중 오류: {e}")
        return []


def _get_scheduled_users(date_str):
    """특정 날짜에 개인 일정이 있는 사용자들 조회"""
    try:
        from models.schedule_models import PersonalSchedule
        
        schedules = PersonalSchedule.query.filter(
            PersonalSchedule.schedule_date == date_str
        ).all()
        
        return [schedule.employee_id for schedule in schedules]
        
    except Exception as e:
        print(f"ERROR: _get_scheduled_users 실행 중 오류: {e}")
        return []


def _get_all_user_ids():
    """모든 사용자 ID 조회"""
    try:
        # 실제 데이터베이스에서 사용자 조회
        users = User.query.all()
        if users:
            return [user.employee_id for user in users]
        
        # 데이터베이스에 사용자가 없으면 빈 리스트 반환
        return []
        
    except Exception as e:
        print(f"ERROR: _get_all_user_ids 실행 중 오류: {e}")
        return []


def generate_efficient_groups(scored_users, target_date_str, requester_id):
    """효율적인 그룹 생성"""
    try:
        recommendations = []
        
        # 3인 그룹 생성 (최우선)
        three_person_groups = _create_three_person_groups(scored_users, target_date_str, requester_id)
        recommendations.extend(three_person_groups)
        
        # 2인 그룹 생성
        two_person_groups = _create_two_person_groups(scored_users, target_date_str, requester_id)
        recommendations.extend(two_person_groups)
        
        # 1인 그룹 생성 (마지막 수단)
        one_person_groups = _create_one_person_groups(scored_users, target_date_str, requester_id)
        recommendations.extend(one_person_groups)
        
        return recommendations[:10]  # 최대 10개 추천
        
    except Exception as e:
        print(f"ERROR: generate_efficient_groups 실행 중 오류: {e}")
        return []


def _create_three_person_groups(scored_users, target_date_str, requester_id, max_groups=6):
    """3인 그룹 생성"""
    groups = []
    used_users = set()
    
    for i in range(0, len(scored_users) - 1, 2):
        if len(groups) >= max_groups:
            break
            
        user1 = scored_users[i]
        user2 = scored_users[i + 1] if i + 1 < len(scored_users) else None
        
        if user1['user_id'] not in used_users and (not user2 or user2['user_id'] not in used_users):
            group_members = [user1]
            if user2:
                group_members.append(user2)
            
            group = create_recommendation(group_members, target_date_str, requester_id)
            groups.append(group)
            
            used_users.add(user1['user_id'])
            if user2:
                used_users.add(user2['user_id'])
    
    return groups


def _create_two_person_groups(scored_users, target_date_str, requester_id, max_groups=3):
    """2인 그룹 생성"""
    groups = []
    
    for i, user in enumerate(scored_users[:max_groups]):
        group = create_recommendation([user], target_date_str, requester_id)
        groups.append(group)
    
    return groups


def _create_one_person_groups(scored_users, target_date_str, requester_id, max_groups=1):
    """1인 그룹 생성 (혼자 식사)"""
    if not scored_users:
        return []
    
    # 가장 높은 점수의 사용자와 함께하는 1인 그룹
    best_user = scored_users[0]
    group = create_recommendation([best_user], target_date_str, requester_id)
    return [group]


def create_recommendation(group, target_date_str, requester_id):
    """추천 그룹 생성"""
    try:
        # 그룹 멤버 정보 구성
        members = []
        total_compatibility = 0
        
        for member in group:
            members.append({
                "user_id": member['user_id'],
                "nickname": member['nickname'],
                "compatibility_score": member.get('compatibility_score', 0)
            })
            total_compatibility += member.get('compatibility_score', 0)
        
        # 평균 호환성 점수 계산
        avg_compatibility = total_compatibility / len(members) if members else 0
        
        # 추천 이유 생성
        reasons = []
        if avg_compatibility > 80:
            reasons.append("매우 높은 호환성")
        elif avg_compatibility > 60:
            reasons.append("좋은 호환성")
        else:
            reasons.append("새로운 만남")
        
        if len(members) >= 3:
            reasons.append("활발한 대화 가능")
        elif len(members) == 2:
            reasons.append("친밀한 대화 가능")
        
        return {
            "id": f"rec_{target_date_str}_{len(members)}_{random.randint(1000, 9999)}",
            "date": target_date_str,
            "members": members,
            "group_size": len(members),
            "compatibility_score": round(avg_compatibility, 1),
            "reasons": reasons,
            "created_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"ERROR: create_recommendation 실행 중 오류: {e}")
        return None


def get_user_preference(user_id, preference_type):
    """사용자 선호도 조회"""
    try:
        # 실제 데이터베이스에서 사용자 조회
        user = User.query.filter_by(employee_id=user_id).first()
        if user:
            if preference_type == "food":
                return getattr(user, 'food_preferences', '').split(',')
            elif preference_type == "lunch_style":
                return getattr(user, 'lunch_preference', '').split(',')
        
        # 실제 데이터베이스에서 사용자 조회
        user = User.query.filter_by(employee_id=user_id).first()
        if user:
            user_data = {
                "employee_id": user.employee_id,
                "nickname": user.nickname,
                "food_preferences": getattr(user, 'food_preferences', ''),
                "lunch_style": getattr(user, 'lunch_style', ''),
                "allergies": getattr(user, 'allergies', ''),
                "preferred_time": getattr(user, 'preferred_time', '12:00')
            }
        else:
            user_data = None
        
        if user_data:
            if preference_type == "food":
                return user_data['food_preferences'].split(',')
            elif preference_type == "lunch_style":
                return user_data['lunchStyle']
        
        return []
        
    except Exception as e:
        print(f"ERROR: get_user_preference 실행 중 오류: {e}")
        return []


def calculate_compatibility_score_cached(user1, user2):
    """호환성 점수 계산 (캐시된 버전)"""
    try:
        # 음식 선호도 호환성
        food_prefs1 = set(get_user_preference(user1, "food"))
        food_prefs2 = set(get_user_preference(user2, "food"))
        
        food_compatibility = 0
        if food_prefs1 and food_prefs2:
            intersection = len(food_prefs1.intersection(food_prefs2))
            union = len(food_prefs1.union(food_prefs2))
            food_compatibility = (intersection / union) * 100 if union > 0 else 0
        
        # 점심 스타일 호환성
        style_prefs1 = set(get_user_preference(user1, "lunch_style"))
        style_prefs2 = set(get_user_preference(user2, "lunch_style"))
        
        style_compatibility = 0
        if style_prefs1 and style_prefs2:
            intersection = len(style_prefs1.intersection(style_prefs2))
            union = len(style_prefs1.union(style_prefs2))
            style_compatibility = (intersection / union) * 100 if union > 0 else 0
        
        # 전체 호환성 점수 (가중 평균)
        total_score = (food_compatibility * 0.6 + style_compatibility * 0.4)
        
        return round(total_score, 1)
        
    except Exception as e:
        print(f"ERROR: calculate_compatibility_score_cached 실행 중 오류: {e}")
        return random.randint(60, 85)  # 기본값


def calculate_pattern_score_cached(user1, user2):
    """패턴 점수 계산 (캐시된 버전)"""
    try:
        # 간단한 패턴 점수 계산
        # 실제로는 과거 점심 기록, 만남 빈도 등을 분석해야 함
        
        # 기본 점수 (60-90 범위)
        base_score = random.randint(60, 90)
        
        # 호환성 점수와 연관성 추가
        compatibility = calculate_compatibility_score_cached(user1, user2)
        
        # 패턴 점수 = 기본 점수 + 호환성 보너스
        pattern_score = base_score + (compatibility * 0.1)
        
        return round(min(pattern_score, 100), 1)
        
    except Exception as e:
        print(f"ERROR: calculate_pattern_score_cached 실행 중 오류: {e}")
        return random.randint(60, 85)  # 기본값


def generate_recommendation_cache():
    """추천 캐시 생성"""
    try:
        from utils.datetime_utils import get_seoul_today
        
        today = get_seoul_today()
        tomorrow = today + timedelta(days=1)
        tomorrow_str = tomorrow.strftime("%Y-%m-%d")
        
        # 사용 가능한 사용자들 조회
        available_users = get_available_users_for_date(tomorrow_str)
        
        if len(available_users) < 2:
            print("WARNING: 추천 생성을 위한 충분한 사용자가 없습니다.")
            return {"message": "사용자가 부족합니다", "date": tomorrow_str}
        
        # 각 사용자에 대한 추천 생성
        cache_data = {}
        
        for user_id in available_users[:10]:  # 최대 10명에 대해서만 캐시 생성
            try:
                # 다른 사용자들과의 호환성 점수 계산
                scored_users = []
                for other_user_id in available_users:
                    if other_user_id != user_id:
                        compatibility = calculate_compatibility_score_cached(user_id, other_user_id)
                        
                        other_user = User.query.filter_by(employee_id=other_user_id).first()
                        if other_user:
                            user_data = {
                                "employee_id": other_user.employee_id,
                                "nickname": other_user.nickname,
                                "food_preferences": getattr(other_user, 'food_preferences', ''),
                                "lunch_style": getattr(other_user, 'lunch_style', ''),
                                "allergies": getattr(other_user, 'allergies', ''),
                                "preferred_time": getattr(other_user, 'preferred_time', '12:00')
                            }
                        else:
                            user_data = {}
                        
                        scored_users.append({
                            'user_id': other_user_id,
                            'nickname': user_data.get('nickname', f'사용자{other_user_id}'),
                            'compatibility_score': compatibility
                        })
                
                # 호환성 점수로 정렬
                scored_users.sort(key=lambda x: x['compatibility_score'], reverse=True)
                
                # 추천 그룹 생성
                recommendations = generate_efficient_groups(scored_users[:20], tomorrow_str, user_id)
                
                cache_data[user_id] = {
                    "date": tomorrow_str,
                    "recommendations": recommendations,
                    "generated_at": datetime.now().isoformat()
                }
                
            except Exception as e:
                print(f"ERROR: 사용자 {user_id}에 대한 추천 생성 실패: {e}")
                continue
        
        print(f"SUCCESS: {len(cache_data)}명에 대한 추천 캐시 생성 완료")
        return {
            "message": f"{len(cache_data)}명에 대한 추천 캐시 생성 완료",
            "date": tomorrow_str,
            "users_count": len(cache_data)
        }
        
    except Exception as e:
        print(f"ERROR: generate_recommendation_cache 실행 중 오류: {e}")
        return {"error": str(e)}
