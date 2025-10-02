"""
그룹 매칭 공통 로직 모듈
개발/프로덕션 환경에서 공통으로 사용하는 그룹 생성 및 점수 계산 로직
"""

import random
from datetime import datetime

def calculate_group_score(members, users_data, date):
    """그룹 매칭 점수 계산 (실제 앱 로직과 동일)"""
    score = 0

    # 그룹 크기 점수 (2-4명만 허용, 3명이 최적)
    group_size = len(members)
    if group_size > 4:
        return 0  # 4명 초과 그룹은 제외

    if group_size == 3:
        score += 30
    elif group_size == 4:
        score += 25
    elif group_size == 2:
        score += 20
    else:
        score += 10

    # 사용자별 호환성 점수 계산
    for i in range(len(members)):
        for j in range(i + 1, len(members)):
            user1_id = members[i]
            user2_id = members[j]
            user1 = users_data[user1_id]
            user2 = users_data[user2_id]

            # 음식 선호도 호환성
            if user1.get('foodPreferences') and user2.get('foodPreferences'):
                common_prefs = set(user1['foodPreferences']) & set(user2['foodPreferences'])
                if common_prefs:
                    score += len(common_prefs) * 15

            # 점심 성향 호환성
            if user1.get('lunchStyle') and user2.get('lunchStyle'):
                common_styles = set(user1['lunchStyle']) & set(user2['lunchStyle'])
                if common_styles:
                    score += len(common_styles) * 20

            # 선호 시간 호환성
            if user1.get('preferredTime') == user2.get('preferredTime'):
                score += 15

            # 알러지 정보 호환성
            if user1.get('allergies') == user2.get('allergies'):
                score += 10

    # 날짜별 랜덤 점수 (0-15점) - 실제 앱과 동일
    date_seed = int(date.replace('-', ''))
    random_score = (date_seed * 9301 + 49297) % 233280
    random_score = (random_score / 233280) * 16

    score += int(random_score)

    return score

def generate_groups(available_users, target_date, current_user_id, num_groups=10):
    """그룹 생성 공통 로직"""
    groups = []

    for group_idx in range(num_groups):
        # 그룹 크기 (2-4명, 3명이 최적)
        group_size = random.choices([2, 3, 4], weights=[0.2, 0.6, 0.2])[0]

        # 사용 가능한 유저에서 그룹 크기만큼 선택
        available_user_ids = list(available_users.keys())
        if len(available_user_ids) >= group_size:
            group_members = random.sample(available_user_ids, group_size)

            # 그룹 점수 계산
            score = calculate_group_score(group_members, available_users, target_date)

            group_data = {
                'id': f'group_{target_date}_{group_idx}',
                'date': target_date,
                'members': group_members,
                'status': 'matched',
                'created_at': datetime.now().isoformat(),
                'score': score,
                'max_members': group_size + 1,  # 현재 사용자 포함 가능
                'current_members': group_size
            }
            groups.append(group_data)

    # 점수 순으로 정렬
    groups.sort(key=lambda x: x['score'], reverse=True)

    return groups

# 가상 사용자 데이터 함수들 제거 - 실제 데이터베이스만 사용
