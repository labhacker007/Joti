"""
Agentic Intelligence Data Models

This module contains enhanced data models for the agentic article intelligence system:
- Canonical entity tables (ThreatActor, TTP)
- Extraction run tracking
- Article relationships and historical associations
- Similarity configuration
- Summary versioning

These models work alongside existing models.py to provide:
- Single source of truth for entities
- Full traceability and lineage
- Historical association tracking
- Campaign detection capabilities
"""

from enum import Enum
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Boolean, 
    ForeignKey, JSON, Float, Index, UniqueConstraint, or_
)
from sqlalchemy.orm import relationship
from app.core.database import Base


# ============================================================================
# CANONICAL ENTITY TABLES - Single Source of Truth
# ============================================================================

class ThreatActor(Base):
    """
    Canonical threat actor table - single source of truth for threat actors.
    
    Tracks threat actors across all articles with:
    - Canonical naming
    - Alias management
    - Occurrence tracking
    - Attribution confidence
    """
    __tablename__ = "threat_actors"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Identity
    canonical_name = Column(String(255), unique=True, nullable=False, index=True)
    aliases = Column(JSON, default=[])  # Alternative names
    
    # Classification
    actor_type = Column(String(50), nullable=True)  # nation_state, cybercrime, hacktivist, etc.
    attribution = Column(String(255), nullable=True)  # Country/organization if known
    
    # Tracking
    first_seen_at = Column(DateTime, nullable=False)
    last_seen_at = Column(DateTime, nullable=False)
    occurrence_count = Column(Integer, default=1)
    
    # Confidence
    confidence = Column(Integer, default=50)  # 0-100
    attribution_confidence = Column(Integer, default=50)  # 0-100
    
    # Metadata
    description = Column(Text, nullable=True)
    tags = Column(JSON, default=[])  # ["apt", "russia", "espionage"]
    external_refs = Column(JSON, default=[])  # Links to threat reports
    
    # Status
    is_active = Column(Boolean, default=True)  # Still active threat
    is_false_positive = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    article_mappings = relationship("ArticleActorMap", back_populates="actor", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index("idx_threat_actor_name", "canonical_name"),
        Index("idx_threat_actor_last_seen", "last_seen_at"),
        Index("idx_threat_actor_active", "is_active"),
    )


class TTP(Base):
    """
    Canonical TTP (Tactics, Techniques, Procedures) table.
    
    Stores MITRE ATT&CK and ATLAS techniques as single source of truth.
    """
    __tablename__ = "ttps"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # MITRE Identification
    mitre_id = Column(String(20), unique=True, nullable=False, index=True)  # T1566.001, AML.T0027
    name = Column(String(500), nullable=False)
    
    # Classification
    framework = Column(String(20), nullable=False)  # "ATT&CK" or "ATLAS"
    tactic = Column(String(100), nullable=True)  # Initial Access, Execution, etc.
    technique = Column(String(255), nullable=True)  # Parent technique if sub-technique
    
    # Tracking
    first_seen_at = Column(DateTime, nullable=False)
    last_seen_at = Column(DateTime, nullable=False)
    occurrence_count = Column(Integer, default=1)
    
    # Metadata
    description = Column(Text, nullable=True)
    detection_methods = Column(JSON, default=[])  # How to detect this TTP
    mitigation_methods = Column(JSON, default=[])  # How to mitigate
    
    # Status
    is_active = Column(Boolean, default=True)
    severity = Column(String(20), default="medium")  # low, medium, high, critical
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    article_mappings = relationship("ArticleTTPMap", back_populates="ttp", cascade="all, delete-orphan")
    hunt_mappings = relationship("HuntTTPMap", back_populates="ttp", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index("idx_ttp_mitre_id", "mitre_id"),
        Index("idx_ttp_framework", "framework"),
        Index("idx_ttp_tactic", "tactic"),
        Index("idx_ttp_last_seen", "last_seen_at"),
    )


