"""
일정 API Blueprint
일정 관련 모든 API 엔드포인트를 포함합니다.
"""

from flask import Blueprint, request, jsonify

# 일정 Blueprint 생성
schedules_bp = Blueprint('schedules', __name__)

@schedules_bp.route('/personal_schedules/debug', methods=['GET'])
def debug_personal_schedules():
    """개인 일정 디버그 API"""
    try:
        # 인증 확인
        if not hasattr(request, 'current_user') or not request.current_user:
            return jsonify({'error': '인증이 필요합니다.'}), 401
        
        # 인증된 사용자 ID 사용
        employee_id = request.current_user.get('employee_id')
        if not employee_id:
            return jsonify({'error': '사용자 정보를 찾을 수 없습니다.'}), 400
        
        # 데이터베이스에서 개인 일정 조회
        from app import PersonalSchedule, db
        
        schedules = PersonalSchedule.query.filter_by(employee_id=employee_id).all()
        
        schedules_data = []
        for schedule in schedules:
            schedules_data.append({
                'id': schedule.id,
                'title': schedule.title,
                'description': schedule.description,
                'date': schedule.date.strftime('%Y-%m-%d') if schedule.date else None,
                'time': schedule.time.strftime('%H:%M') if schedule.time else None,
                'recurrence_type': schedule.recurrence_type
            })
        
        return jsonify({
            'success': True,
            'message': '개인 일정 디버그 조회 성공',
            'employee_id': employee_id,
            'total_schedules': len(schedules_data),
            'schedules': schedules_data
        })
        
    except Exception as e:
        print(f"Error in debug_personal_schedules: {e}")
        return jsonify({'error': '개인 일정 디버그 조회 중 오류가 발생했습니다.', 'details': str(e)}), 500
