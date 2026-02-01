"""Add GenAI configuration tables

Revision ID: 013_genai_configuration
Revises: 012_agentic_intelligence
Create Date: 2026-01-28

This migration adds comprehensive GenAI model configuration with security controls:
- Model configuration management
- Request logging and audit trail
- Model registry with whitelisting
- Usage quotas for cost control
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '013_genai_configuration'
down_revision = '012_agentic_intelligence'
branch_labels = None
depends_on = None


def upgrade():
    """Add GenAI configuration tables with security controls."""
    
    # ========================================================================
    # MODEL CONFIGURATION
    # ========================================================================
    
    op.create_table(
        'genai_model_configs',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('config_name', sa.String(100), unique=True, nullable=False, index=True),
        sa.Column('config_type', sa.String(20), nullable=False, index=True),
        sa.Column('model_identifier', sa.String(100), nullable=True, index=True),
        sa.Column('use_case', sa.String(50), nullable=True, index=True),
        
        # Model parameters
        sa.Column('temperature', sa.Float(), default=0.3, nullable=False),
        sa.Column('max_tokens', sa.Integer(), default=2000, nullable=False),
        sa.Column('top_p', sa.Float(), default=0.9, nullable=False),
        sa.Column('frequency_penalty', sa.Float(), default=0.0, nullable=False),
        sa.Column('presence_penalty', sa.Float(), default=0.0, nullable=False),
        
        # Advanced parameters
        sa.Column('stop_sequences', sa.JSON(), nullable=True),
        sa.Column('timeout_seconds', sa.Integer(), default=30, nullable=False),
        sa.Column('retry_attempts', sa.Integer(), default=3, nullable=False),
        sa.Column('preferred_model', sa.String(100), nullable=True),
        
        # Cost control
        sa.Column('max_cost_per_request', sa.Float(), nullable=True),
        sa.Column('fallback_model', sa.String(100), nullable=True),
        sa.Column('daily_request_limit', sa.Integer(), nullable=True),
        
        # Security controls
        sa.Column('allowed_users', sa.JSON(), nullable=True),
        sa.Column('allowed_roles', sa.JSON(), nullable=True),
        sa.Column('require_approval', sa.Boolean(), default=False),
        
        # Metadata
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True, index=True),
        sa.Column('is_default', sa.Boolean(), default=False),
        sa.Column('version', sa.Integer(), default=1),
        
        # Performance tracking
        sa.Column('avg_response_time_ms', sa.Integer(), nullable=True),
        sa.Column('avg_tokens_used', sa.Integer(), nullable=True),
        sa.Column('avg_cost_per_request', sa.Float(), nullable=True),
        sa.Column('total_requests', sa.Integer(), default=0),
        sa.Column('success_rate', sa.Float(), nullable=True),
        sa.Column('last_used_at', sa.DateTime(), nullable=True),
        
        # Audit
        sa.Column('created_by_user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('updated_by_user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        
        # Security constraints
        sa.CheckConstraint('temperature >= 0.0 AND temperature <= 2.0', name='check_temperature_range'),
        sa.CheckConstraint('top_p >= 0.0 AND top_p <= 1.0', name='check_top_p_range'),
        sa.CheckConstraint('frequency_penalty >= -2.0 AND frequency_penalty <= 2.0', name='check_freq_penalty_range'),
        sa.CheckConstraint('presence_penalty >= -2.0 AND presence_penalty <= 2.0', name='check_pres_penalty_range'),
        sa.CheckConstraint('max_tokens > 0 AND max_tokens <= 100000', name='check_max_tokens_range'),
        sa.CheckConstraint('timeout_seconds > 0 AND timeout_seconds <= 300', name='check_timeout_range'),
        sa.CheckConstraint('retry_attempts >= 0 AND retry_attempts <= 10', name='check_retry_range'),
        sa.CheckConstraint('max_cost_per_request IS NULL OR max_cost_per_request >= 0', name='check_max_cost_positive'),
        sa.CheckConstraint('daily_request_limit IS NULL OR daily_request_limit > 0', name='check_daily_limit_positive'),
    )
    
    # ========================================================================
    # REQUEST LOGGING
    # ========================================================================
    
    op.create_table(
        'genai_request_logs',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('request_id', sa.String(100), unique=True, nullable=False, index=True),
        sa.Column('use_case', sa.String(50), nullable=False, index=True),
        sa.Column('model_used', sa.String(100), nullable=False, index=True),
        sa.Column('config_id', sa.Integer(), sa.ForeignKey('genai_model_configs.id'), nullable=True),
        
        # Request details
        sa.Column('prompt_length', sa.Integer(), nullable=True),
        sa.Column('prompt_hash', sa.String(64), nullable=True, index=True),
        
        # Parameters
        sa.Column('temperature', sa.Float(), nullable=True),
        sa.Column('max_tokens', sa.Integer(), nullable=True),
        sa.Column('top_p', sa.Float(), nullable=True),
        
        # Response
        sa.Column('response_length', sa.Integer(), nullable=True),
        sa.Column('tokens_used', sa.Integer(), nullable=True),
        sa.Column('response_time_ms', sa.Integer(), nullable=True),
        sa.Column('cost_usd', sa.Float(), nullable=True),
        
        # Quality
        sa.Column('confidence_score', sa.Float(), nullable=True),
        sa.Column('user_feedback', sa.Integer(), nullable=True),
        sa.Column('was_successful', sa.Boolean(), nullable=False, default=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('error_type', sa.String(50), nullable=True),
        
        # Security context
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True, index=True),
        sa.Column('user_ip', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.String(500), nullable=True),
        
        # Business context
        sa.Column('article_id', sa.Integer(), sa.ForeignKey('articles.id'), nullable=True, index=True),
        sa.Column('hunt_id', sa.Integer(), sa.ForeignKey('hunts.id'), nullable=True),
        
        # Timestamp
        sa.Column('created_at', sa.DateTime(), nullable=False, index=True),
    )
    
    # ========================================================================
    # MODEL REGISTRY
    # ========================================================================
    
    op.create_table(
        'genai_model_registry',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('model_identifier', sa.String(100), unique=True, nullable=False, index=True),
        sa.Column('provider', sa.String(50), nullable=False, index=True),
        sa.Column('model_name', sa.String(100), nullable=False),
        sa.Column('display_name', sa.String(200), nullable=False),
        
        # Capabilities
        sa.Column('supports_streaming', sa.Boolean(), default=False),
        sa.Column('supports_function_calling', sa.Boolean(), default=False),
        sa.Column('supports_vision', sa.Boolean(), default=False),
        sa.Column('max_context_length', sa.Integer(), nullable=False),
        
        # Cost
        sa.Column('cost_per_1k_input_tokens', sa.Float(), nullable=True),
        sa.Column('cost_per_1k_output_tokens', sa.Float(), nullable=True),
        sa.Column('is_free', sa.Boolean(), default=False),
        
        # Security
        sa.Column('is_enabled', sa.Boolean(), default=False, index=True),
        sa.Column('requires_api_key', sa.Boolean(), default=True),
        sa.Column('is_local', sa.Boolean(), default=False),
        sa.Column('requires_admin_approval', sa.Boolean(), default=True),
        
        # Access control
        sa.Column('allowed_for_use_cases', sa.JSON(), nullable=True),
        sa.Column('restricted_to_roles', sa.JSON(), nullable=True),
        
        # Metadata
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('documentation_url', sa.String(500), nullable=True),
        
        # Performance
        sa.Column('total_requests', sa.Integer(), default=0),
        sa.Column('total_cost', sa.Float(), default=0.0),
        sa.Column('avg_response_time_ms', sa.Integer(), nullable=True),
        sa.Column('success_rate', sa.Float(), nullable=True),
        
        # Audit
        sa.Column('added_by_user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('approved_by_user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('added_at', sa.DateTime(), nullable=False),
        sa.Column('approved_at', sa.DateTime(), nullable=True),
        sa.Column('last_used_at', sa.DateTime(), nullable=True),
    )
    
    # ========================================================================
    # USAGE QUOTAS
    # ========================================================================
    
    op.create_table(
        'genai_usage_quotas',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('quota_name', sa.String(100), unique=True, nullable=False),
        sa.Column('quota_type', sa.String(20), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True, index=True),
        sa.Column('role_name', sa.String(50), nullable=True),
        
        # Limits
        sa.Column('daily_request_limit', sa.Integer(), nullable=True),
        sa.Column('monthly_request_limit', sa.Integer(), nullable=True),
        sa.Column('daily_cost_limit', sa.Float(), nullable=True),
        sa.Column('monthly_cost_limit', sa.Float(), nullable=True),
        sa.Column('daily_token_limit', sa.Integer(), nullable=True),
        sa.Column('monthly_token_limit', sa.Integer(), nullable=True),
        
        # Current usage
        sa.Column('current_daily_requests', sa.Integer(), default=0),
        sa.Column('current_monthly_requests', sa.Integer(), default=0),
        sa.Column('current_daily_cost', sa.Float(), default=0.0),
        sa.Column('current_monthly_cost', sa.Float(), default=0.0),
        sa.Column('current_daily_tokens', sa.Integer(), default=0),
        sa.Column('current_monthly_tokens', sa.Integer(), default=0),
        
        # Reset tracking
        sa.Column('last_daily_reset', sa.DateTime(), nullable=False),
        sa.Column('last_monthly_reset', sa.DateTime(), nullable=False),
        
        # Status
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('is_exceeded', sa.Boolean(), default=False),
        
        # Audit
        sa.Column('created_by_user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    
    # ========================================================================
    # SEED DEFAULT DATA
    # ========================================================================
    
    # Insert global defaults
    op.execute("""
        INSERT INTO genai_model_configs (
            config_name, config_type, temperature, max_tokens, top_p,
            frequency_penalty, presence_penalty, timeout_seconds, retry_attempts,
            is_active, is_default, version, created_at, updated_at
        ) VALUES (
            'global_defaults', 'global', 0.3, 2000, 0.9,
            0.0, 0.0, 30, 3,
            true, true, 1, NOW(), NOW()
        )
    """)
    
    # Insert default models in registry
    op.execute("""
        INSERT INTO genai_model_registry (
            model_identifier, provider, model_name, display_name,
            max_context_length, cost_per_1k_input_tokens, cost_per_1k_output_tokens,
            is_free, is_enabled, requires_api_key, is_local,
            description, added_at
        ) VALUES
        -- OpenAI Models
        ('openai:gpt-4', 'openai', 'gpt-4', 'OpenAI GPT-4', 8192, 0.03, 0.06, false, false, true, false, 'Most capable OpenAI model', NOW()),
        ('openai:gpt-4-turbo', 'openai', 'gpt-4-turbo-preview', 'OpenAI GPT-4 Turbo', 128000, 0.01, 0.03, false, false, true, false, 'Faster and cheaper GPT-4', NOW()),
        ('openai:gpt-3.5-turbo', 'openai', 'gpt-3.5-turbo', 'OpenAI GPT-3.5 Turbo', 16385, 0.0005, 0.0015, false, false, true, false, 'Fast and cost-effective', NOW()),
        
        -- Anthropic Models
        ('anthropic:claude-3-opus', 'anthropic', 'claude-3-opus-20240229', 'Claude 3 Opus', 200000, 0.015, 0.075, false, false, true, false, 'Most capable Claude model', NOW()),
        ('anthropic:claude-3-sonnet', 'anthropic', 'claude-3-sonnet-20240229', 'Claude 3 Sonnet', 200000, 0.003, 0.015, false, false, true, false, 'Balanced Claude model', NOW()),
        
        -- Google Models
        ('gemini:gemini-pro', 'gemini', 'gemini-pro', 'Google Gemini Pro', 32768, 0.00025, 0.0005, false, false, true, false, 'Google''s multimodal model', NOW()),
        
        -- Ollama (Local) Models
        ('ollama:llama3', 'ollama', 'llama3', 'Llama 3 (Local)', 8192, 0.0, 0.0, true, false, false, true, 'Free local model', NOW()),
        ('ollama:mistral', 'ollama', 'mistral', 'Mistral (Local)', 8192, 0.0, 0.0, true, false, false, true, 'Free local model', NOW()),
        ('ollama:codellama', 'ollama', 'codellama', 'Code Llama (Local)', 16384, 0.0, 0.0, true, false, false, true, 'Free local code model', NOW())
    """)


def downgrade():
    """Remove GenAI configuration tables."""
    op.drop_table('genai_usage_quotas')
    op.drop_table('genai_model_registry')
    op.drop_table('genai_request_logs')
    op.drop_table('genai_model_configs')
