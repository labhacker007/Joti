"""Hunt execution and query generation APIs."""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from app.core.database import get_db
from app.auth.dependencies import get_current_user, require_permission
from app.auth.rbac import Permission
from app.models import Hunt, HuntExecution, Article, ArticleStatus, HuntStatus, HuntTriggerType, User, ExtractedIntelligence, ExtractedIntelligenceType, AuditEventType
from app.hunts.connectors import get_connector
from app.genai.provider import GenAIProvider
from app.extraction.extractor import IntelligenceExtractor
from app.audit.manager import AuditManager
from app.core.logging import logger
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime

router = APIRouter(prefix="/hunts", tags=["hunts"])


class HuntCreateRequest(BaseModel):
    article_id: int
    platform: str  # xsiam, defender, wiz, splunk


class BatchHuntRequest(BaseModel):
    article_ids: List[int]
    platforms: List[str]  # List of platforms to run hunts on
    extract_intelligence: bool = True  # Extract IOCs/TTPs before generating hunt


class ExtractionRequest(BaseModel):
    article_ids: List[int]


class HuntResponse(BaseModel):
    id: int
    article_id: int
    platform: str
    query_logic: str
    title: Optional[str] = None
    status: Optional[str] = "PENDING"
    initiated_by_id: Optional[int] = None
    initiated_by_type: Optional[str] = "USER"
    parent_hunt_id: Optional[int] = None
    generated_by_model: Optional[str] = None
    prompt_template_version: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class HuntExecutionResponse(BaseModel):
    id: int
    hunt_id: int
    trigger_type: str
    status: str
    executed_by_id: Optional[int] = None
    executed_by: Optional[str] = None  # Username who ran it
    executed_at: Optional[datetime] = None
    results: Optional[dict] = None
    error_message: Optional[str] = None
    execution_time_ms: Optional[int] = None
    query_version: Optional[int] = 1  # Version of query at execution
    query_snapshot: Optional[str] = None  # Actual query executed
    article_id: Optional[int] = None  # Article ID for search
    article_title: Optional[str] = None  # Article title for display
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


@router.get("/", response_model=List[HuntResponse])
def list_hunts(
    page: int = 1,
    page_size: int = 20,
    current_user: User = Depends(require_permission(Permission.READ_HUNTS.value)),
    db: Session = Depends(get_db)
):
    """List all hunts with pagination."""
    hunts = db.query(Hunt).offset((page - 1) * page_size).limit(page_size).all()
    return [HuntResponse.model_validate(h) for h in hunts]


@router.get("/stats", summary="Get hunt statistics")
def get_hunt_stats_top(
    current_user: User = Depends(require_permission(Permission.READ_HUNTS.value)),
    db: Session = Depends(get_db)
):
    """Get statistics about hunts."""
    total = db.query(Hunt).count()
    
    # By platform
    platforms = {}
    for platform in ["xsiam", "defender", "splunk", "wiz"]:
        platforms[platform] = db.query(Hunt).filter(Hunt.platform == platform).count()
    
    # Execution stats
    total_executions = db.query(HuntExecution).count()
    completed = db.query(HuntExecution).filter(HuntExecution.status == HuntStatus.COMPLETED).count()
    failed = db.query(HuntExecution).filter(HuntExecution.status == HuntStatus.FAILED).count()
    pending = db.query(HuntExecution).filter(HuntExecution.status.in_([HuntStatus.PENDING, HuntStatus.RUNNING])).count()
    
    # Articles with hunts
    articles_with_hunts = db.query(Hunt.article_id).distinct().count()
    reviewed_articles = db.query(Article).filter(Article.status == ArticleStatus.REVIEWED).count()
    
    return {
        "total_hunts": total,
        "by_platform": platforms,
        "executions": {
            "total": total_executions,
            "completed": completed,
            "failed": failed,
            "pending": pending
        },
        "articles_with_hunts": articles_with_hunts,
        "reviewed_articles_ready": reviewed_articles
    }


@router.get("/{hunt_id}", response_model=HuntResponse)
def get_hunt(
    hunt_id: int,
    current_user: User = Depends(require_permission(Permission.READ_HUNTS.value)),
    db: Session = Depends(get_db)
):
    """Get a specific hunt."""
    hunt = db.query(Hunt).filter(Hunt.id == hunt_id).first()
    if not hunt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hunt not found")
    return HuntResponse.model_validate(hunt)


@router.post("/generate", response_model=HuntResponse)
async def generate_hunt_query(
    request: HuntCreateRequest,
    current_user: User = Depends(require_permission(Permission.CREATE_HUNTS.value)),
    db: Session = Depends(get_db)
):
    """Generate a threat hunting query for an article using GenAI."""
    # Get article
    article = db.query(Article).filter(Article.id == request.article_id).first()
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")
    
    # Extract intelligence (filter out source metadata)
    content = f"{article.title} {article.normalized_content or article.raw_content or ''}"
    source_url = article.url or (article.feed_source.url if article.feed_source else None)
    intelligence = IntelligenceExtractor.extract_all(content, source_url=source_url)
    
    # Generate query using GenAI with RAG
    provider = GenAIProvider()
    try:
        # Pass article context and db session for RAG integration
        query_result = await provider.orchestrator.generate_hunt_query(
            platform=request.platform,
            intelligence=intelligence,
            article_title=article.title,
            article_content=content,
            technical_summary=article.technical_summary,
            db_session=db
        )
        query = query_result.get("query", "")
    except Exception as e:
        logger.error("hunt_query_generation_failed", error=str(e), article_id=article.id)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Query generation failed")
    
    # Generate a default title
    platform_name = request.platform.upper() if request.platform else "HUNT"
    article_title_short = article.title[:40] if article.title else f"Article #{article.id}"
    default_title = f"{platform_name}: {article_title_short}"
    
    # Store hunt
    hunt = Hunt(
        article_id=request.article_id,
        platform=request.platform,
        query_logic=query,
        title=default_title,
        initiated_by_id=current_user.id,
        initiated_by_type="USER",
        status="PENDING",
        generated_by_model="gpt-4",
        prompt_template_version="v1"
    )
    
    db.add(hunt)
    
    # Update article status to HUNT_GENERATED when hunt is created
    # This shows that a hunt has been generated for this article
    if article.status in [ArticleStatus.NEW, ArticleStatus.IN_ANALYSIS, ArticleStatus.NEED_TO_HUNT]:
        article.status = ArticleStatus.HUNT_GENERATED
        article.updated_at = datetime.utcnow()
        logger.info("article_status_updated_hunt_generated", 
                   article_id=article.id, 
                   new_status="HUNT_GENERATED",
                   hunt_platform=request.platform)
    
    # Save any extracted intelligence that wasn't already saved
    from app.models import ExtractedIntelligence, ExtractedIntelligenceType
    saved_intel = 0
    for ioc in intelligence.get("iocs", []):
        existing = db.query(ExtractedIntelligence).filter(
            ExtractedIntelligence.article_id == article.id,
            ExtractedIntelligence.value == ioc.get("value")
        ).first()
        if not existing:
            intel_record = ExtractedIntelligence(
                article_id=article.id,
                intelligence_type=ExtractedIntelligenceType.IOC,
                value=ioc.get("value"),
                confidence=ioc.get("confidence", 70),
                meta={"type": ioc.get("type"), "source": "hunt_generation"}
            )
            db.add(intel_record)
            saved_intel += 1
    
    for ttp in intelligence.get("ttps", []):
        existing = db.query(ExtractedIntelligence).filter(
            ExtractedIntelligence.article_id == article.id,
            ExtractedIntelligence.mitre_id == ttp.get("mitre_id")
        ).first()
        if not existing and ttp.get("mitre_id"):
            intel_record = ExtractedIntelligence(
                article_id=article.id,
                intelligence_type=ExtractedIntelligenceType.TTP,
                value=ttp.get("technique_name", ""),
                mitre_id=ttp.get("mitre_id"),
                confidence=ttp.get("confidence", 60),
                meta={"source": "hunt_generation"}
            )
            db.add(intel_record)
            saved_intel += 1
    
    db.commit()
    db.refresh(hunt)
    
    logger.info("hunt_query_generated", 
               hunt_id=hunt.id, 
               platform=request.platform, 
               user_id=current_user.id,
               intel_saved=saved_intel)
    
    return HuntResponse.model_validate(hunt)


