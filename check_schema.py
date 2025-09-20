from app import app
from extensions import db

with app.app_context():
    result = db.engine.execute('PRAGMA table_info(chat_participant)')
    print('chat_participant 컬럼들:')
    for row in result:
        print(f'  {row[1]} ({row[2]})')
