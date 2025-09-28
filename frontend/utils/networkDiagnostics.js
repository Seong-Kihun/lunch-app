/**
 * 네트워크 진단 및 디버깅 도구
 * 개발자와 사용자를 위한 네트워크 상태 진단 기능
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

class NetworkDiagnostics {
  constructor() {
    this.diagnostics = [];
  }

  /**
   * 전체 네트워크 진단 실행
   */
  async runFullDiagnostics() {
    console.log('🔍 [NetworkDiagnostics] 전체 네트워크 진단 시작...');
    
    this.diagnostics = [];
    
    // 1. Expo 환경 정보 수집
    await this.diagnoseExpoEnvironment();
    
    // 2. 네트워크 인터페이스 정보 수집
    await this.diagnoseNetworkInterfaces();
    
    // 3. 서버 연결 테스트
    await this.diagnoseServerConnections();
    
    // 4. 진단 결과 출력
    this.displayDiagnostics();
    
    return this.diagnostics;
  }

  /**
   * Expo 환경 진단
   */
  async diagnoseExpoEnvironment() {
    console.log('🔍 [NetworkDiagnostics] Expo 환경 진단...');
    
    const expoInfo = {
      type: 'Expo Environment',
      status: 'info',
      details: {}
    };

    try {
      // Expo Constants 정보
      expoInfo.details.constants = {
        manifest: Constants.manifest ? 'Available' : 'Not Available',
        expoConfig: Constants.expoConfig ? 'Available' : 'Not Available',
        platform: Platform.OS,
        version: Constants.expoVersion || 'Unknown'
      };

      // Host 정보 추출
      if (Constants.manifest?.debuggerHost) {
        expoInfo.details.debuggerHost = Constants.manifest.debuggerHost;
      }
      
      if (Constants.expoConfig?.hostUri) {
        expoInfo.details.hostUri = Constants.expoConfig.hostUri;
      }

      this.diagnostics.push(expoInfo);
    } catch (error) {
      expoInfo.status = 'error';
      expoInfo.details.error = error.message;
      this.diagnostics.push(expoInfo);
    }
  }

  /**
   * 네트워크 인터페이스 진단
   */
  async diagnoseNetworkInterfaces() {
    console.log('🔍 [NetworkDiagnostics] 네트워크 인터페이스 진단...');
    
    const networkInfo = {
      type: 'Network Interfaces',
      status: 'info',
      details: {
        detectedIPs: [],
        suggestedIPs: []
      }
    };

    try {
      // Expo에서 감지된 IP들
      const detectedIPs = [];
      
      if (Constants.expoConfig?.hostUri) {
        const ip = Constants.expoConfig.hostUri.split(':')[0];
        detectedIPs.push(ip);
      }
      
      if (Constants.manifest?.debuggerHost) {
        const ip = Constants.manifest.debuggerHost.split(':')[0];
        detectedIPs.push(ip);
      }

      networkInfo.details.detectedIPs = [...new Set(detectedIPs)];

      // 제안 IP들 (일반적인 네트워크 범위)
      const suggestedIPs = [
        '192.168.0.31', '192.168.0.100', '192.168.0.1',
        '192.168.1.100', '192.168.1.1',
        '10.0.0.100', '10.0.0.1',
        'localhost', '127.0.0.1'
      ];
      
      networkInfo.details.suggestedIPs = suggestedIPs;

      this.diagnostics.push(networkInfo);
    } catch (error) {
      networkInfo.status = 'error';
      networkInfo.details.error = error.message;
      this.diagnostics.push(networkInfo);
    }
  }

  /**
   * 서버 연결 진단
   */
  async diagnoseServerConnections() {
    console.log('🔍 [NetworkDiagnostics] 서버 연결 진단...');
    
    const connectionInfo = {
      type: 'Server Connections',
      status: 'info',
      details: {
        tested: [],
        working: [],
        failed: []
      }
    };

    // 테스트할 서버 URL들
    const testURLs = [
      'http://localhost:5000',
      'http://127.0.0.1:5000',
      'https://lunch-app-backend-ra12.onrender.com'
    ];

    // 현재 감지된 IP 추가
    if (Constants.expoConfig?.hostUri) {
      const ip = Constants.expoConfig.hostUri.split(':')[0];
      testURLs.unshift(`http://${ip}:5000`);
    }

    for (const url of testURLs) {
      connectionInfo.details.tested.push(url);
      
      try {
        const isWorking = await this.testConnection(url);
        if (isWorking) {
          connectionInfo.details.working.push(url);
        } else {
          connectionInfo.details.failed.push(url);
        }
      } catch (error) {
        connectionInfo.details.failed.push(`${url} (${error.message})`);
      }
    }

    // 상태 결정
    if (connectionInfo.details.working.length > 0) {
      connectionInfo.status = 'success';
    } else {
      connectionInfo.status = 'error';
    }

    this.diagnostics.push(connectionInfo);
  }

  /**
   * 개별 연결 테스트 - 근본적 해결책
   */
  async testConnection(url) {
    const testMethods = [
      () => this.testWithEndpoint(url, '/api/health'),
      () => this.testWithEndpoint(url, '/health'),
      () => this.testWithEndpoint(url, '/'),
      () => this.testWithMethod(url, 'HEAD'),
      () => this.testWithTimeout(url, 3000)
    ];
    
    for (const testMethod of testMethods) {
      try {
        const result = await testMethod();
        if (result) {
          console.log(`✅ [NetworkDiagnostics] 연결 성공: ${url}`);
          return true;
        }
      } catch (error) {
        continue;
      }
    }
    
    console.log(`❌ [NetworkDiagnostics] 모든 테스트 실패: ${url}`);
    return false;
  }

  /**
   * 엔드포인트별 테스트
   */
  async testWithEndpoint(url, endpoint) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${url}${endpoint}`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'LunchApp-Diagnostics/1.0'
      }
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  }

  /**
   * 메서드별 테스트
   */
  async testWithMethod(url, method) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(`${url}/api/health`, {
      method: method,
      signal: controller.signal,
      headers: {
        'Accept': '*/*'
      }
    });
    
    clearTimeout(timeoutId);
    return response.status < 500;
  }

  /**
   * 짧은 타임아웃 테스트
   */
  async testWithTimeout(url, timeout) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(`${url}/api/health`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json'
      }
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  }

  /**
   * 진단 결과 출력
   */
  displayDiagnostics() {
    console.log('\n🔍 [NetworkDiagnostics] === 네트워크 진단 결과 ===');
    
    this.diagnostics.forEach(diagnostic => {
      const statusEmoji = {
        success: '✅',
        info: 'ℹ️',
        error: '❌',
        warning: '⚠️'
      }[diagnostic.status] || '❓';
      
      console.log(`\n${statusEmoji} ${diagnostic.type}`);
      console.log('상태:', diagnostic.status);
      console.log('세부사항:', JSON.stringify(diagnostic.details, null, 2));
    });
    
    console.log('\n🔍 [NetworkDiagnostics] === 진단 완료 ===\n');
  }

  /**
   * 빠른 진단 (핵심 정보만)
   */
  async quickDiagnostics() {
    console.log('🔍 [NetworkDiagnostics] 빠른 진단 실행...');
    
    const quickInfo = {
      platform: Platform.OS,
      expoVersion: Constants.expoVersion,
      hostUri: Constants.expoConfig?.hostUri || 'Not Available',
      debuggerHost: Constants.manifest?.debuggerHost || 'Not Available'
    };
    
    console.log('🔍 [NetworkDiagnostics] 빠른 진단 결과:', quickInfo);
    return quickInfo;
  }

  /**
   * 문제 해결 제안
   */
  getTroubleshootingSuggestions() {
    const suggestions = [];
    
    // Expo 환경 문제
    if (!Constants.expoConfig?.hostUri && !Constants.manifest?.debuggerHost) {
      suggestions.push({
        problem: 'Expo 네트워크 정보 감지 실패',
        solution: 'Expo를 재시작하거나 터널 모드를 사용해보세요',
        command: 'npx expo start --tunnel'
      });
    }
    
    // 로컬 서버 연결 실패
    const hasWorkingLocal = this.diagnostics
      .find(d => d.type === 'Server Connections')
      ?.details?.working?.some(url => url.includes('localhost') || url.includes('127.0.0.1'));
    
    if (!hasWorkingLocal) {
      suggestions.push({
        problem: '로컬 백엔드 서버 연결 실패',
        solution: '백엔드 서버가 실행 중인지 확인하세요',
        command: 'python app.py'
      });
    }
    
    return suggestions;
  }
}

// 싱글톤 인스턴스
const networkDiagnostics = new NetworkDiagnostics();

// 기본 내보내기
export default networkDiagnostics;

// 유틸리티 함수들
export const runNetworkDiagnostics = () => networkDiagnostics.runFullDiagnostics();
export const quickNetworkCheck = () => networkDiagnostics.quickDiagnostics();
export const getTroubleshootingTips = () => networkDiagnostics.getTroubleshootingSuggestions();
