"""
Source refresh/polling settings API.

Provides endpoints for:
1. Admin: Set system-wide default refresh intervals
2. Admin: Set per-source refresh intervals
3. User: Override refresh settings for their own use
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.core.database import get_db
from app.auth.dependencies import get_current_user, require_permission
from app.auth.rbac import Permission
from app.models import (
    User, UserRole, FeedSource, SystemConfiguration, 
    UserSourcePreference, AuditEventType
)
from app.audit.manager import AuditManager
from app.core.logging import logger


router = APIRouter(prefix="/sources/refresh", tags=["Source Refresh Settings"])


# ============ SCHEMAS ============

class SystemRefreshSettings(BaseModel):
    """System-wide default refresh settings."""
    default_refresh_interval_minutes: int = 60  # Default 1 hour
    min_refresh_interval_minutes: int = 5  # Minimum allowed (5 min)
    max_refresh_interval_minutes: int = 1440  # Maximum allowed (24 hours)
    auto_fetch_enabled: bool = True  # Global toggle for auto-fetch
    concurrent_fetch_limit: int = 5  # Max sources to fetch concurrently


class SystemRefreshSettingsResponse(SystemRefreshSettings):
    updated_at: Optional[datetime] = None
    updated_by: Optional[str] = None


class SourceRefreshSettings(BaseModel):
    """Per-source refresh settings (admin)."""
    refresh_interval_minutes: Optional[int] = None  # null = use system default
    auto_fetch_enabled: Optional[bool] = None  # null = use system default


class SourceRefreshSettingsResponse(BaseModel):
    source_id: int
    source_name: str
    refresh_interval_minutes: Optional[int] = None
    auto_fetch_enabled: bool = True
    effective_refresh_interval: int  # Computed: source override or system default
    last_fetched: Optional[datetime] = None
    next_fetch: Optional[datetime] = None


class UserSourcePreferenceRequest(BaseModel):
    """User override for source refresh settings."""
    refresh_interval_minutes: Optional[int] = None
    auto_fetch_enabled: Optional[bool] = None
    is_hidden: Optional[bool] = None
    is_pinned: Optional[bool] = None
    notification_enabled: Optional[bool] = None
    custom_category: Optional[str] = None


class UserSourcePreferenceResponse(BaseModel):
    source_id: int
    source_name: str
    
    # User overrides (null = use source/system default)
    refresh_interval_minutes: Optional[int] = None
    auto_fetch_enabled: Optional[bool] = None
    
    # Display preferences
    is_hidden: bool = False
    is_pinned: bool = False
    notification_enabled: bool = True
    custom_category: Optional[str] = None
    
    # Effective values (after applying overrides)
    effective_refresh_interval: int
    effective_auto_fetch: bool


class RefreshIntervalPreset(BaseModel):
    """Preset refresh interval option."""
    value: int  # minutes
    label: str
    description: str


class DashboardSettings(BaseModel):
    """Dashboard/Operations page settings."""
    default_time_range: str = "24h"  # Default time period for data: 1h, 6h, 12h, 24h, 7d, 30d, all
    auto_refresh_enabled: bool = False  # Auto-refresh on/off - default OFF per user request
    auto_refresh_interval_seconds: int = 60  # Refresh interval in seconds when enabled
    refresh_on_page_load: bool = True  # Always refresh data when page loads
    show_all_tiles: bool = True  # Show all dashboard tiles


class DashboardSettingsResponse(DashboardSettings):
    updated_at: Optional[datetime] = None
    updated_by: Optional[str] = None


class UserDashboardPreference(BaseModel):
    """User override for dashboard settings."""
    time_range: Optional[str] = None  # null = use admin default
    auto_refresh_enabled: Optional[bool] = None  # null = use admin default
    auto_refresh_interval_seconds: Optional[int] = None  # null = use admin default


class UserDashboardPreferenceResponse(UserDashboardPreference):
    effective_time_range: str
    effective_auto_refresh: bool
    effective_refresh_interval: int


# ============ PRESET OPTIONS ============

REFRESH_INTERVAL_PRESETS = [
    RefreshIntervalPreset(value=5, label="5 minutes", description="Very frequent - for critical sources"),
    RefreshIntervalPreset(value=15, label="15 minutes", description="Frequent updates"),
    RefreshIntervalPreset(value=30, label="30 minutes", description="Regular updates"),
    RefreshIntervalPreset(value=60, label="1 hour", description="Standard (recommended)"),
    RefreshIntervalPreset(value=120, label="2 hours", description="Less frequent"),
    RefreshIntervalPreset(value=360, label="6 hours", description="Periodic updates"),
    RefreshIntervalPreset(value=720, label="12 hours", description="Twice daily"),
    RefreshIntervalPreset(value=1440, label="24 hours", description="Daily updates"),
]

# Dashboard time range presets
DASHBOARD_TIME_RANGE_PRESETS = [
    {"value": "1h", "label": "Last 1 hour"},
    {"value": "6h", "label": "Last 6 hours"},
    {"value": "12h", "label": "Last 12 hours"},
    {"value": "24h", "label": "Last 24 hours"},
    {"value": "7d", "label": "Last 7 days"},
    {"value": "30d", "label": "Last 30 days"},
    {"value": "all", "label": "All time"},
]

# Dashboard auto-refresh interval presets (in seconds)
DASHBOARD_REFRESH_INTERVAL_PRESETS = [
    {"value": 30, "label": "30 seconds"},
    {"value": 60, "label": "1 minute"},
    {"value": 120, "label": "2 minutes"},
    {"value": 300, "label": "5 minutes"},
    {"value": 600, "label": "10 minutes"},
]


# ============ HELPER FUNCTIONS ============

def get_system_refresh_settings(db: Session) -> SystemRefreshSettings:
    """Get system-wide default refresh settings from database."""
    settings = SystemRefreshSettings()
    
    # Load from SystemConfiguration
    configs = db.query(SystemConfiguration).filter(
        SystemConfiguration.category == "source_refresh"
    ).all()
    
    for config in configs:
        if config.key == "default_refresh_interval_minutes":
            settings.default_refresh_interval_minutes = int(config.value) if config.value else 60
        elif config.key == "min_refresh_interval_minutes":
            settings.min_refresh_interval_minutes = int(config.value) if config.value else 5
        elif config.key == "max_refresh_interval_minutes":
            settings.max_refresh_interval_minutes = int(config.value) if config.value else 1440
        elif config.key == "auto_fetch_enabled":
            settings.auto_fetch_enabled = config.value.lower() == "true" if config.value else True
        elif config.key == "concurrent_fetch_limit":
            settings.concurrent_fetch_limit = int(config.value) if config.value else 5
    
    return settings


def save_system_setting(db: Session, key: str, value: str, user_id: int, description: str = None, category: str = "source_refresh"):
    """Save a system setting."""
    config = db.query(SystemConfiguration).filter(
        SystemConfiguration.category == category,
        SystemConfiguration.key == key
    ).first()
    
    if config:
        config.value = value
        config.updated_by = user_id
        config.updated_at = datetime.utcnow()
    else:
        config = SystemConfiguration(
            category=category,
            key=key,
            value=value,
            value_type="int" if key.endswith("_minutes") or key.endswith("_limit") or key.endswith("_seconds") else ("bool" if key.endswith("_enabled") else "string"),
            description=description,
            updated_by=user_id
        )
        db.add(config)


def get_dashboard_settings(db: Session) -> DashboardSettings:
    """Get dashboard/operations page settings from database."""
    settings = DashboardSettings()
    
    # Load from SystemConfiguration
    configs = db.query(SystemConfiguration).filter(
        SystemConfiguration.category == "dashboard"
    ).all()
    
    for config in configs:
        if config.key == "default_time_range":
            settings.default_time_range = config.value if config.value else "24h"
        elif config.key == "auto_refresh_enabled":
            settings.auto_refresh_enabled = config.value.lower() == "true" if config.value else False
        elif config.key == "auto_refresh_interval_seconds":
            settings.auto_refresh_interval_seconds = int(config.value) if config.value else 60
        elif config.key == "refresh_on_page_load":
            settings.refresh_on_page_load = config.value.lower() == "true" if config.value else True
        elif config.key == "show_all_tiles":
            settings.show_all_tiles = config.value.lower() == "true" if config.value else True
    
    return settings


def get_user_dashboard_preference(db: Session, user_id: int) -> Optional[dict]:
    """Get user's dashboard preference overrides from SystemConfiguration."""
    configs = db.query(SystemConfiguration).filter(
        SystemConfiguration.category == f"dashboard_user_{user_id}"
    ).all()
    
    if not configs:
        return None
    
    prefs = {}
    for config in configs:
        if config.key == "time_range":
            prefs["time_range"] = config.value
        elif config.key == "auto_refresh_enabled":
            prefs["auto_refresh_enabled"] = config.value.lower() == "true" if config.value else None
        elif config.key == "auto_refresh_interval_seconds":
            prefs["auto_refresh_interval_seconds"] = int(config.value) if config.value else None
    
    return prefs if prefs else None


