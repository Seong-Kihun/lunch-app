"""
알림 관리 시스템
실시간 알림 전송, 알림 설정 관리, 알림 히스토리를 제공합니다.
"""

from datetime import datetime, timedelta
from backend.app.extensions import db
from backend.models.app_models import ChatNotification, NotificationSettings, User
from flask_socketio import emit
import json

class NotificationManager:
    """알림 관리 클래스"""
    
    def __init__(self, socketio=None):
        self.socketio = socketio
        self.notification_types = {
            'new_message': {
                'title': '새 메시지',
                'icon': '💬',
                'priority': 'normal'
            },
            'mention': {
                'title': '멘션 알림',
                'icon': '👤',
                'priority': 'high'
            },
            'reaction': {
                'title': '메시지 반응',
                'icon': '👍',
                'priority': 'low'
            },
            'chat_invite': {
                'title': '채팅방 초대',
                'icon': '📨',
                'priority': 'high'
            },
            'chat_leave': {
                'title': '채팅방 퇴장',
                'icon': '👋',
                'priority': 'normal'
            },
            'system': {
                'title': '시스템 알림',
                'icon': '🔔',
                'priority': 'normal'
            }
        }
    
    def create_notification(self, user_id, notification_type, title, message, 
                          chat_type=None, chat_id=None, message_id=None, 
                          related_data=None, expires_at=None):
        """알림 생성"""
        try:
            # 알림 타입 검증
            if notification_type not in self.notification_types:
                return None, "지원하지 않는 알림 타입입니다."
            
            # 사용자 알림 설정 확인
            settings = NotificationSettings.query.filter_by(user_id=user_id).first()
            if settings and not self._should_send_notification(settings, notification_type):
                return None, "사용자가 해당 알림을 비활성화했습니다."
            
            # 알림 생성
            notification = ChatNotification(
                user_id=user_id,
                chat_type=chat_type,
                chat_id=chat_id,
                message_id=message_id,
                notification_type=notification_type,
                title=title,
                message=message,
                is_read=False
            )
            
            if expires_at:
                notification.expires_at = expires_at
            
            db.session.add(notification)
            db.session.commit()
            
            # 실시간 알림 전송
            self._send_realtime_notification(notification)
            
            return notification, "알림이 성공적으로 생성되었습니다."
            
        except Exception as e:
            db.session.rollback()
            return None, f"알림 생성 중 오류가 발생했습니다: {str(e)}"
    
    def _should_send_notification(self, settings, notification_type):
        """알림 전송 여부 확인"""
        if notification_type == 'new_message':
            return settings.message_notifications
        elif notification_type == 'mention':
            return settings.mention_notifications
        elif notification_type in ['reaction', 'chat_invite', 'chat_leave', 'system']:
            return settings.chat_notifications
        return True
    
    def _send_realtime_notification(self, notification):
        """실시간 알림 전송"""
        if not self.socketio:
            return
        
        try:
            # 알림 데이터 준비
            notification_data = {
                'id': notification.id,
                'user_id': notification.user_id,
                'chat_type': notification.chat_type,
                'chat_id': notification.chat_id,
                'message_id': notification.message_id,
                'notification_type': notification.notification_type,
                'title': notification.title,
                'message': notification.message,
                'is_read': notification.is_read,
                'created_at': notification.created_at.isoformat(),
                'icon': self.notification_types.get(notification.notification_type, {}).get('icon', '🔔'),
                'priority': self.notification_types.get(notification.notification_type, {}).get('priority', 'normal')
            }
            
            # 사용자에게 직접 전송
            emit('new_notification', notification_data, room=f"user_{notification.user_id}")
            
            # 긴급 알림인 경우 추가 처리
            if self.notification_types.get(notification.notification_type, {}).get('priority') == 'high':
                emit('urgent_notification', notification_data, room=f"user_{notification.user_id}")
            
        except Exception as e:
            print(f"실시간 알림 전송 실패: {e}")
    
    def mark_notification_read(self, notification_id, user_id):
        """알림 읽음 처리"""
        try:
            notification = ChatNotification.query.filter_by(
                id=notification_id,
                user_id=user_id
            ).first()
            
            if not notification:
                return False, "알림을 찾을 수 없습니다."
            
            notification.is_read = True
            notification.read_at = datetime.utcnow()
            db.session.commit()
            
            return True, "알림이 읽음으로 표시되었습니다."
            
        except Exception as e:
            db.session.rollback()
            return False, f"알림 읽음 처리 중 오류가 발생했습니다: {str(e)}"
    
    def mark_all_notifications_read(self, user_id, chat_type=None, chat_id=None):
        """모든 알림 읽음 처리"""
        try:
            query = ChatNotification.query.filter_by(
                user_id=user_id,
                is_read=False
            )
            
            if chat_type:
                query = query.filter_by(chat_type=chat_type)
            if chat_id:
                query = query.filter_by(chat_id=chat_id)
            
            notifications = query.all()
            for notification in notifications:
                notification.is_read = True
                notification.read_at = datetime.utcnow()
            
            db.session.commit()
            
            return True, f"{len(notifications)}개의 알림이 읽음으로 표시되었습니다."
            
        except Exception as e:
            db.session.rollback()
            return False, f"알림 읽음 처리 중 오류가 발생했습니다: {str(e)}"
    
    def get_user_notifications(self, user_id, limit=50, offset=0, unread_only=False):
        """사용자 알림 목록 조회"""
        try:
            query = ChatNotification.query.filter_by(user_id=user_id)
            
            if unread_only:
                query = query.filter_by(is_read=False)
            
            # 만료된 알림 제외
            query = query.filter(
                (ChatNotification.expires_at.is_(None)) | 
                (ChatNotification.expires_at > datetime.utcnow())
            )
            
            notifications = query.order_by(
                ChatNotification.created_at.desc()
            ).offset(offset).limit(limit).all()
            
            notification_list = []
            for notification in notifications:
                notification_data = {
                    'id': notification.id,
                    'chat_type': notification.chat_type,
                    'chat_id': notification.chat_id,
                    'message_id': notification.message_id,
                    'notification_type': notification.notification_type,
                    'title': notification.title,
                    'message': notification.message,
                    'is_read': notification.is_read,
                    'read_at': notification.read_at.isoformat() if notification.read_at else None,
                    'created_at': notification.created_at.isoformat(),
                    'expires_at': notification.expires_at.isoformat() if notification.expires_at else None,
                    'icon': self.notification_types.get(notification.notification_type, {}).get('icon', '🔔'),
                    'priority': self.notification_types.get(notification.notification_type, {}).get('priority', 'normal')
                }
                notification_list.append(notification_data)
            
            return notification_list, "알림 목록을 성공적으로 조회했습니다."
            
        except Exception as e:
            return [], f"알림 목록 조회 중 오류가 발생했습니다: {str(e)}"
    
    def get_unread_count(self, user_id, chat_type=None, chat_id=None):
        """읽지 않은 알림 수 조회"""
        try:
            query = ChatNotification.query.filter_by(
                user_id=user_id,
                is_read=False
            )
            
            if chat_type:
                query = query.filter_by(chat_type=chat_type)
            if chat_id:
                query = query.filter_by(chat_id=chat_id)
            
            # 만료된 알림 제외
            query = query.filter(
                (ChatNotification.expires_at.is_(None)) | 
                (ChatNotification.expires_at > datetime.utcnow())
            )
            
            count = query.count()
            return count, "읽지 않은 알림 수를 성공적으로 조회했습니다."
            
        except Exception as e:
            return 0, f"읽지 않은 알림 수 조회 중 오류가 발생했습니다: {str(e)}"
    
    def update_notification_settings(self, user_id, settings_data):
        """알림 설정 업데이트"""
        try:
            settings = NotificationSettings.query.filter_by(user_id=user_id).first()
            
            if not settings:
                settings = NotificationSettings(user_id=user_id)
                db.session.add(settings)
            
            # 설정 업데이트
            if 'chat_notifications' in settings_data:
                settings.chat_notifications = settings_data['chat_notifications']
            if 'message_notifications' in settings_data:
                settings.message_notifications = settings_data['message_notifications']
            if 'mention_notifications' in settings_data:
                settings.mention_notifications = settings_data['mention_notifications']
            if 'sound_enabled' in settings_data:
                settings.sound_enabled = settings_data['sound_enabled']
            if 'vibration_enabled' in settings_data:
                settings.vibration_enabled = settings_data['vibration_enabled']
            if 'quiet_hours_start' in settings_data:
                settings.quiet_hours_start = settings_data['quiet_hours_start']
            if 'quiet_hours_end' in settings_data:
                settings.quiet_hours_end = settings_data['quiet_hours_end']
            
            settings.updated_at = datetime.utcnow()
            db.session.commit()
            
            return True, "알림 설정이 성공적으로 업데이트되었습니다."
            
        except Exception as e:
            db.session.rollback()
            return False, f"알림 설정 업데이트 중 오류가 발생했습니다: {str(e)}"
    
    def get_notification_settings(self, user_id):
        """알림 설정 조회"""
        try:
            settings = NotificationSettings.query.filter_by(user_id=user_id).first()
            
            if not settings:
                # 기본 설정 생성
                settings = NotificationSettings(user_id=user_id)
                db.session.add(settings)
                db.session.commit()
            
            settings_data = {
                'user_id': settings.user_id,
                'chat_notifications': settings.chat_notifications,
                'message_notifications': settings.message_notifications,
                'mention_notifications': settings.mention_notifications,
                'sound_enabled': settings.sound_enabled,
                'vibration_enabled': settings.vibration_enabled,
                'quiet_hours_start': settings.quiet_hours_start.isoformat() if settings.quiet_hours_start else None,
                'quiet_hours_end': settings.quiet_hours_end.isoformat() if settings.quiet_hours_end else None,
                'created_at': settings.created_at.isoformat(),
                'updated_at': settings.updated_at.isoformat()
            }
            
            return settings_data, "알림 설정을 성공적으로 조회했습니다."
            
        except Exception as e:
            return None, f"알림 설정 조회 중 오류가 발생했습니다: {str(e)}"
    
    def cleanup_expired_notifications(self, days=30):
        """만료된 알림 정리"""
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            
            # 만료된 알림 삭제
            expired_notifications = ChatNotification.query.filter(
                ChatNotification.expires_at.isnot(None),
                ChatNotification.expires_at < datetime.utcnow()
            ).all()
            
            for notification in expired_notifications:
                db.session.delete(notification)
            
            # 오래된 읽은 알림 삭제
            old_read_notifications = ChatNotification.query.filter(
                ChatNotification.is_read == True,
                ChatNotification.read_at < cutoff_date
            ).all()
            
            for notification in old_read_notifications:
                db.session.delete(notification)
            
            db.session.commit()
            
            total_deleted = len(expired_notifications) + len(old_read_notifications)
            return True, f"{total_deleted}개의 만료된 알림이 정리되었습니다."
            
        except Exception as e:
            db.session.rollback()
            return False, f"알림 정리 중 오류가 발생했습니다: {str(e)}"
    
    def send_bulk_notification(self, user_ids, notification_type, title, message, **kwargs):
        """대량 알림 전송"""
        try:
            success_count = 0
            failed_count = 0
            
            for user_id in user_ids:
                notification, result_message = self.create_notification(
                    user_id=user_id,
                    notification_type=notification_type,
                    title=title,
                    message=message,
                    **kwargs
                )
                
                if notification:
                    success_count += 1
                else:
                    failed_count += 1
            
            return True, f"대량 알림 전송 완료: 성공 {success_count}개, 실패 {failed_count}개"
            
        except Exception as e:
            return False, f"대량 알림 전송 중 오류가 발생했습니다: {str(e)}"

# 전역 알림 매니저 인스턴스
notification_manager = NotificationManager()
