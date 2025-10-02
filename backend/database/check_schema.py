# 레거시 import 제거 - CLI에서 create_app() 사용
from backend.app.extensions import db

def check_schema():
    """스키마 확인 (CLI에서 호출)"""
    from backend.app.app_factory import create_app
    app = create_app()
    
    with app.app_context():
        with db.engine.connect() as conn:
            result = conn.execute(db.text('PRAGMA table_info(chat_participant)'))
            print('chat_participant 컬럼들:')
            for row in result:
                print(f'  {row[1]} ({row[2]})')

if __name__ == '__main__':
    check_schema()
