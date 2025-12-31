import express from 'express';
import db from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all presets for the current user
router.get('/', (req, res) => {
  try {
    const { category } = req.query;

    let query = `
      SELECT id, subject, category, created_at
      FROM custom_presets
      WHERE user_id = ?
    `;
    const params = [req.user.id];

    if (category && ['igcse', 'general'].includes(category)) {
      query += ' AND category = ?';
      params.push(category);
    }

    query += ' ORDER BY subject ASC';

    const presets = db.prepare(query).all(...params);
    res.json({ presets });
  } catch (error) {
    console.error('Get presets error:', error);
    res.status(500).json({ error: 'Failed to fetch presets' });
  }
});

// Create a new preset
router.post('/', (req, res) => {
  try {
    const { subject, category } = req.body;

    if (!subject || !category) {
      return res.status(400).json({ error: 'Subject and category are required' });
    }

    if (!['igcse', 'general'].includes(category)) {
      return res.status(400).json({ error: 'Category must be igcse or general' });
    }

    // Check if preset already exists
    const existing = db.prepare(`
      SELECT * FROM custom_presets WHERE user_id = ? AND subject = ? AND category = ?
    `).get(req.user.id, subject, category);

    if (existing) {
      return res.status(400).json({ error: 'Preset already exists' });
    }

    const result = db.prepare(`
      INSERT INTO custom_presets (user_id, subject, category)
      VALUES (?, ?, ?)
    `).run(req.user.id, subject, category);

    const preset = db.prepare('SELECT * FROM custom_presets WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ preset });
  } catch (error) {
    console.error('Create preset error:', error);
    res.status(500).json({ error: 'Failed to create preset' });
  }
});

// Delete a preset
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    // Check ownership
    const existing = db.prepare('SELECT * FROM custom_presets WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!existing) {
      return res.status(404).json({ error: 'Preset not found' });
    }

    db.prepare('DELETE FROM custom_presets WHERE id = ? AND user_id = ?').run(id, req.user.id);
    res.json({ message: 'Preset deleted successfully' });
  } catch (error) {
    console.error('Delete preset error:', error);
    res.status(500).json({ error: 'Failed to delete preset' });
  }
});

// Delete preset by subject and category
router.delete('/by-subject/:subject/:category', (req, res) => {
  try {
    const { subject, category } = req.params;

    const existing = db.prepare(`
      SELECT * FROM custom_presets WHERE user_id = ? AND subject = ? AND category = ?
    `).get(req.user.id, subject, category);

    if (!existing) {
      return res.status(404).json({ error: 'Preset not found' });
    }

    db.prepare(`
      DELETE FROM custom_presets WHERE user_id = ? AND subject = ? AND category = ?
    `).run(req.user.id, subject, category);

    res.json({ message: 'Preset deleted successfully' });
  } catch (error) {
    console.error('Delete preset error:', error);
    res.status(500).json({ error: 'Failed to delete preset' });
  }
});

export default router;
