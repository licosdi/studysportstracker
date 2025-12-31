import express from 'express';
import db from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get weekly stats
router.get('/weekly', (req, res) => {
  try {
    const { weekStart } = req.query;

    if (!weekStart) {
      return res.status(400).json({ error: 'weekStart is required (YYYY-MM-DD)' });
    }

    // Calculate week end
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const endStr = end.toISOString().split('T')[0];

    // Get totals by area
    const totals = db.prepare(`
      SELECT
        area,
        SUM(duration_minutes) as totalMinutes,
        COUNT(*) as totalSessions
      FROM log_entries
      WHERE user_id = ? AND DATE(date_time) >= ? AND DATE(date_time) <= ?
      GROUP BY area
    `).all(req.user.id, weekStart, endStr);

    // Get study breakdown by category
    const studyBreakdown = db.prepare(`
      SELECT
        l.category_id as categoryId,
        sc.name as categoryName,
        sc.color as categoryColor,
        SUM(l.duration_minutes) as totalMinutes,
        COUNT(*) as sessions
      FROM log_entries l
      JOIN study_categories sc ON l.category_id = sc.id
      WHERE l.user_id = ? AND l.area = 'study' AND DATE(l.date_time) >= ? AND DATE(l.date_time) <= ?
      GROUP BY l.category_id
      ORDER BY totalMinutes DESC
    `).all(req.user.id, weekStart, endStr);

    // Get football breakdown by category
    const footballBreakdown = db.prepare(`
      SELECT
        l.category_id as categoryId,
        fc.name as categoryName,
        fc.color as categoryColor,
        fc.type as categoryType,
        SUM(l.duration_minutes) as totalMinutes,
        COUNT(*) as sessions
      FROM log_entries l
      JOIN football_categories fc ON l.category_id = fc.id
      WHERE l.user_id = ? AND l.area = 'football' AND DATE(l.date_time) >= ? AND DATE(l.date_time) <= ?
      GROUP BY l.category_id
      ORDER BY totalMinutes DESC
    `).all(req.user.id, weekStart, endStr);

    // Get daily breakdown
    const dailyBreakdown = db.prepare(`
      SELECT
        DATE(date_time) as date,
        area,
        SUM(duration_minutes) as totalMinutes,
        COUNT(*) as sessions
      FROM log_entries
      WHERE user_id = ? AND DATE(date_time) >= ? AND DATE(date_time) <= ?
      GROUP BY DATE(date_time), area
      ORDER BY date ASC
    `).all(req.user.id, weekStart, endStr);

    const studyTotal = totals.find(t => t.area === 'study') || { totalMinutes: 0, totalSessions: 0 };
    const footballTotal = totals.find(t => t.area === 'football') || { totalMinutes: 0, totalSessions: 0 };

    res.json({
      weekStart,
      weekEnd: endStr,
      study: {
        totalMinutes: studyTotal.totalMinutes || 0,
        totalSessions: studyTotal.totalSessions || 0,
        breakdown: studyBreakdown
      },
      football: {
        totalMinutes: footballTotal.totalMinutes || 0,
        totalSessions: footballTotal.totalSessions || 0,
        breakdown: footballBreakdown
      },
      daily: dailyBreakdown
    });
  } catch (error) {
    console.error('Get weekly stats error:', error);
    res.status(500).json({ error: 'Failed to fetch weekly stats' });
  }
});

