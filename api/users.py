"""
사용자 API Blueprint
사용자 관련 모든 API 엔드포인트를 포함합니다.
"""

from flask import Blueprint, request, jsonify

# 사용자 Blueprint 생성
users_bp = Blueprint('users', __name__)

@users_bp.route('/users/profile', methods=['GET'])
def get_user_profile():
    """사용자 프로필 조회"""
    try:
        # 인증 확인
        if not hasattr(request, 'current_user') or not request.current_user:
            return jsonify({'error': '인증이 필요합니다.'}), 401
        
        # 인증된 사용자 ID 사용
        employee_id = request.current_user.get('employee_id')
        if not employee_id:
            return jsonify({'error': '사용자 정보를 찾을 수 없습니다.'}), 400
        
        # 데이터베이스에서 사용자 프로필 조회
        from models.schemas import User
        from app import db
        
        user = User.query.filter_by(employee_id=employee_id).first()
        if not user:
            return jsonify({'error': '사용자를 찾을 수 없습니다.'}), 404
        
        return jsonify({
            'success': True,
            'message': '사용자 프로필 조회 성공',
            'employee_id': employee_id,
            'profile': {
                'employee_id': user.employee_id,
                'nickname': user.nickname,
                'email': user.email,
                'main_dish_genre': user.main_dish_genre,
                'lunch_preference': user.lunch_preference,
                'allergies': user.allergies,
                'preferred_time': user.preferred_time,
                'frequent_areas': user.frequent_areas
            }
        })
        
    except Exception as e:
        print(f"Error in get_user_profile: {e}")
        return jsonify({'error': '사용자 프로필 조회 중 오류가 발생했습니다.', 'details': str(e)}), 500

@users_bp.route('/users/profile', methods=['PUT'])
def update_user_profile():
    """사용자 프로필 수정"""
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
        
        # 데이터베이스에서 사용자 조회
        from models.schemas import User
        from app import db
        
        user = User.query.filter_by(employee_id=employee_id).first()
        if not user:
            return jsonify({'error': '사용자를 찾을 수 없습니다.'}), 404
        
        # 프로필 수정
        if 'nickname' in data:
            user.nickname = data['nickname']
        if 'main_dish_genre' in data:
            user.main_dish_genre = data['main_dish_genre']
        if 'lunch_preference' in data:
            user.lunch_preference = data['lunch_preference']
        if 'allergies' in data:
            user.allergies = data['allergies']
        if 'preferred_time' in data:
            user.preferred_time = data['preferred_time']
        if 'frequent_areas' in data:
            user.frequent_areas = data['frequent_areas']
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': '사용자 프로필이 수정되었습니다.',
            'employee_id': employee_id
        })
        
    except Exception as e:
        print(f"Error in update_user_profile: {e}")
        return jsonify({'error': '사용자 프로필 수정 중 오류가 발생했습니다.', 'details': str(e)}), 500
