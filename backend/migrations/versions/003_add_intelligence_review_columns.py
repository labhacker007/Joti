"""Add review columns to extracted_intelligence table

Revision ID: 003
Revises: 002
Create Date: 2026-01-20

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade():
    """Add columns for intelligence review workflow."""
    # Add review columns to extracted_intelligence table
    op.add_column('extracted_intelligence', 
        sa.Column('is_reviewed', sa.Boolean(), nullable=True, default=False))
    op.add_column('extracted_intelligence', 
        sa.Column('reviewed_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True))
    op.add_column('extracted_intelligence', 
        sa.Column('reviewed_at', sa.DateTime(), nullable=True))
    op.add_column('extracted_intelligence', 
        sa.Column('is_false_positive', sa.Boolean(), nullable=True, default=False))
    op.add_column('extracted_intelligence', 
        sa.Column('notes', sa.Text(), nullable=True))
    
    # Set default values for existing rows
    op.execute("UPDATE extracted_intelligence SET is_reviewed = false WHERE is_reviewed IS NULL")
    op.execute("UPDATE extracted_intelligence SET is_false_positive = false WHERE is_false_positive IS NULL")


def downgrade():
    """Remove review columns from extracted_intelligence table."""
    op.drop_column('extracted_intelligence', 'notes')
    op.drop_column('extracted_intelligence', 'is_false_positive')
    op.drop_column('extracted_intelligence', 'reviewed_at')
    op.drop_column('extracted_intelligence', 'reviewed_by')
    op.drop_column('extracted_intelligence', 'is_reviewed')
