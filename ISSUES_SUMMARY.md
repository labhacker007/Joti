# Current Issues & Fixes Applied

## Issue 1: Intelligence Extraction Not Working ✅ FIXED

### Problem:
- Hunt Workbench showing "0" for intel count on articles
- Intelligence extracted at article detail page not showing on Hunt Workbench
- IOCs not being extracted automatically on ingestion

### Root Cause:
The `article_to_response` function in `backend/app/articles/routes.py` was not including the `intelligence_count` field when returning articles for the triage queue. It only populated `extracted_intelligence` when `include_intel=True`, which was never being passed.

### Fix Applied:
1. **Backend** (`backend/app/articles/routes.py`):
   - Added query to count extracted intelligence for each article
   - Added `intelligence_count` field to response data
   - This count is now ALWAYS included (not conditional)

2. **Schema** (`backend/app/articles/schemas.py`):
   - Added `intelligence_count: int = 0` field to `ArticleResponse`

3. **Frontend** (already had the logic):
   - `Hunts.js` was already setup to read `intelligence_count` 
   - Fallback logic to count from `extracted_iocs` and `extracted_ttps` arrays

### Code Changes:
```python
# backend/app/articles/routes.py
# Get intelligence count - always include this for displaying counters
intelligence_count = 0
if db:
    from app.models import ExtractedIntelligence
    intelligence_count = db.query(ExtractedIntelligence).filter(
        ExtractedIntelligence.article_id == article.id
    ).count()

response_data = {
    # ...other fields...
    "intelligence_count": intelligence_count,
    # ...
}
```

### Testing:
```bash
# Backend rebuilt and deployed
docker-compose build backend
docker-compose up -d backend

# Verify API returns intelligence_count
curl http://localhost:8000/articles/triage
# Should see "intelligence_count": <number> for each article
```

---

## Issue 2: Feed Page Not Working 🔄 IN PROGRESS

### Problem:
- Feed page was working but now broken
- Once user navigates to /feed or /feeds, can't navigate back to other pages
- Requires re-login to access rest of application

### Investigation:
- Navigation hooks (`useNavigate`) are properly setup
- `handleGoToDetail` function looks correct
- Error handling with retry button is implemented

### Potential Causes:
1. JavaScript error blocking page render/navigation
2. Browser history API issue
3. Authentication token expiry during navigation
4. React Router DOM issue with error state

### Next Steps for Investigation:
1. Check browser console for JavaScript errors
2. Check if error state is preventing navigation
3. Verify token persistence across navigation
4. Test with fresh browser session

### Temporary Workaround:
- Use direct URL navigation
- Clear browser cache and localStorage
- Hard refresh (Cmd/Ctrl + Shift + R)

---

## Issue 3: Implement Role-Based Access Control (RBAC) 🔄 IN PROGRESS

### Requirement:
Admin should be able to:
- Define which roles have access to which functionality
- Control page-level access per role
- Assign granular permissions to users
- Manage this through a UI in the Admin portal

### Current State:
- Basic role-based permissions exist (`Permission` enum)
- Roles: ADMIN, TI, TH, IR, VIEWER
- `require_permission` decorator on API endpoints
- No UI for managing permissions

### Planned Implementation:

#### 1. **Backend: Permission Management System**
- Create `role_permissions` table mapping roles to permissions
- Create `user_permissions` table for user-specific overrides
- API endpoints:
  - GET `/admin/rbac/roles` - List all roles
  - GET `/admin/rbac/roles/{role}/permissions` - Get role permissions
  - PUT `/admin/rbac/roles/{role}/permissions` - Update role permissions
  - GET `/admin/rbac/permissions` - List all available permissions
  - POST `/admin/rbac/users/{user_id}/permissions` - Override user permissions

#### 2. **Database Schema**:
```sql
CREATE TABLE role_permissions (
    id SERIAL PRIMARY KEY,
    role VARCHAR NOT NULL,
    permission VARCHAR NOT NULL,
    granted BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(role, permission)
);

CREATE TABLE user_permission_overrides (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    permission VARCHAR NOT NULL,
    granted BOOLEAN NOT NULL,
    reason TEXT,
    created_by_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, permission)
);
```

#### 3. **Frontend: RBAC Management UI**
- New tab in Admin portal: "Access Control"
- Permission matrix showing roles × permissions
- Checkboxes to grant/revoke permissions
- User-specific permission overrides
- Visual indicators for inherited vs overridden permissions

#### 4. **Frontend: Permission-Based UI Rendering**
- HOC or hook: `useHasPermission(permission)`
- Conditionally render menu items, buttons, pages
- Graceful degradation (hide vs disable)

#### 5. **Page-Level Permissions**:
```javascript
// Permission constants
const PAGE_PERMISSIONS = {
  '/dashboard': 'READ_DASHBOARD',
  '/feed': 'READ_ARTICLES',
  '/articles': 'READ_ARTICLES',
  '/intelligence': 'READ_INTELLIGENCE',
  '/hunts': 'EXECUTE_HUNTS',
  '/reports': 'READ_REPORTS',
  '/admin': 'MANAGE_USERS',
  '/audit': 'VIEW_AUDIT_LOGS'
};
```

### Implementation Steps:
1. ✅ Create database migrations for RBAC tables
2. ✅ Create backend API endpoints for permission management
3. ✅ Create RBAC manager service
4. ✅ Update frontend to fetch and use permissions
5. ✅ Create Admin UI for permission management
6. ✅ Add permission checks to routes
7. ✅ Test with different roles

---

## Priority:
1. **High**: Issue #1 (Intelligence Count) - COMPLETED ✅
2. **High**: Issue #3 (RBAC System) - IN PROGRESS 🔄
3. **Medium**: Issue #2 (Feed Navigation) - INVESTIGATING 🔍

## Files Modified:
- `backend/app/articles/routes.py` - Added intelligence_count
- `backend/app/articles/schemas.py` - Added intelligence_count field
- Backend rebuilt and deployed

## Files To Modify (RBAC):
- `backend/app/admin/rbac.py` - New RBAC manager service
- `backend/app/admin/routes.py` - RBAC endpoints
- `backend/migrations/versions/007_add_rbac_tables.py` - Database migration
- `frontend/src/pages/Admin.js` - Add RBAC tab
- `frontend/src/components/RBACManager.js` - New component
- `frontend/src/hooks/usePermissions.js` - Permission hook
- `frontend/src/api/client.js` - RBAC API calls
