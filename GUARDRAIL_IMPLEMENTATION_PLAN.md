# Guardrail Implementation Plan for Joti GenAI Functions
**Date**: February 10, 2026
**Status**: Implementation Ready
**Priority**: CRITICAL

---

## EXECUTIVE SUMMARY

The guardrail framework is **95% complete** but needs **integration hooks** in GenAI functions to actually enforce guardrails. This plan details:

1. **What's Done**: Guardrail CRUD API, validation service, testing endpoints
2. **What's Missing**: Integration in summarization, IOC extraction, and other GenAI functions
3. **Implementation Tasks**: 4-6 specific files to modify/create
4. **Estimated Effort**: 2-3 days for complete integration

---

## CURRENT GUARDRAIL SYSTEM STATUS

### ✅ Already Implemented

**File**: `/backend/app/admin/guardrails.py` (721 lines)

**Features**:
- 7 guardrail types with validation:
  1. **PII Detection** - Email, phone, SSN, credit card redaction/blocking
  2. **Prompt Injection** - Block injection attack attempts
  3. **Length Limits** - Min/max character/token constraints
  4. **Toxicity** - Block harmful outputs (placeholder)
  5. **Keyword Blocking** - Forbidden keyword detection
  6. **Keyword Required** - Ensure required keywords present
  7. **Format Enforcement** - JSON/markdown validation

**CRUD Operations**:
- `GET /admin/genai-guardrails/` - List all guardrails
- `POST /admin/genai-guardrails/` - Create guardrail
- `GET /admin/genai-guardrails/{id}` - Get specific guardrail
- `PATCH /admin/genai-guardrails/{id}` - Update guardrail
- `DELETE /admin/genai-guardrails/{id}` - Delete guardrail

**Testing & Validation**:
- `GET /admin/genai-guardrails/types` - List available types
- `POST /admin/genai-guardrails/test` - Test guardrail with sample input
- `POST /admin/genai-guardrails/validate` - Validate prompt input against prompt's guardrails

**Prompt-Level Guardrail Assignment**:
- `GET /admin/genai-guardrails/prompts/{prompt_id}/guardrails` - Get guardrails for prompt
- `POST /admin/genai-guardrails/prompts/{prompt_id}/guardrails` - Attach guardrail to prompt
- `DELETE /admin/genai-guardrails/prompts/{prompt_id}/guardrails/{pg_id}` - Detach guardrail

**Database Models** (in `/backend/app/models.py`):
- `Guardrail`: Global guardrails (name, type, config, action, max_retries, is_active, created_at)
- `PromptGuardrail`: Join table linking prompts to guardrails (with execution order)
- `Prompt`: Stores AI prompts with versions

---

## WHAT'S MISSING: INTEGRATION POINTS

### 1. **Article Summarization** ❌ NOT INTEGRATED

**File**: `/backend/app/articles/summarization.py`

**Functions That Need Guardrails**:
- `POST /articles/summarize` - Generate article summary
- `POST /articles/extract-iocs` - Extract indicators from content
- `POST /articles/{content_id}/analyze` - Comprehensive analysis

**What Needs Integration**:
```python
# Before GenAI API call, validate input:
1. Get applicable guardrails for the function
2. Run GuardrailValidator.validate() on article content/title
3. If validation fails:
   - Log the violation to audit logs
   - Take action (retry, reject, fix, log) based on guardrail config
   - If action is "reject", return 400 error to user
   - If action is "fix", attempt to sanitize and retry
4. Only then call GenAI API

# After GenAI API response, validate output:
1. Run output validation against guardrails
2. If output fails validation:
   - Log violation
   - Take configured action
   - If "reject", return error instead of the bad summary
```

---

### 2. **IOC Extraction** ❌ NOT INTEGRATED

**File**: `/backend/app/extraction/extractor.py` (placeholder)

**Functions That Need Guardrails**:
- Regex-based IOC extraction
- GenAI-powered IOC extraction (if implemented)
- IOC validation and deduplication

**What Needs Integration**:
```python
# Input validation:
- Block extraction if article contains certain keywords (e.g., "marketing" vs. real threat intel)
- Length validation on content being extracted from

# Output validation:
- Validate extracted IOCs match expected patterns
- Block extraction if too many false positives detected
- Require minimum confidence threshold
```

