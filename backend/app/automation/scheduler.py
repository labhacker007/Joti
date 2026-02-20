"""
Automation scheduler for feed ingestion and intelligence extraction.
Runs background jobs at configured intervals using a thread-based approach.
"""
import threading
import time
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Callable

logger = logging.getLogger(__name__)


class JobHistory:
    """Simple circular buffer for job run history."""
    def __init__(self, max_entries: int = 100):
        self._entries: List[Dict] = []
        self._max = max_entries

    def add(self, job_id: str, status: str, message: str = "", duration_ms: int = 0):
        self._entries.append({
            "job_id": job_id,
            "status": status,
            "message": message,
            "duration_ms": duration_ms,
            "run_at": datetime.utcnow().isoformat(),
        })
        if len(self._entries) > self._max:
            self._entries = self._entries[-self._max:]

    def get_recent(self, job_id: Optional[str] = None, limit: int = 20) -> List[Dict]:
        entries = self._entries if not job_id else [e for e in self._entries if e["job_id"] == job_id]
        return list(reversed(entries[-limit:]))


class ScheduledJob:
    """A recurring job with interval-based scheduling."""
    def __init__(
        self,
        job_id: str,
        func: Callable,
        interval_seconds: int,
        description: str = "",
        run_on_start: bool = False,
    ):
        self.job_id = job_id
        self.func = func
        self.interval_seconds = interval_seconds
        self.description = description
        self.run_on_start = run_on_start
        self.last_run: Optional[datetime] = None
        self.next_run: Optional[datetime] = None
        self.last_status: str = "pending"
        self.last_message: str = ""
        self.run_count: int = 0
        self.enabled: bool = True

        if run_on_start:
            self.next_run = datetime.utcnow()
        else:
            self.next_run = datetime.utcnow() + timedelta(seconds=interval_seconds)

    def is_due(self) -> bool:
        if not self.enabled:
            return False
        return self.next_run is not None and datetime.utcnow() >= self.next_run

    def mark_run(self, status: str, message: str = ""):
        self.last_run = datetime.utcnow()
        self.next_run = datetime.utcnow() + timedelta(seconds=self.interval_seconds)
        self.last_status = status
        self.last_message = message
        self.run_count += 1

    def to_dict(self) -> Dict:
        return {
            "job_id": self.job_id,
            "description": self.description,
            "interval_seconds": self.interval_seconds,
            "enabled": self.enabled,
            "last_run": self.last_run.isoformat() if self.last_run else None,
            "next_run": self.next_run.isoformat() if self.next_run else None,
            "last_status": self.last_status,
            "last_message": self.last_message,
            "run_count": self.run_count,
        }


class FeedScheduler:
    """
    Background scheduler for automated feed ingestion and intelligence extraction.
    Uses a single daemon thread with a polling loop.
    """

    def __init__(self):
        self._jobs: Dict[str, ScheduledJob] = {}
        self._history = JobHistory(max_entries=200)
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._running = False
        self._poll_interval = 30  # Check jobs every 30 seconds

    def add_job(self, job_id: str, func: Callable, interval_seconds: int,
                description: str = "", run_on_start: bool = False, **kwargs):
        """Register a recurring job."""
        job = ScheduledJob(
            job_id=job_id,
            func=func,
            interval_seconds=interval_seconds,
            description=description,
            run_on_start=run_on_start,
        )
        self._jobs[job_id] = job
        logger.info(f"Scheduled job registered: {job_id} every {interval_seconds}s")

    def update_interval(self, job_id: str, new_interval_seconds: int) -> bool:
        """Update the interval of an existing job. Takes effect on next scheduled run."""
        job = self._jobs.get(job_id)
        if not job:
            return False
        job.interval_seconds = new_interval_seconds
        # Reschedule next run from now
        job.next_run = datetime.utcnow() + timedelta(seconds=new_interval_seconds)
        logger.info(f"Job interval updated: {job_id} → {new_interval_seconds}s")
        return True

    def set_enabled(self, job_id: str, enabled: bool) -> bool:
        """Enable or disable a job."""
        job = self._jobs.get(job_id)
        if not job:
            return False
        job.enabled = enabled
        if enabled and job.next_run is None:
            job.next_run = datetime.utcnow() + timedelta(seconds=job.interval_seconds)
        logger.info(f"Job {'enabled' if enabled else 'disabled'}: {job_id}")
        return True

    def remove_job(self, job_id: str):
        """Remove a job from the scheduler."""
        self._jobs.pop(job_id, None)

    def get_jobs(self) -> List[Dict]:
        """Get all registered jobs as dicts."""
        return [job.to_dict() for job in self._jobs.values()]

    def get_job(self, job_id: str) -> Optional[ScheduledJob]:
        return self._jobs.get(job_id)

    def get_job_history(self, job_id: Optional[str] = None) -> List[Dict]:
        return self._history.get_recent(job_id=job_id)

    def run_job_now(self, job_id: str, triggered_by: str = "manual") -> bool:
        """Immediately run a job outside its normal schedule."""
        job = self._jobs.get(job_id)
        if not job:
            return False
        threading.Thread(
            target=self._execute_job,
            args=(job, triggered_by),
            daemon=True,
        ).start()
        return True

    def start(self):
        """Start the scheduler background thread."""
        if self._running:
            return
        self._stop_event.clear()
        self._running = True
        self._thread = threading.Thread(
            target=self._run_loop,
            daemon=True,
            name="FeedScheduler",
        )
        self._thread.start()
        logger.info("FeedScheduler started")

    def shutdown(self):
        """Stop the scheduler."""
        self._stop_event.set()
        self._running = False
        if self._thread:
            self._thread.join(timeout=5)
        logger.info("FeedScheduler stopped")

    def _run_loop(self):
        """Main loop: check each job and execute if due."""
        while not self._stop_event.is_set():
            for job in list(self._jobs.values()):
                if job.is_due():
                    self._execute_job(job)
            self._stop_event.wait(timeout=self._poll_interval)

    def _execute_job(self, job: ScheduledJob, triggered_by: str = "scheduler"):
        """Execute a single job and record result."""
        start = datetime.utcnow()
        try:
            logger.info(f"Running job: {job.job_id} (triggered_by={triggered_by})")
            result = job.func()
            duration = int((datetime.utcnow() - start).total_seconds() * 1000)
            msg = str(result) if result else "ok"
            job.mark_run("success", msg[:200])
            self._history.add(job.job_id, "success", msg[:200], duration)
            logger.info(f"Job completed: {job.job_id} in {duration}ms")
        except Exception as e:
            duration = int((datetime.utcnow() - start).total_seconds() * 1000)
            error_msg = str(e)[:200]
            job.mark_run("error", error_msg)
            self._history.add(job.job_id, "error", error_msg, duration)
            logger.error(f"Job failed: {job.job_id} — {error_msg}")