def get_effective_refresh_interval(
    source: FeedSource, 
    user_pref: Optional[UserSourcePreference],
    system_settings: SystemRefreshSettings
) -> int:
    """Calculate the effective refresh interval for a source.
    
    Priority order:
    1. User preference (if set and user is viewing)
    2. Source-level setting (admin configured)
    3. System default
    """
    # User preference takes priority (for their own view)
    if user_pref and user_pref.refresh_interval_minutes is not None:
        return user_pref.refresh_interval_minutes
    
    # Source-level override
    if source.refresh_interval_minutes is not None:
        return source.refresh_interval_minutes
    
    # System default
    return system_settings.default_refresh_interval_minutes


def get_effective_auto_fetch(
    source: FeedSource,
    user_pref: Optional[UserSourcePreference],
    system_settings: SystemRefreshSettings
) -> bool:
    """Calculate effective auto-fetch status."""
    # Global toggle takes precedence
    if not system_settings.auto_fetch_enabled:
        return False
    
    # User preference (for their view)
    if user_pref and user_pref.auto_fetch_enabled is not None:
        return user_pref.auto_fetch_enabled
    
    # Source-level setting
    if source.auto_fetch_enabled is not None:
        return source.auto_fetch_enabled
    
    return True


# ============ ADMIN ENDPOINTS ============

