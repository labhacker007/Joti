# JOTI Feature Audit - Feature List Review

**Purpose:** Identify which features are REQUIRED vs EXTRA for deletion

---

## Current Features in JOTI-FEATURES.md

### ✅ CORE FEATURES (Recommended to Keep)

| # | Feature | Page | Status | Why Keep? |
|---|---------|------|--------|-----------|
| 1 | Login/Email & Password Auth | /login | Implemented | Essential for access |
| 2 | News Feed Display | /news | Implemented | Core functionality |
| 3 | Article Read/Unread Toggle | /news | Implemented | Basic article interaction |
| 4 | Article Bookmarks | /news | Implemented | User workflow |
| 5 | View Themes | /login | Implemented | UI/UX |
| 6 | Watchlist Keywords | /watchlist | Implemented | Alert system |
| 7 | RSS/Atom Feed Ingestion | Backend | Implemented | Core data source |

---

### ⚠️ POTENTIALLY EXTRA FEATURES (Candidates for Deletion)

| # | Feature | Page | Status | Notes |
|---|---------|------|--------|-------|
| 1 | Google OAuth Sign In | /login | Implemented | Extra auth method |
| 2 | Microsoft OAuth Sign In | /login | Implemented | Extra auth method |
| 3 | Article Summarization (OpenAI) | /news | Implemented | AI feature - depends on OpenAI |
| 4 | Article Export to PDF | /news | Implemented | Extra feature |
| 5 | Article Export to Word | /news | Implemented | Extra feature |
| 6 | Article Share/Email | /news | Implemented | Extra feature |
| 7 | Sources Management (Admin) | /sources | Implemented | Admin-only feature |
| 8 | Source Refresh Settings | /sources | Implemented | Admin-only feature |
| 9 | User Profile Page | /profile | Implemented | User settings |
| 10 | Password Change | /profile | Implemented | Security feature |
| 11 | OTP/2FA Setup | /profile | Implemented | Security feature |
| 12 | Admin Panel | /admin | Implemented | Full admin dashboard |
| 13 | User Management (Admin) | /admin | Implemented | Admin-only feature |
| 14 | RBAC Management (Admin) | /admin | Implemented | Admin-only feature |
| 15 | Audit Logs | /audit | Implemented | Logging feature |
| 16 | GenAI Features (Ollama) | /admin | Implemented | AI feature |
| 17 | Theme System (6 themes) | Global | Implemented | UI customization |
| 18 | Guardrails Management | /admin | Implemented | AI safeguard feature |
| 19 | Prompt Templates | /admin | Implemented | AI feature |

---

## Questions for Clarification

**Based on your Kimi website duplicate request:**

### Q1: Theme Duplication
You mentioned duplicating the Kimi theme. Do you want to:
- [ ] Keep only 1 theme (the Kimi-based one)?
- [ ] Keep 2-3 themes?
- [ ] Keep all 6 themes?

**Suggested:** Keep 1-2 themes max

---

### Q2: Core vs Admin Features
Do you want to keep admin features?
- [ ] YES - Keep /sources, /admin, RBAC, User Management
- [ ] NO - Remove all admin features
- [ ] PARTIAL - Keep only basic source management

**Suggested:** PARTIAL (basic source management only)

---

### Q3: Authentication Methods
Do you want to keep OAuth (Google/Microsoft)?
- [ ] YES - Keep both
- [ ] NO - Remove OAuth, keep email/password only
- [ ] PARTIAL - Keep one OAuth provider

**Suggested:** NO (email/password only, simpler)

---

### Q4: Advanced Features
Do you want to keep these advanced features?

**Export Features:**
- [ ] PDF Export
- [ ] Word Export
- [ ] Keep both / Keep one / Remove both?

**Suggested:** Remove (simplify to basic reading)

---

**AI Features (Summarize, GenAI Admin):**
- [ ] Keep OpenAI summarization
- [ ] Keep GenAI admin panel
- [ ] Keep both / Keep one / Remove both?

**Suggested:** Remove (focus on feed reading)

---

### Q5: Article Actions
Do you want to keep all article actions?

Current actions per article:
1. Read/Unread ✅ (KEEP - core)
2. Bookmark ✅ (KEEP - core)
3. Summarize ❌ (DELETE - AI feature)
4. Expand/Read Full ❓ (NECESSARY?)
5. Share/Email ❌ (DELETE - extra)
6. Export PDF ❌ (DELETE - extra)
7. More Options ❌ (DELETE - extra)

**Suggested:** Keep 1-3 actions

---

### Q6: User Profile Features
Do you want to keep?
- [ ] Profile page (name, email, picture)
- [ ] Password change
- [ ] OTP/2FA setup
- [ ] Preference settings
- [ ] Keep all / Keep some / Remove all?

