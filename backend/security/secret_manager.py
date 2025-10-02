#!/usr/bin/env python3
"""
비밀 관리 시스템
KMS/Secret Manager 통합을 통한 안전한 비밀 관리입니다.
"""

from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import os
import json
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import structlog

logger = structlog.get_logger()


class SecretManager(ABC):
    """비밀 관리자 인터페이스"""
    
    @abstractmethod
    def get_secret(self, key: str) -> Optional[str]:
        """비밀 조회"""
        pass
    
    @abstractmethod
    def set_secret(self, key: str, value: str) -> bool:
        """비밀 설정"""
        pass
    
    @abstractmethod
    def delete_secret(self, key: str) -> bool:
        """비밀 삭제"""
        pass
    
    @abstractmethod
    def list_secrets(self) -> List[str]:
        """비밀 목록 조회"""
        pass


class EnvironmentSecretManager(SecretManager):
    """환경변수 기반 비밀 관리자"""
    
    def get_secret(self, key: str) -> Optional[str]:
        """환경변수에서 비밀 조회"""
        return os.getenv(key)
    
    def set_secret(self, key: str, value: str) -> bool:
        """환경변수 설정 (런타임에서만 유효)"""
        os.environ[key] = value
        return True
    
    def delete_secret(self, key: str) -> bool:
        """환경변수 삭제"""
        if key in os.environ:
            del os.environ[key]
            return True
        return False
    
    def list_secrets(self) -> List[str]:
        """환경변수 목록 조회"""
        return list(os.environ.keys())


