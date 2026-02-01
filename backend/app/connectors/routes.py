from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime
from app.hunts.connectors import get_connector
from app.auth.dependencies import require_permission
from app.auth.rbac import Permission
from app.models import User, ConnectorConfig, ConnectorPlatform, ConnectorTemplate, ConnectorExecution, AuditEventType
from app.core.database import get_db
from app.connectors.schemas import ConnectorCreate, ConnectorResponse, ConnectorUpdate
from app.audit.manager import AuditManager
from app.core.logging import logger

router = APIRouter(prefix="/connectors", tags=["connectors"])


# ============================================================================
# PYDANTIC SCHEMAS FOR PLATFORM REGISTRY
# ============================================================================

class PlatformCreate(BaseModel):
    platform_id: str = Field(..., min_length=2, max_length=50, pattern=r'^[a-z][a-z0-9_]*$')
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    vendor: Optional[str] = None
    category: str = Field(..., min_length=2, max_length=50)
    subcategory: Optional[str] = None
    icon_url: Optional[str] = None
    color: Optional[str] = None
    capabilities: List[str] = []
    query_language: Optional[str] = None
    query_syntax: Optional[dict] = None
    documentation_url: Optional[str] = None
    config_schema: Optional[dict] = None
    api_definition: Optional[dict] = None
    is_beta: bool = False


class PlatformUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    vendor: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    icon_url: Optional[str] = None
    color: Optional[str] = None
    capabilities: Optional[List[str]] = None
    query_language: Optional[str] = None
    query_syntax: Optional[dict] = None
    documentation_url: Optional[str] = None
    config_schema: Optional[dict] = None
    api_definition: Optional[dict] = None
    is_active: Optional[bool] = None
    is_beta: Optional[bool] = None


class PlatformResponse(BaseModel):
    id: int
    platform_id: str
    name: str
    description: Optional[str]
    vendor: Optional[str]
    category: str
    subcategory: Optional[str]
    icon_url: Optional[str]
    color: Optional[str]
    capabilities: List[str]
    query_language: Optional[str]
    query_syntax: Optional[dict]
    documentation_url: Optional[str]
    config_schema: Optional[dict]
    api_definition: Optional[dict]
    is_builtin: bool
    is_active: bool
    is_beta: bool
    created_at: datetime
    updated_at: datetime
    
    # Computed fields
    connector_count: Optional[int] = 0
    
    class Config:
        from_attributes = True


class TemplateCreate(BaseModel):
    template_id: str = Field(..., min_length=2, max_length=50, pattern=r'^[a-z][a-z0-9_]*$')
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    action_type: str = Field(..., pattern=r'^(query|enrich|notify|ingest|export|test)$')
    http_method: str = Field(default="POST", pattern=r'^(GET|POST|PUT|DELETE|PATCH)$')
    endpoint_path: str = Field(..., min_length=1)
    headers: Optional[dict] = None
    request_template: Optional[dict] = None
    content_type: str = "application/json"
    query_params: Optional[dict] = None
    response_parser: Optional[dict] = None
    success_condition: Optional[str] = None
    input_schema: Optional[dict] = None
    output_schema: Optional[dict] = None
    rate_limit_requests: Optional[int] = None
    rate_limit_window_seconds: Optional[int] = None
    retry_on_status: Optional[List[int]] = None
    max_retries: int = 3
    retry_delay_seconds: int = 1
    is_default: bool = False


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    action_type: Optional[str] = None
    http_method: Optional[str] = None
    endpoint_path: Optional[str] = None
    headers: Optional[dict] = None
    request_template: Optional[dict] = None
    content_type: Optional[str] = None
    query_params: Optional[dict] = None
    response_parser: Optional[dict] = None
    success_condition: Optional[str] = None
    input_schema: Optional[dict] = None
    output_schema: Optional[dict] = None
    rate_limit_requests: Optional[int] = None
    rate_limit_window_seconds: Optional[int] = None
    retry_on_status: Optional[List[int]] = None
    max_retries: Optional[int] = None
    retry_delay_seconds: Optional[int] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None


