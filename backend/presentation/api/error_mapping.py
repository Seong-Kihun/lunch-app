#!/usr/bin/env python3
"""
API 에러 매핑 시스템
표준 HTTP 상태코드와 에러 코드를 매핑합니다.
"""

from enum import Enum
from typing import Any
from flask import jsonify, Response
from datetime import datetime


class ErrorCode(Enum):
    """표준 에러 코드"""
    VALIDATION_ERROR = "VALIDATION_ERROR"
    AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR"
    AUTHORIZATION_ERROR = "AUTHORIZATION_ERROR"
    NOT_FOUND = "NOT_FOUND"
    CONFLICT = "CONFLICT"
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
    INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR"
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"
    BAD_REQUEST = "BAD_REQUEST"
    FORBIDDEN = "FORBIDDEN"
    UNPROCESSABLE_ENTITY = "UNPROCESSABLE_ENTITY"
    TOO_MANY_REQUESTS = "TOO_MANY_REQUESTS"


class HTTPStatusMapping:
    """에러 코드 → HTTP 상태코드 매핑"""

    MAPPING = {
        ErrorCode.VALIDATION_ERROR: 422,
        ErrorCode.AUTHENTICATION_ERROR: 401,
        ErrorCode.AUTHORIZATION_ERROR: 403,
        ErrorCode.NOT_FOUND: 404,
        ErrorCode.CONFLICT: 409,
        ErrorCode.RATE_LIMIT_EXCEEDED: 429,
        ErrorCode.INTERNAL_SERVER_ERROR: 500,
        ErrorCode.SERVICE_UNAVAILABLE: 503,
        ErrorCode.BAD_REQUEST: 400,
        ErrorCode.FORBIDDEN: 403,
        ErrorCode.UNPROCESSABLE_ENTITY: 422,
        ErrorCode.TOO_MANY_REQUESTS: 429,
    }

    @classmethod
    def get_status_code(cls, error_code: ErrorCode) -> int:
        """에러 코드에 해당하는 HTTP 상태코드 반환"""
        return cls.MAPPING.get(error_code, 500)

    @classmethod
    def create_error_response(
        cls,
        error_code: ErrorCode,
        message: str,
        details: dict[str, Any] | None = None
    ) -> Response:
        """표준 에러 응답 생성"""
        status_code = cls.get_status_code(error_code)

        response_data = {
            "error": {
                "code": error_code.value,
                "message": message,
                "timestamp": datetime.utcnow().isoformat()
            }
        }

        if details:
            response_data["error"]["details"] = details

        return jsonify(response_data), status_code


class ErrorResponse:
    """에러 응답 생성 클래스"""

    @staticmethod
    def validation_error(
        message: str = "요청 데이터가 올바르지 않습니다",
        validation_errors: dict[str, Any] | None = None
    ) -> Response:
        """검증 오류 응답 - 422 Unprocessable Entity"""
        details = {"validation_errors": validation_errors} if validation_errors else None
        return HTTPStatusMapping.create_error_response(
            ErrorCode.VALIDATION_ERROR,
            message,
            details
        )

    @staticmethod
    def authentication_error(
        message: str = "인증이 필요합니다"
    ) -> Response:
        """인증 오류 응답 - 401 Unauthorized"""
        return HTTPStatusMapping.create_error_response(
            ErrorCode.AUTHENTICATION_ERROR,
            message
        )

    @staticmethod
    def authorization_error(
        message: str = "권한이 없습니다"
    ) -> Response:
        """권한 오류 응답 - 403 Forbidden"""
        return HTTPStatusMapping.create_error_response(
            ErrorCode.AUTHORIZATION_ERROR,
            message
        )

    @staticmethod
    def not_found(
        resource: str = "리소스",
        message: str | None = None
    ) -> Response:
        """리소스 없음 응답 - 404 Not Found"""
        if not message:
            message = f"{resource}를 찾을 수 없습니다"

        return HTTPStatusMapping.create_error_response(
            ErrorCode.NOT_FOUND,
            message
        )

    @staticmethod
    def conflict(
        message: str = "리소스 충돌이 발생했습니다"
    ) -> Response:
        """충돌 응답 - 409 Conflict"""
        return HTTPStatusMapping.create_error_response(
            ErrorCode.CONFLICT,
            message
        )

    @staticmethod
    def rate_limit_exceeded(
        message: str = "요청 한도를 초과했습니다",
        retry_after: int | None = None
    ) -> Response:
        """속도 제한 초과 응답 - 429 Too Many Requests"""
        details = {"retry_after": retry_after} if retry_after else None
        return HTTPStatusMapping.create_error_response(
            ErrorCode.RATE_LIMIT_EXCEEDED,
            message,
            details
        )

    @staticmethod
    def internal_server_error(
        message: str = "내부 서버 오류가 발생했습니다",
        error_id: str | None = None
    ) -> Response:
        """내부 서버 오류 응답 - 500 Internal Server Error"""
        details = {"error_id": error_id} if error_id else None
        return HTTPStatusMapping.create_error_response(
            ErrorCode.INTERNAL_SERVER_ERROR,
            message,
            details
        )

    @staticmethod
    def service_unavailable(
        message: str = "서비스를 사용할 수 없습니다",
        retry_after: int | None = None
    ) -> Response:
        """서비스 사용 불가 응답 - 503 Service Unavailable"""
        details = {"retry_after": retry_after} if retry_after else None
        return HTTPStatusMapping.create_error_response(
            ErrorCode.SERVICE_UNAVAILABLE,
            message,
            details
        )

    @staticmethod
    def bad_request(
        message: str = "잘못된 요청입니다"
    ) -> Response:
        """잘못된 요청 응답 - 400 Bad Request"""
        return HTTPStatusMapping.create_error_response(
            ErrorCode.BAD_REQUEST,
            message
        )
