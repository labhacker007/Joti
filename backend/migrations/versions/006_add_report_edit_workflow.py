"""add report edit workflow

Revision ID: 006
Revises: 005
Create Date: 2026-01-23

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade():
    # Create ReportStatus enum
    reportstatus_enum = postgresql.ENUM('DRAFT', 'PUBLISHED', name='reportstatus', create_type=False)
    reportstatus_enum.create(op.get_bind(), checkfirst=True)
    
    # Add new columns to reports table
    op.add_column('reports', sa.Column('executive_summary', sa.Text(), nullable=True))
    op.add_column('reports', sa.Column('technical_summary', sa.Text(), nullable=True))
    op.add_column('reports', sa.Column('key_findings', sa.JSON(), nullable=True, server_default='[]'))
    op.add_column('reports', sa.Column('recommendations', sa.JSON(), nullable=True, server_default='[]'))
    op.add_column('reports', sa.Column('status', sa.Enum('DRAFT', 'PUBLISHED', name='reportstatus'), 
                                       nullable=False, server_default='DRAFT'))
    op.add_column('reports', sa.Column('edited_by_id', sa.Integer(), nullable=True))
    op.add_column('reports', sa.Column('edited_at', sa.DateTime(), nullable=True))
    op.add_column('reports', sa.Column('published_by_id', sa.Integer(), nullable=True))
    op.add_column('reports', sa.Column('published_at', sa.DateTime(), nullable=True))
    op.add_column('reports', sa.Column('version', sa.Integer(), nullable=False, server_default='1'))
    
    # Add foreign key constraints
    op.create_foreign_key('fk_reports_edited_by', 'reports', 'users', ['edited_by_id'], ['id'])
    op.create_foreign_key('fk_reports_published_by', 'reports', 'users', ['published_by_id'], ['id'])
    
    # Create index on status for filtering
    op.create_index('idx_reports_status', 'reports', ['status'])


def downgrade():
    # Drop indexes
    op.drop_index('idx_reports_status', table_name='reports')
    
    # Drop foreign keys
    op.drop_constraint('fk_reports_published_by', 'reports', type_='foreignkey')
    op.drop_constraint('fk_reports_edited_by', 'reports', type_='foreignkey')
    
    # Drop columns
    op.drop_column('reports', 'version')
    op.drop_column('reports', 'published_at')
    op.drop_column('reports', 'published_by_id')
    op.drop_column('reports', 'edited_at')
    op.drop_column('reports', 'edited_by_id')
    op.drop_column('reports', 'status')
    op.drop_column('reports', 'recommendations')
    op.drop_column('reports', 'key_findings')
    op.drop_column('reports', 'technical_summary')
    op.drop_column('reports', 'executive_summary')
    
    # Drop enum
    sa.Enum(name='reportstatus').drop(op.get_bind(), checkfirst=True)
