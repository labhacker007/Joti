"""
Hunt Tracking API

Endpoints for tracking hunt generation and launch status,
and manual hunt creation from Hunt Workbench.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

from app.core.database import get_db
from app.auth.dependencies import get_current_user, require_permission
from app.models import (
    User, Article, Hunt, HuntExecution, ArticleHuntTracking,
    HuntStatus, HuntTriggerType
)
from app.core.logging import logger

router = APIRouter(prefix="/hunts/tracking", tags=["hunt-tracking"])


class HuntTrackingUpdate(BaseModel):
    """Schema for updating hunt tracking status."""
    generation_status: Optional[str] = None
    launch_status: Optional[str] = None
    is_visible_in_workbench: Optional[bool] = None


class ManualHuntCreate(BaseModel):
    """Schema for manually creating a hunt."""
    article_id: int = Field(..., description="Article ID to associate with hunt")
    platform: str = Field(..., description="Target platform (defender, splunk, xsiam, wiz)")
    query_logic: str = Field(..., min_length=1, description="Hunt query/logic")
    title: Optional[str] = Field(None, description="Hunt title")
    manual_notes: Optional[str] = Field(None, description="Analyst notes")


class ArticleSearchResponse(BaseModel):
    """Schema for article search results."""
    id: int
    title: str
    url: Optional[str]
    published_at: Optional[datetime]
    status: str
    hunt_generated_count: int
    hunt_launched_count: int


# ============================================================================
# HUNT TRACKING ENDPOINTS
# ============================================================================

@router.post("/record-generation/{hunt_id}")
async def record_hunt_generation(
    hunt_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Record that a hunt was generated from an article.
    Called automatically when hunt is generated from Article Detail page.
    """
    hunt = db.query(Hunt).get(hunt_id)
    if not hunt:
        raise HTTPException(status_code=404, detail="Hunt not found")
    
    # Check if tracking entry already exists
    tracking = db.query(ArticleHuntTracking).filter(
        and_(
            ArticleHuntTracking.article_id == hunt.article_id,
            ArticleHuntTracking.hunt_id == hunt_id
        )
    ).first()
    
    if not tracking:
        # Create new tracking entry
        tracking = ArticleHuntTracking(
            article_id=hunt.article_id,
            hunt_id=hunt_id,
            generation_status="GENERATED",
            generated_at=datetime.utcnow(),
            generated_by_user_id=current_user.id,
            is_visible_in_workbench=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(tracking)
        
        # Update article counts
        article = db.query(Article).get(hunt.article_id)
        if article:
            article.hunt_generated_count += 1
            article.last_hunt_generated_at = datetime.utcnow()
            
            # Update article status if needed
            if article.status == "NEED_TO_HUNT":
                article.status = "HUNT_GENERATED"
        
        db.commit()
        db.refresh(tracking)
        
        logger.info(
            "hunt_generation_recorded",
            hunt_id=hunt_id,
            article_id=hunt.article_id,
            user_id=current_user.id
        )
    
    return {
        "message": "Hunt generation recorded",
        "tracking_id": tracking.id,
        "hunt_id": hunt_id,
        "article_id": hunt.article_id
    }


@router.post("/record-launch/{hunt_id}")
async def record_hunt_launch(
    hunt_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Record that a hunt was launched.
    Called automatically when hunt is executed from Article Detail page or Hunt Workbench.
    """
    hunt = db.query(Hunt).get(hunt_id)
    if not hunt:
        raise HTTPException(status_code=404, detail="Hunt not found")
    
    # Get or create tracking entry
    tracking = db.query(ArticleHuntTracking).filter(
        and_(
            ArticleHuntTracking.article_id == hunt.article_id,
            ArticleHuntTracking.hunt_id == hunt_id
        )
    ).first()
    
    if not tracking:
        # Create tracking entry if it doesn't exist (shouldn't happen, but handle it)
        tracking = ArticleHuntTracking(
            article_id=hunt.article_id,
            hunt_id=hunt_id,
            generation_status="GENERATED",
            generated_at=hunt.created_at,
            generated_by_user_id=hunt.initiated_by_id,
            is_visible_in_workbench=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(tracking)
    
    # Update launch status
    if not tracking.launched_at:  # Only count first launch
        tracking.launch_status = "LAUNCHED"
        tracking.launched_at = datetime.utcnow()
        tracking.launched_by_user_id = current_user.id
        tracking.updated_at = datetime.utcnow()
        
        # Update article counts
        article = db.query(Article).get(hunt.article_id)
        if article:
            article.hunt_launched_count += 1
            article.last_hunt_launched_at = datetime.utcnow()
    
    db.commit()
    db.refresh(tracking)
    
    logger.info(
        "hunt_launch_recorded",
        hunt_id=hunt_id,
        article_id=hunt.article_id,
        user_id=current_user.id
    )
    
    return {
        "message": "Hunt launch recorded",
        "tracking_id": tracking.id,
        "hunt_id": hunt_id,
        "article_id": hunt.article_id,
        "launched_at": tracking.launched_at
    }


@router.get("/article/{article_id}/hunts")
async def get_article_hunts(
    article_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all hunts for an article with tracking status.
    Used in Article Detail page to show hunt generation/launch status.
    """
    article = db.query(Article).get(article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    # Get all tracking entries for this article
    trackings = db.query(ArticleHuntTracking).filter(
        ArticleHuntTracking.article_id == article_id
    ).order_by(desc(ArticleHuntTracking.generated_at)).all()
    
    result = []
    for tracking in trackings:
        hunt = tracking.hunt
        if hunt:
            # Get latest execution
            latest_execution = db.query(HuntExecution).filter(
                HuntExecution.hunt_id == hunt.id
            ).order_by(desc(HuntExecution.created_at)).first()
            
            result.append({
                "tracking_id": tracking.id,
                "hunt_id": hunt.id,
                "platform": hunt.platform,
                "title": hunt.title,
                "query_logic": hunt.query_logic,
                "is_manual": hunt.is_manual,
                "manual_notes": hunt.manual_notes,
                "generation_status": tracking.generation_status,
                "launch_status": tracking.launch_status,
                "generated_at": tracking.generated_at,
                "launched_at": tracking.launched_at,
                "generated_by": tracking.generated_by.username if tracking.generated_by else None,
                "launched_by": tracking.launched_by.username if tracking.launched_by else None,
                "is_visible_in_workbench": tracking.is_visible_in_workbench,
                "execution_status": latest_execution.status.value if latest_execution else None,
                "execution_hits": latest_execution.hits_count if latest_execution else 0
            })
    
    return {
        "article_id": article_id,
        "article_title": article.title,
        "hunt_generated_count": article.hunt_generated_count,
        "hunt_launched_count": article.hunt_launched_count,
        "last_hunt_generated_at": article.last_hunt_generated_at,
        "last_hunt_launched_at": article.last_hunt_launched_at,
        "hunts": result
    }


@router.get("/workbench")
async def get_hunt_workbench(
    status: Optional[str] = None,
    platform: Optional[str] = None,
    is_manual: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all hunts for Hunt Workbench with tracking status.
    Shows both generated and launched hunts with article context.
    """
    query = db.query(ArticleHuntTracking).filter(
        ArticleHuntTracking.is_visible_in_workbench == True
    )
    
    if status:
        if status == "generated":
            query = query.filter(ArticleHuntTracking.launch_status == None)
        elif status == "launched":
            query = query.filter(ArticleHuntTracking.launch_status != None)
    
    trackings = query.order_by(desc(ArticleHuntTracking.generated_at)).all()
    
    generated_hunts = []
    launched_hunts = []
    
    for tracking in trackings:
        hunt = tracking.hunt
        article = tracking.article
        
        if not hunt or not article:
            continue
        
        # Apply filters
        if platform and hunt.platform != platform:
            continue
        if is_manual is not None and hunt.is_manual != is_manual:
            continue
        
        # Get latest execution
        latest_execution = db.query(HuntExecution).filter(
            HuntExecution.hunt_id == hunt.id
        ).order_by(desc(HuntExecution.created_at)).first()
        
        hunt_data = {
            "tracking_id": tracking.id,
            "hunt_id": hunt.id,
            "article_id": article.id,
            "article_title": article.title,
            "article_url": article.url,
            "platform": hunt.platform,
            "title": hunt.title,
            "query_logic": hunt.query_logic,
            "is_manual": hunt.is_manual,
            "manual_notes": hunt.manual_notes,
            "generation_status": tracking.generation_status,
            "launch_status": tracking.launch_status,
            "generated_at": tracking.generated_at,
            "launched_at": tracking.launched_at,
            "generated_by": tracking.generated_by.username if tracking.generated_by else None,
            "launched_by": tracking.launched_by.username if tracking.launched_by else None,
            "execution_status": latest_execution.status.value if latest_execution else None,
            "execution_hits": latest_execution.hits_count if latest_execution else 0,
            "execution_error": latest_execution.error_message if latest_execution else None
        }
        
        if tracking.launch_status:
            launched_hunts.append(hunt_data)
        else:
            generated_hunts.append(hunt_data)
    
    return {
        "generated_hunts": generated_hunts,
        "launched_hunts": launched_hunts,
        "total_generated": len(generated_hunts),
        "total_launched": len(launched_hunts)
    }


# ============================================================================
# MANUAL HUNT CREATION
# ============================================================================

@router.get("/search-articles")
async def search_articles(
    q: str,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Search articles by title for manual hunt creation.
    """
    if not q or len(q) < 2:
        raise HTTPException(status_code=400, detail="Search query must be at least 2 characters")
    
    articles = db.query(Article).filter(
        Article.title.ilike(f"%{q}%")
    ).order_by(desc(Article.published_at)).limit(limit).all()
    
    return {
        "articles": [
            {
                "id": a.id,
                "title": a.title,
                "url": a.url,
                "published_at": a.published_at,
                "status": a.status.value,
                "hunt_generated_count": a.hunt_generated_count,
                "hunt_launched_count": a.hunt_launched_count,
                "source_name": a.feed_source.name if a.feed_source else None
            }
            for a in articles
        ],
        "total": len(articles)
    }


@router.post("/manual-create")
async def create_manual_hunt(
    hunt_data: ManualHuntCreate,
    current_user: User = Depends(require_permission("create:hunt")),
    db: Session = Depends(get_db)
):
    """
    Manually create a hunt from Hunt Workbench.
    Analyst can search for article and paste/write query manually.
    """
    # Validate article exists
    article = db.query(Article).get(hunt_data.article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    # Create hunt
    hunt = Hunt(
        article_id=hunt_data.article_id,
        platform=hunt_data.platform,
        query_logic=hunt_data.query_logic,
        title=hunt_data.title or f"Manual Hunt - {article.title[:50]}",
        initiated_by_id=current_user.id,
        initiated_by_type="USER",
        status="PENDING",
        is_manual=True,
        manual_notes=hunt_data.manual_notes,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    db.add(hunt)
    db.flush()  # Get hunt ID
    
    # Create tracking entry
    tracking = ArticleHuntTracking(
        article_id=hunt_data.article_id,
        hunt_id=hunt.id,
        generation_status="GENERATED",
        generated_at=datetime.utcnow(),
        generated_by_user_id=current_user.id,
        is_visible_in_workbench=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    db.add(tracking)
    
    # Update article counts
    article.hunt_generated_count += 1
    article.last_hunt_generated_at = datetime.utcnow()
    
    # Update article status if needed
    if article.status == "NEED_TO_HUNT":
        article.status = "HUNT_GENERATED"
    
    db.commit()
    db.refresh(hunt)
    db.refresh(tracking)
    
    logger.info(
        "manual_hunt_created",
        hunt_id=hunt.id,
        article_id=hunt_data.article_id,
        platform=hunt_data.platform,
        user_id=current_user.id
    )
    
    return {
        "message": "Manual hunt created successfully",
        "hunt_id": hunt.id,
        "tracking_id": tracking.id,
        "article_id": hunt_data.article_id,
        "platform": hunt_data.platform
    }


@router.patch("/tracking/{tracking_id}")
async def update_tracking(
    tracking_id: int,
    update_data: HuntTrackingUpdate,
    current_user: User = Depends(require_permission("manage:hunt")),
    db: Session = Depends(get_db)
):
    """Update hunt tracking status."""
    tracking = db.query(ArticleHuntTracking).get(tracking_id)
    if not tracking:
        raise HTTPException(status_code=404, detail="Tracking entry not found")
    
    if update_data.generation_status:
        tracking.generation_status = update_data.generation_status
    
    if update_data.launch_status:
        tracking.launch_status = update_data.launch_status
    
    if update_data.is_visible_in_workbench is not None:
        tracking.is_visible_in_workbench = update_data.is_visible_in_workbench
    
    tracking.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {
        "message": "Tracking updated",
        "tracking_id": tracking_id
    }
