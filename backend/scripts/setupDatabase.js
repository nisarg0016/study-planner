require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../config/database');
const bcrypt = require('bcryptjs');

async function setupDatabase() {
  try {
    console.log('Setting up SQLite database...');
    
    // Read and execute schema
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split schema into individual statements and execute them
    const statements = schema.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      if (statement.trim()) {
        await db.run(statement.trim());
      }
    }
    
    console.log('Database schema created successfully!');
    
    // Insert sample data
    await insertSampleData();
    
    console.log('Database setup completed!');
  } catch (error) {
    console.error('Error setting up database:', error);
  } finally {
    await db.close();
  }
}

async function insertSampleData() {
  try {
    console.log('Inserting sample data...');
    
    // Check if sample user already exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = ?',
      ['demo@studyplanner.com']
    );
    
    if (existingUser.rows.length === 0) {
      // Hash password for sample user
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      // Insert sample user
      const userResult = await db.run(
        `INSERT INTO users (email, password_hash, first_name, last_name, role) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          'demo@studyplanner.com',
          hashedPassword,
          'Demo',
          'User',
          'user'
        ]
      );
      
      const userId = userResult.lastID;
      
      // Insert default user preferences
      await db.run(
        'INSERT INTO user_preferences (user_id) VALUES (?)',
        [userId]
      );
      
      // Insert sample tasks
      await db.run(
        `INSERT INTO tasks (user_id, title, description, subject, priority, due_date, estimated_hours, difficulty_level)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, 'Complete Math Assignment', 'Solve calculus problems 1-20', 'Mathematics', 'high', 
         new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), 3, 4]
      );
      
      await db.run(
        `INSERT INTO tasks (user_id, title, description, subject, priority, estimated_hours, difficulty_level)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, 'Read Chapter 5', 'History textbook chapter on World War II', 'History', 'medium', 2, 2]
      );
      
      // Insert sample syllabus items
      await db.run(
        `INSERT INTO syllabus (user_id, subject, topic, description, estimated_study_hours, difficulty_level)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, 'Computer Science', 'Data Structures', 'Arrays, Linked Lists, Trees', 8, 4]
      );
      
      await db.run(
        `INSERT INTO syllabus (user_id, subject, topic, description, estimated_study_hours, difficulty_level)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, 'Mathematics', 'Calculus', 'Derivatives and Integrals', 12, 5]
      );
      
      // Insert sample courses
      const course1 = await db.run(
        `INSERT INTO courses (title, description, course_code, credits, semester, year, start_date, end_date, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'Introduction to Computer Science',
          'Learn the fundamentals of programming, data structures, and algorithms. Perfect for beginners.',
          'CS101',
          4,
          'Fall',
          2025,
          '2025-09-01',
          '2025-12-15',
          true
        ]
      );

      const course2 = await db.run(
        `INSERT INTO courses (title, description, course_code, credits, semester, year, start_date, end_date, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'Calculus I',
          'Differential and integral calculus with applications. Topics include limits, derivatives, integrals, and series.',
          'MATH201',
          4,
          'Fall',
          2025,
          '2025-09-01',
          '2025-12-15',
          true
        ]
      );

      const course3 = await db.run(
        `INSERT INTO courses (title, description, course_code, credits, semester, year, start_date, end_date, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'World History',
          'A comprehensive survey of world history from ancient civilizations to the modern era.',
          'HIST150',
          3,
          'Fall',
          2025,
          '2025-09-01',
          '2025-12-15',
          true
        ]
      );

      const course4 = await db.run(
        `INSERT INTO courses (title, description, course_code, credits, semester, year, start_date, end_date, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'Data Structures & Algorithms',
          'Advanced programming course covering arrays, linked lists, trees, graphs, sorting, and searching algorithms.',
          'CS202',
          4,
          'Spring',
          2026,
          '2026-01-15',
          '2026-05-15',
          true
        ]
      );

      const course5 = await db.run(
        `INSERT INTO courses (title, description, course_code, credits, semester, year, start_date, end_date, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'English Composition',
          'Develop critical writing and analytical skills through essays, research papers, and literary analysis.',
          'ENG101',
          3,
          'Fall',
          2025,
          '2025-09-01',
          '2025-12-15',
          true
        ]
      );

      // Enroll demo user in some courses
      await db.run(
        'INSERT INTO course_enrollments (course_id, user_id) VALUES (?, ?)',
        [course1.lastID, userId]
      );

      await db.run(
        'INSERT INTO course_enrollments (course_id, user_id) VALUES (?, ?)',
        [course2.lastID, userId]
      );

      await db.run(
        'INSERT INTO course_enrollments (course_id, user_id) VALUES (?, ?)',
        [course3.lastID, userId]
      );

      console.log('Sample data inserted successfully!');
      console.log(`  - User: demo@studyplanner.com`);
      console.log(`  - Courses created: 5`);
      console.log(`  - Enrolled in: 3 courses`);
    } else {
      console.log('Sample user already exists, skipping sample data insertion');
    }
  } catch (error) {
    console.error('Error inserting sample data:', error);
  }
}

setupDatabase();