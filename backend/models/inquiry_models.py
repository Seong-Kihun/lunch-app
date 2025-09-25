#!/usr/bin/env python3
"""
문의사항 관련 데이터베이스 모델
"""

from datetime import datetime
from backend.app.extensions import db

class Inquiry(db.Model):
    """문의사항 모델"""
    __tablename__ = 'inquiries'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)  # 문의자 이름
    email = db.Column(db.String(120), nullable=False)  # 문의자 이메일
    subject = db.Column(db.String(200), nullable=False)  # 문의 제목
    message = db.Column(db.Text, nullable=False)  # 문의 내용
    status = db.Column(db.String(20), default='pending')  # pending, answered, closed
    priority = db.Column(db.String(20), default='normal')  # low, normal, high, urgent
    category = db.Column(db.String(50), nullable=True)  # 문의 카테고리
    
    # 답변 관련 필드
    answer = db.Column(db.Text, nullable=True)  # 답변 내용
    answered_by = db.Column(db.String(50), nullable=True)  # 답변자
    answered_at = db.Column(db.DateTime, nullable=True)  # 답변 시간
    
    # 메타데이터
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 사용자 정보 (선택적)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    
    def __repr__(self):
        return f'<Inquiry {self.id}: {self.subject}>'
    
    def to_dict(self):
        """딕셔너리로 변환"""
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'subject': self.subject,
            'message': self.message,
            'status': self.status,
            'priority': self.priority,
            'category': self.category,
            'answer': self.answer,
            'answered_by': self.answered_by,
            'answered_at': self.answered_at.isoformat() if self.answered_at else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'user_id': self.user_id
        }
    
    @staticmethod
    def get_status_choices():
        """상태 선택지"""
        return [
            ('pending', '대기중'),
            ('answered', '답변완료'),
            ('closed', '종료')
        ]
    
    @staticmethod
    def get_priority_choices():
        """우선순위 선택지"""
        return [
            ('low', '낮음'),
            ('normal', '보통'),
            ('high', '높음'),
            ('urgent', '긴급')
        ]
    
    @staticmethod
    def get_category_choices():
        """카테고리 선택지"""
        return [
            ('general', '일반문의'),
            ('bug', '버그신고'),
            ('feature', '기능요청'),
            ('account', '계정문의'),
            ('payment', '결제문의'),
            ('technical', '기술문의'),
            ('other', '기타')
        ]
