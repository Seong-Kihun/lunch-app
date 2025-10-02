#!/usr/bin/env python3
"""
문의사항 API 엔드포인트
"""

from flask import Blueprint, request, jsonify, current_app
from datetime import datetime
import re
from backend.models.inquiry_models import Inquiry
from backend.app.extensions import db
from backend.auth.email_service import EmailService

# 문의사항 블루프린트 생성
inquiries_bp = Blueprint('inquiries', __name__, url_prefix='/inquiries')

@inquiries_bp.route('/', methods=['POST'])
def create_inquiry():
    """문의사항 등록"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': '문의사항 데이터가 필요합니다.'}), 400
        
        # 필수 필드 검증
        required_fields = ['email', 'subject', 'message']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field}는 필수입니다.'}), 400
        
        # 이메일 형식 검증
        email = data['email'].strip().lower()
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
            return jsonify({'error': '올바른 이메일 형식이 아닙니다.'}), 400
        
        # 문의사항 생성 (이름은 이메일에서 자동 추출)
        name = email.split('@')[0]  # 이메일 아이디 부분을 이름으로 사용
        
        inquiry = Inquiry(
            name=name,
            email=email,
            subject=data['subject'].strip(),
            message=data['message'].strip(),
            category=data.get('category', 'general'),
            priority=data.get('priority', 'normal'),
            user_id=data.get('user_id')  # 로그인한 사용자의 경우
        )
        
        db.session.add(inquiry)
        db.session.commit()
        
        # 이메일 알림 발송
        try:
            send_inquiry_notification(inquiry)
        except Exception as e:
            current_app.logger.error(f"문의사항 이메일 알림 발송 실패: {str(e)}")
            # 이메일 발송 실패해도 문의사항은 저장됨
        
        return jsonify({
            'message': '문의사항이 성공적으로 등록되었습니다.',
            'inquiry_id': inquiry.id,
            'inquiry': inquiry.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"문의사항 등록 실패: {str(e)}")
        return jsonify({
            'error': '문의사항 등록 중 오류가 발생했습니다.',
            'details': str(e)
        }), 500

@inquiries_bp.route('/', methods=['GET'])
def get_inquiries():
    """문의사항 목록 조회 (관리자용)"""
    try:
        # 페이지네이션
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status = request.args.get('status')
        priority = request.args.get('priority')
        category = request.args.get('category')
        
        # 쿼리 빌드
        query = Inquiry.query
        
        if status:
            query = query.filter(Inquiry.status == status)
        if priority:
            query = query.filter(Inquiry.priority == priority)
        if category:
            query = query.filter(Inquiry.category == category)
        
        # 최신순 정렬
        query = query.order_by(Inquiry.created_at.desc())
        
        # 페이지네이션 적용
        pagination = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        inquiries = [inquiry.to_dict() for inquiry in pagination.items]
        
        return jsonify({
            'inquiries': inquiries,
            'pagination': {
                'page': pagination.page,
                'pages': pagination.pages,
                'per_page': pagination.per_page,
                'total': pagination.total,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            }
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"문의사항 목록 조회 실패: {str(e)}")
        return jsonify({
            'error': '문의사항 목록 조회 중 오류가 발생했습니다.',
            'details': str(e)
        }), 500

@inquiries_bp.route('/<int:inquiry_id>', methods=['GET'])
def get_inquiry(inquiry_id):
    """특정 문의사항 조회"""
    try:
        inquiry = Inquiry.query.get_or_404(inquiry_id)
        return jsonify({
            'inquiry': inquiry.to_dict()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"문의사항 조회 실패: {str(e)}")
        return jsonify({
            'error': '문의사항 조회 중 오류가 발생했습니다.',
            'details': str(e)
        }), 500

@inquiries_bp.route('/<int:inquiry_id>/answer', methods=['POST'])
def answer_inquiry(inquiry_id):
    """문의사항 답변"""
    try:
        inquiry = Inquiry.query.get_or_404(inquiry_id)
        
        data = request.get_json()
        if not data or 'answer' not in data:
            return jsonify({'error': '답변 내용이 필요합니다.'}), 400
        
        # 답변 업데이트
        inquiry.answer = data['answer'].strip()
        inquiry.answered_by = data.get('answered_by', '관리자')
        inquiry.answered_at = datetime.utcnow()
        inquiry.status = 'answered'
        
        db.session.commit()
        
        # 답변 이메일 발송
        try:
            send_answer_notification(inquiry)
        except Exception as e:
            current_app.logger.error(f"답변 이메일 발송 실패: {str(e)}")
        
        return jsonify({
            'message': '답변이 성공적으로 등록되었습니다.',
            'inquiry': inquiry.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"문의사항 답변 실패: {str(e)}")
        return jsonify({
            'error': '문의사항 답변 중 오류가 발생했습니다.',
            'details': str(e)
        }), 500

@inquiries_bp.route('/<int:inquiry_id>/status', methods=['PUT'])
def update_inquiry_status(inquiry_id):
    """문의사항 상태 변경"""
    try:
        inquiry = Inquiry.query.get_or_404(inquiry_id)
        
        data = request.get_json()
        if not data or 'status' not in data:
            return jsonify({'error': '상태 정보가 필요합니다.'}), 400
        
        valid_statuses = ['pending', 'answered', 'closed']
        if data['status'] not in valid_statuses:
            return jsonify({'error': '유효하지 않은 상태입니다.'}), 400
        
        inquiry.status = data['status']
        inquiry.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'message': '상태가 성공적으로 변경되었습니다.',
            'inquiry': inquiry.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"문의사항 상태 변경 실패: {str(e)}")
        return jsonify({
            'error': '문의사항 상태 변경 중 오류가 발생했습니다.',
            'details': str(e)
        }), 500

@inquiries_bp.route('/stats', methods=['GET'])
def get_inquiry_stats():
    """문의사항 통계"""
    try:
        total = Inquiry.query.count()
        pending = Inquiry.query.filter(Inquiry.status == 'pending').count()
        answered = Inquiry.query.filter(Inquiry.status == 'answered').count()
        closed = Inquiry.query.filter(Inquiry.status == 'closed').count()
        
        # 카테고리별 통계
        category_stats = db.session.query(
            Inquiry.category, 
            db.func.count(Inquiry.id)
        ).group_by(Inquiry.category).all()
        
        return jsonify({
            'total': total,
            'pending': pending,
            'answered': answered,
            'closed': closed,
            'category_stats': dict(category_stats)
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"문의사항 통계 조회 실패: {str(e)}")
        return jsonify({
            'error': '문의사항 통계 조회 중 오류가 발생했습니다.',
            'details': str(e)
        }), 500

def send_inquiry_notification(inquiry):
    """문의사항 등록 시 관리자에게 이메일 알림"""
    try:
        email_service = EmailService()
        
        subject = f"[밥플떼기] 새로운 문의사항 - {inquiry.subject}"
        
        # HTML 이메일 내용
        html_content = f"""
        <!DOCTYPE html>
        <html lang="ko">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>새로운 문의사항</title>
            <style>
                body {{
                    font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', '맑은 고딕', sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f8f9fa;
                }}
                .container {{
                    background-color: #ffffff;
                    border-radius: 12px;
                    padding: 40px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }}
                .header {{
                    text-align: center;
                    margin-bottom: 30px;
                    border-bottom: 2px solid #3B82F6;
                    padding-bottom: 20px;
                }}
                .logo {{
                    font-size: 28px;
                    font-weight: bold;
                    color: #3B82F6;
                    margin-bottom: 10px;
                }}
                .inquiry-info {{
                    background-color: #F8FAFC;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 20px 0;
                }}
                .info-row {{
                    display: flex;
                    margin-bottom: 10px;
                }}
                .info-label {{
                    font-weight: bold;
                    width: 100px;
                    color: #64748B;
                }}
                .info-value {{
                    flex: 1;
                    color: #1E293B;
                }}
                .message-content {{
                    background-color: #FFFFFF;
                    border: 1px solid #E2E8F0;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 20px 0;
                    white-space: pre-wrap;
                }}
                .footer {{
                    text-align: center;
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #E2E8F0;
                    color: #64748B;
                    font-size: 14px;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">🍽️ 밥플떼기</div>
                    <div style="color: #64748B; font-size: 16px;">새로운 문의사항이 등록되었습니다</div>
                </div>
                
                <div class="inquiry-info">
                    <div class="info-row">
                        <div class="info-label">문의자:</div>
                        <div class="info-value">{inquiry.name}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">이메일:</div>
                        <div class="info-value">{inquiry.email}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">제목:</div>
                        <div class="info-value">{inquiry.subject}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">카테고리:</div>
                        <div class="info-value">{inquiry.category}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">우선순위:</div>
                        <div class="info-value">{inquiry.priority}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">등록시간:</div>
                        <div class="info-value">{inquiry.created_at.strftime('%Y-%m-%d %H:%M:%S')}</div>
                    </div>
                </div>
                
                <div>
                    <h3 style="color: #1E293B; margin-bottom: 10px;">문의 내용</h3>
                    <div class="message-content">{inquiry.message}</div>
                </div>
                
                <div class="footer">
                    <p>이 이메일은 자동으로 발송되었습니다.</p>
                    <p>관리자 페이지에서 답변을 등록해주세요.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # 텍스트 이메일 내용
        text_content = f"""
🍽️ 밥플떼기 - 새로운 문의사항

문의자: {inquiry.name}
이메일: {inquiry.email}
제목: {inquiry.subject}
카테고리: {inquiry.category}
우선순위: {inquiry.priority}
등록시간: {inquiry.created_at.strftime('%Y-%m-%d %H:%M:%S')}

문의 내용:
{inquiry.message}

관리자 페이지에서 답변을 등록해주세요.
        """
        
        # 이메일 발송
        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText
        
        msg = MIMEMultipart('alternative')
        msg['From'] = f'밥플떼기 <{email_service.username}>'
        from backend.config.auth_config import AuthConfig
        msg['To'] = AuthConfig.INQUIRY_EMAIL
        msg['Subject'] = subject
        
        msg.attach(MIMEText(text_content, 'plain', 'utf-8'))
        msg.attach(MIMEText(html_content, 'html', 'utf-8'))
        
        return email_service._send_email(msg)
        
    except Exception as e:
        current_app.logger.error(f"문의사항 이메일 알림 발송 실패: {str(e)}")
        return False

def send_answer_notification(inquiry):
    """문의사항 답변 시 문의자에게 이메일 발송"""
    try:
        email_service = EmailService()
        
        subject = f"[밥플떼기] 문의사항 답변 - {inquiry.subject}"
        
        # HTML 이메일 내용
        html_content = f"""
        <!DOCTYPE html>
        <html lang="ko">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>문의사항 답변</title>
            <style>
                body {{
                    font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', '맑은 고딕', sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f8f9fa;
                }}
                .container {{
                    background-color: #ffffff;
                    border-radius: 12px;
                    padding: 40px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }}
                .header {{
                    text-align: center;
                    margin-bottom: 30px;
                    border-bottom: 2px solid #10B981;
                    padding-bottom: 20px;
                }}
                .logo {{
                    font-size: 28px;
                    font-weight: bold;
                    color: #10B981;
                    margin-bottom: 10px;
                }}
                .answer-content {{
                    background-color: #F0FDF4;
                    border: 1px solid #10B981;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 20px 0;
                    white-space: pre-wrap;
                }}
                .footer {{
                    text-align: center;
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #E2E8F0;
                    color: #64748B;
                    font-size: 14px;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">🍽️ 밥플떼기</div>
                    <div style="color: #64748B; font-size: 16px;">문의사항에 대한 답변입니다</div>
                </div>
                
                <div>
                    <h3 style="color: #1E293B; margin-bottom: 10px;">문의 제목: {inquiry.subject}</h3>
                    <div class="answer-content">{inquiry.answer}</div>
                </div>
                
                <div class="footer">
                    <p>이 이메일은 자동으로 발송되었습니다.</p>
                    <p>추가 문의사항이 있으시면 언제든지 연락해주세요.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # 텍스트 이메일 내용
        text_content = f"""
🍽️ 밥플떼기 - 문의사항 답변

문의 제목: {inquiry.subject}

답변 내용:
{inquiry.answer}

추가 문의사항이 있으시면 언제든지 연락해주세요.
        """
        
        # 이메일 발송
        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText
        
        msg = MIMEMultipart('alternative')
        msg['From'] = f'밥플떼기 <{email_service.username}>'
        msg['To'] = inquiry.email
        msg['Subject'] = subject
        
        msg.attach(MIMEText(text_content, 'plain', 'utf-8'))
        msg.attach(MIMEText(html_content, 'html', 'utf-8'))
        
        return email_service._send_email(msg)
        
    except Exception as e:
        current_app.logger.error(f"답변 이메일 발송 실패: {str(e)}")
        return False
