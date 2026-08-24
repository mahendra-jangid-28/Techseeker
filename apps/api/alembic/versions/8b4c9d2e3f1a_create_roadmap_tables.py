"""create_roadmap_tables

Revision ID: 8b4c9d2e3f1a
Revises: 7a3b8c9d1e2f
Create Date: 2026-08-25 00:08:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8b4c9d2e3f1a'
down_revision: Union[str, Sequence[str], None] = '7a3b8c9d1e2f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. roadmaps table
    op.create_table(
        'roadmaps',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('difficulty', sa.String(length=50), nullable=False),
        sa.Column('estimated_weeks', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('title'),
    )
    op.create_index(op.f('ix_roadmaps_id'), 'roadmaps', ['id'], unique=False)

    # 2. roadmap_modules table
    op.create_table(
        'roadmap_modules',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('roadmap_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('order_index', sa.Integer(), nullable=False),
        sa.Column('estimated_hours', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['roadmap_id'], ['roadmaps.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_roadmap_modules_id'), 'roadmap_modules', ['id'], unique=False)
    op.create_index(op.f('ix_roadmap_modules_roadmap_id'), 'roadmap_modules', ['roadmap_id'], unique=False)

    # 3. user_roadmap_progress table
    op.create_table(
        'user_roadmap_progress',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('roadmap_id', sa.Integer(), nullable=False),
        sa.Column('module_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=20), server_default='locked', nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['module_id'], ['roadmap_modules.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['roadmap_id'], ['roadmaps.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'module_id', name='uq_user_module_progress'),
    )
    op.create_index(op.f('ix_user_roadmap_progress_id'), 'user_roadmap_progress', ['id'], unique=False)
    op.create_index(op.f('ix_user_roadmap_progress_module_id'), 'user_roadmap_progress', ['module_id'], unique=False)
    op.create_index(op.f('ix_user_roadmap_progress_roadmap_id'), 'user_roadmap_progress', ['roadmap_id'], unique=False)
    op.create_index(op.f('ix_user_roadmap_progress_user_id'), 'user_roadmap_progress', ['user_id'], unique=False)

    # 4. user_roadmap_selections table
    op.create_table(
        'user_roadmap_selections',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('roadmap_id', sa.Integer(), nullable=False),
        sa.Column('selected_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['roadmap_id'], ['roadmaps.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id'),
    )
    op.create_index(op.f('ix_user_roadmap_selections_id'), 'user_roadmap_selections', ['id'], unique=False)
    op.create_index(op.f('ix_user_roadmap_selections_user_id'), 'user_roadmap_selections', ['user_id'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_user_roadmap_selections_user_id'), table_name='user_roadmap_selections')
    op.drop_index(op.f('ix_user_roadmap_selections_id'), table_name='user_roadmap_selections')
    op.drop_table('user_roadmap_selections')

    op.drop_index(op.f('ix_user_roadmap_progress_user_id'), table_name='user_roadmap_progress')
    op.drop_index(op.f('ix_user_roadmap_progress_roadmap_id'), table_name='user_roadmap_progress')
    op.drop_index(op.f('ix_user_roadmap_progress_module_id'), table_name='user_roadmap_progress')
    op.drop_index(op.f('ix_user_roadmap_progress_id'), table_name='user_roadmap_progress')
    op.drop_table('user_roadmap_progress')

    op.drop_index(op.f('ix_roadmap_modules_roadmap_id'), table_name='roadmap_modules')
    op.drop_index(op.f('ix_roadmap_modules_id'), table_name='roadmap_modules')
    op.drop_table('roadmap_modules')

    op.drop_index(op.f('ix_roadmaps_id'), table_name='roadmaps')
    op.drop_table('roadmaps')
