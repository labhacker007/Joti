"""
Agentic Intelligence API Routes

Provides endpoints for:
- Article analysis and entity extraction
- Historical association queries
- Entity pivot views
- Campaign detection
- Traceability and lineage
- Admin configuration
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from app.core.database import get_db
from app.auth.dependencies import get_current_user, require_permission
from app.models import User, Article, IOC
from app.models_agentic import (
    ThreatActor, TTP, ArticleRelationship, Campaign,
    ExtractionRun, SimilarityConfig, EntityEvent,
    get_active_similarity_config
)
from app.intelligence.orchestrator import AgenticIntelligenceOrchestrator
from app.intelligence.association import HistoricalAssociationEngine
from app.intelligence.canonicalizer import EntityCanonicalizer
from app.intelligence.similarity import SemanticSimilarityEngine
from app.core.logging import logger

router = APIRouter(prefix="/intelligence", tags=["intelligence"])


# ============================================================================
# ARTICLE ANALYSIS
# ============================================================================

@router.post("/analyze/{article_id}")
async def analyze_article(
    article_id: int,
    force_reanalysis: bool = False,
    model_preference: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Trigger full agentic analysis for an article.
    
    This runs the complete pipeline:
    1. Generate summaries (executive + technical)
    2. Extract entities (IOCs, TTPs, actors)
    3. Canonicalize entities
    4. Find historical associations
    5. Calculate priority score
    6. Detect campaigns
    
    Returns comprehensive analysis results.
    """
    try:
        orchestrator = AgenticIntelligenceOrchestrator(db)
        result = await orchestrator.analyze_article_full(
            article_id=article_id,
            user_id=current_user.id,
            force_reanalysis=force_reanalysis,
            model_preference=model_preference
        )
        
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        logger.error("article_analysis_failed", article_id=article_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis failed: {str(e)}"
        )


