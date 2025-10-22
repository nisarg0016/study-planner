const express = require('express');
const { body, validationResult, query } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get notifications for the authenticated user
router.get('/', [
  query('read').optional().isBoolean(),
  query('type').optional().isIn(['task_due', 'progress_reminder', 'course_update', 'achievement', 'system']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { read, type, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = ['user_id = ?'];
    let values = [req.user.id];

    if (read !== undefined) {
      whereConditions.push('is_read = ?');
      values.push(read === 'true' ? 1 : 0);
    }

    if (type) {
      whereConditions.push('type = ?');
      values.push(type);
    }

    const query = `
      SELECT * FROM notifications 
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    values.push(parseInt(limit), offset);

    const countQuery = `
      SELECT COUNT(*) as total FROM notifications 
      WHERE ${whereConditions.join(' AND ')}
    `;

    const [notifications, total] = await Promise.all([
      db.query(query, values),
      db.query(countQuery, values.slice(0, -2)) // Remove limit and offset for count
    ]);

    res.json({
      notifications: notifications.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total.rows[0].total,
        totalPages: Math.ceil(total.rows[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create a new notification (admin/advisor only)
router.post('/', requireRole(['academic_advisor', 'admin']), [
  body('user_id').isInt(),
  body('title').trim().isLength({ min: 1, max: 255 }),
  body('message').trim().isLength({ min: 1 }),
  body('type').isIn(['task_due', 'progress_reminder', 'course_update', 'achievement', 'system']),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  body('action_url').optional().isURL()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: errors.array() 
      });
    }

    const { user_id, title, message, type, priority = 'medium', action_url } = req.body;

    // Check if target user exists
    const user = await db.query(
      'SELECT id FROM users WHERE id = ?',
      [user_id]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const result = await db.run(
      `INSERT INTO notifications 
       (user_id, title, message, type, priority, action_url, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user_id, title, message, type, priority, action_url, req.user.id]
    );

    const notification = await db.query(
      'SELECT * FROM notifications WHERE id = ?',
      [result.lastID]
    );

    res.status(201).json({
      message: 'Notification created successfully',
      notification: notification.rows[0]
    });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Mark notification as read
router.put('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.run(
      'UPDATE notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Mark all notifications as read
router.put('/read-all', async (req, res) => {
  try {
    await db.run(
      'UPDATE notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND is_read = 0',
      [req.user.id]
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete notification
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.run(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get progress tracking data for admin/advisor
router.get('/progress-tracking', requireRole(['academic_advisor', 'admin']), [
  query('user_id').optional().isInt(),
  query('course_id').optional().isInt(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { user_id, course_id, startDate, endDate } = req.query;

    let whereConditions = ['1=1'];
    let values = [];

    if (user_id) {
      whereConditions.push('t.user_id = ?');
      values.push(user_id);
    }

    if (startDate) {
      whereConditions.push('t.created_at >= ?');
      values.push(startDate);
    }

    if (endDate) {
      whereConditions.push('t.created_at <= ?');
      values.push(endDate);
    }

    // Get task completion statistics
    const taskStats = await db.query(`
      SELECT 
        u.id as user_id,
        u.first_name || ' ' || u.last_name as student_name,
        COUNT(t.id) as total_tasks,
        COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress_tasks,
        COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as pending_tasks,
        AVG(CASE WHEN t.status = 'completed' AND t.actual_hours IS NOT NULL 
            THEN t.actual_hours ELSE NULL END) as avg_actual_hours,
        AVG(t.difficulty_level) as avg_difficulty
      FROM users u
      LEFT JOIN tasks t ON u.id = t.user_id AND ${whereConditions.join(' AND ')}
      WHERE u.role = 'user'
      GROUP BY u.id, u.first_name, u.last_name
      ORDER BY completed_tasks DESC
    `, values);

    // Get syllabus completion statistics
    const syllabusStats = await db.query(`
      SELECT 
        u.id as user_id,
        u.first_name || ' ' || u.last_name as student_name,
        COUNT(s.id) as total_syllabus_items,
        COUNT(CASE WHEN s.completed = 1 THEN 1 END) as completed_syllabus_items,
        AVG(s.completion_percentage) as avg_completion_percentage
      FROM users u
      LEFT JOIN syllabus s ON u.id = s.user_id
      WHERE u.role = 'user'
      GROUP BY u.id, u.first_name, u.last_name
    `);

    res.json({
      task_statistics: taskStats.rows,
      syllabus_statistics: syllabusStats.rows
    });
  } catch (error) {
    console.error('Get progress tracking error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create automated progress notifications
router.post('/create-progress-notifications', requireRole(['academic_advisor', 'admin']), async (req, res) => {
  try {
    const notifications = [];

    // Find students with overdue tasks
    const overdueTasks = await db.query(`
      SELECT DISTINCT t.user_id, u.first_name, u.last_name, COUNT(t.id) as overdue_count
      FROM tasks t
      JOIN users u ON t.user_id = u.id
      WHERE t.due_date < CURRENT_DATE 
        AND t.status NOT IN ('completed', 'cancelled')
        AND u.role = 'user'
      GROUP BY t.user_id, u.first_name, u.last_name
    `);

    for (const task of overdueTasks.rows) {
      await db.run(
        `INSERT INTO notifications 
         (user_id, title, message, type, priority, created_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          task.user_id,
          'Overdue Tasks Reminder',
          `You have ${task.overdue_count} overdue task(s). Please review and complete them as soon as possible.`,
          'task_due',
          'high',
          req.user.id
        ]
      );
      notifications.push(`Reminder sent to ${task.first_name} ${task.last_name}`);
    }

    // Find students with low progress
    const lowProgress = await db.query(`
      SELECT u.id as user_id, u.first_name, u.last_name,
             COUNT(t.id) as total_tasks,
             COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks
      FROM users u
      LEFT JOIN tasks t ON u.id = t.user_id 
        AND t.created_at >= date('now', '-30 days')
      WHERE u.role = 'user'
      GROUP BY u.id, u.first_name, u.last_name
      HAVING total_tasks > 0 
        AND (completed_tasks * 100.0 / total_tasks) < 50
    `);

    for (const student of lowProgress.rows) {
      const completionRate = (student.completed_tasks / student.total_tasks * 100).toFixed(1);
      await db.run(
        `INSERT INTO notifications 
         (user_id, title, message, type, priority, created_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          student.user_id,
          'Progress Check-in',
          `Your task completion rate is ${completionRate}% this month. Consider reviewing your study schedule and reaching out for support if needed.`,
          'progress_reminder',
          'medium',
          req.user.id
        ]
      );
      notifications.push(`Progress reminder sent to ${student.first_name} ${student.last_name}`);
    }

    res.json({
      message: 'Progress notifications created successfully',
      notifications_sent: notifications.length,
      details: notifications
    });
  } catch (error) {
    console.error('Create progress notifications error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;