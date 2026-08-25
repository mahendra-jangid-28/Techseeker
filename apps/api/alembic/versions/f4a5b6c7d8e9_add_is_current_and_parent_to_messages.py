"""add_is_current_and_parent_to_messages

Revision ID: f4a5b6c7d8e9
Revises: e3f4a5b6c7d8
Create Date: 2026-08-25 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f4a5b6c7d8e9'
down_revision: Union[str, Sequence[str], None] = 'e3f4a5b6c7d8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'messages',
        sa.Column('is_current', sa.Boolean(), nullable=False, server_default=sa.text('true')),
    )
    op.add_column(
        'messages',
        sa.Column('parent_message_id', sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        'fk_messages_parent_message_id',
        'messages',
        'messages',
        ['parent_message_id'],
        ['id'],
        ondelete='SET NULL',
    )


def downgrade() -> None:
    op.drop_constraint('fk_messages_parent_message_id', 'messages', type_='foreignkey')
    op.drop_column('messages', 'parent_message_id')
    op.drop_column('messages', 'is_current')
