# Next.js Migration Plan - Joti Application

**Created:** 2026-02-10
**Branch:** `feature/nextjs-migration`
**Status:** In Progress

---

## 🎯 Migration Objectives

1. Migrate from Create React App (react-scripts 5.0.1) to Next.js 15
2. Eliminate 78+ security vulnerabilities in react-scripts dependencies
3. Maintain 100% feature parity with current application
4. Keep both backend and frontend in single repository
5. Improve build performance and developer experience

---

## 📋 Current Application Inventory

### **Pages (14 total)**
- ✅ `/login` - Public login page
- ✅ `/unauthorized` - Public unauthorized page
- ✅ `/` → redirects to `/news`
- ✅ `/dashboard` - Main dashboard
- ✅ `/news` - News feeds (default page)
- ✅ `/profile` - User profile
- ✅ `/admin` - Admin dashboard
- ✅ `/admin/users` - User management
- ✅ `/admin/settings` - System settings
- ✅ `/admin/rbac` - RBAC manager
- ✅ `/admin/guardrails` - Guardrails manager
- ✅ `/admin/connectors` - Connector management
- ✅ `/admin/genai` - GenAI management
- ✅ `/admin/monitoring` - System monitoring
- ✅ `/admin/audit` - Audit logs

### **Components**
- `NavBar.tsx` - Main navigation bar
- `AdminNav.tsx` - Admin navigation
- `ProtectedRoute.tsx` - Auth guard
- `AnimatedBackgrounds.tsx` - Background animations
- UI Components: `alert`, `badge`, `button`, `card`, `input`, `label`, `spinner`, `tabs`

### **Features**
- ✅ Theme switching (ThemeContext)
- ✅ Timezone management (TimezoneContext)
- ✅ Authentication & Authorization
- ✅ Protected routes
- ✅ API integration
- ✅ Zustand state management
- ✅ TailwindCSS + Ant Design styling

---

## 🏗️ Next.js 15 Architecture

### **Directory Structure**
```
Joti/
├── backend/                    # FastAPI backend (unchanged)
│   ├── requirements.txt
│   └── ...
├── frontend-nextjs/           # New Next.js 15 app
│   ├── app/                   # App Router
│   │   ├── layout.tsx        # Root layout (ThemeProvider, NavBar)
│   │   ├── page.tsx          # Home redirect
│   │   ├── login/
│   │   │   └── page.tsx      # Login page
│   │   ├── unauthorized/
│   │   │   └── page.tsx      # Unauthorized page
│   │   ├── dashboard/
│   │   │   └── page.tsx      # Dashboard
│   │   ├── news/
│   │   │   └── page.tsx      # News feeds
│   │   ├── profile/
│   │   │   └── page.tsx      # User profile
│   │   └── admin/
│   │       ├── page.tsx      # Admin dashboard
│   │       ├── users/page.tsx
│   │       ├── settings/page.tsx
│   │       ├── rbac/page.tsx
│   │       ├── guardrails/page.tsx
│   │       ├── connectors/page.tsx
│   │       ├── genai/page.tsx
│   │       ├── monitoring/page.tsx
│   │       └── audit/page.tsx
│   ├── components/            # React components (copied from src/)
│   │   ├── NavBar.tsx
│   │   ├── AdminNav.tsx
│   │   ├── ProtectedRoute.tsx
│   │   ├── AnimatedBackgrounds.tsx
│   │   └── ui/               # shadcn/ui components
│   ├── contexts/              # React contexts
│   │   ├── ThemeContext.tsx
│   │   └── TimezoneContext.tsx
│   ├── lib/                   # Utilities
│   ├── api/                   # API clients
│   ├── store/                 # Zustand store
│   ├── types/                 # TypeScript types
│   ├── styles/                # Global styles
│   ├── public/                # Static assets
│   ├── next.config.js         # Next.js config
│   ├── tailwind.config.js     # TailwindCSS config
│   ├── tsconfig.json          # TypeScript config
│   └── package.json           # Dependencies
└── NEXTJS_MIGRATION_PLAN.md  # This file
```

---

## 🔄 Migration Steps

### **Phase 1: Setup (30 mins)**
- [x] Create migration branch: `feature/nextjs-migration`
- [x] Document migration plan
- [ ] Initialize Next.js 15 with App Router
- [ ] Configure TypeScript
- [ ] Set up TailwindCSS
- [ ] Configure Ant Design

### **Phase 2: Core Setup (1 hour)**
- [ ] Copy and adapt `package.json` dependencies
- [ ] Create root `layout.tsx` with ThemeProvider
- [ ] Set up global styles (`index.css`, `kimi-theme.css`)
- [ ] Configure `next.config.js` for API proxy
- [ ] Set up environment variables

### **Phase 3: Components Migration (2 hours)**
- [ ] Copy all `/components` → `frontend-nextjs/components/`
- [ ] Copy all `/contexts` → `frontend-nextjs/contexts/`
- [ ] Copy all `/api` → `frontend-nextjs/lib/api/`
- [ ] Copy all `/store` → `frontend-nextjs/store/`
- [ ] Copy all `/types` → `frontend-nextjs/types/`
- [ ] Copy all `/lib` → `frontend-nextjs/lib/`
- [ ] Verify all imports work

