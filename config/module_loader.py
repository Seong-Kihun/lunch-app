"""
환경변수 기반 모듈 로딩 시스템
"""
import os
from typing import Dict, Any, Optional


class ModuleLoader:
    """환경변수 기반으로 모듈을 동적으로 로드하는 클래스"""
    
    def __init__(self):
        self.loaded_modules: Dict[str, Any] = {}
        self.module_configs = {
            'auth': {
                'env_var': 'ENABLE_AUTH',
                'default': True,
                'import_path': 'auth',
                'init_function': 'init_auth',
                'description': '인증 시스템'
            },
            'group_matching': {
                'env_var': 'ENABLE_GROUP_MATCHING',
                'default': True,
                'import_path': 'group_matching',
                'init_function': None,
                'description': '그룹 매칭 시스템'
            },
            'realtime': {
                'env_var': 'ENABLE_REALTIME',
                'default': True,
                'import_path': 'realtime.notification_system',
                'init_function': 'NotificationSystem',
                'description': '실시간 통신 시스템'
            },
            'points': {
                'env_var': 'ENABLE_POINTS',
                'default': True,
                'import_path': 'points_system',
                'init_function': 'setup_points_system',
                'description': '포인트 시스템'
            },
            'scheduler': {
                'env_var': 'ENABLE_SCHEDULER',
                'default': True,
                'import_path': 'scheduler_config',
                'init_function': 'setup_scheduler',
                'description': '스케줄러 시스템'
            },
            'api': {
                'env_var': 'ENABLE_API',
                'default': True,
                'import_path': 'api',
                'init_function': 'init_app',
                'description': 'API Blueprint'
            }
        }
    
    def is_module_enabled(self, module_name: str) -> bool:
        """모듈이 활성화되어 있는지 확인"""
        if module_name not in self.module_configs:
            return False
        
        config = self.module_configs[module_name]
        env_var = config['env_var']
        default = config['default']
        
        # 환경변수 확인 (대소문자 구분 없음)
        env_value = os.getenv(env_var, '').lower()
        if env_value in ['true', '1', 'yes', 'on']:
            return True
        elif env_value in ['false', '0', 'no', 'off']:
            return False
        else:
            return default
    
    def load_module(self, module_name: str) -> Optional[Any]:
        """모듈을 동적으로 로드"""
        if module_name in self.loaded_modules:
            return self.loaded_modules[module_name]
        
        if not self.is_module_enabled(module_name):
            print(f"ℹ️ {self.module_configs[module_name]['description']}이 비활성화되어 있습니다.")
            return None
        
        try:
            config = self.module_configs[module_name]
            import_path = config['import_path']
            
            # 모듈 동적 임포트
            module = __import__(import_path, fromlist=['*'])
            
            # 초기화 함수가 있다면 실행
            if config['init_function']:
                init_func = getattr(module, config['init_function'], None)
                if init_func:
                    self.loaded_modules[module_name] = init_func
                else:
                    self.loaded_modules[module_name] = module
            else:
                self.loaded_modules[module_name] = module
            
            print(f"✅ {config['description']}을 성공적으로 로드했습니다.")
            return self.loaded_modules[module_name]
            
        except ImportError as e:
            print(f"⚠️ {self.module_configs[module_name]['description']} 로드 실패: {e}")
            return None
        except Exception as e:
            print(f"❌ {self.module_configs[module_name]['description']} 로드 중 오류: {e}")
            return None
    
    def load_all_modules(self) -> Dict[str, Any]:
        """모든 활성화된 모듈을 로드"""
        loaded = {}
        for module_name in self.module_configs.keys():
            module = self.load_module(module_name)
            if module:
                loaded[module_name] = module
        return loaded
    
    def get_module(self, module_name: str) -> Optional[Any]:
        """로드된 모듈 반환"""
        return self.loaded_modules.get(module_name)
    
    def is_loaded(self, module_name: str) -> bool:
        """모듈이 로드되었는지 확인"""
        return module_name in self.loaded_modules


# 전역 모듈 로더 인스턴스
module_loader = ModuleLoader()
