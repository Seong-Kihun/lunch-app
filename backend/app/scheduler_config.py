"""
스케줄러 설정 - Celery Beat로 통일
"""

def setup_scheduler(app):
    """Celery Beat 스케줄러 설정"""
    try:
        from backend.app.celery_config import create_celery, setup_periodic_tasks
        
        # Celery 앱 생성
        celery_app = create_celery(app)
        
        if celery_app:
            # 주기적 작업 설정
            setup_periodic_tasks(celery_app)
            
            # Celery Beat 스케줄러 설정
            celery_app.conf.beat_schedule = {
                'daily-recommendations': {
                    'task': 'celery_config.generate_daily_recommendations_task',
                    'schedule': 60.0 * 60 * 24,  # 24시간마다
                },
                'daily-recommendation-cache': {
                    'task': 'celery_config.generate_recommendation_cache_task',
                    'schedule': 60.0 * 60 * 24,  # 24시간마다
                },
                'weekly-data-cleanup': {
                    'task': 'celery_config.cleanup_expired_data_task',
                    'schedule': 60.0 * 60 * 24 * 7,  # 7일마다
                },
                'daily-lunch-recommendations': {
                    'task': 'celery_config.prepare_lunch_recommendations_task',
                    'schedule': 60.0 * 60 * 24,  # 24시간마다
                },
                'hourly-stats-update': {
                    'task': 'celery_config.update_realtime_stats_task',
                    'schedule': 60.0 * 60,  # 1시간마다
                },
                'daily-points-settlement': {
                    'task': 'celery_config.daily_points_settlement_task',
                    'schedule': 60.0 * 60 * 24,  # 24시간마다
                },
            }
            
            print("[SUCCESS] Celery Beat 스케줄러가 설정되었습니다.")
            print("   - 일일 추천 생성")
            print("   - 추천 캐시 생성")
            print("   - 데이터 정리")
            print("   - 점심 추천 준비")
            print("   - 실시간 통계 업데이트")
            print("   - 포인트 정산")
            
            return celery_app
        else:
            print("[WARNING] Celery 앱 생성 실패")
            return None
            
    except ImportError as e:
        print(f"[WARNING] Celery Beat 설정 실패: {e}")
        print("   스케줄러는 비활성화됩니다.")
        return None
    except Exception as e:
        print(f"[ERROR] 스케줄러 설정 중 오류: {e}")
        return None
