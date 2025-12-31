import express from 'express';
import db from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get plan items for a date range
router.get('/', (req, res) => {
  try {
    const { startDate, endDate, area } = req.query;

    let query = `
      SELECT
        p.id, p.date, p.area, p.title, p.notes, p.category_id as categoryId,
        p.duration_minutes as durationMinutes, p.intensity, p.status,
        p.created_at as createdAt, p.updated_at as updatedAt,
        CASE
          WHEN p.area = 'study' THEN sc.name
          WHEN p.area = 'football' THEN fc.name
        END as categoryName,
        CASE
          WHEN p.area = 'study' THEN sc.color
          WHEN p.area = 'football' THEN fc.color
        END as categoryColor
      FROM plan_items p
      LEFT JOIN study_categories sc ON p.category_id = sc.id AND p.area = 'study'
      LEFT JOIN football_categories fc ON p.category_id = fc.id AND p.area = 'football'
      WHERE p.user_id = ?
    `;
    const params = [req.user.id];

    if (startDate) {
      query += ' AND p.date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND p.date <= ?';
      params.push(endDate);
    }
    if (area && ['study', 'football'].includes(area)) {
      query += ' AND p.area = ?';
      params.push(area);
    }

    query += ' ORDER BY p.date ASC, p.created_at ASC';

    const items = db.prepare(query).all(...params);
    res.json({ items });
  } catch (error) {
    console.error('Get plan items error:', error);
    res.status(500).json({ error: 'Failed to fetch plan items' });
  }
});

// Get plan items for a specific week
router.get('/week', (req, res) => {
  try {
    const { weekStart, area } = req.query;

    if (!weekStart) {
      return res.status(400).json({ error: 'weekStart is required' });
    }

    // Calculate week end (6 days after start)
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const endStr = end.toISOString().split('T')[0];

    let query = `
      SELECT
        p.id, p.date, p.area, p.title, p.notes, p.category_id as categoryId,
        p.duration_minutes as durationMinutes, p.intensity, p.status,
        p.created_at as createdAt, p.updated_at as updatedAt,
        CASE
          WHEN p.area = 'study' THEN sc.name
          WHEN p.area = 'football' THEN fc.name
        END as categoryName,
        CASE
          WHEN p.area = 'study' THEN sc.color
          WHEN p.area = 'football' THEN fc.color
        END as categoryColor
      FROM plan_items p
      LEFT JOIN study_categories sc ON p.category_id = sc.id AND p.area = 'study'
      LEFT JOIN football_categories fc ON p.category_id = fc.id AND p.area = 'football'
      WHERE p.user_id = ? AND p.date >= ? AND p.date <= ?
    `;
    const params = [req.user.id, weekStart, endStr];

    if (area && ['study', 'football'].includes(area)) {
      query += ' AND p.area = ?';
      params.push(area);
    }

    query += ' ORDER BY p.date ASC, p.created_at ASC';

    const items = db.prepare(query).all(...params);
    res.json({ items });
  } catch (error) {
    console.error('Get week plan items error:', error);
    res.status(500).json({ error: 'Failed to fetch plan items' });
  }
});

