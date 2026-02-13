import express from 'express';
import db from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Helper: get week start (Monday) for a given date
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

// Helper: get week end (Sunday) from week start
function getWeekEnd(weekStart) {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  return end.toISOString().split('T')[0];
}

// Helper: build category JOIN query fragment
const CATEGORY_JOIN_SELECT = `
  CASE
    WHEN w.area = 'study' THEN sc.name
    WHEN w.area = 'football' THEN fc.name
  END as categoryName,
  CASE
    WHEN w.area = 'study' THEN sc.color
    WHEN w.area = 'football' THEN fc.color
  END as categoryColor
`;

const CATEGORY_JOIN_FROM = `
  LEFT JOIN study_categories sc ON w.category_id = sc.id AND w.area = 'study'
  LEFT JOIN football_categories fc ON w.category_id = fc.id AND w.area = 'football'
`;

// GET /api/weekly-plans/week-status?weekStart=YYYY-MM-DD&area=study
// Must be defined BEFORE /:id routes
router.get('/week-status', (req, res) => {
  try {
    const { weekStart, area } = req.query;

    if (!weekStart) {
      return res.status(400).json({ error: 'weekStart is required' });
    }

    const weekEnd = getWeekEnd(weekStart);

    let query = `
      SELECT
        w.id, w.area, w.day_of_week as dayOfWeek, w.category_id as categoryId,
        w.title, w.notes, w.duration_minutes as durationMinutes, w.intensity,
        ${CATEGORY_JOIN_SELECT},
        l.id as completedLogId,
        l.date_time as completedAt
      FROM weekly_plan_items w
      ${CATEGORY_JOIN_FROM}
      LEFT JOIN log_entries l ON l.weekly_plan_item_id = w.id
        AND DATE(l.date_time) >= ? AND DATE(l.date_time) <= ?
        AND l.user_id = ?
      WHERE w.user_id = ? AND w.is_active = 1
    `;
    const params = [weekStart, weekEnd, req.user.id, req.user.id];

    if (area && ['study', 'football'].includes(area)) {
      query += ' AND w.area = ?';
      params.push(area);
    }

    query += ' ORDER BY w.day_of_week ASC, w.created_at ASC';

    const items = db.prepare(query).all(...params);

    // Build status map and items list
    const result = items.map(item => ({
      id: item.id,
      area: item.area,
      dayOfWeek: item.dayOfWeek,
      categoryId: item.categoryId,
      categoryName: item.categoryName,
      categoryColor: item.categoryColor,
      title: item.title,
      notes: item.notes,
      durationMinutes: item.durationMinutes,
      intensity: item.intensity,
      isCompleted: !!item.completedLogId,
      completedLogId: item.completedLogId || null,
      completedAt: item.completedAt || null
    }));

    res.json({ items: result });
  } catch (error) {
    console.error('Get weekly plan status error:', error);
    res.status(500).json({ error: 'Failed to fetch weekly plan status' });
  }
});

// GET /api/weekly-plans?area=study
router.get('/', (req, res) => {
  try {
    const { area } = req.query;

    let query = `
      SELECT
        w.id, w.area, w.day_of_week as dayOfWeek, w.category_id as categoryId,
        w.title, w.notes, w.duration_minutes as durationMinutes, w.intensity,
        w.created_at as createdAt, w.updated_at as updatedAt,
        ${CATEGORY_JOIN_SELECT}
      FROM weekly_plan_items w
      ${CATEGORY_JOIN_FROM}
      WHERE w.user_id = ? AND w.is_active = 1
    `;
    const params = [req.user.id];

    if (area && ['study', 'football'].includes(area)) {
      query += ' AND w.area = ?';
      params.push(area);
    }

    query += ' ORDER BY w.day_of_week ASC, w.created_at ASC';

    const items = db.prepare(query).all(...params);
    res.json({ items });
  } catch (error) {
    console.error('Get weekly plans error:', error);
    res.status(500).json({ error: 'Failed to fetch weekly plans' });
  }
});

