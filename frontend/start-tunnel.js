const { spawn } = require('child_process');

// 터널 모드 환경변수 설정
process.env.NODE_ENV = 'development';
process.env.EXPO_OFFLINE = 'false'; // 터널 모드에서는 오프라인 비활성화
process.env.METRO_NO_CACHE = 'true';
process.env.EXPO_TUNNEL_SUBDOMAIN = 'lunch-app-dev'; // 고정 서브도메인

console.log('🚇 터널 모드 환경변수 설정 완료');
console.log('📡 터널 서브도메인:', process.env.EXPO_TUNNEL_SUBDOMAIN);

// Expo 터널 모드 시작 옵션
const expoOptions = [
  'start',
  '--tunnel',
  '--clear', // 캐시 클리어
  '--no-dev-client', // 개발 클라이언트 비활성화
];

console.log('🚀 Expo 터널 서버 시작 중...');
console.log('옵션:', expoOptions.join(' '));

// Expo 프로세스 시작
const expoProcess = spawn('npx', ['expo', ...expoOptions], {
  cwd: __dirname,
  stdio: 'inherit',
  env: {
    ...process.env,
    // 터널 모드 최적화 환경변수
    EXPO_USE_FAST_RESOLVER: 'true',
    EXPO_USE_METRO_WORKER: 'true',
  }
});

expoProcess.on('close', (code) => {
  console.log(`⏹️ Expo 터널 서버가 종료되었습니다 (코드: ${code})`);
  process.exit(code);
});

expoProcess.on('error', (err) => {
  console.error('❌ Expo 터널 서버 실행 중 오류 발생:', err);
  process.exit(1);
});

console.log('\n💡 터널 모드 사용법:');
console.log('1. QR 코드를 스캔하여 앱을 실행하세요');
console.log('2. 터널 URL을 직접 입력할 수도 있습니다');
console.log('3. 네트워크 오류가 발생하면 앱을 새로고침하세요');
console.log('4. Ctrl+C로 서버를 중지할 수 있습니다');

console.log('\n🔧 문제 해결:');
console.log('- 백엔드 서버가 실행 중인지 확인: https://lunch-app-backend-ra12.onrender.com');
console.log('- 터널 연결 상태 확인');
console.log('- 방화벽 설정 확인');
console.log('- 맥도날드 WiFi에서 터널 모드가 차단될 수 있음');
