"""Article service layer for business logic."""
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, or_, and_
from typing import List, Optional, Dict
from datetime import datetime

from app.models import (
    Article, ArticleStatus, ArticleReadStatus, Hunt, HuntExecution,
    ExtractedIntelligence, User, FeedSource
)
from app.articles.schemas import HuntStatusResponse


def mark_article_as_read(db: Session, article_id: int, user_id: int) -> bool:
    """Mark an article as read for a specific user."""
    read_status = db.query(ArticleReadStatus).filter(
        ArticleReadStatus.article_id == article_id,
        ArticleReadStatus.user_id == user_id
    ).first()
    
    if read_status:
        if not read_status.is_read:
            read_status.is_read = True
            read_status.read_at = datetime.utcnow()
            db.commit()
        return True
    else:
        read_status = ArticleReadStatus(
            article_id=article_id,
            user_id=user_id,
            is_read=True,
            read_at=datetime.utcnow()
        )
        db.add(read_status)
        db.commit()
        return True


def get_article_read_status(db: Session, article_id: int, user_id: int) -> bool:
    """Check if an article is read by a user."""
    read_status = db.query(ArticleReadStatus).filter(
        ArticleReadStatus.article_id == article_id,
        ArticleReadStatus.user_id == user_id
    ).first()
    
    return read_status.is_read if read_status else False


def get_hunt_status_for_article(db: Session, article_id: int) -> List[HuntStatusResponse]:
    """Get hunt execution status for an article."""
    hunts = db.query(Hunt).filter(Hunt.article_id == article_id).all()
    
    hunt_statuses = []
    for hunt in hunts:
        # Get the latest execution for this hunt
        latest_execution = db.query(HuntExecution).filter(
            HuntExecution.hunt_id == hunt.id
        ).order_by(desc(HuntExecution.created_at)).first()
        
        if latest_execution:
            hunt_statuses.append(HuntStatusResponse(
                hunt_id=hunt.id,
                platform=hunt.platform,
                status=latest_execution.status.value if latest_execution.status else "UNKNOWN",
                hits_count=latest_execution.hits_count or 0,
                findings_summary=latest_execution.findings_summary,
                executed_at=latest_execution.executed_at,
                execution_time_ms=latest_execution.execution_time_ms,
                email_sent=latest_execution.email_sent or False,
                servicenow_ticket_id=latest_execution.servicenow_ticket_id
            ))
    
    return hunt_statuses


def update_article_status(
    db: Session,
    article_id: int,
    status: ArticleStatus,
    user_id: int,
    genai_analysis_remarks: Optional[str] = None
) -> Article:
    """Update article status and optionally add GenAI analysis remarks."""
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        return None
    
    article.status = status
    article.reviewed_by_id = user_id
    article.reviewed_at = datetime.utcnow()
    
    if genai_analysis_remarks:
        article.genai_analysis_remarks = genai_analysis_remarks
        article.analyzed_by_id = user_id
        article.analyzed_at = datetime.utcnow()
    
    db.commit()
    db.refresh(article)
    return article


def search_articles(
    db: Session,
    query: str,
    user_id: Optional[int] = None,
    limit: int = 50
) -> List[Article]:
    """Global search across articles and feed sources."""
    search_term = f"%{query}%"
    
    # Search in article title, content, and source name
    articles = db.query(Article).options(
        joinedload(Article.feed_source)
    ).join(
        FeedSource, Article.source_id == FeedSource.id
    ).filter(
        or_(
            Article.title.ilike(search_term),
            Article.normalized_content.ilike(search_term),
            Article.summary.ilike(search_term),
            FeedSource.name.ilike(search_term),
            FeedSource.description.ilike(search_term)
        )
    ).order_by(desc(Article.created_at)).limit(limit).all()
    
    return articles


def get_articles_with_hunt_status(
    db: Session,
    user_id: int,
    status_filter: Optional[str] = None,
    read_filter: Optional[bool] = None,
    page: int = 1,
    page_size: int = 20
) -> tuple[List[Article], int]:
    """Get articles with hunt status and read/unread state."""
    query = db.query(Article).options(
        joinedload(Article.feed_source),
        joinedload(Article.hunts).joinedload(Hunt.executions)
    )
    
    if status_filter:
        query = query.filter(Article.status == status_filter)
    
    # Apply read/unread filter
    if read_filter is not None:
        if read_filter:
            # Only read articles
            query = query.join(
                ArticleReadStatus,
                and_(
                    ArticleReadStatus.article_id == Article.id,
                    ArticleReadStatus.user_id == user_id,
                    ArticleReadStatus.is_read == True
                )
            )
        else:
            # Only unread articles (no read status or is_read=False)
            query = query.outerjoin(
                ArticleReadStatus,
                and_(
                    ArticleReadStatus.article_id == Article.id,
                    ArticleReadStatus.user_id == user_id
                )
            ).filter(
                or_(
                    ArticleReadStatus.id == None,
                    ArticleReadStatus.is_read == False
                )
            )
    
    total = query.count()
    articles = query.order_by(desc(Article.created_at)).offset(
        (page - 1) * page_size
    ).limit(page_size).all()
    
    return articles, total
