"""
단골파티 API Blueprint
단골파티 관련 모든 API 엔드포인트를 포함합니다.
"""

from flask import Blueprint, request, jsonify
from sqlalchemy import desc
from datetime import datetime

# 단골파티 Blueprint 생성
dangolpots_bp = Blueprint('dangolpots', __name__)

# 모델 import
from flask import current_app
from sqlalchemy.orm import joinedload

@dangolpots_bp.route('/dangolpots', methods=['GET'])
def get_all_dangolpots():
    """모든 단골파티 목록 조회"""
    try:
        # 인증 확인
        if not hasattr(request, 'current_user') or not request.current_user:
            return jsonify({'error': '인증이 필요합니다.'}), 401
        
        # 인증된 사용자 ID 사용
        employee_id = request.current_user.get('employee_id')
        if not employee_id:
            return jsonify({'error': '사용자 정보를 찾을 수 없습니다.'}), 400
        
        # 데이터베이스에서 단골파티 조회
        from models.schemas import DangolPot
        from app import db
        
        pots = DangolPot.query.all()
        
        return jsonify({
            'success': True,
            'message': '단골파티 목록 조회 성공',
            'employee_id': employee_id,
            'total_pots': len(pots),
            'pots': [{
                'id': pot.id,
                'name': pot.name,
                'description': pot.description,
                'tags': pot.tags,
                'category': pot.category,
                'host_id': pot.host_id,
                'member_count': pot.member_count,
                'created_at': pot.created_at.strftime('%Y-%m-%d') if pot.created_at else None
            } for pot in pots]
        })
        
    except Exception as e:
        print(f"Error in get_all_dangolpots: {e}")
        return jsonify({'error': '단골파티 목록 조회 중 오류가 발생했습니다.', 'details': str(e)}), 500

@dangolpots_bp.route('/dangolpots', methods=['POST'])
def create_dangolpot():
    """새 단골파티 생성"""
    try:
        # 인증 확인
        if not hasattr(request, 'current_user') or not request.current_user:
            return jsonify({'error': '인증이 필요합니다.'}), 401
        
        # 인증된 사용자 ID 사용
        employee_id = request.current_user.get('employee_id')
        if not employee_id:
            return jsonify({'error': '사용자 정보를 찾을 수 없습니다.'}), 400
        
        data = request.get_json()
        if not data:
            return jsonify({'error': '요청 데이터가 없습니다.'}), 400
        
        # 필수 필드 검증
        required_fields = ['name', 'description', 'category']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'error': f'{field} 필드는 필수입니다.'}), 400
        
        # 데이터베이스에 새 단골파티 생성
        from models.schemas import DangolPot
        from app import db
        
        pot = DangolPot(
            name=data['name'],
            description=data['description'],
            tags=data.get('tags', ''),
            category=data['category'],
            host_id=employee_id,
            member_count=1  # 호스트 포함
        )
        db.session.add(pot)
        db.session.commit()
        
        # 호스트를 멤버로 추가
        from models.schemas import DangolPotMember
        member = DangolPotMember(
            dangolpot_id=pot.id,
            employee_id=employee_id
        )
        db.session.add(member)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': '단골파티가 성공적으로 생성되었습니다.',
            'employee_id': employee_id
        })
        
    except Exception as e:
        print(f"Error in create_dangolpot: {e}")
        return jsonify({'error': '단골파티 생성 중 오류가 발생했습니다.', 'details': str(e)}), 500

