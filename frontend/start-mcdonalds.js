#!/usr/bin/env node
/**
 * 맥도날드 WiFi 환경에서 Expo 개발 서버 시작 스크립트
 * 네트워크 제한을 우회하여 개발 환경을 설정합니다.
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🍟 맥도날드 WiFi 개발 환경 설정');
console.log('================================');

// 환경변수 설정
process.env.EXPO_OFFLINE = 'true';
process.env.EXPO_NO_TELEMETRY = 'true';
process.env.EXPO_NO_UPDATE_CHECK = 'true';

// Metro bundler 설정
process.env.METRO_NO_CACHE = 'true';
process.env.METRO_OFFLINE = 'true';

console.log('✅ 오프라인 모드 환경변수 설정 완료');

// Expo 시작 옵션
const expoOptions = [
  'start',
  '--tunnel'  // 터널 모드 사용 (맥도날드 WiFi에서 가장 안정적)
];

console.log('🚀 Expo 서버 시작 중...');
console.log('옵션:', expoOptions.join(' '));

// Expo 프로세스 시작
const expoProcess = spawn('npx', ['expo', ...expoOptions], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

// 프로세스 종료 처리
expoProcess.on('close', (code) => {
  console.log(`\n⏹️ Expo 서버가 종료되었습니다 (코드: ${code})`);
});

expoProcess.on('error', (error) => {
  console.error('❌ Expo 서버 시작 실패:', error);
});

// Ctrl+C 처리
process.on('SIGINT', () => {
  console.log('\n🛑 서버를 중지합니다...');
  expoProcess.kill('SIGINT');
  process.exit(0);
});

console.log('\n💡 사용법:');
console.log('1. QR 코드를 스캔하여 앱을 실행하세요');
console.log('2. 네트워크 오류가 발생하면 앱을 새로고침하세요');
console.log('3. Ctrl+C로 서버를 중지할 수 있습니다');
console.log('\n🔧 문제 해결:');
console.log('- 백엔드 서버가 실행 중인지 확인: https://lunch-app-backend-ra12.onrender.com');
console.log('- 같은 WiFi 네트워크에 연결되어 있는지 확인');
console.log('- 방화벽 설정 확인');