### **Phase 4: Pages Migration (3 hours)**
- [ ] Create `app/layout.tsx` (root layout)
- [ ] Create `app/page.tsx` (redirect to /news)
- [ ] Migrate `/login` → `app/login/page.tsx`
- [ ] Migrate `/unauthorized` → `app/unauthorized/page.tsx`
- [ ] Migrate `/dashboard` → `app/dashboard/page.tsx`
- [ ] Migrate `/news` → `app/news/page.tsx`
- [ ] Migrate `/profile` → `app/profile/page.tsx`
- [ ] Migrate `/admin` → `app/admin/page.tsx`
- [ ] Migrate admin sub-pages (8 pages)

### **Phase 5: Authentication (1 hour)**
- [ ] Implement middleware for protected routes
- [ ] Update `ProtectedRoute` component for Next.js
- [ ] Test login/logout flow
- [ ] Test role-based access control

### **Phase 6: Routing & Navigation (1 hour)**
- [ ] Replace React Router with Next.js `<Link>`
- [ ] Update NavBar navigation
- [ ] Update AdminNav navigation
- [ ] Test all route transitions

### **Phase 7: Testing (2 hours)**
- [ ] Test all 14 pages load correctly
- [ ] Test authentication flows
- [ ] Test protected routes
- [ ] Test API integrations
- [ ] Test theme switching
- [ ] Test responsive design
- [ ] Fix any broken imports or errors

### **Phase 8: Optimization (1 hour)**
- [ ] Configure production build
- [ ] Optimize images
- [ ] Add loading states
- [ ] Configure caching
- [ ] Test production build

### **Phase 9: Cleanup & Documentation (30 mins)**
- [ ] Remove old `/frontend` directory (backup first)
- [ ] Rename `frontend-nextjs` → `frontend`
- [ ] Update README.md
- [ ] Update deployment docs
- [ ] Commit and push to remote

---

## 📦 Dependencies

### **New Dependencies**
```json
{
  "next": "^15.1.6",
  "react": "^19.0.0",
  "react-dom": "^19.0.0"
}
```

### **Keeping (Compatible)**
```json
{
  "antd": "^5.23.6",
  "axios": "^1.8.2",
  "zustand": "^4.4.0",
  "lucide-react": "^0.294.0",
  "tailwindcss": "^3.4.19"
}
```

### **Removing**
```json
{
  "react-router-dom": "^6.20.0",  // Replaced by Next.js router
  "react-scripts": "5.0.1"        // Replaced by Next.js
}
```

---

## 🔑 Key Migration Patterns

### **Route Migration**
```tsx
// OLD (React Router)
import { Routes, Route } from 'react-router-dom';
<Route path="/admin/users" element={<UserManagement />} />

// NEW (Next.js)
// Just create: app/admin/users/page.tsx
export default function UserManagementPage() {
  return <UserManagement />;
}
```

### **Navigation**
```tsx
// OLD
import { Link, useNavigate } from 'react-router-dom';
<Link to="/dashboard">Dashboard</Link>

// NEW
import Link from 'next/link';
<Link href="/dashboard">Dashboard</Link>
```

### **Protected Routes**
```tsx
// OLD
<ProtectedRoute><Component /></ProtectedRoute>

// NEW
// Use middleware.ts or component-level auth check
```

---

## ⚠️ Potential Challenges

1. **Client-Side Rendering**: Next.js defaults to SSR; may need `'use client'` for some components
2. **Authentication**: Need to adapt auth flow for Next.js middleware
3. **State Management**: Zustand should work, but verify hydration
4. **API Calls**: Update base URLs and proxy configuration
5. **Environment Variables**: Must prefix with `NEXT_PUBLIC_` for client access

---

## ✅ Success Criteria

- [ ] All 14 pages render correctly
- [ ] Authentication works (login/logout/protected routes)
- [ ] Theme switching functional
- [ ] All API calls successful
- [ ] No console errors
- [ ] Production build succeeds
- [ ] Performance metrics improved
- [ ] Zero security vulnerabilities from react-scripts

---

## 🚀 Post-Migration Benefits

1. **Security**: Eliminated 78+ vulnerabilities
2. **Performance**: Faster builds (Turbopack), better runtime
3. **SEO**: Server-side rendering capabilities
4. **Developer Experience**: Better error messages, faster HMR
5. **Modern Stack**: Active maintenance, regular updates
6. **Future-Proof**: Easy to add SSR, ISR, API routes later

---

## 📊 Estimated Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| Phase 1: Setup | 30 mins | 🟡 In Progress |
| Phase 2: Core Setup | 1 hour | ⏳ Pending |
| Phase 3: Components | 2 hours | ⏳ Pending |
| Phase 4: Pages | 3 hours | ⏳ Pending |
| Phase 5: Auth | 1 hour | ⏳ Pending |
| Phase 6: Routing | 1 hour | ⏳ Pending |
| Phase 7: Testing | 2 hours | ⏳ Pending |
| Phase 8: Optimization | 1 hour | ⏳ Pending |
| Phase 9: Cleanup | 30 mins | ⏳ Pending |
| **Total** | **12 hours** | **8% Complete** |

---

## 🔗 Resources

- [Next.js 15 Documentation](https://nextjs.org/docs)
- [App Router Migration Guide](https://nextjs.org/docs/app/building-your-application/upgrading/app-router-migration)
- [TailwindCSS with Next.js](https://tailwindcss.com/docs/guides/nextjs)
- [Ant Design with Next.js](https://ant.design/docs/react/use-with-next)

---

**Last Updated:** 2026-02-10
**Migration Lead:** Claude Sonnet 4.5
