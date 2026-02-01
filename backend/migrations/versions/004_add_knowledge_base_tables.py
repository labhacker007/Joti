"""Add knowledge base tables for RAG

Revision ID: 004_knowledge_base
Revises: 003_add_intelligence_review_columns
Create Date: 2026-01-22

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON

# revision identifiers, used by Alembic.
revision = '004_knowledge_base'
down_revision = '003_add_intelligence_review_columns'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create enum types first
    op.execute("CREATE TYPE knowledgedocumenttype AS ENUM ('product_documentation', 'query_syntax', 'threat_intel', 'playbook', 'policy', 'custom')")
    op.execute("CREATE TYPE knowledgedocumentstatus AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED')")
    
    # Create knowledge_documents table
    op.create_table(
        'knowledge_documents',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=500), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('doc_type', sa.Enum('product_documentation', 'query_syntax', 'threat_intel', 'playbook', 'policy', 'custom', name='knowledgedocumenttype'), nullable=True),
        sa.Column('source_type', sa.String(length=20), nullable=False),
        sa.Column('source_url', sa.Text(), nullable=True),
        sa.Column('file_name', sa.String(length=255), nullable=True),
        sa.Column('file_path', sa.String(length=500), nullable=True),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('mime_type', sa.String(length=100), nullable=True),
        sa.Column('status', sa.Enum('PENDING', 'PROCESSING', 'READY', 'FAILED', name='knowledgedocumentstatus'), nullable=True),
        sa.Column('processing_error', sa.Text(), nullable=True),
        sa.Column('raw_content', sa.Text(), nullable=True),
        sa.Column('chunk_count', sa.Integer(), nullable=True),
        sa.Column('target_functions', JSON, nullable=True),
        sa.Column('target_platforms', JSON, nullable=True),
        sa.Column('tags', JSON, nullable=True),
        sa.Column('priority', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('uploaded_by_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('last_used_at', sa.DateTime(), nullable=True),
        sa.Column('usage_count', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['uploaded_by_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_knowledge_doc_type', 'knowledge_documents', ['doc_type'], unique=False)
    op.create_index('idx_knowledge_status', 'knowledge_documents', ['status'], unique=False)
    op.create_index('idx_knowledge_active', 'knowledge_documents', ['is_active'], unique=False)
    op.create_index(op.f('ix_knowledge_documents_id'), 'knowledge_documents', ['id'], unique=False)
    
    # Create knowledge_chunks table
    op.create_table(
        'knowledge_chunks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('document_id', sa.Integer(), nullable=False),
        sa.Column('chunk_index', sa.Integer(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('token_count', sa.Integer(), nullable=True),
        sa.Column('embedding', JSON, nullable=True),
        sa.Column('embedding_model', sa.String(length=100), nullable=True),
        sa.Column('chunk_metadata', JSON, nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['document_id'], ['knowledge_documents.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_chunk_document', 'knowledge_chunks', ['document_id'], unique=False)
    op.create_index(op.f('ix_knowledge_chunks_id'), 'knowledge_chunks', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_knowledge_chunks_id'), table_name='knowledge_chunks')
    op.drop_index('idx_chunk_document', table_name='knowledge_chunks')
    op.drop_table('knowledge_chunks')
    
    op.drop_index(op.f('ix_knowledge_documents_id'), table_name='knowledge_documents')
    op.drop_index('idx_knowledge_active', table_name='knowledge_documents')
    op.drop_index('idx_knowledge_status', table_name='knowledge_documents')
    op.drop_index('idx_knowledge_doc_type', table_name='knowledge_documents')
    op.drop_table('knowledge_documents')
    
    op.execute("DROP TYPE IF EXISTS knowledgedocumentstatus")
    op.execute("DROP TYPE IF EXISTS knowledgedocumenttype")
