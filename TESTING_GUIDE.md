# Joti Application - Quick Testing Guide

**Application Status**: ✅ LIVE AND RUNNING
**Start Time**: February 15, 2026
**Version**: feature/nextjs-migration branch with all features

---

## 🚀 ACCESS POINTS

### Frontend Application
- **URL**: http://localhost:3000
- **Type**: Next.js 15 with React 19
- **Status**: ✅ Running

### Backend API
- **URL**: http://localhost:8000
- **Swagger Docs**: http://localhost:8000/docs
- **ReDoc Docs**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/health

### Database
- **PostgreSQL**: localhost:5432
- **User**: joti_user
- **Password**: joti_pass_2024
- **Database**: joti_db

### Cache
- **Redis**: localhost:6379

---

## 🔐 TEST CREDENTIALS

```
Email: admin@example.com
Password: admin1234567
Role: ADMIN (full access to all features)
```

---

## 📋 QUICK TEST WORKFLOW

### 1. Login & Dashboard
1. Go to http://localhost:3000
2. Login with admin credentials above
3. You should see the dashboard with system statistics

**Expected to see**:
- 1 user (admin)
- 20 sources (pre-configured RSS feeds)
- Article count
- System health indicators

### 2. News Feed Aggregation
**Path**: http://localhost:3000/NewsFeeds or navigation menu

**Test**:
1. Click on a source to view articles from that feed
2. Search for articles by keyword
3. Filter by source
4. Bookmark articles
5. Mark articles as read/unread

**Expected Features**:
- ✅ Multi-source article display
- ✅ Search functionality
- ✅ Source filtering
- ✅ Read status tracking
- ✅ Bookmarking capability
- ✅ Pagination

### 3. Sources Management
**Path**: http://localhost:3000/Sources or navigation menu

**Test**:
1. View existing sources
2. Add a new RSS feed:
   - Click "Add Source"
   - Enter: `https://nvd.nist.gov/feeds/json/cve/1.1/nvd-cve-1.1-modified.json.zip`
   - Select type: RSS/JSON
   - Click Save
3. Refresh a source manually
4. View source statistics (articles count, last updated)

**Expected Features**:
- ✅ Source listing with status
- ✅ Add/delete sources
- ✅ Manual refresh capability
- ✅ Last ingestion timestamp
- ✅ Article count per source
- ✅ Enable/disable sources

### 4. Article Details & Intelligence
**Path**: Click on any article from News Feed

**Test**:
1. View article content
2. Check extracted IOCs (IP addresses, domains, hashes, etc.)
3. View GenAI-generated summaries (if available)
4. See threats/watchlist matches
5. Add comments
6. Assign to analyst

**Expected Features**:
- ✅ Full article content
- ✅ IOC extraction display
- ✅ Executive/technical summaries (if GenAI enabled)
- ✅ Watchlist keyword highlighting
- ✅ Comments section
- ✅ Assignment functionality
- ✅ Status transitions

### 5. Watchlist Management
**Path**: http://localhost:3000/Watchlist or navigation menu

**Test**:
1. View existing watchlist keywords
2. Add a new keyword:
   - Example: "ransomware", "critical vulnerability", "APT"
   - Click Save
3. Go back to News Feed and see articles matching your keyword highlighted

**Expected Features**:
- ✅ Watchlist CRUD operations
- ✅ Keyword matching in articles
- ✅ High-priority article marking
- ✅ Real-time matching display

### 6. Hunts & Investigations (If SIEM Connected)
**Path**: http://localhost:3000/Hunts or from Article detail

**Test**:
1. From an article, click "Generate Hunt" (if available)
2. Select hunt platform (XSIAM, Defender, Splunk, Wiz)
3. GenAI generates appropriate query
4. Review generated query
5. Execute hunt (if SIEM connected)
6. View hunt results

**Expected Features**:
- ✅ AI-generated hunt queries
- ✅ Multi-platform support
- ✅ Query editing
- ✅ Execution status tracking
- ✅ Results storage

### 7. Reports Generation
**Path**: http://localhost:3000/Reports or from Admin panel

**Test**:
1. Select articles for report
2. Generate PDF/Word/CSV export
3. Include summaries and IOCs
4. Download and verify format

