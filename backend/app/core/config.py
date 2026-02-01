import os
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # App
    APP_NAME: str = "Threat Intelligence Platform"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    # Database - Defaults for development, override in production
    DATABASE_URL: str = "postgresql://app_user:app_pass@postgres:5432/app_db"
    
    # Redis - Defaults for development
    REDIS_URL: str = "redis://redis:6379/0"
    
    # Security - Development default, MUST be changed in production
    SECRET_KEY: str = "dev-secret-key-change-in-production-minimum-32-chars"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24  # Back to 24 hours for development convenience
    REFRESH_TOKEN_EXPIRATION_DAYS: int = 7
    OTP_EXPIRATION_SECONDS: int = 300
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Validate critical security settings in production only
        if not self.DEBUG:  # Production mode
            if len(self.SECRET_KEY) < 32:
                raise ValueError("SECRET_KEY must be at least 32 characters long in production")
            if "dev-secret-key" in self.SECRET_KEY.lower() or "change-me" in self.SECRET_KEY.lower():
                raise ValueError("SECRET_KEY must be changed from default value in production")
        else:  # Development mode - just warn
            if "dev-secret-key" in self.SECRET_KEY.lower():
                import warnings
                warnings.warn("Using default SECRET_KEY - DO NOT use in production!", UserWarning)
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:8000"
    
    # Auth
    SAML_ENABLED: bool = False
    SAML_METADATA_URL: Optional[str] = None
    SAML_ENTITY_ID: Optional[str] = None
    SAML_ACS_URL: Optional[str] = None
    ENABLE_OTP: bool = True
    
    # Logging
    LOG_LEVEL: str = "INFO"
    JAEGER_ENABLED: bool = False
    JAEGER_AGENT_HOST: str = "localhost"
    JAEGER_AGENT_PORT: int = 6831
    PROMETHEUS_ENABLED: bool = True
    
    # Ingestion
    FEED_CHECK_INTERVAL_MINUTES: int = 30
    FEED_TIMEOUT_SECONDS: int = 30
    SSRF_ALLOWLIST_DOMAINS: str = "feeds.reuters.com,feeds.bloomberg.com"
    
    # GenAI - Multi-provider support
    GENAI_PROVIDER: str = "ollama"  # ollama, openai, anthropic, gemini
    GENAI_PRIMARY_MODEL: Optional[str] = "ollama"  # Primary model for GenAI operations
    GENAI_SECONDARY_MODEL: Optional[str] = None  # Fallback model
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4-turbo-preview"
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-1.5-pro"
    ANTHROPIC_API_KEY: Optional[str] = None  # Claude
    CLAUDE_API_KEY: Optional[str] = None  # Legacy alias
    ANTHROPIC_MODEL: str = "claude-3-5-sonnet-20241022"
    CLAUDE_MODEL: str = "claude-3-5-sonnet-20241022"  # Legacy alias
    # Ollama - Local LLM (default for local testing)
    # Ollama v0.14.2 - Using llama3:latest (8B) model
    OLLAMA_BASE_URL: str = "http://host.docker.internal:11434"  # Docker-friendly default
    OLLAMA_MODEL: str = "llama3:latest"  # Available on user's machine
    PROMPT_TEMPLATE_VERSION: str = "v1"
    
    # Hunt Connectors - XSIAM (Cortex XDR)
    XSIAM_TENANT_ID: Optional[str] = None
    XSIAM_API_KEY: Optional[str] = None
    XSIAM_API_KEY_ID: str = "1"
    XSIAM_FQDN: str = "api.xdr.paloaltonetworks.com"
    
    # Hunt Connectors - Microsoft Defender
    DEFENDER_TENANT_ID: Optional[str] = None
    DEFENDER_CLIENT_ID: Optional[str] = None
    DEFENDER_CLIENT_SECRET: Optional[str] = None
    
    # Hunt Connectors - Wiz
    WIZ_CLIENT_ID: Optional[str] = None
    WIZ_CLIENT_SECRET: Optional[str] = None
    WIZ_API_ENDPOINT: str = "https://api.us1.app.wiz.io/graphql"
    WIZ_AUTH_ENDPOINT: str = "https://auth.app.wiz.io/oauth/token"
    
    # Hunt Connectors - Splunk
    SPLUNK_HOST: Optional[str] = None
    SPLUNK_PORT: int = 8089
    SPLUNK_TOKEN: Optional[str] = None
    SPLUNK_USERNAME: Optional[str] = None
    SPLUNK_PASSWORD: Optional[str] = None
    SPLUNK_INDEX: str = "main"
    SPLUNK_VERIFY_SSL: bool = True
    
    # Hunt Connectors - VirusTotal
    VIRUSTOTAL_API_KEY: Optional[str] = None
    
    # Hunt Connectors - VMRay
    VMRAY_API_KEY: Optional[str] = None
    VMRAY_BASE_URL: str = "https://cloud.vmray.com/api"
    
    # Notifications
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM_EMAIL: Optional[str] = None
    SMTP_FROM_NAME: str = "Threat Intelligence Platform"
    SLACK_BOT_TOKEN: Optional[str] = None
    SLACK_CHANNEL_ALERTS: str = "#alerts"
    
    # ServiceNow Integration
    SERVICENOW_INSTANCE_URL: Optional[str] = None  # e.g., https://yourinstance.service-now.com
    SERVICENOW_USERNAME: Optional[str] = None
    SERVICENOW_PASSWORD: Optional[str] = None
    SERVICENOW_ASSIGNMENT_GROUP: Optional[str] = None
    
    # Retention
    ARTICLE_RETENTION_DAYS: int = 90
    AUDIT_RETENTION_DAYS: int = 365  # Alias for consistency
    AUDIT_LOG_RETENTION_DAYS: int = 365
    HUNT_RETENTION_DAYS: int = 180  # Alias for consistency
    HUNT_RESULTS_RETENTION_DAYS: int = 180
    
    # JWT (aliases for flexibility)
    JWT_EXPIRE_MINUTES: int = 1440  # 24 hours default
    
    # Features
    ENABLE_WATCH_LISTS: bool = True
    
    # Data storage
    DATA_DIR: str = "./data"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
