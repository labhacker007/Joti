"""Audit log viewing APIs."""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_
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


@router.get("/event-types")
def get_event_types(
    current_user: User = Depends(require_permission(Permission.AUDIT_READ.value)),
):
    """Get all available audit event types for filtering."""
    return {
        "event_types": [
            {"value": e.value, "label": e.value.replace("_", " ").title()}
            for e in AuditEventType
        ]
    }


@router.get("/", response_model=AuditLogListResponse)
def list_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    event_type: Optional[str] = None,
    user_id: Optional[int] = None,
    resource_type: Optional[str] = None,
    correlation_id: Optional[str] = None,
    search: Optional[str] = Query(None, description="Search across action and user email"),
    date_from: Optional[str] = Query(None, description="Start date (ISO format)"),
    date_to: Optional[str] = Query(None, description="End date (ISO format)"),
    current_user: User = Depends(require_permission(Permission.AUDIT_READ.value)),
    db: Session = Depends(get_db)
):
    """List audit logs with filters and pagination."""
    query = db.query(AuditLog).join(User, AuditLog.user_id == User.id, isouter=True)

    # IDOR protection: non-admin users can only view their own logs
    if current_user.role.value != "admin":
        if user_id and user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own audit logs"
            )
        query = query.filter(AuditLog.user_id == current_user.id)

    # Apply filters
    if event_type:
        query = query.filter(AuditLog.event_type == event_type)
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    if resource_type:
        query = query.filter(AuditLog.resource_type == resource_type)
    if correlation_id:
        query = query.filter(AuditLog.correlation_id == correlation_id)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                AuditLog.action.ilike(search_term),
                User.email.ilike(search_term),
                User.username.ilike(search_term),
            )
        )
    if date_from:
        try:
            dt_from = datetime.fromisoformat(date_from.replace("Z", "+00:00"))
            query = query.filter(AuditLog.created_at >= dt_from)
        except ValueError:
            pass
    if date_to:
        try:
            dt_to = datetime.fromisoformat(date_to.replace("Z", "+00:00"))
            query = query.filter(AuditLog.created_at <= dt_to)
        except ValueError:
            pass
    
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
    current_user: User = Depends(require_permission(Permission.AUDIT_READ.value)),
    db: Session = Depends(get_db)
):
    """Get a specific audit log entry."""
    query = db.query(AuditLog).filter(AuditLog.id == log_id)
    # Non-admin users can only view their own audit logs (IDOR protection)
    effective_role = getattr(current_user, 'role', None)
    role_val = effective_role.value if hasattr(effective_role, 'value') else str(effective_role)
    if role_val != "ADMIN":
        query = query.filter(AuditLog.user_id == current_user.id)
    log = query.first()
    
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
    current_user: User = Depends(require_permission(Permission.AUDIT_READ.value)),
    db: Session = Depends(get_db)
):
    """Get all audit logs for a specific correlation ID."""
    query = db.query(AuditLog).filter(
        AuditLog.correlation_id == correlation_id
    )
    # Non-admin users can only view their own audit logs (IDOR protection)
    effective_role = getattr(current_user, 'role', None)
    role_val = effective_role.value if hasattr(effective_role, 'value') else str(effective_role)
    if role_val != "ADMIN":
        query = query.filter(AuditLog.user_id == current_user.id)
    logs = query.order_by(AuditLog.created_at).all()
    
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
