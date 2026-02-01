# Agentic Article Intelligence System - Implementation Plan

**Date:** January 28, 2026  
**Status:** 🚀 Implementation In Progress

---

## Overview

Building a comprehensive agentic GenAI-driven intelligence capability that automatically analyzes articles, extracts entities, finds historical associations, and enables full traceability across the platform.

### Current Capabilities (Already Exist ✅)

1. ✅ IOC extraction (regex-based) - `backend/app/extraction/extractor.py`
2. ✅ TTP extraction (MITRE ATT&CK) - `backend/app/extraction/extractor.py`
3. ✅ GenAI-enhanced extraction - `extract_with_genai()`
4. ✅ IOC table with deduplication - `models.IOC`
5. ✅ Article-IOC many-to-many mapping - `models.ArticleIOC`
6. ✅ ExtractedIntelligence table - `models.ExtractedIntelligence`
7. ✅ Hunt generation from articles - `backend/app/hunts/routes.py`
8. ✅ GenAI provider abstraction - `backend/app/genai/provider.py`

### New Capabilities to Add 🆕

1. 🆕 Threat Actor canonical table
2. 🆕 TTP canonical table
3. 🆕 Extraction run tracking
4. 🆕 Article relationship mapping
5. 🆕 Historical association engine
6. 🆕 Semantic similarity matching
7. 🆕 Admin similarity configuration
8. 🆕 Campaign detection
9. 🆕 Bidirectional traceability UI
10. 🆕 Entity pivot views

---

## Architecture

### Data Model (Single Source of Truth)

```
┌─────────────┐
│  Articles   │
└──────┬──────┘
       │
       ├──────────────┐
       │              │
       ▼              ▼
┌─────────────┐  ┌──────────────────┐
│ Summaries   │  │ ExtractionRuns   │
│ (exec/tech) │  │ (tracking)       │
└─────────────┘  └────────┬─────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │ Entity Mappings │
                 └────────┬────────┘
                          │
       ┌──────────────────┼──────────────────┐
       │                  │                  │
       ▼                  ▼                  ▼
┌────────────┐    ┌────────────┐    ┌──────────────┐
│ IOCs       │    │ TTPs       │    │ ThreatActors │
│ (canonical)│    │ (canonical)│    │ (canonical)  │
└────────────┘    └────────────┘    └──────────────┘
       │                  │                  │
       └──────────────────┼──────────────────┘
                          │
                          ▼
                   ┌────────────┐
                   │   Hunts    │
                   └────────────┘
```

### Agentic Pipeline Flow

```
1. Article Ingested
   ↓
2. Content Normalization
   ↓
3. GenAI Summarization (Exec + Technical)
   ↓
4. Entity Extraction (from original + summaries)
   ↓
5. Entity Canonicalization (dedupe + merge)
   ↓
6. Historical Association Check
   ├─ Exact IOC matches
   ├─ Exact TTP matches
   ├─ Threat Actor matches
   └─ Semantic similarity
   ↓
7. Priority Scoring
   ↓
8. Store Results + Relationships
   ↓
9. Trigger Downstream Actions
   ├─ Auto-hunt (if high priority)
   ├─ Notifications
   └─ Campaign alerts
```

---

## Implementation Phases

### Phase 1: Enhanced Data Models ✅ (Current Task)

**New Models to Add:**

1. **ThreatActor** - Canonical threat actor table
2. **TTP** - Canonical TTP table (separate from ExtractedIntelligence)
3. **ExtractionRun** - Track each extraction operation
4. **ArticleEntityMap** - Unified entity mapping
5. **ArticleRelationship** - Historical associations
6. **SimilarityConfig** - Admin-configurable similarity settings
7. **ArticleSummary** - Separate summaries table with versioning

**Files to Create:**
- `backend/app/models_agentic.py` - New models
- `backend/migrations/versions/012_add_agentic_intelligence.py` - Migration

### Phase 2: Agentic Orchestrator 🔄

**Core Service:**
- `backend/app/intelligence/orchestrator.py`

