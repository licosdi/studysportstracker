import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import authRoutes from './routes/auth.js';
import categoriesRoutes from './routes/categories.js';
import plansRoutes from './routes/plans.js';
import logsRoutes from './routes/logs.js';
import analyticsRoutes from './routes/analytics.js';
import weeklyPlansRoutes from './routes/weekly-plans.js';
import weeklyPlanTemplatesRoutes from './routes/weekly-plan-templates.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (frontend)
app.use(express.static(join(__dirname, '..')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/plans', plansRoutes);
app.use('/api/weekly-plans', weeklyPlansRoutes);
app.use('/api/weekly-plan-templates', weeklyPlanTemplatesRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Logbook API is running' });
});

// Serve the main HTML file for all non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(join(__dirname, '..', 'index.html'));
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

export function startServer(port) {
  const listenPort = port !== undefined ? port : (parseInt(process.env.PORT) || 3000);
  return new Promise((resolve, reject) => {
    const server = app.listen(listenPort, () => {
      const addr = server.address();
      console.log(`Logbook Server: http://127.0.0.1:${addr.port}`);
      console.log(`Database: ${process.env.DATABASE_PATH || './server/database/studytracker.db'}`);
      resolve(addr.port);
    });
    server.on('error', reject);
  });
}

// Preserve `npm start` / `node server/index.js` direct-run behavior
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startServer();
}
