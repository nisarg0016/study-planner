const express = require('express');
const { body, validationResult, query } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all events for the authenticated user
router.get('/', [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('eventType').optional().isIn(['study_session', 'exam', 'assignment', 'meeting', 'break', 'other']),
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

    let whereConditions = ['e.user_id = ?'];
    let values = [req.user.id];

    if (startDate) {
      whereConditions.push(`e.start_time >= ?`);
      values.push(startDate);
    }
    if (endDate) {
      whereConditions.push(`e.start_time <= ?`);
      values.push(endDate);
    }
    if (eventType) {
      whereConditions.push(`e.event_type = ?`);
      values.push(eventType);
    }

    const query = `
      SELECT e.*, t.title as task_title, s.topic as syllabus_topic, s.subject as syllabus_subject
      FROM events e
      LEFT JOIN tasks t ON e.task_id = t.id AND t.user_id = e.user_id
      LEFT JOIN syllabus s ON e.syllabus_id = s.id AND s.user_id = e.user_id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY e.start_time ASC
      LIMIT ? OFFSET ?
    `;

    values.push(limit, offset);

    const result = await db.query(query, values);
    const events = result.rows || [];

    res.json({
      events,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: events.length
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

    const result = await db.query(
      `SELECT e.*, t.title as task_title, s.topic as syllabus_topic, s.subject as syllabus_subject
       FROM events e
       LEFT JOIN tasks t ON e.task_id = t.id AND t.user_id = e.user_id
       LEFT JOIN syllabus s ON e.syllabus_id = s.id AND s.user_id = e.user_id
       WHERE e.id = ? AND e.user_id = ?`,
      [id, req.user.id]
    );

    const rows = result.rows || [];
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json({ event: rows[0] });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create a new event
router.post('/', [
  body('title').trim().isLength({ min: 1, max: 255 }),
  body('description').optional({ nullable: true }).isString(),
  body('event_type').optional().isIn(['study_session', 'exam', 'assignment', 'meeting', 'break', 'other']),
  body('start_date').isISO8601(),
  body('end_date').optional({ nullable: true }).isISO8601(),
  body('location').optional({ nullable: true }).isLength({ max: 255 }),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('is_recurring').optional({ nullable: true }).isBoolean(),
  body('recurrence_pattern').optional({ nullable: true }).isString(),
  body('attendees').optional({ nullable: true }).isString(),
  body('reminders').optional({ nullable: true }).isInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      title, 
      description, 
      event_type = 'study_session', 
      start_date, 
      end_date, 
      location, 
      priority = 'medium',
      is_recurring = false,
      recurrence_pattern,
      attendees,
      reminders
    } = req.body;

    // Validate time range if end_date is provided
    if (end_date && new Date(end_date) <= new Date(start_date)) {
      return res.status(400).json({ message: 'End time must be after start time' });
    }

    const result = await db.run(
      `INSERT INTO events 
       (user_id, title, description, event_type, start_time, end_time, location, 
        priority, is_recurring, recurrence_pattern, attendees, reminders, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled')`,
      [req.user.id, title, description, event_type, start_date, end_date, location,
       priority, is_recurring ? 1 : 0, recurrence_pattern, attendees, reminders]
    );

    // Get the created record
    const createdRecord = await db.query(
      'SELECT * FROM events WHERE id = ?',
      [result.lastID]
    );

    res.status(201).json({
      message: 'Event created successfully',
      event: (createdRecord.rows || [])[0]
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update an event
router.put('/:id', [
  body('title').optional({ nullable: true }).trim().isLength({ min: 1, max: 255 }),
  body('description').optional({ nullable: true }).isString(),
  body('event_type').optional().isIn(['study_session', 'exam', 'assignment', 'meeting', 'break', 'other']),
  body('start_date').optional({ nullable: true }).isISO8601(),
  body('end_date').optional({ nullable: true }).isISO8601(),
  body('location').optional({ nullable: true }).isLength({ max: 255 }),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('status').optional().isIn(['scheduled', 'in_progress', 'completed', 'cancelled']),
  body('is_recurring').optional({ nullable: true }).isBoolean(),
  body('recurrence_pattern').optional({ nullable: true }).isString(),
  body('attendees').optional({ nullable: true }).isString(),
  body('reminders').optional({ nullable: true }).isInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updateFields = [];
    const values = [];

    const allowedFields = [
      'title', 'description', 'event_type', 'start_date', 'end_date', 'location',
      'priority', 'status', 'is_recurring', 'recurrence_pattern', 'attendees', 'reminders'
    ];

    // Field mapping from frontend to database column names
    const fieldMappings = {
      'start_date': 'start_time',
      'end_date': 'end_time'
    };

    // Validate time range if both times are provided
    if (req.body.start_date && req.body.end_date) {
      if (new Date(req.body.end_date) <= new Date(req.body.start_date)) {
        return res.status(400).json({ message: 'End time must be after start time' });
      }
    }

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        const dbField = fieldMappings[field] || field;
        updateFields.push(`${dbField} = ?`);
        if (field === 'is_recurring') {
          values.push(req.body[field] ? 1 : 0);
        } else {
          values.push(req.body[field]);
        }
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    values.push(req.user.id, id);

    const result = await db.run(
      `UPDATE events 
       SET ${updateFields.join(', ')}, updated_at = datetime('now')
       WHERE user_id = ? AND id = ?`,
      values
    );

    if (result.changes === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Get the updated record
    const updatedRecord = await db.query(
      'SELECT * FROM events WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    res.json({
      message: 'Event updated successfully',
      event: (updatedRecord.rows || [])[0]
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

    const result = await db.run(
      'DELETE FROM events WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (result.changes === 0) {
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

    const result = await db.query(
      `SELECT e.*, t.title as task_title, s.topic as syllabus_topic, s.subject as syllabus_subject
       FROM events e
       LEFT JOIN tasks t ON e.task_id = t.id AND t.user_id = e.user_id
       LEFT JOIN syllabus s ON e.syllabus_id = s.id AND s.user_id = e.user_id
       WHERE e.user_id = ? 
       AND e.start_time >= ? 
       AND e.start_time <= ?
       ORDER BY e.start_time ASC`,
      [req.user.id, startDate, endDate]
    );

    res.json({ events: result.rows || [] });
  } catch (error) {
    console.error('Get calendar events error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;