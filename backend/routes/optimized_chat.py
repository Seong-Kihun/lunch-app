"""
최적화된 채팅 API
캐싱, 쿼리 최적화, 성능 모니터링을 적용한 채팅 API입니다.
"""

from flask import Blueprint, request, jsonify
from backend.utils.cache_manager import chat_cache_manager
from backend.utils.utils_query_optimizer import query_optimizer
from backend.utils.utils_performance_monitor import performance_monitor, monitor_performance
# 인증 미들웨어는 UnifiedBlueprintManager에서 중앙 관리됨
import time

# Blueprint 생성
optimized_chat_bp = Blueprint('optimized_chat', __name__)  # url_prefix는 UnifiedBlueprintManager에서 설정

# 인증 미들웨어는 UnifiedBlueprintManager에서 중앙 관리됨

@optimized_chat_bp.route('/messages/<chat_type>/<int:chat_id>', methods=['GET'])
@monitor_performance('get_messages_optimized')
def get_messages_optimized(chat_type, chat_id):
    """최적화된 메시지 조회"""
    try:
        start_time = time.time()

        # 파라미터
        limit = int(request.args.get('limit', 50))
        offset = int(request.args.get('offset', 0))
        include_reactions = request.args.get('include_reactions', 'true').lower() == 'true'
        include_attachments = request.args.get('include_attachments', 'true').lower() == 'true'

        # 캐시 키 생성
        cache_key = f"messages:{chat_type}:{chat_id}:{limit}:{offset}:{include_reactions}:{include_attachments}"

        # 캐시에서 조회 시도
        cached_messages = chat_cache_manager.get(cache_key)
        if cached_messages:
            performance_monitor.record_api_time(
                endpoint='get_messages_optimized',
                method='GET',
                duration=time.time() - start_time,
                status_code=200
            )
            return jsonify({
                "success": True,
                "messages": cached_messages,
                "total": len(cached_messages),
                "cached": True
            }), 200

        # 데이터베이스에서 조회
        messages = query_optimizer.get_messages_optimized(
            chat_type=chat_type,
            chat_id=chat_id,
            limit=limit,
            offset=offset,
            include_reactions=include_reactions,
            include_attachments=include_attachments
        )

        # 캐시에 저장 (5분)
        chat_cache_manager.set(cache_key, messages, ttl=300)

        performance_monitor.record_api_time(
            endpoint='get_messages_optimized',
            method='GET',
            duration=time.time() - start_time,
            status_code=200
        )

        return jsonify({
            "success": True,
            "messages": messages,
            "total": len(messages),
            "cached": False
        }), 200

    except Exception as e:
        performance_monitor.record_api_time(
            endpoint='get_messages_optimized',
            method='GET',
            duration=time.time() - start_time,
            status_code=500
        )
        performance_monitor.record_error(
            error_type='API_ERROR',
            error_message=str(e),
            endpoint='get_messages_optimized'
        )
        return jsonify({"error": f"메시지 조회 중 오류가 발생했습니다: {str(e)}"}), 500

@optimized_chat_bp.route('/unread-count/<user_id>', methods=['GET'])
@monitor_performance('get_unread_count_optimized')
def get_unread_count_optimized(user_id):
    """최적화된 읽지 않은 메시지 수 조회"""
    try:
        start_time = time.time()

        chat_type = request.args.get('chat_type')
        chat_id = request.args.get('chat_id', type=int)

        # 캐시 키 생성
        cache_key = f"unread_count:{user_id}:{chat_type}:{chat_id}"

        # 캐시에서 조회 시도
        cached_count = chat_cache_manager.get_cached_unread_count(user_id, chat_type, chat_id)
        if cached_count is not None:
            performance_monitor.record_api_time(
                endpoint='get_unread_count_optimized',
                method='GET',
                duration=time.time() - start_time,
                status_code=200
            )
            return jsonify({
                "success": True,
                "unread_count": cached_count,
                "cached": True
            }), 200

        # 데이터베이스에서 조회
        unread_count = query_optimizer.get_unread_count_optimized(
            user_id=user_id,
            chat_type=chat_type,
            chat_id=chat_id
        )

        # 캐시에 저장 (5분)
        chat_cache_manager.cache_unread_count(user_id, chat_type, chat_id, unread_count, ttl=300)

        performance_monitor.record_api_time(
            endpoint='get_unread_count_optimized',
            method='GET',
            duration=time.time() - start_time,
            status_code=200
        )

        return jsonify({
            "success": True,
            "unread_count": unread_count,
            "cached": False
        }), 200

    except Exception as e:
        performance_monitor.record_api_time(
            endpoint='get_unread_count_optimized',
            method='GET',
            duration=time.time() - start_time,
            status_code=500
        )
        performance_monitor.record_error(
            error_type='API_ERROR',
            error_message=str(e),
            endpoint='get_unread_count_optimized'
        )
        return jsonify({"error": f"읽지 않은 메시지 수 조회 중 오류가 발생했습니다: {str(e)}"}), 500