@router.post("/{hunt_id}/execute", response_model=HuntExecutionResponse)
async def execute_hunt(
    hunt_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_permission(Permission.EXECUTE_HUNTS.value)),
    db: Session = Depends(get_db)
):
    """Execute a hunt query on the target platform."""
    hunt = db.query(Hunt).options(
        joinedload(Hunt.article)
    ).filter(Hunt.id == hunt_id).first()
    if not hunt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hunt not found")
    
    # Create execution record with query versioning
    execution = HuntExecution(
        hunt_id=hunt_id,
        trigger_type=HuntTriggerType.MANUAL.value,
        status=HuntStatus.PENDING.value,
        executed_by_id=current_user.id,
        query_version=hunt.query_version or 1,  # Track which version of query was executed
        query_snapshot=hunt.query_logic  # Store snapshot of query at execution time
    )
    
    db.add(execution)
    db.commit()
    db.refresh(execution)
    
    # Execute query in background
    background_tasks.add_task(
        _execute_hunt_task,
        execution_id=execution.id,
        hunt=hunt,
        user_id=current_user.id
    )
    
    # Audit log with detailed info
    AuditManager.log_hunt_triggered(
        db, hunt_id, hunt.article_id, HuntTriggerType.MANUAL.value, hunt.platform, current_user.id
    )
    
    # Additional detailed audit log entry
    try:
        from app.audit.manager import AuditLogEntry
        audit_detail = {
            "action": "HUNT_EXECUTED",
            "hunt_id": hunt_id,
            "execution_id": execution.id,
            "article_id": hunt.article_id,
            "article_title": hunt.article.title if hunt.article else None,
            "platform": hunt.platform,
            "query_version": hunt.query_version or 1,
            "executed_by": current_user.username,
            "trigger_type": "MANUAL"
        }
        logger.info("hunt_execution_audit", **audit_detail)
    except Exception as e:
        logger.warning("audit_detail_failed", error=str(e))
    
    logger.info("hunt_execution_started", execution_id=execution.id, hunt_id=hunt_id, user_id=current_user.id)
    
    # Return response with additional context
    return HuntExecutionResponse(
        id=execution.id,
        hunt_id=execution.hunt_id,
        trigger_type=execution.trigger_type.value if hasattr(execution.trigger_type, 'value') else str(execution.trigger_type),
        status=execution.status.value if hasattr(execution.status, 'value') else str(execution.status),
        executed_by_id=execution.executed_by_id,
        executed_by=current_user.username,
        executed_at=execution.executed_at,
        results=execution.results,
        error_message=execution.error_message,
        execution_time_ms=execution.execution_time_ms,
        query_version=execution.query_version,
        query_snapshot=execution.query_snapshot,
        article_id=hunt.article_id,
        article_title=hunt.article.title if hunt.article else None,
        created_at=execution.created_at,
        updated_at=execution.updated_at
    )


async def _execute_hunt_task(execution_id: int, hunt: Hunt, user_id: int):
    """Background task to execute hunt on platform."""
    from app.core.database import SessionLocal
    import json
    db = SessionLocal()
    
    try:
        execution = db.query(HuntExecution).filter(HuntExecution.id == execution_id).first()
        if not execution:
            return
        
        # Get connector
        connector = get_connector(hunt.platform)
        if not connector:
            execution.status = HuntStatus.FAILED.value
            execution.error_message = f"Unknown platform: {hunt.platform}"
            db.commit()
            return
        
        # Execute query
        execution.status = HuntStatus.RUNNING.value
        db.commit()
        
        import time
        start_time = time.time()
        
        try:
            results = await connector.execute_query(hunt.query_logic)
        except Exception as conn_err:
            # Connection or execution error
            execution.execution_time_ms = int((time.time() - start_time) * 1000)
            execution.status = HuntStatus.FAILED.value
            execution.error_message = f"Connector error: {str(conn_err)}"
            execution.executed_at = datetime.utcnow()
            db.commit()
            logger.error("hunt_connector_error", execution_id=execution_id, error=str(conn_err))
            return
        
        execution.execution_time_ms = int((time.time() - start_time) * 1000)
        execution.results = results
        execution.executed_at = datetime.utcnow()
        
        # Check if the connector returned an error status
        result_status = None
        error_message = None
        if isinstance(results, dict):
            result_status = results.get("status", "").lower()
            error_message = results.get("message", "")
        
        # Determine execution status based on connector response
        if result_status in ("error", "failed", "timeout"):
            execution.status = HuntStatus.FAILED.value
            execution.error_message = error_message or f"Hunt query {result_status}"
            execution.findings_summary = f"Hunt failed: {error_message or result_status}"
            db.commit()
            logger.warning("hunt_execution_failed", 
                          execution_id=execution_id, 
                          platform=hunt.platform,
                          error=error_message)
            return
        
        # Only mark as completed if we got a valid response
        execution.status = HuntStatus.COMPLETED.value
        
        # Calculate hits count from results
        hits_count = 0
        if isinstance(results, dict):
            hits_count = results.get("results_count", 0) or len(results.get("results", []))
        elif isinstance(results, list):
            hits_count = len(results)
        execution.hits_count = hits_count
        
        # Extract intelligence from hunt results and generate summary
        if hits_count > 0:
            try:
                # Convert results to string for extraction
                results_text = json.dumps(results) if isinstance(results, (dict, list)) else str(results)
                
                # Extract IOCs from hunt results
                extracted = IntelligenceExtractor.extract_all(results_text)
                
                saved_count = 0
                for ioc in extracted.get("iocs", []):
                    existing = db.query(ExtractedIntelligence).filter(
                        ExtractedIntelligence.article_id == hunt.article_id,
                        ExtractedIntelligence.hunt_execution_id == execution.id,
                        ExtractedIntelligence.value == ioc.get("value")
                    ).first()
                    if not existing:
                        intel = ExtractedIntelligence(
                            article_id=hunt.article_id,
                            hunt_execution_id=execution.id,
                            intelligence_type=ExtractedIntelligenceType.IOC,
                            value=ioc.get("value"),
                            confidence=ioc.get("confidence", 80),
                            meta={"source": "hunt_results", "platform": hunt.platform, **ioc}
                        )
                        db.add(intel)
                        saved_count += 1
                
                for ttp in extracted.get("ttps", []):
                    existing = db.query(ExtractedIntelligence).filter(
                        ExtractedIntelligence.article_id == hunt.article_id,
                        ExtractedIntelligence.hunt_execution_id == execution.id,
                        ExtractedIntelligence.mitre_id == ttp.get("mitre_id")
                    ).first()
                    if not existing:
                        intel = ExtractedIntelligence(
                            article_id=hunt.article_id,
                            hunt_execution_id=execution.id,
                            intelligence_type=ExtractedIntelligenceType.TTP,
                            value=ttp.get("technique_name", ""),
                            mitre_id=ttp.get("mitre_id"),
                            confidence=ttp.get("confidence", 70),
                            meta={"source": "hunt_results", "platform": hunt.platform}
                        )
                        db.add(intel)
                        saved_count += 1
                
                # Generate findings summary
                ioc_count = len(extracted.get("iocs", []))
                ttp_count = len(extracted.get("ttps", []))
                execution.findings_summary = f"Found {hits_count} hits. Extracted {ioc_count} IOCs and {ttp_count} TTPs from hunt results."
                
                logger.info("hunt_intelligence_extracted", 
                           execution_id=execution_id, 
                           hits=hits_count, 
                           iocs=ioc_count, 
                           ttps=ttp_count,
                           saved=saved_count)
                           
            except Exception as extract_err:
                logger.error("hunt_extraction_error", execution_id=execution_id, error=str(extract_err))
                execution.findings_summary = f"Found {hits_count} hits. Intelligence extraction failed."
        else:
            execution.findings_summary = "No hits found in hunt results."
        
        # Send email notification if hits found and not already sent (idempotent)
        if hits_count > 0 and not execution.email_sent:
            try:
                from app.notifications.provider import NotificationManager
                from app.core.config import settings
                
                # Get article for context
                article = db.query(Article).filter(Article.id == hunt.article_id).first()
                article_title = article.title if article else "Unknown Article"
                
                notification_manager = NotificationManager()
                
                # Build recipient list from settings or use default
                notify_emails = []
                if settings.SMTP_FROM_EMAIL:
                    notify_emails = [settings.SMTP_FROM_EMAIL]  # Self-notify for now
                
                # Send notifications
                notification_results = notification_manager.send_hunt_completed(
                    hunt_platform=hunt.platform,
                    article_title=article_title,
                    results_count=hits_count,
                    query=hunt.query_logic[:500] if hunt.query_logic else None,
                    hunt_id=hunt.id,
                    executed_by=f"User ID: {user_id}",
                    notify_emails=notify_emails,
                    notify_slack_channel=settings.SLACK_CHANNEL_ALERTS if settings.SLACK_BOT_TOKEN else None
                )
                
                # Mark as sent if any notification succeeded
                if any(notification_results.values()):
                    execution.email_sent = True
                    logger.info("hunt_notification_sent", execution_id=execution_id, results=notification_results)
                else:
                    logger.warning("hunt_notification_failed", execution_id=execution_id)
                    
            except Exception as notify_err:
                logger.error("hunt_notification_error", execution_id=execution_id, error=str(notify_err))
        
        logger.info("hunt_execution_completed", execution_id=execution_id, platform=hunt.platform, hits=hits_count)
        
        # Update article after successful hunt execution
        article = db.query(Article).filter(Article.id == hunt.article_id).first()
        if article:
            # If article was in NEED_TO_HUNT status, mark it as REVIEWED after successful hunt
            if article.status == ArticleStatus.NEED_TO_HUNT:
                article.status = ArticleStatus.REVIEWED
                article.reviewed_at = datetime.utcnow()
                article.reviewed_by_id = user_id
                logger.info("article_status_updated_after_hunt", 
                           article_id=article.id, 
                           new_status="REVIEWED",
                           hunt_execution_id=execution_id)
            
            # Update article's updated_at timestamp
            article.updated_at = datetime.utcnow()
            
            db.commit()
        
    except Exception as e:
        logger.error("hunt_execution_error", execution_id=execution_id, error=str(e))
        execution.status = HuntStatus.FAILED.value
        execution.error_message = str(e)
    
    finally:
        db.commit()
        db.close()


