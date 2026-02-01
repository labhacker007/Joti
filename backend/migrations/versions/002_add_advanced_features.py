"""add advanced features

Revision ID: 002
Revises: 001
Create Date: 2026-01-16

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade():
    # Add high_fidelity to feed_sources
    op.add_column('feed_sources', sa.Column('high_fidelity', sa.Boolean(), nullable=False, server_default='false'))
    op.create_index('idx_feed_source_high_fidelity', 'feed_sources', ['high_fidelity'])
    
    # Rename analyst_remarks to genai_analysis_remarks in articles
    op.alter_column('articles', 'analyst_remarks', new_column_name='genai_analysis_remarks')
    
    # Add hunt execution tracking fields
    op.add_column('hunt_executions', sa.Column('findings_summary', sa.Text(), nullable=True))
    op.add_column('hunt_executions', sa.Column('hits_count', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('hunt_executions', sa.Column('email_sent', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('hunt_executions', sa.Column('servicenow_ticket_id', sa.String(), nullable=True))
    
    # Add hunt_execution_id to extracted_intelligence
    op.add_column('extracted_intelligence', sa.Column('hunt_execution_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_extracted_intelligence_hunt_execution',
        'extracted_intelligence', 'hunt_executions',
        ['hunt_execution_id'], ['id']
    )
    op.create_index('idx_intelligence_hunt_execution', 'extracted_intelligence', ['hunt_execution_id'])
    
    # Create article_read_status table
    op.create_table(
        'article_read_status',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('article_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('read_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['article_id'], ['articles.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('article_id', 'user_id', name='uq_article_user_read_status')
    )
    op.create_index('idx_read_status_article', 'article_read_status', ['article_id'])
    op.create_index('idx_read_status_user', 'article_read_status', ['user_id'])


def downgrade():
    # Drop article_read_status table
    op.drop_index('idx_read_status_user', 'article_read_status')
    op.drop_index('idx_read_status_article', 'article_read_status')
    op.drop_table('article_read_status')
    
    # Remove hunt_execution_id from extracted_intelligence
    op.drop_index('idx_intelligence_hunt_execution', 'extracted_intelligence')
    op.drop_constraint('fk_extracted_intelligence_hunt_execution', 'extracted_intelligence', type_='foreignkey')
    op.drop_column('extracted_intelligence', 'hunt_execution_id')
    
    # Remove hunt execution tracking fields
    op.drop_column('hunt_executions', 'servicenow_ticket_id')
    op.drop_column('hunt_executions', 'email_sent')
    op.drop_column('hunt_executions', 'hits_count')
    op.drop_column('hunt_executions', 'findings_summary')
    
    # Rename genai_analysis_remarks back to analyst_remarks
    op.alter_column('articles', 'genai_analysis_remarks', new_column_name='analyst_remarks')
    
    # Remove high_fidelity from feed_sources
    op.drop_index('idx_feed_source_high_fidelity', 'feed_sources')
    op.drop_column('feed_sources', 'high_fidelity')
