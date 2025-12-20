# Coolify Setup Guide - Complete Step-by-Step

This guide shows you how to deploy Study Tracker to Coolify with **persistent data** that survives deployments.

## Prerequisites

- GitHub account created ✅
- Code pushed to GitHub ✅
- Access to a Coolify instance (self-hosted or cloud)

---

## Part 1: Deploy to Coolify

### Step 1: Access Your Coolify Dashboard

1. Go to your Coolify instance URL (e.g., `https://coolify.yourdomain.com`)
2. Log in with your credentials

### Step 2: Create a New Project (Optional)

1. Click **"Projects"** in the sidebar
2. Click **"+ New Project"**
3. Enter project name: **"Study Tracker"**
4. Click **"Create"**

### Step 3: Add New Application

1. In your project, click **"+ New Resource"**
2. Select **"Public Repository"**
3. Configure the repository:
   - **Git Source**: Select **GitHub**
   - **Repository URL**: `https://github.com/YOUR_USERNAME/studytracker`
   - **Branch**: `main`
   - Click **"Continue"**

### Step 4: Configure Build Settings

1. **Build Pack**: Should auto-detect as **Node.js** (if not, select it manually)
2. **Port**: `3000`
3. **Install Command**: `npm install`
4. **Build Command**: Leave empty (not needed)
5. **Start Command**: `npm start`

### Step 5: Set Environment Variables

Click on **"Environment Variables"** tab and add these:

| Variable Name | Value | Notes |
|---------------|-------|-------|
| `NODE_ENV` | `production` | Required |
| `PORT` | `3000` | Required |
| `JWT_SECRET` | `<generate-random-secret>` | See below ⬇️ |
| `DATABASE_PATH` | `/data/studytracker.db` | Critical for persistence! |

**To generate JWT_SECRET** (run locally):
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the output and paste it as `JWT_SECRET` value.

### Step 6: Configure Persistent Storage (CRITICAL!)

This ensures your database survives deployments and container restarts.

1. Click on **"Storages"** or **"Volumes"** tab
2. Click **"+ Add Storage"** or **"+ New Volume"**
3. Configure the volume:
   - **Name**: `studytracker-data` (or any name)
   - **Mount Path**: `/data` (MUST match DATABASE_PATH)
   - **Host Path**: Leave default or specify custom path
   - **Size**: 1GB (or more if needed)
4. Click **"Add"** or **"Create"**

**Important**: The mount path `/data` must match the directory in `DATABASE_PATH`!

### Step 7: Configure Domain (Optional)

1. Go to **"Domains"** tab
2. Add your domain:
   - **Domain**: `studytracker.yourdomain.com`
   - OR use Coolify's generated domain
3. Coolify will automatically provision SSL with Let's Encrypt

### Step 8: Deploy!

1. Click **"Deploy"** button (usually top right)
2. Watch the build logs in real-time
3. Wait for deployment to complete (usually 2-5 minutes)

### Step 9: Verify Deployment

1. Once deployed, click on the application URL
2. You should see the Study Tracker login page
3. Create a test account and log in
4. Add a study session
5. Refresh the page - data should persist!

---

## Part 2: Verify Data Persistence

### Test 1: Page Refresh
1. Log in and add some study sessions
2. Refresh the browser
3. Data should still be there ✅

### Test 2: Container Restart
1. In Coolify, restart the application
2. Wait for it to come back online
3. Log in - your data should still be there ✅

### Test 3: New Deployment
1. Make a small change to your code (e.g., update README)
2. Push to GitHub:
   ```bash
   git add .
   git commit -m "Test deployment"
   git push
   ```
3. Coolify will auto-deploy (if enabled) or manually deploy
4. After deployment, log in - **all your old data should still be there** ✅

---

## Part 3: Enable Auto-Deploy (Optional)

Make deployments automatic on every push to GitHub.

### Step 1: Enable Webhook in Coolify

1. In your application settings, find **"Webhooks"** or **"Git Settings"**
2. Enable **"Auto Deploy"** or **"Deploy on Push"**
3. Copy the webhook URL shown

### Step 2: Add Webhook to GitHub

1. Go to your GitHub repository
2. Click **"Settings"** (repository settings, not account)
3. Click **"Webhooks"** in the left sidebar
4. Click **"Add webhook"**
5. Configure:
   - **Payload URL**: Paste the Coolify webhook URL
   - **Content type**: `application/json`
   - **Secret**: Leave empty (or use if Coolify provides one)
   - **Events**: Select "Just the push event"
   - Check **"Active"**
6. Click **"Add webhook"**

