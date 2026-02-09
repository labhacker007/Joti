# JOTI Frontend Migration Plan

**Goal:** Migrate from JavaScript + antd to TypeScript + shadcn/ui
**Approach:** Gradual, phase-by-phase migration with testing after each phase
**Timeline:** ~10 phases

---

## Phase 0: ✅ COMPLETE - Foundation Setup

### Tasks Completed
- [x] Create TypeScript config files
- [x] Create type definition files (api.ts, store.ts, components.ts)
- [x] Create library utilities (utils.ts, validations.ts)

### Files Created
- `frontend/tsconfig.json`
- `frontend/tsconfig.node.json`
- `frontend/src/types/api.ts`
- `frontend/src/types/store.ts`
- `frontend/src/types/components.ts`
- `frontend/src/types/index.ts`
- `frontend/src/lib/utils.ts`
- `frontend/src/lib/validations.ts`

---

## Phase 1: 🔄 IN PROGRESS - Dependencies & Core Infrastructure

### Dependencies Installation (BLOCKED)
- [ ] Install TypeScript: `npm install --save-dev typescript @types/react @types/react-dom @types/node`
- [ ] Install shadcn/ui core: `npm install class-variance-authority clsx tailwind-merge`
- [ ] Install Radix UI primitives: `npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu ...`
- [ ] Install form libraries: `npm install react-hook-form @hookform/resolvers zod`
- [ ] Install table library: `npm install @tanstack/react-table`
- [ ] Install date utilities: `npm install date-fns react-day-picker`
- [ ] Initialize shadcn/ui: `npx shadcn-ui@latest init`
- [ ] Add shadcn/ui components: `npx shadcn-ui@latest add button card input ...`

### Core Migrations Completed
- [x] Migrate store/index.js → store/index.ts
- [x] Migrate api/client.js → api/client.ts

### Blocker
- npm not found in PATH - need to resolve before proceeding

---

## Phase 2: 📋 PENDING - Context Providers

### Tasks
- [ ] Migrate `contexts/ThemeContext.js` → `ThemeContext.tsx`
  - Convert to TypeScript
  - Add proper typing for theme values
  - Ensure 6 themes still work

- [ ] Migrate `contexts/TimezoneContext.js` → `TimezoneContext.tsx`
  - Convert to TypeScript
  - Add proper typing for timezone functions

### Testing
- [ ] Test theme switching still works
- [ ] Test timezone display in all pages

---

## Phase 3: 📋 PENDING - Component Extraction & Shared Components

### Tasks
- [ ] Extract `AnimatedBackgrounds.tsx` from Login.js
  - Neural Network Background
  - Matrix Rain Background
  - Orbital Paths Background
  - Cyber Grid Background
  - Pulse Wave Background
  - Quantum Dots Background

- [ ] Migrate `ProtectedRoute.js` → `ProtectedRoute.tsx`
  - Convert to TypeScript
  - Keep RBAC logic intact

- [ ] Create shared UI components
  - `components/ui/AnimatedCounter.tsx` (for Dashboard)
  - `components/ui/GlassCard.tsx` (glass-morphism wrapper)
  - `components/ui/SpotlightCard.tsx` (spotlight hover effect)

### Testing
- [ ] Test protected routes still work
- [ ] Test animated backgrounds render correctly

---

## Phase 4: 📋 PENDING - Login Page

### Tasks
- [ ] Migrate `pages/Login.js` → `pages/Login.tsx`
  - Replace antd Form with react-hook-form + zod
  - Replace antd Input with shadcn/ui Input
  - Replace antd Button with shadcn/ui Button
  - Replace antd Alert with shadcn/ui Alert
  - Use AnimatedBackgrounds component
  - Keep theme selector functionality
  - Keep OAuth buttons

### Design Enhancements
- [ ] Add instant theme preview on hover
- [ ] Improve particle animation performance
- [ ] Add glass-morphism to login card

### Testing
- [ ] Test email/password login
- [ ] Test OAuth login (Google, Microsoft)
- [ ] Test all 6 theme backgrounds
- [ ] Test theme selector
- [ ] Test form validation
- [ ] Test Playwright E2E login test

---

## Phase 5: 📋 PENDING - Dashboard Page

