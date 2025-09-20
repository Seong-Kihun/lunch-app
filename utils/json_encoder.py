"""
JSON 직렬화를 위한 커스텀 인코더
datetime, date, time 객체를 자동으로 직렬화합니다.
"""

import json
from datetime import datetime, date, time
from decimal import Decimal

class CustomJSONEncoder(json.JSONEncoder):
    """커스텀 JSON 인코더"""
    
    def default(self, obj):
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        elif isinstance(obj, time):
            return obj.isoformat()
        elif isinstance(obj, Decimal):
            return float(obj)
        elif hasattr(obj, '__dict__'):
            # 객체의 속성을 딕셔너리로 변환
            return obj.__dict__
        return super().default(obj)

def safe_jsonify(data):
    """안전한 JSON 직렬화"""
    try:
        return json.dumps(data, cls=CustomJSONEncoder, ensure_ascii=False)
    except Exception as e:
        # 직렬화 실패 시 에러 정보와 함께 반환
        return json.dumps({
            'error': 'JSON 직렬화 실패',
            'details': str(e),
            'data_type': str(type(data))
        }, ensure_ascii=False)
