"""Feed sources management APIs with synchronous ingestion."""
import asyncio
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.auth.dependencies import get_current_user, require_permission
from app.auth.rbac import Permission
from app.models import FeedSource, Article, ArticleStatus, User, WatchListKeyword, ExtractedIntelligence, ExtractedIntelligenceType
from app.ingestion.parser import FeedParser
from app.extraction.extractor import IntelligenceExtractor
from app.core.logging import logger
from pydantic import BaseModel, HttpUrl
from typing import List, Optional
from datetime import datetime
import re


def extract_image_url(entry: dict) -> Optional[str]:
    """Extract the featured image URL from a feed entry.
    
    Attempts to find an image from:
    1. media_content or media_thumbnail (RSS media extensions)
    2. enclosure links with image types
    3. First img tag in content
    4. og:image meta tag equivalent in content
    """
    # Check for media content (common in RSS feeds)
    if "media_content" in entry:
        media = entry["media_content"]
        if isinstance(media, list) and len(media) > 0:
            return media[0].get("url")
        elif isinstance(media, dict):
            return media.get("url")
    
    if "media_thumbnail" in entry:
        thumbnail = entry["media_thumbnail"]
        if isinstance(thumbnail, list) and len(thumbnail) > 0:
            return thumbnail[0].get("url")
        elif isinstance(thumbnail, dict):
            return thumbnail.get("url")
    
    # Check for enclosures (podcasts and media feeds)
    if "enclosures" in entry:
        for enc in entry.get("enclosures", []):
            if "image" in enc.get("type", ""):
                return enc.get("url")
    
    # Check raw_content for img tags
    raw_content = entry.get("raw_content", "") or entry.get("content", "") or entry.get("summary", "")
    if raw_content:
        # Find first img src
        img_match = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', raw_content, re.IGNORECASE)
        if img_match:
            img_url = img_match.group(1)
            # Skip base64 data URIs and tracking pixels
            if not img_url.startswith('data:') and 'pixel' not in img_url.lower() and 'track' not in img_url.lower():
                return img_url
    
    # Check for image field directly (some APIs provide this)
    if entry.get("image"):
        if isinstance(entry["image"], str):
            return entry["image"]
        elif isinstance(entry["image"], dict):
            return entry["image"].get("url") or entry["image"].get("href")
    
    return None


