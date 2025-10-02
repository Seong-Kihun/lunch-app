#!/usr/bin/env python3
"""
모니터링 API 엔드포인트
시스템 상태, 메트릭, 로그 조회를 위한 REST API
"""

from flask import Blueprint, jsonify, request
from backend.monitoring.unified_monitor import monitor
import logging
import os
import psutil
from datetime import datetime, timezone

# 모니터링 Blueprint 생성
monitoring_bp = Blueprint('monitoring', __name__, url_prefix='/api/monitoring')

@monitoring_bp.route('/health', methods=['GET'])
def health_check():
    """헬스체크 엔드포인트"""
    try:
        # 기본 시스템 정보
        system_info = {
            'status': 'healthy',
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'uptime': _get_uptime(),
            'memory_usage': _get_memory_usage(),
            'cpu_usage': _get_cpu_usage(),
            'disk_usage': _get_disk_usage()
        }
        
        return jsonify(system_info), 200
        
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }), 500

@monitoring_bp.route('/metrics', methods=['GET'])
def get_metrics():
    """메트릭 조회"""
    try:
        metrics = monitor.get_metrics()
        return jsonify(metrics), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@monitoring_bp.route('/metrics/reset', methods=['POST'])
def reset_metrics():
    """메트릭 초기화"""
    try:
        monitor.reset_metrics()
        return jsonify({'message': '메트릭이 초기화되었습니다.'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@monitoring_bp.route('/logs', methods=['GET'])
def get_logs():
    """로그 조회 (최근 100줄)"""
    try:
        log_type = request.args.get('type', 'app')  # app, error
        
        if log_type == 'error':
            log_file = 'logs/error.log'
        else:
            log_file = 'logs/app.log'
        
        if not os.path.exists(log_file):
            return jsonify({'logs': [], 'message': '로그 파일이 존재하지 않습니다.'}), 200
        
        # 최근 100줄 읽기
        with open(log_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            recent_lines = lines[-100:] if len(lines) > 100 else lines
        
        return jsonify({
            'logs': [line.strip() for line in recent_lines],
            'total_lines': len(lines),
            'returned_lines': len(recent_lines)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@monitoring_bp.route('/system', methods=['GET'])
def get_system_info():
    """시스템 정보 조회"""
    try:
        system_info = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'platform': os.name,
            'python_version': os.sys.version,
            'memory': _get_memory_usage(),
            'cpu': _get_cpu_usage(),
            'disk': _get_disk_usage(),
            'process_info': _get_process_info()
        }
        
        return jsonify(system_info), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def _get_uptime():
    """시스템 업타임"""
    try:
        uptime_seconds = psutil.boot_time()
        uptime_delta = datetime.now() - datetime.fromtimestamp(uptime_seconds)
        return {
            'seconds': int(uptime_delta.total_seconds()),
            'formatted': str(uptime_delta).split('.')[0]
        }
    except:
        return {'seconds': 0, 'formatted': 'unknown'}

def _get_memory_usage():
    """메모리 사용량"""
    try:
        memory = psutil.virtual_memory()
        return {
            'total_gb': round(memory.total / (1024**3), 2),
            'available_gb': round(memory.available / (1024**3), 2),
            'used_gb': round(memory.used / (1024**3), 2),
            'percentage': memory.percent
        }
    except:
        return {'total_gb': 0, 'available_gb': 0, 'used_gb': 0, 'percentage': 0}

def _get_cpu_usage():
    """CPU 사용량"""
    try:
        cpu_percent = psutil.cpu_percent(interval=1)
        cpu_count = psutil.cpu_count()
        return {
            'usage_percent': cpu_percent,
            'core_count': cpu_count,
            'load_average': psutil.getloadavg() if hasattr(psutil, 'getloadavg') else [0, 0, 0]
        }
    except:
        return {'usage_percent': 0, 'core_count': 0, 'load_average': [0, 0, 0]}

def _get_disk_usage():
    """디스크 사용량"""
    try:
        disk = psutil.disk_usage('/')
        return {
            'total_gb': round(disk.total / (1024**3), 2),
            'free_gb': round(disk.free / (1024**3), 2),
            'used_gb': round(disk.used / (1024**3), 2),
            'percentage': round((disk.used / disk.total) * 100, 2)
        }
    except:
        return {'total_gb': 0, 'free_gb': 0, 'used_gb': 0, 'percentage': 0}

def _get_process_info():
    """프로세스 정보"""
    try:
        process = psutil.Process()
        return {
            'pid': process.pid,
            'memory_mb': round(process.memory_info().rss / (1024**2), 2),
            'cpu_percent': process.cpu_percent(),
            'threads': process.num_threads(),
            'status': process.status()
        }
    except:
        return {'pid': 0, 'memory_mb': 0, 'cpu_percent': 0, 'threads': 0, 'status': 'unknown'}