@dangolpots_bp.route('/dangolpots/<int:pot_id>', methods=['GET'])
def get_dangolpot(pot_id):
    """특정 단골파티 상세 정보 조회"""
    try:
        # 인증 확인
        if not hasattr(request, 'current_user') or not request.current_user:
            return jsonify({'error': '인증이 필요합니다.'}), 401
        
        # 인증된 사용자 ID 사용
        employee_id = request.current_user.get('employee_id')
        if not employee_id:
            return jsonify({'error': '사용자 정보를 찾을 수 없습니다.'}), 400
        
        # 데이터베이스에서 단골파티 조회
        from app import DangolPot, DangolPotMember, db
        
        pot = DangolPot.query.get(pot_id)
        if not pot:
            return jsonify({'error': '단골파티를 찾을 수 없습니다.'}), 404
        
        # 멤버 정보 조회
        members = DangolPotMember.query.filter_by(dangolpot_id=pot_id).all()
        member_ids = [member.employee_id for member in members]
        
        return jsonify({
            'success': True,
            'message': '단골파티 정보 조회 성공',
            'pot_id': pot_id,
            'employee_id': employee_id,
            'pot': {
                'id': pot.id,
                'name': pot.name,
                'description': pot.description,
                'tags': pot.tags,
                'category': pot.category,
                'host_id': pot.host_id,
                'member_count': pot.member_count,
                'created_at': pot.created_at.strftime('%Y-%m-%d') if pot.created_at else None,
                'members': member_ids
            }
        })
        
    except Exception as e:
        print(f"Error in get_dangolpot: {e}")
        return jsonify({'error': '단골파티 정보 조회 중 오류가 발생했습니다.', 'details': str(e)}), 500

@dangolpots_bp.route('/dangolpots/<int:pot_id>', methods=['PUT'])
def update_dangolpot(pot_id):
    """단골파티 정보 수정"""
    try:
        # 인증 확인
        if not hasattr(request, 'current_user') or not request.current_user:
            return jsonify({'error': '인증이 필요합니다.'}), 401
        
        # 인증된 사용자 ID 사용
        employee_id = request.current_user.get('employee_id')
        if not employee_id:
            return jsonify({'error': '사용자 정보를 찾을 수 없습니다.'}), 400
        
        # 데이터베이스에서 단골파티 조회
        from app import DangolPot, db
        
        pot = DangolPot.query.get(pot_id)
        if not pot:
            return jsonify({'error': '단골파티를 찾을 수 없습니다.'}), 404
        
        # 호스트만 수정 가능
        if pot.host_id != employee_id:
            return jsonify({'error': '단골파티 호스트만 수정할 수 있습니다.'}), 403
        
        # 데이터 수정
        data = request.get_json()
        if 'name' in data:
            pot.name = data['name']
        if 'description' in data:
            pot.description = data['description']
        if 'tags' in data:
            pot.tags = data['tags']
        if 'category' in data:
            pot.category = data['category']
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': '단골파티 정보가 수정되었습니다.',
            'pot_id': pot_id,
            'employee_id': employee_id
        })
        
    except Exception as e:
        print(f"Error in update_dangolpot: {e}")
        return jsonify({'error': '단골파티 정보 수정 중 오류가 발생했습니다.', 'details': str(e)}), 500

@dangolpots_bp.route('/dangolpots/<int:pot_id>/join', methods=['POST'])
def join_dangolpot(pot_id):
    """단골파티 참여"""
    try:
        # 인증 확인
        if not hasattr(request, 'current_user') or not request.current_user:
            return jsonify({'error': '인증이 필요합니다.'}), 401
        
        # 인증된 사용자 ID 사용
        employee_id = request.current_user.get('employee_id')
        if not employee_id:
            return jsonify({'error': '사용자 정보를 찾을 수 없습니다.'}), 400
        
        # 데이터베이스에서 단골파티 조회
        from app import DangolPot, DangolPotMember, db
        
        pot = DangolPot.query.get(pot_id)
        if not pot:
            return jsonify({'error': '단골파티를 찾을 수 없습니다.'}), 404
        
        # 이미 참여 중인지 확인
        existing_member = DangolPotMember.query.filter_by(
            dangolpot_id=pot_id, 
            employee_id=employee_id
        ).first()
        
        if existing_member:
            return jsonify({'error': '이미 참여 중인 단골파티입니다.'}), 400
        
        # 멤버 추가
        member = DangolPotMember(
            dangolpot_id=pot_id,
            employee_id=employee_id
        )
        db.session.add(member)
        
        # 멤버 수 증가
        pot.member_count += 1
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': '단골파티에 참여했습니다.',
            'pot_id': pot_id,
            'employee_id': employee_id
        })
        
    except Exception as e:
        print(f"Error in join_dangolpot: {e}")
        return jsonify({'error': '단골파티 참여 중 오류가 발생했습니다.', 'details': str(e)}), 500

