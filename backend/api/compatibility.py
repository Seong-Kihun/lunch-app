#!/usr/bin/env python3
"""
모바일 앱 호환성을 위한 API 엔드포인트
기존 경로를 새로운 API 경로로 리다이렉트합니다.
"""

from flask import Blueprint, request, jsonify, redirect
from auth.middleware import check_authentication
from auth.routes import send_magic_link, get_profile
import logging

logger = logging.getLogger(__name__)

# 호환성 Blueprint 생성
compatibility_bp = Blueprint('compatibility', __name__)

@compatibility_bp.route('/auth/magic-link', methods=['POST'])
def compatibility_magic_link():
    """매직링크 API 호환성 엔드포인트"""
    logger.info("호환성 매직링크 API 호출됨")
    return send_magic_link()

@compatibility_bp.route('/dev/users/<int:employee_id>', methods=['GET'])
def compatibility_dev_user(employee_id):
    """개발용 사용자 API 호환성 엔드포인트"""
    logger.info(f"호환성 개발용 사용자 API 호출됨: {employee_id}")
    
    # 인증 확인
    auth_result = check_authentication()
    if auth_result:
        return auth_result
    
    # 사용자 프로필 조회로 리다이렉트
    return get_profile()

@compatibility_bp.route('/auth/profile', methods=['GET'])
def compatibility_auth_profile():
    """인증 프로필 API 호환성 엔드포인트"""
    logger.info("호환성 인증 프로필 API 호출됨")
    return get_profile()

@compatibility_bp.route('/auth/register', methods=['POST'])
def compatibility_register():
    """회원가입 API 호환성 엔드포인트"""
    logger.info("호환성 회원가입 API 호출됨")
    from auth.routes import register_user
    return register_user()

@compatibility_bp.route('/auth/login', methods=['POST'])
def compatibility_login():
    """로그인 API 호환성 엔드포인트"""
    logger.info("호환성 로그인 API 호출됨")
    from auth.routes import test_login
    data = request.get_json()
    if data and 'employee_id' in data:
        return test_login(data['employee_id'])
    return jsonify({"error": "employee_id가 필요합니다"}), 400
