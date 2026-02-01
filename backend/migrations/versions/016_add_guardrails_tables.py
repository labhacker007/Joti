"""Add guardrails tables for editable guardrail management

Revision ID: 016_guardrails_tables
Revises: 015_add_query_versioning
Create Date: 2026-01-26

This migration adds comprehensive guardrails management tables:
- Editable guardrails with scope (global/function-specific)
- Guardrail audit log for tracking changes
- Function-specific guardrail overrides
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '016_guardrails_tables'
down_revision = '015_add_query_versioning'
branch_labels = None
depends_on = None


def upgrade():
    """Add guardrails management tables."""
    
    # ========================================================================
    # GUARDRAILS TABLE - Editable guardrail configurations
    # ========================================================================
    
    op.create_table(
        'guardrails',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        
        # Identification
        sa.Column('guardrail_id', sa.String(50), unique=True, nullable=False, index=True),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        
        # Categorization
        sa.Column('category', sa.String(50), nullable=False, index=True),
        sa.Column('severity', sa.String(20), nullable=False, index=True),
        
        # Scope: 'global' or 'function'
        sa.Column('scope', sa.String(20), nullable=False, default='global', index=True),
        
        # Function-specific: JSON array of functions this guardrail applies to
        sa.Column('applicable_functions', sa.JSON(), nullable=True),
        
        # Platform-specific: JSON array of platforms (null = all)
        sa.Column('applicable_platforms', sa.JSON(), nullable=True),
        
        # Configuration
        sa.Column('config', sa.JSON(), nullable=True),
        sa.Column('custom_message', sa.Text(), nullable=True),
        sa.Column('suggestion', sa.Text(), nullable=True),
        
        # Logic configuration - NEW: allows custom validation logic
        sa.Column('validation_type', sa.String(50), nullable=True),  # regex, blocklist, detector, custom
        sa.Column('validation_pattern', sa.Text(), nullable=True),  # Regex pattern or JSON config
        sa.Column('action_on_violation', sa.String(20), nullable=True, default='block'),  # block, warn, log
        
        # Status
        sa.Column('status', sa.String(20), nullable=False, default='active', index=True),
        sa.Column('is_default', sa.Boolean(), default=False),
        
        # Audit
        sa.Column('created_by_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('updated_by_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    
    # ========================================================================
    # GUARDRAIL AUDIT LOG - Track all changes
    # ========================================================================
    
    op.create_table(
        'guardrail_audit_logs',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('guardrail_id', sa.Integer(), sa.ForeignKey('guardrails.id', ondelete='SET NULL'), nullable=True),
        sa.Column('guardrail_string_id', sa.String(50), nullable=True),  # Store string ID for deleted guardrails
        
        sa.Column('action', sa.String(50), nullable=False, index=True),  # created, updated, enabled, disabled, deleted
        sa.Column('changes', sa.JSON(), nullable=True),  # {old: {...}, new: {...}}
        
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True, index=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now(), index=True),
    )
    
    # ========================================================================
    # FUNCTION GUARDRAIL OVERRIDES - Per-function customization
    # ========================================================================
    
    op.create_table(
        'function_guardrail_overrides',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        
        sa.Column('function_name', sa.String(50), nullable=False, index=True),
        sa.Column('guardrail_id', sa.Integer(), sa.ForeignKey('guardrails.id', ondelete='CASCADE'), nullable=False),
        
        # Override settings
        sa.Column('is_enabled', sa.Boolean(), default=True),
        sa.Column('severity_override', sa.String(20), nullable=True),
        sa.Column('custom_config', sa.JSON(), nullable=True),
        
        # Audit
        sa.Column('created_by_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('updated_by_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
        
        # Unique constraint
        sa.UniqueConstraint('function_name', 'guardrail_id', name='uq_function_guardrail'),
    )
    
    # ========================================================================
    # GUARDRAIL TEST RESULTS - Store test suite results for tracking
    # ========================================================================
    
    op.create_table(
        'guardrail_test_results',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('test_name', sa.String(200), nullable=True),
        
        # Test configuration
        sa.Column('use_case', sa.String(50), nullable=False),
        sa.Column('platform', sa.String(50), nullable=True),
        sa.Column('guardrail_ids', sa.JSON(), nullable=True),  # Specific guardrails tested
        
        # Metrics
        sa.Column('total_tests', sa.Integer(), nullable=False),
        sa.Column('accuracy', sa.Float(), nullable=False),
        sa.Column('precision', sa.Float(), nullable=False),
        sa.Column('recall', sa.Float(), nullable=False),
        sa.Column('f1_score', sa.Float(), nullable=False),
        sa.Column('true_positives', sa.Integer(), nullable=False),
        sa.Column('true_negatives', sa.Integer(), nullable=False),
        sa.Column('false_positives', sa.Integer(), nullable=False),
        sa.Column('false_negatives', sa.Integer(), nullable=False),
        
        # Results detail
        sa.Column('results_detail', sa.JSON(), nullable=True),
        
        # Audit
        sa.Column('run_by_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('run_at', sa.DateTime(), nullable=False, server_default=sa.func.now(), index=True),
    )
    
    # ========================================================================
    # GROUND TRUTH TEST RESULTS - Store RAG accuracy results
    # ========================================================================
    
    op.create_table(
        'guardrail_ground_truth_results',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        
        # Test data
        sa.Column('query', sa.Text(), nullable=False),
        sa.Column('expected_answer', sa.Text(), nullable=False),
        sa.Column('context', sa.Text(), nullable=True),
        sa.Column('actual_answer', sa.Text(), nullable=True),
        
        # Model info
        sa.Column('model_used', sa.String(100), nullable=True),
        
        # Metrics
        sa.Column('exact_match', sa.Boolean(), nullable=False),
        sa.Column('similarity', sa.Float(), nullable=False),
        sa.Column('word_overlap', sa.Float(), nullable=False),
        sa.Column('confidence', sa.String(20), nullable=True),
        sa.Column('assessment', sa.String(20), nullable=True),  # PASS, NEEDS_REVIEW, FAIL
        
        # Hallucination check
        sa.Column('hallucination_passed', sa.Boolean(), nullable=True),
        sa.Column('hallucination_indicators', sa.JSON(), nullable=True),
        
        # Audit
        sa.Column('run_by_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('run_at', sa.DateTime(), nullable=False, server_default=sa.func.now(), index=True),
    )
    
    # ========================================================================
    # INDEXES
    # ========================================================================
    
    op.create_index('idx_guardrail_category', 'guardrails', ['category'])
    op.create_index('idx_guardrail_scope', 'guardrails', ['scope'])
    op.create_index('idx_guardrail_status', 'guardrails', ['status'])
    op.create_index('idx_guardrail_severity', 'guardrails', ['severity'])
    
    op.create_index('idx_guardrail_audit_guardrail', 'guardrail_audit_logs', ['guardrail_id'])
    op.create_index('idx_guardrail_audit_action', 'guardrail_audit_logs', ['action'])
    op.create_index('idx_guardrail_audit_user', 'guardrail_audit_logs', ['user_id'])
    
    op.create_index('idx_override_function', 'function_guardrail_overrides', ['function_name'])
    op.create_index('idx_override_guardrail', 'function_guardrail_overrides', ['guardrail_id'])


def downgrade():
    """Remove guardrails tables."""
    op.drop_table('guardrail_ground_truth_results')
    op.drop_table('guardrail_test_results')
    op.drop_table('function_guardrail_overrides')
    op.drop_table('guardrail_audit_logs')
    op.drop_table('guardrails')
