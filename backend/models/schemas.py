"""
API 요청/응답을 위한 Pydantic 스키마 모델들
데이터 유효성 검증과 API 문서화를 위한 모델 정의
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List, Union
from datetime import date, datetime
from enum import Enum

# ===== 공통 모델 =====

class EmployeeIDRequest(BaseModel):
    """employee_id를 포함한 기본 요청 모델"""
    employee_id: str = Field(..., description="직원 ID")

class SuccessResponse(BaseModel):
    """성공 응답 기본 모델"""
    message: str = Field(..., description="응답 메시지")
    success: bool = Field(True, description="성공 여부")

class ErrorResponse(BaseModel):
    """에러 응답 기본 모델"""
    error: str = Field(..., description="에러 메시지")
    success: bool = Field(False, description="성공 여부")
    details: Optional[str] = Field(None, description="상세 에러 정보")

# ===== 개인 일정 관련 모델 =====

class PersonalScheduleBase(BaseModel):
    """개인 일정 기본 모델"""
    title: str = Field(..., min_length=1, max_length=100, description="일정 제목")
    schedule_date: date = Field(..., description="일정 날짜")
    is_recurring: bool = Field(False, description="반복 일정 여부")
    recurrence_type: Optional[str] = Field(None, description="반복 유형 (daily, weekly, monthly)")
    recurrence_interval: Optional[int] = Field(None, ge=1, description="반복 간격")
    recurrence_end_date: Optional[date] = Field(None, description="반복 종료 날짜")

class PersonalScheduleCreate(PersonalScheduleBase):
    """개인 일정 생성 요청 모델"""
    pass

class PersonalScheduleUpdate(BaseModel):
    """개인 일정 수정 요청 모델"""
    title: Optional[str] = Field(None, min_length=1, max_length=100, description="일정 제목")
    schedule_date: Optional[date] = Field(None, description="일정 날짜")
    is_recurring: Optional[bool] = Field(None, description="반복 일정 여부")
    recurrence_type: Optional[str] = Field(None, description="반복 유형")
    recurrence_interval: Optional[int] = Field(None, ge=1, description="반복 간격")
    recurrence_end_date: Optional[date] = Field(None, description="반복 종료 날짜")

class PersonalScheduleResponse(PersonalScheduleBase):
    """개인 일정 응답 모델"""
    id: int = Field(..., description="일정 ID")
    employee_id: str = Field(..., description="직원 ID")
    original_schedule_id: Optional[int] = Field(None, description="원본 일정 ID")
    created_at: datetime = Field(..., description="생성 시간")
    updated_at: Optional[datetime] = Field(None, description="수정 시간")

    class Config:
        from_attributes = True

class PersonalScheduleListResponse(BaseModel):
    """개인 일정 목록 응답 모델"""
    employee_id: str = Field(..., description="직원 ID")
    total_schedules: int = Field(..., description="총 일정 수")
    schedules: List[PersonalScheduleResponse] = Field(..., description="일정 목록")

# ===== 파티 관련 모델 =====

class PartyBase(BaseModel):
    """파티 기본 모델"""
    name: str = Field(..., min_length=1, max_length=100, description="파티 이름")
    description: Optional[str] = Field(None, max_length=500, description="파티 설명")
    max_members: Optional[int] = Field(None, ge=1, description="최대 멤버 수")

class PartyCreate(PartyBase):
    """파티 생성 요청 모델"""
    pass

class PartyUpdate(BaseModel):
    """파티 수정 요청 모델"""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="파티 이름")
    description: Optional[str] = Field(None, max_length=500, description="파티 설명")
    tags: Optional[str] = Field(None, description="파티 태그")
    category: Optional[str] = Field(None, description="파티 카테고리")

class PartyResponse(PartyBase):
    """파티 응답 모델"""
    id: int = Field(..., description="파티 ID")
    created_by: str = Field(..., description="생성자 ID")
    created_at: datetime = Field(..., description="생성 시간")
    member_count: int = Field(..., description="현재 멤버 수")

    class Config:
        from_attributes = True

# ===== 투표 관련 모델 =====

class VoteBase(BaseModel):
    """투표 기본 모델"""
    title: str = Field(..., min_length=1, max_length=100, description="투표 제목")
    description: Optional[str] = Field(None, max_length=500, description="투표 설명")
    end_date: datetime = Field(..., description="투표 종료 시간")

class VoteCreate(VoteBase):
    """투표 생성 요청 모델"""
    options: List[str] = Field(..., min_items=2, description="투표 옵션들")

class VoteResponse(VoteBase):
    """투표 응답 모델"""
    id: int = Field(..., description="투표 ID")
    created_by: str = Field(..., description="생성자 ID")
    created_at: datetime = Field(..., description="생성 시간")
    is_active: bool = Field(..., description="투표 활성화 여부")
    options: List[str] = Field(..., description="투표 옵션들")

    class Config:
        from_attributes = True

# ===== 유효성 검증 =====

@validator('recurrence_type')
def validate_recurrence_type(cls, v):
    """반복 유형 유효성 검증"""
    if v is not None and v not in ['daily', 'weekly', 'monthly']:
        raise ValueError('반복 유형은 daily, weekly, monthly 중 하나여야 합니다.')
    return v

@validator('recurrence_end_date')
def validate_recurrence_end_date(cls, v, values):
    """반복 종료 날짜 유효성 검증"""
    if v is not None and 'schedule_date' in values and v <= values['schedule_date']:
        raise ValueError('반복 종료 날짜는 시작 날짜보다 늦어야 합니다.')
    return v
