#!/usr/bin/env python3
"""
기본 API 클래스
HTTP 규약을 준수하는 표준화된 API 응답을 제공합니다.
"""

from typing import Any
from flask import jsonify, Response, request
from datetime import datetime

from backend.presentation.api.error_mapping import ErrorResponse


class BaseAPI:
    """기본 API 클래스 - HTTP 규약 준수"""

    def success_response(self, data: Any, status_code: int = 200, message: str | None = None) -> Response:
        """성공 응답 - 적절한 상태코드 사용"""
        response_data = {
            "data": data,
            "timestamp": datetime.utcnow().isoformat()
        }

        if message:
            response_data["message"] = message

        return jsonify(response_data), status_code

    def created_response(self, data: Any, message: str = "리소스가 성공적으로 생성되었습니다") -> Response:
        """생성 성공 응답 - 201 Created"""
        return self.success_response(data, 201, message)

    def updated_response(self, data: Any, message: str = "리소스가 성공적으로 업데이트되었습니다") -> Response:
        """업데이트 성공 응답 - 200 OK"""
        return self.success_response(data, 200, message)

    def deleted_response(self, message: str = "리소스가 성공적으로 삭제되었습니다") -> Response:
        """삭제 성공 응답 - 204 No Content"""
        response_data = {
            "message": message,
            "timestamp": datetime.utcnow().isoformat()
        }
        return jsonify(response_data), 204

    def paginated_response(
        self,
        data: list[Any],
        page: int,
        per_page: int,
        total: int,
        message: str | None = None
    ) -> Response:
        """페이지네이션 응답"""
        response_data = {
            "data": data,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "pages": (total + per_page - 1) // per_page,
                "has_next": page * per_page < total,
                "has_prev": page > 1
            },
            "timestamp": datetime.utcnow().isoformat()
        }

        if message:
            response_data["message"] = message

        return jsonify(response_data), 200

    def validation_error_response(self, errors: list[dict[str, Any]]) -> Response:
        """검증 오류 응답 - 422 Unprocessable Entity"""
        return ErrorResponse.validation_error(
            "요청 데이터가 올바르지 않습니다",
            {"validation_errors": errors}
        )

    def authentication_error_response(self) -> Response:
        """인증 오류 응답 - 401 Unauthorized"""
        return ErrorResponse.authentication_error()

    def authorization_error_response(self) -> Response:
        """권한 오류 응답 - 403 Forbidden"""
        return ErrorResponse.authorization_error()

    def not_found_response(self, resource: str) -> Response:
        """리소스 없음 응답 - 404 Not Found"""
        return ErrorResponse.not_found(resource)

    def conflict_response(self, message: str) -> Response:
        """충돌 응답 - 409 Conflict"""
        return ErrorResponse.conflict(message)

    def rate_limit_response(self, retry_after: int | None = None) -> Response:
        """속도 제한 응답 - 429 Too Many Requests"""
        return ErrorResponse.rate_limit_exceeded(
            "요청 한도를 초과했습니다",
            retry_after
        )

    def internal_error_response(self, error_id: str | None = None) -> Response:
        """내부 서버 오류 응답 - 500 Internal Server Error"""
        return ErrorResponse.internal_server_error(
            "내부 서버 오류가 발생했습니다",
            error_id
        )

    def bad_request_response(self, message: str) -> Response:
        """잘못된 요청 응답 - 400 Bad Request"""
        return ErrorResponse.bad_request(message)

    def service_unavailable_response(self, retry_after: int | None = None) -> Response:
        """서비스 사용 불가 응답 - 503 Service Unavailable"""
        return ErrorResponse.service_unavailable(
            "서비스를 사용할 수 없습니다",
            retry_after
        )


class APIMiddleware:
    """API 미들웨어 - 공통 처리"""

    @staticmethod
    def add_request_id():
        """요청 ID 추가"""
        import uuid
        request_id = str(uuid.uuid4())
        request.request_id = request_id
        return request_id

    @staticmethod
    def log_request():
        """요청 로깅"""
        import structlog
        logger = structlog.get_logger()

        logger.info(
            "API 요청",
            method=request.method,
            path=request.path,
            query_params=dict(request.args),
            request_id=getattr(request, 'request_id', None)
        )

    @staticmethod
    def log_response(response: Response):
        """응답 로깅"""
        import structlog
        logger = structlog.get_logger()

        logger.info(
            "API 응답",
            status_code=response.status_code,
            request_id=getattr(request, 'request_id', None)
        )

        return response

    @staticmethod
    def handle_cors(response: Response):
        """CORS 처리"""
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        return response


class APIValidator:
    """API 요청 검증"""

    @staticmethod
    def validate_json_request() -> dict[str, Any]:
        """JSON 요청 검증"""
        if not request.is_json:
            raise ValueError("Content-Type이 application/json이어야 합니다")

        try:
            return request.get_json()
        except Exception as e:
            raise ValueError(f"유효하지 않은 JSON 형식: {e}")

    @staticmethod
    def validate_required_fields(data: dict[str, Any], required_fields: list[str]) -> list[str]:
        """필수 필드 검증"""
        missing_fields = []

        for field in required_fields:
            if field not in data or data[field] is None or data[field] == "":
                missing_fields.append(field)

        return missing_fields

    @staticmethod
    def validate_pagination_params(page: int, per_page: int) -> dict[str, Any]:
        """페이지네이션 파라미터 검증"""
        errors = []

        if page < 1:
            errors.append("page는 1 이상이어야 합니다")

        if per_page < 1 or per_page > 100:
            errors.append("per_page는 1-100 사이여야 합니다")

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "page": max(1, page),
            "per_page": min(100, max(1, per_page))
        }


class APIResponseBuilder:
    """API 응답 빌더"""

    def __init__(self, base_api: BaseAPI):
        self.base_api = base_api

    def build_success(self, data: Any, **kwargs) -> Response:
        """성공 응답 빌드"""
        return self.base_api.success_response(data, **kwargs)

    def build_created(self, data: Any, **kwargs) -> Response:
        """생성 응답 빌드"""
        return self.base_api.created_response(data, **kwargs)

    def build_updated(self, data: Any, **kwargs) -> Response:
        """업데이트 응답 빌드"""
        return self.base_api.updated_response(data, **kwargs)

    def build_deleted(self, **kwargs) -> Response:
        """삭제 응답 빌드"""
        return self.base_api.deleted_response(**kwargs)

    def build_error(self, error_type: str, **kwargs) -> Response:
        """에러 응답 빌드"""
        error_methods = {
            'validation': self.base_api.validation_error_response,
            'authentication': self.base_api.authentication_error_response,
            'authorization': self.base_api.authorization_error_response,
            'not_found': self.base_api.not_found_response,
            'conflict': self.base_api.conflict_response,
            'rate_limit': self.base_api.rate_limit_response,
            'internal_error': self.base_api.internal_error_response,
            'bad_request': self.base_api.bad_request_response,
            'service_unavailable': self.base_api.service_unavailable_response
        }

        method = error_methods.get(error_type)
        if not method:
            raise ValueError(f"Unknown error type: {error_type}")

        return method(**kwargs)


# 편의 함수들
def create_api_response(data: Any = None, status_code: int = 200, message: str = None) -> Response:
    """API 응답 생성 헬퍼"""
    base_api = BaseAPI()
    return base_api.success_response(data, status_code, message)


def create_error_response(error_type: str, **kwargs) -> Response:
    """에러 응답 생성 헬퍼"""
    base_api = BaseAPI()
    builder = APIResponseBuilder(base_api)
    return builder.build_error(error_type, **kwargs)
