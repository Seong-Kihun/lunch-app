"""
Celery 설정 및 백그라운드 작업 관리
"""
import os
from celery import Celery
from celery.schedules import crontab

# Celery 앱 생성
def create_celery(app):
    """Flask 앱과 연동되는 Celery 인스턴스 생성"""
    
    # Redis 연결 설정
    redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
    
    celery = Celery(
        'lunch_app',
        broker=redis_url,
        backend=redis_url,
        include=['celery_tasks']
    )
    
    # Celery 설정
    celery.conf.update(
        # 작업 결과 저장
        result_expires=3600,  # 1시간
        
        # 작업 타임아웃
        task_soft_time_limit=300,  # 5분
        task_time_limit=600,       # 10분
        
        # 워커 설정
        worker_prefetch_multiplier=1,
        worker_max_tasks_per_child=1000,
        
        # 태스크 설정
        task_always_eager=False,  # 개발 환경에서는 True로 설정 가능
        
        # 로깅
        worker_log_format='[%(asctime)s: %(levelname)s/%(processName)s] %(message)s',
        worker_task_log_format='[%(asctime)s: %(levelname)s/%(processName)s] [%(task_name)s(%(task_id)s)] %(message)s'
    )
    
    # Flask 컨텍스트 통합
    class FlaskTask(celery.Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)
    
    celery.Task = FlaskTask
    
    return celery

# 주기적 작업 스케줄링
def setup_periodic_tasks(celery_app):
    """정기적으로 실행될 작업들을 스케줄링"""
    
    @celery_app.on_after_configure.connect
    def setup_periodic_tasks(sender, **kwargs):
        # 매일 자정에 일일 추천 생성 (기존 APScheduler 작업 대체)
        sender.add_periodic_task(
            crontab(hour=0, minute=0),
            generate_daily_recommendations_task.s(),
            name='daily-recommendations'
        )
        
        # 매일 새벽 2시에 추천 캐시 생성
        sender.add_periodic_task(
            crontab(hour=2, minute=0),
            generate_recommendation_cache_task.s(),
            name='daily-recommendation-cache'
        )
        
        # 매주 일요일 새벽 3시에 만료 데이터 정리
        sender.add_periodic_task(
            crontab(day_of_week=0, hour=3, minute=0),
            cleanup_expired_data_task.s(),
            name='weekly-data-cleanup'
        )
        
        # 매일 오전 9시에 점심 추천 알림 준비
        sender.add_periodic_task(
            crontab(hour=9, minute=0),
            prepare_lunch_recommendations_task.s(),
            name='daily-lunch-recommendations'
        )
        
        # 매시간 정각에 실시간 통계 업데이트
        sender.add_periodic_task(
            crontab(minute=0),
            update_realtime_stats_task.s(),
            name='hourly-stats-update'
        )
        
        # 매일 오후 6시에 포인트 정산
        sender.add_periodic_task(
            crontab(hour=18, minute=0),
            daily_points_settlement_task.s(),
            name='daily-points-settlement'
        )

# 백그라운드 작업 태스크들
@celery_app.task
def generate_daily_recommendations_task():
    """매일 자정에 일일 추천 생성 (APScheduler 대체)"""
    try:
        from app import generate_daily_recommendations
        generate_daily_recommendations()
        print("✅ 일일 추천 생성 완료")
    except Exception as e:
        print(f"❌ 일일 추천 생성 실패: {e}")

@celery_app.task
def generate_recommendation_cache_task():
    """추천 그룹 캐시 생성을 백그라운드에서 처리"""
    try:
        from app import generate_recommendation_cache
        result = generate_recommendation_cache()
        return f"추천 캐시 생성 완료: {result}"
    except Exception as e:
        return f"추천 캐시 생성 실패: {e}"

@celery_app.task
def cleanup_expired_data_task():
    """만료된 데이터 정리"""
    try:
        from app import cleanup_expired_data
        result = cleanup_expired_data()
        return f"데이터 정리 완료: {result}"
    except Exception as e:
        return f"데이터 정리 실패: {e}"

@celery_app.task
def prepare_lunch_recommendations_task():
    """점심 추천 알림 준비"""
    try:
        from app import prepare_lunch_recommendations
        result = prepare_lunch_recommendations()
        return f"점심 추천 준비 완료: {result}"
    except Exception as e:
        return f"점심 추천 준비 실패: {e}"

@celery_app.task
def update_realtime_stats_task():
    """실시간 통계 업데이트"""
    try:
        from app import update_realtime_stats
        result = update_realtime_stats()
        return f"통계 업데이트 완료: {result}"
    except Exception as e:
        return f"통계 업데이트 실패: {e}"

@celery_app.task
def daily_points_settlement_task():
    """일일 포인트 정산"""
    try:
        from app import daily_points_settlement
        result = daily_points_settlement()
        return f"포인트 정산 완료: {result}"
    except Exception as e:
        return f"포인트 정산 실패: {e}"

# 개발 환경용 즉시 실행 태스크
def test_celery_connection():
    """Celery 연결 테스트"""
    return "Celery 연결 성공! 🎉"

def simple_background_task(message):
    """간단한 백그라운드 작업 테스트"""
    import time
    time.sleep(2)  # 2초 대기 (실제 작업 시뮬레이션)
    return f"백그라운드 작업 완료: {message}"
