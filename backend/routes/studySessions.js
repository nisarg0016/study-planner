const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Get all study sessions for the authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const result = await db.query(
      `SELECT ss.*, t.title as task_title, s.topic as syllabus_topic, e.title as event_title
       FROM study_sessions ss
       LEFT JOIN tasks t ON ss.task_id = t.id
       LEFT JOIN syllabus s ON ss.syllabus_id = s.id
       LEFT JOIN events e ON ss.event_id = e.id
       WHERE ss.user_id = ?
       ORDER BY ss.start_time DESC`,
      [userId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching study sessions:', error);
    res.status(500).json({ message: 'Error fetching study sessions' });
  }
});

// Get a specific study session
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const sessionId = req.params.id;
    
    const result = await db.query(
      `SELECT ss.*, t.title as task_title, s.topic as syllabus_topic, e.title as event_title
       FROM study_sessions ss
       LEFT JOIN tasks t ON ss.task_id = t.id
       LEFT JOIN syllabus s ON ss.syllabus_id = s.id
       LEFT JOIN events e ON ss.event_id = e.id
       WHERE ss.id = ? AND ss.user_id = ?`,
      [sessionId, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Study session not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching study session:', error);
    res.status(500).json({ message: 'Error fetching study session' });
  }
});

// Create a new study session
router.post('/', 
  authenticateToken,
  [
    body('start_time').isISO8601().withMessage('Start time must be a valid date'),
    body('end_time').optional({ nullable: true }).isISO8601().withMessage('End time must be a valid date'),
    body('duration_minutes').optional({ nullable: true }).isInt({ min: 0 }).withMessage('Duration must be a positive integer'),
    body('productivity_rating').optional({ nullable: true }).isInt({ min: 1, max: 5 }).withMessage('Productivity rating must be between 1 and 5'),
    body('task_id').optional({ nullable: true }).isInt().withMessage('Task ID must be an integer'),
    body('syllabus_id').optional({ nullable: true }).isInt().withMessage('Syllabus ID must be an integer'),
    body('event_id').optional({ nullable: true }).isInt().withMessage('Event ID must be an integer'),
    body('notes').optional({ nullable: true }).isString().withMessage('Notes must be a string'),
    body('break_count').optional({ nullable: true }).isInt({ min: 0 }).withMessage('Break count must be a non-negative integer')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const userId = req.user.userId;
      const {
        task_id,
        syllabus_id,
        event_id,
        start_time,
        end_time,
        duration_minutes,
        productivity_rating,
        notes,
        break_count
      } = req.body;

      const result = await db.run(
        `INSERT INTO study_sessions (
          user_id, task_id, syllabus_id, event_id, start_time, end_time,
          duration_minutes, productivity_rating, notes, break_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          task_id || null,
          syllabus_id || null,
          event_id || null,
          start_time,
          end_time || null,
          duration_minutes || null,
          productivity_rating || null,
          notes || null,
          break_count || 0
        ]
      );

      // Fetch the created session
      const createdSession = await db.query(
        'SELECT * FROM study_sessions WHERE id = ?',
        [result.lastID]
      );

      res.status(201).json(createdSession.rows[0]);
    } catch (error) {
      console.error('Error creating study session:', error);
      res.status(500).json({ message: 'Error creating study session' });
    }
  }
);

// Update a study session (e.g., to end it)
router.put('/:id',
  authenticateToken,
  [
    body('end_time').optional({ nullable: true }).isISO8601().withMessage('End time must be a valid date'),
    body('duration_minutes').optional({ nullable: true }).isInt({ min: 0 }).withMessage('Duration must be a positive integer'),
    body('productivity_rating').optional({ nullable: true }).isInt({ min: 1, max: 5 }).withMessage('Productivity rating must be between 1 and 5'),
    body('notes').optional({ nullable: true }).isString().withMessage('Notes must be a string'),
    body('break_count').optional({ nullable: true }).isInt({ min: 0 }).withMessage('Break count must be a non-negative integer')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const userId = req.user.userId;
      const sessionId = req.params.id;

      // Check if session exists and belongs to user
      const existingSession = await db.query(
        'SELECT * FROM study_sessions WHERE id = ? AND user_id = ?',
        [sessionId, userId]
      );

      if (existingSession.rows.length === 0) {
        return res.status(404).json({ message: 'Study session not found' });
      }

      const {
        end_time,
        duration_minutes,
        productivity_rating,
        notes,
        break_count
      } = req.body;

      // Build update query dynamically
      const updates = [];
      const values = [];

      if (end_time !== undefined) {
        updates.push('end_time = ?');
        values.push(end_time);
      }
      if (duration_minutes !== undefined) {
        updates.push('duration_minutes = ?');
        values.push(duration_minutes);
      }
      if (productivity_rating !== undefined) {
        updates.push('productivity_rating = ?');
        values.push(productivity_rating);
      }
      if (notes !== undefined) {
        updates.push('notes = ?');
        values.push(notes);
      }
      if (break_count !== undefined) {
        updates.push('break_count = ?');
        values.push(break_count);
      }

      if (updates.length === 0) {
        return res.status(400).json({ message: 'No fields to update' });
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(sessionId, userId);

      await db.run(
        `UPDATE study_sessions SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
        values
      );

      // Fetch updated session
      const updatedSession = await db.query(
        'SELECT * FROM study_sessions WHERE id = ?',
        [sessionId]
      );

      res.json(updatedSession.rows[0]);
    } catch (error) {
      console.error('Error updating study session:', error);
      res.status(500).json({ message: 'Error updating study session' });
    }
  }
);

// Delete a study session
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const sessionId = req.params.id;

    // Check if session exists and belongs to user
    const existingSession = await db.query(
      'SELECT * FROM study_sessions WHERE id = ? AND user_id = ?',
      [sessionId, userId]
    );

    if (existingSession.rows.length === 0) {
      return res.status(404).json({ message: 'Study session not found' });
    }

    await db.run('DELETE FROM study_sessions WHERE id = ? AND user_id = ?', [sessionId, userId]);
    
    res.json({ message: 'Study session deleted successfully' });
  } catch (error) {
    console.error('Error deleting study session:', error);
    res.status(500).json({ message: 'Error deleting study session' });
  }
});

// Get study session statistics
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { startDate, endDate } = req.query;

    let query = `
      SELECT 
        COUNT(*) as total_sessions,
        SUM(duration_minutes) as total_minutes,
        AVG(productivity_rating) as avg_productivity,
        SUM(break_count) as total_breaks
      FROM study_sessions
      WHERE user_id = ?
    `;
    const params = [userId];

    if (startDate) {
      query += ' AND start_time >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND start_time <= ?';
      params.push(endDate);
    }

    const result = await db.query(query, params);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching study session stats:', error);
    res.status(500).json({ message: 'Error fetching statistics' });
  }
});

module.exports = router;
