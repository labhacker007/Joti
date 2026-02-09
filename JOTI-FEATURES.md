# Joti - News Feed Aggregator Features

**Version**: 1.0
**Last Updated**: February 7, 2026
**Application**: Joti - Modern News Feed Aggregator with RBAC

---

## Overview

Joti is a lightweight, production-ready news feed aggregator designed for teams to manage, prioritize, and monitor news sources using role-based access control. It features keyword-based watchlists, RSS/Atom feed ingestion, article summarization, and admin controls.

**Key Differentiators**:
- Role-based access control (ADMIN, USER)
- Personal + global watchlist support
- Admin-managed default feeds for new users
- OpenAI-powered article summarization
- Clean, modern UI with 6 theme options
- OAuth 2.0 support (Google, Microsoft)
- Full audit logging

---

## Table of Contents

1. [Authentication & Login](#authentication--login)
2. [Dashboard](#dashboard)
3. [News & Feeds](#news--feeds)
4. [Sources (Admin Only)](#sources-admin-only)
5. [Watchlist](#watchlist)
6. [Profile](#profile)
7. [Admin Panel](#admin-panel)
8. [Theme System](#theme-system)
9. [API & Integration](#api--integration)

---

## Authentication & Login

**URL**: `/login`

### Login Page Features

#### Email/Password Authentication
- **Email Field**: Enter registered email address
- **Password Field**: Enter password (minimum 8 characters, must include uppercase, number, special character)
- **Sign In Button**: Submit credentials and authenticate
- **Forgot Password**: Link to password reset flow (if enabled)
- **Remember Me**: Checkbox to maintain login state across sessions

#### OAuth 2.0 Sign In
- **Google Sign In Button**: Click to authenticate via Google account
  - Automatically creates account on first login
  - Auto-subscribes to admin-set default feeds
  - Links profile picture and name
- **Microsoft Sign In Button**: Click to authenticate via Microsoft/Azure AD
  - Similar auto-account creation and default feeds subscription
  - Enterprise SSO compatible

#### Account Creation
- **Sign Up Link**: Navigate to registration form
- **Registration Fields**:
  - Email address (validated)
  - Username (unique, 3-20 characters)
  - Full name (optional)
  - Password (8+ chars, 1 uppercase, 1 number, 1 special char)
  - Confirm password
- **Create Account Button**: Submit registration

#### Theme & Appearance on Login
- **Theme Selector (Top Right)**: Dropdown menu showing all 6 available themes
  - Daylight (professional, light blue)
  - Command Center (dark blue, professional)
  - Aurora (purple gradient)
  - Red Alert (red accent)
  - Midnight (dark, deep blue)
  - Matrix (hacker-style green)
- **Instant Theme Preview**: Changes apply immediately without page reload

### Security Features
- Password encrypted with Argon2 hashing
- JWT tokens (24hr expiration)
- Refresh token rotation (7-day expiration)
- CSRF protection
- Rate limiting on login attempts (5 attempts per 15 minutes)
- OTP/2FA support (optional, configured in Profile)

---

## Dashboard

**URL**: `/dashboard`

### Dashboard Overview (Coming Soon)
*Currently redirects to News & Feeds page. Future implementation will include:*
- Article statistics (total, unread, bookmarked)
- Feed source count & status
- Personal watchlist summary
- Recent activity log
- Quick navigation cards

---

## News & Feeds

**URL**: `/news`

### Main Article Triage Interface

#### Top Toolbar
- **Search Bar**: Filter articles by title/content keywords
  - Real-time search across all articles
  - Saves search history
- **Filter Dropdown**: Filter articles by:
  - **By Status**: Unread, Read, All
  - **By Priority**: High (watchlist matches), Low, All
  - **By Source**: Select specific feed sources
  - **By Date**: Last 24 hours, Last week, Last month, All
- **View Mode Toggle**:
  - **List View**: Compact rows with title, source, date
  - **Card View**: Larger cards with preview/summary
  - **Expanded View**: Full article text visible
- **Sort Options**:
  - By date (newest first)
  - By relevance (search matches)
  - By source
- **Refresh Button**: Force-fetch new articles from all sources
- **Settings Icon**: Configure article display preferences

#### Article List/Cards

**Per Article Buttons**:
1. **Read/Unread Toggle** (Eye icon)
   - Click to toggle article read status
   - Unread articles highlighted with blue indicator

2. **Bookmark/Star** (Star icon)
   - Save article to bookmarks
   - Bookmarked articles show filled star (yellow)
   - Accessible from Profile page

3. **Summarize** (Sparkles icon)
   - Uses OpenAI to generate concise summary
   - Shows 2-3 sentence summary below title
   - Only available if OpenAI configured
   - Takes 2-5 seconds to generate

4. **Expand/Read Full** (Expand icon or click title)
   - Opens article content in modal or sidebar
   - Shows full HTML-formatted article text
   - Displays source URL and publication date
   - Copy content button for sharing

5. **Share** (Share icon)
   - Email article to team members
   - Copy article link to clipboard
   - Export to Slack (if configured)

6. **Export to PDF** (Download icon)
   - Generates clean PDF with article text, source, date
   - Includes watermark with publication source
   - Downloads immediately to device

7. **More Options** (Three dots menu)
   - Mark as spam (hides similar articles)
   - Report source (flag problematic feed)
   - Copy article URL
   - View article metadata (hash, timestamps)
   - Add custom tag/label (user-only, not shared)

#### Article Information Display
- **Title**: Bold, truncated to 2 lines
- **Source Name**: Feed name with colored indicator
- **Publication Date**: Formatted (e.g., "2 hours ago")
- **Preview/Summary**: First 150 characters or AI summary
- **Watchlist Match Indicator**: 🔴 badge if matches personal/global watchlist
- **Read Status**: Blue dot for unread articles
- **Bookmark Status**: Yellow star if bookmarked

#### Sidebar Options
- **Watchlist Keywords**: Show matching keywords from personal + global lists
- **Author Info**: If available in feed
- **Categories/Tags**: User-assigned or feed-provided
- **Related Articles**: Similar articles from same source

#### Pagination & Infinite Scroll
- **Default View**: Show 20 articles per page
- **Load More Button**: Fetch next 20 articles
- **Infinite Scroll**: Auto-load more articles when scrolled to bottom (if enabled in settings)

---

## Sources (Admin Only)

**URL**: `/sources`

**Access**: ADMIN role only
**Permission**: `manage:sources`

### Source Management Dashboard

#### Top Toolbar
- **Add New Source Button**: Create new RSS/Atom feed
- **Search Box**: Search sources by name or URL
- **Filter Dropdown**:
  - **All Sources**: Show all sources
  - **Default Feeds**: Show only admin-set defaults
  - **Active**: Show only enabled sources
  - **Inactive**: Show only disabled sources
- **Sort Options**:
  - By name (A-Z)
  - By article count (most recent)
  - By creation date
  - By status (active/inactive)
- **Bulk Actions**: (if multiple selected)
  - Enable/disable selected sources
  - Set as default feeds
  - Remove selected sources

#### Sources Table/List

**Column Headers**:
1. **Checkbox**: Select multiple sources for bulk actions
2. **Source Name**: Feed name (linked to edit form)
3. **Feed URL**: RSS/Atom feed URL (truncated, hover shows full)
4. **Articles**: Total article count from this source
5. **Last Updated**: When feed was last ingested (e.g., "5 min ago")
6. **Status**: Active (green) or Inactive (gray) badge
7. **Default Feed**: Toggle switch to mark as default for new users
8. **Actions**: Edit, Disable/Enable, Delete buttons

#### Per-Source Actions

**Edit Button** (Pencil icon)
- Opens source configuration modal with fields:
  - **Feed Name**: Display name (required)
  - **Feed URL**: RSS/Atom URL (required, validated)
  - **Feed Type**: Auto-detected (RSS 2.0, Atom, etc.)
  - **Category**: User-assigned (optional)
  - **Description**: Notes about source (optional)
  - **Logo URL**: Custom source logo (optional)
  - **Auto-Summarize**: Toggle to auto-summarize articles from this source
  - **Language**: Auto-detected language
  - **Credentials**: Username/password if feed requires auth
  - **Update Frequency**: How often to check feed (15 min, 30 min, 1 hour, daily)
- **Save Changes Button**: Persist edits
- **Test Feed Button**: Validate URL and show latest articles
- **Cancel Button**: Discard changes

**Enable/Disable Toggle** (Power icon)
- Disable: Stop ingesting articles from this source
- Enable: Resume article ingestion
- Disabled sources show grayed-out in list

**Delete Button** (Trash icon)
- Remove source and all associated articles (if cleanup enabled)
- Confirmation dialog: "Delete [Source Name] and all articles? This cannot be undone."
- **Delete Option 1**: Keep articles in database but remove source
- **Delete Option 2**: Delete source and all articles
- After delete: Show success message and refresh list

**Default Feed Toggle** (Switch)
- When enabled: New users auto-subscribe to this source
- Shows "Default Feed" label in list
- Admin can set multiple sources as defaults
- Users can see which feeds are defaults when editing their custom feeds

#### Add New Source Modal

**Fields**:
- **Feed Name**: Display name (required, max 100 chars)
- **Feed URL**: RSS/Atom URL (required, must be valid)
- **Category**: Select from dropdown or create new (optional)
- **Description**: Notes about feed (max 500 chars)
- **Logo URL**: Custom logo for feed (optional, 200x200px recommended)
- **Language**: Auto-detected dropdown
- **Update Frequency**: 15 min (default), 30 min, 1 hour, 4 hours, daily
- **Authentication** (if needed):
  - Username field
  - Password field (stored encrypted)
- **Test Feed Button**: Before saving, fetch feed and show preview
- **Preview Section** (after test):
  - Shows latest 5 articles from feed
  - Confirms feed is valid and accessible
- **Create Source Button**: Save new source
- **Cancel Button**: Discard

#### Source Statistics (Click on source for details)
- **Total Articles**: Cumulative count
- **Last 7 Days**: Article count in last week
- **Last 24 Hours**: Article count in last day
- **Average Articles/Day**: Calculated metric
- **Last Ingestion**: Timestamp of last fetch
- **Next Scheduled Ingestion**: When feed will be checked next
- **Feed Health**: Status indicator (healthy, slow, error)

---

## Watchlist

**URL**: `/watchlist`

**Access**: All users
**Roles**: ADMIN (can manage global), USER (can manage personal)

### Two-Tab Interface

---

### TAB 1: My Watchlist (Personal)

#### Purpose
Personal keyword watchlist for articles matching your interests. Articles matching any of your keywords show with a 🔴 red badge on the News page.

#### Add Keyword Section
- **Keyword Input Field**: Type keyword to watch (e.g., "ransomware", "breach", "patch")
- **Add Button**: Click or press Enter to add keyword
- **Clear History Button**: Clear previously typed keywords

#### Keywords List/Grid

**Per Keyword Card**:
- **Keyword Text**: Displayed prominently (e.g., "ransomware")
- **Active Toggle** (Switch):
  - ON (blue): Include in watchlist matching
  - OFF (gray): Temporarily ignore keyword
- **Article Count**: Number of articles matching this keyword (cached, updates hourly)
- **Last Match**: Timestamp of most recent article matching this keyword
- **Delete Button** (X or Trash icon):
  - Remove keyword from watchlist
  - Confirmation: "Remove 'ransomware' from your watchlist?"

#### Search/Filter Keywords
- **Search Input**: Filter keyword list (type to search)
- **Filter Dropdown**:
  - All keywords
  - Active only
  - Unused (0 articles)

#### Import/Export
- **Import Keywords Button**: Paste comma-separated list of keywords
  - Paste: "ransomware,breach,APT,malware"
  - Preview what will be added
  - Confirm import
- **Export Keywords Button**: Download keywords as text file
  - Format: CSV or newline-separated
  - Includes match counts

#### Statistics
- **Total Keywords**: Count of all keywords (e.g., "12 keywords")
- **Active Keywords**: How many currently enabled
- **Total Matches**: Articles matching at least one keyword this week
- **Coverage**: Percentage of articles matching your watchlist

---

### TAB 2: Global Watchlist (Admin Only)

**Visibility**: Only shown for ADMIN role
**Purpose**: Admin-curated keywords that highlight articles for all users (non-disruptive, everyone sees same articles marked)

#### Add Global Keyword Section
- **Keyword Input Field**: Type keyword (e.g., "critical CVE")
- **Severity Level**: Dropdown (Low, Medium, High, Critical)
  - Affects color of watchlist badge
  - Critical = red, High = orange, Medium = yellow, Low = blue
- **Add Button**: Create global keyword
- **Description** (optional): Why this keyword is important

#### Global Keywords List

**Per Keyword Card**:
- **Keyword Text**: Displayed with severity color badge
  - 🔴 Critical (red)
  - 🟠 High (orange)
  - 🟡 Medium (yellow)
  - 🔵 Low (blue)
- **Severity Level**: Displayed and editable
- **Created By**: Admin username who created keyword
- **Date Created**: Timestamp
- **Article Count**: Total articles matching this keyword
- **Last Match**: When this keyword last matched an article
- **Edit Button** (Pencil):
  - Modify keyword text or severity
  - Update description
  - Save/Cancel
- **Delete Button** (Trash):
  - Remove global keyword
  - Confirmation: "Remove global keyword '[keyword]'? Users will no longer see this highlighted."

#### Global Stats
- **Total Global Keywords**: Count (e.g., "8 keywords")
- **Articles Flagged This Week**: Total matches across all global keywords
- **Coverage**: Percentage of all articles with global keyword match

#### Broadcast Notification (Future)
- When adding critical global keyword:
  - Optional: Send notification to all active users
  - Message: "New critical keyword added: '[keyword]'. Check News & Feeds."

---

## Profile

**URL**: `/profile`

**Access**: All users

### Profile Information Section

#### User Details
- **Email**: Current email address (read-only)
- **Username**: Current username (read-only)
- **Full Name**: User's display name (editable)
- **Role**: ADMIN or USER (read-only)
- **Account Created**: Date account was created (read-only)
- **Last Login**: When user last logged in (read-only)
- **Profile Picture**: Avatar display or upload (editable)

**Edit Profile Button**:
- Opens form to update:
  - Full name
  - Profile picture
- **Save Button**: Persist changes
- **Cancel Button**: Discard changes

### Password & Security Section

#### Change Password
- **Current Password Field**: Enter current password (required)
- **New Password Field**: New password (8+ chars, 1 upper, 1 number, 1 special)
- **Confirm Password Field**: Re-enter new password
- **Password Strength Indicator**: Shows strength as user types
  - Weak, Fair, Good, Strong
- **Change Password Button**: Apply password change
- **Success Message**: "Password changed successfully"
- **Error Messages**: If current password incorrect or new password invalid

#### Two-Factor Authentication (2FA)
- **Current Status**: Enabled or Disabled (green/gray)
- **Enable 2FA Button** (if disabled):
  - Generates QR code for authenticator app
  - Shows manual entry key as fallback
  - Requires 6-digit verification code from authenticator
  - Supported apps: Google Authenticator, Authy, Microsoft Authenticator, 1Password
- **Disable 2FA Button** (if enabled):
  - Requires password confirmation
  - Shows warning: "Disabling 2FA makes your account less secure"
- **Backup Codes Section** (if enabled):
  - List of one-time backup codes
  - Download/print codes
  - "Regenerate Codes" button (regenerates all codes)

### Bookmarks Section

#### Saved Articles
- **Total Bookmarked**: Count of saved articles
- **Bookmarks List**: Grid or table of all bookmarked articles
  - Title, source, date, read status
  - Remove button per article
- **Sort Options**: By date, by source, by relevance
- **Filter**: Show all, read only, unread only
- **Export Bookmarks** (Button):
  - Download as CSV or PDF
  - Includes all article metadata
- **Clear All Bookmarks** (Button with confirmation):
  - Dangerous action, requires confirmation

### Account Statistics

#### Usage Stats
- **Total Articles Seen**: Cumulative articles viewed
- **Articles Read This Week**: Weekly active reading metric
- **Average Reading Time**: Minutes spent reading per session
- **Favorite Source**: Most articles read from (auto-calculated)
- **Custom Feeds**: Count of personal feeds user added
- **Watchlist Keywords**: Count of active personal watchlist keywords

#### Activity Timeline (Mini)
- Last 7 days of activity
- Shows: articles read, bookmarks added, feeds added
- Bar chart format

### Preferences Section

#### Display Preferences
- **Default View Mode**: List, Card, or Expanded (dropdown)
- **Articles Per Page**: 10, 20, 50, or 100
- **Auto-Load More**: Enable/disable infinite scroll
- **Highlight Read Articles**: Show or hide already-read articles
- **Theme Preference**: Dropdown to set default theme (overrides nav button cycling)
- **Font Size**: Small, Default, Large, Extra Large
- **Timezone**: UTC or Local time (affects all timestamps)

#### Notification Preferences
- **Email Notifications**: Enabled/disabled
  - Daily digest of watchlist matches
  - New default feeds added
  - Security alerts
- **Browser Notifications**: Enabled/disabled (requires permission)
- **Unread Article Indicator**: Show badge with count on News page
- **Frequency**: Immediate, 1x daily, 1x weekly

#### Data & Privacy
- **Export My Data** (Button):
  - Downloads JSON file with all user data
  - Articles read, bookmarks, preferences
  - GDPR compliance
- **Delete Account** (Button):
  - Opens warning dialog
  - Requires password confirmation
  - "This action cannot be undone"
  - Option to download data before deletion
- **Privacy Settings**:
  - Allow profile to be searched
  - Show in user directory (admin only)

---

## Admin Panel

**URL**: `/admin`

**Access**: ADMIN role only

### Admin Dashboard with Tabs

---

### TAB 1: User Management

#### User List Table

**Column Headers**:
1. **Checkbox**: Select multiple users
2. **Email**: User email (linked to detail view)
3. **Username**: Display username
4. **Role**: ADMIN, USER (editable dropdown)
5. **Status**: Active (green), Inactive (gray), Suspended (red)
6. **Created**: Account creation date
7. **Last Login**: Last login timestamp
8. **Actions**: Edit, Deactivate/Activate, Delete buttons

**Per User Actions**:

**Edit Button** (Pencil):
- Opens user details modal:
  - Email (read-only)
  - Username (read-only)
  - Full name (editable)
  - Role (ADMIN or USER dropdown)
  - Status (Active, Inactive, Suspended)
  - Force password reset on next login (checkbox)
  - 2FA enabled status (toggle to disable)
  - Last login date (read-only)
- **Save Changes Button**
- **Reset Password Button**: Generate temporary password and send to email
- **Close Button**

**Deactivate/Activate Button** (Toggle):
- Deactivate: User cannot login, all sessions terminated
- Activate: User can login again
- Confirmation dialog for deactivate

**Delete Button** (Trash):
- Permanent account deletion
- Options:
  - Delete user only (keep articles/bookmarks)
  - Delete user and all associated data
- Confirmation required

**Test as User** (Impersonation - Admin only):
- Click to assume user's role temporarily
- Shows orange warning banner at top: "Testing as [username]"
- Can navigate app as that user to test permissions
- All activity logged under admin account
- **Restore Admin Button**: Return to admin role

#### Bulk Actions (Multiple Users Selected)
- **Enable Selected**: Activate multiple users
- **Disable Selected**: Deactivate multiple users
- **Change Role to**: Dropdown to set role for all selected
- **Delete Selected**: Bulk delete with confirmation

#### Add New User Button
- Opens form:
  - Email (required, unique)
  - Username (required, unique)
  - Full name (optional)
  - Role (ADMIN or USER dropdown)
  - Temporary password (auto-generated or custom)
- **Create User Button**
- **Send Welcome Email**: Checkbox to send credentials
- Success: "User created successfully. Credentials sent to [email]."

#### Search & Filter
- **Search Box**: Find by email, username, or name
- **Filter Dropdown**:
  - All users
  - Active only
  - Inactive only
  - Suspended
  - Admins only
  - Users only
- **Sort Options**:
  - By email (A-Z)
  - By creation date (newest first)
  - By last login (most recent)

---

### TAB 2: System Configuration

#### GenAI Settings
- **GenAI Provider**: Dropdown
  - OpenAI (default)
  - Ollama (local)
  - Other providers (future)
- **API Key/URL**: Config based on provider
  - OpenAI: API key field
  - Ollama: Base URL (e.g., http://localhost:11434)
  - Test button to verify connection
- **Model Selection**:
  - OpenAI: gpt-4, gpt-3.5-turbo (dropdown)
  - Ollama: llama2, neural-chat, mistral, etc. (dropdown)
  - Current selected model shown
- **Auto-Summarize Settings**:
  - Enable/disable auto-summarization by default
  - Max tokens for summary (slider: 50-200)
  - Temperature/creativity (slider: 0.0-1.0)
- **Test Summarization** (Button):
  - Sample article summary
  - Shows success/error
  - Displays tokens used

#### Database Settings
- **Database Type**: PostgreSQL (read-only)
- **Connection Status**: Connected (green) or Error (red)
- **Database Name**: Current database name
- **Backup Options**:
  - **Create Backup Button**: Immediate backup
  - **Last Backup**: Timestamp of latest backup
  - **Backup Frequency**: Auto-backup daily/weekly (dropdown)
  - **Restore from Backup**: File upload and confirm
- **Database Statistics**:
  - Total articles stored
  - Database size on disk
  - Oldest article date
  - Article retention days (editable)

#### Redis Cache
- **Cache Status**: Connected (green) or Disconnected (red)
- **Redis URL**: Connection string (editable)
- **Cache Keys Count**: Number of cached items
- **Cache Size**: Memory used (MB)
- **Clear Cache Button**: Flush all cached data (confirmation required)
- **Cache Expiration**: TTL settings per object type

#### Email Configuration
- **SMTP Server**: Host and port (editable)
- **From Address**: Sender email (editable)
- **Authentication**: Username/password fields
- **Test Email Button**: Send test email to logged-in user
- **Email Templates** (future):
  - Welcome email
  - Password reset
  - Notification digest

#### Security Settings
- **JWT Secret**: (Partially hidden, cannot view full) Change button
- **JWT Expiration**: Hours (default 24, editable)
- **Refresh Token Expiration**: Days (default 7, editable)
- **Session Timeout**: Inactive session timeout in minutes
- **Password Policy**:
  - Minimum length (dropdown: 8-12)
  - Require uppercase (toggle)
  - Require number (toggle)
  - Require special character (toggle)
  - Expiration days (0 = no expiration)
- **Rate Limiting**:
  - Login attempts per period (default 5 per 15 min)
  - API requests per minute per user

#### Logging & Monitoring
- **Log Level**: DEBUG, INFO, WARNING, ERROR (dropdown)
- **Audit Logging**: Enabled/disabled (toggle)
- **Log Retention**: Days to keep logs (dropdown)
- **View Logs Button**: Opens log viewer
- **Prometheus Metrics**: Enabled/disabled
- **Metrics URL**: http://localhost:8000/metrics (link)

---

### TAB 3: Appearance & Theming

#### Theme Management
- **Available Themes** (Grid View):
  - 6 theme cards: Daylight, Command Center, Aurora, Red Alert, Midnight, Matrix
  - Each card shows:
    - Theme name
    - Color palette preview (4 color swatches)
    - Category (Professional, Cyber Security, Premium)
    - Set as Default button
  - Click card to customize

#### Per-Theme Customization (Modal)
- **Theme Name**: Display name (editable)
- **Color Swatches** (Drag-and-drop customization):
  - Primary Color (main accent)
  - Secondary Color
  - Background Color
  - Text Primary Color
  - Text Secondary Color
  - Success/Warning/Danger colors
  - Borders, shadows, glows
- **Color Picker**: Click swatch to open color picker
- **Preview Section**: Live preview of colors in UI elements
  - Sample button
  - Sample input field
  - Sample card
  - Sample alert
- **Reset to Default Button**: Restore original theme colors
- **Save Theme Button**: Persist customization
- **Export Theme Button**: Download theme JSON for sharing

#### Terminal Mode (Hacker Style)
- **Enable Terminal Mode**: Toggle switch
  - Changes font to monospace
  - Adds green glow/scanlines effect
  - Shows code-style text
- **Scanline Opacity**: Slider to adjust effect strength

#### Neon Mode (Cyberpunk Style)
- **Enable Neon Mode**: Toggle switch
  - Adds bright color glows
  - Neon pink/cyan accents
  - Glowing borders and shadows
- **Glow Intensity**: Slider to adjust

#### Font Settings
- **Default Font**: Dropdown (Inter, Roboto, System, etc.)
- **Monospace Font**: For code/terminal (Courier New, Monaco, etc.)
- **Font Scaling**: Small, Default, Large, Extra Large
  - Preview text updates in real-time
- **Line Height**: Dropdown (1.5x, 1.8x, 2x)
- **Letter Spacing**: Adjust letter spacing

#### Accent Color Settings
- **Primary Brand Color**: Color picker (affects buttons, links, highlights)
- **Hover Behavior**: Brighten, darken, or change hue on hover
- **Active State**: How selected items appear
- **Disabled State**: How disabled elements appear

---

### TAB 4: Audit Logs

#### Audit Log Viewer

**Log Table with Columns**:
1. **Timestamp**: When action occurred
2. **User**: Who performed action (email or username)
3. **Action**: What was done (login, article_read, source_added, user_deleted, etc.)
4. **Resource**: What was affected (article_id=123, source_name="CNN", etc.)
5. **Details**: Additional info (old_value → new_value for updates)
6. **IP Address**: User's IP address
7. **Status**: Success (green), Failure (red), Warning (yellow)

**Per Log Entry**:
- Click to expand and see full details
- Copy button to copy log entry
- User avatar with role badge

#### Search & Filter Logs
- **Date Range Picker**: From date to date
- **User Filter**: Dropdown to filter by user
- **Action Filter**: Dropdown
  - All actions
  - Authentication (login, logout, password_change)
  - Articles (read, bookmark, summarize)
  - Sources (add, edit, delete, enable, disable)
  - Watchlist (keyword_add, keyword_delete)
  - Users (create, edit, delete, role_change)
  - Settings (config_change)
- **Status Filter**: All, Success, Failure, Warning
- **Search Box**: Full-text search in action/resource/details
- **Search Button**: Apply filters and search

#### Export Logs
- **Export Button**: Download filtered logs
  - Format: CSV or JSON
  - Filename: audit_logs_YYYYMMDD_HHMMSS.csv
  - Includes all visible columns

#### Log Statistics
- **Total Actions Today**: Count
- **Failed Actions**: Count (failed logins, errors)
- **Most Active User**: Username with action count
- **Most Common Action**: Top action type
- **Last Hour Activity**: Graph of activity frequency

#### Retention Settings
- **Audit Log Retention**: Days to keep logs (editable, default 365)
- **Auto-Delete Old Logs**: Toggle to enable/disable auto-cleanup
- **Delete Logs Before Date**: Button to manually purge old logs

---

## Theme System

**Location**: Top-right of NavBar

### Theme Toggle Button

**Quick Cycle Function**:
- Click emoji button to cycle through themes: Daylight → Command Center → Aurora
- Shows current theme emoji:
  - ☀️ Daylight (professional light blue)
  - 🖥️ Command Center (professional dark blue)
  - 🌙 Aurora (purple/gradient)

### Full Theme Dropdown Menu

**Access**: Click user dropdown → "Change Theme" → "Theme Settings..."

**Theme Options** (Grouped by Category):

#### Professional Themes
1. **Daylight**
   - Light background with blue accents
   - Readable, clean, professional
   - Best for daytime use
   - Primary: Light blue (#2563EB)

2. **Command Center**
   - Dark blue background
   - Professional cybersecurity aesthetic
   - Reduces eye strain
   - Primary: Cyan/teal accent

3. **Red Alert**
   - Dark background with red accents
   - Emphasizes critical information
   - Urgent/severity themed

#### Cyber Security Themes
4. **Midnight**
   - Very dark background (almost black)
   - Deep blue accents
   - Minimal light emission (night mode)

5. **Matrix**
   - Black background with bright green
   - Hacker/terminal aesthetic
   - Scanlines effect optional

#### Premium Themes
6. **Aurora**
   - Purple/pink gradient background
   - Modern, premium appearance
   - Smooth color transitions

### Theme Application

**Automatic Color Injection**:
- CSS variables applied to document root
- All components automatically update colors
- Theme persists in localStorage
- Applies on page load instantly

**Components Affected by Theme**:
- Background colors (body, cards, navbar)
- Text colors (primary, secondary, muted)
- Button colors and hover states
- Input field styling
- Border colors and shadows
- Success/warning/danger colors
- Glow effects and highlights

### Accessibility

**High Contrast Mode** (System Preference):
- Automatically increases border widths and color contrast
- Improves readability for low-vision users

**Reduced Motion Mode** (System Preference):
- Disables animations and transitions
- Reduces seizure risk
- Maintains all functionality

**Font Scaling**:
- Adjust base font size globally
- Affects all text elements proportionally
- Options: Small (0.9x), Default (1.0x), Large (1.1x), Extra Large (1.2x)

---

## API & Integration

### REST API Base URL
```
http://localhost:8000
```

### API Documentation
**Interactive Docs**: http://localhost:8000/docs (Swagger UI)
**Schema**: http://localhost:8000/openapi.json

### Key API Endpoints

#### Authentication
- `POST /auth/login` - Email/password login
- `POST /auth/register` - Create account
- `POST /auth/logout` - Logout (invalidate token)
- `POST /auth/refresh` - Refresh access token
- `POST /auth/change-password` - Change password
- `GET /auth/{provider}/login` - OAuth login (google, microsoft)
- `GET /auth/{provider}/callback` - OAuth callback handler

#### Articles
- `GET /articles/` - List articles with filters
- `GET /articles/{id}` - Get single article
- `POST /articles/{id}/read` - Mark as read
- `POST /articles/{id}/bookmark` - Bookmark article
- `POST /articles/{id}/summarize` - Generate AI summary
- `GET /articles/{id}/export/pdf` - Export to PDF

#### Sources
- `GET /sources/` - List all feed sources
- `POST /sources/` - Create new source
- `GET /sources/{id}` - Get source details
- `PUT /sources/{id}` - Update source
- `DELETE /sources/{id}` - Delete source
- `POST /sources/{id}/test` - Test feed validity
- `POST /sources/ingest` - Manually trigger ingestion

#### Watchlist (Personal)
- `GET /users/watchlist/` - List personal keywords
- `POST /users/watchlist/` - Add keyword
- `DELETE /users/watchlist/{id}` - Remove keyword
- `PATCH /users/watchlist/{id}/toggle` - Toggle active status

#### Watchlist (Global)
- `GET /watchlist/` - List global keywords (admin)
- `POST /watchlist/` - Create global keyword (admin)
- `DELETE /watchlist/{id}` - Remove keyword (admin)
- `PUT /watchlist/{id}` - Update keyword (admin)

#### User Management
- `GET /users/me` - Current user info
- `GET /users/` - List all users (admin only)
- `POST /users/` - Create user (admin)
- `GET /users/{id}` - Get user details
- `PUT /users/{id}` - Update user (admin)
- `DELETE /users/{id}` - Delete user (admin)
- `POST /users/{id}/switch-role` - Assume user role (admin testing)

#### Admin/Settings
- `GET /admin/config` - System configuration
- `PUT /admin/config` - Update configuration
- `GET /admin/stats` - System statistics
- `GET /health` - Health check
- `GET /metrics` - Prometheus metrics

### Authentication

**JWT Token Header**:
```
Authorization: Bearer <access_token>
```

**Token Structure**:
- Issuer: Joti
- Subject: User ID
- Expiration: 24 hours
- Type: HS256 signed

**Refresh Token**:
- Longer expiration (7 days)
- Used to obtain new access token
- Single-use (rotates on each refresh)

### Response Format

**Success Response** (200 OK):
```json
{
  "data": { /* ... */ },
  "status": "success",
  "timestamp": "2026-02-07T10:30:00Z"
}
```

**Error Response** (4xx/5xx):
```json
{
  "detail": "Error message",
  "status": "error",
  "error_code": "RESOURCE_NOT_FOUND"
}
```

### Rate Limiting
- **Default**: 100 requests per minute per IP
- **Auth endpoints**: 5 login attempts per 15 minutes
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`

### CORS
- **Allowed Origins**: http://localhost:3000 (configurable in `.env`)
- **Allowed Methods**: GET, POST, PUT, DELETE, PATCH, OPTIONS
- **Allowed Headers**: Authorization, Content-Type

### Webhooks (Future)
- Article ingestion events
- User actions (login, bookmark)
- System alerts (feed errors, quota exceeded)

---

## Getting Started as a User

1. **Sign Up**
   - Go to http://localhost:3000/login
   - Click "Create Account" or use OAuth
   - Verify email (if configured)
   - Auto-subscribe to admin-set default feeds

2. **First Login**
   - View News & Feeds page with articles from default sources
   - Add personal watchlist keywords (Watchlist tab)
   - Add your own RSS feeds (Profile or Sources if admin)

3. **Read & Save**
   - Click articles to read full content
   - Bookmark favorites (star icon)
   - Summarize long articles (AI summary)
   - Export articles to PDF

4. **Customize**
   - Set theme (click emoji in navbar)
   - Adjust font size (user dropdown)
   - Configure 2FA (Profile → Security)
   - Set notification preferences

---

## Getting Started as an Admin

1. **Login with Admin Account**
   - Email: admin@huntsphere.local or your admin account

2. **Manage Sources**
   - Go to /sources
   - Add RSS/Atom feeds
   - Mark important feeds as default for new users
   - Test feed connectivity

3. **Set Global Watchlist**
   - Go to /watchlist → Global Watchlist tab
   - Add critical keywords (CVE patterns, threat names, etc.)
   - Set severity levels (Critical, High, Medium, Low)

4. **Manage Users**
   - Go to /admin → User Management
   - Create accounts for team members
   - Assign roles (ADMIN or USER)
   - Reset passwords as needed

5. **Configure System**
   - Go to /admin → System Configuration
   - Set up OpenAI/Ollama for article summarization
   - Configure database backups
   - Adjust security settings

6. **Monitor Activity**
   - Go to /admin → Audit Logs
   - Review user actions
   - Export logs for compliance
   - Monitor failed login attempts

---

## Support & Feedback

**Issues**: Report bugs at [GitHub Issues Link]
**Feedback**: Feature requests at [GitHub Discussions Link]
**Documentation**: Full docs at `/docs` or [Docs URL]
**Email Support**: support@joti.example

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Feb 7, 2026 | Initial Joti release with news feeds, watchlist, RBAC |
| 0.9 | Jan 30, 2026 | Beta testing, theme system, OAuth integration |
| 0.1 | Jan 1, 2026 | Proof of concept, basic feed ingestion |

---

**Last Updated**: February 7, 2026
**Maintained By**: Joti Development Team
**License**: MIT
