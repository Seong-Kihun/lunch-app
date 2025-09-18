from flask import Blueprint, jsonify, request
from sqlalchemy import desc, or_, and_, func
from extensions import db
from models.app_models import Party, PartyMember, Restaurant
from datetime import datetime, timedelta
import random
from auth.utils import require_auth

# Blueprint 생성
parties_bp = Blueprint('parties', __name__)

# 인증 미들웨어 적용
@parties_bp.before_request
def _parties_guard():
    return require_auth()()

def get_seoul_today():
    """한국 시간의 오늘 날짜를 datetime.date 타입으로 반환"""
    korean_time = datetime.now() + timedelta(hours=9)
    return korean_time.date()

@parties_bp.route("/parties", methods=["GET"])
def get_parties():
    """모든 파티 목록을 반환"""
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    
    # 기본 쿼리
    parties_query = Party.query
    
    # 필터링 옵션들
    date_filter = request.args.get("date")
    category_filter = request.args.get("category")
    host_filter = request.args.get("host_id")
    
    if date_filter:
        parties_query = parties_query.filter(Party.party_date == date_filter)
    
    if category_filter:
        parties_query = parties_query.filter(Party.restaurant_name.ilike(f"%{category_filter}%"))
    
    if host_filter:
        parties_query = parties_query.filter(Party.host_employee_id == host_filter)
    
    # 정렬 (최신순)
    parties_query = parties_query.order_by(desc(Party.created_at))
    
    # 멤버 수 계산을 서브쿼리로 최적화 (N+1 쿼리 제거)
    member_counts = db.session.query(
        PartyMember.party_id, func.count(PartyMember.id).label("member_count")
    ).group_by(PartyMember.party_id).subquery()
    
    # 파티와 멤버 수를 함께 조회
    parties_with_counts = db.session.query(Party, member_counts.c.member_count).outerjoin(
        member_counts, Party.id == member_counts.c.party_id
    ).filter(
        parties_query.whereclause if parties_query.whereclause is not None else True
    ).order_by(desc(Party.created_at))
    
    # 페이지네이션
    total = parties_with_counts.count()
    parties_result = parties_with_counts.offset((page - 1) * per_page).limit(per_page).all()
    
    parties_data = []
    for party, member_count in parties_result:
        # 호스트 정보 (User 모델 없이 간단하게 처리)
        host_name = f"사용자 {party.host_employee_id}"
        
        # 멤버 수 (None인 경우 0으로 처리)
        current_member_count = (member_count or 0) + 1  # 호스트 포함
        
        party_info = {
            "id": party.id,
            "title": party.title,
            "restaurant_name": party.restaurant_name,
            "restaurant_address": party.restaurant_address,
            "party_date": party.party_date.isoformat() if hasattr(party.party_date, 'isoformat') else str(party.party_date),
            "party_time": party.party_time.isoformat() if hasattr(party.party_time, 'isoformat') else str(party.party_time),
            "meeting_location": party.meeting_location,
            "max_members": party.max_members,
            "current_members": current_member_count,
            "host": {
                "employee_id": party.host_employee_id,
                "name": host_name
            },
            "is_from_match": party.is_from_match,
            "created_at": party.created_at.isoformat() if party.created_at else None
        }
        parties_data.append(party_info)
    
    return jsonify({
        "parties": parties_data,
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "pages": (total + per_page - 1) // per_page
        }
    })

