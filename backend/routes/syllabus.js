const express = require('express');
const { body, validationResult, query } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all syllabus items for the authenticated user
router.get('/', [
  query('subject').optional().isString(),
  query('completed').optional().isBoolean(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { subject, completed, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = ['user_id = $1'];
    let values = [req.user.id];
    let paramIndex = 2;

    if (subject) {
      whereConditions.push(`subject ILIKE $${paramIndex++}`);
      values.push(`%${subject}%`);
    }
    if (completed !== undefined) {
      whereConditions.push(`completed = $${paramIndex++}`);
      values.push(completed === 'true');
    }

    const query = `
      SELECT id, subject, topic, description, chapter_number, estimated_study_hours,
             completed, completion_percentage, start_date, target_completion_date,
             actual_completion_date, difficulty_level, created_at, updated_at
      FROM syllabus 
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY subject ASC, chapter_number ASC, created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;

    values.push(limit, offset);

    const result = await pool.query(query, values);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM syllabus 
      WHERE ${whereConditions.join(' AND ')}
    `;
    const countResult = await pool.query(countQuery, values.slice(0, -2));

    res.json({
      syllabus: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
        totalPages: Math.ceil(countResult.rows[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Get syllabus error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get syllabus grouped by subject
router.get('/by-subject', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT subject, 
              COUNT(*) as total_topics,
              COUNT(*) FILTER (WHERE completed = true) as completed_topics,
              AVG(completion_percentage) as avg_completion,
              SUM(estimated_study_hours) as total_estimated_hours
       FROM syllabus 
       WHERE user_id = $1
       GROUP BY subject
       ORDER BY subject ASC`,
      [req.user.id]
    );

    res.json({ subjects: result.rows });
  } catch (error) {
    console.error('Get syllabus by subject error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get a specific syllabus item
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT * FROM syllabus WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Syllabus item not found' });
    }

    res.json({ syllabus: result.rows[0] });
  } catch (error) {
    console.error('Get syllabus item error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create a new syllabus item
router.post('/', [
  body('subject').trim().isLength({ min: 1, max: 100 }),
  body('topic').trim().isLength({ min: 1, max: 255 }),
  body('description').optional().isString(),
  body('chapterNumber').optional().isInt({ min: 1 }),
  body('estimatedStudyHours').optional().isFloat({ min: 0 }),
  body('startDate').optional().isISO8601(),
  body('targetCompletionDate').optional().isISO8601(),
  body('difficultyLevel').optional().isInt({ min: 1, max: 5 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      subject, 
      topic, 
      description, 
      chapterNumber, 
      estimatedStudyHours, 
      startDate, 
      targetCompletionDate, 
      difficultyLevel 
    } = req.body;

    const result = await pool.query(
      `INSERT INTO syllabus 
       (user_id, subject, topic, description, chapter_number, estimated_study_hours, 
        start_date, target_completion_date, difficulty_level)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [req.user.id, subject, topic, description, chapterNumber, estimatedStudyHours, 
       startDate, targetCompletionDate, difficultyLevel]
    );

    res.status(201).json({
      message: 'Syllabus item created successfully',
      syllabus: result.rows[0]
    });
  } catch (error) {
    console.error('Create syllabus error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update a syllabus item
router.put('/:id', [
  body('subject').optional().trim().isLength({ min: 1, max: 100 }),
  body('topic').optional().trim().isLength({ min: 1, max: 255 }),
  body('description').optional().isString(),
  body('chapterNumber').optional().isInt({ min: 1 }),
  body('estimatedStudyHours').optional().isFloat({ min: 0 }),
  body('completed').optional().isBoolean(),
  body('completionPercentage').optional().isInt({ min: 0, max: 100 }),
  body('startDate').optional().isISO8601(),
  body('targetCompletionDate').optional().isISO8601(),
  body('actualCompletionDate').optional().isISO8601(),
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
      'subject', 'topic', 'description', 'chapterNumber', 'estimatedStudyHours',
      'completed', 'completionPercentage', 'startDate', 'targetCompletionDate',
      'actualCompletionDate', 'difficultyLevel'
    ];

    const fieldMappings = {
      chapterNumber: 'chapter_number',
      estimatedStudyHours: 'estimated_study_hours',
      completionPercentage: 'completion_percentage',
      startDate: 'start_date',
      targetCompletionDate: 'target_completion_date',
      actualCompletionDate: 'actual_completion_date',
      difficultyLevel: 'difficulty_level'
    };

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        const dbField = fieldMappings[field] || field;
        updateFields.push(`${dbField} = $${paramIndex++}`);
        values.push(req.body[field]);
      }
    }

    // Auto-set completion date when marked as completed
    if (req.body.completed === true) {
      updateFields.push(`actual_completion_date = CURRENT_DATE`);
      updateFields.push(`completion_percentage = 100`);
    } else if (req.body.completed === false) {
      updateFields.push(`actual_completion_date = NULL`);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    const result = await pool.query(
      `UPDATE syllabus 
       SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND id = $2 
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Syllabus item not found' });
    }

    res.json({
      message: 'Syllabus item updated successfully',
      syllabus: result.rows[0]
    });
  } catch (error) {
    console.error('Update syllabus error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete a syllabus item
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM syllabus WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Syllabus item not found' });
    }

    res.json({ message: 'Syllabus item deleted successfully' });
  } catch (error) {
    console.error('Delete syllabus error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get syllabus statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
         COUNT(*) as total_topics,
         COUNT(*) FILTER (WHERE completed = true) as completed_topics,
         COUNT(DISTINCT subject) as total_subjects,
         AVG(completion_percentage) as avg_completion_percentage,
         SUM(estimated_study_hours) as total_estimated_hours,
         COUNT(*) FILTER (WHERE target_completion_date < CURRENT_DATE AND completed = false) as overdue_topics
       FROM syllabus 
       WHERE user_id = $1`,
      [req.user.id]
    );

    res.json({ stats: result.rows[0] });
  } catch (error) {
    console.error('Get syllabus stats error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;