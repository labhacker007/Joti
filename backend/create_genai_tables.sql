-- Create GenAI Configuration Tables
-- Run this manually if alembic migration doesn't work

-- Model Registry
CREATE TABLE IF NOT EXISTS genai_model_registry (
    id SERIAL PRIMARY KEY,
    model_identifier VARCHAR(100) UNIQUE NOT NULL,
    provider VARCHAR(50) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    
    -- Capabilities
    supports_streaming BOOLEAN DEFAULT FALSE,
    supports_function_calling BOOLEAN DEFAULT FALSE,
    supports_vision BOOLEAN DEFAULT FALSE,
    max_context_length INTEGER NOT NULL,
    
    -- Cost
    cost_per_1k_input_tokens FLOAT,
    cost_per_1k_output_tokens FLOAT,
    is_free BOOLEAN DEFAULT FALSE,
    
    -- Security
    is_enabled BOOLEAN DEFAULT FALSE,
    requires_api_key BOOLEAN DEFAULT TRUE,
    is_local BOOLEAN DEFAULT FALSE,
    requires_admin_approval BOOLEAN DEFAULT TRUE,
    
    -- Access control
    allowed_for_use_cases JSON,
    restricted_to_roles JSON,
    
    -- Metadata
    description TEXT,
    documentation_url VARCHAR(500),
    
    -- Performance
    total_requests INTEGER DEFAULT 0,
    total_cost FLOAT DEFAULT 0.0,
    avg_response_time_ms INTEGER,
    success_rate FLOAT,
    
    -- Audit
    added_by_user_id INTEGER REFERENCES users(id),
    approved_by_user_id INTEGER REFERENCES users(id),
    added_at TIMESTAMP NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMP,
    last_used_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_genai_registry_provider ON genai_model_registry(provider);
CREATE INDEX IF NOT EXISTS idx_genai_registry_enabled ON genai_model_registry(is_enabled);

-- Model Configurations
CREATE TABLE IF NOT EXISTS genai_model_configs (
    id SERIAL PRIMARY KEY,
    config_name VARCHAR(100) UNIQUE NOT NULL,
    config_type VARCHAR(20) NOT NULL,
    model_identifier VARCHAR(100),
    use_case VARCHAR(50),
    
    -- Parameters
    temperature FLOAT DEFAULT 0.3 NOT NULL CHECK (temperature >= 0.0 AND temperature <= 2.0),
    max_tokens INTEGER DEFAULT 2000 NOT NULL CHECK (max_tokens > 0 AND max_tokens <= 100000),
    top_p FLOAT DEFAULT 0.9 NOT NULL CHECK (top_p >= 0.0 AND top_p <= 1.0),
    frequency_penalty FLOAT DEFAULT 0.0 NOT NULL CHECK (frequency_penalty >= -2.0 AND frequency_penalty <= 2.0),
    presence_penalty FLOAT DEFAULT 0.0 NOT NULL CHECK (presence_penalty >= -2.0 AND presence_penalty <= 2.0),
    
    -- Advanced
    stop_sequences JSON,
    timeout_seconds INTEGER DEFAULT 30 NOT NULL CHECK (timeout_seconds > 0 AND timeout_seconds <= 300),
    retry_attempts INTEGER DEFAULT 3 NOT NULL CHECK (retry_attempts >= 0 AND retry_attempts <= 10),
    preferred_model VARCHAR(100),
    
    -- Cost control
    max_cost_per_request FLOAT CHECK (max_cost_per_request IS NULL OR max_cost_per_request >= 0),
    fallback_model VARCHAR(100),
    daily_request_limit INTEGER CHECK (daily_request_limit IS NULL OR daily_request_limit > 0),
    
    -- Security
    allowed_users JSON,
    allowed_roles JSON,
    require_approval BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    version INTEGER DEFAULT 1,
    
    -- Performance
    avg_response_time_ms INTEGER,
    avg_tokens_used INTEGER,
    avg_cost_per_request FLOAT,
    total_requests INTEGER DEFAULT 0,
    success_rate FLOAT,
    last_used_at TIMESTAMP,
    
    -- Audit
    created_by_user_id INTEGER REFERENCES users(id),
    updated_by_user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_genai_config_type ON genai_model_configs(config_type);
CREATE INDEX IF NOT EXISTS idx_genai_config_use_case ON genai_model_configs(use_case);
CREATE INDEX IF NOT EXISTS idx_genai_config_active ON genai_model_configs(is_active);

-- Request Logs
CREATE TABLE IF NOT EXISTS genai_request_logs (
    id SERIAL PRIMARY KEY,
    request_id VARCHAR(100) UNIQUE NOT NULL,
    use_case VARCHAR(50) NOT NULL,
    model_used VARCHAR(100) NOT NULL,
    config_id INTEGER REFERENCES genai_model_configs(id),
    
    -- Request details
    prompt_length INTEGER,
    prompt_hash VARCHAR(64),
    temperature FLOAT,
    max_tokens INTEGER,
    top_p FLOAT,
    
    -- Response
    response_length INTEGER,
    tokens_used INTEGER,
    response_time_ms INTEGER,
    cost_usd FLOAT,
    
    -- Quality
    confidence_score FLOAT,
    user_feedback INTEGER,
    was_successful BOOLEAN NOT NULL DEFAULT TRUE,
    error_message TEXT,
    error_type VARCHAR(50),
    
    -- Security context
    user_id INTEGER REFERENCES users(id),
    user_ip VARCHAR(45),
    user_agent VARCHAR(500),
    
    -- Business context
    article_id INTEGER REFERENCES articles(id),
    hunt_id INTEGER REFERENCES hunts(id),
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_genai_log_use_case ON genai_request_logs(use_case);
CREATE INDEX IF NOT EXISTS idx_genai_log_model ON genai_request_logs(model_used);
CREATE INDEX IF NOT EXISTS idx_genai_log_created ON genai_request_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_genai_log_user ON genai_request_logs(user_id);

-- Usage Quotas
CREATE TABLE IF NOT EXISTS genai_usage_quotas (
    id SERIAL PRIMARY KEY,
    quota_name VARCHAR(100) UNIQUE NOT NULL,
    quota_type VARCHAR(20) NOT NULL,
    user_id INTEGER REFERENCES users(id),
    role_name VARCHAR(50),
    
    -- Limits
    daily_request_limit INTEGER,
    monthly_request_limit INTEGER,
    daily_cost_limit FLOAT,
    monthly_cost_limit FLOAT,
    daily_token_limit INTEGER,
    monthly_token_limit INTEGER,
    
    -- Current usage
    current_daily_requests INTEGER DEFAULT 0,
    current_monthly_requests INTEGER DEFAULT 0,
    current_daily_cost FLOAT DEFAULT 0.0,
    current_monthly_cost FLOAT DEFAULT 0.0,
    current_daily_tokens INTEGER DEFAULT 0,
    current_monthly_tokens INTEGER DEFAULT 0,
    
    -- Reset tracking
    last_daily_reset TIMESTAMP NOT NULL DEFAULT NOW(),
    last_monthly_reset TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_exceeded BOOLEAN DEFAULT FALSE,
    
    -- Audit
    created_by_user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_genai_quota_user ON genai_usage_quotas(user_id);
CREATE INDEX IF NOT EXISTS idx_genai_quota_role ON genai_usage_quotas(role_name);

-- Insert default data
INSERT INTO genai_model_configs (config_name, config_type, temperature, max_tokens, top_p, is_active, is_default, created_at, updated_at)
VALUES ('global_defaults', 'global', 0.3, 2000, 0.9, true, true, NOW(), NOW())
ON CONFLICT (config_name) DO NOTHING;

-- Insert default models
INSERT INTO genai_model_registry (model_identifier, provider, model_name, display_name, max_context_length, cost_per_1k_input_tokens, cost_per_1k_output_tokens, is_free, is_enabled, requires_api_key, is_local, description, added_at) VALUES
('openai:gpt-4', 'openai', 'gpt-4', 'OpenAI GPT-4', 8192, 0.03, 0.06, false, false, true, false, 'Most capable OpenAI model', NOW()),
('openai:gpt-4-turbo', 'openai', 'gpt-4-turbo-preview', 'OpenAI GPT-4 Turbo', 128000, 0.01, 0.03, false, false, true, false, 'Faster and cheaper GPT-4', NOW()),
('openai:gpt-3.5-turbo', 'openai', 'gpt-3.5-turbo', 'OpenAI GPT-3.5 Turbo', 16385, 0.0005, 0.0015, false, false, true, false, 'Fast and cost-effective', NOW()),
('anthropic:claude-3-opus', 'anthropic', 'claude-3-opus-20240229', 'Claude 3 Opus', 200000, 0.015, 0.075, false, false, true, false, 'Most capable Claude model', NOW()),
('anthropic:claude-3-sonnet', 'anthropic', 'claude-3-sonnet-20240229', 'Claude 3 Sonnet', 200000, 0.003, 0.015, false, false, true, false, 'Balanced Claude model', NOW()),
('gemini:gemini-pro', 'gemini', 'gemini-pro', 'Google Gemini Pro', 32768, 0.00025, 0.0005, false, false, true, false, 'Google''s multimodal model', NOW()),
('ollama:llama3', 'ollama', 'llama3', 'Llama 3 (Local)', 8192, 0.0, 0.0, true, false, false, true, 'Free local model', NOW()),
('ollama:mistral', 'ollama', 'mistral', 'Mistral (Local)', 8192, 0.0, 0.0, true, false, false, true, 'Free local model', NOW()),
('ollama:codellama', 'ollama', 'codellama', 'Code Llama (Local)', 16384, 0.0, 0.0, true, false, false, true, 'Free local code model', NOW())
ON CONFLICT (model_identifier) DO NOTHING;
