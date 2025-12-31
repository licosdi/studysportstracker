import express from 'express';
import db from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get log entries with filters
router.get('/', (req, res) => {
  try {
    const { startDate, endDate, area, categoryId, limit, offset } = req.query;

    let query = `
      SELECT
        l.id, l.area, l.date_time as dateTime, l.category_id as categoryId,
        l.plan_item_id as planItemId, l.title, l.notes, l.duration_minutes as durationMinutes,
        l.intensity, l.points, l.created_at as createdAt,
        CASE
          WHEN l.area = 'study' THEN sc.name
          WHEN l.area = 'football' THEN fc.name
        END as categoryName,
        CASE
          WHEN l.area = 'study' THEN sc.color
          WHEN l.area = 'football' THEN fc.color
        END as categoryColor
      FROM log_entries l
      LEFT JOIN study_categories sc ON l.category_id = sc.id AND l.area = 'study'
      LEFT JOIN football_categories fc ON l.category_id = fc.id AND l.area = 'football'
      WHERE l.user_id = ?
    `;
    const params = [req.user.id];

    if (startDate) {
      query += ' AND DATE(l.date_time) >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND DATE(l.date_time) <= ?';
      params.push(endDate);
    }
    if (area && ['study', 'football'].includes(area)) {
      query += ' AND l.area = ?';
      params.push(area);
    }
    if (categoryId) {
      query += ' AND l.category_id = ?';
      params.push(categoryId);
    }

    query += ' ORDER BY l.date_time DESC';

    if (limit) {
      query += ' LIMIT ?';
      params.push(parseInt(limit));
      if (offset) {
        query += ' OFFSET ?';
        params.push(parseInt(offset));
      }
    }

    const entries = db.prepare(query).all(...params);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM log_entries l WHERE l.user_id = ?';
    const countParams = [req.user.id];
    if (startDate) {
      countQuery += ' AND DATE(l.date_time) >= ?';
      countParams.push(startDate);
    }
    if (endDate) {
      countQuery += ' AND DATE(l.date_time) <= ?';
      countParams.push(endDate);
    }
    if (area && ['study', 'football'].includes(area)) {
      countQuery += ' AND l.area = ?';
      countParams.push(area);
    }
    if (categoryId) {
      countQuery += ' AND l.category_id = ?';
      countParams.push(categoryId);
    }

    const { total } = db.prepare(countQuery).get(...countParams);

    res.json({ entries, total });
  } catch (error) {
    console.error('Get log entries error:', error);
    res.status(500).json({ error: 'Failed to fetch log entries' });
  }
});