@router.get("/{hunt_id}/executions", response_model=List[HuntExecutionResponse])
def get_hunt_executions(
    hunt_id: int,
    current_user: User = Depends(require_permission(Permission.READ_HUNTS.value)),
    db: Session = Depends(get_db)
):
    """Get all execution history for a hunt."""
    hunt = db.query(Hunt).options(
        joinedload(Hunt.article)
    ).filter(Hunt.id == hunt_id).first()
    if not hunt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hunt not found")
    
    executions = db.query(HuntExecution).options(
        joinedload(HuntExecution.executed_by)
    ).filter(HuntExecution.hunt_id == hunt_id).order_by(desc(HuntExecution.created_at)).all()
    
    result = []
    for e in executions:
        result.append(HuntExecutionResponse(
            id=e.id,
            hunt_id=e.hunt_id,
            trigger_type=e.trigger_type.value if hasattr(e.trigger_type, 'value') else str(e.trigger_type),
            status=e.status.value if hasattr(e.status, 'value') else str(e.status),
            executed_by_id=e.executed_by_id,
            executed_by=e.executed_by.username if e.executed_by else None,
            executed_at=e.executed_at,
            results=e.results,
            error_message=e.error_message,
            execution_time_ms=e.execution_time_ms,
            query_version=e.query_version or 1,
            query_snapshot=e.query_snapshot,
            article_id=hunt.article_id,
            article_title=hunt.article.title if hunt.article else None,
            created_at=e.created_at,
            updated_at=e.updated_at
        ))
    return result


@router.get("/all-executions", response_model=List[HuntExecutionResponse])
def get_all_executions(
    search: Optional[str] = Query(None, description="Search by article name, article ID, hunt ID"),
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(require_permission(Permission.READ_HUNTS.value)),
    db: Session = Depends(get_db)
):
    """Get all hunt executions with search and filtering."""
    query = db.query(HuntExecution).options(
        joinedload(HuntExecution.executed_by),
        joinedload(HuntExecution.hunt).joinedload(Hunt.article)
    )
    
    # Apply status filter
    if status_filter:
        query = query.filter(HuntExecution.status == status_filter)
    
    executions = query.order_by(desc(HuntExecution.created_at)).limit(limit).all()
    
    result = []
    for e in executions:
        # Apply search filter in Python (for article title search)
        if search:
            search_lower = search.lower()
            match = False
            if str(e.hunt_id) in search_lower:
                match = True
            if e.hunt and str(e.hunt.article_id) in search_lower:
                match = True
            if e.hunt and e.hunt.article and e.hunt.article.title.lower().find(search_lower) != -1:
                match = True
            if not match:
                continue
        
        result.append(HuntExecutionResponse(
            id=e.id,
            hunt_id=e.hunt_id,
            trigger_type=e.trigger_type.value if hasattr(e.trigger_type, 'value') else str(e.trigger_type),
            status=e.status.value if hasattr(e.status, 'value') else str(e.status),
            executed_by_id=e.executed_by_id,
            executed_by=e.executed_by.username if e.executed_by else None,
            executed_at=e.executed_at,
            results=e.results,
            error_message=e.error_message,
            execution_time_ms=e.execution_time_ms,
            query_version=e.query_version or 1,
            query_snapshot=e.query_snapshot,
            article_id=e.hunt.article_id if e.hunt else None,
            article_title=e.hunt.article.title if e.hunt and e.hunt.article else None,
            created_at=e.created_at,
            updated_at=e.updated_at
        ))
    return result


# ============ EXTRACTION ENDPOINTS ============