// POST /api/weekly-plans
router.post('/', (req, res) => {
  try {
    const { area, dayOfWeek, categoryId, title, durationMinutes, intensity, notes } = req.body;

    if (!area || dayOfWeek === undefined || !categoryId || !title) {
      return res.status(400).json({ error: 'area, dayOfWeek, categoryId, and title are required' });
    }

    if (!['study', 'football'].includes(area)) {
      return res.status(400).json({ error: 'Area must be study or football' });
    }

    if (dayOfWeek < 0 || dayOfWeek > 6) {
      return res.status(400).json({ error: 'dayOfWeek must be 0 (Monday) through 6 (Sunday)' });
    }

    if (intensity && !['low', 'medium', 'high'].includes(intensity)) {
      return res.status(400).json({ error: 'Intensity must be low, medium, or high' });
    }

    const result = db.prepare(`
      INSERT INTO weekly_plan_items (user_id, area, day_of_week, category_id, title, notes, duration_minutes, intensity)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.user.id, area, dayOfWeek, categoryId, title, notes || null, durationMinutes || 45, intensity || null);

    const item = db.prepare(`
      SELECT
        w.id, w.area, w.day_of_week as dayOfWeek, w.category_id as categoryId,
        w.title, w.notes, w.duration_minutes as durationMinutes, w.intensity,
        w.created_at as createdAt, w.updated_at as updatedAt,
        ${CATEGORY_JOIN_SELECT}
      FROM weekly_plan_items w
      ${CATEGORY_JOIN_FROM}
      WHERE w.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({ item });
  } catch (error) {
    console.error('Create weekly plan error:', error);
    res.status(500).json({ error: 'Failed to create weekly plan item' });
  }
});

// PUT /api/weekly-plans/:id
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { dayOfWeek, categoryId, title, durationMinutes, intensity, notes } = req.body;

    const existing = db.prepare('SELECT * FROM weekly_plan_items WHERE id = ? AND user_id = ? AND is_active = 1').get(id, req.user.id);
    if (!existing) {
      return res.status(404).json({ error: 'Weekly plan item not found' });
    }

    db.prepare(`
      UPDATE weekly_plan_items
      SET day_of_week = ?, category_id = ?, title = ?, notes = ?, duration_minutes = ?, intensity = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).run(
      dayOfWeek !== undefined ? dayOfWeek : existing.day_of_week,
      categoryId ?? existing.category_id,
      title ?? existing.title,
      notes !== undefined ? notes : existing.notes,
      durationMinutes ?? existing.duration_minutes,
      intensity !== undefined ? intensity : existing.intensity,
      id,
      req.user.id
    );

    const item = db.prepare(`
      SELECT
        w.id, w.area, w.day_of_week as dayOfWeek, w.category_id as categoryId,
        w.title, w.notes, w.duration_minutes as durationMinutes, w.intensity,
        w.created_at as createdAt, w.updated_at as updatedAt,
        ${CATEGORY_JOIN_SELECT}
      FROM weekly_plan_items w
      ${CATEGORY_JOIN_FROM}
      WHERE w.id = ?
    `).get(id);

    res.json({ item });
  } catch (error) {
    console.error('Update weekly plan error:', error);
    res.status(500).json({ error: 'Failed to update weekly plan item' });
  }
});

// DELETE /api/weekly-plans/:id (soft delete)
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM weekly_plan_items WHERE id = ? AND user_id = ? AND is_active = 1').get(id, req.user.id);
    if (!existing) {
      return res.status(404).json({ error: 'Weekly plan item not found' });
    }

    db.prepare('UPDATE weekly_plan_items SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
    res.json({ message: 'Weekly plan item removed' });
  } catch (error) {
    console.error('Delete weekly plan error:', error);
    res.status(500).json({ error: 'Failed to delete weekly plan item' });
  }
});

// POST /api/weekly-plans/:id/complete
router.post('/:id/complete', (req, res) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM weekly_plan_items WHERE id = ? AND user_id = ? AND is_active = 1').get(id, req.user.id);
    if (!existing) {
      return res.status(404).json({ error: 'Weekly plan item not found' });
    }

    // Check if already completed this week
    const weekStart = getWeekStart(new Date());
    const weekEnd = getWeekEnd(weekStart);

    const alreadyCompleted = db.prepare(`
      SELECT id FROM log_entries
      WHERE weekly_plan_item_id = ? AND user_id = ? AND DATE(date_time) >= ? AND DATE(date_time) <= ?
    `).get(id, req.user.id, weekStart, weekEnd);

    if (alreadyCompleted) {
      return res.status(400).json({ error: 'Already completed this week' });
    }

    // Create log entry
    const dateTime = new Date().toISOString();
    const logResult = db.prepare(`
      INSERT INTO log_entries (user_id, area, date_time, category_id, weekly_plan_item_id, title, notes, duration_minutes, intensity)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user.id,
      existing.area,
      dateTime,
      existing.category_id,
      id,
      existing.title,
      existing.notes,
      existing.duration_minutes,
      existing.intensity
    );

    const logEntry = db.prepare(`
      SELECT
        l.id, l.area, l.date_time as dateTime, l.category_id as categoryId,
        l.weekly_plan_item_id as weeklyPlanItemId, l.title, l.notes,
        l.duration_minutes as durationMinutes, l.intensity, l.created_at as createdAt,
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

    res.json({ message: 'Completed', logEntry });
  } catch (error) {
    console.error('Complete weekly plan error:', error);
    res.status(500).json({ error: 'Failed to complete weekly plan item' });
  }
});

// POST /api/weekly-plans/:id/uncomplete
router.post('/:id/uncomplete', (req, res) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM weekly_plan_items WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!existing) {
      return res.status(404).json({ error: 'Weekly plan item not found' });
    }

    const weekStart = getWeekStart(new Date());
    const weekEnd = getWeekEnd(weekStart);

    const logEntry = db.prepare(`
      SELECT id FROM log_entries
      WHERE weekly_plan_item_id = ? AND user_id = ? AND DATE(date_time) >= ? AND DATE(date_time) <= ?
    `).get(id, req.user.id, weekStart, weekEnd);

    if (!logEntry) {
      return res.status(400).json({ error: 'Not completed this week' });
    }

    db.prepare('DELETE FROM log_entries WHERE id = ?').run(logEntry.id);
    res.json({ message: 'Uncompleted' });
  } catch (error) {
    console.error('Uncomplete weekly plan error:', error);
    res.status(500).json({ error: 'Failed to uncomplete weekly plan item' });
  }
});

export default router;
