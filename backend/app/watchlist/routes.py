"""Watchlist keyword management APIs."""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.auth.dependencies import require_permission
from app.auth.rbac import Permission
from app.models import WatchListKeyword, UserWatchListKeyword, User, Article
from app.auth.dependencies import get_current_user
from app.core.logging import logger
from app.audit.manager import AuditManager
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

router = APIRouter(prefix="/watchlist", tags=["watchlist"])


def reapply_watchlist_to_articles(db: Session):
    """Re-apply active watchlist keywords to all articles.

    - Articles matching ACTIVE keywords are marked high priority
    - Articles that only matched NOW-INACTIVE keywords are unmarked
    - Uses batched streaming to avoid loading all articles into memory
    """
    # Get all active keywords
    active_keywords = db.query(WatchListKeyword).filter(WatchListKeyword.is_active == True).all()
    active_keyword_list = [kw.keyword.lower() for kw in active_keywords]

    # Stream articles in batches to avoid memory exhaustion
    _BATCH_SIZE = 500
    updated_count = 0

    query = db.query(Article).yield_per(_BATCH_SIZE)
    for article in query:
        content = ((article.title or "") + " " + (article.summary or "")).lower()

        # Check which active keywords match
        matched = [kw for kw in active_keyword_list if kw in content]

        # Update article based on current active matches
        new_priority = len(matched) > 0

        if article.is_high_priority != new_priority or article.watchlist_match_keywords != matched:
            article.is_high_priority = new_priority
            article.watchlist_match_keywords = matched if matched else []
            updated_count += 1

    db.commit()
    logger.info("watchlist_reapplied", updated_articles=updated_count, active_keywords=len(active_keyword_list))
    return updated_count


WATCHLIST_CATEGORIES = [
    "TTP", "Threat Actor", "Attack Type", "Vulnerability", "Malware",
    "APT Group", "Campaign", "CVE", "Exploit", "Ransomware",
    "C2 Infrastructure", "Phishing", "Data Exfiltration", "Insider Threat",
    "Supply Chain", "Zero Day", "Compliance", "Executive Risk",
    "Industry Sector", "Custom",
]


class WatchlistKeywordCreate(BaseModel):
    keyword: str
    category: Optional[str] = None


class WatchlistKeywordUpdate(BaseModel):
    is_active: Optional[bool] = None
    category: Optional[str] = None


class WatchlistKeywordResponse(BaseModel):
    id: int
    keyword: str
    category: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


@router.get("/", response_model=list[WatchlistKeywordResponse])
def list_keywords(
    current_user: User = Depends(require_permission(Permission.READ_ARTICLES.value)),
    db: Session = Depends(get_db)
):
    """List all watchlist keywords."""
    keywords = db.query(WatchListKeyword).order_by(WatchListKeyword.keyword).all()
    return [WatchlistKeywordResponse.model_validate(k) for k in keywords]


@router.post("/", response_model=WatchlistKeywordResponse, status_code=status.HTTP_201_CREATED)
def create_keyword(
    payload: WatchlistKeywordCreate,
    current_user: User = Depends(require_permission(Permission.MANAGE_WATCHLISTS.value)),
    db: Session = Depends(get_db)
):
    """Add a new keyword to the watchlist. Immediately applies to all articles."""
    # Check if keyword already exists
    existing = db.query(WatchListKeyword).filter(
        WatchListKeyword.keyword.ilike(payload.keyword)
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Keyword already exists in watchlist"
        )
    
    keyword = WatchListKeyword(
        keyword=payload.keyword.strip(),
        category=payload.category,
        is_active=True
    )
    
    db.add(keyword)
    db.commit()
    db.refresh(keyword)
    
    # Re-apply watchlist to all articles (marks new matches as high priority)
    updated_count = reapply_watchlist_to_articles(db)
    
    logger.info("watchlist_keyword_added", keyword=keyword.keyword, user_id=current_user.id, articles_updated=updated_count)

    AuditManager.log_event(
        db=db,
        user_id=current_user.id,
        event_type="WATCHLIST_CHANGE",
        action=f"Keyword added: {keyword.keyword}",
        resource_type="watchlist_keyword",
        resource_id=keyword.id,
        details={"keyword": keyword.keyword, "category": keyword.category, "articles_updated": updated_count}
    )

    return WatchlistKeywordResponse.model_validate(keyword)


@router.patch("/{keyword_id}", response_model=WatchlistKeywordResponse)
def update_keyword(
    keyword_id: int,
    update: WatchlistKeywordUpdate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_permission(Permission.MANAGE_WATCHLISTS.value)),
    db: Session = Depends(get_db)
):
    """Update a watchlist keyword (toggle active status). Re-applies to all articles."""
    keyword = db.query(WatchListKeyword).filter(WatchListKeyword.id == keyword_id).first()
    
    if not keyword:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Keyword not found"
        )
    
    if update.is_active is not None:
        keyword.is_active = update.is_active
    if update.category is not None:
        keyword.category = update.category

    db.commit()
    db.refresh(keyword)
    
    # Re-apply watchlist to all articles (marks/unmarks high priority)
    updated_count = reapply_watchlist_to_articles(db)
    
    logger.info("watchlist_keyword_updated", keyword_id=keyword_id, is_active=keyword.is_active, articles_updated=updated_count)

    AuditManager.log_event(
        db=db,
        user_id=current_user.id,
        event_type="WATCHLIST_CHANGE",
        action=f"Keyword updated: {keyword.keyword}",
        resource_type="watchlist_keyword",
        resource_id=keyword.id,
        details={"is_active": keyword.is_active, "articles_updated": updated_count}
    )

    return WatchlistKeywordResponse.model_validate(keyword)


