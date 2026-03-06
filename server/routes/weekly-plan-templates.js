import express from 'express';
import db from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

// Helper: resolve active template for a user/area/date
function getActiveTemplate(userId, area, date) {
  return db.prepare(`
    SELECT id, name, area, start_date as startDate, end_date as endDate,
           created_at as createdAt, updated_at as updatedAt
    FROM weekly_plan_templates
    WHERE user_id = ? AND area = ?
      AND start_date <= ?
      AND (end_date IS NULL OR end_date >= ?)
    ORDER BY start_date DESC
    LIMIT 1
  `).get(userId, area, date, date);
}

// GET /api/weekly-plan-templates?area=study|football
router.get('/', (req, res) => {
  try {
    const { area } = req.query;
    let query = `
      SELECT id, name, area, start_date as startDate, end_date as endDate,
             created_at as createdAt, updated_at as updatedAt
      FROM weekly_plan_templates
      WHERE user_id = ?
    `;
    const params = [req.user.id];
    if (area && ['study', 'football'].includes(area)) {
      query += ' AND area = ?';
      params.push(area);
    }
    query += ' ORDER BY area ASC, start_date ASC';
    const templates = db.prepare(query).all(...params);
    res.json({ templates });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// GET /api/weekly-plan-templates/active?area=study&date=YYYY-MM-DD
// Must be defined BEFORE /:id
router.get('/active', (req, res) => {
  try {
    const { area, date } = req.query;
    if (!area || !['study', 'football'].includes(area)) {
      return res.status(400).json({ error: 'area is required (study or football)' });
    }
    const today = date || new Date().toISOString().split('T')[0];
    const template = getActiveTemplate(req.user.id, area, today);
    res.json({ template: template || null });
  } catch (error) {
    console.error('Get active template error:', error);
    res.status(500).json({ error: 'Failed to fetch active template' });
  }
});

// POST /api/weekly-plan-templates
router.post('/', (req, res) => {
  try {
    const { name, area, startDate, endDate } = req.body;
    if (!name || !area || !startDate) {
      return res.status(400).json({ error: 'name, area, and startDate are required' });
    }
    if (!['study', 'football'].includes(area)) {
      return res.status(400).json({ error: 'area must be study or football' });
    }
    if (endDate && endDate < startDate) {
      return res.status(400).json({ error: 'endDate must be on or after startDate' });
    }

    const result = db.prepare(`
      INSERT INTO weekly_plan_templates (user_id, name, area, start_date, end_date)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.user.id, name.trim(), area, startDate, endDate || null);

    const template = db.prepare(`
      SELECT id, name, area, start_date as startDate, end_date as endDate,
             created_at as createdAt, updated_at as updatedAt
      FROM weekly_plan_templates WHERE id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({ template });
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// PUT /api/weekly-plan-templates/:id
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, startDate, endDate } = req.body;

    const existing = db.prepare('SELECT * FROM weekly_plan_templates WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!existing) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const newStartDate = startDate || existing.start_date;
    const newEndDate = endDate !== undefined ? (endDate || null) : existing.end_date;

    if (newEndDate && newEndDate < newStartDate) {
      return res.status(400).json({ error: 'endDate must be on or after startDate' });
    }

    db.prepare(`
      UPDATE weekly_plan_templates
      SET name = ?, start_date = ?, end_date = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).run(
      name !== undefined ? name.trim() : existing.name,
      newStartDate,
      newEndDate,
      id,
      req.user.id
    );

    const template = db.prepare(`
      SELECT id, name, area, start_date as startDate, end_date as endDate,
             created_at as createdAt, updated_at as updatedAt
      FROM weekly_plan_templates WHERE id = ?
    `).get(id);

    res.json({ template });
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// DELETE /api/weekly-plan-templates/:id
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM weekly_plan_templates WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!existing) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Block deletion if active sessions reference this template
    const sessionCount = db.prepare(`
      SELECT COUNT(*) as count FROM weekly_plan_items
      WHERE template_id = ? AND is_active = 1
    `).get(id);

    if (sessionCount.count > 0) {
      return res.status(409).json({ error: 'Template has active sessions. Remove them from the planner first.' });
    }

    db.prepare('DELETE FROM weekly_plan_templates WHERE id = ? AND user_id = ?').run(id, req.user.id);
    res.json({ message: 'Template deleted' });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

export default router;
export { getActiveTemplate };
