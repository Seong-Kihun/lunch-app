"""
일정 API Blueprint
일정 관련 모든 API 엔드포인트를 포함합니다.
"""

from flask import Blueprint, request, jsonify
from datetime import datetime
import logging

# 지연 import로 순환 참조 방지
def get_schedule_service():
    from services.schedule_service import ScheduleService
    return ScheduleService

def get_schedule_models():
    from models.schedule_models import PersonalSchedule, ScheduleException
    return PersonalSchedule, ScheduleException

def get_db():
    from backend.app.extensions import db
    return db

logger = logging.getLogger(__name__)

# Blueprint 생성
schedules_bp = Blueprint('schedules', __name__)

# 인증 미들웨어는 UnifiedBlueprintManager에서 중앙 관리됨

@schedules_bp.route('/', methods=['GET'])
def get_schedules():
    """
    특정 기간의 모든 일정을 가져오는 API
    반복 일정을 확장하고 예외를 적용하여 최종 결과 반환
    """
    try:
        # 필수 파라미터 검증
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        employee_id = request.args.get('employee_id')

        if not all([start_date_str, end_date_str, employee_id]):
            return jsonify({
                'error': '필수 파라미터가 누락되었습니다',
                'required': ['start_date', 'end_date', 'employee_id']
            }), 400

        # 날짜 파싱
        try:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({
                'error': '날짜 형식이 올바르지 않습니다',
                'format': 'YYYY-MM-DD'
            }), 400

        # 일정 조회
        ScheduleService = get_schedule_service()
        schedules = ScheduleService.get_schedules_for_period(
            employee_id=employee_id,
            start_date=start_date,
            end_date=end_date
        )

        logger.info(f"일정 조회 성공: {employee_id}, {start_date} ~ {end_date}")

        return jsonify({
            'success': True,
            'data': schedules,
            'period': {
                'start_date': start_date_str,
                'end_date': end_date_str
            },
            'total_dates': len(schedules)
        })

    except Exception as e:
        logger.error(f"일정 조회 중 오류 발생: {e}")
        return jsonify({
            'error': '서버 내부 오류가 발생했습니다',
            'message': str(e)
        }), 500

