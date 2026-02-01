"""Add pluggable connector system

Revision ID: 018_pluggable_connectors
Revises: 017_add_ingested_at
Create Date: 2026-01-29

This migration adds a fully pluggable connector system:
- Platform registry (replaces hardcoded platform lists)
- Connector templates (low-code API definitions)
- Execution tracking for debugging and analytics
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '018_pluggable_connectors'
down_revision = '017_add_ingested_at'
branch_labels = None
depends_on = None


def upgrade():
    """Add pluggable connector tables."""
    
    # ========================================================================
    # CONNECTOR PLATFORMS - Platform registry
    # ========================================================================
    
    op.create_table(
        'connector_platforms',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('platform_id', sa.String(50), unique=True, nullable=False, index=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('vendor', sa.String(100), nullable=True),
        
        # Category
        sa.Column('category', sa.String(50), nullable=False, index=True),
        sa.Column('subcategory', sa.String(50), nullable=True),
        
        # Visual
        sa.Column('icon_url', sa.String(500), nullable=True),
        sa.Column('color', sa.String(20), nullable=True),
        
        # Capabilities
        sa.Column('capabilities', sa.JSON(), nullable=True),
        
        # Query language
        sa.Column('query_language', sa.String(50), nullable=True),
        sa.Column('query_syntax', sa.JSON(), nullable=True),
        sa.Column('documentation_url', sa.String(500), nullable=True),
        
        # Configuration
        sa.Column('config_schema', sa.JSON(), nullable=True),
        sa.Column('api_definition', sa.JSON(), nullable=True),
        
        # Status
        sa.Column('is_builtin', sa.Boolean(), default=False),
        sa.Column('is_active', sa.Boolean(), default=True, index=True),
        sa.Column('is_beta', sa.Boolean(), default=False),
        
        # Audit
        sa.Column('created_by_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('updated_by_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    
    # ========================================================================
    # CONNECTOR TEMPLATES - Reusable API definitions
    # ========================================================================
    
    op.create_table(
        'connector_templates',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('platform_id', sa.Integer(), sa.ForeignKey('connector_platforms.id', ondelete='CASCADE'), nullable=False),
        
        # Template identification
        sa.Column('template_id', sa.String(50), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        
        # Action type
        sa.Column('action_type', sa.String(30), nullable=False, index=True),
        
        # HTTP configuration
        sa.Column('http_method', sa.String(10), default='POST'),
        sa.Column('endpoint_path', sa.String(500), nullable=False),
        sa.Column('headers', sa.JSON(), nullable=True),
        sa.Column('request_template', sa.JSON(), nullable=True),
        sa.Column('content_type', sa.String(50), default='application/json'),
        sa.Column('query_params', sa.JSON(), nullable=True),
        
        # Response parsing
        sa.Column('response_parser', sa.JSON(), nullable=True),
        sa.Column('success_condition', sa.String(200), nullable=True),
        
        # Schema
        sa.Column('input_schema', sa.JSON(), nullable=True),
        sa.Column('output_schema', sa.JSON(), nullable=True),
        
        # Rate limiting
        sa.Column('rate_limit_requests', sa.Integer(), nullable=True),
        sa.Column('rate_limit_window_seconds', sa.Integer(), nullable=True),
        
        # Retry
        sa.Column('retry_on_status', sa.JSON(), nullable=True),
        sa.Column('max_retries', sa.Integer(), default=3),
        sa.Column('retry_delay_seconds', sa.Integer(), default=1),
        
        # Status
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('is_default', sa.Boolean(), default=False),
        
        # Audit
        sa.Column('created_by_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('updated_by_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
        
        # Constraints
        sa.UniqueConstraint('platform_id', 'template_id', name='uq_platform_template'),
    )
    
    # ========================================================================
    # CONNECTOR EXECUTIONS - Tracking
    # ========================================================================
    
    op.create_table(
        'connector_executions',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('connector_config_id', sa.Integer(), sa.ForeignKey('connector_configs.id', ondelete='SET NULL'), nullable=True),
        sa.Column('template_id', sa.Integer(), sa.ForeignKey('connector_templates.id', ondelete='SET NULL'), nullable=True),
        
        # Execution context
        sa.Column('platform_id', sa.String(50), nullable=False, index=True),
        sa.Column('action_type', sa.String(30), nullable=False),
        sa.Column('triggered_by', sa.String(50), nullable=True),
        
        # Request details
        sa.Column('request_url', sa.String(1000), nullable=True),
        sa.Column('request_method', sa.String(10), nullable=True),
        sa.Column('request_body_preview', sa.Text(), nullable=True),
        
        # Response details
        sa.Column('response_status', sa.Integer(), nullable=True),
        sa.Column('response_time_ms', sa.Integer(), nullable=True),
        sa.Column('response_body_preview', sa.Text(), nullable=True),
        
        # Result
        sa.Column('status', sa.String(20), nullable=False, index=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('result_count', sa.Integer(), nullable=True),
        
        # Correlation
        sa.Column('article_id', sa.Integer(), sa.ForeignKey('articles.id', ondelete='SET NULL'), nullable=True),
        sa.Column('hunt_id', sa.Integer(), sa.ForeignKey('hunts.id', ondelete='SET NULL'), nullable=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        
        # Timestamp
        sa.Column('executed_at', sa.DateTime(), nullable=False, server_default=sa.func.now(), index=True),
    )
    
    # ========================================================================
    # UPDATE CONNECTOR_CONFIGS
    # ========================================================================
    
    # Add new columns to connector_configs
    op.add_column('connector_configs', sa.Column('last_test_message', sa.Text(), nullable=True))
    op.add_column('connector_configs', sa.Column('created_by_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True))
    
    # Create index on connector_type if not exists
    op.create_index('idx_connector_type', 'connector_configs', ['connector_type'], if_not_exists=True)
    op.create_index('idx_connector_active', 'connector_configs', ['is_active'], if_not_exists=True)
    
    # ========================================================================
    # SEED BUILT-IN PLATFORMS
    # ========================================================================
    
    op.execute("""
        INSERT INTO connector_platforms (
            platform_id, name, description, vendor, category, subcategory,
            capabilities, query_language, is_builtin, is_active, created_at, updated_at
        ) VALUES
        -- SIEM Platforms
        ('defender', 'Microsoft Defender', 'Microsoft Defender for Endpoint and Microsoft 365 Defender', 'Microsoft', 
         'siem', 'xdr', '["hunt", "enrich", "ingest"]'::json, 'KQL', true, true, NOW(), NOW()),
        
        ('sentinel', 'Microsoft Sentinel', 'Cloud-native SIEM and SOAR platform', 'Microsoft',
         'siem', 'cloud_siem', '["hunt", "ingest", "export"]'::json, 'KQL', true, true, NOW(), NOW()),
        
        ('splunk', 'Splunk Enterprise', 'Enterprise security information and event management', 'Splunk',
         'siem', 'enterprise_siem', '["hunt", "ingest", "export"]'::json, 'SPL', true, true, NOW(), NOW()),
        
        ('xsiam', 'Palo Alto XSIAM', 'Extended Security Intelligence and Automation Management', 'Palo Alto Networks',
         'siem', 'xdr', '["hunt", "enrich", "ingest"]'::json, 'XQL', true, true, NOW(), NOW()),
        
        ('chronicle', 'Google Chronicle', 'Google Cloud security analytics platform', 'Google',
         'siem', 'cloud_siem', '["hunt", "ingest"]'::json, 'YARA-L', true, true, NOW(), NOW()),
        
        -- EDR Platforms
        ('crowdstrike', 'CrowdStrike Falcon', 'Cloud-native endpoint protection platform', 'CrowdStrike',
         'edr', 'cloud_edr', '["hunt", "enrich", "ingest"]'::json, 'FQL', true, true, NOW(), NOW()),
        
        ('sentinelone', 'SentinelOne', 'Autonomous endpoint protection', 'SentinelOne',
         'edr', 'cloud_edr', '["hunt", "enrich"]'::json, 'DeepVisibility', true, true, NOW(), NOW()),
        
        ('carbonblack', 'VMware Carbon Black', 'Endpoint security and workload protection', 'VMware',
         'edr', 'enterprise_edr', '["hunt", "enrich"]'::json, 'CBQL', true, true, NOW(), NOW()),
        
        -- Cloud Security
        ('wiz', 'Wiz', 'Agentless cloud security platform', 'Wiz',
         'cloud_security', 'cspm', '["hunt", "enrich"]'::json, 'GraphQL', true, true, NOW(), NOW()),
        
        ('prisma', 'Prisma Cloud', 'Cloud-native application protection platform', 'Palo Alto Networks',
         'cloud_security', 'cnapp', '["hunt", "enrich"]'::json, 'RQL', true, true, NOW(), NOW()),
        
        -- Enrichment/Sandbox
        ('virustotal', 'VirusTotal', 'Threat intelligence and file analysis', 'Google',
         'enrichment', 'threat_intel', '["enrich"]'::json, NULL, true, true, NOW(), NOW()),
        
        ('vmray', 'VMRay', 'Advanced malware sandbox analysis', 'VMRay',
         'sandbox', 'malware_analysis', '["enrich"]'::json, NULL, true, true, NOW(), NOW()),
        
        ('shodan', 'Shodan', 'Internet-connected device search engine', 'Shodan',
         'enrichment', 'osint', '["enrich"]'::json, NULL, true, true, NOW(), NOW()),
        
        ('greynoise', 'GreyNoise', 'Internet background noise intelligence', 'GreyNoise',
         'enrichment', 'threat_intel', '["enrich"]'::json, NULL, true, true, NOW(), NOW()),
        
        ('abuseipdb', 'AbuseIPDB', 'IP address reputation database', 'AbuseIPDB',
         'enrichment', 'threat_intel', '["enrich"]'::json, NULL, true, true, NOW(), NOW()),
        
        ('misp', 'MISP', 'Open source threat intelligence platform', 'MISP Project',
         'enrichment', 'tip', '["enrich", "ingest", "export"]'::json, NULL, true, true, NOW(), NOW()),
        
        ('opencti', 'OpenCTI', 'Open cyber threat intelligence platform', 'OpenCTI',
         'enrichment', 'tip', '["enrich", "ingest", "export"]'::json, NULL, true, true, NOW(), NOW()),
        
        -- Ticketing/SOAR
        ('servicenow', 'ServiceNow', 'IT service management and workflow automation', 'ServiceNow',
         'ticketing', 'itsm', '["notify", "export"]'::json, NULL, true, true, NOW(), NOW()),
        
        ('jira', 'Jira', 'Project and issue tracking', 'Atlassian',
         'ticketing', 'project_mgmt', '["notify", "export"]'::json, NULL, true, true, NOW(), NOW()),
        
        ('thehive', 'TheHive', 'Security incident response platform', 'TheHive Project',
         'soar', 'incident_response', '["notify", "export", "ingest"]'::json, NULL, true, true, NOW(), NOW()),
        
        -- Notification
        ('slack', 'Slack', 'Team messaging and collaboration', 'Salesforce',
         'notification', 'messaging', '["notify"]'::json, NULL, true, true, NOW(), NOW()),
        
        ('teams', 'Microsoft Teams', 'Microsoft collaboration platform', 'Microsoft',
         'notification', 'messaging', '["notify"]'::json, NULL, true, true, NOW(), NOW()),
        
        ('email', 'Email (SMTP)', 'Email notifications via SMTP', NULL,
         'notification', 'email', '["notify"]'::json, NULL, true, true, NOW(), NOW()),
        
        ('pagerduty', 'PagerDuty', 'Incident management platform', 'PagerDuty',
         'notification', 'alerting', '["notify"]'::json, NULL, true, true, NOW(), NOW()),
        
        ('webhook', 'Generic Webhook', 'Send data to custom HTTP endpoints', NULL,
         'integration', 'webhook', '["notify", "export"]'::json, NULL, true, true, NOW(), NOW())
    """)


def downgrade():
    """Remove pluggable connector tables."""
    op.drop_table('connector_executions')
    op.drop_table('connector_templates')
    op.drop_table('connector_platforms')
    
    # Remove added columns from connector_configs
    op.drop_column('connector_configs', 'last_test_message')
    op.drop_column('connector_configs', 'created_by_id')
