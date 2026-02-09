# JOTI Kimi Theme Integration Plan

**Status:** Planning Phase
**Date:** February 9, 2026
**Goal:** Replicate Kimi theme and design while preserving all JOTI features

---

## ✅ Fixed Issue: Admin Portal Now Visible

**Problem:** Admin users couldn't see the /admin portal menu item

**Root Cause:** Database was initialized with old "huntsphere_user" instead of "joti_user"

**Solution:** Fresh database initialization with docker-compose down -v

**Result:** ✅ Admin user is now created correctly:
- Email: admin@joti.local
- Password: Joti123!@2026
- Role: ADMIN

**You can now:**
1. Login with admin credentials
2. Access /admin panel from the navbar
3. See all admin features

---

## Kimi Design Analysis

### Tech Stack (from template)
- **Framework:** React 19
- **Build Tool:** Vite
- **Styling:** Tailwind CSS + Shadcn/ui
- **UI Library:** Radix UI
- **Icons:** Lucide React
- **Animations:** GSAP
- **3D Graphics:** Three.js / R3F
- **Forms:** React Hook Form

### Key Features in Kimi Template
1. **Login Page** - Clean, minimal design
2. **Dashboard** - Analytics/overview
3. **News Page** - Feed display
4. **Sources Page** - Admin feed management
5. **Watchlist** - Keyword tracking
6. **Profile** - User settings
7. **Admin** - Admin panel
8. **Theme System** - Light/dark support
9. **Custom Router** - Simple navigation
10. **Auth Context** - User authentication

### Design Style
- **Color Scheme:** Modern, minimal
- **Typography:** Clean, professional
- **Spacing:** Generous whitespace
- **Interactions:** Smooth animations (GSAP)
- **Accessibility:** Radix UI built-in
- **Responsiveness:** Tailwind CSS responsive

---

## Current JOTI Architecture

### Frontend Stack
- **Framework:** React 18
- **Build Tool:** Create React App (CRA)
- **Styling:** CSS + Ant Design (AntD)
- **UI Library:** Ant Design components
- **Icons:** Ant Design icons
- **Routing:** React Router v6

### Current Features (ALL TO KEEP)
✅ Email/Password + OAuth login (Google, Microsoft)
✅ News feed display with articles
✅ Read/Unread, Bookmarks, Summarize
✅ PDF/Word export
✅ Email/Share features
✅ RSS/Atom feed ingestion
✅ Admin source management
✅ User management with RBAC
✅ Watchlist (personal + global)
✅ Audit logs
✅ GenAI/Ollama integration
✅ Multiple themes (6 total)
✅ Advanced admin panels

---

## Integration Strategy

### Phase 1: Setup Kimi Base (Week 1)
- [ ] Copy Kimi template to JOTI project
- [ ] Integrate Tailwind CSS into JOTI
- [ ] Integrate Radix UI components
- [ ] Set up Kimi's theme system in JOTI
- [ ] Update package.json dependencies

### Phase 2: Migrate Core Pages (Week 2)
- [ ] **Login Page** - Recreate with Kimi design
  - Keep: OAuth buttons, email/password form
  - New: Kimi theme styling
  - Keep: Theme selector
- [ ] **Dashboard** - Recreate layout
  - Keep: Stats, widgets
  - New: Kimi design
- [ ] **News Page** - Migrate article display
  - Keep: All features (read, bookmark, summarize, export, share)
  - New: Kimi styling
- [ ] **Sources Page** - Admin source management
  - Keep: All CRUD operations
  - New: Kimi design

### Phase 3: Migrate Advanced Pages (Week 3)
- [ ] **Watchlist** - Keep all features, new design
  - Keep: Personal + global watchlists
  - Keep: Import/export
  - New: Kimi styling
- [ ] **Profile** - User settings with new design
  - Keep: All features
  - New: Kimi styling
- [ ] **Admin Panel** - Full admin suite
  - Keep: User management, RBAC, GenAI, Guardrails, etc.
  - New: Kimi design

### Phase 4: Advanced Features (Week 4)
- [ ] **Audit Logs** - Migrate UI
- [ ] **Theme System** - Keep 6 themes, apply Kimi design
- [ ] **Animations** - Add GSAP animations
- [ ] **Responsive Design** - Tailwind responsive classes

---

## Step-by-Step Implementation

### Step 1: Copy Kimi Template Files
```bash
# Copy Kimi src structure to JOTI frontend
cp -r "C:/Users/tarun/Downloads/Kimi_Agent_Joti Website Template/app/src/*" \
  frontend/src/

# Keep JOTI's API client and context
# Merge Kimi's ThemeContext if better
```

### Step 2: Install Kimi Dependencies
```bash
cd frontend

# Add new dependencies
npm install \
  @radix-ui/react-select \
  @radix-ui/react-dropdown-menu \
  @radix-ui/react-dialog \
  lucide-react \
  tailwindcss \
  tailwind-merge \
  clsx \
  gsap \
  @gsap/react

# Remove old Ant Design dependencies if possible
npm uninstall antd
```

### Step 3: Update Tailwind Config
Copy Kimi's `tailwind.config.js` and `postcss.config.js` to JOTI

### Step 4: Migrate Components One by One

**Login Page Priority:**
1. Copy Kimi's Login component
2. Keep JOTI's OAuth handlers
3. Keep JOTI's theme selector
4. Update API calls to use JOTI's client

