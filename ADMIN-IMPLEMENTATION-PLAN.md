# Admin Implementation Plan - Stage Ready Branch

**Branch:** `feature/admin-implementation-stage`
**Base:** `feature/typescript-migration-complete`
**Goal:** Build complete admin functionality connecting to existing backend APIs

---

## Branch Strategy

```
joti-clean-release (main - original code)
    └── feature/typescript-migration-complete (TypeScript + placeholders)
            └── feature/admin-implementation-stage (THIS BRANCH - full implementation)
```

---

## Implementation Phases

### Phase 1: User Management UI
**Status:** ✅ Complete (2026-02-10)

**Backend APIs Available:**
- `GET /users/` - List all users
- `POST /users/` - Create user
- `GET /users/{user_id}` - Get user details
- `PATCH /users/{user_id}` - Update user
- `DELETE /users/{user_id}` - Delete user
- `POST /users/switch-role` - Role switching
- `GET /users/my-permissions` - Current user permissions
- `GET /users/available-roles` - Available roles

**Frontend Tasks:**
- [ ] Create UserManagement page component
- [ ] Build user table with search/filter
- [ ] Create user form modal (add/edit)
- [ ] Add role assignment dropdown
- [ ] Implement delete confirmation dialog
- [ ] Add permission viewer
- [ ] Connect to backend APIs
- [ ] Add loading states and error handling
- [ ] Add pagination

**Files to Create:**
- `frontend/src/pages/UserManagement.tsx`
- `frontend/src/components/admin/UserTable.tsx`
- `frontend/src/components/admin/UserForm.tsx`
- `frontend/src/components/admin/PermissionViewer.tsx`

---

### Phase 2: System Settings UI
**Status:** ✅ Complete (2026-02-10)

**Backend APIs Available:**
- `GET /admin/settings` - Get system settings
- `POST /admin/configurations` - Update settings
- `GET /admin/configurations/{category}` - Get category settings
- `DELETE /admin/configurations/{category}/{key}` - Delete setting

**Frontend Tasks:**
- [ ] Create SystemSettings page
- [ ] Build settings form by category
- [ ] Add validation for setting values
- [ ] Implement save/reset functionality
- [ ] Show current vs. default values
- [ ] Connect to backend APIs
- [ ] Add confirmation for critical settings

**Files to Create:**
- `frontend/src/pages/SystemSettings.tsx`
- `frontend/src/components/admin/SettingsForm.tsx`
- `frontend/src/components/admin/SettingField.tsx`

---

### Phase 3: RBAC & Security Management
**Status:** 🔴 Not Started

**Backend APIs Available:**
- `GET /admin/rbac/users/{user_id}/permissions` - User permissions
- `POST /admin/rbac/users/{user_id}/permissions` - Set permissions
- `DELETE /admin/rbac/users/{user_id}/permissions/{permission}` - Remove permission
- `GET /admin/guardrails` - Get guardrails
- `PUT /admin/guardrails/{function_name}` - Update guardrails
- `GET /admin/guardrails/global` - Global guardrails
- `POST /admin/guardrails/global` - Create global guardrail

**Frontend Tasks:**
- [ ] Create RBACManagement page
- [ ] Build permission matrix UI
- [ ] Create guardrails configuration
- [ ] Add role hierarchy visualization
- [ ] Implement permission testing tool
- [ ] Connect to backend APIs

**Files to Create:**
- `frontend/src/pages/RBACManagement.tsx`
- `frontend/src/components/admin/PermissionMatrix.tsx`
- `frontend/src/components/admin/GuardrailsConfig.tsx`
- `frontend/src/components/admin/RoleHierarchy.tsx`

---

### Phase 4: Connector Management
**Status:** 🔴 Not Started

**Backend APIs Available:**
- `GET /admin/connectors` - List connectors
- `POST /admin/configurations/test/{category}` - Test connector
- Configuration endpoints for each connector type

**Connector Types:**
- XSIAM
- Microsoft Defender
- Wiz
- Splunk
- Slack
- Email

**Frontend Tasks:**
- [ ] Create ConnectorManagement page
- [ ] Build connector card grid
- [ ] Create connector configuration forms
- [ ] Add test connection functionality
- [ ] Show connection status indicators
- [ ] Implement enable/disable toggle
- [ ] Connect to backend APIs

**Files to Create:**
- `frontend/src/pages/ConnectorManagement.tsx`
- `frontend/src/components/admin/ConnectorCard.tsx`
- `frontend/src/components/admin/ConnectorConfigForm.tsx`
- `frontend/src/types/connectors.ts`

---

