from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class ScheduleService:
    """반복 일정 계산과 관리를 담당하는 서비스 클래스"""
    
    def __init__(self, db_session):
        self.db = db_session
    
    @staticmethod
    def calculate_recurring_instances(
        master_schedule,
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
    def _create_instance_dict(master_schedule, instance_date: date) -> Dict[str, Any]:
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
            'created_at': master_schedule.created_at.isoformat() if master_schedule.created_at else None
        }
    
    @staticmethod
    def apply_exceptions(
        instances: List[Dict[str, Any]],
        exceptions
    ) -> List[Dict[str, Any]]:
        """
        일정 인스턴스들에 예외를 적용
        
        Args:
            instances: 일정 인스턴스 리스트
            exceptions: 예외 리스트
            
        Returns:
            예외가 적용된 일정 인스턴스 리스트
        """
        if not exceptions:
            return instances
        
        # 예외를 날짜별로 그룹화
        exception_map = {}
        for exception in exceptions:
            exception_date = exception.exception_date.date()
            exception_map[exception_date] = exception
        
        # 각 인스턴스에 예외 적용
        result = []
        for instance in instances:
            instance_date = datetime.strptime(instance['date'], '%Y-%m-%d').date()
            
            if instance_date in exception_map:
                exception = exception_map[instance_date]
                
                if exception.is_deleted:
                    # 삭제된 경우 건너뛰기
                    continue
                elif exception.is_modified:
                    # 수정된 경우 새로운 정보로 업데이트
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
                    result.append(modified_instance)
                else:
                    # 예외가 있지만 수정되지 않은 경우 원본 유지
                    result.append(instance)
            else:
                # 예외가 없는 경우 원본 유지
                result.append(instance)
        
        return result
    
    def get_schedules_for_period(
        self,
        employee_id: str,
        start_date: date,
        end_date: date
    ) -> List[Dict[str, Any]]:
        """
        특정 기간의 모든 일정을 가져오는 메서드
        
        Args:
            employee_id: 직원 ID
            start_date: 시작 날짜
            end_date: 종료 날짜
            
        Returns:
            일정 인스턴스들의 리스트
        """
        try:
            # 마스터 일정 조회
            master_schedules = self._get_master_schedules(employee_id, start_date, end_date)
            
            all_instances = []
            
            for master_schedule in master_schedules:
                # 반복 일정 인스턴스 계산
                instances = ScheduleService.calculate_recurring_instances(
                    master_schedule, start_date, end_date
                )
                all_instances.extend(instances)
            
            # 예외 조회 및 적용
            exceptions = self._get_schedule_exceptions(
                [s.id for s in master_schedules], start_date, end_date
            )
            
            # 예외 적용
            final_instances = ScheduleService.apply_exceptions(all_instances, exceptions)
            
            # 날짜순으로 정렬
            final_instances.sort(key=lambda x: x['date'])
            
            logger.info(f"기간 {start_date} ~ {end_date} 동안 {len(final_instances)}개의 일정 인스턴스 생성")
            
            return final_instances
            
        except Exception as e:
            logger.error(f"일정 조회 중 오류 발생: {e}")
            raise
    
    def _get_master_schedules(self, employee_id: str, start_date: date, end_date: date):
        """마스터 일정 조회"""
        # 이 메서드는 실제 데이터베이스 조회 로직을 구현해야 함
        # 현재는 더미 데이터 반환
        return []
    
    def _get_schedule_exceptions(self, master_schedule_ids: List[int], start_date: date, end_date: date):
        """일정 예외 조회"""
        # 이 메서드는 실제 데이터베이스 조회 로직을 구현해야 함
        # 현재는 더미 데이터 반환
        return []
    
    @staticmethod
    def create_master_schedule(schedule_data: Dict[str, Any]):
        """마스터 일정 생성"""
        # 이 메서드는 실제 데이터베이스 생성 로직을 구현해야 함
        pass
    
    @staticmethod
    def update_master_schedule(schedule_id: int, update_data: Dict[str, Any]) -> bool:
        """마스터 일정 수정"""
        # 이 메서드는 실제 데이터베이스 수정 로직을 구현해야 함
        return True
    
    @staticmethod
    def delete_master_schedule(schedule_id: int) -> bool:
        """마스터 일정 삭제"""
        # 이 메서드는 실제 데이터베이스 삭제 로직을 구현해야 함
        return True
    
    def create_exception(
        self,
        master_schedule_id: int,
        exception_date: date,
        exception_data: Dict[str, Any]
    ):
        """일정 예외 생성"""
        try:
            # 예외 객체 생성 (실제 모델 클래스는 별도로 정의 필요)
            exception = type('ScheduleException', (), {
                'original_schedule_id': master_schedule_id,
                'exception_date': datetime.combine(exception_date, datetime.min.time()),
                **exception_data
            })()
            
            # 데이터베이스에 저장 (실제 구현 필요)
            # self.db.session.add(exception)
            # self.db.session.commit()
            
            logger.info(f"일정 예외 생성 완료: 마스터 ID {master_schedule_id}, 날짜 {exception_date}")
            return exception
            
        except Exception as e:
            # self.db.session.rollback()
            logger.error(f"일정 예외 생성 실패: {e}")
            raise
