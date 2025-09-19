"""
가상 유저 데이터 및 모의 데이터 유틸리티
코드 중복을 방지하기 위해 공통 모의 데이터를 관리합니다.
"""

# 가상 유저 데이터 (20명)
MOCK_USERS = {
    "1": {
        "employee_id": "1",
        "nickname": "김철수",
        "foodPreferences": ["한식", "중식"],
        "lunchStyle": ["맛집 탐방", "새로운 메뉴 도전"],
        "allergies": ["없음"],
        "preferredTime": "12:00",
        "food_preferences": "한식,중식",
        "lunch_preference": "맛집 탐방",
        "main_dish_genre": "한식",
        "allergies": "없음",
        "preferred_time": "12:00"
    },
    "2": {
        "employee_id": "2",
        "nickname": "이영희",
        "foodPreferences": ["양식", "일식"],
        "lunchStyle": ["건강한 식사", "분위기 좋은 곳"],
        "allergies": ["없음"],
        "preferredTime": "11:45",
        "food_preferences": "양식,일식",
        "lunch_preference": "건강한 식사",
        "main_dish_genre": "양식",
        "allergies": "없음",
        "preferred_time": "11:45"
    },
    "3": {
        "employee_id": "3",
        "nickname": "박민수",
        "foodPreferences": ["한식", "분식"],
        "lunchStyle": ["가성비 좋은 곳", "빠른 식사"],
        "allergies": ["없음"],
        "preferredTime": "12:15",
        "food_preferences": "한식,분식",
        "lunch_preference": "가성비 좋은 곳",
        "main_dish_genre": "한식",
        "allergies": "없음",
        "preferred_time": "12:15"
    },
    "4": {
        "employee_id": "4",
        "nickname": "최지은",
        "foodPreferences": ["양식", "한식"],
        "lunchStyle": ["다양한 음식", "새로운 메뉴 도전"],
        "allergies": ["없음"],
        "preferredTime": "12:00",
        "food_preferences": "양식,한식",
        "lunch_preference": "다양한 음식",
        "main_dish_genre": "양식",
        "allergies": "없음",
        "preferred_time": "12:00"
    },
    "5": {
        "employee_id": "5",
        "nickname": "정현우",
        "foodPreferences": ["한식", "중식"],
        "lunchStyle": ["전통 음식", "친구들과 함께"],
        "allergies": ["없음"],
        "preferredTime": "11:30",
        "food_preferences": "한식,중식",
        "lunch_preference": "전통 음식",
        "main_dish_genre": "한식",
        "allergies": "없음",
        "preferred_time": "11:30"
    },
    "6": {
        "employee_id": "6",
        "nickname": "한소영",
        "foodPreferences": ["일식", "양식"],
        "lunchStyle": ["맛집 탐방", "분위기 좋은 곳"],
        "allergies": ["없음"],
        "preferredTime": "12:00",
        "food_preferences": "일식,양식",
        "lunch_preference": "맛집 탐방",
        "main_dish_genre": "일식",
        "allergies": "없음",
        "preferred_time": "12:00"
    },
    "7": {
        "employee_id": "7",
        "nickname": "윤준호",
        "foodPreferences": ["한식", "양식"],
        "lunchStyle": ["건강한 식사", "빠른 식사"],
        "allergies": ["없음"],
        "preferredTime": "12:15",
        "food_preferences": "한식,양식",
        "lunch_preference": "건강한 식사",
        "main_dish_genre": "한식",
        "allergies": "없음",
        "preferred_time": "12:15"
    },
    "8": {
        "employee_id": "8",
        "nickname": "송미라",
        "foodPreferences": ["중식", "일식"],
        "lunchStyle": ["맛있는 음식", "친구들과 함께"],
        "allergies": ["없음"],
        "preferredTime": "11:45",
        "food_preferences": "중식,일식",
        "lunch_preference": "맛있는 음식",
        "main_dish_genre": "중식",
        "allergies": "없음",
        "preferred_time": "11:45"
    },
    "9": {
        "employee_id": "9",
        "nickname": "강동현",
        "foodPreferences": ["한식", "분식"],
        "lunchStyle": ["다양한 음식", "가성비 좋은 곳"],
        "allergies": ["없음"],
        "preferredTime": "12:00",
        "food_preferences": "한식,분식",
        "lunch_preference": "다양한 음식",
        "main_dish_genre": "한식",
        "allergies": "없음",
        "preferred_time": "12:00"
    },
    "10": {
        "employee_id": "10",
        "nickname": "임서연",
        "foodPreferences": ["양식", "한식"],
        "lunchStyle": ["전통 음식", "분위기 좋은 곳"],
        "allergies": ["없음"],
        "preferredTime": "12:15",
        "food_preferences": "양식,한식",
        "lunch_preference": "전통 음식",
        "main_dish_genre": "양식",
        "allergies": "없음",
        "preferred_time": "12:15"
    },
    "11": {
        "employee_id": "11",
        "nickname": "오태호",
        "foodPreferences": ["일식", "중식"],
        "lunchStyle": ["맛집 탐방", "새로운 메뉴 도전"],
        "allergies": ["없음"],
        "preferredTime": "12:00",
        "food_preferences": "일식,중식",
        "lunch_preference": "맛집 탐방",
        "main_dish_genre": "일식",
        "allergies": "없음",
        "preferred_time": "12:00"
    },
    "12": {
        "employee_id": "12",
        "nickname": "김민지",
        "foodPreferences": ["한식", "양식"],
        "lunchStyle": ["건강한 식사", "빠른 식사"],
        "allergies": ["없음"],
        "preferredTime": "11:45",
        "food_preferences": "한식,양식",
        "lunch_preference": "건강한 식사",
        "main_dish_genre": "한식",
        "allergies": "없음",
        "preferred_time": "11:45"
    },
    "13": {
        "employee_id": "13",
        "nickname": "이준서",
        "foodPreferences": ["중식", "일식"],
        "lunchStyle": ["맛있는 음식", "친구들과 함께"],
        "allergies": ["없음"],
        "preferredTime": "12:15",
        "food_preferences": "중식,일식",
        "lunch_preference": "맛있는 음식",
        "main_dish_genre": "중식",
        "allergies": "없음",
        "preferred_time": "12:15"
    },
    "14": {
        "employee_id": "14",
        "nickname": "박서연",
        "foodPreferences": ["양식", "한식"],
        "lunchStyle": ["다양한 음식", "새로운 메뉴 도전"],
        "allergies": ["없음"],
        "preferredTime": "12:00",
        "food_preferences": "양식,한식",
        "lunch_preference": "다양한 음식",
        "main_dish_genre": "양식",
        "allergies": "없음",
        "preferred_time": "12:00"
    },
    "15": {
        "employee_id": "15",
        "nickname": "최민호",
        "foodPreferences": ["한식", "분식"],
        "lunchStyle": ["가성비 좋은 곳", "빠른 식사"],
        "allergies": ["없음"],
        "preferredTime": "11:30",
        "food_preferences": "한식,분식",
        "lunch_preference": "가성비 좋은 곳",
        "main_dish_genre": "한식",
        "allergies": "없음",
        "preferred_time": "11:30"
    },
    "16": {
        "employee_id": "16",
        "nickname": "정수진",
        "foodPreferences": ["일식", "양식"],
        "lunchStyle": ["맛집 탐방", "분위기 좋은 곳"],
        "allergies": ["없음"],
        "preferredTime": "12:00",
        "food_preferences": "일식,양식",
        "lunch_preference": "맛집 탐방",
        "main_dish_genre": "일식",
        "allergies": "없음",
        "preferred_time": "12:00"
    },
    "17": {
        "employee_id": "17",
        "nickname": "한지훈",
        "foodPreferences": ["한식", "중식"],
        "lunchStyle": ["전통 음식", "친구들과 함께"],
        "allergies": ["없음"],
        "preferredTime": "12:15",
        "food_preferences": "한식,중식",
        "lunch_preference": "전통 음식",
        "main_dish_genre": "한식",
        "allergies": "없음",
        "preferred_time": "12:15"
    },
    "18": {
        "employee_id": "18",
        "nickname": "윤서아",
        "foodPreferences": ["양식", "일식"],
        "lunchStyle": ["건강한 식사", "새로운 메뉴 도전"],
        "allergies": ["없음"],
        "preferredTime": "11:45",
        "food_preferences": "양식,일식",
        "lunch_preference": "건강한 식사",
        "main_dish_genre": "양식",
        "allergies": "없음",
        "preferred_time": "11:45"
    },
    "19": {
        "employee_id": "19",
        "nickname": "송현우",
        "foodPreferences": ["중식", "한식"],
        "lunchStyle": ["맛있는 음식", "가성비 좋은 곳"],
        "allergies": ["없음"],
        "preferredTime": "12:00",
        "food_preferences": "중식,한식",
        "lunch_preference": "맛있는 음식",
        "main_dish_genre": "중식",
        "allergies": "없음",
        "preferred_time": "12:00"
    },
    "20": {
        "employee_id": "20",
        "nickname": "강민정",
        "foodPreferences": ["일식", "양식"],
        "lunchStyle": ["다양한 음식", "분위기 좋은 곳"],
        "allergies": ["없음"],
        "preferredTime": "12:15",
        "food_preferences": "일식,양식",
        "lunch_preference": "다양한 음식",
        "main_dish_genre": "일식",
        "allergies": "없음",
        "preferred_time": "12:15"
    }
}

