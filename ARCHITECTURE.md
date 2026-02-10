# Joti - Modular Architecture Documentation

## Overview

Joti is built with a modular, scalable architecture that allows for easy feature additions and modifications. This document outlines the structure and best practices for extending the application.

## Technology Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety and better developer experience
- **React Router v6** - Client-side routing
- **Zustand** - Lightweight state management
- **shadcn/ui** - Component library (built on Radix UI + Tailwind CSS)
- **react-hook-form + zod** - Form handling and validation
- **Axios** - HTTP client with interceptors
- **Tailwind CSS** - Utility-first styling
- **lucide-react** - Icon library

### Backend
- **FastAPI** - Python web framework
- **PostgreSQL** - Primary database
- **Redis** - Caching and session storage
- **SQLAlchemy** - ORM
- **JWT** - Authentication
- **OAuth 2.0** - Third-party authentication (Google, Microsoft)
- **SAML** - Enterprise SSO

---

## Frontend Architecture

### Directory Structure

```
frontend/src/
├── api/                    # API client and endpoints
│   ├── client.ts          # Axios instance with interceptors
│   └── client.js          # JS wrapper for backward compatibility
│
├── components/            # Reusable components
│   ├── ui/               # shadcn/ui components
│   │   ├── button.tsx    # Button component
│   │   ├── card.tsx      # Card component
│   │   ├── input.tsx     # Input component
│   │   ├── label.tsx     # Label component
│   │   ├── alert.tsx     # Alert component
│   │   ├── badge.tsx     # Badge component
│   │   ├── spinner.tsx   # Loading spinner
│   │   └── *.js          # JS wrappers for each component
│   │
│   ├── AnimatedBackgrounds.tsx  # Canvas-based backgrounds
│   ├── NavBar.tsx        # Main navigation
│   ├── ProtectedRoute.tsx # Auth-protected route wrapper
│   └── ErrorBoundary.jsx  # Error boundary component
│
├── contexts/             # React Context providers
│   ├── ThemeContext.tsx  # Theme management (6 themes)
│   ├── TimezoneContext.tsx # Timezone handling
│   └── *.js              # JS wrappers
│
├── hooks/                # Custom React hooks
│   └── (future hooks)
│
├── pages/                # Page components
│   ├── Login.tsx         # Login page with OAuth
│   ├── Dashboard.tsx     # Main dashboard
│   ├── NewsFeeds.tsx     # News articles listing
│   ├── Sources.tsx       # RSS feed sources management
│   ├── Watchlist.tsx     # Watchlist keywords
│   ├── UserProfile.tsx   # User profile settings
│   ├── Admin.tsx         # Admin panel (placeholder)
│   ├── AuditLogs.tsx     # Audit logs viewer (placeholder)
│   ├── Unauthorized.tsx  # 403 page
│   └── *.js              # JS wrappers
│
├── store/                # Zustand stores
│   ├── index.ts          # Auth store (tokens, user)
│   └── index.js          # JS wrapper
│
├── types/                # TypeScript type definitions
│   ├── api.ts            # API request/response types
│   ├── components.ts     # Component prop types
│   ├── store.ts          # Store types
│   └── index.ts          # Barrel exports
│
├── lib/                  # Utility functions
│   ├── utils.ts          # Tailwind className merger
│   └── validations.ts    # Common validation schemas
│
├── styles/               # Global styles
│   └── kimi-theme.css    # Theme CSS variables
│
├── App.js                # Main app component
├── index.js              # Entry point
└── index.css             # Global CSS + Tailwind
```

---

## Modular Design Principles

### 1. Component Modularity

Each component is **self-contained** with its own:
- TypeScript types/interfaces
- Styles (via Tailwind classes)
- Logic
- Tests (to be added)

**Example - Creating a new UI component:**

```tsx
// frontend/src/components/ui/dialog.tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({
  open,
  onClose,
  children
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50">
      <div className="bg-background p-6 rounded-lg">
        {children}
      </div>
    </div>
  );
};
```

Then create a wrapper:
```javascript
// frontend/src/components/ui/dialog.js
export * from './dialog.tsx';
```

### 2. Page Modularity

Each page is independent and can be:
- Added/removed without affecting others
- Lazy-loaded for code splitting
- Protected with RBAC permissions

**Example - Adding a new page:**

```tsx
// frontend/src/pages/Reports.tsx
import React from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';

export default function Reports() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold">Reports</h1>
      {/* Your page content */}
    </div>
  );
}
```