@router.get("/presets")
def get_refresh_presets():
    """Get available refresh interval presets."""
    return {
        "presets": [p.model_dump() for p in REFRESH_INTERVAL_PRESETS]
    }


@router.get("/system", response_model=SystemRefreshSettingsResponse)
def get_system_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get system-wide default refresh settings."""
    settings = get_system_refresh_settings(db)
    
    # Get last updated info
    last_config = db.query(SystemConfiguration).filter(
        SystemConfiguration.category == "source_refresh"
    ).order_by(SystemConfiguration.updated_at.desc()).first()
    
    updated_by = None
    if last_config and last_config.updated_by:
        user = db.query(User).filter(User.id == last_config.updated_by).first()
        updated_by = user.username if user else None
    
    return SystemRefreshSettingsResponse(
        **settings.model_dump(),
        updated_at=last_config.updated_at if last_config else None,
        updated_by=updated_by
    )


@router.put("/system", response_model=SystemRefreshSettingsResponse)
def update_system_settings(
    settings: SystemRefreshSettings,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.MANAGE_SOURCES.value))
):
    """Update system-wide default refresh settings (admin only)."""
    # Validate
    if settings.min_refresh_interval_minutes < 1:
        raise HTTPException(status_code=400, detail="Minimum refresh interval must be at least 1 minute")
    if settings.max_refresh_interval_minutes < settings.min_refresh_interval_minutes:
        raise HTTPException(status_code=400, detail="Maximum must be greater than minimum")
    if settings.default_refresh_interval_minutes < settings.min_refresh_interval_minutes:
        raise HTTPException(status_code=400, detail="Default must be >= minimum")
    if settings.default_refresh_interval_minutes > settings.max_refresh_interval_minutes:
        raise HTTPException(status_code=400, detail="Default must be <= maximum")
    
    # Save each setting
    save_system_setting(db, "default_refresh_interval_minutes", 
                       str(settings.default_refresh_interval_minutes), current_user.id,
                       "Default refresh interval for sources in minutes")
    save_system_setting(db, "min_refresh_interval_minutes",
                       str(settings.min_refresh_interval_minutes), current_user.id,
                       "Minimum allowed refresh interval")
    save_system_setting(db, "max_refresh_interval_minutes",
                       str(settings.max_refresh_interval_minutes), current_user.id,
                       "Maximum allowed refresh interval")
    save_system_setting(db, "auto_fetch_enabled",
                       str(settings.auto_fetch_enabled).lower(), current_user.id,
                       "Global toggle for automatic source fetching")
    save_system_setting(db, "concurrent_fetch_limit",
                       str(settings.concurrent_fetch_limit), current_user.id,
                       "Maximum concurrent source fetch operations")
    
    db.commit()
    
    # Audit log
    AuditManager.log_event(
        db=db,
        event_type=AuditEventType.SYSTEM_CONFIG,
        action="Updated source refresh system settings",
        user_id=current_user.id,
        details={
            "default_interval": settings.default_refresh_interval_minutes,
            "auto_fetch": settings.auto_fetch_enabled
        }
    )
    
    logger.info("system_refresh_settings_updated", 
               user_id=current_user.id,
               default_interval=settings.default_refresh_interval_minutes)
    
    return SystemRefreshSettingsResponse(
        **settings.model_dump(),
        updated_at=datetime.utcnow(),
        updated_by=current_user.username
    )


@router.get("/sources", response_model=List[SourceRefreshSettingsResponse])
def get_all_source_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get refresh settings for all sources."""
    system_settings = get_system_refresh_settings(db)
    sources = db.query(FeedSource).filter(FeedSource.is_active == True).all()
    
    result = []
    for source in sources:
        effective_interval = source.refresh_interval_minutes or system_settings.default_refresh_interval_minutes
        
        result.append(SourceRefreshSettingsResponse(
            source_id=source.id,
            source_name=source.name,
            refresh_interval_minutes=source.refresh_interval_minutes,
            auto_fetch_enabled=source.auto_fetch_enabled if source.auto_fetch_enabled is not None else True,
            effective_refresh_interval=effective_interval,
            last_fetched=source.last_fetched,
            next_fetch=source.next_fetch
        ))
    
    return result