@schedules_bp.route('/', methods=['POST'])
def create_schedule():
    """
    새로운 일정 생성 (반복 일정 포함)
    반복 규칙만 저장하고, 인스턴스는 필요할 때 계산
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': '요청 데이터가 없습니다'}), 400

        # 필수 필드 검증
        required_fields = ['employee_id', 'title', 'start_date', 'time']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'필수 필드가 누락되었습니다: {field}'}), 400

        # 날짜 파싱
        try:
            start_date = datetime.strptime(data['start_date'], '%Y-%m-%d')
        except ValueError:
            return jsonify({
                'error': 'start_date 형식이 올바르지 않습니다',
                'format': 'YYYY-MM-DD'
            }), 400

        # 반복 종료 날짜 파싱 (있는 경우)
        if data.get('recurrence_end_date'):
            try:
                data['recurrence_end_date'] = datetime.strptime(
                    data['recurrence_end_date'], '%Y-%m-%d'
                )
            except ValueError:
                return jsonify({
                    'error': 'recurrence_end_date 형식이 올바르지 않습니다',
                    'format': 'YYYY-MM-DD'
                }), 400

        # 일정 데이터 준비
        schedule_data = {
            'employee_id': data['employee_id'],
            'title': data['title'],
            'start_date': start_date,
            'time': data['time'],
            'restaurant': data.get('restaurant'),
            'location': data.get('location'),
            'description': data.get('description'),
            'is_recurring': data.get('is_recurring', False),
            'recurrence_type': data.get('recurrence_type'),
            'recurrence_interval': data.get('recurrence_interval', 1),
            'recurrence_end_date': data.get('recurrence_end_date'),
            'created_by': data.get('created_by', data['employee_id'])
        }

        # 마스터 일정 생성
        ScheduleService = get_schedule_service()
        schedule = ScheduleService.create_master_schedule(schedule_data)

        logger.info(f"일정 생성 성공: ID {schedule.id}, 제목: {schedule.title}")

        return jsonify({
            'success': True,
            'message': '일정이 생성되었습니다',
            'data': schedule.to_dict()
        }), 201

    except Exception as e:
        logger.error(f"일정 생성 중 오류 발생: {e}")
        return jsonify({
            'error': '서버 내부 오류가 발생했습니다',
            'message': str(e)
        }), 500

@schedules_bp.route('/<int:schedule_id>', methods=['PUT'])
def update_schedule(schedule_id):
    """
    마스터 일정 수정 (모든 반복 일정 수정)
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': '요청 데이터가 없습니다'}), 400

        # 날짜 필드 파싱
        if 'start_date' in data:
            try:
                data['start_date'] = datetime.strptime(data['start_date'], '%Y-%m-%d')
            except ValueError:
                return jsonify({
                    'error': 'start_date 형식이 올바르지 않습니다',
                    'format': 'YYYY-MM-DD'
                }), 400

        if 'recurrence_end_date' in data and data['recurrence_end_date'] is not None:
            try:
                data['recurrence_end_date'] = datetime.strptime(
                    data['recurrence_end_date'], '%Y-%m-%d'
                )
            except ValueError:
                return jsonify({
                    'error': 'recurrence_end_date 형식이 올바르지 않습니다',
                    'format': 'YYYY-MM-DD'
                }), 400

        # 마스터 일정 수정
        ScheduleService = get_schedule_service()
        success = ScheduleService.update_master_schedule(schedule_id, data)

        if not success:
            return jsonify({'error': '일정을 찾을 수 없습니다'}), 404

        logger.info(f"일정 수정 성공: ID {schedule_id}")

        return jsonify({
            'success': True,
            'message': '일정이 수정되었습니다'
        })

    except Exception as e:
        logger.error(f"일정 수정 중 오류 발생: {e}")
        return jsonify({
            'error': '서버 내부 오류가 발생했습니다',
            'message': str(e)
        }), 500

@schedules_bp.route('/<int:schedule_id>', methods=['DELETE'])
def delete_schedule(schedule_id):
    """
    마스터 일정 삭제 (모든 반복 일정 삭제)
    """
    try:
        # 마스터 일정 삭제
        ScheduleService = get_schedule_service()
        success = ScheduleService.delete_master_schedule(schedule_id)

        if not success:
            return jsonify({'error': '일정을 찾을 수 없습니다'}), 404

        logger.info(f"일정 삭제 성공: ID {schedule_id}")

        return jsonify({
            'success': True,
            'message': '일정이 삭제되었습니다'
        })

    except Exception as e:
        logger.error(f"일정 삭제 중 오류 발생: {e}")
        return jsonify({
            'error': '서버 내부 오류가 발생했습니다',
            'message': str(e)
        }), 500