@router.post("/extract", summary="Extract IOCs, TTPs, and IOAs from articles")
def extract_intelligence(
    request: ExtractionRequest,
    current_user: User = Depends(require_permission(Permission.EXTRACT_INTELLIGENCE.value)),
    db: Session = Depends(get_db)
):
    """Extract IOCs, TTPs, and IOAs from one or more articles."""
    results = []
    
    for article_id in request.article_ids:
        article = db.query(Article).filter(Article.id == article_id).first()
        if not article:
            results.append({"article_id": article_id, "status": "error", "message": "Article not found"})
            continue
        
        # Extract intelligence (filter out source metadata)
        content = f"{article.title} {article.normalized_content or article.raw_content or ''}"
        source_url = article.url or (article.feed_source.url if article.feed_source else None)
        extracted = IntelligenceExtractor.extract_all(content, source_url=source_url)
        
        # Save extracted intelligence to database
        saved_count = {"iocs": 0, "ttps": 0, "ioas": 0}
        
        for ioc in extracted.get("iocs", []):
            existing = db.query(ExtractedIntelligence).filter(
                ExtractedIntelligence.article_id == article_id,
                ExtractedIntelligence.value == ioc.get("value")
            ).first()
            if not existing:
                intel = ExtractedIntelligence(
                    article_id=article_id,
                    intelligence_type=ExtractedIntelligenceType.IOC,
                    value=ioc.get("value"),
                    confidence=ioc.get("confidence", 80),
                    meta=ioc
                )
                db.add(intel)
                saved_count["iocs"] += 1
        
        for ttp in extracted.get("ttps", []):
            existing = db.query(ExtractedIntelligence).filter(
                ExtractedIntelligence.article_id == article_id,
                ExtractedIntelligence.mitre_id == ttp.get("mitre_id")
            ).first()
            if not existing:
                intel = ExtractedIntelligence(
                    article_id=article_id,
                    intelligence_type=ExtractedIntelligenceType.TTP,
                    value=ttp.get("technique_name", ""),
                    mitre_id=ttp.get("mitre_id"),
                    confidence=ttp.get("confidence", 70),
                    meta=ttp
                )
                db.add(intel)
                saved_count["ttps"] += 1
        
        for ioa in extracted.get("ioas", []):
            existing = db.query(ExtractedIntelligence).filter(
                ExtractedIntelligence.article_id == article_id,
                ExtractedIntelligence.value == ioa.get("value")
            ).first()
            if not existing:
                intel = ExtractedIntelligence(
                    article_id=article_id,
                    intelligence_type=ExtractedIntelligenceType.IOA,
                    value=ioa.get("value", ""),
                    confidence=ioa.get("confidence", 60),
                    meta=ioa
                )
                db.add(intel)
                saved_count["ioas"] += 1
        
        db.commit()
        
        results.append({
            "article_id": article_id,
            "article_title": article.title,
            "status": "success",
            "extracted": {
                "iocs": len(extracted.get("iocs", [])),
                "ttps": len(extracted.get("ttps", [])),
                "ioas": len(extracted.get("ioas", []))
            },
            "saved": saved_count
        })
        
        logger.info("intelligence_extracted", article_id=article_id, user_id=current_user.id, counts=saved_count)
    
    return {"message": f"Extracted intelligence from {len(request.article_ids)} articles", "results": results}


class GenAIExtractionRequest(BaseModel):
    article_id: int


@router.post("/extract/genai", summary="Extract IOCs, TTPs, and IOAs using GenAI")
async def extract_intelligence_genai(
    request: GenAIExtractionRequest,
    current_user: User = Depends(require_permission(Permission.EXTRACT_INTELLIGENCE.value)),
    db: Session = Depends(get_db)
):
    """Extract IOCs, TTPs, and IOAs from an article using GenAI for higher accuracy.
    
    This endpoint uses the configured GenAI provider (Ollama, OpenAI, etc.) to analyze
    the article content and extract genuine threat indicators, filtering out source
    website URLs and other non-malicious metadata.
    """
    article = db.query(Article).options(
        joinedload(Article.feed_source)
    ).filter(Article.id == request.article_id).first()
    
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")
    
    # Prepare content for extraction
    content = f"Title: {article.title}\n\nSummary: {article.summary or ''}\n\nContent: {article.normalized_content or article.raw_content or ''}"
    source_url = article.url or (article.feed_source.url if article.feed_source else None)
    
    try:
        # Use GenAI-enhanced extraction
        extracted = await IntelligenceExtractor.extract_with_genai(content, source_url=source_url)
    except Exception as e:
        logger.error("genai_extraction_failed", article_id=request.article_id, error=str(e))
        # Fall back to regex extraction
        extracted = IntelligenceExtractor.extract_all(content, source_url=source_url)
    
    # Clear existing intelligence for this article (re-extraction)
    db.query(ExtractedIntelligence).filter(
        ExtractedIntelligence.article_id == request.article_id
    ).delete()
    
    # Save extracted intelligence to database
    saved_count = {"iocs": 0, "ttps": 0, "ioas": 0, "atlas": 0}
    
    for ioc in extracted.get("iocs", []):
        intel = ExtractedIntelligence(
            article_id=request.article_id,
            intelligence_type=ExtractedIntelligenceType.IOC,
            value=ioc.get("value"),
            confidence=ioc.get("confidence", 80),
            evidence=ioc.get("evidence"),
            meta={"type": ioc.get("type"), "source": ioc.get("source", "genai")}
        )
        db.add(intel)
        saved_count["iocs"] += 1
    
    for ttp in extracted.get("ttps", []):
        intel = ExtractedIntelligence(
            article_id=request.article_id,
            intelligence_type=ExtractedIntelligenceType.TTP,
            value=ttp.get("name", ""),
            mitre_id=ttp.get("mitre_id"),
            confidence=ttp.get("confidence", 80),
            evidence=ttp.get("evidence"),
            meta={"source": ttp.get("source", "genai")}
        )
        db.add(intel)
        saved_count["ttps"] += 1
    
    for ioa in extracted.get("ioas", []):
        intel = ExtractedIntelligence(
            article_id=request.article_id,
            intelligence_type=ExtractedIntelligenceType.IOA,
            value=ioa.get("value"),
            confidence=ioa.get("confidence", 75),
            evidence=str(ioa.get("evidence", "")),
            meta={"category": ioa.get("category"), "type": ioa.get("type"), "source": ioa.get("source", "genai")}
        )
        db.add(intel)
        saved_count["ioas"] += 1
    
    for atlas in extracted.get("atlas", []):
        intel = ExtractedIntelligence(
            article_id=request.article_id,
            intelligence_type=ExtractedIntelligenceType.ATLAS,
            value=atlas.get("name", ""),
            mitre_id=atlas.get("mitre_id"),
            confidence=atlas.get("confidence", 70),
            meta={"framework": "ATLAS", "source": atlas.get("source", "regex")}
        )
        db.add(intel)
        saved_count["atlas"] += 1
    
    db.commit()
    
    logger.info("genai_intelligence_extracted", 
               article_id=request.article_id, 
               user_id=current_user.id, 
               counts=saved_count)
    
    return {
        "article_id": request.article_id,
        "article_title": article.title,
        "status": "success",
        "extraction_method": "genai",
        "saved": saved_count,
        "extracted_items": {
            "iocs": [{"type": i.get("type"), "value": i.get("value")} for i in extracted.get("iocs", [])],
            "ttps": [{"mitre_id": t.get("mitre_id"), "name": t.get("name")} for t in extracted.get("ttps", [])],
            "ioas": [{"category": i.get("category"), "value": i.get("value")} for i in extracted.get("ioas", [])],
            "atlas": [{"mitre_id": a.get("mitre_id"), "name": a.get("name")} for a in extracted.get("atlas", [])]
        }
    }


