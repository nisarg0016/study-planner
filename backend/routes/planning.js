const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Generate recommended study plan
router.post('/generate-plan', [
  body('startDate').isISO8601(),
  body('endDate').isISO8601(),
  body('dailyStudyHours').optional().isFloat({ min: 1, max: 16 }),
  body('includeWeekends').optional().isBoolean(),
  body('prioritizeDueTasks').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      startDate, 
      endDate, 
      dailyStudyHours = 6, 
      includeWeekends = true, 
      prioritizeDueTasks = true 
    } = req.body;
    const userId = req.user.id;

    // Get user's incomplete tasks and syllabus items
    const incompleteTasks = await pool.query(
      `SELECT id, title, estimated_hours, due_date, priority, difficulty_level, subject
       FROM tasks 
       WHERE user_id = $1 AND status NOT IN ('completed', 'cancelled')
       ORDER BY 
         CASE WHEN due_date IS NOT NULL THEN 0 ELSE 1 END,
         due_date ASC,
         CASE priority 
           WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 
           WHEN 'medium' THEN 3 WHEN 'low' THEN 4 
         END`,
      [userId]
    );

    const incompleteSyllabus = await pool.query(
      `SELECT id, topic, estimated_study_hours, target_completion_date, 
              difficulty_level, subject, completion_percentage
       FROM syllabus 
       WHERE user_id = $1 AND completed = false
       ORDER BY 
         CASE WHEN target_completion_date IS NOT NULL THEN 0 ELSE 1 END,
         target_completion_date ASC,
         difficulty_level DESC`,
      [userId]
    );

    // Get existing events in the date range
    const existingEvents = await pool.query(
      `SELECT start_time, end_time 
       FROM events 
       WHERE user_id = $1 AND start_time BETWEEN $2 AND $3
       ORDER BY start_time ASC`,
      [userId, startDate, endDate]
    );

    // Generate the study plan
    const studyPlan = generateStudyPlan({
      tasks: incompleteTasks.rows,
      syllabus: incompleteSyllabus.rows,
      existingEvents: existingEvents.rows,
      startDate,
      endDate,
      dailyStudyHours,
      includeWeekends,
      prioritizeDueTasks
    });

    res.json({
      message: 'Study plan generated successfully',
      studyPlan
    });
  } catch (error) {
    console.error('Generate study plan error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Apply generated study plan (create events)
router.post('/apply-plan', [
  body('planItems').isArray(),
  body('planItems.*.title').isString(),
  body('planItems.*.startTime').isISO8601(),
  body('planItems.*.endTime').isISO8601(),
  body('planItems.*.taskId').optional().isInt(),
  body('planItems.*.syllabusId').optional().isInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { planItems } = req.body;
    const userId = req.user.id;

    const createdEvents = [];

    for (const item of planItems) {
      const result = await pool.query(
        `INSERT INTO events 
         (user_id, title, event_type, start_time, end_time, task_id, syllabus_id)
         VALUES ($1, $2, 'study', $3, $4, $5, $6)
         RETURNING *`,
        [userId, item.title, item.startTime, item.endTime, 
         item.taskId || null, item.syllabusId || null]
      );
      createdEvents.push(result.rows[0]);
    }

    res.status(201).json({
      message: 'Study plan applied successfully',
      createdEvents
    });
  } catch (error) {
    console.error('Apply study plan error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get adaptive recommendations based on performance
router.get('/recommendations', async (req, res) => {
  try {
    const userId = req.user.id;

    // Get recent performance data
    const recentPerformance = await pool.query(
      `SELECT AVG(average_productivity_rating) as avg_rating,
              AVG(total_study_time_minutes) as avg_study_time
       FROM performance_analytics 
       WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '7 days'`,
      [userId]
    );

    // Get overdue tasks
    const overdueTasks = await pool.query(
      `SELECT COUNT(*) as overdue_count
       FROM tasks 
       WHERE user_id = $1 AND due_date < CURRENT_DATE 
       AND status NOT IN ('completed', 'cancelled')`,
      [userId]
    );

    // Get upcoming deadlines
    const upcomingDeadlines = await pool.query(
      `SELECT title, due_date, priority
       FROM tasks 
       WHERE user_id = $1 AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
       AND status NOT IN ('completed', 'cancelled')
       ORDER BY due_date ASC`,
      [userId]
    );

    // Get difficult incomplete topics
    const difficultTopics = await pool.query(
      `SELECT topic, subject, difficulty_level, completion_percentage
       FROM syllabus 
       WHERE user_id = $1 AND completed = false AND difficulty_level >= 4
       ORDER BY difficulty_level DESC, completion_percentage ASC
       LIMIT 5`,
      [userId]
    );

    // Generate recommendations
    const recommendations = generateRecommendations({
      performance: recentPerformance.rows[0],
      overdueTasks: parseInt(overdueTasks.rows[0].overdue_count),
      upcomingDeadlines: upcomingDeadlines.rows,
      difficultTopics: difficultTopics.rows
    });

    res.json({ recommendations });
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Helper function to generate study plan
function generateStudyPlan({ 
  tasks, 
  syllabus, 
  existingEvents, 
  startDate, 
  endDate, 
  dailyStudyHours, 
  includeWeekends 
}) {
  const plan = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  // Combine and prioritize all study items
  const allItems = [
    ...tasks.map(t => ({
      id: t.id,
      type: 'task',
      title: t.title,
      hours: t.estimated_hours || 2,
      priority: getPriorityScore(t.priority),
      dueDate: t.due_date,
      difficulty: t.difficulty_level || 3,
      subject: t.subject
    })),
    ...syllabus.map(s => ({
      id: s.id,
      type: 'syllabus',
      title: s.topic,
      hours: s.estimated_study_hours || 2,
      priority: s.completion_percentage < 50 ? 3 : 2,
      dueDate: s.target_completion_date,
      difficulty: s.difficulty_level || 3,
      subject: s.subject
    }))
  ];

  // Sort by priority and due date
  allItems.sort((a, b) => {
    if (a.dueDate && b.dueDate) {
      const dueDiff = new Date(a.dueDate) - new Date(b.dueDate);
      if (dueDiff !== 0) return dueDiff;
    }
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;
    return b.priority - a.priority;
  });

  while (current <= end) {
    const isWeekend = current.getDay() === 0 || current.getDay() === 6;
    
    if (!includeWeekends && isWeekend) {
      current.setDate(current.getDate() + 1);
      continue;
    }

    const dayStr = current.toISOString().split('T')[0];
    
    // Check for existing events on this day
    const dayEvents = existingEvents.filter(event => 
      event.start_time.toISOString().split('T')[0] === dayStr
    );

    // Calculate available study time (assuming 9 AM to 9 PM available)
    let availableHours = dailyStudyHours;
    dayEvents.forEach(event => {
      const duration = (new Date(event.end_time) - new Date(event.start_time)) / (1000 * 60 * 60);
      availableHours -= duration;
    });

    if (availableHours > 0) {
      // Schedule study sessions for this day
      let hoursScheduled = 0;
      const dayPlan = [];

      for (const item of allItems) {
        if (hoursScheduled >= availableHours) break;
        if (item.scheduled) continue;

        const sessionHours = Math.min(
          item.hours - (item.scheduledHours || 0),
          availableHours - hoursScheduled,
          2.5 // Max 2.5 hours per session
        );

        if (sessionHours > 0.5) { // Minimum 30 minutes
          const startTime = new Date(current);
          startTime.setHours(9 + hoursScheduled);
          const endTime = new Date(startTime);
          endTime.setHours(startTime.getHours() + sessionHours);

          dayPlan.push({
            title: `Study: ${item.title}`,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            taskId: item.type === 'task' ? item.id : null,
            syllabusId: item.type === 'syllabus' ? item.id : null,
            subject: item.subject,
            difficulty: item.difficulty,
            estimatedHours: sessionHours
          });

          item.scheduledHours = (item.scheduledHours || 0) + sessionHours;
          hoursScheduled += sessionHours;

          if (item.scheduledHours >= item.hours) {
            item.scheduled = true;
          }
        }
      }

      plan.push({
        date: dayStr,
        totalHours: hoursScheduled,
        sessions: dayPlan
      });
    }

    current.setDate(current.getDate() + 1);
  }

  return {
    totalDays: plan.length,
    totalStudyHours: plan.reduce((sum, day) => sum + day.totalHours, 0),
    dailyPlans: plan
  };
}

function getPriorityScore(priority) {
  const scores = { urgent: 5, high: 4, medium: 3, low: 2 };
  return scores[priority] || 3;
}

function generateRecommendations({ performance, overdueTasks, upcomingDeadlines, difficultTopics }) {
  const recommendations = [];

  // Performance-based recommendations
  if (performance.avg_rating && performance.avg_rating < 3) {
    recommendations.push({
      type: 'performance',
      priority: 'high',
      title: 'Improve Study Effectiveness',
      description: 'Your recent productivity ratings are below average. Consider shorter, more focused study sessions with regular breaks.',
      action: 'Try the Pomodoro Technique: 25-minute focused sessions with 5-minute breaks.'
    });
  }

  if (performance.avg_study_time && performance.avg_study_time < 120) { // Less than 2 hours
    recommendations.push({
      type: 'time',
      priority: 'medium',
      title: 'Increase Study Time',
      description: 'You\'re studying less than 2 hours per day on average. Consider increasing your daily study commitment.',
      action: 'Gradually increase your daily study time by 30 minutes each week.'
    });
  }

  // Overdue tasks
  if (overdueTasks > 0) {
    recommendations.push({
      type: 'deadline',
      priority: 'urgent',
      title: 'Address Overdue Tasks',
      description: `You have ${overdueTasks} overdue task${overdueTasks > 1 ? 's' : ''}. Prioritize completing these immediately.`,
      action: 'Review and reschedule overdue tasks. Consider breaking large tasks into smaller, manageable parts.'
    });
  }

  // Upcoming deadlines
  if (upcomingDeadlines.length > 0) {
    recommendations.push({
      type: 'planning',
      priority: 'high',
      title: 'Prepare for Upcoming Deadlines',
      description: `You have ${upcomingDeadlines.length} task${upcomingDeadlines.length > 1 ? 's' : ''} due within the next week.`,
      action: 'Allocate extra time for high-priority tasks with approaching deadlines.'
    });
  }

  // Difficult topics
  if (difficultTopics.length > 0) {
    recommendations.push({
      type: 'difficulty',
      priority: 'medium',
      title: 'Focus on Challenging Topics',
      description: 'You have several difficult topics with low completion rates.',
      action: 'Schedule dedicated time for challenging subjects when you\'re most alert and focused.'
    });
  }

  return recommendations;
}

module.exports = router;