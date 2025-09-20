"""
JSON 직렬화를 위한 커스텀 인코더
datetime, date, time 객체를 자동으로 직렬화합니다.
"""

import json
from datetime import datetime, date, time
from decimal import Decimal
from sqlalchemy.inspection import inspect

class CustomJSONEncoder(json.JSONEncoder):
    """커스텀 JSON 인코더 - 모든 데이터 타입을 안전하게 직렬화"""
    
    def default(self, obj):
        # SQLAlchemy 모델 객체 처리
        if hasattr(obj, '__tablename__'):  # SQLAlchemy 모델인지 확인
            return self._sqlalchemy_to_dict(obj)
        
        # datetime 객체들 처리
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        elif isinstance(obj, time):
            return obj.isoformat()
        
        # Decimal 처리
        elif isinstance(obj, Decimal):
            return float(obj)
        
        # UUID 처리
        elif hasattr(obj, 'hex'):  # UUID 객체
            return str(obj)
        
        # Enum 처리
        elif hasattr(obj, 'value'):  # Enum 객체
            return obj.value
        
        # 객체의 속성을 딕셔너리로 변환
        elif hasattr(obj, '__dict__'):
            return self._object_to_dict(obj)
        
        # 리스트나 튜플 처리
        elif isinstance(obj, (list, tuple)):
            return [self.default(item) for item in obj]
        
        # 딕셔너리 처리
        elif isinstance(obj, dict):
            return {key: self.default(value) for key, value in obj.items()}
        
        return super().default(obj)
    
    def _sqlalchemy_to_dict(self, obj):
        """SQLAlchemy 모델을 딕셔너리로 변환"""
        try:
            # SQLAlchemy 인스펙터 사용
            mapper = inspect(obj.__class__)
            result = {}
            
            for column in mapper.columns:
                value = getattr(obj, column.name)
                result[column.name] = self.default(value)
            
            return result
        except Exception:
            # 인스펙터 실패 시 __dict__ 사용
            return self._object_to_dict(obj)
    
    def _object_to_dict(self, obj):
        """일반 객체를 딕셔너리로 변환"""
        try:
            result = {}
            for key, value in obj.__dict__.items():
                # SQLAlchemy 내부 속성 제외
                if not key.startswith('_'):
                    result[key] = self.default(value)
            return result
        except Exception:
            return str(obj)

def safe_jsonify(data):
    """안전한 JSON 직렬화 - 재귀적으로 모든 데이터 처리"""
    try:
        return json.dumps(data, cls=CustomJSONEncoder, ensure_ascii=False, indent=None)
    except Exception as e:
        # 직렬화 실패 시 에러 정보와 함께 반환
        return json.dumps({
            'error': 'JSON 직렬화 실패',
            'details': str(e),
            'data_type': str(type(data)),
            'data_preview': str(data)[:200] + '...' if len(str(data)) > 200 else str(data)
        }, ensure_ascii=False)

def convert_to_serializable(data):
    """데이터를 JSON 직렬화 가능한 형태로 변환"""
    if isinstance(data, (list, tuple)):
        return [convert_to_serializable(item) for item in data]
    elif isinstance(data, dict):
        return {key: convert_to_serializable(value) for key, value in data.items()}
    elif isinstance(data, (datetime, date)):
        return data.isoformat()
    elif isinstance(data, time):
        return data.isoformat()
    elif isinstance(data, Decimal):
        return float(data)
    elif hasattr(data, '__dict__'):
        return convert_to_serializable(data.__dict__)
    else:
        return data