### Tasks
- [ ] Migrate `pages/Dashboard.js` → `pages/Dashboard.tsx`
  - Replace antd Card with shadcn/ui Card + GlassCard wrapper
  - Replace antd Statistic with custom AnimatedCounter
  - Replace antd Table with TanStack Table
  - Replace antd Select with shadcn/ui Select
  - Replace antd Button with shadcn/ui Button
  - Keep auto-refresh functionality
  - Keep time range selector

### Design Enhancements
- [ ] Add animated counters (GSAP-style)
- [ ] Add glass-morphism to all cards
- [ ] Add glow effects on hover
- [ ] Add staggered entrance animations
- [ ] Add quick action shortcuts UI
- [ ] Improve recent activity feed design

### Testing
- [ ] Test stats loading
- [ ] Test auto-refresh
- [ ] Test time range filtering
- [ ] Test recent articles display
- [ ] Test quick actions

---

## Phase 6: 📋 PENDING - News Feeds Page

### Tasks
- [ ] Migrate `pages/NewsFeeds.js` → `pages/NewsFeeds.tsx`
  - Replace antd Layout with custom layout
  - Replace antd List/Card with custom view components
  - Replace antd Drawer with shadcn/ui Dialog/Sheet
  - Replace antd Select with shadcn/ui Select
  - Replace antd Input with shadcn/ui Input
  - Replace antd Tabs with shadcn/ui Tabs
  - Replace antd Checkbox with shadcn/ui Checkbox

### New Features
- [ ] Implement 3 view modes:
  - List View (compact)
  - Card View (medium with thumbnails)
  - Expanded View (full article preview)
- [ ] Add AI summarization UI (mock)
- [ ] Add priority badges with color coding
- [ ] Add bookmark functionality
- [ ] Add share functionality
- [ ] Add export functionality
- [ ] Add advanced filtering UI

### Design Enhancements
- [ ] Add spotlight hover effects on article cards
- [ ] Add glass-morphism to cards
- [ ] Add smooth transitions between view modes
- [ ] Add loading skeletons
- [ ] Improve mobile responsive design

### Testing
- [ ] Test all 3 view modes
- [ ] Test filtering (source, status, priority, date)
- [ ] Test search functionality
- [ ] Test bookmark toggle
- [ ] Test read/unread toggle
- [ ] Test article detail drawer
- [ ] Test mobile view

---

## Phase 7: 📋 PENDING - Sources Management (Admin)

### Tasks
- [ ] Migrate `pages/Sources.js` → `pages/Sources.tsx`
  - Replace antd Card with shadcn/ui Card
  - Replace antd Form with react-hook-form + shadcn/ui
  - Replace antd Modal with shadcn/ui Dialog
  - Replace antd Switch with shadcn/ui Switch
  - Replace antd Badge with shadcn/ui Badge
  - Keep grid layout

### Design Enhancements
- [ ] Add glass-morphism to source cards
- [ ] Add status indicators with animations
- [ ] Add hover effects
- [ ] Improve add/edit form UI

### Testing
- [ ] Test add source
- [ ] Test edit source
- [ ] Test delete source
- [ ] Test feed connectivity test
- [ ] Test auto-summarize toggle
- [ ] Test admin-only access

---

## Phase 8: 📋 PENDING - Watchlist Page

### Tasks
- [ ] Migrate `pages/Watchlist.js` → `pages/Watchlist.tsx`
  - Replace antd components with shadcn/ui equivalents
  - Keep personal watchlist functionality
  - Keep global watchlist (admin) functionality
  - Replace antd Table with TanStack Table

### New Features
- [ ] Add import keywords functionality
- [ ] Add export keywords functionality
- [ ] Add real-time match statistics visualization
- [ ] Add severity badges (Critical/High/Medium/Low)

### Design Enhancements
- [ ] Add glass-morphism to cards
- [ ] Add animated match counters
- [ ] Improve keyword management UI

### Testing
- [ ] Test personal watchlist (user)
- [ ] Test global watchlist (admin)
- [ ] Test keyword add/edit/delete
- [ ] Test import/export
- [ ] Test match statistics

---

## Phase 9: 📋 PENDING - User Profile & Admin Panel

### User Profile Tasks
- [ ] Migrate `pages/UserProfile.js` → `pages/UserProfile.tsx`
  - Replace antd components with shadcn/ui
  - Replace antd Form with react-hook-form

### New Features
- [ ] Add 2FA setup UI (mock QR code)
- [ ] Add display preferences (view mode, articles per page)
- [ ] Add data export option
- [ ] Add data delete option

