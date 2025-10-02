#!/usr/bin/env python3
"""
도메인 예외 정의
"""


class PartyDomainError(ValueError):
    """파티 도메인 오류"""
    pass


class ValidationError(ValueError):
    """검증 오류"""
    pass


class UserDomainError(ValueError):
    """사용자 도메인 오류"""
    pass


class DomainValidationError(ValueError):
    """도메인 계층에서 발생하는 검증 오류"""
    pass