"""
제안 API Blueprint
제안 관련 모든 API 엔드포인트를 포함합니다.
"""

from flask import Blueprint, request, jsonify
from datetime import datetime
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)

# Blueprint 생성
proposals_bp = Blueprint('proposals', __name__, url_prefix='/api/proposals')

@proposals_bp.route('/mine', methods=['GET'])
def get_my_proposals():
    """
    내가 보낸 제안과 받은 제안을 조회하는 API
    """
    try:
        employee_id = request.args.get('employee_id')
        
        if not employee_id:
            return jsonify({
                'error': '사용자 ID가 필요합니다',
                'required': ['employee_id']
            }), 400
        
        # 🚨 임시: 실제 데이터베이스 연동 전까지 가상 데이터 반환
        # TODO: 실제 데이터베이스에서 제안 데이터 조회하도록 수정
        
        # 가상 제안 데이터 생성
        virtual_proposals = {
            'sent_proposals': [
                {
                    'id': 1,
                    'proposer_id': employee_id,
                    'recipient_ids': ['2', '3'],
                    'proposed_date': '2025-08-28',
                    'status': 'pending',
                    'created_at': datetime.now().isoformat()
                }
            ],
            'received_proposals': []
        }
        
        logger.info(f"제안 조회 성공: {employee_id}")
        
        return jsonify({
            'success': True,
            'data': virtual_proposals
        })
        
    except Exception as e:
        logger.error(f"제안 조회 중 오류 발생: {e}")
        return jsonify({
            'error': '서버 내부 오류가 발생했습니다',
            'message': str(e)
        }), 500

@proposals_bp.route('/', methods=['POST'])
def create_proposal():
    """
    새로운 제안을 생성하는 API
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': '요청 데이터가 없습니다'}), 400
        
        # 필수 필드 검증
        required_fields = ['proposer_id', 'recipient_ids', 'proposed_date']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'필수 필드가 누락되었습니다: {field}'}), 400
        
        # 🚨 임시: 실제 데이터베이스 저장 전까지 가상 응답
        # TODO: 실제 데이터베이스에 제안 데이터 저장하도록 수정
        
        proposal_id = int(datetime.now().timestamp())
        
        logger.info(f"제안 생성 성공: {proposal_id}, {data['proposer_id']}")
        
        return jsonify({
            'success': True,
            'data': {
                'id': proposal_id,
                'proposer_id': data['proposer_id'],
                'recipient_ids': data['recipient_ids'],
                'proposed_date': data['proposed_date'],
                'status': 'pending',
                'created_at': datetime.now().isoformat()
            }
        }), 201
        
    except Exception as e:
        logger.error(f"제안 생성 중 오류 발생: {e}")
        return jsonify({
            'error': '서버 내부 오류가 발생했습니다',
            'message': str(e)
        }), 500

@proposals_bp.route('/<int:proposal_id>/cancel', methods=['POST'])
def cancel_proposal():
    """
    제안을 취소하는 API
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': '요청 데이터가 없습니다'}), 400
        
        employee_id = data.get('employee_id')
        if not employee_id:
            return jsonify({'error': '사용자 ID가 필요합니다'}), 400
        
        # 🚨 임시: 실제 데이터베이스 업데이트 전까지 가상 응답
        # TODO: 실제 데이터베이스에서 제안 상태를 'cancelled'로 업데이트하도록 수정
        
        logger.info(f"제안 취소 성공: {proposal_id}, {employee_id}")
        
        return jsonify({
            'success': True,
            'message': '제안이 성공적으로 취소되었습니다'
        })
        
    except Exception as e:
        logger.error(f"제안 취소 중 오류 발생: {e}")
        return jsonify({
            'error': '서버 내부 오류가 발생했습니다',
            'message': str(e)
        }), 500
