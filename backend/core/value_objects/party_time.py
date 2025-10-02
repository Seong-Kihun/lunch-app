#!/usr/bin/env python3
"""
파티 시간 값 객체
파티의 날짜와 시간을 관리하며 비즈니스 규칙을 적용합니다.
"""

from dataclasses import dataclass
from datetime import date, time, datetime, timedelta


@dataclass(frozen=True)
class PartyTime:
    """파티 시간 값 객체"""

    date: date
    time: time

    def __post_init__(self):
        """생성 후 검증"""
        # 과거 날짜 검증
        if self.date < date.today():
            raise ValueError("파티 날짜는 미래여야 합니다")

        # 점심시간 검증 (11:00-15:00)
        if not self._is_lunch_time(self.time):
            raise ValueError("파티 시간은 점심시간(11:00-15:00)이어야 합니다")

    @staticmethod
    def _is_lunch_time(party_time: time) -> bool:
        """점심시간인지 확인"""
        lunch_start = time(11, 0)
        lunch_end = time(15, 0)
        return lunch_start <= party_time <= lunch_end

    @classmethod
    def create(
        cls,
        date: date,
        hour: int,
        minute: int = 0
    ) -> 'PartyTime':
        """시간 생성 팩토리 메서드"""
        party_time = time(hour, minute)
        return cls(date=date, time=party_time)

    @classmethod
    def create_tomorrow_at(cls, hour: int, minute: int = 0) -> 'PartyTime':
        """내일 특정 시간으로 생성"""
        tomorrow = date.today() + timedelta(days=1)
        return cls.create(tomorrow, hour, minute)

    @classmethod
    def create_next_weekday_at(cls, hour: int, minute: int = 0) -> 'PartyTime':
        """다음 평일 특정 시간으로 생성"""
        today = date.today()
        days_ahead = 1

        # 다음 평일 찾기
        while True:
            next_date = today + timedelta(days=days_ahead)
            if next_date.weekday() < 5:  # 월-금 (0-4)
                break
            days_ahead += 1

        return cls.create(next_date, hour, minute)

    @property
    def datetime(self) -> datetime:
        """날짜와 시간을 결합한 datetime 반환"""
        return datetime.combine(self.date, self.time)

    @property
    def is_today(self) -> bool:
        """오늘인지 확인"""
        return self.date == date.today()

    @property
    def is_tomorrow(self) -> bool:
        """내일인지 확인"""
        return self.date == date.today() + timedelta(days=1)

    @property
    def is_weekend(self) -> bool:
        """주말인지 확인"""
        return self.date.weekday() >= 5  # 토(5), 일(6)

    @property
    def is_weekday(self) -> bool:
        """평일인지 확인"""
        return self.date.weekday() < 5  # 월-금(0-4)

    @property
    def days_from_now(self) -> int:
        """현재로부터 며칠 후인지"""
        return (self.date - date.today()).days

    @property
    def is_this_week(self) -> bool:
        """이번 주인지 확인"""
        today = date.today()
        week_start = today - timedelta(days=today.weekday())
        week_end = week_start + timedelta(days=6)
        return week_start <= self.date <= week_end

    def is_before(self, other: 'PartyTime') -> bool:
        """다른 시간보다 이전인지 확인"""
        return self.datetime < other.datetime

    def is_after(self, other: 'PartyTime') -> bool:
        """다른 시간보다 이후인지 확인"""
        return self.datetime > other.datetime

    def is_same_date(self, other: 'PartyTime') -> bool:
        """같은 날짜인지 확인"""
        return self.date == other.date

    def is_same_time(self, other: 'PartyTime') -> bool:
        """같은 시간인지 확인"""
        return self.time == other.time

    def with_date(self, new_date: date) -> 'PartyTime':
        """새로운 날짜로 새 인스턴스 반환"""
        return PartyTime(date=new_date, time=self.time)

    def with_time(self, new_time: time) -> 'PartyTime':
        """새로운 시간으로 새 인스턴스 반환"""
        return PartyTime(date=self.date, time=new_time)

    def add_days(self, days: int) -> 'PartyTime':
        """지정된 일수만큼 추가된 새 인스턴스 반환"""
        new_date = self.date + timedelta(days=days)
        return PartyTime(date=new_date, time=self.time)

    def __str__(self) -> str:
        """문자열 표현"""
        return f"{self.date.strftime('%Y-%m-%d')} {self.time.strftime('%H:%M')}"

    def __repr__(self) -> str:
        """디버그용 문자열 표현"""
        return f"PartyTime(date={self.date}, time={self.time})"
