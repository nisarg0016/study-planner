const express = require('express');
const { body, validationResult, query } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all tasks for the authenticated user
router.get('/', [
  query('status').optional().isIn(['pending', 'in_progress', 'completed', 'cancelled']),
  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  query('subject').optional().isString(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status, priority, subject, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = ['user_id = ?'];
    let values = [req.user.id];

    if (status) {
      whereConditions.push('status = ?');
      values.push(status);
    }
    if (priority) {
      whereConditions.push('priority = ?');
      values.push(priority);
    }
    if (subject) {
      whereConditions.push('subject LIKE ?');
      values.push(`%${subject}%`);
    }

    const query = `
      SELECT id, title, description, subject, priority, status, due_date,
             estimated_hours, actual_hours, difficulty_level, created_at, updated_at, completed_at
      FROM tasks 
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY 
        CASE 
          WHEN due_date IS NULL THEN 1 
          ELSE 0 
        END,
        due_date ASC,
        CASE priority 
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END
      LIMIT ? OFFSET ?
    `;

    values.push(limit, offset);

    const result = await db.query(query, values);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM tasks 
      WHERE ${whereConditions.join(' AND ')}
    `;
    const countResult = await db.query(countQuery, values.slice(0, -2));

    res.json({
      tasks: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
        totalPages: Math.ceil(countResult.rows[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get a specific task
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'SELECT * FROM tasks WHERE user_id = ? AND id = ?',
      [req.user.id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json({ task: result.rows[0] });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create a new task
router.post('/', [
  body('title').trim().isLength({ min: 1, max: 255 }),
  body('description').optional().isString(),
  body('subject').optional().isLength({ max: 100 }),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('dueDate').optional().isISO8601(),
  body('estimatedHours').optional().isFloat({ min: 0 }),
  body('difficultyLevel').optional().isInt({ min: 1, max: 5 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      title, 
      description, 
      subject, 
      priority = 'medium', 
      dueDate, 
      estimatedHours, 
      difficultyLevel 
    } = req.body;

    const result = await db.run(
      `INSERT INTO tasks 
       (user_id, title, description, subject, priority, due_date, estimated_hours, difficulty_level)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, title, description, subject, priority, dueDate, estimatedHours, difficultyLevel]
    );

    // Get the created task
    const createdTask = await db.query(
      'SELECT * FROM tasks WHERE id = ?',
      [result.lastID]
    );

    res.status(201).json({
      message: 'Task created successfully',
      task: createdTask.rows[0]
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update a task
router.put('/:id', [
  body('title').optional().trim().isLength({ min: 1, max: 255 }),
  body('description').optional().isString(),
  body('subject').optional().isLength({ max: 100 }),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('status').optional().isIn(['pending', 'in_progress', 'completed', 'cancelled']),
  body('dueDate').optional().isISO8601(),
  body('estimatedHours').optional().isFloat({ min: 0 }),
  body('actualHours').optional().isFloat({ min: 0 }),
  body('difficultyLevel').optional().isInt({ min: 1, max: 5 })
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
      'title', 'description', 'subject', 'priority', 'status', 
      'dueDate', 'estimatedHours', 'actualHours', 'difficultyLevel'
    ];

    const fieldMappings = {
      dueDate: 'due_date',
      estimatedHours: 'estimated_hours',
      actualHours: 'actual_hours',
      difficultyLevel: 'difficulty_level'
    };

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        const dbField = fieldMappings[field] || field;
        updateFields.push(`${dbField} = $${paramIndex++}`);
        values.push(req.body[field]);
      }
    }

    // Set completed_at timestamp when status changes to completed
    if (req.body.status === 'completed') {
      updateFields.push(`completed_at = CURRENT_TIMESTAMP`);
    } else if (req.body.status && req.body.status !== 'completed') {
      updateFields.push(`completed_at = NULL`);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    // Build the update query with proper SQLite syntax
    const updateQuery = `UPDATE tasks 
       SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ? AND id = ?`;
    
    // Rearrange values: update fields first, then user_id and task_id
    const updateValues = [...values.slice(2), values[0], values[1]];
    
    const result = await db.run(updateQuery, updateValues);

    if (result.changes === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Get the updated task
    const updatedTask = await db.query(
      'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    res.json({
      message: 'Task updated successfully',
      task: updatedTask.rows[0]
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete a task
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.run(
      'DELETE FROM tasks WHERE user_id = ? AND id = ?',
      [req.user.id, id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get task statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE status = 'pending') as pending,
         COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
         COUNT(*) FILTER (WHERE status = 'completed') as completed,
         COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
         COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status NOT IN ('completed', 'cancelled')) as overdue
       FROM tasks 
       WHERE user_id = $1`,
      [req.user.id]
    );

    res.json({ stats: result.rows[0] });
  } catch (error) {
    console.error('Get task stats error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;