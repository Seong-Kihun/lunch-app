from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional
from models.schedule_models import PersonalSchedule, ScheduleException
from app import db
import logging

logger = logging.getLogger(__name__)

class ScheduleService:
    """반복 일정 계산과 관리를 담당하는 서비스 클래스"""
    
    @staticmethod
    def calculate_recurring_instances(
        master_schedule: PersonalSchedule,
        start_date: date,
        end_date: date
    ) -> List[Dict[str, Any]]:
        """
        마스터 일정을 기반으로 특정 기간의 반복 일정 인스턴스들을 계산
        
        Args:
            master_schedule: 마스터 일정 객체
            start_date: 계산 시작 날짜
            end_date: 계산 종료 날짜
            
        Returns:
            계산된 일정 인스턴스들의 리스트
        """
        if not master_schedule.is_recurring:
            # 반복 일정이 아닌 경우 단일 일정으로 처리
            if start_date <= master_schedule.start_date.date() <= end_date:
                return [ScheduleService._create_instance_dict(master_schedule, master_schedule.start_date.date())]
            return []
        
        instances = []
        current_date = master_schedule.start_date.date()
        
        # 반복 종료 날짜 확인
        max_date = end_date
        if master_schedule.recurrence_end_date:
            max_date = min(end_date, master_schedule.recurrence_end_date.date())
        
        while current_date <= max_date:
            if start_date <= current_date <= end_date:
                # 해당 기간에 포함되는 경우에만 인스턴스 생성
                instance = ScheduleService._create_instance_dict(master_schedule, current_date)
                instances.append(instance)
            
            # 다음 반복 날짜 계산
            current_date = ScheduleService._calculate_next_date(
                current_date,
                master_schedule.recurrence_type,
                master_schedule.recurrence_interval
            )
        
        return instances
    
    @staticmethod
    def _calculate_next_date(current_date: date, recurrence_type: str, interval: int) -> date:
        """다음 반복 날짜를 계산"""
        if recurrence_type == 'daily':
            return current_date + timedelta(days=interval)
        elif recurrence_type == 'weekly':
            return current_date + timedelta(weeks=interval)
        elif recurrence_type == 'monthly':
            # 월 단위 계산 (간단한 방식)
            year = current_date.year
            month = current_date.month + interval
            while month > 12:
                year += 1
                month -= 12
            return date(year, month, current_date.day)
        else:
            return current_date + timedelta(days=1)  # 기본값
    
    @staticmethod
    def _create_instance_dict(master_schedule: PersonalSchedule, instance_date: date) -> Dict[str, Any]:
        """일정 인스턴스 딕셔너리 생성"""
        return {
            'id': f"instance_{master_schedule.id}_{instance_date.isoformat()}",
            'master_schedule_id': master_schedule.id,
            'date': instance_date.isoformat(),
            'title': master_schedule.title,
            'time': master_schedule.time,
            'restaurant': master_schedule.restaurant,
            'location': master_schedule.location,
            'description': master_schedule.description,
            'employee_id': master_schedule.employee_id,
            'is_recurring': master_schedule.is_recurring,
            'recurrence_type': master_schedule.recurrence_type,
            'recurrence_interval': master_schedule.recurrence_interval,
            'created_by': master_schedule.created_by,
            'created_at': master_schedule.created_at.isoformat() if master_schedule.created_at else None,
            'type': 'personal_schedule'  # 개인일정 구분을 위한 타입 추가
        }
    
    @staticmethod
    def apply_exceptions(
        instances: List[Dict[str, Any]],
        exceptions: List[ScheduleException]
    ) -> List[Dict[str, Any]]:
        """
        일정 인스턴스들에 예외를 적용
        
        Args:
            instances: 원본 일정 인스턴스들
            exceptions: 적용할 예외들
            
        Returns:
            예외가 적용된 일정 인스턴스들
        """
        if not exceptions:
            return instances
        
        # 예외를 날짜별로 그룹화
        exception_map = {}
        for exception in exceptions:
            exception_date = exception.exception_date.date().isoformat()
            exception_map[exception_date] = exception
        
        # 각 인스턴스에 예외 적용
        result = []
        for instance in instances:
            instance_date = instance['date']
            
            if instance_date in exception_map:
                exception = exception_map[instance_date]
                
                if exception.is_deleted:
                    # 해당 날짜 삭제
                    continue
                elif exception.is_modified:
                    # 해당 날짜 수정
                    modified_instance = instance.copy()
                    if exception.new_title:
                        modified_instance['title'] = exception.new_title
                    if exception.new_time:
                        modified_instance['time'] = exception.new_time
                    if exception.new_restaurant:
                        modified_instance['restaurant'] = exception.new_restaurant
                    if exception.new_location:
                        modified_instance['location'] = exception.new_location
                    if exception.new_description:
                        modified_instance['description'] = exception.new_description
                    
                    # 예외 정보 추가
                    modified_instance['has_exception'] = True
                    modified_instance['exception_id'] = exception.id
                    
                    result.append(modified_instance)
                else:
                    # 예외가 있지만 수정/삭제가 아닌 경우 원본 유지
                    result.append(instance)
            else:
                # 예외가 없는 경우 원본 유지
                result.append(instance)
        
        return result
    
    @staticmethod
    def get_schedules_for_period(
        employee_id: str,
        start_date: date,
        end_date: date
    ) -> List[Dict[str, Any]]:
        """
        특정 기간의 모든 일정을 가져오는 메인 메서드
        (개인일정 + 파티일정 통합 조회)
        
        Args:
            employee_id: 사용자 ID
            start_date: 시작 날짜
            end_date: 종료 날짜
            
        Returns:
            해당 기간의 모든 일정 (개인일정 + 파티일정)
        """
        try:
            all_instances = []
            
            # 1. 개인일정 조회 및 처리
            master_schedules = PersonalSchedule.query.filter(
                PersonalSchedule.employee_id == employee_id,
                PersonalSchedule.start_date <= datetime.combine(end_date, datetime.min.time())
            ).all()
            
            # 개인일정 예외들 조회
            exceptions = ScheduleException.query.join(PersonalSchedule).filter(
                PersonalSchedule.employee_id == employee_id,
                ScheduleException.exception_date >= datetime.combine(start_date, datetime.min.time()),
                ScheduleException.exception_date <= datetime.combine(end_date, datetime.max.time())
            ).all()
            
            # 각 마스터 일정에 대해 반복 인스턴스 계산
            for master_schedule in master_schedules:
                instances = ScheduleService.calculate_recurring_instances(
                    master_schedule, start_date, end_date
                )
                all_instances.extend(instances)
            
            # 개인일정 예외 적용
            final_instances = ScheduleService.apply_exceptions(all_instances, exceptions)
            
            # 2. 파티일정 조회 및 처리
            from models.app_models import Party, PartyMember
            
            # 사용자가 참여한 파티들 조회
            parties = Party.query.join(PartyMember).filter(
                PartyMember.employee_id == employee_id,
                Party.party_date >= start_date.strftime('%Y-%m-%d'),
                Party.party_date <= end_date.strftime('%Y-%m-%d')
            ).all()
            
            # 파티를 일정 형식으로 변환
            for party in parties:
                party_instance = {
                    'id': f"party_{party.id}",
                    'master_schedule_id': None,
                    'date': party.party_date,
                    'title': party.title,
                    'time': party.party_time,
                    'restaurant': party.restaurant_name,
                    'location': party.meeting_location or '',
                    'description': f"파티 (최대 {party.max_members}명, 현재 {party.current_members}명)",
                    'employee_id': employee_id,
                    'is_recurring': False,
                    'recurrence_type': None,
                    'recurrence_interval': None,
                    'created_by': party.host_employee_id,
                    'created_at': party.created_at.isoformat() if party.created_at else None,
                    'type': 'party',  # 파티 구분을 위한 타입 추가
                    'party_id': party.id,
                    'current_members': party.current_members,
                    'max_members': party.max_members
                }
                final_instances.append(party_instance)
            
            # 3. 날짜별로 그룹화
            grouped_schedules = ScheduleService._group_by_date(final_instances)
            
            logger.info(f"일정 조회 완료: {employee_id}, {start_date} ~ {end_date}, 총 {len(final_instances)}개 인스턴스 (개인일정 + 파티)")
            
            return grouped_schedules
            
        except Exception as e:
            logger.error(f"일정 조회 중 오류 발생: {e}")
            return []
    
    @staticmethod
    def _group_by_date(instances: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """일정 인스턴스들을 날짜별로 그룹화"""
        grouped = {}
        
        for instance in instances:
            date_key = instance['date']
            if date_key not in grouped:
                grouped[date_key] = {
                    'date': date_key,
                    'events': []
                }
            grouped[date_key]['events'].append(instance)
        
        # 날짜순으로 정렬
        return sorted(grouped.values(), key=lambda x: x['date'])
    
    @staticmethod
    def create_master_schedule(schedule_data: Dict[str, Any]) -> PersonalSchedule:
        """마스터 일정 생성"""
        try:
            schedule = PersonalSchedule(**schedule_data)
            db.session.add(schedule)
            db.session.commit()
            
            logger.info(f"마스터 일정 생성 완료: ID {schedule.id}")
            return schedule
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"마스터 일정 생성 실패: {e}")
            raise
    
    @staticmethod
    def update_master_schedule(schedule_id: int, update_data: Dict[str, Any]) -> bool:
        """마스터 일정 수정 (모든 반복 일정 수정)"""
        try:
            schedule = PersonalSchedule.query.get(schedule_id)
            if not schedule:
                return False
            
            for key, value in update_data.items():
                if hasattr(schedule, key):
                    setattr(schedule, key, value)
            
            schedule.updated_at = datetime.utcnow()
            db.session.commit()
            
            logger.info(f"마스터 일정 수정 완료: ID {schedule_id}")
            return True
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"마스터 일정 수정 실패: {e}")
            return False
    
    @staticmethod
    def delete_master_schedule(schedule_id: int) -> bool:
        """마스터 일정 삭제 (모든 반복 일정 삭제)"""
        try:
            schedule = PersonalSchedule.query.get(schedule_id)
            if not schedule:
                return False
            
            db.session.delete(schedule)
            db.session.commit()
            
            logger.info(f"마스터 일정 삭제 완료: ID {schedule_id}")
            return True
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"마스터 일정 삭제 실패: {e}")
            return False
    
    @staticmethod
    def create_exception(
        master_schedule_id: int,
        exception_date: date,
        exception_data: Dict[str, Any]
    ) -> ScheduleException:
        """일정 예외 생성 (이 날짜만 수정/삭제)"""
        try:
            exception = ScheduleException(
                original_schedule_id=master_schedule_id,
                exception_date=datetime.combine(exception_date, datetime.min.time()),
                **exception_data
            )
            
            db.session.add(exception)
            db.session.commit()
            
            logger.info(f"일정 예외 생성 완료: 마스터 ID {master_schedule_id}, 날짜 {exception_date}")
            return exception
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"일정 예외 생성 실패: {e}")
            raise
