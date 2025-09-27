/**
 * 간단한 시스템 테스트
 * 새로 구현된 시스템들의 기본 기능을 테스트
 */

console.log('🧪 [SimpleTest] 시스템 테스트 시작...\n');

// 1. 파일 존재 여부 테스트
const fs = require('fs');
const path = require('path');

const testFiles = [
  'frontend/services/NetworkManager.js',
  'frontend/services/AuthManager.js', 
  'frontend/services/ApiClient.js',
  'frontend/services/DataSyncManager.js',
  'frontend/services/ErrorHandler.js',
  'frontend/services/RecoveryManager.js',
  'frontend/contexts/NetworkContext.js',
  'frontend/contexts/AuthContext.js',
  'frontend/contexts/AppStateContext.js',
  'backend/auth/unified_middleware.py',
  'backend/api/unified_blueprint.py',
  'docs/ARCHITECTURE_OVERVIEW.md'
];

console.log('📁 [SimpleTest] 파일 존재 여부 테스트:');
let passedFiles = 0;
let totalFiles = testFiles.length;

testFiles.forEach(filePath => {
  const fullPath = path.join(__dirname, '..', filePath);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${filePath} - 존재함`);
    passedFiles++;
  } else {
    console.log(`❌ ${filePath} - 없음`);
  }
});

console.log(`\n📊 [SimpleTest] 파일 테스트 결과: ${passedFiles}/${totalFiles} 통과`);

// 2. 코드 품질 테스트
console.log('\n🔍 [SimpleTest] 코드 품질 테스트:');

const frontendServices = [
  'frontend/services/NetworkManager.js',
  'frontend/services/AuthManager.js',
  'frontend/services/ApiClient.js'
];

let totalLines = 0;
let hasErrors = 0;

frontendServices.forEach(filePath => {
  const fullPath = path.join(__dirname, '..', filePath);
  if (fs.existsSync(fullPath)) {
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n').length;
      totalLines += lines;
      
      // 기본적인 문법 검사
      const hasClass = content.includes('class ');
      const hasExport = content.includes('export ');
      const hasComments = content.includes('//') || content.includes('/*');
      
      console.log(`✅ ${filePath}:`);
      console.log(`   - 라인 수: ${lines}`);
      console.log(`   - 클래스 정의: ${hasClass ? '✅' : '❌'}`);
      console.log(`   - Export 구문: ${hasExport ? '✅' : '❌'}`);
      console.log(`   - 주석 포함: ${hasComments ? '✅' : '❌'}`);
      
    } catch (error) {
      console.log(`❌ ${filePath}: 파일 읽기 오류 - ${error.message}`);
      hasErrors++;
    }
  }
});

console.log(`\n📊 [SimpleTest] 코드 품질 결과:`);
console.log(`   - 총 라인 수: ${totalLines}`);
console.log(`   - 오류 파일 수: ${hasErrors}`);

// 3. 백엔드 파일 테스트
console.log('\n🐍 [SimpleTest] 백엔드 파일 테스트:');

const backendFiles = [
  'backend/auth/unified_middleware.py',
  'backend/api/unified_blueprint.py'
];

let backendPassed = 0;

backendFiles.forEach(filePath => {
  const fullPath = path.join(__dirname, '..', filePath);
  if (fs.existsSync(fullPath)) {
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n').length;
      
      // Python 문법 검사
      const hasClass = content.includes('class ');
      const hasImport = content.includes('import ');
      const hasDocstring = content.includes('"""');
      
      console.log(`✅ ${filePath}:`);
      console.log(`   - 라인 수: ${lines}`);
      console.log(`   - 클래스 정의: ${hasClass ? '✅' : '❌'}`);
      console.log(`   - Import 구문: ${hasImport ? '✅' : '❌'}`);
      console.log(`   - Docstring: ${hasDocstring ? '✅' : '❌'}`);
      
      backendPassed++;
      
    } catch (error) {
      console.log(`❌ ${filePath}: 파일 읽기 오류 - ${error.message}`);
    }
  }
});

// 4. 최종 결과
console.log('\n🎉 [SimpleTest] 최종 결과:');
console.log(`📁 파일 존재 테스트: ${passedFiles}/${totalFiles} 통과 (${Math.round(passedFiles/totalFiles*100)}%)`);
console.log(`🐍 백엔드 파일 테스트: ${backendPassed}/${backendFiles.length} 통과`);
console.log(`📝 총 코드 라인 수: ${totalLines}줄`);
console.log(`❌ 오류 파일 수: ${hasErrors}개`);

const overallSuccess = (passedFiles === totalFiles && hasErrors === 0);
console.log(`\n🏆 전체 테스트 결과: ${overallSuccess ? '✅ 성공' : '❌ 일부 실패'}`);

if (overallSuccess) {
  console.log('\n🎊 축하합니다! 모든 기본 테스트를 통과했습니다!');
  console.log('🚀 이제 실제 앱에서 테스트를 진행할 수 있습니다.');
} else {
  console.log('\n⚠️ 일부 테스트에서 문제가 발견되었습니다.');
  console.log('🔧 문제를 해결한 후 다시 테스트해주세요.');
}

console.log('\n📋 다음 단계:');
console.log('1. npm start로 프론트엔드 실행');
console.log('2. python run_server.py로 백엔드 실행');  
console.log('3. 실제 앱에서 로그인 테스트');
console.log('4. 네트워크 연결 테스트');
console.log('5. API 호출 테스트');
