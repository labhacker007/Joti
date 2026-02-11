# Remaining Work Plan - Joti Frontend (5% = ~1-2 weeks)

## Current Status
- ✅ **95% Complete** - All 14 required pages implemented
- ✅ **Build Status**: 0 TypeScript errors
- ✅ **API Integration**: 25+ endpoints working
- ⏳ **Deployment**: Ready for testing

---

## 5% REMAINING: Priority Breakdown

### TIER 1: High-Value, Low Effort (3-5 days)

#### 1. **Article Detail Page** (`/articles/:id`)
**Effort**: 3-4 days | **Value**: High | **Blocker**: No

**Current State**:
- All articles can be listed in `/news`
- Clicking on article should navigate to detail page
- Page doesn't exist yet

**What to Build**:
```typescript
// File: frontend-nextjs/pages/ArticleDetail.tsx
- Display full article content
- Show IOC extraction (table: IPs, domains, hashes)
- Show TTP extraction (MITRE ATT&CK mappings)
- Display summaries (executive + technical)
- Related articles list
- Export buttons (PDF, CSV, HTML)
- Back to news feed link
- Mark as read/unread
- Add to watchlist
- Change article status (NEW → ANALYZED)
```

**API Endpoints to Use**:
```typescript
articlesAPI.getArticle(articleId)              // Get full article
articlesAPI.markAsRead(articleId)              // Mark as read
articlesAPI.toggleBookmark(articleId)          // Bookmark
articlesAPI.updateArticle(articleId, data)     // Update status/notes
articlesAPI.getIocs(articleId)                 // IOC extraction
articlesAPI.getTtps(articleId)                 // TTP extraction
articlesAPI.getRelatedArticles(articleId)      // Related articles
```

**Components Needed**:
- IOC Table (with copy buttons)
- TTP List (with links to MITRE ATT&CK)
- Summary Display (with rich text)
- Export Modal
- Related Articles Carousel

**Estimated Code**: 400-500 lines

---

#### 2. **Export Functionality** (PDF/CSV/HTML)
**Effort**: 2-3 days | **Value**: High | **Blocker**: No

**Current State**:
- Export endpoints exist on backend
- No UI for triggering exports

**What to Build**:
```typescript
// File: frontend-nextjs/components/ExportMenu.tsx
- Export button in article detail
- Modal with export options (PDF, CSV, HTML)
- Format selection
- Include/exclude options (metadata, IOCs, summaries)
- Download progress indicator
- Success notification
```

**API Integration**:
```typescript
// Backend already has these endpoints
GET /articles/:id/export/pdf
GET /articles/:id/export/csv
GET /articles/:id/export/html
```

**Implementation Strategy**:
```typescript
1. Create ExportMenu component
2. Add modal with format selection
3. Trigger download via API
4. Handle download progress
5. Show success/error message
```

**Estimated Code**: 150-200 lines

---

### TIER 2: Medium Priority (4-7 days)

#### 3. **Advanced Search/Filtering UI** (`/news?filters=...`)
**Effort**: 4-5 days | **Value**: High | **Blocker**: No

**Current State**:
- Basic search works
- Severity filter works
- Could have more options

**What to Build**:
```typescript
// File: frontend-nextjs/components/AdvancedSearch.tsx
- Expandable advanced search panel
- Multiple filter criteria:
  - Date range picker (from/to)
  - Source selector (multi-select)
  - Severity levels (checkboxes)
  - Status (NEW, READ, STARRED, ARCHIVED)
  - Author/source domain
  - Keywords/tags
  - IOC type (IP, domain, hash, etc.)
- Save search filters
- Clear all filters
- Filter count badge
- Visual filter chips
```

**Implementation Steps**:
```typescript
1. Create AdvancedSearch component
2. Add date range picker (react-datepicker)
3. Add multi-select components
4. Update API calls with filter params
5. Add filter chip display
6. Implement save/load filters
7. Add filter URL encoding (for sharing)
```

**Estimated Code**: 300-400 lines

---

#### 4. **Analytics Dashboard** (`/analytics`)
**Effort**: 3-4 days | **Value**: Medium | **Blocker**: No

**Current State**:
- System stats exist on backend
- No dedicated analytics page

