"""
GenAI Configuration Models

Database models for GenAI model configuration with security controls.
"""

from enum import Enum
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Boolean,
    ForeignKey, JSON, Float, Index, UniqueConstraint, CheckConstraint
)
from sqlalchemy.orm import relationship
from app.core.database import Base


class ConfigType(str, Enum):
    """Configuration type."""
    GLOBAL = "global"
    MODEL = "model"
    USE_CASE = "use_case"


class GenAIModelConfig(Base):
    """
    GenAI model configuration with multi-level hierarchy.
    
    Security features:
    - Input validation via CHECK constraints
    - Audit trail (created_by, updated_by)
    - Soft delete (is_active flag)
    - Version tracking
    - Permission-based access control
    """
    __tablename__ = "genai_model_configs"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Configuration identification
    config_name = Column(String(100), unique=True, nullable=False, index=True)
    config_type = Column(String(20), nullable=False, index=True)  # global, model, use_case
    model_identifier = Column(String(100), nullable=True, index=True)  # e.g., 'openai:gpt-4'
    use_case = Column(String(50), nullable=True, index=True)  # e.g., 'extraction'
    
    # Model parameters (with security constraints)
    temperature = Column(Float, default=0.3, nullable=False)
    max_tokens = Column(Integer, default=2000, nullable=False)
    top_p = Column(Float, default=0.9, nullable=False)
    frequency_penalty = Column(Float, default=0.0, nullable=False)
    presence_penalty = Column(Float, default=0.0, nullable=False)
    
    # Advanced parameters
    stop_sequences = Column(JSON, default=[])
    timeout_seconds = Column(Integer, default=30, nullable=False)
    retry_attempts = Column(Integer, default=3, nullable=False)
    preferred_model = Column(String(100), nullable=True)
    
    # Cost control (security feature)
    max_cost_per_request = Column(Float, nullable=True)  # Maximum cost in USD
    fallback_model = Column(String(100), nullable=True)  # Cheaper fallback
    daily_request_limit = Column(Integer, nullable=True)  # Rate limiting
    
    # Security controls
    allowed_users = Column(JSON, default=[])  # User IDs who can use this config
    allowed_roles = Column(JSON, default=[])  # Roles who can use this config
    require_approval = Column(Boolean, default=False)  # Require admin approval
    
    # Metadata
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, index=True)
    is_default = Column(Boolean, default=False)
    version = Column(Integer, default=1)
    
    # Performance tracking
    avg_response_time_ms = Column(Integer, nullable=True)
    avg_tokens_used = Column(Integer, nullable=True)
    avg_cost_per_request = Column(Float, nullable=True)
    total_requests = Column(Integer, default=0)
    success_rate = Column(Float, nullable=True)
    last_used_at = Column(DateTime, nullable=True)
    
    # Audit trail
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    created_by = relationship("User", foreign_keys=[created_by_user_id])
    updated_by = relationship("User", foreign_keys=[updated_by_user_id])
    
    # Security constraints
    __table_args__ = (
        # Parameter validation
        CheckConstraint('temperature >= 0.0 AND temperature <= 2.0', name='check_temperature_range'),
        CheckConstraint('top_p >= 0.0 AND top_p <= 1.0', name='check_top_p_range'),
        CheckConstraint('frequency_penalty >= -2.0 AND frequency_penalty <= 2.0', name='check_freq_penalty_range'),
        CheckConstraint('presence_penalty >= -2.0 AND presence_penalty <= 2.0', name='check_pres_penalty_range'),
        CheckConstraint('max_tokens > 0 AND max_tokens <= 100000', name='check_max_tokens_range'),
        CheckConstraint('timeout_seconds > 0 AND timeout_seconds <= 300', name='check_timeout_range'),
        CheckConstraint('retry_attempts >= 0 AND retry_attempts <= 10', name='check_retry_range'),
        
        # Cost control validation
        CheckConstraint('max_cost_per_request IS NULL OR max_cost_per_request >= 0', name='check_max_cost_positive'),
        CheckConstraint('daily_request_limit IS NULL OR daily_request_limit > 0', name='check_daily_limit_positive'),
        
        # Indexes for performance
        Index('idx_genai_config_type', 'config_type'),
        Index('idx_genai_config_use_case', 'use_case'),
        Index('idx_genai_config_model', 'model_identifier'),
        Index('idx_genai_config_active', 'is_active'),
        Index('idx_genai_config_default', 'is_default'),
    )