class TemplateResponse(BaseModel):
    id: int
    platform_id: int
    template_id: str
    name: str
    description: Optional[str]
    action_type: str
    http_method: str
    endpoint_path: str
    headers: Optional[dict]
    request_template: Optional[dict]
    content_type: str
    query_params: Optional[dict]
    response_parser: Optional[dict]
    success_condition: Optional[str]
    input_schema: Optional[dict]
    output_schema: Optional[dict]
    rate_limit_requests: Optional[int]
    rate_limit_window_seconds: Optional[int]
    retry_on_status: Optional[List[int]]
    max_retries: int
    retry_delay_seconds: int
    is_active: bool
    is_default: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ExecutionResponse(BaseModel):
    id: int
    platform_id: str
    action_type: str
    triggered_by: Optional[str]
    request_method: Optional[str]
    response_status: Optional[int]
    response_time_ms: Optional[int]
    status: str
    error_message: Optional[str]
    result_count: Optional[int]
    executed_at: datetime
    
    class Config:
        from_attributes = True


# ============================================================================
# PLATFORM REGISTRY ENDPOINTS
# ============================================================================

@router.get("/platforms", response_model=List[PlatformResponse])
def list_platforms(
    category: Optional[str] = Query(None, description="Filter by category"),
    capability: Optional[str] = Query(None, description="Filter by capability"),
    active_only: bool = Query(True, description="Only show active platforms"),
    include_connector_count: bool = Query(False, description="Include count of configured connectors"),
    db: Session = Depends(get_db)
):
    """List all available connector platforms (replaces hardcoded platform lists)."""
    query = db.query(ConnectorPlatform)
    
    if active_only:
        query = query.filter(ConnectorPlatform.is_active == True)
    
    if category:
        query = query.filter(ConnectorPlatform.category == category)
    
    platforms = query.order_by(ConnectorPlatform.category, ConnectorPlatform.name).all()
    
    # Filter by capability if specified
    if capability:
        platforms = [p for p in platforms if capability in (p.capabilities or [])]
    
    # Build response with optional connector counts
    results = []
    for p in platforms:
        data = PlatformResponse.model_validate(p)
        if include_connector_count:
            data.connector_count = db.query(ConnectorConfig).filter(
                ConnectorConfig.connector_type == p.platform_id,
                ConnectorConfig.is_active == True
            ).count()
        results.append(data)
    
    return results


@router.get("/platforms/categories")
def list_platform_categories(db: Session = Depends(get_db)):
    """List all platform categories for filtering."""
    categories = db.query(ConnectorPlatform.category).distinct().all()
    
    category_info = {
        "siem": {"name": "SIEM", "description": "Security Information and Event Management"},
        "edr": {"name": "EDR", "description": "Endpoint Detection and Response"},
        "cloud_security": {"name": "Cloud Security", "description": "Cloud Security Posture Management"},
        "enrichment": {"name": "Enrichment", "description": "Threat Intelligence and Enrichment"},
        "sandbox": {"name": "Sandbox", "description": "Malware Analysis and Sandboxing"},
        "ticketing": {"name": "Ticketing", "description": "IT Service Management and Ticketing"},
        "soar": {"name": "SOAR", "description": "Security Orchestration and Response"},
        "notification": {"name": "Notification", "description": "Alerting and Notifications"},
        "integration": {"name": "Integration", "description": "Generic Integrations"},
    }
    
    return [
        {
            "id": cat[0],
            "name": category_info.get(cat[0], {}).get("name", cat[0].title()),
            "description": category_info.get(cat[0], {}).get("description", ""),
            "count": db.query(ConnectorPlatform).filter(
                ConnectorPlatform.category == cat[0],
                ConnectorPlatform.is_active == True
            ).count()
        }
        for cat in categories
    ]


@router.get("/platforms/capabilities")
def list_platform_capabilities():
    """List all available platform capabilities."""
    return [
        {"id": "hunt", "name": "Hunt", "description": "Execute threat hunting queries"},
        {"id": "enrich", "name": "Enrich", "description": "Enrich IOCs and artifacts"},
        {"id": "notify", "name": "Notify", "description": "Send notifications and alerts"},
        {"id": "ingest", "name": "Ingest", "description": "Ingest data from the platform"},
        {"id": "export", "name": "Export", "description": "Export data to the platform"},
    ]


