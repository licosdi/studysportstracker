# Deployment Guide

This guide covers deploying Study Tracker to various platforms, with a focus on Coolify.

## Table of Contents
- [Local Development Setup](#local-development-setup)
- [Deploying to Coolify](#deploying-to-coolify)
- [Environment Variables](#environment-variables)
- [Database Considerations](#database-considerations)

## Local Development Setup

### 1. Prerequisites
- Node.js v18+ and npm installed
- Git installed

### 2. Quick Start

```bash
# Clone or navigate to the project
cd Studytracker

# Run the setup script (macOS/Linux)
./setup.sh

# Or manually:
npm install
npm run migrate
npm run dev
```

### 3. Access the Application
Open your browser to `http://localhost:3000`

## Deploying to Coolify

Coolify is a self-hosted platform that makes deployment simple. Here's how to deploy Study Tracker:

### Step 1: Prepare Your Repository

1. **Initialize Git** (if not already done):
```bash
git init
git add .
git commit -m "Initial commit with authentication"
```

2. **Push to GitHub**:
```bash
# Create a new repository on GitHub
# Then push your code:
git remote add origin https://github.com/YOUR_USERNAME/studytracker.git
git branch -M main
git push -u origin main
```

### Step 2: Configure Coolify

1. **Log into your Coolify instance**

2. **Create a New Application**:
   - Click "New Resource"
   - Select "Public Repository"
   - Enter your GitHub repository URL: `https://github.com/YOUR_USERNAME/studytracker.git`
   - Select branch: `main`

3. **Configure Build Settings**:
   - **Build Pack**: Node.js (auto-detected)
   - **Install Command**: `npm install`
   - **Build Command**: `npm run migrate` (optional, can be in start command)
   - **Start Command**: `npm start`
   - **Port**: `3000`

### Step 3: Set Environment Variables

In Coolify's environment variables section, add:

```env
NODE_ENV=production
PORT=3000
JWT_SECRET=YOUR_STRONG_RANDOM_SECRET_HERE
DATABASE_PATH=/app/data/studytracker.db
```

**IMPORTANT**: Generate a strong JWT secret:
```bash
# Generate a random secret (run locally)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Step 4: Configure Persistent Storage (Important!)

To persist your SQLite database across deployments:

1. In Coolify, go to **Storage** section
2. Add a **Persistent Volume**:
   - **Name**: `studytracker-data`
   - **Mount Path**: `/app/data`
   - **Size**: 1GB (adjust as needed)

This ensures your database survives container restarts and redeployments.

### Step 5: Deploy

1. Click **Deploy** in Coolify
2. Monitor the build logs
3. Once deployed, access your application at the URL provided by Coolify

### Step 6: Verify Deployment

1. Visit your Coolify URL
2. Try creating an account
3. Log in and test the application
4. Verify data persists after browser refresh

## Environment Variables

### Development (.env file)
```env
PORT=3000
JWT_SECRET=dev-secret-key-replace-in-production-123456789
NODE_ENV=development
DATABASE_PATH=./server/database/studytracker.db
```

### Production (Coolify/Docker)
```env
NODE_ENV=production
PORT=3000
JWT_SECRET=<your-strong-random-secret>
DATABASE_PATH=/app/data/studytracker.db
```

## Database Considerations

### SQLite (Current Setup)

**Pros**:
- Zero configuration
- Perfect for small to medium applications
- File-based, easy backups
- Great for Coolify with persistent volumes

**Cons**:
- Single-writer limitation
- Not ideal for high-traffic scenarios

**Backup Strategy**:
```bash
# In Coolify, set up a cron job to backup the database
# Add to your Dockerfile or use Coolify's backup features
cp /app/data/studytracker.db /app/backups/studytracker-$(date +%Y%m%d).db
```

### Upgrading to PostgreSQL (Future)

For larger deployments, you may want PostgreSQL:

1. **Update dependencies**:
```bash
npm install pg
npm uninstall better-sqlite3
```

2. **Update database connection** in `server/database/db.js`

3. **Set environment variables**:
```env
DATABASE_URL=postgresql://user:password@host:5432/studytracker
```

4. **In Coolify**:
   - Add a PostgreSQL database service
   - Link it to your application
   - Update environment variables

## Coolify-Specific Features

### Custom Domain

1. In Coolify, go to **Domains**
2. Add your custom domain
3. Coolify automatically handles SSL with Let's Encrypt

### Automatic Deployments

1. In Coolify, enable **Auto Deploy**
2. Connect your GitHub repository
3. Every push to `main` triggers a deployment

### Health Checks

Coolify can monitor your app:
- **Health Check Path**: `/api/health`
- **Expected Response**: 200 OK

### Resource Limits

Set appropriate limits in Coolify:
- **Memory**: 512MB - 1GB (recommended)
- **CPU**: 0.5 - 1 vCPU (recommended)

## Monitoring & Logs

### View Logs in Coolify
1. Go to your application
2. Click **Logs** tab
3. Monitor real-time application logs

### Application Health
Check `/api/health` endpoint:
```bash
curl https://your-domain.com/api/health
```

Expected response:
```json
{"status":"ok","message":"Study Tracker API is running"}
```

## Troubleshooting

### Database Not Persisting
- Verify persistent volume is mounted at `/app/data`
- Check `DATABASE_PATH` environment variable
- Ensure write permissions in the mounted volume

### Authentication Not Working
- Verify `JWT_SECRET` is set and consistent
- Check browser console for API errors
- Verify CORS is enabled in production

### Build Failures
- Check Coolify build logs
- Ensure `package.json` scripts are correct
- Verify Node.js version compatibility

### Port Issues
- Ensure `PORT` environment variable matches exposed port
- Check Coolify port configuration
- Verify no firewall blocking

## Security Checklist

- [ ] Strong JWT_SECRET set in production
- [ ] NODE_ENV set to "production"
- [ ] Database file has proper permissions
- [ ] HTTPS enabled (automatic with Coolify)
- [ ] Regular database backups configured
- [ ] Sensitive data not committed to Git (.env in .gitignore)

## Scaling Considerations

Current setup is suitable for:
- 1-100 concurrent users
- Personal/small team use
- Low to medium traffic

For larger scale:
- Migrate to PostgreSQL
- Use a process manager (PM2)
- Implement Redis for session storage
- Consider load balancing

## Next Steps

After deployment:
1. Test all features (signup, login, sessions, planner)
2. Set up database backups
3. Monitor application logs
4. Consider adding API endpoints for sessions and tasks
5. Implement data export functionality

## Support

For deployment issues:
- Check Coolify documentation
- Review application logs
- Inspect database connection
- Verify environment variables

Happy deploying!
