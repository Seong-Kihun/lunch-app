from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
import secrets
import hashlib

# 공통 db 객체 사용 (extensions.py에서)
from extensions import db

# User 모델은 models/app_models.py에서 정의됨 (순환 import 방지)

class MagicLinkToken(db.Model):
    """매직링크 토큰 모델"""
    __tablename__ = 'magic_link_tokens'
    
    id = db.Column(db.Integer, primary_key=True)
    token_hash = db.Column(db.String(64), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), nullable=False, index=True)
    expires_at = db.Column(db.DateTime, nullable=False)
    is_used = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<MagicLinkToken {self.email}>'
    
    @staticmethod
    def generate_token():
        """암호학적으로 안전한 토큰 생성"""
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def hash_token(token):
        """토큰을 해시화"""
        return hashlib.sha256(token.encode()).hexdigest()
    
    def is_expired(self):
        """토큰 만료 여부 확인"""
        return datetime.utcnow() > self.expires_at

class RefreshToken(db.Model):
    """리프레시 토큰 모델"""
    __tablename__ = 'refresh_tokens'
    
    id = db.Column(db.Integer, primary_key=True)
    token_hash = db.Column(db.String(64), unique=True, nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    is_revoked = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # User 모델은 models/app_models.py에서 정의됨
    user = db.relationship('User', backref='refresh_tokens')
    
    def __repr__(self):
        return f'<RefreshToken {self.user_id}>'
    
    @staticmethod
    def generate_token():
        """암호학적으로 안전한 토큰 생성"""
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def hash_token(token):
        """토큰을 해시화"""
        return hashlib.sha256(token.encode()).hexdigest()
    
    def is_expired(self):
        """토큰 만료 여부 확인"""
        return datetime.utcnow() > self.expires_at

class RevokedToken(db.Model):
    """무효화된 토큰 블랙리스트"""
    __tablename__ = 'revoked_tokens'
    
    id = db.Column(db.Integer, primary_key=True)
    token_hash = db.Column(db.String(64), unique=True, nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    revoked_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # User 모델은 models/app_models.py에서 정의됨
    user = db.relationship('User', backref='revoked_tokens')
    
    def __repr__(self):
        return f'<RevokedToken {self.user_id}>'

class Friendship(db.Model):
    """친구 관계 모델"""
    __tablename__ = 'friendships'
    
    id = db.Column(db.Integer, primary_key=True)
    requester_id = db.Column(db.String(50), nullable=False)
    receiver_id = db.Column(db.String(50), nullable=False)
    status = db.Column(db.String(20), default='pending')  # 'pending', 'accepted'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Friendship {self.requester_id} -> {self.receiver_id}: {self.status}>'
    
    def __init__(self, requester_id, receiver_id):
        self.requester_id = requester_id
        self.receiver_id = receiver_id
