const express = require('express');
const { body, validationResult, query } = require('express-validator');
const db = require('../config/database');
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

    let whereConditions = ['user_id = ?'];
    let values = [req.user.id];
    let paramIndex = 2;

    if (subject) {
      whereConditions.push(`subject LIKE ?`);
      values.push(`%${subject}%`);
    }
    if (completed !== undefined) {
      whereConditions.push(`completed = ?`);
      values.push(completed === 'true' ? 1 : 0);
    }

    const query = `
      SELECT id, subject, topic, description, chapter_number, estimated_study_hours,
             completed, completion_percentage, start_date, target_completion_date,
             actual_completion_date, difficulty_level, created_at, updated_at
      FROM syllabus 
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY subject ASC, chapter_number ASC, created_at DESC
      LIMIT ? OFFSET ?
    `;

    values.push(limit, offset);

    const result = await db.query(query, values);
    console.log('Syllabus query result:', result);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM syllabus 
      WHERE ${whereConditions.join(' AND ')}
    `;
    const countResult = await db.query(countQuery, values.slice(0, -2));
    console.log('Count query result:', countResult);
    
    // Handle different possible result structures
    let total = 0;
    if (countResult && countResult.rows && countResult.rows.length > 0) {
      total = countResult.rows[0].total || countResult.rows[0]['COUNT(*)'] || 0;
    } else if (countResult && countResult.length > 0) {
      total = countResult[0].total || countResult[0]['COUNT(*)'] || 0;
    }

    // Extract the actual rows from the result
    const syllabusData = result && result.rows ? result.rows : (Array.isArray(result) ? result : []);

    res.json({
      syllabus: syllabusData,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total),
        totalPages: Math.ceil(total / limit)
      }
    });
    console.log('Sending response:', { syllabus: syllabusData, total });
  } catch (error) {
    console.error('Get syllabus error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get syllabus grouped by subject
router.get('/by-subject', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT subject, 
              COUNT(*) as total_topics,
              SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_topics,
              AVG(completion_percentage) as avg_completion,
              SUM(estimated_study_hours) as total_estimated_hours
       FROM syllabus 
       WHERE user_id = ?
       GROUP BY subject
       ORDER BY subject ASC`,
      [req.user.id]
    );

    res.json({ subjects: result });
  } catch (error) {
    console.error('Get syllabus by subject error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get a specific syllabus item
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT * FROM syllabus WHERE id = ? AND user_id = ?`,
      [id, req.user.id]
    );

    if (result.length === 0) {
      return res.status(404).json({ message: 'Syllabus item not found' });
    }

    res.json({ syllabus: result[0] });
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

    const result = await db.query(
      `INSERT INTO syllabus 
       (user_id, subject, topic, description, chapter_number, estimated_study_hours, 
        start_date, target_completion_date, difficulty_level)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, subject, topic, description, chapterNumber, estimatedStudyHours, 
       startDate, targetCompletionDate, difficultyLevel]
    );

    // Get the created record
    const createdRecord = await db.query(
      'SELECT * FROM syllabus WHERE id = ?',
      [result.lastID]
    );

    res.status(201).json({
      message: 'Syllabus item created successfully',
      syllabus: createdRecord[0]
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
    const values = [];
    let paramIndex = 1;

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
        updateFields.push(`${dbField} = ?`);
        values.push(req.body[field]);
      }
    }

    // Auto-set completion date when marked as completed
    if (req.body.completed === true) {
      updateFields.push(`actual_completion_date = datetime('now')`);
      updateFields.push(`completion_percentage = 100`);
    } else if (req.body.completed === false) {
      updateFields.push(`actual_completion_date = NULL`);
      updateFields.push(`completion_percentage = 0`);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    values.push(req.user.id, id);

    const result = await db.query(
      `UPDATE syllabus 
       SET ${updateFields.join(', ')}, updated_at = datetime('now')
       WHERE user_id = ? AND id = ?`,
      values
    );

    if (result.changes === 0) {
      return res.status(404).json({ message: 'Syllabus item not found' });
    }

    // Get the updated record
    const updatedRecord = await db.query(
      'SELECT * FROM syllabus WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    // Handle SQLite result structure
    const syllabusData = updatedRecord && updatedRecord.rows && updatedRecord.rows.length > 0 
      ? updatedRecord.rows[0] 
      : (Array.isArray(updatedRecord) && updatedRecord.length > 0 ? updatedRecord[0] : null);

    if (!syllabusData) {
      return res.status(404).json({ message: 'Updated syllabus item not found' });
    }

    res.json({
      message: 'Syllabus item updated successfully',
      syllabus: syllabusData
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

    const result = await db.query(
      'DELETE FROM syllabus WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (result.changes === 0) {
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
    const result = await db.query(
      `SELECT 
         COUNT(*) as total_topics,
         SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_topics,
         COUNT(DISTINCT subject) as total_subjects,
         AVG(completion_percentage) as avg_completion_percentage,
         SUM(estimated_study_hours) as total_estimated_hours,
         SUM(CASE WHEN target_completion_date < date('now') AND completed = 0 THEN 1 ELSE 0 END) as overdue_topics
       FROM syllabus 
       WHERE user_id = ?`,
      [req.user.id]
    );

    res.json({ 
      stats: result && result.length > 0 ? result[0] : {
        total_topics: 0,
        completed_topics: 0,
        total_subjects: 0,
        avg_completion_percentage: 0,
        total_estimated_hours: 0,
        overdue_topics: 0
      }
    });
  } catch (error) {
    console.error('Get syllabus stats error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;