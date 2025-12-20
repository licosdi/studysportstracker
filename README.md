# Study Tracker - Pomodoro Study Session Tracker

A Pomodoro-based study session tracking application with real authentication, database storage, and Notion integration.

## Features

- **Dual-Category System**: Track IGCSE Prep and General Learning separately
- **Pomodoro Timer**: Customizable study timers (15, 25, 30, 45, or 60 minutes)
- **Session Logging**: Manual and automatic session tracking
- **Weekly Planner**: Drag-and-drop task planner
- **Multiple Views**: Table, Cards, Bar Chart, and Pie Chart
- **Notion Integration**: Sync sessions to Notion databases
- **Secure Authentication**: JWT-based user authentication with password hashing

## Technology Stack

### Frontend
- Pure HTML5, CSS3, Vanilla JavaScript
- No frameworks - lightweight and fast

### Backend
- Node.js with Express
- SQLite database for local development
- JWT authentication with bcrypt password hashing
- RESTful API architecture

## Prerequisites

Before you begin, ensure you have installed:
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- npm (comes with Node.js)

## Installation & Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

The `.env` file is already configured for local development. You can modify it if needed:

```env
PORT=3000
JWT_SECRET=dev-secret-key-replace-in-production-123456789
NODE_ENV=development
DATABASE_PATH=./server/database/studytracker.db
```

**IMPORTANT**: Change `JWT_SECRET` to a strong random string in production!

### 3. Initialize Database

```bash
npm run migrate
```

This creates the SQLite database and all necessary tables.

### 4. Start the Server

For development (with auto-reload):
```bash
npm run dev
```

For production:
```bash
npm start
```

The server will start at `http://localhost:3000`

## Usage

1. Open your browser and navigate to `http://localhost:3000`
2. Create an account using the Sign Up form
3. Log in with your credentials
4. Start tracking your study sessions!

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires auth)
- `POST /api/auth/logout` - Logout user (requires auth)

### Health Check
- `GET /api/health` - Server health status

## Database Schema

### Users
- `id` - Primary key
- `name` - User's full name
- `email` - Unique email (login credential)
- `password_hash` - Bcrypt hashed password
- `created_at`, `updated_at` - Timestamps

### Study Sessions
- `id` - Primary key
- `user_id` - Foreign key to users
- `date` - Session date
- `subject` - Study subject
- `duration` - Duration in minutes
- `category` - 'igcse' or 'general'
- `planner_task_id` - Optional link to planner task

### Planner Tasks
- `id` - Primary key
- `user_id` - Foreign key to users
- `subject` - Task subject
- `duration` - Duration in minutes
- `day` - Day of week (monday-friday)
- `category` - 'igcse' or 'general'
- `completed` - Boolean completion status
- `week_start` - Week start date

### Custom Presets
- User-defined subject presets per category

### Notion Config
- Integration token and database settings per user

## Project Structure

```
Studytracker/
├── server/
│   ├── index.js              # Express server entry point
│   ├── database/
│   │   ├── db.js             # Database connection
│   │   ├── schema.js         # Database schema
│   │   └── migrate.js        # Migration script
│   ├── middleware/
│   │   └── auth.js           # JWT authentication middleware
│   └── routes/
│       └── auth.js           # Authentication API routes
├── assets/
│   ├── css/
│   │   └── study-tracker.css # Application styles
│   ├── js/
│   │   ├── auth-api.js       # Frontend auth API client
│   │   ├── study-tracker.js  # Main application logic
│   │   └── notion-integration.js # Notion sync
│   └── images/
├── study-tracker.html        # Main HTML file
├── package.json              # Dependencies and scripts
├── .env                      # Environment variables (local)
├── .env.example              # Example environment config
└── README.md                 # This file
```

## Security Features

- **Password Hashing**: Uses bcrypt with salt rounds
- **JWT Tokens**: Secure token-based authentication
- **Token Expiration**: Tokens expire after 7 days
- **CORS Enabled**: Cross-origin requests handled securely
- **SQL Injection Protection**: Prepared statements with better-sqlite3
- **Environment Variables**: Sensitive config stored in .env

## Deployment with Coolify

This application is ready for deployment with Coolify:

1. Push your code to GitHub
2. In Coolify, create a new application
3. Point it to your GitHub repository
4. Set environment variables in Coolify dashboard:
   - `JWT_SECRET` - Strong random string
   - `NODE_ENV=production`
   - `PORT=3000` (or Coolify's default)
5. Deploy!

Coolify will:
- Automatically run `npm install`
- Start the server with `npm start`
- Manage the database file
- Handle SSL/HTTPS

## Migration from localStorage

If you have existing data in localStorage:

1. The old localStorage data will remain in your browser
2. New data is now stored in the database per user
3. Each user has their own isolated data
4. To migrate old data, you'll need to manually log sessions or write a migration script

## Future Enhancements

- [ ] Study session CRUD API endpoints
- [ ] Planner tasks CRUD API endpoints
- [ ] Data export/import functionality
- [ ] PostgreSQL support for production
- [ ] Session statistics API
- [ ] Email verification
- [ ] Password reset functionality

## Development

### Testing Locally

1. Start the development server: `npm run dev`
2. Open multiple browser tabs to test multi-user scenarios
3. Use browser DevTools to inspect API calls
4. Check `server/database/studytracker.db` to view database directly

### Database Inspection

You can inspect the SQLite database using:
```bash
sqlite3 server/database/studytracker.db
```

Common commands:
```sql
.tables                  -- List all tables
.schema users           -- Show users table schema
SELECT * FROM users;    -- View all users
```

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