// Create a plan item
router.post('/', (req, res) => {
  try {
    const { date, area, title, notes, categoryId, durationMinutes, intensity } = req.body;

    if (!date || !area || !title || !categoryId) {
      return res.status(400).json({ error: 'Date, area, title, and categoryId are required' });
    }

    if (!['study', 'football'].includes(area)) {
      return res.status(400).json({ error: 'Area must be study or football' });
    }

    if (intensity && !['low', 'medium', 'high'].includes(intensity)) {
      return res.status(400).json({ error: 'Intensity must be low, medium, or high' });
    }

    const result = db.prepare(`
      INSERT INTO plan_items (user_id, date, area, title, notes, category_id, duration_minutes, intensity)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.user.id, date, area, title, notes || null, categoryId, durationMinutes || 45, intensity || null);

    // Fetch with category info
    const item = db.prepare(`
      SELECT
        p.id, p.date, p.area, p.title, p.notes, p.category_id as categoryId,
        p.duration_minutes as durationMinutes, p.intensity, p.status,
        p.created_at as createdAt, p.updated_at as updatedAt,
        CASE
          WHEN p.area = 'study' THEN sc.name
          WHEN p.area = 'football' THEN fc.name
        END as categoryName,
        CASE
          WHEN p.area = 'study' THEN sc.color
          WHEN p.area = 'football' THEN fc.color
        END as categoryColor
      FROM plan_items p
      LEFT JOIN study_categories sc ON p.category_id = sc.id AND p.area = 'study'
      LEFT JOIN football_categories fc ON p.category_id = fc.id AND p.area = 'football'
      WHERE p.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({ item });
  } catch (error) {
    console.error('Create plan item error:', error);
    res.status(500).json({ error: 'Failed to create plan item' });
  }
});

// Update a plan item
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { date, title, notes, categoryId, durationMinutes, intensity, status } = req.body;

    const existing = db.prepare('SELECT * FROM plan_items WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!existing) {
      return res.status(404).json({ error: 'Plan item not found' });
    }

    db.prepare(`
      UPDATE plan_items
      SET date = ?, title = ?, notes = ?, category_id = ?, duration_minutes = ?, intensity = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).run(
      date ?? existing.date,
      title ?? existing.title,
      notes !== undefined ? notes : existing.notes,
      categoryId ?? existing.category_id,
      durationMinutes ?? existing.duration_minutes,
      intensity !== undefined ? intensity : existing.intensity,
      status ?? existing.status,
      id,
      req.user.id
    );

    const item = db.prepare(`
      SELECT
        p.id, p.date, p.area, p.title, p.notes, p.category_id as categoryId,
        p.duration_minutes as durationMinutes, p.intensity, p.status,
        p.created_at as createdAt, p.updated_at as updatedAt,
        CASE
          WHEN p.area = 'study' THEN sc.name
          WHEN p.area = 'football' THEN fc.name
        END as categoryName,
        CASE
          WHEN p.area = 'study' THEN sc.color
          WHEN p.area = 'football' THEN fc.color
        END as categoryColor
      FROM plan_items p
      LEFT JOIN study_categories sc ON p.category_id = sc.id AND p.area = 'study'
      LEFT JOIN football_categories fc ON p.category_id = fc.id AND p.area = 'football'
      WHERE p.id = ?
    `).get(id);

    res.json({ item });
  } catch (error) {
    console.error('Update plan item error:', error);
    res.status(500).json({ error: 'Failed to update plan item' });
  }
});

// Complete a plan item (creates log entry)
router.post('/:id/complete', (req, res) => {
  try {
    const { id } = req.params;
    const { durationMinutes, notes } = req.body; // Allow override

    const existing = db.prepare('SELECT * FROM plan_items WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!existing) {
      return res.status(404).json({ error: 'Plan item not found' });
    }

    if (existing.status === 'completed') {
      return res.status(400).json({ error: 'Plan item already completed' });
    }

    // Create log entry
    const dateTime = new Date().toISOString();
    const logResult = db.prepare(`
      INSERT INTO log_entries (user_id, area, date_time, category_id, plan_item_id, title, notes, duration_minutes, intensity)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user.id,
      existing.area,
      dateTime,
      existing.category_id,
      id,
      existing.title,
      notes ?? existing.notes,
      durationMinutes ?? existing.duration_minutes,
      existing.intensity
    );

    // Update plan item status
    db.prepare(`
      UPDATE plan_items SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(id);

    // Fetch the created log entry with category info
    const logEntry = db.prepare(`
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
    `).get(logResult.lastInsertRowid);

    res.json({ message: 'Plan item completed', logEntry });
  } catch (error) {
    console.error('Complete plan item error:', error);
    res.status(500).json({ error: 'Failed to complete plan item' });
  }
});

// Skip a plan item
router.post('/:id/skip', (req, res) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM plan_items WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!existing) {
      return res.status(404).json({ error: 'Plan item not found' });
    }

    db.prepare(`
      UPDATE plan_items SET status = 'skipped', updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(id);

    res.json({ message: 'Plan item skipped' });
  } catch (error) {
    console.error('Skip plan item error:', error);
    res.status(500).json({ error: 'Failed to skip plan item' });
  }
});

// Delete a plan item
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM plan_items WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!existing) {
      return res.status(404).json({ error: 'Plan item not found' });
    }

    db.prepare('DELETE FROM plan_items WHERE id = ? AND user_id = ?').run(id, req.user.id);
    res.json({ message: 'Plan item deleted successfully' });
  } catch (error) {
    console.error('Delete plan item error:', error);
    res.status(500).json({ error: 'Failed to delete plan item' });
  }
});

export default router;