# ============================================================================
# ENTITY MAPPING TABLES - Many-to-Many Relationships
# ============================================================================

class ArticleActorMap(Base):
    """Maps articles to threat actors with extraction metadata."""
    __tablename__ = "article_actor_map"
    
    id = Column(Integer, primary_key=True, index=True)
    article_id = Column(Integer, ForeignKey("articles.id", ondelete="CASCADE"), nullable=False)
    actor_id = Column(Integer, ForeignKey("threat_actors.id", ondelete="CASCADE"), nullable=False)
    extraction_run_id = Column(Integer, ForeignKey("extraction_runs.id"), nullable=True)
    
    # Extraction details
    confidence = Column(Integer, default=50)
    evidence = Column(Text, nullable=True)  # Where in article actor was mentioned
    extracted_from = Column(String(50), default="original")  # original, executive_summary, technical_summary
    extracted_by = Column(String(50), default="genai")  # genai, regex, manual
    
    # Audit
    extracted_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    article = relationship("Article", backref="actor_mappings")
    actor = relationship("ThreatActor", back_populates="article_mappings")
    extraction_run = relationship("ExtractionRun", backref="actor_mappings")
    
    __table_args__ = (
        UniqueConstraint("article_id", "actor_id", name="uq_article_actor"),
        Index("idx_article_actor_article", "article_id"),
        Index("idx_article_actor_actor", "actor_id"),
    )


class ArticleTTPMap(Base):
    """Maps articles to TTPs with extraction metadata."""
    __tablename__ = "article_ttp_map"
    
    id = Column(Integer, primary_key=True, index=True)
    article_id = Column(Integer, ForeignKey("articles.id", ondelete="CASCADE"), nullable=False)
    ttp_id = Column(Integer, ForeignKey("ttps.id", ondelete="CASCADE"), nullable=False)
    extraction_run_id = Column(Integer, ForeignKey("extraction_runs.id"), nullable=True)
    
    # Extraction details
    confidence = Column(Integer, default=50)
    evidence = Column(Text, nullable=True)
    extracted_from = Column(String(50), default="original")
    extracted_by = Column(String(50), default="genai")
    
    # Audit
    extracted_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    article = relationship("Article", backref="ttp_mappings")
    ttp = relationship("TTP", back_populates="article_mappings")
    extraction_run = relationship("ExtractionRun", backref="ttp_mappings")
    
    __table_args__ = (
        UniqueConstraint("article_id", "ttp_id", name="uq_article_ttp"),
        Index("idx_article_ttp_article", "article_id"),
        Index("idx_article_ttp_ttp", "ttp_id"),
    )


class HuntTTPMap(Base):
    """Maps hunts to TTPs used in the hunt query."""
    __tablename__ = "hunt_ttp_map"
    
    id = Column(Integer, primary_key=True, index=True)
    hunt_id = Column(Integer, ForeignKey("hunts.id", ondelete="CASCADE"), nullable=False)
    ttp_id = Column(Integer, ForeignKey("ttps.id", ondelete="CASCADE"), nullable=False)
    
    # Metadata
    used_in_query = Column(Boolean, default=True)  # Was this TTP used in query generation?
    detected_in_results = Column(Boolean, default=False)  # Was this TTP detected in hunt results?
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    hunt = relationship("Hunt", backref="ttp_mappings")
    ttp = relationship("TTP", back_populates="hunt_mappings")
    
    __table_args__ = (
        UniqueConstraint("hunt_id", "ttp_id", name="uq_hunt_ttp"),
        Index("idx_hunt_ttp_hunt", "hunt_id"),
        Index("idx_hunt_ttp_ttp", "ttp_id"),
    )


