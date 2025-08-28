"""
중앙 집중식 에러 핸들러
Pydantic 유효성 검증 실패와 기타 에러를 일관된 형식으로 처리
"""

from flask import jsonify, request
from pydantic import ValidationError
from werkzeug.exceptions import HTTPException
import traceback
import logging

logger = logging.getLogger(__name__)

class APIError(Exception):
    """API 에러를 위한 커스텀 예외 클래스"""
    def __init__(self, message, status_code=400, error_code=None):
        super().__init__()
        self.message = message
        self.status_code = status_code
        self.error_code = error_code

class ValidationAPIError(APIError):
    """유효성 검증 실패를 위한 예외 클래스"""
    def __init__(self, message, validation_errors=None):
        super().__init__(message, status_code=422)
        self.validation_errors = validation_errors or []

def handle_validation_error(error: ValidationError):
    """Pydantic ValidationError를 처리"""
    validation_errors = []
    for err in error.errors():
        validation_errors.append({
            'field': '.'.join(str(loc) for loc in err['loc']),
            'message': err['msg'],
            'type': err['type']
        })
    
    return jsonify({
        'error': 'Validation Error',
        'message': '입력 데이터가 유효하지 않습니다.',
        'validation_errors': validation_errors,
        'status_code': 422
    }), 422

def handle_api_error(error: APIError):
    """APIError를 처리"""
    response = {
        'error': 'API Error',
        'message': error.message,
        'status_code': error.status_code
    }
    
    if error.error_code:
        response['error_code'] = error.error_code
    
    return jsonify(response), error.status_code

def handle_http_exception(error: HTTPException):
    """HTTPException을 처리"""
    return jsonify({
        'error': 'HTTP Error',
        'message': error.description or '요청을 처리할 수 없습니다.',
        'status_code': error.code
    }), error.code

def handle_generic_exception(error: Exception):
    """일반적인 예외를 처리"""
    logger.error(f"Unhandled exception: {str(error)}")
    logger.error(traceback.format_exc())
    
    return jsonify({
        'error': 'Internal Server Error',
        'message': '서버 내부 오류가 발생했습니다.',
        'status_code': 500
    }), 500

def register_error_handlers(app):
    """Flask 앱에 에러 핸들러를 등록"""
    
    @app.errorhandler(ValidationError)
    def validation_error_handler(error):
        return handle_validation_error(error)
    
    @app.errorhandler(APIError)
    def api_error_handler(error):
        return handle_api_error(error)
    
    @app.errorhandler(HTTPException)
    def http_exception_handler(error):
        return handle_http_exception(error)
    
    @app.errorhandler(Exception)
    def generic_exception_handler(error):
        return handle_generic_exception(error)
    
    # 404 에러 핸들러
    @app.errorhandler(404)
    def not_found_handler(error):
        return jsonify({
            'error': 'Not Found',
            'message': '요청한 리소스를 찾을 수 없습니다.',
            'status_code': 404
        }), 404
    
    # 405 에러 핸들러
    @app.errorhandler(405)
    def method_not_allowed_handler(error):
        return jsonify({
            'error': 'Method Not Allowed',
            'message': '허용되지 않는 HTTP 메서드입니다.',
            'status_code': 405
        }), 405

def create_validation_error(message: str, validation_errors: list = None):
    """ValidationAPIError를 생성하는 헬퍼 함수"""
    return ValidationAPIError(message, validation_errors)

def create_api_error(message: str, status_code: int = 400, error_code: str = None):
    """APIError를 생성하는 헬퍼 함수"""
    return APIError(message, status_code, error_code)
