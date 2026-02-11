# Docker Setup Guide for Joti

## Quick Start

### 1. Prerequisites
- Docker Desktop installed and running
- `.env.docker` file with configuration

### 2. Start Services (Next.js Frontend)

```bash
# Copy environment file
cp .env.docker .env

# Start all services
docker-compose -f docker-compose.nextjs.yml up --build

# Or in background
docker-compose -f docker-compose.nextjs.yml up -d --build
```

### 3. Access Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

---

## What You'll See with 25% Frontend Completion

### ✅ What Works (You CAN see):
1. **Login Page** (`/login`)
   - Email/password form
   - Error handling display
   - Loading state
   - Redirects to dashboard on success

2. **Access Control**
   - Protected routes working
   - RBAC enforcement
   - Redirects to login if not authenticated
   - Permission checking in navigation

3. **Navigation Bar** (when logged in)
   - Shows user name
   - Theme selector
   - Logout button
   - Dynamic menu based on permissions

4. **Basic Styling**
   - Tailwind CSS working
   - 6 different themes available
   - Responsive layout structure

### ⏳ What Doesn't Work Yet (You CANNOT see):
1. **Dashboard** - Placeholder (shows "under development")
2. **News Feed** - Placeholder (shows "under development")
3. **User Profile** - Placeholder (shows "under development")
4. **Admin Pages** (9 pages) - All placeholders
   - User Management
   - Audit Logs
   - System Settings
   - RBAC Matrix
   - Guardrails
   - Connectors
   - GenAI Settings
   - Monitoring
   - Admin Overview

5. **Data Display** - No actual data shown
6. **Forms** - No working forms (except login)
7. **Tables** - No data tables
8. **Filters/Search** - No search functionality
9. **Real-time Updates** - No live updates

---

## Application Flow

```
User Lands on http://localhost:3000
          ↓
        Home Page (/)
          ↓
    Redirects to /news
          ↓
    Not logged in? → Redirects to /login
          ↓
    Enter credentials
          ↓
    Login successful
          ↓
    Stored in Auth Store (Zustand)
          ↓
    Redirects to /dashboard
          ↓
    See Navbar + Placeholder "under development"
          ↓
    Click any menu item → See placeholder page
          ↓
    Can click "Logout" → Back to login
```

---

## Service Health

When running `docker-compose -f docker-compose.nextjs.yml up`, you'll see:

```
✓ PostgreSQL: Ready (port 5432)
✓ Redis: Ready (port 6379)
✓ Backend: Running (port 8000)
  - Health check passes after 30s
  - Ready to accept API requests
✓ Frontend: Ready (port 3000)
  - Next.js dev/production server running
  - Can load pages and make API calls
```

---

## Testing the Frontend (25% Complete)

### Login Test
```bash
# Open http://localhost:3000/login
# Try credentials:
# Email: admin@example.com
# Password: admin123456

# Expected:
# - Form submission works
# - Shows loading state
# - Success → Redirects to dashboard
# - Failure → Shows error message
```

### Permission Test
```bash
# Log in with admin account
# Check navbar - should show all menu items
# Click different pages - each shows placeholder
# Logout - redirects to login
```

### API Connection Test
```bash
# Open browser DevTools → Network tab
# Log in and watch requests
# You'll see API calls to:
# - POST /api/auth/login
# - GET /api/users/me/permissions
# - Responses showing user data and permissions
```

### Theme Test
```bash
# Log in
# Use theme selector in navbar
# Page should change theme (colors, fonts)
# Theme persists on page reload
```

---

## Current Frontend Architecture

```
frontend-nextjs/
├── app/
│   ├── (auth)/          ← Authentication routes
│   │   ├── login/       ← Works: Login form
│   │   └── unauthorized/ ← Works: Access denied page
│   ├── (protected)/     ← Protected routes with RBAC
│   │   ├── dashboard/   ← Placeholder
│   │   ├── news/        ← Placeholder
│   │   ├── profile/     ← Placeholder
│   │   └── admin/       ← 9 placeholder admin pages
│   └── layout.tsx       ← Theme & Timezone providers
├── api/
│   └── client.ts        ← 40+ API endpoints (ready to use)
├── components/
│   ├── NavBar.tsx       ← Works: Dynamic navbar
│   ├── ProtectedRoute.tsx ← Works: Route protection
│   └── ui/              ← UI components (ready to use)
├── contexts/            ← Theme & Timezone (working)
├── store/               ← Zustand auth store (working)
├── lib/
│   └── utils.ts         ← Utilities (ready to use)
├── types/               ← TypeScript types
└── pages/               ← Page component templates (mostly placeholders)
```

---

## What's Ready to Build Upon

### ✅ Backend (100% Ready)
- All 134+ API endpoints working
- Database schema complete
- Authentication system active
- Admin account created
- All APIs tested and working

### ✅ Frontend Foundation (Ready for UI)
- API client complete and typed
- Auth flow working
- Routing structure set
- Navigation working
- Theme system working
- State management ready
- Component library installed
- Build system passing
- All utilities available

