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


class RestaurantDomainError(ValueError):
    """레스토랑 도메인 오류"""
    pass


class BusinessRuleViolationError(ValueError):
    """비즈니스 규칙 위반 오류"""
    pass


class DomainIntegrityError(ValueError):
    """도메인 무결성 오류"""
    pass