---

### 3. **Prompt Management** ⚠️ PARTIALLY INTEGRATED

**File**: `/backend/app/genai/prompts.py`

**Status**: Prompts exist but guardrails not linked to execution

**What Needs Integration**:
```python
# When retrieving prompts for execution:
1. Load prompt's attached guardrails
2. Apply in order specified by PromptGuardrail.order
3. Handle violations appropriately
```

---

### 4. **GenAI Provider Calls** ❌ NOT INTEGRATED

**File**: `/backend/app/genai/provider.py`

**Status**: GenAI API calls exist but no guardrail wrapping

**What Needs Integration**:
```python
# Create a guardrail wrapper around GenAI API calls:
class GuardrailledGenAIProvider:
    async def call_genai_with_guardrails(
        self,
        function_name: str,  # "summarize", "extract_iocs", "generate_report"
        input_text: str,
        model_name: str,
        max_retries: int = 2
    ):
        # 1. Validate input against global + function guardrails
        # 2. Call GenAI
        # 3. Validate output against guardrails
        # 4. Return result or error
```

---

## IMPLEMENTATION TASKS

### TASK 1: Create Guardrail Service Module
**File**: `/backend/app/guardrails/service.py` (NEW)
**Effort**: 4-6 hours
**Status**: Ready to implement

**Responsibilities**:
- Load guardrails for a specific function
- Apply guardrails to input/output
- Handle guardrail violations
- Log guardrail actions to audit system
- Retry logic when action="retry"

**Methods to Implement**:
```python
class GuardrailService:
    # Get guardrails for a function
    async def get_function_guardrails(
        db: Session,
        function_name: str
    ) -> List[Guardrail]

    # Apply guardrails to content
    async def validate_input(
        db: Session,
        function_name: str,
        input_text: str,
        user_id: int
    ) -> GuardrailValidationResponse

    # Apply guardrails to GenAI output
    async def validate_output(
        db: Session,
        function_name: str,
        output_text: str,
        user_id: int
    ) -> GuardrailValidationResponse

    # Handle guardrail violation
    async def handle_violation(
        guardrail: Guardrail,
        violation_text: str,
        context: str
    ) -> ViolationAction

    # Log guardrail action
    async def log_guardrail_action(
        db: Session,
        function_name: str,
        guardrail_id: int,
        action: str,
        passed: bool,
        user_id: int
    ) -> None
```

---

### TASK 2: Integrate Guardrails in Article Summarization
**File**: `/backend/app/articles/summarization.py` (MODIFY)
**Effort**: 3-4 hours
**Status**: Ready to implement