**Suggested:** MINIMAL (just display current user info)

---

### Q7: Admin Features (for Admins only)
Do you want to keep?
- [ ] Source management (/sources)
- [ ] User management
- [ ] RBAC configuration
- [ ] Audit logs
- [ ] GenAI admin panel
- [ ] Keep all / Keep some / Remove all?

**Suggested:** BASIC (source management + logs only)

---

### Q8: Watchlist Features
Do you want to keep global + personal watchlist?
- [ ] YES - Keep both
- [ ] NO - Remove global, keep personal only
- [ ] NO - Remove both, keep simple keyword search

**Suggested:** Personal only (simpler)

---

### Q9: Search & Filter
Do you want complex search/filter?
- [ ] YES - Keep all filters (status, priority, date, source)
- [ ] NO - Simple search only
- [ ] PARTIAL - Keep only some filters

**Suggested:** MINIMAL (title search only)

---

### Q10: View Modes
Do you want multiple view modes?
- [ ] List View ✅ (SIMPLE)
- [ ] Card View ❓
- [ ] Expanded View ❓
- [ ] Keep all / Keep one / Keep two?

**Suggested:** ONE view only (list or card)

---

## Feature Deletion Impact

### IF WE DELETE AI/OAuth/Export Features:

**Files to Remove:**
- `components/GuardrailsManager.js`
- `components/ConfigurationManager.js` (GenAI config)
- OAuth configuration files
- PDF/Word export utilities
- AI summarization API calls

**Size Reduction:** ~30-40% code reduction

**Startup Impact:** Faster, simpler, fewer dependencies

---

### IF WE DELETE Admin Features (except sources):

**Files to Remove:**
- User management UI components
- RBAC manager components
- Advanced admin panels
- User management pages
- Audit logs detail views

**Size Reduction:** ~20-25% code reduction

**Impact:** Only admin users affected, less config UI

---

### IF WE DELETE Advanced Watchlist:

**Simplification:**
- Remove global watchlist tab
- Remove statistics
- Remove import/export
- Keep personal keywords only

**Size Reduction:** ~10% code reduction

**Impact:** Users still get alerts, just simpler UI

---

## Kimi Website Reference

**You mentioned:** Duplicate Kimi theme and features

**Questions about Kimi:**
1. What is the primary purpose of the Kimi website?
2. What are the 5-7 core features?
3. What theme colors/design should we replicate?
4. Are there any admin features on Kimi?

**Share the details so I can:**
- Match the exact feature set
- Replicate the theme properly
- Delete incompatible features

---

## RECOMMENDED MINIMAL JOTI

Based on "news feed aggregator" purpose:

### Essential Features (MUST KEEP)
✅ Login (email/password)
✅ News feed display
✅ Article read/unread
✅ Bookmarks
✅ Personal watchlist keywords
✅ Basic search
✅ RSS/Atom ingestion

### Nice to Have (MAYBE KEEP)
⚠️ One theme
⚠️ User profile (name, email)
⚠️ Basic admin source management

### Should DELETE
❌ Google/Microsoft OAuth
❌ OpenAI summarization
❌ PDF/Word export
❌ Share/Email
❌ Multiple view modes
❌ Advanced admin features
❌ GenAI/Ollama features
❌ RBAC/User management
❌ Global watchlist
❌ Complex filters

---

## Next Steps

1. **Review this list**
2. **Check what's on the Kimi website**
3. **Tell me which features to DELETE**
4. **I'll remove them from the codebase**

**Format for your response:**
```
DELETE:
- Google OAuth
- OpenAI Summarization
- PDF Export
[etc...]

KEEP:
- Email/Password Login
- News Feed Display
[etc...]

KIMI REFERENCE:
[Describe Kimi features/theme]
```

---

## Current Implementation Status

### Pages in Frontend
- `/login` - Login & theme selection
- `/news` - Article feed display
- `/dashboard` - Redirects to /news (OPTIONAL)
- `/sources` - Admin source management
- `/profile` - User profile
- `/watchlist` - Watchlist management
- `/admin` - Full admin panel
- `/audit` - Audit logs

### Components
- Navigation bar (shows user, theme, logout)
- Protected routes (auth check)
- Theme manager (6 themes)
- Multiple admin panels
- RBAC manager
- User management

### Features Implemented
- All 20+ features listed above
- RBAC system (roles + permissions)
- JWT authentication
- OAuth (Google, Microsoft)
- OpenAI integration
- PDF/Word export
- Audit logging
- Theme customization

---

**Please provide your feature deletion list and Kimi reference details, and I'll clean up the codebase!**
