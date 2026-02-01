"""Automated threat intelligence workflow engine.

This engine orchestrates the full automation cycle:
1. Ingest articles from feeds
2. Extract IOCs, IOAs, and TTPs
3. Generate hunt queries using GenAI
4. Execute hunts on configured platforms
5. Analyze results with GenAI
6. Send notifications and update trackers
"""
import asyncio
import json
from datetime import datetime
from typing import Dict, List, Optional, Any
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.logging import logger
from app.core.config import settings
from app.models import (
    Article, ArticleStatus, ExtractedIntelligence, ExtractedIntelligenceType,
    Hunt, HuntExecution, HuntStatus, HuntTriggerType, ConnectorConfig, FeedSource
)
from app.extraction.extractor import IntelligenceExtractor
from app.genai.provider import GenAIOrchestrator
from app.hunts.connectors import get_connector
from app.notifications.provider import NotificationManager


class HuntTracker:
    """Tracks hunt progress and results for reporting."""
    
    def __init__(self, db: Session, article_id: int):
        self.db = db
        self.article_id = article_id
        self.started_at = datetime.utcnow()
        self.steps: List[Dict] = []
        self.status = "running"
        self.error = None
    
    def log_step(self, step: str, status: str, details: Dict = None):
        """Log a workflow step."""
        self.steps.append({
            "step": step,
            "status": status,
            "timestamp": datetime.utcnow().isoformat(),
            "details": details or {}
        })
        logger.info(f"hunt_tracker_{step}", article_id=self.article_id, status=status, **details or {})
    
    def complete(self, status: str = "completed", error: str = None):
        """Mark the workflow as complete."""
        self.status = status
        self.error = error
        self.completed_at = datetime.utcnow()
        self.duration_ms = int((self.completed_at - self.started_at).total_seconds() * 1000)
    
    def to_dict(self) -> Dict:
        """Convert tracker to dictionary for storage."""
        return {
            "article_id": self.article_id,
            "started_at": self.started_at.isoformat(),
            "completed_at": getattr(self, "completed_at", None),
            "duration_ms": getattr(self, "duration_ms", None),
            "status": self.status,
            "error": self.error,
            "steps": self.steps
        }


