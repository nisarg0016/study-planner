const db = require('../config/database');

async function seed() {
  try {
    // Create a dummy user if none exists
    let userRes = await db.query('SELECT id FROM users LIMIT 1');
    let userId;
    if ((userRes.rows || []).length === 0) {
      const r = await db.run('INSERT INTO users (email, password_hash, first_name) VALUES (?, ?, ?)', ['test@example.com', 'hashedpw', 'Test']);
      userId = r.lastID;
    } else {
      userId = userRes.rows[0].id;
    }

  // Try to find an existing task for this user to attach the test to
  const taskRes = await db.query('SELECT id FROM tasks WHERE user_id = ? LIMIT 1', [userId]);
  const taskId = (taskRes.rows || []).length > 0 ? taskRes.rows[0].id : null;

  // Insert test (attach to task if available)
  const testRes = await db.run('INSERT INTO tests (user_id, title, description, duration_minutes, task_id) VALUES (?, ?, ?, ?, ?)', [userId, 'Sample MCQ Test', 'A short sample test', 10, taskId]);
    const testId = testRes.lastID;

    // Question 1
    const q1 = await db.run('INSERT INTO questions (test_id, prompt, points) VALUES (?, ?, ?)', [testId, 'What is 2 + 2?', 1]);
    const q1Id = q1.lastID;
    await db.run('INSERT INTO choices (question_id, text, is_correct) VALUES (?, ?, ?)', [q1Id, '3', 0]);
    await db.run('INSERT INTO choices (question_id, text, is_correct) VALUES (?, ?, ?)', [q1Id, '4', 1]);
    await db.run('INSERT INTO choices (question_id, text, is_correct) VALUES (?, ?, ?)', [q1Id, '5', 0]);

    // Question 2
    const q2 = await db.run('INSERT INTO questions (test_id, prompt, points) VALUES (?, ?, ?)', [testId, 'Which planet is known as the Red Planet?', 1]);
    const q2Id = q2.lastID;
    await db.run('INSERT INTO choices (question_id, text, is_correct) VALUES (?, ?, ?)', [q2Id, 'Earth', 0]);
    await db.run('INSERT INTO choices (question_id, text, is_correct) VALUES (?, ?, ?)', [q2Id, 'Mars', 1]);
    await db.run('INSERT INTO choices (question_id, text, is_correct) VALUES (?, ?, ?)', [q2Id, 'Venus', 0]);

    console.log('Seeded sample test (id:', testId, ')');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();
