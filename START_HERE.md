# START HERE - Study Tracker Deployment

## What You Have

A complete **Study Tracker** app ready to deploy to Coolify with persistent data storage.

---

## Current Status

**Right Now:** App works with localStorage (open `study-tracker.html` in browser)

**Ready to Deploy:** Complete backend server for Coolify deployment

---

## 3-Step Deployment Process

### Step 1: GitHub (15-20 minutes)
📖 **Read:** `GITHUB_SETUP.md`

**What you'll do:**
1. Create GitHub account
2. Create repository
3. Push your code

**Quick commands:**
```bash
cd /Users/liam/Documents/Cursor/Studytracker
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/studytracker.git
git push -u origin main
```

### Step 2: Coolify (15-20 minutes)
📖 **Read:** `COOLIFY_SETUP.md`

**What you'll do:**
1. Create application in Coolify
2. Connect to GitHub
3. Set environment variables
4. **Add persistent volume at `/data`** ← Critical!
5. Deploy

**Environment variables needed:**
- `NODE_ENV=production`
- `PORT=3000`
- `JWT_SECRET=<random-64-char-string>`
- `DATABASE_PATH=/data/studytracker.db`

**Persistent storage:**
- Mount path: `/data`
- Size: 1GB minimum

### Step 3: Auto-Deploy (5 minutes)
📖 **Read:** `COOLIFY_SETUP.md` Part 3

**What you'll do:**
1. Enable webhook in Coolify
2. Add webhook to GitHub
3. Every push auto-deploys!

---

## Key Files

| File | Purpose |
|------|---------|
| `START_HERE.md` | This file - where to begin |
| `GITHUB_SETUP.md` | Detailed GitHub setup guide |
| `COOLIFY_SETUP.md` | Detailed Coolify deployment guide |
| `DEPLOYMENT_COMPLETE_GUIDE.md` | Master guide with all steps |
| `study-tracker.html` | Open this to use app locally |

---

## Data Persistence - How It Works

### Without Persistent Volume (BAD)
```
Deploy 1: Create account → Add sessions → Deploy
Deploy 2: Login → Data gone! ❌
```

### With Persistent Volume (GOOD)
```
Deploy 1: Create account → Add sessions → Deploy
Deploy 2: Login → All data still there! ✅
Deploy 3: Add more sessions → Deploy
Deploy 4: Login → Everything still there! ✅
```

**Key:** Database must be in `/data` (persistent volume)

---

## Quick Start Commands

### Option A: Use Locally Now
```bash
open study-tracker.html
```

### Option B: Deploy to Coolify

**1. Push to GitHub:**
```bash
cd /Users/liam/Documents/Cursor/Studytracker
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/studytracker.git
git push -u origin main
```

**2. Deploy in Coolify:**
- Follow `COOLIFY_SETUP.md`
- Don't forget persistent volume!

**3. Verify data persists:**
- Create account
- Add sessions
- Redeploy
- Data should still be there!

---

## Making Updates Later

```bash
# 1. Make changes to your code
# 2. Commit and push
git add .
git commit -m "Description of changes"
git push

# 3. Coolify auto-deploys (if webhook enabled)
# 4. Your data persists! ✅
```

---

## Critical Checklist for Coolify

Before deploying, ensure:

- [ ] GitHub repository created and code pushed
- [ ] Coolify application created
- [ ] Environment variables set (all 4)
- [ ] **Persistent volume mounted at `/data`** ← Most important!
- [ ] Port set to 3000
- [ ] Deployed successfully
- [ ] Can create account
- [ ] Can login
- [ ] Data persists after page refresh
- [ ] **Data persists after redeployment** ← Test this!

---

## Where to Get Help

1. **GitHub issues:** Check `GITHUB_SETUP.md` troubleshooting section
2. **Coolify issues:** Check `COOLIFY_SETUP.md` troubleshooting section
3. **General questions:** See `DEPLOYMENT_COMPLETE_GUIDE.md`

---

## What Each Guide Covers

| Guide | What It Teaches | Time Needed |
|-------|----------------|-------------|
| `GITHUB_SETUP.md` | Create account, push code | 15-20 min |
| `COOLIFY_SETUP.md` | Deploy with persistent data | 15-20 min |
| `DEPLOYMENT_COMPLETE_GUIDE.md` | Everything in one place | 30-45 min |

---

## Ready to Deploy?

1. **First time?** Read `GITHUB_SETUP.md` then `COOLIFY_SETUP.md`
2. **Need overview?** Read `DEPLOYMENT_COMPLETE_GUIDE.md`
3. **Just want commands?** Use Quick Start Commands above

---

## Your Next Step

👉 **Start with:** `GITHUB_SETUP.md`

Or if you just want to use it locally right now:
```bash
open study-tracker.html
```

Good luck! 🚀
