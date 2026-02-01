"""
Guardrail management routes.
"""
import structlog
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime

from app.core.database import get_db
from app.models import User, Article
from app.auth.dependencies import require_permission
from app.audit import AuditManager
from app.guardrails.duplicate_detector import DuplicateDetectorGuardrail
from app.genai.provider import get_genai_provider

logger = structlog.get_logger()
router = APIRouter(prefix="/guardrails", tags=["Guardrails"])


class DuplicateDetectionConfig(BaseModel):
    """Configuration for duplicate detection guardrail."""
    enabled: bool = Field(True, description="Enable/disable duplicate detection")
    lookback_days: int = Field(3, ge=1, le=30, description="Days to look back for duplicates")
    duplicate_window_hours: int = Field(24, ge=1, le=168, description="Hours within which to consider as duplicate")
    confidence_threshold: float = Field(0.7, ge=0.0, le=1.0, description="Confidence threshold for duplicate classification")
    auto_mark_duplicates: bool = Field(False, description="Automatically mark detected duplicates")
    notify_on_duplicate: bool = Field(True, description="Send notifications when duplicates detected")


class CheckDuplicateRequest(BaseModel):
    """Request to check for duplicates."""
    title: str
    content: str
    summary: Optional[str] = None
    published_at: Optional[datetime] = None
    source_id: Optional[int] = None


class DuplicateCheckResponse(BaseModel):
    """Response from duplicate check."""
    is_duplicate: bool
    duplicate_type: str
    confidence: float
    similar_articles: List[dict]
    reasoning: str
    matched_iocs: List[str]


@router.get("/duplicate-detection/config", summary="Get duplicate detection configuration")
async def get_duplicate_detection_config(
    current_user: User = Depends(require_permission("manage:connectors")),
    db: Session = Depends(get_db)
):
    """Get current duplicate detection guardrail configuration."""
    try:
        # TODO: Store config in database
        # For now, return default config
        config = DuplicateDetectionConfig()
        return config
    except Exception as e:
        logger.error("failed_to_get_duplicate_config", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get configuration: {str(e)}"
        )


@router.put("/duplicate-detection/config", summary="Update duplicate detection configuration")
async def update_duplicate_detection_config(
    config: DuplicateDetectionConfig,
    current_user: User = Depends(require_permission("manage:connectors")),
    db: Session = Depends(get_db)
):
    """Update duplicate detection guardrail configuration."""
    try:
        # TODO: Store config in database
        # For now, just log the update
        
        # Log audit event
        AuditManager.log_event(
            db=db,
            user_id=current_user.id,
            event_type="GUARDRAIL_CONFIG_CHANGE",
            action="Updated duplicate detection configuration",
            resource_type="guardrail_config",
            resource_id="duplicate_detection",
            metadata=config.dict()
        )
        db.commit()
        
        logger.info(
            "duplicate_detection_config_updated",
            user_id=current_user.id,
            config=config.dict()
        )
        
        return {"success": True, "message": "Configuration updated", "config": config}
    except Exception as e:
        logger.error("failed_to_update_duplicate_config", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update configuration: {str(e)}"
        )


@router.post("/duplicate-detection/check", summary="Check article for duplicates")
async def check_for_duplicates(
    request: CheckDuplicateRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_permission("read:articles")),
    db: Session = Depends(get_db)
):
    """
    Check if an article is a duplicate using GenAI-powered detection.
    
    This endpoint can be called:
    - Before ingesting a new article
    - Manually by users to check existing articles
    - As part of automated workflows
    """
    try:
        # Get GenAI provider
        genai = get_genai_provider()
        
        # Initialize detector with default config
        # TODO: Load config from database
        detector = DuplicateDetectorGuardrail(
            db=db,
            genai_provider=genai,
            lookback_days=3,
            duplicate_window_hours=24,
            confidence_threshold=0.7
        )
        
        # Perform duplicate check
        result = await detector.check_for_duplicates(
            title=request.title,
            content=request.content,
            summary=request.summary,
            published_at=request.published_at,
            source_id=request.source_id
        )
        
        # Log the check
        logger.info(
            "duplicate_check_performed",
            user_id=current_user.id,
            title=request.title[:100],
            is_duplicate=result.is_duplicate,
            confidence=result.confidence
        )
        
        # Return result
        return DuplicateCheckResponse(
            is_duplicate=result.is_duplicate,
            duplicate_type=result.duplicate_type,
            confidence=result.confidence,
            similar_articles=result.similar_articles,
            reasoning=result.reasoning,
            matched_iocs=result.matched_iocs
        )
        
    except Exception as e:
        logger.error("duplicate_check_failed", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check for duplicates: {str(e)}"
        )


@router.post("/duplicate-detection/check-article/{article_id}", summary="Check existing article for duplicates")
async def check_existing_article(
    article_id: int,
    current_user: User = Depends(require_permission("read:articles")),
    db: Session = Depends(get_db)
):
    """Check an existing article for duplicates."""
    try:
        # Get article
        article = db.query(Article).filter(Article.id == article_id).first()
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")
        
        # Check for duplicates
        genai = get_genai_provider()
        detector = DuplicateDetectorGuardrail(
            db=db,
            genai_provider=genai,
            lookback_days=3,
            duplicate_window_hours=24,
            confidence_threshold=0.7
        )
        
        result = await detector.check_for_duplicates(
            title=article.title,
            content=article.normalized_content or article.raw_content,
            summary=article.summary,
            published_at=article.published_at or article.created_at,
            source_id=article.source_id
        )
        
        return DuplicateCheckResponse(
            is_duplicate=result.is_duplicate,
            duplicate_type=result.duplicate_type,
            confidence=result.confidence,
            similar_articles=result.similar_articles,
            reasoning=result.reasoning,
            matched_iocs=result.matched_iocs
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("failed_to_check_existing_article", article_id=article_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check article: {str(e)}"
        )


@router.get("/duplicate-detection/stats", summary="Get duplicate detection statistics")
async def get_duplicate_detection_stats(
    current_user: User = Depends(require_permission("manage:connectors")),
    db: Session = Depends(get_db)
):
    """Get statistics about duplicate detection."""
    try:
        # TODO: Implement stats tracking
        # For now, return placeholder
        return {
            "total_checks": 0,
            "duplicates_found": 0,
            "false_positives": 0,
            "average_confidence": 0.0,
            "most_common_duplicate_type": "similar_content"
        }
    except Exception as e:
        logger.error("failed_to_get_duplicate_stats", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get statistics: {str(e)}"
        )
