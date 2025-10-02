"""
알림 관리 API
실시간 알림 전송, 알림 설정 관리, 알림 히스토리를 제공합니다.
"""

from flask import Blueprint, request, jsonify
from backend.utils.notification_manager import notification_manager
# 인증 미들웨어는 UnifiedBlueprintManager에서 중앙 관리됨
from datetime import datetime

# Blueprint 생성
notifications_bp = Blueprint('notifications', __name__)  # url_prefix는 UnifiedBlueprintManager에서 설정

# 인증 미들웨어는 UnifiedBlueprintManager에서 중앙 관리됨

@notifications_bp.route('/send', methods=['POST'])
def send_notification():
    """알림 전송"""
    try:
        data = request.get_json()

        required_fields = ['user_id', 'notification_type', 'title', 'message']
        for field in required_fields:
            if not data.get(field):
                return jsonify({"error": f"{field}는 필수입니다."}), 400

        # 알림 생성
        notification, message = notification_manager.create_notification(
            user_id=data['user_id'],
            notification_type=data['notification_type'],
            title=data['title'],
            message=data['message'],
            chat_type=data.get('chat_type'),
            chat_id=data.get('chat_id'),
            message_id=data.get('message_id'),
            related_data=data.get('related_data'),
            expires_at=datetime.fromisoformat(data['expires_at']) if data.get('expires_at') else None
        )

        if not notification:
            return jsonify({"error": message}), 400

        return jsonify({
            "success": True,
            "message": message,
            "notification_id": notification.id
        }), 200

    except Exception as e:
        return jsonify({"error": f"알림 전송 중 오류가 발생했습니다: {str(e)}"}), 500

@notifications_bp.route('/send/bulk', methods=['POST'])
def send_bulk_notification():
    """대량 알림 전송"""
    try:
        data = request.get_json()

        required_fields = ['user_ids', 'notification_type', 'title', 'message']
        for field in required_fields:
            if not data.get(field):
                return jsonify({"error": f"{field}는 필수입니다."}), 400

        # 대량 알림 전송
        success, message = notification_manager.send_bulk_notification(
            user_ids=data['user_ids'],
            notification_type=data['notification_type'],
            title=data['title'],
            message=data['message'],
            chat_type=data.get('chat_type'),
            chat_id=data.get('chat_id'),
            message_id=data.get('message_id'),
            related_data=data.get('related_data')
        )

        if not success:
            return jsonify({"error": message}), 400

        return jsonify({
            "success": True,
            "message": message
        }), 200

    except Exception as e:
        return jsonify({"error": f"대량 알림 전송 중 오류가 발생했습니다: {str(e)}"}), 500

@notifications_bp.route('/<int:notification_id>/read', methods=['POST'])
def mark_notification_read(notification_id):
    """알림 읽음 처리"""
    try:
        data = request.get_json()
        user_id = data.get('user_id')

        if not user_id:
            return jsonify({"error": "사용자 ID가 필요합니다."}), 400

        success, message = notification_manager.mark_notification_read(notification_id, user_id)

        if not success:
            return jsonify({"error": message}), 400

        return jsonify({
            "success": True,
            "message": message
        }), 200

    except Exception as e:
        return jsonify({"error": f"알림 읽음 처리 중 오류가 발생했습니다: {str(e)}"}), 500

@notifications_bp.route('/read/all', methods=['POST'])
def mark_all_notifications_read():
    """모든 알림 읽음 처리"""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        chat_type = data.get('chat_type')
        chat_id = data.get('chat_id')

        if not user_id:
            return jsonify({"error": "사용자 ID가 필요합니다."}), 400

        success, message = notification_manager.mark_all_notifications_read(
            user_id, chat_type, chat_id
        )

        if not success:
            return jsonify({"error": message}), 400

        return jsonify({
            "success": True,
            "message": message
        }), 200

    except Exception as e:
        return jsonify({"error": f"알림 읽음 처리 중 오류가 발생했습니다: {str(e)}"}), 500