**Changes Required**:
```python
@router.post("/summarize")
async def summarize_article(
    request: SummarizeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)  # ADD THIS
):
    """Generate a summary of an article with guardrail validation."""
    try:
        # STEP 1: Validate input against guardrails
        guardrail_service = GuardrailService()
        validation_result = await guardrail_service.validate_input(
            db=db,
            function_name="summarize",
            input_text=f"{request.title}\n{request.content}",
            user_id=current_user.id
        )

        if not validation_result.passed:
            await guardrail_service.log_guardrail_action(
                db=db,
                function_name="summarize",
                guardrail_id=0,  # Could track which guardrail
                action="rejected",
                passed=False,
                user_id=current_user.id
            )
            raise HTTPException(
                status_code=400,
                detail=f"Input validation failed: {validation_result.violations}"
            )

        # STEP 2: Get summarization (existing code)
        summary_type = SummaryType(request.summary_type)
        service = get_summarization_service()
        result = await service.summarize_article(
            title=request.title,
            content=request.content,
            summary_type=summary_type,
            persona=request.persona,
            preferred_model=request.preferred_model
        )

        # STEP 3: Validate output against guardrails
        output_validation = await guardrail_service.validate_output(
            db=db,
            function_name="summarize",
            output_text=result.get("summary", ""),
            user_id=current_user.id
        )

        if not output_validation.passed:
            await guardrail_service.log_guardrail_action(
                db=db,
                function_name="summarize",
                guardrail_id=0,
                action="rejected",
                passed=False,
                user_id=current_user.id
            )
            raise HTTPException(
                status_code=400,
                detail=f"Output validation failed: {output_validation.violations}"
            )

        # STEP 4: Apply sanitization if needed
        if output_validation.sanitized_input:
            result["summary"] = output_validation.sanitized_input

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

---

### TASK 3: Integrate Guardrails in IOC Extraction
**File**: `/backend/app/extraction/extractor.py` (CREATE/MODIFY)
**Effort**: 4-6 hours
**Status**: Requires implementation of extraction algorithm

**Changes Required**:
```python
class IOCExtractor:
    async def extract_iocs(
        self,
        content: str,
        user_id: int,
        db: Session
    ) -> Dict:
        """Extract IOCs with guardrail validation."""

        # STEP 1: Input validation
        guardrail_service = GuardrailService()
        validation_result = await guardrail_service.validate_input(
            db=db,
            function_name="extract_iocs",
            input_text=content,
            user_id=user_id
        )

        if not validation_result.passed:
            raise ValueError(f"IOC extraction blocked: {validation_result.violations}")

        # STEP 2: Extract IOCs using regex patterns
        iocs = {
            "ips": self._extract_ips(content),
            "domains": self._extract_domains(content),
            "urls": self._extract_urls(content),
            "hashes": self._extract_hashes(content),
            "emails": self._extract_emails(content),
            "cves": self._extract_cves(content)
        }

        # STEP 3: Validate extracted IOCs against patterns
        validated_iocs = {k: [v for v in vs if self._validate_ioc(k, v)]
                         for k, vs in iocs.items()}

        # STEP 4: Output validation
        ioc_text = str(validated_iocs)  # Stringify for validation
        output_validation = await guardrail_service.validate_output(
            db=db,
            function_name="extract_iocs",
            output_text=ioc_text,
            user_id=user_id
        )

        if not output_validation.passed:
            raise ValueError(f"IOC output rejected: {output_validation.violations}")

        return validated_iocs

    def _extract_ips(self, content: str) -> List[str]:
        """Extract IP addresses with regex."""
        pattern = r'\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b'
        return list(set(re.findall(pattern, content)))

    def _extract_domains(self, content: str) -> List[str]:
        """Extract domain names with regex."""
        pattern = r'\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}\b'
        return list(set(re.findall(pattern, content, re.IGNORECASE)))

    def _extract_urls(self, content: str) -> List[str]:
        """Extract URLs with regex."""
        pattern = r'https?://(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&/=]*)'
        return list(set(re.findall(pattern, content)))

    def _extract_hashes(self, content: str) -> List[str]:
        """Extract MD5, SHA-1, SHA-256 hashes."""
        hashes = []
        # MD5: 32 hex chars
        hashes.extend(re.findall(r'\b[a-fA-F0-9]{32}\b', content))
        # SHA-1: 40 hex chars
        hashes.extend(re.findall(r'\b[a-fA-F0-9]{40}\b', content))
        # SHA-256: 64 hex chars
        hashes.extend(re.findall(r'\b[a-fA-F0-9]{64}\b', content))
        return list(set(hashes))

    def _extract_emails(self, content: str) -> List[str]:
        """Extract email addresses."""
        pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        return list(set(re.findall(pattern, content)))

    def _extract_cves(self, content: str) -> List[str]:
        """Extract CVE identifiers (CVE-YYYY-XXXXX format)."""
        pattern = r'CVE-\d{4}-\d{4,}\b'
        return list(set(re.findall(pattern, content, re.IGNORECASE)))

    def _validate_ioc(self, ioc_type: str, value: str) -> bool:
        """Validate IOC format to reduce false positives."""
        # Add logic to validate each IOC type
        # For now, simple length checks
        min_lengths = {
            "ips": 7,      # 1.1.1.1
            "domains": 4,  # a.co
            "urls": 8,     # http://a
            "hashes": 32,  # MD5 minimum
            "emails": 5,   # a@b.c
            "cves": 9      # CVE-2021-0
        }
        return len(value) >= min_lengths.get(ioc_type, 1)
