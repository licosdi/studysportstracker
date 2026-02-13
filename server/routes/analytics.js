import express from 'express';
import db from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get weekly stats (optional area filter for per-area stats views)
router.get('/weekly', (req, res) => {
  try {
    const { weekStart, area } = req.query;

    if (!weekStart) {
      return res.status(400).json({ error: 'weekStart is required (YYYY-MM-DD)' });
    }

    // Calculate week end
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const endStr = end.toISOString().split('T')[0];

    // Get totals by area
    let totalsQuery = `
      SELECT
        area,
        SUM(duration_minutes) as totalMinutes,
        COUNT(*) as totalSessions
      FROM log_entries
      WHERE user_id = ? AND DATE(date_time) >= ? AND DATE(date_time) <= ?
    `;
    const totalsParams = [req.user.id, weekStart, endStr];
    if (area && ['study', 'football'].includes(area)) {
      totalsQuery += ' AND area = ?';
      totalsParams.push(area);
    }
    totalsQuery += ' GROUP BY area';
    const totals = db.prepare(totalsQuery).all(...totalsParams);

    // Get study breakdown by category
    const studyBreakdown = (!area || area === 'study') ? db.prepare(`
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
    `).all(req.user.id, weekStart, endStr) : [];

    // Get football breakdown by category
    const footballBreakdown = (!area || area === 'football') ? db.prepare(`
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
    `).all(req.user.id, weekStart, endStr) : [];

    // Get daily breakdown
    let dailyQuery = `
      SELECT
        DATE(date_time) as date,
        area,
        SUM(duration_minutes) as totalMinutes,
        COUNT(*) as sessions
      FROM log_entries
      WHERE user_id = ? AND DATE(date_time) >= ? AND DATE(date_time) <= ?
    `;
    const dailyParams = [req.user.id, weekStart, endStr];
    if (area && ['study', 'football'].includes(area)) {
      dailyQuery += ' AND area = ?';
      dailyParams.push(area);
    }
    dailyQuery += ' GROUP BY DATE(date_time), area ORDER BY date ASC';
    const dailyBreakdown = db.prepare(dailyQuery).all(...dailyParams);

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

// Get monthly stats (optional area filter for per-area stats views)
router.get('/monthly', (req, res) => {
  try {
    const { year, month, area } = req.query;

    if (!year || !month) {
      return res.status(400).json({ error: 'year and month are required' });
    }

    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0]; // Last day of month

    // Get totals by area
    let totalsQuery = `
      SELECT
        area,
        SUM(duration_minutes) as totalMinutes,
        COUNT(*) as totalSessions
      FROM log_entries
      WHERE user_id = ? AND DATE(date_time) >= ? AND DATE(date_time) <= ?
    `;
    const totalsParams = [req.user.id, startDate, endDate];
    if (area && ['study', 'football'].includes(area)) {
      totalsQuery += ' AND area = ?';
      totalsParams.push(area);
    }
    totalsQuery += ' GROUP BY area';
    const totals = db.prepare(totalsQuery).all(...totalsParams);

    // Get study breakdown by category
    const studyBreakdown = (!area || area === 'study') ? db.prepare(`
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
    `).all(req.user.id, startDate, endDate) : [];

    // Get football breakdown by category
    const footballBreakdown = (!area || area === 'football') ? db.prepare(`
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
    `).all(req.user.id, startDate, endDate) : [];

    // Get weekly breakdown within month
    let weeklyQuery = `
      SELECT
        strftime('%W', date_time) as weekNumber,
        area,
        SUM(duration_minutes) as totalMinutes,
        COUNT(*) as sessions
      FROM log_entries
      WHERE user_id = ? AND DATE(date_time) >= ? AND DATE(date_time) <= ?
    `;
    const weeklyParams = [req.user.id, startDate, endDate];
    if (area && ['study', 'football'].includes(area)) {
      weeklyQuery += ' AND area = ?';
      weeklyParams.push(area);
    }
    weeklyQuery += ' GROUP BY weekNumber, area ORDER BY weekNumber ASC';
    const weeklyBreakdown = db.prepare(weeklyQuery).all(...weeklyParams);

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

    // Today's schedule from weekly plan (day_of_week: 0=Monday ... 6=Sunday)
    const jsDay = new Date(today).getDay(); // 0=Sunday
    const todayDow = (jsDay + 6) % 7; // Convert to 0=Monday

    // Get weekly plan items for today that haven't been completed this week
    const todaySchedule = db.prepare(`
      SELECT
        w.id, w.area, w.title, w.duration_minutes as durationMinutes, w.intensity,
        CASE
          WHEN w.area = 'study' THEN sc.name
          WHEN w.area = 'football' THEN fc.name
        END as categoryName,
        CASE
          WHEN w.area = 'study' THEN sc.color
          WHEN w.area = 'football' THEN fc.color
        END as categoryColor,
        CASE WHEN l.id IS NOT NULL THEN 1 ELSE 0 END as isCompleted
      FROM weekly_plan_items w
      LEFT JOIN study_categories sc ON w.category_id = sc.id AND w.area = 'study'
      LEFT JOIN football_categories fc ON w.category_id = fc.id AND w.area = 'football'
      LEFT JOIN log_entries l ON l.weekly_plan_item_id = w.id
        AND DATE(l.date_time) >= ? AND DATE(l.date_time) <= ?
        AND l.user_id = ?
      WHERE w.user_id = ? AND w.day_of_week = ? AND w.is_active = 1
      ORDER BY w.created_at ASC
    `).all(weekStart, weekEnd, req.user.id, req.user.id, todayDow);

    const pendingToday = { count: todaySchedule.filter(s => !s.isCompleted).length };

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
        pendingPlans: pendingToday.count,
        schedule: todaySchedule
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
