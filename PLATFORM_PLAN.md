# Joti TIP Platform — Comprehensive Build Plan
**Date:** 2026-02-20 | **Goal:** Replace Traditional TIPs, Reduce TI Researcher Workload

---

## 1. Current State Inventory

### What We Have ✅

| Feature | Status | Notes |
|---------|--------|-------|
| RSS/Atom/Website feed ingestion | ✅ Done | 90 default feeds in seed-sources.json |
| Article CRUD with status workflow | ✅ Done | 6 status states, NEW → ARCHIVED |
| IOC extraction (12 types) | ✅ Done | Regex + GenAI hybrid, source domain filtering |
| MITRE ATT&CK heatmap | ✅ Done | Full technique mapping in mitre_data.py |
| MITRE ATLAS heatmap | ✅ Done | AI/ML threat taxonomy |
| Document upload (PDF/Word/Excel) | ✅ Done | In Feeds page, needs to move to TI Center |
| Manual IOC submission | ✅ Done | In TI Center IOC Explorer |
| Bulk IOC import (CSV) | ✅ Done | In TI Center IOC Explorer |
| Threat Actor extraction | ✅ Partial | Stored as ExtractedIntelligence, no profiles |
| Threat Intelligence Center | ✅ Done | 6 panels: Command Center, IOC Explorer, MITRE, Threat Actors, Correlation, AI Analysis |
| Hunt query generation | ✅ Done | XSIAM (XQL), Defender (KQL), Splunk (SPL), Wiz (GraphQL) |
| GenAI summarization + extraction | ✅ Done | OpenAI, Claude, Gemini, Ollama |
| AI Landscape Analysis | ✅ Done | 8 focus areas: ransomware, APT, CVE, phishing, supply chain, cloud, malware |
| Cross-source correlation | ✅ Done | Shared IOC detection across articles |
| RBAC (50+ permissions) | ✅ Done | Role-based access control |
| Audit logging (14 event types) | ✅ Done | Full action trail |
| GenAI guardrails (51 attacks) | ✅ Done | Security catalog with 11 attack categories |
| Guardrails bulk import/export | ✅ Done | JSON export/import/seed-catalog buttons |
| Admin panel | ✅ Done | Feed sources, GenAI config, scheduler, RBAC |
| Watchlist keywords | ✅ Done | Alert on article match |

### What's Incomplete ⚠️

| Feature | Issue | Priority |
|---------|-------|----------|
| Feed sources | 90 feeds shown; target 200+ | HIGH |
| Admin re-seeding | No way to add new default feeds to existing installs | HIGH |
| Document upload location | Feeds page — wrong UX, should be in TI Center | HIGH |
| Intel Ingestion panel | No unified ingestion hub in TI Center | HIGH |
| Threat Actor profiles | No dedicated model, aliases, TTPs-per-actor | HIGH |
| TA alias resolution | No cross-name linking (Scattered Spider = UNC3944) | HIGH |
| TA 4-hour refresh | No background enrichment cycle | MEDIUM |
| Connector-based ingestion | Defenders/Splunk connectors not pulling TI | MEDIUM |
| Article search in TI views | No search-by-actor, search-by-IOC linking | MEDIUM |

---

## 2. Target State — What Needs to Be Built

### 2.1 Intel Ingestion Panel (TI Center Panel 7) 🔨

Move all ingestion into one hub in Threat Intelligence Center:

```
Threat Intelligence Center → Intel Ingestion tab
├── Document Upload (PDF, Word, Excel, CSV, HTML, TXT — 50MB max)
│   └── GenAI extracts: IOCs, TTPs, Threat Actors, Executive Summary
├── Feed Ingestion (RSS/Atom/Website URL → parse → extract intel)
├── Connector Pull (trigger Defender/Splunk/Wiz to pull TI data)
└── Ingestion History (last 50 uploads with IOC/TTP counts)
```

**Status:** 🔨 IN PROGRESS

### 2.2 Expanded Feed Sources (200+) 🔨

