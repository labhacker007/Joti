"""Role-Based Access Control for J.O.T.I.

Single source of truth: 12 meaningful permissions mapped to 6 roles.
All API enforcement uses require_permission() with these 12 string values.
"""
from typing import List
from enum import Enum
from app.models import UserRole


class Permission(str, Enum):
    """12 canonical permissions covering all J.O.T.I functionality."""

    # ── Articles & Intelligence ───────────────────────────────────────────────
    ARTICLES_READ    = "articles:read"     # View articles, IOCs, TTPs, intelligence
    ARTICLES_EXPORT  = "articles:export"   # Export articles, reports, intelligence data
    ARTICLES_ANALYZE = "articles:analyze"  # AI summarize, extract IOCs/TTPs, change status, triage

    # ── Sources & Feeds ───────────────────────────────────────────────────────
    SOURCES_READ     = "sources:read"      # View feed sources and ingestion logs
    SOURCES_MANAGE   = "sources:manage"    # Create / edit / delete / ingest feed sources

    # ── Watchlist ─────────────────────────────────────────────────────────────
    WATCHLIST_READ   = "watchlist:read"    # View global and personal watchlist keywords
    WATCHLIST_MANAGE = "watchlist:manage"  # Create / edit / delete watchlist keywords

    # ── User Administration ───────────────────────────────────────────────────
    USERS_MANAGE     = "users:manage"      # Create / edit / delete users, assign roles

    # ── Audit ─────────────────────────────────────────────────────────────────
    AUDIT_READ       = "audit:read"        # View and export audit logs

    # ── Admin ─────────────────────────────────────────────────────────────────
    ADMIN_GENAI      = "admin:genai"       # Configure GenAI providers, guardrails, prompts, skills
    ADMIN_RBAC       = "admin:rbac"        # Edit role permissions, manage RBAC settings
    ADMIN_SYSTEM     = "admin:system"      # System settings, connectors, monitoring


# ── Permission metadata (used by admin UI) ────────────────────────────────────

PERMISSION_META = {
    Permission.ARTICLES_READ: {
        "label": "Read Articles",
        "description": "View articles, IOCs, TTPs, and extracted intelligence",
        "group": "Articles & Intelligence",
    },
    Permission.ARTICLES_EXPORT: {
        "label": "Export Articles",
        "description": "Export articles, reports, and intelligence data",
        "group": "Articles & Intelligence",
    },
    Permission.ARTICLES_ANALYZE: {
        "label": "Analyze Articles",
        "description": "AI summarize, extract IOCs/TTPs, triage and change status",
        "group": "Articles & Intelligence",
    },
    Permission.SOURCES_READ: {
        "label": "View Sources",
        "description": "View feed sources and ingestion history",
        "group": "Sources & Feeds",
    },
    Permission.SOURCES_MANAGE: {
        "label": "Manage Sources",
        "description": "Create, edit, delete, and trigger ingestion of feed sources",
        "group": "Sources & Feeds",
    },
    Permission.WATCHLIST_READ: {
        "label": "View Watchlist",
        "description": "View global and personal watchlist keywords",
        "group": "Sources & Feeds",
    },
    Permission.WATCHLIST_MANAGE: {
        "label": "Manage Watchlist",
        "description": "Create, edit, and delete watchlist keywords",
        "group": "Sources & Feeds",
    },
    Permission.USERS_MANAGE: {
        "label": "Manage Users",
        "description": "Create, edit, delete users and assign roles",
        "group": "Administration",
    },
    Permission.AUDIT_READ: {
        "label": "View Audit Logs",
        "description": "View and export system audit logs",
        "group": "Administration",
    },
    Permission.ADMIN_GENAI: {
        "label": "GenAI Settings",
        "description": "Configure GenAI providers, guardrails, prompts and skills",
        "group": "Administration",
    },
    Permission.ADMIN_RBAC: {
        "label": "RBAC Settings",
        "description": "Edit role permissions and manage access control",
        "group": "Administration",
    },
    Permission.ADMIN_SYSTEM: {
        "label": "System Settings",
        "description": "System configuration, connectors, and monitoring",
        "group": "Administration",
    },
}


# ── Role metadata ─────────────────────────────────────────────────────────────

ROLE_META = {
    UserRole.ADMIN: {
        "label": "Administrator",
        "description": "Full system access — manages all settings, users, and data",
        "color": "red",
    },
    UserRole.ANALYST: {
        "label": "Analyst",
        "description": "Threat intel analyst — reads, analyzes, extracts IOCs/TTPs, manages watchlists",
        "color": "blue",
    },
    UserRole.ENGINEER: {
        "label": "Engineer",
        "description": "Technical role — manages sources, connectors, GenAI config, and users",
        "color": "purple",
    },
    UserRole.MANAGER: {
        "label": "Manager",
        "description": "Team lead — views intel and audit logs, exports reports",
        "color": "orange",
    },
    UserRole.EXECUTIVE: {
        "label": "Executive",
        "description": "Read-only access to articles, reports, and audit logs",
        "color": "teal",
    },
    UserRole.VIEWER: {
        "label": "Viewer",
        "description": "Basic read access to articles, sources, and watchlists",
        "color": "gray",
    },
}


# ── Role → Permission mapping (single source of truth) ───────────────────────

ROLE_PERMISSIONS: dict = {

    UserRole.ADMIN: [p.value for p in Permission],  # All 12 permissions

    UserRole.ANALYST: [
        Permission.ARTICLES_READ.value,
        Permission.ARTICLES_EXPORT.value,
        Permission.ARTICLES_ANALYZE.value,
        Permission.SOURCES_READ.value,
        Permission.SOURCES_MANAGE.value,
        Permission.WATCHLIST_READ.value,
        Permission.WATCHLIST_MANAGE.value,
    ],

    UserRole.ENGINEER: [
        Permission.ARTICLES_READ.value,
        Permission.ARTICLES_EXPORT.value,
        Permission.ARTICLES_ANALYZE.value,
        Permission.SOURCES_READ.value,
        Permission.SOURCES_MANAGE.value,
        Permission.WATCHLIST_READ.value,
        Permission.WATCHLIST_MANAGE.value,
        Permission.USERS_MANAGE.value,
        Permission.AUDIT_READ.value,
        Permission.ADMIN_GENAI.value,
        Permission.ADMIN_SYSTEM.value,
    ],

    UserRole.MANAGER: [
        Permission.ARTICLES_READ.value,
        Permission.ARTICLES_EXPORT.value,
        Permission.SOURCES_READ.value,
        Permission.WATCHLIST_READ.value,
        Permission.AUDIT_READ.value,
    ],

    UserRole.EXECUTIVE: [
        Permission.ARTICLES_READ.value,
        Permission.ARTICLES_EXPORT.value,
        Permission.AUDIT_READ.value,
    ],

    UserRole.VIEWER: [
        Permission.ARTICLES_READ.value,
        Permission.SOURCES_READ.value,
        Permission.WATCHLIST_READ.value,
    ],
}


def get_user_permissions(role: UserRole) -> List[str]:
    """Return all permission strings for a given role."""
    return ROLE_PERMISSIONS.get(role, [])


def has_permission(user_role: UserRole, required_permission: str) -> bool:
    """Check whether a role holds the required permission."""
    return required_permission in get_user_permissions(user_role)