class HuntIOCMap(Base):
    """Maps hunts to IOCs used in the hunt query."""
    __tablename__ = "hunt_ioc_map"
    
    id = Column(Integer, primary_key=True, index=True)
    hunt_id = Column(Integer, ForeignKey("hunts.id", ondelete="CASCADE"), nullable=False)
    ioc_id = Column(Integer, ForeignKey("iocs.id", ondelete="CASCADE"), nullable=False)
    
    # Metadata
    used_in_query = Column(Boolean, default=True)
    detected_in_results = Column(Boolean, default=False)
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    hunt = relationship("Hunt", backref="ioc_mappings")
    ioc = relationship("IOC", backref="hunt_mappings")
    
    __table_args__ = (
        UniqueConstraint("hunt_id", "ioc_id", name="uq_hunt_ioc"),
        Index("idx_hunt_ioc_hunt", "hunt_id"),
        Index("idx_hunt_ioc_ioc", "ioc_id"),
    )


# ============================================================================
# EXTRACTION RUN TRACKING - Lineage and Versioning
# ============================================================================

class ExtractionRunStatus(str, Enum):
    """Status of an extraction run."""
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    PARTIAL = "PARTIAL"  # Some extractions succeeded, some failed


class ExtractionRun(Base):
    """
    Tracks each extraction operation for full lineage and auditability.
    
    Every time entities are extracted from an article, a run record is created.
    This enables:
    - Versioning of extractions
    - Comparison of different models
    - Rollback capabilities
    - Performance tracking
    """
    __tablename__ = "extraction_runs"
    
    id = Column(Integer, primary_key=True, index=True)
    article_id = Column(Integer, ForeignKey("articles.id", ondelete="CASCADE"), nullable=False)
    
    # Run metadata
    run_number = Column(Integer, default=1)  # Sequential run number for this article
    status = Column(String(20), default=ExtractionRunStatus.PENDING.value)
    
    # Input sources used
    used_original_content = Column(Boolean, default=True)
    used_executive_summary = Column(Boolean, default=False)
    used_technical_summary = Column(Boolean, default=False)
    
    # Model information
    model_used = Column(String(100), nullable=True)  # ollama:llama3, openai, etc.
    model_provider = Column(String(50), nullable=True)  # ollama, openai, anthropic
    
    # Extraction results
    iocs_extracted = Column(Integer, default=0)
    ttps_extracted = Column(Integer, default=0)
    actors_extracted = Column(Integer, default=0)
    total_entities = Column(Integer, default=0)
    
    # Performance
    duration_ms = Column(Integer, nullable=True)
    tokens_used = Column(Integer, nullable=True)  # For cost tracking
    
    # Quality metrics
    confidence_avg = Column(Float, nullable=True)
    false_positive_rate = Column(Float, nullable=True)  # If known
    
    # Error handling
    error_message = Column(Text, nullable=True)
    warnings = Column(JSON, default=[])
    
    # Comparison (if multiple models used)
    compared_with_model = Column(String(100), nullable=True)
    comparison_winner = Column(Boolean, default=False)
    comparison_score = Column(Float, nullable=True)
    
    # Audit
    triggered_by = Column(String(50), default="auto")  # auto, manual, scheduled
    triggered_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Relationships
    article = relationship("Article", backref="extraction_runs")
    triggered_by_user = relationship("User")
    
    __table_args__ = (
        Index("idx_extraction_run_article", "article_id"),
        Index("idx_extraction_run_created", "created_at"),
        Index("idx_extraction_run_status", "status"),
    )


# ============================================================================
# ARTICLE SUMMARIES - Versioned Summary Storage
# ============================================================================

class SummaryType(str, Enum):
    """Type of summary."""
    EXECUTIVE = "executive"  # Business-focused, high-level
    TECHNICAL = "technical"  # IOCs, TTPs, technical details
    DETECTION = "detection"  # Detection/hunting focused