```

---

### TASK 4: Create FunctionGuardrail Model
**File**: `/backend/app/models.py` (MODIFY)
**Effort**: 1-2 hours
**Status**: Ready to implement

**Add These Models**:
```python
class FunctionGuardrail(Base):
    """Link guardrails to specific GenAI functions."""
    __tablename__ = "function_guardrails"

    id = Column(Integer, primary_key=True)
    function_name = Column(String(50), nullable=False)  # "summarize", "extract_iocs", "generate_report"
    guardrail_id = Column(Integer, ForeignKey("guardrails.id", ondelete="CASCADE"), nullable=False)
    order = Column(Integer, default=0)  # Execution order
    apply_to_input = Column(Boolean, default=True)
    apply_to_output = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    guardrail = relationship("Guardrail", backref="function_guardrails")

    __table_args__ = (
        UniqueConstraint('function_name', 'guardrail_id', name='uq_function_guardrail'),
        Index('idx_function_guardrail_function', 'function_name'),
    )
```

---

### TASK 5: Create API Endpoints for Function Guardrails
**File**: `/backend/app/admin/guardrails.py` (ADD ROUTES)
**Effort**: 2-3 hours
**Status**: Ready to implement

**Routes to Add**:
```python
@router.get("/functions", tags=["guardrails-functions"])
async def list_available_functions(
    current_user: User = Depends(require_permission(Permission.ADMIN_GENAI_VIEW.value))
):
    """List all GenAI functions that support guardrails."""
    return {
        "functions": [
            {
                "name": "summarize",
                "description": "Generate article summaries (executive, technical, brief)",
                "input_type": "article_content",
                "output_type": "summary_text"
            },
            {
                "name": "extract_iocs",
                "description": "Extract IOCs from article content",
                "input_type": "article_content",
                "output_type": "ioc_list"
            },
            {
                "name": "generate_report",
                "description": "Generate threat report from articles",
                "input_type": "article_list",
                "output_type": "report_text"
            }
        ]
    }


@router.get("/functions/{function_name}/guardrails")
async def list_function_guardrails(
    function_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.ADMIN_GENAI_VIEW.value))
):
    """Get all guardrails for a specific function."""
    valid_functions = ["summarize", "extract_iocs", "generate_report"]
    if function_name not in valid_functions:
        raise HTTPException(status_code=400, detail=f"Invalid function. Valid: {valid_functions}")

    function_guardrails = db.query(FunctionGuardrail).filter(
        FunctionGuardrail.function_name == function_name,
        FunctionGuardrail.is_active == True
    ).order_by(FunctionGuardrail.order).all()

    return [{"guardrail": fg.guardrail, "order": fg.order, ...} for fg in function_guardrails]


@router.post("/functions/{function_name}/guardrails/{guardrail_id}")
async def attach_guardrail_to_function(
    function_name: str,
    guardrail_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.ADMIN_GENAI_EDIT.value))
):
    """Attach a guardrail to a GenAI function."""
    # Validate function name
    # Verify guardrail exists
    # Create FunctionGuardrail record
    # Return created record


@router.delete("/functions/{function_name}/guardrails/{guardrail_id}")
async def detach_guardrail_from_function(
    function_name: str,
    guardrail_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.ADMIN_GENAI_EDIT.value))
):
    """Detach a guardrail from a GenAI function."""
    # Find and delete FunctionGuardrail record
```

---

### TASK 6: Create Guardrail Audit Logging
**File**: `/backend/app/audit/guardrail_logger.py` (NEW)
**Effort**: 2-3 hours
**Status**: Ready to implement

**Functionality**:
```python
class GuardrailAuditLogger:
    @staticmethod
    async def log_guardrail_check(
        db: Session,
        function_name: str,
        guardrail_id: int,
        passed: bool,
        violations: List[str],
        user_id: int,
        article_id: Optional[str] = None
    ):
        """Log guardrail validation check to audit system."""
        audit_log = AuditLog(
            user_id=user_id,
            action="genai.guardrail_check",
            resource_type="guardrail",
            resource_id=str(guardrail_id),
            details={
                "function": function_name,
                "passed": passed,
                "violations": violations,
                "article_id": article_id
            },
            timestamp=datetime.utcnow(),
            status="success" if passed else "blocked"
        )
        db.add(audit_log)
        db.commit()
