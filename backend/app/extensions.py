from flask_sqlalchemy import SQLAlchemy

# db 객체를 여기서 초기화합니다.
# 근본적 해결: 모델 등록 충돌 방지를 위한 설정
db = SQLAlchemy(
    session_options={
        'autoflush': False,
        'autocommit': False
    }
)

# 모델 등록 상태 추적
_registered_models = set()

def register_model_safely(model_class):
    """모델을 안전하게 등록하는 함수"""
    global _registered_models
    
    model_name = model_class.__name__
    if model_name in _registered_models:
        print(f"[DEBUG] 모델 {model_name}은 이미 등록되었습니다.")
        return False
    
    try:
        # 모델이 이미 메타데이터에 있는지 확인
        if hasattr(model_class, '__tablename__'):
            table_name = model_class.__tablename__
            if table_name in db.metadata.tables:
                print(f"[DEBUG] 테이블 {table_name}이 이미 메타데이터에 있습니다.")
                return False
        
        # 모델 등록
        _registered_models.add(model_name)
        print(f"[DEBUG] 모델 {model_name} 등록 완료")
        return True
        
    except Exception as e:
        print(f"[ERROR] 모델 {model_name} 등록 실패: {e}")
        return False
