"""
제안 API Blueprint
제안 관련 모든 API 엔드포인트를 포함합니다.
"""

from flask import Blueprint, request, jsonify
from datetime import datetime
from typing import Dict, Any
import logging
from auth.middleware import check_authentication

logger = logging.getLogger(__name__)

# Blueprint 생성
proposals_bp = Blueprint('proposals', __name__, url_prefix='/proposals')

# 인증 미들웨어 적용
@proposals_bp.before_request
def _proposals_guard():
    from flask import request, jsonify
    import os
    
    # 개발 환경에서는 개발용 토큰으로 인증 우회
    if os.getenv('FLASK_ENV') == 'development':
        auth_header = request.headers.get('Authorization')
        if auth_header and 'dev-token-12345' in auth_header:
            # 개발용 사용자 설정
            from auth.models import User
            user = User.query.filter_by(employee_id='1').first()
            if not user:
                user = User(
                    employee_id='1',
                    email='dev@example.com',
                    nickname='개발자',
                    is_active=True
                )
                from auth.models import db
                db.session.add(user)
                db.session.commit()
            
            request.current_user = user
            return None
    
    # 일반 인증 확인
    return check_authentication()

@proposals_bp.route('/mine', methods=['GET'])
def get_my_proposals():
    """
    내가 보낸 제안과 받은 제안을 조회하는 API
    """
    try:
        from app import app
        from models.app_models import db, LunchProposal, ProposalAcceptance
        
        employee_id = request.args.get('employee_id')
        
        if not employee_id:
            return jsonify({
                'error': '사용자 ID가 필요합니다',
                'required': ['employee_id']
            }), 400
        
        with app.app_context():
            # 내가 보낸 제안들
            sent_proposals = LunchProposal.query.filter_by(proposer_id=employee_id).all()
            
            # 내가 받은 제안들 (recipient_ids에 내 ID가 포함된 것들)
            received_proposals = []
            all_proposals = LunchProposal.query.filter(LunchProposal.recipient_ids.like(f'%{employee_id}%')).all()
            
            for proposal in all_proposals:
                if proposal.proposer_id != employee_id:  # 내가 보낸 것이 아닌 것만
                    received_proposals.append(proposal)
            
            # 데이터 포맷팅
            sent_data = []
            for proposal in sent_proposals:
                sent_data.append({
                    'id': proposal.id,
                    'proposer_id': proposal.proposer_id,
                    'recipient_ids': proposal.recipient_ids.split(',') if proposal.recipient_ids else [],
                    'proposed_date': proposal.proposed_date.strftime('%Y-%m-%d') if proposal.proposed_date else None,
                    'status': proposal.status,
                    'created_at': proposal.created_at.isoformat() if proposal.created_at else None
                })
            
            received_data = []
            for proposal in received_proposals:
                received_data.append({
                    'id': proposal.id,
                    'proposer_id': proposal.proposer_id,
                    'recipient_ids': proposal.recipient_ids.split(',') if proposal.recipient_ids else [],
                    'proposed_date': proposal.proposed_date.strftime('%Y-%m-%d') if proposal.proposed_date else None,
                    'status': proposal.status,
                    'created_at': proposal.created_at.isoformat() if proposal.created_at else None
                })
        
        logger.info(f"제안 조회 성공: {employee_id} - 보낸 제안: {len(sent_data)}개, 받은 제안: {len(received_data)}개")
        
        return jsonify({
            'sent_proposals': sent_data,
            'received_proposals': received_data
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
        from app import app
        from models.app_models import db, LunchProposal
        from datetime import datetime, timedelta
        
        data = request.get_json()
        if not data:
            return jsonify({'error': '요청 데이터가 없습니다'}), 400
        
        # 필수 필드 검증
        required_fields = ['proposer_id', 'recipient_ids', 'proposed_date']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'필수 필드가 누락되었습니다: {field}'}), 400
        
        with app.app_context():
            # recipient_ids를 문자열로 변환
            recipient_ids_str = ','.join(data['recipient_ids']) if isinstance(data['recipient_ids'], list) else data['recipient_ids']
            
            # proposed_date를 date 객체로 변환
            proposed_date = datetime.strptime(data['proposed_date'], '%Y-%m-%d').date()
            
            # 만료 시간 설정 (24시간 후)
            expires_at = datetime.utcnow() + timedelta(hours=24)
            
            # 새 제안 생성
            new_proposal = LunchProposal(
                proposer_id=data['proposer_id'],
                recipient_ids=recipient_ids_str,
                proposed_date=proposed_date,
                status='pending',
                expires_at=expires_at
            )
            
            db.session.add(new_proposal)
            db.session.commit()
            
            proposal_id = new_proposal.id
        
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
def cancel_proposal(proposal_id):
    """
    제안을 취소하는 API
    """
    try:
        from app import app
        from models.app_models import db, LunchProposal
        
        data = request.get_json()
        if not data:
            return jsonify({'error': '요청 데이터가 없습니다'}), 400
        
        employee_id = data.get('employee_id')
        if not employee_id:
            return jsonify({'error': '사용자 ID가 필요합니다'}), 400
        
        with app.app_context():
            # 제안 조회
            proposal = LunchProposal.query.get(proposal_id)
            if not proposal:
                return jsonify({'error': '제안을 찾을 수 없습니다'}), 404
            
            # 권한 확인 (제안한 사람만 취소 가능)
            if proposal.proposer_id != employee_id:
                return jsonify({'error': '제안을 취소할 권한이 없습니다'}), 403
            
            # 상태 확인
            if proposal.status != 'pending':
                return jsonify({'error': '이미 처리된 제안입니다'}), 400
            
            # 제안 상태를 'cancelled'로 변경
            proposal.status = 'cancelled'
            db.session.commit()
        
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

