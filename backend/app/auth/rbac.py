from typing import Optional, List
from enum import Enum
from app.models import UserRole


class Permission(str, Enum):
    """Fine-grained permissions for Jyoti - News Feed Aggregator.

    Jyoti is a lightweight news aggregator with two roles: ADMIN and VIEWER.
    This simplified permission set focuses only on news/feeds functionality.

    NOTE: All legacy Parshu permissions are mapped to basic Jyoti permissions
    to maintain backward compatibility with existing code that hasn't been refactored.
    """

    # ============================================
    # CORE JYOTI PERMISSIONS
    # ============================================
    READ_ARTICLES = "read:articles"
    EXPORT_ARTICLES = "export:articles"
    MANAGE_SOURCES = "manage:sources"
    MANAGE_GLOBAL_WATCHLIST = "manage:global_watchlist"
    MANAGE_PERSONAL_WATCHLIST = "manage:personal_watchlist"
    MANAGE_USER_FEEDS = "manage:user_feeds"
    MANAGE_USERS = "manage:users"
    VIEW_AUDIT_LOGS = "view:audit_logs"

    # ============================================
    # LEGACY PERMISSIONS (Mapped for backward compatibility)
    # ============================================
    # Articles
    ANALYZE_ARTICLES = "read:articles"
    TRIAGE_ARTICLES = "read:articles"
    ARTICLES_VIEW = "read:articles"
    ARTICLES_VIEW_CONTENT = "read:articles"
    ARTICLES_VIEW_DETAILS = "read:articles"
    ARTICLES_VIEW_INTELLIGENCE = "read:articles"
    ARTICLES_VIEW_HUNTS = "read:articles"
    ARTICLES_VIEW_COMMENTS = "read:articles"
    ARTICLES_EDIT = "read:articles"
    ARTICLES_DELETE = "read:articles"
    ARTICLES_CREATE = "read:articles"
    ARTICLES_ASSIGN = "read:articles"
    ARTICLES_CHANGE_STATUS = "read:articles"
    ARTICLES_ADD_TAGS = "read:articles"
    ARTICLES_ADD_COMMENT = "read:articles"
    ARTICLES_EDIT_COMMENT = "read:articles"
    ARTICLES_DELETE_COMMENT = "read:articles"
    ARTICLES_EXPORT = "export:articles"
    ARTICLES_BULK_ACTION = "read:articles"
    ARTICLES_TRIAGE = "read:articles"

    # Intelligence
    READ_INTELLIGENCE = "read:articles"
    EXTRACT_INTELLIGENCE = "read:articles"
    INTELLIGENCE_VIEW = "read:articles"
    INTELLIGENCE_CREATE = "read:articles"
    INTELLIGENCE_EDIT = "read:articles"
    INTELLIGENCE_DELETE = "read:articles"
    INTELLIGENCE_EXPORT = "export:articles"
    INTELLIGENCE_EXTRACT = "read:articles"
    INTELLIGENCE_ENRICH = "read:articles"
    INTELLIGENCE_MARK_FALSE_POSITIVE = "read:articles"
    DELETE_ARTICLE_INTELLIGENCE = "read:articles"
    EDIT_ARTICLE_INTELLIGENCE = "read:articles"
    DELETE_INTELLIGENCE = "read:articles"
    EDIT_INTELLIGENCE = "read:articles"
    EXPORT_INTELLIGENCE = "export:articles"

    # IOCs
    IOC_VIEW = "read:articles"
    IOC_CREATE = "read:articles"
    IOC_EDIT = "read:articles"
    IOC_DELETE = "read:articles"
    IOC_EXPORT = "export:articles"
    IOC_SEARCH = "read:articles"
    IOC_ENRICH = "read:articles"
    IOC_VIEW_TIMELINE = "read:articles"

    # Sources
    READ_SOURCES = "read:articles"
    SOURCES_VIEW = "read:articles"
    SOURCES_CREATE = "manage:sources"
    SOURCES_EDIT = "manage:sources"
    SOURCES_DELETE = "manage:sources"
    SOURCES_ENABLE = "manage:sources"
    SOURCES_DISABLE = "manage:sources"
    SOURCES_TEST = "manage:sources"
    SOURCES_INGEST = "manage:sources"
    VIEW_SOURCES = "read:articles"
    MANAGE_FEED_SOURCES = "manage:sources"

    # Feed
    FEED_VIEW = "read:articles"
    FEED_READ = "read:articles"
    FEED_SEARCH = "read:articles"
    FEED_FILTER = "read:articles"
    FEED_STAR = "read:articles"
    FEED_ADD_SOURCE = "manage:user_feeds"
    FEED_REMOVE_SOURCE = "manage:user_feeds"
    FEED_MANAGE_SOURCES = "manage:user_feeds"
    VIEW_FEED = "read:articles"

    # Watchlist
    MANAGE_WATCHLIST = "manage:global_watchlist"
    MANAGE_WATCHLISTS = "manage:global_watchlist"
    WATCHLIST_VIEW = "manage:personal_watchlist"
    WATCHLIST_CREATE = "manage:personal_watchlist"
    WATCHLIST_EDIT = "manage:personal_watchlist"
    WATCHLIST_DELETE = "manage:personal_watchlist"
    WATCHLIST_IMPORT = "manage:personal_watchlist"
    WATCHLIST_EXPORT = "export:articles"
    VIEW_WATCHLIST = "manage:personal_watchlist"

    # Hunts (legacy, not used in Jyoti)
    HUNTS_VIEW = "manage:users"
    HUNTS_CREATE = "manage:users"
    HUNTS_EDIT = "manage:users"
    HUNTS_DELETE = "manage:users"
    HUNTS_EXECUTE = "manage:users"
    HUNTS_STOP = "manage:users"
    HUNTS_SCHEDULE = "manage:users"
    HUNTS_CLONE = "manage:users"
    HUNTS_VIEW_RESULTS = "manage:users"
    HUNTS_EXPORT_RESULTS = "manage:users"
    CREATE_HUNTS = "manage:users"
    DELETE_HUNTS = "manage:users"
    EDIT_HUNTS = "manage:users"
    EXECUTE_HUNTS = "manage:users"
    VIEW_HUNTS = "manage:users"
    VIEW_HUNT_RESULTS = "manage:users"
    CREATE_REPORTS = "manage:users"

    # Reports (legacy, not used in Jyoti)
    REPORTS_VIEW = "manage:users"
    REPORTS_CREATE = "manage:users"
    REPORTS_EDIT = "manage:users"
    REPORTS_DELETE = "manage:users"
    REPORTS_PUBLISH = "manage:users"
    REPORTS_SHARE = "manage:users"
    REPORTS_EXPORT = "manage:users"
    REPORTS_GENERATE = "manage:users"
    REPORTS_APPROVE = "manage:users"
    REPORTS_VIEW_DRAFT = "manage:users"
    DELETE_REPORTS = "manage:users"
    EDIT_REPORTS = "manage:users"
    EXPORT_REPORTS = "manage:users"
    PUBLISH_REPORTS = "manage:users"
    SHARE_REPORTS = "manage:users"
    VIEW_REPORTS = "manage:users"

    # Connectors (legacy, not used in Jyoti)
    MANAGE_CONNECTORS = "manage:users"
    CONNECTORS_VIEW = "manage:users"
    CONNECTORS_CREATE = "manage:users"
    CONNECTORS_EDIT = "manage:users"
    CONNECTORS_DELETE = "manage:users"
    CONNECTORS_ENABLE = "manage:users"
    CONNECTORS_DISABLE = "manage:users"
    CONNECTORS_TEST = "manage:users"
    CONNECTORS_VIEW_LOGS = "manage:users"
    TEST_CONNECTORS = "manage:users"
    VIEW_CONNECTORS = "manage:users"

    # Audit
    AUDIT_VIEW = "view:audit_logs"
    AUDIT_EXPORT = "view:audit_logs"
    AUDIT_SEARCH = "view:audit_logs"
    AUDIT_VIEW_DETAILS = "view:audit_logs"
    VIEW_AUDIT = "view:audit_logs"
    EXPORT_AUDIT = "view:audit_logs"

    # Dashboard (legacy, not used in Jyoti)
    DASHBOARD_VIEW = "read:articles"
    DASHBOARD_VIEW_STATS = "read:articles"
    DASHBOARD_VIEW_CHARTS = "read:articles"
    DASHBOARD_EXPORT = "export:articles"
    VIEW_DASHBOARD = "read:articles"

    # Chatbot (legacy, not used in Jyoti)
    CHATBOT_USE = "read:articles"
    CHATBOT_VIEW_HISTORY = "read:articles"
    CHATBOT_CLEAR_HISTORY = "read:articles"
    CHATBOT_PROVIDE_FEEDBACK = "read:articles"
    USE_CHATBOT = "read:articles"
    VIEW_CHATBOT_HISTORY = "read:articles"

    # Admin Users
    ADMIN_USERS_VIEW = "manage:users"
    ADMIN_USERS_CREATE = "manage:users"
    ADMIN_USERS_EDIT = "manage:users"
    ADMIN_USERS_DELETE = "manage:users"
    ADMIN_USERS_CHANGE_ROLE = "manage:users"
    ADMIN_USERS_RESET_PASSWORD = "manage:users"

    # Admin RBAC
    ADMIN_RBAC_VIEW = "manage:users"
    ADMIN_RBAC_EDIT_ROLES = "manage:users"
    ADMIN_RBAC_EDIT_PERMISSIONS = "manage:users"
    ADMIN_RBAC_USER_OVERRIDES = "manage:users"
    MANAGE_RBAC = "manage:users"
    VIEW_ADMIN = "manage:users"

    # Admin System
    ADMIN_SYSTEM_VIEW = "manage:users"
    ADMIN_SYSTEM_EDIT = "manage:users"
    ADMIN_SYSTEM_BACKUP = "manage:users"
    ADMIN_SYSTEM_RESTORE = "manage:users"
    MANAGE_SYSTEM = "manage:users"

    # Admin GenAI
    ADMIN_GENAI_VIEW = "manage:users"
    ADMIN_GENAI_EDIT = "manage:users"
    ADMIN_GENAI_TEST = "manage:users"
    ADMIN_GENAI_VIEW_LOGS = "manage:users"
    MANAGE_GENAI = "manage:users"

    # Admin Guardrails
    ADMIN_GUARDRAILS_VIEW = "manage:users"
    ADMIN_GUARDRAILS_EDIT = "manage:users"
    ADMIN_GUARDRAILS_TEST = "manage:users"

    # Admin Knowledge Base
    ADMIN_KB_VIEW = "manage:users"
    ADMIN_KB_UPLOAD = "manage:users"
    ADMIN_KB_DELETE = "manage:users"
    ADMIN_KB_REPROCESS = "manage:users"
    MANAGE_KNOWLEDGE = "manage:users"

    # General Admin
    ADMIN_ACCESS = "manage:users"
    ASSIGN_ARTICLES = "read:articles"
    VIEW_ARTICLE_COMMENTS = "read:articles"
    VIEW_ARTICLE_CONTENT = "read:articles"
    VIEW_ARTICLE_HUNTS = "read:articles"
    VIEW_ARTICLE_INTELLIGENCE = "read:articles"
    VIEW_ARTICLES = "read:articles"
    DELETE_ARTICLES = "read:articles"
    EDIT_ARTICLES = "read:articles"


ROLE_PERMISSIONS = {
    # ADMIN: Full access - manage sources, users, global watchlist
    UserRole.ADMIN: [p.value for p in Permission],  # All permissions

    # VIEWER: Standard user - read feeds, manage personal watchlist/feeds
    UserRole.VIEWER: [
        Permission.READ_ARTICLES.value,
        Permission.EXPORT_ARTICLES.value,
        Permission.MANAGE_PERSONAL_WATCHLIST.value,
        Permission.MANAGE_USER_FEEDS.value,
    ],
}


def get_user_permissions(role: UserRole) -> List[str]:
    """Get all permissions for a user role."""
    return ROLE_PERMISSIONS.get(role, [])


def has_permission(user_role: UserRole, required_permission: str) -> bool:
    """Check if a user role has a specific permission."""
    permissions = get_user_permissions(user_role)
    return required_permission in permissions
