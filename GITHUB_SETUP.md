# GitHub Setup Guide - Complete Beginner's Guide

This guide walks you through creating a GitHub account and pushing your Study Tracker code.

---

## Part 1: Create GitHub Account

### Step 1: Sign Up for GitHub

1. Open your browser and go to **https://github.com**
2. Click **"Sign up"** (top right corner)

### Step 2: Enter Your Email

1. Enter your email address
2. Click **"Continue"**

### Step 3: Create Password

1. Create a strong password (at least 15 characters or 8 with a number and lowercase letter)
2. Click **"Continue"**

### Step 4: Choose Username

1. Enter a username (this will be part of your repository URL)
   - Example: `liamstudies`, `liam-dev`, `yourusername`
   - Must be unique across GitHub
2. Click **"Continue"**

### Step 5: Verify Account

1. You'll see a puzzle to verify you're human
2. Complete the puzzle
3. Click **"Create account"**

### Step 6: Email Verification

1. Check your email inbox
2. Find the email from GitHub with verification code
3. Enter the 6-digit code on GitHub
4. Click **"Verify"**

### Step 7: Personalization (Optional)

GitHub will ask some questions - you can:
- Skip this step (click "Skip personalization")
- Or answer the questions (student, hobby project, etc.)

### Step 8: Choose Plan

1. Select **"Free"** plan (perfect for your needs)
2. Click **"Continue for free"**

**Congratulations!** You now have a GitHub account. ✅

---

## Part 2: Create Your Repository

### Step 1: Create New Repository

1. Once logged in, click the **"+"** icon (top right)
2. Select **"New repository"**

### Step 2: Configure Repository

Fill in these details:

**Repository name**: `studytracker`
- Must be lowercase, no spaces
- Use hyphens for multiple words (e.g., `study-tracker`)

**Description** (optional): `Pomodoro-based study session tracker with backend`

**Visibility**:
- **Public**: Anyone can see (recommended for learning)
- **Private**: Only you can see (choose this if you want privacy)

**Initialize repository**:
- **DO NOT** check "Add a README file"
- **DO NOT** add .gitignore
- **DO NOT** choose a license
- (We already have these files)

### Step 3: Create Repository

Click **"Create repository"**

### Step 4: Copy Repository URL

After creation, you'll see a page with setup instructions. Look for a URL like:

```
https://github.com/YOUR_USERNAME/studytracker.git
```

**KEEP THIS PAGE OPEN** - you'll need this URL in the next section.

---

## Part 3: Install Git

### For macOS:

Open Terminal and run:

```bash
xcode-select --install
```

Click "Install" when prompted. Wait for installation to complete.

To verify:
```bash
git --version
```

Should show something like: `git version 2.39.0`

### For Windows:

1. Download Git from: **https://git-scm.com/download/win**
2. Run the installer
3. Use default settings (just keep clicking "Next")
4. Open **Git Bash** (search for it in Start menu)

### For Linux:

**Ubuntu/Debian**:
```bash
sudo apt update
sudo apt install git
```

**Fedora/RHEL**:
```bash
sudo yum install git
```

---

## Part 4: Configure Git (First Time Only)

Open Terminal (macOS/Linux) or Git Bash (Windows) and run:

```bash
# Set your name (will appear in commits)
git config --global user.name "Your Name"

# Set your email (use the same email as your GitHub account)
git config --global user.email "your-email@example.com"
```

Replace with your actual information!

To verify:
```bash
git config --global user.name
git config --global user.email
```

---

## Part 5: Push Your Code to GitHub

### Step 1: Navigate to Your Project

Open Terminal (macOS/Linux) or Git Bash (Windows):

```bash
cd /Users/liam/Documents/Cursor/Studytracker
```

**For Windows**, the path might be:
```bash
cd /c/Users/YourUsername/Documents/Cursor/Studytracker
```

### Step 2: Initialize Git Repository

```bash
git init
```

You should see: `Initialized empty Git repository...`

### Step 3: Add All Files

```bash
git add .
```

This stages all files for commit. The `.` means "all files in current directory".

### Step 4: Create First Commit

```bash
git commit -m "Initial commit: Study Tracker with backend for Coolify"
```

You should see output showing files committed.

### Step 5: Rename Branch to Main

```bash
git branch -M main
```

