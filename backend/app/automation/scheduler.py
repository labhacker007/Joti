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


def setup_scheduler(interval_minutes: int = 60) -> FeedScheduler:
    """
    Register all recurring jobs and return the scheduler (not yet started).
    Call scheduler.start() from the app lifespan to begin execution.
    """
    interval_seconds = interval_minutes * 60

    hunt_scheduler.add_job(
        job_id="feed_ingestion",
        func=run_feed_ingestion,
        interval_seconds=interval_seconds,
        description=f"Ingest all active feeds every {interval_minutes} min + auto-extract intelligence",
        run_on_start=True,
    )

    hunt_scheduler.add_job(
        job_id="log_cleanup",
        func=cleanup_old_logs,
        interval_seconds=86400,  # daily
        description="Remove GenAI request logs older than 30 days",
        run_on_start=False,
    )

    return hunt_scheduler
