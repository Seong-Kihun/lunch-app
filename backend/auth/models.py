from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
import secrets
import hashlib

# 공통 db 객체 사용 (extensions.py에서)
from backend.app.extensions import db

# 표준 SQLAlchemy 선언적 매핑

class User(db.Model):
    """사용자 모델"""
    __tablename__ = 'users'
    __table_args__ = {'extend_existing': True}

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    nickname = db.Column(db.String(50), nullable=False)
    employee_id = db.Column(db.String(20), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)

    # 기존 앱과의 호환성을 위한 필드들
    points = db.Column(db.Integer, default=0)
    profile_image = db.Column(db.String(255))

    # 기존 앱 기능을 위한 추가 필드들
    gender = db.Column(db.String(10), nullable=True)
    age_group = db.Column(db.String(20), nullable=True)
    main_dish_genre = db.Column(db.String(100), nullable=True)

    # 선호도 및 설정 필드들
    lunch_preference = db.Column(db.String(200), nullable=True)
    allergies = db.Column(db.String(200), nullable=True)
    preferred_time = db.Column(db.String(50), nullable=True)
    food_preferences = db.Column(db.String(200), nullable=True)
    frequent_areas = db.Column(db.String(200), nullable=True)
    notification_settings = db.Column(db.String(200), nullable=True)

    # 포인트 시스템 필드들
    total_points = db.Column(db.Integer, default=0)
    current_level = db.Column(db.Integer, default=1)
    current_badge = db.Column(db.String(50), nullable=True)
    consecutive_login_days = db.Column(db.Integer, default=0)
    last_login_date = db.Column(db.Date, nullable=True)

    # 매칭 시스템 필드들
    matching_status = db.Column(db.String(20), default='idle')  # 'idle', 'waiting', 'matched'
    match_request_time = db.Column(db.DateTime, nullable=True)

    # 비밀번호 인증 필드들
    password_hash = db.Column(db.String(255), nullable=True)  # 비밀번호 해시
    last_password_change = db.Column(db.DateTime, nullable=True)
    failed_login_attempts = db.Column(db.Integer, default=0)
    account_locked_until = db.Column(db.DateTime, nullable=True)

    # 관계 정의 (기존 앱과의 호환성을 위해)
    @property
    def preferences(self):
        """사용자 선호도 정보를 딕셔너리로 반환"""
        return {
            'gender': self.gender,
            'age_group': self.age_group,
            'main_dish_genre': self.main_dish_genre,
            'lunch_preference': self.lunch_preference,
            'allergies': self.allergies,
            'preferred_time': self.preferred_time,
            'food_preferences': self.food_preferences,
            'frequent_areas': self.frequent_areas,
            'notification_settings': self.notification_settings
        }

    @property
    def activities(self):
        """사용자 활동 정보를 딕셔너리로 반환"""
        return {
            'points': self.points,
            'total_points': self.total_points,
            'current_level': self.current_level,
            'current_badge': self.current_badge,
            'consecutive_login_days': self.consecutive_login_days,
            'last_login_date': self.last_login_date,
            'matching_status': self.matching_status,
            'match_request_time': self.match_request_time
        }

    def set_password(self, password):
        """비밀번호 설정 및 해시화"""
        self.password_hash = generate_password_hash(password)
        self.last_password_change = datetime.utcnow()

    def check_password(self, password):
        """비밀번호 검증"""
        if not self.password_hash:
            return False
        return check_password_hash(self.password_hash, password)

    def is_account_locked(self):
        """계정 잠금 상태 확인"""
        if not self.account_locked_until:
            return False
        return datetime.utcnow() < self.account_locked_until

    def lock_account(self, duration_minutes=15):
        """계정 잠금"""
        self.account_locked_until = datetime.utcnow() + timedelta(minutes=duration_minutes)
        self.failed_login_attempts = 0

    def unlock_account(self):
        """계정 잠금 해제"""
        self.account_locked_until = None
        self.failed_login_attempts = 0

    def increment_failed_attempts(self):
        """실패한 로그인 시도 횟수 증가"""
        self.failed_login_attempts += 1
        if self.failed_login_attempts >= 5:  # 5회 실패 시 계정 잠금
            self.lock_account()

    def reset_failed_attempts(self):
        """실패한 로그인 시도 횟수 초기화"""
        self.failed_login_attempts = 0

    def __repr__(self):
        return f'<User {self.email}>'

    def __init__(self, email, nickname, employee_id):
        self.email = email
        self.nickname = nickname
        self.employee_id = employee_id
        # 기본값 설정
        self.gender = None
        self.age_group = None
        self.main_dish_genre = None
        self.lunch_preference = '새로운 맛집 탐방'
        self.allergies = ''
        self.preferred_time = '12:00'
        self.food_preferences = None
        self.frequent_areas = '강남구,서초구'
        self.notification_settings = 'push_notification,party_reminder'
        self.total_points = 0
        self.current_level = 1
        self.current_badge = None
        self.consecutive_login_days = 0
        self.last_login_date = None
        self.matching_status = 'idle'
        self.match_request_time = None

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'nickname': self.nickname,
            'employee_id': self.employee_id,
            'created_at': self.created_at.isoformat(),
            'points': self.points,
            'profile_image': self.profile_image,
            'gender': self.gender,
            'age_group': self.age_group,
            'main_dish_genre': self.main_dish_genre,
            'lunch_preference': self.lunch_preference,
            'allergies': self.allergies,
            'preferred_time': self.preferred_time,
            'food_preferences': self.food_preferences,
            'frequent_areas': self.frequent_areas,
            'notification_settings': self.notification_settings,
            'total_points': self.total_points,
            'current_level': self.current_level,
            'current_badge': self.current_badge,
            'consecutive_login_days': self.consecutive_login_days,
            'last_login_date': self.last_login_date.isoformat() if self.last_login_date else None,
            'matching_status': self.matching_status,
            'match_request_time': self.match_request_time.isoformat() if self.match_request_time else None
        }

    # 관계 정의는 RefreshToken과 RevokedToken에서 backref로 처리


class RefreshToken(db.Model):
    """리프레시 토큰 모델"""
    __tablename__ = 'refresh_tokens'
    __table_args__ = {'extend_existing': True}

    id = db.Column(db.Integer, primary_key=True)
    token_hash = db.Column(db.String(64), unique=True, nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    is_revoked = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('backend.auth.models.User')

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
    __table_args__ = {'extend_existing': True}

    id = db.Column(db.Integer, primary_key=True)
    token_hash = db.Column(db.String(64), unique=True, nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    revoked_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('backend.auth.models.User')

    def __repr__(self):
        return f'<RevokedToken {self.user_id}>'

class Friendship(db.Model):
    """친구 관계 모델"""
    __tablename__ = 'friendships'
    __table_args__ = {'extend_existing': True}

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

# 모든 모델이 표준 SQLAlchemy 방식으로 정의되었습니다.
