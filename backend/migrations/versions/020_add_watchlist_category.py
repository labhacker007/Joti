"""Add category column to watchlist_keywords

Revision ID: 020
Revises: 019
Create Date: 2026-02-16

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '020'
down_revision = '019'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('watchlist_keywords', sa.Column('category', sa.String(50), nullable=True))
    op.create_index('ix_watchlist_keywords_category', 'watchlist_keywords', ['category'])


def downgrade() -> None:
    op.drop_index('ix_watchlist_keywords_category', table_name='watchlist_keywords')
    op.drop_column('watchlist_keywords', 'category')
