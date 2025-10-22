const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get user preferences
router.get('/preferences', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT up.*, wc.website_url, wc.category as website_category
       FROM user_preferences up
       LEFT JOIN website_categories wc ON up.user_id = wc.user_id
       WHERE up.user_id = ?`,
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
        preferredStudyTimes: preferences.preferred_study_times ? JSON.parse(preferences.preferred_study_times) : [],
        notificationSettings: preferences.notification_settings ? JSON.parse(preferences.notification_settings) : {},
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
    const values = [];
    let paramIndex = 1;

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
        updateFields.push(`${dbField} = ?`);
        
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

    values.push(req.user.id);

    await db.run(
      `UPDATE user_preferences 
       SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`,
      values
    );

    const result = await db.query(
      'SELECT * FROM user_preferences WHERE user_id = ?',
      [req.user.id]
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

    // Check if exists
    const existing = await db.query(
      'SELECT id FROM website_categories WHERE user_id = ? AND website_url = ?',
      [req.user.id, websiteUrl]
    );

    let result;
    if (existing.rows.length > 0) {
      // Update existing
      await db.run(
        'UPDATE website_categories SET category = ?, created_at = CURRENT_TIMESTAMP WHERE user_id = ? AND website_url = ?',
        [category, req.user.id, websiteUrl]
      );
      result = await db.query(
        'SELECT * FROM website_categories WHERE user_id = ? AND website_url = ?',
        [req.user.id, websiteUrl]
      );
    } else {
      // Insert new
      const insertResult = await db.run(
        'INSERT INTO website_categories (user_id, website_url, category) VALUES (?, ?, ?)',
        [req.user.id, websiteUrl, category]
      );
      result = await db.query(
        'SELECT * FROM website_categories WHERE id = ?',
        [insertResult.lastID]
      );
    }

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
    const result = await db.query(
      'SELECT * FROM website_categories WHERE user_id = ? ORDER BY website_url',
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

    const result = await db.run(
      'DELETE FROM website_categories WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (result.changes === 0) {
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
    const result = await db.query(
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

    const userResult = await db.query(
      `SELECT u.*, up.study_hours_per_day, up.theme
       FROM users u
       LEFT JOIN user_preferences up ON u.id = up.user_id
       WHERE u.id = ?`,
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user statistics
    const statsResult = await db.query(
      `SELECT 
         (SELECT COUNT(*) FROM tasks WHERE user_id = ?) as total_tasks,
         (SELECT COUNT(*) FROM tasks WHERE user_id = ? AND status = 'completed') as completed_tasks,
         (SELECT COUNT(*) FROM syllabus WHERE user_id = ?) as total_syllabus,
         (SELECT COUNT(*) FROM syllabus WHERE user_id = ? AND completed = 1) as completed_syllabus,
         (SELECT AVG(average_productivity_rating) FROM performance_analytics WHERE user_id = ? AND date >= date('now', '-30 days')) as avg_productivity
      `,
      [id, id, id, id, id]
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