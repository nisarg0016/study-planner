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

    let whereConditions = ['s.user_id = ?'];
    let values = [req.user.id];
    let paramIndex = 2;

    if (subject) {
      whereConditions.push(`s.subject LIKE ?`);
      values.push(`%${subject}%`);
    }
    if (completed !== undefined) {
      whereConditions.push(`s.completed = ?`);
      values.push(completed === 'true' ? 1 : 0);
    }

    const query = `
      SELECT s.id, s.subject, s.topic, s.description, s.chapter_number, s.estimated_study_hours,
             s.completed, s.completion_percentage, s.start_date, s.target_completion_date,
             s.actual_completion_date, s.difficulty_level, s.priority, s.created_at, s.updated_at, s.category_id,
             tc.name as category_name, tc.color as category_color, tc.priority as category_priority,
             tc.icon as category_icon
      FROM syllabus s
      LEFT JOIN topic_categories tc ON s.category_id = tc.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY s.subject ASC, s.chapter_number ASC, s.created_at DESC
      LIMIT ? OFFSET ?
    `;

    values.push(limit, offset);

    const result = await db.query(query, values);
    console.log('Syllabus query result:', result);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM syllabus s
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
    console.log('Get syllabus by subject result:', result);
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
  body('difficultyLevel').optional().isInt({ min: 1, max: 5 }),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('categoryId').optional().isInt()
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
      difficultyLevel,
      priority = 'medium',
      categoryId
    } = req.body;

    const result = await db.query(
      `INSERT INTO syllabus 
       (user_id, subject, topic, description, chapter_number, estimated_study_hours, 
        start_date, target_completion_date, difficulty_level, priority, category_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, subject, topic, description, chapterNumber, estimatedStudyHours, 
       startDate, targetCompletionDate, difficultyLevel, priority, categoryId || null]
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
  body('difficultyLevel').optional().isInt({ min: 1, max: 5 }),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('categoryId').optional().isInt()
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
      'actualCompletionDate', 'difficultyLevel', 'priority', 'categoryId'
    ];

    const fieldMappings = {
      chapterNumber: 'chapter_number',
      estimatedStudyHours: 'estimated_study_hours',
      completionPercentage: 'completion_percentage',
      startDate: 'start_date',
      targetCompletionDate: 'target_completion_date',
      actualCompletionDate: 'actual_completion_date',
      difficultyLevel: 'difficulty_level',
      categoryId: 'category_id'
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