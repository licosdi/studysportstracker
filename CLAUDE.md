# CLAUDE.md - Project Guide for Studytracker

## Project Overview
Personal logbook / Pomodoro-based tracker for Study and Football activities. Vanilla frontend with a Node.js + Express + SQLite backend. Deployed via Coolify.

## Tech Stack
- **Frontend:** Pure HTML5, CSS3, Vanilla JavaScript (no frameworks)
- **Backend:** Node.js, Express (ESM modules — `"type": "module"`)
- **Database:** SQLite via `better-sqlite3`
- **Auth:** JWT (`jsonwebtoken`) + bcrypt (`bcryptjs`)
- **Deployment:** Docker / Coolify, GitHub repo `licosdi/studysportstracker`

## Key Commands
```bash
npm install          # Install dependencies
npm run dev          # Start dev server with nodemon (auto-reload)
npm start            # Start production server
npm run migrate      # Create/update SQLite database tables
```

## Project Structure
```
server/
  index.js             # Express entry point, serves static files
  database/
    db.js              # SQLite connection
    schema.js          # Table definitions
    migrate.js         # Migration script
  middleware/
    auth.js            # JWT auth middleware
  routes/
    auth.js            # Auth API routes (/api/auth/*)
assets/
  css/                 # Stylesheets
  js/
    auth-api.js        # Frontend auth client
    study-tracker.js   # Main app logic
    notion-integration.js
  images/
index.html             # Main app page (served by Express)
study-tracker.html     # Legacy/alternate page
```

## API Endpoints
- `POST /api/auth/register` — Register user
- `POST /api/auth/login` — Login (returns JWT)
- `GET /api/auth/me` — Current user (requires auth)
- `POST /api/auth/logout` — Logout
- `GET /api/health` — Health check

## Environment Variables
Defined in `.env` (not committed):
- `PORT` — Server port (default 3000)
- `JWT_SECRET` — Secret for JWT signing (change in production)
- `NODE_ENV` — `development` or `production`
- `DATABASE_PATH` — Path to SQLite file (default `./server/database/studytracker.db`)

## Important Notes
- ESM modules throughout — use `import`/`export`, not `require`
- The frontend is served as static files by Express (no build step)
- SQLite DB file is created by `npm run migrate` and lives at `DATABASE_PATH`
- Do not commit `.env` or the `.db` file
- Passwords are hashed with bcrypt; JWTs expire after 7 days
- The app tracks two areas: **Study** (IGCSE Prep / General Learning) and **Football**
- Pomodoro timer supports 15, 25, 30, 45, and 60 minute durations