@router.get("/articles/reviewed", summary="Get reviewed articles ready for hunting")
def get_reviewed_articles(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_permission(Permission.READ_ARTICLES.value)),
    db: Session = Depends(get_db)
):
    """Get articles that are REVIEWED and ready for threat hunting."""
    query = db.query(Article).options(
        joinedload(Article.feed_source)
    ).filter(Article.status == ArticleStatus.REVIEWED).order_by(desc(Article.updated_at))
    
    total = query.count()
    articles = query.offset((page - 1) * page_size).limit(page_size).all()
    
    result = []
    for article in articles:
        # Get extracted intelligence count
        intel_count = db.query(ExtractedIntelligence).filter(
            ExtractedIntelligence.article_id == article.id
        ).count()
        
        result.append({
            "id": article.id,
            "title": article.title,
            "source_name": article.feed_source.name if article.feed_source else None,
            "published_at": article.published_at,
            "reviewed_at": article.reviewed_at,
            "is_high_priority": article.is_high_priority,
            "watchlist_keywords": article.watchlist_match_keywords or [],
            "intelligence_count": intel_count,
            "has_hunts": db.query(Hunt).filter(Hunt.article_id == article.id).count() > 0
        })
    
    return {"articles": result, "total": total, "page": page, "page_size": page_size}


# ============ BATCH HUNT ENDPOINTS ============

@router.post("/batch", summary="Run hunts on multiple articles across platforms")
async def batch_hunt(
    request: BatchHuntRequest,
    current_user: User = Depends(require_permission(Permission.CREATE_HUNTS.value)),
    db: Session = Depends(get_db)
):
    """Run threat hunts on multiple articles across multiple platforms."""
    results = []
    total_hunts = 0
    
    for article_id in request.article_ids:
        article = db.query(Article).filter(Article.id == article_id).first()
        if not article:
            results.append({"article_id": article_id, "status": "error", "message": "Article not found"})
            continue
        
        article_result = {
            "article_id": article_id,
            "article_title": article.title,
            "extractions": None,
            "hunts": []
        }
        
        # Step 1: Extract intelligence if requested
        if request.extract_intelligence:
            content = f"{article.title} {article.normalized_content or article.raw_content or ''}"
            source_url = article.url or (article.feed_source.url if article.feed_source else None)
            extracted = IntelligenceExtractor.extract_all(content, source_url=source_url)
            
            # Save to database
            saved_count = {"iocs": 0, "ttps": 0, "ioas": 0}
            for ioc in extracted.get("iocs", []):
                existing = db.query(ExtractedIntelligence).filter(
                    ExtractedIntelligence.article_id == article_id,
                    ExtractedIntelligence.value == ioc.get("value")
                ).first()
                if not existing:
                    db.add(ExtractedIntelligence(
                        article_id=article_id,
                        intelligence_type=ExtractedIntelligenceType.IOC,
                        value=ioc.get("value"),
                        confidence=ioc.get("confidence", 80),
                        meta=ioc
                    ))
                    saved_count["iocs"] += 1
            
            for ttp in extracted.get("ttps", []):
                existing = db.query(ExtractedIntelligence).filter(
                    ExtractedIntelligence.article_id == article_id,
                    ExtractedIntelligence.mitre_id == ttp.get("mitre_id")
                ).first()
                if not existing:
                    db.add(ExtractedIntelligence(
                        article_id=article_id,
                        intelligence_type=ExtractedIntelligenceType.TTP,
                        value=ttp.get("technique_name", ""),
                        mitre_id=ttp.get("mitre_id"),
                        confidence=70,
                        meta=ttp
                    ))
                    saved_count["ttps"] += 1
            
            db.commit()
            article_result["extractions"] = saved_count
        else:
            # Use existing extracted intelligence
            existing_intel = db.query(ExtractedIntelligence).filter(
                ExtractedIntelligence.article_id == article_id
            ).all()
            extracted = {
                "iocs": [{"value": i.value, "type": "unknown"} for i in existing_intel if i.intelligence_type == ExtractedIntelligenceType.IOC],
                "ttps": [{"mitre_id": i.mitre_id, "technique_name": i.value} for i in existing_intel if i.intelligence_type == ExtractedIntelligenceType.TTP],
                "ioas": [{"value": i.value} for i in existing_intel if i.intelligence_type == ExtractedIntelligenceType.IOA]
            }
        
        # Step 2: Generate and save hunts for each platform with RAG
        provider = GenAIProvider()
        article = db.query(Article).filter(Article.id == article_id).first()
        content = f"{article.title} {article.normalized_content or article.raw_content or ''}"
        
        for platform in request.platforms:
            try:
                query_result = await provider.orchestrator.generate_hunt_query(
                    platform=platform,
                    intelligence=extracted,
                    article_title=article.title,
                    article_content=content,
                    technical_summary=article.technical_summary,
                    db_session=db
                )
                query = query_result.get("query", "")
                
                hunt = Hunt(
                    article_id=article_id,
                    platform=platform,
                    query_logic=query,
                    generated_by_model=provider.provider,
                    prompt_template_version="v1"
                )
                db.add(hunt)
                db.commit()
                db.refresh(hunt)
                
                article_result["hunts"].append({
                    "hunt_id": hunt.id,
                    "platform": platform,
                    "status": "generated",
                    "query_preview": query[:200] + "..." if len(query) > 200 else query
                })
                total_hunts += 1
                
            except Exception as e:
                logger.error("batch_hunt_generation_failed", article_id=article_id, platform=platform, error=str(e))
                article_result["hunts"].append({
                    "platform": platform,
                    "status": "failed",
                    "error": str(e)
                })
        
        results.append(article_result)
    
    logger.info("batch_hunt_completed", user_id=current_user.id, articles=len(request.article_ids), hunts=total_hunts)
    
    return {
        "message": f"Processed {len(request.article_ids)} articles, generated {total_hunts} hunts",
        "results": results
    }


@router.get("/stats", summary="Get hunt statistics")
def get_hunt_stats(
    current_user: User = Depends(require_permission(Permission.READ_HUNTS.value)),
    db: Session = Depends(get_db)
):
    """Get statistics about hunts."""
    total = db.query(Hunt).count()
    
    # By platform
    platforms = {}
    for platform in ["xsiam", "defender", "splunk", "wiz"]:
        platforms[platform] = db.query(Hunt).filter(Hunt.platform == platform).count()
    
    # Execution stats
    total_executions = db.query(HuntExecution).count()
    completed = db.query(HuntExecution).filter(HuntExecution.status == HuntStatus.COMPLETED.value).count()
    failed = db.query(HuntExecution).filter(HuntExecution.status == HuntStatus.FAILED.value).count()
    pending = db.query(HuntExecution).filter(HuntExecution.status.in_([HuntStatus.PENDING.value, HuntStatus.RUNNING.value])).count()
    
    # Articles with hunts
    articles_with_hunts = db.query(Hunt.article_id).distinct().count()
    reviewed_articles = db.query(Article).filter(Article.status == ArticleStatus.REVIEWED).count()
    
    return {
        "total_hunts": total,
        "by_platform": platforms,
        "executions": {
            "total": total_executions,
            "completed": completed,
            "failed": failed,
            "pending": pending
        },
        "articles_with_hunts": articles_with_hunts,
        "reviewed_articles_ready": reviewed_articles
    }


# ============ UPDATE/EDIT ENDPOINTS ============

class HuntUpdateRequest(BaseModel):
    """Request to update a hunt."""
    query_logic: Optional[str] = None
    title: Optional[str] = None
    create_new_version: bool = False  # If True, creates a new hunt version instead of editing


