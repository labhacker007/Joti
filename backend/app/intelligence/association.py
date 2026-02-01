"""
Historical Association Engine

Finds relationships between articles based on:
- Shared IOCs
- Shared TTPs
- Shared threat actors
- Semantic similarity

Uses two-stage approach for efficiency:
1. Fast candidate generation (indexed queries)
2. Detailed scoring and ranking

Enables:
- Campaign detection
- Threat tracking over time
- IOC/TTP recurrence analysis
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Set, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from collections import defaultdict
from app.core.logging import logger
from app.models import Article, IOC, ArticleIOC
from app.models_agentic import (
    ThreatActor, TTP, ArticleActorMap, ArticleTTPMap,
    ArticleRelationship, SimilarityConfig, Campaign, CampaignArticle,
    RelationshipType, CampaignStatus
)


class HistoricalAssociationEngine:
    """
    Finds historically related articles using multi-dimensional matching.
    
    Two-stage approach:
    1. Candidate Generation - Fast indexed queries
    2. Scoring & Ranking - Detailed similarity calculation
    """
    
    def __init__(self, db_session: Session):
        self.db = db_session
    
    async def find_related_articles(
        self,
        article_id: int,
        config: Optional[SimilarityConfig] = None,
        limit: int = 20
    ) -> List[Dict]:
        """
        Find articles related to the given article.
        
        Args:
            article_id: Source article ID
            config: Similarity configuration (uses default if None)
            limit: Maximum number of related articles to return
        
        Returns:
            List of related articles with scores and shared entities
        """
        if not config:
            config = self._get_active_config()
        
        article = self.db.query(Article).filter(Article.id == article_id).first()
        if not article:
            raise ValueError(f"Article {article_id} not found")
        
        # Calculate lookback window
        lookback_date = datetime.utcnow() - timedelta(days=config.lookback_days)
        
        logger.info("finding_related_articles",
                   article_id=article_id,
                   lookback_days=config.lookback_days,
                   lookback_date=lookback_date)
        
        # Stage 1: Fast candidate generation
        candidates = await self._get_candidates(article_id, lookback_date)
        
        if not candidates:
            logger.info("no_candidates_found", article_id=article_id)
            return []
        
        logger.info("candidates_found", article_id=article_id, count=len(candidates))
        
        # Stage 2: Detailed scoring
        scored_articles = await self._score_candidates(
            article_id=article_id,
            candidates=candidates,
            config=config
        )
        
        # Filter by minimum score
        filtered = [
            a for a in scored_articles 
            if a["overall_score"] >= config.minimum_score
        ]
        
        # Filter by minimum shared entities
        if config.minimum_shared_entities > 0:
            filtered = [
                a for a in filtered
                if (a["shared_ioc_count"] + a["shared_ttp_count"] + a["shared_actor_count"]) >= config.minimum_shared_entities
            ]
        
        # Require exact match if configured
        if config.require_exact_match:
            filtered = [
                a for a in filtered
                if a["shared_ioc_count"] > 0 or a["shared_ttp_count"] > 0
            ]
        
        # Sort by score and limit
        filtered.sort(key=lambda x: x["overall_score"], reverse=True)
        top_matches = filtered[:limit]
        
        # Store relationships
        await self._store_relationships(article_id, top_matches, config)
        
        logger.info("related_articles_found",
                   article_id=article_id,
                   count=len(top_matches))
        
        return top_matches
    
    async def _get_candidates(
        self,
        article_id: int,
        lookback_date: datetime
    ) -> Set[int]:
        """
        Stage 1: Fast candidate generation using indexed queries.
        
        Finds articles that share at least one entity with the source article.
        """
        candidates = set()
        
        # Get source article's entities
        source_ioc_ids = self._get_article_ioc_ids(article_id)
        source_ttp_ids = self._get_article_ttp_ids(article_id)
        source_actor_ids = self._get_article_actor_ids(article_id)
        
        # Find articles with shared IOCs
        if source_ioc_ids:
            ioc_articles = self.db.query(ArticleIOC.article_id).filter(
                ArticleIOC.ioc_id.in_(source_ioc_ids),
                ArticleIOC.article_id != article_id
            ).join(Article).filter(
                Article.created_at >= lookback_date
            ).distinct().all()
            candidates.update([a[0] for a in ioc_articles])
        
        # Find articles with shared TTPs
        if source_ttp_ids:
            ttp_articles = self.db.query(ArticleTTPMap.article_id).filter(
                ArticleTTPMap.ttp_id.in_(source_ttp_ids),
                ArticleTTPMap.article_id != article_id
            ).join(Article).filter(
                Article.created_at >= lookback_date
            ).distinct().all()
            candidates.update([a[0] for a in ttp_articles])
        
        # Find articles with shared actors
        if source_actor_ids:
            actor_articles = self.db.query(ArticleActorMap.article_id).filter(
                ArticleActorMap.actor_id.in_(source_actor_ids),
                ArticleActorMap.article_id != article_id
            ).join(Article).filter(
                Article.created_at >= lookback_date
            ).distinct().all()
            candidates.update([a[0] for a in actor_articles])
        
        return candidates
    
    async def _score_candidates(
        self,
        article_id: int,
        candidates: Set[int],
        config: SimilarityConfig
    ) -> List[Dict]:
        """
        Stage 2: Calculate detailed similarity scores for candidates.
        
        Computes:
        - IOC overlap score
        - TTP overlap score
        - Actor match score
        - Semantic similarity score (if enabled)
        - Weighted overall score
        """
        # Get source article entities
        source_iocs = set(self._get_article_ioc_ids(article_id))
        source_ttps = set(self._get_article_ttp_ids(article_id))
        source_actors = set(self._get_article_actor_ids(article_id))
        
        scored_articles = []
        
        for candidate_id in candidates:
            # Get candidate entities
            cand_iocs = set(self._get_article_ioc_ids(candidate_id))
            cand_ttps = set(self._get_article_ttp_ids(candidate_id))
            cand_actors = set(self._get_article_actor_ids(candidate_id))
            
            # Calculate overlap scores (Jaccard similarity)
            ioc_overlap = self._jaccard_similarity(source_iocs, cand_iocs)
            ttp_overlap = self._jaccard_similarity(source_ttps, cand_ttps)
            actor_match = self._jaccard_similarity(source_actors, cand_actors)
            
            # Get shared entity IDs
            shared_iocs = source_iocs & cand_iocs
            shared_ttps = source_ttps & cand_ttps
            shared_actors = source_actors & cand_actors
            
            # Semantic similarity (if enabled)
            semantic_score = None
            if config.semantic_enabled:
                from app.intelligence.similarity import SemanticSimilarityEngine
                similarity_engine = SemanticSimilarityEngine(self.db)
                semantic_score = await similarity_engine.compute_similarity(
                    article_id, candidate_id
                )
            
            # Calculate weighted overall score
            overall_score = (
                ioc_overlap * config.ioc_weight +
                ttp_overlap * config.ttp_weight +
                actor_match * config.actor_weight
            )
            
            if semantic_score is not None:
                overall_score += semantic_score * config.semantic_weight
            
            # Determine relationship types
            relationship_types = []
            if len(shared_iocs) > 0:
                relationship_types.append(RelationshipType.IOC_MATCH.value)
            if len(shared_ttps) > 0:
                relationship_types.append(RelationshipType.TTP_MATCH.value)
            if len(shared_actors) > 0:
                relationship_types.append(RelationshipType.ACTOR_MATCH.value)
            if semantic_score and semantic_score >= config.semantic_threshold:
                relationship_types.append(RelationshipType.SEMANTIC_SIMILAR.value)
            
            scored_articles.append({
                "related_article_id": candidate_id,
                "overall_score": overall_score,
                "ioc_overlap_score": ioc_overlap,
                "ttp_overlap_score": ttp_overlap,
                "actor_match_score": actor_match,
                "semantic_similarity_score": semantic_score,
                "shared_ioc_count": len(shared_iocs),
                "shared_ttp_count": len(shared_ttps),
                "shared_actor_count": len(shared_actors),
                "shared_ioc_ids": list(shared_iocs),
                "shared_ttp_ids": list(shared_ttps),
                "shared_actor_ids": list(shared_actors),
                "relationship_types": relationship_types
            })
        
        return scored_articles
    
    async def _store_relationships(
        self,
        article_id: int,
        scored_articles: List[Dict],
        config: SimilarityConfig
    ) -> None:
        """Store article relationships in database."""
        for scored in scored_articles:
            # Check if relationship already exists
            existing = self.db.query(ArticleRelationship).filter(
                ArticleRelationship.source_article_id == article_id,
                ArticleRelationship.related_article_id == scored["related_article_id"]
            ).first()
            
            if existing:
                # Update existing relationship
                existing.overall_score = scored["overall_score"]
                existing.ioc_overlap_score = scored["ioc_overlap_score"]
                existing.ttp_overlap_score = scored["ttp_overlap_score"]
                existing.actor_match_score = scored["actor_match_score"]
                existing.semantic_similarity_score = scored.get("semantic_similarity_score")
                existing.shared_ioc_count = scored["shared_ioc_count"]
                existing.shared_ttp_count = scored["shared_ttp_count"]
                existing.shared_actor_count = scored["shared_actor_count"]
                existing.shared_ioc_ids = scored["shared_ioc_ids"]
                existing.shared_ttp_ids = scored["shared_ttp_ids"]
                existing.shared_actor_ids = scored["shared_actor_ids"]
                existing.relationship_types = scored["relationship_types"]
                existing.computed_at = datetime.utcnow()
            else:
                # Create new relationship
                relationship = ArticleRelationship(
                    source_article_id=article_id,
                    related_article_id=scored["related_article_id"],
                    relationship_types=scored["relationship_types"],
                    ioc_overlap_score=scored["ioc_overlap_score"],
                    ttp_overlap_score=scored["ttp_overlap_score"],
                    actor_match_score=scored["actor_match_score"],
                    semantic_similarity_score=scored.get("semantic_similarity_score"),
                    overall_score=scored["overall_score"],
                    shared_ioc_count=scored["shared_ioc_count"],
                    shared_ttp_count=scored["shared_ttp_count"],
                    shared_actor_count=scored["shared_actor_count"],
                    shared_ioc_ids=scored["shared_ioc_ids"],
                    shared_ttp_ids=scored["shared_ttp_ids"],
                    shared_actor_ids=scored["shared_actor_ids"],
                    lookback_days=config.lookback_days,
                    config_snapshot={
                        "ioc_weight": config.ioc_weight,
                        "ttp_weight": config.ttp_weight,
                        "actor_weight": config.actor_weight,
                        "semantic_weight": config.semantic_weight
                    },
                    computed_at=datetime.utcnow()
                )
                self.db.add(relationship)
        
        self.db.commit()
    
    async def detect_campaigns(self, article_id: int) -> Optional[Dict]:
        """
        Detect if article is part of a campaign.
        
        Campaigns are detected when:
        - Multiple articles share significant entities
        - Articles are within time window
        - Minimum article threshold met
        """
        config = self._get_active_config()
        
        if not config.campaign_detection_enabled:
            return None
        
        # Get article's relationships
        relationships = self.db.query(ArticleRelationship).filter(
            ArticleRelationship.source_article_id == article_id,
            ArticleRelationship.overall_score >= 0.7  # High similarity threshold for campaigns
        ).all()
        
        if len(relationships) < config.campaign_min_articles - 1:
            return None  # Not enough related articles
        
        # Check if already part of a campaign
        existing_membership = self.db.query(CampaignArticle).filter(
            CampaignArticle.article_id == article_id
        ).first()
        
        if existing_membership:
            campaign = self.db.query(Campaign).filter(
                Campaign.id == existing_membership.campaign_id
            ).first()
            return {
                "is_part_of_campaign": True,
                "campaign_id": campaign.campaign_id if campaign else None,
                "campaign_name": campaign.name if campaign else None
            }
        
        # Cluster related articles to detect campaign
        related_article_ids = [r.related_article_id for r in relationships]
        cluster = await self._cluster_articles([article_id] + related_article_ids, config)
        
        if cluster and cluster["article_count"] >= config.campaign_min_articles:
            # Create new campaign
            campaign = await self._create_campaign(cluster, config)
            return {
                "is_part_of_campaign": True,
                "campaign_id": campaign.campaign_id,
                "campaign_name": campaign.name,
                "is_new_campaign": True
            }
        
        return {
            "is_part_of_campaign": False,
            "related_articles_count": len(relationships)
        }
    
    async def _cluster_articles(
        self,
        article_ids: List[int],
        config: SimilarityConfig
    ) -> Optional[Dict]:
        """
        Cluster articles to detect campaigns.
        
        Returns cluster info if articles form a cohesive group.
        """
        if len(article_ids) < config.campaign_min_articles:
            return None
        
        # Get all entities for these articles
        all_iocs = set()
        all_ttps = set()
        all_actors = set()
        
        for article_id in article_ids:
            all_iocs.update(self._get_article_ioc_ids(article_id))
            all_ttps.update(self._get_article_ttp_ids(article_id))
            all_actors.update(self._get_article_actor_ids(article_id))
        
        # Find shared entities (entities appearing in multiple articles)
        ioc_counts = defaultdict(int)
        ttp_counts = defaultdict(int)
        actor_counts = defaultdict(int)
        
        for article_id in article_ids:
            for ioc_id in self._get_article_ioc_ids(article_id):
                ioc_counts[ioc_id] += 1
            for ttp_id in self._get_article_ttp_ids(article_id):
                ttp_counts[ttp_id] += 1
            for actor_id in self._get_article_actor_ids(article_id):
                actor_counts[actor_id] += 1
        
        # Signature entities (appear in most articles)
        threshold = len(article_ids) * 0.5  # At least 50% of articles
        signature_iocs = [ioc_id for ioc_id, count in ioc_counts.items() if count >= threshold]
        signature_ttps = [ttp_id for ttp_id, count in ttp_counts.items() if count >= threshold]
        signature_actors = [actor_id for actor_id, count in actor_counts.items() if count >= threshold]
        
        # Check if cluster has enough shared entities
        total_shared = len(signature_iocs) + len(signature_ttps) + len(signature_actors)
        if total_shared < config.campaign_min_shared_entities:
            return None
        
        # Get time range
        articles = self.db.query(Article).filter(
            Article.id.in_(article_ids)
        ).all()
        
        dates = [a.created_at for a in articles if a.created_at]
        if not dates:
            return None
        
        first_seen = min(dates)
        last_seen = max(dates)
        duration_days = (last_seen - first_seen).days
        
        # Check if within campaign time window
        if duration_days > config.campaign_time_window_days:
            return None
        
        return {
            "article_ids": article_ids,
            "article_count": len(article_ids),
            "signature_iocs": signature_iocs,
            "signature_ttps": signature_ttps,
            "signature_actors": signature_actors,
            "total_iocs": len(all_iocs),
            "total_ttps": len(all_ttps),
            "total_actors": len(all_actors),
            "first_seen": first_seen,
            "last_seen": last_seen,
            "duration_days": duration_days
        }
    
    async def _create_campaign(
        self,
        cluster: Dict,
        config: SimilarityConfig
    ) -> Campaign:
        """Create a new campaign from clustered articles."""
        # Generate campaign ID
        campaign_count = self.db.query(Campaign).count() + 1
        campaign_id = f"AUTO_CAMPAIGN_{datetime.utcnow().year}_{campaign_count:04d}"
        
        # Determine primary actor
        primary_actor_id = cluster["signature_actors"][0] if cluster["signature_actors"] else None
        
        # Get actor name for campaign name
        campaign_name = "Unattributed Campaign"
        if primary_actor_id:
            actor = self.db.query(ThreatActor).filter(
                ThreatActor.id == primary_actor_id
            ).first()
            if actor:
                campaign_name = f"{actor.canonical_name} Campaign"
        
        # Create campaign
        campaign = Campaign(
            campaign_id=campaign_id,
            name=campaign_name,
            description=f"Automatically detected campaign with {cluster['article_count']} related articles",
            campaign_type="auto_detected",
            threat_level="medium",
            primary_actor_id=primary_actor_id,
            associated_actor_ids=cluster["signature_actors"],
            signature_ioc_ids=cluster["signature_iocs"],
            signature_ttp_ids=cluster["signature_ttps"],
            article_count=cluster["article_count"],
            total_iocs=cluster["total_iocs"],
            total_ttps=cluster["total_ttps"],
            total_actors=cluster["total_actors"],
            first_seen_at=cluster["first_seen"],
            last_seen_at=cluster["last_seen"],
            duration_days=cluster["duration_days"],
            detection_confidence=0.75,
            detection_method="entity_clustering",
            config_used={
                "lookback_days": config.lookback_days,
                "min_articles": config.campaign_min_articles,
                "min_shared_entities": config.campaign_min_shared_entities
            },
            status=CampaignStatus.ACTIVE.value,
            detected_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        self.db.add(campaign)
        self.db.flush()
        
        # Add articles to campaign
        for article_id in cluster["article_ids"]:
            membership = CampaignArticle(
                campaign_id=campaign.id,
                article_id=article_id,
                confidence=0.8,
                is_seed_article=True,
                added_at=datetime.utcnow()
            )
            self.db.add(membership)
        
        # Update relationships to mark as campaign
        self.db.query(ArticleRelationship).filter(
            ArticleRelationship.source_article_id.in_(cluster["article_ids"]),
            ArticleRelationship.related_article_id.in_(cluster["article_ids"])
        ).update({
            "is_campaign": True,
            "campaign_id": campaign_id
        }, synchronize_session=False)
        
        self.db.commit()
        
        logger.info("campaign_created",
                   campaign_id=campaign_id,
                   articles=cluster["article_count"],
                   iocs=len(cluster["signature_iocs"]),
                   ttps=len(cluster["signature_ttps"]))
        
        return campaign
    
    def _get_article_ioc_ids(self, article_id: int) -> List[int]:
        """Get all IOC IDs for an article."""
        results = self.db.query(ArticleIOC.ioc_id).filter(
            ArticleIOC.article_id == article_id
        ).all()
        return [r[0] for r in results]
    
    def _get_article_ttp_ids(self, article_id: int) -> List[int]:
        """Get all TTP IDs for an article."""
        results = self.db.query(ArticleTTPMap.ttp_id).filter(
            ArticleTTPMap.article_id == article_id
        ).all()
        return [r[0] for r in results]
    
    def _get_article_actor_ids(self, article_id: int) -> List[int]:
        """Get all threat actor IDs for an article."""
        results = self.db.query(ArticleActorMap.actor_id).filter(
            ArticleActorMap.article_id == article_id
        ).all()
        return [r[0] for r in results]
    
    def _jaccard_similarity(self, set1: Set, set2: Set) -> float:
        """Calculate Jaccard similarity between two sets."""
        if not set1 and not set2:
            return 0.0
        if not set1 or not set2:
            return 0.0
        
        intersection = len(set1 & set2)
        union = len(set1 | set2)
        
        return intersection / union if union > 0 else 0.0
    
    def _get_active_config(self) -> SimilarityConfig:
        """Get active similarity configuration."""
        from app.models_agentic import get_active_similarity_config
        return get_active_similarity_config(self.db)
    
    def get_campaigns_overview(self, status: Optional[str] = None) -> List[Dict]:
        """Get overview of all detected campaigns."""
        query = self.db.query(Campaign)
        
        if status:
            query = query.filter(Campaign.status == status)
        
        campaigns = query.order_by(Campaign.last_seen_at.desc()).all()
        
        return [
            {
                "campaign_id": c.campaign_id,
                "name": c.name,
                "campaign_type": c.campaign_type,
                "threat_level": c.threat_level,
                "article_count": c.article_count,
                "total_iocs": c.total_iocs,
                "total_ttps": c.total_ttps,
                "first_seen": c.first_seen_at,
                "last_seen": c.last_seen_at,
                "duration_days": c.duration_days,
                "status": c.status,
                "is_verified": c.is_verified
            }
            for c in campaigns
        ]
