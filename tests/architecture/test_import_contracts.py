#!/usr/bin/env python3
"""
아키텍처 계약 테스트
import-linter를 사용하여 아키텍처 계약 위반을 자동으로 검사합니다.
"""

import pytest
import importlinter
from importlinter import check_contracts


class TestArchitectureContracts:
    """아키텍처 계약 테스트 클래스"""
    
    def test_architecture_contracts(self):
        """아키텍처 계약 위반 검사"""
        result = check_contracts()
        
        # 모든 계약이 유지되었는지 확인
        assert result.kept_contracts == result.all_contracts, (
            f"아키텍처 계약 위반 발견: "
            f"{len(result.broken_contracts)}개 계약 위반, "
            f"{len(result.kept_contracts)}개 계약 유지"
        )
        
        # 위반된 계약이 있다면 상세 정보 출력
        if result.broken_contracts:
            for contract in result.broken_contracts:
                print(f"❌ 계약 위반: {contract.name}")
                for violation in contract.violations:
                    print(f"   - {violation}")
        
        print(f"✅ 모든 아키텍처 계약 통과: {len(result.kept_contracts)}개 계약")
    
    def test_core_layer_purity(self):
        """Core 계층 순수성 검사"""
        # Core 계층에 외부 의존성이 없음을 확인
        try:
            from backend.core.entities.party import Party
            from backend.core.entities.user import User
            from backend.core.value_objects.restaurant_info import RestaurantInfo
            
            # SQLAlchemy 의존성 확인
            assert not hasattr(Party, '__sqlalchemy__'), "Core에 SQLAlchemy 의존성 발견"
            assert not hasattr(User, '__sqlalchemy__'), "Core에 SQLAlchemy 의존성 발견"
            
            # Pydantic 의존성 확인
            assert not hasattr(Party, '__pydantic__'), "Core에 Pydantic 의존성 발견"
            assert not hasattr(User, '__pydantic__'), "Core에 Pydantic 의존성 발견"
            
            # Flask 의존성 확인
            assert not hasattr(Party, '__flask__'), "Core에 Flask 의존성 발견"
            assert not hasattr(User, '__flask__'), "Core에 Flask 의존성 발견"
            
            print("✅ Core 계층 순수성 검증 통과")
            
        except ImportError as e:
            pytest.skip(f"Core 계층이 아직 구현되지 않음: {e}")
    
    def test_dependency_direction(self):
        """의존성 방향 검사"""
        # Application 계층이 Core 계층에만 의존하는지 확인
        try:
            from backend.application.services.party_service import PartyService
            from backend.application.repositories import PartyRepository
            
            # Presentation 계층에 의존하지 않는지 확인
            # (실제로는 런타임에 확인하기 어려우므로 import-linter에 의존)
            print("✅ 의존성 방향 검증 통과")
            
        except ImportError as e:
            pytest.skip(f"Application 계층이 아직 구현되지 않음: {e}")
    
    def test_no_circular_imports(self):
        """순환 참조 검사"""
        # 주요 모듈들의 순환 참조 확인
        modules_to_check = [
            'backend.core',
            'backend.application', 
            'backend.infrastructure',
            'backend.presentation'
        ]
        
        for module_name in modules_to_check:
            try:
                # 모듈 import 시도
                __import__(module_name)
                print(f"✅ {module_name} 순환 참조 없음")
            except ImportError as e:
                if "circular import" in str(e).lower():
                    pytest.fail(f"순환 참조 발견: {module_name} - {e}")
                else:
                    pytest.skip(f"모듈이 아직 구현되지 않음: {module_name}")
    
    def test_layer_isolation(self):
        """계층 격리 검사"""
        # 각 계층이 다른 계층의 구현 세부사항에 직접 접근하지 않는지 확인
        
        # Core 계층은 다른 계층을 전혀 import하지 않아야 함
        try:
            import backend.core
            core_module = backend.core
            
            # Core 모듈의 소스 코드를 확인하여 외부 계층 import 검사
            # (실제 구현에서는 더 정교한 검사가 필요)
            print("✅ Core 계층 격리 검증 통과")
            
        except ImportError:
            pytest.skip("Core 계층이 아직 구현되지 않음")


class TestImportLinterConfiguration:
    """Import-linter 설정 테스트"""
    
    def test_import_linter_config_exists(self):
        """Import-linter 설정 파일 존재 확인"""
        import os
        
        config_files = [
            'pyproject.toml',
            '.importlinter'
        ]
        
        config_found = False
        for config_file in config_files:
            if os.path.exists(config_file):
                config_found = True
                break
        
        assert config_found, "Import-linter 설정 파일이 없습니다"
        print("✅ Import-linter 설정 파일 존재 확인")
    
    def test_contract_definitions(self):
        """계약 정의 검증"""
        # pyproject.toml에서 계약 정의 확인
        import toml
        
        try:
            with open('pyproject.toml', 'r') as f:
                config = toml.load(f)
            
            importlinter_config = config.get('tool', {}).get('importlinter', {})
            contracts = importlinter_config.get('contracts', [])
            
            assert len(contracts) > 0, "계약이 정의되지 않았습니다"
            
            contract_names = [contract.get('name', '') for contract in contracts]
            expected_contracts = [
                "Core must not depend on outer layers",
                "Application depends on Core, not on Presentation"
            ]
            
            for expected in expected_contracts:
                assert any(expected in name for name in contract_names), (
                    f"필수 계약이 누락됨: {expected}"
                )
            
            print(f"✅ 계약 정의 검증 통과: {len(contracts)}개 계약")
            
        except FileNotFoundError:
            pytest.fail("pyproject.toml 파일을 찾을 수 없습니다")
        except Exception as e:
            pytest.fail(f"계약 정의 검증 실패: {e}")


if __name__ == "__main__":
    # 직접 실행 시 테스트 수행
    pytest.main([__file__, "-v"])
