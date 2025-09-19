"""
날짜/시간 관련 유틸리티 함수들
"""
from datetime import datetime, timedelta, date


def get_seoul_today():
    """한국 시간의 오늘 날짜를 datetime.date 타입으로 반환"""
    korean_time = datetime.now() + timedelta(hours=9)
    return korean_time.date()


def get_korean_time():
    """한국 시간으로 현재 시각 반환"""
    return datetime.now() + timedelta(hours=9)


def format_korean_time(dt):
    """한국 시간 형식으로 포맷팅"""
    if dt is None:
        return None
    return dt.strftime("%Y-%m-%d %H:%M:%S")


def get_next_recurrence_date(current_date, recurrence_type, interval=1):
    """반복 일정의 다음 날짜 계산"""
    if not isinstance(current_date, date):
        current_date = datetime.strptime(current_date, "%Y-%m-%d").date()
    
    if recurrence_type == "daily":
        return current_date + timedelta(days=interval)
    elif recurrence_type == "weekly":
        return current_date + timedelta(weeks=interval)
    elif recurrence_type == "monthly":
        # 월 단위 계산 (간단한 버전)
        year = current_date.year
        month = current_date.month + interval
        day = current_date.day
        
        # 월이 12를 넘으면 연도 증가
        while month > 12:
            month -= 12
            year += 1
        
        try:
            return date(year, month, day)
        except ValueError:
            # 해당 월에 일수가 부족한 경우 (예: 2월 30일)
            # 해당 월의 마지막 날로 설정
            import calendar
            last_day = calendar.monthrange(year, month)[1]
            return date(year, month, min(day, last_day))
    else:
        return current_date
