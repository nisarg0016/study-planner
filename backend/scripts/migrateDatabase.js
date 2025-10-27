const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../database/study_planner.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to SQLite database');
});

async function migrateDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Add missing columns to events table
      db.run(`ALTER TABLE events ADD COLUMN attendees TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding attendees column:', err.message);
        } else {
          console.log('✓ Added attendees column to events (or already exists)');
        }
      });

      db.run(`ALTER TABLE events ADD COLUMN reminders INTEGER`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding reminders column:', err.message);
        } else {
          console.log('✓ Added reminders column to events (or already exists)');
        }
      });

      // Add missing column to study_sessions table
      db.run(`ALTER TABLE study_sessions ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding updated_at column:', err.message);
        } else {
          console.log('✓ Added updated_at column to study_sessions (or already exists)');
        }
      });

      console.log('\nDatabase migration completed!');

      // Add task_id column to tests table if missing and create unique index
      db.run(`ALTER TABLE tests ADD COLUMN task_id INTEGER`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding task_id column to tests:', err.message);
        } else {
          console.log('✓ Added task_id column to tests (or already exists)');
        }
      });

      db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_tests_task_id_unique ON tests(task_id)`, (err) => {
        if (err) {
          console.error('Error creating unique index on tests.task_id:', err.message);
        } else {
          console.log('✓ Created unique index on tests.task_id (or already exists)');
        }
      });

      // Create topic_categories table if missing
      db.run(`CREATE TABLE IF NOT EXISTS topic_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        color VARCHAR(20) DEFAULT '#3B82F6',
        icon VARCHAR(50),
        parent_id INTEGER,
        priority INTEGER DEFAULT 0 CHECK (priority >= 0 AND priority <= 5),
        is_system BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES topic_categories(id) ON DELETE CASCADE
      )`, (err) => {
        if (err) {
          console.error('Error creating topic_categories table:', err.message);
        } else {
          console.log('✓ Created topic_categories table (or already exists)');
        }
      });

      // Add category_id to syllabus table
      db.run(`ALTER TABLE syllabus ADD COLUMN category_id INTEGER`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding category_id column to syllabus:', err.message);
        } else {
          console.log('✓ Added category_id column to syllabus (or already exists)');
        }
      });

      // Add priority to syllabus table
      db.run(`ALTER TABLE syllabus ADD COLUMN priority VARCHAR(20) DEFAULT 'medium'`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding priority column to syllabus:', err.message);
        } else {
          console.log('✓ Added priority column to syllabus (or already exists)');
        }
      });

      // Create indexes
      db.run(`CREATE INDEX IF NOT EXISTS idx_topic_categories_user_id ON topic_categories(user_id)`, () => {});
      db.run(`CREATE INDEX IF NOT EXISTS idx_topic_categories_parent_id ON topic_categories(parent_id)`, () => {});
      db.run(`CREATE INDEX IF NOT EXISTS idx_syllabus_category_id ON syllabus(category_id)`, () => {});

      // Add priority column to syllabus
      db.run(`ALTER TABLE syllabus ADD COLUMN priority VARCHAR(20) DEFAULT 'medium'`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding priority column to syllabus:', err.message);
        } else {
          console.log('✓ Added priority column to syllabus (or already exists)');
        }
      });
      
      db.close((err) => {
        if (err) {
          reject(err);
        } else {
          console.log('Database connection closed');
          resolve();
        }
      });
    });
  });
}

migrateDatabase().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