// Get log entries for today
router.get('/today', (req, res) => {
  try {
    const { area } = req.query;
    const today = new Date().toISOString().split('T')[0];

    let query = `
      SELECT
        l.id, l.area, l.date_time as dateTime, l.category_id as categoryId,
        l.plan_item_id as planItemId, l.title, l.notes, l.duration_minutes as durationMinutes,
        l.intensity, l.points, l.created_at as createdAt,
        CASE
          WHEN l.area = 'study' THEN sc.name
          WHEN l.area = 'football' THEN fc.name
        END as categoryName,
        CASE
          WHEN l.area = 'study' THEN sc.color
          WHEN l.area = 'football' THEN fc.color
        END as categoryColor
      FROM log_entries l
      LEFT JOIN study_categories sc ON l.category_id = sc.id AND l.area = 'study'
      LEFT JOIN football_categories fc ON l.category_id = fc.id AND l.area = 'football'
      WHERE l.user_id = ? AND DATE(l.date_time) = ?
    `;
    const params = [req.user.id, today];

    if (area && ['study', 'football'].includes(area)) {
      query += ' AND l.area = ?';
      params.push(area);
    }

    query += ' ORDER BY l.date_time DESC';

    const entries = db.prepare(query).all(...params);
    res.json({ entries });
  } catch (error) {
    console.error('Get today logs error:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// Create a manual log entry
router.post('/', (req, res) => {
  try {
    const { area, dateTime, categoryId, title, notes, durationMinutes, intensity } = req.body;

    if (!area || !dateTime || !categoryId || !title || !durationMinutes) {
      return res.status(400).json({ error: 'Area, dateTime, categoryId, title, and durationMinutes are required' });
    }

    if (!['study', 'football'].includes(area)) {
      return res.status(400).json({ error: 'Area must be study or football' });
    }

    if (intensity && !['low', 'medium', 'high'].includes(intensity)) {
      return res.status(400).json({ error: 'Intensity must be low, medium, or high' });
    }

    const result = db.prepare(`
      INSERT INTO log_entries (user_id, area, date_time, category_id, title, notes, duration_minutes, intensity)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.user.id, area, dateTime, categoryId, title, notes || null, durationMinutes, intensity || null);

    const entry = db.prepare(`
      SELECT
        l.id, l.area, l.date_time as dateTime, l.category_id as categoryId,
        l.plan_item_id as planItemId, l.title, l.notes, l.duration_minutes as durationMinutes,
        l.intensity, l.points, l.created_at as createdAt,
        CASE
          WHEN l.area = 'study' THEN sc.name
          WHEN l.area = 'football' THEN fc.name
        END as categoryName,
        CASE
          WHEN l.area = 'study' THEN sc.color
          WHEN l.area = 'football' THEN fc.color
        END as categoryColor
      FROM log_entries l
      LEFT JOIN study_categories sc ON l.category_id = sc.id AND l.area = 'study'
      LEFT JOIN football_categories fc ON l.category_id = fc.id AND l.area = 'football'
      WHERE l.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({ entry });
  } catch (error) {
    console.error('Create log entry error:', error);
    res.status(500).json({ error: 'Failed to create log entry' });
  }
});

// Update a log entry
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { dateTime, categoryId, title, notes, durationMinutes, intensity } = req.body;

    const existing = db.prepare('SELECT * FROM log_entries WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!existing) {
      return res.status(404).json({ error: 'Log entry not found' });
    }

    db.prepare(`
      UPDATE log_entries
      SET date_time = ?, category_id = ?, title = ?, notes = ?, duration_minutes = ?, intensity = ?
      WHERE id = ? AND user_id = ?
    `).run(
      dateTime ?? existing.date_time,
      categoryId ?? existing.category_id,
      title ?? existing.title,
      notes !== undefined ? notes : existing.notes,
      durationMinutes ?? existing.duration_minutes,
      intensity !== undefined ? intensity : existing.intensity,
      id,
      req.user.id
    );

    const entry = db.prepare(`
      SELECT
        l.id, l.area, l.date_time as dateTime, l.category_id as categoryId,
        l.plan_item_id as planItemId, l.title, l.notes, l.duration_minutes as durationMinutes,
        l.intensity, l.points, l.created_at as createdAt,
        CASE
          WHEN l.area = 'study' THEN sc.name
          WHEN l.area = 'football' THEN fc.name
        END as categoryName,
        CASE
          WHEN l.area = 'study' THEN sc.color
          WHEN l.area = 'football' THEN fc.color
        END as categoryColor
      FROM log_entries l
      LEFT JOIN study_categories sc ON l.category_id = sc.id AND l.area = 'study'
      LEFT JOIN football_categories fc ON l.category_id = fc.id AND l.area = 'football'
      WHERE l.id = ?
    `).get(id);

    res.json({ entry });
  } catch (error) {
    console.error('Update log entry error:', error);
    res.status(500).json({ error: 'Failed to update log entry' });
  }
});

// Delete a log entry
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM log_entries WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!existing) {
      return res.status(404).json({ error: 'Log entry not found' });
    }

    // If this log was from a plan item, reset the plan status
    if (existing.plan_item_id) {
      db.prepare(`
        UPDATE plan_items SET status = 'planned', updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(existing.plan_item_id);
    }

    db.prepare('DELETE FROM log_entries WHERE id = ? AND user_id = ?').run(id, req.user.id);
    res.json({ message: 'Log entry deleted successfully' });
  } catch (error) {
    console.error('Delete log entry error:', error);
    res.status(500).json({ error: 'Failed to delete log entry' });
  }
});

export default router;