### ✅ Infrastructure (Ready for Deployment)
- Docker Compose configured
- Health checks in place
- Environment variables set up
- Database migrations ready
- Redis cache configured
- Logging ready

---

## Observations with 25% Frontend

### You CAN Do:
✓ See the login page and log in
✓ See the navigation bar change based on permissions
✓ Switch themes dynamically
✓ Navigate to different pages (all show placeholders)
✓ See the application structure is in place
✓ Verify API calls are working (DevTools Network tab)
✓ See RBAC is enforced

### You CANNOT Do:
✗ See any actual data (articles, users, logs, etc.)
✗ Interact with forms (except login)
✗ Create, edit, or delete items
✗ Search or filter anything
✗ See real statistics
✗ Complete any user workflows
✗ See how the full app would work

### Impact Assessment:

| Feature | Works? | Shows | Impact |
|---------|--------|-------|--------|
| Authentication | ✅ YES | Login form | Can log in |
| Authorization | ✅ YES | Permission checks | Routes protected |
| Navigation | ✅ YES | Menu items | Can click between pages |
| Styling | ✅ YES | Themes, colors | Looks good |
| API Client | ✅ YES | Network requests | Backend connected |
| Data Display | ❌ NO | Placeholders | No real data |
| Forms | ❌ NO | Placeholders | Can't create/edit |
| Tables | ❌ NO | Empty | No data listing |
| Searches | ❌ NO | Placeholders | Can't filter |
| Workflows | ❌ NO | Placeholders | Can't do work |

---

## Building Frontend Features Next

To go from 25% to 100%, you need to implement these 14 pages:

### High Priority (1-2 weeks):
1. `/dashboard` - Stats and overview
2. `/news` - Article feed with search
3. `/profile` - User settings

### Medium Priority (2-3 weeks):
4. `/admin/users` - User management
5. `/admin/audit` - Audit logs
6. `/admin/settings` - System configuration
7. `/admin/rbac` - Permission management
8. `/admin/guardrails` - Content moderation
9. `/admin/connectors` - Hunt integration
10. `/admin/genai` - AI configuration
11. `/admin/monitoring` - System metrics

### Lower Priority (2-3 weeks):
12. Article detail pages
13. Advanced search
14. Reports and export

Each page uses:
- `api/client.ts` for API calls
- `lib/utils.ts` for helpers
- Components from `components/`
- Styling with Tailwind CSS
- Types from `types/`

---

## Docker Commands

```bash
# Start services
docker-compose -f docker-compose.nextjs.yml up

# Start in background
docker-compose -f docker-compose.nextjs.yml up -d

# View logs
docker-compose -f docker-compose.nextjs.yml logs -f frontend
docker-compose -f docker-compose.nextjs.yml logs -f backend

# Stop services
docker-compose -f docker-compose.nextjs.yml down

# Stop and remove volumes
docker-compose -f docker-compose.nextjs.yml down -v

# Rebuild containers
docker-compose -f docker-compose.nextjs.yml up --build

# Execute command in container
docker-compose -f docker-compose.nextjs.yml exec backend bash
docker-compose -f docker-compose.nextjs.yml exec frontend sh

# View service status
docker-compose -f docker-compose.nextjs.yml ps
```

---

## Troubleshooting

### Port Already in Use
```bash
# Check what's using port 3000
lsof -i :3000

# Free up port (macOS/Linux)
kill -9 <PID>

# Or use different port in docker-compose.yml
```

### Database Connection Error
```bash
# Check if PostgreSQL is ready
docker-compose -f docker-compose.nextjs.yml exec postgres pg_isready

# Check database exists
docker-compose -f docker-compose.nextjs.yml exec postgres psql -U joti_user -d joti_db -c "\dt"
```

### Frontend Not Loading
```bash
# Check Next.js logs
docker-compose -f docker-compose.nextjs.yml logs frontend

# Check if backend is responding
curl http://localhost:8000/health

# Rebuild frontend
docker-compose -f docker-compose.nextjs.yml build --no-cache frontend
```

### API Calls Failing
```bash
# Check backend health
docker-compose -f docker-compose.nextjs.yml exec backend python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

# Check CORS settings
curl -H "Origin: http://localhost:3000" http://localhost:8000/health
```

---

## Summary

**With 25% Frontend Completion:**
- ✅ You CAN see: Login, navigation, theming, protection
- ❌ You CANNOT see: Any actual data or functionality
- ⏳ You NEED: Build 14 pages to have a working application

**To Use Docker:**
```bash
cp .env.docker .env
docker-compose -f docker-compose.nextjs.yml up --build
# Visit http://localhost:3000
```

**To Go to 100%:**
- Estimated time: 8-12 weeks with 1-2 developers
- Start with: News Feed → Dashboard → User Management
- Use: PRODUCT_REVIEW.md for detailed specs
- Reference: api/client.ts for all available APIs

