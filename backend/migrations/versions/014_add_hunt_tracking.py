"""Add hunt tracking fields and article-hunt mapping

Revision ID: 014_hunt_tracking
Revises: 013_genai_configuration
Create Date: 2026-01-28

This migration adds:
1. Hunt tracking fields to articles table
2. Article-hunt status mapping for bidirectional tracking
3. Manual hunt creation support
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '014_hunt_tracking'
down_revision = '013_genai_configuration'
branch_labels = None
depends_on = None


def upgrade():
    """Add hunt tracking capabilities."""
    
    # Add hunt tracking fields to articles table
    op.add_column('articles', sa.Column('hunt_generated_count', sa.Integer(), server_default='0', nullable=False))
    op.add_column('articles', sa.Column('hunt_launched_count', sa.Integer(), server_default='0', nullable=False))
    op.add_column('articles', sa.Column('last_hunt_generated_at', sa.DateTime(), nullable=True))
    op.add_column('articles', sa.Column('last_hunt_launched_at', sa.DateTime(), nullable=True))
    
    # Add manual creation flag to hunts table
    op.add_column('hunts', sa.Column('is_manual', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('hunts', sa.Column('manual_notes', sa.Text(), nullable=True))
    
    # Create article-hunt status tracking table
    op.create_table(
        'article_hunt_tracking',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('article_id', sa.Integer(), sa.ForeignKey('articles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('hunt_id', sa.Integer(), sa.ForeignKey('hunts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('generation_status', sa.String(50), nullable=False, server_default='GENERATED'),
        sa.Column('launch_status', sa.String(50), nullable=True),
        sa.Column('generated_at', sa.DateTime(), nullable=False),
        sa.Column('launched_at', sa.DateTime(), nullable=True),
        sa.Column('generated_by_user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('launched_by_user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('is_visible_in_workbench', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    
    # Create indexes
    op.create_index('idx_article_hunt_tracking_article', 'article_hunt_tracking', ['article_id'])
    op.create_index('idx_article_hunt_tracking_hunt', 'article_hunt_tracking', ['hunt_id'])
    op.create_index('idx_article_hunt_tracking_status', 'article_hunt_tracking', ['generation_status', 'launch_status'])
    op.create_index('idx_article_hunt_tracking_workbench', 'article_hunt_tracking', ['is_visible_in_workbench'])
    
    # Create unique constraint
    op.create_unique_constraint('uq_article_hunt_tracking', 'article_hunt_tracking', ['article_id', 'hunt_id'])


def downgrade():
    """Remove hunt tracking capabilities."""
    op.drop_table('article_hunt_tracking')
    op.drop_column('hunts', 'manual_notes')
    op.drop_column('hunts', 'is_manual')
    op.drop_column('articles', 'last_hunt_launched_at')
    op.drop_column('articles', 'last_hunt_generated_at')
    op.drop_column('articles', 'hunt_launched_count')
    op.drop_column('articles', 'hunt_generated_count')
