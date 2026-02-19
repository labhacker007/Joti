"""User and admin analytics endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_, case, extract
from datetime import datetime, timedelta
from typing import Optional

from app.core.database import get_db
from app.auth.dependencies import get_current_user, require_permission
from app.auth.rbac import Permission
from app.models import (
    Article, ArticleStatus, ArticleReadStatus, User, UserRole,
    FeedSource, ExtractedIntelligence, ExtractedIntelligenceType
)
from app.articles.bookmarks import ArticleBookmark
from app.core.logging import logger

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _parse_time_range(time_range: str) -> Optional[datetime]:
    """Convert time range string to cutoff datetime."""
    deltas = {"24h": timedelta(hours=24), "7d": timedelta(days=7), "30d": timedelta(days=30), "90d": timedelta(days=90)}
    delta = deltas.get(time_range)
    return datetime.utcnow() - delta if delta else None


@router.get("/me")
def get_my_analytics(
    time_range: str = Query("30d", description="24h, 7d, 30d, 90d, all"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get analytics for the current user."""
    return _get_user_analytics(db, current_user.id, time_range)


@router.get("/users/{user_id}")
def get_user_analytics(
    user_id: int,
    time_range: str = Query("30d"),
    current_user: User = Depends(require_permission(Permission.USERS_MANAGE.value)),
    db: Session = Depends(get_db)
):
    """Admin: get analytics for a specific user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return _get_user_analytics(db, user_id, time_range)


@router.get("/admin/overview")
def get_admin_overview(
    time_range: str = Query("30d"),
    current_user: User = Depends(require_permission(Permission.USERS_MANAGE.value)),
    db: Session = Depends(get_db)
):
    """Admin: get platform-wide analytics overview."""
    cutoff = _parse_time_range(time_range)

    # Article stats
    article_query = db.query(Article)
    if cutoff:
        article_query = article_query.filter(Article.created_at >= cutoff)

    total_articles = article_query.count()
    total_sources = db.query(FeedSource).filter(FeedSource.is_active == True).count()

    # IOC/TTP counts
    intel_query = db.query(ExtractedIntelligence)
    if cutoff:
        intel_query = intel_query.join(Article).filter(Article.created_at >= cutoff)
    total_iocs = intel_query.filter(ExtractedIntelligence.intelligence_type == ExtractedIntelligenceType.IOC).count()
    total_ttps = intel_query.filter(ExtractedIntelligence.intelligence_type == ExtractedIntelligenceType.TTP).count()

    # Watchlist matches
    watchlist_query = db.query(Article).filter(Article.is_high_priority == True)
    if cutoff:
        watchlist_query = watchlist_query.filter(Article.created_at >= cutoff)
    watchlist_matches = watchlist_query.count()

    # Per-user read stats
    user_stats = []
    users = db.query(User).filter(User.is_active == True).all()
    for user in users:
        read_query = db.query(ArticleReadStatus).filter(
            ArticleReadStatus.user_id == user.id,
            ArticleReadStatus.is_read == True
        )
        if cutoff:
            read_query = read_query.filter(ArticleReadStatus.read_at >= cutoff)
        read_count = read_query.count()

        bookmark_count = db.query(ArticleBookmark).filter(
            ArticleBookmark.user_id == user.id,
            ArticleBookmark.is_bookmarked == True
        ).count()

        user_stats.append({
            "user_id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role.value if hasattr(user.role, 'value') else str(user.role),
            "articles_read": read_count,
            "bookmarks": bookmark_count,
        })

    # Articles by source (top 10)
    source_breakdown = db.query(
        FeedSource.name,
        func.count(Article.id).label("count")
    ).join(Article, Article.source_id == FeedSource.id)
    if cutoff:
        source_breakdown = source_breakdown.filter(Article.created_at >= cutoff)
    source_breakdown = source_breakdown.group_by(FeedSource.name).order_by(
        func.count(Article.id).desc()
    ).limit(10).all()

    # Articles by day (for chart)
    daily_counts = db.query(
        func.date(Article.created_at).label("date"),
        func.count(Article.id).label("count")
    )
    if cutoff:
        daily_counts = daily_counts.filter(Article.created_at >= cutoff)
    daily_counts = daily_counts.group_by(func.date(Article.created_at)).order_by(
        func.date(Article.created_at)
    ).all()

    # Article status breakdown
    status_breakdown = db.query(
        Article.status,
        func.count(Article.id).label("count")
    )
    if cutoff:
        status_breakdown = status_breakdown.filter(Article.created_at >= cutoff)
    status_breakdown = status_breakdown.group_by(Article.status).all()

    return {
        "data": {
            "summary": {
                "total_articles": total_articles,
                "total_sources": total_sources,
                "total_iocs": total_iocs,
                "total_ttps": total_ttps,
                "watchlist_matches": watchlist_matches,
                "total_users": len(users),
            },
            "user_stats": user_stats,
            "source_breakdown": [{"name": s[0], "count": s[1]} for s in source_breakdown],
            "daily_counts": [{"date": str(d[0]), "count": d[1]} for d in daily_counts],
            "status_breakdown": [
                {"status": s[0].value if hasattr(s[0], 'value') else str(s[0]), "count": s[1]}
                for s in status_breakdown
            ],
            "time_range": time_range,
        }
    }


@router.get("/admin/export")
def export_analytics(
    time_range: str = Query("30d"),
    start_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    user_id: Optional[int] = Query(None),
    current_user: User = Depends(require_permission(Permission.USERS_MANAGE.value)),
    db: Session = Depends(get_db)
):
    """Admin: export analytics data as JSON (for CSV conversion on frontend)."""
    # Date range
    if start_date and end_date:
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
    else:
        cutoff = _parse_time_range(time_range)
        start = cutoff or datetime(2020, 1, 1)
        end = datetime.utcnow() + timedelta(days=1)

    # Article data
    query = db.query(Article).filter(
        Article.created_at >= start,
        Article.created_at < end
    )
    articles = query.all()

    rows = []
    for a in articles:
        # Get read status per user if user_id specified
        is_read = None
        if user_id:
            rs = db.query(ArticleReadStatus).filter(
                ArticleReadStatus.article_id == a.id,
                ArticleReadStatus.user_id == user_id,
                ArticleReadStatus.is_read == True
            ).first()
            is_read = rs is not None

        ioc_count = db.query(ExtractedIntelligence).filter(
            ExtractedIntelligence.article_id == a.id,
            ExtractedIntelligence.intelligence_type == ExtractedIntelligenceType.IOC
        ).count()
        ttp_count = db.query(ExtractedIntelligence).filter(
            ExtractedIntelligence.article_id == a.id,
            ExtractedIntelligence.intelligence_type == ExtractedIntelligenceType.TTP
        ).count()

        rows.append({
            "article_id": a.id,
            "title": a.title,
            "source": a.feed_source.name if a.feed_source else "Unknown",
            "status": a.status.value if hasattr(a.status, 'value') else str(a.status),
            "published_at": a.published_at.isoformat() if a.published_at else None,
            "ingested_at": a.created_at.isoformat() if a.created_at else None,
            "is_high_priority": a.is_high_priority,
            "watchlist_keywords": ", ".join(a.watchlist_match_keywords or []),
            "ioc_count": ioc_count,
            "ttp_count": ttp_count,
            "has_summary": bool(a.executive_summary),
            "is_read": is_read,
            "url": a.url,
        })

    return {
        "data": {
            "rows": rows,
            "total": len(rows),
            "start_date": start.isoformat(),
            "end_date": end.isoformat(),
            "user_id": user_id,
        }
    }


def _get_user_analytics(db: Session, user_id: int, time_range: str) -> dict:
    """Get analytics for a specific user."""
    cutoff = _parse_time_range(time_range)

    # Total articles in system
    total_query = db.query(Article)
    if cutoff:
        total_query = total_query.filter(Article.created_at >= cutoff)
    total_articles = total_query.count()

    # Articles read by user
    read_query = db.query(ArticleReadStatus).filter(
        ArticleReadStatus.user_id == user_id,
        ArticleReadStatus.is_read == True
    )
    if cutoff:
        read_query = read_query.filter(ArticleReadStatus.read_at >= cutoff)
    articles_read = read_query.count()

    # Bookmarked articles
    bookmarked = db.query(ArticleBookmark).filter(
        ArticleBookmark.user_id == user_id,
        ArticleBookmark.is_bookmarked == True
    ).count()

    # Watchlist matches
    watchlist_query = db.query(Article).filter(Article.is_high_priority == True)
    if cutoff:
        watchlist_query = watchlist_query.filter(Article.created_at >= cutoff)
    watchlist_matches = watchlist_query.count()

    # Unread
    unread_query = db.query(Article).outerjoin(
        ArticleReadStatus,
        and_(Article.id == ArticleReadStatus.article_id, ArticleReadStatus.user_id == user_id)
    ).filter(
        or_(ArticleReadStatus.is_read == False, ArticleReadStatus.id == None)
    )
    if cutoff:
        unread_query = unread_query.filter(Article.created_at >= cutoff)
    unread = unread_query.count()

    # Reading activity by day
    daily_reads = db.query(
        func.date(ArticleReadStatus.read_at).label("date"),
        func.count(ArticleReadStatus.id).label("count")
    ).filter(
        ArticleReadStatus.user_id == user_id,
        ArticleReadStatus.is_read == True
    )
    if cutoff:
        daily_reads = daily_reads.filter(ArticleReadStatus.read_at >= cutoff)
    daily_reads = daily_reads.group_by(func.date(ArticleReadStatus.read_at)).order_by(
        func.date(ArticleReadStatus.read_at)
    ).all()

    # Top sources read
    top_sources = db.query(
        FeedSource.name,
        func.count(ArticleReadStatus.id).label("count")
    ).join(Article, Article.id == ArticleReadStatus.article_id).join(
        FeedSource, FeedSource.id == Article.source_id
    ).filter(
        ArticleReadStatus.user_id == user_id,
        ArticleReadStatus.is_read == True
    )
    if cutoff:
        top_sources = top_sources.filter(ArticleReadStatus.read_at >= cutoff)
    top_sources = top_sources.group_by(FeedSource.name).order_by(
        func.count(ArticleReadStatus.id).desc()
    ).limit(10).all()

    return {
        "data": {
            "summary": {
                "total_articles": total_articles,
                "articles_read": articles_read,
                "unread": unread,
                "bookmarked": bookmarked,
                "watchlist_matches": watchlist_matches,
                "read_percentage": round((articles_read / total_articles * 100) if total_articles > 0 else 0, 1),
            },
            "daily_reads": [{"date": str(d[0]), "count": d[1]} for d in daily_reads],
            "top_sources": [{"name": s[0], "count": s[1]} for s in top_sources],
            "time_range": time_range,
        }
    }
