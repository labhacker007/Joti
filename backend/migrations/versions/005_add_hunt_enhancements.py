"""Add hunt enhancements - title, status, initiated_by, parent_hunt

Revision ID: 005
Revises: 004
Create Date: 2026-01-23

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade():
    # Add new columns to hunts table
    op.add_column('hunts', sa.Column('title', sa.String(), nullable=True))
    op.add_column('hunts', sa.Column('initiated_by_id', sa.Integer(), nullable=True))
    op.add_column('hunts', sa.Column('initiated_by_type', sa.String(), nullable=True, server_default='USER'))
    op.add_column('hunts', sa.Column('status', sa.String(), nullable=True, server_default='PENDING'))
    op.add_column('hunts', sa.Column('parent_hunt_id', sa.Integer(), nullable=True))
    op.add_column('hunts', sa.Column('updated_at', sa.DateTime(), nullable=True))
    
    # Add foreign key constraints
    op.create_foreign_key(
        'fk_hunts_initiated_by',
        'hunts', 'users',
        ['initiated_by_id'], ['id']
    )
    op.create_foreign_key(
        'fk_hunts_parent_hunt',
        'hunts', 'hunts',
        ['parent_hunt_id'], ['id']
    )
    
    # Add columns for hunt executions if missing
    try:
        op.add_column('hunt_executions', sa.Column('findings_summary', sa.Text(), nullable=True))
    except:
        pass  # Column may already exist
    
    try:
        op.add_column('hunt_executions', sa.Column('hits_count', sa.Integer(), nullable=True, server_default='0'))
    except:
        pass  # Column may already exist
    
    try:
        op.add_column('hunt_executions', sa.Column('email_sent', sa.Boolean(), nullable=True, server_default='false'))
    except:
        pass  # Column may already exist
    
    try:
        op.add_column('hunt_executions', sa.Column('servicenow_ticket_id', sa.String(), nullable=True))
    except:
        pass  # Column may already exist


def downgrade():
    # Remove foreign keys first
    op.drop_constraint('fk_hunts_initiated_by', 'hunts', type_='foreignkey')
    op.drop_constraint('fk_hunts_parent_hunt', 'hunts', type_='foreignkey')
    
    # Remove columns
    op.drop_column('hunts', 'title')
    op.drop_column('hunts', 'initiated_by_id')
    op.drop_column('hunts', 'initiated_by_type')
    op.drop_column('hunts', 'status')
    op.drop_column('hunts', 'parent_hunt_id')
    op.drop_column('hunts', 'updated_at')
    
    # Remove hunt_executions columns
    try:
        op.drop_column('hunt_executions', 'findings_summary')
    except:
        pass
    
    try:
        op.drop_column('hunt_executions', 'hits_count')
    except:
        pass
    
    try:
        op.drop_column('hunt_executions', 'email_sent')
    except:
        pass
    
    try:
        op.drop_column('hunt_executions', 'servicenow_ticket_id')
    except:
        pass
