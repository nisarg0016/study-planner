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
