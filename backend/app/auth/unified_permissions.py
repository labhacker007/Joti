"""Unified permissions helper — thin wrapper over rbac.py.

Consumed by /users/my-permissions and admin RBAC endpoints.
Single source of truth is app.auth.rbac.
"""
from typing import List, Dict

from app.models import UserRole
from app.auth.rbac import get_user_permissions, PERMISSION_META, ROLE_META, Permission


def get_role_api_permissions(role: str) -> List[str]:
    """Return all permission strings for a role."""
    try:
        role_enum = UserRole(role)
    except ValueError:
        return []
    return get_user_permissions(role_enum)


def has_api_permission(role: str, permission: str) -> bool:
    """Check if a role has a specific permission."""
    return permission in get_role_api_permissions(role)


def get_all_roles_permissions() -> Dict[str, Dict]:
    """Return complete role → permissions matrix for all roles."""
    result = {}
    for role in UserRole:
        perms = get_user_permissions(role)
        meta = ROLE_META.get(role, {})
        result[role.value] = {
            "label": meta.get("label", role.value),
            "description": meta.get("description", ""),
            "color": meta.get("color", "gray"),
            "permissions": perms,
        }
    return result


def get_role_page_details(role: str) -> List[Dict]:
    """Return page-access details for a role based on its API permissions.

    Used by /users/my-permissions. Returns minimal dicts with {"key": ..., "label": ...}
    so that the frontend can determine which nav items to show.
    """
    api_perms = set(get_role_api_permissions(role))
    # Map permission groups → page keys for frontend nav
    PAGE_MAP = [
        {"key": "feeds",      "label": "Feeds",           "required": "articles:read"},
        {"key": "watchlist",  "label": "Watchlist",        "required": "watchlist:read"},
        {"key": "sources",    "label": "Sources",          "required": "sources:read"},
        {"key": "reports",    "label": "Reports",          "required": "articles:export"},
        {"key": "hunt",       "label": "Hunt Queries",     "required": "articles:analyze"},
        {"key": "admin",      "label": "Admin",            "required": "admin:rbac"},
        {"key": "genai",      "label": "GenAI",            "required": "admin:genai"},
        {"key": "users",      "label": "Users",            "required": "users:manage"},
        {"key": "audit",      "label": "Audit Logs",       "required": "audit:read"},
        {"key": "system",     "label": "System",           "required": "admin:system"},
    ]
    return [p for p in PAGE_MAP if p["required"] in api_perms]


def get_all_permissions_list() -> List[Dict]:
    """Return all 12 permissions with metadata, grouped."""
    return [
        {
            "key": perm.value,
            "label": meta["label"],
            "description": meta["description"],
            "group": meta["group"],
        }
        for perm, meta in PERMISSION_META.items()
    ]
