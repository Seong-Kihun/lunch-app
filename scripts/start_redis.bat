@echo off
echo 🚀 Redis 서버 시작 스크립트
echo ================================

echo Docker가 설치되어 있는지 확인합니다...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker가 설치되어 있지 않습니다.
    echo Docker Desktop을 설치해주세요: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

echo ✅ Docker가 설치되어 있습니다.

echo.
echo Redis 컨테이너를 시작합니다...
docker-compose up -d redis

echo.
echo Redis 연결을 테스트합니다...
timeout /t 5 /nobreak >nul

echo.
echo Redis 상태 확인:
docker-compose ps

echo.
echo 🎉 Redis 서버가 시작되었습니다!
echo.
echo 📝 사용 가능한 서비스:
echo   - Redis 서버: localhost:6379
echo   - Redis Commander (웹 UI): http://localhost:8081
echo.
echo Redis를 중지하려면: docker-compose down
echo.
pause
