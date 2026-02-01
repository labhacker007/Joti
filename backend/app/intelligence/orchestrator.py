"""
Agentic Intelligence Orchestrator

Main coordinator for the end-to-end agentic intelligence pipeline:
1. Article ingestion
2. Summary generation (executive + technical)
3. Entity extraction (from original + summaries)
4. Entity canonicalization
5. Historical association
6. Priority scoring
7. Campaign detection

This orchestrator ensures:
- Single source of truth for entities
- Full lineage and traceability
- Explainable results
- Efficient processing
"""

import asyncio
import hashlib
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from app.core.logging import logger
from app.models import Article, ArticleStatus
from app.models_agentic import (
    ExtractionRun, ExtractionRunStatus, ArticleSummary, SummaryType,
    ArticlePriorityScore, get_active_similarity_config
)
from app.intelligence.canonicalizer import EntityCanonicalizer
from app.intelligence.association import HistoricalAssociationEngine
from app.intelligence.similarity import SemanticSimilarityEngine


class AgenticIntelligenceOrchestrator:
    """
    Main orchestrator for agentic intelligence pipeline.
    
    Coordinates all steps from article ingestion to entity extraction,
    canonicalization, historical association, and priority scoring.
    """
    
    def __init__(self, db_session: Session):
        self.db = db_session
        self.canonicalizer = EntityCanonicalizer(db_session)
        self.association_engine = HistoricalAssociationEngine(db_session)
        self.similarity_engine = SemanticSimilarityEngine(db_session)
    
    async def analyze_article_full(
        self,
        article_id: int,
        user_id: Optional[int] = None,
        force_reanalysis: bool = False,
        model_preference: Optional[str] = None
    ) -> Dict:
        """
        Run complete agentic analysis pipeline for an article.
        
        Args:
            article_id: Article to analyze
            user_id: User triggering analysis (for audit)
            force_reanalysis: Re-run even if already analyzed
            model_preference: Preferred GenAI model
        
        Returns:
            Dict with:
                - extraction_run_id
                - summaries (exec, technical)
                - entities (iocs, ttps, actors)
                - relationships (related articles)
                - priority_score
                - campaign_info
                - duration_ms
        """
        start_time = datetime.utcnow()
        
        # Load article
        article = self.db.query(Article).filter(Article.id == article_id).first()
        if not article:
            raise ValueError(f"Article {article_id} not found")
        
        logger.info("agentic_analysis_started", article_id=article_id, title=article.title[:50])
        
        # Check if already analyzed
        if not force_reanalysis:
            existing_run = self.db.query(ExtractionRun).filter(
                ExtractionRun.article_id == article_id,
                ExtractionRun.status == ExtractionRunStatus.COMPLETED.value
            ).first()
            
            if existing_run:
                logger.info("article_already_analyzed", article_id=article_id, run_id=existing_run.id)
                # Return existing analysis
                return await self._get_analysis_results(article_id, existing_run.id)
        
        # Create extraction run
        run_number = self.db.query(ExtractionRun).filter(
            ExtractionRun.article_id == article_id
        ).count() + 1
        
        extraction_run = ExtractionRun(
            article_id=article_id,
            run_number=run_number,
            status=ExtractionRunStatus.RUNNING.value,
            triggered_by="manual" if user_id else "auto",
            triggered_by_user_id=user_id,
            created_at=datetime.utcnow()
        )
        self.db.add(extraction_run)
        self.db.commit()
        self.db.refresh(extraction_run)
        
        try:
            # Step 1: Generate summaries
            logger.info("generating_summaries", article_id=article_id)
            summaries = await self._generate_summaries(article, extraction_run, model_preference)
            
            # Step 2: Extract entities from all sources
            logger.info("extracting_entities", article_id=article_id)
            extracted = await self._extract_entities(article, summaries, extraction_run, model_preference)
            
            # Step 3: Canonicalize entities (dedupe and merge)
            logger.info("canonicalizing_entities", article_id=article_id)
            canonical = await self.canonicalizer.canonicalize_all(
                article_id=article_id,
                extracted_entities=extracted,
                extraction_run_id=extraction_run.id
            )
            
            # Step 4: Run historical association
            logger.info("running_historical_association", article_id=article_id)
            relationships = await self.association_engine.find_related_articles(
                article_id=article_id,
                config=get_active_similarity_config(self.db)
            )
            
            # Step 5: Calculate priority score
            logger.info("calculating_priority", article_id=article_id)
            priority = await self._calculate_priority(article_id, canonical, relationships)
            
            # Step 6: Detect campaigns
            logger.info("detecting_campaigns", article_id=article_id)
            campaign_info = await self.association_engine.detect_campaigns(article_id)
            
            # Update extraction run
            duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            extraction_run.status = ExtractionRunStatus.COMPLETED.value
            extraction_run.iocs_extracted = canonical["iocs_count"]
            extraction_run.ttps_extracted = canonical["ttps_count"]
            extraction_run.actors_extracted = canonical["actors_count"]
            extraction_run.total_entities = canonical["total_count"]
            extraction_run.duration_ms = duration_ms
            extraction_run.completed_at = datetime.utcnow()
            extraction_run.model_used = extracted.get("model_used", "unknown")
            extraction_run.model_provider = extracted.get("model_provider", "unknown")
            
            # Calculate average confidence
            all_confidences = []
            for entities in extracted.get("entities", {}).values():
                all_confidences.extend([e.get("confidence", 50) for e in entities])
            extraction_run.confidence_avg = sum(all_confidences) / len(all_confidences) if all_confidences else 0
            
            self.db.commit()
            
            # Update article status if still NEW
            if article.status == ArticleStatus.NEW:
                article.status = ArticleStatus.IN_ANALYSIS
                article.analyzed_at = datetime.utcnow()
                article.analyzed_by_id = user_id
                self.db.commit()
            
            logger.info("agentic_analysis_completed", 
                       article_id=article_id,
                       run_id=extraction_run.id,
                       duration_ms=duration_ms,
                       entities=canonical["total_count"],
                       relationships=len(relationships))
            
            return {
                "extraction_run_id": extraction_run.id,
                "article_id": article_id,
                "summaries": summaries,
                "entities": canonical,
                "relationships": relationships,
                "priority": priority,
                "campaign_info": campaign_info,
                "duration_ms": duration_ms,
                "status": "completed"
            }
            
        except Exception as e:
            # Mark run as failed
            extraction_run.status = ExtractionRunStatus.FAILED.value
            extraction_run.error_message = str(e)
            extraction_run.completed_at = datetime.utcnow()
            self.db.commit()
            
            logger.error("agentic_analysis_failed", article_id=article_id, error=str(e))
            raise
    
    async def _generate_summaries(
        self,
        article: Article,
        extraction_run: ExtractionRun,
        model_preference: Optional[str] = None
    ) -> Dict:
        """
        Generate executive and technical summaries using GenAI.
        
        Returns:
            Dict with executive_summary and technical_summary
        """
        from app.genai.provider import GenAIProvider
        from app.genai.prompts import PromptManager
        
        # Check if summaries already exist and are current
        existing_exec = self.db.query(ArticleSummary).filter(
            ArticleSummary.article_id == article.id,
            ArticleSummary.summary_type == SummaryType.EXECUTIVE.value,
            ArticleSummary.is_current == True
        ).first()
        
        existing_tech = self.db.query(ArticleSummary).filter(
            ArticleSummary.article_id == article.id,
            ArticleSummary.summary_type == SummaryType.TECHNICAL.value,
            ArticleSummary.is_current == True
        ).first()
        
        # Use existing if available, otherwise generate
        if existing_exec and existing_tech:
            logger.info("using_existing_summaries", article_id=article.id)
            extraction_run.used_executive_summary = True
            extraction_run.used_technical_summary = True
            return {
                "executive_summary": existing_exec.content,
                "technical_summary": existing_tech.content,
                "model_used": existing_tech.model_used
            }
        
        # Generate new summaries
        provider = GenAIProvider(provider=model_preference)
        prompt_manager = PromptManager(db_session=self.db, enable_rag=True)
        
        # Prepare content
        content = article.normalized_content or article.raw_content or article.summary or ""
        if len(content) > 10000:
            content = content[:10000]  # Limit for token efficiency
        
        # Generate executive summary
        exec_prompts = prompt_manager.build_summary_prompt(
            content=content,
            summary_type="executive",
            article_title=article.title
        )
        exec_summary = await provider.generate(
            exec_prompts["system"],
            exec_prompts["user"],
            temperature=0.3
        )
        
        # Generate technical summary
        tech_prompts = prompt_manager.build_summary_prompt(
            content=content,
            summary_type="technical",
            article_title=article.title
        )
        tech_summary = await provider.generate(
            tech_prompts["system"],
            tech_prompts["user"],
            temperature=0.2
        )
        
        # Store summaries
        exec_summary_obj = ArticleSummary(
            article_id=article.id,
            extraction_run_id=extraction_run.id,
            summary_type=SummaryType.EXECUTIVE.value,
            content=exec_summary,
            version=1,
            model_used=provider.provider,
            is_current=True,
            word_count=len(exec_summary.split()),
            created_at=datetime.utcnow()
        )
        
        tech_summary_obj = ArticleSummary(
            article_id=article.id,
            extraction_run_id=extraction_run.id,
            summary_type=SummaryType.TECHNICAL.value,
            content=tech_summary,
            version=1,
            model_used=provider.provider,
            is_current=True,
            word_count=len(tech_summary.split()),
            created_at=datetime.utcnow()
        )
        
        self.db.add(exec_summary_obj)
        self.db.add(tech_summary_obj)
        
        # Also update article table for backward compatibility
        article.executive_summary = exec_summary
        article.technical_summary = tech_summary
        
        self.db.commit()
        
        extraction_run.used_executive_summary = True
        extraction_run.used_technical_summary = True
        
        logger.info("summaries_generated", 
                   article_id=article.id,
                   exec_words=len(exec_summary.split()),
                   tech_words=len(tech_summary.split()))
        
        return {
            "executive_summary": exec_summary,
            "technical_summary": tech_summary,
            "model_used": provider.provider
        }
    
    async def _extract_entities(
        self,
        article: Article,
        summaries: Dict,
        extraction_run: ExtractionRun,
        model_preference: Optional[str] = None
    ) -> Dict:
        """
        Extract entities from original content AND summaries.
        
        Critical: Entities extracted from summaries are flagged separately.
        """
        from app.extraction.extractor import IntelligenceExtractor
        
        # Prepare combined text for extraction
        original_content = article.normalized_content or article.raw_content or article.summary or ""
        exec_summary = summaries.get("executive_summary", "")
        tech_summary = summaries.get("technical_summary", "")
        
        # Extract from each source separately to track provenance
        logger.info("extracting_from_original", article_id=article.id)
        original_entities = await IntelligenceExtractor.extract_with_genai(
            text=original_content,
            source_url=article.url,
            db_session=self.db
        )
        
        logger.info("extracting_from_summaries", article_id=article.id)
        summary_entities = await IntelligenceExtractor.extract_with_genai(
            text=f"{exec_summary}\n\n{tech_summary}",
            source_url=article.url,
            db_session=self.db
        )
        
        # Merge entities and track source
        merged_entities = {
            "iocs": [],
            "ttps": [],
            "actors": []
        }
        
        # Track which entities came from which source
        original_ioc_values = {ioc.get("value") for ioc in original_entities.get("iocs", [])}
        original_ttp_ids = {ttp.get("mitre_id") for ttp in original_entities.get("ttps", [])}
        
        # Add original entities
        for ioc in original_entities.get("iocs", []):
            ioc["extracted_from"] = "original"
            merged_entities["iocs"].append(ioc)
        
        for ttp in original_entities.get("ttps", []):
            ttp["extracted_from"] = "original"
            merged_entities["ttps"].append(ttp)
        
        # Add summary entities (flag if not in original)
        for ioc in summary_entities.get("iocs", []):
            if ioc.get("value") not in original_ioc_values:
                ioc["extracted_from"] = "summary"
                ioc["confidence"] = max(ioc.get("confidence", 50) - 10, 30)  # Reduce confidence
                ioc["summary_only"] = True
                merged_entities["iocs"].append(ioc)
        
        for ttp in summary_entities.get("ttps", []):
            if ttp.get("mitre_id") not in original_ttp_ids:
                ttp["extracted_from"] = "summary"
                ttp["confidence"] = max(ttp.get("confidence", 50) - 10, 30)
                ttp["summary_only"] = True
                merged_entities["ttps"].append(ttp)
        
        # Extract threat actors from all sources
        merged_entities["actors"] = self._extract_threat_actors(
            original_content + "\n" + exec_summary + "\n" + tech_summary
        )
        
        logger.info("entities_extracted",
                   article_id=article.id,
                   iocs=len(merged_entities["iocs"]),
                   ttps=len(merged_entities["ttps"]),
                   actors=len(merged_entities["actors"]))
        
        return {
            "entities": merged_entities,
            "model_used": original_entities.get("model_used", "unknown"),
            "model_provider": original_entities.get("model_provider", "unknown")
        }
    
    def _extract_threat_actors(self, text: str) -> List[Dict]:
        """
        Extract threat actors from text using pattern matching.
        
        Returns list of actors with canonical names and aliases.
        """
        from app.extraction.extractor import IntelligenceExtractor
        
        actors = []
        text_lower = text.lower()
        
        # Check against known threat actors
        for actor in IntelligenceExtractor.THREAT_ACTORS:
            if actor.lower() in text_lower or actor.upper() in text:
                actors.append({
                    "type": "threat_actor",
                    "canonical_name": actor,
                    "aliases": [],
                    "confidence": 90,
                    "evidence": f"Mentioned in article: {actor}"
                })
        
        # Check for malware families (can indicate actor)
        for malware in IntelligenceExtractor.MALWARE_FAMILIES:
            if malware.lower() in text_lower:
                actors.append({
                    "type": "malware_family",
                    "canonical_name": malware,
                    "aliases": [],
                    "confidence": 85,
                    "evidence": f"Malware family mentioned: {malware}"
                })
        
        return actors
    
    async def _calculate_priority(
        self,
        article_id: int,
        canonical_entities: Dict,
        relationships: List[Dict]
    ) -> Dict:
        """
        Calculate priority score for article based on:
        - Entity criticality
        - Historical context
        - Threat actor attribution
        - Recency
        - Confidence
        """
        article = self.db.query(Article).filter(Article.id == article_id).first()
        
        # Component scores (0-100 each)
        entity_criticality = self._score_entity_criticality(canonical_entities)
        historical_context = self._score_historical_context(relationships)
        actor_attribution = self._score_actor_attribution(canonical_entities)
        recency = self._score_recency(article)
        confidence = canonical_entities.get("avg_confidence", 50)
        
        # Weighted combination
        priority_score = (
            entity_criticality * 0.35 +
            historical_context * 0.25 +
            actor_attribution * 0.20 +
            recency * 0.10 +
            confidence * 0.10
        )
        
        # Determine priority level
        if priority_score >= 80:
            priority_level = "critical"
        elif priority_score >= 60:
            priority_level = "high"
        elif priority_score >= 40:
            priority_level = "medium"
        else:
            priority_level = "low"
        
        # Check for special factors
        has_active_campaign = any(r.get("is_campaign") for r in relationships)
        has_known_actor = canonical_entities.get("actors_count", 0) > 0
        has_critical_iocs = canonical_entities.get("critical_iocs_count", 0) > 0
        has_exploitation_ttps = canonical_entities.get("exploitation_ttps_count", 0) > 0
        
        # Store priority score
        priority_obj = self.db.query(ArticlePriorityScore).filter(
            ArticlePriorityScore.article_id == article_id
        ).first()
        
        if not priority_obj:
            priority_obj = ArticlePriorityScore(article_id=article_id)
            self.db.add(priority_obj)
        
        priority_obj.priority_score = priority_score
        priority_obj.priority_level = priority_level
        priority_obj.entity_criticality_score = entity_criticality
        priority_obj.historical_context_score = historical_context
        priority_obj.actor_attribution_score = actor_attribution
        priority_obj.recency_score = recency
        priority_obj.confidence_score = confidence
        priority_obj.has_active_campaign = has_active_campaign
        priority_obj.has_known_actor = has_known_actor
        priority_obj.has_critical_iocs = has_critical_iocs
        priority_obj.has_exploitation_ttps = has_exploitation_ttps
        priority_obj.score_explanation = {
            "entity_criticality": entity_criticality,
            "historical_context": historical_context,
            "actor_attribution": actor_attribution,
            "recency": recency,
            "confidence": confidence
        }
        priority_obj.calculated_at = datetime.utcnow()
        
        self.db.commit()
        
        return {
            "priority_score": priority_score,
            "priority_level": priority_level,
            "factors": {
                "entity_criticality": entity_criticality,
                "historical_context": historical_context,
                "actor_attribution": actor_attribution,
                "recency": recency,
                "confidence": confidence
            },
            "flags": {
                "has_active_campaign": has_active_campaign,
                "has_known_actor": has_known_actor,
                "has_critical_iocs": has_critical_iocs,
                "has_exploitation_ttps": has_exploitation_ttps
            }
        }
    
    def _score_entity_criticality(self, entities: Dict) -> float:
        """Score based on entity criticality (0-100)."""
        score = 0.0
        
        # IOCs contribute based on type and count
        ioc_count = entities.get("iocs_count", 0)
        if ioc_count > 0:
            score += min(ioc_count * 5, 40)  # Up to 40 points
        
        # TTPs contribute based on severity
        ttp_count = entities.get("ttps_count", 0)
        if ttp_count > 0:
            score += min(ttp_count * 8, 40)  # Up to 40 points
        
        # Critical IOCs boost
        if entities.get("critical_iocs_count", 0) > 0:
            score += 20
        
        return min(score, 100)
    
    def _score_historical_context(self, relationships: List[Dict]) -> float:
        """Score based on historical recurrence (0-100)."""
        if not relationships:
            return 0.0
        
        # More related articles = higher score
        score = min(len(relationships) * 15, 60)
        
        # High-scoring relationships boost
        high_score_count = sum(1 for r in relationships if r.get("overall_score", 0) > 0.8)
        score += min(high_score_count * 10, 40)
        
        return min(score, 100)
    
    def _score_actor_attribution(self, entities: Dict) -> float:
        """Score based on threat actor attribution (0-100)."""
        actor_count = entities.get("actors_count", 0)
        if actor_count == 0:
            return 0.0
        
        # Known actors significantly increase priority
        return min(actor_count * 40, 100)
    
    def _score_recency(self, article: Article) -> float:
        """Score based on article recency (0-100)."""
        if not article.published_at:
            return 50.0  # Default if no date
        
        days_old = (datetime.utcnow() - article.published_at).days
        
        if days_old < 1:
            return 100.0
        elif days_old < 7:
            return 90.0
        elif days_old < 30:
            return 70.0
        elif days_old < 90:
            return 50.0
        else:
            return max(30.0 - (days_old - 90) * 0.1, 0)
    
    async def _get_analysis_results(self, article_id: int, extraction_run_id: int) -> Dict:
        """Get existing analysis results."""
        # Load all components
        summaries = self.db.query(ArticleSummary).filter(
            ArticleSummary.article_id == article_id,
            ArticleSummary.is_current == True
        ).all()
        
        relationships = self.db.query(ArticleRelationship).filter(
            ArticleRelationship.source_article_id == article_id
        ).order_by(ArticleRelationship.overall_score.desc()).limit(10).all()
        
        priority = self.db.query(ArticlePriorityScore).filter(
            ArticlePriorityScore.article_id == article_id
        ).first()
        
        return {
            "extraction_run_id": extraction_run_id,
            "article_id": article_id,
            "summaries": {
                s.summary_type: s.content for s in summaries
            },
            "relationships": [
                {
                    "related_article_id": r.related_article_id,
                    "overall_score": r.overall_score,
                    "relationship_types": r.relationship_types,
                    "shared_entities": {
                        "iocs": r.shared_ioc_count,
                        "ttps": r.shared_ttp_count,
                        "actors": r.shared_actor_count
                    }
                }
                for r in relationships
            ],
            "priority": {
                "priority_score": priority.priority_score if priority else 0,
                "priority_level": priority.priority_level if priority else "low"
            } if priority else None,
            "status": "completed"
        }
    
    async def batch_analyze_articles(
        self,
        article_ids: List[int],
        user_id: Optional[int] = None,
        model_preference: Optional[str] = None
    ) -> Dict:
        """
        Analyze multiple articles in batch.
        
        Processes articles concurrently for efficiency.
        """
        results = []
        errors = []
        
        for article_id in article_ids:
            try:
                result = await self.analyze_article_full(
                    article_id=article_id,
                    user_id=user_id,
                    model_preference=model_preference
                )
                results.append(result)
            except Exception as e:
                logger.error("batch_analysis_failed", article_id=article_id, error=str(e))
                errors.append({
                    "article_id": article_id,
                    "error": str(e)
                })
        
        return {
            "successful": len(results),
            "failed": len(errors),
            "results": results,
            "errors": errors
        }
