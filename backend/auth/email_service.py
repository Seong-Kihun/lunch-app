import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import Optional
from backend.config.auth_config import AuthConfig

class EmailService:
    """이메일 발송 서비스"""
    
    def __init__(self):
        self.smtp_server = AuthConfig.MAIL_SERVER
        self.smtp_port = AuthConfig.MAIL_PORT
        self.username = AuthConfig.MAIL_USERNAME
        self.password = AuthConfig.MAIL_PASSWORD
        self.use_tls = AuthConfig.MAIL_USE_TLS
    
    
    
    def _send_email(self, msg: MIMEMultipart) -> bool:
        """이메일 발송 실행"""
        try:
            # SMTP 서버 연결
            if self.use_tls:
                server = smtplib.SMTP(self.smtp_server, self.smtp_port)
                server.starttls()
            else:
                server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            
            # 로그인
            server.login(self.username, self.password)
            
            # 이메일 발송
            server.send_message(msg)
            
            # 연결 종료
            server.quit()
            
            print(f"이메일 발송 성공: {msg['To']}")
            return True
            
        except Exception as e:
            print(f"이메일 발송 실패: {str(e)}")
            return False
    
    def test_connection(self) -> bool:
        """SMTP 연결 테스트"""
        try:
            if self.use_tls:
                server = smtplib.SMTP(self.smtp_server, self.smtp_port)
                server.starttls()
            else:
                server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            
            server.login(self.username, self.password)
            server.quit()
            
            print("SMTP 연결 테스트 성공")
            return True
            
        except Exception as e:
            print(f"SMTP 연결 테스트 실패: {str(e)}")
            return False

# 싱글톤 인스턴스
email_service = EmailService()