### Phase 5: GenAI/Ollama Management
**Status:** 🔴 Not Started

**Backend APIs Available:**
- `GET /admin/genai/status` - GenAI status
- `GET /admin/genai/ollama/status` - Ollama status
- `POST /admin/genai/ollama/setup` - Setup Ollama
- `GET /admin/genai/models` - List models
- `POST /admin/genai/ollama/pull-model` - Pull model
- `DELETE /admin/genai/ollama/model/{model_name}` - Delete model
- `GET /admin/genai/ollama/library` - Model library
- `POST /admin/genai/test` - Test GenAI

**Frontend Tasks:**
- [ ] Create GenAIManagement page
- [ ] Build Ollama setup wizard
- [ ] Create model list with pull/delete
- [ ] Add model library browser
- [ ] Implement test prompt interface
- [ ] Show model status and resources
- [ ] Connect to backend APIs

**Files to Create:**
- `frontend/src/pages/GenAIManagement.tsx`
- `frontend/src/components/admin/OllamaSetup.tsx`
- `frontend/src/components/admin/ModelList.tsx`
- `frontend/src/components/admin/ModelLibrary.tsx`
- `frontend/src/components/admin/AITestConsole.tsx`

---

### Phase 6: System Monitoring & Stats
**Status:** 🔴 Not Started

**Backend APIs Available:**
- `GET /admin/stats` - System statistics
- `GET /admin/health` - Health check
- `GET /admin/scheduler/status` - Scheduler status
- `POST /admin/scheduler/jobs/{job_id}/run` - Run job manually
- `GET /admin/audit-summary` - Audit summary

**Frontend Tasks:**
- [ ] Create SystemMonitoring page
- [ ] Build stats dashboard
- [ ] Add health status indicators
- [ ] Create scheduler job viewer
- [ ] Implement manual job trigger
- [ ] Show real-time metrics (if available)
- [ ] Connect to backend APIs

**Files to Create:**
- `frontend/src/pages/SystemMonitoring.tsx`
- `frontend/src/components/admin/StatsCard.tsx`
- `frontend/src/components/admin/HealthIndicator.tsx`
- `frontend/src/components/admin/SchedulerPanel.tsx`

---

### Phase 7: Enhanced Audit Logs
**Status:** 🔴 Not Started

**Backend APIs Available:**
- `GET /admin/audit-summary` - Audit summary
- (Assume there are paginated audit log endpoints)

**Frontend Tasks:**
- [ ] Enhance AuditLogs page (currently placeholder)
- [ ] Build audit log table with filters
- [ ] Add date range picker
- [ ] Implement action type filter
- [ ] Add user filter
- [ ] Create detail view modal
- [ ] Export audit logs feature
- [ ] Connect to backend APIs

**Files to Update:**
- `frontend/src/pages/AuditLogs.tsx` (replace placeholder)
- Add: `frontend/src/components/admin/AuditLogTable.tsx`
- Add: `frontend/src/components/admin/AuditLogFilter.tsx`
- Add: `frontend/src/components/admin/AuditLogDetail.tsx`

---

## Shared Components to Build

### General Admin Components
- [ ] `AdminLayout.tsx` - Layout wrapper for admin pages
- [ ] `DataTable.tsx` - Reusable table with sorting/filtering/pagination
- [ ] `ConfirmDialog.tsx` - Confirmation dialog for destructive actions
- [ ] `StatusBadge.tsx` - Colored status indicators
- [ ] `EmptyState.tsx` - Empty state placeholder
- [ ] `ErrorAlert.tsx` - Error display component

### Form Components
- [ ] `FormField.tsx` - Enhanced form field wrapper
- [ ] `FormSection.tsx` - Form section grouping
- [ ] `FormActions.tsx` - Form action buttons (save, cancel, reset)

---

## API Client Extensions

Update `frontend/src/api/client.ts` with new API modules:

```typescript
// User Management
export const usersAPI = {
  getUsers: (params) => client.get('/users', { params }),
  createUser: (data) => client.post('/users', data),
  updateUser: (id, data) => client.patch(`/users/${id}`, data),
  deleteUser: (id) => client.delete(`/users/${id}`),
  switchRole: (role) => client.post('/users/switch-role', { role }),
};

// Admin
export const adminAPI = {
  getSettings: () => client.get('/admin/settings'),
  getStats: () => client.get('/admin/stats'),
  getConnectors: () => client.get('/admin/connectors'),
  // ... more endpoints
};

// GenAI
export const genaiAPI = {
  getStatus: () => client.get('/admin/genai/status'),
  getModels: () => client.get('/admin/genai/models'),
  pullModel: (modelName) => client.post('/admin/genai/ollama/pull-model', { model_name: modelName }),
  // ... more endpoints
};
```

