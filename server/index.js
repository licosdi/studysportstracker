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

app.listen(PORT, () => {
  console.log(`
  Logbook Server Running!
  Server: http://localhost:${PORT}
  Database: SQLite (${process.env.DATABASE_PATH || './server/database/studytracker.db'})
  `);
});

export default app;