@optimized_chat_bp.route('/rooms/<user_id>', methods=['GET'])
@monitor_performance('get_chat_rooms_optimized')
def get_chat_rooms_optimized(user_id):
    """최적화된 채팅방 목록 조회"""
    try:
        start_time = time.time()

        limit = int(request.args.get('limit', 20))
        offset = int(request.args.get('offset', 0))

        # 캐시 키 생성
        cache_key = f"chat_rooms:{user_id}:{limit}:{offset}"

        # 캐시에서 조회 시도
        cached_rooms = chat_cache_manager.get(cache_key)
        if cached_rooms:
            performance_monitor.record_api_time(
                endpoint='get_chat_rooms_optimized',
                method='GET',
                duration=time.time() - start_time,
                status_code=200
            )
            return jsonify({
                "success": True,
                "chat_rooms": cached_rooms,
                "total": len(cached_rooms),
                "cached": True
            }), 200

        # 데이터베이스에서 조회
        chat_rooms = query_optimizer.get_chat_rooms_optimized(
            user_id=user_id,
            limit=limit,
            offset=offset
        )

        # 캐시에 저장 (10분)
        chat_cache_manager.set(cache_key, chat_rooms, ttl=600)

        performance_monitor.record_api_time(
            endpoint='get_chat_rooms_optimized',
            method='GET',
            duration=time.time() - start_time,
            status_code=200
        )

        return jsonify({
            "success": True,
            "chat_rooms": chat_rooms,
            "total": len(chat_rooms),
            "cached": False
        }), 200

    except Exception as e:
        performance_monitor.record_api_time(
            endpoint='get_chat_rooms_optimized',
            method='GET',
            duration=time.time() - start_time,
            status_code=500
        )
        performance_monitor.record_error(
            error_type='API_ERROR',
            error_message=str(e),
            endpoint='get_chat_rooms_optimized'
        )
        return jsonify({"error": f"채팅방 목록 조회 중 오류가 발생했습니다: {str(e)}"}), 500

@optimized_chat_bp.route('/search', methods=['GET'])
@monitor_performance('search_messages_optimized')
def search_messages_optimized():
    """최적화된 메시지 검색"""
    try:
        start_time = time.time()

        query = request.args.get('q')
        user_id = request.args.get('user_id')
        chat_type = request.args.get('chat_type')
        chat_id = request.args.get('chat_id', type=int)
        limit = int(request.args.get('limit', 50))
        offset = int(request.args.get('offset', 0))

        if not query or not user_id:
            return jsonify({"error": "검색어와 사용자 ID가 필요합니다."}), 400

        # 데이터베이스에서 검색
        messages = query_optimizer.search_messages_optimized(
            query=query,
            user_id=user_id,
            chat_type=chat_type,
            chat_id=chat_id,
            limit=limit,
            offset=offset
        )

        performance_monitor.record_api_time(
            endpoint='search_messages_optimized',
            method='GET',
            duration=time.time() - start_time,
            status_code=200
        )

        return jsonify({
            "success": True,
            "messages": messages,
            "total": len(messages),
            "query": query
        }), 200

    except Exception as e:
        performance_monitor.record_api_time(
            endpoint='search_messages_optimized',
            method='GET',
            duration=time.time() - start_time,
            status_code=500
        )
        performance_monitor.record_error(
            error_type='API_ERROR',
            error_message=str(e),
            endpoint='search_messages_optimized'
        )
        return jsonify({"error": f"메시지 검색 중 오류가 발생했습니다: {str(e)}"}), 500

@optimized_chat_bp.route('/reactions/<int:message_id>', methods=['GET'])
@monitor_performance('get_message_reactions_optimized')
def get_message_reactions_optimized(message_id):
    """최적화된 메시지 반응 조회"""
    try:
        start_time = time.time()

        # 캐시 키 생성
        cache_key = f"reactions:{message_id}"

        # 캐시에서 조회 시도
        cached_reactions = chat_cache_manager.get(cache_key)
        if cached_reactions:
            performance_monitor.record_api_time(
                endpoint='get_message_reactions_optimized',
                method='GET',
                duration=time.time() - start_time,
                status_code=200
            )
            return jsonify({
                "success": True,
                "reactions": cached_reactions,
                "cached": True
            }), 200

        # 데이터베이스에서 조회
        reactions = query_optimizer.get_message_reactions_optimized(message_id)

        # 캐시에 저장 (10분)
        chat_cache_manager.set(cache_key, reactions, ttl=600)

        performance_monitor.record_api_time(
            endpoint='get_message_reactions_optimized',
            method='GET',
            duration=time.time() - start_time,
            status_code=200
        )

        return jsonify({
            "success": True,
            "reactions": reactions,
            "cached": False
        }), 200

    except Exception as e:
        performance_monitor.record_api_time(
            endpoint='get_message_reactions_optimized',
            method='GET',
            duration=time.time() - start_time,
            status_code=500
        )
        performance_monitor.record_error(
            error_type='API_ERROR',
            error_message=str(e),
            endpoint='get_message_reactions_optimized'
        )
        return jsonify({"error": f"메시지 반응 조회 중 오류가 발생했습니다: {str(e)}"}), 500

