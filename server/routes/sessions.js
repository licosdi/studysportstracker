import express from 'express';
import db from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all sessions for the current user
router.get('/', (req, res) => {
  try {
    const sessions = db.prepare(`
      SELECT id, date, subject, duration, category, planner_task_id, created_at
      FROM study_sessions
      WHERE user_id = ?
      ORDER BY date DESC
    `).all(req.user.id);

    res.json({ sessions });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// Create a new session
router.post('/', (req, res) => {
  try {
    const { date, subject, duration, category, plannerTaskId } = req.body;

    if (!date || !subject || !duration || !category) {
      return res.status(400).json({ error: 'Date, subject, duration, and category are required' });
    }

    if (!['igcse', 'general'].includes(category)) {
      return res.status(400).json({ error: 'Category must be igcse or general' });
    }

    const result = db.prepare(`
      INSERT INTO study_sessions (user_id, date, subject, duration, category, planner_task_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.user.id, date, subject, duration, category, plannerTaskId || null);

    const session = db.prepare('SELECT * FROM study_sessions WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({ session });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Update a session
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { date, subject, duration, category } = req.body;

    // Check ownership
    const existing = db.prepare('SELECT * FROM study_sessions WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!existing) {
      return res.status(404).json({ error: 'Session not found' });
    }

    db.prepare(`
      UPDATE study_sessions
      SET date = ?, subject = ?, duration = ?, category = ?
      WHERE id = ? AND user_id = ?
    `).run(date, subject, duration, category, id, req.user.id);

    const session = db.prepare('SELECT * FROM study_sessions WHERE id = ?').get(id);
    res.json({ session });
  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({ error: 'Failed to update session' });
  }
});

// Delete a session
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    // Check ownership
    const existing = db.prepare('SELECT * FROM study_sessions WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!existing) {
      return res.status(404).json({ error: 'Session not found' });
    }

    db.prepare('DELETE FROM study_sessions WHERE id = ? AND user_id = ?').run(id, req.user.id);
    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// Get session statistics
router.get('/stats', (req, res) => {
  try {
    const { category } = req.query;

    let whereClause = 'WHERE user_id = ?';
    const params = [req.user.id];

    if (category && ['igcse', 'general'].includes(category)) {
      whereClause += ' AND category = ?';
      params.push(category);
    }

    // Total sessions
    const totalSessions = db.prepare(`SELECT COUNT(*) as count FROM study_sessions ${whereClause}`).get(...params);

    // Weekly total (last 7 days)
    const weeklyTotal = db.prepare(`
      SELECT COALESCE(SUM(duration), 0) as total
      FROM study_sessions
      ${whereClause} AND date >= datetime('now', '-7 days')
    `).get(...params);

    // Monthly total (last 30 days)
    const monthlyTotal = db.prepare(`
      SELECT COALESCE(SUM(duration), 0) as total
      FROM study_sessions
      ${whereClause} AND date >= datetime('now', '-30 days')
    `).get(...params);

    res.json({
      totalSessions: totalSessions.count,
      weeklyMinutes: weeklyTotal.total,
      monthlyMinutes: monthlyTotal.total
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;
