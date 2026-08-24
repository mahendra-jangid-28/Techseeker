"""create_lesson_tables

Revision ID: 9c5d1e2f3a4b
Revises: 8b4c9d2e3f1a
Create Date: 2026-08-25 00:22:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


# revision identifiers, used by Alembic.
revision: str = '9c5d1e2f3a4b'
down_revision: Union[str, Sequence[str], None] = '8b4c9d2e3f1a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. lesson_modules table
    op.create_table(
        'lesson_modules',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('roadmap_module_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('lesson_order', sa.Integer(), server_default='1', nullable=False),
        sa.Column('content_json', sa.JSON().with_variant(JSONB, 'postgresql'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['roadmap_module_id'], ['roadmap_modules.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('roadmap_module_id'),
    )
    op.create_index(op.f('ix_lesson_modules_id'), 'lesson_modules', ['id'], unique=False)
    op.create_index(op.f('ix_lesson_modules_roadmap_module_id'), 'lesson_modules', ['roadmap_module_id'], unique=True)

    # 2. lesson_submissions table
    op.create_table(
        'lesson_submissions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('lesson_id', sa.Integer(), nullable=False),
        sa.Column('code', sa.Text(), nullable=False),
        sa.Column('language', sa.String(length=50), server_default='python', nullable=False),
        sa.Column('passed', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('score', sa.Integer(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['lesson_id'], ['lesson_modules.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_lesson_submissions_id'), 'lesson_submissions', ['id'], unique=False)
    op.create_index(op.f('ix_lesson_submissions_lesson_id'), 'lesson_submissions', ['lesson_id'], unique=False)
    op.create_index(op.f('ix_lesson_submissions_user_id'), 'lesson_submissions', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_lesson_submissions_user_id'), table_name='lesson_submissions')
    op.drop_index(op.f('ix_lesson_submissions_lesson_id'), table_name='lesson_submissions')
    op.drop_index(op.f('ix_lesson_submissions_id'), table_name='lesson_submissions')
    op.drop_table('lesson_submissions')

    op.drop_index(op.f('ix_lesson_modules_roadmap_module_id'), table_name='lesson_modules')
    op.drop_index(op.f('ix_lesson_modules_id'), table_name='lesson_modules')
    op.drop_table('lesson_modules')
