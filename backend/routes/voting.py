from flask import Blueprint, jsonify, request
from backend.app.extensions import db
from backend.models.app_models import VotingSession, VotingOption, Vote, ChatRoom, ChatParticipant
from datetime import datetime, timedelta
# Blueprint 생성
voting_bp = Blueprint('voting', __name__)

# 인증 미들웨어는 UnifiedBlueprintManager에서 중앙 관리됨

def get_seoul_today():
    """한국 시간의 오늘 날짜를 datetime.date 타입으로 반환"""
    korean_time = datetime.now() + timedelta(hours=9)
    return korean_time.date()

@voting_bp.route("/groups/vote", methods=["POST"])
def create_group_vote():
    """그룹 투표 생성"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "데이터가 없습니다."}), 400

        title = data.get("title")
        options = data.get("options", [])
        creator_id = data.get("creator_id")
        participant_ids = data.get("participant_ids", [])

        if not all([title, options, creator_id, participant_ids]):
            return jsonify({"error": "모든 필드가 필요합니다."}), 400

        # 새 투표 세션 생성
        new_voting = VotingSession(
            title=title,
            creator_id=creator_id,
            status="active",
            created_at=datetime.now()
        )

        db.session.add(new_voting)
        db.session.flush()

        # 투표 옵션들 추가
        for option_text in options:
            option = VotingOption(
                session_id=new_voting.id,
                option_text=option_text
            )
            db.session.add(option)

        # 채팅방 생성 (투표 결과 공유용)
        chat_room = ChatRoom(
            type="voting",
            title=f"투표: {title}"
        )
        db.session.add(chat_room)
        db.session.flush()

        # 참여자들 추가
        for participant_id in participant_ids:
            participant = ChatParticipant(
                chat_type="voting",
                chat_id=chat_room.id,
                employee_id=participant_id
            )
            db.session.add(participant)

        db.session.commit()

        return jsonify({
            "message": "투표가 생성되었습니다!",
            "voting_id": new_voting.id,
            "chat_room_id": chat_room.id
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"투표 생성 오류: {e}")
        return jsonify({"error": str(e)}), 500

@voting_bp.route("/groups/vote/<int:vote_id>/vote", methods=["POST"])
def submit_group_vote(vote_id):
    """그룹 투표 제출"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "데이터가 없습니다."}), 400

        voter_id = data.get("voter_id")
        option_id = data.get("option_id")

        if not all([voter_id, option_id]):
            return jsonify({"error": "모든 필드가 필요합니다."}), 400

        # 기존 투표 확인
        existing_vote = Vote.query.filter_by(
            session_id=vote_id,
            voter_id=voter_id
        ).first()

        if existing_vote:
            return jsonify({"error": "이미 투표했습니다."}), 400

        # 새 투표 생성
        new_vote = Vote(
            session_id=vote_id,
            option_id=option_id,
            voter_id=voter_id,
            created_at=datetime.now()
        )

        db.session.add(new_vote)
        db.session.commit()

        return jsonify({
            "message": "투표가 제출되었습니다!",
            "vote_id": new_vote.id
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"투표 제출 오류: {e}")
        return jsonify({"error": str(e)}), 500

@voting_bp.route("/voting-sessions", methods=["POST"])
def create_voting_session():
    """투표 세션 생성"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "데이터가 없습니다."}), 400

        title = data.get("title")
        description = data.get("description", "")
        options = data.get("options", [])
        creator_id = data.get("creator_id")
        end_time = data.get("end_time")

        if not all([title, options, creator_id]):
            return jsonify({"error": "제목, 옵션, 생성자 ID가 필요합니다."}), 400

        # 새 투표 세션 생성
        new_session = VotingSession(
            title=title,
            description=description,
            creator_id=creator_id,
            status="active",
            end_time=datetime.fromisoformat(end_time) if end_time else None,
            created_at=datetime.now()
        )

        db.session.add(new_session)
        db.session.flush()

        # 투표 옵션들 추가
        for option_text in options:
            option = VotingOption(
                session_id=new_session.id,
                option_text=option_text
            )
            db.session.add(option)

        db.session.commit()

        return jsonify({
            "message": "투표 세션이 생성되었습니다!",
            "session_id": new_session.id
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"투표 세션 생성 오류: {e}")
        return jsonify({"error": str(e)}), 500

@voting_bp.route("/voting-sessions/<int:session_id>", methods=["GET"])
def get_voting_session(session_id):
    """투표 세션 조회"""
    try:
        session = VotingSession.query.get_or_404(session_id)

        # 투표 옵션들 조회
        options = VotingOption.query.filter_by(session_id=session_id).all()
        options_data = []

        for option in options:
            vote_count = Vote.query.filter_by(option_id=option.id).count()
            options_data.append({
                "id": option.id,
                "option_text": option.option_text,
                "vote_count": vote_count
            })

        # 전체 투표 수
        total_votes = Vote.query.join(VotingOption).filter(
            VotingOption.session_id == session_id
        ).count()

        session_data = {
            "id": session.id,
            "title": session.title,
            "description": session.description,
            "status": session.status,
            "creator_id": session.creator_id,
            "end_time": session.end_time.isoformat() if session.end_time else None,
            "created_at": session.created_at.isoformat() if session.created_at else None,
            "options": options_data,
            "total_votes": total_votes
        }

        return jsonify(session_data)

    except Exception as e:
        print(f"투표 세션 조회 오류: {e}")
        return jsonify({"error": str(e)}), 500

@voting_bp.route("/voting-sessions/<int:session_id>/vote", methods=["POST", "DELETE"])
def submit_vote(session_id):
    """투표 제출 또는 취소"""
    try:
        if request.method == "POST":
            data = request.get_json()
            if not data:
                return jsonify({"error": "데이터가 없습니다."}), 400

            voter_id = data.get("voter_id")
            option_id = data.get("option_id")

            if not all([voter_id, option_id]):
                return jsonify({"error": "모든 필드가 필요합니다."}), 400

            # 투표 세션 상태 확인
            session = VotingSession.query.get_or_404(session_id)
            if session.status != "active":
                return jsonify({"error": "투표가 종료되었습니다."}), 400

            # 기존 투표 확인
            existing_vote = Vote.query.filter_by(
                session_id=session_id,
                voter_id=voter_id
            ).first()

            if existing_vote:
                return jsonify({"error": "이미 투표했습니다."}), 400

            # 새 투표 생성
            new_vote = Vote(
                session_id=session_id,
                option_id=option_id,
                voter_id=voter_id,
                created_at=datetime.now()
            )

            db.session.add(new_vote)
            db.session.commit()

            return jsonify({
                "message": "투표가 제출되었습니다!",
                "vote_id": new_vote.id
            }), 201

        elif request.method == "DELETE":
            data = request.get_json()
            if not data:
                return jsonify({"error": "데이터가 없습니다."}), 400

            voter_id = data.get("voter_id")

            if not voter_id:
                return jsonify({"error": "투표자 ID가 필요합니다."}), 400

            # 기존 투표 찾기
            existing_vote = Vote.query.filter_by(
                session_id=session_id,
                voter_id=voter_id
            ).first()

            if not existing_vote:
                return jsonify({"error": "투표한 기록이 없습니다."}), 404

            # 투표 삭제
            db.session.delete(existing_vote)
            db.session.commit()

            return jsonify({
                "message": "투표가 취소되었습니다."
            }), 200

    except Exception as e:
        db.session.rollback()
        print(f"투표 처리 오류: {e}")
        return jsonify({"error": str(e)}), 500

@voting_bp.route("/voting-sessions/<int:session_id>/cancel", methods=["POST"])
def cancel_voting_session(session_id):
    """투표 세션 취소"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "데이터가 없습니다."}), 400

        user_id = data.get("user_id")

        if not user_id:
            return jsonify({"error": "사용자 ID가 필요합니다."}), 400

        # 투표 세션 조회
        session = VotingSession.query.get_or_404(session_id)

        # 생성자만 취소 가능
        if session.creator_id != user_id:
            return jsonify({"error": "투표 생성자만 취소할 수 있습니다."}), 403

        # 상태를 취소로 변경
        session.status = "cancelled"
        session.updated_at = datetime.now()

        db.session.commit()

        return jsonify({
            "message": "투표가 취소되었습니다.",
            "session_id": session_id
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"투표 취소 오류: {e}")
        return jsonify({"error": str(e)}), 500

@voting_bp.route("/voting-sessions/<int:session_id>/update", methods=["PUT"])
def update_voting_session(session_id):
    """투표 세션 수정"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "데이터가 없습니다."}), 400

        user_id = data.get("user_id")
        title = data.get("title")
        description = data.get("description")
        end_time = data.get("end_time")

        if not user_id:
            return jsonify({"error": "사용자 ID가 필요합니다."}), 400

        # 투표 세션 조회
        session = VotingSession.query.get_or_404(session_id)

        # 생성자만 수정 가능
        if session.creator_id != user_id:
            return jsonify({"error": "투표 생성자만 수정할 수 있습니다."}), 403

        # 활성 상태일 때만 수정 가능
        if session.status != "active":
            return jsonify({"error": "활성 상태의 투표만 수정할 수 있습니다."}), 400

        # 필드 업데이트
        if title:
            session.title = title
        if description is not None:
            session.description = description
        if end_time:
            session.end_time = datetime.fromisoformat(end_time)

        session.updated_at = datetime.now()

        db.session.commit()

        return jsonify({
            "message": "투표가 수정되었습니다.",
            "session_id": session_id
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"투표 수정 오류: {e}")
        return jsonify({"error": str(e)}), 500

@voting_bp.route("/voting-sessions/<int:session_id>/replace-votes", methods=["PUT"])
def replace_votes(session_id):
    """투표 옵션 교체 및 재투표"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "데이터가 없습니다."}), 400

        user_id = data.get("user_id")
        new_options = data.get("new_options", [])

        if not all([user_id, new_options]):
            return jsonify({"error": "사용자 ID와 새로운 옵션들이 필요합니다."}), 400

        # 투표 세션 조회
        session = VotingSession.query.get_or_404(session_id)

        # 생성자만 수정 가능
        if session.creator_id != user_id:
            return jsonify({"error": "투표 생성자만 수정할 수 있습니다."}), 403

        # 활성 상태일 때만 수정 가능
        if session.status != "active":
            return jsonify({"error": "활성 상태의 투표만 수정할 수 있습니다."}), 400

        # 기존 투표들 삭제
        Vote.query.join(VotingOption).filter(
            VotingOption.session_id == session_id
        ).delete(synchronize_session=False)

        # 기존 옵션들 삭제
        VotingOption.query.filter_by(session_id=session_id).delete()

        # 새로운 옵션들 추가
        for option_text in new_options:
            option = VotingOption(
                session_id=session_id,
                option_text=option_text
            )
            db.session.add(option)

        session.updated_at = datetime.now()

        db.session.commit()

        return jsonify({
            "message": "투표 옵션이 교체되었습니다. 재투표가 필요합니다.",
            "session_id": session_id
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"투표 옵션 교체 오류: {e}")
        return jsonify({"error": str(e)}), 500
