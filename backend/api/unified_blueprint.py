"""
통합 Blueprint 등록 시스템
모든 API Blueprint를 일관된 방식으로 등록하고 관리하는 중앙화된 시스템
"""

import os
import sys
from datetime import datetime
from flask import Blueprint, jsonify
from typing import Dict, List, Tuple, Optional

# 선택적 의존성 import
try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False

# Blueprint 등록 정보 타입
BlueprintInfo = Tuple[str, str, str, bool]  # (module_path, blueprint_name, url_prefix, require_auth)

class UnifiedBlueprintManager:
    """통합 Blueprint 관리자"""
    
    def __init__(self, app=None):
        self.app = app
        self.registered_blueprints = {}
        self.registration_order = []
        self.is_development = os.getenv('FLASK_ENV') == 'development'
        self.is_debug = os.getenv('FLASK_DEBUG') == 'True'
        
        # Blueprint 등록 순서 정의 (중요도 순) - URL prefix 충돌 방지
        self.blueprint_config = {
            # 핵심 API (최우선) - 절대 경로 사용
            'core': [
                ('backend.routes.health', 'health_bp', '/healthz', False),  # 헬스체크는 인증 불필요
                ('backend.auth.routes', 'auth_bp', '/api/auth', False),  # 인증 API는 인증 불필요
            ],
            
            # API v2 (새로운 버전 - 우선 사용) - 명확한 prefix
            'main': [
                ('backend.api.restaurants_v2', 'restaurants_v2_bp', '/api/restaurants', True),
                ('backend.api.parties', 'parties_bp', '/api/parties', True),
                ('backend.api.schedules', 'schedules_bp', '/api/schedules', True),
                ('backend.api.schedules', 'personal_schedules_bp', '/api/personal-schedules', True),
                ('backend.api.users', 'api_users_bp', '/api/users', True),
            ],
            
            # 확장 기능 API - 명확한 prefix
            'extended': [
                ('backend.routes.proposals', 'proposals_bp', '/api/proposals', True),
                ('backend.routes.chats', 'chats_bp', '/api/chats', True),
                ('backend.routes.voting', 'voting_bp', '/api/voting', True),
                ('backend.routes.matching', 'matching_bp', '/api/matching', True),
                ('backend.routes.points', 'points_bp', '/api/points', True),
                # 레거시 API들 완전 비활성화 - 근본적이고 장기적인 해결책
                # ('backend.routes.restaurants', 'restaurants_bp', '/api/restaurants-legacy', True),
                # ('backend.routes.users', 'users_bp', '/api/users-legacy', True),
                ('backend.routes.file_upload', 'file_upload_bp', '/api/files', True),
                ('backend.routes.notifications', 'notifications_bp', '/api/notifications', True),
                ('backend.routes.optimized_chat', 'optimized_chat_bp', '/api/optimized/chat', True),
                ('backend.api.dangolpots', 'dangolpots_bp', '/api/dangolpots', True),
                ('backend.auth.admin_routes', 'admin_bp', '/api/admin', True),
            ],
            
            # 유틸리티 API - 명확한 prefix
            'utility': [
                ('backend.api.inquiries', 'inquiries_bp', '/api/inquiries', True),
                ('backend.api.compatibility', 'compatibility_bp', '/api/compatibility', True),
                ('backend.api.clear_data', 'clear_data_bp', '/api/admin/clear-data', True),
                ('backend.root_compatibility', 'root_compatibility_bp', '', True),  # 루트 레벨 호환성
            ],
            
            # 개발용 API (개발 환경에서만) - 현재 비활성화됨
            'development': [
                # ('backend.routes.development', 'dev_bp', '/api/dev', True),  # 모듈이 존재하지 않음
            ],
            
            # 모니터링 API
            'monitoring': [
                ('backend.monitoring.monitoring_api', 'monitoring_bp', '/monitoring', False),  # 인증 불필요
            ]
        }
        
        print(f'[INFO] [UnifiedBlueprint] 관리자 초기화 - 환경: {"개발" if self.is_development else "프로덕션"}')
    
    def register_all_blueprints(self, app) -> Dict[str, bool]:
        """모든 Blueprint를 등록"""
        self.app = app
        results = {}
        
        print('[INFO] [UnifiedBlueprint] Blueprint 등록 시작...')
        
        # 순서대로 Blueprint 등록
        for category, blueprints in self.blueprint_config.items():
            if category == 'development' and not self.is_development:
                print(f'[INFO] [UnifiedBlueprint] {category} 카테고리 건너뛰기 (프로덕션 환경)')
                continue
                
            print(f'[INFO] [UnifiedBlueprint] {category} 카테고리 등록 시작...')
            
            for module_path, blueprint_name, url_prefix, require_auth in blueprints:
                success = self.register_blueprint(
                    module_path, blueprint_name, url_prefix, require_auth
                )
                results[f"{category}.{blueprint_name}"] = success
        
        # 등록 결과 요약
        self.print_registration_summary(results)
        
        return results
    
    def register_blueprint(self, module_path: str, blueprint_name: str, 
                          url_prefix: str, require_auth: bool = True) -> bool:
        """개별 Blueprint 등록"""
        try:
            # 모듈 import
            module = self._import_module(module_path)
            if not module:
                return False
            
            # Blueprint 가져오기
            blueprint = getattr(module, blueprint_name, None)
            if not blueprint:
                print(f'[ERROR] [UnifiedBlueprint] Blueprint {blueprint_name}을 찾을 수 없음: {module_path}')
                return False
            
            # 인증 미들웨어 적용 (필요한 경우)
            if require_auth:
                self._apply_auth_middleware(blueprint)
            
            # Blueprint 등록
            self.app.register_blueprint(blueprint, url_prefix=url_prefix)
            
            # 등록 상태 표시
            blueprint._registered = True
            
            # 등록 정보 저장
            self.registered_blueprints[blueprint_name] = {
                'module_path': module_path,
                'url_prefix': url_prefix,
                'require_auth': require_auth,
                'status': 'registered'
            }
            self.registration_order.append(blueprint_name)
            
            print(f'[SUCCESS] [UnifiedBlueprint] {blueprint_name} 등록 성공 ({url_prefix})')
            return True
            
        except Exception as e:
            print(f'[ERROR] [UnifiedBlueprint] {blueprint_name} 등록 실패: {e}')
            self.registered_blueprints[blueprint_name] = {
                'module_path': module_path,
                'url_prefix': url_prefix,
                'require_auth': require_auth,
                'status': 'failed',
                'error': str(e)
            }
            return False
    
    def _import_module(self, module_path: str):
        """모듈 동적 import"""
        try:
            # sys.path에 backend 경로 추가 (필요한 경우)
            backend_path = os.path.join(os.getcwd(), 'backend')
            if backend_path not in sys.path:
                sys.path.insert(0, backend_path)
            
            module = __import__(module_path, fromlist=[''])
            return module
            
        except ImportError as e:
            print(f'[WARNING] [UnifiedBlueprint] 모듈 import 실패: {module_path} - {e}')
            return None
        except Exception as e:
            print(f'[ERROR] [UnifiedBlueprint] 모듈 로드 오류: {module_path} - {e}')
            return None
    
    def _apply_auth_middleware(self, blueprint):
        """인증 미들웨어 적용 - Blueprint 등록 전에만 적용"""
        # Blueprint가 이미 등록된 경우 인증 미들웨어 적용을 건너뜀
        # 이는 UnifiedBlueprintManager가 중복 등록을 방지하기 위함
        if hasattr(blueprint, '_registered') and blueprint._registered:
            if self.is_debug:
                print(f'[INFO] [UnifiedBlueprint] 인증 미들웨어 건너뜀 (이미 등록됨): {blueprint.name}')
            return
            
        try:
            from backend.auth.unified_middleware import auth_guard
            
            # before_request에 인증 가드 추가 (등록 전에만)
            blueprint.before_request(auth_guard(allow_public=False))
            
            if self.is_debug:
                print(f'[INFO] [UnifiedBlueprint] 인증 미들웨어 적용됨: {blueprint.name}')
                
        except ImportError:
            print(f'[WARNING] [UnifiedBlueprint] 통합 인증 미들웨어를 찾을 수 없음, 기본 인증 사용')
            # 기본 인증 미들웨어 사용
            try:
                from backend.auth.middleware import check_authentication
                
                @blueprint.before_request
                def _auth_guard():
                    return check_authentication()
                    
            except ImportError:
                print(f'[WARNING] [UnifiedBlueprint] 기본 인증 미들웨어도 찾을 수 없음, 인증 없이 진행')
        except Exception as e:
            print(f'[ERROR] [UnifiedBlueprint] 인증 미들웨어 적용 실패: {e}')
    
    def print_registration_summary(self, results: Dict[str, bool]):
        """등록 결과 요약 출력"""
        total = len(results)
        successful = sum(1 for success in results.values() if success)
        failed = total - successful
        
        print('\n' + '='*60)
        print('[INFO] [UnifiedBlueprint] 등록 결과 요약')
        print('='*60)
        print(f'[SUCCESS] 성공: {successful}/{total}')
        print(f'[ERROR] 실패: {failed}/{total}')
        print(f'[INFO] 성공률: {(successful/total*100):.1f}%')
        
        if failed > 0:
            print('\n[ERROR] 실패한 Blueprint:')
            for name, success in results.items():
                if not success:
                    print(f'  - {name}')
        
        print('='*60)
    
    def get_registered_blueprints(self) -> Dict:
        """등록된 Blueprint 정보 반환"""
        return {
            'blueprints': self.registered_blueprints,
            'registration_order': self.registration_order,
            'total_count': len(self.registered_blueprints),
            'environment': 'development' if self.is_development else 'production'
        }
    
    def get_blueprint_routes(self, blueprint_name: str) -> List[str]:
        """특정 Blueprint의 라우트 목록 반환"""
        if blueprint_name not in self.registered_blueprints:
            return []
        
        try:
            blueprint_info = self.registered_blueprints[blueprint_name]
            module_path = blueprint_info['module_path']
            module = self._import_module(module_path)
            
            if not module:
                return []
            
            blueprint = getattr(module, blueprint_name, None)
            if not blueprint:
                return []
            
            routes = []
            for rule in blueprint.url_map.iter_rules():
                routes.append({
                    'rule': str(rule),
                    'methods': list(rule.methods),
                    'endpoint': rule.endpoint
                })
            
            return routes
            
        except Exception as e:
            print(f'[ERROR] [UnifiedBlueprint] 라우트 조회 실패 ({blueprint_name}): {e}')
            return []
    
    def create_api_info_blueprint(self) -> Blueprint:
        """API 정보 제공 Blueprint 생성"""
        api_info_bp = Blueprint('api_info', __name__, url_prefix='/api/info')
        
        @api_info_bp.route('/blueprints', methods=['GET'])
        def get_blueprint_info():
            """등록된 Blueprint 정보 반환"""
            return jsonify({
                'status': 'success',
                'data': self.get_registered_blueprints()
            })
        
        @api_info_bp.route('/routes/<blueprint_name>', methods=['GET'])
        def get_blueprint_routes(blueprint_name):
            """특정 Blueprint의 라우트 목록 반환"""
            routes = self.get_blueprint_routes(blueprint_name)
            return jsonify({
                'status': 'success',
                'data': {
                    'blueprint': blueprint_name,
                    'routes': routes
                }
            })
        
        @api_info_bp.route('/health', methods=['GET'])
        def api_health():
            """API 전체 상태 확인"""
            return jsonify({
                'status': 'success',
                'message': 'API 서버가 정상적으로 작동하고 있습니다.',
                'environment': 'development' if self.is_development else 'production',
                'registered_blueprints': len(self.registered_blueprints),
                'timestamp': str(datetime.utcnow()),
                'blueprint_summary': {
                    'total': len(self.registered_blueprints),
                    'successful': len([bp for bp in self.registered_blueprints.values() if bp.get('status') == 'registered']),
                    'failed': len([bp for bp in self.registered_blueprints.values() if bp.get('status') == 'failed'])
                }
            })
        
        @api_info_bp.route('/routes', methods=['GET'])
        def get_all_routes():
            """모든 등록된 라우트 목록 반환"""
            all_routes = []
            for blueprint_name, blueprint_info in self.registered_blueprints.items():
                if blueprint_info.get('status') == 'registered':
                    routes = self.get_blueprint_routes(blueprint_name)
                    all_routes.extend(routes)
            
            return jsonify({
                'status': 'success',
                'data': {
                    'total_routes': len(all_routes),
                    'routes': all_routes
                }
            })
        
        @api_info_bp.route('/status', methods=['GET'])
        def get_detailed_status():
            """상세한 시스템 상태 반환"""
            import platform
            
            system_info = {
                'platform': platform.platform(),
                'python_version': sys.version,
                'memory_usage': 'N/A',
                'cpu_usage': 'N/A'
            }
            
            if PSUTIL_AVAILABLE:
                try:
                    system_info['memory_usage'] = f"{psutil.virtual_memory().percent}%"
                    system_info['cpu_usage'] = f"{psutil.cpu_percent()}%"
                except Exception:
                    pass
            
            return jsonify({
                'status': 'success',
                'data': {
                    'system': system_info,
                    'application': {
                        'environment': 'development' if self.is_development else 'production',
                        'debug_mode': self.is_debug,
                        'registered_blueprints': len(self.registered_blueprints),
                        'registration_order': self.registration_order
                    },
                    'blueprints': self.registered_blueprints
                }
            })
        
        return api_info_bp

# 전역 Blueprint 관리자 인스턴스
blueprint_manager = UnifiedBlueprintManager()

def register_all_blueprints(app) -> Dict[str, bool]:
    """모든 Blueprint를 등록하는 편의 함수"""
    return blueprint_manager.register_all_blueprints(app)

def get_blueprint_manager() -> UnifiedBlueprintManager:
    """Blueprint 관리자 인스턴스 반환"""
    return blueprint_manager