### Admin Panel Tasks
- [ ] Migrate `pages/Admin.js` → `pages/Admin.tsx`
  - Replace antd components with shadcn/ui
  - Keep UnifiedUserManagement component (migrate later)
  - Keep ConfigurationManager component (migrate later)

### Testing
- [ ] Test profile editing
- [ ] Test password change
- [ ] Test 2FA setup UI
- [ ] Test user management (admin)
- [ ] Test system configuration (admin)

---

## Phase 10: 📋 PENDING - Navigation & Remaining Components

### Tasks
- [ ] Migrate `components/NavBar.js` → `NavBar.tsx`
  - Replace antd Menu with custom navigation
  - Keep role-based menu items
  - Keep impersonation indicator

- [ ] Migrate remaining components:
  - [ ] UnifiedUserManagement.js → UnifiedUserManagement.tsx
  - [ ] ConfigurationManager.js → ConfigurationManager.tsx
  - [ ] GuardrailsManager.js → GuardrailsManager.tsx
  - [ ] ComprehensiveRBACManager.js → ComprehensiveRBACManager.tsx

### Testing
- [ ] Test navigation
- [ ] Test role-based access
- [ ] Test impersonation flow
- [ ] Test all admin components

---

## Phase 11: 📋 PENDING - Polish & Animations

### Global Enhancements
- [ ] Add glass-morphism CSS classes globally
- [ ] Add spotlight hover effect utility
- [ ] Add GSAP-style animation utilities
- [ ] Optimize animations for 60fps
- [ ] Add loading skeletons for all pages
- [ ] Add error boundaries for all pages

### Accessibility
- [ ] Test keyboard navigation
- [ ] Test focus indicators
- [ ] Test reduced motion support
- [ ] Test screen reader compatibility

### Responsive Design
- [ ] Test desktop layout (1920px+)
- [ ] Test laptop layout (1280px-1920px)
- [ ] Test tablet layout (768px-1280px)
- [ ] Test mobile layout (<768px)

---

## Phase 12: 📋 PENDING - Cleanup & Testing

### Cleanup Tasks
- [ ] Remove antd dependency from package.json
- [ ] Remove unused .js files (after confirming .tsx works)
- [ ] Remove unused CSS files
- [ ] Clean up imports
- [ ] Update package.json scripts if needed

### Testing Tasks
- [ ] Run `npm run build` - ensure TypeScript compiles
- [ ] Run Playwright E2E tests - ensure all pass
- [ ] Manual testing of all pages
- [ ] Test all 6 themes on all pages
- [ ] Test OAuth flow end-to-end
- [ ] Performance testing (Lighthouse)

### Documentation
- [ ] Update README.md
- [ ] Document new component patterns
- [ ] Document animation utilities
- [ ] Create component style guide

---

## Dependencies Between Phases

```
Phase 0 (Foundation) → Phase 1 (Dependencies)
Phase 1 → Phase 2 (Contexts) → Phase 3 (Shared Components)
Phase 3 → Phase 4 (Login)
Phase 3 → Phase 5 (Dashboard)
Phase 3 → Phase 6 (NewsFeeds)
Phase 3 → Phase 7 (Sources)
Phase 3 → Phase 8 (Watchlist)
Phase 3 → Phase 9 (Profile & Admin)
Phase 9 → Phase 10 (NavBar & Remaining)
Phase 10 → Phase 11 (Polish)
Phase 11 → Phase 12 (Cleanup & Testing)
```

---

## Risk Mitigation

1. **Gradual Migration:** JavaScript and TypeScript coexist
2. **No Deletion:** Keep .js files until .tsx is tested
3. **Frequent Commits:** Commit after each phase
4. **Incremental Testing:** Test each page after migration
5. **Rollback Plan:** Git history allows easy rollback

---

## Success Metrics

- [ ] 0 TypeScript compilation errors
- [ ] 0 runtime errors
- [ ] All Playwright tests passing
- [ ] All 6 themes working
- [ ] OAuth flow working
- [ ] All features from demo implemented
- [ ] Performance: 60fps animations
- [ ] Accessibility: WCAG AA compliance
- [ ] Bundle size: < 500KB (gzipped)

---

**Current Status:** Phase 1 - Blocked on npm dependency installation
**Next Action:** Resolve npm installation, then continue with dependency installation
