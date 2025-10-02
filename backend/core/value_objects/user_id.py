#!/usr/bin/env python3
"""
사용자 ID 값 객체
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class UserId:
    """사용자 ID 값 객체"""
    value: int
    
    def __post_init__(self):
        if self.value <= 0:
            raise ValueError("사용자 ID는 양수여야 합니다")
