const express = require('express');
const { body, param, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

// Get all tests for user
router.get('/', async (req, res) => {
  try {
    // Join with tasks to provide task title if associated
    const result = await db.query(
      `SELECT t.*, ta.title as task_title
       FROM tests t
       LEFT JOIN tasks ta ON t.task_id = ta.id AND ta.user_id = t.user_id
       WHERE t.user_id = ? OR t.is_active = 1`,
      [req.user.id]
    );

    res.json({ tests: result.rows || [] });
  } catch (err) {
    console.error('Get tests error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create a test (optionally attach to a task)
router.post('/', [
  body('title').trim().isLength({ min: 1 }),
  body('description').optional().isString(),
  body('duration_minutes').optional().isInt({ min: 1 }),
  body('task_id').optional().isInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { title, description, duration_minutes = 30, task_id } = req.body;

    // If task_id provided, ensure it belongs to the user
    if (task_id) {
      const taskRes = await db.query('SELECT id FROM tasks WHERE id = ? AND user_id = ?', [task_id, req.user.id]);
      if ((taskRes.rows || []).length === 0) {
        return res.status(400).json({ message: 'Invalid task_id or not owned by user' });
      }
    }

    const result = await db.run(
      `INSERT INTO tests (user_id, title, description, duration_minutes, task_id) VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, title, description, duration_minutes, task_id || null]
    );

    const created = await db.query('SELECT * FROM tests WHERE id = ?', [result.lastID]);
    res.status(201).json({ test: (created.rows || [])[0] });
  } catch (err) {
    console.error('Create test error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get questions for a test
router.get('/:id/questions', [param('id').isInt()], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const testId = req.params.id;
    const questionsRes = await db.query('SELECT id, prompt, points FROM questions WHERE test_id = ?', [testId]);
    const questions = (questionsRes.rows || []);

    // Fetch choices for each question
    for (const q of questions) {
      const choicesRes = await db.query('SELECT id, text FROM choices WHERE question_id = ?', [q.id]);
      q.choices = (choicesRes.rows || []);
    }

    res.json({ questions });
  } catch (err) {
    console.error('Get questions error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Submit answers
router.post('/:id/submit', [param('id').isInt(), body('answers').isArray()], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const testId = req.params.id;
    const { answers } = req.body; // [{ question_id, choice_id }]

    // Validate and record answers
    let score = 0;
    let total = 0;

    for (const ans of answers) {
      const qRes = await db.query('SELECT points FROM questions WHERE id = ? AND test_id = ?', [ans.question_id, testId]);
      const qRows = qRes.rows || [];
      if (qRows.length === 0) continue; // skip invalid
      const points = qRows[0].points || 1;
      total += points;

      const cRes = await db.query('SELECT is_correct FROM choices WHERE id = ? AND question_id = ?', [ans.choice_id, ans.question_id]);
      const cRows = cRes.rows || [];
      const isCorrect = (cRows[0] && cRows[0].is_correct) ? 1 : 0;
      if (isCorrect) score += points;

      // Insert or update user_answers
      await db.run(
        `INSERT INTO user_answers (user_id, test_id, question_id, choice_id) VALUES (?, ?, ?, ?)`,
        [req.user.id, testId, ans.question_id, ans.choice_id]
      );
    }

    res.json({ score, total, percentage: total > 0 ? Math.round((score / total) * 100) : 0 });
  } catch (err) {
    console.error('Submit answers error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
