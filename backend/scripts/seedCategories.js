const db = require('../config/database');

async function seedCategories() {
  try {
    console.log('Seeding topic categories...');

    // Check if categories already exist
    const existing = await db.query('SELECT COUNT(*) as count FROM topic_categories');
    if ((existing.rows || [])[0]?.count > 0) {
      console.log('Categories already exist, skipping seed.');
      process.exit(0);
    }

    // Insert system-wide topic categories with colors and hierarchy
    const catStem = await db.run(
      `INSERT INTO topic_categories (user_id, name, description, color, icon, priority, is_system)
       VALUES (NULL, ?, ?, ?, ?, ?, ?)`,
      ['STEM', 'Science, Technology, Engineering, Math', '#10B981', '🔬', 5, 1]
    );

    const catHumanities = await db.run(
      `INSERT INTO topic_categories (user_id, name, description, color, icon, priority, is_system)
       VALUES (NULL, ?, ?, ?, ?, ?, ?)`,
      ['Humanities', 'Arts, History, Literature, Philosophy', '#8B5CF6', '📚', 4, 1]
    );

    const catBusiness = await db.run(
      `INSERT INTO topic_categories (user_id, name, description, color, icon, priority, is_system)
       VALUES (NULL, ?, ?, ?, ?, ?, ?)`,
      ['Business', 'Economics, Finance, Management', '#F59E0B', '💼', 3, 1]
    );

    // Sub-categories under STEM
    await db.run(
      `INSERT INTO topic_categories (user_id, name, description, color, icon, parent_id, priority, is_system)
       VALUES (NULL, ?, ?, ?, ?, ?, ?, ?)`,
      ['Mathematics', 'Algebra, Calculus, Statistics', '#3B82F6', '📐', catStem.lastID, 5, 1]
    );

    await db.run(
      `INSERT INTO topic_categories (user_id, name, description, color, icon, parent_id, priority, is_system)
       VALUES (NULL, ?, ?, ?, ?, ?, ?, ?)`,
      ['Computer Science', 'Programming, Algorithms, Data Structures', '#6366F1', '💻', catStem.lastID, 5, 1]
    );

    await db.run(
      `INSERT INTO topic_categories (user_id, name, description, color, icon, parent_id, priority, is_system)
       VALUES (NULL, ?, ?, ?, ?, ?, ?, ?)`,
      ['Physics', 'Mechanics, Electromagnetism, Quantum', '#14B8A6', '⚛️', catStem.lastID, 4, 1]
    );

    // Sub-categories under Humanities
    await db.run(
      `INSERT INTO topic_categories (user_id, name, description, color, icon, parent_id, priority, is_system)
       VALUES (NULL, ?, ?, ?, ?, ?, ?, ?)`,
      ['History', 'World History, Modern History', '#A855F7', '🏛️', catHumanities.lastID, 4, 1]
    );

    await db.run(
      `INSERT INTO topic_categories (user_id, name, description, color, icon, parent_id, priority, is_system)
       VALUES (NULL, ?, ?, ?, ?, ?, ?, ?)`,
      ['Literature', 'Classic & Modern Literature', '#EC4899', '✍️', catHumanities.lastID, 3, 1]
    );

    console.log('✅ Seeded topic categories with colors and hierarchy');
    await db.close();
    process.exit(0);
  } catch (err) {
    console.error('Seed categories error:', err);
    process.exit(1);
  }
}

seedCategories();
