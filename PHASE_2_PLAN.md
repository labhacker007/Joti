# Phase 2: Watchlist & User Profile APIs Integration - PLAN

**Duration:** Weeks 4-5 (10 business days)
**Status:** Planning Complete - Ready to Implement
**Priority:** High (Core Feature)

---

## Overview

Phase 2 focuses on integrating existing backend watchlist and user profile APIs with the frontend, removing mock data, and enhancing the user profile with tabbed interface for managing custom sources, watchlist, and preferences.

---

## Current State Analysis

### Backend (Already Complete ✅)
- ✅ Watchlist API fully implemented (`backend/app/watchlist/routes.py`)
- ✅ 4 endpoints: GET list, POST create, PATCH update, DELETE delete
- ✅ User profile API exists (`backend/app/users/routes.py`)
- ✅ Permission checks in place (MANAGE_WATCHLISTS, READ_ARTICLES)
- ✅ Database models ready (WatchListKeyword, User, Article)
- ✅ Automatic article priority marking on keyword changes

### Frontend (Partial ✅, Needs Integration)
- ✅ Watchlist page exists with UI structure
- ✅ User profile page exists with basic functionality
- ✅ Both use mock data (lines marked with `// Mock data`)
- ❌ No API integration
- ❌ No custom sources management
- ❌ No watchlist management in user profile

### API Client (Status Unknown)
- ❓ `usersAPI` exists - likely has user endpoints
- ❓ `watchlistAPI` - may not exist yet
- Need to check and extend as needed

---

## Detailed Implementation Tasks

### Week 1 (Days 1-3): API Client & Watchlist Integration

#### Task 1.1: Create/Update Watchlist API Client
**File:** `frontend-nextjs/api/client.ts` (or create `frontend-nextjs/api/watchlist.ts`)

Current state: Check if watchlistAPI exists
- [ ] Create `WatchlistAPI` class or extend existing
- [ ] Implement endpoints:
  ```typescript
  class WatchlistAPI {
    async getKeywords(): Promise<WatchlistKeywordResponse[]>
    async createKeyword(keyword: string, scope?: 'global' | 'personal'): Promise<WatchlistKeywordResponse>
    async updateKeyword(keywordId: number, updates: Partial<WatchlistKeywordResponse>): Promise<WatchlistKeywordResponse>
    async deleteKeyword(keywordId: number): Promise<{message: string}>
    async getStatistics(keywordId?: number): Promise<WatchlistStats>
    async matchArticles(articles: Article[]): Promise<{[articleId]: string[]}>
  }
  ```

- [ ] Add error handling with proper HTTP status codes
- [ ] Add loading states
- [ ] Add retry logic for failed requests
- [ ] Export from main API client module

**Success Criteria:**
- All 6 endpoints callable
- Proper TypeScript typing
- Error responses handled correctly
- Can test with Postman/API docs

---

#### Task 1.2: Update Watchlist Frontend Page
**File:** `frontend-nextjs/pages/Watchlist.tsx`

Changes:
- [ ] Remove mock data (lines 59-90)
- [ ] Import `watchlistAPI` (create if needed)
- [ ] Update `loadWatchlist()` to use API:
  ```typescript
  const loadWatchlist = async () => {
    try {
      setLoading(true);
      const keywords = await watchlistAPI.getKeywords();
      setItems(keywords.map(k => ({
        id: k.id.toString(),
        keyword: k.keyword,
        is_active: k.is_active,
        created_at: k.created_at,
        updated_at: k.updated_at,
      })));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  ```

- [ ] Update `handleAddOrUpdate()` to use API:
  ```typescript
  const handleAddOrUpdate = async () => {
    if (editingId) {
      await watchlistAPI.updateKeyword(parseInt(editingId), formData);
    } else {
      await watchlistAPI.createKeyword(formData.keyword);
    }
    await loadWatchlist(); // Refresh from server
  };
  ```

- [ ] Update `handleDelete()` to use API:
  ```typescript
  const handleDelete = async (id: string) => {
    if (!confirm('Remove this keyword?')) return;
    await watchlistAPI.deleteKeyword(parseInt(id));
    await loadWatchlist();
  };
  ```