# ─────────────────────────────────────────────
# Job functions
# ─────────────────────────────────────────────

def run_feed_ingestion() -> str:
    """Ingest all active feed sources and auto-extract intelligence."""
    from app.core.database import SessionLocal
    from app.models import FeedSource
    from app.integrations.sources import ingest_feed_sync

    db = SessionLocal()
    try:
        sources = db.query(FeedSource).filter(
            FeedSource.is_active == True,
            FeedSource.enabled == True,
        ).all()

        total_new = 0
        errors = 0
        for source in sources:
            try:
                result = ingest_feed_sync(db, source)
                total_new += getattr(result, 'new_articles', 0) or 0
            except Exception as e:
                errors += 1
                logger.warning(f"Ingestion failed for {source.name}: {e}")

        return f"Ingested {len(sources)} sources: {total_new} new articles, {errors} errors"
    finally:
        db.close()


def run_user_feed_ingestion() -> str:
    """Ingest all active personal/custom user feeds."""
    from app.core.database import SessionLocal
    from app.models import UserFeed

    db = SessionLocal()
    try:
        feeds = db.query(UserFeed).filter(
            UserFeed.is_active == True,
            UserFeed.auto_ingest == True,
        ).all()

        total_new = 0
        errors = 0
        for feed in feeds:
            try:
                from app.users.feeds import _ingest_user_feed_sync
                new_count = _ingest_user_feed_sync(db, feed)
                total_new += new_count or 0
            except Exception as e:
                errors += 1
                logger.warning(f"User feed ingestion failed for feed {feed.id}: {e}")

        return f"Ingested {len(feeds)} user feeds: {total_new} new articles, {errors} errors"
    finally:
        db.close()


def run_genai_batch_summarize() -> str:
    """Auto-summarize articles that were ingested without a summary."""
    from app.core.database import SessionLocal
    from app.models import Article

    db = SessionLocal()
    try:
        from app.integrations.sources import _generate_article_summaries

        articles = db.query(Article).filter(
            Article.executive_summary == None,
            Article.raw_content != None,
        ).order_by(Article.created_at.desc()).limit(20).all()

        processed = 0
        errors = 0
        for article in articles:
            try:
                content = article.normalized_content or article.raw_content or ""
                if len(content) > 50:
                    _generate_article_summaries(article, content, {})
                    db.commit()
                    processed += 1
            except Exception as e:
                errors += 1
                db.rollback()
                logger.warning(f"Batch summarize failed for article {article.id}: {e}")

        return f"Summarized {processed} articles, {errors} errors"
    finally:
        db.close()


