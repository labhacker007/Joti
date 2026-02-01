"""Add query versioning to hunts and hunt executions.

Revision ID: 015_add_query_versioning
Revises: 014_add_hunt_tracking
Create Date: 2026-01-28
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '015_add_query_versioning'
down_revision = '014_add_hunt_tracking'
branch_labels = None
depends_on = None


def upgrade():
    # Add query_version to hunts table
    op.add_column('hunts', sa.Column('query_version', sa.Integer(), nullable=True, default=1))
    
    # Add query_version and query_snapshot to hunt_executions table
    op.add_column('hunt_executions', sa.Column('query_version', sa.Integer(), nullable=True, default=1))
    op.add_column('hunt_executions', sa.Column('query_snapshot', sa.Text(), nullable=True))
    
    # Set default values for existing rows
    op.execute("UPDATE hunts SET query_version = 1 WHERE query_version IS NULL")
    op.execute("UPDATE hunt_executions SET query_version = 1 WHERE query_version IS NULL")


def downgrade():
    op.drop_column('hunt_executions', 'query_snapshot')
    op.drop_column('hunt_executions', 'query_version')
    op.drop_column('hunts', 'query_version')