// Get monthly stats
router.get('/monthly', (req, res) => {
  try {
    const { year, month } = req.query;

    if (!year || !month) {
      return res.status(400).json({ error: 'year and month are required' });
    }

    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0]; // Last day of month

    // Get totals by area
    const totals = db.prepare(`
      SELECT
        area,
        SUM(duration_minutes) as totalMinutes,
        COUNT(*) as totalSessions
      FROM log_entries
      WHERE user_id = ? AND DATE(date_time) >= ? AND DATE(date_time) <= ?
      GROUP BY area
    `).all(req.user.id, startDate, endDate);

    // Get study breakdown by category
    const studyBreakdown = db.prepare(`
      SELECT
        l.category_id as categoryId,
        sc.name as categoryName,
        sc.color as categoryColor,
        SUM(l.duration_minutes) as totalMinutes,
        COUNT(*) as sessions
      FROM log_entries l
      JOIN study_categories sc ON l.category_id = sc.id
      WHERE l.user_id = ? AND l.area = 'study' AND DATE(l.date_time) >= ? AND DATE(l.date_time) <= ?
      GROUP BY l.category_id
      ORDER BY totalMinutes DESC
    `).all(req.user.id, startDate, endDate);

    // Get football breakdown by category
    const footballBreakdown = db.prepare(`
      SELECT
        l.category_id as categoryId,
        fc.name as categoryName,
        fc.color as categoryColor,
        fc.type as categoryType,
        SUM(l.duration_minutes) as totalMinutes,
        COUNT(*) as sessions
      FROM log_entries l
      JOIN football_categories fc ON l.category_id = fc.id
      WHERE l.user_id = ? AND l.area = 'football' AND DATE(l.date_time) >= ? AND DATE(l.date_time) <= ?
      GROUP BY l.category_id
      ORDER BY totalMinutes DESC
    `).all(req.user.id, startDate, endDate);

    // Get weekly breakdown within month
    const weeklyBreakdown = db.prepare(`
      SELECT
        strftime('%W', date_time) as weekNumber,
        area,
        SUM(duration_minutes) as totalMinutes,
        COUNT(*) as sessions
      FROM log_entries
      WHERE user_id = ? AND DATE(date_time) >= ? AND DATE(date_time) <= ?
      GROUP BY weekNumber, area
      ORDER BY weekNumber ASC
    `).all(req.user.id, startDate, endDate);

    const studyTotal = totals.find(t => t.area === 'study') || { totalMinutes: 0, totalSessions: 0 };
    const footballTotal = totals.find(t => t.area === 'football') || { totalMinutes: 0, totalSessions: 0 };

    res.json({
      year: parseInt(year),
      month: parseInt(month),
      startDate,
      endDate,
      study: {
        totalMinutes: studyTotal.totalMinutes || 0,
        totalSessions: studyTotal.totalSessions || 0,
        breakdown: studyBreakdown
      },
      football: {
        totalMinutes: footballTotal.totalMinutes || 0,
        totalSessions: footballTotal.totalSessions || 0,
        breakdown: footballBreakdown
      },
      weekly: weeklyBreakdown
    });
  } catch (error) {
    console.error('Get monthly stats error:', error);
    res.status(500).json({ error: 'Failed to fetch monthly stats' });
  }
});

// Get dashboard summary (today + this week)
router.get('/dashboard', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Get week start (Monday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const weekStart = new Date(now.setDate(diff)).toISOString().split('T')[0];
    const weekEnd = new Date(new Date(weekStart).setDate(new Date(weekStart).getDate() + 6)).toISOString().split('T')[0];

    // Today's totals
    const todayTotals = db.prepare(`
      SELECT
        area,
        SUM(duration_minutes) as totalMinutes,
        COUNT(*) as sessions
      FROM log_entries
      WHERE user_id = ? AND DATE(date_time) = ?
      GROUP BY area
    `).all(req.user.id, today);

    // This week's totals
    const weekTotals = db.prepare(`
      SELECT
        area,
        SUM(duration_minutes) as totalMinutes,
        COUNT(*) as sessions
      FROM log_entries
      WHERE user_id = ? AND DATE(date_time) >= ? AND DATE(date_time) <= ?
      GROUP BY area
    `).all(req.user.id, weekStart, weekEnd);

    // Pending plan items for today
    const pendingToday = db.prepare(`
      SELECT COUNT(*) as count FROM plan_items
      WHERE user_id = ? AND date = ? AND status = 'planned'
    `).get(req.user.id, today);

    // Recent log entries (last 5)
    const recentLogs = db.prepare(`
      SELECT
        l.id, l.area, l.date_time as dateTime, l.title, l.duration_minutes as durationMinutes,
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
      ORDER BY l.date_time DESC
      LIMIT 5
    `).all(req.user.id);

    const todayStudy = todayTotals.find(t => t.area === 'study') || { totalMinutes: 0, sessions: 0 };
    const todayFootball = todayTotals.find(t => t.area === 'football') || { totalMinutes: 0, sessions: 0 };
    const weekStudy = weekTotals.find(t => t.area === 'study') || { totalMinutes: 0, sessions: 0 };
    const weekFootball = weekTotals.find(t => t.area === 'football') || { totalMinutes: 0, sessions: 0 };

    res.json({
      today: {
        date: today,
        study: { minutes: todayStudy.totalMinutes || 0, sessions: todayStudy.sessions || 0 },
        football: { minutes: todayFootball.totalMinutes || 0, sessions: todayFootball.sessions || 0 },
        pendingPlans: pendingToday.count
      },
      week: {
        startDate: weekStart,
        endDate: weekEnd,
        study: { minutes: weekStudy.totalMinutes || 0, sessions: weekStudy.sessions || 0 },
        football: { minutes: weekFootball.totalMinutes || 0, sessions: weekFootball.sessions || 0 }
      },
      recentLogs
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

export default router;
