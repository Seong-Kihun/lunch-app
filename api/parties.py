"""
파티 API Blueprint
파티 관련 모든 API 엔드포인트를 포함합니다.
"""

from flask import Blueprint, request, jsonify
from sqlalchemy import desc, or_, and_
from datetime import datetime, timedelta
from extensions import db
from models.app_models import Party, PartyMember

# 파티 Blueprint 생성
parties_bp = Blueprint('parties', __name__, url_prefix='/api/parties')

# 모델 import
from flask import current_app
from sqlalchemy.orm import joinedload

@parties_bp.route('/', methods=['POST'])
def create_party():
    """새로운 파티 생성"""
    try:
        data = request.get_json()
        print(f"🔍 [create_party] 받은 데이터: {data}")
        if not data:
            return jsonify({'error': '요청 데이터가 없습니다'}), 400
        
        # 필수 필드 검증
        required_fields = ['title', 'date', 'time', 'created_by', 'restaurant']
        for field in required_fields:
            if field not in data or not data[field]:
                print(f"❌ [create_party] 필수 필드 누락: {field}, 값: {data.get(field)}")
                return jsonify({'error': f'필수 필드가 누락되었습니다: {field}'}), 400
        
        print(f"✅ [create_party] 필수 필드 검증 통과")
        
        # 데이터베이스에서 파티 생성
        from models.app_models import Party, PartyMember
        from extensions import db
        from datetime import datetime, date, time
        
        # 날짜와 시간 변환
        try:
            party_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': '잘못된 날짜 형식입니다. YYYY-MM-DD 형식을 사용하세요.'}), 400
        
        try:
            party_time = datetime.strptime(data['time'], '%H:%M').time()
        except ValueError:
            return jsonify({'error': '잘못된 시간 형식입니다. HH:MM 형식을 사용하세요.'}), 400
        
        # 새 파티 생성
        print(f"🔍 [create_party] 변환된 날짜: {party_date} (타입: {type(party_date)})")
        print(f"🔍 [create_party] 변환된 시간: {party_time} (타입: {type(party_time)})")
        
        new_party = Party()
        new_party.host_employee_id = data['created_by']
        new_party.title = data['title']
        new_party.restaurant_name = data.get('restaurant', '')
        new_party.restaurant_address = data.get('location', '')
        new_party.party_date = party_date
        new_party.party_time = party_time
        new_party.meeting_location = data.get('location', '')
        new_party.max_members = data.get('maxMembers', 4)
        new_party.is_from_match = False
        new_party.description = data.get('description', '')
        
        print(f"🔍 [create_party] 설정된 party_date: {new_party.party_date} (타입: {type(new_party.party_date)})")
        print(f"🔍 [create_party] 설정된 party_time: {new_party.party_time} (타입: {type(new_party.party_time)})")
        
        db.session.add(new_party)
        db.session.flush()  # ID 생성을 위해 flush
        
        # 파티 생성자를 멤버로 추가
        party_member = PartyMember(
            party_id=new_party.id,
            employee_id=data['created_by']
        )
        db.session.add(party_member)
        
        # 참여자들 추가 (있는 경우)
        attendees = data.get('attendees', [])
        for attendee in attendees:
            if attendee.get('employee_id') and attendee['employee_id'] != data['created_by']:
                member = PartyMember(
                    party_id=new_party.id,
                    employee_id=attendee['employee_id']
                )
                db.session.add(member)
                new_party.current_members += 1
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': '파티가 생성되었습니다',
            'data': {
                'id': new_party.id,
                'title': new_party.title,
                'restaurant_name': new_party.restaurant_name,
                'restaurant_address': new_party.restaurant_address,
                'party_date': new_party.party_date,
                'party_time': new_party.party_time,
                'meeting_location': new_party.meeting_location,
                'max_members': new_party.max_members,
                'current_members': new_party.current_members,
                'is_from_match': new_party.is_from_match,
                'host_employee_id': new_party.host_employee_id,
                'description': new_party.description
            }
        }), 201
        
    except Exception as e:
        print(f"Error in create_party: {e}")
        return jsonify({'error': '파티 생성 중 오류가 발생했습니다.', 'details': str(e)}), 500

