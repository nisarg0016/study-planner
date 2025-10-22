const express = require('express');
const { body, validationResult, query } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all events for the authenticated user
router.get('/', [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('eventType').optional().isIn(['study', 'exam', 'assignment', 'meeting', 'break', 'other']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { startDate, endDate, eventType, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = ['user_id = $1'];
    let values = [req.user.id];
    let paramIndex = 2;

    if (startDate) {
      whereConditions.push(`start_time >= $${paramIndex++}`);
      values.push(startDate);
    }
    if (endDate) {
      whereConditions.push(`start_time <= $${paramIndex++}`);
      values.push(endDate);
    }
    if (eventType) {
      whereConditions.push(`event_type = $${paramIndex++}`);
      values.push(eventType);
    }

    const query = `
      SELECT e.*, t.title as task_title, s.topic as syllabus_topic, s.subject as syllabus_subject
      FROM events e
      LEFT JOIN tasks t ON e.task_id = t.id
      LEFT JOIN syllabus s ON e.syllabus_id = s.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY start_time ASC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;

    values.push(limit, offset);

    const result = await pool.query(query, values);

    res.json({
      events: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.rows.length
      }
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get a specific event
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT e.*, t.title as task_title, s.topic as syllabus_topic, s.subject as syllabus_subject
       FROM events e
       LEFT JOIN tasks t ON e.task_id = t.id
       LEFT JOIN syllabus s ON e.syllabus_id = s.id
       WHERE e.id = $1 AND e.user_id = $2`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json({ event: result.rows[0] });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create a new event
router.post('/', [
  body('title').trim().isLength({ min: 1, max: 255 }),
  body('description').optional().isString(),
  body('eventType').optional().isIn(['study', 'exam', 'assignment', 'meeting', 'break', 'other']),
  body('startTime').isISO8601(),
  body('endTime').isISO8601(),
  body('location').optional().isLength({ max: 255 }),
  body('isAllDay').optional().isBoolean(),
  body('recurrencePattern').optional().isString(),
  body('recurrenceEndDate').optional().isISO8601(),
  body('taskId').optional().isInt(),
  body('syllabusId').optional().isInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      title, 
      description, 
      eventType = 'study', 
      startTime, 
      endTime, 
      location, 
      isAllDay = false,
      recurrencePattern,
      recurrenceEndDate,
      taskId,
      syllabusId
    } = req.body;

    // Validate time range
    if (new Date(endTime) <= new Date(startTime)) {
      return res.status(400).json({ message: 'End time must be after start time' });
    }

    // Validate task/syllabus ownership if provided
    if (taskId) {
      const taskCheck = await pool.query(
        'SELECT id FROM tasks WHERE id = $1 AND user_id = $2',
        [taskId, req.user.id]
      );
      if (taskCheck.rows.length === 0) {
        return res.status(400).json({ message: 'Invalid task ID' });
      }
    }

    if (syllabusId) {
      const syllabusCheck = await pool.query(
        'SELECT id FROM syllabus WHERE id = $1 AND user_id = $2',
        [syllabusId, req.user.id]
      );
      if (syllabusCheck.rows.length === 0) {
        return res.status(400).json({ message: 'Invalid syllabus ID' });
      }
    }

    const result = await pool.query(
      `INSERT INTO events 
       (user_id, title, description, event_type, start_time, end_time, location, 
        is_all_day, recurrence_pattern, recurrence_end_date, task_id, syllabus_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [req.user.id, title, description, eventType, startTime, endTime, location,
       isAllDay, recurrencePattern, recurrenceEndDate, taskId, syllabusId]
    );

    res.status(201).json({
      message: 'Event created successfully',
      event: result.rows[0]
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update an event
router.put('/:id', [
  body('title').optional().trim().isLength({ min: 1, max: 255 }),
  body('description').optional().isString(),
  body('eventType').optional().isIn(['study', 'exam', 'assignment', 'meeting', 'break', 'other']),
  body('startTime').optional().isISO8601(),
  body('endTime').optional().isISO8601(),
  body('location').optional().isLength({ max: 255 }),
  body('isAllDay').optional().isBoolean(),
  body('recurrencePattern').optional().isString(),
  body('recurrenceEndDate').optional().isISO8601(),
  body('taskId').optional().isInt(),
  body('syllabusId').optional().isInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updateFields = [];
    const values = [req.user.id, id];
    let paramIndex = 3;

    const allowedFields = [
      'title', 'description', 'eventType', 'startTime', 'endTime', 'location',
      'isAllDay', 'recurrencePattern', 'recurrenceEndDate', 'taskId', 'syllabusId'
    ];

    const fieldMappings = {
      eventType: 'event_type',
      startTime: 'start_time',
      endTime: 'end_time',
      isAllDay: 'is_all_day',
      recurrencePattern: 'recurrence_pattern',
      recurrenceEndDate: 'recurrence_end_date',
      taskId: 'task_id',
      syllabusId: 'syllabus_id'
    };

    // Validate time range if both times are provided
    if (req.body.startTime && req.body.endTime) {
      if (new Date(req.body.endTime) <= new Date(req.body.startTime)) {
        return res.status(400).json({ message: 'End time must be after start time' });
      }
    }

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        const dbField = fieldMappings[field] || field;
        updateFields.push(`${dbField} = $${paramIndex++}`);
        values.push(req.body[field]);
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    const result = await pool.query(
      `UPDATE events 
       SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND id = $2 
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json({
      message: 'Event updated successfully',
      event: result.rows[0]
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete an event
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM events WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get events for calendar view (month/week/day)
router.get('/calendar/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params;
    
    // Get all events for the specified month
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = `${year}-${month.padStart(2, '0')}-31`;

    const result = await pool.query(
      `SELECT e.*, t.title as task_title, s.topic as syllabus_topic, s.subject as syllabus_subject
       FROM events e
       LEFT JOIN tasks t ON e.task_id = t.id
       LEFT JOIN syllabus s ON e.syllabus_id = s.id
       WHERE e.user_id = $1 
       AND e.start_time >= $2 
       AND e.start_time <= $3
       ORDER BY e.start_time ASC`,
      [req.user.id, startDate, endDate]
    );

    res.json({ events: result.rows });
  } catch (error) {
    console.error('Get calendar events error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;