@dangolpots_bp.route('/dangolpots/<int:pot_id>', methods=['DELETE'])
def delete_dangolpot(pot_id):
    """단골파티 삭제"""
    try:
        # 인증 확인
        if not hasattr(request, 'current_user') or not request.current_user:
            return jsonify({'error': '인증이 필요합니다.'}), 401
        
        # 인증된 사용자 ID 사용
        employee_id = request.current_user.get('employee_id')
        if not employee_id:
            return jsonify({'error': '사용자 정보를 찾을 수 없습니다.'}), 400
        
        # 데이터베이스에서 단골파티 조회
        from app import DangolPot, DangolPotMember, db
        
        pot = DangolPot.query.get(pot_id)
        if not pot:
            return jsonify({'error': '단골파티를 찾을 수 없습니다.'}), 404
        
        # 호스트만 삭제 가능
        if pot.host_id != employee_id:
            return jsonify({'error': '단골파티 호스트만 삭제할 수 있습니다.'}), 403
        
        # 멤버 정보 먼저 삭제
        DangolPotMember.query.filter_by(dangolpot_id=pot_id).delete()
        
        # 단골파티 삭제
        db.session.delete(pot)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': '단골파티가 삭제되었습니다.',
            'pot_id': pot_id,
            'employee_id': employee_id
        })
        
    except Exception as e:
        print(f"Error in delete_dangolpot: {e}")
        return jsonify({'error': '단골파티 삭제 중 오류가 발생했습니다.', 'details': str(e)}), 500

@dangolpots_bp.route('/my_dangolpots', methods=['GET'])
def get_my_dangolpots():
    """내 단골파티 목록 조회"""
    try:
        # 인증 확인
        if not hasattr(request, 'current_user') or not request.current_user:
            return jsonify({'error': '인증이 필요합니다.'}), 401
        
        # 인증된 사용자 ID 사용
        employee_id = request.current_user.get('employee_id')
        if not employee_id:
            return jsonify({'error': '사용자 정보를 찾을 수 없습니다.'}), 400
        
        # 정규화된 DangolPotMember 테이블을 사용하여 조회
        from app import DangolPot, DangolPotMember, db
        
        my_pots = DangolPot.query.join(DangolPotMember).filter(
            DangolPotMember.employee_id == employee_id
        ).all()
        
        pots_data = []
        for pot in my_pots:
            # 멤버 정보 조회
            members = DangolPotMember.query.filter_by(dangolpot_id=pot.id).all()
            member_ids = [member.employee_id for member in members]
            
            pots_data.append({
                'id': pot.id,
                'name': pot.name,
                'description': pot.description,
                'tags': pot.tags,
                'category': pot.category,
                'host_id': pot.host_id,
                'member_count': pot.member_count,
                'created_at': pot.created_at.strftime('%Y-%m-%d') if pot.created_at else None,
                'members': member_ids
            })
        
        return jsonify({
            'success': True,
            'message': '내 단골파티 목록 조회 성공',
            'employee_id': employee_id,
            'total_pots': len(pots_data),
            'pots': pots_data
        })
        
    except Exception as e:
        print(f"Error in get_my_dangolpots: {e}")
        return jsonify({'error': '내 단골파티 목록 조회 중 오류가 발생했습니다.', 'details': str(e)}), 500
