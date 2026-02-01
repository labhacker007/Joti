"""API routes for automation workflows."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.auth.dependencies import get_current_user, require_permission
from app.auth.rbac import Permission
from app.models import User, Article, ArticleStatus, Hunt, HuntExecution
from app.automation.engine import AutomationEngine

router = APIRouter(prefix="/automation", tags=["Automation"])


class ProcessArticleRequest(BaseModel):
    """Request to process a single article."""
    article_id: int
    platforms: Optional[List[str]] = None
    auto_execute: bool = True
    notify: bool = True
    genai_provider: Optional[str] = None


class ProcessBatchRequest(BaseModel):
    """Request to process multiple articles."""
    article_ids: Optional[List[int]] = None
    limit: int = 10
    platforms: Optional[List[str]] = None
    auto_execute: bool = True


class AutomationStatusResponse(BaseModel):
    """Response for automation status."""
    article_id: int
    status: str
    started_at: Optional[str]
    completed_at: Optional[str]
    duration_ms: Optional[int]
    steps: List[dict]
    hunts: Optional[List[dict]] = None
    executions: Optional[List[dict]] = None
    analyses: Optional[List[dict]] = None
    error: Optional[str] = None


@router.post("/process", response_model=AutomationStatusResponse)
async def process_article(
    request: ProcessArticleRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_permission(Permission.EXECUTE_HUNTS.value))
):
    """Process a single article through the full automation workflow.
    
    This triggers:
    1. Intelligence extraction (IOCs, IOAs, TTPs)
    2. Hunt query generation using GenAI
    3. Hunt execution on configured platforms
    4. Result analysis using GenAI
    5. Notifications for significant findings
    """
    engine = AutomationEngine(request.genai_provider)
    
    result = await engine.process_article(
        article_id=request.article_id,
        platforms=request.platforms,
        auto_execute=request.auto_execute,
        notify=request.notify
    )
    
    return AutomationStatusResponse(**result)


@router.post("/process-batch")
async def process_batch(
    request: ProcessBatchRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_permission(Permission.EXECUTE_HUNTS.value))
):
    """Process multiple articles in batch.
    
    If article_ids is provided, only those articles are processed.
    Otherwise, the newest articles with status NEW are processed up to limit.
    """
    engine = AutomationEngine()
    
    if request.article_ids:
        results = []
        for article_id in request.article_ids:
            result = await engine.process_article(
                article_id=article_id,
                platforms=request.platforms,
                auto_execute=request.auto_execute
            )
            results.append(result)
        return {"processed": len(results), "results": results}
    else:
        results = await engine.process_new_articles(
            limit=request.limit,
            platforms=request.platforms,
            auto_execute=request.auto_execute
        )
        return {"processed": len(results), "results": results}


@router.post("/run-cycle")
async def run_automation_cycle(
    background_tasks: BackgroundTasks,
    limit: int = 10,
    current_user: User = Depends(require_permission(Permission.EXECUTE_HUNTS.value))
):
    """Run a full automation cycle for new articles.
    
    This is designed to be called periodically (e.g., via cron or scheduler).
    """
    engine = AutomationEngine()
    results = await engine.process_new_articles(limit=limit)
    
    return {
        "status": "completed",
        "articles_processed": len(results),
        "summary": {
            "successful": sum(1 for r in results if r.get("status") == "completed"),
            "failed": sum(1 for r in results if r.get("status") == "failed"),
            "total_hunts": sum(len(r.get("hunts", [])) for r in results),
            "total_executions": sum(len(r.get("executions", [])) for r in results)
        }
    }


@router.get("/stats")
async def get_automation_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get automation statistics."""
    from sqlalchemy import func
    from app.models import HuntExecution, HuntStatus, Article, ArticleStatus
    
    # Total articles by status
    article_stats = db.query(
        Article.status,
        func.count(Article.id)
    ).group_by(Article.status).all()
    
    # Hunt execution stats
    hunt_stats = db.query(
        HuntExecution.status,
        func.count(HuntExecution.id)
    ).group_by(HuntExecution.status).all()
    
    # Hunts by platform
    platform_stats = db.query(
        Hunt.platform,
        func.count(Hunt.id)
    ).group_by(Hunt.platform).all()
    
    # Average execution time
    avg_time = db.query(func.avg(HuntExecution.execution_time_ms)).scalar() or 0
    
    return {
        "articles": {status.value: count for status, count in article_stats},
        "hunts": {status.value: count for status, count in hunt_stats},
        "platforms": {platform: count for platform, count in platform_stats},
        "avg_execution_time_ms": round(avg_time, 2)
    }


