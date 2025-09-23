# 🔒 보안 설정 가이드

## 🚨 긴급 보안 설정 필요

보안 감사 결과 **보안 점수 20/100**으로 매우 위험한 상태입니다. 다음 설정을 즉시 적용하세요.

## 🔑 1. 보안 비밀키 설정

다음 값들을 `.env` 파일에 설정하세요:

```bash
# 🔒 보안 강화된 환경변수
SECRET_KEY=!+)-l8e*a_5e7fz@6KHl7@sPh(mV026?&u9N%*FlE<67^^!tN!M{KtuGO0>v3Zg4
JWT_SECRET_KEY=1lHe*dxr;)vM>c-S2dJMu7WyxShm*RBt%4pk_L.wQF3jAUkR_}P@{+f9PWt=y({j

# 🌍 프로덕션 환경 설정
FLASK_ENV=production
ENV=production
DEBUG=false

# 🔐 보안 쿠키 설정
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_HTTPONLY=true
SESSION_COOKIE_SAMESITE=Strict

# 🌐 CORS 보안 설정
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

## 🛡️ 2. 발견된 보안 취약점

### **🚨 심각한 취약점 (즉시 수정 필요)**
1. **환경변수 미설정**: SECRET_KEY, JWT_SECRET_KEY가 설정되지 않음
2. **디버그 모드 활성화**: 프로덕션에서 디버그 모드가 켜져 있음
3. **CORS 설정 없음**: 모든 도메인에서 접근 가능
4. **기본 비밀키 사용**: 보안이 취약한 기본값 사용

### **⚠️ 중간 위험도 취약점**
1. **개발 환경 설정**: 프로덕션에서 개발 환경으로 설정됨
2. **보안 쿠키 미설정**: HTTPS에서 보안 쿠키 미사용

## 🔧 3. 보안 강화 단계

### **단계 1: 환경변수 설정**
```bash
# .env 파일 생성 또는 편집
nano .env

# 위의 보안 비밀키 값들을 복사하여 붙여넣기
```

### **단계 2: 프로덕션 설정**
```bash
# 환경변수 설정
export FLASK_ENV=production
export ENV=production
export DEBUG=false
```

### **단계 3: 보안 검증**
```bash
# 보안 감사 재실행
python security_audit.py

# 보안 점수가 70점 이상이 되도록 설정
```

## 🚀 4. 프로덕션 배포 시 추가 보안 설정

### **웹 서버 설정 (Nginx)**
```nginx
# HTTPS 강제 리다이렉트
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS 설정
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    # 보안 헤더
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
}
```

### **방화벽 설정**
```bash
# 필요한 포트만 개방
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

## 📊 5. 보안 모니터링

### **정기 보안 점검**
```bash
# 주간 보안 감사
python security_audit.py

# 월간 보안 업데이트
pip install --upgrade flask flask-sqlalchemy
```

### **로그 모니터링**
```bash
# 보안 이벤트 로그 확인
tail -f logs/security.log

# 에러 로그 모니터링
tail -f logs/error.log
```

## 🚨 6. 보안 사고 대응

### **침해 발견 시 즉시 조치**
1. **서비스 중단**: `systemctl stop lunch-app`
2. **로그 분석**: `python security_audit.py`
3. **비밀키 재생성**: `python security_audit.py` (새로운 키 생성)
4. **데이터베이스 백업**: `cp lunch_app.db backup/`
5. **시스템 점검**: 모든 보안 설정 재검토

### **복구 절차**
1. 보안 패치 적용
2. 비밀키 재생성 및 적용
3. 데이터베이스 복원
4. 보안 감사 재실행
5. 서비스 재시작

## 📋 7. 보안 체크리스트

### **배포 전 필수 확인사항**
- [ ] SECRET_KEY가 강력한 랜덤 값으로 설정됨
- [ ] JWT_SECRET_KEY가 강력한 랜덤 값으로 설정됨
- [ ] FLASK_ENV=production 설정됨
- [ ] DEBUG=false 설정됨
- [ ] HTTPS 설정 완료
- [ ] CORS 도메인 제한 설정
- [ ] 보안 쿠키 설정 완료
- [ ] 방화벽 설정 완료
- [ ] 보안 감사 점수 70점 이상

### **운영 중 정기 확인사항**
- [ ] 주간 보안 감사 실행
- [ ] 로그 파일 정기 검토
- [ ] 의존성 보안 업데이트
- [ ] 백업 파일 보안 확인
- [ ] 접근 권한 정기 검토

## 🎯 8. 보안 목표

- **보안 점수**: 90점 이상 유지
- **취약점**: 0개 유지
- **보안 사고**: 0건 목표
- **정기 감사**: 주 1회 실행

---

## ⚠️ 중요 알림

**현재 보안 점수가 20/100으로 매우 위험합니다.**
위의 설정을 즉시 적용하여 보안을 강화하세요.

**보안은 선택이 아닌 필수입니다!** 🛡️