@parties_bp.route('/', methods=['GET'])
def get_all_parties():
    """파티 목록 조회"""
    try:
        # 개발 환경에서는 인증 우회
        employee_id = request.args.get('employee_id', '1')  # 기본값으로 '1' 사용
        
        # 프로덕션 환경에서는 인증 확인
        # if not hasattr(request, 'current_user') or not request.current_user:
        #     return jsonify({'error': '인증이 필요합니다.'}), 401
        # employee_id = request.current_user.get('employee_id')
        
        is_from_match = request.args.get('is_from_match')
        
        # 데이터베이스에서 파티 조회
        from models.app_models import Party, PartyMember
        from extensions import db
        
        print(f"🔍 [get_all_parties] is_from_match: {is_from_match}")
        
        if is_from_match:
            # 특정 사용자의 랜덤런치 그룹 조회
            print("🔍 [get_all_parties] 랜덤런치 그룹 조회 경로")
            parties = Party.query.join(PartyMember).filter(
                Party.is_from_match == True,
                PartyMember.employee_id == employee_id
            ).order_by(desc(Party.id)).all()
        else:
            # 일반 파티 조회 (랜덤런치 제외)
            print("🔍 [get_all_parties] 일반 파티 조회 경로")
            parties = Party.query.filter_by(is_from_match=False).order_by(desc(Party.id)).all()
        
        print(f"🔍 [get_all_parties] 조회된 파티 수: {len(parties)}")
        
        parties_data = []
        for party in parties:
            # 멤버 정보 조회
            members = PartyMember.query.filter_by(party_id=party.id).all()
            member_ids = [member.employee_id for member in members]
            
            # 디버그: 멤버 정보 출력
            print(f"🔍 [get_all_parties] 파티 ID: {party.id}")
            print(f"   - 실제 멤버 수: {len(members)}")
            print(f"   - 멤버 ID 목록: {member_ids}")
            print(f"   - party.current_members: {party.current_members}")
            print(f"   - 계산된 멤버 수: {len(members)}")
            
            # 호스트 정보 조회
            from models.app_models import User
            host = User.query.filter_by(employee_id=party.host_employee_id).first()
            host_info = {
                'employee_id': host.employee_id if host else party.host_employee_id,
                'name': getattr(host, 'nickname', f'사용자 {party.host_employee_id}') if host else 'Unknown'
            } if host else {'employee_id': party.host_employee_id, 'name': 'Unknown'}
            
            parties_data.append({
                'id': party.id,
                'title': party.title,
                'restaurant_name': party.restaurant_name,
                'restaurant_address': party.restaurant_address,
                'meeting_location': party.meeting_location,
                'current_members': len(members),  # 실제 멤버 수 계산
                'max_members': party.max_members,
                'party_date': party.party_date,
                'party_time': party.party_time,
                'is_from_match': party.is_from_match,
                'description': party.description,
                'host': host_info,
                'member_count': len(member_ids)
            })
        
        return jsonify({
            'success': True,
            'message': '파티 목록 조회 성공',
            'employee_id': employee_id,
            'is_from_match': bool(is_from_match),
            'total_parties': len(parties_data),
            'parties': parties_data
        })
        
    except Exception as e:
        print(f"Error in get_all_parties: {e}")
        return jsonify({'error': '파티 목록 조회 중 오류가 발생했습니다.', 'details': str(e)}), 500

@parties_bp.route('/<int:party_id>', methods=['GET'])
def get_party(party_id):
    """파티 상세 정보 조회"""
    try:
        # 개발 환경에서는 인증 우회
        employee_id = '1'  # 기본값으로 '1' 사용
        
        # 프로덕션 환경에서는 인증 확인
        # if not hasattr(request, 'current_user') or not request.current_user:
        #     return jsonify({'error': '인증이 필요합니다.'}), 401
        # employee_id = request.current_user.get('employee_id')
        # if not employee_id:
        #     return jsonify({'error': '사용자 정보를 찾을 수 없습니다.'}), 400
        
        # 데이터베이스에서 파티 조회
        from models.app_models import Party, PartyMember
        from extensions import db
        
        party = Party.query.get(party_id)
        if not party:
            return jsonify({'error': '파티를 찾을 수 없습니다.'}), 404
        
        # 파티 멤버 조회
        party_members = PartyMember.query.filter_by(party_id=party_id).all()
        member_ids = [member.employee_id for member in party_members]
        
        # 디버그: 멤버 정보 출력
        print(f"🔍 [get_party] 파티 ID: {party_id}")
        print(f"   - 실제 멤버 수: {len(party_members)}")
        print(f"   - 멤버 ID 목록: {member_ids}")
        print(f"   - party.current_members: {party.current_members}")
        print(f"   - 계산된 멤버 수: {len(party_members)}")
        
        # 개발 환경에서는 멤버 확인 우회
        # if employee_id not in member_ids:
        #     return jsonify({'error': '파티 멤버만 상세 정보를 볼 수 있습니다.'}), 403
        
        # 멤버 상세 정보 조회
        from models.app_models import User
        members_details = []
        for member_id in member_ids:
            user = User.query.filter_by(employee_id=member_id).first()
            if user:
                members_details.append({
                    'employee_id': user.employee_id,
                    'name': getattr(user, 'nickname', f'사용자 {user.employee_id}'),
                    'nickname': getattr(user, 'nickname', f'사용자 {user.employee_id}')
                })
        
        return jsonify({
            'success': True,
            'message': '파티 정보 조회 성공',
            'party_id': party_id,
            'employee_id': employee_id,
            'party': {
                'id': party.id,
                'title': party.title,
                'restaurant_name': party.restaurant_name,
                'restaurant_address': party.restaurant_address,
                'party_date': party.party_date,
                'party_time': party.party_time,
                'meeting_location': party.meeting_location,
                'max_members': party.max_members,
                'current_members': len(party_members),  # 실제 멤버 수 계산
                'is_from_match': party.is_from_match,
                'description': party.description,
                'members': members_details
            }
        })
        
    except Exception as e:
        print(f"❌ [get_party] 오류 발생: {e}")
        import traceback
        print(f"❌ [get_party] 스택 트레이스: {traceback.format_exc()}")
        return jsonify({'error': '파티 정보 조회 중 오류가 발생했습니다.', 'details': str(e)}), 500