class AutomationEngine:
    """Main automation engine for threat intelligence workflows."""
    
    def __init__(self, genai_provider: str = None):
        self.genai = GenAIOrchestrator(genai_provider)
        self.notification_manager = NotificationManager()
        self._platforms: List[str] = []
    
    async def process_article(
        self,
        article_id: int,
        platforms: List[str] = None,
        auto_execute: bool = True,
        notify: bool = True
    ) -> Dict:
        """Process a single article through the full automation workflow.
        
        Args:
            article_id: The article ID to process
            platforms: List of platforms to generate/execute hunts for
            auto_execute: Whether to automatically execute the hunts
            notify: Whether to send notifications
        
        Returns:
            Dict with workflow results including tracker data
        """
        db = SessionLocal()
        tracker = HuntTracker(db, article_id)
        
        try:
            # Step 1: Load article
            article = db.query(Article).filter(Article.id == article_id).first()
            if not article:
                tracker.log_step("load_article", "error", {"error": "Article not found"})
                tracker.complete("failed", "Article not found")
                return tracker.to_dict()
            
            tracker.log_step("load_article", "completed", {
                "title": article.title[:100],
                "source": article.feed_source.name if article.feed_source else "unknown"
            })
            
            # Step 2: Extract intelligence
            content = article.normalized_content or article.raw_content or article.summary or ""
            intelligence = IntelligenceExtractor.extract_with_stats(content)
            
            # Save extracted intelligence to database
            await self._save_intelligence(db, article_id, intelligence["intelligence"])
            
            tracker.log_step("extract_intelligence", "completed", intelligence["stats"])
            
            # Step 3: Determine target platforms
            if not platforms:
                platforms = await self._get_active_platforms(db)
            
            if not platforms:
                tracker.log_step("check_platforms", "warning", {"message": "No active hunt platforms configured"})
                # Still complete successfully, just no hunts to run
                article.status = ArticleStatus.IN_ANALYSIS
                db.commit()
                tracker.complete("completed")
                return tracker.to_dict()
            
            tracker.log_step("check_platforms", "completed", {"platforms": platforms})
            
            # Step 4: Generate hunt queries for each platform
            hunts_created = []
            for platform in platforms:
                try:
                    query_result = await self.genai.generate_hunt_query(
                        platform=platform,
                        intelligence=intelligence["intelligence"]
                    )
                    
                    # Save hunt to database
                    hunt = Hunt(
                        article_id=article_id,
                        platform=platform,
                        query_logic=query_result["query"],
                        generated_by_model=query_result.get("model", "unknown"),
                        response_hash=query_result.get("response_hash", "")
                    )
                    db.add(hunt)
                    db.flush()
                    
                    hunts_created.append({
                        "hunt_id": hunt.id,
                        "platform": platform,
                        "model": query_result.get("model"),
                        "is_fallback": query_result.get("is_fallback", False)
                    })
                    
                except Exception as e:
                    logger.error("hunt_generation_failed", platform=platform, error=str(e))
                    tracker.log_step(f"generate_hunt_{platform}", "error", {"error": str(e)})
            
            db.commit()
            tracker.log_step("generate_hunts", "completed", {"hunts_created": len(hunts_created), "hunts": hunts_created})
            
            # Step 5: Execute hunts if auto_execute is enabled
            executions = []
            if auto_execute and hunts_created:
                for hunt_info in hunts_created:
                    try:
                        execution_result = await self._execute_hunt(db, hunt_info["hunt_id"])
                        executions.append(execution_result)
                    except Exception as e:
                        logger.error("hunt_execution_failed", hunt_id=hunt_info["hunt_id"], error=str(e))
                        executions.append({
                            "hunt_id": hunt_info["hunt_id"],
                            "platform": hunt_info["platform"],
                            "status": "error",
                            "error": str(e)
                        })
                
                tracker.log_step("execute_hunts", "completed", {"executions": len(executions)})
            
            # Step 6: Analyze results with GenAI
            analysis_results = []
            for execution in executions:
                if execution.get("status") == "completed" and execution.get("results_count", 0) > 0:
                    try:
                        analysis = await self.genai.analyze_hunt_results(
                            hunt_results=execution,
                            article_context={
                                "title": article.title,
                                "summary": article.summary,
                                "url": article.url
                            },
                            intelligence=intelligence["intelligence"]
                        )
                        
                        analysis_results.append({
                            "hunt_id": execution["hunt_id"],
                            "platform": execution["platform"],
                            "analysis": analysis
                        })
                        
                        # Update hunt execution with analysis
                        hunt_exec = db.query(HuntExecution).filter(
                            HuntExecution.id == execution.get("execution_id")
                        ).first()
                        if hunt_exec:
                            hunt_exec.results["genai_analysis"] = analysis
                            db.commit()
                            
                    except Exception as e:
                        logger.error("result_analysis_failed", error=str(e))
            
            if analysis_results:
                tracker.log_step("analyze_results", "completed", {"analyses": len(analysis_results)})
            
            # Step 7: Send notifications for significant findings
            if notify and analysis_results:
                await self._send_notifications(article, intelligence, executions, analysis_results)
                tracker.log_step("send_notifications", "completed")
            
            # Update article status
            article.status = ArticleStatus.IN_ANALYSIS
            db.commit()
            
            tracker.complete("completed")
            
            return {
                **tracker.to_dict(),
                "hunts": hunts_created,
                "executions": executions,
                "analyses": analysis_results
            }
            
        except Exception as e:
            logger.error("automation_workflow_error", article_id=article_id, error=str(e))
            tracker.complete("failed", str(e))
            return tracker.to_dict()
        finally:
            db.close()
    
    async def process_new_articles(
        self,
        limit: int = 10,
        platforms: List[str] = None,
        auto_execute: bool = True
    ) -> List[Dict]:
        """Process all new articles through the automation workflow.
        
        Args:
            limit: Maximum number of articles to process
            platforms: List of platforms to use (defaults to all active)
            auto_execute: Whether to automatically execute hunts
        
        Returns:
            List of workflow results
        """
        db = SessionLocal()
        
        try:
            # Get new articles
            articles = db.query(Article).filter(
                Article.status == ArticleStatus.NEW
            ).order_by(
                Article.is_high_priority.desc(),
                Article.created_at.desc()
            ).limit(limit).all()
            
            if not articles:
                logger.info("no_new_articles_to_process")
                return []
            
            logger.info("processing_articles", count=len(articles))
            
            results = []
            for article in articles:
                result = await self.process_article(
                    article_id=article.id,
                    platforms=platforms,
                    auto_execute=auto_execute
                )
                results.append(result)
            
            return results
            
        finally:
            db.close()
    
    async def _save_intelligence(self, db: Session, article_id: int, intelligence: Dict):
        """Save extracted intelligence to the database."""
        # Save IOCs
        for ioc in intelligence.get("iocs", []):
            existing = db.query(ExtractedIntelligence).filter(
                ExtractedIntelligence.article_id == article_id,
                ExtractedIntelligence.value == ioc["value"]
            ).first()
            
            if not existing:
                intel = ExtractedIntelligence(
                    article_id=article_id,
                    intelligence_type=ExtractedIntelligenceType.IOC,
                    value=ioc["value"],
                    confidence=ioc.get("confidence", 50),
                    meta={"type": ioc.get("type"), "hash_type": ioc.get("hash_type")}
                )
                db.add(intel)
        
        # Save IOAs
        for ioa in intelligence.get("ioas", []):
            intel = ExtractedIntelligence(
                article_id=article_id,
                intelligence_type=ExtractedIntelligenceType.IOA,
                value=ioa.get("value", ioa.get("category", "")),
                confidence=ioa.get("confidence", 50),
                meta={"category": ioa.get("category"), "evidence": ioa.get("evidence")}
            )
            db.add(intel)
        
        # Save TTPs
        for ttp in intelligence.get("ttps", []):
            existing = db.query(ExtractedIntelligence).filter(
                ExtractedIntelligence.article_id == article_id,
                ExtractedIntelligence.mitre_id == ttp["mitre_id"]
            ).first()
            
            if not existing:
                intel = ExtractedIntelligence(
                    article_id=article_id,
                    intelligence_type=ExtractedIntelligenceType.TTP,
                    value=ttp.get("name", ""),
                    mitre_id=ttp["mitre_id"],
                    confidence=ttp.get("confidence", 50)
                )
                db.add(intel)
        
        # Save ATLAS techniques
        for atlas in intelligence.get("atlas", []):
            existing = db.query(ExtractedIntelligence).filter(
                ExtractedIntelligence.article_id == article_id,
                ExtractedIntelligence.mitre_id == atlas["mitre_id"]
            ).first()
            
            if not existing:
                intel = ExtractedIntelligence(
                    article_id=article_id,
                    intelligence_type=ExtractedIntelligenceType.ATLAS,
                    value=atlas.get("name", ""),
                    mitre_id=atlas["mitre_id"],
                    confidence=atlas.get("confidence", 50),
                    meta={"framework": "ATLAS"}
                )
                db.add(intel)
        
        db.commit()
    
    async def _get_active_platforms(self, db: Session) -> List[str]:
        """Get list of active hunt platforms."""
        hunt_platforms = ["xsiam", "defender", "wiz", "splunk"]
        
        active = []
        for platform in hunt_platforms:
            connector = db.query(ConnectorConfig).filter(
                ConnectorConfig.connector_type == platform,
                ConnectorConfig.is_active == True
            ).first()
            
            if connector:
                active.append(platform)
        
        return active
    
    async def _execute_hunt(self, db: Session, hunt_id: int) -> Dict:
        """Execute a hunt and return results."""
        hunt = db.query(Hunt).filter(Hunt.id == hunt_id).first()
        if not hunt:
            return {"hunt_id": hunt_id, "status": "error", "error": "Hunt not found"}
        
        # Create execution record
        execution = HuntExecution(
            hunt_id=hunt_id,
            trigger_type=HuntTriggerType.AUTO,
            status=HuntStatus.RUNNING,
            executed_at=datetime.utcnow()
        )
        db.add(execution)
        db.flush()
        
        try:
            # Get connector
            connector = get_connector(hunt.platform)
            if not connector:
                execution.status = HuntStatus.FAILED
                execution.error_message = f"No connector for platform: {hunt.platform}"
                db.commit()
                return {
                    "hunt_id": hunt_id,
                    "execution_id": execution.id,
                    "platform": hunt.platform,
                    "status": "error",
                    "error": execution.error_message
                }
            
            # Execute query
            start_time = datetime.utcnow()
            result = await connector.execute_query(hunt.query_logic)
            end_time = datetime.utcnow()
            
            execution.execution_time_ms = int((end_time - start_time).total_seconds() * 1000)
            execution.results = result
            
            if result.get("status") == "completed":
                execution.status = HuntStatus.COMPLETED
            else:
                execution.status = HuntStatus.FAILED
                execution.error_message = result.get("message", "Unknown error")
            
            db.commit()
            
            return {
                "hunt_id": hunt_id,
                "execution_id": execution.id,
                "platform": hunt.platform,
                "status": result.get("status"),
                "results_count": result.get("results_count", 0),
                "results": result.get("results", []),
                "execution_time_ms": execution.execution_time_ms
            }
            
        except Exception as e:
            execution.status = HuntStatus.FAILED
            execution.error_message = str(e)
            db.commit()
            
            return {
                "hunt_id": hunt_id,
                "execution_id": execution.id,
                "platform": hunt.platform,
                "status": "error",
                "error": str(e)
            }
    
    async def _send_notifications(
        self,
        article: Article,
        intelligence: Dict,
        executions: List[Dict],
        analyses: List[Dict]
    ):
        """Send notifications for significant findings."""
        # Check if there are high-risk findings
        high_risk = any(
            a.get("analysis", {}).get("risk_level", "").lower() in ["critical", "high"]
            for a in analyses
        )
        
        if not high_risk:
            # Also notify if there are any hits at all
            total_hits = sum(e.get("results_count", 0) for e in executions)
            if total_hits == 0:
                return  # No findings, no notification needed
        
        # Build notification content
        subject = f"🚨 Hunt Results: {article.title[:50]}..."
        
        message_parts = [
            f"**Article:** {article.title}",
            f"**URL:** {article.url}",
            "",
            "**Hunt Results:**"
        ]
        
        for execution in executions:
            hits = execution.get("results_count", 0)
            platform = execution.get("platform", "unknown").upper()
            status = "✅" if execution.get("status") == "completed" else "❌"
            message_parts.append(f"- {status} {platform}: {hits} hits")
        
        if analyses:
            message_parts.extend(["", "**AI Analysis:**"])
            for analysis in analyses:
                a = analysis.get("analysis", {})
                risk = a.get("risk_level", "Unknown")
                summary = a.get("executive_summary", "No summary available")
                message_parts.append(f"- **{analysis.get('platform', '').upper()}** (Risk: {risk})")
                message_parts.append(f"  {summary[:200]}...")
        
        message = "\n".join(message_parts)
        
        # Send via all configured channels
        await self.notification_manager.send_all(
            subject=subject,
            message=message,
            priority="high" if high_risk else "normal"
        )


async def run_automation_cycle():
    """Run a single automation cycle for all new articles."""
    engine = AutomationEngine()
    results = await engine.process_new_articles(limit=10)
    return results