class ArticleSummary(Base):
    """
    Stores article summaries separately with versioning support.
    
    Enables:
    - Multiple summary versions
    - Model comparison
    - Summary regeneration
    - Audit trail
    """
    __tablename__ = "article_summaries"
    
    id = Column(Integer, primary_key=True, index=True)
    article_id = Column(Integer, ForeignKey("articles.id", ondelete="CASCADE"), nullable=False)
    extraction_run_id = Column(Integer, ForeignKey("extraction_runs.id"), nullable=True)
    
    # Summary details
    summary_type = Column(String(20), nullable=False)  # executive, technical, detection
    content = Column(Text, nullable=False)
    version = Column(Integer, default=1)
    
    # Generation metadata
    model_used = Column(String(100), nullable=True)
    prompt_version = Column(String(20), nullable=True)
    
    # Quality metrics
    word_count = Column(Integer, nullable=True)
    readability_score = Column(Float, nullable=True)
    
    # Status
    is_current = Column(Boolean, default=True)  # Is this the active version?
    is_approved = Column(Boolean, default=False)  # Analyst approved?
    
    # Audit
    generated_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    approved_at = Column(DateTime, nullable=True)
    
    # Relationships
    article = relationship("Article", backref="summaries")
    extraction_run = relationship("ExtractionRun", backref="summaries")
    
    __table_args__ = (
        Index("idx_article_summary_article", "article_id"),
        Index("idx_article_summary_type", "summary_type"),
        Index("idx_article_summary_current", "is_current"),
    )


# ============================================================================
# ARTICLE RELATIONSHIPS - Historical Associations
# ============================================================================

class RelationshipType(str, Enum):
    """Type of relationship between articles."""
    IOC_MATCH = "ioc_match"  # Shared IOCs
    TTP_MATCH = "ttp_match"  # Shared TTPs
    ACTOR_MATCH = "actor_match"  # Same threat actor
    SEMANTIC_SIMILAR = "semantic_similar"  # Similar content
    CAMPAIGN = "campaign"  # Part of same campaign
    DUPLICATE = "duplicate"  # Duplicate article


class ArticleRelationship(Base):
    """
    Tracks relationships between articles for historical association.
    
    Enables:
    - Campaign detection
    - Threat tracking over time
    - IOC/TTP recurrence analysis
    - Semantic clustering
    """
    __tablename__ = "article_relationships"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Article references
    source_article_id = Column(Integer, ForeignKey("articles.id", ondelete="CASCADE"), nullable=False)
    related_article_id = Column(Integer, ForeignKey("articles.id", ondelete="CASCADE"), nullable=False)
    
    # Relationship classification
    relationship_types = Column(JSON, default=[])  # Array of RelationshipType values
    
    # Similarity scores (0.0 - 1.0)
    ioc_overlap_score = Column(Float, default=0.0)
    ttp_overlap_score = Column(Float, default=0.0)
    actor_match_score = Column(Float, default=0.0)
    semantic_similarity_score = Column(Float, nullable=True)  # Null if not computed
    overall_score = Column(Float, nullable=False)  # Weighted combination
    
    # Shared entities
    shared_ioc_count = Column(Integer, default=0)
    shared_ttp_count = Column(Integer, default=0)
    shared_actor_count = Column(Integer, default=0)
    shared_ioc_ids = Column(JSON, default=[])  # Array of IOC IDs
    shared_ttp_ids = Column(JSON, default=[])  # Array of TTP IDs
    shared_actor_ids = Column(JSON, default=[])  # Array of Actor IDs
    
    # Configuration used
    lookback_days = Column(Integer, nullable=False)  # Lookback window used
    config_snapshot = Column(JSON, nullable=True)  # Weights and thresholds used
    
    # Status
    is_campaign = Column(Boolean, default=False)  # Marked as part of campaign
    campaign_id = Column(String(100), nullable=True)  # Campaign identifier
    is_verified = Column(Boolean, default=False)  # Analyst verified
    
    # Audit
    computed_at = Column(DateTime, default=datetime.utcnow)
    verified_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    
    # Relationships
    source_article = relationship("Article", foreign_keys=[source_article_id], backref="outgoing_relationships")
    related_article = relationship("Article", foreign_keys=[related_article_id], backref="incoming_relationships")
    
    __table_args__ = (
        # Prevent duplicate relationships
        UniqueConstraint("source_article_id", "related_article_id", name="uq_article_relationship"),
        # Performance indexes
        Index("idx_article_rel_source", "source_article_id"),
        Index("idx_article_rel_related", "related_article_id"),
        Index("idx_article_rel_score", "overall_score"),
        Index("idx_article_rel_campaign", "campaign_id"),
        # Composite index for common queries
        Index("idx_article_rel_source_score", "source_article_id", "overall_score"),
    )