@router.post("/analyze/batch")
async def analyze_articles_batch(
    article_ids: List[int],
    model_preference: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Analyze multiple articles in batch."""
    try:
        orchestrator = AgenticIntelligenceOrchestrator(db)
        result = await orchestrator.batch_analyze_articles(
            article_ids=article_ids,
            user_id=current_user.id,
            model_preference=model_preference
        )
        
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        logger.error("batch_analysis_failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Batch analysis failed: {str(e)}"
        )


# ============================================================================
# ARTICLE RELATIONSHIPS
# ============================================================================

@router.get("/article/{article_id}/relationships")
async def get_article_relationships(
    article_id: int,
    relationship_type: Optional[str] = None,
    min_score: float = 0.0,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get related articles for a given article.
    
    Returns articles with shared entities, semantic similarity, or campaign membership.
    """
    query = db.query(ArticleRelationship).filter(
        ArticleRelationship.source_article_id == article_id,
        ArticleRelationship.overall_score >= min_score
    )
    
    if relationship_type:
        query = query.filter(
            ArticleRelationship.relationship_types.contains([relationship_type])
        )
    
    relationships = query.order_by(
        ArticleRelationship.overall_score.desc()
    ).limit(limit).all()
    
    # Enrich with article details
    results = []
    for rel in relationships:
        related_article = db.query(Article).filter(
            Article.id == rel.related_article_id
        ).first()
        
        if related_article:
            results.append({
                "related_article_id": rel.related_article_id,
                "title": related_article.title,
                "published_at": related_article.published_at,
                "status": related_article.status.value if hasattr(related_article.status, 'value') else related_article.status,
                "overall_score": rel.overall_score,
                "relationship_types": rel.relationship_types,
                "shared_entities": {
                    "iocs": rel.shared_ioc_count,
                    "ttps": rel.shared_ttp_count,
                    "actors": rel.shared_actor_count
                },
                "scores": {
                    "ioc_overlap": rel.ioc_overlap_score,
                    "ttp_overlap": rel.ttp_overlap_score,
                    "actor_match": rel.actor_match_score,
                    "semantic_similarity": rel.semantic_similarity_score
                },
                "is_campaign": rel.is_campaign,
                "campaign_id": rel.campaign_id,
                "computed_at": rel.computed_at
            })
    
    return {
        "article_id": article_id,
        "related_articles": results,
        "count": len(results)
    }


@router.get("/article/{article_id}/timeline")
async def get_article_timeline(
    article_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get complete timeline for an article including:
    - Extraction runs
    - Entity discoveries
    - Hunt generations
    - Relationships found
    """
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    # Get extraction runs
    extraction_runs = db.query(ExtractionRun).filter(
        ExtractionRun.article_id == article_id
    ).order_by(ExtractionRun.created_at.desc()).all()
    
    # Get relationships
    relationships = db.query(ArticleRelationship).filter(
        ArticleRelationship.source_article_id == article_id
    ).order_by(ArticleRelationship.overall_score.desc()).limit(10).all()
    
    # Get hunts
    from app.models import Hunt
    hunts = db.query(Hunt).filter(
        Hunt.article_id == article_id
    ).order_by(Hunt.created_at.desc()).all()
    
    return {
        "article_id": article_id,
        "title": article.title,
        "created_at": article.created_at,
        "extraction_runs": [
            {
                "run_id": run.id,
                "run_number": run.run_number,
                "status": run.status,
                "entities_extracted": run.total_entities,
                "model_used": run.model_used,
                "duration_ms": run.duration_ms,
                "created_at": run.created_at,
                "completed_at": run.completed_at
            }
            for run in extraction_runs
        ],
        "relationships_found": len(relationships),
        "hunts_generated": len(hunts),
        "timeline_events": [
            {"type": "article_created", "date": article.created_at},
            *[{"type": "extraction_run", "date": run.created_at, "run_id": run.id} for run in extraction_runs],
            *[{"type": "hunt_generated", "date": hunt.created_at, "hunt_id": hunt.id} for hunt in hunts]
        ]
    }


# ============================================================================
# ENTITY PIVOT VIEWS
# ============================================================================

@router.get("/entity/ioc/{ioc_id}")
async def get_ioc_details(
    ioc_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get complete details for an IOC including:
    - All articles mentioning it
    - All hunts using it
    - Timeline of appearances
    - Co-occurring entities
    """
    from app.models import IOC, ArticleIOC
    
    ioc = db.query(IOC).filter(IOC.id == ioc_id).first()
    if not ioc:
        raise HTTPException(status_code=404, detail="IOC not found")
    
    # Get articles
    article_mappings = db.query(ArticleIOC).filter(
        ArticleIOC.ioc_id == ioc_id
    ).join(Article).order_by(Article.created_at.desc()).all()
    
    # Get hunts
    from app.models_agentic import HuntIOCMap
    hunt_mappings = db.query(HuntIOCMap).filter(
        HuntIOCMap.ioc_id == ioc_id
    ).all()
    
    # Get timeline
    canonicalizer = EntityCanonicalizer(db)
    timeline = canonicalizer.get_entity_timeline("ioc", ioc_id, limit=50)
    
    # Get statistics
    stats = canonicalizer.get_entity_statistics("ioc", ioc_id)
    
    return {
        "ioc": {
            "id": ioc.id,
            "value": ioc.value,
            "type": ioc.ioc_type,
            "confidence": ioc.confidence,
            "first_seen": ioc.first_seen_at,
            "last_seen": ioc.last_seen_at,
            "occurrence_count": ioc.occurrence_count,
            "is_false_positive": ioc.is_false_positive,
            "notes": ioc.notes
        },
        "articles": [
            {
                "article_id": m.article_id,
                "title": m.article.title if m.article else None,
                "confidence": m.confidence,
                "evidence": m.evidence,
                "extracted_at": m.extracted_at
            }
            for m in article_mappings
        ],
        "hunts": [
            {
                "hunt_id": m.hunt_id,
                "used_in_query": m.used_in_query,
                "detected_in_results": m.detected_in_results
            }
            for m in hunt_mappings
        ],
        "timeline": timeline,
        "statistics": stats
    }


@router.get("/entity/ttp/{ttp_id}")
async def get_ttp_details(
    ttp_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get complete details for a TTP including articles and hunts."""
    from app.models_agentic import TTP, ArticleTTPMap, HuntTTPMap
    
    ttp = db.query(TTP).filter(TTP.id == ttp_id).first()
    if not ttp:
        raise HTTPException(status_code=404, detail="TTP not found")
    
    # Get articles
    article_mappings = db.query(ArticleTTPMap).filter(
        ArticleTTPMap.ttp_id == ttp_id
    ).join(Article).order_by(Article.created_at.desc()).all()
    
    # Get hunts
    hunt_mappings = db.query(HuntTTPMap).filter(
        HuntTTPMap.ttp_id == ttp_id
    ).all()
    
    # Get timeline
    canonicalizer = EntityCanonicalizer(db)
    timeline = canonicalizer.get_entity_timeline("ttp", ttp_id, limit=50)
    stats = canonicalizer.get_entity_statistics("ttp", ttp_id)
    
    return {
        "ttp": {
            "id": ttp.id,
            "mitre_id": ttp.mitre_id,
            "name": ttp.name,
            "framework": ttp.framework,
            "tactic": ttp.tactic,
            "technique": ttp.technique,
            "first_seen": ttp.first_seen_at,
            "last_seen": ttp.last_seen_at,
            "occurrence_count": ttp.occurrence_count,
            "severity": ttp.severity,
            "description": ttp.description
        },
        "articles": [
            {
                "article_id": m.article_id,
                "title": m.article.title if m.article else None,
                "confidence": m.confidence,
                "evidence": m.evidence,
                "extracted_at": m.extracted_at
            }
            for m in article_mappings
        ],
        "hunts": [
            {
                "hunt_id": m.hunt_id,
                "used_in_query": m.used_in_query,
                "detected_in_results": m.detected_in_results
            }
            for m in hunt_mappings
        ],
        "timeline": timeline,
        "statistics": stats
    }


@router.get("/entity/actor/{actor_id}")
async def get_actor_details(
    actor_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get complete details for a threat actor including campaign view."""
    from app.models_agentic import ThreatActor, ArticleActorMap
    
    actor = db.query(ThreatActor).filter(ThreatActor.id == actor_id).first()
    if not actor:
        raise HTTPException(status_code=404, detail="Threat actor not found")
    
    # Get articles
    article_mappings = db.query(ArticleActorMap).filter(
        ArticleActorMap.actor_id == actor_id
    ).join(Article).order_by(Article.created_at.desc()).all()
    
    # Get campaigns
    campaigns = db.query(Campaign).filter(
        or_(
            Campaign.primary_actor_id == actor_id,
            Campaign.associated_actor_ids.contains([actor_id])
        )
    ).all()
    
    # Get timeline
    canonicalizer = EntityCanonicalizer(db)
    timeline = canonicalizer.get_entity_timeline("actor", actor_id, limit=50)
    stats = canonicalizer.get_entity_statistics("actor", actor_id)
    
    return {
        "actor": {
            "id": actor.id,
            "canonical_name": actor.canonical_name,
            "aliases": actor.aliases,
            "actor_type": actor.actor_type,
            "attribution": actor.attribution,
            "first_seen": actor.first_seen_at,
            "last_seen": actor.last_seen_at,
            "occurrence_count": actor.occurrence_count,
            "confidence": actor.confidence,
            "is_active": actor.is_active,
            "description": actor.description,
            "tags": actor.tags
        },
        "articles": [
            {
                "article_id": m.article_id,
                "title": m.article.title if m.article else None,
                "confidence": m.confidence,
                "evidence": m.evidence,
                "extracted_at": m.extracted_at
            }
            for m in article_mappings
        ],
        "campaigns": [
            {
                "campaign_id": c.campaign_id,
                "name": c.name,
                "status": c.status,
                "article_count": c.article_count,
                "first_seen": c.first_seen_at,
                "last_seen": c.last_seen_at
            }
            for c in campaigns
        ],
        "timeline": timeline,
        "statistics": stats
    }


# ============================================================================
# CAMPAIGN DETECTION
# ============================================================================

@router.get("/campaigns")
async def get_campaigns(
    status: Optional[str] = None,
    threat_level: Optional[str] = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all detected campaigns with filtering."""
    association_engine = HistoricalAssociationEngine(db)
    campaigns = association_engine.get_campaigns_overview(status=status)
    
    # Filter by threat level if specified
    if threat_level:
        campaigns = [c for c in campaigns if c.get("threat_level") == threat_level]
    
    return {
        "campaigns": campaigns[:limit],
        "total": len(campaigns)
    }


@router.get("/campaigns/{campaign_id}")
async def get_campaign_details(
    campaign_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific campaign."""
    from app.models_agentic import Campaign, CampaignArticle
    
    campaign = db.query(Campaign).filter(
        Campaign.campaign_id == campaign_id
    ).first()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Get articles in campaign
    article_mappings = db.query(CampaignArticle).filter(
        CampaignArticle.campaign_id == campaign.id
    ).join(Article).order_by(Article.created_at.desc()).all()
    
    # Get signature entities
    signature_iocs = []
    if campaign.signature_ioc_ids:
        signature_iocs = db.query(IOC).filter(
            IOC.id.in_(campaign.signature_ioc_ids)
        ).all()
    
    signature_ttps = []
    if campaign.signature_ttp_ids:
        signature_ttps = db.query(TTP).filter(
            TTP.id.in_(campaign.signature_ttp_ids)
        ).all()
    
    return {
        "campaign": {
            "campaign_id": campaign.campaign_id,
            "name": campaign.name,
            "description": campaign.description,
            "campaign_type": campaign.campaign_type,
            "threat_level": campaign.threat_level,
            "status": campaign.status,
            "article_count": campaign.article_count,
            "first_seen": campaign.first_seen_at,
            "last_seen": campaign.last_seen_at,
            "duration_days": campaign.duration_days,
            "detection_confidence": campaign.detection_confidence,
            "is_verified": campaign.is_verified
        },
        "articles": [
            {
                "article_id": m.article_id,
                "title": m.article.title if m.article else None,
                "published_at": m.article.published_at if m.article else None,
                "confidence": m.confidence,
                "is_seed_article": m.is_seed_article
            }
            for m in article_mappings
        ],
        "signature_entities": {
            "iocs": [
                {"id": ioc.id, "value": ioc.value, "type": ioc.ioc_type}
                for ioc in signature_iocs
            ],
            "ttps": [
                {"id": ttp.id, "mitre_id": ttp.mitre_id, "name": ttp.name}
                for ttp in signature_ttps
            ]
        }
    }


# ============================================================================
# EXTRACTION RUNS
# ============================================================================

@router.get("/extraction-runs/{article_id}")
async def get_extraction_runs(
    article_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all extraction runs for an article."""
    runs = db.query(ExtractionRun).filter(
        ExtractionRun.article_id == article_id
    ).order_by(ExtractionRun.created_at.desc()).all()
    
    return {
        "article_id": article_id,
        "runs": [
            {
                "run_id": run.id,
                "run_number": run.run_number,
                "status": run.status,
                "model_used": run.model_used,
                "entities_extracted": {
                    "iocs": run.iocs_extracted,
                    "ttps": run.ttps_extracted,
                    "actors": run.actors_extracted,
                    "total": run.total_entities
                },
                "performance": {
                    "duration_ms": run.duration_ms,
                    "tokens_used": run.tokens_used,
                    "confidence_avg": run.confidence_avg
                },
                "created_at": run.created_at,
                "completed_at": run.completed_at
            }
            for run in runs
        ],
        "total_runs": len(runs)
    }


# ============================================================================
# ADMIN CONFIGURATION
# ============================================================================

@router.get("/admin/similarity-config")
async def get_similarity_config(
    current_user: User = Depends(require_permission("manage:genai")),
    db: Session = Depends(get_db)
):
    """Get current similarity configuration."""
    config = get_active_similarity_config(db)
    
    return {
        "config": {
            "config_name": config.config_name,
            "lookback_days": config.lookback_days,
            "weights": {
                "ioc": config.ioc_weight,
                "ttp": config.ttp_weight,
                "actor": config.actor_weight,
                "semantic": config.semantic_weight
            },
            "thresholds": {
                "minimum_score": config.minimum_score,
                "minimum_shared_entities": config.minimum_shared_entities,
                "require_exact_match": config.require_exact_match,
                "semantic_threshold": config.semantic_threshold
            },
            "semantic": {
                "enabled": config.semantic_enabled,
                "model": config.semantic_model
            },
            "campaign_detection": {
                "enabled": config.campaign_detection_enabled,
                "min_articles": config.campaign_min_articles,
                "time_window_days": config.campaign_time_window_days,
                "min_shared_entities": config.campaign_min_shared_entities
            },
            "is_active": config.is_active,
            "is_default": config.is_default,
            "updated_at": config.updated_at
        }
    }


@router.put("/admin/similarity-config")
async def update_similarity_config(
    config_data: dict,
    current_user: User = Depends(require_permission("manage:genai")),
    db: Session = Depends(get_db)
):
    """Update similarity configuration."""
    config = get_active_similarity_config(db)
    
    # Update fields
    if "lookback_days" in config_data:
        config.lookback_days = config_data["lookback_days"]
    
    if "weights" in config_data:
        weights = config_data["weights"]
        config.ioc_weight = weights.get("ioc", config.ioc_weight)
        config.ttp_weight = weights.get("ttp", config.ttp_weight)
        config.actor_weight = weights.get("actor", config.actor_weight)
        config.semantic_weight = weights.get("semantic", config.semantic_weight)
        
        # Validate weights sum to 1.0
        total_weight = config.ioc_weight + config.ttp_weight + config.actor_weight + config.semantic_weight
        if abs(total_weight - 1.0) > 0.01:
            raise HTTPException(
                status_code=400,
                detail=f"Weights must sum to 1.0 (current: {total_weight})"
            )
    
    if "thresholds" in config_data:
        thresholds = config_data["thresholds"]
        config.minimum_score = thresholds.get("minimum_score", config.minimum_score)
        config.minimum_shared_entities = thresholds.get("minimum_shared_entities", config.minimum_shared_entities)
        config.require_exact_match = thresholds.get("require_exact_match", config.require_exact_match)
        config.semantic_threshold = thresholds.get("semantic_threshold", config.semantic_threshold)
    
    if "semantic" in config_data:
        semantic = config_data["semantic"]
        config.semantic_enabled = semantic.get("enabled", config.semantic_enabled)
        config.semantic_model = semantic.get("model", config.semantic_model)
    
    if "campaign_detection" in config_data:
        campaign = config_data["campaign_detection"]
        config.campaign_detection_enabled = campaign.get("enabled", config.campaign_detection_enabled)
        config.campaign_min_articles = campaign.get("min_articles", config.campaign_min_articles)
        config.campaign_time_window_days = campaign.get("time_window_days", config.campaign_time_window_days)
        config.campaign_min_shared_entities = campaign.get("min_shared_entities", config.campaign_min_shared_entities)
    
    config.updated_by_user_id = current_user.id
    config.updated_at = datetime.utcnow()
    
    db.commit()
    
    logger.info("similarity_config_updated",
               user_id=current_user.id,
               config_name=config.config_name)
    
    return {
        "success": True,
        "message": "Configuration updated successfully",
        "config": {
            "lookback_days": config.lookback_days,
            "weights": {
                "ioc": config.ioc_weight,
                "ttp": config.ttp_weight,
                "actor": config.actor_weight,
                "semantic": config.semantic_weight
            }
        }
    }


@router.post("/admin/rebuild-relationships")
async def rebuild_relationships(
    lookback_days: Optional[int] = None,
    article_ids: Optional[List[int]] = None,
    current_user: User = Depends(require_permission("manage:genai")),
    db: Session = Depends(get_db)
):
    """
    Rebuild article relationships for all or specified articles.
    
    This is a background operation that can take time for large datasets.
    """
    config = get_active_similarity_config(db)
    
    if lookback_days:
        config.lookback_days = lookback_days
    
    # Get articles to process
    if article_ids:
        articles = db.query(Article).filter(Article.id.in_(article_ids)).all()
    else:
        # Process all articles (limit for safety)
        articles = db.query(Article).order_by(
            Article.created_at.desc()
        ).limit(1000).all()
    
    logger.info("rebuilding_relationships",
               user_id=current_user.id,
               article_count=len(articles))
    
    # Process in background (for now, process synchronously with limit)
    association_engine = HistoricalAssociationEngine(db)
    processed = 0
    errors = []
    
    for article in articles[:100]:  # Limit to 100 for now
        try:
            await association_engine.find_related_articles(
                article_id=article.id,
                config=config
            )
            processed += 1
        except Exception as e:
            logger.error("relationship_rebuild_failed",
                        article_id=article.id,
                        error=str(e))
            errors.append({
                "article_id": article.id,
                "error": str(e)
            })
    
    return {
        "success": True,
        "processed": processed,
        "total_articles": len(articles),
        "errors": len(errors),
        "message": f"Processed {processed} articles successfully"
    }


# ============================================================================
# STATISTICS & OVERVIEW
# ============================================================================

@router.get("/statistics")
async def get_intelligence_statistics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get overall intelligence statistics."""
    from app.models import IOC
    
    # Entity counts
    total_iocs = db.query(IOC).count()
    total_ttps = db.query(TTP).count()
    total_actors = db.query(ThreatActor).count()
    
    # Extraction runs
    total_runs = db.query(ExtractionRun).count()
    completed_runs = db.query(ExtractionRun).filter(
        ExtractionRun.status == "COMPLETED"
    ).count()
    
    # Relationships
    total_relationships = db.query(ArticleRelationship).count()
    
    # Campaigns
    total_campaigns = db.query(Campaign).count()
    active_campaigns = db.query(Campaign).filter(
        Campaign.status == "active"
    ).count()
    
    # Embeddings
    similarity_engine = SemanticSimilarityEngine(db)
    embedding_stats = similarity_engine.get_embedding_statistics()
    
    return {
        "entities": {
            "iocs": total_iocs,
            "ttps": total_ttps,
            "threat_actors": total_actors,
            "total": total_iocs + total_ttps + total_actors
        },
        "extraction_runs": {
            "total": total_runs,
            "completed": completed_runs,
            "success_rate": (completed_runs / total_runs * 100) if total_runs > 0 else 0
        },
        "relationships": {
            "total": total_relationships
        },
        "campaigns": {
            "total": total_campaigns,
            "active": active_campaigns
        },
        "embeddings": embedding_stats
    }


@router.get("/trending")
async def get_trending_entities(
    entity_type: str = Query(..., regex="^(ioc|ttp|actor)$"),
    days: int = 30,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get trending entities (most frequently seen in recent articles)."""
    from datetime import timedelta
    from sqlalchemy import func
    
    lookback_date = datetime.utcnow() - timedelta(days=days)
    
    if entity_type == "ioc":
        from app.models import IOC, ArticleIOC
        results = db.query(
            IOC,
            func.count(ArticleIOC.id).label("recent_count")
        ).join(ArticleIOC).join(Article).filter(
            Article.created_at >= lookback_date
        ).group_by(IOC.id).order_by(
            func.count(ArticleIOC.id).desc()
        ).limit(limit).all()
        
        return {
            "entity_type": "ioc",
            "trending": [
                {
                    "id": ioc.id,
                    "value": ioc.value,
                    "type": ioc.ioc_type,
                    "recent_mentions": count,
                    "total_occurrences": ioc.occurrence_count,
                    "confidence": ioc.confidence
                }
                for ioc, count in results
            ]
        }
    
    elif entity_type == "ttp":
        from app.models_agentic import TTP, ArticleTTPMap
        results = db.query(
            TTP,
            func.count(ArticleTTPMap.id).label("recent_count")
        ).join(ArticleTTPMap).join(Article).filter(
            Article.created_at >= lookback_date
        ).group_by(TTP.id).order_by(
            func.count(ArticleTTPMap.id).desc()
        ).limit(limit).all()
        
        return {
            "entity_type": "ttp",
            "trending": [
                {
                    "id": ttp.id,
                    "mitre_id": ttp.mitre_id,
                    "name": ttp.name,
                    "tactic": ttp.tactic,
                    "recent_mentions": count,
                    "total_occurrences": ttp.occurrence_count,
                    "severity": ttp.severity
                }
                for ttp, count in results
            ]
        }
    
    elif entity_type == "actor":
        from app.models_agentic import ThreatActor, ArticleActorMap
        results = db.query(
            ThreatActor,
            func.count(ArticleActorMap.id).label("recent_count")
        ).join(ArticleActorMap).join(Article).filter(
            Article.created_at >= lookback_date
        ).group_by(ThreatActor.id).order_by(
            func.count(ArticleActorMap.id).desc()
        ).limit(limit).all()
        
        return {
            "entity_type": "actor",
            "trending": [
                {
                    "id": actor.id,
                    "canonical_name": actor.canonical_name,
                    "actor_type": actor.actor_type,
                    "attribution": actor.attribution,
                    "recent_mentions": count,
                    "total_occurrences": actor.occurrence_count,
                    "is_active": actor.is_active
                }
                for actor, count in results
            ]
        }