@router.patch("/{hunt_id}", summary="Update a hunt (edit or create new version)")
def update_hunt(
    hunt_id: int,
    request: HuntUpdateRequest,
    current_user: User = Depends(require_permission(Permission.MANAGE_HUNTS.value)),
    db: Session = Depends(get_db)
):
    """Update a hunt's query logic or title.
    
    If the hunt has executions in progress, editing is blocked.
    If create_new_version=True, creates a new version of the hunt with the changes.
    """
    hunt = db.query(Hunt).filter(Hunt.id == hunt_id).first()
    if not hunt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hunt not found")
    
    # Check if hunt has in-progress executions
    in_progress = db.query(HuntExecution).filter(
        HuntExecution.hunt_id == hunt_id,
        HuntExecution.status == HuntStatus.RUNNING
    ).first()
    
    if in_progress and not request.create_new_version:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Cannot edit hunt while execution is in progress. Use create_new_version=True to create a new version."
        )
    
    if request.create_new_version:
        # Generate a new title for the version
        version_count = db.query(Hunt).filter(Hunt.parent_hunt_id == hunt_id).count() + 1
        new_query_version = (hunt.query_version or 1) + 1
        new_title = request.title or f"{hunt.title or 'Hunt'} (v{new_query_version} - edited by {current_user.username})"
        
        # Create new version
        new_hunt = Hunt(
            article_id=hunt.article_id,
            platform=hunt.platform,
            query_logic=request.query_logic or hunt.query_logic,
            title=new_title,
            initiated_by_id=current_user.id,
            initiated_by_type="USER",
            status="PENDING",
            generated_by_model=hunt.generated_by_model,
            prompt_template_version=hunt.prompt_template_version,
            parent_hunt_id=hunt_id,
            query_version=new_query_version  # Track version number
        )
        db.add(new_hunt)
        db.commit()
        db.refresh(new_hunt)
        
        AuditManager.log_event(
            db=db,
            event_type=AuditEventType.HUNT_TRIGGER,
            action=f"Created new version of hunt {hunt_id} -> {new_hunt.id} (v{new_query_version})",
            user_id=current_user.id,
            resource_type="hunt",
            resource_id=new_hunt.id,
            details={
                "original_hunt_id": hunt_id,
                "new_hunt_id": new_hunt.id,
                "query_version": new_query_version,
                "created_by": current_user.username,
                "article_id": hunt.article_id
            }
        )
        
        return {
            "message": "New hunt version created",
            "original_hunt_id": hunt_id,
            "new_hunt_id": new_hunt.id,
            "query_version": new_query_version,
            "hunt": {
                "id": new_hunt.id,
                "title": new_hunt.title,
                "query_logic": new_hunt.query_logic,
                "platform": new_hunt.platform,
                "status": new_hunt.status,
                "parent_hunt_id": new_hunt.parent_hunt_id,
                "query_version": new_query_version
            }
        }
    else:
        # Direct edit (only if not in progress)
        old_query = hunt.query_logic
        old_version = hunt.query_version or 1
        
        if request.query_logic and request.query_logic != hunt.query_logic:
            hunt.query_logic = request.query_logic
            hunt.query_version = old_version + 1  # Increment version on query change
        if request.title:
            hunt.title = request.title
        
        hunt.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(hunt)
        
        AuditManager.log_event(
            db=db,
            event_type=AuditEventType.HUNT_TRIGGER,
            action=f"Updated hunt {hunt_id}: query changed to v{hunt.query_version}",
            user_id=current_user.id,
            resource_type="hunt",
            resource_id=hunt_id,
            details={
                "hunt_id": hunt_id,
                "old_version": old_version,
                "new_version": hunt.query_version,
                "updated_by": current_user.username,
                "article_id": hunt.article_id
            }
        )
        
        return {
            "message": "Hunt updated",
            "hunt_id": hunt_id,
            "query_version": hunt.query_version,
            "hunt": {
                "id": hunt.id,
                "title": hunt.title,
                "query_logic": hunt.query_logic,
                "platform": hunt.platform,
                "status": hunt.status,
                "query_version": hunt.query_version
            }
        }


@router.post("/{hunt_id}/generate-title", summary="Generate a title for a hunt using GenAI")
async def generate_hunt_title(
    hunt_id: int,
    current_user: User = Depends(require_permission(Permission.MANAGE_HUNTS.value)),
    db: Session = Depends(get_db)
):
    """Generate a descriptive title for a hunt using GenAI."""
    hunt = db.query(Hunt).filter(Hunt.id == hunt_id).first()
    if not hunt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hunt not found")
    
    # Get the article for context
    article = db.query(Article).filter(Article.id == hunt.article_id).first()
    
    # Try to generate title using GenAI
    try:
        from app.genai.orchestrator import GenAIOrchestrator
        orchestrator = GenAIOrchestrator()
        
        prompt = f"""Generate a short, descriptive title (max 60 chars) for this threat hunt query.

Platform: {hunt.platform}
Article: {article.title if article else 'Unknown'}
Query: {hunt.query_logic[:500]}

Respond with ONLY the title, no explanation or quotes."""
        
        result = await orchestrator.generate(prompt, function_name="hunt_title")
        title = result.get("response", "").strip().strip('"').strip("'")[:80]
        
        if title:
            hunt.title = title
            db.commit()
            
            return {"hunt_id": hunt_id, "title": title, "generated": True}
    except Exception as e:
        logger.warning("failed_to_generate_hunt_title", hunt_id=hunt_id, error=str(e))
    
    # Fallback: generate a simple title
    platform_name = hunt.platform.upper() if hunt.platform else "HUNT"
    article_title = article.title[:30] if article else f"Article #{hunt.article_id}"
    fallback_title = f"{platform_name} Hunt: {article_title}"
    
    hunt.title = fallback_title
    db.commit()
    
    return {"hunt_id": hunt_id, "title": fallback_title, "generated": False}


# ============ DELETE ENDPOINTS ============

@router.delete("/{hunt_id}", summary="Delete a specific hunt")
def delete_hunt(
    hunt_id: int,
    current_user: User = Depends(require_permission(Permission.MANAGE_HUNTS.value)),
    db: Session = Depends(get_db)
):
    """Delete a specific hunt and its executions."""
    hunt = db.query(Hunt).filter(Hunt.id == hunt_id).first()
    if not hunt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hunt not found")
    
    platform = hunt.platform
    article_id = hunt.article_id
    
    # Delete executions first
    db.query(HuntExecution).filter(HuntExecution.hunt_id == hunt_id).delete(synchronize_session=False)
    
    # Delete the hunt
    db.delete(hunt)
    db.commit()
    
    # Log audit after successful delete
    logger.info("hunt_deleted", hunt_id=hunt_id, platform=platform, article_id=article_id, user_id=current_user.id)
    
    return {"message": f"Hunt {hunt_id} deleted", "platform": platform, "article_id": article_id}


@router.delete("/batch/delete", summary="Delete multiple hunts")
def delete_hunts_batch(
    hunt_ids: List[int] = Query(..., description="List of hunt IDs to delete"),
    current_user: User = Depends(require_permission(Permission.MANAGE_HUNTS.value)),
    db: Session = Depends(get_db)
):
    """Delete multiple hunts at once."""
    deleted_count = 0
    
    for hunt_id in hunt_ids:
        hunt = db.query(Hunt).filter(Hunt.id == hunt_id).first()
        if hunt:
            # Delete executions first
            db.query(HuntExecution).filter(HuntExecution.hunt_id == hunt_id).delete()
            db.delete(hunt)
            deleted_count += 1
    
    db.commit()
    
    AuditManager.log_event(
        db=db,
        event_type=AuditEventType.HUNT_TRIGGER,
        action=f"Batch deleted {deleted_count} hunts",
        user_id=current_user.id,
        resource_type="hunt",
        resource_id=None
    )
    
    logger.info("hunts_batch_deleted", count=deleted_count, user_id=current_user.id)
    
    return {"message": f"Deleted {deleted_count} hunts", "deleted_count": deleted_count}