**What to Build**:
```typescript
// File: frontend-nextjs/pages/Analytics.tsx
- Articles ingested (trend chart)
- Articles by severity (pie/bar chart)
- Articles by source (bar chart)
- Activity timeline (line chart)
- Top keywords (word cloud or bar)
- IOCs extracted (count by type)
- Users activity (heat map)
- System health graph
```

**Tools Needed**:
```typescript
npm install recharts  // For charts
// or use Chart.js, Apache ECharts
```

**Estimated Code**: 400-500 lines

---

### TIER 3: Polish & Optimization (Ongoing, 2-3 days)

#### 5. **Loading States & Skeletons**
**What to Add**:
```typescript
// Create skeleton components for:
- Article list skeleton
- Article detail skeleton
- Table row skeletons
- Card skeletons

// File: frontend-nextjs/components/Skeletons.tsx
```

**Implementation**:
- Use Tailwind animation utilities
- Create generic skeleton component
- Apply to all data-loading pages
- Show 3-5 skeleton rows while loading

**Estimated Code**: 100-150 lines

---

#### 6. **Error Boundary Component**
**What to Add**:
```typescript
// File: frontend-nextjs/components/ErrorBoundary.tsx
- Catch React component errors
- Display user-friendly error UI
- Show error details (dev mode only)
- Retry button
- Log to monitoring service
```

**Estimated Code**: 80-120 lines

---

#### 7. **Empty States**
**What to Add**:
```typescript
// For each page without data:
- No articles found
- No users found
- No audit logs found
- No search results

// Create EmptyState component with:
- Icon
- Title
- Description
- CTA button (create, retry, etc.)
```

**Estimated Code**: 150-200 lines

---

#### 8. **Mobile Responsiveness**
**Current State**: Already responsive but could optimize for small screens

**What to Improve**:
- Table -> Card view on mobile
- Pagination -> "Load more" button
- Modal sizing
- Input field sizing
- Navigation drawer

**Estimated Effort**: 1-2 days

---

#### 9. **Accessibility (WCAG 2.1 AA)**
**What to Audit**:
- [ ] Color contrast ratios
- [ ] ARIA labels and roles
- [ ] Keyboard navigation
- [ ] Focus indicators
- [ ] Screen reader testing
- [ ] Form label associations

**Implementation**:
```bash
npm install axe-core  # Accessibility testing
```

**Estimated Effort**: 2-3 days

---

### TIER 4: Backend Polish (1-2 weeks, NOT blocking frontend)

#### 10. **API Documentation (Swagger/OpenAPI)**
**Current State**: Backend APIs working but not documented

**What to Add**:
```python
# backend/main.py
from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi

app = FastAPI(title="Joti API", version="1.0.0")

# Add OpenAPI schema
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    # ... schema generation
```

**Result**: Interactive API docs at `/docs`

---

#### 11. **Rate Limiting**
**Current State**: No rate limiting implemented

**Implementation**:
```python
# backend/middleware/rate_limiter.py
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

# Apply to routes:
@app.get("/articles")
@limiter.limit("100/minute")
async def get_articles():
    pass
```

---

#### 12. **Caching & Performance**
**Current State**: Database queries work but could optimize

**Implementation**:
```python
# Add Redis caching
from functools import lru_cache

@app.get("/articles/popular")
@cache(expire=300)  # 5 minute cache
async def get_popular_articles():
    pass
```

---

## RECOMMENDED BUILD ORDER

### Week 1: Core Features (HIGH IMPACT)
1. **Day 1-2**: Article Detail Page
2. **Day 3**: Export Functionality (PDF/CSV)
3. **Day 4-5**: Advanced Search UI
4. **Day 5-6**: Testing & Bug Fixes

### Week 2: Polish & Analytics (MEDIUM IMPACT)
1. **Day 1**: Analytics Dashboard
2. **Day 2**: Loading States & Skeletons
3. **Day 3**: Error Boundary & Empty States
4. **Day 4**: Mobile Optimization
5. **Day 5**: Accessibility Audit & Fixes

### Week 3: Backend (Can parallel with Week 1-2)
1. **Day 1-2**: API Documentation (Swagger)
2. **Day 3-4**: Rate Limiting & Caching
3. **Day 5**: Performance Testing

---

## IMPLEMENTATION TEMPLATES

