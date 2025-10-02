#!/usr/bin/env python3
"""
파티 ID 값 객체
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class PartyId:
    """파티 ID 값 객체"""
    value: int
    
    def __post_init__(self):
        if self.value <= 0:
            raise ValueError("파티 ID는 양수여야 합니다")
