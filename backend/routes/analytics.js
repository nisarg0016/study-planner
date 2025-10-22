const express = require('express');
const { body, validationResult, query } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get performance dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.user.id;

    // Default to last 30 days if no date range provided
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    // Get daily performance analytics
    const dailyAnalytics = await db.query(
      `SELECT date, total_study_time_minutes, total_productive_time_minutes, 
              total_distracting_time_minutes, tasks_completed, tasks_created,
              average_productivity_rating
       FROM performance_analytics 
       WHERE user_id = ? AND date BETWEEN ? AND ?
       ORDER BY date ASC`,
      [userId, start, end]
    );

    // Get task completion statistics
    const taskStats = await pool.query(
      `SELECT 
         COUNT(*) as total_tasks,
         COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
         COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_tasks,
         COUNT(*) FILTER (WHERE status = 'pending') as pending_tasks,
         COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status != 'completed') as overdue_tasks,
         AVG(CASE WHEN actual_hours IS NOT NULL AND estimated_hours IS NOT NULL 
             THEN actual_hours / estimated_hours ELSE NULL END) as avg_time_accuracy
       FROM tasks 
       WHERE user_id = $1`,
      [userId]
    );

    // Get syllabus progress
    const syllabusStats = await pool.query(
      `SELECT 
         COUNT(*) as total_topics,
         COUNT(*) FILTER (WHERE completed = true) as completed_topics,
         AVG(completion_percentage) as avg_completion_percentage,
         COUNT(DISTINCT subject) as total_subjects
       FROM syllabus 
       WHERE user_id = $1`,
      [userId]
    );

    // Get productivity trends (last 7 days vs previous 7 days)
    const productivityTrend = await pool.query(
      `SELECT 
         CASE 
           WHEN date >= CURRENT_DATE - INTERVAL '7 days' THEN 'current_week'
           ELSE 'previous_week'
         END as period,
         AVG(total_study_time_minutes) as avg_study_time,
         AVG(total_productive_time_minutes) as avg_productive_time,
         AVG(average_productivity_rating) as avg_rating
       FROM performance_analytics 
       WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '14 days'
       GROUP BY period`,
      [userId]
    );

    res.json({
      dashboard: {
        dailyAnalytics: dailyAnalytics.rows,
        taskStats: taskStats.rows[0],
        syllabusStats: syllabusStats.rows[0],
        productivityTrend: productivityTrend.rows
      }
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get web tracking statistics
router.get('/web-tracking', [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
], async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.user.id;

    const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    // Get web tracking data grouped by category
    const categoryStats = await pool.query(
      `SELECT 
         website_category,
         SUM(time_spent_minutes) as total_time_minutes,
         COUNT(DISTINCT website_url) as unique_websites,
         COUNT(*) as total_sessions
       FROM web_tracking 
       WHERE user_id = $1 AND session_date BETWEEN $2 AND $3
       GROUP BY website_category
       ORDER BY total_time_minutes DESC`,
      [userId, start, end]
    );

    // Get top websites by time spent
    const topWebsites = await pool.query(
      `SELECT 
         website_url,
         website_category,
         SUM(time_spent_minutes) as total_time_minutes,
         COUNT(*) as session_count
       FROM web_tracking 
       WHERE user_id = $1 AND session_date BETWEEN $2 AND $3
       GROUP BY website_url, website_category
       ORDER BY total_time_minutes DESC
       LIMIT 10`,
      [userId, start, end]
    );

    // Get daily web usage patterns
    const dailyPatterns = await pool.query(
      `SELECT 
         session_date,
         SUM(CASE WHEN website_category = 'productive' THEN time_spent_minutes ELSE 0 END) as productive_time,
         SUM(CASE WHEN website_category = 'distracting' THEN time_spent_minutes ELSE 0 END) as distracting_time,
         SUM(CASE WHEN website_category = 'neutral' THEN time_spent_minutes ELSE 0 END) as neutral_time
       FROM web_tracking 
       WHERE user_id = $1 AND session_date BETWEEN $2 AND $3
       GROUP BY session_date
       ORDER BY session_date ASC`,
      [userId, start, end]
    );

    res.json({
      webTracking: {
        categoryStats: categoryStats.rows,
        topWebsites: topWebsites.rows,
        dailyPatterns: dailyPatterns.rows
      }
    });
  } catch (error) {
    console.error('Get web tracking error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Add web tracking data (manual entry for simulation)
router.post('/web-tracking', [
  body('websiteUrl').isURL(),
  body('websiteCategory').isIn(['productive', 'neutral', 'distracting']),
  body('timeSpentMinutes').isInt({ min: 1 }),
  body('sessionDate').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { websiteUrl, websiteCategory, timeSpentMinutes, sessionDate } = req.body;
    const userId = req.user.id;
    const date = sessionDate ? sessionDate.split('T')[0] : new Date().toISOString().split('T')[0];

    // Insert web tracking data
    const result = await pool.query(
      `INSERT INTO web_tracking 
       (user_id, website_url, website_category, time_spent_minutes, session_date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, websiteUrl, websiteCategory, timeSpentMinutes, date]
    );

    // Update or create daily analytics
    await pool.query(
      `INSERT INTO performance_analytics 
       (user_id, date, total_productive_time_minutes, total_distracting_time_minutes)
       VALUES ($1, $2, 
               CASE WHEN $3 = 'productive' THEN $4 ELSE 0 END,
               CASE WHEN $3 = 'distracting' THEN $4 ELSE 0 END)
       ON CONFLICT (user_id, date) 
       DO UPDATE SET
         total_productive_time_minutes = performance_analytics.total_productive_time_minutes + 
           CASE WHEN $3 = 'productive' THEN $4 ELSE 0 END,
         total_distracting_time_minutes = performance_analytics.total_distracting_time_minutes + 
           CASE WHEN $3 = 'distracting' THEN $4 ELSE 0 END`,
      [userId, date, websiteCategory, timeSpentMinutes]
    );

    res.status(201).json({
      message: 'Web tracking data added successfully',
      webTracking: result.rows[0]
    });
  } catch (error) {
    console.error('Add web tracking error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get study session analytics
router.get('/study-sessions', [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
], async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.user.id;

    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const end = endDate || new Date().toISOString();

    const sessions = await pool.query(
      `SELECT 
         ss.*,
         t.title as task_title,
         s.topic as syllabus_topic,
         s.subject as syllabus_subject
       FROM study_sessions ss
       LEFT JOIN tasks t ON ss.task_id = t.id
       LEFT JOIN syllabus s ON ss.syllabus_id = s.id
       WHERE ss.user_id = $1 AND ss.start_time BETWEEN $2 AND $3
       ORDER BY ss.start_time DESC`,
      [userId, start, end]
    );

    // Get session statistics
    const sessionStats = await pool.query(
      `SELECT 
         COUNT(*) as total_sessions,
         AVG(duration_minutes) as avg_duration_minutes,
         SUM(duration_minutes) as total_study_minutes,
         AVG(productivity_rating) as avg_productivity_rating,
         COUNT(*) FILTER (WHERE productivity_rating >= 4) as high_productivity_sessions
       FROM study_sessions 
       WHERE user_id = $1 AND start_time BETWEEN $2 AND $3`,
      [userId, start, end]
    );

    res.json({
      studySessions: {
        sessions: sessions.rows,
        stats: sessionStats.rows[0]
      }
    });
  } catch (error) {
    console.error('Get study sessions error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Start a study session
router.post('/study-sessions', [
  body('taskId').optional().isInt(),
  body('syllabusId').optional().isInt(),
  body('eventId').optional().isInt()
], async (req, res) => {
  try {
    const { taskId, syllabusId, eventId } = req.body;
    const userId = req.user.id;

    const result = await pool.query(
      `INSERT INTO study_sessions (user_id, task_id, syllabus_id, event_id, start_time)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       RETURNING *`,
      [userId, taskId || null, syllabusId || null, eventId || null]
    );

    res.status(201).json({
      message: 'Study session started',
      session: result.rows[0]
    });
  } catch (error) {
    console.error('Start study session error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// End a study session
router.put('/study-sessions/:id/end', [
  body('productivityRating').isInt({ min: 1, max: 5 }),
  body('notes').optional().isString(),
  body('breakCount').optional().isInt({ min: 0 })
], async (req, res) => {
  try {
    const { id } = req.params;
    const { productivityRating, notes, breakCount } = req.body;
    const userId = req.user.id;

    const result = await pool.query(
      `UPDATE study_sessions 
       SET end_time = CURRENT_TIMESTAMP,
           duration_minutes = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - start_time)) / 60,
           productivity_rating = $1,
           notes = $2,
           break_count = $3
       WHERE id = $4 AND user_id = $5 AND end_time IS NULL
       RETURNING *`,
      [productivityRating, notes, breakCount, id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Active study session not found' });
    }

    const session = result.rows[0];

    // Update daily analytics
    const sessionDate = new Date(session.start_time).toISOString().split('T')[0];
    await pool.query(
      `INSERT INTO performance_analytics 
       (user_id, date, total_study_time_minutes, average_productivity_rating)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, date) 
       DO UPDATE SET
         total_study_time_minutes = performance_analytics.total_study_time_minutes + $3,
         average_productivity_rating = 
           (performance_analytics.average_productivity_rating + $4) / 2`,
      [userId, sessionDate, session.duration_minutes, productivityRating]
    );

    res.json({
      message: 'Study session ended successfully',
      session: session
    });
  } catch (error) {
    console.error('End study session error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;