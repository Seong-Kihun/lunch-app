"""
알림 관련 유틸리티 함수들
"""
from datetime import datetime, timedelta
from extensions import db
from models.app_models import Notification


def create_notification(
    user_id,
    type,
    title,
    message,
    related_id=None,
    related_type=None,
    sender_id=None,
    action_url=None,
    expires_at=None,
):
    """알림 생성"""
    try:
        notification = Notification(
            user_id=user_id,
            type=type,
            title=title,
            message=message,
            related_id=related_id,
            related_type=related_type,
            sender_id=sender_id,
            action_url=action_url,
            expires_at=expires_at,
            created_at=datetime.now(),
            is_read=False,
        )
        
        db.session.add(notification)
        db.session.commit()
        
        print(f"DEBUG: 알림 생성 완료 - 사용자: {user_id}, 제목: {title}")
        return notification
        
    except Exception as e:
        db.session.rollback()
        print(f"ERROR: 알림 생성 실패 - 사용자: {user_id}, 오류: {e}")
        return None


def get_notification_icon(notification_type):
    """알림 타입에 따른 아이콘 반환"""
    icons = {
        "party_invite": "👥",
        "party_update": "📅",
        "friend_request": "🤝",
        "lunch_reminder": "🍽️",
        "system": "⚙️",
        "achievement": "🏆",
        "message": "💬",
        "review": "⭐",
        "restaurant": "🍴",
        "points": "💎",
        "badge": "🏅",
        "default": "🔔"
    }
    return icons.get(notification_type, icons["default"])


def get_notification_color(notification_type):
    """알림 타입에 따른 색상 반환"""
    colors = {
        "party_invite": "#4CAF50",      # 초록색
        "party_update": "#2196F3",      # 파란색
        "friend_request": "#FF9800",    # 주황색
        "lunch_reminder": "#9C27B0",    # 보라색
        "system": "#607D8B",            # 회색
        "achievement": "#FFD700",       # 금색
        "message": "#E91E63",           # 분홍색
        "review": "#FFC107",            # 노란색
        "restaurant": "#795548",        # 갈색
        "points": "#3F51B5",            # 남색
        "badge": "#FF5722",             # 빨간색
        "default": "#9E9E9E"            # 기본 회색
    }
    return colors.get(notification_type, colors["default"])


def format_notification_time(created_at):
    """알림 시간을 사용자 친화적 형태로 포맷팅"""
    if not created_at:
        return "알 수 없음"
    
    now = datetime.now()
    diff = now - created_at
    
    if diff.total_seconds() < 60:
        return "방금 전"
    elif diff.total_seconds() < 3600:  # 1시간 미만
        minutes = int(diff.total_seconds() / 60)
        return f"{minutes}분 전"
    elif diff.total_seconds() < 86400:  # 1일 미만
        hours = int(diff.total_seconds() / 3600)
        return f"{hours}시간 전"
    elif diff.days < 7:  # 1주일 미만
        return f"{diff.days}일 전"
    else:
        return created_at.strftime("%Y-%m-%d")


def get_notification_priority(notification_type):
    """알림 타입에 따른 우선순위 반환 (1-5, 높을수록 중요)"""
    priorities = {
        "system": 5,                    # 시스템 알림 (가장 중요)
        "party_invite": 4,              # 파티 초대
        "friend_request": 4,            # 친구 요청
        "party_update": 3,              # 파티 업데이트
        "lunch_reminder": 3,            # 점심 알림
        "achievement": 2,               # 성취
        "badge": 2,                     # 배지
        "points": 2,                    # 포인트
        "message": 2,                   # 메시지
        "review": 1,                    # 리뷰
        "restaurant": 1,                # 식당
        "default": 1                    # 기본
    }
    return priorities.get(notification_type, priorities["default"])


def cleanup_expired_notifications():
    """만료된 알림 정리"""
    try:
        now = datetime.now()
        
        # 만료된 알림 삭제
        expired_count = Notification.query.filter(
            Notification.expires_at < now
        ).count()
        
        Notification.query.filter(
            Notification.expires_at < now
        ).delete()
        
        # 30일 이상 된 읽은 알림 삭제
        old_date = now - timedelta(days=30)
        old_read_count = Notification.query.filter(
            Notification.is_read == True,
            Notification.created_at < old_date
        ).count()
        
        Notification.query.filter(
            Notification.is_read == True,
            Notification.created_at < old_date
        ).delete()
        
        db.session.commit()
        
        total_cleaned = expired_count + old_read_count
        print(f"SUCCESS: 알림 정리 완료 - 만료: {expired_count}개, 오래된 읽은 알림: {old_read_count}개")
        
        return {
            "expired_notifications": expired_count,
            "old_read_notifications": old_read_count,
            "total_cleaned": total_cleaned
        }
        
    except Exception as e:
        db.session.rollback()
        print(f"ERROR: 알림 정리 실패: {e}")
        return {"error": str(e)}


def get_unread_notification_count(user_id):
    """사용자의 읽지 않은 알림 수 조회"""
    try:
        count = Notification.query.filter_by(
            user_id=user_id,
            is_read=False
        ).count()
        return count
        
    except Exception as e:
        print(f"ERROR: 읽지 않은 알림 수 조회 실패 - 사용자: {user_id}, 오류: {e}")
        return 0


def mark_notifications_as_read(user_id, notification_ids=None):
    """알림을 읽음으로 표시"""
    try:
        query = Notification.query.filter_by(user_id=user_id, is_read=False)
        
        if notification_ids:
            query = query.filter(Notification.id.in_(notification_ids))
        
        updated_count = query.update({"is_read": True})
        db.session.commit()
        
        print(f"SUCCESS: 알림 읽음 처리 완료 - 사용자: {user_id}, 처리된 알림: {updated_count}개")
        return updated_count
        
    except Exception as e:
        db.session.rollback()
        print(f"ERROR: 알림 읽음 처리 실패 - 사용자: {user_id}, 오류: {e}")
        return 0