Expand seed-sources.json from 90 → 200+ sources covering:
- CISA, NIST, MITRE, US-CERT advisories
- Vendor security blogs (Microsoft, Google, Mandiant, CrowdStrike, etc.)
- Independent researchers (Krebs, Schneier, SANS ISC)
- Malware/IOC feeds (Abuse.ch, OpenPhish, URLhaus)
- Dark web monitoring (aggregated open-source feeds)
- Regional CERTs (EU, AU, UK, CA)

Add admin "Load Default Feeds" button to re-seed existing installs.

**Status:** 🔨 IN PROGRESS

### 2.3 Threat Actor Profile System 🔨

Build dedicated ThreatActorProfile model and enrichment pipeline:

```
ThreatActorProfile:
├── id, name (primary), aliases (JSON array)
├── description, origin_country, motivation
├── first_seen, last_seen, is_active
├── ttps (list of MITRE ATT&CK IDs)
├── infrastructure (C2 IPs, domains, registrars)
├── target_sectors (government, finance, healthcare, etc.)
├── ioc_count, article_count
├── last_enriched_at (GenAI enrichment timestamp)
└── sources (which articles/documents reference this actor)
```

**Alias Resolution:** Group mentions by known alias sets:
- "Scattered Spider" = "UNC3944" = "Roasted 0ktapus" = "Muddled Libra"
- "APT28" = "Fancy Bear" = "Sofacy" = "Strontium"
- "Lazarus Group" = "Hidden Cobra" = "APT38" (financial ops)

**4-hour GenAI enrichment cycle:**
1. Find new THREAT_ACTOR mentions in last 4h
2. For each actor: query GenAI for known aliases + attribution
3. Merge with existing profiles
4. Update TTPs, IOCs, infrastructure from articles

**Status:** 🔨 PLANNED

### 2.4 TI Center Threat Actors Panel Enhancement

Replace simple grouped cards with rich profiles:
- Actor card with: name, aliases badge, origin flag, activity indicator
- Tabs: Overview | TTPs | IOCs | Infrastructure | Articles
- Timeline of mentions
- MITRE heatmap per actor (which techniques used)

**Status:** 🔨 PLANNED

---

## 3. Implementation Plan (Ordered by Priority)

### Sprint 1: Intel Ingestion Hub (1-2 sessions)

1. **Move Upload to TI Center** — remove from Feeds.tsx, add Intel Ingestion panel
2. **Add 110+ feed sources** — expand seed-sources.json to 200+
3. **Admin re-seed button** — allow loading new default feeds on existing installs

### Sprint 2: Threat Actor Profiles (2-3 sessions)

1. Create `ThreatActorProfile` + `ThreatActorAlias` models in models.py
2. Create Alembic migration
3. Build API: `/threat-actors/` CRUD + enrichment endpoint
4. Build GenAI alias resolution function in `genai/threat_actor_enricher.py`
5. Build background task for 4-hour enrichment cycle
6. Update TI Center Threat Actors panel with rich profiles

### Sprint 3: Testing & Security (1-2 sessions)

1. **Functional tests** — all major user flows (article → extract → hunt)
2. **API security tests** — RBAC enforcement, SQL injection, SSRF
3. **GenAI guardrail tests** — prompt injection, jailbreak attempts
4. **Performance** — large article sets, concurrent ingestion

---

## 4. Testing Strategy

### Functional Testing Checklist

**Feed Ingestion:**
- [ ] RSS feed added → articles appear in Feeds view
- [ ] Document uploaded → IOCs extracted, article created, searchable
- [ ] Duplicate document → returns duplicate status, not double-imported

**IOC Extraction:**
- [ ] Article with IPs/domains → IOCs extracted and stored
- [ ] Source domain NOT extracted as IOC (e.g., bleepingcomputer.com article)
- [ ] CVE IDs extracted with correct format (CVE-2024-XXXX)
- [ ] MITRE ATT&CK IDs mapped to correct tactics in heatmap