**Example - Update OAuth button handler:**
```jsx
// Keep JOTI's logic
const handleGoogleLogin = () => {
  window.location.href = `${API_URL}/auth/google/login`;
};

// Use in Kimi's UI
<button onClick={handleGoogleLogin}>
  Sign in with Google
</button>
```

### Step 5: Preserve All Functionality

**Critical:** Every feature MUST work after migration

| Feature | Current | Action |
|---------|---------|--------|
| Email/Password Login | ✅ | Keep API integration |
| Google OAuth | ✅ | Keep API endpoint |
| Microsoft OAuth | ✅ | Keep API endpoint |
| News Feed Display | ✅ | Keep API calls, new UI |
| Read/Unread Toggle | ✅ | Keep functionality, new UI |
| Bookmarks | ✅ | Keep functionality, new UI |
| Summarize (OpenAI) | ✅ | Keep API calls, new UI button |
| PDF Export | ✅ | Keep API calls, new UI button |
| Word Export | ✅ | Keep API calls, new UI button |
| Share/Email | ✅ | Keep API calls, new UI button |
| Admin Sources | ✅ | Keep CRUD, new UI |
| User Management | ✅ | Keep all, new UI |
| RBAC | ✅ | Keep all, new UI |
| GenAI/Ollama | ✅ | Keep all, new UI |
| Guardrails | ✅ | Keep all, new UI |
| Watchlist | ✅ | Keep all, new UI |
| Audit Logs | ✅ | Keep all, new UI |

---

## File Structure After Migration

```
frontend/
├── src/
│   ├── api/
│   │   └── client.js (JOTI's API client - KEEP)
│   ├── components/ (FROM KIMI)
│   │   ├── layout/
│   │   │   └── MainLayout.tsx
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   └── ... (other components)
│   ├── contexts/ (BLEND BOTH)
│   │   ├── ThemeContext.tsx (Use Kimi's if better)
│   │   ├── AuthContext.tsx (Use Kimi's + JOTI API)
│   │   └── ...
│   ├── pages/ (FROM KIMI + JOTI Logic)
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── News.tsx
│   │   ├── Sources.tsx
│   │   ├── Watchlist.tsx
│   │   ├── Profile.tsx
│   │   └── Admin.tsx
│   ├── lib/ (FROM KIMI)
│   │   ├── utils.ts
│   │   └── ...
│   ├── types/ (FROM KIMI)
│   ├── App.tsx (FROM KIMI + tweaks)
│   ├── App.css (FROM KIMI)
│   └── index.css (FROM KIMI + Tailwind)
├── tailwind.config.js (FROM KIMI)
├── postcss.config.js (FROM KIMI)
├── vite.config.ts (USE OR KEEP CRA)
└── package.json (MERGE DEPENDENCIES)
```

---

## Testing Checklist

After each phase, verify:

### Phase 1 Verification
- [ ] App builds without errors
- [ ] Login page loads
- [ ] Styles apply correctly
- [ ] No console errors

### Phase 2 Verification
- [ ] Login works (email/password)
- [ ] OAuth buttons work
- [ ] Theme changes apply
- [ ] Can access dashboard
- [ ] News feed displays articles
- [ ] Admin sources page works

### Phase 3 Verification
- [ ] All features still functional
- [ ] Watchlist works
- [ ] Profile page works
- [ ] Admin panel accessible

### Phase 4 Verification
- [ ] Animations smooth
- [ ] Responsive on mobile
- [ ] All themes working
- [ ] No performance issues

---

## Risk Mitigation

### Risks & Solutions

| Risk | Mitigation |
|------|-----------|
| Breaking API integration | Keep all API files, only change UI |
| Losing features | Comprehensive testing after each change |
| Performance degradation | Monitor bundle size, lazy load routes |
| Browser incompatibility | Test on Chrome, Firefox, Safari, Edge |
| Mobile responsiveness | Use Tailwind's responsive classes |

---

## Before We Start

**Please confirm:**

1. ✅ **Admin portal now accessible?**
   - Try: http://localhost:3000/admin
   - Should see admin menu in navbar

2. ✅ **All features should be preserved?**
   - Keep ALL: OAuth, Summarize, Export, Share, Admin, RBAC, GenAI, etc.

3. **Kimi website access?**
   - URL: https://tpt46nx6wlr72.ok.kimi.link/login
   - Credentials: (on landing page)
   - Can you access it to see the actual design?

4. **Timeline realistic?**
   - 4 weeks for full migration?
   - Or shorter timeline preferred?

5. **Rollback plan?**
   - Keep current version in separate branch?
   - Or commit to Kimi migration fully?

---

## Next Steps

Once you confirm the above:

1. ✅ Verify admin portal is working
2. ✅ Access Kimi website to see real design
3. ✅ Start Phase 1: Setup Kimi base
4. ✅ Migrate pages one by one
5. ✅ Test all features after each page
6. ✅ Deploy Kimi-themed JOTI

---

## Summary

**Current Status:** Admin portal fixed ✅

**Next:** Kimi theme integration

**Goal:** Beautiful Kimi design + All JOTI features

**Timeline:** 4 weeks (or customized)

**Approach:** Migrate UI layer, keep all functionality

---

**Ready to proceed with Kimi theme integration?**

Let me know if you can access the Kimi website and we'll start the migration!
