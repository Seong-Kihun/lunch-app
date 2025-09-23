from flask import Blueprint, jsonify, request
from sqlalchemy import desc, or_, and_, func
from backend.app.extensions import db
from backend.models.app_models import User, UserPreference, MatchRequest, Match
from datetime import datetime, timedelta
import random
from backend.auth.middleware import check_authentication

# Blueprint 생성
matching_bp = Blueprint('matching', __name__)

# 인증 미들웨어 적용
@matching_bp.before_request
def _matching_guard():
    return check_authentication()

def get_seoul_today():
    """한국 시간의 오늘 날짜를 datetime.date 타입으로 반환"""
    korean_time = datetime.now() + timedelta(hours=9)
    return korean_time.date()

def calculate_compatibility_score(user1, user2):
    """두 사용자 간의 호환성 점수 계산"""
    score = 0
    
    # 부서가 같으면 +30점
    if user1.department == user2.department:
        score += 30
    
    # 직급이 비슷하면 +20점
    level_diff = abs(user1.level - user2.level) if hasattr(user1, 'level') and hasattr(user2, 'level') else 0
    if level_diff <= 1:
        score += 20
    elif level_diff <= 2:
        score += 10
    
    # 나이가 비슷하면 +15점
    age_diff = abs(user1.age - user2.age) if hasattr(user1, 'age') and hasattr(user2, 'age') else 0
    if age_diff <= 3:
        score += 15
    elif age_diff <= 5:
        score += 10
    
    # 취미가 겹치면 +25점
    if hasattr(user1, 'hobbies') and hasattr(user2, 'hobbies'):
        user1_hobbies = set(user1.hobbies.split(',') if user1.hobbies else [])
        user2_hobbies = set(user2.hobbies.split(',') if user2.hobbies else [])
        common_hobbies = user1_hobbies.intersection(user2_hobbies)
        score += len(common_hobbies) * 5
    
    # 선호도가 겹치면 +20점
    if hasattr(user1, 'preferences') and hasattr(user2, 'preferences'):
        user1_prefs = set(user1.preferences.split(',') if user1.preferences else [])
        user2_prefs = set(user2.preferences.split(',') if user2.preferences else [])
        common_prefs = user1_prefs.intersection(user2_prefs)
        score += len(common_prefs) * 4
    
    return min(score, 100)  # 최대 100점

def find_best_match(user_id, exclude_ids=None):
    """사용자에게 가장 적합한 매칭 상대 찾기"""
    if exclude_ids is None:
        exclude_ids = []
    
    user = User.query.filter_by(employee_id=user_id).first()
    if not user:
        return None
    
    # 이미 매칭된 사용자들 제외
    exclude_ids.append(user_id)
    
    # 매칭 가능한 사용자들 조회
    available_users = User.query.filter(
        and_(
            User.employee_id.notin_(exclude_ids),
            User.is_active == True
        )
    ).all()
    
    if not available_users:
        return None
    
    # 호환성 점수 계산 및 정렬
    user_scores = []
    for candidate in available_users:
        score = calculate_compatibility_score(user, candidate)
        user_scores.append((candidate, score))
    
    # 점수 순으로 정렬 (높은 점수 우선)
    user_scores.sort(key=lambda x: x[1], reverse=True)
    
    # 상위 3명 중에서 랜덤 선택 (다양성 확보)
    top_candidates = user_scores[:3]
    if top_candidates:
        return random.choice(top_candidates)[0]
    
    return None

@matching_bp.route("/match/status/<employee_id>", methods=["GET"])
def get_match_status(employee_id):
    """사용자의 매칭 상태 조회"""
    try:
        # 현재 활성 매칭 요청 확인
        active_request = MatchRequest.query.filter_by(
            requester_id=employee_id,
            status="pending"
        ).first()
        
        if active_request:
            return jsonify({
                "status": "pending",
                "request_id": active_request.id,
                "created_at": active_request.created_at.isoformat() if active_request.created_at else None
            })
        
        # 현재 매칭된 상대 확인
        current_match = Match.query.filter(
            and_(
                or_(
                    Match.user1_id == employee_id,
                    Match.user2_id == employee_id
                ),
                Match.status == "active"
            )
        ).first()
        
        if current_match:
            other_user_id = current_match.user2_id if current_match.user1_id == employee_id else current_match.user1_id
            other_user = User.query.filter_by(employee_id=other_user_id).first()
            
            return jsonify({
                "status": "matched",
                "match_id": current_match.id,
                "partner": {
                    "employee_id": other_user.employee_id,
                    "name": other_user.name,
                    "nickname": other_user.nickname,
                    "department": other_user.department
                },
                "matched_at": current_match.matched_at.isoformat() if current_match.matched_at else None
            })
        
        return jsonify({
            "status": "available",
            "message": "매칭 가능한 상태입니다."
        })
        
    except Exception as e:
        print(f"매칭 상태 조회 오류: {e}")
        return jsonify({"error": str(e)}), 500