This renames the default branch to `main` (GitHub's standard).

### Step 6: Connect to GitHub

Replace `YOUR_USERNAME` with your actual GitHub username:

```bash
git remote add origin https://github.com/YOUR_USERNAME/studytracker.git
```

Example:
```bash
git remote add origin https://github.com/liamstudies/studytracker.git
```

### Step 7: Push to GitHub

```bash
git push -u origin main
```

**If prompted for credentials**:
- **Username**: Your GitHub username
- **Password**: You'll need a Personal Access Token (see troubleshooting below)

You should see progress as files are uploaded.

### Step 8: Verify on GitHub

1. Go to your repository URL: `https://github.com/YOUR_USERNAME/studytracker`
2. Refresh the page
3. You should see all your files! 🎉

---

## Part 6: GitHub Authentication (If Needed)

GitHub no longer accepts passwords for git operations. You need a **Personal Access Token**.

### Create Personal Access Token

1. Go to GitHub.com (logged in)
2. Click your profile picture (top right)
3. Click **"Settings"**
4. Scroll down and click **"Developer settings"** (bottom left)
5. Click **"Personal access tokens"**
6. Click **"Tokens (classic)"**
7. Click **"Generate new token"** → **"Generate new token (classic)"**
8. Configure token:
   - **Note**: `Studytracker deployment`
   - **Expiration**: `No expiration` or `90 days`
   - **Scopes**: Check **"repo"** (this gives full repository access)
9. Click **"Generate token"**
10. **COPY THE TOKEN** - you won't see it again!

### Use Token as Password

When git asks for password, paste the token instead.

**Or save credentials** (so you don't have to enter every time):

```bash
git config --global credential.helper store
```

Next time you push, enter username and token. Git will remember them.

---

## Part 7: Making Updates Later

When you want to push new changes:

### Step 1: Make Your Changes

Edit files, add features, fix bugs, etc.

### Step 2: Stage Changes

```bash
git add .
```

Or stage specific files:
```bash
git add filename.js
```

### Step 3: Commit Changes

```bash
git commit -m "Description of what you changed"
```

Examples:
- `"Add user profile page"`
- `"Fix timer bug"`
- `"Update README"`

### Step 4: Push to GitHub

```bash
git push
```

If auto-deploy is enabled in Coolify, this will trigger deployment!

---

## Quick Command Reference

```bash
# Check status (see what changed)
git status

# See what's different
git diff

# View commit history
git log

# Add all files
git add .

# Commit with message
git commit -m "Your message here"

# Push to GitHub
git push

# Pull latest from GitHub
git pull

# See current remote
git remote -v
```

---

## Troubleshooting

### "git: command not found"

**Solution**: Git is not installed. Follow Part 3 above.

### "Permission denied (publickey)"

**Solution**: Use HTTPS URL instead of SSH, or set up SSH keys.

Make sure your remote uses HTTPS:
```bash
git remote -v
```

Should show `https://github.com/...`, not `git@github.com:...`

If it shows SSH, change it:
```bash
git remote set-url origin https://github.com/YOUR_USERNAME/studytracker.git
```

### "Authentication failed"

**Solution**: You need a Personal Access Token (see Part 6).

### "Repository not found"

**Solution**:
1. Check the URL is correct
2. Make sure you're logged into GitHub
3. Verify repository exists

### ".env file is being committed"

**Solution**: Don't worry! The `.gitignore` file prevents `.env` from being uploaded.

Verify:
```bash
git status
```

`.env` should NOT appear in the list.

### "Everything up-to-date"

This means there are no new changes to push. This is normal!

---

## Security Best Practices

### DO:
- ✅ Keep `.env` in `.gitignore` (already done)
- ✅ Use Personal Access Tokens (not passwords)
- ✅ Make commits with clear messages
- ✅ Regularly push your changes

### DON'T:
- ❌ Commit `.env` file (contains secrets)
- ❌ Share your Personal Access Token
- ❌ Commit database files (`.db` already in `.gitignore`)
- ❌ Commit `node_modules` (already in `.gitignore`)

---

## Summary

You've learned to:
1. ✅ Create a GitHub account
2. ✅ Create a repository
3. ✅ Install and configure Git
4. ✅ Push your code to GitHub
5. ✅ Make updates and push changes

**Your repository is now on GitHub and ready for Coolify deployment!**

Next step: Follow `COOLIFY_SETUP.md` to deploy your app.
