"""Add report version history table

Revision ID: 010_add_report_versions
Revises: 009
Create Date: 2026-01-23

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON

# revision identifiers, used by Alembic.
revision = '010_add_report_versions'
down_revision = '009'
branch_labels = None
depends_on = None


def upgrade():
    # Create report_versions table for version history
    op.create_table('report_versions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('report_id', sa.Integer(), nullable=False),
        sa.Column('version_number', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('executive_summary', sa.Text(), nullable=True),
        sa.Column('technical_summary', sa.Text(), nullable=True),
        sa.Column('key_findings', JSON, default=[]),
        sa.Column('recommendations', JSON, default=[]),
        sa.Column('report_type', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('created_by_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('change_notes', sa.Text(), nullable=True),
        sa.Column('change_summary', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['report_id'], ['reports.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('report_id', 'version_number', name='uq_report_version')
    )
    
    op.create_index('idx_report_versions_report', 'report_versions', ['report_id'])
    op.create_index('idx_report_versions_version', 'report_versions', ['version_number'])
    
    # Add parent_version_id to reports for tracking version lineage
    op.add_column('reports', sa.Column('parent_version_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_reports_parent_version', 'reports', 'report_versions', ['parent_version_id'], ['id'])
    
    # Add allow_edits flag to published reports
    op.add_column('reports', sa.Column('allow_edits', sa.Boolean(), server_default='false', nullable=False))


def downgrade():
    op.drop_constraint('fk_reports_parent_version', 'reports', type_='foreignkey')
    op.drop_column('reports', 'parent_version_id')
    op.drop_column('reports', 'allow_edits')
    op.drop_index('idx_report_versions_version')
    op.drop_index('idx_report_versions_report')
    op.drop_table('report_versions')