- [ ] Add toast notifications on success/error
- [ ] Add loading spinners during API calls
- [ ] Add optimistic UI updates
- [ ] Handle permission errors (403)

**Testing:**
- [ ] Add watchlist item → appears in list
- [ ] Edit watchlist item → updates in place
- [ ] Delete watchlist item → removed from list
- [ ] Refresh page → data persists from backend
- [ ] Error handling → shows friendly error message

---

#### Task 1.3: Update User Profile - Sources Tab
**File:** `frontend-nextjs/pages/UserProfile.tsx` - New Tab Implementation

Architecture:
```typescript
// Add TabsComponent (or use existing)
const PROFILE_TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'sources', label: 'Custom Sources', icon: Rss },
  { id: 'watchlist', label: 'Watchlist', icon: Bell },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'preferences', label: 'Preferences', icon: Settings },
];
```

- [ ] Create `components/ProfileTabs.tsx` component
- [ ] Add state: `const [activeTab, setActiveTab] = useState('profile')`
- [ ] Implement tab switching UI with icons
- [ ] Move existing profile content to Profile tab
- [ ] Move security content to Security tab
- [ ] Create new tabs: Sources, Watchlist, Preferences

**Sources Tab Details:**
```typescript
interface UserSource {
  id: number;
  url: string;
  name: string;
  type: 'RSS' | 'WEBSITE' | 'CUSTOM';
  is_active: boolean;
  last_synced?: string;
  sync_interval?: number;
}

const [sources, setSources] = useState<UserSource[]>([]);

// UI Layout:
// - List of user's custom sources
// - "Add Source" button
// - For each source:
//   - URL + Name
//   - Type badge (RSS/Website/Custom)
//   - Active toggle
//   - Last synced timestamp
//   - Delete button
// - Add/Edit modal with URL input, name, type selector
```

- [ ] Fetch user's custom sources on mount
- [ ] Implement add source functionality
- [ ] Implement edit source functionality
- [ ] Implement delete source functionality
- [ ] Add source URL validation (http/https)
- [ ] Show last sync timestamp
- [ ] Allow toggling source active/inactive
- [ ] Show empty state with helpful message

**Success Criteria:**
- Can add new source (appear immediately)
- Can edit source (URL, name, type)
- Can delete source (confirmation)
- Can toggle source active/inactive
- Sources persist after page refresh
- Proper error messages

---

### Week 2 (Days 4-5): User Profile Enhancements & Profile Tab Completion

#### Task 2.1: Watchlist Tab in User Profile
**File:** `frontend-nextjs/pages/UserProfile.tsx` - Watchlist Tab

```typescript
// UI Layout (in profile/watchlist tab):
// - Top 5 user's personal watchlist keywords
// - "Manage Watchlist" button (link to /watchlist)
// - For each keyword (read-only):
//   - Keyword name
//   - Active status (badge)
//   - Match count (stats)
//   - Last matched date
//   - Edit icon (opens modal)
// - Quick edit modal for keyword status
```

- [ ] Fetch user's watchlist keywords
- [ ] Display top 5 keywords (or configurable limit)
- [ ] Show keyword stats (match count, last matched)
- [ ] Implement quick toggle for active/inactive
- [ ] Add "View All" button → links to full Watchlist page
- [ ] Real-time update on toggle

**Success Criteria:**
- Shows user's keywords
- Can toggle active/inactive
- Displays match statistics
- Handles no keywords case (empty state)
- Updates in real-time

---

#### Task 2.2: Security Tab Enhancement
**File:** `frontend-nextjs/pages/UserProfile.tsx` - Enhance Existing

Changes to existing security content:
- [ ] Add login history section:
  ```typescript
  interface LoginHistory {
    id: number;
    login_time: string;
    ip_address: string;
    user_agent: string;
    location?: string;
  }
  ```
- [ ] Show last 5 logins
- [ ] Display IP address + User-Agent
- [ ] Show approximate location if available
- [ ] Add "View Full History" button

