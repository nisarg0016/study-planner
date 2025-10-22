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
    const taskStats = await db.query(
      `SELECT 
         COUNT(*) as total_tasks,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
         SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks,
         SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_tasks,
         SUM(CASE WHEN due_date < date('now') AND status != 'completed' THEN 1 ELSE 0 END) as overdue_tasks
       FROM tasks 
       WHERE user_id = ?`,
      [userId]
    );

    // Get syllabus progress
    const syllabusStats = await db.query(
      `SELECT 
         COUNT(*) as total_topics,
         SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_topics,
         AVG(completion_percentage) as avg_completion_percentage,
         COUNT(DISTINCT subject) as total_subjects
       FROM syllabus 
       WHERE user_id = ?`,
      [userId]
    );

    res.json({
      dashboard: {
        dailyAnalytics: dailyAnalytics.rows,
        taskStats: taskStats.rows[0] || {
          total_tasks: 0,
          completed_tasks: 0,
          in_progress_tasks: 0,
          pending_tasks: 0,
          overdue_tasks: 0
        },
        syllabusStats: syllabusStats.rows[0] || {
          total_topics: 0,
          completed_topics: 0,
          avg_completion_percentage: 0,
          total_subjects: 0
        }
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
    const categoryStats = await db.query(
      `SELECT 
         website_category,
         SUM(time_spent_minutes) as total_time_minutes,
         COUNT(DISTINCT website_url) as unique_websites,
         COUNT(*) as total_sessions
       FROM web_tracking 
       WHERE user_id = ? AND session_date BETWEEN ? AND ?
       GROUP BY website_category
       ORDER BY total_time_minutes DESC`,
      [userId, start, end]
    );

    // Get top websites by time spent
    const topWebsites = await db.query(
      `SELECT 
         website_url,
         website_category,
         SUM(time_spent_minutes) as total_time_minutes,
         COUNT(*) as session_count
       FROM web_tracking 
       WHERE user_id = ? AND session_date BETWEEN ? AND ?
       GROUP BY website_url, website_category
       ORDER BY total_time_minutes DESC
       LIMIT 10`,
      [userId, start, end]
    );

    // Get daily web usage patterns
    const dailyPatterns = await db.query(
      `SELECT 
         session_date,
         SUM(CASE WHEN website_category = 'productive' THEN time_spent_minutes ELSE 0 END) as productive_time,
         SUM(CASE WHEN website_category = 'distracting' THEN time_spent_minutes ELSE 0 END) as distracting_time,
         SUM(CASE WHEN website_category = 'neutral' THEN time_spent_minutes ELSE 0 END) as neutral_time
       FROM web_tracking 
       WHERE user_id = ? AND session_date BETWEEN ? AND ?
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
    const result = await db.run(
      `INSERT INTO web_tracking 
       (user_id, website_url, website_category, time_spent_minutes, session_date)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, websiteUrl, websiteCategory, timeSpentMinutes, date]
    );

    // Update or create daily analytics
    const existingAnalytics = await db.query(
      'SELECT id FROM performance_analytics WHERE user_id = ? AND date = ?',
      [userId, date]
    );

    if (existingAnalytics.rows.length > 0) {
      // Update existing record
      await db.run(
        `UPDATE performance_analytics 
         SET total_productive_time_minutes = total_productive_time_minutes + ?,
             total_distracting_time_minutes = total_distracting_time_minutes + ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ? AND date = ?`,
        [
          websiteCategory === 'productive' ? timeSpentMinutes : 0,
          websiteCategory === 'distracting' ? timeSpentMinutes : 0,
          userId,
          date
        ]
      );
    } else {
      // Create new record
      await db.run(
        `INSERT INTO performance_analytics 
         (user_id, date, total_productive_time_minutes, total_distracting_time_minutes)
         VALUES (?, ?, ?, ?)`,
        [
          userId,
          date,
          websiteCategory === 'productive' ? timeSpentMinutes : 0,
          websiteCategory === 'distracting' ? timeSpentMinutes : 0
        ]
      );
    }

    res.status(201).json({
      message: 'Web tracking data added successfully',
      webTracking: { id: result.lastID }
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

    const sessions = await db.query(
      `SELECT 
         ss.*,
         t.title as task_title,
         s.topic as syllabus_topic,
         s.subject as syllabus_subject
       FROM study_sessions ss
       LEFT JOIN tasks t ON ss.task_id = t.id
       LEFT JOIN syllabus s ON ss.syllabus_id = s.id
       WHERE ss.user_id = ? AND ss.start_time BETWEEN ? AND ?
       ORDER BY ss.start_time DESC`,
      [userId, start, end]
    );

    // Get session statistics
    const sessionStats = await db.query(
      `SELECT 
         COUNT(*) as total_sessions,
         AVG(duration_minutes) as avg_duration_minutes,
         SUM(duration_minutes) as total_study_minutes,
         AVG(productivity_rating) as avg_productivity_rating,
         SUM(CASE WHEN productivity_rating >= 4 THEN 1 ELSE 0 END) as high_productivity_sessions
       FROM study_sessions 
       WHERE user_id = ? AND start_time BETWEEN ? AND ?`,
      [userId, start, end]
    );

    res.json({
      studySessions: {
        sessions: sessions.rows,
        stats: sessionStats.rows[0] || {
          total_sessions: 0,
          avg_duration_minutes: 0,
          total_study_minutes: 0,
          avg_productivity_rating: 0,
          high_productivity_sessions: 0
        }
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

    const result = await db.run(
      `INSERT INTO study_sessions (user_id, task_id, syllabus_id, event_id, start_time)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [userId, taskId || null, syllabusId || null, eventId || null]
    );

    // Get the created session
    const session = await db.query(
      'SELECT * FROM study_sessions WHERE id = ?',
      [result.lastID]
    );

    res.status(201).json({
      message: 'Study session started',
      session: session.rows[0]
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

    // First check if session exists and belongs to user
    const existingSession = await db.query(
      'SELECT * FROM study_sessions WHERE id = ? AND user_id = ? AND end_time IS NULL',
      [id, userId]
    );

    if (existingSession.rows.length === 0) {
      return res.status(404).json({ message: 'Active study session not found' });
    }

    const session = existingSession.rows[0];

    // Calculate duration in minutes
    const startTime = new Date(session.start_time);
    const endTime = new Date();
    const durationMinutes = Math.round((endTime - startTime) / (1000 * 60));

    // Update the session
    await db.run(
      `UPDATE study_sessions 
       SET end_time = CURRENT_TIMESTAMP,
           duration_minutes = ?,
           productivity_rating = ?,
           notes = ?,
           break_count = ?
       WHERE id = ? AND user_id = ?`,
      [durationMinutes, productivityRating, notes, breakCount, id, userId]
    );

    // Get updated session
    const updatedSession = await db.query(
      'SELECT * FROM study_sessions WHERE id = ?',
      [id]
    );

    // Update daily analytics
    const sessionDate = new Date(session.start_time).toISOString().split('T')[0];
    
    const existingAnalytics = await db.query(
      'SELECT id FROM performance_analytics WHERE user_id = ? AND date = ?',
      [userId, sessionDate]
    );

    if (existingAnalytics.rows.length > 0) {
      // Update existing record
      await db.run(
        `UPDATE performance_analytics 
         SET total_study_time_minutes = total_study_time_minutes + ?,
             average_productivity_rating = (
               (average_productivity_rating + ?) / 2
             ),
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ? AND date = ?`,
        [durationMinutes, productivityRating, userId, sessionDate]
      );
    } else {
      // Create new record
      await db.run(
        `INSERT INTO performance_analytics 
         (user_id, date, total_study_time_minutes, average_productivity_rating)
         VALUES (?, ?, ?, ?)`,
        [userId, sessionDate, durationMinutes, productivityRating]
      );
    }

    res.json({
      message: 'Study session ended successfully',
      session: updatedSession.rows[0]
    });
  } catch (error) {
    console.error('End study session error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;