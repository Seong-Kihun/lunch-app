# 🍟 맥도날드에서 개발하기 가이드

맥도날드 WiFi에서 발생하는 네트워크 문제를 해결하는 완전한 가이드입니다.

## 🚨 문제 상황

맥도날드 WiFi에서는 다음과 같은 제한이 있습니다:
- **포트 제한**: Redis(6379), 일부 개발 포트 차단
- **외부 API 제한**: Expo 서버, 일부 외부 서비스 접근 불가
- **네트워크 타임아웃**: 불안정한 연결로 인한 fetch 실패

## ✅ 해결 방법

### 1. 백엔드 서버 시작 (오프라인 모드)

```bash
# 터미널 1에서
$env:OFFLINE_MODE="true"
python app.py
```

**확인사항:**
- ✅ `http://192.168.10.54:5000` 접속 가능
- ✅ "오프라인 모드" 메시지 표시
- ✅ Redis 경고는 무시해도 됨

### 2. 프론트엔드 서버 시작 (맥도날드 모드)

```bash
# 터미널 2에서
cd lunch_app_frontend
npm run start:mcdonalds
```

**또는 수동으로:**
```bash
npx expo start --offline --tunnel
```

### 3. 모바일 앱 연결

1. **QR 코드 스캔** 또는 **Expo Go 앱** 사용
2. **네트워크 오류 발생 시**:
   - 앱을 새로고침 (Pull to refresh)
   - Expo Go에서 "Reload" 버튼 클릭
   - 앱을 완전히 종료 후 재시작

## 🔧 문제 해결

### 백엔드 연결 실패
```bash
# 백엔드 상태 확인
curl http://192.168.10.54:5000/health

# IP 주소 확인 (Windows)
ipconfig | findstr "IPv4"
```

### 프론트엔드 연결 실패
```bash
# Expo 캐시 클리어
npx expo start --clear

# 오프라인 모드로 강제 시작
npx expo start --offline --tunnel
```

### 모바일 앱 연결 실패
1. **같은 WiFi 네트워크** 확인
2. **방화벽 설정** 확인 (Windows Defender)
3. **핫스팟 사용** 고려

## 📱 모바일 앱 설정

### Android
- **개발자 옵션** 활성화
- **USB 디버깅** 활성화
- **Expo Go** 앱 설치

### iOS
- **Expo Go** 앱 설치
- **카메라**로 QR 코드 스캔

## 🎯 성공 확인

### 백엔드 정상 작동
```json
{
  "status": "healthy",
  "database": "healthy (without auth)",
  "auth_system": false
}
```

### 프론트엔드 정상 작동
- QR 코드 표시
- Metro bundler 실행
- "Metro waiting on exp://..." 메시지

### 모바일 앱 정상 작동
- 앱이 정상 로드됨
- "Could not connect to server" 오류 없음
- API 호출 성공

## 🚀 빠른 시작 명령어

```bash
# 1. 백엔드 시작
$env:OFFLINE_MODE="true"; python app.py

# 2. 프론트엔드 시작 (새 터미널)
cd lunch_app_frontend && npm run start:mcdonalds

# 3. 브라우저에서 백엔드 확인
start http://192.168.10.54:5000
```

## 💡 추가 팁

### 네트워크 문제 지속 시
1. **핫스팟 사용**: 모바일 데이터로 핫스팟 생성
2. **VPN 사용**: 안정적인 네트워크 연결
3. **다른 카페**: 네트워크 제한이 적은 곳

### 개발 효율성
1. **오프라인 모드**: 불필요한 네트워크 요청 최소화
2. **캐시 활용**: 로컬 데이터로 개발
3. **핵심 기능 우선**: 네트워크 의존성 적은 기능부터

## 🔍 디버깅

### 로그 확인
```bash
# 백엔드 로그
# 터미널에서 실시간 확인

# 프론트엔드 로그
# Expo 개발자 도구에서 확인
```

### 네트워크 상태 확인
```bash
# 포트 사용 확인
netstat -an | findstr :5000
netstat -an | findstr :8081

# 연결 테스트
ping 192.168.10.54
```

---

**🎉 이제 맥도날드에서도 편안하게 개발하세요!**

문제가 지속되면 이 가이드를 다시 확인하거나, 핫스팟을 사용해보세요.
