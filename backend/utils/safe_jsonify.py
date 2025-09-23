"""
안전한 JSON 직렬화 유틸리티
순환 import 문제를 방지하기 위해 별도 모듈로 분리
"""

from flask import jsonify
from utils.json_encoder import convert_to_serializable
import logging

logger = logging.getLogger(__name__)

def safe_jsonify(data):
    """안전한 JSON 직렬화 함수"""
    try:
        # 데이터를 직렬화 가능한 형태로 변환
        serializable_data = convert_to_serializable(data)
        return jsonify(serializable_data)
    except Exception as e:
        logger.error(f"JSON 직렬화 실패: {e}")
        return jsonify({
            'error': '데이터 직렬화 실패',
            'message': str(e)
        }), 500
