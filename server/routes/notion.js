import express from 'express';
import db from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get Notion config for the current user
router.get('/config', (req, res) => {
  try {
    const config = db.prepare(`
      SELECT id, token, database_id, auto_sync, sync_on_timer_complete, created_at, updated_at
      FROM notion_config
      WHERE user_id = ?
    `).get(req.user.id);

    if (!config) {
      return res.json({ config: null });
    }

    // Mask the token for security (only show last 4 characters)
    const maskedConfig = {
      ...config,
      token: config.token ? `****${config.token.slice(-4)}` : null,
      hasToken: !!config.token
    };

    res.json({ config: maskedConfig });
  } catch (error) {
    console.error('Get Notion config error:', error);
    res.status(500).json({ error: 'Failed to fetch Notion config' });
  }
});

// Save or update Notion config
router.post('/config', (req, res) => {
  try {
    const { token, databaseId, autoSync, syncOnTimerComplete } = req.body;

    if (!token || !databaseId) {
      return res.status(400).json({ error: 'Token and database ID are required' });
    }

    // Check if config already exists
    const existing = db.prepare('SELECT * FROM notion_config WHERE user_id = ?').get(req.user.id);

    if (existing) {
      // Update existing config
      db.prepare(`
        UPDATE notion_config
        SET token = ?, database_id = ?, auto_sync = ?, sync_on_timer_complete = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).run(token, databaseId, autoSync ? 1 : 0, syncOnTimerComplete ? 1 : 0, req.user.id);
    } else {
      // Create new config
      db.prepare(`
        INSERT INTO notion_config (user_id, token, database_id, auto_sync, sync_on_timer_complete)
        VALUES (?, ?, ?, ?, ?)
      `).run(req.user.id, token, databaseId, autoSync ? 1 : 0, syncOnTimerComplete ? 1 : 0);
    }

    res.json({ message: 'Notion config saved successfully' });
  } catch (error) {
    console.error('Save Notion config error:', error);
    res.status(500).json({ error: 'Failed to save Notion config' });
  }
});

// Delete Notion config
router.delete('/config', (req, res) => {
  try {
    db.prepare('DELETE FROM notion_config WHERE user_id = ?').run(req.user.id);
    res.json({ message: 'Notion config deleted successfully' });
  } catch (error) {
    console.error('Delete Notion config error:', error);
    res.status(500).json({ error: 'Failed to delete Notion config' });
  }
});

// Get full config (including token) for syncing - internal use
router.get('/config/full', (req, res) => {
  try {
    const config = db.prepare(`
      SELECT token, database_id, auto_sync, sync_on_timer_complete
      FROM notion_config
      WHERE user_id = ?
    `).get(req.user.id);

    if (!config) {
      return res.json({ config: null });
    }

    res.json({ config });
  } catch (error) {
    console.error('Get full Notion config error:', error);
    res.status(500).json({ error: 'Failed to fetch Notion config' });
  }
});

export default router;