**Responsibilities:**
1. Coordinate end-to-end pipeline
2. Call GenAI for summarization
3. Extract entities from original + summaries
4. Canonicalize entities
5. Run historical association
6. Calculate priority scores
7. Store all results atomically

### Phase 3: Historical Association Engine 🔍

**Core Service:**
- `backend/app/intelligence/association.py`

**Capabilities:**
1. **Exact Matching:**
   - IOC value matches
   - TTP ID matches
   - Threat Actor matches

2. **Semantic Matching:**
   - Technical summary embeddings
   - Configurable similarity threshold
   - Efficient vector search

3. **Scoring:**
   - Weighted combination
   - Admin-configurable weights
   - Confidence adjustment

### Phase 4: Entity Canonicalization 🎯

**Core Service:**
- `backend/app/intelligence/canonicalizer.py`

**Capabilities:**
1. Deduplicate IOCs across articles
2. Merge threat actor aliases
3. Normalize TTP references
4. Update occurrence counts
5. Track first/last seen

### Phase 5: API Endpoints 🔌

**New Routes:**
- `POST /intelligence/analyze/{article_id}` - Trigger full analysis
- `GET /intelligence/article/{article_id}/relationships` - Get related articles
- `GET /intelligence/entity/{entity_type}/{entity_id}/timeline` - Entity timeline
- `GET /intelligence/campaigns` - Detect campaigns
- `POST /admin/intelligence/similarity-config` - Configure similarity
- `GET /admin/intelligence/campaigns/overview` - Campaign dashboard

### Phase 6: UI Components 🎨

**New Components:**
1. **EntityPivotView** - Navigate from entity to all articles/hunts
2. **ArticleRelationshipGraph** - Visual relationship map
3. **CampaignDetectionDashboard** - Admin campaign overview
4. **SimilarityConfigPanel** - Admin configuration
5. **TraceabilityTimeline** - Full lineage view
6. **HistoricalContextPanel** - Show related articles in article detail

---

## Detailed Implementation

### 1. Enhanced Data Models

Creating `backend/app/models_agentic.py`:

```python
# New canonical entity tables
class ThreatActor(Base):
    - Canonical name
    - Aliases (JSON array)
    - First/last seen
    - Occurrence count
    - Confidence
    - Attribution
    
class TTP(Base):
    - MITRE ID (unique)
    - Name
    - Tactic
    - Technique
    - Framework (ATT&CK/ATLAS)
    - First/last seen
    - Occurrence count
    
class ExtractionRun(Base):
    - Article ID
    - Run timestamp
    - Model used
    - Input sources (original/exec/tech)
    - Entities extracted count
    - Duration
    - Status
    
class ArticleRelationship(Base):
    - Source article ID
    - Related article ID
    - Relationship types (array)
    - Shared IOCs (count)
    - Shared TTPs (count)
    - Shared actors (count)
    - Semantic similarity score
    - Lookback window used
    - Created at
    
class SimilarityConfig(Base):
    - Lookback days
    - IOC weight
    - TTP weight
    - Actor weight
    - Semantic weight
    - Minimum threshold
    - Require exact match
    - Updated by
    
class ArticleSummary(Base):
    - Article ID
    - Summary type (exec/tech/detection)
    - Content
    - Model used
    - Version
    - Created by run ID
```

### 2. Agentic Orchestrator

**Key Methods:**

```python
class AgenticIntelligenceOrchestrator:
    async def analyze_article_full(article_id):
        """Full agentic analysis pipeline"""
        1. Load article
        2. Generate summaries (exec + technical)
        3. Extract from original + summaries
        4. Canonicalize entities
        5. Run historical association
        6. Calculate priority
        7. Store results
        8. Return comprehensive analysis
    
    async def generate_summaries(article):
        """Generate both summaries"""
        - Executive summary (business impact)
        - Technical summary (IOCs, TTPs, tactics)
        - Store in ArticleSummary table
    
    async def extract_entities(article, summaries):
        """Extract from all sources"""
        - Extract from original content
        - Extract from executive summary
        - Extract from technical summary
        - Flag if entity only in summary
        - Merge and deduplicate
    
    async def canonicalize_entities(extracted):
        """Dedupe and merge"""
        - IOCs: exact match on value+type
        - TTPs: exact match on MITRE ID
        - Actors: fuzzy match on name/aliases
        - Update occurrence counts
        - Update first/last seen
    
    async def run_historical_association(article, entities):
        """Find related articles"""
        - Stage 1: Candidate generation (indexed)
        - Stage 2: Scoring and ranking
        - Store relationships
        - Return top matches
```