# ============ QUERY PREVIEW ENDPOINT ============

@router.post("/preview-query", summary="Preview hunt query without saving")
async def preview_hunt_query(
    request: HuntCreateRequest,
    current_user: User = Depends(require_permission(Permission.READ_HUNTS.value)),
    db: Session = Depends(get_db)
):
    """Generate and preview a hunt query without saving it to the database.
    
    Useful for reviewing generated queries before committing to a hunt.
    """
    article = db.query(Article).filter(Article.id == request.article_id).first()
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")
    
    # Get extracted intelligence
    intel = db.query(ExtractedIntelligence).filter(
        ExtractedIntelligence.article_id == request.article_id
    ).all()
    
    extracted = {
        "iocs": [{"value": i.value, "type": i.meta.get("type", "unknown") if i.meta else "unknown"} 
                 for i in intel if i.intelligence_type == ExtractedIntelligenceType.IOC],
        "ttps": [{"mitre_id": i.mitre_id, "technique_name": i.value} 
                 for i in intel if i.intelligence_type == ExtractedIntelligenceType.TTP],
        "ioas": [{"value": i.value, "category": i.meta.get("category", "unknown") if i.meta else "unknown"} 
                 for i in intel if i.intelligence_type == ExtractedIntelligenceType.IOA]
    }
    
    if not any([extracted["iocs"], extracted["ttps"], extracted["ioas"]]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="No intelligence found. Extract IOCs/TTPs first."
        )
    
    # Generate query with RAG
    try:
        provider = GenAIProvider()
        content = f"{article.title} {article.normalized_content or article.raw_content or ''}"
        query_result = await provider.orchestrator.generate_hunt_query(
            platform=request.platform,
            intelligence=extracted,
            article_title=article.title,
            article_content=content,
            technical_summary=article.technical_summary,
            db_session=db
        )
        query = query_result.get("query", "")
        
        return {
            "article_id": request.article_id,
            "article_title": article.title,
            "platform": request.platform,
            "query": query,
            "intelligence_used": {
                "iocs": len(extracted["iocs"]),
                "ttps": len(extracted["ttps"]),
                "ioas": len(extracted["ioas"])
            },
            "model_used": provider.provider
        }
    except Exception as e:
        logger.error("query_preview_failed", article_id=request.article_id, platform=request.platform, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate query: {str(e)}"
        )


# ============ COMPREHENSIVE HUNT WITH ALL IOCs ============

class ComprehensiveHuntRequest(BaseModel):
    """Request for comprehensive hunt generation with multi-model extraction."""
    article_id: int
    platform: str
    use_model_comparison: bool = True  # Compare primary/secondary models
    update_article_iocs: bool = True  # Update article's IOCs with best extraction


@router.post("/generate-comprehensive", summary="Generate comprehensive hunt using all IOCs with multi-model comparison")
async def generate_comprehensive_hunt(
    request: ComprehensiveHuntRequest,
    current_user: User = Depends(require_permission(Permission.CREATE_HUNTS.value)),
    db: Session = Depends(get_db)
):
    """Generate a comprehensive hunt query using ALL IOCs from multi-model extraction.
    
    This endpoint:
    1. Extracts IOCs using both primary and secondary GenAI models (if configured)
    2. Compares extraction results and uses the one with more IOCs
    3. Generates hunt query with ALL extracted IOCs (no truncation)
    4. Optionally updates the article's extracted intelligence with the best model's results
    5. Returns detailed comparison stats and full hunt query
    """
    article = db.query(Article).options(
        joinedload(Article.feed_source)
    ).filter(Article.id == request.article_id).first()
    
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")
    
    # Step 1: Extract IOCs using multi-model comparison
    content = f"Title: {article.title}\n\nSummary: {article.summary or ''}\n\nContent: {article.normalized_content or article.raw_content or ''}"
    source_url = article.url or (article.feed_source.url if article.feed_source else None)
    
    if request.use_model_comparison:
        # Use multi-model extraction with comparison
        extraction_result = await IntelligenceExtractor.extract_with_model_comparison(
            text=content,
            source_url=source_url,
            db_session=db
        )
    else:
        # Use single model extraction
        extraction_result = await IntelligenceExtractor.extract_with_genai(
            text=content,
            source_url=source_url,
            db_session=db
        )
        extraction_result["model_used"] = "default"
        extraction_result["comparison"] = {"models_compared": 1}
    
    iocs = extraction_result.get("iocs", [])
    ttps = extraction_result.get("ttps", [])
    atlas = extraction_result.get("atlas", [])
    model_used = extraction_result.get("model_used", "unknown")
    comparison = extraction_result.get("comparison", {})
    
    if not iocs and not ttps:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No IOCs or TTPs could be extracted from the article"
        )
    
    # Step 2: Update article's extracted intelligence if requested
    if request.update_article_iocs:
        # Clear existing intelligence for this article
        db.query(ExtractedIntelligence).filter(
            ExtractedIntelligence.article_id == request.article_id
        ).delete()
        
        saved_count = {"iocs": 0, "ttps": 0, "atlas": 0}
        
        # Save all IOCs
        for ioc in iocs:
            intel = ExtractedIntelligence(
                article_id=request.article_id,
                intelligence_type=ExtractedIntelligenceType.IOC,
                value=ioc.get("value"),
                confidence=ioc.get("confidence", 80),
                evidence=ioc.get("evidence", ""),
                meta={
                    "type": ioc.get("type"),
                    "source": ioc.get("source", "genai"),
                    "extracted_by_model": ioc.get("extracted_by_model", model_used)
                }
            )
            db.add(intel)
            saved_count["iocs"] += 1
        
        # Save all TTPs
        for ttp in ttps:
            intel = ExtractedIntelligence(
                article_id=request.article_id,
                intelligence_type=ExtractedIntelligenceType.TTP,
                value=ttp.get("name", ""),
                mitre_id=ttp.get("mitre_id"),
                confidence=ttp.get("confidence", 75),
                evidence=ttp.get("evidence", ""),
                meta={
                    "source": ttp.get("source", "genai"),
                    "extracted_by_model": ttp.get("extracted_by_model", model_used)
                }
            )
            db.add(intel)
            saved_count["ttps"] += 1
        
        # Save ATLAS techniques
        for atl in atlas:
            intel = ExtractedIntelligence(
                article_id=request.article_id,
                intelligence_type=ExtractedIntelligenceType.ATLAS,
                value=atl.get("name", ""),
                mitre_id=atl.get("mitre_id"),
                confidence=atl.get("confidence", 70),
                meta={
                    "framework": "ATLAS",
                    "source": atl.get("source", "regex"),
                    "extracted_by_model": atl.get("extracted_by_model", "regex")
                }
            )
            db.add(intel)
            saved_count["atlas"] += 1
        
        db.commit()
        
        logger.info("article_iocs_updated", 
                   article_id=request.article_id,
                   model_used=model_used,
                   counts=saved_count)
    
    # Step 3: Format ALL IOCs for hunt query generation (no truncation!)
    iocs_by_type = {}
    for ioc in iocs:
        ioc_type = ioc.get("type", "unknown")
        if ioc_type not in iocs_by_type:
            iocs_by_type[ioc_type] = []
        iocs_by_type[ioc_type].append(ioc.get("value"))
    
    # Build comprehensive IOC string for prompt (include ALL)
    iocs_str = ""
    for ioc_type, values in iocs_by_type.items():
        iocs_str += f"\n{ioc_type.upper()} ({len(values)} indicators):\n"
        for value in values:  # Include ALL values
            iocs_str += f"  - {value}\n"
    
    ttps_str = "\n".join([
        f"- {t.get('mitre_id', 'N/A')}: {t.get('name', 'Unknown')}"
        for t in ttps  # Include ALL TTPs
    ]) or "No TTPs identified"
    
    # Step 4: Generate hunt query with ALL IOCs
    from app.genai.prompts import PromptManager
    from app.genai.provider import get_model_manager
    
    prompt_manager = PromptManager(db_session=db)
    prompts = prompt_manager.build_hunt_query_prompt(
        platform=request.platform,
        iocs=iocs_str,
        ttps=ttps_str,
        context=f"Article: {article.title}\nExtracted by: {model_used}\nTotal IOCs: {len(iocs)}, Total TTPs: {len(ttps)}"
    )
    
    try:
        model_manager = get_model_manager()
        provider = await model_manager.get_provider()
        query = await provider.generate(prompts["system"], prompts["user"], temperature=0.1)
        
        # Clean up query
        if "```" in query:
            parts = query.split("```")
            for part in parts:
                if part.strip() and not part.strip().startswith(("json", "xql", "kql", "spl", "graphql")):
                    if any(keyword in part.lower() for keyword in ["filter", "where", "search", "dataset", "index"]):
                        query = part.strip()
                        break
                elif part.strip():
                    lines = part.strip().split("\n")
                    if len(lines) > 1:
                        query = "\n".join(lines[1:]).strip()
                    else:
                        query = part.strip()
        
        query = query.strip()
        
    except Exception as e:
        logger.error("comprehensive_hunt_query_failed", error=str(e), article_id=request.article_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate hunt query: {str(e)}"
        )
    
    # Step 5: Create hunt record
    platform_name = request.platform.upper()
    article_title_short = article.title[:40] if article.title else f"Article #{article.id}"
    hunt_title = f"{platform_name}: {article_title_short} (Comprehensive - {len(iocs)} IOCs)"
    
    hunt = Hunt(
        article_id=request.article_id,
        platform=request.platform,
        query_logic=query,
        title=hunt_title,
        initiated_by_id=current_user.id,
        initiated_by_type="USER",
        status="PENDING",
        generated_by_model=model_used,
        prompt_template_version="comprehensive_v1"
    )
    
    db.add(hunt)
    db.commit()
    db.refresh(hunt)
    
    logger.info("comprehensive_hunt_generated", 
               hunt_id=hunt.id, 
               platform=request.platform,
               model_used=model_used,
               ioc_count=len(iocs),
               ttp_count=len(ttps),
               user_id=current_user.id)
    
    return {
        "hunt_id": hunt.id,
        "article_id": request.article_id,
        "article_title": article.title,
        "platform": request.platform,
        "query": query,
        "hunt_title": hunt_title,
        "extraction": {
            "model_used": model_used,
            "comparison": comparison,
            "iocs_extracted": len(iocs),
            "ttps_extracted": len(ttps),
            "atlas_extracted": len(atlas),
            "iocs_by_type": {k: len(v) for k, v in iocs_by_type.items()},
            "article_updated": request.update_article_iocs
        },
        "iocs": [{"type": i.get("type"), "value": i.get("value")} for i in iocs],
        "ttps": [{"mitre_id": t.get("mitre_id"), "name": t.get("name")} for t in ttps]
    }


