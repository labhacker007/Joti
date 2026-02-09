# Workspace Setup Guide - Remove Parshu, Use Joti
**Date:** February 8, 2026
**Status:** ✅ CORRECTED

---

## ✅ Correct Working Directory

### Your Project Lives Here
```
C:\Projects\Joti
├── frontend/
├── backend/
├── docker-compose.yml
├── .env
└── [All your code]
```

### GitHub Repository
```
URL:    https://github.com/labhacker007/Joti.git
Branch: joti-clean-release
Status: ✅ ACTIVE AND SYNCED
```

---

## ❌ Remove Old Parshu Reference

### The Old Folder (DO NOT USE)
```
C:\Users\tarun\OneDrive\Master\Tarun\Documents\Pulser\Parshu
├── .claude/
└── [EMPTY - OLD PROJECT]
```

### Why It Exists
This is a remnant from previous project setup. It's not needed and can confuse your IDE.

### How to Remove It (Optional)
```bash
# OPTIONAL: Remove the old Parshu folder
Remove-Item -Path "C:\Users\tarun\OneDrive\Master\Tarun\Documents\Pulser\Parshu" -Force -Recurse

# Or in Windows Explorer:
# 1. Navigate to C:\Users\tarun\OneDrive\Master\Tarun\Documents\Pulser\
# 2. Right-click Parshu folder
# 3. Select Delete
```

---

## 🔧 Configure Your IDE (VSCode/Cursor)

### Method 1: Update Workspace Settings

**In VSCode/Cursor:**

1. **Close any open workspace**
   - File → Close Folder (or Close Workspace)

2. **Open the correct folder**
   - File → Open Folder
   - Navigate to: `C:\Projects\Joti`
   - Click "Select Folder"

3. **Verify Git Integration**
   - Open Terminal (Ctrl + `)
   - Run: `git remote -v`
   - Should show: `origin → https://github.com/labhacker007/Joti.git`

### Method 2: Update Cursor Settings

**If using Cursor IDE:**

1. **Edit .cursor config (if exists)**
   ```json
   {
     "workspaceFolder": "C:\\Projects\\Joti",
     "git": {
       "remote": "origin",
       "branch": "joti-clean-release"
     }
   }
   ```

2. **Or use command line to open Cursor**
   ```bash
   cd C:\Projects\Joti
   cursor .
   ```

### Method 3: VSCode Workspace File

**Create a workspace file:**

1. **File → Save Workspace As**
2. **Save as:** `joti-workspace.code-workspace`
3. **Content:**
   ```json
   {
     "folders": [
       {
         "path": "C:\\Projects\\Joti"
       }
     ],
     "settings": {
       "git.enabled": true,
       "git.defaultCloneDirectory": "C:\\Projects",
       "git.ignoreLimitWarning": false
     }
   }
   ```

4. **Future opens:** File → Open Workspace from File → joti-workspace.code-workspace

---

## ✅ Verify Correct Setup

### Check Git Configuration
```bash
cd C:\Projects\Joti
git remote -v
# Should show:
# origin    https://github.com/labhacker007/Joti.git (fetch)
# origin    https://github.com/labhacker007/Joti.git (push)
```

### Check Current Branch
```bash
git branch --show-current
# Should show: joti-clean-release
```

### Check Latest Commits
```bash
git log --oneline -3
# Should show recent Kimi theme commits
```

### View File Structure
```bash
ls -la
# Should show:
# frontend/
# backend/
# docker-compose.yml
# .env
# [documentation files]
```

---

## 🚀 Quick Start from Correct Location

### Terminal Setup
```bash
# 1. Navigate to correct folder
cd C:\Projects\Joti

# 2. Verify git remote
git remote -v

# 3. Pull latest code
git pull origin joti-clean-release

# 4. Start Docker
docker-compose up -d

# 5. Access application
# Frontend:  http://localhost:3000
# Backend:   http://localhost:8000
```

---

## 📋 IDE Integration Checklist

- [ ] VSCode/Cursor is pointing to `C:\Projects\Joti`
- [ ] Git shows correct remote (github.com/labhacker007/Joti.git)
- [ ] Current branch is `joti-clean-release`
- [ ] Terminal opens in correct directory
- [ ] File explorer shows frontend/ and backend/ folders
- [ ] Git icon shows branch and sync status
- [ ] Latest commits visible in Source Control

---

## 🔗 Git Commands Reference

### Clone (if starting fresh)
```bash
git clone https://github.com/labhacker007/Joti.git
cd Joti
git checkout joti-clean-release
```

### Pull Latest Changes
```bash
git pull origin joti-clean-release
```

### Commit and Push
```bash
# Make changes, then:
git add .
git commit -m "your message"
git push origin joti-clean-release
```

### Check Status
```bash
git status
git log --oneline -5
git remote -v
```

---

## ⚠️ Common Issues & Fixes

### Issue: Still seeing Parshu in workspace
**Fix:**
1. Close VSCode/Cursor completely
2. Delete `C:\Users\tarun\OneDrive\Master\Tarun\Documents\Pulser\Parshu` folder
3. Reopen VSCode/Cursor and open `C:\Projects\Joti`

### Issue: Git showing wrong remote
**Fix:**
```bash
cd C:\Projects\Joti
git remote remove origin
git remote add origin https://github.com/labhacker007/Joti.git
git branch -u origin/joti-clean-release
```

### Issue: Terminal not in right folder
**Fix:**
1. View → Terminal (or Ctrl + `)
2. Terminal should show: `C:\Projects\Joti>`
3. If not, click the folder icon and select `C:\Projects\Joti`

### Issue: Can't see GitHub remote
**Fix:**
```bash
# Check remotes
git remote -v

# If missing, add it:
git remote add origin https://github.com/labhacker007/Joti.git

# Verify:
git remote -v
# Should show both origin and joti pointing to Joti repo
```

---

## 📂 Your Project Structure

```
C:\Projects\Joti/                          ← USE THIS FOLDER
├── frontend/
│   ├── src/
│   │   ├── themes/
│   │   │   └── index.js (with Kimi theme)
│   │   ├── styles/
│   │   │   └── kimi-theme.css (NEW)
│   │   ├── components/
│   │   │   └── NavBar.js (updated with Kimi)
│   │   ├── pages/
│   │   │   └── Login.js (updated with Kimi)
│   │   └── App.js (imports kimi-theme.css)
│   └── package.json
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   └── rate_limit.py (updated: 5→30 req/min)
│   │   └── [API endpoints, models, etc.]
│   └── requirements.txt
├── docker-compose.yml
├── .env
├── .git/
│   └── config (remotes point to Joti repo)
└── [Documentation files]
```

---

## ✨ Summary

### ✅ What's Correct
- **Location:** `C:\Projects\Joti`
- **Remote:** `https://github.com/labhacker007/Joti.git`
- **Branch:** `joti-clean-release`
- **Code:** All features, Kimi theme, rate limit fix
- **GitHub:** All commits pushed and synced

### ❌ What to Ignore/Remove
- **Old Folder:** `C:\Users\tarun\OneDrive\Master\Tarun\Documents\Pulser\Parshu`
- **Reason:** Legacy project, no longer used
- **Action:** Can safely delete

### 🎯 Next Steps
1. Open IDE pointing to `C:\Projects\Joti`
2. Verify git remote shows Joti repo
3. Start developing or testing the application
4. All commits automatically go to GitHub

---

**Status:** ✅ **WORKSPACE CORRECTLY CONFIGURED**
**Working Directory:** C:\Projects\Joti
**GitHub Repository:** https://github.com/labhacker007/Joti.git
**Ready to Use:** YES
