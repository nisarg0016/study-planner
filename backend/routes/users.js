const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get user preferences
router.get('/preferences', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT up.*, wc.website_url, wc.category as website_category
       FROM user_preferences up
       LEFT JOIN website_categories wc ON up.user_id = wc.user_id
       WHERE up.user_id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User preferences not found' });
    }

    const preferences = result.rows[0];
    const websiteCategories = result.rows
      .filter(row => row.website_url)
      .map(row => ({
        website_url: row.website_url,
        category: row.website_category
      }));

    res.json({
      preferences: {
        studyHoursPerDay: preferences.study_hours_per_day,
        breakDurationMinutes: preferences.break_duration_minutes,
        workSessionDurationMinutes: preferences.work_session_duration_minutes,
        preferredStudyTimes: preferences.preferred_study_times,
        notificationSettings: preferences.notification_settings,
        theme: preferences.theme,
        websiteCategories
      }
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update user preferences
router.put('/preferences', [
  body('studyHoursPerDay').optional().isInt({ min: 1, max: 16 }),
  body('breakDurationMinutes').optional().isInt({ min: 5, max: 60 }),
  body('workSessionDurationMinutes').optional().isInt({ min: 15, max: 180 }),
  body('preferredStudyTimes').optional().isArray(),
  body('notificationSettings').optional().isObject(),
  body('theme').optional().isIn(['light', 'dark', 'auto'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updateFields = [];
    const values = [req.user.id];
    let paramIndex = 2;

    const allowedFields = [
      'studyHoursPerDay', 'breakDurationMinutes', 'workSessionDurationMinutes',
      'preferredStudyTimes', 'notificationSettings', 'theme'
    ];

    const fieldMappings = {
      studyHoursPerDay: 'study_hours_per_day',
      breakDurationMinutes: 'break_duration_minutes',
      workSessionDurationMinutes: 'work_session_duration_minutes',
      preferredStudyTimes: 'preferred_study_times',
      notificationSettings: 'notification_settings'
    };

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        const dbField = fieldMappings[field] || field;
        updateFields.push(`${dbField} = $${paramIndex++}`);
        
        if (field === 'preferredStudyTimes' || field === 'notificationSettings') {
          values.push(JSON.stringify(req.body[field]));
        } else {
          values.push(req.body[field]);
        }
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    const result = await pool.query(
      `UPDATE user_preferences 
       SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 
       RETURNING *`,
      values
    );

    res.json({
      message: 'Preferences updated successfully',
      preferences: result.rows[0]
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Manage website categories for tracking
router.post('/website-categories', [
  body('websiteUrl').isURL(),
  body('category').isIn(['productive', 'neutral', 'distracting'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { websiteUrl, category } = req.body;

    const result = await pool.query(
      `INSERT INTO website_categories (user_id, website_url, category)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, website_url) 
       DO UPDATE SET category = $3, created_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [req.user.id, websiteUrl, category]
    );

    res.status(201).json({
      message: 'Website category updated successfully',
      websiteCategory: result.rows[0]
    });
  } catch (error) {
    console.error('Update website category error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get website categories
router.get('/website-categories', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM website_categories WHERE user_id = $1 ORDER BY website_url',
      [req.user.id]
    );

    res.json({ websiteCategories: result.rows });
  } catch (error) {
    console.error('Get website categories error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete website category
router.delete('/website-categories/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM website_categories WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Website category not found' });
    }

    res.json({ message: 'Website category deleted successfully' });
  } catch (error) {
    console.error('Delete website category error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Admin routes (for academic advisors)
router.get('/all', requireRole(['academic_advisor', 'admin']), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, first_name, last_name, role, created_at, last_login, is_active
       FROM users 
       ORDER BY created_at DESC`
    );

    res.json({ users: result.rows });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user details for academic advisors
router.get('/:id', requireRole(['academic_advisor', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const userResult = await pool.query(
      `SELECT u.*, up.study_hours_per_day, up.theme
       FROM users u
       LEFT JOIN user_preferences up ON u.id = up.user_id
       WHERE u.id = $1`,
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user statistics
    const statsResult = await pool.query(
      `SELECT 
         (SELECT COUNT(*) FROM tasks WHERE user_id = $1) as total_tasks,
         (SELECT COUNT(*) FROM tasks WHERE user_id = $1 AND status = 'completed') as completed_tasks,
         (SELECT COUNT(*) FROM syllabus WHERE user_id = $1) as total_syllabus,
         (SELECT COUNT(*) FROM syllabus WHERE user_id = $1 AND completed = true) as completed_syllabus,
         (SELECT AVG(average_productivity_rating) FROM performance_analytics WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '30 days') as avg_productivity
      `,
      [id]
    );

    res.json({
      user: userResult.rows[0],
      stats: statsResult.rows[0]
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;