@matching_bp.route("/match/request", methods=["POST"])
def create_match_request():
    """매칭 요청 생성"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "데이터가 없습니다."}), 400
        
        requester_id = data.get("requester_id")
        preferences = data.get("preferences", {})
        
        if not requester_id:
            return jsonify({"error": "요청자 ID가 필요합니다."}), 400
        
        # 사용자 확인
        user = User.query.filter_by(employee_id=requester_id).first()
        if not user:
            return jsonify({"error": "사용자를 찾을 수 없습니다."}), 404
        
        # 이미 활성 요청이 있는지 확인
        existing_request = MatchRequest.query.filter_by(
            requester_id=requester_id,
            status="pending"
        ).first()
        
        if existing_request:
            return jsonify({
                "error": "이미 매칭 요청이 진행 중입니다.",
                "request_id": existing_request.id
            }), 400
        
        # 새 매칭 요청 생성
        new_request = MatchRequest(
            requester_id=requester_id,
            preferences=preferences,
            status="pending",
            created_at=datetime.now()
        )
        
        db.session.add(new_request)
        db.session.commit()
        
        # 자동 매칭 시도
        best_match = find_best_match(requester_id)
        if best_match:
            # 매칭 성공
            new_match = Match(
                user1_id=requester_id,
                user2_id=best_match.employee_id,
                status="active",
                matched_at=datetime.now()
            )
            
            # 요청 상태 업데이트
            new_request.status = "matched"
            new_request.matched_with = best_match.employee_id
            
            db.session.add(new_match)
            db.session.commit()
            
            return jsonify({
                "message": "즉시 매칭되었습니다!",
                "match_id": new_match.id,
                "partner": {
                    "employee_id": best_match.employee_id,
                    "name": best_match.name,
                    "nickname": best_match.nickname,
                    "department": best_match.department
                }
            }), 201
        else:
            return jsonify({
                "message": "매칭 요청이 생성되었습니다. 적절한 상대를 찾는 중입니다.",
                "request_id": new_request.id
            }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"매칭 요청 생성 오류: {e}")
        return jsonify({"error": str(e)}), 500

@matching_bp.route("/match/confirm", methods=["POST"])
def confirm_match():
    """매칭 확인"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "데이터가 없습니다."}), 400
        
        match_id = data.get("match_id")
        user_id = data.get("user_id")
        
        if not all([match_id, user_id]):
            return jsonify({"error": "매칭 ID와 사용자 ID가 필요합니다."}), 400
        
        # 매칭 확인
        match = Match.query.get(match_id)
        if not match:
            return jsonify({"error": "매칭을 찾을 수 없습니다."}), 404
        
        if match.status != "active":
            return jsonify({"error": "활성 상태의 매칭이 아닙니다."}), 400
        
        # 사용자가 해당 매칭의 참여자인지 확인
        if user_id not in [match.user1_id, match.user2_id]:
            return jsonify({"error": "해당 매칭의 참여자가 아닙니다."}), 403
        
        # 매칭 상태를 확인됨으로 변경
        match.status = "confirmed"
        match.confirmed_at = datetime.now()
        
        db.session.commit()
        
        return jsonify({
            "message": "매칭이 확인되었습니다!",
            "match_id": match_id
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"매칭 확인 오류: {e}")
        return jsonify({"error": str(e)}), 500

@matching_bp.route("/match/cancel", methods=["POST"])
def cancel_match():
    """매칭 취소"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "데이터가 없습니다."}), 400
        
        match_id = data.get("match_id")
        user_id = data.get("user_id")
        
        if not all([match_id, user_id]):
            return jsonify({"error": "매칭 ID와 사용자 ID가 필요합니다."}), 400
        
        # 매칭 확인
        match = Match.query.get(match_id)
        if not match:
            return jsonify({"error": "매칭을 찾을 수 없습니다."}), 404
        
        if match.status not in ["active", "confirmed"]:
            return jsonify({"error": "취소할 수 있는 상태가 아닙니다."}), 400
        
        # 사용자가 해당 매칭의 참여자인지 확인
        if user_id not in [match.user1_id, match.user2_id]:
            return jsonify({"error": "해당 매칭의 참여자가 아닙니다."}), 403
        
        # 매칭 상태를 취소됨으로 변경
        match.status = "cancelled"
        match.cancelled_at = datetime.now()
        match.cancelled_by = user_id
        
        db.session.commit()
        
        return jsonify({
            "message": "매칭이 취소되었습니다.",
            "match_id": match_id
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"매칭 취소 오류: {e}")
        return jsonify({"error": str(e)}), 500

@matching_bp.route("/match/reject", methods=["POST"])
def reject_match():
    """매칭 거절"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "데이터가 없습니다."}), 400
        
        match_id = data.get("match_id")
        user_id = data.get("user_id")
        
        if not all([match_id, user_id]):
            return jsonify({"error": "매칭 ID와 사용자 ID가 필요합니다."}), 400
        
        # 매칭 확인
        match = Match.query.get(match_id)
        if not match:
            return jsonify({"error": "매칭을 찾을 수 없습니다."}), 404
        
        if match.status != "active":
            return jsonify({"error": "활성 상태의 매칭이 아닙니다."}), 400
        
        # 사용자가 해당 매칭의 참여자인지 확인
        if user_id not in [match.user1_id, match.user2_id]:
            return jsonify({"error": "해당 매칭의 참여자가 아닙니다."}), 403
        
        # 매칭 상태를 거절됨으로 변경
        match.status = "rejected"
        match.rejected_at = datetime.now()
        match.rejected_by = user_id
        
        db.session.commit()
        
        return jsonify({
            "message": "매칭이 거절되었습니다.",
            "match_id": match_id
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"매칭 거절 오류: {e}")
        return jsonify({"error": str(e)}), 500