@proposals_bp.route('/<int:proposal_id>/accept', methods=['POST'])
def accept_proposal(proposal_id):
    """
    제안을 수락하는 API
    """
    try:
        from app import app
        from models.app_models import db, LunchProposal, ProposalAcceptance
        
        data = request.get_json()
        if not data:
            return jsonify({'error': '요청 데이터가 없습니다'}), 400
        
        user_id = data.get('user_id')
        if not user_id:
            return jsonify({'error': '사용자 ID가 필요합니다'}), 400
        
        with app.app_context():
            # 제안 조회
            proposal = LunchProposal.query.get(proposal_id)
            if not proposal:
                return jsonify({'error': '제안을 찾을 수 없습니다'}), 404
            
            # 권한 확인 (수신자만 수락 가능)
            recipient_ids = proposal.recipient_ids.split(',') if proposal.recipient_ids else []
            if user_id not in recipient_ids:
                return jsonify({'error': '이 제안의 수신자가 아닙니다'}), 403
            
            # 상태 확인
            if proposal.status != 'pending':
                return jsonify({'error': '이미 처리된 제안입니다'}), 400
            
            # 만료 확인
            if proposal.expires_at and datetime.utcnow() > proposal.expires_at:
                return jsonify({'error': '제안이 만료되었습니다'}), 400
            
            # 이미 수락했는지 확인
            existing_acceptance = ProposalAcceptance.query.filter_by(
                proposal_id=proposal_id, 
                user_id=user_id
            ).first()
            
            if existing_acceptance:
                return jsonify({'error': '이미 수락한 제안입니다'}), 400
            
            # 수락 기록 생성
            new_acceptance = ProposalAcceptance(
                proposal_id=proposal_id,
                user_id=user_id
            )
            
            db.session.add(new_acceptance)
            
            # 모든 수신자가 수락했는지 확인
            all_recipients_accepted = all(
                ProposalAcceptance.query.filter_by(
                    proposal_id=proposal_id, 
                    user_id=recipient_id
                ).first() is not None
                for recipient_id in recipient_ids
            )
            
            if all_recipients_accepted:
                proposal.status = 'confirmed'
            
            db.session.commit()
        
        logger.info(f"제안 수락 성공: {proposal_id}, {user_id}")
        
        return jsonify({
            'success': True,
            'message': '제안을 수락했습니다',
            'status': 'confirmed' if all_recipients_accepted else 'pending'
        })
        
    except Exception as e:
        logger.error(f"제안 수락 중 오류 발생: {e}")
        return jsonify({
            'error': '서버 내부 오류가 발생했습니다',
            'message': str(e)
        }), 500

@proposals_bp.route('/<int:proposal_id>/reject', methods=['POST'])
def reject_proposal(proposal_id):
    """
    제안을 거절하는 API
    """
    try:
        from app import app
        from models.app_models import db, LunchProposal
        
        data = request.get_json()
        if not data:
            return jsonify({'error': '요청 데이터가 없습니다'}), 400
        
        user_id = data.get('user_id')
        if not user_id:
            return jsonify({'error': '사용자 ID가 필요합니다'}), 400
        
        with app.app_context():
            # 제안 조회
            proposal = LunchProposal.query.get(proposal_id)
            if not proposal:
                return jsonify({'error': '제안을 찾을 수 없습니다'}), 404
            
            # 권한 확인 (수신자만 거절 가능)
            recipient_ids = proposal.recipient_ids.split(',') if proposal.recipient_ids else []
            if user_id not in recipient_ids:
                return jsonify({'error': '이 제안의 수신자가 아닙니다'}), 403
            
            # 상태 확인
            if proposal.status != 'pending':
                return jsonify({'error': '이미 처리된 제안입니다'}), 400
            
            # 제안 상태를 'rejected'로 변경
            proposal.status = 'rejected'
            db.session.commit()
        
        logger.info(f"제안 거절 성공: {proposal_id}, {user_id}")
        
        return jsonify({
            'success': True,
            'message': '제안을 거절했습니다'
        })
        
    except Exception as e:
        logger.error(f"제안 거절 중 오류 발생: {e}")
        return jsonify({
            'error': '서버 내부 오류가 발생했습니다',
            'message': str(e)
        }), 500