### 3. Historical Association Engine

**Two-Stage Approach:**

```python
class HistoricalAssociationEngine:
    async def find_related_articles(article_id, lookback_days):
        """Find historically related articles"""
        
        # Stage 1: Fast candidate generation
        candidates = await self._get_candidates(
            article_id, 
            lookback_days
        )
        # Uses indexed queries on IOC/TTP/Actor IDs
        
        # Stage 2: Detailed scoring
        scored = await self._score_candidates(
            article_id,
            candidates
        )
        # Calculates weighted scores
        
        # Store relationships
        await self._store_relationships(
            article_id,
            scored
        )
        
        return scored
    
    async def _get_candidates(article_id, lookback_days):
        """Fast indexed lookup"""
        - Get article's IOCs, TTPs, Actors
        - Find articles with shared entities
        - Within lookback window
        - Return candidate IDs
    
    async def _score_candidates(article_id, candidates):
        """Calculate similarity scores"""
        - IOC overlap score
        - TTP overlap score
        - Actor match score
        - Semantic similarity (if enabled)
        - Apply weights from config
        - Return ranked list
```

### 4. Semantic Similarity

**Using Embeddings:**

```python
class SemanticSimilarityEngine:
    async def compute_embedding(text):
        """Generate embedding for technical summary"""
        - Use sentence-transformers
        - Store in article_embeddings table
        - Cache for reuse
    
    async def find_similar(article_id, threshold):
        """Find semantically similar articles"""
        - Get article embedding
        - Cosine similarity search
        - Return matches above threshold
```

---

## Database Migration Strategy

### Migration 012: Agentic Intelligence

```sql
-- New canonical tables
CREATE TABLE threat_actors (...);
CREATE TABLE ttps (...);
CREATE TABLE extraction_runs (...);
CREATE TABLE article_relationships (...);
CREATE TABLE similarity_config (...);
CREATE TABLE article_summaries (...);
CREATE TABLE article_embeddings (...);

-- Indexes for performance
CREATE INDEX idx_article_rel_source ON article_relationships(source_article_id);
CREATE INDEX idx_article_rel_related ON article_relationships(related_article_id);
CREATE INDEX idx_extraction_runs_article ON extraction_runs(article_id);
CREATE INDEX idx_threat_actors_name ON threat_actors(canonical_name);
CREATE INDEX idx_ttps_mitre_id ON ttps(mitre_id);
```

---

## API Endpoints

### Intelligence Analysis

```
POST /api/v1/intelligence/analyze/{article_id}
  - Trigger full agentic analysis
  - Returns: extraction run ID, entities found, relationships
  
GET /api/v1/intelligence/article/{article_id}/relationships
  - Get related articles with scores
  - Filters: relationship_type, min_score, lookback_days
  
GET /api/v1/intelligence/article/{article_id}/timeline
  - Full entity timeline for article
  - Shows: extraction runs, entities, hunts, relationships
```

### Entity Operations

```
GET /api/v1/entities/ioc/{ioc_id}/articles
  - All articles containing this IOC
  - Includes: first seen, last seen, occurrence count
  
GET /api/v1/entities/ioc/{ioc_id}/hunts
  - All hunts that used this IOC
  - Bidirectional traceability
  
GET /api/v1/entities/ttp/{ttp_id}/articles
  - All articles mentioning this TTP
  
GET /api/v1/entities/actor/{actor_id}/campaign
  - Campaign view for threat actor
  - Timeline of activity
```

### Campaign Detection

```
GET /api/v1/intelligence/campaigns
  - Detect potential campaigns
  - Clustering based on shared entities + time proximity
  
GET /api/v1/intelligence/campaigns/{campaign_id}
  - Campaign details
  - Related articles, entities, timeline
```

