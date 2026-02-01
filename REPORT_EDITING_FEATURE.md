# Report Editing & Publishing Workflow

## Overview
Added comprehensive report editing functionality that allows Intel Analysts (TI) and Admins to review, edit, and publish reports before making them available for viewing and download.

## Key Features

### 1. **Draft Status by Default**
- All newly generated reports are created in `DRAFT` status
- Reports remain editable until published
- Only published reports are final and ready for distribution

### 2. **Role-Based Permissions**
- **Edit Reports**: Only `ADMIN` and `TI` (Threat Intelligence) roles
- **Publish Reports**: Only `ADMIN` and `TI` roles
- **View Reports**: All users with report read permissions
- **Unpublish (Admin Only)**: Move published reports back to draft

### 3. **Structured Editing**
Reports can be edited with the following fields:
- **Title**: Report headline
- **Executive Summary**: High-level summary for leadership
- **Technical Summary**: Detailed technical analysis
- **Key Findings**: Bulleted list of key discoveries
- **Recommendations**: Actionable recommendations

### 4. **Version Tracking**
- Each edit increments the version number
- Tracks who edited (`edited_by_id`) and when (`edited_at`)
- Tracks who published (`published_by_id`) and when (`published_at`)

### 5. **Workflow Status**
```
┌─────────────┐
│   Generate  │
│   Report    │
└──────┬──────┘
       │
       ▼
┌─────────────┐      ┌──────────┐
│    DRAFT    │◄─────┤ Unpublish│ (Admin only)
│   Status    │      │          │
└──────┬──────┘      └──────────┘
       │
       │ Edit (TI/Admin)
       │ ↓ ↑
       │
       │ Publish (TI/Admin)
       ▼
┌─────────────┐
│  PUBLISHED  │
│   Status    │
└─────────────┘
       │
       │ View/Download
       │ (All users)
       ▼
```

## API Endpoints

### Update Report (PATCH)
```
PATCH /reports/{report_id}
Authorization: Bearer <token>
Roles: ADMIN, TI

Body:
{
  "title": "Updated title",
  "executive_summary": "...",
  "technical_summary": "...",
  "key_findings": ["finding 1", "finding 2"],
  "recommendations": ["rec 1", "rec 2"]
}
```

### Publish Report (POST)
```
POST /reports/{report_id}/publish
Authorization: Bearer <token>
Roles: ADMIN, TI

Body:
{
  "notes": "Optional publishing notes"
}
```

### Unpublish Report (POST)
```
POST /reports/{report_id}/unpublish
Authorization: Bearer <token>
Roles: ADMIN

// Moves report back to DRAFT status
```

## Database Schema Changes

### New Fields in `reports` Table:
```sql
-- Status and content fields
status ENUM('DRAFT', 'PUBLISHED') DEFAULT 'DRAFT'
executive_summary TEXT
technical_summary TEXT
key_findings JSON DEFAULT '[]'
recommendations JSON DEFAULT '[]'

-- Tracking fields
edited_by_id INTEGER REFERENCES users(id)
edited_at TIMESTAMP
published_by_id INTEGER REFERENCES users(id)
published_at TIMESTAMP
version INTEGER DEFAULT 1

-- Index for filtering
CREATE INDEX idx_reports_status ON reports(status);
```

## Frontend UI

### Reports List Page
- **Status Column**: Shows DRAFT (orange) or PUBLISHED (green) badge
- **Action Buttons**:
  - **Draft Reports**: "Edit" and "Publish" buttons
  - **Published Reports**: "View" button (edit disabled)
  - **Admin Only**: "Move to Draft" option to unpublish

### Edit Modal
Large modal (900px wide) with:
- Title field
- Executive Summary textarea (6 rows)
- Technical Summary textarea (6 rows)
- Key Findings textarea (5 rows, one per line)
- Recommendations textarea (5 rows, one per line)
- Info alert explaining review/publish workflow
- Save button with loading state

### Status Indicators
- **DRAFT**: Orange tag with edit icon
- **PUBLISHED**: Green tag with checkmark icon
- Version number shown in logs

## Usage Workflow

### For Intel Analysts (TI):

1. **Generate Report**
   - Select articles and generate report
   - Report created in DRAFT status

2. **Review & Edit**
   - Click "Edit" button on draft report
   - Review AI-generated content
   - Make necessary corrections/improvements
   - Save changes (version increments)

3. **Publish**
   - When satisfied with edits, click "Publish"
   - Report becomes final and available for download
   - Status changes to PUBLISHED

### For Admins:

- All TI capabilities plus:
- **Unpublish**: Can move published reports back to draft if corrections needed
- Full oversight of all report edits via audit logs

## Audit Logging

All report actions are logged:
- Report generation (with method: genai/fallback)
- Report edits (with version and fields updated)
- Report publishing (with publisher info)
- Report unpublishing (admin only)

Example audit log entry:
```json
{
  "user_id": 1,
  "event_type": "REPORT_GENERATION",
  "action": "Edited report (v3): Weekly Threat Summary",
  "resource_type": "report",
  "resource_id": 42,
  "details": {
    "version": 3,
    "fields_updated": ["technical_summary", "key_findings"]
  }
}
```

## Benefits

1. **Quality Control**: Review AI-generated content before distribution
2. **Accuracy**: Correct any errors or add missing context
3. **Professionalism**: Ensure reports meet organizational standards
4. **Compliance**: Review process ensures proper approval chain
5. **Flexibility**: Edit and refine content as needed
6. **Traceability**: Full audit trail of who edited what and when

## Security

- Role-based access control enforced at API level
- Only ADMIN and TI roles can edit/publish
- Published reports are immutable (unless unpublished by admin)
- All actions logged for compliance

## Testing

1. **Create Draft Report**:
   - Generate new report → Should be in DRAFT status

2. **Edit Report** (as TI or Admin):
   - Click Edit → Modal opens with current content
   - Make changes → Save → Version increments

3. **Publish Report** (as TI or Admin):
   - Click Publish → Status changes to PUBLISHED
   - Edit button should disappear

4. **Unpublish** (as Admin):
   - Published report → More menu → Move to Draft
   - Report returns to DRAFT status

5. **Permission Check**:
   - Login as VIEWER/IR/TH role → Should NOT see Edit/Publish buttons
   - API should return 403 Forbidden if attempted

## Files Modified

### Backend:
- `backend/app/models.py` - Added ReportStatus enum and new fields
- `backend/app/reports/routes.py` - Added edit/publish/unpublish endpoints
- `backend/migrations/versions/006_add_report_edit_workflow.py` - Database migration

### Frontend:
- `frontend/src/api/client.js` - Added update/publish/unpublish API calls
- `frontend/src/pages/Reports.js` - Added edit modal, status column, action buttons

### Database:
- Applied migration directly to add new columns and enum type

## Next Steps

- Consider adding:
  - Rich text editor for summaries (WYSIWYG)
  - Report comments/review notes
  - Multi-level approval workflow
  - Report templates
  - Comparison view (before/after edits)