---

## Type Definitions to Add

Update `frontend/src/types/api.ts`:

```typescript
// User types
export interface User {
  id: number;
  email: string;
  username: string;
  full_name: string;
  role: UserRole;
  additional_roles: UserRole[];
  is_active: boolean;
  last_login?: string;
  created_at: string;
}

export type UserRole = 'ADMIN' | 'ANALYST' | 'VIEWER' | 'CONTRIBUTOR';

// Settings types
export interface SystemSettings {
  [category: string]: {
    [key: string]: any;
  };
}

// Connector types
export interface Connector {
  id: string;
  name: string;
  type: ConnectorType;
  is_active: boolean;
  config: Record<string, any>;
}

export type ConnectorType = 'xsiam' | 'defender' | 'wiz' | 'splunk' | 'slack' | 'email';

// GenAI types
export interface GenAIModel {
  name: string;
  size: number;
  modified_at: string;
}

export interface GenAIStatus {
  provider: string;
  available: boolean;
  models: GenAIModel[];
}

// Stats types
export interface SystemStats {
  total_articles: number;
  active_sources: number;
  total_users: number;
  recent_activity: any[];
}
```

---

## Testing Strategy

### Manual Testing Checklist
- [ ] User CRUD operations work
- [ ] Role switching works correctly
- [ ] Settings save and persist
- [ ] Connectors can be configured and tested
- [ ] Models can be pulled and deleted
- [ ] Stats display correctly
- [ ] Audit logs show historical data
- [ ] All forms validate properly
- [ ] Error states display correctly
- [ ] Loading states work
- [ ] Pagination works on all tables

### Backend Integration Testing
- [ ] All API endpoints respond correctly
- [ ] RBAC permissions are enforced
- [ ] Error responses are handled gracefully
- [ ] Token refresh works during long sessions

---

## Navigation Updates

Update `frontend/src/components/NavBar.tsx` to add admin submenu:

```typescript
const adminMenuItems = [
  { path: '/admin/users', label: 'Users', icon: Users },
  { path: '/admin/settings', label: 'Settings', icon: Settings },
  { path: '/admin/rbac', label: 'RBAC', icon: Shield },
  { path: '/admin/connectors', label: 'Connectors', icon: Plug },
  { path: '/admin/genai', label: 'GenAI', icon: Brain },
  { path: '/admin/monitoring', label: 'Monitoring', icon: Activity },
  { path: '/audit', label: 'Audit Logs', icon: FileText },
];
```

---

## Routing Updates

Update `frontend/src/App.js` to add new routes:

```javascript
// Admin routes (ADMIN only)
<Route element={
  <ProtectedRoute requiredRoles={['ADMIN']}>
    <AdminLayout />
  </ProtectedRoute>
}>
  <Route path="/admin/users" element={<UserManagement />} />
  <Route path="/admin/settings" element={<SystemSettings />} />
  <Route path="/admin/rbac" element={<RBACManagement />} />
  <Route path="/admin/connectors" element={<ConnectorManagement />} />
  <Route path="/admin/genai" element={<GenAIManagement />} />
  <Route path="/admin/monitoring" element={<SystemMonitoring />} />
</Route>
```

---

## Development Workflow

### For Each Feature:

1. **Create Types** - Define TypeScript interfaces
2. **Create API Methods** - Add to client.ts
3. **Build Components** - Create UI components
4. **Build Page** - Assemble components into page
5. **Add Route** - Register in App.js
6. **Add Navigation** - Add to NavBar
7. **Test** - Manual testing with backend
8. **Commit** - Commit working feature

### Git Commit Pattern:

```bash
git add .
git commit -m "feat(admin): implement user management UI

- Add UserManagement page
- Create user table with CRUD operations
- Add role assignment functionality
- Connect to backend /users API
- Add loading and error states

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Success Criteria

Branch is **Stage Ready** when:

- ✅ All 7 phases implemented
- ✅ All admin features functional
- ✅ All backend APIs connected
- ✅ RBAC properly enforced
- ✅ Error handling robust
- ✅ Loading states present
- ✅ Forms validated
- ✅ Manual testing complete
- ✅ Documentation updated
- ✅ Ready for staging deployment

---

## Next Steps

1. Review this plan
2. Choose which phase to start with (recommend Phase 1: User Management)
3. Follow the implementation guide in ARCHITECTURE.md
4. Build, test, commit incrementally
5. Move to next phase when current phase is complete

---

**Created:** 2026-02-09
**Status:** Planning Complete - Ready to Start Implementation
