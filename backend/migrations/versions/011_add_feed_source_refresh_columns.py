"""Add refresh interval columns to feed_sources table.

Revision ID: 011
Create Date: 2024-01-26
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = '011'
down_revision = '010_add_report_versions'
branch_labels = None
depends_on = None


def upgrade():
    """Add missing columns to feed_sources table."""
    # Add refresh_interval_minutes column
    op.add_column('feed_sources', 
        sa.Column('refresh_interval_minutes', sa.Integer(), nullable=True)
    )
    
    # Add auto_fetch_enabled column
    op.add_column('feed_sources',
        sa.Column('auto_fetch_enabled', sa.Boolean(), server_default='true', nullable=True)
    )
    
    # Add high_fidelity column if not exists
    try:
        op.add_column('feed_sources',
            sa.Column('high_fidelity', sa.Boolean(), server_default='false', nullable=True)
        )
    except Exception:
        pass  # Column might already exist


def downgrade():
    """Remove the columns."""
    op.drop_column('feed_sources', 'refresh_interval_minutes')
    op.drop_column('feed_sources', 'auto_fetch_enabled')
    try:
        op.drop_column('feed_sources', 'high_fidelity')
    except Exception:
        pass
