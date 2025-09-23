#!/usr/bin/env node

/**
 * 모바일 개발용 시작 스크립트
 * 장소를 옮겨다닐 때 사용하는 스마트한 시작 스크립트
 */

const { execSync } = require('child_process');
const os = require('os');

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

// Expo 서버 시작 옵션 결정
function getStartOptions() {
  const args = process.argv.slice(2);
  
  // 사용자가 옵션을 지정한 경우
  if (args.length > 0) {
    return args.join(' ');
  }
  
  // 자동 감지
  const interfaces = getNetworkInterfaces();
  
  if (interfaces.length === 0) {
    console.log('⚠️  [Warning] 네트워크 인터페이스를 찾을 수 없습니다. localhost 모드로 시작합니다.');
    return '--host localhost';
  }
  
  // WiFi 인터페이스 우선 선택
  const wifiInterface = interfaces.find(iface => 
    iface.name.toLowerCase().includes('wifi') || 
    iface.name.toLowerCase().includes('wireless') ||
    iface.name.toLowerCase().includes('en0') // macOS WiFi
  );
  
  if (wifiInterface) {
    console.log(`✅ [Auto] WiFi 인터페이스 감지: ${wifiInterface.address}`);
    return '--host tunnel'; // 터널 모드가 가장 안정적
  }
  
  // 첫 번째 유효한 인터페이스 사용
  const firstInterface = interfaces[0];
  console.log(`✅ [Auto] 첫 번째 인터페이스 사용: ${firstInterface.address}`);
  return '--host tunnel';
}

// 메인 실행 함수
function main() {
  try {
    // 네트워크 정보 표시
    displayNetworkInfo();
    
    // 시작 옵션 결정
    const startOptions = getStartOptions();
    
    console.log('🔧 [Config] Expo 서버 시작 옵션:', startOptions);
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
  --help, -h        이 도움말 표시

예시:
  node start-mobile.js                    # 자동 감지
  node start-mobile.js --host tunnel     # 터널 모드
  node start-mobile.js --host lan        # LAN 모드

💡 팁:
  - 장소를 옮겨다닐 때는 터널 모드(--host tunnel)를 사용하세요
  - 같은 네트워크에서만 사용할 때는 LAN 모드(--host lan)를 사용하세요
  - 네트워크 문제가 있을 때는 로컬 모드(--host localhost)를 사용하세요
`);
  process.exit(0);
}

// 스크립트 실행
main();