**Threat Intelligence Center:**
- [ ] IOC Explorer shows all intelligence with filters working
- [ ] MITRE heatmap renders with heatmap colors by count
- [ ] Threat Actors panel groups actors and shows article links
- [ ] Correlation panel shows shared IOCs across articles
- [ ] AI Analysis generates landscape summary (requires GenAI configured)

**GenAI:**
- [ ] Summarize button on article generates summary
- [ ] Hunt query generated for article (XQL, KQL, SPL)
- [ ] Guardrails block prompt injection attempts
- [ ] Ollama works when OLLAMA_BASE_URL set correctly

### Security Testing Checklist

**Authentication:**
- [ ] Unauthenticated requests return 401
- [ ] Expired tokens rejected
- [ ] Admin endpoints require admin role

**Input Validation:**
- [ ] XSS in article title/content rendered safely
- [ ] SQL injection attempt returns 422/error (SQLAlchemy ORM prevents)
- [ ] SSRF via feed URL prevented (SSRF protection module active)
- [ ] File upload: only allowed types accepted (.pdf, .docx, etc.)

**GenAI Security:**
- [ ] Prompt injection in article text blocked by guardrails
- [ ] System prompt extraction attempt blocked
- [ ] Fake IOC fabrication detected by grounding check

---

## 5. Architecture Notes

### Data Flow: Document → Intelligence

```
User uploads PDF/Word/CSV
     ↓
POST /sources/custom/upload
     ↓
ingest_custom_document()
     ↓ (async)
IntelligenceExtractor.extract_all()
     ├── regex IOC extraction (12 types)
     ├── GenAI extraction (if configured)
     │   ├── IOCs
     ├── TTPs (MITRE mapping)
     └── Threat Actors
     ↓
Store as Article (source_type=MANUAL)
     + ExtractedIntelligence records
     ↓
Available in TI Center → IOC Explorer
                       → Threat Actors
                       → MITRE Heatmap
```

### Threat Actor Data Flow (Post-Build)

```
Article ingested with "Scattered Spider" mention
     ↓
THREAT_ACTOR type ExtractedIntelligence created
     ↓ (background task every 4h)
ThreatActorEnricher
     ├── Check if profile exists for "Scattered Spider"
     ├── If not: create profile + GenAI alias lookup
     ├── If yes: update last_seen, article count
     ├── Merge TTPs from associated articles
     └── Update infrastructure from associated IOCs
     ↓
ThreatActorProfile.aliases = ["UNC3944", "Roasted 0ktapus", ...]
ThreatActorProfile.ttps = ["T1566.001", "T1078", ...]
ThreatActorProfile.infrastructure = ["185.220.101.x", ...]
```

---

## 6. Known Issues & Fixes

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| GenAI page "Something went wrong" | providers dict vs array in loadData() | ✅ Fixed in GenAIManagement.tsx |
| "Network error" on page load | PendingRollbackError in SQLAlchemy session | ✅ Fixed in sources.py |
| OLLAMA connection fails | Empty OLLAMA_BASE_URL → connects to container loopback | ✅ Fixed, set to host.docker.internal |
| Source domain extracted as IOC | No filtering of article source URL | ✅ Fixed in extractor.py |
| 200 feeds not visible | seed-sources.json has 90, seeds only run once | 🔨 Expanding + admin re-seed |

---

## 7. Competitive Differentiators vs. Traditional TIPs

| Capability | Traditional TIP | Joti |
|-----------|----------------|------|
| Feed ingestion | Manual STIX/TAXII | Automatic RSS/Atom + document upload |
| IOC extraction | Manual analyst entry | GenAI + Regex hybrid (12 types) |
| MITRE mapping | Manual tagging | Automatic ATT&CK + ATLAS heatmap |
| Hunt queries | None | Auto-generated XQL/KQL/SPL/GraphQL |
| GenAI analysis | None | Summarization, landscape, correlation |
| Cost | $50K-250K/yr (Anomali, ThreatConnect) | Open source / self-hosted |
| Deployment | Cloud-only SaaS | Docker, on-premise, air-gapped capable |
| Customization | Limited | Full source code, extensible |