# ============================================================================
# SEMANTIC SIMILARITY - Embeddings for Semantic Search
# ============================================================================

class ArticleEmbedding(Base):
    """
    Stores embeddings for semantic similarity search.
    
    Embeddings are generated from technical summaries for:
    - Finding semantically similar articles
    - Campaign detection
    - Threat clustering
    """
    __tablename__ = "article_embeddings"
    
    id = Column(Integer, primary_key=True, index=True)
    article_id = Column(Integer, ForeignKey("articles.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    # Embedding data
    embedding = Column(JSON, nullable=False)  # Array of floats (vector)
    embedding_model = Column(String(100), nullable=False)  # sentence-transformers/all-MiniLM-L6-v2
    embedding_dimension = Column(Integer, nullable=False)  # 384, 768, 1536, etc.
    
    # Source
    source_text = Column(String(50), default="technical_summary")  # What was embedded
    source_hash = Column(String(64), nullable=True)  # Hash of source text (for cache invalidation)
    
    # Metadata
    token_count = Column(Integer, nullable=True)
    generation_time_ms = Column(Integer, nullable=True)
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    article = relationship("Article", backref="embedding")
    
    __table_args__ = (
        Index("idx_article_embedding_article", "article_id"),
        # Note: For production, use pgvector extension for efficient vector search
        # CREATE INDEX idx_embedding_vector ON article_embeddings USING ivfflat (embedding vector_cosine_ops);
    )


# ============================================================================
# ADMIN CONFIGURATION - Similarity and Association Settings
# ============================================================================

class SimilarityConfig(Base):
    """
    Admin-configurable settings for similarity matching and historical association.
    
    Enables admins to tune:
    - Lookback window
    - Entity weights
    - Similarity thresholds
    - Matching requirements
    """
    __tablename__ = "similarity_config"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Configuration name (allows multiple configs)
    config_name = Column(String(100), unique=True, nullable=False, default="default")
    
    # Lookback window
    lookback_days = Column(Integer, default=365)  # How far back to look
    
    # Entity weights (must sum to 1.0)
    ioc_weight = Column(Float, default=0.40)  # 40%
    ttp_weight = Column(Float, default=0.30)  # 30%
    actor_weight = Column(Float, default=0.20)  # 20%
    semantic_weight = Column(Float, default=0.10)  # 10%
    
    # Thresholds
    minimum_score = Column(Float, default=0.60)  # Minimum overall score to consider related
    minimum_shared_entities = Column(Integer, default=1)  # At least N shared entities
    require_exact_match = Column(Boolean, default=False)  # Require at least one exact IOC/TTP match
    
    # Semantic similarity settings
    semantic_enabled = Column(Boolean, default=True)
    semantic_threshold = Column(Float, default=0.75)  # Cosine similarity threshold
    semantic_model = Column(String(100), default="sentence-transformers/all-MiniLM-L6-v2")
    
    # Campaign detection
    campaign_detection_enabled = Column(Boolean, default=True)
    campaign_min_articles = Column(Integer, default=3)  # Minimum articles to form campaign
    campaign_time_window_days = Column(Integer, default=90)  # Articles within N days
    campaign_min_shared_entities = Column(Integer, default=2)  # Minimum shared entities
    
    # Status
    is_active = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)  # Is this the default config?
    
    # Audit
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    created_by = relationship("User", foreign_keys=[created_by_user_id])
    updated_by = relationship("User", foreign_keys=[updated_by_user_id])
    
    __table_args__ = (
        Index("idx_similarity_config_active", "is_active"),
        Index("idx_similarity_config_default", "is_default"),
    )


# ============================================================================
# CAMPAIGN DETECTION - Threat Campaign Tracking
# ============================================================================

class CampaignStatus(str, Enum):
    """Status of a detected campaign."""
    ACTIVE = "active"  # Ongoing activity
    DORMANT = "dormant"  # No recent activity
    RESOLVED = "resolved"  # Threat mitigated
    FALSE_POSITIVE = "false_positive"  # Not a real campaign


class Campaign(Base):
    """
    Detected threat campaigns based on article clustering.
    
    Campaigns are automatically detected when multiple articles share:
    - Common IOCs/TTPs/Actors
    - Time proximity
    - Semantic similarity
    """
    __tablename__ = "campaigns"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Campaign identification
    campaign_id = Column(String(100), unique=True, nullable=False, index=True)  # AUTO_CAMPAIGN_2026_001
    name = Column(String(500), nullable=True)  # Human-readable name
    description = Column(Text, nullable=True)
    
    # Classification
    campaign_type = Column(String(50), nullable=True)  # ransomware, espionage, supply_chain, etc.
    threat_level = Column(String(20), default="medium")  # low, medium, high, critical
    
    # Associated entities
    primary_actor_id = Column(Integer, ForeignKey("threat_actors.id"), nullable=True)
    associated_actor_ids = Column(JSON, default=[])  # Additional actors
    signature_ioc_ids = Column(JSON, default=[])  # Key IOCs defining this campaign
    signature_ttp_ids = Column(JSON, default=[])  # Key TTPs defining this campaign
    
    # Statistics
    article_count = Column(Integer, default=0)
    total_iocs = Column(Integer, default=0)
    total_ttps = Column(Integer, default=0)
    total_actors = Column(Integer, default=0)
    
    # Timeline
    first_seen_at = Column(DateTime, nullable=False)
    last_seen_at = Column(DateTime, nullable=False)
    duration_days = Column(Integer, default=0)
    
    # Detection metadata
    detection_confidence = Column(Float, default=0.5)  # 0.0-1.0
    detection_method = Column(String(50), default="entity_clustering")  # entity_clustering, semantic, manual
    config_used = Column(JSON, nullable=True)  # Config snapshot
    
    # Status
    status = Column(String(20), default=CampaignStatus.ACTIVE.value)
    is_verified = Column(Boolean, default=False)  # Analyst confirmed
    
    # Audit
    detected_at = Column(DateTime, default=datetime.utcnow)
    verified_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    primary_actor = relationship("ThreatActor", foreign_keys=[primary_actor_id])
    verified_by = relationship("User", foreign_keys=[verified_by_user_id])
    
    __table_args__ = (
        Index("idx_campaign_id", "campaign_id"),
        Index("idx_campaign_status", "status"),
        Index("idx_campaign_last_seen", "last_seen_at"),
        Index("idx_campaign_threat_level", "threat_level"),
    )


class CampaignArticle(Base):
    """Maps articles to campaigns."""
    __tablename__ = "campaign_articles"
    
    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False)
    article_id = Column(Integer, ForeignKey("articles.id", ondelete="CASCADE"), nullable=False)
    
    # Membership details
    confidence = Column(Float, default=0.5)  # How confident this article belongs to campaign
    is_seed_article = Column(Boolean, default=False)  # Was this article used to seed the campaign?
    contribution_score = Column(Float, nullable=True)  # How much this article contributes to campaign
    
    # Audit
    added_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    campaign = relationship("Campaign", backref="article_mappings")
    article = relationship("Article", backref="campaign_memberships")
    
    __table_args__ = (
        UniqueConstraint("campaign_id", "article_id", name="uq_campaign_article"),
        Index("idx_campaign_article_campaign", "campaign_id"),
        Index("idx_campaign_article_article", "article_id"),
    )


