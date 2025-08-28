from datetime import datetime, date
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from extensions import db

class PersonalSchedule(db.Model):
    """반복 일정의 마스터 규칙을 저장하는 모델"""
    __tablename__ = 'personal_schedules'
    
    id = Column(Integer, primary_key=True)
    employee_id = Column(String(50), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    start_date = Column(DateTime, nullable=False, index=True)
    # 기존 코드와의 호환성을 위한 필드
    schedule_date = Column(String(10), nullable=True)  # YYYY-MM-DD 형식
    time = Column(String(10), nullable=False)  # HH:MM 형식
    restaurant = Column(String(200))
    location = Column(String(500))
    description = Column(Text)
    
    # 반복 설정
    is_recurring = Column(Boolean, default=False, index=True)
    recurrence_type = Column(String(20))  # 'daily', 'weekly', 'monthly'
    recurrence_interval = Column(Integer, default=1)  # 간격 (1, 2, 3...)
    recurrence_end_date = Column(DateTime)  # 반복 종료 날짜
    original_schedule_id = Column(Integer, nullable=True)  # 개별 일정이 원본 반복 일정을 참조할 때
    
    # 시스템 정보
    created_by = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 관계
    exceptions = relationship('ScheduleException', back_populates='original_schedule', cascade='all, delete-orphan')
    
    def __init__(self, employee_id, title, start_date=None, schedule_date=None, time=None, 
                 description=None, is_recurring=False, recurrence_type=None, recurrence_interval=1, 
                 recurrence_end_date=None, original_schedule_id=None, created_by=None, 
                 restaurant=None, location=None):
        self.employee_id = employee_id
        self.title = title
        self.start_date = start_date
        self.schedule_date = schedule_date
        self.time = time
        self.description = description
        self.is_recurring = is_recurring
        self.recurrence_type = recurrence_type
        self.recurrence_interval = recurrence_interval
        self.recurrence_end_date = recurrence_end_date
        self.original_schedule_id = original_schedule_id
        self.created_by = created_by or employee_id
        self.restaurant = restaurant
        self.location = location
    
    def __repr__(self):
        return f'<PersonalSchedule {self.id}: {self.title}>'
    
    def to_dict(self):
        """마스터 일정을 딕셔너리로 변환"""
        return {
            'id': self.id,
            'employee_id': self.employee_id,
            'title': self.title,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'schedule_date': self.schedule_date,
            'time': self.time,
            'restaurant': self.restaurant,
            'location': self.location,
            'description': self.description,
            'is_recurring': self.is_recurring,
            'recurrence_type': self.recurrence_type,
            'recurrence_interval': self.recurrence_interval,
            'recurrence_end_date': self.recurrence_end_date.isoformat() if self.recurrence_end_date else None,
            'original_schedule_id': self.original_schedule_id,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class ScheduleException(db.Model):
    """반복 일정의 특정 날짜에 대한 예외를 저장하는 모델"""
    __tablename__ = 'schedule_exceptions'
    
    id = Column(Integer, primary_key=True)
    original_schedule_id = Column(Integer, ForeignKey('personal_schedules.id'), nullable=False, index=True)
    exception_date = Column(DateTime, nullable=False, index=True)
    
    # 예외 유형
    is_deleted = Column(Boolean, default=False)  # 해당 날짜만 삭제
    is_modified = Column(Boolean, default=False)  # 해당 날짜만 수정
    
    # 수정된 정보 (is_modified가 True일 때만 사용)
    new_title = Column(String(200))
    new_time = Column(String(10))
    new_restaurant = Column(String(200))
    new_location = Column(String(500))
    new_description = Column(Text)
    
    # 시스템 정보
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 관계
    original_schedule = relationship('PersonalSchedule', back_populates='exceptions')
    
    def __repr__(self):
        return f'<ScheduleException {self.id}: {self.exception_date}>'
    
    def to_dict(self):
        """예외를 딕셔너리로 변환"""
        return {
            'id': self.id,
            'original_schedule_id': self.original_schedule_id,
            'exception_date': self.exception_date.isoformat() if self.exception_date else None,
            'is_deleted': self.is_deleted,
            'is_modified': self.is_modified,
            'new_title': self.new_title,
            'new_time': self.new_time,
            'new_restaurant': self.new_restaurant,
            'new_location': self.new_location,
            'new_description': self.new_description,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
