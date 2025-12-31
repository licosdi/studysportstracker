import express from 'express';
import db from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// ==================== STUDY CATEGORIES ====================

// Get all study categories
router.get('/study', (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT id, name, color, is_active as isActive, created_at as createdAt
      FROM study_categories
      WHERE user_id = ?
      ORDER BY name ASC
    `).all(req.user.id);

    res.json({ categories });
  } catch (error) {
    console.error('Get study categories error:', error);
    res.status(500).json({ error: 'Failed to fetch study categories' });
  }
});

// Get active study categories only
router.get('/study/active', (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT id, name, color
      FROM study_categories
      WHERE user_id = ? AND is_active = 1
      ORDER BY name ASC
    `).all(req.user.id);

    res.json({ categories });
  } catch (error) {
    console.error('Get active study categories error:', error);
    res.status(500).json({ error: 'Failed to fetch study categories' });
  }
});

// Create study category
router.post('/study', (req, res) => {
  try {
    const { name, color } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const result = db.prepare(`
      INSERT INTO study_categories (user_id, name, color)
      VALUES (?, ?, ?)
    `).run(req.user.id, name.trim(), color || '#6366f1');

    const category = db.prepare('SELECT * FROM study_categories WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ category });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'Category already exists' });
    }
    console.error('Create study category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update study category
router.put('/study/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, color, isActive } = req.body;

    const existing = db.prepare('SELECT * FROM study_categories WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!existing) {
      return res.status(404).json({ error: 'Category not found' });
    }

    db.prepare(`
      UPDATE study_categories
      SET name = ?, color = ?, is_active = ?
      WHERE id = ? AND user_id = ?
    `).run(
      name ?? existing.name,
      color ?? existing.color,
      isActive !== undefined ? (isActive ? 1 : 0) : existing.is_active,
      id,
      req.user.id
    );

    const category = db.prepare('SELECT * FROM study_categories WHERE id = ?').get(id);
    res.json({ category });
  } catch (error) {
    console.error('Update study category error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete study category
router.delete('/study/:id', (req, res) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM study_categories WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!existing) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Check if category is used in any logs
    const usedInLogs = db.prepare(`
      SELECT COUNT(*) as count FROM log_entries WHERE category_id = ? AND area = 'study'
    `).get(id);

    if (usedInLogs.count > 0) {
      // Deactivate instead of delete
      db.prepare('UPDATE study_categories SET is_active = 0 WHERE id = ?').run(id);
      return res.json({ message: 'Category deactivated (has existing logs)', deactivated: true });
    }

    db.prepare('DELETE FROM study_categories WHERE id = ? AND user_id = ?').run(id, req.user.id);
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete study category error:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// ==================== FOOTBALL CATEGORIES ====================

// Get all football categories
router.get('/football', (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT id, name, type, color, is_active as isActive, created_at as createdAt
      FROM football_categories
      WHERE user_id = ?
      ORDER BY name ASC
    `).all(req.user.id);

    res.json({ categories });
  } catch (error) {
    console.error('Get football categories error:', error);
    res.status(500).json({ error: 'Failed to fetch football categories' });
  }
});

// Get active football categories only
router.get('/football/active', (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT id, name, type, color
      FROM football_categories
      WHERE user_id = ? AND is_active = 1
      ORDER BY name ASC
    `).all(req.user.id);

    res.json({ categories });
  } catch (error) {
    console.error('Get active football categories error:', error);
    res.status(500).json({ error: 'Failed to fetch football categories' });
  }
});

// Create football category
router.post('/football', (req, res) => {
  try {
    const { name, type, color } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const result = db.prepare(`
      INSERT INTO football_categories (user_id, name, type, color)
      VALUES (?, ?, ?, ?)
    `).run(req.user.id, name.trim(), type || null, color || '#10b981');

    const category = db.prepare('SELECT * FROM football_categories WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ category });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'Category already exists' });
    }
    console.error('Create football category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update football category
router.put('/football/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, color, isActive } = req.body;

    const existing = db.prepare('SELECT * FROM football_categories WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!existing) {
      return res.status(404).json({ error: 'Category not found' });
    }

    db.prepare(`
      UPDATE football_categories
      SET name = ?, type = ?, color = ?, is_active = ?
      WHERE id = ? AND user_id = ?
    `).run(
      name ?? existing.name,
      type ?? existing.type,
      color ?? existing.color,
      isActive !== undefined ? (isActive ? 1 : 0) : existing.is_active,
      id,
      req.user.id
    );

    const category = db.prepare('SELECT * FROM football_categories WHERE id = ?').get(id);
    res.json({ category });
  } catch (error) {
    console.error('Update football category error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete football category
router.delete('/football/:id', (req, res) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM football_categories WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!existing) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Check if category is used in any logs
    const usedInLogs = db.prepare(`
      SELECT COUNT(*) as count FROM log_entries WHERE category_id = ? AND area = 'football'
    `).get(id);

    if (usedInLogs.count > 0) {
      // Deactivate instead of delete
      db.prepare('UPDATE football_categories SET is_active = 0 WHERE id = ?').run(id);
      return res.json({ message: 'Category deactivated (has existing logs)', deactivated: true });
    }

    db.prepare('DELETE FROM football_categories WHERE id = ? AND user_id = ?').run(id, req.user.id);
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete football category error:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

export default router;