def run_genai_batch_extract() -> str:
    """Auto-extract IOCs/TTPs from articles that lack intelligence data."""
    from app.core.database import SessionLocal
    from app.models import Article, ArticleIntelligence

    db = SessionLocal()
    try:
        from app.integrations.sources import _auto_analyze_article

        analyzed_ids = db.query(ArticleIntelligence.article_id).distinct().subquery()
        articles = db.query(Article).filter(
            Article.id.notin_(analyzed_ids),
            Article.raw_content != None,
        ).order_by(Article.created_at.desc()).limit(10).all()

        processed = 0
        errors = 0
        for article in articles:
            try:
                content = article.normalized_content or article.raw_content or ""
                if len(content) > 100:
                    _auto_analyze_article(db=db, article=article, content=content, source_url=article.url or "")
                    processed += 1
            except Exception as e:
                errors += 1
                logger.warning(f"Batch extraction failed for article {article.id}: {e}")

        return f"Extracted intel from {processed} articles, {errors} errors"
    finally:
        db.close()


def cleanup_old_logs() -> str:
    """Remove GenAI request logs older than 30 days."""
    from app.core.database import SessionLocal
    from app.genai.models import GenAIRequestLog
    cutoff = datetime.utcnow() - timedelta(days=30)
    db = SessionLocal()
    try:
        deleted = db.query(GenAIRequestLog).filter(
            GenAIRequestLog.created_at < cutoff
        ).delete()
        db.commit()
        return f"Deleted {deleted} old GenAI logs"
    except Exception:
        db.rollback()
        return "Log cleanup skipped"
    finally:
        db.close()


# ─────────────────────────────────────────────
# Global instance + setup
# ─────────────────────────────────────────────

hunt_scheduler = FeedScheduler()


def _load_scheduler_settings() -> Dict[str, Any]:
    """Load scheduler intervals from SystemConfiguration DB at runtime."""
    try:
        from app.core.database import SessionLocal
        from app.models import SystemConfiguration
        db = SessionLocal()
        try:
            rows = db.query(SystemConfiguration).filter(
                SystemConfiguration.category == "scheduler"
            ).all()
            settings_map: Dict[str, Any] = {}
            for row in rows:
                val = row.value
                if row.value_type == "int":
                    try:
                        val = int(val)
                    except (TypeError, ValueError):
                        pass
                elif row.value_type == "bool":
                    val = str(val).lower() in ("true", "1", "yes")
                settings_map[row.key] = val
            return settings_map
        finally:
            db.close()
    except Exception:
        return {}


def setup_scheduler(interval_minutes: int = 60) -> FeedScheduler:
    """
    Register all recurring jobs and return the scheduler (not yet started).
    Call scheduler.start() from the app lifespan to begin execution.
    Reads per-job intervals from SystemConfiguration (category='scheduler').
    """
    s = _load_scheduler_settings()

    org_interval = int(s.get("org_feed_poll_interval_minutes", interval_minutes)) * 60
    custom_interval = int(s.get("custom_feed_poll_interval_minutes", 30)) * 60

    hunt_scheduler.add_job(
        job_id="feed_ingestion",
        func=run_feed_ingestion,
        interval_seconds=org_interval,
        description=f"Ingest all active org feeds (every {org_interval // 60} min) + auto-extract intelligence",
        run_on_start=True,
    )

    hunt_scheduler.add_job(
        job_id="user_feed_ingestion",
        func=run_user_feed_ingestion,
        interval_seconds=custom_interval,
        description=f"Ingest all active personal/custom feeds (every {custom_interval // 60} min)",
        run_on_start=True,
    )
    hunt_scheduler.get_job("user_feed_ingestion").enabled = s.get("custom_feed_enabled", True)

    # GenAI automation jobs (disabled by default, admin can enable from UI)
    genai_summarize_interval = int(s.get("genai_summarize_interval_minutes", 60)) * 60
    genai_extract_interval = int(s.get("genai_extract_interval_minutes", 120)) * 60

    hunt_scheduler.add_job(
        job_id="genai_batch_summarize",
        func=run_genai_batch_summarize,
        interval_seconds=genai_summarize_interval,
        description=f"Auto-summarize new articles without summaries (every {genai_summarize_interval // 60} min)",
        run_on_start=False,
    )
    hunt_scheduler.get_job("genai_batch_summarize").enabled = bool(s.get("genai_summarize_enabled", False))

    hunt_scheduler.add_job(
        job_id="genai_batch_extract",
        func=run_genai_batch_extract,
        interval_seconds=genai_extract_interval,
        description=f"Auto-extract IOCs/TTPs from new articles (every {genai_extract_interval // 60} min)",
        run_on_start=False,
    )
    hunt_scheduler.get_job("genai_batch_extract").enabled = bool(s.get("genai_extract_enabled", False))

    hunt_scheduler.add_job(
        job_id="log_cleanup",
        func=cleanup_old_logs,
        interval_seconds=86400,  # daily
        description="Remove GenAI request logs older than 30 days",
        run_on_start=False,
    )

    return hunt_scheduler
