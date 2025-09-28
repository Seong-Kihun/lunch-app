#!/usr/bin/env node

/**
 * 모바일 개발용 시작 스크립트
 * 장소를 옮겨다닐 때 사용하는 스마트한 시작 스크립트
 */

const { execSync } = require('child_process');
const os = require('os');
const https = require('https');

console.log('🚀 [Mobile Dev] 모바일 개발 서버 시작 중...\n');

// 네트워크 인터페이스 정보 가져오기
function getNetworkInterfaces() {
  const interfaces = os.networkInterfaces();
  const validInterfaces = [];
  
  Object.keys(interfaces).forEach(name => {
    interfaces[name].forEach(iface => {
      if (iface.family === 'IPv4' && !iface.internal) {
        validInterfaces.push({
          name: name,
          address: iface.address,
          cidr: iface.cidr
        });
      }
    });
  });
  
  return validInterfaces;
}

// 네트워크 연결성 테스트
function testNetworkConnectivity() {
  return new Promise((resolve) => {
    console.log('🔍 [Network] 네트워크 연결성 테스트 중...');
    
    const options = {
      hostname: 'registry.npmjs.org',
      port: 443,
      path: '/',
      method: 'HEAD',
      timeout: 5000
    };
    
    const req = https.request(options, (res) => {
      console.log('✅ [Network] 네트워크 연결성 확인됨');
      resolve(true);
    });
    
    req.on('error', (error) => {
      console.log('⚠️ [Network] 네트워크 연결성 테스트 실패:', error.message);
      resolve(false);
    });
    
    req.on('timeout', () => {
      console.log('⚠️ [Network] 네트워크 연결성 테스트 타임아웃');
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

// 사용 가능한 네트워크 인터페이스 표시
function displayNetworkInfo() {
  console.log('📡 [Network] 사용 가능한 네트워크 인터페이스:');
  const interfaces = getNetworkInterfaces();
  
  if (interfaces.length === 0) {
    console.log('   ❌ 사용 가능한 네트워크 인터페이스가 없습니다.');
    return;
  }
  
  interfaces.forEach((iface, index) => {
    console.log(`   ${index + 1}. ${iface.name}: ${iface.address} (${iface.cidr})`);
  });
  console.log('');
}

// Expo 서버 시작 옵션 결정 (네트워크 연결성 기반)
async function getStartOptions() {
  const args = process.argv.slice(2);
  
  // 사용자가 옵션을 지정한 경우
  if (args.length > 0) {
    return args.join(' ');
  }
  
  // 네트워크 연결성 테스트
  const isNetworkAvailable = await testNetworkConnectivity();
  
  // 자동 감지
  const interfaces = getNetworkInterfaces();
  
  if (interfaces.length === 0) {
    console.log('⚠️  [Warning] 네트워크 인터페이스를 찾을 수 없습니다. localhost 모드로 시작합니다.');
    return isNetworkAvailable ? '--host localhost' : '--host localhost --offline';
  }
  
  // WiFi 인터페이스 우선 선택
  const wifiInterface = interfaces.find(iface => 
    iface.name.toLowerCase().includes('wifi') || 
    iface.name.toLowerCase().includes('wireless') ||
    iface.name.toLowerCase().includes('en0') // macOS WiFi
  );
  
  if (wifiInterface) {
    console.log(`✅ [Auto] WiFi 인터페이스 감지: ${wifiInterface.address}`);
    
    if (isNetworkAvailable) {
      console.log('🌐 [Auto] 네트워크 연결성 확인됨 - 온라인 모드로 시작');
      return '--host lan';
    } else {
      console.log('📴 [Auto] 네트워크 연결성 없음 - 오프라인 모드로 시작');
      return '--host lan --offline';
    }
  }
  
  // 첫 번째 유효한 인터페이스 사용
  const firstInterface = interfaces[0];
  console.log(`✅ [Auto] 첫 번째 인터페이스 사용: ${firstInterface.address}`);
  
  if (isNetworkAvailable) {
    console.log('🌐 [Auto] 네트워크 연결성 확인됨 - 온라인 모드로 시작');
    return '--host lan';
  } else {
    console.log('📴 [Auto] 네트워크 연결성 없음 - 오프라인 모드로 시작');
    return '--host lan --offline';
  }
}

// 메인 실행 함수
async function main() {
  try {
    // 네트워크 정보 표시
    displayNetworkInfo();
    
    // 시작 옵션 결정 (네트워크 연결성 테스트 포함)
    const startOptions = await getStartOptions();
    
    console.log('🔧 [Config] Expo 서버 시작 옵션:', startOptions);
    
    // 모드별 안내
    if (startOptions.includes('--offline')) {
      console.log('🔧 [Info] 오프라인 모드로 시작합니다. 네트워크 의존성 검증을 건너뜁니다.');
      console.log('⚠️  [Warning] 오프라인 모드에서는 일부 기능이 제한될 수 있습니다:');
      console.log('   - Hot Reload 제한');
      console.log('   - 패키지 설치 제한');
      console.log('   - Expo 업데이트 제한');
      console.log('   - 외부 API 테스트는 정상 작동');
    } else {
      console.log('🌐 [Info] 온라인 모드로 시작합니다. 모든 기능을 사용할 수 있습니다.');
    }
    
    console.log('📱 [Mobile] 모바일 앱에서 QR 코드를 스캔하거나 Expo Go 앱을 사용하세요.\n');
    
    // Expo 서버 시작
    const command = `npx expo start ${startOptions}`;
    console.log(`▶️  [Command] 실행 중: ${command}\n`);
    
    execSync(command, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
  } catch (error) {
    console.error('❌ [Error] 서버 시작 실패:', error.message);
    process.exit(1);
  }
}

// 도움말 표시
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
🚀 모바일 개발 서버 시작 스크립트

사용법:
  node start-mobile.js [옵션]

옵션:
  --host tunnel     터널 모드 (권장) - 어디서든 접근 가능
  --host lan        LAN 모드 - 같은 네트워크에서만 접근 가능
  --host localhost  로컬 모드 - 같은 컴퓨터에서만 접근 가능
  --offline         오프라인 모드 - 네트워크 의존성 검증 건너뛰기
  --help, -h        이 도움말 표시

예시:
  node start-mobile.js                    # 자동 감지 (오프라인 모드 포함)
  node start-mobile.js --host tunnel     # 터널 모드
  node start-mobile.js --host lan        # LAN 모드
  node start-mobile.js --offline         # 오프라인 모드

💡 팁:
  - 스크립트가 자동으로 네트워크 연결성을 테스트하여 최적 모드 선택
  - 네트워크가 연결되어 있으면 온라인 모드 (모든 기능 사용 가능)
  - 네트워크가 연결되지 않으면 오프라인 모드 (기본 기능만 사용)
  - 수동으로 모드를 지정하려면 옵션을 직접 입력하세요

🌐 온라인 모드 (권장):
  - Hot Reload 정상 작동
  - 패키지 설치 가능
  - Expo 업데이트 가능
  - 모든 개발 기능 사용 가능

📴 오프라인 모드:
  - 네트워크 의존성 검증 건너뛰기
  - 기본 개발 기능만 사용
  - 백엔드 API 호출은 정상 작동
`);
  process.exit(0);
}

// 스크립트 실행
main();