### Admin Configuration

```
GET /admin/intelligence/similarity-config
  - Get current similarity configuration
  
PUT /admin/intelligence/similarity-config
  - Update weights, thresholds, lookback
  
POST /admin/intelligence/rebuild-relationships
  - Re-run historical association for all articles
  - Background job
```

---

## UI Components

### 1. Article Detail Page Enhancements

**New Sections:**

```
┌─────────────────────────────────────────┐
│ Article: [Title]                        │
├─────────────────────────────────────────┤
│ Executive Summary                       │
│ Technical Summary                       │
├─────────────────────────────────────────┤
│ 🆕 Extracted Intelligence               │
│   ├─ IOCs (25) [pivot →]               │
│   ├─ TTPs (8) [pivot →]                │
│   └─ Threat Actors (2) [pivot →]       │
├─────────────────────────────────────────┤
│ 🆕 Historical Context                   │
│   ├─ Related Articles (5)               │
│   │   └─ Similar threat (IOC: 3, TTP: 2)│
│   ├─ Recurring IOCs (12)                │
│   └─ Campaign: APT29 Activity           │
├─────────────────────────────────────────┤
│ Generated Hunts (3)                     │
│   ├─ XSIAM Hunt [view →]               │
│   └─ Defender Hunt [view →]            │
└─────────────────────────────────────────┘
```

### 2. Entity Pivot View

**New Page: `/intelligence/entity/{type}/{id}`**

```
┌─────────────────────────────────────────┐
│ IOC: 192.168.1.100                      │
├─────────────────────────────────────────┤
│ First Seen: 2025-06-15                  │
│ Last Seen: 2026-01-28                   │
│ Occurrences: 12 articles                │
│ Confidence: 95%                         │
├─────────────────────────────────────────┤
│ Timeline View                           │
│ ═══════════════════════════════════     │
│ 2025-06 ●─────● 2025-09 ●───● 2026-01  │
│         │      │         │    │         │
│      Article  Article  Hunt  Article    │
├─────────────────────────────────────────┤
│ Related Articles (12)                   │
│   ├─ APT29 Campaign (2025-06-15)       │
│   ├─ Similar Attack (2025-09-20)       │
│   └─ Recent Activity (2026-01-28)      │
├─────────────────────────────────────────┤
│ Generated Hunts (5)                     │
│   ├─ XSIAM: 2 executions               │
│   └─ Defender: 3 executions            │
├─────────────────────────────────────────┤
│ Co-occurring Entities                   │
│   ├─ TTPs: T1566.001, T1059.001        │
│   └─ Actors: APT29, Cozy Bear          │
└─────────────────────────────────────────┘
```

### 3. Campaign Detection Dashboard

**New Page: `/admin/intelligence/campaigns`**

```
┌─────────────────────────────────────────┐
│ Campaign Detection Dashboard            │
├─────────────────────────────────────────┤
│ Active Campaigns (3)                    │
│                                         │
│ 🔴 APT29 Infrastructure Reuse           │
│    Articles: 8 | IOCs: 15 | Period: 90d│
│    [View Details →]                     │
│                                         │
│ 🟡 Ransomware Wave                      │
│    Articles: 12 | IOCs: 45 | Period: 30d│
│    [View Details →]                     │
│                                         │
│ 🟢 Supply Chain Compromise              │
│    Articles: 5 | IOCs: 8 | Period: 60d │
│    [View Details →]                     │
├─────────────────────────────────────────┤
│ Similarity Configuration                │
│   Lookback Window: [365] days          │
│   IOC Weight: [40]%                     │
│   TTP Weight: [30]%                     │
│   Actor Weight: [20]%                   │
│   Semantic Weight: [10]%                │
│   Min Threshold: [0.6]                  │
│   [Save] [Rebuild Relationships]       │
└─────────────────────────────────────────┘
```

### 4. Hunt Traceability View

**Enhanced Hunt Page:**

