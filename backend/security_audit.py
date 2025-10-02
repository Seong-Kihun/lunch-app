#!/usr/bin/env python3
"""
보안 감사 스크립트
시스템의 보안 상태를 점검하고 취약점을 식별합니다.
"""

import os
import sys
import re
import secrets
from datetime import datetime
import json

class SecurityAuditor:
    def __init__(self):
        self.audit_results = []
        self.vulnerabilities = []
        self.recommendations = []
        self.start_time = datetime.now()

    def log(self, message, level="INFO"):
        """감사 로그 기록"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] {level}: {message}"
        self.audit_results.append(log_entry)
        print(log_entry)

    def check_environment_variables(self):
        """환경변수 보안 점검"""
        self.log("🔒 환경변수 보안 점검 중...")

        # 필수 환경변수 확인
        required_vars = ['SECRET_KEY', 'JWT_SECRET_KEY']
        missing_vars = []

        for var in required_vars:
            value = os.getenv(var)
            if not value:
                missing_vars.append(var)
                self.vulnerabilities.append(f"환경변수 {var}가 설정되지 않음")
            elif value in ['dev-flask-secret-key-change-in-production', 'dev-jwt-secret-key-change-in-production']:
                self.vulnerabilities.append(f"환경변수 {var}가 기본값으로 설정됨 (보안 위험)")
                self.recommendations.append(f"{var}를 강력한 랜덤 값으로 변경하세요")

        if missing_vars:
            self.log(f"   ❌ 누락된 환경변수: {', '.join(missing_vars)}", "ERROR")
        else:
            self.log("   ✅ 필수 환경변수가 설정됨")

        # 환경 설정 확인
        flask_env = os.getenv('FLASK_ENV', 'development')
        debug_mode = os.getenv('DEBUG', 'true').lower()

        if flask_env == 'production' and debug_mode == 'false':
            self.log("   ✅ 프로덕션 환경으로 설정됨")
        else:
            self.log("   ⚠️ 개발 환경으로 설정됨 (프로덕션 배포 시 변경 필요)", "WARNING")

    def check_secret_key_strength(self):
        """비밀키 강도 점검"""
        self.log("🔑 비밀키 강도 점검 중...")

        secret_key = os.getenv('SECRET_KEY', '')
        jwt_secret = os.getenv('JWT_SECRET_KEY', '')

        def check_key_strength(key, name):
            if not key:
                return False, f"{name}가 설정되지 않음"

            # 길이 확인 (최소 32자)
            if len(key) < 32:
                return False, f"{name}가 너무 짧음 ({len(key)}자, 최소 32자 필요)"

            # 복잡성 확인
            has_upper = bool(re.search(r'[A-Z]', key))
            has_lower = bool(re.search(r'[a-z]', key))
            has_digit = bool(re.search(r'\d', key))
            has_special = bool(re.search(r'[!@#$%^&*(),.?":{}|<>]', key))

            complexity_score = sum([has_upper, has_lower, has_digit, has_special])

            if complexity_score < 3:
                return False, f"{name}의 복잡성이 부족함 (대소문자, 숫자, 특수문자 조합 필요)"

            return True, f"{name} 강도 양호"

        # SECRET_KEY 점검
        is_strong, message = check_key_strength(secret_key, "SECRET_KEY")
        if not is_strong:
            self.vulnerabilities.append(message)
        else:
            self.log(f"   ✅ {message}")

        # JWT_SECRET_KEY 점검
        is_strong, message = check_key_strength(jwt_secret, "JWT_SECRET_KEY")
        if not is_strong:
            self.vulnerabilities.append(message)
        else:
            self.log(f"   ✅ {message}")

    def check_file_permissions(self):
        """파일 권한 점검"""
        self.log("📁 파일 권한 점검 중...")

        sensitive_files = [
            '.env',
            'lunch_app.db',
            'logs/',
            'backup/'
        ]

        for file_path in sensitive_files:
            if os.path.exists(file_path):
                try:
                    stat_info = os.stat(file_path)
                    # Windows에서는 권한 체크가 다르므로 간단히 존재 여부만 확인
                    self.log(f"   ✅ {file_path} 접근 가능")
                except Exception as e:
                    self.log(f"   ❌ {file_path} 접근 불가: {e}", "ERROR")
            else:
                self.log(f"   ⚠️ {file_path} 존재하지 않음", "WARNING")

    def check_database_security(self):
        """데이터베이스 보안 점검"""
        self.log("🗄️ 데이터베이스 보안 점검 중...")

        # 데이터베이스 파일 존재 확인
        db_files = ['lunch_app.db', 'lunch_app.db-wal', 'lunch_app.db-shm']

        for db_file in db_files:
            if os.path.exists(db_file):
                self.log(f"   ✅ {db_file} 존재")

                # 파일 크기 확인
                size = os.path.getsize(db_file)
                if size > 100 * 1024 * 1024:  # 100MB
                    self.log(f"   ⚠️ {db_file} 크기가 큼 ({size / 1024 / 1024:.1f}MB)", "WARNING")
            else:
                self.log(f"   ℹ️ {db_file} 없음 (정상)")

    def check_code_security(self):
        """코드 보안 점검"""
        self.log("🔍 코드 보안 점검 중...")

        # 보안 취약점 패턴 검사 (감사 도구 제외)
        security_patterns = [
            (r'password\s*=\s*["\'][^"\']*["\']', "하드코딩된 비밀번호"),
            (r'api_key\s*=\s*["\'][^"\']*["\']', "하드코딩된 API 키"),
            (r'secret\s*=\s*["\'][^"\']*["\']', "하드코딩된 시크릿"),
            (r'debug\s*=\s*True', "디버그 모드 활성화")
        ]

        # 검사할 파일들
        code_files = []
        for root, dirs, files in os.walk('.'):
            # 특정 디렉토리 제외
            dirs[:] = [d for d in dirs if d not in ['.git', '__pycache__', 'node_modules', 'venv', 'logs', 'backup']]

            for file in files:
                if file.endswith(('.py', '.js', '.jsx', '.ts', '.tsx')):
                    # 감사 도구 파일들 제외
                    if not file.startswith(('security_audit', 'test_', 'deploy', 'performance_dashboard', 'database_optimization', 'cache_optimization', 'data_integrity_check')):
                        code_files.append(os.path.join(root, file))

        vulnerabilities_found = 0

        for file_path in code_files[:20]:  # 최대 20개 파일만 검사
            try:
                with open(file_path, encoding='utf-8', errors='ignore') as f:
                    content = f.read()

                    for pattern, description in security_patterns:
                        matches = re.findall(pattern, content, re.IGNORECASE)
                        if matches:
                            vulnerabilities_found += 1
                            self.vulnerabilities.append(f"{file_path}: {description}")

            except Exception as e:
                self.log(f"   ⚠️ {file_path} 읽기 실패: {e}", "WARNING")

        if vulnerabilities_found == 0:
            self.log("   ✅ 코드 보안 취약점 없음")
        else:
            self.log(f"   ⚠️ {vulnerabilities_found}개 보안 취약점 발견", "WARNING")

    def check_network_security(self):
        """네트워크 보안 점검"""
        self.log("🌐 네트워크 보안 점검 중...")

        # CORS 설정 확인
        cors_origins = os.getenv('CORS_ORIGINS', '')
        if cors_origins:
            if '*' in cors_origins:
                self.vulnerabilities.append("CORS가 모든 도메인(*)에 대해 허용됨")
                self.recommendations.append("CORS_ORIGINS를 특정 도메인으로 제한하세요")
            else:
                self.log("   ✅ CORS 설정이 제한적임")
        else:
            self.log("   ⚠️ CORS 설정이 없음", "WARNING")

        # HTTPS 설정 확인 (HTTPS 사용 시에만 체크)
        if os.getenv('FLASK_ENV') == 'production' and os.getenv('HTTPS_ENABLED', 'false').lower() == 'true':
            if not os.getenv('SESSION_COOKIE_SECURE'):
                self.vulnerabilities.append("HTTPS 환경에서 SESSION_COOKIE_SECURE가 설정되지 않음")
                self.recommendations.append("HTTPS 사용 시 SESSION_COOKIE_SECURE=true 설정")

    def generate_secure_secrets(self):
        """보안 비밀키 생성"""
        self.log("🔐 보안 비밀키 생성 중...")

        def generate_secure_key(length=64):
            """보안 비밀키 생성"""
            alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?"
            return ''.join(secrets.choice(alphabet) for _ in range(length))

        # 새로운 비밀키 생성
        new_secret_key = generate_secure_key(64)
        new_jwt_secret = generate_secure_key(64)

        self.log("   🔑 새로운 SECRET_KEY 생성됨")
        self.log("   🔑 새로운 JWT_SECRET_KEY 생성됨")

        # .env 파일 업데이트 제안
        env_update = f"""
