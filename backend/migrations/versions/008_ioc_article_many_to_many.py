"""Add IOC-Article many-to-many relationship

Revision ID: 008
Revises: 007
Create Date: 2026-01-23 01:30:00.000000

This migration creates a proper IOC table with many-to-many relationships to articles.
Same IOC can appear in multiple articles, and articles can have multiple IOCs.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '008'
down_revision = '007'
branch_labels = None
depends_on = None


def upgrade():
    # Create central IOC table
    op.execute("""
        CREATE TABLE IF NOT EXISTS iocs (
            id SERIAL PRIMARY KEY,
            value VARCHAR NOT NULL,
            ioc_type VARCHAR(50) NOT NULL,
            description TEXT,
            confidence INTEGER DEFAULT 50,
            first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            occurrence_count INTEGER DEFAULT 1,
            is_false_positive BOOLEAN DEFAULT FALSE,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(value, ioc_type)
        );
    """)
    
    # Create indexes for performance
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_iocs_value ON iocs(value);
        CREATE INDEX IF NOT EXISTS idx_iocs_type ON iocs(ioc_type);
        CREATE INDEX IF NOT EXISTS idx_iocs_last_seen ON iocs(last_seen_at);
    """)
    
    # Create junction table for IOC-Article relationship
    op.execute("""
        CREATE TABLE IF NOT EXISTS article_iocs (
            id SERIAL PRIMARY KEY,
            article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
            ioc_id INTEGER NOT NULL REFERENCES iocs(id) ON DELETE CASCADE,
            extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            extracted_by VARCHAR(50) DEFAULT 'genai',
            confidence INTEGER DEFAULT 50,
            evidence TEXT,
            context TEXT,
            UNIQUE(article_id, ioc_id)
        );
    """)
    
    # Create indexes
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_article_iocs_article ON article_iocs(article_id);
        CREATE INDEX IF NOT EXISTS idx_article_iocs_ioc ON article_iocs(ioc_id);
    """)
    
    # Migrate existing IOCs from extracted_intelligence to new structure
    op.execute("""
        -- Insert unique IOCs into iocs table
        INSERT INTO iocs (value, ioc_type, confidence, first_seen_at, last_seen_at, occurrence_count)
        SELECT 
            value,
            (metadata->>'ioc_type')::VARCHAR as ioc_type,
            AVG(confidence)::INTEGER as confidence,
            MIN(created_at) as first_seen_at,
            MAX(created_at) as last_seen_at,
            COUNT(*) as occurrence_count
        FROM extracted_intelligence
        WHERE intelligence_type = 'IOC'
        GROUP BY value, (metadata->>'ioc_type')
        ON CONFLICT (value, ioc_type) DO NOTHING;
        
        -- Create article-ioc relationships
        INSERT INTO article_iocs (article_id, ioc_id, extracted_at, confidence, evidence)
        SELECT DISTINCT
            ei.article_id,
            i.id as ioc_id,
            ei.created_at as extracted_at,
            ei.confidence,
            ei.evidence
        FROM extracted_intelligence ei
        INNER JOIN iocs i ON ei.value = i.value 
            AND (ei.metadata->>'ioc_type')::VARCHAR = i.ioc_type
        WHERE ei.intelligence_type = 'IOC'
        ON CONFLICT (article_id, ioc_id) DO NOTHING;
    """)


def downgrade():
    op.execute("DROP TABLE IF EXISTS article_iocs;")
    op.execute("DROP TABLE IF EXISTS iocs;")
