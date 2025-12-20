# Complete Deployment Guide - GitHub to Coolify

**From Zero to Deployed in 3 Parts**

This master guide walks you through the entire process of deploying Study Tracker from your local machine to a live Coolify server.

---

## Overview

**What you'll do:**
1. Create GitHub account and push code
2. Deploy to Coolify with persistent data
3. Set up automatic deployments

**Time needed:** 30-45 minutes (first time)

**What you'll have:** A live Study Tracker app accessible from anywhere, with data that persists across deployments.

---

## Part 1: GitHub Setup (15-20 minutes)

Follow the detailed guide: **`GITHUB_SETUP.md`**

**Quick summary:**
1. Create GitHub account at github.com
2. Create new repository called `studytracker`
3. Install Git on your computer
4. Configure Git with your name and email
5. Push your code to GitHub

**Commands to run:**
```bash
cd /Users/liam/Documents/Cursor/Studytracker
git init
git add .
git commit -m "Initial commit: Study Tracker ready for Coolify"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/studytracker.git
git push -u origin main
```

**Verify:** Go to `https://github.com/YOUR_USERNAME/studytracker` and see your files.

---

## Part 2: Coolify Deployment (15-20 minutes)

Follow the detailed guide: **`COOLIFY_SETUP.md`**

**Quick summary:**

### 2.1 Create Application
1. Log into Coolify
2. Create new application
3. Connect to GitHub repository
4. Select branch `main`

### 2.2 Configure Build
- Build pack: Node.js
- Port: 3000
- Start command: `npm start`

### 2.3 Set Environment Variables
```env
NODE_ENV=production
PORT=3000
JWT_SECRET=<generate-with-command-below>
DATABASE_PATH=/data/studytracker.db
```

**Generate JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 2.4 Add Persistent Volume (CRITICAL!)
- Name: `studytracker-data`
- Mount path: `/data`
- Size: 1GB

### 2.5 Deploy
Click "Deploy" and wait 2-5 minutes.

**Verify:** Visit your Coolify URL and create an account.

---

## Part 3: Enable Auto-Deploy (5 minutes)

### 3.1 In Coolify
1. Enable "Auto Deploy" or "Deploy on Push"
2. Copy the webhook URL

### 3.2 In GitHub
1. Go to repository Settings → Webhooks
2. Add webhook with Coolify's URL
3. Select "Just the push event"
4. Save

**Verify:** Make a small change, push to GitHub, and watch Coolify auto-deploy.

---

## Testing Data Persistence

After deployment, verify data persists:

### Test 1: Create Data
1. Visit your app
2. Create an account
3. Log a few study sessions
4. Note what you created

### Test 2: Refresh Page
1. Refresh your browser
2. Log in again
3. Data should still be there ✅

### Test 3: Redeploy
1. Make a small change locally (e.g., edit README.md)
2. Push to GitHub:
   ```bash
   git add .
   git commit -m "Test deployment"
   git push
   ```
3. Wait for Coolify to redeploy
4. Visit app and log in
5. **Your old data should still be there!** ✅

If data persists through Test 3, you're all set! 🎉

---

## Making Updates

### Workflow for Code Changes

1. **Edit code locally**
   ```bash
   cd /Users/liam/Documents/Cursor/Studytracker
   # Make your changes...
   ```

2. **Test locally** (optional)
   ```bash
   npm run dev
   # Visit http://localhost:3000
   ```

3. **Commit and push**
   ```bash
   git add .
   git commit -m "Describe what you changed"
   git push
   ```

4. **Coolify auto-deploys** (if webhook enabled)
   - Watch build logs in Coolify
   - Wait for deployment to complete
   - Visit your app - changes are live!

5. **Verify data persists**
   - Log in
   - Your old data should still be there ✅

---

## Important Files Reference

### In Your Project

```
studytracker/
├── study-tracker.html          # Frontend (currently localStorage mode)
├── server/                     # Backend for Coolify
├── Dockerfile                  # Container configuration
├── package.json                # Dependencies
├── .env.example                # Environment template
├── .gitignore                  # Prevents committing secrets
└── Guides:
    ├── GITHUB_SETUP.md         # GitHub account & push guide
    ├── COOLIFY_SETUP.md        # Coolify deployment guide
    └── DEPLOYMENT_COMPLETE_GUIDE.md  # This file
```

### Critical Files

**DO commit:**
- ✅ `*.html`, `*.js`, `*.css` (your code)
- ✅ `package.json`
- ✅ `Dockerfile`
- ✅ `.env.example`
- ✅ `.gitignore`

**DON'T commit:**
- ❌ `.env` (contains secrets)
- ❌ `node_modules/` (dependencies)
- ❌ `*.db` (database files)

The `.gitignore` file already prevents these from being committed.

---

## Environment Variables Explained

| Variable | Value | Purpose |
|----------|-------|---------|
| `NODE_ENV` | `production` | Tells app it's in production mode |
| `PORT` | `3000` | Port the server listens on |
| `JWT_SECRET` | Random 64-char string | Encrypts authentication tokens |
| `DATABASE_PATH` | `/data/studytracker.db` | Where database file is stored |

**Why `/data`?**
- This is a persistent volume in Coolify
- Data here survives deployments
- If you use a different path, data will be lost on redeploy!

---

## Persistent Storage Explained

### How It Works