```
┌─────────────────────────────────────────┐
│ Hunt: XSIAM - APT29 Infrastructure      │
├─────────────────────────────────────────┤
│ 🆕 Source Intelligence                  │
│   ├─ Article: "APT29 Campaign..." [→]  │
│   ├─ Extraction Run: #1234              │
│   └─ Entities Used:                     │
│       ├─ IOCs: 15 indicators            │
│       └─ TTPs: 5 techniques             │
├─────────────────────────────────────────┤
│ Query Logic                             │
│ [XQL query here...]                     │
├─────────────────────────────────────────┤
│ Executions (3)                          │
│   ├─ 2026-01-28: 5 hits [view →]       │
│   └─ 2026-01-20: 0 hits                │
├─────────────────────────────────────────┤
│ 🆕 Backtrack to Evidence                │
│   [View Original Article] [View IOCs]  │
└─────────────────────────────────────────┘
```

---

## Performance Optimizations

### Indexing Strategy

```sql
-- Time-bounded queries
CREATE INDEX idx_articles_created_at_desc ON articles(created_at DESC);

-- Entity lookups
CREATE INDEX idx_article_iocs_ioc_id ON article_iocs(ioc_id);
CREATE INDEX idx_article_ttps_ttp_id ON article_ttps(ttp_id);
CREATE INDEX idx_article_actors_actor_id ON article_actors(actor_id);

-- Relationship queries
CREATE INDEX idx_article_rel_composite ON article_relationships(
    source_article_id, 
    relationship_score DESC
);

-- Embedding search (if using pgvector)
CREATE INDEX idx_article_embeddings_vector ON article_embeddings 
USING ivfflat (embedding vector_cosine_ops);
```

### Caching Strategy

1. **Entity Counts** - Cache occurrence counts (Redis, 5min TTL)
2. **Relationship Scores** - Cache top 10 related articles (Redis, 1hr TTL)
3. **Campaign Detection** - Cache campaign list (Redis, 15min TTL)
4. **Embeddings** - Precompute and store in database

### Async Processing

1. **Extraction** - Background task for large articles
2. **Historical Association** - Async after extraction
3. **Embedding Generation** - Background worker
4. **Campaign Detection** - Scheduled job (hourly)

---

## Implementation Timeline

### Week 1: Data Models & Migration
- Day 1-2: Create models_agentic.py
- Day 3: Create migration script
- Day 4: Test migration
- Day 5: Deploy to dev

### Week 2: Core Services
- Day 1-2: AgenticIntelligenceOrchestrator
- Day 3: EntityCanonicalizer
- Day 4-5: HistoricalAssociationEngine

### Week 3: Similarity & Campaigns
- Day 1-2: SemanticSimilarityEngine
- Day 3-4: Campaign detection logic
- Day 5: Admin configuration

### Week 4: API & Integration
- Day 1-2: New API endpoints
- Day 3: Integration with existing flows
- Day 4-5: Testing & optimization

### Week 5: UI Components
- Day 1-2: Entity pivot views
- Day 3: Relationship graph
- Day 4: Campaign dashboard
- Day 5: Traceability timeline

### Week 6: Testing & Documentation
- Day 1-3: Comprehensive testing
- Day 4: Performance optimization
- Day 5: Documentation

---

## Success Metrics

### Functional Metrics

- ✅ 100% of articles automatically analyzed
- ✅ <5 seconds for entity extraction
- ✅ <10 seconds for historical association
- ✅ >90% entity canonicalization accuracy
- ✅ Campaign detection within 1 hour of new article

### Quality Metrics

- ✅ >95% IOC extraction recall
- ✅ <5% false positive rate
- ✅ >90% TTP identification accuracy
- ✅ >85% semantic similarity precision

### Performance Metrics

- ✅ <100ms for entity pivot queries
- ✅ <500ms for relationship queries
- ✅ <2s for campaign detection
- ✅ Support 10,000+ articles efficiently

---

## Next Steps

1. ✅ Review current capabilities
2. 🔄 Create enhanced data models
3. ⏳ Build orchestrator
4. ⏳ Implement association engine
5. ⏳ Add API endpoints
6. ⏳ Build UI components
7. ⏳ Test end-to-end
8. ⏳ Deploy to production

---

**Status:** 🚀 Starting implementation now...