@parties_bp.route("/parties", methods=["POST"])
def create_party():
    """새로운 파티를 생성"""
    data = request.get_json()
    print(f"🔍 [create_party] 받은 데이터: {data}")
    
    # 필수 필드 검증 (프론트엔드 필드명에 맞춤)
    required_fields = ["title", "date", "time", "created_by", "restaurant"]
    for field in required_fields:
        if field not in data or not data[field]:
            print(f"❌ [create_party] 필수 필드 누락: {field}, 값: {data.get(field)}")
            return jsonify({"error": f"필수 필드가 누락되었습니다: {field}"}), 400
    
    print(f"✅ [create_party] 필수 필드 검증 통과")
    
    try:
        # 날짜와 시간 변환
        from datetime import datetime, date, time
        
        try:
            party_date = datetime.strptime(data["date"], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({"error": "잘못된 날짜 형식입니다. YYYY-MM-DD 형식을 사용하세요."}), 400
        
        try:
            party_time = datetime.strptime(data["time"], '%H:%M').time()
        except ValueError:
            return jsonify({"error": "잘못된 시간 형식입니다. HH:MM 형식을 사용하세요."}), 400
        
        new_party = Party(
            host_employee_id=data.get("created_by"),
            title=data["title"],
            restaurant_name=data["restaurant"],
            restaurant_address=data.get("location", ""),
            party_date=party_date,
            party_time=party_time,
            meeting_location=data.get("location", ""),
            max_members=data.get("maxMembers", 4),
            is_from_match=data.get("is_from_match", False)
        )
        
        db.session.add(new_party)
        db.session.flush()  # 파티 ID를 얻기 위해 flush
        
        # 호스트를 PartyMember에 추가
        host_member = PartyMember(
            party_id=new_party.id,
            employee_id=data.get("created_by"),
            joined_at=datetime.utcnow()
        )
        db.session.add(host_member)
        db.session.commit()
        
        return jsonify({
            "message": "파티가 생성되었습니다!",
            "party_id": new_party.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"파티 생성 오류: {e}")
        return jsonify({"error": str(e)}), 500

@parties_bp.route("/parties/<int:party_id>", methods=["GET"])
def get_party_detail(party_id):
    """특정 파티의 상세 정보를 반환"""
    party = Party.query.get_or_404(party_id)
    
    # 호스트 정보 (User 모델 없이 간단하게 처리)
    host_name = f"사용자 {party.host_employee_id}"
    
    # 멤버 목록
    members = PartyMember.query.filter_by(party_id=party_id).all()
    member_data = []
    
    for member in members:
        # User 모델 없이 간단하게 처리
        member_name = f"사용자 {member.employee_id}"
        member_data.append({
            "employee_id": member.employee_id,
            "name": member_name,
            "joined_at": member.joined_at.isoformat() if member.joined_at else None
        })
    
    party_detail = {
        "id": party.id,
        "title": party.title,
        "restaurant_name": party.restaurant_name,
        "restaurant_address": party.restaurant_address,
        "party_date": party.party_date,
        "party_time": party.party_time,
        "meeting_location": party.meeting_location,
        "max_members": party.max_members,
        "current_members": len(member_data) + 1,
        "host": {
            "employee_id": party.host_employee_id,
            "name": host_name
        },
        "members": member_data,
        "is_from_match": party.is_from_match,
        "created_at": party.created_at.isoformat() if party.created_at else None
    }
    
    return jsonify(party_detail)

# 중복된 update_party 함수 제거됨 - api/parties.py의 정의만 유지

# 중복된 join_party 함수 제거됨 - api/parties.py의 정의만 유지
# @parties_bp.route("/parties/<int:party_id>/join", methods=["POST"])
# def join_party(party_id):
#     """파티에 참여"""
#     party = Party.query.get_or_404(party_id)
#     data = request.get_json()
#     
#     if not data.get("employee_id"):
#         return jsonify({"error": "사용자 ID가 필요합니다."}), 400
#     
#     employee_id = data["employee_id"]
#     
#     # 이미 참여 중인지 확인
#     existing_member = PartyMember.query.filter_by(
#         party_id=party_id, 
#         employee_id=employee_id
#     ).first()
#     
#     if existing_member:
#         return jsonify({"error": "이미 참여 중인 파티입니다."}), 400
#     
#     # 호스트인지 확인
#     if party.host_employee_id == employee_id:
#         return jsonify({"error": "호스트는 별도로 참여할 필요가 없습니다."}), 400
#     
#     # 최대 인원 확인
#     current_members = PartyMember.query.filter_by(party_id=party_id).count()
#     if current_members >= party.max_members:
#         return jsonify({"error": "파티 인원이 가득 찼습니다."}), 400
#     
#     try:
#         new_member = PartyMember(
#             party_id=party_id,
#             employee_id=employee_id
#         )
#         
#         db.session.add(new_member)
#         db.session.commit()
#         
#         return jsonify({
#             "message": "파티에 참여했습니다!",
#             "party_id": party_id,
#             "employee_id": employee_id
#         }), 201
#         
#     except Exception as e:
#         db.session.rollback()
#         print(f"파티 참여 오류: {e}")
#         return jsonify({"error": str(e)}), 500

# 중복된 leave_party 함수 제거됨 - api/parties.py의 정의만 유지
# @parties_bp.route("/parties/<int:party_id>/leave", methods=["POST"])
# def leave_party(party_id):
#     """파티에서 나가기"""
#     party = Party.query.get_or_404(party_id)
#     data = request.get_json()
#     
#     if not data.get("employee_id"):
#         return jsonify({"error": "사용자 ID가 필요합니다."}), 400
#     
#     employee_id = data["employee_id"]
#     
#     # 호스트는 나갈 수 없음
#     if party.host_employee_id == employee_id:
#         return jsonify({"error": "호스트는 파티를 나갈 수 없습니다."}), 400
#     
#     # 멤버 찾기
#     member = PartyMember.query.filter_by(
#         party_id=party_id, 
#         employee_id=employee_id
#     ).first()
#     
#     if not member:
#         return jsonify({"error": "참여 중이지 않은 파티입니다."}), 400
#     
#     try:
#         db.session.delete(member)
#         db.session.commit()
#         
#         return jsonify({
#             "message": "파티에서 나갔습니다.",
#             "party_id": party_id,
#             "employee_id": employee_id
#         })
#         
#     except Exception as e:
#         db.session.rollback()
#         print(f"파티 나가기 오류: {e}")
#         return jsonify({"error": str(e)}), 500

# 중복된 my_parties 함수 제거됨 - api/parties.py의 정의만 유지
# @parties_bp.route("/my_parties", methods=["GET"])
# def get_my_parties():
#     """내가 참여한 파티 목록"""
#     employee_id = request.args.get("employee_id")
#     if not employee_id:
#         return jsonify({"error": "사용자 ID가 필요합니다."}), 400
#     
#     # 내가 호스트인 파티들
#     hosted_parties = Party.query.filter_by(host_employee_id=employee_id).all()
#     
#     # 내가 멤버로 참여한 파티들
#     member_parties = db.session.query(Party).join(
#         PartyMember, Party.id == PartyMember.party_id
#     ).filter(PartyMember.employee_id == employee_id).all()
#     
#     # 중복 제거 및 합치기
#     all_parties = list(set(hosted_parties + member_parties))
#     
#     parties_data = []
#     for party in all_parties:
#         # 멤버 수
#         member_count = PartyMember.query.filter_by(party_id=party.id).count()
#         
#         # 내 역할 (host 또는 member)
#         role = "host" if party.host_employee_id == employee_id else "member"
#         
#         party_info = {
#             "id": party.id,
#             "title": party.title,
#             "restaurant_name": party.restaurant_name,
#             "party_date": party.party_date,
#             "party_time": party.party_time,
#             "current_members": member_count + 1,
#             "max_members": party.max_members,
#             "role": role,
#             "created_at": party.created_at.isoformat() if party.created_at else None
#         }
#         parties_data.append(party_info)
#     
#     # 날짜순 정렬
#     parties_data.sort(key=lambda x: x["party_date"], reverse=True)
#     
#     return jsonify({"parties": parties_data})

@parties_bp.route("/my_regular_parties/<employee_id>", methods=["GET"])
def get_my_regular_parties(employee_id):
    """내가 정기적으로 참여하는 파티들"""
    # 최근 3개월간 참여한 파티들 중에서 패턴 분석
    three_months_ago = get_seoul_today() - timedelta(days=90)
    
    # 내가 참여한 파티들 (호스트 + 멤버)
    hosted_parties = Party.query.filter(
        and_(
            Party.host_employee_id == employee_id,
            Party.party_date >= three_months_ago.strftime("%Y-%m-%d")
        )
    ).all()
    
    member_parties = db.session.query(Party).join(
        PartyMember, Party.id == PartyMember.party_id
    ).filter(
        and_(
            PartyMember.employee_id == employee_id,
            Party.party_date >= three_months_ago.strftime("%Y-%m-%d")
        )
    ).all()
    
    all_parties = list(set(hosted_parties + member_parties))
    
    # 패턴 분석 (같은 시간대, 같은 장소 등)
    patterns = {}
    for party in all_parties:
        key = f"{party.party_time}_{party.restaurant_name}"
        if key not in patterns:
            patterns[key] = {
                "party_time": party.party_time,
                "restaurant_name": party.restaurant_name,
                "count": 0,
                "last_date": party.party_date
            }
        patterns[key]["count"] += 1
        if party.party_date > patterns[key]["last_date"]:
            patterns[key]["last_date"] = party.party_date
    
    # 2회 이상 참여한 패턴만 필터링
    regular_patterns = [
        pattern for pattern in patterns.values() 
        if pattern["count"] >= 2
    ]
    
    # 참여 횟수순 정렬
    regular_patterns.sort(key=lambda x: x["count"], reverse=True)
    
    return jsonify({
        "regular_patterns": regular_patterns,
        "total_parties": len(all_parties)
    })

@parties_bp.route("/parties/<int:party_id>", methods=["DELETE"])
def delete_party(party_id):
    """파티 삭제"""
    party = Party.query.get_or_404(party_id)
    
    try:
        # 먼저 모든 멤버 삭제
        PartyMember.query.filter_by(party_id=party_id).delete()
        
        # 파티 삭제
        db.session.delete(party)
        db.session.commit()
        
        return jsonify({
            "message": "파티가 삭제되었습니다.",
            "party_id": party_id
        })
        
    except Exception as e:
        db.session.rollback()
        print(f"파티 삭제 오류: {e}")
        return jsonify({"error": str(e)}), 500

@parties_bp.route("/delete-all-parties", methods=["GET"])
def delete_all_parties():
    """모든 파티 삭제 (개발/테스트용)"""
    try:
        # 모든 멤버 삭제
        PartyMember.query.delete()
        
        # 모든 파티 삭제
        Party.query.delete()
        
        db.session.commit()
        
        return jsonify({
            "message": "모든 파티가 삭제되었습니다."
        })
        
    except Exception as e:
        db.session.rollback()
        print(f"전체 파티 삭제 오류: {e}")
        return jsonify({"error": str(e)}), 500