@optimized_chat_bp.route('/mark-read-bulk', methods=['POST'])
@monitor_performance('bulk_mark_messages_read')
def bulk_mark_messages_read():
    """메시지 읽음 상태 일괄 처리"""
    try:
        start_time = time.time()

        data = request.get_json()
        user_id = data.get('user_id')
        message_ids = data.get('message_ids', [])

        if not user_id or not message_ids:
            return jsonify({"error": "사용자 ID와 메시지 ID 목록이 필요합니다."}), 400

        # 일괄 업데이트
        success = query_optimizer.bulk_update_message_status(user_id, message_ids)

        if success:
            # 관련 캐시 무효화
            chat_cache_manager.invalidate_chat_cache('*', '*')

            performance_monitor.record_api_time(
                endpoint='bulk_mark_messages_read',
                method='POST',
                duration=time.time() - start_time,
                status_code=200
            )

            return jsonify({
                "success": True,
                "message": f"{len(message_ids)}개의 메시지가 읽음으로 표시되었습니다."
            }), 200
        else:
            performance_monitor.record_api_time(
                endpoint='bulk_mark_messages_read',
                method='POST',
                duration=time.time() - start_time,
                status_code=500
            )
            return jsonify({"error": "메시지 읽음 상태 업데이트에 실패했습니다."}), 500

    except Exception as e:
        performance_monitor.record_api_time(
            endpoint='bulk_mark_messages_read',
            method='POST',
            duration=time.time() - start_time,
            status_code=500
        )
        performance_monitor.record_error(
            error_type='API_ERROR',
            error_message=str(e),
            endpoint='bulk_mark_messages_read'
        )
        return jsonify({"error": f"메시지 읽음 상태 일괄 처리 중 오류가 발생했습니다: {str(e)}"}), 500

@optimized_chat_bp.route('/statistics/<chat_type>/<int:chat_id>', methods=['GET'])
@monitor_performance('get_chat_statistics')
def get_chat_statistics(chat_type, chat_id):
    """채팅 통계 조회"""
    try:
        start_time = time.time()

        days = int(request.args.get('days', 30))

        # 캐시 키 생성
        cache_key = f"statistics:{chat_type}:{chat_id}:{days}"

        # 캐시에서 조회 시도
        cached_stats = chat_cache_manager.get(cache_key)
        if cached_stats:
            performance_monitor.record_api_time(
                endpoint='get_chat_statistics',
                method='GET',
                duration=time.time() - start_time,
                status_code=200
            )
            return jsonify({
                "success": True,
                "statistics": cached_stats,
                "cached": True
            }), 200

        # 데이터베이스에서 조회
        statistics = query_optimizer.get_chat_statistics(chat_type, chat_id, days)

        # 캐시에 저장 (1시간)
        chat_cache_manager.set(cache_key, statistics, ttl=3600)

        performance_monitor.record_api_time(
            endpoint='get_chat_statistics',
            method='GET',
            duration=time.time() - start_time,
            status_code=200
        )

        return jsonify({
            "success": True,
            "statistics": statistics,
            "cached": False
        }), 200

    except Exception as e:
        performance_monitor.record_api_time(
            endpoint='get_chat_statistics',
            method='GET',
            duration=time.time() - start_time,
            status_code=500
        )
        performance_monitor.record_error(
            error_type='API_ERROR',
            error_message=str(e),
            endpoint='get_chat_statistics'
        )
        return jsonify({"error": f"채팅 통계 조회 중 오류가 발생했습니다: {str(e)}"}), 500

@optimized_chat_bp.route('/performance/stats', methods=['GET'])
def get_performance_stats():
    """성능 통계 조회"""
    try:
        hours = int(request.args.get('hours', 24))
        stats = performance_monitor.get_overall_stats(hours)

        return jsonify({
            "success": True,
            "performance_stats": stats
        }), 200

    except Exception as e:
        return jsonify({"error": f"성능 통계 조회 중 오류가 발생했습니다: {str(e)}"}), 500

@optimized_chat_bp.route('/cache/clear', methods=['POST'])
def clear_cache():
    """캐시 정리"""
    try:
        data = request.get_json() or {}
        namespace = data.get('namespace', 'chat')

        if namespace == 'all':
            success = chat_cache_manager.clear_namespace('chat')
        else:
            success = chat_cache_manager.clear_namespace(namespace)

        if success:
            return jsonify({
                "success": True,
                "message": f"{namespace} 캐시가 정리되었습니다."
            }), 200
        else:
            return jsonify({"error": "캐시 정리에 실패했습니다."}), 500

    except Exception as e:
        return jsonify({"error": f"캐시 정리 중 오류가 발생했습니다: {str(e)}"}), 500
