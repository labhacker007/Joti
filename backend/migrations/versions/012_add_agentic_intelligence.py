"""Add agentic intelligence tables

Revision ID: 012_agentic_intelligence
Revises: 011_add_feed_source_refresh_columns
Create Date: 2026-01-28

This migration adds comprehensive agentic intelligence capabilities:
- Canonical entity tables (ThreatActor, TTP)
- Extraction run tracking
- Article relationships and historical associations
- Semantic similarity support
- Campaign detection
- Priority scoring
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '012_agentic_intelligence'
down_revision = '011_add_feed_source_refresh_columns'
branch_labels = None
depends_on = None


def upgrade():
    """Add agentic intelligence tables."""
    
    # ========================================================================
    # CANONICAL ENTITY TABLES
    # ========================================================================
    
    # Threat Actors - Canonical table
    op.create_table(
        'threat_actors',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('canonical_name', sa.String(255), unique=True, nullable=False, index=True),
        sa.Column('aliases', sa.JSON(), nullable=True),
        sa.Column('actor_type', sa.String(50), nullable=True),
        sa.Column('attribution', sa.String(255), nullable=True),
        sa.Column('first_seen_at', sa.DateTime(), nullable=False),
        sa.Column('last_seen_at', sa.DateTime(), nullable=False),
        sa.Column('occurrence_count', sa.Integer(), default=1),
        sa.Column('confidence', sa.Integer(), default=50),
        sa.Column('attribution_confidence', sa.Integer(), default=50),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('tags', sa.JSON(), nullable=True),
        sa.Column('external_refs', sa.JSON(), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('is_false_positive', sa.Boolean(), default=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('idx_threat_actor_name', 'threat_actors', ['canonical_name'])
    op.create_index('idx_threat_actor_last_seen', 'threat_actors', ['last_seen_at'])
    op.create_index('idx_threat_actor_active', 'threat_actors', ['is_active'])
    
    # TTPs - Canonical table
    op.create_table(
        'ttps',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('mitre_id', sa.String(20), unique=True, nullable=False, index=True),
        sa.Column('name', sa.String(500), nullable=False),
        sa.Column('framework', sa.String(20), nullable=False),
        sa.Column('tactic', sa.String(100), nullable=True),
        sa.Column('technique', sa.String(255), nullable=True),
        sa.Column('first_seen_at', sa.DateTime(), nullable=False),
        sa.Column('last_seen_at', sa.DateTime(), nullable=False),
        sa.Column('occurrence_count', sa.Integer(), default=1),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('detection_methods', sa.JSON(), nullable=True),
        sa.Column('mitigation_methods', sa.JSON(), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('severity', sa.String(20), default='medium'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('idx_ttp_mitre_id', 'ttps', ['mitre_id'])
    op.create_index('idx_ttp_framework', 'ttps', ['framework'])
    op.create_index('idx_ttp_tactic', 'ttps', ['tactic'])
    op.create_index('idx_ttp_last_seen', 'ttps', ['last_seen_at'])
    
    # ========================================================================
    # ENTITY MAPPING TABLES
    # ========================================================================
    
    # Article-Actor mapping
    op.create_table(
        'article_actor_map',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('article_id', sa.Integer(), sa.ForeignKey('articles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('actor_id', sa.Integer(), sa.ForeignKey('threat_actors.id', ondelete='CASCADE'), nullable=False),
        sa.Column('extraction_run_id', sa.Integer(), sa.ForeignKey('extraction_runs.id'), nullable=True),
        sa.Column('confidence', sa.Integer(), default=50),
        sa.Column('evidence', sa.Text(), nullable=True),
        sa.Column('extracted_from', sa.String(50), default='original'),
        sa.Column('extracted_by', sa.String(50), default='genai'),
        sa.Column('extracted_at', sa.DateTime(), nullable=False),
        sa.UniqueConstraint('article_id', 'actor_id', name='uq_article_actor'),
    )
    op.create_index('idx_article_actor_article', 'article_actor_map', ['article_id'])
    op.create_index('idx_article_actor_actor', 'article_actor_map', ['actor_id'])
    
    # Article-TTP mapping
    op.create_table(
        'article_ttp_map',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('article_id', sa.Integer(), sa.ForeignKey('articles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('ttp_id', sa.Integer(), sa.ForeignKey('ttps.id', ondelete='CASCADE'), nullable=False),
        sa.Column('extraction_run_id', sa.Integer(), sa.ForeignKey('extraction_runs.id'), nullable=True),
        sa.Column('confidence', sa.Integer(), default=50),
        sa.Column('evidence', sa.Text(), nullable=True),
        sa.Column('extracted_from', sa.String(50), default='original'),
        sa.Column('extracted_by', sa.String(50), default='genai'),
        sa.Column('extracted_at', sa.DateTime(), nullable=False),
        sa.UniqueConstraint('article_id', 'ttp_id', name='uq_article_ttp'),
    )
    op.create_index('idx_article_ttp_article', 'article_ttp_map', ['article_id'])
    op.create_index('idx_article_ttp_ttp', 'article_ttp_map', ['ttp_id'])
    
    # Hunt-TTP mapping
    op.create_table(
        'hunt_ttp_map',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('hunt_id', sa.Integer(), sa.ForeignKey('hunts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('ttp_id', sa.Integer(), sa.ForeignKey('ttps.id', ondelete='CASCADE'), nullable=False),
        sa.Column('used_in_query', sa.Boolean(), default=True),
        sa.Column('detected_in_results', sa.Boolean(), default=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.UniqueConstraint('hunt_id', 'ttp_id', name='uq_hunt_ttp'),
    )
    op.create_index('idx_hunt_ttp_hunt', 'hunt_ttp_map', ['hunt_id'])
    op.create_index('idx_hunt_ttp_ttp', 'hunt_ttp_map', ['ttp_id'])
    
    # Hunt-IOC mapping
    op.create_table(
        'hunt_ioc_map',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('hunt_id', sa.Integer(), sa.ForeignKey('hunts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('ioc_id', sa.Integer(), sa.ForeignKey('iocs.id', ondelete='CASCADE'), nullable=False),
        sa.Column('used_in_query', sa.Boolean(), default=True),
        sa.Column('detected_in_results', sa.Boolean(), default=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.UniqueConstraint('hunt_id', 'ioc_id', name='uq_hunt_ioc'),
    )
    op.create_index('idx_hunt_ioc_hunt', 'hunt_ioc_map', ['hunt_id'])
    op.create_index('idx_hunt_ioc_ioc', 'hunt_ioc_map', ['ioc_id'])
    
    # ========================================================================
    # EXTRACTION RUN TRACKING
    # ========================================================================
    
    op.create_table(
        'extraction_runs',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('article_id', sa.Integer(), sa.ForeignKey('articles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('run_number', sa.Integer(), default=1),
        sa.Column('status', sa.String(20), default='PENDING'),
        sa.Column('used_original_content', sa.Boolean(), default=True),
        sa.Column('used_executive_summary', sa.Boolean(), default=False),
        sa.Column('used_technical_summary', sa.Boolean(), default=False),
        sa.Column('model_used', sa.String(100), nullable=True),
        sa.Column('model_provider', sa.String(50), nullable=True),
        sa.Column('iocs_extracted', sa.Integer(), default=0),
        sa.Column('ttps_extracted', sa.Integer(), default=0),
        sa.Column('actors_extracted', sa.Integer(), default=0),
        sa.Column('total_entities', sa.Integer(), default=0),
        sa.Column('duration_ms', sa.Integer(), nullable=True),
        sa.Column('tokens_used', sa.Integer(), nullable=True),
        sa.Column('confidence_avg', sa.Float(), nullable=True),
        sa.Column('false_positive_rate', sa.Float(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('warnings', sa.JSON(), nullable=True),
        sa.Column('compared_with_model', sa.String(100), nullable=True),
        sa.Column('comparison_winner', sa.Boolean(), default=False),
        sa.Column('comparison_score', sa.Float(), nullable=True),
        sa.Column('triggered_by', sa.String(50), default='auto'),
        sa.Column('triggered_by_user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, index=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
    )
    op.create_index('idx_extraction_run_article', 'extraction_runs', ['article_id'])
    op.create_index('idx_extraction_run_created', 'extraction_runs', ['created_at'])
    op.create_index('idx_extraction_run_status', 'extraction_runs', ['status'])
    
    # ========================================================================
    # ARTICLE SUMMARIES
    # ========================================================================
    
    op.create_table(
        'article_summaries',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('article_id', sa.Integer(), sa.ForeignKey('articles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('extraction_run_id', sa.Integer(), sa.ForeignKey('extraction_runs.id'), nullable=True),
        sa.Column('summary_type', sa.String(20), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('version', sa.Integer(), default=1),
        sa.Column('model_used', sa.String(100), nullable=True),
        sa.Column('prompt_version', sa.String(20), nullable=True),
        sa.Column('word_count', sa.Integer(), nullable=True),
        sa.Column('readability_score', sa.Float(), nullable=True),
        sa.Column('is_current', sa.Boolean(), default=True),
        sa.Column('is_approved', sa.Boolean(), default=False),
        sa.Column('generated_by_user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('approved_by_user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('approved_at', sa.DateTime(), nullable=True),
    )
    op.create_index('idx_article_summary_article', 'article_summaries', ['article_id'])
    op.create_index('idx_article_summary_type', 'article_summaries', ['summary_type'])
    op.create_index('idx_article_summary_current', 'article_summaries', ['is_current'])
    
    # ========================================================================
    # ARTICLE RELATIONSHIPS
    # ========================================================================
    
    op.create_table(
        'article_relationships',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('source_article_id', sa.Integer(), sa.ForeignKey('articles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('related_article_id', sa.Integer(), sa.ForeignKey('articles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('relationship_types', sa.JSON(), nullable=True),
        sa.Column('ioc_overlap_score', sa.Float(), default=0.0),
        sa.Column('ttp_overlap_score', sa.Float(), default=0.0),
        sa.Column('actor_match_score', sa.Float(), default=0.0),
        sa.Column('semantic_similarity_score', sa.Float(), nullable=True),
        sa.Column('overall_score', sa.Float(), nullable=False),
        sa.Column('shared_ioc_count', sa.Integer(), default=0),
        sa.Column('shared_ttp_count', sa.Integer(), default=0),
        sa.Column('shared_actor_count', sa.Integer(), default=0),
        sa.Column('shared_ioc_ids', sa.JSON(), nullable=True),
        sa.Column('shared_ttp_ids', sa.JSON(), nullable=True),
        sa.Column('shared_actor_ids', sa.JSON(), nullable=True),
        sa.Column('lookback_days', sa.Integer(), nullable=False),
        sa.Column('config_snapshot', sa.JSON(), nullable=True),
        sa.Column('is_campaign', sa.Boolean(), default=False),
        sa.Column('campaign_id', sa.String(100), nullable=True),
        sa.Column('is_verified', sa.Boolean(), default=False),
        sa.Column('computed_at', sa.DateTime(), nullable=False),
        sa.Column('verified_by_user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('verified_at', sa.DateTime(), nullable=True),
        sa.UniqueConstraint('source_article_id', 'related_article_id', name='uq_article_relationship'),
    )
    op.create_index('idx_article_rel_source', 'article_relationships', ['source_article_id'])
    op.create_index('idx_article_rel_related', 'article_relationships', ['related_article_id'])
    op.create_index('idx_article_rel_score', 'article_relationships', ['overall_score'])
    op.create_index('idx_article_rel_campaign', 'article_relationships', ['campaign_id'])
    op.create_index('idx_article_rel_source_score', 'article_relationships', ['source_article_id', 'overall_score'])
    
    # ========================================================================
    # SEMANTIC SIMILARITY
    # ========================================================================
    
    op.create_table(
        'article_embeddings',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('article_id', sa.Integer(), sa.ForeignKey('articles.id', ondelete='CASCADE'), unique=True, nullable=False),
        sa.Column('embedding', sa.JSON(), nullable=False),
        sa.Column('embedding_model', sa.String(100), nullable=False),
        sa.Column('embedding_dimension', sa.Integer(), nullable=False),
        sa.Column('source_text', sa.String(50), default='technical_summary'),
        sa.Column('source_hash', sa.String(64), nullable=True),
        sa.Column('token_count', sa.Integer(), nullable=True),
        sa.Column('generation_time_ms', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('idx_article_embedding_article', 'article_embeddings', ['article_id'])
    
    # ========================================================================
    # SIMILARITY CONFIGURATION
    # ========================================================================
    
    op.create_table(
        'similarity_config',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('config_name', sa.String(100), unique=True, nullable=False),
        sa.Column('lookback_days', sa.Integer(), default=365),
        sa.Column('ioc_weight', sa.Float(), default=0.40),
        sa.Column('ttp_weight', sa.Float(), default=0.30),
        sa.Column('actor_weight', sa.Float(), default=0.20),
        sa.Column('semantic_weight', sa.Float(), default=0.10),
        sa.Column('minimum_score', sa.Float(), default=0.60),
        sa.Column('minimum_shared_entities', sa.Integer(), default=1),
        sa.Column('require_exact_match', sa.Boolean(), default=False),
        sa.Column('semantic_enabled', sa.Boolean(), default=True),
        sa.Column('semantic_threshold', sa.Float(), default=0.75),
        sa.Column('semantic_model', sa.String(100), default='sentence-transformers/all-MiniLM-L6-v2'),
        sa.Column('campaign_detection_enabled', sa.Boolean(), default=True),
        sa.Column('campaign_min_articles', sa.Integer(), default=3),
        sa.Column('campaign_time_window_days', sa.Integer(), default=90),
        sa.Column('campaign_min_shared_entities', sa.Integer(), default=2),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('is_default', sa.Boolean(), default=False),
        sa.Column('created_by_user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('updated_by_user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('idx_similarity_config_active', 'similarity_config', ['is_active'])
    op.create_index('idx_similarity_config_default', 'similarity_config', ['is_default'])
    
    # ========================================================================
    # CAMPAIGN DETECTION
    # ========================================================================
    
    op.create_table(
        'campaigns',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('campaign_id', sa.String(100), unique=True, nullable=False, index=True),
        sa.Column('name', sa.String(500), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('campaign_type', sa.String(50), nullable=True),
        sa.Column('threat_level', sa.String(20), default='medium'),
        sa.Column('primary_actor_id', sa.Integer(), sa.ForeignKey('threat_actors.id'), nullable=True),
        sa.Column('associated_actor_ids', sa.JSON(), nullable=True),
        sa.Column('signature_ioc_ids', sa.JSON(), nullable=True),
        sa.Column('signature_ttp_ids', sa.JSON(), nullable=True),
        sa.Column('article_count', sa.Integer(), default=0),
        sa.Column('total_iocs', sa.Integer(), default=0),
        sa.Column('total_ttps', sa.Integer(), default=0),
        sa.Column('total_actors', sa.Integer(), default=0),
        sa.Column('first_seen_at', sa.DateTime(), nullable=False),
        sa.Column('last_seen_at', sa.DateTime(), nullable=False),
        sa.Column('duration_days', sa.Integer(), default=0),
        sa.Column('detection_confidence', sa.Float(), default=0.5),
        sa.Column('detection_method', sa.String(50), default='entity_clustering'),
        sa.Column('config_used', sa.JSON(), nullable=True),
        sa.Column('status', sa.String(20), default='active'),
        sa.Column('is_verified', sa.Boolean(), default=False),
        sa.Column('detected_at', sa.DateTime(), nullable=False),
        sa.Column('verified_by_user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('verified_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('idx_campaign_id', 'campaigns', ['campaign_id'])
    op.create_index('idx_campaign_status', 'campaigns', ['status'])
    op.create_index('idx_campaign_last_seen', 'campaigns', ['last_seen_at'])
    op.create_index('idx_campaign_threat_level', 'campaigns', ['threat_level'])
    
    # Campaign-Article mapping
    op.create_table(
        'campaign_articles',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('campaign_id', sa.Integer(), sa.ForeignKey('campaigns.id', ondelete='CASCADE'), nullable=False),
        sa.Column('article_id', sa.Integer(), sa.ForeignKey('articles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('confidence', sa.Float(), default=0.5),
        sa.Column('is_seed_article', sa.Boolean(), default=False),
        sa.Column('contribution_score', sa.Float(), nullable=True),
        sa.Column('added_at', sa.DateTime(), nullable=False),
        sa.UniqueConstraint('campaign_id', 'article_id', name='uq_campaign_article'),
    )
    op.create_index('idx_campaign_article_campaign', 'campaign_articles', ['campaign_id'])
    op.create_index('idx_campaign_article_article', 'campaign_articles', ['article_id'])
    
    # ========================================================================
    # ENTITY TIMELINE
    # ========================================================================
    
    op.create_table(
        'entity_events',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('entity_type', sa.String(20), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=False),
        sa.Column('event_type', sa.String(50), nullable=False),
        sa.Column('event_date', sa.DateTime(), nullable=False, index=True),
        sa.Column('article_id', sa.Integer(), sa.ForeignKey('articles.id', ondelete='CASCADE'), nullable=True),
        sa.Column('hunt_id', sa.Integer(), sa.ForeignKey('hunts.id', ondelete='CASCADE'), nullable=True),
        sa.Column('extraction_run_id', sa.Integer(), sa.ForeignKey('extraction_runs.id'), nullable=True),
        sa.Column('confidence', sa.Integer(), default=50),
        sa.Column('context', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('idx_entity_event_type_id', 'entity_events', ['entity_type', 'entity_id'])
    op.create_index('idx_entity_event_date', 'entity_events', ['event_date'])
    op.create_index('idx_entity_event_article', 'entity_events', ['article_id'])
    
    # ========================================================================
    # PRIORITY SCORING
    # ========================================================================
    
    op.create_table(
        'article_priority_scores',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('article_id', sa.Integer(), sa.ForeignKey('articles.id', ondelete='CASCADE'), unique=True, nullable=False),
        sa.Column('priority_score', sa.Float(), nullable=False),
        sa.Column('priority_level', sa.String(20), nullable=False),
        sa.Column('entity_criticality_score', sa.Float(), default=0.0),
        sa.Column('historical_context_score', sa.Float(), default=0.0),
        sa.Column('actor_attribution_score', sa.Float(), default=0.0),
        sa.Column('recency_score', sa.Float(), default=0.0),
        sa.Column('confidence_score', sa.Float(), default=0.0),
        sa.Column('has_active_campaign', sa.Boolean(), default=False),
        sa.Column('has_known_actor', sa.Boolean(), default=False),
        sa.Column('has_critical_iocs', sa.Boolean(), default=False),
        sa.Column('has_exploitation_ttps', sa.Boolean(), default=False),
        sa.Column('score_explanation', sa.JSON(), nullable=True),
        sa.Column('calculated_at', sa.DateTime(), nullable=False),
        sa.Column('calculation_version', sa.String(20), default='v1'),
    )
    op.create_index('idx_priority_score_article', 'article_priority_scores', ['article_id'])
    op.create_index('idx_priority_score_level', 'article_priority_scores', ['priority_level'])
    op.create_index('idx_priority_score_value', 'article_priority_scores', ['priority_score'])
    
    # ========================================================================
    # CREATE DEFAULT SIMILARITY CONFIG
    # ========================================================================
    
    # Insert default configuration
    op.execute("""
        INSERT INTO similarity_config (
            config_name, lookback_days, ioc_weight, ttp_weight, actor_weight, semantic_weight,
            minimum_score, minimum_shared_entities, require_exact_match,
            semantic_enabled, semantic_threshold, semantic_model,
            campaign_detection_enabled, campaign_min_articles, campaign_time_window_days, campaign_min_shared_entities,
            is_active, is_default, created_at, updated_at
        ) VALUES (
            'default', 365, 0.40, 0.30, 0.20, 0.10,
            0.60, 1, false,
            true, 0.75, 'sentence-transformers/all-MiniLM-L6-v2',
            true, 3, 90, 2,
            true, true, NOW(), NOW()
        )
    """)


def downgrade():
    """Remove agentic intelligence tables."""
    
    # Drop tables in reverse order (respecting foreign keys)
    op.drop_table('article_priority_scores')
    op.drop_table('entity_events')
    op.drop_table('campaign_articles')
    op.drop_table('campaigns')
    op.drop_table('similarity_config')
    op.drop_table('article_embeddings')
    op.drop_table('article_relationships')
    op.drop_table('article_summaries')
    op.drop_table('extraction_runs')
    op.drop_table('hunt_ioc_map')
    op.drop_table('hunt_ttp_map')
    op.drop_table('article_ttp_map')
    op.drop_table('article_actor_map')
    op.drop_table('ttps')
    op.drop_table('threat_actors')