```javascript
// frontend/src/pages/Reports.js
export { default } from './Reports.tsx';
```

Add route in `App.js`:
```javascript
import Reports from './pages/Reports';

// Inside Routes:
<Route path="/reports" element={<Reports />} />
```

### 3. API Client Modularity

API endpoints are grouped by domain in `client.ts`:

```typescript
// Example: Adding a new API module
export const reportsAPI = {
  getReports: (filters?: ReportFilters) =>
    client.get<Report[]>('/reports', { params: filters }),

  generateReport: (data: ReportRequest) =>
    client.post<Report>('/reports/generate', data),

  downloadReport: (id: string) =>
    client.get(`/reports/${id}/download`, {
      responseType: 'blob'
    }),
};
```

### 4. State Management Modularity

Zustand stores are split by domain:

```typescript
// Example: Creating a new store slice
import { create } from 'zustand';

interface ReportsState {
  reports: Report[];
  loading: boolean;
  setReports: (reports: Report[]) => void;
  fetchReports: () => Promise<void>;
}

export const useReportsStore = create<ReportsState>((set) => ({
  reports: [],
  loading: false,
  setReports: (reports) => set({ reports }),
  fetchReports: async () => {
    set({ loading: true });
    const data = await reportsAPI.getReports();
    set({ reports: data, loading: false });
  },
}));
```

### 5. Theme System

The app supports 6 dynamic themes:
- **Midnight** 🌙 - Dark blue theme
- **Daylight** ☀️ - Light theme
- **Command Center** 🖥️ - Military dark theme
- **Aurora** 🌌 - Purple/teal theme
- **Red Alert** 🚨 - High-contrast red theme
- **Matrix** 💻 - Green monochrome theme

Themes are CSS variable-based and can be extended:

```css
/* styles/kimi-theme.css */
[data-theme="custom-theme"] {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  /* ... other variables */
}
```

---

## Backend Architecture

### Directory Structure

```
backend/app/
├── admin/                 # Admin functionality
│   ├── routes.py         # Admin API endpoints
│   ├── rbac_service.py   # RBAC management
│   ├── genai_functions.py # AI features
│   ├── guardrails.py     # Security guardrails
│   └── prompts.py        # AI prompts
│
├── auth/                 # Authentication
│   ├── dependencies.py   # Auth dependencies
│   ├── rbac.py          # Role-based access control
│   ├── saml.py          # SAML SSO
│   ├── oauth.py         # OAuth providers
│   ├── security.py      # Password hashing, JWT
│   └── schemas.py       # Auth schemas
│
├── users/               # User management
│   ├── routes.py        # User CRUD endpoints
│   ├── feeds.py         # User feed preferences
│   ├── watchlist.py     # User watchlist
│   ├── content.py       # Content preferences
│   └── categories.py    # Category management
│
├── articles/            # Article management
│   └── (article logic)
│
├── core/                # Core functionality
│   ├── config.py        # Configuration
│   ├── database.py      # Database connection
│   └── security.py      # Core security
│
├── routers/             # API routers
│   └── __init__.py      # Main router registration
│
├── models.py            # SQLAlchemy models
├── schemas.py           # Pydantic schemas
└── main.py             # FastAPI app initialization
```

---

## Adding New Features - Step by Step

### Example: Adding a "Reports" Feature

#### 1. Backend - Create the API

```python
# backend/app/reports/routes.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/reports", tags=["reports"])

@router.get("/")
async def list_reports(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Implementation
    return {"reports": []}

@router.post("/generate")
async def generate_report(
    data: ReportRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Implementation
    return {"report_id": "123"}
```

Register in main router:
```python
# backend/app/routers/__init__.py
from app.reports.routes import router as reports_router
app.include_router(reports_router)
```

#### 2. Frontend - Add Types

```typescript
// frontend/src/types/api.ts
export interface Report {
  id: string;
  title: string;
  created_at: string;
  data: any;
}

export interface ReportRequest {
  type: 'daily' | 'weekly' | 'monthly';
  filters?: Record<string, any>;
}
```

#### 3. Frontend - Add API Client

```typescript
// frontend/src/api/client.ts
export const reportsAPI = {
  getReports: () =>
    client.get<Report[]>('/reports'),

  generateReport: (data: ReportRequest) =>
    client.post<Report>('/reports/generate', data),
};
```

#### 4. Frontend - Create Page Component