**Expected Features**:
- ✅ Single/batch article export
- ✅ Multiple format support (PDF, Word, CSV, HTML)
- ✅ Embedded summaries
- ✅ IOC listings
- ✅ Professional formatting

### 8. Admin Panel
**Path**: http://localhost:3000/Admin or navigation menu

**Test**:
1. **Users Tab**: Create new user with different role
2. **RBAC Tab**: View permission matrix
3. **Audit Logs**: Filter by user, event type, date range
4. **Settings**: View/update system configuration
5. **GenAI**: Configure AI model settings
6. **Guardrails**: View guardrail definitions

**Expected Features**:
- ✅ User management
- ✅ Role/permission configuration
- ✅ Complete audit trail
- ✅ System configuration
- ✅ GenAI model management
- ✅ Guardrail management

### 9. API Testing
**Path**: http://localhost:8000/docs

**Test Articles API**:
1. Open Swagger UI at http://localhost:8000/docs
2. Expand "articles" section
3. Try GET `/articles/` with pagination
4. Try POST `/articles/summarize` to generate summary
5. Try POST `/articles/extract-iocs` for IOC extraction

**Expected**:
- ✅ Paginated article listing
- ✅ Search/filter parameters
- ✅ GenAI function calls working
- ✅ Proper response format

---

## 🧪 FEATURE-SPECIFIC TESTS

### Test IOC Extraction
```bash
# Via API
POST http://localhost:8000/articles/extract-iocs
{
  "title": "Critical Vulnerability in Apache Log4j",
  "content": "Security researchers discovered CVE-2021-44228 affecting IP 192.168.1.100. Also affecting example.com and hash MD5:d41d8cd98f00b204e9800998ecf8427e"
}
```

**Expected**: Extracts IPs, domains, CVE, hashes

### Test Report Generation
```bash
# Via API
POST http://localhost:8000/articles/report
{
  "article_ids": [1, 2, 3],
  "report_type": "comprehensive",
  "format": "pdf"
}
```

**Expected**: Returns downloadable PDF with summaries and IOCs

### Test Hunt Query Generation (Requires SIEM Knowledge Base)
```bash
# Via API
POST http://localhost:8000/articles/{id}/hunt
{
  "platform": "xsiam",
  "iocs": ["192.168.1.100", "example.com"]
}
```

**Expected**: Generates XSIAM XQL query

### Test Notifications
Configure in Admin panel:
1. Set Slack webhook for hunt alerts
2. Trigger a hunt
3. Verify Slack message received

---

## 🔍 WHAT TO VERIFY

### Core Functionality
- [ ] Login/logout works
- [ ] Dashboard loads with correct stats
- [ ] Articles display from multiple sources
- [ ] Search finds articles
- [ ] Filtering works (by source, status, etc.)
- [ ] Read status persists across sessions

### Threat Intelligence Features
- [ ] IOC display in articles
- [ ] IOC extraction API works
- [ ] Watchlist matching highlights articles
- [ ] Watch keywords can be added/deleted
- [ ] High-priority articles marked correctly

### Hunt Features (if SIEM available)
- [ ] Hunt generation from article
- [ ] Multi-platform query generation
- [ ] Hunt execution tracking
- [ ] Results display

### Report Features
- [ ] PDF export works
- [ ] Word export works
- [ ] CSV export works
- [ ] HTML export works
- [ ] Reports include summaries
- [ ] Reports include IOCs

### Admin Features
- [ ] Create new user
- [ ] Change user role
- [ ] View audit logs
- [ ] Filter audit logs
- [ ] Update system settings
- [ ] Manage guardrails

### GenAI Features (if enabled)
- [ ] Summarization works
- [ ] Multi-model fallback
- [ ] Prompt customization
- [ ] Skill management
- [ ] Guardrail enforcement

---

## 🐛 TROUBLESHOOTING

### Frontend not loading (Port 3000)
```bash
docker-compose ps
# Should show joti-frontend-1 as "Up"

docker logs joti-frontend-1
# Check for build errors
```

### Backend API not responding (Port 8000)
```bash
curl http://localhost:8000/health
# Should return: {"status":"healthy","version":"0.1.0",...}

docker logs joti-backend-1
# Check for startup errors
```