@router.get("/tracker/{article_id}")
async def get_article_tracker(
    article_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get the automation tracker for a specific article.
    
    Returns all hunts, executions, and their results for the article.
    """
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    # Get all hunts for this article
    hunts = db.query(Hunt).filter(Hunt.article_id == article_id).all()
    
    tracker_data = {
        "article": {
            "id": article.id,
            "title": article.title,
            "status": article.status.value,
            "is_high_priority": article.is_high_priority,
            "created_at": article.created_at.isoformat()
        },
        "hunts": []
    }
    
    for hunt in hunts:
        hunt_data = {
            "id": hunt.id,
            "platform": hunt.platform,
            "model": hunt.generated_by_model,
            "query": hunt.query_logic[:500] + "..." if len(hunt.query_logic) > 500 else hunt.query_logic,
            "created_at": hunt.created_at.isoformat(),
            "executions": []
        }
        
        for execution in hunt.executions:
            exec_data = {
                "id": execution.id,
                "status": execution.status.value,
                "trigger_type": execution.trigger_type.value,
                "executed_at": execution.executed_at.isoformat() if execution.executed_at else None,
                "execution_time_ms": execution.execution_time_ms,
                "results_count": len(execution.results.get("results", [])) if execution.results else 0,
                "has_hits": execution.results.get("results_count", 0) > 0 if execution.results else False,
                "genai_analysis": execution.results.get("genai_analysis") if execution.results else None,
                "error": execution.error_message
            }
            hunt_data["executions"].append(exec_data)
        
        tracker_data["hunts"].append(hunt_data)
    
    return tracker_data


# ============ SCHEDULER ENDPOINTS ============

from app.automation.scheduler import hunt_scheduler


@router.get("/scheduler/jobs")
async def get_scheduled_jobs(
    current_user: User = Depends(require_permission(Permission.MANAGE_CONNECTORS.value))
):
    """Get list of all scheduled jobs."""
    return {"jobs": hunt_scheduler.get_jobs()}


@router.post("/scheduler/jobs/{job_id}/run")
async def run_job_now(
    job_id: str,
    current_user: User = Depends(require_permission(Permission.EXECUTE_HUNTS.value)),
    db: Session = Depends(get_db)
):
    """Trigger a scheduled job to run immediately for testing."""
    from app.audit.manager import AuditManager
    from app.models import AuditEventType
    
    job = hunt_scheduler.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    
    success = hunt_scheduler.run_job_now(job_id, triggered_by=current_user.username)
    if success:
        # Log audit event (resource_id is integer, so store job_id in details)
        AuditManager.log_event(
            db=db,
            event_type=AuditEventType.SCHEDULED_TASK,
            action="manual_job_trigger",
            user_id=current_user.id,
            resource_type="scheduled_job",
            resource_id=None,
            details={"job_id": job_id, "job_name": job.get("name"), "triggered_by": current_user.username}
        )
        return {"message": f"Job {job_id} triggered successfully", "job_id": job_id, "job": job}
    raise HTTPException(status_code=500, detail=f"Failed to trigger job {job_id}")


@router.post("/scheduler/jobs/{job_id}/pause")
async def pause_job(
    job_id: str,
    current_user: User = Depends(require_permission(Permission.MANAGE_CONNECTORS.value)),
    db: Session = Depends(get_db)
):
    """Pause a scheduled job."""
    from app.audit.manager import AuditManager
    from app.models import AuditEventType
    
    success = hunt_scheduler.pause_job(job_id)
    if success:
        AuditManager.log_event(
            db=db,
            event_type=AuditEventType.ADMIN_ACTION,
            action="scheduler_job_paused",
            user_id=current_user.id,
            resource_type="scheduled_job",
            resource_id=None,
            details={"job_id": job_id}
        )
        return {"message": f"Job {job_id} paused", "job_id": job_id}
    raise HTTPException(status_code=404, detail=f"Job {job_id} not found")


@router.post("/scheduler/jobs/{job_id}/resume")
async def resume_job(
    job_id: str,
    current_user: User = Depends(require_permission(Permission.MANAGE_CONNECTORS.value)),
    db: Session = Depends(get_db)
):
    """Resume a paused job."""
    from app.audit.manager import AuditManager
    from app.models import AuditEventType
    
    success = hunt_scheduler.resume_job(job_id)
    if success:
        AuditManager.log_event(
            db=db,
            event_type=AuditEventType.ADMIN_ACTION,
            action="scheduler_job_resumed",
            user_id=current_user.id,
            resource_type="scheduled_job",
            resource_id=None,
            details={"job_id": job_id}
        )
        return {"message": f"Job {job_id} resumed", "job_id": job_id}
    raise HTTPException(status_code=404, detail=f"Job {job_id} not found")


@router.delete("/scheduler/jobs/{job_id}")
async def delete_job(
    job_id: str,
    current_user: User = Depends(require_permission(Permission.MANAGE_CONNECTORS.value)),
    db: Session = Depends(get_db)
):
    """Remove a scheduled job."""
    from app.audit.manager import AuditManager
    from app.models import AuditEventType
    
    # Prevent removing default jobs
    default_jobs = ["process_new_articles", "auto_hunt_high_fidelity", "daily_summary", "weekly_cleanup", "rag_refresh", "rag_process_pending"]
    if job_id in default_jobs:
        raise HTTPException(status_code=400, detail="Cannot remove default system jobs")
    
    success = hunt_scheduler.remove_job(job_id)
    if success:
        AuditManager.log_event(
            db=db,
            event_type=AuditEventType.ADMIN_ACTION,
            action="scheduler_job_deleted",
            user_id=current_user.id,
            resource_type="scheduled_job",
            resource_id=None,
            details={"job_id": job_id}
        )
        return {"message": f"Job {job_id} removed", "job_id": job_id}
    raise HTTPException(status_code=404, detail=f"Job {job_id} not found")


class CreateJobRequest(BaseModel):
    """Request to create a new scheduled job."""
    job_id: str
    name: str
    function_id: str  # ID of the schedulable function to use
    trigger_type: str  # 'interval' or 'cron'
    interval_minutes: Optional[int] = None
    interval_hours: Optional[int] = None
    cron_hour: Optional[int] = None
    cron_minute: Optional[int] = None
    cron_day_of_week: Optional[str] = None  # 'mon', 'tue', etc. or '*'
    cron_day: Optional[str] = None  # '1-31' or '*'
    cron_expression: Optional[str] = None  # Alternative: full cron expression
    enabled: bool = True


class UpdateJobRequest(BaseModel):
    """Request to update an existing scheduled job."""
    name: Optional[str] = None
    function_id: Optional[str] = None
    trigger_type: Optional[str] = None
    interval_minutes: Optional[int] = None
    interval_hours: Optional[int] = None
    cron_hour: Optional[int] = None
    cron_minute: Optional[int] = None
    cron_day_of_week: Optional[str] = None
    cron_day: Optional[str] = None
    cron_expression: Optional[str] = None
    enabled: Optional[bool] = None


@router.get("/scheduler/functions")
async def get_available_functions(
    current_user: User = Depends(require_permission(Permission.MANAGE_CONNECTORS.value))
):
    """Get list of all available schedulable functions."""
    return {"functions": hunt_scheduler.get_available_functions()}


@router.post("/scheduler/jobs")
async def create_job(
    request: CreateJobRequest,
    current_user: User = Depends(require_permission(Permission.MANAGE_CONNECTORS.value)),
    db: Session = Depends(get_db)
):
    """Create a new scheduled job with a specific function."""
    from apscheduler.triggers.interval import IntervalTrigger
    from apscheduler.triggers.cron import CronTrigger
    from app.audit.manager import AuditManager
    from app.models import AuditEventType
    
    # Check if job already exists
    existing = hunt_scheduler.get_job(request.job_id)
    if existing:
        raise HTTPException(status_code=400, detail=f"Job {request.job_id} already exists")
    
    # Verify function_id is valid
    if not hunt_scheduler.get_function_by_id(request.function_id):
        raise HTTPException(status_code=400, detail=f"Unknown function_id: {request.function_id}")
    
    # Create trigger based on type
    try:
        if request.trigger_type == 'interval':
            minutes = request.interval_minutes or 0
            hours = request.interval_hours or 0
            total_minutes = minutes + (hours * 60)
            if total_minutes < 1:
                raise HTTPException(status_code=400, detail="Interval must be at least 1 minute")
            trigger = IntervalTrigger(minutes=total_minutes)
        elif request.trigger_type == 'cron':
            # Use structured cron parameters or full expression
            if request.cron_expression:
                parts = request.cron_expression.strip().split()
                if len(parts) == 5:
                    trigger = CronTrigger(
                        minute=parts[0],
                        hour=parts[1],
                        day=parts[2],
                        month=parts[3],
                        day_of_week=parts[4]
                    )
                else:
                    raise HTTPException(status_code=400, detail="Invalid cron expression. Expected: minute hour day month day_of_week")
            else:
                # Build from structured parameters
                trigger = CronTrigger(
                    minute=request.cron_minute if request.cron_minute is not None else 0,
                    hour=request.cron_hour if request.cron_hour is not None else 8,
                    day=request.cron_day or '*',
                    day_of_week=request.cron_day_of_week or '*'
                )
        else:
            raise HTTPException(status_code=400, detail="trigger_type must be 'interval' or 'cron'")
        
        # Add the job with the specified function
        success = hunt_scheduler.add_custom_job(
            job_id=request.job_id,
            name=request.name,
            trigger=trigger,
            enabled=request.enabled,
            function_id=request.function_id
        )
        
        if success:
            AuditManager.log_event(
                db=db,
                event_type=AuditEventType.ADMIN_ACTION,
                action="scheduler_job_created",
                user_id=current_user.id,
                resource_type="scheduled_job",
                resource_id=None,
                details={"job_id": request.job_id, "name": request.name, "function_id": request.function_id, "trigger_type": request.trigger_type}
            )
            return {
                "message": f"Job {request.job_id} created successfully",
                "job_id": request.job_id,
                "name": request.name,
                "function_id": request.function_id
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to create job")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/scheduler/jobs/{job_id}")
async def update_job(
    job_id: str,
    request: UpdateJobRequest,
    current_user: User = Depends(require_permission(Permission.MANAGE_CONNECTORS.value)),
    db: Session = Depends(get_db)
):
    """Update an existing scheduled job."""
    from apscheduler.triggers.interval import IntervalTrigger
    from apscheduler.triggers.cron import CronTrigger
    from app.audit.manager import AuditManager
    from app.models import AuditEventType
    
    # Check if job exists
    existing = hunt_scheduler.get_job(job_id)
    if not existing:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    
    # If changing function, verify it's valid
    if request.function_id and not hunt_scheduler.get_function_by_id(request.function_id):
        raise HTTPException(status_code=400, detail=f"Unknown function_id: {request.function_id}")
    
    # Build new trigger if trigger info is provided
    new_trigger = None
    if request.trigger_type:
        if request.trigger_type == 'interval':
            minutes = request.interval_minutes or 0
            hours = request.interval_hours or 0
            total_minutes = minutes + (hours * 60)
            if total_minutes < 1:
                raise HTTPException(status_code=400, detail="Interval must be at least 1 minute")
            new_trigger = IntervalTrigger(minutes=total_minutes)
        elif request.trigger_type == 'cron':
            if request.cron_expression:
                parts = request.cron_expression.strip().split()
                if len(parts) == 5:
                    new_trigger = CronTrigger(
                        minute=parts[0],
                        hour=parts[1],
                        day=parts[2],
                        month=parts[3],
                        day_of_week=parts[4]
                    )
                else:
                    raise HTTPException(status_code=400, detail="Invalid cron expression")
            else:
                new_trigger = CronTrigger(
                    minute=request.cron_minute if request.cron_minute is not None else 0,
                    hour=request.cron_hour if request.cron_hour is not None else 8,
                    day=request.cron_day or '*',
                    day_of_week=request.cron_day_of_week or '*'
                )
    
    try:
        # If function_id changed, we need to recreate the job
        if request.function_id:
            # Get the current trigger if not changing it
            current_job = hunt_scheduler.scheduler.get_job(job_id)
            trigger_to_use = new_trigger or current_job.trigger
            
            # Remove and recreate with new function
            hunt_scheduler.remove_job(job_id)
            success = hunt_scheduler.add_custom_job(
                job_id=job_id,
                name=request.name or existing.get("name", job_id),
                trigger=trigger_to_use,
                enabled=request.enabled if request.enabled is not None else not existing.get("paused", False),
                function_id=request.function_id
            )
        else:
            success = hunt_scheduler.update_job(
                job_id=job_id,
                name=request.name,
                trigger=new_trigger,
                enabled=request.enabled
            )
        
        if success:
            AuditManager.log_event(
                db=db,
                event_type=AuditEventType.ADMIN_ACTION,
                action="scheduler_job_updated",
                user_id=current_user.id,
                resource_type="scheduled_job",
                resource_id=None,
                details={"job_id": job_id, "name": request.name, "function_id": request.function_id, "enabled": request.enabled}
            )
            return {"message": f"Job {job_id} updated successfully", "job_id": job_id}
        else:
            raise HTTPException(status_code=500, detail="Failed to update job")
            
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