Now every `git push` to `main` will trigger automatic deployment!

---

## Part 4: Monitoring & Maintenance

### View Logs

1. In Coolify, go to your application
2. Click **"Logs"** tab
3. View real-time application logs
4. Look for errors or issues

### Check Application Health

Visit the health endpoint:
```
https://your-domain.com/api/health
```

Should return:
```json
{"status":"ok","message":"Study Tracker API is running"}
```

### Database Backup Strategy

Since your database is in a persistent volume, you can back it up:

**Option 1: Manual Backup via Coolify**
1. Some Coolify setups allow you to access the server
2. Copy `/data/studytracker.db` to a backup location

**Option 2: Automated Backup Script** (Advanced)
Add to your Dockerfile or create a separate backup service.

### Monitor Resource Usage

In Coolify dashboard:
- **Memory**: Should stay under 512MB for small usage
- **CPU**: Should be minimal (< 20% average)
- **Storage**: Monitor `/data` volume growth

---

## Part 5: Troubleshooting

### Issue: Data Not Persisting

**Symptoms**: Data disappears after restart or deployment

**Solution**:
1. Check that persistent volume is properly mounted
2. Verify `DATABASE_PATH=/data/studytracker.db` environment variable
3. In Coolify, go to Storages tab and verify mount path is `/data`
4. Redeploy the application

### Issue: Can't Create Account / Login Fails

**Symptoms**: Registration or login doesn't work

**Solution**:
1. Check that `JWT_SECRET` is set
2. View application logs for errors
3. Verify environment variables are saved
4. Try redeploying

### Issue: Build Fails

**Symptoms**: Deployment fails during build

**Solution**:
1. Check build logs in Coolify
2. Verify `package.json` is correct
3. Make sure Node.js version is compatible (20+)
4. Try deleting and recreating the application

### Issue: Port Conflicts

**Symptoms**: Application won't start, port errors in logs

**Solution**:
1. Verify `PORT=3000` in environment variables
2. Check Dockerfile exposes port 3000
3. In Coolify, verify port mapping is correct

### Issue: Database Connection Errors

**Symptoms**: "Database locked" or "Cannot open database"

**Solution**:
1. Check file permissions on `/data` volume
2. Verify database path is correct
3. Restart the application
4. Check logs for specific error messages

---

## Part 6: Updating Your Application

### Make Code Changes

1. Edit your code locally
2. Test locally (optional):
   ```bash
   npm run dev
   ```
3. Commit changes:
   ```bash
   git add .
   git commit -m "Description of changes"
   git push
   ```
4. If auto-deploy enabled: Coolify deploys automatically
5. If manual: Click "Deploy" in Coolify

**Important**: Your data will persist across deployments! ✅

---

## Part 7: Scaling Considerations

### Current Setup Handles:
- 1-100 concurrent users
- Small to medium data (< 1GB sessions)
- Personal or small team use

### To Scale Up:

**Increase Volume Size**:
1. In Coolify, modify the storage volume
2. Increase from 1GB to 5GB or 10GB

**Optimize Database** (if growing large):
1. Add database maintenance cron job
2. Implement data archival
3. Consider migrating to PostgreSQL

**Resource Limits**:
1. In Coolify, adjust memory/CPU limits
2. Recommended: 512MB RAM, 0.5 vCPU minimum

---

## Summary Checklist

Before deploying, verify:

- [ ] Code pushed to GitHub
- [ ] Coolify application created
- [ ] Environment variables set (NODE_ENV, PORT, JWT_SECRET, DATABASE_PATH)
- [ ] **Persistent volume mounted at `/data`** (Critical!)
- [ ] Domain configured (optional)
- [ ] Application deployed successfully
- [ ] Can create account and login
- [ ] Data persists after refresh
- [ ] Data persists after redeployment (test this!)

---

## Quick Reference

### Environment Variables
```env
NODE_ENV=production
PORT=3000
JWT_SECRET=<your-64-char-random-string>
DATABASE_PATH=/data/studytracker.db
```

### Volume Configuration
- **Mount Path**: `/data`
- **Size**: 1GB minimum

### Ports
- **Application**: 3000
- **Public**: 80/443 (handled by Coolify)

### Important URLs
- **Health Check**: `https://your-domain.com/api/health`
- **Application**: `https://your-domain.com`
- **API Base**: `https://your-domain.com/api`

---

## Need Help?

1. Check Coolify logs first
2. Verify all environment variables
3. Ensure persistent volume is mounted
4. Check database file exists: `/data/studytracker.db`
5. Review application logs for specific errors

Your data is safe as long as the `/data` volume is properly configured! 🎉