class FileSecretManager(SecretManager):
    """파일 기반 비밀 관리자"""
    
    def __init__(self, secrets_file: str = "secrets.json", encryption_key: Optional[str] = None):
        self.secrets_file = secrets_file
        self.encryption_key = encryption_key
        self._fernet = None
        
        if encryption_key:
            self._setup_encryption()
    
    def _setup_encryption(self):
        """암호화 설정"""
        try:
            # PBKDF2로 키 유도
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=b'lunch_app_salt',  # 실제로는 랜덤 솔트 사용
                iterations=100000,
            )
            key = base64.urlsafe_b64encode(kdf.derive(self.encryption_key.encode()))
            self._fernet = Fernet(key)
        except Exception as e:
            logger.error("암호화 설정 실패", error=str(e))
            raise
    
    def _encrypt_value(self, value: str) -> str:
        """값 암호화"""
        if not self._fernet:
            return value
        
        try:
            encrypted = self._fernet.encrypt(value.encode())
            return base64.urlsafe_b64encode(encrypted).decode()
        except Exception as e:
            logger.error("값 암호화 실패", error=str(e))
            raise
    
    def _decrypt_value(self, encrypted_value: str) -> str:
        """값 복호화"""
        if not self._fernet:
            return encrypted_value
        
        try:
            decoded = base64.urlsafe_b64decode(encrypted_value.encode())
            decrypted = self._fernet.decrypt(decoded)
            return decrypted.decode()
        except Exception as e:
            logger.error("값 복호화 실패", error=str(e))
            raise
    
    def _load_secrets(self) -> Dict[str, Any]:
        """비밀 파일 로드"""
        if not os.path.exists(self.secrets_file):
            return {}
        
        try:
            with open(self.secrets_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return data
        except Exception as e:
            logger.error("비밀 파일 로드 실패", file=self.secrets_file, error=str(e))
            return {}
    
    def _save_secrets(self, secrets: Dict[str, Any]) -> bool:
        """비밀 파일 저장"""
        try:
            with open(self.secrets_file, 'w', encoding='utf-8') as f:
                json.dump(secrets, f, indent=2, ensure_ascii=False)
            return True
        except Exception as e:
            logger.error("비밀 파일 저장 실패", file=self.secrets_file, error=str(e))
            return False
    
    def get_secret(self, key: str) -> Optional[str]:
        """비밀 조회"""
        secrets = self._load_secrets()
        
        if key not in secrets:
            return None
        
        encrypted_value = secrets[key].get('value')
        if not encrypted_value:
            return None
        
        try:
            decrypted_value = self._decrypt_value(encrypted_value)
            return decrypted_value
        except Exception:
            return None
    
    def set_secret(self, key: str, value: str) -> bool:
        """비밀 설정"""
        secrets = self._load_secrets()
        
        encrypted_value = self._encrypt_value(value)
        secrets[key] = {
            'value': encrypted_value,
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }
        
        return self._save_secrets(secrets)
    
    def delete_secret(self, key: str) -> bool:
        """비밀 삭제"""
        secrets = self._load_secrets()
        
        if key in secrets:
            del secrets[key]
            return self._save_secrets(secrets)
        
        return False
    
    def list_secrets(self) -> List[str]:
        """비밀 목록 조회"""
        secrets = self._load_secrets()
        return list(secrets.keys())


class AWSSecretsManager:
    """AWS Secrets Manager 클라이언트 (실제 구현 시 사용)"""
    
    def __init__(self, region: str = 'us-east-1'):
        self.region = region
        self._client = None
    
    def _get_client(self):
        """AWS 클라이언트 생성"""
        if self._client is None:
            try:
                import boto3
                self._client = boto3.client('secretsmanager', region_name=self.region)
            except ImportError:
                logger.error("boto3가 설치되지 않았습니다")
                raise
        return self._client
    
    def get_secret(self, secret_name: str) -> Optional[str]:
        """AWS Secrets Manager에서 비밀 조회"""
        try:
            client = self._get_client()
            response = client.get_secret_value(SecretId=secret_name)
            return response['SecretString']
        except Exception as e:
            logger.error("AWS Secrets Manager 조회 실패", secret_name=secret_name, error=str(e))
            return None
    
    def set_secret(self, secret_name: str, value: str, description: str = "") -> bool:
        """AWS Secrets Manager에 비밀 설정"""
        try:
            client = self._get_client()
            client.create_secret(
                Name=secret_name,
                SecretString=value,
                Description=description
            )
            return True
        except client.exceptions.ResourceExistsException:
            # 이미 존재하는 경우 업데이트
            try:
                client.update_secret(
                    SecretId=secret_name,
                    SecretString=value
                )
                return True
            except Exception as e:
                logger.error("AWS Secrets Manager 업데이트 실패", secret_name=secret_name, error=str(e))
                return False
        except Exception as e:
            logger.error("AWS Secrets Manager 설정 실패", secret_name=secret_name, error=str(e))
            return False
    
    def delete_secret(self, secret_name: str) -> bool:
        """AWS Secrets Manager에서 비밀 삭제"""
        try:
            client = self._get_client()
            client.delete_secret(
                SecretId=secret_name,
                ForceDeleteWithoutRecovery=True
            )
            return True
        except Exception as e:
            logger.error("AWS Secrets Manager 삭제 실패", secret_name=secret_name, error=str(e))
            return False


class KeyRotationManager:
    """키 로테이션 관리자"""
    
    def __init__(self, secret_manager: SecretManager):
        self.secret_manager = secret_manager
        self.rotation_schedule = {}
    
    def schedule_rotation(self, key: str, rotation_interval_days: int = 30):
        """키 로테이션 스케줄 설정"""
        self.rotation_schedule[key] = {
            'interval_days': rotation_interval_days,
            'last_rotated': datetime.utcnow().isoformat()
        }
    
    def rotate_key(self, key: str) -> bool:
        """키 로테이션 실행"""
        try:
            # 새 키 생성
            new_key = self._generate_new_key()
            
            # 기존 키 백업
            old_key = self.secret_manager.get_secret(key)
            if old_key:
                backup_key = f"{key}_backup_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
                self.secret_manager.set_secret(backup_key, old_key)
            
            # 새 키 설정
            success = self.secret_manager.set_secret(key, new_key)
            
            if success:
                # 로테이션 스케줄 업데이트
                if key in self.rotation_schedule:
                    self.rotation_schedule[key]['last_rotated'] = datetime.utcnow().isoformat()
                
                logger.info("키 로테이션 완료", key=key)
            
            return success
            
        except Exception as e:
            logger.error("키 로테이션 실패", key=key, error=str(e))
            return False
    
    def _generate_new_key(self) -> str:
        """새 키 생성"""
        return Fernet.generate_key().decode()
    
    def check_rotation_needed(self, key: str) -> bool:
        """로테이션 필요 여부 확인"""
        if key not in self.rotation_schedule:
            return False
        
        schedule = self.rotation_schedule[key]
        last_rotated = datetime.fromisoformat(schedule['last_rotated'])
        rotation_interval = timedelta(days=schedule['interval_days'])
        
        return datetime.utcnow() - last_rotated >= rotation_interval
    
    def auto_rotate_if_needed(self, key: str) -> bool:
        """필요시 자동 로테이션"""
        if self.check_rotation_needed(key):
            return self.rotate_key(key)
        return True


class SecretValidationManager:
    """비밀 검증 관리자"""
    
    def __init__(self, secret_manager: SecretManager):
        self.secret_manager = secret_manager
        self.validation_rules = {}
    
    def add_validation_rule(self, key: str, rule_func: callable):
        """검증 규칙 추가"""
        self.validation_rules[key] = rule_func
    
    def validate_secret(self, key: str, value: str) -> bool:
        """비밀 검증"""
        if key in self.validation_rules:
            try:
                return self.validation_rules[key](value)
            except Exception as e:
                logger.error("비밀 검증 실패", key=key, error=str(e))
                return False
        return True
    
    def validate_all_secrets(self) -> Dict[str, bool]:
        """모든 비밀 검증"""
        results = {}
        secrets = self.secret_manager.list_secrets()
        
        for secret_key in secrets:
            secret_value = self.secret_manager.get_secret(secret_key)
            if secret_value:
                results[secret_key] = self.validate_secret(secret_key, secret_value)
            else:
                results[secret_key] = False
        
        return results


# 기본 검증 규칙들
def validate_jwt_secret(secret: str) -> bool:
    """JWT 시크릿 검증"""
    return len(secret) >= 32 and secret not in ['dev-secret', 'test-secret', 'secret']


def validate_database_url(url: str) -> bool:
    """데이터베이스 URL 검증"""
    return url.startswith(('postgresql://', 'mysql://', 'sqlite://'))


def validate_password_strength(password: str) -> bool:
    """비밀번호 강도 검증"""
    return len(password) >= 8 and any(c.isupper() for c in password) and any(c.islower() for c in password)


# 전역 비밀 관리자 인스턴스
_secret_manager: Optional[SecretManager] = None
_rotation_manager: Optional[KeyRotationManager] = None
_validation_manager: Optional[SecretValidationManager] = None


def get_secret_manager() -> SecretManager:
    """비밀 관리자 인스턴스 반환"""
    global _secret_manager
    
    if _secret_manager is None:
        _secret_manager = _create_secret_manager()
    
    return _secret_manager


def _create_secret_manager() -> SecretManager:
    """비밀 관리자 생성"""
    # 환경에 따라 다른 구현체 사용
    if os.getenv('SECRET_MANAGER_TYPE') == 'aws':
        return AWSSecretsManager()
    elif os.getenv('SECRET_MANAGER_TYPE') == 'file':
        encryption_key = os.getenv('SECRET_ENCRYPTION_KEY')
        return FileSecretManager(encryption_key=encryption_key)
    else:
        return EnvironmentSecretManager()


def get_rotation_manager() -> KeyRotationManager:
    """로테이션 관리자 인스턴스 반환"""
    global _rotation_manager
    
    if _rotation_manager is None:
        _rotation_manager = KeyRotationManager(get_secret_manager())
    
    return _rotation_manager


def get_validation_manager() -> SecretValidationManager:
    """검증 관리자 인스턴스 반환"""
    global _validation_manager
    
    if _validation_manager is None:
        _validation_manager = SecretValidationManager(get_secret_manager())
        _setup_default_validation_rules(_validation_manager)
    
    return _validation_manager


def _setup_default_validation_rules(validation_manager: SecretValidationManager):
    """기본 검증 규칙 설정"""
    validation_manager.add_validation_rule('JWT_SECRET', validate_jwt_secret)
    validation_manager.add_validation_rule('DATABASE_URL', validate_database_url)
    validation_manager.add_validation_rule('SECRET_KEY', validate_password_strength)


# 편의 함수들
def get_secret(key: str, default: Optional[str] = None) -> Optional[str]:
    """비밀 조회"""
    return get_secret_manager().get_secret(key) or default


def set_secret(key: str, value: str) -> bool:
    """비밀 설정"""
    # 검증 먼저 수행
    validation_manager = get_validation_manager()
    if not validation_manager.validate_secret(key, value):
        logger.warning("비밀 검증 실패", key=key)
        return False
    
    return get_secret_manager().set_secret(key, value)


def rotate_secret(key: str) -> bool:
    """비밀 로테이션"""
    return get_rotation_manager().rotate_key(key)


def validate_all_secrets() -> Dict[str, bool]:
    """모든 비밀 검증"""
    return get_validation_manager().validate_all_secrets()


if __name__ == "__main__":
    # 비밀 관리 테스트
    secret_manager = get_secret_manager()
    
    # 비밀 설정
    secret_manager.set_secret("TEST_SECRET", "test_value_123")
    
    # 비밀 조회
    value = secret_manager.get_secret("TEST_SECRET")
    print(f"조회된 비밀: {value}")
    
    # 비밀 목록
    secrets = secret_manager.list_secrets()
    print(f"비밀 목록: {secrets}")
    
    # 검증
    validation_results = validate_all_secrets()
    print(f"검증 결과: {validation_results}")
