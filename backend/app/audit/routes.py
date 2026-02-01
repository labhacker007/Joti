"""Audit log viewing APIs."""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.core.database import get_db
from app.auth.dependencies import require_permission
from app.auth.rbac import Permission
from app.models import AuditLog, User, AuditEventType
from app.core.logging import logger
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

router = APIRouter(prefix="/audit", tags=["audit"])


class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    user_email: Optional[str] = None
    event_type: str
    resource_type: Optional[str] = None
    resource_id: Optional[int] = None
    action: str
    details: dict
    correlation_id: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AuditLogListResponse(BaseModel):
    logs: List[AuditLogResponse]
    total: int
    page: int
    page_size: int


@router.get("/", response_model=AuditLogListResponse)
def list_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    event_type: Optional[str] = None,
    user_id: Optional[int] = None,
    resource_type: Optional[str] = None,
    correlation_id: Optional[str] = None,
    current_user: User = Depends(require_permission(Permission.VIEW_AUDIT_LOGS.value)),
    db: Session = Depends(get_db)
):
    """List audit logs with filters and pagination."""
    query = db.query(AuditLog).join(User, AuditLog.user_id == User.id, isouter=True)
    
    # Apply filters
    if event_type:
        query = query.filter(AuditLog.event_type == event_type)
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    if resource_type:
        query = query.filter(AuditLog.resource_type == resource_type)
    if correlation_id:
        query = query.filter(AuditLog.correlation_id == correlation_id)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    logs = query.order_by(desc(AuditLog.created_at)).offset((page - 1) * page_size).limit(page_size).all()
    
    # Build response with user emails
    log_responses = []
    for log in logs:
        user_email = None
        if log.user:
            user_email = log.user.email
        
        log_responses.append(AuditLogResponse(
            id=log.id,
            user_id=log.user_id,
            user_email=user_email,
            event_type=log.event_type.value if hasattr(log.event_type, 'value') else log.event_type,
            resource_type=log.resource_type,
            resource_id=log.resource_id,
            action=log.action,
            details=log.details or {},
            correlation_id=log.correlation_id,
            ip_address=log.ip_address,
            created_at=log.created_at
        ))
    
    return AuditLogListResponse(
        logs=log_responses,
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/{log_id}", response_model=AuditLogResponse)
def get_audit_log(
    log_id: int,
    current_user: User = Depends(require_permission(Permission.VIEW_AUDIT_LOGS.value)),
    db: Session = Depends(get_db)
):
    """Get a specific audit log entry."""
    log = db.query(AuditLog).filter(AuditLog.id == log_id).first()
    
    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audit log not found"
        )
    
    user_email = None
    if log.user:
        user_email = log.user.email
    
    return AuditLogResponse(
        id=log.id,
        user_id=log.user_id,
        user_email=user_email,
        event_type=log.event_type.value if hasattr(log.event_type, 'value') else log.event_type,
        resource_type=log.resource_type,
        resource_id=log.resource_id,
        action=log.action,
        details=log.details or {},
        correlation_id=log.correlation_id,
        ip_address=log.ip_address,
        created_at=log.created_at
    )


@router.get("/correlation/{correlation_id}", response_model=List[AuditLogResponse])
def get_logs_by_correlation(
    correlation_id: str,
    current_user: User = Depends(require_permission(Permission.VIEW_AUDIT_LOGS.value)),
    db: Session = Depends(get_db)
):
    """Get all audit logs for a specific correlation ID."""
    logs = db.query(AuditLog).filter(
        AuditLog.correlation_id == correlation_id
    ).order_by(AuditLog.created_at).all()
    
    log_responses = []
    for log in logs:
        user_email = None
        if log.user:
            user_email = log.user.email
        
        log_responses.append(AuditLogResponse(
            id=log.id,
            user_id=log.user_id,
            user_email=user_email,
            event_type=log.event_type.value if hasattr(log.event_type, 'value') else log.event_type,
            resource_type=log.resource_type,
            resource_id=log.resource_id,
            action=log.action,
            details=log.details or {},
            correlation_id=log.correlation_id,
            ip_address=log.ip_address,
            created_at=log.created_at
        ))
    
    return log_responses