### Article Detail Page - Quick Start
```typescript
// frontend-nextjs/pages/ArticleDetail.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { articlesAPI } from '@/api/client';
import { formatDate } from '@/lib/utils';

export default function ArticleDetail() {
  const params = useParams();
  const articleId = params?.id as string;
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadArticle = async () => {
      try {
        const response = await articlesAPI.getArticle(articleId);
        setArticle(response.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (articleId) loadArticle();
  }, [articleId]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!article) return <div>Article not found</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-4xl font-bold">{article.title}</h1>
      <div className="text-sm text-muted-foreground space-y-2">
        <p>Source: {article.source}</p>
        <p>Published: {formatDate(article.published_at)}</p>
        <p>Severity: {article.severity}</p>
      </div>

      <div className="prose prose-dark">
        {article.content}
      </div>

      {/* IOCs section */}
      {/* TTPs section */}
      {/* Summaries section */}
      {/* Export buttons */}
    </div>
  );
}
```

---

## TESTING CHECKLIST FOR REMAINING 5%

### Article Detail Page
- [ ] Page loads with correct article
- [ ] Back button works
- [ ] Export buttons download files
- [ ] IOCs display correctly
- [ ] TTPs show MITRE links
- [ ] Related articles load
- [ ] Status change saves
- [ ] Responsive on mobile

### Advanced Search
- [ ] Filters appear and function
- [ ] Date picker works
- [ ] Multi-select works
- [ ] Filters persist in URL
- [ ] Clear all works
- [ ] Results update correctly
- [ ] Performance acceptable

### Analytics
- [ ] Charts render correctly
- [ ] Data updates when filters change
- [ ] Responsive design works
- [ ] No console errors

### Polish Items
- [ ] Skeletons show while loading
- [ ] Empty states appear when needed
- [ ] Error boundary catches errors
- [ ] Mobile layout works
- [ ] Keyboard navigation works
- [ ] Screen reader accessible

---

## DEPENDENCIES TO ADD

```bash
# Charts
npm install recharts

# Date picker
npm install react-datepicker

# Accessibility testing
npm install axe-core

# Optional: Advanced components
npm install @headlessui/react
```

---

## BRANCH STRATEGY FOR REMAINING WORK

```bash
# Main branch: stable, tested
# Development branch: integration point

git checkout -b feat/article-detail
git checkout -b feat/export-functionality
git checkout -b feat/advanced-search
git checkout -b feat/analytics
git checkout -b feat/polish-and-optimization
```

---

## ESTIMATED COMPLETION

| Item | Days | By When |
|------|------|---------|
| Article Detail | 3-4 | Feb 13-14 |
| Export Functionality | 2-3 | Feb 15 |
| Advanced Search | 4-5 | Feb 17-19 |
| Analytics | 3-4 | Feb 20 |
| Polish & Optimization | 3-4 | Feb 21-23 |
| Testing & Deployment | 3-5 | Feb 24-26 |
| **TOTAL REMAINING** | **7-14 days** | **By ~Feb 26** |

---

## SUCCESS CRITERIA

When complete:
- ✅ All 14 core pages fully functional (DONE)
- ✅ 3 high-value additional features (Detail, Export, Search)
- ✅ Analytics dashboard
- ✅ Professional polish (loading states, empty states)
- ✅ Full accessibility compliance
- ✅ Mobile-responsive design
- ✅ Production-ready code quality
- ✅ Comprehensive testing
- ✅ Deployed to Docker
- ✅ Connected to live backend

---

## DECISION: What to Build First?

**RECOMMENDED PRIORITY:**

1. **Article Detail Page** (3-4 days)
   - Highest value to end user
   - Completes news feed workflow
   - Enables export functionality

2. **Export Functionality** (2-3 days)
   - Quick win after detail page
   - High user value
   - Uses existing backend endpoints

3. **Advanced Search** (4-5 days)
   - Improves usability
   - Good ROI on effort
   - Frequently requested feature

4. **Analytics Dashboard** (3-4 days)
   - Nice-to-have but valuable
   - Uses existing backend stats
   - Good for stakeholder demos

5. **Polish** (3-4 days)
   - Error boundaries
   - Loading states
   - Empty states
   - Accessibility audit

---

**Recommendation**: Start with Article Detail Page immediately - it's the highest-value remaining feature and can be completed in 3-4 days. This would bring the frontend to **98% complete** and production-ready status.

---

**Status**: Ready to build | **Next Action**: Start Article Detail Page implementation