1. **Docker Container** (temporary):
   - Contains your app code
   - Destroyed and rebuilt on each deployment
   - Any data inside is lost

2. **Persistent Volume** (permanent):
   - Mounted at `/data` in the container
   - Survives container destruction
   - Your database lives here

### Configuration

**In Dockerfile:**
```dockerfile
ENV DATABASE_PATH=/data/studytracker.db
```

**In Coolify:**
- Volume mount path: `/data`
- This creates a permanent storage location

**Result:** Database at `/data/studytracker.db` persists forever!

---

## Troubleshooting Guide

### Data Not Persisting

**Symptoms:** Data disappears after deployment

**Checklist:**
- [ ] Persistent volume mounted at `/data` in Coolify
- [ ] `DATABASE_PATH=/data/studytracker.db` environment variable set
- [ ] Volume is not recreated on each deploy (check Coolify settings)

**Fix:**
1. In Coolify, go to Storages tab
2. Verify mount path is exactly `/data`
3. Redeploy application

### Can't Push to GitHub

**Symptoms:** "Permission denied" or "Authentication failed"

**Fix:**
1. Create Personal Access Token (see GITHUB_SETUP.md Part 6)
2. Use token as password when pushing
3. Save credentials: `git config --global credential.helper store`

### Coolify Build Fails

**Symptoms:** Deployment fails, build errors

**Common causes:**
- Missing `package.json`
- Wrong build commands
- Node.js version mismatch

**Fix:**
1. Check build logs in Coolify
2. Verify `package.json` exists
3. Ensure start command is `npm start`
4. Try rebuilding without cache

### Login/Signup Not Working

**Symptoms:** Can't create account or log in

**Checklist:**
- [ ] `JWT_SECRET` environment variable is set
- [ ] Database file exists at `/data/studytracker.db`
- [ ] No errors in Coolify logs

**Fix:**
1. Check application logs in Coolify
2. Verify `JWT_SECRET` is at least 32 characters
3. Test health endpoint: `https://your-app.com/api/health`

---

## Commands Cheat Sheet

### Git Commands
```bash
# Check status
git status

# Add all changes
git add .

# Commit with message
git commit -m "Your message"

# Push to GitHub
git push

# View commit history
git log --oneline

# Undo last commit (keep changes)
git reset --soft HEAD~1
```

### NPM Commands (for local testing)
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start

# Initialize database
npm run migrate
```

### Generate JWT Secret
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Security Checklist

Before going live, verify:

- [ ] Strong `JWT_SECRET` generated (64+ characters)
- [ ] `.env` file is NOT committed to GitHub
- [ ] `NODE_ENV=production` in Coolify
- [ ] HTTPS enabled (Coolify does this automatically)
- [ ] Database in persistent volume
- [ ] No sensitive data in code comments
- [ ] Personal Access Token not shared

---

## Scaling & Performance

### Current Setup Handles:
- 1-100 concurrent users
- Thousands of study sessions
- 1GB of data

### To Scale Up:

**Increase Storage:**
1. In Coolify, modify volume size
2. Increase from 1GB → 5GB or more

**Optimize Performance:**
1. Add database indexes (already done)
2. Implement caching if needed
3. Monitor resource usage in Coolify

**Migrate to PostgreSQL** (future):
1. More suitable for heavy traffic
2. Better for multiple containers
3. Easier backups and replication

---

## Monitoring Your App

### Health Check
Visit: `https://your-app.com/api/health`

Expected response:
```json
{"status":"ok","message":"Study Tracker API is running"}
```

### View Logs
1. In Coolify dashboard
2. Click on your application
3. Go to "Logs" tab
4. View real-time logs

### Resource Usage
Monitor in Coolify:
- CPU usage
- Memory usage
- Storage usage

---

## Next Steps

After successful deployment:

1. **Test thoroughly:**
   - Create multiple accounts
   - Log study sessions
   - Use planner
   - Test Notion integration (if configured)

2. **Make it yours:**
   - Customize subjects
   - Adjust timer presets
   - Modify styling

3. **Add features:**
   - Export data to CSV
   - Study statistics
   - Goals and streaks
   - Mobile responsiveness

4. **Share:**
   - Share URL with friends
   - Get feedback
   - Iterate and improve

---

## Summary: What You've Accomplished

✅ Set up GitHub account and repository
✅ Pushed code to GitHub
✅ Deployed to Coolify with Docker
✅ Configured persistent data storage
✅ Set up automatic deployments
✅ Secured with JWT authentication
✅ Enabled HTTPS (via Coolify)
✅ Created a production-ready app!

**Your Study Tracker is now live and accessible from anywhere!** 🚀

---

## Quick Reference URLs

| What | URL |
|------|-----|
| GitHub | https://github.com |
| Your Repository | https://github.com/YOUR_USERNAME/studytracker |
| Coolify Dashboard | Your Coolify instance URL |
| Your Live App | Coolify provides this after deployment |
| API Health Check | https://your-app.com/api/health |

---

## Support & Resources

- **GitHub Docs**: https://docs.github.com
- **Coolify Docs**: https://coolify.io/docs
- **Node.js Docs**: https://nodejs.org/docs

Need help? Check the troubleshooting sections in:
- `GITHUB_SETUP.md`
- `COOLIFY_SETUP.md`

Happy studying! 📚
