"""Add SCHEDULED_TASK and ADMIN_ACTION audit event types

Revision ID: 019
Revises: 018
Create Date: 2026-01-31

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '019'
down_revision = '018'
branch_labels = None
depends_on = None


def upgrade():
    # Add new enum values to auditeventtype
    # PostgreSQL requires ALTER TYPE ... ADD VALUE
    op.execute("ALTER TYPE auditeventtype ADD VALUE IF NOT EXISTS 'SCHEDULED_TASK'")
    op.execute("ALTER TYPE auditeventtype ADD VALUE IF NOT EXISTS 'ADMIN_ACTION'")


def downgrade():
    # PostgreSQL doesn't support removing enum values easily
    # Would require recreating the type and all columns using it
    pass