@parties_bp.route('/parties/<int:party_id>', methods=['PUT'])
def update_party(party_id):
    """파티 정보 수정"""
    try:
        # 인증 확인
        if not hasattr(request, 'current_user') or not request.current_user:
            return jsonify({'error': '인증이 필요합니다.'}), 401
        
        # 인증된 사용자 ID 사용
        employee_id = request.current_user.get('employee_id')
        if not employee_id:
            return jsonify({'error': '사용자 정보를 찾을 수 없습니다.'}), 400
        
        # 데이터베이스에서 파티 조회
        from app import Party, db
        
        party = Party.query.get(party_id)
        if not party:
            return jsonify({'error': '파티를 찾을 수 없습니다.'}), 404
        
        # 파티장만 수정 가능 (보안 강화)
        if party.host_employee_id != employee_id:
            return jsonify({'error': '파티장만 수정할 수 있습니다.'}), 403
        
        # 데이터 수정
        data = request.get_json()
        if 'title' in data:
            party.title = data['title']
        if 'restaurant_name' in data:
            party.restaurant_name = data['restaurant_name']
        if 'party_date' in data:
            party.party_date = data['party_date']
        if 'party_time' in data:
            party.party_time = data['party_time']
        if 'meeting_location' in data:
            party.meeting_location = data['meeting_location']
        if 'description' in data:
            party.description = data['description']
        if 'max_members' in data:
            try:
                max_members = int(data['max_members'])
                if max_members < 1:
                    return jsonify({'error': '최대 인원은 1명 이상이어야 합니다.'}), 400
                party.max_members = max_members
            except (ValueError, TypeError):
                return jsonify({'error': '최대 인원은 숫자여야 합니다.'}), 400
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': '파티 정보가 수정되었습니다.',
            'party_id': party_id,
            'employee_id': employee_id
        })
        
    except Exception as e:
        print(f"Error in update_party: {e}")
        return jsonify({'error': '파티 정보 수정 중 오류가 발생했습니다.', 'details': str(e)}), 500

@parties_bp.route('/parties/<int:party_id>/join', methods=['POST'])
def join_party(party_id):
    """파티 참여"""
    try:
        # 개발 환경에서는 인증 우회
        employee_id = '1'  # 기본값으로 '1' 사용
        
        # 프로덕션 환경에서는 인증 확인
        # if not hasattr(request, 'current_user') or not request.current_user:
        #     return jsonify({'error': '인증이 필요합니다.'}), 401
        # employee_id = request.current_user.get('employee_id')
        
        # 데이터베이스에서 파티 조회
        from models.app_models import Party, PartyMember
        from extensions import db
        
        party = Party.query.get(party_id)
        if not party:
            return jsonify({'error': '파티를 찾을 수 없습니다.'}), 404
        
        # 이미 참여 중인지 확인
        existing_member = PartyMember.query.filter_by(
            party_id=party_id, 
            employee_id=employee_id
        ).first()
        
        if existing_member:
            return jsonify({'error': '이미 참여 중인 파티입니다.'}), 400
        
        # 파티 인원 확인
        if party.current_members >= party.max_members:
            return jsonify({'error': '파티 인원이 가득 찼습니다.'}), 400
        
        # 멤버 추가
        member = PartyMember(
            party_id=party_id,
            employee_id=employee_id
        )
        db.session.add(member)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': '파티에 참여했습니다.',
            'party_id': party_id,
            'employee_id': employee_id
        })
        
    except Exception as e:
        print(f"Error in join_party: {e}")
        return jsonify({'error': '파티 참여 중 오류가 발생했습니다.', 'details': str(e)}), 500

