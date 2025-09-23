@echo off
echo 🛑 Redis 서버 중지 스크립트
echo ================================

echo Redis 컨테이너를 중지합니다...
docker-compose down

echo.
echo Redis 데이터는 보존됩니다.
echo 완전히 삭제하려면: docker-compose down -v
echo.
pause
