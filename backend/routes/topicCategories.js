const express = require('express');
const { body, param, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

// Get all categories with hierarchy for user (includes system categories)
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM topic_categories 
       WHERE user_id = ? OR is_system = 1 OR user_id IS NULL
       ORDER BY priority DESC, name ASC`,
      [req.user.id]
    );

    const categories = result.rows || [];
    
    // Build hierarchy tree
    const buildTree = (parentId = null) => {
      return categories
        .filter(cat => cat.parent_id === parentId)
        .map(cat => ({
          ...cat,
          children: buildTree(cat.id)
        }));
    };

    const tree = buildTree(null);

    res.json({ 
      categories: categories, // flat list
      tree // hierarchical structure
    });
  } catch (err) {
    console.error('Get categories error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get single category
router.get('/:id', [param('id').isInt()], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const result = await db.query(
      'SELECT * FROM topic_categories WHERE id = ? AND (user_id = ? OR is_system = 1 OR user_id IS NULL)',
      [req.params.id, req.user.id]
    );

    const rows = result.rows || [];
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json({ category: rows[0] });
  } catch (err) {
    console.error('Get category error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new category
router.post('/', [
  body('name').trim().isLength({ min: 1, max: 100 }),
  body('description').optional().isString(),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/),
  body('icon').optional().isString(),
  body('parent_id').optional().isInt(),
  body('priority').optional().isInt({ min: 0, max: 5 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, description, color = '#3B82F6', icon, parent_id, priority = 0 } = req.body;

    // If parent_id provided, ensure it exists and belongs to user or is system
    if (parent_id) {
      const parentRes = await db.query(
        'SELECT id FROM topic_categories WHERE id = ? AND (user_id = ? OR is_system = 1 OR user_id IS NULL)',
        [parent_id, req.user.id]
      );
      if ((parentRes.rows || []).length === 0) {
        return res.status(400).json({ message: 'Invalid parent_id' });
      }
    }

    const result = await db.run(
      `INSERT INTO topic_categories (user_id, name, description, color, icon, parent_id, priority)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, name, description, color, icon, parent_id || null, priority]
    );

    const created = await db.query('SELECT * FROM topic_categories WHERE id = ?', [result.lastID]);
    res.status(201).json({ category: (created.rows || [])[0] });
  } catch (err) {
    console.error('Create category error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update category
router.put('/:id', [
  param('id').isInt(),
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('description').optional().isString(),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/),
  body('icon').optional().isString(),
  body('parent_id').optional().isInt(),
  body('priority').optional().isInt({ min: 0, max: 5 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { id } = req.params;
    const { name, description, color, icon, parent_id, priority } = req.body;

    // Check ownership (can't edit system categories)
    const checkRes = await db.query(
      'SELECT id, is_system FROM topic_categories WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    if ((checkRes.rows || []).length === 0) {
      return res.status(404).json({ message: 'Category not found or not editable' });
    }

    const updateFields = [];
    const values = [];

    if (name !== undefined) {
      updateFields.push('name = ?');
      values.push(name);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      values.push(description);
    }
    if (color !== undefined) {
      updateFields.push('color = ?');
      values.push(color);
    }
    if (icon !== undefined) {
      updateFields.push('icon = ?');
      values.push(icon);
    }
    if (parent_id !== undefined) {
      updateFields.push('parent_id = ?');
      values.push(parent_id || null);
    }
    if (priority !== undefined) {
      updateFields.push('priority = ?');
      values.push(priority);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    values.push(id, req.user.id);

    await db.run(
      `UPDATE topic_categories SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ? AND user_id = ?`,
      values
    );

    const updated = await db.query('SELECT * FROM topic_categories WHERE id = ?', [id]);
    res.json({ category: (updated.rows || [])[0] });
  } catch (err) {
    console.error('Update category error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete category
router.delete('/:id', [param('id').isInt()], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { id } = req.params;

    // Check ownership and not system
    const checkRes = await db.query(
      'SELECT id FROM topic_categories WHERE id = ? AND user_id = ? AND is_system = 0',
      [id, req.user.id]
    );
    if ((checkRes.rows || []).length === 0) {
      return res.status(404).json({ message: 'Category not found or cannot be deleted' });
    }

    // Check if any syllabus items use this category
    const usageRes = await db.query('SELECT COUNT(*) as count FROM syllabus WHERE category_id = ?', [id]);
    const count = (usageRes.rows || [])[0]?.count || 0;
    if (count > 0) {
      return res.status(400).json({ message: `Cannot delete category with ${count} syllabus items attached` });
    }

    await db.run('DELETE FROM topic_categories WHERE id = ? AND user_id = ?', [id, req.user.id]);
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    console.error('Delete category error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