- [ ] Enhanced 2FA section:
  - Show enabled status with toggle
  - Show last 2FA used date
  - Option to disable 2FA
  - Option to view backup codes

- [ ] Add device management section:
  - List active sessions/devices
  - Show login time, IP, location
  - "Sign out this device" button
  - "Sign out all other devices" button

**Success Criteria:**
- Can view login history
- Can manage 2FA
- Can sign out devices
- Proper security warnings for destructive actions

---

#### Task 2.3: Preferences Tab
**File:** `frontend-nextjs/pages/UserProfile.tsx` - New Preferences Tab

```typescript
interface UserPreferences {
  notify_email_summary: 'daily' | 'weekly' | 'never';
  notify_watchlist_matches: boolean;
  notify_new_articles: boolean;
  timezone: string;
  articles_per_page: number;
  theme_preference: 'auto' | 'light' | 'dark'; // Optional
  email_digest_type: 'executive' | 'technical' | 'brief';
}
```

UI Layout:
- [ ] Notification preferences:
  - Email summary frequency dropdown
  - Toggle for watchlist alerts
  - Toggle for new articles
  - Email digest type selector

- [ ] Display preferences:
  - Timezone selector (react-timezone-select)
  - Articles per page (5, 10, 25, 50)
  - Default view (timeline/grid/list)
  - Sort order (newest/oldest)

- [ ] Content preferences:
  - Language selector
  - Content categories to follow
  - Source preference

- [ ] Save button with confirmation

Implementation:
- [ ] Fetch user preferences on mount
- [ ] Implement form with all controls
- [ ] Add onChange handlers with debounce
- [ ] Implement save with validation
- [ ] Show success message
- [ ] Handle errors gracefully

**Success Criteria:**
- All preferences saveable
- Changes persist after refresh
- Proper validation
- Clear labels and help text
- Empty state handling

---

### Integration & Testing (Days 6-10)

#### Task 3.1: API Integration Testing
- [ ] Test watchlist API with real backend
- [ ] Test sources API with real backend
- [ ] Test preferences API with real backend
- [ ] Test permission denied scenarios
- [ ] Test network error scenarios
- [ ] Test empty state scenarios

#### Task 3.2: UI/UX Polish
- [ ] Add loading spinners
- [ ] Add toast notifications for actions
- [ ] Add undo functionality where applicable
- [ ] Add keyboard shortcuts (if applicable)
- [ ] Improve form validation messages
- [ ] Add tooltips for complex features
- [ ] Test responsive design on mobile/tablet

#### Task 3.3: Performance Optimization
- [ ] Implement pagination for large lists
- [ ] Add client-side caching
- [ ] Optimize API calls (debounce, batch)
- [ ] Lazy load tab content
- [ ] Add loading states for images
- [ ] Measure Lighthouse scores

#### Task 3.4: Accessibility
- [ ] Add aria labels
- [ ] Test keyboard navigation
- [ ] Test screen reader compatibility
- [ ] Ensure color contrast ratios
- [ ] Test with accessibility tools

---

## Files to Modify/Create

### New Files to Create
- [ ] `frontend-nextjs/api/watchlist.ts` (if not exists)
- [ ] `frontend-nextjs/components/ProfileTabs.tsx`
- [ ] `frontend-nextjs/hooks/useWatchlist.ts`
- [ ] `frontend-nextjs/hooks/useSources.ts`
- [ ] `frontend-nextjs/hooks/usePreferences.ts`

### Files to Modify
- [ ] `frontend-nextjs/pages/Watchlist.tsx` - API integration
- [ ] `frontend-nextjs/pages/UserProfile.tsx` - Complete redesign
- [ ] `frontend-nextjs/api/client.ts` - Add watchlistAPI export
- [ ] `backend/app/sources/routes.py` (if new endpoints needed)
- [ ] `backend/app/preferences/routes.py` (if new endpoints needed)