@notifications_bp.route('/user/<user_id>', methods=['GET'])
def get_user_notifications(user_id):
    """사용자 알림 목록 조회"""
    try:
        limit = int(request.args.get('limit', 50))
        offset = int(request.args.get('offset', 0))
        unread_only = request.args.get('unread_only', 'false').lower() == 'true'

        notifications, message = notification_manager.get_user_notifications(
            user_id, limit, offset, unread_only
        )

        return jsonify({
            "success": True,
            "notifications": notifications,
            "total": len(notifications),
            "message": message
        }), 200

    except Exception as e:
        return jsonify({"error": f"알림 목록 조회 중 오류가 발생했습니다: {str(e)}"}), 500

@notifications_bp.route('/user/<user_id>/unread-count', methods=['GET'])
def get_unread_count(user_id):
    """읽지 않은 알림 수 조회"""
    try:
        chat_type = request.args.get('chat_type')
        chat_id = request.args.get('chat_id')

        count, message = notification_manager.get_unread_count(user_id, chat_type, chat_id)

        return jsonify({
            "success": True,
            "unread_count": count,
            "message": message
        }), 200

    except Exception as e:
        return jsonify({"error": f"읽지 않은 알림 수 조회 중 오류가 발생했습니다: {str(e)}"}), 500

@notifications_bp.route('/settings/<user_id>', methods=['GET'])
def get_notification_settings(user_id):
    """알림 설정 조회"""
    try:
        settings, message = notification_manager.get_notification_settings(user_id)

        if not settings:
            return jsonify({"error": message}), 400

        return jsonify({
            "success": True,
            "settings": settings,
            "message": message
        }), 200

    except Exception as e:
        return jsonify({"error": f"알림 설정 조회 중 오류가 발생했습니다: {str(e)}"}), 500

@notifications_bp.route('/settings/<user_id>', methods=['PUT'])
def update_notification_settings(user_id):
    """알림 설정 업데이트"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "설정 데이터가 필요합니다."}), 400

        success, message = notification_manager.update_notification_settings(user_id, data)

        if not success:
            return jsonify({"error": message}), 400

        return jsonify({
            "success": True,
            "message": message
        }), 200

    except Exception as e:
        return jsonify({"error": f"알림 설정 업데이트 중 오류가 발생했습니다: {str(e)}"}), 500

@notifications_bp.route('/cleanup', methods=['POST'])
def cleanup_notifications():
    """만료된 알림 정리"""
    try:
        data = request.get_json() if request.is_json else {}
        days = data.get('days', 30)

        success, message = notification_manager.cleanup_expired_notifications(days)

        if not success:
            return jsonify({"error": message}), 400

        return jsonify({
            "success": True,
            "message": message
        }), 200

    except Exception as e:
        return jsonify({"error": f"알림 정리 중 오류가 발생했습니다: {str(e)}"}), 500

@notifications_bp.route('/types', methods=['GET'])
def get_notification_types():
    """알림 타입 목록 조회"""
    try:
        types = notification_manager.notification_types

        return jsonify({
            "success": True,
            "notification_types": types
        }), 200

    except Exception as e:
        return jsonify({"error": f"알림 타입 조회 중 오류가 발생했습니다: {str(e)}"}), 500

@notifications_bp.route('/test', methods=['POST'])
def test_notification():
    """알림 테스트"""
    try:
        data = request.get_json()
        user_id = data.get('user_id', '1')
        notification_type = data.get('notification_type', 'system')

        # 테스트 알림 생성
        notification, message = notification_manager.create_notification(
            user_id=user_id,
            notification_type=notification_type,
            title="테스트 알림",
            message="이것은 테스트 알림입니다.",
            chat_type='test',
            chat_id=1
        )

        if not notification:
            return jsonify({"error": message}), 400

        return jsonify({
            "success": True,
            "message": "테스트 알림이 전송되었습니다.",
            "notification_id": notification.id
        }), 200

    except Exception as e:
        return jsonify({"error": f"테스트 알림 전송 중 오류가 발생했습니다: {str(e)}"}), 500
