const express = require('express');
const { body, validationResult, query } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all courses (for students) or all courses (for admin/advisors)
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT c.*, u.first_name || ' ' || u.last_name as instructor_name
      FROM courses c
      LEFT JOIN users u ON c.instructor_id = u.id
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM courses c';
    let params = [];

    // If user is not admin/advisor, only show courses they're enrolled in
    if (req.user.role === 'user') {
      query += ` 
        INNER JOIN course_enrollments ce ON c.id = ce.course_id
        WHERE ce.user_id = ?
      `;
      countQuery += ` 
        INNER JOIN course_enrollments ce ON c.id = ce.course_id
        WHERE ce.user_id = ?
      `;
      params = [req.user.id];
    }

    query += ` ORDER BY c.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const [courses, total] = await Promise.all([
      db.query(query, params),
      db.query(countQuery, req.user.role === 'user' ? [req.user.id] : [])
    ]);

    res.json({
      courses: courses.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total.rows[0].total,
        totalPages: Math.ceil(total.rows[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get a specific course
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    let query = `
      SELECT c.*, u.first_name || ' ' || u.last_name as instructor_name,
             COUNT(ce.id) as enrolled_students
      FROM courses c
      LEFT JOIN users u ON c.instructor_id = u.id
      LEFT JOIN course_enrollments ce ON c.id = ce.course_id
      WHERE c.id = ?
    `;
    let params = [id];

    // If user is not admin/advisor, check if they're enrolled
    if (req.user.role === 'user') {
      query += ` AND EXISTS (
        SELECT 1 FROM course_enrollments 
        WHERE course_id = ? AND user_id = ?
      )`;
      params.push(id, req.user.id);
    }

    query += ' GROUP BY c.id';

    const result = await db.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.json({ course: result.rows[0] });
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create a new course (admin/advisor only)
router.post('/', requireRole(['academic_advisor', 'admin']), [
  body('title').trim().isLength({ min: 1, max: 200 }),
  body('description').optional().isString(),
  body('course_code').trim().isLength({ min: 1, max: 20 }),
  body('credits').optional().isInt({ min: 1, max: 10 }),
  body('semester').optional().isString(),
  body('year').optional().isInt({ min: 2020, max: 2030 }),
  body('start_date').optional().isISO8601(),
  body('end_date').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: errors.array() 
      });
    }

    const {
      title,
      description,
      course_code,
      credits = 3,
      semester,
      year = new Date().getFullYear(),
      start_date,
      end_date
    } = req.body;

    // Check if course code already exists
    const existingCourse = await db.query(
      'SELECT id FROM courses WHERE course_code = ?',
      [course_code]
    );

    if (existingCourse.rows.length > 0) {
      return res.status(400).json({ message: 'Course code already exists' });
    }

    const result = await db.run(
      `INSERT INTO courses 
       (title, description, course_code, credits, semester, year, start_date, end_date, instructor_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, description, course_code, credits, semester, year, start_date, end_date, req.user.id]
    );

    const course = await db.query(
      'SELECT * FROM courses WHERE id = ?',
      [result.lastID]
    );

    res.status(201).json({
      message: 'Course created successfully',
      course: course.rows[0]
    });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update a course (admin/advisor only)
router.put('/:id', requireRole(['academic_advisor', 'admin']), [
  body('title').optional().trim().isLength({ min: 1, max: 200 }),
  body('description').optional().isString(),
  body('credits').optional().isInt({ min: 1, max: 10 }),
  body('semester').optional().isString(),
  body('year').optional().isInt({ min: 2020, max: 2030 }),
  body('start_date').optional().isISO8601(),
  body('end_date').optional().isISO8601(),
  body('is_active').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: errors.array() 
      });
    }

    const { id } = req.params;
    const updates = req.body;

    // Check if course exists and user has permission
    const existingCourse = await db.query(
      'SELECT * FROM courses WHERE id = ?',
      [id]
    );

    if (existingCourse.rows.length === 0) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Build update query
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    values.push(id);

    await db.run(
      `UPDATE courses SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      values
    );

    const updatedCourse = await db.query(
      'SELECT * FROM courses WHERE id = ?',
      [id]
    );

    res.json({
      message: 'Course updated successfully',
      course: updatedCourse.rows[0]
    });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete a course (admin/advisor only)
router.delete('/:id', requireRole(['academic_advisor', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.run(
      'DELETE FROM courses WHERE id = ?',
      [id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Enroll student in course (admin/advisor only)
router.post('/:id/enroll', requireRole(['academic_advisor', 'admin']), [
  body('user_id').isInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { user_id } = req.body;

    // Check if course exists
    const course = await db.query(
      'SELECT id FROM courses WHERE id = ?',
      [id]
    );

    if (course.rows.length === 0) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if user exists
    const user = await db.query(
      'SELECT id FROM users WHERE id = ? AND role = "user"',
      [user_id]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Check if already enrolled
    const existing = await db.query(
      'SELECT id FROM course_enrollments WHERE course_id = ? AND user_id = ?',
      [id, user_id]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Student already enrolled in this course' });
    }

    await db.run(
      'INSERT INTO course_enrollments (course_id, user_id) VALUES (?, ?)',
      [id, user_id]
    );

    res.json({ message: 'Student enrolled successfully' });
  } catch (error) {
    console.error('Enroll student error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get course enrollments (admin/advisor only)
router.get('/:id/enrollments', requireRole(['academic_advisor', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const enrollments = await db.query(
      `SELECT ce.*, u.first_name, u.last_name, u.email
       FROM course_enrollments ce
       JOIN users u ON ce.user_id = u.id
       WHERE ce.course_id = ?
       ORDER BY u.last_name, u.first_name`,
      [id]
    );

    res.json({ enrollments: enrollments.rows });
  } catch (error) {
    console.error('Get enrollments error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;