### Unchanged
- [ ] `backend/app/watchlist/routes.py` (already complete)
- [ ] `backend/app/models.py` (check if additions needed)
- [ ] `backend/app/users/routes.py` (check if profile endpoints exist)

---

## API Endpoints Reference

### Backend (FastAPI)

**Watchlist Endpoints:**
```
GET    /api/watchlist/                 - List all keywords
POST   /api/watchlist/                 - Create keyword
PATCH  /api/watchlist/{id}            - Update keyword
DELETE /api/watchlist/{id}            - Delete keyword
POST   /api/watchlist/refresh         - Refresh all matches
```

**Expected to Exist:**
```
GET    /api/users/profile             - Get current user profile
PUT    /api/users/profile             - Update profile
POST   /api/users/change-password     - Change password
GET    /api/users/preferences         - Get user preferences
PUT    /api/users/preferences         - Update preferences
POST   /api/users/add-source          - Add custom source
GET    /api/users/sources             - List user sources
PUT    /api/users/sources/{id}        - Update source
DELETE /api/users/sources/{id}        - Delete source
GET    /api/users/login-history       - Get login history
```

**May Need to Create:**
```
PUT    /api/users/2fa/toggle          - Enable/disable 2FA
GET    /api/users/devices             - List active devices
DELETE /api/users/devices/{id}        - Sign out device
DELETE /api/users/devices             - Sign out all other devices
GET    /api/users/preferences/timezones - List available timezones
```

---

## Success Criteria

### Functional
- [x] Watchlist page uses real API (not mock data)
- [x] User profile has 5 tabs (Profile, Sources, Watchlist, Security, Preferences)
- [x] Can add/edit/delete custom sources
- [x] Can view and manage watchlist keywords
- [x] Can toggle 2FA
- [x] Can view login history
- [x] Can set preferences
- [x] All changes persist after page refresh

### Technical
- [x] Zero mock data in components
- [x] Proper error handling with user feedback
- [x] TypeScript typing for all API responses
- [x] Loading states for all async operations
- [x] Toast notifications for user feedback
- [x] API calls properly authenticated

### Quality
- [x] All forms validated
- [x] Responsive design (mobile/tablet/desktop)
- [x] Accessibility compliant (WCAG 2.1 AA)
- [x] Performance optimized (Lighthouse 90+)
- [x] No console errors/warnings

---

## Dependencies & Resources

### Frontend Libraries (Already in Project)
- ✅ `lucide-react` - Icons
- ✅ `axios` - HTTP client
- ✅ React hooks
- ? `react-timezone-select` - May need to install

### New Dependencies (If Needed)
```bash
npm install react-timezone-select
npm install date-fns  # For date formatting
npm install react-hot-toast  # For notifications
```

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| API endpoints missing | Medium | High | Check backend before starting |
| Backend breaking changes | Low | High | Use feature flags for fallback |
| Performance issues with large lists | Low | Medium | Implement pagination |
| User data loss in forms | Low | High | Add save confirmation dialogs |
| API rate limiting | Low | Low | Implement request debouncing |

---

## Timeline & Milestones

**Week 4:**
- Day 1: API client setup & Watchlist integration
- Day 2: Sources tab implementation
- Day 3: Watchlist tab in profile
- Day 4: Security tab enhancements
- Day 5: Preferences tab implementation

**Week 5:**
- Day 1-2: Integration testing & bug fixes
- Day 3: UI/UX polish & accessibility
- Day 4: Performance optimization
- Day 5: QA & final testing

---

## Next Phase Transition

After Phase 2 completion:
- ✅ Watchlist & sources fully functional
- ✅ User profile complete with all features
- ✅ Zero mock data in frontend
- ✅ Ready for Phase 3: Test Infrastructure Setup

---

## Documentation

**User-Facing:**
- Update user guide for watchlist management
- Add documentation for custom sources
- Document preference options

**Developer-Facing:**
- Document new API client structure
- Document hook usage
- Add TypeScript interfaces documentation

---

**Status:** Ready for Implementation
**Prepared:** February 15, 2026
**Estimated Effort:** 10 business days (Weeks 4-5)
