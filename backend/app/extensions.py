from flask_sqlalchemy import SQLAlchemy

# db 객체를 여기서 초기화합니다.
# 근본적 해결: 모델 등록 충돌 방지를 위한 설정
db = SQLAlchemy(
    session_options={
        'autoflush': False,
        'autocommit': False
    }
)

# 표준 SQLAlchemy 선언적 매핑 사용
# register_model_safely 함수는 제거되었습니다.
# 모델은 import 시 자동으로 메타데이터에 등록됩니다.