@router.get("/platforms/{platform_id}", response_model=PlatformResponse)
def get_platform(
    platform_id: str,
    db: Session = Depends(get_db)
):
    """Get details for a specific platform."""
    platform = db.query(ConnectorPlatform).filter(
        ConnectorPlatform.platform_id == platform_id
    ).first()
    
    if not platform:
        raise HTTPException(status_code=404, detail="Platform not found")
    
    data = PlatformResponse.model_validate(platform)
    data.connector_count = db.query(ConnectorConfig).filter(
        ConnectorConfig.connector_type == platform_id,
        ConnectorConfig.is_active == True
    ).count()
    
    return data


@router.post("/platforms", response_model=PlatformResponse, status_code=201)
def create_platform(
    payload: PlatformCreate,
    current_user: User = Depends(require_permission(Permission.MANAGE_CONNECTORS.value)),
    db: Session = Depends(get_db)
):
    """Create a new custom connector platform."""
    existing = db.query(ConnectorPlatform).filter(
        ConnectorPlatform.platform_id == payload.platform_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=409, detail="Platform ID already exists")
    
    platform = ConnectorPlatform(
        platform_id=payload.platform_id,
        name=payload.name,
        description=payload.description,
        vendor=payload.vendor,
        category=payload.category,
        subcategory=payload.subcategory,
        icon_url=payload.icon_url,
        color=payload.color,
        capabilities=payload.capabilities or [],
        query_language=payload.query_language,
        query_syntax=payload.query_syntax or {},
        documentation_url=payload.documentation_url,
        config_schema=payload.config_schema or {},
        api_definition=payload.api_definition or {},
        is_builtin=False,
        is_active=True,
        is_beta=payload.is_beta,
        created_by_id=current_user.id,
        updated_by_id=current_user.id
    )
    
    db.add(platform)
    db.commit()
    db.refresh(platform)
    
    AuditManager.log_event(
        db=db,
        event_type=AuditEventType.CONNECTOR_CONFIG,
        action="platform_created",
        user_id=current_user.id,
        resource_type="platform",
        resource_id=platform.id,
        details={"platform_id": platform.platform_id, "name": platform.name}
    )
    
    logger.info("platform_created", platform_id=platform.platform_id, user_id=current_user.id)
    
    return PlatformResponse.model_validate(platform)


@router.patch("/platforms/{platform_id}", response_model=PlatformResponse)
def update_platform(
    platform_id: str,
    payload: PlatformUpdate,
    current_user: User = Depends(require_permission(Permission.MANAGE_CONNECTORS.value)),
    db: Session = Depends(get_db)
):
    """Update a platform configuration."""
    platform = db.query(ConnectorPlatform).filter(
        ConnectorPlatform.platform_id == platform_id
    ).first()
    
    if not platform:
        raise HTTPException(status_code=404, detail="Platform not found")
    
    # Update fields
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(platform, field, value)
    
    platform.updated_by_id = current_user.id
    
    db.commit()
    db.refresh(platform)
    
    AuditManager.log_event(
        db=db,
        event_type=AuditEventType.CONNECTOR_CONFIG,
        action="platform_updated",
        user_id=current_user.id,
        resource_type="platform",
        resource_id=platform.id,
        details={"platform_id": platform.platform_id, "updated_fields": list(update_data.keys())}
    )
    
    return PlatformResponse.model_validate(platform)


@router.delete("/platforms/{platform_id}")
def delete_platform(
    platform_id: str,
    current_user: User = Depends(require_permission(Permission.MANAGE_CONNECTORS.value)),
    db: Session = Depends(get_db)
):
    """Delete a custom platform (built-in platforms cannot be deleted)."""
    platform = db.query(ConnectorPlatform).filter(
        ConnectorPlatform.platform_id == platform_id
    ).first()
    
    if not platform:
        raise HTTPException(status_code=404, detail="Platform not found")
    
    if platform.is_builtin:
        raise HTTPException(status_code=400, detail="Cannot delete built-in platforms. Deactivate instead.")
    
    # Check for existing connectors
    connector_count = db.query(ConnectorConfig).filter(
        ConnectorConfig.connector_type == platform_id
    ).count()
    
    if connector_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete platform with {connector_count} configured connector(s). Delete connectors first."
        )
    
    db.delete(platform)
    db.commit()
    
    AuditManager.log_event(
        db=db,
        event_type=AuditEventType.CONNECTOR_CONFIG,
        action="platform_deleted",
        user_id=current_user.id,
        resource_type="platform",
        resource_id=platform.id,
        details={"platform_id": platform_id}
    )
    
    return {"message": "Platform deleted"}