@parties_bp.route('/parties/<int:party_id>/leave', methods=['POST'])
def leave_party(party_id):
    """파티 나가기"""
    try:
        # 개발 환경에서는 인증 우회
        employee_id = '1'  # 기본값으로 '1' 사용
        
        # 프로덕션 환경에서는 인증 확인
        # if not hasattr(request, 'current_user') or not request.current_user:
        #     return jsonify({'error': '인증이 필요합니다.'}), 401
        # employee_id = request.current_user.get('employee_id')
        
        # 데이터베이스에서 파티 조회
        from models.app_models import Party, PartyMember
        from extensions import db
        
        party = Party.query.get(party_id)
        if not party:
            return jsonify({'error': '파티를 찾을 수 없습니다.'}), 404
        
        # 사용자가 해당 파티의 멤버인지 확인
        member = PartyMember.query.filter_by(
            party_id=party_id, 
            employee_id=employee_id
        ).first()
        
        if not member:
            return jsonify({'error': '파티에 참여하지 않았습니다.'}), 400
        
        # 랜덤런치로 생성된 파티는 호스트도 나갈 수 있음
        if party.host_employee_id == employee_id and not party.is_from_match:
            return jsonify({'error': '일반 파티의 파티장은 파티를 나갈 수 없습니다. 파티 삭제를 사용해주세요.'}), 400
        
        # 멤버 제거
        db.session.delete(member)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': '파티에서 나갔습니다.',
            'party_id': party_id,
            'employee_id': employee_id
        })
        
    except Exception as e:
        print(f"Error in leave_party: {e}")
        return jsonify({'error': '파티 나가기 중 오류가 발생했습니다.', 'details': str(e)}), 500

@parties_bp.route('/my_parties', methods=['GET'])
def get_my_parties():
    """내 파티 목록 조회"""
    try:
        # 인증 확인
        if not hasattr(request, 'current_user') or not request.current_user:
            return jsonify({'error': '인증이 필요합니다.'}), 401
        
        # 인증된 사용자 ID 사용
        employee_id = request.current_user.get('employee_id')
        if not employee_id:
            return jsonify({'error': '사용자 정보를 찾을 수 없습니다.'}), 400
        
        # 데이터베이스에서 내 파티 조회
        from models.app_models import Party, PartyMember
        from extensions import db
        
        # 내가 참여한 파티들 (호스트이거나 멤버인 경우)
        my_parties = Party.query.filter(
            or_(
                Party.host_employee_id == employee_id,
                Party.id.in_(db.session.query(PartyMember.party_id).filter(PartyMember.employee_id == employee_id))
            )
        ).all()
        
        parties_data = []
        for party in my_parties:
            # 멤버 정보 조회
            members = PartyMember.query.filter_by(party_id=party.id).all()
            member_ids = [member.employee_id for member in members]
            
            parties_data.append({
                'id': party.id,
                'title': party.title,
                'restaurant_name': party.restaurant_name,
                'restaurant_address': party.restaurant_address,
                'party_date': party.party_date,
                'party_time': party.party_time,
                'meeting_location': party.meeting_location,
                'max_members': party.max_members,
                'current_members': party.current_members,
                'is_from_match': party.is_from_match,
                'member_count': len(member_ids)
            })
        
        return jsonify({
            'success': True,
            'message': '내 파티 목록 조회 성공',
            'employee_id': employee_id,
            'total_parties': len(parties_data),
            'parties': parties_data
        })
        
    except Exception as e:
        print(f"Error in get_my_parties: {e}")
        return jsonify({'error': '내 파티 목록 조회 중 오류가 발생했습니다.', 'details': str(e)}), 500

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
    
    # 페이지네이션
    total = parties_query.count()
    parties = parties_query.offset((page - 1) * per_page).limit(per_page).all()
    
    parties_data = []
    for party in parties:
        # 호스트 정보 (User 모델 없이 간단하게 처리)
        host_name = f"사용자 {party.host_employee_id}"
        
        # 멤버 수
        member_count = PartyMember.query.filter_by(party_id=party.id).count()
        
        party_info = {
            "id": party.id,
            "title": party.title,
            "restaurant_name": party.restaurant_name,
            "restaurant_address": party.restaurant_address,
            "party_date": party.party_date,
            "party_time": party.party_time,
            "meeting_location": party.meeting_location,
            "max_members": party.max_members,
            "current_members": member_count + 1,  # 호스트 포함
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