# ============================================================================
# ENTITY TIMELINE - Temporal Tracking
# ============================================================================

class EntityEvent(Base):
    """
    Timeline of entity appearances across articles and hunts.
    
    Provides temporal view of entity activity for:
    - Trend analysis
    - Activity spikes
    - Dormancy detection
    """
    __tablename__ = "entity_events"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Entity reference
    entity_type = Column(String(20), nullable=False)  # ioc, ttp, actor
    entity_id = Column(Integer, nullable=False)  # ID in respective table
    
    # Event details
    event_type = Column(String(50), nullable=False)  # article_mention, hunt_detection, manual_add
    event_date = Column(DateTime, nullable=False, index=True)
    
    # Source
    article_id = Column(Integer, ForeignKey("articles.id", ondelete="CASCADE"), nullable=True)
    hunt_id = Column(Integer, ForeignKey("hunts.id", ondelete="CASCADE"), nullable=True)
    extraction_run_id = Column(Integer, ForeignKey("extraction_runs.id"), nullable=True)
    
    # Metadata
    confidence = Column(Integer, default=50)
    context = Column(Text, nullable=True)  # Brief context of this event
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    article = relationship("Article")
    hunt = relationship("Hunt")
    extraction_run = relationship("ExtractionRun")
    
    __table_args__ = (
        Index("idx_entity_event_type_id", "entity_type", "entity_id"),
        Index("idx_entity_event_date", "event_date"),
        Index("idx_entity_event_article", "article_id"),
    )