# ============================================================================
# CONNECTOR TEMPLATE ENDPOINTS
# ============================================================================

@router.get("/platforms/{platform_id}/templates", response_model=List[TemplateResponse])
def list_templates(
    platform_id: str,
    action_type: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """List all templates for a platform."""
    platform = db.query(ConnectorPlatform).filter(
        ConnectorPlatform.platform_id == platform_id
    ).first()
    
    if not platform:
        raise HTTPException(status_code=404, detail="Platform not found")
    
    query = db.query(ConnectorTemplate).filter(ConnectorTemplate.platform_id == platform.id)
    
    if action_type:
        query = query.filter(ConnectorTemplate.action_type == action_type)
    
    templates = query.order_by(ConnectorTemplate.action_type, ConnectorTemplate.name).all()
    
    return [TemplateResponse.model_validate(t) for t in templates]


@router.post("/platforms/{platform_id}/templates", response_model=TemplateResponse, status_code=201)
def create_template(
    platform_id: str,
    payload: TemplateCreate,
    current_user: User = Depends(require_permission(Permission.MANAGE_CONNECTORS.value)),
    db: Session = Depends(get_db)
):
    """Create a new connector template."""
    platform = db.query(ConnectorPlatform).filter(
        ConnectorPlatform.platform_id == platform_id
    ).first()
    
    if not platform:
        raise HTTPException(status_code=404, detail="Platform not found")
    
    # Check for duplicate template_id
    existing = db.query(ConnectorTemplate).filter(
        ConnectorTemplate.platform_id == platform.id,
        ConnectorTemplate.template_id == payload.template_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=409, detail="Template ID already exists for this platform")
    
    template = ConnectorTemplate(
        platform_id=platform.id,
        template_id=payload.template_id,
        name=payload.name,
        description=payload.description,
        action_type=payload.action_type,
        http_method=payload.http_method,
        endpoint_path=payload.endpoint_path,
        headers=payload.headers or {},
        request_template=payload.request_template or {},
        content_type=payload.content_type,
        query_params=payload.query_params or {},
        response_parser=payload.response_parser or {},
        success_condition=payload.success_condition,
        input_schema=payload.input_schema or {},
        output_schema=payload.output_schema or {},
        rate_limit_requests=payload.rate_limit_requests,
        rate_limit_window_seconds=payload.rate_limit_window_seconds,
        retry_on_status=payload.retry_on_status or [429, 500, 502, 503, 504],
        max_retries=payload.max_retries,
        retry_delay_seconds=payload.retry_delay_seconds,
        is_active=True,
        is_default=payload.is_default,
        created_by_id=current_user.id,
        updated_by_id=current_user.id
    )
    
    db.add(template)
    db.commit()
    db.refresh(template)
    
    logger.info("template_created", 
                platform_id=platform_id, 
                template_id=template.template_id,
                user_id=current_user.id)
    
    return TemplateResponse.model_validate(template)


@router.get("/templates/{template_db_id}", response_model=TemplateResponse)
def get_template(
    template_db_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific template by database ID."""
    template = db.query(ConnectorTemplate).filter(ConnectorTemplate.id == template_db_id).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return TemplateResponse.model_validate(template)


@router.patch("/templates/{template_db_id}", response_model=TemplateResponse)
def update_template(
    template_db_id: int,
    payload: TemplateUpdate,
    current_user: User = Depends(require_permission(Permission.MANAGE_CONNECTORS.value)),
    db: Session = Depends(get_db)
):
    """Update a connector template."""
    template = db.query(ConnectorTemplate).filter(ConnectorTemplate.id == template_db_id).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(template, field, value)
    
    template.updated_by_id = current_user.id
    
    db.commit()
    db.refresh(template)
    
    logger.info("template_updated", template_id=template.id, user_id=current_user.id)
    
    return TemplateResponse.model_validate(template)


@router.delete("/templates/{template_db_id}")
def delete_template(
    template_db_id: int,
    current_user: User = Depends(require_permission(Permission.MANAGE_CONNECTORS.value)),
    db: Session = Depends(get_db)
):
    """Delete a connector template."""
    template = db.query(ConnectorTemplate).filter(ConnectorTemplate.id == template_db_id).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    db.delete(template)
    db.commit()
    
    logger.info("template_deleted", template_id=template_db_id, user_id=current_user.id)
    
    return {"message": "Template deleted"}


# ============================================================================
# EXECUTION TRACKING ENDPOINTS
# ============================================================================

@router.get("/executions", response_model=List[ExecutionResponse])
def list_executions(
    platform_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    current_user: User = Depends(require_permission(Permission.MANAGE_CONNECTORS.value)),
    db: Session = Depends(get_db)
):
    """List recent connector executions for debugging."""
    query = db.query(ConnectorExecution)
    
    if platform_id:
        query = query.filter(ConnectorExecution.platform_id == platform_id)
    
    if status:
        query = query.filter(ConnectorExecution.status == status)
    
    executions = query.order_by(ConnectorExecution.executed_at.desc()).limit(limit).all()
    
    return [ExecutionResponse.model_validate(e) for e in executions]


@router.get("/executions/stats")
def get_execution_stats(
    days: int = Query(7, le=30),
    current_user: User = Depends(require_permission(Permission.MANAGE_CONNECTORS.value)),
    db: Session = Depends(get_db)
):
    """Get execution statistics for monitoring."""
    from datetime import timedelta
    
    since = datetime.utcnow() - timedelta(days=days)
    
    executions = db.query(ConnectorExecution).filter(
        ConnectorExecution.executed_at >= since
    ).all()
    
    total = len(executions)
    success = len([e for e in executions if e.status == "success"])
    failed = len([e for e in executions if e.status == "failed"])
    
    # Group by platform
    by_platform = {}
    for e in executions:
        if e.platform_id not in by_platform:
            by_platform[e.platform_id] = {"total": 0, "success": 0, "failed": 0, "avg_response_ms": []}
        by_platform[e.platform_id]["total"] += 1
        if e.status == "success":
            by_platform[e.platform_id]["success"] += 1
        elif e.status == "failed":
            by_platform[e.platform_id]["failed"] += 1
        if e.response_time_ms:
            by_platform[e.platform_id]["avg_response_ms"].append(e.response_time_ms)
    
    # Calculate averages
    for pid, stats in by_platform.items():
        times = stats["avg_response_ms"]
        stats["avg_response_ms"] = sum(times) / len(times) if times else 0
        stats["success_rate"] = stats["success"] / stats["total"] * 100 if stats["total"] > 0 else 0
    
    return {
        "period_days": days,
        "total_executions": total,
        "success_count": success,
        "failed_count": failed,
        "success_rate": success / total * 100 if total > 0 else 0,
        "by_platform": by_platform
    }


@router.post("/platform/{platform}/test")
def test_connector(platform: str, current_user: User = Depends(require_permission(Permission.MANAGE_CONNECTORS.value))):
    """Test connectivity for a connector platform (environment-backed credentials)."""
    connector = get_connector(platform)
    if not connector:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown platform")

    ok = connector.test_connection()
    if ok:
        return {"platform": platform, "ok": True, "message": "connection OK"}
    else:
        return {"platform": platform, "ok": False, "message": f"{platform} credentials not configured"}


@router.post("/{connector_id}/test")
def test_connector_config(connector_id: int, current_user: User = Depends(require_permission(Permission.MANAGE_CONNECTORS.value)), db: Session = Depends(get_db)):
    """Test a saved connector configuration (reads config from DB)."""
    conn = db.query(ConnectorConfig).filter(ConnectorConfig.id == connector_id).first()
    if not conn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connector not found")

    from app.hunts.connectors import test_connector_with_config
    ok, message = test_connector_with_config(conn.connector_type, conn.config or {})

    from datetime import datetime
    conn.last_tested_at = datetime.utcnow()
    conn.last_test_status = "success" if ok else "failed"
    db.commit()
    db.refresh(conn)

    # Audit
    AuditManager.log_event(
        db=db,
        event_type=AuditEventType.CONNECTOR_CONFIG,
        action="tested",
        user_id=current_user.id,
        resource_type="connector",
        resource_id=conn.id,
        details={"ok": ok, "message": message}
    )

    return {"connector_id": conn.id, "ok": ok, "message": message, "last_test_status": conn.last_test_status}


@router.get("/", response_model=list[ConnectorResponse])
def list_connectors(current_user: User = Depends(require_permission(Permission.MANAGE_CONNECTORS.value)), db: Session = Depends(get_db)):
    """List all connector configurations."""
    connectors = db.query(ConnectorConfig).order_by(ConnectorConfig.id).all()
    return [ConnectorResponse.model_validate(c) for c in connectors]


@router.post("/", response_model=ConnectorResponse, status_code=status.HTTP_201_CREATED)
def create_connector(
    payload: ConnectorCreate,
    current_user: User = Depends(require_permission(Permission.MANAGE_CONNECTORS.value)),
    db: Session = Depends(get_db)
):
    """Create a new connector configuration."""
    existing = db.query(ConnectorConfig).filter(ConnectorConfig.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Connector with this name already exists")

    conn = ConnectorConfig(
        name=payload.name,
        connector_type=payload.connector_type,
        config=payload.config or {},
        is_active=payload.is_active if payload.is_active is not None else True
    )
    db.add(conn)
    db.commit()
    db.refresh(conn)

    # Audit
    AuditManager.log_event(
        db=db,
        event_type=AuditEventType.CONNECTOR_CONFIG,
        action="created",
        user_id=current_user.id,
        resource_type="connector",
        resource_id=conn.id,
        details={"name": conn.name}
    )

    logger.info("connector_created", connector_id=conn.id, user_id=current_user.id)

    return ConnectorResponse.model_validate(conn)


@router.get("/{connector_id}", response_model=ConnectorResponse)
def get_connector_config(
    connector_id: int,
    current_user: User = Depends(require_permission(Permission.MANAGE_CONNECTORS.value)),
    db: Session = Depends(get_db)
):
    """Get a connector configuration by id."""
    conn = db.query(ConnectorConfig).filter(ConnectorConfig.id == connector_id).first()
    if not conn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connector not found")
    return ConnectorResponse.model_validate(conn)


@router.patch("/{connector_id}", response_model=ConnectorResponse)
def update_connector_config(
    connector_id: int,
    update: ConnectorUpdate,
    current_user: User = Depends(require_permission(Permission.MANAGE_CONNECTORS.value)),
    db: Session = Depends(get_db)
):
    """Update a connector configuration (partial fields allowed)."""
    conn = db.query(ConnectorConfig).filter(ConnectorConfig.id == connector_id).first()
    if not conn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connector not found")

    if update.name:
        # Ensure uniqueness
        duplicate = db.query(ConnectorConfig).filter(ConnectorConfig.name == update.name, ConnectorConfig.id != connector_id).first()
        if duplicate:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Connector name already in use")
        conn.name = update.name

    if update.config is not None:
        conn.config = update.config

    if update.is_active is not None:
        conn.is_active = update.is_active

    db.commit()
    db.refresh(conn)

    # Audit
    AuditManager.log_event(
        db=db,
        event_type=AuditEventType.CONNECTOR_CONFIG,
        action="updated",
        user_id=current_user.id,
        resource_type="connector",
        resource_id=conn.id,
        details={"name": conn.name}
    )

    logger.info("connector_updated", connector_id=conn.id, user_id=current_user.id)

    return ConnectorResponse.model_validate(conn)


@router.delete("/{connector_id}")
def delete_connector_config(
    connector_id: int,
    current_user: User = Depends(require_permission(Permission.MANAGE_CONNECTORS.value)),
    db: Session = Depends(get_db)
):
    """Delete a connector configuration."""
    conn = db.query(ConnectorConfig).filter(ConnectorConfig.id == connector_id).first()
    if not conn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connector not found")

    db.delete(conn)
    db.commit()

    # Audit
    AuditManager.log_event(
        db=db,
        event_type=AuditEventType.CONNECTOR_CONFIG,
        action="deleted",
        user_id=current_user.id,
        resource_type="connector",
        resource_id=connector_id,
        details={"connector_id": connector_id}
    )

    logger.info("connector_deleted", connector_id=connector_id, user_id=current_user.id)

    return {"message": "Connector deleted"}
