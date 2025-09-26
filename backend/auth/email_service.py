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
    
    def send_password_reset_email(self, to_email: str, temp_password: str, user_name: str) -> bool:
        """비밀번호 재설정 이메일 발송"""
        try:
            # 이메일 메시지 생성
            msg = MIMEMultipart('alternative')
            msg['From'] = self.username
            msg['To'] = to_email
            msg['Subject'] = '[밥플떼기] 비밀번호 재설정 안내'
            
            # HTML 내용
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background-color: #3B82F6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
                    .content {{ background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }}
                    .password-box {{ background-color: #e3f2fd; border: 2px solid #3B82F6; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }}
                    .password {{ font-size: 24px; font-weight: bold; color: #3B82F6; letter-spacing: 2px; }}
                    .warning {{ background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0; }}
                    .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 14px; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🍽️ 밥플떼기</h1>
                        <h2>비밀번호 재설정 안내</h2>
                    </div>
                    <div class="content">
                        <p>안녕하세요, <strong>{user_name}</strong>님!</p>
                        
                        <p>밥플떼기에서 비밀번호 재설정을 요청하셨습니다.</p>
                        
                        <div class="password-box">
                            <p><strong>임시 비밀번호</strong></p>
                            <div class="password">{temp_password}</div>
                        </div>
                        
                        <div class="warning">
                            <p><strong>⚠️ 중요 안내사항</strong></p>
                            <ul>
                                <li>위 임시 비밀번호로 로그인하신 후, 반드시 새로운 비밀번호로 변경해주세요.</li>
                                <li>임시 비밀번호는 보안상 안전하지 않으므로 빠른 시일 내에 변경하시기 바랍니다.</li>
                                <li>본인이 요청하지 않은 경우, 즉시 고객센터로 문의해주세요.</li>
                            </ul>
                        </div>
                        
                        <p>로그인 후 마이페이지에서 비밀번호를 변경하실 수 있습니다.</p>
                        
                        <p>감사합니다.<br>밥플떼기 팀 드림</p>
                    </div>
                    <div class="footer">
                        <p>이 이메일은 자동으로 발송되었습니다. 회신하지 마세요.</p>
                        <p>© 2024 밥플떼기. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            # 텍스트 내용
            text_content = f"""
밥플떼기 비밀번호 재설정 안내

안녕하세요, {user_name}님!

밥플떼기에서 비밀번호 재설정을 요청하셨습니다.

임시 비밀번호: {temp_password}

⚠️ 중요 안내사항:
- 위 임시 비밀번호로 로그인하신 후, 반드시 새로운 비밀번호로 변경해주세요.
- 임시 비밀번호는 보안상 안전하지 않으므로 빠른 시일 내에 변경하시기 바랍니다.
- 본인이 요청하지 않은 경우, 즉시 고객센터로 문의해주세요.

로그인 후 마이페이지에서 비밀번호를 변경하실 수 있습니다.

감사합니다.
밥플떼기 팀 드림

---
이 이메일은 자동으로 발송되었습니다. 회신하지 마세요.
© 2024 밥플떼기. All rights reserved.
            """
            
            # HTML과 텍스트 파트 추가
            html_part = MIMEText(html_content, 'html', 'utf-8')
            text_part = MIMEText(text_content, 'plain', 'utf-8')
            
            msg.attach(text_part)
            msg.attach(html_part)
            
            # 이메일 발송
            return self._send_email(msg)
            
        except Exception as e:
            print(f"비밀번호 재설정 이메일 생성 실패: {str(e)}")
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