### Database connection issues
```bash
docker-compose ps
# postgres should be "healthy"

# Check logs
docker logs joti-postgres-1
```

### Redis connection issues
```bash
docker-compose ps
# redis should be "healthy"

docker logs joti-redis-1
```

### Login fails
1. Check admin email: admin@example.com
2. Check password: admin1234567
3. Verify backend is healthy: http://localhost:8000/health
4. Check browser console (F12) for errors

### Articles not showing
1. Verify sources are configured: /Sources page
2. Wait for feed ingestion (may take 30-60 seconds)
3. Check backend logs: `docker logs joti-backend-1`
4. Try refreshing source manually

---

## 📊 WHAT YOU SHOULD SEE

### First Login
- Dashboard with system statistics
- 1 admin user
- 20 pre-configured RSS sources
- 0-100 articles (depending on feed ingestion)
- Navigation menu with all features

### News Feed Page
- Articles from all sources
- Search bar at top
- Source filter on sidebar
- Articles with titles, sources, dates
- Read/unread indicators
- Bookmark buttons

### Article Detail
- Full article content
- Extracted IOCs (IPs, domains, hashes, etc.)
- Executive/technical summaries (if GenAI enabled)
- Comments section
- Status dropdown
- Assign/claim buttons

### Admin Panel
- User list (admin user)
- RBAC permission matrix
- Audit log entries (login, configuration changes)
- System settings
- GenAI configuration
- Guardrail definitions

---

## ✅ SUCCESS CRITERIA

You'll know the application is working when:

1. ✅ Login works with admin credentials
2. ✅ Dashboard shows correct system stats
3. ✅ Articles load from multiple sources
4. ✅ Search finds articles
5. ✅ Filtering by source works
6. ✅ Read status persists
7. ✅ Bookmarking works
8. ✅ Watchlist matching highlights articles
9. ✅ Admin panel loads
10. ✅ Reports can be generated and exported
11. ✅ API endpoints respond correctly
12. ✅ Audit logs record user actions

---

## 📞 API ENDPOINTS TO TEST

### Articles
- `GET /articles/` - List articles with pagination
- `GET /articles/{id}` - Get article detail
- `POST /articles/summarize` - Generate summary
- `POST /articles/extract-iocs` - Extract IOCs
- `PATCH /articles/{id}/status` - Update status
- `POST /articles/{id}/assign` - Assign to user
- `POST /articles/{id}/read` - Mark as read
- `GET /articles/bookmarks/` - List bookmarks
- `POST /articles/bookmarks/` - Add bookmark

### Sources
- `GET /sources/` - List all sources
- `POST /sources/` - Add new source
- `PUT /sources/{id}` - Update source
- `DELETE /sources/{id}` - Delete source
- `POST /sources/{id}/refresh` - Manual refresh

### Hunts
- `GET /hunts/` - List hunts
- `POST /hunts/` - Create hunt
- `POST /hunts/generate-query` - Generate hunt query
- `POST /hunts/execute` - Execute hunt

### Reports
- `GET /reports/` - List reports
- `POST /reports/` - Create report
- `GET /reports/{id}/export` - Export as PDF/Word/CSV

### Admin
- `GET /admin/stats` - System statistics
- `GET /audit/logs` - Audit log entries
- `POST /users/` - Create user
- `GET /users/` - List users

---

## 🎯 NEXT STEPS AFTER TESTING

1. **If everything works**:
   - Test with your actual SIEM (if available)
   - Configure real threat feed sources
   - Set up Slack/email notifications
   - Create custom watchlist keywords

2. **If issues found**:
   - Check application logs: `docker logs joti-backend-1`
   - Verify database: `docker exec joti-postgres-1 psql -U joti_user -d joti_db -c "SELECT COUNT(*) FROM articles"`
   - Test individual API endpoints

3. **For production**:
   - Update `.env` with production values
   - Configure real SIEM connectors
   - Enable HTTPS/SSL
   - Set up proper database backup
   - Configure authentication (OAuth/SAML if needed)

---

**Ready to test? Go to http://localhost:3000 and login!** 🚀