@router.delete("/{keyword_id}")
def delete_keyword(
    keyword_id: int,
    current_user: User = Depends(require_permission(Permission.MANAGE_WATCHLISTS.value)),
    db: Session = Depends(get_db)
):
    """Remove a keyword from the watchlist. Updates affected articles."""
    keyword = db.query(WatchListKeyword).filter(WatchListKeyword.id == keyword_id).first()
    
    if not keyword:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Keyword not found"
        )
    
    deleted_keyword = keyword.keyword
    db.delete(keyword)
    db.commit()
    
    # Re-apply watchlist to all articles (removes this keyword from matches)
    updated_count = reapply_watchlist_to_articles(db)
    
    logger.info("watchlist_keyword_deleted", keyword_id=keyword_id, user_id=current_user.id, articles_updated=updated_count)

    AuditManager.log_event(
        db=db,
        user_id=current_user.id,
        event_type="WATCHLIST_CHANGE",
        action=f"Keyword deleted: {deleted_keyword}",
        resource_type="watchlist_keyword",
        resource_id=keyword_id,
        details={"keyword": deleted_keyword, "articles_updated": updated_count}
    )

    return {"message": f"Keyword '{deleted_keyword}' removed from watchlist", "articles_updated": updated_count}


@router.post("/refresh")
def refresh_watchlist_matches(
    current_user: User = Depends(require_permission(Permission.MANAGE_WATCHLISTS.value)),
    db: Session = Depends(get_db)
):
    """Manually refresh watchlist matches for all articles.
    
    Re-evaluates all articles against active watchlist keywords.
    Use this after bulk keyword changes.
    """
    updated_count = reapply_watchlist_to_articles(db)
    
    # Get counts
    active_keywords = db.query(WatchListKeyword).filter(WatchListKeyword.is_active == True).count()
    high_priority = db.query(Article).filter(Article.is_high_priority == True).count()
    
    logger.info("watchlist_manual_refresh", user_id=current_user.id, articles_updated=updated_count)
    
    return {
        "message": "Watchlist matches refreshed",
        "articles_updated": updated_count,
        "active_keywords": active_keywords,
        "high_priority_articles": high_priority
    }


@router.get("/categories")
def list_categories(
    current_user: User = Depends(require_permission(Permission.READ_ARTICLES.value)),
    db: Session = Depends(get_db)
):
    """List predefined and in-use categories for watchlist keywords."""
    in_use = db.query(WatchListKeyword.category).filter(
        WatchListKeyword.category != None
    ).distinct().all()
    in_use_cats = {r[0] for r in in_use if r[0]}
    all_cats = set(WATCHLIST_CATEGORIES) | in_use_cats
    return sorted(all_cats)


# ============================================================================
# User-scoped personal watchlist endpoints
# ============================================================================

class UserWatchlistKeywordResponse(BaseModel):
    id: int
    keyword: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


@router.get("/mine", response_model=list[UserWatchlistKeywordResponse])
def list_my_keywords(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List current user's personal watchlist keywords."""
    keywords = db.query(UserWatchListKeyword).filter(
        UserWatchListKeyword.user_id == current_user.id
    ).order_by(UserWatchListKeyword.keyword).all()
    return [UserWatchlistKeywordResponse.model_validate(k) for k in keywords]


@router.post("/mine", response_model=UserWatchlistKeywordResponse, status_code=status.HTTP_201_CREATED)
def create_my_keyword(
    payload: WatchlistKeywordCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a personal watchlist keyword (private to current user)."""
    existing = db.query(UserWatchListKeyword).filter(
        UserWatchListKeyword.user_id == current_user.id,
        UserWatchListKeyword.keyword.ilike(payload.keyword)
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have this keyword in your personal watchlist"
        )

    keyword = UserWatchListKeyword(
        user_id=current_user.id,
        keyword=payload.keyword.strip(),
        is_active=True
    )
    db.add(keyword)
    db.commit()
    db.refresh(keyword)

    AuditManager.log_event(
        db=db,
        user_id=current_user.id,
        event_type="WATCHLIST_CHANGE",
        action=f"Personal keyword added: {keyword.keyword}",
        resource_type="user_watchlist_keyword",
        resource_id=keyword.id,
    )

    return UserWatchlistKeywordResponse.model_validate(keyword)


@router.delete("/mine/{keyword_id}")
def delete_my_keyword(
    keyword_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a personal watchlist keyword."""
    keyword = db.query(UserWatchListKeyword).filter(
        UserWatchListKeyword.id == keyword_id,
        UserWatchListKeyword.user_id == current_user.id
    ).first()

    if not keyword:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Keyword not found")

    deleted_keyword = keyword.keyword
    db.delete(keyword)
    db.commit()

    AuditManager.log_event(
        db=db,
        user_id=current_user.id,
        event_type="WATCHLIST_CHANGE",
        action=f"Personal keyword deleted: {deleted_keyword}",
        resource_type="user_watchlist_keyword",
        resource_id=keyword_id,
    )

    return {"message": f"Personal keyword '{deleted_keyword}' removed"}


@router.patch("/mine/{keyword_id}", response_model=UserWatchlistKeywordResponse)
def toggle_my_keyword(
    keyword_id: int,
    update: WatchlistKeywordUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Toggle a personal watchlist keyword's active status."""
    keyword = db.query(UserWatchListKeyword).filter(
        UserWatchListKeyword.id == keyword_id,
        UserWatchListKeyword.user_id == current_user.id
    ).first()

    if not keyword:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Keyword not found")

    if update.is_active is not None:
        keyword.is_active = update.is_active

    db.commit()
    db.refresh(keyword)

    return UserWatchlistKeywordResponse.model_validate(keyword)
