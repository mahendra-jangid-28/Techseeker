"""create_user_progress_and_activity

Revision ID: 7a3b8c9d1e2f
Revises: 4f4cc30587f7
Create Date: 2026-08-24 23:55:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7a3b8c9d1e2f'
down_revision: Union[str, Sequence[str], None] = '4f4cc30587f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create user_progress table
    op.create_table(
        'user_progress',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('xp', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('streak', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_active', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_user_progress_id'), 'user_progress', ['id'], unique=False)
    op.create_index(op.f('ix_user_progress_user_id'), 'user_progress', ['user_id'], unique=True)

    # Create user_activity table
    op.create_table(
        'user_activity',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('activity_type', sa.String(length=50), nullable=False),
        sa.Column('activity_title', sa.String(length=255), nullable=False),
        sa.Column('xp_earned', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_user_activity_id'), 'user_activity', ['id'], unique=False)
    op.create_index(op.f('ix_user_activity_user_id'), 'user_activity', ['user_id'], unique=False)
    op.create_index(op.f('ix_user_activity_created_at'), 'user_activity', ['created_at'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_user_activity_created_at'), table_name='user_activity')
    op.drop_index(op.f('ix_user_activity_user_id'), table_name='user_activity')
    op.drop_index(op.f('ix_user_activity_id'), table_name='user_activity')
    op.drop_table('user_activity')

    op.drop_index(op.f('ix_user_progress_user_id'), table_name='user_progress')
    op.drop_index(op.f('ix_user_progress_id'), table_name='user_progress')
    op.drop_table('user_progress')
