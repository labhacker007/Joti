"""Initial schema creation.

Revision ID: 001
Revises: 
Create Date: 2026-01-09 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create initial database schema."""
    # Users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('username', sa.String(), nullable=False),
        sa.Column('hashed_password', sa.String(), nullable=True),
        sa.Column('full_name', sa.String(), nullable=True),
        sa.Column('role', sa.Enum('ADMIN', 'TI', 'TH', 'IR', 'VIEWER', name='userrole'), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_saml_user', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('saml_nameid', sa.String(), nullable=True),
        sa.Column('otp_enabled', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('otp_secret', sa.String(), nullable=True),
        sa.Column('last_login', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
        sa.UniqueConstraint('username'),
        sa.UniqueConstraint('saml_nameid')
    )
    op.create_index('ix_users_email', 'users', ['email'])
    op.create_index('ix_users_username', 'users', ['username'])
    
    # FeedSource table
    op.create_table(
        'feed_sources',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('url', sa.String(), nullable=False),
        sa.Column('feed_type', sa.String(), nullable=False, server_default='rss'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('headers', postgresql.JSON(), nullable=False, server_default='{}'),
        sa.Column('last_fetched', sa.DateTime(), nullable=True),
        sa.Column('next_fetch', sa.DateTime(), nullable=False),
        sa.Column('fetch_error', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
        sa.UniqueConstraint('url')
    )
    op.create_index('idx_feed_source_active', 'feed_sources', ['is_active'])
    op.create_index('idx_feed_source_next_fetch', 'feed_sources', ['next_fetch'])
    op.create_index('ix_feed_sources_name', 'feed_sources', ['name'])
    
    # Articles table
    op.create_table(
        'articles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('source_id', sa.Integer(), nullable=False),
        sa.Column('external_id', sa.String(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('raw_content', sa.Text(), nullable=True),
        sa.Column('normalized_content', sa.Text(), nullable=True),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column('url', sa.String(), nullable=True),
        sa.Column('published_at', sa.DateTime(), nullable=True),
        sa.Column('status', sa.Enum('NEW', 'TRIAGED', 'IN_ANALYSIS', 'REVIEWED', 'REPORTED', 'ARCHIVED', name='articlestatus'), nullable=False),
        sa.Column('assigned_analyst_id', sa.Integer(), nullable=True),
        sa.Column('analyst_remarks', sa.Text(), nullable=True),
        sa.Column('executive_summary', sa.Text(), nullable=True),
        sa.Column('technical_summary', sa.Text(), nullable=True),
        sa.Column('reviewed_by_id', sa.Integer(), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.Column('analyzed_by_id', sa.Integer(), nullable=True),
        sa.Column('analyzed_at', sa.DateTime(), nullable=True),
        sa.Column('is_high_priority', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('watchlist_match_keywords', postgresql.JSON(), nullable=False, server_default='[]'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['source_id'], ['feed_sources.id']),
        sa.ForeignKeyConstraint(['assigned_analyst_id'], ['users.id']),
        sa.ForeignKeyConstraint(['reviewed_by_id'], ['users.id']),
        sa.ForeignKeyConstraint(['analyzed_by_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('source_id', 'external_id', name='uq_article_source_external')
    )
    op.create_index('idx_article_status', 'articles', ['status'])
    op.create_index('idx_article_created', 'articles', ['created_at'])
    op.create_index('idx_article_high_priority', 'articles', ['is_high_priority'])
    op.create_index('ix_articles_url', 'articles', ['url'])
    
    # ExtractedIntelligence table
    op.create_table(
        'extracted_intelligence',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('article_id', sa.Integer(), nullable=False),
        sa.Column('intelligence_type', sa.Enum('IOC', 'IOA', 'TTP', 'ATLAS', name='extractedintelligencetype'), nullable=False),
        sa.Column('value', sa.String(), nullable=False),
        sa.Column('confidence', sa.Integer(), nullable=False, server_default='50'),
        sa.Column('evidence', sa.Text(), nullable=True),
        sa.Column('mitre_id', sa.String(), nullable=True),
        sa.Column('metadata', postgresql.JSON(), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['article_id'], ['articles.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_intelligence_type', 'extracted_intelligence', ['intelligence_type'])
    op.create_index('idx_intelligence_value', 'extracted_intelligence', ['value'])
    
    # WatchListKeyword table
    op.create_table(
        'watchlist_keywords',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('keyword', sa.String(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('keyword')
    )
    op.create_index('ix_watchlist_keywords_keyword', 'watchlist_keywords', ['keyword'])
    
    # Hunts table
    op.create_table(
        'hunts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('article_id', sa.Integer(), nullable=False),
        sa.Column('platform', sa.String(), nullable=False),
        sa.Column('query_logic', sa.Text(), nullable=False),
        sa.Column('generated_by_model', sa.String(), nullable=True),
        sa.Column('prompt_template_version', sa.String(), nullable=False, server_default='v1'),
        sa.Column('response_hash', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['article_id'], ['articles.id']),
        sa.PrimaryKeyConstraint('id')
    )
    
    # HuntExecution table
    op.create_table(
        'hunt_executions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('hunt_id', sa.Integer(), nullable=False),
        sa.Column('trigger_type', sa.Enum('MANUAL', 'AUTO', name='hunttriggertype'), nullable=False),
        sa.Column('status', sa.Enum('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'PARTIAL', name='huntstatus'), nullable=False),
        sa.Column('executed_by_id', sa.Integer(), nullable=True),
        sa.Column('executed_at', sa.DateTime(), nullable=True),
        sa.Column('results', postgresql.JSON(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('execution_time_ms', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['hunt_id'], ['hunts.id']),
        sa.ForeignKeyConstraint(['executed_by_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Reports table
    op.create_table(
        'reports',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('article_ids', postgresql.JSON(), nullable=False, server_default='[]'),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('report_type', sa.String(), nullable=False, server_default='comprehensive'),
        sa.Column('generated_by_id', sa.Integer(), nullable=True),
        sa.Column('generated_at', sa.DateTime(), nullable=False),
        sa.Column('shared_with_emails', postgresql.JSON(), nullable=False, server_default='[]'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['generated_by_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    
    # AuditLog table (append-only)
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('event_type', sa.Enum('LOGIN', 'LOGOUT', 'ARTICLE_LIFECYCLE', 'EXTRACTION', 'CONNECTOR_CONFIG', 'HUNT_TRIGGER', 'NOTIFICATION', 'REPORT_GENERATION', 'RBAC_CHANGE', name='auditeventtype'), nullable=False),
        sa.Column('resource_type', sa.String(), nullable=True),
        sa.Column('resource_id', sa.Integer(), nullable=True),
        sa.Column('action', sa.String(), nullable=False),
        sa.Column('details', postgresql.JSON(), nullable=False, server_default='{}'),
        sa.Column('correlation_id', sa.String(), nullable=True),
        sa.Column('ip_address', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_audit_event_type', 'audit_logs', ['event_type'])
    op.create_index('idx_audit_created', 'audit_logs', ['created_at'])
    op.create_index('idx_audit_correlation', 'audit_logs', ['correlation_id'])
    
    # ConnectorConfig table
    op.create_table(
        'connector_configs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('connector_type', sa.String(), nullable=False),
        sa.Column('config', postgresql.JSON(), nullable=False, server_default='{}'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('last_tested_at', sa.DateTime(), nullable=True),
        sa.Column('last_test_status', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index('ix_connector_configs_name', 'connector_configs', ['name'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('connector_configs')
    op.drop_table('audit_logs')
    op.drop_table('reports')
    op.drop_table('hunt_executions')
    op.drop_table('hunts')
    op.drop_table('watchlist_keywords')
    op.drop_table('extracted_intelligence')
    op.drop_table('articles')
    op.drop_table('feed_sources')
    op.drop_table('users')
