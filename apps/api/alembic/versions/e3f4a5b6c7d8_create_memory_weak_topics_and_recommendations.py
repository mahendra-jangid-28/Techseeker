"""create_memory_weak_topics_and_recommendations

Revision ID: e3f4a5b6c7d8
Revises: 9c5d1e2f3a4b
Create Date: 2026-08-25 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e3f4a5b6c7d8'
down_revision: Union[str, Sequence[str], None] = '9c5d1e2f3a4b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. user_memory table
    op.create_table(
        'user_memory',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('memory_key', sa.String(length=100), nullable=False),
        sa.Column('memory_value', sa.Text(), nullable=False),
        sa.Column('memory_type', sa.String(length=50), nullable=False),
        sa.Column('importance', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'memory_key', name='uq_user_memory_key'),
    )
    op.create_index(op.f('ix_user_memory_id'), 'user_memory', ['id'], unique=False)
    op.create_index(op.f('ix_user_memory_user_id'), 'user_memory', ['user_id'], unique=False)
    op.create_index(op.f('ix_user_memory_memory_key'), 'user_memory', ['memory_key'], unique=False)
    op.create_index(op.f('ix_user_memory_memory_type'), 'user_memory', ['memory_type'], unique=False)

    # 2. weak_topics table
    op.create_table(
        'weak_topics',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('topic', sa.String(length=255), nullable=False),
        sa.Column('failure_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('successful_attempts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('attempt_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('confidence', sa.Float(), nullable=False, server_default='0.5'),
        sa.Column('last_failed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_success_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='tracking'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'topic', name='uq_user_topic_weakness'),
    )
    op.create_index(op.f('ix_weak_topics_id'), 'weak_topics', ['id'], unique=False)
    op.create_index(op.f('ix_weak_topics_user_id'), 'weak_topics', ['user_id'], unique=False)
    op.create_index(op.f('ix_weak_topics_topic'), 'weak_topics', ['topic'], unique=False)
    op.create_index(op.f('ix_weak_topics_status'), 'weak_topics', ['status'], unique=False)

    # 3. study_recommendations table
    op.create_table(
        'study_recommendations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('recommendation_type', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('topic', sa.String(length=255), nullable=False),
        sa.Column('priority', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('reason', sa.String(length=255), nullable=False),
        sa.Column('action_url', sa.String(length=255), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='pending'),
        sa.Column('recommended_for', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_study_recommendations_id'), 'study_recommendations', ['id'], unique=False)
    op.create_index(op.f('ix_study_recommendations_user_id'), 'study_recommendations', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_study_recommendations_user_id'), table_name='study_recommendations')
    op.drop_index(op.f('ix_study_recommendations_id'), table_name='study_recommendations')
    op.drop_table('study_recommendations')

    op.drop_index(op.f('ix_weak_topics_status'), table_name='weak_topics')
    op.drop_index(op.f('ix_weak_topics_topic'), table_name='weak_topics')
    op.drop_index(op.f('ix_weak_topics_user_id'), table_name='weak_topics')
    op.drop_index(op.f('ix_weak_topics_id'), table_name='weak_topics')
    op.drop_table('weak_topics')

    op.drop_index(op.f('ix_user_memory_memory_type'), table_name='user_memory')
    op.drop_index(op.f('ix_user_memory_memory_key'), table_name='user_memory')
    op.drop_index(op.f('ix_user_memory_user_id'), table_name='user_memory')
    op.drop_index(op.f('ix_user_memory_id'), table_name='user_memory')
    op.drop_table('user_memory')