class GenAIRequestLog(Base):
    """
    Audit log for all GenAI requests.
    
    Security features:
    - Complete audit trail
    - Cost tracking
    - Performance monitoring
    - Error tracking
    - User attribution
    """
    __tablename__ = "genai_request_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Request identification
    request_id = Column(String(100), unique=True, nullable=False, index=True)
    use_case = Column(String(50), nullable=False, index=True)
    model_used = Column(String(100), nullable=False, index=True)
    config_id = Column(Integer, ForeignKey("genai_model_configs.id"), nullable=True)
    
    # Request details
    prompt_length = Column(Integer, nullable=True)
    prompt_hash = Column(String(64), nullable=True, index=True)  # For deduplication
    
    # Parameters used
    temperature = Column(Float, nullable=True)
    max_tokens = Column(Integer, nullable=True)
    top_p = Column(Float, nullable=True)
    
    # Response details
    response_length = Column(Integer, nullable=True)
    tokens_used = Column(Integer, nullable=True)
    response_time_ms = Column(Integer, nullable=True)
    
    # Cost tracking (security feature)
    cost_usd = Column(Float, nullable=True)
    
    # Quality metrics
    confidence_score = Column(Float, nullable=True)
    user_feedback = Column(Integer, nullable=True)  # 1-5 rating
    was_successful = Column(Boolean, nullable=False, default=True)
    error_message = Column(Text, nullable=True)
    error_type = Column(String(50), nullable=True)
    
    # Security context
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    user_ip = Column(String(45), nullable=True)  # IPv4 or IPv6
    user_agent = Column(String(500), nullable=True)
    
    # Business context
    article_id = Column(Integer, ForeignKey("articles.id"), nullable=True, index=True)
    hunt_id = Column(Integer, ForeignKey("hunts.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    config = relationship("GenAIModelConfig")
    user = relationship("User")
    article = relationship("Article")
    
    __table_args__ = (
        Index('idx_genai_log_use_case', 'use_case'),
        Index('idx_genai_log_model', 'model_used'),
        Index('idx_genai_log_created', 'created_at'),
        Index('idx_genai_log_user', 'user_id'),
        Index('idx_genai_log_article', 'article_id'),
        Index('idx_genai_log_success', 'was_successful'),
    )


class GenAIModelRegistry(Base):
    """
    Registry of available GenAI models.
    
    Security features:
    - Model whitelisting
    - Cost tracking
    - Capability restrictions
    - Admin approval required
    """
    __tablename__ = "genai_model_registry"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Model identification
    model_identifier = Column(String(100), unique=True, nullable=False, index=True)
    provider = Column(String(50), nullable=False, index=True)  # openai, ollama, anthropic, gemini
    model_name = Column(String(100), nullable=False)
    display_name = Column(String(200), nullable=False)
    
    # Model capabilities
    supports_streaming = Column(Boolean, default=False)
    supports_function_calling = Column(Boolean, default=False)
    supports_vision = Column(Boolean, default=False)
    max_context_length = Column(Integer, nullable=False)
    
    # Cost information (security feature)
    cost_per_1k_input_tokens = Column(Float, nullable=True)
    cost_per_1k_output_tokens = Column(Float, nullable=True)
    is_free = Column(Boolean, default=False)
    
    # Security controls
    is_enabled = Column(Boolean, default=False, index=True)
    requires_api_key = Column(Boolean, default=True)
    is_local = Column(Boolean, default=False)  # Local models (Ollama) are safer
    requires_admin_approval = Column(Boolean, default=True)
    
    # Access control
    allowed_for_use_cases = Column(JSON, default=[])  # Which use cases can use this
    restricted_to_roles = Column(JSON, default=[])  # Which roles can use this
    
    # Metadata
    description = Column(Text, nullable=True)
    documentation_url = Column(String(500), nullable=True)
    
    # Performance tracking
    total_requests = Column(Integer, default=0)
    total_cost = Column(Float, default=0.0)
    avg_response_time_ms = Column(Integer, nullable=True)
    success_rate = Column(Float, nullable=True)
    
    # Audit
    added_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    added_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    approved_at = Column(DateTime, nullable=True)
    last_used_at = Column(DateTime, nullable=True)
    
    # Relationships
    added_by = relationship("User", foreign_keys=[added_by_user_id])
    approved_by = relationship("User", foreign_keys=[approved_by_user_id])
    
    __table_args__ = (
        Index('idx_genai_registry_provider', 'provider'),
        Index('idx_genai_registry_enabled', 'is_enabled'),
        Index('idx_genai_registry_free', 'is_free'),
    )


class GenAIUsageQuota(Base):
    """
    Usage quotas for cost control.
    
    Security features:
    - Per-user quotas
    - Per-role quotas
    - Daily/monthly limits
    - Cost limits
    - Request rate limiting
    """
    __tablename__ = "genai_usage_quotas"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Quota identification
    quota_name = Column(String(100), unique=True, nullable=False)
    quota_type = Column(String(20), nullable=False)  # user, role, global
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    role_name = Column(String(50), nullable=True)
    
    # Limits
    daily_request_limit = Column(Integer, nullable=True)
    monthly_request_limit = Column(Integer, nullable=True)
    daily_cost_limit = Column(Float, nullable=True)
    monthly_cost_limit = Column(Float, nullable=True)
    daily_token_limit = Column(Integer, nullable=True)
    monthly_token_limit = Column(Integer, nullable=True)
    
    # Current usage (resets daily/monthly)
    current_daily_requests = Column(Integer, default=0)
    current_monthly_requests = Column(Integer, default=0)
    current_daily_cost = Column(Float, default=0.0)
    current_monthly_cost = Column(Float, default=0.0)
    current_daily_tokens = Column(Integer, default=0)
    current_monthly_tokens = Column(Integer, default=0)
    
    # Reset tracking
    last_daily_reset = Column(DateTime, default=datetime.utcnow)
    last_monthly_reset = Column(DateTime, default=datetime.utcnow)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_exceeded = Column(Boolean, default=False)
    
    # Audit
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    created_by = relationship("User", foreign_keys=[created_by_user_id])
    
    __table_args__ = (
        Index('idx_genai_quota_user', 'user_id'),
        Index('idx_genai_quota_role', 'role_name'),
        Index('idx_genai_quota_active', 'is_active'),
        Index('idx_genai_quota_exceeded', 'is_exceeded'),
    )


# =============================================================================
# GUARDRAIL MODELS
# =============================================================================

class GuardrailScope(str, Enum):
    """Scope of guardrail application."""
    GLOBAL = "global"           # Applied to all functions
    FUNCTION = "function"       # Applied to specific functions only


class GuardrailStatus(str, Enum):
    """Status of a guardrail."""
    ACTIVE = "active"
    DISABLED = "disabled"
    TESTING = "testing"


# Re-use Guardrail from app.models to avoid duplicate table registration
from app.models import Guardrail  # noqa: F401


class GuardrailAuditLog(Base):
    """
    Audit log for guardrail configuration changes.
    """
    __tablename__ = "guardrail_audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    guardrail_id = Column(Integer, ForeignKey("guardrails.id"), nullable=False)
    
    action = Column(String(50), nullable=False)  # created, updated, enabled, disabled, deleted
    changes = Column(JSON, default={})  # What changed (old vs new values)
    
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    guardrail = relationship("Guardrail")
    user = relationship("User")
    
    __table_args__ = (
        Index('idx_guardrail_audit_guardrail', 'guardrail_id'),
        Index('idx_guardrail_audit_action', 'action'),
        Index('idx_guardrail_audit_user', 'user_id'),
    )


class FunctionGuardrailOverride(Base):
    """
    Override guardrail settings for specific functions.
    Allows enabling/disabling guardrails per function.
    """
    __tablename__ = "function_guardrail_overrides"
    
    id = Column(Integer, primary_key=True, index=True)
    
    function_name = Column(String(50), nullable=False, index=True)  # e.g., "hunt_query"
    guardrail_id = Column(Integer, ForeignKey("guardrails.id"), nullable=False)
    
    # Override settings
    is_enabled = Column(Boolean, default=True)  # Override enable/disable for this function
    severity_override = Column(String(20), nullable=True)  # Override severity for this function
    custom_config = Column(JSON, default={})  # Override config for this function
    
    # Audit
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    guardrail = relationship("Guardrail")
    created_by = relationship("User", foreign_keys=[created_by_id])
    updated_by = relationship("User", foreign_keys=[updated_by_id])
    
    __table_args__ = (
        UniqueConstraint('function_name', 'guardrail_id', name='uq_function_guardrail'),
        Index('idx_override_function', 'function_name'),
        Index('idx_override_guardrail', 'guardrail_id'),
    )


class GuardrailTestResult(Base):
    """
    Stores results from guardrail test suite runs.
    Tracks accuracy, precision, recall, and F1 metrics over time.
    """
    __tablename__ = "guardrail_test_results"
    
    id = Column(Integer, primary_key=True, index=True)
    test_name = Column(String(200), nullable=True)
    
    # Test configuration
    use_case = Column(String(50), nullable=False)
    platform = Column(String(50), nullable=True)
    guardrail_ids = Column(JSON, nullable=True)  # Specific guardrails tested
    
    # Metrics
    total_tests = Column(Integer, nullable=False)
    accuracy = Column(Float, nullable=False)
    precision = Column(Float, nullable=False)
    recall = Column(Float, nullable=False)
    f1_score = Column(Float, nullable=False)
    true_positives = Column(Integer, nullable=False)
    true_negatives = Column(Integer, nullable=False)
    false_positives = Column(Integer, nullable=False)
    false_negatives = Column(Integer, nullable=False)
    
    # Results detail
    results_detail = Column(JSON, nullable=True)
    
    # Audit
    run_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    run_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    run_by = relationship("User", foreign_keys=[run_by_id])
    
    __table_args__ = (
        Index('idx_test_result_use_case', 'use_case'),
        Index('idx_test_result_run_at', 'run_at'),
    )


class GuardrailGroundTruthResult(Base):
    """
    Stores results from RAG ground truth validation tests.
    Used to track model accuracy against expected answers.
    """
    __tablename__ = "guardrail_ground_truth_results"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Test data
    query = Column(Text, nullable=False)
    expected_answer = Column(Text, nullable=False)
    context = Column(Text, nullable=True)
    actual_answer = Column(Text, nullable=True)
    
    # Model info
    model_used = Column(String(100), nullable=True)
    
    # Metrics
    exact_match = Column(Boolean, nullable=False)
    similarity = Column(Float, nullable=False)
    word_overlap = Column(Float, nullable=False)
    confidence = Column(String(20), nullable=True)
    assessment = Column(String(20), nullable=True)  # PASS, NEEDS_REVIEW, FAIL
    
    # Hallucination check
    hallucination_passed = Column(Boolean, nullable=True)
    hallucination_indicators = Column(JSON, nullable=True)
    
    # Audit
    run_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    run_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    run_by = relationship("User", foreign_keys=[run_by_id])
    
    __table_args__ = (
        Index('idx_ground_truth_run_at', 'run_at'),
    )
