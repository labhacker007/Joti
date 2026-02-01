"""Add RBAC permission tables

Revision ID: 007
Revises: 006
Create Date: 2026-01-23 01:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '007'
down_revision = '006'
branch_labels = None
depends_on = None


def upgrade():
    # Create role_permissions table
    op.execute("""
        CREATE TABLE IF NOT EXISTS role_permissions (
            id SERIAL PRIMARY KEY,
            role VARCHAR(50) NOT NULL,
            permission VARCHAR(100) NOT NULL,
            granted BOOLEAN DEFAULT TRUE NOT NULL,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(role, permission)
        );
    """)
    
    # Create index on role for faster lookups
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_role_permissions_role 
        ON role_permissions(role);
    """)
    
    # Create user_permission_overrides table
    op.execute("""
        CREATE TABLE IF NOT EXISTS user_permission_overrides (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            permission VARCHAR(100) NOT NULL,
            granted BOOLEAN NOT NULL,
            reason TEXT,
            created_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, permission)
        );
    """)
    
    # Create indexes for faster lookups
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_user_permission_overrides_user_id 
        ON user_permission_overrides(user_id);
    """)
    
    # Insert default role permissions based on current RBAC model
    op.execute("""
        INSERT INTO role_permissions (role, permission, granted, description) VALUES
        -- ADMIN: Full access
        ('ADMIN', 'read:articles', true, 'Read articles'),
        ('ADMIN', 'triage:articles', true, 'Triage articles'),
        ('ADMIN', 'analyze:articles', true, 'Analyze articles'),
        ('ADMIN', 'create:summary', true, 'Create summaries'),
        ('ADMIN', 'read:hunts', true, 'Read hunts'),
        ('ADMIN', 'create:hunts', true, 'Create hunts'),
        ('ADMIN', 'execute:hunts', true, 'Execute hunts'),
        ('ADMIN', 'manage:hunts', true, 'Manage hunts'),
        ('ADMIN', 'read:intelligence', true, 'Read intelligence'),
        ('ADMIN', 'extract:intelligence', true, 'Extract intelligence'),
        ('ADMIN', 'read:reports', true, 'Read reports'),
        ('ADMIN', 'create:reports', true, 'Create reports'),
        ('ADMIN', 'share:reports', true, 'Share reports'),
        ('ADMIN', 'manage:users', true, 'Manage users'),
        ('ADMIN', 'manage:connectors', true, 'Manage connectors'),
        ('ADMIN', 'view:audit', true, 'View audit logs'),
        ('ADMIN', 'manage:genai', true, 'Manage GenAI settings'),
        ('ADMIN', 'manage:knowledge', true, 'Manage knowledge base'),
        ('ADMIN', 'manage:rbac', true, 'Manage RBAC permissions'),
        
        -- TI (Threat Intelligence): Can read, analyze, create reports
        ('TI', 'read:articles', true, 'Read articles'),
        ('TI', 'triage:articles', true, 'Triage articles'),
        ('TI', 'analyze:articles', true, 'Analyze articles'),
        ('TI', 'create:summary', true, 'Create summaries'),
        ('TI', 'read:hunts', true, 'Read hunts'),
        ('TI', 'read:intelligence', true, 'Read intelligence'),
        ('TI', 'extract:intelligence', true, 'Extract intelligence'),
        ('TI', 'read:reports', true, 'Read reports'),
        ('TI', 'create:reports', true, 'Create reports'),
        ('TI', 'share:reports', true, 'Share reports'),
        
        -- TH (Threat Hunter): Can hunt and execute queries
        ('TH', 'read:articles', true, 'Read articles'),
        ('TH', 'read:hunts', true, 'Read hunts'),
        ('TH', 'create:hunts', true, 'Create hunts'),
        ('TH', 'execute:hunts', true, 'Execute hunts'),
        ('TH', 'manage:hunts', true, 'Manage hunts'),
        ('TH', 'read:intelligence', true, 'Read intelligence'),
        ('TH', 'read:reports', true, 'Read reports'),
        
        -- IR (Incident Response): Can read and respond
        ('IR', 'read:articles', true, 'Read articles'),
        ('IR', 'triage:articles', true, 'Triage articles'),
        ('IR', 'read:hunts', true, 'Read hunts'),
        ('IR', 'execute:hunts', true, 'Execute hunts'),
        ('IR', 'read:intelligence', true, 'Read intelligence'),
        ('IR', 'read:reports', true, 'Read reports'),
        
        -- VIEWER: Read-only access
        ('VIEWER', 'read:articles', true, 'Read articles'),
        ('VIEWER', 'read:hunts', true, 'Read hunts'),
        ('VIEWER', 'read:intelligence', true, 'Read intelligence'),
        ('VIEWER', 'read:reports', true, 'Read reports')
        
        ON CONFLICT (role, permission) DO NOTHING;
    """)


def downgrade():
    op.execute("DROP TABLE IF EXISTS user_permission_overrides;")
    op.execute("DROP TABLE IF EXISTS role_permissions;")
