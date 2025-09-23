"""merge_migration_heads

Revision ID: c1fdd46a7c6f
Revises: 88b198af2208, add_title_column_to_chat_room
Create Date: 2025-09-18 23:05:17.962367

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c1fdd46a7c6f'
down_revision = ('88b198af2208', 'add_title_column_to_chat_room')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