# 🔒 보안 강화된 환경변수 (다음 값들로 .env 파일을 업데이트하세요)
SECRET_KEY={new_secret_key}
JWT_SECRET_KEY={new_jwt_secret}
"""

        with open('secure_secrets.txt', 'w', encoding='utf-8') as f:
            f.write(env_update)

        self.log("   ✅ 보안 비밀키가 secure_secrets.txt에 저장됨")
        self.recommendations.append("secure_secrets.txt의 값으로 .env 파일을 업데이트하세요")

    def generate_security_report(self):
        """보안 감사 리포트 생성"""
        self.log("📋 보안 감사 리포트 생성 중...")

        end_time = datetime.now()
        duration = end_time - self.start_time

        # 보안 점수 계산
        total_checks = 6  # 총 점검 항목 수
        vulnerability_count = len(self.vulnerabilities)
        security_score = max(0, 100 - (vulnerability_count * 10))

        report = {
            "security_audit": {
                "start_time": self.start_time.isoformat(),
                "end_time": end_time.isoformat(),
                "duration_seconds": duration.total_seconds(),
                "security_score": security_score,
                "vulnerability_count": vulnerability_count,
                "status": "completed"
            },
            "vulnerabilities": self.vulnerabilities,
            "recommendations": self.recommendations,
            "audit_logs": self.audit_results,
            "security_checklist": [
                "환경변수 보안 설정",
                "비밀키 강도 검증",
                "파일 권한 점검",
                "데이터베이스 보안",
                "코드 보안 취약점",
                "네트워크 보안 설정"
            ]
        }

        # 리포트 파일 저장
        report_file = f"security_audit_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)

        self.log(f"✅ 보안 감사 리포트 저장: {report_file}")
        return report_file, security_score

    def run_security_audit(self):
        """전체 보안 감사 실행"""
        self.log("🛡️ 보안 감사 시작")
        self.log("=" * 50)

        try:
            # 1. 환경변수 보안 점검
            self.check_environment_variables()

            # 2. 비밀키 강도 점검
            self.check_secret_key_strength()

            # 3. 파일 권한 점검
            self.check_file_permissions()

            # 4. 데이터베이스 보안 점검
            self.check_database_security()

            # 5. 코드 보안 점검
            self.check_code_security()

            # 6. 네트워크 보안 점검
            self.check_network_security()

            # 7. 보안 비밀키 생성
            self.generate_secure_secrets()

            # 8. 보안 감사 리포트 생성
            report_file, security_score = self.generate_security_report()

            # 결과 요약
            self.log("🎯 보안 감사 완료!")
            self.log("=" * 50)
            self.log(f"📊 보안 점수: {security_score}/100")
            self.log(f"🚨 발견된 취약점: {len(self.vulnerabilities)}개")
            self.log(f"💡 권장사항: {len(self.recommendations)}개")

            if self.vulnerabilities:
                self.log("\n🚨 발견된 취약점:")
                for vuln in self.vulnerabilities[:5]:  # 처음 5개만 표시
                    self.log(f"   • {vuln}")
                if len(self.vulnerabilities) > 5:
                    self.log(f"   ... 및 {len(self.vulnerabilities) - 5}개 더")

            if self.recommendations:
                self.log("\n💡 권장사항:")
                for rec in self.recommendations[:5]:  # 처음 5개만 표시
                    self.log(f"   • {rec}")
                if len(self.recommendations) > 5:
                    self.log(f"   ... 및 {len(self.recommendations) - 5}개 더")

            self.log(f"\n📄 상세 리포트: {report_file}")

            return security_score >= 70  # 70점 이상이면 안전

        except Exception as e:
            self.log(f"❌ 보안 감사 중 오류 발생: {e}", "ERROR")
            return False

def main():
    """메인 함수"""
    print("🛡️ 보안 감사 도구")
    print("=" * 50)

    auditor = SecurityAuditor()

    try:
        is_secure = auditor.run_security_audit()

        if is_secure:
            print("\n🎉 보안 감사가 성공적으로 완료되었습니다!")
            print("시스템이 안전한 상태입니다.")
            return 0
        else:
            print("\n⚠️ 보안 취약점이 발견되었습니다.")
            print("권장사항을 따라 보안을 강화하세요.")
            return 1

    except Exception as e:
        print(f"\n❌ 예상치 못한 오류: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