@schedules_bp.route('/<int:schedule_id>/exceptions', methods=['POST'])
def create_schedule_exception(schedule_id):
    """
    일정 예외 생성 (이 날짜만 수정/삭제)
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': '요청 데이터가 없습니다'}), 400

        # 필수 필드 검증
        if 'exception_date' not in data:
            return jsonify({'error': 'exception_date가 필요합니다'}), 400

        # 날짜 파싱
        try:
            exception_date = datetime.strptime(data['exception_date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({
                'error': 'exception_date 형식이 올바르지 않습니다',
                'format': 'YYYY-MM-DD'
            }), 400

        # 예외 데이터 준비
        exception_data = {
            'is_deleted': data.get('is_deleted', False),
            'is_modified': data.get('is_modified', False)
        }

        # 수정된 정보가 있는 경우
        if exception_data['is_modified']:
            exception_data.update({
                'new_title': data.get('new_title'),
                'new_time': data.get('new_time'),
                'new_restaurant': data.get('new_restaurant'),
                'new_location': data.get('new_location'),
                'new_description': data.get('new_description')
            })

        # 예외 생성
        ScheduleService = get_schedule_service()
        exception = ScheduleService.create_exception(
            master_schedule_id=schedule_id,
            exception_date=exception_date,
            exception_data=exception_data
        )

        logger.info(f"일정 예외 생성 성공: 마스터 ID {schedule_id}, 날짜 {exception_date}")

        return jsonify({
            'success': True,
            'message': '일정 예외가 생성되었습니다',
            'data': exception.to_dict()
        }), 201

    except Exception as e:
        logger.error(f"일정 예외 생성 중 오류 발생: {e}")
        return jsonify({
            'error': '서버 내부 오류가 발생했습니다',
            'message': str(e)
        }), 500

@schedules_bp.route('/<int:schedule_id>/exceptions/<int:exception_id>', methods=['DELETE'])
def delete_schedule_exception(schedule_id, exception_id):
    """
    일정 예외 삭제
    """
    try:
        _, ScheduleException = get_schedule_models()
        db = get_db()

        exception = ScheduleException.query.get(exception_id)
        if not exception:
            return jsonify({'error': '예외를 찾을 수 없습니다'}), 404

        if exception.original_schedule_id != schedule_id:
            return jsonify({'error': '잘못된 요청입니다'}), 400

        db.session.delete(exception)
        db.session.commit()

        logger.info(f"일정 예외 삭제 성공: 예외 ID {exception_id}")

        return jsonify({
            'success': True,
            'message': '일정 예외가 삭제되었습니다'
        })

    except Exception as e:
        db = get_db()
        db.session.rollback()
        logger.error(f"일정 예외 삭제 중 오류 발생: {e}")
        return jsonify({
            'error': '서버 내부 오류가 발생했습니다',
            'message': str(e)
        }), 500

# ===== 호환성을 위한 personal_schedules 엔드포인트 =====
# 프론트엔드에서 기대하는 URL 형식을 지원하기 위한 별도 Blueprint

personal_schedules_bp = Blueprint('personal_schedules', __name__)

@personal_schedules_bp.route('/<int:schedule_id>', methods=['DELETE'])
def delete_personal_schedule(schedule_id):
    """
    개인 일정 삭제 (schedules API와 동일한 기능)
    프론트엔드 호환성을 위한 엔드포인트
    """
    try:
        # 기존 schedules API의 delete_schedule 함수와 동일한 로직 사용
        ScheduleService = get_schedule_service()
        success = ScheduleService.delete_master_schedule(schedule_id)

        if not success:
            return jsonify({'error': '일정을 찾을 수 없습니다'}), 404

        logger.info(f"개인 일정 삭제 성공: ID {schedule_id}")

        return jsonify({
            'success': True,
            'message': '일정이 삭제되었습니다'
        })

    except Exception as e:
        logger.error(f"개인 일정 삭제 중 오류 발생: {e}")
        return jsonify({
            'error': '서버 내부 오류가 발생했습니다',
            'message': str(e)
        }), 500

@personal_schedules_bp.route('/cleanup', methods=['POST'])
def cleanup_personal_schedules():
    """
    개인 일정 정리 (개발용)
    """
    try:
        # 모든 개인 일정 삭제
        from sqlalchemy import text
        db = get_db()
        db.session.execute(text("DELETE FROM personal_schedules"))
        db.session.execute(text("DELETE FROM schedule_exceptions"))
        db.session.execute(text("DELETE FROM sqlite_sequence WHERE name='personal_schedules'"))
        db.session.execute(text("DELETE FROM sqlite_sequence WHERE name='schedule_exceptions'"))
        db.session.commit()

        logger.info("개인 일정 정리 완료")

        return jsonify({
            'success': True,
            'message': '개인 일정이 정리되었습니다'
        })

    except Exception as e:
        db = get_db()
        db.session.rollback()
        logger.error(f"개인 일정 정리 중 오류 발생: {e}")
        return jsonify({
            'error': '서버 내부 오류가 발생했습니다',
            'message': str(e)
        }), 500
