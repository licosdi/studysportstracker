import express from 'express';
import db from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all tasks for a specific week
router.get('/', (req, res) => {
  try {
    const { weekStart } = req.query;

    let query = `
      SELECT id, subject, duration, day, category, completed, week_start, created_at
      FROM planner_tasks
      WHERE user_id = ?
    `;
    const params = [req.user.id];

    if (weekStart) {
      query += ' AND week_start = ?';
      params.push(weekStart);
    }

    query += ' ORDER BY created_at ASC';

    const tasks = db.prepare(query).all(...params);
    res.json({ tasks });
  } catch (error) {
    console.error('Get planner tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Create a new task
router.post('/', (req, res) => {
  try {
    const { subject, duration, day, category, weekStart } = req.body;

    if (!subject || !duration || !day || !category || !weekStart) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(day)) {
      return res.status(400).json({ error: 'Invalid day' });
    }

    if (!['igcse', 'general'].includes(category)) {
      return res.status(400).json({ error: 'Category must be igcse or general' });
    }

    const result = db.prepare(`
      INSERT INTO planner_tasks (user_id, subject, duration, day, category, completed, week_start)
      VALUES (?, ?, ?, ?, ?, 0, ?)
    `).run(req.user.id, subject, duration, day, category, weekStart);

    const task = db.prepare('SELECT * FROM planner_tasks WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ task });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update a task
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { subject, duration, day, category, completed } = req.body;

    // Check ownership
    const existing = db.prepare('SELECT * FROM planner_tasks WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    db.prepare(`
      UPDATE planner_tasks
      SET subject = ?, duration = ?, day = ?, category = ?, completed = ?
      WHERE id = ? AND user_id = ?
    `).run(
      subject ?? existing.subject,
      duration ?? existing.duration,
      day ?? existing.day,
      category ?? existing.category,
      completed !== undefined ? (completed ? 1 : 0) : existing.completed,
      id,
      req.user.id
    );

    const task = db.prepare('SELECT * FROM planner_tasks WHERE id = ?').get(id);
    res.json({ task });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Toggle task completion
router.patch('/:id/toggle', (req, res) => {
  try {
    const { id } = req.params;

    // Check ownership
    const existing = db.prepare('SELECT * FROM planner_tasks WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const newCompleted = existing.completed ? 0 : 1;
    db.prepare('UPDATE planner_tasks SET completed = ? WHERE id = ?').run(newCompleted, id);

    const task = db.prepare('SELECT * FROM planner_tasks WHERE id = ?').get(id);
    res.json({ task });
  } catch (error) {
    console.error('Toggle task error:', error);
    res.status(500).json({ error: 'Failed to toggle task' });
  }
});

// Delete a task
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    // Check ownership
    const existing = db.prepare('SELECT * FROM planner_tasks WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    db.prepare('DELETE FROM planner_tasks WHERE id = ? AND user_id = ?').run(id, req.user.id);
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Clear all tasks for a specific week
router.delete('/week/:weekStart', (req, res) => {
  try {
    const { weekStart } = req.params;

    db.prepare('DELETE FROM planner_tasks WHERE user_id = ? AND week_start = ?').run(req.user.id, weekStart);
    res.json({ message: 'Week cleared successfully' });
  } catch (error) {
    console.error('Clear week error:', error);
    res.status(500).json({ error: 'Failed to clear week' });
  }
});

export default router;