# ============================================================================
# PRIORITY SCORING - Dynamic Priority Calculation
# ============================================================================

class ArticlePriorityScore(Base):
    """
    Stores calculated priority scores for articles.
    
    Priority is calculated based on:
    - Entity criticality
    - Historical context
    - Threat actor attribution
    - Recency
    - Confidence
    """
    __tablename__ = "article_priority_scores"
    
    id = Column(Integer, primary_key=True, index=True)
    article_id = Column(Integer, ForeignKey("articles.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    # Overall score
    priority_score = Column(Float, nullable=False)  # 0.0-100.0
    priority_level = Column(String(20), nullable=False)  # critical, high, medium, low
    
    # Component scores
    entity_criticality_score = Column(Float, default=0.0)  # Based on IOC/TTP severity
    historical_context_score = Column(Float, default=0.0)  # Based on recurrence
    actor_attribution_score = Column(Float, default=0.0)  # Known threat actor
    recency_score = Column(Float, default=0.0)  # How recent the threat
    confidence_score = Column(Float, default=0.0)  # Extraction confidence
    
    # Factors
    has_active_campaign = Column(Boolean, default=False)
    has_known_actor = Column(Boolean, default=False)
    has_critical_iocs = Column(Boolean, default=False)
    has_exploitation_ttps = Column(Boolean, default=False)
    
    # Explanation
    score_explanation = Column(JSON, default={})  # Why this score?
    
    # Audit
    calculated_at = Column(DateTime, default=datetime.utcnow)
    calculation_version = Column(String(20), default="v1")
    
    # Relationships
    article = relationship("Article", backref="priority_score_detail")
    
    __table_args__ = (
        Index("idx_priority_score_article", "article_id"),
        Index("idx_priority_score_level", "priority_level"),
        Index("idx_priority_score_value", "priority_score"),
    )


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_active_similarity_config(db_session) -> Optional[SimilarityConfig]:
    """Get the active similarity configuration."""
    # Try to get default config first
    config = db_session.query(SimilarityConfig).filter(
        SimilarityConfig.is_active == True,
        SimilarityConfig.is_default == True
    ).first()
    
    if not config:
        # Get any active config
        config = db_session.query(SimilarityConfig).filter(
            SimilarityConfig.is_active == True
        ).first()
    
    if not config:
        # Create default config if none exists
        config = SimilarityConfig(
            config_name="default",
            is_default=True,
            is_active=True
        )
        db_session.add(config)
        db_session.commit()
    
    return config