@router.put("/sources/{source_id}", response_model=SourceRefreshSettingsResponse)
def update_source_settings(
    source_id: int,
    settings: SourceRefreshSettings,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.MANAGE_SOURCES.value))
):
    """Update refresh settings for a specific source (admin only)."""
    source = db.query(FeedSource).filter(FeedSource.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    system_settings = get_system_refresh_settings(db)
    
    # Validate interval if provided
    if settings.refresh_interval_minutes is not None:
        if settings.refresh_interval_minutes < system_settings.min_refresh_interval_minutes:
            raise HTTPException(
                status_code=400, 
                detail=f"Refresh interval must be at least {system_settings.min_refresh_interval_minutes} minutes"
            )
        if settings.refresh_interval_minutes > system_settings.max_refresh_interval_minutes:
            raise HTTPException(
                status_code=400,
                detail=f"Refresh interval cannot exceed {system_settings.max_refresh_interval_minutes} minutes"
            )
    
    # Update source
    source.refresh_interval_minutes = settings.refresh_interval_minutes
    if settings.auto_fetch_enabled is not None:
        source.auto_fetch_enabled = settings.auto_fetch_enabled
    
    db.commit()
    db.refresh(source)
    
    effective_interval = source.refresh_interval_minutes or system_settings.default_refresh_interval_minutes
    
    logger.info("source_refresh_settings_updated",
               source_id=source_id,
               user_id=current_user.id,
               interval=settings.refresh_interval_minutes)
    
    return SourceRefreshSettingsResponse(
        source_id=source.id,
        source_name=source.name,
        refresh_interval_minutes=source.refresh_interval_minutes,
        auto_fetch_enabled=source.auto_fetch_enabled if source.auto_fetch_enabled is not None else True,
        effective_refresh_interval=effective_interval,
        last_fetched=source.last_fetched,
        next_fetch=source.next_fetch
    )


# ============ USER PREFERENCE ENDPOINTS ============

@router.get("/my-preferences", response_model=List[UserSourcePreferenceResponse])
def get_my_source_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's source preference overrides."""
    system_settings = get_system_refresh_settings(db)
    sources = db.query(FeedSource).filter(FeedSource.is_active == True).all()
    
    # Get user preferences
    user_prefs = {p.source_id: p for p in db.query(UserSourcePreference).filter(
        UserSourcePreference.user_id == current_user.id
    ).all()}
    
    result = []
    for source in sources:
        pref = user_prefs.get(source.id)
        
        effective_interval = get_effective_refresh_interval(source, pref, system_settings)
        effective_auto_fetch = get_effective_auto_fetch(source, pref, system_settings)
        
        result.append(UserSourcePreferenceResponse(
            source_id=source.id,
            source_name=source.name,
            refresh_interval_minutes=pref.refresh_interval_minutes if pref else None,
            auto_fetch_enabled=pref.auto_fetch_enabled if pref else None,
            is_hidden=pref.is_hidden if pref else False,
            is_pinned=pref.is_pinned if pref else False,
            notification_enabled=pref.notification_enabled if pref else True,
            custom_category=pref.custom_category if pref else None,
            effective_refresh_interval=effective_interval,
            effective_auto_fetch=effective_auto_fetch
        ))
    
    return result


@router.put("/my-preferences/{source_id}", response_model=UserSourcePreferenceResponse)
def update_my_source_preference(
    source_id: int,
    request: UserSourcePreferenceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update user's preference override for a specific source."""
    source = db.query(FeedSource).filter(FeedSource.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    system_settings = get_system_refresh_settings(db)
    
    # Validate interval if provided
    if request.refresh_interval_minutes is not None:
        if request.refresh_interval_minutes < system_settings.min_refresh_interval_minutes:
            raise HTTPException(
                status_code=400,
                detail=f"Refresh interval must be at least {system_settings.min_refresh_interval_minutes} minutes"
            )
        if request.refresh_interval_minutes > system_settings.max_refresh_interval_minutes:
            raise HTTPException(
                status_code=400,
                detail=f"Refresh interval cannot exceed {system_settings.max_refresh_interval_minutes} minutes"
            )
    
    # Get or create preference
    pref = db.query(UserSourcePreference).filter(
        UserSourcePreference.user_id == current_user.id,
        UserSourcePreference.source_id == source_id
    ).first()
    
    if not pref:
        pref = UserSourcePreference(
            user_id=current_user.id,
            source_id=source_id
        )
        db.add(pref)
    
    # Update fields
    if request.refresh_interval_minutes is not None:
        pref.refresh_interval_minutes = request.refresh_interval_minutes
    if request.auto_fetch_enabled is not None:
        pref.auto_fetch_enabled = request.auto_fetch_enabled
    if request.is_hidden is not None:
        pref.is_hidden = request.is_hidden
    if request.is_pinned is not None:
        pref.is_pinned = request.is_pinned
    if request.notification_enabled is not None:
        pref.notification_enabled = request.notification_enabled
    if request.custom_category is not None:
        pref.custom_category = request.custom_category
    
    pref.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(pref)
    
    effective_interval = get_effective_refresh_interval(source, pref, system_settings)
    effective_auto_fetch = get_effective_auto_fetch(source, pref, system_settings)
    
    logger.info("user_source_preference_updated",
               user_id=current_user.id,
               source_id=source_id)
    
    return UserSourcePreferenceResponse(
        source_id=source.id,
        source_name=source.name,
        refresh_interval_minutes=pref.refresh_interval_minutes,
        auto_fetch_enabled=pref.auto_fetch_enabled,
        is_hidden=pref.is_hidden,
        is_pinned=pref.is_pinned,
        notification_enabled=pref.notification_enabled,
        custom_category=pref.custom_category,
        effective_refresh_interval=effective_interval,
        effective_auto_fetch=effective_auto_fetch
    )


@router.delete("/my-preferences/{source_id}")
def reset_my_source_preference(
    source_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reset user's preference for a source to system/admin defaults."""
    pref = db.query(UserSourcePreference).filter(
        UserSourcePreference.user_id == current_user.id,
        UserSourcePreference.source_id == source_id
    ).first()
    
    if pref:
        db.delete(pref)
        db.commit()
        logger.info("user_source_preference_reset",
                   user_id=current_user.id,
                   source_id=source_id)
    
    return {"message": "Preference reset to default"}


# ============ DASHBOARD/OPERATIONS PAGE SETTINGS ============

@router.get("/dashboard/presets")
def get_dashboard_presets():
    """Get available presets for dashboard settings."""
    return {
        "time_range_presets": DASHBOARD_TIME_RANGE_PRESETS,
        "refresh_interval_presets": DASHBOARD_REFRESH_INTERVAL_PRESETS
    }


@router.get("/dashboard/settings", response_model=DashboardSettingsResponse)
def get_dashboard_system_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get system-wide dashboard settings (admin defaults)."""
    settings = get_dashboard_settings(db)
    
    # Get last updated info
    last_config = db.query(SystemConfiguration).filter(
        SystemConfiguration.category == "dashboard"
    ).order_by(SystemConfiguration.updated_at.desc()).first()
    
    updated_by = None
    if last_config and last_config.updated_by:
        user = db.query(User).filter(User.id == last_config.updated_by).first()
        updated_by = user.username if user else None
    
    return DashboardSettingsResponse(
        **settings.model_dump(),
        updated_at=last_config.updated_at if last_config else None,
        updated_by=updated_by
    )


@router.put("/dashboard/settings", response_model=DashboardSettingsResponse)
def update_dashboard_system_settings(
    settings: DashboardSettings,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.MANAGE_SOURCES.value))
):
    """Update system-wide dashboard settings (admin only)."""
    # Validate time range
    valid_ranges = [p["value"] for p in DASHBOARD_TIME_RANGE_PRESETS]
    if settings.default_time_range not in valid_ranges:
        raise HTTPException(status_code=400, detail=f"Invalid time range. Must be one of: {valid_ranges}")
    
    # Validate refresh interval
    if settings.auto_refresh_interval_seconds < 10:
        raise HTTPException(status_code=400, detail="Refresh interval must be at least 10 seconds")
    if settings.auto_refresh_interval_seconds > 3600:
        raise HTTPException(status_code=400, detail="Refresh interval cannot exceed 1 hour")
    
    # Save settings
    save_system_setting(db, "default_time_range", settings.default_time_range, 
                       current_user.id, "Default time range for dashboard data", "dashboard")
    save_system_setting(db, "auto_refresh_enabled", str(settings.auto_refresh_enabled).lower(),
                       current_user.id, "Enable auto-refresh on dashboard", "dashboard")
    save_system_setting(db, "auto_refresh_interval_seconds", str(settings.auto_refresh_interval_seconds),
                       current_user.id, "Auto-refresh interval in seconds", "dashboard")
    save_system_setting(db, "refresh_on_page_load", str(settings.refresh_on_page_load).lower(),
                       current_user.id, "Refresh data when page loads", "dashboard")
    save_system_setting(db, "show_all_tiles", str(settings.show_all_tiles).lower(),
                       current_user.id, "Show all dashboard tiles", "dashboard")
    
    db.commit()
    
    # Audit log
    AuditManager.log_event(
        db=db,
        event_type=AuditEventType.SYSTEM_CONFIG,
        action="Updated dashboard settings",
        user_id=current_user.id,
        details={
            "default_time_range": settings.default_time_range,
            "auto_refresh_enabled": settings.auto_refresh_enabled,
            "auto_refresh_interval_seconds": settings.auto_refresh_interval_seconds
        }
    )
    
    logger.info("dashboard_settings_updated",
               user_id=current_user.id,
               time_range=settings.default_time_range,
               auto_refresh=settings.auto_refresh_enabled)
    
    return DashboardSettingsResponse(
        **settings.model_dump(),
        updated_at=datetime.utcnow(),
        updated_by=current_user.username
    )


@router.get("/dashboard/my-preferences", response_model=UserDashboardPreferenceResponse)
def get_my_dashboard_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's dashboard preference overrides."""
    admin_settings = get_dashboard_settings(db)
    user_prefs = get_user_dashboard_preference(db, current_user.id)
    
    # Calculate effective values
    effective_time_range = admin_settings.default_time_range
    effective_auto_refresh = admin_settings.auto_refresh_enabled
    effective_refresh_interval = admin_settings.auto_refresh_interval_seconds
    
    if user_prefs:
        if user_prefs.get("time_range"):
            effective_time_range = user_prefs["time_range"]
        if user_prefs.get("auto_refresh_enabled") is not None:
            effective_auto_refresh = user_prefs["auto_refresh_enabled"]
        if user_prefs.get("auto_refresh_interval_seconds"):
            effective_refresh_interval = user_prefs["auto_refresh_interval_seconds"]
    
    return UserDashboardPreferenceResponse(
        time_range=user_prefs.get("time_range") if user_prefs else None,
        auto_refresh_enabled=user_prefs.get("auto_refresh_enabled") if user_prefs else None,
        auto_refresh_interval_seconds=user_prefs.get("auto_refresh_interval_seconds") if user_prefs else None,
        effective_time_range=effective_time_range,
        effective_auto_refresh=effective_auto_refresh,
        effective_refresh_interval=effective_refresh_interval
    )


@router.put("/dashboard/my-preferences", response_model=UserDashboardPreferenceResponse)
def update_my_dashboard_preferences(
    request: UserDashboardPreference,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update user's dashboard preference overrides."""
    admin_settings = get_dashboard_settings(db)
    category = f"dashboard_user_{current_user.id}"
    
    # Validate time range if provided
    if request.time_range:
        valid_ranges = [p["value"] for p in DASHBOARD_TIME_RANGE_PRESETS]
        if request.time_range not in valid_ranges:
            raise HTTPException(status_code=400, detail=f"Invalid time range. Must be one of: {valid_ranges}")
        save_system_setting(db, "time_range", request.time_range, current_user.id, 
                           "User dashboard time range preference", category)
    
    if request.auto_refresh_enabled is not None:
        save_system_setting(db, "auto_refresh_enabled", str(request.auto_refresh_enabled).lower(),
                           current_user.id, "User auto-refresh preference", category)
    
    if request.auto_refresh_interval_seconds is not None:
        if request.auto_refresh_interval_seconds < 10:
            raise HTTPException(status_code=400, detail="Refresh interval must be at least 10 seconds")
        save_system_setting(db, "auto_refresh_interval_seconds", str(request.auto_refresh_interval_seconds),
                           current_user.id, "User refresh interval preference", category)
    
    db.commit()
    
    # Get updated preferences
    user_prefs = get_user_dashboard_preference(db, current_user.id)
    
    # Calculate effective values
    effective_time_range = user_prefs.get("time_range") if user_prefs and user_prefs.get("time_range") else admin_settings.default_time_range
    effective_auto_refresh = user_prefs.get("auto_refresh_enabled") if user_prefs and user_prefs.get("auto_refresh_enabled") is not None else admin_settings.auto_refresh_enabled
    effective_refresh_interval = user_prefs.get("auto_refresh_interval_seconds") if user_prefs and user_prefs.get("auto_refresh_interval_seconds") else admin_settings.auto_refresh_interval_seconds
    
    logger.info("user_dashboard_preference_updated", user_id=current_user.id)
    
    return UserDashboardPreferenceResponse(
        time_range=user_prefs.get("time_range") if user_prefs else None,
        auto_refresh_enabled=user_prefs.get("auto_refresh_enabled") if user_prefs else None,
        auto_refresh_interval_seconds=user_prefs.get("auto_refresh_interval_seconds") if user_prefs else None,
        effective_time_range=effective_time_range,
        effective_auto_refresh=effective_auto_refresh,
        effective_refresh_interval=effective_refresh_interval
    )


@router.delete("/dashboard/my-preferences")
def reset_my_dashboard_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reset user's dashboard preferences to admin defaults."""
    category = f"dashboard_user_{current_user.id}"
    
    configs = db.query(SystemConfiguration).filter(
        SystemConfiguration.category == category
    ).all()
    
    for config in configs:
        db.delete(config)
    
    db.commit()
    
    logger.info("user_dashboard_preference_reset", user_id=current_user.id)
    
    return {"message": "Dashboard preferences reset to admin defaults"}