@router.post("/extract/compare-models", summary="Extract IOCs using multiple models and compare results")
async def extract_and_compare_models(
    request: GenAIExtractionRequest,
    current_user: User = Depends(require_permission(Permission.EXTRACT_INTELLIGENCE.value)),
    db: Session = Depends(get_db)
):
    """Extract IOCs using both primary and secondary GenAI models and compare results.
    
    This endpoint:
    1. Uses both primary and secondary models (if configured) to extract IOCs
    2. Compares the extraction results
    3. Returns detailed comparison showing which model extracted more IOCs
    4. Automatically updates the article with the best model's results
    """
    article = db.query(Article).options(
        joinedload(Article.feed_source)
    ).filter(Article.id == request.article_id).first()
    
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")
    
    # Prepare content for extraction
    content = f"Title: {article.title}\n\nSummary: {article.summary or ''}\n\nContent: {article.normalized_content or article.raw_content or ''}"
    source_url = article.url or (article.feed_source.url if article.feed_source else None)
    
    # Use multi-model extraction
    extraction_result = await IntelligenceExtractor.extract_with_model_comparison(
        text=content,
        source_url=source_url,
        db_session=db
    )
    
    iocs = extraction_result.get("iocs", [])
    ttps = extraction_result.get("ttps", [])
    atlas = extraction_result.get("atlas", [])
    model_used = extraction_result.get("model_used", "unknown")
    comparison = extraction_result.get("comparison", {})
    
    # Clear existing and save new intelligence
    db.query(ExtractedIntelligence).filter(
        ExtractedIntelligence.article_id == request.article_id
    ).delete()
    
    saved_count = {"iocs": 0, "ttps": 0, "atlas": 0}
    
    for ioc in iocs:
        intel = ExtractedIntelligence(
            article_id=request.article_id,
            intelligence_type=ExtractedIntelligenceType.IOC,
            value=ioc.get("value"),
            confidence=ioc.get("confidence", 80),
            evidence=ioc.get("evidence", ""),
            meta={
                "type": ioc.get("type"),
                "source": ioc.get("source", "genai"),
                "extracted_by_model": ioc.get("extracted_by_model", model_used)
            }
        )
        db.add(intel)
        saved_count["iocs"] += 1
    
    for ttp in ttps:
        intel = ExtractedIntelligence(
            article_id=request.article_id,
            intelligence_type=ExtractedIntelligenceType.TTP,
            value=ttp.get("name", ""),
            mitre_id=ttp.get("mitre_id"),
            confidence=ttp.get("confidence", 75),
            evidence=ttp.get("evidence", ""),
            meta={
                "source": ttp.get("source", "genai"),
                "extracted_by_model": ttp.get("extracted_by_model", model_used)
            }
        )
        db.add(intel)
        saved_count["ttps"] += 1
    
    for atl in atlas:
        intel = ExtractedIntelligence(
            article_id=request.article_id,
            intelligence_type=ExtractedIntelligenceType.ATLAS,
            value=atl.get("name", ""),
            mitre_id=atl.get("mitre_id"),
            confidence=atl.get("confidence", 70),
            meta={"framework": "ATLAS", "source": atl.get("source", "regex")}
        )
        db.add(intel)
        saved_count["atlas"] += 1
    
    db.commit()
    
    logger.info("model_comparison_extraction_saved",
               article_id=request.article_id,
               model_used=model_used,
               saved=saved_count,
               user_id=current_user.id)
    
    return {
        "article_id": request.article_id,
        "article_title": article.title,
        "status": "success",
        "extraction_method": "multi_model_comparison",
        "model_used": model_used,
        "comparison": comparison,
        "saved": saved_count,
        "extracted_items": {
            "iocs": [{"type": i.get("type"), "value": i.get("value"), "model": i.get("extracted_by_model")} for i in iocs],
            "ttps": [{"mitre_id": t.get("mitre_id"), "name": t.get("name"), "model": t.get("extracted_by_model")} for t in ttps],
            "atlas": [{"mitre_id": a.get("mitre_id"), "name": a.get("name")} for a in atlas]
        }
    }