```tsx
// frontend/src/pages/Reports.tsx
import React, { useState, useEffect } from 'react';
import { reportsAPI } from '../api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Spinner } from '../components/ui/spinner';

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const response = await reportsAPI.getReports();
      setReports(response.data);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Reports</h1>
      <div className="grid gap-4">
        {reports.map(report => (
          <Card key={report.id}>
            <CardHeader>
              <CardTitle>{report.title}</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Report content */}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

```javascript
// frontend/src/pages/Reports.js
export { default } from './Reports.tsx';
```

#### 5. Frontend - Add Route

```javascript
// frontend/src/App.js
import Reports from './pages/Reports';

// Add to Routes:
<Route path="/reports" element={<Reports />} />
```

#### 6. Frontend - Add Navigation

```typescript
// frontend/src/components/NavBar.tsx
// Add to navigation items:
{ path: '/reports', label: 'Reports', icon: FileText, roles: ['ADMIN', 'ANALYST'] }
```

---

## RBAC Integration

Every feature can be protected with role-based access control:

### Frontend Protection

```tsx
import { ProtectedRoute } from '../components/ProtectedRoute';

<Route element={
  <ProtectedRoute requiredRoles={['ADMIN']}>
    <AdminPanel />
  </ProtectedRoute>
}>
  {/* Admin routes */}
</Route>
```

### Backend Protection

```python
from app.auth.rbac import require_role

@router.get("/admin-only")
async def admin_endpoint(
    current_user = Depends(require_role("ADMIN"))
):
    return {"message": "Admin access granted"}
```

---

## Testing Strategy

### Unit Tests
- Components: Test rendering, props, events
- Hooks: Test state changes, effects
- Utils: Test pure functions

### Integration Tests
- API endpoints: Test request/response
- Auth flow: Test login, token refresh
- RBAC: Test permission checks

### E2E Tests (Future)
- User journeys: Login → Dashboard → Actions
- Critical paths: Article triage workflow

---

## Deployment

### Development
```bash
docker-compose up
```

### Production
```bash
docker-compose -f docker-compose.prod.yml up -d
```

Environment variables are managed in `.env` file.

---

## Future Enhancements

### Planned Features
1. **User Management UI** - Full CRUD for users (using existing backend API)
2. **System Configuration UI** - Settings management panel
3. **GenAI/Ollama UI** - Model management interface
4. **Connector UI** - Integration configuration
5. **Advanced Search** - Elasticsearch integration
6. **Real-time Updates** - WebSocket for live data
7. **Mobile App** - React Native application
8. **API Documentation** - Interactive Swagger UI

### Architectural Improvements
1. **Code Splitting** - Lazy load routes for better performance
2. **Service Workers** - Offline support
3. **Internationalization** - Multi-language support
4. **Accessibility** - WCAG 2.1 AA compliance
5. **Analytics** - User behavior tracking
6. **Monitoring** - Error tracking (Sentry)

---

## Best Practices

### Code Style
- Use TypeScript for new code
- Follow ESLint rules
- Use functional components with hooks
- Prefer composition over inheritance
- Keep components small and focused

### Git Workflow
- Feature branches: `feature/feature-name`
- Bug fixes: `fix/bug-description`
- Docs: `docs/what-changed`
- Meaningful commit messages
- Co-author with Claude: `Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>`

### Performance
- Use React.memo for expensive components
- Debounce search inputs
- Virtualize long lists
- Lazy load images
- Code split routes

### Security
- Never commit secrets
- Validate all inputs (frontend & backend)
- Use HTTPS in production
- Implement CSP headers
- Regular dependency updates

---

## Getting Help

### Documentation
- [React Docs](https://react.dev)
- [TypeScript Docs](https://www.typescriptlang.org/docs)
- [shadcn/ui Docs](https://ui.shadcn.com)
- [FastAPI Docs](https://fastapi.tiangolo.com)

### Project Files
- `CREDENTIALS.md` - Login credentials
- `STATUS.md` - Current state & completed work
- `PLAN.md` - Migration strategy
- `MIGRATION-PROGRESS.md` - Detailed progress

---

## Contact

For questions or issues:
- Check existing documentation first
- Review backend logs: `docker logs joti-backend-1`
- Review frontend logs: `docker logs joti-frontend-1`
- Check browser console for errors

---

**Last Updated:** 2026-02-09
**Version:** 1.0.0 (TypeScript Migration Complete)
