# Cursor IDE Setup Instructions for JOTI
**Date:** February 8, 2026
**Status:** ✅ READY TO CONFIGURE

---

## 🎯 Quick Setup (3 Steps)

### Step 1: Close Cursor Completely
- Close all Cursor windows
- Click X to exit the application completely

### Step 2: Open Cursor with Correct Folder
```bash
# Open terminal/cmd in this directory:
cd C:\Projects\Joti

# Then open Cursor with this folder:
cursor .
```

Or:
- Open Cursor
- Click "File" → "Open Folder"
- Navigate to: `C:\Projects\Joti`
- Click "Select Folder"

### Step 3: Verify Git Connection
In Cursor terminal (Ctrl + `):
```bash
git remote -v
# Should show:
# origin    https://github.com/labhacker007/Joti.git (fetch)
# origin    https://github.com/labhacker007/Joti.git (push)
```

**Done! Cursor is now properly configured.** ✅

---

## 🔧 Detailed Setup Steps

### Setting Up Workspace in Cursor

#### Option A: Use Workspace File (Recommended)
1. In Cursor, click **File** → **Open Workspace from File**
2. Navigate to: `C:\Projects\Joti\joti.code-workspace`
3. Click "Open"
4. Cursor will configure automatically with all settings

#### Option B: Open Folder Directly
1. Click **File** → **Open Folder**
2. Navigate to: `C:\Projects\Joti`
3. Click "Select Folder"
4. Cursor will detect git and configure

#### Option C: Command Line
```bash
cd C:\Projects\Joti
cursor .
```

---

## ✅ Verification Checklist

After opening Cursor, verify everything is working:

### Git Integration
- [ ] Source Control icon (left sidebar) shows activity
- [ ] Shows "joti-clean-release" branch
- [ ] No red "X" icons indicating errors
- [ ] GitHub icon shows connected status

### Folder Structure
- [ ] Left sidebar shows: frontend/, backend/, docker-compose.yml, etc.
- [ ] No "Parshu" folder reference
- [ ] Can see all project files

### Terminal
- [ ] Terminal opens in `C:\Projects\Joti` by default
- [ ] Run `git status` - should show "On branch joti-clean-release"
- [ ] Run `git remote -v` - should show Joti repository

### Extensions
- [ ] Python extension installed (for backend)
- [ ] ESLint installed (for frontend)
- [ ] Prettier installed (for formatting)

---

## 🐛 Fixing Remote Repository Error

If you see: *"An error occurred while setting up Remote Repository"*

**Fix:**
1. Click "Cancel" on the error dialog
2. This is just a notification - git still works fine
3. You can ignore this error
4. Git integration will work normally

The error appears because Cursor tries to load a remote extension that's not needed for our setup. It doesn't affect git functionality.

---

## 🔌 Git Configuration

Your git is already configured correctly:

```
Remote Name:  origin
URL:          https://github.com/labhacker007/Joti.git
Branch:       joti-clean-release
Status:       ✅ Connected to GitHub
```

No additional configuration needed!

---

## 📋 Troubleshooting

### Problem: Cursor still shows error on startup
**Solution:**
- This is just a notification, safe to ignore
- Your git will work perfectly fine
- Error: "ms-vscode.remote-repositories cannot be installed"
- This is not needed for your setup

### Problem: Git not showing in sidebar
**Solution:**
1. Close Cursor completely
2. Delete `.vscode` folder in `C:\Projects\Joti`
3. Reopen Cursor
4. Git will initialize automatically

### Problem: Wrong branch or folder
**Solution:**
1. Verify you're in `C:\Projects\Joti`
2. Check terminal shows correct path
3. Run `git branch --show-current`
4. Should show: `joti-clean-release`

### Problem: Can't see GitHub remote
**Solution:**
```bash
# Verify remote is set
git remote -v

# Should show:
# origin    https://github.com/labhacker007/Joti.git (fetch)
# origin    https://github.com/labhacker007/Joti.git (push)

# If missing, add it:
git remote add origin https://github.com/labhacker007/Joti.git
```

---

## 📂 Folder Structure Verification

When you open `C:\Projects\Joti` in Cursor, you should see:

```
JOTI (folder icon)
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
├── backend/
│   ├── app/
│   └── requirements.txt
├── docker-compose.yml
├── docker-compose.dev.yml
├── .env
├── .git/
├── .gitignore
├── .cursorignore
├── joti.code-workspace
└── [Documentation files]
```

**NOT:**
```
Parshu/
Documents/
OneDrive/
```

---

## 🚀 Using Cursor with JOTI

### Git Operations
- **Source Control** (Ctrl + Shift + G) - View changes, commit, push
- **Git Graph** - View commit history
- **GitHub** - Integrated GitHub support

### Terminals
- **New Terminal** (Ctrl + `) - Opens in project root
- **Run Docker** - `docker-compose up -d`
- **Pull Changes** - `git pull origin joti-clean-release`

### Development
- **Frontend** - Edit files in `frontend/src/`
- **Backend** - Edit files in `backend/app/`
- **Themes** - Edit `frontend/src/themes/index.js` and `frontend/src/styles/kimi-theme.css`

### File Tree Navigation
- Click folders to expand
- Double-click files to open
- Right-click for context menu (rename, delete, etc.)

---

## 💡 Pro Tips

### Use Workspace File
Instead of opening folder each time, use:
```bash
# Open with workspace settings:
cursor joti.code-workspace
```

This loads all settings automatically!

### Quick Terminal
```
Ctrl + ` = Open/Close Terminal
```

### Quick Git
```
Ctrl + Shift + G = Open Source Control panel
```

### View File Diff
- Click file in Source Control
- Shows changes before commit

---

## ✨ Final Status

After following these steps:

✅ **Cursor is properly configured**
✅ **Git connected to GitHub Joti repo**
✅ **Folder structure correct (C:\Projects\Joti)**
✅ **Ready to develop and commit changes**
✅ **All changes auto-sync to GitHub**

---

## 📞 Need Help?

If something is wrong:

1. **Git not working?**
   ```bash
   git remote -v
   git status
   git branch --show-current
   ```

2. **Wrong folder?**
   Check: `pwd` should show `/c/Projects/Joti`

3. **GitHub not connecting?**
   It's working - the error notification is just a non-critical extension issue

4. **Lost changes?**
   ```bash
   git log --oneline -5  # See all commits
   git diff             # See unstaged changes
   ```

---

## 🎯 You're Ready!

Your Cursor IDE is now properly configured to work with JOTI and GitHub.

- **Work Location:** `C:\Projects\Joti`
- **GitHub Repo:** https://github.com/labhacker007/Joti.git
- **Branch:** joti-clean-release
- **Status:** ✅ READY

Start developing! 🚀