def get_mock_user(employee_id):
    """특정 가상 유저 데이터 반환"""
    return MOCK_USERS.get(employee_id)

def get_all_mock_users():
    """모든 가상 유저 데이터 반환"""
    return MOCK_USERS

def get_mock_users_list():
    """가상 유저 목록 반환 (간단한 형태)"""
    return [
        {"employee_id": user_id, "nickname": user_data["nickname"]}
        for user_id, user_data in MOCK_USERS.items()
    ]

def get_mock_friend_relationships():
    """가상 친구 관계 데이터 반환"""
    return {
        "1": ["2", "3", "4", "5"],  # 김철수의 친구들
        "2": ["1", "3", "6", "7"],  # 이영희의 친구들
        "3": ["1", "2", "4", "8"],  # 박민수의 친구들
        "4": ["1", "3", "5", "9"],  # 최지은의 친구들
        "5": ["1", "4", "6", "10"], # 정현우의 친구들
        "6": ["2", "5", "7", "11"], # 한소영의 친구들
        "7": ["2", "6", "8", "12"], # 윤준호의 친구들
        "8": ["3", "7", "9", "13"], # 송미라의 친구들
        "9": ["4", "8", "10", "14"], # 강동현의 친구들
        "10": ["5", "9", "11", "15"], # 임서연의 친구들
        "11": ["6", "10", "12", "16"], # 오태호의 친구들
        "12": ["7", "11", "13", "17"], # 김민지의 친구들
        "13": ["8", "12", "14", "18"], # 이준서의 친구들
        "14": ["9", "13", "15", "19"], # 박서연의 친구들
        "15": ["10", "14", "16", "20"], # 최민호의 친구들
        "16": ["11", "15", "17", "1"], # 정수진의 친구들
        "17": ["12", "16", "18", "2"], # 한지훈의 친구들
        "18": ["13", "17", "19", "3"], # 윤서아의 친구들
        "19": ["14", "18", "20", "4"], # 송현우의 친구들
        "20": ["15", "19", "1", "5"]  # 강민정의 친구들
    }

def get_mock_lunch_history(employee_id, days=30):
    """가상 점심 히스토리 데이터 생성"""
    import random
    from datetime import datetime, timedelta
    
    history = []
    today = datetime.now()
    
    for i in range(days):
        date = today - timedelta(days=i)
        # 30% 확률로 점심 약속이 있었음
        if random.random() < 0.3:
            # 랜덤한 친구들과의 점심
            friends = get_mock_friend_relationships().get(employee_id, [])
            if friends:
                partner = random.choice(friends)
                partner_data = get_mock_user(partner)
                
                history.append({
                    "id": f"lunch_{employee_id}_{i}",
                    "date": date.strftime("%Y-%m-%d"),
                    "partner": partner_data["nickname"] if partner_data else f"친구{partner}",
                    "restaurant": f"맛있는 식당{i}",
                    "status": "completed"
                })
    
    return history