```

---

## IMPLEMENTATION SEQUENCE

### Week 1:

**Day 1** (4-6 hours):
1. ✅ Create `/backend/app/guardrails/service.py` with core service class
2. ✅ Add `FunctionGuardrail` model to `/backend/app/models.py`
3. ✅ Run database migration to create `function_guardrails` table

**Day 2** (4-6 hours):
1. ✅ Add API endpoints in `/backend/app/admin/guardrails.py` for function-guardrail management
2. ✅ Create `/backend/app/audit/guardrail_logger.py` for audit logging
3. ✅ Test guardrail service locally

**Day 3** (6-8 hours):
1. ✅ Integrate guardrails into `/backend/app/articles/summarization.py`
2. ✅ Test summarization with guardrails
3. ✅ Update frontend to show guardrail errors

### Week 2:

**Day 1** (6-8 hours):
1. ✅ Implement IOC extractor in `/backend/app/extraction/extractor.py`
2. ✅ Integrate guardrails into IOC extraction
3. ✅ Test IOC extraction with guardrails

**Day 2** (4-6 hours):
1. ✅ Add guardrail test UI to Admin dashboard
2. ✅ Create guardrail default configurations (templates)
3. ✅ Documentation and deployment

---

## GUARDRAIL CONFIGURATION TEMPLATES

### For Summarization Function

```json
{
  "name": "Block PII in Summaries",
  "type": "pii",
  "description": "Ensure summaries don't leak PII",
  "config": {
    "patterns": ["email", "phone", "ssn"],
    "action_on_detect": "redact"
  },
  "action": "fix",
  "max_retries": 2
}
```

```json
{
  "name": "Enforce Length Limits",
  "type": "length",
  "description": "Summaries should be reasonable length",
  "config": {
    "min_length": 50,
    "max_length": 2000,
    "max_tokens": 500
  },
  "action": "reject",
  "max_retries": 0
}
```

### For IOC Extraction Function

```json
{
  "name": "Block Low-Confidence IOCs",
  "type": "keywords_forbidden",
  "description": "Filter out common false positives",
  "config": {
    "keywords": ["example.com", "127.0.0.1", "test.local"]
  },
  "action": "fix",
  "max_retries": 1
}
```

```json
{
  "name": "Enforce IOC Format",
  "type": "format",
  "description": "IOCs must be valid formats",
  "config": {
    "format": "json",
    "schema": {
      "type": "object",
      "properties": {
        "ips": {"type": "array"},
        "domains": {"type": "array"},
        "hashes": {"type": "array"}
      }
    }
  },
  "action": "reject",
  "max_retries": 0
}
```

---

## TESTING STRATEGY

### Unit Tests
- Test guardrail validation against sample inputs
- Test each guardrail type (PII, injection, length, etc.)
- Test sanitization and redaction

### Integration Tests
- Test guardrail enforcement in summarization
- Test guardrail enforcement in IOC extraction
- Test guardrail bypass on admin override

### End-to-End Tests
- User workflow: Admin creates guardrail → attaches to function → user summarizes article → guardrail blocks/allows
- Test audit logging of guardrail actions
- Test error messaging to users

---

## ROLLOUT PLAN

### Phase 1: Global Guardrails (CURRENT)
- Admins can create/manage guardrails
- Guardrails can be tested via API

### Phase 2: Function Attachment (NEXT SPRINT)
- Guardrails can be attached to specific functions
- Guardrails are enforced in GenAI function calls

### Phase 3: Advanced Features (FUTURE)
- Per-user guardrail overrides
- Guardrail groups for bulk assignment
- Guardrail analytics and violation reports
- Automatic guardrail recommendation based on violations

---

## SUCCESS CRITERIA

✅ **Guardrails are enforced** in article summarization and IOC extraction
✅ **Audit logging** captures all guardrail checks and violations
✅ **Errors are user-friendly** and explain which guardrail was violated
✅ **Admins can manage** guardrails without backend code changes
✅ **Zero production guardrail bypasses** except explicit admin override
✅ **Documentation** covers how to configure guardrails

---

## RELATED DOCUMENTATION

- **Application Feature Audit**: `/c/Projects/Joti/APPLICATION_FEATURE_AUDIT.md`
- **Existing Guardrails API**: `/backend/app/admin/guardrails.py` (721 lines)
- **Summarization Routes**: `/backend/app/articles/summarization.py`
- **IOC Extraction Placeholder**: `/backend/app/extraction/extractor.py`

---

**Document Version**: 1.0
**Status**: Ready for Implementation
**Next Step**: Begin TASK 1 - Create Guardrail Service Module
