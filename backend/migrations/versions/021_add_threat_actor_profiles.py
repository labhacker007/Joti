"""Add threat actor profiles table

Revision ID: 021_add_threat_actor_profiles
Revises: 020_add_watchlist_category
Create Date: 2026-02-20
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '021_add_threat_actor_profiles'
down_revision = '020_add_watchlist_category'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'threat_actor_profiles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('origin_country', sa.String(100), nullable=True),
        sa.Column('motivation', sa.String(255), nullable=True),
        sa.Column('actor_type', sa.String(100), nullable=True),
        sa.Column('first_seen', sa.DateTime(), nullable=True),
        sa.Column('last_seen', sa.DateTime(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('target_sectors', sa.JSON(), nullable=True),
        sa.Column('aliases', sa.JSON(), nullable=True),
        sa.Column('ttps', sa.JSON(), nullable=True),
        sa.Column('infrastructure', sa.JSON(), nullable=True),
        sa.Column('tools', sa.JSON(), nullable=True),
        sa.Column('campaigns', sa.JSON(), nullable=True),
        sa.Column('ioc_count', sa.Integer(), nullable=True, default=0),
        sa.Column('article_count', sa.Integer(), nullable=True, default=0),
        sa.Column('ttp_count', sa.Integer(), nullable=True, default=0),
        sa.Column('last_enriched_at', sa.DateTime(), nullable=True),
        sa.Column('enrichment_source', sa.String(255), nullable=True),
        sa.Column('genai_confidence', sa.Integer(), nullable=True, default=0),
        sa.Column('is_verified', sa.Boolean(), nullable=True, default=False),
        sa.Column('tags', sa.JSON(), nullable=True),
        sa.Column('external_refs', sa.JSON(), nullable=True),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_ta_profile_name', 'threat_actor_profiles', ['name'], unique=True)
    op.create_index('idx_ta_profile_active', 'threat_actor_profiles', ['is_active'])
    op.create_index('idx_ta_profile_type', 'threat_actor_profiles', ['actor_type'])


def downgrade():
    op.drop_index('idx_ta_profile_type', table_name='threat_actor_profiles')
    op.drop_index('idx_ta_profile_active', table_name='threat_actor_profiles')
    op.drop_index('idx_ta_profile_name', table_name='threat_actor_profiles')
    op.drop_table('threat_actor_profiles')