def await_or_run(coro):
    """Helper to run async coroutine in sync context."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # Create a new loop in a thread
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(asyncio.run, coro)
                return future.result(timeout=60)
        else:
            return loop.run_until_complete(coro)
    except RuntimeError:
        return asyncio.run(coro)


router = APIRouter(prefix="/sources", tags=["sources"])


class FeedSourceCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    url: HttpUrl
    feed_type: str = "rss"  # rss, atom, html
    is_active: Optional[bool] = True


class FeedSourceUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    url: Optional[HttpUrl] = None
    feed_type: Optional[str] = None
    is_active: Optional[bool] = None


class FeedSourceResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    url: str
    feed_type: str
    is_active: bool
    last_fetched: Optional[datetime] = None
    next_fetch: Optional[datetime] = None
    fetch_error: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    # Article statistics
    article_count: int = 0
    new_articles: int = 0
    reviewed_articles: int = 0
    
    class Config:
        from_attributes = True


class IngestionResult(BaseModel):
    source_id: int
    source_name: str
    new_articles: int
    duplicates: int
    high_priority: int
    status: str
    error: Optional[str] = None


def get_source_with_stats(db: Session, source: FeedSource) -> FeedSourceResponse:
    """Get source with article statistics."""
    # Count articles by status
    total = db.query(func.count(Article.id)).filter(Article.source_id == source.id).scalar() or 0
    new = db.query(func.count(Article.id)).filter(
        Article.source_id == source.id,
        Article.status == ArticleStatus.NEW
    ).scalar() or 0
    reviewed = db.query(func.count(Article.id)).filter(
        Article.source_id == source.id,
        Article.status == ArticleStatus.REVIEWED
    ).scalar() or 0
    
    return FeedSourceResponse(
        id=source.id,
        name=source.name,
        description=source.description,
        url=source.url,
        feed_type=source.feed_type,
        is_active=source.is_active,
        last_fetched=source.last_fetched,
        next_fetch=source.next_fetch,
        fetch_error=source.fetch_error,
        created_at=source.created_at,
        updated_at=source.updated_at,
        article_count=total,
        new_articles=new,
        reviewed_articles=reviewed
    )


def ingest_source_sync(db: Session, source: FeedSource) -> dict:
    """Alias for ingest_feed_sync that returns a dict for scheduler compatibility."""
    result = ingest_feed_sync(db, source)
    return {
        "new_articles": result.new_articles,
        "duplicates": result.duplicates,
        "high_priority": result.high_priority,
        "status": result.status,
        "error": result.error
    }


def ingest_feed_sync(db: Session, source: FeedSource) -> IngestionResult:
    """Synchronously ingest articles from a feed source."""
    try:
        logger.info("ingesting_feed", source_id=source.id, url=source.url)
        
        # Parse feed
        feed = FeedParser.parse_feed(source.url)
        entries = FeedParser.extract_entries(feed)
        
        # Get watchlist keywords
        keywords = db.query(WatchListKeyword).filter(WatchListKeyword.is_active == True).all()
        keyword_list = [kw.keyword.lower() for kw in keywords]
        
        # Initialize duplicate checker
        from app.articles.duplicate_checker import DuplicateChecker
        duplicate_checker = DuplicateChecker(db)
        
        # Store articles
        article_count = 0
        duplicate_count = 0
        high_priority_count = 0
        
        for entry in entries:
            # Check for exact duplicates by external_id
            existing = db.query(Article).filter(
                Article.source_id == source.id,
                Article.external_id == entry["external_id"]
            ).first()
            
            if existing:
                duplicate_count += 1
                logger.debug("skipping_existing_article", external_id=entry["external_id"])
                continue
            
            # Check for content-based duplicates using GenAI/heuristics
            try:
                duplicate_result = duplicate_checker.check_duplicate(
                    title=entry["title"],
                    content=entry.get("raw_content", "") or entry.get("summary", ""),
                    url=entry.get("url"),
                    published_at=entry.get("published_at")
                )
                
                if duplicate_result["is_duplicate"] and duplicate_result["confidence"] >= 0.85:
                    duplicate_count += 1
                    logger.info(
                        "duplicate_detected_skipping",
                        title=entry["title"][:50],
                        confidence=duplicate_result["confidence"],
                        reasoning=duplicate_result["reasoning"]
                    )
                    continue
            except Exception as dup_err:
                logger.warning("duplicate_check_failed", error=str(dup_err))
                # Continue with ingestion if duplicate check fails
            
            # Check if matches watchlist
            content = (entry.get("title", "") + " " + entry.get("summary", "")).lower()
            matched_keywords = [kw for kw in keyword_list if kw in content]
            is_high_priority = len(matched_keywords) > 0
            
            if is_high_priority:
                high_priority_count += 1
            
            # Extract image URL from content
            image_url = extract_image_url(entry)
            
            # Create article
            article = Article(
                source_id=source.id,
                external_id=entry["external_id"],
                title=entry["title"],
                raw_content=entry.get("raw_content", ""),
                normalized_content=FeedParser.normalize_content(entry.get("raw_content", "")),
                summary=entry.get("summary", ""),
                url=entry.get("url", ""),
                image_url=image_url,
                published_at=entry.get("published_at"),
                status=ArticleStatus.NEW,
                is_high_priority=is_high_priority,
                watchlist_match_keywords=matched_keywords if matched_keywords else []
            )
            
            db.add(article)
            db.flush()  # Get article ID for extraction
            
            # Auto-extract IOCs, TTPs, IOAs at ingestion time using GenAI (Ollama)
            try:
                extraction_text = f"{entry['title']}\n\n{entry.get('summary', '')}\n\n{entry.get('raw_content', '')}"
                source_url = entry.get("url") or source.url
                
                # Use GenAI extraction (Ollama) for intelligent extraction
                # Falls back to regex if GenAI fails
                try:
                    extracted = asyncio.get_event_loop().run_until_complete(
                        IntelligenceExtractor.extract_with_genai(extraction_text, source_url=source_url)
                    )
                    extraction_method = "genai"
                except RuntimeError:
                    # If no event loop, create one
                    extracted = asyncio.run(
                        IntelligenceExtractor.extract_with_genai(extraction_text, source_url=source_url)
                    )
                    extraction_method = "genai"
                except Exception as genai_err:
                    logger.warning("genai_extraction_fallback", article_id=article.id, error=str(genai_err))
                    extracted = IntelligenceExtractor.extract_all(extraction_text, source_url=source_url)
                    extraction_method = "regex"
                
                # Save extracted IOCs (skip entries with no value)
                for ioc in extracted.get("iocs", []):
                    ioc_value = ioc.get("value")
                    if not ioc_value:  # Skip if value is None or empty
                        continue
                    intel = ExtractedIntelligence(
                        article_id=article.id,
                        intelligence_type=ExtractedIntelligenceType.IOC,
                        value=ioc_value,
                        confidence=ioc.get("confidence", 85),
                        evidence=ioc.get("evidence"),
                        meta={"type": ioc.get("type"), "source": extraction_method}
                    )
                    db.add(intel)
                
                # Save extracted TTPs (skip entries with no name/value)
                for ttp in extracted.get("ttps", []):
                    ttp_value = ttp.get("name") or ttp.get("value") or ttp.get("mitre_id")
                    if not ttp_value:  # Skip if no identifiable value
                        continue
                    intel = ExtractedIntelligence(
                        article_id=article.id,
                        intelligence_type=ExtractedIntelligenceType.TTP,
                        value=ttp_value,
                        mitre_id=ttp.get("mitre_id"),
                        confidence=ttp.get("confidence", 85),
                        evidence=ttp.get("evidence"),
                        meta={"source": extraction_method}
                    )
                    db.add(intel)
                
                # Save extracted IOAs (skip entries with no value)
                for ioa in extracted.get("ioas", []):
                    ioa_value = ioa.get("value")
                    if not ioa_value:  # Skip if value is None or empty
                        continue
                    intel = ExtractedIntelligence(
                        article_id=article.id,
                        intelligence_type=ExtractedIntelligenceType.IOA,
                        value=ioa_value,
                        confidence=ioa.get("confidence", 80),
                        evidence=str(ioa.get("evidence", "")),
                        meta={"category": ioa.get("category"), "type": ioa.get("type"), "source": extraction_method}
                    )
                    db.add(intel)
                
                # Save ATLAS techniques (skip entries with no name/value)
                for atlas in extracted.get("atlas", []):
                    atlas_value = atlas.get("name") or atlas.get("value") or atlas.get("mitre_id")
                    if not atlas_value:  # Skip if no identifiable value
                        continue
                    intel = ExtractedIntelligence(
                        article_id=article.id,
                        intelligence_type=ExtractedIntelligenceType.ATLAS,
                        value=atlas_value,
                        mitre_id=atlas.get("mitre_id"),
                        confidence=atlas.get("confidence", 70),
                        meta={"framework": "ATLAS", "source": extraction_method}
                    )
                    db.add(intel)
                    
                logger.info("auto_extraction_complete", 
                           article_id=article.id,
                           method=extraction_method,
                           iocs=len(extracted.get("iocs", [])),
                           ttps=len(extracted.get("ttps", [])),
                           ioas=len(extracted.get("ioas", [])),
                           atlas=len(extracted.get("atlas", [])))
                
                # Auto-summarize using GenAI
                try:
                    from app.genai.provider import get_model_manager
                    
                    model_manager = get_model_manager()
                    content_for_summary = f"{entry['title']}\n\n{entry.get('summary', '')}\n\n{entry.get('raw_content', '')[:4000]}"
                    
                    # Generate executive summary
                    exec_result = await_or_run(
                        model_manager.generate_with_fallback(
                            system_prompt="""You are a threat intelligence analyst. Write a 2-3 sentence executive summary for C-level executives. Focus on business impact and key threats. Be concise.""",
                            user_prompt=f"Summarize this threat intelligence article:\n\n{content_for_summary[:2000]}"
                        )
                    )
                    article.executive_summary = exec_result.get("response", "")[:1000]
                    
                    # Generate technical summary
                    tech_result = await_or_run(
                        model_manager.generate_with_fallback(
                            system_prompt="""You are a senior SOC analyst. Write a technical summary with key IOCs, TTPs, and detection opportunities. Be specific and actionable.""",
                            user_prompt=f"Write a technical summary for SOC analysts:\n\nIOCs found: {len(extracted.get('iocs', []))}\nTTPs: {[t.get('mitre_id') for t in extracted.get('ttps', [])[:5]]}\n\nArticle:\n{content_for_summary[:2500]}"
                        )
                    )
                    article.technical_summary = tech_result.get("response", "")[:2000]
                    article.genai_analysis_remarks = f"Auto-summarized at ingestion using {exec_result.get('model_used', 'unknown')}"
                    
                    logger.info("auto_summarization_complete", article_id=article.id, model=exec_result.get("model_used"))
                except Exception as sum_err:
                    logger.warning("auto_summarization_failed", article_id=article.id, error=str(sum_err))
                    
            except Exception as ex:
                logger.warning("auto_extraction_failed", article_id=article.id, error=str(ex))
            
            article_count += 1
        
        # Update source
        source.last_fetched = datetime.utcnow()
        source.fetch_error = None
        
        db.commit()
        
        logger.info(
            "feed_ingestion_complete",
            source_id=source.id,
            new_articles=article_count,
            duplicates=duplicate_count,
            high_priority=high_priority_count
        )
        
        return IngestionResult(
            source_id=source.id,
            source_name=source.name,
            new_articles=article_count,
            duplicates=duplicate_count,
            high_priority=high_priority_count,
            status="success"
        )
        
    except Exception as e:
        logger.error("feed_ingestion_failed", source_id=source.id, error=str(e))
        source.fetch_error = str(e)
        db.commit()
        
        return IngestionResult(
            source_id=source.id,
            source_name=source.name,
            new_articles=0,
            duplicates=0,
            high_priority=0,
            status="error",
            error=str(e)
        )


@router.post("/", response_model=FeedSourceResponse)
def create_feed_source(
    request: FeedSourceCreateRequest,
    current_user: User = Depends(require_permission(Permission.MANAGE_SOURCES.value)),
    db: Session = Depends(get_db)
):
    """Create a new feed source."""
    # Check if source already exists
    existing = db.query(FeedSource).filter(FeedSource.url == str(request.url)).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Feed source URL already registered")
    
    source = FeedSource(
        name=request.name,
        description=request.description,
        url=str(request.url),
        feed_type=request.feed_type,
        is_active=request.is_active if request.is_active is not None else True
    )
    
    db.add(source)
    db.commit()
    db.refresh(source)
    
    logger.info("feed_source_created", source_id=source.id, url=source.url, user_id=current_user.id)
    
    return get_source_with_stats(db, source)


@router.get("/", response_model=List[FeedSourceResponse])
def list_feed_sources(
    current_user: User = Depends(require_permission(Permission.READ_SOURCES.value)),
    db: Session = Depends(get_db)
):
    """List all feed sources with article statistics."""
    sources = db.query(FeedSource).all()
    return [get_source_with_stats(db, s) for s in sources]


@router.get("/{source_id}", response_model=FeedSourceResponse)
def get_feed_source(
    source_id: int,
    current_user: User = Depends(require_permission(Permission.READ_SOURCES.value)),
    db: Session = Depends(get_db)
):
    """Get a specific feed source with statistics."""
    source = db.query(FeedSource).filter(FeedSource.id == source_id).first()
    if not source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feed source not found")
    
    return get_source_with_stats(db, source)


@router.patch("/{source_id}", response_model=FeedSourceResponse)
def update_feed_source(
    source_id: int,
    request: FeedSourceUpdateRequest,
    current_user: User = Depends(require_permission(Permission.MANAGE_SOURCES.value)),
    db: Session = Depends(get_db)
):
    """Update a feed source."""
    source = db.query(FeedSource).filter(FeedSource.id == source_id).first()
    if not source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feed source not found")
    
    if request.name is not None:
        source.name = request.name
    if request.description is not None:
        source.description = request.description
    if request.url is not None:
        source.url = str(request.url)
    if request.feed_type is not None:
        source.feed_type = request.feed_type
    if request.is_active is not None:
        source.is_active = request.is_active
    
    db.commit()
    db.refresh(source)
    
    logger.info("feed_source_updated", source_id=source_id, user_id=current_user.id)
    
    return get_source_with_stats(db, source)


@router.delete("/{source_id}")
def delete_feed_source(
    source_id: int,
    delete_articles: bool = False,
    current_user: User = Depends(require_permission(Permission.MANAGE_SOURCES.value)),
    db: Session = Depends(get_db)
):
    """Delete a feed source and optionally its articles."""
    source = db.query(FeedSource).filter(FeedSource.id == source_id).first()
    if not source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feed source not found")
    
    # Count associated articles
    article_count = db.query(Article).filter(Article.source_id == source_id).count()
    
    if delete_articles:
        # Delete all associated articles first
        db.query(Article).filter(Article.source_id == source_id).delete()
        logger.info("articles_deleted_with_source", source_id=source_id, count=article_count)
    elif article_count > 0:
        # Set articles to have no source instead of deleting
        db.query(Article).filter(Article.source_id == source_id).update({"source_id": None})
    
    db.delete(source)
    db.commit()
    
    logger.info("feed_source_deleted", source_id=source_id, user_id=current_user.id, articles_deleted=delete_articles)
    
    return {"message": f"Feed source deleted. {article_count} articles {'deleted' if delete_articles else 'orphaned'}."}


@router.post("/{source_id}/ingest", response_model=IngestionResult)
def trigger_feed_ingestion(
    source_id: int,
    current_user: User = Depends(require_permission(Permission.MANAGE_SOURCES.value)),
    db: Session = Depends(get_db)
):
    """Trigger immediate ingestion for a feed source (synchronous)."""
    source = db.query(FeedSource).filter(FeedSource.id == source_id).first()
    if not source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feed source not found")
    
    if not source.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Feed source is not active")
    
    logger.info("feed_ingestion_triggered", source_id=source_id, user_id=current_user.id)
    
    # Run ingestion synchronously
    result = ingest_feed_sync(db, source)
    
    return result


@router.post("/ingest-all")
def trigger_all_ingestion(
    current_user: User = Depends(require_permission(Permission.MANAGE_SOURCES.value)),
    db: Session = Depends(get_db)
):
    """Trigger ingestion for all active feed sources."""
    sources = db.query(FeedSource).filter(FeedSource.is_active == True).all()
    
    if not sources:
        return {"message": "No active sources to ingest", "results": []}
    
    results = []
    total_articles = 0
    total_high_priority = 0
    
    for source in sources:
        result = ingest_feed_sync(db, source)
        results.append(result)
        total_articles += result.new_articles
        total_high_priority += result.high_priority
    
    logger.info(
        "all_sources_ingestion_complete",
        sources_count=len(sources),
        total_new_articles=total_articles,
        total_high_priority=total_high_priority,
        user_id=current_user.id
    )
    
    return {
        "message": f"Ingested {len(sources)} sources",
        "total_new_articles": total_articles,
        "total_high_priority": total_high_priority,
        "results": [r.model_dump() for r in results]
    }


@router.get("/stats/summary")
def get_sources_summary(
    time_range: Optional[str] = None,  # e.g., "24h", "7d", "30d", "all"
    current_user: User = Depends(require_permission(Permission.READ_SOURCES.value)),
    db: Session = Depends(get_db)
):
    """Get summary statistics for all sources with optional time filtering."""
    from datetime import timedelta
    
    # Calculate start date based on time_range
    start_date = None
    if time_range and time_range != "all":
        now = datetime.utcnow()
        if time_range == "1h":
            start_date = now - timedelta(hours=1)
        elif time_range == "6h":
            start_date = now - timedelta(hours=6)
        elif time_range == "12h":
            start_date = now - timedelta(hours=12)
        elif time_range in ["24h", "1d"]:
            start_date = now - timedelta(hours=24)
        elif time_range == "7d":
            start_date = now - timedelta(days=7)
        elif time_range == "30d":
            start_date = now - timedelta(days=30)
        elif time_range == "90d":
            start_date = now - timedelta(days=90)
    
    # Sources don't change based on time, always show total
    total_sources = db.query(func.count(FeedSource.id)).scalar() or 0
    active_sources = db.query(func.count(FeedSource.id)).filter(FeedSource.is_active == True).scalar() or 0
    
    # Filter articles by time range
    article_query = db.query(Article)
    if start_date:
        article_query = article_query.filter(Article.created_at >= start_date)
    
    total_articles = article_query.count()
    new_articles = article_query.filter(Article.status == ArticleStatus.NEW).count()
    reviewed_articles = article_query.filter(Article.status == ArticleStatus.REVIEWED).count()
    high_priority = article_query.filter(Article.is_high_priority == True).count()
    
    return {
        "total_sources": total_sources,
        "active_sources": active_sources,
        "total_articles": total_articles,
        "new_articles": new_articles,
        "reviewed_articles": reviewed_articles,
        "high_priority_articles": high_priority,
        "time_range": time_range or "all"
    }
